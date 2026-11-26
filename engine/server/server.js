import { WebSocketServer } from 'ws';
import { randomUUID } from 'node:crypto';
const port=Number(process.env.PORT||8080),wss=new WebSocketServer({port});
const players=new Map();
function send(ws,data){if(ws.readyState===1)ws.send(JSON.stringify(data))}
function snapshot(){return {type:'snapshot',players:[...players.values()].map(({id,name,x,y,hp,angle})=>({id,name,x,y,hp,angle}))}}
function tick(){for(const p of players.values()){p.x=Math.max(20,Math.min(1260,p.x+p.input.x*5));p.y=Math.max(20,Math.min(700,p.y+p.input.y*5));p.angle=p.input.angle}const s=JSON.stringify(snapshot());for(const ws of wss.clients)if(ws.readyState===1)ws.send(s)}
const timer=setInterval(tick,50);
wss.on('connection',ws=>{let player=null;ws.on('message',raw=>{let m;try{m=JSON.parse(raw.toString())}catch{return}if(m.type==='join'&&!player){player={id:randomUUID(),name:String(m.name||'Player').slice(0,16),x:120+Math.random()*100,y:300+Math.random()*120,hp:100,angle:0,input:{x:0,y:0,angle:0}};players.set(player.id,player);send(ws,{type:'welcome',id:player.id,player:{x:player.x,y:player.y,hp:player.hp}})}else if(m.type==='input'&&player){const x=Number(m.x),y=Number(m.y),a=Number(m.angle);player.input={x:Number.isFinite(x)?Math.max(-1,Math.min(1,x)):0,y:Number.isFinite(y)?Math.max(-1,Math.min(1,y)):0,angle:Number.isFinite(a)?a:0}}});ws.on('close',()=>{if(player)players.delete(player.id)})});
wss.on('listening',()=>console.log('SOLO session server listening on '+port));
process.on('SIGTERM',()=>{clearInterval(timer);wss.close()});
export {wss,players};