const $ = (id) => document.getElementById(id);
const canvas = $('renderCanvas');
const mobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
import { adaptiveScale, moveToward, createTeamRoster, cameraRelativeMovement, moveWithAabbCollisions, findSafePlayerSpawn, findPathAStar, TEAM_SPAWNS, BOMB_SITE, aimCandidateScore, getPlayerSpawn, advancePatrolIndex, selectNextLivingBot, buildNavigationGrid, buildCollisionSpatialIndex, queryCollisionSpatialIndex } from './engine-core.mjs?v=20261128-1200-r7';
import { loadHumanBotAssets, createHumanBot, animateHumanBot, stopHumanBot } from './human-bots.mjs?v=20261128-1200-r7';
import { createWeaponViewmodel } from './weapon-viewmodel.mjs?v=20261128-1200-r7';
import { buildWetGroundMap } from './wet-ground-map.mjs?v=20261128-1200-r7';
const state = { started:false, paused:false, playerTeam:'CT', hp:100, ammo:30, reserve:90, fps:0, scale:mobile?.9:1, frameSamples:[], sampleAt:performance.now(), aiAccumulator:0, simTime:0, bots:[], keys:new Set(), joy:{x:0,y:0}, look:{x:0,y:0}, lastShot:0, lastHud:0, firing:false, reloading:false, playerDead:false, kills:0, roundTime:180, projectiles:[], weaponSlot:'rifle', weaponAmmo:{rifle:30,pistol:12}, weaponReserve:{rifle:90,pistol:48}, lastMove:null, lastMoveWasBlocked:false, lastRenderMs:0, aimTargetId:null, fireStick:{x:0,y:0}, playerHitbox:null, spawnProtectedUntil:0, minimapAt:0, lookSensitivity:1, roundNumber:1, roundEnding:false, roundEndAt:0, spectatorBotId:null };
const status = $('loadState'), startButton = $('start'), overlay = $('overlay');
function mat(name, color, roughness=0.8, metallic=0) {
  const tint=BABYLON.Color3.FromHexString(color);
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor=tint; m.roughness=mobile?Math.max(.28,roughness):roughness; m.metallic=metallic;
  m.environmentIntensity=mobile?.8:1.05; m.directIntensity=1.05;
  if(m.clearCoat){m.clearCoat.isEnabled=true;m.clearCoat.intensity=.12;m.clearCoat.roughness=.32;}
  return m;
}
const renderPixelRatio=Math.min(Math.max(1,window.devicePixelRatio||1),mobile?1.25:1.5);
function applyRenderScale(){if(engine)engine.setHardwareScalingLevel(1/(state.scale*renderPixelRatio));}
let engine, scene, camera, shadowGen, enemyMaterial, allyMaterial, humanBotAssets, botWeaponMaterials;
let weaponGeometryRoot, rifleRoot, pistolRoot, knifeRoot, collisionBoxes=[], collisionIndex=null, navigationGrid=null, playerSpawn=getPlayerSpawn('CT'), projectileMaterial;
let safeRenderFallbackActive=false;
function activateSafeRenderFallback(error){
  if(safeRenderFallbackActive||!scene)return false;
  safeRenderFallbackActive=true;
  recordRuntimeDiagnostic('renderer-safe-fallback-activated',{reason:String(error?.message||error),webgl:engine?.getCaps?.()?.maxTextureSize||null});
  try{scene.postProcessesEnabled=false;}catch{}
  try{if(scene.imageProcessingConfiguration)scene.imageProcessingConfiguration.isEnabled=false;}catch{}
  try{window.__SOLO_GLOW_LAYER__?.dispose();window.__SOLO_GLOW_LAYER__=null;}catch{}
  try{shadowGen?.dispose();shadowGen=null;}catch{}
  try{for(const target of scene.customRenderTargets||[]){try{target.refreshRate=0;target.renderList=[];}catch{}}}catch{}
  try{for(const system of scene.particleSystems||[]){try{system.stop();system.dispose();}catch{}}}catch{}
  try{scene.environmentTexture=null;}catch{}
  try{for(const light of scene.lights||[]){try{light.shadowEnabled=false;}catch{}}}catch{}
  return true;
}
function box(name, x,y,z, sx,sy,sz, material, cast=true, collide=true) {
  const m = BABYLON.MeshBuilder.CreateBox(name,{width:sx,height:sy,depth:sz},scene);
  m.position.set(x,y,z); m.material=material; m.receiveShadows=!mobile; m.checkCollisions=!!collide; m.isPickable=!!collide;
  if(cast && !mobile) shadowGen.addShadowCaster(m);
  return m;
}
function buildMap() {
  const asphalt=mat('district asphalt','#343c3b',.96),road=mat('road worn tar','#252d2d',.98),sidewalk=mat('aged sidewalk','#777b73',.92),brick=mat('weathered brick','#75665a',.92),plaster=mat('aged plaster','#aaa18d',.94),concrete=mat('site concrete','#777c78',.9),metal=mat('industrial steel','#343d3d',.52,.58),roof=mat('roof tar','#3c4240',.96),glass=mat('dark window glass','#263b40',.28,.25),yellow=mat('site safety yellow','#d2ad4d',.55,.18),white=mat('road paint','#c8c6b5',.75);
  const mapMeshStart=scene.meshes.length;
  const ground=BABYLON.MeshBuilder.CreateGround('district-ground',{width:112,height:92,subdivisions:1},scene);ground.material=asphalt;ground.receiveShadows=!mobile;
  // Every overlay has a deliberate height. The old shared Y=.012 made road, rail bed,
  // sidewalks and site aprons coplanar; overlapping depth buffers caused floor flicker.
  const groundPatch=(name,x,z,w,d,m,elevation=.025)=>{const p=BABYLON.MeshBuilder.CreateGround(name,{width:w,height:d,subdivisions:1},scene);p.position.set(x,elevation,z);p.material=m;p.receiveShadows=!mobile;return p;};
  groundPatch('main asphalt avenue',0,0,17,88,road,.025);
  groundPatch('west side street',-23,0,8,84,road,.035);groundPatch('east side street',23,0,8,84,road,.035);
  for(const x of [-12,12,-29,29])groundPatch('concrete pavement',x,0,2.2,86,sidewalk,.045);
  box('north perimeter wall',0,2.8,-45,112,5.6,.9,concrete);box('south perimeter wall',0,2.8,45,112,5.6,.9,concrete);
  box('west perimeter wall',-55.5,2.8,0,.9,5.6,90,concrete);box('east perimeter wall',55.5,2.8,0,.9,5.6,90,concrete);
  const wall=(name,x,y,z,w,h,d,m=brick,collide=true)=>box(name,x,y,z,w,h,d,m,true,collide);
  const building=(name,cx,cz,w,d,m,door='inward')=>{
    const h=4.4,t=.65,y=h/2;
    wall(name+' north wall',cx,y,cz-d/2,w,h,t,m);
    wall(name+' south wall',cx,y,cz+d/2,w,h,t,m);
    if(door==='inward'&&cx<0){
      wall(name+' west wall',cx-w/2,y,cz,t,h,d,m);
      const segment=(d-3.4)/2,offset=(d+3.4)/4;
      wall(name+' east jamb north',cx+w/2,y,cz-offset,t,h,segment,m);
      wall(name+' east jamb south',cx+w/2,y,cz+offset,t,h,segment,m);
    }else if(door==='inward'&&cx>0){
      wall(name+' east wall',cx+w/2,y,cz,t,h,d,m);
      const segment=(d-3.4)/2,offset=(d+3.4)/4;
      wall(name+' west jamb north',cx-w/2,y,cz-offset,t,h,segment,m);
      wall(name+' west jamb south',cx-w/2,y,cz+offset,t,h,segment,m);
    }else{
      wall(name+' west wall',cx-w/2,y,cz,t,h,d,m);
      wall(name+' east wall',cx+w/2,y,cz,t,h,d,m);
    }
    box(name+' flat roof',cx,4.55,cz,w+.5,.3,d+.5,roof,false,false);
    for(const side of [-1,1]){
      const wx=cx+side*(w/2+.012);
      box(name+' window lintel',wx,2.85,cz-3, .12,.12,2.8,plaster,false,false);
      box(name+' window glass',wx,2.1,cz-3,.04,1.25,2.1,glass,false,false);
    }
    const faceX=cx<0?cx+w/2+.08:cx-w/2-.08,faceSign=cx<0?1:-1;
    // Street-facing entrance, framed windows and service equipment make each block
    // read as a lived-in building rather than a single primitive obstacle.
    for(const offset of [-2.05,2.05])box(name+' entrance pillar',faceX,1.3,cz+offset,.2,2.6,.2,plaster,false,false);
    box(name+' entrance lintel',faceX,2.62,cz,.2,.2,4.3,plaster,false,false);
    for(const offset of [-4.7,4.7]){
      box(name+' street window frame',faceX,2.55,cz+offset,.14,1.75,2.25,metal,false,false);
      box(name+' street window glass',faceX+faceSign*.08,2.55,cz+offset,.035,1.42,1.92,glass,false,false);
      box(name+' window sill',faceX+faceSign*.12,1.62,cz+offset,.28,.12,2.4,plaster,false,false);
    }
    for(const side of [-1,1]){
      const facadeZ=cz+side*(d/2+.08);
      for(const offset of [-w*.24,w*.24]){
        box(name+' front window frame',cx+offset,2.55,facadeZ,2.5,1.65,.14,metal,false,false);
        box(name+' front window glass',cx+offset,2.55,facadeZ+side*.08,2.12,1.3,.035,glass,false,false);
      }
    }
    box(name+' facade sign',faceX+faceSign*.1,3.55,cz, .16,.48,4.8,metal,false,false);
    box(name+' rooftop ventilation unit',cx-3,4.95,cz-2,2.2,.55,1.5,metal,false,false);
    box(name+' rooftop exhaust stack',cx+4,5.05,cz+3,.55,.9,.55,concrete,false,false);
    box(name+' exterior drainpipe',cx+w/2+.08,2.1,cz+d/2-.8,.12,4.2,.12,metal,false,false);
  };
  // A compact industrial-residential district. Buildings form real blocks and alleys,
  // while the broad central avenue and cross streets remain traversable.
  building('west depot',-28,-24,17,14,brick);
  building('east workshop',28,-24,17,14,plaster);
  building('west apartments',-29,-3,16,16,plaster);
  building('east warehouse',29,-3,16,16,brick);
  building('west loading block',-28,17,17,13,brick);
  building('east service block',28,17,17,13,plaster);
  // Side-lane walls, low barriers and stacked cargo create multiple covered approaches.
  for(const [x,z,w,d] of [[-15,-14,1,9],[15,-14,1,9],[-15,8,1,8],[15,8,1,8],[-39,-10,8,1],[39,-10,8,1],[-39,12,8,1],[39,12,8,1]])wall('alley retaining wall',x,1.15,z,w,2.3,d,concrete);
  const cargo=(x,z,w=3,d=2,h=2)=>{box('cargo container',x,h/2,z,w,h,d,metal);box('container roof lip',x,h+.05,z,w+.12,.1,d+.12,yellow,false,false);};
  cargo(-10,-25,3,5,2.4);cargo(10,-9,3,5,2.4);cargo(-10,7,3,4,2.1);cargo(10,15,3,4,2.1);
  // Bombsite A: open industrial loading yard close to the CT landing zone.
  groundPatch('bombsite concrete apron',0,23,25,18,concrete,.055);
  for(const [x,z,w,d] of [[-12,14,.25,18],[12,14,.25,18],[-12,32,.25,18],[12,32,.25,18]])box('bombsite painted boundary',x,.085,z,w,.035,d,yellow,false,false);
  for(const [x,z] of [[-8,20],[8,27]])cargo(x,z,3,5,2.5);
  box('bombsite plant platform',0,.12,23,4,.22,3,yellow,false,false);
  box('bombsite site marker',0,.085,23,7,.035,.18,white,false,false);
  // CT cover positions defend the yard without sealing its entrances.
  for(const [x,z,w,d] of [[-8,34,4,1.1],[8,34,4,1.1],[-14,23,1.1,4],[14,23,1.1,4]])box('site concrete cover',x,.65,z,w,1.3,d,concrete);
  // Distinct faction landing aprons. T is deliberately far from A; CT is staged beside it.
  const tMark=mat('T landing paint','#8d493d',.78),ctMark=mat('CT landing paint','#496b86',.78);
  groundPatch('T landing apron',0,-36,22,9,tMark,.065);
  groundPatch('CT landing apron',0,34,22,8,ctMark,.065);
  for(const x of [-10,10]){
    box('T landing boundary',x,.09,-36,.16,.04,8,yellow,false,false);
    box('CT landing boundary',x,.09,34,.16,.04,7,yellow,false,false);
  }
  box('T landing sign',0,2.5,-42,5,1.1,.18,tMark,false,false);
  box('CT landing sign',0,2.5,42,5,1.1,.18,ctMark,false,false);
  // NORTH DOCKS: freight rails, container gantry and fortified faction deployment compounds.
  groundPatch('freight rail bed',0,-4,8,58,road,.075);
  for(const x of [-2.8,2.8])box('freight rail steel',x,.125,-4,.16,.09,58,metal,false,false);
  for(let z=-31;z<=23;z+=4)box('rail sleeper',0,.105,z,6.2,.07,.28,roof,false,false);
  for(const x of [-20,20]){
    box('gantry crane left leg',x-2.2,4.4,-5,.55,8.8,.55,metal,false,false);
    box('gantry crane right leg',x+2.2,4.4,-5,.55,8.8,.55,metal,false,false);
    box('gantry crane crossbeam',x,8.9,-5,5.1,.55,.65,yellow,false,false);
    box('gantry crane diagonal brace',x,6.2,-5,4.6,.22,.24,metal,false,false).rotation.z=.55;
    box('gantry crane hoist cable',x,7,-5,.08,3.1,.08,metal,false,false);
    box('gantry crane hook',x,5.35,-5,.55,.22,.35,yellow,false,false);
  }
  cargo(0,-5,5.5,7,2.8);
  for(const sign of [-1,1]){
    const center=sign*35;
    for(const x of [-11.5,11.5])box((sign<0?'T':'CT')+' safe-zone side barricade',x,1.35,center,1.0,2.7,12,concrete,true,true);
    box((sign<0?'T':'CT')+' safe-zone rear barricade',0,1.35,sign*41.5,23,2.7,1,concrete,true,true);
    box((sign<0?'T':'CT')+' safe-zone gate west',-7.75,1.35,sign*29,7.5,2.7,1,concrete,true,true);
    box((sign<0?'T':'CT')+' safe-zone gate east',7.75,1.35,sign*29,7.5,2.7,1,concrete,true,true);
    for(const x of [-9,9])box((sign<0?'T':'CT')+' base floodlight',x,3.4,center, .18,6.8,.18,yellow,false,false);
    box((sign<0?'T':'CT')+' base overhead sign',0,3.3,sign*40,8,.55,.22,metal,false,false);
  }
  // Road markings, drains, lamps and roof equipment give the district scale.
  for(const z of [-31,-19,-7,5,17,29,39])box('broken lane marking',0,.08,z,.14,.035,3.2,yellow,false,false);
  for(const x of [-18,18])for(const z of [-26,0,28]){
    const pole=box('streetlight pole',x,3,z,.12,6,.12,metal,false,false);
    box('streetlight head',x,6,z,.8,.16,.35,yellow,false,false);
    if(!mobile){const light=new BABYLON.PointLight('streetlight glow',new BABYLON.Vector3(x,5.7,z),scene);light.diffuse=new BABYLON.Color3(.82,.74,.56);light.intensity=.22;light.range=11;}
  }
  for(const [x,z] of [[-47,-36],[47,-36],[-47,36],[47,36]])box('utility cabinet',x,.8,z,2,1.6,1.4,metal);
  // Static level geometry never moves: freeze transforms once to avoid recomputing
  // hundreds of world matrices on every mobile frame.
  const mapMeshes=scene.meshes.slice(mapMeshStart),frozenMaterials=new Set();
  for(const mesh of mapMeshes){mesh.computeWorldMatrix(true);mesh.freezeWorldMatrix();if(mesh.material&&!frozenMaterials.has(mesh.material)){frozenMaterials.add(mesh.material);mesh.material.freeze();}}
}
function makeBot(id, team, x,z, waypoints) {
  const root=new BABYLON.TransformNode('bot-'+id,scene);
  const human=createHumanBot(BABYLON,scene,shadowGen,root,team,id,humanBotAssets,mobile);
  root.position.set(x,0,z);
  const weapons=createBotWeapon(root,id,team);
  state.bots.push({id,team,root,body:human.body,head:human.head,rig:human.rig,weapons,rifle:weapons.rifle,activeWeapon:'rifle',rightHand:human.rig.rightHand,ammo:30,reserve:90,pistolAmmo:12,pistolReserve:36,reloadUntil:0,meleeUntil:0,weaponKick:0,fireAt:0,deadAt:0,spawn:{x,z},faction:z<0?'T':'CT',waypoints,baseWaypoints:waypoints.map(p=>p.slice()),index:0,speed:team==='enemy'?2.05:1.9,phase:id*.73,health:100,alive:true,navPath:[],navIndex:0,navGoal:null,repathAt:0,target:null,combatState:'patrol',combatStrafeAt:0,combatSide:id%2?1:-1,routeCompleted:false,stuckSince:0,lastProgressX:x,lastProgressZ:z,lastProgressAt:performance.now(),pathFailures:0});
  return root;
}
function buildBots() {
  // The player takes the sixth landing slot; eleven AI soldiers fill the rest.
  // T attackers advance through the central avenue and side alleys to the bombsite.
  // CT defenders deploy beside the site and patrol its approaches.
  const tRoutes=[
    [[-3,-35],[-6,-27],[-7,-18],[-4,-9],[-2,2],[-1,14],[BOMB_SITE.x,BOMB_SITE.z]],
    [[3,-37],[7,-29],[8,-20],[5,-10],[3,1],[2,13],[BOMB_SITE.x,BOMB_SITE.z]],
    [[-6,-35],[-13,-29],[-16,-20],[-13,-10],[-8,1],[-5,13],[-2,21]],
    [[6,-37],[13,-29],[16,-20],[13,-10],[8,1],[5,13],[2,21]],
    [[0,-40],[0,-31],[1,-21],[0,-11],[0,0],[0,12],[BOMB_SITE.x,BOMB_SITE.z]],
    [[-2,-36],[-2,-26],[2,-17],[7,-8],[7,3],[4,14],[1,22]]
  ];
  const ctRoutes=[
    [[-8,31],[-10,26],[-9,20],[-4,17],[2,18],[8,22],[10,29]],
    [[-3,33],[-6,28],[-6,22],[-2,18],[4,18],[9,23],[7,30]],
    [[3,31],[6,27],[7,21],[3,17],[-3,17],[-9,22],[-8,29]],
    [[6,33],[10,29],[11,24],[8,19],[3,18],[-3,21],[-5,29]],
    [[0,36],[0,31],[-2,26],[-2,21],[2,19],[5,23],[3,30]],
    [[-6,31],[-10,27],[-12,22],[-8,18],[-2,17],[5,19],[9,25]]
  ];
  const roster=createTeamRoster(state.playerTeam);
  for(const [id,team,x,z] of roster){
    const faction=team==='ally'?state.playerTeam:(state.playerTeam==='CT'?'T':'CT');
    const routeSet=faction==='T'?tRoutes:ctRoutes;
    makeBot(id,team,x,z,routeSet[(id-1)%routeSet.length]);
  }
  // All allied bots remain ordinary combatants; no developer/observer bot role exists.
}
let weaponRoot, muzzleFlash, weaponViewmodel;
function buildPlayerWeapon(){
  weaponViewmodel=createWeaponViewmodel(BABYLON,scene,camera,mobile);
  weaponRoot=weaponViewmodel.root;
  muzzleFlash=weaponViewmodel.muzzleFlash;
  rifleRoot=weaponViewmodel.rifle;
  pistolRoot=weaponViewmodel.pistol;
  knifeRoot=weaponViewmodel.knife;
  selectWeapon('rifle');
}
function selectWeapon(slot,source='unknown'){
  const previous=state.weaponSlot;
  if(!['rifle','pistol','knife'].includes(slot)){gameLogEvent('weapon-select-rejected',{requested:slot,source,hasWeaponRoot:!!weaponRoot});return false;}
  // Weapon selection is gameplay/HUD state, not dependent on successful viewmodel creation.
  // This keeps the touch selector functional even if a 3D weapon asset fails to initialize.
  state.weaponSlot=slot;
  for(const button of document.querySelectorAll('#weaponBar [data-weapon]')){
    const active=button.dataset.weapon===slot;
    button.classList.toggle('selected',active);
    button.setAttribute('aria-pressed',String(active));
  }
  $('ammo').textContent=slot==='knife'?'MELEE':state.weaponAmmo[slot]+' / '+state.weaponReserve[slot];
  $('weaponName').textContent=slot==='rifle'?'M4 CARBINE':slot==='pistol'?'9MM PISTOL':'COMBAT KNIFE';
  try{
    weaponViewmodel?.select(slot);
    rifleRoot?.setEnabled(slot==='rifle');
    pistolRoot?.setEnabled(slot==='pistol');
    knifeRoot?.setEnabled(slot==='knife');
  }catch(error){
    gameLogEvent('weapon-viewmodel-error',{slot,message:String(error?.message||error)});
    console.error('Weapon viewmodel switch failed',error);
  }
  gameLogEvent('weapon-select',{from:previous,to:slot,source,changed:previous!==slot,confirmed:state.weaponSlot===slot});
  return true;
}
function createBotWeapon(root,id,team){
  if(!botWeaponMaterials){
    botWeaponMaterials={
      body:mat('bot rifle polymer','#202725',.56,.08),
      metal:mat('bot rifle steel','#555d59',.38,.62),
      grip:mat('bot rifle grip','#151b19',.9,0),
      pistol:mat('bot pistol polymer','#252d2a',.52,.12),
      knife:mat('bot knife steel','#69716d',.3,.72)
    };
  }
  const build=(name,offset)=>{const holder=new BABYLON.TransformNode(name+'-'+id,scene);holder.parent=root;holder.position.copyFrom(offset);return holder;};
  const make=(parent,name,pos,size,material)=>{
    const m=BABYLON.MeshBuilder.CreateBox(name+'-'+id,{width:size[0],height:size[1],depth:size[2]},scene);
    m.parent=parent;m.position.set(...pos);m.material=material;m.isPickable=false;m.receiveShadows=true;return m;
  };
  const rifle=build('bot-rifle',{x:.22,y:1.24,z:.20});
  make(rifle,'bot rifle receiver',[0,0,0],[.105,.09,.27],botWeaponMaterials.body);
  make(rifle,'bot rifle handguard',[0,.005,.25],[.085,.075,.28],botWeaponMaterials.body);
  make(rifle,'bot rifle barrel',[0,.015,.48],[.035,.035,.24],botWeaponMaterials.metal);
  make(rifle,'bot rifle muzzle',[0,.015,.61],[.045,.045,.055],botWeaponMaterials.grip);
  make(rifle,'bot rifle stock',[0,0,-.22],[.09,.085,.22],botWeaponMaterials.body);
  make(rifle,'bot rifle magazine',[0,-.13,.02],[.075,.18,.09],botWeaponMaterials.metal);
  make(rifle,'bot rifle grip',[0,-.105,-.045],[.07,.16,.075],botWeaponMaterials.grip);
  make(rifle,'bot rifle optic',[0,.075,.015],[.065,.055,.09],botWeaponMaterials.grip);
  const pistol=build('bot-pistol',{x:.19,y:1.22,z:.23});
  make(pistol,'bot pistol slide',[0,.015,.06],[.075,.07,.25],botWeaponMaterials.metal);
  make(pistol,'bot pistol frame',[0,-.04,.10],[.07,.07,.17],botWeaponMaterials.body);
  make(pistol,'bot pistol grip',[0,-.12,.16],[.065,.15,.08],botWeaponMaterials.grip);
  make(pistol,'bot pistol magazine',[0,-.13,.12],[.045,.12,.045],botWeaponMaterials.metal);
  const knife=build('bot-knife',{x:.16,y:1.18,z:.20});
  make(knife,'bot knife handle',[0,0,.08],[.045,.045,.16],botWeaponMaterials.grip);
  make(knife,'bot knife guard',[0,.025,-.005],[.095,.018,.025],botWeaponMaterials.metal);
  make(knife,'bot knife blade',[0,.025,-.16],[.045,.018,.27],botWeaponMaterials.knife);
  pistol.setEnabled(false);knife.setEnabled(false);
  return {rifle,pistol,knife};
}
function setPlayerTeam(team) {
  if(state.started || (team!=='CT' && team!=='T')) return;
  state.playerTeam=team;
  playerSpawn=findSafePlayerSpawn([getPlayerSpawn(team)],collisionBoxes,.36,1.72,0);
  for(const bot of state.bots) bot.root.dispose();
  state.bots.length=0;
  buildBots();
  $('team').textContent='TEAM '+team;
  $('selectCT').classList.toggle('selected',team==='CT');
  $('selectT').classList.toggle('selected',team==='T');
}
function hasBotLineOfSight(origin,target){
  const minX=Math.min(origin.x,target.x),maxX=Math.max(origin.x,target.x),minZ=Math.min(origin.z,target.z),maxZ=Math.max(origin.z,target.z);
  const blockers=queryCollisionSpatialIndex(collisionIndex,minX-.08,maxX+.08,minZ-.08,maxZ+.08);
  const dx=target.x-origin.x,dz=target.z-origin.z,dy=target.y-origin.y;
  for(const box of blockers){
    if(box.maxY<=Math.min(origin.y,target.y)+.04||box.minY>=Math.max(origin.y,target.y)-.04)continue;
    let enter=0,leave=1,valid=true;
    for(const [p,d,min,max] of [[origin.x,dx,box.minX,box.maxX],[origin.z,dz,box.minZ,box.maxZ]]){
      if(Math.abs(d)<1e-7){if(p<min||p>max){valid=false;break;}}
      else{let a=(min-p)/d,b=(max-p)/d;if(a>b)[a,b]=[b,a];enter=Math.max(enter,a);leave=Math.min(leave,b);if(enter>leave){valid=false;break;}}
    }
    if(!valid||leave<.035||enter>.965)continue;
    const t=Math.max(0,Math.min(1,(enter+leave)*.5)),y=origin.y+dy*t;
    if(y>box.minY+.08&&y<box.maxY-.08)return false;
  }
  return true;
}
function aliveAllies(){return state.bots.filter(bot=>bot.team==='ally'&&bot.alive);}
function setSpectatorTarget(bot){
  if(!bot?.alive)return false;
  state.spectatorBotId=bot.id;$('spectatorHud').hidden=false;$('weaponBar').style.display='none';
  $('spectatorLabel').textContent='НАБЛЮДЕНИЕ · СОЮЗНИК #'+bot.id;
  gameLogEvent('spectator-target-changed',{botId:bot.id});return true;
}
function cycleSpectator(direction=1){
  const next=selectNextLivingBot(aliveAllies(),state.spectatorBotId,direction);
  if(!next){endRound(false,'TEAM ELIMINATED');return false;}
  return setSpectatorTarget(next);
}
function handlePlayerDeath(source='unknown'){
  if(state.playerDead||state.roundEnding)return;
  state.playerDead=true;state.hp=0;state.firing=false;state.reloading=false;state.keys.clear();state.joy.x=state.joy.y=0;
  $('health').textContent='DEAD';gameLogEvent('player-died',{source,position:{x:+camera.position.x.toFixed(2),z:+camera.position.z.toFixed(2)},livingAllies:aliveAllies().length});
  if(aliveAllies().length)cycleSpectator(1);else endRound(false,'TEAM ELIMINATED');
}
function updateSpectatorCamera(){
  if(!state.playerDead||state.roundEnding)return;
  let bot=state.bots.find(candidate=>candidate.id===state.spectatorBotId&&candidate.alive);
  if(!bot){const next=selectNextLivingBot(aliveAllies(),state.spectatorBotId,1);if(!next){endRound(false,'TEAM ELIMINATED');return;}setSpectatorTarget(next);bot=next;}
  const yaw=bot.root.rotation.y;
  // Keep the first-person spectator eye just ahead of the soldier's face mesh;
  // placing it at the head's origin caused the camera to render inside the face.
  camera.position.set(bot.root.position.x+Math.sin(yaw)*.26,bot.root.position.y+1.58,bot.root.position.z+Math.cos(yaw)*.26);
  camera.rotation.x=0;camera.rotation.y=yaw;camera.rotation.z=0;
}
function updateBotAI() {
  const now=performance.now();
  for(const bot of state.bots) {
    if(!bot.alive)continue;
    if(bot.reloadUntil&&now>=bot.reloadUntil){
      if(bot.activeWeapon==='rifle'){const n=Math.min(30-bot.ammo,bot.reserve);bot.ammo+=n;bot.reserve-=n;}
      else if(bot.activeWeapon==='pistol'){const n=Math.min(12-bot.pistolAmmo,bot.pistolReserve);bot.pistolAmmo+=n;bot.pistolReserve-=n;}
      bot.reloadUntil=0;
    }
    const candidates=[];
    if(bot.team==='ally'&&now<state.spawnProtectedUntil){bot.target=null;bot.combatState='guard';bot.navPath=[];bot.navGoal=null;continue;}
    if(bot.team==='enemy'&&!state.playerDead&&now>=state.spawnProtectedUntil&&state.bots.filter(other=>other!==bot&&other.team==='enemy'&&other.alive&&other.target?.kind==='player').length<2)candidates.push({kind:'player',position:camera.position});
    for(const other of state.bots)if(other.alive&&other.team!==bot.team)candidates.push({kind:'bot',bot:other,position:other.root.position});
    candidates.sort((a,b)=>BABYLON.Vector3.Distance(bot.root.position,a.position)-BABYLON.Vector3.Distance(bot.root.position,b.position));
    let chosen=null,chosenDistance=Infinity;
    for(const candidate of candidates){
      const origin=bot.root.position.add(new BABYLON.Vector3(0,1.48,0));
      const aim=candidate.kind==='player'?candidate.position.add(new BABYLON.Vector3(0,-.25,0)):candidate.position.add(new BABYLON.Vector3(0,1.28,0));
      const delta=aim.subtract(origin),distance=delta.length();
      if(distance<1.25||distance>40)continue;
      const visible=hasBotLineOfSight(origin,aim);
      if(visible){chosen=candidate;chosenDistance=distance;break;}
    }
    bot.target=chosen;
    if(chosen){
      bot.fieldExploreGoal=null;
      bot.combatState='engage';
      const target=chosen.position;
      // Bots now choose a real loadout: knife at contact range, pistol when rifle ammo is exhausted.
      if(chosenDistance<2.15){bot.activeWeapon='knife';bot.meleeUntil=bot.meleeUntil||0;}
      else if(bot.ammo<=0&&bot.reserve<=0)bot.activeWeapon='pistol';
      else if(bot.activeWeapon==='knife'&&chosenDistance>3.2)bot.activeWeapon=bot.ammo>0?'rifle':'pistol';
      const weapon=bot.weapons;
      weapon.rifle.setEnabled(bot.activeWeapon==='rifle');
      weapon.pistol.setEnabled(bot.activeWeapon==='pistol');
      weapon.knife.setEnabled(bot.activeWeapon==='knife');
      if(chosenDistance>13){
        const away=Math.atan2(bot.root.position.x-target.x,bot.root.position.z-target.z);
        const goal={x:target.x+Math.sin(away)*8.5,z:target.z+Math.cos(away)*8.5};
        if(!bot.navGoal||Math.hypot(bot.navGoal.x-goal.x,bot.navGoal.z-goal.z)>2||now>bot.repathAt){
          bot.navPath=findPathAStar(bot.root.position,goal,navigationGrid,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.repathAt=now+1800;
        }
      }else{
        bot.combatState='fire';
        if(now>bot.combatStrafeAt){
          const dx=bot.root.position.x-target.x,dz=bot.root.position.z-target.z,dist=Math.max(.01,Math.hypot(dx,dz));
          const side=bot.combatSide||1;
          const goal=chosenDistance<5.2
            ?{x:bot.root.position.x+dx/dist*3.2,z:bot.root.position.z+dz/dist*3.2}
            :{x:bot.root.position.x+(dz/dist)*side*3.2,z:bot.root.position.z-(dx/dist)*side*3.2};
          bot.navPath=findPathAStar(bot.root.position,goal,navigationGrid,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.combatStrafeAt=now+2200+Math.random()*1300;bot.combatSide=-side;bot.repathAt=now+2200;
        }
      }
      if(bot.activeWeapon==='rifle'&&bot.ammo===0&&bot.reserve>0&&!bot.reloadUntil)bot.reloadUntil=now+1450;
      if(bot.activeWeapon==='pistol'&&bot.pistolAmmo===0&&bot.pistolReserve>0&&!bot.reloadUntil)bot.reloadUntil=now+1250;
      if(now>=bot.fireAt&&chosenDistance<38&&!bot.reloadUntil){
        if(bot.activeWeapon==='knife'){
          if(chosenDistance<2.15&&now>bot.meleeUntil){
            bot.meleeUntil=now+850;
            if(chosen.kind==='player'){const previousHp=state.hp;state.hp=Math.max(0,state.hp-28);gameLogEvent('player-damaged',{sourceBot:bot.id,weapon:'knife',damage:28,previousHp,remainingHp:state.hp});$('health').textContent='HP '+state.hp;if(state.hp===0)handlePlayerDeath('knife');}
            else if(chosen.bot?.alive)damageBot(chosen.bot,45,false);
          }
          bot.fireAt=now+180;
        }else{
          const isPistol=bot.activeWeapon==='pistol';
          const magazine=isPistol?'pistolAmmo':'ammo';
          if(bot[magazine]<=0){
            if(isPistol&&bot.pistolReserve<=0){bot.activeWeapon='knife';}
            else if(!isPistol&&bot.reserve<=0){bot.activeWeapon='pistol';}
          }else{
            bot[magazine]--;
            bot.fireAt=now+(isPistol?1250:1450)+Math.random()*(isPistol?450:550);
            const origin=bot.root.position.add(new BABYLON.Vector3(0,1.48,0));
            const aim=chosen.kind==='player'?target.add(new BABYLON.Vector3(0,-.12,0)):target.add(new BABYLON.Vector3(0,1.28,0));
            const direction=aim.subtract(origin).normalize();
            const spread=isPistol?.105:.082;
            direction.x+=(Math.random()-.5)*spread;direction.y+=(Math.random()-.5)*spread*.7;direction.z+=(Math.random()-.5)*spread;direction.normalize();
            spawnProjectile(origin.add(direction.scale(.42)),direction,bot.team,isPistol?36:42,bot.id,isPistol?12:9);
            gameLogEvent('bot-shot',{id:bot.id,team:bot.team,target:chosen.kind==='player'?'player':chosen.bot?.id||null,weapon:bot.activeWeapon,distance:+chosenDistance.toFixed(2),ammo:bot[magazine]});
            bot.weaponKick=Math.min(.16,bot.weaponKick+(isPistol?.09:.055));
          }
        }
      }
    }else{
      bot.combatState='patrol';bot.target=null;
      bot.activeWeapon=bot.ammo>0?'rifle':bot.pistolAmmo>0?'pistol':'knife';
      bot.weapons.rifle.setEnabled(bot.activeWeapon==='rifle');
      bot.weapons.pistol.setEnabled(bot.activeWeapon==='pistol');
      bot.weapons.knife.setEnabled(bot.activeWeapon==='knife');
      const wp=bot.waypoints[bot.index]||bot.waypoints[0];
       if(Math.hypot(wp[0]-bot.root.position.x,wp[1]-bot.root.position.z)<1.1){
         if(bot.index<bot.waypoints.length-1)bot.index++;
         else if(bot.faction==='T'&&!bot.routeCompleted){bot.routeCompleted=true;bot.waypoints=[[-4,20],[-4,26],[4,26],[4,20]];bot.index=0;gameLogEvent('bot-route-phase',{id:bot.id,phase:'site-hold'});}
         else bot.index=advancePatrolIndex(bot.index,bot.waypoints.length);
         bot.navPath=[];bot.navGoal=null;bot.repathAt=0;
       }
      const goal={x:wp[0],z:wp[1]};if(!bot.navGoal||Math.hypot(bot.navGoal.x-goal.x,bot.navGoal.z-goal.z)>.1||now>bot.repathAt){bot.navPath=findPathAStar(bot.root.position,goal,navigationGrid,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.repathAt=now+2500;}
    }
  }
}
function updateBotMotion(dt) {
  for(const bot of state.bots) {
    if(!bot.alive){
      if(bot.deadAt){
        const t=Math.min(1,(performance.now()-bot.deadAt)/520);
        bot.root.rotation.x=bot.deathStartX+t*1.28;bot.root.position.y=-.12*t;
        if(t>=1)bot.deadAt=0;
      }
      continue;
    }
    let goal=null;
    if(bot.navPath?.length&&bot.navIndex<bot.navPath.length){
      goal=bot.navPath[bot.navIndex];
      if(Math.hypot(goal.x-bot.root.position.x,goal.z-bot.root.position.z)<.55)bot.navIndex++;
      if(bot.navIndex>=bot.navPath.length){bot.navPath=[];bot.navGoal=null;bot.repathAt=0;goal=null;}
    }
    if(!goal&&bot.combatState==='patrol'){
      const wp=bot.waypoints[bot.index];goal={x:wp[0],z:wp[1]};
    }
    if(goal){
      const dx=goal.x-bot.root.position.x,dz=goal.z-bot.root.position.z,dist=Math.hypot(dx,dz);
      const next=moveToward({x:bot.root.position.x,z:bot.root.position.z},goal,bot.combatState==='patrol'?bot.speed:bot.speed*1.12,dt);
      // Spread soldiers across distinct authored lanes and apply gentle local separation
      // so teammates do not occupy the same waypoint or oscillate against one another.
      let avoidX=0,avoidZ=0;
      for(const other of state.bots){
        if(other===bot||!other.alive)continue;
        let sx=bot.root.position.x-other.root.position.x,sz=bot.root.position.z-other.root.position.z;
        let separation=Math.hypot(sx,sz);
        if(separation<1.05){
          if(separation<.001){const angle=(bot.id-other.id)*2.399;sx=Math.cos(angle);sz=Math.sin(angle);separation=1;}
          const strength=(1.05-separation)/1.05;
          avoidX+=sx/separation*strength;avoidZ+=sz/separation*strength;
        }
      }
      const avoidLength=Math.hypot(avoidX,avoidZ);
      const steer=avoidLength>.001?Math.min(1.25,avoidLength*1.55)*dt:0;
      const moveX=next.x-bot.root.position.x+(avoidX/Math.max(.001,avoidLength))*steer;
      const moveZ=next.z-bot.root.position.z+(avoidZ/Math.max(.001,avoidLength))*steer;
      // Collision helper queries the same spatial hash per swept substep, avoiding
      // repeated scans of even the bot's prefiltered collider list.
      const resolved=moveWithAabbCollisions({x:bot.root.position.x,y:1.72,z:bot.root.position.z},{x:moveX,z:moveZ},collisionBoxes,.38,1.72,.07,collisionIndex);
      bot.root.position.x=resolved.x;bot.root.position.z=resolved.z;
      if((resolved.blockedX||resolved.blockedZ)&&dist>.8){
        if(!bot.blockedLogged)gameLogEvent('bot-path-blocked',{id:bot.id,team:bot.team,position:{x:+bot.root.position.x.toFixed(2),z:+bot.root.position.z.toFixed(2)},goal,blockedX:resolved.blockedX,blockedZ:resolved.blockedZ});
        bot.blockedLogged=true;bot.navPath=[];bot.navGoal=null;bot.repathAt=0;bot.pathFailures=(bot.pathFailures||0)+1;
      }else bot.blockedLogged=false;
      const progress=Math.hypot(bot.root.position.x-(bot.lastProgressX??bot.root.position.x),bot.root.position.z-(bot.lastProgressZ??bot.root.position.z));
      if(progress>.18){bot.lastProgressX=bot.root.position.x;bot.lastProgressZ=bot.root.position.z;bot.lastProgressAt=performance.now();bot.stuckSince=0;}
      else if(dist>1.05&&performance.now()-(bot.lastProgressAt||0)>1450){
        if(!bot.stuckSince||performance.now()-bot.stuckSince>1200){
          bot.stuckSince=performance.now();bot.lastProgressAt=performance.now();bot.pathFailures=(bot.pathFailures||0)+1;
          gameLogEvent('bot-stuck-recovery',{id:bot.id,team:bot.team,position:{x:+bot.root.position.x.toFixed(2),z:+bot.root.position.z.toFixed(2)},goal,failures:bot.pathFailures});
          bot.navPath=[];bot.navGoal=null;bot.repathAt=0;
          if(bot.pathFailures>=2&&bot.combatState==='patrol'){bot.index=advancePatrolIndex(bot.index,bot.waypoints.length);bot.pathFailures=0;}
          else if(bot.combatState!=='patrol')bot.combatSide=-(bot.combatSide||1);
        }
      }
      animateHumanBot(bot.rig,dist>.25,bot.speed>2.7);
    }else animateHumanBot(bot.rig,false,false);
    let lookAt=null;
    if(bot.target?.kind==='player')lookAt=bot.target.position;
    else if(bot.target?.bot)lookAt=bot.target.bot.root.position;
    else if(goal)lookAt=new BABYLON.Vector3(goal.x,0,goal.z);
    if(lookAt){
      const yaw=Math.atan2(lookAt.x-bot.root.position.x,lookAt.z-bot.root.position.z);
      const delta=Math.atan2(Math.sin(yaw-bot.root.rotation.y),Math.cos(yaw-bot.root.rotation.y));
      bot.root.rotation.y+=delta*Math.min(1,dt*6);
      bot.root.rotation.y=Math.atan2(Math.sin(bot.root.rotation.y),Math.cos(bot.root.rotation.y));
    }
    const held=bot.weapons?.[bot.activeWeapon||'rifle'];
    if(bot.rightHand&&held&&(!mobile||now>=(bot.handSyncAt||0))){
      bot.handSyncAt=now+(mobile?55:30);
      bot.root.computeWorldMatrix(true);bot.rightHand.computeWorldMatrix(true);
      const inverse=bot.root.getWorldMatrix().clone().invert();
      const local=BABYLON.Vector3.TransformCoordinates(bot.rightHand.getAbsolutePosition(),inverse);
      held.position.set(local.x+.02,local.y-.025,local.z+.05);
      bot.weaponKick=Math.max(0,(bot.weaponKick||0)-dt*.8);
      held.rotation.x=-bot.weaponKick;
      if(bot.rig.rightHand){bot.rig.rightHand.rotation.x=bot.activeWeapon==='knife'?-0.22:-0.12;bot.rig.rightHand.rotation.z=bot.activeWeapon==='knife'?.08:0;}
      if(bot.rig.leftHand){bot.rig.leftHand.rotation.x=bot.activeWeapon==='knife'?.08:-.28;bot.rig.leftHand.rotation.z=bot.activeWeapon==='knife'?-.12:.16;}
    }
    
    bot.phase+=dt*7;
  }
}
function spawnProjectile(origin,direction,ownerTeam,speed,ownerId=null,damage=34) {
  if(!projectileMaterial){
    projectileMaterial=new BABYLON.StandardMaterial('shared-projectile-material',scene);
    projectileMaterial.diffuseColor=new BABYLON.Color3(.95,.78,.38);
    projectileMaterial.emissiveColor=new BABYLON.Color3(.8,.48,.12);
  }
  const mesh=BABYLON.MeshBuilder.CreateSphere('combat-projectile',{diameter:.055,segments:6},scene);
  mesh.material=projectileMaterial;mesh.position.copyFrom(origin);mesh.isPickable=false;
  state.projectiles.push({mesh,velocity:direction.scale(speed),life:1.7,ownerTeam,ownerId,damage,gravity:ownerId==='player'?0:(speed<60?1.35:9.81)});
}
function killBot(bot,credit=false) {
  if(!bot||!bot.alive)return;
  gameLogEvent('bot-killed',{id:bot.id,team:bot.team,credited:credit,position:{x:+bot.root.position.x.toFixed(2),z:+bot.root.position.z.toFixed(2)}});
  bot.health=0;bot.alive=false;bot.deadAt=performance.now();bot.deathStartX=bot.root.rotation.x;
  bot.body.isPickable=false;bot.head.isPickable=false;bot.combatState='dead';bot.target=null;bot.navPath=[];
  stopHumanBot(bot.rig);if(credit){state.kills++;$('kills').textContent='KILLS '+state.kills}
  if(state.playerDead&&bot.team==='ally'&&bot.id===state.spectatorBotId)cycleSpectator(1);
  if(state.playerDead&&bot.team==='ally'&&!aliveAllies().length)endRound(false,'TEAM ELIMINATED');
  if(bot.team==='enemy'&&state.bots.filter(other=>other.team==='enemy'&&other.alive).length===0)endRound(true,'ALL ENEMIES ELIMINATED');
}
function damageBot(bot,damage,credit=false) {
  if(!bot?.alive)return;
  const previousHp=bot.health;
  bot.health=Math.max(0,bot.health-Math.max(0,damage));
  gameLogEvent('bot-damaged',{id:bot.id,team:bot.team,damage:+Math.max(0,damage).toFixed(1),previousHp,remainingHp:bot.health,credited:credit});
  if(bot.health===0)killBot(bot,credit);
}
function resolvePlayerHitscan(slot) {
  // Resolve the shot against the same center-screen direction the player is aiming.
  // The visible projectile remains a tracer; hit registration no longer depends on
  // a fast projectile crossing a thin collider between mobile frames.
  const ray=camera.getForwardRay(120);
  const hit=scene.pickWithRay(ray,m=>{
    if(!m||!m.isEnabled()||!m.isPickable)return false;
    const n=m.name.toLowerCase();
    return n.startsWith('body-')||n.startsWith('head-')||n.includes('wall')||n.includes('crate')||n.includes('cover')||n.includes('barrier')||n.includes('beam')||n==='ground';
  });
  if(!hit?.hit||!hit.pickedMesh){
    gameLogEvent('shot-miss',{slot,range:120});
    return;
  }
  const mesh=hit.pickedMesh;
  const bot=state.bots.find(b=>mesh===b.body||mesh===b.head||mesh.parent===b.root);
  if(bot?.alive&&bot.team==='enemy'){
    const headshot=mesh.name.startsWith('head-');
    const damage=headshot?85:34;
    damageBot(bot,damage,true);
    gameLogEvent('shot-hit',{slot,target:bot.id,damage,headshot,distance:+hit.distance.toFixed(2),remainingHp:bot.health});
    return;
  }
  gameLogEvent('shot-blocked',{slot,mesh:mesh.name,distance:+hit.distance.toFixed(2)});
}
function updateBulletPhysics(dt) {
  for(let i=state.projectiles.length-1;i>=0;i--) {
    const p=state.projectiles[i];p.life-=dt;p.velocity.y-=(p.gravity??9.81)*dt;
    const from=p.mesh.position.clone(),to=from.add(p.velocity.scale(dt)),segment=to.subtract(p.mesh.position),distance=segment.length();
    let hit=null;
    if(distance>.0001){
      const ray=new BABYLON.Ray(p.mesh.position.clone(),segment.scale(1/distance),distance);
      hit=scene.pickWithRay(ray,m=>{
        if(!m||!m.isEnabled()||!m.isPickable)return false;
        const n=m.name.toLowerCase();
        return (p.ownerId==null||(!n.startsWith('body-'+p.ownerId)&&!n.startsWith('head-'+p.ownerId)))&&(n.startsWith('body-')||n.startsWith('head-')||n==='player-hitbox'||n.includes('wall')||n.includes('crate')||n.includes('cover')||n.includes('barrier')||n.includes('beam')||n==='ground');
      });
    }
    if(hit?.hit&&hit.pickedMesh){
      const bot=state.bots.find(b=>hit.pickedMesh.parent===b.root);
      if(bot&&bot.alive&&bot.team!==p.ownerTeam&&p.damage>0)damageBot(bot,hit.pickedMesh.name.startsWith('head-')?Math.max(85,p.damage*2):p.damage,p.ownerId==='player');
      if(hit.pickedMesh.name==='player-hitbox'&&p.ownerTeam==='enemy'&&performance.now()>=state.spawnProtectedUntil){
        const damage=p.damage?Math.max(2,Math.round(p.damage*.22)):6,previousHp=state.hp;state.hp=Math.max(0,state.hp-damage);gameLogEvent('player-damaged',{sourceBot:p.ownerId,weapon:'projectile',damage,previousHp,remainingHp:state.hp});$('health').textContent='HP '+state.hp;
        if(state.hp===0)handlePlayerDeath('projectile');
      }
      p.life=0;
    }else{
      p.mesh.position.copyFrom(to);
      if(p.mesh.position.y<.12)p.life=0;
    }
    if(p.life<=0){p.mesh.dispose();state.projectiles.splice(i,1);}
  }
}
function fire() {
  const now=performance.now();if(!state.started||state.playerDead||state.reloading){gameLogEvent('fire-blocked',{source:state.fireInputSource||'loop',started:state.started,playerDead:state.playerDead,reloading:state.reloading,slot:state.weaponSlot});return;}
  const slot=state.weaponSlot,rate=slot==='rifle'?105:slot==='pistol'?240:520;
  if(now-state.lastShot<rate)return;
  if(slot==='knife'){
    if(!weaponViewmodel?.fire())return;
    state.lastShot=now;
    gameLogEvent('melee-swing-start',{source:state.fireInputSource||'loop',slot,range:2.8});
    return;
  }
  if(state.weaponAmmo[slot]<=0){if(state.weaponReserve[slot]>0)reload();return;}
  state.lastShot=now;state.weaponAmmo[slot]--;
  gameLogEvent('shot-fired',{source:state.fireInputSource||'loop',slot,ammo:state.weaponAmmo[slot],yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3)});
  const ray=camera.getForwardRay(1);
  const muzzleNode=slot==='rifle'?weaponViewmodel?.muzzleFlash:weaponViewmodel?.pistolFlash;
  const origin=muzzleNode?.getAbsolutePosition().clone()||camera.position.add(ray.direction.scale(.7));
  resolvePlayerHitscan(slot);
  // Tracer only: damage is applied once by the center-screen hitscan above.
  spawnProjectile(origin,ray.direction,'ally',slot==='rifle'?125:105,'player',0);
  weaponViewmodel?.fire();
  $('ammo').textContent=state.weaponAmmo[slot]+' / '+state.weaponReserve[slot];
}
function resolvePlayerMeleeImpact(){
  if(!weaponViewmodel?.consumeMeleeHit())return;
  const ray=camera.getForwardRay(2.8);
  const hit=scene.pickWithRay(ray,m=>m&&m.isEnabled()&&m.isPickable&&(m.name.startsWith('body-')||m.name.startsWith('head-')));
  if(hit?.hit&&hit.pickedMesh){
    const bot=state.bots.find(b=>hit.pickedMesh.parent===b.root);
    if(bot&&bot.team==='enemy'&&bot.alive){damageBot(bot,100,true);gameLogEvent('melee-hit',{target:bot.id,distance:hit.distance});return;}
  }
  gameLogEvent('melee-miss',{range:2.1});
}
function reload(){
  const slot=state.weaponSlot,max=slot==='rifle'?30:12;
  if(!state.started||state.reloading||slot==='knife'||state.weaponAmmo[slot]===max||state.weaponReserve[slot]===0||state.playerDead)return;
  state.reloading=true;weaponViewmodel?.beginReload(1.25);$('reload').disabled=true;$('reload').textContent='RELOADING…';
  window.setTimeout(()=>{
    if(!state.started){state.reloading=false;weaponViewmodel?.completeReload();$('reload').disabled=false;$('reload').textContent='RELOAD · R';return;}
    const max=slot==='rifle'?30:12,n=Math.min(max-state.weaponAmmo[slot],state.weaponReserve[slot]);
    state.weaponAmmo[slot]+=n;state.weaponReserve[slot]-=n;state.reloading=false;weaponViewmodel?.completeReload();
    $('ammo').textContent=state.weaponAmmo[slot]+' / '+state.weaponReserve[slot];$('reload').disabled=false;$('reload').textContent='RELOAD · R';
  },1250);
}
function initInput() {
  window.addEventListener('keydown',e=>{if(state.playerDead&&(e.code==='KeyQ'||e.code==='KeyE')){cycleSpectator(e.code==='KeyE'?1:-1);return;}state.keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyF')toggleFullscreen();if(e.code==='Digit1')selectWeapon('rifle');if(e.code==='Digit2')selectWeapon('pistol');if(e.code==='Digit3')selectWeapon('knife');});
  window.addEventListener('keyup',e=>state.keys.delete(e.code));
  canvas.addEventListener('click',()=>{if(!mobile&&state.started)canvas.requestPointerLock?.()});
  window.addEventListener('mousemove',e=>{if(!state.playerDead&&document.pointerLockElement===canvas){camera.rotation.y+=e.movementX*.0022*state.lookSensitivity;camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+e.movementY*.0022*state.lookSensitivity))}});
  // Desktop firing is canvas-only. Mobile taps must never synthesize a shot; the FIRE pointer control owns touch shooting.
  canvas.addEventListener('mousedown',e=>{if(!mobile&&e.button===0&&state.started){state.fireInputSource='desktop-mousedown';state.firing=true;fire()}});
  window.addEventListener('mouseup',e=>{if(e.button===0)state.firing=false});
  window.addEventListener('blur',()=>{state.keys.clear();state.firing=false});
  const stick=$('stick'),nub=$('nub');let stickId=null,origin=null;
  stick.addEventListener('pointerdown',e=>{stickId=e.pointerId;origin={x:e.clientX,y:e.clientY};stick.setPointerCapture(e.pointerId)});
  stick.addEventListener('pointermove',e=>{if(e.pointerId!==stickId)return;const dx=e.clientX-origin.x,dy=e.clientY-origin.y,len=Math.max(1,Math.hypot(dx,dy)),k=Math.min(1,48/len);state.joy.x=dx/48*k;state.joy.y=dy/48*k;nub.style.transform='translate('+state.joy.x*38+'px,'+state.joy.y*38+'px)'});
  const reset=()=>{stickId=null;state.joy.x=state.joy.y=0;nub.style.transform=''};
  stick.addEventListener('pointerup',reset);stick.addEventListener('pointercancel',reset);
  const look=$('look');let lookId=null,last=null;
  look.addEventListener('pointerdown',e=>{lookId=e.pointerId;last={x:e.clientX,y:e.clientY};look.setPointerCapture(e.pointerId)});
  look.addEventListener('pointermove',e=>{if(state.playerDead||e.pointerId!==lookId)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};camera.rotation.y-=dx*.004*state.lookSensitivity;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.004*state.lookSensitivity))});
  const stopLook=()=>{lookId=null};look.addEventListener('pointerup',stopLook);look.addEventListener('pointercancel',stopLook);
  const fireButton=$('fire'),fireNub=$('fireNub');let fireId=null,fireLast=null;
  fireButton.addEventListener('pointerdown',e=>{
    e.preventDefault();fireId=e.pointerId;fireButton.setPointerCapture(e.pointerId);
    const r=fireButton.getBoundingClientRect();fireLast={x:r.left+r.width/2,y:r.top+r.height/2};
    state.fireInputSource='touch-fire-pointerdown';gameLogEvent('fire-control-down',{pointerType:e.pointerType,pointerId:e.pointerId,x:e.clientX,y:e.clientY});state.firing=true;fireButton.classList.add('active');fire();
  });
  fireButton.addEventListener('pointermove',e=>{
    if(e.pointerId!==fireId||!fireLast)return;
    const dx=e.clientX-fireLast.x,dy=e.clientY-fireLast.y;fireLast={x:e.clientX,y:e.clientY};
    const r=fireButton.getBoundingClientRect(),ox=e.clientX-(r.left+r.width/2),oy=e.clientY-(r.top+r.height/2);
    const len=Math.hypot(ox,oy),k=Math.min(1,38/Math.max(1,len));
    state.fireStick.x=ox/38*k;state.fireStick.y=oy/38*k;
    fireNub.style.transform='translate('+state.fireStick.x*30+'px,'+state.fireStick.y*30+'px)';
    if(!state.playerDead){camera.rotation.y+=dx*.0042*state.lookSensitivity;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.0042*state.lookSensitivity));}
  });
  const stopFire=e=>{
    if(e&&fireId!==null&&e.pointerId!==fireId)return;
    gameLogEvent('fire-control-up',{pointerId:fireId});fireId=null;fireLast=null;state.firing=false;state.fireInputSource='';state.fireStick.x=state.fireStick.y=0;
    fireNub.style.transform='';fireButton.classList.remove('active');
  };
  fireButton.addEventListener('pointerup',stopFire);fireButton.addEventListener('pointercancel',stopFire);
  $('reload').addEventListener('click',reload);
  $('spectatorPrev').addEventListener('click',()=>cycleSpectator(-1));$('spectatorNext').addEventListener('click',()=>cycleSpectator(1));
  // Bind each weapon button directly. Document-level capture listeners were unreliable
  // on some Android browsers when the look/fire touch surfaces overlapped the HUD.
  const weaponBar=$('weaponBar');
  weaponBar.style.pointerEvents='auto';
  weaponBar.style.zIndex='30';
  for(const button of weaponBar.querySelectorAll('[data-weapon]')){
    button.style.pointerEvents='auto';
    button.style.touchAction='manipulation';
    button.setAttribute('aria-pressed',String(button.dataset.weapon===state.weaponSlot));
    const chooseWeapon=e=>{
      e.preventDefault();
      e.stopPropagation();
      const slot=button.dataset.weapon;
      gameLogEvent('weapon-button-activated',{slot,pointerType:e.pointerType||'click',eventType:e.type});
      selectWeapon(slot,'direct-'+e.type);
    };
    button.addEventListener('pointerdown',chooseWeapon,{passive:false});
    button.addEventListener('click',chooseWeapon);
  }
  $('fullScreen').addEventListener('click',toggleFullscreen);
  $('logsQuick').addEventListener('click',handleGameplayLogs);
  $('pause').addEventListener('click',()=>{
    if(!state.started)return;
    state.started=false;state.paused=true;state.firing=false;
    gameLogEvent('game-paused',{weapon:state.weaponSlot,position:{x:camera.position.x,z:camera.position.z}});
    overlay.style.display='flex';status.textContent='ПАУЗА';showMenuTab('play');
    startButton.textContent='ПРОДОЛЖИТЬ';startButton.disabled=false;
  });

}
function updateAimAssist(dt) {
  const forward=camera.getForwardRay(1).direction.normalize();
  const maxAngle=mobile?.40:.28;
  let best=null,bestScore=Infinity,bestTarget=null;
  for(const bot of state.bots){
    if(!bot.alive||bot.team!=='enemy')continue;
    // Aim at upper torso, not the head center: less vertical snapping on mobile.
    const target=bot.root.position.add(new BABYLON.Vector3(0,1.22,0));
    const delta=target.subtract(camera.position),distance=delta.length();
    if(distance>36||distance<.5)continue;
    const direction=delta.scale(1/distance);
    const dot=Math.max(-1,Math.min(1,BABYLON.Vector3.Dot(forward,direction)));
    const angle=Math.acos(dot);
    if(angle>maxAngle)continue;
    const ray=new BABYLON.Ray(camera.position,direction,distance);
    const hit=scene.pickWithRay(ray,m=>m&&m.isPickable&&m.name!=='player-hitbox');
    if(hit?.hit&&hit.pickedMesh.parent!==bot.root)continue;
    const score=aimCandidateScore(angle,distance);
    if(score<bestScore){best=bot;bestScore=score;bestTarget=target;}
  }
  state.aimTargetId=best?.id??null;
  if(!best||!state.started)return;
  const dx=bestTarget.x-camera.position.x,dz=bestTarget.z-camera.position.z,dy=bestTarget.y-camera.position.y;
  const yaw=Math.atan2(dx,dz),pitch=-Math.atan2(dy,Math.hypot(dx,dz));
  const yawDelta=Math.atan2(Math.sin(yaw-camera.rotation.y),Math.cos(yaw-camera.rotation.y));
  const strength=(state.firing ? 0.19 : 0.075)*Math.min(1,dt*60);
  camera.rotation.y+=yawDelta*strength;
  camera.rotation.x+=(pitch-camera.rotation.x)*strength;
}
function drawMinimap(){
  const canvas=$('minimap'),ctx=canvas?.getContext('2d');if(!ctx||!scene)return;
  const size=canvas.width,pad=8,spanX=112,spanZ=92,scale=(size-pad*2)/spanX;
  const px=x=>pad+(x+56)*scale,py=z=>pad+(z+46)*scale;
  ctx.clearRect(0,0,size,size);ctx.fillStyle='#101a20e8';ctx.fillRect(0,0,size,size);
  ctx.strokeStyle='#8b9a91';ctx.lineWidth=1;ctx.strokeRect(pad,pad,spanX*scale,spanZ*scale);
  ctx.fillStyle='#071b2c';ctx.fillRect(px(-53),py(-4.8),106*scale,9.6*scale);ctx.fillStyle='#5b6670';for(const bx of [-20,20])ctx.fillRect(px(bx-4),py(-7.5),8*scale,15*scale);ctx.strokeStyle='#ffffff18';ctx.beginPath();ctx.moveTo(px(0),pad);ctx.lineTo(px(0),size-pad);ctx.moveTo(pad,py(0));ctx.lineTo(size-pad,py(0));ctx.stroke();
  // Collision silhouettes give the player an actual top-down map, not just radar dots.
  ctx.fillStyle='#9aa69b55';
  for(const b of collisionBoxes){const x=px(b.minX),y=py(b.minZ),w=Math.max(1,(b.maxX-b.minX)*scale),h=Math.max(1,(b.maxZ-b.minZ)*scale);ctx.fillRect(x,y,w,h);}
  ctx.fillStyle='#d6b36e';ctx.font='bold 8px system-ui';ctx.fillText('WET GROUND',px(-5),py(-39));
  ctx.strokeStyle='#45d4df';ctx.lineWidth=1.4;ctx.strokeRect(px(-11.5),py(13),23*scale,22*scale);ctx.fillStyle='#45d4df';ctx.font='bold 7px system-ui';ctx.fillText('BIOSECURE / SERVER',px(-10),py(15));ctx.fillStyle='#e6b44f';ctx.fillRect(px(-1.8),py(22.2),3.6*scale,3.6*scale);
  ctx.fillStyle='#a75c4d';ctx.fillRect(px(-11),py(-41),22*scale,1.5*scale);
  ctx.fillStyle='#527b9c';ctx.fillRect(px(-11),py(33),22*scale,1.5*scale);
  for(const bot of state.bots){if(!bot.alive)continue;ctx.beginPath();ctx.fillStyle=bot.team==='ally'?'#73b9e8':'#ed7468';ctx.arc(px(bot.root.position.x),py(bot.root.position.z),2.7,0,Math.PI*2);ctx.fill();}
  const x=px(camera.position.x),y=py(camera.position.z),angle=camera.rotation.y;
  ctx.save();ctx.translate(x,y);ctx.rotate(Math.PI+angle);ctx.fillStyle='#fff';ctx.strokeStyle='#101820';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(4.5,5);ctx.lineTo(0,3);ctx.lineTo(-4.5,5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  ctx.fillStyle='#d9e3df';ctx.font='bold 8px system-ui';ctx.fillText('MAP',size/2-9,7);
}
function updatePlayer(dt) {
  if(state.playerDead||!state.started)return;
  const forward=(state.keys.has('KeyW')?1:0)-(state.keys.has('KeyS')?1:0)-state.joy.y;
  const strafe=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0)+state.joy.x;
  const len=Math.hypot(forward,strafe)||1, speed=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight')?6.3:4.6)*dt;
  const yaw=camera.rotation.y;
  // Babylon cameras look down local -Z; movement must use the same forward vector.
  const movement=cameraRelativeMovement(yaw,forward/len,strafe/len);
  const before={x:camera.position.x,z:camera.position.z};
  const resolved=moveWithAabbCollisions(camera.position,{x:movement.x*speed,z:movement.z*speed},collisionBoxes,.36,1.72,.10,collisionIndex);
  camera.position.x=resolved.x;camera.position.z=resolved.z;
  state.lastMove={requested:{x:+(movement.x*speed).toFixed(4),z:+(movement.z*speed).toFixed(4)},actual:{x:+(camera.position.x-before.x).toFixed(4),z:+(camera.position.z-before.z).toFixed(4)},blockedX:resolved.blockedX,blockedZ:resolved.blockedZ,blockedBy:resolved.blockedBy};
  if((resolved.blockedX||resolved.blockedZ)&&!state.lastMoveWasBlocked)gameLogEvent('player-collision',state.lastMove);
  state.lastMoveWasBlocked=!!(resolved.blockedX||resolved.blockedZ);
  camera.position.x=Math.max(-53,Math.min(53,camera.position.x));camera.position.z=Math.max(-42,Math.min(42,camera.position.z));
  if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));
}
async function enterImmersiveMode(){
  // Browsers require a real user gesture before fullscreen/orientation lock.
  try{
    if(!document.fullscreenElement){
      const request=document.documentElement.requestFullscreen?.({navigationUI:'hide'});
      if(request)await request;
    }
  }catch(error){console.info('Fullscreen request was blocked by the browser',error)}
  try{
    if(screen.orientation?.lock)await screen.orientation.lock('landscape');
  }catch(error){console.info('Landscape lock is unavailable in this browser context',error)}
}
function toggleFullscreen(){
  if(!document.fullscreenElement)void enterImmersiveMode();
  else document.exitFullscreen?.().catch(()=>{});
}
function endRound(won,reason='ROUND COMPLETE'){
  if(state.roundEnding)return;
  state.roundEnding=true;state.roundEndAt=performance.now()+5200;state.playerDead=true;state.started=false;state.paused=false;state.firing=false;state.reloading=false;
  $('spectatorHud').hidden=true;$('weaponBar').style.display='none';
  const winnerTeam=won?state.playerTeam:(state.playerTeam==='CT'?'T':'CT');
  $('roundWinner').textContent=winnerTeam==='CT'?'COUNTER-TERRORISTS WIN':'TERRORISTS WIN';
  $('roundWinner').dataset.winner=winnerTeam;
  $('roundReason').textContent=reason==='TIME EXPIRED'?'ВРЕМЯ РАУНДА ИСТЕКЛО':reason==='TEAM ELIMINATED'?'КОМАНДА УНИЧТОЖЕНА':reason==='ALL ENEMIES ELIMINATED'?'ВСЕ ПРОТИВНИКИ УСТРАНЕНЫ':reason;
  $('roundCountdown').textContent='СЛЕДУЮЩИЙ РАУНД ЧЕРЕЗ 5';
  $('roundEnd').hidden=false;
  gameLogEvent('round-ended',{winner:winnerTeam,playerTeam:state.playerTeam,won,reason,round:state.roundNumber,kills:state.kills});
  startButton.disabled=true;
}
function start() {
  const resuming=state.paused&&!state.playerDead;
  state.roundEnding=false;$('roundEnd').hidden=true;
  if(state.playerDead){
    state.hp=100;state.weaponAmmo={rifle:30,pistol:12};state.weaponReserve={rifle:90,pistol:48};state.kills=0;state.roundTime=180;state.simTime=0;state.aiAccumulator=0;state.playerDead=false;state.reloading=false;state.spectatorBotId=null;$('spectatorHud').hidden=true;$('weaponBar').style.display='';for(const p of state.projectiles)p.mesh.dispose();state.projectiles.length=0;
    for(const bot of state.bots){bot.health=100;bot.ammo=30;bot.reserve=90;bot.pistolAmmo=12;bot.pistolReserve=36;bot.reloadUntil=0;bot.fireAt=0;bot.meleeUntil=0;bot.target=null;bot.alive=true;bot.root.setEnabled(true);bot.waypoints=bot.baseWaypoints.map(p=>p.slice());bot.routeCompleted=false;bot.index=0;bot.deadAt=0;bot.root.position.set(bot.spawn.x,0,bot.spawn.z);bot.root.rotation.set(0,0,0);bot.body.isPickable=true;bot.head.isPickable=true;bot.navPath=[];bot.navIndex=0;bot.navGoal=null;bot.repathAt=0;bot.combatState='patrol';bot.stuckSince=0;bot.lastProgressX=bot.spawn.x;bot.lastProgressZ=bot.spawn.z;bot.lastProgressAt=performance.now();bot.pathFailures=0;}
    $('health').textContent='HP 100';$('ammo').textContent=state.weaponSlot==='knife'?'MELEE':state.weaponAmmo[state.weaponSlot]+' / '+state.weaponReserve[state.weaponSlot];$('round').textContent='ROUND '+String(state.roundNumber).padStart(2,'0');$('kills').textContent='KILLS 0';$('timer').textContent='03:00';
    status.textContent='Графическое ядро готово. Запусти тестовую сцену.';startButton.textContent='ЗАПУСК';
  }
  if(!resuming){playerSpawn=findSafePlayerSpawn([getPlayerSpawn(state.playerTeam)],collisionBoxes,.36,1.72,0);if(!playerSpawn){status.textContent='Не удалось найти свободную точку появления. Матч не запущен.';overlay.style.display='flex';state.started=false;return;}state.spawnProtectedUntil=performance.now()+4000;for(const bot of state.bots.filter(b=>b.team==='ally'&&b.alive)){bot.combatState='patrol';bot.target=null;bot.navPath=[];bot.navGoal=null;bot.fieldExploreGoal=null;}applyLearnedRoutesToBots();}
  state.paused=false;state.started=true;overlay.style.display='none';
  // Diagnostics are player-controlled from the LOGS button.
  if(!resuming){camera.position.set(playerSpawn.x,1.72,playerSpawn.z);camera.rotation.set(0,state.playerTeam==='CT'?Math.PI:0,0);if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));gameLogEvent('player-spawn',{team:state.playerTeam,x:playerSpawn.x,z:playerSpawn.z,protectedMs:4000,alliesGuarding:false});}
  else gameLogEvent('game-resumed',{weapon:state.weaponSlot,position:{x:camera.position.x,z:camera.position.z}});
  if(!mobile)canvas.requestPointerLock?.();
}

