/* ==========================================================================
   Structurizr DOM コントローラ（ARC-STR-005〜007）
   ・ビュー切替 UI（単一ビュー時は非表示、多数ビュー時は select）
   ・階層ドリルダウン＋パンくず戻り導線
   ・未対応構文の警告バッジ＋詳細展開
   ・2 層印刷コンテナ（バックグラウンド事前レンダリング＋ensureAllViewsRendered）
   ・Expand モーダル内ビュー切替・ドリルダウン連携
   ========================================================================== */
import { escapeHtml } from '../../utils/escape';
import { fnv1aHash } from '../../utils/hash';
import { parseStructurizrDsl } from './parser';
import { resolveAllStructurizrViews } from './view-resolver';
import { computeViewLayout } from './layout/layout-engine';
import { ElkLayoutEngine } from './layout/elk-layout';
import { renderStructurizrSvg } from './renderer/svg-renderer';
import { cloneSvgWithInlineStyles } from './renderer/theme-adapter';
import {
  StructurizrSyntaxError,
  type ParseWarning,
  type ResolvedView,
  type StructurizrWorkspace,
  type ViewLayout
} from './types';

export interface MountStructurizrOptions {
  frameEl: HTMLElement;
  viewportEl: HTMLElement;
  code: string;
  initialViewKey?: string;
  isVisual: boolean;
  onRendered?: (svgEl: SVGSVGElement, viewKey: string) => void;
}

export interface StageViewSummary {
  title: string;
  key: string;
  index: number;
  total: number;
}

const elkEngine = new ElkLayoutEngine();
const layoutCache = new Map<string, ViewLayout>();
const LAYOUT_CACHE_MAX = 200;

function getCachedLayout(key: string): ViewLayout | undefined {
  return layoutCache.get(key);
}

function setCachedLayout(key: string, layout: ViewLayout): void {
  if (layoutCache.size >= LAYOUT_CACHE_MAX) {
    const oldest = layoutCache.keys().next().value;
    if (oldest !== undefined) layoutCache.delete(oldest);
  }
  layoutCache.set(key, layout);
}

function isEn(): boolean {
  return typeof document !== 'undefined' && document.documentElement.lang === 'en';
}

function uiText(ja: string, en: string): string {
  return isEn() ? en : ja;
}

function scheduleIdle(fn: () => void): void {
  const ric = (window as any).requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => fn(), { timeout: 600 });
  } else {
    setTimeout(fn, 16);
  }
}

export class StructurizrBlockController {
  readonly frameEl: HTMLElement;
  readonly viewportEl: HTMLElement;
  private readonly codeHash: string;
  private readonly workspace: StructurizrWorkspace;
  readonly views: ResolvedView[];
  private readonly warnings: ParseWarning[];
  private readonly onRendered?: (svgEl: SVGSVGElement, viewKey: string) => void;
  private activeViewIndex = 0;
  private readonly navHistory: number[] = [];
  private readonly renderedSvgs = new Map<string, string>();
  private readonly viewBarEl: HTMLElement;
  private readonly printAllEl: HTMLElement;
  private warningsOpen = false;
  private printAllPromise: Promise<void> | null = null;
  private destroyed = false;

  constructor(options: MountStructurizrOptions) {
    this.frameEl = options.frameEl;
    this.viewportEl = options.viewportEl;
    this.codeHash = fnv1aHash(options.code);
    this.onRendered = options.onRendered;

    this.workspace = parseStructurizrDsl(options.code);
    this.views = resolveAllStructurizrViews(this.workspace);
    this.warnings = [...this.workspace.warnings];

    this.activeViewIndex = this.resolveInitialViewIndex(options.initialViewKey);
    this.frameEl.classList.add('lucivo-structurizr-card');

    this.viewBarEl = this.ensureChildElement('.lucivo-structurizr-bar', () => {
      const el = document.createElement('div');
      el.className = 'lucivo-structurizr-bar';
      this.frameEl.insertBefore(el, this.viewportEl);
      return el;
    });

    this.printAllEl = this.ensureChildElement('.lucivo-structurizr-print-all', () => {
      const el = document.createElement('div');
      el.className = 'lucivo-structurizr-print-all';
      this.frameEl.appendChild(el);
      return el;
    });

    this.renderToolbar();
  }

