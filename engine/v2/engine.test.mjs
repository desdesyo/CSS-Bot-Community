import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward } from './engine-core.mjs';
import { DUST2_EXPANDED, validateDust2Balance, isDust2Blocked } from './dust2-layout.mjs';
import { DUST2_SCALE } from './dust2-map.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const runtime = readFileSync(fileURLToPath(new URL('./engine.js', import.meta.url)), 'utf8');
const geometry = readFileSync(new URL('./dust2-map.mjs', import.meta.url), 'utf8');

test('V2 startup resolves the render canvas declared by its HTML entrypoint', () => {
  assert.ok(html.includes('<canvas id="renderCanvas"'));
  assert.ok(html.includes('./engine.js?v=20261127-11'), 'runtime URL must change when deploying a cache-busting fix');
  assert.ok(html.includes("window.addEventListener('error'"));
  assert.ok(runtime.includes("const canvas = $('renderCanvas')"));
  assert.ok(runtime.includes('new B.Engine(canvas,'));
});
test('playable runtime includes bot combat, player damage, reload and fullscreen controls', () => {
  assert.ok(runtime.includes('function updateBotAI()'));
  assert.ok(runtime.includes('state.playerHitbox'));
  assert.ok(runtime.includes("state.hp=Math.max(0,state.hp-8)"));
  assert.ok(runtime.includes("$('reload').addEventListener"));
  assert.ok(runtime.includes("if(e.code==='KeyF')toggleFullscreen()"));
  assert.ok(runtime.includes('function toggleFullscreen()'));
  assert.ok(html.includes('id="reload"'));
  assert.ok(html.includes('id="fullscreen"'));
  assert.ok(html.includes('./engine.js?v=20261127-11'));
});
test('adaptive resolution reduces load on a slow mobile frame budget', () => {
  assert.ok(Math.abs(adaptiveScale(55, .9, true) - .84) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(12, .9, true) - .925) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(55, .83, true) - .82) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(12, .99, true) - 1) < 1e-9);
});
test('desktop profile has independent scale bounds', () => {
  assert.ok(Math.abs(adaptiveScale(40, 1, false) - .94) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(8, 1, false) - 1.025) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(8, 1.34, false) - 1.35) < 1e-9);
});
test('agent movement is speed-bounded and reports arrival', () => {
  assert.deepEqual(moveToward({x:0,z:0},{x:3,z:4},2,1), {x:1.2,z:1.6,arrived:false});
  assert.deepEqual(moveToward({x:0,z:0},{x:1,z:0},2,1), {x:1,z:0,arrived:true});
  assert.deepEqual(moveToward({x:2,z:2},{x:2,z:2},2,1), {x:2,z:2,arrived:true});
});

test('expanded Dust2 map is exactly four times the prototype area', () => {
  assert.equal(DUST2_EXPANDED.width * DUST2_EXPANDED.depth, 4 * 112 * 92);
});
test('CT and T have equal shortest graph travel distance to both bombsites', () => {
  const result = validateDust2Balance();
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(result.travel.A, {ct:92,t:92});
  assert.deepEqual(result.travel.B, {ct:92,t:92});
});
test('expanded map collision bounds keep players inside the map and block perimeter', () => {
  assert.equal(isDust2Blocked(0,0), false);
  assert.equal(isDust2Blocked(0,92), true);
  assert.equal(isDust2Blocked(114,0), true);
});
test('runtime uses the expanded Dust2 map and spawns the player at T spawn', () => {
  assert.ok(runtime.includes("buildExpandedDust2(BABYLON,scene,shadowGen,mat,box)"));
  assert.ok(runtime.includes("DUST2_EXPANDED.spawns.t"));
  assert.ok(runtime.includes('scene.pickWithRay(ray,isMapSolid)'));
});

