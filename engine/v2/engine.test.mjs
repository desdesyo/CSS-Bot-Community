import test from 'node:test';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { adaptiveScale, moveToward, createTeamRoster, cameraRelativeMovement, findPathAStar, TEAM_SPAWNS, BOMB_SITE, aimCandidateScore, getPlayerSpawn, advancePatrolIndex, selectNextLivingBot, buildCollisionSpatialIndex, queryCollisionSpatialIndex } from './engine-core.mjs';

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
test('bot eye-height collision uses the same wall volume as player collision', () => {
  const wall = [{ name:'building facade', minX:-5, maxX:5, minY:0, maxY:4.4, minZ:2, maxZ:2.5 }];
  const result = moveWithAabbCollisions({x:0,y:1.72,z:0},{x:0,z:5},wall,.38,1.72,.07);
  assert.ok(result.z < 1.65);
  assert.equal(result.blockedZ,true);
  assert.deepEqual(result.blockedBy,['building facade']);
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


test('renderer explicitly binds the FPS camera and initializes the minimap before the match', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.ok(engine.includes('scene.activeCamera=camera;scene.activeCameras=null;camera.layerMask=0x0FFFFFFF'));
  assert.ok(engine.includes('buildBots();buildPlayerWeapon();initInput();drawMinimap();'));
});

test('mobile HUD controls stay above the look touch surface', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const mapModule = await import('./wet-ground-map.mjs');
  assert.equal(typeof mapModule.buildWetGroundMap, 'function');
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

test('uploaded tactical artwork is used for the cinematic menu and loading screen', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  const artwork = await readFile(new URL('./assets/solo-menu-cover.jpeg', import.meta.url));
  assert.ok(artwork.byteLength > 100000);
  assert.ok(html.includes('solo-menu-cover.jpeg'));
  assert.ok(html.includes('id="overlay" class="is-loading"'));
  assert.ok(html.includes('#overlay.is-loading'));
  assert.ok(html.includes('#overlay::before'));
  assert.ok(engine.includes("classList.remove('is-loading','is-error')"));
});

test('SOLO menu exposes working play, settings and diagnostics panels with local log export', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /data-menu-tab="play"/);
  assert.match(html, /data-menu-tab="settings"/);
  assert.match(html, /data-menu-tab="logs"/);
  assert.match(html, /id="lookSensitivity"/);
  assert.match(html, /id="fieldOfView"/);
  assert.match(html, /id="showMinimap"/);
  assert.match(html, /id="logsStart"/);
  assert.match(html, /id="logsDownload"/);
  assert.match(html, /id="logsUpload"/);
  assert.match(engine, /function showMenuTab\(tab\)/);
  assert.match(engine, /function installMenuControls\(\)/);
  assert.match(engine, /function downloadGameplayLog\(\)/);
  assert.match(engine, /function buildGameplayLogPayload\(\)/);
  assert.match(engine, /localStorage\.setItem\('solo_menu_settings_v1'/);
  assert.match(engine, /function startGameplayLog\(\)/);
  assert.match(engine, /function stopAndUploadGameplayLog\(\)/);
  assert.match(engine, /localStorage\.getItem\('solo_github_log_token'\)/);
  assert.doesNotMatch(engine, /fieldDeveloper\.developerRole='field-developer'/);
});

test('Wet Ground is the active rain-quarter map with persistent route atlas identity', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(engine, /buildWetGroundMap\(B,scene,mobile,shadowGen\)/);
  assert.match(engine, /wet-ground-street-panorama-v2/);
  assert.match(map, /canal deep water/);
  assert.match(map, /arched stone bridge deck/);
  assert.match(map, /photographic irregular wet cobblestone albedo/);
  assert.match(map, /warm street lantern/);
  assert.match(map, /alley low stone divider/);
  assert.match(html, /WET GROUND/);
});

test('real rigged soldier models are mandatory; primitive placeholder soldiers are forbidden', async () => {
  const bots = await readFile(new URL('./human-bots.mjs', import.meta.url), 'utf8');
  assert.match(bots, /MODEL_FILES\.length/);
  assert.match(bots, /Не удалось загрузить обязательные 3D-модели бойцов/);
  assert.match(bots, /отсутствует настоящая 3D-модель/);
  assert.doesNotMatch(bots, /fallback-torso|fallback-head|using procedural soldiers/);
});


