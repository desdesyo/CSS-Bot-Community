# Windows build and install

## Main CS:S v34 server build

1. Install Visual Studio 2022 with **Desktop development with C++**.
2. Double-click **`BUILD_CSSBC.bat`**.
3. The script runs the portable CMake tests if CMake/CTest are installed, downloads the pinned CS:S v34 source into the ignored `external\cssv34-sdk` folder, applies the CSSBC bot/support/MVP adapter, and builds the native Win32 server DLL.
4. The result is `dist\Server.dll`.
5. Double-click **`INSTALL_CSSBC.bat`** to copy it to `C:\Games\Counter-Strike Source v34\cstrike\bin\server.dll`. The original is backed up as `server.dll.cssbc-backup`.
6. To revert, double-click **`RESTORE_STOCK_SERVER.bat`**.

Git is not required. The batch file uses PowerShell to download the pinned upstream archive. CMake is optional for the local build because the native server project compiles the CSSBC sources directly. If the game is installed elsewhere, edit `GAME_DIR` in `INSTALL_CSSBC.bat`.


## Optional VSP build

`BUILD_CSSBC_VSP.bat` builds the standalone VSP diagnostic bridge against AlliedModders `hl2sdk` `css` headers. It is not the primary game-mod target.

## GitHub Actions

- `CSSBC Core CI`: portable C++ tests on Windows and Linux.
- `Build CSSBC VSP (Win32)`: optional VSP bridge build.
- `Build CS:S v34 server DLL`: downloads the pinned v34 game source, applies the same local patcher and compiles the actual server DLL. It does not upload the upstream-derived binary.

**Upstream source note:** the pinned `rusherr-c/cssv34-sdk` repository currently has no LICENSE file. Its source is downloaded only into the local ignored build folder; the CSSBC repository does not mirror it or publish its compiled game DLL. Check upstream rights before redistributing derivatives.