  private ensureChildElement(selector: string, factory: () => HTMLElement): HTMLElement {
    const existing = this.frameEl.querySelector(`:scope > ${selector}`) as HTMLElement | null;
    if (existing) return existing;
    return factory();
  }

  private resolveInitialViewIndex(initialViewKey?: string): number {
    if (initialViewKey) {
      const exact = this.views.findIndex(v => v.spec.key === initialViewKey);
      if (exact >= 0) return exact;
      const ci = this.views.findIndex(v => v.spec.key.toLowerCase() === initialViewKey.toLowerCase());
      if (ci >= 0) return ci;
      this.warnings.push({
        line: 1,
        column: 1,
        code: 'VIEW_NOT_FOUND',
        message: uiText(
          `指定された初期ビュー "${initialViewKey}" が見つからないため先頭ビューを表示します`,
          `Initial view "${initialViewKey}" was not found; showing the first view`
        )
      });
    }
    const defIdx = this.views.findIndex(v => v.spec.isDefault);
    return defIdx >= 0 ? defIdx : 0;
  }

  getActiveView(): ResolvedView {
    return this.views[this.activeViewIndex] || this.views[0];
  }

  getSummary(): StageViewSummary {
    const view = this.getActiveView();
    return {
      title: view.title,
      key: view.spec.key,
      index: this.activeViewIndex,
      total: this.views.length
    };
  }

  async renderViewSvg(view: ResolvedView): Promise<string> {
    const existing = this.renderedSvgs.get(view.spec.key);
    if (existing) return existing;

    const cacheKey = `${this.codeHash}:${view.spec.key}`;
    let layout = getCachedLayout(cacheKey);
    if (!layout) {
      layout = await computeViewLayout(view, this.workspace.styles, elkEngine);
      setCachedLayout(cacheKey, layout);
    }
    const svg = renderStructurizrSvg(view, layout, this.workspace.styles);
    this.renderedSvgs.set(view.spec.key, svg);
    return svg;
  }

  async mountInitial(): Promise<void> {
    await this.showViewByIndex(this.activeViewIndex, false);
    this.scheduleBackgroundPrintPrerender();
  }

  async selectViewByKey(viewKey: string, pushHistory = false): Promise<boolean> {
    const nextIdx = this.views.findIndex(v => v.spec.key === viewKey);
    if (nextIdx < 0) return false;
    await this.showViewByIndex(nextIdx, pushHistory);
    return true;
  }

  async stepView(delta: number): Promise<StageViewSummary> {
    if (this.views.length <= 1) return this.getSummary();
    const nextIdx = (this.activeViewIndex + delta + this.views.length) % this.views.length;
    this.navHistory.length = 0;
    await this.showViewByIndex(nextIdx, false);
    return this.getSummary();
  }

  async goBack(): Promise<boolean> {
    const prevIdx = this.navHistory.pop();
    if (prevIdx === undefined) return false;
    await this.showViewByIndex(prevIdx, false);
    return true;
  }

  private async showViewByIndex(index: number, pushHistory: boolean): Promise<void> {
    if (this.destroyed) return;
    if (pushHistory && index !== this.activeViewIndex) {
      this.navHistory.push(this.activeViewIndex);
    }
    this.activeViewIndex = index;
    const view = this.getActiveView();
    const svgMarkup = await this.renderViewSvg(view);
    if (this.destroyed || !this.viewportEl.isConnected) return;

    this.viewportEl.innerHTML = svgMarkup;
    this.renderToolbar();

    const svgEl = this.viewportEl.querySelector(':scope > svg') as SVGSVGElement | null;
    if (svgEl) {
      this.bindDrillDownEvents(svgEl, key => {
        void this.selectViewByKey(key, true);
      });
      if (this.onRendered) {
        this.onRendered(svgEl, view.spec.key);
      }
    }
  }

