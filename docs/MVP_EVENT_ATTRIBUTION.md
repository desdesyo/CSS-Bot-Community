# CSS Bot Community — MVP event attribution (SDK foundation)

This module defines round-level event attribution independently of player life state.
The SDK adapter is responsible for translating real game events into these records.

## Principles
- MVP eligibility is the round roster, never alive players or winning team.
- Attribution is immutable after submission; a late grenade explosion may award its thrower.
- One event has one actor and optional victim/beneficiary.
- Raw event value is clamped to avoid accidental score explosions.
- Round reset clears both scores and event ledger.

## Event adapter contract
For each SDK event, call `MVPScore::Record` with:
- round id (adapter-owned)
- actor Steam/player slot id
- event kind
- event magnitude
- optional target id
- timestamp (game time)

For a grenade thrown before death and detonated after death, actor must remain the thrower.
For bomb defuse/plant, actor is the player who performed the objective.
Do not substitute the killer, last alive player, or winner as actor.

## Example
```cpp
scores.Record(round, thrower, EventKind::GrenadeImpact, damage, victim, gameTime);
scores.Record(round, defuser, EventKind::ObjectiveDefuse, 1.f, -1, gameTime);
auto podium = scores.Rank(roundRoster, 3);
```

The SDK adapter must supply the full roster and stable ids at round end.
