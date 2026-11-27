# SOLO Engine compatibility and CSSBC migration contract

## Purpose

SOLO Engine is the mobile-first runtime target for the CSS Bot Community (CSSBC) gameplay systems. CSSBC remains the source of truth for gameplay design and portable rules. The engine must be built so existing and future CSSBC modules can be ported without rewriting their gameplay logic around a renderer or a specific game loop.

This document is an implementation contract, not a claim that the engine or asset importer is already complete.

## Non-negotiable reference

Use Counter-Strike: Source v34 / Build 4044 as the gameplay and content reference:
- Preserve the original map layouts, routes, bombsites, hostage areas, spawn logic and recognizable visual identity.
- Preserve the original weapon roster, weapon identities, handling characteristics and first-person/world model distinction.
- Preserve player/bot silhouettes, animations, sounds, materials and relevant effects wherever legally supplied by the user's own installation.
- Keep classic CS readability, compact crosshair and tactical visual language. CSSBC additions must not turn the base game into an unrelated sci-fi shooter.
- Keep stock bomb, hostage and round scenarios available.

Do not commit Valve/third-party copyrighted game assets, extracted game archives, proprietary binaries or SDK code to a public repository unless redistribution rights are confirmed. The user's local game installation is the source for runtime asset import. GitHub stores importer code, schemas, original code, tests and legally distributable placeholder/demo assets only.

## Runtime targets

1. Android browser first: touch controls, responsive UI, low-memory operation and WebGL2 baseline.
2. Gamepad: standard Gamepad API mapping, hot-plug detection, remapping, dead zones, vibration where supported; keyboard/mouse remain useful for desktop testing.
3. Desktop browser as a development and asset-validation target.
4. Offline single-player must work without a server. Networking is a later optional layer.

Do not make WebGPU mandatory. Provide a WebGL2 fallback and scalable quality presets.

## Engine boundaries

Keep these layers independent:

- **Core simulation:** deterministic tick/update, entities, components, physics interfaces, damage, inventory, round state, teams and events. No DOM, rendering or browser input dependencies.
- **CSSBC gameplay modules:** bots, tactics, personality, memory, support, Juggernaut, weapons, HUD events and match rules. Modules consume/emit typed engine events.
- **Source-content compatibility layer:** import manifests, model/material/sound adapters, weapon definitions, map metadata, spawn/objective metadata and navigation conversion.
- **Platform layer:** Android browser, touch, Gamepad API, audio, persistence and performance controls.
- **Presentation:** renderer, animation, particles, lighting, HUD and menus. It must not own gameplay rules.

All gameplay modules must be loadable independently and declare dependencies, version, configuration schema and supported engine API version. Avoid hard-coded cross-module calls; use events and documented interfaces.

## Source asset preservation and import pipeline

The engine must not silently discard or replace source content. Implement an offline desktop-side converter/importer and a browser-side asset manifest loader.

### Import targets
- Maps: Source BSP geometry, world surfaces, static props, collision, materials, spawn points, bombsites, hostage points and map metadata.
- Models: MDL/VVD/VTX (and supported PHY collision data) converted to a documented runtime format such as glTF plus animation/skeleton metadata.
- Materials/textures: VMT/VTF translated into runtime material manifests and supported image textures, preserving texture paths and material names for traceability.
- Audio: supported Source audio files converted to browser-supported formats with a manifest preserving sound event names.
- Weapons: scripts, ammo, damage, recoil, spread, reload timings, fire modes, view/world model references, animations and sounds represented as data-driven weapon definitions.
- Navigation: Source navigation data converted into engine navmesh/waypoint graphs while preserving areas, connections and team/objective annotations where available.

