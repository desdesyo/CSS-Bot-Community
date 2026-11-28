// Deterministic bot-independent map coverage and resilient GitHub report uploads.
export function buildMapSnapshotGrid(bounds, samples = []) {
  const values=[bounds?.minX,bounds?.maxX,bounds?.minZ,bounds?.maxZ];
  if(!values.every(Number.isFinite)||bounds.maxX<=bounds.minX||bounds.maxZ<=bounds.minZ)throw new Error('Некорректные границы карты для сетки снимков');
  const columns=5,rows=6,points=[];
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){
    const x=bounds.minX+(column+.5)*(bounds.maxX-bounds.minX)/columns;
    const z=bounds.minZ+(row+.5)*(bounds.maxZ-bounds.minZ)/rows;
    let nearby=null,nearest=18;
    for(const sample of samples){if(!Number.isFinite(sample?.x)||!Number.isFinite(sample?.z))continue;const distance=Math.hypot(sample.x-x,sample.z-z);if(distance<nearest){nearest=distance;nearby=sample;}}
    points.push({x,z,index:points.length+1,source:'map-grid',team:nearby?.team||'map',botId:nearby?.botId??null,t:nearby?.t??null});
  }
  return points;
}
export function validateMapSnapshotPoints(points,bounds){
  if(!Array.isArray(points)||points.length!==30)throw new Error('Сетка снимков должна содержать ровно 30 точек');
  const seen=new Set();
  for(let i=0;i<points.length;i++){const p=points[i];if(!Number.isFinite(p?.x)||!Number.isFinite(p?.z))throw new Error('Некорректные координаты зоны '+(i+1));if(p.x<bounds.minX||p.x>bounds.maxX||p.z<bounds.minZ||p.z>bounds.maxZ)throw new Error('Зона '+(i+1)+' находится за границами карты');const key=p.x.toFixed(4)+':'+p.z.toFixed(4);if(seen.has(key))throw new Error('Повтор координат зоны '+(i+1));seen.add(key);if(p.index!==i+1||p.source!=='map-grid')throw new Error('Нарушен порядок или источник зоны '+(i+1));}
  return true;
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function uploadReportFile({fetchImpl=globalThis.fetch,apiUrl,headers,path,content,message,branch,retries=3,timeoutMs=20000,sleep=wait}){
  if(typeof fetchImpl!=='function')throw new Error('Fetch недоступен для отправки отчёта');
  const url=apiUrl.replace(/\/$/,'')+'/'+path.split('/').map(encodeURIComponent).join('/');
  const request=async(method,body)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);try{return await fetchImpl(url,{method,headers:{...headers,'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});}finally{clearTimeout(timer);}};
  let lastError;
  for(let attempt=0;attempt<retries;attempt++){
    try{
      let response=await request('PUT',{message,content,branch});let result=await response.json().catch(()=>({}));
      if(response.ok)return result;
      if(response.status===401||response.status===403)throw new Error('GitHub отклонил токен или права ('+response.status+'). Проверь Contents: Read and write.');
      if(response.status===409||response.status===422){
        const lookup=await fetchImpl(url+'?ref='+encodeURIComponent(branch),{method:'GET',headers});
        if(lookup.ok){const existing=await lookup.json();if(existing?.sha){response=await request('PUT',{message,content,branch,sha:existing.sha});result=await response.json().catch(()=>({}));if(response.ok)return result;}}
      }
      const transient=response.status===408||response.status===429||response.status>=500;
      if(!transient)throw new Error(result.message||('GitHub API HTTP '+response.status));
      lastError=new Error(result.message||('GitHub временно недоступен: HTTP '+response.status));
    }catch(error){if(/отклонил токен|Contents: Read and write/.test(String(error?.message)))throw error;lastError=error;}
    if(attempt+1<retries)await sleep(350*(2**attempt));
  }
  throw new Error('Не удалось загрузить '+path+' после '+retries+' попыток: '+String(lastError?.message||lastError));
}
