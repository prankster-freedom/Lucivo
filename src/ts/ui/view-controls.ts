// @ts-nocheck
// ビュー制御・モード／スタイル／トーン／レイアウト切替・Split リサイザー・URL 状態同期（FR-001〜004, FR-052, FR-061）
import { hexToRgba, mixHex, pickContrastInk } from '../utils/color';
import { showToast } from './toast';
import { trackWebEvent } from './analytics';
import { parseDisplayStateParams, syncBrowserUrl } from './url-loader';
import { ensureStyleFont } from './style-fonts';
import { setupMermaid } from '../diagram/mermaid-config';
import { updateAllSlabSplits } from '../diagram/svg-postprocess';
import {
  VISUAL_STYLE_KEYS,
  COLOR_TONES,
  VISUAL_LAYOUTS,
  getToneEntry,
  getToneLabel,
  getLayoutLabel,
  getEffectiveVisualPalette,
  state,
  runtime
} from './state';
import { getLang, setLang, t } from '../i18n';

// モードの切替ボタンの選択状態と、スタイルバーの表示を揃える。
// スタイルバーは Visualモードの配色・装飾にしか効かないため、Visualモードのときだけ表示する（DD-DIAG-063）
export function syncStageModeUi(isVisual: boolean) {
  document.getElementById('btn-mode-fast')?.classList.toggle('is-active', !isVisual);
  document.getElementById('btn-visual-mode')?.classList.toggle('is-active', isVisual);
  document.getElementById('style-bar')?.classList.toggle('is-hidden', !isVisual);
  if (!isVisual) {
    setToneMenuOpen(false);
    setLayoutMenuOpen(false);
  }
}

export function applyToneToVisualStage(visContainer: Element | null) {
  const containerEl = visContainer as HTMLElement | null;
  const wrap = visContainer?.querySelector('.exhibition-wrap') as HTMLElement | null;
  if (!wrap || !containerEl) return;
  wrap.classList.toggle('is-single-page', state.visualLayout === 'single');
  const hasCustomTone = Boolean(state.tone && state.tone !== 'default');
  wrap.classList.toggle('has-custom-tone', hasCustomTone);
  const palette = getEffectiveVisualPalette(state.infographicStyle, state.appearance);
  // 各アクセント色（c1〜c4）上の文字色を WCAG コントラスト比に基づいて自動設定する（#258, #260）
  palette.slice(0, 4).forEach((hex, idx) => {
    wrap.style.setProperty(`--vs-c${idx + 1}-ink`, pickContrastInk(hex));
  });
  if (state.tone && state.tone !== 'default') {
    const entry = getToneEntry(state.tone);
    const isDark = state.appearance === 'dark';
    const mode = isDark ? entry.dark : entry.light;
    containerEl.style.setProperty('--vs-stage-bg', mode.canvasBg);
    wrap.style.setProperty('--vs-c1', mode.c1);
    wrap.style.setProperty('--vs-c2', mode.c2);
    wrap.style.setProperty('--vs-c3', mode.c3);
    wrap.style.setProperty('--vs-c4', mode.c4);
    wrap.style.setProperty('--vs-glow', mode.glow);
    wrap.style.setProperty('--vs-slab-bg', mode.cardBg);
    wrap.style.setProperty(
      '--vs-card-bg',
      isDark ? mixHex(mode.cardBg, mode.canvasBg, 0.35) : mixHex(mode.cardBg, '#FFFFFF', 0.4)
    );
    wrap.style.setProperty('--vs-card-border', hexToRgba(mode.edge, isDark ? 0.42 : 0.24));
    wrap.style.setProperty('--vs-line', mode.edge);
  } else {
    containerEl.style.removeProperty('--vs-stage-bg');
    [
      '--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-glow',
      '--vs-slab-bg', '--vs-card-bg', '--vs-card-border', '--vs-line'
    ].forEach(v => wrap.style.removeProperty(v));
  }
}

export function renderSwatchDotsHtml(colors: string[]) {
  return colors.slice(0, 4).map(c => `<span class="tone-swatch-dot" style="background:${c};"></span>`).join('');
}

export function syncToneUi() {
  const labelEl = document.getElementById('active-tone-name');
  if (labelEl) labelEl.textContent = getToneLabel(state.tone);
  const swatchEl = document.getElementById('active-tone-swatches');
  if (swatchEl) {
    const colors = getEffectiveVisualPalette(state.infographicStyle, state.appearance);
    swatchEl.innerHTML = renderSwatchDotsHtml(colors);
  }
  document.querySelectorAll('#tone-menu .tone-menu-item').forEach(btn => {
    const toneId = btn.getAttribute('data-tone-id') || 'default';
    const active = toneId === state.tone;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
    const lbl = btn.querySelector('.tone-menu-label');
    if (lbl) lbl.textContent = getToneLabel(toneId);
  });
}

