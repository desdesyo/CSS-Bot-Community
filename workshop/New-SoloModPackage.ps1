[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Workspace,
    [string]$PackageName = "css-v34-mod",
    [ValidateRange(1, 100000)][int]$MaxFiles = 20000,
    [ValidateRange(1, 4096)][int]$MaxTotalSizeMb = 1024,
    [switch]$Force
)
$ErrorActionPreference = "Stop"
$workspacePath = (Resolve-Path -LiteralPath $Workspace).Path
$manifestPath = Join-Path $workspacePath ".solo\project.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) { throw "Workspace manifest not found." }
if ($PackageName -notmatch '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$') { throw "PackageName may contain only letters, numbers, dot, underscore and hyphen." }

$project = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$packageDir = Join-Path $workspacePath "build\packages"
New-Item -ItemType Directory -Path $packageDir -Force | Out-Null
$stamp = [DateTime]::UtcNow.ToString("yyyyMMdd-HHmmss")
$zipPath = Join-Path $packageDir ($PackageName + "-" + $stamp + ".zip")
if ((Test-Path -LiteralPath $zipPath) -and -not $Force) { throw "Package already exists: $zipPath" }

$stage = Join-Path ([IO.Path]::GetTempPath()) ("solo-package-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $stage -Force | Out-Null
$maxBytes = [int64]$MaxTotalSizeMb * 1MB
$files = New-Object System.Collections.Generic.List[object]
$totalBytes = [int64]0
$allowedRoots = @("src", "assets", "ui", "maps", "build", "docs", "tests")
try {
    foreach ($rootName in $allowedRoots) {
        $sourceRoot = Join-Path $workspacePath $rootName
        if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) { continue }
        Get-ChildItem -LiteralPath $sourceRoot -File -Recurse -Force -ErrorAction Stop | ForEach-Object {
            $file = $_
            if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return }
            $relative = $file.FullName.Substring($workspacePath.TrimEnd('\').Length).TrimStart('\').Replace('\','/')
            if ($relative -like "build/packages/*") { return }
            if ($files.Count -ge $MaxFiles) { throw "Package file limit ($MaxFiles) exceeded." }
            $totalBytes += [int64]$file.Length
            if ($totalBytes -gt $maxBytes) { throw "Package size limit ($MaxTotalSizeMb MB) exceeded." }
            $destination = Join-Path $stage ($relative.Replace('/', [IO.Path]::DirectorySeparatorChar))
            $destinationDir = Split-Path -Parent $destination
            New-Item -ItemType Directory -Path $destinationDir -Force | Out-Null
            Copy-Item -LiteralPath $file.FullName -Destination $destination
            $hash = (Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant()
            $files.Add([pscustomobject]@{ path = $relative; sizeBytes = [int64]$file.Length; sha256 = $hash })
        }
    }
    if ($files.Count -eq 0) { throw "No packageable project files found." }
    $packageManifest = [ordered]@{
        schemaVersion = 1
        packageName = $PackageName
        projectName = $project.projectName
        target = $project.target
        createdUtc = [DateTime]::UtcNow.ToString("o")
        fileCount = $files.Count
        totalSizeBytes = $totalBytes
        hashAlgorithm = "SHA-256"
        files = $files.ToArray()
        installNote = "Archive only. Review file destinations and back up the game before any manual installation. No game files were modified."
    }
    $packageManifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $stage "package-manifest.json") -Encoding UTF8
    if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($stage, $zipPath, [IO.Compression.CompressionLevel]::Optimal, $false)
    $zipHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant()
    $result = [ordered]@{
        schemaVersion = 1
        status = "package_created_and_hash_verified"
        package = $zipPath
        packageSha256 = $zipHash
        fileCount = $files.Count
        totalSizeBytes = $totalBytes
        manifestIncluded = $true
        createdUtc = [DateTime]::UtcNow.ToString("o")
    }
    $result | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $packageDir ($PackageName + "-" + $stamp + ".result.json")) -Encoding UTF8
    Write-Host "Package created: $zipPath" -ForegroundColor Green
    Write-Host "Files: $($files.Count); payload bytes: $totalBytes; ZIP SHA-256: $zipHash"
}
finally {
    if (Test-Path -LiteralPath $stage) { Remove-Item -LiteralPath $stage -Recurse -Force }
}
