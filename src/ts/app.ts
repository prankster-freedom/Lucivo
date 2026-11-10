import { escapeHtml } from './utils/escape';
import { hexToRgba } from './utils/color';
import { treeTokenFor } from './markdown/tree';
import { MATH_PLOT_BOX, getTexPlotSpec, getCachedMathPlotDataUrl, clearMathPlotCache } from './math/plot';

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

// モーダル要素（#settings-modal, #zoom-modal, #shortcut-modal）の開閉状態を統一的に扱う共通ヘルパー
function resolveModal(idOrEl) {
  return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
}

function isModalOpen(idOrEl) {
  const modal = resolveModal(idOrEl);
  return Boolean(modal && !modal.classList.contains('hidden'));
}

function setModalOpen(idOrEl, open) {
  const modal = resolveModal(idOrEl);
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  modal.classList.toggle('flex', Boolean(open));
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
const VISUAL_STYLE_KEYS = Object.keys(VISUAL_THEMES);

const NODE_DECORATED_TYPES = ['flowchart-v2', 'flowchart', 'stateDiagram'];

// 図種ごとの矢印の既定の形状（FR-012）。フローチャートは業務フロー図で一般的な直角にする
const DEFAULT_CURVES = { flowchart: 'step', state: 'smooth', class: 'step' };
const CURVE_LABELS = { smooth: '曲線', step: '直角', straight: '直線' };

// Fit 表示で保つ、図の中の文字の表示上の最小サイズ（NFR-005）と、小さな図の拡大の上限
const MIN_FIT_FONT_PX = 10;
const MAX_FIT_SCALE = 1.5;

// マインドマップなどの枝ごとの色（cScale）と円グラフの色（pie）。Mermaid は darkMode のとき派生色を暗くしすぎ、
// Dark の背景の上でノードと枝、スライスと凡例が黒く沈むので、明度をそろえた色を明示する（DD-DIAG-025）
const DARK_SECTION_HUES = [215, 172, 262, 32, 145, 330, 195, 12, 95, 285, 50, 240];
function darkSectionScale() {
  const vars = {};
  DARK_SECTION_HUES.forEach((hue, i) => {
    vars[`cScale${i}`] = `hsl(${hue}, 45%, 38%)`;
    vars[`cScalePeer${i}`] = `hsl(${hue}, 50%, 58%)`;
    vars[`cScaleLabel${i}`] = '#F1F5F9';
    vars[`pie${i + 1}`] = `hsl(${hue}, 45%, 42%)`;
  });
  return vars;
}
// Vibrant Circles で、白文字では読みにくい明るい塗り
const CIRCLE_DARK_TEXT_FILLS = ['#ECB674'];
// シーケンス図のメッセージの数式を、メッセージ線から離す量（SVG の座標単位）
const SEQUENCE_MATH_LIFT = 6;

// 公開リポジトリ（最新版の配布元）。ヘッダーのロゴのリンク（index.html）も同じ URL にする（FR-024）
const REPOSITORY_URL = 'https://github.com/prankster-freedom/Lucivo';
// 新しいタブで開き、開いたページから Lucivo の画面を操作されないようにする
const REPOSITORY_LINK_ATTRS = `href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer"`;

const EMPTY_GUIDE_HTML = `
<div class="empty-guide">
  <div class="empty-guide-logo">
    <a class="brand-link" ${REPOSITORY_LINK_ATTRS} title="Lucivo の公開リポジトリ（最新版）を開く">
      <img class="brand-logo-light" src="./assets/logos/light/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
      <img class="brand-logo-dark" src="./assets/logos/dark/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
    </a>
  </div>
  <h3 class="empty-guide-title">Markdown を開いてください</h3>
  <p class="empty-guide-desc">ヘッダーの「開く」メニューから「ファイルを開く…」でローカルファイルを、「フォルダを開く…」でフォルダの Markdown を一覧から読み込むか、同梱の <code>Visualモードサンプル (visual-sample.md)</code> / <code>記法サンプル (notation_sample.md)</code> をワンクリックで開けます。左のエディタに直接入力することもできます。</p>
  
  <div class="empty-guide-modes">
    <div class="empty-guide-card">
      <h4>⚡ 高速モード</h4>
      <p>思考を邪魔しないミリ秒応答の軽快なプレビュー。仕様書の執筆や構造の確認に最適です。</p>
    </div>
    <div class="empty-guide-card">
      <h4>🎨 Visualモード (展示品質)</h4>
      <p>講演資料や展示ブースの大画面で映えるプロ品質のインフォグラフィックへ瞬時に変換します。</p>
    </div>
    <div class="empty-guide-card">
      <h4>🎤 ステージ発表 (発表モード)</h4>
      <p>ヘッダーの「発表」ボタン（または <kbd class="kbd-key">P</kbd> キー）で全画面のプレゼンテーション舞台へ。章ごとのページ送り、光が伝わるシグナル・ライト、全シーン俯瞰 (Oキー)、光のポインター (Lキー)、幕間・質疑カーテン (B/Qキー)、自動進行ループ (Aキー) で魅せます。</p>
    </div>
  </div>

  <p class="empty-guide-footer">💡 画面上部の <strong>[ 高速モード | Visualモード ]</strong> や <strong>[ 発表 ]</strong> ボタンからいつでもワンクリックで体験できます。キーボードの <kbd class="kbd-key">?</kbd> キーでショートカット一覧を表示できます。</p>
  <p class="empty-guide-latest">最新版はこちら: <a ${REPOSITORY_LINK_ATTRS}>github.com/prankster-freedom/Lucivo</a></p>
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
  mermaid: { script: './vendor/mermaid.min.js', global: 'mermaid' },
  katex: {
    script: './vendor/katex/katex.min.js',
    style: './vendor/katex/katex.min.css',
    global: 'katex'
  },
  // Visualモードの舞台演出（FR-018, FR-019）。高速モードの起動には読み込まない（NFR-006）
  stage: { script: './js/stage.js', global: 'LucivoStage' },
  // file:// 直開き時の同梱サンプル読み込みフォールバック（FR-006）。サンプルを選んだときだけ読み込む（NFR-006）
  samples: { script: './samples/samples-data.js', global: 'LUCIVO_SAMPLES' }
};
const libraryLoads = new Map();
// 書き出した HTML はアプリの外へ持ち出すため、同梱ファイルの相対パスを CDN の URL に置き換える（DD-OFF-003）
const EXPORT_URLS = {
  './vendor/fonts/fonts.css': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
  './vendor/marked.min.js': 'https://cdn.jsdelivr.net/npm/marked@18.1.3/lib/marked.umd.js',
  './vendor/purify.min.js': 'https://cdn.jsdelivr.net/npm/dompurify@3.4.17/dist/purify.min.js',
  './vendor/mermaid.min.js': 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js',
  './vendor/katex/katex.min.js': 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js',
  './vendor/katex/katex.min.css': 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css'
};

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
// ファイルを読み込んだ後のウィンドウのタイトルは「ファイル名 - Lucivo」（DD-FILE-050）
const APP_TITLE_SUFFIX = ' - Lucivo';
// ドロップで開けるファイル。ファイル選択（#file-input の accept）と同じ拡張子にする（DD-FILE-060）
const DROPPABLE_FILE_PATTERN = /\.(md|markdown|txt)$/i;

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

// 矢印の形状を選べる図種か。Mermaid 12 で curve の設定が効くのはフローチャート・状態遷移図・クラス図（DD-EDGE-001）
function getCurveTarget(code) {
  const first = code.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith('%%')) || '';
  if (/^(flowchart|graph)\b/.test(first)) return 'flowchart';
  if (/^stateDiagram(-v2)?\b/.test(first)) return 'state';
  if (/^classDiagram(-v2)?\b/.test(first)) return 'class';
  return null;
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

// Mermaid 12 の layout は図全体に効く。マインドマップは dagre だと放射状でなくなるので、既定のレイアウトにする。
// 直角のクラス図も既定のレイアウトにする。dagre の stepAfter は線の出発点で横に進むため、
// 出発点に付く継承などの記号が横を向く。既定のレイアウトは縦 → 横 → 縦の直角で結ぶ（DD-EDGE-005）
function getMermaidLayout(code, curve = null) {
  if (/^\s*mindmap\b/m.test(code)) return null;
  if (curve === 'step' && getCurveTarget(code) === 'class') return null;
  return 'dagre';
}

function setupMermaid(isVisual = state.isVisualMode, curve = 'smooth', layout = 'dagre') {
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
    // Mermaid 12 の既定の見た目とレイアウトでは flowchart.curve が効かず、図の組版も変わる
    look: 'classic',
    ...(layout ? { layout } : {}),
    // 開いた Markdown の図の中の HTML タグとクリック時のスクリプト呼び出しを無効にする（NFR-003）
    securityLevel: 'strict',
    // 構文エラーの図を Mermaid に描かせない。描かせると body に要素が残り、編集のたびに積み上がる。
    // エラーはアプリが図のカードの中に表示する（DD-DIAG-064）
    suppressErrorRendering: true,
    fontFamily: '"Inter", "Noto Sans JP", -apple-system, sans-serif',
    fontSize: 13,
    flowchart: {
      curve: getMermaidCurve(curve),
      // Mermaid 12 は padding を両側に効かせ、短いラベルも minNodeWidth まで広げる。従来の組版に合わせる
      padding: 11,
      minNodeWidth: 0,
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
      curve: getMermaidCurve(curve),
      padding: 8,
      minNodeWidth: 0,
      dividerMargin: 18,
      sizeUnit: 8,
      useMaxWidth: true
    },
    class: {
      curve: getMermaidCurve(curve)
    },
    themeVariables: {
      darkMode: isDark,
      ...(isDark ? darkSectionScale() : {}),
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
      // Dark ではスライスを明度をそろえた中間色で塗るので（darkSectionScale）、スライスの上の文字は明るくする
      pieSectionTextColor: isDark ? '#F1F5F9' : spec.nodeText,
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

// 見出しに元の Markdown の行番号（renderApp() が最上位の見出しのトークンに付けた srcLine）を data-src-line として出力する。
// Split 表示の編集位置への追従（FR-037）が、プレビューの見出しと元の行を対応づけるために使う（DD-DIAG-060）
function setupMarkedHeadings() {
  marked.use({
    renderer: {
      heading(token) {
        const attr = Number.isInteger(token.srcLine) ? ` data-src-line="${token.srcLine}"` : '';
        return `<h${token.depth}${attr}>${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      }
    }
  });
}

/* ==========================================================================
   コールアウト（GitHub アラート記法, FR-034）: サニタイズ後の DOM で、最初の行がマーカーだけの引用を注意書きのパネルにする
   ========================================================================== */
const ALERT_LABELS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };
// マーカーの後ろに同じ行で文字が続くもの（[!NOTE] 本文）は、GitHub と同じく通常の引用のままにする
const ALERT_MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;

// 引用の最初の段落の先頭の文字だけを調べ、要素の大きさは計測しない（NFR-006, DD-MD-021）
function decorateAlerts(container) {
  container.querySelectorAll('blockquote').forEach(quote => {
    const first = quote.firstElementChild;
    const head = first && first.tagName === 'P' ? first.firstChild : null;
    const match = head && head.nodeType === Node.TEXT_NODE ? ALERT_MARKER_RE.exec(head.textContent) : null;
    if (!match) return;
    const type = match[1].toLowerCase();
    head.textContent = head.textContent.slice(match[0].length);
    if (!head.textContent && head.nextSibling && head.nextSibling.nodeName === 'BR') head.nextSibling.remove();
    if (!first.textContent.trim() && !first.querySelector('img, .lucivo-math')) first.remove();

    const alert = document.createElement('div');
    alert.className = `md-alert md-alert-${type}`;
    alert.setAttribute('role', 'note');
    const title = document.createElement('p');
    title.className = 'md-alert-title';
    const icon = document.createElement('span');
    icon.className = 'md-alert-icon';
    icon.setAttribute('aria-hidden', 'true');
    title.append(icon, ALERT_LABELS[type]);
    alert.append(title, ...quote.childNodes);
    quote.replaceWith(alert);
  });
}

