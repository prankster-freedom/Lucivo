// @ts-nocheck
import { mixHex } from '../utils/color';
import { t, getLang, resolveSampleFileName, getReadmeViewerUrl, type I18nKey } from '../i18n';
import { hasBundledSamples, samplesRawUrl, isPresentModeAvailable } from './sample-source';
export const APP_TITLE_SUFFIX = ' - Lucivo';
export const DROPPABLE_FILE_PATTERN = /\.(md|markdown|txt)$/i;

export const runtime: Record<string, any> = {
  renderDebounceTimer: null,
  renderGeneration: 0,
  lastRenderMs: 30,
  prevStdCache: null,
  stdPendingGeneration: 0,
  prevVisCache: null,
  prevDocModel: null,
  visPendingGeneration: 0,
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
  followFrame: 0,
  isInputRender: false,
  followIndex: [] as { line: number; el: HTMLElement }[],
  caretState: { pos: 0, line: 0, length: -1, dirty: true },
  pendingEdit: null as { type: string; start: number; deletedNewlines: number } | null,
  lastNavTargetTop: null as number | null,
  lastNavTime: 0,
  urlSyncReady: false,
  applyViewModeFn: null as ((mode: string) => void) | null,
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

// 図の中の文字が判読できる表示上の最小サイズ（2 段組みと印刷の段組みの判定に使う。Fit の下限ではない。DD-DIAG-030）と、小さな図の拡大の上限
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
  analyticsId: string;
  label: string;
  light: ToneModeSpec;
  dark: ToneModeSpec;
}
export const COLOR_TONES: ColorToneSpec[] = [
  {
    id: 'default',
    analyticsId: '000-default',
    label: 'スタイル準拠',
    light: { c1: '#2563EB', c2: '#0EA5E9', c3: '#10B981', c4: '#F59E0B', canvasBg: '#FFFFFF', cardBg: '#F8FAFC', edge: '#475569', text: '#0F172A', glow: '#38BDF8' },
    dark: { c1: '#38BDF8', c2: '#818CF8', c3: '#34D399', c4: '#FBBF24', canvasBg: '#0B101B', cardBg: '#161F30', edge: '#94A3B8', text: '#F8FAFC', glow: '#7DD3FC' }
  },
  // 1. パステル・フェミニン・ニュアンス（綿菓子＋新選定 3 種）
  {
    id: 'cotton-candy',
    analyticsId: '171-cotton-candy',
    label: '綿菓子',
    light: { c1: '#BDB5DA', c2: '#FCDBC3', c3: '#CEEAF5', c4: '#FDF0F7', canvasBg: '#FDF0F7', cardBg: '#F8EBF5', edge: '#878299', text: '#855070', glow: '#FCDBC3' },
    dark: { c1: '#B6A9E3', c2: '#F5C9A8', c3: '#C5EDFD', c4: '#EBD1DF', canvasBg: '#3D3948', cardBg: '#534E62', edge: '#ACA6BE', text: '#DACFF7', glow: '#F1CCB1' }
  },
  {
    id: 'spring-mist',
    analyticsId: '002-spring-mist',
    label: '春霞のさくら',
    light: { c1: '#F2D7DA', c2: '#F4ECD2', c3: '#D9EADC', c4: '#D8E2F0', canvasBg: '#FBF0F2', cardBg: '#FFF8F9', edge: '#997E81', text: '#8B4F5D', glow: '#F4B8C4' },
    dark: { c1: '#E8BCC2', c2: '#E6DBB5', c3: '#BCE0C3', c4: '#BCCCE6', canvasBg: '#42363D', cardBg: '#5D4D56', edge: '#93787B', text: '#EFC7DE', glow: '#F9D5DC' }
  },
  {
    id: 'lavender-apricot',
    analyticsId: '054-lavender-apricot',
    label: 'ラベンダーと杏',
    light: { c1: '#FAC294', c2: '#DBB5C9', c3: '#DEDCE4', c4: '#FDEADF', canvasBg: '#FDEADF', cardBg: '#FDE7D9', edge: '#928379', text: '#765744', glow: '#FAC294' },
    dark: { c1: '#FFBB82', c2: '#DDA0C1', c3: '#D3CDE2', c4: '#FFE3D2', canvasBg: '#383029', cardBg: '#52473D', edge: '#8B7D72', text: '#D8C3AF', glow: '#FFC79A' }
  },
  {
    id: 'dried-rose',
    analyticsId: '106-dried-rose',
    label: 'ドライローズ',
    light: { c1: '#D68942', c2: '#7B3341', c3: '#CA9790', c4: '#F7E3E1', canvasBg: '#F7E3E1', cardBg: '#F4DCD4', edge: '#918378', text: '#5B3B38', glow: '#D68942' },
    dark: { c1: '#EEA669', c2: '#D57F8C', c3: '#E3ABA4', c4: '#F2D4D1', canvasBg: '#211A14', cardBg: '#3F342C', edge: '#8B7D72', text: '#D8C4B2', glow: '#E29857' }
  },
  {
    id: 'peach-blossom',
    analyticsId: '052-peach-blossom',
    label: '桃の花',
    light: { c1: '#F8C1B8', c2: '#FEECD9', c3: '#FCE0DE', c4: '#FEECD9', canvasBg: '#FFFCF9', cardBg: '#FFF8F2', edge: '#9A7F7A', text: '#875E2F', glow: '#F8C1B8' },
    dark: { c1: '#F4A295', c2: '#FEE5C9', c3: '#F4C9C6', c4: '#FEE5C9', canvasBg: '#483734', cardBg: '#644E4A', edge: '#947974', text: '#F9CAC1', glow: '#FFC4BA' }
  },
  {
    id: 'lime-aqua-dune',
    analyticsId: '066-lime-aqua-dune',
    label: 'ライムとアクアの砂丘',
    light: { c1: '#F4ED87', c2: '#D9C6A4', c3: '#CDE8EC', c4: '#FDEADF', canvasBg: '#FDEADF', cardBg: '#FCEAD8', edge: '#8F8476', text: '#765744', glow: '#F4ED87' },
    dark: { c1: '#E5DA4A', c2: '#D2B379', c3: '#B0DCE2', c4: '#FFE3D2', canvasBg: '#3D3C32', cardBg: '#535244', edge: '#828171', text: '#D9D7BC', glow: '#E0D978' }
  },
  {
    id: 'lemon-meringue',
    analyticsId: '093-lemon-meringue',
    label: 'レモンメレンゲ',
    light: { c1: '#E5E460', c2: '#F8F09B', c3: '#D4DCEF', c4: '#F7F8F6', canvasBg: '#F7F8F6', cardBg: '#F6F6EA', edge: '#878871', text: '#555519', glow: '#E5E460' },
    dark: { c1: '#DCD900', c2: '#E6DA68', c3: '#C3D0EF', c4: '#D6DDCF', canvasBg: '#3D3D2E', cardBg: '#53533F', edge: '#82836B', text: '#E6E6BD', glow: '#DFDC33' }
  },
  {
    id: 'lilac-snow',
    analyticsId: '160-lilac-snow',
    label: 'ライラックと雪',
    light: { c1: '#ECDDEE', c2: '#FFFAFB', c3: '#ECDDEE', c4: '#FFFAFB', canvasBg: '#FFFAFB', cardBg: '#FDF8FA', edge: '#908093', text: '#905463', glow: '#ECDDEE' },
    dark: { c1: '#E2C9E5', c2: '#E9D5D9', c3: '#E2C9E5', c4: '#E9D5D9', canvasBg: '#423844', cardBg: '#5A4D5D', edge: '#8A7A8C', text: '#E8CCED', glow: '#DFCEE1' }
  },
  // 2. 明快・ビジネス・ポップ
  {
    id: 'cobalt-workshop',
    analyticsId: '010-cobalt-workshop',
    label: '晴天の工作舎',
    light: { c1: '#D42A44', c2: '#E0B414', c3: '#22A046', c4: '#2266CC', canvasBg: '#ECF3FB', cardBg: '#F7FAFE', edge: '#9A7E7E', text: '#173B5F', glow: '#38BDF8' },
    dark: { c1: '#EB576D', c2: '#ECC63E', c3: '#45BD68', c4: '#4D8AE6', canvasBg: '#101B30', cardBg: '#2A3854', edge: '#877B8F', text: '#C3D6F7', glow: '#7DD3FC' }
  },
  {
    id: 'morning-window',
    analyticsId: '001-morning-window',
    label: '朝の窓辺',
    light: { c1: '#F3A7B0', c2: '#F6E08E', c3: '#A8DBB0', c4: '#A9C4EC', canvasBg: '#EEF5FB', cardBg: '#F9FCFE', edge: '#997E81', text: '#25577B', glow: '#7DD3FC' },
    dark: { c1: '#F5B7BF', c2: '#F8E7A6', c3: '#B8E3BF', c4: '#B9CFF0', canvasBg: '#263345', cardBg: '#3C4D64', edge: '#9BB0CC', text: '#BCD4F5', glow: '#BAE6FD' }
  },
  // 3. ペール・淡色
  {
    id: 'blush-chambray',
    analyticsId: '023-blush-chambray',
    label: '頬紅とシャンブレー',
    light: { c1: '#D4B6A4', c2: '#FBD3C5', c3: '#D5D6D9', c4: '#FBEFE1', canvasBg: '#FBEFE1', cardBg: '#F8E8DD', edge: '#928379', text: '#725C40', glow: '#FBD3C5' },
    dark: { c1: '#DBA787', c2: '#FFD9CC', c3: '#C9CEDD', c4: '#E9D4BC', canvasBg: '#382F2A', cardBg: '#52463F', edge: '#A8988E', text: '#DBC0B2', glow: '#F6C9B9' }
  },
  {
    id: 'butterfly-sketch',
    analyticsId: '107-butterfly-sketch',
    label: '蝶のスケッチ',
    light: { c1: '#94376B', c2: '#642430', c3: '#FDD59C', c4: '#F2BCD7', canvasBg: '#FFF9F0', cardBg: '#FEF0DC', edge: '#977E89', text: '#62440D', glow: '#FDD59C' },
    dark: { c1: '#E478B1', c2: '#CF717E', c3: '#FDCF8D', c4: '#FBBCDC', canvasBg: '#1A0F14', cardBg: '#3C2C33', edge: '#917883', text: '#E0B7C9', glow: '#FACC8A' }
  },
  // 4. ナチュラル・和・アース・ミニマル
  {
    id: 'matcha-wagashi',
    analyticsId: '017-matcha-wagashi',
    label: '抹茶と和三盆',
    light: { c1: '#7D9763', c2: '#DFC69E', c3: '#C78A8B', c4: '#5E5448', canvasBg: '#F3EFE2', cardBg: '#FAF8F0', edge: '#81897A', text: '#685E3E', glow: '#9CCB86' },
    dark: { c1: '#99B37F', c2: '#EAD6B5', c3: '#DAA3A4', c4: '#9F9383', canvasBg: '#22281F', cardBg: '#3B4336', edge: '#7B8374', text: '#B9C8B1', glow: '#B8E0A4' }
  },
  {
    id: 'terracotta-courtyard',
    analyticsId: '019-terracotta-courtyard',
    label: 'テラコッタの中庭',
    light: { c1: '#D46A52', c2: '#D69F4E', c3: '#839760', c4: '#B89F8D', canvasBg: '#F5ECE2', cardBg: '#FCF7F1', edge: '#94817D', text: '#705A3F', glow: '#EA6A47' },
    dark: { c1: '#E48670', c2: '#E6B56A', c3: '#9EB37B', c4: '#CBB5A6', canvasBg: '#271E19', cardBg: '#463932', edge: '#8E7B77', text: '#D1B7A9', glow: '#FF9D80' }
  },
  // 5. クール・マリン・レトロ・夕暮れ
  {
    id: 'nordic-frost',
    analyticsId: '018-nordic-frost',
    label: '北欧の霜柱',
    light: { c1: '#7EA6BF', c2: '#A5C7D9', c3: '#B2B8D6', c4: '#CBD5E1', canvasBg: '#EBF3F8', cardBg: '#F6FAFC', edge: '#798993', text: '#436478', glow: '#A5F3FC' },
    dark: { c1: '#9EC1D6', c2: '#BDD9E8', c3: '#C8CDE6', c4: '#9EAEC3', canvasBg: '#2F3B4B', cardBg: '#445368', edge: '#9EB0C6', text: '#C4D5EB', glow: '#CFFAFE' }
  },
  {
    id: 'sea-glass-shore',
    analyticsId: '013-sea-glass-shore',
    label: 'シーグラスの浜辺',
    light: { c1: '#3A4A9A', c2: '#2A6A7A', c3: '#2A9A6A', c4: '#A8C84A', canvasBg: '#E8F5F7', cardBg: '#F4FBFC', edge: '#818695', text: '#38636A', glow: '#0EA5B7' },
    dark: { c1: '#8297FD', c2: '#52A9BE', c3: '#49C48F', c4: '#BFE063', canvasBg: '#1B313A', cardBg: '#2E4B57', edge: '#75828E', text: '#B8D5E2', glow: '#4FD8E8' }
  },
  {
    id: 'amber-sunset',
    analyticsId: '014-amber-sunset',
    label: '琥珀の夕暮れ',
    light: { c1: '#E89B3C', c2: '#E06A5A', c3: '#B84D6F', c4: '#6D597A', canvasBg: '#F9EFE4', cardBg: '#FFF8F1', edge: '#908477', text: '#735B41', glow: '#F59E0B' },
    dark: { c1: '#F2AF5C', c2: '#EB8678', c3: '#D16F8E', c4: '#9983A9', canvasBg: '#231921', cardBg: '#433540', edge: '#8A7E71', text: '#C9B1C4', glow: '#FCD34D' }
  },
  // 6. 重厚・シック・サイバー
  {
    id: 'midnight-library',
    analyticsId: '007-midnight-library',
    label: '夜を編む図書館',
    light: { c1: '#6E2A35', c2: '#6E5C1F', c3: '#265A35', c4: '#26406A', canvasBg: '#ECE7DC', cardBg: '#F6F3EC', edge: '#9A7E80', text: '#4C3800', glow: '#D4AF37' },
    dark: { c1: '#CC6B79', c2: '#C2A64B', c3: '#549E6A', c4: '#6389C6', canvasBg: '#121826', cardBg: '#2D3548', edge: '#877B8F', text: '#BBCBEE', glow: '#F3D56B' }
  },
  {
    id: 'black-blossom',
    analyticsId: '113-black-blossom',
    label: '黒と白い花',
    light: { c1: '#F3AE93', c2: '#3A4F59', c3: '#353439', c4: '#D5D6D9', canvasBg: '#F9F9F9', cardBg: '#F0F1F2', edge: '#93827B', text: '#56392E', glow: '#F3AE93' },
    dark: { c1: '#FFB99E', c2: '#7C9AA9', c3: '#918BA6', c4: '#D1D5E0', canvasBg: '#19100D', cardBg: '#3A2D29', edge: '#8D7C75', text: '#DFC4BC', glow: '#FFBCA1' }
  },
  {
    id: 'cyber-prism',
    analyticsId: '020-cyber-prism',
    label: '分光プリズムと黒曜石',
    light: { c1: '#0284C7', c2: '#DB2777', c3: '#7C3AED', c4: '#059669', canvasBg: '#EBF2F8', cardBg: '#F6FAFD', edge: '#728797', text: '#00314F', glow: '#00F0FF' },
    dark: { c1: '#38BDF8', c2: '#F472B6', c3: '#A78BFA', c4: '#34D399', canvasBg: '#0E1422', cardBg: '#2C3548', edge: '#738295', text: '#C8D8F9', glow: '#67E8F9' }
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

export function getToneLabel(toneId = state.tone): string {
  const key = `tone.${toneId}` as I18nKey;
  const translated = t(key);
  if (translated !== key) return translated;
  return getToneEntry(toneId).label;
}

export function getLayoutLabel(layoutId = state.visualLayout): string {
  return layoutId === 'single' ? t('layout.single') : t('layout.page');
}

// 起動画面のサンプルのカード（FR-007, ARC-PUB-008）。サムネイルは assets/thumbs/ に同梱し、表示言語に合わせる（起動時に外部通信しない）
interface SampleLink { file: string; label: I18nKey }
interface SampleCard { id: string; thumbAlt: I18nKey; desc: I18nKey; links: SampleLink[]; mode?: 'visual'; presentMode?: string }

const SAMPLE_CARDS: SampleCard[] = [
  { id: 'visual', thumbAlt: 'sample.visual', desc: 'empty.sampleVisualDesc', mode: 'visual', links: [{ file: 'visual-sample.md', label: 'sample.visual' }] },
  {
    id: 'notation', thumbAlt: 'sample.notation', desc: 'empty.sampleNotationDesc',
    links: [
      { file: 'notation_sample.md', label: 'sample.notation' },
      { file: 'notation_sample_extra1.md', label: 'sample.notationExtra' }
    ]
  },
  { id: 'color-museum', thumbAlt: 'sample.colorMuseum', desc: 'empty.sampleColorMuseumDesc', mode: 'visual', links: [{ file: 'color-museum-sample.md', label: 'sample.colorMuseum' }], presentMode: 'museum-walk' }
];

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// リンク先。Web 版は GitHub 上のサンプルを開く URL、スタンドアロン版は同梱を開くので移動しない
function sampleCardHref(file: string, presentMode?: string, mode?: 'visual'): string {
  const lang = getLang();
  if (hasBundledSamples()) return '#';
  const params = [`url=${encodeURIComponent(samplesRawUrl(resolveSampleFileName(file)))}`];
  if (presentMode) params.push('mode=visual', 'theme=dark', `present=${presentMode}`);
  else if (mode === 'visual') params.push('mode=visual');
  if (lang === 'en') params.push('lang=en');
  return `./?${params.join('&')}`;
}

export function getSampleCardsHtml(): string {
  const lang = getLang();
  const web = !hasBundledSamples();
  return SAMPLE_CARDS
    .filter(card => !card.presentMode || (web && isPresentModeAvailable(card.presentMode)))
    .map(card => {
      const modeAttr = card.mode ? ` data-empty-mode="${card.mode}"` : '';
      // Web 版は新しいタブ（別ウィンドウ）で開き、スタンドアロン版はアプリ内で開く（pushState + popstate 対応）
      const attr = (file: string) => (web
        ? ' target="_blank" rel="noopener noreferrer"'
        : ` data-empty-sample="${escapeAttr(file)}"${modeAttr}`);
      const first = card.links[0];
      const links = card.links
        .map(link => `<a class="empty-guide-sample-link" href="${escapeAttr(sampleCardHref(link.file, card.presentMode, card.mode))}"${attr(link.file)}>${t(link.label)}</a>`)
        .join('');
      return `      <div class="empty-guide-sample-card" data-sample-card="${card.id}">
        <a class="empty-guide-sample-thumb" href="${escapeAttr(sampleCardHref(first.file, card.presentMode, card.mode))}"${attr(first.file)} tabindex="-1" aria-hidden="true">
          <img src="./assets/thumbs/${card.id}.${lang}.webp" width="640" height="400" loading="lazy" decoding="async" alt="${escapeAttr(t(card.thumbAlt))}" />
        </a>
        <div class="empty-guide-sample-body">
          <div class="empty-guide-sample-links">${links}</div>
          <span class="empty-guide-sample-desc">${t(card.desc)}</span>
        </div>
      </div>`;
    })
    .join('\n');
}

export function getEmptyGuideHtml(): string {
  const readmeAttrs = `href="${getReadmeViewerUrl()}" target="_blank" rel="noopener noreferrer"`;
  const urlIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path stroke-linecap="round" stroke-linejoin="round" d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>';
  return `
<div class="empty-guide">
  <div class="empty-guide-logo">
    <a class="brand-link" ${readmeAttrs} title="${t('brand.openReadmeTitle')}">
      <img class="brand-logo-light" src="./assets/logos/light/logo_full.svg" alt="${t('brand.fullLogoAlt')}" width="264" height="72" />
      <img class="brand-logo-dark" src="./assets/logos/dark/logo_full.svg" alt="${t('brand.fullLogoAlt')}" width="264" height="72" />
    </a>
  </div>
  <h3 class="empty-guide-title">${t('empty.title')}</h3>
  <p class="empty-guide-desc">${t('empty.desc')}</p>

  <form class="empty-guide-url-form" data-empty-url-form novalidate>
    <input type="url" inputmode="url" class="empty-guide-url-input" data-empty-url-input aria-label="${t('empty.urlLabel')}" placeholder="${t('empty.urlPlaceholder')}" autocomplete="off" autocapitalize="off" spellcheck="false" />
    <button type="submit" class="empty-guide-url-btn">${urlIcon}<span>${t('empty.urlOpen')}</span></button>
  </form>

  <div class="empty-guide-samples" role="group" aria-label="${t('menu.bundledSamples')}">
    <span class="empty-guide-samples-label">${t('empty.samplesLabel')}</span>
    <div class="empty-guide-sample-cards">
${getSampleCardsHtml()}
    </div>
  </div>

  <div class="empty-guide-modes">
    <div class="empty-guide-card">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M13.5 3.5L6.5 13H12L10.5 20.5L17.5 11H12L13.5 3.5Z" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.14"/><path d="M3.5 8.5H6.5M3 15.5H5.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-opacity="0.5"/></svg><span>${t('empty.cardFastTitle')}</span></h4>
      <p>${t('empty.cardFastDesc')}</p>
    </div>
    <div class="empty-guide-card empty-guide-card-featured">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4.5" width="18" height="15" rx="3" stroke="currentColor" stroke-width="1.75"/><path d="M7 9.5H12.5M7 13H10.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><polygon points="16.5,8.5 19.2,12 16.5,15.5 13.8,12" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" fill="currentColor" fill-opacity="0.22"/></svg><span>${t('empty.cardVisualTitle')}</span></h4>
      <p>${t('empty.cardVisualDesc')}</p>
    </div>
    <div class="empty-guide-card">
      <h4><svg class="empty-guide-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="4" width="18" height="12.5" rx="2.5" stroke="currentColor" stroke-width="1.75"/><path d="M10.25 8.25L14.75 10.5L10.25 12.75V8.25Z" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 16.5V20M8.5 20H15.5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"/></svg><span>${t('empty.cardStageTitle')}</span></h4>
      <p>${t('empty.cardStageDesc')}</p>
    </div>
  </div>

  <p class="empty-guide-footer"><svg class="empty-guide-footer-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 2V14M2 8H14" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-opacity="0.45"/><polygon points="8,3.2 9.4,6.6 12.8,8 9.4,9.4 8,12.8 6.6,9.4 3.2,8 6.6,6.6" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="1.25" stroke-linejoin="round"/></svg><span>${t('empty.footer')}</span></p>
  <p class="empty-guide-latest"><span class="empty-guide-latest-label">${t('update.latestHere')}</span>: <a class="empty-guide-latest-link" ${REPOSITORY_LINK_ATTRS}>github.com/prankster-freedom/Lucivo</a></p>
  <p class="empty-guide-update">Lucivo <span class="update-check-version"></span> <button type="button" class="btn-check-update" title="${t('update.btnTitle')}">${t('update.btnLabel')}</button> <span class="update-check-result" role="status" aria-live="polite"></span></p>
</div>`;
}

export const EMPTY_GUIDE_HTML = getEmptyGuideHtml();

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
// 図の判読できる幅と Fit の拡大の上限の計算結果（描画結果のキャッシュのキー → { readableWidth, maxWidth, naturalWidth, viewBox }）と、数式の描画結果
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

