#!/usr/bin/env node
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_LOG = 6000;
function npmInvocation(args) {
  if (process.platform !== "win32") return ["npm", args];
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
  ].filter(Boolean);
  const cli = candidates.find(candidate => fs.existsSync(candidate));
  if (!cli) throw new Error("Could not locate npm-cli.js for a shell-free Windows invocation");
  return [process.execPath, [cli, ...args]];
}
export const TASKS = Object.freeze({
  "node-smoke": [
    npmInvocation(["install", "--prefix", "web-chat", "--ignore-scripts"]),
    npmInvocation(["run", "check", "--prefix", "web-chat"]),
    npmInvocation(["test", "--prefix", "web-chat"])
  ],
  "cmake-test": [
    ["cmake", ["-S", ".", "-B", "build/solo-compute"]],
    ["cmake", ["--build", "build/solo-compute", "--config", "Release"]],
    ["ctest", ["--test-dir", "build/solo-compute", "--output-on-failure"]]
  ]
});
export function validateTask(task) {
  if (!task || task.schema_version !== 1) throw new Error("Unsupported task schema");
  if (typeof task.task_id !== "string" || !/^[a-f0-9-]{36}$/.test(task.task_id)) throw new Error("Invalid task ID");
  if (!Object.hasOwn(TASKS, task.task_type)) throw new Error("Task type is not allowlisted");
  if (typeof task.commit_sha !== "string" || !/^[0-9a-f]{40}$/.test(task.commit_sha)) throw new Error("Invalid commit SHA");
  if (!Number.isInteger(task.timeout_seconds) || task.timeout_seconds < 10 || task.timeout_seconds > 600) throw new Error("Invalid task timeout");
  return task;
}
function run(command, args, timeout) {
  const result = spawnSync(command, args, {
    cwd: ROOT, shell: false, encoding: "utf8", timeout,
    windowsHide: true, maxBuffer: 512 * 1024
  });
  return {
    exitCode: result.status ?? 1,
    output: ((result.stdout || "") + (result.stderr || "")).slice(0, MAX_LOG),
    error: result.error?.message || null
  };
}
function gitHead() {
  const result = run("git", ["rev-parse", "HEAD"], 10000);
  if (result.exitCode !== 0) throw new Error("Cannot read Git HEAD: " + result.output);
  return result.output.trim().split(/\r?\n/)[0];
}
export async function executeTask(task, beforeStep = async () => {}) {
  validateTask(task);
  const actual = gitHead();
  if (actual !== task.commit_sha) throw new Error("Commit mismatch: expected " + task.commit_sha + ", got " + actual);
  const started = new Date().toISOString();
  const steps = [];
  for (const [command, args] of TASKS[task.task_type]) {
    await beforeStep();
    const result = run(command, args, task.timeout_seconds * 1000);
    steps.push({ command, args, ...result });
    if (result.exitCode !== 0) break;
  }
  return {
    schema_version: 1, task_id: task.task_id, task_type: task.task_type,
    commit_sha: actual, status: steps.length === TASKS[task.task_type].length && steps.every(x => x.exitCode === 0) ? "passed" : "failed",
    worker: { platform: process.platform, arch: process.arch, node: process.version, cpu_count: os.cpus().length },
    started_at: started, finished_at: new Date().toISOString(), steps
  };
}
function journalPath(workerId) {
  const safeId = workerId.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(os.homedir(), ".solo-compute-worker", safeId + ".json");
}
function readJournal(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}
function writeJournal(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = file + ".tmp";
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 });
  fs.renameSync(temp, file);
}
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function connect(baseUrl, workerId) {
  const token = process.env.SOLO_COMPUTE_WORKER_TOKEN || process.env.SOLO_CHAT_WORKER_TOKEN || process.env.APP_PASSWORD || "";
  if (token.length < 24) throw new Error("Set SOLO_COMPUTE_WORKER_TOKEN (or SOLO_CHAT_WORKER_TOKEN) to the SOLO.Chat app password/worker secret (24+ chars)");
  if (!/^[a-zA-Z0-9._-]{1,80}$/.test(workerId)) throw new Error("Invalid worker ID");
  const base = new URL(baseUrl);
  if (base.protocol !== "https:" && !["localhost", "127.0.0.1", "::1"].includes(base.hostname)) throw new Error("SOLO.Chat worker connection requires HTTPS");
  const headers = { authorization: "Bearer " + token, "content-type": "application/json" };
  const journal = journalPath(workerId);
  async function post(route, body) {
    const response = await fetch(new URL(route, base), {
      method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(20000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "SOLO.Chat HTTP " + response.status);
    return data;
  }
  process.stdout.write("SOLO Compute worker " + workerId + " connected to " + base.origin + "\n");
  let activeTaskId = null;
  async function heartbeat() {
    await post("/api/compute/worker/heartbeat", {
      worker_id: workerId, platform: process.platform, arch: process.arch,
      cpu_count: os.cpus().length, ...(activeTaskId ? { active_task_id: activeTaskId } : {})
    });
  }
  async function waitForNetwork() {
    while (true) {
      try { await heartbeat(); return; }
      catch (error) {
        process.stderr.write("Сеть недоступна — выполнение приостановлено; ожидание восстановления.\n");
        await sleep(10000);
      }
    }
  }
  async function deliverPending() {
    const saved = readJournal(journal);
    if (!saved?.result || !saved?.task) return;
    while (true) {
      try {
        await waitForNetwork();
        await post("/api/compute/worker/" + saved.task.task_id + "/result", { worker_id: workerId, result: saved.result });
        fs.unlinkSync(journal);
        activeTaskId = null;
        process.stdout.write("Результат доставлен после восстановления сети.\n");
        return;
      } catch (error) {
        process.stderr.write("Результат сохранён локально; повторная отправка будет выполнена автоматически.\n");
        await sleep(10000);
      }
    }
  }
  while (true) {
    try {
      const saved = readJournal(journal);
      activeTaskId = saved?.task?.task_id || null;
      if (saved?.result) { await deliverPending(); continue; }
      await waitForNetwork();
      let task = saved?.task || null;
      if (!task) {
        const claim = await post("/api/compute/worker/claim", { worker_id: workerId });
        task = claim.task || null;
        if (task) {
          activeTaskId = task.task_id;
          writeJournal(journal, { task, result: null, saved_at: new Date().toISOString() });
        }
      }
      if (task) {
        let result;
        try { result = await executeTask(task, waitForNetwork); }
        catch (error) {
          result = {
            schema_version: 1, task_id: task.task_id, commit_sha: task.commit_sha,
            status: "failed", error: String(error?.message || error).slice(0, 1000), steps: []
          };
        }
        for (const step of result.steps || []) step.output = String(step.output || "").slice(0, 3000);
        writeJournal(journal, { task, result, saved_at: new Date().toISOString() });
        await deliverPending();
      }
      await sleep(5000);
    } catch (error) {
      process.stderr.write("SOLO.Chat coordinator unavailable; локальное состояние задания сохранено.\n");
      await sleep(10000);
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [mode, url, workerId] = process.argv.slice(2);
  if (mode !== "connect" || !url || !workerId) {
    process.stderr.write("Usage: node web-chat/compute-worker.mjs connect <SOLO.Chat-HTTPS-URL> <worker-id>\n");
    process.exitCode = 2;
  } else {
    try { await connect(url, workerId); }
    catch (error) { process.stderr.write("SOLO Compute worker: " + error.message + "\n"); process.exitCode = 1; }
  }
}
