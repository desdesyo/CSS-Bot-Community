# CSSBC client/VGUI integration — agent instructions

Read \`../AGENTS.md\` and repository-root \`AGENTS.md\` first.

- Client UI code must be compiled into the matching CS:S v34 client DLL, not the server DLL or portable core.
- Verify VGUI interfaces, panel ownership, parent lifetime, input routing and exact client SDK headers before changing UI hooks.
- Escape handling must have one owner. Avoid double toggling or swallowing Escape when another panel owns focus.
- A CSSBC overlay menu is not a multiplayer pause; server simulation continues.
- Disconnect, quit, resume and settings actions must use verified engine commands and must not silently change server state.
- Keep UI rendering separate from gameplay state. Replicated data must come from a validated server->client message path.
- Test open/close, focus, resize, disconnect, map change, missing parent and repeated construction/destruction.
- The presence of a panel source file is not proof that the client DLL includes or displays it.
