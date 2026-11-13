# CSSBC AI Logger installer
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Plugin = Join-Path $Root "cssbc_ai_logger.smx"
Write-Host "=== CSSBC AI LOGGER SETUP ===" -ForegroundColor Cyan
if (-not (Test-Path $Plugin)) { Write-Host "cssbc_ai_logger.smx missing. Download the cssbc-ai-logger-installer artifact from GitHub Actions and extract the whole ZIP." -ForegroundColor Red; Read-Host "Enter"; exit 1 }
function Find-Cstrike([string]$Path) {
  if ([string]::IsNullOrWhiteSpace($Path)) { return $null }
  $r=Resolve-Path -LiteralPath $Path -ErrorAction SilentlyContinue
  if (-not $r) { return $null }; $p=$r.Path
  if ((Split-Path $p -Leaf).ToLower() -eq "cstrike" -and (Test-Path (Join-Path $p "cfg"))) { return $p }
  $c=Join-Path $p "cstrike"; if (Test-Path (Join-Path $c "cfg")) { return $c }; return $null
}
$cstrike=$null
$roots=@("${env:ProgramFiles(x86)}\Steam\steamapps\common\Counter-Strike Source","${env:ProgramFiles}\Steam\steamapps\common\Counter-Strike Source","D:\SteamLibrary\steamapps\common\Counter-Strike Source")
foreach($p in $roots) { $cstrike=Find-Cstrike $p; if($cstrike){break} }
if(-not $cstrike) { $p=Read-Host "Введи путь к Counter-Strike Source или папке cstrike"; $cstrike=Find-Cstrike $p }
if(-not $cstrike) { Write-Host "Папка cstrike не найдена. Ничего не изменено." -ForegroundColor Red; Read-Host "Enter"; exit 1 }
$sm=Join-Path $cstrike "addons\sourcemod"
if(-not (Test-Path $sm)) { Write-Host "SourceMod не найден: $sm. Сначала установи SourceMod." -ForegroundColor Red; Read-Host "Enter"; exit 1 }
$plugins=Join-Path $sm "plugins"; New-Item -ItemType Directory -Force -Path $plugins | Out-Null
$dest=Join-Path $plugins "cssbc_ai_logger.smx"
if(Test-Path $dest) { Copy-Item $dest "$dest.bak-$(Get-Date -Format yyyyMMdd-HHmmss)" }
Copy-Item $Plugin $dest -Force
Write-Host "Установлено: $dest" -ForegroundColor Green
Write-Host "После перезапуска сервера/смены карты события появятся в addons/sourcemod/logs/cssbc_ai.jsonl"
Write-Host "Лог не содержит имён игроков, SteamID и IP. Проверка: sm plugins list"
Read-Host "Нажми Enter"
