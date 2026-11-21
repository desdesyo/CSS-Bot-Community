$ErrorActionPreference = "Stop"
$defaultUrl = "https://cssbc-github-chat.descapan.workers.dev"
$url = Read-Host "SOLO.Chat URL [$defaultUrl]"
if ([string]::IsNullOrWhiteSpace($url)) { $url = $defaultUrl }
$url = $url.Trim().TrimEnd("/")
$securePassword = Read-Host "SOLO.Chat app password (input is hidden)" -AsSecureString
if ($securePassword.Length -lt 8) { throw "Password is too short." }
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
$bytes = New-Object byte[] 32
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
$token = ([BitConverter]::ToString($bytes)).Replace("-", "").ToLowerInvariant()
$config = @{
  soloChatUrl = $url
  soloChatPassword = $password
  bridgeId = "free-chatgpt-browser-bridge"
  localBridgeToken = $token
  localPort = 8765
}
$configPath = Join-Path $PSScriptRoot "config.json"
$json = $config | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($configPath, $json, (New-Object System.Text.UTF8Encoding($false)))
$password = $null
$securePassword = $null
Write-Host ""
Write-Host "Config saved to config.json (this file contains your SOLO.Chat password; do not share it)." -ForegroundColor Green
Write-Host "Copy this local bridge token into the extension popup:" -ForegroundColor Yellow
Write-Host $token -ForegroundColor Cyan
Write-Host ""
Write-Host "Next: run START-BRIDGE.cmd, load the extension folder in Chrome/Edge, and paste the token in its popup."
