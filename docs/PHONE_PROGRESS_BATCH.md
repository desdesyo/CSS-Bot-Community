# Phone-only development batch (implemented foundations)

- Tactical AI: role-sensitive pure decision layer.
- Team tactics: trade, support fire, rotate, anchor and objective choices.
- MVP scoring: expanded events and weights.
- Economy: round-scoped one-purchase gate, buy-zone/alive/money checks and item prices.
- Modes: Classic, Deathmatch, Arms Race, Tactical, Juggernaut rule presets.
- Configuration: validation for bot traits/difficulty and HUD crosshair; default JSON preset.
- UI model: CSSBC submenu pages and sorted MVP leaderboard.
- Weapon tuning and map-performance JSON drafts already exist.

## Limitations
Core-only. Buy requests are not yet wired to CS:S player inventory; game-mode presets do not create actual rounds/respawns; menu models do not render Source VGUI; tuning config is not applied to weapon entities; map budgets are authoring targets. Build/test must be confirmed by CI, then behavior in game.
