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
Write-Host "Disabled PCH for the two tier0 source files omitted from this source snapshot."
