import assert from "node:assert/strict";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";

const tmp=await mkdtemp(path.join(os.tmpdir(),"mapbridge-"));
const proc=spawn(process.execPath,[new URL("../src/server.mjs",import.meta.url).pathname],{
 cwd:tmp,env:{...process.env,CSSBC_MAP_ROOT:tmp},stdio:["pipe","pipe","pipe"]
});
let stdout="",stderr="",next=0;
const pending=new Map();
proc.stdout.on("data",chunk=>{
 stdout+=chunk.toString();
 for(;;){const n=stdout.indexOf("\n");if(n<0)break;const line=stdout.slice(0,n);stdout=stdout.slice(n+1);if(!line.trim())continue;
 try{const msg=JSON.parse(line);if(msg.id!=null&&pending.has(msg.id)){const p=pending.get(msg.id);pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(JSON.stringify(msg.error))):p.resolve(msg.result);}}catch(e){stderr+="\nInvalid stdout JSON: "+line;}
});
proc.stderr.on("data",b=>stderr+=b.toString());
proc.on("exit",(code,signal)=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error("MapBridge exited "+code+"/"+signal+"; "+stderr));}pending.clear();});
function rpc(method,params={}){
 const id=++next;
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>{pending.delete(id);reject(Error("Timeout waiting for "+method+"; stderr="+stderr));},5000);
  pending.set(id,{resolve,reject,timer});
  proc.stdin.write(JSON.stringify({jsonrpc:"2.0",id,method,params})+"\n");
 });
}
try{
 await rpc("initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ci",version:"1"}});
 proc.stdin.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"})+"\n";
 const tools=await rpc("tools/list");
 const names=tools.tools.map(t=>t.name);
 for(const name of ["map_generate_district","map_add_box","map_add_spawn","map_inspect"])assert(names.includes(name),name+" missing");
 await rpc("tools/call",{name:"map_generate_district",arguments:{name:"CI_District",overwrite:true,blockSize:1024,floors:2}});
 await rpc("tools/call",{name:"map_add_spawn",arguments:{name:"CI_District",origin:[300,300,8],team:"ct"}});
 const vmf=await readFile(path.join(tmp,"maps","ModernDistrict","CI_District.vmf"),"utf8");
 assert(vmf.includes('"classname" "worldspawn"'));
 assert(vmf.includes('"classname" "info_player_counterterrorist"'));
 assert(vmf.includes('"classname" "info_player_terrorist"'));
 assert.equal((vmf.match(/\n\s*solid\s*\{/g)||[]).length,24);
 assert.equal((vmf.match(/\n\s*entity\s*\{/g)||[]).length,3);
 const world=vmf.match(/world\s*\{[\s\S]*?\n\}/)?.[0]||"";
 assert(world.includes('"classname" "info_player_counterterrorist"'),"spawn must be inside world block");
 console.log("PASS: MCP RPC, district generation, spawn insertion, VMF counts and structure");
}finally{proc.kill();await rm(tmp,{recursive:true,force:true});}
