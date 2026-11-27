const $ = (id) => document.getElementById(id);
const canvas = $('renderCanvas');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Не найден canvas#renderCanvas в index.html');
const mobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
import { adaptiveScale, moveToward } from './engine-core.mjs';
import { buildExpandedDust2 } from './dust2-map.mjs';
import { DUST2_EXPANDED, isDust2Blocked } from './dust2-layout.mjs';
const state = { started:false, hp:100, ammo:30, reserve:90, fps:0, scale:mobile?1:1.25, frameSamples:[], sampleAt:performance.now(), aiAccumulator:0, simTime:0, bots:[], keys:new Set(), joy:{x:0,y:0}, look:{x:0,y:0}, lastShot:0, lastHud:0, firing:false, reloading:false, recoilPitch:0, muzzleFlash:null, playerHitbox:null, weapon:'rifle', wheelOpen:false, lastGamepadL1:false, gamepad:{index:-1,buttons:[],sprint:false,jumpVelocity:0,jumpOffset:0,aim:false}, weapons:{rifle:{name:'ВИНТОВКА',ammo:30,reserve:90,damage:34,rate:105,range:95},pistol:{name:'ПИСТОЛЕТ',ammo:12,reserve:48,damage:42,rate:300,range:65},grenade:{name:'ГРАНАТА',ammo:1,reserve:2,damage:0,rate:700,range:0},knife:{name:'НОЖ',ammo:0,reserve:0,damage:55,rate:420,range:2.4}} };
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

