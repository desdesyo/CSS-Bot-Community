# CSSBC MapBridge (MCP)

A local Model Context Protocol server so an AI client with MCP support can author VMF geometry directly, instead of relying on Hammer UI.

## Setup (Windows)
1. Install Node.js 20+.
2. In this directory run `npm install`.
3. Configure your MCP client to launch `node` with absolute argument `...	ools\mapbridge\src\server.mjs`, working directory repo root; env `CSSBC_MAP_ROOT=C:\path\to\CSS-Bot-Community`.
4. Restart the client. It exposes map tools to the model through MCP.

**Important:** ChatGPT web cannot attach itself to an arbitrary MCP server running on your PC. This is a bridge implementation; it requires an MCP-capable client/runtime and a configured connection. It does not secretly connect or execute locally.

The first version is intended to add validated VMF operations (create map, brush, entity, inspect, compile) incrementally. Never run compiler commands on untrusted VMFs.
