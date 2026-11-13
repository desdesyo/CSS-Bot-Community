# CSSBC: Knife / Fists round mutator

## Player-facing control
A dedicated `sm_melee` command opens a separate context menu:
- **Обычный раунд** — clears the queued mutator.
- **Ножи** — queues knife-only rules.
- **Кулаки** — queues fist-only rules.

The selection is pending, not an immediate round restart. It is applied at the next `round_start`: current round is not ended, scores and round counter are untouched. The server announces the queued mode. Selecting while a round is live only queues the next round.

## Server plugin scope
SourceMod can safely queue/apply the mode and force a melee loadout. It cannot provide bespoke first-person/world-model animation sequences or true bare-fist weapon animations in CS:S by itself. The current fist option uses knife as the melee input carrier; custom fist hitboxes/animation require Source SDK game-DLL integration and authored animation sequences.

## Animation direction (SDK)
`CSSBC_Melee` chooses an action per player, seeded by player identity and action sequence:
- CT fists: short jab/cross, compact hook and uppercut; measured guard/recovery.
- T fists: broader hook/jab/uppercut order, less disciplined timing.
- Knife: CT favors controlled thrust/slash; T favors slash/thrust; reverse slash and lunge are mixed in.
The returned variant is a selector for animation graph/sequence binding—not a sequence index guaranteed to exist in stock CS:S models. SDK adapter must map variants to authored/available sequences, synchronize hit frame with damage, and enforce range/recovery. Do not make all bots play one generic leap animation.
