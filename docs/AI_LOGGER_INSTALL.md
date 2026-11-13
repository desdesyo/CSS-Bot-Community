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
