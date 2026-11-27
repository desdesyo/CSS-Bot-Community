export const DUST2_EXPANDED = Object.freeze({
  width:224, depth:184, halfWidth:112, halfDepth:92,
  spawns:{ct:{x:0,z:-77},t:{x:0,z:77}},
  sites:{A:{x:-78,z:0},B:{x:78,z:0}},
  graph:{
    CT:[["NORTH",30]], T:[["SOUTH",30]],
    NORTH:[["CT",30],["MID",28],["A_UPPER",46]],
    SOUTH:[["T",30],["MID",28],["B_LOWER",46]],
    MID:[["NORTH",28],["SOUTH",28],["A",34],["B",34]],
    A:[["MID",34],["A_UPPER",24]], B:[["MID",34],["B_LOWER",24]],
    A_UPPER:[["NORTH",46],["A",24]], B_LOWER:[["SOUTH",46],["B",24]]
  },
  blockers:[
    [-111,0,1,91],[111,0,1,91],[0,-91,111,1],[0,91,111,1],
    [-42,-30,1.2,24],[-42,30,1.2,24],[42,-30,1.2,24],[42,30,1.2,24],
    [-76,-35,24,1.2],[-76,35,24,1.2],[76,-35,24,1.2],[76,35,24,1.2],
    [-22,-55,1.2,17],[22,-55,1.2,17],[-22,55,1.2,17],[22,55,1.2,17],
    [-65,-8,1.2,20],[65,-8,1.2,20],[-91,-8,1.2,22],[91,-8,1.2,22],
    [-50,0,10,1.2],[50,0,10,1.2],
    [-16,-18,1.2,9],[16,-18,1.2,9],[-16,18,1.2,9],[16,18,1.2,9],
    [-78,-8,8,1.2],[78,-8,8,1.2]
  ],
  botRoutes:[
    [[-8,-77],[-8,-58],[-8,-30],[-8,0],[-34,0],[-62,0]],
    [[8,-77],[8,-58],[8,-30],[8,0],[34,0],[62,0]],
    [[-12,77],[-12,58],[-12,30],[-12,0],[-38,0],[-66,0]],
    [[12,77],[12,58],[12,30],[12,0],[38,0],[66,0]],
    [[-92,-12],[-82,-12],[-70,-12],[-58,-12],[-38,-12],[-12,-12],[12,-12],[38,-12],[58,-12],[70,-12],[82,-12],[92,-12]],
    [[92,12],[82,12],[70,12],[58,12],[38,12],[12,12],[-12,12],[-38,12],[-58,12],[-70,12],[-82,12],[-92,12]]
  ]
});
export function shortestPath(graph,start,end){
  const dist=Object.fromEntries(Object.keys(graph).map(k=>[k,Infinity]));dist[start]=0;const seen=new Set();
  while(seen.size<Object.keys(graph).length){let node=null,best=Infinity;for(const [k,d] of Object.entries(dist))if(!seen.has(k)&&d<best){node=k;best=d;}if(node===null)break;if(node===end)return best;seen.add(node);for(const [next,cost] of graph[node])if(dist[next]>best+cost)dist[next]=best+cost;}
  return dist[end];
}
export function validateDust2Balance(layout=DUST2_EXPANDED){
  const issues=[],travel={};
  for(const site of ["A","B"]){const ct=shortestPath(layout.graph,"CT",site),t=shortestPath(layout.graph,"T",site);travel[site]={ct,t};if(!Number.isFinite(ct)||!Number.isFinite(t)||Math.abs(ct-t)>.001)issues.push({site,ct,t});}
  if(layout.width*layout.depth!==4*112*92)issues.push({area:layout.width*layout.depth});
  return {ok:issues.length===0,issues,travel};
}
export function isDust2Blocked(x,z,layout=DUST2_EXPANDED){
  if(Math.abs(x)>layout.halfWidth-2||Math.abs(z)>layout.halfDepth-2)return true;
  return layout.blockers.some(([cx,cz,hw,hd])=>Math.abs(x-cx)<hw+.38&&Math.abs(z-cz)<hd+.38);
}