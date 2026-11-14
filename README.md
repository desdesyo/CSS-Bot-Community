# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source-compatible Source engine project.

> **Status:** early development. The repository contains an engine-independent C++ gameplay core. It is not yet a replacement CS:S game DLL or a finished bot-AI mod.

## Русская локализация

Концепция локализации меню, HUD, системных сообщений и реплик двух команд описана в [docs/RU_LOCALIZATION.md](docs/RU_LOCALIZATION.md). Словарь и контекстные наборы реплик находятся в CSSBC_Localization.h/.cpp. Подключение игровых панелей Source, стандартных надписей движка и озвучки требует отдельного адаптера к CS:S.

## Core systems

- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut (NPC support tiers are design targets; squad spawning is not implemented).
- Juggernaut purchase and health configuration.
- Six individually damageable armor plates (core/design stage; not wired to CS:S player entities).
- Tactical decision brain (bomb retake, trade, escort, retreat, objective push/rotate) with squad role orders.
- Personality traits and probabilistic callout trust.
- Evidence-weighted weak-plate selection (no omniscient knowledge).
- Retreat probability, cover reward and MVP event scoring.

## Project scope

CSSBC is intended as a broad gameplay and presentation overhaul:

- Bot AI, tactics, personality, memory, morale, communication and teamwork.
- Support units, Juggernaut, armor learning, MVP and tactical systems.
- New weapons and optimized weapon/player models.
- Lighting and flashlight improvements.
- Modern minimal HUD (health, armor, ammo, team and CSSBC status).
- Cinematic tactical main menu and in-game settings UI.
- Preserve stock maps and core bomb/hostage/round scenarios.
- Low-spec-first asset and effects budget; classic compact crosshair.

The visual decisions are recorded in [docs/UI_VISUAL_SPEC.md](docs/UI_VISUAL_SPEC.md). This is a target specification, not a claim that these assets/UI are already implemented.

## Local CSS Bridge

The Windows-side read-only scanner is implemented under [bridge/](bridge/). It polls GitHub Issues for explicit scan tasks, inventories only the configured CS:S v34 directory, calculates bounded SHA-256 hashes, and posts metadata reports back to the originating issue. It does not execute task text and cannot modify the game folder. See [bridge/README.md](bridge/README.md) and [docs/LOCAL_CHAT_BRIDGE_SPEC.md](docs/LOCAL_CHAT_BRIDGE_SPEC.md).

The bridge currently has an initial implementation and a GitHub Actions Windows x64 build workflow. A successful CI build is not a real-machine scan: field verification against the user's installation remains outstanding.

## Build and test

The portable C++ core can be built with CMake:

    cmake -S . -B build
    cmake --build build
    ctest --test-dir build --output-on-failure

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for engine integration requirements.
