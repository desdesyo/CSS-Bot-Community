import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createSessionServer } from './server.js';

test('two clients share one session and server-authoritative shots damage the other player', async () => {
  const session = createSessionServer(0);
  await once(session.wss, 'listening');
  const address = session.wss.address();
  const a = new WebSocket('ws://127.0.0.1:' + address.port);
  const b = new WebSocket('ws://127.0.0.1:' + address.port);
  try {
    await Promise.all([once(a, 'open'), once(b, 'open')]);
    const welcomeA = once(a, 'message').then(([data]) => JSON.parse(data));
    const welcomeB = once(b, 'message').then(([data]) => JSON.parse(data));
    a.send(JSON.stringify({ type: 'join', name: 'Phone' }));
    b.send(JSON.stringify({ type: 'join', name: 'PC' }));
    const wa = await welcomeA, wb = await welcomeB;
    assert.equal(wa.type, 'welcome'); assert.equal(wb.type, 'welcome');
    const pa = session.players.get(wa.id), pb = session.players.get(wb.id);
    pa.x = 300; pa.y = 300; pb.x = 420; pb.y = 300;

    const damage = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('damage snapshot timeout')), 2000);
      a.on('message', data => {
        const message = JSON.parse(data);
        if (message.type === 'snapshot' && message.players.find(p => p.id === wb.id)?.hp < 100) {
          clearTimeout(timeout); resolve(message);
        }
      });
    });
    a.send(JSON.stringify({ type: 'input', x: 0, y: 0, angle: 0, fire: true }));
    const result = await damage;
    assert.equal(result.players.find(p => p.id === wb.id).hp, 75);
    assert.equal(result.players.length, 2);
  } finally {
    a.terminate(); b.terminate(); await session.close();
  }
});
