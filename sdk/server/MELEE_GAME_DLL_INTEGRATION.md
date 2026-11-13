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


## Integration failure-prevention checklist (mandatory gate)

Treat this list as a release gate, not optional notes. Engine glue must not be merged until every applicable item is checked.

### Build / ABI / project wiring
- [ ] Confirm exact CS:S branch/toolchain (CS:S game source, not SDK 2013 sample game); record compiler, Windows SDK, configuration and architecture.
- [ ] Add each new .cpp to actual server project/VPC and regenerate project files; headers alone do not link code.
- [ ] Keep engine-facing code out of portable core. Do not mix STL containers across engine ABI boundaries or export STL types from DLL interfaces.
- [ ] Match calling conventions, virtual signatures, include order, macros and compiler flags to target tree. Never assume modern C++ features are available.
- [ ] Check duplicate symbols, stale generated project files, PCH conflicts, include path case and Debug/Release differences.
- [ ] Build client and server DLL separately; verify exports and load exact binaries from intended game directory.

### Commands / trust / parsing
- [ ] Register cssbc_melee_mode once; reject unknown values, extra arguments, malformed input and non-player command sources.
- [ ] Resolve caller from command source; never trust client-supplied player index. Validate connected/alive/eligible state and team.
- [ ] Rate-limit requests; clients cannot choose damage, range, target, faction or timing.
- [ ] Queue only validated enum. Apply at defined round boundary; never mutate weapons mid-round or during an attack.

### Round lifecycle / loadout invariants
- [ ] Define late join, reconnect, team switch, death/respawn, restart, map change, warmup, freeze time, halftime and shutdown behavior.
- [ ] Mode is authoritative server state. On spawn reconcile inventory idempotently; repeated spawn hooks must not duplicate weapons.
- [ ] Normal mode restores stock knife/inventory; Knife/Fists remove prohibited weapons. Test dropped weapons, pickups, buy menu, grenades, C4, defuse kit, hostage tools and spectators.
- [ ] Preserve objective items and team equipment according to explicit rules; do not accidentally overwrite armor/grenades/ammo.
- [ ] Queue persistence/clearing across restart/map change is explicit; no stale queued mode.
- [ ] Round callback runs once after teams/spawns valid and before attacks; guard duplicate callbacks.

### Combat / trace / damage correctness
- [ ] State machine: Idle → Windup → Impact → Recovery → Idle. Cancel on death, disconnect, weapon switch, round end or invalid owner.
- [ ] Use server timers/time, not client animation completion. Attack generation token invalidates stale delayed impacts.
- [ ] Exactly one impact per attack token; prevent duplicate damage and cooldown bypass.
- [ ] Server trace with bounded hull; validate target, range, facing, LOS, team and alive state again at impact.
- [ ] Never trust client traces. Reject world/self/spectator/teammate (unless policy says otherwise), dead or invalid entities.
- [ ] Revalidate attacker/victim immediately before damage; correct attacker/inflictor/weapon attribution; intentionally respect armor/friendly-fire rules.
- [ ] Define hitboxes, range, vertical tolerance, knockback and damage multipliers; add diagnostics before tuning.
- [ ] Handle entity removal/re-entrancy safely; don't damage while iterating mutable entity lists.

### Client / VGUI / network / animation
- [ ] VGUI panel lifecycle follows scheme/resource lifecycle; no dangling pointers after map change/disconnect.
- [ ] Register menu key/bind without conflict with scoreboard/buy/chat/weapon slots; provide console fallback.
- [ ] Client sends request only; server confirms queued/applied state. Show pending vs active distinctly.
- [ ] Replicate state with correct send tables/ownership; initialize late joiners and reset map changes; avoid client/server layout mismatch.
- [ ] Missing animation/model falls back safely. Animation is cosmetic; server combat state authoritative.
- [ ] Validate model sequence names at runtime; never hardcode sequence indices across models. Keep assets/licensing separate.

### Compatibility / operational safety
- [ ] Test dedicated/listen servers, bots, humans, lag, reconnect and player-count edges.
- [ ] SourceMod is optional compatibility only; core must not depend on it.
- [ ] Feature behind server convar/kill switch, default off until smoke tests pass; fallback to stock knife/inventory.
- [ ] Structured logs for request/queue/apply/attack/cancel/impact/rejection/damage; use userid, not entity index alone.
- [ ] Cancel/release every timer/handle on entity removal and shutdown; avoid per-frame polling when events suffice.
- [ ] Verify stock modes unaffected and assets have proper license.

### Required tests before calling it playable
1. Invalid values and non-player command source rejected.
2. Mid-round request stays pending; next round applies exactly once.
3. Rapid requests resolve deterministically (recommended last-write-wins).
4. Death/disconnect during windup causes zero delayed damage.
5. Attacker/victim disconnect or team change before impact causes zero damage.
6. One swing damages at most one target once; wall blocks; teammate rejected.
7. Respawn/repeated spawn hook never duplicates weapons; Normal restores stock inventory.
8. Late join, reconnect, halftime, map change and restart have correct state.
9. Menu close/cancel and missing assets don't crash; console fallback works.
10. Dedicated server with feature off/on; stock gameplay unchanged when off.
11. Clean build from fresh checkout, both client/server targets.
12. Debug and Release tests; record actual results—never mark unexecuted tests passed.

### Integration protocol
For every engine hook document exact callback/signature, call order, owner/thread, lifetime, precondition, failure fallback and test. Unresolved checklist items block any “playable/ready” claim.
