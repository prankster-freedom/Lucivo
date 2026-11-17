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
  selectScale,
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

function luminance(c) {
  const m = (c || '').match(/[\d.]+/g);
  if (!m) return null;
  const [r, g, b] = m.map(Number);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

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
  await selectScale(page, '#standard-doc-container [data-action="scale-actual"][data-index="0"]');
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
    camelText: camel.color, camelLum: camel.color && +luminance(camel.color).toFixed(2), fixedHero: camel.hero, table
  };
  record('TC-DIAG-018', cards.length >= 3 && detail.cardsCenterBelow && detail.cardsMaxOverlap <= 2 && camel.found && detail.camelLum < 0.4 && !camel.hero && table.style !== 'none' && table.border !== table.slab, JSON.stringify(detail));

  // TC-DIAG-019 Dark の Visual Stage: カード背景が暗く、背景の上の線・文字が明るい（4 スタイル）
  const rows = [];
  for (const style of VISUAL_STYLES) {
    await setMode(page, { style, appearance: 'dark' });
    const colors = await page.evaluate(() => {
      const root = document.getElementById('visual-stage-container');
      const card = root.querySelector('.exhibition-diagram-card');
      const cs = getComputedStyle(card);
      const bg = (cs.backgroundImage + ' ' + cs.backgroundColor).match(/rgba?\([^)]+\)/g) || [];
      const opaque = bg.filter(c => { const a = c.match(/[\d.]+/g); return a.length < 4 || +a[3] > 0.5; });
      const svgOf = type => Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === type);
      const flow = svgOf('flowchart-v2'), cls = svgOf('classDiagram'), seq = svgOf('sequence');
      const edge = flow.querySelector('path.flowchart-link');
      const clsText = cls.querySelector('.nodeLabel, text');
      const lifeline = seq.querySelector('line[class~="200"], line[id^="actor"]');
      const msg = seq.querySelector('text.messageText');
      return {
        bg: opaque,
        edge: getComputedStyle(edge).stroke,
        classText: getComputedStyle(clsText).color === 'rgb(0, 0, 0)' ? getComputedStyle(clsText).fill : getComputedStyle(clsText).color,
        lifeline: getComputedStyle(lifeline).stroke,
        message: getComputedStyle(msg).fill
      };
    });
    const round2 = v => +v.toFixed(2);
    const r = {
      bgLum: round2(colors.bg.reduce((sum, c) => sum + luminance(c), 0) / colors.bg.length),
      edgeLum: round2(luminance(colors.edge)),
      classTextLum: round2(luminance(colors.classText)),
      lifelineLum: round2(luminance(colors.lifeline)),
      messageLum: round2(luminance(colors.message))
    };
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

  // TC-DIAG-032 2 段組みの右カラムの図のカードで、札（INFOGRAPHIC // 01）が 1 行に収まる（#153）
  await page.waitForFunction(() => document.querySelector('#visual-stage-container .exhibition-slab-split:not(.is-stacked) .exhibition-diagram-header'), null, { timeout: 5000 });
  const tag = await page.evaluate(() => {
    const slab = document.querySelector('#visual-stage-container .exhibition-slab-split:not(.is-stacked)');
    const header = slab.querySelector('.exhibition-diagram-header');
    const label = header.querySelector(':scope > div:first-child > span:last-child');
    const cs = getComputedStyle(label);
    const range = document.createRange();
    range.selectNodeContents(label);
    return { text: label.textContent.trim(), lines: range.getClientRects().length, whiteSpace: cs.whiteSpace, height: +label.getBoundingClientRect().height.toFixed(1), fontSize: parseFloat(cs.fontSize) };
  });
  record('TC-DIAG-032', tag.lines === 1 && tag.whiteSpace === 'nowrap' && tag.height <= tag.fontSize * 2, JSON.stringify(tag));

  // TC-DIAG-038 2 段組みの解説の置き方と、図の拡大の上限（DTP-VTPL-060, DD-DIAG-044, #146）
  const proseFit = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const slabs = Array.from(root.querySelectorAll('.exhibition-slab'));
    const findSlab = titleRe => slabs.find(s => { const h2 = s.querySelector('h2'); return h2 && titleRe.test(h2.textContent); });
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const measure = s => {
      const body = s.querySelector('.exhibition-slab-body').getBoundingClientRect();
      const prose = s.querySelector('.exhibition-slab-prose');
      const svg = s.querySelector('.exhibition-viewport > svg');
      const boxes = Array.from(prose.children).map(el => el.getBoundingClientRect());
      const round = v => +v.toFixed(1);
      return {
        stacked: s.classList.contains('is-stacked'),
        lead: !!prose.querySelector(':scope > .vs-lead'),
        above: round(Math.min(...boxes.map(b => b.top)) - body.top),
        below: round(body.bottom - Math.max(...boxes.map(b => b.bottom))),
        svgH: round(svg.getBoundingClientRect().height),
        naturalH: round(svg.viewBox.baseVal.height)
      };
    };
    window.__measureSplitProse = title => measure(findSlab(new RegExp(title)));
    return { rem, state12: measure(findSlab(/^STAGE \d+状態遷移図$/)), flow9: measure(findSlab(/フローチャート$/)), bigFlow23: measure(findSlab(/大きなフローチャート/)) };
  });
  // 画面より長い図（24 章）は、Canvas 表示の幅で 2 段組みになる。上の空きが上限で止まることを確かめる
  await page.click('[data-view-mode="canvas"]');
  await waitRendered(page);
  await page.waitForFunction(() => { const m = window.__measureSplitProse('大きな状態遷移図'); return !m.stacked && m.svgH > 0; }, null, { timeout: 10000 }).catch(() => {});
  proseFit.bigState24 = await page.evaluate(() => window.__measureSplitProse('大きな状態遷移図'));
  await page.click('[data-view-mode="split"]');
  await waitRendered(page);
  const offsetCap = 18 * proseFit.rem;
  const heightCap = 30 * proseFit.rem;
  // 上の空きは下の空きと同じ（中央）か、上限（--split-prose-offset）で止まる
  const centered = m => !m.stacked && (m.above <= offsetCap + 1) && (Math.abs(m.above - m.below) <= 2 || (Math.abs(m.above - offsetCap) <= 1 && m.below > m.above));
  // 等倍の幅は 1px 単位に切り上げるため、高さは 1% まで大きくなる
  const fitCapped = m => m.svgH <= Math.max(m.naturalH, heightCap) * 1.01 + 1;
  record('TC-DIAG-038',
    proseFit.state12.lead && !proseFit.flow9.lead
      && centered(proseFit.state12) && centered(proseFit.flow9) && centered(proseFit.bigState24)
      && proseFit.state12.above > 20 && Math.abs(proseFit.bigState24.above - offsetCap) <= 1
      && fitCapped(proseFit.state12) && fitCapped(proseFit.flow9)
      && proseFit.bigFlow23.stacked && proseFit.bigFlow23.above <= 1,
    JSON.stringify(proseFit));

  // 9 章の図を 1:1 に切り替えると 1 段組み（is-stacked）になり、Fit に戻すと 2 段組みに戻る
  await selectScale(page, '#visual-stage-container [data-action="scale-actual"][data-index="0"]');
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

  // TC-DIAG-033 Light の Visualモードのマインドマップ・タイムラインの枝の色が、誌面の淡い調子にそろう（4 スタイル。#148）
  const PALETTE_FIRST = { shapes: 'rgb(226, 149, 120)', cards: 'rgb(226, 149, 120)', circles: 'rgb(212, 93, 83)', editorial: 'rgb(214, 140, 140)' };
  const branchRows = [];
  for (const style of VISUAL_STYLES) {
    await setMode(page, { style, appearance: 'light' });
    const r = await page.evaluate(() => {
      const root = document.getElementById('visual-stage-container');
      const svgOf = type => Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === type);
      // 彩度の目安: RGB の最大と最小の差（0〜1）。蛍光の黄緑（rgb(212, 247, 48) など）は 0.8 前後になる
      const chroma = color => { const v = color.match(/[\d.]+/g).slice(0, 3).map(Number); return (Math.max(...v) - Math.min(...v)) / 255; };
      const fills = (svg, selector) => Array.from(svg.querySelectorAll(selector)).map(el => getComputedStyle(el).fill).filter(f => /^rgb/.test(f));
      const mind = svgOf('mindmap');
      const time = svgOf('timeline');
      const mindFills = fills(mind, '.mindmap-node:not(.section-root) :is(rect, path, circle, polygon)');
      const timeFills = fills(time, '.timeline-node :is(rect, path, circle, polygon)');
      const rootShape = mind.querySelector('.section-root :is(rect, path, circle, polygon)');
      return {
        mindCount: mindFills.length, timeCount: timeFills.length,
        maxChroma: +Math.max(...mindFills.map(chroma), ...timeFills.map(chroma)).toFixed(2),
        distinct: new Set(mindFills).size,
        rootFill: getComputedStyle(rootShape).fill
      };
    });
    branchRows.push({ style, ok: r.mindCount >= 6 && r.timeCount >= 4 && r.maxChroma <= 0.5 && r.distinct >= 2 && r.rootFill === PALETTE_FIRST[style], ...r });
  }
  await setMode(page, { style: 'shapes', appearance: 'light' });
  record('TC-DIAG-033', branchRows.every(r => r.ok), JSON.stringify(branchRows));

  // TC-DIAG-034 円グラフの扇同士・凡例の色見本・扇の上の文字が見分けられる（4 スタイル × Light / Dark。#150）
  const pieRows = [];
  for (const appearance of ['light', 'dark']) {
    for (const style of VISUAL_STYLES) {
      await setMode(page, { style, appearance });
      const r = await page.evaluate(() => {
        const root = document.getElementById('visual-stage-container');
        const svg = Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === 'pie');
        const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
        const lum = color => { const [r, g, b] = rgb(color).map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
        const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
        const dist = (a, b) => Math.hypot(...rgb(a).map((v, i) => v - rgb(b)[i]));
        const slices = Array.from(svg.querySelectorAll('path.pieCircle'));
        const fills = slices.map(p => getComputedStyle(p).fill);
        const texts = Array.from(svg.querySelectorAll('text.slice')).map(t => getComputedStyle(t).fill);
        const pairs = [];
        fills.forEach((a, i) => fills.slice(i + 1).forEach(b => pairs.push(dist(a, b))));
        const swatches = Array.from(svg.querySelectorAll('g.legend rect')).map(rect => { const cs = getComputedStyle(rect); return { width: parseFloat(cs.strokeWidth), differs: cs.stroke !== cs.fill && cs.stroke !== 'none' }; });
        return {
          slices: fills.length,
          minDistance: Math.round(Math.min(...pairs)),
          opacity: Math.min(...slices.map(p => parseFloat(getComputedStyle(p).opacity))),
          minTextContrast: +Math.min(...fills.map((f, i) => contrast(f, texts[i]))).toFixed(2),
          swatchOutlined: swatches.length === fills.length && swatches.every(s => s.width >= 1 && s.differs)
        };
      });
      pieRows.push({ style, appearance, ok: r.slices === 4 && r.minDistance >= 40 && r.minTextContrast >= 3 && r.swatchOutlined && (appearance === 'dark' || r.opacity === 1), ...r });
    }
  }
  await setMode(page, { style: 'shapes', appearance: 'light' });
  record('TC-DIAG-034', pieRows.every(r => r.ok), JSON.stringify(pieRows));

  // TC-DIAG-035 ガント・タイムライン・ジャーニーの文字が読める大きさで、日付や登場人物の色が崩れない（#149）
  const readable = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const svgOf = type => Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === type);
    // 文字の大きさは、図そのものの大きさ（表示の倍率を掛ける前）で調べる。表示の倍率は画面の幅で変わるため
    const shown = (svg, selector) => Array.from(svg.querySelectorAll(selector)).filter(el => el.textContent.trim() && getComputedStyle(el).display !== 'none')
      .map(el => parseFloat(getComputedStyle(el).fontSize));
    const min = list => +Math.min(...list).toFixed(1);
    const gantt = svgOf('gantt');
    const timeline = svgOf('timeline');
    const journey = svgOf('journey');
    // 見えている日付同士が重ならない
    const ticks = Array.from(gantt.querySelectorAll('g.grid .tick text')).filter(t => getComputedStyle(t).display !== 'none').map(t => t.getBoundingClientRect()).sort((a, b) => a.left - b.left);
    const tickOverlap = ticks.some((r, i) => i > 0 && r.left < ticks[i - 1].right - 0.5);
    // バーの中の作業名は、バーの幅に収まる
    const taskOverflow = Array.from(gantt.querySelectorAll('text.taskText')).some(t => {
      const tr = t.getBoundingClientRect();
      return !Array.from(gantt.querySelectorAll('rect.task')).some(rect => { const r = rect.getBoundingClientRect(); return tr.left >= r.left - 1 && tr.right <= r.right + 1 && tr.top >= r.top - 1 && tr.bottom <= r.bottom + 1; });
    });
    const chroma = color => { const v = color.match(/[\d.]+/g).slice(0, 3).map(Number); return (Math.max(...v) - Math.min(...v)) / 255; };
    const box = svg => { const b = svg.getBBox(); const v = svg.viewBox.baseVal; return +((b.width * b.height) / (v.width * v.height)).toFixed(2); };
    return {
      ganttTask: min(shown(gantt, 'text.taskText, text.taskTextOutsideRight, text.taskTextOutsideLeft, text.sectionTitle')),
      ganttTick: min(shown(gantt, 'g.grid .tick text')),
      tickCount: ticks.length, tickOverlap, taskOverflow,
      timelineText: min(shown(timeline, 'text, tspan')),
      timelineFill: box(timeline),
      journeyText: min(shown(journey, 'foreignObject div.label')),
      journeyFill: box(journey),
      actorChroma: +Math.max(...Array.from(journey.querySelectorAll('circle[class^="actor-"]')).map(c => chroma(getComputedStyle(c).fill))).toFixed(2)
    };
  });
  record('TC-DIAG-035', readable.ganttTask >= 15 && readable.ganttTick >= 12 && readable.tickCount >= 8 && !readable.tickOverlap && !readable.taskOverflow
    && readable.timelineText >= 17 && readable.journeyText >= 17 && readable.timelineFill >= 0.8 && readable.journeyFill >= 0.8 && readable.actorChroma <= 0.5, JSON.stringify(readable));

  // TC-DIAG-036 4 象限チャートの点の名前が点と重ならず、4 つの象限の塗りが見分けられる（#151）
  const quadrant = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const svg = Array.from(root.querySelectorAll('[data-stage-index] > svg')).find(s => s.getAttribute('aria-roledescription') === 'quadrantChart');
    const points = Array.from(svg.querySelectorAll('g.data-point')).map(g => {
      const c = g.querySelector('circle').getBoundingClientRect();
      const t = g.querySelector('text').getBoundingClientRect();
      return { overlap: !(t.left >= c.right - 0.5 || t.right <= c.left + 0.5 || t.top >= c.bottom - 0.5 || t.bottom <= c.top + 0.5), near: Math.hypot((t.left + t.right) / 2 - (c.left + c.right) / 2, (t.top + t.bottom) / 2 - (c.top + c.bottom) / 2) < 80 };
    });
    const frame = svg.getBoundingClientRect();
    const fills = Array.from(svg.querySelectorAll('g.quadrant rect')).map(r => getComputedStyle(r).fill);
    const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number);
    const pairs = [];
    fills.forEach((a, i) => fills.slice(i + 1).forEach(b => pairs.push(Math.hypot(...rgb(a).map((v, k) => v - rgb(b)[k])))));
    return {
      points: points.length, overlap: points.some(p => p.overlap), near: points.every(p => p.near),
      inside: Array.from(svg.querySelectorAll('g.data-point text')).every(t => { const r = t.getBoundingClientRect(); return r.left >= frame.left - 1 && r.right <= frame.right + 1; }),
      quadrants: fills.length, minDistance: Math.round(Math.min(...pairs))
    };
  });
  record('TC-DIAG-036', quadrant.points === 3 && !quadrant.overlap && quadrant.near && quadrant.inside && quadrant.quadrants === 4 && quadrant.minDistance >= 20, JSON.stringify(quadrant));

  if (page.consoleErrors.length) record('TC-DIAG-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.close();
}

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
    const specPills = Array.from(root.querySelectorAll('.vs-cover-spec-pill')).map(el => el.getAttribute('data-spec-label'));
    const hasMetrics = slabs[4] ? slabs[4].querySelectorAll('.vs-metric-item .vs-metric-value').length === 4 : false;
    const hasCodeShowcase = slabs[13] ? !!slabs[13].querySelector('pre.vs-code-block .vs-code-copy-btn') : false;
    const hasTimeline = slabs[14] ? !!slabs[14].querySelector('ul.vs-points-timeline .vs-timeline-badge') : false;
    const hasCompare = slabs[15] ? !!(slabs[15].querySelector('.vs-compare-before') && slabs[15].querySelector('.vs-compare-after')) : false;
    // 16 章: 用語集（FR-035）、17 章: コールアウト（FR-034）
    const glossaryRows = slabs[16] ? slabs[16].querySelectorAll('dl.vs-glossary > .vs-gloss-row > dt + dd').length : 0;
    const calloutTypes = slabs[17] ? Array.from(slabs[17].querySelectorAll('.md-alert')).map(a => a.className.replace('md-alert md-alert-', '')) : [];
    return {
      slabCount: slabs.length,
      tpls,
      split9Stacked: splitStd ? splitStd.classList.contains('is-stacked') : true,
      split10Stacked: splitWide ? splitWide.classList.contains('is-stacked') : false,
      split10Contained: splitWide && wrap ? splitWide.getBoundingClientRect().width <= wrap.getBoundingClientRect().width + 1 : false,
      tableContained,
      specPills,
      hasMetrics,
      hasCodeShowcase,
      hasTimeline,
      hasCompare,
      glossaryRows,
      calloutTypes
    };
  });
  // STAGE 10（横に広い図）で Fit より 1:1（実寸）の方が大きく表示されること
  const wideFitWidth = await page.evaluate(() => {
    const svg = document.querySelector('#visual-stage-container [data-stage-index="1"] > svg');
    return svg ? svg.getBoundingClientRect().width : 0;
  });
  await selectScale(page, '#visual-stage-container [data-action="scale-actual"][data-index="1"]');
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

  const showcaseExpectedTpls = ['lead', 'lead', 'standard', 'points', 'points', 'standard', 'steps', 'steps', 'quote', 'split', 'split', 'standard', 'standard', 'standard', 'points', 'points', 'glossary', 'standard'];
  const showcaseOk = showcase.slabCount === 18
    && showcase.glossaryRows === 8
    && JSON.stringify(showcase.calloutTypes) === JSON.stringify(['tip', 'important', 'warning'])
    && JSON.stringify(showcase.tpls) === JSON.stringify(showcaseExpectedTpls)
    && !showcase.split9Stacked
    && showcase.split10Stacked
    && showcase.split10Contained
    && showcase.tableContained
    && showcase.specPills.length === 4
    && showcase.hasMetrics
    && showcase.hasCodeShowcase
    && showcase.hasTimeline
    && showcase.hasCompare
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
  await selectVisualStyle(page, 'shapes');
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

  // TC-VTPL-017（スラブ画像エクスポート）は、0.2.0 で章の画像化の操作部を外したため保留（CR-001）
  // TC-VTPL-024 章の画像化の操作部を出さない（DD-VTPL-124）
  await page.click('#btn-visual-mode');
  await page.waitForTimeout(300);
  const visualSlabs = await page.locator('#visual-stage-container .exhibition-slab').count();
  const visualActions = await page.locator('#visual-stage-container .slab-actions, #visual-stage-container .btn-copy-slab, #visual-stage-container .btn-export-slab').count();
  await page.click('#btn-mode-fast');
  await page.waitForTimeout(200);
  const fastActions = await page.locator('#standard-doc-container .slab-actions').count();
  record('TC-VTPL-024', visualSlabs > 0 && visualActions === 0 && fastActions === 0, JSON.stringify({ visualSlabs, visualActions, fastActions }));

  // TC-VTPL-018 KPI メトリクス・ショーケース（FR-027, DD-VTPL-035）
  await page.click('#btn-visual-mode');
  const SHOWCASE_EXT_MD = [
    '---',
    'title: Lucivo 新規訴求ショーケース',
    'description: KPI メトリクス・タイムライン・比較ペア・コードショーケースの検証',
    'author: Lucivo Design Team',
    'date: 2026-11-08',
    'tags: [Showcase, Metrics]',
    '---',
    '',
    '## 1. KPI メトリクス',
    '',
    '- **120 ms**: 初回描画のレスポンス時間',
    '- **99.9%**: オフライン環境での再現率',
    '- **4.2倍**: プレゼン準備の速度向上',
    '',
    '## 2. 通常の要点カード',
    '',
    '- **高速描画**: 待ち時間ゼロのプレビュー',
    '- **展示品質**: カンファレンス登壇に耐える組版',
    '',
    '## 3. ロードマップ（タイムライン）',
    '',
    '- **2026 Q1**: コア描画エンジンと4大スタイルの確立',
    '- **2026 Q3**: シグナル・ライトとステージ発表の統合',
    '- **2027 Q1**: KPIショーケースと質疑待機幕の展開',
    '',
    '## 4. 従来方式との比較（Before / After）',
    '',
    '- **Before**: スライド作成ツールへ手動で図表を貼り直し、修正のたびに二重管理が発生する',
    '- **After**: Markdown原稿をそのまま展示品質のステージ発表へ昇華し、単一ソースで完結する',
    '',
    '## 5. コード・ショーケースと図版',
    '',
    '```javascript',
    'const stage = LucivoStage.enterShow();',
    '```',
    '',
    '```mermaid',
    'flowchart LR',
    '  A[Markdown] --> B[Stage]',
    '```'
  ].join('\n');
  await setDocument(page, SHOWCASE_EXT_MD);
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(300);

  const vtpl18 = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab');
    const metricSlab = slabs[0];
    const normalSlab = slabs[1];
    const metricItems = Array.from(metricSlab.querySelectorAll('.vs-points > li.vs-metric-item'));
    const metricVals = Array.from(metricSlab.querySelectorAll('.vs-point-title.vs-metric-value'));
    const normalTitle = normalSlab.querySelector('.vs-point-title');
    const metricFontPx = metricVals[0] ? parseFloat(getComputedStyle(metricVals[0]).fontSize) : 0;
    const unitEls = Array.from(metricSlab.querySelectorAll('.vs-point-title.vs-metric-value .vs-metric-unit'));
    const unitFontPx = unitEls[0] ? parseFloat(getComputedStyle(unitEls[0]).fontSize) : 0;
    const metricDisplayOk = metricVals.every(el => {
      const cs = getComputedStyle(el);
      return cs.display === 'inline-block' && parseFloat(cs.marginRight) >= 6;
    });
    const normalFontPx = normalTitle ? parseFloat(getComputedStyle(normalTitle).fontSize) : 0;
    const tabular = metricVals.every(el => /tabular-nums/.test(getComputedStyle(el).fontVariantNumeric));
    const barAfter = metricVals.every(el => parseFloat(getComputedStyle(el, '::after').height) >= 2);
    const normalHasMetric = normalSlab.querySelectorAll('.vs-metric-item, .vs-metric-value').length;
    return {
      tpl: metricSlab.classList.contains('vs-tpl-points'),
      metricCount: metricItems.length,
      valCount: metricVals.length,
      unitCount: unitEls.length,
      metricFontPx,
      unitFontPx,
      metricDisplayOk,
      normalFontPx,
      tabular,
      barAfter,
      normalHasMetric
    };
  });
  await page.locator('#visual-stage-container .exhibition-slab').nth(0).screenshot({ path: path.join(SHOT_DIR, 'vtpl-kpi-metrics.png') });
  const vtpl18Ok = vtpl18.tpl && vtpl18.metricCount === 3 && vtpl18.valCount === 3 && vtpl18.unitCount === 3
    && vtpl18.metricFontPx >= vtpl18.normalFontPx * 1.4 && vtpl18.unitFontPx > 0 && vtpl18.unitFontPx <= vtpl18.metricFontPx * 0.7
    && vtpl18.metricDisplayOk && vtpl18.tabular && vtpl18.barAfter && vtpl18.normalHasMetric === 0;
  record('TC-VTPL-018', vtpl18Ok, JSON.stringify(vtpl18));

  // TC-VTPL-019 タイムライン・ロードマップ修飾（FR-029）と Before / After 比較ペアカード修飾（FR-030）
  const vtpl19 = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab');
    const timelineSlab = slabs[2];
    const compareSlab = slabs[3];
    const tlList = timelineSlab.querySelector('ul.vs-points');
    const tlItems = Array.from(timelineSlab.querySelectorAll('.vs-timeline-item'));
    const tlBadges = Array.from(timelineSlab.querySelectorAll('.vs-timeline-badge'));
    const cmpList = compareSlab.querySelector('ul.vs-points');
    const beforeCard = compareSlab.querySelector('li.vs-compare-before');
    const afterCard = compareSlab.querySelector('li.vs-compare-after');
    return {
      tlHasClass: tlList && tlList.classList.contains('vs-points-timeline'),
      tlCount: tlItems.length,
      tlBadgeCount: tlBadges.length,
      tlBadgeRadius: tlBadges[0] ? parseFloat(getComputedStyle(tlBadges[0]).borderTopLeftRadius) : 0,
      // バッジは本文と別の行にある。本文の書き出しの上端が、バッジの下端より下にあること（#147）
      tlBadgeOwnLine: tlItems.length > 0 && tlItems.every(li => {
        const badge = li.querySelector('.vs-timeline-badge');
        const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
        let node = walker.nextNode();
        while (node && (badge.contains(node) || !node.textContent.trim())) node = walker.nextNode();
        if (!node) return false;
        const range = document.createRange();
        range.selectNodeContents(node);
        return range.getClientRects()[0].top >= badge.getBoundingClientRect().bottom - 1;
      }),
      cmpHasClass: cmpList && cmpList.classList.contains('vs-points-compare'),
      hasBefore: Boolean(beforeCard),
      hasAfter: Boolean(afterCard),
      beforeBorderStyle: beforeCard ? getComputedStyle(beforeCard).borderTopStyle : '',
      afterBandHeight: afterCard ? parseFloat(getComputedStyle(afterCard, '::after').height) : 0
    };
  });
  await page.locator('#visual-stage-container .exhibition-slab').nth(2).screenshot({ path: path.join(SHOT_DIR, 'vtpl-timeline-cards.png') });
  await page.locator('#visual-stage-container .exhibition-slab').nth(3).screenshot({ path: path.join(SHOT_DIR, 'vtpl-compare-cards.png') });
  const vtpl19Ok = vtpl19.tlHasClass && vtpl19.tlCount === 3 && vtpl19.tlBadgeCount === 3 && vtpl19.tlBadgeRadius >= 10 && vtpl19.tlBadgeOwnLine
    && vtpl19.cmpHasClass && vtpl19.hasBefore && vtpl19.hasAfter
    && vtpl19.beforeBorderStyle === 'dashed' && vtpl19.afterBandHeight >= 5;
  record('TC-VTPL-019', vtpl19Ok, JSON.stringify(vtpl19));

  // TC-VTPL-027 章の中の小見出し（h1・h3〜h6）が本文に対して階層を持つ（DTP-004, #160）
  const headingScale = await page.evaluate(() => {
    const slab = document.querySelectorAll('#visual-stage-container .exhibition-slab')[2];
    const body = document.createElement('div');
    body.innerHTML = '<p>本文</p><h1>H1</h1><h3>H3</h3><h4>H4</h4><h5>H5</h5><h6>H6</h6>';
    slab.appendChild(body);
    const px = el => parseFloat(getComputedStyle(el).fontSize);
    const m = (el, side) => parseFloat(getComputedStyle(el)[side]);
    const base = px(body.querySelector('p'));
    const h = tag => body.querySelector(tag);
    const out = {
      h1: +(px(h('h1')) / base).toFixed(2), h3: +(px(h('h3')) / base).toFixed(2), h4: +(px(h('h4')) / base).toFixed(2),
      h5: +(px(h('h5')) / base).toFixed(2), h6: +(px(h('h6')) / base).toFixed(2),
      h3SpaceAbove: m(h('h3'), 'marginTop'), h3SpaceBelow: m(h('h3'), 'marginBottom'),
      h4SpaceAbove: m(h('h4'), 'marginTop'), h4SpaceBelow: m(h('h4'), 'marginBottom')
    };
    body.remove();
    return out;
  });
  record('TC-VTPL-027', headingScale.h3 >= 1.2 && headingScale.h1 === headingScale.h3 && headingScale.h4 >= 1.05 && headingScale.h4 < headingScale.h3
    && headingScale.h5 >= 1 && headingScale.h6 >= 1 && headingScale.h3SpaceAbove > headingScale.h3SpaceBelow * 2 && headingScale.h4SpaceAbove > headingScale.h4SpaceBelow * 2,
  JSON.stringify(headingScale));

  // TC-VTPL-020 コード・ショーケース（FR-031）と表紙スペックバッジ・ドットマトリクス透かし（FR-032）
  const vtpl20Before = await page.evaluate(() => {
    const hero = document.querySelector('#visual-stage-container .exhibition-hero.vs-cover');
    const texture = hero && hero.querySelector('.vs-cover-texture');
    const pills = hero ? Array.from(hero.querySelectorAll('.vs-cover-spec-pill')).map(p => [p.dataset.specKind, p.dataset.specLabel]) : [];
    const pre = document.querySelector('#visual-stage-container .exhibition-slab pre.vs-code-block');
    const caret = pre && pre.querySelector('.vs-code-caret');
    const copyBtn = pre && pre.querySelector('.vs-code-copy-btn');
    const maskOf = el => {
      if (!el) return '';
      const s = getComputedStyle(el);
      return (s.maskImage && s.maskImage !== 'none' ? s.maskImage : s.webkitMaskImage) || '';
    };
    return {
      textureMask: /dot-matrix-texture\.svg/.test(maskOf(texture)),
      pills,
      codeLang: pre ? pre.getAttribute('data-code-lang') : null,
      caretMask: /rounded-caret-glyph\.svg/.test(maskOf(caret)),
      copyLabelBefore: copyBtn ? copyBtn.getAttribute('data-copy-label') : null
    };
  });
  await page.click('#visual-stage-container .vs-code-copy-btn');
  await page.waitForTimeout(150);
  const vtpl20After = await page.evaluate(() => {
    const copyBtn = document.querySelector('#visual-stage-container .vs-code-copy-btn');
    return {
      copyLabelAfter: copyBtn ? copyBtn.getAttribute('data-copy-label') : null,
      isCopied: copyBtn ? copyBtn.classList.contains('is-copied') : false,
      toast: document.getElementById('toast-message').textContent
    };
  });
  const vtpl20Ok = vtpl20Before.textureMask
    && JSON.stringify(vtpl20Before.pills) === JSON.stringify([['author', 'Lucivo Design Team'], ['date', '2026-11-08'], ['stages', '5 STAGES'], ['figures', '1 FIGURE']])
    && vtpl20Before.codeLang === 'JS' && vtpl20Before.caretMask && vtpl20Before.copyLabelBefore === 'Copy'
    && vtpl20After.copyLabelAfter === 'Copied' && vtpl20After.isCopied && /コードをクリップボードにコピー/.test(vtpl20After.toast);
  record('TC-VTPL-020', vtpl20Ok, JSON.stringify({ vtpl20Before, vtpl20After }));

  // TC-VTPL-025 数式の補足グラフとラスター画像変換（FR-048, DD-VTPL-140〜144）
  const MATH_PLOT_TEST_MD = [
    '## 1. 数式の補足グラフ（インラインとブロック）',
    '',
    'インライン数式の正弦波 $y = \\sin(x)$ と二次関数 $f(x) = x^2 - 4x + 3$ には補足グラフが併記され、定数式 $E = mc^2$ は数式のみのまま表示されます。',
    '',
    '$$',
    '\\begin{aligned}',
    'y &= e^{-0.3x}\\sin(2x) \\\\',
    'y &= e^{-0.3x} \\\\',
    'y &= -e^{-0.3x}',
    '\\end{aligned}',
    '$$',
    '',
    '$$',
    'f(x) = \\frac{\\sin(x)}{x} \\quad (-4\\pi \\le x \\le 4\\pi)',
    '$$',
    '',
    '$$',
    '\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}',
    '$$',
    ''
  ].join('\n');

  await selectVisualStyle(page, 'shapes');
  await setDocument(page, MATH_PLOT_TEST_MD);
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForFunction(() => document.querySelectorAll('#visual-stage-container img.vs-math-plot-img').length === 4);
  await page.waitForTimeout(200);

  const mathPlotVisual = await page.evaluate(() => {
    const root = document.getElementById('visual-stage-container');
    const allMath = Array.from(root.querySelectorAll('.lucivo-math'));
    const inlinePlots = Array.from(root.querySelectorAll('.lucivo-math.is-inline-plot'));
    const blockPlots = Array.from(root.querySelectorAll('.lucivo-math.is-block-plot'));
    const plainMath = allMath.filter(el => !el.classList.contains('has-math-plot'));
    const checkImg = el => {
      const img = el.querySelector('img.vs-math-plot-img');
      const formula = el.querySelector('.vs-math-formula .katex');
      if (!img || !formula) return null;
      const fr = formula.getBoundingClientRect();
      const ir = img.getBoundingClientRect();
      return {
        isPng: /^data:image\/png;base64,/.test(img.getAttribute('src') || ''),
        srcLen: (img.getAttribute('src') || '').length,
        complete: img.complete,
        naturalW: img.naturalWidth,
        naturalH: img.naturalHeight,
        sideBySide: ir.left >= fr.right - 2,
        srcHead: (img.getAttribute('src') || '').slice(0, 120)
      };
    };
    return {
      totalMath: allMath.length,
      inlineCount: inlinePlots.length,
      blockCount: blockPlots.length,
      plainCount: plainMath.length,
      plainNoImg: plainMath.every(el => !el.querySelector('img') && !!el.querySelector('.katex')),
      inlines: inlinePlots.map(checkImg),
      blocks: blockPlots.map(checkImg)
    };
  });

  // 高速モードに切り替えると、ラスター画像は出ず通常の数式のみになる
  await page.click('#btn-mode-fast');
  await page.waitForTimeout(200);
  const mathPlotStandard = await page.evaluate(() => {
    const root = document.getElementById('standard-doc-container');
    return {
      totalMath: root.querySelectorAll('.lucivo-math .katex').length,
      plotImgs: root.querySelectorAll('img.vs-math-plot-img, .has-math-plot').length
    };
  });

  // 再度 Visualモードに切り替えて別スタイル（circles）を選ぶと、ラスター画像の配色（Data URL）が切り替わる
  await page.click('#btn-visual-mode');
  await page.waitForTimeout(200);
  const firstSrcShapes = await page.evaluate(() => {
    const img = document.querySelector('#visual-stage-container .lucivo-math.is-block-plot img.vs-math-plot-img');
    return img ? img.getAttribute('src') : '';
  });
  const plotSlab = page.locator('#visual-stage-container .exhibition-slab').first();
  await plotSlab.screenshot({ path: path.join(SHOT_DIR, 'vtpl-math-raster-plot.png') });

  await selectVisualStyle(page, 'circles');
  await page.waitForTimeout(200);
  const firstSrcCircles = await page.evaluate(() => {
    const img = document.querySelector('#visual-stage-container .lucivo-math.is-block-plot img.vs-math-plot-img');
    return img ? img.getAttribute('src') : '';
  });

  const vtpl25Ok = mathPlotVisual.totalMath === 6
    && mathPlotVisual.inlineCount === 2
    && mathPlotVisual.blockCount === 2
    && mathPlotVisual.plainCount === 2
    && mathPlotVisual.plainNoImg
    && mathPlotVisual.inlines.every(r => r && r.isPng && r.complete && r.naturalW === 312 && r.naturalH === 168 && r.sideBySide)
    && mathPlotVisual.blocks.every(r => r && r.isPng && r.complete && r.naturalW === 680 && r.naturalH === 400 && r.sideBySide)
    && mathPlotStandard.totalMath === 6
    && mathPlotStandard.plotImgs === 0
    && firstSrcShapes.length > 500
    && firstSrcCircles.length > 500
    && firstSrcShapes !== firstSrcCircles;
  record('TC-VTPL-025', vtpl25Ok, JSON.stringify({ mathPlotVisual, mathPlotStandard, styleChanged: firstSrcShapes !== firstSrcCircles }));

  // TC-VTPL-026 Visual モードの組版ディティール（見出し折り返し・標準リスト装飾・複数リスト並列グリッド）
  const detailsMd = [
    '# 組版ディティール確認',
    '',
    '## 【文書量比較】箇条書きの項目数・文字量が多い場合（標準リストへの自動切替）',
    '',
    '長文リストは標準リストで表示されます。',
    '',
    '- 項目1: 自動フォールバックの確認用長文アイテムです',
    '- 項目2: 自動フォールバックの確認用長文アイテムです',
    '- 項目3: 自動フォールバックの確認用長文アイテムです',
    '- 項目4: 自動フォールバックの確認用長文アイテムです',
    '- 項目5: 自動フォールバックの確認用長文アイテムです',
    '- 項目6: 自動フォールバックの確認用長文アイテムです',
    '- 項目7: 自動フォールバックの確認用長文アイテムです',
    '',
    '## リスト',
    '',
    '- 箇条書き',
    '  - 入れ子の箇条書き',
    '- 箇条書き2',
    '',
    '1. 番号付きリスト',
    '2. 番号付きリスト2',
    '',
    '- [x] 完了したタスク',
    '- [ ] 未完了のタスク'
  ].join('\n');
  await setDocument(page, detailsMd);
  const vtpl26 = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab');
    const h2 = slabs[0] ? slabs[0].querySelector('h2') : null;
    const h2Cs = h2 ? getComputedStyle(h2) : null;
    const fallbackUl = slabs[0] ? slabs[0].querySelector('ul') : null;
    const listSlab = slabs[1];
    const cards = listSlab ? Array.from(listSlab.querySelectorAll('.vs-list-grid > .vs-list-card')) : [];
    const cardTops = cards.map(c => Math.round(c.getBoundingClientRect().top));
    const sameRow = cardTops.length === 3 && Math.max(...cardTops) - Math.min(...cardTops) <= 4;
    const stdOl = listSlab ? listSlab.querySelector('ol') : null;
    const chk = listSlab ? listSlab.querySelector('input[type="checkbox"]') : null;
    return {
      wordBreak: h2Cs ? h2Cs.wordBreak : '',
      textWrap: h2Cs ? h2Cs.textWrap : '',
      fallbackListStyle: fallbackUl ? getComputedStyle(fallbackUl).listStyleType : '',
      olListStyle: stdOl ? getComputedStyle(stdOl).listStyleType : '',
      chkAppearance: chk ? getComputedStyle(chk).appearance : '',
      cardCount: cards.length,
      sameRow
    };
  });
  const vtpl26Ok = vtpl26.wordBreak === 'auto-phrase' && vtpl26.textWrap === 'balance'
    && vtpl26.fallbackListStyle === 'none' && vtpl26.olListStyle === 'none'
    && vtpl26.chkAppearance === 'none' && vtpl26.cardCount === 3 && vtpl26.sameRow;
  record('TC-VTPL-026', vtpl26Ok, JSON.stringify(vtpl26));

  if (page.consoleErrors.length) record('TC-VTPL-CONSOLE2', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
}

