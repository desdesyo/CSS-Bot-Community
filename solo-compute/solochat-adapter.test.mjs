import test from 'node:test';
import assert from 'node:assert/strict';
import { createSoloChatComputeHandler } from './solochat-adapter.mjs';

const token = 't'.repeat(40);
const sha = 'a'.repeat(40);
const taskId = '12345678-1234-1234-1234-123456789abc';

function request(path, method = 'GET', body) {
  return new Request('http://solochat.local/api/solo/compute' + path, {
    method, headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
}

test('requires an authenticated SOLO.Chat session before coordinator access', async () => {
  let calls = 0;
  const handler = createSoloChatComputeHandler({
    token, authorize: async () => null,
    fetchImpl: async () => { calls++; throw new Error('must not be called'); }
  });
  const response = await handler(request('/status'));
  assert.equal(response.status, 401);
  assert.equal(calls, 0);
});

test('keeps coordinator token server-side and proxies status', async () => {
  let seen;
  const handler = createSoloChatComputeHandler({
    token, authorize: async () => ({ id: 'user-1' }),
    fetchImpl: async (url, options) => {
      seen = { url: String(url), auth: options.headers.authorization };
      return Response.json({ queued: 2, workers: 1 });
    }
  });
  const response = await handler(request('/status'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { queued: 2, workers: 1 });
  assert.equal(seen.auth, 'Bearer ' + token);
  assert.equal(seen.url, 'http://127.0.0.1:8787/v1/status');
});

test('only submits allowlisted, commit-pinned task envelopes', async () => {
  let sent;
  const handler = createSoloChatComputeHandler({
    token, authorize: async () => ({ id: 'user-1' }),
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ task: { task_id: taskId, status: 'queued' } }), { status: 201 });
    }
  });
  const bad = await handler(request('/tasks', 'POST', { task_type: 'shell', commit_sha: sha, command: 'whoami' }));
  assert.equal(bad.status, 400);
  const good = await handler(request('/tasks', 'POST', { task_type: 'node-smoke', commit_sha: sha, command: 'ignored' }));
  assert.equal(good.status, 201);
  assert.deepEqual(sent, { task_type: 'node-smoke', commit_sha: sha, timeout_seconds: 600 });
});

test('rejects oversized bodies and refuses insecure remote coordinators', async () => {
  const handler = createSoloChatComputeHandler({ token, authorize: async () => ({ id: 'u' }) });
  const oversized = new Request('http://solochat.local/api/solo/compute/tasks', {
    method: 'POST', body: 'x'.repeat(5000)
  });
  assert.equal((await handler(oversized)).status, 413);
  assert.throws(() => createSoloChatComputeHandler({
    token, authorize: async () => true, coordinatorUrl: 'http://example.com'
  }), /must use HTTPS/);
});
