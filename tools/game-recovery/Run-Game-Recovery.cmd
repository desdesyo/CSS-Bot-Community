@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Repair-Game-v34.ps1"
if errorlevel 1 pause
endlocal
