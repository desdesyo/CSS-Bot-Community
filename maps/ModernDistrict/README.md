# CSSBC Modern District (CS:S v34)

## Generated graybox

**File:** `CSSBC_ExpandedDistrict.vmf`

The expanded VMF blockout covers a 4096×4096 Source-unit play area and contains:

- Four connected sectors: industrial yard, residential blocks, modern office blocks, and greenbelt/drainage.
- A central cross boulevard, sidewalks, and an outer circulation loop.
- Hollow building shells with ground-floor door openings.
- Warehouse/loading-yard cover, courtyard garages, crates, bridge/drainage structures, and a central combat plaza.
- Four T spawns on the west side and four CT spawns on the east side.
- Basic sunlight and distance fog entities.

## Automated checks

- 128 world brushes, 10 entities and 907 unique VMF IDs.
- Every brush has six sides; all brushes are contained in worldspawn.
- Four T spawns, four CT spawns and a sunlight entity are present.
- Braces and block structure validated.
- GitHub Actions VMF validation passed: [run #43485173283](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/43485173283).

The map-builder workflow now defaults to `CSSBC_ExpandedDistrict`. If legitimate CS:S game content is not supplied to the runner, BSP compilation is skipped rather than failing on a missing `cstrike/gameinfo.txt`; the source VMF is still uploaded as an artifact. Latest source artifact: [CSSBC-Map-CSSBC_ExpandedDistrict-12](https://github.com/desdesyo/CSS-Bot-Community/actions/runs/43485332522).

## Build and playtest status

**Not yet a compiled or playable BSP.** The VMF structural checks passed, but VBSP/VVIS/VRAD and in-game testing have not run because the GitHub runner does not have licensed CS:S game content. A source VMF artifact is available from the latest map-builder run.

Remaining checks once game content is available:

- Hammer load and VBSP leak/solid validation.
- VVIS and VRAD compilation.
- Spawn collision and doorway clearance checks.
- Nav mesh generation and bot route verification.
- Ten-minute hunt/search playtest across all four districts.

## Next geometry pass

- Add the four navigation landmarks: smokestack, water tower, lit storefront and bridge landmark.
- Add 12–16 reachable hide/search pockets with multiple exits or meaningful risk.
- Check the loop A↔B↔D↔C↔A and the two central cross-links.
- Replace temporary brush cover with final props and themed materials.
