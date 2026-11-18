# CSSBC SDK module — agent instructions

Read this file before changing anything under \`sdk/\`. Also obey repository-root \`AGENTS.md\`, \`agent-skills/css-v34-project-context.md\`, and the relevant subfolder instructions.

## Source-of-truth and boundaries
- Target is Counter-Strike: Source v34, not Source SDK 2013, CS:GO, CS2, TF2 or modern x64 Source.
- Verify the exact SDK checkout, compiler, architecture, interface versions and build flags before using any engine API. The AlliedModders \`hl2sdk/css\` branch is a candidate header source, not proof of ABI compatibility with every v34 distribution.
- Keep portable gameplay rules in \`src/\`; keep Source SDK types and engine calls under \`sdk/\`. Never leak \`CBasePlayer\`, \`CCSBot\`, \`edict_t\`, VGUI or SDK headers into the portable core.
- Treat \`sdk/server\` as integration seams unless a matching game-source build proves otherwise. A method declaration, bridge contract, test double or compiled object is not proof of a live hook.
- The native VSP and custom GameDLL are different components. VSP callbacks cannot perform GameDLL-owned player allocation or initialization.
- Do not call \`IVEngineServer::CreateFakeClient\` a fully spawned CS:S bot. A valid bot requires GameDLL player object creation, team join, normal spawn lifecycle and rollback on failure.

## Mandatory change workflow
1. Read the exact target file and all callers/implementations/tests before editing.
2. Identify the owning layer: portable core, server adapter, GameDLL ABI, VSP bootstrap, client VGUI, or SourcePawn compatibility layer.
3. Write down the expected v34 API/ABI and exact lifecycle point. If not evidenced in the checked-out SDK/source, mark it UNKNOWN and stop before inventing a signature.
4. Preserve existing behavior and make one cohesive change. Do not replace a subsystem or copy code from a newer Source branch without proving compatibility.
5. Add/update a focused test for the portable behavior or ABI validation. Tests must not pretend to validate live engine behavior.
6. Build the relevant Win32/x86 target with the pinned SDK/toolchain. A Linux portable-core pass does not validate a Windows DLL.
7. Inspect the produced artifact architecture, exports, dependencies and hash. Do not package a DLL if ABI/build evidence is incomplete.
8. For runtime claims, test on a disposable copy / isolated dedicated server matching the exact v34 build. Keep logs and rollback artifact.
9. Report separately: source implemented, unit-tested, compiled, packaged, installed, loaded, and verified in gameplay.

## High-risk areas — mandatory checks
- ABI structs: preserve field order, packing, widths, calling convention, version and structSize checks. Never silently append fields without a version/size strategy.
- Entity references: entity index alone can be reused. Use user ID/generation or validated handles; reject stale references.
- Server-thread rules: engine entity reads/writes and GameDLL callbacks must run on the authoritative server thread.
- Lifecycle: register/unregister events exactly once; clear per-slot state on disconnect, map change and round transitions; avoid stale slot state.
- Hooks: preserve native CCSBot behavior unless a narrowly scoped override is proven safe. Do not bypass engine traces, movement, weapon selection or team rules.
- Tick budget: stagger decisions; avoid full player scans, expensive traces, allocations or logging every frame. Cache only with explicit invalidation.
- Event handling: validate event pointer, event name, userid/attacker/victim and team/alive state; do not infer an attacker or objective event from missing fields.
- Ownership: document who owns each object, listener, panel, entity, timer and allocation. Pair every registration/allocation with cleanup.
- Failure path: every partial bot spawn or load sequence must roll back all acquired resources and leave the stock game usable.
- No core binary replacement: never overwrite stock \`server.dll\`, \`client.dll\`, \`engine.dll\` or unknown game files as a debugging shortcut.

## Performance and compatibility
- Preserve the 32-bit x86 target unless the exact v34 engine and all dependencies are proven to use another architecture.
- Avoid STL ABI crossing module boundaries. Pass POD/versioned structs across the CSSBC GameDLL interface.
- Keep hot-path code bounded and deterministic where practical. No unbounded containers, file I/O, network I/O or synchronous waits in frame/entity callbacks.
- Do not assume a feature is active because its portable class exists. Find the live call chain from engine callback to core decision and back to an authoritative engine action.
- Every new engine-facing feature needs a no-op/disabled safe path when its dependency is unavailable.

## Required evidence in every implementation report
- Exact branch + commit.
- Exact SDK source/ref and compiler/architecture.
- Changed files and their owning layer.
- Test/build results with run links.
- Engine integration path (or explicit missing hook).
- Runtime evidence, if any; otherwise say not runtime-tested.
- Rollback plan for any installed artifact.
