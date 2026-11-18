[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Path,
    [ValidateRange(1, 100000)][int]$MaxFiles = 20000,
    [ValidateRange(1, 4096)][int]$MaxHashSizeMb = 256
)
$ErrorActionPreference = "Stop"
$workspace = (Resolve-Path -LiteralPath $Path).Path
$manifestPath = Join-Path $workspace ".solo\project.json"
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "No .solo\project.json found. Initialize this workspace first."
}
$excluded = @("\.git\", "\node_modules\", "\bin\", "\obj\", "\build\", "\.solo\")
$maxHashBytes = [int64]$MaxHashSizeMb * 1MB
$records = New-Object System.Collections.Generic.List[object]
$seen = 0
Get-ChildItem -LiteralPath $workspace -File -Recurse -Force -ErrorAction Stop | ForEach-Object {
    $file = $_
    if (($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) { return }
    $full = $file.FullName
    $relative = $full.Substring($workspace.TrimEnd('\').Length).TrimStart('\')
    $normalized = "\" + $relative.Replace("/", "\")
    foreach ($segment in $excluded) {
        if ($normalized -like "*$segment*") { return }
    }
    $seen++
    if ($seen -gt $MaxFiles) { throw "File limit ($MaxFiles) exceeded. No inventory was written." }
    $hash = $null
    $hashStatus = "skipped_size_limit"
    if ($file.Length -le $maxHashBytes) {
        $hash = (Get-FileHash -LiteralPath $full -Algorithm SHA256).Hash.ToLowerInvariant()
        $hashStatus = "sha256"
    }
    $records.Add([pscustomobject]@{
        path = $relative.Replace("\", "/")
        sizeBytes = [int64]$file.Length
        modifiedUtc = $file.LastWriteTimeUtc.ToString("o")
        hashAlgorithm = $hashStatus
        sha256 = $hash
    })
}
$result = [ordered]@{
    schemaVersion = 1
    generatedUtc = [DateTime]::UtcNow.ToString("o")
    workspace = $workspace
    fileCount = $records.Count
    hashLimitBytes = $maxHashBytes
    files = $records.ToArray()
}
$outputDir = Join-Path $workspace ".solo"
$outputPath = Join-Path $outputDir "inventory.json"
$tempPath = $outputPath + ".tmp"
$result | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $tempPath -Encoding UTF8
Move-Item -LiteralPath $tempPath -Destination $outputPath -Force
$skipped = 0
foreach ($record in $records) { if ($record.hashAlgorithm -ne "sha256") { $skipped++ } }
Write-Host "Inventory written: $outputPath" -ForegroundColor Green
Write-Host "Files: $($records.Count); hashes skipped by size limit: $skipped"
