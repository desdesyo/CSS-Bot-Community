import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { rankKnowledgeEntries, selectKnowledgeEntry } from "./agent-runtime/src/knowledge-matcher.mjs";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Worker exposes chat, status, message history, and thread endpoints", async () => {
  const worker = await read("./worker.js");
  for (const route of ["/api/chat", "/api/messages", "/api/threads"]) {
    assert.ok(worker.includes(route), `Worker route missing: ${route}`);
  }
});

test("Agent runtime exposes chat, status, message history, and thread endpoints", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  for (const route of ["/api/chat", "/api/chat/status", "/api/messages", "/api/threads"]) {
    assert.ok(agent.includes(route), `Agent route missing: ${route}`);
  }
  assert.match(agent, /browser-chat:threads/);
});

test("Agent preserves independent text fallback and safe timeout guard", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /runDirectModel/);
  assert.match(agent, /SOLO_NO_PROVIDER_CAPACITY/);
  assert.match(agent, /text-only provider chain/);
  assert.match(agent, /SOLO_PI_ABORT_UNCONFIRMED/);
});

test("Configured AI providers share a persistent round-robin with per-provider failover", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /rotateProviderCandidates/);
  assert.match(agent, /provider:rotation:last-tool/);
  assert.match(agent, /this\.ctx\.storage\.transaction/);
  for (const provider of ["solo-ai", "openrouter", "openai", "gemini", "groq", "workers-ai"]) {
    assert.ok(agent.includes('"'+provider+'"') || agent.includes('("'+provider+'")'), `provider missing from rotation: ${provider}`);
  }
  assert.match(agent, /return this\.rotateProviderCandidates\(candidates/);
  assert.match(agent, /provider:rotation:last-tool/);
  assert.match(agent, /await this\.ctx\.storage\.put\("provider:rotation:last-tool", providerKey\)/, "the provider that actually succeeded must become the next rotation anchor");
  assert.match(agent, /Pi provider attempt threw; rotating provider/);
  assert.match(agent, /provider:circuit:/, "failed providers must be isolated by circuit breaker");
});

test("Browser UI includes status polling and failure handling", async () => {
  const html = await read("./public/index.html");
  assert.ok(html.includes("/api/chat/status"), "status polling endpoint not referenced");
  assert.match(html, /failed/i, "failed operation state not handled");
});

test("SOLO Distributed Compute is mounted in the live Durable Object API", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const worker = await read("./compute-worker.mjs");
  for (const route of ["/api/compute/status", "/api/compute/tasks", "/api/compute/worker/heartbeat", "/api/compute/worker/claim"]) {
    assert.ok(agent.includes(route), `Compute route missing: ${route}`);
  }
  assert.match(agent, /compute_submit_task/);
  assert.match(agent, /compute_task_status/);
  assert.match(worker, /spawnSync/);
  assert.match(worker, /shell:\s*false/);
  assert.match(worker, /node-smoke/);
  assert.match(worker, /cmake-test/);
  assert.match(worker, /waitForNetwork/, "worker must pause between steps while the coordinator is unreachable");
  assert.match(worker, /writeJournal/, "claimed task and result must survive worker restart");
  assert.match(worker, /deliverPending/, "saved result must be retried after reconnect");
  assert.match(agent, /task.status = "paused"/, "expired network lease must pause rather than fail");
  assert.match(agent, /active_task_id/, "same worker must be able to resume its paused lease");
  assert.match(agent, /paused: items.filter/, "paused tasks must be visible in queue status");
});

test("CHAT-011: worker.js defines rollover and continuity memory operations", async () => {
  const worker = await read("./worker.js");
  assert.match(worker, /ROLL_AT_CHARS/, "ROLL_AT_CHARS constant missing");
  assert.ok(worker.includes("Continuity memory"), "Continuity memory section marker missing");
  assert.match(worker, /createIssue.*Continuation/, "Continuation work creation missing");
  assert.ok(worker.includes("## Continuity memory"), "Continuity memory section wrapper missing");
});

