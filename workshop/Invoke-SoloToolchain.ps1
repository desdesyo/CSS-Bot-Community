[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Workspace,
    [ValidateSet("doctor", "build-plugin")][string]$Mode = "doctor",
    [string]$SpcompPath,
    [string]$SourceFile,
    [string]$IncludeDirectory
)

$ErrorActionPreference = "Stop"
$workspacePath = (Resolve-Path -LiteralPath $Workspace).Path
$manifestPath = Join-Path $workspacePath ".solo\project.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Workspace manifest not found. Initialize the workspace first."
}

function Find-Tool([string]$Name, [string[]]$Candidates) {
    foreach ($candidate in $Candidates) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }
    $command = Get-Command $Name -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($command) { return $command.Source }
    return $null
}
function Get-ToolVersion([string]$Path, [string[]]$Arguments) {
    if (-not $Path) { return $null }
    try {
        $output = @(& $Path @Arguments 2>&1 | Select-Object -First 3)
        return (($output | ForEach-Object { "$_" }) -join " ").Trim()
    } catch { return "detected; version query failed: $($_.Exception.Message)" }
}

$sourceModHome = $env:SOURCEMOD_HOME
$tools = [ordered]@{
    sourcePawnCompiler = Find-Tool "spcomp" @(
        $SpcompPath,
        $(if ($sourceModHome) { Join-Path $sourceModHome "addons\sourcemod\scripting\spcomp.exe" } else { $null })
    )
    blender = Find-Tool "blender" @()
    ffmpeg = Find-Tool "ffmpeg" @()
    cmake = Find-Tool "cmake" @()
    dotnet = Find-Tool "dotnet" @()
    git = Find-Tool "git" @()
}
$versions = [ordered]@{
    sourcePawnCompiler = Get-ToolVersion $tools.sourcePawnCompiler @("--version")
    blender = Get-ToolVersion $tools.blender @("--version")
    ffmpeg = Get-ToolVersion $tools.ffmpeg @("-version")
    cmake = Get-ToolVersion $tools.cmake @("--version")
    dotnet = Get-ToolVersion $tools.dotnet @("--version")
    git = Get-ToolVersion $tools.git @("--version")
}

$report = [ordered]@{
    schemaVersion = 1
    generatedUtc = [DateTime]::UtcNow.ToString("o")
    workspace = $workspacePath
    mode = $Mode
    tools = $tools
    versions = $versions
}
$soloDir = Join-Path $workspacePath ".solo"
$reportPath = Join-Path $soloDir "toolchain.json"
$tempReport = $reportPath + ".tmp"
$report | ConvertTo-Json -Depth 6 | Set-Content -LiteralPath $tempReport -Encoding UTF8
Move-Item -LiteralPath $tempReport -Destination $reportPath -Force

if ($Mode -eq "doctor") {
    Write-Host "Toolchain report: $reportPath" -ForegroundColor Green
    foreach ($name in $tools.Keys) {
        $state = if ($tools[$name]) { "FOUND: $($tools[$name])" } else { "not found" }
        Write-Host ("{0}: {1}" -f $name, $state)
    }
    exit 0
}

if (-not $tools.sourcePawnCompiler) {
    throw "SourcePawn compiler not found. Install SourceMod SDK or pass -SpcompPath."
}
if (-not $SourceFile) { throw "-SourceFile is required for build-plugin mode." }
$sourceCandidate = [System.IO.Path]::GetFullPath((Join-Path $workspacePath $SourceFile))
$srcRoot = [System.IO.Path]::GetFullPath((Join-Path $workspacePath "src"))
$srcPrefix = $srcRoot.TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
if (-not $sourceCandidate.StartsWith($srcPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Plugin source must be inside the workspace src directory."
}
if (-not (Test-Path -LiteralPath $sourceCandidate -PathType Leaf)) {
    throw "Plugin source file does not exist: $SourceFile"
}
if ([IO.Path]::GetExtension($sourceCandidate) -ne ".sp") {
    throw "Only .sp SourcePawn source files can be compiled."
}
$buildDir = Join-Path $workspacePath "build"
New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
$outputName = [IO.Path]::GetFileNameWithoutExtension($sourceCandidate) + ".smx"
$outputPath = Join-Path $buildDir $outputName
$compilerArgs = @($sourceCandidate, "-o$outputPath")
if ($IncludeDirectory) {
    $includeCandidate = [System.IO.Path]::GetFullPath((Join-Path $workspacePath $IncludeDirectory))
    $includePrefix = [System.IO.Path]::GetFullPath((Join-Path $workspacePath "src")).TrimEnd([IO.Path]::DirectorySeparatorChar) + [IO.Path]::DirectorySeparatorChar
    if (-not $includeCandidate.StartsWith($includePrefix, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $includeCandidate -PathType Container)) {
        throw "Include directory must exist inside workspace src."
    }
    $compilerArgs += "-i$includeCandidate"
}
$logPath = Join-Path $buildDir "sourcepawn-build.log"
$started = [DateTime]::UtcNow
$compilerOutput = @(& $tools.sourcePawnCompiler @compilerArgs 2>&1)
$exitCode = $LASTEXITCODE
$compilerOutput | Set-Content -LiteralPath $logPath -Encoding UTF8
if ($exitCode -ne 0) {
    throw "SourcePawn compilation failed with exit code $exitCode. See build/sourcepawn-build.log."
}
if (-not (Test-Path -LiteralPath $outputPath -PathType Leaf)) {
    throw "Compiler returned success but did not create the expected .smx output."
}
$artifactHash = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash.ToLowerInvariant()
$buildResult = [ordered]@{
    schemaVersion = 1
    status = "compiled_and_hash_verified"
    source = $sourceCandidate.Substring($workspacePath.Length).TrimStart('\','/')
    compiler = $tools.sourcePawnCompiler
    startedUtc = $started.ToString("o")
    completedUtc = [DateTime]::UtcNow.ToString("o")
    exitCode = $exitCode
    output = "build/$outputName"
    sizeBytes = (Get-Item -LiteralPath $outputPath).Length
    sha256 = $artifactHash
    log = "build/sourcepawn-build.log"
}
$buildResult | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $buildDir "sourcepawn-build.json") -Encoding UTF8
Write-Host "Plugin compiled and SHA-256 verified: $outputPath" -ForegroundColor Green
Write-Host "SHA-256: $artifactHash"
