// Lucivo のブラウザ動作確認スクリプト（テスト仕様: doc/4.test_spec/）
// 使い方: node tests/e2e.cjs
// 出力: work/test/（結果 JSON と図の画像。git 管理外）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
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

// 表示モードの切替（Visual Stage はスタイルバーのボタン、通常モードは高速モードボタンで戻す）
async function setMode(page, { style, appearance }) {
  const current = await page.evaluate(() => state.appearance);
  if (current !== appearance) await page.click('#btn-theme-toggle');
  const isVisual = await page.evaluate(() => state.isVisualMode);
  if (style === 'std') {
    if (isVisual) await page.click('#btn-mode-fast');
  } else {
    await page.click(`.info-style-btn[data-info-style="${style}"]`);
  }
  await waitRendered(page);
}

async function testFileLoading(browser) {
  const page = await openApp(browser);
  await waitRendered(page);

  // TC-FILE-001 起動直後の初期表示とブランドロゴ（Light / Dark 連動）
  const init = await page.evaluate(() => {
    const guideEl = document.querySelector('#standard-doc-container .empty-guide');
    const fav = document.getElementById('app-favicon');
    const hLight = document.querySelector('#header-brand-logo .brand-logo-light');
    const hDark = document.querySelector('#header-brand-logo .brand-logo-dark');
    const gLight = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-light') : null;
    const gDark = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-dark') : null;
    return {
      editor: document.getElementById('markdown-editor').value,
      guide: !!guideEl,
      hasFastModeDesc: guideEl ? guideEl.textContent.includes('高速モード') : false,
      hasVisualModeDesc: guideEl ? guideEl.textContent.includes('Visualモード') : false,
      fastBtnActive: document.getElementById('btn-mode-fast') ? document.getElementById('btn-mode-fast').classList.contains('is-active') : false,
      favHref: fav ? fav.getAttribute('href') : '',
      headerLightVisible: !!hLight && getComputedStyle(hLight).display !== 'none' && hLight.naturalWidth > 0,
      headerDarkHidden: !!hDark && getComputedStyle(hDark).display === 'none',
      guideLightVisible: !!gLight && getComputedStyle(gLight).display !== 'none' && gLight.naturalWidth > 0,
      guideDarkHidden: !!gDark && getComputedStyle(gDark).display === 'none'
    };
  });
  await page.click('#btn-theme-toggle');
  await waitRendered(page);
  const darkLogo = await page.evaluate(() => {
    const guideEl = document.querySelector('#standard-doc-container .empty-guide');
    const fav = document.getElementById('app-favicon');
    const hLight = document.querySelector('#header-brand-logo .brand-logo-light');
    const hDark = document.querySelector('#header-brand-logo .brand-logo-dark');
    const gLight = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-light') : null;
    const gDark = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-dark') : null;
    return {
      favHref: fav ? fav.getAttribute('href') : '',
      headerDarkVisible: !!hDark && getComputedStyle(hDark).display !== 'none' && hDark.naturalWidth > 0,
      headerLightHidden: !!hLight && getComputedStyle(hLight).display === 'none',
      guideDarkVisible: !!gDark && getComputedStyle(gDark).display !== 'none' && gDark.naturalWidth > 0,
      guideLightHidden: !!gLight && getComputedStyle(gLight).display === 'none'
    };
  });
  await page.click('#btn-theme-toggle');
  await waitRendered(page);
  record('TC-FILE-001',
    init.editor === '' && init.guide && init.hasFastModeDesc && init.hasVisualModeDesc && init.fastBtnActive
    && init.favHref === './assets/logos/light/favicon.svg'
    && init.headerLightVisible && init.headerDarkHidden && init.guideLightVisible && init.guideDarkHidden
    && darkLogo.favHref === './assets/logos/dark/favicon.svg'
    && darkLogo.headerDarkVisible && darkLogo.headerLightHidden && darkLogo.guideDarkVisible && darkLogo.guideLightHidden,
    JSON.stringify({ init, darkLogo }));

  // TC-FILE-014 ヘッダーと案内のロゴ、案内の「最新版はこちら」が公開リポジトリへのリンクになっている
  const repoLinks = await page.evaluate(() => {
    const url = 'https://github.com/prankster-freedom/Lucivo';
    const describe = a => a && { href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), ok: a.getAttribute('href') === url && a.getAttribute('target') === '_blank' && /\bnoopener\b/.test(a.getAttribute('rel') || '') && /\bnoreferrer\b/.test(a.getAttribute('rel') || '') };
    const latest = document.querySelector('#standard-doc-container .empty-guide-latest');
    return {
      header: describe(document.querySelector('#header-brand-logo a.brand-link')),
      guideLogo: describe(document.querySelector('#standard-doc-container .empty-guide-logo a.brand-link')),
      latestText: latest ? latest.textContent.trim() : null,
      latest: describe(latest && latest.querySelector('a'))
    };
  });
  record('TC-FILE-014', !!(repoLinks.header && repoLinks.header.ok && repoLinks.guideLogo && repoLinks.guideLogo.ok && repoLinks.latest && repoLinks.latest.ok
    && /^最新版はこちら/.test(repoLinks.latestText || '')), JSON.stringify(repoLinks));

  // TC-FILE-013 起動直後は編集でき、読み込む前の保存名は untitled.md
  const startEditable = await page.evaluate(() => !document.getElementById('markdown-editor').readOnly && document.getElementById('editor-lock').classList.contains('hidden'));
  await page.fill('#markdown-editor', '# 新しい文書\n');
  const [firstDownload] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save-markdown')]);
  const firstName = firstDownload.suggestedFilename();
  const firstText = fs.readFileSync(await firstDownload.path(), 'utf8');
  await page.fill('#markdown-editor', '');
  await page.evaluate(() => { lastLoadedMarkdown = ''; renderApp(); });
  record('TC-FILE-013', startEditable && firstName === 'untitled.md' && firstText === '# 新しい文書\n', JSON.stringify({ startEditable, firstName, firstText }));

  // TC-FILE-002 メニューの開閉と同梱サンプル項目
  await page.click('#btn-file-menu');
  const menuState = await page.evaluate(() => ({
    opened: !document.getElementById('file-menu').classList.contains('hidden') && document.getElementById('btn-file-menu').getAttribute('aria-expanded') === 'true',
    items: Array.from(document.querySelectorAll('#file-menu [role="menuitem"]')).map(el => el.textContent.trim())
  }));
  await page.mouse.click(700, 600);
  const closedByOutside = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  await page.click('#btn-file-menu');
  await page.keyboard.press('Escape');
  const closedByEsc = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  record('TC-FILE-002',
    menuState.opened && closedByOutside && closedByEsc
    && JSON.stringify(menuState.items) === JSON.stringify(['Markdown を開く…', 'Visualモードサンプル (visual-sample.md)', '記法サンプル (notation_sample.md)']),
    JSON.stringify({ ...menuState, closedByOutside, closedByEsc }));

  // TC-FILE-003 未編集の状態での読み込みと同梱サンプル選択
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-visual');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('# Lucivo 誌面雛形・ボリューム＆図表サイズ総合サンプル'));
  await waitRendered(page);
  const visualSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const visualSampleMatched = visualSampleValue === fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8').replace(/^\uFEFF/, '');
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-notation');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  await waitRendered(page);
  const notationSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const notationSampleMatched = notationSampleValue === fs.readFileSync(SAMPLE, 'utf8').replace(/^\uFEFF/, '');
  await page.evaluate(() => { document.getElementById('markdown-editor').value = ''; lastLoadedMarkdown = ''; renderApp(); });
  await waitRendered(page);
  const dialogOnFirstLoad = await loadSample(page);
  const after = await page.evaluate(() => ({
    h1: (document.querySelector('#standard-doc-container h1') || {}).textContent,
    cards: document.querySelectorAll('#standard-doc-container [data-stage-index]').length,
    inputCleared: document.getElementById('file-input').value === '',
    toast: document.getElementById('toast-message').textContent
  }));
  const editorValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  after.sameAsFile = editorValue === fs.readFileSync(SAMPLE, 'utf8').replace(/^\uFEFF/, '');
  record('TC-FILE-003',
    !dialogOnFirstLoad && visualSampleMatched && notationSampleMatched && after.sameAsFile && after.h1 === 'Lucivo サンプル文書' && after.cards > 0 && /読み込みました/.test(after.toast),
    JSON.stringify({ dialogOnFirstLoad, visualSampleMatched, notationSampleMatched, ...after }));
  record('TC-FILE-006', after.inputCleared, `file-input.value cleared: ${after.inputCleared}`);

  // TC-FILE-011 読み込み直後は読み取り専用で、「編集」ボタンで編集できる
  const lockedEditor = await page.evaluate(() => ({
    readOnly: document.getElementById('markdown-editor').readOnly,
    lockShown: !document.getElementById('editor-lock').classList.contains('hidden'),
    errBtnDisabled: document.getElementById('btn-test-err').disabled
  }));
  const beforeType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#markdown-editor');
  await page.keyboard.type('XYZ');
  const afterType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#btn-edit-unlock');
  const unlockedEditor = await page.evaluate(() => ({
    readOnly: document.getElementById('markdown-editor').readOnly,
    lockShown: !document.getElementById('editor-lock').classList.contains('hidden'),
    errBtnDisabled: document.getElementById('btn-test-err').disabled
  }));
  record('TC-FILE-011', lockedEditor.readOnly && lockedEditor.lockShown && lockedEditor.errBtnDisabled && beforeType === afterType
    && !unlockedEditor.readOnly && !unlockedEditor.lockShown && !unlockedEditor.errBtnDisabled,
    JSON.stringify({ lockedEditor, typedIgnored: beforeType === afterType, unlockedEditor }));

  // TC-FILE-004 編集後の読み込み：キャンセルで内容を保つ（TC-FILE-011 で編集できる状態にしてある）
  await page.fill('#markdown-editor', '# 編集中の文書');
  let dialogMessage = null;
  page.once('dialog', d => { dialogMessage = d.message(); d.dismiss(); });
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForTimeout(500);
  const keep = await page.evaluate(() => document.getElementById('markdown-editor').value);
  record('TC-FILE-004', dialogMessage !== null && keep === '# 編集中の文書', JSON.stringify({ dialogMessage, keep }));

  // TC-FILE-005 編集後の読み込み：OK で置き換える
  let accepted = false;
  page.once('dialog', d => { accepted = true; d.accept(); });
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  const relocked = await page.evaluate(() => document.getElementById('markdown-editor').readOnly);
  record('TC-FILE-005', accepted && relocked, `dialog accepted and replaced: ${accepted}, read-only again: ${relocked}`);

  // TC-FILE-012 保存：読み込んだファイル名で、エディタの内容をダウンロードし、その後の読み込みで確認しない
  await page.click('#btn-edit-unlock');
  await page.fill('#markdown-editor', '---\ntitle: 保存のテスト\n---\n# 保存した文書\n');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save-markdown')]);
  const savedText = fs.readFileSync(await download.path(), 'utf8');
  const savedName = download.suggestedFilename();
  let dialogAfterSave = false;
  const onDialogAfterSave = d => { dialogAfterSave = true; d.dismiss(); };
  page.on('dialog', onDialogAfterSave);
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  page.off('dialog', onDialogAfterSave);
  record('TC-FILE-012', savedName === 'notation_sample.md' && savedText === '---\ntitle: 保存のテスト\n---\n# 保存した文書\n' && !savedText.startsWith('\uFEFF') && !dialogAfterSave,
    JSON.stringify({ savedName, savedLength: savedText.length, dialogAfterSave }));

  // TC-FILE-008 埋め込みサンプルの削除
  const appJs = fs.readFileSync(path.join(APP_DIR, 'js', 'app.js'), 'utf8');
  const embedded = /SAMPLE_DOC|次世代インテリジェント分散基盤/.test(appJs);
  record('TC-FILE-008', !embedded, `embedded sample found: ${embedded}`);

  record('TC-FILE-007', page.url().startsWith('file://') && page.consoleErrors.length === 0, `url=${page.url().slice(0, 40)}... consoleErrors=${JSON.stringify(page.consoleErrors)}`);
  await page.close();
}

