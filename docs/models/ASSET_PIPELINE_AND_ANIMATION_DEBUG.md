# CSSBC — Character, weapon, materials & animation integration

> Status: production asset/build plan + debug instrumentation contract. This document does **not** claim that compiled MDL/VTF assets or runtime animation tests already exist. Source SDK compiler and CS:S v34 runtime are required for that validation.

## 1. Asset graph (single source of truth)

```
Roster JSON (bot id -> character family, team, support group, skin)
  -> Character QC manifest (body + equipment + skin/material set)
  -> studio model compiler (studiomdl) -> models/cssbc/bots/<team>/<id>.mdl
  -> materials/models/cssbc/bots/<team>/<family>/*.vmt + VTF
BotRuntime spawn
  -> roster model id -> model path
  -> equipment loadout -> weapon entity classname + view/world model
  -> animation state -> sequence/activity + weapon gesture
  -> AnimationDebug overlay/log -> diagnostics
```

No bot may choose a model and loadout independently: both resolve from the roster entry. Team, support tier and juggernaut are explicit fields; no runtime filename guessing.

## 2. Character model families

Use **shared rig + family geometry + per-character material/gear variants**, not 30 separately duplicated skeletons:
- T base: 6 identities (silhouette/gear/material variation)
- CT base: 6 identities
- Support group I: 2 T + 2 CT
- Support group II: 3 T + 3 CT
- Support group III: 4 T + 4 CT
- Juggernaut: dedicated heavy silhouette, armor and movement profile; not a normal skin.
Total roster: 15 T + 15 CT + separate Juggernaut.

Every family QC must declare the same validated skeleton/bone naming contract, compatible hitbox set, eye attachment, weapon attachment and animation sequence names. Cosmetic geometry cannot alter gameplay hitboxes. Avoid excessive unique materials: atlas per faction/family, shared normal/AO maps, team-specific accent masks.

## 3. Animation contract

Required sequence/activity coverage:
- idle (rifle/pistol/knife), walk/run (8-way if source set supports it), crouch idle/move
- jump/fall/land, ladder if map uses ladders
- primary fire, secondary fire, reload, draw/holster
- knife slash/stab, grenade throw
- flinch (front/left/right), death (front/back/left/right), plant/defuse
- Juggernaut: heavy locomotion, heavy fire/reload, melee impact, stagger; never silently fall back to normal-speed locomotion.

The bridge must translate bot intent into a **single animation state** per frame:
`locomotion + stance + weapon class + action + hit reaction`.
Priority: death > hit reaction > scripted objective action > reload/fire > locomotion > idle. Interruptions (death, hit, weapon switch) cancel incompatible actions and reset timers. Weapon gestures must match the held weapon; no AK reload on pistol.

## 4. Weapon asset contract

For each weapon entry:
- canonical gameplay classname and loadout slot
- world model and first-person view model path (where the game supports it)
- hand/weapon attachment names and orientation
- fire/reload/draw/idle sequences; muzzle attachment; shell ejection (if applicable)
- shared material family and low-cost LOD policy
- fallback model explicitly listed; missing assets must log an error, not silently show a random weapon.

Do not mix custom model scale/offset with hit registration. World model is for other players; view model is local client presentation.

## 5. Material pipeline

Source files: `assets/materials/arena/source/*.svg` are editable vector source, **not game textures**.
Pipeline per material:
1. render SVG to 512 or 1024 square PNG (sRGB; seamless edge check)
2. bake/author normal + AO where useful
3. convert PNG/TGA to VTF with mipmaps (DXT1 opaque; DXT5 only for alpha)
4. VMT points to `cssbc/...` and uses correct surfaceprop
5. test under bright/dark lighting, distance and mip transitions; check missing-texture console output.

Character materials: diffuse/albedo + normal + optional mask; no unique 4K texture per bot. Target shared 1024 atlas per family, 512 for small accessories; reuse material instances.

## 6. Animation debugging (must be build-gated)

Cvars (development only):
- `cssbc_anim_debug 0|1`: overlay current bot animation state
- `cssbc_anim_debug_bone 0|1`: draw skeleton/bone axes
- `cssbc_anim_debug_events 0|1`: log state transitions and event dispatch
- `cssbc_anim_debug_validate 0|1`: validate sequence/attachment availability on model load
- `cssbc_anim_debug_bot <entity index|userid>`: select one bot for overlay
- `cssbc_anim_debug_freeze 0|1`: freeze selected bot at current cycle
- `cssbc_anim_debug_cycle <0..1>`: set sequence cycle when frozen
- `cssbc_anim_debug_rate <0.1..2.0>`: playback-rate override for diagnosis only

Overlay line format:
`[CSSBC ANIM] bot=... model=... seq=... activity=... weapon=... stance=... cycle=... rate=... transition=...`

Validation catches:
- requested sequence missing; fallback sequence used
- sequence duration <= 0 / invalid cycle / NaN playback rate
- incompatible weapon gesture and held weapon
- stale action timer after interruption
- missing muzzle/weapon attachment
- model path or material missing
- excessive animation transition churn (state changes every frame)
- stuck reload/plant/defuse state and locomotion while dead.

Debug code must be compiled only in development builds or guarded by a server cvar; never leave bone drawing enabled in release.

## 7. QA gates (no false green)

1. Compile every QC with the exact v34-compatible `studiomdl`; zero fatal errors.
2. Load every model in-game; verify material paths and attachments.
3. Run animation matrix above for each skeleton family and Juggernaut.
4. Record console log + screenshots/video of transitions; verify 30 roster entries resolve.
5. Compare hitboxes and movement speed against stock bots; cosmetic model differences cannot change balance.
6. Test low FPS and server tick conditions; animation state remains deterministic.
7. Mark asset as `validated` only after these gates pass. A manifest entry alone is not a compiled asset.

## 8. Integration TODOs (code work)
- Add `BotVisualProfile` resolver keyed by roster id.
- Add `WeaponVisualProfile` resolver keyed by loadout classname.
- Add animation state machine and interruption-safe timers to SDK adapter.
- Add debug cvars/overlay/logging and sequence validation.
- Add asset smoke test that checks model/material paths and required sequence names.
- Keep the core simulation independent from SDK model/animation calls; adapter owns Source entity APIs.