export function setToneMenuOpen(open: boolean) {
  const btn = document.getElementById('btn-tone-menu');
  const menu = document.getElementById('tone-menu');
  if (!btn || !menu) return;
  if (open) {
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.left = `${Math.max(8, Math.round(Math.min(rect.left, window.innerWidth - 236)))}px`;
  }
  menu.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function selectTone(toneId: string) {
  state.tone = toneId;
  setToneMenuOpen(false);
  syncToneUi();
  setupMermaid();
  runtime.renderApp();
  syncUrlFromState();
  trackWebEvent('tone_select', { tone: toneId });
  showToast(t('toast.toneApplied', { label: getToneLabel(toneId) }));
}

export function syncLayoutUi() {
  const labelEl = document.getElementById('active-layout-name');
  if (labelEl) labelEl.textContent = getLayoutLabel(state.visualLayout);
  document.querySelectorAll('#layout-menu .tone-menu-item').forEach(btn => {
    const layoutId = btn.getAttribute('data-layout-id') || 'page';
    const active = layoutId === state.visualLayout;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
    const lbl = btn.querySelector('.tone-menu-label');
    if (lbl) lbl.textContent = getLayoutLabel(layoutId);
  });
}

export function setLayoutMenuOpen(open: boolean) {
  const btn = document.getElementById('btn-layout-menu');
  const menu = document.getElementById('layout-menu');
  if (!btn || !menu) return;
  if (open) {
    setToneMenuOpen(false);
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.left = `${Math.max(8, Math.round(Math.min(rect.left, window.innerWidth - 236)))}px`;
  }
  menu.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

export function selectVisualLayout(layoutId: string) {
  const next = layoutId === 'single' ? 'single' : 'page';
  state.visualLayout = next;
  setLayoutMenuOpen(false);
  syncLayoutUi();
  applyToneToVisualStage(document.getElementById('visual-stage-container'));
  if (state.isVisualMode) {
    updateAllSlabSplits(document.getElementById('visual-stage-container'));
  }
  syncUrlFromState();
  showToast(t('toast.layoutApplied', { label: getLayoutLabel(next) }));
}

export function setStageMode(isVisual: boolean) {
  if (state.isVisualMode === isVisual) return;
  state.isVisualMode = isVisual;
  syncStageModeUi(isVisual);
  if (isVisual) {
    showToast(t('toast.visualModeOn'));
  } else {
    showToast(t('toast.fastModeOn'));
  }
  runtime.renderApp();
  syncUrlFromState();
  if (isVisual) void ensureStyleFont(state.infographicStyle);
}

export function selectInfographicStyle(style: string) {
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
  syncToneUi();
  runtime.renderApp();
  syncUrlFromState();
  trackWebEvent('design_style_select', { design_style: style });
  void ensureStyleFont(style);
  const activeBtn = document.querySelector(`.info-style-btn[data-info-style="${style}"]`);
  showToast(t('toast.styleApplied', { label: activeBtn ? activeBtn.textContent.trim() : style }));
}

function setupSplitResizer(applySplitRatio: (pct: number, persist?: boolean) => number) {
  const resizer = document.getElementById('split-resizer');
  if (!resizer) return;
  let dragging = false;
  const updateFromClientPos = (clientX: number, clientY: number) => {
    const paneEditor = document.getElementById('pane-editor');
    const panePreview = document.getElementById('pane-preview');
    if (!paneEditor || !panePreview) return;
    const edRect = paneEditor.getBoundingClientRect();
    const pvRect = panePreview.getBoundingClientRect();
    if (window.innerWidth >= 1024) {
      const total = pvRect.right - edRect.left;
      if (total > 0) applySplitRatio(((clientX - edRect.left) / total) * 100);
    } else {
      const total = pvRect.bottom - edRect.top;
      if (total > 0) applySplitRatio(((clientY - edRect.top) / total) * 100);
    }
  };
  resizer.addEventListener('pointerdown', (e: PointerEvent) => {
    if (state.viewMode !== 'split') return;
    e.preventDefault();
    dragging = true;
    resizer.classList.add('is-dragging');
    document.body.classList.add('is-split-dragging');
    resizer.setPointerCapture(e.pointerId);
  });
  resizer.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragging) updateFromClientPos(e.clientX, e.clientY);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('is-dragging');
    document.body.classList.remove('is-split-dragging');
    if (state.isVisualMode) updateAllSlabSplits(document.getElementById('visual-stage-container'));
  };
  resizer.addEventListener('pointerup', endDrag);
  resizer.addEventListener('pointercancel', endDrag);
  resizer.addEventListener('keydown', (e: KeyboardEvent) => {
    if (state.viewMode !== 'split') return;
    const step = e.shiftKey ? 5 : 2;
    const delta = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -step : (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? step : 0;
    if (!delta) return;
    e.preventDefault();
    const cur = parseFloat(document.getElementById('pane-editor')?.style.getPropertyValue('--split-editor-pct') || '40') || 40;
    applySplitRatio(cur + delta);
    if (state.isVisualMode) updateAllSlabSplits(document.getElementById('visual-stage-container'));
  });
}

export function setupViewModeControls() {
  const SPLIT_RATIO_KEY = 'lucivo:splitRatio';
  const clampSplitPct = (pct: number) => Math.min(80, Math.max(20, Math.round(pct * 10) / 10));

  const applySplitRatio = (pct: number, persist = true) => {
    const clamped = clampSplitPct(pct);
    const paneEditor = document.getElementById('pane-editor');
    if (paneEditor) paneEditor.style.setProperty('--split-editor-pct', `${clamped}%`);
    if (persist) {
      try { localStorage.setItem(SPLIT_RATIO_KEY, String(clamped)); } catch (_) {}
    }
    return clamped;
  };

  const setViewMode = (mode: string) => {
    state.viewMode = mode;
    document.querySelectorAll('.view-mode-btn').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-view-mode') === mode);
    });
    const mobileLabel = document.getElementById('mobile-view-label');
    if (mobileLabel) {
      mobileLabel.textContent = mode === 'canvas' ? 'Canvas' : mode === 'editor' ? 'Code' : 'Split';
    }

    const paneEditor = document.getElementById('pane-editor');
    const panePreview = document.getElementById('pane-preview');
    const resizer = document.getElementById('split-resizer');

    if (mode === 'split') {
      paneEditor.classList.remove('hidden');
      panePreview.classList.remove('hidden');
      resizer?.classList.remove('hidden');
      paneEditor.className = 'is-split w-full lg:w-[40%] h-[42%] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r shrink-0 z-10';
    } else if (mode === 'canvas') {
      paneEditor.classList.add('hidden');
      panePreview.classList.remove('hidden');
      resizer?.classList.add('hidden');
    } else if (mode === 'editor') {
      paneEditor.classList.remove('hidden');
      panePreview.classList.add('hidden');
      resizer?.classList.add('hidden');
      paneEditor.className = 'w-full h-full flex flex-col shrink-0 z-10';
    }
    if (state.isVisualMode && mode !== 'editor') {
      updateAllSlabSplits(document.getElementById('visual-stage-container'));
    }
    syncUrlFromState();
  };
  runtime.applyViewModeFn = setViewMode;

  try {
    const savedRatio = Number(localStorage.getItem(SPLIT_RATIO_KEY));
    if (Number.isFinite(savedRatio) && savedRatio >= 20 && savedRatio <= 80) {
      applySplitRatio(savedRatio, false);
    }
  } catch (_) {}

  document.querySelectorAll('.view-mode-btn').forEach((btn: any) => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-view-mode');
      if (mode) setViewMode(mode);
    };
  });

  setupSplitResizer(applySplitRatio);
  setViewMode(window.innerWidth < 1024 ? 'canvas' : 'split');
}

