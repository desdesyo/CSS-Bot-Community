import test from "node:test";
import assert from "node:assert/strict";
import { TASKS, validateTask } from "./compute-worker.mjs";

const base = {
  schema_version: 1,
  task_id: "12345678-1234-1234-1234-123456789abc",
  task_type: "node-smoke",
  commit_sha: "a".repeat(40),
  timeout_seconds: 600
};

test("compute worker accepts only commit-pinned allowlisted tasks", () => {
  assert.equal(validateTask(base), base);
  assert.ok(Array.isArray(TASKS["node-smoke"]));
  assert.ok(Array.isArray(TASKS["cmake-test"]));
  assert.throws(() => validateTask({ ...base, task_type: "shell", command: "whoami" }), /not allowlisted/);
  assert.throws(() => validateTask({ ...base, commit_sha: "bad" }), /commit SHA/);
  assert.throws(() => validateTask({ ...base, timeout_seconds: 9999 }), /timeout/);
});
