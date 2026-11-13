# Native CS:S v34 integration

CSSBC targets the actual Counter-Strike: Source v34 game server/client code, not only SourceMod or a standalone VSP plugin.

## Pinned game source

The local Windows build downloads `rusherr-c/cssv34-sdk` at commit `a410d4f10a1bc914b7789da476f32e9d7c36b75d` into the ignored `external/cssv34-sdk` folder. It is not copied into this repository. The upstream repository currently has no LICENSE file; the build pipeline therefore does not publish its source or the compiled game DLL as an artifact. Check upstream rights before redistribution.

## Current integration adapter

The native Win32 server DLL build is passing in GitHub Actions. The build script downloads the pinned v34 source locally, patches the game project and compiles the CSSBC core directly into `server.dll`.

### Implemented game hooks

- `CCSBot::Update` → CSSBC `BotBrain` tick, using bot profile skill/aggression, health, armor, nearby allies/enemies and recognized threats.
- Retreat and cover-seeking decisions, gated by `cssbc_ai_enable`.
- `CCSBotManager` round, death, bomb and hostage event handlers → CSSBC MVP scoring.
- Native bot creation hook → CSSBC support role, health, armor and follow leader.

### Native support commands

- `cssbc_support 1`: $1,000 recon sniper.
- `cssbc_support 2`: $3,000 tactical assault unit.
- `cssbc_support 3`: $9,000 squad (two snipers and two assault bots).
- `cssbc_juggernaut`: $16,000, requires three dead teammates; spawns a 500 HP bot with 200 armor.
- Units follow the purchasing player. Failed spawns are not charged; partial squad spawns are charged proportionally.

Support units currently use ordinary CS:S bot player slots. They are not yet separate NPC entities. The Juggernaut's six-plate model is not yet connected to real hitgroup damage; the current 200 armor is a basic first pass.


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
