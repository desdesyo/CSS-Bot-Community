import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Worker exposes the browser chat and operation-status endpoints", async () => {
  const worker = await read("./worker.js");
  assert.match(worker, /url\.pathname\s*===\s*["']\/api\/chat["']/);
  assert.match(worker, /url\.pathname\s*===\s*["']\/api\/chat\/status["']/);
  assert.match(worker, /url\.pathname\s*===\s*["']\/api\/messages["']/);
  assert.match(worker, /url\.pathname\s*===\s*["']\/api\/threads["']/);
});

test("Durable agent accepts chat, exposes status, and persists thread history", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /url\.pathname\s*===\s*["']\/api\/chat["']/);
  assert.match(agent, /url\.pathname\s*===\s*["']\/api\/chat\/status["']/);
  assert.match(agent, /url\.pathname\s*===\s*["']\/api\/messages["']/);
  assert.match(agent, /url\.pathname\s*===\s*["']\/api\/threads["']/);
  assert.match(agent, /browser-chat:threads/);
});

test("Ordinary chat has an independent text fallback when tool providers are unavailable", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /runDirectModel/);
  assert.match(agent, /SOLO_NO_PROVIDER_CAPACITY/);
  assert.match(agent, /text-only provider chain/);
});

test("Agent refuses unsafe retry when a timed-out tool run may still be executing", async () => {
  const agent = await read("./agent-runtime/src/index.ts");
  assert.match(agent, /SOLO_PI_ABORT_UNCONFIRMED/);
  assert.match(agent, /refusing to retry or start a fallback/);
});

test("Browser client polls operation status and handles failed operations", async () => {
  const html = await read("./public/index.html");
  assert.match(html, /\/api\/chat\/status/);
  assert.match(html, /status/);
  assert.match(html, /failed/);
});
