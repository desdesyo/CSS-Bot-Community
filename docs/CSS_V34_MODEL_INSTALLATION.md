# CS:S v34 compiled model installation

## What this installs

The Windows installer builds and installs all 27 model assets under:

- cstrike/models/cssbc/player/
- cstrike/materials/models/cssbc/player/
- cstrike/cfg/cssbc/player_roster.json

It first generates the procedural meshes, retargets them to the vendored ValveBiped hierarchy, compiles the materials with vtex.exe, and compiles all 27 QC files with studiomdl.exe. Compilation happens in a temporary staging game directory. The game directory is not touched until all 27 models have MDL, VVD and DX90 VTX outputs.

## Requirements

- Windows 10/11 x64
- Counter-Strike: Source v34 installed
- Python 3
- A compatible Source toolchain containing studiomdl.exe and vtex.exe

The game installation may not include the two compiler executables. The installer refuses to proceed if either is missing. It does not download proprietary Valve tools or substitute a different game's compiler.

## Run

From the repository root in PowerShell:

~~~powershell
Set-ExecutionPolicy -Scope Process Bypass
.\tools\model_pack\install_css_v34.ps1
~~~

If the compiler tools are elsewhere:

~~~powershell
.\tools\model_pack\install_css_v34.ps1 -GameRoot "C:\Games\Counter-Strike Source v34" -StudioMdlPath "D:\SourceTools\studiomdl.exe" -VtexPath "D:\SourceTools\vtex.exe"
~~~

Use -DryRun to compile and validate in a temporary staging folder without changing the game installation.

The installer backs up existing CSSBC model/material directories beside the game folder before copying new files. It never overwrites stock Valve player model files. It does not edit game DLLs, bot profiles, or server configuration.

## Important runtime limitation

Installing custom model binaries does not make CS:S bots select arbitrary model paths. The repository's C++ gameplay core is engine-independent and is not a CS:S v34 server/game DLL. A game-side adapter must still assign the model path to each player/bot entity and connect support tiers/Juggernaut spawning to actual game entities.

The installer therefore installs all 27 compiled assets and a machine-readable roster manifest, but it does not claim that all 27 characters are selectable or visible in a live match yet. The ReplaceStockModels switch is retained only as an explicit warning gate; it intentionally does not replace stock models because doing so would expose only a subset and hide the full roster.

## Rollback

If you had an earlier CSSBC model/material directory, restore the backup folder named CSSBC-backup-YYYYMMDD-HHMMSS beside the game folder. Remove the installed cstrike/models/cssbc/player, cstrike/materials/models/cssbc/player, and cstrike/cfg/cssbc/player_roster.json paths only if they were created by this installer and you do not need them.
