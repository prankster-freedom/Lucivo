// @ts-nocheck
import { mixHex } from '../utils/color';
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
  preferFileInput: false,
  recentFolderHandle: null,
  currentRemoteUrl: null as string | null,
  currentRemoteFetchUrl: null as string | null,
  followedKey: null,
  renderApp: () => {},
  syncUrlFromState: () => {}
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
// 図の周りの広い余白を詰める図種（DD-DIAG-028）
export const TIGHT_VIEWBOX_TYPES = ['timeline', 'journey'];

// マインドマップなどの枝ごとの色（cScale）と円グラフの色（pie）。Mermaid は darkMode のとき派生色を暗くしすぎ、
// Dark の背景の上でノードと枝、スライスと凡例が黒く沈むので、明度をそろえた色を明示する（DD-DIAG-025）
export const DARK_SECTION_HUES = [215, 172, 262, 32, 145, 330, 195, 12, 95, 285, 50, 240];
export function darkSectionScale() {
  const vars: Record<string, string> = {};
  if (state.tone && state.tone !== 'default') {
    const entry = getToneEntry(state.tone);
    const palette = [entry.dark.c1, entry.dark.c2, entry.dark.c3, entry.dark.c4];
    const fillWeights = [0.46, 0.58, 0.34];
    const pieWeights = [0.22, 0.42, 0.58];
    for (let i = 0; i < 12; i++) {
      const base = palette[i % 4];
      const band = Math.floor(i / 4);
      vars[`cScale${i}`] = mixHex(base, entry.dark.canvasBg, fillWeights[band]);
      vars[`cScalePeer${i}`] = base;
      vars[`cScaleLabel${i}`] = entry.dark.text;
      vars[`pie${i + 1}`] = mixHex(base, entry.dark.canvasBg, pieWeights[band]);
    }
    return vars;
  }
  DARK_SECTION_HUES.forEach((hue, i) => {
    vars[`cScale${i}`] = `hsl(${hue}, 45%, 38%)`;
    vars[`cScalePeer${i}`] = `hsl(${hue}, 50%, 58%)`;
    vars[`cScaleLabel${i}`] = '#F1F5F9';
    vars[`pie${i + 1}`] = `hsl(${hue}, 45%, 42%)`;
  });
  return vars;
}
// スタイルごとの 4 色（CSS の --vs-c1〜c4 と同じ値。DTP-VTPL-070）。図の枝の色と、数式の補足グラフの線の色に使う
export const VISUAL_STYLE_PALETTES: Record<string, string[]> = {
  shapes: ['#E29578', '#EBB453', '#6CC4C9', '#9CCB86'],
  cards: ['#E29578', '#E6B34B', '#A3B4E4', '#6DB1B4'],
  circles: ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763'],
  editorial: ['#D68C8C', '#8FA876', '#C9A66B', '#8FA3B8']
};

