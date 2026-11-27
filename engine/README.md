# SOLO Engine — first cross-platform prototype

This is the first concrete playable slice, not yet a CS:S recreation.

## Client

The same browser client runs on Android and desktop:
- Android touch joystick + FIRE button and an on-screen weapon wheel.
- PC keyboard/mouse; hold TAB and move the mouse to choose a weapon, release TAB to confirm; keys 1–4 are quick slots.
- Android gamepad; hold L1 and use the right stick to choose a weapon, release L1 to confirm.
- Weapon wheel slots: primary rifle, pistol, grenade and knife. Rifle/pistol have separate magazines and reserve ammo; grenade has a limited count and area damage; knife is a short-range melee attack.
- Touch-only mobile assist: automatically switches to the other firearm when the current magazine empties; reload starts automatically only after both firearm magazines are empty. This assist is disabled whenever a gamepad is connected and is not enabled on PC.
- Offline single-player training with five simple bots.
- Redesigned HUD: GTA V-inspired live minimap (player heading, ally/enemy markers, cover and bomb site), plus Soul Knight-inspired readable status bars.
- HP and armor bars are functional; armor absorbs part of incoming damage before HP.
- Camera field of view widened to 86° to reduce the oversized close-up feel and show more of the arena; player movement reduced from 7.2 to 4.6 world units/s and bot movement was reduced proportionally.
- The problematic external rigged Soldier model is no longer loaded in the training round; the compact procedural soldier is retained until the imported skeleton/animation can be corrected. No oversized Juggernaut class is present in this prototype.
- Grenades now use a recognizable segmented body and throw animation, a visible arcing projectile with bounce and a 2.65-second fuse, plus an expanding flash/ring and particle burst on detonation.
- The third meter occupies the former mana slot as a reserved placeholder for future per-character team trust. It is intentionally inactive and does not yet represent a gameplay trust value.
- Desktop minimap sits at bottom-left; Android moves it to the upper-left so it does not overlap the movement joystick.
- Optional WebSocket session connection for phone + PC in the same room.

Open `client/index.html` through a local static web server (for example `python -m http.server 8000` from `engine`) or host `client/` as a static site. For secure remote browser access, serve the client over HTTPS.

## Session server

Requires Node.js 20+:
```sh
cd engine/server
npm install
npm test
npm start
```
The server listens on port 8080 by default. For remote cross-play, deploy it on a public host with TLS termination and use its `wss://` URL in both clients. Do not expose an unencrypted public WebSocket on an untrusted network.

## Gameplay and crash diagnostics

- `GAME LOG` in the in-game quick HUD starts/stops the detailed gameplay recorder (frame-time percentiles, hitches, renderer memory/calls, physics/collisions, bot state, skeleton/animation samples and browser performance entries).
- Startup JavaScript errors, unhandled promise rejections and WebGL context loss are captured even before manual recording starts. A bounded crash journal is persisted in browser local storage and restored on the next launch. The startup error overlay also has a direct `СКАЧАТЬ ЛОГ ОШИБКИ` button, so diagnostics can be retrieved even when the 3D scene never starts.
- Open `ЛОГИ` and use `СКАЧАТЬ ПОЛНЫЙ ИГРОВОЙ ЛОГ` to export the complete local diagnostics bundle, or press `GAME LOG` when a saved crash journal is present to upload it to `logs/gameplay/` in the active branch. Upload requires the existing local GitHub Contents token; failed uploads keep the journal on the device.
- Control/input logs remain separate under `ЛОГИ` and `logs/controls/`.

## Runtime stability increment (27 Nov 2026)

- Non-explosive projectiles now reuse a bounded pool (48 returned entries) instead of allocating and disposing a mesh/material for every shot.
- Tracer position buffers are updated in place rather than replaced on every simulation frame.
- Gamepad polling now uses shared safety helpers for controller selection, axis dead zones and safe button reads; disconnect clears held-button edge state.
- Run helper tests from the repository root with `node --test engine/tests/runtime-safety.test.mjs`.
- This is a code-level stability increment only. A sustained browser session and physical Redmi 12/gamepad verification are still required; it is not yet marked as device-verified.

## Current limitations

- Multiplayer is an early shared-session prototype. The server authoritatively processes player movement, basic wall collision, fire cooldown, bullets, hits and health snapshots. It does not yet include shared bots, round flow, purchases, matchmaking, accounts, anti-cheat or production deployment.
- The local offline training mode has simple bots and shooting, but is not yet the original Source engine or CS:S assets.
- No public game server is deployed by this repository yet. Two devices cannot connect over the internet until the session server is deployed and the client is hosted over HTTPS.
- Use only assets from a locally owned CS:S installation via a future importer; this prototype contains no Valve assets.

## Manual smoke test

1. Serve `client/` over HTTP and open it on PC and Android on the same network.
2. Start the session server and set the server URL in both clients to `ws://LAN-IP:8080` (LAN testing only; browsers may block mixed/insecure contexts on HTTPS).
3. Connect both clients. The player counter should show 2 on both screens.
4. Move on either device and verify the other client sees the movement.
5. Disconnect one client; the remaining client should return to one connected player.
6. Separately test offline mode: reload without server address, move and shoot bots.

For internet play, deploy the server behind HTTPS/WSS and host the client over HTTPS.


## Cloud gaming prototype

A WebRTC host/viewer prototype is available in [cloud/](cloud/README.md). It streams the V2 canvas from a GPU-hosted desktop browser to Android/PC and forwards player input over a data channel. The viewer/host pages are published with the V2 demo. The signaling relay is implemented and tested, but no persistent GPU host or public WSS signaling service is deployed; see the cloud README for exact setup and limitations.
