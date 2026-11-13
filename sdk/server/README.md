# CSSBC SDK Server Adapter

This folder is the seam for integrating the portable CSSBC systems into a Source SDK game DLL.

- `CSSBC_SDKBridge.h` is SDK-facing contract; engine objects are converted to POD snapshots before entering portable logic.
- Add this directory and `../../src` to the game DLL include paths.
- Implement the methods in the game DLL where `CCSBot`, `CBasePlayer`, damage, bomb and round hooks are available.
- Keep Source engine types out of `src/` so core CI remains portable.

**Not a game DLL yet:** adapter methods intentionally have no fake implementation. To compile and run them, the matching CS:S/Source SDK game source tree must be supplied and built. This repo currently does not contain Valve's engine/game source or binary dependencies.
