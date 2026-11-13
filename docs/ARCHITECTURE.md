# Architecture / engine boundary

## Portable gameplay core

Rules and decisions only: support eligibility, six armor plates, probabilistic callout trust, evidence-weighted plate targeting, retreat probability, cover reward, MVP events, economy, melee and recoil models. No Source engine headers are required.

## Native server-plugin bridge

The Win32 VSP bootstrap implements `IServerPluginCallbacks`, obtains `IVEngineServer`, and subscribes to `IGameEventManager2`. It currently maps:
- `player_death` → kill, headshot and assist MVP points.
- `bomb_planted` / `bomb_defused` → objective MVP points.
- `hostage_rescued` → rescue MVP points.
- `round_start` / `round_end` → round scoring lifecycle and top-three log output.

The DLL embeds the portable core. This event bridge does not yet drive bot AI or spawn gameplay entities.

## Required game adapter (in progress)

- Bind purchases to team economy/dead count; deduct money exactly once.
- Spawn $9k squad (2 snipers + 2 assault roles) and $16k autonomous Juggernaut.
- Route hit regions to armor plates and emit crack/break callouts.
- Feed only perceived/shared evidence to bot Mind; no omniscient targeting.
- Record valid cover, rescue and objective actions, including actions before death.
- Integrate bot navigation, round state, HUD, VGUI and server config.

Original CS:S v34 game code is not part of the official Source SDK 2013 tree. A compatible community CS:S game-code fork is still required for deep bot/player integration and client UI.
