$ErrorActionPreference = "Stop"
$MapBridgeDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $MapBridgeDir "..\..")).Path
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js 20+ is required. Install it from https://nodejs.org/ and retry." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}
$NodeMajor = [int]((node --version).TrimStart("v").Split(".")[0])
if ($NodeMajor -lt 20) {
  Write-Host "Node.js 20 or newer is required." -ForegroundColor Red
  Read-Host "Press Enter to close"
  exit 1
}
if (-not (Test-Path (Join-Path $MapBridgeDir "node_modules"))) {
  Write-Host "Installing MapBridge dependencies..."
  Push-Location $MapBridgeDir
  npm install
  if ($LASTEXITCODE -ne 0) { Pop-Location; throw "npm install failed" }
  Pop-Location
}
[byte[]]$SecretBytes = New-Object byte[] 32
$Rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$Rng.GetBytes($SecretBytes)
$Rng.Dispose()
$Token = [Convert]::ToBase64String($SecretBytes)
$env:CSSBC_MAP_ROOT = $RepoRoot
$env:CSSBC_MAPBRIDGE_TRANSPORT = "http"
$env:CSSBC_MAPBRIDGE_HOST = "127.0.0.1"
$env:CSSBC_MAPBRIDGE_PORT = "8787"
$env:CSSBC_MAPBRIDGE_TOKEN = $Token
Write-Host ""
Write-Host "CSSBC MapBridge remote MCP is starting" -ForegroundColor Green
Write-Host "Local MCP endpoint: http://127.0.0.1:8787/mcp"
Write-Host "Bearer token (copy it to your trusted remote MCP client):" -ForegroundColor Yellow
Write-Host $Token -ForegroundColor Cyan
Write-Host ""
Write-Host "Keep this window open. Press Ctrl+C to stop the server."
Push-Location $MapBridgeDir
try { node src/server.mjs } finally { Pop-Location }
