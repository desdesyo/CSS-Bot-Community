# CSSBC asset production pipeline

This repository tracks source assets; game-ready assets must be generated with Source-compatible tools.

## One-command Blender preparation
Run `blender --background --python tools/postprocess_obj.py`. Outputs are staging meshes only. This does not rig bots, bake UVs, or create MDL.

## Characters — required conversion
1. Import CT/T OBJ and preserve material groups.
2. Retopologize/clean hard intersections; make UV seams and unwrap.
3. Rig to the CS:S player skeleton (ValveBiped) with weights; use the stock CS:S player SMD skeleton as reference.
4. Export reference + body SMD, then animation SMDs compatible with the chosen player sequence set.
5. QC must declare `$modelname`, `$body`, `$cdmaterials`, `$sequence`, `$collisionmodel`, `$surfaceprop`, and `$include`/animation references.
6. Compile with the CS:S `studiomdl.exe`; inspect in HLMV; test hitboxes and animation transitions in a local server.

## Weapons — required conversion
- OBJ → Blender cleanup → UV/material assignment → SMD export.
- Build separate viewmodel and worldmodel meshes; define grip/hand alignment and attachment points.
- QC: `$modelname`, `$body`, `$cdmaterials`, `$sequence` (idle/inspection if authored), `$attachment`, `$surfaceprop`, `$collisionmodel`.
- A weapon MDL alone is not a CS:S weapon implementation: server weapon entity, client viewmodel, ammo/reload/fire animations, sounds, scripts and HUD must agree.

## Output locations (never overwrite stock files)
- source: `assets/characters/models`, `assets/weapons/models`
- staged: `build/postprocessed`
- compiled: `build/models/cssbc/...`
- game test copy: `cstrike/models/cssbc/...`, `cstrike/materials/models/cssbc/...`

## Gate
Only call an asset "in-game" after MDL/VVD/VTX exists, HLMV opens it, and a clean CS:S v34 test server/client can render it without replacing stock assets. Current OBJ files are blockouts; no compiled MDLs are checked in.