function inspectPdf(buffer) {
  const text = buffer.toString('latin1');
  const box = /\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(text);
  return {
    pages: (text.match(/\/Type\s*\/Page\b(?!s)/g) || []).length,
    landscape: box ? parseFloat(box[1]) > parseFloat(box[2]) : null
  };
}

// TC-MD-012 コールアウト、TC-VTPL-021 定義リスト型、TC-VTPL-022 印刷・PDF の配布資料（FR-034〜036）
async function testCalloutsGlossaryPrint(browser) {
  const page = await openStagePage(browser);
  const extraMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample_extra1.md'), 'utf8');
  // 同梱サンプルとして開いた扱いにする（11 章の画像を samples フォルダから読む。DD-FILE-081）
  await page.evaluate(() => { currentSampleFile = 'notation_sample_extra1.md'; });
  await setDocument(page, extraMd);

  // TC-MD-012 5 種類のコールアウト（高速モード・Visualモード × Light・Dark）。種類外・同じ行に文字が続く引用は通常の引用のまま
  const inspectAlerts = () => {
    const root = document.querySelector(state.isVisualMode ? '#visual-stage-container' : '#standard-doc-container');
    const alerts = Array.from(root.querySelectorAll('.md-alert'));
    const cs = el => getComputedStyle(el);
    return {
      types: alerts.map(a => a.className.replace('md-alert md-alert-', '')),
      labels: alerts.map(a => a.querySelector('.md-alert-title').textContent),
      shownLabels: alerts.map(a => cs(a.querySelector('.md-alert-title')).textTransform),
      markerLeft: alerts.some(a => /\[!/.test(a.textContent)),
      icons: alerts.every(a => { const i = a.querySelector('.md-alert-icon'); return i && cs(i).maskImage.includes('alert-') && cs(i).width === cs(i).height; }),
      borderColors: [...new Set(alerts.map(a => cs(a).borderLeftColor))].length,
      roles: alerts.every(a => a.getAttribute('role') === 'note'),
      importantList: alerts[2] ? alerts[2].querySelectorAll('li').length : 0,
      plainQuotes: Array.from(root.querySelectorAll('blockquote')).filter(b => /^\[!(NOTE|HINT)\]/.test(b.textContent.trim())).length
    };
  };
  const alertModes = [];
  for (const mode of [{ style: 'std', appearance: 'light' }, { style: 'std', appearance: 'dark' }, { style: 'cards', appearance: 'light' }, { style: 'editorial', appearance: 'dark' }]) {
    await setMode(page, mode);
    alertModes.push({ mode: `${mode.style}-${mode.appearance}`, ...(await page.evaluate(inspectAlerts)) });
  }
  await page.evaluate(() => Array.from(document.querySelectorAll('#visual-stage-container .md-alert')).pop().closest('.exhibition-slab').scrollIntoView());
  await page.waitForTimeout(300);
  await page.locator('#visual-stage-container .md-alert').first().locator('xpath=ancestor::section[1]').screenshot({ path: path.join(SHOT_DIR, 'md-alerts-editorial-dark.png') });
  // コールアウトだけの章は、ステートメント型にしない
  await setMode(page, { style: 'cards', appearance: 'light' });
  await setDocument(page, '# 題名\n\n## 注意\n\n> [!WARNING]\n> 電源を切ってから作業します。\n');
  const onlyAlertTpl = await page.evaluate(() => document.querySelector('#visual-stage-container .exhibition-slab[data-stage-no="01"]').className);
  const expectedTypes = ['note', 'tip', 'important', 'warning', 'caution'];
  const alertOk = alertModes.every(m => JSON.stringify(m.types) === JSON.stringify(expectedTypes)
    && JSON.stringify(m.labels) === JSON.stringify(['Note', 'Tip', 'Important', 'Warning', 'Caution'])
    && m.shownLabels.every(t => t === 'uppercase') && !m.markerLeft && m.icons && m.borderColors === 5 && m.roles
    && m.importantList === 2 && m.plainQuotes === 2)
    && /vs-tpl-standard/.test(onlyAlertTpl) && page.consoleErrors.length === 0;
  record('TC-MD-012', alertOk, JSON.stringify({ alertModes, onlyAlertTpl, consoleErrors: page.consoleErrors }));

  // TC-VTPL-021 定義リスト型: ダッシュ区切りだけを用語集にし、7 項目以上は広い版面で 2 段にする
  const glossaryMd = [
    '# 用語', '', '## 3 項目', '', '- **Slab** — 1 章を載せる面', '- **Scene** – 発表で 1 度に映す単位', '- **Signal `Light`** ― 図の構造に沿って伝わる光', '',
    '## コロン区切り', '', '- **Slab**: 1 章を載せる面', '- **Scene**: 発表で 1 度に映す単位', '',
    '## 8 項目', '', '用語の一覧です。', '', ...Array.from({ length: 8 }, (_, i) => `- **Term ${i + 1}** — 説明 ${i + 1}`), '',
    '## 入れ子', '', '- **Slab** — 面', '  - 入れ子の項目', '- **Scene** — 単位', ''
  ].join('\n');
  await setDocument(page, glossaryMd);
  const inspectGlossary = () => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab[data-stage-no]'));
    const tpl = s => Array.from(s.classList).find(c => c.startsWith('vs-tpl-')).slice(7);
    const dl = slabs[0].querySelector('dl.vs-glossary');
    const dl8 = slabs[2].querySelector('dl.vs-glossary');
    const cs = el => getComputedStyle(el);
    return {
      tpls: slabs.map(tpl),
      terms: dl ? Array.from(dl.querySelectorAll('dt')).map(d => d.textContent) : [],
      defs: dl ? Array.from(dl.querySelectorAll('dd')).map(d => d.textContent) : [],
      termCode: dl ? !!dl.querySelector('dt code') : false,
      termFont: dl ? cs(dl.querySelector('dt')).fontFamily : '',
      twoUp: dl8 ? dl8.classList.contains('is-two-up') : false,
      intro: slabs[2].querySelector(':scope > p') ? true : false,
      cols8: dl8 ? cs(dl8).gridTemplateColumns.split(' ').length : 0,
      rowCols: dl ? cs(dl.querySelector('.vs-gloss-row')).gridTemplateColumns.split(' ').length : 0
    };
  };
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(300);
  const glossaryWide = await page.evaluate(inspectGlossary);
  await page.locator('#visual-stage-container .exhibition-slab[data-stage-no="03"]').screenshot({ path: path.join(SHOT_DIR, 'vtpl-glossary-two-up.png') });
  await page.click('.view-mode-btn[data-view-mode="split"]');
  // Split 表示（版面 52rem 未満）は 1 段、スマートフォンの幅（版面 36rem 未満）は用語の下に説明を置く 1 列
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.waitForTimeout(300);
  const glossaryNarrow = await page.evaluate(inspectGlossary);
  await page.setViewportSize({ width: 560, height: 900 });
  await page.waitForTimeout(300);
  const glossaryPhone = await page.evaluate(inspectGlossary);
  await page.setViewportSize({ width: 1600, height: 900 });
  const glossaryOk = JSON.stringify(glossaryWide.tpls) === JSON.stringify(['glossary', 'points', 'glossary', 'standard'])
    && JSON.stringify(glossaryWide.terms) === JSON.stringify(['Slab', 'Scene', 'Signal Light'])
    && JSON.stringify(glossaryWide.defs) === JSON.stringify(['1 章を載せる面', '発表で 1 度に映す単位', '図の構造に沿って伝わる光'])
    && glossaryWide.termCode && /JetBrains Mono/.test(glossaryWide.termFont) && glossaryWide.intro
    && glossaryWide.twoUp && glossaryWide.cols8 === 2 && glossaryWide.rowCols === 2
    && glossaryNarrow.cols8 === 1 && glossaryNarrow.rowCols === 2
    && glossaryPhone.cols8 === 1 && glossaryPhone.rowCols === 1;
  record('TC-VTPL-021', glossaryOk, JSON.stringify({ glossaryWide, glossaryNarrow, glossaryPhone }));

  // TC-VTPL-022 印刷: 刷らないものを隠し、Visualモードは表紙と章を A4 横に 1 ページずつ、高速モードは A4 縦で刷る
  const printMd = '---\ntitle: 印刷の確認\n---\n# 印刷の確認\n\n## 第 1 章\n\n短い導入の文です。\n\n## 第 2 章\n\n- **A**: 一つ目\n- **B**: 二つ目\n\n## 第 3 章\n\n```js\nconst a = 1;\n```\n';
  await setDocument(page, printMd);
  // スポットライトを当てた状態から刷る。印刷の直前（beforeprint）に減光を外す
  await page.click('.vs-tpl-points li');
  await page.emulateMedia({ media: 'print' });
  const printed = await page.evaluate(() => {
    window.dispatchEvent(new Event('beforeprint'));
    const cs = sel => { const el = document.querySelector(sel); return el ? getComputedStyle(el) : null; };
    // 祖先で隠したものも含めて、描画される箱があるか
    const shown = sel => { const el = document.querySelector(sel); return !!el && el.getClientRects().length > 0; };
    const wrapChildren = Array.from(document.querySelectorAll('.exhibition-wrap > *'));
    return {
      hidden: ['header', '#pane-editor', '#telemetry-pill', '.slab-actions', '.vs-code-copy-btn'].filter(shown),
      preview: shown('#visual-stage-container'),
      pageNames: [...new Set(wrapChildren.map(el => getComputedStyle(el).page))],
      breaks: wrapChildren.map(el => getComputedStyle(el).breakBefore),
      scrollOverflow: cs('#preview-scroll').overflowY,
      animation: cs('.exhibition-slab').animationName,
      dimmed: document.querySelectorAll('.has-spotlight, .is-spotlight').length
    };
  });
  // media を null に戻す。'screen' を指定したままだと page.pdf() も画面の CSS で出力される
  await page.emulateMedia({ media: null });
  const visualPdf = inspectPdf(await page.pdf({ preferCSSPageSize: true }));
  await setMode(page, { style: 'std', appearance: 'light' });
  const fastPdf = inspectPdf(await page.pdf({ preferCSSPageSize: true }));
  // 保存メニューの「印刷 / PDF として保存…」でブラウザの印刷を開く
  await page.evaluate(() => { window.__printCalls = 0; window.print = () => { window.__printCalls++; }; });
  await page.click('#btn-save-menu');
  await page.click('#menu-print');
  const printCalls = await page.evaluate(() => ({ calls: window.__printCalls, menuClosed: document.getElementById('save-menu').classList.contains('hidden') }));
  const printOk = printed.hidden.length === 0 && printed.preview && JSON.stringify(printed.pageNames) === '["lucivo-visual"]'
    && JSON.stringify(printed.breaks) === JSON.stringify(['auto', 'page', 'page', 'page']) && printed.scrollOverflow === 'visible'
    && printed.animation === 'none' && printed.dimmed === 0
    && visualPdf.pages === 4 && visualPdf.landscape === true && fastPdf.pages >= 1 && fastPdf.landscape === false
    && printCalls.calls === 1 && printCalls.menuClosed;
  record('TC-VTPL-022', printOk, JSON.stringify({ printed, visualPdf, fastPdf, printCalls }));

  // TC-VTPL-028 改ページ: 版面は 16:10（A4 横・16:9 は余白で合わせる）。図のある章も 1 ページに収まり、
  // 見出しと札だけが前のページに残らない。見出しの下に数行分が残らなければ、見出しごと次のページへ送る（FR-036, DD-VTPL-134・135）
  const wideItemFast = await page.evaluate(() => document.getElementById('menu-print-wide').hidden);
  const tallFlow = ['```mermaid', 'flowchart TD', '  A[開始] --> B[手順 1] --> C[手順 2] --> D[手順 3] --> E[手順 4] --> F[手順 5] --> G[手順 6] --> H[終了]', '```'].join('\n');
  const pagingMd = [1, 2, 3].map(n => `## 第 ${n} 章\n\n図の前の短い説明です。\n\n${tallFlow}\n`).join('\n')
    + '\n## 第 4 章\n\n' + Array.from({ length: 6 }, (_, k) => `### 節 ${k + 1}\n\n` + '本文の段落です。'.repeat(40)).join('\n\n') + '\n';
  // 高速モード: 見出しの後ろに、数行分の高さの透明な箱があり、同じ量の負の余白で打ち消す
  await setDocument(page, pagingMd);
  await page.emulateMedia({ media: 'print' });
  const keep = await page.evaluate(() => {
    const h = document.querySelector('#standard-doc-container h3');
    const after = getComputedStyle(h, '::after');
    return { height: parseFloat(after.height), marginBottom: parseFloat(after.marginBottom), breakInside: getComputedStyle(h).breakInside };
  });
  await page.emulateMedia({ media: null });
  await setMode(page, { style: 'shapes', appearance: 'light' });
  const wideItemVisual = await page.evaluate(() => !document.getElementById('menu-print-wide').hidden);
  const slabCount = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-slab').length);
  for (let i = 0; i < slabCount; i++) await scrollToSlab(page, i);
  await page.waitForFunction(() => document.querySelectorAll('#visual-stage-container .exhibition-viewport > svg').length >= 3, null, { timeout: 30000 });
  await waitRendered(page);
  const pageBox = buffer => {
    const box = /\/MediaBox\s*\[\s*[\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)\s*\]/.exec(buffer.toString('latin1'));
    return box ? +(parseFloat(box[1]) / parseFloat(box[2])).toFixed(3) : null;
  };
  const a4Buffer = await page.pdf({ preferCSSPageSize: true });
  // 「印刷 / PDF として保存（16:9）…」は、印刷の間だけ 16:9 のページにする
  await page.click('#btn-save-menu');
  await page.click('#menu-print-wide');
  const wideDuring = await page.evaluate(() => ({ calls: window.__printCalls, cls: document.documentElement.classList.contains('is-print-wide') }));
  const wideBuffer = await page.pdf({ preferCSSPageSize: true });
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  const wideAfter = await page.evaluate(() => document.documentElement.classList.contains('is-print-wide'));
  const a4 = { ...inspectPdf(a4Buffer), ratio: pageBox(a4Buffer) };
  const wide = { ...inspectPdf(wideBuffer), ratio: pageBox(wideBuffer) };
  // 図の 3 章は 1 章 1 ページ。長文の第 4 章だけが複数ページにまたがる
  const pagingOk = wideItemFast && wideItemVisual
    && Math.abs(keep.height - 32 * 96 / 25.4) < 1 && Math.abs(keep.marginBottom + keep.height) < 1 && keep.breakInside === 'avoid'
    && slabCount === 4 && a4.ratio === 1.415 && Math.abs(wide.ratio - 16 / 9) < 0.01
    && a4.pages >= 4 && wide.pages >= 4 && a4.pages <= 6 && wide.pages <= 7
    && wideDuring.calls === 2 && wideDuring.cls && !wideAfter;
  record('TC-VTPL-028', pagingOk, JSON.stringify({ wideItemFast, wideItemVisual, keep, slabCount, a4, wide, wideDuring, wideAfter }));
  await page.context().close();
}