test('both team spawns and both bombsite centers are walkable', () => {
  for (const p of [[0,73],[0,-73],[-83,-4],[83,4]]) assert.equal(isDust2Blocked(p[0],p[1]), false, 'blocked point '+p.join(','));
});
test('expanded map exposes long A route, lower B tunnel and central mid geometry', () => {
  const geometry = readFileSync(new URL('./dust2-map.mjs', import.meta.url), 'utf8');
  assert.ok(geometry.includes('A upper catwalk'));
  assert.ok(geometry.includes('B lower tunnel'));
  assert.ok(geometry.includes('mid plaza'));
  assert.ok(geometry.includes('A site courtyard'));
  assert.ok(geometry.includes('B site courtyard'));
});

test('architecture uses metre scale with real door, window and human proportions', () => {
  assert.equal(DUST2_SCALE.metresPerUnit, 1);
  assert.deepEqual(DUST2_SCALE.door, {width:.95,height:2.1});
  assert.deepEqual(DUST2_SCALE.window, {width:1.2,height:1,sill:.9});
  assert.equal(DUST2_SCALE.humanHeight, 1.8);
  assert.ok(DUST2_EXPANDED.architecture.length >= 10);
});

test('building facade openings, roofs, stairs and street details are generated as 3D geometry', () => {
  const geometry=readFileSync(new URL('./dust2-map.mjs',import.meta.url),'utf8');
  for(const part of ['doorway(', 'window(', 'arch(', 'flat roof', 'balcony rail', 'tread ', 'awning', 'drain pipe', 'water tank']) assert.ok(geometry.includes(part), 'missing '+part);
});

test('building wall collision blocks solid facade but leaves the entrance gap open', () => {
  const b=DUST2_EXPANDED.architecture[0], doorX=b.x-b.w*.22;
  assert.equal(isDust2Blocked(b.x,b.z+b.d/2),true);
  assert.equal(isDust2Blocked(doorX,b.z+b.d/2),false);
});

test('runtime uses rendered mesh collision, sky, radar and breakable windows', () => {
  assert.ok(runtime.includes('function isMapSolid(mesh)'));
  assert.ok(runtime.includes('scene.pickWithRay(ray,isMapSolid)'));
  assert.ok(runtime.includes('function buildSky(B)'));
  assert.ok(runtime.includes('function drawRadar()'));
  assert.ok(runtime.includes('metadata?.breakableWindow'));
  assert.ok(runtime.includes('target.isPickable=false;target.isVisible=false'));
  assert.ok(html.includes('id="radar"'));
  const geometry=readFileSync(new URL('./dust2-map.mjs',import.meta.url),'utf8');
  assert.ok(geometry.includes('glass.alpha=.18'));
  assert.ok(geometry.includes('breakableWindow:true'));
});

test('player fire ray excludes the players own hitbox to avoid self-hit', () => {
  const fireBody=runtime.slice(runtime.indexOf('function fire()'),runtime.indexOf('function initInput()'));
  assert.ok(fireBody.includes('scene.pickWithRay(ray,m=>isMapSolid(m)||m.name.startsWith(\'body-\')'));
  assert.ok(!fireBody.includes('m===state.playerHitbox'));
});

test('weapon wheel and all four weapon categories are wired to desktop, gamepad and touch', () => {
  for (const id of ['rifle','pistol','grenade','knife']) assert.ok(runtime.includes("'"+id+"'"));
  assert.ok(runtime.includes("if(e.code==='Tab')"));
  assert.ok(runtime.includes("if(e.code>='Digit1'&&e.code<='Digit4')"));
  assert.ok(runtime.includes('function padButton(pad,index)'));
  assert.ok(runtime.includes("$('weaponButton').addEventListener"));
  assert.ok(html.includes('id="weaponWheel"'));
  assert.ok(html.includes('data-weapon="rifle"'));
  assert.ok(html.includes('data-weapon="grenade"'));
});
test('weapon fire uses per-weapon ammo, cadence and reload state', () => {
  assert.ok(runtime.includes('function currentWeapon()'));
  assert.ok(runtime.includes("if(state.weapon==='grenade')"));
  assert.ok(runtime.includes("if(state.weapon==='knife')"));
  assert.ok(runtime.includes('function reload(){const w=currentWeapon()'));
  assert.ok(runtime.includes('updateAmmoHud();'));
});

