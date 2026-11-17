#!/usr/bin/env node
import { readFile, writeFile, mkdir, readdir, realpath, stat } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname, extname, sep } from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(here, "config.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function loadConfig() {
  return JSON.parse(await readFile(configPath, "utf8"));
}
function apiUrl(config, path) {
  const base = new URL(config.serverUrl);
  if (base.protocol !== "https:") throw new Error("The bridge requires an HTTPS server URL");
  return new URL(path, base).toString();
}
async function api(config, path, body, token = config.deviceToken) {
  const response = await fetch(apiUrl(config, path), {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Bridge request failed: " + response.status);
  return data;
}
async function pair() {
  const [, , , serverUrl, code] = process.argv;
  if (!serverUrl || !code) throw new Error("Usage: node agent.mjs pair https://YOUR-CHAT-DOMAIN 123456");
  const base = new URL(serverUrl);
  if (base.protocol !== "https:") throw new Error("Use the HTTPS URL of your deployed chat");
  const response = await fetch(new URL("/api/agent/computer/pair", base), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, name: os.hostname() })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Pairing failed");
  const example = JSON.parse(await readFile(resolve(here, "config.example.json"), "utf8"));
  const config = { ...example, serverUrl: base.origin, deviceToken: data.deviceToken };
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log("Paired. Device ID:", data.deviceId);
  console.log("Allowed roots in config.json:", config.allowedRoots.join(", "));
  console.log("Start the agent with: node agent.mjs");
}
async function resolveAllowedPath(config, input) {
  if (!input) throw new Error("A path is required");
  const roots = await Promise.all(config.allowedRoots.map(p => realpath(resolve(p))));
  const candidates = isAbsolute(input) ? [resolve(input)] : roots.map(root => resolve(root, input));
  for (const candidate of candidates) {
    try {
      const actual = await realpath(candidate);
      for (const root of roots) {
        const rel = relative(root, actual);
        if (rel === "" || (!rel.startsWith(".." + sep) && rel !== ".." && !isAbsolute(rel))) return actual;
      }
    } catch {}
  }
  throw new Error("Path is outside configured allowed roots or does not exist");
}
async function runTask(config, task) {
  if (task.action === "system_info") {
    return { ok: true, platform: os.platform(), release: os.release(), arch: os.arch(), node: process.version, cpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem() };
  }
  const path = await resolveAllowedPath(config, task.path);
  if (task.action === "list_directory") {
    const entries = await readdir(path, { withFileTypes: true });
    return { ok: true, path, entries: entries.slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other" })) };
  }
  if (task.action === "read_text_file") {
    const info = await stat(path);
    if (!info.isFile() || info.size > 256 * 1024) throw new Error("Only files up to 256 KB can be read");
    const allowed = new Set([".txt", ".md", ".json", ".log", ".cfg", ".ini", ".vdf", ".kv", ".res", ".rc", ".cpp", ".h", ".c", ".js", ".ts", ".html", ".css", ".yaml", ".yml", ".toml"]);
    if (!allowed.has(extname(path).toLowerCase())) throw new Error("File extension is not allowed for reading");
    return { ok: true, path, content: await readFile(path, "utf8") };
  }
  throw new Error("Unsupported task action");
}
async function main() {
  const config = await loadConfig();
  if (!config.deviceToken) throw new Error("Device is not paired. Follow computer-bridge/README.md");
  console.log("Computer bridge connected. Read-only mode. Press Ctrl+C to stop.");
  while (true) {
    try {
      const { task } = await api(config, "/api/agent/computer/poll", {});
      if (task) {
        let result;
        try { result = await runTask(config, task); }
        catch (error) { result = { ok: false, error: error.message }; }
        await api(config, "/api/agent/computer/result", { taskId: task.id, result });
        console.log(new Date().toISOString(), task.action, task.id, result.ok ? "done" : "error");
      }
    } catch (error) {
      console.error("Bridge connection:", error.message);
    }
    await sleep(2500);
  }
}
if (process.argv[2] === "pair") pair().catch(e => { console.error(e.message); process.exitCode = 1; });
else main().catch(e => { console.error(e.message); process.exitCode = 1; });