async function testDiagramRendering(browser) {
  const page = await openApp(browser);
  await loadSample(page);
  const expected = await page.evaluate(() => document.querySelectorAll('#standard-doc-container [data-stage-index]').length);

  // TC-DIAG-001 Visual Stage への初回の切り替え
  await page.click('#btn-visual-mode');
  await waitRendered(page);
  const first = await page.evaluate(() => ({
    svgs: document.querySelectorAll('#visual-stage-container [data-stage-index] svg').length,
    pending: document.querySelectorAll('#visual-stage-container .animate-pulse').length,
    hiddenSide: document.getElementById('standard-doc-container').children.length,
    visualActive: document.getElementById('btn-visual-mode').classList.contains('is-active'),
    fastActive: document.getElementById('btn-mode-fast').classList.contains('is-active')
  }));
  record('TC-DIAG-001', first.svgs === expected && first.pending === 0 && first.hiddenSide === 0 && first.visualActive && !first.fastActive, JSON.stringify({ expected, ...first }));

  // TC-DIAG-002 描画中のモード切替
  await page.click('#btn-visual-mode');
  await page.click('.info-style-btn[data-info-style="circles"]');
  await page.click('#btn-visual-mode');
  await page.click('.info-style-btn[data-info-style="editorial"]');
  await waitRendered(page);
  const rapid = await page.evaluate(() => {
    const vps = Array.from(document.querySelectorAll('#visual-stage-container [data-stage-index]'));
    return {
      svgs: vps.filter(vp => vp.querySelector('svg')).length,
      pending: document.querySelectorAll('.animate-pulse').length,
      allVisualDefs: vps.every(vp => !vp.querySelector('svg') || vp.querySelector('[id*="vis-soft-shadow"]')),
      stdChildren: document.getElementById('standard-doc-container').children.length
    };
  });
  record('TC-DIAG-002', rapid.svgs === expected && rapid.pending === 0 && rapid.allVisualDefs && rapid.stdChildren === 0, JSON.stringify(rapid));

  // TC-DIAG-003〜006, 010, 011 各モード
  const perMode = { ids: [], render: [], seq: [], marker: [], edgeLabel: [], fit: [], wide: [], large: [], math: [] };
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  for (const mode of MODES) {
    await setMode(page, mode);
    const tag = `${mode.style}-${mode.appearance}`;
    const r = await page.evaluate(() => {
      const ids = Array.from(document.querySelectorAll('[id]')).map(e => e.id);
      const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
      // url(#…) が同じ SVG 内の要素を指しているか
      const badRefs = [];
      document.querySelectorAll('[data-stage-index] svg *').forEach(el => {
        Array.from(el.attributes).forEach(a => {
          const m = /url\(\s*['"]?#([^)'"\s]+)/.exec(a.value);
          if (m) {
            const target = document.getElementById(m[1]);
            if (!target || target.closest('svg') !== el.closest('svg')) badRefs.push(m[1]);
          }
        });
      });
      const container = document.querySelector(state.isVisualMode ? '#visual-stage-container' : '#standard-doc-container');
      const vps = Array.from(container.querySelectorAll('[data-stage-index]'));
      const errors = vps.filter(vp => /構文エラー/.test(vp.textContent)).map(vp => vp.dataset.stageIndex);
      const types = vps.map(vp => (vp.querySelector('svg') || { getAttribute: () => 'none' }).getAttribute('aria-roledescription'));
      // シーケンス図の視認性
      const seqSvg = vps.map(vp => vp.querySelector('svg')).find(s => s && s.getAttribute('aria-roledescription') === 'sequence');
      const cs = el => getComputedStyle(el);
      const lifeline = seqSvg.querySelector('line[id*="actor"]');
      const act = seqSvg.querySelector('rect[class^="activation"]');
      const msg = seqSvg.querySelector('line.messageLine0');
      const reply = seqSvg.querySelector('line.messageLine1');
      const arrowRef = /url\(\s*['"]?#([^)'"\s]+)/.exec(msg.getAttribute('marker-end') || '');
      const arrow = arrowRef && document.getElementById(arrowRef[1]);
      const seq = {
        lifeline: cs(lifeline).stroke, lifelineDash: cs(lifeline).strokeDasharray,
        actFill: cs(act).fill, actStroke: cs(act).stroke,
        msg: cs(msg).stroke, replyDash: cs(reply).strokeDasharray,
        arrowFill: arrow ? cs(arrow.querySelector('path')).fill : null,
        arrowInSameSvg: !!arrow && arrow.closest('svg') === seqSvg
      };
      // 状態遷移図のマーカー（すべての状態遷移図）
      const stateSvgs = vps.map(vp => vp.querySelector('svg')).filter(s => s && s.getAttribute('aria-roledescription') === 'stateDiagram');
      const markerUnits = stateSvgs.flatMap(s => Array.from(s.querySelectorAll('marker')).map(m => m.getAttribute('markerUnits')));
      // 空のエッジラベル
      const emptyLabels = Array.from(container.querySelectorAll('svg span.edgeLabel')).filter(s => s.textContent.trim() === '');
      const paddedEmpty = emptyLabels.filter(s => parseFloat(cs(s).paddingLeft) > 0).length;
      // TC-DIAG-012 Fit 表示の文字サイズ: 表示上の最小の文字が 10px 以上（元が 10px 未満なら元の大きさ以上）
      const fit = vps.map(vp => {
        const svg = vp.querySelector(':scope > svg');
        const sizes = Array.from(svg.querySelectorAll('text, tspan, foreignObject *'))
          .filter(el => !el.closest('math') && Array.from(el.childNodes).some(n => n.nodeType === 3 && n.textContent.trim()))
          .map(el => parseFloat(cs(el).fontSize)).filter(s => s > 0);
        const minFont = Math.min(...sizes);
        const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
        const shown = minFont * scale;
        return { idx: vp.dataset.stageIndex, minFont, shown: +shown.toFixed(2), ok: shown >= Math.min(10, minFont) - 0.05 };
      });
      // TC-DIAG-013 表示枠より広い図は、左端から横スクロールで全体を見られる
      const wide = vps.filter(vp => vp.scrollWidth > vp.clientWidth + 1).map(vp => {
        const svg = vp.querySelector(':scope > svg');
        const pad = parseFloat(cs(vp).paddingLeft);
        vp.scrollLeft = 0;
        const leftOk = svg.getBoundingClientRect().left >= vp.getBoundingClientRect().left + pad - 1;
        vp.scrollLeft = vp.scrollWidth;
        const rightOk = svg.getBoundingClientRect().right <= vp.getBoundingClientRect().right + 1;
        vp.scrollLeft = 0;
        return { idx: vp.dataset.stageIndex, leftOk, rightOk };
      });
      // TC-DIAG-014 大きな図
      const nodeCount = s => s.querySelectorAll('g.node').length;
      const flowSizes = vps.map(vp => vp.querySelector('svg')).filter(s => s && s.getAttribute('aria-roledescription') === 'flowchart-v2').map(nodeCount);
      const stateSizes = stateSvgs.map(nodeCount);
      // TC-MATH-007, 008 図の中の数式と、シーケンス図の数式とメッセージ線の間隔
      const mathSvgs = vps.map(vp => vp.querySelector('svg')).filter(s => s && s.querySelector('math'))
        .map(s => ({ type: s.getAttribute('aria-roledescription'), math: s.querySelectorAll('math').length }));
      const seqMathSvg = vps.map(vp => vp.querySelector('svg')).find(s => s && s.getAttribute('aria-roledescription') === 'sequence' && s.querySelector('math'));
      const gaps = seqMathSvg ? Array.from(seqMathSvg.querySelectorAll(':scope > foreignObject')).map(fo => {
        const bottom = fo.querySelector('math').getBoundingClientRect().bottom;
        const lineTops = Array.from(seqMathSvg.querySelectorAll('line[class^="messageLine"]')).map(l => l.getBoundingClientRect().top).filter(t => t >= bottom - 20);
        return +(Math.min(...lineTops) - bottom).toFixed(1);
      }) : [];
      // 数式の文字の明るさ（0〜1）。カードの背景が明るいモードでは暗い文字、通常モードの Dark では明るい文字であること
      const lum = c => { const [r, g, b] = c.match(/\d+/g).map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };
      const mathLums = seqMathSvg ? Array.from(seqMathSvg.querySelectorAll(':scope > foreignObject math')).map(m => +lum(cs(m).color).toFixed(2)) : [];
      return { dup: [...new Set(dup)], badRefs: [...new Set(badRefs)], count: vps.length, errors, types, seq, markerUnits, emptyLabels: emptyLabels.length, paddedEmpty,
        fit, wide, flowSizes, stateSizes, mathSvgs, gaps, mathLums };
    });
    perMode.fit.push({ tag, bad: r.fit.filter(f => !f.ok), shown: r.fit.map(f => f.shown) });
    perMode.wide.push({ tag, wide: r.wide });
    perMode.large.push({ tag, flow: Math.max(...r.flowSizes), state: Math.max(...r.stateSizes) });
    perMode.math.push({ tag, mathSvgs: r.mathSvgs, gaps: r.gaps, lums: r.mathLums, darkBg: tag.endsWith('-dark') });
    perMode.ids.push({ tag, dup: r.dup, badRefs: r.badRefs });
    perMode.render.push({ tag, count: r.count, errors: r.errors, types: r.types });
    perMode.seq.push({ tag, ...r.seq });
    perMode.marker.push({ tag, markerUnits: r.markerUnits });
    perMode.edgeLabel.push({ tag, empty: r.emptyLabels, padded: r.paddedEmpty });
    // TC-DIAG-005 用の画像
    const cards = await page.$$(`${mode.style === 'std' ? '#standard-doc-container' : '#visual-stage-container'} [id^="diagram-frame-"]`);
    for (let i = 0; i < cards.length; i++) {
      await cards[i].screenshot({ path: path.join(SHOT_DIR, `${tag}-${String(i).padStart(2, '0')}.png`) });
    }
  }
  record('TC-DIAG-003', perMode.ids.every(m => m.dup.length === 0 && m.badRefs.length === 0), JSON.stringify(perMode.ids.filter(m => m.dup.length || m.badRefs.length)));
  record('TC-DIAG-004', perMode.render.every(m => m.count === expected && m.errors.length === 0 && !m.types.includes('none')) && page.consoleErrors.length === 0,
    JSON.stringify({ expected, types: perMode.render[0].types, failures: perMode.render.filter(m => m.errors.length), consoleErrors: page.consoleErrors }));
  const bg = { 'std-light': 'rgb(255, 255, 255)', 'std-dark': 'rgb(15, 23, 42)' };
  const seqOk = perMode.seq.every(s => s.lifeline !== (bg[s.tag] || 'none') && s.lifelineDash !== 'none'
    && s.actFill !== 'rgb(255, 255, 255)' && s.actStroke !== 'none' && s.arrowInSameSvg && s.arrowFill === s.msg && s.replyDash !== 'none');
  record('TC-DIAG-006', seqOk, JSON.stringify(perMode.seq));
  const markerOk = perMode.marker.filter(m => !m.tag.startsWith('std')).every(m => m.markerUnits.every(u => u === 'userSpaceOnUse'));
  record('TC-DIAG-010', markerOk, JSON.stringify(perMode.marker));
  record('TC-DIAG-011', perMode.edgeLabel.every(m => m.padded === 0) && perMode.edgeLabel.some(m => m.empty > 0), JSON.stringify(perMode.edgeLabel));
  record('TC-DIAG-012', perMode.fit.every(m => m.bad.length === 0), JSON.stringify(perMode.fit.map(m => ({ tag: m.tag, bad: m.bad, minShown: Math.min(...m.shown) }))));
  record('TC-DIAG-013', perMode.wide.every(m => m.wide.length > 0 && m.wide.every(w => w.leftOk && w.rightOk)), JSON.stringify(perMode.wide));
  record('TC-DIAG-014', perMode.large.every(m => m.flow >= 30 && m.state >= 15), JSON.stringify(perMode.large));
  record('TC-MATH-007', perMode.math.every(m => m.mathSvgs.map(s => `${s.type}:${s.math}`).join() === 'flowchart-v2:3,sequence:2'), JSON.stringify(perMode.math.map(m => ({ tag: m.tag, mathSvgs: m.mathSvgs }))));
  const lumOk = m => m.lums.length === 2 && m.lums.every(l => (m.darkBg ? l > 0.6 : l < 0.4));
  record('TC-MATH-008', perMode.math.every(m => m.gaps.length === 2 && m.gaps.every(g => g >= 2) && lumOk(m)),
    JSON.stringify(perMode.math.map(m => ({ tag: m.tag, gaps: m.gaps, lums: m.lums }))));

  // TC-DIAG-007 カードのボタンは表示中の図を操作する
  await setMode(page, { style: 'shapes', appearance: 'light' });
  await page.click('#visual-stage-container [data-action="zoom"][data-index="0"]');
  const zoomed = await page.evaluate(() => !!document.querySelector('#zoom-canvas [id*="vis-soft-shadow"]'));
  await page.click('#zoom-close-btn');
  const cleared = await page.evaluate(() => document.getElementById('zoom-canvas').innerHTML === '');
  record('TC-DIAG-007', zoomed && cleared, JSON.stringify({ zoomed, cleared }));

  // TC-DIAG-009 Cards の記号の順序
  await setMode(page, { style: 'cards', appearance: 'light' });
  const letters = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="0"] svg');
    return Array.from(svg.querySelectorAll('g.node'))
      .map(g => ({ t: Array.from(g.querySelectorAll(':scope > text')).map(t => t.textContent).join(''), y: g.getBoundingClientRect().top }))
      .filter(n => n.t).sort((a, b) => a.y - b.y).map(n => n.t).join('');
  });
  // 大きなフローチャート（ノードが最も多いフローチャート）の記号が重複しない
  const bigLetters = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('#visual-stage-container [data-stage-index] > svg'))
      .filter(s => s.getAttribute('aria-roledescription') === 'flowchart-v2');
    const big = svgs.sort((a, b) => b.querySelectorAll('g.node').length - a.querySelectorAll('g.node').length)[0];
    return Array.from(big.querySelectorAll('g.node > text')).map(t => t.textContent);
  });
  // 以前の記号は 8 文字（A〜H）の繰り返しだったため、9 個以上で重複しないことを確かめる
  const unique = new Set(bigLetters).size === bigLetters.length && bigLetters.length > 8;
  record('TC-DIAG-009', letters === 'ABCD'.slice(0, letters.length) && letters.length > 0 && unique,
    `letters top-to-bottom: ${letters}; big flowchart: ${bigLetters.length} labels, unique=${unique}, last=${bigLetters.slice(-3).join(',')}`);

  // TC-DIAG-008 構文エラー時は同じモードの直前の正常描画を表示する
  await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = ed.value.replace('flowchart TD\n  Start([開始])', 'flowchart TD\n  Start([開始]) -->');
    renderApp();
  });
  await waitRendered(page);
  const lkg = await page.evaluate(() => {
    const vp = document.querySelector('#visual-stage-container [data-stage-index="0"]');
    return { hasSvg: !!vp.querySelector('svg'), visual: !!vp.querySelector('[id*="vis-card-shadow"]'), toast: document.getElementById('toast-message').textContent };
  });
  record('TC-DIAG-008', lkg.hasSvg && lkg.visual && /直前の正常状態/.test(lkg.toast), JSON.stringify(lkg));
  await page.close();
}

// Markdown 要素の計算後のスタイルを、本文モード（通常 / Visual Stage × Light / Dark）ごとに調べる
const MD_MODES = [
  { style: 'std', appearance: 'light' }, { style: 'std', appearance: 'dark' },
  { style: 'shapes', appearance: 'light' }, { style: 'shapes', appearance: 'dark' }
];

function inspectMarkdown(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const q = sel => root.querySelector(sel);
  const cs = el => getComputedStyle(el);
  const isTransparent = c => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  // 要素の背後にある最も近い不透明な背景色
  const backdrop = el => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const bg = cs(n).backgroundColor;
      if (!isTransparent(bg)) return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  const px = v => parseFloat(v);
  // Visual Stage の段落・リストは、雛形（FR-016）を適用しない標準型の章で調べる（雛形の章は見た目を変えるため）
  const std = isVisual ? '.vs-tpl-standard ' : '';
  const body = q(`${std}h4 ~ p`);
  const h3 = q('h3'), h4 = q('h4');
  const uls = [q(`${std}ul`), q(`${std}ul ul`), q(`${std}ul ul ul`)];
  const ol = q(`${std}ol`);
  const task = Array.from(root.querySelectorAll(`${std}li`)).find(li => li.querySelector(':scope > input[type="checkbox"]'));
  const link = q('a');
  const inline = Array.from(root.querySelectorAll('code')).find(c => !c.closest('pre'));
  const pre = q('pre'), preCode = q('pre code');
  const bq = q('blockquote'), bqInner = q('blockquote blockquote');
  const table = q('table');
  const cells = table ? [2, 3].map(n => ({ th: table.querySelector(`th:nth-child(${n})`), td: table.querySelector(`td:nth-child(${n})`) })) : [];
  const hr = q('hr');
  const details = q('details'), summary = q('summary'), kbd = q('kbd'), mark = q('mark'), sub = q('sub'), sup = q('sup');
  return {
    heading: !!(h3 && h4 && body) && (() => {
      const b = cs(body), a = cs(h3), c = cs(h4);
      const stands = s => px(s.fontSize) > px(b.fontSize) || +s.fontWeight >= +b.fontWeight + 200;
      return { ok: stands(a) && stands(c) && px(a.fontSize) > px(c.fontSize), h3: [a.fontSize, a.fontWeight], h4: [c.fontSize, c.fontWeight], p: [b.fontSize, b.fontWeight] };
    })(),
    list: (() => {
      const types = uls.map(u => u && cs(u).listStyleType);
      const li = [q(`${std}ul > li`), q(`${std}ul ul > li`), q(`${std}ul ul ul > li`)];
      const indented = li.every(Boolean) && li[0].getBoundingClientRect().left < li[1].getBoundingClientRect().left && li[1].getBoundingClientRect().left < li[2].getBoundingClientRect().left;
      const olType = ol && cs(ol).listStyleType;
      const taskType = task && cs(task).listStyleType;
      return { ok: types.join() === 'disc,circle,square' && olType === 'decimal' && indented && taskType === 'none', types, olType, indented, taskType };
    })(),
    link: link && (() => {
      const s = cs(link);
      return { ok: s.color !== cs(body).color && /underline/.test(s.textDecorationLine), color: s.color, p: cs(body).color, deco: s.textDecorationLine };
    })(),
    code: inline && pre && preCode && (() => {
      const i = cs(inline), p = cs(pre), pc = cs(preCode);
      const mono = s => /JetBrains Mono|monospace/.test(s.fontFamily);
      const ok = mono(i) && mono(pc) && !isTransparent(i.backgroundColor) && i.backgroundColor !== backdrop(inline)
        && !isTransparent(p.backgroundColor) && p.backgroundColor !== backdrop(pre)
        && isTransparent(pc.backgroundColor) && px(pc.borderTopWidth) === 0;
      return { ok, inlineBg: i.backgroundColor, inlineBackdrop: backdrop(inline), preBg: p.backgroundColor, preBackdrop: backdrop(pre), preCodeBg: pc.backgroundColor };
    })(),
    blockquote: bq && bqInner && (() => {
      const s = cs(bq);
      const ok = px(s.borderLeftWidth) >= 3 && s.borderLeftColor !== backdrop(bq) && px(s.paddingLeft) > 0 && isTransparent(s.backgroundColor)
        && bqInner.getBoundingClientRect().left > bq.getBoundingClientRect().left && px(cs(bqInner).borderLeftWidth) >= 3;
      return { ok, border: [s.borderLeftWidth, s.borderLeftColor], backdrop: backdrop(bq), bg: s.backgroundColor };
    })(),
    table: cells.length === 2 && (() => {
      const aligns = cells.map(c => [cs(c.th).textAlign, cs(c.td).textAlign]);
      return { ok: aligns[0].every(a => a === 'center') && aligns[1].every(a => a === 'right'), aligns };
    })(),
    hr: hr && (() => {
      const s = cs(hr);
      return { ok: px(s.borderTopWidth) >= 1 && s.borderTopStyle !== 'none' && s.borderTopColor !== backdrop(hr), color: s.borderTopColor, backdrop: backdrop(hr) };
    })(),
    html: (() => {
      const present = { details: !!details, summary: !!summary, kbd: !!kbd, mark: !!mark, sub: !!sub, sup: !!sup };
      if (!Object.values(present).every(Boolean)) return { ok: false, present };
      const framed = el => px(cs(el).borderTopWidth) >= 1 && cs(el).borderTopColor !== backdrop(el);
      const m = cs(mark);
      const small = el => px(cs(el).fontSize) < px(cs(el.parentElement).fontSize);
      const ok = framed(details) && framed(kbd) && !isTransparent(m.backgroundColor) && m.backgroundColor !== backdrop(mark) && small(sub) && small(sup);
      return { ok, details: cs(details).borderTopColor, kbd: cs(kbd).borderTopColor, mark: m.backgroundColor };
    })(),
    // 1〜7 章（最初の図の手前まで）の撮影範囲
    clip: (() => {
      const top = root.getBoundingClientRect().top + window.scrollY;
      const frame = root.querySelector('[id^="diagram-frame-"]');
      const end = isVisual ? frame.closest('.exhibition-slab') : frame;
      const r = root.getBoundingClientRect();
      return { x: r.left, y: top, width: r.width, height: end.getBoundingClientRect().top + window.scrollY - top };
    })()
  };
}

