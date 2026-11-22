/**
 * 性能の予算（#256）を E2E で測るスイート（TC-PERF-008）。
 * - 高速モード / Visualモード（4 スタイル）の開く時間
 * - 長文での 1 文字入力から表示反映までの時間
 * - 長文スクロール中の長いタスク（50ms 以上）の数と合計時間
 * 計測結果は work/test/perf-budget.json に書き出し、tests/perf-baseline.json と比較する。
 */
const path = require('path');
const fs = require('fs');
const {
  ROOT_DIR,
  APP_DIR,
  OUT_DIR,
  VISUAL_STYLES,
  record,
  openApp,
  selectVisualStyle
} = require('./helpers.cjs');

const BASELINE_PATH = path.join(ROOT_DIR, 'tests', 'perf-baseline.json');
const BUDGET_OUT_PATH = path.join(OUT_DIR, 'perf-budget.json');

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : +((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1);
}

function buildLongPerfDoc(chapters = 40) {
  const parts = ['# 性能計測用長文ドキュメント\n'];
  for (let i = 1; i <= chapters; i++) {
    parts.push(`## ${i}. 第 ${i} 章のテーマ\n`);
    parts.push(`これは第 ${i} 章の解説文です。十分な文字数と段落構造を持たせて、レイアウトと再描画の負荷を計測します。\n`);
    if (i % 4 === 1) {
      parts.push('- 要点 1: 構造を保つ\n- 要点 2: 描画を軽く保つ\n- 要点 3: 見た目を崩さない\n');
    } else if (i % 4 === 2) {
      parts.push('1. 手順 A: 入力を受け取る\n2. 手順 B: 差分を計算する\n3. 手順 C: 画面を更新する\n');
    } else if (i % 4 === 3) {
      parts.push(`\`\`\`mermaid\nflowchart LR\n  A${i}[開始] --> B${i}[処理]\n  B${i} --> C${i}[完了]\n\`\`\`\n`);
    } else {
      parts.push(`> 第 ${i} 章のステートメント: 品質と軽快さを両立します。\n`);
    }
  }
  return parts.join('\n');
}

async function measureOpenTime(browser, mdText, { visualStyle = null } = {}) {
  const page = await openApp(browser);
  await page.setViewportSize({ width: 1440, height: 900 });
  if (visualStyle) {
    await selectVisualStyle(page, visualStyle);
  }
  const ms = await page.evaluate(async text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    const t0 = performance.now();
    renderApp();
    // 図や非同期描画の完了（telemetry-status が Rendering でなくなる）＋次フレームまで待つ
    await new Promise(resolve => {
      const check = () => {
        const status = document.getElementById('telemetry-status')?.textContent || '';
        if (!/Rendering/.test(status)) {
          requestAnimationFrame(() => resolve());
          return;
        }
        setTimeout(check, 16);
      };
      check();
    });
    return +(performance.now() - t0).toFixed(1);
  }, mdText);
  const errors = [...page.consoleErrors];
  await page.close();
  return { ms, errors };
}

async function measureInputAndScroll(browser, longMd, { visualStyle = null, runs = 3 } = {}) {
  const page = await openApp(browser);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.click('.view-mode-btn[data-view-mode="split"]');
  if (visualStyle) {
    await selectVisualStyle(page, visualStyle);
  }

  // 初回表示を完了させる
  await page.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, longMd);
  await page.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  await page.waitForTimeout(200);

  // 1 文字入力から表示反映までの時間を複数回計測
  const inputRuns = [];
  for (let i = 0; i < runs; i++) {
    const ms = await page.evaluate(async idx => {
      const editor = document.getElementById('markdown-editor');
      const marker = '## 20. 第 20 章のテーマ';
      const pos = editor.value.indexOf(marker);
      if (pos >= 0) {
        const before = editor.value.slice(0, pos + marker.length);
        const after = editor.value.slice(pos + marker.length);
        editor.value = `${before}${idx % 2 === 0 ? '!' : ''}${after.replace(/^!/, '')}`;
      }
      const t0 = performance.now();
      renderApp();
      await new Promise(resolve => {
        const check = () => {
          const status = document.getElementById('telemetry-status')?.textContent || '';
          if (!/Rendering/.test(status)) {
            requestAnimationFrame(() => resolve());
            return;
          }
          setTimeout(check, 8);
        };
        check();
      });
      return +(performance.now() - t0).toFixed(1);
    }, i);
    inputRuns.push(ms);
    await page.waitForTimeout(50);
  }

  // スクロール中の長いタスク（50ms 以上）を計測
  const scrollMetrics = await page.evaluate(async () => {
    const scroller = document.getElementById('preview-scroll');
    const longTasks = [];
    let observer = null;
    if (typeof PerformanceObserver === 'function') {
      try {
        observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            longTasks.push(entry.duration);
          }
        });
        observer.observe({ type: 'longtask', buffered: false });
      } catch (_) {
        observer = null;
      }
    }

    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const steps = 10;
    for (let s = 1; s <= steps; s++) {
      scroller.scrollTop = Math.round((maxScroll * s) / steps);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    }
    await new Promise(r => setTimeout(r, 100));
    if (observer) observer.disconnect();

    const totalMs = +longTasks.reduce((a, b) => a + b, 0).toFixed(1);
    return {
      count: longTasks.length,
      totalMs,
      maxMs: longTasks.length ? +Math.max(...longTasks).toFixed(1) : 0
    };
  });

  const errors = [...page.consoleErrors];
  await page.close();
  return { inputRuns, inputMedianMs: median(inputRuns), scroll: scrollMetrics, errors };
}

