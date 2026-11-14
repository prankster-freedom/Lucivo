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
  seekLight
} = require('./helpers.cjs');

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

  // TC-DIAG-002 描画中のモード切替。高速モードではスタイルバーが隠れるため、スタイルはキーボードの 3（circles）・4（editorial）で選ぶ
  await page.click('#btn-visual-mode');
  await page.keyboard.press('3');
  await page.click('#btn-visual-mode');
  await page.keyboard.press('4');
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

// クラス図の線の端の向き（DD-EDGE-005）を調べる。ページ内で実行する。
// 記号（継承の三角形など）が付く端ごとに、端の区間が縦（x の差が 0.5px 未満）かを返す
function inspectClassEdgeEnds(isVisual) {
  const root = document.querySelector(isVisual ? '#visual-stage-container' : '#standard-doc-container');
  const svg = Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === 'classDiagram');
  if (!svg) return null;
  const ends = [];
  for (const p of svg.querySelectorAll('path.relation')) {
    const nums = (p.getAttribute('d') || '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g) || [];
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push([+nums[i], +nums[i + 1]]);
    if (pts.length < 2) continue;
    const id = p.id.split('-').slice(-1)[0];
    if (p.getAttribute('marker-start')) ends.push({ id, end: 'start', dx: +Math.abs(pts[1][0] - pts[0][0]).toFixed(2) });
    if (p.getAttribute('marker-end')) {
      const n = pts.length;
      ends.push({ id, end: 'end', dx: +Math.abs(pts[n - 1][0] - pts[n - 2][0]).toFixed(2) });
    }
  }
  return { ends, vertical: ends.length > 0 && ends.every(e => e.dx < 0.5) };
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
  // TC-EDGE-007（高速モードの分）直角のクラス図で、記号が付く端の区間が縦になる。判定は Visual Stage の分と合わせて後で記録する
  const classEndsFast = await page.evaluate(inspectClassEdgeEnds, false);

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

  // TC-EDGE-007 直角のクラス図は、継承の三角形などの記号が付く端で、線が箱に垂直に出入りする（高速モード・Visual Stage）
  const classEndsVisual = await page.evaluate(inspectClassEdgeEnds, true);
  record('TC-EDGE-007', !!classEndsFast && classEndsFast.vertical && classEndsFast.ends.some(e => e.end === 'start')
    && !!classEndsVisual && classEndsVisual.vertical,
    JSON.stringify({ fast: classEndsFast, visual: classEndsVisual }));
  const classCard = await page.$(`#visual-stage-container #diagram-frame-${cl}`);
  if (classCard) await classCard.screenshot({ path: path.join(SHOT_DIR, 'edge-shapes-light-class-step.png') });

  // TC-EDGE-004 ファイルを読み込み直すと既定に戻る
  await setMode(page, { style: 'std', appearance: 'light' });
  await page.setInputFiles('#file-input', SAMPLE);
  await waitRendered(page);
  const reloaded = await page.evaluate(inspectEdgeStyle, false);
  record('TC-EDGE-004', byIdx(reloaded, 0).active === 'step' && !byIdx(reloaded, 0).curved, JSON.stringify({ after: byIdx(reloaded, 0).active }));
  if (page.consoleErrors.length) record('TC-EDGE-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

async function testEditFollow(browser) {
  const page = await openStagePage(browser, { reducedMotion: 'reduce' });
  const md = fs.readFileSync(SAMPLE, 'utf8');
  await setDocument(page, md);
  // カーソルを置いてキー操作のイベントを送り、追従の後のプレビューの状態を返す
  const caretAt = async (needle, offset = 0, scrollFirst = null) => {
    return page.evaluate(async ({ needle, offset, scrollFirst }) => {
      const editor = document.getElementById('markdown-editor');
      const scroller = document.getElementById('preview-scroll');
      if (scrollFirst !== null) scroller.scrollTop = scrollFirst;
      const pos = needle === null ? 0 : editor.value.indexOf(needle) + offset;
      editor.focus();
      editor.setSelectionRange(pos, pos);
      editor.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowDown', bubbles: true }));
      await new Promise(r => { setTimeout(r, 250); });
      const top = el => Math.round(el.getBoundingClientRect().top - scroller.getBoundingClientRect().top);
      const heads = Array.from(document.querySelectorAll('#standard-doc-container h2, #visual-stage-container .exhibition-slab[data-stage-no]'));
      const visible = heads.find(h => Math.abs(top(h) - 16) <= 2);
      return { scrollTop: Math.round(scroller.scrollTop), at: visible ? visible.textContent.trim().slice(0, 24) : null };
    }, { needle, offset, scrollFirst });
  };
  // 見出しの data-src-line が元の行と一致する（コードブロックの中の # は数えない）
  const lines = await page.evaluate(() => {
    const src = document.getElementById('markdown-editor').value.split('\n');
    return Array.from(document.querySelectorAll('#standard-doc-container [data-src-line]')).map(h => ({ line: Number(h.dataset.srcLine), src: src[Number(h.dataset.srcLine)] || '', text: h.textContent.trim() }));
  });
  const linesOk = lines.length > 20 && lines.every(l => /^#{1,6}\s/.test(l.src) && l.src.replace(/^#+\s*/, '').trim() === l.text);
  const toSection12 = await caretAt('## 12.', 8);
  const sameSection = await caretAt('## 12.', 40, 0);
  const toSection3 = await caretAt('## 3.', 3);
  const toFrontMatter = await caretAt(null);
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  const inCanvas = await caretAt('## 20.', 3, 0);
  await page.click('.view-mode-btn[data-view-mode="split"]');
  record('TC-DIAG-022', linesOk && /^12\./.test(toSection12.at || '') && sameSection.scrollTop === 0 && /^3\./.test(toSection3.at || '')
    && toFrontMatter.scrollTop === 0 && inCanvas.scrollTop === 0 && page.consoleErrors.length === 0,
  JSON.stringify({ linesOk, sample: lines.slice(0, 3), toSection12, sameSection, toSection3, toFrontMatter, inCanvas }));

  // TC-DIAG-023 Visualモードは章の上端へ送り、同じ章の小見出しの間では送り直さない。コードブロックの中の # は見出しにしない
  await setMode(page, { style: 'shapes', appearance: 'light' });
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, showcaseMd);
  const toSlab13 = await caretAt('### 13.2', 5);
  const withinSlab = await caretAt('### 13.3', 5, 0);
  const toSlab14 = await caretAt('## 14.', 5);
  const extraMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample_extra1.md'), 'utf8');
  await setMode(page, { style: 'std', appearance: 'light' });
  // 同梱サンプルとして開いた扱いにする（11 章の画像を samples フォルダから読む。DD-FILE-081）
  await page.evaluate(() => { currentSampleFile = 'notation_sample_extra1.md'; });
  await setDocument(page, extraMd);
  const inCodeBlock = await caretAt('# チルダによるコードブロック', 3);
  record('TC-DIAG-023', /STAGE 13/.test(toSlab13.at || '') && withinSlab.scrollTop === 0 && /STAGE 14/.test(toSlab14.at || '')
    && /^6\./.test(inCodeBlock.at || '') && page.consoleErrors.length === 0,
  JSON.stringify({ toSlab13, withinSlab, toSlab14, inCodeBlock }));
  await page.context().close();
}

// TC-DIAG-024 スタイルバーは Visualモードのときだけ表示する（FR-003, DD-DIAG-063）
// TC-DIAG-025: 構文エラーの図を描いても、Mermaid のエラーの図が body に残らない（DD-DIAG-064）
async function testSyntaxErrorCleanup(browser) {
  const page = await openStagePage(browser);
  const ok = '# 図\n\n```mermaid\nflowchart TD\n  A --> B\n```\n';
  const bad = '# 図\n\n```mermaid\nflowchart TD\n  A -->\n```\n';
  const inspect = () => page.evaluate(() => ({
    // Mermaid が描画のために body の直下に置く一時的な要素（id は d + 描画 ID）
    leftovers: document.querySelectorAll('body > [id^="dmermaid-render"]').length,
    // プレビューの外にある Mermaid のエラーの図
    errorSvgsOutside: Array.from(document.querySelectorAll('svg[aria-roledescription="error"]')).filter(s => !s.closest('#preview-scroll')).length,
    previewSvg: Boolean(document.querySelector('#preview-scroll [data-stage-index="0"] svg')),
    previewError: /構文エラー/.test(document.querySelector('#preview-scroll [data-stage-index="0"]')?.textContent || '')
  }));
  const rows = [];
  for (const mode of ['fast', 'visual']) {
    if (mode === 'visual') await page.click('#btn-visual-mode');
    await setDocument(page, ok);
    const okState = await inspect();
    await setDocument(page, bad);
    const bad1 = await inspect();
    await setDocument(page, bad + ' ');
    const bad2 = await inspect();
    await setDocument(page, ok);
    const fixed = await inspect();
    const pass = [okState, bad1, bad2, fixed].every(s => s.leftovers === 0 && s.errorSvgsOutside === 0)
      && (bad1.previewSvg || bad1.previewError) && fixed.previewSvg;
    rows.push({ mode, pass, okState, bad1, bad2, fixed });
  }
  record('TC-DIAG-025', rows.every(r => r.pass), JSON.stringify(rows));
  await page.context().close();
}

// TC-DIAG-029 長いラベルを持つノードの文字切れ防止（Issue #56）
async function testDiagramLongLabel(browser) {
  const page = await openStagePage(browser);
  const doc = `# Mermaid 長いラベルテスト

\`\`\`mermaid
flowchart TD
  A["これは非常に長い日本語ラベルを持つ処理ノードであり、ある程度の文字数を超えても後半が切れることなくノード内に収まるか検証します"] --> B["This is a very long English label designed to verify automatic text wrapping in Mermaid nodes"]
  B --> C["1行目のテキスト<br/>2行目のかなり長いテキストでボックスを突き破らないか確認します<br/>3行目"]
  C --> D["\`Markdown文字列での複数行ラベル\n2行目の長いテキスト\n3行目\`"]
\`\`\`
`;
  const inspectNodes = () => page.evaluate(() => {
    const nodes = Array.from(document.querySelectorAll('.diagram-viewport svg .node, [data-stage-index] svg .node'));
    return nodes.map(n => {
      const rect = n.querySelector('rect.basic, rect.label-container, rect');
      const label = n.querySelector('.nodeLabel, .label div, text');
      if (!rect || !label) return { id: n.id, pass: false, reason: 'missing rect or label' };
      const rBox = rect.getBoundingClientRect();
      const lBox = label.getBoundingClientRect();
      // 余白やパディングの軽微なレンダリング誤差を考慮し、左右2px以内のオーバーフローは許容
      const overflowLeft = lBox.left < rBox.left - 2;
      const overflowRight = lBox.right > rBox.right + 2;
      const overflowBottom = lBox.bottom > rBox.bottom + 2;
      return {
        id: n.id,
        text: label.textContent.trim().substring(0, 20),
        rBox: { width: Math.round(rBox.width), height: Math.round(rBox.height) },
        lBox: { width: Math.round(lBox.width), height: Math.round(lBox.height) },
        pass: !overflowLeft && !overflowRight && !overflowBottom
      };
    });
  });

  await setDocument(page, doc);
  await waitRendered(page);
  const fastResults = await inspectNodes();
  const fastOk = fastResults.length === 4 && fastResults.every(r => r.pass);

  await page.click('#btn-visual-mode');
  await waitRendered(page);
  const visualResults = await inspectNodes();
  const visualOk = visualResults.length === 4 && visualResults.every(r => r.pass);

  record('TC-DIAG-029', fastOk && visualOk, JSON.stringify({ fast: fastResults, visual: visualResults }));
  await page.context().close();
}

// TC-DIAG-030 ユーザー指定のスタイル（style / classDef / linkStyle）の保持（Issue #55）
async function testDiagramUserStyles(browser) {
  const page = await openStagePage(browser);
  const doc = `# Mermaid ユーザースタイル保持テスト

\`\`\`mermaid
flowchart TD
  A[デフォルトノード] --> B[スタイル指定ノード]
  B --> C[classDefノード]
  style B fill:#ff9999,stroke:#333333,stroke-width:4px,color:#123456
  classDef special fill:#bbbbff,stroke:#ff6666,stroke-width:2px,color:#654321
  class C special
  linkStyle 0 stroke:#ff1122,stroke-width:5px
\`\`\`
`;

  const inspectStyles = () => page.evaluate(() => {
    const svg = document.querySelector('.diagram-viewport svg, [data-stage-index] svg');
    if (!svg) return null;
    const bNode = svg.querySelector('g.node[id*="flowchart-B"]');
    const cNode = svg.querySelector('g.node[id*="flowchart-C"]');
    const bRect = bNode ? bNode.querySelector('rect') : null;
    const cRect = cNode ? cNode.querySelector('rect') : null;
    const bLabel = bNode ? bNode.querySelector('.nodeLabel, text, p, span') : null;
    const cLabel = cNode ? cNode.querySelector('.nodeLabel, text, p, span') : null;
    const links = Array.from(svg.querySelectorAll('.edgePath path.path, path.flowchart-link'));
    const link0 = links[0];

    const bFill = bRect ? window.getComputedStyle(bRect).fill : null;
    const bStroke = bRect ? window.getComputedStyle(bRect).stroke : null;
    const bColor = bLabel ? window.getComputedStyle(bLabel).color : null;

    const cFill = cRect ? window.getComputedStyle(cRect).fill : null;
    const cStroke = cRect ? window.getComputedStyle(cRect).stroke : null;
    const cColor = cLabel ? window.getComputedStyle(cLabel).color : null;

    const l0Stroke = link0 ? window.getComputedStyle(link0).stroke : null;

    const bOk = bFill === 'rgb(255, 153, 153)' && bStroke === 'rgb(51, 51, 51)' && bColor === 'rgb(18, 52, 86)';
    const cOk = cFill === 'rgb(187, 187, 255)' && cStroke === 'rgb(255, 102, 102)' && cColor === 'rgb(101, 67, 33)';
    const lOk = l0Stroke === 'rgb(255, 17, 34)';

    return {
      pass: bOk && cOk && lOk,
      details: { bFill, bStroke, bColor, cFill, cStroke, cColor, l0Stroke }
    };
  });

  await setDocument(page, doc);
  await waitRendered(page);
  const fastRes = await inspectStyles();

  await page.click('#btn-visual-mode');
  await waitRendered(page);
  const visualRes = await inspectStyles();

  record('TC-DIAG-030', fastRes && fastRes.pass && visualRes && visualRes.pass, JSON.stringify({ fast: fastRes, visual: visualRes }));
  await page.context().close();
}

async function testStyleBar(browser) {
  const page = await openStagePage(browser);
  await setDocument(page, fs.readFileSync(SAMPLE, 'utf8'));
  const barState = () => page.evaluate(() => {
    const bar = document.getElementById('style-bar');
    const workspace = document.getElementById('workspace-main');
    return {
      visual: state.isVisualMode,
      style: state.infographicStyle,
      barShown: getComputedStyle(bar).display !== 'none',
      workspaceTop: Math.round(workspace.getBoundingClientRect().top)
    };
  });
  const fastStart = await barState();
  await page.click('#btn-visual-mode');
  await waitRendered(page);
  const visual = await barState();
  // Visualモードでスタイルを押しても、モードは Visualモードのまま
  await page.click('.info-style-btn[data-info-style="cards"]');
  await waitRendered(page);
  const styled = await barState();
  await page.click('#btn-mode-fast');
  await waitRendered(page);
  const backToFast = await barState();
  // 高速モードからキーボードの 3 でスタイルを選ぶと、Visualモードに切り替わり、スタイルバーが現れる
  await page.locator('#btn-mode-fast').focus();
  await page.keyboard.press('3');
  await waitRendered(page);
  const byKey = await barState();
  record('TC-DIAG-024', !fastStart.visual && !fastStart.barShown
    && visual.visual && visual.barShown && visual.workspaceTop > fastStart.workspaceTop
    && styled.visual && styled.style === 'cards' && styled.barShown
    && !backToFast.visual && !backToFast.barShown && backToFast.workspaceTop === fastStart.workspaceTop
    && byKey.visual && byKey.style === 'circles' && byKey.barShown && page.consoleErrors.length === 0,
  JSON.stringify({ fastStart, visual, styled, backToFast, byKey, errors: page.consoleErrors }));
  await page.context().close();
}

// ウィンドウのタイトル（TC-FILE-017）とファイルのドロップ（TC-FILE-018、TC-FILE-019）
async function testDiagramPanZoom(browser) {
  const page = await openStagePage(browser);
  // 0: 横に長く、Fit でもスクロール表示になる図。1: 小さな図
  const chain = Array.from({ length: 28 }, (_, i) => `  N${i}[工程 ${i}] --> N${i + 1}[工程 ${i + 1}]`).join('\n');
  const md = `# 図\n\n\`\`\`mermaid\nflowchart LR\n${chain}\n\`\`\`\n\n## 小さな図\n\n\`\`\`mermaid\nflowchart TD\n  A --> B\n\`\`\`\n`;
  await setDocument(page, md);
  const vpSel = i => `#preview-scroll [data-stage-index="${i}"]`;
  const vpState = i => page.evaluate(sel => {
    const vp = document.querySelector(sel);
    const svg = vp.querySelector(':scope > svg');
    const frame = vp.closest('[id^="diagram-frame-"]');
    return {
      scrollLeft: Math.round(vp.scrollLeft),
      scrollable: vp.scrollWidth > vp.clientWidth + 1,
      pannable: vp.classList.contains('is-pannable'),
      panning: vp.classList.contains('is-panning'),
      cursor: getComputedStyle(vp).cursor,
      zoomed: vp.classList.contains('is-zoomed'),
      width: Math.round(svg.getBoundingClientRect().width),
      vbWidth: Math.round(svg.viewBox.baseVal.width),
      activeScale: Array.from(frame.querySelectorAll('.scale-btn.is-active')).map(b => b.dataset.action)
    };
  }, vpSel(i));
  const center = async i => {
    const box = await page.locator(vpSel(i)).boundingBox();
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  const rows = [];
  for (const mode of ['fast', 'visual']) {
    if (mode === 'visual') {
      await page.click('#btn-visual-mode');
      await waitRendered(page);
      await page.locator(vpSel(0)).scrollIntoViewIfNeeded();
    }
    // TC-DIAG-026: スクロール表示の図をつかんで左へ 300px 動かすと、図の右側が見える
    const c = await center(0);
    await page.mouse.move(c.x, c.y);
    const before = await vpState(0);
    await page.mouse.down();
    await page.mouse.move(c.x - 150, c.y, { steps: 5 });
    await page.mouse.move(c.x - 300, c.y, { steps: 5 });
    const during = await vpState(0);
    await page.mouse.up();
    const after = await vpState(0);
    // スクロール表示にならない小さな図は、つかめない
    const small = await center(1);
    await page.mouse.move(small.x, small.y);
    const smallState = await vpState(1);
    rows.push({ mode, before, during, after, smallState, pass: before.scrollable && before.pannable && before.cursor === 'grab'
      && during.panning && during.cursor === 'grabbing' && Math.abs(after.scrollLeft - before.scrollLeft - 300) <= 3
      && !after.panning && !smallState.scrollable && !smallState.pannable && smallState.cursor !== 'grab' });
  }
  record('TC-DIAG-026', rows.every(r => r.pass), JSON.stringify(rows));

  // 図の上にカーソルを置いてから Ctrl + ホイールを回す（拡大・縮小でスクロールすると、カーソルの下の要素が変わるため）
  const ctrlWheelOn = async (i, deltaY, times = 1) => {
    for (let k = 0; k < times; k++) {
      await page.locator(vpSel(i)).scrollIntoViewIfNeeded();
      const s = await page.locator(`${vpSel(i)} > svg`).boundingBox();
      await page.mouse.move(s.x + Math.min(s.width / 2, 20), s.y + s.height / 2);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, deltaY);
      await page.keyboard.up('Control');
    }
    await page.waitForTimeout(100);
  };
  // TC-DIAG-027: Ctrl + ホイールで、その図だけが拡大・縮小し、上限と下限で止まる。スクロール表示の図では、カーソルの下の点が保たれる
  const zoomRows = [];
  for (const mode of ['visual', 'fast']) {
    if (mode === 'fast') {
      await page.click('#btn-mode-fast');
      await waitRendered(page);
    }
    const start = await vpState(1);
    const other = await vpState(0);
    await ctrlWheelOn(1, -300);
    const zoomedIn = await vpState(1);
    await ctrlWheelOn(1, -500, 12);
    const maxed = await vpState(1);
    await ctrlWheelOn(1, 500, 20);
    const minned = await vpState(1);
    const otherAfter = await vpState(0);
    // 0 の図（スクロール表示）の、表示枠の中央の点で拡大する
    await page.locator(vpSel(0)).scrollIntoViewIfNeeded();
    const vbox = await page.locator(vpSel(0)).boundingBox();
    const box = await page.locator(`${vpSel(0)} > svg`).boundingBox();
    const px = vbox.x + vbox.width / 2;
    const py = box.y + box.height / 2;
    const fx = (px - box.x) / box.width;
    await page.mouse.move(px, py);
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -300);
    await page.keyboard.up('Control');
    await page.waitForTimeout(100);
    const box2 = await page.locator(`${vpSel(0)} > svg`).boundingBox();
    const anchorDx = Math.round(Math.abs(box2.x + box2.width * fx - px));
    const anchorDy = Math.round(Math.abs(box2.y + box2.height / 2 - py));
    const anchorGrew = box2.width > box.width * 1.3;
    // プレビューのスクロールが端に達したときは、縦方向の点を保てない（スクロールできる範囲までしか動かせない）
    const atScrollEdge = await page.evaluate(sel => {
      const sc = findScrollParent(document.querySelector(sel));
      return sc.scrollTop <= 0 || sc.scrollTop >= sc.scrollHeight - sc.clientHeight - 1;
    }, vpSel(0));
    const pageZoom = await page.evaluate(() => window.visualViewport.scale);
    zoomRows.push({ mode, start, zoomedIn, maxed, minned, anchorDx, anchorDy, anchorGrew, atScrollEdge, pageZoom,
      pass: zoomedIn.zoomed && zoomedIn.width > start.width * 1.4 && zoomedIn.activeScale.length === 0
        && Math.abs(maxed.width - maxed.vbWidth * 4) <= 3 && Math.abs(minned.width - minned.vbWidth * 0.25) <= 2
        && otherAfter.width === other.width && !otherAfter.zoomed
        && anchorGrew && anchorDx <= 3 && (anchorDy <= 3 || atScrollEdge) && pageZoom === 1 });
    // 次のモードの確認のため、倍率を戻す
    await page.click(`#preview-scroll [data-action="scale-fit"][data-index="0"]`);
    await page.click(`#preview-scroll [data-action="scale-fit"][data-index="1"]`);
  }
  record('TC-DIAG-027', zoomRows.every(r => r.pass), JSON.stringify(zoomRows));

  // TC-DIAG-028: Fit / 1:1 を選ぶと Ctrl + ホイールの倍率を解除する。ホイールだけ（Ctrl なし）では倍率を変えない。発表中は受け付けない
  const fitState = await vpState(1);
  await ctrlWheelOn(1, -300);
  const zoomedForFit = await vpState(1);
  await page.click(`#preview-scroll [data-action="scale-fit"][data-index="1"]`);
  const backToFit = await vpState(1);
  await ctrlWheelOn(1, -300);
  await page.click(`#preview-scroll [data-action="scale-actual"][data-index="1"]`);
  const backToActual = await vpState(1);
  await page.click(`#preview-scroll [data-action="scale-fit"][data-index="1"]`);
  const plainBefore = await vpState(1);
  const b = await center(1);
  await page.mouse.move(b.x, b.y);
  await page.mouse.wheel(0, -300);
  await page.waitForTimeout(100);
  const plainAfter = await vpState(1);
  await page.evaluate(() => document.documentElement.classList.add('is-stage-show'));
  const showBefore = await vpState(1);
  await page.locator(vpSel(1)).scrollIntoViewIfNeeded();
  const b2 = await center(1);
  await page.mouse.move(b2.x, b2.y);
  await page.keyboard.down('Control');
  await page.mouse.wheel(0, -300);
  await page.keyboard.up('Control');
  const showAfter = await vpState(1);
  await page.evaluate(() => document.documentElement.classList.remove('is-stage-show'));
  record('TC-DIAG-028', zoomedForFit.zoomed && !backToFit.zoomed && backToFit.width === fitState.width && backToFit.activeScale.join() === 'scale-fit'
    && !backToActual.zoomed && Math.abs(backToActual.width - backToActual.vbWidth) <= 2 && backToActual.activeScale.join() === 'scale-actual'
    && !plainAfter.zoomed && plainAfter.width === plainBefore.width && !showAfter.zoomed && showAfter.width === showBefore.width
    && page.consoleErrors.length === 0,
  JSON.stringify({ fitState, zoomedForFit, backToFit, backToActual, plainBefore, plainAfter, showBefore, showAfter, errors: page.consoleErrors }));
  await page.context().close();
}

// ローカルの画像（TC-MD-013〜015）

module.exports = {
  testDiagramRendering,
  testEdgeStyle,
  testEditFollow,
  testSyntaxErrorCleanup,
  testDiagramLongLabel,
  testDiagramUserStyles,
  testStyleBar,
  testDiagramPanZoom
};
