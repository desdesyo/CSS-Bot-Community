# CS:S v34 player-model integration gate

The 27 procedural outputs are source meshes, not yet drop-in player models.

## What is corrected in this stage

- All authored dimensions are converted from meters to Source engine units (39.37007874 units per meter).
- QC eye and illumination positions use the same unit conversion.
- CI checks that generated model height is in a human-sized Source-unit range.

## Why the game-ready rig is not fabricated

A valid CS:S player model must match the target game's player skeleton, animation conventions, hitbox layout, and weapon/utility attachment names. A generic 12-bone skeleton with invented attachment points can compile into an MDL and still fail in-game (T-pose, broken locomotion, missing weapons, bad hit registration). The target v34 player reference SMD/QC is therefore a required input for the next conversion stage.

## Required reference input

Export one compatible player reference model from the user's own CS:S v34 installation using a Source model tool such as Crowbar. Supply its reference SMD and QC (or a legally obtained equivalent source reference). Do not use a random Source game skeleton: branch/game differences matter.

## Remaining build steps

1. Compare the reference skeleton and attachment definitions with the generated source.
2. Retarget the 27 meshes to the exact ValveBiped bone names and bind pose.
3. Add and verify the target model's hitbox set and required attachments.
4. Compile QC and materials with the matching v34 studiomdl/vtex toolchain.
5. Inspect all models in HLMV, then test them in a local CS:S v34 session.
6. Only after those checks publish a runtime pack containing MDL/VVD/VTX/VMT/VTF assets.

No step above is considered complete merely because a QC file compiles.
## Automated reference preflight

The repository now includes `tools/model_pack/inspect_v34_reference.py`.
Run it against the exact reference pair extracted from the target CS:S v34
installation:

```sh
python tools/model_pack/inspect_v34_reference.py --smd reference.smd --qc reference.qc
```

The JSON report inventories the node hierarchy, weighted bone IDs, skeleton
frames, QC sequences, attachments, hitbox sets and eye/illumination positions.
It also reports conservative candidate name matches for the procedural mesh
bones. These matches are only a preflight: the bind pose and animation contract
must still be checked before any retargeting. The inspector deliberately does
not rewrite or fabricate the reference rig.
