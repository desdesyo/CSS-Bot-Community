# CSS Source v34 Safe Repair Utility

For the Counter-Strike: Source v34 installation, normally at:

`C:\Games\Counter-Strike Source v34`

## Run

1. Download and extract the ZIP artifact from the latest **Build CSS v34 Repair Utility** GitHub Actions run.
2. Double-click `RUN-REPAIR.bat`.
3. Press Enter to accept the default game folder, or paste the actual game folder.
4. The utility checks the engine executable, `cstrike\gameinfo.txt`, and core engine DLLs.
5. It creates `START-CSS-v34-REPAIRED.bat` in the game folder and performs a short launch test.
6. If the game still closes, send back `CSS-v34-repair-report.txt` from the utility folder.

## Safety

- Does not delete, replace, or download game binaries.
- Does not modify the user's existing configs.
- Backs up an existing generated launcher before replacing it.
- Prefers `hl2.exe` in the game root; uses `bin\hl2.exe` only as a fallback.
- Missing or damaged proprietary game binaries cannot safely be reconstructed by this script. The report identifies missing expected files rather than downloading random DLLs.
