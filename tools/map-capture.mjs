import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = process.env.CAPTURE_DIR || 'artifacts/map-capture';
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--use-gl=angle','--use-angle=swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const consoleErrors = [];
page.on('pageerror', error => consoleErrors.push(String(error?.stack || error)));
page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
try {
  await page.goto('http://127.0.0.1:4173/engine/v2/index.html?capture=1', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !!window.__SOLO_CAPTURE_API__, null, { timeout: 180000 });
  const boot = await page.evaluate(() => window.__SOLO_CAPTURE_API__.start());
  await page.waitForFunction(() => window.__SOLO_CAPTURE_API__?.metrics().started && window.__SOLO_CAPTURE_API__?.metrics().bots >= 1, null, { timeout: 180000 });
  await page.waitForTimeout(5000);
  const overviewCapture = await page.evaluate(async () => window.__SOLO_CAPTURE_API__.captureOverview());
  const overview = await page.evaluate(() => window.__SOLO_CAPTURE_API__.metrics());
  const overviewBytes = Buffer.from(overviewCapture.base64 || '', 'base64');
  if (overviewCapture.mode !== 'orthographic-map-overview' || overviewBytes.length < 10000) {
    throw new Error('Orthographic overview capture is missing or unexpectedly small.');
  }
  await fs.writeFile(path.join(out, '01-overview.png'), overviewBytes);
  const roster = await page.evaluate(() => window.__SOLO_CAPTURE_API__.botRoster());
  const candidates = roster.filter(bot => bot.alive).slice(0, 3);
  const botViews = [];
  for (const bot of candidates) {
    const view = await page.evaluate(id => window.__SOLO_CAPTURE_API__.setBotView(id), bot.id);
    await page.waitForTimeout(800);
    await page.locator('#renderCanvas').screenshot({ path: path.join(out, `bot-${String(bot.id).padStart(2,'0')}-${bot.team}.png`) });
    botViews.push(view);
  }
  const report = {
    schema: 'solo-map-capture-v1',
    capturedAt: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || null,
    commit: process.env.GITHUB_SHA || null,
    boot, overview, overviewCapture: {mode: overviewCapture.mode, bounds: overviewCapture.bounds, bytes: overviewBytes.length}, roster, botViews,
    consoleErrors,
    result: consoleErrors.length ? 'completed-with-console-errors' : 'completed'
  };
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (!roster.length) throw new Error('No actual bots were spawned; refusing to publish an incomplete bot POV report.');
  if (!botViews.length) throw new Error('No live bot POV screenshots were captured.');
  const fatalErrors = consoleErrors.filter(e => /Uncaught|TypeError|ReferenceError|Failed to load|Error compiling effect|Unable to compile effect|uniform block count exceeds/i.test(e));
  if (fatalErrors.length) throw new Error('Browser reported fatal runtime or shader compilation errors; inspect report.json.');
  console.log(JSON.stringify({ result: report.result, screenshots: ['01-overview.png', ...botViews.map(v => `bot-${String(v.botId).padStart(2,'0')}-${v.team}.png`)], metrics: overview }, null, 2));
} catch (error) {
  await fs.writeFile(path.join(out, 'failure.txt'), String(error?.stack || error));
  throw error;
} finally {
  await browser.close();
}
