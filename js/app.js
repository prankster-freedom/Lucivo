/* ==========================================================================
   アプリケーション・コアエンジン
   ========================================================================== */
function fnv1aHash(str) {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  const label = document.getElementById('toast-message');
  if (!toast || !label) return;
  label.textContent = msg;
  toast.classList.remove('opacity-0', 'translate-y-2');
  toast.classList.add('opacity-100', 'translate-y-0');
  setTimeout(() => {
    toast.classList.remove('opacity-100', 'translate-y-0');
    toast.classList.add('opacity-0', 'translate-y-2');
  }, 2000);
}

function updateStatus(text, type = 'info') {
  const pill = document.getElementById('telemetry-pill');
  const dot = document.getElementById('telemetry-dot');
  const status = document.getElementById('telemetry-status');
  if (!pill || !dot || !status) return;
  status.textContent = text;
  pill.className = 'flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono shadow-md backdrop-blur-md transition-all';
  if (type === 'success') {
    pill.classList.add('bg-emerald-500/10', 'text-emerald-600', 'border-emerald-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500';
  } else if (type === 'warning') {
    pill.classList.add('bg-amber-500/10', 'text-amber-600', 'border-amber-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-amber-500';
  } else {
    pill.classList.add('bg-blue-500/10', 'text-blue-600', 'border-blue-500/25');
    dot.className = 'w-1.5 h-1.5 rounded-full bg-blue-500';
  }
}

function downloadBlob(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const THEMES = {
  light: {
    cobalt: {
      name: 'Cobalt',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#2563EB',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#1E3A8A'
    },
    emerald: {
      name: 'Emerald',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#059669',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#064E3B'
    },
    amber: {
      name: 'Amber',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#D97706',
      nodeText: '#0F172A',
      edgeStroke: '#57534E',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#78350F'
    },
    slate: {
      name: 'Royal',
      canvasBg: '#FFFFFF',
      clusterBg: '#F8FAFC',
      clusterBorder: '#94A3B8',
      nodeBg: '#FFFFFF',
      nodeStroke: '#7C3AED',
      nodeText: '#0F172A',
      edgeStroke: '#475569',
      edgeLabelBg: '#FFFFFF',
      edgeLabelBorder: '#CBD5E1',
      edgeLabelText: '#4C1D95'
    }
  },
  dark: {
    cobalt: {
      name: 'Cobalt',
      canvasBg: '#0F172A',
      clusterBg: '#0B1120',
      clusterBorder: '#334155',
      nodeBg: '#1E293B',
      nodeStroke: '#38BDF8',
      nodeText: '#F8FAFC',
      edgeStroke: '#94A3B8',
      edgeLabelBg: '#1E293B',
      edgeLabelBorder: '#475569',
      edgeLabelText: '#E0F2FE'
    },
    emerald: {
      name: 'Emerald',
      canvasBg: '#06120E',
      clusterBg: '#091914',
      clusterBorder: '#1E4638',
      nodeBg: '#0F2920',
      nodeStroke: '#34D399',
      nodeText: '#F8FAFC',
      edgeStroke: '#6EE7B7',
      edgeLabelBg: '#0F2920',
      edgeLabelBorder: '#1E4638',
      edgeLabelText: '#D1FAE5'
    },
    amber: {
      name: 'Amber',
      canvasBg: '#120E07',
      clusterBg: '#1C150B',
      clusterBorder: '#452A0B',
      nodeBg: '#291D0E',
      nodeStroke: '#FBBF24',
      nodeText: '#F8FAFC',
      edgeStroke: '#FCD34D',
      edgeLabelBg: '#291D0E',
      edgeLabelBorder: '#452A0B',
      edgeLabelText: '#FEF3C7'
    },
    slate: {
      name: 'Royal',
      canvasBg: '#0D0917',
      clusterBg: '#150F26',
      clusterBorder: '#3B2366',
      nodeBg: '#21173B',
      nodeStroke: '#C084FC',
      nodeText: '#F8FAFC',
      edgeStroke: '#D8B4FE',
      edgeLabelBg: '#21173B',
      edgeLabelBorder: '#3B2366',
      edgeLabelText: '#F3E8FF'
    }
  }
};

// Visual Stage のカード背景はどのスタイルも明るい色のため、Light / Dark によらずこの配色で描画する
const VISUAL_THEMES = {
  shapes: {
    clusterBg: '#F5FBFA',
    clusterBorder: '#94A3B8',
    nodeBg: '#FBE3B0',
    nodeStroke: '#D9902A',
    nodeText: '#1E293B',
    edgeStroke: '#475569',
    edgeLabelBg: '#FFFFFF',
    edgeLabelBorder: '#CBD5E1',
    edgeLabelText: '#1E293B',
    secondary: '#C9F1F6',
    tertiary: '#F8D9D3',
    lifeline: '#475569',
    activationBg: '#C9F1F6',
    activationBorder: '#0E7490'
  },
  cards: {
    clusterBg: '#FFFFFF',
    clusterBorder: '#CBD5E1',
    nodeBg: '#FFFFFF',
    nodeStroke: '#E29578',
    nodeText: '#0F172A',
    edgeStroke: '#64748B',
    edgeLabelBg: '#FFFFFF',
    edgeLabelBorder: '#E2E8F0',
    edgeLabelText: '#0F172A',
    secondary: '#DCE3F6',
    tertiary: '#D3EBEC',
    lifeline: '#7C8BA1',
    activationBg: '#FBE7B5',
    activationBorder: '#C98A12'
  },
  circles: {
    clusterBg: '#F8FAFC',
    clusterBorder: '#7EA6BF',
    nodeBg: '#D7E6EF',
    nodeStroke: '#7EA6BF',
    nodeText: '#2B2D42',
    edgeStroke: '#3D464D',
    edgeLabelBg: '#FFFFFF',
    edgeLabelBorder: '#7EA6BF',
    edgeLabelText: '#2B2D42',
    secondary: '#F3CFCB',
    tertiary: '#F6E3C8',
    lifeline: '#6D597A',
    activationBg: '#F3CFCB',
    activationBorder: '#D45D53'
  },
  editorial: {
    clusterBg: '#FFFDF7',
    clusterBorder: '#C9BFA5',
    nodeBg: '#FFFFFF',
    nodeStroke: '#D68C8C',
    nodeText: '#2B2D42',
    edgeStroke: '#6F8A55',
    edgeLabelBg: '#FFFFFF',
    edgeLabelBorder: '#C9BFA5',
    edgeLabelText: '#2B2D42',
    secondary: '#E4ECD9',
    tertiary: '#F3E1E1',
    lifeline: '#8FA876',
    activationBg: '#E4ECD9',
    activationBorder: '#6F8A55'
  }
};

// Visual Stage のノード装飾（g.node の形・塗りの置き換え）を適用する図種。
// 他の図種の g.node（クラス図のクラスなど）に適用すると図の構造が崩れるため、限定する（FR-008）
// Dark の Visual Stage の配色（DD-DIAG-024）。カード背景が暗くなるため、背景の上に直接描く線・文字を明るくする。
// 装飾したノードの塗り（色付きの図形・白いカード）と、その上の文字の色は装飾の処理が決めるため、ここでは変わらない
const VISUAL_DARK_BASE = {
  clusterBg: '#1B2433',
  clusterBorder: '#64748B',
  nodeBg: '#1E293B',
  nodeText: '#F1F5F9',
  edgeStroke: '#CBD5E1',
  edgeLabelBg: '#1E293B',
  edgeLabelBorder: '#475569',
  edgeLabelText: '#F1F5F9',
  lifeline: '#94A3B8',
  canvasBg: '#111827'
};
const VISUAL_DARK_ACCENTS = {
  shapes: { clusterBg: '#16302F', secondary: '#155E75', tertiary: '#7C3A2E', activationBg: '#164E63' },
  cards: { secondary: '#3B4A75', tertiary: '#1F5254', activationBg: '#4A3A1A' },
  circles: { secondary: '#2F5266', tertiary: '#6B2E2A', activationBg: '#5A2B27' },
  editorial: { clusterBg: '#2A251C', secondary: '#3F4D33', tertiary: '#5A3535', activationBg: '#3F4D33' }
};
const VISUAL_THEMES_DARK = Object.fromEntries(Object.entries(VISUAL_THEMES).map(([style, spec]) =>
  [style, { ...spec, ...VISUAL_DARK_BASE, ...VISUAL_DARK_ACCENTS[style] }]));

const NODE_DECORATED_TYPES = ['flowchart-v2', 'flowchart', 'stateDiagram'];

// 図種ごとの矢印の既定の形状（FR-012）。フローチャートは業務フロー図で一般的な直角にする
const DEFAULT_CURVES = { flowchart: 'step' };
const CURVE_LABELS = { smooth: '曲線', step: '直角', straight: '直線' };

// Fit 表示で保つ、図の中の文字の表示上の最小サイズ（NFR-005）と、小さな図の拡大の上限
const MIN_FIT_FONT_PX = 10;
const MAX_FIT_SCALE = 1.5;
// Vibrant Circles で、白文字では読みにくい明るい塗り
const CIRCLE_DARK_TEXT_FILLS = ['#ECB674'];
// シーケンス図のメッセージの数式を、メッセージ線から離す量（SVG の座標単位）
const SEQUENCE_MATH_LIFT = 6;

const EMPTY_GUIDE_HTML = `
<div class="empty-guide">
  <p class="empty-guide-title">Markdown を開いてください</p>
  <p>ヘッダーの「ファイル」メニュー →「Markdown を開く…」で Markdown ファイルを読み込むか、左のエディタに直接入力してください。</p>
  <p>Markdown と Mermaid の記法の例は、同梱の <code>sample.md</code> にあります。</p>
</div>`;

const state = {
  appearance: 'light',
  palette: 'cobalt',
  viewMode: 'split',
  isVisualMode: false,
  infographicStyle: 'shapes',
  showFrontMatter: false,
  // 図の番号 → 矢印の形状（'smooth' / 'step' / 'straight'）。画面の表示の間だけ保持する（DD-EDGE-003）
  curveByIndex: new Map()
};

const svgCache = new Map();
const lkgCache = new Map();
// Fit の下限・上限の計算結果（描画結果のキャッシュのキー → { minWidth, maxWidth }）と、数式の描画結果
const fitCache = new Map();
const mathCache = new Map();

// 図・数式がない文書では読み込まないライブラリ。名前 → 読み込みの Promise（true: 読み込めた）
const LIBRARIES = {
  mermaid: { script: 'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js', global: 'mermaid' },
  katex: {
    script: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
    style: 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
    global: 'katex'
  }
};
const libraryLoads = new Map();

// CSS も <head> に入れるため、HTML エクスポート（outerHTML）にも含まれる
function loadLibrary(name) {
  const lib = LIBRARIES[name];
  if (window[lib.global]) return Promise.resolve(true);
  if (!libraryLoads.has(name)) {
    libraryLoads.set(name, new Promise(resolve => {
      if (lib.style) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = lib.style;
        document.head.appendChild(link);
      }
      const script = document.createElement('script');
      script.src = lib.script;
      script.onload = () => resolve(!!window[lib.global]);
      script.onerror = () => {
        console.warn(`Failed to load ${name}`);
        resolve(false);
      };
      document.head.appendChild(script);
    }));
  }
  return libraryLoads.get(name);
}
let renderDebounceTimer = null;
// renderApp を呼ぶたびに増やし、描画中の古い非同期描画を見分ける
let renderGeneration = 0;
// 最後に読み込んだ Markdown。エディタの内容と異なれば編集中とみなす（起動直後は空）
let lastLoadedMarkdown = '';
// 保存するときのファイル名。読み込んだファイルの名前（DD-FILE-030）
let currentFileName = 'untitled.md';

function getThemeSpec() {
  const mode = THEMES[state.appearance] || THEMES.light;
  return mode[state.palette] || mode.cobalt;
}

function syncCssTokens() {
  const spec = getThemeSpec();
  const root = document.documentElement;
  root.style.setProperty('--diag-canvas', spec.canvasBg);
  root.style.setProperty('--diag-cluster-bg', spec.clusterBg);
  root.style.setProperty('--diag-cluster-border', spec.clusterBorder);
  root.style.setProperty('--diag-node-bg', spec.nodeBg);
  root.style.setProperty('--diag-node-stroke', spec.nodeStroke);
  root.style.setProperty('--diag-node-text', spec.nodeText);
  root.style.setProperty('--diag-edge', spec.edgeStroke);
  root.style.setProperty('--accent', spec.nodeStroke);
}

function getMermaidCurve(curve) {
  if (curve === 'step') return 'stepAfter';
  if (curve === 'straight') return 'linear';
  return 'basis';
}

// 矢印の形状を選べる図種か。Mermaid 10.9.1 で curve の設定が効くのはフローチャートだけ（DD-EDGE-001）
function getCurveTarget(code) {
  const first = code.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith('%%')) || '';
  return /^(flowchart|graph)\b/.test(first) ? 'flowchart' : null;
}

// 図の矢印の形状。利用者が選んでいなければ、図種の既定の形状（DD-EDGE-002, 003）
function getBlockCurve(index, code) {
  const target = getCurveTarget(code);
  if (!target) return null;
  return state.curveByIndex.get(index) || DEFAULT_CURVES[target];
}

// 描画に使う配色。Visual Stage はスタイルごとの配色、通常モードは外観とパレットの配色
function getDiagramSpec(isVisual) {
  if (isVisual) {
    const themes = state.appearance === 'dark' ? VISUAL_THEMES_DARK : VISUAL_THEMES;
    return themes[state.infographicStyle] || themes.shapes;
  }
  return getThemeSpec();
}

function setupMermaid(isVisual = state.isVisualMode, curve = 'smooth') {
  syncCssTokens();
  const spec = getDiagramSpec(isVisual);
  const isDark = state.appearance === 'dark';
  // Visual Stage では円グラフなどの派生色もスタイルの配色に揃える
  const visualColors = isVisual
    ? { secondaryColor: spec.secondary, tertiaryColor: spec.tertiary }
    : { tertiaryColor: spec.clusterBg };

  // Mermaid は図が現れるまで読み込まない。読み込んだ後の描画の直前に、改めて設定する
  if (!window.mermaid) return;
  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    // 開いた Markdown の図の中の HTML タグとクリック時のスクリプト呼び出しを無効にする（NFR-003）
    securityLevel: 'strict',
    fontFamily: '"Inter", "Noto Sans JP", -apple-system, sans-serif',
    fontSize: 13,
    flowchart: {
      curve: getMermaidCurve(curve),
      padding: 18,
      nodeSpacing: 44,
      rankSpacing: 56,
      htmlLabels: true,
      useMaxWidth: true
    },
    sequence: {
      diagramMarginX: 24,
      diagramMarginY: 20,
      actorMargin: 54,
      width: 155,
      height: 50,
      boxMargin: 12,
      useMaxWidth: true
    },
    // ガントチャートは描画時のページ幅で横長に生成され、表示枠に縮小されて文字が極小になるため、
    // 表示枠（約 54rem）に近い幅で生成する
    gantt: {
      useWidth: 820,
      barHeight: 24,
      barGap: 6,
      topPadding: 56,
      leftPadding: 72,
      fontSize: 12,
      sectionFontSize: 12,
      useMaxWidth: true
    },
    state: {
      padding: 16,
      dividerMargin: 18,
      sizeUnit: 8,
      useMaxWidth: true
    },
    themeVariables: {
      darkMode: isDark,
      background: 'transparent',
      mainBkg: spec.nodeBg,
      primaryColor: spec.nodeBg,
      primaryTextColor: spec.nodeText,
      primaryBorderColor: spec.nodeStroke,
      lineColor: spec.edgeStroke,
      textColor: spec.nodeText,
      fontSize: '13px',

      clusterBkg: spec.clusterBg,
      clusterBorder: spec.clusterBorder,
      ...visualColors,
      tertiaryBorderColor: spec.clusterBorder,
      titleColor: spec.nodeText,

      compositeBackground: spec.clusterBg,
      compositeBorder: spec.clusterBorder,
      compositeTitleBackground: spec.clusterBg,
      stateBkg: spec.nodeBg,
      stateBorder: spec.nodeStroke,
      stateLabelColor: spec.nodeText,
      transitionColor: spec.edgeStroke,
      transitionLabelColor: spec.edgeLabelText,

      actorBkg: spec.nodeBg,
      actorBorder: spec.nodeStroke,
      actorTextColor: spec.nodeText,
      actorLineColor: spec.clusterBorder,
      signalColor: spec.edgeStroke,
      signalTextColor: spec.nodeText,
      labelBoxBkgColor: spec.edgeLabelBg,
      labelBoxBorderColor: spec.edgeLabelBorder,
      labelTextColor: spec.edgeLabelText,
      loopTextColor: spec.nodeText,
      noteBorderColor: spec.nodeStroke,
      noteBkgColor: spec.clusterBg,
      noteTextColor: spec.nodeText,

      // ER 図の属性行とガントチャートは、派生色のままだと Dark で白地に白文字などになるため明示する（FR-008）
      attributeBackgroundColorOdd: spec.nodeBg,
      attributeBackgroundColorEven: spec.clusterBg,
      sectionBkgColor: spec.clusterBg,
      sectionBkgColor2: spec.clusterBg,
      altSectionBkgColor: isVisual && !isDark ? '#FFFFFF' : spec.canvasBg,
      gridColor: spec.clusterBorder,
      taskBkgColor: spec.nodeBg,
      taskBorderColor: spec.nodeStroke,
      taskTextColor: spec.nodeText,
      taskTextLightColor: spec.nodeText,
      taskTextDarkColor: spec.nodeText,
      taskTextOutsideColor: spec.nodeText,
      taskTextClickableColor: spec.nodeText,
      activeTaskBkgColor: isVisual ? spec.secondary : spec.clusterBg,
      activeTaskBorderColor: spec.nodeStroke,
      doneTaskBkgColor: isVisual ? spec.tertiary : spec.clusterBorder,
      doneTaskBorderColor: spec.clusterBorder,
      critBkgColor: isDark ? '#7F1D1D' : '#FECACA',
      critBorderColor: '#DC2626',
      todayLineColor: spec.nodeStroke,
      // 円グラフの境界線は既定が黒のため、Dark では暗い扇形どうしの境目が見えなくなる
      pieStrokeColor: spec.edgeStroke,
      pieOuterStrokeColor: spec.edgeStroke,
      pieTitleTextColor: spec.nodeText,
      pieSectionTextColor: spec.nodeText,
      pieLegendTextColor: spec.nodeText,
      // XY チャートの系列色（派生色のままだと白地に淡いクリーム色になり見分けにくい）
      xyChart: {
        backgroundColor: 'transparent',
        titleColor: spec.nodeText,
        xAxisLabelColor: spec.nodeText,
        xAxisTitleColor: spec.nodeText,
        xAxisTickColor: spec.edgeStroke,
        xAxisLineColor: spec.edgeStroke,
        yAxisLabelColor: spec.nodeText,
        yAxisTitleColor: spec.nodeText,
        yAxisTickColor: spec.edgeStroke,
        yAxisLineColor: spec.edgeStroke,
        plotColorPalette: `${spec.nodeStroke}, ${spec.edgeStroke}`
      }
    }
  });
}

