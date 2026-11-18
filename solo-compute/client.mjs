#!/usr/bin/env node
const [mode, baseUrl, taskType, commitSha] = process.argv.slice(2);
const token = process.env.SOLO_COMPUTE_TOKEN || '';
if (!mode || !baseUrl) {
  process.stderr.write('Usage: node solo-compute/client.mjs status <url> | submit <url> <node-smoke|cmake-test> <40-char-commit-sha>\n');
  process.exit(2);
}
if (token.length < 32) {
  process.stderr.write('Set SOLO_COMPUTE_TOKEN to the coordinator shared token (32+ characters).\n');
  process.exit(2);
}
const url = new URL(baseUrl);
if (url.protocol !== 'https:' && !['localhost','127.0.0.1','::1'].includes(url.hostname)) {
  process.stderr.write('Remote coordinator URLs must use HTTPS.\n');
  process.exit(2);
}
const headers = { authorization: 'Bearer ' + token, 'content-type': 'application/json' };
try {
  const response = mode === 'status'
    ? await fetch(new URL('/v1/status', url), { headers, signal: AbortSignal.timeout(15000) })
    : mode === 'submit' && ['node-smoke','cmake-test'].includes(taskType) && /^[0-9a-f]{40}$/.test(commitSha || '')
      ? await fetch(new URL('/v1/tasks', url), { method:'POST', headers, body:JSON.stringify({task_type:taskType,commit_sha:commitSha,timeout_seconds:600}), signal:AbortSignal.timeout(15000) })
      : null;
  if (!response) throw new Error('Invalid command or task parameters');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Coordinator HTTP ' + response.status);
  process.stdout.write(JSON.stringify(data,null,2)+'\n');
} catch (error) {
  process.stderr.write('SOLO Compute client: '+error.message+'\n');
  process.exitCode = 1;
}