  bindDrillDownEvents(svgEl: SVGSVGElement, onDrillDown: (viewKey: string) => void): void {
    svgEl.querySelectorAll('.c4-drilldown-badge[data-drilldown-view]').forEach(badge => {
      badge.addEventListener('click', ev => {
        ev.stopPropagation();
        const key = badge.getAttribute('data-drilldown-view');
        if (key) onDrillDown(key);
      });
      badge.addEventListener('keydown', (ev: Event) => {
        const ke = ev as KeyboardEvent;
        if (ke.key === 'Enter' || ke.key === ' ') {
          ke.preventDefault();
          ke.stopPropagation();
          const key = badge.getAttribute('data-drilldown-view');
          if (key) onDrillDown(key);
        }
      });
    });

    svgEl.querySelectorAll('.c4-node[data-drilldown-view]').forEach(node => {
      node.addEventListener('dblclick', ev => {
        ev.stopPropagation();
        const key = node.getAttribute('data-drilldown-view');
        if (key) onDrillDown(key);
      });
    });
  }

  private renderToolbar(): void {
    const showTabs = this.views.length > 1;
    const showBack = this.navHistory.length > 0;
    const showWarn = this.warnings.length > 0;

    if (!showTabs && !showBack && !showWarn) {
      this.viewBarEl.innerHTML = '';
      this.viewBarEl.classList.add('hidden');
      return;
    }

    this.viewBarEl.classList.remove('hidden');
    const parts: string[] = [];

    if (showBack) {
      const parentView = this.views[this.navHistory[this.navHistory.length - 1]];
      const backLabel = parentView
        ? uiText(`戻る: ${parentView.title}`, `Back: ${parentView.title}`)
        : uiText('前のビューへ戻る', 'Back to parent view');
      parts.push(`<button type="button" class="c4-breadcrumb-btn" data-c4-back="true">← ${escapeHtml(backLabel)}</button>`);
    }

    if (showTabs) {
      if (this.views.length <= 5) {
        const tabs = this.views.map((v, idx) => {
          const active = idx === this.activeViewIndex;
          return `<button type="button" role="tab" aria-selected="${active}" class="c4-view-tab${active ? ' is-active' : ''}" data-c4-view-idx="${idx}">${escapeHtml(v.title)}</button>`;
        }).join('');
        parts.push(`<div class="c4-view-tabs" role="tablist" aria-label="${escapeHtml(uiText('Structurizr ビュー切替', 'Structurizr views'))}">${tabs}</div>`);
      } else {
        const opts = this.views.map((v, idx) =>
          `<option value="${idx}"${idx === this.activeViewIndex ? ' selected' : ''}>${escapeHtml(v.title)} (${escapeHtml(v.subtitle)})</option>`
        ).join('');
        parts.push(`<select class="c4-view-select" aria-label="${escapeHtml(uiText('Structurizr ビュー選択', 'Select Structurizr view'))}">${opts}</select>`);
      }
    }

    if (showWarn) {
      const warnLabel = uiText(`未対応構文 (${this.warnings.length})`, `Warnings (${this.warnings.length})`);
      const listHtml = this.warningsOpen
        ? `<div class="c4-warning-panel" role="region">${this.warnings.map(w =>
            `<div class="c4-warning-item"><span class="c4-warning-loc">L${w.line}:${w.column}</span><span>${escapeHtml(w.message)}</span></div>`
          ).join('')}</div>`
        : '';
      parts.push(
        `<div class="c4-warning-wrap">`
        + `<button type="button" class="c4-warning-badge" data-c4-warn-toggle="true" aria-expanded="${this.warningsOpen}">⚠ ${escapeHtml(warnLabel)}</button>`
        + `${listHtml}</div>`
      );
    }

    this.viewBarEl.innerHTML = parts.join('');
    this.bindToolbarEvents();
  }

  private bindToolbarEvents(): void {
    const backBtn = this.viewBarEl.querySelector('[data-c4-back]') as HTMLButtonElement | null;
    if (backBtn) {
      backBtn.onclick = ev => {
        ev.stopPropagation();
        void this.goBack();
      };
    }

    this.viewBarEl.querySelectorAll('[data-c4-view-idx]').forEach(btn => {
      (btn as HTMLButtonElement).onclick = ev => {
        ev.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-c4-view-idx') || '0', 10);
        if (!Number.isNaN(idx)) {
          this.navHistory.length = 0;
          void this.showViewByIndex(idx, false);
        }
      };
    });

    const selectEl = this.viewBarEl.querySelector('.c4-view-select') as HTMLSelectElement | null;
    if (selectEl) {
      selectEl.onchange = () => {
        const idx = parseInt(selectEl.value, 10);
        if (!Number.isNaN(idx)) {
          this.navHistory.length = 0;
          void this.showViewByIndex(idx, false);
        }
      };
    }

    const warnBtn = this.viewBarEl.querySelector('[data-c4-warn-toggle]') as HTMLButtonElement | null;
    if (warnBtn) {
      warnBtn.onclick = ev => {
        ev.stopPropagation();
        this.warningsOpen = !this.warningsOpen;
        this.renderToolbar();
      };
    }
  }

