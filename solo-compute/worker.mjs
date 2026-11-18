#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAX_LOG = 256 * 1024;
const DEFAULT_TIMEOUT = 300;
const TASKS = {
  'node-smoke': [
    [process.execPath, ['--test', 'computer-bridge/tests/file-policy.test.mjs', 'solo-code-lab/lab.test.mjs', 'solo-compute/worker.test.mjs', 'solo-compute/coordinator.test.mjs']]
  ],
  'cmake-test': [
    ['cmake', ['-S', '.', '-B', 'build/solo-compute']],
    ['cmake', ['--build', 'build/solo-compute', '--config', 'Release']],
    ['ctest', ['--test-dir', 'build/solo-compute', '--output-on-failure']]
  ]
};

function run(command, args, timeout) {
  const r = spawnSync(command, args, {
    cwd: ROOT, shell: false, encoding: 'utf8', timeout,
    windowsHide: true, maxBuffer: MAX_LOG
  });
  const output = ((r.stdout || '') + (r.stderr || '')).slice(0, MAX_LOG);
  return { code: r.status ?? (r.error ? 1 : 1), output, error: r.error?.message || null };
}
function gitHead() {
  const r = run('git', ['rev-parse', 'HEAD'], 10000);
  if (r.code !== 0) throw new Error('Cannot read Git HEAD: ' + r.output);
  return r.output.trim().split(/\r?\n/)[0];
}
function doctor() {
  const tools = ['git', 'cmake', 'ctest'];
  const report = { worker: 'SOLO Compute Worker', version: 1, platform: process.platform, arch: process.arch, cpus: os.cpus().length, freeMemoryBytes: os.freemem(), totalMemoryBytes: os.totalmem(), tools: {} };
  for (const name of tools) {
    const r = run(name, ['--version'], 10000);
    report.tools[name] = { available: r.code === 0, version: r.output.trim().split(/\r?\n/)[0] || r.error };
  }
  report.tools.node = { available: true, version: process.version };
  return report;
}
function validate(task) {
  if (!task || task.schema_version !== 1) throw new Error('Unsupported task schema_version');
  if (typeof task.task_id !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(task.task_id)) throw new Error('Invalid task_id');
  if (!Object.hasOwn(TASKS, task.task_type)) throw new Error('Task type is not allowlisted');
  if (typeof task.commit_sha !== 'string' || !/^[0-9a-f]{40}$/.test(task.commit_sha)) throw new Error('Invalid commit_sha');
  const timeout = task.timeout_seconds ?? DEFAULT_TIMEOUT;
  if (!Number.isInteger(timeout) || timeout < 10 || timeout > 600) throw new Error('timeout_seconds must be 10..600');
  return timeout * 1000;
}
function execute(task) {
  const started = new Date().toISOString();
  const timeout = validate(task);
  const actual = gitHead();
  if (actual !== task.commit_sha) throw new Error('Commit mismatch: expected ' + task.commit_sha + ', got ' + actual);
  const steps = [];
  for (const [cmd, args] of TASKS[task.task_type]) {
    const result = run(cmd, args, timeout);
    steps.push({ command: path.basename(cmd), args, exitCode: result.code, output: result.output, error: result.error });
    if (result.code !== 0) break;
  }
  return {
    schema_version: 1, task_id: task.task_id, task_type: task.task_type,
    commit_sha: actual, worker: { platform: process.platform, arch: process.arch, node: process.version },
    started_at: started, finished_at: new Date().toISOString(),
    status: steps.length === TASKS[task.task_type].length && steps.every(s => s.exitCode === 0) ? 'passed' : 'failed',
    steps
  };
}

async function connectCoordinator(baseUrl, workerId) {
  const token = process.env.SOLO_COMPUTE_TOKEN || '';
  if (token.length < 32) throw new Error('Set SOLO_COMPUTE_TOKEN to the coordinator shared secret (32+ characters)');
  const url = new URL(baseUrl);
  if (url.protocol !== 'https:' && !['localhost','127.0.0.1','::1'].includes(url.hostname)) throw new Error('Remote coordinator URLs must use HTTPS');
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
  const request = async (route, payload) => {
    const response = await fetch(new URL(route, url), {
      method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(15000)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Coordinator HTTP ' + response.status);
    return data;
  };
  process.stdout.write('Worker ' + workerId + ' connected to ' + url.origin + '\n');
  while (true) {
    let claimed;
    try {
      await request('/v1/workers/heartbeat', { worker_id: workerId, platform: process.platform, cpu_count: os.cpus().length });
      claimed = await request('/v1/tasks/claim', { worker_id: workerId });
    } catch (error) {
      process.stderr.write('Coordinator unavailable: ' + error.message + '\n');
      await new Promise(resolve => setTimeout(resolve, 10000));
      continue;
    }
    if (claimed.task) {
      let result;
      try { result = execute(claimed.task); }
      catch (error) {
        result = { task_id: claimed.task.task_id, commit_sha: claimed.task.commit_sha, status: 'failed', error: error.message };
      }
      if (Array.isArray(result.steps)) {
        for (const step of result.steps) if (typeof step.output === 'string') step.output = step.output.slice(0, 8000);
      }
      await request('/v1/tasks/' + claimed.task.task_id + '/result', { worker_id: workerId, result });
      process.stdout.write('Task ' + claimed.task.task_id + ': ' + result.status + '\n');
    }
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

const [mode, file, workerId] = process.argv.slice(2);
try {
  if (mode === 'doctor') {
    process.stdout.write(JSON.stringify(doctor(), null, 2) + '\n');
  } else if (mode === 'connect' && file && workerId) {
    await connectCoordinator(file, workerId);
  } else if (mode === 'prepare' && file && Object.hasOwn(TASKS, file)) {
    const task = { schema_version: 1, task_id: file + '-' + Date.now(), task_type: file, commit_sha: gitHead(), timeout_seconds: DEFAULT_TIMEOUT };
    const outDir = path.join(ROOT, 'build', 'solo-compute-tasks');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, task.task_id + '.json');
    fs.writeFileSync(outPath, JSON.stringify(task, null, 2) + '\n', { flag: 'wx' });
    process.stdout.write(outPath + '\n');
  } else if (mode === 'run' && file) {
    const task = JSON.parse(fs.readFileSync(path.resolve(file), 'utf8'));
    const result = execute(task);
    const outDir = path.join(ROOT, 'build', 'solo-compute-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, task.task_id + '.json');
    fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n', { flag: 'w' });
    process.stdout.write(JSON.stringify({ status: result.status, result: outPath }, null, 2) + '\n');
    if (result.status !== 'passed') process.exitCode = 1;
  } else {
    process.stderr.write('Usage: node solo-compute/worker.mjs doctor | prepare <node-smoke|cmake-test> | run <task.json> | connect <coordinator-url> <worker-id>\n');
    process.exitCode = 2;
  }
} catch (error) {
  process.stderr.write('SOLO worker error: ' + error.message + '\n');
  process.exitCode = 1;
}
