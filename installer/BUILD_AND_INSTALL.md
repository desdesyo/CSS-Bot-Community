# Build and install (Visual Studio is installed)

## One-time SDK setup
The VSP requires the **Source Engine 2006/v34-compatible SDK headers**, not just Visual Studio.
Get the archived Source SDK 2006 EP1 bundle (see Valve Developer Union's Orphaned Source SDK Content) and extract it. Do not point CSSBC_SOURCE_SDK at the 2013 SDK.

## Build
1. Open x86 Native Tools Command Prompt for Visual Studio.
2. Set the SDK path, e.g.:
   set CSSBC_SOURCE_SDK=C:\src\source-sdk-2006-ep1
3. Change directory to this repository's sdk\dll folder.
4. Run build-vsp.bat.
5. Confirm sdk\dll\bin\CSSBC_VSP.dll exists.

## Install
Run installer\CSSBC_Setup.iss in Inno Setup to produce CSSBC_Setup.exe.
The setup installs the VSP and plugin.vdf into the selected game's cstrike folder.

## Important
This installs the native plugin bootstrap only. The custom GameDLL provider is not
implemented yet, so this does not create playable bots at this stage.
