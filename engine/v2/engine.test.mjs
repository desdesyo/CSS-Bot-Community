import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward, createTeamRoster, cameraRelativeMovement, findPathAStar, TEAM_SPAWNS, BOMB_SITE, aimCandidateScore, getPlayerSpawn } from './engine-core.mjs';

test('adaptive resolution reduces load on a slow mobile frame budget', () => {
  assert.ok(Math.abs(adaptiveScale(55, .9, true) - .86) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(12, .9, true) - .925) < 1e-9);
  assert.ok(Math.abs(adaptiveScale(55, .75, true) - .86) < 1e-9);
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

test('CT player receives five allies and faces six opponents (6v6)', () => {
  const roster = createTeamRoster('CT');
  assert.equal(roster.length, 11);
  assert.equal(roster.filter(([, team]) => team === 'ally').length, 5);
  assert.equal(roster.filter(([, team]) => team === 'enemy').length, 6);
  assert.equal(new Set(roster.map(([id]) => id)).size, 11);
});
test('T player receives five allies and faces six opponents (6v6)', () => {
  const roster = createTeamRoster('T');
  assert.equal(roster.length, 11);
  assert.equal(roster.filter(([, team]) => team === 'ally').length, 5);
  assert.equal(roster.filter(([, team]) => team === 'enemy').length, 6);
  assert.equal(new Set(roster.map(([id]) => id)).size, 11);
});
test('roster rejects unsupported team values', () => {
  assert.throws(() => createTeamRoster('spectator'), /CT or T/);
});

test('camera-relative forward movement matches Babylon camera direction', () => {
  assert.ok(Math.abs(cameraRelativeMovement(0,1,0).z - 1) < 1e-9);
  assert.ok(Math.abs(cameraRelativeMovement(Math.PI,1,0).z + 1) < 1e-9);
  assert.ok(Math.abs(cameraRelativeMovement(0,0,1).x - 1) < 1e-9);
  assert.ok(Math.abs(cameraRelativeMovement(Math.PI,0,1).x + 1) < 1e-9);
});


import { moveWithAabbCollisions } from './engine-core.mjs';

test('player collision stops movement at a wall without tunnelling', () => {
  const wall = [{ name:'wall', minX:-5, maxX:5, minY:0, maxY:4, minZ:2, maxZ:2.5 }];
  const result = moveWithAabbCollisions({x:0,y:1.72,z:0},{x:0,z:5},wall,.36,1.72,.1);
  assert.ok(result.z < 1.65);
  assert.equal(result.blockedZ,true);
  assert.deepEqual(result.blockedBy,['wall']);
});
test('player collision slides along a wall', () => {
  const wall = [{ name:'wall', minX:-5, maxX:5, minY:0, maxY:4, minZ:2, maxZ:2.5 }];
  const result = moveWithAabbCollisions({x:0,y:1.72,z:0},{x:2,z:3},wall,.36,1.72,.1);
  assert.ok(result.z < 1.65);
  assert.ok(result.x > 1.9);
  assert.equal(result.blockedZ,true);
});
test('player does not collide with objects outside standing height', () => {
  const overhead = [{ name:'beam', minX:-5, maxX:5, minY:3, maxY:4, minZ:1, maxZ:2 }];
  const result = moveWithAabbCollisions({x:0,y:1.72,z:0},{x:0,z:3},overhead,.36,1.72,.1);
  assert.ok(Math.abs(result.z-3)<1e-9);
  assert.equal(result.blockedZ,false);
});


import { findSafePlayerSpawn } from './engine-core.mjs';

test('safe spawn avoids the central partition that previously trapped the player', () => {
  const partition = [{name:'partition',minX:-1,maxX:1,minY:0,maxY:4.4,minZ:21,maxZ:39}];
  const spawn = findSafePlayerSpawn([{x:0,z:38},{x:0,z:-41}], partition);
  assert.deepEqual(spawn, {x:0,z:-41});
});
test('safe spawn ignores overhead-only geometry', () => {
  const beam = [{name:'beam',minX:-2,maxX:2,minY:3,minY:3,maxY:4,minZ:-42,maxZ:-40}];
  assert.deepEqual(findSafePlayerSpawn([{x:0,z:-41}], beam), {x:0,z:-41});
});
test('safe spawn returns null when all candidates overlap solid geometry', () => {
  const wall = [{name:'wall',minX:-5,maxX:5,minY:0,maxY:4,minZ:-42,maxZ:-40}];
  assert.equal(findSafePlayerSpawn([{x:0,z:-41}], wall), null);
});


test('bot pathfinding routes around solid walls instead of crossing them', () => {
  const wall = [{name:'partition',minX:-2,maxX:2,minY:0,maxY:4.4,minZ:4,maxZ:6}];
  const path = findPathAStar({x:0,z:0},{x:0,z:10},wall,.38,1.5);
  assert.ok(path.length > 1);
  for (const point of path) {
    const nearestX=Math.max(-2,Math.min(point.x,2));
    const nearestZ=Math.max(4,Math.min(point.z,6));
    const dx=point.x-nearestX,dz=point.z-nearestZ;
    assert.ok(dx*dx+dz*dz >= .48*.48 || point.z===10, 'path node intersects wall');
  }
});

test('bot pathfinding returns a direct target in open space', () => {
  const path = findPathAStar({x:-10,z:-10},{x:-4,z:-4},[],.38,1.5);
  assert.deepEqual(path.at(-1),{x:-4,z:-4});
  assert.ok(path.length <= 3);
});

test('T and CT landing zones are mirrored, separated and correctly placed around the bombsite', () => {
  assert.equal(TEAM_SPAWNS.T.length, 6);
  assert.equal(TEAM_SPAWNS.CT.length, 6);
  assert.ok(TEAM_SPAWNS.T.every(([,z]) => z < 0));
  assert.ok(TEAM_SPAWNS.CT.every(([,z]) => z > 0));
  assert.ok(Math.abs(TEAM_SPAWNS.T[5][1] - TEAM_SPAWNS.CT[5][1]) > 70);
  assert.ok(Math.abs(TEAM_SPAWNS.CT[5][1] - BOMB_SITE.z) < Math.abs(TEAM_SPAWNS.T[5][1] - BOMB_SITE.z));
});
test('roster places six opponents at the opposite faction landing zone and five allies with the player', () => {
  const ct = createTeamRoster('CT');
  const t = createTeamRoster('T');
  for (const [id, role, x, z] of ct.filter(([,role])=>role==='enemy')) assert.ok(TEAM_SPAWNS.T.some(([sx,sz])=>sx===x&&sz===z));
  for (const [id, role, x, z] of ct.filter(([,role])=>role==='ally')) assert.ok(TEAM_SPAWNS.CT.some(([sx,sz])=>sx===x&&sz===z));
  for (const [id, role, x, z] of t.filter(([,role])=>role==='enemy')) assert.ok(TEAM_SPAWNS.CT.some(([sx,sz])=>sx===x&&sz===z));
  for (const [id, role, x, z] of t.filter(([,role])=>role==='ally')) assert.ok(TEAM_SPAWNS.T.some(([sx,sz])=>sx===x&&sz===z));
});

test('aim assist prioritizes a nearby enemy almost on the crosshair over a distant one', () => {
  const near = aimCandidateScore(0.045, 5);
  const far = aimCandidateScore(0.005, 28);
  assert.ok(near < far);
  assert.ok(aimCandidateScore(0.02, 8) < aimCandidateScore(0.02, 25));
  assert.equal(aimCandidateScore(-1, 5), Infinity);
});


test('default CT deployment is inside the CT base, not at the enemy T spawn', () => {
  assert.deepEqual(getPlayerSpawn('CT'), {x:0,z:36});
  assert.deepEqual(getPlayerSpawn('T'), {x:0,z:-40});
  const ct=getPlayerSpawn('CT');
  const nearestEnemy=Math.min(...TEAM_SPAWNS.T.map(([x,z])=>Math.hypot(x-ct.x,z-ct.z)));
  assert.ok(nearestEnemy>65, 'enemy deployment must be far from CT player spawn');
});
test('each player deployment is colocated with five allied spawn slots', () => {
  for(const team of ['CT','T']){
    const player=getPlayerSpawn(team);
    const allies=TEAM_SPAWNS[team].slice(0,5);
    assert.ok(allies.every(([x,z])=>Math.hypot(x-player.x,z-player.z)<12));
  }
});
test('spawn compounds keep both factions separated by a long approach', () => {
  const ct=getPlayerSpawn('CT'),t=getPlayerSpawn('T');
  assert.ok(Math.hypot(ct.x-t.x,ct.z-t.z)>=76);
});


test('mobile HUD controls stay above the look touch surface', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  const rule = selector => css.match(new RegExp(selector + '\\{([^}]*)\\}'));
  const actions = rule('#actions')?.[1] ?? '';
  const touch = rule('#touch')?.[1] ?? '';
  const look = rule('#look')?.[1] ?? '';
  const weaponBar = rule('#weaponBar')?.[1] ?? '';
  const overlay = rule('#overlay')?.[1] ?? '';
  assert.match(actions, /z-index:12/);
  assert.match(touch, /z-index:5/);
  assert.match(look, /top:116px/);
  assert.match(look, /bottom:132px/);
  assert.match(weaponBar, /z-index:13/);
  assert.match(overlay, /z-index:20/);
});

