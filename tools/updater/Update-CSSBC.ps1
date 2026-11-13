param([string]$GameDir = "C:\Games\Counter-Strike Source v34")
$ErrorActionPreference="Stop"
$repo="desdesyo/CSS-Bot-Community"
$api="https://api.github.com/repos/$repo/releases?per_page=30"
try{$releases=Invoke-RestMethod -Uri $api -Headers @{ "User-Agent"="CSSBC-Updater";Accept="application/vnd.github+json" }}catch{Write-Host "GitHub releases unavailable: $_";exit 1}
$release=$releases|Where-Object {($_.assets|Where-Object name -eq "CSSBC-Update.zip").Count -gt 0}|Select-Object -First 1
if(!$release){Write-Host "No CSSBC update bundle published yet.";exit 0}
$asset=$release.assets|Where-Object name -eq "CSSBC-Update.zip"|Select-Object -First 1
$state=Join-Path $env:LOCALAPPDATA "CSSBC";New-Item -ItemType Directory -Force $state|Out-Null
$zip=Join-Path $state "update.zip";$tmp=Join-Path $state "payload"
Invoke-WebRequest $asset.browser_download_url -OutFile $zip
if(Test-Path $tmp){Remove-Item $tmp -Recurse -Force};Expand-Archive $zip $tmp -Force
$manifest=(Get-Content (Join-Path $tmp "version.txt") -Raw).Trim()
$mod=Join-Path $GameDir "cstrike\addons\cssbc"
$current=if(Test-Path (Join-Path $mod "version.txt")){(Get-Content (Join-Path $mod "version.txt") -Raw).Trim()}else{"0"}
if($manifest -eq $current){Write-Host "CSSBC is current ($current).";exit 0}
if(Get-Process -Name hl2 -ErrorAction SilentlyContinue){Write-Host "Close Counter-Strike Source before updating.";exit 2}
$bin=Join-Path $GameDir "cstrike\bin";$server=Join-Path $bin "server.dll";$backup=Join-Path $bin "server.dll.cssbc-backup"
if(!(Test-Path (Join-Path $tmp "server-v34-win32.dll"))){throw "Update archive missing GameDLL; refusing partial update."}
if(Test-Path $server -and !(Test-Path $backup)){Copy-Item $server $backup}
New-Item -ItemType Directory -Force $bin,$mod |Out-Null
Copy-Item (Join-Path $tmp "server-v34-win32.dll") $server -Force
Copy-Item (Join-Path $tmp "CSSBC_VSP.dll") (Join-Path $mod "bin\CSSBC_VSP.dll") -Force
Copy-Item (Join-Path $tmp "version.txt") (Join-Path $mod "version.txt") -Force
Write-Host "CSSBC fully updated to $manifest (GameDLL + VSP). Original server.dll backup preserved."
