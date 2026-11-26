# CSSBC Player & Support Model Pack

Original, procedural low-poly Source character source assets. Seven distinct role variants are generated:

- Terrorists: Raider and Insurgent
- CT: Assault and Recon
- Support NPCs: Medic, Sniper and Heavy

## Generate and test

Requires Python 3.9+; no third-party Python packages.

```sh
python tools/model_pack/generate_pack.py
python -m unittest discover -s tools/model_pack -p "test_*.py" -v
```

Optional output directory:

```sh
python tools/model_pack/generate_pack.py --output ./build/cssbc-models
```

Each character gets a reference mesh SMD, a subtle idle animation SMD, a cyclic walk animation SMD and a QC compile script. Original 16x16 TGA swatch textures and VMT templates are generated under `generated/materials/models/cssbc/player`.

## Compile for CS:S

These are Source model *source files*, not finished game binaries. A compatible Source branch `studiomdl` and `vtex` are required:

1. Convert the generated TGA source textures to VTF using the matching Source `vtex` tool, preserving the relative path `materials/models/cssbc/player`.
2. Compile each role QC using a CS:S-compatible `studiomdl` with the correct game search paths.
3. Inspect each model in HLMV: bind pose, material paths, skeleton, proportions, normals and animation playback.
4. Add the full CS:S player animation set and weapon attachments before assigning these models to live players or bots.
5. Test hitboxes, collision, team assignment and NPC support behavior in the exact v34 build.

The current source generator includes only idle and walk cycles. It does not claim to supply crouch, run, jump, weapon, reload, death or full CS:S player animation compatibility. It does not patch the user's game installation.

## Asset policy

All generated geometry and swatch textures are original procedural CSSBC source. No Valve or third-party game assets are bundled.