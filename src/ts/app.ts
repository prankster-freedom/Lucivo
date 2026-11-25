// @ts-nocheck
// アプリケーションのエントリーポイント（イベント結線・起動初期化・グローバル公開）
import { escapeHtml } from './utils/escape';
import { hexToRgba } from './utils/color';
import { downloadBlob } from './utils/download';
import { showToast } from './ui/toast';
import { initI18n, applyStaticI18n, onLangChange, t, getSampleBaseFileName } from './i18n';
import { applyUpdateCheckState, setupUpdateCheck } from './ui/update-check';
import { registerEscapeHandler, registerShortcutAction, renderShortcutModalList, setupGlobalKeymap } from './ui/keymap';
import { setupDiagramPanZoom, findScrollParent, updatePannable } from './diagram/pan-zoom';
import { scalePickerHtml, setScaleMode, bindScaleMenus, type ScaleAction } from './diagram/scale-mode';
import {
  isModalOpen,
  setModalOpen,
  VISUAL_STYLE_KEYS,
  COLOR_TONES,
  VISUAL_LAYOUTS,
  getEffectiveVisualPalette,
  EMPTY_GUIDE_HTML,
  EXPORT_URLS,
  state,
  svgCache,
  fitCache,
  mathCache,
  loadLibrary,
  runtime
} from './ui/state';
import {
  syncCssTokens,
  setupMermaid
} from './diagram/mermaid-config';
import {
  setupMarkedMath,
  setupMarkedHeadings
} from './markdown/math-and-headings';
import { setupMarkedBlocks } from './markdown/block-renderers';
import {
  ensureSlabVisibilityTracking,
  updateSlabSplit,
  updateAllSlabSplits
} from './diagram/svg-postprocess';
import {
  clearVisualStageSpotlight,
  setupVisualStageInteractions
} from './ui/slab-export';
import { setupSplitTermLinks } from './ui/split-term-links';
import { setupLocalImages } from './markdown/local-images';
import { setupMarkedFootnotes } from './markdown/footnotes';
import { setupMarkedEmoji } from './markdown/emoji';
import {
  closeFileMenu,
  loadBundledSample,
  setupFormatter,
  setupFileMenu,
  setupFileDrop,
  resetToEmptyGuide
} from './ui/file-menu';
import { extractMarkdownUrlFromLocation } from './ui/url-loader';
import { setupFileWatch } from './ui/file-watch';
import {
  renderFolderList,
  updateRecentFolderMenu,
  setupDocumentLinks,
  setupFolder,
  setupFrontMatterToggle,
  setupAnimationToggle,
  setupAmbientEffectsToggle,
  loadMarkdownFromUrlParam
} from './ui/folder-browser';
import { takePresentFromUrl, startPendingPresent } from './ui/present-modes';
import { setupMuseumLightSetting } from './ui/museum-light-setting';
import { hasBundledSamples, sampleFileNameFromRawUrl } from './ui/sample-source';
import {
  PREVIEW_SCROLL_MARGIN,
  scrollBehavior,
  previewScrollTopOf,
  closeShortcutModal,
  toggleShortcutModal,
  scheduleFollow,
  followPreviewClick,
  handleEditorBeforeInput,
  handleEditorInputCaret,
  scrollSection
} from './ui/editor-follow';
import {
  renderSwatchDotsHtml,
  syncToneUi,
  setToneMenuOpen,
  selectTone,
  syncLayoutUi,
  setLayoutMenuOpen,
  syncStyleUi,
  setStyleMenuOpen,
  selectVisualLayout,
  setStageMode,
  selectInfographicStyle,
  setupViewModeControls,
  syncUrlFromState,
  applyInitialDisplayStateFromUrl
} from './ui/view-controls';
import { renderApp } from './ui/render-pipeline';

export { PREVIEW_SCROLL_MARGIN, scrollBehavior, previewScrollTopOf };

