# Melee Game-DLL integration map

This adapter facade is the final portable boundary before engine-specific CS:S code:
- `CSSBC_MeleeGameDllAdapter::OnModeCommand`: validated server command queues mode. Do not strip weapons now.
- `OnRoundStart`: call from the ordinary natural round-start callback. Read `CurrentMode()` and apply loadouts for the new round.
- `OnAttackInput`: called by dedicated fists/knife weapon's primary attack. If `started`, schedule impact at returned action windup and play mapped attack animation.
- `OnAttackImpact`: at impact frame, server performs a hull trace and passes its target/distance/front/friendly data. Apply returned damage through the engine's damage API, with attacker attribution.
- `OnPlayerRemoved`: clear per-entity combat state.

## Actual CS:S glue still required
In the game source tree, implement:
1. Server command registration/permission and parsing.
2. GameRules round-start hook and mode loadout application.
3. Dedicated fists weapon class (primary attack, timers, network/prediction, animation).
4. Knife mode weapon restrictions.
5. Client VGUI panel registration + key binding to open `CSSBCMeleeModeMenu`.
6. Animation sequence/activity mappings and assets.

The portable facade cannot call engine APIs by itself. This repository does not currently include CS:S game source or SDK headers; consequently these integration points cannot be compiled or verified as playable here.