test('Wet Ground district has curved masonry bridges, a walkable service tunnel and layered roof architecture', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /curved stone arch intrados/);
  assert.match(map, /bridge arch voussoir/);
  assert.match(map, /west service tunnel worn stone floor/);
  assert.match(map, /service tunnel carved stone portal arch/);
  assert.match(map, /pitched slate roof plane/);
  assert.match(map, /roof ventilation curb/);
  assert.match(map, /continuous curved limestone arcade arch/);
  assert.match(map, /cobblestone variable roughness map/);
  assert.match(map, /expanding rain impact ring/);
  assert.match(map, /onBeforeRenderObservable/);
  assert.match(map, /loadScannedPbr/);
  assert.match(map, /cobblestone_pavement/);
  assert.match(map, /stone_wall/);
  assert.match(map, /worn_brick_wall/);
  assert.match(map, /plastered_wall_05/);
  assert.match(map, /mobile\?'1k':'2k'/);
});
test('Wet Ground is a connected multi-street district, not a single spawn alley', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /FULL DISTRICT EXTENSION/);
  assert.match(map, /south district cross street/);
  assert.match(map, /north district cross street/);
  assert.match(map, /canal bank east-west market connector/);
  assert.match(map, /quarterBuilding\('cross-street corner tenement'/);
  assert.match(map, /west market court worn cobblestone/);
  assert.match(map, /market court fountain stone basin/);
  assert.match(map, /old quarter enamel street sign/);
  assert.match(map, /mesh\.position\.x=cx-dz/);
  assert.match(map, /mesh\.position\.z=cz\+dx/);
  assert.match(map, /mesh\.rotation\.y\+=Math\.PI\/2/);
});

test('photographic facade PBR maps are applied after procedural fallbacks and survive material freezing', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  const relief = map.indexOf('for(const [material,kind] of [[plaster');
  const scanned = map.indexOf("loadScannedPbr(plaster,'plastered_wall_05'");
  assert.ok(relief > 0 && scanned > relief, 'scanned maps must be attached after generated fallback relief');
  assert.match(map, /bind\('ambientTexture','ao',false\)/);
  assert.match(map, /material\.unfreeze\?\.\(\)/);
  assert.match(map, /material\.markAsDirty\?\.\(B\.Material\.TextureDirtyFlag\)/);
  assert.match(map, /weathered slate roof shingle albedo/);
  assert.match(map, /overlapping slate roof tile/);
  assert.match(map, /slate roof course seam/);
  assert.match(map, /plane\.rotation\.z=-sideSign\*\.19/);
  assert.match(map, /const tileY=h\+\.34\+\(w\*\.255-Math\.abs\(tileX-x\)\)\*\.193\+\.13/);
  assert.match(map, /weathered dark timber doors/);
});

test('Wet Ground renderer enables image-based reflections for physically based materials', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /CubeTexture\.CreateFromPrefilteredData/);
  assert.match(engine, /environmentSpecular\.env/);
  assert.match(engine, /cobblestone_street_night_1k\.hdr/);
  assert.match(engine, /HDRCubeTexture/);
  assert.match(engine, /onLoadObservable/);
  assert.match(engine, /scene\.environmentIntensity=mobile\?\.62:\.88/);
});

test('Wet Ground uses physical PBR materials and real planar wet-surface reflections on mobile and desktop', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(map, /new B\.PBRMaterial\(name, scene\)/);
  assert.match(map, /new B\.MirrorTexture\('rain-soaked street planar reflections'/);
  assert.match(map, /cobble\.reflectionTexture=wetMirror/);
  assert.match(map, /water\.reflectionTexture=wetMirror/);
  assert.match(map, /puddle\.reflectionTexture=wetMirror/);
  assert.match(map, /mobile\?256:768/);
  assert.match(map, /old quarter clock tower shaft/);
  assert.match(map, /night market stall counter/);
  assert.match(engine, /TONEMAPPING_ACES/);
  assert.match(engine, /GlowLayer\('wet quarter emissive glow'/);
  assert.match(engine, /distant city sky bounce/);
});

test('night scene has required glTF support and never silently skips real soldier models', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  assert.match(html, /LOADING REQUIRED GLTF SUPPORT/);
  assert.doesNotMatch(html, /procedural soldiers will be used|OPTIONAL MODEL SUPPORT/);
});


test('mobile rendering uses physical device pixels and antialiasing instead of CSS-pixel upscaling', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /renderPixelRatio=Math\.min\(Math\.max\(1,window\.devicePixelRatio\|\|1\),mobile\?1\.25:1\.5\)/);
  assert.match(engine, /function applyRenderScale\(\)\{if\(engine\)engine\.setHardwareScalingLevel\(1\/\(state\.scale\*renderPixelRatio\)\);\}/);
  assert.match(engine, /new B\.Engine\(canvas,true,\{preserveDrawingBuffer:false,stencil:false,antialias:true/);
  assert.match(engine, /state\.scale=next;applyRenderScale\(\)/);
});