function setupKeyboardShortcuts() {
  document.getElementById('shortcut-close-btn')?.addEventListener('click', closeShortcutModal);

  registerEscapeHandler('modals', 70, () => {
    if (isModalOpen('shortcut-modal')) {
      closeShortcutModal();
      return true;
    }
    if (isModalOpen('zoom-modal')) {
      document.getElementById('zoom-close-btn')?.click();
      return true;
    }
    if (isModalOpen('external-conflict-modal')) {
      document.getElementById('btn-close-external-conflict')?.click();
      return true;
    }
    return false;
  });

  // ] / [ はキーボードの左右の並び（右が次、左が前）で章を移る（FR-025, DD-KEY-002）
  ['j', 'J', ']'].forEach(k => registerShortcutAction(k, () => scrollSection(1)));
  ['k', 'K', '['].forEach(k => registerShortcutAction(k, () => scrollSection(-1)));
  ['m', 'M'].forEach(k => registerShortcutAction(k, () => setStageMode(!state.isVisualMode)));
  ['1', '2', '3', '4'].forEach((k, idx) => {
    registerShortcutAction(k, () => {
      const targetStyle = VISUAL_STYLE_KEYS[idx];
      if (targetStyle) selectInfographicStyle(targetStyle);
    });
  });
  ['p', 'P'].forEach(k => registerShortcutAction(k, () => document.getElementById('btn-stage-show')?.click()));
  registerShortcutAction('?', () => toggleShortcutModal());

  setupGlobalKeymap();
}

