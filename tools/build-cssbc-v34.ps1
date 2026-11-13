$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$sdkRoot = Join-Path $repoRoot "external\cssv34-sdk"
$external = Join-Path $repoRoot "external"
$buildDir = Join-Path $repoRoot "build-v34"
$distDir = Join-Path $repoRoot "dist"
$sourceCommit = "a410d4f10a1bc914b7789da476f32e9d7c36b75d"
$sourceUrl = "https://codeload.github.com/rusherr-c/cssv34-sdk/zip/$sourceCommit"

function Step([string]$message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Find-CMake {
    $command = Get-Command cmake -ErrorAction SilentlyContinue
    if ($command) { return $command.Source }
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        $vsPath = & $vswhere -latest -products "*" -property installationPath | Select-Object -First 1
        $candidate = Join-Path $vsPath "Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
        if (Test-Path $candidate) { return $candidate }
    }
    throw "CMake not found. Add C++ CMake tools in Visual Studio Installer."
}

function Find-MSBuild {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (!(Test-Path $vswhere)) { throw "Visual Studio Installer (vswhere.exe) not found." }
    $path = & $vswhere -latest -products "*" -requires Microsoft.Component.MSBuild -find "MSBuild\Current\Bin\MSBuild.exe" | Select-Object -First 1
    if (!$path) { throw "MSBuild not found. Install Desktop development with C++." }
    return $path
}

Step "Build and test the portable CSSBC core"
$cmake = Find-CMake
$ctest = Join-Path (Split-Path $cmake -Parent) "ctest.exe"
if (!(Test-Path $ctest)) {
    $ctestCommand = Get-Command ctest -ErrorAction SilentlyContinue
    if (!$ctestCommand) { throw "CTest was not found next to CMake or on PATH." }
    $ctest = $ctestCommand.Source
}
& $cmake -S $repoRoot -B $buildDir -A Win32
if ($LASTEXITCODE -ne 0) { throw "CMake configuration failed ($LASTEXITCODE)." }
& $cmake --build $buildDir --config Release --parallel
if ($LASTEXITCODE -ne 0) { throw "Portable C++ core build failed ($LASTEXITCODE)." }
& $ctest --test-dir $buildDir -C Release --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Portable core tests failed ($LASTEXITCODE)." }

Step "Prepare the exact Counter-Strike: Source v34 game source"
New-Item -ItemType Directory -Force -Path $external | Out-Null
$marker = Join-Path $sdkRoot ".cssbc-source-commit"
$existingCommit = if (Test-Path $marker) { (Get-Content $marker -Raw).Trim() } else { "" }
if ($existingCommit -ne $sourceCommit -or !(Test-Path (Join-Path $sdkRoot "everything.sln"))) {
    if (Test-Path $sdkRoot) { Remove-Item $sdkRoot -Recurse -Force }
    $zip = Join-Path $env:TEMP "cssv34-sdk-$sourceCommit.zip"
    $extract = Join-Path $env:TEMP "cssv34-sdk-extract"
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Invoke-WebRequest -UseBasicParsing -Uri $sourceUrl -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    $archiveRoot = Get-ChildItem $extract -Directory | Select-Object -First 1
    if (!$archiveRoot) { throw "The CS:S v34 source archive is empty." }
    New-Item -ItemType Directory -Force -Path $sdkRoot | Out-Null
    Copy-Item (Join-Path $archiveRoot.FullName "*") $sdkRoot -Recurse -Force
    Set-Content -Path $marker -Value $sourceCommit -NoNewline
}
$required = @(
    "everything.sln",
    "game\server\server_cstrike.vcxproj",
    "game\server\cstrike\bot\cs_bot_manager.cpp",
    "game\server\cstrike\bot\cs_bot_update.cpp"
)
foreach ($relative in $required) {
    if (!(Test-Path (Join-Path $sdkRoot $relative))) {
        throw "The pinned CS:S v34 source archive is missing: $relative"
    }
}
if (!(Test-Path (Join-Path $sdkRoot "LICENSE")) -and !(Test-Path (Join-Path $sdkRoot "LICENSE.md"))) {
    Write-Warning "The upstream cssv34-sdk archive contains no LICENSE file. This build downloads it locally and does not redistribute its source or compiled game DLL."
}

Step "Apply CSSBC bot and MVP integration to the local v34 source"
$patcher = Join-Path $PSScriptRoot "patch-cssv34-sdk.ps1"
& $patcher -SdkRoot $sdkRoot -RepoRoot $repoRoot
if ($LASTEXITCODE -ne 0) { throw "Applying the CS:S v34 integration patch failed." }

Step "Build the native CS:S v34 server DLL (Win32 Release)"
$msbuild = Find-MSBuild
$serverProject = Join-Path $sdkRoot "game\server\server_cstrike.vcxproj"
$serverOutput = Join-Path $sdkRoot "game\cstrike\bin\server.dll"
$arguments = @(
    $serverProject,
    "/m",
    "/p:Configuration=Release CSTRIKE",
    "/p:Platform=Win32",
    "/p:SolutionDir=$sdkRoot\"
)
& $msbuild @arguments
if ($LASTEXITCODE -ne 0) { throw "CS:S v34 server DLL build failed ($LASTEXITCODE)." }
if (!(Test-Path $serverOutput)) {
    throw "The server project did not create the expected DLL: $serverOutput"
}

New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item $serverOutput (Join-Path $distDir "Server.dll") -Force

Step "Build complete"
Write-Host "Portable core tests: PASSED" -ForegroundColor Green
Write-Host "Native CS:S v34 server DLL: $(Join-Path $distDir 'Server.dll')" -ForegroundColor Green
Write-Host "Install it with INSTALL_CSSBC.bat. The installer keeps a backup of the original server.dll."
Write-Host "Upstream source was downloaded locally; it was not added to the CSSBC repository."
