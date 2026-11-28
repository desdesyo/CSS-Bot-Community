[CmdletBinding()]
param(
    [string]$GameRoot = "C:\Games\Counter-Strike Source v34",
    [string]$StudioMdlPath = "",
    [string]$VtexPath = "",
    [switch]$DryRun
)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Generator = Join-Path $PSScriptRoot "generate_armored_pack.py"
$Retargeter = Join-Path $PSScriptRoot "build_valvebiped_pack.py"
$GameRoot = [IO.Path]::GetFullPath($GameRoot)
$Cstrike = Join-Path $GameRoot "cstrike"
$GameInfo = Join-Path $Cstrike "gameinfo.txt"

function Fail([string]$Message) {
    Write-Error $Message
    exit 2
}
function Resolve-Tool([string]$Explicit, [string[]]$Candidates, [string]$Name) {
    if ($Explicit) {
        if (-not (Test-Path -LiteralPath $Explicit -PathType Leaf)) { Fail ($Name + " not found: " + $Explicit) }
        return (Resolve-Path -LiteralPath $Explicit).Path
    }
    foreach ($candidate in $Candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) { return (Resolve-Path -LiteralPath $candidate).Path }
    }
    Fail ($Name + " not found. Install matching Source SDK tools and pass the explicit tool path.")
}
if (-not (Test-Path -LiteralPath $GameInfo -PathType Leaf)) {
    Fail ("CS:S game folder not found: expected " + $GameInfo + ". Nothing was changed.")
}
if (-not (Test-Path -LiteralPath $Generator -PathType Leaf) -or -not (Test-Path -LiteralPath $Retargeter -PathType Leaf)) {
    Fail "Model source tools are missing from this repository checkout."
}
$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) { Fail "Python 3 is required. Nothing was changed." }

$StudioMdl = Resolve-Tool $StudioMdlPath @(
    (Join-Path $GameRoot "bin\studiomdl.exe"),
    (Join-Path $Cstrike "bin\studiomdl.exe"),
    (Join-Path $GameRoot "studiomdl.exe")
) "StudioMdl"
$Vtex = Resolve-Tool $VtexPath @(
    (Join-Path $GameRoot "bin\vtex.exe"),
    (Join-Path $Cstrike "bin\vtex.exe"),
    (Join-Path $GameRoot "vtex.exe")
) "Vtex"

$TempRoot = Join-Path ([IO.Path]::GetTempPath()) ("CSSBC-27-" + [Guid]::NewGuid().ToString("N"))
$BuildRoot = Join-Path $TempRoot "source"
$StageRoot = Join-Path $TempRoot "stage"
$StageGame = Join-Path $StageRoot "cstrike"
$StageMaterials = Join-Path $StageGame "materials\models\cssbc\player"
$StageModels = Join-Path $StageGame "models\cssbc\player"
$BackupRoot = Join-Path (Split-Path $GameRoot -Parent) ("CSSBC-backup-" + (Get-Date -Format "yyyyMMdd-HHmmss"))
$TargetModels = Join-Path $Cstrike "models\cssbc\player"
$TargetMaterials = Join-Path $Cstrike "materials\models\cssbc\player"
$Installed = $false