  private scheduleBackgroundPrintPrerender(): void {
    if (this.printAllPromise) return;
    this.printAllPromise = new Promise<void>(resolve => {
      const renderAll = async () => {
        try {
          await this.populatePrintAllContainer();
        } finally {
          resolve();
        }
      };
      scheduleIdle(() => { void renderAll(); });
    });
  }

  private async populatePrintAllContainer(): Promise<void> {
    if (this.destroyed || !this.printAllEl.isConnected) return;
    const items: string[] = [];
    for (const view of this.views) {
      if (this.destroyed) return;
      const svg = await this.renderViewSvg(view);
      items.push(
        `<figure class="lucivo-structurizr-print-item" data-print-view-key="${escapeHtml(view.spec.key)}">`
        + `<figcaption class="lucivo-structurizr-print-caption">`
        + `<span class="lucivo-structurizr-print-title">${escapeHtml(view.title)}</span>`
        + `<span class="lucivo-structurizr-print-kind">${escapeHtml(view.subtitle)}</span>`
        + `</figcaption>${svg}</figure>`
      );
    }
    if (!this.destroyed && this.printAllEl.isConnected) {
      this.printAllEl.innerHTML = items.join('');
    }
  }

  async ensureAllViewsRendered(): Promise<void> {
    if (this.printAllEl.querySelectorAll('.lucivo-structurizr-print-item').length === this.views.length) {
      return;
    }
    await this.populatePrintAllContainer();
  }

  async mountExpandModalBar(
    modalBarHost: HTMLElement,
    zoomCanvas: HTMLElement,
    onSvgUpdated: (svgEl: SVGSVGElement) => void
  ): Promise<void> {
    let modalIdx = this.activeViewIndex;
    const modalHistory: number[] = [];

    const renderModalView = async (idx: number, pushHist: boolean) => {
      if (pushHist && idx !== modalIdx) modalHistory.push(modalIdx);
      modalIdx = idx;
      const view = this.views[modalIdx] || this.views[0];
      const svgMarkup = await this.renderViewSvg(view);
      zoomCanvas.innerHTML = svgMarkup;
      const svgEl = zoomCanvas.querySelector('svg') as SVGSVGElement | null;
      if (svgEl) {
        this.bindDrillDownEvents(svgEl, key => {
          const targetIdx = this.views.findIndex(v => v.spec.key === key);
          if (targetIdx >= 0) void renderModalView(targetIdx, true);
        });
        onSvgUpdated(svgEl);
      }
      renderBar();
    };

    const renderBar = () => {
      if (this.views.length <= 1 && modalHistory.length === 0) {
        modalBarHost.innerHTML = '';
        modalBarHost.classList.add('hidden');
        return;
      }
      modalBarHost.classList.remove('hidden');
      const parts: string[] = [];
      if (modalHistory.length > 0) {
        const prev = this.views[modalHistory[modalHistory.length - 1]];
        parts.push(`<button type="button" class="c4-breadcrumb-btn" data-modal-back="true">← ${escapeHtml(prev?.title || uiText('戻る', 'Back'))}</button>`);
      }
      if (this.views.length > 1) {
        const tabs = this.views.map((v, idx) =>
          `<button type="button" class="c4-view-tab${idx === modalIdx ? ' is-active' : ''}" data-modal-view-idx="${idx}">${escapeHtml(v.title)}</button>`
        ).join('');
        parts.push(`<div class="c4-view-tabs">${tabs}</div>`);
      }
      modalBarHost.innerHTML = parts.join('');
      const backBtn = modalBarHost.querySelector('[data-modal-back]') as HTMLButtonElement | null;
      if (backBtn) {
        backBtn.onclick = () => {
          const prev = modalHistory.pop();
          if (prev !== undefined) void renderModalView(prev, false);
        };
      }
      modalBarHost.querySelectorAll('[data-modal-view-idx]').forEach(btn => {
        (btn as HTMLButtonElement).onclick = () => {
          const nextIdx = parseInt(btn.getAttribute('data-modal-view-idx') || '0', 10);
          if (!Number.isNaN(nextIdx)) {
            modalHistory.length = 0;
            void renderModalView(nextIdx, false);
          }
        };
      });
    };

    await renderModalView(this.activeViewIndex, false);
  }