const GAME_LOG_KEY='solo_engine_v2_gameplay_logs_v1';
const GAME_LOG_BRANCH='feature/solo-engine-v2';
const GAME_LOG_LIMIT=1200;
const GAME_LOG_EVENT_LIMIT=1200;
const GAME_FIELD_ATLAS_KEY='solo_engine_v2_field_atlas_v1';
const FIELD_MAP_ID='wet-ground-street-panorama-v2';
const FIELD_CELL_SIZE=3;
let fieldAtlas={mapId:FIELD_MAP_ID,visitedCells:{},unreachableCells:[],activeRoute:[],routes:[],coverSamples:[],lastPersistAt:0};
let fieldWalkableCells=null,fieldExploreLastPlan=0;
try{const atlas=JSON.parse(localStorage.getItem(GAME_FIELD_ATLAS_KEY)||'null');if(atlas?.mapId===FIELD_MAP_ID){fieldAtlas={...fieldAtlas,...atlas};fieldAtlas.visitedCells=fieldAtlas.visitedCells||{};fieldAtlas.unreachableCells=Array.isArray(fieldAtlas.unreachableCells)?fieldAtlas.unreachableCells:[];fieldAtlas.activeRoute=Array.isArray(fieldAtlas.activeRoute)?fieldAtlas.activeRoute.slice(-700):[];fieldAtlas.routes=Array.isArray(fieldAtlas.routes)?fieldAtlas.routes.slice(-30):[];fieldAtlas.coverSamples=Array.isArray(fieldAtlas.coverSamples)?fieldAtlas.coverSamples.slice(-350):[];fieldAtlas.lastPersistAt=0;}}catch(e){}
let gameLogRecording=false,gameLogUploading=false,gameLogRecords=[],gameLogEvents=[],gameLogFrameMs=[],gameLogRenderMs=[],gameLogStartedAt=0,gameLogLastSample=0,gameLogLastPersist=0;
let inputTraceInstalled=false;
const RUNTIME_DIAGNOSTICS_KEY='solo_engine_v2_runtime_diagnostics_v1';
let runtimeDiagnostics=[];
let renderFailureActive=false;
try{const saved=JSON.parse(localStorage.getItem(RUNTIME_DIAGNOSTICS_KEY)||'[]');if(Array.isArray(saved))runtimeDiagnostics=saved.slice(-100);}catch(e){}
function recordRuntimeDiagnostic(type,detail={}){
 const item={wall:new Date().toISOString(),t:Math.round(performance.now()),type,detail};
 runtimeDiagnostics.push(item);if(runtimeDiagnostics.length>100)runtimeDiagnostics.splice(0,runtimeDiagnostics.length-100);
 try{localStorage.setItem(RUNTIME_DIAGNOSTICS_KEY,JSON.stringify(runtimeDiagnostics));}catch(e){}
 if(gameLogRecording)gameLogEvent(type,detail);
}
let gameLogPerf={frames:0,hitches50:0,hitches100:0,hitches250:0,maxFrameMs:0,maxRenderMs:0};
let gameLogDbPromise=null,gameLogPersistPending=false,gameLogPersistAgain=false,gameLogRestoring=false;
function persistFieldAtlas(force=false){const now=performance.now();if(gameLogRecording){fieldAtlas.persistPending=true;return;}if(!force&&now-fieldAtlas.lastPersistAt<7000)return;fieldAtlas.lastPersistAt=now;fieldAtlas.persistPending=false;try{localStorage.setItem(GAME_FIELD_ATLAS_KEY,JSON.stringify({...fieldAtlas,activeRoute:fieldAtlas.activeRoute.slice(-700),routes:fieldAtlas.routes.slice(-30),coverSamples:fieldAtlas.coverSamples.slice(-350)}))}catch(e){console.warn('Field atlas save failed',e);}}
function fieldCellAt(x,z){const ix=Math.max(0,Math.min(35,Math.floor((x+53)/FIELD_CELL_SIZE))),iz=Math.max(0,Math.min(27,Math.floor((z+42)/FIELD_CELL_SIZE)));return {ix,iz,key:ix+','+iz,x:-53+(ix+.5)*FIELD_CELL_SIZE,z:-42+(iz+.5)*FIELD_CELL_SIZE};}
function fieldPointWalkable(x,z,radius=.52){for(const c of collisionBoxes){if(c.maxY<=.04||c.minY>=1.68)continue;const nx=Math.max(c.minX,Math.min(x,c.maxX)),nz=Math.max(c.minZ,Math.min(z,c.maxZ));const dx=x-nx,dz=z-nz;if(dx*dx+dz*dz<radius*radius)return false;}return true;}
function buildFieldWalkableCells(){if(fieldWalkableCells)return fieldWalkableCells;fieldWalkableCells=[];for(let ix=0;ix<36;ix++)for(let iz=0;iz<28;iz++){const x=-53+(ix+.5)*FIELD_CELL_SIZE,z=-42+(iz+.5)*FIELD_CELL_SIZE;if(fieldPointWalkable(x,z))fieldWalkableCells.push({ix,iz,key:ix+','+iz,x,z});}return fieldWalkableCells;}
function fieldCoverageStats(){const walkable=buildFieldWalkableCells(),visited=walkable.filter(c=>fieldAtlas.visitedCells[c.key]).length;return {walkableCells:walkable.length,visitedCells:visited,unreachableCells:fieldAtlas.unreachableCells.length,percent:walkable.length?+(visited/walkable.length*100).toFixed(1):0,routeCount:fieldAtlas.routes.length,routePoints:fieldAtlas.routes.reduce((n,r)=>n+(r.points?.length||0),0),coverSamples:fieldAtlas.coverSamples.length};}
function chooseFieldExploreGoal(bot,now){
 if(bot.fieldExploreGoal&&!fieldAtlas.visitedCells[bot.fieldExploreGoal.key]&&now<(bot.fieldExploreUntil||0)){bot.combatState='explore';if(!bot.navPath?.length){const path=findPathAStar(bot.root.position,{x:bot.fieldExploreGoal.x,z:bot.fieldExploreGoal.z},navigationGrid,.38,1.5);bot.navPath=path;bot.navIndex=0;bot.navGoal={x:bot.fieldExploreGoal.x,z:bot.fieldExploreGoal.z};}return bot.fieldExploreGoal;}
 if(now-fieldExploreLastPlan<1600)return bot.fieldExploreGoal||null;
 fieldExploreLastPlan=now;const visited=fieldAtlas.visitedCells,unreachable=new Set(fieldAtlas.unreachableCells),here=bot.root.position;
 const candidates=buildFieldWalkableCells().filter(c=>!visited[c.key]&&!unreachable.has(c.key));candidates.sort((a,b)=>Math.hypot(a.x-here.x,a.z-here.z)-Math.hypot(b.x-here.x,b.z-here.z));
 for(const cell of candidates.slice(0,12).sort(()=>Math.random()-.5)){const distance=Math.hypot(cell.x-here.x,cell.z-here.z),path=findPathAStar(here,{x:cell.x,z:cell.z},navigationGrid,.38,1.5);if(path.length===1&&distance>1.8){fieldAtlas.unreachableCells.push(cell.key);if(fieldAtlas.unreachableCells.length>1200)fieldAtlas.unreachableCells.shift();continue;}bot.combatState='explore';bot.fieldExploreGoal=cell;bot.fieldExploreUntil=now+18000;bot.navPath=path;bot.navIndex=0;bot.navGoal={x:cell.x,z:cell.z};bot.repathAt=now+18000;gameLogEvent('field-exploration-target',{botId:bot.id,cell:cell.key,x:cell.x,z:cell.z,pathNodes:path.length});return cell;}
 bot.combatState='exploration-review';bot.fieldExploreGoal=null;gameLogEvent('field-exploration-frontier-empty',{coverage:fieldCoverageStats()});persistFieldAtlas(true);return null;
}
function recordFieldDeveloperPosition(bot,now){
 if(!gameLogRecording||!state.started||!bot?.alive)return;const p=bot.root.position,cell=fieldCellAt(p.x,p.z),firstVisit=!fieldAtlas.visitedCells[cell.key];
 if(firstVisit){fieldAtlas.visitedCells[cell.key]={x:+p.x.toFixed(2),z:+p.z.toFixed(2),round:Math.floor(state.simTime/180)+1,at:new Date().toISOString()};gameLogEvent('field-map-cell-visited',{cell:cell.key,x:cell.x,z:cell.z,coverage:fieldCoverageStats()});}
 const last=fieldAtlas.activeRoute[fieldAtlas.activeRoute.length-1];if(!last||Math.hypot(p.x-last.x,p.z-last.z)>=.78||now-last.ms>2600){fieldAtlas.activeRoute.push({x:+p.x.toFixed(2),z:+p.z.toFixed(2),yaw:+bot.root.rotation.y.toFixed(3),ms:Math.round(now),state:bot.combatState,round:Math.floor(state.simTime/180)+1});if(fieldAtlas.activeRoute.length>700)fieldAtlas.activeRoute.shift();}
 if(now-(bot.fieldLastCoverScan||0)>1100){bot.fieldLastCoverScan=now;let nearest=null,nearestDistance=Infinity;for(const c of collisionBoxes){if(c.maxY<=.04||c.minY>=1.68)continue;const dx=Math.max(c.minX-p.x,0,p.x-c.maxX),dz=Math.max(c.minZ-p.z,0,p.z-c.maxZ),d=Math.hypot(dx,dz);if(d<nearestDistance){nearestDistance=d;nearest=c;}}if(nearest&&nearestDistance<2.25&&(bot.target||bot.combatState==='fire'||bot.blockedLogged)){let occluded=false,occlusionMesh=null;if(bot.target){const targetBot=bot.target.kind==='bot'?bot.target.bot:null,target=bot.target.kind==='player'?camera.position:targetBot?.root.position;if(target){const targetOrigin=new BABYLON.Vector3(target.x,1.35,target.z),aim=new BABYLON.Vector3(p.x,1.1,p.z),delta=aim.subtract(targetOrigin),length=delta.length(),direction=delta.normalizeToNew(),origin=targetOrigin.add(direction.scale(.72)),ray=new BABYLON.Ray(origin,direction,Math.max(.01,length-.72)),hit=scene.pickWithRay(ray,m=>m&&m.isPickable&&m.name!=='player-hitbox'&&!m.name.startsWith('body-'+bot.id)&&!m.name.startsWith('head-'+bot.id)&&(!targetBot||(!m.name.startsWith('body-'+targetBot.id)&&!m.name.startsWith('head-'+targetBot.id))));occluded=!!hit?.hit;occlusionMesh=hit?.pickedMesh?.name||null;}}const duplicate=fieldAtlas.coverSamples.some(c=>c.obstacle===nearest.name&&Math.hypot(c.x-p.x,c.z-p.z)<1.35);if(!duplicate){fieldAtlas.coverSamples.push({x:+p.x.toFixed(2),z:+p.z.toFixed(2),obstacle:nearest.name,distance:+nearestDistance.toFixed(2),occluded,occlusionMesh,combatState:bot.combatState,round:Math.floor(state.simTime/180)+1});if(fieldAtlas.coverSamples.length>350)fieldAtlas.coverSamples.shift();gameLogEvent('field-cover-observed',{obstacle:nearest.name,distance:+nearestDistance.toFixed(2),occluded});}}}
 if(firstVisit||!last||Math.hypot(p.x-last.x,p.z-last.z)>=.78)persistFieldAtlas();
}
function finalizeFieldRoute(){const points=fieldAtlas.activeRoute.slice();if(points.length>=4){fieldAtlas.routes.push({id:'route-'+Date.now().toString(36),mapId:FIELD_MAP_ID,team:state.playerTeam,round:Math.floor(state.simTime/180)+1,points:points.slice(-350)});if(fieldAtlas.routes.length>30)fieldAtlas.routes.shift();gameLogEvent('field-route-saved',{points:points.length,routes:fieldAtlas.routes.length});}fieldAtlas.activeRoute=[];persistFieldAtlas(true);}
function applyLearnedRoutesToBots(){const routes=fieldAtlas.routes.filter(r=>r.mapId===FIELD_MAP_ID&&r.points?.length>=8);if(!routes.length)return;for(const bot of state.bots){const route=routes[Math.floor(Math.random()*routes.length)],points=route.points;let nearest=0,best=Infinity;for(let i=0;i<points.length;i++){const d=Math.hypot(points[i].x-bot.root.position.x,points[i].z-bot.root.position.z);if(d<best){best=d;nearest=i;}}const reverse=bot.faction!==route.team?nearest>0:Math.random()<.35,seq=reverse?points.slice(0,nearest+1).reverse():points.slice(nearest),selected=seq.filter((p,i)=>i===0||Math.hypot(p.x-seq[i-1].x,p.z-seq[i-1].z)>.45);if(selected.length>=4){bot.waypoints=selected.slice(0,100).map(p=>[p.x,p.z]);bot.index=0;bot.navPath=[];bot.navGoal=null;bot.learnedRouteId=route.id;gameLogEvent('ai-learned-route-assigned',{botId:bot.id,routeId:route.id,points:bot.waypoints.length,reverse});}}}
function appendBoundedLog(array,value,limit,trimBatch=32){array.push(value);if(array.length>limit+trimBatch)array.splice(0,array.length-limit);}
function openGameLogDb(){
 if(gameLogDbPromise)return gameLogDbPromise;
 gameLogDbPromise=new Promise(resolve=>{
  if(!('indexedDB' in window)){resolve(null);return;}
  let request;try{request=indexedDB.open('solo-wet-ground-diagnostics',1)}catch(e){resolve(null);return}
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('sessions'))db.createObjectStore('sessions',{keyPath:'id'});};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>resolve(null);
  request.onblocked=()=>resolve(null);
 });
 return gameLogDbPromise;
}
async function persistGameLog(){
 if(gameLogPersistPending){gameLogPersistAgain=true;return;}
 gameLogPersistPending=true;
 try{
  const db=await openGameLogDb();if(!db)return;
  const snapshot={id:'active',records:gameLogRecords.slice(),events:gameLogEvents.slice(),frameMs:gameLogFrameMs.slice(),renderMs:gameLogRenderMs.slice(),performance:{...gameLogPerf},startedAt:gameLogStartedAt,savedAt:Date.now()};
  await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').put(snapshot);tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('IndexedDB transaction aborted'));});
 }catch(e){console.warn('Async gameplay log persistence failed',e)}
 finally{gameLogPersistPending=false;if(gameLogPersistAgain){gameLogPersistAgain=false;void persistGameLog()}}
}
async function restoreGameplayLog(){
 if(gameLogRestoring||gameLogRecording)return;gameLogRestoring=true;
 try{
  const db=await openGameLogDb();if(!db)return;
  const saved=await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readonly'),request=tx.objectStore('sessions').get('active');request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);});
  if(saved&&!gameLogRecording){gameLogRecords=Array.isArray(saved.records)?saved.records.slice(-GAME_LOG_LIMIT):[];gameLogEvents=Array.isArray(saved.events)?saved.events.slice(-GAME_LOG_EVENT_LIMIT):[];gameLogFrameMs=Array.isArray(saved.frameMs)?saved.frameMs.slice(-240):[];gameLogRenderMs=Array.isArray(saved.renderMs)?saved.renderMs.slice(-240):[];gameLogPerf={...gameLogPerf,...(saved.performance||{})};gameLogStartedAt=saved.startedAt||0;}
 }catch(e){console.warn('Gameplay log restore failed',e)}
 finally{gameLogRestoring=false;updateLogStatus()}
}
async function clearPersistedGameLog(){
 try{const db=await openGameLogDb();if(!db)return;await new Promise((resolve,reject)=>{const tx=db.transaction('sessions','readwrite');tx.objectStore('sessions').delete('active');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});}catch(e){console.warn('Could not clear uploaded log snapshot',e)}
}
function gameLogEvent(type,detail={}){
 if(!gameLogRecording)return;
 appendBoundedLog(gameLogEvents,{t:Math.round(performance.now()),wall:new Date().toISOString(),type,detail},GAME_LOG_EVENT_LIMIT);
}
function captureGameplayLog(dt,now){
 if(!gameLogRecording)return;
 const ms=Math.max(0,dt*1000),renderMs=Math.max(0,state.lastRenderMs||0);gameLogPerf.frames++;
 if(ms>50)gameLogPerf.hitches50++;if(ms>100)gameLogPerf.hitches100++;if(ms>250)gameLogPerf.hitches250++;
 gameLogPerf.maxFrameMs=Math.max(gameLogPerf.maxFrameMs,ms);gameLogPerf.maxRenderMs=Math.max(gameLogPerf.maxRenderMs,renderMs);
 appendBoundedLog(gameLogFrameMs,+ms.toFixed(2),240);
 appendBoundedLog(gameLogRenderMs,+renderMs.toFixed(2),240);
 if(now-gameLogLastSample<1500)return;gameLogLastSample=now;
 const bots=state.bots.map(b=>({id:b.id,team:b.team,alive:b.alive,hp:b.health,x:+b.root.position.x.toFixed(2),y:+b.root.position.y.toFixed(2),z:+b.root.position.z.toFixed(2),rotation:+b.root.rotation.y.toFixed(3),waypoint:b.index}));
 appendBoundedLog(gameLogRecords,{t:Math.round(now-gameLogStartedAt),wall:new Date().toISOString(),playing:state.started,player:{x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3),yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3),hp:state.hp,dead:state.playerDead},weapon:{slot:state.weaponSlot,ammo:state.weaponAmmo[state.weaponSlot],reserve:state.weaponReserve[state.weaponSlot],reloading:state.reloading,firing:state.firing},round:{time:+state.roundTime.toFixed(2),kills:state.kills},bots,projectiles:state.projectiles.length,renderer:{fps:state.fps,scale:state.scale,hardwareScaling:engine.getHardwareScalingLevel(),renderMs:+renderMs.toFixed(2),canvas:{width:canvas.width,height:canvas.height},activeMeshes:scene.getActiveMeshes().length,totalMeshes:scene.meshes.length,mapStats:window.__SOLO_MAP_STATS__||null},ai:{bots:state.bots.map(b=>({id:b.id,team:b.team,state:b.combatState,target:b.target?.kind==='bot'?b.target.bot.id:b.target?.kind||null,navNodes:b.navPath.length-b.navIndex})),aimTargetId:state.aimTargetId},movement:state.lastMove,frameMs:+ms.toFixed(2)},GAME_LOG_LIMIT);
 if(now-gameLogLastPersist>10000){gameLogLastPersist=now;void persistGameLog();updateLogStatus()}
}
function installInputDiagnostics(){
 if(inputTraceInstalled)return;inputTraceInstalled=true;
 const watched='#fire,#weaponBar [data-weapon],#renderCanvas,#reload';
 for(const type of ['pointerdown','pointerup','pointercancel','click','mousedown','mouseup','touchstart','touchend'])document.addEventListener(type,e=>{
  const target=e.target?.closest?.(watched);if(!target)return;
  gameLogEvent('input-event',{type,target:target.id||target.dataset.weapon||target.tagName,pointerType:e.pointerType||null,pointerId:Number.isFinite(e.pointerId)?e.pointerId:null,button:Number.isFinite(e.button)?e.button:null,detail:e.detail??null,x:Number.isFinite(e.clientX)?Math.round(e.clientX):null,y:Number.isFinite(e.clientY)?Math.round(e.clientY):null,isTrusted:e.isTrusted,defaultPrevented:e.defaultPrevented,buttons:e.buttons??null});
 },true);
}
function startGameplayLog(){installInputDiagnostics();gameLogRecords=[];gameLogEvents=[];gameLogFrameMs=[];gameLogRenderMs=[];gameLogPerf={frames:0,hitches50:0,hitches100:0,hitches250:0,maxFrameMs:0,maxRenderMs:0};gameLogStartedAt=performance.now();gameLogLastSample=0;gameLogLastPersist=0;gameLogRecording=true;gameLogEvent('recording-start',{userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},mobile});void persistGameLog();$('logsQuick').textContent='■ ЗАПИСЬ';$('logsQuick').title='Запись идёт';updateLogStatus();}
function encodeGameplayLog(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}

