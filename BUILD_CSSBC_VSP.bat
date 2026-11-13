@echo off
setlocal
title CSS Bot Community - Build optional VSP bridge
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-cssbc.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" echo BUILD FAILED.
echo.
pause
exit /b %RESULT%
