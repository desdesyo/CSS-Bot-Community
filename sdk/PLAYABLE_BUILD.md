# CSSBC playable integration roadmap (SDK-only)
This repository is currently a gameplay core plus asset source files. The SDK runtime adapter is now implemented as a small decision boundary, but it is **not wired into CS:S entity AI**. Do not compile this header into the standalone core target without SDK integration.

## Next actual integration steps
1. Obtain a compatible CS:S game-source/SDK fork (server and client projects, matching compiler/toolchain).
2. Add BotRuntime.cpp to the server DLL build; bind BotSnapshot from live players and route decisions into bot locomotion/weapon selection.
3. Connect damage/death/round/MVP/support events; persist team memory per round.
4. Compile VPK/model assets through studiomdl QC; hook model precache and view/world model replacement.
5. Build client HUD/menu from VGUI; server commands and replicated state via network messages.
6. Run a dedicated server and in-game regression suite; only then tag as playable.

## Performance guard
Core AI should tick on staggered intervals, not every frame. Keep SDK entity reads in the adapter, core data value-only, and cap bot planning frequency. Do not add expensive traces for every bot simultaneously; schedule traces and reuse recent visibility results.
