# CSSBC Arena — expanded 4× escape/search map design

The compact arena concept is expanded to a **4× playable footprint** (approximately 4096×4096 Source units of traversable ground, not a 4× scale stretch). The intent is a hunt/search sandbox: AI may retreat, break contact, hide, regroup, and be found. It remains a design specification until VMF is authored and compiled.

## World layout: four connected districts

- **District A — Central objective / arena (1024×1024):** the original combat core. Four approaches, two hard-cover corners, short sightlines and a readable landmark tower. Objective is optional in escape-search mode.
- **District B — Industrial yard (1024×1024):** containers, loading bays, a warehouse with 2 entrances + a roofless service court. Container stacks create occlusion, but every route has a walkable floor and nav connection.
- **District C — Residential edge (1024×1024):** low-rise blocks, courtyards, alleys, garages and a small underground service passage. 3 loops; no one-way trap corridors.
- **District D — Green belt / drainage (1024×1024):** trees, concrete channel, maintenance shed, bridge and two culverts. Dense visual cover, but avoid tiny gaps that bots cannot traverse.

Districts connect as a loop, not a straight corridor: A↔B↔D↔C↔A, plus two cross-links through the center. Four landmarks (smokestack, water tower, lit storefront, bridge) allow orientation without a minimap.

## Escape / search gameplay spaces
- 12–16 hide/search pockets distributed across all districts: behind warehouse racks, courtyard garages, service rooms, bridge underpass, shed, drainage bends.
- Each pocket has at least two exits or a visible risk/reward tradeoff; no unbreakable safe hide spot.
- 6 broad routes + 8 narrow shortcuts; shortcuts must be navigable by player and bot hulls.
- Search characters can choose a destination, change hide position after contact, crouch/hold, or flee toward a regroup zone.
- Fleeing bots prefer breaking line of sight, using a side route, then stopping in cover; they should not run into map boundaries or camp a single corner forever.
- Searchers get broad landmarks and sound/visual clues, not omniscient exact coordinates. A recent sighting decays over time.

## Navigation and bot behavior constraints
- Bake/repair nav areas for all four districts; connect stairs, ramps, doorways and bridge transitions explicitly.
- Mark cover and ambush regions in a CSSBC map metadata file (separate from Source `.nav`).
- Use area danger, visibility and last-known-position timestamps to rank search destinations.
- On fleeing state: choose route with low enemy visibility + adequate clearance; periodically reconsider after new sighting or blocked path.
- Keep a hard cap on search agents and path recomputations to protect old CPUs.

## Hammer scale / construction notes
- Treat each district as a 1024×1024 logical block; final playable footprint is roughly 4096×4096 units, with vertical variation only where it aids navigation.
- Build modular brush shells and prop clusters; use `tools/toolsnodraw` on hidden faces.
- Avoid excessive unique props and expensive dynamic lights. Bake static lighting; use fog/skybox to conceal edges.
- Spawn zones sit at opposite outer edges; search/hunt start point is central or randomized among 3 safe start pockets.
- Use `func_buyzone` only for classic round mode; escape-search mode can disable buying and objective entities.

## Acceptance criteria before calling it a map
1. VMF exists and VBSP/VVIS/VRAD compile without leaks.
2. Every district has 2+ independent routes; no dead nav islands.
3. All hide pockets are reachable by player and bot; none are permanently unsearchable.
4. Bots can flee, lose sight, re-hide, and regroup without path oscillation.
5. 10-minute traversal/search playtest has no stuck bots and stable frame rate on legacy hardware

**Status:** layout expanded 4× and escape/search behavior specified. This is not yet a `.vmf`, `.bsp`, or `.nav` file.
