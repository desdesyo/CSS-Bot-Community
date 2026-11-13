param(
    [Parameter(Mandatory=$true)][string]$SdkRoot,
    [Parameter(Mandatory=$true)][string]$RepoRoot
)
$ErrorActionPreference = "Stop"

function Add-GameEventCall([string]$text, [string]$functionMarker, [string]$call) {
    if ($text.Contains($call)) { return $text }
    $start = $text.IndexOf($functionMarker, [StringComparison]::Ordinal)
    if ($start -lt 0) { throw "Could not find game hook: $functionMarker" }
    $open = $text.IndexOf("{", $start, [StringComparison]::Ordinal)
    if ($open -lt 0) { throw "Could not find function body for: $functionMarker" }
    return $text.Insert($open + 1, [Environment]::NewLine + [char]9 + $call)
}

function Add-AdapterInclude([string]$path) {
    $text = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)
    if (!$text.Contains('#include "CSSBC_GameAdapter.h"')) {
        $marker = '#include "tier0/memdbgon.h"'
        if (!$text.Contains($marker)) { throw "memdbgon include marker missing in $path" }
        $text = $text.Replace($marker, '#include "CSSBC_GameAdapter.h"' + [Environment]::NewLine + $marker)
        [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))
    }
}

$managerPath = Join-Path $SdkRoot "game\server\cstrike\bot\cs_bot_manager.cpp"
$updatePath = Join-Path $SdkRoot "game\server\cstrike\bot\cs_bot_update.cpp"
$projectPath = Join-Path $SdkRoot "game\server\server_cstrike.vcxproj"
$adapterSource = Join-Path $RepoRoot "integration\cssv34\CSSBC_GameAdapter.cpp"
$adapterHeader = Join-Path $RepoRoot "integration\cssv34\CSSBC_GameAdapter.h"

foreach ($required in @($managerPath, $updatePath, $projectPath, $adapterSource, $adapterHeader)) {
    if (!(Test-Path $required)) { throw "Required CS:S v34 integration file is missing: $required" }
}

$targetAdapterDir = Join-Path $SdkRoot "game\server\cstrike"
Copy-Item $adapterSource (Join-Path $targetAdapterDir "CSSBC_GameAdapter.cpp") -Force
Copy-Item $adapterHeader (Join-Path $targetAdapterDir "CSSBC_GameAdapter.h") -Force

Add-AdapterInclude $managerPath
$manager = [IO.File]::ReadAllText($managerPath, [Text.Encoding]::UTF8)
$manager = Add-GameEventCall $manager "void CCSBotManager::OnPlayerDeath" "CSSBCGame::OnPlayerDeath(event);"
$manager = Add-GameEventCall $manager "void CCSBotManager::OnBombPlanted" "CSSBCGame::OnBombPlanted(event);"
$manager = Add-GameEventCall $manager "void CCSBotManager::OnBombDefused" "CSSBCGame::OnBombDefused(event);"
$manager = Add-GameEventCall $manager "void CCSBotManager::OnRoundStart" "CSSBCGame::OnRoundStart(event);"
$manager = Add-GameEventCall $manager "void CCSBotManager::OnRoundEnd" "CSSBCGame::OnRoundEnd(event);"
$manager = Add-GameEventCall $manager "void CCSBotManager::OnHostageRescuedAll" "CSSBCGame::OnHostageRescuedAll(event);"
[IO.File]::WriteAllText($managerPath, $manager, [Text.UTF8Encoding]::new($false))

Add-AdapterInclude $updatePath
$update = [IO.File]::ReadAllText($updatePath, [Text.Encoding]::UTF8)
if (!$update.Contains("CSSBCGame::TickBot(this);")) {
    $nextFunction = "void CCSBot::UpdateTravelDistanceToAllPlayers"
    $nextIndex = $update.IndexOf($nextFunction, [StringComparison]::Ordinal)
    if ($nextIndex -lt 0) { throw "Could not find the end marker for CCSBot::Update." }
    $prefix = $update.Substring(0, $nextIndex)
    $closeBrace = $prefix.LastIndexOf("}")
    if ($closeBrace -lt 0) { throw "Could not find CCSBot::Update closing brace." }
    $update = $prefix.Insert($closeBrace, [Environment]::NewLine + [char]9 + "CSSBCGame::TickBot(this);" + [Environment]::NewLine) + $update.Substring($nextIndex)
    [IO.File]::WriteAllText($updatePath, $update, [Text.UTF8Encoding]::new($false))
}

