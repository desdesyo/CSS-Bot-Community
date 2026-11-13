# CSS Source v34 Safe Repair Utility
# Repairs launch configuration and creates a diagnostic report.
# Does not download, replace, or delete game binaries.

$ErrorActionPreference = "Stop"
$DefaultPath = "C:\Games\Counter-Strike Source v34"
$Report = Join-Path $PSScriptRoot "CSS-v34-repair-report.txt"
function Write-Report([string]$Line) { $Line | Tee-Object -FilePath $Report -Append }

Clear-Host
Write-Host "CSS Source v34 - Safe Repair Utility" -ForegroundColor Cyan
Write-Host "This tool will not delete or overwrite game files."
"" | Set-Content -Path $Report -Encoding UTF8
Write-Report "CSS Source v34 repair report"
Write-Report ("Date: " + (Get-Date -Format "yyyy-MM-dd HH:mm:ss"))
Write-Report ("Computer: " + $env:COMPUTERNAME)
Write-Report ("Windows: " + [Environment]::OSVersion.VersionString)

$GamePath = Read-Host "Game folder [$DefaultPath]"
if ([string]::IsNullOrWhiteSpace($GamePath)) { $GamePath = $DefaultPath }
$GamePath = [Environment]::ExpandEnvironmentVariables($GamePath.Trim('"'))
if (-not (Test-Path -LiteralPath $GamePath -PathType Container)) {
    Write-Host "Folder not found: $GamePath" -ForegroundColor Red
    Write-Report "RESULT: Game folder not found."
    Read-Host "Press Enter to close"
    exit 2
}
$GamePath = (Resolve-Path -LiteralPath $GamePath).Path
Write-Report "Game folder: $GamePath"

$Cstrike = Join-Path $GamePath "cstrike"
$GameInfo = Join-Path $Cstrike "gameinfo.txt"
$RootExe = Join-Path $GamePath "hl2.exe"
$BinExe = Join-Path (Join-Path $GamePath "bin") "hl2.exe"
$Exe = $null
if (Test-Path -LiteralPath $RootExe -PathType Leaf) {
    $Exe = $RootExe
    Write-Report "Engine executable: root\hl2.exe (preferred)"
} elseif (Test-Path -LiteralPath $BinExe -PathType Leaf) {
    $Exe = $BinExe
    Write-Report "Engine executable: bin\hl2.exe (fallback; unusual layout)"
} else {
    Write-Report "ERROR: hl2.exe is missing from both the game root and bin."
}

if (Test-Path -LiteralPath $Cstrike -PathType Container) { Write-Report "OK: cstrike folder exists." } else { Write-Report "ERROR: cstrike folder is missing." }
if (Test-Path -LiteralPath $GameInfo -PathType Leaf) { Write-Report "OK: cstrike\gameinfo.txt exists." } else { Write-Report "ERROR: cstrike\gameinfo.txt is missing." }

$RequiredDlls = @("engine.dll", "tier0.dll", "vstdlib.dll", "filesystem_stdio.dll")
foreach ($dll in $RequiredDlls) {
    $found = (Test-Path -LiteralPath (Join-Path $GamePath $dll)) -or (Test-Path -LiteralPath (Join-Path (Join-Path $GamePath "bin") $dll))
    if ($found) { Write-Report "OK: $dll found." } else { Write-Report "WARNING: $dll not found in root or bin." }
}

if (-not $Exe -or -not (Test-Path -LiteralPath $GameInfo)) {
    Write-Host "The installation is incomplete. No files were changed." -ForegroundColor Red
    Write-Report "RESULT: Cannot create a reliable launcher because required files are missing."
    Write-Host "Report saved to: $Report"
    Read-Host "Press Enter to close"
    exit 3
}

$Launcher = Join-Path $GamePath "START-CSS-v34-REPAIRED.bat"
if (Test-Path -LiteralPath $Launcher) {
    $backup = "$Launcher.bak-" + (Get-Date -Format "yyyyMMdd-HHmmss")
    Copy-Item -LiteralPath $Launcher -Destination $backup
    Write-Report "Previous repaired launcher backed up to: $backup"
}
$ExeRelative = if ($Exe -eq $RootExe) { "hl2.exe" } else { "bin\hl2.exe" }
$LauncherText = @"
@echo off
cd /d "$GamePath"
start "" "$ExeRelative" -game cstrike -steam -console -condebug
"@
Set-Content -LiteralPath $Launcher -Value $LauncherText -Encoding ASCII
Write-Report "REPAIR: Created $Launcher"
Write-Report "Launch command: $ExeRelative -game cstrike -steam -console -condebug"
Write-Report ("Console log expected at: " + (Join-Path $GamePath "qconsole.log"))
Write-Report "Working directory: $GamePath"

Write-Host ""
Write-Host "Launcher created:" -ForegroundColor Green
Write-Host $Launcher
Write-Host "Starting a test launch for 8 seconds..."
try {
    $proc = Start-Process -FilePath $Exe -ArgumentList @("-game","cstrike","-steam","-console","-condebug") -WorkingDirectory $GamePath -PassThru
    Start-Sleep -Seconds 8
    $proc.Refresh()
    if (-not $proc.HasExited) {
        Write-Report "TEST: hl2.exe remained running after 8 seconds."
        Write-Host "The game process stayed open. Check the game window." -ForegroundColor Green
    } else {
        Write-Report ("TEST: hl2.exe exited. Exit code: " + $proc.ExitCode)
        Write-Host "The game still closes. The report contains file checks and exit code." -ForegroundColor Yellow
    }
} catch {
    Write-Report ("TEST ERROR: " + $_.Exception.Message)
    Write-Host "Could not start the game: $($_.Exception.Message)" -ForegroundColor Red
}
if (Test-Path -LiteralPath (Join-Path $GamePath "qconsole.log")) { Write-Report "Console log qconsole.log was created or already exists." }
Write-Report "No original game files were deleted or overwritten."
Write-Host ""
Write-Host "Report saved to: $Report" -ForegroundColor Cyan
Write-Host "If the game still closes, send CSS-v34-repair-report.txt."
Read-Host "Press Enter to close"
