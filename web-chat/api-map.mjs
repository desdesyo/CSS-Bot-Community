import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("./", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const tick = String.fromCharCode(96);
const unique = (values) => [...new Set(values)].sort();

export async function renderApiMap() {
  const [runtime, html] = await Promise.all([
    read("agent-runtime/src/index.ts"),
    read("public/index.html")
  ]);
  const exactRoutes = unique([...runtime.matchAll(/url\.pathname\s*===\s*["']([^"']+)["']/g)].map((m) => m[1]));
  const prefixRoutes = unique([...runtime.matchAll(/url\.pathname\.startsWith\(["']([^"']+)["']\)/g)].map((m) => m[1]));
  const tools = unique([...runtime.matchAll(/name:\s*["']([a-z][a-z0-9_-]*_[a-z0-9_-]+)["']/g)].map((m) => m[1]));
  const browserCalls = unique([...html.matchAll(/["'](\/api\/[a-zA-Z0-9_/?$.-]+)["']/g)].map((m) => m[1]));
  const bullet = (value) => "- " + tick + value + tick;
  return [
    "# SOLO.Chat API and tool map",
    "",
    "> Generated from current Worker and browser source. Run npm run api:map from web-chat/. CI checks this snapshot.",
    "",
    "## Worker route matchers",
    "",
    "### Exact paths",
    ...exactRoutes.map(bullet),
    "",
    "### Prefix paths",
    ...prefixRoutes.map((route) => bullet(route + "…")),
    "",
    "## Registered agent / MCP tools",
    "",
    ...tools.map(bullet),
    "",
    "## Browser API path references",
    "",
    ...browserCalls.map(bullet),
    "",
    "## Architecture boundary",
    "",
    "- Browser requests are handled by the Worker; authenticated agent requests are delegated to the Durable Object / Pi harness.",
    "- Registered Pi tools are discovered on demand; the complete catalog is not necessarily sent to the model on every turn.",
    "- The MCP image bridge exposes its own protocol surface; it is not the same thing as the full agent tool registry.",
    "- This inventory proves names are present in source, not that credentials, providers, deployment, or live calls work.",
    ""
  ].join("\n");
}

export async function verifyApiMap() {
  const [expected, actual] = await Promise.all([renderApiMap(), read("API_MAP.md")]);
  assert.equal(actual, expected, "API_MAP.md is stale. Run npm run api:map and commit the refreshed map.");
  return { exactRoutes: expected.split("\n").filter((line) => line.startsWith("- " + tick + "/")).length, tools: expected.split("\n").filter((line) => line.startsWith("- " + tick) && line.includes("_")).length };
}

if (process.argv.includes("--write")) {
  await (await import("node:fs/promises")).writeFile(new URL("API_MAP.md", root), await renderApiMap());
  console.log("Updated API_MAP.md from current source.");
} else if (process.argv.includes("--check")) {
  const result = await verifyApiMap();
  console.log("API map is current: " + result.exactRoutes + " exact routes, " + result.tools + " tool entries.");
}
