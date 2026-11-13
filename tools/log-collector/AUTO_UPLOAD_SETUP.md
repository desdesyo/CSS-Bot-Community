# CSSBC automatic log collector

The installer registers a per-user scheduled task **CSSBC-LogCollector**. It starts at Windows sign-in and watches the game root \`console.log\`, \`cstrike\\console.log\`, \`cstrike\\logs\\*.log\`, \`cstrike\\*.log\`, and \`cstrike\\addons\\cssbc\\*.log\`.

A file is collected after 90 seconds without changes. It is copied to a durable local queue under \`%LOCALAPPDATA%\\CSSBC\\LogQueue\`, then uploaded using the GitHub Contents API to \`desdesyo/CSSBC-Match-Data\`. Original logs are never deleted. Failed uploads remain queued and retry automatically. Status is written to \`%LOCALAPPDATA%\\CSSBC\\log-collector-status.txt\`.

## One-time GitHub authorization

The uploader uses the GitHub CLI credential for the signed-in Windows user; no token is embedded in the installer or script. Install GitHub CLI and run \`gh auth login\` once. The account must have write access to \`desdesyo/CSSBC-Match-Data\`. If not authenticated, the collector writes a startup error instead of opening a hidden prompt.

## Game console log

For client console output, add \`-condebug\` to CS:S launch options. Source builds that support it write \`console.log\` in the game directory. Logs already present in \`cstrike\\logs\` and CSSBC's own log folder are detected without it. The collector cannot upload logs the game never creates.

## Troubleshooting

Task: Task Scheduler → Task Scheduler Library → \`CSSBC-LogCollector\`.
Status: \`%LOCALAPPDATA%\\CSSBC\\log-collector-status.txt\`.
Unsent logs: \`%LOCALAPPDATA%\\CSSBC\\LogQueue\`.
Test authorization: \`gh auth status\`.
