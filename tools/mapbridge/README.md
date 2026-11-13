# CSSBC MapBridge — procedural VMF authoring (0.2)

MapBridge is a local MCP server for generating Source-engine VMF geometry. It is **not** a BSP compiler and does not make ChatGPT web connect to your PC by itself.

## Install / launch (Windows)

1. Install Node.js 20 or newer.
2. Open PowerShell in the repository root:
   ```powershell
   cd tools/mapbridge
   npm install
   $env:CSSBC_MAP_ROOT = (Resolve-Path ..\..).Path
   npm start
   ```
   The process stays running and speaks MCP over stdio; don't use this terminal for other commands.
3. Configure an MCP-capable desktop client to launch `node` with the absolute path to `tools/mapbridge/src/server.mjs`, repository root as working directory, and `CSSBC_MAP_ROOT` set to the repo root. Restart that client. ChatGPT in a normal browser session cannot attach to a random local MCP server.

All output is constrained to `maps/ModernDistrict/<name>.vmf`; map names are alphanumeric, underscore and dash only.

## Tool reference

| Tool | Inputs | Result |
|---|---|---|
| `map_create` | `name`, optional `overwrite` | New VMF with standard header |
| `map_add_box` | `name,min,max,material` | One rectangular brush |
| `map_add_room` | `name,origin,width,depth,height,thickness,floor,ceiling,material` | Floor/ceiling + four walls |
| `map_add_building` | `name,origin,width,depth,floors,floorHeight,wall,slabs,material` | Hollow multi-floor shell and floor slabs |
| `map_add_street` | `name,origin,length,roadWidth,sidewalk,axis,roadZ,materials` | Road + two sidewalks |
| `map_add_spawn` | `name,origin,team,angles` | CS:S CT/T spawn entity |
| `map_inspect` | `name` | Byte count, solids, entities |

Coordinates and dimensions are Source units (1 inch in Hammer units). Vector values are `[x,y,z]`. Geometry tools validate positive bounds and allocate unique VMF IDs. Brush geometry is axis-aligned; openings, stairs, detailed props, texture alignment, nav mesh and compile are not automated yet.

## Practical workflow

1. `map_create(name="test",overwrite=true)`
2. `map_add_street(name="test",origin=[-1024,0,0],length=2048,roadWidth=512,sidewalk=64,axis="x")`
3. `map_add_building(name="test",origin=[-512,700,0],width=1024,depth=768,floors=3,floorHeight=256)`
4. `map_add_room(name="test",origin=[-400,800,256],width=300,depth=300,height=220)`
5. `map_add_spawn(name="test",origin=[0,0,8],team="ct")`
6. `map_inspect(name="test")`

Open resulting VMF in Hammer, inspect it, then compile with a matching CS:S VBSP/VVIS/VRAD setup. Generated maps are not claimed playable until that compile and an in-game test succeed.
