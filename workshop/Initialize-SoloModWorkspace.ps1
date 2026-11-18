[CmdletBinding()]
param(
    [string]$Path = ".\SOLO-Mod-Workspace",
    [string]$ProjectName = "CSS v34 Mod",
    [string]$GameRoot = "C:\Games\Counter-Strike Source v34"
)

$ErrorActionPreference = "Stop"
$workspace = [System.IO.Path]::GetFullPath($Path)
$folders = @(
    "src\plugins", "src\scripts", "src\configs",
    "assets\models", "assets\materials", "assets\textures", "assets\images",
    "assets\audio\music", "assets\audio\sfx", "assets\video",
    "ui", "maps", "build", "tests", "docs", ".solo"
)
New-Item -ItemType Directory -Path $workspace -Force | Out-Null
foreach ($folder in $folders) {
    New-Item -ItemType Directory -Path (Join-Path $workspace $folder) -Force | Out-Null
}
$manifestPath = Join-Path $workspace ".solo\project.json"
if (Test-Path -LiteralPath $manifestPath) {
    throw "A SOLO project manifest already exists at '$manifestPath'. Refusing to overwrite it."
}
$manifest = [ordered]@{
    schemaVersion = 1
    projectName = $ProjectName
    projectType = "source-engine-mod"
    target = [ordered]@{
        game = "Counter-Strike: Source"
        edition = "v34"
        gameRoot = $GameRoot
    }
    directories = $folders
    policies = [ordered]@{
        gameFilesAreReadOnlyByDefault = $true
        generatedFilesStayInsideWorkspace = $true
        installationRequiresSeparateApproval = $true
    }
    createdUtc = [DateTime]::UtcNow.ToString("o")
}
$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $manifestPath -Encoding UTF8
$readme = @"
# $ProjectName

Local-first mod workspace for Counter-Strike: Source v34.

- Source code and configs: src/
- Models, materials, textures and media: assets/
- UI and maps: ui/ and maps/
- Build output and tests: build/ and tests/
- Project metadata: .solo/project.json

The game installation is recorded as a target only. This initializer does not
read, modify, install into, or launch the game. Keep source assets and generated
outputs in this workspace. Installation should be a separate, reviewed step.
"@
$readmePath = Join-Path $workspace "README.md"
if (-not (Test-Path -LiteralPath $readmePath)) {
    $readme | Set-Content -LiteralPath $readmePath -Encoding UTF8
}
Write-Host "SOLO mod workspace created: $workspace" -ForegroundColor Green
Write-Host "Manifest: $manifestPath"
Write-Host "Next: run Get-SoloModInventory.ps1 -Path `"$workspace`" to create a local SHA-256 inventory."
