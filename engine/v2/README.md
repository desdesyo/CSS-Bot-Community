# SOLO: Wet Ground

Game title: **SOLO: Wet Ground**. Engine: SOLO Engine V2.

A parallel browser-FPS engine track. The legacy client remains untouched except for a separately committed adaptive-rendering correction.

## Why a separate engine
The previous client is a 150 KB monolithic Three.js page with coupled rendering, AI, physics, HUD and input. V2 starts from a clean runtime boundary using Babylon.js' WebGL renderer, PBR materials, explicit shadow budget, isolated AI cadence and measured dynamic resolution.

## Current vertical slice
- WebGL rendering with device-aware antialiasing and shadow-map budgets.
- PBR material pipeline and the Wet Ground rain-soaked old-quarter map with low-rise blue-gray buildings, narrow alleys, a canal, two stone bridges, wet cobblestone, puddles and warm lanterns.
- Real third-party skinned soldier meshes (roughly 13k–15.5k triangles each, 80-bone rigs, embedded PBR textures), bundled locally in the Pages artifact; no primitive body-part stand-ins.
- First-person desktop input and mobile dual-stick/fire input.
- Procedural high-detail first-person M4-style rifle, detailed 9mm service pistol and full-tang combat knife, with separate moving parts, controls, magazines, sights and materials.
- First-person forearms and tactical gloves built as a rigged viewmodel, with rifle/pistol recoil, muzzle flashes, knife swing, weapon-switch sway, breathing/locomotion sway and magazine/arm reload animations. Weapon mechanics remain connected to the existing projectile, ammo and reload systems. Bots use rifle/pistol/knife loadouts, manage ammunition and reloads, switch to pistol when rifle ammunition is exhausted, and use melee at contact distance.
- Eleven humanoid NPCs using six rigged, textured soldier GLB variants (male and female), with shared idle / walk / run Biped animation clips: five teammates and six opponents around the human player (6v6 total).
- CT/T team selection; both choices preserve the same five-ally/six-opponent roster. Player deployment is faction-correct, five allies hold the spawn compound during a 10-second protection window, and enemy spawn is kept across the full map approach.
- AI decisions are stepped at 8 Hz; rendering remains independent.
- Adaptive resolution uses 2-second frame-time windows and a 95th-percentile frame-time target. Mobile scale is bounded to 72–100%; desktop 78–135%.
- Minimal HUD telemetry: FPS, render scale and p95 frame time.

## Deployment

The default-branch workflow publishes the exact V2 revision only after `SOLO Engine V2 source checks` succeeds. It downloads the six licensed soldier GLBs and three matching Biped clips into the Pages artifact, then deploys through the `github-pages` environment. The publisher workflow lives on `main` so GitHub Pages branch/environment policy is evaluated against the default branch while the tested game source remains isolated on `feature/solo-engine-v2`.

## Run
Open `/engine/v2/` on the published Pages site or serve the repository root over HTTP. The engine loads Babylon.js from its official CDN; an internet connection is required.

## Explicit limitations
This is a new engine foundation and greybox vertical slice, not yet a CSS:S content port. It does not yet have final custom-made studio character assets, networking, full collision/physics or verified Redmi 12 performance. The rifle viewmodel is a procedural Babylon.js asset, not a scanned or externally authored photorealistic mesh. See `ASSET_CREDITS.md` for model and animation licenses. The mobile hardware must be measured before setting acceptance targets.


## Active level: Wet Ground
- Main reference: user-saved visual reference named “Wet Ground”.
- Nighttime blue-hour rain atmosphere, a narrow old-quarter street framed by inward-facing low-rise blue-gray masonry, deep-set windows, carved stone doorways, wrought-iron balconies, projecting cornices, rain pipes, reflective wet cobblestone, warm amber lamps, shallow puddles, drainage, overhead wires and layered city depth. The visual target is a grounded street-level panorama, not a modular abstract arena.
- A cross-quarter canal divides the map; three stone bridges connect both banks, including a direct continuation of the main avenue. Collision barriers prevent shortcutting across the water, and bridge approaches remain open to players and bots.
- The central objective is now a detailed biosecure facility: a fully enclosed server chamber with eight equipment racks, access portals, airlocks, a control bay, decontamination storage, emergency power, cable trays, HVAC and two opposing approaches. The bomb/interaction pad is centered in the server room; the tactical minimap marks the complex.
- Multiple side streets, short cross alleys, recessed entrances and low cover create alternate routes and sightlines. The walkable atlas uses a new map identity so old industrial-district route data is not mixed into this level.
- Procedural cobblestone texture is generated at runtime at 512 px on coarse/mobile devices and 1024 px on desktop; static level transforms/materials are frozen after build. Dynamic point-light count is capped and disabled on mobile.
