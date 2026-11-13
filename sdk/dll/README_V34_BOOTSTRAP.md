# CSSBC v34 server-plugin bootstrap (native Source VSP)

This is the first launchable integration route for CS:S Source Engine 2006/v34.
It is a native Valve Server Plugin (VSP) DLL, not SourceMod and not a replacement
for the game's server GameDLL. VSP loads alongside stock CS:S and proves ABI/load/event
integration before we attempt a full GameDLL replacement.

## Required SDK inputs

Use Source SDK 2006 headers matching CS:S (not Source SDK 2013). The Valve SDK
launcher identifies CS:S under Source Engine 2006. Include public headers such as
interface.h, eiface.h, and iserverplugin.h. Do not mix Orange Box/2013 headers.

## Build

Win32 DLL; set CSSBC_SOURCE_SDK to the SDK root. Visual Studio project/toolset details
will be committed with the first source implementation.

## Install/test

1. Build CSSBC_VSP.dll.
2. Copy to cstrike/addons/cssbc/bin/CSSBC_VSP.dll.
3. Create cstrike/addons/cssbc/plugin.vdf: { Plugin { file addons/cssbc/bin/CSSBC_VSP } }.
4. Start local dedicated server with -console -game cstrike.
5. Run plugin_load addons/cssbc/bin/CSSBC_VSP (or use plugin.vdf).
6. Confirm load message and safe unload/reload.

This bootstrap does not spawn bots yet. It verifies v34 plugin ABI and gives us a
server event/frame hook for the first bot.