# Development roadmap — CS:S v34

## Implemented in the repository
- [x] Engine-independent support price/eligibility rules.
- [x] Six Juggernaut armor plate states and evidence-weighted plate selection.
- [x] Bot callout trust, personality, team memory and tactical decision core.
- [x] MVP event scoring, retreat estimate and cover reward.
- [x] Support roster composition model (4-unit squad and Juggernaut).
- [x] Pinned CS:S v34 source tree and AlliedModders CS:S SDK revision in the Win32 build workflow.
- [x] Native GameDLL integration script: copies Brain/Economy/Tactics and hooks `CCSBot::Update`.
- [x] GitHub Actions build pipeline for Win32/x86 GameDLL and optional native VSP bootstrap.

## Current verification gate
- [ ] Confirm the latest GitHub Actions `build-v34-gamedll` job succeeds.
- [ ] Download the `CSSBC-v34-GameDLL-Win32` artifact and verify it on a clean copy of CS:S v34.
- [ ] Confirm existing bots still spawn, move, fight, die and disconnect normally.
- [ ] Confirm CSSBC retreat/cover decisions occur without crashes across round and map transitions.

## Next gameplay implementation
- [ ] Add real GameDLL-side bot/player creation for CSSBC-controlled support units.
- [ ] Connect round state, economy and MVP event hooks to authoritative game events.
- [ ] Register support NPCs and implement six armor hit regions/damage.
- [ ] Integrate navigation, team perception and shared evidence without omniscient targeting.
- [ ] Implement client HUD/VGUI and localization resources.
- [ ] Create rigged models/animations, package content and profile performance on low-end hardware.

A green build is not a playable-test pass. The first in-game acceptance checklist is in [START_HERE_V34.md](START_HERE_V34.md).
