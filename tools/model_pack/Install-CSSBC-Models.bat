@echo off
setlocal
set "SCRIPT=%~dp0tools\model_pack\install_css_v34.ps1"
if not exist "%SCRIPT%" (
  echo Installer files are incomplete.
  pause
  exit /b 2
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT%" %*
set "RESULT=%ERRORLEVEL%"
echo.
if "%RESULT%"=="0" (
  echo CSSBC model installation completed. Check the output above.
) else (
  echo CSSBC model installation failed with code %RESULT%.
)
pause
exit /b %RESULT%