test('soldier GLB textures use trilinear filtering and anisotropic sampling with resolution diagnostics', async () => {
  const bots = await readFile(new URL('./human-bots.mjs', import.meta.url), 'utf8');
  assert.match(bots, /TRILINEAR_SAMPLINGMODE/);
  assert.match(bots, /anisotropicFilteringLevel=Math\.min\(isMobile\?8:16/);
  assert.match(bots, /Soldier GLB texture quality/);
  assert.match(bots, /width:size\.width\|\|0,height:size\.height\|\|0/);
});

test('first-person weapons have detailed PBR microtextures rather than flat untextured materials', async () => {
  const weapon = await readFile(new URL('./weapon-viewmodel.mjs', import.meta.url), 'utf8');
  assert.match(weapon, /makeSurface\('woven combat fabric','fabric'\)/);
  assert.match(weapon, /makeSurface\('reinforced weapon polymer','polymer'\)/);
  assert.match(weapon, /makeSurface\('brushed parkerized steel','metal'\)/);
  assert.match(weapon, /material\.albedoTexture=surface\.albedo/);
  assert.match(weapon, /material\.bumpTexture=surface\.normal/);
  assert.match(weapon, /anisotropicFilteringLevel=Math\.min\(mobile\?8:16/);
});

test('Wet Ground has visibly distinct asymmetric routes and reflection settings tuned for wet surfaces', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /diagonal market cut-through/);
  assert.match(map, /east loading court wet stone/);
  assert.match(map, /tram shelter roof/);
  assert.match(map, /wetMirror\.mirrorPlane=new B\.Plane\(0,1,0,-\.025\)/);
  assert.match(map, /wetMirror\.level=mobile\?\.5:\.64/);
  assert.match(map, /m\.roughness=roughness/);
});


test('gameplay diagnostics keep synchronous serialization and storage out of frame/event hot paths', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  const captureStart = engine.indexOf('function captureGameplayLog(');
  const captureEnd = engine.indexOf('function installInputDiagnostics(', captureStart);
  const eventStart = engine.indexOf('function gameLogEvent(');
  const eventEnd = engine.indexOf('function captureGameplayLog(', eventStart);
  const capture = engine.slice(captureStart, captureEnd);
  const event = engine.slice(eventStart, eventEnd);
  assert.ok(captureStart >= 0 && captureEnd > captureStart);
  assert.ok(eventStart >= 0 && eventEnd > eventStart);
  for (const hotPath of [capture, event]) {
    assert.equal(hotPath.includes('JSON.stringify'), false);
    assert.equal(hotPath.includes('localStorage.setItem'), false);
    assert.equal(hotPath.includes('new Blob'), false);
  }
  assert.equal(engine.includes('indexedDB.open'), true);
  assert.equal(engine.includes('now-gameLogLastPersist>10000'), true);
});

test('field atlas persistence is deferred while gameplay diagnostics are recording', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  const start = engine.indexOf('function persistFieldAtlas(');
  const end = engine.indexOf('function fieldCellAt(', start);
  const persist = engine.slice(start, end);
  assert.equal(persist.includes('if(gameLogRecording){fieldAtlas.persistPending=true;return;}'), true);
});

test('Wet Ground bridge mouths are wide, visible, and have continuous road approaches', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /low pale stone bridge parapet/);
  assert.match(map, /north bridge road approach/);
  assert.match(map, /south bridge road approach/);
  assert.match(map, /\[\[-40\.5,25\],\[-10,4\],\[10,4\],\[40\.5,25\]\]/);
  assert.match(map, /barrier\.isVisible=true/);
  assert.doesNotMatch(map, /bridge side parapet',railX,\.72,0,\.32,\.82/);
});
test('Wet Ground adds grounded street interiors and outer rainy landscape without blocking routes', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /label\+' shop rear interior wall'/);
  assert.match(map, /label\+' stocked wall shelf'/);
  assert.match(map, /north rain-soaked terrain shoulder/);
  assert.match(map, /dense wet street tree canopy/);
  assert.match(map, /rain-worn roadside boulder/);
});

test('Wet Ground primary facades face into the playable street and contain real window/door openings', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /front==='west'\?1:-1/);
  assert.match(map, /facade masonry pier/);
  assert.match(map, /deep-set window glass/);
  assert.match(map, /recessed timber entrance door/);
  assert.match(map, /wrought iron balcony rail/);
  assert.match(map, /projecting horizontal floor band/);
});

