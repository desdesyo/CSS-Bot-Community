import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readJournal, writeJournal, removeJournal } from "../task-journal.mjs";

test("task journal survives restart and preserves a completed result", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-journal-"));
  const path = join(root, "state", "task.json");
  try {
    const claimed = { task: { id: "task-1", action: "system_info" }, result: null };
    await writeJournal(path, claimed);
    assert.deepEqual(await readJournal(path), claimed);
    const completed = { ...claimed, result: { ok: true, platform: "win32" } };
    await writeJournal(path, completed);
    assert.deepEqual(await readJournal(path), completed);
    assert.deepEqual(JSON.parse(await readFile(path, "utf8")), completed);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("missing journal is a clean first-run state", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-journal-"));
  try { assert.equal(await readJournal(join(root, "missing.json")), null); }
  finally { await rm(root, { recursive: true, force: true }); }
});

test("invalid journal is not silently discarded", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-journal-"));
  const path = join(root, "bad.json");
  try {
    await writeJournal(path, { task: { id: "task-2" }, result: null });
    await (await import("node:fs/promises")).writeFile(path, "{broken");
    await assert.rejects(readJournal(path), SyntaxError);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("journal removal is idempotent", async () => {
  const root = await mkdtemp(join(tmpdir(), "solo-journal-"));
  const path = join(root, "task.json");
  try {
    await writeJournal(path, { task: { id: "task-3" }, result: null });
    await removeJournal(path);
    await removeJournal(path);
    assert.equal(await readJournal(path), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});
