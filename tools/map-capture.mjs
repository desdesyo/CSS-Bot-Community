import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const out = process.env.CAPTURE_DIR || 'artifacts/map-capture';
const mkdir = await fs.mkdir(out, { recursive: true });
const startedAt = Date.now();
const consoleErrors = [];
const pageErrors = [];
const failedRequests = [];
const stages = [];
let browser;
let page;

function stage(name, detail = {}) {
  const entry = { name, at: new Date().toISOString(), elapsedMs: Date.now() - startedAt, ...detail };
  stages.push(entry);
  console.log('[map-capture]', JSON.stringify(entry));
}
function withTimeout(promise, ms, label) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(label + ' timed out after ' + ms + 'ms')), ms); })
  ]).finally(() => clearTimeout(timer));
}
async function diagnostics() {
  if (!page) return null;
  try {
    return await withTimeout(page.evaluate(() => ({
      url: location.href,
      readyState: document.readyState,
      title: document.title,
      status: document.querySelector('#loadState')?.textContent || null,
      quality: document.querySelector('#quality')?.textContent || null,
      overlay: document.querySelector('#overlay')?.dataset?.engineState || null,
      captureApi: !!window.__SOLO_CAPTURE_API__,
      metrics: window.__SOLO_CAPTURE_API__?.metrics?.() || null,
      bodyText: (document.body?.innerText || '').slice(0, 1800)
    })), 5000, 'Browser diagnostics');
  } catch (error) {
    return { diagnosticError: String(error) };
  }
}

try {
  stage('launch-browser');
  browser = await withTimeout(chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist']
  }), 45000, 'Chromium launch');
  page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('requestfailed', request => failedRequests.push({ url: request.url(), error: request.failure()?.errorText || 'request failed' }));
  stage('navigate');
  await page.goto('http://127.0.0.1:4173/engine/v2/index.html?capture=1', { waitUntil: 'domcontentloaded', timeout: 45000 });

  stage('wait-for-engine-capture-api');
  await withTimeout(page.waitForFunction(() => !!window.__SOLO_CAPTURE_API__, null, { timeout: 150000 }), 155000, 'Engine capture API');

  stage('start-real-game-and-bots');
  const boot = await withTimeout(page.evaluate(() => window.__SOLO_CAPTURE_API__.start()), 30000, 'Start game');
  await withTimeout(page.waitForFunction(() => {
    const m = window.__SOLO_CAPTURE_API__?.metrics?.();
    return !!m && m.started === true && m.bots >= 1;
  }, null, { timeout: 120000 }), 125000, 'Real bot roster');

  await page.waitForTimeout(1500);
  const overview = await page.evaluate(() => window.__SOLO_CAPTURE_API__.metrics());
  stage('prepare-top-down-overview', { metrics: overview });
  const overviewCapture = await withTimeout(page.evaluate(() => window.__SOLO_CAPTURE_API__.setOverview()), 10000, 'Set overview camera');
  await page.waitForTimeout(1200);
  const overviewBytes = await withTimeout(page.locator('#renderCanvas').screenshot({ timeout: 20000 }), 25000, 'Canvas overview screenshot');
  if (overviewCapture.mode !== 'orthographic-map-overview' || overviewBytes.length < 10000) {
    throw new Error('Orthographic overview capture is missing or unexpectedly small.');
  }
  await fs.writeFile(path.join(out, '01-overview.png'), overviewBytes);

  stage('capture-independent-bot-pov');
  const roster = await page.evaluate(() => window.__SOLO_CAPTURE_API__.botRoster());
  const candidates = roster.filter(bot => bot.alive).slice(0, 3);
  const botViews = [];
  for (const bot of candidates) {
    const view = await withTimeout(page.evaluate(id => window.__SOLO_CAPTURE_API__.setBotView(id), bot.id), 15000, 'Set bot POV ' + bot.id);
    await page.waitForTimeout(350);
    await withTimeout(page.locator('#renderCanvas').screenshot({
      path: path.join(out, `bot-${String(bot.id).padStart(2, '0')}-${bot.team}.png`),
      timeout: 30000
    }), 35000, 'Bot screenshot ' + bot.id);
    botViews.push(view);
  }

  const report = {
    schema: 'solo-map-capture-v2',
    capturedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    branch: process.env.GITHUB_REF_NAME || null,
    commit: process.env.GITHUB_SHA || null,
    boot, overview, overviewCapture: { mode: overviewCapture.mode, bounds: overviewCapture.bounds, bytes: overviewBytes.length },
    roster, botViews, stages, consoleErrors, pageErrors, failedRequests,
    result: consoleErrors.length || pageErrors.length ? 'completed-with-console-errors' : 'completed'
  };
  await fs.writeFile(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
  if (!roster.length) throw new Error('No actual bots were spawned; refusing to publish an incomplete bot POV report.');
  if (!botViews.length) throw new Error('No live bot POV screenshots were captured.');
  const fatalErrors = [...consoleErrors, ...pageErrors].filter(e => /Uncaught|TypeError|ReferenceError|Failed to load|Error compiling effect|Unable to compile effect|uniform block count exceeds/i.test(e));
  if (fatalErrors.length) throw new Error('Browser reported fatal runtime or shader compilation errors; inspect report.json.');
  stage('capture-complete', { screenshots: 1 + botViews.length, bots: roster.length, aliveViews: botViews.length });
  console.log(JSON.stringify({ result: report.result, screenshots: ['01-overview.png', ...botViews.map(v => `bot-${String(v.botId).padStart(2, '0')}-${v.team}.png`)], metrics: overview }, null, 2));
} catch (error) {
  const detail = {
    schema: 'solo-map-capture-failure-v2',
    failedAt: new Date().toISOString(),
    elapsedMs: Date.now() - startedAt,
    branch: process.env.GITHUB_REF_NAME || null,
    commit: process.env.GITHUB_SHA || null,
    error: String(error?.stack || error),
    diagnostics: await diagnostics(),
    stages, consoleErrors, pageErrors, failedRequests
  };
  await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify(detail, null, 2));
  try {
    if (page) await withTimeout(page.screenshot({ path: path.join(out, 'failure-screen.png'), fullPage: true }), 12000, 'Failure screenshot');
  } catch (screenshotError) {
    detail.failureScreenshotError = String(screenshotError);
    await fs.writeFile(path.join(out, 'failure.json'), JSON.stringify(detail, null, 2));
  }
  console.error('[map-capture] FAILED', JSON.stringify(detail, null, 2));
  throw error;
} finally {
  if (browser) {
    try { await withTimeout(browser.close(), 15000, 'Close Chromium'); }
    catch (error) { console.error('[map-capture] Browser close:', String(error)); }
  }
}
