# SourcePawn compatibility layer — agent instructions

Read repository-root \`AGENTS.md\` before editing.

- This is a separate SourceMod plugin layer, not the C++ CSSBC core and not the native VSP/GameDLL.
- Confirm the exact SourceMod and SDKHooks versions supported by the target CS:S v34 server before using natives or properties.
- Check client index validity, in-game state, alive state, team, userid and entity property availability before every access.
- Validate command argument count and numeric ranges; never trust StringToInt output without bounds checks.
- Check money, prerequisites and spawn capacity before mutating account/player state. Perform purchase operations transactionally so failed deployment does not charge the player.
- Reset round-scoped state at round start and disconnect-scoped state at client disconnect; avoid stale client-slot data.
- Never describe an announcement as an actual NPC deployment. Current tier-3 support only announces the order; it does not spawn NPCs.
- Current Juggernaut layer sets health/max-health and a status flag; it does not implement six independently damageable armor plates.
- Add tests or a repeatable local-server test plan for insufficient funds, invalid args, dead/disconnected clients, round reset, team changes, repeated purchase and plugin reload.
- Compile with spcomp matching the installed SourceMod version; a successful compile does not prove runtime compatibility.