async function testPerfBudget(browser) {
  const notationMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample.md'), 'utf8');
  const visualMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  const longMd = buildLongPerfDoc(40);
  const allErrors = [];

  // 1. 高速モード: 開く時間（3 回の中央値）
  const fastOpenRuns = [];
  for (let i = 0; i < 3; i++) {
    const r = await measureOpenTime(browser, notationMd);
    fastOpenRuns.push(r.ms);
    allErrors.push(...r.errors);
  }

  // 2. Visualモード 4 スタイル: 開く時間（各スタイル 2 回計測の中央値、代表 shapes は 3 回）
  const visualOpen = {};
  for (const style of VISUAL_STYLES) {
    const n = style === 'shapes' ? 3 : 2;
    const runs = [];
    for (let i = 0; i < n; i++) {
      const r = await measureOpenTime(browser, visualMd, { visualStyle: style });
      runs.push(r.ms);
      allErrors.push(...r.errors);
    }
    visualOpen[style] = { medianMs: median(runs), runs };
  }

  // 3. 高速モード長文: 1 文字入力反映 & スクロール Long Task
  const fastLong = await measureInputAndScroll(browser, longMd, { runs: 3 });
  allErrors.push(...fastLong.errors);

  // 4. Visualモード長文（shapes）: 1 文字入力反映 & スクロール Long Task
  const visualLong = await measureInputAndScroll(browser, longMd, { visualStyle: 'shapes', runs: 3 });
  allErrors.push(...visualLong.errors);

  const metrics = {
    fastOpenMs: median(fastOpenRuns),
    visualOpenShapesMs: visualOpen.shapes.medianMs,
    visualOpenCardsMs: visualOpen.cards.medianMs,
    visualOpenCirclesMs: visualOpen.circles.medianMs,
    visualOpenEditorialMs: visualOpen.editorial.medianMs,
    fastInputMs: fastLong.inputMedianMs,
    visualInputMs: visualLong.inputMedianMs,
    fastScrollLongTaskCount: fastLong.scroll.count,
    fastScrollLongTaskMs: fastLong.scroll.totalMs,
    visualScrollLongTaskCount: visualLong.scroll.count,
    visualScrollLongTaskMs: visualLong.scroll.totalMs
  };

  let baseline = null;
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    } catch (_) {
      baseline = null;
    }
  }

  const comparisons = {};
  for (const [key, value] of Object.entries(metrics)) {
    const baseVal = baseline && typeof baseline[key] === 'number' ? baseline[key] : null;
    const delta = baseVal !== null ? +(value - baseVal).toFixed(1) : null;
    const pct = baseVal !== null && baseVal > 0 ? +(((value - baseVal) / baseVal) * 100).toFixed(1) : null;
    comparisons[key] = { current: value, baseline: baseVal, delta, pct };
  }

  const report = {
    measuredAt: new Date().toISOString(),
    metrics,
    comparisons,
    details: {
      fastOpenRuns,
      visualOpen,
      fastInputRuns: fastLong.inputRuns,
      visualInputRuns: visualLong.inputRuns,
      fastScroll: fastLong.scroll,
      visualScroll: visualLong.scroll
    }
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(BUDGET_OUT_PATH, JSON.stringify(report, null, 2));

  const validMetrics = Object.values(metrics).every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0);
  record('TC-PERF-008', validMetrics && allErrors.length === 0, JSON.stringify(metrics));
  if (allErrors.length) record('TC-PERF-BUDGET-CONSOLE', false, JSON.stringify(allErrors));
}