/* ==========================================================================
   数式（FR-010）: Marked の拡張で数式の置き場所を作り、サニタイズ後に KaTeX で描画する
   ========================================================================== */
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

// 置き場所の中身は TeX の原文。KaTeX を読み込めない場合は原文がそのまま表示される（DD-MATH-012, 022）
function mathPlaceholder(tag, tex, isDisplay, raw) {
  return `<${tag} class="lucivo-math" data-display="${isDisplay}" data-tex="${escapeHtml(tex)}">${escapeHtml(raw)}</${tag}>`;
}

const mathBlockExtension = {
  name: 'mathBlock',
  level: 'block',
  start: src => {
    const m = src.match(/^\$\$/m);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const m = /^\$\$[^\S\n]*\n?([\s\S]+?)\n?[^\S\n]*\$\$[^\S\n]*(?:\n+|$)/.exec(src);
    if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
  },
  renderer: token => `${mathPlaceholder('div', token.text, true, token.raw.trim())}\n`
};

// $…$ は、開きの直後・閉じの直前が空白でなく、閉じの直後が数字でない場合だけ数式にする（「$5 と $10」を除くため）。
// 中身にバッククォートを含めない。後ろのインラインコードの中の $ を閉じの $ と取り違えないため
const mathInlineExtension = {
  name: 'mathInline',
  level: 'inline',
  start: src => {
    const index = src.indexOf('$');
    return index >= 0 ? index : undefined;
  },
  tokenizer(src) {
    const display = /^\$\$((?:\\.|[^\\$`])+?)\$\$/.exec(src);
    if (display) return { type: 'mathInline', raw: display[0], text: display[1].trim(), display: true };
    const inline = /^\$(?!\s)((?:\\.|[^\\$`\n])+?)(?<!\s)\$(?!\d)/.exec(src);
    if (inline) return { type: 'mathInline', raw: inline[0], text: inline[1], display: false };
  },
  renderer: token => mathPlaceholder('span', token.text, token.display, token.raw)
};

