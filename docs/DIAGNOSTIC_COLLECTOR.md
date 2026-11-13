# CSSBC diagnostic collector — first prototype

## Included in prototype installer
The installer must place `tools/diagnostics/Collect-CSSBC.ps1` (or its packaged copy) in
`cstrike/addons/CSSBotCommunity/diagnostics/` and create a Start Menu shortcut named
**CSSBC — Collect diagnostics**. This script is Windows PowerShell 5.1 compatible.

## Local collection (works offline)
Open PowerShell and run:
```powershell
powershell -ExecutionPolicy Bypass -File ".\Collect-CSSBC.ps1" -GameDir "C:\Games\Counter-Strike Source v34" -OpenFolder
```
Output: `%LOCALAPPDATA%\CSSBotCommunity\Diagnostics\CSSBC_Diagnostic_<timestamp>.zip`.
The collector copies a few latest game logs if present, CSSBC log, plugin_print (if saved),
and writes `summary.json`. Missing files are normal for a client-only run.

## GitHub upload
**Never embed a Personal Access Token (PAT) in a DLL, installer, repository, or config committed to Git.**
Use a fine-grained PAT for this repository with **Contents: Read and write** only.
Keep it in the current PowerShell session:
```powershell
$env:CSSBC_GITHUB_TOKEN = Read-Host "GitHub PAT"
$env:CSSBC_GITHUB_REPO = "desdesyo/CSS-Bot-Community"
.\Collect-CSSBC.ps1 -GameDir "C:\Games\Counter-Strike Source v34" -Upload
Remove-Item Env:CSSBC_GITHUB_TOKEN
```
The archive is uploaded as `diagnostics/inbox/<timestamp>.zip` via GitHub Contents API.
Each upload creates a commit. The repository must be private if logs may contain personal
information. Inspect the ZIP before upload; redact chat/user data if any third-party log
contains it. Do not grant workflow, administration, or delete permissions.

## First test checklist
1. Launch CS:S v34 and execute `plugin_print` in console; save console output to
   `cstrike/plugin_print.txt` if needed.
2. Run a short test; quit game cleanly.
3. Run collector locally first; inspect ZIP and `summary.json`.
4. Upload only after confirming contents.
5. Attach commit link / archive path to the test note.

## Limitations (v0.1)
- Collection is best-effort; it cannot read live in-memory console output automatically.
- Crash dumps are not copied (can be huge and may contain sensitive memory).
- Upload uses a user-supplied token; no silent credential storage.
- GitHub Issues are not auto-created yet; upload is the first safe telemetry milestone.