async function testPerfOptimizations(browser) {
  // TC-PERF-009 (#255): resize の rAF 集約と updateAllSlabSplits の一括読み書き
  const page = await openApp(browser);
  await page.setViewportSize({ width: 1280, height: 800 });
  await selectVisualStyle(page, 'shapes');

  const md = [
    '# 幅変更のバッチテスト',
    '',
    '## 1. 狭い図の章',
    '',
    '左の解説文です。十分な説明を記載して 2 段組みにします。',
    '',
    '```mermaid',
    'flowchart LR',
    '  A[入力] --> B[出力]',
    '```',
    '',
    '## 2. 広い図の章',
    '',
    '左の解説文です。',
    '',
    '```mermaid',
    'flowchart LR',
    '  N1[非常に長いノード名1] --> N2[非常に長いノード名2] --> N3[非常に長いノード名3] --> N4[非常に長いノード名4] --> N5[非常に長いノード名5]',
    '```'
  ].join('\n');

  await page.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, md);
  await page.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  await page.waitForTimeout(200);

  const wideState = await page.evaluate(async () => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab-split'));
    const before = slabs.map(s => s.classList.contains('is-stacked'));
    // 連続で resize を発火しても rAF で 1 回に集約され、各スラブの scrollWidth が 1 回ずつしか読まれないか確認
    const vps = slabs.map(s => s.querySelector('.exhibition-viewport'));
    let scrollWidthReads = 0;
    const protoDesc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth');
    vps.forEach(vp => {
      Object.defineProperty(vp, 'scrollWidth', {
        configurable: true,
        get() {
          scrollWidthReads++;
          return protoDesc.get.call(this);
        }
      });
    });
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    vps.forEach(vp => { delete vp.scrollWidth; });
    const after = slabs.map(s => s.classList.contains('is-stacked'));
    return { slabCount: slabs.length, before, after, scrollWidthReads };
  });

  // 画面幅を狭くすると狭い図の章も is-stacked になることを確認
  await page.setViewportSize({ width: 320, height: 800 });
  await page.waitForTimeout(150);
  const narrowState = await page.evaluate(() => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab-split'));
    return slabs.map(s => s.classList.contains('is-stacked'));
  });

  record('TC-PERF-009',
    wideState.slabCount === 2 &&
    wideState.before[0] === false &&
    wideState.before[1] === true &&
    wideState.after[0] === false &&
    wideState.after[1] === true &&
    wideState.scrollWidthReads === 2 &&
    narrowState.every(Boolean),
    JSON.stringify({ wideState, narrowState })
  );
  await page.close();

  // TC-PERF-010 (#253): 画面外の手順型アニメーションを停止し、画面内に入ったら再開する
  const p10 = await openApp(browser);
  await p10.setViewportSize({ width: 1280, height: 700 });
  await selectVisualStyle(p10, 'shapes');
  const stepsMd = [
    '# 手順アニメーション停止テスト',
    '',
    ...Array.from({ length: 12 }, (_, i) => [
      `## ${i + 1}. 章 ${i + 1}`,
      '',
      '解説の段落です。十分な高さを確保して画面外に押し出します。',
      '',
      '1. 手順 A: 入力',
      '2. 手順 B: 処理',
      '3. 手順 C: 出力',
      ''
    ].join('\n'))
  ].join('\n');
  await p10.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, stepsMd);
  await p10.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  // 表紙の下にある最初のスラブを画面内にスクロールしてから初期状態を測る
  await p10.evaluate(() => {
    const lists = document.querySelectorAll('#visual-stage-container .vs-steps');
    lists[0].scrollIntoView({ block: 'center' });
  });
  await p10.waitForTimeout(250);

  const initialSteps = await p10.evaluate(() => {
    const lists = Array.from(document.querySelectorAll('#visual-stage-container .vs-steps'));
    const first = lists[0];
    const last = lists[lists.length - 1];
    const stateOf = el => ({
      offscreen: el.classList.contains('is-offscreen'),
      cometPlay: getComputedStyle(el, '::after').animationPlayState,
      stepPlay: getComputedStyle(el.querySelector('li'), '::after').animationPlayState,
      chevronPlay: el.querySelector('.vs-step-chevron') ? getComputedStyle(el.querySelector('.vs-step-chevron')).animationPlayState : null
    });
    return { count: lists.length, first: stateOf(first), last: stateOf(last) };
  });

  // 末尾の手順を画面内にスクロールする
  await p10.evaluate(() => {
    const lists = document.querySelectorAll('#visual-stage-container .vs-steps');
    lists[lists.length - 1].scrollIntoView({ block: 'center' });
  });
  await p10.waitForTimeout(250);

  const afterScrollSteps = await p10.evaluate(() => {
    const lists = Array.from(document.querySelectorAll('#visual-stage-container .vs-steps'));
    const first = lists[0];
    const last = lists[lists.length - 1];
    const stateOf = el => ({
      offscreen: el.classList.contains('is-offscreen'),
      cometPlay: getComputedStyle(el, '::after').animationPlayState,
      stepPlay: getComputedStyle(el.querySelector('li'), '::after').animationPlayState,
      chevronPlay: el.querySelector('.vs-step-chevron') ? getComputedStyle(el.querySelector('.vs-step-chevron')).animationPlayState : null
    });
    return { first: stateOf(first), last: stateOf(last) };
  });

  record('TC-PERF-010',
    initialSteps.count === 12 &&
    !initialSteps.first.offscreen &&
    initialSteps.first.cometPlay === 'running' &&
    initialSteps.last.offscreen &&
    initialSteps.last.cometPlay === 'paused' &&
    initialSteps.last.stepPlay === 'paused' &&
    initialSteps.last.chevronPlay === 'paused' &&
    afterScrollSteps.first.offscreen &&
    afterScrollSteps.first.cometPlay === 'paused' &&
    !afterScrollSteps.last.offscreen &&
    afterScrollSteps.last.cometPlay === 'running' &&
    afterScrollSteps.last.stepPlay === 'running' &&
    afterScrollSteps.last.chevronPlay === 'running',
    JSON.stringify({ initialSteps, afterScrollSteps })
  );
  await p10.close();

  // TC-PERF-011 (#252): 背景が動かないステートメント・要点カードで backdrop-filter を使わず静的な塗りにしていること
  const p11 = await openApp(browser);
  await p11.setViewportSize({ width: 1280, height: 800 });
  await selectVisualStyle(p11, 'shapes');
  await p11.evaluate(() => {
    document.documentElement.classList.add('has-ambient-effects');
    const editor = document.getElementById('markdown-editor');
    editor.value = [
      '# 静的な塗りテスト',
      '',
      '## 1. 要点カード',
      '',
      '- カード A: 内容です',
      '- カード B: 内容です',
      '',
      '## 2. ステートメント',
      '',
      '> 静的な塗りで質感を保ちます。'
    ].join('\n');
    lastLoadedMarkdown = editor.value;
    renderApp();
  });
  await p11.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  await p11.waitForTimeout(200);
  const blurCheck = await p11.evaluate(() => {
    const li = document.querySelector('#visual-stage-container .vs-points > li');
    const quote = document.querySelector('#visual-stage-container blockquote.vs-quote');
    const liCs = li ? getComputedStyle(li) : null;
    const quoteCs = quote ? getComputedStyle(quote) : null;
    return {
      liBlur: liCs ? liCs.backdropFilter : null,
      liBgImg: liCs ? liCs.backgroundImage !== 'none' : false,
      quoteBlur: quoteCs ? quoteCs.backdropFilter : null,
      quoteBgImg: quoteCs ? quoteCs.backgroundImage !== 'none' : false
    };
  });
  record('TC-PERF-011',
    blurCheck.liBlur === 'none' && blurCheck.liBgImg && blurCheck.quoteBlur === 'none' && blurCheck.quoteBgImg,
    JSON.stringify(blurCheck)
  );
  await p11.close();

  // TC-PERF-012 (#254): 多数のノードを持つ図で、影の filter 属性がノードごとではなくグループ 1 つに集約されること
  const p12 = await openApp(browser);
  await p12.setViewportSize({ width: 1280, height: 800 });
  const bigFlow = [
    '# 影グループ化テスト',
    '',
    '```mermaid',
    'flowchart LR',
    ...Array.from({ length: 19 }, (_, i) => `  N${i + 1}[ノード${i + 1}] --> N${i + 2}[ノード${i + 2}]`),
    '```'
  ].join('\n');
  await p12.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, bigFlow);
  await p12.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });

  const shadowResults = [];
  for (const style of VISUAL_STYLES) {
    await selectVisualStyle(p12, style);
    await p12.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
    await p12.waitForTimeout(100);
    const res = await p12.evaluate(() => {
      const svg = document.querySelector('#visual-stage-container .exhibition-viewport svg');
      const nodes = svg ? svg.querySelectorAll('g.node:not(.statediagram-cluster)').length : 0;
      const filtered = svg ? svg.querySelectorAll('[filter]').length : -1;
      return { nodes, filtered };
    });
    shadowResults.push({ style, ...res });
  }
  record('TC-PERF-012',
    shadowResults.length === 4 && shadowResults.every(r => r.nodes === 20 && r.filtered === 1),
    JSON.stringify(shadowResults)
  );
  await p12.close();

  // TC-PERF-013 (#251): Visualモードの章単位差分組み直し（DOM 保持・全体描画との完全一致）と content-visibility
  const p13 = await openApp(browser);
  await p13.setViewportSize({ width: 1280, height: 800 });
  await selectVisualStyle(p13, 'shapes');
  const visualSampleMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await p13.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, visualSampleMd);
  await p13.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  await p13.waitForTimeout(250);

  const visInc = await p13.evaluate(() => {
    const stripRuntimeLights = root => {
      const clone = root.cloneNode(true);
      clone.querySelectorAll('.signal-light-canvas').forEach(c => c.remove());
      clone.querySelectorAll('.has-signal-light').forEach(el => el.classList.remove('has-signal-light'));
      clone.querySelectorAll('.is-offscreen').forEach(el => el.classList.remove('is-offscreen'));
      clone.querySelectorAll('.vs-term-link').forEach(el => el.replaceWith(document.createTextNode(el.textContent || '')));
      clone.querySelectorAll('[data-term-node]').forEach(el => el.removeAttribute('data-term-node'));
      clone.normalize();
      return clone.innerHTML;
    };
    const root = document.getElementById('visual-stage-container');
    const heroBefore = root.querySelector('.exhibition-hero');
    const slabsBefore = Array.from(root.querySelectorAll('.exhibition-slab[data-stage-no]'));
    const firstSlabBefore = slabsBefore[0];
    const lastSlabBefore = slabsBefore[slabsBefore.length - 1];
    const lastH2Before = lastSlabBefore?.querySelector('h2[data-src-line]');
    const lastLineBefore = Number(lastH2Before?.dataset.srcLine || 0);

    const editor = document.getElementById('markdown-editor');
    const marker = '## 3.';
    const idx = editor.value.indexOf(marker);
    const lineEnd = editor.value.indexOf('\n', idx);
    const edited = `${editor.value.slice(0, lineEnd)}\n\nVisual 差分組み直しテストの追記行です。\n${editor.value.slice(lineEnd)}`;
    editor.value = edited;
    const tPatch = performance.now();
    renderApp();
    const patchMs = performance.now() - tPatch;

    const heroAfter = root.querySelector('.exhibition-hero');
    const slabsAfter = Array.from(root.querySelectorAll('.exhibition-slab[data-stage-no]'));
    const firstSlabAfter = slabsAfter[0];
    const lastSlabAfter = slabsAfter[slabsAfter.length - 1];
    const lastH2After = lastSlabAfter?.querySelector('h2[data-src-line]');
    const lastLineAfter = Number(lastH2After?.dataset.srcLine || 0);
    const patchHtml = stripRuntimeLights(root);
    const hasEditedText = root.textContent.includes('Visual 差分組み直しテストの追記行です。');

    // 空文書でキャッシュ破棄し、全体組み直しした DOM と比較
    editor.value = '';
    renderApp();
    editor.value = edited;
    const tFull = performance.now();
    renderApp();
    const fullMs = performance.now() - tFull;
    const fullHtml = stripRuntimeLights(root);

    return {
      sameHero: heroBefore !== null && heroBefore === heroAfter,
      sameFirstSlab: firstSlabBefore !== null && firstSlabBefore === firstSlabAfter,
      sameLastSlab: lastSlabBefore !== null && lastSlabBefore === lastSlabAfter,
      lineDelta: lastLineAfter - lastLineBefore,
      hasEditedText,
      htmlExactMatch: patchHtml === fullHtml,
      patchMs: +patchMs.toFixed(1),
      fullMs: +fullMs.toFixed(1)
    };
  });

  // 長文（25 章）での content-visibility: auto 適用と印刷・ステージ発表での解除を確認
  const longVisMd = [
    '# 長文 Visual テスト',
    '',
    ...Array.from({ length: 25 }, (_, i) => `## ${i + 1}. 章 ${i + 1}\n\n本文の段落 ${i + 1} です。\n`)
  ].join('\n');
  await p13.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, longVisMd);
  await p13.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  const cvScreen = await p13.evaluate(() => {
    const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
    const slabs = wrap ? Array.from(wrap.querySelectorAll(':scope > .exhibition-slab')) : [];
    const firstCs = slabs[0] ? getComputedStyle(slabs[0]) : null;
    const laterCs = slabs[10] ? getComputedStyle(slabs[10]) : null;
    return {
      hasClass: Boolean(wrap && wrap.classList.contains('has-content-visibility')),
      firstCv: firstCs ? firstCs.contentVisibility : null,
      laterCv: laterCs ? laterCs.contentVisibility : null,
      laterIntrinsic: laterCs ? laterCs.containIntrinsicBlockSize : null
    };
  });

  await p13.emulateMedia({ media: 'print' });
  const cvPrint = await p13.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-wrap > .exhibition-slab');
    return slabs[10] ? getComputedStyle(slabs[10]).contentVisibility : null;
  });
  await p13.emulateMedia({ media: 'screen' });

  const cvStageShow = await p13.evaluate(() => {
    document.documentElement.classList.add('is-stage-show');
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-wrap > .exhibition-slab');
    const cv = slabs[10] ? getComputedStyle(slabs[10]).contentVisibility : null;
    document.documentElement.classList.remove('is-stage-show');
    return cv;
  });

  // 短い文書では has-content-visibility が付かないこと
  await p13.evaluate(() => {
    const editor = document.getElementById('markdown-editor');
    editor.value = '# 短い文書\n\n## 1. 章 1\n\n本文です。\n';
    renderApp();
  });
  const shortHasCv = await p13.evaluate(() =>
    Boolean(document.querySelector('#visual-stage-container .exhibition-wrap.has-content-visibility'))
  );

  record('TC-PERF-013',
    visInc.sameHero &&
    visInc.sameFirstSlab &&
    visInc.sameLastSlab &&
    visInc.lineDelta === 3 &&
    visInc.hasEditedText &&
    visInc.htmlExactMatch &&
    cvScreen.hasClass &&
    cvScreen.firstCv === 'visible' &&
    cvScreen.laterCv === 'auto' &&
    cvPrint === 'visible' &&
    cvStageShow === 'visible' &&
    !shortHasCv,
    JSON.stringify({ visInc, cvScreen, cvPrint, cvStageShow, shortHasCv })
  );
  await p13.close();

  // TC-PERF-014 (#274): document に passive:false の wheel リスナーを置かないこと、および
  // Visualモードの resize 時に画面外（content-visibility: auto）スラブの強制レイアウトを避け、画面復帰時に遅延更新すること
  const ctx14 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx14.addInitScript(() => {
    window.__docWheelRegistrations = 0;
    const orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      if (this === document && type === 'wheel') {
        window.__docWheelRegistrations++;
      }
      return orig.call(this, type, listener, options);
    };
  });
  const p14 = await ctx14.newPage();
  const appUrl14 = 'file:///' + path.join(APP_DIR, 'index.html').replace(/\\/g, '/');
  await p14.goto(appUrl14);
  await p14.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
  await p14.click('.view-mode-btn[data-view-mode="canvas"]');
  await selectVisualStyle(p14, 'shapes');

  const longSplitMd = [
    '# 長文リサイズ遅延更新テスト',
    '',
    ...Array.from({ length: 28 }, (_, i) => [
      `## ${i + 1}. 章 ${i + 1}`,
      '',
      `第 ${i + 1} 章の解説文です。図と 2 段組みで表示します。`,
      '',
      '```mermaid',
      'flowchart LR',
      '  A[入力] --> B[出力]',
      '```',
      ''
    ].join('\n'))
  ].join('\n');

  await p14.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, longSplitMd);
  await p14.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 90000 });
  await p14.waitForTimeout(300);

  // 末尾の画面外スラブの scrollWidth 読み取り回数を監視した状態で幅を狭くする
  await p14.evaluate(() => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab-split'));
    const lastVp = slabs[slabs.length - 1]?.querySelector('.exhibition-viewport');
    window.__lastSlabScrollReads = 0;
    if (lastVp) {
      const desc = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollWidth');
      Object.defineProperty(lastVp, 'scrollWidth', {
        configurable: true,
        get() {
          window.__lastSlabScrollReads++;
          return desc.get.call(this);
        }
      });
    }
  });
  await p14.setViewportSize({ width: 320, height: 800 });
  await p14.waitForTimeout(200);

  const beforeScroll14 = await p14.evaluate(() => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab-split'));
    const firstStacked = slabs[0]?.classList.contains('is-stacked') || false;
    const lastVp = slabs[slabs.length - 1]?.querySelector('.exhibition-viewport');
    if (lastVp) delete lastVp.scrollWidth;
    return {
      docWheelRegs: window.__docWheelRegistrations,
      slabCount: slabs.length,
      firstStacked,
      lastSlabScrollReadsOnResize: window.__lastSlabScrollReads
    };
  });

  // 末尾スラブを画面内へスクロールし、contentvisibilityautostatechange で遅延更新されて is-stacked が付くか確認
  await p14.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab-split');
    slabs[slabs.length - 1].scrollIntoView({ block: 'center' });
  });
  await p14.waitForTimeout(250);
  const afterScroll14 = await p14.evaluate(() => {
    const slabs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-slab-split'));
    return {
      lastStackedAfterScroll: slabs[slabs.length - 1]?.classList.contains('is-stacked') || false
    };
  });

  record('TC-PERF-014',
    beforeScroll14.docWheelRegs === 0 &&
    beforeScroll14.slabCount === 28 &&
    beforeScroll14.firstStacked === true &&
    beforeScroll14.lastSlabScrollReadsOnResize === 0 &&
    afterScroll14.lastStackedAfterScroll === true,
    JSON.stringify({ beforeScroll14, afterScroll14 })
  );
  await ctx14.close();

  // TC-PERF-015 (#287): 表の包みとコールアウトを、Marked のレンダラーが最初から出力する。
  // DOM の形（従来の DOM の書き換えと同じ）、マーカーでない引用の保持、直接書いた HTML の表のフォールバック、
  // Visualモードの出力を確かめる
  const p15 = await openApp(browser);
  await p15.setViewportSize({ width: 1280, height: 900 });
  const render15 = async text => {
    await p15.evaluate(t => {
      const editor = document.getElementById('markdown-editor');
      editor.value = t;
      lastLoadedMarkdown = t;
      renderApp();
    }, text);
    await p15.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
    await p15.waitForTimeout(100);
  };
  const markdownDoc15 = [
    '# 表とコールアウト',
    '',
    '## 表',
    '',
    '| 列 A | 列 B |',
    '| :-- | :-- |',
    '| 1 | 2 |',
    '',
    '## 注記',
    '',
    '> [!NOTE]',
    '> 注記の本文です。',
    '',
    '> [!tip]',
    '> ヒントの本文です。',
    '',
    '> [!WARNING] 同じ行に本文が続く引用',
    '',
    '> 通常の引用です。',
    '',
    '> [!IMPORTANT]',
    '>',
    '> 空の段落のあとの本文です。'
  ].join('\n');
  const readShape15 = scope => p15.evaluate(sel => {
    const root = document.querySelector(sel);
    const tables = Array.from(root.querySelectorAll('table'));
    const alerts = Array.from(root.querySelectorAll('.md-alert'));
    const important = alerts.find(a => a.classList.contains('md-alert-important'));
    const afterTitle = important ? important.querySelector('.md-alert-title').nextElementSibling : null;
    return {
      tables: tables.length,
      wrapped: tables.every(t => t.parentElement && t.parentElement.classList.contains('table-container')),
      doubleWrapped: root.querySelectorAll('.table-container .table-container').length,
      alertTypes: alerts.map(a => a.className.replace('md-alert md-alert-', '')),
      roles: alerts.every(a => a.getAttribute('role') === 'note'),
      titles: alerts.map(a => a.querySelector(':scope > .md-alert-title').textContent),
      icons: alerts.every(a => a.querySelector(':scope > .md-alert-title > .md-alert-icon[aria-hidden="true"]')),
      noteText: (alerts.find(a => a.classList.contains('md-alert-note')) || { textContent: '' }).textContent,
      importantFirstBody: afterTitle ? { tag: afterTitle.tagName, text: afterTitle.textContent.trim() } : null,
      quotes: Array.from(root.querySelectorAll('blockquote')).map(q => q.textContent.trim()),
      leftoverMarker: /\[!(NOTE|TIP|IMPORTANT)\]/i.test(alerts.map(a => a.textContent).join('\n'))
    };
  }, scope);

  await render15(markdownDoc15);
  const fast15 = await readShape15('#standard-doc-container');

  // 直接書いた HTML の表も、Markdown の表と同じように包まれ、二重には包まれない
  const rawDoc15 = markdownDoc15 + '\n\n<table><tr><td>直接書いた表</td></tr></table>\n';
  await render15(rawDoc15);
  const raw15 = await p15.evaluate(() => {
    const root = document.getElementById('standard-doc-container');
    const tables = Array.from(root.querySelectorAll('table'));
    return {
      tables: tables.length,
      wrapped: tables.every(t => t.parentElement && t.parentElement.classList.contains('table-container')),
      doubleWrapped: root.querySelectorAll('.table-container .table-container').length
    };
  });

  await render15(markdownDoc15);
  await selectVisualStyle(p15, 'cards');
  await p15.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status').textContent), null, { timeout: 60000 });
  await p15.waitForTimeout(200);
  const visual15 = await readShape15('#visual-stage-container');

  const shapeOk15 = s =>
    s.tables === 1 && s.wrapped && s.doubleWrapped === 0 &&
    JSON.stringify(s.alertTypes) === JSON.stringify(['note', 'tip', 'important']) &&
    s.roles &&
    JSON.stringify(s.titles) === JSON.stringify(['Note', 'Tip', 'Important']) &&
    s.icons &&
    s.noteText.includes('注記の本文です。') &&
    s.importantFirstBody && s.importantFirstBody.tag === 'P' && s.importantFirstBody.text === '空の段落のあとの本文です。' &&
    s.quotes.length === 2 &&
    s.quotes.some(q => q.includes('[!WARNING] 同じ行に本文が続く引用')) &&
    s.quotes.some(q => q.includes('通常の引用です。')) &&
    !s.leftoverMarker;
  record('TC-PERF-015',
    shapeOk15(fast15) && raw15.tables === 2 && raw15.wrapped && raw15.doubleWrapped === 0 &&
    shapeOk15(visual15) && p15.consoleErrors.length === 0,
    JSON.stringify({ fast15, raw15, visual15, consoleErrors: p15.consoleErrors })
  );
  await p15.close();

  // TC-PERF-017 (#329): 脚注を含む文書での差分再描画（高速モード・Visualモード）と、
  // H2 見出し編集時の表紙 DOM 保持（目次タイトルその場更新）、および追従時の [data-src-line] 全文 DOM 再走査 0 回
  const p17 = await openApp(browser);
  await p17.setViewportSize({ width: 1280, height: 800 });

  const fnDocInitial = [
    '# 脚注と差分再描画の検証',
    '',
    '## 1. 第 1 章: 背景',
    '',
    '第 1 章の本文です[^a]。',
    '',
    '## 2. 第 2 章: 編集対象',
    '',
    '第 2 章の元の本文です。',
    '',
    '## 3. 第 3 章: 結論',
    '',
    '第 3 章の本文です[^b]。',
    '',
    '[^a]: 第 1 章の脚注テキスト。',
    '[^b]: 第 3 章の脚注テキスト。'
  ].join('\n');

  const fnDocEdited = fnDocInitial
    .replace('## 2. 第 2 章: 編集対象', '## 2. 第 2 章: 改題後の見出し')
    .replace('第 2 章の元の本文です。', '第 2 章の追記後の本文です。\n\n新しい段落を追加しました。');

  // 1) 高速モード（脚注あり）での差分再描画と DOM ノード参照保持
  await p17.evaluate(t => {
    const editor = document.getElementById('markdown-editor');
    editor.value = t;
    lastLoadedMarkdown = t;
    renderApp();
  }, fnDocInitial);
  await p17.waitForTimeout(100);

  const fastFnInc = await p17.evaluate(nextMd => {
    const std = document.getElementById('standard-doc-container');
    const firstH2Before = std.querySelectorAll('h2')[0];
    const thirdH2Before = std.querySelectorAll('h2')[2];
    const fnSectionBefore = std.querySelector('.lucivo-footnotes');
    const lineBefore = Number(thirdH2Before.getAttribute('data-src-line'));

    let containerSrcLineQsaCalls = 0;
    const origQsa = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function(sel) {
      if (this === std && typeof sel === 'string' && sel.includes('data-src-line')) containerSrcLineQsaCalls++;
      return origQsa.call(this, sel);
    };

    const editor = document.getElementById('markdown-editor');
    editor.value = nextMd;
    isInputRender = true;
    renderApp();

    Element.prototype.querySelectorAll = origQsa;

    const firstH2After = std.querySelectorAll('h2')[0];
    const thirdH2After = std.querySelectorAll('h2')[2];
    const fnSectionAfter = std.querySelector('.lucivo-footnotes');
    const lineAfter = Number(thirdH2After.getAttribute('data-src-line'));
    const incHtml = std.innerHTML;

    // 全体再描画と innerHTML が完全一致するか確認
    prevStdCache = null;
    renderApp();
    const fullHtml = std.innerHTML;

    return {
      sameFirstH2: firstH2Before === firstH2After,
      sameThirdH2: thirdH2Before === thirdH2After,
      sameFnSection: fnSectionBefore === fnSectionAfter,
      lineDelta: lineAfter - lineBefore,
      containerSrcLineQsaCalls,
      htmlExactMatch: incHtml === fullHtml
    };
  }, fnDocEdited);

  // 2) Visualモード（脚注あり・3 章の表紙目次あり）での差分再描画・H2 改題時の表紙 DOM 保持
  await selectVisualStyle(p17, 'shapes');
  await p17.evaluate(t => {
    const editor = document.getElementById('markdown-editor');
    editor.value = t;
    lastLoadedMarkdown = t;
    renderApp();
  }, fnDocInitial);
  await p17.waitForTimeout(150);

  const visFnInc = await p17.evaluate(nextMd => {
    const vis = document.getElementById('visual-stage-container');
    const heroBefore = vis.querySelector('.exhibition-hero');
    const slabsBefore = vis.querySelectorAll('.exhibition-slab');
    const firstSlabBefore = slabsBefore[0];
    const thirdSlabBefore = slabsBefore[2];
    const lineBefore = Number(thirdSlabBefore.querySelector('h2').getAttribute('data-src-line'));

    let unchangedSrcLineQsaCalls = 0;
    const origQsa = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function(sel) {
      if (
        (this === vis || this === firstSlabBefore || this === thirdSlabBefore)
        && typeof sel === 'string'
        && sel.includes('data-src-line')
      ) {
        unchangedSrcLineQsaCalls++;
      }
      return origQsa.call(this, sel);
    };

    const editor = document.getElementById('markdown-editor');
    editor.value = nextMd;
    isInputRender = true;
    renderApp();

    Element.prototype.querySelectorAll = origQsa;

    const heroAfter = vis.querySelector('.exhibition-hero');
    const slabsAfter = vis.querySelectorAll('.exhibition-slab');
    const firstSlabAfter = slabsAfter[0];
    const thirdSlabAfter = slabsAfter[2];
    const lineAfter = Number(thirdSlabAfter.querySelector('h2').getAttribute('data-src-line'));
    const agendaSecondTitle = heroAfter.querySelectorAll('.vs-cover-agenda-title')[1]?.textContent;
    const incHtml = vis.innerHTML;

    prevVisCache = null;
    renderApp();
    const fullHtml = vis.innerHTML;

    return {
      sameHeroOnH2Rename: heroBefore === heroAfter,
      agendaSecondTitle,
      sameFirstSlab: firstSlabBefore === firstSlabAfter,
      sameThirdSlab: thirdSlabBefore === thirdSlabAfter,
      lineDelta: lineAfter - lineBefore,
      unchangedSrcLineQsaCalls,
      htmlExactMatch: incHtml === fullHtml
    };
  }, fnDocEdited);

  record('TC-PERF-017',
    fastFnInc.sameFirstH2 &&
    fastFnInc.sameThirdH2 &&
    fastFnInc.sameFnSection &&
    fastFnInc.lineDelta === 2 &&
    fastFnInc.containerSrcLineQsaCalls === 0 &&
    fastFnInc.htmlExactMatch &&
    visFnInc.sameHeroOnH2Rename &&
    visFnInc.agendaSecondTitle === '第 2 章: 改題後の見出し' &&
    visFnInc.sameFirstSlab &&
    visFnInc.sameThirdSlab &&
    visFnInc.lineDelta === 2 &&
    visFnInc.unchangedSrcLineQsaCalls === 0 &&
    visFnInc.htmlExactMatch &&
    p17.consoleErrors.length === 0,
    JSON.stringify({ fastFnInc, visFnInc, consoleErrors: p17.consoleErrors })
  );
  await p17.close();
}

module.exports = { testPerfBudget, testPerfOptimizations };
