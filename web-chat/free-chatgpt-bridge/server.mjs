import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(here, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("Missing config.json. Copy config.example.json to config.json and fill in SOLO.Chat URL, chat password and a random local bridge token.");
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
const baseUrl = String(config.soloChatUrl || "https://cssbc-github-chat.descapan.workers.dev").replace(/\/$/, "");
const password = String(config.soloChatPassword || "");
const bridgeId = String(config.bridgeId || "free-chatgpt-browser-bridge").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 80);
const localToken = String(config.localBridgeToken || "");
const port = Math.max(1024, Math.min(65535, Number(config.localPort) || 8765));
if (!password || password.length < 8 || !localToken || localToken.length < 24) {
  console.error("config.json must contain soloChatPassword and localBridgeToken (at least 24 characters).");
  process.exit(1);
}

let pending = null;
let polling = false;
let stopping = false;
const remote = async (route, body) => {
  const response = await fetch(baseUrl + route, {
    method: "POST",
    headers: { Authorization: "Bearer " + password, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error("SOLO.Chat " + route + " HTTP " + response.status + ": " + String(data.error || "request failed"));
  return data;
};

async function pollRemote() {
  if (polling || stopping || pending) return;
  polling = true;
  try {
    const result = await remote("/api/chatgpt-bridge/claim", { bridgeId });
    if (result.task) {
      pending = { ...result.task, delivered: false, claimedAt: Date.now() };
      console.log("Claimed SOLO.Chat request", pending.requestId);
    }
  } catch (error) {
    console.error("Remote queue poll failed:", String(error.message || error).slice(0, 300));
  } finally {
    polling = false;
  }
}
setInterval(pollRemote, 1800);
pollRemote();

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, X-SOLO-Bridge-Token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Private-Network": "true"
  });
  res.end(JSON.stringify(value));
}
function authorized(req) {
  return String(req.headers["x-solo-bridge-token"] || "") === localToken;
}
const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, X-SOLO-Bridge-Token",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Private-Network": "true"
    });
    return res.end();
  }
  const url = new URL(req.url || "/", "http://127.0.0.1:" + port);
  if (url.pathname === "/health" && req.method === "GET") return sendJson(res, 200, { ok: true, bridgeId, remote: baseUrl, pending: Boolean(pending) });
  if (!authorized(req)) return sendJson(res, 401, { error: "Unauthorized local bridge client" });
  if (url.pathname === "/heartbeat" && req.method === "POST") {
    try {
      const result = await remote("/api/chatgpt-bridge/heartbeat", { bridgeId });
      return sendJson(res, 200, result);
    } catch (error) {
      return sendJson(res, 502, { error: String(error.message || error).slice(0, 300) });
    }
  }
  if (url.pathname === "/next" && req.method === "GET") {
    if (!pending) return sendJson(res, 200, { task: null });
    if (pending.expiresAt && Date.now() >= Number(pending.expiresAt)) { pending = null; await pollRemote(); return sendJson(res, 200, { task: null }); }
    // If the extension tab disappeared mid-generation, make the lease available again after its 120s response timeout.
    if (pending.delivered && Date.now() - Number(pending.deliveredAt || 0) < 125000) return sendJson(res, 200, { task: null });
    pending.delivered = true;
    pending.deliveredAt = Date.now();
    return sendJson(res, 200, { task: { requestId: pending.requestId, prompt: pending.prompt, attempts: pending.attempts } });
  }
  if (url.pathname === "/result" && req.method === "POST") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (raw.length > 30000) return sendJson(res, 413, { error: "Payload too large" });
    }
    let body;
    try { body = JSON.parse(raw || "{}"); } catch { return sendJson(res, 400, { error: "Invalid JSON" }); }
    if (!pending || body.requestId !== pending.requestId) return sendJson(res, 409, { error: "No matching active request" });
    const answer = String(body.answer || "").trim();
    const error = String(body.error || "").slice(0, 500);
    try {
      const completed = await remote("/api/chatgpt-bridge/complete", {
        requestId: pending.requestId, bridgeId, answer, error
      });
      console.log("Completed SOLO.Chat request", pending.requestId, completed.status || "ok");
      pending = null;
      await pollRemote();
      return sendJson(res, 200, { ok: true });
    } catch (failure) {
      const detail = String(failure.message || failure).slice(0, 400);
      console.error("Could not return ChatGPT answer to SOLO.Chat:", detail);
      if (/HTTP (?:404|409)\b/.test(detail)) {
        pending = null;
        await pollRemote();
      }
      return sendJson(res, 502, { error: "Could not return answer to SOLO.Chat" });
    }
  }
  return sendJson(res, 404, { error: "Not found" });
});
server.listen(port, "127.0.0.1", () => {
  console.log("SOLO.Chat Free ChatGPT Bridge listening on http://127.0.0.1:" + port);
  console.log("Open ChatGPT in Chrome/Edge and enable the SOLO Free ChatGPT Bridge extension.");
});
process.on("SIGINT", () => { stopping = true; server.close(() => process.exit(0)); });
process.on("SIGTERM", () => { stopping = true; server.close(() => process.exit(0)); });