async function testMarkdownTypography(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const checks = { heading: 'TC-MD-001', list: 'TC-MD-002', link: 'TC-MD-003', code: 'TC-MD-004', blockquote: 'TC-MD-005', table: 'TC-MD-006', hr: 'TC-MD-007', html: 'TC-MD-008' };
  const byTc = {};
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const isVisual = mode.style !== 'std';
    const res = await page.evaluate(inspectMarkdown, isVisual);
    const tag = `${mode.style}-${mode.appearance}`;
    for (const [key, tc] of Object.entries(checks)) {
      (byTc[tc] = byTc[tc] || []).push({ mode: tag, ok: !!(res[key] && res[key].ok), detail: res[key] });
    }
    await page.screenshot({ path: path.join(SHOT_DIR, `md-${tag}.png`), clip: res.clip });
  }
  for (const [tc, rows] of Object.entries(byTc)) {
    const failed = rows.filter(r => !r.ok);
    record(tc, failed.length === 0, failed.length ? JSON.stringify(failed) : `${rows.length} モード`);
  }
  // TC-MD-009 サンプルの HTML の例に独自の class がない
  const sample = fs.readFileSync(SAMPLE, 'utf8').replace(/```[\s\S]*?```/g, '');
  record('TC-MD-009', !/<[a-z][^>]*\sclass=/i.test(sample), '');
  if (page.consoleErrors.length) record('TC-MD-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// 本文の数式（samples/notation_sample.md の 8 章）を調べる
function inspectMath(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const all = Array.from(root.querySelectorAll('.lucivo-math'));
  const section = Array.from(root.querySelectorAll('h2')).find(h => /数式/.test(h.textContent) && !/図の中/.test(h.textContent));
  // 8 章の段落（見出しの次の要素から、次の h2 まで。Visual Stage ではスラブの中）
  const scope = isVisual ? section.closest('.exhibition-slab') : null;
  const paras = isVisual ? Array.from(scope.querySelectorAll('p')) : (() => {
    const out = [];
    for (let n = section.nextElementSibling; n && n.tagName !== 'H2'; n = n.nextElementSibling) if (n.tagName === 'P') out.push(n);
    return out;
  })();
  const money = paras.find(p => /金額/.test(p.textContent));
  const escaped = paras.find(p => /表示できます/.test(p.textContent));
  const codeWithDollar = Array.from(root.querySelectorAll('code')).filter(c => c.textContent.includes('$'));
  return {
    rendered: {
      total: all.length,
      inline: all.filter(e => e.dataset.display === 'false').length,
      display: all.filter(e => e.dataset.display === 'true' && e.querySelector('.katex-display')).length,
      katex: all.filter(e => e.querySelector('.katex')).length,
      errors: root.querySelectorAll('.katex-error').length
    },
    notMath: {
      money: !!money && !money.querySelector('.lucivo-math') && /\$5 と \$10/.test(money.textContent),
      escaped: !!escaped && /\$100/.test(escaped.textContent) && !/\\\$100/.test(escaped.textContent) && escaped.querySelectorAll('.lucivo-math').length === 0,
      code: codeWithDollar.length >= 3 && codeWithDollar.every(c => !c.querySelector('.lucivo-math'))
    }
  };
}

async function testMathRendering(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const rows = { 'TC-MATH-001': [], 'TC-MATH-002': [] };
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const r = await page.evaluate(inspectMath, mode.style !== 'std');
    const tag = `${mode.style}-${mode.appearance}`;
    const m = r.rendered;
    rows['TC-MATH-001'].push({ tag, ok: m.total === 5 && m.inline === 3 && m.display === 2 && m.katex === 5 && m.errors === 0, ...m });
    rows['TC-MATH-002'].push({ tag, ok: Object.values(r.notMath).every(Boolean), ...r.notMath });
  }
  for (const [tc, list] of Object.entries(rows)) record(tc, list.every(x => x.ok), JSON.stringify(list));
  if (page.consoleErrors.length) record('TC-MATH-CONSOLE', false, JSON.stringify(page.consoleErrors));

  // TC-MATH-009 HTML エクスポートに数式と KaTeX の CSS が含まれる
  await setMode(page, { style: 'std', appearance: 'light' });
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-html')]);
  const exported = fs.readFileSync(await download.path(), 'utf8');
  record('TC-MATH-009', /katex@[\d.]+\/dist\/katex\.min\.css/.test(exported) && /class="katex"/.test(exported), `css=${/katex\.min\.css/.test(exported)} katex=${(exported.match(/class="katex"/g) || []).length}`);

  // TC-MATH-003 誤りのある数式・TC-MATH-006 安全性
  const doc = [
    '誤り: $\\frac{1}{$ の後も描画が続く。正しい数式 $a^2$。',
    '',
    'リンク: $\\href{javascript:alert(1)}{x}$',
    '',
    'タグ: $<img src=x onerror="window.__xss=1">$'
  ].join('\n');
  const bad = await page.evaluate(async src => {
    const ed = document.getElementById('markdown-editor');
    ed.value = src;
    renderApp();
    await new Promise(r => setTimeout(r, 300));
    const root = document.getElementById('standard-doc-container');
    return {
      errorShown: root.querySelectorAll('.katex-error').length >= 1,
      validRendered: Array.from(root.querySelectorAll('.lucivo-math .katex')).some(k => /a/.test(k.textContent) && /2/.test(k.textContent)),
      jsLinks: root.querySelectorAll('a[href^="javascript"]').length,
      imgs: root.querySelectorAll('img').length,
      xss: !!window.__xss
    };
  }, doc);
  record('TC-MATH-003', bad.errorShown && bad.validRendered, JSON.stringify(bad));
  record('TC-MATH-006', bad.jsLinks === 0 && bad.imgs === 0 && !bad.xss, JSON.stringify(bad));
  await page.close();

  // TC-MATH-004 KaTeX を読み込めない場合は原文を表示する
  const ctx = await browser.newContext();
  await ctx.route('**/vendor/katex/**', route => route.abort());
  const offline = await ctx.newPage();
  const pageErrors = [];
  offline.on('pageerror', e => pageErrors.push(e.message));
  await offline.goto(APP_URL);
  await offline.waitForFunction(() => typeof renderApp === 'function');
  await offline.setInputFiles('#file-input', SAMPLE);
  await offline.waitForFunction(() => document.getElementById('markdown-editor').value.length > 0);
  await offline.waitForTimeout(500);
  const raw = await offline.evaluate(() => {
    const root = document.getElementById('standard-doc-container');
    return { katex: !!window.katex, text: Array.from(root.querySelectorAll('.lucivo-math')).map(e => e.textContent).slice(0, 2), h1: !!root.querySelector('h1') };
  });
  record('TC-MATH-004', !raw.katex && raw.text[0] === '$E = mc^2$' && raw.h1 && pageErrors.length === 0, JSON.stringify({ ...raw, pageErrors }));
  await ctx.close();
}

// 色の明るさ（0〜1）。ページ内で実行する関数からも使えるよう、文字列として渡す
const LUMINANCE_SRC = `c => { const m = (c || '').match(/[\\d.]+/g); if (!m) return null; const [r, g, b] = m.map(Number); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; }`;

