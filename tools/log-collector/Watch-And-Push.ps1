param([Parameter(Mandatory=$true)][string]$GameDir,[string]$AnalysisRepo="desdesyo/CSSBC-Match-Data",[int]$QuietSeconds=90,[int]$PollSeconds=15)
$ErrorActionPreference="Stop"
$root=Join-Path $env:LOCALAPPDATA "CSSBC"; $queue=Join-Path $root "LogQueue"; $stateFile=Join-Path $root "uploaded-state.json"; $statusFile=Join-Path $root "log-collector-status.txt"
New-Item -ItemType Directory -Force $root,$queue | Out-Null
function Write-Status([string]$Message){$line="$(Get-Date -Format o) $Message";Add-Content -LiteralPath $statusFile -Value $line -Encoding UTF8;Write-Host $line}
function Get-GitHubToken {
 if(-not(Get-Command gh -ErrorAction SilentlyContinue)){throw "GitHub CLI (gh) is not installed. Install it and run 'gh auth login' once."}
 $t=(& gh auth token --hostname github.com 2>$null | Select-Object -First 1)
 if($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($t)){throw "GitHub CLI is not authenticated. Run 'gh auth login' once as this Windows user."}
 return $t.Trim()
}
function Send-QueuedFile([string]$Path,[string]$Token,[string]$RemotePath){
 $bytes=[IO.File]::ReadAllBytes($Path);$headers=@{Authorization="Bearer $Token";Accept="application/vnd.github+json";"X-GitHub-Api-Version"="2022-11-28"}
 $uri="https://api.github.com/repos/$AnalysisRepo/contents/$RemotePath"
 $payload=@{message="CSSBC: collect $(Split-Path $RemotePath -Leaf)";content=[Convert]::ToBase64String($bytes)}
 try{$existing=Invoke-RestMethod -Method Get -Uri $uri -Headers $headers;if($existing.sha){$payload.sha=$existing.sha}}catch{if($_.Exception.Response.StatusCode.value__ -ne 404){throw}}
 $body=$payload|ConvertTo-Json -Compress
 Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body -ContentType "application/json" | Out-Null
}
if($AnalysisRepo -notmatch '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+
$state=@{}
if(Test-Path $stateFile){try{$loaded=Get-Content $stateFile -Raw|ConvertFrom-Json;foreach($p in $loaded.PSObject.Properties){$state[$p.Name]=$p.Value}}catch{Write-Status "State file unreadable; starting fresh."}}
$watchPaths=@((Join-Path $GameDir "console.log"),(Join-Path $GameDir "cstrike\console.log"),(Join-Path $GameDir "cstrike\logs"),(Join-Path $GameDir "cstrike"),(Join-Path $GameDir "cstrike\addons\cssbc"))
Write-Status "Watching console.log, cstrike logs and CSSBC logs. Quiet threshold=$QuietSeconds seconds."
while($true){
 # Retry all previously queued uploads, even if the original game log has rotated or disappeared.
 foreach($pending in (Get-ChildItem -LiteralPath $queue -File -Filter "*.log" -ErrorAction SilentlyContinue)){
  try{
   $base=[IO.Path]::GetFileNameWithoutExtension($pending.Name)
   $pendingManifest=$pending.FullName+".json"
   Send-QueuedFile -Path $pending.FullName -Token $token -RemotePath ("matches/"+$base+".log")
   if(Test-Path $pendingManifest){Send-QueuedFile -Path $pendingManifest -Token $token -RemotePath ("matches/"+$base+".json");Remove-Item $pendingManifest -Force}
   Remove-Item $pending.FullName -Force
   Write-Status "RETRY UPLOADED $base"
  }catch{Write-Status "RETRY FAILED $($pending.Name): $_"}
 }
 $files=@()
 foreach($p in $watchPaths){if(Test-Path -LiteralPath $p -PathType Leaf){$files+=Get-Item -LiteralPath $p}elseif(Test-Path -LiteralPath $p -PathType Container){$files+=Get-ChildItem -LiteralPath $p -File -Filter "*.log" -ErrorAction SilentlyContinue}}
 foreach($f in ($files|Sort-Object FullName -Unique)){
  try{
   if($f.Length -le 0){continue};if(((Get-Date).ToUniversalTime()-$f.LastWriteTimeUtc).TotalSeconds -lt $QuietSeconds){continue}
   $hash=(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash;$key=$f.FullName.ToLowerInvariant()
   if($state.ContainsKey($key) -and $state[$key] -eq $hash){continue}
   $stamp=$f.LastWriteTimeUtc.ToString("yyyyMMdd_HHmmss");$safe=$f.BaseName -replace '[^A-Za-z0-9_-]','_';$queueName=$stamp+"_"+$safe+"_"+$hash.Substring(0,12)
   $queued=Join-Path $queue ($queueName+".log");if(-not(Test-Path $queued)){Copy-Item -LiteralPath $f.FullName -Destination $queued}
   $manifest=[ordered]@{captured_utc=(Get-Date).ToUniversalTime().ToString("o");source_path=$f.FullName;source_name=$f.Name;bytes=$f.Length;sha256=$hash}|ConvertTo-Json -Compress
   $manifestPath=$queued+".json";Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding UTF8
   try{
    Send-QueuedFile -Path $queued -Token $token -RemotePath ("matches/"+$queueName+".log")
    Send-QueuedFile -Path $manifestPath -Token $token -RemotePath ("matches/"+$queueName+".json")
    Remove-Item $queued,$manifestPath -Force;$state[$key]=$hash;$state|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $stateFile -Encoding UTF8
    Write-Status "UPLOADED $queueName"
   }catch{Write-Status "QUEUED (will retry): $queueName; $_"}
  }catch{Write-Status "SCAN ERROR $($f.FullName): $_"}
 }
 Start-Sleep -Seconds $PollSeconds
}
){throw "AnalysisRepo must be owner/repository."}
$token=$null;$headers=$null
while(-not $token){
 try{
  $token=Get-GitHubToken
  $headers=@{Authorization="Bearer $token";Accept="application/vnd.github+json";"X-GitHub-Api-Version"="2022-11-28"}
  Invoke-RestMethod -Uri "https://api.github.com/repos/$AnalysisRepo" -Headers $headers | Out-Null
  Write-Status "STARTED; game=$GameDir; destination=$AnalysisRepo"
 }catch{
  $token=$null;$headers=$null
  Write-Status "WAITING FOR GITHUB AUTH/ACCESS: $_"
  Start-Sleep -Seconds 60
 }
}
$state=@{}
if(Test-Path $stateFile){try{$loaded=Get-Content $stateFile -Raw|ConvertFrom-Json;foreach($p in $loaded.PSObject.Properties){$state[$p.Name]=$p.Value}}catch{Write-Status "State file unreadable; starting fresh."}}
$watchPaths=@((Join-Path $GameDir "console.log"),(Join-Path $GameDir "cstrike\console.log"),(Join-Path $GameDir "cstrike\logs"),(Join-Path $GameDir "cstrike"),(Join-Path $GameDir "cstrike\addons\cssbc"))
Write-Status "Watching console.log, cstrike logs and CSSBC logs. Quiet threshold=$QuietSeconds seconds."
while($true){
 # Retry all previously queued uploads, even if the original game log has rotated or disappeared.
 foreach($pending in (Get-ChildItem -LiteralPath $queue -File -Filter "*.log" -ErrorAction SilentlyContinue)){
  try{
   $base=[IO.Path]::GetFileNameWithoutExtension($pending.Name)
   $pendingManifest=$pending.FullName+".json"
   Send-QueuedFile -Path $pending.FullName -Token $token -RemotePath ("matches/"+$base+".log")
   if(Test-Path $pendingManifest){Send-QueuedFile -Path $pendingManifest -Token $token -RemotePath ("matches/"+$base+".json");Remove-Item $pendingManifest -Force}
   Remove-Item $pending.FullName -Force
   Write-Status "RETRY UPLOADED $base"
  }catch{Write-Status "RETRY FAILED $($pending.Name): $_"}
 }
 $files=@()
 foreach($p in $watchPaths){if(Test-Path -LiteralPath $p -PathType Leaf){$files+=Get-Item -LiteralPath $p}elseif(Test-Path -LiteralPath $p -PathType Container){$files+=Get-ChildItem -LiteralPath $p -File -Filter "*.log" -ErrorAction SilentlyContinue}}
 foreach($f in ($files|Sort-Object FullName -Unique)){
  try{
   if($f.Length -le 0){continue};if(((Get-Date).ToUniversalTime()-$f.LastWriteTimeUtc).TotalSeconds -lt $QuietSeconds){continue}
   $hash=(Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash;$key=$f.FullName.ToLowerInvariant()
   if($state.ContainsKey($key) -and $state[$key] -eq $hash){continue}
   $stamp=$f.LastWriteTimeUtc.ToString("yyyyMMdd_HHmmss");$safe=$f.BaseName -replace '[^A-Za-z0-9_-]','_';$queueName=$stamp+"_"+$safe+"_"+$hash.Substring(0,12)
   $queued=Join-Path $queue ($queueName+".log");if(-not(Test-Path $queued)){Copy-Item -LiteralPath $f.FullName -Destination $queued}
   $manifest=[ordered]@{captured_utc=(Get-Date).ToUniversalTime().ToString("o");source_path=$f.FullName;source_name=$f.Name;bytes=$f.Length;sha256=$hash}|ConvertTo-Json -Compress
   $manifestPath=$queued+".json";Set-Content -LiteralPath $manifestPath -Value $manifest -Encoding UTF8
   try{
    Send-QueuedFile -Path $queued -Token $token -RemotePath ("matches/"+$queueName+".log")
    Send-QueuedFile -Path $manifestPath -Token $token -RemotePath ("matches/"+$queueName+".json")
    Remove-Item $queued,$manifestPath -Force;$state[$key]=$hash;$state|ConvertTo-Json -Depth 5|Set-Content -LiteralPath $stateFile -Encoding UTF8
    Write-Status "UPLOADED $queueName"
   }catch{Write-Status "QUEUED (will retry): $queueName; $_"}
  }catch{Write-Status "SCAN ERROR $($f.FullName): $_"}
 }
 Start-Sleep -Seconds $PollSeconds
}
