import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import path from "node:path";

const file = process.argv[2] ?? "maps/ModernDistrict/CSSBC_ExpandedDistrict.vmf";
const vmf = await readFile(file, "utf8");
const metadataFile = path.join(path.dirname(file), "CSSBC_MapMetadata.json");
const metadata = JSON.parse(await readFile(metadataFile, "utf8"));
let depth=0,minDepth=0;
for (const c of vmf) { if(c==="{") depth++; else if(c==="}") { depth--; minDepth=Math.min(minDepth,depth); } }
assert.equal(depth,0,"VMF braces must balance");
assert.equal(minDepth,0,"VMF must not close a block before opening it");
assert.match(vmf,/^versioninfo\s*\{/m,"versioninfo block missing");
assert.match(vmf,/^world\s*\{/m,"world block missing");
assert.match(vmf,/"classname"\s+"worldspawn"/,"worldspawn missing");

const ids=[...vmf.matchAll(/"id"\s+"(\d+)"/g)].map(m=>m[1]);
assert.ok(ids.length>0,"no VMF IDs found");
assert.equal(new Set(ids).size,ids.length,"VMF IDs must be unique");
const solids=[...vmf.matchAll(/^\s*solid\s*\{/gm)];
const entities=[...vmf.matchAll(/^\s*entity\s*\{/gm)];
assert.ok(solids.length>=180, `expected >=180 world brushes, got ${solids.length}`);
assert.ok(entities.length>=27, `expected >=27 entities, got ${entities.length}`);

const worldStart=vmf.indexOf("\nworld");
const worldEnd=vmf.indexOf("\n}\n",worldStart);
assert.ok(worldStart>=0&&worldEnd>worldStart,"world block malformed");
const world=vmf.slice(worldStart,worldEnd);
const worldSolids=[...world.matchAll(/^\s*solid\s*\{/gm)];
assert.equal(worldSolids.length,solids.length,"all brushes must belong to worldspawn");
for (const [i,match] of [...world.matchAll(/^\s*solid\s*\{/gm)].entries()) {
 const start=match.index;
 const next=[...world.matchAll(/^\s*solid\s*\{/gm)][i+1]?.index ?? world.length;
 const block=world.slice(start,next);
 const sides=[...block.matchAll(/^\s*side\s*\{/gm)];
 assert.equal(sides.length,6,`brush ${i+1} must have six sides, got ${sides.length}`);
}
const t=(vmf.match(/"classname"\s+"info_player_terrorist"/g)||[]).length;
const ct=(vmf.match(/"classname"\s+"info_player_counterterrorist"/g)||[]).length;
assert.ok(t>=4,`expected at least four T spawns, got ${t}`);
assert.ok(ct>=4,`expected at least four CT spawns, got ${ct}`);
assert.match(vmf,/"classname"\s+"light_environment"/,"sunlight entity missing");
for (const name of ["landmark_smokestack","landmark_water_tower","landmark_storefront","landmark_bridge"]) {
 assert.ok(vmf.includes(`"targetname" "${name}"`), `landmark marker missing: ${name}`);
}
for (let i=1;i<=12;i++) {
 const name=`hide_pocket_${String(i).padStart(2,"0")}`;
 assert.ok(vmf.includes(`"targetname" "${name}"`), `hide pocket marker missing: ${name}`);
}
assert.equal(metadata.landmarks.length,4,"metadata must describe four landmarks");
assert.equal(metadata.hide_pockets.length,12,"metadata must describe twelve hide pockets");
for (const item of [...metadata.landmarks,...metadata.hide_pockets]) {
 assert.ok(vmf.includes(`"targetname" "${item.targetname}"`), `metadata marker missing from VMF: ${item.targetname}`);
}
console.log(`PASS ${file}: ${solids.length} brushes, ${entities.length} entities, ${ids.length} unique IDs, T=${t}, CT=${ct}, 4 landmarks, 12 hide pockets; metadata markers matched`);
