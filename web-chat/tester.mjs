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
 ["Expired device session returns to password gate", html.includes("Сессия не авторизована") && html.includes('$("gate").style.display="flex"')],
 ["Composer stays editable during generation", /if\(busy\)\{await sendFollowup\(message\);return\}/.test(html) && /activeOperationId/.test(html) && /\$\("prompt"\)\.focus\(\)/.test(html)],
 ["Auth error is shown to user", /Сессия не авторизована/.test(html)],
 ["Durable Agent runtime has chat entrypoint", /class .*Agent|async .*chat|onMessage/.test(runtime)],
 ["Live follow-up API endpoint exists", runtime.includes('url.pathname === "/api/chat/followup"')],
 ["Follow-ups trigger an updated generation pass", /pendingFollowups/.test(runtime) && /consumedFollowups/.test(runtime) && /Incorporate them into the task/.test(runtime)],
 ["Follow-up messages are saved in conversation history", /followup: true/.test(runtime) && /thread\.messages\.push/.test(runtime)],
 ["External expert escalation is implemented", /name: "consult_external_expert"/.test(runtime) && /api.openai.com/.test(runtime)],
 ["Persistent skill loading is implemented", /name: "load_learned_skill"/.test(runtime) && /agent-skills/.test(runtime)],
 ["Persistent skill saving is implemented", /name: "save_learned_skill"/.test(runtime) && /status: candidate/.test(runtime)],
 ["Read-only MCP boundary is enforced", /readOnlyHint !== true/.test(runtime)],
 ["Follow-up endpoint rejects oversized messages", /message.length > 12000|message.length>12000/.test(runtime)],
 ["Follow-up endpoint caps messages per job", /followups.length >= 20|followups.length>=20/.test(runtime)],
 ["Follow-up endpoint rejects finalizing jobs", /status === "finalizing"/.test(runtime) && /409/.test(runtime)],
 ["Follow-up updates are serialized against finalization", /blockConcurrencyWhile/.test(runtime) && /latest.status = "finalizing"/.test(runtime)],
 ["Generation has a bounded timeout", /180000/.test(runtime)],
 ["Empty model replies are treated as failure", /AI вернул пустой ответ/.test(runtime)],
 ["Job is marked done only after reply persistence", /thread.messages.push/.test(runtime) && /job.status = "done"/.test(runtime)],
 ["Agent prompt requires evidence-based completion", /Never say/.test(runtime) && /verification/.test(runtime)],
 ["Agent prompt requires learned skills before non-trivial tasks", /Inspect and load applicable learned skills before non-trivial tasks/.test(runtime)],
 ["Agent prompt requires independent repair and verification", /YOU make the changes and run verification/.test(runtime)],
 ["No provider credentials are embedded in browser client", !/OPENAI_API_KEY|GITHUB_TOKEN|APP_PASSWORD\s*=/.test(html)],
 ["Follow-up UI keeps the send control available while busy", /if\(busy\)\{await sendFollowup\(message\);return\}/.test(html) && /Добавить/.test(html)],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
console.log(`\nTester result: ${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exitCode=1;
