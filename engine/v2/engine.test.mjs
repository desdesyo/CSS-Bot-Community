import test from 'node:test';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward } from './engine-core.mjs';

test('adaptive resolution reduces load on a slow mobile frame budget', () => {
  assert.equal(adaptiveScale(55, .9, true), .84);
  assert.equal(adaptiveScale(12, .9, true), .925);
  assert.equal(adaptiveScale(55, .75, true), .72);
  assert.equal(adaptiveScale(12, .99, true), 1);
});
test('desktop profile has independent scale bounds', () => {
  assert.equal(adaptiveScale(40, 1, false), .94);
  assert.equal(adaptiveScale(8, 1, false), 1.025);
  assert.equal(adaptiveScale(8, 1.34, false), 1.35);
});
test('agent movement is speed-bounded and reports arrival', () => {
  assert.deepEqual(moveToward({x:0,z:0},{x:3,z:4},2,1), {x:1.2,z:1.6,arrived:false});
  assert.deepEqual(moveToward({x:0,z:0},{x:1,z:0},2,1), {x:1,z:0,arrived:true});
  assert.deepEqual(moveToward({x:2,z:2},{x:2,z:2},2,1), {x:2,z:2,arrived:true});
});
