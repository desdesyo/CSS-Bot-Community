@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  pause
  exit /b 1
)
set /p SOLO_COMPUTE_TOKEN=Coordinator token:
if "%SOLO_COMPUTE_TOKEN%"=="" (
  echo Token is required.
  pause
  exit /b 1
)
set "SOLO_COORDINATOR=http://127.0.0.1:8787"
set /p SOLO_COORDINATOR=Coordinator URL [%SOLO_COORDINATOR%]:
if "%SOLO_COORDINATOR%"=="" set "SOLO_COORDINATOR=http://127.0.0.1:8787"
set "SOLO_WORKER_ID=%COMPUTERNAME%"
node solo-compute\worker.mjs connect "%SOLO_COORDINATOR%" "%SOLO_WORKER_ID%"
pause