function setupMarkedMath() {
  marked.use({ extensions: [mathBlockExtension, mathInlineExtension] });
}

// サニタイズ後の HTML に入れた置き場所へ描画する。trust: false で、リンクや任意の属性を作るコマンドは描画しない
// KaTeX は、数式が初めて現れたときに読み込む。読み込めなければ置き場所の原文のまま（DD-MATH-022）。
// 描画結果は TeX ごとにキャッシュし、入力のたびに描画し直さない
function renderMath(container) {
  const targets = container.querySelectorAll('.lucivo-math');
  if (targets.length === 0) return;
  if (!window.katex) {
    loadLibrary('katex').then(ok => { if (ok && container.isConnected) renderMath(container); });
    return;
  }
  targets.forEach(el => {
    const isDisplay = el.dataset.display === 'true';
    const key = `${isDisplay ? 'D' : 'I'}:${el.dataset.tex}`;
    if (!mathCache.has(key)) {
      mathCache.set(key, katex.renderToString(el.dataset.tex, {
        displayMode: isDisplay,
        throwOnError: false,
        trust: false,
        output: 'htmlAndMathml'
      }));
    }
    el.innerHTML = mathCache.get(key);
  });
}

/* ==========================================================================
   YAML フロントマター（FR-011）: 先頭を切り出し、表示するときは行単位で色分けする
   ========================================================================== */
// 文書の先頭だけを調べる。閉じの行がない場合は、先頭の水平線を隠さないよう一致させない（DD-FM-001）
function splitFrontMatter(text) {
  const m = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { yaml: null, body: text };
  return { yaml: m[1] || '', body: text.slice(m[0].length) };
}

// YAML は解析せず、コメント・キー・値を行ごとに色分けする（DD-FM-021）。各部分はエスケープしてから囲む
function highlightYamlLine(line) {
  if (/^\s*#/.test(line)) return `<span class="fm-comment">${escapeHtml(line)}</span>`;
  const m = /^(\s*(?:-\s+)?)([^\s#:][^:]*?)(:)(\s.*|$)/.exec(line);
  if (m) {
    return `${escapeHtml(m[1])}<span class="fm-key">${escapeHtml(m[2])}</span>${escapeHtml(m[3])}<span class="fm-value">${escapeHtml(m[4])}</span>`;
  }
  return `<span class="fm-value">${escapeHtml(line)}</span>`;
}

function buildFrontMatterHtml(yaml) {
  const body = yaml.split(/\r?\n/).map(highlightYamlLine).join('\n');
  return `<section class="front-matter"><div class="front-matter-label">Front Matter</div><pre class="front-matter-body"><code>${body}</code></pre></section>\n`;
}

/* ==========================================================================
   SVG ポストプロセッサ (通常モード vs リファレンス4大インフォグラフィック)
   ========================================================================== */
function hexToRgba(hex, alpha) {
  const v = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(v >> 16) & 255}, ${(v >> 8) & 255}, ${v & 255}, ${alpha})`;
}

// SVG 内の id を SVG ごとに一意にし、url(#…)・href・aria 参照を書き換える。
// Mermaid はシーケンス図の矢じり（#arrowhead）などを図をまたいで同じ id で出力するため、
// 同じページに複数の図があると、別の図（非表示のものを含む）のマーカーやグラデーションを参照してしまう
function scopeSvgIds(svg) {
  const prefix = svg.id || `lucivo-${Math.random().toString(36).slice(2, 9)}`;
  const idMap = new Map();
  const used = new Set();
  svg.querySelectorAll('[id]').forEach(el => {
    if (el.id.startsWith(prefix)) return;
    // Mermaid が 1 つの図の中で同じ id を出すこと（タイムラインの node-undefined など）があるため、
    // 2 つ目以降には連番を付ける。参照は最初の要素に向けたままにする
    let scoped = `${prefix}-${el.id}`;
    for (let n = 2; used.has(scoped); n++) scoped = `${prefix}-${el.id}-${n}`;
    used.add(scoped);
    if (!idMap.has(el.id)) idMap.set(el.id, scoped);
    el.id = scoped;
  });
  if (idMap.size === 0) return;

  const ariaRefs = ['aria-labelledby', 'aria-describedby'];
  svg.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const value = attr.value;
      if (value.includes('url(')) {
        // style 属性は url("#id") のように引用符付きで書き出されるため、引用符の有無を問わない
        el.setAttribute(attr.name, value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (m, q, id) => (idMap.has(id) ? `url(#${idMap.get(id)})` : m)));
      } else if ((attr.name === 'href' || attr.name === 'xlink:href') && value.startsWith('#') && idMap.has(value.slice(1))) {
        el.setAttribute(attr.name, `#${idMap.get(value.slice(1))}`);
      } else if (ariaRefs.includes(attr.name)) {
        el.setAttribute(attr.name, value.split(/\s+/).map(id => idMap.get(id) || id).join(' '));
      }
    });
  });
}

