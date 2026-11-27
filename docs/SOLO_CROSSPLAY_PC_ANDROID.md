# SOLO Engine: PC + Android cross-play architecture

## Product requirement

A player on an Android phone and a player on a Windows/Linux/macOS PC must be able to join the same match, on the same map, with the same rules, weapons, teams and progression. Platform must not create separate matchmaking pools.

## Client strategy

Use one shared game client and one shared simulation contract:

- **Android:** browser/PWA client, touch controls, optional Bluetooth/USB gamepad.
- **PC:** desktop browser client with keyboard/mouse and gamepad. The same web client is used; desktop packaging (Tauri or another thin shell) is optional and must not fork gameplay code.
- **Shared runtime:** common rendering, UI, content manifests and input abstraction. Platform-specific input adapters feed the same action map.
- **Simulation:** portable C++ gameplay core compiled to WebAssembly for clients where practical and native for the authoritative server. Keep gameplay rules renderer- and platform-independent.
- **Dedicated server:** authoritative match simulation, bot simulation, round state, hit validation, inventory, economy and match results. A client never decides whether its own hit or purchase is valid.

The PC client is not a separate game. It is another platform target for the same SOLO Engine build. This avoids content and balance drift.

## Cross-play networking

Initial multiplayer transport:
- Secure WebSocket (WSS) for browser-compatible real-time sessions.
- Server-authoritative  tick simulation with a fixed documented tick rate (initial target 30 Hz; profile before locking).
- Client sends timestamped input/action commands, not trusted world-state changes.
- Server broadcasts snapshots and reliable events; clients interpolate remote entities and predict only local movement where safe.
- Sequence numbers, server tick IDs, bounded input queues, reconnect tokens and protocol version negotiation.
- Server validates movement limits, fire cadence, ammo, reload state, line of sight, damage and purchases.
- Matchmaking/lobby service assigns a room and server endpoint. A direct invite/join code is supported for private tests.
- Disconnect grace period and reconnect to the same match are required. Do not silently move a player into another match.

The transport is an implementation choice, not part of gameplay rules. Keep a transport interface so a future native UDP/WebRTC transport can be added without rewriting gameplay modules. Do not claim competitive-grade latency or anti-cheat until measured.

## Protocol compatibility

Every client and server handshake must include:
- protocol major/minor version;
- engine API version;
- gameplay ruleset/build ID;
- map/content manifest hash;
- enabled gameplay module IDs and versions.

Reject incompatible major versions and incompatible map/ruleset hashes with a clear message. Minor-version compatibility must be explicitly declared. Do not allow a client to load a match with missing required content.

## Input parity

All controls map to the same semantic actions:
- move, look, fire, alternate fire, reload, jump, crouch, use, weapon slot, buy/menu, scoreboard and voice/chat.
- Android touch layout is configurable and supports left/right-handed placement.
- PC defaults: WASD + mouse, with full rebinding.
- Gamepad: standard mapping, hot-plug, remapping, dead zones and supported vibration.
- Server gameplay and weapon balance are identical across platforms. Any aim-assist policy must be transparent, bounded and server-independent of device type; no hidden platform-specific damage or weapon stats.

## Fairness and accessibility

- No separate mobile-only weapon damage, health or movement values.
- Do not give keyboard/mouse users an undisclosed advantage or penalize touch players with server-side stat changes.
- Use configurable input sensitivity and optional accessibility assists, clearly disclosed and consistently enforced.
- Initial tests should use private rooms and bots. Public matchmaking comes only after latency, reconnect and abuse tests.

## Stable releases and cross-play

A stable release is one coordinated version across Android and PC:
- One immutable client build/version for all platforms.
- Server advertises supported client protocol and content manifest.
- Release candidate tests Android + PC clients against the same dedicated server.
- Roll back the server and clients as a compatible set; keep the previous compatible set available.
- Development builds use a separate test environment and cannot replace the public stable environment.

## Implementation milestones

1. **Shared local slice:** one map, movement, camera, one weapon, bots, round reset; runs in Android and PC browsers from the same code.
2. **Input parity:** touch, keyboard/mouse and gamepad; verify action mapping.
3. **Headless server:** run the same portable rules core without rendering; add deterministic match tests.
4. **Private cross-play:** invite code, WSS room, authoritative snapshots, hit validation and reconnect; Android + PC in one match.
5. **Content parity:** import and validate original CS:S reference maps, models, materials, sounds and weapon definitions from a user's own installation.
6. **Stable deployment:** versioned web clients, dedicated server deployment, monitoring, rollback and public play entry point.
7. **Desktop packaging:** optional installer/desktop shell around the shared PC client; no duplicated gameplay implementation.

## Required tests before claiming cross-play works

- Android phone + PC join the same private room and see the same match state.
- Both platforms can move, aim, fire, reload, switch weapons and complete a round.
- Server rejects invalid ammo, fire-rate, movement and purchase commands.
- Simulated packet loss, latency spikes and reconnect do not corrupt match state.
- Client/server protocol mismatch produces a readable rejection.
- A failed development deployment does not interrupt the last stable match service.

## Current implementation status (honest)

This document defines the cross-play contract only. The repository does not yet contain the SOLO Engine browser client, dedicated multiplayer server, lobby/matchmaking service, deployed game server or a playable cross-platform build. No phone-to-PC match can be started yet. Implementation must proceed through the milestones above; each milestone is to be built and tested before being described as complete.

## Copyright and content

Use the user's own local CS:S installation as the source for compatible content conversion. Do not publish Valve game assets, extracted archives, proprietary binaries or unlicensed SDK code in this repository.