test('player bullets use center-screen hitscan and tracer projectiles cannot double-damage', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /function resolvePlayerHitscan\(slot\)/);
  assert.match(engine, /camera\.getForwardRay\(120\)/);
  assert.match(engine, /resolvePlayerHitscan\(slot\);[\s\S]*spawnProjectile\(origin,ray\.direction,'ally',[^;]*,'player',0\)/);
  assert.match(engine, /p\.damage>0/);
  assert.match(engine, /gameLogEvent\('shot-hit'/);
  assert.match(engine, /gameLogEvent\('shot-miss'/);
});

test('knife attacks clear firearm recoil and use a dedicated melee swing', async () => {
  const viewmodel = await readFile(new URL('./weapon-viewmodel.mjs', import.meta.url), 'utf8');
  assert.match(viewmodel, /selected === 'knife'[\s\S]*recoil = 0; fireT = 0; shotFlash = 0/);
  assert.match(viewmodel, /meleeT = 1; meleeHitPending = true/);
  assert.match(viewmodel, /if \(slot==='knife'\)[\s\S]*recoil=0;fireT=0;shotFlash=0/);
});

test('an allied field developer bot starts automatic QA recording and reports every five rounds', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /developerRole:null/);
  assert.match(engine, /fieldDeveloper\.developerRole='field-developer'/);
  assert.match(engine, /startDeveloperRecorder\(\)/);
  assert.match(engine, /uploadEveryRounds:5/);
  assert.match(engine, /function recordDeveloperRound\(won\)/);
  assert.match(engine, /if\(developerRoundBatch\.length>=5\)void uploadDeveloperDiagnosticsBatch\(\)/);
  assert.match(engine, /type:'autonomous-field-developer-report'/);
  assert.match(engine, /logs\/gameplay\/field-developer\//);
  assert.match(engine, /player-damaged/);
  assert.match(engine, /bot-damaged/);
  assert.match(engine, /bot-shot/);
});

test('field developer preserves pending reports locally if GitHub upload cannot proceed', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /GAME_DEV_STATE_KEY/);
  assert.match(engine, /persistDeveloperState\(\)/);
  assert.match(engine, /developerLastUploadError/);
  assert.match(engine, /Отчёт сохранён локально/);
  assert.match(engine, /localStorage\.getItem\('solo_github_log_token'\)/);
});
