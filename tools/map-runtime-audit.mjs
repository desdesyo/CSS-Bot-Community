import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
const out=process.env.AUDIT_DIR||'artifacts/map-runtime-audit';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader']});
const results=[];const errors=[];
try{
 for(const mode of ['desktop','mobile']){
  const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
  page.on('pageerror',e=>errors.push(mode+': '+String(e?.stack||e)));
  page.on('console',m=>{if(m.type()==='error')errors.push(mode+': '+m.text())});
  const url='http://127.0.0.1:4173/engine/v2/map-runtime-audit.html'+(mode==='mobile'?'?mobile=1':'');
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>!!window.__SOLO_MAP_AUDIT__,null,{timeout:180000});
  await page.waitForTimeout(5000);
  const metrics=await page.evaluate(()=>window.__SOLO_MAP_AUDIT__.metrics());
  await page.screenshot({path:path.join(out,mode+'.png'),fullPage:false,animations:'disabled',timeout:90000});
  results.push({mode,metrics});
  await page.close();
 }
 const report={schema:'solo-map-runtime-audit-v1',capturedAt:new Date().toISOString(),branch:process.env.GITHUB_REF_NAME||null,commit:process.env.GITHUB_SHA||null,results,errors,result:errors.length?'failed':'passed'};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2));
 if(errors.some(e=>/Uncaught|TypeError|ReferenceError|Failed to load/i.test(e)))throw new Error('Runtime browser errors: '+errors.join('\n'));
 for(const r of results){if(!r.metrics.staticMeshCount||!r.metrics.totalVertices)throw new Error('Map did not produce renderable geometry in '+r.mode);}
 console.log(JSON.stringify(report,null,2));
} catch(e){await fs.writeFile(path.join(out,'failure.txt'),String(e?.stack||e));throw e;}
finally{await browser.close();}
