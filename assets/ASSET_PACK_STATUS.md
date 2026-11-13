# CSSBC 3D asset pack

## OBJ weapon source meshes
AK-12, M4 SOPMOD, AUG A3 (bullpup), SG 553, FAMAS G2, Galil ACE, MP5 MLI, APC9, MAC-10, AX precision rifle are present in assets/weapons/models. Distinct layouts: bullpup, compact SMG/PDW, long precision profile, heavier rifle, conventional rifle. Materials linked through cssbc_weapons.mtl.

## Bot/player meshes
- characters/models/cssbc_bot_ct.obj — helmet/visor, plate carrier, radio, pouches, armor/knee pads.
- characters/models/cssbc_bot_t.obj — bandana/headset/scarf, backpack, different cloth/armor palette.
- characters/models/cssbc_bot.mtl — material palette.

## Postprocessing
tools/postprocess_obj.py: Blender batch import, transform application, loose geometry cleanup, outward normal recalculation, object joining and triangulation; outputs to build/postprocessed. Run with Blender 4.x:
`blender --background --python tools/postprocess_obj.py`

## Current truthful stage
These are first-pass low-poly blockouts, not final art. Weapon bodies still rely heavily on box/cylinder primitives; bots are static, unrigged meshes. Script has been committed but not executed/visually validated here. Missing: detailed weapon receiver contours and machining, proper curved magazines/handguards, UVs and authored textures, rigging/weights/animations, QC files and compiled Source .mdl/.vvd/.vtx assets. OBJ is source geometry only and cannot be dropped directly into CS:S.
