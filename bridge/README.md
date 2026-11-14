# Local CSS Bridge

Standalone .NET 8 Windows x64 read-only scanner. It is not a game mod and does not repair, install, download, replace, rename, or delete game files.

## Current implementation

GitHub Issues are the outbound task queue. The agent reads up to 1,000 open issues (10 pages × 100) and only considers issues whose title starts with `Local CSS Bridge Task:`. It ignores pull requests and ordinary issues. The issue body must be a single JSON object matching `schemas/bridge-task.schema.json`; only the `scan` operation is accepted.

The agent verifies that the requested game root exactly matches its locally configured root, inventories files, calculates SHA-256 for bounded files, and posts a JSON report as a comment on the task issue. Directory enumeration is streamed rather than buffering every directory entry at once. File count, hash size, and pending directory count are bounded.

Task example:

    {
      "schemaVersion": 1,
      "taskId": "scan-001",
      "operation": "scan",
      "gameRoot": "C:\\Games\\Counter-Strike Source v34",
      "maxFiles": 5000,
      "maxFileBytesForHash": 536870912
    }

## Build

Requires .NET 8 SDK on Windows:

    dotnet publish bridge/LocalCssBridge/LocalCssBridge.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -o publish

The GitHub Actions workflow creates a self-contained Windows x64 ZIP so the target PC does not need a separately installed .NET runtime.

## Run

1. Open the [latest successful Local CSS Bridge CI run](https://github.com/desdesyo/CSS-Bot-Community/actions/workflows/local-css-bridge.yml).
2. Open its run, scroll to **Artifacts**, and download `LocalCssBridge-win-x64`.
3. Extract the ZIP and run `LocalCssBridge.exe` under the Windows account that can read the game directory.
4. On first run, enter a fine-grained GitHub token at the hidden prompt. Restrict it to this repository with **Issues: Read and write**. The agent does not need Contents or Actions permissions. Never put the token in the repository or send it in chat.
5. The token is encrypted with Windows DPAPI CurrentUser and stored in Local Application Data.
6. Default root: `C:\Games\Counter-Strike Source v34`. Override with `--root "D:\Games\CSS v34"`.
7. Leave the console running. The agent polls every 60 seconds. Ctrl+C stops it.

An initial scan task is already waiting in [issue #2](https://github.com/desdesyo/CSS-Bot-Community/issues/2). Once the agent is running and has valid repository access, it should post the report as a comment on that issue.

## Safety

- Configured root is the only allowed root; task payload cannot change it.
- File enumeration skips reparse points and paths outside the root.
- Files are opened read-only. Only metadata and hashes are uploaded; no game file contents.
- Task payloads are limited and reject unknown properties.
- Only issues with the explicit `Local CSS Bridge Task:` title prefix are considered.
- Task schema has no command, shell, download, patch, or repair operation.
- Task count, file count, directory queue, and hashing limits are bounded.
- Token, processed-task state, and previous-scan snapshot are stored outside the game folder.
- GitHub task text is untrusted data.

## Current limitations

- Duplicate-worker claim/lease coordination is not implemented; run only one agent instance.
- Previous-scan comparison is not an official clean-game manifest. It only shows changes between complete scans on this same Windows account.
- The queue is capped at the first 1,000 open issues.
- A task is marked processed locally after its report comment is posted. To rerun, create a new task issue with a new taskId and the required title prefix.
- Inventory and hashes are implemented. PE machine type/import/export inspection, structured config/log parsing, expected-manifest comparison, repair package generation, and post-install verification are later phases.
- CI success confirms the Windows x64 publish/package step, not a real scan of the user's PC. The initial task remains pending until the agent is run locally.