### Conversion rules
- Keep original relative paths and source hashes in every imported asset record.
- Keep a source-to-runtime mapping so an imported asset can be traced to its original file.
- Never overwrite the source installation. Import is read-only.
- Report unsupported shaders, entities, model features or map elements explicitly; do not silently substitute.
- Validate scale, coordinate handedness, UVs, normals, skeletons, animation timing, collision and material assignments.
- Include a conversion report and a per-asset error list.
- Use local user-provided files; no upload of proprietary game content to GitHub or cloud services by default.

### Map fidelity
The first playable map must be a converted CS:S map with matching layout and collision, not a hand-built generic arena. Keep map entities and objective metadata separate from visual geometry so bomb/hostage rules can evolve without altering the map mesh. Add visual comparison and collision-walk tests to the importer pipeline.

## CSSBC modules that must remain portable

The following are design requirements carried forward from CSSBC. Each must be a separate module or data-driven subsystem with tests:

- Tactical bot brain: retake, trade, escort, retreat, objective push and rotate; squad roles and team coordination.
- Bot personalities, persistent memory, ranks, leadership, morale and contextual communication.
- Perception and information sharing: bots act only on perceived/shared evidence; no omniscient targeting, instant aimbot reaction or unfair prefire.
- Hiding, cover selection, flanking, retreat and team tactics.
- Dynamic alert/mark system with a maximum of 12 active marks.
- Contextual nearby AI chatter, not global spam.
- Flashlight and dark/no-power interior support; configurable dusk/lighting scenario.
- Original and added weapons with real weapon scripts, ammo, recoil, damage, reload and purchase integration.
- Molotov: target maximum 15% availability; movement slow capped at 30% for its defined duration/round rules.
- RPG: team limit and cooldown rules (design target: one per team every three rounds), with under-barrel alternative kept as a separate weapon configuration.
- Dead-ally bot takeover: maximum two per round, with five-round restriction after overuse.
- Support purchase tiers: 1,000 / 3,000 / 9,000; Juggernaut reinforcement only after at least six rounds and at most once per ten rounds. Juggernaut movement penalty target 5–10%, no machine gun, visible armor weak spots.
- Armor plate damage and evidence-weighted weak-spot selection.
- MVP scoring for meaningful tactical actions, including valid actions before death.
- HUD/menu/settings: compact classic crosshair; health, armor, ammo, team, support, armor-plate and contextual tactical status.
- Preserve 6v6 as a supported target match size.

All numeric values above are design constraints to be verified and tuned in tests, not assumptions that they are already implemented in the runtime.

## Migration strategy

1. Audit CSSBC portable C++ core and list every public gameplay type, rule and test.
2. Define a small engine-neutral API for entities, events, time/ticks, perception, navigation, inventory, damage and team/round state.
3. Port the CSSBC core behind adapters; do not rewrite the bot brain as renderer-specific scripts.
4. Build the Source asset inventory/importer and conversion report.
5. Validate a converted stock map, player model, bot model and one stock weapon.
6. Implement mobile player movement, camera, touch controls and gamepad.
7. Wire one complete gameplay slice: stock weapon + converted map + round rules + two tactical bots.
8. Port remaining CSSBC modules incrementally, each with automated tests and an in-browser test scene.
9. Add performance budgets and low/medium presets before expanding visual effects.

## Acceptance criteria

A milestone is not complete unless:
- It opens in Android Chrome-class browsers without an app install.
- Touch controls and a connected gamepad both work; gamepad hot-plug and remapping are tested.
- The imported map retains its layout, collision and objective points.
- Imported weapon and player assets retain their identity, materials and animations to the extent supported by the converter.
- Gameplay modules run without depending on rendering code.
- Existing CSSBC unit tests continue to pass or have documented equivalent tests.
- Unsupported source features are reported, never hidden behind fake “full compatibility” claims.
- The public repository contains no unlicensed proprietary game assets.

## Current status

Only the CSSBC portable C++ gameplay core and its design specifications exist in this repository. SOLO Engine, Android runtime, gamepad layer, Source asset importer, map converter and in-browser game are not yet implemented. This contract defines how they must fit together.
