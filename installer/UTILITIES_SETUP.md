# CSSBC installer and utilities (v34)

## What Setup installs
- CSSBC v34 GameDLL as `cstrike\\bin\\server.dll` (original backed up once to `server.dll.cssbc-backup`)
- VSP, plugin manifest, diagnostics, log uploader, update checker
- Windows logon task `CSSBC-LogUploader`

## Log upload (one-time setup)
1. Create a **private** GitHub repository for match data (for example `CSSBC-Match-Data`). This data repository is not created automatically by this project.
2. Create a fine-grained PAT with **Contents: Read and write** only for that repository: https://github.com/settings/personal-access-tokens/new
3. Run Start Menu → CSSBC — Configure log upload once. Paste the token; it is saved encrypted with Windows DPAPI under your user profile. The uploader then watches `%LOCALAPPDATA%\\CSSBC\\logs` and pushes quiet `.log` files via GitHub REST, no Git or GitHub CLI needed.
4. Place/produce match logs in that folder. The uploader is automatic at logon; it retries files that fail.

Never make the data repository public if logs contain player identifiers or server details. Never commit a PAT to the project.

## Updating
Start Menu → CSSBC — Check updates. It reads the latest GitHub release and downloads `CSSBC-Update.zip`. Close CS:S before updating. Current updater replaces VSP/version only; GameDLL changes require running the new Setup so it can back up/replace `server.dll`.

CI publishes a prerelease with `CSSBC_Setup.exe` and `CSSBC-Update.zip` after both native builds succeed. It is not a silent background updater: the check is user-triggered to avoid replacing game files while the server is running.
