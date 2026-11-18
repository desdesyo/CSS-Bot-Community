import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { applyFileTransaction, restoreVerifiedBackup } from "../file-transaction.mjs";

const hash = value => createHash("sha256").update(value).digest("hex");

test("isolated transaction backs up, writes, and verifies exact bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-transaction-"));
  try {
    const target = join(root, "workspace", "sample.cfg");
    const backupRoot = join(root, "backups");
    await import("node:fs/promises").then(fs => fs.mkdir(join(root, "workspace")));
    const original = Buffer.from("original\r\nline two\n", "utf8");
    const replacement = Buffer.from("replacement\n", "utf8");
    await writeFile(target, original);
    const result = await applyFileTransaction(target, replacement, {
      expectedBeforeHash: hash(original), backupRoot
    });
    assert.equal(result.status, "written_and_verified");
    assert.equal(result.beforeHash, hash(original));
    assert.equal(result.afterHash, hash(replacement));
    assert.equal(await readFile(target, "utf8"), replacement.toString("utf8"));
    assert.equal(hash(await readFile(result.backupPath)), hash(original));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("guarded restore recovers the exact original file from a verified backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-restore-"));
  try {
    const target = join(root, "sample.cfg");
    const backupRoot = join(root, "backups");
    const original = Buffer.from("known-good\r\n");
    const changed = Buffer.from("changed\n");
    await writeFile(target, original);
    const result = await applyFileTransaction(target, changed, {
      expectedBeforeHash: hash(original), backupRoot
    });
    const restored = await restoreVerifiedBackup(target, result.backupPath, hash(changed), hash(original));
    assert.equal(restored.restored, true);
    assert.equal(await readFile(target, "utf8"), original.toString("utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("refuses stale state and never overwrites a concurrent edit", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-conflict-"));
  try {
    const target = join(root, "sample.cfg");
    await writeFile(target, "newer version");
    await assert.rejects(
      applyFileTransaction(target, Buffer.from("bad overwrite"), {
        expectedBeforeHash: hash("old version"), backupRoot: join(root, "backups")
      }),
      /changed after approval/
    );
    assert.equal(await readFile(target, "utf8"), "newer version");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("new file transaction creates only the requested file and no backup", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-new-file-"));
  try {
    const target = join(root, "new.cfg");
    const data = Buffer.from("created\n");
    const result = await applyFileTransaction(target, data, {
      expectedBeforeHash: "NEW", backupRoot: join(root, "backups")
    });
    assert.equal(result.backupPath, null);
    assert.equal(await readFile(target, "utf8"), data.toString("utf8"));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects a corrupt backup without changing the current file", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-corrupt-backup-"));
  try {
    const target = join(root, "sample.cfg");
    const backup = join(root, "bad.bak");
    await writeFile(target, "current");
    await writeFile(backup, "tampered");
    await assert.rejects(restoreVerifiedBackup(target, backup, hash("current"), hash("original")), /Backup hash does not match/);
    assert.equal(await readFile(target, "utf8"), "current");
  } finally { await rm(root, { recursive: true, force: true }); }
});


test("rejects symbolic-link targets without modifying the linked file", async t => {
  const root = await mkdtemp(join(tmpdir(), "solo-symlink-"));
  try {
    const real = join(root, "real.cfg");
    const link = join(root, "linked.cfg");
    await writeFile(real, "do not change");
    try { await (await import("node:fs/promises")).symlink(real, link); }
    catch (error) {
      if (["EPERM", "EACCES", "ENOTSUP"].includes(error?.code)) return t.skip("Symlink creation is not permitted on this runner");
      throw error;
    }
    await assert.rejects(
      applyFileTransaction(link, Buffer.from("malicious overwrite"), {
        expectedBeforeHash: hash("do not change"), backupRoot: join(root, "backups")
      }),
      /Symbolic-link targets/
    );
    assert.equal(await readFile(real, "utf8"), "do not change");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("preserves UTF-8, Unicode names, and mixed newline bytes exactly", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-unicode-"));
  try {
    const target = join(root, "настройки-猫.cfg");
    const data = Buffer.from("строка 1\r\nстрока 2\n猫\r", "utf8");
    const result = await applyFileTransaction(target, data, {
      expectedBeforeHash: "NEW", backupRoot: join(root, "backups")
    });
    assert.equal(result.afterHash, hash(data));
    assert.deepEqual(await readFile(target), data);
  } finally { await rm(root, { recursive: true, force: true }); }
});
