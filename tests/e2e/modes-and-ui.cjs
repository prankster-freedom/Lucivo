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

// PDF のページ数と、1 ページ目の用紙の向き（MediaBox の幅 > 高さなら横）
async function testZoomMap(browser) {
  // TC-SHOW-015: スタンドアロン版（file://）では、発表のドロップダウンにズーミング・マップを出さない
  const filePage = await openStagePage(browser);
  await filePage.click('#btn-present-menu');
  const fileItemHidden = await filePage.evaluate(() => {
    const item = document.getElementById('menu-present-zoom-map');
    return !!item && item.classList.contains('hidden') && getComputedStyle(item).display === 'none';
  });
  const fileScriptLoaded = await filePage.evaluate(() => Array.from(document.scripts).some(s => /zoom-map\.js/.test(s.src)));
  await filePage.context().close();
  record('TC-SHOW-015', fileItemHidden && !fileScriptLoaded, JSON.stringify({ fileItemHidden, fileScriptLoaded }));

  const server = await startWebServer();
  try {
    const page = await openWebPageWithSample(browser, server);
    const scriptBefore = await page.evaluate(() => Array.from(document.scripts).some(s => /zoom-map\.js/.test(s.src)));
    // TC-SHOW-016: Web 版でドロップダウンから選ぶと、Visualモードの章を地図に並べ、全体の地図から始める
    await page.click('#btn-present-menu');
    const itemVisible = await page.isVisible('#menu-present-zoom-map');
    await page.click('#menu-present-zoom-map');
    await page.waitForFunction(() => window.LucivoZoomMap && window.LucivoZoomMap.info().active, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    const opened = await page.evaluate(() => {
      const info = window.LucivoZoomMap.info();
      const nodes = Array.from(document.querySelectorAll('.exhibition-wrap > .exhibition-hero, .exhibition-wrap > .exhibition-slab'));
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const rects = nodes.map(n => n.getBoundingClientRect());
      return {
        cls: document.documentElement.classList.contains('is-zoom-map'),
        visual: state.isVisualMode,
        nodes: nodes.length,
        stepCount: info.steps.length,
        firstLabel: info.steps[0].label,
        lastIsOverview: info.steps[info.steps.length - 1].node === -1,
        // 全体の地図では、すべての章が画面の中に収まる
        allInView: rects.every(r => r.left >= -1 && r.top >= -1 && r.right <= vp.w + 1 && r.bottom <= vp.h + 1),
        path: !!document.querySelector('.zoom-map-path polyline'),
        hud: (document.querySelector('.zoom-map-hud .zoom-map-count') || {}).textContent
      };
    });
    record('TC-SHOW-016', itemVisible && !scriptBefore && opened.cls && opened.visual && opened.nodes >= 15 && opened.firstLabel === '全体の地図'
      && opened.lastIsOverview && opened.allInView && opened.path && opened.hud === `1 / ${opened.stepCount}` && page.consoleErrors.length === 0,
    JSON.stringify({ itemVisible, scriptBefore, ...opened, errors: page.consoleErrors }));

    // TC-SHOW-017: → で章へ飛ぶ。隣の章へ移るときは、いったん引いて（見える範囲を広げて）から寄る。止まったら章が画面に収まる
    const goStep = async key => {
      const from = await page.evaluate(() => window.LucivoZoomMap.info());
      await page.keyboard.press(key);
      // 動いている途中のカメラの見える範囲（w）を、間を空けて何度か調べる
      const samples = [];
      for (let k = 0; k < 8; k++) {
        await page.waitForTimeout(110);
        samples.push(await page.evaluate(() => window.LucivoZoomMap.info().camera.w));
      }
      await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
      const to = await page.evaluate(() => window.LucivoZoomMap.info());
      return { from, to, maxW: Math.max(...samples) };
    };
    const toFirst = await goStep('ArrowRight');
    // 表紙から、隣の章（前書き）へ
    const toSecond = await goStep('ArrowRight');
    const focused = await page.evaluate(() => {
      const cur = document.querySelector('.exhibition-wrap > .is-zoom-current');
      const r = cur.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight };
    });
    const dipped = toSecond.maxW > Math.max(toSecond.from.camera.w, toSecond.to.camera.w) * 1.05;
    const fits = focused.left >= 0 && focused.right <= focused.vw && focused.top >= 0 && focused.bottom <= focused.vh;
    record('TC-SHOW-017', toFirst.to.index === 1 && toSecond.to.index === 2 && dipped && fits,
      JSON.stringify({ firstIndex: toFirst.to.index, secondIndex: toSecond.to.index, fromW: Math.round(toSecond.from.camera.w), toW: Math.round(toSecond.to.camera.w), maxW: Math.round(toSecond.maxW), focused }));

    // TC-SHOW-018: 小見出し（h3）のある章では小見出しにも寄る。長い区間は区切って寄る。End で全体の地図、Esc で元の表示に戻る
    const steps = (await page.evaluate(() => window.LucivoZoomMap.info())).steps;
    const h3Step = steps.findIndex(s => /^11\.1 /.test(s.label));
    const segmented = steps.some(s => /（\d+ \/ \d+）$/.test(s.label));
    await page.evaluate(i => window.LucivoZoomMap.goTo(i), h3Step);
    await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
    const h3Visible = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('.exhibition-wrap h3')).find(e => /^11\.1 /.test(e.textContent.trim()));
      const r = h.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    });
    await page.keyboard.press('End');
    await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
    const atEnd = await page.evaluate(() => { const i = window.LucivoZoomMap.info(); return i.index === i.steps.length - 1 && i.steps[i.index].node === -1; });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const exited = await page.evaluate(() => ({
      active: window.LucivoZoomMap.info().active,
      cls: document.documentElement.classList.contains('is-zoom-map'),
      hud: !!document.querySelector('.zoom-map-hud'),
      path: !!document.querySelector('.zoom-map-path'),
      // 地図に入る前は高速モードだったので、高速モードに戻る
      visual: state.isVisualMode,
      inlineStyles: Array.from(document.querySelectorAll('.exhibition-wrap, .exhibition-wrap > *')).filter(e => e.getAttribute('style')).length
    }));
    record('TC-SHOW-018', h3Step > 0 && segmented && h3Visible && atEnd && !exited.active && !exited.cls && !exited.hud && !exited.path && !exited.visual && exited.inlineStyles === 0,
      JSON.stringify({ h3Step, segmented, h3Visible, atEnd, exited }));
    await page.context().close();

    // TC-SHOW-019: 動きを減らす設定では、カメラを動かさず、すぐに次の場所を映す
    const reduced = await openWebPageWithSample(browser, server, { reducedMotion: 'reduce' });
    await reduced.click('#btn-present-menu');
    await reduced.click('#menu-present-zoom-map');
    await reduced.waitForFunction(() => window.LucivoZoomMap && window.LucivoZoomMap.info().active, null, { timeout: 15000 });
    await reduced.keyboard.press('ArrowRight');
    const instant = await reduced.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve({
      index: window.LucivoZoomMap.info().index,
      flying: document.getElementById('visual-stage-container').classList.contains('is-flying'),
      currentInView: (() => {
        const r = document.querySelector('.exhibition-wrap > .is-zoom-current').getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      })()
    }))));
    await reduced.context().close();
    record('TC-SHOW-019', instant.index === 1 && !instant.flying && instant.currentInView, JSON.stringify(instant));
  } finally {
    await server.close();
  }
}

