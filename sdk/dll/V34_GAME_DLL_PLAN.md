# CSS Bot Community — v34 GameDLL integration plan

The VSP prototype cannot allocate a CS:S player entity by itself: fake-client creation invokes the game's player lifecycle, and player entity allocation is a GameDLL responsibility. The Source 2013 NextBot helper uses a private GameDLL override around CreateFakeClientEx; it is not binary-compatible with v34.

## Next implementation milestone
1. Obtain the matching CS:S v34 / Source 2007 GameDLL source or SDK fork (do not use Source SDK 2013 binaries).
2. Build a 32-bit cstrike GameDLL from that exact branch.
3. Add CSSBC player allocation/spawn hook to the GameDLL side.
4. Bridge GameDLL player callbacks to the portable CSSBC core.
5. Add bot command/config to create one player bot.
6. Installer detects and backs up original GameDLL; install must be opt-in and reversible.
7. Only then build Setup.exe and test on the user's v34.

## Current deliverables
- Native VSP bootstrap source and VS project (logging only).
- Installer script source (requires DLL payload).
- Portable AI/gameplay core.

## Do not claim
No player bot is spawned yet. The VSP is not a playable mod, and no setup executable is built.
