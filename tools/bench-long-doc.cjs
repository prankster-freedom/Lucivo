/**
 * Issue #274: 500 ページ級の長い文書でのスクロール・ズーム性能計測ツール（配布物には含めない）
 *
 * 使い方:
 *   npm run build:standalone
 *   node tools/bench-long-doc.cjs [--chapters 480] [--out work/perf-274/after-500p.json]
 *
 * 試験用文書には画像参照・Mermaid 各種図・多列テーブル・数式・コード・引用・折りたたみ・脚注を
 * 章ごとに混在ゾーンおよび要素別ゾーンとして配置し、高速モードと Visualモード（shapes）の両方で
 * スクロール（実マウスホイール・大ジャンプ）とズーム（図の Ctrl+ホイール・CSS zoom・Viewport 幅変更）を測る。
 */
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const APP_URL = 'file:///' + path.join(ROOT_DIR, 'dist', 'index.html').replace(/\\/g, '/');

function parseArgs(argv) {
  const opts = {
    chapters: 480,
    out: path.join(ROOT_DIR, 'work', 'perf-274', 'bench-long-doc.json')
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--chapters' && argv[i + 1]) {
      opts.chapters = Math.max(24, parseInt(argv[++i], 10) || 480);
    } else if (argv[i] === '--out' && argv[i + 1]) {
      opts.out = path.resolve(ROOT_DIR, argv[++i]);
    }
  }
  return opts;
}

function makeSvgDataUri(idx) {
  const hue = (idx * 37) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360" viewBox="0 0 800 360">`
    + `<rect width="800" height="360" fill="hsl(${hue},30%,95%)" stroke="hsl(${hue},50%,55%)" stroke-width="2"/>`
    + `<circle cx="160" cy="180" r="90" fill="hsl(${hue},60%,70%)" opacity="0.7"/>`
    + `<rect x="300" y="70" width="420" height="220" rx="12" fill="hsl(${(hue + 120) % 360},45%,85%)"/>`
    + `<text x="400" y="190" font-size="28" text-anchor="middle" fill="#222">Figure ${idx}</text>`
    + `</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const MERMAID_SAMPLES = [
  `\`\`\`mermaid\nflowchart LR\n  A[入力取得] --> B{検証}\n  B -->|OK| C[変換処理]\n  B -->|NG| D[エラー通知]\n  C --> E[キャッシュ保存]\n  E --> F[画面反映]\n\`\`\``,
  `\`\`\`mermaid\nsequenceDiagram\n  participant U as 利用者\n  participant E as エディタ\n  participant P as パーサー\n  participant R as レンダラー\n  U->>E: Markdown入力\n  E->>P: 字句解析\n  P->>R: トークン列\n  R-->>U: プレビュー更新\n\`\`\``,
  `\`\`\`mermaid\nstateDiagram-v2\n  [*] --> Idle\n  Idle --> Parsing : input\n  Parsing --> Rendering : tokens\n  Rendering --> Ready : done\n  Ready --> Idle : reset\n\`\`\``,
  `\`\`\`mermaid\nclassDiagram\n  class Document {\n    +string raw\n    +parse()\n  }\n  class Renderer {\n    +render()\n    +patch()\n  }\n  Document --> Renderer : uses\n\`\`\``,
  `\`\`\`mermaid\nflowchart TD\n  S[開始] --> P1[フェーズ1]\n  P1 --> P2[フェーズ2]\n  P2 --> P3[フェーズ3]\n  P3 --> P4[フェーズ4]\n  P4 --> G[完了]\n\`\`\``,
  `\`\`\`mermaid\ngantt\n  title 工程スケジュール\n  dateFormat YYYY-MM-DD\n  section 設計\n  要件整理 :a1, 2026-01-01, 10d\n  詳細設計 :a2, after a1, 14d\n  section 実装\n  本体開発 :b1, after a2, 20d\n\`\`\``
];

