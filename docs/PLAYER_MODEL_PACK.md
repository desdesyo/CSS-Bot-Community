# CSSBC Player & Support Model Pack

## Generated role set

| Model | Faction / role | Design |
|---|---|---|
| `t_raider` | Terrorist | Tan field clothing, olive webbing, head wrap |
| `t_insurgent` | Terrorist | Dark clothing, tan rig, face covering |
| `ct_assault` | CT | Navy tactical uniform, black plate carrier, helmet |
| `ct_recon` | CT | Olive recon uniform, compact black rig, helmet |
| `support_medic` | Support | Olive uniform, red medical identifiers, helmet |
| `support_sniper` | Support | Grey low-profile clothing, dark equipment, hood |
| `support_heavy` | Support | Reinforced dark uniform, steel-toned heavy armour |

## Generate and validate

```sh
python tools/model_pack/generate_pack.py
python -m unittest discover -s tools/model_pack -p "test_*.py" -v
```

The generator produces seven original low-poly character source sets: rigged reference SMD, idle SMD, cyclic walk SMD and QC compile script. It also produces 16x16 TGA swatch texture sources and matching VMT templates.

## Runtime conversion requirements

The generated source is not a compiled runtime pack. Use a CS:S-compatible Source `vtex` to convert the TGA files to VTF and matching `studiomdl` to compile the QC files to MDL/VVD/VTX. Inspect all outputs in HLMV before use.

Current animation coverage is idle and walk only. Crouch, run, jump, weapon-specific poses, reload, death, hitboxes, attachment points and the complete CS:S player animation contract remain to be implemented and verified against v34. This source pack does not modify the user's installation.

## Licensing

All generated geometry and swatch textures are original CSSBC procedural assets. No Valve or third-party game assets are included.