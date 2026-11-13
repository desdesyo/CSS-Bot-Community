# Source SDK integration plan (actual game mod)

CSSBC is intended to be a **native Source SDK mod**, not a SourceMod product. The SourceMod bridge is an optional prototype and is not part of the target architecture.

## Compile-time target

- AlliedModders `hl2sdk` `css` branch is currently used for the native server-plugin interface headers.
- The project builds a Win32 `IServerPluginCallbacks` DLL against those headers.
- The portable CSSBC C++ sources are compiled into that DLL.
- This is a server-plugin integration point, not a complete client/server game-code fork.

The selected SDK branch is a compile-time interface source. It does not prove binary compatibility with every legacy/non-Steam CS:S v34 executable. That must be verified in the exact target game.

## Current native milestone

The VSP bootstrap:
- Implements the server-plugin callbacks and obtains `IVEngineServer`.
- Registers with `IGameEventManager2`.
- Records MVP points for kills, headshots, assists, bomb plants, bomb defuses and hostage rescues.
- Resets scoring at round start and logs the top three MVP user IDs at round end.
- Embeds the engine-independent gameplay core.

The Windows build is automated by `BUILD_CSSBC.bat` and GitHub Actions. See [WINDOWS_BUILD.md](WINDOWS_BUILD.md).

## Remaining integration work

1. Verify the VSP loads in the exact CS:S v34 client/server build and confirm the interface versions.
2. Adapt the core to actual bot entities: perception, navigation, decision ticks, team communication and round state.
3. Implement support NPC entities and spawning for the $9k squad and $16k Juggernaut.
4. Connect hit groups to six armor plates, damage, break events and shared evidence.
5. Connect economy and purchases to the game's authoritative money/team/dead-player state.
6. Implement client HUD and VGUI panels; load Russian localization resources.
7. Add models, materials, animations, soundscapes/voice lines and packaging.
8. Test the full round loop, performance and low-spec behavior.

## Important limitation

Original CS:S v34 game code is not included in the official Source SDK 2013 tree or this repository. A compatible community CS:S game-code fork is still required for deep bot AI, NPC entities, custom player logic and a native client HUD. The current VSP does not claim those features are implemented.
