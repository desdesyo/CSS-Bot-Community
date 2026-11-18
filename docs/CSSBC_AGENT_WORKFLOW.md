# CSSBC implementation workflow for SOLO.Chat

This is a navigation and decision guide. It contains no runtime code and must not be compiled into the mod.

## 1. Pick the correct implementation layer

| Requested change | Authoritative area | Do not do |
|---|---|---|
| Bot tactics/personality/economy/portable combat rules | \`src/\` | Add Source engine headers to the portable core |
| Live bot state, traces, damage, events, spawning | \`sdk/server/\` and matching GameDLL source | Assume portable classes are already called by the engine |
| Native server plugin lifecycle / interface bridge | \`sdk/dll/\` | Spawn a full CCS player from VSP callbacks |
| Client HUD/menu/input | \`sdk/client/\` and matching client DLL source | Put client VGUI in the server DLL or call it a multiplayer pause |
| SourceMod commands/config compatibility | \`sourcemod/scripting/cssbc.sp\` | Claim SourcePawn tier announcements spawn NPCs |
| Build, package, install, recover | \`desdesyo/modhaul@main\` plus workflow/tooling | Patch compiled .smx or stock game DLLs as source |

## 2. Required pre-edit checklist
- [ ] Read root and nearest scoped \`AGENTS.md\`.
- [ ] Read the feature docs and actual source/callers.
- [ ] Confirm exact v34 build, SDK/API, loader, compiler and x86 architecture.
- [ ] Trace the full call path from engine event to core decision and back to engine action.
- [ ] List invariants, ownership, lifecycle, failure cases and rollback.
- [ ] Add a regression test before/with the fix.

## 3. When something does not line up
1. Stop before writing speculative code.
2. Identify whether the missing piece is source, API declaration, runtime hook, build dependency, or test evidence.
3. Search this branch and \`desdesyo/modhaul@main\` for the existing implementation; do not create a parallel subsystem.
4. If a required file exists only as a binary, locate its authoritative source. Never edit binary contents or reverse-engineer behavior by guessing.
5. If the v34 SDK or GameDLL contract is unavailable, keep work in portable core/tests and write a precise integration TODO.
6. Ask one narrow question only if a user-owned choice is genuinely required. Otherwise continue with the safe, verifiable part.

## 4. Feature completion ladder
A feature is not "done" until each applicable stage is evidenced:
1. Designed — rules and interfaces specified.
2. Implemented — source and call path exist.
3. Unit-tested — regression and boundary tests pass.
4. Compiled — exact target and architecture build succeeds.
5. Packaged — manifest, hashes, dependencies and destination recorded.
6. Installed — local agent confirms exact post-install hashes.
7. Loaded — matching game/server logs confirm module load.
8. Gameplay-tested — real v34 session verifies behavior and cleanup.

Never promote a feature to a later stage based on an earlier stage. A mock/fake adapter proves only the contract exercised by that test.

## 5. Code-specific danger zones
- **ABI:** version, struct size, packing, calling convention, field order, lifetime and allocator boundaries.
- **Entities:** index reuse, disconnect, team changes, map transitions, stale handles and partial spawn rollback.
- **Events:** userid validation, event registration/unregistration, duplicate listeners and round reset.
- **Bot AI:** native CCSBot state machine, visibility/nav traces, server thread, tick cadence and decision input provenance.
- **Melee:** server-authoritative impact-time hull trace, friendly-fire filtering, cooldown/state reset and damage application.
- **Economy/support:** check all prerequisites before charging; partial deployment must rollback or explicitly report partial.
- **UI:** one Escape/focus owner, parent lifetime, overlay-vs-pause distinction, client/server separation.
- **SourcePawn:** validate client indexes/properties/arguments; reset client slots; never describe status text as a spawned entity.
- **Assets:** confirm actual v34 formats, search paths, precache and model/animation compatibility; do not replace stock assets in place during development.

## 6. Required response format
For each implementation task, SOLO.Chat should report:
- Changed source files and commit.
- Exact tests/builds run and result.
- What is wired to the live game and what is still a contract/prototype.
- Any unresolved API/ABI/asset assumptions.
- Next single blocking step and rollback plan if applicable.
