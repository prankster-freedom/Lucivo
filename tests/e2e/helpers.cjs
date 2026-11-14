// Lucivo のブラウザ動作確認スクリプト（テスト仕様: doc/4.test_spec/）
// 使い方: node tests/e2e.cjs
// 出力: work/test/（結果 JSON と図の画像。git 管理外）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '../..');
const APP_DIR = path.join(ROOT_DIR, 'public');
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

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} ${id} ${detail || ''}`);
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
    const fp = path.join(APP_DIR, decodeURIComponent(rel));
    if (!fp.startsWith(APP_DIR) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
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

module.exports = {
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
  openApp,
  waitRendered,
  formattedForLoad,
  loadSample,
  selectVisualStyle,
  setMode
};
