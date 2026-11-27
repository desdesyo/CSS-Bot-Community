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
    m.albedoColor=color; m.roughness=roughness; m.metallic=metallic;
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

  // Procedural masonry surfaces: remove the flat, toy-like solid-color look
  // without adding external downloads or expensive per-frame shader work.
  const makeFacadeTexture=(name,kind)=>{
    const size=mobile?512:1024,tex=new B.DynamicTexture(name,{width:size,height:size},scene,false);
    const ctx=tex.getContext(),rand=(()=>{let seed=kind==='brick'?42117:kind==='stone'?73191:99173;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();
    const base=kind==='brick'?'#514744':kind==='stone'?'#59656e':'#66727c';
    ctx.fillStyle=base;ctx.fillRect(0,0,size,size);
    if(kind==='brick'){
      const rows=mobile?13:22,cols=mobile?9:16,cw=size/cols,ch=size/rows;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const ox=(y%2)*cw*.5,shade=Math.floor(49+rand()*29),px=x*cw+ox,py=y*ch;
        ctx.fillStyle='rgba(12,19,25,.9)';ctx.fillRect(px+2,py+2,cw-4,ch-4);
        ctx.fillStyle='rgb('+shade+','+(shade+5)+','+(shade+9)+')';
        ctx.fillRect(px+3,py+3,cw-6,ch-6);
        if(rand()>.55){ctx.fillStyle='rgba(12,20,28,.18)';ctx.fillRect(px+4,py+ch*.65,cw-8,ch*.18);}
      }
    }else if(kind==='stone'){
      const rows=8,cols=5,cw=size/cols,ch=size/rows;
      for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
        const shade=Math.floor(57+rand()*30),px=x*cw,py=y*ch;
        ctx.fillStyle='rgba(9,17,25,.55)';ctx.fillRect(px+2,py+2,cw-4,ch-4);
        ctx.fillStyle='rgb('+shade+','+(shade+7)+','+(shade+12)+')';ctx.fillRect(px+4,py+4,cw-8,ch-8);
        ctx.strokeStyle='rgba(190,205,211,.08)';ctx.lineWidth=2;ctx.strokeRect(px+7,py+7,cw-14,ch-14);
      }
    }else{
      for(let i=0;i<(mobile?1800:6500);i++){
        const v=Math.floor(90+rand()*75);ctx.fillStyle='rgba('+v+','+(v+5)+','+(v+9)+','+(rand()*.12)+')';
        const x=rand()*size,y=rand()*size,r=.4+rand()*2.2;ctx.fillRect(x,y,r,r);
      }
      // Strong, directional rain runoff: visible from street distance, especially
      // beneath window sills and roof edges. Layered widths avoid the old hairline-noise look.
      for(let i=0;i<52;i++){
        const x=rand()*size,y=rand()*size,w=2+rand()*7,h=size*(.12+rand()*.58);
        const a=.075+rand()*.14;
        ctx.fillStyle='rgba(8,17,25,'+a+')';ctx.fillRect(x,y,w,h);
        if(i%3===0){ctx.fillStyle='rgba(178,194,202,'+(a*.32)+')';ctx.fillRect(x+w+1,y+size*.025,1+rand()*2,h*.58);}
      }
      // Dirty tide marks and mineral deposits under ledges.
      for(let i=0;i<30;i++){
        const x=rand()*size,y=rand()*size,w=18+rand()*110;
        ctx.fillStyle='rgba(9,18,25,'+(.08+rand()*.12)+')';ctx.fillRect(x,y,w,2+rand()*6);
        ctx.fillStyle='rgba(190,199,201,.10)';ctx.fillRect(x+rand()*w,y+3,w*.22,1+rand()*2);
      }
      // A few broad damp patches break up otherwise uniform plaster.
      for(let i=0;i<18;i++){
        const x=rand()*size,y=rand()*size,w=16+rand()*80,h=20+rand()*110;
        ctx.fillStyle='rgba(13,24,33,'+(.035+rand()*.075)+')';
        ctx.beginPath();ctx.ellipse(x,y,w,h,rand()*.18,0,Math.PI*2);ctx.fill();
      }
    }
    // Fine surface grain keeps broad walls from reading as flat polygons.
    for(let i=0;i<(mobile?1200:4200);i++){const v=rand()>.5?255:0;ctx.fillStyle='rgba('+v+','+v+','+v+','+(rand()*.045)+')';ctx.fillRect(rand()*size,rand()*size,1,1);}
    tex.update(false);tex.wrapU=tex.wrapV=B.Texture.WRAP_ADDRESSMODE;tex.uScale=kind==='brick'?2.6:2.1;tex.vScale=2.1;
    return tex;
  };
  plaster.albedoTexture=makeFacadeTexture('rain-streaked plaster texture','plaster');
  brick.albedoTexture=makeFacadeTexture('aged dark brickwork texture','brick');
  stone.albedoTexture=makeFacadeTexture('weathered cut stone texture','stone');

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
    // The bridge is a true north/south crossing: open ends face both river banks.
    // Side rails run parallel to the crossing and never form a wall across its mouth.
    floor(label+' arched stone bridge deck',x,0,12,16,.22,stone);
    for(const side of [-1,1]){
      const railX=x+side*5.72;
      box(label+' bridge side parapet',railX,.72,0,.32,.82,13.2,trim,false);
      for(let i=-5;i<=5;i++)box(label+' bridge side parapet post',railX,1.12,i*1.18,.42,.62,.42,iron,false);
      box(label+' bridge lower stone curb',railX,.22,0,.48,.32,15.2,stone,false);
    }
    for(let i=0;i<7;i++){
      const z=-5.6+i*1.86;
      const arch=B.MeshBuilder.CreateCylinder(label+' bridge arch rib',{diameter:.2,height:12,tessellation:8},scene);
      arch.position.set(x,-1.05,z);arch.rotation.z=Math.PI/2;arch.material=stone;arch.isPickable=false;
    }
    // End paving blends the bridge into the sidewalks without a collision lip.
    floor(label+' north bridge landing',x,-8.2,13,3,.16,stone);
    floor(label+' south bridge landing',x,8.2,13,3,.16,stone);
  }
  // River-edge walls stop AI/player shortcuts through the canal; gaps align with bridges.
  const invisible=mat('canal collision barrier','#071a2a',1);
  if(invisible.alpha!==undefined)invisible.alpha=0;
  // Wide, measured bridge openings: 12 world units, enough for a player and bots
  // to pass without scraping the parapets. Wall segments stop exactly at each landing.
  for(const z of [-4.9,4.9]) for(const [x,w] of [[-39.5,27],[0,28],[39.5,27]]){
    const barrier=box('canal bank collision barrier',x,.95,z,w,1.9,.32,invisible,true,false);
    barrier.visibility=.001;
  }
  for(const z of [-5.7,5.7]) for(const [x,w] of [[-39.5,27],[0,28],[39.5,27]]) box('rough stone canal retaining wall',x,.42,z,w,.85,.7,stone,true);
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
  // The old mirrored row grid is gone: each frontage has its own setback,
  // footprint and height, leaving a broad market court on one side and a tight
  // service alley on the other. The bombsite stays fixed for objective logic.
  const blocks=[
    ['west tenement A',-19,-32,13,12,8.2,plaster,'west'],
    ['west tenement B',-15,-6,10,17,7.4,stone,'west'],
    ['west tenement C',-20,17,13,14,8.5,brick,'west'],
    ['west tenement D',-13,35,8,10,7.2,plaster,'west'],
    ['east tenement A',20,-32,10,12,7.6,stone,'east'],
    ['east tenement B',20,-7,14,18,8.4,plaster,'east'],
    ['east tenement C',16,17,10,14,7.3,brick,'east'],
    ['east tenement D',21,36,13,10,8.1,stone,'east']
  ];
  for(const args of blocks) building(...args);
  // Secondary rows define side streets while preserving multiple walkable cut-throughs.
  for(const [x,z,w,d,h] of [
    [-41,-30,9,15,6.6],[-36,-4,12,19,7.2],[-42,21,10,12,6.8],[-35,37,12,9,6.4],
    [41,-30,12,12,7.1],[43,-4,9,18,6.7],[37,20,13,13,7.4],[43,37,9,9,6.5]
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
  const shopSigns=[
    [-11.2,-25,4.8,neonAmber,'GROCERY'],
    [11.2,-13,4.2,neonCyan,'CAFE'],
    [-11.2,10,5.2,neonRed,'PHARMACY'],
    [11.2,29,4.6,neonAmber,'REPAIRS']
  ];
  for(const [x,z,w,signMat,label] of shopSigns){
    box('illuminated shop sign backing',x,3.55,z,w,.72,.16,iron,false);
    const signTex=new B.DynamicTexture('legible storefront sign '+label,{width:512,height:128},scene,false);
    const signCtx=signTex.getContext();signCtx.fillStyle='#101b27';signCtx.fillRect(0,0,512,128);
    signCtx.fillStyle=label==='PHARMACY'?'#ff716a':label==='CAFE'?'#75e8f2':'#ffd18a';
    signCtx.font='bold 58px Arial';signCtx.textAlign='center';signCtx.textBaseline='middle';signCtx.fillText(label,256,66);
    signTex.update(false);
    const signFace=new B.StandardMaterial('emissive readable sign '+label,scene);
    signFace.diffuseTexture=signTex;signFace.emissiveTexture=signTex;signFace.disableLighting=true;
    const face=box('readable '+label+' storefront sign',x,3.56,z-.105,w-.24,.48,.035,signFace,false);
    face.isPickable=false;
    box('shop awning',x,2.85,z+.6,w+.45,.16,1.05,brick,false);
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


  // New west-side covered passage: a diagonal pedestrian cut-through under
  // an old steel-and-glass canopy, distinct from the straight central avenue.
  const diagonalCut=B.MeshBuilder.CreateGround('diagonal market cut-through',{width:7.2,height:23,subdivisions:1},scene);
  diagonalCut.position.set(-29,.052,7);diagonalCut.rotation.y=-.43;diagonalCut.material=cobble;diagonalCut.receiveShadows=true;
  for(const side of [-1,1]){
    for(let i=0;i<5;i++){
      const z=-3+i*5,centerX=-29+(z-7)*Math.sin(-.43);
      const x=centerX+side*3.45;
      box('market passage canopy post',x,2.05,z,.16,4.1,.16,iron,true);
      box('market passage canopy rib',centerX,4.18,z,7.1,.12,.12,iron,false).rotation.y=-.43;
    }
  }
  const canopyGlass=mat('market passage rain glass','#6b8790',.18,.26);
  canopyGlass.alpha=.32;canopyGlass.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
  for(let i=0;i<4;i++){
    const panel=B.MeshBuilder.CreateBox('market passage glass canopy panel',{width:1.65,height:.045,depth:4.8},scene);
    const z=-1+i*5;panel.position.set(-29+(z-7)*Math.sin(-.43),4.25,z);panel.rotation.y=-.43;panel.rotation.z=-.025;panel.material=canopyGlass;panel.isPickable=false;
  }
  // East-side loading court with a recessed service entrance and stacked crates.
  floor('east loading court wet stone',31,-6,10,13,.045,stone);
  box('loading court retaining wall',35,1.2,-6, .35,2.4,12,brick,true);
  box('loading court steel roller door',26.1,2.0,-6,.12,4,4.2,iron,false);
  for(let i=0;i<5;i++)box('loading court roller ribs',26.02,.5+i*.62,-6,.04,.035,4.0,trim,false);
  const crateMat=mat('loading court rain-dark timber','#594a3e',.86);
  for(const [x,z,w,h] of [[29,-10,1.25,1.3],[32,-10,1.25,1.3],[32,-8.3,1.25,1.3],[29,-2.4,1.5,1.0]]){
    box('stacked delivery crate',x,h/2,z,w,h,1.1,crateMat,true);
    for(let i=-1;i<=1;i++)box('crate reinforcing slat',x+i*w*.28,h/2,z-.56,.045,h*.9,.035,trim,false);
  }
  // A small tram-stop shelter and rain-streaked advertising lightbox create
  // a second recognizable urban landmark on the eastern approach.
  const shelterGlass=mat('tram shelter smoked glass','#58727c',.2,.18);shelterGlass.alpha=.3;shelterGlass.transparencyMode=B.Material.MATERIAL_ALPHABLEND;
  for(const x of [8.7,12.8])box('tram shelter upright',x,1.55,-25,.1,3.1,.1,iron,false);
  box('tram shelter roof',10.75,3.12,-25,4.5,.16,2.1,iron,false);
  box('tram shelter glass rear',10.75,1.65,-24.0,4.3,2.75,.045,shelterGlass,false);
  box('tram stop amber timetable',10.75,1.95,-23.94,1.15,1.15,.035,neonAmber,false);
  // Rainwater overflow pours from a broken gutter into a visibly reflective drain pool.
  for(const [x,z] of [[-13,-20],[14,8],[34,28]]){
    const stream=B.MeshBuilder.CreateTube('rainwater downpipe overflow',{path:[new B.Vector3(x,3.2,z),new B.Vector3(x,.12,z)],radius:.018,tessellation:6},scene);
    stream.material=water;stream.isPickable=false;
    const pool=B.MeshBuilder.CreateDisc('overflow runoff puddle',{radius:1,tessellation:32},scene);
    pool.scaling.set(1.5,.01,.62);pool.position.set(x+.8,.068,z+.5);pool.material=puddle;pool.isPickable=false;
  }

  // Recognizable street furniture: benches, litter bins, utility cabinets,
  // manholes, bollards, zebra crossings and a traffic signal at the market junction.
  const streetWood=mat('street bench dark timber','#594a3c',.82);
  const utilityPaint=mat('street utility cabinet green','#334b49',.68,.18);
  const marking=mat('worn road marking','#aeb8b9',.78);
  const redSignal=mat('traffic signal red','#e44e43',.28);
  const greenSignal=mat('traffic signal green','#52cf8c',.28);
  if(redSignal.emissiveColor)redSignal.emissiveColor=new C(.55,.035,.02);
  if(greenSignal.emissiveColor)greenSignal.emissiveColor=new C(.035,.42,.12);
  for(const [x,z,rot] of [[-6,-23,0],[6,20,Math.PI/2],[-29,7,Math.PI/2],[29,-20,Math.PI/2]]){
    const seat=box('public street bench timber seat',x,.58,z,2.1,.14,.62,streetWood,false);
    seat.rotation.y=rot;
    const back=box('public street bench backrest',x,.98,z,2.1,.68,.12,streetWood,false);back.rotation.y=rot;
    for(const side of [-.72,.72]){
      const leg=box('public street bench iron leg',x+side,.3,z,.12,.58,.5,iron,false);leg.rotation.y=rot;
    }
  }
  for(const [x,z] of [[-6,-30],[6,-3],[-29,14],[29,29]]){
    box('street electrical cabinet',x,.88,z,.85,1.76,.62,utilityPaint,false);
    box('electrical cabinet access panel',x,.9,z-.32,.58,1.28,.035,iron,false);
    for(let y=0;y<3;y++)box('cabinet ventilation slot',x,.55+y*.22,z-.345,.36,.035,.025,trim,false);
    cylinder('cabinet warning beacon',x,1.86,z,.12,.12,neonAmber);
  }
  for(const [x,z] of [[-3,-39],[3,-21],[-3,2],[3,31]]){
    const cover=B.MeshBuilder.CreateCylinder('cast iron manhole cover',{diameter:1.05,height:.035,tessellation:24},scene);
    cover.position.set(x,.085,z);cover.material=iron;cover.isPickable=false;
    for(let a=0;a<8;a++){
      const slot=box('manhole radial slot',x+Math.cos(a*Math.PI/4)*.29,.108,z+Math.sin(a*Math.PI/4)*.29,.035,.012,.2,trim,false);
      slot.rotation.y=-a*Math.PI/4;
    }
  }
  for(const [x,z] of [[-5,-12],[5,12],[-28,-7],[28,7]]){
    for(let i=0;i<5;i++)box('worn pedestrian crossing stripe',x+i*.42-0.84,.075,z, .26,.018,3.4,marking,false);
  }
  for(const [x,z] of [[-7,-14],[7,14],[-32,4],[32,-4]]){
    cylinder('street bollard',x,.48,z,.24,.96,iron);
    cylinder('bollard reflective band',x,.65,z,.245,.16,trim);
  }
  for(const [x,z] of [[-7,-10],[7,10]]){
    cylinder('traffic signal pole',x,2.3,z,.13,4.6,iron);
    box('traffic signal housing',x,4.15,z,.38,1.1,.28,iron,false);
    for(const [y,m] of [[4.48,redSignal],[4.15,neonAmber],[3.82,greenSignal]]){
      const lens=B.MeshBuilder.CreateSphere('traffic signal lens',{diameter:.2,segments:8},scene);
      lens.position.set(x, y,z-.16);lens.material=m;lens.isPickable=false;
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

  // Spherical lat-long sky: a cube stretched a 2:1 gradient over six faces,
  // producing the hard seams and giant angular "ceiling" seen in the user's report.
  // A true inward-facing sphere gives one continuous horizon and no visible corners.
  const skyTexture=new B.DynamicTexture('wet quarter blue-hour atmosphere',{width:1024,height:512},scene,false);
  const skyCtx=skyTexture.getContext(),skyGradient=skyCtx.createLinearGradient(0,0,0,512);
  skyGradient.addColorStop(0,'#071321');skyGradient.addColorStop(.34,'#10263b');skyGradient.addColorStop(.63,'#29445b');skyGradient.addColorStop(.82,'#607485');skyGradient.addColorStop(1,'#b1aaa0');
  skyCtx.fillStyle=skyGradient;skyCtx.fillRect(0,0,1024,512);
  // Soft cloud banks are painted into the sky texture (no extra draw calls).
  let cloudSeed=9137;const skyRand=()=>((cloudSeed=(cloudSeed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<34;i++){
    const x=skyRand()*1024,y=170+skyRand()*185,w=55+skyRand()*210,h=5+skyRand()*18;
    const cloud=skyCtx.createRadialGradient(x,y,1,x,y,w);
    cloud.addColorStop(0,'rgba(151,174,190,'+(.10+skyRand()*.10)+')');
    cloud.addColorStop(1,'rgba(151,174,190,0)');
    skyCtx.fillStyle=cloud;skyCtx.save();skyCtx.translate(x,y);skyCtx.scale(1,h/Math.max(1,w));skyCtx.beginPath();skyCtx.arc(0,0,w,0,Math.PI*2);skyCtx.fill();skyCtx.restore();
  }
  // A restrained moon glow gives the horizon a real light source without a flat white disc.
  const moonGlow=skyCtx.createRadialGradient(760,150,2,760,150,92);
  moonGlow.addColorStop(0,'rgba(218,226,231,.42)');moonGlow.addColorStop(.16,'rgba(174,198,213,.16)');moonGlow.addColorStop(1,'rgba(174,198,213,0)');
  skyCtx.fillStyle=moonGlow;skyCtx.fillRect(660,50,200,200);
  skyCtx.fillStyle='rgba(222,229,231,.72)';skyCtx.beginPath();skyCtx.arc(760,150,7,0,Math.PI*2);skyCtx.fill();
  for(let i=0;i<105;i++){
    const x=skyRand()*1024,y=skyRand()*205,r=.35+skyRand()*.9;
    skyCtx.fillStyle='rgba(218,230,241,'+(.16+skyRand()*.38)+')';skyCtx.beginPath();skyCtx.arc(x,y,r,0,Math.PI*2);skyCtx.fill();
  }
  skyTexture.update(false);skyTexture.coordinatesMode=B.Texture.SPHERICAL_MODE;
  skyTexture.wrapU=skyTexture.wrapV=B.Texture.WRAP_ADDRESSMODE;
  const skyMaterial=new B.StandardMaterial('continuous spherical blue-hour sky material',scene);
  skyMaterial.backFaceCulling=false;skyMaterial.disableLighting=true;skyMaterial.emissiveTexture=skyTexture;
  skyMaterial.diffuseColor=new C(0,0,0);skyMaterial.specularColor=new C(0,0,0);
  const skybox=B.MeshBuilder.CreateSphere('continuous blue-hour sky atmosphere',{diameter:180,segments:mobile?20:32},scene);
  skybox.material=skyMaterial;skybox.infiniteDistance=true;skybox.isPickable=false;skybox.checkCollisions=false;skybox.applyFog=false;skybox.renderingGroupId=0;
  skybox.computeWorldMatrix(true);skybox.freezeWorldMatrix();


  // Beyond the playable quarter, a layered real-city silhouette replaces the
  // empty void: rooflines, apartment blocks and scattered occupied windows fade into rain haze.
  const farMasonry=mat('distant rain-dark city masonry','#303c48',.94);
  const farRoof=mat('distant slate roof silhouettes','#1c2936',.92);
  const farGlass=mat('distant unlit apartment windows','#182b3a',.42,.12);
  const farLit=mat('distant occupied windows','#b8794d',.48);
  if(farLit.emissiveColor)farLit.emissiveColor=new C(.22,.075,.025);
  const distantBlock=(name,x,z,w,d,h,face)=>{
    box(name+' silhouette',x,h/2,z,w,h,d,farMasonry,false,false);
    box(name+' roofline',x,h+.12,z,w+.5,.24,d+.5,farRoof,false,false);
    const side=face==='west'?-1:1,fx=x+side*(w/2+.025);
    for(let level=1;level<=Math.floor(h/2.8);level++){
      const y=level*2.55;
      for(let n=0;n<Math.max(2,Math.floor(d/3.2));n++){
        const zz=z-d*.42+n*(d*.84/Math.max(1,Math.floor(d/3.2)-1));
        box(name+' distant window frame',fx,y,zz,.035,1.05,1.15,farRoof,false,false);
        if((n+level+Math.round(x))%4===0)box(name+' distant lit window',fx+side*.025,y,zz,.025,.72,.76,farLit,false,false);
        else box(name+' distant dark window',fx+side*.025,y,zz,.025,.82,.86,farGlass,false,false);
      }
    }
  };
  [
    ['north apartment skyline',-39,-57,18,9,17,'east'],
    ['north office skyline',-13,-61,13,10,24,'east'],
    ['north residential skyline',13,-59,19,11,15,'west'],
    ['north tower silhouette',40,-63,12,12,29,'west'],
    ['south apartment skyline',-42,57,15,10,20,'east'],
    ['south warehouse skyline',-17,61,20,12,13,'east'],
    ['south residential skyline',12,59,16,11,19,'west'],
    ['south tower silhouette',40,62,14,10,25,'west'],
    ['west skyline blocks',-61,-25,10,17,18,'east'],
    ['west skyline blocks',-64,10,11,19,23,'east'],
    ['east skyline blocks',61,-22,10,16,21,'west'],
    ['east skyline blocks',64,15,11,18,16,'west']
  ].forEach(args=>distantBlock(...args));

  // A single planar reflection pass gives the wet street and canal real building/light reflections.
  // It is deliberately low-resolution and refreshed less often on phones.
  let wetMirror=null;
  if(B.MirrorTexture){
    wetMirror=new B.MirrorTexture('rain-soaked street planar reflections',new B.Vector2(mobile?256:768,mobile?256:768),scene,true);
    wetMirror.mirrorPlane=new B.Plane(0,1,0,-.025);
    wetMirror.level=mobile?.5:.64;
    wetMirror.blurKernel=mobile?10:14;
    wetMirror.refreshRate=mobile?4:2;
    wetMirror.renderList=scene.meshes.slice(mapStart).filter(mesh=>{
      if(mesh.name.includes('water')||mesh.name.includes('puddle')||mesh.name.includes('cobblestone')||mesh.name.includes('canal bed')||mesh.name.includes('sky atmosphere'))return false;
      mesh.computeWorldMatrix(true);
      return mesh.getBoundingInfo().boundingBox.maximumWorld.y>.35;
    });
    cobble.reflectionTexture=wetMirror;
    water.reflectionTexture=wetMirror;
    puddle.reflectionTexture=wetMirror;
  }


  // SECOND-PASS ENVIRONMENT DETAIL: readable street infrastructure and evidence
  // of long-term use. These are static, non-colliding props; gameplay bounds stay intact.
  const acHousing=mat('weathered rooftop AC enamel','#59656a',.62,.28);
  const acGrille=mat('AC fan grille dark steel','#202a30',.48,.62);
  const runoff=mat('old rain runoff streaks','#17242e',.96);
  const cableMat=mat('overhead utility cable rubber','#101820',.74,.18);
  const litterMat=mat('wet paper and street debris','#77736a',.94);
  const brokenStone=mat('broken limestone chips','#69717a',.96);
  const rippleMat=mat('puddle ripple highlights','#8da9b7',.2,.12);

  // Individual wall-mounted air conditioners: casing, fan guard, drain hose and
  // dirty runoff beneath each unit give the facades believable scale.
  const acSites=[
    [-25,-32,'west'],[-20,-5,'west'],[-26,17,'west'],[-17,35,'west'],
    [25,-32,'east'],[27,-7,'east'],[21,17,'east'],[27,36,'east']
  ];
  for(const [x,z,side] of acSites){
    const faceX=x+(side==='west'?-1:1)*.42,dir=side==='west'?-1:1;
    box('wall mounted AC compressor',faceX,5.05,z,1.18,.68,.72,acHousing,false);
    box('AC front grille bezel',faceX+dir*.38,5.05,z,.055,.48,.52,iron,false);
    const fan=B.MeshBuilder.CreateCylinder('AC fan rotor housing',{diameter:.34,height:.045,tessellation:20},scene);
    fan.position.set(faceX+dir*.42,5.05,z);fan.rotation.z=Math.PI/2;fan.material=acGrille;fan.isPickable=false;
    for(let k=0;k<5;k++){
      const fin=box('AC ventilation fin',faceX+dir*.455,4.86+k*.095,z,.025,.025,.44,trim,false);
      fin.isPickable=false;
    }
    const hose=B.MeshBuilder.CreateTube('AC condensate drain hose',{path:[
      new B.Vector3(faceX+dir*.28,4.7,z+.28),
      new B.Vector3(faceX+dir*.34,4.25,z+.3),
      new B.Vector3(faceX+dir*.38,4.12,z+.3)
    ],radius:.035,tessellation:6},scene);
    hose.material=iron;hose.isPickable=false;
    box('AC dirty runoff stain',faceX+dir*.03,3.62,z+.36,.52,1.1,.025,runoff,false);
  }

  // Sagging bundled telecom/power lines connect opposite street elevations.
  // The low-poly tube count is deliberately capped for mobile GPU budgets.
  const wireSpans=[-25,-2,21];
  for(let i=0;i<wireSpans.length;i++){
    const z=wireSpans[i];
    for(let strand=0;strand<(mobile?1:2);strand++){
      const offset=strand*.22;
      const wire=B.MeshBuilder.CreateTube('sagging overhead utility cable',{
        path:[
          new B.Vector3(-12,7.35-offset,z),
          new B.Vector3(-7,6.85-offset,z+.35),
          new B.Vector3(0,6.58-offset,z+.62),
          new B.Vector3(7,6.85-offset,z+.35),
          new B.Vector3(12,7.35-offset,z)
        ],radius:.018,tessellation:5},scene);
      wire.material=cableMat;wire.isPickable=false;
    }
  }
  // Junction boxes and ceramic insulators make the cable runs look attached,
  // rather than floating decorative lines.
  for(const [x,z] of [[-11.8,-25],[-11.8,-2],[-11.8,21],[11.8,-25],[11.8,-2],[11.8,21]]){
    box('utility cable junction box',x,7.08,z,.34,.48,.28,iron,false);
    for(let n=0;n<2;n++){
      const insulator=B.MeshBuilder.CreateCylinder('porcelain cable insulator',{diameter:.11,height:.18,tessellation:8},scene);
      insulator.position.set(x+(x<0?.23:-.23),7.32,z+n*.16-.08);
      insulator.rotation.z=Math.PI/2;insulator.material=trim;insulator.isPickable=false;
    }
  }

  // Fine wet debris sits against kerbs and walls, not in the centre of combat lanes.
  let debrisSeed=48271;
  const debrisRand=()=>((debrisSeed=(debrisSeed*1664525+1013904223)>>>0)/4294967296);
  const debrisCount=mobile?22:46;
  for(let i=0;i<debrisCount;i++){
    const side=i%2===0?-1:1;
    const x=side*(5.8+debrisRand()*2.0),z=-38+debrisRand()*76;
    const width=.12+debrisRand()*.34,height=.018+debrisRand()*.025,depth=.1+debrisRand()*.28;
    const shard=box('kerbside wet paper rubble',x,.085,z,width,height,depth,i%3===0?brokenStone:litterMat,false);
    shard.rotation.y=debrisRand()*Math.PI;
    shard.rotation.x=(debrisRand()-.5)*.08;
  }
  // A few concentric water rings catch lantern highlights and make puddles read
  // as shallow liquid rather than dark flat decals.
  for(const [x,z,d] of [[-4,-35,.86],[4,-29,.62],[-3,-18,.74],[4,-11,.56],[-4,-4,.82],[3,7,.64],[-4,16,.72],[4,25,.58]]){
    const ring=B.MeshBuilder.CreateTorus('subtle rain puddle ripple',{diameter:d,thickness:.012,tessellation:24},scene);
    ring.position.set(x,.078,z);ring.rotation.x=Math.PI/2;ring.material=rippleMat;ring.isPickable=false;
  }

  // The facility entrance is visibly identifiable from the street approach.
  const bioSign=mat('biosecure entrance sign face','#162a32',.38,.24);
  const bioSignTexture=new B.DynamicTexture('BIOSECURE facility entrance lettering',{width:512,height:128},scene,false);
  const bioCtx=bioSignTexture.getContext();
  bioCtx.fillStyle='#14232b';bioCtx.fillRect(0,0,512,128);
  bioCtx.strokeStyle='#c89b59';bioCtx.lineWidth=5;bioCtx.strokeRect(7,7,498,114);
  bioCtx.fillStyle='#e4c58e';bioCtx.font='bold 42px Arial';bioCtx.textAlign='center';bioCtx.textBaseline='middle';
  bioCtx.fillText('BIOSECURE  /  RESEARCH',256,49);
  bioCtx.fillStyle='#9fb5ba';bioCtx.font='bold 19px Arial';bioCtx.fillText('AUTHORIZED PERSONNEL ONLY',256,91);
  bioSignTexture.update(false);bioSign.diffuseTexture=bioSignTexture;bioSign.emissiveTexture=bioSignTexture;bioSign.disableLighting=true;
  const facilitySign=box('readable biosecure facility entrance sign',0,5.45,35.28,6.2,1.45,.08,bioSign,false);
  facilitySign.isPickable=false;
  const warning=box('biohazard warning plaque',-4.15,3.65,35.28,.82,.82,.08,labAmber,false);
  warning.isPickable=false;
  box('facility sign rain hood',0,6.24,35.18,6.55,.12,.42,iron,false);

  const staticMeshes=[...colliders,...merged],materials=new Set();
  for(const m of staticMeshes){
    m.computeWorldMatrix(true);m.freezeWorldMatrix();
    if(m.material&&!materials.has(m.material)){materials.add(m.material);m.material.freeze?.();}
    if(!mobile)shadowGen.addShadowCaster(m);
  }
  return {name:'Wet Ground',theme:'rainy-blue-hour',riverCrossings:[-20,20],staticMeshCount:staticMeshes.length,mergedMaterialGroups:groups.size};
}
