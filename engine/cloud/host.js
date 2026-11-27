const qs = new URLSearchParams(location.search);
const room = (qs.get('room') || '').toUpperCase();
const signalUrl = qs.get('signal') || 'wss://YOUR-SIGNAL-HOST.example';
const token = qs.get('token') || '';
const status = document.getElementById('status');
const frame = document.getElementById('game');
let socket, pc, stream, peerReady = false; const pendingIce = [];
const say = value => { status.textContent = value; };
if (!/^[A-Z0-9]{6,12}$/.test(room) || !token || signalUrl.includes('YOUR-SIGNAL-HOST')) {
  say('Укажи room, signal и host token в URL'); throw new Error('Cloud host configuration missing');
}
function send(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
async function makePeer() {
  if (pc) { pc.close(); pc = null; }
  const canvas = frame.contentDocument?.querySelector('#renderCanvas');
  if (!canvas?.captureStream) throw new Error('Canvas captureStream недоступен в этом браузере');
  stream = canvas.captureStream(60);
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  for (const track of stream.getVideoTracks()) pc.addTrack(track, stream);
  pc.onicecandidate = e => { if (e.candidate) send({ type: 'ice', candidate: e.candidate }); };
  pc.onconnectionstatechange = () => say('WebRTC: ' + pc.connectionState);
  pc.ondatachannel = e => {
    const channel = e.channel;
    channel.onmessage = event => {
      try { frame.contentWindow.postMessage({ type: 'SOLO_CLOUD_INPUT', input: JSON.parse(event.data) }, location.origin); } catch {}
    };
  };
  return pc;
}
async function handleOffer(description) {
  await makePeer();
  await pc.setRemoteDescription(description);
  for (const candidate of pendingIce.splice(0)) await pc.addIceCandidate(candidate);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  send({ type: 'answer', description: pc.localDescription });
  say('Ожидание подключения игрока…');
}
async function connect() {
  socket = new WebSocket(signalUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', async event => {
    const message = JSON.parse(event.data);
    try {
      if (message.type === 'joined') { say('Комната ' + room + ' · ожидаю игрока'); if (message.peerReady) peerReady = true; }
      if (message.type === 'peer-ready') { peerReady = true; say('Игрок найден · готовлю видеопоток'); }
      if (message.type === 'offer') await handleOffer(message.description);
      if (message.type === 'ice' && message.candidate) { if (pc?.remoteDescription) await pc.addIceCandidate(message.candidate); else pendingIce.push(message.candidate); }
      if (message.type === 'peer-left') { pc?.close(); pc = null; say('Игрок отключился'); }
    } catch (error) { say('Ошибка WebRTC: ' + error.message); }
  });
  socket.addEventListener('close', () => say('Сигнальный сервер отключён'));
  send({ type: 'join', role: 'host', room, token });
}
document.getElementById('launch').addEventListener('click', () => {
  const start = frame.contentDocument?.getElementById('start');
  if (start && !start.disabled) start.click();
  else say('Игра ещё загружается');
});
frame.addEventListener('load', () => say('Игровой клиент загружен · нажми «Запустить игру»'));
connect().catch(error => say('Нет соединения: ' + error.message));
window.addEventListener('beforeunload', () => { send({ type: 'hangup' }); pc?.close(); socket?.close(); });
