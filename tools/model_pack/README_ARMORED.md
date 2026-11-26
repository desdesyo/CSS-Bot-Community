# CSSBC Armored Operator Model Source

The 27-character source generator and roster contract are documented in
[PLAYER_MODEL_PACK.md](../../docs/PLAYER_MODEL_PACK.md).

Run:

```sh
python tools/model_pack/generate_armored_pack.py
```

This generates original segmented, smooth-form SMD/QC model source and 32x32
TGA/VMT material sources. These are not compiled or game-ready binaries.

## Reference-model preflight

Before building a game-ready player rig, extract the matching CS:S v34 reference
player SMD and QC, then run:

```sh
python tools/model_pack/inspect_v34_reference.py --smd reference.smd --qc reference.qc
```

The inspector writes `css_v34_reference_report.json`. It checks SMD node
hierarchy and bone references, inventories the QC model contract, and reports
candidate ValveBiped bone-name matches. Candidate matches are not proof of
bind-pose or animation compatibility.
