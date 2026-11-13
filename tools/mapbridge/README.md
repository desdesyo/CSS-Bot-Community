# CSSBC MapBridge — procedural VMF authoring (0.2)

MapBridge is an assistant-facing local MCP server and procedural VMF authoring tool for Source-engine maps. It exposes map-generation and geometry tools over MCP stdio. It is **not** a BSP compiler. A desktop assistant/client must launch the MCP server; a normal browser chat cannot attach to a process on your PC by itself.

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

## One-command generator (new)\n\nFrom the repository root in PowerShell:\n\n```powershell\ncd tools/mapbridge\nnpm install\nnpm run generate -- CSSBC_District\n```\n\nThis starts MapBridge itself, creates/overwrites a district VMF, prints its exact path, and exits. No MCP desktop setup is needed for this generation command. The output is a graybox VMF; compiling/playtesting still requires legitimate CS:S game content and Hammer/Source compilers.\n\n## CI / smoke test

GitHub Actions runs JavaScript syntax checks and an end-to-end MCP stdio smoke test. The smoke test launches the server in a temporary directory, initializes MCP, lists tools, generates a district, adds a spawn, and verifies VMF structure, root-level spawn entities and unique IDs. Run it locally with `npm test`.

## Tool reference

| Tool | Inputs | Result |
|---|---|---|
| `map_generate_district` | `name,overwrite,blockSize,floors,seed` | One-call four-building test district, road, sidewalks and CT/T spawns (fastest first map) |\n| `map_create` | `name`, optional `overwrite` | New VMF with standard header |
| `map_add_box` | `name,min,max,material` | One rectangular brush |
| `map_add_room` | `name,origin,width,depth,height,thickness,floor,ceiling,material` | Floor/ceiling + four walls |
| `map_add_building` | `name,origin,width,depth,floors,floorHeight,wall,slabs,material` | Hollow multi-floor shell and floor slabs |
| `map_add_street` | `name,origin,length,roadWidth,sidewalk,axis,roadZ,materials` | Road + two sidewalks |
| `map_add_stairs` | `name,origin,steps,run,rise,width,axis,direction,material` | Solid step staircase |
| `map_add_window_wall` | `name,origin,length,height,windowWidth,windowBottom,windowHeight,axis,material` | Wall with rectangular opening |
| `map_add_roof` | `name,origin,width,depth,thickness,parapet,material` | Roof slab and optional parapet |
| `map_add_spawn` | `name,origin,team,angles` | CS:S CT/T spawn entity |
| `map_inspect` | `name` | Byte count, solids, entities |

Coordinates and dimensions are Source units (1 inch in Hammer units). Vector values are `[x,y,z]`. Geometry tools validate positive bounds and allocate unique VMF IDs. Brush geometry is axis-aligned; complex angled geometry, detailed props, texture alignment, nav mesh and compile are not automated yet.

## One-call starter map\n\nUse `map_generate_district(name=\"District01\",overwrite=true,blockSize=1024,floors=2)` to produce a compact graybox layout without issuing individual brush calls. It creates a broad ground plane, a road with sidewalks, four hollow building shells and CT/T spawn entities. The `seed` parameter is reserved for reproducible layout variation (currently geometry is deterministic).\n\n## Practical workflow

1. `map_create(name="test",overwrite=true)`
2. `map_add_street(name="test",origin=[-1024,0,0],length=2048,roadWidth=512,sidewalk=64,axis="x")`
3. `map_add_building(name="test",origin=[-512,700,0],width=1024,depth=768,floors=3,floorHeight=256)`
4. `map_add_room(name="test",origin=[-400,800,256],width=300,depth=300,height=220)`
5. `map_add_spawn(name="test",origin=[0,0,8],team="ct")`
6. `map_inspect(name="test")`

Open resulting VMF in Hammer, inspect it, then compile with a matching CS:S VBSP/VVIS/VRAD setup. Generated maps are not claimed playable until that compile and an in-game test succeed.
\n\n## Map Studio (GUI)\n\nOpen `studio.html` in any modern browser (no Node.js or MCP required). Adjust the district parameters, inspect the top-down preview, then click **Скачать VMF**. The generated VMF can be opened in Hammer; compile it with the CS:S VBSP tools to produce BSP.\n\n[Download/open Map Studio HTML](studio.html)\n