# CSS Bot Community

Community tactical AI and gameplay systems for Counter-Strike: Source v34.

> **Current milestone:** native CS:S v34 GameDLL integration is wired into the `sdk-foundation` branch. The GitHub Actions workflow builds the Win32 GameDLL from a pinned v34 source tree. The first in-game behavior currently targets existing CS:S bots (retreat / seek cover); custom NPC spawning and the full feature set are not complete.

## Start here — CS:S v34

**[Open the step-by-step build and first-test instructions](docs/START_HERE_V34.md).**

The working integration branch is [`sdk-foundation`](https://github.com/desdesyo/CSS-Bot-Community/tree/sdk-foundation). The build runs on GitHub Actions with Visual Studio 2022 x86; no local Python setup is required.

## SDK / GameDLL integration

- Pinned game source: `sl1mshady-cs/cssv34-client` at commit `55f860bf42a537ac55aaef684f6fa0effee714a8`.
- AlliedModders CS:S SDK headers are pinned in the build workflow at commit `47f0ea659bc70718f9c41a7830b6ad943a68ba09`.
- `tools/integrate-v34-gamedll.ps1` injects the CSSBC tactical adapter into `CCSBot::Update`.
- This is a GameDLL build path, not a SourceMod-based mod. The optional SourceMod experiment is separate and not required.

## Core systems

- Support tiers and Juggernaut eligibility/economy rules.
- Six armor plate states and evidence-weighted weak-plate selection.
- Bot personality, team memory, tactical decisions and callout trust.
- MVP event scoring, cover reward and retreat logic.

## Project scope

CSSBC is intended as a broad gameplay and presentation overhaul:
- Bot AI, tactics, personality, memory, morale, communication and teamwork.
- Support units, Juggernaut, armor learning, MVP and tactical systems.
- New weapons, player models, lighting and flashlight improvements.
- Modern minimal HUD and in-game settings UI.
- Preserve stock maps and core bomb/hostage/round scenarios.
- Low-spec-first asset and effects budget.

These are project targets, not claims that every feature is implemented. The first native test and its current limits are documented in [docs/START_HERE_V34.md](docs/START_HERE_V34.md) and [docs/FIRST_V34_PROTOTYPE_TEST.md](docs/FIRST_V34_PROTOTYPE_TEST.md).

## Portable core tests

```sh
cmake -S . -B build
cmake --build build
ctest --test-dir build --output-on-failure
```