function setupEventListeners() {
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  editor.addEventListener('beforeinput', (e: InputEvent) => {
    handleEditorBeforeInput(editor, e);
  });
  editor.addEventListener('input', (e: Event) => {
    handleEditorInputCaret(editor, e as InputEvent);
    clearTimeout(runtime.renderDebounceTimer);
    const debounceMs = Math.min(250, Math.max(120, Math.round(runtime.lastRenderMs * 4)));
    runtime.renderDebounceTimer = setTimeout(() => {
      runtime.isInputRender = true;
      renderApp();
    }, debounceMs);
    scheduleFollow();
  });
  editor.addEventListener('click', scheduleFollow);
  editor.addEventListener('keyup', scheduleFollow);
  document.getElementById('preview-scroll')?.addEventListener('click', followPreviewClick);

  setupViewModeControls();

  let resizeRafId = 0;
  window.addEventListener('resize', () => {
    if (!state.isVisualMode || resizeRafId) return;
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = 0;
      if (state.isVisualMode) {
        updateAllSlabSplits(document.getElementById('visual-stage-container'));
      }
    });
  });

  const btnFast = document.getElementById('btn-mode-fast');
  const btnVisual = document.getElementById('btn-visual-mode');
  if (btnFast) btnFast.onclick = () => setStageMode(false);
  if (btnVisual) btnVisual.onclick = () => setStageMode(!state.isVisualMode);

  document.getElementById('btn-stage-show').onclick = async () => {
    if (await loadLibrary('stage')) {
      if (typeof LucivoStage.toggleLights === 'function') LucivoStage.toggleLights(state.signalLightsEnabled);
      LucivoStage.enterShow();
    }
  };

  document.querySelectorAll('.info-style-btn').forEach((btn: any) => {
    btn.onclick = () => selectInfographicStyle(btn.getAttribute('data-info-style'));
  });
  const mobileStyleBtn = document.getElementById('btn-mobile-style');
  const mobileStyleMenu = document.getElementById('mobile-style-menu');
  if (mobileStyleMenu) {
    mobileStyleMenu.querySelectorAll('[data-mobile-style]').forEach((item: any) => {
      item.onclick = () => {
        const style = item.getAttribute('data-mobile-style');
        setStyleMenuOpen(false);
        if (style) selectInfographicStyle(style);
      };
    });
  }
  if (mobileStyleBtn && mobileStyleMenu) {
    mobileStyleBtn.onclick = e => {
      e.stopPropagation();
      setStyleMenuOpen(mobileStyleMenu.classList.contains('hidden'));
    };
    document.addEventListener('click', e => {
      if (!mobileStyleMenu.classList.contains('hidden') && !mobileStyleMenu.contains(e.target as Node) && !mobileStyleBtn.contains(e.target as Node)) {
        setStyleMenuOpen(false);
      }
    });
    registerEscapeHandler('mobile-style-menu', 91, () => {
      if (mobileStyleMenu.classList.contains('hidden')) return false;
      setStyleMenuOpen(false);
      mobileStyleBtn.focus();
      return true;
    });
  }
  syncStyleUi();

  const toneBtn = document.getElementById('btn-tone-menu');
  const toneMenu = document.getElementById('tone-menu');
  if (toneMenu) {
    toneMenu.innerHTML = COLOR_TONES.map(t => {
      const cols = t.id === 'default'
        ? getEffectiveVisualPalette(state.infographicStyle, state.appearance)
        : [t.light.c1, t.light.c2, t.light.c3, t.light.c4];
      return `<button type="button" role="menuitemradio" aria-checked="false" data-tone-id="${t.id}" class="tone-menu-item">`
        + `<span class="tone-swatches" aria-hidden="true">${renderSwatchDotsHtml(cols)}</span>`
        + `<span class="tone-menu-label">${escapeHtml(t.label)}</span>`
        + `</button>`;
    }).join('');
    toneMenu.querySelectorAll('.tone-menu-item').forEach((item: any) => {
      item.onclick = () => selectTone(item.getAttribute('data-tone-id'));
    });
  }
  if (toneBtn && toneMenu) {
    toneBtn.onclick = e => {
      e.stopPropagation();
      const willOpen = toneMenu.classList.contains('hidden');
      if (willOpen) setLayoutMenuOpen(false);
      setToneMenuOpen(willOpen);
    };
    document.addEventListener('click', e => {
      if (!toneMenu.classList.contains('hidden') && !toneMenu.contains(e.target as Node) && !toneBtn.contains(e.target as Node)) {
        setToneMenuOpen(false);
      }
    });
    registerEscapeHandler('tone-menu', 90, () => {
      if (toneMenu.classList.contains('hidden')) return false;
      setToneMenuOpen(false);
      toneBtn.focus();
      return true;
    });
  }
  syncToneUi();

  const layoutBtn = document.getElementById('btn-layout-menu');
  const layoutMenu = document.getElementById('layout-menu');
  if (layoutMenu) {
    layoutMenu.innerHTML = VISUAL_LAYOUTS.map(l =>
      `<button type="button" role="menuitemradio" aria-checked="false" data-layout-id="${l.id}" class="tone-menu-item">`
      + `<span class="tone-menu-label">${l.label}</span>`
      + `</button>`
    ).join('');
    layoutMenu.querySelectorAll('.tone-menu-item').forEach((item: any) => {
      item.onclick = () => selectVisualLayout(item.getAttribute('data-layout-id'));
    });
  }
  if (layoutBtn && layoutMenu) {
    layoutBtn.onclick = e => {
      e.stopPropagation();
      const willOpen = layoutMenu.classList.contains('hidden');
      setLayoutMenuOpen(willOpen);
    };
    document.addEventListener('click', e => {
      if (!layoutMenu.classList.contains('hidden') && !layoutMenu.contains(e.target as Node) && !layoutBtn.contains(e.target as Node)) {
        setLayoutMenuOpen(false);
      }
    });
    registerEscapeHandler('layout-menu', 89, () => {
      if (layoutMenu.classList.contains('hidden')) return false;
      setLayoutMenuOpen(false);
      layoutBtn.focus();
      return true;
    });
  }
  syncLayoutUi();

  const btnTheme = document.getElementById('btn-theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const appFavicon = document.getElementById('app-favicon');
  btnTheme.onclick = () => {
    state.appearance = state.appearance === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-appearance', state.appearance);
    if (appFavicon) appFavicon.setAttribute('href', `./assets/logos/${state.appearance}/favicon.svg`);
    iconSun.classList.toggle('hidden', state.appearance === 'dark');
    iconMoon.classList.toggle('hidden', state.appearance !== 'dark');
    syncToneUi();
    setupMermaid();
    renderApp();
    syncUrlFromState();
  };

  document.getElementById('btn-open-settings').onclick = () => setModalOpen('settings-modal', true);
  document.getElementById('btn-close-settings').onclick = () => setModalOpen('settings-modal', false);
  // Expand の画面の倍率の部品（DD-DIAG-045）。部品は図のカードと同じ HTML を入れる
  bindScaleMenus();
  const zoomPicker = document.getElementById('zoom-scale-picker');
  if (zoomPicker) {
    zoomPicker.innerHTML = scalePickerHtml('');
    zoomPicker.addEventListener('click', event => {
      const btn = (event.target as Element).closest('.scale-btn');
      if (!btn) return;
      setScaleMode(document.getElementById('zoom-canvas'), zoomPicker, btn.getAttribute('data-action') as ScaleAction);
    });
  }
  document.getElementById('zoom-close-btn').onclick = () => {
    setModalOpen('zoom-modal', false);
    document.getElementById('zoom-canvas').innerHTML = '';
  };

  const exportHtmlBtn = document.getElementById('btn-export-html');
  if (exportHtmlBtn) exportHtmlBtn.onclick = () => {
    const fullHtml = Object.entries(EXPORT_URLS).reduce(
      (html, [local, url]) => html.split(local).join(url),
      document.documentElement.outerHTML
    );
    downloadBlob(fullHtml, 'lucivo-architecture-export.html', 'text/html');
    showToast(t('export.htmlToast'));
  };

  document.getElementById('btn-test-cache').onclick = () => {
    const t0 = performance.now();
    renderApp();
    showToast(t('test.cacheToast', { ms: (performance.now() - t0).toFixed(1) }));
  };

  document.getElementById('btn-test-err').onclick = () => {
    editor.value += '\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n';
    renderApp();
  };
}

