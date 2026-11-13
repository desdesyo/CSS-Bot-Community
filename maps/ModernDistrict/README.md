# CSSBC Modern District (CS:S v34)

## Current graybox

**File:** `CSSBC_ExpandedDistrict.vmf`

The expanded map covers a 4096×4096 Source-unit play area with four connected sectors:

- Industrial yard with warehouse/loading area and a smokestack landmark.
- Residential blocks and courtyards with an elevated water tower landmark.
- Modern office blocks and a lit storefront landmark.
- Greenbelt/drainage area with a bridge landmark.

A central cross boulevard, sidewalks and outer circulation loop connect the districts. The map includes hollow building shells, loading-yard cover, courtyard garages, crates, a central combat plaza and four T / four CT spawn points.

## Search / escape spaces

- 12 L-shaped hide/search pockets distributed across all four districts.
- Each pocket is open on two sides to avoid a sealed safe room.
- Every pocket has a named `info_target` marker (`hide_pocket_01` … `hide_pocket_12`) for later CSSBC bot metadata integration.
- Four named landmark targets (`landmark_smokestack`, `landmark_water_tower`, `landmark_storefront`, `landmark_bridge`) provide navigation references.

These markers are map anchors only; bot destination scoring, line-of-sight checks, nav-area links and flee/re-hide behavior still need implementation and in-game testing.

## Bot navigation metadata

Structured metadata is stored in `CSSBC_MapMetadata.json`: four landmark anchors, twelve hide-pocket anchors, district bounds, and explicit pending states for nav/visibility validation. The VMF validation workflow cross-checks every metadata targetname against the actual VMF entities. These are navigation anchors, not a generated `.nav` mesh or finished bot AI.

## Automated VMF checks

Current geometry inventory:

- 190 world brushes; each has six sides.
- 27 entities, including 4 T spawns and 4 CT spawns.
- 1,358 unique VMF IDs.
- Four landmark markers and twelve hide-pocket markers, cross-checked against `CSSBC_MapMetadata.json`.
- Balanced VMF braces; all brushes belong to worldspawn.

GitHub Actions validation workflow: [Validate Modern District VMF](https://github.com/desdesyo/CSS-Bot-Community/actions/workflows/map-vmf-validation.yml).

## Compile / playtest status

**Not yet a compiled or playable BSP.** VMF structure and map anchors are validated, but Hammer loading, VBSP leak checks, VVIS/VRAD, nav mesh generation and in-game testing are not yet verified.

The map-builder workflow defaults to `CSSBC_ExpandedDistrict`. If legitimate CS:S game content is unavailable on the runner, BSP compilation is skipped and the source VMF is still uploaded as an artifact. A successful source-artifact upload is not a BSP compile.

## Next implementation steps

1. Open/compile the VMF with matching CS:S v34 tools and resolve any invalid materials, solids or leaks.
2. Build and connect a nav mesh through all districts, entrances and hide pockets.
3. Add CSSBC map metadata for cover, landmarks, search zones and regroup points.
4. Test bot escape, breaking line of sight, re-hiding and regrouping.
5. Replace temporary brush geometry with final props/materials and run a ten-minute hunt/search playtest.
