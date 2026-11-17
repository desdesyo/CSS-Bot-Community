#!/usr/bin/env node
import { readFile, writeFile, appendFile, mkdir, readdir, realpath, stat, lstat, copyFile, rename, unlink, open } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname, extname, sep } from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { isInside, validateWriteRequest } from "./file-policy.mjs";
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

const sha256 = value => createHash("sha256").update(value).digest("hex");
async function resolveAllowedTarget(config, input) {
  if (!input || input.length > 1024) throw new Error("A valid destination path is required");
  const roots = await Promise.all(config.allowedRoots.map(p => realpath(resolve(p))));
  const candidates = isAbsolute(input) ? [resolve(input)] : roots.map(root => resolve(root, input));
  for (const candidate of candidates) {
    const parent = dirname(candidate);
    try {
      const actualParent = await realpath(parent);
      const root = roots.find(r => isInside(r, actualParent));
      if (!root) continue;
      const name = candidate.slice(parent.length + (parent.endsWith(sep) ? 0 : 1));
      if (!name || name === "." || name === ".." || name.includes(sep)) continue;
      const target = resolve(actualParent, name);
      try {
        const info = await lstat(target);
        if (info.isSymbolicLink() || !info.isFile()) throw new Error("Destination must be a regular file, not a symlink or directory");
        const actual = await realpath(target);
        if (!isInside(root, actual)) throw new Error("Destination escapes the configured root");
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      return { target, root };
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
  }
  throw new Error("Destination parent must already exist inside a configured allowed root");
}
async function applyApprovedTextFile(config, task) {
  if (typeof task.content !== "string") throw new Error("Text content is missing");
  const data = Buffer.from(task.content, "utf8");
  if (data.length > 256 * 1024) throw new Error("Text file write is limited to 256 KB");
  if (data.includes(0)) throw new Error("NUL bytes are not allowed in a text-file write");
  const { target } = await resolveAllowedTarget(config, task.path);
  const beforeExists = await stat(target).then(x => x.isFile()).catch(e => { if (e?.code === "ENOENT") return false; throw e; });
  const beforeBytes = beforeExists ? await readFile(target) : null;
  const beforeHash = beforeBytes ? sha256(beforeBytes) : "NEW";
  validateWriteRequest({ targetPath: target, contentBytes: data.length, expectedSha256: task.expectedSha256, actualSha256: beforeHash });
  const afterHash = sha256(data);
  const backupRoot = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge", "Backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = beforeExists ? resolve(backupRoot, stamp + "-" + randomUUID().slice(0,8) + "-" + target.split(sep).pop() + ".bak") : null;
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Local interactive approval is required; refusing unattended file modification.");
  console.log("\\nLOCAL FILE CHANGE REQUEST");
  console.log("Target: " + target);
  console.log("Operation: " + (beforeExists ? "replace existing file" : "create new file"));
  console.log("Current SHA-256: " + beforeHash);
  console.log("New SHA-256:     " + afterHash);
  console.log("Backup will be created and verified at: " + (backupPath || "(not needed; new file)"));
  console.log("Only this file will be changed. No command or script will be executed.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer = "";
  try { answer = await rl.question("Type APPLY to approve this exact change (anything else cancels): "); }
  finally { rl.close(); }
  if (answer.trim() !== "APPLY") return { ok: false, cancelled: true, path: target, beforeHash, afterHash };
  if (beforeExists) {
    await mkdir(backupRoot, { recursive: true });
    await copyFile(target, backupPath);
    if (sha256(await readFile(backupPath)) !== beforeHash) throw new Error("Backup verification failed; original file was not changed.");
  }
  const temp = target + ".solo-" + randomUUID() + ".tmp";
  try {
    const handle = await open(temp, "wx");
    try { await handle.writeFile(data); await handle.sync(); }
    finally { await handle.close(); }
    const currentNow = await stat(target).then(async () => sha256(await readFile(target))).catch(e => { if (e?.code === "ENOENT") return "NEW"; throw e; });
    if (currentNow.toLowerCase() !== beforeHash.toLowerCase()) throw new Error("File changed after approval; refusing to overwrite a newer version.");
    await rename(temp, target);
    const verified = sha256(await readFile(target));
    if (verified !== afterHash) {
      if (backupPath) await copyFile(backupPath, target);
      else await unlink(target).catch(() => {});
      throw new Error("Post-write SHA-256 verification failed; rollback was attempted.");
    }
    const auditRoot = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge");
    await mkdir(auditRoot, { recursive: true });
    await appendFile(resolve(auditRoot, "write-audit.jsonl"), JSON.stringify({ at: new Date().toISOString(), taskId: task.id, path: target, beforeHash, afterHash, backupPath, status: "verified" }) + "\\n", "utf8");
    return { ok: true, path: target, beforeHash, afterHash, backupPath, status: "written_and_verified" };
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
async function runTask(config, task) {
  if (task.action === "system_info") {
    return { ok: true, platform: os.platform(), release: os.release(), arch: os.arch(), node: process.version, cpuCount: os.cpus().length, totalMemoryBytes: os.totalmem(), freeMemoryBytes: os.freemem() };
  }
  if (task.action === "write_text_file") return await applyApprovedTextFile(config, task);
  const path = await resolveAllowedPath(config, task.path);
  if (task.action === "list_directory") {
    const entries = await readdir(path, { withFileTypes: true });
    return { ok: true, path, entries: entries.slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other" })) };
  }
  if (task.action === "read_text_file") {
    const info = await stat(path);
    if (!info.isFile() || info.size > 256 * 1024) throw new Error("Only files up to 256 KB can be read");
    const allowed = new Set([".txt", ".md", ".json", ".log", ".cfg", ".ini", ".vdf", ".kv", ".res", ".rc", ".cpp", ".h", ".c", ".sp", ".inc", ".js", ".ts", ".html", ".css", ".yaml", ".yml", ".toml"]);
    if (!allowed.has(extname(path).toLowerCase())) throw new Error("File extension is not allowed for reading");
    const bytes = await readFile(path);
    return { ok: true, path, content: bytes.toString("utf8"), sha256: sha256(bytes), size: bytes.length };
  }
  throw new Error("Unsupported task action");
}
async function main() {
  const config = await loadConfig();
  if (!config.deviceToken) throw new Error("Device is not paired. Follow computer-bridge/README.md");
  console.log("Computer bridge connected. Read operations are automatic; file writes require exact local APPLY approval. No shell execution. Press Ctrl+C to stop.");
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
