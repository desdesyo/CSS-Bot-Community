import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.env.CSSBC_MAP_ROOT || ".");
const mapsDir = path.join(root, "maps", "ModernDistrict");
const server = new McpServer({name:"CSSBC MapBridge",version:"0.1.0"});
const safeName = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const num = z.number().finite();
const vec = z.tuple([num,num,num]);
const esc = s => String(s).replaceAll("\\","\\\\").replaceAll('"','\\"');
const solid = (id, mins, maxs, material="TOOLS/TOOLSNODRAW") => {
 const [x1,y1,z1]=mins,[x2,y2,z2]=maxs;
 if(x1>=x2||y1>=y2||z1>=z2) throw Error("Invalid solid bounds");
 const planes=[
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
  "side" "0"
  ${planes.map((p,i)=>`side
  {
   "id" "${id*10+i+1}"
   "plane" "(${p[0].join(" ")}) (${p[1].join(" ")}) (${p[2].join(" ")})"
   "material" "${material}"
   "uaxis" "[1 0 0 0] 0.25"
   "vaxis" "[0 -1 0 0] 0.25"
   "rotation" "0"
   "lightmapscale" "16"
   "smoothing_groups" "0"
  }`).join("\\n")}
 }`;
};
server.tool("map_create",(args)=>{},);