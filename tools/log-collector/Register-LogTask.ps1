param([Parameter(Mandatory=$true)][string]$GameDir)
$ErrorActionPreference='Stop'
$script=Join-Path $GameDir 'cstrike\addons\cssbc\tools\Upload-Logs.ps1'
$logs=Join-Path $GameDir 'cstrike\logs'
New-Item -ItemType Directory -Force $logs | Out-Null
$arg='-NoProfile -ExecutionPolicy Bypass -File "'+$script+'" -WatchPath "'+$logs+'"'
$action=New-ScheduledTaskAction -Execute 'powershell.exe' -Argument $arg
$trigger=New-ScheduledTaskTrigger -AtLogOn
$principal=New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName 'CSSBC-LogUploader' -Action $action -Trigger $trigger -Principal $principal -Description 'CSSBC log uploader' -Force | Out-Null
Write-Host 'CSSBC log uploader scheduled at user logon.'
