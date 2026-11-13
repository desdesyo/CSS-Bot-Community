# Native CS:S v34 integration

CSSBC targets the actual Counter-Strike: Source v34 game server/client code, not only SourceMod or a standalone VSP plugin.

## Pinned game source

The local Windows build downloads `rusherr-c/cssv34-sdk` at commit `a410d4f10a1bc914b7789da476f32e9d7c36b75d` into the ignored `external/cssv34-sdk` folder. It is not copied into this repository. The upstream repository currently has no LICENSE file; the build pipeline therefore does not publish its source or the compiled game DLL as an artifact. Check upstream rights before redistribution.

## Current integration adapter

The patcher adds `CSSBC_GameAdapter.cpp/.h` to the local v34 server source and connects:
- `CCSBot::Update` → CSSBC `BotBrain` tick, with per-bot personality derived from profile skill/aggression.
- Retreat and cover-seeking decisions, gated by `cssbc_ai_enable`.
- `CCSBotManager` round, death, bomb and hostage event handlers → CSSBC MVP scoring.
- Round-start reset and top-three round MVP logging.

The portable C++ core is compiled into the game server DLL as source files with C++17 and no PCH. The same core is built and tested separately by CMake.

## Build and install

- `BUILD_CSSBC.bat`: download pinned v34 source, patch locally, run portable tests, compile `dist/Server.dll`.
- `INSTALL_CSSBC.bat`: copy to the configured CS:S v34 game folder and back up the original DLL.
- `RESTORE_STOCK_SERVER.bat`: restore the backup.
- `BUILD_CSSBC_VSP.bat`: optional standalone VSP diagnostic bridge.

See [WINDOWS_BUILD.md](WINDOWS_BUILD.md).

## Remaining integration work

1. Verify the new server DLL loads in the user's exact non-Steam CS:S v34 build.
2. Connect the rest of the CSSBC tactical model to bot perception, navigation, team memory and squad communication.
3. Implement support NPC spawning for the $9k squad and $16k Juggernaut.
4. Connect six armor plates to real hit regions, damage, break events and shared evidence.
5. Bind support purchases to authoritative game money and team/dead-player state.
6. Implement client HUD and VGUI panels; load Russian localization resources.
7. Add models, materials, animations, soundscapes/voice lines and packaging.
8. Test full round behavior, performance and low-spec operation.

The first adapter is a foundation, not a claim that every planned behavior is finished.
