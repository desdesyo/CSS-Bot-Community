import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("runner uses fixed repository and no shell execution", async () => {
  const source = await readFile(new URL("./lab.mjs", import.meta.url), "utf8");
  assert.match(source, /CSS-Bot-Community\.git/);
  assert.match(source, /shell:\s*false/);
  assert.doesNotMatch(source, /shell:\s*true/);
  assert.match(source, /TIMEOUT_MS/);
  assert.match(source, /report\.json/);
});
test("runner only exposes doctor and test actions", async () => {
  const source = await readFile(new URL("./lab.mjs", import.meta.url), "utf8");
  assert.match(source, /action==="doctor"/);
  assert.match(source, /action==="test"/);
  assert.doesNotMatch(source, /exec\(/);
});