// 採用カラートーン（AST-145 より選定、#221）。'default' はスタイル準拠（Visualモードは DTP-003、高速モードは Cobalt 相当）
export interface ToneModeSpec {
  c1: string;
  c2: string;
  c3: string;
  c4: string;
  canvasBg: string;
  cardBg: string;
  edge: string;
  text: string;
  glow: string;
}
export interface ColorToneSpec {
  id: string;
  label: string;
  light: ToneModeSpec;
  dark: ToneModeSpec;
}
export const COLOR_TONES: ColorToneSpec[] = [
  {
    id: 'default',
    label: 'スタイル準拠',
    light: { c1: '#2563EB', c2: '#0EA5E9', c3: '#10B981', c4: '#F59E0B', canvasBg: '#FFFFFF', cardBg: '#F8FAFC', edge: '#475569', text: '#0F172A', glow: '#38BDF8' },
    dark: { c1: '#38BDF8', c2: '#818CF8', c3: '#34D399', c4: '#FBBF24', canvasBg: '#0B101B', cardBg: '#161F30', edge: '#94A3B8', text: '#F8FAFC', glow: '#7DD3FC' }
  },
  {
    id: 'cobalt-workshop',
    label: '晴天の工作舎',
    light: { c1: '#D42A44', c2: '#D99B00', c3: '#198038', c4: '#2266CC', canvasBg: '#F4F7FB', cardBg: '#FFFFFF', edge: '#334155', text: '#0F172A', glow: '#38BDF8' },
    dark: { c1: '#FF5C77', c2: '#FFD147', c3: '#4ADE80', c4: '#60A5FA', canvasBg: '#0B1220', cardBg: '#131E33', edge: '#94A3B8', text: '#F8FAFC', glow: '#7DD3FC' }
  },
  {
    id: 'morning-window',
    label: '朝の窓辺',
    light: { c1: '#E57A89', c2: '#D9AE38', c3: '#5CB874', c4: '#6898DC', canvasBg: '#F8FAFC', cardBg: '#FFFFFF', edge: '#5A6D82', text: '#1E293B', glow: '#60A5FA' },
    dark: { c1: '#FF9EAA', c2: '#FFE066', c3: '#7EE89C', c4: '#8CC0FF', canvasBg: '#101622', cardBg: '#192233', edge: '#9BB0C9', text: '#F8FAFC', glow: '#BAE6FD' }
  },
  {
    id: 'matcha-wagashi',
    label: '抹茶と和三盆',
    light: { c1: '#6D8C50', c2: '#C49A5C', c3: '#C27477', c4: '#6B5B4B', canvasBg: '#F4F1E8', cardBg: '#FBF9F4', edge: '#5E584B', text: '#24211B', glow: '#84B558' },
    dark: { c1: '#A3D175', c2: '#F2C97D', c3: '#F0989B', c4: '#C2AD94', canvasBg: '#121610', cardBg: '#1B2118', edge: '#A4A090', text: '#F4F1E8', glow: '#C2EB96' }
  },
  {
    id: 'nordic-frost',
    label: '北欧の霜柱',
    light: { c1: '#4D8BB0', c2: '#5BA3C2', c3: '#7A86B8', c4: '#556D85', canvasBg: '#F0F6FA', cardBg: '#FAFDFE', edge: '#536A7D', text: '#162330', glow: '#38BDF8' },
    dark: { c1: '#70C4F0', c2: '#8EE0F8', c3: '#B4BEFA', c4: '#A2C0D9', canvasBg: '#0B131E', cardBg: '#142030', edge: '#93AEC4', text: '#F1F6FA', glow: '#A5F3FC' }
  },
  {
    id: 'amber-sunset',
    label: '琥珀の夕暮れ',
    light: { c1: '#D9821E', c2: '#D95A4A', c3: '#B54269', c4: '#7A548C', canvasBg: '#FAF3EB', cardBg: '#FFFBF7', edge: '#6B525A', text: '#291C20', glow: '#F59E0B' },
    dark: { c1: '#FFB347', c2: '#FF7D6B', c3: '#F2729C', c4: '#C292DB', canvasBg: '#181016', cardBg: '#241821', edge: '#B0929D', text: '#FAF3EE', glow: '#FCD34D' }
  },
  {
    id: 'midnight-library',
    label: '夜を編む図書館',
    light: { c1: '#8F2D3E', c2: '#8F7018', c3: '#266E40', c4: '#2A4E85', canvasBg: '#ECEAE4', cardBg: '#F7F5F0', edge: '#3F4657', text: '#171A24', glow: '#D4A528' },
    dark: { c1: '#F07185', c2: '#F2C957', c3: '#5CD685', c4: '#78A8F5', canvasBg: '#0C101A', cardBg: '#151C2C', edge: '#8C9AB8', text: '#F3F1EB', glow: '#FFE073' }
  },
  {
    id: 'cyber-prism',
    label: '分光プリズムと黒曜石',
    light: { c1: '#0369A1', c2: '#DB2777', c3: '#7C3AED', c4: '#059669', canvasBg: '#F1F5F9', cardBg: '#FFFFFF', edge: '#475569', text: '#0F172A', glow: '#06B6D4' },
    dark: { c1: '#38BDF8', c2: '#F472B6', c3: '#B494FF', c4: '#34D399', canvasBg: '#080C16', cardBg: '#111829', edge: '#8193B0', text: '#F8FAFC', glow: '#67E8F9' }
  }
];

