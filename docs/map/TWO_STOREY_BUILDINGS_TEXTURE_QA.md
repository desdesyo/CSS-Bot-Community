# CSSBC Arena — two-storey blockout and texture QA

Status: design/build specification, **not a compiled BSP**. Units are Source Hammer units.

## Two-storey building kit

Use 3–4 enterable buildings distributed across the Residential Edge and Industrial Yard. Keep central combat lanes readable; not every building should be enterable.

### Standard shell
- Footprint: 384 × 512 units; ground floor 160 units tall; second floor 144 units tall; roof parapet 24 units.
- Floor slabs: 16 units thick. Interior clearance: 128–144 units.
- Stair: 64-unit clear width, 8 steps per flight, 16-unit rise / 24-unit tread; landing 64 × 96. Use a switchback stair against a side wall, not a ladder.
- Doors: 96 × 112 clear opening; no door leaf in first blockout (avoid collision choke).
- Windows: sill 40–48 units above floor, opening 64 × 48; thin frames, glass absent or non-blocking.
- Second-floor access: stair from ground floor; one balcony/roof exit only on selected buildings. No dead-end upstairs rooms.
- Gameplay: ground floor has at least two exits; upstairs has one stair plus one window/balcony escape on designated structures. Keep cover off stair landings.
- Sightlines: upstairs windows overlook a lane, not both spawn zones. Avoid long uninterrupted cross-map firing lines.

### Placement / navigation
1. Residential Edge: two compact houses, each with ground + upper room; one shared courtyard route.
2. Industrial Yard: one warehouse office (two floors) beside—not inside—the main truck lane.
3. Central Arena: one small two-storey corner building as a landmark; its upper floor is exposed and not a dominant sniper nest.
4. Keep stairs and floor transitions at least 96 units away from bomb/round objective choke points.
5. Give each building a unique silhouette, exterior trim, and district accent. Do not rely on color alone for navigation.

## Texture QA / debugging pass

### Source material rules
- Use seamless, tileable materials; no baked directional shadows in albedo.
- World surfaces: 512×512 or 1024×1024 source images, power-of-two. Runtime VTF: DXT1 for opaque albedo; DXT5 only when alpha is needed.
- Keep texel density consistent: target 1 texel ≈ 1 Hammer unit for close wall surfaces; 0.25–0.5 texel/unit for broad distant surfaces. Avoid arbitrary per-face scale.
- Use normal maps only where material needs relief; don't fake depth with noisy albedo.
- Separate families: plaster/brick, worn concrete, asphalt, painted metal, wood, glass. Avoid repeating one wall texture across all districts.

### Debug sequence in Hammer / in-game
1. **Missing material:** inspect checkerboard; fix basetexture path and VMT spelling/case.
2. **Pink/black checker:** confirm VTF exists under materials/cssbc/; VMT points to it; copy/pack material into game install.
3. **Muddy/pixelated:** inspect source resolution, VTF format, mipmaps, and texture scale; do not upscale a low-res source.
4. **Visible seams:** check tileability and face UV axes; inspect at grazing angle and at 1× scale.
5. **Shimmer / crawling:** preserve mipmaps, avoid ultra-fine high-contrast noise, test while moving at normal player speed.
6. **Overbright / washed:** remove baked lighting from albedo; verify material flags and compile map lighting separately.
7. **Black surfaces:** check LightmappedGeneric for world surfaces, texture path, and compile lighting.
8. **Performance:** bound unique materials; share material variants, limit alpha/translucency, test full view across all four districts.

### Acceptance checklist
- [ ] No checkerboards or missing-material errors in a full map walk.
- [ ] No visible UV seams on large walls/floors.
- [ ] Ground and second-floor materials readable at 5, 15, and 30 m.
- [ ] No texture shimmer during strafing.
- [ ] Stairs have clean collision and no stuck corners.
- [ ] Upstairs cannot see both team spawn areas.
- [ ] Map tested with actual CS:S v34 client/server; Hammer preview is not runtime validation.

## Honest implementation boundary
This file is geometry/material specification. It does not claim VMF, BSP, VTF, or VMT assets have been built or tested. Next asset step is a Hammer VMF blockout with real brush geometry and entity placement, followed by VTF/VMT materials and an in-game QA pass.
