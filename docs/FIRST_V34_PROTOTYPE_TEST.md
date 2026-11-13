# First CS:S v34 prototype — acceptance checklist

This milestone is a native **GameDLL** integration, not a SourceMod plugin and not the optional VSP bootstrap.

## Current implementation

- [x] A pinned CS:S v34 source checkout is used by GitHub Actions.
- [x] CSSBC Brain, Economy and Tactics sources are copied into the server GameDLL source tree.
- [x] The integration script adds `cssbc::sdk::OnBotUpdate(this)` to `CCSBot::Update`.
- [x] The adapter builds a limited snapshot from the existing bot and can issue retreat / seek-cover decisions.
- [ ] A successful Win32 GameDLL build has been confirmed.
- [ ] The resulting DLL has been tested in the user's local v34 installation.

## First test — after the Actions build succeeds

1. Download the `CSSBC-v34-GameDLL-Win32` artifact from the latest successful workflow run.
2. Keep the existing game installation untouched; prepare a separate test copy of the CS:S v34 folder.
3. Identify the exact active server GameDLL path in that installation before replacing anything.
4. Back up the original GameDLL.
5. Install the artifact only into the test copy and launch a local server.
6. Verify stock bot spawn, movement, combat, death, round end, map change and clean shutdown.
7. Compare bot decisions and server logs; collect the first failure log if anything crashes.

Do not replace the original `server.dll` in the user's working game folder as part of this checklist. The exact path and packaging must be confirmed against the target v34 build first.

## What this milestone does not do

- It does not create custom support NPCs or a Juggernaut player entity.
- It does not yet implement six hitbox-linked armor plates.
- It does not replace the entire CS:S bot state machine.
- It does not provide the final HUD, VGUI, models or installer.

The full plain-language build instructions are in [START_HERE_V34.md](START_HERE_V34.md).
