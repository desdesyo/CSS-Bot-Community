# CSSBC SDK Server Adapter

This folder is the seam for integrating the portable CSSBC systems into a Source SDK game DLL.

- `CSSBC_SDKBridge.h` is SDK-facing contract; engine objects are converted to POD snapshots before entering portable logic.
- Add this directory and `../../src` to the game DLL include paths.
- Implement the methods in the game DLL where `CCSBot`, `CBasePlayer`, damage, bomb and round hooks are available.
- Keep Source engine types out of `src/` so core CI remains portable.

**Not a game DLL yet:** adapter methods intentionally have no fake implementation. To compile and run them, the matching CS:S/Source SDK game source tree must be supplied and built. This repo currently does not contain Valve's engine/game source or binary dependencies.

- `CSSBC_MeleeModeHooks.h` defines the game-DLL integration contract for queued mode selection, next-round application and dedicated fists/knife/normal loadouts. Implement it against the actual CS:S GameRules/player classes; it deliberately does not fake engine behavior.
- `src/CSSBC_MeleeCombat.*` is portable attack timing/impact logic. The server DLL must provide a hull trace at impact time and apply returned damage authoritatively.

- `CSSBC_MeleeSdkRuntime.*` now manages per-entity melee cooldown/attack state and delegates impact decisions to the portable combat core. Include it in the server game-DLL project; at attack impact, call `Impact()` with the result of a server hull trace and apply its damage through CS:S damage APIs. Queue modes with `Queue()` and call `OnNaturalRoundStart()` only from the normal round-start hook.