test('Wet Ground central avenue continues over the canal on a real bridge', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /\[\[-20,'west'\],\[0,'main'\],\[20,'east'\]\]/);
  assert.match(map, /\[\[-40\.5,25\],\[-10,4\],\[10,4\],\[40\.5,25\]\]/);
  assert.match(map, /label\+' north bridge road approach'/);
  assert.match(map, /label\+' south bridge road approach'/);
  assert.match(map, /riverCrossings:\[-20,0,20\]/);
});

test('both player spawn zones have authored high-detail street fragments and facade PBR relief', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /makeFacadeRelief/);
  assert.match(map, /material\.bumpTexture=maps\.normal/);
  assert.match(map, /material\.roughnessTexture=maps\.rough/);
  assert.match(map, /buildSpawnFragment\('CT',36,-8\.93,14\.43/);
  assert.match(map, /buildSpawnFragment\('T',-37\.5,-6\.93,8\.43/);
  assert.match(map, /illuminated fascia/);
  assert.match(map, /rain awning canopy/);
  assert.match(map, /deep storefront glass/);
  assert.match(map, /worn zebra crossing stripe/);
  assert.match(map, /warm spawn streetlight/);
  assert.match(map, /CT parked rain-dark sedan/);
  assert.match(map, /bicycle '\+wheelName\+' wheel/);
  assert.match(map, /overhead bundled power cable/);
});

test('field atlas invalidates routes from the previous abstract Wet Ground layout', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /FIELD_MAP_ID='wet-ground-street-panorama-v2'/);
});


test('patrol routes advance cyclically instead of pinning bots at the final waypoint', () => {
  assert.equal(advancePatrolIndex(0, 7), 1);
  assert.equal(advancePatrolIndex(6, 7), 0);
  assert.equal(advancePatrolIndex(4, 0), 0);
});

test('spectator cycling selects only living allies and wraps in both directions', () => {
  const bots=[{id:7,alive:true},{id:8,alive:false},{id:9,alive:true},{id:10,alive:true}];
  assert.equal(selectNextLivingBot(bots,7,1).id,9);
  assert.equal(selectNextLivingBot(bots,9,1).id,10);
  assert.equal(selectNextLivingBot(bots,10,1).id,7);
  assert.equal(selectNextLivingBot(bots,7,-1).id,10);
  assert.equal(selectNextLivingBot(bots.filter(b=>!b.alive),7,1),null);
});

test('spatial collision index returns only nearby blockers without duplicates', () => {
  const boxes=[
    {name:'near',minX:-1,maxX:1,minZ:-1,maxZ:1},
    {name:'far',minX:40,maxX:42,minZ:40,maxZ:42},
    {name:'edge',minX:7,maxX:9,minZ:0,maxZ:2}
  ];
  const index=buildCollisionSpatialIndex(boxes,8);
  const found=queryCollisionSpatialIndex(index,-2,8,-2,3);
  assert.deepEqual(found.map(b=>b.name).sort(),['edge','near']);
});


test('mobile scene batches late-authored static map details without dropping dynamic effects', async () => {
  const source = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(source, /lateStaticStart/);
  assert.match(source, /late static batch/);
  assert.match(source, /expanding rain impact ring/);
  assert.match(source, /wetMirror\.renderList=scene\.meshes\.filter/);
});
test('bot movement passes eye height to the collision solver', async () => {
  const source = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(source, /moveWithAabbCollisions\(\{x:bot\.root\.position\.x,y:1\.72,z:bot\.root\.position\.z\}/);
});
test('spectator and timed round result UI exists in the shipped page', async () => {
  const source = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  for (const id of ['spectatorHud','spectatorLabel','spectatorPrev','spectatorNext','roundEnd','roundWinner','roundReason','roundCountdown']) assert.match(source, new RegExp('id="'+id+'"'));
});


test('map batches rendered wall colliders but preserves individual gameplay AABBs', async () => {
  const source = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(source, /scene\.metadata\.soloCollisionBoxes=gameplayColliders/);
  assert.match(source, /Wet Ground wall collision batch/);
  assert.match(source, /mesh\.checkCollisions=false;mesh\.isPickable=true/);
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /scene\.metadata\?\.soloCollisionBoxes/);
});


