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
