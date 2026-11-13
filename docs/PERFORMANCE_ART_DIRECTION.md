# CSSBC — Visual quality vs original CS:S performance

Target: an "Absolution"-like grounded, cinematic presentation while retaining original CS:S responsiveness on older PCs. This is an engineering target, not a claim of visual parity.

## Budget (per visible player / weapon)
- Player body: 1,800–3,500 triangles at LOD0; 700–1,200 LOD1; 250–500 LOD2.
- First-person weapon: 3,500–7,000 triangles; world weapon 1,200–2,500; dropped LOD 400–900.
- Bot texture set: 1× 1024² basecolor + packed 512² normal/roughness/metal where supported; weapon 512²–1024². Reuse atlases by faction/material; no unique 4K maps.
- Draw calls: target 1–3 material batches per character, 1–2 per weapon; avoid tiny separate meshes/materials at runtime.
- Shadows: only nearby actors/important props cast dynamic shadows; no cascaded/high-resolution shadow system by default.
- Lighting: baked/static map lighting and lightmaps first; limited dynamic lights, no full-screen AO/SSR/volumetric effects.
- Particles: capped per event and short lifetime; smoke/flash reduced at distance; no persistent expensive effects.
- Visibility: use Source PVS/areaportals and model LOD; don't add per-frame global entity scans.
- Physics: retain original collision/hitboxes; cosmetic detail must not add collision objects.
- Materials: VMT/Source-compatible shaders, few translucent surfaces, avoid expensive layered shaders and alpha-test overdraw.
- Memory: share textures/materials; mipmaps; keep duplicate maps out of per-model folders.

## Art direction ("cinematic, restrained")
- Realistic proportions and readable silhouettes, matte fabrics, slightly worn edges, controlled roughness/specular, restrained color grading.
- Bake bevels/edge highlights into normals where possible; do not add geometry to every seam.
- Keep silhouettes and weapon landmarks recognizable at gameplay distance; avoid tiny details that disappear at 720p.
- CT/T: distinct faction palettes and equipment shapes, but same skeleton and animation set for runtime reuse.

## Model pipeline (required before calling assets final)
1. Blockout -> silhouette/proportion review in Blender.
2. Retopology and triangulated LODs (LOD0/1/2); remove hidden/internal faces.
3. UV unwrap, texture atlases, bake normals/AO in offline pipeline.
4. Rig CT/T to shared Source-compatible skeleton, skin weights, validate deformation.
5. QC + compile with studiomdl against a known CS:S SDK setup; generate MDL/VVD/VTX, verify materials.
6. Test on old laptop: 20 bots + player, map with representative visibility; record FPS/frame time and memory before/after.
7. Keep a low preset: model LOD, low particles, shadows off, texture filtering appropriate. No mandatory post-processing.

## Acceptance criteria
- No visual asset considered "done" without in-engine screenshot and mesh/material check.
- At 20 bots, AI/game logic unchanged; target frame time stays near stock CS:S on reference low-end hardware (measure; do not claim without measurements).
- Keep gameplay-critical silhouettes and original collision/hitboxes; visual upgrades never change balance.
- Every model has LODs and shared materials; bot variants share rig/animations.
