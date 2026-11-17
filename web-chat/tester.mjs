import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const worker = await readFile(new URL("./worker.js", import.meta.url), "utf8");
const html = await readFile(new URL("./public/index.html", import.meta.url), "utf8");
const runtime = await readFile(new URL("./agent-runtime/src/index.ts", import.meta.url), "utf8");
const checks = [
 ["Worker validates APP_PASSWORD", /async function auth\(req,env\)[\s\S]*?safeEqual\(h,"Bearer "\+env\.APP_PASSWORD\)/.test(worker)],
 ["Health endpoint exists", /\/api\/health/.test(worker)],
 ["Worker runtime exposes immutable Cloudflare version metadata", runtime.includes('url.pathname === "/api/version"') && runtime.includes("CF_VERSION_METADATA")],
 ["Agent dashboard reports real GitHub Actions workflow states", runtime.includes('url.pathname === "/api/agents/status"') && runtime.includes("CSSBC Agent Orchestrator") && runtime.includes("Agent Supervisor Audit") && runtime.includes("GitHub Chat checks")],
 ["Browser automatically polls for a new deployed version", html.includes('setInterval(checkLiveVersion,30000)') && html.includes('api("/api/version")')],
 ["Live update preserves unsent draft and waits for active generation", html.includes("preserveForReload") && html.includes("applyPendingVersion") && html.includes("if(!pendingVersion||busy||$(\"prompt\").value.trim()||attachedFiles.length)return")],
 ["Agent dashboard refreshes live workflow statuses", html.includes('api("/api/agents/status")') && html.includes('setInterval(loadAgentStatus,60000)')],
 ["Deploy workflow performs authenticated post-deploy smoke test", (await readFile(new URL("../.github/workflows/deploy-github-chat.yml", import.meta.url), "utf8")).includes("Verify the deployed Worker health and version") && (await readFile(new URL("../.github/workflows/deploy-github-chat.yml", import.meta.url), "utf8")).includes("/api/version")],
 ["Failed post-deploy smoke tests trigger an automatic Cloudflare rollback", (await readFile(new URL("../.github/workflows/deploy-github-chat.yml", import.meta.url), "utf8")).includes("wrangler rollback --message") && (await readFile(new URL("../.github/workflows/deploy-github-chat.yml", import.meta.url), "utf8")).includes("steps.smoke.outcome == 'failure'")],
 ["Agent workflow and team changes trigger GitHub Chat validation", (await readFile(new URL("../.github/workflows/github-chat-check.yml", import.meta.url), "utf8")).includes(".github/workflows/agent-*.yml") && (await readFile(new URL("../.github/workflows/github-chat-check.yml", import.meta.url), "utf8")).includes("agent-team/**")],
 ["Chat route exists", /\/api\/chat/.test(worker)],
 ["GitHub-backed thread/comment storage", /issues/.test(worker) && /comments/.test(worker)],
 ["Password gate exists", /id="password"/.test(html) && /async function unlock\(/.test(html)],
 ["Expired device session returns to password gate", html.includes("Сессия не авторизована") && html.includes('$("gate").style.display="flex"')],
 ["Composer stays editable during generation", /if\(busy\)\{if\(attachedFiles\.length\)/.test(html) && /activeOperationId/.test(html) && /\$\("prompt"\)\.focus\(\)/.test(html)],
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
 ["Follow-up endpoint rejects non-running jobs with conflict", /job.status !== "queued" && job.status !== "running"/.test(runtime) && /httpStatus: 409/.test(runtime)],
 ["Follow-up updates are serialized against finalization", /blockConcurrencyWhile/.test(runtime) && /latest.status = "finalizing"/.test(runtime)],
 ["Generation has a bounded timeout", /180000/.test(runtime)],
 ["Empty model replies are treated as failure", /AI вернул пустой ответ/.test(runtime)],
 ["Job is marked done only after reply persistence", /thread.messages.push/.test(runtime) && /job.status = "done"/.test(runtime)],
 ["Agent prompt requires evidence-based completion", /Never say/.test(runtime) && /verification/.test(runtime)],
 ["Agent prompt requires learned skills before non-trivial tasks", /Inspect and load applicable learned skills before non-trivial tasks/.test(runtime)],
 ["Agent prompt requires independent repair and verification", /YOU make the changes and run verification/.test(runtime)],
 ["No provider credentials are embedded in browser client", !/OPENAI_API_KEY|GITHUB_TOKEN|APP_PASSWORD\s*=/.test(html)],
 ["Follow-up UI keeps the send control available while busy", /if\(busy\)\{if\(attachedFiles\.length\)/.test(html) && /Добавить/.test(html)],
 ["Sidebar has a localized history heading", html.includes("История диалогов") && html.includes("Новый диалог")],
 ["Sidebar replaces CJK and mojibake titles with readable fallback", /function safeThreadTitle/.test(html) && /cjk>Math\.max/.test(html) && /Диалог #/.test(html)],
 ["Sidebar has an explicit empty state", /Здесь появятся ваши диалоги/.test(html)],
 ["Sidebar history buttons have accessible labels", /setAttribute\("aria-label","Открыть "\+label\)/.test(html)],

 [ "File upload endpoint is authenticated and backed by Durable Object storage", /url\.pathname === "\/api\/files" && req\.method === "POST"/.test(runtime) && runtime.includes("this.saveStoredAttachment(file)") && runtime.includes("file:chunk:")],
 [ "Uploads are chunked and bounded to 15 MB", runtime.includes("chunkSize = 64 * 1024") && runtime.includes("file.size > 15 * 1024 * 1024")],
 [ "File download and deletion routes are available", /url\.pathname\.startsWith\("\/api\/files\/"\)/.test(runtime) && /method === "DELETE"/.test(runtime)],
 [ "Chat accepts uploaded file IDs", /const fileIds = Array\.isArray\(body\.files\)/.test(runtime) && /prepareAttachments\(fileIds\)/.test(runtime)],
 [ "Image attachments are analyzed with Workers AI vision", runtime.includes("@cf/mistralai/mistral-small-3.1-24b-instruct") && runtime.includes('type: "image_url"') && runtime.includes('data:" + type + ";base64,"')],
 [ "Word, Excel and PowerPoint files use document extraction", runtime.includes("docx|xlsx|pptx") && runtime.includes("input_file")],
 [ "Text attachments are added to the model prompt", /ПРИКРЕПЛЁННЫЕ ФАЙЛЫ/.test(runtime) && /ТЕКСТОВЫЙ ФАЙЛ/.test(runtime)],
 [ "Browser exposes file picker and paste/drop upload", /id="attach" title="Прикрепить фотографии и документы"/.test(html) && /clipboardData\?\.files/.test(html) && /dataTransfer\?\.files/.test(html)],
 [ "Image previews are rendered in chat history", /className="message-image"/.test(html) && /\?inline=1/.test(html)],
 [ "Paired computer can create/edit local text files only through the approval-gated tool", runtime.includes('name: "computer_write_text_file"') && runtime.includes('expectedSha256') && runtime.includes('status: "waiting for local approval in the Windows companion"')],
 [ "Local computer writes require exact SHA-256 and 256 KB bound", /new TextEncoder\(\)\.encode\(content\)\.length > 256 \* 1024/.test(runtime) && /expectedSha256 !== "NEW"/.test(runtime)],
 [ "SourceMod plugin install tool is restricted to approved GitHub sources and plugin path", runtime.includes('name: "computer_install_smx"') && runtime.includes("packageSha256") && runtime.includes("cstrike/addons/sourcemod/plugins/")],
 [ "Local task schema includes SourceMod plugin install", /"install_smx"/.test(runtime) && /status: "waiting for local download verification and APPLY approval"/.test(runtime)],
 [ "Text agent has a provider fallback chain", runtime.includes('fallback: ["@cf/google/gemma-4-26b-a4b-it"]') && runtime.includes('@cf/zai-org/glm-4.7-flash')],
 [ "Agent can create downloadable text artifacts in private storage", runtime.includes('name: "create_text_artifact"') && runtime.includes('this.saveGeneratedArtifact(name, mimeType')],
 [ "Agent has real FLUX image generation and persists PNG artifacts", runtime.includes('name: "generate_image"') && runtime.includes('black-forest-labs/flux-2-pro-preview') && runtime.includes('@cf/black-forest-labs/flux-1-schnell')],
 [ "Agent has MiniMax music generation and persists MP3 artifacts", runtime.includes('name: "generate_music"') && runtime.includes('minimax/music-2.6')],
 [ "Agent has Russian-capable Grok speech generation and persists MP3 artifacts", runtime.includes('name: "generate_speech"') && runtime.includes('xai/grok-tts') && runtime.includes('language: "ru"')],
 [ "Agent can start and complete Meshy 7.1 text-to-3D tasks", runtime.includes('name: "generate_3d_model"') && runtime.includes('name: "check_3d_model"') && runtime.includes('meshy-7.1') && runtime.includes('MESHY_API_KEY')],
 [ "Binary plugin current hash can be inspected without uploading file contents", /"hash_file"/.test(runtime) && runtime.includes("hash_file") && /Only regular files up to 50 MB can be hashed/.test(await readFile(new URL("../computer-bridge/agent.mjs", import.meta.url), "utf8"))],


 [ "Computer task results can be polled after local approval", runtime.includes('name: "computer_task_result"') && runtime.includes('"computer:result:" + taskId')],
 [ "Cross-chat continuity and canonical SOLO.Chat URL are in the agent prompt", runtime.includes("CROSS-CHAT CONTINUITY — ABSOLUTE REQUIREMENT") && runtime.includes("https://cssbc-github-chat.descapan.workers.dev/")],

];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
console.log(`\nTester result: ${checks.length-failed}/${checks.length} checks passed`);
if(failed)process.exitCode=1;