// シーケンス図のライフライン・活性区間・メッセージ線・矢じりを、背景と見分けられる配色にする（NFR-004）
function styleSequenceDiagram(svg, colors) {
  // Mermaid 10.9 はライフラインの class を "200" で上書きして出力するため、id でも拾う
  svg.querySelectorAll('line[id^="actor"], line[class~="200"], line.actor-line').forEach(line => {
    line.style.setProperty('stroke', colors.lifeline, 'important');
    line.style.setProperty('stroke-width', '1.25px', 'important');
    line.style.setProperty('stroke-dasharray', '5 4', 'important');
  });
  svg.querySelectorAll('rect[class^="activation"]').forEach(rect => {
    rect.style.setProperty('fill', colors.activationBg, 'important');
    rect.style.setProperty('stroke', colors.activationBorder, 'important');
    rect.style.setProperty('stroke-width', '1.5px', 'important');
  });
  svg.querySelectorAll('line.messageLine0, line.messageLine1').forEach(line => {
    line.style.setProperty('stroke', colors.signal, 'important');
    line.style.setProperty('stroke-width', '2px', 'important');
  });
  // 応答（-->>）の破線は意味を持つため、線の太さに合わせて間隔だけ広げる
  svg.querySelectorAll('line.messageLine1').forEach(line => {
    line.style.setProperty('stroke-dasharray', '6 4', 'important');
  });
  svg.querySelectorAll('marker path, marker circle').forEach(m => {
    m.style.setProperty('fill', colors.signal, 'important');
    m.style.setProperty('stroke', colors.signal, 'important');
  });
  // autonumber の番号は矢じりと同じ色の円の上に載るため、円と対比する色にする
  svg.querySelectorAll('text.sequenceNumber').forEach(t => {
    t.style.setProperty('fill', colors.numberText, 'important');
  });
  // Mermaid はメッセージの数式（SVG 直下の foreignObject）の下端をメッセージ線にそろえるため、
  // 添字や分母が線に重なる。線から離れるよう上へずらす（DD-DIAG-031）
  // 数式（MathML）はページの文字色を継承し、Visual Stage の Dark では明るいカードの上で白文字になるため、色も指定する
  svg.querySelectorAll(':scope > foreignObject').forEach(fo => {
    fo.setAttribute('y', String(parseFloat(fo.getAttribute('y') || '0') - SEQUENCE_MATH_LIFT));
    fo.querySelectorAll(':scope > div').forEach(div => div.style.setProperty('color', colors.messageText, 'important'));
  });
}

// Fit 表示で、図の中の最も小さい文字が MIN_FIT_FONT_PX 未満になるほどは縮小しない（DD-DIAG-030）。
// 文字の大きさは計算後のスタイルで調べるため、図を DOM に入れた後に呼ぶ
// あわせて、小さな図を枠の幅まで拡大しすぎないよう、拡大の上限（MAX_FIT_SCALE）を CSS 変数で渡す。
// 計算結果は描画結果のキャッシュのキーごとに保存し、キャッシュから表示するときは計算し直さない
function applyReadableFit(svg, cacheKey) {
  const viewBox = svg && svg.viewBox && svg.viewBox.baseVal;
  if (!viewBox || !viewBox.width) return;
  let fit = cacheKey && fitCache.get(cacheKey);
  if (!fit) {
    const sizes = Array.from(svg.querySelectorAll('text, tspan, foreignObject *'))
      .filter(el => !el.closest('math') && Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()))
      .map(el => parseFloat(getComputedStyle(el).fontSize))
      .filter(size => size > 0);
    const minScale = sizes.length ? Math.min(1, MIN_FIT_FONT_PX / Math.min(...sizes)) : 0;
    fit = { minWidth: Math.ceil(viewBox.width * minScale), maxWidth: Math.ceil(viewBox.width * MAX_FIT_SCALE) };
    if (cacheKey) fitCache.set(cacheKey, fit);
  }
  if (fit.minWidth) svg.style.minWidth = `${fit.minWidth}px`;
  svg.style.setProperty('--fit-max-width', `${fit.maxWidth}px`);
}

function postProcessSvg(rawSvg, isVisualMode) {
  try {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawSvg;
    const svg = wrapper.querySelector('svg');
    if (!svg) return rawSvg;

    const diagramType = svg.getAttribute('aria-roledescription') || '';
    if (isVisualMode) {
      decorateVisualSvg(svg, diagramType);
    } else {
      decorateStandardSvg(svg, diagramType);
    }
    scopeSvgIds(svg);
    return svg.outerHTML;
  } catch (e) {
    console.error('SVG post-processing failed:', e);
    return rawSvg;
  }
}

// 1. 通常モード：端正なエンジニアリング設計図スタイル
function decorateStandardSvg(svg, diagramType) {
  const isDark = state.appearance === 'dark';
  const spec = getThemeSpec();
  const targetTextColor = isDark ? '#F8FAFC' : '#0F172A';
  svg.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text.actor, text.noteText, .nodeLabel, .stateLabel, .messageText, .loopText, .labelText').forEach(el => {
    el.style.setProperty('color', targetTextColor, 'important');
    el.style.setProperty('fill', targetTextColor, 'important');
  });
  if (diagramType === 'sequence') {
    styleSequenceDiagram(svg, {
      lifeline: isDark ? '#94A3B8' : '#64748B',
      activationBg: hexToRgba(spec.nodeStroke, isDark ? 0.3 : 0.16),
      activationBorder: spec.nodeStroke,
      signal: spec.edgeStroke,
      numberText: isDark ? spec.canvasBg : '#FFFFFF',
      messageText: spec.nodeText
    });
  }
  if (!NODE_DECORATED_TYPES.includes(diagramType)) return;
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach(g => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    if (!rect) return;
    rect.setAttribute('rx', '8');
    rect.setAttribute('ry', '8');
    rect.style.setProperty('fill', spec.nodeBg, 'important');
    rect.style.setProperty('stroke', spec.nodeStroke, 'important');
    rect.style.setProperty('stroke-width', '1.75px', 'important');
  });
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    p.style.setProperty('stroke', spec.edgeStroke, 'important');
    p.style.setProperty('stroke-width', '2px', 'important');
  });
}

// ======================================================================
// 2. Visual Stage モード：インフォグラフィック・エンジン
// ======================================================================
function decorateVisualSvg(svg, diagramType) {
  const styleMode = state.infographicStyle;
  const visualSpec = getDiagramSpec(true);

  const uid = addVisualDefs(svg);

  if (diagramType === 'sequence') {
    decorateVisualSequence(svg, styleMode, visualSpec, uid);
    return;
  }
  // その他の図種は、構造を保ったまま setupMermaid のスタイル配色だけで描画する（FR-008）
  if (!NODE_DECORATED_TYPES.includes(diagramType)) return;

  // サブグラフの磨りガラス・フレーム化（カード背景の明暗に合わせる）
  const frost = state.appearance === 'dark' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.65)';
  svg.querySelectorAll('g.cluster, g.statediagram-cluster').forEach(cluster => {
    const outerRect = cluster.querySelector('rect.outer') || cluster.querySelector('rect');
    if (outerRect) {
      outerRect.setAttribute('rx', '18');
      outerRect.setAttribute('ry', '18');
      outerRect.style.setProperty('fill', frost, 'important');
      outerRect.style.setProperty('stroke', visualSpec.clusterBorder, 'important');
      outerRect.style.setProperty('stroke-width', '2px', 'important');
    }
  });

  const decorators = {
    shapes: decorateVisualShapes,
    cards: decorateVisualCards,
    circles: decorateVisualCircles,
    editorial: decorateVisualEditorial
  };
  const decorate = decorators[styleMode];
  if (decorate) decorate(svg, uid);

  fixMarkerScale(svg);
}

// Visual Stage で使う影・グラデーションを defs に追加し、id の接尾辞を返す
function addVisualDefs(svg) {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }


  const uid = Math.random().toString(36).slice(2, 7);

  defs.insertAdjacentHTML('beforeend', `
    <filter id="vis-soft-shadow-${uid}" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="6" stdDeviation="5.5" flood-color="#0F172A" flood-opacity="0.16" />
    </filter>
    <filter id="vis-card-shadow-${uid}" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.14" />
    </filter>

    <linearGradient id="vis-g-amber-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E89B27" />
      <stop offset="100%" stop-color="#F7D05C" />
    </linearGradient>
    <linearGradient id="vis-g-aqua-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#73E8F4" />
      <stop offset="100%" stop-color="#DAEDFA" />
    </linearGradient>
    <linearGradient id="vis-g-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E87C6C" />
      <stop offset="100%" stop-color="#F6CBC3" />
    </linearGradient>
    <linearGradient id="vis-g-lime-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8CEE97" />
      <stop offset="100%" stop-color="#CEF65B" />
    </linearGradient>

    <linearGradient id="vis-cap-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E29578" />
      <stop offset="100%" stop-color="#ECAC94" />
    </linearGradient>
    <linearGradient id="vis-cap-gold-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E5AD35" />
      <stop offset="100%" stop-color="#F3C868" />
    </linearGradient>
    <linearGradient id="vis-cap-violet-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9AAEE4" />
      <stop offset="100%" stop-color="#BAC7EC" />
    </linearGradient>
    <linearGradient id="vis-cap-teal-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#64ADB0" />
      <stop offset="100%" stop-color="#88C4C6" />
    </linearGradient>
  `);
  return uid;
}

