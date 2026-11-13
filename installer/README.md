# CSSBC setup package (Inno Setup 6)

The GitHub Actions workflow builds `CSSBC_Setup.exe` after both Win32 binaries are built:
- CSSBC v34 GameDLL -> `cstrike/bin/server.dll`
- CSSBC VSP -> `cstrike/addons/cssbc/bin/CSSBC_VSP.dll`
- VSP manifest -> `cstrike/addons/plugin.vdf`
- diagnostics, log uploader, updater and version metadata

The installer validates that the selected folder contains `cstrike/gameinfo.txt`.
Before replacing the GameDLL, it preserves the existing file as
`cstrike/bin/server.dll.cssbc-backup` (only the first original copy is retained).

The setup is compiled in CI from the artifacts produced by `build-vsp` and
`build-v34-gamedll`. Do not compile it from a source checkout without first
placing both binary artifacts in the expected payload locations.
