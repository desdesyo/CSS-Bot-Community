# CSSBC MapBridge — procedural VMF authoring (0.2)

MapBridge is an assistant-facing MCP server and procedural VMF authoring tool for Source-engine maps. It supports local MCP over stdio and authenticated remote MCP over Streamable HTTP. It is **not** a BSP compiler.

## Install / launch locally (Windows)

1. Install Node.js 20 or newer.
2. In PowerShell, from the repository root:

   ```powershell
   cd tools/mapbridge
   npm install
   $env:CSSBC_MAP_ROOT = (Resolve-Path ..\..).Path
   npm start
   ```

3. For a local MCP-capable desktop client, configure command `node`, argument `<repo>\tools\mapbridge\src\server.mjs`, working directory `<repo>`, and environment variable `CSSBC_MAP_ROOT=<repo>`. The server speaks MCP over stdio.

## Remote MCP bridge (new)

**Windows quick start:** double-click `Start-MapBridge-Remote.cmd`. It checks Node.js, installs dependencies if needed, generates a fresh 256-bit bearer token and starts the authenticated MCP HTTP server on localhost. Copy the token shown in that window into your trusted remote MCP client's Bearer authentication settings. Keep the window open.

To make the endpoint reachable outside your PC, install `cloudflared` and double-click `Open-MapBridge-Tunnel.cmd` in a second window. It prints a temporary HTTPS URL; append `/mcp` to use it as the remote MCP endpoint. Both windows must remain open. The quick-tunnel URL changes after restart.

MapBridge can expose the same tools over authenticated Streamable HTTP. It binds to localhost by default; it does not open your PC to the LAN or internet.

Start it in PowerShell:

```powershell
cd tools/mapbridge
npm install
$env:CSSBC_MAP_ROOT = (Resolve-Path ..\..).Path
$env:CSSBC_MAPBRIDGE_TRANSPORT = "http"
$env:CSSBC_MAPBRIDGE_HOST = "127.0.0.1"
$env:CSSBC_MAPBRIDGE_PORT = "8787"
$env:CSSBC_MAPBRIDGE_TOKEN = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
node src/server.mjs
```

The authenticated MCP endpoint is `http://127.0.0.1:8787/mcp`. Health check: `http://127.0.0.1:8787/health`. Every MCP request must include `Authorization: Bearer <the same token>`. HTTP mode refuses to start without a token of at least 32 characters. The bearer token is never printed by MapBridge. Keep the terminal open while the assistant is connected.

### Expose it remotely over HTTPS

If the assistant service cannot reach your PC directly, create an HTTPS tunnel to the local endpoint. For a temporary Cloudflare quick tunnel, install `cloudflared` and run this in a second terminal:

```powershell
cloudflared tunnel --url http://127.0.0.1:8787
```

Cloudflare prints a temporary `https://…trycloudflare.com` address. The remote MCP URL is that address plus `/mcp`. Configure the remote MCP client to use Bearer authentication with the token generated above. Keep both terminals open. The temporary URL changes when the tunnel restarts. For long-term use, configure a persistent tunnel and access policy instead of a quick tunnel.

**Security:** do not change the bind address to `0.0.0.0` just to make remote access work. Use an HTTPS tunnel or TLS reverse proxy. Treat the bearer token like a password; never commit it, paste it into GitHub, or share it in screenshots. The unauthenticated `/health` route exposes only service/version information; all map-editing MCP operations require the bearer token. This bridge gives a remote MCP client access to files under `CSSBC_MAP_ROOT`, so only connect a client you trust.

The HTTP endpoint implements MCP Streamable HTTP, not a custom REST API. A compatible remote MCP client must support Streamable HTTP and the configured bearer-token authentication method. ChatGPT browser chats do not automatically connect to a local process; use a supported remote MCP connector/client and configure the endpoint and authentication there.

## One-command generator (new)\n\nFrom the repository root in PowerShell:\n\n```powershell\ncd tools/mapbridge\nnpm install\nnpm run generate -- CSSBC_District\n```\n\nThis starts MapBridge itself, creates/overwrites a district VMF, prints its exact path, and exits. No MCP desktop setup is needed for this generation command. The output is a graybox VMF; compiling/playtesting still requires legitimate CS:S game content and Hammer/Source compilers.\n\n## CI / smoke test

GitHub Actions runs JavaScript syntax checks and an end-to-end MCP stdio smoke test. The smoke test launches the server in a temporary directory, initializes MCP, lists tools, generates a district, adds a spawn, and verifies VMF structure, root-level spawn entities and unique IDs, then runs the one-command CLI generator in an isolated temporary workspace. Run it locally with `npm test`.

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