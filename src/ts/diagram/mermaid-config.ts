// @ts-nocheck
import { hexToRgba, mixHex } from '../utils/color';
import {
  THEMES,
  VISUAL_STYLE_PALETTES,
  VISUAL_THEMES,
  VISUAL_THEMES_DARK,
  DEFAULT_CURVES,
  darkSectionScale,
  lightSectionScale,
  lightPieScale,
  lightQuadrantScale,
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

// フローチャートのノードの文字の先頭の番号（「1.」「4A.」）と本文を、同じ行に置く（DD-DIAG-035, #145）。
// 番号の後の空白を改行しない空白（U+00A0）にして Mermaid に渡す。文節の折り返し（diagrams.css）だけでは、
// 「1. / ユーザー入力…」のように番号だけの行ができるため。番号は、形の開き記号（[ ( { > や引用符 "）の直後の
// 「数字 + 任意の英字 1 字 + ピリオド」に限る。著者の Markdown は書き換えず、描画に渡す文字だけを変える。
// 改行しない空白は、Mermaid の文字参照（#160;）で渡す。文字そのものを書くと、ソースとビルドの出力に
// 見えない文字が入り、npm run lint で止まる（esbuild は String.fromCharCode(0xa0) も文字に置き換える）
const NODE_NUMBER_SPACE = /([[({>"])(\d{1,3}[A-Za-z]?[.．])[ \t]+(?=[^\s\-=.~&|;:>\])}"])/g;

export function prepareMermaidSource(code: string): string {
  if (getCurveTarget(code) !== 'flowchart') return code;
  return code.replace(NODE_NUMBER_SPACE, (_, open, number) => `${open}${number}#160;`);
}

export function buildMermaidThemeVariables(spec, isVisual: boolean, isDark: boolean) {
  const visualColors = isVisual
    ? { secondaryColor: spec.secondary, tertiaryColor: spec.tertiary }
    : { tertiaryColor: spec.clusterBg };
  return {
    darkMode: isDark,
    ...(isDark ? darkSectionScale() : isVisual ? { ...lightSectionScale(state.infographicStyle), ...lightPieScale(state.infographicStyle), ...lightQuadrantScale(state.infographicStyle) } : {}),
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

// Visualモードのノードの文字の太さ（スタイルごと）。後処理（svg-visual-styles.ts）がこの太さにする（DD-DIAG-035）
export const VISUAL_NODE_LABEL_WEIGHT: Record<string, number> = { shapes: 700, cards: 700, circles: 700, editorial: 600 };

// Mermaid がノードの大きさを測るときの文字の太さを、後処理で付ける太さにそろえる（DD-DIAG-035, #145）。
// themeCSS は図の SVG の <style> に入り、Mermaid は描く前にこれを入れるため、測るときにも効く。
// そろえないと、太くした文字が測った幅に収まらずに折り返し、形の高さ（1 行分）からはみ出す
function nodeLabelThemeCss(isVisual: boolean): string {
  if (!isVisual) return '';
  const weight = VISUAL_NODE_LABEL_WEIGHT[state.infographicStyle] || VISUAL_NODE_LABEL_WEIGHT.shapes;
  return `.nodeLabel, .nodeLabel *, .stateLabel, .stateLabel * { font-weight: ${weight} !important; }`;
}

export function setupMermaid(isVisual = state.isVisualMode, curve = 'smooth', layout = 'dagre', code = '') {
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
    themeCSS: nodeLabelThemeCss(isVisual),
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
    // Visualモードでは、作業名・区分・日付を本文に近い大きさで読めるよう、文字とバーを大きくする（DD-DIAG-028, #149）
    gantt: isVisual ? {
      useWidth: 820,
      barHeight: 32,
      barGap: 8,
      topPadding: 64,
      leftPadding: 96,
      fontSize: 15,
      sectionFontSize: 15,
      useMaxWidth: true
    } : {
      useWidth: 820,
      barHeight: 24,
      barGap: 6,
      topPadding: 56,
      leftPadding: 72,
      fontSize: 12,
      sectionFontSize: 12,
      useMaxWidth: true
    },
    ...(isVisual ? {
      // ジャーニーは、作業の箱と文字を大きくし、左の凡例の幅を詰める（図が枠の幅に収まるときの縮小を減らす）
      journey: { width: 176, height: 60, taskFontSize: 17, taskMargin: 56, leftMargin: 132, useMaxWidth: true },
      timeline: { width: 190, useMaxWidth: true }
    } : {}),
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
      ...buildMermaidThemeVariables(spec, isVisual, isDark),
      // タイムラインの文字は、テーマの文字の大きさで決まる。Visualモードでは年とイベント名を読める大きさにする（DD-DIAG-028）
      ...(isVisual && /^\s*timeline\b/m.test(code) ? { fontSize: '17px' } : {}),
      // ジャーニーの登場人物の丸（actor0〜5）は、既定では蛍光の黄緑などになる。スタイルの 4 色（Light では少し沈めた色）にする
      ...(isVisual ? Object.fromEntries([0, 1, 2, 3, 4, 5].map(i => {
        const palette = VISUAL_STYLE_PALETTES[state.infographicStyle] || VISUAL_STYLE_PALETTES.shapes;
        return [`actor${i}`, mixHex(palette[(i + 2) % 4], '#1E293B', isDark ? 0 : 0.18)];
      })) : {})
    }
  });
}

/* ==========================================================================
   数式（FR-010）: Marked の拡張で数式の置き場所を作り、サニタイズ後に KaTeX で描画する
   ========================================================================== */
