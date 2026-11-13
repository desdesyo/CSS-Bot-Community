# CSS v34 Repair Utility

Windows PowerShell 5.1 GUI utility for diagnosing and safely repairing a CSS v34 installation.

## Run
1. Download `Repair-CSS-v34.ps1` from this folder.
2. Run with PowerShell, or execute:
   `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Repair-CSS-v34.ps1`
3. Select the game root (the folder containing `cstrike`).
4. Click **Проверить** first, then **Исправить безопасно** if a repair is indicated.

## Behavior
- Checks `cstrike\bin\server.dll` for valid 32-bit PE format.
- Never overwrites a valid x86 `server.dll`.
- If it is invalid, asks you to select a known-clean x86 file, validates it, backs up the current file, replaces it, and validates the result. On failed post-copy validation, restores the backup.
- Moves `cstrike\bin\CSSBC_VSP.dll` to `cstrike\addons\cssbc\bin\CSSBC_VSP.dll` only if the destination is absent and the source is x86.
- Does not download or invent DLLs.
- Leaves `metamod.vdf`, `engine.dll`, `client.dll`, and all other game binaries untouched.
- Writes reports to `%LOCALAPPDATA%\CSSBotCommunity\Repair`.

## Important
The supplied crash reports show access violations inside `engine.dll` (`C0000005`, including offset `0x1B824A`). That is not proof that `engine.dll` is corrupt. This utility intentionally does not patch or replace it: the repository does not contain a verified clean replacement for the game's engine binary.
