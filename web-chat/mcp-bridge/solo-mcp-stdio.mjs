// SOLO.Chat remote MCP -> stdio adapter for Web MCP Bridge.
// Node.js 20+. Keep solo-mcp-bridge.local.json private; never commit it.
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const here = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(process.env.SOLO_MCP_CONFIG || resolve(here, "solo-mcp-bridge.local.json"));
let config;
try { config = JSON.parse(await readFile(configPath, "utf8")); }
catch { process.stderr.write("Missing/invalid solo-mcp-bridge.local.json. Copy the example and set appPassword locally.\n"); process.exit(2); }
const endpoint = String(config.endpoint || "https://cssbc-github-chat.descapan.workers.dev/mcp");
const password = String(config.appPassword || "");
if (!endpoint.startsWith("https://") || !password) { process.stderr.write("Config requires an HTTPS endpoint and appPassword.\n"); process.exit(2); }

function send(message) { process.stdout.write(JSON.stringify(message) + "\n"); }
async function callRemote(method, params = {}, id = 1) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "authorization": "Bearer " + password, "accept": "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params })
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("SOLO.Chat MCP HTTP " + response.status + ": " + raw.slice(0, 500));
  if (!raw.trim()) return { jsonrpc: "2.0", id, result: {} };
  if (raw.startsWith("data:")) {
    const data = raw.split(/\r?\n/).find(line => line.startsWith("data:"));
    if (data) return JSON.parse(data.slice(5).trim());
  }
  return JSON.parse(raw);
}
const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let msg;
  try { msg = JSON.parse(line); } catch { continue; }
  if (msg.method === "notifications/initialized" || msg.method === "notifications/cancelled" || msg.method === "notifications/progress") continue;
  try {
    if (msg.method === "initialize") {
      send(await callRemote("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "web-mcp-bridge-stdio-adapter", version: "1.0.0" } }, msg.id));
    } else if (msg.method === "ping") {
      send(await callRemote("ping", {}, msg.id));
    } else if (msg.method === "tools/list") {
      send(await callRemote("tools/list", {}, msg.id));
    } else if (msg.method === "tools/call") {
      send(await callRemote("tools/call", msg.params || {}, msg.id));
    } else {
      send({ jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32601, message: "Method not found" } });
    }
  } catch (error) {
    send({ jsonrpc: "2.0", id: msg.id ?? null, error: { code: -32000, message: error instanceof Error ? error.message : String(error) } });
  }
}
