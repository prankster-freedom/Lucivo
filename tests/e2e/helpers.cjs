// Lucivo のブラウザ動作確認スクリプト（テスト仕様: doc/4.test_spec/）
// 使い方: node tests/e2e.cjs
// 出力: work/test/（結果 JSON と図の画像。git 管理外）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '../..');
// file:// で開く E2E はスタンドアロン版（dist/）を検査し、Web 版のテストは public/ をサーバーで配る（doc/2.ARCHITECTURE.md 4.15）
const APP_DIR = path.join(ROOT_DIR, 'dist');
const WEB_DIR = path.join(ROOT_DIR, 'public');
if (!fs.existsSync(path.join(APP_DIR, 'index.html'))) {
  console.error('dist/index.html がありません。先に npm run build:standalone を実行してください。');
  process.exit(1);
}
const APP_URL = 'file:///' + path.join(APP_DIR, 'index.html').replace(/\\/g, '/');
const SAMPLE = path.join(APP_DIR, 'samples', 'notation_sample.md');
const OUT_DIR = path.join(ROOT_DIR, 'work', 'test');
const SHOT_DIR = path.join(OUT_DIR, 'shots');
const VISUAL_STYLES = ['shapes', 'cards', 'circles', 'editorial'];
const MODES = [
  { style: 'std', appearance: 'light' }, { style: 'std', appearance: 'dark' },
  ...VISUAL_STYLES.map(style => ({ style, appearance: 'light' })),
  // Dark の Visual Stage は 4 スタイルとも確かめる
  ...VISUAL_STYLES.map(style => ({ style, appearance: 'dark' }))
];

// samples/visual-sample.md の発表のシーン数（表紙 + 前書き + 17 章）。章を増減したらここだけを直す
const SHOWCASE_SCENES = 19;
const sceneCount = n => `${String(n).padStart(2, '0')} / ${String(SHOWCASE_SCENES).padStart(2, '0')}`;

