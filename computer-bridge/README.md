# SOLO.Chat Local Computer Bridge

Windows companion connecting [SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/) to the local Counter-Strike: Source v34 installation and a separate mod-production workspace. Outbound HTTPS only; no open inbound port and no remote shell.

## One-package setup

1. Download the **SOLO-Local-Mod-Workshop** artifact from the [latest successful Windows CI run](https://github.com/desdesyo/CSS-Bot-Community/actions/workflows/computer-bridge.yml). Extract the ZIP to a normal folder, for example `C:\SOLO\StarterKit`.
2. Open PowerShell in that extracted folder and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\Setup-SOLO-Local.ps1
```

This creates `C:\SOLO\CSS-v34-Mod`, its standard source/assets/UI/build/test folders, a project manifest and an initial SHA-256 inventory. It does not inspect, change or launch the game. If the workspace already exists, the setup script preserves it and refreshes its inventory.

Requires Node.js 20+ on Windows. The setup script checks that Node is available before proceeding.

## Pair the computer

1. Open [SOLO.Chat](https://cssbc-github-chat.descapan.workers.dev/) and choose **Connect computer**. Generate a six-digit pairing code (valid for five minutes).
2. In PowerShell, still in the extracted starter-kit folder, run the command below with the current code:

```powershell
node .\computer-bridge\agent.mjs pair https://cssbc-github-chat.descapan.workers.dev 123456
```

3. Start the companion:

```powershell
node .\computer-bridge\agent.mjs
```

Keep the terminal open while SOLO.Chat works. The agent polls every 2.5 seconds. Stop it with Ctrl+C. The pairing token is saved in `computer-bridge\config.json`; never upload or share that file.

## Configured folders

- Game: `C:\Games\Counter-Strike Source v34` — read-only diagnostics by default. The bridge does not write native game DLLs or executables.
- Workshop: `C:\SOLO\CSS-v34-Mod` — source/config work and project artifacts. Text edits require exact SHA-256, a verified backup and local `APPLY` confirmation.

The roots are separate. Only these two folders are allowlisted by default.

## Safety

- No arbitrary shell/PowerShell commands, process launch, screen capture, inbound listener, DLL/EXE/core engine writes or arbitrary software installation.
- Reads are bounded: text files up to 256 KB; SHA-256 for regular files up to 50 MB.
- Text writes are limited to allowlisted source/config extensions and 256 KB, require an exact precondition hash, verified backup and interactive local `APPLY`.
- The separate .smx installer is restricted to a single verified SourceMod plugin in the exact plugins folder. It is not the native CSSBC GameDLL deployment path.
- Keep `config.json` private. Rotate/re-pair if the device token is exposed.

## Verification

The Windows CI job executes the one-step setup against a temporary workspace, checks that it does not touch a fake game directory, validates Node syntax and file policy on Windows/Linux, and uploads the complete starter kit. CI does not pair a real PC. Live connection is confirmed only after a task result returns from the paired Windows computer.
