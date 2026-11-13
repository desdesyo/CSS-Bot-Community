@echo off
setlocal
title CSS Bot Community - Install server.dll
set "GAME_DIR=C:\Games\Counter-Strike Source v34"
set "TARGET=%GAME_DIR%\cstrike\bin\server.dll"
set "BACKUP=%TARGET%.cssbc-backup"
set "SOURCE=%~dp0dist\Server.dll"

if not exist "%SOURCE%" (
    echo Missing dist\Server.dll. Run BUILD_CSSBC.bat first.
    pause
    exit /b 1
)
if not exist "%GAME_DIR%\cstrike\bin" (
    echo Game folder not found: %GAME_DIR%
    echo Edit GAME_DIR inside INSTALL_CSSBC.bat to your CS:S v34 folder.
    pause
    exit /b 1
)
if not exist "%BACKUP%" (
    if exist "%TARGET%" (
        copy /Y "%TARGET%" "%BACKUP%" >nul
        if errorlevel 1 (
            echo Could not back up the original server.dll. Close the game and try again.
            pause
            exit /b 1
        )
    )
)
copy /Y "%SOURCE%" "%TARGET%"
if errorlevel 1 (
    echo Install failed. Close CS:S if it is running and try again.
    pause
    exit /b 1
)
echo.
echo CSSBC server.dll installed.
echo Original backup: %BACKUP%
echo Start Counter-Strike: Source v34 to test.
pause
