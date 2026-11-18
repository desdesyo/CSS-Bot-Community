/**
 * Server-side SOLO.Chat adapter for the SOLO Compute Coordinator.
 *
 * Mount this handler at /api/solo/compute/* in the SOLO.Chat backend.
 * Keep SOLO_COMPUTE_TOKEN server-side; never serialize it into browser code.
 * The host application must supply its own session authorization callback.
 */
const TASK_TYPES = new Set(['node-smoke', 'cmake-test']);
const SHA = /^[0-9a-f]{40}$/;
const ID = /^[a-f0-9-]{36}$/;

function json(status, value) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
  });
}

export function createSoloChatComputeHandler({
  coordinatorUrl = process.env.SOLO_COMPUTE_URL || 'http://127.0.0.1:8787',
  token = process.env.SOLO_COMPUTE_TOKEN || '',
  authorize,
  fetchImpl = fetch
} = {}) {
  if (typeof authorize !== 'function') throw new TypeError('authorize(request) callback is required');
  const base = new URL(coordinatorUrl);
  if (base.protocol !== 'https:' && !['localhost', '127.0.0.1', '::1'].includes(base.hostname)) {
    throw new Error('Remote SOLO Compute coordinator must use HTTPS');
  }

  return async function handleSoloCompute(request) {
    try {
      const principal = await authorize(request);
      if (!principal) return json(401, { error: 'authentication_required' });
      if (!token || token.length < 32) return json(503, { error: 'compute_not_configured' });

      const incoming = new URL(request.url);
      const prefix = '/api/solo/compute';
      if (!incoming.pathname.startsWith(prefix)) return json(404, { error: 'not_found' });
      const suffix = incoming.pathname.slice(prefix.length) || '/';
      const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
      let upstream;

      if (request.method === 'GET' && suffix === '/status') {
        upstream = await fetchImpl(new URL('/v1/status', base), { headers, signal: AbortSignal.timeout(10000) });
      } else if (request.method === 'POST' && suffix === '/tasks') {
        const raw = await request.text();
        if (raw.length > 4096) return json(413, { error: 'request_too_large' });
        let input;
        try { input = JSON.parse(raw); } catch { return json(400, { error: 'invalid_json' }); }
        if (!TASK_TYPES.has(input.task_type) || !SHA.test(input.commit_sha || '')) {
          return json(400, { error: 'invalid_task_parameters' });
        }
        upstream = await fetchImpl(new URL('/v1/tasks', base), {
          method: 'POST', headers,
          body: JSON.stringify({ task_type: input.task_type, commit_sha: input.commit_sha, timeout_seconds: 600 }),
          signal: AbortSignal.timeout(10000)
        });
      } else {
        const match = suffix.match(/^\/tasks\/([a-f0-9-]{36})$/);
        if (request.method === 'GET' && match && ID.test(match[1])) {
          upstream = await fetchImpl(new URL('/v1/tasks/' + match[1], base), { headers, signal: AbortSignal.timeout(10000) });
        } else return json(404, { error: 'not_found' });
      }

      const payload = await upstream.json().catch(() => ({ error: 'invalid_coordinator_response' }));
      return json(upstream.status, payload);
    } catch (error) {
      return json(502, { error: 'compute_coordinator_unavailable', detail: String(error?.message || error).slice(0, 180) });
    }
  };
}
