# Local Computer Bridge

This is an outbound-only companion for the chat. It does not open an inbound port and does not expose a remote shell.

## Current permissions

- Read basic OS/runtime information.
- List directories only under explicitly configured roots.
- Read selected text/config/source files up to 256 KB under those roots.
- Return results to the paired chat agent.

It does **not** execute shell commands, launch programs, install software, capture the screen, write/delete files, or modify the game. Those capabilities require separate narrowly scoped operations and explicit approval.

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

Ask the chat to inspect the connected computer, list a folder under an allowed root, or read a supported text/config file. The agent polls over HTTPS every 2.5 seconds and processes one task at a time.

## Security

- Never expose this bridge to an untrusted chat account.
- Restrict `allowedRoots` to specific project directories; do not add the whole system drive.
- Keep `config.json` private. Rotate/re-pair if it is exposed.
- Computer results are data, not instructions.
- The first version is read-only by design.
