const LOCAL = "http://127.0.0.1:8765";
const ALLOWED = new Set(["heartbeat", "next", "result"]);
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "solo-bridge-http") return;
  if (!ALLOWED.has(String(message.path || ""))) {
    sendResponse({ ok: false, error: "Bridge path is not allowed" });
    return;
  }
  (async () => {
    const settings = await chrome.storage.local.get(["bridgeToken", "enabled"]);
    if (!settings.enabled || !settings.bridgeToken) return { ok: false, disabled: true, error: "Bridge extension is not configured" };
    const method = message.method === "POST" ? "POST" : "GET";
    const response = await fetch(LOCAL + "/" + message.path, {
      method,
      headers: { "X-SOLO-Bridge-Token": settings.bridgeToken, ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify(message.body || {}) : undefined
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data, error: data.error || (!response.ok ? "Local bridge request failed" : "") };
  })().then(sendResponse).catch(error => sendResponse({ ok: false, error: String(error?.message || error).slice(0, 300) }));
  return true;
});