try {
    New-Item -ItemType Directory -Force -Path $BuildRoot, $StageGame, $StageMaterials, $StageModels | Out-Null
    Copy-Item -LiteralPath $GameInfo -Destination (Join-Path $StageGame "gameinfo.txt")
    Write-Host "[1/5] Generate 27 character source models"
    & $Python.Source $Generator --output $BuildRoot
    if ($LASTEXITCODE -ne 0) { throw "Source generation failed." }
    Write-Host "[2/5] Retarget models to ValveBiped"
    & $Python.Source $Retargeter --pack $BuildRoot
    if ($LASTEXITCODE -ne 0) { throw "ValveBiped retarget failed." }

    $MaterialSource = Join-Path $BuildRoot "materials\models\cssbc\player"
    Get-ChildItem -LiteralPath $MaterialSource -Filter "*.vmt" | Copy-Item -Destination $StageMaterials
    Get-ChildItem -LiteralPath $MaterialSource -Filter "*.tga" | Copy-Item -Destination $StageMaterials
    Write-Host "[3/5] Compile materials with vtex"
    foreach ($tga in Get-ChildItem -LiteralPath $StageMaterials -Filter "*.tga") {
        $relative = "materials/models/cssbc/player/" + $tga.Name
        Push-Location $StageGame
        try { & $Vtex -game $StageGame $relative }
        finally { Pop-Location }
        if ($LASTEXITCODE -ne 0) { throw ("vtex failed for " + $tga.Name) }
    }

    Write-Host "[4/5] Compile all 27 models with studiomdl"
    $roleFolders = @(Get-ChildItem -LiteralPath $BuildRoot -Directory | Where-Object { Test-Path (Join-Path $_.FullName "model.smd") })
    if ($roleFolders.Count -ne 27) { throw ("Expected 27 model folders, found " + $roleFolders.Count) }
    foreach ($folder in $roleFolders) {
        $qc = Get-ChildItem -LiteralPath $folder.FullName -Filter "*.qc" | Select-Object -First 1
        if (-not $qc) { throw ("QC missing for " + $folder.Name) }
        & $StudioMdl -game $StageGame -nop4 $qc.FullName
        if ($LASTEXITCODE -ne 0) { throw ("studiomdl failed for " + $folder.Name) }
        foreach ($extension in @(".mdl", ".vvd", ".dx90.vtx")) {
            $expected = Join-Path $StageModels ($folder.Name + $extension)
            if (-not (Test-Path -LiteralPath $expected -PathType Leaf)) {
                throw ("Compiler did not produce required file: " + $expected)
            }
        }
    }

    $manifest = [ordered]@{
        schemaVersion = 1
        game = "Counter-Strike: Source v34"
        modelCount = 27
        modelRoot = "models/cssbc/player"
        teamSelection = "not wired: requires a CS:S v34 game-DLL/server-plugin adapter"
        characters = @(
            $roleFolders | Sort-Object Name | ForEach-Object {
                [ordered]@{ id = $_.Name; model = "models/cssbc/player/$($_.Name).mdl" }
            }
        )
    }
    $manifestPath = Join-Path $StageGame "cfg\cssbc\player_roster.json"
    New-Item -ItemType Directory -Force -Path (Split-Path $manifestPath -Parent) | Out-Null
    $manifest | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $manifestPath -Encoding UTF8

    if ($DryRun) {
        Write-Host "Dry run passed: 27 MDL/VVD/DX90.VTX sets and materials compiled. No game files were changed."
        exit 0
    }

    Write-Host "[5/5] Back up existing CSSBC paths and install compiled assets"
    if ((Test-Path $TargetModels) -or (Test-Path $TargetMaterials)) {
        New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
        if (Test-Path $TargetModels) { Copy-Item $TargetModels (Join-Path $BackupRoot "models") -Recurse -Force }
        if (Test-Path $TargetMaterials) { Copy-Item $TargetMaterials (Join-Path $BackupRoot "materials") -Recurse -Force }
    }
    New-Item -ItemType Directory -Force -Path $TargetModels, $TargetMaterials | Out-Null
    Copy-Item -Path (Join-Path $StageModels "*") -Destination $TargetModels -Recurse -Force
    Copy-Item -Path (Join-Path $StageMaterials "*") -Destination $TargetMaterials -Recurse -Force
    $targetCfg = Join-Path $Cstrike "cfg\cssbc"
    New-Item -ItemType Directory -Force -Path $targetCfg | Out-Null
    Copy-Item -LiteralPath $manifestPath -Destination (Join-Path $targetCfg "player_roster.json") -Force
    $Installed = $true

    Write-Host ("Installed 27 compiled model assets into: " + $TargetModels)
    Write-Host ("Roster manifest: " + (Join-Path $targetCfg "player_roster.json"))
    if (Test-Path $BackupRoot) { Write-Host ("Backup: " + $BackupRoot) }
    Write-Warning "Assets are installed, but bots will not select these custom model paths until the CS:S v34 runtime adapter is built and loaded."
}
catch {
    Write-Error $_
    if ($Installed -and (Test-Path $BackupRoot)) {
        Write-Warning ("A backup exists at " + $BackupRoot + ". Restore it before retrying.")
    }
    exit 1
}
finally {
    if (Test-Path $TempRoot) { Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue }
}
