const qs = new URLSearchParams(location.search);
const room = (qs.get('room') || '').toUpperCase();
const signalUrl = qs.get('signal') || 'wss://YOUR-SIGNAL-HOST.example';
const token = new URLSearchParams(location.hash.slice(1)).get('token') || '';
const autoStart = qs.get('autostart') === '1';
const status = document.getElementById('status');
const frame = document.getElementById('game');
let socket, pc, stream, peerReady = false, videoSender = null, lastStats = null; const pendingIce = [];
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
  const gl=canvas.getContext('webgl2')||canvas.getContext('webgl');
  const debug=gl?.getExtension('WEBGL_debug_renderer_info');
  const gpu=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):'WebGL renderer hidden by browser';
  say('GPU: '+gpu+' · Canvas '+canvas.width+'×'+canvas.height);
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
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
  // Attach the captured GPU-rendered canvas to the recv-only video transceiver offered by the player.
  for (const track of stream.getVideoTracks()) { const sender=pc.addTrack(track, stream);videoSender=sender; try { const params=sender.getParameters(); params.encodings=params.encodings?.length?params.encodings:[{}]; params.encodings[0].maxBitrate=16000000; params.encodings[0].maxFramerate=60; await sender.setParameters(params); } catch {} }
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
document.getElementById('launch').addEventListener('click', async () => {
  try { if(!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); } catch {}
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const start = frame.contentDocument?.getElementById('start');
  if (start && !start.disabled) start.click();
  else say('Игра ещё загружается');
});
frame.addEventListener('load', () => {
  say(autoStart ? 'GPU host загружен · автозапуск игры…' : 'Игровой клиент загружен · нажми «Запустить игру»');
  if(autoStart){
    const timer=setInterval(()=>{
      const start=frame.contentDocument?.getElementById('start');
      if(start&&!start.disabled){clearInterval(timer);start.click();say('GPU host запущен · ожидаю игрока');}
    },500);
    setTimeout(()=>clearInterval(timer),90000);
  }
});
connect().catch(error => say('Нет соединения: ' + error.message));
setInterval(async()=>{
  if(!videoSender)return;
  try{
    const stats=await videoSender.getStats();let line='';
    stats.forEach(s=>{
      if(s.type==='outbound-rtp'&&s.kind==='video'){
        const now=performance.now(),fps=s.framesPerSecond||0,bytes=s.bytesSent||0;
        let bitrate=0;if(lastStats){const sec=(now-lastStats.time)/1000;bitrate=Math.max(0,(bytes-lastStats.bytes)*8/sec/1000000);}
        lastStats={time:now,bytes};
        line=' · '+(s.frameWidth||0)+'×'+(s.frameHeight||0)+' · '+Math.round(fps)+' FPS · '+bitrate.toFixed(1)+' Mbps';
      }
    });
    if(line)say('WebRTC '+pc?.connectionState+line);
  }catch{}
},1500);
window.addEventListener('beforeunload', () => { send({ type: 'hangup' }); pc?.close(); socket?.close(); });
