@echo off
title CSS Source v34 Safe Repair Utility
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Repair-CSS-v34.ps1"
if errorlevel 1 (
  echo.
  echo Utility finished with an error. Check CSS-v34-repair-report.txt.
  pause
)