function updateLogStatus(){
 const el=$('logsStatus');if(!el)return;
 const estimatedBytes=gameLogRecords.length*520+gameLogEvents.length*180+(gameLogFrameMs.length+gameLogRenderMs.length)*8;
 el.textContent=(gameLogRecording?'● ЗАПИСЬ ИДЁТ':'○ ЗАПИСЬ ОСТАНОВЛЕНА')+' · '+gameLogRecords.length+' срезов · '+gameLogEvents.length+' событий · ~'+Math.round(estimatedBytes/1024)+' КБ · '+gameLogPerf.frames+' кадров';
 const start=$('logsStart');if(start)start.textContent=gameLogRecording?'ОСТАНОВИТЬ ЗАПИСЬ':'НАЧАТЬ ЗАПИСЬ';
}
function buildGameplayLogPayload(){
 return {app:'SOLO: Wet Ground',format:3,session:'v2-'+Date.now().toString(36),branch:GAME_LOG_BRANCH,createdAt:new Date().toISOString(),durationMs:gameLogStartedAt?Math.max(0,Math.round(performance.now()-gameLogStartedAt)):0,userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},runtimeDiagnostics:runtimeDiagnostics.slice(-100),performance:{...gameLogPerf,frameMs:gameLogFrameMs,renderMs:gameLogRenderMs,averageFrameMs:gameLogFrameMs.length?+(gameLogFrameMs.reduce((a,b)=>a+b,0)/gameLogFrameMs.length).toFixed(2):null,averageRenderMs:gameLogRenderMs.length?+(gameLogRenderMs.reduce((a,b)=>a+b,0)/gameLogRenderMs.length).toFixed(2):null},fieldAtlas:{...fieldAtlas,coverage:scene?fieldCoverageStats():null},events:gameLogEvents,records:gameLogRecords};
}
function downloadGameplayLog(){
 const payload=buildGameplayLogPayload(),blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='solo-wet-ground-'+new Date().toISOString().replace(/[:.]/g,'-')+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
 updateLogStatus();
}
function savedGameplayToken(){try{return localStorage.getItem('solo_github_log_token')||''}catch(e){return ''}}
async function stopAndUploadGameplayLog(){
 if(gameLogUploading)return;
 gameLogEvent('recording-stop',{records:gameLogRecords.length,events:gameLogEvents.length});gameLogRecording=false;persistFieldAtlas(true);void persistGameLog();
 if(!gameLogRecords.length&&!gameLogEvents.length){$('logsQuick').textContent='● ЛОГИ';return}
 let token=savedGameplayToken();
 if(!token){token=prompt('Для отправки нужен Fine-grained GitHub token для desdesyo/CSS-Bot-Community с Contents: Read and write. Токен сохранится только в этом браузере.');if(!token){$('logsQuick').textContent='↻ ПОВТОРИТЬ ОТПРАВКУ';return}token=token.trim();if(!token)return;try{localStorage.setItem('solo_github_log_token',token)}catch(e){alert('Не удалось сохранить токен в браузере');return}}
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'),session='v2-'+Date.now().toString(36),path='logs/gameplay/'+stamp+'-'+session+'-game-diagnostics.json';
 const payload=buildGameplayLogPayload();
 gameLogUploading=true;const btn=$('logsQuick');btn.disabled=true;btn.textContent='ОТПРАВКА…';
 try{
  const response=await fetch('https://api.github.com/repos/desdesyo/CSS-Bot-Community/contents/'+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message:'Add SOLO: Wet Ground gameplay diagnostics',content:encodeGameplayLog(JSON.stringify(payload)),branch:GAME_LOG_BRANCH})});
  const result=await response.json();if(!response.ok){if(response.status===401||response.status===403){try{localStorage.removeItem('solo_github_log_token')}catch(e){}throw new Error('GitHub отклонил токен или права ('+response.status+'). Токен удалён из браузера.')}throw new Error(result.message||('GitHub API HTTP '+response.status))}
  gameLogRecords=[];gameLogEvents=[];gameLogFrameMs=[];gameLogRenderMs=[];await clearPersistedGameLog();btn.textContent='● ЛОГИ';btn.title='Начать новую запись';updateLogStatus();alert('Логи успешно отправлены в GitHub: '+path);
 }catch(error){btn.textContent='↻ ПОВТОРИТЬ ОТПРАВКУ';btn.title='Логи сохранены локально; нажми для повтора';updateLogStatus();console.error('Gameplay log upload failed',error);alert('Не удалось отправить логи: '+error.message+'\nЗапись сохранена в браузере.')}
 finally{gameLogUploading=false;btn.disabled=false}
}