runtime.renderApp = renderApp;
runtime.syncUrlFromState = syncUrlFromState;

window.addEventListener('DOMContentLoaded', () => {
  const pendingPresent = takePresentFromUrl();
  initI18n();
  setupEventListeners();
  applyInitialDisplayStateFromUrl();
  applyStaticI18n();
  runtime.urlSyncReady = true;
  setupVisualStageInteractions();
  setupSplitTermLinks();
  setupKeyboardShortcuts();
  setupFileMenu();
  setupFileDrop();
  setupFileWatch();
  setupFolder();
  setupUpdateCheck();
  setupDiagramPanZoom();
  ensureSlabVisibilityTracking(document.getElementById('visual-stage-container'));
  setupLocalImages();
  setupFrontMatterToggle();
  setupAnimationToggle();
  setupAmbientEffectsToggle();
  setupMuseumLightSetting();
  setupFormatter();
  setupDocumentLinks();
  syncCssTokens();
  setupMarkedMath();
  setupMarkedHeadings();
  setupMarkedBlocks();
  setupMarkedFootnotes();
  setupMarkedEmoji();
  setupMermaid();
  syncStyleUi();
  syncToneUi();
  syncLayoutUi();
  onLangChange(() => {
    applyStaticI18n();
    renderShortcutModalList();
    syncStyleUi();
    syncToneUi();
    syncLayoutUi();
    const zoomPicker = document.getElementById('zoom-scale-picker');
    if (zoomPicker) zoomPicker.innerHTML = scalePickerHtml('');
    applyUpdateCheckState();
    updateRecentFolderMenu();
    renderFolderList();
    syncUrlFromState();
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement | null;
    const isUnmodified = Boolean(editor && editor.value === runtime.lastLoadedMarkdown);
    const sampleName = runtime.currentSampleFile
      || (hasBundledSamples() ? null : sampleFileNameFromRawUrl(runtime.currentRemoteUrl));
    if (sampleName && isUnmodified) {
      void loadBundledSample(getSampleBaseFileName(sampleName), { silentToast: true });
    } else {
      renderApp();
    }
  });
  renderApp();
  // present は最初の文書の読み込みで URL から取り除かれるため、先に読み取っておく（FR-069）
  void loadMarkdownFromUrlParam().then(() => startPendingPresent(pendingPresent));

  // サンプルカード等から pushState で開いたあと、ブラウザの「戻る」ボタンで起動画面・前文書へ戻れるようにする
  window.addEventListener('popstate', () => {
    runtime.urlSyncReady = false;
    try {
      applyInitialDisplayStateFromUrl();
      const rawUrl = extractMarkdownUrlFromLocation(window.location.search, window.location.hash);
      if (rawUrl) {
        void loadMarkdownFromUrlParam().finally(() => { runtime.urlSyncReady = true; });
      } else {
        resetToEmptyGuide();
        runtime.urlSyncReady = true;
      }
    } catch (_) {
      runtime.urlSyncReady = true;
    }
  });
});

// E2E テストおよび外部連携用グローバル公開
(window as any).state = state;
(window as any).renderApp = renderApp;
(window as any).closeFileMenu = closeFileMenu;

Object.defineProperty(window, 'openedFolder', {
  get() { return runtime.openedFolder; },
  set(val) { runtime.openedFolder = val; },
  configurable: true
});

Object.defineProperty(window, 'currentSampleFile', {
  get() { return runtime.currentSampleFile; },
  set(val) { runtime.currentSampleFile = val; },
  configurable: true
});

Object.defineProperty(window, 'lastLoadedMarkdown', {
  get() { return runtime.lastLoadedMarkdown; },
  set(val) { runtime.lastLoadedMarkdown = val; },
  configurable: true
});

Object.defineProperty(window, 'preferFolderInput', {
  get() { return runtime.preferFolderInput; },
  set(val) { runtime.preferFolderInput = val; },
  configurable: true
});

// stage.js などの外部スクリプト（非同期動的ロード）や E2E テストとの後方互換用
(window as any).hexToRgba = hexToRgba;
(window as any).escapeHtml = escapeHtml;
(window as any).getEffectiveVisualPalette = getEffectiveVisualPalette;
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
(window as any).updatePannable = updatePannable;
