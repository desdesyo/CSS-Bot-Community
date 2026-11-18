import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
test('worker rejects arbitrary task types and malformed commits before execution', () => {
  const taskFile = path.join(os.tmpdir(), 'solo-compute-invalid-' + process.pid + '.json');
  fs.writeFileSync(taskFile, JSON.stringify({ schema_version: 1, task_id: 'bad', task_type: 'run-shell', commit_sha: 'a'.repeat(40) }));
  const r = spawnSync(process.execPath, ['solo-compute/worker.mjs', 'run', taskFile], { cwd: root, encoding: 'utf8', shell: false });
  fs.rmSync(taskFile, { force: true });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not allowlisted/);
});
test('worker doctor reports runtime and CPU without executing tasks', () => {
  const r = spawnSync(process.execPath, ['solo-compute/worker.mjs', 'doctor'], { cwd: root, encoding: 'utf8', shell: false });
  assert.equal(r.status, 0, r.stderr);
  const data = JSON.parse(r.stdout);
  assert.equal(data.worker, 'SOLO Compute Worker');
  assert.ok(data.cpus >= 1);
});
