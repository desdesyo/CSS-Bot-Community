import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const root = process.cwd();
test('coordinator requires token and exposes health endpoint', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'solo-coord-'));
  const port = 19000 + Math.floor(Math.random() * 1000);
  const child = spawn(process.execPath, ['solo-compute/coordinator.mjs'], {
    cwd: root, env: { ...process.env, SOLO_COMPUTE_TOKEN: 'test-secret-token', SOLO_COMPUTE_PORT: String(port), SOLO_COMPUTE_DATA: dir },
    stdio: 'ignore'
  });
  try {
    let ready = false;
    for (let i=0;i<40;i++) {
      try { const r=await fetch('http://127.0.0.1:'+port+'/health'); if(r.ok){ready=true;break;} } catch {}
      await new Promise(r=>setTimeout(r,50));
    }
    assert.equal(ready, true, 'coordinator did not start');
    const unauthorized = await fetch('http://127.0.0.1:'+port+'/v1/status');
    assert.equal(unauthorized.status,401);
    const auth = await fetch('http://127.0.0.1:'+port+'/v1/status',{headers:{authorization:'Bearer test-secret-token'}});
    assert.equal(auth.status,200);
    assert.equal((await auth.json()).queued,0);
  } finally {
    child.kill(); fs.rmSync(dir,{recursive:true,force:true});
  }
});
