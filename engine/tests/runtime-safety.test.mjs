import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDeadzone, clampAxis, chooseConnectedGamepad, isGamepadButtonPressed } from '../client/runtime-safety.mjs';

test('clampAxis rejects non-finite values and clamps finite values', () => {
  assert.equal(clampAxis(NaN), 0);
  assert.equal(clampAxis(Infinity), 0);
  assert.equal(clampAxis(-2), -1);
  assert.equal(clampAxis(0.4), 0.4);
});

test('applyDeadzone suppresses drift and rescales the remaining range', () => {
  assert.equal(applyDeadzone(0.1), 0);
  assert.equal(applyDeadzone(-0.18), 0);
  assert.ok(Math.abs(applyDeadzone(1) - 1) < 1e-12);
  assert.ok(Math.abs(applyDeadzone(-1) + 1) < 1e-12);
  assert.ok(applyDeadzone(0.6) > 0 && applyDeadzone(0.6) < 1);
  assert.equal(applyDeadzone(NaN), 0);
});

test('chooseConnectedGamepad keeps active controller or falls back after disconnect', () => {
  const a = { index: 0, connected: true };
  const b = { index: 1, connected: true };
  assert.equal(chooseConnectedGamepad([a, b], 1).gamepad, b);
  assert.equal(chooseConnectedGamepad([a, b], 7).gamepad, a);
  assert.equal(chooseConnectedGamepad([{ index: 0, connected: false }], 0).gamepad, null);
  assert.equal(chooseConnectedGamepad([], null).index, null);
});

test('button reads tolerate missing or short controller button arrays', () => {
  assert.equal(isGamepadButtonPressed({ buttons: [{ pressed: true }] }, 0), true);
  assert.equal(isGamepadButtonPressed({ buttons: [] }, 9), false);
  assert.equal(isGamepadButtonPressed(null, 0), false);
});
