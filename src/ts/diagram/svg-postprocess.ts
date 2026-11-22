// @ts-nocheck
import { hexToRgba } from '../utils/color';
import { escapeHtml } from '../utils/escape';
import { scopeSvgIds } from './scope';
import { scalePickerHtml } from './scale-mode';
import { t } from '../i18n';
import { fitTwoColMath } from '../markdown/math-and-headings';
import {
  NODE_DECORATED_TYPES,
  CURVE_LABELS,
  MIN_FIT_FONT_PX,
  MAX_FIT_SCALE,
  TIGHT_VIEWBOX_TYPES,
  SEQUENCE_MATH_LIFT,
  state,
  fitCache
} from '../ui/state';
import {
  getThemeSpec,
  getDiagramSpec,
  getCurveTarget,
  getBlockCurve
} from './mermaid-config';
import { decorateVisualSvg } from './svg-visual-styles';
import { applyDiagramLayoutFixes } from './svg-layout-fixes';

// シーケンス図のライフライン・活性区間・メッセージ線・矢じりを、背景と見分けられる配色にする（NFR-004）
export function styleSequenceDiagram(svg, colors) {
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
export function applyReadableFit(svg, cacheKey) {
  const viewBox = svg && svg.viewBox && svg.viewBox.baseVal;
  if (!viewBox || !viewBox.width) return;
  let fit = cacheKey && fitCache.get(cacheKey);
  // タイムラインとジャーニーは、Mermaid が図の周りに広い余白を取る。余白のぶん図が縮んで文字が小さくなるため、
  // viewBox を中身の大きさ（と少しの余白）に詰める（DD-DIAG-028, #149）。計測は初回だけで、結果はキャッシュする
  let tightViewBox = fit ? fit.viewBox : null;
  if (!fit && TIGHT_VIEWBOX_TYPES.includes(svg.getAttribute('aria-roledescription'))) {
    const box = svg.getBBox();
    const pad = 16;
    if (box.width > 0 && box.height > 0 && (box.width + pad * 2 < viewBox.width * 0.97 || box.height + pad * 2 < viewBox.height * 0.97)) {
      tightViewBox = [box.x - pad, box.y - pad, box.width + pad * 2, box.height + pad * 2].map(v => Math.round(v)).join(' ');
    }
  }
  if (tightViewBox) {
    svg.setAttribute('viewBox', tightViewBox);
  }
  if (!fit) {
    const sizes = Array.from(svg.querySelectorAll('text, tspan, foreignObject *'))
      .filter(el => !el.closest('math') && Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim()))
      .map(el => parseFloat(getComputedStyle(el).fontSize))
      .filter(size => size > 0);
    const minScale = sizes.length ? Math.min(1, MIN_FIT_FONT_PX / Math.min(...sizes)) : 0;
    fit = {
      naturalWidth: Math.ceil(viewBox.width),
      minWidth: Math.ceil(viewBox.width * minScale),
      maxWidth: Math.ceil(viewBox.width * MAX_FIT_SCALE),
      viewBox: tightViewBox
    };
    if (cacheKey) fitCache.set(cacheKey, fit);
  }
  if (fit.minWidth) svg.style.minWidth = `${fit.minWidth}px`;
  svg.style.setProperty('--fit-max-width', `${fit.maxWidth}px`);
  svg.style.setProperty('--natural-width', `${fit.naturalWidth}px`);
  // 2 段組みで、拡大を図の高さで抑えるための縦横比（幅 ÷ 高さ。DD-DIAG-044）
  if (viewBox.height) svg.style.setProperty('--fit-aspect', (viewBox.width / viewBox.height).toFixed(4));
  const splitSlab = svg.closest('.exhibition-slab-split');
  // 印刷（A4 横 16:10 版面）の右 7 カラム幅（約 440px）に収まらない横長の図だけ 1 段組みにする（#261, DD-VTPL-139）
  if (splitSlab) {
    splitSlab.toggleAttribute('data-print-stacked', fit.minWidth > 440);
  }
  updateSlabSplit(splitSlab);
}

// 2 段組みスラブで、右カラムの表示枠より図が広い場合、または 1:1（実寸）表示に切り替えた場合は 1 段組み（is-stacked）に切り替える（FR-015, DD-DIAG-042）
export function updateSlabSplit(slab) {
  if (!slab || !slab.classList.contains('exhibition-slab-split')) return;
  const vp = slab.querySelector('.exhibition-viewport');
  if (!vp || !vp.querySelector(':scope > svg')) return;
  slab.classList.remove('is-stacked');
  if (vp.classList.contains('is-actual-size') || vp.scrollWidth > vp.clientWidth + 1) {
    slab.classList.add('is-stacked');
  }
}

