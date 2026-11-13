# Windows build (one double-click)

Run **`BUILD_CSSBC.bat`** from the repository root.

The script:
1. Finds the local CS:S SDK at `C:\SDK\hl2sdk-css` (or downloads the public AlliedModders `css` branch if absent).
2. Configures and builds the portable C++ core for Win32 Release.
3. Runs the automated CTest suite.
4. Builds the native Source server-plugin bootstrap DLL with Visual Studio/MSBuild.
5. Copies the DLL to `dist\CSSBC_VSP.dll`.

Requirements: Visual Studio 2022 with **Desktop development with C++**, MSBuild, and CMake (the Visual Studio CMake component is accepted).

The DLL is currently a diagnostic server-plugin bootstrap. It is not yet the complete playable bot/gameplay mod. The game-specific AI, NPC entities, HUD/VGUI, models and content still require integration with a compatible CS:S v34 game-code tree.
