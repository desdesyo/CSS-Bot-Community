# CSSBC Character & Weapon Art Pipeline (v34)

## Required roster (12 main bots + support templates)
- Terrorists: 6 unique character variants.
- Counter-Terrorists: 6 unique character variants.
- Support group I: 2 T + 2 CT (4 distinct variants).
- Support group II: 3 T + 3 CT (6 distinct variants).
- Support group III: 4 T + 4 CT (8 distinct variants).
- Juggernaut: 1 T and 1 CT heavy variant (two distinct silhouettes).
Support entries are **additional character variants**, not counted in the 6+6 main roster. Runtime can instantiate only the active squad size; don't spawn all support pools simultaneously.

## Visual identity / readable factions
### Terrorist family
Warm dusty palette, mixed civilian/tactical clothing, scarves, rolled sleeves, worn chest rigs, asymmetrical pouches. No identical headwear across adjacent characters. Distinguish each body silhouette (hood, cap, bare head, scarf, vest, jacket).
### Counter-Terrorist family
Cool muted olive/navy/charcoal palette, modern helmets or boonie hats, distinct plate carriers, knee pads, radio antenna, goggles. Keep team read at 20–30 m through silhouette and color blocking.
### Juggernauts
Heavy vest/armor, reinforced shoulder silhouette, helmet/visor, larger backpack; team color accents (T warm ochre / CT blue-gray) visible on upper arm and chest. Heavy body must be recognizably different, but movement/collision bounds stay gameplay-safe.

## Individual character variation table
| Slot | Silhouette | Main palette | Distinct marker |
|---|---|---|---|
| T-01 | hood + light vest | sand/olive | red scarf |
| T-02 | cap + rolled sleeves | brown/khaki | radio shoulder |
| T-03 | wrapped head + chest rig | tan/gray | dark goggles |
| T-04 | short jacket + backpack | muted green | orange strap |
| T-05 | bare head + heavy vest | clay/black | arm wrap |
| T-06 | long coat cut + light rig | beige/charcoal | striped scarf |
| CT-01 | helmet + plate carrier | navy/olive | white tape |
| CT-02 | boonie + light rig | gray/green | orange radio cable |
| CT-03 | full helmet + goggles | slate | blue shoulder patch |
| CT-04 | cap + heavy carrier | olive/black | knee pad asymmetry |
| CT-05 | helmet + compact rig | blue-gray | red medic pouch |
| CT-06 | hooded helmet + backpack | charcoal/olive | yellow sling |
| Support variants | reuse faction language, never duplicate exact head/torso combo; add role marker: medic, breacher, scout, rifleman |
| Juggernaut T | armored hood/visor + massive carrier | ochre/black | warm arm panels |
| Juggernaut CT | armored helmet + plated shoulders | slate/blue | cool arm panels |

## Weapon art standard
- Each weapon gets a coherent material set: dark parkerized metal, worn edges, polymer furniture, restrained grime, engraved serial/marking, wood only on appropriate legacy variants.
- No baked shadows/highlights in diffuse textures. Use normal map only for real grooves/bolts; roughness/specular authored conservatively for Source shader.
- Keep unique weapon silhouettes and faction finish variants; do not merely recolor every gun.
- Texture sizes: 512×512 for small props/sidearms; 1024×1024 for rifle diffuse; 256–512 for magazines/attachments. Power-of-two, mipmaps on, DXT1 opaque / DXT5 alpha.
- LOD policy: high detail close, reduced geometry at distance; no tiny text/bolts that shimmer at normal gameplay range.

## Asset naming and folders
`models/cssbc/characters/t/t_01.mdl` ... `t_06.mdl`
`models/cssbc/characters/ct/ct_01.mdl` ... `ct_06.mdl`
`models/cssbc/characters/support/group1/t_01.mdl` etc.
`models/cssbc/characters/support/group2/`, `group3/`
`models/cssbc/characters/juggernaut/jug_t.mdl`, `jug_ct.mdl`
`models/cssbc/weapons/<weapon>/<weapon>_v.mdl` (viewmodel), `_w.mdl` (world model)
`materials/models/cssbc/characters/<name>/`; `materials/models/cssbc/weapons/<weapon>/`

## Optimization budgets
- Character target: 7k–12k triangles normal, juggernaut 12k–18k; keep skeleton shared per faction, reuse animation sets.
- 2–3 LODs with silhouette-preserving reduction; no unique skeleton per skin.
- Texture atlas per body set (1–2 × 1024²) instead of dozens of tiny materials; reuse shared cloth/metal/skin maps.
- Weapon target: 4k–9k triangles rifle, 2k–5k pistol; LODs for dropped weapons.
- Shared materials and atlas variants; avoid transparent hair/straps where possible.
- Bots must use existing CS:S-compatible rig/animations until custom compiled MDLs are built. OBJ blockouts cannot be loaded as player models.

## Build/QA gate
- Source SDK v34 model compile (QC + SMD/DMX + studiomdl); no claim of playable assets before successful compile.
- Validate hitboxes, eye position, attachment points, weapon hand alignment, team readability, shadow, LOD transitions, and animation in v34.
- Smoke test 12 main bot skins + each support role + both juggernauts; verify no missing materials, purple checker, or animation mismatch.
