const GH_API = "https://api.github.com";
const OPENAI_API = "https://api.openai.com/v1/responses";
const cors = (env) => ({
  "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Vary": "Origin"
});
function json(data, status, env) {
  return new Response(JSON.stringify(data), {status, headers:{"Content-Type":"application/json; charset=utf-8", ...cors(env)}});
}
function safeEqual(a,b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff=0; for(let i=0;i<a.length;i++) diff |= a.charCodeAt(i)^b.charCodeAt(i);
  return diff===0;
}
async function gh(env,path,options={}) {
  const r=await fetch(GH_API+path,{...options,headers:{
    "Accept":"application/vnd.github+json","Authorization":"Bearer "+env.GITHUB_TOKEN,
    "X-GitHub-Api-Version":"2022-11-28","User-Agent":"GitHub-Chat-Worker",
    ...(options.headers||{})
  }});
  const data=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error("GitHub API "+r.status+": "+(data.message||"request failed"));
  return data;
}
function repo(env){return encodeURIComponent(env.GITHUB_REPO||"desdesyo/CSS-Bot-Community").replace("%2F","/")}
function roleFromComment(c){return c.body.startsWith("<!-- role:assistant -->")?"assistant":"user"}
function cleanComment(c){return c.body.replace(/^<!-- role:(?:assistant|user) -->\s*/,"").trim()}
async function getComments(env,n){return gh("/repos/"+repo(env)+"/issues/"+n+"/comments?per_page=100")}
async function requireAuth(request,env){
  const h=request.headers.get("Authorization")||"";
  if(!env.APP_PASSWORD || !safeEqual(h,"Bearer "+env.APP_PASSWORD)) throw new Error("Unauthorized");
}
async function handle(request,env){
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:cors(env)});
  try {
    await requireAuth(request,env);
    const url=new URL(request.url);
    if(url.pathname==="/api/health"&&request.method==="GET") return json({ok:true,repo:env.GITHUB_REPO||"desdesyo/CSS-Bot-Community"},200,env);
    if(url.pathname==="/api/threads"&&request.method==="GET"){
      const issues=await gh("/repos/"+repo(env)+"/issues?state=all&per_page=50&sort=updated&direction=desc");
      return json({threads:issues.filter(x=>!x.pull_request&&x.labels.some(l=>l.name==="github-chat")).map(x=>({number:x.number,title:x.title,updated_at:x.updated_at}))},200,env);
    }
    if(url.pathname==="/api/messages"&&request.method==="GET"){
      const n=Number(url.searchParams.get("thread"));if(!Number.isSafeInteger(n)||n<1) return json({error:"Invalid thread id"},400,env);
      const issue=await gh("/repos/"+repo(env)+"/issues/"+n);if(!issue.labels.some(l=>l.name==="github-chat")) return json({error:"Conversation not found"},404,env);
      const comments=await getComments(env,n);
      return json({title:issue.title,messages:comments.map(c=>({role:roleFromComment(c),content:cleanComment(c)}))},200,env);
    }
    if(url.pathname==="/api/chat"&&request.method==="POST"){
      const body=await request.json();const message=String(body.message||"").trim();let n=Number(body.thread)||null;
      if(!message||message.length>12000) return json({error:"Message must be between 1 and 12000 characters"},400,env);
      let issue;
      if(n){
        issue=await gh("/repos/"+repo(env)+"/issues/"+n);
        if(!issue.labels.some(l=>l.name==="github-chat")) return json({error:"Conversation not found"},404,env);
      } else {
        const title=message.replace(/\s+/g," ").slice(0,72)||"New conversation";
        issue=await gh("/repos/"+repo(env)+"/issues",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:"Chat: "+title,body:"Private AI conversation. Messages are stored in comments.\n\n<!-- github-chat -->",labels:["github-chat"]})});
        n=issue.number;
      }
      await gh("/repos/"+repo(env)+"/issues/"+n+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:"<!-- role:user -->\n"+message})});
      const comments=await getComments(env,n);
      const history=comments.slice(-40).map(c=>({role:roleFromComment(c),content:cleanComment(c)})).filter(m=>m.content);
      const ai=await fetch(OPENAI_API,{method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({
        model:env.OPENAI_MODEL||"gpt-4.1-mini",store:false,
        instructions:"You are the assistant in a persistent technical chat workspace. Be accurate, direct, and transparent about actions you have not performed. The user's main project is CSS Bot Community for Counter-Strike: Source v34. Follow repository documentation and preserve the read-only security boundary of Local CSS Bridge: never instruct the local agent to execute arbitrary commands or modify game files. Distinguish plans from completed work.",
        input:history
      })});
      const result=await ai.json().catch(()=>({}));
      if(!ai.ok) throw new Error("AI API "+ai.status+": "+(result.error?.message||"request failed"));
      const reply=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("\n").trim()||"The AI returned an empty response.";
      await gh("/repos/"+repo(env)+"/issues/"+n+"/comments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({body:"<!-- role:assistant -->\n"+reply})});
      return json({thread:n,title:issue.title,reply},200,env);
    }
    return json({error:"Not found"},404,env);
  } catch(e) {
    const status=e.message==="Unauthorized"?401:500;
    return json({error:e.message||"Server error"},status,env);
  }
}
export default {fetch:handle};