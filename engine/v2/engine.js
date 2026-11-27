const $ = (id) => document.getElementById(id);
const canvas = $('renderCanvas');
const mobile = matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
import { adaptiveScale, moveToward, createTeamRoster, cameraRelativeMovement, moveWithAabbCollisions, findSafePlayerSpawn, findPathAStar, TEAM_SPAWNS, BOMB_SITE } from './engine-core.mjs';
import { loadHumanBotAssets, createHumanBot, animateHumanBot, stopHumanBot } from './human-bots.mjs';
import { createWeaponViewmodel } from './weapon-viewmodel.mjs';
const state = { started:false, playerTeam:'CT', hp:100, ammo:30, reserve:90, fps:0, scale:mobile?.9:1, frameSamples:[], sampleAt:performance.now(), aiAccumulator:0, simTime:0, bots:[], keys:new Set(), joy:{x:0,y:0}, look:{x:0,y:0}, lastShot:0, lastHud:0, firing:false, reloading:false, playerDead:false, kills:0, roundTime:180, projectiles:[], weaponSlot:'rifle', weaponAmmo:{rifle:30,pistol:12}, weaponReserve:{rifle:90,pistol:48}, lastMove:null, lastMoveWasBlocked:false, lastRenderMs:0, aimTargetId:null, fireStick:{x:0,y:0}, playerHitbox:null };
const status = $('loadState'), startButton = $('start'), overlay = $('overlay');
function mat(name, color, roughness=0.8, metallic=0) {
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor = BABYLON.Color3.FromHexString(color); m.roughness = roughness; m.metallic = metallic;
  return m;
}
let engine, scene, camera, shadowGen, enemyMaterial, allyMaterial, humanBotAssets, botWeaponMaterials;
let weaponGeometryRoot, rifleRoot, pistolRoot, knifeRoot, collisionBoxes=[], playerSpawn={x:0,z:-41}, projectileMaterial;
function box(name, x,y,z, sx,sy,sz, material, cast=true, collide=true) {
  const m = BABYLON.MeshBuilder.CreateBox(name,{width:sx,height:sy,depth:sz},scene);
  m.position.set(x,y,z); m.material=material; m.receiveShadows=true; m.checkCollisions=!!collide;
  if(cast) shadowGen.addShadowCaster(m);
  return m;
}
function buildMap() {
  const asphalt=mat('district asphalt','#343c3b',.96),road=mat('road worn tar','#252d2d',.98),sidewalk=mat('aged sidewalk','#777b73',.92),brick=mat('weathered brick','#75665a',.92),plaster=mat('aged plaster','#aaa18d',.94),concrete=mat('site concrete','#777c78',.9),metal=mat('industrial steel','#343d3d',.52,.58),roof=mat('roof tar','#3c4240',.96),glass=mat('dark window glass','#263b40',.28,.25),yellow=mat('site safety yellow','#d2ad4d',.55,.18),white=mat('road paint','#c8c6b5',.75);
  const ground=BABYLON.MeshBuilder.CreateGround('district-ground',{width:112,height:92,subdivisions:2},scene);ground.material=asphalt;ground.receiveShadows=true;
  const groundPatch=(name,x,z,w,d,m)=>{const p=BABYLON.MeshBuilder.CreateGround(name,{width:w,height:d},scene);p.position.set(x,.012,z);p.material=m;p.receiveShadows=true;return p;};
  groundPatch('main asphalt avenue',0,0,17,88,road);
  groundPatch('west side street',-23,0,8,84,road);groundPatch('east side street',23,0,8,84,road);
  for(const x of [-12,12,-29,29])groundPatch('concrete pavement',x,0,2.2,86,sidewalk);
  box('north perimeter wall',0,2.8,-45,112,5.6,.9,concrete);box('south perimeter wall',0,2.8,45,112,5.6,.9,concrete);
  box('west perimeter wall',-55.5,2.8,0,.9,5.6,90,concrete);box('east perimeter wall',55.5,2.8,0,.9,5.6,90,concrete);
  const wall=(name,x,y,z,w,h,d,m=brick,collide=true)=>box(name,x,y,z,w,h,d,m,true,collide);
  const building=(name,cx,cz,w,d,m,door='inward')=>{
    const h=4.4,t=.65,y=h/2;
    wall(name+' north wall',cx,y,cz-d/2,w,h,t,m);
    wall(name+' south wall',cx,y,cz+d/2,w,h,t,m);
    if(door==='inward'&&cx<0){
      wall(name+' west wall',cx-w/2,y,cz,t,h,d,m);
      wall(name+' east jamb north',cx+w/2,y,cz-d/2+1.7,t,h,d/2-1.7,m);
      wall(name+' east jamb south',cx+w/2,y,cz+d/2-1.7,t,h,d/2-1.7,m);
    }else if(door==='inward'&&cx>0){
      wall(name+' east wall',cx+w/2,y,cz,t,h,d,m);
      wall(name+' west jamb north',cx-w/2,y,cz-d/2+1.7,t,h,d/2-1.7,m);
      wall(name+' west jamb south',cx-w/2,y,cz+d/2-1.7,t,h,d/2-1.7,m);
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
    box(name+' facade sign',cx,3.75,cz-d/2-.04,Math.min(4,w*.45),.42,.08,metal,false,false);
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
  groundPatch('bombsite concrete apron',0,23,25,18,concrete);
  for(const [x,z,w,d] of [[-12,14,.25,18],[12,14,.25,18],[-12,32,.25,18],[12,32,.25,18]])box('bombsite painted boundary',x,.025,z,w,.035,d,yellow,false,false);
  for(const [x,z] of [[-8,20],[8,27]])cargo(x,z,3,5,2.5);
  box('bombsite plant platform',0,.12,23,4,.22,3,yellow,false,false);
  box('bombsite site marker',0,.025,23,7,.035,.18,white,false,false);
  // CT cover positions defend the yard without sealing its entrances.
  for(const [x,z,w,d] of [[-8,34,4,1.1],[8,34,4,1.1],[-14,23,1.1,4],[14,23,1.1,4]])box('site concrete cover',x,.65,z,w,1.3,d,concrete);
  // Road markings, drains, lamps and roof equipment give the district scale.
  for(const z of [-31,-19,-7,5,17,29,39])box('broken lane marking',0,.025,z,.14,.035,3.2,yellow,false,false);
  for(const x of [-18,18,-34,34])for(const z of [-33,-11,11,36]){
    const pole=box('streetlight pole',x,3,z,.12,6,.12,metal,false,false);
    box('streetlight head',x,6,z,.8,.16,.35,yellow,false,false);
    const light=new BABYLON.PointLight('streetlight glow',new BABYLON.Vector3(x,5.7,z),scene);light.diffuse=new BABYLON.Color3(.82,.74,.56);light.intensity=mobile?.12:.22;light.range=11;
  }
  for(const [x,z] of [[-47,-36],[47,-36],[-47,36],[47,36]])box('utility cabinet',x,.8,z,2,1.6,1.4,metal);
}
function makeBot(id, team, x,z, waypoints) {
  const root=new BABYLON.TransformNode('bot-'+id,scene);
  const human=createHumanBot(BABYLON,scene,shadowGen,root,team,id,humanBotAssets,mobile);
  root.position.set(x,0,z);
  const weapons=createBotWeapon(root,id,team);
  state.bots.push({id,team,root,body:human.body,head:human.head,rig:human.rig,weapons,rifle:weapons.rifle,activeWeapon:'rifle',rightHand:human.rig.rightHand,ammo:30,reserve:90,pistolAmmo:12,pistolReserve:36,reloadUntil:0,meleeUntil:0,weaponKick:0,fireAt:0,deadAt:0,spawn:{x,z},waypoints,index:0,speed:team==='enemy'?2.05:1.9,phase:id*.73,health:125,alive:true,navPath:[],navIndex:0,navGoal:null,repathAt:0,target:null,combatState:'patrol',combatStrafeAt:0,combatSide:id%2?1:-1});
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
  if(!['rifle','pistol','knife'].includes(slot)||!weaponRoot){gameLogEvent('weapon-select-rejected',{requested:slot,source,hasWeaponRoot:!!weaponRoot});return false;}
  // Update gameplay state and HUD first; a viewmodel animation error must never make
  // the on-screen weapon buttons appear to do nothing.
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
  for(const bot of state.bots) bot.root.dispose();
  state.bots.length=0;
  buildBots();
  $('team').textContent='TEAM '+team;
  $('selectCT').classList.toggle('selected',team==='CT');
  $('selectT').classList.toggle('selected',team==='T');
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
    if(bot.team==='enemy'&&!state.playerDead&&state.bots.filter(other=>other!==bot&&other.team==='enemy'&&other.alive&&other.target?.kind==='player').length<2)candidates.push({kind:'player',position:camera.position});
    for(const other of state.bots)if(other.alive&&other.team!==bot.team)candidates.push({kind:'bot',bot:other,position:other.root.position});
    candidates.sort((a,b)=>BABYLON.Vector3.Distance(bot.root.position,a.position)-BABYLON.Vector3.Distance(bot.root.position,b.position));
    let chosen=null,chosenDistance=Infinity;
    for(const candidate of candidates){
      const origin=bot.root.position.add(new BABYLON.Vector3(0,1.28,0));
      const aim=candidate.kind==='player'?candidate.position.add(new BABYLON.Vector3(0,-.25,0)):candidate.position.add(new BABYLON.Vector3(0,1.05,0));
      const delta=aim.subtract(origin),distance=delta.length();
      if(distance<1.25||distance>40)continue;
      const ray=new BABYLON.Ray(origin,delta.normalize(),distance);
      const hit=scene.pickWithRay(ray,m=>m&&m.isPickable&&!m.name.startsWith('body-'+bot.id)&&!m.name.startsWith('head-'+bot.id));
      const visible=!hit?.hit||(candidate.kind==='player'&&hit.pickedMesh?.name==='player-hitbox')||(candidate.kind==='bot'&&hit.pickedMesh?.parent===candidate.bot.root);
      if(visible){chosen=candidate;chosenDistance=distance;break;}
    }
    bot.target=chosen;
    if(chosen){
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
          bot.navPath=findPathAStar(bot.root.position,goal,collisionBoxes,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.repathAt=now+1800;
        }
      }else{
        bot.combatState='fire';
        if(now>bot.combatStrafeAt){
          const dx=bot.root.position.x-target.x,dz=bot.root.position.z-target.z,dist=Math.max(.01,Math.hypot(dx,dz));
          const side=bot.combatSide||1;
          const goal=chosenDistance<5.2
            ?{x:bot.root.position.x+dx/dist*3.2,z:bot.root.position.z+dz/dist*3.2}
            :{x:bot.root.position.x+(dz/dist)*side*3.2,z:bot.root.position.z-(dx/dist)*side*3.2};
          bot.navPath=findPathAStar(bot.root.position,goal,collisionBoxes,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.combatStrafeAt=now+2200+Math.random()*1300;bot.combatSide=-side;bot.repathAt=now+2200;
        }
      }
      if(bot.activeWeapon==='rifle'&&bot.ammo===0&&bot.reserve>0&&!bot.reloadUntil)bot.reloadUntil=now+1450;
      if(bot.activeWeapon==='pistol'&&bot.pistolAmmo===0&&bot.pistolReserve>0&&!bot.reloadUntil)bot.reloadUntil=now+1250;
      if(now>=bot.fireAt&&chosenDistance<38&&!bot.reloadUntil){
        if(bot.activeWeapon==='knife'){
          if(chosenDistance<2.15&&now>bot.meleeUntil){
            bot.meleeUntil=now+850;
            if(chosen.kind==='player'){state.hp=Math.max(0,state.hp-28);$('health').textContent='HP '+state.hp;if(state.hp===0)endRound(false);}
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
            bot.fireAt=now+(isPistol?760:880)+Math.random()*(isPistol?360:420);
            const origin=bot.root.position.add(new BABYLON.Vector3(0,1.28,0));
            const aim=chosen.kind==='player'?target.add(new BABYLON.Vector3(0,-.25,0)):target.add(new BABYLON.Vector3(0,1.05,0));
            const direction=aim.subtract(origin).normalize();
            const spread=isPistol?.065:.048;
            direction.x+=(Math.random()-.5)*spread;direction.y+=(Math.random()-.5)*spread*.7;direction.z+=(Math.random()-.5)*spread;direction.normalize();
            spawnProjectile(origin.add(direction.scale(.42)),direction,bot.team,isPistol?36:42,bot.id,isPistol?18:14);
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
      const wp=bot.waypoints[bot.index];
      if(Math.hypot(wp[0]-bot.root.position.x,wp[1]-bot.root.position.z)<1.0){bot.index=(bot.index+1)%bot.waypoints.length;bot.navPath=[];bot.navGoal=null;}
      const goal={x:wp[0],z:wp[1]};
      if(!bot.navGoal||Math.hypot(bot.navGoal.x-goal.x,bot.navGoal.z-goal.z)>.1||now>bot.repathAt){
        bot.navPath=findPathAStar(bot.root.position,goal,collisionBoxes,.38,1.5);bot.navIndex=0;bot.navGoal=goal;bot.repathAt=now+2500;
      }
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
      if(bot.navIndex>=bot.navPath.length){bot.navPath=[];goal=null;}
    }
    if(!goal&&bot.combatState==='patrol'){
      const wp=bot.waypoints[bot.index];goal={x:wp[0],z:wp[1]};
    }
    if(goal){
      const dx=goal.x-bot.root.position.x,dz=goal.z-bot.root.position.z,dist=Math.hypot(dx,dz);
      const next=moveToward({x:bot.root.position.x,z:bot.root.position.z},goal,bot.combatState==='patrol'?bot.speed:bot.speed*1.12,dt);
      const resolved=moveWithAabbCollisions({x:bot.root.position.x,y:0,z:bot.root.position.z},{x:next.x-bot.root.position.x,z:next.z-bot.root.position.z},collisionBoxes,.38,1.72,.07);
      bot.root.position.x=resolved.x;bot.root.position.z=resolved.z;
      if((resolved.blockedX||resolved.blockedZ)&&dist>.8){bot.navPath=[];bot.navGoal=null;bot.repathAt=0;}
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
    if(bot.rightHand&&held){
      bot.root.computeWorldMatrix(true);bot.rightHand.computeWorldMatrix(true);
      const inverse=bot.root.getWorldMatrix().clone().invert();
      const local=BABYLON.Vector3.TransformCoordinates(bot.rightHand.getAbsolutePosition(),inverse);
      held.position.set(local.x+.02,local.y-.025,local.z+.05);
      bot.weaponKick=Math.max(0,(bot.weaponKick||0)-dt*.8);
      held.rotation.x=-bot.weaponKick;
      if(bot.rig.rightHand){bot.rig.rightHand.rotation.x=bot.combatState==='fire'?-0.08:bot.activeWeapon==='knife'?-0.16:0;}
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
  state.projectiles.push({mesh,velocity:direction.scale(speed),life:1.7,ownerTeam,ownerId,damage,gravity:speed<60?1.35:9.81});
}
function killBot(bot,credit=false) {
  if(!bot||!bot.alive)return;
  bot.health=0;bot.alive=false;bot.deadAt=performance.now();bot.deathStartX=bot.root.rotation.x;
  bot.body.isPickable=false;bot.head.isPickable=false;bot.combatState='dead';bot.target=null;bot.navPath=[];
  stopHumanBot(bot.rig);if(credit){state.kills++;$('kills').textContent='KILLS '+state.kills}
}
function damageBot(bot,damage,credit=false) {
  if(!bot?.alive)return;
  bot.health=Math.max(0,bot.health-Math.max(0,damage));
  if(bot.health===0)killBot(bot,credit);
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
      if(bot&&bot.alive&&bot.team!==p.ownerTeam)damageBot(bot,hit.pickedMesh.name.startsWith('head-')?Math.max(42,p.damage*2.5):p.damage,p.ownerId==='player');
      if(hit.pickedMesh.name==='player-hitbox'&&p.ownerTeam==='enemy'){
        state.hp=Math.max(0,state.hp-(p.damage?Math.max(3,Math.round(p.damage*.32))+Math.floor(Math.random()*2):6));$('health').textContent='HP '+state.hp;
        if(state.hp===0)endRound(false);
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
    gameLogEvent('melee-swing-start',{source:state.fireInputSource||'loop',slot,range:2.1});
    return;
  }
  if(state.weaponAmmo[slot]<=0){if(state.weaponReserve[slot]>0)reload();return;}
  state.lastShot=now;state.weaponAmmo[slot]--;
  gameLogEvent('shot-fired',{source:state.fireInputSource||'loop',slot,ammo:state.weaponAmmo[slot],yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3)});
  const ray=camera.getForwardRay(1);
  const muzzleNode=slot==='rifle'?weaponViewmodel?.muzzleFlash:weaponViewmodel?.pistolFlash;
  const origin=muzzleNode?.getAbsolutePosition().clone()||camera.position.add(ray.direction.scale(.7));
  spawnProjectile(origin,ray.direction,'ally',slot==='rifle'?125:105,'player');
  weaponViewmodel?.fire();
  $('ammo').textContent=state.weaponAmmo[slot]+' / '+state.weaponReserve[slot];
}
function resolvePlayerMeleeImpact(){
  if(!weaponViewmodel?.consumeMeleeHit())return;
  const ray=camera.getForwardRay(2.1);
  const hit=scene.pickWithRay(ray,m=>m&&m.isPickable&&(m.name.startsWith('body-')||m.name.startsWith('head-')));
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
  window.addEventListener('keydown',e=>{state.keys.add(e.code);if(e.code==='KeyR')reload();if(e.code==='KeyF')toggleFullscreen();if(e.code==='Digit1')selectWeapon('rifle');if(e.code==='Digit2')selectWeapon('pistol');if(e.code==='Digit3')selectWeapon('knife');});
  window.addEventListener('keyup',e=>state.keys.delete(e.code));
  canvas.addEventListener('click',()=>{if(!mobile&&state.started)canvas.requestPointerLock?.()});
  window.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas){camera.rotation.y+=e.movementX*.0022;camera.rotation.x=Math.max(-1.35,Math.min(1.35,camera.rotation.x+e.movementY*.0022))}});
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
  look.addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;const dx=e.clientX-last.x,dy=e.clientY-last.y;last={x:e.clientX,y:e.clientY};camera.rotation.y+=dx*.004;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.004))});
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
    camera.rotation.y+=dx*.0042;camera.rotation.x=Math.max(-1.3,Math.min(1.3,camera.rotation.x+dy*.0042));
  });
  const stopFire=e=>{
    if(e&&fireId!==null&&e.pointerId!==fireId)return;
    gameLogEvent('fire-control-up',{pointerId:fireId});fireId=null;fireLast=null;state.firing=false;state.fireInputSource='';state.fireStick.x=state.fireStick.y=0;
    fireNub.style.transform='';fireButton.classList.remove('active');
  };
  fireButton.addEventListener('pointerup',stopFire);fireButton.addEventListener('pointercancel',stopFire);
  $('reload').addEventListener('click',reload);
  // Capture weapon taps at document level, before the canvas/look handlers.
  // Android touch browsers may suppress the synthesized click; pointerdown is authoritative.
  const weaponBar=$('weaponBar');
  weaponBar.style.pointerEvents='auto';
  weaponBar.style.zIndex='20';
  for(const button of weaponBar.querySelectorAll('[data-weapon]')){
    button.style.pointerEvents='auto';
    button.style.touchAction='none';
    button.setAttribute('aria-pressed',String(button.dataset.weapon===state.weaponSlot));
  }
  if(!window.__soloWeaponCapture){
    window.__soloWeaponCapture=true;
    document.addEventListener('pointerdown',e=>{
      const button=e.target?.closest?.('#weaponBar [data-weapon]');
      if(!button)return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const slot=button.dataset.weapon;
      gameLogEvent('weapon-tap-captured',{slot,pointerType:e.pointerType||'unknown',x:e.clientX,y:e.clientY,target:e.target?.tagName});
      selectWeapon(slot,'document-pointerdown-'+(e.pointerType||'unknown'));
    },{capture:true,passive:false});
    document.addEventListener('touchstart',e=>{
      const button=e.target?.closest?.('#weaponBar [data-weapon]');
      if(!button)return;
      e.preventDefault();
      const slot=button.dataset.weapon;
      gameLogEvent('weapon-touchstart-captured',{slot,touches:e.touches?.length||0});
      selectWeapon(slot,'document-touchstart');
    },{capture:true,passive:false});
  }
  $('fullScreen').addEventListener('click',toggleFullscreen);
  $('logsQuick').addEventListener('click',handleGameplayLogs);
  $('issueQuick').addEventListener('click',submitIssueReport);
  $('pause').addEventListener('click',()=>{if(state.started){state.started=false;state.firing=false;overlay.style.display='flex';status.textContent='ПАУЗА';startButton.textContent='ПРОДОЛЖИТЬ';startButton.disabled=false;}});

}
function updateAimAssist(dt) {
  const forward=camera.getForwardRay(1).direction.normalize();
  const cosLimit=Math.cos(mobile ? 0.34 : 0.24);
  let best=null,bestDot=cosLimit;
  for(const bot of state.bots){
    if(!bot.alive||bot.team!=='enemy')continue;
    const target=bot.root.position.add(new BABYLON.Vector3(0,1.28,0));
    const delta=target.subtract(camera.position),distance=delta.length();
    if(distance>34||distance<.5)continue;
    const direction=delta.scale(1/distance),dot=BABYLON.Vector3.Dot(forward,direction);
    if(dot<=bestDot)continue;
    const ray=new BABYLON.Ray(camera.position,direction,distance);
    const hit=scene.pickWithRay(ray,m=>m&&m.isPickable&&m.name!=='player-hitbox');
    if(hit?.hit&&hit.pickedMesh.parent!==bot.root)continue;
    best=bot;bestDot=dot;
  }
  state.aimTargetId=best?.id??null;
  if(!best)return;
  const target=best.root.position.add(new BABYLON.Vector3(0,1.28,0));
  const dx=target.x-camera.position.x,dz=target.z-camera.position.z,dy=target.y-camera.position.y;
  const yaw=Math.atan2(dx,dz),pitch=-Math.atan2(dy,Math.hypot(dx,dz));
  const yawDelta=Math.atan2(Math.sin(yaw-camera.rotation.y),Math.cos(yaw-camera.rotation.y));
  const strength=(state.firing ? 0.24 : 0.105)*Math.min(1,dt*60);
  camera.rotation.y+=yawDelta*strength;
  camera.rotation.x+=(pitch-camera.rotation.x)*strength;
}
function updatePlayer(dt) {
  const forward=(state.keys.has('KeyW')?1:0)-(state.keys.has('KeyS')?1:0)-state.joy.y;
  const strafe=(state.keys.has('KeyD')?1:0)-(state.keys.has('KeyA')?1:0)+state.joy.x;
  const len=Math.hypot(forward,strafe)||1, speed=(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight')?6.3:4.6)*dt;
  const yaw=camera.rotation.y;
  // Babylon cameras look down local -Z; movement must use the same forward vector.
  const movement=cameraRelativeMovement(yaw,forward/len,strafe/len);
  const before={x:camera.position.x,z:camera.position.z};
  const resolved=moveWithAabbCollisions(camera.position,{x:movement.x*speed,z:movement.z*speed},collisionBoxes,.36,1.72,.10);
  camera.position.x=resolved.x;camera.position.z=resolved.z;
  state.lastMove={requested:{x:+(movement.x*speed).toFixed(4),z:+(movement.z*speed).toFixed(4)},actual:{x:+(camera.position.x-before.x).toFixed(4),z:+(camera.position.z-before.z).toFixed(4)},blockedX:resolved.blockedX,blockedZ:resolved.blockedZ,blockedBy:resolved.blockedBy};
  if((resolved.blockedX||resolved.blockedZ)&&!state.lastMoveWasBlocked)gameLogEvent('player-collision',state.lastMove);
  state.lastMoveWasBlocked=!!(resolved.blockedX||resolved.blockedZ);
  camera.position.x=Math.max(-53,Math.min(53,camera.position.x));camera.position.z=Math.max(-42,Math.min(42,camera.position.z));
  if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));
  if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));
  if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));
}
function toggleFullscreen(){
  if(!document.fullscreenElement)document.documentElement.requestFullscreen?.().catch(()=>{});
  else document.exitFullscreen?.().catch(()=>{});
}
function endRound(won){
  if(state.playerDead)return;
  state.playerDead=true;state.started=false;state.firing=false;
  overlay.style.display='flex';status.textContent=won?'ПОБЕДА · ВСЕ ПРОТИВНИКИ УСТРАНЕНЫ':'ПОРАЖЕНИЕ · БОЕЦ ВЫБЫЛ';
  startButton.textContent='НОВЫЙ РАУНД';startButton.disabled=false;
}
function start() {
  if(state.playerDead){
    state.hp=100;state.weaponAmmo={rifle:30,pistol:12};state.weaponReserve={rifle:90,pistol:48};state.kills=0;state.roundTime=180;state.playerDead=false;state.reloading=false;for(const p of state.projectiles)p.mesh.dispose();state.projectiles.length=0;
    for(const bot of state.bots){bot.health=125;bot.alive=true;bot.root.setEnabled(true);bot.index=0;bot.deadAt=0;bot.root.position.set(bot.spawn.x,0,bot.spawn.z);bot.root.rotation.set(0,0,0);bot.body.isPickable=true;bot.head.isPickable=true;bot.navPath=[];bot.navGoal=null;bot.combatState='patrol';}
    $('health').textContent='HP 100';$('ammo').textContent=state.weaponSlot==='knife'?'MELEE':state.weaponAmmo[state.weaponSlot]+' / '+state.weaponReserve[state.weaponSlot];$('round').textContent='ROUND 01';$('kills').textContent='KILLS 0';$('timer').textContent='03:00';
    status.textContent='Графическое ядро готово. Запусти тестовую сцену.';startButton.textContent='ЗАПУСК';
  }
  state.started=true;overlay.style.display='none';camera.position.set(playerSpawn.x,1.72,playerSpawn.z);camera.rotation.set(0,0,0);if(state.playerHitbox)state.playerHitbox.position.copyFrom(camera.position).addInPlace(new BABYLON.Vector3(0,-.38,0));
  if(!mobile)canvas.requestPointerLock?.();
}

