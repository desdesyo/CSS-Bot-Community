# CSSBC native loader probe (CS:S v34)

This is the first native-plugin milestone. It deliberately does not change bot AI or gameplay. Its only purpose is to prove that the user's v34 engine can load a 32-bit Source server plugin built against the matching SDK headers.

## Build

1. Install Visual Studio 2022 with **Desktop development with C++**, including the **MSVC v143 x86/x64** tools and a Windows SDK.
2. Download the SDK from https://github.com/rusherr-c/cssv34-sdk.
3. Open **x86 Native Tools Command Prompt for VS 2022**.
4. Set the SDK root, for example:
   set CSSV34_SDK=C:\src\cssv34-sdk
5. Change to this folder and run build_x86.bat.

The output is cssbc_probe.dll. Build from an x86-targeted prompt; the game is 32-bit.

## Test in a separate copy of the game

1. Copy cssbc_probe.dll into <game>\cstrike\addons\.
2. Start a local server/map and enter this server-console command:
   plugin_load addons/cssbc_probe.dll
3. Run plugin_print. The list should contain:
   CSS Bot Community native loader probe (v34)
4. Run plugin_unload 0 (use the index shown by plugin_print) and then plugin_print again.

Do not overwrite the original server.dll or engine.dll.

## Scope and limitations

- Implements both ISERVERPLUGINCALLBACKS002 and the backward-compatible 001 factory names using the v34 SDK declaration.
- It does not yet add AI, entities, HUD, weapons, or other CSSBC gameplay.
- Successful compilation and a successful plugin_print entry are separate checkpoints; the DLL must be tested in the exact portable game build.
