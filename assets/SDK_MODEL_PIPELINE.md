# SDK asset integration: characters and weapon blockouts

The repository's OBJ files are source geometry, not Source-engine runtime models.
CS:S v34 consumes compiled MDL/VTX/VVD plus materials (VMT/VTF); never rename OBJ to MDL.

## Character pipeline
1. Import `assets/characters/models/cssbc_bot_ct.obj` / `cssbc_bot_t.obj` into Blender.
2. Validate scale/origin, triangulation, normals, UVs, skeleton and weights against the CS:S player rig.
3. Retarget/weight to the matching CT/T skeleton. Keep original animations and hitbox set.
4. Export SMD (reference + body + physics where needed).
5. Write QC with correct model path, materials, hitbox set, and existing CS:S animation sources.
6. Compile with the Source SDK v34 studiomdl, inspect in HLMV, then test in a clean game copy.

## Weapons pipeline
1. OBJ blockouts in `assets/weapons/models` are design geometry only.
2. Separate world model and view model; author grip, muzzle, magazine, moving parts and attachment points.
3. UV unwrap and bake/paint textures; create VMT/VTF (appropriate shader and texture flags).
4. Export SMD, create QC with weapon-specific origin/attachment data, compile MDL.
5. Integrate model paths in weapon script and game-DLL precache; test world pickup, viewmodel, dropped state, muzzle flash and reload animation.

## Current repository truth
- OBJ character meshes and weapon blockouts are present.
- They are not compiled game-ready MDLs; there are no claims of rigging, animation, QC or runtime precache until those artifacts are checked in and tested.
- Model replacement should be additive under `models/cssbc/`; do not overwrite stock CS:S assets.
