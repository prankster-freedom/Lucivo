// @ts-nocheck
import { hexToRgba } from '../utils/color';
import {
  THEMES,
  VISUAL_THEMES,
  VISUAL_THEMES_DARK,
  DEFAULT_CURVES,
  darkSectionScale,
  state
} from '../ui/state';

export function getThemeSpec() {
  const mode = THEMES[state.appearance] || THEMES.light;
  return mode[state.palette] || mode.cobalt;
}

export function syncCssTokens() {
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

export function getMermaidCurve(curve) {
  if (curve === 'step') return 'stepAfter';
  if (curve === 'straight') return 'linear';
  return 'basis';
}

// 矢印の形状を選べる図種か。Mermaid 12 で curve の設定が効くのはフローチャート・状態遷移図・クラス図（DD-EDGE-001）
export function getCurveTarget(code) {
  const first = code.split(/\r?\n/).map(line => line.trim()).find(line => line && !line.startsWith('%%')) || '';
  if (/^(flowchart|graph)\b/.test(first)) return 'flowchart';
  if (/^stateDiagram(-v2)?\b/.test(first)) return 'state';
  if (/^classDiagram(-v2)?\b/.test(first)) return 'class';
  return null;
}

// 図の矢印の形状。利用者が選んでいなければ、図種の既定の形状（DD-EDGE-002, 003）
export function getBlockCurve(index, code) {
  const target = getCurveTarget(code);
  if (!target) return null;
  return state.curveByIndex.get(index) || DEFAULT_CURVES[target];
}

// 描画に使う配色。Visual Stage はスタイルごとの配色、通常モードは外観とパレットの配色
export function getDiagramSpec(isVisual) {
  if (isVisual) {
    const themes = state.appearance === 'dark' ? VISUAL_THEMES_DARK : VISUAL_THEMES;
    return themes[state.infographicStyle] || themes.shapes;
  }
  return getThemeSpec();
}

// Mermaid 12 の layout は図全体に効く。マインドマップは dagre だと放射状でなくなるので、既定のレイアウトにする。
// 直角のクラス図も既定のレイアウトにする。dagre の stepAfter は線の出発点で横に進むため、
// 出発点に付く継承などの記号が横を向く。既定のレイアウトは縦 → 横 → 縦の直角で結ぶ（DD-EDGE-005）
export function getMermaidLayout(code, curve = null) {
  if (/^\s*mindmap\b/m.test(code)) return null;
  if (curve === 'step' && getCurveTarget(code) === 'class') return null;
  return 'dagre';
}

export function buildMermaidThemeVariables(spec, isVisual: boolean, isDark: boolean) {
  const visualColors = isVisual
    ? { secondaryColor: spec.secondary, tertiaryColor: spec.tertiary }
    : { tertiaryColor: spec.clusterBg };
  return {
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
    pieStrokeColor: spec.edgeStroke,
    pieOuterStrokeColor: spec.edgeStroke,
    pieTitleTextColor: spec.nodeText,
    pieSectionTextColor: isDark ? '#F1F5F9' : spec.nodeText,
    pieLegendTextColor: spec.nodeText,
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
  };
}

export function setupMermaid(isVisual = state.isVisualMode, curve = 'smooth', layout = 'dagre') {
  syncCssTokens();
  const spec = getDiagramSpec(isVisual);
  const isDark = state.appearance === 'dark';

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
    themeVariables: buildMermaidThemeVariables(spec, isVisual, isDark)
  });
}

/* ==========================================================================
   数式（FR-010）: Marked の拡張で数式の置き場所を作り、サニタイズ後に KaTeX で描画する
   ========================================================================== */