const GAME_LOG_KEY='solo_engine_v2_gameplay_logs_v1';
const GAME_LOG_BRANCH='feature/solo-engine-v2';
const GAME_LOG_LIMIT=1200;
let gameLogRecording=false,gameLogUploading=false,gameLogRecords=[],gameLogEvents=[],gameLogFrameMs=[],gameLogRenderMs=[],gameLogStartedAt=0,gameLogLastSample=0,gameLogLastPersist=0;
let inputTraceInstalled=false;
let gameLogPerf={frames:0,hitches50:0,hitches100:0,hitches250:0,maxFrameMs:0,maxRenderMs:0};
try{const saved=JSON.parse(localStorage.getItem(GAME_LOG_KEY)||'null');if(saved){gameLogRecords=Array.isArray(saved.records)?saved.records.slice(-GAME_LOG_LIMIT):[];gameLogEvents=Array.isArray(saved.events)?saved.events.slice(-250):[];gameLogFrameMs=Array.isArray(saved.frameMs)?saved.frameMs.slice(-240):[];gameLogRenderMs=Array.isArray(saved.renderMs)?saved.renderMs.slice(-240):[];gameLogPerf={...gameLogPerf,...(saved.performance||{})}}}catch(e){}
function persistGameLog(){try{localStorage.setItem(GAME_LOG_KEY,JSON.stringify({records:gameLogRecords.slice(-GAME_LOG_LIMIT),events:gameLogEvents.slice(-250),frameMs:gameLogFrameMs.slice(-240),renderMs:gameLogRenderMs.slice(-240),performance:gameLogPerf,startedAt:gameLogStartedAt}))}catch(e){console.warn('Gameplay log local save failed',e)}}
function gameLogEvent(type,detail={}){if(!gameLogRecording)return;gameLogEvents.push({t:Math.round(performance.now()),wall:new Date().toISOString(),type,detail});if(gameLogEvents.length>250)gameLogEvents.shift();if(gameLogEvents.length%5===0)persistGameLog()}
function captureGameplayLog(dt,now){
 if(!gameLogRecording)return;
 const ms=Math.max(0,dt*1000),renderMs=Math.max(0,state.lastRenderMs||0);gameLogPerf.frames++;
 if(ms>50)gameLogPerf.hitches50++;if(ms>100)gameLogPerf.hitches100++;if(ms>250)gameLogPerf.hitches250++;
 gameLogPerf.maxFrameMs=Math.max(gameLogPerf.maxFrameMs,ms);gameLogPerf.maxRenderMs=Math.max(gameLogPerf.maxRenderMs,renderMs);
 gameLogFrameMs.push(+ms.toFixed(2));if(gameLogFrameMs.length>240)gameLogFrameMs.shift();
 gameLogRenderMs.push(+renderMs.toFixed(2));if(gameLogRenderMs.length>240)gameLogRenderMs.shift();
 if(now-gameLogLastSample<500)return;gameLogLastSample=now;
 const bots=state.bots.map(b=>({id:b.id,team:b.team,alive:b.alive,hp:b.health,x:+b.root.position.x.toFixed(2),y:+b.root.position.y.toFixed(2),z:+b.root.position.z.toFixed(2),rotation:+b.root.rotation.y.toFixed(3),waypoint:b.index}));
 gameLogRecords.push({t:Math.round(now-gameLogStartedAt),wall:new Date().toISOString(),playing:state.started,player:{x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3),yaw:+camera.rotation.y.toFixed(3),pitch:+camera.rotation.x.toFixed(3),hp:state.hp,dead:state.playerDead},weapon:{slot:state.weaponSlot,ammo:state.weaponAmmo[state.weaponSlot],reserve:state.weaponReserve[state.weaponSlot],reloading:state.reloading,firing:state.firing},round:{time:+state.roundTime.toFixed(2),kills:state.kills},bots,projectiles:state.projectiles.length,renderer:{fps:state.fps,scale:state.scale,hardwareScaling:engine.getHardwareScalingLevel(),renderMs:+renderMs.toFixed(2),canvas:{width:canvas.width,height:canvas.height},activeMeshes:scene.getActiveMeshes().length,totalMeshes:scene.meshes.length},ai:{bots:state.bots.map(b=>({id:b.id,team:b.team,state:b.combatState,target:b.target?.kind==='bot'?b.target.bot.id:b.target?.kind||null,navNodes:b.navPath.length-b.navIndex})),aimTargetId:state.aimTargetId},movement:state.lastMove,frameMs:+ms.toFixed(2)});
 if(gameLogRecords.length>GAME_LOG_LIMIT)gameLogRecords.shift();
 if(now-gameLogLastPersist>5000){gameLogLastPersist=now;persistGameLog()}
}
function installInputDiagnostics(){
 if(inputTraceInstalled)return;inputTraceInstalled=true;
 const watched='#fire,#weaponBar [data-weapon],#renderCanvas,#reload';
 for(const type of ['pointerdown','pointerup','pointercancel','click','mousedown','mouseup','touchstart','touchend'])document.addEventListener(type,e=>{
  const target=e.target?.closest?.(watched);if(!target)return;
  gameLogEvent('input-event',{type,target:target.id||target.dataset.weapon||target.tagName,pointerType:e.pointerType||null,pointerId:Number.isFinite(e.pointerId)?e.pointerId:null,button:Number.isFinite(e.button)?e.button:null,detail:e.detail??null,x:Number.isFinite(e.clientX)?Math.round(e.clientX):null,y:Number.isFinite(e.clientY)?Math.round(e.clientY):null,isTrusted:e.isTrusted,defaultPrevented:e.defaultPrevented,buttons:e.buttons??null});
 },true);
}
function startGameplayLog(){installInputDiagnostics();gameLogRecords=[];gameLogEvents=[];gameLogFrameMs=[];gameLogRenderMs=[];gameLogPerf={frames:0,hitches50:0,hitches100:0,hitches250:0,maxFrameMs:0,maxRenderMs:0};gameLogStartedAt=performance.now();gameLogLastSample=0;gameLogLastPersist=0;gameLogRecording=true;gameLogEvent('recording-start',{userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},mobile});persistGameLog();$('logsQuick').textContent='■ ОТПРАВИТЬ ЛОГИ';$('logsQuick').title='Остановить запись и отправить в GitHub';}
function encodeGameplayLog(value){const bytes=new TextEncoder().encode(value);let binary='';for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary)}
function savedGameplayToken(){try{return localStorage.getItem('solo_github_log_token')||''}catch(e){return ''}}
async function stopAndUploadGameplayLog(){
 if(gameLogUploading)return;
 gameLogEvent('recording-stop',{records:gameLogRecords.length,events:gameLogEvents.length});gameLogRecording=false;persistGameLog();
 if(!gameLogRecords.length&&!gameLogEvents.length){$('logsQuick').textContent='● ЛОГИ';return}
 let token=savedGameplayToken();
 if(!token){token=prompt('Для отправки нужен Fine-grained GitHub token для desdesyo/CSS-Bot-Community с Contents: Read and write. Токен сохранится только в этом браузере.');if(!token){$('logsQuick').textContent='↻ ПОВТОРИТЬ ОТПРАВКУ';return}token=token.trim();if(!token)return;try{localStorage.setItem('solo_github_log_token',token)}catch(e){alert('Не удалось сохранить токен в браузере');return}}
 const stamp=new Date().toISOString().replace(/[:.]/g,'-'),session='v2-'+Date.now().toString(36),path='logs/gameplay/'+stamp+'-'+session+'-game-diagnostics.json';
 const payload={app:'SOLO Engine V2',format:2,session,branch:GAME_LOG_BRANCH,createdAt:new Date().toISOString(),durationMs:Math.round(performance.now()-gameLogStartedAt),userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},performance:{...gameLogPerf,frameMs:gameLogFrameMs,renderMs:gameLogRenderMs,averageFrameMs:gameLogFrameMs.length?+(gameLogFrameMs.reduce((a,b)=>a+b,0)/gameLogFrameMs.length).toFixed(2):null,averageRenderMs:gameLogRenderMs.length?+(gameLogRenderMs.reduce((a,b)=>a+b,0)/gameLogRenderMs.length).toFixed(2):null},events:gameLogEvents,records:gameLogRecords};
 gameLogUploading=true;const btn=$('logsQuick');btn.disabled=true;btn.textContent='ОТПРАВКА…';
 try{
  const response=await fetch('https://api.github.com/repos/desdesyo/CSS-Bot-Community/contents/'+path,{method:'PUT',headers:{Accept:'application/vnd.github+json',Authorization:'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},body:JSON.stringify({message:'Add SOLO Engine V2 gameplay diagnostics',content:encodeGameplayLog(JSON.stringify(payload)),branch:GAME_LOG_BRANCH})});
  const result=await response.json();if(!response.ok){if(response.status===401||response.status===403){try{localStorage.removeItem('solo_github_log_token')}catch(e){}throw new Error('GitHub отклонил токен или права ('+response.status+'). Токен удалён из браузера.')}throw new Error(result.message||('GitHub API HTTP '+response.status))}
  gameLogRecords=[];gameLogEvents=[];gameLogFrameMs=[];gameLogRenderMs=[];persistGameLog();btn.textContent='● ЛОГИ';btn.title='Начать новую запись';alert('Логи успешно отправлены в GitHub: '+path);
 }catch(error){btn.textContent='↻ ПОВТОРИТЬ ОТПРАВКУ';btn.title='Логи сохранены локально; нажми для повтора';console.error('Gameplay log upload failed',error);alert('Не удалось отправить логи: '+error.message+'\nЗапись сохранена в браузере.')}
 finally{gameLogUploading=false;btn.disabled=false}
}

let issueReportBusy=false;
function collectIssueSceneContext(){
 const hit=scene.pick(canvas.width/2,canvas.height/2,m=>m.isEnabled()&&m.isVisible);
 const picked=hit?.hit?hit.pickedMesh:null;
 const visibleMeshes=[];
 for(const mesh of scene.meshes){
  if(!mesh||mesh===scene.activeCamera||!mesh.isEnabled()||!mesh.isVisible||mesh.visibility===0)continue;
  let p;try{p=mesh.getBoundingInfo().boundingSphere.centerWorld}catch(e){continue}
  const d=BABYLON.Vector3.Distance(camera.position,p);
  if(d<18)visibleMeshes.push({name:mesh.name,type:mesh.getClassName?.()||'Mesh',distance:+d.toFixed(2),position:{x:+p.x.toFixed(2),y:+p.y.toFixed(2),z:+p.z.toFixed(2)},visible:mesh.isVisible,visibility:mesh.visibility,material:mesh.material?.name||null,materialAlpha:mesh.material?.alpha??null,checkCollisions:!!mesh.checkCollisions,enabled:mesh.isEnabled()});
 }
 visibleMeshes.sort((a,b)=>a.distance-b.distance);
 return {collision:{system:'swept-aabb-circle',playerRadius:.36,playerHeight:1.72,colliderCount:collisionBoxes.length,lastMove:state.lastMove,colliders:collisionBoxes.slice(0,80).map(c=>({name:c.name,min:{x:c.minX,y:c.minY,z:c.minZ},max:{x:c.maxX,y:c.maxY,z:c.maxZ}}))},camera:{position:{x:+camera.position.x.toFixed(3),y:+camera.position.y.toFixed(3),z:+camera.position.z.toFixed(3)},rotation:{x:+camera.rotation.x.toFixed(4),y:+camera.rotation.y.toFixed(4),z:+camera.rotation.z.toFixed(4)},fov:camera.fov,minZ:camera.minZ,maxZ:camera.maxZ},player:{hp:state.hp,dead:state.playerDead,weapon:state.weaponSlot},centerRay:{hit:!!hit?.hit,mesh:picked?.name||null,distance:hit?.distance??null,point:hit?.pickedPoint?{x:+hit.pickedPoint.x.toFixed(3),y:+hit.pickedPoint.y.toFixed(3),z:+hit.pickedPoint.z.toFixed(3)}:null},nearbyMeshes:visibleMeshes.slice(0,80),bots:state.bots.map(b=>({id:b.id,team:b.team,alive:b.alive,position:{x:+b.root.position.x.toFixed(2),y:+b.root.position.y.toFixed(2),z:+b.root.position.z.toFixed(2)}})),scene:{meshCount:scene.meshes.length,activeCamera:scene.activeCamera?.name||null,engine:{width:engine.getRenderWidth(),height:engine.getRenderHeight()},canvas:{width:canvas.width,height:canvas.height}}};
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
 const context=collectIssueSceneContext(),screenshot=await captureIssueScreenshot(),stamp=new Date().toISOString().replace(/[:.]/g,'-'),id='issue-'+Date.now().toString(36);
 const report={app:'SOLO Engine V2',type:'player-marked-visual-or-world-issue',id,createdAt:new Date().toISOString(),description:description.trim(),userAgent:navigator.userAgent,screen:{width:screen.width,height:screen.height,dpr:devicePixelRatio},game:{started:state.started,paused:state.paused??false,roundTime:state.roundTime,kills:state.kills,fps:state.fps,scale:state.scale},context,screenshot:{captured:!!screenshot,format:'image/png',path:screenshot?'logs/issues/'+stamp+'-'+id+'.png':null,error:screenshot?null:'Canvas screenshot unavailable (WebGL buffer may not be preserved)'},recentGameplayLog:{recording:gameLogRecording,records:gameLogRecords.slice(-30),events:gameLogEvents.slice(-40),performance:{frames:gameLogPerf.frames,frameMs:gameLogFrameMs.slice(-120),renderMs:gameLogRenderMs.slice(-120)}}};
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

function handleGameplayLogs(){if(gameLogUploading)return;if(gameLogRecording){stopAndUploadGameplayLog();return}if(gameLogRecords.length||gameLogEvents.length){stopAndUploadGameplayLog();return}startGameplayLog()}
window.addEventListener('error',e=>gameLogEvent('window-error',{message:e.message,source:e.filename,line:e.lineno,column:e.colno,error:e.error?.stack||null}));
window.addEventListener('unhandledrejection',e=>gameLogEvent('unhandled-rejection',{reason:String(e.reason?.stack||e.reason)}));
window.addEventListener('webglcontextlost',e=>gameLogEvent('webgl-context-lost',{status:'lost'}),true);
window.addEventListener('webglcontextrestored',()=>gameLogEvent('webgl-context-restored'),true);
document.addEventListener('visibilitychange',()=>gameLogEvent('visibility',{state:document.visibilityState}));

async function boot() {
  try {
    if(!window.BABYLON)throw new Error('Babylon.js CDN недоступен');
    const B=window.BABYLON;
    engine=new B.Engine(canvas,!mobile,{preserveDrawingBuffer:false,stencil:false,antialias:true,powerPreference:'high-performance',audioEngine:false},true);
    engine.setHardwareScalingLevel(1/state.scale);
    scene=new B.Scene(engine);scene.clearColor=new B.Color4(.12,.16,.17,1);scene.ambientColor=new B.Color3(.18,.18,.17);scene.fogMode=B.Scene.FOGMODE_EXP2;scene.fogDensity=.003;scene.fogColor=new B.Color3(.22,.25,.24);
    camera=new B.UniversalCamera('fps-camera',new B.Vector3(0,1.72,-41),scene);camera.minZ=.08;camera.maxZ=180;camera.fov=1.08;camera.inertia=0;camera.angularSensibility=2400;camera.speed=0;camera.inputs.clear();
    const hemi=new B.HemisphericLight('sky-fill',new B.Vector3(0,1,0),scene);hemi.intensity=.68;hemi.diffuse=new B.Color3(.77,.81,.83);hemi.groundColor=new B.Color3(.24,.25,.22);
    const sun=new B.DirectionalLight('sun',new B.Vector3(-.45,-1,.3),scene);sun.position=new B.Vector3(24,38,-18);sun.intensity=2.2;
    shadowGen=new B.ShadowGenerator(mobile?512:2048,sun);shadowGen.useBlurExponentialShadowMap=!mobile;shadowGen.blurKernel=mobile?0:16;shadowGen.bias=.0005;shadowGen.normalBias=.02;
    enemyMaterial=mat('enemy uniform','#596c64',.88);allyMaterial=mat('friendly uniform','#526a83',.88);
    buildMap();
    state.playerHitbox=B.MeshBuilder.CreateCapsule('player-hitbox',{height:1.25,radius:.34,tessellation:8},scene);state.playerHitbox.visibility=0;state.playerHitbox.isVisible=true;state.playerHitbox.isPickable=true;state.playerHitbox.position.copyFrom(camera.position).addInPlace(new B.Vector3(0,-.38,0));
    collisionBoxes=scene.meshes.filter(m=>m&&m.checkCollisions&&m.isEnabled()&&m.isVisible).map(m=>{m.computeWorldMatrix(true);const b=m.getBoundingInfo().boundingBox;return {name:m.name,minX:b.minimumWorld.x,maxX:b.maximumWorld.x,minY:b.minimumWorld.y,maxY:b.maximumWorld.y,minZ:b.minimumWorld.z,maxZ:b.maximumWorld.z}});
    playerSpawn=findSafePlayerSpawn([{x:0,z:-41},{x:0,z:40},{x:-50,z:0},{x:50,z:0},{x:-48,z:-38},{x:48,z:-38},{x:-48,z:38},{x:48,z:38}],collisionBoxes,.36,1.72,0)||{x:0,z:-41};
    camera.position.set(playerSpawn.x,1.72,playerSpawn.z);
    $('loadState').textContent='Загрузка настоящих 3D-бойцов и анимаций…';
    humanBotAssets=await loadHumanBotAssets(B,scene);
    buildBots();buildPlayerWeapon();initInput();
    window.addEventListener('resize',()=>engine.resize());
    $('start').disabled=false;$('loadState').textContent='Графическое ядро готово. Запусти тестовую сцену.';$('quality').textContent=mobile?'MOBILE PROFILE · SHADOWS 1024':'DESKTOP PROFILE · SHADOWS 2048';
    $('selectCT').addEventListener('click',()=>setPlayerTeam('CT'));$('selectT').addEventListener('click',()=>setPlayerTeam('T'));$('start').addEventListener('click',start);$('startFullscreen').addEventListener('click',toggleFullscreen);
    let last=performance.now();
    engine.runRenderLoop(()=>{
      const now=performance.now(),rawDt=Math.max(0,(now-last)/1000),dt=Math.min(.05,rawDt);last=now;
      if(state.started) {
        updatePlayer(dt);weaponViewmodel?.update(dt,Math.max(Math.hypot(state.joy.x,state.joy.y),state.keys.has('KeyW')||state.keys.has('KeyA')||state.keys.has('KeyS')||state.keys.has('KeyD')?1:0,(state.keys.has('ShiftLeft')||state.keys.has('ShiftRight'))?1.25:0));resolvePlayerMeleeImpact();updateAimAssist(dt);updateBulletPhysics(dt);updateBotMotion(dt);state.aiAccumulator+=dt;state.simTime+=dt;state.roundTime-=dt;
        if(state.firing&&now-state.lastShot>=105)fire();
        $('timer').textContent=String(Math.max(0,Math.ceil(state.roundTime/60))).padStart(2,'0')+':'+String(Math.max(0,Math.ceil(state.roundTime%60))).padStart(2,'0');
        if(state.roundTime<=0)endRound(false);
        if(state.aiAccumulator>=.125){state.aiAccumulator%=.125;updateBotAI()}
        if(state.bots.every(b=>b.team!=='enemy'||!b.alive))endRound(true);
      }
      captureGameplayLog(rawDt,now);
      state.frameSamples.push(Math.min(250,rawDt*1000));
      if(now-state.sampleAt>=2000){
        state.frameSamples.sort((a,b)=>a-b);const p95=state.frameSamples[Math.min(state.frameSamples.length-1,Math.floor(state.frameSamples.length*.95))]||16.7;
        const next=adaptiveScale(p95,state.scale,mobile);
        if(Math.abs(next-state.scale)>=.02){state.scale=next;engine.setHardwareScalingLevel(1/state.scale)}
        state.fps=Math.round(1000/(state.frameSamples.reduce((a,b)=>a+b,0)/Math.max(1,state.frameSamples.length)));
        $('fps').textContent=state.fps+' FPS';$('quality').textContent=(mobile?'MOBILE':'DESKTOP')+' · SCALE '+Math.round(state.scale*100)+'% · P95 '+Math.round(p95)+'ms';
        state.frameSamples.length=0;state.sampleAt=now;
      }
      const renderStarted=performance.now();scene.render();state.lastRenderMs=performance.now()-renderStarted;
    });
  } catch(error) { console.error(error);status.textContent='Ошибка запуска: '+error.message;$('quality').textContent='ENGINE ERROR'; }
}
boot();