export const VISUAL_STYLE_PALETTES_DARK: Record<string, string[]> = {
  shapes: ['#FF8C6B', '#FFC44D', '#4ADCEB', '#7FE07E'],
  cards: ['#FF9472', '#FFC857', '#96B0FF', '#56DDD0'],
  circles: ['#FF7D70', '#7AC4F5', '#FFC166', '#9CD868'],
  editorial: ['#F09B9B', '#A9CF87', '#E6BE6E', '#9CC0E6']
};

export function getToneEntry(toneId = state.tone): ColorToneSpec {
  return COLOR_TONES.find(t => t.id === toneId) || COLOR_TONES[0];
}

export function getEffectiveVisualPalette(style: string, appearance = state.appearance): string[] {
  if (state.tone && state.tone !== 'default') {
    const mode = appearance === 'dark' ? getToneEntry().dark : getToneEntry().light;
    return [mode.c1, mode.c2, mode.c3, mode.c4];
  }
  if (appearance === 'dark') {
    return VISUAL_STYLE_PALETTES_DARK[style] || VISUAL_STYLE_PALETTES_DARK.shapes;
  }
  return VISUAL_STYLE_PALETTES[style] || VISUAL_STYLE_PALETTES.shapes;
}

// Light の Visualモードの、マインドマップ・タイムラインなどの枝ごとの色（DD-DIAG-026, DTP-003）。
// Mermaid の派生のままでは、色相を 30 度ずつ回した彩度の高い色（蛍光の黄緑など）になり、誌面の淡い調子から浮く。
// スタイルの 4 色を白で薄めた塗り（3 段の濃さ）にして、トーンを誌面にそろえる。文字は濃い色、縁と下線は元の色を少し沈めた色
const LIGHT_SECTION_TINTS = [0.42, 0.62, 0.28];
export const LIGHT_SECTION_TEXT = '#1E293B';
export function lightSectionScale(style: string) {
  const palette = getEffectiveVisualPalette(style, 'light');
  const vars = {};
  for (let i = 0; i < 12; i++) {
    const base = palette[i % 4];
    vars[`cScale${i}`] = mixHex(base, '#FFFFFF', LIGHT_SECTION_TINTS[Math.floor(i / 4)]);
    vars[`cScalePeer${i}`] = mixHex(base, LIGHT_SECTION_TEXT, 0.18);
    vars[`cScaleInv${i}`] = mixHex(base, LIGHT_SECTION_TEXT, 0.3);
    vars[`cScaleLabel${i}`] = LIGHT_SECTION_TEXT;
  }
  return vars;
}
// Light の Visualモードの円グラフの扇の色（DD-DIAG-027, DTP-003）。
// Mermaid の派生のままでは、淡い主色から作った半透明の色になり、隣の扇や背景と見分けにくい。
// スタイルの 4 色をそのまま（濃い側）先頭の 4 枚に当て、5 枚目以降は白・濃紺を混ぜた段にする。不透明で塗る
export function lightPieScale(style: string) {
  const palette = getEffectiveVisualPalette(style, 'light');
  const vars = { pieOpacity: '1' };
  for (let i = 0; i < 12; i++) {
    const base = palette[i % 4];
    const band = Math.floor(i / 4);
    vars[`pie${i + 1}`] = band === 0 ? base : band === 1 ? mixHex(base, '#FFFFFF', 0.42) : mixHex(base, LIGHT_SECTION_TEXT, 0.22);
  }
  return vars;
}
// Light の Visualモードの 4 象限チャートの塗り（DD-DIAG-029, DTP-003）。Mermaid の派生のままでは、4 つの象限がほぼ同じ色になり、
// 象限の違いが伝わらない。スタイルの 4 色を白で薄めた色を 1 象限ずつ当てる。点は濃紺で、象限の上でも見分けられる
export function lightQuadrantScale(style: string) {
  const palette = getEffectiveVisualPalette(style, 'light');
  const vars = { quadrantPointFill: LIGHT_SECTION_TEXT, quadrantPointTextFill: LIGHT_SECTION_TEXT, quadrantTitleFill: LIGHT_SECTION_TEXT };
  // Mermaid の番号は、1: 右上、2: 左上、3: 左下、4: 右下
  [1, 2, 3, 4].forEach((n, i) => {
    vars[`quadrant${n}Fill`] = mixHex(palette[i], '#FFFFFF', 0.5);
    vars[`quadrant${n}TextFill`] = LIGHT_SECTION_TEXT;
  });
  return vars;
}
// Vibrant Circles で、白文字では読みにくい明るい塗り
export const CIRCLE_DARK_TEXT_FILLS = ['#ECB674'];
// シーケンス図のメッセージの数式を、メッセージ線から離す量（SVG の座標単位）
export const SEQUENCE_MATH_LIFT = 6;

