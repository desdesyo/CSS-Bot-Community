import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
test('coordinator authenticates, queues, leases and records a worker result', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solo-coord-'));
  const port = 19000 + Math.floor(Math.random() * 1000);
  const token = 'test-secret-token-with-more-than-32-chars';
  const child = spawn(process.execPath, ['solo-compute/coordinator.mjs'], {
    cwd: root, env: { ...process.env, SOLO_COMPUTE_TOKEN: token, SOLO_COMPUTE_PORT: String(port), SOLO_COMPUTE_DATA: dir },
    stdio: 'ignore'
  });
  const base = 'http://127.0.0.1:' + port;
  const headers = { 'content-type': 'application/json', authorization: 'Bearer ' + token };
  const post = (route, data) => fetch(base + route, { method: 'POST', headers, body: JSON.stringify(data) });
  try {
    let ready = false;
    for (let i=0;i<50;i++) {
      try { const r=await fetch(base+'/health'); if(r.ok){ready=true;break;} } catch {}
      await new Promise(r=>setTimeout(r,50));
    }
    assert.equal(ready, true, 'coordinator did not start');
    assert.equal((await fetch(base+'/v1/status')).status,401);
    const rejected = await post('/v1/tasks',{task_type:'run-shell',commit_sha:'a'.repeat(40)});
    assert.equal(rejected.status,400);
    const queued = await post('/v1/tasks',{task_type:'node-smoke',commit_sha:'a'.repeat(40),timeout_seconds:60});
    assert.equal(queued.status,201);
    const task = (await queued.json()).task;
    assert.equal(task.status,'queued');
    const heartbeat = await post('/v1/workers/heartbeat',{worker_id:'test-node',platform:process.platform,cpu_count:2});
    assert.equal(heartbeat.status,200);
    const claim = await post('/v1/tasks/claim',{worker_id:'test-node'});
    const claimed = (await claim.json()).task;
    assert.equal(claimed.task_id,task.task_id);
    const taskView = await fetch(base+'/v1/tasks/'+task.task_id,{headers});
    assert.equal(taskView.status,200);
    assert.equal((await taskView.json()).task.status,'leased');
    const result = { task_id:task.task_id, commit_sha:task.commit_sha, status:'passed' };
    const submitted = await post('/v1/tasks/'+task.task_id+'/result',{worker_id:'test-node',result});
    assert.equal(submitted.status,200);
    const status = await fetch(base+'/v1/status',{headers});
    assert.equal((await status.json()).completed,1);
    const persisted = JSON.parse(fs.readFileSync(path.join(dir,'state.json'),'utf8'));
    assert.equal(persisted.tasks[0].status,'completed');
  } finally {
    child.kill();
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
