# First v34 prototype — execution checklist

This is the acceptance gate for the first playable test. It intentionally separates "plugin loads" from "a real player bot exists".

## Gate A — Build and load native VSP
- [ ] Build Win32/x86 DLL against compatible Source 2006 VSP headers (not x64).
- [ ] Confirm exported `CreateInterface` returns `ISERVERPLUGINCALLBACKS`.
- [ ] Install through the CSSBC plugin VDF and verify `plugin_print`.
- [ ] Confirm load/map/unload messages in console.
- [ ] Run two map changes and one clean game exit without crash.

**Pass:** DLL loads and lifecycle callbacks execute. This does not mean a bot exists.

## Gate B — Diagnostic cycle
1. In the game console, capture console output using `con_logfile cssbc_console.log`.
2. Run the smoke test and stop console capture with `con_logfile ""`.
3. Put `cssbc_console.log` in the game's `cstrike` folder.
4. Run Start Menu → **CSSBC — Collect diagnostics**.
5. Inspect ZIP before upload; then upload with the separately supplied GitHub token.

The collector itself is Windows PowerShell 5.1+ and can run offline.

## Gate C — First actual bot (blocking engineering task)
- [ ] Identify and validate a v34-compatible GameDLL player creation entry point.
- [ ] Implement the creation path; do not treat `CreateFakeClient` as a complete bot.
- [ ] Verify the entity is a real CSS player and is registered in player/resource tables.
- [ ] Spawn one bot, assign T or CT, set name/skill and equip.
- [ ] Remove it cleanly on round/map teardown.
- [ ] Verify scoreboard, spawn, movement, death, and disconnect.

**Pass:** one actual bot appears on `de_dust2`, moves, can die, and is removed cleanly.

## Gate D — Prototype package
- [ ] Build DLL reproducibly (x86).
- [ ] Build Inno Setup installer with DLL + VDF + collector + shortcut.
- [ ] Install on the target v34 path; uninstall is not destructive to preexisting files.
- [ ] Run Gates A–C and attach diagnostic ZIP.

## Current state (honest)
- Gameplay-independent AI/core exists.
- VSP bootstrap and bridge contract exist.
- Diagnostic collector and installer entry are committed.
- **No compiled DLL, setup.exe, or verified in-game bot yet.**
- The critical unknown is the genuine CS:S v34 GameDLL bot/player creation implementation; the HL2 2006 SDK ZIP alone does not supply it.
