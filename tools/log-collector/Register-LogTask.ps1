param([Parameter(Mandatory=$true)][string]$GameDir)
$ErrorActionPreference='Stop'
$script=Join-Path $GameDir 'cstrike\addons\cssbc\tools\Watch-And-Push.ps1'
if(-not(Test-Path -LiteralPath $script)){throw "CSSBC log collector not found: $script"}
$taskName='CSSBC-LogCollector'
$arguments='-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "'+$script+'" -GameDir "'+$GameDir+'" -AnalysisRepo "desdesyo/CSSBC-Match-Data"'
$action=New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument $arguments
$trigger=New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$principal=New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
$settings=New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 2) -ExecutionTimeLimit ([TimeSpan]::Zero)
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'CSSBC automatic game-log collector and GitHub uploader' -Force | Out-Null
Write-Host "Registered $taskName. It starts at your next Windows sign-in."
