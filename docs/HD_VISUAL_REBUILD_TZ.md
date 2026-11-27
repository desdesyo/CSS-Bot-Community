# SOLO Engine — HD rebuild and playable-quality technical specification

**Status:** implementation contract; not a claim that the listed systems are already complete.  
**Reference:** Counter-Strike: Source v34 / Build 4044.  
**Targets:** Android browser (Redmi 12 baseline) and desktop browser.  
**Primary branch:** `fix/solo-engine-runtime-stability-2026-11-27`.

## 1. Product goal

Build one first-person tactical shooter with the recognizable CS:S scale, pacing, weapon handling, map readability and team identity. The current browser 3D prototype is a foundation only. It must not be described as HD/finished until the real assets, animation, gameplay and device tests exist.

## 2. Release gates (must pass in order)

### Gate A — Runtime stability
- One render loop only; one simulation update path; bounded delta time.
- No per-shot unbounded allocation. Reuse short-lived projectile/tracer objects.
- Explicit lifecycle ownership for geometries, materials, textures, render targets, skeletons and animation mixers.
- Hard caps for projectiles, particles, ragdolls, decals and temporary audio sources.
- Visibility/background handling, WebGL context-loss reporting and safe recovery.
- Gamepad hot-plug, disconnect cleanup, axis dead zones, trigger/button mapping and remapping.
- A 10-minute sustained-fire test and at least 1,000-shot automated stress run.
- Record frame-time P50/P90/P99, renderer calls/triangles, geometry/texture counts, active projectiles and errors.

### Gate B — Real asset pipeline
- Offline importer for user-owned CS:S v34 content; source directory is read-only.
- Inventory and hash source files; preserve relative paths and source-to-runtime mapping.
- Convert supported MDL/VVD/VTX/PHY, VTF/VMT, BSP, sound and navigation data to documented runtime formats.
- Runtime models: glTF 2.0/GLB with skeleton, skinning, named clips, material slots and collision metadata.
- Textures: base color, normal, roughness, metallic, AO and emissive where present; KTX2/Basis only after device capability checks.
- Produce per-file conversion report. Unsupported content must be reported, never silently replaced.
- Never commit proprietary Valve assets or extracted game archives to GitHub. Keep imported assets local unless redistribution rights are confirmed.

### Gate C — Characters and animation
- Preserve the planned 27 operator identities, including both teams, support variants and Juggernaut.
- Each slot needs an approved distinct silhouette/equipment configuration; color-only variants do not qualify.
- Shared, validated skeleton is allowed; each character must have its own real mesh/material/equipment combination.
- Required clips: idle, walk, run, crouch, crouch-walk, jump/fall/land, aim, fire/recoil, reload, weapon switch, grenade throw, knife attack, hit reaction and death.
- Validate model bounds, skeleton bounds, scale, bind pose, bone names, clip duration, foot contact and weapon-hand attachment before enabling an asset.
- Animation blending must be state-driven and bounded; no arbitrary bone offsets accumulating frame after frame.

### Gate D — Weapons
- Complete supported CS:S v34 roster, with separate first-person viewmodel and third-person/world model.
- Each weapon has hands/rig, draw, idle, fire, reload and supported inspect animations, audio, muzzle/impact effects and data-driven ammo/damage/spread/recoil/fire-mode settings.
- Hitscan/projectile behavior must match weapon type and have obstruction checks; never silently convert all weapons to instant damage.
- Test head/body/limb/armor damage, magazine depletion, reload cancellation, switching and continuous fire.

### Gate E — Map and environment
- First production map is a converted CS:S map with verified layout, scale, routes, spawn points, objective entities and collision.
- A procedural arena may remain a benchmark only; it is not a substitute for the reference map.
- PBR material sets, real geometry, static props, decals, glass, damage marks, baked/static lighting where appropriate, controlled dynamic lights and readable fog.
- Compare fixed viewpoints against the reference map; preserve navigation and line-of-sight gameplay.

### Gate F — Mobile/desktop performance
- Redmi 12 baseline: stable 30 FPS target in a representative 6v6 scene; 60 FPS is an optimization goal, not a promise.
- Desktop target: stable 60 FPS.
- Adaptive quality must change render scale/effects based on measured frame time, not hide CPU/GPU stalls.
- Use frustum culling, LOD, instancing, geometry/material batching and compressed textures only where validated.
- Separate CPU and GPU frame time; monitor draw calls, triangles, memory and shader compilation stalls.
- Verify on the physical target phone. Desktop CI is not mobile acceptance.

## 3. Architecture boundaries

1. Core simulation: fixed/controlled tick, entities, movement, collision, damage, inventory, round state and events; no DOM or renderer dependencies.
2. CSSBC gameplay: bots, tactics, personality, memory, support and rules; consumes/emits typed events.
3. Source compatibility: map/model/material/audio/navigation import manifests and conversion reports.
4. Platform: touch, keyboard/mouse, Gamepad API, audio, persistence and quality controls.
5. Presentation: renderer, skeletal animation, particles, lighting, HUD and menus; cannot own gameplay rules.

No module may directly mutate unrelated module internals. All temporary resources require explicit owners and disposal contracts.

## 4. Current implementation snapshot (27 Nov 2026)

| Area | Status | Evidence / next action |
|---|---|---|
| 3D client | Prototype | `engine/play.html` is a monolithic Three.js client; split systems after stability gate. |
| Projectile lifecycle | Partial fix implemented | Pooled non-explosive bullets and reusable trail buffers added; needs browser stress test. |
| Gamepad | Partial hardening implemented | Polling is guarded, axes sanitized, disconnect edge state reset; needs Android/controller matrix test. |
| Characters | Prototype | Procedural primitive soldiers remain; external sample GLB is not a verified character pack. |
| 27 operators | Roster only | Operator data entries are not 27 finished 3D models. |
| Animation | Partial/prototype | GLTF loader and mixer code exist, but model/clip pipeline is not accepted. |
| Weapons | Prototype | Four conceptual slots; no complete CS:S weapon roster or verified view/world models. |
| Map | Prototype | Procedural training arena; Source BSP import and fidelity checks absent. |
| PBR/HD materials | Partial | Existing procedural materials are not a complete source texture pipeline. |
| Mobile performance | Unverified | Physical Redmi 12 sustained test required. |

## 5. Mandatory regression matrix

For every gameplay build:
- Fresh load, start, pause/resume, restart round and return to menu.
- Keyboard/mouse, touch controls and at least one standard-mapped Bluetooth/USB gamepad.
- Connect/disconnect controller while playing; verify no stuck movement/fire/reload/menu state.
- Hold fire for 10 minutes; run 1,000-shot stress sequence; throw repeated grenades.
- Switch all available weapons while moving, aiming, firing and reloading.
- Verify bullets stop at walls and hit the intended target region.
- Confirm temporary object counts return to a stable baseline after effects expire.
- Record WebGL context events, uncaught errors and long tasks.
- Test on Redmi 12 in landscape, with thermal throttling after sustained play.

## 6. Definition of done

A gate is complete only when implementation, automated tests, browser smoke tests, device verification and evidence are attached to the commit. A green build, a loader class, a roster entry, a screenshot of a single model or a design document alone is not acceptance.

Do not label the game AAA. The visual target is a credible, detailed modernized CS:S-like presentation with stable controls and readable combat.
