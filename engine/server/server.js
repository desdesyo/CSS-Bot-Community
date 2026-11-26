import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';

const WALLS = [
  { x: 390, y: 90, w: 55, h: 220 }, { x: 390, y: 410, w: 55, h: 220 },
  { x: 650, y: 250, w: 210, h: 55 }, { x: 900, y: 90, w: 55, h: 210 },
  { x: 900, y: 420, w: 55, h: 210 }, { x: 180, y: 160, w: 120, h: 35 },
  { x: 180, y: 525, w: 120, h: 35 }, { x: 1080, y: 320, w: 100, h: 80 }
];

export function createSessionServer(port = Number(process.env.PORT || 8080)) {
  const players = new Map();
  const bullets = [];
  const wss = new WebSocketServer({ port });
  const blocked = (x, y, radius = 15) =>
    x < radius || y < radius || x > 1280 - radius || y > 720 - radius ||
    WALLS.some(w => x + radius > w.x && x - radius < w.x + w.w &&
      y + radius > w.y && y - radius < w.y + w.h);

  function snapshot() {
    return {
      type: 'snapshot',
      players: [...players.values()].map(({ id, name, x, y, hp, angle }) =>
        ({ id, name, x, y, hp, angle })),
      bullets: bullets.map(({ x, y }) => ({ x, y }))
    };
  }

  const timer = setInterval(() => {
    for (const p of players.values()) {
      const nx = p.x + p.input.x * 5, ny = p.y + p.input.y * 5;
      if (!blocked(nx, p.y)) p.x = nx;
      if (!blocked(p.x, ny)) p.y = ny;
      p.angle = p.input.angle;
      p.cooldown = Math.max(0, p.cooldown - 0.05);
      if (p.input.fire && p.cooldown <= 0 && p.hp > 0) {
        bullets.push({ owner: p.id, x: p.x, y: p.y, vx: Math.cos(p.angle) * 620, vy: Math.sin(p.angle) * 620, life: 1.2 });
        p.cooldown = 0.18;
      }
    }

    for (const b of bullets) {
      b.x += b.vx * 0.05; b.y += b.vy * 0.05; b.life -= 0.05;
      if (blocked(b.x, b.y, 3)) { b.life = -1; continue; }
      for (const p of players.values()) {
        if (p.id !== b.owner && p.hp > 0 && Math.hypot(p.x - b.x, p.y - b.y) < 19) {
          p.hp = Math.max(0, p.hp - 25); b.life = -1; break;
        }
      }
    }
    for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].life <= 0) bullets.splice(i, 1);

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
          id: randomUUID(), name: String(message.name || 'Player').slice(0, 16),
          x: 120 + Math.random() * 100, y: 300 + Math.random() * 120,
          hp: 100, angle: 0, cooldown: 0,
          input: { x: 0, y: 0, angle: 0, fire: false }
        };
        players.set(player.id, player);
        send(ws, { type: 'welcome', id: player.id, player: { x: player.x, y: player.y, hp: player.hp } });
      } else if (message.type === 'input' && player) {
        const x = Number(message.x), y = Number(message.y), angle = Number(message.angle);
        player.input = {
          x: Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0,
          y: Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0,
          angle: Number.isFinite(angle) ? angle : 0,
          fire: message.fire === true
        };
      }
    });
    ws.on('close', () => {
      if (player) {
        players.delete(player.id);
        for (let i = bullets.length - 1; i >= 0; i--) if (bullets[i].owner === player.id) bullets.splice(i, 1);
      }
    });
  });

  function send(ws, data) { if (ws.readyState === 1) ws.send(JSON.stringify(data)); }

  return {
    wss, players,
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
