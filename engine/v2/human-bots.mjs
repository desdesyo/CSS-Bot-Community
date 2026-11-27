// Procedural human-scale tactical characters. No external model downloads.
const materialCache = new WeakMap();
function materials(B, scene, team) {
  let cache=materialCache.get(scene); if(!cache){cache={};materialCache.set(scene,cache);}
  if(cache[team]) return cache[team];
  const make=(name,color,roughness=.82,metallic=0)=>{const m=new B.PBRMaterial(name,scene);m.albedoColor=B.Color3.FromHexString(color);m.roughness=roughness;m.metallic=metallic;return m;};
  const ct=team!=="enemy";
  return cache[team]={
    cloth:make("uniform-"+team,ct?"#354d5b":"#4b5547"), clothDark:make("uniform-dark-"+team,ct?"#263943":"#343d34"),
    armor:make("armor-"+team,ct?"#263239":"#30352f",.68,.12), edge:make("armor-edge-"+team,ct?"#59666a":"#66634f",.5,.28),
    skin:make("skin-"+team,"#b98e73",.9), skinDark:make("skin-dark-"+team,"#765747",.95),
    helmet:make("helmet-"+team,ct?"#52636a":"#62604d",.62,.12), visor:make("visor-"+team,"#17252a",.28,.55),
    boot:make("boot-"+team,"#171b1b",.9), metal:make("weapon-metal-"+team,"#242a2b",.34,.78),
    rubber:make("rubber-"+team,"#151a1a",.96), pouch:make("pouch-"+team,ct?"#46534e":"#56513d",.94)
  };
}
export function createHumanBot(B,scene,shadowGen,root,team,id) {
  const m=materials(B,scene,team), parts=[];
  const box=(name,size,pos,mat)=>{const o=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);o.parent=root;o.position.set(...pos);o.material=mat;o.receiveShadows=true;if(shadowGen&&parts.length<24)shadowGen.addShadowCaster(o);parts.push(o);return o;};
  const capsule=(name,height,radius,pos,mat)=>{const o=B.MeshBuilder.CreateCapsule(name,{height,radius,tessellation:8,subdivisions:2},scene);o.parent=root;o.position.set(...pos);o.material=mat;o.receiveShadows=true;if(shadowGen&&parts.length<24)shadowGen.addShadowCaster(o);parts.push(o);return o;};
  const sphere=(name,diameter,pos,mat)=>{const o=B.MeshBuilder.CreateSphere(name,{diameter,segments:10},scene);o.parent=root;o.position.set(...pos);o.material=mat;o.receiveShadows=true;parts.push(o);return o;};
  const body=B.MeshBuilder.CreateCapsule("body-"+id,{height:1.52,radius:.31,tessellation:8},scene);body.parent=root;body.position.y=.94;body.isVisible=false;
  const head=B.MeshBuilder.CreateSphere("head-"+id,{diameter:.43,segments:10},scene);head.parent=root;head.position.y=1.78;head.isVisible=false;
  const legs=[],arms=[];
  for(const side of [-1,1]){
    const x=side*.16,p=new B.TransformNode("leg-pivot-"+id+"-"+side,scene);p.parent=root;p.position.set(x,.78,0);
    const thigh=B.MeshBuilder.CreateCapsule("thigh-"+id+"-"+side,{height:.48,radius:.145,tessellation:8},scene);thigh.parent=p;thigh.position.y=-.19;thigh.material=m.cloth;thigh.receiveShadows=true;
    const knee=B.MeshBuilder.CreateSphere("knee-"+id+"-"+side,{diameter:.27,segments:8},scene);knee.parent=p;knee.position.y=-.43;knee.material=m.armor;
    const shin=B.MeshBuilder.CreateCapsule("shin-"+id+"-"+side,{height:.43,radius:.105,tessellation:8},scene);shin.parent=p;shin.position.y=-.67;shin.material=m.clothDark;
    box("boot-"+id+"-"+side,[.25,.16,.39],[x,.105,.055],m.boot);box("boot-toe-"+id+"-"+side,[.25,.11,.18],[x,.075,-.105],m.rubber);
    legs.push({pivot:p,side});
  }
  capsule("combat-shirt-"+id,.78,.29,[0,1.17,0],m.cloth);
  box("plate-carrier-"+id,[.57,.62,.24],[0,1.23,-.015],m.armor);
  box("front-plate-"+id,[.39,.39,.045],[0,1.28,-.151],m.edge);
  box("belt-"+id,[.59,.12,.31],[0,.87,0],m.clothDark);
  for(const side of [-1,1]){
    box("mag-pouch-"+id+"-"+side,[.14,.2,.13],[side*.22,1.02,-.17],m.pouch);
    box("side-pouch-"+id+"-"+side,[.13,.16,.14],[side*.29,.91,.02],m.armor);
    box("shoulder-pad-"+id+"-"+side,[.25,.2,.28],[side*.34,1.47,0],m.armor);
  }
  box("backpack-"+id,[.43,.57,.2],[0,1.23,.245],m.clothDark);
  box("backpack-flap-"+id,[.34,.19,.035],[0,1.43,.355],m.pouch);
  box("radio-"+id,[.12,.24,.1],[-.29,1.48,.12],m.armor);
  capsule("neck-"+id,.2,.105,[0,1.64,0],m.skin);
  sphere("face-"+id,.39,[0,1.79,-.012],m.skin);
  for(const side of [-1,1]){sphere("ear-"+id+"-"+side,.095,[side*.19,1.79,0],m.skinDark);box("eye-"+id+"-"+side,[.055,.025,.025],[side*.075,1.82,-.187],m.rubber);}
  box("nose-"+id,[.07,.09,.08],[0,1.77,-.205],m.skin);
  box("chin-strap-"+id,[.31,.045,.22],[0,1.66,0],m.rubber);
  sphere("helmet-shell-"+id,.48,[0,1.99,.005],m.helmet);
  box("helmet-rim-"+id,[.42,.055,.28],[0,1.94,-.13],m.helmet);
  box("helmet-mount-"+id,[.11,.13,.1],[0,2.12,-.16],m.edge);
  box("visor-"+id,[.31,.065,.035],[0,1.86,-.19],m.visor);
  for(const side of [-1,1]){
    const p=new B.TransformNode("arm-pivot-"+id+"-"+side,scene);p.parent=root;p.position.set(side*.37,1.43,0);
    const upper=B.MeshBuilder.CreateCapsule("upper-arm-"+id+"-"+side,{height:.43,radius:.12,tessellation:8},scene);upper.parent=p;upper.position.set(side*.015,-.23,0);upper.rotation.z=side*-.12;upper.material=m.cloth;
    const elbow=B.MeshBuilder.CreateSphere("elbow-"+id+"-"+side,{diameter:.22,segments:8},scene);elbow.parent=p;elbow.position.set(side*.02,-.45,-.015);elbow.material=m.armor;
    const fore=B.MeshBuilder.CreateCapsule("forearm-"+id+"-"+side,{height:.39,radius:.095,tessellation:8},scene);fore.parent=p;fore.position.set(side*.035,-.65,-.025);fore.rotation.z=side*-.08;fore.material=m.clothDark;
    const glove=B.MeshBuilder.CreateSphere("glove-"+id+"-"+side,{diameter:.17,segments:8},scene);glove.parent=p;glove.position.set(side*.045,-.88,-.06);glove.material=m.rubber;
    arms.push({pivot:p,side});
  }
  const weapon=new B.TransformNode("bot-rifle-"+id,scene);weapon.parent=root;weapon.position.set(.2,1.16,-.24);weapon.rotation.x=-.08;
  const wp=(name,size,pos,mat)=>{const o=B.MeshBuilder.CreateBox(name,{width:size[0],height:size[1],depth:size[2]},scene);o.parent=weapon;o.position.set(...pos);o.material=mat;return o;};
  wp("rifle-receiver-"+id,[.12,.13,.42],[0,0,0],m.metal);wp("rifle-barrel-"+id,[.045,.045,.42],[0,.02,-.39],m.metal);
  wp("rifle-handguard-"+id,[.1,.1,.24],[0,0,-.23],m.armor);wp("rifle-mag-"+id,[.085,.2,.12],[0,-.14,-.02],m.rubber);
  wp("rifle-stock-"+id,[.1,.12,.25],[0,.015,.31],m.clothDark);wp("rifle-sight-"+id,[.045,.055,.09],[0,.105,-.05],m.edge);
  return {body,head,rig:{parts,legs,arms,weapon,root}};
}
export function animateHumanBot(rig,phase,moving=true){
  if(!rig)return;const swing=moving?Math.sin(phase)*.48:0;
  for(const leg of rig.legs)leg.pivot.rotation.x=swing*leg.side;
  for(const arm of rig.arms)arm.pivot.rotation.x=-swing*legSide(arm.side)*.72;
  rig.root.position.y=moving?Math.abs(Math.sin(phase*2))*.025:0;
}
function legSide(side){return side;}
