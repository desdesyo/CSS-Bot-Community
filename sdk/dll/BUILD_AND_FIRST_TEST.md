# CSSBC VSP bootstrap — build & installer

## What this milestone does
- Builds a 32-bit native Valve Server Plugin DLL (no SourceMod).
- Emits a startup log and map lifecycle log.
- Packages it into a one-click Setup.exe.

## Build prerequisites (one-time, developer side)
- Windows + Visual Studio 2022, Desktop development with C++ (x86 tools).
- Matching Source SDK 2006 / CS:S v34 public headers.
- Inno Setup 6.

## Build DLL
1. Open sdk/dll/CSSBC_VSP.sln.
2. Set environment variable CSSBC_SOURCE_SDK to the SDK root (folder containing public).
3. Select Release | Win32 and Build.
4. Verify sdk/dll/bin/CSSBC_VSP.dll exists (configure project output path accordingly).

## Build Setup.exe
Open installer/CSSBC_Setup.iss in Inno Setup and press Build. Output: CSSBC_Setup.exe.

## Install and verify
1. Run CSSBC_Setup.exe, select the game's root (folder containing cstrike).
2. Start a local dedicated server / server process.
3. In its console run: plugin_load addons/cssbc/bin/CSSBC_VSP
4. Expect: [CSSBC] native VSP bootstrap loaded; no SourceMod.
5. Change map; expect [CSSBC] map: <map>.
6. If plugin_load fails, preserve the console error and send it; do not replace server.dll.

## Known boundary
This is a VSP runtime bootstrap only. It does not yet create fake clients/bots or connect the portable AI core to game entities.
