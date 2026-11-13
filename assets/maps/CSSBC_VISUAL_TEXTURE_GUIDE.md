# CSSBC Visual Target — modern Source-era map quality

## Art direction
A grounded modernized Dust2-inspired city, not a copy: warm limestone, cool painted metal, charcoal asphalt, muted teal shadows, restrained orange/red navigation accents. Keep enemy silhouettes readable against backgrounds. Landmarks: water tower, mosque-like civic dome, industrial stack, bridge, lit shopfront. Buildings use varied rooflines and façade rhythm; avoid repetitive identical blocks.

## Texture authoring standard (CS:S v34)
- Author diffuse/albedo source at 1024×1024 or 2048×2048 for hero surfaces; export in Source-compatible VTF. Use 512×512 for secondary props and 256×256/512×512 for trim sheets and small props.
- Every surface must be tileable where repeated; test seams at 3×3 tiling. Avoid baked directional lighting, giant baked shadows, and high-frequency noise in albedo.
- Use a trim-sheet workflow for architectural edges, window frames, door jambs, pipes and concrete lips. Share atlas/materials across many props.
- Use normal maps only for authored medium-scale relief; no fake noisy normals that shimmer at distance. Keep specular subdued and use Source-compatible `$bumpmap`, `$envmap` sparingly.
- Provide mipmaps and inspect at gameplay distance. Do not rely on 4K textures: Source 2006-era hardware benefits from controlled 512–2048 assets and low material count.
- Palette targets: limestone #B8A184/#8E7962; concrete #77766F; asphalt #454746; metal #53615F; accent rust #9A593D; foliage #526447. Values are guide colors, not final locked swatches.

## Optimization budgets (initial targets)
- World brushes define structural architecture; use props for modular detail and occluders.
- Keep repeated assets on shared materials; minimize unique VMTs and texture switches.
- Use static lighting; avoid dynamic light spam and expensive transparent surfaces.
- LOD or simplified silhouettes for distant skyline props; use skybox for beyond-playable districts.
- Visleaf/visibility boundaries at district transitions; seal interiors and avoid giant open visibility volumes.
- Keep cover collision simple; decorative geometry should not create tiny nav gaps or player snag points.
- Use fog/skybox to limit draw distance; preserve long-range combat sightlines where intentional.

## QA gates
1. Texture review at 1×, 2× tiling, and actual player view distance: no blur, pixel crawl, obvious seams or noisy shimmer.
2. Check mipmaps and texture memory in-game on a legacy PC; avoid oversharpening.
3. Test silhouettes and muzzle flashes against each district's dominant material palette.
4. Profile FPS, draw calls/material count, visibility leaves and lightmaps per district.
5. Ship no texture pack as finished until VTF/VMT files are loaded in CS:S v34 and screenshots verify it.

## Status
This document is the art/optimization target. It is not yet a generated VTF texture pack or a compiled VMF/BSP map.
