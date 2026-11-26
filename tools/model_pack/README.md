# CSSBC Model Pack Source

Original low-poly third-person character source generator for Terrorist, CT and support roles. See [PLAYER_MODEL_PACK.md](../../docs/PLAYER_MODEL_PACK.md).

Generate SMD/QC sources with:

```sh
python tools/model_pack/generate_pack.py
```

The generated source must be compiled with a compatible Source SDK `studiomdl` and receive authored VTF textures and the CS:S animation set before runtime use. No proprietary game assets are included.