export function syncUrlFromState() {
  if (!runtime.urlSyncReady) return;
  if (document.documentElement.classList.contains('is-stage-show')) return;
  // 人へリンクを共有した際に画面幅の違いで view=canvas 等が落ちないよう、既定値は常に 'split' 基準とする（#307）
  syncBrowserUrl({ ...state, lang: getLang() }, runtime.currentRemoteUrl, 'split');
}

export function applyInitialDisplayStateFromUrl() {
  const params = parseDisplayStateParams(
    window.location.search,
    window.location.hash,
    VISUAL_STYLE_KEYS,
    COLOR_TONES.map(t => t.id)
  );
  if (params.lang) {
    setLang(params.lang, { persist: false, notify: false });
  }
  if (params.appearance) {
    state.appearance = params.appearance;
    document.body.setAttribute('data-appearance', state.appearance);
    const appFavicon = document.getElementById('app-favicon');
    if (appFavicon) appFavicon.setAttribute('href', `./assets/logos/${state.appearance}/favicon.svg`);
    document.getElementById('icon-sun')?.classList.toggle('hidden', state.appearance === 'dark');
    document.getElementById('icon-moon')?.classList.toggle('hidden', state.appearance !== 'dark');
  }
  if (params.infographicStyle) {
    state.infographicStyle = params.infographicStyle;
    document.querySelectorAll('.info-style-btn').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-info-style') === state.infographicStyle);
    });
  }
  if (typeof params.isVisualMode === 'boolean') {
    state.isVisualMode = params.isVisualMode;
    syncStageModeUi(state.isVisualMode);
    if (state.isVisualMode) void ensureStyleFont(state.infographicStyle);
  }
  if (params.tone) {
    state.tone = params.tone;
  }
  if (params.visualLayout) {
    state.visualLayout = params.visualLayout;
    syncLayoutUi();
  }
  if (params.appearance || params.infographicStyle || params.tone) {
    syncToneUi();
  }
  if (params.viewMode && runtime.applyViewModeFn) {
    runtime.applyViewModeFn(params.viewMode);
  }
}
