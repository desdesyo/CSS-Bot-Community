import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const file = process.argv[2] ?? "maps/ModernDistrict/CSSBC_ExpandedDistrict.vmf";
const vmf = await readFile(file, "utf8");
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
assert.ok(solids.length>=100, `expected >=100 world brushes, got ${solids.length}`);
assert.ok(entities.length>=10, `expected >=10 entities, got ${entities.length}`);

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
console.log(`PASS ${file}: ${solids.length} brushes, ${entities.length} entities, ${ids.length} unique IDs, T=${t}, CT=${ct}`);
