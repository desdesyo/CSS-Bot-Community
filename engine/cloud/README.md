# SOLO Cloud Gaming prototype

This directory adds a first WebRTC cloud-rendering path for SOLO Engine V2.

## What is implemented

- A host page runs the V2 game in a desktop browser on a remote GPU machine.
- The host captures the actual game canvas at up to 60 FPS with `canvas.captureStream(60)`.
- A player page on Android/PC receives the video through WebRTC and sends touch/keyboard/mouse input over a WebRTC data channel.
- A Node.js WebSocket signaling relay authenticates the GPU host, pairs one host with one player per room, and forwards SDP/ICE messages only within that room.
- The game accepts cloud input only from its same-origin parent frame.
- Host video senders request up to 16 Mbps / 60 FPS. Actual quality is negotiated by the browser, GPU encoder, network and device.

## Important: this is not yet a deployed cloud gaming service

GitHub Pages can host the static viewer, but it cannot render the game on a GPU. The signaling server and the host browser must run on an always-on machine with a supported GPU and hardware video encoding. No such persistent GPU host is currently connected to this repository, and no public signaling endpoint is configured. Therefore the pages below are prototype code, not a live service yet.

A Kaggle notebook previously provided two Tesla T4 GPUs, but notebook sessions are temporary and are not a stable 24/7 game host. It can be used for a short technical experiment, not advertised as permanent hosting. The host also needs a browser session with hardware WebGL and hardware video encoding actually enabled; the presence of a GPU in the VM alone does not prove this.

## Start the signaling relay

Node.js 20+:

```sh
cd engine/server
npm install
CLOUD_HOST_TOKEN='use-a-long-random-secret' \
CLOUD_ALLOWED_ORIGINS='https://desdesyo.github.io' \
npm run start:cloud
```

The process listens on port 8090 by default. Put it behind a TLS reverse proxy and expose it as `wss://your-domain.example`. Do not expose plain `ws://` to the public internet. Keep `CLOUD_HOST_TOKEN` secret and restrict `CLOUD_ALLOWED_ORIGINS` to the exact static client origin.

The host must be authenticated with the secret token. Players join using a room code (6–12 uppercase letters/digits). This first slice permits one host and one player per room. It is a private technical test, not matchmaking.

## Start a GPU host

1. Run the signaling relay on a public server with TLS/WSS.
2. On a separate GPU machine, launch a desktop Chromium/Chrome session with hardware acceleration enabled at 1920×1080 or the desired render resolution.
3. Open the hosted `engine/cloud/host.html` page with `?room=ABC123&signal=wss%3A%2F%2Fyour-domain.example` and put the host token in the URL fragment as `#token=YOUR_SECRET`.
4. Press **ЗАПУСТИТЬ ИГРУ** in the host page. The V2 scene must be running before a player joins.
5. Keep the browser tab and GPU host online for the entire session.

Example URL shape (replace all placeholders):
`https://desdesyo.github.io/CSS-Bot-Community/engine/cloud/host.html?room=ABC123&signal=wss%3A%2F%2Fyour-domain.example#token=YOUR_SECRET`

## Connect the phone

Open `https://desdesyo.github.io/CSS-Bot-Community/engine/cloud/viewer.html`, enter the same room code and WSS signaling URL, then connect. The viewer page receives the host's video and sends movement, look, fire, reload, jump, sprint and weapon-slot actions.

## Current technical limits

- WebRTC uses a public STUN server only. Some carrier/NAT combinations require a TURN relay; TURN is not configured yet.
- No persistent GPU host, public WSS endpoint, room allocator, reconnect policy, multi-player SFU or operational monitoring is deployed.
- The host browser must have working hardware WebGL and hardware H.264/VP9 encoding. Software rendering/encoding can be slower than running locally.
- Current V2 uses Babylon.js WebGL. It can use high-resolution shadow maps and PBR lighting on the host GPU, but **it does not implement hardware ray tracing**. Ray tracing would require a separate WebGPU/native renderer path and a GPU with the relevant support; it is not switched on by this prototype.
- Cloud streaming removes local 3D rendering load from the phone, not network latency. Input-to-photon delay depends on route, jitter, encoding and decoding. "Zero lag" cannot be guaranteed.
- Remote rendering does not repair game logic bugs. Weapons, animation, AI and physics still need independent automated tests and long-running playtests.
- The signaling relay currently supports one host and one player per room. Do not use it as a public production service without TURN, authentication hardening, rate limits, observability and load testing.

## Verification

From repository root:

```sh
cd engine/server
npm install
npm test
node --check cloud-signaling.js
node --check ../cloud/host.js
node --check ../cloud/viewer.js
```

A successful CI run verifies the signaling protocol and syntax. It does not prove that a GPU host has been deployed or that end-to-end video streaming works on a physical Android phone.


## GPU host: 1080p/60 capture validation

The host page enters fullscreen when the host presses **ЗАПУСТИТЬ ИГРУ**. Configure the GPU host desktop display to **1920×1080 at 60 Hz**, use desktop Chrome/Chromium with hardware acceleration enabled, and keep the host tab foregrounded. The cloud-host render profile is pinned to scale 1.0 (no desktop supersampling or adaptive upscaling), so a 1920×1080 fullscreen viewport produces a 1920×1080 canvas capture. The host status reports the WebGL renderer and canvas dimensions; after a player joins it reports encoded frame dimensions, FPS and estimated bitrate. The viewer reports decoded dimensions/FPS and packet loss.

A successful 1080p/60 test requires the host diagnostics to show 1920×1080 and approximately 60 FPS, and the Redmi viewer to show the same decoded dimensions and frame rate during sustained play. A local code/CI check is not a substitute for this end-to-end device test. The public Pages build does not provide a GPU host or WSS signaling service; those must be separately provisioned and configured.


## One-command Kaggle GPU host

From the repository root in a Kaggle GPU notebook, run:

```bash
bash engine/cloud/kaggle-gpu-host.sh
```

The bootstrap installs Chromium/Xvfb and cloudflared when missing, creates a random host token and room, starts the authenticated signaling relay, opens a temporary Cloudflare HTTPS/WSS tunnel, and launches the host page in a 1920×1080 Chromium kiosk with autostart. Share only the printed **Room** and **Signal** values with the player; never share the host URL or token. Keep the Kaggle session and notebook cell running. The quick tunnel and Kaggle runtime are temporary and disappear when the session ends.

This script is a deployment bootstrap, not proof that Kaggle exposes WebGL/NVENC correctly. Verify the host page's reported GPU renderer and 1920×1080 canvas, then verify encoded FPS/bitrate and the viewer's decoded FPS on the Redmi 12. If WebRTC stays in ICE checking or fails to connect, a TURN relay is required; this prototype currently configures STUN only.
