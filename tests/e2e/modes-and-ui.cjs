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

  // TC-PERF-003 長い文書の追従は描画時に作った見出し一覧を引き、入力・移動ごとに querySelectorAll をやり直さない
  const longMd = Array.from({ length: 200 }, (_, i) => `## ${i + 1}. 見出し ${i + 1}\n\n${'本文行\n'.repeat(18)}`).join('\n');
  await page.evaluate(md => {
    const editor = document.getElementById('markdown-editor');
    editor.value = md;
    renderApp();
  }, longMd);
  await waitRendered(page);
  await page.click('.view-mode-btn[data-view-mode="split"]');
  const followPerf = await page.evaluate(async () => {
    const editor = document.getElementById('markdown-editor');
    const scroller = document.getElementById('preview-scroll');
    const container = document.getElementById('standard-doc-container');
    let qsaCalls = 0;
    const origQsa = container.querySelectorAll.bind(container);
    container.querySelectorAll = function (sel) {
      if (sel === '[data-src-line]') qsaCalls++;
      return origQsa(sel);
    };
    const pos150 = editor.value.indexOf('## 150.');
    const pos199 = editor.value.indexOf('## 199.');
    editor.focus();
    const t0 = performance.now();
    editor.setSelectionRange(pos150 + 3, pos150 + 3);
    editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); });
    const at150 = Math.round(scroller.scrollTop);
    // 同じ見出し区間のまま 1 文字入力・BackSpace をシミュレート（250ms の再描画待ち前）
    const editPos = pos150 + 12;
    editor.setSelectionRange(editPos, editPos);
    editor.dispatchEvent(new InputEvent('beforeinput', { inputType: 'insertText', data: 'a', bubbles: true }));
    editor.value = editor.value.slice(0, editPos) + 'a' + editor.value.slice(editPos);
    editor.setSelectionRange(editPos + 1, editPos + 1);
    editor.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: 'a', bubbles: true }));
    await new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); });
    editor.setSelectionRange(pos199 + 3, pos199 + 3);
    editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
    await new Promise(r => { requestAnimationFrame(() => requestAnimationFrame(r)); });
    const ms = performance.now() - t0;
    const at199 = Math.round(scroller.scrollTop);
    container.querySelectorAll = origQsa;
    return { qsaCalls, at150, at199, followMs: +ms.toFixed(1) };
  });
  record('TC-PERF-003', followPerf.qsaCalls === 0 && followPerf.at150 > 0 && followPerf.at199 > followPerf.at150, JSON.stringify(followPerf));
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

  // TC-UI-004: スマホ幅（390px）の Visualモードで、見出し・図の操作バー・右下の表示が崩れない（#152）
  const phoneServer = await startWebServer();
  try {
    const phonePage = await openWebPageWithSample(browser, phoneServer);
    await phonePage.setViewportSize({ width: 390, height: 844 });
    await phonePage.evaluate(() => {
      if (!state.isVisualMode) document.getElementById('btn-visual-mode').click();
      document.querySelector('[data-view-mode="canvas"]').click();
    });
    await phonePage.waitForFunction(() => document.querySelector('#visual-stage-container .exhibition-diagram-header'), null, { timeout: 15000 });
    await phonePage.waitForTimeout(800);
    const phone = await phonePage.evaluate(() => {
      const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab'));
      // 見出し: STAGE バッジが見出しの文字より上の行にあり、文字がスラブの幅いっぱいに組まれる
      const headings = slabs.map(s => s.querySelector('h2')).filter(h => h && h.querySelector('.exhibition-num-badge')).map(h => {
        const badge = h.querySelector('.exhibition-num-badge').getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(h);
        const textRects = Array.from(range.getClientRects()).filter(r => r.width > 0 && r.top >= badge.bottom - 1);
        const slabRect = h.closest('.exhibition-slab').getBoundingClientRect();
        return { badgeAbove: textRects.length > 0, textLeft: textRects.length ? Math.min(...textRects.map(r => r.left)) - slabRect.left : -1 };
      });
      // 操作バー: ボタンがカードの右端を超えない
      const bars = slabs.map(s => ({ s, header: s.querySelector('.exhibition-diagram-header') })).filter(x => x.header).map(({ s, header }) => {
        const card = header.closest('.exhibition-diagram-card').getBoundingClientRect();
        const rights = Array.from(header.querySelectorAll('button')).map(b => b.getBoundingClientRect().right);
        return Math.round(Math.max(...rights) - card.right);
      });
      const tele = document.getElementById('telemetry-pill').getBoundingClientRect();
      return { headingCount: headings.length, headingsOk: headings.every(h => h.badgeAbove && h.textLeft < 40), bars, teleWidth: Math.round(tele.width), docOverflow: document.documentElement.scrollWidth - innerWidth };
    });
    await phonePage.screenshot({ path: path.join(SHOT_DIR, 'mobile-visual-390.png') });
    record('TC-UI-004', phone.headingCount >= 10 && phone.headingsOk && phone.bars.length >= 3 && phone.bars.every(o => o <= 0) && phone.teleWidth <= 40 && phone.docOverflow <= 0, JSON.stringify(phone));
    await phonePage.context().close();
  } finally {
    phoneServer.close();
  }

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

