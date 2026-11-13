param(
    [Parameter(Mandatory = $true)][string]$GameDir,
    [string]$AnalysisRepo = "desdesyo/CSSBC-Match-Data",
    [int]$QuietSeconds = 90,
    [int]$PollSeconds = 15
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($AnalysisRepo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$') {
    throw "AnalysisRepo must be owner/repository."
}
if ($QuietSeconds -lt 1 -or $PollSeconds -lt 1) {
    throw "QuietSeconds and PollSeconds must be positive integers."
}
if (-not (Test-Path -LiteralPath $GameDir -PathType Container)) {
    throw "Game directory does not exist: $GameDir"
}

$root = Join-Path $env:LOCALAPPDATA "CSSBC"
$queue = Join-Path $root "LogQueue"
$stateFile = Join-Path $root "uploaded-state.json"
$statusFile = Join-Path $root "log-collector-status.txt"
New-Item -ItemType Directory -Force -Path $root, $queue | Out-Null

function Write-Status([string]$Message) {
    $line = "$(Get-Date -Format o) $Message"
    Add-Content -LiteralPath $statusFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Get-GitHubToken {
    if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
        throw "GitHub CLI (gh) is not installed. Install it and run 'gh auth login' once."
    }
    $token = (& gh auth token --hostname github.com 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($token)) {
        throw "GitHub CLI is not authenticated. Run 'gh auth login' once as this Windows user."
    }
    return $token.Trim()
}

function Send-QueuedFile([string]$Path, [string]$Token, [string]$RemotePath) {
    $bytes = [IO.File]::ReadAllBytes($Path)
    $headers = @{
        Authorization = "Bearer $Token"
        Accept = "application/vnd.github+json"
        "X-GitHub-Api-Version" = "2022-11-28"
    }
    $uri = "https://api.github.com/repos/$AnalysisRepo/contents/$RemotePath"
    $payload = @{
        message = "CSSBC: collect $(Split-Path $RemotePath -Leaf)"
        content = [Convert]::ToBase64String($bytes)
    }
    try {
        $existing = Invoke-RestMethod -Method Get -Uri $uri -Headers $headers
        if ($existing.sha) { $payload.sha = $existing.sha }
    }
    catch {
        $statusCode = 0
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -ne 404) { throw }
    }
    $body = $payload | ConvertTo-Json -Compress
    Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body -ContentType "application/json" | Out-Null
}

$token = $null
while (-not $token) {
    try {
        $token = Get-GitHubToken
        $headers = @{
            Authorization = "Bearer $token"
            Accept = "application/vnd.github+json"
            "X-GitHub-Api-Version" = "2022-11-28"
        }
        Invoke-RestMethod -Uri "https://api.github.com/repos/$AnalysisRepo" -Headers $headers | Out-Null
        Write-Status "STARTED; game=$GameDir; destination=$AnalysisRepo"
    }
    catch {
        $token = $null
        Write-Status "WAITING FOR GITHUB AUTH/ACCESS: $_"
        Start-Sleep -Seconds 60
    }
}

$state = @{}
if (Test-Path -LiteralPath $stateFile) {
    try {
        $loaded = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json
        foreach ($property in $loaded.PSObject.Properties) {
            $state[$property.Name] = $property.Value
        }
    }
    catch {
        Write-Status "State file unreadable; starting fresh."
    }
}

$watchPaths = @(
    (Join-Path $GameDir "console.log"),
    (Join-Path $GameDir "cstrike\console.log"),
    (Join-Path $GameDir "cstrike\logs"),
    (Join-Path $GameDir "cstrike"),
    (Join-Path $GameDir "cstrike\addons\cssbc")
)
Write-Status "Watching game logs and CSSBC logs. Quiet threshold=$QuietSeconds seconds."

while ($true) {
    # Retry durable queued uploads first. Original game logs are never deleted.
    foreach ($pending in (Get-ChildItem -LiteralPath $queue -File -Filter "*.log" -ErrorAction SilentlyContinue)) {
        try {
            $base = [IO.Path]::GetFileNameWithoutExtension($pending.Name)
            $manifestPath = $pending.FullName + ".json"
            Send-QueuedFile -Path $pending.FullName -Token $token -RemotePath ("matches/" + $base + ".log")
            if (Test-Path -LiteralPath $manifestPath) {
                Send-QueuedFile -Path $manifestPath -Token $token -RemotePath ("matches/" + $base + ".json")
            }
            if (Test-Path -LiteralPath $manifestPath) {
                Remove-Item -LiteralPath $manifestPath -Force
            }
            Remove-Item -LiteralPath $pending.FullName -Force
            Write-Status "RETRY UPLOADED $base"
        }
        catch {
            Write-Status "RETRY FAILED $($pending.Name): $_"
        }
    }

    $files = @()
    foreach ($path in $watchPaths) {
        if (Test-Path -LiteralPath $path -PathType Leaf) {
            $files += Get-Item -LiteralPath $path
        }
        elseif (Test-Path -LiteralPath $path -PathType Container) {
            $files += Get-ChildItem -LiteralPath $path -File -Filter "*.log" -ErrorAction SilentlyContinue
        }
    }

    foreach ($file in ($files | Sort-Object FullName -Unique)) {
        try {
            if ($file.Length -le 0) { continue }
            if (((Get-Date).ToUniversalTime() - $file.LastWriteTimeUtc).TotalSeconds -lt $QuietSeconds) { continue }

            $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
            $key = $file.FullName.ToLowerInvariant()
            if ($state.ContainsKey($key) -and $state[$key] -eq $hash) { continue }

            $stamp = $file.LastWriteTimeUtc.ToString("yyyyMMdd_HHmmss")
            $safe = $file.BaseName -replace '[^A-Za-z0-9_-]', '_'
            $queueName = $stamp + "_" + $safe + "_" + $hash.Substring(0, 12)
            $queuedPath = Join-Path $queue ($queueName + ".log")
            $manifestPath = $queuedPath + ".json"

            if (-not (Test-Path -LiteralPath $queuedPath)) {
                Copy-Item -LiteralPath $file.FullName -Destination $queuedPath
            }
            $manifest = [ordered]@{
                captured_utc = (Get-Date).ToUniversalTime().ToString("o")
                source_path = $file.FullName
                source_name = $file.Name
                bytes = $file.Length
                sha256 = $hash
            } | ConvertTo-Json -Compress
            Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding UTF8

            try {
                Send-QueuedFile -Path $queuedPath -Token $token -RemotePath ("matches/" + $queueName + ".log")
                Send-QueuedFile -Path $manifestPath -Token $token -RemotePath ("matches/" + $queueName + ".json")
                Remove-Item -LiteralPath $queuedPath, $manifestPath -Force
                $state[$key] = $hash
                $state | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $stateFile -Encoding UTF8
                Write-Status "UPLOADED $queueName"
            }
            catch {
                Write-Status "QUEUED (will retry): $queueName; $_"
            }
        }
        catch {
            Write-Status "SCAN ERROR $($file.FullName): $_"
        }
    }

    Start-Sleep -Seconds $PollSeconds
}
