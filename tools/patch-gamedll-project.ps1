param(
    [Parameter(Mandatory=$true)][string]$ProjectPath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolved = (Resolve-Path $ProjectPath).Path
[xml]$project = Get-Content -Raw $resolved
$ns = $project.DocumentElement.NamespaceURI
$items = $project.SelectNodes("//*[local-name()='ClCompile' and @Include]")

foreach ($item in $items) {
    $include = $item.GetAttribute("Include").Replace("/", "\")
    $isCssbc = $include -match '^cssbc\\.*\.cpp$'
    $isBotUpdate = $include -ieq 'cstrike\bot\cs_bot_update.cpp'

    if ($isCssbc -or $isBotUpdate) {
        $language = $item.SelectSingleNode("./*[local-name()='LanguageStandard']")
        if (!$language) {
            $language = $project.CreateElement("LanguageStandard", $ns)
            [void]$item.AppendChild($language)
        }
        $language.InnerText = "stdcpp17"

        if ($isCssbc) {
            $pch = $item.SelectSingleNode("./*[local-name()='PrecompiledHeader']")
            if (!$pch) {
                $pch = $project.CreateElement("PrecompiledHeader", $ns)
                [void]$item.AppendChild($pch)
            }
            $pch.InnerText = "NotUsing"
        }
    }
}
$project.Save($resolved)
Write-Host "C++17 enabled for CSSBC and cs_bot_update.cpp; PCH disabled for CSSBC core."
