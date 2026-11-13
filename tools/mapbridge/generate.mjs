import {spawn} from "node:child_process";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const name=process.argv[2]||"CSSBC_District";
if(!/^[A-Za-z0-9_-]{1,64}$/.test(name))throw Error("Map name: letters, digits, _ and - only (max 64)");
const root=path.resolve(process.env.CSSBC_MAP_ROOT || path.resolve(here,"../.."));
const proc=spawn(process.execPath,[path.join(here,"src/server.mjs")],{cwd:root,env:{...process.env,CSSBC_MAP_ROOT:root},stdio:["pipe","pipe","inherit"]});
let buffer="",id=0;const pending=new Map();
proc.stdout.on("data",chunk=>{buffer+=chunk.toString();for(;;){const i=buffer.indexOf("\n");if(i<0)break;const line=buffer.slice(0,i);buffer=buffer.slice(i+1);if(!line.trim())continue;try{const m=JSON.parse(line);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);pending.delete(m.id);clearTimeout(p.t);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result)}}catch{}}});
function rpc(method,params={}){const n=++id;return new Promise((resolve,reject)=>{const t=setTimeout(()=>{pending.delete(n);reject(Error("RPC timeout: "+method))},10000);pending.set(n,{resolve,reject,t});proc.stdin.write(JSON.stringify({jsonrpc:"2.0",id:n,method,params})+"\n")})}
try{
 await rpc("initialize",{protocolVersion:"2024-11-05",capabilities:{},clientInfo:{name:"CSSBC Map Generator",version:"1.0"}});
 proc.stdin.write(JSON.stringify({jsonrpc:"2.0",method:"notifications/initialized"})+"\n");
 const result=await rpc("tools/call",{name:"map_generate_district",arguments:{name,overwrite:true,blockSize:1024,floors:2}});
 console.log(result.content?.map(x=>x.text).join("\n")||"District generated.");
 console.log("VMF: "+path.join(root,"maps","ModernDistrict",name+".vmf"));
}finally{proc.kill();}
