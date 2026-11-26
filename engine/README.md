# SOLO Engine — first cross-platform prototype

This is the first concrete playable slice, not yet a CS:S recreation.

## Client

The same browser client runs on Android and desktop:
- Android touch joystick + FIRE button.
- PC keyboard/mouse.
- Standard gamepad axes and right trigger.
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

- Multiplayer is an early shared-session movement prototype. Server snapshots synchronize player positions; authoritative weapon damage, map collision, bots, matchmaking, accounts, anti-cheat and production deployment are not implemented.
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
