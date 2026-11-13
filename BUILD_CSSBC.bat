@echo off
setlocal
title CSS Bot Community - Build CS:S v34
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\build-cssbc-v34.ps1"
set "RESULT=%ERRORLEVEL%"
if not "%RESULT%"=="0" (
    echo.
    echo BUILD FAILED. See the error above.
) else (
    echo.
    echo CSSBC SERVER DLL BUILT SUCCESSFULLY.
)
echo.
pause
exit /b %RESULT%
