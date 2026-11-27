import { DUST2_EXPANDED } from './dust2-layout.mjs';
export { DUST2_EXPANDED };

// World scale: one Babylon unit represents one metre. Openings follow common
// architectural proportions: doors 0.95 x 2.10 m; windows 1.20 x 1.00 m
// with a 0.90 m sill; ground floors 3.2 m; upper floors 2.9 m.
export const DUST2_SCALE = Object.freeze({
  metresPerUnit:1, door:{width:.95,height:2.1}, window:{width:1.2,height:1.0,sill:.9},
  floorHeight:3.2, upperFloorHeight:2.9, humanHeight:1.8
});
export function buildExpandedDust2(B,scene,shadowGen,mat,box){
  const stone=mat('Dust2 sunbaked sandstone','#b69a72',.94),pale=mat('Dust2 limestone','#d0bd96',.9),plaster=mat('Dust2 worn plaster','#a88e6c',.92),dark=mat('Dust2 shaded stone','#655b4c',.96),metal=mat('Dust2 dark metal','#343a39',.55,.45),crate=mat('Dust2 shipping crate','#766044',.88),siteA=mat('A site marking','#b58b4f',.9),siteB=mat('B site marking','#9d7650',.9);
  const trim=mat('Carved limestone trim','#e0cba5',.9),wood=mat('Weathered cedar','#65452f',.9),glass=mat('Dusty blue window glass','#526a70',.22,.28),shadow=mat('Deep opening shadow','#282a27',1),roof=mat('Flat roof concrete','#8e8069',.95),cloth=mat('Faded market fabric','#a35f3e',.92),paint=mat('Faded blue paint','#637c80',.85);
  const ground=B.MeshBuilder.CreateGround('dust2-expanded-ground',{width:224,height:184,subdivisions:4},scene);ground.material=stone;ground.receiveShadows=true;
  const wall=(n,x,z,w,d,h=7,m=plaster)=>box(n,x,h/2,z,w,h,d,m);
  const floor=(n,x,z,w,d,m=pale)=>{const p=B.MeshBuilder.CreateGround(n,{width:w,height:d},scene);p.position.set(x,.018,z);p.material=m;p.receiveShadows=true;return p;};
  const slab=(n,x,y,z,w,h,d,m)=>box(n,x,y,z,w,h,d,m);
  // Facade assembled around a real aperture. The wall is not painted with a fake door:
  // jambs, lintel, sill, recessed panel and frame are separate scaled architectural pieces.
  function doorway(n,x,z,face='north',m=plaster){
    const W=.95,H=2.1,T=.28,side=face==='north'||face==='south'?'z':'x',sgn=face==='north'?-1:1;
    const along=side==='z'?'x':'z';
    const put=(name,ax,ay,az,w,h,d,material)=>slab(n+' '+name,ax,ay,az,w,h,d,material);
    if(side==='z'){
      put('door left pier',x-W/2-T/2,1.6,z,T,3.2,.34,m);put('door right pier',x+W/2+T/2,1.6,z,T,3.2,.34,m);
      put('door lintel',x,2.62,z,W+2*T,1.16,.36,m);
      put('door recessed shadow',x,1.03,z+sgn*.19,W,.08,.035,shadow);
      put('wood door leaf',x,1.03,z+sgn*.22,W-.1,2.02,.07,wood);
      put('door stone threshold',x,.06,z,W+.18,.12,.55,trim);
      put('door upper transom',x,2.34,z,W,.24,.12,wood);
      put('door handle',x+W*.34,1.05,z+sgn*.28,.045,.12,.035,metal);
    }else{
      put('door left pier',x,1.6,z-W/2-T/2,.34,3.2,T,m);put('door right pier',x,1.6,z+W/2+T/2,.34,3.2,T,m);
      put('door lintel',x,2.62,z,.36,1.16,W+2*T);
      put('door recessed shadow',x+sgn*.19,1.03,z,.035,.08,W,shadow);
      put('wood door leaf',x+sgn*.22,1.03,z,.07,2.02,W-.1,wood);
      put('door stone threshold',x,.06,z,.55,.12,W+.18,trim);
      put('door handle',x+sgn*.28,1.05,z+W*.34,.035,.12,.045,metal);
    }
  }
  function window(n,x,z,face='north',m=plaster,centerY=1.4){
    const W=1.2,H=1.0,S=.9,T=.16;
    const front=face==='north'||face==='south',sgn=face==='north'?-1:1;
    if(front){
      slab(n+' left reveal',x-W/2-T/2,centerY+.15,z,T,1.8,.34,m);slab(n+' right reveal',x+W/2+T/2,centerY+.15,z,T,1.8,.34,m);
      slab(n+' upper reveal',x,centerY+1.03,z,W+2*T,.32,.34,m);slab(n+' lower sill',x,centerY-.58,z,W+2*T,.24,.52,trim);
      slab(n+' dark recess',x,centerY,z+sgn*.18,W,1,.035,shadow);slab(n+' glass',x,centerY,z+sgn*.21,W-.12,.88,.025,glass);
      slab(n+' vertical mullion',x,centerY,z+sgn*.25,.055,.9,.035,trim);slab(n+' horizontal mullion',x,1.4,z+sgn*.25,W-.08,.055,.035,trim);
      slab(n+' shutter left',x-W/2-.17,centerY+.05,z+sgn*.24,.22,1.18,.09,wood);slab(n+' shutter right',x+W/2+.17,1.45,z+sgn*.24,.22,1.18,.09,wood);
    }else{
      slab(n+' left reveal',x,centerY+.15,z-W/2-T/2,.34,1.8,T,m);slab(n+' right reveal',x,centerY+.15,z+W/2+T/2,.34,1.8,T,m);
      slab(n+' upper reveal',x,centerY+1.03,z,.34,.32,W+2*T,m);slab(n+' lower sill',x,centerY-.58,z,.52,.24,W+2*T,trim);
      slab(n+' dark recess',x+sgn*.18,centerY,z,.035,1,W,shadow);slab(n+' glass',x+sgn*.21,centerY,z,.025,.88,W-.12,glass);
      slab(n+' vertical mullion',x+sgn*.25,centerY,z,.035,.9,.055,trim);slab(n+' horizontal mullion',x+sgn*.25,1.4,z,.035,.055,W-.08,trim);
      slab(n+' shutter left',x+sgn*.24,centerY+.05,z-W/2-.17,.09,1.18,.22,wood);slab(n+' shutter right',x+sgn*.24,centerY+.05,z+W/2+.17,.09,1.18,.22,wood);
    }
  }
  function arch(n,x,z,axis='x',width=2.6,height=2.8,depth=.55,m=stone){
    // Rectangular jambs plus segmented voussoirs form a readable masonry arch.
    const half=width/2,th=.34;
    if(axis==='x'){
      slab(n+' left jamb',x-half-.0,height/2,z,th,height,depth,m);slab(n+' right jamb',x+half,height/2,z,th,height,depth,m);
      slab(n+' arch crown',x,height-.18,z,width+th,.36,depth,trim);
      for(let i=0;i<7;i++){const xx=x-half+(i+.5)*width/7;slab(n+' voussoir '+i,xx,height-.42,z,width/7-.025,.42,depth,trim);}
    }else{
      slab(n+' left jamb',x,height/2,z-half,depth,height,th,m);slab(n+' right jamb',x,height/2,z+half,depth,height,th,m);
      slab(n+' arch crown',x,height-.18,z,depth,.36,width+th,trim);
      for(let i=0;i<7;i++){const zz=z-half+(i+.5)*width/7;slab(n+' voussoir '+i,x,height-.42,zz,depth,.42,width/7-.025,trim);}
    }
  }
  function building(n,x,z,w,d,floors=1,opts={}){
    const h=floors===1?3.2:6.1,th=.42,front=opts.front||'south',m=opts.material||plaster;
    // Solid side/rear shell; front is assembled with actual openings.
    slab(n+' left wall',x-w/2+th/2,h/2,z,th,h,d,m);slab(n+' right wall',x+w/2-th/2,h/2,z,th,h,d,m);
    slab(n+' rear wall',x,h/2,z+(front==='south'?-d/2+th/2:d/2-th/2),w,h,th,m);
    const fz=z+(front==='south'?d/2-th/2:-d/2+th/2),sgn=front==='south'?1:-1;
    // Ground-floor wall piers leave door and window voids at believable human scale.
    const doorX=x-w*.22,windowX=x+w*.22,doorW=1.55,windowW=1.55;
    const left=x-w/2+th,right=x+w/2-th;
    // Ground facade wall panels stop at the real door/window openings.
    const spans=[[left,doorX-doorW/2],[doorX+doorW/2,windowX-windowW/2],[windowX+windowW/2,right]];
    for(let i=0;i<spans.length;i++){const [a,b]=spans[i];if(b>a+.05)slab(n+' ground facade panel '+i,(a+b)/2,1.6,fz,b-a,3.2,th,m);}
    doorway(n+' entrance',doorX,fz,front,m);
    window(n+' ground window',windowX,fz,front,m);
    if(floors>1){
      slab(n+' upper floor',x,3.35,z,w+.3,.3,d+.3,trim);
      const upperY=4.8,upperBase=3.2,upperTop=6.1,winW=1.55;
      const upperWindows=[x-w*.23,x+w*.23],upperSpans=[[left,upperWindows[0]-winW/2],[upperWindows[0]+winW/2,upperWindows[1]-winW/2],[upperWindows[1]+winW/2,right]];
      for(let i=0;i<upperSpans.length;i++){const [a,b]=upperSpans[i];if(b>a+.05)slab(n+' upper facade panel '+i,(a+b)/2,upperY,fz,b-a,upperTop-upperBase,th,m);}
      for(const wx of upperWindows){window(n+' upper window',wx,fz,front,m,4.8);}
      slab(n+' balcony deck',x,3.55,fz+sgn*.85,w*.56,.18,1.25,stone);
      slab(n+' balcony rail',x,4.05,fz+sgn*1.4,w*.56,.08,.08,metal);
      for(let i=0;i<5;i++)slab(n+' balcony baluster '+i,x-w*.25+i*w*.125,3.82,fz+sgn*1.4,.045,.48,.045,metal);
      slab(n+' roof parapet front',x,h+.25,fz,w,.5,.35,roof);
      slab(n+' roof parapet back',x,h+.25,z-(front==='south'?-d/2:d/2),w,.5,.35,roof);
    }else{
      slab(n+' roof parapet front',x,h+.22,fz,w,.44,.34,roof);
      slab(n+' roof parapet back',x,h+.22,z-(front==='south'?-d/2:d/2),w,.44,.34,roof);
    }
    // Corner pilasters, stone belt course, roof coping.
    for(const sx of [-1,1])slab(n+' corner pilaster',x+sx*(w/2-.24),h/2,fz+sgn*.04,.24,h,.5,trim);
    slab(n+' cornice',x,h+.02,fz,w+.5,.22,.6,trim);
    const roofMesh=B.MeshBuilder.CreateBox(n+' flat roof',{width:w,height:.18,depth:d},scene);roofMesh.position.set(x,h+.02,z);roofMesh.material=roof;roofMesh.receiveShadows=true;
    // Roof service clutter: water tank, vent and small chimney.
    const tank=B.MeshBuilder.CreateCylinder(n+' rooftop water tank',{height:1.15,diameter:1.15,tessellation:10},scene);tank.position.set(x+w*.22,h+.72,z-d*.18);tank.material=metal;
    slab(n+' roof vent',x-w*.22,h+.48,z, .5,.75,.5,stone);
    return {x,z,w,d,h,front};
  }
  // Outer perimeter and playable floor.
  wall('north perimeter',0,-91,224,2,8,stone);wall('south perimeter',0,91,224,2,8,stone);wall('west perimeter',-111,0,2,182,8,stone);wall('east perimeter',111,0,2,182,8,stone);
  floor('mid plaza',0,0,54,38,pale);wall('mid west screen',-27,0,2,22,6,stone);wall('mid east screen',27,0,2,22,6,stone);wall('mid north offset',-20,-24,2,16,6,plaster);wall('mid south offset',20,24,2,16,6,plaster);
  floor('A long approach',-72,-4,52,28,pale);floor('A site courtyard',-83,-4,34,34,siteA);
  wall('A outer north',-78,-23,48,2,7,stone);wall('A outer south',-78,15,48,2,7,stone);wall('A site west',-101,-4,2,38,7,stone);wall('A site inner divider',-58,-4,2,18,5,plaster);wall('A ramp side north',-49,-31,2,26,5,plaster);wall('A ramp side south',-49,1,2,26,5,plaster);floor('A upper catwalk',-70,-43,54,12,dark);wall('A catwalk rail',-70,-50,54,1,2,metal);
  floor('B lower approach',72,4,52,28,pale);floor('B site courtyard',83,4,34,34,siteB);
  wall('B outer north',78,-15,48,2,7,stone);wall('B outer south',78,23,48,2,7,stone);wall('B site east',101,4,2,38,7,stone);wall('B site inner divider',58,4,2,18,5,plaster);floor('B lower tunnel',70,43,50,12,dark);wall('B tunnel south',70,50,50,1,5,stone);
  floor('CT spawn courtyard',0,-77,48,24,pale);floor('T spawn courtyard',0,77,48,24,pale);
  for(const z of [-77,77]){wall('spawn west wing',-26,z,2,26,6,stone);wall('spawn east wing',26,z,2,26,6,stone);wall('spawn back',0,z+(z<0?-13:13),54,2,7,stone);}
  floor('north connector',0,-39,26,30,plaster);floor('south connector',0,39,26,30,plaster);
  wall('north connector west',-14,-39,1.5,30,5,stone);wall('north connector east',14,-39,1.5,30,5,stone);wall('south connector west',-14,39,1.5,30,5,stone);wall('south connector east',14,39,1.5,30,5,stone);
  // Named architectural districts: low courtyard houses, two-storey market blocks,
  // industrial service buildings, arches, awnings, stair runs and street furniture.
  building('A old-town house',-91,-27,15,11,2,{front:'south',material:plaster});
  building('A market building',-68,-27,13,10,2,{front:'south',material:stone});
  building('A bombsite warehouse',-91,19,16,10,1,{front:'north',material:plaster});
  building('A long street shop',-94,-58,14,10,2,{front:'south',material:plaster});
  building('A upper terrace house',-62,-58,13,10,1,{front:'south',material:stone});
  building('B courtyard residence',91,31,15,11,2,{front:'north',material:plaster});
  building('B tunnel workshop',68,31,14,10,1,{front:'north',material:stone});
  building('B market block',94,59,15,10,2,{front:'north',material:plaster});
  building('B lower service house',61,59,13,10,1,{front:'north',material:stone});
  building('Mid checkpoint building',0,-57,14,9,1,{front:'south',material:plaster});
  building('Mid caravanserai',0,57,14,9,1,{front:'north',material:stone});
  arch('A long street arch',-78,-38,'x',3.2,3.1,.65,stone);
  arch('B lower tunnel arch',78,42,'x',3.2,3.1,.65,stone);
  arch('Mid passage arch',0,-19,'x',2.8,2.9,.6,stone);
  // Exterior staircases: visible treads, stringers and landings connect the upper terraces.
  function stairs(n,x,z,count=8,dir=1){
    for(let i=0;i<count;i++){const rise=(i+1)*.22,run=(i+.5)*.38;slab(n+' tread '+i,x, rise/2,z+dir*run,.95,rise,.42,trim);}
    slab(n+' landing',x,.22*count,z+dir*(count*.38+.65),1.8,.22,1.4,stone);
  }
  stairs('A terrace stairs',-57,-39,8,-1);stairs('B terrace stairs',57,39,8,1);
  // Fabric shop awnings and signage make building functions legible from the street.
  for(const [x,z,sgn,label] of [[-94,-51,1,'BAZAAR'],[-68,-20,1,'WORKSHOP'],[94,51,-1,'MARKET'],[68,24,-1,'DEPOT']]){
    slab(label+' awning',x,2.65,z+sgn*.9,4.8,.12,1.8,cloth);
    for(let i=-2;i<=2;i++)slab(label+' awning support',x+i*.95,2.2,z+sgn*1.65,.08,.9,.08,metal);
    slab(label+' signboard',x,3.05,z+sgn*.27,2.8,.55,.12,wood);
  }
  // Pipes, drain grates, utility boxes, lamps and stacked cargo.
  for(const [x,z] of [[-100,-42],[-60,-46],[100,42],[60,46]]){
    const pipe=B.MeshBuilder.CreateCylinder('exposed drain pipe',{height:4.8,diameter:.12,tessellation:8},scene);pipe.position.set(x,2.4,z);pipe.material=metal;
    slab('electrical junction box',x+.35,1.5,z,.55,.7,.32,paint);
    const lamp=B.MeshBuilder.CreateBox('wall lantern',{width:.25,height:.34,depth:.22},scene);lamp.position.set(x,2.8,z-.35);lamp.material=glass;
  }
  for(const [x,z] of [[-88,-5],[-73,5],[88,5],[73,-5],[-8,-7],[8,7]]){
    slab('wood cargo crate',x,.55,z,1.1,1.1,1.1,crate);slab('crate top band',x,1.08,z,1.14,.08,1.14,wood);
  }
  // Cover objects and readable bombsite pads.
  const cover=[[-92,-11,5,2,2.4],[-92,3,5,2,2.4],[-72,-9,4,4,1.8],[-72,9,4,4,1.8],[92,-3,5,2,2.4],[92,11,5,2,2.4],[72,-1,4,4,1.8],[72,17,4,4,1.8],[-8,-10,5,2,1.5],[8,10,5,2,1.5],[-8,10,5,2,1.5],[8,-10,5,2,1.5],[-18,-59,5,3,2.2],[18,-59,5,3,2.2],[-18,59,5,3,2.2],[18,59,5,3,2.2],[-82,-42,5,3,2.2],[-82,34,5,3,2.2],[82,-34,5,3,2.2],[82,42,5,3,2.2]];
  for(const [x,z,w,d,h] of cover)box('sandstone cover',x,h/2,z,w,h,d,crate);
  for(const [x,z,m] of [[-83,-4,siteA],[83,4,siteB]]){const p=B.MeshBuilder.CreateGround('bombsite floor',{width:10,height:10},scene);p.position.set(x,.04,z);p.material=m;}
  const fill=new B.HemisphericLight('Dust2 sky bounce',new B.Vector3(0,1,0),scene);fill.intensity=.52;fill.diffuse=new B.Color3(.92,.82,.68);fill.groundColor=new B.Color3(.27,.24,.2);
  for(const [x,y,z] of [[-70,3,43],[70,3,-43],[0,3,0]]){const l=new B.PointLight('Dust2 tunnel lamp',new B.Vector3(x,y,z),scene);l.diffuse=new B.Color3(.92,.72,.48);l.intensity=.34;l.range=24;}
  return {spawns:DUST2_EXPANDED.spawns,sites:DUST2_EXPANDED.sites,botRoutes:DUST2_EXPANDED.botRoutes};
}
