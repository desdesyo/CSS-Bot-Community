# CS:S v34 player-model integration

## Implemented source rig

The pack no longer relies on the original 12-bone procedural skeleton. The build
pipeline now vendors a 56-bone ValveBiped reference SMD from the public
`robotboy655/gmod-animations` repository and attributes its original authors
in `tools/model_pack/reference/ATTRIBUTION.md`.

The new `tools/model_pack/build_valvebiped_pack.py`:
- replaces the procedural node hierarchy and bind pose with the full ValveBiped reference;
- remaps every generated vertex influence to the corresponding ValveBiped bone;
- creates full-hierarchy idle and walk animation SMDs;
- writes QC files with eye, right/left hand, weapon and clip attachment points;
- writes hitboxes for head, chest, stomach, arms and legs;
- adds idle/walk/run/crouch/jump sequence aliases used by Source player/NPC animation paths.

Build the source pack:

```sh
python tools/model_pack/generate_armored_pack.py --output build/cssbc-models
python tools/model_pack/build_valvebiped_pack.py --pack build/cssbc-models
```

The CI workflow runs this pipeline for all 27 characters and publishes the
resulting SMD/QC/material source pack as an artifact.

## Compatibility boundary

The vendored skeleton is a ValveBiped reference from the Garry's Mod animation
source repository. ValveBiped is a widely reused Source skeleton, but this
reference is **not** claimed to be an extracted CS:S v34 player model. The QC
is CSSBC-authored and provides a conservative baseline; exact CS:S v34
animation include names, attachment orientation, hitbox dimensions and model
viewer behavior still need validation with the target v34 toolchain.

The pipeline does not yet compile MDL/VVD/VTX/VMT/VTF binaries because the
matching CS:S v34 `studiomdl` and `vtex` executables are not available in
GitHub Actions. HLMV inspection and an in-game CS:S v34 test are also
outstanding. Do not label the artifact as a tested drop-in game pack until
those steps pass.

## Automated reference preflight

For a later exact-v34 correction, the repository also includes
`tools/model_pack/inspect_v34_reference.py`. It accepts a reference SMD and
QC, reports the hierarchy, weighted bones, sequences, attachments and hitbox
declarations, and identifies candidate ValveBiped matches. This is an optional
verification path; the current build no longer blocks on user-supplied files.