// TC-DIAG-022, 023 Split 表示の編集位置への追従（FR-037）。スクロールを即座に終えるため、動きを減らす設定で開く

// TC-DIAG-039・040 図の倍率（Fit / 1:n / n:1 / 100%）と、Expand の画面の倍率（FR-005, DD-DIAG-045）
const SCALE_MD = [
  '# 倍率', '',
  '## 縦長の図', '',
  '```mermaid', 'flowchart TD',
  '  A[開始] --> B[手順 1] --> C[手順 2] --> D[手順 3] --> E[手順 4] --> F[手順 5] --> G[手順 6] --> H[手順 7] --> I[手順 8] --> J[終了]',
  '```', '',
  '## 横長の図', '',
  '```mermaid', 'flowchart LR',
  '  A[開始] --> B[手順 1] --> C[手順 2] --> D[手順 3] --> E[手順 4] --> F[手順 5] --> G[終了]',
  '```', ''
].join('\n');

async function testDiagramScaleModes(browser) {
  const page = await openStagePage(browser, { viewport: { width: 1600, height: 900 } });
  await setDocument(page, SCALE_MD);
  await setMode(page, { style: 'shapes', appearance: 'light' });
  await page.click('[data-view-mode="canvas"]');
  for (const i of [0, 1]) await scrollToSlab(page, i);
  await page.waitForFunction(() => document.querySelectorAll('#visual-stage-container .exhibition-viewport > svg').length >= 2, null, { timeout: 30000 });
  await waitRendered(page);

  const measure = idx => page.evaluate(i => {
    const vp = document.querySelector(`#visual-stage-container [data-stage-index="${i}"]`);
    const svg = vp.querySelector(':scope > svg');
    const cs = getComputedStyle(vp);
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
    const r = svg.getBoundingClientRect();
    const picker = vp.parentElement.querySelector('.scale-picker');
    const toggle = picker.querySelector('.scale-more-toggle');
    const round = v => +v.toFixed(1);
    return {
      w: round(r.width), h: round(r.height), vbW: round(svg.viewBox.baseVal.width),
      cw: round(vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
      areaH: round(Math.max(16 * rem, window.innerHeight - 12 * rem)),
      minW: parseFloat(svg.style.minWidth) || 0,
      fitMax: parseFloat(svg.style.getPropertyValue('--fit-max-width')) || 1e9,
      scrolls: vp.scrollWidth > vp.clientWidth + 1,
      fit: vp.classList.contains('is-scale-fit'),
      active: Array.from(picker.querySelectorAll('.scale-btn.is-active')).map(b => b.dataset.action),
      toggle: toggle.textContent.trim(), toggleActive: toggle.classList.contains('is-active'),
      menuOpen: !picker.querySelector('.scale-menu').hidden, expanded: toggle.getAttribute('aria-expanded')
    };
  }, idx);
  const sel = (idx, action) => `#visual-stage-container [data-action="${action}"][data-index="${idx}"]`;

  const tallFit = await measure(0);
  await page.click(sel(0, 'scale-width'));
  const tallWidth = await measure(0);
  // プルダウンの開閉: 開くボタンで開き、Esc で閉じる
  await page.evaluate(() => document.querySelectorAll('#visual-stage-container .scale-more-toggle')[1].click());
  const menuOpened = await measure(1);
  await page.keyboard.press('Escape');
  const menuClosed = await measure(1);
  await selectScale(page, sel(1, 'scale-height'));
  const wideHeight = await measure(1);
  await selectScale(page, sel(1, 'scale-actual'));
  const wideActual = await measure(1);
  await page.click(sel(1, 'scale-fit'));
  const wideFit = await measure(1);
  const near = (a, b, tol = 2) => Math.abs(a - b) <= tol;
  const inline = {
    tallFit: tallFit.fit && tallFit.active.join() === 'scale-fit' && tallFit.w <= tallFit.cw + 1 && (tallFit.h <= tallFit.areaH + 2 || near(tallFit.w, tallFit.minW)),
    tallWidth: tallWidth.active.join() === 'scale-width' && near(tallWidth.w, Math.min(tallWidth.cw, tallWidth.fitMax)) && tallWidth.h > tallFit.h,
    menu: menuOpened.menuOpen && menuOpened.expanded === 'true' && !menuClosed.menuOpen && menuClosed.expanded === 'false',
    wideHeight: near(wideHeight.h, wideHeight.areaH) && wideHeight.scrolls && wideHeight.toggle === 'n:1 ▾' && wideHeight.toggleActive && !wideHeight.menuOpen,
    wideActual: near(wideActual.w, wideActual.vbW) && wideActual.toggle === '100% ▾' && wideActual.active.join() === 'scale-actual',
    wideFit: wideFit.w <= wideFit.cw + 1 && wideFit.h <= wideFit.areaH + 2 && wideFit.toggle === '▾' && !wideFit.toggleActive
  };
  record('TC-DIAG-039', Object.values(inline).every(Boolean) && page.consoleErrors.length === 0,
    JSON.stringify({ inline, tallFit, tallWidth, wideHeight, wideActual, wideFit, errors: page.consoleErrors }));

  // Expand の画面: 同じ部品があり、描画領域（#zoom-viewport の内側）に対して倍率を合わせる
  const zoomMeasure = () => page.evaluate(() => {
    const vp = document.getElementById('zoom-viewport');
    const svg = document.querySelector('#zoom-canvas svg');
    const cs = getComputedStyle(vp);
    const r = svg.getBoundingClientRect();
    const round = v => +v.toFixed(1);
    return {
      open: !document.getElementById('zoom-modal').classList.contains('hidden'),
      w: round(r.width), h: round(r.height), vbW: round(svg.viewBox.baseVal.width),
      cw: round(vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)),
      ch: round(vp.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)),
      active: Array.from(document.querySelectorAll('#zoom-scale-picker .scale-btn.is-active')).map(b => b.dataset.action),
      menuOpen: !document.querySelector('#zoom-scale-picker .scale-menu').hidden
    };
  });
  await page.click('#visual-stage-container [data-action="zoom"][data-index="0"]');
  await page.waitForTimeout(300);
  const zTallFit = await zoomMeasure();
  await page.click('#zoom-close-btn');
  await page.click('#visual-stage-container [data-action="zoom"][data-index="1"]');
  await page.waitForTimeout(300);
  const zFit = await zoomMeasure();
  await page.click('#zoom-scale-picker [data-action="scale-width"]');
  const zWidth = await zoomMeasure();
  await selectScale(page, '#zoom-scale-picker [data-action="scale-height"]');
  const zHeight = await zoomMeasure();
  await selectScale(page, '#zoom-scale-picker [data-action="scale-actual"]');
  const zActual = await zoomMeasure();
  // プルダウンを開いて Esc を押すと、プルダウンだけが閉じ、Expand の画面は開いたまま
  await page.click('#zoom-scale-picker .scale-more-toggle');
  await page.keyboard.press('Escape');
  const zEsc = await zoomMeasure();
  await page.click('#zoom-close-btn');
  const zoom = {
    tallFit: zTallFit.open && zTallFit.active.join() === 'scale-fit' && near(zTallFit.h, zTallFit.ch, 3) && zTallFit.w <= zTallFit.cw + 2,
    fit: zFit.active.join() === 'scale-fit' && near(zFit.w, zFit.cw, 3) && zFit.h <= zFit.ch + 2,
    width: zWidth.active.join() === 'scale-width' && near(zWidth.w, zWidth.cw, 3),
    height: zHeight.active.join() === 'scale-height' && near(zHeight.h, zHeight.ch, 3) && zHeight.w > zHeight.cw,
    actual: zActual.active.join() === 'scale-actual' && near(zActual.w, zActual.vbW, 2),
    esc: zEsc.open && !zEsc.menuOpen
  };
  record('TC-DIAG-040', Object.values(zoom).every(Boolean) && page.consoleErrors.length === 0,
    JSON.stringify({ zoom, zTallFit, zFit, zWidth, zHeight, zActual, errors: page.consoleErrors }));
  await page.context().close();
}

module.exports = {
  testDiagramScaleModes,
  testVisualStageQuality,
  testVisualTemplates,
  testCoverAndTables,
  testCalloutsGlossaryPrint
};
