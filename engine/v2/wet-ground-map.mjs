/**
 * WET GROUND — playable rain-soaked old-quarter level for SOLO Engine V2.
 * Geometry stays inside the existing navigation bounds (-53..53, -42..42).
 */
export function buildWetGroundMap(B, scene, mobile, shadowGen) {
  const mapStart=scene.meshes.length;
  const C = B.Color3;
  const mat = (name, hex, roughness=.88, metallic=0) => {
    const m = new B.PBRMaterial(name, scene);
    const color = C.FromHexString(hex);
    m.albedoColor=color; m.roughness=mobile?Math.max(.24,roughness):roughness; m.metallic=metallic;
    m.environmentIntensity=mobile?.8:1.15; m.directIntensity=1.05; m.emissiveIntensity=1;
    if(m.clearCoat){m.clearCoat.isEnabled=true;m.clearCoat.intensity=.18;m.clearCoat.roughness=.28;}
    return m;
  };
  const plaster=mat('wet blue-gray plaster','#303f50',.92);
  const stone=mat('aged blue stone','#394653',.9);
  const brick=mat('dark wet brick','#343b45',.94);
  const trim=mat('weathered limestone trim','#68717a',.82);
  const iron=mat('black wet iron','#171e28',.38,.72);
  const glass=mat('midnight window glass','#101d2d',.16,.42);
  const roof=mat('slate roofs','#202b39',.92);
  const amber=mat('warm lamp glass','#ffd49a',.25);
  const warmWindow=mat('occupied apartment window glow','#e9ae6d',.34);
  if(warmWindow.emissiveColor)warmWindow.emissiveColor=new C(.62,.25,.07);
  const water=mat('canal deep water','#102b3d',.075,.32);
  water.diffuseColor && (water.diffuseColor=new C(.035,.11,.18));
  if(water.albedoColor) water.albedoColor=new C(.035,.11,.18);
  if(water.emissiveColor) water.emissiveColor=new C(.008,.025,.05);
  const cobble=mat('Wet Ground wet cobblestone PBR','#43596b',.13,.16);
  const makeCobbleTexture = () => {
    const size=mobile?1024:2048, tex=new B.DynamicTexture('procedural wet cobblestone', {width:size,height:size}, scene, false);
    const ctx=tex.getContext(), rand=(()=>{let s=81357;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296);})();
    ctx.fillStyle='#263544';ctx.fillRect(0,0,size,size);
    const rows=mobile?18:30, cols=mobile?12:20, cw=size/cols, ch=size/rows;
    for(let y=0;y<rows;y++) for(let x=0;x<cols;x++){
      const ox=(y%2)*cw*.48, px=x*cw+ox, py=y*ch;
      const inset=2+rand()*3, shade=24+Math.floor(rand()*23);
      ctx.fillStyle='rgba(5,12,20,.85)';ctx.fillRect(px+inset-2,py+inset-1,cw-inset*2+3,ch-inset*2+3);
      ctx.fillStyle='rgb('+shade+','+(shade+10)+','+(shade+19)+')';
      ctx.beginPath();ctx.roundRect(px+inset,py+inset,cw-inset*2,ch-inset*2,3);ctx.fill();
      if(rand()>.68){ctx.fillStyle='rgba(112,151,184,'+(0.07+rand()*.12)+')';ctx.beginPath();ctx.ellipse(px+cw*.52,py+ch*.56,cw*.32,ch*.2,rand(),0,Math.PI*2);ctx.fill();}
      ctx.strokeStyle='rgba(160,190,213,.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+inset+2,py+inset+2);ctx.lineTo(px+cw*.55,py+inset+1);ctx.stroke();
    }
    tex.update(false);
    tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;
    return tex;
  };
  const cobbleTex=makeCobbleTexture();
  cobble.albedoTexture=cobbleTex;
  cobbleTex.uScale=mobile?7:10;cobbleTex.vScale=mobile?8:12;
  // A dedicated tangent-space normal texture gives individual cobbles raised edges and worn centers.
  const normalSize=mobile?256:512,normalTex=new B.DynamicTexture('cobblestone micro normal',{width:normalSize,height:normalSize},scene,false);
  const normalCtx=normalTex.getContext();normalCtx.fillStyle='rgb(128,128,255)';normalCtx.fillRect(0,0,normalSize,normalSize);
  const normalRows=mobile?12:20,normalCols=mobile?9:15,nw=normalSize/normalCols,nh=normalSize/normalRows;
  for(let y=0;y<normalRows;y++)for(let x=0;x<normalCols;x++){
    const px=x*nw+(y%2)*nw*.46,py=y*nh;
    normalCtx.strokeStyle='rgb(91,112,239)';normalCtx.lineWidth=2;normalCtx.strokeRect(px+2,py+2,nw-4,nh-4);
    normalCtx.strokeStyle='rgb(164,144,250)';normalCtx.lineWidth=1;normalCtx.beginPath();normalCtx.moveTo(px+4,py+4);normalCtx.lineTo(px+nw*.7,py+4);normalCtx.stroke();
  }
  normalTex.update(false);normalTex.wrapU=normalTex.wrapV=B.Texture.WRAP_ADDRESSMODE;normalTex.uScale=cobbleTex.uScale;normalTex.vScale=cobbleTex.vScale;normalTex.gammaSpace=false;
  cobble.bumpTexture=normalTex;cobble.bumpTexture.level=mobile?.22:.42;cobble.useParallax=false;
  if(cobble.metallic!==undefined)cobble.metallic=.08;
  const ground=B.MeshBuilder.CreateGround('Wet Ground district foundation',{width:106,height:84,subdivisions:1},scene);
  ground.position.y=-.08;ground.material=mat('night asphalt base','#111d2a',.96);ground.receiveShadows=true;
  const floor=(name,x,z,w,d,y=.025,material=cobble)=>{
    const m=B.MeshBuilder.CreateGround(name,{width:w,height:d,subdivisions:1},scene);
    m.position.set(x,y,z);m.material=material;m.receiveShadows=true;return m;
  };
  const box=(name,x,y,z,w,h,d,material,collide=true,cast=true)=>{
    const m=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);
    m.position.set(x,y,z);m.material=material;m.checkCollisions=collide;m.isPickable=collide;
    m.receiveShadows=true;return m;
  };
  const cylinder=(name,x,y,z,diameter,height,material)=>{
    const m=B.MeshBuilder.CreateCylinder(name,{diameter,height,tessellation:8},scene);
    m.position.set(x,y,z);m.material=material;return m;
  };
  // Main cobbled street, short cross streets, and narrow side passages.
  floor('main wet cobblestone street',0,0,14,82,.025);
  floor('west lane cobblestones',-23,0,9,82,.03);
  floor('east lane cobblestones',23,0,9,82,.03);
  for(const z of [-27,-12,13,28]) floor('cross alley cobbles',0,z,52,5,.035);
  for(const x of [-8.2,8.2,-28.5,28.5]) floor('raised wet sidewalk',x,0,2.1,82,.07,stone);
  // Canal runs across the old quarter. Two stone bridges are the only crossings.
  floor('canal bed',0,0,106,10,-.12,water);
  const waterPlane=B.MeshBuilder.CreateGround('dark canal water',{width:106,height:9.4,subdivisions:1},scene);
  waterPlane.position.y=.12;waterPlane.material=water;waterPlane.isPickable=false;
  if(!mobile){const reflection=new B.PointLight('canal reflected blue fill',new B.Vector3(0,1,-1),scene);reflection.diffuse=new C(.12,.28,.48);reflection.intensity=.32;reflection.range=38;}
  for(const [x,label] of [[-20,'west'],[20,'east']]){
    floor(label+' arched stone bridge deck',x,0,8,15,.22,stone);
    box(label+' bridge parapet north',x,.78,-6.6,8,.95,.34,trim);
    box(label+' bridge parapet south',x,.78,6.6,8,.95,.34,trim);
    for(let i=-3;i<=3;i++) box(label+' bridge parapet post',x+i*1.1,1.15,-6.6,.18,.8,.2,iron,false);
    for(let i=-3;i<=3;i++) box(label+' bridge parapet post',x+i*1.1,1.15,6.6,.18,.8,.2,iron,false);
    for(let i=0;i<7;i++){
      const a=-Math.PI/2+(Math.PI*i/6);
      const arch= B.MeshBuilder.CreateCylinder(label+' bridge arch rib',{diameter:.22,height:8,tessellation:8},scene);
      arch.position.set(x, -1.05+Math.sin(a)*1.2, Math.cos(a)*6.2);
      arch.rotation.x=Math.PI/2;arch.material=stone;arch.isPickable=false;
    }
  }
  // River-edge walls stop AI/player shortcuts through the canal; gaps align with bridges.
  const invisible=mat('canal collision barrier','#071a2a',1);
  if(invisible.alpha!==undefined)invisible.alpha=0;
  for(const z of [-4.9,4.9]) for(const [x,w] of [[-38.5,29],[0,32],[38.5,29]]){
    const barrier=box('canal bank collision barrier',x,.95,z,w,1.9,.32,invisible,true,false);
    barrier.visibility=.001;
  }
  for(const z of [-5.7,5.7]) for(const [x,w] of [[-38.5,29],[0,32],[38.5,29]]) box('rough stone canal retaining wall',x,.42,z,w,.85,.7,stone,true);
  // Low-rise buildings: 2–3 floors, irregular facades, open doorways and service alleys.
  const building=(name,x,z,w,d,h,material,front)=>{
    const side=front==='west'?-1:1, face=x+side*(w/2+.07);
    box(name+' rear wall',x,h/2,z-d/2,w,h,.48,material,true);
    box(name+' outer wall',x-side*w/2,h/2,z,.48,h,d,material,true);
    box(name+' inner wall north',x+side*w/2,h/2,z-d/2+.6,.48,h,d*.34,material,true);
    box(name+' inner wall south',x+side*w/2,h/2,z+d/2-.6,.48,h,d*.34,material,true);
    box(name+' flat slate roof',x,h+.12,z,w+.45,.28,d+.45,roof,false);
    for(const zz of [z-d*.28,z+d*.28]){
      box(name+' facade window recess',face,2.55,zz,.12,1.65,2.05,iron,false);
      box(name+' dark window glass',face+side*.075,2.55,zz,.04,1.34,1.72,glass,false);
      if(Math.round(z+zz)%2===0)box(name+' occupied warm window',face+side*.105,2.55,zz,.035,.72,.94,warmWindow,false);
      box(name+' stone window sill',face+side*.12,1.68,zz,.28,.14,2.3,trim,false);
      box(name+' lintel',face,3.43,zz,.2,.16,2.35,trim,false);
    }
    box(name+' doorway canopy',face+side*.18,2.5,z,.8,.18,2.4,iron,false);
    box(name+' door',face+side*.02,1.1,z,.08,2.2,1.7,roof,false);
    box(name+' door step',face+side*.5,.14,z,1.1,.24,2.1,trim,false);
    for(const zz of [z-d*.42,z+d*.42]){
      box(name+' facade drainpipe',face+side*.16, h*.45,zz,.13,h*.9,.13,iron,false);
    }
    for(let floorIndex=1;floorIndex<=2;floorIndex++){
      const fy=floorIndex===1?4.1:6.3;
      if(fy<h-.6){
        box(name+' balcony slab',face+side*.5,fy-.7,z,.9,.14,2.8,trim,false);
        box(name+' balcony rail',face+side*.92,fy-.22,z,.12,.85,2.8,iron,false);
      }
    }
    box(name+' chimney',x+side*w*.25,h+.9,z-d*.2,.8,1.5,.8,stone,false);
    box(name+' rain gutter',x,h+.28,z+d/2,w+.5,.12,.12,iron,false);
    // recessed wall alcove makes the doorway legible from the playable street
    return {face};
  };
  const blocks=[
    ['west tenement A',-18,-30,12,14,8.2,plaster,'west'],
    ['west tenement B',-16,-8,9,13,7.4,stone,'west'],
    ['west tenement C',-18,15,12,17,8.5,brick,'west'],
    ['west tenement D',-16,34,9,11,7.2,plaster,'west'],
    ['east tenement A',18,-30,9,14,7.6,stone,'east'],
    ['east tenement B',17,-8,12,16,8.4,plaster,'east'],
    ['east tenement C',18,16,9,13,7.3,brick,'east'],
    ['east tenement D',16,35,12,11,8.1,stone,'east']
  ];
  for(const args of blocks) building(...args);
  // Secondary rows define side streets while preserving multiple walkable cut-throughs.
  for(const [x,z,w,d,h] of [
    [-39,-29,11,13,6.6],[-37,-6,9,17,7.2],[-40,19,12,13,6.8],[-37,36,9,10,6.4],
    [39,-28,9,14,7.1],[40,-5,12,16,6.7],[37,18,9,16,7.4],[39,36,12,10,6.5]
  ]) building('outer quarter row',x,z,w,d,h,brick,x<0?'west':'east');
  // Alleys are real openings between blocks; short walls, gates, bins and stoops create cover.
  for(const [x,z,w,d] of [[-11,-19,1,5],[-11,5,1,5],[-11,27,1,5],[11,-19,1,5],[11,5,1,5],[11,27,1,5],[-31,-16,1,6],[31,16,1,6]]){
    box('alley low stone divider',x,.65,z,w,1.3,d,stone,true);
  }
  for(const [x,z] of [[-10,-27],[10,-10],[-10,18],[10,31],[-29,-2],[29,24]]){
    box('weathered street refuse bin',x,.58,z,.85,1.16,.75,iron,true);
    box('bin rain lid',x,1.2,z,.94,.12,.84,trim,false);
  }
  // Cobble gutters, drainage grates, uneven kerbs and shallow puddle inlays.
  for(const x of [-7.1,7.1]) for(let z=-39;z<=39;z+=8){
    box('granite curb',x,.12,z,.22,.22,7.6,trim,false);
    box('storm drain grate',x+(x<0?.35:-.35),.085,z, .72,.035,1.35,iron,false);
  }
  const puddle=mat('shallow rain puddle','#172c40',.08,.3);
  if(puddle.emissiveColor)puddle.emissiveColor=new C(.012,.025,.045);
  for(const [x,z,w,d] of [[-4,-35,3.8,1.55],[4,-29,2.7,1.1],[-3,-18,3.1,1.2],[4,-11,2.5,1.0],[-4,-4,3.6,1.35],[3,7,2.8,1.15],[-4,16,3.2,1.25],[4,25,2.6,1.0],[-3,34,3.8,1.5],[7,39,2.4,.9]]){
    const p=B.MeshBuilder.CreateDisc('irregular rain puddle',{radius:1,tessellation:24},scene);
    p.scaling.set(w,.01,d);p.position.set(x,.065,z);p.material=puddle;p.isPickable=false;
  }

  // Warm wall lamps and old cast-iron street lanterns, with tightly budgeted light count.
  const lampMat=mat('lamp bronze','#252a31',.38,.7),glow=mat('amber glowing glass','#ffbf72',.22);
  if(glow.emissiveColor)glow.emissiveColor=new C(1,.48,.16);
  let lightCount=0;
  const lamp=(x,z,wallMount=false)=>{
    if(wallMount){
      box('wall lamp bracket',x,.0,z,.65,.12,.12,lampMat,false);
      box('wall lantern housing',x,3.45,z,.38,.66,.38,lampMat,false);
      const bulb=box('warm lantern glass',x,3.45,z-.22,.2,.4,.08,glow,false);
      if(lightCount++<(mobile?4:10)){const l=new B.PointLight('warm wall lantern',new B.Vector3(x,3.45,z-.25),scene);l.diffuse=new C(1,.67,.38);l.intensity=mobile?.34:.55;l.range=mobile?7:9;}
    }else{
      cylinder('cast iron lamp post',x,2.4,z,.16,4.8,lampMat);
      box('lantern cross arm',x,4.7,z,.85,.12,.12,lampMat,false);
      box('lantern hood',x,5.05,z,.65,.18,.65,lampMat,false);
      box('lantern glowing pane',x,4.88,z,.32,.48,.32,glow,false);
      if(lightCount++<(mobile?4:10)){const l=new B.PointLight('warm street lantern',new B.Vector3(x,4.6,z),scene);l.diffuse=new C(1,.64,.34);l.intensity=mobile?.42:.68;l.range=mobile?8:12;}
    }
  };
  for(const z of [-34,-20,16,31]){lamp(-8.9,z);lamp(8.9,z);}
  for(const z of [-30,-8,18,35]){lamp(-11.6,z,true);lamp(11.6,z,true);}

  // Wet-night storefronts: readable pools of amber/cyan light, not a uniformly dark box.
  const neonCyan=mat('cyan shop sign emission','#56dff2',.24);
  const neonAmber=mat('amber shop sign emission','#ffd18a',.24);
  const neonRed=mat('red pharmacy sign emission','#ff625e',.28);
  if(neonCyan.emissiveColor)neonCyan.emissiveColor=new C(.06,.62,.82);
  if(neonAmber.emissiveColor)neonAmber.emissiveColor=new C(.85,.42,.12);
  if(neonRed.emissiveColor)neonRed.emissiveColor=new C(.72,.045,.035);
  for(const [x,z,w,signMat] of [[-11.2,-25,4.8,neonAmber],[11.2,-13,4.2,neonCyan],[-11.2,10,5.2,neonRed],[11.2,29,4.6,neonAmber]]){
    box('illuminated shop sign backing',x,3.55,z,w,.72,.16,iron,false);
    box('illuminated shop sign face',x,3.56,z-.105,w-.24,.48,.035,signMat,false);
    box('shop awning',x,2.85,z+(.6),w+.45,.16,1.05,brick,false);
    for(let i=-2;i<=2;i++)box('awning rib',x+i*w/5,2.76,z+.6,.035,.08,1.05,trim,false);
  }
  // A rain-dark delivery van and loading details break up the repeated block rhythm.
  const vanBody=mat('delivery van dark teal paint','#263d43',.3,.42);
  const vanGlass=mat('delivery van smoked glass','#142c38',.12,.5);
  const vanWheel=mat('delivery van rubber','#101519',.94);
  const van=(x,z,rot=0)=>{
    const root=new B.TransformNode('parked delivery van',scene);root.position.set(x,0,z);root.rotation.y=rot;
    const part=(name,px,py,pz,w,h,d,m)=>{const q=B.MeshBuilder.CreateBox(name,{width:w,height:h,depth:d},scene);q.parent=root;q.position.set(px,py,pz);q.material=m;q.isPickable=false;return q;};
    part('van lower body',0,.82,0,2.15,1.35,4.25,vanBody);
    part('van cargo roof',0,1.72,.2,2.05,.55,2.85,vanBody);
    part('van windscreen',0,1.55,-1.93,1.82,.82,.045,vanGlass);
    part('van side window',1.09,1.53,-1.12,.035,.55,1.1,vanGlass);
    for(const xx of [-.82,.82])for(const zz of [-1.42,1.42]){
      const wheel=B.MeshBuilder.CreateCylinder('van tire',{diameter:.76,height:.22,tessellation:16},scene);
      wheel.parent=root;wheel.rotation.z=Math.PI/2;wheel.position.set(xx,.42,zz);wheel.material=vanWheel;wheel.isPickable=false;
    }
    root.computeWorldMatrix(true);
  };
  van(-31,-20,-.08);van(31,8,Math.PI+.04);

  // A recognizable old-quarter landmark and a compact covered night market.
  const towerStone=mat('clock tower rain-dark masonry','#52606b',.78);
  const towerRoof=mat('clock tower oxidized copper','#344d50',.34,.58);
  box('old quarter clock tower shaft',-44,5.4,-13,3.6,10.8,3.8,towerStone,true);
  const towerCap=B.MeshBuilder.CreateCylinder('clock tower copper roof',{diameter:4.5,height:1.5,tessellation:8},scene);
  towerCap.position.set(-44,11.55,-13);towerCap.material=towerRoof;towerCap.isPickable=false;
  box('clock tower illuminated dial',-42.13,8.0,-13, .045,1.75,1.75,neonAmber,false);
  box('clock tower minute hand',-42.09,8.2,-13,.035,.72,.06,iron,false);
  box('clock tower hour hand',-42.08,7.98,-13,.035,.06,.48,iron,false);
  for(const [x,z] of [[-25,-15],[26,12]]){
    const stallRoof=mat('market awning canvas '+x,x<0?'#765044':'#425d69',.82);
    box('night market stall counter',x,.72,z,3.4,1.35,1.6,vanBody,true);
    box('night market striped canopy',x,2.15,z,4.1,.18,2.6,stallRoof,false);
    for(const dx of [-1.85,1.85])for(const dz of [-1.1,1.1])box('market canopy support',x+dx,1.55,z+dz,.09,1.25,.09,iron,false);
    box('market warm counter light',x,1.55,z-.86,.16,.22,.08,neonAmber,false);
  }

  // Rain chains, balcony details and fire escapes create layered facades and silhouettes.
  for(const [x,z] of [[-18,-30],[18,-8],[-18,15],[18,35]]){
    for(const level of [4.0,6.3]){
      box('fire escape landing',x+(x<0?5.3:-5.3),level,z,1.25,.12,3.2,iron,false);
      box('fire escape outer rail',x+(x<0?5.9:-5.9),level+.42,z, .08,.84,3.2,trim,false);
      for(const dz of [-1.4,0,1.4])box('fire escape baluster',x+(x<0?5.9:-5.9),level+.2,z+dz,.05,.4,.05,iron,false);
    }
  }

  // Short footbridges and service crossings along the embankment.
  for(const x of [-44,44]){
    floor('riverside stone landing',x,0,5,11,.16,stone);
    box('canal bollard',x-2,.6,0,.3,1.2,.3,iron,false);
    box('canal bollard',x+2,.6,0,.3,1.2,.3,iron,false);
  }
  // Low rooflines, overhead wires and small rooftop details: no high-rise skyline.
  for(const z of [-31,-9,16,34]){
    const wire=B.MeshBuilder.CreateTube('overhead street cable',{path:[new B.Vector3(-13,8.1,z),new B.Vector3(0,7.6,z-2),new B.Vector3(13,8.1,z)],radius:.025,tessellation:5},scene);
    wire.material=iron;wire.isPickable=false;
  }
  // Old doors, lintels, wall stains and iron balcony details on street-facing elevations.
  for(const [x,z] of [[-12,-29],[12,-9],[-12,15],[12,34],[-33,-27],[33,18]]){
    box('weathered doorway stone frame',x,1.25,z,.18,2.5,2.3,trim,false);
    box('old timber door',x+(x<0?.12:-.12),1.1,z,.08,2.1,1.65,roof,false);
    cylinder('door handle',x+(x<0?.2:-.2),1.15,z+.55,.09,.09,amber);
  }

  // UNDERGROUND BIOSECURE FACILITY — the round objective is the server room.
  // The compact complex is built around BOMB_SITE (0, 23): two opposing
  // approaches, a central server chamber, access-control vestibules and side labs.
  const labWall=mat('biosecure reinforced concrete','#46515a',.84);
  const labFloor=mat('sealed epoxy laboratory floor','#26333d',.34,.12);
  const labWhite=mat('laboratory ceramic panels','#87939a',.58,.08);
  const labDark=mat('server rack graphite','#111a23',.4,.34);
  const labSteel=mat('server rack brushed steel','#53616c',.3,.72);
  const labGlass=mat('server rack smoked glass','#172a38',.16,.48);
  const labCyan=mat('server status cyan','#46d7e5',.22);
  const labGreen=mat('server status green','#55dc91',.24);
  const labRed=mat('security warning red','#c84d43',.42);
  const labAmber=mat('biohazard amber','#e6b44f',.48);
  if(labCyan.emissiveColor)labCyan.emissiveColor=new C(.08,.62,.78);
  if(labGreen.emissiveColor)labGreen.emissiveColor=new C(.08,.58,.22);
  if(labRed.emissiveColor)labRed.emissiveColor=new C(.52,.055,.025);
  if(labAmber.emissiveColor)labAmber.emissiveColor=new C(.48,.22,.025);
  const labZ=24;
  floor('biosecure facility sealed floor',0,labZ,23,22,.055,labFloor);
  floor('server chamber raised epoxy floor',0,labZ,14.2,14.2,.075,labFloor);
  // Outer shell: north and south airlocks remain open for two-sided combat flow.
  for(const x of [-11.5,11.5])box('biosecure exterior side wall',x,2.65,labZ,.48,5.3,22,labWall,true);
  for(const z of [13,35]){
    for(const x of [-8.9,8.9])box('biosecure exterior end wall',x,2.65,z,5.2,5.3,.48,labWall,true);
    box('biosecure entry lintel',0,4.95,z,5.8,.55,.48,labWall,true);
    for(const x of [-2.15,2.15]){
      box('airlock reinforced door leaf',x,1.45,z,.12,2.9,.16,labSteel,false);
      box('airlock red access indicator',x<0?-2.0:2.0,3.25,z-.28,.16,.22,.08,labRed,false);
    }
  }
  // Flat roof and inner ceiling are deliberately separate: the chamber reads as
  // an enclosed facility from inside, while all geometry remains static.
  box('biosecure facility roof',0,5.42,labZ,23.8,.42,22.8,labWall,false,false);
  box('server chamber acoustic ceiling',0,5.05,labZ,14.2,.22,14.2,labWhite,false,false);
  // Inner server room with aligned north/south access portals.
  for(const x of [-7.1,7.1])box('server chamber reinforced side wall',x,2.55,labZ,.42,5.1,14.2,labWall,true);
  for(const z of [16.9,31.1]){
    for(const x of [-4.55,4.55])box('server chamber partition wall',x,2.55,z,5.1,5.1,.42,labWall,true);
    box('server chamber portal header',0,4.92,z,4.0,.36,.42,labWall,false);
    box('server chamber sliding blast door left',-1.63,1.35,z,.10,2.7,.16,labSteel,false);
    box('server chamber sliding blast door right',1.63,1.35,z,.10,2.7,.16,labSteel,false);
    box('server chamber access light',0,3.45,z-.28,.72,.16,.07,labGreen,false);
  }
  // Airlock vestibules, observation/control bay and decontamination alcove.
  for(const x of [-9.2,9.2]){
    for(const dx of [-1.65,1.65]){
      box('side laboratory partition north',x+dx,2.3,19.4,1.35,4.6,.22,labWhite,true);
      box('side laboratory partition south',x+dx,2.3,28.7,1.35,4.6,.22,labWhite,true);
    }
    for(const dz of [-1.65,1.65])box('side laboratory inner divider',x,2.3,24+dz,.22,4.6,1.35,labWhite,true);
    box('side laboratory ceiling light',x,4.72,24,2.7,.08,.55,labCyan,false);
  }
  // Observation windows and sealed control consoles on the west side.
  box('control room observation glass',-7.32,2.85,24, .06,1.55,3.2,labGlass,false);
  for(const z of [21.5,24,26.5]){
    box('control console housing',-9.25,1.12,z,1.35,1.35,.72,labDark,false);
    box('control console screen',-8.86,1.55,z, .035,.62,.48,labCyan,false);
    for(let i=0;i<3;i++)box('control console key',-8.84,1.12,z-.2+i*.2,.04,.06,.07,labAmber,false);
  }
  // Decontamination benches, chemical lockers and a visible biohazard marking.
  for(const z of [21.5,26.5]){
    box('decontamination locker',9.15,1.25,z,1.25,2.5,.72,labWhite,true);
    box('decontamination locker warning panel',8.49,1.45,z,.04,.62,.35,labAmber,false);
  }
  box('biohazard sign plate',9.2,3.35,24,1.8,.72,.08,labDark,false);
  box('biohazard sign amber field',9.2,3.35,24.055,1.25,.36,.035,labAmber,false);
  // Eight full-height server cabinets in two banks. The center aisle and objective
  // pad stay clear so players can fight and plant without snagging on tiny props.
  const serverRack=(x,z,index)=>{
    box('server cabinet base '+index,x,.22,z,1.28,.34,1.42,labSteel,true);
    box('server cabinet body '+index,x,1.62,z,1.18,2.55,1.34,labDark,true);
    box('server cabinet front glass '+index,x,1.65,z-.685,1.02,2.34,.035,labGlass,false);
    box('server cabinet top cap '+index,x,2.94,z,1.32,.12,1.46,labSteel,false);
    box('server cabinet side vent '+index,x+.61,1.65,z,.035,1.7,.62,labSteel,false);
    for(let level=0;level<7;level++){
      const y=.72+level*.285;
      box('server module face '+index,x,y,z-.713,.76,.19,.025,labSteel,false);
      for(let led=0;led<3;led++)box('server activity led '+index,x-.27+led*.27,y,z-.738,.045,.045,.025,(level+led+index)%5===0?labGreen:labCyan,false);
    }
    for(const y of [.72,1.28,1.84,2.4])cylinder('server cabinet fan '+index,x+.34,y,z-.75,.13,.025,labSteel);
  };
  let rackId=0;
  for(const x of [-4.8,4.8])for(const z of [19.7,23.2,26.7,29.0])serverRack(x,z,++rackId);
  // Raised cable trays, overhead power busbars and floor cable channels.
  for(const x of [-5.65,5.65]){
    box('overhead server cable tray',x,4.52,labZ,.28,.18,12.2,labSteel,false);
    for(let z=18;z<=30;z+=1.5)box('cable tray support',x,4.18,z,.08,.58,.08,labSteel,false);
  }
  for(const z of [18.2,29.8]){
    box('floor cable channel cover',0,.105,z,5.8,.035,.22,labSteel,false);
    for(let x=-2.5;x<=2.5;x+=.5)box('floor channel slot',x,.127,z,.035,.012,.16,labDark,false);
  }
  // Emergency lighting, sprinkler pipes, HVAC and ceiling service panels.
  for(const z of [18.4,22.2,25.8,29.6]){
    box('server room ceiling light housing',0,4.82,z,5.8,.08,.34,labSteel,false);
    box('server room ceiling light diffuser',0,4.765,z,5.25,.035,.22,labCyan,false);
  }
  for(const x of [-5.8,5.8]){
    box('server room HVAC duct',x,4.55,labZ,.42,.38,11.5,labSteel,false);
    for(const z of [19,22,25,28])box('HVAC vent grille',x,4.32,z,.58,.04,1.0,labDark,false);
  }
  // Environmental storytelling: warning stripes, specimen transfer case,
  // sealed sample cooler, emergency cutoff and a conspicuous manual override.
  box('server room emergency power cabinet',5.7,1.15,30.0,2.0,2.3,.48,labRed,true);
  box('emergency power cabinet label',0,2.15,29.79,1.25,.28,.035,labWhite,false);
  box('specimen transfer case',-9.2,.72,29.5,1.15,1.35,1.0,labWhite,true);
  box('specimen case amber seal',-9.2,1.45,28.97,.72,.12,.035,labAmber,false);
  box('sealed sample cooler',9.2,.62,29.5,1.25,1.1,1.0,labSteel,true);
  box('manual containment switch',-5.9,1.45,17.35,.78,1.15,.28,labRed,true);
  box('containment switch guard',0,2.05,17.17,.92,.16,.08,labSteel,false);
  // Directional signage makes the two entrances readable in combat.
  for(const z of [13.35,34.65]){
    box('biosecure facility sign backing',0,3.85,z,5.6,.72,.12,labDark,false);
    box('biosecure facility sign cyan strip',0,4.22,z-.08,4.7,.08,.035,labCyan,false);
    box('biosecure facility sign warning strip',0,3.49,z-.08,4.7,.08,.035,labAmber,false);
  }
  // A clean central bomb/interaction pad: no rack or console occupies its radius.
  floor('server room objective pad',0,labZ,3.8,3.8,.095,labWhite);
  box('server room objective pad inset',0,.105,labZ,2.5,.025,2.5,labDark,false,false);
  for(const x of [-1.55,1.55])for(const z of [labZ-1.55,labZ+1.55])box('objective pad corner marker',x,.13,z,.22,.035,.22,labAmber,false,false);
  // The server room is the bombsite; its approach corridors remain fully traversable.

  // Merge all non-colliding static detail by material to keep mobile draw calls bounded.
  const authored=scene.meshes.slice(mapStart),groups=new Map(),colliders=[];
  for(const m of authored){
    if(m.checkCollisions){colliders.push(m);continue;}
    if(!m.material||m.getTotalVertices?.()===0)continue;
    const key=m.material.uniqueId;
    if(!groups.has(key))groups.set(key,[]);
    groups.get(key).push(m);
  }
  const merged=[];
  for(const [materialId,parts] of groups){
    if(parts.length<2){merged.push(...parts);continue;}
    const joined=B.Mesh.MergeMeshes(parts,true,true,undefined,false,true);
    if(joined){joined.name='Wet Ground merged material '+materialId;joined.receiveShadows=true;joined.isPickable=false;merged.push(joined);}
    else merged.push(...parts);
  }

  // Procedural blue-hour sky: luminous horizon gradient and sparse stars, not a flat black clear color.
  const skyTexture=new B.DynamicTexture('wet quarter night sky',{width:512,height:256},scene,false);
  const skyCtx=skyTexture.getContext(),skyGradient=skyCtx.createLinearGradient(0,0,0,256);
  skyGradient.addColorStop(0,'#07111f');skyGradient.addColorStop(.48,'#172b40');skyGradient.addColorStop(.78,'#40586b');skyGradient.addColorStop(1,'#9aa1a0');
  skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,512,256);
  let starSeed=9137;const starRand=()=>((starSeed=(starSeed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<58;i++){const x=starRand()*512,y=starRand()*145,r=.35+starRand()*.75;skyCtx.fillStyle='rgba(210,226,245,'+(.18+starRand()*.42)+')';skyCtx.beginPath();skyCtx.arc(x,y,r,0,Math.PI*2);skyCtx.fill();}
  skyTexture.update(false);
  const skyMaterial=new B.StandardMaterial('blue-hour skyline material',scene);
  skyMaterial.backFaceCulling=false;skyMaterial.disableLighting=true;skyMaterial.emissiveTexture=skyTexture;
  skyMaterial.diffuseColor=new C(0,0,0);skyMaterial.specularColor=new C(0,0,0);
  const skybox=B.MeshBuilder.CreateBox('blue-hour skyline skybox',{size:180},scene);
  skybox.material=skyMaterial;skybox.infiniteDistance=true;skybox.isPickable=false;skybox.checkCollisions=false;skybox.applyFog=false;skybox.renderingGroupId=0;
  skybox.computeWorldMatrix(true);skybox.freezeWorldMatrix();

  // A single planar reflection pass gives the wet street and canal real building/light reflections.
  // It is deliberately low-resolution and refreshed less often on phones.
  let wetMirror=null;
  if(B.MirrorTexture){
    wetMirror=new B.MirrorTexture('rain-soaked street planar reflections',new B.Vector2(mobile?256:768,mobile?256:768),scene,true);
    wetMirror.mirrorPlane=new B.Plane(0,-1,0,-.075);
    wetMirror.level=mobile?.24:.38;
    wetMirror.blurKernel=mobile?18:28;
    wetMirror.refreshRate=mobile?4:2;
    wetMirror.renderList=scene.meshes.slice(mapStart).filter(mesh=>{
      if(mesh.name.includes('water')||mesh.name.includes('puddle')||mesh.name.includes('cobblestone')||mesh.name.includes('canal bed'))return false;
      mesh.computeWorldMatrix(true);
      return mesh.getBoundingInfo().boundingBox.maximumWorld.y>.35;
    });
    cobble.reflectionTexture=wetMirror;
    water.reflectionTexture=wetMirror;
    puddle.reflectionTexture=wetMirror;
  }

  const staticMeshes=[...colliders,...merged],materials=new Set();
  for(const m of staticMeshes){
    m.computeWorldMatrix(true);m.freezeWorldMatrix();
    if(m.material&&!materials.has(m.material)){materials.add(m.material);m.material.freeze?.();}
    if(!mobile)shadowGen.addShadowCaster(m);
  }
  return {name:'Wet Ground',theme:'rainy-blue-hour',riverCrossings:[-20,20],staticMeshCount:staticMeshes.length,mergedMaterialGroups:groups.size};
}
