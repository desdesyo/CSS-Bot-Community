# SOLO:WG report archive

All tester reports are stored in three command-addressable categories.

- `logs/logs/` — command **Логи**: gameplay diagnostics, input/control sessions, performance samples and event traces.
- `logs/bugs/` — command **баг**: player-marked defects, JSON scene context and associated screenshots.
- `logs/30/` — command **30**: full top-down map image, 30-tile bot-area atlas and visual-audit JSON.

The command names are intentional: when a developer asks for one of these commands, search only the matching directory first. Do not substitute reports from another category. Each report's JSON image paths point to the same category directory.

Legacy files were reorganized without dropping report payloads. The previous `logs/controls/`, `logs/gameplay/` and `logs/issues/` folders are retired.
