import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const playSource = readFileSync(resolve(root, 'play.html'), 'utf8');
const sceneDeclaration = playSource.indexOf('const scene=new THREE.Scene()');
if (sceneDeclaration < 0) throw new Error('SOLO scene declaration is missing');
if (playSource.includes('disableShadowCasters(scene)')) throw new Error('Unsafe scene traversal during startup is forbidden');
const firstSceneUse = playSource.indexOf('scene.add(');
if (firstSceneUse >= 0 && firstSceneUse < sceneDeclaration) throw new Error('Scene is used before initialization');
for (const file of ['play.html', 'import.html']) {
  const html = readFileSync(resolve(root, file), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s+type="(module)")?>([\s\S]*?)<\/script>/g)];
  if (!scripts.length) throw new Error('No executable inline scripts found in ' + file);
  for (let index = 0; index < scripts.length; index++) {
    const isModule = scripts[index][1] === 'module';
    const args = isModule ? ['--check', '--input-type=module'] : ['--check'];
    const checked = spawnSync(process.execPath, args, { input: scripts[index][2], encoding: 'utf8' });
    if (checked.status !== 0) {
      process.stderr.write(file + ' script ' + (index + 1) + ' failed syntax check:\n');
      process.stderr.write(checked.stderr || checked.stdout);
      process.exit(checked.status || 1);
    }
  }
  process.stdout.write(file + ': ' + scripts.length + ' inline script(s) syntax OK\n');
}
