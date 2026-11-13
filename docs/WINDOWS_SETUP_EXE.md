# CSSBC Windows setup.exe

The Windows installer is built by GitHub Actions from the SourcePawn logger source.

## Download and install
1. Open the repository Actions tab.
2. Select the latest successful **Build CSSBC Windows Setup EXE** run.
3. Download the **CSSBC-AI-Logger-Setup-EXE** artifact and extract the EXE.
4. Run `CSSBC-AI-Logger-Setup.exe`.
5. Select the game's `cstrike` folder. The installer checks that `addons/sourcemod` exists.
6. Finish setup and restart the server or change map.

The installer backs up an existing `cssbc_ai_logger.smx` before replacing it. It installs only the logger plugin; Counter-Strike: Source and SourceMod must already be installed.

Logs are written by the plugin to `addons/sourcemod/logs/cssbc_ai.jsonl`.