function makeWideTable(ch) {
  const headers = Array.from({ length: 10 }, (_, c) => `項目${c + 1}`);
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`
  ];
  for (let r = 1; r <= 10; r++) {
    const cells = headers.map((_, c) => (c === 0 ? `行${ch}-${r}` : `${(ch * 13 + r * 7 + c * 3) % 997}`));
    lines.push(`| ${cells.join(' | ')} |`);
  }
  return lines.join('\n');
}

function makeMathBlock(ch) {
  return [
    `インライン数式 $f_{${ch}}(x) = \\sum_{k=1}^{n} \\frac{x^k}{k!}$ および $\\alpha_{${ch}} + \\beta_{${ch}} = \\gamma$ の関係を示します。`,
    '',
    `$$`,
    `\\mathcal{L}_{${ch}}(t) = \\int_{0}^{\\infty} e^{-st} \\left( \\frac{\\partial^2 u}{\\partial x^2} + \\lambda_{${ch}} \\sin(\\omega t) \\right) dt = \\frac{\\omega \\lambda_{${ch}}}{s^2 + \\omega^2}`,
    `$$`
  ].join('\n');
}

function makeCodeBlock(ch) {
  const rows = [];
  for (let i = 1; i <= 18; i++) {
    rows.push(`  const value_${ch}_${i} = computeMetric(items[${i}], { chapter: ${ch}, scale: 1.0 });`);
  }
  return `\`\`\`typescript\nexport function processChapter${ch}(items: number[]): number {\n${rows.join('\n')}\n  return items.reduce((a, b) => a + b, 0);\n}\n\`\`\``;
}

function makeDetailsAndQuote(ch) {
  return [
    `> 第 ${ch} 章の引用: 大規模ドキュメントでも閲覧・編集の体験を損なわず、安定した応答性を維持することが重要です。[^fn-${ch}]`,
    '',
    `<details>`,
    `<summary>第 ${ch} 章の補足詳細を展開</summary>`,
    '',
    `ここには第 ${ch} 章に関する補足説明とチェック項目が入ります。折りたたみ内部のレイアウト負荷も含めて検証します。`,
    '',
    `- [x] 確認項目 A-${ch}`,
    `- [ ] 確認項目 B-${ch}`,
    `</details>`
  ].join('\n');
}

