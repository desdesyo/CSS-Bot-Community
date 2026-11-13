# CSSBC v34 GameDLL bridge integration

## Boundary
The VSP is not a player factory. Do not treat IVEngineServer::CreateFakeClient as
a finished bot: it only allocates a fake network client and does not guarantee
CBasePlayer/CSS player initialization, team membership, weapons, or spawn.

## ABI
- Interface name: CSSBC_V34_GAME_DLL_001
- ABI: 0x00010000
- Provider: the custom v34 GameDLL
- Consumer: CSSBC_VSP
- Header: CSSBC_V34Bridge.h
- Validation: ValidateApi() and ValidateRequest()

## GameDLL implementation order
1. Register the interface from the GameDLL CreateInterface registry.
2. Implement CreateBot on the GameDLL thread:
   - validate name/team/skill and available player slot;
   - create a fake client using the branch's internal player allocation path;
   - instantiate and bind the CSS player object;
   - run the normal client put-in-server, team join, and spawn lifecycle;
   - roll back the fake client/entity if any stage fails;
   - return a generation-protected BotHandle only after successful spawn.
3. Implement RemoveBot using the normal disconnect/remove lifecycle; reject stale
   handles by checking user ID, edict index, and generation.
4. Implement BotCount from authoritative GameDLL player state.
5. VSP resolves this interface from the GameDLL factory (not the engine factory),
   validates ABI/structSize, and invokes only on the server thread.
6. Add round/map shutdown cleanup and tests for slot exhaustion, failed spawn,
   duplicate names, stale handles, team switching, and disconnect.

## Current status
The contract and validation functions are present. The provider side is NOT yet
implemented: the stock v34 cstrike GameDLL is closed source. A compatible custom
GameDLL source tree or a verified binary hook boundary is required. This document
does not claim that bots spawn today.
