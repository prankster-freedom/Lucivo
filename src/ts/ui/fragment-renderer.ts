/* ==========================================================================
   描画断片のサニタイズと後処理の共通部品（#287, #289）
   高速モード差分・Visualモード差分・全体フォールバックの 3 経路で、
   サニタイズ設定・図の中身差し込み・後処理順序を 1 か所に統一する。
   ========================================================================== */
import { svgCache } from './state';
import { decorateAlerts } from '../markdown/callouts';
import { wrapTables, resolveFolderImages } from '../markdown/local-images';
import { renderMath } from '../markdown/math-and-headings';
import { renderEmoji } from '../markdown/emoji';
import {
  applyReadableFit,
  createDiagramCard,
  diagramPlaceholderHtml
} from '../diagram/svg-postprocess';

export const SANITIZE_OPTIONS = {
  ADD_TAGS: ['div', 'span', 'strong', 'small'],
  ADD_ATTR: ['class', 'data-slot', 'style']
};

export function sanitizeMarkdownHtml(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, SANITIZE_OPTIONS);
}

export interface FragmentRenderContext {
  isVisual: boolean;
  modeTag: string;
  mermaidBlocks: any[];
  dirtyBlocks: any[];
  cachedKeys: Map<number, string>;
  syncMathEmoji?: boolean;
  bindInteractions?: (scope: HTMLElement, rootContainer?: HTMLElement) => void;
  rootContainer?: HTMLElement;
}

/**
 * 文字列段階で出力された図の枠（.lucivo-slot）のビューポートに、
 * キャッシュ済み SVG または描画待ちプレースホルダを差し込む（#287）。
 * 枠が未展開のレガシースロットだった場合のみ outerHTML でフォールバックする。
 */
export function hydrateDiagramSlots(scope: ParentNode, ctx: FragmentRenderContext): void {
  const slots = scope.querySelectorAll('.lucivo-slot');
  slots.forEach(slot => {
    const idx = parseInt(slot.getAttribute('data-slot') || '', 10);
    const block = ctx.mermaidBlocks[idx];
    if (!block) return;
    const cacheKey = `${block.hash}-${ctx.modeTag}`;
    const hasCache = svgCache.has(cacheKey);
    const vp = slot.querySelector(`[data-stage-index="${idx}"]`) as HTMLElement | null;
    if (vp) {
      vp.innerHTML = hasCache ? svgCache.get(cacheKey) : diagramPlaceholderHtml(idx);
    } else {
      slot.outerHTML = createDiagramCard(idx, hasCache ? svgCache.get(cacheKey) : '', !hasCache, ctx.isVisual, block.curve);
    }
    if (hasCache) {
      ctx.cachedKeys.set(idx, cacheKey);
    } else {
      ctx.dirtyBlocks.push({ ...block, modeTag: ctx.modeTag, cacheKey });
    }
  });
}

/**
 * DOM 接続前（または全体差し替え直後）の断片に対して、決まった順で後処理を行う（#289）。
 */
export function postProcessDetachedFragment(scope: HTMLElement, ctx: FragmentRenderContext): void {
  if (!ctx.isVisual) decorateAlerts(scope);
  wrapTables(scope);
  if (ctx.syncMathEmoji) {
    if (window.katex) renderMath(scope);
    if (window.LucivoEmoji) renderEmoji(scope);
  }
  hydrateDiagramSlots(scope, ctx);
  if (ctx.bindInteractions) {
    ctx.bindInteractions(scope, ctx.rootContainer);
  }
}

export interface ConnectedScopeContext {
  cachedKeys: Map<number, string>;
  fitRoot: HTMLElement;
  forceMathEmoji?: boolean;
}

/**
 * DOM に接続されたあとの範囲に対して、画像・未読込の数式/絵文字・図の Fit 計算を行う（#289）。
 */
export function postProcessConnectedScope(scope: HTMLElement, ctx: ConnectedScopeContext): void {
  resolveFolderImages(scope);
  if (ctx.forceMathEmoji || !window.katex) renderMath(scope);
  if (ctx.forceMathEmoji || !window.LucivoEmoji) renderEmoji(scope);
  ctx.cachedKeys.forEach((cacheKey, idx) => {
    applyReadableFit(ctx.fitRoot.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
  });
}
