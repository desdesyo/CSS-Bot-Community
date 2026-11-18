import { basename, extname, isAbsolute, relative, sep } from "node:path";

export const WRITABLE_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".xml", ".cfg", ".ini", ".vdf", ".kv", ".res", ".rc",
  ".cpp", ".h", ".c", ".sp", ".inc", ".sma", ".js", ".ts", ".html", ".css",
  ".yaml", ".yml", ".toml", ".sql"
]);

export const PROTECTED_CORE_FILES = new Set([
  "server.dll", "client.dll", "engine.dll", "tier0.dll", "vstdlib.dll",
  "filesystem_steam.dll", "vphysics.dll"
]);

export function isInside(root, candidate) {
  const rel = relative(root, candidate);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel));
}

export function validateWriteRequest({ targetPath, contentBytes, expectedSha256, actualSha256 }) {
  if (!targetPath || typeof targetPath !== "string") throw new Error("A valid target path is required");
  if (!Number.isInteger(contentBytes) || contentBytes < 0 || contentBytes > 256 * 1024)
    throw new Error("Text file write is limited to 256 KB");
  const name = basename(targetPath).toLowerCase();
  if (PROTECTED_CORE_FILES.has(name)) throw new Error("Core game binaries are protected from direct writes");
  if (!WRITABLE_EXTENSIONS.has(extname(targetPath).toLowerCase()))
    throw new Error("This file type is not allowed for text writes. Binary plugins and DLLs require a separate verified package installer.");
  const expected = String(expectedSha256 || "");
  const actual = String(actualSha256 || "");
  if (expected !== "NEW" && !/^[a-f0-9]{64}$/i.test(expected))
    throw new Error("Provide the exact expected SHA-256 or NEW for a new file");
  if (expected.toLowerCase() !== actual.toLowerCase())
    throw new Error("SHA-256 conflict: expected " + expected + ", actual " + actual + ". No file was changed.");
  return true;
}

export function validateSmxInstallRequest({ relativeTarget, sourceUrl, expectedSha256, currentSha256, contentBytes }) {
  if (typeof relativeTarget !== "string" || relativeTarget.includes("\\") || relativeTarget.startsWith("/") ||
      relativeTarget.split("/").some(part => !part || part === "." || part === ".."))
    throw new Error("Plugin destination must be a clean relative path under cstrike/addons/sourcemod/plugins/");
  const normalized = relativeTarget.toLowerCase();
  if (!normalized.startsWith("cstrike/addons/sourcemod/plugins/") || !normalized.endsWith(".smx"))
    throw new Error("Only .smx files inside cstrike/addons/sourcemod/plugins/ can be installed");
  if (!Number.isInteger(contentBytes) || contentBytes < 1 || contentBytes > 10 * 1024 * 1024)
    throw new Error("Compiled plugin size must be between 1 byte and 10 MB");
  const url = new URL(sourceUrl);
  const allowedHosts = new Set(["raw.githubusercontent.com", "github.com", "objects.githubusercontent.com", "release-assets.githubusercontent.com"]);
  if (url.protocol !== "https:" || !allowedHosts.has(url.hostname.toLowerCase()))
    throw new Error("Plugin source must be an HTTPS GitHub URL");
  const expected = String(expectedSha256 || "");
  const current = String(currentSha256 || "");
  if (expected !== "NEW" && !/^[a-f0-9]{64}$/i.test(expected))
    throw new Error("Provide the exact expected current-file SHA-256 or NEW");
  if (current !== "NEW" && !/^[a-f0-9]{64}$/i.test(current))
    throw new Error("Current plugin SHA-256 is invalid");
  if (expected.toLowerCase() !== current.toLowerCase())
    throw new Error("Current plugin SHA-256 conflict; no file was changed");
  return true;
}


// Game inspection paths are a separate read-only capability.
// Reject device/UNC paths, traversal, NUL and NTFS alternate data streams.
export function validateGameInspectionInput(input) {
  if (typeof input !== "string" || !input || input.length > 1024 || input.includes("\0"))
    throw new Error("A valid game inspection path is required");
  const value = input.trim();
  if (value.startsWith("\\\\") || value.startsWith("//") || /[<>"]/g.test(value))
    throw new Error("Device, UNC and ambiguous Windows paths are not allowed");
  const parts = value.replace(/\\/g, "/").split("/");
  if (parts.some(part => part === "." || part === ".."))
    throw new Error("Path traversal and dot segments are not allowed");
  const pathForColonCheck = value.replace(/^GAME:[\\/]/i, "").replace(/^[a-zA-Z]:[\\/]/, "");
  if (pathForColonCheck.includes(":")) throw new Error("Alternate data streams are not allowed");
  return true;
}

export function isSafeGameRelativePath(value) {
  try { validateGameInspectionInput(value); } catch { return false; }
  if (/^[a-zA-Z]:/.test(value) || value.startsWith("/") || value.startsWith("\\\\"))
    return false;
  return value.split(/[\\/]+/).every(part => part && part !== "." && part !== ".." && !part.includes(":"));
}