// TC-DIAG-015〜019: 安全性、Visual Stage の細部と Dark
async function testVisualStageQuality(browser) {
  const page = await openApp(browser);
  await waitRendered(page);

  // TC-DIAG-015 Mermaid の図の中の HTML とクリック時のスクリプト呼び出しが無効
  const mermaidXss = await page.evaluate(async () => {
    const ed = document.getElementById('markdown-editor');
    ed.value = '# 図の安全性\n\n```mermaid\nflowchart TD\n  A["<img src=x onerror=window.__mxss=1>"] --> B\n  click A call alert(1)\n  click B "javascript:window.__mxss=2"\n```\n';
    renderApp();
    return true;
  });
  await waitRendered(page);
  await page.waitForTimeout(300);
  const mx = await page.evaluate(() => {
    const svg = document.querySelector('#standard-doc-container [data-stage-index="0"] svg');
    const handlers = svg ? Array.from(svg.querySelectorAll('*')).filter(el => Array.from(el.attributes).some(a => /^on/i.test(a.name))).length : -1;
    return { svg: !!svg, imgs: svg ? svg.querySelectorAll('img').length : -1, eventHandlers: handlers, jsLinks: svg ? svg.querySelectorAll('a[href^="javascript"], a[*|href^="javascript"]').length : -1, xss: !!window.__mxss };
  });
  // Mermaid の strict は、HTML タグを文字にせず、DOMPurify で危険な属性を取り除く。img 要素は残るが、イベント属性は残らない。
  // テストで書いた img（src=x）の読み込みエラーはコンソールに出るため、ここまでのエラーは集計から外す
  page.consoleErrors = page.consoleErrors.filter(e => !/ERR_FILE_NOT_FOUND/.test(e));
  record('TC-DIAG-015', mermaidXss && mx.svg && mx.eventHandlers === 0 && mx.jsLinks === 0 && !mx.xss, JSON.stringify(mx));

  // TC-DIAG-016 Visual Stage の見出しの文字は HTML として解釈されない
  await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = '# &lt;img src=x onerror="window.__hxss=1"&gt;\n\n## &lt;img src=x onerror="window.__hxss=2"&gt;\n\n本文\n';
  });
  await setMode(page, { style: 'shapes', appearance: 'light' });
  await page.waitForTimeout(300);
  const hx = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    return { imgs: root.querySelectorAll('img').length, heroText: (root.querySelector('.exhibition-hero h1') || {}).textContent, xss: !!window.__hxss };
  });
  record('TC-DIAG-016', hx.imgs === 0 && !hx.xss && /<img src=x/.test(hx.heroText || ''), JSON.stringify(hx));

  // 以降は samples/notation_sample.md で確かめる
  await setMode(page, { style: 'std', appearance: 'light' });
  await loadSample(page);

  // TC-DIAG-017 小さな図は 1.5 倍までしか拡大しない。1:1 は元の大きさ
  const scale = await page.evaluate(() => {
    const svg = document.querySelector('#standard-doc-container [data-stage-index="0"] > svg');
    return +(svg.getBoundingClientRect().width / svg.viewBox.baseVal.width).toFixed(2);
  });
  await page.click('#standard-doc-container [data-action="scale-actual"][data-index="0"]');
  const actual = await page.evaluate(() => {
    const svg = document.querySelector('#standard-doc-container [data-stage-index="0"] > svg');
    return { width: svg.getBoundingClientRect().width, vb: svg.viewBox.baseVal.width };
  });
  record('TC-DIAG-017', scale <= 1.51 && scale >= 1.2 && Math.abs(actual.width - actual.vb) <= 2, JSON.stringify({ fitScale: scale, actual }));

  // TC-DIAG-018 Visual Stage の細部: Cards の帯と文字、Circles のキャメル色の文字、ヒーローの固定文言、Dark の表の区切り線
  await setMode(page, { style: 'cards', appearance: 'light' });
  const cards = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="0"] svg');
    return Array.from(svg.querySelectorAll('g.node')).map(g => {
      const cap = Array.from(g.querySelectorAll('rect')).find(r => /vis-cap/.test(r.style.fill || ''));
      const label = g.querySelector(':scope > .label');
      if (!cap || !label) return null;
      // ラベルの枠（行の高さを含む箱）の中心が帯より下にあり、枠と帯の重なりが 2px 以内であること
      const box = (label.querySelector('foreignObject div, text') || label).getBoundingClientRect();
      const capBottom = cap.getBoundingClientRect().bottom;
      return { overlap: +(capBottom - box.top).toFixed(1), centerBelow: (box.top + box.bottom) / 2 > capBottom };
    }).filter(v => v !== null);
  });
  await setMode(page, { style: 'circles', appearance: 'light' });
  const lum = eval(LUMINANCE_SRC);
  const camel = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="0"] svg');
    const node = Array.from(svg.querySelectorAll('g.node')).find(g => {
      const shape = g.querySelector('rect, polygon');
      return shape && getComputedStyle(shape).fill === 'rgb(236, 182, 116)';
    });
    const text = node && node.querySelector('.nodeLabel, foreignObject span, text');
    return { found: !!node, color: text ? getComputedStyle(text).color : null, hero: document.querySelector('#visual-stage-container').textContent.includes('EDITORIAL INFOGRAPHIC STUDIO') };
  });
  await setMode(page, { style: 'shapes', appearance: 'dark' });
  const table = await page.evaluate(() => {
    const td = document.querySelector('#visual-stage-container .exhibition-slab td');
    const slab = td.closest('.exhibition-slab');
    // Visualモードの表は横の罫線で組む（DTP-VTPL-110）。区切り線は行の下端の線で調べる
    return { border: getComputedStyle(td).borderBottomColor, style: getComputedStyle(td).borderBottomStyle, slab: getComputedStyle(slab).backgroundColor };
  });
  const detail = {
    cardsMaxOverlap: Math.max(...cards.map(c => c.overlap)), cardsCenterBelow: cards.every(c => c.centerBelow), cardsCount: cards.length,
    camelText: camel.color, camelLum: camel.color && +lum(camel.color).toFixed(2), fixedHero: camel.hero, table
  };
  record('TC-DIAG-018', cards.length >= 3 && detail.cardsCenterBelow && detail.cardsMaxOverlap <= 2 && camel.found && detail.camelLum < 0.4 && !camel.hero && table.style !== 'none' && table.border !== table.slab, JSON.stringify(detail));

  // TC-DIAG-019 Dark の Visual Stage: カード背景が暗く、背景の上の線・文字が明るい（4 スタイル）
  const rows = [];
  for (const style of VISUAL_STYLES) {
    await setMode(page, { style, appearance: 'dark' });
    const r = await page.evaluate(src => {
      const lumOf = eval(src);
      const root = document.getElementById('visual-stage-container');
      const card = root.querySelector('.exhibition-diagram-card');
      const cs = getComputedStyle(card);
      const colors = (cs.backgroundImage + ' ' + cs.backgroundColor).match(/rgba?\([^)]+\)/g) || [];
      const opaque = colors.filter(c => { const a = c.match(/[\d.]+/g); return a.length < 4 || +a[3] > 0.5; });
      const bgLum = opaque.reduce((sum, c) => sum + lumOf(c), 0) / opaque.length;
      const svgOf = type => Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === type);
      const flow = svgOf('flowchart-v2'), cls = svgOf('classDiagram'), seq = svgOf('sequence');
      const edge = flow.querySelector('path.flowchart-link');
      const clsText = cls.querySelector('.nodeLabel, text');
      const lifeline = seq.querySelector('line[class~="200"], line[id^="actor"]');
      const msg = seq.querySelector('text.messageText');
      return {
        bgLum: +bgLum.toFixed(2),
        edgeLum: +lumOf(getComputedStyle(edge).stroke).toFixed(2),
        classTextLum: +lumOf(getComputedStyle(clsText).color === 'rgb(0, 0, 0)' ? getComputedStyle(clsText).fill : getComputedStyle(clsText).color).toFixed(2),
        lifelineLum: +lumOf(getComputedStyle(lifeline).stroke).toFixed(2),
        messageLum: +lumOf(getComputedStyle(msg).fill).toFixed(2)
      };
    }, LUMINANCE_SRC);
    // Circles の結線はパレットの色（暗めの色を含む）のため、明るさは判定しない
    const edgeOk = style === 'circles' || r.edgeLum > 0.5;
    rows.push({ style, ok: r.bgLum < 0.3 && edgeOk && r.classTextLum > 0.6 && r.lifelineLum > 0.4 && r.messageLum > 0.6, ...r });
  }
  record('TC-DIAG-019', rows.every(r => r.ok), JSON.stringify(rows));

  // TC-DIAG-021 Visual Stage の自動 2 段組みレイアウトと 1 段組みへの自動フォールバック（FR-015, DD-DIAG-040〜042）
  await setMode(page, { style: 'shapes', appearance: 'light' });
  const splitCheck = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const slabs = Array.from(root.querySelectorAll('.exhibition-slab'));
    const findSlab = titleRe => slabs.find(s => { const h2 = s.querySelector('h2'); return h2 && titleRe.test(h2.textContent); });
    const inspectSlab = s => {
      const isSplit = s.classList.contains('exhibition-slab-split');
      const isStacked = s.classList.contains('is-stacked');
      const prose = s.querySelector('.exhibition-slab-prose');
      const fig = s.querySelector('.exhibition-slab-figure');
      const vp = s.querySelector('.exhibition-viewport');
      const pr = prose ? prose.getBoundingClientRect() : null;
      const fr = fig ? fig.getBoundingClientRect() : null;
      return {
        isSplit,
        isStacked,
        sideBySide: !!(pr && fr && fr.left >= pr.right - 2 && Math.abs(fr.top - pr.top) < 40),
        stackedPos: !!(pr && fr && fr.top >= pr.bottom - 2),
        overflow: vp ? vp.scrollWidth > vp.clientWidth + 1 : false
      };
    };
    return {
      flow9: inspectSlab(findSlab(/フローチャート$/)),
      state12: inspectSlab(findSlab(/^STAGE \d+状態遷移図$/)),
      bigFlow23: inspectSlab(findSlab(/大きなフローチャート/)),
      bigState24: inspectSlab(findSlab(/大きな状態遷移図/)),
      textOnly1: inspectSlab(findSlab(/見出しと段落/)),
      diagOnly10: inspectSlab(findSlab(/シーケンス図/)),
      twoDiags25: inspectSlab(findSlab(/図の中の数式/))
    };
  });
  const firstSplitSlab = await page.$('#visual-stage-container .exhibition-slab-split:not(.is-stacked)');
  if (firstSplitSlab) await firstSplitSlab.screenshot({ path: path.join(SHOT_DIR, 'slab-split-shapes-light.png') });

  // 9 章の図を 1:1 に切り替えると 1 段組み（is-stacked）になり、Fit に戻すと 2 段組みに戻る
  await page.click('#visual-stage-container [data-action="scale-actual"][data-index="0"]');
  const actualStacked = await page.evaluate(() => {
    const s = document.querySelector('#visual-stage-container #diagram-frame-0').closest('.exhibition-slab');
    const pr = s.querySelector('.exhibition-slab-prose').getBoundingClientRect();
    const fr = s.querySelector('.exhibition-slab-figure').getBoundingClientRect();
    return s.classList.contains('is-stacked') && fr.top >= pr.bottom - 2;
  });
  await page.click('#visual-stage-container [data-action="scale-fit"][data-index="0"]');

  // 画面幅 767px 以下では 1 段組み（上下配置）になる
  await page.setViewportSize({ width: 640, height: 16000 });
  const narrowStacked = await page.evaluate(() => {
    const s = document.querySelector('#visual-stage-container #diagram-frame-0').closest('.exhibition-slab');
    const pr = s.querySelector('.exhibition-slab-prose').getBoundingClientRect();
    const fr = s.querySelector('.exhibition-slab-figure').getBoundingClientRect();
    return fr.top >= pr.bottom - 2;
  });
  await page.setViewportSize({ width: 1300, height: 16000 });

  const splitOk = splitCheck.flow9.isSplit && !splitCheck.flow9.isStacked && splitCheck.flow9.sideBySide && !splitCheck.flow9.overflow
    && splitCheck.state12.isSplit && !splitCheck.state12.isStacked && splitCheck.state12.sideBySide && !splitCheck.state12.overflow
    && splitCheck.bigFlow23.isSplit && splitCheck.bigFlow23.isStacked && splitCheck.bigFlow23.stackedPos
    && splitCheck.bigState24.isSplit && splitCheck.bigState24.isStacked && splitCheck.bigState24.stackedPos
    && !splitCheck.textOnly1.isSplit && !splitCheck.diagOnly10.isSplit && !splitCheck.twoDiags25.isSplit
    && actualStacked && narrowStacked;
  record('TC-DIAG-021', splitOk, JSON.stringify({ ...splitCheck, actualStacked, narrowStacked }));

  if (page.consoleErrors.length) record('TC-DIAG-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// TC-PERF-001〜002: 起動時の読み込みと、再描画のキャッシュ
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

// 図ごとの矢印の形状（FR-012）を調べる。ページ内で実行する
function inspectEdgeStyle(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  return Array.from(root.querySelectorAll('[id^="diagram-frame-"]')).map(card => {
    const svg = card.querySelector('[data-stage-index] > svg');
    const active = card.querySelector('.edge-curve-btn.is-active');
    const paths = svg ? Array.from(svg.querySelectorAll('path.flowchart-link, path.transition, path.relation')).map(p => p.getAttribute('d') || '') : [];
    return {
      idx: card.id.replace('diagram-frame-', ''),
      type: svg ? svg.getAttribute('aria-roledescription') : null,
      picker: card.querySelectorAll('.edge-curve-btn').length,
      active: active ? active.getAttribute('data-curve') : null,
      pressed: active ? active.getAttribute('aria-pressed') : null,
      curved: paths.some(d => /C/.test(d)),
      sig: paths.join('|').slice(0, 200)
    };
  });
}

async function testEdgeStyle(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const byIdx = (list, idx) => list.find(c => c.idx === String(idx));

  // TC-EDGE-001 既定: フローチャートとクラス図は直角、状態遷移図は曲線で選択があり、他の図種には選択がない
  const initial = await page.evaluate(inspectEdgeStyle, false);
  const flows = initial.filter(c => c.type === 'flowchart-v2');
  const states = initial.filter(c => c.type === 'stateDiagram');
  const classes = initial.filter(c => c.type === 'classDiagram');
  const others = initial.filter(c => !['flowchart-v2', 'stateDiagram', 'classDiagram'].includes(c.type));
  const isDefault = (c, curve, curved) => c.picker === 3 && c.active === curve && c.pressed === 'true' && c.curved === curved;
  record('TC-EDGE-001', flows.length >= 3 && flows.every(c => isDefault(c, 'step', false))
    && states.length >= 1 && states.every(c => isDefault(c, 'smooth', true))
    && classes.length >= 1 && classes.every(c => isDefault(c, 'step', false))
    && others.every(c => c.picker === 0),
    JSON.stringify({ flows: flows.map(c => ({ idx: c.idx, active: c.active, curved: c.curved })), states: states.map(c => ({ idx: c.idx, active: c.active, curved: c.curved })), classes: classes.map(c => ({ idx: c.idx, active: c.active, curved: c.curved })), otherPickers: others.filter(c => c.picker).map(c => c.idx) }));

  // TC-EDGE-006 状態遷移図とクラス図も、図ごとに形状を変えられる
  const st = states[0].idx, cl = classes[0].idx;
  await page.click(`#standard-doc-container .edge-curve-btn[data-index="${st}"][data-curve="straight"]`);
  await waitRendered(page);
  await page.click(`#standard-doc-container .edge-curve-btn[data-index="${cl}"][data-curve="smooth"]`);
  await waitRendered(page);
  const changed = await page.evaluate(inspectEdgeStyle, false);
  record('TC-EDGE-006', byIdx(changed, st).active === 'straight' && !byIdx(changed, st).curved && byIdx(changed, st).sig !== byIdx(initial, st).sig
    && byIdx(changed, cl).active === 'smooth' && byIdx(changed, cl).curved,
    JSON.stringify({ state: { active: byIdx(changed, st).active, curved: byIdx(changed, st).curved }, class: { active: byIdx(changed, cl).active, curved: byIdx(changed, cl).curved } }));
  await page.setInputFiles('#file-input', SAMPLE);
  await waitRendered(page);

  // TC-EDGE-002 1 つの図だけ形状を変えられる
  const otherFlow = flows[1].idx;
  await page.click('#standard-doc-container .edge-curve-btn[data-index="0"][data-curve="smooth"]');
  await waitRendered(page);
  const smooth = await page.evaluate(inspectEdgeStyle, false);
  await page.click('#standard-doc-container .edge-curve-btn[data-index="0"][data-curve="straight"]');
  await waitRendered(page);
  const straight = await page.evaluate(inspectEdgeStyle, false);
  const s0 = byIdx(smooth, 0), t0 = byIdx(straight, 0), i0 = byIdx(initial, 0);
  record('TC-EDGE-002', s0.active === 'smooth' && s0.curved && t0.active === 'straight' && !t0.curved && t0.sig !== i0.sig
    && byIdx(smooth, otherFlow).active === 'step' && byIdx(smooth, otherFlow).sig === byIdx(initial, otherFlow).sig,
    JSON.stringify({ smooth: { active: s0.active, curved: s0.curved }, straight: { active: t0.active, curved: t0.curved, differsFromStep: t0.sig !== i0.sig }, other: byIdx(smooth, otherFlow).active }));

  // TC-EDGE-003 選択は Visual Stage でも保たれ、文書全体の矢印形状の切替はない
  await setMode(page, { style: 'shapes', appearance: 'light' });
  const visual = await page.evaluate(inspectEdgeStyle, true);
  const globalSwitch = await page.evaluate(() => document.querySelectorAll('.curve-option-btn, [data-curve-set]').length);
  record('TC-EDGE-003', byIdx(visual, 0).active === 'straight' && !byIdx(visual, 0).curved && byIdx(visual, otherFlow).active === 'step' && globalSwitch === 0,
    JSON.stringify({ visual0: byIdx(visual, 0).active, visualOther: byIdx(visual, otherFlow).active, globalSwitch }));
  const card = await page.$('#visual-stage-container #diagram-frame-0');
  if (card) await card.screenshot({ path: path.join(SHOT_DIR, 'edge-shapes-light-00-straight.png') });

  // TC-EDGE-004 ファイルを読み込み直すと既定に戻る
  await setMode(page, { style: 'std', appearance: 'light' });
  await page.setInputFiles('#file-input', SAMPLE);
  await waitRendered(page);
  const reloaded = await page.evaluate(inspectEdgeStyle, false);
  record('TC-EDGE-004', byIdx(reloaded, 0).active === 'step' && !byIdx(reloaded, 0).curved, JSON.stringify({ after: byIdx(reloaded, 0).active }));
  if (page.consoleErrors.length) record('TC-EDGE-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// YAML フロントマター（FR-011）を調べる。ページ内で実行する
function inspectFrontMatter(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const fm = root.querySelector('.front-matter');
  const btn = document.getElementById('btn-front-matter');
  const isTransparent = c => c === 'transparent' || /rgba\(.*,\s*0\)$/.test(c);
  const backdrop = el => {
    for (let n = el; n; n = n.parentElement) {
      const bg = getComputedStyle(n).backgroundColor;
      if (!isTransparent(bg)) return bg;
    }
    return 'rgb(255, 255, 255)';
  };
  const h1 = isVisual ? root.querySelector('.exhibition-hero h1') : root.querySelector('h1');
  const first = isVisual ? root.querySelector('.exhibition-slab') : root.firstElementChild;
  const info = {
    pressed: btn.getAttribute('aria-pressed'),
    present: !!fm,
    leakedYaml: /draft: false/.test(root.textContent) && !fm,
    hrBeforeH1: !isVisual && !!h1 && Array.from(root.children).indexOf(root.querySelector('hr')) > -1
      && Array.from(root.children).indexOf(root.querySelector('hr')) < Array.from(root.children).indexOf(h1),
    h1: h1 ? h1.textContent.trim() : null
  };
  if (fm) {
    const key = fm.querySelector('.fm-key'), value = fm.querySelector('.fm-value'), comment = fm.querySelector('.fm-comment');
    const bg = backdrop(fm.querySelector('pre'));
    info.label = fm.querySelector('.front-matter-label').textContent.trim();
    info.text = fm.querySelector('pre').textContent;
    info.keys = fm.querySelectorAll('.fm-key').length;
    info.comments = fm.querySelectorAll('.fm-comment').length;
    info.colors = { key: getComputedStyle(key).color, value: getComputedStyle(value).color, comment: getComputedStyle(comment).color, bg };
    info.mono = /JetBrains Mono|monospace/.test(getComputedStyle(fm.querySelector('pre')).fontFamily);
    info.atTop = isVisual ? first.contains(fm) && first.firstElementChild === fm : first === fm;
  }
  return info;
}

async function testFrontMatter(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  const sampleYaml = /^---\r?\n([\s\S]*?)\r?\n---/.exec(fs.readFileSync(SAMPLE, 'utf8'))[1].replace(/\r/g, '');

  // TC-FM-001 起動直後は OFF で、フロントマターが本文に現れない
  const off = await page.evaluate(inspectFrontMatter, false);
  record('TC-FM-001', off.pressed === 'false' && !off.present && !off.leakedYaml && !off.hrBeforeH1 && off.h1 === 'Lucivo サンプル文書', JSON.stringify(off));

  // TC-FM-002 ON にすると、本文モードごとに書いたとおりの YAML が色分けされて本文の前に表示される
  await page.click('#btn-front-matter');
  await waitRendered(page);
  const rows = [];
  for (const mode of MD_MODES) {
    await setMode(page, mode);
    const isVisual = mode.style !== 'std';
    const r = await page.evaluate(inspectFrontMatter, isVisual);
    const c = r.colors || {};
    const ok = r.pressed === 'true' && r.present && r.text === sampleYaml && r.label === 'Front Matter' && r.mono && r.atTop
      && r.keys >= 6 && r.comments === 1 && c.key !== c.value && c.key !== c.bg && c.value !== c.bg && c.comment !== c.bg;
    rows.push({ tag: `${mode.style}-${mode.appearance}`, ok, keys: r.keys, comments: r.comments, colors: c, atTop: r.atTop, textMatches: r.text === sampleYaml });
    const box = await page.$(`${isVisual ? '#visual-stage-container' : '#standard-doc-container'} .front-matter`);
    if (box) await box.screenshot({ path: path.join(SHOT_DIR, `fm-${mode.style}-${mode.appearance}.png`) });
  }
  record('TC-FM-002', rows.every(r => r.ok), JSON.stringify(rows));

  // TC-FM-003 Visual Stage で OFF にでき、通常モードに戻っても OFF のまま
  await page.click('#btn-front-matter');
  await waitRendered(page);
  const visOff = await page.evaluate(inspectFrontMatter, true);
  await setMode(page, { style: 'std', appearance: 'light' });
  const stdOff = await page.evaluate(inspectFrontMatter, false);
  record('TC-FM-003', !visOff.present && visOff.pressed === 'false' && !stdOff.present && stdOff.pressed === 'false', JSON.stringify({ visOff, stdOff }));

  // TC-FM-004 フロントマターでない --- は水平線のまま。ON でも枠は出ない
  await page.click('#btn-front-matter');
  const notFm = await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    const root = document.getElementById('standard-doc-container');
    const results = {};
    ed.value = '---\n\n# 見出し\n\n本文';
    renderApp();
    results.unclosed = { fm: !!root.querySelector('.front-matter'), hr: root.querySelectorAll('hr').length };
    ed.value = '# 見出し\n\n---\n\ntitle: x\n\n---\n';
    renderApp();
    results.middle = { fm: !!root.querySelector('.front-matter'), hr: root.querySelectorAll('hr').length };
    ed.value = '---\n---\n# 見出し';
    renderApp();
    results.empty = { fm: !!root.querySelector('.front-matter'), h1: !!root.querySelector('h1'), hr: root.querySelectorAll('hr').length };
    return results;
  });
  record('TC-FM-004', !notFm.unclosed.fm && notFm.unclosed.hr === 1 && !notFm.middle.fm && notFm.middle.hr === 2 && notFm.empty.fm && notFm.empty.h1 && notFm.empty.hr === 0,
    JSON.stringify(notFm));

  // TC-FM-005 フロントマターの中の HTML は文字として表示され、実行されない
  const safe = await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = '---\ntitle: <img src=x onerror="window.__fmxss=1">\n# <script>window.__fmxss=2</script>\n---\n本文';
    renderApp();
    const fm = document.querySelector('#standard-doc-container .front-matter');
    return { fm: !!fm, imgs: fm ? fm.querySelectorAll('img, script').length : -1, shown: fm ? /<img src=x/.test(fm.textContent) : false, xss: !!window.__fmxss };
  });
  await page.waitForTimeout(200);
  const xssAfter = await page.evaluate(() => !!window.__fmxss);
  record('TC-FM-005', safe.fm && safe.imgs === 0 && safe.shown && !safe.xss && !xssAfter, JSON.stringify({ ...safe, xssAfter }));
  if (page.consoleErrors.length) record('TC-FM-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// 記述パターン別の雛形（FR-016）: 章ごとの雛形を調べる。ページ内で実行する。
// 章の名前は h2 の文字から「STAGE nn」と「n. 」を除いたもの。最初の h2 より前は「(冒頭)」
function inspectSlabTemplates() {
  const root = document.getElementById('visual-stage-container');
  return Array.from(root.querySelectorAll('.exhibition-slab')).map(s => {
    const h2 = s.querySelector('h2');
    return {
      title: h2 ? h2.textContent.replace(/^STAGE \d+/, '') : '(冒頭)',
      tpl: Array.from(s.classList).filter(c => c.startsWith('vs-tpl-')).map(c => c.slice(7)),
      vertical: !!s.querySelector('.vs-steps.is-vertical'),
      empty: s.children.length === 0
    };
  });
}

// 章ごとの文字とリンク・装飾の数（TC-VTPL-003）。高速モードは h2 で区切って同じ形にまとめる
function inspectSlabContent(isVisual) {
  const norm = t => t.replace(/[\s:：]/g, '');
  const tags = ['a', 'code', 'strong', 'em', 'del'];
  const summarize = (title, nodes) => {
    const box = document.createElement('div');
    nodes.forEach(n => box.appendChild(n.cloneNode(true)));
    box.querySelectorAll('h2, .front-matter').forEach(el => el.remove());
    return { title, text: norm(box.textContent), counts: tags.map(t => box.querySelectorAll(t).length).join(',') };
  };
  const out = [];
  if (isVisual) {
    document.querySelectorAll('#visual-stage-container .exhibition-slab').forEach(s => {
      const h2 = s.querySelector('h2');
      out.push(summarize(h2 ? h2.textContent.replace(/^STAGE \d+/, '') : '(冒頭)', [s]));
    });
  } else {
    let title = '(冒頭)', nodes = [];
    Array.from(document.getElementById('standard-doc-container').children).forEach(el => {
      if (el.tagName === 'H1') return;
      if (el.tagName === 'H2') {
        if (nodes.length) out.push(summarize(title, nodes));
        title = el.textContent.replace(/^\d+\.\s*/, '');
        nodes = [];
      } else {
        nodes.push(el);
      }
    });
    if (nodes.length) out.push(summarize(title, nodes));
  }
  return out;
}

// 雛形の割り付け・配色・視認性を調べる（TC-VTPL-004〜008）。ページ内で実行する
function inspectTemplateLayout() {
  const root = document.getElementById('visual-stage-container');
  const cs = (el, pseudo) => getComputedStyle(el, pseudo || null);
  const slab = title => Array.from(root.querySelectorAll('.exhibition-slab')).find(s => {
    const h2 = s.querySelector('h2');
    return title === '(冒頭)' ? !h2 : h2 && h2.textContent.replace(/^STAGE \d+/, '') === title;
  });
  // rgb() / rgba() / color(srgb …) を [r, g, b, a]（0〜255, 0〜1）にする
  const parse = c => {
    let m = /rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/.exec(c);
    if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
    m = /color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/.exec(c);
    if (m) return [m[1] * 255, m[2] * 255, m[3] * 255, m[4] === undefined ? 1 : +m[4]];
    return null;
  };
  const over = (top, under) => top && under ? [0, 1, 2].map(i => top[i] * top[3] + under[i] * (1 - top[3])).concat(1) : null;
  const lum = c => {
    const [r, g, b] = c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => a && b ? +((Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)).toFixed(2) : 0;
  const same = (a, b) => a && b && a.slice(0, 3).every((v, i) => Math.abs(v - b[i]) < 2);
  const rows = items => {
    const tops = [];
    items.forEach(el => {
      const t = Math.round(el.getBoundingClientRect().top);
      const row = tops.find(r => Math.abs(r.top - t) < 4);
      if (row) row.n++; else tops.push({ top: t, n: 1 });
    });
    return tops.map(r => r.n);
  };

  const wrap = root.querySelector('.exhibition-wrap');
  const slabBg = s => parse(cs(s).backgroundColor);
  const s26 = slab('要点のカード'), s02 = slab('文字の装飾'), s27 = slab('手順'), s28 = slab('ステートメント'), lead = slab('(冒頭)');
  const cards = s26 ? Array.from(s26.querySelectorAll('.vs-points > li')) : [];
  const steps = s27 ? Array.from(s27.querySelectorAll('.vs-steps > li')) : [];
  const bq = s28 && s28.querySelector('blockquote.vs-quote');
  const cite = bq && bq.querySelector('.vs-quote-cite');
  const leadBox = lead && lead.querySelector('.vs-lead');
  const bodyP = root.querySelector('.vs-tpl-standard h4 ~ p');
  const cardBg = li => over(parse(cs(li).backgroundColor), slabBg(li.closest('.exhibition-slab')));
  return {
    points: {
      rows26: rows(cards),
      rows02: s02 ? rows(Array.from(s02.querySelectorAll('.vs-points > li'))) : [],
      titles: cards.map(li => (li.querySelector('.vs-point-title') || {}).textContent || null),
      colonFree: cards.every(li => !/^[\s:：]/.test(li.textContent.replace((li.querySelector('.vs-point-title') || {}).textContent || '', ''))),
      bands: cards.map(li => cs(li, '::after').backgroundColor)
    },
    steps: {
      tops: steps.map(li => Math.round(li.getBoundingClientRect().top)),
      lefts: steps.map(li => Math.round(li.getBoundingClientRect().left)),
      fills: steps.map(li => cs(li, '::before').backgroundColor),
      line: s27 ? { w: parseFloat(cs(s27.querySelector('.vs-steps'), '::before').width), h: parseFloat(cs(s27.querySelector('.vs-steps'), '::before').height) } : null
    },
    quote: bq && {
      borderLeft: parseFloat(cs(bq).borderLeftWidth),
      align: cs(bq).textAlign,
      size: parseFloat(cs(bq).fontSize),
      body: parseFloat(cs(bodyP).fontSize),
      mark: cs(bq, '::before').content,
      citeSmaller: !!cite && parseFloat(cs(cite).fontSize) < parseFloat(cs(bq.querySelector('p')).fontSize)
    },
    lead: leadBox && { size: parseFloat(cs(leadBox).fontSize), body: parseFloat(cs(bodyP).fontSize), bar: cs(leadBox, '::before').width },
    colors: {
      vars: [1, 2, 3, 4].map(i => cs(wrap).getPropertyValue(`--vs-c${i}`).trim().toUpperCase()),
      badge: parse(cs(root.querySelector('.exhibition-num-badge')).backgroundColor),
      bar: Array.from(root.querySelectorAll('.four-color-bar span')).map(sp => parse(cs(sp).backgroundColor)),
      firstBand: cards[0] ? parse(cs(cards[0], '::after').backgroundColor) : null
    },
    legibility: cards.length && steps.length && bq && leadBox ? {
      cardNum: cards.map(li => contrast(over(parse(cs(li, '::before').color), cardBg(li)), cardBg(li))),
      stepNum: steps.map(li => contrast(parse(cs(li, '::before').color), parse(cs(li, '::before').backgroundColor))),
      cite: cite ? contrast(parse(cs(cite).color), slabBg(s28)) : 0,
      leadText: contrast(parse(cs(leadBox).color), slabBg(lead)),
      cardTitle: cards.map(li => { const t = li.querySelector('.vs-point-title'); return t ? contrast(parse(cs(t).color), cardBg(li)) : 0; }),
      quoteText: contrast(parse(cs(bq).color), slabBg(s28)),
      cardBgDiffers: !same(cardBg(cards[0]), slabBg(s26)),
      lineDiffers: !same(over(parse(cs(s27.querySelector('.vs-steps'), '::before').backgroundColor), slabBg(s27)), slabBg(s27))
    } : null
  };
}

// 判定の境界を確かめる文書（TC-VTPL-002）。h1 の直後に h2 を続け、空のスラブが出ないことも確かめる
function buildBoundaryMarkdown() {
  const ja = n => 'あ'.repeat(n);
  const list = (n, mark) => Array.from({ length: n }, (_, i) => `${mark === 'ol' ? `${i + 1}.` : '-'} 項目${i + 1}`).join('\n');
  return [
    '# 判定の境界',
    `## L160\n\n${ja(160)}`,
    `## L161\n\n${ja(161)}`,
    `## P3\n\n${ja(10)}\n\n${ja(10)}\n\n${ja(10)}`,
    `## U1\n\n${list(1)}`,
    `## U6\n\n${list(6)}`,
    `## U7\n\n${list(7)}`,
    '## UNEST\n\n- 項目\n  - 入れ子\n- 項目',
    '## UTASK\n\n- [x] 完了\n- [ ] 未完了',
    `## U101\n\n- ${ja(101)}\n- 項目`,
    `## O8\n\n${list(8, 'ol')}`,
    `## O9\n\n${list(9, 'ol')}`,
    '## Q3\n\n> 一\n>\n> 二\n>\n> 三',
    '## Q4\n\n> 一\n>\n> 二\n>\n> 三\n>\n> 四',
    `## Q241\n\n> ${ja(241)}`,
    `## P2U\n\n段落\n\n段落\n\n${list(2)}`,
    '## H3\n\n### 小見出し\n\n段落'
  ].join('\n\n');
}

const VTPL_COLORS = {
  shapes: ['#E29578', '#EBB453', '#6CC4C9', '#9CCB86'],
  cards: ['#E29578', '#E6B34B', '#A3B4E4', '#6DB1B4'],
  circles: ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763'],
  editorial: ['#D68C8C', '#8FA876', '#C9A66B', '#8FA3B8']
};

async function testVisualTemplates(browser) {
  const page = await openApp(browser);
  await waitRendered(page);
  await loadSample(page);
  // 読み込み後もファイルメニューが開いたままで、スタイルバーのクリックを遮るため閉じる
  await page.keyboard.press('Escape');

  // TC-VTPL-009 高速モードには雛形のクラスがない
  const stdVs = await page.evaluate(() => Array.from(document.querySelectorAll('#standard-doc-container *'))
    .filter(el => Array.from(el.classList).some(c => c.startsWith('vs-'))).length);
  record('TC-VTPL-009', stdVs === 0, `vs- クラス ${stdVs} 個`);
  const stdContent = await page.evaluate(inspectSlabContent, false);

  await setMode(page, { style: 'shapes', appearance: 'light' });

  // TC-VTPL-001 サンプルの雛形の判定
  const expected = { '(冒頭)': 'lead', '文字の装飾': 'points', '要点のカード': 'points', '手順': 'steps', 'ステートメント': 'quote',
    'フローチャート': 'split', '状態遷移図': 'split', '大きなフローチャート': 'split', '大きな状態遷移図': 'split' };
  const sampleTpl = await page.evaluate(inspectSlabTemplates);
  const tplWrong = sampleTpl.filter(s => s.tpl.length !== 1 || s.tpl[0] !== (expected[s.title] || 'standard'));
  record('TC-VTPL-001', sampleTpl.length >= 29 && tplWrong.length === 0, tplWrong.length ? JSON.stringify(tplWrong) : `${sampleTpl.length} 章`);

  // TC-VTPL-003 内容の保持（雛形のある章）
  const visContent = await page.evaluate(inspectSlabContent, true);
  const contentRows = ['(冒頭)', '文字の装飾', '要点のカード', '手順', 'ステートメント'].map(title => {
    const a = stdContent.find(r => r.title === title), b = visContent.find(r => r.title === title);
    return { title, ok: !!(a && b && a.text === b.text && a.counts === b.counts), std: a && a.counts, vis: b && b.counts };
  });
  record('TC-VTPL-003', contentRows.every(r => r.ok), JSON.stringify(contentRows));

  // TC-VTPL-010 Visualモードの再描画で計算後のスタイルを調べない
  const timing = await page.evaluate(() => {
    let computed = 0;
    const orig = window.getComputedStyle;
    window.getComputedStyle = function (...args) { computed++; return orig.apply(this, args); };
    const t0 = performance.now();
    renderApp();
    const ms = performance.now() - t0;
    window.getComputedStyle = orig;
    return { getComputedStyleCalls: computed, renderMs: +ms.toFixed(1) };
  });
  record('TC-VTPL-010', timing.getComputedStyleCalls === 0, JSON.stringify(timing));
  await waitRendered(page);

  // TC-VTPL-004〜006 の割り付け（Split と Canvas）
  const split = await page.evaluate(inspectTemplateLayout);
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(300);
  const canvas = await page.evaluate(inspectTemplateLayout);
  await page.setViewportSize({ width: 480, height: 16000 });
  await page.waitForTimeout(300);
  const narrow = await page.evaluate(inspectTemplateLayout);
  await page.setViewportSize({ width: 1300, height: 16000 });
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(300);

  const allOnes = r => r.length > 0 && r.every(n => n === 1);
  const distinctNeighbors = list => list.length > 1 && list.every((c, i) => i === 0 || c !== list[i - 1]);
  const p = canvas.points;
  const pointsOk = JSON.stringify(canvas.points.rows26) === '[3]' && JSON.stringify(split.points.rows26) === '[3]'
    && JSON.stringify(canvas.points.rows02) === '[4]' && JSON.stringify(split.points.rows02) === '[2,2]'
    && allOnes(narrow.points.rows26) && narrow.points.rows26.length === 3 && allOnes(narrow.points.rows02) && narrow.points.rows02.length === 4
    && p.titles.every(Boolean) && p.colonFree && distinctNeighbors(p.bands);
  record('TC-VTPL-004', pointsOk, JSON.stringify({ split: split.points, canvas: canvas.points, narrow: { rows26: narrow.points.rows26, rows02: narrow.points.rows02 } }));

  const s = canvas.steps, n = narrow.steps;
  const horizontal = s.tops.length === 4 && s.tops.every(t => t === s.tops[0]) && s.lefts.every((l, i) => i === 0 || l > s.lefts[i - 1]) && s.line && s.line.w > 100 && s.line.h === 2;
  const vertical = n.lefts.length === 4 && n.lefts.every(l => l === n.lefts[0]) && n.tops.every((t, i) => i === 0 || t > n.tops[i - 1]) && n.line && n.line.w === 2;
  record('TC-VTPL-005', horizontal && vertical && distinctNeighbors(s.fills), JSON.stringify({ canvas: s, narrow: n }));

  const q = canvas.quote, l = canvas.lead;
  record('TC-VTPL-006', !!(q && l) && q.borderLeft === 0 && q.align === 'center' && q.size > q.body && /“/.test(q.mark) && q.citeSmaller
    && l.size > l.body && l.bar === '4px', JSON.stringify({ quote: q, lead: l }));

  // TC-VTPL-012 ベクター装飾素材の描画確認（FR-017, DD-VTPL-014, DD-VTPL-024）
  const motifs = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const cs = (el, p) => getComputedStyle(el, p || null);
    const maskOf = (el, p) => {
      const s = cs(el, p);
      return (s.maskImage && s.maskImage !== 'none' ? s.maskImage : s.webkitMaskImage) || '';
    };
    const isOpaque = c => !!c && c !== 'transparent' && !/rgba\(.*,\s*0\)$/.test(c);
    const slab = title => Array.from(root.querySelectorAll('.exhibition-slab')).find(s => {
      const h2 = s.querySelector('h2');
      return h2 && h2.textContent.replace(/^STAGE \d+/, '') === title;
    });
    const emblem = root.querySelector('.exhibition-hero-emblem');
    const eb = emblem ? emblem.getBoundingClientRect() : { width: 0, height: 0 };
    const leadEl = root.querySelector('.vs-lead');
    const s26 = slab('要点のカード'), s27 = slab('手順'), s28 = slab('ステートメント');
    const ornaments = s26 ? Array.from(s26.querySelectorAll('.vs-points > li > .vs-card-ornament')) : [];
    const stepItems = s27 ? Array.from(s27.querySelectorAll('.vs-steps > li')) : [];
    const chevrons = s27 ? Array.from(s27.querySelectorAll('.vs-steps > li > .vs-step-chevron')) : [];
    const bq = s28 && s28.querySelector('blockquote.vs-quote');
    return {
      emblem: {
        mask: /hero-prism\.svg/.test(maskOf(emblem)),
        size: eb.width >= 20 && eb.height >= 20,
        bg: cs(emblem).backgroundImage !== 'none'
      },
      leadSpark: leadEl ? {
        mask: /flow-spark\.svg/.test(maskOf(leadEl, '::after')),
        bg: isOpaque(cs(leadEl, '::after').backgroundColor)
      } : null,
      ornaments: {
        count: ornaments.length,
        mask: ornaments.every(el => /card-corner-ornament\.svg/.test(maskOf(el))),
        size: ornaments.every(el => { const r = el.getBoundingClientRect(); return r.width >= 20 && r.height >= 20; }),
        bg: ornaments.every(el => isOpaque(cs(el).backgroundColor))
      },
      chevrons: {
        firstHasNone: stepItems.length === 4 && !stepItems[0].querySelector('.vs-step-chevron'),
        count: chevrons.length,
        mask: chevrons.every(el => /step-arrow\.svg/.test(maskOf(el))),
        size: chevrons.every(el => { const r = el.getBoundingClientRect(); return r.width >= 12 && r.height >= 12; }),
        bg: chevrons.every(el => isOpaque(cs(el).backgroundColor))
      },
      quote: bq ? {
        mask: /quote-watermark\.svg/.test(maskOf(bq, '::before')),
        bg: isOpaque(cs(bq, '::before').backgroundColor)
      } : null
    };
  });
  const motifsOk = motifs.emblem.mask && motifs.emblem.size && motifs.emblem.bg
    && !!(motifs.leadSpark && motifs.leadSpark.mask && motifs.leadSpark.bg)
    && motifs.ornaments.count === 3 && motifs.ornaments.mask && motifs.ornaments.size && motifs.ornaments.bg
    && motifs.chevrons.firstHasNone && motifs.chevrons.count === 3 && motifs.chevrons.mask && motifs.chevrons.size && motifs.chevrons.bg
    && !!(motifs.quote && motifs.quote.mask && motifs.quote.bg);
  record('TC-VTPL-012', motifsOk, JSON.stringify(motifs));

  // TC-VTPL-013 動的ステージ演出（スポットライト・ステージ集中）の動作確認（FR-017, DD-VTPL-015, DD-VTPL-025）
  const s26Loc = page.locator('#visual-stage-container .vs-tpl-points').last();
  await s26Loc.locator('.vs-points > li:nth-child(1)').click();
  await page.waitForTimeout(300);
  await s26Loc.screenshot({ path: path.join(SHOT_DIR, 'vtpl-spotlight-points.png') });
  const ptSpot = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .vs-tpl-points');
    const ul = slabs[slabs.length - 1].querySelector('.vs-points');
    const items = Array.from(ul.children);
    return {
      hasSpot: ul.classList.contains('has-spotlight'),
      firstSpot: items[0].classList.contains('is-spotlight'),
      secondDim: parseFloat(getComputedStyle(items[1]).opacity) < 0.7
    };
  });
  await s26Loc.locator('.vs-points > li:nth-child(1)').click();
  const ptCleared = await page.evaluate(() => !document.querySelector('#visual-stage-container .vs-points.has-spotlight'));

  await page.click('#visual-stage-container .vs-tpl-steps .vs-steps > li:nth-child(3)');
  await page.waitForTimeout(300);
  const s27Slab = await page.$('#visual-stage-container .vs-tpl-steps');
  if (s27Slab) await s27Slab.screenshot({ path: path.join(SHOT_DIR, 'vtpl-spotlight-steps.png') });
  const stSpot = await page.evaluate(() => {
    const ol = document.querySelector('#visual-stage-container .vs-tpl-steps .vs-steps');
    const items = Array.from(ol.children);
    return {
      hasSpot: ol.classList.contains('has-spotlight'),
      reached: items.map(li => li.classList.contains('is-reached')),
      spotIdx: items.findIndex(li => li.classList.contains('is-spotlight')),
      fourthDim: parseFloat(getComputedStyle(items[3]).opacity) < 0.7
    };
  });

  await s26Loc.locator('.exhibition-num-badge').click();
  // 減光は opacity の 0.28 秒のトランジション。光の描画で忙しいとトランジションの開始が遅れるため、
  // 一定時間後の値ではなく、落ち着くのを待ってから調べる（最大 3 秒）
  await page.waitForFunction(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .vs-tpl-points');
    const other = slabs[slabs.length - 1].previousElementSibling;
    return parseFloat(getComputedStyle(other).opacity) < 0.7;
  }, null, { timeout: 3000 }).catch(() => {});
  const stageSpot = await page.evaluate(() => {
    const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
    const slabs = document.querySelectorAll('#visual-stage-container .vs-tpl-points');
    const target = slabs[slabs.length - 1];
    const other = target.previousElementSibling;
    return {
      wrapFocus: wrap.classList.contains('has-stage-focus'),
      slabFocus: target.classList.contains('is-stage-focused'),
      otherDim: parseFloat(getComputedStyle(other).opacity) < 0.7
    };
  });

  await page.keyboard.press('Escape');
  const allCleared = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .has-spotlight, #visual-stage-container .is-spotlight, #visual-stage-container .is-reached, #visual-stage-container .has-stage-focus, #visual-stage-container .is-stage-focused').length === 0);
  const spotOk = ptSpot.hasSpot && ptSpot.firstSpot && ptSpot.secondDim && ptCleared
    && stSpot.hasSpot && JSON.stringify(stSpot.reached) === '[true,true,true,false]' && stSpot.spotIdx === 2 && stSpot.fourthDim
    && stageSpot.wrapFocus && stageSpot.slabFocus && stageSpot.otherDim && allCleared;
  record('TC-VTPL-013', spotOk, JSON.stringify({ ptSpot, ptCleared, stSpot, stageSpot, allCleared }));

  // TC-VTPL-007・008・011 スタイル別の配色、視認性、画像
  const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const near = (a, hex) => !!a && hexRgb(hex).every((v, i) => Math.abs(v - a[i]) < 2);
  const colorRows = [], legRows = [];
  for (const appearance of ['light', 'dark']) {
    for (const style of VISUAL_STYLES) {
      await setMode(page, { style, appearance });
      const r = await page.evaluate(inspectTemplateLayout);
      const want = VTPL_COLORS[style];
      if (appearance === 'light') {
        const c = r.colors;
        colorRows.push({ style, ok: c.vars.join() === want.join() && near(c.badge, want[0]) && c.bar.length === 4 && c.bar.every((b, i) => near(b, want[i])) && near(c.firstBand, want[0]), vars: c.vars });
      }
      const g = r.legibility;
      const ok = !!g && g.cardNum.every(v => v >= 3) && g.stepNum.every(v => v >= 3) && g.cite >= 3 && g.leadText >= 4.5
        && g.cardTitle.every(v => v >= 4.5) && g.quoteText >= 4.5 && g.cardBgDiffers && g.lineDiffers;
      legRows.push({ tag: `${style}-${appearance}`, ok, ...g });
      const shots = { lead: '(冒頭)', s02: '文字の装飾', s26: '要点のカード', s27: '手順', s28: 'ステートメント' };
      for (const [key, title] of Object.entries(shots)) {
        const handle = await page.evaluateHandle(t => Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab')).find(sl => {
          const h2 = sl.querySelector('h2');
          return t === '(冒頭)' ? !h2 : h2 && h2.textContent.replace(/^STAGE \d+/, '') === t;
        }), title);
        const el = handle.asElement();
        if (el) await el.screenshot({ path: path.join(SHOT_DIR, `vtpl-${style}-${appearance}-${key}.png`) });
      }
    }
  }
  record('TC-VTPL-007', colorRows.length === 4 && colorRows.every(r => r.ok), JSON.stringify(colorRows));
  const legFailed = legRows.filter(r => !r.ok);
  record('TC-VTPL-008', legRows.length === 8 && legFailed.length === 0, JSON.stringify(legFailed.length ? legFailed : legRows.map(r => ({ tag: r.tag, cardNum: r.cardNum, stepNum: r.stepNum, cite: r.cite }))));

  // TC-VTPL-002 判定の境界（スタイル・外観は最後のまま）
  await page.evaluate(md => {
    document.getElementById('markdown-editor').value = md;
    lastLoadedMarkdown = md;
    renderApp();
  }, buildBoundaryMarkdown());
  await waitRendered(page);
  const bTpl = await page.evaluate(inspectSlabTemplates);
  const bExpected = { L160: 'lead', L161: 'standard', P3: 'standard', U1: 'standard', U6: 'points', U7: 'standard', UNEST: 'standard', UTASK: 'standard',
    U101: 'standard', O8: 'steps', O9: 'standard', Q3: 'quote', Q4: 'standard', Q241: 'standard', P2U: 'standard', H3: 'standard' };
  const bWrong = bTpl.filter(r => r.tpl.length !== 1 || r.tpl[0] !== bExpected[r.title] || r.empty);
  const o8 = bTpl.find(r => r.title === 'O8');
  record('TC-VTPL-002', bTpl.length === Object.keys(bExpected).length && bWrong.length === 0 && !!o8 && o8.vertical,
    bWrong.length ? JSON.stringify(bWrong) : `${bTpl.length} 章`);

  // TC-VTPL-014 samples/visual-sample.md の検証（FR-015, FR-016）。光の演出は TC-LIGHT で確かめる
  const vtplMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setMode(page, { style: 'std', appearance: 'light' });
  await page.evaluate(md => {
    document.getElementById('markdown-editor').value = md;
    lastLoadedMarkdown = md;
    renderApp();
  }, vtplMd);
  await waitRendered(page);

  await setMode(page, { style: 'shapes', appearance: 'light' });
  const showcase = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const slabs = Array.from(root.querySelectorAll('.exhibition-slab'));
    const tpls = slabs.map(s => Array.from(s.classList).filter(c => c.startsWith('vs-tpl-')).map(c => c.slice(7))[0]);
    const splitStd = slabs[9];
    const splitWide = slabs[10];
    const wrap = root.querySelector('.exhibition-wrap');
    const slab12 = slabs[12];
    const tableWrap = slab12 ? slab12.querySelector('.table-container') : null;
    const tableEl = slab12 ? slab12.querySelector('table') : null;
    const tableContained = !!(slab12 && tableWrap && tableEl
      && tableWrap.getBoundingClientRect().right <= slab12.getBoundingClientRect().right + 1);
    return {
      slabCount: slabs.length,
      tpls,
      split9Stacked: splitStd ? splitStd.classList.contains('is-stacked') : true,
      split10Stacked: splitWide ? splitWide.classList.contains('is-stacked') : false,
      split10Contained: splitWide && wrap ? splitWide.getBoundingClientRect().width <= wrap.getBoundingClientRect().width + 1 : false,
      tableContained
    };
  });
  // STAGE 10（横に広い図）で Fit より 1:1（実寸）の方が大きく表示されること
  const wideFitWidth = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="1"] > svg');
    return svg ? svg.getBoundingClientRect().width : 0;
  });
  await page.click('#visual-stage-container [data-action="scale-actual"][data-index="1"]');
  const wideActual = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="1"] > svg');
    return svg ? { width: svg.getBoundingClientRect().width, vb: svg.viewBox.baseVal.width } : { width: 0, vb: 0 };
  });
  await page.click('#visual-stage-container [data-action="scale-fit"][data-index="1"]');
  const scaleWideOk = wideActual.width > wideFitWidth + 10 && Math.abs(wideActual.width - wideActual.vb) <= 2;

  // Canvas 表示（全幅プレビュー）で STAGE 12 の 7 列テーブルが横スクロールなしでスラブ内に 100% 収まることも確認する
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(300);
  const canvasTableFits = await page.evaluate(() => {
    const slab12 = document.querySelectorAll('#visual-stage-container .exhibition-slab')[12];
    const tableWrap = slab12 ? slab12.querySelector('.table-container') : null;
    const tableEl = slab12 ? slab12.querySelector('table') : null;
    return !!(slab12 && tableWrap && tableEl
      && tableWrap.scrollWidth <= tableWrap.clientWidth + 1
      && tableEl.getBoundingClientRect().right <= slab12.getBoundingClientRect().right + 1);
  });
  await page.locator('#visual-stage-container .exhibition-slab').nth(12).screenshot({ path: path.join(SHOT_DIR, 'vtpl-showcase-wide-table.png') });
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(300);

  const showcaseExpectedTpls = ['lead', 'lead', 'standard', 'points', 'points', 'standard', 'steps', 'steps', 'quote', 'split', 'split', 'standard', 'standard', 'standard'];
  const showcaseOk = showcase.slabCount === 14
    && JSON.stringify(showcase.tpls) === JSON.stringify(showcaseExpectedTpls)
    && !showcase.split9Stacked
    && showcase.split10Stacked
    && showcase.split10Contained
    && showcase.tableContained
    && canvasTableFits
    && scaleWideOk;
  record('TC-VTPL-014', showcaseOk, JSON.stringify({ wideFitWidth, wideActual, canvasTableFits, ...showcase }));

  const showcaseShots = [
    [6, 'vtpl-showcase-steps-flow.png'],
    [9, 'vtpl-showcase-split-flow.png'],
    [10, 'vtpl-showcase-wide-diagram.png'],
    [11, 'vtpl-showcase-tall-diagrams.png']
  ];
  for (const [idx, fname] of showcaseShots) {
    const loc = page.locator('#visual-stage-container .exhibition-slab').nth(idx);
    await loc.screenshot({ path: path.join(SHOT_DIR, fname) });
  }

  if (page.consoleErrors.length) record('TC-VTPL-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

// TC-VTPL-015, 016: Visualモードの表紙と誌面の表（FR-020, FR-021）
const coverChapters = n => Array.from({ length: n }, (_, i) => `## ${i + 1}. 章 ${i + 1}\n\n本文 ${i + 1}。\n`).join('\n');
const COVER_MD = [
  '---',
  'title: 表紙の題名',
  'description: 表紙のリード文 <img src=x onerror="window.__cxss=1">',
  'tags:',
  '  - Alpha',
  '  - "Beta"',
  '  - Gamma',
  '  - Delta',
  '  - Epsilon',
  'author:',
  '  title: 入れ子のキーは読まない',
  '---',
  '',
  coverChapters(4)
].join('\n');
const TABLE_RULE_MD = [
  '## 1. 列の判定',
  '',
  '| 名前 | 数値 | 揃え指定 | 混在 | ラベル |',
  '| ---- | ---- | :------: | ---- | ------ |',
  '| A    | 12   | 3        | 12   | 短い語 |',
  '| B    | 1,200 ms | 4    | abc  | 語     |',
  '| C    | —    | 5        | 7    | 長い説明の文章が入るセル |',
  ''
].join('\n');

async function testCoverAndTables(browser) {
  const page = await openStagePage(browser);
  await page.click('.info-style-btn[data-info-style="shapes"]');
  await waitRendered(page);

  // TC-VTPL-015 表紙（フロントマターの題名・リード文・タグと目次）
  await setDocument(page, COVER_MD);
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(300);
  const cover = await page.evaluate(() => {
    const hero = document.querySelector('#visual-stage-container .exhibition-hero');
    const items = Array.from(hero.querySelectorAll('.vs-cover-agenda-item'));
    const rect = el => el.getBoundingClientRect();
    const h2 = document.querySelector('#visual-stage-container .exhibition-slab h2');
    return {
      title: hero.querySelector('h1').textContent.trim(),
      eyebrow: (hero.querySelector('.vs-cover-eyebrow') || {}).textContent,
      deck: (hero.querySelector('.vs-cover-deck') || {}).textContent,
      imgs: hero.querySelectorAll('img').length,
      xss: !!window.__cxss,
      agenda: items.map(b => [b.querySelector('.vs-cover-agenda-no').textContent, b.querySelector('.vs-cover-agenda-title').textContent]),
      // 4 項目は 2 列 × 2 行。列の上から下へ読む（1 の下に 2、1 の右に 3）
      columnMajor: items.length === 4 && Math.abs(rect(items[1]).left - rect(items[0]).left) < 2 && rect(items[1]).top > rect(items[0]).top
        && rect(items[2]).left > rect(items[0]).right && Math.abs(rect(items[2]).top - rect(items[0]).top) < 2,
      titleRatio: +(parseFloat(getComputedStyle(hero.querySelector('h1')).fontSize) / parseFloat(getComputedStyle(h2).fontSize)).toFixed(2)
    };
  });
  // 目次の 3 番目を押すと 3 章の先頭までスクロールする
  await page.click('#visual-stage-container .vs-cover-agenda-item[data-stage-target="03"]');
  await page.waitForTimeout(1200);
  const jump = await page.evaluate(() => {
    const slab = document.querySelector('#visual-stage-container .exhibition-slab[data-stage-no="03"]');
    const scroller = document.getElementById('preview-scroll');
    // 短い文書では最下部までしかスクロールできないため、その場合は最下部に着いていればよい
    return {
      offset: Math.round(slab.getBoundingClientRect().top - scroller.getBoundingClientRect().top),
      scrolled: scroller.scrollTop > 0,
      atBottom: scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2
    };
  });
  // 発表の表紙では目次を出さない
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(600);
  const inShow = await page.evaluate(() => ({
    agenda: getComputedStyle(document.querySelector('.vs-cover-agenda')).display,
    deck: getComputedStyle(document.querySelector('.vs-cover-deck')).display
  }));
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.LucivoStage && !LucivoStage.showState().active);
  await waitRendered(page);
  // 章の数の境界（2 章・15 章・16 章）と、h1 がフロントマターの題名より優先されること
  const agendaCount = async md => {
    await setDocument(page, md);
    return page.evaluate(() => ({
      items: document.querySelectorAll('#visual-stage-container .vs-cover-agenda-item').length,
      title: (document.querySelector('#visual-stage-container .exhibition-hero h1') || {}).textContent
    }));
  };
  const c2 = await agendaCount(`---\ntitle: 題\n---\n\n${coverChapters(2)}`);
  const c15 = await agendaCount(`---\ntitle: 題\n---\n\n${coverChapters(15)}`);
  const c16 = await agendaCount(`---\ntitle: 題\n---\n\n# 本文の題名\n\n${coverChapters(16)}`);
  const coverOk = cover.title === '表紙の題名' && /Alpha.*Beta.*Gamma.*Delta/.test(cover.eyebrow || '') && !/Epsilon/.test(cover.eyebrow)
    && /<img src=x/.test(cover.deck || '') && cover.imgs === 0 && !cover.xss
    && JSON.stringify(cover.agenda) === JSON.stringify([['01', '章 1'], ['02', '章 2'], ['03', '章 3'], ['04', '章 4']])
    && cover.columnMajor && cover.titleRatio >= 1.3 && jump.scrolled && (Math.abs(jump.offset) <= 40 || jump.atBottom)
    && inShow.agenda === 'none' && inShow.deck !== 'none'
    && c2.items === 0 && c15.items === 15 && c16.items === 0 && c16.title.trim() === '本文の題名';
  record('TC-VTPL-015', coverOk, JSON.stringify({ cover, jump, inShow, c2, c15, c16 }));

  // TC-VTPL-016 誌面の表（罫線・数値の列・短いラベルの列）
  const vtplMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, vtplMd);
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(300);
  const tableRule = await page.evaluate(() => {
    const slab = document.querySelectorAll('#visual-stage-container .exhibition-slab')[12];
    const [wide, num] = slab.querySelectorAll('table');
    const cs = el => getComputedStyle(el);
    const probe = document.createElement('span');
    probe.style.color = getComputedStyle(slab.closest('.exhibition-wrap')).getPropertyValue('--vs-c1').trim();
    slab.appendChild(probe);
    const c1 = cs(probe).color;
    probe.remove();
    // 文字の行の数（Range の矩形の上端の種類）
    const lines = el => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return new Set(Array.from(range.getClientRects()).map(r => Math.round(r.top))).size;
    };
    const cells = Array.from(wide.querySelectorAll('th, td'));
    const col = (table, n) => Array.from(table.querySelectorAll(`tr > :nth-child(${n})`));
    return {
      minCellWidth: Math.round(Math.min(...cells.map(c => c.getBoundingClientRect().width))),
      noVertical: cells.every(c => parseFloat(cs(c).borderLeftWidth) === 0 && parseFloat(cs(c).borderRightWidth) === 0),
      headRule: [cs(wide.querySelector('th')).borderBottomWidth, cs(wide.querySelector('th')).borderBottomColor, c1],
      labelOneLine: col(wide, 2).slice(1).map(td => [td.classList.contains('vs-label'), lines(td)]),
      numCols: [1, 2, 3, 4, 5].map(n => col(num, n).every(c => c.classList.contains('vs-num'))),
      numAlign: col(num, 2).map(c => cs(c).textAlign),
      tabular: /tabular-nums/.test(cs(col(num, 3)[1]).fontVariantNumeric),
      firstColWeight: cs(col(num, 1)[1]).fontWeight
    };
  });
  await page.locator('#visual-stage-container .exhibition-slab').nth(12).screenshot({ path: path.join(SHOT_DIR, 'vtpl-editorial-table.png') });
  await setDocument(page, TABLE_RULE_MD);
  const rule = await page.evaluate(() => {
    const t = document.querySelector('#visual-stage-container table');
    const cls = n => Array.from(t.querySelectorAll(`tbody tr > :nth-child(${n})`)).map(c => [c.classList.contains('vs-num'), c.classList.contains('vs-label')]);
    return { name: cls(1), value: cls(2), aligned: cls(3), mixed: cls(4), label: cls(5) };
  });
  // 高速モードの表は変えない
  await page.click('#btn-mode-fast');
  await waitRendered(page);
  const fast = await page.evaluate(() => {
    const t = document.querySelector('#standard-doc-container table');
    return { marked: t.querySelectorAll('.vs-num, .vs-label').length, thFont: getComputedStyle(t.querySelector('th')).fontFamily, tdLeft: getComputedStyle(t.querySelector('td')).borderLeftWidth };
  });
  const all = (rows, i, v) => rows.every(r => r[i] === v);
  const tableOk = tableRule.minCellWidth >= 60 && tableRule.noVertical && tableRule.headRule[0] === '2px' && tableRule.headRule[1] === tableRule.headRule[2]
    && tableRule.labelOneLine.every(([label, n]) => label && n === 1)
    && JSON.stringify(tableRule.numCols) === JSON.stringify([false, true, true, true, true])
    && tableRule.numAlign.every(a => a === 'right') && tableRule.tabular && +tableRule.firstColWeight >= 600
    && all(rule.name, 0, false) && all(rule.value, 0, true) && all(rule.aligned, 0, false) && all(rule.mixed, 0, false)
    && all(rule.mixed, 1, true) && all(rule.label, 1, false)
    && fast.marked === 0 && /JetBrains Mono/.test(fast.thFont) && parseFloat(fast.tdLeft) >= 1;
  record('TC-VTPL-016', tableOk, JSON.stringify({ tableRule, rule, fast }));

  if (page.consoleErrors.length) record('TC-VTPL-CONSOLE2', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
}

