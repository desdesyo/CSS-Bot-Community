const $ = (id) => document.getElementById(id);
const canvas = $('renderCanvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Не найден canvas#renderCanvas в index.html');
const mobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
import { adaptiveScale, moveToward } from './engine-core.mjs';
import { buildExpandedDust2 } from './dust2-map.mjs';
import { DUST2_EXPANDED, isDust2Blocked } from './dust2-layout.mjs';
const state = { started:false, hp:100, ammo:30, reserve:90, fps:0, scale:mobile?1:1.25, frameSamples:[], sampleAt:performance.now(), aiAccumulator:0, simTime:0, bots:[], keys:new Set(), joy:{x:0,y:0}, look:{x:0,y:0}, lastShot:0, lastHud:0, playerHitbox:null };
const status = $('loadState'), startButton = $('start'), overlay = $('overlay');
function isMapSolid(mesh) {
  if(!mesh||!mesh.isPickable||mesh===state.playerHitbox)return false;
  if(/^(body-|head-|left-arm-|right-arm-|left-leg-|right-leg-|rifle-|backpack-|player-hitbox|sky-dome|sun-disc)/.test(mesh.name))return false;
  return true;
}
function isPlayerBlocked(x,z) {
  const radius=.34,y=.92;
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,dir=new BABYLON.Vector3(Math.cos(a),0,Math.sin(a));
    const ray=new BABYLON.Ray(new BABYLON.Vector3(x,y,z),dir,radius);
    const hit=scene.pickWithRay(ray,isMapSolid);
    if(hit?.hit&&hit.distance<radius-.015)return true;
  }
  return false;
}
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
function buildMap() { buildExpandedDust2(BABYLON,scene,shadowGen,mat,box); }
function makeBot(id, team, x,z, waypoints) {
  const root=new BABYLON.TransformNode('bot-'+id,scene);
  const uniform=team==='enemy'?enemyMaterial:allyMaterial;
  const body=BABYLON.MeshBuilder.CreateCapsule('body-'+id,{height:1.12,radius:.21,tessellation:10,subdivisions:1},scene);body.parent=root;body.position.y=.88;body.material=uniform;body.receiveShadows=true;shadowGen.addShadowCaster(body);
  const head=BABYLON.MeshBuilder.CreateSphere('head-'+id,{diameter:.24,segments:12},scene);head.parent=root;head.position.y=1.64;head.material=mat('helmet-'+id,team==='enemy'?'#b58a55':'#718d9b',.78);
  const armMat=mat('armour-'+id,team==='enemy'?'#4b5b54':'#465d74',.9),legMat=mat('trousers-'+id,team==='enemy'?'#39443e':'#35495c',.94);
  const leftArm=BABYLON.MeshBuilder.CreateCapsule('left-arm-'+id,{height:.66,radius:.105,tessellation:9,subdivisions:1},scene);leftArm.parent=root;leftArm.position.set(-.27,1.12,0);leftArm.material=armMat;
  const rightArm=BABYLON.MeshBuilder.CreateCapsule('right-arm-'+id,{height:.66,radius:.105,tessellation:9,subdivisions:1},scene);rightArm.parent=root;rightArm.position.set(.27,1.12,0);rightArm.material=armMat;
  const leftLeg=BABYLON.MeshBuilder.CreateCapsule('left-leg-'+id,{height:.72,radius:.12,tessellation:9,subdivisions:1},scene);leftLeg.parent=root;leftLeg.position.set(-.13,.39,0);leftLeg.material=legMat;
  const rightLeg=BABYLON.MeshBuilder.CreateCapsule('right-leg-'+id,{height:.72,radius:.12,tessellation:9,subdivisions:1},scene);rightLeg.parent=root;rightLeg.position.set(.13,.39,0);rightLeg.material=legMat;
  const pack=box('backpack-'+id,0,0,0,.52,.58,.25,mat('pack-'+id,'#343b35',.9),false);pack.parent=root;pack.position.set(0,1.0,.29);
  const gun=box('rifle-'+id,0,0,0,.12,.12,.92,mat('rifle-'+id,'#202729',.42,.72),false);gun.parent=root;gun.position.set(.28,1.25,.38);
  root.position.set(x,0,z);
  state.bots.push({id,team,root,body,head,leftArm,rightArm,leftLeg,rightLeg,waypoints,index:0,speed:3.05,phase:id*.73,health:100,alive:true,fireAt:0,lastFire:0});
  return root;
}
function buildBots() {
  const r=DUST2_EXPANDED.botRoutes,ct=DUST2_EXPANDED.spawns.ct,t=DUST2_EXPANDED.spawns.t;
  makeBot(1,'enemy',ct.x-8,ct.z,r[0]);makeBot(2,'enemy',ct.x+8,ct.z,r[1]);
  makeBot(3,'ally',t.x-12,t.z,r[2]);makeBot(4,'ally',t.x+12,t.z,r[3]);
  makeBot(5,'enemy',-92,-12,r[4]);makeBot(6,'ally',92,12,r[5]);
}
function updateBotAI() {
  // Tactical decisions and combat run at 8 Hz.
  for(const bot of state.bots) {
    if(!bot.alive) continue;
    const waypoint=bot.waypoints[bot.index];
    if(Math.hypot(waypoint[0]-bot.root.position.x,waypoint[1]-bot.root.position.z)<.8) bot.index=(bot.index+1)%bot.waypoints.length;
    let target=null,best=Infinity;
    if(bot.team==='enemy') {
      const dx=camera.position.x-bot.root.position.x,dz=camera.position.z-bot.root.position.z,d=Math.hypot(dx,dz);
      if(d<34){target={kind:'player',x:camera.position.x,z:camera.position.z,distance:d};best=d;}
    } else {
      for(const candidate of state.bots) {
        if(!candidate.alive||candidate.team===bot.team)continue;
        const dx=candidate.root.position.x-bot.root.position.x,dz=candidate.root.position.z-bot.root.position.z,d=Math.hypot(dx,dz);
        if(d<best&&d<34){best=d;target={kind:'bot',bot:candidate,x:candidate.root.position.x,z:candidate.root.position.z,distance:d};}
      }
    }
    if(!target)continue;
    const now=performance.now();if(now-bot.lastFire<850+((bot.id*137)%450))continue;
    const origin=new BABYLON.Vector3(bot.root.position.x,1.22,bot.root.position.z);
    const aim=new BABYLON.Vector3(target.x,target.kind==='player'?1.45:1.15,target.z).subtract(origin);
    const distance=aim.length();if(distance<.1)continue;aim.normalize();
    const ray=new BABYLON.Ray(origin,aim,Math.min(36,distance+1));
    const hit=scene.pickWithRay(ray,mesh=>{
      if(mesh===state.playerHitbox)return true;
      if(mesh.name.startsWith('body-')||mesh.name.startsWith('head-'))return mesh.parent!==bot.root;
      return mesh.isPickable&&mesh.name!=='player-hitbox';
    });
    if(!hit?.hit||!hit.pickedMesh)continue;
    bot.lastFire=now;
    if(target.kind==='player'&&hit.pickedMesh===state.playerHitbox){
      state.hp=Math.max(0,state.hp-8);$('health').textContent='HP '+state.hp;
      if(state.hp===0){state.started=false;$('loadState').textContent='Ты погиб. Нажми «ПЕРЕЗАПУСК».';overlay.style.display='flex';startButton.textContent='ПЕРЕЗАПУСК';}
    } else if(target.kind==='bot'&&hit.pickedMesh.parent===target.bot.root){
      target.bot.health-=18;if(target.bot.health<=0){target.bot.alive=false;target.bot.root.setEnabled(false);}
    }
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
    bot.phase+=dt*8;const stride=Math.sin(bot.phase)*.42;bot.leftLeg.rotation.x=stride;bot.rightLeg.rotation.x=-stride;bot.leftArm.rotation.x=-stride*.7;bot.rightArm.rotation.x=stride*.7;bot.body.position.y=.88+Math.abs(Math.sin(bot.phase*2))*.018;
    bot.head.position.y=1.64+Math.abs(Math.sin(bot.phase*2))*.012;
  }
}
function fire() {
  const now=performance.now();if(now-state.lastShot<105||state.ammo<=0)return;
  state.lastShot=now;state.ammo--;const ray=camera.getForwardRay(95);
  const hit=scene.pickWithRay(ray,m=>isMapSolid(m)||m.name.startsWith('body-')||m.name.startsWith('head-'));
  if(hit?.hit&&hit.pickedMesh) {
    const target=hit.pickedMesh;
    if(target.metadata?.breakableWindow){
      target.isPickable=false;target.isVisible=false;
      const p=hit.pickedPoint||target.getAbsolutePosition();
      for(let i=0;i<7;i++){
        const end=p.add(new BABYLON.Vector3((Math.random()-.5)*.8,(Math.random()-.5)*.8,(Math.random()-.5)*.8));
        const shard=BABYLON.MeshBuilder.CreateLines('glass-shard',{points:[p,end]},scene);shard.color=new BABYLON.Color3(.55,.8,.88);shard.alpha=.85;
        setTimeout(()=>shard.dispose(),450);
      }
    } else {
      const bot=state.bots.find(b=>target.parent===b.root);
      if(bot&&bot.team==='enemy'&&bot.alive) {
        bot.health-=target.name.startsWith('head-')?100:34;
        if(bot.health<=0){bot.alive=false;bot.root.setEnabled(false)}
      }
    }
  }
  $('ammo').textContent=state.ammo+' / '+state.reserve;
}
function reload(){if(state.ammo===30||state.reserve===0)return;const n=Math.min(30-state.ammo,state.reserve);state.ammo+=n;state.reserve-=n;$('ammo').textContent=state.ammo+' / '+state.reserve}
function initInput() {
  window.addEventListener('keydown',e=>{state.keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyF')toggleFullscreen()});
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
  $('fire').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fire()});
  $('reload').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();reload()});
  $('fullscreen').addEventListener('click',toggleFullscreen);
}
function buildSky(B){
  const tex=new B.DynamicTexture('sunny-cloud-sky',{width:1024,height:512},scene,false);
  const ctx=tex.getContext(),g=ctx.createLinearGradient(0,0,0,512);g.addColorStop(0,'#287bb7');g.addColorStop(.48,'#78b9df');g.addColorStop(1,'#d9e9e9');ctx.fillStyle=g;ctx.fillRect(0,0,1024,512);
  for(let i=0;i<34;i++){const x=(i*173+61)%1120-48,y=95+(i*71)%235,scale=.55+((i*19)%65)/100;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);const cloud=ctx.createRadialGradient(0,0,8,0,0,72);cloud.addColorStop(0,'rgba(255,255,255,.92)');cloud.addColorStop(.62,'rgba(250,252,250,.72)');cloud.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=cloud;for(let k=0;k<6;k++){ctx.beginPath();ctx.ellipse((k-2.5)*20,Math.sin(k*1.4)*8,34,22,0,0,Math.PI*2);ctx.fill();}ctx.restore();}
  tex.update();
  const sky=B.MeshBuilder.CreateSphere('sky-dome',{diameter:650,segments:24},scene);sky.infiniteDistance=true;sky.isPickable=false;sky.renderingGroupId=0;
  const sm=new B.StandardMaterial('sky-dome-material',scene);sm.backFaceCulling=false;sm.disableLighting=true;sm.diffuseColor=new B.Color3(0,0,0);sm.specularColor=new B.Color3(0,0,0);sm.emissiveTexture=tex;sm.emissiveColor=new B.Color3(1,1,1);sky.material=sm;
  const sun=B.MeshBuilder.CreateSphere('sun-disc',{diameter:13,segments:16},scene);sun.position.set(-115,128,190);sun.isPickable=false;const sunMat=new B.StandardMaterial('sun-disc-material',scene);sunMat.disableLighting=true;sunMat.emissiveColor=new B.Color3(1,.83,.48);sun.material=sunMat;
}
function initRadar(){const c=$('radar');if(!c)return;c.width=180;c.height=180;drawRadar();}
function drawRadar(){const c=$('radar');if(!c)return;const ctx=c.getContext('2d'),w=c.width,h=c.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='rgba(10,20,23,.78)';ctx.fillRect(0,0,w,h);ctx.strokeStyle='rgba(225,211,177,.5)';ctx.strokeRect(1,1,w-2,h-2);const px=x=>(x+112)/224*w,pz=z=>(z+92)/184*h;ctx.fillStyle='rgba(174,151,111,.55)';for(const b of DUST2_EXPANDED.architecture){ctx.fillRect(px(b.x-b.w/2),pz(b.z-b.d/2),b.w/224*w,b.d/184*h);}ctx.fillStyle='#d2a35c';for(const p of [DUST2_EXPANDED.sites.A,DUST2_EXPANDED.sites.B]){ctx.beginPath();ctx.arc(px(p.x),pz(p.z),5,0,Math.PI*2);ctx.fill();}for(const b of state.bots){if(!b.alive)continue;ctx.fillStyle=b.team==='enemy'?'#e56d59':'#75b9df';ctx.beginPath();ctx.arc(px(b.root.position.x),pz(b.root.position.z),3.2,0,Math.PI*2);ctx.fill();}if(camera){ctx.fillStyle='#f6f2d8';ctx.beginPath();ctx.arc(px(camera.position.x),pz(camera.position.z),4.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#f6f2d8';ctx.beginPath();ctx.moveTo(px(camera.position.x),pz(camera.position.z));ctx.lineTo(px(camera.position.x+Math.sin(camera.rotation.y)*8),pz(camera.position.z+Math.cos(camera.rotation.y)*8));ctx.stroke();}}
function toggleFullscreen(){
  if(!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.().catch(()=>{});
}
function updatePlayer(dt) {
  const forward=(state.keys.has('KeyW')?1:0)-(state.keys.has('KeyS')?1:0)-state.joy.y;
  const strafe=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0)+state.joy.x;
  const len=Math.hypot(forward,strafe)||1, speed=4.6*dt;
  const yaw=camera.rotation.y;
  const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/len*speed;
  const dz=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)/len*speed;
  const nextX=Math.max(-108,Math.min(108,camera.position.x+dx)),nextZ=Math.max(-88,Math.min(88,camera.position.z+dz));
  if(!isPlayerBlocked(nextX,camera.position.z))camera.position.x=nextX;
  if(!isPlayerBlocked(camera.position.x,nextZ))camera.position.z=nextZ;
  if(state.playerHitbox)state.playerHitbox.position.set(camera.position.x,.92,camera.position.z);
}
function start() {
  state.started=true;overlay.style.display='none';state.hp=100;state.ammo=30;state.reserve=90;state.bots.forEach(b=>{b.health=100;b.alive=true;b.root.setEnabled(true);b.index=0});$('health').textContent='HP 100';$('ammo').textContent='30 / 90';startButton.textContent='ЗАПУСК';camera.position.set(DUST2_EXPANDED.spawns.t.x,1.65,DUST2_EXPANDED.spawns.t.z-4);camera.rotation.set(0,Math.PI,0);if(state.playerHitbox)state.playerHitbox.position.set(camera.position.x,.92,camera.position.z);
  if(!mobile)canvas.requestPointerLock?.();
}
async function boot() {
  try {
    if(!window.BABYLON)throw new Error('Babylon.js CDN недоступен');
    const B=window.BABYLON;
    const targetDpr=mobile?1.5:2,deviceDpr=Math.min(window.devicePixelRatio||1,targetDpr);
    engine=new B.Engine(canvas,!mobile,{preserveDrawingBuffer:false,stencil:false,antialias:!mobile,powerPreference:'high-performance',audioEngine:false},false);
    engine.setHardwareScalingLevel(1/Math.min(deviceDpr,targetDpr*state.scale));
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.12,.16,.17,1);scene.ambientColor=new B.Color3(.18,.18,.17);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.003;scene.fogColor=new B.Color3(.22,.25,.24);
    camera=new B.UniversalCamera('fps-camera',new B.Vector3(0,1.65,38),scene);camera.minZ=.08;camera.maxZ=260;camera.fov=1.08;camera.inertia=0;camera.angularSensibility=2400;camera.speed=0;camera.inputs.clear();
    const hemi=new B.HemisphericLight('sky-fill',new B.Vector3(0,1,0),scene);hemi.intensity=.68;hemi.diffuse=new B.Color3(.77,.81,.83);hemi.groundColor=new B.Color3(.24,.25,.22);
    const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,.3),scene);sun.position=new B.Vector3(24,38,-18);sun.intensity=2.2;
    shadowGen=new B.ShadowGenerator(mobile?1024:2048,sun);shadowGen.useBlurExponentialShadowMap=true;shadowGen.blurKernel=mobile?8:16;shadowGen.bias=.0005;shadowGen.normalBias=.02;
    enemyMaterial=mat('enemy uniform','#596c64',.88);allyMaterial=mat('friendly uniform','#526a83',.88);
    buildMap();buildBots();buildSky(B);
    state.playerHitbox=B.MeshBuilder.CreateCapsule('player-hitbox',{height:1.75,radius:.28,tessellation:8},scene);state.playerHitbox.position.set(0,.92,73);state.playerHitbox.isVisible=true;state.playerHitbox.isPickable=true;state.playerHitbox.visibility=0;
    initInput();
    window.addEventListener('resize',()=>engine.resize());
    $('start').disabled=false;$('loadState').textContent='Графическое ядро готово. Запусти тестовую сцену.';$('quality').textContent=mobile?'MOBILE PROFILE · SHADOWS 1024':'DESKTOP PROFILE · SHADOWS 2048';
    $('start').addEventListener('click',start);
    initRadar();
    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
      if(state.started) {
        updatePlayer(dt);updateBotMotion(dt);state.aiAccumulator+=dt;state.simTime+=dt;
        if(now-state.lastHud>100){drawRadar();state.lastHud=now;}
        if(state.aiAccumulator>=.125){state.aiAccumulator%=.125;updateBotAI()}
      }
      state.frameSamples.push(dt*1000);
      if(now-state.sampleAt>=2000){
        state.frameSamples.sort((a,b)=>a-b);const p95=state.frameSamples[Math.min(state.frameSamples.length-1,Math.floor(state.frameSamples.length*.95))]||16.7;
        const next=adaptiveScale(p95,state.scale,mobile);
        if(Math.abs(next-state.scale)>=.02){state.scale=next;engine.setHardwareScalingLevel(1/Math.min(deviceDpr,targetDpr*state.scale))}
        state.fps=Math.round(1000/(state.frameSamples.reduce((a,b)=>a+b,0)/Math.max(1,state.frameSamples.length)));
        $('fps').textContent=state.fps+' FPS';$('quality').textContent=(mobile?'MOBILE':'DESKTOP')+' · SCALE '+Math.round(state.scale*100)+'% · P95 '+Math.round(p95)+'ms';
        state.frameSamples.length=0;state.sampleAt=now;
      }
      scene.render();
    });
  } catch(error) { console.error(error);status.textContent='Ошибка запуска: '+error.message;$('quality').textContent='ENGINE ERROR'; }
}
boot();
