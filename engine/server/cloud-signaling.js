import { WebSocketServer } from 'ws';

const ROOM_RE = /^[A-Z0-9]{6,12}$/;
const ROLES = new Set(['host', 'player']);
const SIGNAL_TYPES = new Set(['offer', 'answer', 'ice', 'hangup']);
const MAX_SIGNAL_BYTES = 48 * 1024;

export function createCloudSignalingServer({
  port = Number(process.env.CLOUD_SIGNAL_PORT || 8090),
  hostToken = process.env.CLOUD_HOST_TOKEN || '',
  allowedOrigins = (process.env.CLOUD_ALLOWED_ORIGINS || '').split(',').filter(Boolean)
} = {}) {
  if (!hostToken) throw new Error('CLOUD_HOST_TOKEN is required; refusing to start an unauthenticated cloud host relay');
  const rooms = new Map();
  const wss = new WebSocketServer({
    port,
    maxPayload: MAX_SIGNAL_BYTES,
    verifyClient: ({ origin }, done) => {
      if (allowedOrigins.length && !allowedOrigins.includes(origin)) return done(false, 403, 'Origin not allowed');
      done(true);
    }
  });

  const send = (ws, data) => {
    if (ws?.readyState === 1) ws.send(JSON.stringify(data));
  };
  const detach = client => {
    if (!client.room) return;
    const room = rooms.get(client.room);
    if (!room) return;
    if (room[client.role] === client) room[client.role] = null;
    const peer = room[client.role === 'host' ? 'player' : 'host'];
    send(peer, { type: 'peer-left', role: client.role });
    if (!room.host && !room.player) rooms.delete(client.room);
    client.room = null;
  };

  wss.on('connection', ws => {
    const client = { room: null, role: null, alive: true };
    ws.on('pong', () => { client.alive = true; });
    ws.on('message', raw => {
      if (raw.length > MAX_SIGNAL_BYTES) return ws.close(1009, 'Signal too large');
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return ws.close(1007, 'Invalid JSON'); }

      if (message.type === 'join') {
        if (client.room) return ws.close(1008, 'Already joined');
        const roomId = String(message.room || '').toUpperCase();
        const role = String(message.role || '');
        if (!ROOM_RE.test(roomId) || !ROLES.has(role)) return ws.close(1008, 'Invalid room or role');
        if (role === 'host' && message.token !== hostToken) return ws.close(1008, 'Host authentication failed');
        let room = rooms.get(roomId);
        if (!room) { room = { host: null, player: null }; rooms.set(roomId, room); }
        if (room[role]) return ws.close(1013, 'Role already occupied');
        client.room = roomId;
        client.role = role;
        room[role] = ws;
        ws.client = client;
        send(ws, { type: 'joined', room: roomId, role, peerReady: !!room[role === 'host' ? 'player' : 'host'] });
        send(room[role === 'host' ? 'player' : 'host'], { type: 'peer-ready', role });
        return;
      }

      if (!client.room || !SIGNAL_TYPES.has(message.type)) return ws.close(1008, 'Not joined or unsupported message');
      const room = rooms.get(client.room);
      const peer = room?.[client.role === 'host' ? 'player' : 'host'];
      if (!peer) return;
      if (message.type === 'offer' && client.role !== 'player') return ws.close(1008, 'Only player may offer');
      if (message.type === 'answer' && client.role !== 'host') return ws.close(1008, 'Only host may answer');
      if (message.type === 'ice' && !['host', 'player'].includes(client.role)) return;
      const payload = message.type === 'ice' ? message.candidate : message.description;
      if (message.type !== 'hangup' && (!payload || typeof payload !== 'object')) return ws.close(1008, 'Missing signal payload');
      send(peer, message);
    });
    ws.on('close', () => detach(client));
    ws.on('error', () => detach(client));
  });

  const heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      const client = ws.client;
      if (client && !client.alive) { ws.terminate(); detach(client); continue; }
      if (client) { client.alive = false; ws.ping(); }
    }
  }, 15000);
  heartbeat.unref?.();

  return {
    wss, rooms,
    close: async () => {
      clearInterval(heartbeat);
      for (const ws of wss.clients) ws.terminate();
      await new Promise(resolve => wss.close(resolve));
      rooms.clear();
    }
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const server = createCloudSignalingServer();
  server.wss.on('listening', () => console.log('SOLO cloud signaling listening on ' + server.wss.address().port));
  process.on('SIGTERM', async () => { await server.close(); process.exit(0); });
}