function buildLongBenchDoc(totalChapters = 480) {
  const parts = [
    '# 500 ページ級 性能計測用ドキュメント (#274)\n',
    'A4 横換算で約 500 ページ相当の分量と、実際の文書に現れる各種要素（画像・Mermaid 図・多列テーブル・数式・コード・引用・折りたたみ・脚注）を含む試験用文書です。\n'
  ];
  const footnotes = [];
  const zoneNames = ['mixed', 'images', 'mermaid', 'tables', 'math', 'code_misc'];
  const zoneSize = Math.ceil(totalChapters / zoneNames.length);
  const zones = zoneNames.map((name, idx) => ({
    name,
    start: idx * zoneSize + 1,
    end: Math.min(totalChapters, (idx + 1) * zoneSize)
  }));

  for (let ch = 1; ch <= totalChapters; ch++) {
    const zone = zones.find(z => ch >= z.start && ch <= z.end).name;
    parts.push(`## ${ch}. 第 ${ch} 章（${zone}）\n`);
    parts.push(
      `第 ${ch} 章では、長大な技術仕様書や設計書を閲覧する際のレイアウト再計算・描画コスト・スクロール応答性を検証します。`
      + `テキスト段落を複数含め、折り返しやタイポグラフィの負荷も実文書に近づけています。\n`
    );

    if (zone === 'mixed') {
      const kind = ch % 6;
      if (kind === 0) parts.push(`![図版 ${ch}](${makeSvgDataUri(ch)})\n`);
      else if (kind === 1) parts.push(MERMAID_SAMPLES[ch % MERMAID_SAMPLES.length] + '\n');
      else if (kind === 2) parts.push(makeWideTable(ch) + '\n');
      else if (kind === 3) parts.push(makeMathBlock(ch) + '\n');
      else if (kind === 4) parts.push(makeCodeBlock(ch) + '\n');
      else {
        parts.push(makeDetailsAndQuote(ch) + '\n');
        footnotes.push(`[^fn-${ch}]: 第 ${ch} 章の脚注テキスト。`);
      }
    } else if (zone === 'images') {
      parts.push(`![画像ゾーン図版 ${ch}](${makeSvgDataUri(ch)})\n`);
      parts.push(`画像のキャプションおよび詳細解説です。画像要素が連続した際のデコードおよびコンポジット負荷を確認します。\n`);
    } else if (zone === 'mermaid') {
      parts.push(MERMAID_SAMPLES[ch % MERMAID_SAMPLES.length] + '\n');
      parts.push(`Mermaid 図表が連続する区間での SVG 描画とレイアウト計算のコストを計測します。\n`);
    } else if (zone === 'tables') {
      parts.push(makeWideTable(ch) + '\n');
    } else if (zone === 'math') {
      parts.push(makeMathBlock(ch) + '\n');
      parts.push(makeMathBlock(ch + 1000) + '\n');
    } else {
      parts.push(makeCodeBlock(ch) + '\n');
      parts.push(makeDetailsAndQuote(ch) + '\n');
      footnotes.push(`[^fn-${ch}]: 第 ${ch} 章の脚注テキスト。`);
    }
  }

  if (footnotes.length) {
    parts.push('\n' + footnotes.join('\n') + '\n');
  }
  return { md: parts.join('\n'), zones };
}

