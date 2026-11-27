#!/usr/bin/env bash
set -euo pipefail

# Run from the repository root in a Kaggle GPU notebook session.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [[ "$(uname -m)" != "x86_64" ]]; then echo "Нужен x86_64 GPU runtime"; exit 1; fi
if ! command -v node >/dev/null || ! command -v npm >/dev/null; then echo "Node.js 20+ and npm are required"; exit 1; fi
if ! command -v Xvfb >/dev/null; then
  apt-get update -qq
  apt-get install -y -qq xvfb x11-xserver-utils curl
fi

CHROME="$(command -v google-chrome || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$CHROME" ]]; then
  apt-get update -qq
  apt-get install -y -qq wget
  wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/google-chrome.deb
  apt-get install -y -qq /tmp/google-chrome.deb
  CHROME="$(command -v google-chrome)"
fi

if ! command -v cloudflared >/dev/null; then
  curl -fsSL https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /usr/local/bin/cloudflared
  chmod +x /usr/local/bin/cloudflared
fi

npm --prefix engine/server install
ROOM="$(openssl rand -hex 3 | tr '[:lower:]' '[:upper:]')"
TOKEN="$(openssl rand -hex 32)"
export CLOUD_SIGNAL_PORT=8090 CLOUD_HOST_TOKEN="$TOKEN" CLOUD_ALLOWED_ORIGINS="https://desdesyo.github.io"

Xvfb :99 -screen 0 1920x1080x24 -ac +extension GLX +render -noreset >/tmp/solo-xvfb.log 2>&1 &
XVFB_PID=$!
export DISPLAY=:99
sleep 2
xrandr -display :99 --output screen --mode 1920x1080 >/dev/null 2>&1 || true

node engine/server/cloud-signaling.js >/tmp/solo-signaling.log 2>&1 &
SIGNAL_PID=$!
cloudflared tunnel --no-autoupdate --url http://127.0.0.1:8090 >/tmp/solo-cloudflared.log 2>&1 &
TUNNEL_PID=$!
cleanup(){ kill "$SIGNAL_PID" "$TUNNEL_PID" "$XVFB_PID" 2>/dev/null || true; }
trap cleanup EXIT INT TERM

TUNNEL_HTTPS=""
for _ in $(seq 1 60); do
  TUNNEL_HTTPS="$(grep -Eo 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/solo-cloudflared.log | tail -1 || true)"
  [[ -n "$TUNNEL_HTTPS" ]] && break
  sleep 2
done
if [[ -z "$TUNNEL_HTTPS" ]]; then echo "Cloudflare quick tunnel не поднялся:"; cat /tmp/solo-cloudflared.log; exit 1; fi
SIGNAL_URL="${TUNNEL_HTTPS/https:\/\//wss:\/\/}"
ENC_SIGNAL="$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1],safe=""))' "$SIGNAL_URL")"
HOST_URL="https://desdesyo.github.io/CSS-Bot-Community/engine/cloud/host.html?room=$ROOM&signal=$ENC_SIGNAL&autostart=1#token=$TOKEN"

echo "SOLO GPU HOST READY"
echo "Room: $ROOM"
echo "Signal: $SIGNAL_URL"
echo "Host browser: Chromium kiosk 1920x1080"
echo "Keep this Kaggle session running. Share only Room + Signal with the Redmi viewer."
nvidia-smi || true

"$CHROME" --no-sandbox --disable-dev-shm-usage --disable-gpu-sandbox --ignore-gpu-blocklist --enable-gpu --use-gl=egl --window-size=1920,1080 --start-fullscreen --kiosk --autoplay-policy=no-user-gesture-required --no-first-run --disable-infobars --user-data-dir=/tmp/solo-cloud-chrome "$HOST_URL"
