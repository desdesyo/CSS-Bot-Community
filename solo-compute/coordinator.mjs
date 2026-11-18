import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.resolve(process.env.SOLO_COMPUTE_DATA || path.join(ROOT, 'build', 'solo-compute-coordinator'));
const DB = path.join(DATA, 'state.json');
const TOKEN = process.env.SOLO_COMPUTE_TOKEN || '';
const PORT = Number(process.env.SOLO_COMPUTE_PORT || 8787);
const BIND = process.env.SOLO_COMPUTE_BIND || '127.0.0.1';
const MAX_BODY = 64 * 1024;
const LEASE_MS = 35 * 60 * 1000;
const TYPES = new Set(['node-smoke', 'cmake-test']);
let state = { tasks: [], workers: [] };

function persist() {
  fs.mkdirSync(DATA, { recursive: true });
  const temp = DB + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(state, null, 2));
  fs.renameSync(temp, DB);
}
function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DB, 'utf8'));
    if (Array.isArray(parsed.tasks) && Array.isArray(parsed.workers)) state = parsed;
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}
function send(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY) throw new Error('request body too large');
  }
  return raw ? JSON.parse(raw) : {};
}
function authorized(req) {
  if (!TOKEN) return false;
  const supplied = req.headers.authorization || '';
  const expected = 'Bearer ' + TOKEN;
  const a = Buffer.from(supplied), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function cleanExpired() {
  const now = Date.now();
  for (const task of state.tasks) {
    if (task.status === 'leased' && task.lease_until <= now) {
      task.status = task.attempts < 3 ? 'queued' : 'failed';
      task.worker_id = null;
      task.lease_until = null;
      task.last_error = 'worker lease expired';
    }
  }
}
const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true, service: 'SOLO Compute Coordinator', version: 1 });
    if (!authorized(req)) return send(res, 401, { error: 'unauthorized' });
    cleanExpired();
    if (req.method === 'GET' && req.url === '/v1/status') {
      return send(res, 200, {
        queued: state.tasks.filter(t => t.status === 'queued').length,
        leased: state.tasks.filter(t => t.status === 'leased').length,
        completed: state.tasks.filter(t => t.status === 'completed').length,
        failed: state.tasks.filter(t => t.status === 'failed').length,
        workers: state.workers.filter(w => Date.now() - w.last_seen < 60000).length
      });
    }
    if (req.method === 'POST' && req.url === '/v1/tasks') {
      const input = await body(req);
      if (!TYPES.has(input.task_type)) return send(res, 400, { error: 'task_type is not allowlisted' });
      if (typeof input.commit_sha !== 'string' || !/^[0-9a-f]{40}$/.test(input.commit_sha)) return send(res, 400, { error: 'commit_sha must be a full lowercase SHA-1' });
      const task = {
        task_id: crypto.randomUUID(), schema_version: 1, task_type: input.task_type,
        commit_sha: input.commit_sha, timeout_seconds: Math.min(600, Math.max(10, Number(input.timeout_seconds) || 300)),
        status: 'queued', attempts: 0, created_at: new Date().toISOString(),
        worker_id: null, lease_until: null, result: null, last_error: null
      };
      state.tasks.push(task); persist();
      return send(res, 201, { task });
    }
    if (req.method === 'POST' && req.url === '/v1/workers/heartbeat') {
      const input = await body(req);
      if (typeof input.worker_id !== 'string' || !/^[a-zA-Z0-9._-]{1,80}$/.test(input.worker_id)) return send(res, 400, { error: 'invalid worker_id' });
      const worker = { worker_id: input.worker_id, platform: String(input.platform || 'unknown').slice(0,40), cpu_count: Math.max(1, Math.min(1024, Number(input.cpu_count) || 1)), last_seen: Date.now() };
      state.workers = state.workers.filter(w => w.worker_id !== worker.worker_id);
      state.workers.push(worker); persist();
      return send(res, 200, { ok: true, worker });
    }
    if (req.method === 'POST' && req.url === '/v1/tasks/claim') {
      const input = await body(req);
      const worker = state.workers.find(w => w.worker_id === input.worker_id && Date.now() - w.last_seen < 60000);
      if (!worker) return send(res, 409, { error: 'worker must heartbeat before claiming' });
      const task = state.tasks.find(t => t.status === 'queued');
      if (!task) return send(res, 200, { task: null });
      task.status = 'leased'; task.worker_id = worker.worker_id; task.attempts += 1; task.lease_until = Date.now() + LEASE_MS;
      persist();
      return send(res, 200, { task: { task_id: task.task_id, schema_version: 1, task_type: task.task_type, commit_sha: task.commit_sha, timeout_seconds: task.timeout_seconds } });
    }
    const resultMatch = req.url.match(/^\/v1\/tasks\/([a-f0-9-]{36})\/result$/);
    if (req.method === 'POST' && resultMatch) {
      const input = await body(req);
      const task = state.tasks.find(t => t.task_id === resultMatch[1]);
      if (!task) return send(res, 404, { error: 'task not found' });
      if (task.status !== 'leased' || task.worker_id !== input.worker_id) return send(res, 409, { error: 'task lease does not belong to worker' });
      if (!input.result || input.result.task_id !== task.task_id || input.result.commit_sha !== task.commit_sha || !['passed','failed'].includes(input.result.status)) return send(res, 400, { error: 'result does not match task envelope' });
      task.result = input.result; task.status = input.result.status === 'passed' ? 'completed' : (task.attempts < 3 ? 'queued' : 'failed');
      task.worker_id = null; task.lease_until = null; task.last_error = task.status === 'queued' ? 'retry after failed result' : null;
      persist();
      return send(res, 200, { ok: true, status: task.status });
    }
    return send(res, 404, { error: 'not found' });
  } catch (error) {
    return send(res, 400, { error: error.message || 'bad request' });
  }
});
load();
if (process.env.SOLO_COMPUTE_TOKEN) {
  server.listen(PORT, BIND, () => process.stdout.write('SOLO Compute Coordinator listening on ' + BIND + ':' + PORT + '\n'));
} else {
  process.stderr.write('Set SOLO_COMPUTE_TOKEN to a private random token before starting coordinator.\\n');
  process.exitCode = 2;
}
