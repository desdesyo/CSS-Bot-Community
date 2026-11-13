# Windows build (one double-click)

Run **`BUILD_CSSBC.bat`** from the repository root.

The script:
1. Finds the local CS:S SDK at `C:\SDK\hl2sdk-css` (or downloads the public AlliedModders `css` branch if absent).
2. Configures and builds the portable C++ core for Win32 Release.
3. Runs the automated CTest suite.
4. Builds the native Win32 server-plugin DLL, including the portable core and MVP game-event bridge.
5. Copies the DLL to `dist\CSSBC_VSP.dll`.

Requirements: Visual Studio 2022 with **Desktop development with C++**, MSBuild, and CMake (the Visual Studio CMake component is accepted).

The same script runs in GitHub Actions. A successful run publishes the `CSSBC-VSP-Win32` artifact. The current DLL listens for round, death, bomb and hostage events and logs the top three MVP user IDs at round end.

**This is not yet the full playable mod.** The in-game test against the exact non-Steam CS:S v34 build is still required. Bot AI replacement, support NPC spawning, six real armor hit regions, client HUD/VGUI, models, animations and content still need their game-specific adapters and assets.