// TC-LIGHT-001〜011, TC-SHOW-001〜010: シグナル・ライトとステージ発表（FR-018, FR-019）
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

// 図の順番 flowIndex の光の頭の位置（画面の座標から Canvas の画素へ換算）に、光が描かれているかを調べる
function inspectLightHead({ flowIndex, edgeIndex, t }) {
  const flow = LucivoStage.lightPlans()[flowIndex];
  const edge = flow.plan.edges[edgeIndex];
  const index = Math.round((t - edge.start) * edge.speed / (edge.length / edge.count));
  const m = flow.svg.getScreenCTM();
  const x = edge.points[index * 2];
  const y = edge.points[index * 2 + 1];
  const rect = flow.front.getBoundingClientRect();
  const scale = flow.front.width / rect.width;
  const px = Math.round((m.a * x + m.e - rect.left) * scale);
  const py = Math.round((m.d * y + m.f - rect.top) * scale);
  const pixels = flow.front.getContext('2d').getImageData(px - 2, py - 2, 5, 5).data;
  let alpha = 0;
  for (let i = 3; i < pixels.length; i += 4) alpha = Math.max(alpha, pixels[i]);
  return alpha;
}

function inspectLightPaint(flowIndex) {
  const flow = LucivoStage.lightPlans()[flowIndex];
  const painted = canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) count++;
    return count;
  };
  return { back: painted(flow.back), front: painted(flow.front) };
}

