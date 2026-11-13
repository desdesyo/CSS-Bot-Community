# CSSBC Diagnostic Collector (Windows PowerShell 5.1+)
# Usage: powershell -ExecutionPolicy Bypass -File .\tools\diagnostics\Collect-CSSBC.ps1
# Optional upload: set CSSBC_GITHUB_TOKEN and CSSBC_GITHUB_REPO (owner/repo).
param(
  [string]$GameDir = "C:\Games\Counter-Strike Source v34",
  [string]$OutputDir = "$env:LOCALAPPDATA\CSSBotCommunity\Diagnostics",
  [switch]$Upload,
  [switch]$OpenFolder
)
$ErrorActionPreference = "Stop"
$repo = if ($env:CSSBC_GITHUB_REPO) { $env:CSSBC_GITHUB_REPO } else { "desdesyo/CSS-Bot-Community" }
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$work = Join-Path $env:TEMP "CSSBC_diag_$stamp"
New-Item -ItemType Directory -Force -Path $work | Out-Null
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

function Copy-IfExists([string]$Path, [string]$Name) {
  if (Test-Path -LiteralPath $Path -PathType Leaf) {
    Copy-Item -LiteralPath $Path -Destination (Join-Path $work $Name) -Force
  }
}
# CSS server/client logs (best effort; files may be absent in a client-only install)
$logDirs = @((Join-Path $GameDir "cstrike"), (Join-Path $GameDir "cstrike\logs"))
foreach ($dir in $logDirs) {
  if (Test-Path $dir) {
    Get-ChildItem -LiteralPath $dir -File -Filter "*.log" -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTime -Descending | Select-Object -First 5 |
      ForEach-Object { Copy-Item $_.FullName (Join-Path $work ("game_" + $_.Name)) -Force }
  }
}
Copy-IfExists (Join-Path $GameDir "cstrike\addons\CSSBotCommunity\cssbc.log") "cssbc.log"
Copy-IfExists (Join-Path $GameDir "cstrike\cssbc.log") "cssbc.log"
Copy-IfExists (Join-Path $GameDir "cstrike\plugin_print.txt") "plugin_print.txt"

# Runtime/system facts (no usernames, machine serials, IPs or process command lines)
$gameExe = Join-Path $GameDir "hl2.exe"
$gameVersion = if (Test-Path $gameExe) { (Get-Item $gameExe).VersionInfo.FileVersion } else { "not-found" }
$dll = Join-Path $GameDir "cstrike\addons\CSSBotCommunity\CSSBC_VSP.dll"
$dllVersion = if (Test-Path $dll) { (Get-Item $dll).VersionInfo.FileVersion } else { "not-found" }
$summary = [ordered]@{
  schema = 1; created_utc = (Get-Date).ToUniversalTime().ToString("o")
  collector_version = "0.1.0"; game_dir_exists = (Test-Path $GameDir)
  game_exe_version = $gameVersion; cssbc_dll_present = (Test-Path $dll)
  cssbc_dll_version = $dllVersion; powershell = $PSVersionTable.PSVersion.ToString()
  os = [Environment]::OSVersion.Version.ToString()
  included_files = @(Get-ChildItem $work -File | Select-Object -ExpandProperty Name)
}
$summary | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $work "summary.json") -Encoding UTF8
$readme = @"
CSS Bot Community diagnostic bundle
Created: $stamp
Review included files before sharing. This collector does not intentionally collect usernames,
machine identifiers, network addresses, chat, screenshots, or process command lines.
"@
$readme | Set-Content (Join-Path $work "README.txt") -Encoding UTF8
$zip = Join-Path $OutputDir "CSSBC_Diagnostic_$stamp.zip"
Compress-Archive -Path (Join-Path $work "*") -DestinationPath $zip -CompressionLevel Optimal
Remove-Item $work -Recurse -Force

Write-Host "Diagnostic archive: $zip"
if ($OpenFolder) { Start-Process explorer.exe $OutputDir }
if ($Upload) {
  $token = $env:CSSBC_GITHUB_TOKEN
  if (-not $token) { throw "Set CSSBC_GITHUB_TOKEN first. No token is embedded or saved by this script." }
  if ($repo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') { throw "Invalid CSSBC_GITHUB_REPO (expected owner/repo)." }
  $headers = @{ Authorization = "Bearer $token"; Accept = "application/vnd.github+json"; "X-GitHub-Api-Version" = "2022-11-28" }
  $remotePath = "diagnostics/inbox/$stamp.zip"
  $bytes = [IO.File]::ReadAllBytes($zip)
  $payload = @{ message = "Upload CSSBC diagnostic $stamp"; content = [Convert]::ToBase64String($bytes) } | ConvertTo-Json
  $uri = "https://api.github.com/repos/$repo/contents/$remotePath"
  $result = Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $payload -ContentType "application/json"
  Write-Host "Uploaded: $($result.content.html_url)"
  # Issue creation is deliberately not automatic in v0.1; upload alone avoids issue spam.
}
Write-Host "Done."
