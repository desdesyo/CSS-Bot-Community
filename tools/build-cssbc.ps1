$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$buildDir = Join-Path $repoRoot "build"
$distDir = Join-Path $repoRoot "dist"

function Step([string]$message) {
    Write-Host ""
    Write-Host "==> $message" -ForegroundColor Cyan
}

function Find-Sdk([string[]]$candidates) {
    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        $required = @(
            "public\tier1\interface.h",
            "public\eiface.h",
            "public\engine\iserverplugin.h"
        )
        $valid = $true
        foreach ($relative in $required) {
            if (!(Test-Path (Join-Path $candidate $relative))) { $valid = $false; break }
        }
        if ($valid) { return (Resolve-Path $candidate).Path }
    }
    return $null
}

Step "Find the CS:S SDK"
$sdk = Find-Sdk @($env:CSSBC_SOURCE_SDK, "C:\SDK\hl2sdk-css", (Join-Path $repoRoot "external\hl2sdk-css"))
if (!$sdk) {
    Write-Host "No local SDK found. Downloading the public AlliedModders CS:S SDK archive (Git is not required)."
    $externalDir = Join-Path $repoRoot "external"
    New-Item -ItemType Directory -Force -Path $externalDir | Out-Null
    $zip = Join-Path $env:TEMP "hl2sdk-css.zip"
    $extract = Join-Path $externalDir "hl2sdk-css-download"
    Invoke-WebRequest -Uri "https://codeload.github.com/alliedmodders/hl2sdk/zip/refs/heads/css" -OutFile $zip
    if (Test-Path $extract) { Remove-Item $extract -Recurse -Force }
    Expand-Archive -Path $zip -DestinationPath $extract -Force
    $sdk = Find-Sdk @((Get-ChildItem $extract -Directory | Select-Object -First 1).FullName)
}
if (!$sdk) { throw "The downloaded SDK archive does not contain the expected CS:S headers." }
Write-Host "SDK: $sdk"

Step "Locate CMake"
$cmakeCommand = Get-Command cmake -ErrorAction SilentlyContinue
if ($cmakeCommand) {
    $cmake = $cmakeCommand.Source
} else {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
    if (Test-Path $vswhere) {
        $vsPath = & $vswhere -latest -products "*" -property installationPath | Select-Object -First 1
        $candidate = Join-Path $vsPath "Common7\IDE\CommonExtensions\Microsoft\CMake\CMake\bin\cmake.exe"
        if (Test-Path $candidate) { $cmake = $candidate }
    }
}
if (!$cmake) { throw "CMake was not found. In Visual Studio Installer, add C++ CMake tools for Windows." }
Write-Host "CMake: $cmake"

Step "Configure and build the portable C++ core (Win32 Release)"
& $cmake -S $repoRoot -B $buildDir -A Win32
if ($LASTEXITCODE -ne 0) { throw "CMake configuration failed ($LASTEXITCODE)." }
& $cmake --build $buildDir --config Release --parallel
if ($LASTEXITCODE -ne 0) { throw "C++ core build failed ($LASTEXITCODE)." }

Step "Run automated tests"
$ctest = Join-Path (Split-Path $cmake -Parent) "ctest.exe"
if (!(Test-Path $ctest)) {
    $ctestCommand = Get-Command ctest -ErrorAction SilentlyContinue
    if (!$ctestCommand) { throw "CTest was not found next to CMake or on PATH." }
    $ctest = $ctestCommand.Source
}
& $ctest --test-dir $buildDir -C Release --output-on-failure
if ($LASTEXITCODE -ne 0) { throw "Automated tests failed ($LASTEXITCODE)." }

Step "Build the native CS:S server-plugin bootstrap"
$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
if (!(Test-Path $vswhere)) { throw "Visual Studio Installer (vswhere.exe) was not found." }
$msbuild = & $vswhere -latest -products "*" -requires Microsoft.Component.MSBuild -find "MSBuild\Current\Bin\MSBuild.exe" | Select-Object -First 1
if (!$msbuild) { throw "MSBuild was not found. The Visual C++ desktop workload is required." }
$project = Join-Path $repoRoot "sdk\dll\CSSBC_VSP.vcxproj"
& $msbuild $project /m /p:Configuration=Release /p:Platform=Win32 "/p:CSSBC_SOURCE_SDK=$sdk"
if ($LASTEXITCODE -ne 0) { throw "Native plugin build failed ($LASTEXITCODE)." }

$dll = Join-Path $repoRoot "sdk\dll\bin\CSSBC_VSP.dll"
if (!(Test-Path $dll)) { throw "MSBuild finished but the expected DLL was not created: $dll" }
New-Item -ItemType Directory -Force -Path $distDir | Out-Null
Copy-Item $dll (Join-Path $distDir "CSSBC_VSP.dll") -Force

Step "Build complete"
Write-Host "Portable core: $buildDir"
Write-Host "Native bootstrap DLL: $(Join-Path $distDir 'CSSBC_VSP.dll')"
Write-Host "Automated tests: PASSED" -ForegroundColor Green
Write-Host ""
Write-Host "Note: the DLL is a diagnostic server-plugin bootstrap, not yet the full bot/gameplay implementation."
