// @ts-nocheck
export const APP_TITLE_SUFFIX = ' - Lucivo';
export const DROPPABLE_FILE_PATTERN = /\.(md|markdown|txt)$/i;

export const runtime: Record<string, any> = {
  renderDebounceTimer: null,
  renderGeneration: 0,
  lastLoadedMarkdown: '',
  currentFileName: 'untitled.md',
  currentFileEncoding: 'UTF-8',
  lastMermaidSources: [] as string[],
  openedFolder: null,
  currentFolderPath: null,
  currentSampleFile: null,
  preferFolderInput: false,
  recentFolderHandle: null,
  followedKey: null,
  renderApp: () => {}
};

export function resolveModal(idOrEl) {
  return typeof idOrEl === 'string' ? document.getElementById(idOrEl) : idOrEl;
}

export function isModalOpen(idOrEl) {
  const modal = resolveModal(idOrEl);
  return Boolean(modal && !modal.classList.contains('hidden'));
}

export function setModalOpen(idOrEl, open) {
  const modal = resolveModal(idOrEl);
  if (!modal) return;
  modal.classList.toggle('hidden', !open);
  modal.classList.toggle('flex', Boolean(open));
}

export const THEMES = {
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
export const VISUAL_THEMES = {
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
export const VISUAL_DARK_BASE = {
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
export const VISUAL_DARK_ACCENTS = {
  shapes: { clusterBg: '#16302F', secondary: '#155E75', tertiary: '#7C3A2E', activationBg: '#164E63' },
  cards: { secondary: '#3B4A75', tertiary: '#1F5254', activationBg: '#4A3A1A' },
  circles: { secondary: '#2F5266', tertiary: '#6B2E2A', activationBg: '#5A2B27' },
  editorial: { clusterBg: '#2A251C', secondary: '#3F4D33', tertiary: '#5A3535', activationBg: '#3F4D33' }
};
export const VISUAL_THEMES_DARK = Object.fromEntries(Object.entries(VISUAL_THEMES).map(([style, spec]) =>
  [style, { ...spec, ...VISUAL_DARK_BASE, ...VISUAL_DARK_ACCENTS[style] }]));
export const VISUAL_STYLE_KEYS = Object.keys(VISUAL_THEMES);

export const NODE_DECORATED_TYPES = ['flowchart-v2', 'flowchart', 'stateDiagram'];

// 図種ごとの矢印の既定の形状（FR-012）。フローチャートは業務フロー図で一般的な直角にする
export const DEFAULT_CURVES = { flowchart: 'step', state: 'smooth', class: 'step' };
export const CURVE_LABELS = { smooth: '曲線', step: '直角', straight: '直線' };

// Fit 表示で保つ、図の中の文字の表示上の最小サイズ（NFR-005）と、小さな図の拡大の上限
export const MIN_FIT_FONT_PX = 10;
export const MAX_FIT_SCALE = 1.5;

// マインドマップなどの枝ごとの色（cScale）と円グラフの色（pie）。Mermaid は darkMode のとき派生色を暗くしすぎ、
// Dark の背景の上でノードと枝、スライスと凡例が黒く沈むので、明度をそろえた色を明示する（DD-DIAG-025）
export const DARK_SECTION_HUES = [215, 172, 262, 32, 145, 330, 195, 12, 95, 285, 50, 240];
export function darkSectionScale() {
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
export const CIRCLE_DARK_TEXT_FILLS = ['#ECB674'];
// シーケンス図のメッセージの数式を、メッセージ線から離す量（SVG の座標単位）
export const SEQUENCE_MATH_LIFT = 6;

// 公開リポジトリ（最新版の配布元）。ヘッダーのロゴのリンク（index.html）も同じ URL にする（FR-024）
export const REPOSITORY_URL = 'https://github.com/prankster-freedom/Lucivo';
// 新しいタブで開き、開いたページから Lucivo の画面を操作されないようにする
export const REPOSITORY_LINK_ATTRS = `href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer"`;

export const EMPTY_GUIDE_HTML = `
<div class="empty-guide">
  <div class="empty-guide-logo">
    <a class="brand-link" ${REPOSITORY_LINK_ATTRS} title="Lucivo の公開リポジトリ（最新版）を開く">
      <img class="brand-logo-light" src="./assets/logos/light/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
      <img class="brand-logo-dark" src="./assets/logos/dark/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
    </a>
  </div>
  <h3 class="empty-guide-title">Markdown を開いてください</h3>
  <p class="empty-guide-desc">Markdown ファイルは、ウィンドウにドラッグ&ドロップするだけで簡単に開けます。別の文書へのリンクや画像を含む文書は、フォルダごとドラッグ&ドロップすれば、左の一覧から開けて、リンクと画像も表示できます。ヘッダーの「開く」メニューから「ファイルを開く…」や「フォルダを開く…」、同梱の <code>Visualモードサンプル (visual-sample.md)</code> / <code>記法サンプル (notation_sample.md)</code> をワンクリックで開くことも、左のエディタに直接入力することもできます。</p>
  
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
  <p class="empty-guide-latest"><span class="empty-guide-latest-label">最新版はこちら</span>: <a class="empty-guide-latest-link" ${REPOSITORY_LINK_ATTRS}>github.com/prankster-freedom/Lucivo</a></p>
  <p class="empty-guide-update">Lucivo <span class="update-check-version"></span> <button type="button" class="btn-check-update" title="最新リリースを確認（インターネットに接続します）">更新を確認</button> <span class="update-check-result" role="status" aria-live="polite"></span></p>
</div>`;

export const state = {
  appearance: 'light',
  palette: 'cobalt',
  viewMode: 'split',
  isVisualMode: false,
  infographicStyle: 'shapes',
  showFrontMatter: false,
  signalLightsEnabled: true,
  // 図の番号 → 矢印の形状（'smooth' / 'step' / 'straight'）。画面の表示の間だけ保持する（DD-EDGE-003）
  curveByIndex: new Map()
};

export const svgCache = new Map();
export const lkgCache = new Map();
// Fit の下限・上限の計算結果（描画結果のキャッシュのキー → { minWidth, maxWidth }）と、数式の描画結果
export const fitCache = new Map();
export const mathCache = new Map();

// 図・数式がない文書では読み込まないライブラリ。名前 → 読み込みの Promise（true: 読み込めた）
export const LIBRARIES = {
  mermaid: { script: './vendor/mermaid.min.js', global: 'mermaid' },
  katex: {
    script: './vendor/katex/katex.min.js',
    style: './vendor/katex/katex.min.css',
    global: 'katex'
  },
  // Visualモードの舞台演出（FR-018, FR-019）。高速モードの起動には読み込まない（NFR-006）
  stage: { script: './js/stage.js', global: 'LucivoStage' },
  // file:// 直開き時の同梱サンプル読み込みフォールバック（FR-006）。サンプルを選んだときだけ読み込む（NFR-006）
  samples: { script: './samples/samples-data.js', global: 'LUCIVO_SAMPLES' },
  // Markdown の整形（FR-053, DD-FILE-088）。文書を読み込むときと「今の文書を整える」のときだけ読み込む（NFR-006）
  formatter: { script: './js/formatter.js', global: 'LucivoFormatter' },
  // 発表の見せ方（Web 版だけ。#58 でモードごとに別のファイル）。発表のドロップダウンで選んだときだけ読み込む
  zoomMap: { script: './js/zoom-map.js', global: 'LucivoZoomMap' },
  playable: { script: './js/playable.js', global: 'LucivoPlayable' }
};
export const libraryLoads = new Map();
// 書き出した HTML はアプリの外へ持ち出すため、同梱ファイルの相対パスを CDN の URL に置き換える（DD-OFF-003）
export const EXPORT_URLS = {
  './vendor/fonts/fonts.css': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
  './vendor/marked.min.js': 'https://cdn.jsdelivr.net/npm/marked@18.1.3/lib/marked.umd.js',
  './vendor/purify.min.js': 'https://cdn.jsdelivr.net/npm/dompurify@3.4.17/dist/purify.min.js',
  './vendor/mermaid.min.js': 'https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js',
  './vendor/katex/katex.min.js': 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js',
  './vendor/katex/katex.min.css': 'https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css'
};

// CSS も <head> に入れるため、HTML エクスポート（outerHTML）にも含まれる
export function loadLibrary(name) {
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