test("CHAT-011: conversation Worker owns thread continuity and continuity memory", async () => {
  const worker = await read("./worker.js");
  assert.ok(worker.includes("/api/messages"), "/api/messages must exist for thread history");
  assert.ok(worker.includes("/api/threads"), "/api/threads must exist for thread listing");
  assert.match(worker, /async function chain\(/, "GitHub issue chain must be the authoritative conversation history");
  assert.ok(worker.includes("github-chat-active:"), "active continuation pointer must be persisted on the root issue");
  assert.ok(worker.includes("Continuity memory"), "conversation Worker must preserve continuity memory");
  assert.ok(worker.includes("## Continuity memory"), "continuation records must use the documented memory section");
});

test("CHAT-011: multi-turn context retention tests in tester.mjs cover thread continuity and contributions", async () => {
  const tester = await read("./tester.mjs");
  assert.ok(tester.includes("CHAT-011"), "CHAT-011 test marker must exist");
  assert.ok(tester.includes("Continuity memory"), "continuity memory reference must exist");
});

test("CHAT-011: rollOver carries prior branch memories into the next continuation", async () => {
  const worker = await read("./worker.js");
  assert.match(worker, /async function rollOver\([^)]*chainParts\)/, "rollOver must receive prior conversation branches");
  assert.match(worker, /const carried\s*=\s*chainParts\.map/, "prior branch memories must be collected");
  assert.match(worker, /PREVIOUS CONTINUITY MEMORIES/, "prior memories must be included in the consolidation prompt");
  assert.match(worker, /## Continuity memory/, "the new continuation must retain the stable memory section");
});
test("Computer bridge tasks are leased transactionally and results are idempotent", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const bridge = await read("../computer-bridge/agent.mjs");
  const journal = await read("../computer-bridge/task-journal.mjs");
  assert.match(agent, /computer:lease:/, "server must retain a claimed task lease");
  assert.match(agent, /storage\.transaction\(async txn/, "claim/result transitions must be atomic");
  assert.match(agent, /resumed: true/, "reconnecting devices must receive their existing task");
  assert.match(agent, /duplicate: true/, "duplicate result delivery must be idempotent");
  assert.equal((agent.match(/const enqueued = await storage\.transaction/g) || []).length, 3, "all three computer task producers must enqueue atomically");
  assert.match(agent, /512 \* 1024/, "computer result payload must be bounded");
  assert.match(bridge, /writeJournal\(journalPath, \{ task, claimedAt:/, "agent must persist a task before executing it");
  assert.match(bridge, /deliverJournal\(config\)/, "agent must retry pending result delivery before polling");
  assert.match(bridge, /AbortSignal\.timeout\(30000\)/, "network calls must have a bounded timeout");
  assert.match(journal, /await handle\.sync\(\)/, "journal writes must be flushed before task execution");
});


test("Browser local WebGPU fallback is wired to provider failures and persisted completion", async () => {
  const html = await read("./public/index.html");
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(html, /isLocalFallbackEligible\(result\.error\)\s*&&\s*localFallbackAllowed/, "eligible cloud failures must enter the browser-local fallback");
  assert.match(html, /CreateMLCEngine\("Qwen2\.5-0\.5B-Instruct-q4f16_1-MLC"/, "browser-local model must be initialized");
  assert.match(html, /await generateLocalReply\(result\.localPrompt\s*\|\|\s*message,\s*thinking,\s*result\.localContext\s*\|\|\s*""\)/, "fallback must generate a real local reply with shared knowledge context");
  assert.match(html, /api\("\/api\/chat\/local-complete"/, "local reply must be sent to the server for persistence");
  assert.match(agent, /url\.pathname === "\/api\/chat\/local-complete"/, "server completion endpoint must exist");
  assert.match(agent, /job\.status !== "failed" \|\| !isBrowserLocalFallbackEligible\(job\.error\)/, "server must reject local completion for non-recoverable failures");
  assert.match(agent, /job\.status = "done"; job\.reply = reply; job\.provider = "browser-local"/, "local completion must resolve the job");
  assert.match(agent, /message\.role === "assistant" && message\.operationId === operationId/, "local completion must be idempotent in conversation history");
});


test("Conversation knowledge base is shared with cloud and browser-local models without embedding API calls", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const html = await read("./public/index.html");
  assert.doesNotMatch(agent, /embedMemoryText\(/, "memory retrieval must not call quota-consuming embedding APIs");
  assert.match(agent, /const score = this\.memoryLexicalScore/, "shared conversation knowledge must have a quota-free lexical retrieval path");
  assert.match(agent, /localContext: localContext \|\| undefined/, "failed cloud jobs must provide retrieved memory to the local model");
  assert.match(agent, /const needsMemoryContext = agentRole === "user"/, "historical memory scans must be conditional on an explicit continuation reference");
  assert.match(agent, /const memoryContext = needsMemoryContext \? await this\.retrieveMemoryContext/, "cloud model must receive memory when a user explicitly references prior context");
  assert.doesNotMatch(agent.slice(agent.indexOf("private async retrieveMemoryAnswer"), agent.indexOf("private async retrieveKnowledgeAnswer")), /backfillMemoryIndex/, "knowledge retrieval must not scan old chats on every request");
  assert.match(html, /async function generateLocalReply\(prompt,thinking,knowledgeContext=""/, "local model must accept the shared knowledge context");
  assert.match(html, /БАЗА ЗНАНИЙ ИЗ ПРЕДЫДУЩИХ ДИАЛОГОВ/, "local model prompt must include retrieved conversation knowledge");
  assert.match(html, /result\.localContext\|\|""/, "browser fallback must pass server-retrieved knowledge to Qwen");
});

// Shared cloud/local knowledge base and quota-safety regression tests are kept in this file.


test("Background agent roles are blocked before reserving model quota unless explicitly enabled", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const config = await read("./wrangler.toml");
  const gate = agent.indexOf('if (agentRole !== "user" && this.env.SOLO_AGENT_AUTOMATION_ENABLED !== "true")');
  const userChatDispatch = agent.indexOf('this.runChat(threadKey, prompt, operationId, agentRole, knowledgeQuestion, agentRole === "user")', gate);
  const runChat = agent.indexOf("private async runChat");
  const reserve = agent.indexOf("await this.reserveQuota(operationId)", runChat);
  const bridgeFallback = agent.indexOf("await this.isFreeChatGPTBridgeOnline()", reserve);
  const preflight = agent.indexOf("Do not call the browser bridge pre-emptively", runChat);
  assert.ok(gate >= 0 && userChatDispatch > gate, "non-user agent roles must be rejected before dispatch");
  assert.ok(preflight > 0 && reserve > preflight, "the browser bridge must not pre-empt healthy SOLO.Chat models");
  assert.ok(bridgeFallback > reserve, "free ChatGPT may be consulted only after SOLO.Chat provider attempts");
  assert.match(config, /SOLO_AGENT_AUTOMATION_ENABLED = "false"/, "automatic agents must remain disabled in the deployed Worker by default");
});

// Explicit quota guard: agent roles stay off unless deliberately enabled in Worker vars.




// Final regression suite keeps quota guards and shared knowledge retrieval explicit.

test("SOLO.Chat indexes completed exchanges and uses a relevance-gated knowledge fallback", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const worker = await read("./worker.js");
  assert.match(agent, /private async indexKnowledgeExchange/);
  assert.match(agent, /memory:indexed:exchange:/, "knowledge indexing must be idempotent");
  assert.match(agent, /private async retrieveKnowledgeAnswer/);
  const matcher = await read("./agent-runtime/src/knowledge-matcher.mjs");
  assert.match(matcher, /coverage >= 0\.3/, "paraphrases should pass a conservative minimum coverage gate");
  assert.match(matcher, /best\.score - second\.score < 0\.045/, "ambiguous near-ties must be rejected");
  assert.match(matcher, /answerUsable/, "stored answers must pass a basic quality filter");
  assert.match(matcher, /const queryMarkers =/, "exact technical markers must be extracted from the current question");
  assert.match(matcher, /markerConflict|queryMarkers\.length/, "answers for different technical identifiers must be rejected");
  assert.match(agent, /provider: "knowledge-base"/, "provider failure must resolve with a knowledge-base response");
  assert.match(agent, /Provider exhaustion falls through to the independent text-only chain below/, "provider exhaustion must still try independent providers with their own circuit state");
  assert.match(agent, /SOLO_INTERNAL_QUOTA_EXHAUSTED/, "internal quota exhaustion must have an explicit safe fallback path");
  assert.match(agent, /knowledgeQuestion = String\(body\.knowledgeQuestion \|\| prompt\)/);
  assert.match(agent, /historyExchanges = Array\.isArray\(body\.knowledgeExchanges\)/, "existing turns must seed the knowledge base before fallback retrieval");
  assert.match(worker, /knowledgeExchanges\.slice\(-20\)/, "the current conversation must supply a bounded set of prior Q&A pairs");
  assert.match(worker, /knowledgeQuestion:message/, "the exact user question, not the full conversation prompt, must be indexed");
});

test("Ordinary user chat bypasses the optional internal automation quota", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /if \(agentRole !== "user"\) await this\.reserveQuota\(operationId\)/,
    "user chat must not be blocked by the internal agent/automation budget");
  assert.match(agent, /Serve a sufficiently relevant stored answer before spending provider quota/,
    "a matching local answer must be served before any model provider is called");
});

test("SOLO.Chat serves database answers first and can consult the free ChatGPT browser bridge", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const worker = await read("./worker.js");
  const bridge = await read("./free-chatgpt-bridge/server.mjs");
  const extension = await read("./free-chatgpt-bridge/extension/content.js");
  const background = await read("./free-chatgpt-bridge/extension/background.js");
  const manifest = await read("./free-chatgpt-bridge/extension/manifest.json");
  assert.match(manifest, /"service_worker": "background.js"/);
  assert.match(background, /solo-bridge-http/);
  assert.match(background, /127\.0\.0\.1:8765/);
  assert.match(agent, /Serve a sufficiently relevant stored answer before spending provider quota/);
  assert.match(agent, /private async isFreeChatGPTBridgeOnline/);
  assert.match(agent, /private async requestFreeChatGPTBridge/);
  assert.match(agent, /url\.pathname === "\/api\/chatgpt-bridge\/claim"/);
  assert.match(agent, /url\.pathname === "\/api\/chatgpt-bridge\/complete"/);
  assert.match(agent, /url\.pathname === "\/api\/chatgpt-bridge\/heartbeat"/);
  assert.match(agent, /sourceProvider: String\(sourceProvider/);
  assert.match(agent, /reviewRequired: sourceProvider === "free-chatgpt-bridge"/);
  assert.match(agent, /This is a real, quota-free terminal response/, "provider exhaustion must return a completed offline response instead of a quota error");
  assert.match(agent, /provider: "offline-knowledge"/, "offline knowledge must be identified as the terminal response provider");
  assert.doesNotMatch(agent, /no relevant database answer and no external model or browser bridge completed/, "an empty knowledge match must not turn a user chat turn into a failed request");
  assert.match(agent, /url\.pathname\.startsWith\("\/api\/chatgpt-bridge\/"\)/, "the Durable Object router must expose bridge queue endpoints");
  assert.match(bridge, /server\.listen\(port, "127\.0\.0\.1"/, "local relay must bind only to loopback");
  assert.match(bridge, /X-SOLO-Bridge-Token/);
  assert.match(extension, /SOLO\.Chat Bridge/);
  assert.match(extension, /bridgeRequest\("result"/);
  assert.match(extension, /submitPrompt\(instruction\)/);
});


test("Unverified free ChatGPT answers require explicit approval before direct knowledge reuse", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /reviewStatus: sourceProvider === "free-chatgpt-bridge" \? "pending" : "not-required"/);
  assert.match(agent, /!entry\.reviewRequired && entry\.reviewStatus !== "pending" && entry\.reviewStatus !== "rejected"/,
    "pending or rejected external answers must never be served as authoritative database answers");
  assert.match(agent, /НЕПРОВЕРЕННЫЙ ВНЕШНИЙ ИСТОЧНИК/,
    "unverified external knowledge must be visibly marked when supplied as context to a model");
  assert.match(agent, /url\.pathname === "\/api\/knowledge\/review" && req\.method === "GET"/,
    "authenticated review queue must be available");
  assert.match(agent, /url\.pathname === "\/api\/knowledge\/review" && req\.method === "POST"/,
    "authenticated approve/reject action must be available");
  assert.match(agent, /entry\.sourceProvider !== "free-chatgpt-bridge" \|\| entry\.reviewRequired !== true/,
    "review actions must not modify ordinary knowledge entries");
  assert.match(agent, /entry\.answerQuality = decision === "approve" \? "approved" : "rejected"/);
  assert.match(agent, /Ранее получено через бесплатный ChatGPT и одобрено пользователем/,
    "approved external knowledge must retain provenance");
});


test("Text fallback uses provider circuit breakers and avoids unnecessary ChatGPT bridge waits", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /const assertProviderAvailable = async/);
  assert.match(agent, /const openProviderCircuit = async/);
  assert.match(agent, /provider:circuit-meta:/);
  assert.match(agent, /await assertProviderAvailable\(provider\)/);
  assert.match(agent, /await assertProviderAvailable\("openai"\)/);
  const runChat = agent.slice(agent.indexOf("private async runChat"), agent.indexOf("private async recordRuntimeError"));
  assert.match(runChat, /allowFreeChatGPTBridge && await this\.isFreeChatGPTBridgeOnline\(\)[\s\S]{0,180}\? await this\.requestFreeChatGPTBridge/);
  assert.match(runChat, /requestFreeChatGPTBridge\(threadKey, effectivePrompt, operationId\)/,
    "bridge fallback must receive the memory-enriched prompt");
});

