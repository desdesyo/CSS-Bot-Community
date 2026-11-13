import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.CSSBC_MAP_ROOT || ".");
const mapsDir = path.join(root, "maps", "ModernDistrict");
const server = new McpServer({ name: "CSSBC MapBridge", version: "0.1.1" });
const safeName = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const point = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const fmt = p => p.join(" ");
const escape = s => String(s).replaceAll("\\", "\\\\").replaceAll('"', '\\"');

function boxSolid(id, lo, hi, material) {
 const [x1,y1,z1]=lo,[x2,y2,z2]=hi;
 if(x1>=x2||y1>=y2||z1>=z2) throw new Error("Bounds must have min < max on all axes");
 const faces=[
  [[x1,y1,z1],[x1,y2,z1],[x1,y2,z2]],
  [[x2,y2,z2],[x2,y2,z1],[x2,y1,z1]],
  [[x1,y1,z1],[x2,y1,z1],[x2,y1,z2]],
  [[x2,y2,z2],[x1,y2,z2],[x1,y2,z1]],
  [[x1,y2,z1],[x2,y2,z1],[x2,y2,z2]],
  [[x2,y1,z2],[x1,y1,z2],[x1,y1,z1]]
 ];
 return `solid
 {
  "id" "${id}"
  ${faces.map((f,i)=>`side
  {
   "id" "${id*10+i+1}"
   "plane" "(${fmt(f[0])}) (${fmt(f[1])}) (${fmt(f[2])})"
   "material" "${escape(material)}"
   "uaxis" "[1 0 0 0] 0.25"
   "vaxis" "[0 -1 0 0] 0.25"
   "rotation" "0"
   "lightmapscale" "16"
   "smoothing_groups" "0"
  }`).join("\\n")}
 }`;
}
const vmfHeader = () => `versioninfo
{
 "editorversion" " ve"
 "editorversion" " 0"
 "mapversion" "1"
 "formatversion" "100"
 "prefab" "0"
 "visgroups" "0"
}
world
{
 "id" "1"
 "mapversion" "1"
 "classname" "worldspawn"
 "detailmaterial" "detail/detailsprites"
 "detailvbsp" "detail.vbsp"
 "detailvvis" "detail.vvis"
 "maxpropscreenwidth" "-1"
 "skyname" "sky_cs15_daylight"
}
`;

server.tool("map_create", "Create a fresh VMF file in maps/ModernDistrict.", {
 name: safeName, overwrite: z.boolean().default(false)
}, async ({name,overwrite}) => {
 await fs.mkdir(mapsDir,{recursive:true}); const file=path.join(mapsDir,name+".vmf");
 try { await fs.access(file); if(!overwrite) throw new Error("File exists; pass overwrite=true"); } catch(e) { if(e.message.includes("File exists")) throw e; }
 await fs.writeFile(file,vmfHeader(),"utf8");
 return {content:[{type:"text",text:`Created ${file}`}]};
});
server.tool("map_add_box", "Append an axis-aligned brush box to an existing VMF (coordinates in Source units).", {
 name:safeName, min:point, max:point, material:z.string().default("TOOLS/TOOLSNODRAW")
}, async ({name,min,max,material})=>{
 const file=path.join(mapsDir,name+".vmf"); let vmf=await fs.readFile(file,"utf8");
 const ids=[...vmf.matchAll(/"id"\s+"(\d+)"/g)].map(m=>Number(m[1]));
 const id=Math.max(2,...ids)+1;
 const brush=boxSolid(id,min,max,material);
 const anchor=/world\s*\{[\s\S]*?\n\}/;
 const m=vmf.match(anchor); if(!m) throw new Error("VMF world block not found");
 vmf=vmf.replace(anchor,m[0].slice(0,-1)+"\n"+brush+"\n}");
 await fs.writeFile(file,vmf,"utf8");
 return {content:[{type:"text",text:`Added brush ${id} to ${file}; bounds ${min} -> ${max}`}]};
});
server.tool("map_inspect", "Read VMF summary and entity/solid counts.", {name:safeName}, async ({name})=>{
 const file=path.join(mapsDir,name+".vmf"), s=await fs.readFile(file,"utf8");
 return {content:[{type:"text",text:`${file}\nBytes: ${Buffer.byteLength(s)}\nSolids: ${(s.match(/\\n\s*solid\\n/g)||[]).length}\nEntities: ${(s.match(/\\nentity\\n/g)||[]).length}`}]};
});
const transport=new StdioServerTransport();
await server.connect(transport);
