#!/usr/bin/env powershell
# Run from the CS:S game directory. Starts the game and captures process stdout/stderr
# where the game build actually emits it. In-game con_logfile remains the reliable source.
param(
  [Parameter(Mandatory=$true)][string]$GameExe,
  [string]$ArgsLine = "",
  [string]$OutputRoot = "$PSScriptRoot\..\..\logs"
)
$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$runDir = Join-Path $OutputRoot "run_$stamp"
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
@(
  "Started: $(Get-Date -Format o)"
  "Host: $env:COMPUTERNAME"
  "OS: $([System.Environment]::OSVersion.VersionString)"
  "Executable: $GameExe"
  "Arguments: $ArgsLine"
) | Set-Content -Encoding UTF8 (Join-Path $runDir "run-info.txt")

$p = Start-Process -FilePath $GameExe -ArgumentList $ArgsLine -PassThru -Wait `
  -RedirectStandardOutput (Join-Path $runDir "stdout.log") `
  -RedirectStandardError (Join-Path $runDir "stderr.log")
"ExitCode: $($p.ExitCode)`nFinished: $(Get-Date -Format o)" | Add-Content (Join-Path $runDir "run-info.txt")
Get-ChildItem $runDir -File | Get-FileHash | Format-Table -AutoSize | Out-String | Set-Content (Join-Path $runDir "SHA256.txt")
$zip = "$runDir.zip"
Compress-Archive -Path "$runDir\*" -DestinationPath $zip -Force
Write-Host "Collected: $zip"
