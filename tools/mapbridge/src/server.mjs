import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer as createHttpServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.CSSBC_MAP_ROOT || ".");
const mapsDir = path.join(root, "maps", "ModernDistrict");
function createMapBridgeServer(){
const server = new McpServer({ name: "CSSBC MapBridge", version: "0.3.0" });
const safeName = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const vec = z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
const material = z.string().min(1).max(128).default("TOOLS/TOOLSNODRAW");
const fmt = p => p.map(n=>Number(n.toFixed(3))).join(" ");
const esc = s => String(s).replaceAll("\\","\\\\").replaceAll('"','\\"');
const fileFor = name => path.join(mapsDir,name+".vmf");
async function readMap(name){const f=fileFor(name);return [f,await fs.readFile(f,"utf8")];}
function nextId(vmf){return Math.max(1,...[...vmf.matchAll(/"id"\s+"(\d+)"/g)].map(m=>+m[1]))+1;}
function brush(id,lo,hi,mat){
 const [x1,y1,z1]=lo,[x2,y2,z2]=hi;
 if(!(x1<x2&&y1<y2&&z1<z2))throw Error("Invalid bounds: min must be less than max on all axes");
 const faces=[
 [[x1,y1,z1],[x1,y2,z1],[x1,y2,z2]],[[x2,y2,z2],[x2,y2,z1],[x2,y1,z1]],
 [[x1,y1,z1],[x2,y1,z1],[x2,y1,z2]],[[x2,y2,z2],[x1,y2,z2],[x1,y2,z1]],
 [[x1,y2,z1],[x2,y2,z1],[x2,y2,z2]],[[x2,y1,z2],[x1,y1,z2],[x1,y1,z1]]];
 return `solid
 {
  "id" "${id}"
${faces.map((f,i)=>`  side
  {
   "id" "${id+i+1}"
   "plane" "(${fmt(f[0])}) (${fmt(f[1])}) (${fmt(f[2])})"
   "material" "${esc(mat)}"
   "uaxis" "[1 0 0 0] 0.25"
   "vaxis" "[0 -1 0 0] 0.25"
   "rotation" "0"
   "lightmapscale" "16"
   "smoothing_groups" "0"
  }`).join("\n")}
 }`;
}
function entity(id,classname,kv={}){return `entity
{
 "id" "${id}"
 "classname" "${esc(classname)}"
${Object.entries(kv).map(([k,v])=>` "${esc(k)}" "${esc(v)}"`).join("\n")}
}`;}
function insertWorld(vmf,parts){
 const m=vmf.match(/world\s*\{[\s\S]*?\n\}/);if(!m)throw Error("VMF world block not found");
 return vmf.replace(m[0],m[0].slice(0,-1)+"\n"+parts.join("\n")+"\n}");
}
function insertEntities(vmf,parts){
 if(!parts.length)return vmf;
 const world=vmf.match(/world\s*\{[\s\S]*?\n\}/);
 if(!world)throw Error("VMF world block not found");
 const end=world.index+world[0].length;
 return vmf.slice(0,end)+"\n"+parts.join("\n")+"\n"+vmf.slice(end);
}
function appendObjects(vmf,solids,entities=[]){
 return insertEntities(insertWorld(vmf,solids),entities);
}
function header(){return `versioninfo
{
 "editorversion" "400"
 "editorbuild" "0"
 "mapversion" "1"
 "formatversion" "100"
 "prefab" "0"
}
visgroups
{
}
viewsettings
{
 "bSnapToGrid" "1"
 "bShowGrid" "1"
 "bShowLogicalGrid" "0"
 "nGridSpacing" "64"
 "bShow3DGrid" "0"
}
world
{
 "id" "1"
 "classname" "worldspawn"
 "mapversion" "1"
 "skyname" "sky_day01_01"
 "detailmaterial" "detail/detailsprites"
 "detailvbsp" "detail.vbsp"
 "maxpropscreenwidth" "-1"
}
`;}
async function save(f,s){await fs.writeFile(f,s,"utf8");}
function append(vmf,solids){return insertWorld(vmf,solids);}

server.tool("map_create","Create a VMF in maps/ModernDistrict.",{name:safeName,overwrite:z.boolean().default(false)},async({name,overwrite})=>{
 await fs.mkdir(mapsDir,{recursive:true});const f=fileFor(name);
 try{await fs.access(f);if(!overwrite)throw Error("Map exists; set overwrite=true");}catch(e){if(e.message.includes("Map exists"))throw e;}
 await save(f,header());return {content:[{type:"text",text:"Created "+f}]};
});
server.tool("map_add_box","Add one solid rectangular brush. Coordinates are Source units.",{name:safeName,min:vec,max:vec,material},async({name,min,max,material})=>{
 const [f,s]=await readMap(name),id=nextId(s);await save(f,append(s,[brush(id,min,max,material)]));return {content:[{type:"text",text:`Added box solid id ${id}: ${min} -> ${max}`}]};
});
server.tool("map_add_room","Build a room shell: floor, ceiling and four walls (interior dimensions).",{name:safeName,origin:vec,width:z.number().min(128).max(4096),depth:z.number().min(128).max(4096),height:z.number().min(96).max(1024),thickness:z.number().min(8).max(128).default(16),floor:z.boolean().default(true),ceiling:z.boolean().default(true),material},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,w=a.width,d=a.depth,h=a.height,t=a.thickness,sol=[];let id=nextId(s);const add=(lo,hi)=>{sol.push(brush(id,lo,hi,a.material));id+=7;};
 if(a.floor)add([x-t,y-t,z-t],[x+w+t,y+d+t,z]);
 if(a.ceiling)add([x-t,y-t,z+h],[x+w+t,y+d+t,z+h+t]);
 add([x-t,y-t,z],[x,y+d+t,z+h]);add([x+w,y-t,z],[x+w+t,y+d+t,z+h]);add([x,y-t,z],[x+w,y,z+h]);add([x,y+d,z],[x+w,y+d+t,z+h]);
 await save(f,append(s,sol));return {content:[{type:"text",text:`Room built: ${w}×${d}×${h}, ${sol.length} brushes`}]};
});
server.tool("map_add_building","Generate a hollow rectangular building shell with optional floors and internal floor slabs.",{name:safeName,origin:vec,width:z.number().min(256).max(4096),depth:z.number().min(256).max(4096),floors:z.number().int().min(1).max(12),floorHeight:z.number().min(128).max(512).default(256),wall:z.number().min(8).max(128).default(16),slabs:z.boolean().default(true),material},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,w=a.width,d=a.depth,t=a.wall,fh=a.floorHeight,sol=[];let id=nextId(s);const add=(lo,hi)=>{sol.push(brush(id,lo,hi,a.material));id+=7;};
 for(let k=0;k<a.floors;k++){const base=z+k*fh,top=base+fh;
 add([x,y,base],[x+t,y+d,top]);add([x+w-t,y,base],[x+w,y+d,top]);add([x+t,y,base],[x+w-t,y+t,top]);add([x+t,y+d-t,base],[x+w-t,y+d,top]);
 if(a.slabs&&k>0)add([x+t,y+t,base-t],[x+w-t,y+d-t,base]);
 }
 add([x,y,z+a.floors*fh-t],[x+w,y+d,z+a.floors*fh]);
 await save(f,append(s,sol));return {content:[{type:"text",text:`Building generated: ${a.floors} floors, ${sol.length} brushes, total height ${a.floors*fh}`}]};
});
server.tool("map_add_street","Add a road strip and two sidewalks along X or Y axis.",{name:safeName,origin:vec,length:z.number().min(128).max(8192),roadWidth:z.number().min(128).max(2048).default(512),sidewalk:z.number().min(16).max(256).default(64),axis:z.enum(["x","y"]).default("x"),roadZ:z.number().default(0),roadMaterial:z.string().default("DEV/DEV_MEASUREGENERIC01B"),sideMaterial:z.string().default("CONCRETE/CONCRETE_FLOOR")},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,L=a.length,r=a.roadWidth,sw=a.sidewalk,sol=[],id=nextId(s),base=a.roadZ;const add=(lo,hi,mat)=>{sol.push(brush(id,lo,hi,mat));id+=7;};
 if(a.axis==="x"){add([x,y,base-8],[x+L,y+r,base],a.roadMaterial);add([x,y-sw,base-8],[x+L,y,base],a.sideMaterial);add([x,y+r,base-8],[x+L,y+r+sw,base],a.sideMaterial);}
 else{add([x,y,base-8],[x+r,y+L,base],a.roadMaterial);add([x-sw,y,base-8],[x,y+L,base],a.sideMaterial);add([x+r,y,base-8],[x+r+sw,y+L,base],a.sideMaterial);}
 await save(f,append(s,sol));return {content:[{type:"text",text:`Street segment ${a.axis.toUpperCase()} ${L} units: road + sidewalks`}]};
});
server.tool("map_add_spawn","Place a CSS player spawn entity.",{name:safeName,origin:vec,team:z.enum(["ct","t"]),angles:z.number().default(0)},async a=>{
 const [f,s]=await readMap(a.name),id=nextId(s),cls=a.team==="ct"?"info_player_counterterrorist":"info_player_terrorist";
 const e=entity(id,cls,{origin:fmt(a.origin),angles:`0 ${a.angles} 0`});await save(f,insertEntities(s,[e]));return {content:[{type:"text",text:`Spawn ${cls} added at ${a.origin}`}]};
});
server.tool("map_inspect","Inspect VMF: byte size, solids and entities.",{name:safeName},async({name})=>{
 const [f,s]=await readMap(name);return {content:[{type:"text",text:`${f}\nBytes: ${Buffer.byteLength(s)}\nSolids: ${(s.match(/\n\s*solid\s*\{/g)||[]).length}\nEntities: ${(s.match(/\n\s*entity\s*\{/g)||[]).length}`}]};
});

