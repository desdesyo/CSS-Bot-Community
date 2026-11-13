# Player bot spawning on CS:S v34

Research conclusion: `IVEngineServer::CreateFakeClient` alone is insufficient for a custom player entity. Source SDK 2013's `NextBotCreatePlayerBot<T>` uses a temporary `ClientPutInServerOverride(T::AllocatePlayerEntity)` around `CreateFakeClientEx`, then binds the allocated player entity to the edict and spawns it. That override lives inside the GameDLL and is not exposed by the stock CS:S v34 VSP interface.

Therefore a VSP-only DLL cannot safely finish the player spawn lifecycle by itself. For an actual bot, we must either (A) build/replace the CS:S GameDLL against the matching v34 SDK and implement the player allocation hook, or (B) integrate with a compatible bot framework that already exposes the GameDLL-side allocator. This repository chooses A for the standalone native mod; no fake client is auto-created from VSP until that bridge exists.

Reference implementation concept: Valve Source SDK 2013 `src/game/server/NextBot/Player/NextBotPlayer.h`, `NextBotCreatePlayerBot<T>`. This is explanatory, not ABI-compatible with v34.