test('full Gamepad API support maps both sticks, triggers, face buttons, bumpers and D-pad',()=>{
  for(const token of ['function padAxis(v)','function padButton(pad,index)','function updateGamepad(dt)','pad.axes?.[0]','pad.axes?.[2]','pad.buttons?.[6]?.value','pad.buttons?.[7]?.value','padEdge(pad,0)','padEdge(pad,2)','padEdge(pad,3)','padEdge(pad,5)','padEdge(pad,8)','padEdge(pad,9)','padEdge(pad,12)','padEdge(pad,15)','gamepadconnected','gamepaddisconnected']) assert.ok(runtime.includes(token),'missing gamepad mapping '+token);
  assert.ok(runtime.includes('state.gamepad.sprint=padButton(pad,10)'));
  assert.ok(runtime.includes('camera.fov+=(targetFov-camera.fov)'));
  assert.ok(runtime.includes('updateGamepad(dt);'));
  assert.ok(html.includes('id="padStatus"'));
});
test('gamepad jump and sprint are integrated into player movement and reset on respawn',()=>{
  assert.ok(runtime.includes('state.gamepad.jumpVelocity=5.1'));
  assert.ok(runtime.includes('state.gamepad.sprint?6.2:4.6'));
  assert.ok(runtime.includes('camera.position.y=1.65+state.gamepad.jumpOffset'));
  assert.ok(runtime.includes('state.gamepad.jumpVelocity=0;state.gamepad.jumpOffset=0'));
});

test('weapon fire produces visible travelling tracers and uses wall-safe aim assistance', () => {
  assert.ok(runtime.includes('function findAssistedAimDirection()'));
  assert.ok(runtime.includes('function spawnBulletTracer('));
  assert.ok(runtime.includes("'bullet-tracer'"));
  assert.ok(runtime.includes('scene.pickWithRay(sight'));
  assert.ok(runtime.includes('spawnBulletTracer(camera.position.clone(),direction,hit?.hit?hit.distance:w.range)'));
});
test('radar is placed on the left side and remains compact on mobile', () => {
  assert.ok(html.includes('#radar{position:fixed;left:12px;right:auto;'));
});
test('doorways are recessed and upper window mullions follow their own floor height', () => {
  assert.ok(geometry.includes('recessed open doorway shadow'));
  assert.ok(geometry.includes("centerY,z+sgn*.25,W-.08,.055,.035"));
});

test('legacy rifle firing cadence, hold-to-fire and timed reload are preserved', () => {
  assert.match(runtime, /rifle:\{name:'ВИНТОВКА',ammo:30,reserve:90,damage:34,rate:105,range:95\}/);
  assert.ok(runtime.includes("window.addEventListener('mousedown',e=>{if(e.button===0&&state.started){state.fireMouse=true;state.firing=true;fire();}})"));
  assert.ok(runtime.includes("fireButton.addEventListener('pointerdown'"));
  assert.ok(runtime.includes("if(state.firing)fire();"));
  assert.ok(runtime.includes('function updateGamepad(dt)'));
  assert.ok(runtime.includes('state.gamepad.fire=!!(trigger&&state.started&&!state.wheelOpen)'));
  assert.ok(runtime.includes("},1250);"));
  assert.ok(runtime.includes('old-style-muzzle-flash'));
});

test('touch movement remains active without a connected gamepad', () => {
  assert.ok(runtime.includes('touchStickActive:false'));
  assert.ok(runtime.includes('if(!state.touchStickActive)state.joy.x=state.joy.y=0'));
  assert.ok(runtime.includes('state.touchStickActive=true'));
});
test('legacy weapon kick moves the viewmodel rather than changing aim direction', () => {
  assert.ok(runtime.includes('state.weaponKick=.04'));
  assert.ok(runtime.includes('viewBaseZ'));
  assert.ok(runtime.includes('mesh.position.z=mesh.metadata.viewBaseZ+state.weaponKick'));
});
