# CSS Bot Community — implementation batch

This page records implementation status, not a claim that a playable DLL exists.

## 1. Bot AI / combat
- Added `src/CSSBC_Tactics.h/.cpp`: deterministic role-aware tactical decisions (Entry, Support, Anchor, Sniper, IGL).
- Decisions include objective plant/defuse, teammate trade, retreat, cover, sniper hold, anchor defense, support fire, time-pressure push and rotate.
- Input is a snapshot; Source SDK adapter must supply visibility, cover, bomb state and teammate death/trade window.
- This is a first decision layer, not pathfinding, aiming, perception or a finished bot brain.

## 2. Team coordination
- Tactical input has ally/enemy counts, recent teammate death and trade opportunity.
- TradeKill is emitted only if teamwork trait and survival thresholds pass.
- SupportFire and Rotate are role-driven; engine integration must issue actual radio commands/weapon fire/navigation.

## 3. MVP
- `MVPScore` now supports kills, headshots, assists, plants, defuses, rescue/save, cover fire, armor damage, trades, grenade impact and last-alive clutch.
- Event points are multipliers; event producers must report normalized value and avoid duplicate awards.
- MVP remains score accumulation; round-end ranking/tie-break UI still needs integration.

## 4. Economy
- Existing `CSSBCSystem::CanPurchase/RequestSupport` and support tiers are core primitives.
- SDK layer still needs to read player cash, buy-zone, round state and execute purchases. Do not let bot buy twice per round.

## 5. Weapons / balance
- `configs/weapons_balance.json` is the initial 10-weapon tuning table (draft values, not final competitive balance).
- These values are not yet wired into weapon entities or recoil/spread scripts. Playtest and tune by range, TTK, armor and magazine economy.

## 6. UI
- Existing engine-independent `MenuController` and `BuildHud` models remain presentation data.
- Source VGUI implementation must render main/play/new match/CSSBC/settings/extras/server browser and HUD; bind events and localization in SDK project.

## 7. Maps / atmosphere
- `configs/map_performance.json` provides low-end-friendly static-lighting, LOD, material reuse and effects budgets.
- `maps/lighting/twilight_entities.txt` and `docs/MAP_TWILIGHT_PASS.md` are map authoring inputs, not compiled BSP lighting.

## 8. Performance
- Keep decision code allocation-free and independent of engine frame loop.
- Use static lighting, PVS, LOD, trim sheets and controlled smoke overdraw; preserve cover readability.
- Profile CPU/GPU and frame pacing on target hardware before setting hard budgets.

## Remaining to playable build
A compatible CS:S game SDK/source fork, server/client DLL entry points, bot entity/navigation integration, weapon scripts/models compiled to Source formats, VGUI resources, build toolchain and in-game testing are still required. OBJ files are blockouts, not compiled MDLs.
