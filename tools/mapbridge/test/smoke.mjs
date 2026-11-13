import assert from "node:assert/strict";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {spawn} from "node:child_process";
import {createServer} from "node:net";

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
  }
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
  proc.stdin.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"})+"\n");
 const tools=await rpc("tools/list");
 const names=tools.tools.map(t=>t.name);
 for(const name of ["map_generate_district","map_add_box","map_add_spawn","map_inspect","map_add_stairs","map_add_window_wall","map_add_roof"])assert(names.includes(name),name+" missing");
 await rpc("tools/call",{name:"map_generate_district",arguments:{name:"CI_District",overwrite:true,blockSize:1024,floors:2}});
 await rpc("tools/call",{name:"map_add_spawn",arguments:{name:"CI_District",origin:[300,300,8],team:"ct"}});
 const vmf=await readFile(path.join(tmp,"maps","ModernDistrict","CI_District.vmf"),"utf8");
 assert(vmf.includes('"classname" "worldspawn"'));
 assert(vmf.includes('"classname" "info_player_counterterrorist"'));
 assert(vmf.includes('"classname" "info_player_terrorist"'));
 assert.equal((vmf.match(/\n\s*solid\s*\{/g)||[]).length,32);
 assert.equal((vmf.match(/\n\s*entity\s*\{/g)||[]).length,3);
 const world=vmf.match(/world\s*\{[\s\S]*?\n\}/)?.[0]||"";
 assert(!world.includes('"classname" "info_player_counterterrorist"'),"spawn entity must not be nested in worldspawn");
 assert(!world.includes('"classname" "info_player_terrorist"'),"spawn entity must not be nested in worldspawn");
 assert(vmf.includes('"classname" "info_player_counterterrorist"'),"CT spawn missing at VMF root");
 assert(vmf.includes('"classname" "info_player_terrorist"'),"T spawn missing at VMF root");
 const ids=[...vmf.matchAll(/"id"\s+"(\d+)"/g)].map(m=>m[1]);
 assert.equal(new Set(ids).size,ids.length,"all VMF IDs must be unique");
 const cli=spawn(process.execPath,[new URL("../generate.mjs",import.meta.url).pathname,"CI_CLI"],{cwd:new URL("..",import.meta.url).pathname,env:{...process.env,CSSBC_MAP_ROOT:tmp},stdio:["ignore","pipe","pipe"]});
 let cliOut="",cliErr="";
 cli.stdout.on("data",b=>cliOut+=b.toString());
 cli.stderr.on("data",b=>cliErr+=b.toString());
 const cliCode=await new Promise((resolve,reject)=>{cli.on("error",reject);cli.on("exit",resolve);const timer=setTimeout(()=>{cli.kill();reject(Error("CLI generator timed out"));},15000);timer.unref();});
 assert.equal(cliCode,0,"CLI generator failed: "+cliErr);
 assert(cliOut.includes("CI_CLI.vmf"),"CLI did not report generated VMF path");
 const cliVmf=await readFile(path.join(tmp,"maps","ModernDistrict","CI_CLI.vmf"),"utf8");
 assert(cliVmf.includes('"classname" "worldspawn"'));
 assert.equal((cliVmf.match(/\n\s*solid\s*\{/g)||[]).length,32);
 const portServer=createServer();
 await new Promise(resolve=>portServer.listen(0,"127.0.0.1",resolve));
 const httpPort=portServer.address().port;
 await new Promise(resolve=>portServer.close(resolve));
 const secret="ci-mapbridge-token-0123456789-abcdef";
 const httpProc=spawn(process.execPath,[new URL("../src/server.mjs",import.meta.url).pathname],{cwd:tmp,env:{...process.env,CSSBC_MAP_ROOT:tmp,CSSBC_MAPBRIDGE_TRANSPORT:"http",CSSBC_MAPBRIDGE_TOKEN:secret,CSSBC_MAPBRIDGE_HOST:"127.0.0.1",CSSBC_MAPBRIDGE_PORT:String(httpPort)},stdio:["ignore","ignore","pipe"]});
 let httpErr="";
 httpProc.stderr.on("data",b=>httpErr+=b.toString());
 const base="http://127.0.0.1:"+httpPort;
 let ready=false;
 for(let i=0;i<60&&!ready;i++){try{const r=await fetch(base+"/health");ready=r.ok;}catch{}if(!ready)await new Promise(r=>setTimeout(r,100));}
 assert(ready,"HTTP transport failed to start: "+httpErr);
 const health=await fetch(base+"/health");assert.equal((await health.json()).transport,"streamable-http");
 const denied=await fetch(base+"/mcp",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ci",version:"1"}}})});
 assert.equal(denied.status,401,"HTTP MCP must reject missing bearer token");
 const accepted=await fetch(base+"/mcp",{method:"POST",headers:{"content-type":"application/json","accept":"application/json, text/event-stream","authorization":"Bearer "+secret},body:JSON.stringify({jsonrpc:"2.0",id:1,method:"initialize",params:{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"ci-http",version:"1"}}})});
 assert.equal(accepted.status,200,"HTTP MCP initialize rejected: "+await accepted.text());
 httpProc.kill();
 console.log("PASS: MCP stdio + authenticated Streamable HTTP + CLI generator + VMF integrity");
}finally{proc.kill();await rm(tmp,{recursive:true,force:true});}
