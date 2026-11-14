const GH_API = "https://api.github.com";
const cors = env => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin"
});
const replyJson = (data,status,env) => new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8",...cors(env)}});
const wait = ms => new Promise(r=>setTimeout(r,ms));
function safeEqual(a,b){if(typeof a!=="string"||typeof b!=="string"||a.length!==b.length)return false;let d=0;for(let i=0;i<a.length;i++)d|=a.charCodeAt(i)^b.charCodeAt(i);return d===0}
function repo(env){if(!env.GITHUB_REPO||!env.GITHUB_REPO.includes("/"))throw new Error("Chat storage is not configured");return encodeURIComponent(env.GITHUB_REPO).replace("%2F","/")}
async function gh(env,path,options={}){
  let last;
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(GH_API+path,{...options,headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+env.GITHUB_TOKEN,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"GitHub-Chat-Worker",...(options.headers||{})}});
      const data=await r.json().catch(()=>({}));
      if(r.ok)return data;
      const e=new Error("GitHub API "+r.status+": "+(data.message||"request failed"));e.status=r.status;
      if(r.status<500&&r.status!==429)throw e;last=e;
    }catch(e){last=e;if(e.status&&e.status<500&&e.status!==429)throw e}
    await wait(300*(i+1));
  }
  throw last||new Error("GitHub temporarily unavailable");
}
function base(env){return "/repos/"+repo(env)}
function role(c){return c.body.startsWith("<!-- role:assistant -->")?"assistant":"user"}
function content(c){return c.body.replace(/^<!-- role:(?:assistant|user) -->\s*/,"").trim()}
async function comments(env,n){return gh(env,base(env)+"/issues/"+n+"/comments?per_page=100")}
async function issue(env,n){return gh(env,base(env)+"/issues/"+n)}
async function createIssue(env,title,body){return gh(env,base(env)+"/issues",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,body})})}
async function addComment(env,n,roleName,text){return gh(env,base(env)+"/issues/"+n+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:"<!-- role:"+roleName+" -->\n"+text})})}
async function auth(req,env){const h=req.headers.get("Authorization")||"";if(!env.APP_PASSWORD||!safeEqual(h,"Bearer "+env.APP_PASSWORD))throw new Error("Unauthorized")}
function extractText(data){return (data.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim()}
async function model(env,input,instructions){
  if(!env.OPENAI_API_KEY)throw new Error("AI provider is not configured");
  let last;
  for(let i=0;i<3;i++){
    try{
      const r=await fetch(env.OPENAI_API_URL||"https://api.openai.com/v1/responses",{method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.OPENAI_MODEL||"gpt-4.1-mini",store:false,instructions,input})});
      const data=await r.json().catch(()=>({}));
      if(r.ok){const t=extractText(data);if(t)return t;throw new Error("Empty model response")}
      const e=new Error(data.error?.message||"AI provider error");e.status=r.status;
      if(r.status<500&&r.status!==429)throw e;last=e;
    }catch(e){last=e;if(e.status&&e.status<500&&e.status!==429)break}
    await wait(500*(i+1));
  }
  // Optional OpenAI-compatible backup endpoint. Configure all three fallback secrets together.
  if(env.FALLBACK_API_URL&&env.FALLBACK_API_KEY&&env.FALLBACK_MODEL){
    try{
      const r=await fetch(env.FALLBACK_API_URL,{method:"POST",headers:{"Authorization":"Bearer "+env.FALLBACK_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({model:env.FALLBACK_MODEL,messages:[{role:"system",content:instructions},...input.map(x=>({role:x.role,content:x.content}))]})});
      const d=await r.json().catch(()=>({}));
      if(r.ok&&d.choices?.[0]?.message?.content)return d.choices[0].message.content;
      last=new Error("Backup provider unavailable");
    }catch(e){last=e}
  }
  throw last||new Error("No model provider available");
}
const INSTRUCTIONS = "You are the assistant in a persistent, continuous chat. Continue naturally from the supplied history and compact memory. Never mention internal chat rollover, provider retries, tools or infrastructure failures unless the user directly asks. Be accurate and transparent about work not actually performed. The user's active project is CSS Bot Community for Counter-Strike: Source v34. Respect the Local CSS Bridge security boundary: the Windows agent is read-only and must never execute arbitrary commands or modify game files. Distinguish plans from completed work.";
const ROLL_AT_CHARS = 42000;
async function activeIssue(env,root){
  const rootIssue=await issue(env,root);
  if(!(rootIssue.body||"").includes("<!-- github-chat -->"))throw new Error("Conversation not found");
  const m=(rootIssue.body||"").match(/<!-- github-chat-active:(\d+) -->/);
  return {rootIssue,active:m?Number(m[1]):root};
}
async function chain(env,root){
  const out=[];const rootIssue=await issue(env,root);const activeMatch=(rootIssue.body||"").match(/<!-- github-chat-active:(\\d+) -->/);let current=activeMatch?Number(activeMatch[1]):root;const seen=new Set();
  for(let i=0;i<20&&current&&!seen.has(current);i++){
    seen.add(current);const it=await issue(env,current);const cs=await comments(env,current);
    out.unshift({id:current,issue:it,comments:cs});
    const m=(it.body||"").match(/<!-- github-chat-parent:(\d+) -->/);current=m?Number(m[1]):null;
  }
  return out;
}
function visibleMessages(ch){
  return ch.flatMap(part=>part.comments.map(c=>({role:role(c),content:content(c)})).filter(m=>m.content));
}
async function rollOver(env,root,active,allMessages){
  const prior=allMessages.map(m=>({role:m.role,content:m.content})).slice(-80);
  const summary=await model(env,prior,"Create a durable, factual continuation memory for a long-running conversation. Preserve the user's goals, preferences, important personal/project context, decisions, constraints, exact technical facts, unfinished tasks, promises already made, and the immediate conversational thread. Separate confirmed facts from hypotheses. Do not invent. Write a compact but sufficiently detailed handoff that lets a new assistant continue as if the conversation never changed. Do not address the user.");
  const child=await createIssue(env,"Continuation of chat #"+root,"<!-- github-chat-continuation -->\n<!-- github-chat-root:"+root+" -->\n\n## Continuity memory\n"+summary);
  const body=(await issue(env,root)).body||"<!-- github-chat -->";
  const clean=body.replace(/\n?<!-- github-chat-active:\d+ -->/g,"");
  await gh(env,base(env)+"/issues/"+root,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:clean+"\n<!-- github-chat-active:"+child.number+" -->"})});
  return {id:child.number,summary};
}
async function handle(req,env){
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(env)});
  try{
    await auth(req,env);const url=new URL(req.url);
    if(url.pathname==="/api/health"&&req.method==="GET")return replyJson({ok:true},200,env);
    if(url.pathname==="/api/threads"&&req.method==="GET"){
      const issues=await gh(env,base(env)+"/issues?state=all&per_page=100&sort=updated&direction=desc");
      return replyJson({threads:issues.filter(x=>!x.pull_request&&(x.body||"").includes("<!-- github-chat -->")).map(x=>({number:x.number,title:x.title,updated_at:x.updated_at}))},200,env);
    }
    if(url.pathname==="/api/messages"&&req.method==="GET"){
      const root=Number(url.searchParams.get("thread"));if(!Number.isSafeInteger(root)||root<1)return replyJson({error:"Invalid conversation"},400,env);
      const ch=await chain(env,root);return replyJson({title:ch[ch.length-1].issue.title,messages:visibleMessages(ch),thread:root},200,env);
    }
    if(url.pathname==="/api/chat"&&req.method==="POST"){
      const b=await req.json();const message=String(b.message||"").trim();let root=Number(b.thread)||null;
      if(!message||message.length>12000)return replyJson({error:"Message too long"},400,env);
      let active,summary="";
      if(root){const a=await activeIssue(env,root);active=a.active;
        const ch=await chain(env,root);const current=ch.find(x=>x.id===active);
        if(!current)throw new Error("Conversation continuity record missing");
        summary=(current.issue.body||"").split("## Continuity memory")[1]?.trim()||"";
      }else{
        const title="Chat: "+message.replace(/\s+/g," ").slice(0,72);
        const rootIssue=await createIssue(env,title,"Persistent private conversation. All continuations are linked here.\n<!-- github-chat -->");
        root=rootIssue.number;active=root;
      }
      await addComment(env,active,"user",message);
      let ch=await chain(env,root);let all=visibleMessages(ch);
      const charCount=all.reduce((n,m)=>n+m.content.length,0)+(summary.length||0);
      if(charCount>ROLL_AT_CHARS&&all.length>8){
        const rolled=await rollOver(env,root,active,all);active=rolled.id;summary=rolled.summary;
        ch=await chain(env,root);all=visibleMessages(ch).slice(-2);
      }
      const currentComments=await comments(env,active);
      const recent=currentComments.map(c=>({role:role(c),content:content(c)})).filter(m=>m.content).slice(-30);
      const input=[];
      if(summary)input.push({role:"user",content:"CONTINUITY MEMORY FROM THE PREVIOUS PART OF THIS SAME CONVERSATION:\n"+summary});
      input.push(...recent);
      const answer=await model(env,input,INSTRUCTIONS);
      await addComment(env,active,"assistant",answer);
      return replyJson({thread:root,title:(await issue(env,root)).title,reply:answer},200,env);
    }
    return replyJson({error:"Not found"},404,env);
  }catch(e){
    const status=e.message==="Unauthorized"?401:(e.status&&e.status>=400&&e.status<500?e.status:503);
    return replyJson({error:status===401?"Unauthorized":"Temporarily unavailable"},status,env);
  }
}
export default {fetch:handle};
