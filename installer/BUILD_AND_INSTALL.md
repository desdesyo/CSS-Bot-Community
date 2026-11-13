# Build and install CSSBC for CS:S v34

The supported route is GitHub Actions. No local Python, SourceMod, or manual DLL
copying is required.

## Build

1. Open https://github.com/desdesyo/CSS-Bot-Community/actions
2. Select **Build CSSBC native modules (Win32)** on branch `sdk-foundation`.
3. Wait for `build-vsp`, `build-v34-gamedll`, and `build-installer` to succeed.
4. Download the **CSSBC-Setup-Win32** artifact, or use the prerelease attached to
   the run when it is published.

The installer job consumes both compiled Win32 DLL artifacts. It verifies all
required payload files before invoking Inno Setup 6.

## Install

1. Close Counter-Strike: Source.
2. Run `CSSBC_Setup.exe` as administrator.
3. Select the game root folder — the folder containing `cstrike\gameinfo.txt`.
   The known default `C:\Games\Counter-Strike Source v34` is preselected when
   it contains that file.
4. Finish the setup.

The installer places the GameDLL at `cstrike\bin\server.dll`, the VSP at
`cstrike\addons\cssbc\bin\CSSBC_VSP.dll`, and the VSP manifest in
`cstrike\addons\cssbc.vdf`. Before replacing an existing GameDLL it creates
`server.dll.cssbc-backup`; it never overwrites that first backup.

## If the game does not start

Do not delete the backup. Restore the original by renaming
`cstrike\bin\server.dll.cssbc-backup` to `server.dll` after moving the
CSSBC version out of the way. Then collect diagnostics from the Start Menu
shortcut **CSSBC — Collect diagnostics**.
