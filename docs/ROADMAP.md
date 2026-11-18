# Development roadmap (current state)

## SOLO Mod Workshop
- [x] Define local-first architecture with optional Advanced AI.
- [x] Add Windows workspace initializer and project manifest.
- [x] Add bounded local SHA-256 project inventory.
- [ ] Run workspace tools on the user's Windows PC and inspect the returned evidence.
- [ ] Add registered build adapters (SourceMod compiler, CMake and other detected tools).
- [ ] Add Blender batch automation and model export validation.
- [ ] Add image, audio and video conversion/generation adapters.
- [ ] Add reproducible packaging and approval-gated installation.
- [ ] Verify the mod in a real CS:S v34 game/server.

## CSSBC gameplay
- [x] Engine-independent support price/eligibility rules.
- [x] Six Juggernaut armor plate states.
- [x] Bot callout trust and evidence-weighted plate choice.
- [x] First tactical decision layer: retake, trade, escort, retreat, push/rotate and role orders.
- [x] MVP event scoring, retreat estimate and cover reward.
- [x] Support roster composition model (4-unit squad and Juggernaut).
- [x] Shared team event memory with bounded history.
- [ ] Validate CI result and add deterministic unit tests.
- [ ] Select and pin a CS:S SDK fork; compile a game DLL.
- [ ] Register support NPCs, custom weapon and armor hitgroups in Source.
- [ ] Hook economy, round events, bot perception, nav and HUD.
- [ ] Create rigged model/animations and test in an actual server.
