# CSSBC Arena — playable blockout plan (Hammer)

This is the first map target: a compact, symmetrical training/round arena for validating bots and team mechanics. It is deliberately not presented as a compiled BSP.

## Geometry and gameplay layout
- Two protected team spawn rooms on opposite ends; spawn exits face a central lane.
- Main lane: 1024 units wide, with two waist-high cover islands (each 192×256) offset left/right.
- Side lanes: 384 units wide, reconnect to the center behind cover; no dead-end pockets.
- Central objective platform: 512×512, four approach directions, hard cover on two corners.
- Elevated observation ledges are decorative only in first pass; do not permit unreachable bot nav areas.
- Ceiling 512 units above floor; playable floor at Z=0, walls to Z=384.
- Team spawn spacing >= 2048 units; objective distance equalized.
- Lighting: neutral 4000K key lights, no pitch-black corners; visibility test silhouettes at 1200 units.

## Hammer construction checklist
1. Create cssbc_arena.vmf in Hammer (Source SDK Base 2006 / CS:S game configuration).
2. Build floor/walls from world brushes; use tools/toolsnodraw then apply visible materials to faces.
3. Add info_player_counterterrorist and info_player_terrorist in separate spawn rooms.
4. Add light_environment, env_cubemap, playerclip around non-playable ledges.
5. Add func_buyzone per team and func_bomb_target on objective platform when testing objective mode.
6. Compile VBSP → VVIS → VRAD (HDR off for v34 compatibility); validate leaks and compile log.
7. In-game verify spawn protection, collision, sight lines, bot pathing and nav mesh; generate/repair .nav with the CS:S nav editor.

## Acceptance gates
- No leak; no stuck spawn; all spawn points reachable.
- Each team has 2+ routes to objective.
- Bot navigation covers every intended combat surface.
- FPS and visibility remain acceptable on legacy hardware.

The actual VMF/BSP/nav are not yet authored or compiled. This document is a map specification, not a map asset.
