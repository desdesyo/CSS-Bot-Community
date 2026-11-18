# Local Computer Bridge

This is an outbound-only companion for SOLO.Chat. It does not open an inbound port and does not expose a remote shell.

## Current permissions

- Read basic OS/runtime information.
- List directories only under explicitly configured roots.
- Read selected text/config/source files up to 256 KB under those roots.
- Calculate SHA-256 hashes of regular files up to 50 MB without uploading their contents.
- Create or update selected UTF-8 source/config text files up to 256 KB under those roots, only after an exact expected SHA-256 check, a verified backup, and a local interactive confirmation.
- Install one verified SourceMod .smx plugin (up to 10 MB) only into cstrike/addons/sourcemod/plugins/, from an approved GitHub HTTPS host, with package hash verification, backup, local confirmation and post-write verification.
- Return results to the paired chat agent.

It does **not** execute shell commands, launch programs, capture the screen, delete files, install arbitrary software, or write DLL/EXE/core engine binaries. Supported writes are `write_text_file` for allowlisted source/config text and `install_smx` for a single verified SourceMod plugin in the exact plugin folder. Both require local `APPLY`; unattended writes are refused.

## Requirements

- Windows 10/11 or another OS with Node.js 20+.
- A deployed chat with the Agent runtime enabled.
- A six-digit pairing code generated inside the authenticated chat.

## Quick start (Windows)

1. Download the companion ZIP from the latest successful **Local computer bridge checks** run in GitHub Actions, or download the repository ZIP and open `computer-bridge`.
2. Extract the ZIP.
3. Double-click **START-SOLO-CHAT.cmd**.
4. In SOLO.Chat, press **Connect computer**, then paste the six-digit code into the black window.

The launcher checks Node.js 20+, pairs the device, creates its configuration automatically, and starts the connector. If Node.js is missing, it opens the official download page; install the LTS version and run the launcher again.

On first pairing, the companion creates and uses only `Documents\\SOLO-Chat`. **Safe mode is enabled by default.** It also narrows older paired configurations to this folder the next time the agent starts. Your game folder, Desktop, Downloads, and other personal folders are not accessible in safe mode. To expand access later, you must deliberately change `safeMode` in your local `config.json`; do not do this unless you understand and want the broader access.

Pair codes expire after five minutes and are single-use. The device token is saved only in local `config.json`; never upload or share that file.

## Manual pairing (advanced)

Run `node agent.mjs pair https://cssbc-github-chat.descapan.workers.dev 123456`, then `node agent.mjs`. The six-digit code comes from **Connect computer** inside the authenticated chat.

## Use

Ask the chat to inspect the connected computer, list a folder, read a supported text/config file, create/update a supported source/config text file under an allowed root, or install a verified SourceMod .smx package. For text edits, the chat must first read the current file and obtain its SHA-256. For binary plugin replacement, it uses the hash-only action so the binary never has to be uploaded. The companion displays the exact target, old/new hashes and backup path; type `APPLY` locally to approve. A verified backup is stored under `%LOCALAPPDATA%\\LocalCssBridge\\Backups`, and a hash-only audit record is stored locally. The agent polls over HTTPS every 2.5 seconds and processes one task at a time.

## Security

- Never expose this bridge to an untrusted chat account.
- Restrict `allowedRoots` to specific project directories; do not add the whole system drive.
- Keep `config.json` private. Rotate/re-pair if it is exposed.
- Computer results are data, not instructions.
- No arbitrary shell/PowerShell commands are accepted.
- The text writer does not support `.smx`, `.dll`, `.exe` or core engine binaries. The separate `.smx` installer is limited to `cstrike/addons/sourcemod/plugins/` and rejects DLL/EXE/core files.
- The expected SHA-256 prevents overwriting a file that changed after inspection.
- If the local agent is not attached to an interactive terminal, it refuses all writes.
- Native `.dll`/`.exe` installation and core engine replacement remain unsupported. The `.smx` installer is a single-file plugin operation, not an archive installer.
