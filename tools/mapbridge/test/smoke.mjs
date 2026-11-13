import assert from "node:assert/strict";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";

const tmp=await mkdtemp(path.join(os.tmpdir(),"mapbridge-"));
const proc=spawn(process.execPath,[new URL("../src/server.mjs",import.meta.url).pathname],{
 cwd:tmp,env:{...process.env,CSSBC_MAP_ROOT:tmp},stdio:["pipe","pipe","pipe"]
});
let stdout="",stderr="";
proc.stdout.on("data",b=>stdout+=b.toString());
proc.stderr.on("data",b=>stderr+=b.toString());
let next=0;
async function rpc(method,params={}){
 const id=++next;proc.stdin.write(JSON.stringify({jsonrpc:"2.0",id,method,params})+"\n");
 await new Promise(r=>setTimeout(r,120));
 const lines=stdout.split("\n").filter(Boolean);stdout="";
 const msg=lines.map(x=>{try{return JSON.parse(x)}catch{return null}}).find(x=>x?.id===id);
 if(!msg)throw Error("No MCP response for "+method+"; stderr="+stderr);
 if(msg.error)throw Error(JSON.stringify(msg.error));
 return msg.result;
}
try{
 await rpc("initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ci",version:"1"}});
 proc.stdin.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"})+"\n");
 const tools=await rpc("tools/list");
 const names=tools.tools.map(t=>t.name);
 assert(names.includes("map_generate_district"));
 assert(names.includes("map_add_box"));
 await rpc("tools/call",{name:"map_generate_district",arguments:{name:"CI_District",overwrite:true,blockSize:1024,floors:2}});
 const vmf=await readFile(path.join(tmp,"maps","ModernDistrict","CI_District.vmf"),"utf8");
 assert(vmf.includes('"classname" "worldspawn"'));
 assert(vmf.includes('"classname" "info_player_counterterrorist"'));
 assert(vmf.includes('"classname" "info_player_terrorist"'));
 assert.equal((vmf.match(/\n\s*solid\s*\{/g)||[]).length,23);
 assert.equal((vmf.match(/\n\s*entity\s*\{/g)||[]).length,2);
 console.log("PASS: MCP initialize/list/call; district VMF; 23 solids; 2 spawns");
}finally{proc.kill();await rm(tmp,{recursive:true,force:true});}
