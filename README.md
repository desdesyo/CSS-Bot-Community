# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source-compatible Source engine project.

> **Status:** early development. The repository contains an engine-independent gameplay core and an experimental SourceMod bridge. It is not yet a replacement CS:S game DLL or a finished bot-AI mod.

## Русская локализация

Концепция локализации меню, HUD, системных сообщений и реплик двух команд описана в [docs/RU_LOCALIZATION.md](docs/RU_LOCALIZATION.md). Словарь и контекстные наборы реплик находятся в `CSSBC_Localization.h/.cpp`. Подключение игровых панелей Source, стандартных надписей движка и озвучки требует отдельного адаптера к CS:S.

## Серверный прототип (SourceMod)

В каталоге [sourcemod](sourcemod/README.md) находится устанавливаемый bridge 0.1.1:

- `sm_cssbc` — статус плагина.
- `sm_juggernaut` — покупка Джаггернаута за $16 000 при наличии минимум трёх погибших союзников.
- `sm_support` — честно сообщает, что NPC-отряд ещё не реализован; деньги не списываются.

Это серверный прототип, а не новая система NPC или замена штатного AI. Сборка SourceMod-плагина проверяется отдельным GitHub Actions workflow.

## Core systems

- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut (NPC support tiers are design targets; squad spawning is not implemented).
- Juggernaut purchase and health configuration.
- Six individually damageable armor plates (core/design stage; not wired to CS:S player entities).
- Tactical decision brain (bomb retake, trade, escort, retreat, objective push/rotate) with squad role orders.\n- Personality traits and probabilistic callout trust.
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

## Build and test

The portable C++ core can be built with CMake:

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for engine integration requirements and [sourcemod/README.md](sourcemod/README.md) for the server bridge installation.
