CSS v34 Game Recovery

This utility is separate from CSS Bot Community. It downloads a v34 build 4044 installer from SOURCE-V34.RU, preserves the current game folder by renaming it, runs the installer, verifies critical files and rolls back on failure.

Run Run-Game-Recovery.cmd on Windows PowerShell 5.1. Default target: C:\Games\Counter-Strike Source v34.

The source page identifies its package as CSS v34, version 1.0.0.34, build 4044, size 1.42 GB: https://source-v34.ru/ . The page does not publish a SHA-256 checksum. The utility stores a local first-download SHA-256 pin (TOFU); this detects later changes but is NOT independent authentication of the first download. The source page describes the package as a standard build but also says it includes Russian menu, bots and server-browser changes. It is not guaranteed to be byte-identical to the user's existing distribution.

The utility does not install CSS Bot Community. The original game folder remains as a timestamped .cssbc-backup-* directory. On validation failure, it restores that directory.
