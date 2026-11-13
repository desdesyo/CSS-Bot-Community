param(
 [string]$WatchPath = (Join-Path $env:LOCALAPPDATA "CSSBC\logs"),
 [string]$AnalysisRepo = "desdesyo/CSSBC-Match-Data",
 [string]$TokenFile = (Join-Path $env:LOCALAPPDATA "CSSBC\github-token.dpapi"),
 [int]$QuietSeconds = 60
)
$ErrorActionPreference="Stop"
$root=Join-Path $env:LOCALAPPDATA "CSSBC"
New-Item -ItemType Directory -Force $root,$WatchPath | Out-Null
function Get-Token {
 if(Test-Path $TokenFile){try{return (Get-Content $TokenFile -Raw | ConvertTo-SecureString | ConvertFrom-SecureString -AsPlainText -Force)}catch{}}
 Write-Host "GitHub token required. Create private repo $AnalysisRepo and PAT with Contents read/write."
 $secure=Read-Host "Paste GitHub token (hidden)" -AsSecureString
 if($secure.Length -lt 20){throw "Token too short"}
 $secure | ConvertFrom-SecureString | Set-Content $TokenFile
 return ($secure | ConvertFrom-SecureString -AsPlainText -Force)
}
$token=Get-Token
$headers=@{Authorization="Bearer $token";"X-GitHub-Api-Version"="2022-11-28";Accept="application/vnd.github+json"}
Invoke-RestMethod -Uri "https://api.github.com/repos/$AnalysisRepo" -Headers $headers | Out-Null
$processed=@{}
Write-Host "Uploader active; logs: $WatchPath; repository: $AnalysisRepo"
while($true){
 foreach($f in (Get-ChildItem $WatchPath -File -Filter "*.log")){
  try{
   $sig="$($f.Length):$($f.LastWriteTimeUtc.Ticks)"
   if($processed[$f.FullName] -eq $sig){continue}
   if(((Get-Date).ToUniversalTime()-$f.LastWriteTimeUtc).TotalSeconds -lt $QuietSeconds){continue}
   $stamp=$f.LastWriteTimeUtc.ToString("yyyyMMdd_HHmmss");$safe=$f.BaseName -replace '[^a-zA-Z0-9_-]','_';$dir="matches/$stamp-$safe"
   $content=[Convert]::ToBase64String([IO.File]::ReadAllBytes($f.FullName))
   $manifest=@{captured_utc=(Get-Date).ToUniversalTime().ToString("o");source_file=$f.Name;bytes=$f.Length;sha256=(Get-FileHash $f.FullName -Algorithm SHA256).Hash}|ConvertTo-Json
   foreach($item in @(@{path="$dir/console.log";content=$content;message="match $stamp $safe"},@{path="$dir/manifest.json";content=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($manifest));message="manifest $stamp $safe"})){
    $body=@{message=$item.message;content=$item.content}|ConvertTo-Json
    Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/$AnalysisRepo/contents/$($item.path)" -Headers $headers -Body $body -ContentType "application/json" | Out-Null
   }
   $processed[$f.FullName]=$sig;Write-Host "Uploaded $($f.Name)"
  }catch{Write-Warning "Upload $($f.Name): $_"}
 }
 Start-Sleep 20
}
