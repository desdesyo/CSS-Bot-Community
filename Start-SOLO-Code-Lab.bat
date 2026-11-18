@echo off
setlocal
cd /d "%~dp0"
echo ========================================
echo          SOLO CODE LAB
echo ========================================
echo.
node --version >nul 2>&1
if errorlevel 1 (
  echo Node.js 20+ is required. Install Node.js and try again.
  pause
  exit /b 1
)
node "solo-code-lab\lab.mjs" doctor
if errorlevel 1 (
  echo.
  echo Install the missing tools listed above, then run this file again.
  pause
  exit /b 1
)
echo.
node "solo-code-lab\lab.mjs" test
set RESULT=%ERRORLEVEL%
echo.
if "%RESULT%"=="0" (echo ALL CHECKS PASSED.) else (echo SOME CHECKS FAILED. Open the report and logs shown above.)
pause
exit /b %RESULT%