// 公開リポジトリ（最新版の配布元）と Lucivo で README を開く公開 URL（FR-024, FR-049, #298）
export const REPOSITORY_URL = 'https://github.com/prankster-freedom/Lucivo';
export const README_VIEWER_URL = `https://prankster-freedom.github.io/Lucivo/preview/?url=${encodeURIComponent('https://github.com/prankster-freedom/Lucivo/blob/main/README.md')}&view=canvas&mode=visual`;
// 新しいタブで開き、開いたページから Lucivo の画面を操作されないようにする
export const REPOSITORY_LINK_ATTRS = `href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer"`;
export const README_VIEWER_LINK_ATTRS = `href="${README_VIEWER_URL}" target="_blank" rel="noopener noreferrer"`;

export const EMPTY_GUIDE_HTML = `
<div class="empty-guide">
  <div class="empty-guide-logo">
    <a class="brand-link" ${README_VIEWER_LINK_ATTRS} title="Lucivo で README を開く（インターネットに接続します）">
      <img class="brand-logo-light" src="./assets/logos/light/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
      <img class="brand-logo-dark" src="./assets/logos/dark/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
    </a>
  </div>
  <h3 class="empty-guide-title">Markdown を開いてください</h3>
  <p class="empty-guide-desc">Markdown ファイルは、ウィンドウにドラッグ&ドロップするだけで簡単に開けます。別の文書へのリンクや画像を含む文書は、フォルダごとドラッグ&ドロップすれば、左の一覧から開けて、リンクと画像も表示できます。ヘッダーの「開く」メニューから「ファイルを開く…」や「フォルダを開く…」、同梱の <code>Visualモードサンプル (visual-sample.md)</code> / <code>記法サンプル (notation_sample.md)</code> をワンクリックで開くことも、左のエディタに直接入力することもできます。</p>
  
  <div class="empty-guide-modes">
    <div class="empty-guide-card">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.5 3.5L6.5 13H12L10.5 20.5L17.5 11H12L13.5 3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.14"/><path d="M3.5 8.5H6.5M3 15.5H5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5"/></svg><span>高速モード</span></h4>
      <p>思考を邪魔しないミリ秒応答の軽快なプレビュー。仕様書の執筆や構造の確認に最適です。</p>
    </div>
    <div class="empty-guide-card empty-guide-card-featured">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="3" stroke="currentColor" stroke-width="1.75"/><path d="M7 9.5H12.5M7 13H10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polygon points="16.5,8.5 19.2,12 16.5,15.5 13.8,12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.22"/></svg><span>Visualモード (展示品質)</span></h4>
      <p>講演資料や展示ブースの大画面で映えるプロ品質のインフォグラフィックへ瞬時に変換します。</p>
    </div>
    <div class="empty-guide-card">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.75"/><path d="M10.25 8.25L14.75 10.5L10.25 12.75V8.25Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 16.5V20M8.5 20H15.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg><span>ステージ発表 (発表モード)</span></h4>
      <p>ヘッダーの「発表」ボタン（または <kbd class="kbd-key">P</kbd> キー）で全画面のプレゼンテーション舞台へ。章ごとのページ送り、光が伝わるシグナル・ライト、全シーン俯瞰 (Oキー)、光のポインター (Lキー)、幕間・質疑カーテン (B/Qキー)、自動進行ループ (Aキー) で魅せます。</p>
    </div>
  </div>

  <p class="empty-guide-footer"><svg class="empty-guide-footer-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-opacity="0.45"/><polygon points="8,3.2 9.4,6.6 12.8,8 9.4,9.4 8,12.8 6.6,9.4 3.2,8 6.6,6.6" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg><span>画面上部の <strong>[ 高速モード | Visualモード ]</strong> や <strong>[ 発表 ]</strong> ボタンからいつでもワンクリックで体験できます。キーボードの <kbd class="kbd-key">?</kbd> キーでショートカット一覧を表示できます。</span></p>
  <p class="empty-guide-latest"><span class="empty-guide-latest-label">最新版はこちら</span>: <a class="empty-guide-latest-link" ${REPOSITORY_LINK_ATTRS}>github.com/prankster-freedom/Lucivo</a></p>
  <p class="empty-guide-update">Lucivo <span class="update-check-version"></span> <button type="button" class="btn-check-update" title="最新リリースを確認（インターネットに接続します）">更新を確認</button> <span class="update-check-result" role="status" aria-live="polite"></span></p>
</div>`;