let issueReportBusy=false;
function collectIssueSceneContext(){
 const hit=scene.pick(canvas.width/2,canvas.height/2,m=>m.isEnabled()&&m.isVisible&&m.name!=='player-hitbox'&&!m.isDescendantOf?.(camera));
 const picked=hit?.hit?hit.pickedMesh:null;
 const visibleMeshes=[];
 const meshBreakdown={viewmodel:0,soldierModels:0,botWeapons:0,world:0};
 for(const mesh of scene.meshes){
  if(!mesh||mesh.isDisposed?.())continue;
  if(mesh.isDescendantOf?.(camera))meshBreakdown.viewmodel++;
  else if(mesh.name?.startsWith('soldier-'))meshBreakdown.soldierModels++;
  else if(mesh.name?.startsWith('bot '))meshBreakdown.botWeapons++;
  else meshBreakdown.world++;
  if(!mesh||mesh===scene.activeCamera||!mesh.isEnabled()||!mesh.isVisible||mesh.visibility===0||mesh.name==='player-hitbox'||mesh.isDescendantOf?.(camera))continue;
  let p;try{p=mesh.getBoundingInfo().boundingSphere.centerWorld}catch(e){continue}
  const d=BABYLON.Vector3.Distance(camera.position,p);
  if(d<18)visibleMeshes.push({name:mesh.name,type:mesh.getClassName?.()||'Mesh',distance:+d.toFixed(2),position:{x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2)},visible:mesh.isVisible,visibility:mesh.visibility,material:mesh.material?.name||null,materialAlpha:mesh.material?.alpha??null,checkCollisions:!!mesh.checkCollisions,enabled:mesh.isEnabled()});
 }
 visibleMeshes.sort((a,b)=>a.distance-b.distance);
 return {collision:{system:'swept-aabb-circle',playerRadius:.36,playerHeight:1.72,colliderCount:collisionBoxes.length,lastMove:state.lastMove,colliders:collisionBoxes.slice(0,80).map(c=>({name:c.name,min:{x:c.minX,y:c.minY,z:c.minZ},max:{x:c.maxX,y:c.maxY,z:c.maxZ}}))},camera:{position:{x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3)},rotation:{x:+camera.rotation.x.toFixed(4),y:+camera.rotation.y.toFixed(4),z:+camera.rotation.z.toFixed(4)},fov:camera.fov,minZ:camera.minZ,maxZ:camera.maxZ},player:{hp:state.hp,dead:state.playerDead,weapon:state.weaponSlot},centerRay:{hit:!!hit?.hit,mesh:picked?.name||null,distance:hit?.distance??null,point:hit?.pickedPoint?{x:+hit.pickedPoint.x.toFixed(3),y:+hit.pickedPoint.y.toFixed(3),z:+hit.pickedPoint.z.toFixed(3)}:null},nearbyMeshes:visibleMeshes.slice(0,80),bots:state.bots.map(b=>({id:b.id,team:b.team,alive:b.alive,position:{x:+b.root.position.x.toFixed(2),y:+b.root.position.y.toFixed(2),z:+b.root.position.z.toFixed(2)}})),scene:{meshCount:scene.meshes.length,activeCamera:scene.activeCamera?.name||null,mapStats:window.__SOLO_MAP_STATS__||null,meshBreakdown,activeMeshes:scene.getActiveMeshes?.().length??null,particleSystems:scene.particleSystems?.length??0,renderFps:Math.round(engine.getFps?.()||0),engine:{width:engine.getRenderWidth(),height:engine.getRenderHeight()},canvas:{width:canvas.width,height:canvas.height}}};
}
async function captureIssueScreenshot(){
 try{
  const size={width:Math.min(1280,Math.max(640,canvas.clientWidth)),height:Math.min(960,Math.max(360,canvas.clientHeight))};
  const tools=BABYLON.Tools;
  if(typeof tools.CreateScreenshotUsingRenderTargetAsync==='function'){
   const url=await tools.CreateScreenshotUsingRenderTargetAsync(engine,camera,size,'image/png');
   if(url&&url.startsWith('data:image/png;base64,')&&url.length>5000)return url.split(',')[1];
  }
  const fallback=canvas.toDataURL('image/png');if(fallback&&fallback.startsWith('data:image/png;base64,')&&fallback.length>5000)return fallback.split(',')[1];
 }catch(error){console.warn('Issue screenshot capture failed',error)}
 return null;
}
async function uploadIssueFile(path,content,message,token){
 const response=await fetch('https://api.github.com/repos/desdesyo/CSS-Bot-Community/contents/'+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message,content,branch:GAME_LOG_BRANCH})});
 const result=await response.json();if(!response.ok){if(response.status===401||response.status===403){try{localStorage.removeItem('solo_github_log_token')}catch(e){}throw new Error('GitHub отклонил токен или права ('+response.status+').')}throw new Error(result.message||('GitHub API HTTP '+response.status))}
 return result;
}
async function submitIssueReport(){
 if(issueReportBusy)return;
 const description=prompt('Что именно здесь не так? Например: невидимая стена, текстура, прозрачная стена, непроходимый проход. Можно оставить пустым.');
 if(description===null)return;
 // Request credentials while the click still has user activation. Mobile browsers may
 // suppress prompt() after an awaited screenshot operation.
 let token=savedGameplayToken();
 if(!token){token=prompt('Для отправки отчёта нужен Fine-grained GitHub token для desdesyo/CSS-Bot-Community с Contents: Read and write.');if(!token)return;token=token.trim();if(!token)return;try{localStorage.setItem('solo_github_log_token',token)}catch(e){alert('Не удалось сохранить токен');return}}
 const context=scene&&camera?collectIssueSceneContext():{startup:{engineReady:!!engine,sceneReady:!!scene,cameraReady:!!camera,canvas:{width:canvas?.width||0,height:canvas?.height||0}},mapStats:window.__SOLO_MAP_STATS__||null},screenshot=scene&&camera?await captureIssueScreenshot():null,stamp=new Date().toISOString().replace(/[:.]/g,'-'),id='issue-'+Date.now().toString(36);
 const report={app:'SOLO: Wet Ground',type:'player-marked-visual-or-world-issue',id,runtimeDiagnostics:runtimeDiagnostics.slice(-100),createdAt:new Date().toISOString(),description:description.trim(),userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},game:{started:state.started,paused:state.paused??false,roundTime:state.roundTime,kills:state.kills,fps:state.fps,scale:state.scale},context,screenshot:{captured:!!screenshot,format:'image/png',path:screenshot?'logs/issues/'+stamp+'-'+id+'.png':null,error:screenshot?null:'Canvas screenshot unavailable (WebGL buffer may not be preserved)'},recentGameplayLog:{recording:gameLogRecording,records:gameLogRecords.slice(-30),events:gameLogEvents.slice(-40),performance:{...gameLogPerf,frameMs:gameLogFrameMs.slice(-120),renderMs:gameLogRenderMs.slice(-120)}}};
 issueReportBusy=true;const btn=$('issueQuick');btn.disabled=true;btn.textContent='СБОР…';
 try{
  const jsonPath='logs/issues/'+stamp+'-'+id+'.json';
  const jsonResult=await uploadIssueFile(jsonPath,encodeGameplayLog(JSON.stringify(report)),'Add player issue report '+id,token);
  let imagePath=null;
  if(screenshot){imagePath='logs/issues/'+stamp+'-'+id+'.png';await uploadIssueFile(imagePath,screenshot,'Add screenshot for '+id,token)}
  if(gameLogRecording)gameLogEvent('issue-marker',{id,description:description.trim(),jsonPath,imagePath});
  btn.textContent='✓ ОТПРАВЛЕНО';btn.title='Отчёт отправлен в GitHub';
  alert('Отчёт отправлен в GitHub.\n'+jsonPath+(imagePath?'\n'+imagePath:'\nСнимок экрана не удалось получить; отправлен контекст сцены.')+'\nCommit: '+(jsonResult.commit?.sha||'ok'));
 }catch(error){console.error('Issue report upload failed',error);btn.textContent='↻ ПОВТОРИТЬ ОТЧЁТ';alert('Не удалось отправить отчёт: '+error.message)}
 finally{issueReportBusy=false;btn.disabled=false}
}

