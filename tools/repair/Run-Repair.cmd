@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0Repair-CSS-v34.ps1"
if errorlevel 1 (
  echo.
  echo CSSBC repair utility exited with an error.
  pause
)
endlocal
