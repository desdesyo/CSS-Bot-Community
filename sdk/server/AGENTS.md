# CSSBC server integration — agent instructions

Read \`../AGENTS.md\` and repository-root \`AGENTS.md\` first.

## Layer contract
- \`src/\` owns portable decision logic and value types. This directory owns translation between live CS:S state and portable data.
- Keep all SDK headers, engine classes, traces, entity handles and damage application here or in the GameDLL source tree.
- \`CSSBC_EngineAdapter.cpp\` is the engine-facing integration point. Trace every callback and caller before changing it.
- \`CSSBC_BotRuntime.*\` is an orchestration layer; it is not automatically invoked by CS:S just because it compiles.
- \`CSSBC_SDKBridge.h\` is a contract, not an implementation. Never invent successful behavior for methods that have no implementation/caller.

## Before changing bot decisions
1. Trace the full path: engine hook -> snapshot construction -> portable brain/runtime -> validated decision -> engine action.
2. Verify that every snapshot field is populated from authoritative game state. Do not leave important fields at defaults while claiming the feature works.
3. Validate entity index range and identity. Reset slot state on disconnect, bot removal, map shutdown and slot reuse.
4. Respect server-thread ownership. Do not call engine APIs from worker threads or delayed callbacks without a valid lifetime check.
5. Preserve native CCSBot movement/state machine. CSSBC may request bounded high-level actions; do not directly teleport, fabricate visibility, bypass navigation or skip weapon/trace rules.
6. Rate-limit tactical decisions and expensive scans. Keep all frame callbacks bounded.
7. Make partial support deployment transactional: if only some units spawn, remove the newly created units or return an explicit partial result and rollback policy. Never report full success for partial deployment.
8. Verify event listener registration and cleanup. Avoid duplicate registration after map transitions or plugin reloads.

## Current known limitations
- The checked-in portable BotRuntime is not proof that \`CCSBot::Update\` calls it.
- The current server adapter source contains live-looking hooks but must be checked against the exact game-source checkout and build target before any API claim.
- The custom v34 GameDLL provider for \`CSSBC_V34_GAME_DLL_001\` is not present in this module. Do not claim VSP can create fully initialized player bots without it.
- Bot creation, support NPC spawning, melee impacts and armor systems require real GameDLL/trace/damage hooks; portable unit tests only prove decision logic.

## Test requirements
- Add portable unit tests for rule logic and separate adapter tests with explicit fakes.
- Test null/stale entities, slot reuse, disconnect, map/round reset, team changes, failed spawn rollback and absent SDK interface.
- Never use a fake adapter test as evidence of live game integration.