async function runModeMeasurement(browser, md, zones, { isVisual = false } = {}) {
  const modeName = isVisual ? 'visual(shapes)' : 'fast';
  console.log(`\n=== Measuring mode: ${modeName} ===`);
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));

  await page.goto(APP_URL);
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));

  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  if (isVisual) {
    await page.click('#btn-visual-mode');
    await page.click('.info-style-btn[data-info-style="shapes"]');
  }

  const openStart = Date.now();
  await page.evaluate(text => {
    const editor = document.getElementById('markdown-editor');
    editor.value = text;
    lastLoadedMarkdown = text;
    renderApp();
  }, md);
  await page.waitForFunction(
    () => !/Rendering/.test(document.getElementById('telemetry-status').textContent),
    null,
    { timeout: 180000 }
  );
  await page.waitForTimeout(500);
  const openMs = Date.now() - openStart;

  const docStats = await page.evaluate(visual => {
    const scroller = document.getElementById('preview-scroll');
    const container = visual
      ? document.querySelector('#visual-stage-container .exhibition-wrap')
      : document.getElementById('standard-doc-container');
    return {
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
      estimatedA4LandscapePages: +(scroller.scrollHeight / 680).toFixed(1),
      topLevelChildren: container ? container.children.length : 0,
      hasContentVisibility: container ? container.classList.contains('has-content-visibility') : false,
      totalDomNodes: document.getElementsByTagName('*').length,
      svgCount: document.querySelectorAll('#preview-scroll svg').length
    };
  }, isVisual);
  console.log('docStats:', docStats, 'openMs:', openMs);

  const scrollerBox = await page.locator('#preview-scroll').boundingBox();
  const centerX = scrollerBox.x + scrollerBox.width / 2;
  const centerY = scrollerBox.y + scrollerBox.height / 2;

  async function measureWheelScrollInRange(label, startFraction, wheelSteps = 25, deltaY = 450) {
    await page.evaluate(frac => {
      const s = document.getElementById('preview-scroll');
      s.scrollTop = Math.round((s.scrollHeight - s.clientHeight) * frac);
    }, startFraction);
    await page.waitForTimeout(250);

    await page.evaluate(() => {
      window.__perf274 = { longTasks: [], rafDeltas: [], running: true };
      let last = performance.now();
      const tick = now => {
        if (!window.__perf274.running) return;
        window.__perf274.rafDeltas.push(now - last);
        last = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      if (typeof PerformanceObserver === 'function') {
        const obs = new PerformanceObserver(list => {
          for (const e of list.getEntries()) window.__perf274.longTasks.push(e.duration);
        });
        obs.observe({ type: 'longtask', buffered: false });
        window.__perf274.obs = obs;
      }
    });

    await page.mouse.move(centerX, centerY);
    const t0 = Date.now();
    for (let i = 0; i < wheelSteps; i++) {
      await page.mouse.wheel(0, deltaY);
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(200);
    const elapsedMs = Date.now() - t0;

    const res = await page.evaluate(() => {
      const p = window.__perf274;
      p.running = false;
      if (p.obs) p.obs.disconnect();
      const deltas = p.rafDeltas.slice(1);
      const sorted = [...deltas].sort((a, b) => a - b);
      const p95 = sorted.length ? sorted[Math.floor(sorted.length * 0.95)] : 0;
      const maxRaf = sorted.length ? sorted[sorted.length - 1] : 0;
      const dropped = deltas.filter(d => d > 33.3).length;
      const ltTotal = p.longTasks.reduce((a, b) => a + b, 0);
      return {
        longTaskCount: p.longTasks.length,
        longTaskTotalMs: +ltTotal.toFixed(1),
        longTaskMaxMs: p.longTasks.length ? +Math.max(...p.longTasks).toFixed(1) : 0,
        rafCount: deltas.length,
        rafP95Ms: +p95.toFixed(1),
        rafMaxMs: +maxRaf.toFixed(1),
        droppedFramesOver33ms: dropped
      };
    });
    console.log(`  wheel[${label}]:`, res, `elapsed=${elapsedMs}ms`);
    return { ...res, elapsedMs };
  }

  const zoneResults = {};
  for (let zi = 0; zi < zones.length; zi++) {
    const z = zones[zi];
    zoneResults[z.name] = await measureWheelScrollInRange(z.name, zi / zones.length, 25, 450);
  }

  const jumpScroll = await page.evaluate(async () => {
    const scroller = document.getElementById('preview-scroll');
    const longTasks = [];
    const stepTimes = [];
    let obs = null;
    if (typeof PerformanceObserver === 'function') {
      obs = new PerformanceObserver(list => {
        for (const e of list.getEntries()) longTasks.push(e.duration);
      });
      obs.observe({ type: 'longtask', buffered: false });
    }
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    for (let s = 1; s <= 10; s++) {
      const t0 = performance.now();
      scroller.scrollTop = Math.round((maxScroll * s) / 10);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      stepTimes.push(+(performance.now() - t0).toFixed(1));
    }
    await new Promise(r => setTimeout(r, 150));
    if (obs) obs.disconnect();
    return {
      longTaskCount: longTasks.length,
      longTaskTotalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(1),
      longTaskMaxMs: longTasks.length ? +Math.max(...longTasks).toFixed(1) : 0,
      stepMaxMs: Math.max(...stepTimes),
      stepAvgMs: +(stepTimes.reduce((a, b) => a + b, 0) / stepTimes.length).toFixed(1)
    };
  });
  console.log('  jumpScroll:', jumpScroll);

  const diagramZoom = await page.evaluate(async () => {
    const vp = document.querySelector('#preview-scroll .diagram-viewport, #preview-scroll .exhibition-viewport');
    if (!vp) return { error: 'no diagram viewport' };
    vp.scrollIntoView({ block: 'center' });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const times = [];
    const longTasks = [];
    let obs = null;
    if (typeof PerformanceObserver === 'function') {
      obs = new PerformanceObserver(list => {
        for (const e of list.getEntries()) longTasks.push(e.duration);
      });
      obs.observe({ type: 'longtask', buffered: false });
    }
    for (let i = 0; i < 10; i++) {
      const deltaY = i < 5 ? -100 : 100;
      const t0 = performance.now();
      vp.dispatchEvent(new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        ctrlKey: true,
        deltaY,
        clientX: cx,
        clientY: cy
      }));
      await new Promise(r => requestAnimationFrame(r));
      times.push(+(performance.now() - t0).toFixed(1));
    }
    await new Promise(r => setTimeout(r, 100));
    if (obs) obs.disconnect();
    return {
      avgMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1),
      maxMs: Math.max(...times),
      times,
      longTaskCount: longTasks.length,
      longTaskTotalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(1)
    };
  });
  console.log('  diagramZoom:', diagramZoom);

  const pageZoom = await page.evaluate(async () => {
    const times = [];
    const longTasks = [];
    let obs = null;
    if (typeof PerformanceObserver === 'function') {
      obs = new PerformanceObserver(list => {
        for (const e of list.getEntries()) longTasks.push(e.duration);
      });
      obs.observe({ type: 'longtask', buffered: false });
    }
    const levels = ['1.1', '1.25', '1.5', '1.25', '1.0'];
    for (const z of levels) {
      const t0 = performance.now();
      document.documentElement.style.zoom = z;
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      times.push(+(performance.now() - t0).toFixed(1));
    }
    document.documentElement.style.zoom = '';
    await new Promise(r => setTimeout(r, 100));
    if (obs) obs.disconnect();
    return {
      avgMs: +(times.reduce((a, b) => a + b, 0) / times.length).toFixed(1),
      maxMs: Math.max(...times),
      times,
      longTaskCount: longTasks.length,
      longTaskTotalMs: +longTasks.reduce((a, b) => a + b, 0).toFixed(1)
    };
  });
  console.log('  pageZoom(CSS zoom):', pageZoom);

  const resizeZoomTimes = [];
  const widths = [1309, 1152, 960, 1152, 1440];
  for (const w of widths) {
    const t0 = Date.now();
    await page.setViewportSize({ width: w, height: Math.round(900 * (w / 1440)) });
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    resizeZoomTimes.push(Date.now() - t0);
  }
  const viewportResizeZoom = {
    avgMs: +(resizeZoomTimes.reduce((a, b) => a + b, 0) / resizeZoomTimes.length).toFixed(1),
    maxMs: Math.max(...resizeZoomTimes),
    times: resizeZoomTimes
  };
  console.log('  viewportResizeZoom:', viewportResizeZoom);

  await page.close();
  return {
    mode: modeName,
    openMs,
    docStats,
    zoneResults,
    jumpScroll,
    diagramZoom,
    pageZoom,
    viewportResizeZoom,
    consoleErrors
  };
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(path.join(ROOT_DIR, 'dist', 'index.html'))) {
    console.error('dist/index.html がありません。先に npm run build:standalone を実行してください。');
    process.exit(1);
  }
  const { md, zones } = buildLongBenchDoc(opts.chapters);
  console.log(`Generated doc: ${opts.chapters} chapters, ${md.length} chars, ${md.split('\n').length} lines`);
  const browser = await chromium.launch({ headless: true });
  try {
    const fast = await runModeMeasurement(browser, md, zones, { isVisual: false });
    const visual = await runModeMeasurement(browser, md, zones, { isVisual: true });
    const report = {
      measuredAt: new Date().toISOString(),
      chapters: opts.chapters,
      docChars: md.length,
      docLines: md.split('\n').length,
      fast,
      visual
    };
    fs.mkdirSync(path.dirname(opts.out), { recursive: true });
    fs.writeFileSync(opts.out, JSON.stringify(report, null, 2));
    console.log(`\nSaved report to ${opts.out}`);
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { buildLongBenchDoc };
