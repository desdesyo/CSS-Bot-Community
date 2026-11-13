# CSS Bot Community

Community tactical AI and support systems for a Counter-Strike: Source v34-compatible game project.

> **Status:** active development. The portable C++ gameplay core is tested on Windows and Linux. A native VSP bridge also builds. The primary target is now the actual CS:S v34 game server DLL: the build pipeline downloads the community v34 game-source tree locally, patches bot update and round-event hooks, and compiles the server DLL with CSSBC systems embedded.

## Main Windows workflow

1. Double-click [`BUILD_CSSBC.bat`](BUILD_CSSBC.bat) to build and test the core, download the pinned CS:S v34 source, apply the CSSBC adapter, and compile `dist/Server.dll`.
2. Double-click [`INSTALL_CSSBC.bat`](INSTALL_CSSBC.bat) to install it into `C:\Games\Counter-Strike Source v34\cstrike\bin`. The installer keeps the original DLL as `server.dll.cssbc-backup`.
3. If the test build causes problems, run [`RESTORE_STOCK_SERVER.bat`](RESTORE_STOCK_SERVER.bat).

The optional Source server-plugin bootstrap can still be built with [`BUILD_CSSBC_VSP.bat`](BUILD_CSSBC_VSP.bat).

## CS:S v34 source integration

The native Win32 CS:S v34 server build is passing in GitHub Actions. The build script pins [`rusherr-c/cssv34-sdk`](https://github.com/rusherr-c/cssv34-sdk) to commit `a410d4f10a1bc914b7789da476f32e9d7c36b75d`, downloads it into the ignored local `external/cssv34-sdk` folder, patches it, and compiles `dist/Server.dll`. It does not require Git; PowerShell downloads the pinned archive. CMake/CTest tests run when available, but the native build itself only requires Visual Studio C++ tools.

### In-game support commands

- `cssbc_support 1`: $1,000 recon sniper.
- `cssbc_support 2`: $3,000 tactical assault unit.
- `cssbc_support 3`: $9,000 squad (2 snipers + 2 assault bots).
- `cssbc_juggernaut`: $16,000, requires 3 dead teammates; spawns a 500 HP, 200-armor heavy bot.
- Support units follow the purchasing player and use the CSSBC bot-brain adapter.
- If the game cannot spawn the requested bots (for example, team capacity is full), only successfully spawned units are charged.

**Current limitation:** support units are native CS:S bots and therefore consume player slots. The Juggernaut's six-plate damage model is in the portable core but is not yet wired into the game's real hitgroup/damage pipeline. The current 200 armor is a basic first integration, not six independently breakable plates.

The first game-code adapter:
- Runs the CSSBC `BotBrain` during `CCSBot::Update`, using each bot's skill/aggression, health, armor, nearby allies/enemies and recognized threat.
- Can influence retreat and cover-seeking behavior; `cssbc_ai_enable 0/1` disables/enables it at runtime.
- Scores kills, headshots, assists, bomb plants/defuses and hostage rescues for round MVP.
- Hooks native bot creation so purchased support bots get their CSSBC role, health, equipment class and follow leader.

The exact v34 server build is validated by [GitHub Actions](.github/workflows/build-cssbc-v34.yml). The workflow compiles but does not publish the upstream-derived game DLL as a public artifact.

**Upstream licensing note:** `rusherr-c/cssv34-sdk` currently has no LICENSE file. The build downloads it locally and does not mirror its source or publish the compiled game DLL. Check upstream rights before redistributing any derivative.

## AI diagnostics and repair

- [AI diagnostic → repair pipeline](docs/AI_DIAGNOSTIC_REPAIR_PIPELINE.md): GitHub Issues → OpenAI diagnosis → issue comments; setup, security boundaries and roadmap.
- Workflow: add the `ai-repair` label to a diagnostic issue (requires Actions secret `OPENAI_API_KEY`).

## Русский язык

Полная концепция русской локализации меню, HUD, системных сообщений и естественных реплик двух команд: [docs/RU_LOCALIZATION.md](docs/RU_LOCALIZATION.md). В коде добавлен словарь и контекстные наборы реплик. Подключение к настоящим игровым панелям Source и клиентскому HUD остаётся отдельной задачей.

## Optional SourceMod prototype

The [SourceMod bridge](sourcemod/README.md) is an optional server-side experiment. It is not the target architecture and is not a replacement for the native v34 game DLL.

## Core systems

- Support tiers: $1k / $3k / $9k squad / $16k Juggernaut.
- Juggernaut purchase rules: $16,000 and at least 3 dead allies.
- Six individually damageable armor plates in the portable rules model.
- Personality traits and probabilistic callout trust.
- Evidence-weighted weak-plate selection.
- Retreat probability, cover reward, per-weapon recoil and MVP scoring.
- Melee mode selection and authoritative trace-result validation.

## Full project scope

- Bot AI, tactics, personality, memory, morale, communication and teamwork.
- Support units, Juggernaut, armor learning, MVP and tactical systems.
- New weapons and optimized weapon/player models.
- Lighting and flashlight improvements.
- Modern minimal HUD and tactical main menu.
- Preserve stock maps and bomb/hostage/round scenarios.
- Low-spec-first asset and effects budget.

The visual decisions are recorded in [docs/UI_VISUAL_SPEC.md](docs/UI_VISUAL_SPEC.md). This is a target specification, not a claim that all assets/UI are already implemented.

## Portable core

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```