// スタイル 1: 🎨 Pastel Shapes (リファレンス1準拠)
function decorateVisualShapes(svg, uid) {
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const polygon = g.querySelector('polygon');
    const text = (g.textContent || '').toLowerCase();

    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      el.style.setProperty('color', '#1E293B', 'important');
      el.style.setProperty('fill', '#1E293B', 'important');
      el.style.setProperty('font-weight', '700', 'important');
    });

    if (rect) {
      rect.style.setProperty('stroke', 'none', 'important');
      rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);

      if (idx === 0 || text.includes('client') || text.includes('start') || text.includes('standby')) {
        rect.setAttribute('rx', '9999');
        rect.setAttribute('ry', '9999');
        rect.style.setProperty('fill', '#FFFFFF', 'important');
      } else if (text.includes('terminal') || text.includes('landing') || text.includes('end') || text.includes('終了')) {
        rect.setAttribute('rx', '9999');
        rect.setAttribute('ry', '9999');
        rect.style.setProperty('fill', `url(#vis-g-lime-${uid})`, 'important');
      } else {
        rect.setAttribute('rx', '10');
        rect.setAttribute('ry', '10');
        rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
      }
    }

    if (polygon) {
      polygon.style.setProperty('stroke', 'none', 'important');
      polygon.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
      const points = polygon.getAttribute('points') || '';
      if (points.split(' ').length <= 5) {
        polygon.style.setProperty('fill', `url(#vis-g-aqua-${uid})`, 'important');
      } else {
        polygon.style.setProperty('fill', `url(#vis-g-coral-${uid})`, 'important');
      }
    }
  });

  // 結線の色はカード背景に合わせる（Dark では明るい色）
  const edgeColor = getDiagramSpec(true).edgeStroke;
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    p.style.setProperty('stroke', edgeColor, 'important');
    p.style.setProperty('stroke-width', '2px', 'important');
    p.style.setProperty('stroke-dasharray', 'none', 'important');
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', edgeColor, 'important');
    m.style.setProperty('stroke', edgeColor, 'important');
  });
}

// スタイル 2: 📋 2-Tier Cards (リファレンス4準拠)
function decorateVisualCards(svg, uid) {
  const capGradients = [
    `url(#vis-cap-coral-${uid})`,
    `url(#vis-cap-gold-${uid})`,
    `url(#vis-cap-violet-${uid})`,
    `url(#vis-cap-teal-${uid})`
  ];
  // 記号は A〜Z、続けて AA, AB…（表計算の列名と同じ）。ノードの多い図でも記号が重複しないようにする
  const stepLabel = n => (n < 26 ? '' : stepLabel(Math.floor(n / 26) - 1)) + String.fromCharCode(65 + (n % 26));
  // カード化したノードだけを図の上から順（同じ高さは左から）に数え、記号が A, B, C… と並ぶようにする
  let cardCount = 0;
  const nodePos = g => {
    const m = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(g.getAttribute('transform') || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  };
  const orderedNodes = Array.from(svg.querySelectorAll('g.node:not(.statediagram-cluster)'))
    .map(g => ({ g, pos: nodePos(g) }))
    .sort((a, b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x))
    .map(item => item.g);

  orderedNodes.forEach(g => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    if (!rect) return;

    const x = parseFloat(rect.getAttribute('x') || 0);
    const y = parseFloat(rect.getAttribute('y') || 0);
    const w = parseFloat(rect.getAttribute('width') || 0);
    const h = parseFloat(rect.getAttribute('height') || 0);
    if (w <= 10 || h <= 10) return;
    const idx = cardCount++;

    rect.setAttribute('rx', '12');
    rect.setAttribute('ry', '12');
    rect.style.setProperty('fill', '#FFFFFF', 'important');
    rect.style.setProperty('stroke', '#E2E8F0', 'important');
    rect.style.setProperty('stroke-width', '1.5px', 'important');
    rect.setAttribute('filter', `url(#vis-card-shadow-${uid})`);

    const cap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    cap.setAttribute('x', String(x));
    cap.setAttribute('y', String(y));
    cap.setAttribute('width', String(w));
    const capH = Math.min(24, h * 0.38);
    cap.setAttribute('height', String(capH));
    cap.setAttribute('rx', '12');
    cap.setAttribute('ry', '12');
    cap.style.setProperty('fill', capGradients[idx % capGradients.length], 'important');
    cap.style.setProperty('stroke', 'none', 'important');
    cap.style.setProperty('pointer-events', 'none');
    g.appendChild(cap);
    // 帯はカードの上部に重なるため、ラベルを帯の下の白い部分の中央へ下げる
    const label = g.querySelector(':scope > .label');
    if (label) label.setAttribute('transform', `${label.getAttribute('transform') || ''} translate(0, ${capH / 2})`.trim());

    const stepText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    stepText.setAttribute('x', String(x + 10));
    stepText.setAttribute('y', String(y + capH - 7));
    stepText.setAttribute('fill', '#FFFFFF');
    stepText.setAttribute('font-size', '11');
    stepText.setAttribute('font-weight', '800');
    stepText.setAttribute('font-family', '"Plus Jakarta Sans", sans-serif');
    stepText.textContent = stepLabel(idx);
    g.appendChild(stepText);

    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      el.style.setProperty('color', '#0F172A', 'important');
      el.style.setProperty('fill', '#0F172A', 'important');
      el.style.setProperty('font-weight', '700', 'important');
    });
  });

  const edgeColor = getDiagramSpec(true).edgeStroke;
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    p.style.setProperty('stroke', edgeColor, 'important');
    p.style.setProperty('stroke-width', '2px', 'important');
  });
}

// スタイル 3: ⭕ Vibrant Circles & Dots (リファレンス2準拠)
function decorateVisualCircles(svg, uid) {
  const circlePalette = ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763', '#6D597A', '#3D464D'];

  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const color = circlePalette[idx % circlePalette.length];

    if (rect) {
      rect.setAttribute('rx', '9999');
      rect.setAttribute('ry', '9999');
      rect.style.setProperty('fill', color, 'important');
      rect.style.setProperty('stroke', '#FFFFFF', 'important');
      rect.style.setProperty('stroke-width', '2.5px', 'important');
      rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
    }
    // ひし形・平行四辺形も塗り分ける（白文字を淡い塗りの上に載せないため）
    const polygon = g.querySelector('polygon');
    if (polygon) {
      polygon.style.setProperty('fill', color, 'important');
      polygon.style.setProperty('stroke', '#FFFFFF', 'important');
      polygon.style.setProperty('stroke-width', '2.5px', 'important');
      polygon.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
    }

    // 明るいキャメル色の上の白文字はコントラストが足りないため、その色だけ濃い文字にする
    const textColor = CIRCLE_DARK_TEXT_FILLS.includes(color) ? '#3B2A0E' : '#FFFFFF';
    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      el.style.setProperty('color', textColor, 'important');
      el.style.setProperty('fill', textColor, 'important');
      el.style.setProperty('font-weight', '700', 'important');
    });
  });

  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach((p, idx) => {
    const color = circlePalette[idx % circlePalette.length];
    p.style.setProperty('stroke', color, 'important');
    p.style.setProperty('stroke-width', '4px', 'important');
    p.style.setProperty('stroke-linecap', 'round', 'important');
    p.style.setProperty('stroke-dasharray', '0 9', 'important');
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', '#7EA6BF', 'important');
  });
}

