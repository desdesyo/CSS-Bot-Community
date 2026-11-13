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
foreach ($required in @($botUpdate, $vpcFile, (Join-Path $CssbcRoot 'src\CSSBC_Brain.cpp'), (Join-Path $CssbcRoot 'sdk\server\CSSBC_EngineAdapter.cpp'))) {
    if (!(Test-Path $required)) { throw "Required integration input is missing: $required" }
}
New-Item -ItemType Directory -Force $target | Out-Null

$coreFiles = @(
    'CSSBC_Brain.cpp','CSSBC_Brain.h',
    'CSSBC_Economy.cpp','CSSBC_Economy.h',
    'CSSBC_Tactics.cpp','CSSBC_Tactics.h',
    'CSSBC_Mind.cpp','CSSBC_Mind.h',
    'CSSBC_Juggernaut.cpp','CSSBC_Juggernaut.h',
    'CSSBC_MVP.cpp','CSSBC_MVP.h',
    'CSSBC_System.cpp','CSSBC_System.h',
    'CSSBC_SupportRoster.cpp','CSSBC_SupportRoster.h',
    'CSSBC_Awards.cpp','CSSBC_Awards.h',
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
    if (!$definitionPattern.IsMatch($vpcText)) {
        throw 'server_cstrike.vpc preprocessor definitions anchor not found'
    }
    $vpcText = $definitionPattern.Replace($vpcText, {
        param($m)
        $definitions = $m.Groups[2].Value
        if ($definitions -notmatch '(^|;)STEAM_API_NODLL($|;)') {
            $definitions += ';STEAM_API_NODLL'
        }
        return $m.Groups[1].Value + $definitions + $m.Groups[3].Value
    }, 1)
}

if ($vpcText -notmatch '\$Folder\s+"CSS Bot Community"') {
    $lastBrace = $vpcText.LastIndexOf('}')
    if ($lastBrace -lt 0) { throw 'Could not find final server_cstrike.vpc project brace' }
    $folder = @'
    $Folder "CSS Bot Community"
    {
        $File "cssbc\CSSBC_Brain.cpp"
        $File "cssbc\CSSBC_Economy.cpp"
        $File "cssbc\CSSBC_Tactics.cpp"
        $File "cssbc\CSSBC_EngineAdapter.cpp"
    }

'@
    $vpcText = $vpcText.Insert($lastBrace, $folder)
}
Set-Content -Path $vpcFile -Value $vpcText -Encoding utf8NoBOM

# The VPC tier0 project omits logging.cpp although the server references its API.
$tier0Vpc = Join-Path $GameSourceRoot 'tier0\tier0.vpc'
$tier0Text = Get-Content -Raw $tier0Vpc
if ($tier0Text -notmatch 'logging\.cpp') {
    $dbgAnchor = '$File' + [char]9 + '"dbg.cpp"'
    if (!$tier0Text.Contains($dbgAnchor)) { throw 'tier0 dbg.cpp project anchor not found' }
    $tier0Text = $tier0Text.Replace($dbgAnchor, $dbgAnchor + $newline + [char]9 + [char]9 + '$File' + [char]9 + '"logging.cpp"')
}
Set-Content -Path $tier0Vpc -Value $tier0Text -Encoding utf8NoBOM

Write-Host 'CSSBC GameDLL overlay applied:'
$coreFiles | ForEach-Object { Write-Host ("  cssbc\" + $_) }
Write-Host '  cs_bot_update.cpp: OnBotUpdate hook'
Write-Host '  server_cstrike.vpc: 10 CSSBC translation units + STEAM_API_NODLL'
