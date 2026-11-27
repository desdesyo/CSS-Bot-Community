import test from 'node:test';
import assert from 'node:assert/strict';
import { CSSBC_OPERATORS, getOperator, operatorsForFaction, getSupportTier } from './operator-roster.js';

test('browser roster contains exactly 27 unique character models', () => {
  assert.equal(CSSBC_OPERATORS.length, 27);
  assert.equal(new Set(CSSBC_OPERATORS.map(x => x.id)).size, 27);
});

test('factions contain six main operators and seven support operators each', () => {
  for (const faction of ['t', 'ct']) {
    const roster = operatorsForFaction(faction);
    assert.equal(roster.length, 13);
    assert.equal(roster.filter(x => !x.tier).length, 6);
    assert.equal(roster.filter(x => x.tier).length, 7);
    assert.equal(getSupportTier('A', faction).length, 2);
    assert.equal(getSupportTier('B', faction).length, 3);
    assert.equal(getSupportTier('C', faction).length, 2);
  }
});

test('the special roster slot is a single Juggernaut with heavy armor and increased health', () => {
  const heavy = CSSBC_OPERATORS.filter(x => x.faction === 'special');
  assert.equal(heavy.length, 1);
  assert.equal(heavy[0].id, 'juggernaut');
  assert.equal(heavy[0].archetype, 'juggernaut');
  assert.ok(heavy[0].hp > 100);
});

test('operator lookup is stable and has a safe fallback', () => {
  assert.equal(getOperator('ct_assault').id, 'ct_assault');
  assert.equal(getOperator('missing').id, CSSBC_OPERATORS[0].id);
});
