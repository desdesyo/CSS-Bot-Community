const $ = id => document.getElementById(id);
const video = $('video'), status = $('status');
let socket, pc, channel, connected = false; const pendingIce = []; let fire = false, move = { x: 0, y: 0 }, look = { x: 0, y: 0 }, reload = false, jump = false, weapon = '';
const say = text => { status.textContent = text; };
function sendSignal(message) { if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message)); }
function sendInput() {
  if (!channel || channel.readyState !== 'open') return;
  channel.send(JSON.stringify({ x: move.x, y: move.y, lookX: look.x, lookY: look.y, fire, reload, jump, weapon, sprint: held.has('ShiftLeft') || held.has('ShiftRight') }));
  look.x = look.y = 0; reload = jump = false; weapon = '';
}
async function connect() {
  const room = $('room').value.trim().toUpperCase(), url = $('signal').value.trim();
  if (!/^[A-Z0-9]{6,12}$/.test(room) || !url.startsWith('wss://')) throw new Error('Нужен код комнаты и безопасный адрес wss://');
  socket = new WebSocket(url);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.onicecandidate = e => { if (e.candidate) sendSignal({ type: 'ice', candidate: e.candidate }); };
  pc.ontrack = e => { video.srcObject = e.streams[0]; $('connect').style.display = 'none'; say('Видеопоток подключён'); video.play().catch(() => say('Нажми на экран для запуска видео')); };
  pc.onconnectionstatechange = () => say('Соединение: ' + pc.connectionState);
  channel = pc.createDataChannel('control', { ordered: false, maxRetransmits: 0 });
  channel.onopen = () => { connected = true; say('Управление подключено'); };
  socket.addEventListener('message', async event => {
    const m = JSON.parse(event.data);
    try {
      if (m.type === 'joined' && m.peerReady) await offer();
      if (m.type === 'peer-ready') await offer();
      if (m.type === 'answer') { await pc.setRemoteDescription(m.description); for (const candidate of pendingIce.splice(0)) await pc.addIceCandidate(candidate); }
      if (m.type === 'ice' && m.candidate) { if (pc.remoteDescription) await pc.addIceCandidate(m.candidate); else pendingIce.push(m.candidate); }
      if (m.type === 'peer-left') { say('Облачный хост отключился'); video.srcObject = null; }
    } catch (error) { say('Ошибка подключения: ' + error.message); }
  });
  socket.addEventListener('close', () => say('Сигнальный сервер отключён'));
  sendSignal({ type: 'join', role: 'player', room });
}
let offered = false;
async function offer() {
  if (offered) return; offered = true;
  const description = await pc.createOffer();
  await pc.setLocalDescription(description);
  sendSignal({ type: 'offer', description: pc.localDescription });
  say('Согласование видеопотока…');
}
$('join').addEventListener('click', () => connect().catch(error => say(error.message)));
$('fire').addEventListener('pointerdown', e => { e.preventDefault(); $('fire').setPointerCapture(e.pointerId); fire = true; });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) $('fire').addEventListener(event, () => { fire = false; });
$('reload').addEventListener('pointerdown', e => { e.preventDefault(); reload = true; });
$('jump').addEventListener('pointerdown', e => { e.preventDefault(); jump = true; });
const stick = $('stick'), nub = $('nub'); let stickId = null, origin = null;
stick.addEventListener('pointerdown', e => { stickId = e.pointerId; origin = { x: e.clientX, y: e.clientY }; stick.setPointerCapture(e.pointerId); });
stick.addEventListener('pointermove', e => { if (e.pointerId !== stickId) return; const dx=e.clientX-origin.x,dy=e.clientY-origin.y,len=Math.max(1,Math.hypot(dx,dy)),k=Math.min(1,48/len);move.x=dx/48*k;move.y=dy/48*k;nub.style.transform='translate('+move.x*38+'px,'+move.y*38+'px)'; });
const reset = () => { stickId=null;move.x=move.y=0;nub.style.transform=''; };
stick.addEventListener('pointerup',reset);stick.addEventListener('pointercancel',reset);
let lookId = null, last = null;
$('look').addEventListener('pointerdown',e=>{lookId=e.pointerId;last={x:e.clientX,y:e.clientY};$('look').setPointerCapture(e.pointerId);});
$('look').addEventListener('pointermove',e=>{if(e.pointerId!==lookId)return;look.x+=(e.clientX-last.x)*.004;look.y+=(e.clientY-last.y)*.004;last={x:e.clientX,y:e.clientY};});
$('look').addEventListener('pointerup',()=>lookId=null);$('look').addEventListener('pointercancel',()=>lookId=null);
const held=new Set();const syncKeys=()=>{move.x=(held.has('KeyD')?1:0)-(held.has('KeyA')?1:0);move.y=(held.has('KeyS')?1:0)-(held.has('KeyW')?1:0);};window.addEventListener('keydown',e=>{held.add(e.code);syncKeys();if(e.code==='Space')jump=true;if(e.code==='KeyR')reload=true;if(e.code==='Digit1')weapon='rifle';if(e.code==='Digit2')weapon='pistol';if(e.code==='Digit3')weapon='grenade';if(e.code==='Digit4')weapon='knife';});
window.addEventListener('keyup',e=>{held.delete(e.code);syncKeys();if(e.code==='Space')jump=false;});video.addEventListener('click',()=>video.requestPointerLock?.());window.addEventListener('mousemove',e=>{if(document.pointerLockElement===video){look.x+=e.movementX*.0022;look.y+=e.movementY*.0022;}});window.addEventListener('mousedown',e=>{if(e.button===0)fire=true;});window.addEventListener('mouseup',e=>{if(e.button===0)fire=false;});
setInterval(sendInput,33);
window.addEventListener('beforeunload',()=>{sendSignal({type:'hangup'});pc?.close();socket?.close();});
