# CSSBC AI event logger and installer

The build workflow compiles the SourcePawn logger and publishes a downloadable installer artifact.

## Install
1. Open the repository Actions tab.
2. Run "Build CSSBC AI Logger" with Run workflow, or wait for a change to logger/setup files on sdk-foundation.
3. Download the cssbc-ai-logger-installer artifact from the successful run.
4. Extract the ZIP and run START_SETUP.bat on the Windows CS:S server.
5. The server must already have SourceMod installed.
6. Restart the server or change map.

Events are written as JSON Lines to addons/sourcemod/logs/cssbc_ai.jsonl.

## Collected events
Round start/end, player spawn, death, damage, bomb objective events and grenade throws.

The logger does not store player names, Steam IDs or IP addresses. AI interpretation/upload is a separate stage and requires an OPENAI_API_KEY Actions secret; it is not silently enabled by this installer.


## Windows setup.exe (recommended)

A native Windows installer is also built by the **Build CSSBC Windows Setup EXE** workflow.

1. Open [GitHub Actions](https://github.com/desdesyo/CSS-Bot-Community/actions/workflows/build-setup-exe.yml).
2. Open the latest successful run.
3. Download the `CSSBC-AI-Logger-Setup-EXE` artifact and extract it.
4. Run `CSSBC-AI-Logger-Setup.exe`.
5. Select the CS:S `cstrike` folder. The installer checks for `addons/sourcemod` and backs up an existing logger plugin before replacing it.

This is a normal Windows setup wizard; no separate BAT or PowerShell command is needed. CS:S and SourceMod must already be installed.
