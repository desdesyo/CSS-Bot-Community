# CSSBC Arena — material manifest (Source SDK / CS:S v34)

These VMT files are runtime material definitions. They require matching VTF files in the same material folder; VMT alone does not create a texture.

Target path in game:
`cstrike/materials/cssbc/arena/`

## VMT templates

### stone_wall.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/stone_wall"
    "$surfaceprop" "brick"
    "$detail" "detail/detailsprites"
    "$detailscale" "4"
    "$detailblendmode" "0"
    "$detailblendfactor" "0.08"
    "$detailblendtint" "[1 1 1]"
}
```

### plaster.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/plaster"
    "$surfaceprop" "concrete"
}
```

### concrete.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/concrete"
    "$surfaceprop" "concrete"
}
```

### asphalt.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/asphalt"
    "$surfaceprop" "concrete"
}
```

### metal_rust.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/metal_rust"
    "$surfaceprop" "metal"
}
```

### wood_crates.vmt
```vmt
"LightmappedGeneric"
{
    "$basetexture" "cssbc/arena/wood_crates"
    "$surfaceprop" "wood"
}
```

## Required source images
Six seamless 512×512 RGB PNGs:
- stone_wall.png — sand-colored stone blocks / worn mortar
- plaster.png — warm dusty plaster
- concrete.png — gray aged concrete with restrained cracks
- asphalt.png — charcoal road surface, subtle aggregate
- metal_rust.png — oxidized brown painted metal
- wood_crates.png — aged crate planks

## Conversion and validation
1. Convert each PNG to VTF using VTFEdit (or compatible Source texture tool).
2. For opaque textures use DXT1; keep mipmaps enabled. No alpha channel needed.
3. Put VTF and VMT together under `cstrike/materials/cssbc/arena/`.
4. Open Hammer and use material names `cssbc/arena/stone_wall`, etc.
5. Compile map; inspect in CS:S v34 for missing textures, seams, blur, mip shimmer, overbright albedo, and frame-time impact.
6. If texture appears pink/black, verify VMT path omits `.vtf`, file casing, and actual install location.

No VTF/PNG binaries are included by this manifest. It is a material contract and conversion checklist, not a verified runtime texture pack.
