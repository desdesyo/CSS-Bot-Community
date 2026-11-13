@echo off
setlocal
title CSS Bot Community - Build and Test
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-cssbc.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
    echo.
    echo BUILD FAILED. See the error above.
) else (
    echo.
    echo BUILD AND TESTS COMPLETED.
)
echo.
pause
exit /b %RESULT%
