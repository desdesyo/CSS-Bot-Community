# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source-compatible Source engine project.

> **Status:** early development. This repository currently contains an engine-independent gameplay core, not a playable CS:S DLL. Game integration requires a compatible community CS:S SDK/fork.

## Русский язык\n\nПолная концепция русской локализации меню, HUD, системных сообщений и естественных реплик двух команд: [docs/RU_LOCALIZATION.md](docs/RU_LOCALIZATION.md). В коде добавлен словарь и контекстные наборы реплик (`CSSBC_Localization.h/.cpp`). Важно: игровые панели Source, стандартные надписи движка и озвучка пока требуют подключения адаптера к CS:S SDK; текущий репозиторий ещё не является готовой DLL-модификацией.\n\n## Серверный запуск (SourceMod)\n\nДобавлен устанавливаемый bridge: [инструкция](sourcemod/README.md), исходник [cssbc.sp](sourcemod/scripting/cssbc.sp). Он подключает русские серверные команды, покупку поддержки и базовый Джаггернаут к CS:S. NPC-отряд, бронепластины, полноценный HUD и замена AI пока не реализованы.\n\n## SDK integration (target)\n\nАрхитектура SDK-first: [план интеграции](docs/SDK_INTEGRATION.md). SourceMod-прототип — отдельный необязательный эксперимент и не является целевой сборкой. Для настоящего игрового бинарника нужен совместимый CS:S SDK/game source и его client/server проекты; без них собрать DLL невозможно.\n\n## Core systems
- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut.
- Juggernaut purchase: $16,000 and at least 3 dead allies.
- Six individually damageable armor plates.
- Personality traits and probabilistic callout trust.
- Evidence-weighted weak-plate selection (no omniscient knowledge).
- Retreat probability, cover reward and MVP event scoring.

## Project scope
CSSBC is intended as a broad gameplay and presentation overhaul, not only a Juggernaut add-on:
- Bot AI, tactics, personality, memory, morale, communication and teamwork.
- Support units, Juggernaut, armor learning, MVP and tactical systems.
- New weapons and high-quality optimized weapon/player models.
- Lighting and flashlight improvements.
- Modern minimal HUD (health, armor, ammo, team and CSSBC status).
- Cinematic tactical main menu and in-game settings UI.
- Preserve stock maps and core bomb/hostage/round scenarios.
- Low-spec-first asset and effects budget; classic compact crosshair (never a giant ring).

The visual decisions are recorded in [docs/UI_VISUAL_SPEC.md](docs/UI_VISUAL_SPEC.md). This is a target specification, not a claim that these assets/UI are already implemented.

## Build and test
```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```
See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for engine integration requirements.
