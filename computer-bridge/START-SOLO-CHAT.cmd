@echo off
setlocal
title SOLO.Chat - Computer Connector
cd /d "%~dp0"

echo.
echo ==========================================
echo          SOLO.Chat Computer
echo ==========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  echo Opening the official Node.js download page...
  start "" "https://nodejs.org/en/download"
  echo Install the LTS version, close this window, then double-click this file again.
  pause
  exit /b 1
)

node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)"
if errorlevel 1 (
  echo Your Node.js version is too old. Install the current LTS version from:
  echo https://nodejs.org/en/download
  pause
  exit /b 1
)

if not exist "config.json" goto PAIR
findstr /C:"\"deviceToken\": \"\"" "config.json" >nul
if not errorlevel 1 goto PAIR
findstr /C:"\"deviceToken\":" "config.json" >nul
if errorlevel 1 goto PAIR
goto START

:PAIR
echo 1. Open SOLO.Chat in your browser.
echo 2. Press Connect computer and copy the six-digit code.
echo.
set /p SOLO_PAIR_CODE=Paste the six-digit code here, then press Enter: 
if not defined SOLO_PAIR_CODE (
  echo No code entered.
  pause
  exit /b 1
)
node agent.mjs pair https://cssbc-github-chat.descapan.workers.dev
set "SOLO_PAIR_CODE="
if errorlevel 1 (
  echo.
  echo Pairing did not complete. Generate a fresh code in SOLO.Chat and try again.
  pause
  exit /b 1
)

:START
echo.
echo Connecting to SOLO.Chat. Keep this window open.
echo Press Ctrl+C to disconnect.
echo.
node agent.mjs
echo.
echo The connector stopped. You can run it again by double-clicking this file.
pause
