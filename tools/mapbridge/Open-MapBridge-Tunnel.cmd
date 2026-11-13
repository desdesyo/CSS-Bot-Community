@echo off
where cloudflared >nul 2>nul
if errorlevel 1 (
  echo cloudflared is not installed. Install it from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
  pause
  exit /b 1
)
echo Creating temporary HTTPS tunnel to local MapBridge...
echo Copy the https://...trycloudflare.com URL and append /mcp for your remote MCP client.
cloudflared tunnel --url http://127.0.0.1:8787
pause