// TC-UI-005 操作系のディテール（#200, DTP-006）。キーボードの輪郭・メニューの開き方・押下・選択色・スクロールバー
async function testInteractionDetails(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  // 1. outline を消したまま代わりの輪郭を持たない :focus-visible の定義がない（境目のつまみは ::after のアクセントの線で示すため除く）
  const bareFocus = await page.evaluate(() => {
    const out = [];
    const walk = rules => Array.from(rules).forEach(r => {
      if (r.cssRules && !r.selectorText) walk(r.cssRules);
      else if (r.selectorText && r.selectorText.includes(':focus-visible') && r.style.outlineStyle === 'none'
        && !/split-resizer/.test(r.selectorText)) out.push(r.selectorText);
    });
    Array.from(document.styleSheets).forEach(s => { try { walk(s.cssRules); } catch (e) { /* 別オリジン */ } });
    return out;
  });
  // 2. メニューを開くと、押したボタンの側から開く（不透明度と拡大の遷移）。キーボードで移った項目に内側の輪郭が出る
  // 開いた直後の遷移を取りこぼさないよう、ボタンの処理と同じく hidden を外した同じタスクの中で調べる
  const openMenu = () => page.evaluate(() => {
    const m = document.getElementById('file-menu');
    // 閉じた状態（display: none）のスタイルを確定させてから開く
    m.classList.add('hidden');
    void getComputedStyle(m).display;
    m.classList.remove('hidden');
    const props = m.getAnimations().map(a => a.transitionProperty);
    return { props, origin: getComputedStyle(m).transformOrigin, right: getComputedStyle(document.getElementById('more-menu')).transformOrigin };
  });
  const menu = await openMenu();
  // キーボードの操作の後に項目へ移ると :focus-visible になる
  await page.keyboard.press('Shift');
  await page.evaluate(() => document.getElementById('menu-open-markdown').focus());
  const ring = await page.evaluate(() => {
    const el = document.activeElement;
    const s = getComputedStyle(el);
    return { cls: el.className, visible: el.matches(':focus-visible'), style: s.outlineStyle, width: s.outlineWidth, offset: s.outlineOffset, color: s.outlineColor, accent: getComputedStyle(document.body).getPropertyValue('--accent').trim() };
  });
  const closeMenus = () => page.evaluate(() => document.querySelectorAll('.file-menu').forEach(m => m.classList.add('hidden')));
  await closeMenus();
  // 動きを減らす設定では、メニューは遷移なしで開く
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const stillProps = (await openMenu()).props.length;
  await closeMenus();
  await page.emulateMedia({ reducedMotion: null });
  // 3. 押した瞬間にわずかに沈む
  const pill = page.locator('.pill-btn').first();
  const box = await pill.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  // 押した直後は遷移（0.15s）の途中のため、沈み切るのを待つ
  await page.waitForTimeout(300);
  const pressed = await pill.evaluate(el => getComputedStyle(el).scale);
  await page.mouse.up();
  // 4. 選択色とスクロールバー（高速モードと Visualモード）
  const paint = mode => page.evaluate(m => {
    const p = document.querySelector(m === 'visual' ? '#visual-stage-container .exhibition-slab p' : '#standard-doc-container p');
    const sel = getComputedStyle(p, '::selection').backgroundColor;
    return { sel, scrollbar: getComputedStyle(document.body).scrollbarColor, width: getComputedStyle(document.getElementById('preview-scroll')).scrollbarWidth };
  }, mode);
  await setMode(page, { style: 'std', appearance: 'light' });
  const fast = await paint('std');
  await setMode(page, { style: 'shapes', appearance: 'dark' });
  const visual = await paint('visual');
  const defaultBlue = /rgba?\(0, 120, 215|rgb\(51, 144, 255|rgb\(173, 214, 255/;
  const ok = bareFocus.length === 0
    && menu.props.includes('opacity') && menu.props.includes('scale') && /^0(%|px) 0(%|px)/.test(menu.origin) && /^100% 0(%|px)/.test(menu.right)
    && /file-menu-item/.test(ring.cls) && ring.visible && ring.style === 'solid' && ring.width === '2px' && ring.offset === '-2px'
    && stillProps === 0 && pressed === '0.97'
    && !defaultBlue.test(fast.sel) && fast.sel !== visual.sel && /rgb\(131, 145, 166\)/.test(fast.scrollbar) && /rgb\(100, 116, 139\)/.test(visual.scrollbar)
    && fast.width === 'thin' && page.consoleErrors.length === 0;
  record('TC-UI-005', ok, JSON.stringify({ bareFocus, menu, ring, stillProps, pressed, fast, visual, errors: page.consoleErrors }));
  await page.close();
}

module.exports = {
  testInteractionDetails,
  testStartupAndCache,
  testResponsiveAndWebUi,
  testOffline
};
