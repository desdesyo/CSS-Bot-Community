import test from "node:test";
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { isInside, validateWriteRequest } from "../file-policy.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");

test("allows a source/config text file with exact precondition hash", () => {
  assert.equal(validateWriteRequest({
    targetPath: "C:/Games/CSS/cstrike/cfg/overhaul.cfg",
    contentBytes: 128,
    expectedSha256: "a".repeat(64),
    actualSha256: "a".repeat(64)
  }), true);
});

test("allows creating a new file only with NEW precondition", () => {
  assert.equal(validateWriteRequest({
    targetPath: "C:/Games/CSS/cstrike/addons/sourcemod/configs/overhaul.ini",
    contentBytes: 0,
    expectedSha256: "NEW",
    actualSha256: "NEW"
  }), true);
});

test("rejects a stale expected hash without writing", () => {
  assert.throws(() => validateWriteRequest({
    targetPath: "C:/Games/CSS/cstrike/cfg/overhaul.cfg",
    contentBytes: 10,
    expectedSha256: "a".repeat(64),
    actualSha256: "b".repeat(64)
  }), /SHA-256 conflict/);
});

test("rejects binary plugins and DLLs in text writer", () => {
  for (const targetPath of ["C:/Games/CSS/cstrike/addons/sourcemod/plugins/cssbc.smx", "C:/Games/CSS/cstrike/bin/server.dll", "C:/Games/CSS/cstrike/bin/client.dll"]) {
    assert.throws(() => validateWriteRequest({
      targetPath, contentBytes: 100, expectedSha256: "NEW", actualSha256: "NEW"
    }), /not allowed|protected/);
  }
});

test("rejects oversized files and unsupported extensions", () => {
  assert.throws(() => validateWriteRequest({
    targetPath: "C:/Games/CSS/cstrike/cfg/large.cfg",
    contentBytes: 256 * 1024 + 1, expectedSha256: "NEW", actualSha256: "NEW"
  }), /256 KB/);
  assert.throws(() => validateWriteRequest({
    targetPath: "C:/Games/CSS/cstrike/cfg/payload.exe",
    contentBytes: 10, expectedSha256: "NEW", actualSha256: "NEW"
  }), /not allowed/);
});

test("path containment rejects sibling-prefix and traversal paths", () => {
  const root = resolve("/tmp/css-game");
  assert.equal(isInside(root, join(root, "cstrike", "cfg", "mod.cfg")), true);
  assert.equal(isInside(root, resolve("/tmp/css-game-evil", "mod.cfg")), false);
  assert.equal(isInside(root, resolve(root, "..", "outside.cfg")), false);
});

test("backup hash can be independently verified", () => {
  const original = Buffer.from("original config\n", "utf8");
  const backup = Buffer.from(original);
  assert.equal(hash(backup), hash(original));
});
