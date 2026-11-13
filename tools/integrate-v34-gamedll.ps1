param(
    [Parameter(Mandatory=$true)][string]$CssbcRoot,
    [Parameter(Mandatory=$true)][string]$GameSourceRoot
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$newline = [Environment]::NewLine

$serverRoot = Join-Path $GameSourceRoot 'game\server'
$botUpdate = Join-Path $serverRoot 'cstrike\bot\cs_bot_update.cpp'
$vpcFile = Join-Path $serverRoot 'server_cstrike.vpc'
$target = Join-Path $serverRoot 'cssbc'
New-Item -ItemType Directory -Force $target | Out-Null

$coreFiles = @(
    'CSSBC_Brain.cpp','CSSBC_Brain.h',
    'CSSBC_Economy.cpp','CSSBC_Economy.h',
    'CSSBC_Tactics.cpp','CSSBC_Tactics.h',
    'CSSBC_Types.h'
)
foreach ($file in $coreFiles) {
    $source = Join-Path $CssbcRoot ('src\' + $file)
    if (!(Test-Path $source)) { throw "Missing CSSBC source: $source" }
    Copy-Item $source (Join-Path $target $file) -Force
}
foreach ($file in @('CSSBC_EngineAdapter.cpp','CSSBC_EngineAdapter.h')) {
    $source = Join-Path $CssbcRoot ('sdk\server\' + $file)
    if (!(Test-Path $source)) { throw "Missing engine adapter source: $source" }
    Copy-Item $source (Join-Path $target $file) -Force
}

$botText = Get-Content -Raw $botUpdate
if ($botText -notmatch '#include "cssbc/CSSBC_EngineAdapter.h"') {
    $includeAnchor = '#include "cs_bot.h"'
    if (!$botText.Contains($includeAnchor)) { throw 'cs_bot.h include anchor not found' }
    $botText = $botText.Replace($includeAnchor, $includeAnchor + $newline + '#include "cssbc/CSSBC_EngineAdapter.h"')
}
$hookPattern = [regex]'if\s*\(\s*cv_bot_stop\.GetBool\(\)\s*\)\s*return\s*;'
if (!$hookPattern.IsMatch($botText)) { throw 'CCSBot::Update insertion point not found' }
if ($botText -notmatch 'cssbc::sdk::OnBotUpdate\(this\)') {
    $botText = $hookPattern.Replace($botText, {
        param($m)
        $m.Value + $newline + $newline + '    // CSS Bot Community tactical decision bridge.' + $newline + '    cssbc::sdk::OnBotUpdate(this);'
    }, 1)
}
Set-Content -Path $botUpdate -Value $botText -Encoding utf8NoBOM

$vpcText = Get-Content -Raw $vpcFile

# The no-Steam compatibility object is linked statically into server.dll.
# Prevent Steam headers from emitting __imp__ imports for steam_api.dll.
if ($vpcText -notmatch 'STEAM_API_NODLL') {
    $definitionPattern = [regex]'(?m)^(\s*\$PreprocessorDefinitions\s+")([^"\r\n]*)(".*)$'
