param(
 [Parameter(Mandatory=$true)][string]$WatchPath,
 [Parameter(Mandatory=$true)][string]$AnalysisRepo,
 [string]$QueuePath="$PSScriptRoot\Queue",
 [int]$QuietSeconds=90
)
$ErrorActionPreference="Stop"
foreach($cmd in @("git","gh")){if(-not(Get-Command $cmd -ErrorAction SilentlyContinue)){throw "$cmd is required. Install it first."}}
gh auth status | Out-Null
if(-not(Test-Path $WatchPath)){New-Item -ItemType Directory -Force $WatchPath | Out-Null}
New-Item -ItemType Directory -Force $QueuePath | Out-Null
$repoDir=Join-Path $QueuePath "analysis-repo"
if(-not(Test-Path (Join-Path $repoDir ".git"))){
  $url="https://github.com/$AnalysisRepo.git"
  git clone $url $repoDir
}
$processed=@{}
Write-Host "Watching $WatchPath; target=$AnalysisRepo. Ctrl+C to stop."
while($true){
  Get-ChildItem $WatchPath -File -Filter "*.log" | ForEach-Object {
    $f=$_
    try{
      $key=$f.FullName
      $signature="$($f.Length):$($f.LastWriteTimeUtc.Ticks)"
      if($processed.ContainsKey($key) -and $processed[$key] -eq $signature){return}
      $age=((Get-Date).ToUniversalTime()-$f.LastWriteTimeUtc).TotalSeconds
      if($age -lt $QuietSeconds){return}
      $stamp=Get-Date -Format "yyyyMMdd_HHmmss"
      $safe=[IO.Path]::GetFileNameWithoutExtension($f.Name) -replace '[^a-zA-Z0-9_-]','_'
      $dest=Join-Path $repoDir "matches/$stamp-$safe"
      New-Item -ItemType Directory -Force $dest | Out-Null
      Copy-Item $f.FullName (Join-Path $dest "console.log") -Force
      $manifest=@{
        captured_utc=(Get-Date).ToUniversalTime().ToString("o")
        source_file=$f.Name
        bytes=$f.Length
        sha256=(Get-FileHash $f.FullName -Algorithm SHA256).Hash
        note="Automatically captured after $QuietSeconds seconds of inactivity."
      } | ConvertTo-Json -Depth 4
      $manifest | Set-Content (Join-Path $dest "manifest.json") -Encoding UTF8
      git -C $repoDir add "matches/$stamp-$safe"
      git -C $repoDir -c user.name="CSSBC Log Collector" -c user.email="cssbc-logcollector@users.noreply.github.com" commit -m "data: match $stamp $safe"
      if($LASTEXITCODE -eq 0){
        git -C $repoDir push
        if($LASTEXITCODE -eq 0){$processed[$key]=$signature;Write-Host "Uploaded $($f.Name)"}
        else{Write-Warning "Push failed; committed locally in $repoDir"}
      }
    }catch{Write-Warning "Failed $($f.Name): $_"}
  }
  Start-Sleep -Seconds 15
}
