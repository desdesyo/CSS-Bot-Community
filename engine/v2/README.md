# SOLO Engine V2

A parallel browser-FPS engine track. The legacy client remains untouched except for a separately committed adaptive-rendering correction.

## Why a separate engine
The previous client is a 150 KB monolithic Three.js page with coupled rendering, AI, physics, HUD and input. V2 starts from a clean runtime boundary using Babylon.js' WebGL renderer, PBR materials, explicit shadow budget, isolated AI cadence and measured dynamic resolution.

## Current vertical slice
- WebGL rendering with device-aware antialiasing and shadow-map budgets.
- PBR material pipeline and an industrial training blockout with lanes, cover and lighting.
- First-person desktop input and mobile dual-stick/fire input.
- Six lightweight animated agents with waypoint movement.
- AI decisions are stepped at 8 Hz; rendering remains independent.
- Adaptive resolution uses 2-second frame-time windows and a 95th-percentile frame-time target. Mobile scale is bounded to 72–100%; desktop 78–135%.
- Minimal HUD telemetry: FPS, render scale and p95 frame time.

## Run
Open `/engine/v2/` on the published Pages site or serve the repository root over HTTP. The engine loads Babylon.js from its official CDN; an internet connection is required.

## Explicit limitations
This is a new engine foundation and greybox vertical slice, not yet a CSS:S content port. It does not claim production assets, networking, full collision/physics, complete weapon simulation or verified Redmi 12 performance. The mobile hardware must be measured before setting acceptance targets.
