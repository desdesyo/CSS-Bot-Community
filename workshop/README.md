# SOLO Mod Workshop scripts

Windows PowerShell 5.1+ scripts for creating a local-first mod workspace and producing a bounded SHA-256 inventory. See [the architecture](../docs/SOLO_MOD_WORKSHOP_ARCHITECTURE.md).

## Initialize

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Initialize-SoloModWorkspace.ps1 -Path C:\SOLO\CSS-v34-Mod
```

## Inventory

```powershell
powershell -ExecutionPolicy Bypass -File .\workshop\Get-SoloModInventory.ps1 -Path C:\SOLO\CSS-v34-Mod
```

The scripts do not access or modify the game installation. Inventory hashes local project files only; files above 256 MB are listed without a hash by default.
