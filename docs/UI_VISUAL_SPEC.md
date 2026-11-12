# CSSBC UI & Visual Direction

This document records the agreed visual target. It is a design specification, not a claim that the Source HUD/VGUI has already been implemented.

## Reference and constraints

- Main menu: use the **third menu screenshot** from the conversation as the composition/mood reference (dark, cinematic, tactical). Recreate the layout in CSSBC rather than copying another game's assets.
- In-game visual language: use the **second gameplay screenshot** as the broad visual reference.
- Keep Counter-Strike readability and weapon handling. Do not turn CSS into a sci-fi shooter.
- Crosshair: small, classic configurable cross; no oversized circular/ring reticle.
- Weapon presentation: realistic, proportionate modern weapon models; not merely recolored skins. Keep silhouettes recognizable and sights usable.

## Main menu (target)

Replace the stock, bare Create Server / Join / Disconnect-first presentation with a CSSBC front end:

1. **Play** — quick launch / offline match with bots.
2. **New match** — map, team/side, bot count and difficulty, match options.
3. **Resume / last setup** — restore last used configuration where supported.
4. **CSSBC** — mod systems: AI, support calls, Juggernaut, gameplay options.
5. **Settings** — video, audio, controls, HUD and accessibility.
6. **Extras** — credits, mod info, installed content.

Server browser, connect and disconnect functions remain available as secondary actions; they are not deleted from the game.

## HUD target

- Minimal, high-contrast tactical HUD; restrained typography and spacing.
- Health and armor: compact, clearly differentiated indicators.
- Ammo: prominent current magazine count and smaller reserve count.
- Grenades/equipment: compact icons, avoid clutter.
- Money, team status and alive/dead teammate information where useful.
- Contextual CSSBC indicators: support availability/cost, Juggernaut armor plate status, tactical callouts and MVP recap.
- Classic crosshair remains independent from HUD theme and is configurable (size, gap, thickness, color).
- Avoid giant circles, animated clutter, excessive screen coverage and low-contrast text.

## Visual assets and performance budget

- New bot/player models and equipment; weapon models with coherent first-person arms, animations, sounds and view/world model alignment.
- New weapons must be integrated with actual weapon scripts, ammo, recoil, damage, reload and purchase rules—not only model replacements.
- Lighting and flashlight improvements should be selective and configurable. Preserve visibility and fair competitive readability.
- Low-spec-first: prefer efficient geometry/materials, sensible texture sizes (usually 512–1024 where sufficient), limited transparency/particles, and restrained dynamic lights. Avoid gratuitous 2K/4K assets.
- Provide low/medium visual presets and disable expensive effects independently.
- Keep stock maps and core bomb/hostage/round scenarios intact.

## Implementation status

This specification does not mean the menu, HUD, models, lighting or weapons are implemented. Actual runtime work requires a compatible CS:S game-code/SDK target and assets. UI work must be done in Source VGUI/HUD code and verified in-game; screenshots/mockups alone do not count as implementation.
