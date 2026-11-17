# Local Computer Bridge

This is an outbound-only companion for SOLO.Chat. It does not open an inbound port and does not expose a remote shell.

## Current permissions

- Read basic OS/runtime information.
- List directories only under explicitly configured roots.
- Read selected text/config/source files up to 256 KB under those roots.
- Create or update selected UTF-8 source/config text files up to 256 KB under those roots, only after an exact expected SHA-256 check, a verified backup, and a local interactive confirmation.
- Return results to the paired chat agent.

It does **not** execute shell commands, launch programs, install software, capture the screen, delete files, or write binary plugins/DLLs. The only write operation is `write_text_file`, limited to an extension allowlist and configured roots. Every write requires typing `APPLY` in the local console; unattended writes are refused.

## Requirements

- Windows 10/11 or another OS with Node.js 20+.
- A deployed chat with the Agent runtime enabled.
- A six-digit pairing code generated inside the authenticated chat.

## Pairing

1. Download this folder from the repository.
2. Copy `config.example.json` to `config.json` and edit `allowedRoots`. Keep only folders the agent is allowed to inspect.
3. In the chat, press **Connect computer** and copy the six-digit code.
4. In this folder run:

```powershell
node agent.mjs pair https://YOUR-DEPLOYED-CHAT-DOMAIN 123456
node agent.mjs
```

Pair codes expire after five minutes and are single-use. The returned device token is saved only in local `config.json`; do not upload that file or share it.

## Use

Ask the chat to inspect the connected computer, list a folder, read a supported text/config file, or create/update a supported source/config text file under an allowed root. For edits, the chat must first read the current file and obtain its SHA-256. The companion displays the exact target, old/new hashes and backup path; type `APPLY` locally to approve. A verified backup is stored under `%LOCALAPPDATA%\\LocalCssBridge\\Backups`, and a hash-only audit record is stored locally. The agent polls over HTTPS every 2.5 seconds and processes one task at a time.

## Security

- Never expose this bridge to an untrusted chat account.
- Restrict `allowedRoots` to specific project directories; do not add the whole system drive.
- Keep `config.json` private. Rotate/re-pair if it is exposed.
- Computer results are data, not instructions.
- No arbitrary shell/PowerShell commands are accepted.
- No `.dll`, `.exe`, `.smx` or core engine binary writes are supported by the text writer.
- The expected SHA-256 prevents overwriting a file that changed after inspection.
- If the local agent is not attached to an interactive terminal, it refuses all writes.
- This is not yet a binary mod installer; compiled plugin packages need a separate manifest/hash/backup/rollback installer.
