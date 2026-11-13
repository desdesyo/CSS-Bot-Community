@echo off
setlocal
echo === CSS Bot Community v34 build preflight ===
echo.
if "%CSSBC_SOURCE_SDK%"=="" (
  echo [FAIL] CSSBC_SOURCE_SDK is not set.
  echo Set it to the root of compatible Source 2006 SDK headers.
  echo Example: set CSSBC_SOURCE_SDK=C:\src\source-sdk-2006
  exit /b 2
)
if not exist "%CSSBC_SOURCE_SDK%\public\interface.h" (
  echo [FAIL] Missing public\interface.h under CSSBC_SOURCE_SDK.
  exit /b 3
)
if not exist "%CSSBC_SOURCE_SDK%\public\engine\iserverplugin.h" (
  echo [FAIL] Missing public\engine\iserverplugin.h.
  echo This SDK layout may not match the VSP project.
  exit /b 4
)
where msbuild >nul 2>nul
if errorlevel 1 (
  echo [FAIL] MSBuild not found. Install Visual Studio C++ Desktop workload.
  exit /b 5
)
echo [OK] SDK header paths found.
echo [OK] MSBuild found.
echo.
echo Building Win32 Release...
msbuild "%~dp0CSSBC_VSP.vcxproj" /m /p:Configuration=Release /p:Platform=Win32 /p:CSSBC_SOURCE_SDK="%CSSBC_SOURCE_SDK%"
if errorlevel 1 (
  echo [FAIL] Build failed. See compiler output above.
  exit /b 10
)
if not exist "%~dp0bin\CSSBC_VSP.dll" (
  echo [FAIL] Build reported success but expected DLL is absent: bin\CSSBC_VSP.dll
  exit /b 11
)
echo [PASS] DLL built: %~dp0bin\CSSBC_VSP.dll