# Patch the real CS:S server DLL project. Core .cpp files are compiled directly
# into server_cstrike with PCH disabled for those files, avoiding CRT mismatch.
[xml]$xml = New-Object System.Xml.XmlDocument
$xml.PreserveWhitespace = $true
$xml.Load($projectPath)
$nsUri = "http://schemas.microsoft.com/developer/msbuild/2003"
$ns = New-Object System.Xml.XmlNamespaceManager($xml.NameTable)
$ns.AddNamespace("m", $nsUri)

foreach ($compile in $xml.SelectNodes("//m:ItemDefinitionGroup/m:ClCompile", $ns)) {
    $include = $compile.SelectSingleNode("m:AdditionalIncludeDirectories", $ns)
    if (!$include) {
        $include = $xml.CreateElement("AdditionalIncludeDirectories", $nsUri)
        $compile.AppendChild($include) | Out-Null
    }
    if (!$include.InnerText.Contains("..\..\..\..\src")) {
        $include.InnerText = "..\..\..\..\src;" + $include.InnerText
    }

    $standard = $compile.SelectSingleNode("m:LanguageStandard", $ns)
    if (!$standard) {
        $standard = $xml.CreateElement("LanguageStandard", $nsUri)
        $compile.AppendChild($standard) | Out-Null
    }
    $standard.InnerText = "stdcpp17"
}

foreach ($output in $xml.SelectNodes("//m:ItemDefinitionGroup/m:Link/m:OutputFile", $ns)) {
    $output.InnerText = '$(SolutionDir)game\cstrike\bin\server.dll'
}

$sourceGroup = $xml.SelectSingleNode("//m:ItemGroup[m:ClCompile]", $ns)
if (!$sourceGroup) { throw "Could not find the server project source ItemGroup." }

$coreFiles = @(
    "CSSBC_Mind.cpp", "CSSBC_Juggernaut.cpp", "CSSBC_MVP.cpp", "CSSBC_System.cpp",
    "CSSBC_SupportRoster.cpp", "CSSBC_TeamMemory.cpp", "CSSBC_Combat.cpp", "CSSBC_Spray.cpp",
    "CSSBC_CombatTeam.cpp", "CSSBC_UI.cpp", "CSSBC_Localization.cpp", "CSSBC_Tactics.cpp",
    "CSSBC_Economy.cpp", "CSSBC_GameModes.cpp", "CSSBC_Config.cpp", "CSSBC_Awards.cpp",
    "CSSBC_Brain.cpp", "CSSBC_Melee.cpp", "CSSBC_MeleeCombat.cpp", "CSSBC_MatchCoordinator.cpp",
    "CSSBC_GameplayEventRouter.cpp", "CSSBC_EscapeSearch.cpp"
)
$compilePaths = @()
foreach ($file in $coreFiles) { $compilePaths += "..\..\..\..\src\$file" }
$compilePaths += "cstrike\CSSBC_GameAdapter.cpp"

$existingIncludes = @{}
foreach ($item in $xml.SelectNodes("//m:ClCompile", $ns)) {
    if ($item.HasAttribute("Include")) { $existingIncludes[$item.GetAttribute("Include")] = $true }
}

foreach ($path in $compilePaths) {
    if ($existingIncludes.ContainsKey($path)) { continue }
    $item = $xml.CreateElement("ClCompile", $nsUri)
    $item.SetAttribute("Include", $path)
    foreach ($configuration in @("Debug CSTRIKE|Win32", "Release CSTRIKE|Win32")) {
        $pch = $xml.CreateElement("PrecompiledHeader", $nsUri)
        $pch.SetAttribute("Condition", "'$(Configuration)|$(Platform)'=='$configuration'")
        $pch.InnerText = "NotUsing"
        $item.AppendChild($pch) | Out-Null
    }
    $sourceGroup.AppendChild($item) | Out-Null
}

$headerGroup = $xml.SelectSingleNode("//m:ItemGroup[m:ClInclude]", $ns)
if (!$headerGroup) {
    $headerGroup = $xml.CreateElement("ItemGroup", $nsUri)
    $xml.DocumentElement.AppendChild($headerGroup) | Out-Null
}
$hasHeader = $false
foreach ($item in $xml.SelectNodes("//m:ClInclude", $ns)) {
    if ($item.GetAttribute("Include") -eq "cstrike\CSSBC_GameAdapter.h") { $hasHeader = $true }
}
if (!$hasHeader) {
    $header = $xml.CreateElement("ClInclude", $nsUri)
    $header.SetAttribute("Include", "cstrike\CSSBC_GameAdapter.h")
    $headerGroup.AppendChild($header) | Out-Null
}

$xml.Save($projectPath)
New-Item -ItemType Directory -Force -Path (Join-Path $SdkRoot "game\cstrike\bin") | Out-Null
Write-Host "CS:S v34 source patched for CSSBC: bot brain, round events, MVP and core sources."
