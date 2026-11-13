# CS:S v34 runtime findings (portable build)

Date: 2026-11-13

## Confirmed on the user's game installation

Installation: `C:\Games\Counter-Strike Source v34`

- `bin/engine.dll` contains the server plugin command handlers/help strings:
  `plugin_load`, `plugin_unload`, `plugin_print`, `plugin_pause`, `plugin_unpause`.
- The engine strings include `addons/*.vdf` and
  `ISERVERPLUGINHELPERS001` / `ISERVERPLUGINCALLBACKS001` / `ISERVERPLUGINCALLBACKS002`.
- Running `plugin_print` in the game console succeeds and reports an empty plugin list.

This confirms that the plugin command manager is present and callable in this build.
It does **not** yet prove that an arbitrary plugin DLL loads or that a plugin can safely
modify bot/gameplay state.

## Next validation

1. Build a minimal x86 server plugin against the exact v34 interface headers.
2. Load it with `plugin_load` using an absolute path and verify its load/unload callbacks.
3. Keep this as a diagnostic only; gameplay integration remains in the CS:S server
   game DLL source (the `rusherr-c/cssv34-sdk` codebase), not in a generic plugin.
4. Never replace the user's original `server.dll`; use a separate test copy.

## CSS Bot Community integration boundary

The portable core in `src/` remains engine-independent. The SDK adapter must translate
CS:S bot/player state into CSSBC snapshots, call core decisions, and apply actions to
actual game entities. The bridge contract in `sdk/server/CSSBC_SDKBridge.h` is an
interface seam, not a completed gameplay adapter.
