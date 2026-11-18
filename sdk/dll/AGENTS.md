# CSSBC native DLL / VSP — agent instructions

Read \`../AGENTS.md\` and repository-root \`AGENTS.md\` first.

## Component separation
- VSP (\`CSSBC_VSP.cpp\`) is a Metamod:Source server-plugin bootstrap. It receives server-plugin callbacks and can log lifecycle information.
- The CSSBC GameDLL bridge (\`CSSBC_V34Bridge.*\`) is a separate ABI contract whose provider must live inside a compatible custom CS:S v34 GameDLL.
- A VSP does not own \`CBasePlayer\` construction and cannot turn \`CreateFakeClient\` into a fully initialized bot.
- Do not merge these responsibilities or call a logging callback a gameplay implementation.

## ABI rules
- Preserve \`kInterfaceName\`, \`kBridgeAbi\`, struct field order, field widths, alignment and calling convention.
- Validate pointer, ABI version, structSize and every function pointer before calling across the module boundary.
- Keep STL, exceptions, references, engine-owned classes and allocator-owned objects out of the cross-DLL ABI.
- Validate UTF-8/name length, team enum, skill range, optional model path and all pointers before entering GameDLL code.
- Use generation-protected handles and reject stale entity-slot reuse.
- Never change ABI layout without versioning and updating both provider, consumer, tests and documentation together.

## Build and load safety
- Build Win32/x86 for the verified v34 target. Do not infer compatibility from a successful compile against a newer SDK branch.
- Verify exports, PE machine type, imported DLLs, interface string and dependencies.
- Never install into the game until the exact v34 ABI is verified on a disposable copy.
- Never replace stock engine/client/server DLLs as a shortcut. Any GameDLL replacement requires a separately reviewed exact-build source, backup, explicit approval and rollback.
- Log concise lifecycle and failure reasons; never log IP addresses, tokens or private identifiers.

## Current truth
- The VSP bootstrap is not the GameDLL provider.
- The bridge header and validation helpers do not spawn bots by themselves.
- The stock v34 GameDLL provider is absent unless a separately verified source tree is added.
- No bot spawn claim is valid without an actual server-side create -> initialize -> team -> spawn -> remove test.
