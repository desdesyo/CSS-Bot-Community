param([string]$GameDir = "C:\\Games\\Counter-Strike Source v34")
$ErrorActionPreference="Stop"
$repo="desdesyo/CSS-Bot-Community"
$api="https://api.github.com/repos/$repo/releases/latest"
try{$release=Invoke-RestMethod -Uri $api -Headers @{ "User-Agent"="CSSBC-Updater";Accept="application/vnd.github+json" }}catch{Write-Host "No published CSSBC release found yet.";exit 0}
$asset=$release.assets|Where-Object name -eq "CSSBC-Update.zip"|Select-Object -First 1
if(!$asset){Write-Host "Latest release has no CSSBC-Update.zip.";exit 0}
$state=Join-Path $env:LOCALAPPDATA "CSSBC"
New-Item -ItemType Directory -Force $state|Out-Null
$zip=Join-Path $state "update.zip";$tmp=Join-Path $state "payload"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip
if(Test-Path $tmp){Remove-Item $tmp -Recurse -Force};Expand-Archive $zip $tmp -Force
$manifest=Get-Content (Join-Path $tmp "version.txt") -Raw
$current=if(Test-Path (Join-Path $GameDir "cstrike\\addons\\cssbc\\version.txt")){Get-Content (Join-Path $GameDir "cstrike\\addons\\cssbc\\version.txt") -Raw}else{"0"}
if($manifest.Trim() -eq $current.Trim()){Write-Host "CSSBC is current ($current).";exit 0}
if(Get-Process -Name hl2 -ErrorAction SilentlyContinue){Write-Host "Close Counter-Strike Source before updating.";exit 2}
$target=Join-Path $GameDir "cstrike\\addons\\cssbc";New-Item -ItemType Directory -Force $target|Out-Null
Copy-Item (Join-Path $tmp "CSSBC_VSP.dll") (Join-Path $target "CSSBC_VSP.dll") -Force
Copy-Item (Join-Path $tmp "version.txt") (Join-Path $target "version.txt") -Force
Write-Host "CSSBC updated to $($manifest.Trim()). GameDLL updates require Setup.exe so original server.dll is backed up."
