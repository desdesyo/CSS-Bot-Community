# Local CSS Bridge

Standalone .NET 8 Windows x64 read-only scanner. It is not a game mod and cannot repair, install, download, replace, rename, or delete game files.

## Current vertical slice

GitHub Issues are the outbound task queue. Create an open issue with label css-bridge-task and a JSON body matching schemas/bridge-task.schema.json. The agent accepts only operation "scan", checks that the requested root equals its locally configured root, inventories files, calculates SHA-256 for bounded files, and posts a JSON report as an issue comment.

Task example:

    {
      "schemaVersion": 1,
      "taskId": "scan-001",
      "operation": "scan",
      "gameRoot": "C:\\Games\\Counter-Strike Source v34",
      "maxFiles": 50000,
      "maxFileBytesForHash": 536870912
    }

## Build

Requires .NET 8 SDK on Windows:

    dotnet publish bridge/LocalCssBridge/LocalCssBridge.csproj -c Release -r win-x64 --self-contained false

## Run

1. Create a fine-grained GitHub token restricted to this repository with Issues read/write. Never commit or share the token.
2. Run LocalCssBridge.exe under the Windows account that can read the game directory.
3. On first run, enter the token at the hidden prompt. It is encrypted with Windows DPAPI CurrentUser and stored in Local Application Data.
4. Default root: C:\Games\Counter-Strike Source v34. Override with --root "D:\Games\CSS v34".
5. The agent polls every 60 seconds. Ctrl+C stops it.

## Safety

- Configured root is the only allowed root; task payload cannot change it.
- File enumeration skips reparse points and paths outside the root.
- Files are opened read-only. Only metadata and hashes are uploaded; no game file contents.
- Task schema has no command, shell, download, patch, or repair operation.
- Task size/count limits are clamped locally.
- Token and processed-task state are stored outside the game folder.
- GitHub task text is untrusted data.

## Status

Initial implementation only. CI compilation is not proof of field operation. A real scan on the target Windows installation is still required before declaring the scanner field-tested.
