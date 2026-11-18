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
    assert.ok(agent.includes(route), "Compute route missing: " + route);
  }
  assert.match(agent, /compute_submit_task/);
  assert.match(agent, /compute_task_status/);
  assert.match(worker, /spawnSync/);
  assert.match(worker, /shell:\\s*false/);
  assert.match(worker, /node-smoke/);
  assert.match(worker, /cmake-test/);
});