// content-visibility: auto で画面外に省略中のスラブを追跡し、resize/ズーム時に全スラブを強制レイアウトしないようにする（#274）
const trackedSlabRoots = new WeakSet<Element>();
const skippedSlabs = new WeakSet<Element>();
const dirtySplitSlabs = new WeakSet<Element>();
const dirtyMathSlabs = new WeakSet<Element>();

export function ensureSlabVisibilityTracking(root: Element | null): void {
  if (!root || trackedSlabRoots.has(root)) return;
  trackedSlabRoots.add(root);
  // contentvisibilityautostatechange はバブリングしないため、キャプチャフェーズで各スラブの状態変化を拾う
  root.addEventListener('contentvisibilityautostatechange', (event: Event) => {
    const target = event.target as Element | null;
    if (!target || !target.classList || !target.classList.contains('exhibition-slab')) return;
    if ((event as any).skipped) {
      skippedSlabs.add(target);
    } else {
      skippedSlabs.delete(target);
      if (dirtySplitSlabs.has(target)) {
        dirtySplitSlabs.delete(target);
        updateSlabSplit(target);
      }
      if (dirtyMathSlabs.has(target)) {
        dirtyMathSlabs.delete(target);
        fitTwoColMath(target as HTMLElement);
      }
    }
  }, true);
}

export function updateAllSlabSplits(container) {
  if (!container) return;
  ensureSlabVisibilityTracking(container);
  const targets: { slab: Element; vp: Element; actualSize: boolean; needStack: boolean }[] = [];
  container.querySelectorAll('.exhibition-slab-split').forEach(slab => {
    if (skippedSlabs.has(slab)) {
      dirtySplitSlabs.add(slab);
      return;
    }
    dirtySplitSlabs.delete(slab);
    const vp = slab.querySelector('.exhibition-viewport');
    if (!vp || !vp.querySelector(':scope > svg')) return;
    targets.push({ slab, vp, actualSize: vp.classList.contains('is-actual-size'), needStack: false });
  });
  if (targets.length) {
    // 一括 Write: 1:1 表示でないスラブの is-stacked をまとめて外してから計測する
    for (const item of targets) {
      if (!item.actualSize) {
        item.slab.classList.remove('is-stacked');
      }
    }
    // 一括 Read: すべてのスラブの幅をまとめて読み、強制レイアウトを 1 回に抑える
    for (const item of targets) {
      item.needStack = item.actualSize || item.vp.scrollWidth > item.vp.clientWidth + 1;
    }
    // 一括 Write: 判定結果をまとめて反映する
    for (const item of targets) {
      if (item.needStack) {
        item.slab.classList.add('is-stacked');
      } else {
        item.slab.classList.remove('is-stacked');
      }
    }
  }
  fitTwoColMath(container, slab => {
    if (!skippedSlabs.has(slab)) return false;
    dirtyMathSlabs.add(slab);
    return true;
  });
}

// path の d（絶対座標）が囲む範囲。曲線の制御点も含むので、わずかに大きくなることがある
export function pathBox(path) {
  const points = Array.from((path && path.getAttribute('d') || '').matchAll(/(-?[\d.]+)[\s,]+(-?[\d.]+)/g));
  if (!points.length) return null;
  const xs = points.map(p => parseFloat(p[1]));
  const ys = points.map(p => parseFloat(p[2]));
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function createSvgElement(tag, attrs) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)));
  return el;
}

