const path = require('path');
const fs = require('fs');
const {
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
  record,
  openApp,
  waitRendered,
  formattedForLoad,
  loadSample,
  selectVisualStyle,
  setMode,
  openStagePage,
  setDocument,
  scrollToSlab,
  seekLight,
  ENCODING_FIXTURE,
  FORMAT_FIXTURE,
  MD_MODES,
  startWebServer,
  openWebPageWithSample
} = require('./helpers.cjs');

async function testStartupAndCache(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  const libs = () => page.evaluate(() => ({
    mermaid: !!window.mermaid,
    katex: !!window.katex,
    tailwindCdn: !!document.querySelector('script[src*="cdn.tailwindcss.com"]') || typeof window.tailwind !== 'undefined',
    tailwindCss: !!document.querySelector('link[href$="css/tailwind.css"]'),
    headerFlex: getComputedStyle(document.querySelector('header')).display,
    menuHidden: getComputedStyle(document.getElementById('file-menu')).display
  }));
  const atStart = await libs();
  await page.evaluate(() => { document.getElementById('markdown-editor').value = '# 図も数式もない文書\n\n本文です。'; renderApp(); });
  await waitRendered(page);
  const plain = await libs();
  // loadSample はエディタが空でなくなるのを待つため、読み込みの前に空に戻す
  await page.evaluate(() => { document.getElementById('markdown-editor').value = ''; lastLoadedMarkdown = ''; renderApp(); });
  await loadSample(page);
  await page.waitForFunction(() => window.katex && document.querySelector('#standard-doc-container .lucivo-math .katex'));
  const withSample = await libs();
  record('TC-PERF-001', !atStart.mermaid && !atStart.katex && !atStart.tailwindCdn && atStart.tailwindCss && atStart.headerFlex === 'flex' && atStart.menuHidden === 'none'
    && !plain.mermaid && !plain.katex && withSample.mermaid && withSample.katex, JSON.stringify({ atStart, plain, withSample }));

  // TC-PERF-002 キャッシュから表示するときは、Fit の計算と数式の描画をやり直さない
  const timing = await page.evaluate(() => {
    const before = { fit: fitCache.size, math: mathCache.size };
    let computed = 0;
    const orig = window.getComputedStyle;
    window.getComputedStyle = function (...args) { computed++; return orig.apply(this, args); };
    const t0 = performance.now();
    renderApp();
    const ms = performance.now() - t0;
    window.getComputedStyle = orig;
    return { before, after: { fit: fitCache.size, math: mathCache.size }, getComputedStyleCalls: computed, renderMs: +ms.toFixed(1) };
  });
  record('TC-PERF-002', timing.before.fit >= 18 && timing.before.math >= 5 && timing.after.fit === timing.before.fit && timing.after.math === timing.before.math && timing.getComputedStyleCalls === 0,
    JSON.stringify(timing));
  if (page.consoleErrors.length) record('TC-PERF-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

async function testResponsiveAndWebUi(browser) {
  // TC-UI-001: 狭い画面（390px / 768px）ではみ出しなし・初期表示 Canvas・メニュー統合
  const narrowCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const narrowPage = await narrowCtx.newPage();
  await narrowPage.goto(APP_URL);
  await narrowPage.waitForFunction(() => typeof renderApp === 'function');
  const mobileInit = await narrowPage.evaluate(() => {
    const vis = id => {
      const el = document.getElementById(id);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none';
    };
    const mark = document.querySelector('.brand-mark-light');
    const full = document.querySelector('.brand-logo-light');
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      viewMode: state.viewMode,
      editorHidden: document.getElementById('pane-editor').classList.contains('hidden'),
      markVisible: !!(mark && getComputedStyle(mark).display !== 'none'),
      fullHidden: !!(full && getComputedStyle(full).display === 'none'),
      mobileFile: vis('btn-mobile-file'),
      mobileView: vis('btn-mobile-view'),
      stageShow: vis('btn-stage-show'),
      presentMenu: vis('btn-present-menu'),
      moreMenu: vis('btn-more-menu'),
      help: vis('btn-header-help'),
      desktopFileHidden: !vis('btn-file-menu'),
      desktopSaveHidden: !vis('btn-save-menu'),
      desktopSettingsHidden: !vis('btn-open-settings')
    };
  });
  await narrowPage.click('#btn-present-menu');
  const presentOpened = await narrowPage.evaluate(() => ({
    menuOpen: !document.getElementById('present-menu').classList.contains('hidden'),
    hasStage: !!document.getElementById('menu-present-stage')
  }));
  await narrowPage.click('#btn-more-menu');
  const moreHasUpdateOnFile = await narrowPage.evaluate(() => {
    const item = document.getElementById('menu-more-update');
    return !document.getElementById('more-menu').classList.contains('hidden') && !item.classList.contains('hidden');
  });
  await narrowPage.screenshot({ path: path.join(SHOT_DIR, 'mobile-header-390.png') });
  await narrowPage.click('#btn-mobile-file');
  await narrowPage.click('[data-mobile-sample="menu-sample-notation"]');
  await narrowPage.waitForSelector('#standard-doc-container h1', { timeout: 10000 });
  await narrowPage.click('#btn-mobile-view');
  await narrowPage.click('[data-mobile-view-mode="editor"]');
  const mobileEditorBtns = await narrowPage.evaluate(() => ({
    viewMode: state.viewMode,
    lockVisible: !document.getElementById('editor-lock').classList.contains('hidden'),
    testCacheHidden: getComputedStyle(document.getElementById('btn-test-cache')).display === 'none',
    testErrHidden: getComputedStyle(document.getElementById('btn-test-err')).display === 'none'
  }));
  await narrowPage.setViewportSize({ width: 768, height: 1024 });
  const tabletOverflow = await narrowPage.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  await narrowCtx.close();
  record('TC-UI-001',
    mobileInit.scrollWidth <= mobileInit.innerWidth
    && mobileInit.viewMode === 'canvas' && mobileInit.editorHidden
    && mobileInit.markVisible && mobileInit.fullHidden
    && mobileInit.mobileFile && mobileInit.mobileView && mobileInit.stageShow
    && mobileInit.presentMenu && mobileInit.moreMenu && mobileInit.help
    && mobileInit.desktopFileHidden && mobileInit.desktopSaveHidden && mobileInit.desktopSettingsHidden
    && presentOpened.menuOpen && presentOpened.hasStage
    && moreHasUpdateOnFile
    && mobileEditorBtns.viewMode === 'editor' && mobileEditorBtns.lockVisible
    && mobileEditorBtns.testCacheHidden && mobileEditorBtns.testErrHidden
    && tabletOverflow,
    JSON.stringify({ mobileInit, presentOpened, moreHasUpdateOnFile, mobileEditorBtns, tabletOverflow })
  );

  // TC-UI-002: Web 版（http://）では「最新版確認」ボタン・起動時案内の「更新を確認」を出さない
  const http = require('http');
  const mime = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
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
  const port = server.address().port;
  const webCtx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const webPage = await webCtx.newPage();
  await webPage.goto(`http://127.0.0.1:${port}/`);
  await webPage.waitForFunction(() => typeof renderApp === 'function');
  const webWide = await webPage.evaluate(() => {
    const headerWrap = document.getElementById('header-update-wrap');
    const guideBtn = document.querySelector('.btn-check-update');
    const guideResult = document.querySelector('.update-check-result');
    const latestP = document.querySelector('.empty-guide-latest');
    const latestLink = latestP ? latestP.querySelector('a') : null;
    return {
      headerUpdateHidden: !!headerWrap && getComputedStyle(headerWrap).display === 'none',
      guideUpdateBtnHidden: !!guideBtn && getComputedStyle(guideBtn).display === 'none',
      guideResultHidden: !!guideResult && getComputedStyle(guideResult).display === 'none',
      versionShown: (document.querySelector('.update-check-version')?.textContent || '').trim(),
      latestText: (latestP?.textContent || '').trim(),
      latestHref: latestLink ? latestLink.getAttribute('href') : ''
    };
  });
  await webPage.setViewportSize({ width: 390, height: 844 });
  const webNarrow = await webPage.evaluate(() => {
    const moreUpdate = document.getElementById('menu-more-update');
    return {
      moreUpdateHidden: !!moreUpdate && getComputedStyle(moreUpdate).display === 'none'
    };
  });
  await webCtx.close();
  server.close();
  record('TC-UI-002',
    webWide.headerUpdateHidden && webWide.guideUpdateBtnHidden && webWide.guideResultHidden
    && webWide.versionShown.length > 0 && /^スタンドアロン版はこちら/.test(webWide.latestText)
    && webWide.latestHref === 'https://github.com/prankster-freedom/Lucivo/releases'
    && webNarrow.moreUpdateHidden,
    JSON.stringify({ webWide, webNarrow })
  );

  // TC-UI-003: Split 表示で境目をドラッグして幅比率を変更・20〜80% クランプ・リロード復元（#82）
  const splitCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const splitPage = await splitCtx.newPage();
  await splitPage.goto(APP_URL);
  await splitPage.waitForFunction(() => typeof renderApp === 'function');
  const beforeSplit = await splitPage.evaluate(() => ({
    resizerVisible: !document.getElementById('split-resizer').classList.contains('hidden'),
    editorWidth: document.getElementById('pane-editor').getBoundingClientRect().width
  }));
  const box = await splitPage.locator('#split-resizer').boundingBox();
  await splitPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await splitPage.mouse.down();
  await splitPage.mouse.move(box.x + 250, box.y + box.height / 2, { steps: 5 });
  await splitPage.mouse.up();
  const afterDrag = await splitPage.evaluate(() => ({
    editorWidth: document.getElementById('pane-editor').getBoundingClientRect().width,
    pct: localStorage.getItem('lucivo:splitRatio')
  }));
  // 20〜80% クランプ確認（右端近くへドラッグしても 80% を超えない）
  const box2 = await splitPage.locator('#split-resizer').boundingBox();
  await splitPage.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
  await splitPage.mouse.down();
  await splitPage.mouse.move(1400, box2.y + box2.height / 2, { steps: 4 });
  await splitPage.mouse.up();
  const clamped = await splitPage.evaluate(() => localStorage.getItem('lucivo:splitRatio'));
  // 適度な比率へ戻してからリロードで復元確認
  await splitPage.evaluate(() => localStorage.setItem('lucivo:splitRatio', '55'));
  await splitPage.reload();
  await splitPage.waitForFunction(() => typeof renderApp === 'function');
  const afterReload = await splitPage.evaluate(() => ({
    pctVar: document.getElementById('pane-editor').style.getPropertyValue('--split-editor-pct'),
    editorWidth: document.getElementById('pane-editor').getBoundingClientRect().width
  }));
  await splitPage.click('[data-view-mode="canvas"]');
  const resizerHiddenInCanvas = await splitPage.evaluate(() => document.getElementById('split-resizer').classList.contains('hidden'));
  await splitCtx.close();
  record('TC-UI-003',
    beforeSplit.resizerVisible
    && afterDrag.editorWidth > beforeSplit.editorWidth + 150
    && parseFloat(clamped) === 80
    && afterReload.pctVar === '55%'
    && afterReload.editorWidth > 700
    && resizerHiddenInCanvas,
    JSON.stringify({ beforeSplit, afterDrag, clamped, afterReload, resizerHiddenInCanvas })
  );
}

// TC-OFF-001〜003: インターネットに接続していなくても、同梱のファイルだけで動く（NFR-008）
async function testOffline(browser) {
  const ctx = await browser.newContext({ offline: true, viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const external = [];
  const errors = [];
  page.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(APP_URL);
  await page.waitForFunction(() => typeof renderApp === 'function');
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => window.mermaid && window.katex
    && document.querySelector('#standard-doc-container .diagram-card svg, #standard-doc-container svg[id^="mermaid"]')
    && document.querySelector('#standard-doc-container .lucivo-math .katex'), null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(async () => {
    const families = ['Inter', 'Plus Jakarta Sans', 'Noto Sans JP', 'JetBrains Mono'];
    const loaded = [];
    for (const family of families) {
      const faces = await document.fonts.load(`500 16px "${family}"`, '日本語 Lucivo');
      if (faces.length) loaded.push(family);
    }
    const math = await document.fonts.load('16px KaTeX_Main', 'x');
    return { loaded, math: math.length };
  });
  record('TC-OFF-001', external.length === 0 && errors.length === 0, JSON.stringify({ external: external.slice(0, 5), errors: errors.slice(0, 5) }));
  record('TC-OFF-002', fonts.loaded.length === 4 && fonts.math > 0, JSON.stringify(fonts));
  // TC-OFF-003（HTML エクスポートの参照の置き換え）は、0.2.0 で HTML の書き出しを外したため保留（CR-001）
  // TC-OFF-004 HTML の書き出しのボタンを置かない（DD-OFF-005）
  const exportBtnCount = await page.locator('#btn-export-html').count();
  record('TC-OFF-004', exportBtnCount === 0, `exportBtnCount=${exportBtnCount}`);
  await ctx.close();
}

// Markdown の整形（TC-FILE-036〜040、FR-053）。messy.md を開くと messy.expected.md になる

module.exports = {
  testStartupAndCache,
  testResponsiveAndWebUi,
  testOffline
};
