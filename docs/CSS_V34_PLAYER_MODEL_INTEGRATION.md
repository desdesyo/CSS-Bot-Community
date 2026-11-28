# CS:S v34 player-model integration status

## Implemented source model pipeline

- 27 original procedural character source meshes and materials.
- Full ValveBiped reference skeleton and bone-weight remapping.
- Full-hierarchy idle/walk source animation files.
- QC generation with baseline eye/hand/weapon attachments and hitboxes.
- Windows compile/install script: tools/model_pack/install_css_v34.ps1.
- C++ model registry: src/CSSBC_ModelRoster.h/.cpp, containing all 27 model paths and faction/support-tier lookup.
- Engine boundary: src/CSSBC_ModelRuntime.h/.cpp exposes ApplyPlayerModel and ApplySupportPlayerModel through IPlayerModelAdapter; tests verify the exact model paths and reject invalid entity/role inputs.
- CI tests for source generation, retargeting, installer syntax, and the C++ roster registry.

## Compiled game assets

The Windows installer requires a matching CS:S v34-compatible studiomdl.exe and vtex.exe. It generates and compiles all 27 assets in a temporary staging game directory, verifies each MDL/VVD/DX90 VTX output, then installs the assets and roster manifest under cstrike. Existing CSSBC model/material directories are backed up before replacement. Stock Valve player models are not overwritten.

See docs/CSS_V34_MODEL_INSTALLATION.md for requirements and commands.

## Runtime integration not yet implemented

The repository is still an engine-independent C++ gameplay core. It is not a CS:S v34 game DLL, server plugin, or SourceMod plugin. The model registry and engine-boundary assignment API provide stable model paths and a SetPlayerModel adapter contract, but no loaded game-side component currently implements that contract with the CS:S v34 entity APIs.

Consequently:
- The installer can put all 27 compiled models into the game content tree once run on a Windows machine with the correct compiler tools.
- CS:S bots and players do not automatically select those custom paths yet.
- Support purchases and Juggernaut logic are not yet connected to actual CS:S entity spawning/model assignment.
- The 27 models have not been compiled or inspected on the user's actual CS:S v34 installation in this environment.

The remaining required work is a v34-compatible game-side adapter that selects a roster entry for each player/bot entity and connects support/Juggernaut spawning to the game runtime. This must be built and tested against the exact v34 SDK/game interfaces; the 2013 SDK or a generic ValveBiped reference must not be represented as proof of v34 binary compatibility.