// サニタイズ後の HTML に入れた置き場所へ描画する。trust: false で、リンクや任意の属性を作るコマンドは描画しない
// KaTeX は、数式が初めて現れたときに読み込む。読み込めなければ置き場所の原文のまま（DD-MATH-022）。
// Visualモードでは x の関数の数式を検出し、PNG ラスター画像の補足グラフを数式と併記する（FR-048, DD-VTPL-144）
function renderMath(container) {
  const targets = container.querySelectorAll('.lucivo-math');
  if (targets.length === 0) return;
  if (!window.katex) {
    loadLibrary('katex').then(ok => { if (ok && container.isConnected) renderMath(container); });
    return;
  }
  const isVisualStage = state.isVisualMode && container.id === 'visual-stage-container';
  targets.forEach(el => {
    const isDisplay = el.dataset.display === 'true';
    const tex = el.dataset.tex || '';
    const key = `${isDisplay ? 'D' : 'I'}:${tex}`;
    if (!mathCache.has(key)) {
      mathCache.set(key, katex.renderToString(tex, {
        displayMode: isDisplay,
        throwOnError: false,
        trust: false,
        output: 'htmlAndMathml'
      }));
    }
    const katexHtml = mathCache.get(key);
    const plotSpec = isVisualStage && !el.closest('svg') ? getTexPlotSpec(tex) : null;
    if (plotSpec) {
      const dataUrl = getCachedMathPlotDataUrl(plotSpec, isDisplay, state.infographicStyle, state.appearance, tex);
      const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
      const aria = `関数の補足グラフ: ${plotSpec.fns.map(f => f.label).join(', ')}`;
      el.classList.add('has-math-plot', isDisplay ? 'is-block-plot' : 'is-inline-plot');
      const tag = isDisplay ? 'div' : 'span';
      el.innerHTML = `<${tag} class="vs-math-formula">${katexHtml}</${tag}>`
        + `<img class="vs-math-plot-img${isDisplay ? '' : ' is-inline'}" src="${dataUrl}" width="${box.w}" height="${box.h}" alt="${escapeHtml(aria)}" />`;
    } else {
      el.classList.remove('has-math-plot', 'is-block-plot', 'is-inline-plot');
      el.innerHTML = katexHtml;
    }
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

// SVG 内の id を SVG ごとに一意にし、url(#…)・href・aria 参照を書き換える。
// Mermaid はシーケンス図の矢じり（#arrowhead）などを図をまたいで同じ id で出力するため、
// 同じページに複数の図があると、別の図（非表示のものを含む）のマーカーやグラデーションを参照してしまう
function scopeSvgIds(svg) {
  const prefix = svg.id || `lucivo-${Math.random().toString(36).slice(2, 9)}`;
  const idMap = new Map();
  const used = new Set();
  svg.querySelectorAll('[id]').forEach(el => {
    // Mermaid が 1 つの図の中で同じ id を出すこと（タイムラインの node-undefined など）があるため、
    // 2 つ目以降には連番を付ける。参照は最初の要素に向けたままにする。
    // Mermaid は図の id を接頭辞に付けた id も出すので、それには接頭辞を重ねない
    const base = el.id.startsWith(prefix) ? el.id : `${prefix}-${el.id}`;
    let scoped = base;
    for (let n = 2; used.has(scoped); n++) scoped = `${base}-${n}`;
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
  // Mermaid はライフラインの class に "200" を含めて出力する（10.9 系は "200"、12.3.0 は "actor-line 200"）ため、id でも拾う
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
    fit = {
      naturalWidth: Math.ceil(viewBox.width),
      minWidth: Math.ceil(viewBox.width * minScale),
      maxWidth: Math.ceil(viewBox.width * MAX_FIT_SCALE)
    };
    if (cacheKey) fitCache.set(cacheKey, fit);
  }
  if (fit.minWidth) svg.style.minWidth = `${fit.minWidth}px`;
  svg.style.setProperty('--fit-max-width', `${fit.maxWidth}px`);
  svg.style.setProperty('--natural-width', `${fit.naturalWidth}px`);
  updateSlabSplit(svg.closest('.exhibition-slab-split'));
}

// 2 段組みスラブで、右カラムの表示枠より図が広い場合、または 1:1（実寸）表示に切り替えた場合は 1 段組み（is-stacked）に切り替える（FR-015, DD-DIAG-042）
function updateSlabSplit(slab) {
  if (!slab || !slab.classList.contains('exhibition-slab-split')) return;
  const vp = slab.querySelector('.exhibition-viewport');
  if (!vp || !vp.querySelector(':scope > svg')) return;
  slab.classList.remove('is-stacked');
  if (vp.classList.contains('is-actual-size') || vp.scrollWidth > vp.clientWidth + 1) {
    slab.classList.add('is-stacked');
  }
}

function updateAllSlabSplits(container) {
  if (!container) return;
  container.querySelectorAll('.exhibition-slab-split').forEach(updateSlabSplit);
}

// path の d（絶対座標）が囲む範囲。曲線の制御点も含むので、わずかに大きくなることがある
function pathBox(path) {
  const points = Array.from((path && path.getAttribute('d') || '').matchAll(/(-?[\d.]+)[\s,]+(-?[\d.]+)/g));
  if (!points.length) return null;
  const xs = points.map(p => parseFloat(p[1]));
  const ys = points.map(p => parseFloat(p[2]));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

function createSvgElement(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)));
  return el;
}

// Mermaid 12 はスタジアム形のノードを path で出力する。図の装飾は rect を前提にするので、rect に置き換える
function normalizeStadiumNodes(svg) {
  svg.querySelectorAll('g.node > g.basic.label-container.outer-path').forEach(group => {
    const path = group.querySelector('path');
    const box = pathBox(path);
    if (!box) return;
    const rect = createSvgElement('rect', { class: 'basic label-container', ...box, rx: box.height / 2, ry: box.height / 2 });
    if (path.getAttribute('style')) rect.setAttribute('style', path.getAttribute('style'));
    group.replaceWith(rect);
  });
}

// Mermaid 12 は状態遷移図の分岐（choice）とフォーク・ジョイン（fork / join）を path で出力する。
// 図の装飾と CSS は 10 系の polygon.state-start と rect.fork-join を前提にするので、置き換える
function normalizeStateNodes(svg) {
  svg.querySelectorAll('g.node.statediagram-state').forEach(node => {
    const group = node.querySelector(':scope > g:not(.label)');
    if (!group || node.querySelector('text, foreignObject, rect, circle')) return;
    const box = pathBox(group.querySelector('path'));
    if (!box || !box.width || !box.height) return;
    let shape;
    if (box.height <= 12 && box.width > box.height * 2) {
      shape = createSvgElement('rect', { class: 'fork-join', ...box });
    } else {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const hw = box.width / 2;
      const hh = box.height / 2;
      shape = createSvgElement('polygon', { class: 'state-start', points: `${cx},${cy + hh} ${cx + hw},${cy} ${cx},${cy - hh} ${cx - hw},${cy}` });
    }
    group.replaceWith(shape);
  });
}

function postProcessSvg(rawSvg, isVisualMode) {
  try {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = rawSvg;
    const svg = wrapper.querySelector('svg');
    if (!svg) return rawSvg;

    const diagramType = svg.getAttribute('aria-roledescription') || '';
    // クラス図や要件図の箱も同じ構造で出力されるので、フローチャートに限る
    if (diagramType === 'flowchart-v2') normalizeStadiumNodes(svg);
    if (diagramType === 'stateDiagram') normalizeStateNodes(svg);
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
    // 帯はカードの上部に重なるため、ラベルを帯の下の白い部分の中央へ下げる。Mermaid 12 はラベルの行の高さが大きいので 2px 足す
    const label = g.querySelector(':scope > .label');
    if (label) label.setAttribute('transform', `${label.getAttribute('transform') || ''} translate(0, ${capH / 2 + 2})`.trim());

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
// 記述パターン別の雛形の判定（FR-016, DD-VTPL-001）。els: スラブの本文要素（h2・フロントマター・図を除く）。
// タグ名と文字数だけで判定し、計算後のスタイルは使わない（TC-PERF-002）。順序は DTP-VTPL-001 の表のとおり
const TEMPLATE_LIMITS = {
  leadChars: 160, itemChars: 100, quoteChars: 240, points: [2, 6], steps: [2, 8],
  glossary: [2, 12], glossaryTermChars: 40, glossaryItemChars: 200, glossaryTwoUp: 7
};
// 雛形の項目に入れると組めない要素（入れ子のリスト・コード・表・引用・チェックボックス）
const TEMPLATE_ITEM_BLOCKERS = 'ul, ol, pre, table, blockquote, input';

// 定義リスト型（FR-035, DTP-VTPL-045）: 「**用語** — 説明」の太字とダッシュ。コロン区切りは要点カード型の書き方のため含めない（RGH-909）
const GLOSSARY_SEPARATOR_RE = /^\s*[—–―]\s*/;

function glossaryParts(li) {
  const head = li.firstChild;
  const rest = head && head.nextSibling;
  if (!head || head.nodeName !== 'STRONG' || !rest || rest.nodeType !== Node.TEXT_NODE || !GLOSSARY_SEPARATOR_RE.test(rest.textContent)) return null;
  return { head, rest };
}

function isGlossaryList(items) {
  const [min, max] = TEMPLATE_LIMITS.glossary;
  return items.length >= min && items.length <= max && items.every(li => {
    const parts = glossaryParts(li);
    return parts && !li.querySelector(TEMPLATE_ITEM_BLOCKERS)
      && parts.head.textContent.trim().length <= TEMPLATE_LIMITS.glossaryTermChars
      && li.textContent.trim().length <= TEMPLATE_LIMITS.glossaryItemChars;
  });
}

function detectSlabTemplate(els, slotCount) {
  if (slotCount > 0 || els.length === 0) return 'standard';
  const textLen = el => el.textContent.trim().length;
  const tags = els.map(el => el.tagName);

  const leadLen = els.reduce((sum, el) => sum + textLen(el), 0);
  if (tags.every(t => t === 'P') && els.length <= 2 && leadLen > 0 && leadLen <= TEMPLATE_LIMITS.leadChars) return 'lead';

  const list = els[els.length - 1];
  const hasIntro = els.length === 2 && tags[0] === 'P';
  if ((els.length === 1 || hasIntro) && (list.tagName === 'UL' || list.tagName === 'OL')) {
    const items = Array.from(list.children);
    if (list.tagName === 'UL' && isGlossaryList(items)) return 'glossary';
    const plain = items.every(li => !li.querySelector(TEMPLATE_ITEM_BLOCKERS) && textLen(li) <= TEMPLATE_LIMITS.itemChars);
    const [min, max] = list.tagName === 'UL' ? TEMPLATE_LIMITS.points : TEMPLATE_LIMITS.steps;
    if (plain && items.length >= min && items.length <= max) return list.tagName === 'UL' ? 'points' : 'steps';
  }

  if (els.length === 1 && tags[0] === 'BLOCKQUOTE') {
    const paras = Array.from(els[0].children);
    if (paras.length >= 1 && paras.length <= 3 && paras.every(p => p.tagName === 'P') && textLen(els[0]) <= TEMPLATE_LIMITS.quoteChars) return 'quote';
  }
  return 'standard';
}

// 要点カードの先頭太字が KPI 数値（例: "120 ms", "99.9%", "+38%", "4.2倍", "0件", "$1.2M"）である場合の判定（FR-027, DTP-VTPL-035）
const METRIC_TITLE_RE = /^[+\-−±≈~]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|ms|s|sec|min|h|fps|Hz|kHz|MHz|GHz|KB|MB|GB|TB|px|rem|em|vw|vh|x|×|倍|件|個|円|万|億|回|人|台|年|月|日|時間|分|秒|字|項目|行|列|枚|種|点|章|節|段|[a-zA-Z]{1,4})?(?:\s*[/／]\s*[a-zA-Z0-9一-龠ぁ-んァ-ヶ]+)?$/;

// 要点カードの全項目の太字タイトルが年・四半期・年月・Phase・Step・vX.Y 等の時系列ラベルである場合の判定（FR-029, DTP-VTPL-036）
const TIMELINE_TITLE_RE = /^(?:(?:19|20)\d{2}(?:[年/\-.\s]*(?:Q[1-4]|H[12]|[01]?\d(?:月)?))?|Q[1-4]\s*(?:19|20)?\d{2}|(?:Phase|Step|Stage|Wave|Sprint|Day|Week|Month|Year)\s*\d+|第\s*\d+\s*(?:期|世代|段階|フェーズ)|v\d+\.\d+(?:\.\d+)?)$/i;

// 2 項目の要点カードが Before / After（従来 / 新方式、課題 / 解決 等）の対である場合の判定（FR-030, DTP-VTPL-037）
const COMPARE_BEFORE_RE = /^(?:Before|As[\s-]?Is|Legacy|Old|従来(?:方式|手法)?|旧(?:方式|世代|システム)?|変更前|導入前|課題|問題点)(?:\s*[:：\-—/／(（].*)?$/i;
const COMPARE_AFTER_RE = /^(?:After|To[\s-]?Be|New|Modern|Lucivo|新(?:方式|手法|世代|システム)?|変更後|導入後|解決(?:策)?|改善後)(?:\s*[:：\-—/／(（].*)?$/i;

// 雛形に合わせて本文要素を組み替える（DD-VTPL-010〜014, 035〜037）。els はスラブの DOM の中の要素で、直接書き換える
function applySlabTemplate(template, els) {
  const last = els[els.length - 1];
  if (template === 'lead') {
    const lead = document.createElement('div');
    lead.className = 'vs-lead';
    els[0].before(lead);
    els.forEach(el => lead.appendChild(el));
  } else if (template === 'points') {
    // 列の数は項目の数から決め、最後の行に 1 枚だけ残る端数を作らない（DTP-VTPL-030, RGH-902）
    const items = Array.from(last.children);
    const count = items.length;
    last.classList.add('vs-points');
    last.style.setProperty('--vs-cols', String(count === 4 ? 2 : Math.min(count, 3)));
    last.style.setProperty('--vs-cols-wide', String(count === 4 ? 4 : Math.min(count, 3)));
    // 「**題**: 説明」の項目は、太字を題として切り出し、区切りの : を消す（DTP-VTPL-030）
    const titles = [];
    items.forEach(li => {
      const head = li.firstChild;
      const rest = head && head.nextSibling;
      if (head && head.nodeName === 'STRONG' && rest && rest.nodeType === 3 && /^\s*[:：]/.test(rest.textContent)) {
        head.classList.add('vs-point-title');
        rest.textContent = rest.textContent.replace(/^\s*[:：]\s*/, '');
        const titleText = head.textContent.trim();
        titles.push({ li, head, titleText });
        if (METRIC_TITLE_RE.test(titleText) && !TIMELINE_TITLE_RE.test(titleText)) {
          li.classList.add('vs-metric-item');
          head.classList.add('vs-metric-value');
        }
      }
      const ornament = document.createElement('span');
      ornament.className = 'vs-card-ornament';
      ornament.setAttribute('aria-hidden', 'true');
      li.appendChild(ornament);
    });
    // 全項目が時系列・マイルストーン（2026 Q1, Phase 1, v1.0 等）の場合はタイムライン修飾を付与（FR-029）
    if (titles.length === count && titles.every(t => TIMELINE_TITLE_RE.test(t.titleText))) {
      last.classList.add('vs-points-timeline');
      titles.forEach(({ li, head }) => {
        li.classList.remove('vs-metric-item');
        head.classList.remove('vs-metric-value');
        li.classList.add('vs-timeline-item');
        head.classList.add('vs-timeline-badge');
      });
    } else if (count === 2 && titles.length === 2
      && COMPARE_BEFORE_RE.test(titles[0].titleText) && COMPARE_AFTER_RE.test(titles[1].titleText)) {
      // 2 項目が Before / After の対である場合は比較ペア修飾を付与（FR-030）
      last.classList.add('vs-points-compare');
      titles[0].li.classList.add('vs-compare-before');
      titles[1].li.classList.add('vs-compare-after');
    }
  } else if (template === 'glossary') {
    // 箇条書きを定義リストに組み替える。行ごとの div は、2 段組みで用語と説明の対を崩さないため（DD-VTPL-019）
    const items = Array.from(last.children);
    const dl = document.createElement('dl');
    dl.className = 'vs-glossary';
    if (items.length >= TEMPLATE_LIMITS.glossaryTwoUp) dl.classList.add('is-two-up');
    items.forEach(li => {
      const { head, rest } = glossaryParts(li);
      rest.textContent = rest.textContent.replace(GLOSSARY_SEPARATOR_RE, '');
      const dt = document.createElement('dt');
      dt.append(...head.childNodes);
      head.remove();
      const dd = document.createElement('dd');
      dd.append(...li.childNodes);
      const row = document.createElement('div');
      row.className = 'vs-gloss-row';
      row.append(dt, dd);
      dl.appendChild(row);
    });
    last.replaceWith(dl);
  } else if (template === 'steps') {
    const count = last.children.length;
    last.classList.add('vs-steps');
    if (count > 4) last.classList.add('is-vertical');
    last.style.setProperty('--vs-n', String(count));
    Array.from(last.children).forEach((li, idx) => {
      li.style.setProperty('--vs-i', String(idx));
      if (idx === 0) return;
      const chevron = document.createElement('span');
      chevron.className = 'vs-step-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      li.appendChild(chevron);
    });
  } else if (template === 'quote') {
    last.classList.add('vs-quote');
    const cite = last.lastElementChild;
    if (last.children.length > 1 && /^\s*(—|―|--)/.test(cite.textContent)) cite.classList.add('vs-quote-cite');
  }
}

// Visual Stage のスポットライト・ステージ集中モードをすべて解除する（DD-VTPL-015）
function clearVisualStageSpotlight(container) {
  if (!container) return;
  container.querySelectorAll('.has-spotlight, .is-spotlight, .is-reached, .has-stage-focus, .is-stage-focused').forEach(el => {
    el.classList.remove('has-spotlight', 'is-spotlight', 'is-reached', 'has-stage-focus', 'is-stage-focused');
  });
}

// 章の画像化（FR-026）は、出力が誌面にならないため 0.2.0 では操作部を出さない（DD-VTPL-124、CR-001）。
// 画像化の処理（renderSlabToBlob など）は、CR-001 で作り直すまで残す
const SLAB_IMAGE_EXPORT_ENABLED = false;

// スラブの操作バー（画像コピー・PNG保存、FR-026, DD-VTPL-120）
// ボタンの文字ラベルは CSS ::after で表示し、テキストノードを持たせないことでスラブ本文の内容一致（TC-VTPL-003）を保つ
function buildSlabActionsHtml() {
  if (!SLAB_IMAGE_EXPORT_ENABLED) return '';
  return `
    <div class="slab-actions" aria-label="スラブの操作">
      <button type="button" class="slab-action-btn btn-copy-slab" title="この章のカード画像をクリップボードにコピー" aria-label="コピー"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
      <button type="button" class="slab-action-btn btn-export-slab" title="この章のカード画像をPNGとして保存" aria-label="PNG"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
    </div>
  `;
}

function getSlabFilename(slabEl) {
  const stageNo = slabEl.dataset.stageNo || '00';
  const h2 = slabEl.querySelector('h2');
  let title = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, '').trim() : 'slab';
  title = title.toLowerCase().replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF_-]+/g, '-').slice(0, 30);
  return `slab-${stageNo}-${title || 'card'}.png`;
}

function renderSlabToBlob(slabEl) {
  const rect = slabEl.getBoundingClientRect();
  const width = Math.max(360, Math.ceil(rect.width));
  const height = Math.max(200, Math.ceil(rect.height));

  const computed = window.getComputedStyle(slabEl);
  const bgColor = computed.backgroundColor || (state.appearance === 'dark' ? '#1E293B' : '#FFFFFF');
  const textColor = computed.color || (state.appearance === 'dark' ? '#F8FAFC' : '#0F172A');
  const borderColor = computed.borderColor || 'rgba(148, 163, 184, 0.2)';

  const wrapEl = slabEl.closest('.exhibition-wrap');
  const wrapComputed = wrapEl ? window.getComputedStyle(wrapEl) : computed;
  const vsC1 = wrapComputed.getPropertyValue('--vs-c1') || '#3B82F6';

  const h2 = slabEl.querySelector('h2');
  const stageBadge = slabEl.querySelector('.exhibition-num-badge');
  const stageText = stageBadge ? stageBadge.textContent.trim() : (slabEl.dataset.stageNo ? `STAGE ${slabEl.dataset.stageNo}` : '');
  const titleText = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, '').replace(/コピー|PNG/g, '').trim() : 'Lucivo Card';

  const leadEl = slabEl.querySelector('.vs-lead, p, .vs-quote, li');
  const leadText = leadEl ? leadEl.textContent.trim().slice(0, 120) : '';

  return new Promise((resolve) => {
    // タイムアウトまたはフォールバック用の直接 Canvas 描画（file:// 環境でのハング防止）
    const renderFallback = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        ctx.scale(scale, scale);

        ctx.fillStyle = bgColor;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, width, height, 16);
          ctx.fill();
        } else {
          ctx.fillRect(0, 0, width, height);
        }

        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 1;
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(0, 0, width, height, 16);
          ctx.stroke();
        } else {
          ctx.strokeRect(0, 0, width, height);
        }

        let textX = 24;
        if (stageText) {
          ctx.fillStyle = vsC1.trim() || '#3B82F6';
          const badgeWidth = 72;
          const badgeHeight = 22;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(textX, 22, badgeWidth, badgeHeight, 11);
            ctx.fill();
          } else {
            ctx.fillRect(textX, 22, badgeWidth, badgeHeight);
          }
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 11px "JetBrains Mono", monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(stageText, textX + badgeWidth / 2, 22 + badgeHeight / 2);
          textX += badgeWidth + 12;
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textColor;
        ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(titleText, textX, 33);

        if (leadText) {
          ctx.fillStyle = textColor;
          ctx.font = '14px "Noto Sans JP", sans-serif';
          ctx.textBaseline = 'top';
          ctx.fillText(leadText, 24, 60);
        }

        canvas.toBlob(blob => {
          resolve(blob || new Blob([], { type: 'image/png' }));
        }, 'image/png');
      } catch (err) {
        resolve(new Blob([], { type: 'image/png' }));
      }
    };

    const timer = setTimeout(renderFallback, 250);

    try {
      const clone = slabEl.cloneNode(true);
      clone.querySelectorAll('.slab-actions, canvas.signal-light-canvas').forEach(el => el.remove());

      const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <div style="font-family:'Plus Jakarta Sans',sans-serif;color:${textColor};background:${bgColor};padding:1.5rem;width:100%;height:100%;box-sizing:border-box;">
                ${clone.innerHTML}
              </div>
            </div>
          </foreignObject>
        </svg>
      `;

      const img = new Image();
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        try {
          const scale = 2;
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else renderFallback();
          }, 'image/png');
        } catch (e) {
          renderFallback();
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        renderFallback();
      };

      img.src = url;
    } catch (e) {
      clearTimeout(timer);
      renderFallback();
    }
  });
}

async function copySlabImage(slabEl) {
  const filename = getSlabFilename(slabEl);
  try {
    const blob = await renderSlabToBlob(slabEl);
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('スラブ画像をクリップボードにコピーしました');
    } else {
      downloadBlob(blob, filename, 'image/png');
      showToast('クリップボード非対応のため画像を保存しました');
    }
  } catch (err) {
    console.warn('copySlabImage failed, fallback to download', err);
    try {
      const blob = await renderSlabToBlob(slabEl);
      downloadBlob(blob, filename, 'image/png');
      showToast('画像を保存しました');
    } catch (e) {
      showToast('画像のエクスポートに失敗しました');
    }
  }
}

async function exportSlabImage(slabEl) {
  const filename = getSlabFilename(slabEl);
  try {
    const blob = await renderSlabToBlob(slabEl);
    downloadBlob(blob, filename, 'image/png');
    showToast('スラブ画像を保存しました');
  } catch (err) {
    console.warn('exportSlabImage failed', err);
    showToast('画像のエクスポートに失敗しました');
  }
}

// Visual Stage の動的ステージ演出（要点カード・手順ステップ・STAGE バッジのクリック操作）を結線する（FR-017, DD-VTPL-015）
function setupVisualStageInteractions() {
  const visContainer = document.getElementById('visual-stage-container');
  if (!visContainer) return;

  // 紙は操作できないため、スポットライト・章の注目による減光を外した誌面を刷る（FR-036, DD-VTPL-131）
  window.addEventListener('beforeprint', () => clearVisualStageSpotlight(visContainer));

  visContainer.addEventListener('click', event => {
    // 表紙の目次: 選んだ章の先頭までスクロールする（FR-020, DD-VTPL-042）
    const agendaItem = event.target.closest('.vs-cover-agenda-item');
    if (agendaItem) {
      const slab = visContainer.querySelector(`.exhibition-slab[data-stage-no="${agendaItem.dataset.stageTarget}"]`);
      if (slab) slab.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      return;
    }

    // スラブ画像エクスポート・クリップボードコピー（FR-026, DD-VTPL-120）
    const copyBtn = event.target.closest('.btn-copy-slab');
    if (copyBtn) {
      const slab = copyBtn.closest('.exhibition-slab');
      if (slab) copySlabImage(slab);
      return;
    }
    const exportBtn = event.target.closest('.btn-export-slab');
    if (exportBtn) {
      const slab = exportBtn.closest('.exhibition-slab');
      if (slab) exportSlabImage(slab);
      return;
    }

    // コード・ショーケースのワンクリックコピー（FR-031, DD-VTPL-038）
    const codeCopyBtn = event.target.closest('.vs-code-copy-btn');
    if (codeCopyBtn) {
      const pre = codeCopyBtn.closest('pre');
      const codeEl = pre && pre.querySelector('code');
      const codeText = codeEl ? codeEl.textContent : '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(codeText).catch(() => {});
      }
      codeCopyBtn.setAttribute('data-copy-label', 'Copied');
      codeCopyBtn.classList.add('is-copied');
      showToast('コードをクリップボードにコピーしました');
      setTimeout(() => {
        codeCopyBtn.setAttribute('data-copy-label', 'Copy');
        codeCopyBtn.classList.remove('is-copied');
      }, 1600);
      return;
    }

    if (event.target.closest('a, button')) return;

    const badge = event.target.closest('.exhibition-num-badge');
    if (badge) {
      const slab = badge.closest('.exhibition-slab');
      const wrap = badge.closest('.exhibition-wrap');
      if (!slab || !wrap) return;
      slab.classList.toggle('is-stage-focused');
      wrap.classList.toggle('has-stage-focus', Boolean(wrap.querySelector('.exhibition-slab.is-stage-focused')));
      return;
    }

    const pointItem = event.target.closest('.vs-points > li');
    if (pointItem) {
      const list = pointItem.parentElement;
      const willSpotlight = !pointItem.classList.contains('is-spotlight');
      Array.from(list.children).forEach(li => li.classList.remove('is-spotlight'));
      if (willSpotlight) pointItem.classList.add('is-spotlight');
      list.classList.toggle('has-spotlight', willSpotlight);
      return;
    }

    const stepItem = event.target.closest('.vs-steps > li');
    if (stepItem) {
      const list = stepItem.parentElement;
      const items = Array.from(list.children);
      const targetIdx = items.indexOf(stepItem);
      const willSpotlight = !stepItem.classList.contains('is-spotlight');
      items.forEach((li, idx) => {
        li.classList.toggle('is-spotlight', willSpotlight && idx === targetIdx);
        li.classList.toggle('is-reached', willSpotlight && idx <= targetIdx);
      });
      list.classList.toggle('has-spotlight', willSpotlight);
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearVisualStageSpotlight(visContainer);
  });
}

/* ==========================================================================
   Visualモードの表紙（FR-020）と誌面の表（FR-021）
   ========================================================================== */
// 目次は章が 3〜15 個のときだけ出す。タグは先頭の 4 個まで（DTP-VTPL-100）
const COVER_LIMITS = { agenda: [3, 15], tags: 4 };

// 表紙に使うフロントマターの値（title / description / tags / author / date）を取り出す。
// YAML の完全な解析はしない。先頭の列から始まるキーだけを見て、入れ子のキーは読まない（DD-VTPL-040）
function readCoverMeta(yaml) {
  const meta = { title: '', description: '', tags: [], author: '', date: '' };
  if (!yaml) return meta;
  const lines = yaml.split(/\r?\n/);
  const scalar = v => {
    const q = /^(['"])(.*)\1\s*(?:#.*)?$/.exec(v.trim());
    return q ? q[2].trim() : v.replace(/\s+#.*$/, '').trim();
  };
  for (let i = 0; i < lines.length; i++) {
    const m = /^(title|description|tags|author|date)[ \t]*:[ \t]*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const [, key, raw] = m;
    // 続く字下げの行（ブロックの値・リスト）を集める
    const block = [];
    for (let j = i + 1; j < lines.length && (/^\s+\S/.test(lines[j]) || lines[j].trim() === ''); j++) {
      if (lines[j].trim()) block.push(lines[j].trim());
    }
    const value = raw.trim();
    if (key === 'tags') {
      if (value.startsWith('[')) {
        meta.tags = value.replace(/^\[|\]\s*(?:#.*)?$/g, '').split(',').map(scalar);
      } else if (value) {
        meta.tags = value.split(',').map(scalar);
      } else {
        meta.tags = block.filter(l => l.startsWith('-')).map(l => scalar(l.replace(/^-\s*/, '')));
      }
      meta.tags = meta.tags.filter(Boolean).slice(0, COVER_LIMITS.tags);
    } else if (key === 'author' || key === 'date') {
      // 入れ子のマップ（author:\n  title: ...）は読まず、単一スカラー値のみ採用する（FR-032）
      if (value && !/^[>|][+-]?$/.test(value)) meta[key] = scalar(value);
    } else {
      meta[key] = (!value || /^[>|][+-]?$/.test(value)) ? block.join(' ') : scalar(value);
    }
  }
  return meta;
}

// 表紙の HTML。文字はすべてエスケープしてから埋め込む（NFR-003）
function buildCoverHtml(title, meta, agenda, figureCount = 0) {
  const eyebrow = meta.tags.length
    ? `<p class="vs-cover-eyebrow">${meta.tags.map(escapeHtml).join('<span class="vs-cover-sep" aria-hidden="true">/</span>')}</p>`
    : '';
  const deck = meta.description ? `<p class="vs-cover-deck">${escapeHtml(meta.description)}</p>` : '';
  const specItems = [];
  if (meta.author) specItems.push({ kind: 'author', label: meta.author });
  if (meta.date) specItems.push({ kind: 'date', label: meta.date });
  if (agenda.length > 0) specItems.push({ kind: 'stages', label: `${agenda.length} ${agenda.length === 1 ? 'STAGE' : 'STAGES'}` });
  if (figureCount > 0) specItems.push({ kind: 'figures', label: `${figureCount} ${figureCount === 1 ? 'FIGURE' : 'FIGURES'}` });
  const specsHtml = specItems.length
    ? `<div class="vs-cover-specs" aria-label="文書スペック">${specItems.map(item =>
      `<span class="vs-cover-spec-pill" data-spec-kind="${item.kind}" data-spec-label="${escapeHtml(item.label)}"></span>`
    ).join('')}</div>`
    : '';
  const [min, max] = COVER_LIMITS.agenda;
  let agendaHtml = '';
  if (agenda.length >= min && agenda.length <= max) {
    // 印刷物の目次と同じく、列の上から下へ読む順に並べる（DTP-VTPL-100）
    const cols = agenda.length <= 6 ? 2 : 3;
    const rows = Math.ceil(agenda.length / cols);
    agendaHtml = `<ol class="vs-cover-agenda" style="--vs-rows: ${rows};" aria-label="目次">${agenda.map(a =>
      `<li><button type="button" class="vs-cover-agenda-item" data-stage-target="${a.no}"><span class="vs-cover-agenda-no">${a.no}</span><span class="vs-cover-agenda-title">${escapeHtml(a.title)}</span></button></li>`
    ).join('')}</ol>`;
  }
  return `
      <div class="exhibition-hero vs-cover">
        <span class="vs-cover-texture" aria-hidden="true"></span>
        <div class="exhibition-hero-top">
          <span class="exhibition-hero-emblem" aria-hidden="true"></span>
          <div class="four-color-bar"><span></span><span></span><span></span><span></span></div>
        </div>
        ${eyebrow}
        <h1 class="vs-cover-title font-display">${escapeHtml(title)}</h1>
        ${deck}
        ${specsHtml}
        ${agendaHtml}
      </div>`;
}

// 数値の列の判定に使うセルの形（数字に単位・記号が付いたもの）。「—」「-」などの欠損の印は空のセルとみなす（DD-VTPL-041）
const NUMERIC_CELL = /^[+\-−±]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|[a-zA-Z]{1,3}|件|個|円|倍|回|人|台|年|日|時間|分|秒|字|項目|行|列|枚|×)?$/;
const EMPTY_CELL = /^(?:[-–—―]|N\/A)?$/i;

// 本文のセルがすべてこの文字数以内で空白を含まない列は、短いラベルの列として折り返さない（DD-VTPL-041）
const TABLE_LABEL_CHARS = 10;

// 表の列を調べ、本文のセルがすべて数値の列に .vs-num、短いラベルの列に .vs-label を付ける。
// 数値の揃えは、先頭の列（行の見出し）と、Markdown で揃えを指定した列には付けない
function markTableColumns(table) {
  const head = Array.from(table.querySelectorAll('thead th'));
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const cols = head.length || (rows[0] ? rows[0].children.length : 0);
  for (let c = 0; c < cols; c++) {
    const cells = rows.map(r => r.children[c]).filter(Boolean);
    const texts = cells.map(td => td.textContent.trim());
    const filled = texts.filter(t => !EMPTY_CELL.test(t));
    if (!filled.length) continue;
    const all = [head[c], ...cells].filter(Boolean);
    const numeric = c > 0 && filled.every(t => NUMERIC_CELL.test(t)) && !all.some(cell => cell.hasAttribute('align'));
    if (numeric) {
      all.forEach(cell => cell.classList.add('vs-num'));
    } else if (filled.every(t => t.length <= TABLE_LABEL_CHARS && !/\s/.test(t))) {
      cells.forEach(cell => cell.classList.add('vs-label'));
    }
  }
}

// Visualモードのコードブロックに言語ラベル・丸端キャレット（AST-109）・ワンクリック Copy ボタンを付与する（FR-031, DD-VTPL-038）
// ラベルはすべて属性＋CSS 擬似要素で描画し、テキストノードを増やさない（TC-VTPL-003）
const CODE_LANG_ALIASES = {
  javascript: 'JS', js: 'JS', typescript: 'TS', ts: 'TS', python: 'PY', py: 'PY',
  bash: 'SH', sh: 'SH', shell: 'SH', zsh: 'SH', markdown: 'MD', md: 'MD', yml: 'YAML'
};

function decorateCodeBlocks(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.closest('.front-matter')) return;
    const code = pre.querySelector('code');
    if (!code) return;
    const m = /language-([a-z0-9_+-]+)/i.exec(code.className || '');
    const rawLang = m ? m[1].toLowerCase() : '';
    const langLabel = CODE_LANG_ALIASES[rawLang] || (rawLang ? rawLang.toUpperCase() : 'CODE');
    pre.classList.add('vs-code-block');
    pre.setAttribute('data-code-lang', langLabel);
    const caret = document.createElement('span');
    caret.className = 'vs-code-caret';
    caret.setAttribute('aria-hidden', 'true');
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'vs-code-copy-btn';
    copyBtn.setAttribute('data-copy-label', 'Copy');
    copyBtn.setAttribute('title', 'コードをクリップボードにコピー');
    copyBtn.setAttribute('aria-label', 'コードをコピー');
    pre.appendChild(caret);
    pre.appendChild(copyBtn);
  });
}

function buildVisualStageHtml(cleanHtml, yaml) {
  const temp = document.createElement('div');
  temp.innerHTML = cleanHtml;
  temp.querySelectorAll('table').forEach(markTableColumns);
  decorateCodeBlocks(temp);
  // 雛形の判定より前に置き換え、コールアウトだけの章をステートメント型にしない（FR-034）
  decorateAlerts(temp);
  const totalFigures = temp.querySelectorAll('.lucivo-slot').length;

  // 題名は h1、フロントマターの title、読み込んだファイル名の順に探す。どれもなければヒーローを出さない（DD-VTPL-040）
  const coverMeta = readCoverMeta(yaml);
  let heroTitle = coverMeta.title || (currentFileName !== 'untitled.md' ? currentFileName.replace(/\.[^.]+$/, '') : '');
  const h1 = temp.querySelector('h1');
  if (h1) {
    heroTitle = h1.textContent;
    h1.remove();
  }

  // 要素も文字もないスラブ（h1 の直後に h2 が続く文書で、h1 を除いた後に残る改行だけの部分）は出さない（DD-VTPL-002）
  const slabs = [];
  let currentNodes = [];
  const pushSlab = nodes => {
    if (nodes.some(n => n.nodeType === 1 || n.textContent.trim())) slabs.push(nodes);
  };
  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      pushSlab(currentNodes);
      currentNodes = [node];
    } else {
      currentNodes.push(node);
    }
  });
  pushSlab(currentNodes);

  let slabsHtml = '';
  let sectionCounter = 0;
  const agenda = [];

  slabs.forEach((nodes) => {
    const wrapper = document.createElement('div');
    nodes.forEach(n => wrapper.appendChild(n.cloneNode(true)));
    const h2 = wrapper.querySelector('h2');
    if (h2) {
      sectionCounter++;
      const numStr = String(sectionCounter).padStart(2, '0');
      const rawTitle = h2.textContent.replace(/^\d+\.\s*/, '');
      h2.innerHTML = `<span class="exhibition-num-badge">STAGE ${numStr}</span><span>${escapeHtml(rawTitle)}</span>`;
      agenda.push({ no: numStr, title: rawTitle });
    }
    const stageAttr = h2 ? ` data-stage-no="${String(sectionCounter).padStart(2, '0')}"` : '';
    const slots = wrapper.querySelectorAll('.lucivo-slot');
    const children = Array.from(wrapper.children);
    const proseEls = children.filter(el => el !== h2 && !el.classList.contains('front-matter') && !el.classList.contains('lucivo-slot') && !el.querySelector('.lucivo-slot'));
    const hasComplexBlock = proseEls.some(el => /^(H[3-6]|TABLE|PRE)$/.test(el.tagName) || el.querySelector('table, pre'));
    const actionsHtml = buildSlabActionsHtml();
    if (slots.length === 1 && proseEls.length >= 1 && !hasComplexBlock) {
      const fm = wrapper.querySelector(':scope > .front-matter');
      const slotEl = children.find(el => el.classList.contains('lucivo-slot') || el.querySelector('.lucivo-slot'));
      const proseHtml = proseEls.map(el => el.outerHTML).join('');
      const headHtml = `${fm ? fm.outerHTML : ''}${h2 ? h2.outerHTML : ''}`;
      slabsHtml += `<section class="exhibition-slab exhibition-slab-split vs-tpl-split"${stageAttr}>${headHtml}<div class="exhibition-slab-body"><div class="exhibition-slab-prose">${proseHtml}</div><div class="exhibition-slab-figure">${slotEl.outerHTML}</div></div>${actionsHtml}</section>`;
    } else {
      const template = detectSlabTemplate(proseEls, slots.length);
      applySlabTemplate(template, proseEls);
      slabsHtml += `<section class="exhibition-slab vs-tpl-${template}"${stageAttr}>${wrapper.innerHTML}${actionsHtml}</section>`;
    }
  });

  // 見出しの文字（textContent）はエスケープしてから埋め込む。そのまま入れると、見出しに書いた
  // &lt;img …&gt; などが HTML として解釈される（NFR-003）
  const heroHtml = heroTitle ? buildCoverHtml(heroTitle, coverMeta, agenda, totalFigures) : '';

  // 雛形・バッジ・4 色バーの配色は、スタイルのクラスが定義する --vs-c1〜4 から取る（DTP-VTPL-070）
  return `
    <div class="exhibition-wrap vs-theme-${state.infographicStyle}">
      ${heroHtml}
      ${slabsHtml}
    </div>
  `;
}

/* ==========================================================================
   ローカルの画像（FR-042, DD-MD-040〜042）
   ========================================================================== */
// 画像の src に書いたローカルのパスを file:// の URL に直す。直せないもの（相対パス、http など）は null を返す。
// Marked は URL の \ を %5C に変えるため、%5C も区切りとして扱う
function toLocalImageUrl(value) {
  const src = String(value || '').trim().replace(/%5C/gi, '/').replace(/\\/g, '/');
  // C:/… または C:\…（Windows のドライブ名で始まる絶対パス）
  if (/^[a-z]:\//i.test(src)) return `file:///${src}`;
  // \\server\share\…（Windows のネットワーク上のパス）
  if (/^\/\/[^/]/.test(src) && /%5C|\\/i.test(String(value))) return `file:${src}`;
  if (/^file:\/\//i.test(src)) return src;
  return null;
}

// 相対パスか（URL の形式も、/ で始まる絶対パスもない）
function isRelativeSrc(src) {
  return Boolean(src) && !/^[a-z][a-z0-9+.-]*:|^[/#]/i.test(src);
}

// 読み込めない画像の代わりに置く枠（DD-MD-041）。hint は添える案内（なければ省く）
function makeMissingImageBox(src, alt, hint) {
  const box = document.createElement('span');
  box.className = 'img-missing';
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', `画像を読み込めません: ${alt || src}`);
  const title = document.createElement('span');
  title.className = 'img-missing-title';
  title.textContent = '画像を読み込めません';
  const path = document.createElement('span');
  path.className = 'img-missing-path';
  path.textContent = src || '（パスがありません）';
  box.append(title, path);
  if (hint) {
    const note = document.createElement('span');
    note.className = 'img-missing-hint';
    note.textContent = hint;
    box.append(note);
  }
  return box;
}

// DOMPurify の既定は file: の URL を許さず、src ごと消す（DD-MD-040）。画像の src に限って、
// ローカルのパスを file:// の URL に直して残す。リンク（a の href）の file: は、今までどおり消す。
// フォルダから開いた文書の相対パスは、フォルダの中のパスを data-folder-src に移し、描画の後に読み込む（DD-FILE-076）
function setupLocalImages() {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (node.nodeName !== 'IMG' || data.attrName !== 'src') return;
    const inFolder = openedFolder && currentFolderPath !== null && isRelativeSrc(data.attrValue);
    const folderPath = inFolder ? resolveFolderPath(folderDirOf(currentFolderPath), data.attrValue) : null;
    if (inFolder && folderPath === null) {
      // フォルダの外を指す相対パス（../ が多すぎる）は、フォルダからは読めない
      node.setAttribute('data-folder-src', data.attrValue);
      node.setAttribute('data-folder-outside', '');
      data.keepAttr = false;
      return;
    }
    if (folderPath !== null) {
      node.setAttribute('data-folder-src', folderPath);
      const cached = folderImageUrls.get(folderPath);
      if (typeof cached === 'string') {
        // 読み込み済みの画像は、描き直しのたびに読み直さず、ちらつかないよう、すぐに表示する
        node.setAttribute('src', cached);
        data.attrValue = cached;
        data.forceKeepAttr = true;
      } else {
        // src を残すと index.html のフォルダを基準に読みに行き、読み込めない表示が一瞬出る
        data.keepAttr = false;
      }
      return;
    }
    // 同梱サンプルの相対パスは、samples フォルダからの相対パスにする（index.html から見たパス。DD-FILE-081）
    if (currentSampleFile && isRelativeSrc(data.attrValue)) {
      const samplePath = resolveFolderPath('', data.attrValue);
      if (samplePath === null) return;
      const sampleUrl = `${SAMPLES_DIR}/${samplePath.split('/').map(encodeURIComponent).join('/')}`;
      node.setAttribute('src', sampleUrl);
      data.attrValue = sampleUrl;
      data.forceKeepAttr = true;
      return;
    }
    const url = toLocalImageUrl(data.attrValue);
    if (!url) return;
    // forceKeepAttr を立てると、DOMPurify は attrValue を書き戻さずに次の属性へ進むため、ここで書き換える
    node.setAttribute('src', url);
    data.attrValue = url;
    data.forceKeepAttr = true;
  });

  // 読み込めない画像は、代わりの文字（alt）だけが細く出て気づきにくいため、読み込めないことと src を示す（DD-MD-041）。
  // error は泡立たないため、キャプチャの段階で受け取る
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest('#preview-scroll')) return;
    const src = img.getAttribute('data-folder-src') || img.getAttribute('src') || '';
    // 相対パスは、ファイルを開いた場合、ブラウザの制約で Markdown ファイルの場所を基準にできない（DD-MD-042）
    const hint = isRelativeSrc(src) && !img.hasAttribute('data-folder-src')
      ? '相対パスの画像は、「開く」→「フォルダを開く…」で開いた文書で表示できます。または絶対パス（C:\\… など）で指定してください'
      : '';
    img.replaceWith(makeMissingImageBox(src, img.getAttribute('alt'), hint));
  }, true);
}

