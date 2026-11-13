# Source SDK integration plan (actual game mod)

CSSBC is intended to be a **Source SDK mod**, not a SourceMod product. SourceMod bridge is optional and is not part of the SDK build.

## Correct target

- Source SDK 2013 Multiplayer-compatible codebase, with a CS:S-compatible game branch/fork.
- Build game client and server binaries against that SDK.
- Integrate CSSBC C++ systems into server bot/player logic and client HUD/menu.
- Ship game content (models/materials/sounds) separately in the mod's `materials/`, `models/`, `sound/` trees.

## Why this repository cannot produce a playable mod yet

The repository currently contains engine-independent C++ systems and tests only. It has no SDK checkout, engine headers/libraries, game client/server projects, bot implementation source, or content assets. A DLL cannot be honestly built from this repository alone.

## Integration sequence

1. Acquire the exact compatible SDK/game source tree and establish its build (client + server).
2. Port CSSBC core into server game code; adapt bot decision, perception, navigation and round events.
3. Implement support NPC entities, armor plate entities/damage, Juggernaut, and economy in server code.
4. Implement HUD and VGUI panels in client code; use localization resource files for all strings.
5. Add models, materials, animations, soundscapes/voice lines and packaging.
6. Build, run local dedicated server/client, verify round loop, bot behavior, HUD and performance.

## Current repo state

The branch `sdk-foundation` records this SDK-first architecture. It does not claim SDK integration or a playable binary before the SDK source and assets are present. The `sourcemod/` folder is a separate optional prototype and must not be mistaken for the target mod.