  destroy(): void {
    this.destroyed = true;
  }
}

const controllersByFrame = new WeakMap<HTMLElement, StructurizrBlockController>();
const activeControllers = new Set<StructurizrBlockController>();

function pruneDisconnectedControllers(): void {
  for (const ctrl of activeControllers) {
    if (!ctrl.frameEl.isConnected) {
      ctrl.destroy();
      activeControllers.delete(ctrl);
    }
  }
}

export async function mountStructurizrBlock(options: MountStructurizrOptions): Promise<StructurizrBlockController | null> {
  pruneDisconnectedControllers();
  const prev = controllersByFrame.get(options.frameEl);
  if (prev) {
    prev.destroy();
    activeControllers.delete(prev);
  }

  try {
    const controller = new StructurizrBlockController(options);
    controllersByFrame.set(options.frameEl, controller);
    activeControllers.add(controller);
    await controller.mountInitial();
    return controller;
  } catch (err) {
    const existingBar = options.frameEl.querySelector(':scope > .lucivo-structurizr-bar');
    if (existingBar) existingBar.innerHTML = '';
    const existingPrint = options.frameEl.querySelector(':scope > .lucivo-structurizr-print-all');
    if (existingPrint) existingPrint.innerHTML = '';

    if (err instanceof StructurizrSyntaxError) {
      const title = uiText(`Structurizr 構文エラー（${err.line} 行目 ${err.column} 列目）`, `Structurizr syntax error (line ${err.line}, col ${err.column})`);
      options.viewportEl.innerHTML = `<div class="c4-error-panel" role="alert"><div class="c4-error-title">${escapeHtml(title)}</div><div class="c4-error-detail">${escapeHtml(err.message)}</div></div>`;
    } else {
      const msg = err instanceof Error ? err.message : String(err);
      const title = uiText('Structurizr 図の描画に失敗しました', 'Failed to render Structurizr diagram');
      options.viewportEl.innerHTML = `<div class="c4-error-panel" role="alert"><div class="c4-error-title">${escapeHtml(title)}</div><div class="c4-error-detail">${escapeHtml(msg)}</div></div>`;
    }
    return null;
  }
}

export function getControllerForFrame(frameEl: HTMLElement | null): StructurizrBlockController | null {
  if (!frameEl) return null;
  return controllersByFrame.get(frameEl) || null;
}

export function findControllerInScope(scopeEl: ParentNode | null): StructurizrBlockController | null {
  if (!scopeEl) return null;
  const activeEl = document.activeElement;
  if (activeEl instanceof HTMLElement) {
    const focusedFrame = activeEl.closest('.lucivo-structurizr-card') as HTMLElement | null;
    if (focusedFrame && (scopeEl as Element).contains?.(focusedFrame)) {
      const ctrl = controllersByFrame.get(focusedFrame);
      if (ctrl && ctrl.views.length > 1) return ctrl;
    }
  }
  const frames = scopeEl.querySelectorAll('.lucivo-structurizr-card');
  for (const frame of Array.from(frames)) {
    const ctrl = controllersByFrame.get(frame as HTMLElement);
    if (ctrl && ctrl.views.length > 1) return ctrl;
  }
  return null;
}

export async function ensureAllStructurizrViewsRendered(): Promise<void> {
  pruneDisconnectedControllers();
  await Promise.all(Array.from(activeControllers).map(ctrl => ctrl.ensureAllViewsRendered()));
}

export function serializeStructurizrExportSvg(svgEl: SVGSVGElement): string {
  const cloned = cloneSvgWithInlineStyles(svgEl);
  return new XMLSerializer().serializeToString(cloned);
}
