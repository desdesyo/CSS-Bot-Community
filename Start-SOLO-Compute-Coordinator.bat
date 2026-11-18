@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  pause
  exit /b 1
)
echo Enter a private random token (32+ characters). It is not saved to disk.
set /p SOLO_COMPUTE_TOKEN=Token:
if "%SOLO_COMPUTE_TOKEN%"=="" (
  echo Token is required.
  pause
  exit /b 1
)
node solo-compute\coordinator.mjs
pause
