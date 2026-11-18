import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);

test("Windows launcher never expands the pairing code into a shell command", async () => {
  const launcher = await readFile(new URL("START-SOLO-CHAT.cmd", root), "utf8");
  assert.match(launcher, /set \/p SOLO_PAIR_CODE=/);
  assert.match(launcher, /node agent\.mjs pair https:\/\/cssbc-github-chat\.descapan\.workers\.dev/);
  assert.doesNotMatch(launcher, /%SOLO_PAIR_CODE%|%PAIRCODE%/i);
  assert.match(launcher, /set "SOLO_PAIR_CODE="/);
});

test("agent validates pairing code as exactly six digits", async () => {
  const agent = await readFile(new URL("agent.mjs", root), "utf8");
  assert.match(agent, /\^\\d\{6\}\$/);
  assert.match(agent, /process\.env\.SOLO_PAIR_CODE/);
});

test("example config enables restricted mode without granting broad paths", async () => {
  const config = JSON.parse(await readFile(new URL("config.example.json", root), "utf8"));
  assert.equal(config.safeMode, true);
  assert.equal(config.gameRoot, "");
  assert.deepEqual(config.allowedRoots, []);
});
