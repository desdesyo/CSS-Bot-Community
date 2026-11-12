# Architecture / engine boundary

## Portable gameplay core
Rules and decisions only: support eligibility, six armor plates, probabilistic callout trust, evidence-weighted plate targeting, retreat probability, cover reward and MVP events. No Source engine headers are required.

## Required game adapter (not yet implemented)
- Bind purchase to team economy/dead count; deduct money exactly once.
- Spawn $9k squad (2 snipers + 2 assault roles) and $16k autonomous Juggernaut.
- Route hit regions to armor plates and emit crack/break callouts.
- Feed only perceived/shared evidence to bot Mind; no omniscient targeting.
- Record bomb/rescue/cover actions and MVP, including valid actions before death.
- Integrate navigation, round state, HUD and server config.

Original CS:S v34 game code is not part of official Source SDK 2013. A compatible community CS:S SDK fork is needed for in-game DLL integration.