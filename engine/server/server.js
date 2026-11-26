import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

export function createSessionServer(port = Number(process.env.PORT || 8080)) {
  const players = new Map();
  const wss = new WebSocketServer({ port });

  function send(ws, data) {
    if (ws.readyState === 1) ws.send(JSON.stringify(data));
  }
  function snapshot() {
    return {
      type: 'snapshot',
      players: [...players.values()].map(({ id, name, x, y, hp, angle }) =>
        ({ id, name, x, y, hp, angle }))
    };
  }

  const timer = setInterval(() => {
    for (const p of players.values()) {
      p.x = Math.max(20, Math.min(1260, p.x + p.input.x * 5));
      p.y = Math.max(20, Math.min(700, p.y + p.input.y * 5));
      p.angle = p.input.angle;
    }
    const message = JSON.stringify(snapshot());
    for (const ws of wss.clients) if (ws.readyState === 1) ws.send(message);
  }, 50);

  wss.on('connection', ws => {
    let player = null;
    ws.on('message', raw => {
      let message;
      try { message = JSON.parse(raw.toString()); } catch { return; }
      if (message.type === 'join' && !player) {
        player = {
          id: randomUUID(),
          name: String(message.name || 'Player').slice(0, 16),
          x: 120 + Math.random() * 100,
          y: 300 + Math.random() * 120,
          hp: 100,
          angle: 0,
          input: { x: 0, y: 0, angle: 0 }
        };
        players.set(player.id, player);
        send(ws, { type: 'welcome', id: player.id, player: { x: player.x, y: player.y, hp: player.hp } });
      } else if (message.type === 'input' && player) {
        const x = Number(message.x), y = Number(message.y), angle = Number(message.angle);
        player.input = {
          x: Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0,
          y: Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0,
          angle: Number.isFinite(angle) ? angle : 0
        };
      }
    });
    ws.on('close', () => { if (player) players.delete(player.id); });
  });

  return {
    wss,
    players,
    close: async () => {
      clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      await new Promise(resolve => wss.close(resolve));
    }
  };
}

if (process.argv[1] && new URL(import.meta.url).pathname === process.argv[1]) {
  const server = createSessionServer();
  server.wss.on('listening', () => console.log('SOLO session server listening on ' + server.wss.address().port));
  process.on('SIGTERM', async () => { await server.close(); process.exit(0); });
}
