# SOLO Engine V2

A parallel browser-FPS engine track. The legacy client remains untouched except for a separately committed adaptive-rendering correction.

## Why a separate engine
The previous client is a 150 KB monolithic Three.js page with coupled rendering, AI, physics, HUD and input. V2 starts from a clean runtime boundary using Babylon.js' WebGL renderer, PBR materials, explicit shadow budget, isolated AI cadence and measured dynamic resolution.

## Current vertical slice
- WebGL rendering with device-aware antialiasing and shadow-map budgets.
- PBR material pipeline and an industrial training blockout with lanes, cover and lighting.
- Real third-party skinned soldier meshes (roughly 13k–15.5k triangles each, 80-bone rigs, embedded PBR textures), bundled locally in the Pages artifact; no primitive body-part stand-ins.
- First-person desktop input and mobile dual-stick/fire input.
- Procedural high-detail first-person M4-style rifle, detailed 9mm service pistol and full-tang combat knife, with separate moving parts, controls, magazines, sights and materials.
- First-person forearms and tactical gloves built as a rigged viewmodel, with rifle/pistol recoil, muzzle flashes, knife swing, weapon-switch sway, breathing/locomotion sway and magazine/arm reload animations. Weapon mechanics remain connected to the existing projectile, ammo and reload systems. Bots use rifle/pistol/knife loadouts, manage ammunition and reloads, switch to pistol when rifle ammunition is exhausted, and use melee at contact distance.
- Eleven humanoid NPCs using six rigged, textured soldier GLB variants (male and female), with shared idle / walk / run Biped animation clips: five teammates and six opponents around the human player (6v6 total).
- CT/T team selection; both choices preserve the same five-ally/six-opponent roster.
- AI decisions are stepped at 8 Hz; rendering remains independent.
- Adaptive resolution uses 2-second frame-time windows and a 95th-percentile frame-time target. Mobile scale is bounded to 72–100%; desktop 78–135%.
- Minimal HUD telemetry: FPS, render scale and p95 frame time.

## Deployment

The default-branch workflow publishes the exact V2 revision only after `SOLO Engine V2 source checks` succeeds. It downloads the six licensed soldier GLBs and three matching Biped clips into the Pages artifact, then deploys through the `github-pages` environment. The publisher workflow lives on `main` so GitHub Pages branch/environment policy is evaluated against the default branch while the tested game source remains isolated on `feature/solo-engine-v2`.

## Run
Open `/engine/v2/` on the published Pages site or serve the repository root over HTTP. The engine loads Babylon.js from its official CDN; an internet connection is required.

## Explicit limitations
This is a new engine foundation and greybox vertical slice, not yet a CSS:S content port. It does not yet have final custom-made studio character assets, networking, full collision/physics or verified Redmi 12 performance. The rifle viewmodel is a procedural Babylon.js asset, not a scanned or externally authored photorealistic mesh. See `ASSET_CREDITS.md` for model and animation licenses. The mobile hardware must be measured before setting acceptance targets.
