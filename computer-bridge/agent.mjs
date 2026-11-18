#!/usr/bin/env node
import { readFile, writeFile, appendFile, mkdir, readdir, realpath, stat, lstat, copyFile, rename, unlink, open } from "node:fs/promises";
import { resolve, relative, isAbsolute, dirname, extname, sep } from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { isInside, validateWriteRequest, validateSmxInstallRequest } from "./file-policy.mjs";
import { readJournal, writeJournal, removeJournal } from "./task-journal.mjs";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const configPath = resolve(here, "config.json");
const journalPath = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge", "task-journal.json");
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function loadConfig() {
  const config = JSON.parse(await readFile(configPath, "utf8"));
  // Safe mode is the default, including for older paired config files created
  // before this safeguard existed. The agent can only access its dedicated
  // workspace unless the owner deliberately opts out by editing config.json.
  if (config.safeMode !== false) {
    const workspaceRoot = resolve(os.homedir(), "Documents", "SOLO-Chat");
    await mkdir(workspaceRoot, { recursive: true });
    const needsMigration = config.safeMode !== true ||
      JSON.stringify(config.allowedRoots || []) !== JSON.stringify([workspaceRoot]) ||
      Boolean(config.gameRoot);
    config.safeMode = true;
    config.allowedRoots = [workspaceRoot];
    config.gameRoot = "";
    if (needsMigration) await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  }
  return config;
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
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(30000)
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
  // Safe-by-default: never grant the agent access to the game folder or a broad
  // user directory during pairing. A dedicated empty workspace is the only
  // initial scope; expanding it must be a deliberate local configuration change.
  const workspaceRoot = resolve(os.homedir(), "Documents", "SOLO-Chat");
  await mkdir(workspaceRoot, { recursive: true });
  const config = { ...example, serverUrl: base.origin, deviceToken: data.deviceToken, gameRoot: "", safeMode: true, allowedRoots: [workspaceRoot] };
  await writeFile(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.log("Paired. Device ID:", data.deviceId);
  console.log("SAFE MODE: access is limited to this empty workspace:", config.allowedRoots.join(", "));
  console.log("Your game folder and other personal folders are NOT accessible.");
  console.log("Start the agent with: node agent.mjs");
}
async function getAllowedRoots(config) {
  const roots = [];
  for (const configured of (config.allowedRoots || [])) {
    try { roots.push(await realpath(resolve(configured))); }
    catch (error) { if (error?.code !== "ENOENT") throw error; }
  }
  if (!roots.length) throw new Error("None of the configured allowed roots currently exists on this computer");
  return roots;
}
async function resolveAllowedPath(config, input) {
  if (!input) throw new Error("A path is required");
  const roots = await getAllowedRoots(config);
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
  const roots = await getAllowedRoots(config);
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
  const beforeInfo = await stat(target).catch(e => { if (e?.code === "ENOENT") return null; throw e; });
  if (beforeInfo && (!beforeInfo.isFile() || beforeInfo.size > 5 * 1024 * 1024)) throw new Error("Existing target must be a regular file no larger than 5 MB");
  const beforeExists = Boolean(beforeInfo);
  const beforeBytes = beforeExists ? await readFile(target) : null;
  const beforeHash = beforeBytes ? sha256(beforeBytes) : "NEW";
  const afterHash = sha256(data);
  // A previous attempt may have written the exact bytes before the network failed.
  // Treat that state as success instead of turning a safe retry into a hash conflict.
  if (beforeHash !== "NEW" && beforeHash.toLowerCase() === afterHash.toLowerCase())
    return { ok: true, alreadyApplied: true, path: target, beforeHash, afterHash, status: "already_applied_and_verified" };
  validateWriteRequest({ targetPath: target, contentBytes: data.length, expectedSha256: task.expectedSha256, actualSha256: beforeHash });
  const backupRoot = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge", "Backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = beforeExists ? resolve(backupRoot, stamp + "-" + randomUUID().slice(0,8) + "-" + target.split(sep).pop() + ".bak") : null;
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Local interactive approval is required; refusing unattended file modification.");
  console.log("\nLOCAL FILE CHANGE REQUEST");
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
    await appendFile(resolve(auditRoot, "write-audit.jsonl"), JSON.stringify({ at: new Date().toISOString(), taskId: task.id, path: target, beforeHash, afterHash, backupPath, status: "verified" }) + "\n", "utf8");
    return { ok: true, path: target, beforeHash, afterHash, backupPath, status: "written_and_verified" };
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
const allowedGitHubHosts = new Set(["raw.githubusercontent.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
async function downloadGitHubPackage(sourceUrl) {
  let url = new URL(sourceUrl);
  for (let hop = 0; hop < 6; hop++) {
    if (url.protocol !== "https:" || !allowedGitHubHosts.has(url.hostname.toLowerCase()) || url.username || url.password || (url.port && url.port !== "443"))
      throw new Error("Plugin download URL or redirect is not an approved GitHub HTTPS host");
    const response = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(30000) });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("GitHub redirect did not provide a destination");
      url = new URL(location, url);
      continue;
    }
    if (!response.ok) throw new Error("Plugin download failed: HTTP " + response.status);
    const declared = Number(response.headers.get("content-length") || 0);
    if (declared > 10 * 1024 * 1024) throw new Error("Plugin package exceeds 10 MB");
    if (!response.body) throw new Error("Plugin download returned an empty body");
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.byteLength;
      if (total > 10 * 1024 * 1024) { await reader.cancel(); throw new Error("Plugin package exceeds 10 MB"); }
      chunks.push(Buffer.from(part.value));
    }
    if (!total) throw new Error("Plugin download is empty");
    return { bytes: Buffer.concat(chunks), finalUrl: url.toString() };
  }
  throw new Error("Too many GitHub download redirects");
}
async function applyApprovedSmx(config, task) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error("Local interactive approval is required; refusing unattended plugin installation.");
  const gameRoot = await realpath(resolve(config.gameRoot || config.allowedRoots?.[0] || ""));
  const relativeTarget = String(task.path || "");
  const targetPath = resolve(gameRoot, ...relativeTarget.split("/"));
  if (!isInside(gameRoot, targetPath)) throw new Error("Plugin destination escapes the configured game root");
  const { target } = await resolveAllowedTarget(config, targetPath);
  const beforeInfo = await stat(target).catch(e => { if (e?.code === "ENOENT") return null; throw e; });
  if (beforeInfo && (!beforeInfo.isFile() || beforeInfo.size > 10 * 1024 * 1024)) throw new Error("Existing plugin must be a regular file no larger than 10 MB");
  const beforeBytes = beforeInfo ? await readFile(target) : null;
  const beforeHash = beforeBytes ? sha256(beforeBytes) : "NEW";
  const downloaded = await downloadGitHubPackage(task.sourceUrl);
  const packageHash = sha256(downloaded.bytes);
  // Recover cleanly if installation completed but result delivery was interrupted.
  if (beforeHash !== "NEW" && beforeHash.toLowerCase() === packageHash.toLowerCase())
    return { ok: true, alreadyInstalled: true, path: target, beforeHash, afterHash: packageHash, status: "already_installed_and_verified" };
  validateSmxInstallRequest({ relativeTarget, sourceUrl: downloaded.finalUrl, expectedSha256: task.expectedSha256, currentSha256: beforeHash, contentBytes: downloaded.bytes.length });
  if (packageHash.toLowerCase() !== String(task.packageSha256 || "").toLowerCase())
    throw new Error("Downloaded plugin SHA-256 does not match the package manifest. No file was changed.");
  const afterHash = packageHash;
  const backupRoot = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge", "Backups");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = beforeInfo ? resolve(backupRoot, stamp + "-" + randomUUID().slice(0,8) + "-" + target.split(sep).pop() + ".bak") : null;
  console.log("\nSOURCE MOD PLUGIN INSTALL REQUEST");
  console.log("Target: " + target);
  console.log("Source host: " + new URL(downloaded.finalUrl).hostname);
  console.log("Current SHA-256: " + beforeHash);
  console.log("Package SHA-256: " + afterHash);
  console.log("Backup will be created and verified at: " + (backupPath || "(not needed; new file)"));
  console.log("Only this .smx plugin will be changed. No command or script will be executed.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let answer = "";
  try { answer = await rl.question("Type APPLY to install this exact plugin (anything else cancels): "); }
  finally { rl.close(); }
  if (answer.trim() !== "APPLY") return { ok: false, cancelled: true, path: target, beforeHash, afterHash };
  if (beforeInfo) {
    await mkdir(backupRoot, { recursive: true });
    await copyFile(target, backupPath);
    if (sha256(await readFile(backupPath)) !== beforeHash) throw new Error("Plugin backup verification failed; original file was not changed.");
  }
  const temp = target + ".solo-" + randomUUID() + ".tmp";
  try {
    const handle = await open(temp, "wx");
    try { await handle.writeFile(downloaded.bytes); await handle.sync(); }
    finally { await handle.close(); }
    const currentNow = await stat(target).then(async () => sha256(await readFile(target))).catch(e => { if (e?.code === "ENOENT") return "NEW"; throw e; });
    if (currentNow.toLowerCase() !== beforeHash.toLowerCase()) throw new Error("Plugin changed after approval; refusing to overwrite a newer version.");
    await rename(temp, target);
    const verified = sha256(await readFile(target));
    if (verified !== afterHash) {
      if (backupPath) await copyFile(backupPath, target);
      else await unlink(target).catch(() => {});
      throw new Error("Installed plugin SHA-256 verification failed; rollback was attempted.");
    }
    const auditRoot = resolve(process.env.LOCALAPPDATA || resolve(os.homedir(), "AppData", "Local"), "LocalCssBridge");
    await mkdir(auditRoot, { recursive: true });
    await appendFile(resolve(auditRoot, "write-audit.jsonl"), JSON.stringify({ at: new Date().toISOString(), taskId: task.id, path: target, beforeHash, afterHash, backupPath, sourceHost: new URL(downloaded.finalUrl).hostname, status: "verified_smx_installed" }) + "\n", "utf8");
    return { ok: true, path: target, beforeHash, afterHash, backupPath, status: "smx_installed_and_verified" };
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
  if (task.action === "install_smx") return await applyApprovedSmx(config, task);
  const path = await resolveAllowedPath(config, task.path);
  if (task.action === "list_directory") {
    const entries = await readdir(path, { withFileTypes: true });
    return { ok: true, path, entries: entries.slice(0, 200).map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : e.isFile() ? "file" : "other" })) };
  }
  if (task.action === "hash_file") {
    const info = await stat(path);
    if (!info.isFile() || info.size > 50 * 1024 * 1024) throw new Error("Only regular files up to 50 MB can be hashed");
    const bytes = await readFile(path);
    return { ok: true, path, size: bytes.length, sha256: sha256(bytes) };
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
async function deliverJournal(config) {
  const journal = await readJournal(journalPath);
  if (!journal) return true;
  if (!journal.result) {
    let result;
    try { result = await runTask(config, journal.task); }
    catch (error) { result = { ok: false, error: String(error?.message || error).slice(0, 500) }; }
    journal.result = result;
    journal.completedAt = new Date().toISOString();
    await writeJournal(journalPath, journal);
  }
  await api(config, "/api/agent/computer/result", { taskId: journal.task.id, result: journal.result });
  console.log(new Date().toISOString(), journal.task.action, journal.task.id, journal.result.ok ? "done" : "error");
  await removeJournal(journalPath);
  return true;
}
async function main() {
  const config = await loadConfig();
  if (!config.deviceToken) throw new Error("Device is not paired. Follow computer-bridge/README.md");
  await mkdir(dirname(journalPath), { recursive: true });
  console.log("Computer bridge connected in restricted mode.");
  console.log("Allowed folders: " + (config.allowedRoots || []).join(", "));
  console.log("File changes require exact local APPLY approval and a verified backup. Shell execution is disabled. Press Ctrl+C to stop.");
  while (true) {
    try {
      // Never claim a second task while a prior result is waiting for server acknowledgement.
      if (!(await deliverJournal(config))) { await sleep(2500); continue; }
      const { task } = await api(config, "/api/agent/computer/poll", {});
      if (task) {
        // Persist the claim before doing any local work. A restart can recover this task.
        await writeJournal(journalPath, { task, claimedAt: new Date().toISOString(), result: null });
        await deliverJournal(config);
      }
    } catch (error) {
      console.error("Bridge paused; task/result retained locally when already claimed:", error.message);
    }
    await sleep(2500);
  }
}
if (process.argv[2] === "pair") pair().catch(e => { console.error(e.message); process.exitCode = 1; });
else main().catch(e => { console.error(e.message); process.exitCode = 1; });
