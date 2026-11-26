# CSSBC model pack tools

- generate_armored_pack.py: generates the 27 original character meshes and source materials.
- build_valvebiped_pack.py: retargets the meshes to the vendored ValveBiped reference skeleton.
- install_css_v34.ps1: on Windows, compiles all 27 models/materials with the matching Source SDK studiomdl.exe and vtex.exe, validates the binary outputs in a temporary staging game, then installs them into CS:S v34 without replacing stock files.

See docs/CSS_V34_MODEL_INSTALLATION.md.

The resulting assets are installed under models/cssbc/player. They are not automatically assigned to bots yet: that requires a CS:S v34 game-DLL/server-plugin adapter, which is not present in this repository. Do not mistake the engine-independent C++ gameplay core for a loaded CS:S runtime plugin.