async function testSignalLight(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');

  // TC-LIGHT-007 高速モードでは舞台演出を読み込まない
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await setDocument(page, showcaseMd);
  const fast = await page.evaluate(() => ({
    loaded: typeof LucivoStage !== 'undefined',
    script: !!document.querySelector('script[src*="stage.js"]'),
    canvases: document.querySelectorAll('.signal-light-canvas').length
  }));
  record('TC-LIGHT-007', !fast.loaded && !fast.script && fast.canvases === 0, JSON.stringify(fast));

  await page.click('.info-style-btn[data-info-style="shapes"]');
  await waitRendered(page);
  await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.lightPlans().length >= 5);

  // TC-LIGHT-005 図が画面に入るまでは計算しない。入ると動き、外れると止まる
  await scrollToSlab(page, 9);
  await page.waitForFunction(() => LucivoStage.lightPlans()[0].plan);
  const visible = await page.evaluate(() => LucivoStage.lightPlans().map(f => ({ type: f.type, active: f.active, planned: !!f.plan })));

  // TC-LIGHT-001 光は根のノードから、結線をたどって下流へ伝わる
  const cascade = await page.evaluate(() => {
    const { plan } = LucivoStage.lightPlans()[0];
    const hit = e => e.start + e.length / e.speed;
    const wrong = plan.edges.filter(e => {
      const incoming = plan.edges.filter(i => i.to === e.from);
      if (e.from < 0) return true;
      if (!incoming.length) return Math.abs(e.start - plan.edges[0].start) > 0.001;
      return Math.abs(e.start - Math.min(...incoming.map(hit))) > 0.001;
    }).length;
    return { edges: plan.edges.length, wrong, unmatched: plan.edges.filter(e => e.to < 0).length, cycle: plan.cycle, pulses: plan.pulses.length };
  });
  record('TC-LIGHT-001', cascade.edges === 6 && cascade.wrong === 0 && cascade.unmatched === 0 && cascade.pulses >= 7, JSON.stringify(cascade));

  // TC-LIGHT-003 走っている間は 2 層に描かれ、余韻の間は何も描かない
  await seekLight(page, 1.0);
  const lit = await page.evaluate(inspectLightPaint, 0);
  const headAlpha = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await seekLight(page, cascade.cycle - 0.05);
  const dark = await page.evaluate(inspectLightPaint, 0);
  record('TC-LIGHT-003', lit.back > 200 && lit.front > 50 && headAlpha > 100 && dark.back === 0 && dark.front === 0, JSON.stringify({ lit, headAlpha, dark }));

  // TC-LIGHT-004 表示の倍率を変えても、光は線の上から外れない
  const aligned = {};
  await seekLight(page, 1.0);
  aligned.canvas = headAlpha;
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(500);
  aligned.split = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(400);
  await page.click('#visual-stage-container [data-action="scale-actual"][data-index="0"]');
  await page.waitForTimeout(400);
  aligned.actual = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.click('#visual-stage-container [data-action="scale-fit"][data-index="0"]');
  await page.waitForTimeout(300);
  await page.click('#visual-stage-container [data-action="zoom"][data-index="0"]');
  await page.waitForTimeout(400);
  aligned.zoomCanvases = await page.evaluate(() => document.querySelectorAll('#zoom-canvas .signal-light-canvas').length);
  await page.click('#zoom-close-btn');
  await page.waitForTimeout(200);
  await page.evaluate(() => LucivoStage.seekLights(null));
  record('TC-LIGHT-004', aligned.canvas > 100 && aligned.split > 100 && aligned.actual > 100 && aligned.zoomCanvases === 2, JSON.stringify(aligned));

  // TC-LIGHT-010 光が走っている間のフレーム間隔
  const frames = await page.evaluate(() => new Promise(resolve => {
    const gaps = [];
    let last = performance.now();
    const step = t => {
      gaps.push(t - last);
      last = t;
      if (gaps.length < 150) requestAnimationFrame(step);
      else {
        gaps.sort((a, b) => a - b);
        resolve({ median: gaps[75], p95: gaps[142] });
      }
    };
    requestAnimationFrame(step);
  }));
  record('TC-LIGHT-010', frames.median <= 20, JSON.stringify(frames));

  await page.evaluate(() => { document.getElementById('preview-scroll').scrollTop = 0; });
  await page.waitForTimeout(350);
  const away = await page.evaluate(() => LucivoStage.lightPlans()[0].active);
  record('TC-LIGHT-005', visible[0].active && visible[0].planned && !visible[3].planned && !visible[4].planned && !away, JSON.stringify({ visible, away }));

  // TC-LIGHT-002 シーケンス図は時系列の順に 1 本ずつ流れ、長い図でも一巡の時間に上限がある
  await scrollToSlab(page, 11);
  await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-slab')[11].querySelectorAll('.exhibition-viewport')[1].scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => LucivoStage.lightPlans()[3].plan);
  const sequence = await page.evaluate(() => {
    const { plan } = LucivoStage.lightPlans()[3];
    const starts = plan.edges.map(e => e.start);
    return {
      edges: plan.edges.length,
      ordered: starts.every((s, i) => i === 0 || s > starts[i - 1]),
      noOverlap: plan.edges.every((e, i) => i === 0 || e.start >= plan.edges[i - 1].start + plan.edges[i - 1].length / plan.edges[i - 1].speed),
      cycle: plan.cycle
    };
  });
  record('TC-LIGHT-002', sequence.edges >= 10 && sequence.ordered && sequence.noOverlap && sequence.cycle <= 13 + 0.25 + 2.2 + 0.01, JSON.stringify(sequence));

  // TC-LIGHT-006 書き出す SVG に光が混ざらない（以前は CSS のない線が黒い塗りで書き出された）
  const exported = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-viewport > svg'));
    return {
      svgs: svgs.length,
      beams: svgs.filter(s => /flow-beam/.test(s.outerHTML)).length,
      canvases: svgs.filter(s => s.querySelector('canvas')).length,
      cached: Array.from(svgCache.values()).filter(s => /flow-beam/.test(s)).length
    };
  });
  record('TC-LIGHT-006', exported.svgs === 5 && exported.beams === 0 && exported.canvases === 0 && exported.cached === 0, JSON.stringify(exported));

  // TC-LIGHT-009 手順の光は transform だけで動き、丸への到達と反応の時刻が合う
  const steps = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab');
    const horizontal = slabs[6].querySelector('.vs-steps');
    const vertical = slabs[7].querySelector('.vs-steps.is-vertical');
    const items = Array.from(horizontal.children);
    const seconds = v => parseFloat(v);
    const animation = horizontal.getAnimations({ subtree: true }).find(a => a.animationName === 'vs-comet-run');
    const properties = animation ? Array.from(new Set(animation.effect.getKeyframes().flatMap(k => Object.keys(k)))).filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)) : [];
    return {
      name: getComputedStyle(horizontal, '::after').animationName,
      verticalName: getComputedStyle(vertical, '::after').animationName,
      duration: seconds(getComputedStyle(horizontal, '::after').animationDuration),
      receiveDelays: items.map(li => seconds(getComputedStyle(li, '::after').animationDelay)),
      chevronDelays: items.slice(1).map(li => seconds(getComputedStyle(li.querySelector('.vs-step-chevron')).animationDelay)),
      properties
    };
  });
  const stepsOk = steps.name === 'vs-comet-run' && steps.verticalName === 'vs-comet-run-vertical'
    && Math.abs(steps.duration - 3 / 0.7) < 0.01
    && JSON.stringify(steps.receiveDelays) === '[0,1,2,3]'
    && JSON.stringify(steps.chevronDelays) === '[0.5,1.5,2.5]'
    && steps.properties.every(p => ['transform', 'opacity'].includes(p));
  record('TC-LIGHT-009', stepsOk, JSON.stringify(steps));

  // TC-LIGHT-011 見た目（4 スタイル × Light / Dark）
  for (const appearance of ['light', 'dark']) {
    for (const style of VISUAL_STYLES) {
      await setMode(page, { style, appearance });
      await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.lightPlans().length >= 5);
      await scrollToSlab(page, 9);
      await page.waitForFunction(() => LucivoStage.lightPlans()[0].plan);
      await seekLight(page, 1.0);
      await page.locator('#visual-stage-container .exhibition-viewport').first().screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-flow.png`) });
      await seekLight(page, 1.75);
      await page.locator('#visual-stage-container .exhibition-viewport').first().screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-arrival.png`) });
      await page.evaluate(() => LucivoStage.seekLights(null));
      await scrollToSlab(page, 6);
      await page.waitForTimeout(1300);
      await page.locator('#visual-stage-container .exhibition-slab').nth(6).screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-steps.png`) });
    }
  }
  if (page.consoleErrors.length) record('TC-LIGHT-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.context().close();

  // TC-LIGHT-008 動きを減らす設定では光を出さない
  const calm = await openStagePage(browser, { reducedMotion: 'reduce' });
  await calm.click('#btn-visual-mode');
  await setDocument(calm, showcaseMd);
  await calm.waitForFunction(() => typeof LucivoStage !== 'undefined');
  await calm.waitForTimeout(400);
  const reduced = await calm.evaluate(() => {
    const steps = document.querySelector('#visual-stage-container .vs-steps');
    return {
      canvases: document.querySelectorAll('.signal-light-canvas').length,
      comet: getComputedStyle(steps, '::after').display,
      chevron: getComputedStyle(steps.querySelector('.vs-step-chevron')).animationName
    };
  });
  record('TC-LIGHT-008', reduced.canvases === 0 && reduced.comet === 'none' && reduced.chevron === 'none', JSON.stringify(reduced));
  await calm.context().close();
}

function inspectShow() {
  const root = document.getElementById('visual-stage-container');
  const rect = root.getBoundingClientRect();
  const shown = Array.from(root.querySelectorAll('.exhibition-wrap > *')).filter(el => getComputedStyle(el).display !== 'none');
  return {
    ...LucivoStage.showState(),
    htmlClass: document.documentElement.classList.contains('is-stage-show'),
    covers: rect.left === 0 && rect.top === 0 && rect.width === innerWidth && rect.height === innerHeight,
    topElement: document.elementFromPoint(20, 20).closest('#visual-stage-container, #stage-hud') !== null,
    shown: shown.length,
    tpl: shown[0] ? shown[0].className : '',
    scrollTop: root.scrollTop,
    overflow: root.scrollHeight - root.clientHeight,
    appearance: state.appearance,
    viewMode: state.viewMode,
    isVisual: state.isVisualMode,
    count: document.querySelector('.stage-hud-count').textContent
  };
}

async function pressUntil(page, predicate, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate(predicate)) return true;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(40);
  }
  return false;
}

async function testStageShow(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, showcaseMd);

  // TC-SHOW-001 高速モード・Light・Split から 1 回の操作で発表を始める
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(900);
  const entered = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-00-hero.png') });
  record('TC-SHOW-001', entered.htmlClass && entered.covers && entered.topElement && entered.scenes === 15 && entered.shown === 1
    && /exhibition-hero/.test(entered.tpl) && entered.appearance === 'dark' && entered.viewMode === 'canvas' && entered.isVisual && entered.count === '01 / 15', JSON.stringify(entered));

  // TC-SHOW-002 ページ送り（→ / Space / ← / End / Home）
  await page.keyboard.press('ArrowRight');
  const second = await page.evaluate(inspectShow);
  await page.keyboard.press(' ');
  const third = await page.evaluate(inspectShow);
  await page.keyboard.press('ArrowLeft');
  const back = await page.evaluate(inspectShow);
  await page.keyboard.press('End');
  const last = await page.evaluate(inspectShow);
  await page.keyboard.press('Home');
  const first = await page.evaluate(inspectShow);
  record('TC-SHOW-002', second.index === 1 && third.index === 2 && back.index === 1 && last.index === 14 && first.index === 0 && first.shown === 1,
    JSON.stringify([second.index, third.index, back.index, last.index, first.index]));

  // TC-SHOW-003 要点カード・手順は 1 項目ずつ見せる
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-points'));
  await page.waitForTimeout(800);
  const builtCount = () => document.querySelectorAll('.is-scene .is-built').length;
  const pointBuilds = [await page.evaluate(builtCount)];
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-points-0.png') });
  await page.keyboard.press('ArrowRight');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.keyboard.press('ArrowRight');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.keyboard.press('ArrowLeft');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.waitForTimeout(500);
  const hiddenCard = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.is-scene .vs-points > li:not(.is-built)')).opacity));
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-steps'));
  await page.waitForTimeout(800);
  const stepCircle = await page.evaluate(() => {
    const li = document.querySelector('.is-scene .vs-steps > li:not(.is-built)');
    return { opacity: getComputedStyle(li).opacity, circle: getComputedStyle(li, '::before').backgroundColor };
  });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-steps-2.png') });
  record('TC-SHOW-003', JSON.stringify(pointBuilds) === '[0,1,2,1]' && hiddenCard < 0.2 && stepCircle.opacity === '1' && !/, 0\)$/.test(stepCircle.circle),
    JSON.stringify({ pointBuilds, hiddenCard, stepCircle }));

  // TC-SHOW-005 図は舞台の高さに収まり、操作部品は隠れ、光も図に重なる
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-split'));
  await page.waitForTimeout(900);
  await seekLight(page, 1.0);
  const diagram = await page.evaluate(() => {
    const scene = document.querySelector('.is-scene');
    const svg = scene.querySelector('.exhibition-viewport > svg');
    const rect = svg.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      width: rect.width,
      minWidth: parseFloat(svg.style.minWidth) || 0,
      header: getComputedStyle(scene.querySelector('.exhibition-diagram-header')).display,
      fitsHeight: rect.bottom <= innerHeight,
      overflow: document.getElementById('visual-stage-container').scrollHeight - innerHeight
    };
  });
  const flowHead = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-split.png') });
  await page.evaluate(() => LucivoStage.seekLights(null));
  record('TC-SHOW-005', diagram.header === 'none' && diagram.fitsHeight && diagram.width >= diagram.minWidth && flowHead > 100, JSON.stringify({ diagram, flowHead }));

  // TC-SHOW-004 画面に収まらない章は、次の章へ進む前に残りをスクロールする
  await pressUntil(page, () => document.getElementById('visual-stage-container').scrollHeight - innerHeight > 200);
  await page.waitForTimeout(800);
  const tall = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-tall.png') });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  const scrolled = await page.evaluate(inspectShow);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  const returned = await page.evaluate(inspectShow);
  record('TC-SHOW-004', scrolled.index === tall.index && scrolled.scrollTop > 100 && returned.index === tall.index && returned.scrollTop <= 4, JSON.stringify({ index: tall.index, overflow: tall.overflow, scrolled: scrolled.scrollTop, returned: returned.scrollTop }));

  // TC-SHOW-007 発表中に明暗を切り替えても、シーンを保つ
  await page.keyboard.press('Home');
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-split'));
  const beforeToggle = await page.evaluate(inspectShow);
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(900);
  const afterToggle = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-light-split.png') });
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(500);
  record('TC-SHOW-007', beforeToggle.index === afterToggle.index && afterToggle.appearance === 'light' && afterToggle.shown === 1 && afterToggle.scenes === 15, JSON.stringify({ before: beforeToggle.appearance, after: afterToggle.appearance, index: afterToggle.index }));

  // TC-SHOW-006 自動進行（項目ごとの送りと、最後の章から先頭への巡回）
  await page.keyboard.press('Home');
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-points'));
  await page.keyboard.press('a');
  await page.waitForTimeout(2900);
  const autoBuild = await page.evaluate(builtCount);
  await page.keyboard.press('a');
  const autoOff = await page.evaluate(() => LucivoStage.showState().auto);

  // TC-SHOW-008 終了すると元の状態に戻り、発表した章を表示する
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-quote'));
  const quoteIndex = await page.evaluate(() => LucivoStage.showState().index);
  await page.keyboard.press('Escape');
  await waitRendered(page);
  await page.waitForTimeout(500);
  const exited = await page.evaluate(i => {
    const scenes = document.querySelectorAll('.exhibition-wrap > .exhibition-hero, .exhibition-wrap > .exhibition-slab');
    const scroller = document.getElementById('preview-scroll').getBoundingClientRect();
    const rect = scenes[i].getBoundingClientRect();
    return {
      active: LucivoStage.showState().active,
      htmlClass: document.documentElement.classList.contains('is-stage-show'),
      appearance: state.appearance,
      viewMode: state.viewMode,
      isVisual: state.isVisualMode,
      leftovers: document.querySelectorAll('.is-scene, .is-built, .is-building').length,
      sceneInView: rect.top < scroller.bottom && rect.bottom > scroller.top,
      rootFont: getComputedStyle(document.documentElement).fontSize
    };
  }, quoteIndex);
  record('TC-SHOW-008', !exited.active && !exited.htmlClass && exited.appearance === 'light' && exited.viewMode === 'split' && exited.isVisual && exited.leftovers === 0 && exited.sceneInView && exited.rootFont === '16px', JSON.stringify(exited));

  // 短い文書で、自動進行が最後の章から先頭へ戻ること
  await setDocument(page, '# 題名\n\n## 一\n\n短い章です。\n');
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await page.keyboard.press('End');
  await page.keyboard.press('a');
  await page.waitForTimeout(7400);
  const looped = await page.evaluate(() => LucivoStage.showState());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  record('TC-SHOW-006', autoBuild >= 1 && !autoOff && looped.index === 0 && looped.auto, JSON.stringify({ autoBuild, autoOff, looped }));

  // TC-SHOW-009 章のない文書では発表を始めず、元の表示を保つ
  await setDocument(page, '');
  await page.click('#btn-stage-show');
  await page.waitForTimeout(400);
  const empty = await page.evaluate(() => ({
    active: LucivoStage.showState().active,
    htmlClass: document.documentElement.classList.contains('is-stage-show'),
    appearance: state.appearance,
    viewMode: state.viewMode,
    toast: document.getElementById('toast-message').textContent
  }));
  record('TC-SHOW-009', !empty.active && !empty.htmlClass && empty.appearance === 'light' && empty.viewMode === 'split' && /発表する章がありません/.test(empty.toast), JSON.stringify(empty));

  // TC-SHOW-010 見た目（全シーン）
  await setDocument(page, showcaseMd);
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(950);
    await page.screenshot({ path: path.join(SHOT_DIR, `show-scene-${String(i).padStart(2, '0')}.png`) });
    // 項目の送りとスクロールを含めて、次の章へ進むまで送る
    for (let n = 0; n < 12 && await page.evaluate(() => LucivoStage.showState().index) <= i; n++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
    }
  }
  await page.keyboard.press('Escape');

  if (page.consoleErrors.length) record('TC-SHOW-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
}

// TC-SHOW-011, 012: 発表の俯瞰（ライトテーブル）と光のポインター（FR-022, FR-023）
async function testStageOverviewPointer(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, showcaseMd);
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(600);
  await pressUntil(page, () => LucivoStage.showState().index === 4);

  // TC-SHOW-011 俯瞰: 開くまでの時間、並び、光の停止、選択の移動、拡大して入る、元のシーンへ戻る
  const openMs = await page.evaluate(() => new Promise(resolve => {
    const t0 = performance.now();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }));
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(+(performance.now() - t0).toFixed(1))));
  }));
  await page.waitForTimeout(700);
  const grid = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > *'));
    const rects = tiles.map(t => t.getBoundingClientRect());
    return {
      ...LucivoStage.showState(),
      htmlClass: document.documentElement.classList.contains('is-stage-overview'),
      visible: tiles.filter(t => getComputedStyle(t).display !== 'none').length,
      columns: new Set(rects.map(r => Math.round(r.left))).size,
      inside: rects.every(r => r.left >= 0 && r.right <= innerWidth + 1),
      aspect: rects.every(r => Math.abs(r.width / r.height - innerWidth / innerHeight) < 0.03),
      selectedClass: tiles.findIndex(t => t.classList.contains('is-ov-selected')),
      lightsOff: LucivoStage.lightPlans().every(p => !p.active),
      count: document.querySelector('.stage-hud-count').textContent
    };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-overview.png') });
  const moves = [];
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowUp', 'End', 'Home', 'ArrowLeft']) {
    await page.keyboard.press(key);
    moves.push(await page.evaluate(() => LucivoStage.showState().selected));
  }
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const entered = await page.evaluate(inspectShow);
  // 縮小図をクリックして入る。図のあるシーン（10: 解説＋図版型）では、光がまた流れる
  await page.keyboard.press('o');
  await page.waitForTimeout(700);
  await page.locator('#visual-stage-container .exhibition-wrap > *').nth(10).click();
  await page.waitForTimeout(1200);
  const clicked = await page.evaluate(() => ({
    ...LucivoStage.showState(),
    lightsOn: LucivoStage.lightPlans().some(p => p.active)
  }));
  // Escape で、開く前のシーンへ戻る（発表は続く）
  await page.keyboard.press('o');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const escaped = await page.evaluate(inspectShow);
  const overviewOk = openMs < 400 && grid.overview && grid.htmlClass && grid.visible === 15 && grid.columns === 4 && grid.inside && grid.aspect
    && grid.selected === 4 && grid.selectedClass === 4 && grid.lightsOff && grid.count === '05 / 15'
    && JSON.stringify(moves) === '[5,9,5,14,0,0]'
    && !entered.overview && entered.index === 1 && entered.shown === 1 && entered.active
    && !clicked.overview && clicked.index === 10 && clicked.lightsOn
    && !escaped.overview && escaped.active && escaped.index === 10 && escaped.shown === 1;
  record('TC-SHOW-011', overviewOk, JSON.stringify({ openMs, grid, moves, entered: entered.index, clicked, escaped: escaped.index }));

  // TC-SHOW-012 光のポインター: マウスに追従し、レイアウトを読まない。俯瞰と終了で消える
  await page.keyboard.press('l');
  await page.mouse.move(200, 200);
  await page.evaluate(() => {
    window.__layoutReads = 0;
    const count = (obj, name) => {
      const orig = obj[name];
      obj[name] = function (...args) { window.__layoutReads++; return orig.apply(this, args); };
      return () => { obj[name] = orig; };
    };
    window.__restoreReads = [count(Element.prototype, 'getBoundingClientRect'), count(window, 'getComputedStyle'), count(Element.prototype, 'getClientRects')];
  });
  await page.mouse.move(820, 460, { steps: 30 });
  await page.waitForTimeout(150);
  const follow = await page.evaluate(() => {
    window.__restoreReads.forEach(restore => restore());
    const layer = document.querySelector('.stage-pointer');
    return {
      reads: window.__layoutReads,
      pointer: LucivoStage.showState().pointer,
      display: getComputedStyle(layer).display,
      px: layer.style.getPropertyValue('--px'),
      py: layer.style.getPropertyValue('--py'),
      dot: layer.firstElementChild.style.transform,
      cursor: getComputedStyle(document.getElementById('visual-stage-container')).cursor
    };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-pointer.png') });
  await page.keyboard.press('o');
  await page.waitForTimeout(500);
  const inOverview = await page.evaluate(() => ({ pointer: LucivoStage.showState().pointer, display: getComputedStyle(document.querySelector('.stage-pointer')).display }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  await page.keyboard.press('l');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const afterExit = await page.evaluate(() => ({ active: LucivoStage.showState().active, pointer: LucivoStage.showState().pointer, htmlClass: document.documentElement.className }));
  const pointerOk = follow.reads === 0 && follow.pointer && follow.display === 'block' && follow.px === '820px' && follow.py === '460px'
    && /translate3d\(820px, 460px/.test(follow.dot) && follow.cursor === 'none'
    && !inOverview.pointer && inOverview.display === 'none'
    && !afterExit.active && !afterExit.pointer && !/is-stage-(pointer|overview|show)/.test(afterExit.htmlClass);
  record('TC-SHOW-012', pointerOk, JSON.stringify({ follow, inOverview, afterExit }));

  if (page.consoleErrors.length) record('TC-SHOW-CONSOLE2', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
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
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-export-html')]);
  const exported = fs.readFileSync(await download.path(), 'utf8');
  record('TC-OFF-003', !exported.includes('./vendor/') && exported.includes('fonts.googleapis.com/css2') && /marked@[\d.]+\/lib\/marked\.umd\.js/.test(exported),
    `localRefs=${(exported.match(/\.\/vendor\//g) || []).length}`);
  await ctx.close();
}

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await testFileLoading(browser);
    await testDiagramRendering(browser);
    await testMarkdownTypography(browser);
    await testMathRendering(browser);
    await testFrontMatter(browser);
    await testEdgeStyle(browser);
    await testVisualStageQuality(browser);
    await testVisualTemplates(browser);
    await testCoverAndTables(browser);
    await testSignalLight(browser);
    await testStageShow(browser);
    await testStageOverviewPointer(browser);
    await testStartupAndCache(browser);
    await testOffline(browser);
  } catch (e) {
    record('RUNTIME', false, e.stack);
  } finally {
    await browser.close();
  }
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const failed = results.filter(r => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
})();