// フォルダから開いた文書の相対パスの画像を、フォルダから読んで表示する（DD-FILE-076）
function resolveFolderImages(container) {
  if (!openedFolder || !container) return;
  const folder = openedFolder;
  container.querySelectorAll('img[data-folder-src]:not([src])').forEach(async img => {
    const path = img.getAttribute('data-folder-src');
    if (img.hasAttribute('data-folder-outside')) {
      img.replaceWith(makeMissingImageBox(path, img.getAttribute('alt'), '開いたフォルダの外の画像は表示できません。上の階層のフォルダを開いてください'));
      return;
    }
    const url = await getFolderImageUrl(folder, path);
    // 待っている間にフォルダを閉じた・描き直した場合は何もしない
    if (!img.isConnected || folder !== openedFolder) return;
    if (url) img.setAttribute('src', url);
    else img.replaceWith(makeMissingImageBox(path, img.getAttribute('alt'), 'フォルダの中に見つかりません'));
  });
}

// 表（table）が親コンテナやスラブの枠をはみ出さないよう、横スクロール可能な .table-container で包む（DD-MD-020）
function wrapTables(container) {
  if (!container) return;
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement && table.parentElement.classList.contains('table-container')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-container';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
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
  // 最上位のトークンの raw は本文を先頭から隙間なく覆うため、改行を数えれば各トークンの元の行がわかる（FR-037, DD-DIAG-060）
  let srcLine = countLinesBefore(rawMarkdown, rawMarkdown.length - body.length);

  parsed.forEach(token => {
    if (token.type === 'heading') token.srcLine = srcLine;
    srcLine += countLinesBefore(token.raw, token.raw.length);
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
      // 罫線で書いたフォルダ構成は、ツリーにする（FR-047）
      tokensToKeep.push(treeTokenFor(token) || token);
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
  if (window.LucivoStage) LucivoStage.resetLights();

  // 非表示側のコンテナは空にする。残すと同じ data-stage-index・SVG 内 id が DOM に重複し、
  // 描画結果の書き込み先やマーカー・グラデーションの参照先が非表示側に向いてしまう
  if (isVisual) {
    stdWrapper.classList.add('hidden');
    stdContainer.innerHTML = '';
    visContainer.classList.remove('hidden');
    visContainer.innerHTML = isEmpty
      ? `<div class="exhibition-wrap"><section class="exhibition-slab">${EMPTY_GUIDE_HTML}</section></div>`
      : buildVisualStageHtml(cleanHtml, yaml);
  } else {
    visContainer.classList.add('hidden');
    visContainer.innerHTML = '';
    stdWrapper.classList.remove('hidden');
    stdContainer.innerHTML = isEmpty ? EMPTY_GUIDE_HTML : cleanHtml;
    decorateAlerts(stdContainer);
  }

  const activeContainer = isVisual ? visContainer : stdContainer;
  wrapTables(activeContainer);
  resolveFolderImages(activeContainer);
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
  mountStage(activeContainer);
  // 入力で見出しを書き足した直後は、描画が終わるまで新しい見出しがない。描画の後に区間を引き直す（DD-DIAG-061）
  if (document.activeElement && document.activeElement.id === 'markdown-editor') scheduleFollow();

  if (dirtyBlocks.length > 0) {
    processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
  } else {
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
}

// Visualモードの図に舞台演出を取り付ける。読み込みを待つ間に DOM が作り直された場合は何もしない
function mountStage(container) {
  if (!state.isVisualMode) return;
  loadLibrary('stage').then(ok => {
    if (ok && state.isVisualMode && container.isConnected) LucivoStage.mount(container);
  });
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
      setupMermaid(target.isVisual, block.curve || 'smooth', getMermaidLayout(block.code, block.curve));
      const { svg } = await mermaid.render(renderId, block.code);
      if (isStale()) return;
      const finalSvg = postProcessSvg(svg, target.isVisual);

      svgCache.set(block.cacheKey, finalSvg);
      lkgCache.set(lkgKey, finalSvg);

      if (stageViewport) {
        stageViewport.innerHTML = finalSvg;
        applyReadableFit(stageViewport.querySelector(':scope > svg'), block.cacheKey);
        mountStage(stageViewport);
      }
    } catch (err) {
      // Mermaid が描画のために body に置いた一時的な要素が残っていれば消す（DD-DIAG-064）
      document.getElementById(`d${renderId}`)?.remove();
      console.error(`Mermaid render failed for block ${block.index}:`, err);
      if (isStale()) return;
      const fallback = lkgCache.get(lkgKey);
      if (stageViewport) {
        if (fallback) {
          stageViewport.innerHTML = fallback;
          applyReadableFit(stageViewport.querySelector(':scope > svg'));
          mountStage(stageViewport);
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

      // Ctrl + ホイールで変えた倍率（DD-DIAG-071）は、Fit / 1:1 を選んだら解除する
      clearDiagramZoom(vp);
      if (action === 'scale-actual') {
        vp.classList.add('is-actual-size');
      } else {
        vp.classList.remove('is-actual-size');
      }
      updateSlabSplit(vp.closest('.exhibition-slab-split'));
      updatePannable(vp);
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

      const zoomCanvas = document.getElementById('zoom-canvas');
      zoomCanvas.innerHTML = svgEl.outerHTML;
      setModalOpen('zoom-modal', true);
      if (state.isVisualMode && window.LucivoStage) LucivoStage.mountLights(zoomCanvas);
    };
  });
}

/* ==========================================================================
   図のドラッグ移動と Ctrl + ホイールの拡大・縮小（FR-038, FR-039）
   ========================================================================== */
const DIAGRAM_VIEWPORT_SELECTOR = '.diagram-viewport, .exhibition-viewport';
// 倍率は原寸（viewBox の幅）に対する比。下限は全体を見渡せる大きさ、上限は細部の確認に足りる大きさ（DD-DIAG-071）
const DIAGRAM_ZOOM_MIN = 0.25;
const DIAGRAM_ZOOM_MAX = 4;
// ホイールの 1 ノッチ（deltaY = 100 px）で約 16% 拡大・縮小する
const DIAGRAM_ZOOM_SENSITIVITY = 0.0015;
// これ以上動いたらドラッグとみなし、離したときのクリックを図に渡さない（DD-DIAG-070）
const PAN_CLICK_TOLERANCE_PX = 4;

// ステージ発表中は、図の大きさと位置を発表の処理が決めるため、ドラッグと拡大・縮小を受け付けない
function findDiagramViewport(target) {
  if (document.documentElement.classList.contains('is-stage-show')) return null;
  const vp = target instanceof Element ? target.closest(DIAGRAM_VIEWPORT_SELECTOR) : null;
  return vp && vp.querySelector(':scope > svg') ? vp : null;
}

function isScrollable(vp) {
  return vp.scrollWidth > vp.clientWidth + 1 || vp.scrollHeight > vp.clientHeight + 1;
}

// スクロール表示の図だけ、つかめることをカーソル（grab）で示す（DD-DIAG-070）
function updatePannable(vp) {
  if (vp) vp.classList.toggle('is-pannable', isScrollable(vp));
}

function clearDiagramZoom(vp) {
  if (!vp.classList.contains('is-zoomed')) return;
  vp.classList.remove('is-zoomed');
  delete vp.dataset.zoom;
  const svg = vp.querySelector(':scope > svg');
  if (svg) svg.style.removeProperty('--zoom-width');
}

// 縦方向は図の表示枠ではなくプレビューがスクロールするため、拡大・縮小の基準点を保つときに使う
function findScrollParent(el) {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement;
}

// Ctrl + ホイールで、その図だけを、カーソルの位置を中心に拡大・縮小する（FR-039, DD-DIAG-071）
function zoomDiagram(vp, event) {
  const svg = vp.querySelector(':scope > svg');
  const viewBox = svg.viewBox && svg.viewBox.baseVal;
  if (!viewBox || !viewBox.width) return;
  const before = svg.getBoundingClientRect();
  if (!before.width) return;
  const current = vp.classList.contains('is-zoomed') ? parseFloat(vp.dataset.zoom) : before.width / viewBox.width;
  const deltaPx = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  const next = Math.min(DIAGRAM_ZOOM_MAX, Math.max(DIAGRAM_ZOOM_MIN, current * Math.exp(-deltaPx * DIAGRAM_ZOOM_SENSITIVITY)));
  if (Math.abs(next - current) < 0.001) return;
  // カーソルの下にある図の点（図の幅・高さに対する比）
  const fx = (event.clientX - before.left) / before.width;
  const fy = (event.clientY - before.top) / before.height;

  vp.classList.remove('is-actual-size');
  vp.classList.add('is-zoomed');
  vp.dataset.zoom = String(next);
  svg.style.setProperty('--zoom-width', `${(viewBox.width * next).toFixed(1)}px`);
  const frame = vp.closest('[id^="diagram-frame-"]');
  if (frame) frame.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('is-active'));
  updateSlabSplit(vp.closest('.exhibition-slab-split'));

  // 拡大・縮小の後も、同じ図の点がカーソルの下に来るようにスクロールする
  const after = svg.getBoundingClientRect();
  vp.scrollLeft += after.left + fx * after.width - event.clientX;
  const scroller = findScrollParent(vp);
  if (scroller) scroller.scrollTop += after.top + fy * after.height - event.clientY;
  updatePannable(vp);
}

function setupDiagramPanZoom() {
  const pan = { vp: null, pointerId: null, x: 0, y: 0, left: 0, top: 0, moved: false };

  document.addEventListener('mouseover', event => updatePannable(findDiagramViewport(event.target)));

  // 図の上の Ctrl + ホイールは、ブラウザのページ全体のズームではなく、図の拡大・縮小にする（DD-DIAG-071）
  document.addEventListener('wheel', event => {
    if (!event.ctrlKey || !event.deltaY) return;
    const vp = findDiagramViewport(event.target);
    if (!vp) return;
    event.preventDefault();
    zoomDiagram(vp, event);
  }, { passive: false });

  // スクロール表示の図をマウスでつかんで動かす（FR-038, DD-DIAG-070）
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const vp = findDiagramViewport(event.target);
    if (!vp || event.target.closest('a, button') || !isScrollable(vp)) return;
    event.preventDefault();
    Object.assign(pan, { vp, pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop, moved: false });
    vp.setPointerCapture(event.pointerId);
    vp.classList.add('is-panning');
  });
  document.addEventListener('pointermove', event => {
    if (!pan.vp || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (Math.hypot(dx, dy) > PAN_CLICK_TOLERANCE_PX) pan.moved = true;
    pan.vp.scrollLeft = pan.left - dx;
    pan.vp.scrollTop = pan.top - dy;
  });
  const endPan = event => {
    if (!pan.vp || event.pointerId !== pan.pointerId) return;
    pan.vp.classList.remove('is-panning');
    if (pan.vp.hasPointerCapture(event.pointerId)) pan.vp.releasePointerCapture(event.pointerId);
    // ドラッグの後のクリックで、図の中のリンク（Mermaid の click）などが動かないようにする
    // クリックが発生しなかったときに、次の本物のクリックを止めないよう、直後のタスクで外す
    if (pan.moved) {
      const swallow = e => { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }
    pan.vp = null;
    pan.pointerId = null;
  };
  document.addEventListener('pointerup', endPan);
  document.addEventListener('pointercancel', endPan);
}

/* ==========================================================================
   モード切替とスタイル切替（共通関数）
   ========================================================================== */
// モードの切替ボタンの選択状態と、スタイルバーの表示を揃える。
// スタイルバーは Visualモードの配色・装飾にしか効かないため、Visualモードのときだけ表示する（DD-DIAG-063）
function syncStageModeUi(isVisual) {
  document.getElementById('btn-mode-fast')?.classList.toggle('is-active', !isVisual);
  document.getElementById('btn-visual-mode')?.classList.toggle('is-active', isVisual);
  document.getElementById('style-bar')?.classList.toggle('is-hidden', !isVisual);
}

function setStageMode(isVisual) {
  if (state.isVisualMode === isVisual) return;
  state.isVisualMode = isVisual;
  syncStageModeUi(isVisual);
  if (isVisual) {
    showToast('🎨 Visualモードを起動');
  } else {
    showToast('高速モードに戻りました');
  }
  renderApp();
}

function selectInfographicStyle(style) {
  state.infographicStyle = style;
  document.querySelectorAll('.info-style-btn').forEach(b => {
    b.classList.toggle('is-active', b.getAttribute('data-info-style') === style);
  });
  // スタイルバーは Visualモードのときだけ表示する。高速モードから選べるのはキーボードの 1〜4 だけで、
  // その場合は Visualモードに切り替えて適用する（FR-025）
  if (!state.isVisualMode) {
    state.isVisualMode = true;
    syncStageModeUi(true);
  }
  renderApp();
  const activeBtn = document.querySelector(`.info-style-btn[data-info-style="${style}"]`);
  showToast(`スタイル適用: ${activeBtn ? activeBtn.textContent.trim() : style}`);
}

/* ==========================================================================
   キーボードショートカットとナビゲーション（FR-025, DD-KEY-001〜004）
   ========================================================================== */
function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || el.isContentEditable;
}

