# CSSBC Modern District (CS:S v34)

## Generated graybox

**File:** `CSSBC_ExpandedDistrict.vmf`

The first expanded VMF blockout is now committed. It covers a 4096×4096 Source-unit play area and contains:

- Four connected sectors: industrial yard, residential blocks, modern office blocks, and greenbelt/drainage.
- A central cross boulevard, sidewalks, and an outer circulation loop.
- Hollow building shells with ground-floor door openings.
- Warehouse/loading-yard cover, courtyard garages, crates, bridge/drainage structures, and a central combat plaza.
- Four T spawns on the west side and four CT spawns on the east side.
- Basic sunlight and distance fog entities.

**Geometry validation:** 128 world brushes, 10 entities, balanced VMF braces, and 907 unique VMF IDs.

## Build target

Open `CSSBC_ExpandedDistrict.vmf` in Hammer configured for Counter-Strike: Source. Then compile with the matching CS:S VBSP/VVIS/VRAD toolchain.

**Important:** this is a generated graybox VMF, not a compiled BSP. Hammer loading, leak checks, lighting compile, navigation mesh generation, and in-game playtesting have not yet been verified. The current blockout uses stock Source material names; missing-material warnings, spawn collision, doorway clearances, and bot navigation still need validation in Hammer and CS:S v34.

## Planned polish

- Replace temporary box cover with final props and themed geometry.
- Add second exits and interior route loops where needed.
- Create metadata for cover pockets, landmarks, and search/hide zones.
- Build and test a matching nav mesh for player and bot hulls.
