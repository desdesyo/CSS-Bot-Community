# CSSBC 27-character operator pack

## Roster contract

Exactly **27 distinct character model source folders**:

- **12 main playable characters:** 6 Terrorists and 6 Counter-Terrorists.
- **Support A, per faction:** 2 riflemen (4 total).
- **Support B, per faction:** 2 riflemen and 1 sniper (6 total).
- **Support C, per faction:** 2 elite operators with reduced health and high-damage weapons (4 total).
- **1 Juggernaut:** separate heavy reinforcement.

Total: 12 + 4 + 6 + 4 + 1 = **27**.

The support source IDs are faction-specific: `support_t_*` and `support_ct_*`.
The Juggernaut remains a separate special model.

## Visual direction

The new generator uses smooth ellipsoid anatomy, layered plate carriers, segmented
armor, shoulder protection, helmets/visors, pouches, radios, packs and role-specific
silhouettes. Terrorists use varied irregular field gear and muted earth tones;
CTs use a coherent elite counter-terrorist equipment language. The Juggernaut
keeps the oversized, intimidating armored silhouette.

## Generate

```sh
python tools/model_pack/generate_armored_pack.py
```

Optional output path:

```sh
python tools/model_pack/generate_armored_pack.py --output ./build/cssbc-27
```

The output is **Source model source** (SMD/QC, TGA/VMT), not compiled MDL/VVD/VTX.
Compile with matching CS:S v34 `vtex` and `studiomdl`, inspect in HLMV, then
complete and validate the full CS:S player animation/attachment/hitbox contract.
Do not assign these source-only models to a live server build before that validation.
The generator does not install or modify the user's game.

## Gameplay data

The model pack establishes identities and folders only. Support selection, team
ownership, health/weapon balancing, reinforcement cost and Juggernaut cooldown
remain in the gameplay systems and must be wired separately.
