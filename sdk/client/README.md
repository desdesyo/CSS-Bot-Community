# Client pause menu integration

Compile `CSSBC_PauseMenu.cpp` into the **client** game DLL with the matching CS:S Source SDK VGUI headers/libs. Keep one panel instance alive for the client UI lifetime; construct it after VGUI is initialized and parent it to the client UI root.

In the client-mode input/key handler, intercept Escape:
```cpp
if (code == KEY_ESCAPE) {
    cssbcPauseMenu->Toggle();
    return 0; // consume; do not pass Escape to game input
}
```
When open, Escape closes the panel (handled by its `OnKeyCodePressed`). If your fork routes key presses directly to VGUI while the popup owns focus, it is consumed there. Avoid double toggling: either the client key hook toggles when closed and lets VGUI close when open, or route both states through one owner.

This is an overlay menu, **not a multiplayer simulation pause**. Server ticks continue. Resume closes; Options invokes stock game menu; Disconnect and Quit issue standard engine commands. The core repository lacks the CS:S client source tree and cannot wire the key hook automatically; this file is SDK-side implementation code, not yet a built/tested game DLL.