server.tool("map_generate_district","Generate a complete small CSS test district in one call: ground, road, sidewalks, 4 accessible buildings and team spawns.",{name:safeName,overwrite:z.boolean().default(false),seed:z.number().int().default(1),blockSize:z.number().min(512).max(2048).default(1024),floors:z.number().int().min(1).max(5).default(2),material:z.string().default("DEV/DEV_MEASUREGENERIC01B")},async a=>{
 await fs.mkdir(mapsDir,{recursive:true});const f=fileFor(a.name);
 try{await fs.access(f);if(!a.overwrite)throw Error("Map exists; set overwrite=true");}catch(e){if(e.message.includes("Map exists"))throw e;}
 let vmf=header(),id=2,parts=[],spawnEntities=[];const add=(lo,hi,mat=a.material)=>{parts.push(brush(id,lo,hi,mat));id+=7;};
 const B=a.blockSize, road=512,sw=64,base=0;
 // Flat playable ground, road and sidewalks
 add([-B*2,-B*2,-64],[B*2,B*2,0],"DEV/DEV_MEASUREGENERIC01B");
 add([-B*2,-road/2,-8],[B*2,road/2,0],"CONCRETE/CONCRETE_FLOOR");
 add([-B*2,-road/2-sw,-8],[B*2,-road/2,0],"CONCRETE/CONCRETE_FLOOR");
 add([-B*2,road/2,-8],[B*2,road/2+sw,0],"CONCRETE/CONCRETE_FLOOR");
 const h= a.floors*256,w=B/2,d=B/2,t=16;
 // 4 simple hollow building shells around central road
 // Four shells with a real ground-floor entrance (96x160) and roof slab.
 // Front wall is split around the doorway, so every shell is accessible.
 for(const [x,y] of [[-B,-B],[B/2,-B],[-B,B/2],[B/2,B/2]]){
  const door=96,doorH=160,mid=x+w/2;
  add([x,y,0],[x+t,y+d,h]);                         // left side
  add([x+w-t,y,0],[x+w,y+d,h]);                     // right side
  add([x+t,y,0],[mid-door/2,y+t,doorH]);             // front left
  add([mid+door/2,y,0],[x+w-t,y+t,doorH]);            // front right
  add([mid-door/2,y,doorH],[mid+door/2,y+t,h]);        // lintel
  add([x+t,y+d-t,0],[x+w-t,y+d,h]);                   // rear wall
  add([x,y,h-t],[x+w,y+d,h]);                         // roof
 }
 spawnEntities.push(entity(id++,"info_player_counterterrorist",{origin:fmt([-128,-128,8]),angles:"0 0 0"}));
 spawnEntities.push(entity(id++,"info_player_terrorist",{origin:fmt([128,128,8]),angles:"0 180 0"}));
 vmf=appendObjects(vmf,parts,spawnEntities);await save(f,vmf);
 return {content:[{type:"text",text:"District generated: "+f+"\\n"+parts.length+" brushes and "+spawnEntities.length+" root-level spawn entities; "+a.floors+" floor(s) per building. Open in Hammer and compile to BSP."}]};
});
server.tool("map_add_stairs","Generate a staircase from individual solid steps.",{name:safeName,origin:vec,steps:z.number().int().min(3).max(40),run:z.number().min(8).max(64).default(16),rise:z.number().min(8).max(32).default(8),width:z.number().min(64).max(512).default(128),axis:z.enum(["x","y"]).default("x"),direction:z.enum(["positive","negative"]).default("positive"),material},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,sol=[];let id=nextId(s);const add=(lo,hi)=>{sol.push(brush(id,lo,hi,a.material));id+=7;};
 for(let i=0;i<a.steps;i++){const h=(i+1)*a.rise,dist=(i+1)*a.run;
 if(a.axis==="x"){const xa=a.direction==="positive"?x+i*a.run:x-(i+1)*a.run;add([xa,y,z],[xa+a.run,y+a.width,z+h]);}
 else{const ya=a.direction==="positive"?y+i*a.run:y-(i+1)*a.run;add([x,ya,z],[x+a.width,ya+a.run,z+h]);}}
 await save(f,append(s,sol));return {content:[{type:"text",text:`Staircase: ${a.steps} steps, total rise ${a.steps*a.rise}, run ${a.steps*a.run}`}]};
});
server.tool("map_add_window_wall","Create a wall segment with one rectangular window opening (three brushes).",{name:safeName,origin:vec,length:z.number().min(128).max(2048),height:z.number().min(96).max(512),thickness:z.number().min(8).max(128).default(16),windowWidth:z.number().min(32).max(512),windowBottom:z.number().min(16).max(256).default(64),windowHeight:z.number().min(32).max(256).default(96),axis:z.enum(["x","y"]).default("x"),material},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,L=a.length,H=a.height,t=a.thickness,ww=a.windowWidth,wb=a.windowBottom,wh=a.windowHeight;
 if(ww>=L||wb+wh>=H)throw Error("Window must fit inside wall");const left=(L-ww)/2,sol=[];let id=nextId(s);const add=(lo,hi)=>{sol.push(brush(id,lo,hi,a.material));id+=7;};
 if(a.axis==="x"){add([x,y,z],[x+left,y+t,z+H]);add([x+left+ww,y,z],[x+L,y+t,z+H]);add([x+left,y,z+wb+wh],[x+left+ww,y+t,z+H]);add([x+left,y,z],[x+left+ww,y+t,z+wb]);}
 else{add([x,y,z],[x+t,y+left,z+H]);add([x,y+left+ww,z],[x+t,y+L,z+H]);add([x,y+left,z+wb+wh],[x+t,y+left+ww,z+H]);add([x,y+left,z],[x+t,y+left+ww,z+wb]);}
 await save(f,append(s,sol));return {content:[{type:"text",text:`Window wall generated with opening ${ww}×${wh}; 4 brushes`}]};
});
server.tool("map_add_roof","Add a flat roof slab or raised parapet around a building.",{name:safeName,origin:vec,width:z.number().min(128).max(4096),depth:z.number().min(128).max(4096),thickness:z.number().min(8).max(128).default(16),parapet:z.number().min(0).max(128).default(0),material},async a=>{
 const [f,s]=await readMap(a.name),[x,y,z]=a.origin,w=a.width,d=a.depth,t=a.thickness,p=a.parapet,sol=[];let id=nextId(s);const add=(lo,hi)=>{sol.push(brush(id,lo,hi,a.material));id+=7;};
 add([x,y,z],[x+w,y+d,z+t]);if(p){add([x,y,z+t],[x+t,y+d,z+t+p]);add([x+w-t,y,z+t],[x+w,y+d,z+t+p]);add([x+t,y,z+t],[x+w-t,y+t,z+t+p]);add([x+t,y+d-t,z+t],[x+w-t,y+d,z+t+p]);}
 await save(f,append(s,sol));return {content:[{type:"text",text:`Roof created; parapet ${p? "enabled":"off"}`}]};
});

