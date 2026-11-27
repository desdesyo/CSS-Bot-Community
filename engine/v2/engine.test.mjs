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
  assert.ok(html.includes('./engine.js?v=20261127-21'), 'runtime URL must change when deploying a cache-busting fix');
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
  assert.ok(html.includes('./engine.js?v=20261127-21'));
});
test('adaptive resolution reduces load on a slow mobile frame budget', () => {
  assert.ok(Math.abs(adaptiveScale(55, .68, true) - .60) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(12, .68, true) - .695) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(55, .54, true) - .5) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(12, .79, true) - .8) < 1e-9);
});
test('mobile build disables shadows, skips external rigged models, and uses cheap map collision',()=>{
  assert.ok(runtime.includes("const cloudHost = new URLSearchParams(location.search).get('cloudHost') === '1'"));
  assert.ok(runtime.includes('shadowGen=mobile?null:new B.ShadowGenerator(cloudHost?4096:2048,sun)'));
  assert.ok(runtime.includes("if(mobile){$('loadState').textContent='Мобильный профиль: облегчённые бойцы без тяжёлых GLB-моделей.';return false;}"));
  assert.ok(runtime.includes('function buildMapCollisionIndex()'));
  assert.ok(runtime.includes("mapCollisionGrid.get(gx+','+gz)"));
  assert.ok(runtime.includes('m.metadata||{}),mapCollider:cast'));
  assert.ok(!runtime.includes('return isDust2Blocked(x,z);'));
  assert.ok(runtime.includes('scale:cloudHost?1:(mobile?0.68:1.25)'));
  assert.ok(runtime.includes('const targetDpr=cloudHost?1:(mobile?1:1.5)'));
  assert.ok(!html.includes('babylonjs.loaders.min.js'));
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
  assert.ok(fireBody.includes('resolveHitscanShot(origin,direction,w.damage,w.range)'));
  assert.ok(!fireBody.includes('m===state.playerHitbox'));
});

test('weapon wheel and all four weapon categories are wired to desktop, gamepad and touch', () => {
  for (const id of ['rifle','pistol','grenade','knife']) assert.ok(runtime.includes("'"+id+"'"));
  assert.ok(runtime.includes("if(e.code==='Tab')"));
  assert.ok(runtime.includes("if(e.code>='Digit1'&&e.code<='Digit4')"));
  assert.ok(runtime.includes('function padButton('));
  assert.ok(runtime.includes("$('weaponButton').addEventListener"));
  assert.ok(html.includes('id="weaponWheel"'));
  assert.ok(html.includes('data-weapon="rifle"'));
  assert.ok(html.includes('data-weapon="grenade"'));
});
test('weapon fire uses per-weapon ammo, cadence and reload state', () => {
  assert.ok(runtime.includes('function currentWeapon()'));
  assert.ok(runtime.includes("if(state.weapon==='grenade')"));
  assert.ok(runtime.includes("if(state.weapon==='knife')"));
  assert.ok(runtime.includes('function reload(){'));
  assert.ok(runtime.includes('updateAmmoHud();'));
});

