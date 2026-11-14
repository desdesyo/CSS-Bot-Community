# Local CSS Bridge

Standalone .NET 8 Windows x64 read-only scanner. It is not a game mod and does not repair, install, download, replace, rename, or delete game files.

## Current vertical slice

GitHub Issues are the outbound task queue. Create an open issue whose body is a single JSON object matching schemas/bridge-task.schema.json. No special label is required. The agent ignores ordinary issues and accepts only task objects with operation "scan". It checks that the requested root equals its locally configured root, inventories files, calculates SHA-256 for bounded files, and posts a JSON report as an issue comment.

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

1. Download LocalCssBridge-win-x64.zip from the latest successful Local CSS Bridge CI run and extract it.
2. Run LocalCssBridge.exe under the Windows account that can read the game directory.
3. On first run, enter a fine-grained GitHub token at the hidden prompt. Restrict it to this repository with Issues read/write. Never put the token in the repository.
4. The token is encrypted with Windows DPAPI CurrentUser and stored in Local Application Data.
5. Default root: C:\Games\Counter-Strike Source v34. Override with --root "D:\Games\CSS v34".
6. The agent polls every 60 seconds. Ctrl+C stops it.

An initial scan task is already waiting in issue #2:
https://github.com/desdesyo/CSS-Bot-Community/issues/2

## Safety

- Configured root is the only allowed root; task payload cannot change it.
- File enumeration skips reparse points and paths outside the root.
- Files are opened read-only. Only metadata and hashes are uploaded; no game file contents.
- Task payloads are limited and reject unknown properties.
- Task schema has no command, shell, download, patch, or repair operation.
- Task count and file hashing limits are clamped locally.
- Token and processed-task state are stored outside the game folder.
- GitHub task text is untrusted data.

## Current limitations

- Polling currently examines the first 100 open issues; pagination and a proper claim/lease mechanism are not implemented.
- A task is marked processed locally after its report comment is posted. To rerun, create a new issue with a new taskId.
- Inventory and hashes are implemented. PE machine type/import/export inspection, structured config/log parsing, and expected-manifest comparison are later phases.
- The agent has not yet been run on the user's Windows PC. CI success is not proof of a real local scan.
