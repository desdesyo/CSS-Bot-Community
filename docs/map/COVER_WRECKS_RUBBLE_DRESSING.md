# CSSBC Arena — environmental cover & destruction dressing

Map dressing specification for the 4-district arena. All props are gameplay cover first, visual decoration second.

## Cover placement plan

### Central Arena
- 4 low concrete barricades (72–80 units high) around the objective approach; leave 2 clear lanes, each ≥128 units.
- 2 sandbag nests offset from the main axis; each with a rear escape gap.
- 1 overturned light vehicle near a side lane, not centered on the bomb site.
- Broken concrete columns at the edge of the plaza, spaced so players can weave through without snagging.
- Scattered rubble only along wall edges; keep the central floor clear for readable fights.

### Industrial Yard
- 2 burned-out cars beside the fence, parallel to the wall; one intact delivery van as hard cover near a loading bay.
- Concrete jersey barriers in staggered pairs, with 128–192-unit gaps.
- Steel I-beam frames and rebar concrete stubs at a collapsed loading canopy.
- Pallets, drums, and a low crate stack in corners; no stacks directly on a route junction.
- A damaged forklift near a warehouse wall (forks lowered; no collision spike).

### Residential Edge
- One wrecked sedan at a curb and one half-burned hatchback in a courtyard; both leave a 160-unit passage.
- Broken masonry around a collapsed porch/low wall; rubble piles remain below 48 units on main routes.
- Two concrete shell frames (column + beam) suggest destroyed buildings; don't create invisible head-height collision.
- Sandbags at a narrow courtyard entrance, with an alternate route around the building.

### Greenbelt / Drainage
- 2 fallen concrete slabs beside the drainage channel, not across it.
- One burned utility vehicle at the edge of a clearing.
- Broken culvert pieces and exposed rebar at the bank; no sharp-looking mesh protrudes into player collision.
- Brush/low vegetation as concealment only in designated pockets; keep silhouettes visible against the background.

## Wreck and fire staging
- Wrecks: use dark soot gradient, missing windows, one or two damaged panels, tire debris; avoid bright orange all-over paint.
- Fire: one small flame cluster under a hood + smoke plume; one smoldering wreck with smoke only. Never put fire particles in every district.
- Fire/smoke should be cosmetic and not obscure player silhouettes; use short particle lifetime and low density.
- Place fire sources away from stairs, narrow doorways, bomb/escape interaction points, and spawn exits.
- If Source particle assets are unavailable, use a static burnt prop + small light sprite only as a fallback (not a fake animated fire).

## Broken concrete / steel frames
- Create 3 silhouettes: (A) two columns + broken beam, (B) partial wall with a jagged top, (C) collapsed slab resting on rubble.
- Main route clearance: ≥128 units; stair/door clearance: ≥96 units.
- Rebar is visual detail only; collision should be a simplified safe hull.
- No full-height invisible walls on broken frames: either solid brush hull follows the visible silhouette or use non-solid decorative models.

## Extra environmental storytelling (added)
- A tipped road sign pointing to districts A/B, its readable direction still useful.
- A small field checkpoint: sandbags, folding table, radio, empty water cans.
- A power pole leaning into a wall, cable sagging above player height (no low tripwire).
- A blocked street with a clear side passage and fresh tire tracks/dust.
- A half-open shutter, scattered papers and a dropped toolbox near a repair bay.
- A drained fountain / dry water basin as a landmark.
- One abandoned bus stop with bench and torn route board.
- Debris direction and soot trails tell where a blast came from; don't scatter random rubble uniformly.

## Performance and collision budget
- Prefer static prop models; use instanced/shared props where possible.
- Keep collision on cover props simple; decorative rubble/rebar should be non-solid.
- Avoid many overlapping physics props and moving debris.
- Test crouch, jump, sprint, and bot navigation around every cover cluster.
- No cover may create a one-way trap: every pocket needs a second exit or a clear line of retreat.
- Sightline test: each district has short, medium, and one limited long lane; no single perch controls the entire map.

## Status
This is placement/design guidance only. No prop entities have been placed in a VMF and no fire particle system or collision has been runtime-tested yet.