return server;
}

async function start(){
 const mode=process.env.CSSBC_MAPBRIDGE_TRANSPORT||"stdio";
 const server=createMapBridgeServer();
 if(mode==="stdio"){
  const transport=new StdioServerTransport();
  await server.connect(transport);
  return;
 }
 if(mode!=="http")throw new Error("CSSBC_MAPBRIDGE_TRANSPORT must be stdio or http");
 const token=process.env.CSSBC_MAPBRIDGE_TOKEN||"";
 if(token.length<32)throw new Error("HTTP mode requires CSSBC_MAPBRIDGE_TOKEN with at least 32 characters");
 const host=process.env.CSSBC_MAPBRIDGE_HOST||"127.0.0.1";
 const port=Number(process.env.CSSBC_MAPBRIDGE_PORT||8787);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error("Invalid CSSBC_MAPBRIDGE_PORT");
 const transport=new StreamableHTTPServerTransport({sessionIdGenerator:undefined});
 await server.connect(transport);
 const http=createHttpServer(async(req,res)=>{
  if(req.url==="/health"&&req.method==="GET"){
   res.writeHead(200,{"content-type":"application/json","cache-control":"no-store"});
   res.end(JSON.stringify({service:"CSSBC MapBridge",version:"0.3.0",transport:"streamable-http"}));
   return;
  }
  if(req.url?.split("?")[0]!=="/mcp"){res.writeHead(404);res.end("Not found");return;}
  const header=req.headers.authorization||"";
  const supplied=Buffer.from(header.startsWith("Bearer ")?header.slice(7):"");
  const expected=Buffer.from(token);
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected)){
   res.writeHead(401,{"www-authenticate":"Bearer","cache-control":"no-store"});
   res.end("Unauthorized");return;
  }
  try{await transport.handleRequest(req,res);}
  catch(error){if(!res.headersSent){res.writeHead(500,{"content-type":"application/json"});res.end(JSON.stringify({error:"Internal MCP transport error"}));}process.stderr.write("MapBridge HTTP error: "+error.message+"\\n");}
 });
 http.listen(port,host,()=>process.stderr.write("MapBridge Streamable HTTP listening on http://"+host+":"+port+"/mcp\\n"));
 const shutdown=()=>{http.close();transport.close();server.close();};
 process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);
}
start().catch(error=>{process.stderr.write("MapBridge startup failed: "+error.stack+"\\n");process.exitCode=1;});
