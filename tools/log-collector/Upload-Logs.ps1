param(
 [string]$WatchPath = (Join-Path $env:LOCALAPPDATA "CSSBC\\logs"),
 [string]$AnalysisRepo = "desdesyo/CSSBC-Match-Data",
 [string]$TokenFile = (Join-Path $env:LOCALAPPDATA "CSSBC\\github-token.dpapi"),
 [int]$QuietSeconds = 60
)
$ErrorActionPreference="Stop"
$root=Join-Path $env:LOCALAPPDATA "CSSBC"
New-Item -ItemType Directory -Force $root,$WatchPath | Out-Null
function Get-Token {
 if(Test-Path $TokenFile){ try { return (Get-Content $TokenFile -Raw | ConvertTo-SecureString | ConvertFrom-SecureString -AsPlainText) } catch {} }
 Write-Host "CSSBC log upload requires a GitHub token with Contents: Read and write for $AnalysisRepo."
 Write-Host "Create a fine-grained token at https://github.com/settings/personal-access-tokens/new"
 $secure=Read-Host "Paste token (input is hidden)" -AsSecureString
 if($secure.Length -lt 20){throw "Token appears too short."}
 $secure | ConvertFrom-SecureString | Set-Content $TokenFile
 return ($secure | ConvertFrom-SecureString | ConvertTo-SecureString | ConvertFrom-SecureString -AsPlainText)
}
$token=Get-Token
$headers=@{Authorization="Bearer $token";"X-GitHub-Api-Version"="2022-11-28";Accept="application/vnd.github+json"}
$processed=@{}
Write-Host "CSSBC log uploader active. Logs folder: $WatchPath"
while($true){
 Get-ChildItem $WatchPath -File -Filter "*.log" | ForEach-Object {
  $f=$_
  try {
   $sig="$($f.Length):$($f.LastWriteTimeUtc.Ticks)"
   if($processed[$f.FullName] -eq $sig){return}
   if(((Get-Date).ToUniversalTime()-$f.LastWriteTimeUtc).TotalSeconds -lt $QuietSeconds){return}
   $bytes=[IO.File]::ReadAllBytes($f.FullName);$sha=[Convert]::ToBase64String($bytes)
   $stamp=$f.LastWriteTimeUtc.ToString("yyyyMMdd_HHmmss")
   $safe=$f.BaseName -replace '[^a-zA-Z0-9_-]','_'
   $path="matches/$stamp-$safe/console.log"
   $uri="https://api.github.com/repos/$AnalysisRepo/contents/$path"
   $body=@{message="data: match $stamp $safe";content=$sha} | ConvertTo-Json
   Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -Body $body -ContentType "application/json"
   $manifest=@{captured_utc=(Get-Date).ToUniversalTime().ToString("o");source_file=$f.Name;bytes=$f.Length;sha256=(Get-FileHash $f.FullName -Algorithm SHA256).Hash} | ConvertTo-Json
   $muri="https://api.github.com/repos/$AnalysisRepo/contents/matches/$stamp-$safe/manifest.json"
   Invoke-RestMethod -Method Put -Uri $muri -Headers $headers -Body (@{message="manifest: $stamp $safe";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($manifest))}|ConvertTo-Json) -ContentType "application/json"
   $processed[$f.FullName]=$sig;Write-Host "Uploaded $($f.Name)"
  } catch {Write-Warning "Upload $($f.Name): $_"}
 }
 Start-Sleep 20
}
