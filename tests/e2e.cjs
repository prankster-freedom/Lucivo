// Lucivo のブラウザ動作確認スクリプト（テスト仕様: doc/5.test_spec/）
// 使い方: nodetests/e2e.cjs
// 出力: work/test/（結果 JSON と図の画像。git 管理外）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const APP_DIR = path.resolve(__dirname, '..');
const APP_URL = 'file:///' + path.join(APP_DIR, 'index.html').replace(/\\/g, '/');
const SAMPLE = path.join(APP_DIR, 'sample.md');
const OUT_DIR = path.join(APP_DIR, 'work', 'test');
const SHOT_DIR = path.join(OUT_DIR, 'shots');
const VISUAL_STYLES = ['shapes', 'cards', 'circles', 'editorial'];
const MODES = [
  { style: 'std', appearance: 'light' }, { style: 'std', appearance: 'dark' },
  ...VISUAL_STYLES.map(style => ({ style, appearance: 'light' })),
  { style: 'shapes', appearance: 'dark' }
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
  await page.waitForFunction(() => window.mermaid && typeof renderApp === 'function' && document.getElementById('telemetry-status'));
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

// 表示モードの切替（Visual Stage はスタイルバーのボタン、通常モードは Visual Stage ボタンで戻す）
async function setMode(page, { style, appearance }) {
  const current = await page.evaluate(() => state.appearance);
  if (current !== appearance) await page.click('#btn-theme-toggle');
  const isVisual = await page.evaluate(() => state.isVisualMode);
  if (style === 'std') {
    if (isVisual) await page.click('#btn-visual-mode');
  } else {
    await page.click(`.info-style-btn[data-info-style="${style}"]`);
  }
  await waitRendered(page);
}

async function testFileLoading(browser) {
  const page = await openApp(browser);
  await waitRendered(page);

  // TC-FILE-001 起動直後の初期表示
  const init = await page.evaluate(() => ({
    editor: document.getElementById('markdown-editor').value,
    guide: !!document.querySelector('#standard-doc-container .empty-guide')
  }));
  record('TC-FILE-001', init.editor === '' && init.guide, JSON.stringify(init));

  // TC-FILE-002 メニューの開閉
  await page.click('#btn-file-menu');
  const opened = await page.evaluate(() => !document.getElementById('file-menu').classList.contains('hidden') && document.getElementById('btn-file-menu').getAttribute('aria-expanded') === 'true');
  await page.mouse.click(700, 600);
  const closedByOutside = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  await page.click('#btn-file-menu');
  await page.keyboard.press('Escape');
  const closedByEsc = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  record('TC-FILE-002', opened && closedByOutside && closedByEsc, JSON.stringify({ opened, closedByOutside, closedByEsc }));

  // TC-FILE-003 未編集の状態での読み込み
  const dialogOnFirstLoad = await loadSample(page);
  const after = await page.evaluate(() => ({
    h1: (document.querySelector('#standard-doc-container h1') || {}).textContent,
    cards: document.querySelectorAll('#standard-doc-container [data-stage-index]').length,
    inputCleared: document.getElementById('file-input').value === '',
    toast: document.getElementById('toast-message').textContent
  }));
  const editorValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  after.sameAsFile = editorValue === fs.readFileSync(SAMPLE, 'utf8').replace(/^﻿/, '');
  record('TC-FILE-003', !dialogOnFirstLoad && after.sameAsFile && after.h1 === 'Lucivo サンプル文書' && after.cards > 0 && /読み込みました/.test(after.toast), JSON.stringify({ dialogOnFirstLoad, ...after }));
  record('TC-FILE-006', after.inputCleared, `file-input.value cleared: ${after.inputCleared}`);

  // TC-FILE-004 編集後の読み込み：キャンセルで内容を保つ
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
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.startsWith('# Lucivo サンプル文書'));
  record('TC-FILE-005', accepted, `dialog accepted and replaced: ${accepted}`);

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
    hiddenSide: document.getElementById('standard-doc-container').children.length
  }));
  record('TC-DIAG-001', first.svgs === expected && first.pending === 0 && first.hiddenSide === 0, JSON.stringify({ expected, ...first }));

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
    perMode.math.push({ tag, mathSvgs: r.mathSvgs, gaps: r.gaps, lums: r.mathLums, darkBg: tag === 'std-dark' });
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
  const body = q('p');
  const h3 = q('h3'), h4 = q('h4');
  const uls = [q('ul'), q('ul ul'), q('ul ul ul')];
  const ol = q('ol');
  const task = Array.from(root.querySelectorAll('li')).find(li => li.querySelector(':scope > input[type="checkbox"]'));
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
      const li = [q('ul > li'), q('ul ul > li'), q('ul ul ul > li')];
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

// 本文の数式（sample.md の 8 章）を調べる
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
  await ctx.route('**/katex@*/**', route => route.abort());
  const offline = await ctx.newPage();
  const pageErrors = [];
  offline.on('pageerror', e => pageErrors.push(e.message));
  await offline.goto(APP_URL);
  await offline.waitForFunction(() => window.mermaid && typeof renderApp === 'function');
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

(async () => {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await chromium.launch();
  try {
    await testFileLoading(browser);
    await testDiagramRendering(browser);
    await testMarkdownTypography(browser);
    await testMathRendering(browser);
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
