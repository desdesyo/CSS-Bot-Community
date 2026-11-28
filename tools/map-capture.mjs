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
  const overview = await page.evaluate(() => { const api=window.__SOLO_CAPTURE_API__;api.setOverview();return api.metrics(); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(out, '01-overview.png'), fullPage: false, animations: 'disabled', timeout: 90000 });
  const roster = await page.evaluate(() => window.__SOLO_CAPTURE_API__.botRoster());
  const candidates = roster.filter(bot => bot.alive).slice(0, 3);
  const botViews = [];
  for (const bot of candidates) {
    const view = await page.evaluate(id => window.__SOLO_CAPTURE_API__.setBotView(id), bot.id);
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(out, `bot-${String(bot.id).padStart(2,'0')}-${bot.team}.png`), fullPage: false, animations: 'disabled', timeout: 90000 });
    botViews.push(view);
  }
  const report = {
    schema: 'solo-map-capture-v1',
    capturedAt: new Date().toISOString(),
    branch: process.env.GITHUB_REF_NAME || null,
    commit: process.env.GITHUB_SHA || null,
    boot, overview, roster, botViews,
    consoleErrors,
    result: consoleErrors.length ? 'completed-with-console-errors' : 'completed'
  };
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (!roster.length) throw new Error('No actual bots were spawned; refusing to publish an incomplete bot POV report.');
  if (!botViews.length) throw new Error('No live bot POV screenshots were captured.');
  if (consoleErrors.some(e => /Uncaught|TypeError|ReferenceError|Failed to load/i.test(e))) throw new Error('Browser reported runtime errors; inspect report.json.');
  console.log(JSON.stringify({ result: report.result, screenshots: ['01-overview.png', ...botViews.map(v => `bot-${String(v.botId).padStart(2,'0')}-${v.team}.png`)], metrics: overview }, null, 2));
} catch (error) {
  await fs.writeFile(path.join(out, 'failure.txt'), String(error?.stack || error));
  throw error;
} finally {
  await browser.close();
}
