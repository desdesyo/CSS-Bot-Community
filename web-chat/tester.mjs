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

test("CHAT-011: agent-runtime/src/index.ts preserves thread continuity and continuity memory", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.ok(agent.includes("/api/messages"), "/api/messages must exist for thread history");
  assert.ok(agent.includes("/api/threads"), "/api/threads must exist for thread listing");
  assert.ok(agent.includes("browser-chat:thread:"), "thread storage key pattern must exist");
  assert.ok(agent.includes("Continuity memory"), "Durable agent must honor continuity memory");
  assert.ok(agent.includes("## Continuity memory"), "Durable agent must ex/validate memory structure");
});

test("CHAT-011: multi-turn context retention tests in tester.mjs cover thread continuity and contributions", async () => {
  const tester = await read("./tester.mjs");
  assert.ok(tester.includes("CHAT-011"), "CHAT-011 test marker must exist");
  assert.ok(tester.includes("Continuity memory"), "continuity memory reference must exist");
});

test("CHAT-011: continuity memory is seeded from prior branches and carried forward in rollOver", async () => {
  const worker = await read("./worker.js");
  assert.match(worker, /chainParts/, "prior branches power is required");
  assert.match(worker, /carried[]:[]/, "carried memory power is required");
  assert.match(worker, /before rollover/, "pre-rollover memory consolidation is required");
});