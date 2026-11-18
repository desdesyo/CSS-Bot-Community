# SOLO Mod Workshop scripts

Windows PowerShell 5.1+ scripts for creating a local-first mod workspace, inventorying files and inspecting the installed production toolchain. See [the architecture](../docs/SOLO_MOD_WORKSHOP_ARCHITECTURE.md).

## Initialize

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Initialize-SoloModWorkspace.ps1 -Path C:\SOLO\CSS-v34-Mod
```

## Inspect installed tools

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Invoke-SoloToolchain.ps1 -Workspace C:\SOLO\CSS-v34-Mod -Mode doctor
```

The doctor writes `.solo/toolchain.json` and reports SourcePawn compiler, Blender, FFmpeg, CMake, .NET and Git. Missing tools are reported, not auto-installed.

## Compile a SourceMod plugin

Install the SourceMod SDK/compiler yourself, then:

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Invoke-SoloToolchain.ps1 -Workspace C:\SOLO\CSS-v34-Mod -Mode build-plugin -SpcompPath C:\srcds\addons\sourcemod\scripting\spcomp.exe -SourceFile plugins\my_plugin.sp
```

Source must be inside workspace `src/`; output goes to `build/`. The script records compiler output, exit code, artifact size and SHA-256. It never installs the plugin into the game.

## Inventory

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Get-SoloModInventory.ps1 -Path C:\SOLO\CSS-v34-Mod
```

The scripts do not access or modify the game installation. Inventory hashes project files only; files above 256 MB are listed without a hash by default.