function handleGameplayLogs(){if(gameLogUploading)return;if(gameLogRecording){gameLogEvent('recording-stop',{records:gameLogRecords.length,events:gameLogEvents.length});gameLogRecording=false;persistFieldAtlas(true);void persistGameLog();$('logsQuick').textContent='● ЛОГИ';$('logsQuick').title='Запись остановлена';updateLogStatus();}else startGameplayLog();}
function showMenuTab(tab){for(const button of document.querySelectorAll('[data-menu-tab]'))button.classList.toggle('active',button.dataset.menuTab===tab);for(const pane of document.querySelectorAll('.menuPane'))pane.classList.toggle('active',pane.id==='pane-'+tab);if(tab==='logs')updateLogStatus();}
function loadMenuSettings(){try{const s=JSON.parse(localStorage.getItem('solo_menu_settings_v1')||'{}');state.lookSensitivity=Math.max(.5,Math.min(2.5,Number(s.sensitivity)||1));const fov=Math.max(65,Math.min(100,Number(s.fov)||80));$('lookSensitivity').value=state.lookSensitivity;$('fieldOfView').value=fov;$('showMinimap').checked=s.minimap!==false;$('lookSensitivityValue').textContent=state.lookSensitivity.toFixed(2)+'×';$('fieldOfViewValue').textContent=fov+'°';if(camera)camera.fov=fov*Math.PI/180;$('minimap').style.display=s.minimap===false?'none':'';}catch(e){}}
function saveMenuSettings(){const settings={sensitivity:Number($('lookSensitivity').value),fov:Number($('fieldOfView').value),minimap:$('showMinimap').checked};state.lookSensitivity=settings.sensitivity;$('lookSensitivityValue').textContent=settings.sensitivity.toFixed(2)+'×';$('fieldOfViewValue').textContent=settings.fov+'°';if(camera)camera.fov=settings.fov*Math.PI/180;$('minimap').style.display=settings.minimap?'':'none';try{localStorage.setItem('solo_menu_settings_v1',JSON.stringify(settings))}catch(e){}}
function installMenuControls(){document.querySelectorAll('[data-menu-tab]').forEach(b=>b.addEventListener('click',()=>showMenuTab(b.dataset.menuTab)));$('lookSensitivity').addEventListener('input',saveMenuSettings);$('fieldOfView').addEventListener('input',saveMenuSettings);$('showMinimap').addEventListener('change',saveMenuSettings);$('logsStart').addEventListener('click',handleGameplayLogs);$('logsDownload').addEventListener('click',downloadGameplayLog);$('issueQuick').addEventListener('click',submitIssueReport);$('logsUpload').addEventListener('click',()=>{if(gameLogRecording){gameLogEvent('recording-stop',{records:gameLogRecords.length,events:gameLogEvents.length});gameLogRecording=false;persistFieldAtlas(true);void persistGameLog();}void stopAndUploadGameplayLog();});loadMenuSettings();void restoreGameplayLog();updateLogStatus();}
window.addEventListener('error',e=>recordRuntimeDiagnostic('window-error',{message:e.message,source:e.filename,line:e.lineno,column:e.colno,error:e.error?.stack||null}));
window.addEventListener('unhandledrejection',e=>recordRuntimeDiagnostic('unhandled-rejection',{reason:String(e.reason?.stack||e.reason)}));
window.addEventListener('webglcontextlost',e=>recordRuntimeDiagnostic('webgl-context-lost',{status:'lost'}),true);
window.addEventListener('webglcontextrestored',()=>recordRuntimeDiagnostic('webgl-context-restored'),true);
document.addEventListener('visibilitychange',()=>recordRuntimeDiagnostic('visibility',{state:document.visibilityState}));