// スタイル 4: 📖 Editorial Cream (リファレンス3準拠)
function decorateVisualEditorial(svg, uid) {
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const text = (g.textContent || '').toLowerCase();
    // 状態遷移図の並行（fork / join）のバーは細い矩形。白で塗るとクリーム色の背景に溶けるため、Mermaid の線の色のまま残す
    if (rect && parseFloat(rect.getAttribute('height') || 0) <= 10) return;

    if (rect) {
      if (idx === 0 || text.includes('start') || text.includes('client')) {
        rect.setAttribute('rx', '9999');
        rect.setAttribute('ry', '9999');
        rect.style.setProperty('fill', '#FFFFFF', 'important');
        rect.style.setProperty('stroke', '#E29578', 'important');
        rect.style.setProperty('stroke-width', '3px', 'important');
      } else if (text.includes('type') || text.includes('terminat') || text.includes('landing') || text.includes('docking')) {
        rect.setAttribute('rx', '8');
        rect.setAttribute('ry', '8');
        rect.style.setProperty('fill', '#D68C8C', 'important');
        rect.style.setProperty('stroke', 'none', 'important');
        g.querySelectorAll('foreignObject div, foreignObject span, text').forEach(el => {
          el.style.setProperty('color', '#FFFFFF', 'important');
          el.style.setProperty('fill', '#FFFFFF', 'important');
        });
        return;
      } else {
        rect.setAttribute('rx', '9999');
        rect.setAttribute('ry', '9999');
        rect.style.setProperty('fill', '#FFFFFF', 'important');
        rect.style.setProperty('stroke', 'none', 'important');
        rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
      }
    }

    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      el.style.setProperty('color', '#2B2D42', 'important');
      el.style.setProperty('fill', '#2B2D42', 'important');
      el.style.setProperty('font-weight', '600', 'important');
    });
  });

  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    p.style.setProperty('stroke', '#8FA876', 'important');
    p.style.setProperty('stroke-width', '3.5px', 'important');
    p.style.setProperty('stroke-dasharray', 'none', 'important');
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', '#8FA876', 'important');
    m.style.setProperty('stroke', '#8FA876', 'important');
  });
}

// 線幅を基準に拡大されるマーカー（状態遷移図の矢じりなど）を、線幅によらない大きさに固定する。
// Visual Stage は線を太くするため、そのままでは矢じりが巨大になり、ラベルや状態に重なる
function fixMarkerScale(svg) {
  const scale = 1.6;
  svg.querySelectorAll('marker').forEach(marker => {
    if (marker.getAttribute('markerUnits') === 'userSpaceOnUse') return;
    const w = parseFloat(marker.getAttribute('markerWidth') || 3);
    const h = parseFloat(marker.getAttribute('markerHeight') || 3);
    if (!marker.getAttribute('viewBox')) marker.setAttribute('viewBox', `0 0 ${w} ${h}`);
    marker.setAttribute('markerUnits', 'userSpaceOnUse');
    marker.setAttribute('markerWidth', String(w * scale));
    marker.setAttribute('markerHeight', String(h * scale));
  });
}

// Visual Stage のシーケンス図：参加者の箱をスタイルに合わせ、線・活性区間・矢じりを見分けやすくする（NFR-004）
function decorateVisualSequence(svg, styleMode, visualSpec, uid) {
  // 同じ参加者の上下の箱を同じ色にするため、参加者名ごとに色を割り当てる
  const actorOrder = [];
  svg.querySelectorAll('rect.actor').forEach(rect => {
    const name = rect.getAttribute('name') || '';
    if (!actorOrder.includes(name)) actorOrder.push(name);
    const idx = actorOrder.indexOf(name);
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
    rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
    if (styleMode === 'shapes') {
      rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
      rect.style.setProperty('stroke', 'none', 'important');
    } else if (styleMode === 'circles') {
      rect.style.setProperty('fill', ['#7EA6BF', '#D45D53', '#7D9763', '#ECB674'][idx % 4], 'important');
      rect.style.setProperty('stroke', '#FFFFFF', 'important');
      rect.style.setProperty('stroke-width', '2px', 'important');
    } else {
      rect.style.setProperty('fill', '#FFFFFF', 'important');
      rect.style.setProperty('stroke', visualSpec.nodeStroke, 'important');
      rect.style.setProperty('stroke-width', '1.5px', 'important');
    }
  });
  // 参加者の箱の塗りは外観によらないため、箱の文字の色も固定する（Dark では配色の nodeText が明るくなるため）
  // 人型の参加者（actor）の名前は箱ではなく背景の上に描かれるため、配色（外観に合わせた色）のままにする
  svg.querySelectorAll('text.actor, text.actor tspan').forEach(el => {
    if (el.closest('.actor-man')) return;
    el.style.setProperty('fill', styleMode === 'circles' ? '#FFFFFF' : '#1E293B', 'important');
    if (styleMode === 'circles') el.style.setProperty('font-weight', '700', 'important');
  });
  const isDark = state.appearance === 'dark';
  styleSequenceDiagram(svg, {
    lifeline: visualSpec.lifeline,
    activationBg: visualSpec.activationBg,
    activationBorder: visualSpec.activationBorder,
    signal: visualSpec.edgeStroke,
    // 番号は矢じりと同じ色の円の上に載る。Dark では円が明るい色になるため、番号を暗い色にする
    numberText: isDark ? '#0F172A' : '#FFFFFF',
    messageText: visualSpec.nodeText
  });
}

/* ==========================================================================
   ダイアグラムカード生成
   ========================================================================== */
// curve: 矢印の形状を選べる図ではその形状、選べない図では null（DD-EDGE-010）
function createDiagramCard(index, svgHtml, isRendering, isVisual, curve = null) {
  const content = isRendering
    ? `<div class="py-12 font-mono text-xs text-blue-500 animate-pulse flex items-center justify-center">Rendering Diagram 0${index + 1}...</div>`
    : svgHtml;

  const cardClass = isVisual ? `exhibition-diagram-card infographic-bg-${state.infographicStyle}` : 'diagram-frame';
  const headerClass = isVisual ? 'exhibition-diagram-header' : 'diagram-frame-header';
  const viewportClass = isVisual ? 'exhibition-viewport' : 'diagram-viewport';
  const badgeLabel = isVisual ? `INFOGRAPHIC // 0${index + 1}` : `DIAGRAM 0${index + 1}`;
  const curvePicker = curve
    ? `<div class="pill-container mr-1.5" role="group" aria-label="矢印の形状">${Object.entries(CURVE_LABELS).map(([key, label]) =>
        `<button type="button" data-curve="${key}" data-index="${index}" aria-pressed="${key === curve}" class="edge-curve-btn pill-btn text-[10px]${key === curve ? ' is-active' : ''}">${label}</button>`).join('')}</div>`
    : '';

  return `
    <div id="diagram-frame-${index}" class="${cardClass}">
      <div class="${headerClass}">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isVisual ? 'bg-amber-500 shadow-sm' : 'bg-blue-500'}"></span>
          <span class="font-mono text-[11px] font-bold tracking-wider" style="color: var(--text-primary);">${badgeLabel}</span>
        </div>
        <div class="flex items-center gap-1">
          ${curvePicker}
          <div class="pill-container mr-1.5">
            <button type="button" data-action="scale-fit" data-index="${index}" class="scale-btn pill-btn is-active text-[10px]">Fit</button>
            <button type="button" data-action="scale-actual" data-index="${index}" class="scale-btn pill-btn text-[10px]">1:1</button>
          </div>
          <button type="button" data-action="png" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">PNG</button>
          <button type="button" data-action="svg" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">SVG</button>
          <button type="button" data-action="zoom" data-index="${index}" class="text-[11px] font-bold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer">Expand</button>
        </div>
      </div>
      <div class="${viewportClass}" data-stage-index="${index}">
        ${content}
      </div>
    </div>
  `;
}

/* ==========================================================================
   Visual Stage 展示レイアウト構築
   ========================================================================== */
function buildVisualStageHtml(cleanHtml) {
  const temp = document.createElement('div');
  temp.innerHTML = cleanHtml;

  // h1 がない文書は、読み込んだファイル名を題名にする。どちらもなければヒーローを出さない
  let heroTitle = currentFileName !== 'untitled.md' ? currentFileName.replace(/\.[^.]+$/, '') : '';
  const h1 = temp.querySelector('h1');
  if (h1) {
    heroTitle = h1.textContent;
    h1.remove();
  }

  const slabs = [];
  let currentNodes = [];
  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      if (currentNodes.length > 0) slabs.push(currentNodes);
      currentNodes = [node];
    } else {
      currentNodes.push(node);
    }
  });
  if (currentNodes.length > 0) slabs.push(currentNodes);

  let slabsHtml = '';
  let sectionCounter = 0;

  slabs.forEach((nodes) => {
    const wrapper = document.createElement('div');
    nodes.forEach(n => wrapper.appendChild(n.cloneNode(true)));
    const h2 = wrapper.querySelector('h2');
    if (h2) {
      sectionCounter++;
      const numStr = String(sectionCounter).padStart(2, '0');
      const rawTitle = h2.textContent.replace(/^\d+\.\s*/, '');
      h2.innerHTML = `<span class="exhibition-num-badge">STAGE ${numStr}</span><span>${escapeHtml(rawTitle)}</span>`;
    }
    slabsHtml += `<section class="exhibition-slab">${wrapper.innerHTML}</section>`;
  });

  // 見出しの文字（textContent）はエスケープしてから埋め込む。そのまま入れると、見出しに書いた
  // &lt;img …&gt; などが HTML として解釈される（NFR-003）
  const heroHtml = heroTitle ? `
      <div class="exhibition-hero">
        <div class="four-color-bar">
          <span class="bg-[#E29578]"></span>
          <span class="bg-[#E6B34B]"></span>
          <span class="bg-[#A3B4E4]"></span>
          <span class="bg-[#6DB1B4]"></span>
        </div>
        <h1 class="font-display font-extrabold text-xl sm:text-2xl tracking-tight leading-tight mt-1" style="color: var(--text-primary);">
          ${escapeHtml(heroTitle)}
        </h1>
      </div>` : '';

  return `
    <div class="exhibition-wrap">
      ${heroHtml}
      ${slabsHtml}
    </div>
  `;
}

