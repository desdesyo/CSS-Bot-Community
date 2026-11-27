const $ = (id) => document.getElementById(id);
const mobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
import { adaptiveScale, moveToward, createTeamRoster } from './engine-core.mjs';
const state = { started:false, playerTeam:'CT', hp:100, ammo:30, reserve:90, fps:0, scale:mobile?.9:1, frameSamples:[], sampleAt:performance.now(), aiAccumulator:0, simTime:0, bots:[], keys:new Set(), joy:{x:0,y:0}, look:{x:0,y:0}, lastShot:0, lastHud:0 };
const status = $('loadState'), startButton = $('start'), overlay = $('overlay');
function mat(name, color, roughness=0.8, metallic=0) {
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor = BABYLON.Color3.FromHexString(color); m.roughness = roughness; m.metallic = metallic;
  return m;
}
let engine, scene, camera, shadowGen, enemyMaterial, allyMaterial;
function box(name, x,y,z, sx,sy,sz, material, cast=true) {
  const m = BABYLON.MeshBuilder.CreateBox(name,{width:sx,height:sy,depth:sz},scene);
  m.position.set(x,y,z); m.material=material; m.receiveShadows=true;
  if(cast) shadowGen.addShadowCaster(m);
  return m;
}
function buildMap() {
  const groundMat=mat('asphalt','#454c4b',.94), concrete=mat('aged concrete','#777b75',.9), dark=mat('painted steel','#303a3b',.48,.62), crateMat=mat('crate composite','#685d4b',.86), yellow=mat('safety paint','#b38a3e',.62,.2);
  const ground=BABYLON.MeshBuilder.CreateGround('ground',{width:112,height:92,subdivisions:2},scene);ground.material=groundMat;ground.receiveShadows=true;
  box('back wall',0,3,-44,112,6,1.2,concrete);box('left wall',-56,3,0,1.2,6,90,concrete);box('right wall',56,3,0,1.2,6,90,concrete);box('front wall',0,3,44,112,6,1.2,concrete);
  // Industrial lanes, cover and sightline breaks.
  for(const [x,z,w,d] of [[-22,-18,18,2],[22,-18,18,2],[-22,17,18,2],[22,17,18,2],[0,-30,2,18],[0,30,2,18],[-39,0,2,22],[39,0,2,22]]) box('partition',x,2.2,z,w,4.4,d,concrete);
  const prototype=box('crate prototype',0,1,0,2.4,2,2.4,crateMat);
  for(const [x,z,s] of [[-12,-9,1],[12,-9,1],[-12,10,1],[12,10,1],[-31,-22,1],[31,-22,1],[-31,22,1],[31,22,1],[-3,0,1],[3,0,1]]) {
    const c=prototype.createInstance('crate');c.position.set(x,1,z);c.scaling.set(s,1,s);c.receiveShadows=true;
  }
  prototype.isVisible=false;
  for(const x of [-48,-32,-16,0,16,32,48]) box('overhead beam',x,5.7,-5,0.22,.22,72,dark,false);
  for(const z of [-36,-24,24,36]) box('warning stripe',0,.025,z,90,.035,.16,yellow,false);
  for(const x of [-42,42]) {
    const lamp=box('industrial lamp',x,5.25,0,4,.12,1.2,yellow,false);
    const light=new BABYLON.PointLight('work light',new BABYLON.Vector3(x,5,0),scene);light.diffuse=new BABYLON.Color3(.82,.72,.52);light.intensity=mobile?.35:.65;light.range=18;
  }
  // Distinct tactical zones and low cover to force readable movement.
  for(const [x,z] of [[-8,-27],[8,-27],[-8,27],[8,27]]) box('low cover',x,.7,z,5,1.4,1.2,dark);
}
function makeBot(id, team, x,z, waypoints) {
  const root=new BABYLON.TransformNode('bot-'+id,scene);
  const body=BABYLON.MeshBuilder.CreateCapsule('body-'+id,{height:1.35,radius:.27,tessellation:8,subdivisions:1},scene);body.parent=root;body.position.y=.92;body.material=team==='enemy'?enemyMaterial:allyMaterial;body.receiveShadows=true;shadowGen.addShadowCaster(body);
  const head=BABYLON.MeshBuilder.CreateSphere('head-'+id,{diameter:.42,segments:8},scene);head.parent=root;head.position.y=1.78;head.material=mat('helmet-'+id,team==='enemy'?'#b58a55':'#718d9b',.78);
  const pack=box('backpack-'+id,0,0,0,.52,.58,.25,mat('pack-'+id,'#343b35',.9),false);pack.parent=root;pack.position.set(0,1.0,.29);
  const gun=box('rifle-'+id,0,0,0,.12,.12,.92,mat('rifle-'+id,'#202729',.42,.72),false);gun.parent=root;gun.position.set(.28,1.25,.38);
  root.position.set(x,0,z);
  state.bots.push({id,team,root,body,head,waypoints,index:0,speed:team==='enemy'?2.05:1.9,phase:id*.73,health:100,alive:true,fireAt:0});
  return root;
}
function buildBots() {
  // 6v6 means 12 combatants total: the human player plus 11 bots.
  // The player's selected side always has five AI teammates; the opposing side has six bots.
  const routes=[
    [[-35,-30],[-25,-8],[-37,14],[-20,31]],
    [[35,-30],[25,-8],[37,14],[20,31]],
    [[-44,8],[-28,0],[-10,-8],[-24,16]],
    [[44,8],[28,0],[10,-8],[24,16]],
    [[-18,-35],[-8,-18],[8,-12],[18,-32]],
    [[18,-35],[8,-18],[-8,-12],[-18,-32]],
    [[-18,35],[-8,18],[8,12],[18,32]],
    [[18,35],[8,18],[-8,12],[-18,32]],
    [[-42,0],[-30,-10],[-18,0],[-30,12]],
    [[42,0],[30,-10],[18,0],[30,12]],
    [[0,30],[-10,18],[0,8],[10,18]]
  ];
  const roster=createTeamRoster(state.playerTeam);
  for(const [id,team,x,z] of roster) makeBot(id,team,x,z,routes[id-1]);
}
function setPlayerTeam(team) {
  if(state.started || (team!=='CT' && team!=='T')) return;
  state.playerTeam=team;
  for(const bot of state.bots) bot.root.dispose();
  state.bots.length=0;
  buildBots();
  $('team').textContent='TEAM '+team;
  $('selectCT').classList.toggle('selected',team==='CT');
  $('selectT').classList.toggle('selected',team==='T');
}
function updateBotAI() {
  // Expensive tactical decisions run at 8 Hz; movement is deliberately not stepped here.
  for(const bot of state.bots) {
    if(!bot.alive) continue;
    const target=bot.waypoints[bot.index];
    if(Math.hypot(target[0]-bot.root.position.x,target[1]-bot.root.position.z)<.65) bot.index=(bot.index+1)%bot.waypoints.length;
  }
}
function updateBotMotion(dt) {
  // Continuous frame-rate movement prevents the 8 Hz AI cadence from looking like teleporting.
  for(const bot of state.bots) {
    if(!bot.alive) continue;
    const target=bot.waypoints[bot.index];
    const next=moveToward({x:bot.root.position.x,z:bot.root.position.z},{x:target[0],z:target[1]},bot.speed,dt);
    bot.root.position.x=next.x;bot.root.position.z=next.z;
    const yaw=Math.atan2(target[0]-bot.root.position.x,target[1]-bot.root.position.z);
    let delta=(yaw-bot.root.rotation.y+Math.PI*3)%(Math.PI*2)-Math.PI;
    bot.root.rotation.y+=delta*Math.min(1,dt*7);
    bot.phase+=dt*7;bot.body.position.y=.92+Math.abs(Math.sin(bot.phase))*.035;
    bot.head.position.y=1.78+Math.abs(Math.sin(bot.phase))*.018;
  }
}
function fire() {
  const now=performance.now();if(now-state.lastShot<105||state.ammo<=0)return;
  state.lastShot=now;state.ammo--;const ray=camera.getForwardRay(95);
  const hit=scene.pickWithRay(ray,m=>m.name.startsWith('body-')||m.name.startsWith('head-'));
  if(hit?.hit&&hit.pickedMesh) {
    const bot=state.bots.find(b=>hit.pickedMesh.parent===b.root);
    if(bot&&bot.team==='enemy'&&bot.alive) {
      bot.health-=hit.pickedMesh.name.startsWith('head-')?100:34;
      if(bot.health<=0){bot.alive=false;bot.root.setEnabled(false)}
    }
  }
  $('ammo').textContent=state.ammo+' / '+state.reserve;
}
function reload(){if(state.ammo===30||state.reserve===0)return;const n=Math.min(30-state.ammo,state.reserve);state.ammo+=n;state.reserve-=n;$('ammo').textContent=state.ammo+' / '+state.reserve}
function initInput() {
  window.addEventListener('keydown',e=>{state.keys.add(e.code);if(e.code==='KeyR')reload()});
  window.addEventListener('keyup',e=>state.keys.delete(e.code));
  canvas.addEventListener('click',()=>{if(!mobile&&state.started)canvas.requestPointerLock?.()});
  window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){camera.rotation.y+=e.movementX*.0022;camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+e.movementY*.0022))}});
  window.addEventListener('mousedown',e=>{if(e.button===0&&state.started)fire()});
  const stick=$('stick'),nub=$('nub');let stickId=null,origin=null;
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};stick.setPointerCapture(e.pointerId)});
  stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,len=Math.max(1,Math.hypot(dx,dy)),k=Math.min(1,48/len);state.joy.x=dx/48*k;state.joy.y=dy/48*k;nub.style.transform='translate('+state.joy.x*38+'px,'+state.joy.y*38+'px)'});
  const reset=()=>{stickId=null;state.joy.x=state.joy.y=0;nub.style.transform=''};
  stick.addEventListener('pointerup',reset);stick.addEventListener('pointercancel',reset);
  const look=$('look');let lookId=null,last=null;
  look.addEventListener('pointerdown',e=>{lookId=e.pointerId;last={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId)});
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};camera.rotation.y+=dx*.004;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.004))});
  const stopLook=()=>{lookId=null};look.addEventListener('pointerup',stopLook);look.addEventListener('pointercancel',stopLook);
  $('fire').addEventListener('pointerdown',e=>{e.preventDefault();fire()});
}
function updatePlayer(dt) {
  const forward=(state.keys.has('KeyW')?1:0)-(state.keys.has('KeyS')?1:0)-state.joy.y;
  const strafe=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0)+state.joy.x;
  const len=Math.hypot(forward,strafe)||1, speed=4.6*dt;
  const yaw=camera.rotation.y;
  camera.position.x+=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/len*speed;
  camera.position.z+=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)/len*speed;
  camera.position.x=Math.max(-53,Math.min(53,camera.position.x));camera.position.z=Math.max(-42,Math.min(42,camera.position.z));
}
function start() {
  state.started=true;overlay.style.display='none';camera.position.set(0,1.72,38);camera.rotation.set(0,Math.PI,0);
  if(!mobile)canvas.requestPointerLock?.();
}
async function boot() {
  try {
    if(!window.BABYLON)throw new Error('Babylon.js CDN недоступен');
    const B=window.BABYLON;
    engine=new B.Engine(canvas,!mobile,{preserveDrawingBuffer:false,stencil:false,antialias:!mobile,powerPreference:'high-performance',audioEngine:false},true);
    engine.setHardwareScalingLevel(1/state.scale);
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.12,.16,.17,1);scene.ambientColor=new B.Color3(.18,.18,.17);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.003;scene.fogColor=new B.Color3(.22,.25,.24);
    camera=new B.UniversalCamera('fps-camera',new B.Vector3(0,1.72,38),scene);camera.minZ=.08;camera.maxZ=180;camera.fov=1.08;camera.inertia=0;camera.angularSensibility=2400;camera.speed=0;camera.inputs.clear();
    const hemi=new B.HemisphericLight('sky-fill',new B.Vector3(0,1,0),scene);hemi.intensity=.68;hemi.diffuse=new B.Color3(.77,.81,.83);hemi.groundColor=new B.Color3(.24,.25,.22);
    const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,.3),scene);sun.position=new B.Vector3(24,38,-18);sun.intensity=2.2;
    shadowGen=new B.ShadowGenerator(mobile?1024:2048,sun);shadowGen.useBlurExponentialShadowMap=true;shadowGen.blurKernel=mobile?8:16;shadowGen.bias=.0005;shadowGen.normalBias=.02;
    enemyMaterial=mat('enemy uniform','#596c64',.88);allyMaterial=mat('friendly uniform','#526a83',.88);
    buildMap();buildBots();initInput();
    window.addEventListener('resize',()=>engine.resize());
    $('start').disabled=false;$('loadState').textContent='Графическое ядро готово. Запусти тестовую сцену.';$('quality').textContent=mobile?'MOBILE PROFILE · SHADOWS 1024':'DESKTOP PROFILE · SHADOWS 2048';
    $('selectCT').addEventListener('click',()=>setPlayerTeam('CT'));$('selectT').addEventListener('click',()=>setPlayerTeam('T'));$('start').addEventListener('click',start);
    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
      if(state.started) {
        updatePlayer(dt);updateBotMotion(dt);state.aiAccumulator+=dt;state.simTime+=dt;
        if(state.aiAccumulator>=.125){state.aiAccumulator%=.125;updateBotAI()}
      }
      state.frameSamples.push(dt*1000);
      if(now-state.sampleAt>=2000){
        state.frameSamples.sort((a,b)=>a-b);const p95=state.frameSamples[Math.min(state.frameSamples.length-1,Math.floor(state.frameSamples.length*.95))]||16.7;
        const next=adaptiveScale(p95,state.scale,mobile);
        if(Math.abs(next-state.scale)>=.02){state.scale=next;engine.setHardwareScalingLevel(1/state.scale)}
        state.fps=Math.round(1000/(state.frameSamples.reduce((a,b)=>a+b,0)/Math.max(1,state.frameSamples.length)));
        $('fps').textContent=state.fps+' FPS';$('quality').textContent=(mobile?'MOBILE':'DESKTOP')+' · SCALE '+Math.round(state.scale*100)+'% · P95 '+Math.round(p95)+'ms';
        state.frameSamples.length=0;state.sampleAt=now;
      }
      scene.render();
    });
  } catch(error) { console.error(error);status.textContent='Ошибка запуска: '+error.message;$('quality').textContent='ENGINE ERROR'; }
}
boot();