test('non-standard Android gamepads can move with the D-pad when only one stick is exposed',()=>{
  assert.ok(runtime.includes("if(pad.mapping!=='standard'&&axes.length<4)"));
  assert.ok(runtime.includes("if(pad.mapping==='standard'||axes.length>=4)"));
});
test('full Gamepad API support maps both sticks, triggers, face buttons, bumpers and D-pad',()=>{
  for(const token of ['function padAxis(v)','function padButton(pad,index)','function updateGamepad(dt)','const axes=pad.axes||[]','axes[0]','axes[2]','pad.buttons?.[6]?.value','pad.buttons?.[7]?.value','padEdge(pad,0)','padEdge(pad,2)','padEdge(pad,3)','padEdge(pad,5)','padEdge(pad,8)','padEdge(pad,9)','padEdge(pad,12)','padEdge(pad,15)','gamepadconnected','gamepaddisconnected']) assert.ok(runtime.includes(token),'missing gamepad mapping '+token);
  assert.ok(runtime.includes('state.gamepad.sprint=padButton(pad,10)'));
  assert.ok(runtime.includes('camera.fov+=(targetFov-camera.fov)'));
  assert.ok(runtime.includes('updateGamepad(dt);'));
  assert.ok(html.includes('id="padStatus"'));
});
test('gamepad jump and sprint are integrated into player movement and reset on respawn',()=>{
  assert.ok(runtime.includes('jumpVelocity=5.1'));
  assert.ok(runtime.includes('state.gamepad.sprint?6.2:4.6'));
  assert.ok(runtime.includes('camera.position.y=1.65+state.gamepad.jumpOffset'));
  assert.ok(runtime.includes('state.gamepad.jumpVelocity=0;state.gamepad.jumpOffset=0'));
});

