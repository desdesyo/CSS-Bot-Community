[CmdletBinding()]
param(
    [string]$Workspace = "C:\SOLO\CSS-v34-Mod",
    [string]$ProjectName = "CSS v34 Mod",
    [string]$GameRoot = "C:\Games\Counter-Strike Source v34"
)
$ErrorActionPreference = "Stop"
$packageRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$initializer = Join-Path $packageRoot "workshop\Initialize-SoloModWorkspace.ps1"
$inventory = Join-Path $packageRoot "workshop\Get-SoloModInventory.ps1"
$agent = Join-Path $packageRoot "computer-bridge\agent.mjs"
if (-not (Test-Path -LiteralPath $initializer -PathType Leaf) -or
    -not (Test-Path -LiteralPath $inventory -PathType Leaf) -or
    -not (Test-Path -LiteralPath $agent -PathType Leaf)) {
    throw "Starter kit is incomplete. Extract the complete SOLO-Local-Mod-Workshop package before running setup."
}
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw "Node.js 20+ is required for the computer bridge. Install Node.js, then rerun this setup." }
$nodeVersion = (& node --version).Trim()
if ($nodeVersion -notmatch '^v(20|2[1-9]|[3-9][0-9])\.') { throw "Node.js 20 or newer is required; found $nodeVersion." }

$manifest = Join-Path ([IO.Path]::GetFullPath($Workspace)) ".solo\project.json"
if (Test-Path -LiteralPath $manifest -PathType Leaf) {
    Write-Host "Existing SOLO workspace found; preserving it: $Workspace" -ForegroundColor Yellow
} else {
    & $initializer -Path $Workspace -ProjectName $ProjectName -GameRoot $GameRoot
}
& $inventory -Path $Workspace

Write-Host ""
Write-Host "SOLO local workspace initialized." -ForegroundColor Green
Write-Host "Workspace: $Workspace"
Write-Host "Game root is recorded as metadata only; no game files were read or changed."
Write-Host ""
Write-Host "Next: open SOLO.Chat and choose Connect computer to get a one-time pairing code."
Write-Host "Then run these commands from the extracted starter-kit folder:"
Write-Host ('  node "' + $agent + '" pair https://cssbc-github-chat.descapan.workers.dev 123456')
Write-Host ('  node "' + $agent + '"')
Write-Host "Replace 123456 with the current code. Keep the agent terminal open."