/* ==========================================================================
   メインレンダリングループ
   ========================================================================== */
function renderApp() {
  const rawMarkdown = document.getElementById('markdown-editor').value;
  // フロントマターは Marked に渡さない。渡すと先頭の --- が水平線、YAML が段落になる（DD-FM-001）
  const { yaml, body } = splitFrontMatter(rawMarkdown);
  const parsed = marked.lexer(body);

  const mermaidBlocks = [];
  const tokensToKeep = [];

  parsed.forEach(token => {
    if (token.type === 'code' && (token.lang || '').trim().toLowerCase() === 'mermaid') {
      const index = mermaidBlocks.length;
      const code = token.text.trim();
      const curve = getBlockCurve(index, code);
      const hash = fnv1aHash(code + state.appearance + state.palette + (curve || '') + state.infographicStyle + (state.isVisualMode ? 'vis' : 'std'));
      mermaidBlocks.push({ index, code, hash, curve });
      tokensToKeep.push({
        type: 'html',
        raw: `<div class="lucivo-slot" data-slot="${index}"></div>`,
        text: `<div class="lucivo-slot" data-slot="${index}"></div>`
      });
    } else {
      tokensToKeep.push(token);
    }
  });

  const frontMatterHtml = yaml !== null && state.showFrontMatter ? buildFrontMatterHtml(yaml) : '';
  const rawHtml = frontMatterHtml + marked.parser(tokensToKeep);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['div', 'span', 'strong', 'small'],
    ADD_ATTR: ['class', 'data-slot', 'style']
  });

  const stdContainer = document.getElementById('standard-doc-container');
  const visContainer = document.getElementById('visual-stage-container');
  const stdWrapper = document.getElementById('standard-doc-wrapper');
  const isVisual = state.isVisualMode;
  const generation = ++renderGeneration;
  const isEmpty = rawMarkdown.trim() === '';

  // 非表示側のコンテナは空にする。残すと同じ data-stage-index・SVG 内 id が DOM に重複し、
  // 描画結果の書き込み先やマーカー・グラデーションの参照先が非表示側に向いてしまう
  if (isVisual) {
    stdWrapper.classList.add('hidden');
    stdContainer.innerHTML = '';
    visContainer.classList.remove('hidden');
    visContainer.innerHTML = isEmpty
      ? `<div class="exhibition-wrap"><section class="exhibition-slab">${EMPTY_GUIDE_HTML}</section></div>`
      : buildVisualStageHtml(cleanHtml);
  } else {
    visContainer.classList.add('hidden');
    visContainer.innerHTML = '';
    stdWrapper.classList.remove('hidden');
    stdContainer.innerHTML = isEmpty ? EMPTY_GUIDE_HTML : cleanHtml;
  }

  const activeContainer = isVisual ? visContainer : stdContainer;
  renderMath(activeContainer);
  const slots = activeContainer.querySelectorAll('.lucivo-slot');
  const modeTag = isVisual ? `vis-${state.infographicStyle}` : 'std';

  const dirtyBlocks = [];
  const cachedKeys = new Map();

  slots.forEach(slot => {
    const idx = parseInt(slot.getAttribute('data-slot'), 10);
    const block = mermaidBlocks[idx];
    if (!block) return;

    const cacheKey = `${block.hash}-${modeTag}`;

    if (svgCache.has(cacheKey)) {
      slot.outerHTML = createDiagramCard(idx, svgCache.get(cacheKey), false, isVisual, block.curve);
      cachedKeys.set(idx, cacheKey);
    } else {
      slot.outerHTML = createDiagramCard(idx, '', true, isVisual, block.curve);
      dirtyBlocks.push({ ...block, modeTag, cacheKey });
    }
  });

  cachedKeys.forEach((cacheKey, idx) => {
    applyReadableFit(activeContainer.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
  });
  bindViewportInteractions(activeContainer);

  if (dirtyBlocks.length > 0) {
    processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
  } else {
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
}

// target: 描画開始時の表示先コンテナ・描画世代・モード。
// 描画中にモード切替や再描画が起きた場合（世代が変わった場合）は、古い描画結果を捨てる
async function processDirtyBlocks(dirtyBlocks, target) {
  updateStatus(`Rendering ${dirtyBlocks.length} diagrams...`, 'warning');
  const isStale = () => target.generation !== renderGeneration;

  // Mermaid は、図が初めて現れたときに読み込む
  const mermaidReady = await loadLibrary('mermaid');
  if (isStale()) return;
  if (!mermaidReady) {
    dirtyBlocks.forEach(block => {
      const vp = target.container.querySelector(`[data-stage-index="${block.index}"]`);
      if (vp) vp.innerHTML = '<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">Mermaid を読み込めませんでした（ネットワークの接続を確認してください）</div>';
    });
    updateStatus('• Mermaid Unavailable', 'warning');
    return;
  }

  for (const block of dirtyBlocks) {
    if (isStale()) return;
    const renderId = `mermaid-render-${block.index}-${Date.now()}`;
    const lkgKey = `${block.index}-${block.modeTag}`;
    const stageViewport = target.container.querySelector(`[data-stage-index="${block.index}"]`);
    try {
      setupMermaid(target.isVisual, block.curve || 'smooth');
      const { svg } = await mermaid.render(renderId, block.code);
      if (isStale()) return;
      const finalSvg = postProcessSvg(svg, target.isVisual);

      svgCache.set(block.cacheKey, finalSvg);
      lkgCache.set(lkgKey, finalSvg);

      if (stageViewport) {
        stageViewport.innerHTML = finalSvg;
        applyReadableFit(stageViewport.querySelector(':scope > svg'), block.cacheKey);
      }
    } catch (err) {
      console.error(`Mermaid render failed for block ${block.index}:`, err);
      if (isStale()) return;
      const fallback = lkgCache.get(lkgKey);
      if (stageViewport) {
        if (fallback) {
          stageViewport.innerHTML = fallback;
          applyReadableFit(stageViewport.querySelector(':scope > svg'));
          showToast('構文エラーのため直前の正常状態を表示');
        } else {
          stageViewport.innerHTML = `<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">構文エラー: 正しいMermaid記法を入力してください</div>`;
        }
      }
    }
  }

  updateStatus(`• All Diagrams Verified`, 'success');
}

/* ==========================================================================
   ビューポート操作イベント
   ========================================================================== */
// container: 表示中のコンテナ。非表示側の図を操作しないよう、探索範囲を限定する
function bindViewportInteractions(container) {
  // 矢印の形状を選ぶと、その図だけキャッシュのキーが変わり、描き直される（DD-EDGE-011）
  container.querySelectorAll('.edge-curve-btn').forEach(btn => {
    btn.onclick = () => {
      state.curveByIndex.set(parseInt(btn.getAttribute('data-index'), 10), btn.getAttribute('data-curve'));
      renderApp();
    };
  });

  container.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const action = btn.getAttribute('data-action');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      const frame = btn.closest(`#diagram-frame-${idx}`);
      if (!vp || !frame) return;

      frame.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (action === 'scale-actual') {
        vp.classList.add('is-actual-size');
      } else {
        vp.classList.remove('is-actual-size');
      }
    };
  });

  container.querySelectorAll('[data-action="svg"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;
      downloadBlob(svgEl.outerHTML, `diagram-0${parseInt(idx, 10) + 1}.svg`, 'image/svg+xml');
      showToast(`Diagram 0${parseInt(idx, 10) + 1} SVGをダウンロード`);
    };
  });

  container.querySelectorAll('[data-action="png"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URLObj = window.URL || window.webkitURL || window;
      const blobURL = URLObj.createObjectURL(svgBlob);
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = 2;
        const bbox = svgEl.getBoundingClientRect();
        canvas.width = (bbox.width || 800) * scale;
        canvas.height = (bbox.height || 600) * scale;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = state.appearance === 'dark' ? getDiagramSpec(state.isVisualMode).canvasBg : '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          const dlUrl = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = dlUrl;
          a.download = `diagram-0${parseInt(idx, 10) + 1}.png`;
          a.click();
          URL.revokeObjectURL(dlUrl);
          showToast(`Diagram 0${parseInt(idx, 10) + 1} PNG (高解像度) をダウンロード`);
        });
        URLObj.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    };
  });

  container.querySelectorAll('[data-action="zoom"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      if (!vp) return;
      const svgEl = vp.querySelector('svg');
      if (!svgEl) return;

      const modal = document.getElementById('zoom-modal');
      const zoomCanvas = document.getElementById('zoom-canvas');
      zoomCanvas.innerHTML = svgEl.outerHTML;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    };
  });
}