// スイートは並列に流れるため、どのスイートの記録かを AsyncLocalStorage で引き継ぐ（tests/e2e.cjs が設定する）
const { AsyncLocalStorage } = require('async_hooks');
const suiteContext = new AsyncLocalStorage();
const results = [];
function record(id, ok, detail) {
  const suite = suiteContext.getStore();
  results.push({ id, ok, detail, suite });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail || ''}${suite ? ` [${suite}]` : ''}`);
}

async function openApp(browser) {
  const page = await browser.newPage({ viewport: { width: 1300, height: 16000 } });
  page.consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => page.consoleErrors.push('pageerror: ' + e.message));
  await page.goto(APP_URL);
  // Mermaid は図が現れるまで読み込まれないため、アプリの準備だけを待つ
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
  return page;
}

async function waitRendered(page) {
  await page.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 90000 });
  await page.waitForTimeout(300);
}

// 「ファイルを開く…」で開いた文書は、読み込み時に整える（FR-053）。開いた後の内容と比べるときは、
// 同じ整形の部品で整えた文書と比べる（整形の部品を読み込んでいないときは、そのままの文書と比べる）
async function formattedForLoad(page, text) {
  return page.evaluate(t => (window.LucivoFormatter ? window.LucivoFormatter.format(t).text : t), text);
}

async function loadSample(page) {
  let dialog = false;
  const onDialog = d => { dialog = true; d.accept(); };
  page.on('dialog', onDialog);
  await page.click('#btn-file-menu');
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.length > 0);
  page.off('dialog', onDialog);
  await waitRendered(page);
  return dialog;
}

// Visualモードのスタイルを選ぶ。スタイルバーは Visualモードのときだけ表示されるため、先に Visualモードにする（DD-DIAG-063）
async function selectVisualStyle(page, style) {
  if (!(await page.evaluate(() => state.isVisualMode))) await page.click('#btn-visual-mode');
  await page.click(`.info-style-btn[data-info-style="${style}"]`);
}

// 表示モードの切替（Visual Stage はスタイルバーのボタン、通常モードは高速モードボタンで戻す）
async function setMode(page, { style, appearance }) {
  const current = await page.evaluate(() => state.appearance);
  if (current !== appearance) await page.click('#btn-theme-toggle');
  const isVisual = await page.evaluate(() => state.isVisualMode);
  if (style === 'std') {
    if (isVisual) await page.click('#btn-mode-fast');
  } else {
    await selectVisualStyle(page, style);
  }
  await waitRendered(page);
}



async function openStagePage(browser, contextOptions = {}) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  page.consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => page.consoleErrors.push('pageerror: ' + e.message));
  await page.goto(APP_URL);
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
  return page;
}

async function setDocument(page, md) {
  await page.evaluate(text => {
    document.getElementById('markdown-editor').value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, md);
  await waitRendered(page);
}

async function scrollToSlab(page, index) {
  await page.evaluate(i => document.querySelectorAll('#visual-stage-container .exhibition-slab')[i].scrollIntoView({ block: 'start' }), index);
  await page.waitForTimeout(350);
}

async function seekLight(page, t) {
  await page.evaluate(v => LucivoStage.seekLights(v), t);
  await page.waitForTimeout(90);
}


const ENCODING_FIXTURE = path.join(ROOT_DIR, 'tests', 'fixtures', 'encoding');
const FORMAT_FIXTURE = path.join(ROOT_DIR, 'tests', 'fixtures', 'format');
const MD_MODES = [
  { style: 'std', appearance: 'light' }, { style: 'std', appearance: 'dark' },
  { style: 'shapes', appearance: 'light' }, { style: 'shapes', appearance: 'dark' }
];

async function startWebServer() {
  const http = require('http');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.md': 'text/markdown; charset=utf-8', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const rel = ((req.url || '/').split('?')[0].replace(/^\/+/, '')) || 'index.html';
    const fp = path.join(WEB_DIR, decodeURIComponent(rel));
    if (!fp.startsWith(WEB_DIR) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404); res.end('Not found'); return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => new Promise(resolve => server.close(resolve)) };
}

async function openWebPageWithSample(browser, server, contextOptions = {}, sampleName = 'visual-sample.md') {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
  const page = await context.newPage();
  page.consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => page.consoleErrors.push('pageerror: ' + e.message));
  await page.goto(server.url);
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
  await page.click('#btn-file-menu');
  await page.setInputFiles('#file-input', path.join(APP_DIR, 'samples', sampleName));
  await page.waitForFunction(n => document.title === `${n} - Lucivo`, sampleName);
  await waitRendered(page);
  return page;
}

// 図の倍率を選ぶ。n:1・100% はプルダウンの中にあるため、先に開く（DD-DIAG-045）
async function selectScale(page, selector) {
  // 利用者と同じく、部品が見えている状態で開く（開いた後のスクロールで、プルダウンが閉じないように）
  await page.$eval(selector, el => el.closest('.scale-picker').scrollIntoView({ block: 'center' }));
  const inMenu = await page.$eval(selector, el => !!el.closest('.scale-menu') && el.closest('.scale-menu').hidden);
  if (inMenu) await page.$eval(selector, el => el.closest('.scale-more').querySelector('.scale-more-toggle').click());
  await page.click(selector);
}

// 有限アニメーション／トランジションの完了と、対象要素のスクロール位置・矩形座標が連続 N フレーム変化しないことを待つ（#341）
async function waitForSettled(page, { selector = '#preview-scroll', frames = 3, timeout = 15000 } = {}) {
  await page.waitForFunction(
    ({ sel }) => {
      const finiteRunning = document.getAnimations().some(a => {
        if (a.playState !== 'running') return false;
        const t = a.effect && a.effect.getComputedTiming ? a.effect.getComputedTiming() : null;
        return t && t.iterations !== Infinity;
      });
      return !finiteRunning && Boolean(document.querySelector(sel) || document.scrollingElement);
    },
    { sel: selector },
    { timeout }
  ).catch(() => {});

  await page.evaluate(async ({ sel, requiredFrames }) => {
    const el = document.querySelector(sel) || document.scrollingElement;
    let stable = 0;
    let prev = '';
    let guard = 0;
    while (stable < requiredFrames && guard < 240) {
      guard++;
      await new Promise(r => requestAnimationFrame(r));
      const rect = el ? el.getBoundingClientRect() : { top: 0, left: 0, width: 0, height: 0 };
      const sig = el
        ? `${Math.round(el.scrollTop)}:${Math.round(el.scrollLeft)}:${Math.round(rect.top)}:${Math.round(rect.left)}:${el.style.transform || ''}`
        : '';
      if (sig === prev) stable++;
      else { stable = 0; prev = sig; }
    }
  }, { sel: selector, requiredFrames: frames });
}

module.exports = {
  selectScale,
  waitForSettled,
  ENCODING_FIXTURE,
  FORMAT_FIXTURE,
  MD_MODES,
  startWebServer,
  openWebPageWithSample,
  openStagePage,
  setDocument,
  scrollToSlab,
  seekLight,
  ROOT_DIR,
  APP_DIR,
  APP_URL,
  SAMPLE,
  OUT_DIR,
  SHOT_DIR,
  VISUAL_STYLES,
  MODES,
  SHOWCASE_SCENES,
  sceneCount,
  results,
  record,
  suiteContext,
  openApp,
  waitRendered,
  formattedForLoad,
  loadSample,
  selectVisualStyle,
  setMode
};
