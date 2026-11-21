import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  assert.match(agent, /agentRole === "user" \? await this\.retrieveMemoryContext/, "cloud model must continue receiving the same conversation knowledge");
  assert.match(html, /async function generateLocalReply\(prompt,thinking,knowledgeContext=""/, "local model must accept the shared knowledge context");
  assert.match(html, /БАЗА ЗНАНИЙ ИЗ ПРЕДЫДУЩИХ ДИАЛОГОВ/, "local model prompt must include retrieved conversation knowledge");
  assert.match(html, /result\.localContext\|\|""/, "browser fallback must pass server-retrieved knowledge to Qwen");
});

// Shared cloud/local knowledge base and quota-safety regression tests are kept in this file.


test("Background agent roles are blocked before reserving model quota unless explicitly enabled", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  const config = await read("./wrangler.toml");
  const gate = agent.indexOf('if (agentRole !== "user" && this.env.SOLO_AGENT_AUTOMATION_ENABLED !== "true")');
  const reserve = agent.indexOf("await this.reserveQuota(operationId)", gate);
  assert.ok(gate >= 0 && reserve > gate, "non-user agent roles must be rejected before model quota reservation");
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
  assert.match(agent, /coverage >= 0\.45/, "a candidate must cover enough of the current question");
  assert.match(agent, /best\.score - second\.score < 0\.07/, "ambiguous near-ties must be rejected");
  assert.match(agent, /answerUsable/, "stored answers must pass a basic quality filter");
  assert.match(agent, /provider: "knowledge-base"/, "provider failure must resolve with a knowledge-base response");
  assert.match(agent, /knowledgeQuestion = String\(body\.knowledgeQuestion \|\| prompt\)/);
  assert.match(worker, /knowledgeQuestion:message/, "the exact user question, not the full conversation prompt, must be indexed");
});
