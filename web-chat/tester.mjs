import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const worker = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const html = await readFile(new URL("./public/index.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("./agent-runtime/src/index.ts", import.meta.url), "utf8");
const checks = [
 ["Worker validates APP_PASSWORD", /async function auth\(req,env\)[\s\S]*?safeEqual\(h,"Bearer "\+env\.APP_PASSWORD\)/.test(worker)],
 ["Health endpoint exists", /\/api\/health/.test(worker)],
 ["Chat route exists", /\/api\/chat/.test(worker)],
 ["GitHub-backed thread/comment storage", /issues/.test(worker) && /comments/.test(worker)],
 ["Password gate exists", /id="password"/.test(html) && /async function unlock\(/.test(html)],
 ["Stale session reset on Unauthorized", /sessionStorage\.removeItem\("ghchat_password"\)/.test(html)],
 ["Composer focus/editability restored", /\$\("prompt"\)\.readOnly=true/.test(html) && /\$\("prompt"\)\.readOnly=false/.test(html) && /\$\("prompt"\)\.focus\(\)/.test(html)],
 ["Auth error is shown to user", /Сессия не авторизована/.test(html)],
 ["Durable Agent runtime has chat entrypoint", /class .*Agent|async .*chat|onMessage/.test(runtime)]
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
console.log(`\nTester result: ${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exitCode=1;
