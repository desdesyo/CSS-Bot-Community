# Melee modes — Source SDK implementation

This feature belongs in the Counter-Strike: Source client/server game DLLs. SourceMod is not used for gameplay or UI.

## Player-facing flow
- A dedicated bind (suggested: `cssbc_melee_menu`) opens a VGUI2 menu separate from team selection.
- Menu offers **Normal**, **Knife**, **Fists**. Selection sends a request to server and changes only the queued mode.
- Current round stays live: score, timer, bomb state and round-end conditions are untouched.
- At next natural round start, GameRules consumes the queued mode and applies loadout to players. No map restart, forced round end, or score reset.

## Core
`src/CSSBC_Melee.h/.cpp` owns active/pending mode and move selection. Game DLL adapter calls `OnRoundStart(roundNumber)` from normal round-start path and reads `Active()`.

## Required server game-DLL integration
1. Validated server command `cssbc_melee_mode normal|knife|fists` calls `Queue()`; never mutates current-round inventory.
2. Existing CS GameRules round-start callback calls `OnRoundStart`; apply mode only for the new round.
3. Normal: normal loadout. Knife: strip firearms, give knife. Fists: strip all weapons, equip dedicated fists weapon entity (not knife reskin).
4. Never terminate/restart round or reset score from this path.

## Fists weapon contract
Dedicated server weapon class: attack timers, trace/hull hit detection, authoritative damage, hit/miss recovery, client prediction. Core profiles provide range/damage/windup/recovery; they are not engine traces.

## Animation contract
Move selector returns faction-specific variants. SDK adapter maps them to actual model sequences/activities and synchronizes hit windows to animation events/cycle. CT: compact trained punches and controlled knife thrust/slash. T: rougher wide hooks and improvised cuts. Variant selection uses per-player seed/action sequence, not global shared index.

**Asset caveat:** code cannot create animation clips. Unique motion requires player-model sequences/custom assets and mappings in game DLL. Variant IDs alone do not guarantee unique visuals.

## Build status
Portable controller/tests exist. Valve Source SDK headers/game-DLL project and animation assets are not vendored here; VGUI and weapon/GameRules adapter must compile inside the actual CSS SDK project. This core is not a finished playable mod.
