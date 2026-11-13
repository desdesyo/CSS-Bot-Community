@echo off
setlocal
if "%CSSBC_SOURCE_SDK%"=="" (
  echo ERROR: CSSBC_SOURCE_SDK must point to the Source SDK 2006/v34-compatible headers.
  echo Example: set CSSBC_SOURCE_SDK=C:\src\source-sdk-2006
  exit /b 2
)
where msbuild >nul 2>nul
if errorlevel 1 (
  echo ERROR: MSBuild not found. Install Visual Studio with Desktop development with C++.
  exit /b 3
)
msbuild CSSBC_VSP.vcxproj /m /p:Configuration=Release /p:Platform=Win32
if errorlevel 1 exit /b %errorlevel%
echo Build finished. Locate CSSBC_VSP.dll in the project's Release output folder.
