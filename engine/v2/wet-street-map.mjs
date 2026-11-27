/**
 * MOKRY POL — playable rain-soaked old-quarter level for SOLO Engine V2.
 * Geometry stays inside the existing navigation bounds (-53..53, -42..42).
 */
export function buildWetStreetMap(B, scene, mobile, shadowGen) {
  const mapStart=scene.meshes.length;
  const C = B.Color3;
  const mat = (name, hex, roughness=.88, metallic=0) => {
    const m = mobile ? new B.StandardMaterial(name, scene) : new B.PBRMaterial(name, scene);
    const color = C.FromHexString(hex);
    if (m.albedoColor !== undefined) { m.albedoColor=color; m.roughness=roughness; m.metallic=metallic; }
    else { m.diffuseColor=color; m.specularColor=new C(.42,.46,.5); m.specularPower=96; }
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
  const water=mat('canal deep water','#071a2a',.12,.58);
  water.diffuseColor && (water.diffuseColor=new C(.035,.11,.18));
  if(water.albedoColor) water.albedoColor=new C(.035,.11,.18);
  if(water.emissiveColor) water.emissiveColor=new C(.008,.025,.05);
  const cobble=mat('Mokry Pol wet cobblestone PBR','#344251',.2,.12);
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
  if(cobble.albedoTexture!==undefined)cobble.albedoTexture=cobbleTex;
  else cobble.diffuseTexture=cobbleTex;
  if(!mobile && cobble.bumpTexture!==undefined)cobble.bumpTexture=cobbleTex;
  cobbleTex.uScale=mobile?7:10;cobbleTex.vScale=mobile?8:12;
  if(cobble.metallic!==undefined)cobble.metallic=.08;
  const ground=B.MeshBuilder.CreateGround('Mokry Pol district foundation',{width:106,height:84,subdivisions:1},scene);
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
    ['west tenement A',-17,-29,10,15,8.2,plaster,'west'],
    ['west tenement B',-17,-9,10,15,7.4,stone,'west'],
    ['west tenement C',-17,15,10,16,8.5,brick,'west'],
    ['west tenement D',-17,34,10,12,7.2,plaster,'west'],
    ['east tenement A',17,-29,10,15,7.6,stone,'east'],
    ['east tenement B',17,-9,10,15,8.4,plaster,'east'],
    ['east tenement C',17,15,10,16,7.3,brick,'east'],
    ['east tenement D',17,34,10,12,8.1,stone,'east']
  ];
  for(const args of blocks) building(...args);
  // Secondary rows define side streets while preserving multiple walkable cut-throughs.
  for(const [x,z,w,d,h] of [
    [-38,-27,10,16,6.6],[-38,-5,10,15,7.2],[-38,18,10,15,6.8],[-38,36,10,10,6.4],
    [38,-27,10,16,7.1],[38,-5,10,15,6.7],[38,18,10,15,7.4],[38,36,10,10,6.5]
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
  for(const [x,z,w,d] of [[-4,-31,2.6,1.2],[4,-18,1.9,.8],[-3,-8,2.1,.7],[3,12,2.8,1.1],[-4,25,1.7,.9],[4,36,2.2,1]]){
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
      if(!mobile&&lightCount++<10){const l=new B.PointLight('warm wall lantern',new B.Vector3(x,3.45,z-.25),scene);l.diffuse=new C(1,.67,.38);l.intensity=.55;l.range=9;}
    }else{
      cylinder('cast iron lamp post',x,2.4,z,.16,4.8,lampMat);
      box('lantern cross arm',x,4.7,z,.85,.12,.12,lampMat,false);
      box('lantern hood',x,5.05,z,.65,.18,.65,lampMat,false);
      box('lantern glowing pane',x,4.88,z,.32,.48,.32,glow,false);
      if(!mobile&&lightCount++<10){const l=new B.PointLight('warm street lantern',new B.Vector3(x,4.6,z),scene);l.diffuse=new C(1,.64,.34);l.intensity=.68;l.range=12;}
    }
  };
  for(const z of [-34,-20,16,31]){lamp(-8.9,z);lamp(8.9,z);}
  for(const z of [-30,-8,18,35]){lamp(-11.6,z,true);lamp(11.6,z,true);}
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
  box('server room emergency power cabinet',0,1.15,30.05,2.0,2.3,.48,labRed,true);
  box('emergency power cabinet label',0,2.15,29.79,1.25,.28,.035,labWhite,false);
  box('specimen transfer case',-5.5,.72,29.0,1.15,1.35,1.0,labWhite,true);
  box('specimen case amber seal',-5.5,1.45,28.47,.72,.12,.035,labAmber,false);
  box('sealed sample cooler',5.5,.62,18.9,1.25,1.1,1.0,labSteel,true);
  box('manual containment switch',0,1.45,17.35,.78,1.15,.28,labRed,true);
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
    if(joined){joined.name='Mokry Pol merged material '+materialId;joined.receiveShadows=true;joined.isPickable=false;merged.push(joined);}
    else merged.push(...parts);
  }
  const staticMeshes=[...colliders,...merged],materials=new Set();
  for(const m of staticMeshes){
    m.computeWorldMatrix(true);m.freezeWorldMatrix();
    if(m.material&&!materials.has(m.material)){materials.add(m.material);m.material.freeze?.();}
    if(!mobile)shadowGen.addShadowCaster(m);
  }
  return {name:'Mokry Pol',theme:'rainy-blue-hour',riverCrossings:[-20,20],staticMeshCount:staticMeshes.length,mergedMaterialGroups:groups.size};
}
