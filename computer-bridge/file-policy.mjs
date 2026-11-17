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
