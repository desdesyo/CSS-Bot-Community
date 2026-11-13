# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source-compatible Source engine project.

> **Status:** early development. A Win32 native server-plugin bootstrap now builds against the AlliedModders CS:S SDK headers, embeds the portable C++ gameplay core, and records MVP events from the Source game-event manager. This is **not yet the complete playable mod**: bot decision hooks, support NPC spawning, armor hit-region integration, client HUD/VGUI and custom assets remain unfinished.

## Build on Windows

Install Visual Studio 2022 with **Desktop development with C++** and CMake tools, then double-click [`BUILD_CSSBC.bat`](BUILD_CSSBC.bat). The script builds the portable core, runs tests, builds the native Win32 DLL, and places the result in `dist/CSSBC_VSP.dll`. It uses `C:\SDK\hl2sdk-css` if present; otherwise it downloads the AlliedModders `hl2sdk` `css` branch itself. Git is not required.

The same process runs in [GitHub Actions](.github/workflows/build-vsp.yml); successful builds publish a `CSSBC-VSP-Win32` artifact. The SDK branch provides compile-time interfaces; runtime compatibility with the user's exact CS:S v34 build still needs an in-game test.

## AI diagnostics and repair

- [AI diagnostic → repair pipeline](docs/AI_DIAGNOSTIC_REPAIR_PIPELINE.md): GitHub Issues → OpenAI diagnosis → issue comments; setup, security boundaries and roadmap.
- Workflow: add the `ai-repair` label to a diagnostic issue (requires Actions secret `OPENAI_API_KEY`).

## Русский язык

Полная концепция русской локализации меню, HUD, системных сообщений и естественных реплик двух команд: [docs/RU_LOCALIZATION.md](docs/RU_LOCALIZATION.md). В коде добавлен словарь и контекстные наборы реплик (`CSSBC_Localization.h/.cpp`). Реальные игровые панели Source, стандартные надписи движка и озвучка пока требуют клиентского адаптера и ресурсов.

## Серверный запуск (SourceMod)

Отдельный необязательный bridge: [инструкция](sourcemod/README.md), исходник [cssbc.sp](sourcemod/scripting/cssbc.sp). Он подключает серверные команды, покупку поддержки и базовый режим Джаггернаута. Это не целевая архитектура и не замена native VSP.

## Native SDK integration

Архитектура SDK-first: [план интеграции](docs/SDK_INTEGRATION.md). Текущий native VSP:
- Loads as an `IServerPluginCallbacks` server plugin.
- Connects to `IGameEventManager2`.
- Scores kills, headshots, assists, bomb plants/defuses and hostage rescues.
- Emits the top three round MVP user IDs to the server log.
- Embeds the engine-independent C++ core.

It does **not** yet replace stock bot AI or spawn support NPCs.

## Core systems

- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut.
- Juggernaut purchase rules: $16,000 and at least 3 dead allies.
- Six individually damageable armor plates in the portable rules model.
- Personality traits and probabilistic callout trust.
- Evidence-weighted weak-plate selection.
- Retreat probability, cover reward, per-weapon recoil and MVP scoring.
- Melee mode selection and authoritative trace-result validation.

## Project scope

CSSBC is intended as a broad gameplay and presentation overhaul:
- Bot AI, tactics, personality, memory, morale, communication and teamwork.
- Support units, Juggernaut, armor learning, MVP and tactical systems.
- New weapons and optimized weapon/player models.
- Lighting and flashlight improvements.
- Modern minimal HUD and tactical main menu.
- Preserve stock maps and bomb/hostage/round scenarios.
- Low-spec-first asset and effects budget; compact crosshair.

The visual decisions are recorded in [docs/UI_VISUAL_SPEC.md](docs/UI_VISUAL_SPEC.md). This is a target specification, not a claim that all assets/UI are already implemented.

## Portable core: build and test

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the remaining engine integration requirements.