function closeShortcutModal() {
  setModalOpen('shortcut-modal', false);
}

function toggleShortcutModal() {
  setModalOpen('shortcut-modal', !isModalOpen('shortcut-modal'));
}

/* ==========================================================================
   プレビューのスクロール（J/K の章移動 FR-025、編集位置への追従 FR-037 で共通）
   ========================================================================== */
const PREVIEW_SCROLL_MARGIN = 16;

function scrollBehavior() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// 要素の上端を、プレビューの表示枠の上端から PREVIEW_SCROLL_MARGIN だけ下に置くときの scrollTop
function previewScrollTopOf(el, scroller, scrollerRect = scroller.getBoundingClientRect()) {
  return Math.max(0, Math.round(el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop - PREVIEW_SCROLL_MARGIN));
}

/* ==========================================================================
   Split 表示の編集位置への追従（FR-037, DD-DIAG-060〜062）
   ========================================================================== */
// 最後に送った見出しの行（'top' はプレビューの先頭）。同じ区間の中では送り直さない
let followedKey = null;
let followFrame = 0;

// text の先頭から end までにある改行の数（= end の位置の 0 始まりの行番号）
function countLinesBefore(text, end) {
  let count = 0;
  for (let i = text.indexOf('\n'); i !== -1 && i < end; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

// カーソルの行以前で最後の見出し（data-src-line は文書の順に並ぶ）。なければ null
function findFollowTarget(container, caretLine) {
  let target = null;
  for (const el of container.querySelectorAll('[data-src-line]')) {
    if (Number(el.dataset.srcLine) > caretLine) break;
    target = el;
  }
  return target;
}

function followEditorCaret() {
  followFrame = 0;
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const editor = document.getElementById('markdown-editor');
  const scroller = document.getElementById('preview-scroll');
  const container = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
  const target = findFollowTarget(container, countLinesBefore(editor.value, editor.selectionStart));
  // Visualモードは章（スラブ）の上端へ送る。章の中の小見出しの間を動いても、同じ章なら送り直さない
  const anchor = target && state.isVisualMode ? (target.closest('.exhibition-slab') || target) : target;
  const keyEl = anchor && anchor !== target ? (anchor.querySelector('[data-src-line]') || target) : target;
  const key = keyEl ? keyEl.dataset.srcLine : 'top';
  if (key === followedKey) return;
  followedKey = key;
  scroller.scrollTo({ top: anchor ? previewScrollTopOf(anchor, scroller) : 0, behavior: scrollBehavior() });
}

// カーソルの移動・入力のたびに呼ぶ。スクロールは表示更新 1 回にまとめる
function scheduleFollow() {
  if (!followFrame) followFrame = requestAnimationFrame(followEditorCaret);
}

let lastNavTargetTop = null;
let lastNavTime = 0;

function scrollSection(direction) {
  const scroller = document.getElementById('preview-scroll');
  if (!scroller) return;
  const selector = state.isVisualMode
    ? '#visual-stage-container .exhibition-slab'
    : '#standard-doc-container h2';
  const elements = Array.from(document.querySelectorAll(selector));
  if (elements.length === 0) return;

  const now = performance.now();
  const scrollerRect = scroller.getBoundingClientRect();
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  // スムーズスクロール進行中に連続で J / K を押した場合も次の章へ進めるよう、直近の目標位置を引き継ぐ
  const currentTop = (lastNavTargetTop !== null && now - lastNavTime < 500)
    ? lastNavTargetTop
    : scroller.scrollTop;

  const positions = elements.map(el => previewScrollTopOf(el, scroller, scrollerRect));

  let nextTop = null;
  if (direction > 0) {
    if (currentTop >= maxScroll - 2) return;
    // 先頭付近（scrollTop <= 16）で最初の章が画面上端付近（<= 64px）にある場合は、すでに1章目を表示中とみなして2章目へ進む
    nextTop = positions.find((pos, idx) =>
      pos > currentTop + 8 && !(idx === 0 && currentTop <= 16 && pos <= 64 && positions.length > 1)
    );
    if (nextTop !== undefined && nextTop !== null) {
      nextTop = Math.min(maxScroll, nextTop);
    }
  } else {
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i] < currentTop - 8) {
        nextTop = positions[i];
        break;
      }
    }
    // 最初の章より上に表紙（ヒーローや h1）がある場合は最上部（0）へ戻る
    if (nextTop === null && currentTop > 0) {
      nextTop = 0;
    }
  }

  if (nextTop !== null && nextTop !== undefined) {
    lastNavTargetTop = nextTop;
    lastNavTime = now;
    scroller.scrollTo({ top: nextTop, behavior: scrollBehavior() });
  }
}