let viewModel={parts:[],byWeapon:{}};
function makeViewPart(name,geometry,position,rotation,material){
  const mesh=geometry();mesh.name='view-'+name;mesh.parent=camera;mesh.position.set(...position);if(rotation)mesh.rotation.set(...rotation);mesh.material=material;mesh.isPickable=false;mesh.receiveShadows=false;mesh.renderingGroupId=1;mesh.alwaysSelectAsActiveMesh=true;viewModel.parts.push(mesh);return mesh;
}
function buildViewModel(){
  const metal=new BABYLON.StandardMaterial('view-gun-metal',scene);metal.diffuseColor=new BABYLON.Color3(.12,.15,.15);metal.specularColor=new BABYLON.Color3(.45,.48,.46);
  const dark=new BABYLON.StandardMaterial('view-dark-polymer',scene);dark.diffuseColor=new BABYLON.Color3(.055,.07,.065);
  const skin=new BABYLON.StandardMaterial('view-gloves',scene);skin.diffuseColor=new BABYLON.Color3(.19,.22,.19);
  const rifle=[],pistol=[],grenade=[],knife=[];
  const addBox=(list,n,p,sz,m,rot=[0,0,0])=>{const o=makeViewPart(n,()=>BABYLON.MeshBuilder.CreateBox('vm-'+n,{width:sz[0],height:sz[1],depth:sz[2]},scene),p,rot,m);list.push(o);return o;};
  // Руки и перчатки от первого лица.
  addBox(rifle,'right-forearm',[.43,-.39,.46],[.17,.19,.48],skin,[.18,-.2,-.28]);
  addBox(rifle,'right-glove',[.34,-.31,.67],[.19,.13,.18],skin,[.1,-.2,-.18]);
  addBox(rifle,'left-forearm',[-.22,-.43,.58],[.16,.17,.43],skin,[-.12,.12,.22]);
  addBox(rifle,'left-glove',[-.10,-.34,.76],[.18,.12,.16],skin,[0,.1,.1]);
  addBox(rifle,'rifle-receiver',[.24,-.23,.78],[.22,.20,.48],metal);
  addBox(rifle,'rifle-handguard',[.24,-.22,1.08],[.16,.15,.34],dark);
  addBox(rifle,'rifle-stock',[.31,-.22,.48],[.14,.16,.28],dark,[0,0,-.08]);
  addBox(rifle,'rifle-sight',[.24,-.105,.83],[.055,.07,.12],dark);
  const barrel=makeViewPart('rifle-barrel',()=>BABYLON.MeshBuilder.CreateCylinder('vm-rifle-barrel',{height:.48,diameter:.055,tessellation:10},scene),[.24,-.22,1.42],[Math.PI/2,0,0],metal);rifle.push(barrel);
  const pArm=addBox(pistol,'pistol-arm',[.40,-.40,.56],[.17,.18,.40],skin,[.12,-.2,-.3]);
  addBox(pistol,'pistol-glove',[.31,-.31,.73],[.18,.12,.16],skin);
  addBox(pistol,'pistol-slide',[.30,-.23,.91],[.16,.13,.34],metal);
  addBox(pistol,'pistol-grip',[.30,-.36,.79],[.13,.22,.14],dark,[-.22,0,0]);
  addBox(grenade,'grenade-arm',[.38,-.40,.56],[.18,.18,.42],skin,[.12,-.2,-.3]);
  const bomb=makeViewPart('grenade-body',()=>BABYLON.MeshBuilder.CreateSphere('vm-grenade',{diameter:.25,segments:12},scene),[.27,-.25,.86],[0,0,0],dark);grenade.push(bomb);
  addBox(grenade,'grenade-pin',[.27,-.11,.86],[.13,.035,.05],metal);
  addBox(knife,'knife-arm',[.38,-.4,.56],[.17,.18,.42],skin,[.12,-.2,-.3]);
  addBox(knife,'knife-handle',[.30,-.29,.80],[.10,.10,.23],dark,[.18,0,0]);
  const blade=makeViewPart('knife-blade',()=>BABYLON.MeshBuilder.CreateBox('vm-knife-blade',{width:.09,height:.025,depth:.36},scene),[.30,-.22,1.08],[0,0,0],metal);knife.push(blade);
  const sharedArms=rifle.filter(m=>/right-forearm|right-glove|left-forearm|left-glove/.test(m.name));pistol.push(...sharedArms);grenade.push(...sharedArms);knife.push(...sharedArms);viewModel.byWeapon={rifle,pistol,grenade,knife};updateViewModel();
}
function updateViewModel(){
  for(const [id,parts] of Object.entries(viewModel.byWeapon))for(const mesh of parts)mesh.setEnabled(state.started&&id===state.weapon);
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

const weaponOrder=['rifle','pistol','grenade','knife'];
function currentWeapon(){return state.weapons[state.weapon]}
function updateAmmoHud(){const w=currentWeapon();$('ammo').textContent=(w.ammo??0)+' / '+(w.reserve??0);$('weaponName').textContent=w.name;}
function selectWeapon(id){if(!state.weapons[id])return;state.weapon=id;updateAmmoHud();updateViewModel();closeWeaponWheel();}
function openWeaponWheel(){if(!state.started)return;state.wheelOpen=true;$('weaponWheel').classList.add('open');}
function closeWeaponWheel(){state.wheelOpen=false;$('weaponWheel').classList.remove('open');}
function chooseWheelAt(x,y){const r=$('weaponWheel').getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=x-cx,dy=y-cy;if(Math.hypot(dx,dy)<24)return;const a=(Math.atan2(dy,dx)+Math.PI*2)%(Math.PI*2);selectWeapon(weaponOrder[Math.round(a/(Math.PI/2))%4]);}
function reload(){
  const w=currentWeapon(),cap=state.weapon==='rifle'?30:12;
  if(!['rifle','pistol'].includes(state.weapon)||state.reloading||w.ammo>=cap||w.reserve<=0)return;
  state.firing=false;state.reloading=true;
  const button=$('reload');if(button){button.disabled=true;button.textContent='ПЕРЕЗАРЯДКА…';}
  window.setTimeout(()=>{
    if(!state.started){state.reloading=false;if(button){button.disabled=false;button.textContent='RELOAD';}return;}
    const n=Math.min(cap-w.ammo,w.reserve);w.ammo+=n;w.reserve-=n;state.reloading=false;updateAmmoHud();
    if(button){button.disabled=false;button.textContent='RELOAD';}
  },1250);
}

function findAssistedAimDirection(){
  const forward=camera.getForwardRay(1).direction.clone().normalize();
  let best=null,bestAngle=.14;
  for(const bot of state.bots){
    if(!bot.alive||bot.team!=='enemy')continue;
    const target=new BABYLON.Vector3(bot.root.position.x,1.38,bot.root.position.z);
    const delta=target.subtract(camera.position),distance=delta.length();
    if(distance<1||distance>currentWeapon().range)continue;
    const dir=delta.scale(1/distance),dot=BABYLON.Vector3.Dot(forward,dir),angle=Math.acos(Math.max(-1,Math.min(1,dot)));
    if(angle>=bestAngle)continue;
    const sight=new BABYLON.Ray(camera.position.clone(),dir,distance+.2);
    const obstruction=scene.pickWithRay(sight,mesh=>isMapSolid(mesh)&&!mesh.name.startsWith('body-')&&!mesh.name.startsWith('head-')&&mesh!==state.playerHitbox);
    if(obstruction?.hit&&obstruction.distance<distance-.45)continue;
    best={dir,angle};bestAngle=angle;
  }
  if(!best)return forward;
  // Gentle, short-range aim assist. It never acquires targets outside the centre cone or through walls.
  return BABYLON.Vector3.Lerp(forward,best.dir,.42).normalize();
}
function showMuzzleFlash(){
  if(!state.muzzleFlash)return;
  state.muzzleFlash.setEnabled(true);
  window.clearTimeout(state.muzzleFlashTimer);
  state.muzzleFlashTimer=window.setTimeout(()=>state.muzzleFlash?.setEnabled(false),42);
}

function fire() {
  if(!state.started||state.wheelOpen||state.reloading)return;
  const w=currentWeapon(),now=performance.now();
  if(now-state.lastShot<w.rate)return;
  if(state.weapon==='grenade'){
    if(w.ammo<=0)return;
    w.ammo--;state.lastShot=now;
    const origin=camera.position.clone(),dir=camera.getForwardRay(1).direction.clone();
    const grenade=BABYLON.MeshBuilder.CreateSphere('thrown-grenade',{diameter:.18,segments:8},scene);
    grenade.position=origin.add(dir.scale(.65));grenade.material=mat('grenade-mat-'+now,'#4b5945',.8);
    let t=0;const obs=scene.onBeforeRenderObservable.add(()=>{const dt=Math.min(.04,engine.getDeltaTime()/1000);t+=dt;grenade.position.addInPlace(dir.scale(12*dt));grenade.position.y-=2.5*dt;if(t>1.15){scene.onBeforeRenderObservable.remove(obs);const p=grenade.position.clone();for(const b of state.bots){if(b.alive&&b.team==='enemy'&&BABYLON.Vector3.Distance(b.root.position,p)<5){b.health-=Math.max(0,100-BABYLON.Vector3.Distance(b.root.position,p)*18);if(b.health<=0){b.alive=false;b.root.setEnabled(false);}}}grenade.dispose();}});
    updateAmmoHud();return;
  }
  if(state.weapon==='knife'){
    const ray=camera.getForwardRay(w.range),hit=scene.pickWithRay(ray,m=>m.name.startsWith('body-')||m.name.startsWith('head-'));
    if(hit?.hit){const b=state.bots.find(b=>hit.pickedMesh.parent===b.root&&b.team==='enemy'&&b.alive);if(b){b.health-=w.damage;if(b.health<=0){b.alive=false;b.root.setEnabled(false);}}}
    state.lastShot=now;return;
  }
  if(w.ammo<=0){if(w.reserve>0)reload();return;}
  // Old engine's hitscan feel: the shot is resolved immediately from the centre of the crosshair.
  // Aim assist only nudges the ray toward a visible target inside a small cone.
  state.lastShot=now;w.ammo--;
  const direction=findAssistedAimDirection();
  const ray=new BABYLON.Ray(camera.position.clone(),direction,w.range);
  const hit=scene.pickWithRay(ray,mesh=>isMapSolid(mesh)||mesh.name.startsWith('body-')||mesh.name.startsWith('head-'));
  showMuzzleFlash();
  state.recoilPitch=Math.min(.012,state.recoilPitch+(state.weapon==='rifle'?.0022:.0014));
  if(hit?.hit&&hit.pickedMesh) {
    const target=hit.pickedMesh;
    if(target.metadata?.breakableWindow){
      target.isPickable=false;target.isVisible=false;
      const p=hit.pickedPoint||target.getAbsolutePosition();
      for(let i=0;i<7;i++){const end=p.add(new BABYLON.Vector3((Math.random()-.5)*.8,(Math.random()-.5)*.8,(Math.random()-.5)*.8));const shard=BABYLON.MeshBuilder.CreateLines('glass-shard',{points:[p,end]},scene);shard.color=new BABYLON.Color3(.55,.8,.88);shard.alpha=.85;setTimeout(()=>shard.dispose(),450);}
    } else {
      const bot=state.bots.find(b=>target.parent===b.root);
      if(bot&&bot.team==='enemy'&&bot.alive){bot.health-=target.name.startsWith('head-')?100:w.damage;if(bot.health<=0){bot.alive=false;bot.root.setEnabled(false);}}
    }
  }
  updateAmmoHud();
}

function initInput() {
  window.addEventListener('gamepadconnected',e=>{state.gamepad.index=e.gamepad.index;const n=$('padStatus');if(n)n.textContent='PAD: CONNECTED';});
  window.addEventListener('gamepaddisconnected',e=>{if(state.gamepad.index===e.gamepad.index){state.gamepad.index=-1;state.joy.x=state.joy.y=0;const n=$('padStatus');if(n)n.textContent='PAD: DISCONNECTED';}});
  window.addEventListener('keydown',e=>{state.keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyF')toggleFullscreen();if(e.code==='Tab'){e.preventDefault();openWeaponWheel();}if(e.code>='Digit1'&&e.code<='Digit4')selectWeapon(weaponOrder[Number(e.code.slice(-1))-1]);});
  window.addEventListener('keyup',e=>{state.keys.delete(e.code);if(e.code==='Tab'&&state.wheelOpen)closeWeaponWheel();});
  
  canvas.addEventListener('click',()=>{if(!mobile&&state.started)canvas.requestPointerLock?.()});
  window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){camera.rotation.y+=e.movementX*.0022;camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+e.movementY*.0022))}});
  window.addEventListener('mousedown',e=>{if(e.button===0&&state.started){state.firing=true;fire();}});\n  window.addEventListener('mouseup',e=>{if(e.button===0)state.firing=false;});
  const stick=$('stick'),nub=$('nub');let stickId=null,origin=null;
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};stick.setPointerCapture(e.pointerId)});
  stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,len=Math.max(1,Math.hypot(dx,dy)),k=Math.min(1,48/len);state.joy.x=dx/48*k;state.joy.y=dy/48*k;nub.style.transform='translate('+state.joy.x*38+'px,'+state.joy.y*38+'px)'});
  const reset=()=>{stickId=null;state.joy.x=state.joy.y=0;nub.style.transform=''};
  stick.addEventListener('pointerup',reset);stick.addEventListener('pointercancel',reset);
  const look=$('look');let lookId=null,last=null;
  look.addEventListener('pointerdown',e=>{lookId=e.pointerId;last={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId)});
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};camera.rotation.y+=dx*.004;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.004))});
  const stopLook=()=>{lookId=null};look.addEventListener('pointerup',stopLook);look.addEventListener('pointercancel',stopLook);
  const fireButton=$('fire');
  fireButton.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();fireButton.setPointerCapture?.(e.pointerId);state.firing=true;fireButton.classList.add('active');fire();});
  const stopFire=()=>{state.firing=false;fireButton.classList.remove('active');};
  fireButton.addEventListener('pointerup',stopFire);fireButton.addEventListener('pointercancel',stopFire);fireButton.addEventListener('lostpointercapture',stopFire);
  $('weaponButton').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.wheelOpen?closeWeaponWheel():openWeaponWheel();});
  $('weaponWheel').addEventListener('pointerdown',e=>{if(e.target.closest('[data-weapon]')){e.preventDefault();e.stopPropagation();selectWeapon(e.target.closest('[data-weapon]').dataset.weapon);}});
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
  const len=Math.hypot(forward,strafe)||1, speed=(state.gamepad.sprint?6.2:4.6)*dt;
  const yaw=camera.rotation.y;
  const dx=(Math.sin(yaw)*forward+Math.cos(yaw)*strafe)/len*speed;
  const dz=(Math.cos(yaw)*forward-Math.sin(yaw)*strafe)/len*speed;
  const nextX=Math.max(-108,Math.min(108,camera.position.x+dx)),nextZ=Math.max(-88,Math.min(88,camera.position.z+dz));
  if(!isPlayerBlocked(nextX,camera.position.z))camera.position.x=nextX;
  if(!isPlayerBlocked(camera.position.x,nextZ))camera.position.z=nextZ;
  if(state.gamepad.jumpVelocity||state.gamepad.jumpOffset>0){state.gamepad.jumpOffset=Math.max(0,state.gamepad.jumpOffset+state.gamepad.jumpVelocity*dt);state.gamepad.jumpVelocity-=14*dt;if(state.gamepad.jumpOffset===0)state.gamepad.jumpVelocity=0;camera.position.y=1.65+state.gamepad.jumpOffset;}else camera.position.y=1.65;
  if(state.playerHitbox)state.playerHitbox.position.set(camera.position.x,.92+state.gamepad.jumpOffset,camera.position.z);
}
function start() {
  state.started=true;state.firing=false;state.reloading=false;state.recoilPitch=0;updateViewModel();state.gamepad.jumpVelocity=0;state.gamepad.jumpOffset=0;camera.position.y=1.65;overlay.style.display='none';state.hp=100;state.ammo=30;state.reserve=90;state.weapons.rifle.ammo=30;state.weapons.rifle.reserve=90;state.weapons.pistol.ammo=12;state.weapons.pistol.reserve=48;state.weapons.grenade.ammo=1;state.weapons.grenade.reserve=2;state.weapon='rifle';closeWeaponWheel();state.bots.forEach(b=>{b.health=100;b.alive=true;b.root.setEnabled(true);b.index=0});$('health').textContent='HP 100';updateAmmoHud();startButton.textContent='ЗАПУСК';camera.position.set(DUST2_EXPANDED.spawns.t.x,1.65,DUST2_EXPANDED.spawns.t.z-4);camera.rotation.set(0,Math.PI,0);if(state.playerHitbox)state.playerHitbox.position.set(camera.position.x,.92,camera.position.z);
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
    buildMap();buildBots();buildSky(B);buildViewModel();\n    state.muzzleFlash=B.MeshBuilder.CreateSphere('old-style-muzzle-flash',{diameter:.13,segments:6},scene);state.muzzleFlash.parent=camera;state.muzzleFlash.position.set(.24,-.22,-1.30);const flashMat=new B.StandardMaterial('old-style-muzzle-flash-material',scene);flashMat.disableLighting=true;flashMat.emissiveColor=new B.Color3(1,.55,.16);state.muzzleFlash.material=flashMat;state.muzzleFlash.isPickable=false;state.muzzleFlash.setEnabled(false);
    state.playerHitbox=B.MeshBuilder.CreateCapsule('player-hitbox',{height:1.75,radius:.28,tessellation:8},scene);state.playerHitbox.position.set(0,.92,73);state.playerHitbox.isVisible=true;state.playerHitbox.isPickable=true;state.playerHitbox.visibility=0;
    initInput();
    window.addEventListener('resize',()=>engine.resize());
    $('start').disabled=false;$('loadState').textContent='Графическое ядро готово. Запусти тестовую сцену.';$('quality').textContent=mobile?'MOBILE PROFILE · SHADOWS 1024':'DESKTOP PROFILE · SHADOWS 2048';
    $('start').addEventListener('click',start);
    initRadar();
    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
      updateGamepad(dt);
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