/* ==========================================================================
   イベントハンドラー結線
   ========================================================================== */
function setupEventListeners() {
  const editor = document.getElementById('markdown-editor');
  editor.addEventListener('input', () => {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(renderApp, 250);
  });

  document.querySelectorAll('.view-mode-btn').forEach(btn => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-view-mode');
      state.viewMode = mode;
      document.querySelectorAll('.view-mode-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const paneEditor = document.getElementById('pane-editor');
      const panePreview = document.getElementById('pane-preview');

      if (mode === 'split') {
        paneEditor.classList.remove('hidden');
        panePreview.classList.remove('hidden');
        paneEditor.className = 'w-full lg:w-[40%] h-[42%] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r shrink-0 z-10';
      } else if (mode === 'canvas') {
        paneEditor.classList.add('hidden');
        panePreview.classList.remove('hidden');
      } else if (mode === 'editor') {
        paneEditor.classList.remove('hidden');
        panePreview.classList.add('hidden');
        paneEditor.className = 'w-full h-full flex flex-col shrink-0 z-10';
      }
    };
  });

  const btnVisual = document.getElementById('btn-visual-mode');
  btnVisual.onclick = () => {
    state.isVisualMode = !state.isVisualMode;
    if (state.isVisualMode) {
      btnVisual.classList.add('is-active');
      showToast('🎨 Visual Stage (インフォグラフィック) を起動');
    } else {
      btnVisual.classList.remove('is-active');
      showToast('仕様書モードに戻りました');
    }
    renderApp();
  };

  document.querySelectorAll('.info-style-btn').forEach(btn => {
    btn.onclick = () => {
      const style = btn.getAttribute('data-info-style');
      state.infographicStyle = style;
      document.querySelectorAll('.info-style-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      if (!state.isVisualMode) {
        state.isVisualMode = true;
        btnVisual.classList.add('is-active');
      }
      renderApp();
      showToast(`スタイル適用: ${btn.textContent.trim()}`);
    };
  });

  document.querySelectorAll('.palette-option-btn').forEach(btn => {
    btn.onclick = () => {
      const pal = btn.getAttribute('data-palette-set');
      state.palette = pal;
      document.querySelectorAll('.palette-option-btn').forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-palette-set') === pal);
      });
      const activeLabel = document.getElementById('active-palette-name');
      if (activeLabel) activeLabel.textContent = pal.charAt(0).toUpperCase() + pal.slice(1);
      setupMermaid();
      renderApp();
      showToast(`テーマ色: ${pal.toUpperCase()}`);
    };
  });

  const btnTheme = document.getElementById('btn-theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  btnTheme.onclick = () => {
    state.appearance = state.appearance === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-appearance', state.appearance);
    if (state.appearance === 'dark') {
      iconSun.classList.add('hidden');
      iconMoon.classList.remove('hidden');
    } else {
      iconSun.classList.remove('hidden');
      iconMoon.classList.add('hidden');
    }
    setupMermaid();
    renderApp();
  };

  const settingsModal = document.getElementById('settings-modal');
  document.getElementById('btn-open-settings').onclick = () => {
    settingsModal.classList.remove('hidden');
    settingsModal.classList.add('flex');
  };
  document.getElementById('btn-close-settings').onclick = () => {
    settingsModal.classList.add('hidden');
    settingsModal.classList.remove('flex');
  };

  const zoomModal = document.getElementById('zoom-modal');
  document.getElementById('zoom-close-btn').onclick = () => {
    zoomModal.classList.add('hidden');
    zoomModal.classList.remove('flex');
    // 閉じた後に複製した SVG を残さない
    document.getElementById('zoom-canvas').innerHTML = '';
  };

  document.getElementById('btn-export-html').onclick = () => {
    const fullHtml = document.documentElement.outerHTML;
    downloadBlob(fullHtml, 'lucivo-architecture-export.html', 'text/html');
    showToast('単一HTMLファイルをエクスポートしました');
  };

  document.getElementById('btn-test-cache').onclick = () => {
    const t0 = performance.now();
    renderApp();
    const duration = (performance.now() - t0).toFixed(1);
    showToast(`キャッシュ再描画: ${duration}ms (0ms相当)`);
  };

  document.getElementById('btn-test-err').onclick = () => {
    editor.value += '\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n';
    renderApp();
  };
}

/* ==========================================================================
   ファイルメニュー（Markdown ファイルの読み込み）
   ========================================================================== */
function closeFileMenu() {
  document.getElementById('file-menu').classList.add('hidden');
  document.getElementById('btn-file-menu').setAttribute('aria-expanded', 'false');
}

// 最後に読み込んだ（または保存した）時点から編集していれば、置き換える前に確認する
function confirmDiscardEdits(fileName) {
  const editor = document.getElementById('markdown-editor');
  if (editor.value === lastLoadedMarkdown) return true;
  return window.confirm(`編集中の内容は失われます。「${fileName}」を読み込みますか？`);
}

function loadMarkdownFile(file) {
  if (!confirmDiscardEdits(file.name)) return;
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result).replace(/^﻿/, '');
    document.getElementById('markdown-editor').value = text;
    lastLoadedMarkdown = text;
    currentFileName = file.name;
    state.curveByIndex.clear();
    setEditorReadOnly(true);
    clearTimeout(renderDebounceTimer);
    renderApp();
    document.getElementById('preview-scroll').scrollTop = 0;
    showToast(`「${file.name}」を読み込みました`);
  };
  reader.onerror = () => {
    console.error('Failed to read file:', reader.error);
    showToast(`「${file.name}」を読み込めませんでした`);
  };
  reader.readAsText(file, 'UTF-8');
}

// 読み込み直後の閲覧中に誤って編集しないよう、エディタと、内容を変えるボタンをまとめて切り替える（DD-FILE-040）
function setEditorReadOnly(isReadOnly) {
  document.getElementById('markdown-editor').readOnly = isReadOnly;
  document.getElementById('editor-lock').classList.toggle('hidden', !isReadOnly);
  document.getElementById('btn-test-err').disabled = isReadOnly;
}

// エディタの内容をダウンロードする。元のファイルは上書きしない（DD-FILE-030）
function saveMarkdownFile() {
  const text = document.getElementById('markdown-editor').value;
  downloadBlob(text, currentFileName, 'text/markdown;charset=utf-8');
  lastLoadedMarkdown = text;
  showToast(`「${currentFileName}」を保存しました`);
}

function setupFileMenu() {
  const btnMenu = document.getElementById('btn-file-menu');
  const menu = document.getElementById('file-menu');
  const input = document.getElementById('file-input');

  btnMenu.onclick = event => {
    event.stopPropagation();
    const willOpen = menu.classList.contains('hidden');
    menu.classList.toggle('hidden', !willOpen);
    btnMenu.setAttribute('aria-expanded', String(willOpen));
  };
  document.getElementById('menu-open-markdown').onclick = () => {
    closeFileMenu();
    input.click();
  };
  document.getElementById('btn-save-markdown').onclick = saveMarkdownFile;
  document.getElementById('btn-edit-unlock').onclick = () => {
    setEditorReadOnly(false);
    document.getElementById('markdown-editor').focus();
  };
  input.onchange = () => {
    const file = input.files && input.files[0];
    // 同じファイルを続けて選んでも change が発生するよう、選択を解除する
    input.value = '';
    if (file) loadMarkdownFile(file);
  };
  document.addEventListener('click', event => {
    if (!menu.contains(event.target)) closeFileMenu();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeFileMenu();
  });
}

// フロントマターの表示 ON / OFF。モードにかかわらず効き、モードを切り替えても状態を保つ（DD-FM-011）
function setupFrontMatterToggle() {
  const btn = document.getElementById('btn-front-matter');
  btn.addEventListener('click', () => {
    state.showFrontMatter = !state.showFrontMatter;
    btn.setAttribute('aria-pressed', String(state.showFrontMatter));
    btn.classList.toggle('is-active', state.showFrontMatter);
    renderApp();
  });
}

window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('[data-view-mode="split"]').classList.add('is-active');
  setupEventListeners();
  setupFileMenu();
  setupFrontMatterToggle();
  setupMarkedMath();
  setupMermaid();
  renderApp();
});