export const VISUAL_LAYOUTS = [
  { id: 'page', label: 'ページ単位', shortLabel: 'ページ単位', desc: '16:10 相当の章パネルで区切って表示' },
  { id: 'single', label: 'シングルページ', shortLabel: 'シングルページ', desc: 'ページ区切りなしの連続した 1 枚の誌面で表示' }
] as const;

export const state = {
  appearance: 'light',
  palette: 'cobalt',
  tone: 'default',
  viewMode: 'split',
  isVisualMode: false,
  infographicStyle: 'shapes',
  visualLayout: 'page' as 'page' | 'single',
  showFrontMatter: false,
  signalLightsEnabled: true,
  ambientEffectsEnabled: false,
  // 図の番号 → 矢印の形状（'smooth' / 'step' / 'straight'）。画面の表示の間だけ保持する（DD-EDGE-003）
  curveByIndex: new Map()
};

// 図のキャッシュ上限。18 図のサンプルで主要モードを切り替えても溢れない件数とする
export const DIAGRAM_CACHE_LIMIT = 200;

// 上限件数を超えたら最も長く使われていない項目を捨てる LRU キャッシュ
export class LruCache<K = string, V = any> extends Map<K, V> {
  private readonly maxSize: number;

  constructor(maxSize: number) {
    super();
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    if (!super.has(key)) return undefined;
    const value = super.get(key) as V;
    super.delete(key);
    super.set(key, value);
    return value;
  }

  set(key: K, value: V): this {
    if (super.has(key)) {
      super.delete(key);
    } else if (this.size >= this.maxSize) {
      const oldestKey = this.keys().next().value;
      if (oldestKey !== undefined) super.delete(oldestKey);
    }
    return super.set(key, value);
  }
}

export const svgCache = new LruCache(DIAGRAM_CACHE_LIMIT);
export const lkgCache = new LruCache(DIAGRAM_CACHE_LIMIT);
// Fit の下限・上限の計算結果（描画結果のキャッシュのキー → { minWidth, maxWidth }）と、数式の描画結果
export const fitCache = new LruCache(DIAGRAM_CACHE_LIMIT);
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
  // 絵文字ショートコードの対応表（FR-058, DD-MD-070〜072）。ショートコードを含む文書を描くときだけ読み込む（NFR-006）
  emoji: { script: './js/emoji.js', global: 'LucivoEmoji' }
};
export const libraryLoads = new Map();
// 書き出した HTML はアプリの外へ持ち出すため、同梱ファイルの相対パスを CDN の URL に置き換える（DD-OFF-003）
export const EXPORT_URLS = {
  './vendor/fonts/fonts.css': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap',
  './vendor/marked.min.js': 'https://cdn.jsdelivr.net/npm/marked@18.2.1/lib/marked.umd.js',
  './vendor/purify.min.js': 'https://cdn.jsdelivr.net/npm/dompurify@3.4.18/dist/purify.min.js',
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