// プレイアブル・ダイアグラム（TC-SHOW-020〜024、FR-055、#62）。notation_sample.md の図で確かめる
async function testPlayable(browser) {
  // TC-SHOW-020: スタンドアロン版（file://）では、発表のドロップダウンにプレイアブル・ダイアグラムを出さない
  const filePage = await openStagePage(browser);
  await filePage.click('#btn-present-menu');
  const fileItemHidden = await filePage.evaluate(() => {
    const item = document.getElementById('menu-present-playable');
    return !!item && item.classList.contains('hidden') && getComputedStyle(item).display === 'none';
  });
  const fileScriptLoaded = await filePage.evaluate(() => Array.from(document.scripts).some(s => /playable\.js/.test(s.src)));
  await filePage.context().close();
  record('TC-SHOW-020', fileItemHidden && !fileScriptLoaded, JSON.stringify({ fileItemHidden, fileScriptLoaded }));

  const server = await startWebServer();
  try {
    const page = await openWebPageWithSample(browser, server, {}, 'notation_sample.md');
    const before = await page.evaluate(() => Array.from(document.querySelectorAll('#standard-doc-container [data-stage-index]')).map(v => v.dataset.stageIndex).join(','));
    const info = () => page.evaluate(() => window.LucivoPlayable.info());

    // TC-SHOW-021: フローチャートは、質問に答えて進む診断になる。判定のノードでは、分岐のラベルが選択肢になる。
    // 図の上では、今いるノードと、最後に通った矢印が灯る
    await page.click('#btn-present-menu');
    const itemVisible = await page.isVisible('#menu-present-playable');
    await page.click('#menu-present-playable');
    await page.waitForFunction(() => window.LucivoPlayable && window.LucivoPlayable.info().active, null, { timeout: 15000 });
    const start = await info();
    // 判定のノードまで、最初の選択肢で進む
    let flow = start;
    for (let k = 0; k < 6 && !(flow.options.includes('はい') && flow.options.includes('いいえ')); k++) {
      await page.keyboard.press('1');
      flow = await info();
    }
    const decisionMarks = await page.evaluate(() => ({
      current: !!document.querySelector('.playable-figure g.is-play-current'),
      edge: !!document.querySelector('.playable-figure path.is-play-edge'),
      question: (document.querySelector('.playable-card .playable-eyebrow') || {}).textContent || '',
      title: (document.querySelector('.playable-card .playable-title') || {}).textContent || ''
    }));
    await page.keyboard.press('2');
    const afterNo = await info();
    record('TC-SHOW-021', itemVisible && start.kind === 'flow' && start.count >= 2 && start.visited.length === 1
      && flow.options.join('|') === 'はい|いいえ' && decisionMarks.current && decisionMarks.edge && decisionMarks.question === 'QUESTION 1'
      && afterNo.visited.length === flow.visited.length + 1 && page.consoleErrors.length === 0,
    JSON.stringify({ itemVisible, start, flow, decisionMarks, afterNo, errors: page.consoleErrors }));

    // TC-SHOW-022: 状態遷移図は、画面の試作品になる。状態の名前が画面の題名、矢印のラベルがボタンになる。
    // 終わり（[*]）へ進むと「おわり」の画面になり、R で最初の状態に戻る
    for (let k = 0; k < start.count && (await info()).kind !== 'state'; k++) await page.keyboard.press(']');
    const st = await info();
    const screenTitle = await page.evaluate(() => (document.querySelector('.playable-screen .playable-title') || {}).textContent);
    const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('.playable-screen .playable-option')).map(b => b.textContent.replace(/^\d/, '').trim()));
    const endIndex = st.options.indexOf('終了');
    await page.keyboard.press(String(endIndex + 1));
    const ended = await info();
    const endScreen = await page.evaluate(() => (document.querySelector('.playable-screen.is-end .playable-title') || {}).textContent);
    await page.keyboard.press('r');
    const restarted = await info();
    record('TC-SHOW-022', st.kind === 'state' && screenTitle === st.current && buttons.join('|') === st.options.join('|') && endIndex >= 0
      && ended.ended && endScreen === 'おわり' && !restarted.ended && restarted.current === st.current && restarted.visited.length === 1,
    JSON.stringify({ st, screenTitle, buttons, endIndex, ended: ended.ended, endScreen, restarted }));

    // TC-SHOW-023: Esc で終えると、図の枠が元の場所・元の順に戻り、灯した印が残らない
    await page.keyboard.press('Escape');
    const exited = await page.evaluate(() => ({
      active: window.LucivoPlayable.info().active,
      overlay: !!document.querySelector('.playable'),
      cls: document.documentElement.classList.contains('is-playable'),
      order: Array.from(document.querySelectorAll('#standard-doc-container [data-stage-index]')).map(v => v.dataset.stageIndex).join(','),
      marks: document.querySelectorAll('.is-play-current, .is-play-visited, .is-play-edge, svg.is-playing').length
    }));
    record('TC-SHOW-023', !exited.active && !exited.overlay && !exited.cls && exited.order === before && exited.marks === 0,
      JSON.stringify({ ...exited, sameOrder: exited.order === before }));

    // TC-SHOW-024: 動かせる図（状態遷移図・フローチャート）のない文書では、始めずに知らせる
    await setDocument(page, '# 図のない文書\n\n```mermaid\nsequenceDiagram\n  A->>B: こんにちは\n```\n');
    await page.click('#btn-present-menu');
    await page.click('#menu-present-playable');
    await page.waitForFunction(() => /動かせる図/.test(document.getElementById('toast-message').textContent), null, { timeout: 5000 }).catch(() => {});
    const none = await page.evaluate(() => ({
      active: window.LucivoPlayable.info().active,
      overlay: !!document.querySelector('.playable'),
      toast: document.getElementById('toast-message').textContent
    }));
    record('TC-SHOW-024', !none.active && !none.overlay && /動かせる図（状態遷移図・フローチャート）がありません/.test(none.toast), JSON.stringify(none));
    await page.context().close();
  } finally {
    await server.close();
  }
}

// Markdown の整形（TC-FILE-036〜040、FR-053）。messy.md を開くと messy.expected.md になる

module.exports = {
  testStartupAndCache,
  testResponsiveAndWebUi,
  testOffline,
  testZoomMap,
  testPlayable
};
