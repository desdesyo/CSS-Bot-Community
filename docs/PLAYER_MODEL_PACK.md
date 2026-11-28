# CSSBC Player & Support Model Pack

The corrected target roster is **27 characters**, not the earlier 23-character draft.

- 12 main playable characters: 6 Terrorists + 6 Counter-Terrorists.
- Support A: 2 riflemen per faction (4 total).
- Support B: 2 riflemen + 1 sniper per faction (6 total).
- Support C: 2 elite reduced-health / high-firepower fighters per faction (4 total).
- 1 separate Juggernaut.

Total: 12 + 4 + 6 + 4 + 1 = **27**.

The original `generate_pack.py` is retained as a legacy low-poly blockout generator.
Use the alternate armored generator for the new art direction:

```sh
python tools/model_pack/generate_armored_pack.py
python tools/model_pack/generate_armored_pack.py --output ./build/cssbc-27
```

See [PLAYER_MODEL_PACK_27.md](PLAYER_MODEL_PACK_27.md) for model IDs, visual direction,
source-generation details and compile requirements.

**Important:** generated SMD/QC/TGA/VMT files are source assets, not compiled CS:S v34
runtime models. A matching `vtex` and `studiomdl`, HLMV inspection, complete player
animation/attachment/hitbox contract and in-game v34 testing are still required.
This source generator does not modify the user's game installation.
