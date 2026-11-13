@echo off
setlocal

if "%VSCMD_ARG_TGT_ARCH%"=="" (
    echo ERROR: Open "x86 Native Tools Command Prompt for VS 2022" first.
    exit /b 1
)
if /I not "%VSCMD_ARG_TGT_ARCH%"=="x86" (
    echo ERROR: This plugin must be built for x86. Current target: %VSCMD_ARG_TGT_ARCH%
    exit /b 1
)
if "%CSSV34_SDK%"=="" (
    echo ERROR: Set CSSV34_SDK to the root folder of rusherr-c/cssv34-sdk.
    echo Example: set CSSV34_SDK=C:\src\cssv34-sdk
    exit /b 1
)

cl /nologo /LD /EHsc /MD /W3 ^
 /I "%CSSV34_SDK%\public" ^
 /I "%CSSV34_SDK%\public\engine" ^
 /I "%CSSV34_SDK%\public\tier0" ^
 /I "%CSSV34_SDK%\public\tier1" ^
 /I "%CSSV34_SDK%\common" ^
 cssbc_probe.cpp ^
 /link /OUT:cssbc_probe.dll

if errorlevel 1 exit /b %errorlevel%
echo.
echo Built cssbc_probe.dll