test('bot route assignment distributes a team across authored lanes deterministically', async () => {
  const source = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(source, /routeSet\[\(id-1\)%routeSet\.length\]/);
  assert.match(source, /Spread soldiers across distinct authored lanes/);
  assert.match(source, /const steer=avoidLength/);
});
test('mobile bot hand-to-weapon synchronization is throttled, not disabled', async () => {
  const source = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(source, /now>\s*=\s*\(bot\.handSyncAt\|\|0\)/);
  assert.match(source, /bot\.handSyncAt=now\+\(mobile\?55:30\)/);
});
test('bug reports include final map batching counters', async () => {
  const source = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(source, /window\.__SOLO_MAP_STATS__=mapBuildStats/);
  assert.match(source, /mapStats:window\.__SOLO_MAP_STATS__\|\|null/);
});


test('player collision uses spatial broadphase and preserves full-array collision results', () => {
  const walls=[
    {name:'near wall',minX:-2,maxX:2,minY:0,maxY:4,minZ:2,maxZ:2.5},
    {name:'far wall',minX:30,maxX:35,minY:0,maxY:4,minZ:30,maxZ:35}
  ];
  const index=buildCollisionSpatialIndex(walls,8);
  const start={x:0,y:1.72,z:0},move={x:0,z:5};
  const baseline=moveWithAabbCollisions(start,move,walls,.36,1.72,.1);
  const broadphase=moveWithAabbCollisions(start,move,walls,.36,1.72,.1,index);
  assert.deepEqual(broadphase,baseline);
  assert.ok(broadphase.z<1.65);
  assert.deepEqual(broadphase.blockedBy,['near wall']);
});


test('rain impact rings are oriented parallel to the ground and CT sedan clears the barricade', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.match(map, /ring\.position\.set\(x,\.105,z\);ring\.rotation\.x=Math\.PI\/2/);
  assert.match(map, /makeSpawnCar\(label\+' parked rain-dark sedan',8\.15,at\(1\.8\)/);
});
test('spectator eye is offset ahead of the bot face and issue diagnostics exclude camera-owned meshes', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /camera\.position\.set\(bot\.root\.position\.x\+Math\.sin\(yaw\)\*\.26/);
  assert.match(engine, /m\.name!=='player-hitbox'&&!m\.isDescendantOf\?\.\(camera\)/);
  assert.match(engine, /mesh\.name==='player-hitbox'\|\|mesh\.isDescendantOf\?\.\(camera\)/);
});


test('issue reports split viewmodel, soldier and world mesh counts for performance diagnosis', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.match(engine, /meshBreakdown=\{viewmodel:0,soldierModels:0,botWeapons:0,world:0\}/);
  assert.match(engine, /activeMeshes:scene\.getActiveMeshes\?\.\(\)\.length/);
  assert.match(engine, /renderFps:Math\.round\(engine\.getFps\?\.\(\)\|\|0\)/);
});


test('mobile performance profile preserves reflection resolution while amortizing planar reflection renders', async () => {
  const map = await readFile(new URL('./wet-ground-map.mjs', import.meta.url), 'utf8');
  assert.ok(map.includes('new B.Vector2(mobile?256:768,mobile?256:768)'));
  assert.ok(map.includes('wetMirror.refreshRate=mobile?12:2'));
  assert.ok(map.includes('wetMirror.level=mobile?.5:.64'));
});

test('HUD text updates are throttled without changing gameplay simulation or render scale', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.ok(engine.includes('if(now-state.lastHud>=250)'));
  assert.ok(engine.includes('state.lastHud=now'));
  assert.ok(engine.includes('state.lastUpdateMs=performance.now()-updateStarted'));
  assert.ok(engine.includes('updateMs:+(state.lastUpdateMs||0).toFixed(2)'));
});


test('mobile performance release invalidates cached engine and wet-map modules', async () => {
  const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.ok(html.includes('./engine.js?v=20261128-perf1'));
  assert.ok(engine.includes('./wet-ground-map.mjs?v=20261128-perf1'));
});


test('soldier GLBs use module-relative URLs, a 90-second timeout and bounded two-at-a-time loading', async () => {
  const bots = await readFile(new URL('./human-bots.mjs', import.meta.url), 'utf8');
  assert.ok(bots.includes('new URL("./assets/", import.meta.url).href'));
  assert.ok(bots.includes('const ASSET_TIMEOUT_MS = 90000'));
  assert.ok(bots.includes('loadBatch(MODEL_FILES.map((file, index) => [index, file]), 2)'));
  assert.ok(bots.includes('Math.min(concurrency, entries.length)'));
  assert.ok(!bots.includes(')), 12000)'));
});

test('engine cache-busts the corrected soldier asset loader module', async () => {
  const engine = await readFile(new URL('./engine.js', import.meta.url), 'utf8');
  assert.ok(engine.includes('./human-bots.mjs?v=20261128-assetsfix1'));
});
