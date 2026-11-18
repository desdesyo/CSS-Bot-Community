# SOLO.Chat Local Computer Bridge

Windows companion connecting the deployed [SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/) to the local CSS v34 game folder and the separate mod workspace. Outbound HTTPS only; no open inbound port and no remote shell.

## Allowed folders

Default configuration contains two separate roots:

- Game: `C:\Games\Counter-Strike Source v34` — read-only diagnostics; only the separately documented approval-gated .smx installer can write a single plugin file.
- Workshop: `C:\SOLO\CSS-v34-Mod` — source/config work files and generated project artifacts. Text changes require exact SHA-256, verified backup and local `APPLY` approval.

The bridge never writes DLL/EXE/core engine files, executes commands from chat, or creates arbitrary directories. The workshop initializer creates the project structure first.

## Install and pair

1. Download the latest successful **SOLO-Chat-Computer-Bridge** artifact from [computer-bridge CI](https://github.com/desdesyo/CSS-Bot-Community/actions/workflows/computer-bridge.yml).
2. Extract the ZIP. Keep `agent.mjs`, `file-policy.mjs`, and `config.example.json` together.
3. Install Node.js 20 or newer on Windows.
4. In [SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/), use **Connect computer** to generate a six-digit one-time pairing code. It expires after five minutes.
5. In PowerShell, from the extracted folder, pair the companion:

```powershell
node agent.mjs pair https://cssbc-github-chat.descapan.workers.dev 123456
```

Replace `123456` with the code shown in SOLO.Chat. Pairing creates a private `config.json` with the device token. Never upload or share it.

6. Start the agent:

```powershell
node agent.mjs
```

Keep that terminal open while working. It polls every 2.5 seconds. Stop with Ctrl+C.

## First connection check

After pairing, ask SOLO.Chat to inspect the connected computer and list:

- `C:\Games\Counter-Strike Source v34`
- `C:\SOLO\CSS-v34-Mod`

The local agent reports the computer and folder contents through the authenticated task queue. The companion must be running for tasks to complete.

## Safety model

- Only configured `allowedRoots` can be read or modified.
- The game folder is not a general writable workspace.
- Read operations are bounded; text reads are limited to 256 KB and hashes to 50 MB.
- Text writes are limited to 256 KB, require an exact current SHA-256 (or `NEW` for a confirmed new file), create and verify a backup, show old/new hashes and require local interactive `APPLY`.
- The companion writes only allowlisted text/source extensions. It does not execute the written code.
- The separate .smx installer is limited to one verified SourceMod plugin under `cstrike/addons/sourcemod/plugins/`; it is not used for the native CSSBC GameDLL.
- No arbitrary shell, PowerShell, process launch, screen capture, DLL/EXE/core engine writes or inbound network listener.
- Keep `config.json` private. Rotate/re-pair if its device token is exposed.

## Current verification limits

CI checks syntax and file-policy tests on Windows and Linux and packages the Windows companion. It does not prove that the companion has been paired to a real PC. Live pairing, local folder access and an actual CSS v34 scan must be confirmed by a returned computer-task result.
