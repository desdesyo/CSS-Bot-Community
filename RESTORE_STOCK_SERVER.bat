@echo off
setlocal
title Restore original CS:S server.dll
set "GAME_DIR=C:\Games\Counter-Strike Source v34"
set "TARGET=%GAME_DIR%\cstrike\bin\server.dll"
set "BACKUP=%TARGET%.cssbc-backup"
if not exist "%BACKUP%" (
    echo Backup not found: %BACKUP%
    pause
    exit /b 1
)
copy /Y "%BACKUP%" "%TARGET%"
if errorlevel 1 (
    echo Restore failed. Close CS:S and try again.
    pause
    exit /b 1
)
echo Original server.dll restored.
pause