test('weapon fire resolves immediately with legacy hitscan and wall-safe aim assistance', () => {
  assert.ok(runtime.includes('function findAssistedAimDirection()'));
  assert.ok(runtime.includes('function resolveHitscanShot('));
  assert.ok(runtime.includes('scene.pickWithRay(sight'));
  assert.ok(runtime.includes('resolveHitscanShot(origin,direction,w.damage,w.range)'));
  assert.ok(!runtime.includes('function updateProjectiles('));
  assert.ok(!runtime.includes('function spawnBallisticProjectile('));
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
  assert.ok(runtime.includes("},1600);"));
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

test('V2 loads rigged animated soldier models and scales the first-person weapon down',()=>{
  assert.ok(runtime.includes("script.src='https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js'"));
  assert.ok(runtime.includes('LoadAssetContainerAsync'));
  assert.ok(runtime.includes('instantiateModelsToScene'));
  assert.ok(runtime.includes('setBotAnimation(bot'));
  assert.ok(runtime.includes('rig.scaling.setAll(scale)'));
  assert.ok(runtime.includes('compact-viewmodel-root'));
  assert.ok(runtime.includes('viewModel.root.scaling.setAll(.56)'));
  assert.ok(runtime.includes('bot.realModel=rig'));
  assert.ok(runtime.includes('rig.rotation.y=Math.PI'), 'GLB forward axis must match the V2 bot forward axis');
  assert.ok(runtime.includes('fallbackParts'));
  assert.ok(runtime.includes('right-finger|left-finger'));
});
test('player shots use bounded one-frame hitscan instead of per-frame projectile meshes',()=>{
  assert.ok(runtime.includes('function resolveHitscanShot('));
  assert.ok(runtime.includes('scene.pickWithRay(ray,mesh=>'));
  assert.ok(runtime.includes('bot.health-=head?100:damage'));
  assert.ok(!runtime.includes('player-projectile-trail'));
  assert.ok(!runtime.includes('disposeProjectile'));
  assert.ok(!runtime.includes('state.projectiles'));
});

test('shadow casters are optional and never dereference a missing shadow generator on mobile',()=>{
  assert.ok(runtime.includes('if(shadowGen)shadowGen.addShadowCaster(body)'));
  assert.ok(runtime.includes('if(!mobile&&shadowGen)shadowGen.addShadowCaster(mesh)'));
  const calls=runtime.split('shadowGen.addShadowCaster').length-1;
  assert.equal(calls,3,'all shadow caster registrations must remain explicitly guarded');
});

test('firing has a defined muzzle flash handler and expires the flash without allocating per-shot meshes',()=>{
  assert.ok(runtime.includes('function showMuzzleFlash(){'));
  assert.ok(runtime.includes('state.muzzleFlash.setEnabled(true)'));
  assert.ok(runtime.includes('state.muzzleFlashUntil=performance.now()+55'));
  assert.ok(runtime.includes('now>=state.muzzleFlashUntil'));
  assert.ok(runtime.includes('state.muzzleFlash.setEnabled(false)'));
});


test('V2 exposes a same-origin validated input bridge for cloud-hosted rendering',()=>{
  assert.ok(runtime.includes("event.source!==window.parent"));
  assert.ok(runtime.includes("event.origin!==location.origin"));
  assert.ok(runtime.includes("event.data?.type!=='SOLO_CLOUD_INPUT'"));
  assert.ok(runtime.includes('state.touchStickActive=true'));
  assert.ok(runtime.includes('state.fireTouch=input.fire===true'));
});

test('mobile touch controls suppress browser selection and preserve independent pointer capture',()=>{
  assert.ok(html.includes('user-select:none'));
  assert.ok(html.includes('-webkit-touch-callout:none'));
  assert.ok(html.includes('overscroll-behavior:none'));
  assert.ok(runtime.includes('let firePointerId=null'));
  assert.ok(runtime.includes('fireButton.setPointerCapture(e.pointerId)'));
  assert.ok(runtime.includes("stick.addEventListener('pointerdown',e=>{e.preventDefault()"));
  assert.ok(runtime.includes("look.addEventListener('pointerdown',e=>{e.preventDefault()"));
});
test('grenade uses ballistic motion, wall collision, bounce and line-of-sight blast damage',()=>{
  for(const token of ['velocity.y-=9.81*dt','scene.pickWithRay(ray,isMapSolid)','velocity.subtractInPlace(normal.scale(1.55*into))','fuse=2.15','radius=6.5','if(blocked?.hit)continue']) assert.ok(runtime.includes(token),'missing grenade physics '+token);
});
test('player collision is indexed from actual static map geometry, not hand-authored blockers',()=>{
  assert.ok(runtime.includes('function buildMapCollisionIndex()'));
  assert.ok(runtime.includes('mapCollider:cast'));
  assert.ok(runtime.includes('buildMap();buildMapCollisionIndex();'));
  assert.ok(!runtime.includes('return isDust2Blocked(x,z);'));
});
test('sun disc is removed; directional sun and hemispheric fill provide stable global lighting',()=>{
  assert.ok(!runtime.includes("CreateSphere('sun-disc'"));
  assert.ok(runtime.includes("new B.DirectionalLight('sun'"));
  assert.ok(runtime.includes('hemi.intensity=.82'));
});

test('bot navigation respects the same physical map collision as the player',()=>{
  assert.ok(runtime.includes('isPlayerBlocked(next.x,next.z,.25)'));
  assert.ok(runtime.includes('else if(!isPlayerBlocked(next.x,current.z,.25))'));
  assert.ok(runtime.includes('else if(!isPlayerBlocked(current.x,next.z,.25))'));
});

test('cloud host requests fullscreen capture and reports GPU/encoded stream diagnostics',()=>{
  const host=readFileSync(new URL('../cloud/host.js',import.meta.url),'utf8');
  const page=readFileSync(new URL('../cloud/host.html',import.meta.url),'utf8');
  assert.ok(host.includes('captureStream(60)'));
  assert.ok(host.includes('WEBGL_debug_renderer_info'));
  assert.ok(host.includes('framesPerSecond'));
  assert.ok(host.includes('requestFullscreen'));
  assert.ok(page.includes('html:fullscreen iframe{height:100vh}'));
});
test('cloud viewer reports received video dimensions and decoded frame rate',()=>{
  const viewer=readFileSync(new URL('../cloud/viewer.js',import.meta.url),'utf8');
  assert.ok(viewer.includes('framesDecoded'));
  assert.ok(viewer.includes('video.videoWidth'));
  assert.ok(viewer.includes('getStats()'));
});

test('cloud host pins render scale to native 1080p target instead of adaptive supersampling',()=>{
  assert.ok(runtime.includes('const targetDpr=cloudHost?1:(mobile?1:1.5)'));
  assert.ok(runtime.includes('const next=cloudHost?1:adaptiveScale(p95,state.scale,mobile)'));
});
