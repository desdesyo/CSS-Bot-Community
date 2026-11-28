#!/usr/bin/env node
/**
 * Stamp every local JavaScript module edge in the published engine with the
 * exact source commit. This prevents mobile browsers from mixing cached
 * modules from different deployments.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const root = process.argv[2];
const buildId = process.argv[3];
if (!root || !buildId || !/^[a-f0-9]{7,40}$/i.test(buildId)) {
  console.error('Usage: node tools/version-engine-modules.mjs <engine-dir> <git-sha>');
  process.exit(2);
}

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.(?:m?js|html)$/i.test(entry.name)) files.push(path);
  }
  return files;
}

const files = await walk(root);
let rewritten = 0;
for (const file of files) {
  const before = await readFile(file, 'utf8');
  const after = before.replace(
    /(\bfrom\s*|\bimport\s*(?:\(\s*)?)(["'])(\.\.?\/[^"']+?\.m?js)(?:\?[^"']*)?\2/g,
    (_match, prefix, quote, specifier) => {
      rewritten++;
      return prefix + quote + specifier + '?v=' + buildId + quote;
    }
  );
  if (after !== before) await writeFile(file, after);
}
console.log('Stamped ' + rewritten + ' local module references across ' + files.length +
  ' engine files with build ' + buildId + '.');
if (rewritten === 0) {
  console.error('No local module references were found; refusing an unversioned publish.');
  process.exit(1);
}
