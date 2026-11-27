import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(resolve(root, 'play.html'), 'utf8');
const scripts = [...html.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
if (scripts.length !== 1) {
  throw new Error('Expected exactly one inline module script, found ' + scripts.length);
}
const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], {
  input: scripts[0][1],
  encoding: 'utf8'
});
if (checked.status !== 0) {
  process.stderr.write(checked.stderr || checked.stdout);
  process.exit(checked.status || 1);
}
process.stdout.write('3D client inline module syntax: OK\n');
