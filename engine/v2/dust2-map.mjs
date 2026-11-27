import { DUST2_EXPANDED } from './dust2-layout.mjs';
export { DUST2_EXPANDED };
export function buildExpandedDust2(B,scene,shadowGen,mat,box){
  const stone=mat('Dust2 sunbaked sandstone','#b69a72',.94),pale=mat('Dust2 limestone','#d0bd96',.9),plaster=mat('Dust2 worn plaster','#a88e6c',.92),dark=mat('Dust2 shaded stone','#655b4c',.96),metal=mat('Dust2 dark metal','#343a39',.55,.45),crate=mat('Dust2 shipping crate','#766044',.88),siteA=mat('A site marking','#b58b4f',.9),siteB=mat('B site marking','#9d7650',.9);
  const ground=B.MeshBuilder.CreateGround('dust2-expanded-ground',{width:224,height:184,subdivisions:4},scene);ground.material=stone;ground.receiveShadows=true;
  const wall=(n,x,z,w,d,h=7,m=plaster)=>box(n,x,h/2,z,w,h,d,m);
  const floor=(n,x,z,w,d,m=pale)=>{const p=B.MeshBuilder.CreateGround(n,{width:w,height:d},scene);p.position.set(x,.018,z);p.material=m;p.receiveShadows=true;return p;};
  wall('north perimeter',0,-91,224,2,8,stone);wall('south perimeter',0,91,224,2,8,stone);wall('west perimeter',-111,0,2,182,8,stone);wall('east perimeter',111,0,2,182,8,stone);
  floor('mid plaza',0,0,54,38,pale);wall('mid west screen',-27,0,2,22,6,stone);wall('mid east screen',27,0,2,22,6,stone);wall('mid north offset',-20,-24,2,16,6,plaster);wall('mid south offset',20,24,2,16,6,plaster);
  floor('A long approach',-72,-4,52,28,pale);floor('A site courtyard',-83,-4,34,34,siteA);wall('A outer north',-78,-23,48,2,7,stone);wall('A outer south',-78,15,48,2,7,stone);wall('A site west',-101,-4,2,38,7,stone);wall('A site inner divider',-58,-4,2,18,5,plaster);wall('A ramp side north',-49,-31,2,26,5,plaster);wall('A ramp side south',-49,1,2,26,5,plaster);floor('A upper catwalk',-70,-43,54,12,dark);wall('A catwalk rail',-70,-50,54,1,2,metal);
  floor('B lower approach',72,4,52,28,pale);floor('B site courtyard',83,4,34,34,siteB);wall('B outer north',78,-15,48,2,7,stone);wall('B outer south',78,23,48,2,7,stone);wall('B site east',101,4,2,38,7,stone);wall('B site inner divider',58,4,2,18,5,plaster);floor('B lower tunnel',70,43,50,12,dark);wall('B tunnel south',70,50,50,1,5,stone);
  floor('CT spawn courtyard',0,-77,48,24,pale);floor('T spawn courtyard',0,77,48,24,pale);
  for(const z of [-77,77]){wall('spawn west wing',-26,z,2,26,6,stone);wall('spawn east wing',26,z,2,26,6,stone);wall('spawn back',0,z+(z<0?-13:13),54,2,7,stone);}
  floor('north connector',0,-39,26,30,plaster);floor('south connector',0,39,26,30,plaster);
  wall('north connector west',-14,-39,1.5,30,5,stone);wall('north connector east',14,-39,1.5,30,5,stone);wall('south connector west',-14,39,1.5,30,5,stone);wall('south connector east',14,39,1.5,30,5,stone);
  const cover=[[-92,-11,5,2,2.4],[-92,3,5,2,2.4],[-72,-9,4,4,1.8],[-72,9,4,4,1.8],[92,-3,5,2,2.4],[92,11,5,2,2.4],[72,-1,4,4,1.8],[72,17,4,4,1.8],[-8,-10,5,2,1.5],[8,10,5,2,1.5],[-8,10,5,2,1.5],[8,-10,5,2,1.5],[-18,-59,5,3,2.2],[18,-59,5,3,2.2],[-18,59,5,3,2.2],[18,59,5,3,2.2],[-82,-42,5,3,2.2],[-82,34,5,3,2.2],[82,-34,5,3,2.2],[82,42,5,3,2.2]];
  for(const [x,z,w,d,h] of cover)box('sandstone cover',x,h/2,z,w,h,d,crate);
  for(const [x,z,m] of [[-83,-4,siteA],[83,4,siteB]]){const p=B.MeshBuilder.CreateGround('bombsite floor',{width:10,height:10},scene);p.position.set(x,.04,z);p.material=m;}
  for(const x of [-96,-64,64,96])box('courtyard pillar',x,3,-4,1.4,6,1.4,stone);
  const fill=new B.HemisphericLight('Dust2 sky bounce',new B.Vector3(0,1,0),scene);fill.intensity=.52;fill.diffuse=new B.Color3(.92,.82,.68);fill.groundColor=new B.Color3(.27,.24,.2);
  for(const [x,y,z] of [[-70,3,43],[70,3,-43],[0,3,0]]){const l=new B.PointLight('Dust2 tunnel lamp',new B.Vector3(x,y,z),scene);l.diffuse=new B.Color3(.92,.72,.48);l.intensity=.34;l.range=24;}
  return {spawns:DUST2_EXPANDED.spawns,sites:DUST2_EXPANDED.sites,botRoutes:DUST2_EXPANDED.botRoutes};
}