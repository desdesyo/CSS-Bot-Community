# CSSBC Player & Support Model Pack

## Roster: 23 characters + Juggernaut

The source generator creates 24 separate model folders. The first 23 are the regular roster; Juggernaut is a separate special reinforcement.

| Group | Model IDs |
|---|---|
| Terrorists (10) | `t_raider`, `t_insurgent`, `t_saboteur`, `t_rifleman`, `t_breacher`, `t_scout`, `t_veteran`, `t_militia`, `t_operative`, `t_demolition` |
| CT (10) | `ct_assault`, `ct_recon`, `ct_pointman`, `ct_engineer`, `ct_marksman`, `ct_riot`, `ct_urban`, `ct_desert`, `ct_naval`, `ct_veteran` |
| Support (3) | `support_medic`, `support_sniper`, `support_heavy` |
| Special (1) | `juggernaut` |

Each model has its own QC/SMD source folder, color palette selection, headgear and equipment silhouette. The Juggernaut uses a larger scale and reinforced armour silhouette; gameplay limits and reinforcement timing remain controlled by the bot/gameplay systems, not by the model asset itself.

## Generate and validate

```sh
python tools/model_pack/generate_pack.py
python -m unittest discover -s tools/model_pack -p "test_*.py" -v
```

The generator produces 24 original low-poly character source sets: rigged reference SMD, idle SMD, cyclic walk SMD and QC compile script. It also produces 16x16 TGA swatch texture sources and matching VMT templates.

## Runtime conversion requirements

The generated source is not a compiled runtime pack. Use a CS:S-compatible Source `vtex` to convert the TGA files to VTF and matching `studiomdl` to compile the QC files to MDL/VVD/VTX. Inspect all outputs in HLMV before use.

Current animation coverage is idle and walk only. Crouch, run, jump, weapon-specific poses, reload, death, hitboxes, attachment points and the complete CS:S player animation contract remain to be implemented and verified against v34. The present procedural meshes are low-poly blockout assets, not final-quality human character sculpts. This source pack does not modify the user's installation.

## Licensing

All generated geometry and swatch textures are original CSSBC procedural assets. No Valve or third-party game assets are included.
