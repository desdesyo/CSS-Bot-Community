import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.CSSBC_MAP_ROOT || ".");
const mapsDir = path.join(root, "maps", "ModernDistrict");
const server = new McpServer({ name: "CSSBC MapBridge", version: "0.2.0" });
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
 const e=entity(id,cls,{origin:fmt(a.origin),angles:`0 ${a.angles} 0`});await save(f,s+"\\n"+e+"\\n");return {content:[{type:"text",text:`Spawn ${cls} added at ${a.origin}`}]};
});
server.tool("map_inspect","Inspect VMF: byte size, solids and entities.",{name:safeName},async({name})=>{
 const [f,s]=await readMap(name);return {content:[{type:"text",text:`${f}\nBytes: ${Buffer.byteLength(s)}\nSolids: ${(s.match(/\n\s*solid\s*\{/g)||[]).length}\nEntities: ${(s.match(/\n\s*entity\s*\{/g)||[]).length}`}]};
});
const transport=new StdioServerTransport();await server.connect(transport);
