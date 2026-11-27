import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward } from './engine-core.mjs';
import { DUST2_EXPANDED, validateDust2Balance, isDust2Blocked } from './dust2-layout.mjs';
import { DUST2_SCALE } from './dust2-map.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const runtime = readFileSync(fileURLToPath(new URL('./engine.js', import.meta.url)), 'utf8');

test('V2 startup resolves the render canvas declared by its HTML entrypoint', () => {
  assert.ok(html.includes('<canvas id="renderCanvas"'));
  assert.ok(html.includes('./engine.js?v=20261127-3'), 'runtime URL must change when deploying a cache-busting fix');
  assert.ok(html.includes("window.addEventListener('error'"));
  assert.ok(runtime.includes("const canvas = $('renderCanvas')"));
  assert.ok(runtime.includes('new B.Engine(canvas,'));
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
  assert.ok(runtime.includes("isDust2Blocked(x,z)"));
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
