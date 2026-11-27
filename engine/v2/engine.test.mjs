import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward } from './engine-core.mjs';
import { DUST2_EXPANDED, validateDust2Balance, isDust2Blocked } from './dust2-layout.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const runtime = readFileSync(fileURLToPath(new URL('./engine.js', import.meta.url)), 'utf8');

test('V2 startup resolves the render canvas declared by its HTML entrypoint', () => {
  assert.ok(html.includes('<canvas id="renderCanvas"'));
  assert.ok(html.includes('./engine.js?v=20261127-2'), 'runtime URL must change when deploying a cache-busting fix');
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