// Mermaid 12 はスタジアム形のノードを path で出力する。図の装飾は rect を前提にするので、rect に置き換える
export function normalizeStadiumNodes(svg) {
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
export function normalizeStateNodes(svg) {
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

export function postProcessSvg(rawSvg, isVisualMode) {
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
    applyDiagramLayoutFixes(svg, diagramType, isVisualMode);
    scopeSvgIds(svg);
    return svg.outerHTML;
  } catch (e) {
    console.error('SVG post-processing failed:', e);
    return rawSvg;
  }
}

// 1. 通常モード：端正なエンジニアリング設計図スタイル
export function hasUserStyle(el, prop) {
  if (!el) return false;
  if (el.style && el.style.getPropertyValue(prop)) return true;
  const attr = el.getAttribute('style') || '';
  return new RegExp(`(?:^|;)\\s*${prop}\\s*:`, 'i').test(attr);
}

export function hasUserTextColor(el) {
  if (!el) return false;
  if (hasUserStyle(el, 'color') || hasUserStyle(el, 'fill')) return true;
  const parentLabel = el.closest('.label, g.label');
  if (parentLabel && (hasUserStyle(parentLabel, 'color') || hasUserStyle(parentLabel, 'fill'))) return true;
  return false;
}

export function decorateStandardSvg(svg, diagramType) {
  const isDark = state.appearance === 'dark';
  const spec = getThemeSpec();
  const targetTextColor = isDark ? '#F8FAFC' : '#0F172A';
  svg.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text.actor, text.noteText, .nodeLabel, .stateLabel, .messageText, .loopText, .labelText').forEach(el => {
    if (hasUserTextColor(el)) return;
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
    if (!hasUserStyle(rect, 'fill')) {
      rect.style.setProperty('fill', spec.nodeBg, 'important');
    }
    if (!hasUserStyle(rect, 'stroke')) {
      rect.style.setProperty('stroke', spec.nodeStroke, 'important');
    }
    if (!hasUserStyle(rect, 'stroke-width')) {
      rect.style.setProperty('stroke-width', '1.75px', 'important');
    }
  });
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    if (!hasUserStyle(p, 'stroke')) {
      p.style.setProperty('stroke', spec.edgeStroke, 'important');
    }
    if (!hasUserStyle(p, 'stroke-width')) {
      p.style.setProperty('stroke-width', '2px', 'important');
    }
  });
}

// ======================================================================
// 2. Visual Stage モード：インフォグラフィック・エンジン

export function diagramPlaceholderHtml(index: number): string {
  return `<div class="py-12 font-mono text-xs text-blue-500 animate-pulse flex items-center justify-center">Rendering Diagram 0${index + 1}...</div>`;
}

// 図の枠だけを文字列の段階で出力する（#287）。中身（SVG または描画待ち）は描画後に [data-stage-index] へ差し込む。
// .lucivo-slot と data-slot を枠自身に持たせることで、Visual Stage のスラブ判定と差し込みの入口を保つ。
export function createDiagramFrameHtml(index: number, isVisual: boolean, curve: string | null = null): string {
  const cardClass = isVisual ? `exhibition-diagram-card infographic-bg-${state.infographicStyle}` : 'diagram-frame';
  const headerClass = isVisual ? 'exhibition-diagram-header' : 'diagram-frame-header';
  const viewportClass = isVisual ? 'exhibition-viewport' : 'diagram-viewport';
  const badgeLabel = isVisual ? `INFOGRAPHIC // 0${index + 1}` : `DIAGRAM 0${index + 1}`;
  const curvePicker = curve
    ? `<div class="pill-container mr-1.5" role="group" aria-label="${t('curve.groupAria')}">${Object.keys(CURVE_LABELS).map(key =>
        `<button type="button" data-curve="${key}" data-index="${index}" aria-pressed="${key === curve}" class="edge-curve-btn pill-btn text-[10px]${key === curve ? ' is-active' : ''}">${t(`curve.${key}` as any)}</button>`).join('')}</div>`
    : '';

  return `<div id="diagram-frame-${index}" class="${cardClass} lucivo-slot" data-slot="${index}"><div class="${headerClass}"><div class="flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full ${isVisual ? 'bg-amber-500 shadow-sm' : 'bg-blue-500'}"></span><span class="font-mono text-[11px] font-bold tracking-wider" style="color: var(--text-primary);">${badgeLabel}</span></div><div class="flex items-center gap-1">${curvePicker}${scalePickerHtml(index)}<button type="button" data-action="png" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">PNG</button><button type="button" data-action="svg" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">SVG</button><button type="button" data-action="zoom" data-index="${index}" class="text-[11px] font-bold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer">Expand</button></div></div><div class="${viewportClass} is-scale-fit" data-stage-index="${index}"></div></div>`;
}

// curve: 矢印の形状を選べる図ではその形状、選べない図では null（DD-EDGE-010）
export function createDiagramCard(index, svgHtml, isRendering, isVisual, curve = null) {
  const content = isRendering ? diagramPlaceholderHtml(index) : svgHtml;
  const frame = createDiagramFrameHtml(index, isVisual, curve);
  const marker = `data-stage-index="${index}">`;
  const pos = frame.indexOf(marker);
  if (pos < 0) return frame;
  const insertAt = pos + marker.length;
  return frame.slice(0, insertAt) + content + frame.slice(insertAt);
}

/* ==========================================================================
   Visual Stage 展示レイアウト構築
   ========================================================================== */
// 記述パターン別の雛形の判定（FR-016, DD-VTPL-001）。els: スラブの本文要素（h2・フロントマター・図を除く）。
