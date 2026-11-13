param(
    [Parameter(Mandatory=$true)][string]$ProjectPath
)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$resolved = (Resolve-Path $ProjectPath).Path
[xml]$project = Get-Content -Raw $resolved
$ns = $project.DocumentElement.NamespaceURI

# This source snapshot was configured by Waf originally. Restore its MSVC
# feature macros and empty build-metadata strings for the native VPC project.
$settings = $project.SelectNodes("//*[local-name()='ItemDefinitionGroup']/*[local-name()='ClCompile']")
foreach ($setting in $settings) {
    $defs = $setting.SelectSingleNode("./*[local-name()='PreprocessorDefinitions']")
    if (!$defs) {
        $defs = $project.CreateElement("PreprocessorDefinitions", $ns)
        [void]$setting.AppendChild($defs)
    }
    $defs.InnerText = 'MSVC=1;COMPILER_MSVC=1;COMPILER_MSVC32=1;WAF_CFLAGS=\"\";WAF_LDFLAGS=\"\";' + $defs.InnerText
}

# Two tier0 translation units in this snapshot do not include pch_tier0.h.
$items = $project.SelectNodes("//*[local-name()='ClCompile' and @Include]")
foreach ($item in $items) {
    $name = [System.IO.Path]::GetFileName($item.GetAttribute("Include"))
    if ($name -ieq "dbg.cpp" -or $name -ieq "threadtools.cpp") {
        $pch = $item.SelectSingleNode("./*[local-name()='PrecompiledHeader']")
        if (!$pch) {
            $pch = $project.CreateElement("PrecompiledHeader", $ns)
            [void]$item.AppendChild($pch)
        }
        $pch.InnerText = "NotUsing"
    }
}
$project.Save($resolved)
Write-Host "Tier0 MSVC/WAF macros restored; PCH disabled for dbg.cpp and threadtools.cpp."