test("Local bridge redelivers stalled tasks and reports only a ready ChatGPT tab as online", async () => {
  const bridge = await read("./free-chatgpt-bridge/server.mjs");
  const extension = await read("./free-chatgpt-bridge/extension/content.js");
  assert.match(bridge, /deliveredAt/);
  assert.match(bridge, /125000/);
  assert.match(bridge, /HTTP \(\?:404\|409\)\\b/);
  assert.match(extension, /const chatGPTReady =/);
  assert.match(extension, /if \(!chatGPTReady\(\)\) return/);
});


test("SOLO.Chat installs a curated offline starter corpus for recurring user topics", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const corpus = await read("./agent-runtime/src/knowledge-seed.ts");
  assert.match(agent, /import \{ SOLO_KNOWLEDGE_SEED \} from "\.\/knowledge-seed"/);
  assert.match(agent, /private async ensureSeedKnowledge/);
  assert.match(agent, /memory:seed:/, "seed import must be idempotent");
  assert.match(agent, /await this\.ensureSeedKnowledge\(\)/, "offline retrieval must install seed entries before searching");
  assert.match(agent, /sourceProvider: "curated-seed"/);
  assert.match(agent, /reviewStatus: "approved"/);
  for (const topic of ["cooking-mannik", "flstudio-sidechain", "windows-recovery-files", "cs-source-bots", "solo-webgpu", "music-lyrics", "audio-mic-interface"]) {
    assert.ok(corpus.includes('id: "' + topic + '"'), "starter knowledge topic missing: " + topic);
  }
  assert.ok((corpus.match(/id: "/g) || []).length >= 20, "starter corpus must contain at least 20 reviewed topic entries");
});


test("Deployment health summary receives its source branch instead of failing under bash nounset", async () => {
  const workflow = await read("../.github/workflows/deploy-github-chat.yml");
  const smoke = workflow.slice(workflow.indexOf("id: smoke"), workflow.indexOf("id: model_smoke"));
  assert.match(smoke, /GITHUB_WORK_BRANCH:\s*github-chat-prototype/);
  assert.match(smoke, /\$GITHUB_WORK_BRANCH/);
});

test("Knowledge matcher finds Windows DISM guidance from natural Russian paraphrases", async () => {
  const corpus = await read("./agent-runtime/src/knowledge-seed.ts");
  assert.match(corpus, /windows-repair-libraries/);
  const entry = {
    id: "windows-repair-libraries",
    queryText: [
      "Как восстановить системные библиотеки и компоненты Windows без потери личных файлов?",
      "восстановить библиотеки Windows",
      "восстановить библиотеки виндовс без потери данных",
      "какая утилита чинит системные файлы Windows",
      "DISM RestoreHealth и SFC Scannow"
    ].join("\\n"),
    content: "Вопрос пользователя: Как восстановить системные библиотеки Windows?\\n\\nОтвет SOLO.Chat: Для работающей Windows выполните DISM /Online /Cleanup-Image /RestoreHealth, затем sfc /scannow. Это восстанавливает компоненты и системные файлы Windows."
  };
  const match = selectKnowledgeEntry("Мне нужна утилита которая восстановит библиотеки виндовс без потери данных, мне не нужна ссылка на скачивание, скачайте сам в хранилище SOLO.Chat", [entry]);
  assert.ok(match, "the natural paraphrase should retrieve the curated answer");
  assert.match(match.answer, /DISM/);
  assert.ok(match.coverage >= 0.3);
});

test("Knowledge matcher rejects unrelated topics and unreviewed external answers", async () => {
  const entry = (id, question, answer, reviewRequired = false) => ({
    id, queryText: question, content: "Ответ SOLO.Chat: " + answer, reviewRequired
  });
  const unrelated = entry("audio", "Какие наушники выбрать для сведения музыки?", "Выбирайте мониторные наушники с ровной АЧХ и проверяйте микс на нескольких системах.");
  const pending = entry("pending", "Как восстановить библиотеки Windows через DISM?", "Выполните DISM и SFC для восстановления системных файлов Windows.", true);
  assert.equal(selectKnowledgeEntry("Как восстановить системные библиотеки Windows?", [unrelated]), null);
  assert.equal(selectKnowledgeEntry("Как восстановить библиотеки Windows через DISM?", [pending]), null);
});

test("Knowledge matcher uses exact technical markers to prevent cross-project answers", async () => {
  const entry = {
    id: "css", queryText: "Как исправить CSSBC_WORKER_TOKEN в проекте?",
    content: "Ответ SOLO.Chat: Проверьте конфигурацию переменной CSSBC_WORKER_TOKEN и права доступа."
  };
  assert.equal(selectKnowledgeEntry("Как исправить DISM_RESTORE_TOKEN в Windows?", [entry]), null);
  assert.ok(rankKnowledgeEntries("Как исправить CSSBC_WORKER_TOKEN?", [entry]).length > 0);
});

test("Interactive chat has bounded provider waits and a deterministic timeout fallback", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const html = await read("./public/index.html");
  assert.match(agent, /agentRole === "user" \? modelCandidates\.slice\(0, 1\)/, "interactive chat must not serially wait on every tool provider");
  assert.match(agent, /agentRole === "user" \? 35_000 : 90_000/, "interactive model wait must be bounded");
  assert.match(agent, /const deadline = Date\.now\(\) \+ 25000/, "text fallback must have a global response budget");
  assert.match(agent, /signal: directSignal\(\)/, "external text-provider fetches must have abort timeouts");
  assert.match(agent, /SOLO_CHAT_TIMEOUT: Ответ не получен за 70 секунд/, "queued jobs must fail fast into the browser-local fallback");
  assert.match(html, /while\(Date\.now\(\)-started<120000\)/, "browser polling must not keep the user waiting for nine minutes");
});