async function boot() {
  try {
    installMenuControls();
    if(!window.BABYLON)throw new Error('Babylon.js CDN недоступен');
    const B=window.BABYLON;
    engine=new B.Engine(canvas,true,{preserveDrawingBuffer:false,stencil:false,antialias:true,powerPreference:'high-performance',audioEngine:false},true);
    engine.onContextLostObservable?.add(()=>recordRuntimeDiagnostic('engine-context-lost',{status:'lost'}));
    engine.onContextRestoredObservable?.add(()=>recordRuntimeDiagnostic('engine-context-restored',{status:'restored'}));
    applyRenderScale();
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.045,.075,.105,1);scene.ambientColor=new B.Color3(.16,.19,.23);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=mobile?.0028:.0022;scene.fogColor=new B.Color3(.105,.145,.18);
    scene.imageProcessingConfiguration.toneMappingEnabled=true;
    scene.imageProcessingConfiguration.toneMappingType=B.ImageProcessingConfiguration.TONEMAPPING_ACES;
    scene.imageProcessingConfiguration.exposure=1.22;scene.imageProcessingConfiguration.contrast=1.12;
    scene.imageProcessingConfiguration.vignetteEnabled=true;scene.imageProcessingConfiguration.vignetteWeight=.12;scene.imageProcessingConfiguration.vignetteColor=new B.Color4(.015,.03,.05,0);
    scene.environmentIntensity=mobile?.9:1.15;
    // Real image-based lighting supplies physically plausible highlights to wet stone,
    // glazing and metal while the hand-authored sky remains the visible atmosphere.
    try {
      const fallbackEnvironment=B.CubeTexture.CreateFromPrefilteredData('https://assets.babylonjs.com/environments/environmentSpecular.env',scene);
      fallbackEnvironment.gammaSpace=false;
      scene.environmentTexture=fallbackEnvironment;
      scene.environmentIntensity=mobile?.62:.88;
      // A real 360-degree night-street panorama supplies the reflection and ambient-light
      // character of wet European cobblestone streets; keep the compact studio map as fallback.
      if(B.HDRCubeTexture){
        const streetNightHdr=new B.HDRCubeTexture('https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/cobblestone_street_night_1k.hdr',scene,mobile?64:128,false,true,false,true);
        streetNightHdr.onLoadObservable.addOnce(()=>{
          streetNightHdr.rotationY=.42;
          scene.environmentTexture=streetNightHdr;
          scene.environmentIntensity=mobile?.52:.72;
          fallbackEnvironment.dispose();
        });
      }
    } catch(environmentError) {
      console.warn('SOLO environment reflections unavailable; direct lighting remains active.',environmentError);
    }
    camera=new B.UniversalCamera('fps-camera',new B.Vector3(0,1.72,-41),scene);scene.activeCamera=camera;scene.activeCameras=null;camera.layerMask=0xFFFFFFFF;camera.minZ=.08;camera.maxZ=180;camera.fov=1.04;camera.inertia=0;camera.angularSensibility=2400;camera.speed=0;camera.inputs.clear();
    // The map owns the textured skybox. A second giant solid sphere caused the
    // false black-ceiling look and competed with the horizon gradient.
    const hemi=new B.HemisphericLight('sky-fill',new B.Vector3(0,1,0),scene);hemi.intensity=.86;hemi.diffuse=new B.Color3(.42,.55,.72);hemi.groundColor=new B.Color3(.13,.16,.19);
    const sun=new B.DirectionalLight('moonlight',new B.Vector3(-.35,-1,.2),scene);sun.position=new B.Vector3(24,38,-18);sun.diffuse=new B.Color3(.52,.64,.82);sun.intensity=.58;
    const cityFill=new B.DirectionalLight('distant city sky bounce',new B.Vector3(.55,-.22,-.3),scene);cityFill.diffuse=new B.Color3(.27,.39,.48);cityFill.intensity=.24;
    shadowGen=new B.ShadowGenerator(mobile?1024:2048,sun);shadowGen.useBlurExponentialShadowMap=true;shadowGen.usePercentageCloserFiltering=true;shadowGen.blurKernel=mobile?12:22;shadowGen.bias=.0003;shadowGen.normalBias=.014;shadowGen.darkness=.22;
    enemyMaterial=mat('enemy uniform','#596c64',.88);allyMaterial=mat('friendly uniform','#526a83',.88);
    const mapBuildStats=buildWetGroundMap(B,scene,mobile,shadowGen);window.__SOLO_MAP_STATS__=mapBuildStats;
    // Imported and merged level meshes must share the full camera layer mask. Some
    // mobile/WebGL drivers otherwise leave the HUD visible while silently culling the world.
    for(const mesh of scene.meshes){if(mesh)mesh.layerMask=0xFFFFFFFF;}
    scene.activeCamera=camera;scene.activeCameras=null;
    const glowLayer=new B.GlowLayer('wet quarter emissive glow',scene,{blurKernelSize:mobile?16:32});glowLayer.intensity=mobile?.32:.48;
    window.__SOLO_GLOW_LAYER__=glowLayer;
    state.playerHitbox=B.MeshBuilder.CreateCapsule('player-hitbox',{height:1.25,radius:.34,tessellation:8},scene);state.playerHitbox.visibility=.001;state.playerHitbox.isVisible=true;state.playerHitbox.alwaysSelectAsActiveMesh=true;state.playerHitbox.isPickable=true;state.playerHitbox.position.copyFrom(camera.position).addInPlace(new B.Vector3(0,-.38,0));
    collisionBoxes=scene.metadata?.soloCollisionBoxes||scene.meshes.filter(m=>m&&m.checkCollisions&&m.isEnabled()&&m.isVisible).map(m=>{m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;return {name:m.name,minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minY:b.minimumWorld.y,maxY:b.maximumWorld.y,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z}});
    collisionIndex=buildCollisionSpatialIndex(collisionBoxes,8);navigationGrid=buildNavigationGrid(collisionBoxes,.38,1.5);
    playerSpawn=findSafePlayerSpawn([getPlayerSpawn(state.playerTeam)],collisionBoxes,.36,1.72,0);
    const initialSpawn=playerSpawn||getPlayerSpawn(state.playerTeam)||{x:0,z:-41};
    camera.position.set(initialSpawn.x,1.72,initialSpawn.z);
    if(!playerSpawn)recordRuntimeDiagnostic('initial-safe-spawn-unavailable',{team:state.playerTeam,authoredSpawn:initialSpawn});
    // Start rendering the map before network-bound soldier assets are awaited.
    // A failed/slow GLB request must never leave a fully-created scene unrendered.
    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now(),rawDt=Math.max(0,(now-last)/1000),dt=Math.min(.05,rawDt);last=now;
      if(state.started) {
        updatePlayer(dt);weaponViewmodel?.update(dt,Math.max(Math.hypot(state.joy.x,state.joy.y),state.keys.has('KeyW')||state.keys.has('KeyA')||state.keys.has('KeyS')||state.keys.has('KeyD')?1:0,(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight'))?1.25:0));resolvePlayerMeleeImpact();updateBulletPhysics(dt);updateBotMotion(dt);state.aiAccumulator+=dt;state.simTime+=dt;state.roundTime-=dt;
        if(state.firing&&now-state.lastShot>=105)fire();
        $('timer').textContent=String(Math.max(0,Math.ceil(state.roundTime/60))).padStart(2,'0')+':'+String(Math.max(0,Math.ceil(state.roundTime%60))).padStart(2,'0');
        const shieldSeconds=Math.max(0,Math.ceil((state.spawnProtectedUntil-now)/1000));$('safeStatus').textContent=shieldSeconds>0?'SAFE '+shieldSeconds:'';$('safeStatus').style.display=shieldSeconds>0?'inline-flex':'none';
        if(state.roundTime<=0)endRound(state.playerTeam==='CT','TIME EXPIRED');
        const aiTick=mobile?.32:.16;
        if(state.aiAccumulator>=aiTick){state.aiAccumulator%=aiTick;updateBotAI()}
        if(state.bots.every(b=>b.team!=='enemy'||!b.alive))endRound(true,'ALL ENEMIES ELIMINATED');
        if(state.playerDead&&!aliveAllies().length&&!state.roundEnding)endRound(false,'TEAM ELIMINATED');
        if(state.playerDead)updateSpectatorCamera();
      }
      if(state.roundEnding){const seconds=Math.max(0,Math.ceil((state.roundEndAt-now)/1000));$('roundCountdown').textContent=seconds>0?'СЛЕДУЮЩИЙ РАУНД ЧЕРЕЗ '+seconds:'ЗАГРУЗКА СЛЕДУЮЩЕГО РАУНДА';if(now>=state.roundEndAt){state.roundEnding=false;state.roundNumber++;$('roundEnd').hidden=true;start();}}
      if(state.started&&now-state.minimapAt>=120){drawMinimap();state.minimapAt=now;}
      captureGameplayLog(rawDt,now);
      state.frameSamples.push(Math.min(250,rawDt*1000));
      if(now-state.sampleAt>=2000){
        state.frameSamples.sort((a,b)=>a-b);const p95=state.frameSamples[Math.min(state.frameSamples.length-1,Math.floor(state.frameSamples.length*.95))]||16.7;
        const next=adaptiveScale(p95,state.scale,mobile);
        if(Math.abs(next-state.scale)>=.02){state.scale=next;applyRenderScale()}
        state.fps=Math.round(1000/(state.frameSamples.reduce((a,b)=>a+b,0)/Math.max(1,state.frameSamples.length)));
        $('fps').textContent=state.fps+' FPS';$('quality').textContent=(mobile?'MOBILE':'DESKTOP')+' · SCALE '+Math.round(state.scale*100)+'% · P95 '+Math.round(p95)+'ms';
        state.frameSamples.length=0;state.sampleAt=now;
      }
      const renderStarted=performance.now();
      try{scene.activeCamera=camera;scene.activeCameras=null;camera.layerMask=0xFFFFFFFF;try{for(const mesh of scene.meshes)if(mesh&&mesh.layerMask!==0xFFFFFFFF)mesh.layerMask=0xFFFFFFFF;}catch{}scene.render();state.lastRenderMs=performance.now()-renderStarted;if(renderFailureActive){renderFailureActive=false;recordRuntimeDiagnostic('render-recovered',{renderMs:+state.lastRenderMs.toFixed(2)});}}
      catch(error){state.lastRenderMs=performance.now()-renderStarted;recordRuntimeDiagnostic('scene-render-error',{message:String(error?.message||error),stack:error?.stack||null,meshCount:scene.meshes.length,activeCamera:scene.activeCamera?.name||null});if(activateSafeRenderFallback(error)){try{scene.render();state.lastRenderMs=performance.now()-renderStarted;recordRuntimeDiagnostic('renderer-safe-fallback-rendered',{renderMs:+state.lastRenderMs.toFixed(2)});return;}catch(retryError){recordRuntimeDiagnostic('renderer-safe-fallback-failed',{message:String(retryError?.message||retryError),stack:retryError?.stack||null});}}if(!renderFailureActive){renderFailureActive=true;$('quality').textContent='RENDER ERROR · ДИАГНОСТИКА СОХРАНЕНА';$('loadState').textContent='Ошибка отрисовки сцены: '+(error?.message||error);const failedOverlay=$('overlay');failedOverlay.dataset.engineState='error';failedOverlay.classList.remove('is-loading');failedOverlay.classList.add('is-error');failedOverlay.style.display='flex';}}
    });
    $('loadState').textContent='Карта отображается. Загрузка настоящих 3D-бойцов и анимаций…';
    humanBotAssets=await loadHumanBotAssets(B,scene);
    buildBots();buildPlayerWeapon();initInput();drawMinimap();
    window.addEventListener('resize',()=>engine.resize());
    const readyOverlay=$('overlay');if(readyOverlay){readyOverlay.dataset.engineState='ready';readyOverlay.classList.remove('is-loading','is-error');readyOverlay.style.display='flex';} $('start').disabled=false;$('loadState').textContent='Графическое ядро готово. Выбери сторону и запускай матч.';$('quality').textContent=mobile?'MOBILE PROFILE · TEXTURE QUALITY PRESERVED · PIXEL RATIO 1.25':'DESKTOP PROFILE · SHADOWS 2048';
    $('selectCT').addEventListener('click',()=>setPlayerTeam('CT'));$('selectT').addEventListener('click',()=>setPlayerTeam('T'));$('start').addEventListener('click',()=>{void enterImmersiveMode();start()});$('startFullscreen').addEventListener('click',()=>{void enterImmersiveMode()});

  } catch(error) { console.error(error);recordRuntimeDiagnostic('boot-error',{message:String(error?.message||error),stack:error?.stack||null});const failedOverlay=$('overlay');if(failedOverlay){failedOverlay.dataset.engineState='error';failedOverlay.classList.remove('is-loading');failedOverlay.classList.add('is-error');}status.textContent='Ошибка запуска: '+error.message;$('quality').textContent='ENGINE ERROR'; }
}
boot();
