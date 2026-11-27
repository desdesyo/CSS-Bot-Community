import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { createCloudSignalingServer } from './cloud-signaling.js';

async function startRelay() {
  const relay = createCloudSignalingServer({ port: 0, hostToken: 'test-host-token' });
  await once(relay.wss, 'listening');
  return { relay, url: 'ws://127.0.0.1:' + relay.wss.address().port };
}
function nextMessage(ws) {
  return once(ws, 'message').then(([raw]) => JSON.parse(raw.toString()));
}
async function connect(url) {
  const ws = new WebSocket(url);
  await once(ws, 'open');
  return ws;
}

test('cloud signaling authenticates host and relays WebRTC offer, answer and ICE only within the room', async () => {
  const { relay, url } = await startRelay();
  const host = await connect(url), player = await connect(url);
  try {
    const hostJoined = nextMessage(host);
    host.send(JSON.stringify({ type: 'join', role: 'host', room: 'AB12CD', token: 'test-host-token' }));
    assert.deepEqual(await hostJoined, { type: 'joined', room: 'AB12CD', role: 'host', peerReady: false });

    const playerJoined = nextMessage(player);
    const hostReady = nextMessage(host);
    player.send(JSON.stringify({ type: 'join', role: 'player', room: 'AB12CD' }));
    assert.deepEqual(await playerJoined, { type: 'joined', room: 'AB12CD', role: 'player', peerReady: true });
    assert.deepEqual(await hostReady, { type: 'peer-ready', role: 'player' });

    const offer = { type: 'offer', description: { type: 'offer', sdp: 'test-sdp' } };
    const relayedOffer = nextMessage(host);
    player.send(JSON.stringify(offer));
    assert.deepEqual(await relayedOffer, offer);

    const answer = { type: 'answer', description: { type: 'answer', sdp: 'test-answer' } };
    const relayedAnswer = nextMessage(player);
    host.send(JSON.stringify(answer));
    assert.deepEqual(await relayedAnswer, answer);

    const ice = { type: 'ice', candidate: { candidate: 'candidate:test' } };
    const relayedIce = nextMessage(host);
    player.send(JSON.stringify(ice));
    assert.deepEqual(await relayedIce, ice);
  } finally {
    host.terminate(); player.terminate(); await relay.close();
  }
});

test('cloud signaling rejects unauthenticated hosts and duplicate room roles', async () => {
  const { relay, url } = await startRelay();
  const badHost = await connect(url), host = await connect(url), duplicate = await connect(url);
  try {
    const badClosed = once(badHost, 'close');
    badHost.send(JSON.stringify({ type: 'join', role: 'host', room: 'ZXCVBN', token: 'wrong' }));
    const [code] = await badClosed;
    assert.equal(code, 1008);

    const joined = nextMessage(host);
    host.send(JSON.stringify({ type: 'join', role: 'host', room: 'ZXCVBN', token: 'test-host-token' }));
    await joined;
    const duplicateClosed = once(duplicate, 'close');
    duplicate.send(JSON.stringify({ type: 'join', role: 'host', room: 'ZXCVBN', token: 'test-host-token' }));
    const [duplicateCode] = await duplicateClosed;
    assert.equal(duplicateCode, 1013);
  } finally {
    badHost.terminate(); host.terminate(); duplicate.terminate(); await relay.close();
  }
});

test('cloud signaling removes empty rooms after peers disconnect', async () => {
  const { relay, url } = await startRelay();
  const host = await connect(url);
  try {
    const joined = nextMessage(host);
    host.send(JSON.stringify({ type: 'join', role: 'host', room: 'QWERTY', token: 'test-host-token' }));
    await joined;
    assert.equal(relay.rooms.has('QWERTY'), true);
    host.terminate();
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(relay.rooms.has('QWERTY'), false);
  } finally {
    host.terminate(); await relay.close();
  }
});
