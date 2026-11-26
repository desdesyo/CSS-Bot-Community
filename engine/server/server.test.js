import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createSessionServer } from './server.js';

test('two clients join the same session and receive both players', async () => {
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
    assert.equal((await welcomeA).type, 'welcome');
    assert.equal((await welcomeB).type, 'welcome');

    const snapshot = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('snapshot timeout')), 1500);
      a.on('message', data => {
        const message = JSON.parse(data);
        if (message.type === 'snapshot') {
          clearTimeout(timeout);
          resolve(message);
        }
      });
    });
    const state = await snapshot;
    assert.equal(state.players.length, 2);
    assert.deepEqual(new Set(state.players.map(p => p.name)), new Set(['Phone', 'PC']));
  } finally {
    a.terminate();
    b.terminate();
    await session.close();
  }
});