function setupKeyboardShortcuts() {
  document.getElementById('shortcut-close-btn')?.addEventListener('click', closeShortcutModal);

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    // ステージ発表中（is-stage-show）は stage.js のハンドラが処理するためスキップ
    if (document.documentElement.classList.contains('is-stage-show')) return;

    // ショートカットヘルプモーダルまたはズームモーダルが開いている場合の Escape 処理
    if (event.key === 'Escape') {
      if (isModalOpen('shortcut-modal')) {
        closeShortcutModal();
        return;
      }
      if (isModalOpen('zoom-modal')) {
        document.getElementById('zoom-close-btn')?.click();
        return;
      }
    }

    // エディタや入力欄にフォーカスがあるときは文字入力を優先しショートカットを起動しない（DD-KEY-001）
    if (isEditableElement(document.activeElement)) return;

    // ] / [ はキーボードの左右の並び（右が次、左が前）で章を移る（FR-025, DD-KEY-002）
    if (event.key === 'j' || event.key === 'J' || event.key === ']') {
      event.preventDefault();
      scrollSection(1);
    } else if (event.key === 'k' || event.key === 'K' || event.key === '[') {
      event.preventDefault();
      scrollSection(-1);
    } else if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      setStageMode(!state.isVisualMode);
    } else if (event.key >= '1' && event.key <= '4') {
      const targetStyle = VISUAL_STYLE_KEYS[parseInt(event.key, 10) - 1];
      if (targetStyle) {
        event.preventDefault();
        selectInfographicStyle(targetStyle);
      }
    } else if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      document.getElementById('btn-stage-show')?.click();
    } else if (event.key === '?') {
      event.preventDefault();
      toggleShortcutModal();
    }
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
    scheduleFollow();
  });
  // カーソルの移動（クリック・キー操作）で、カーソルのある見出しの区間へプレビューを送る（FR-037）。
  // エディタのスクロールだけでは送らない
  editor.addEventListener('click', scheduleFollow);
  editor.addEventListener('keyup', scheduleFollow);

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
      if (state.isVisualMode && mode !== 'editor') {
        updateAllSlabSplits(document.getElementById('visual-stage-container'));
      }
    };
  });

  window.addEventListener('resize', () => {
    if (state.isVisualMode) {
      updateAllSlabSplits(document.getElementById('visual-stage-container'));
    }
  });

  const btnFast = document.getElementById('btn-mode-fast');
  const btnVisual = document.getElementById('btn-visual-mode');

  if (btnFast) {
    btnFast.onclick = () => setStageMode(false);
  }
  if (btnVisual) {
    btnVisual.onclick = () => {
      setStageMode(!state.isVisualMode);
    };
  }

  document.getElementById('btn-stage-show').onclick = async () => {
    if (await loadLibrary('stage')) LucivoStage.enterShow();
  };

  document.querySelectorAll('.info-style-btn').forEach(btn => {
    btn.onclick = () => {
      const style = btn.getAttribute('data-info-style');
      selectInfographicStyle(style);
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
  const appFavicon = document.getElementById('app-favicon');
  btnTheme.onclick = () => {
    state.appearance = state.appearance === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-appearance', state.appearance);
    if (appFavicon) {
      appFavicon.setAttribute('href', `./assets/logos/${state.appearance}/favicon.svg`);
    }
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

  document.getElementById('btn-open-settings').onclick = () => setModalOpen('settings-modal', true);
  document.getElementById('btn-close-settings').onclick = () => setModalOpen('settings-modal', false);

  document.getElementById('zoom-close-btn').onclick = () => {
    setModalOpen('zoom-modal', false);
    // 閉じた後に複製した SVG を残さない
    document.getElementById('zoom-canvas').innerHTML = '';
  };

  // HTML の書き出し（FR-005）は、書き出したファイルが持ち出し先で崩れるため 0.2.0 ではボタンを置かない（DD-OFF-005、CR-001）。
  // 処理は CR-001 で作り直すまで残し、ボタンがあるときだけつなぐ
  const exportHtmlBtn = document.getElementById('btn-export-html');
  if (exportHtmlBtn) exportHtmlBtn.onclick = () => {
    const fullHtml = Object.entries(EXPORT_URLS).reduce(
      (html, [local, url]) => html.split(local).join(url),
      document.documentElement.outerHTML
    );
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
   開く・保存のメニュー（Markdown ファイルの読み込みと保存）
   ========================================================================== */
// ヘッダーのメニュー（開く・保存）。ボタンの id とメニューの id の組（DD-FILE-002, DD-FILE-009）
const HEADER_MENUS = [['btn-file-menu', 'file-menu'], ['btn-save-menu', 'save-menu']];

function closeHeaderMenus() {
  HEADER_MENUS.forEach(([btnId, menuId]) => {
    document.getElementById(menuId).classList.add('hidden');
    document.getElementById(btnId).setAttribute('aria-expanded', 'false');
  });
}
// 既存の呼び出し（テストを含む）のための別名
const closeFileMenu = closeHeaderMenus;

// 最後に読み込んだ（または保存した）時点から編集していれば、置き換える前に確認する
function confirmDiscardEdits(fileName) {
  const editor = document.getElementById('markdown-editor');
  if (editor.value === lastLoadedMarkdown) return true;
  return window.confirm(`編集中の内容は失われます。「${fileName}」を読み込みますか？`);
}

// folderPath: フォルダから開いたときの、フォルダの中のパス（例: docs/a.md）。相対パスの画像の基準にする（DD-FILE-075）
// isSample: 同梱サンプルとして開いたとき。相対パスの画像とリンクは samples フォルダを基準にする（DD-FILE-081）
function applyLoadedMarkdown(rawText, fileName, folderPath = null, isSample = false) {
  const text = String(rawText).replace(/^\uFEFF/, '');
  document.getElementById('markdown-editor').value = text;
  lastLoadedMarkdown = text;
  currentFileName = fileName;
  currentFolderPath = folderPath;
  currentSampleFile = isSample ? fileName : null;
  document.getElementById('save-file-name').textContent = fileName;
  renderFolderList();
  // 印刷の「PDF として保存」は、ウィンドウのタイトルを既定のファイル名に使う（FR-040, DD-FILE-050）
  document.title = `${fileName}${APP_TITLE_SUFFIX}`;
  state.curveByIndex.clear();
  setEditorReadOnly(true);
  clearTimeout(renderDebounceTimer);
  renderApp();
  document.getElementById('preview-scroll').scrollTop = 0;
  followedKey = null;
  showToast(`「${fileName}」を読み込みました`);
}

function loadMarkdownFile(file) {
  if (!confirmDiscardEdits(file.name)) return;
  const reader = new FileReader();
  reader.onload = () => {
    applyLoadedMarkdown(reader.result, file.name);
  };
  reader.onerror = () => {
    console.error('Failed to read file:', reader.error);
    showToast(`「${file.name}」を読み込めませんでした`);
  };
  reader.readAsText(file, 'UTF-8');
}

// 開くメニューから同梱サンプルをワンクリックで読み込む（DD-FILE-015）
async function loadBundledSample(fileName) {
  if (!confirmDiscardEdits(fileName)) return false;
  let text = null;
  if (window.location.protocol !== 'file:') {
    try {
      const res = await fetch(`./samples/${encodeURIComponent(fileName)}`);
      if (res.ok) text = await res.text();
    } catch (_) {
      // fetch 失敗時は samples-data.js にフォールバックする
    }
  }
  if (text === null) {
    if (await loadLibrary('samples') && window.LUCIVO_SAMPLES && typeof window.LUCIVO_SAMPLES[fileName] === 'string') {
      text = window.LUCIVO_SAMPLES[fileName];
    }
  }
  if (text === null) {
    showToast(`「${fileName}」を読み込めませんでした`);
    return false;
  }
  applyLoadedMarkdown(text, fileName, null, true);
  return true;
}

// 読み込み直後の閲覧中に誤って編集しないよう、エディタと、内容を変えるボタンをまとめて切り替える（DD-FILE-040）。
// 「閲覧 | 編集」の切り替えは、ファイルを読み込んだ後は表示したままにし、今の状態のほうを選択中にする（DD-FILE-041）
function setEditorReadOnly(isReadOnly) {
  document.getElementById('markdown-editor').readOnly = isReadOnly;
  document.getElementById('editor-lock').classList.remove('hidden');
  for (const [id, active] of [['btn-edit-lock', isReadOnly], ['btn-edit-unlock', !isReadOnly]]) {
    const btn = document.getElementById(id);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
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
  const input = document.getElementById('file-input');

  // 1 つのメニューを開くときは、もう一方を閉じる
  HEADER_MENUS.forEach(([btnId, menuId]) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    btn.onclick = event => {
      event.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      closeHeaderMenus();
      menu.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    };
  });
  const fileMenu = document.getElementById('file-menu');
  document.getElementById('menu-open-markdown').onclick = () => {
    closeHeaderMenus();
    input.click();
  };
  document.getElementById('menu-open-folder').onclick = () => {
    closeHeaderMenus();
    openFolder();
  };
  document.getElementById('menu-open-recent-folder').onclick = () => {
    closeHeaderMenus();
    reopenRecentFolder();
  };
  fileMenu.querySelectorAll('[data-sample-file]').forEach(btn => {
    btn.onclick = () => {
      const fileName = btn.getAttribute('data-sample-file');
      closeHeaderMenus();
      if (fileName) loadBundledSample(fileName);
    };
  });
  // 印刷・PDF の配布資料（FR-036）。刷る内容は @media print（DD-VTPL-130〜132）で決める
  document.getElementById('menu-print').onclick = () => {
    closeHeaderMenus();
    window.print();
  };
  document.getElementById('btn-save-markdown').onclick = () => {
    closeHeaderMenus();
    saveMarkdownFile();
  };
  document.getElementById('btn-edit-unlock').onclick = () => {
    setEditorReadOnly(false);
    document.getElementById('markdown-editor').focus();
  };
  document.getElementById('btn-edit-lock').onclick = () => setEditorReadOnly(true);
  input.onchange = () => {
    const file = input.files && input.files[0];
    // 同じファイルを続けて選んでも change が発生するよう、選択を解除する
    input.value = '';
    if (file) loadMarkdownFile(file);
  };
  document.addEventListener('click', event => {
    if (!HEADER_MENUS.some(([, menuId]) => document.getElementById(menuId).contains(event.target))) closeHeaderMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeHeaderMenus();
  });
}

// ウィンドウのどこにファイルを落としても開く（FR-041, DD-FILE-060）。ドラッグ中だけ、受け付けの表示（#drop-overlay）を重ねる
function setupFileDrop() {
  const overlay = document.getElementById('drop-overlay');
  // 子要素への出入りでも dragenter / dragleave が起きるため、入った回数を数えて、ウィンドウの外へ出たときだけ消す
  let depth = 0;
  const hasFiles = event => Array.from((event.dataTransfer && event.dataTransfer.types) || []).includes('Files');
  const setShown = shown => {
    overlay.classList.toggle('is-shown', shown);
    overlay.setAttribute('aria-hidden', String(!shown));
  };

  window.addEventListener('dragenter', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth += 1;
    setShown(true);
  });
  window.addEventListener('dragover', event => {
    if (!hasFiles(event)) return;
    // 既定の動作（ブラウザがファイル自体を開く）を止め、コピーの形のカーソルにする
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', event => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) setShown(false);
  });
  window.addEventListener('drop', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth = 0;
    setShown(false);
    const files = Array.from(event.dataTransfer.files || []);
    const file = files.find(f => DROPPABLE_FILE_PATTERN.test(f.name));
    if (!file) {
      showToast('開けるのは .md / .markdown / .txt のファイルです');
      return;
    }
    // 複数のファイルを落としたときは、開ける 1 つ目だけを開く
    loadMarkdownFile(file);
  });
}

/* ==========================================================================
   フォルダを開く（FR-043〜045, DD-FILE-070〜078）
   ========================================================================== */
// 一覧に載せるファイルの数と、たどるフォルダの深さの上限。大きなフォルダを選んでも固まらないようにする（DD-FILE-072）
const FOLDER_FILE_LIMIT = 2000;
const FOLDER_DEPTH_LIMIT = 12;
// 一覧を隠したかどうか（利用者ごとの見た目の好み）を覚えておくキー（DD-FILE-074）
const FOLDER_COLLAPSED_KEY = 'lucivo.folderPaneCollapsed';
// 前回のフォルダのハンドルを保存する IndexedDB（DD-FILE-073）
const RECENT_FOLDER_DB = 'lucivo';
const RECENT_FOLDER_STORE = 'handles';
const RECENT_FOLDER_KEY = 'recentFolder';

// 開いているフォルダ: { name, files: [{ path, name, dir }], getFile(path) → Promise<File|null> }
let openedFolder = null;
// フォルダから開いた文書の、フォルダの中のパス（フォルダから開いていなければ null）
let currentFolderPath = null;
// 同梱サンプルとして開いた文書のファイル名（同梱サンプルでなければ null）（DD-FILE-081）
let currentSampleFile = null;
// 同梱サンプルのフォルダ（index.html からの相対パス）と、サンプルのファイル名
const SAMPLES_DIR = 'samples';
const BUNDLED_SAMPLES = ['visual-sample.md', 'notation_sample.md', 'notation_sample_extra1.md'];
// フォルダの画像のパス → blob URL（読み込み中は Promise）（DD-FILE-076）
const folderImageUrls = new Map();
// File System Access API が使えなかったとき、次からはフォルダの選択の入力欄を使う（DD-FILE-071）
let preferFolderInput = false;
let recentFolderHandle = null;

// 隠しフォルダ（. で始まる）と、依存パッケージの置き場は、たどらない
function isSkippedFolderName(name) {
  return name.startsWith('.') || name === 'node_modules';
}

function folderDirOf(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

// base（フォルダの中のフォルダのパス）から見た相対パスを、フォルダの中のパスにする。フォルダの外へ出るときは null（DD-FILE-076）
function resolveFolderPath(base, src) {
  let rel = String(src).split(/[?#]/)[0].replace(/\\/g, '/');
  try {
    rel = decodeURIComponent(rel);
  } catch (_) {
    // % の並びが壊れているときは、書いたままのパスで探す
  }
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.length ? parts.join('/') : null;
}

function sortFolderFiles(files) {
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  // フォルダの直下のファイルを先に、その後はサブフォルダのパスの順、同じフォルダの中は名前の順
  return files.sort((a, b) => (a.dir === '' ? 0 : 1) - (b.dir === '' ? 0 : 1)
    || collator.compare(a.dir, b.dir) || collator.compare(a.name, b.name));
}

// File System Access API のハンドルから、Markdown ファイルを集める（DD-FILE-072）
async function scanDirectoryHandle(root) {
  const files = [];
  let truncated = false;
  const walk = async (dir, prefix, depth) => {
    for await (const [name, handle] of dir.entries()) {
      if (files.length >= FOLDER_FILE_LIMIT) {
        truncated = true;
        return;
      }
      const path = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === 'directory') {
        if (!isSkippedFolderName(name) && depth < FOLDER_DEPTH_LIMIT) await walk(handle, path, depth + 1);
      } else if (DROPPABLE_FILE_PATTERN.test(name)) {
        files.push({ path, name, dir: prefix });
      }
    }
  };
  await walk(root, '', 0);
  return { files: sortFolderFiles(files), truncated };
}

function makeHandleFolder(root, scan) {
  return {
    name: root.name,
    files: scan.files,
    truncated: scan.truncated,
    async getFile(path) {
      try {
        const segs = path.split('/');
        let dir = root;
        for (const seg of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(seg);
        return await (await dir.getFileHandle(segs[segs.length - 1])).getFile();
      } catch (_) {
        return null;
      }
    }
  };
}

// <input webkitdirectory> で選んだファイルの一覧から作る。webkitRelativePath の先頭はフォルダの名前（DD-FILE-071）
function makeInputFolder(fileList) {
  const all = new Map();
  let name = '';
  for (const file of fileList) {
    const segs = (file.webkitRelativePath || file.name).split('/');
    if (!name) name = segs.length > 1 ? segs[0] : '';
    const inner = segs.length > 1 ? segs.slice(1) : segs;
    if (inner.slice(0, -1).some(isSkippedFolderName)) continue;
    all.set(inner.join('/'), file);
  }
  const files = [];
  for (const [path, file] of all) {
    if (DROPPABLE_FILE_PATTERN.test(file.name)) files.push({ path, name: file.name, dir: folderDirOf(path) });
  }
  const truncated = files.length > FOLDER_FILE_LIMIT;
  return {
    name: name || 'フォルダ',
    files: sortFolderFiles(files).slice(0, FOLDER_FILE_LIMIT),
    truncated,
    async getFile(path) {
      return all.get(path) || null;
    }
  };
}

function getFolderImageUrl(folder, path) {
  if (!folderImageUrls.has(path)) {
    folderImageUrls.set(path, folder.getFile(path).then(file => {
      const url = file ? URL.createObjectURL(file) : null;
      // 読み込み中に別のフォルダに替わったら、作った URL を捨てる
      if (folder !== openedFolder) {
        if (url) URL.revokeObjectURL(url);
        return null;
      }
      folderImageUrls.set(path, url);
      return url;
    }));
  }
  return Promise.resolve(folderImageUrls.get(path));
}

function clearFolderImageUrls() {
  folderImageUrls.forEach(url => {
    if (typeof url === 'string') URL.revokeObjectURL(url);
  });
  folderImageUrls.clear();
}

function setOpenedFolder(folder) {
  clearFolderImageUrls();
  openedFolder = folder;
  // 前に開いていた文書は、新しいフォルダの文書ではない
  currentFolderPath = null;
  setFolderPaneCollapsed(false);
  renderFolderList();
  renderApp();
  const note = folder.truncated ? `（先頭の ${FOLDER_FILE_LIMIT} 件）` : '';
  showToast(`「${folder.name}」を開きました。Markdown ${folder.files.length} 件${note}`);
}

function closeFolder() {
  clearFolderImageUrls();
  openedFolder = null;
  currentFolderPath = null;
  renderFolderList();
  renderApp();
}

// 「フォルダを開く…」。Chrome / Edge は File System Access API、それ以外はフォルダの選択の入力欄（DD-FILE-070, 071）
async function openFolder() {
  if (!window.showDirectoryPicker || preferFolderInput) {
    document.getElementById('folder-input').click();
    return;
  }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ id: 'lucivo-folder', mode: 'read' });
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    // file:// で使えないなど。次からは入力欄を使い、今回も試す（クリックの直後でなければ、ブラウザが止めることがある）
    console.warn('showDirectoryPicker failed:', err);
    preferFolderInput = true;
    document.getElementById('folder-input').click();
    return;
  }
  await openFolderFromHandle(handle);
  saveRecentFolderHandle(handle);
}

async function openFolderFromHandle(handle) {
  try {
    setOpenedFolder(makeHandleFolder(handle, await scanDirectoryHandle(handle)));
  } catch (err) {
    console.error('Failed to read folder:', err);
    showToast(`「${handle.name}」を読み込めませんでした`);
  }
}

// フォルダの中のファイルを開く（一覧と、文書の中のリンクから。DD-FILE-075, DD-FILE-079）。
// 一覧に載らないファイル（件数の上限を超えたものなど）も、フォルダの中にあれば開く。開けたら true
async function openFolderFile(path) {
  const folder = openedFolder;
  if (!folder) return false;
  const name = path.slice(path.lastIndexOf('/') + 1);
  const file = await folder.getFile(path);
  if (folder !== openedFolder) return false;
  if (!file) {
    showToast(`「${path}」はフォルダの中に見つかりません`);
    return false;
  }
  if (!confirmDiscardEdits(name)) return false;
  try {
    applyLoadedMarkdown(await file.text(), name, path);
  } catch (err) {
    console.error('Failed to read file:', err);
    showToast(`「${name}」を読み込めませんでした`);
    return false;
  }
  // 狭い画面では一覧が文書に重なるため、選んだら隠す
  if (window.matchMedia('(max-width: 1023.98px)').matches) setFolderPaneCollapsed(true);
  return true;
}

// 見出しの文字から、GitHub と同じ形のアンカー（小文字、記号を除く、空白は -）を作る（DD-FILE-080）
function headingSlug(text) {
  return String(text).trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

// プレビューの中で、アンカー（#以降）に当たる見出しへ送る。見つからなければ false
function scrollToHeadingAnchor(anchor) {
  let target = anchor;
  try {
    target = decodeURIComponent(anchor);
  } catch (_) {
    // % の並びが壊れているときは、書いたままで探す
  }
  const slug = headingSlug(target);
  const scroller = document.getElementById('preview-scroll');
  const heading = Array.from(scroller.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .find(h => headingSlug(h.textContent) === slug);
  if (!heading) return false;
  // Visualモードの章の見出しは、章（スラブ）の上端へ送る
  const el = heading.closest('.exhibition-slab') || heading;
  scroller.scrollTo({ top: previewScrollTopOf(el, scroller), behavior: scrollBehavior() });
  return true;
}

// 文書の中のリンク（DD-FILE-079, 080）。相対パスの Markdown へのリンクと、見出しへのリンク（#…）は、
// ブラウザの既定の動作（Lucivo の画面から、Markdown のファイルそのものへ移ってしまう）を止めて、Lucivo の中で開く
function setupDocumentLinks() {
  document.getElementById('preview-scroll').addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || event.defaultPrevented || event.button !== 0) return;
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      event.preventDefault();
      if (!scrollToHeadingAnchor(href.slice(1))) showToast('リンク先の見出しが見つかりません');
      return;
    }
    if (!isRelativeSrc(href)) return;
    const [pathPart, ...rest] = href.split('#');
    const anchor = rest.join('#');
    if (!DROPPABLE_FILE_PATTERN.test(pathPart.split('?')[0])) return;
    event.preventDefault();
    // 同梱サンプルの間のリンクは、同梱サンプルとして開く（DD-FILE-081）
    if (currentSampleFile && !(openedFolder && currentFolderPath !== null)) {
      const samplePath = resolveFolderPath('', pathPart);
      if (!BUNDLED_SAMPLES.includes(samplePath)) {
        showToast(`「${samplePath || pathPart}」は同梱サンプルにありません`);
        return;
      }
      const opened = samplePath === currentSampleFile ? Promise.resolve(true) : loadBundledSample(samplePath);
      opened.then(ok => {
        if (ok && anchor && !scrollToHeadingAnchor(anchor)) showToast('リンク先の見出しが見つかりません');
      });
      return;
    }
    if (!openedFolder || currentFolderPath === null) {
      showToast('Markdown へのリンクは、「開く」→「フォルダを開く…」で開いた文書で使えます');
      return;
    }
    const path = resolveFolderPath(folderDirOf(currentFolderPath), pathPart);
    if (path === null) {
      showToast('開いたフォルダの外のファイルは開けません');
      return;
    }
    const open = path === currentFolderPath ? Promise.resolve(true) : openFolderFile(path);
    open.then(opened => {
      if (opened && anchor && !scrollToHeadingAnchor(anchor)) showToast('リンク先の見出しが見つかりません');
    });
  });
}

// 一覧を描き直す。フォルダを開いていなければ、一覧も帯も出さない（DD-FILE-074）
function renderFolderList() {
  const pane = document.getElementById('folder-pane');
  const rail = document.getElementById('btn-folder-show');
  if (!openedFolder) {
    pane.classList.add('hidden');
    rail.classList.add('hidden');
    return;
  }
  const collapsed = isFolderPaneCollapsed();
  pane.classList.toggle('hidden', collapsed);
  rail.classList.toggle('hidden', !collapsed);
  document.getElementById('folder-pane-name').textContent = openedFolder.name;
  document.getElementById('folder-pane-name').title = openedFolder.name;
  const list = document.getElementById('folder-list');
  list.replaceChildren();
  if (!openedFolder.files.length) {
    const empty = document.createElement('p');
    empty.className = 'folder-list-empty';
    empty.textContent = 'Markdown ファイル（.md / .markdown / .txt）がありません';
    list.append(empty);
    return;
  }
  let lastDir = null;
  for (const file of openedFolder.files) {
    if (file.dir !== lastDir && file.dir !== '') {
      const dir = document.createElement('div');
      dir.className = 'folder-list-dir';
      dir.textContent = `${file.dir}/`;
      dir.title = file.dir;
      list.append(dir);
    }
    lastDir = file.dir;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'folder-list-item';
    btn.dataset.path = file.path;
    btn.title = file.path;
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    const label = document.createElement('span');
    label.textContent = file.name;
    btn.append(label);
    if (file.path === currentFolderPath) {
      btn.classList.add('is-current');
      btn.setAttribute('aria-current', 'page');
    }
    btn.onclick = () => openFolderFile(file.path);
    list.append(btn);
  }
}

function isFolderPaneCollapsed() {
  try {
    return localStorage.getItem(FOLDER_COLLAPSED_KEY) === '1';
  } catch (_) {
    return document.getElementById('folder-pane').dataset.collapsed === '1';
  }
}

function setFolderPaneCollapsed(collapsed) {
  try {
    localStorage.setItem(FOLDER_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch (_) {
    // 保存できない環境（プライベートウィンドウなど）では、その場の表示だけを切り替える
    document.getElementById('folder-pane').dataset.collapsed = collapsed ? '1' : '0';
  }
  renderFolderList();
}

// 前回のフォルダのハンドル（DD-FILE-073）。IndexedDB を使えない環境では、何もしない
function openRecentFolderDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECENT_FOLDER_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(RECENT_FOLDER_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveRecentFolderHandle(handle) {
  recentFolderHandle = handle;
  updateRecentFolderMenu();
  try {
    const db = await openRecentFolderDb();
    db.transaction(RECENT_FOLDER_STORE, 'readwrite').objectStore(RECENT_FOLDER_STORE).put(handle, RECENT_FOLDER_KEY);
  } catch (err) {
    console.warn('Failed to remember the folder:', err);
  }
}

async function loadRecentFolderHandle() {
  if (!window.showDirectoryPicker || !window.indexedDB) return;
  try {
    const db = await openRecentFolderDb();
    const handle = await new Promise((resolve, reject) => {
      const req = db.transaction(RECENT_FOLDER_STORE, 'readonly').objectStore(RECENT_FOLDER_STORE).get(RECENT_FOLDER_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (handle && handle.kind === 'directory') {
      recentFolderHandle = handle;
      updateRecentFolderMenu();
    }
  } catch (err) {
    console.warn('Failed to read the remembered folder:', err);
  }
}

function updateRecentFolderMenu() {
  const item = document.getElementById('menu-open-recent-folder');
  item.classList.toggle('hidden', !recentFolderHandle);
  if (recentFolderHandle) item.textContent = `前回のフォルダ「${recentFolderHandle.name}」を開く`;
}

// 前回のフォルダを開く。読む許可は開くたびにブラウザが確かめる（クリックの直後に求める必要がある）
async function reopenRecentFolder() {
  const handle = recentFolderHandle;
  if (!handle) return;
  try {
    let permission = await handle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'read' });
    if (permission !== 'granted') {
      showToast(`「${handle.name}」を読む許可がありません`);
      return;
    }
  } catch (err) {
    console.warn('Failed to reopen the folder:', err);
    showToast(`「${handle.name}」を開けませんでした。「フォルダを開く…」から選び直してください`);
    return;
  }
  await openFolderFromHandle(handle);
}

function setupFolder() {
  const input = document.getElementById('folder-input');
  input.onchange = () => {
    const files = Array.from(input.files || []);
    // 同じフォルダを続けて選んでも change が発生するよう、選択を解除する
    input.value = '';
    if (files.length) setOpenedFolder(makeInputFolder(files));
  };
  document.getElementById('btn-folder-hide').onclick = () => setFolderPaneCollapsed(true);
  document.getElementById('btn-folder-show').onclick = () => setFolderPaneCollapsed(false);
  document.getElementById('btn-folder-close').onclick = closeFolder;
  setupDocumentLinks();
  loadRecentFolderHandle();
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
  setupVisualStageInteractions();
  setupKeyboardShortcuts();
  setupFileMenu();
  setupFileDrop();
  setupFolder();
  setupDiagramPanZoom();
  setupLocalImages();
  setupFrontMatterToggle();
  setupMarkedMath();
  setupMarkedHeadings();
  setupMermaid();
  renderApp();
});

// E2E テストおよび外部連携用グローバル公開
(window as any).state = state;
(window as any).renderApp = renderApp;
(window as any).closeFileMenu = closeFileMenu;

Object.defineProperty(window, 'openedFolder', {
  get() { return openedFolder; },
  set(val) { openedFolder = val; },
  configurable: true
});

Object.defineProperty(window, 'currentSampleFile', {
  get() { return currentSampleFile; },
  set(val) { currentSampleFile = val; },
  configurable: true
});

Object.defineProperty(window, 'lastLoadedMarkdown', {
  get() { return lastLoadedMarkdown; },
  set(val) { lastLoadedMarkdown = val; },
  configurable: true
});

Object.defineProperty(window, 'preferFolderInput', {
  get() { return preferFolderInput; },
  set(val) { preferFolderInput = val; },
  configurable: true
});

// stage.js などの外部スクリプト（非同期動的ロード）や E2E テストとの後方互換用
(window as any).hexToRgba = hexToRgba;
(window as any).escapeHtml = escapeHtml;
(window as any).updateSlabSplit = updateSlabSplit;
(window as any).updateAllSlabSplits = updateAllSlabSplits;
(window as any).clearVisualStageSpotlight = clearVisualStageSpotlight;
(window as any).showToast = showToast;
(window as any).isModalOpen = isModalOpen;
(window as any).setModalOpen = setModalOpen;
(window as any).findScrollParent = findScrollParent;
(window as any).fitCache = fitCache;
(window as any).mathCache = mathCache;
(window as any).svgCache = svgCache;
(window as any).EMPTY_GUIDE_HTML = EMPTY_GUIDE_HTML;





