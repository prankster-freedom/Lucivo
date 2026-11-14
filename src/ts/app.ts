// @ts-nocheck
import { escapeHtml } from './utils/escape';
import { hexToRgba } from './utils/color';
import { fnv1aHash } from './utils/hash';
import { downloadBlob } from './utils/download';
import { decodeMarkdown, normalizeText, isUtf8Family } from './utils/text-decode';
import { showToast, updateStatus } from './ui/toast';
import { setupUpdateCheck, applyUpdateCheckState, checkForUpdate, isWebVersion } from './ui/update-check';
import { extractMarkdownUrlFromLocation, validatePublicMarkdownUrl, fetchMarkdownFromUrl } from './ui/url-loader';
import { treeTokenFor } from './markdown/tree';
import { MATH_PLOT_BOX, getTexPlotSpec, getCachedMathPlotDataUrl, clearMathPlotCache } from './math/plot';
import { ALERT_LABELS, decorateAlerts } from './markdown/callouts';
import { splitFrontMatter, highlightYamlLine, buildFrontMatterHtml } from './markdown/front-matter';
import { scopeSvgIds } from './diagram/scope';
import { setupDiagramPanZoom, findScrollParent, clearDiagramZoom, updatePannable, zoomDiagram } from './diagram/pan-zoom';
import {
  resolveModal,
  isModalOpen,
  setModalOpen,
  VISUAL_STYLE_KEYS,
  EMPTY_GUIDE_HTML,
  EXPORT_URLS,
  state,
  svgCache,
  lkgCache,
  fitCache,
  mathCache,
  loadLibrary,
  runtime
} from './ui/state';
import {
  getThemeSpec,
  getDiagramSpec,
  syncCssTokens,
  getBlockCurve,
  getMermaidLayout,
  setupMermaid
} from './diagram/mermaid-config';
import {
  setupMarkedMath,
  setupMarkedHeadings,
  renderMath
} from './markdown/math-and-headings';
import {
  applyReadableFit,
  updateSlabSplit,
  updateAllSlabSplits,
  postProcessSvg,
  createDiagramCard
} from './diagram/svg-postprocess';
import {
  clearVisualStageSpotlight,
  setupVisualStageInteractions
} from './ui/slab-export';
import {
  decorateCodeBlocks,
  buildVisualStageHtml
} from './ui/visual-stage';
import {
  setupLocalImages,
  resolveFolderImages,
  wrapTables
} from './markdown/local-images';
import {
  closeFileMenu,
  setupFormatter,
  setupPresentModes,
  saveMarkdownFile,
  setupFileMenu,
  setupFileDrop
} from './ui/file-menu';
import {
  setupDocumentLinks,
  setupFolder,
  setupFrontMatterToggle,
  setupAnimationToggle,
  loadMarkdownFromUrlParam
} from './ui/folder-browser';

function parseMarkdownAndMermaidSlots(rawMarkdown: string, body: string) {
  const parsed = marked.lexer(body);
  const mermaidBlocks: any[] = [];
  runtime.lastMermaidSources = [];
  const tokensToKeep: any[] = [];
  let srcLine = countLinesBefore(rawMarkdown, rawMarkdown.length - body.length);

  parsed.forEach((token: any) => {
    if (token.type === 'heading') token.srcLine = srcLine;
    srcLine += countLinesBefore(token.raw, token.raw.length);
    if (token.type === 'code' && (token.lang || '').trim().toLowerCase() === 'mermaid') {
      const index = mermaidBlocks.length;
      const code = token.text.trim();
      const curve = getBlockCurve(index, code);
      const hash = fnv1aHash(code + state.appearance + state.palette + (curve || '') + state.infographicStyle + (state.isVisualMode ? 'vis' : 'std'));
      mermaidBlocks.push({ index, code, hash, curve });
      runtime.lastMermaidSources[index] = code;
      tokensToKeep.push({
        type: 'html',
        raw: `<div class="lucivo-slot" data-slot="${index}"></div>`,
        text: `<div class="lucivo-slot" data-slot="${index}"></div>`
      });
    } else {
      tokensToKeep.push(treeTokenFor(token) || token);
    }
  });
  return { mermaidBlocks, tokensToKeep };
}

function renderApp() {
  const rawMarkdown = (document.getElementById('markdown-editor') as HTMLTextAreaElement).value;
  // フロントマターは Marked に渡さない。渡すと先頭の --- が水平線、YAML が段落になる（DD-FM-001）
  const { yaml, body } = splitFrontMatter(rawMarkdown);
  const { mermaidBlocks, tokensToKeep } = parseMarkdownAndMermaidSlots(rawMarkdown, body);

  const frontMatterHtml = yaml !== null && state.showFrontMatter ? buildFrontMatterHtml(yaml) : '';
  const rawHtml = frontMatterHtml + marked.parser(tokensToKeep);
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_TAGS: ['div', 'span', 'strong', 'small'],
    ADD_ATTR: ['class', 'data-slot', 'style']
  });

  const stdContainer = document.getElementById('standard-doc-container');
  const visContainer = document.getElementById('visual-stage-container');
  const stdWrapper = document.getElementById('standard-doc-wrapper');
  const isVisual = state.isVisualMode;
  const generation = ++runtime.renderGeneration;
  const isEmpty = rawMarkdown.trim() === '';
  if (window.LucivoStage) LucivoStage.resetLights();

  if (isVisual) {
    stdWrapper.classList.add('hidden');
    stdContainer.innerHTML = '';
    visContainer.classList.remove('hidden');
    visContainer.innerHTML = isEmpty
      ? `<div class="exhibition-wrap"><section class="exhibition-slab">${EMPTY_GUIDE_HTML}</section></div>`
      : buildVisualStageHtml(cleanHtml, yaml);
  } else {
    visContainer.classList.add('hidden');
    visContainer.innerHTML = '';
    stdWrapper.classList.remove('hidden');
    stdContainer.innerHTML = isEmpty ? EMPTY_GUIDE_HTML : cleanHtml;
    decorateAlerts(stdContainer);
  }

  const activeContainer = isVisual ? visContainer : stdContainer;
  if (isEmpty) applyUpdateCheckState(activeContainer);
  wrapTables(activeContainer);
  resolveFolderImages(activeContainer);
  renderMath(activeContainer);
  const slots = activeContainer.querySelectorAll('.lucivo-slot');
  const modeTag = isVisual ? `vis-${state.infographicStyle}` : 'std';

  const dirtyBlocks = [];
  const cachedKeys = new Map();

  slots.forEach(slot => {
    const idx = parseInt(slot.getAttribute('data-slot'), 10);
    const block = mermaidBlocks[idx];
    if (!block) return;
    const cacheKey = `${block.hash}-${modeTag}`;
    if (svgCache.has(cacheKey)) {
      slot.outerHTML = createDiagramCard(idx, svgCache.get(cacheKey), false, isVisual, block.curve);
      cachedKeys.set(idx, cacheKey);
    } else {
      slot.outerHTML = createDiagramCard(idx, '', true, isVisual, block.curve);
      dirtyBlocks.push({ ...block, modeTag, cacheKey });
    }
  });

  cachedKeys.forEach((cacheKey, idx) => {
    applyReadableFit(activeContainer.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
  });
  bindViewportInteractions(activeContainer);
  mountStage(activeContainer);
  if (document.activeElement && document.activeElement.id === 'markdown-editor') scheduleFollow();

  if (dirtyBlocks.length > 0) {
    processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
  } else {
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
}

// Visualモードの図に舞台演出を取り付ける。読み込みを待つ間に DOM が作り直された場合は何もしない
function mountStage(container) {
  if (!state.isVisualMode) return;
  loadLibrary('stage').then(ok => {
    if (ok && state.isVisualMode && container.isConnected) {
      if (typeof LucivoStage.toggleLights === 'function') LucivoStage.toggleLights(state.signalLightsEnabled);
      LucivoStage.mount(container);
    }
  });
}

// target: 描画開始時の表示先コンテナ・描画世代・モード。
// 描画中にモード切替や再描画が起きた場合（世代が変わった場合）は、古い描画結果を捨てる
async function processDirtyBlocks(dirtyBlocks, target) {
  updateStatus(`Rendering ${dirtyBlocks.length} diagrams...`, 'warning');
  const isStale = () => target.generation !== runtime.renderGeneration;

  // Mermaid は、図が初めて現れたときに読み込む
  const mermaidReady = await loadLibrary('mermaid');
  if (isStale()) return;
  if (!mermaidReady) {
    dirtyBlocks.forEach(block => {
      const vp = target.container.querySelector(`[data-stage-index="${block.index}"]`);
      if (vp) vp.innerHTML = '<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">Mermaid を読み込めませんでした（ネットワークの接続を確認してください）</div>';
    });
    updateStatus('• Mermaid Unavailable', 'warning');
    return;
  }

  for (const block of dirtyBlocks) {
    if (isStale()) return;
    const renderId = `mermaid-render-${block.index}-${Date.now()}`;
    const lkgKey = `${block.index}-${block.modeTag}`;
    const stageViewport = target.container.querySelector(`[data-stage-index="${block.index}"]`);
    try {
      setupMermaid(target.isVisual, block.curve || 'smooth', getMermaidLayout(block.code, block.curve));
      const { svg } = await mermaid.render(renderId, block.code);
      if (isStale()) return;
      const finalSvg = postProcessSvg(svg, target.isVisual);

      svgCache.set(block.cacheKey, finalSvg);
      lkgCache.set(lkgKey, finalSvg);

      if (stageViewport) {
        stageViewport.innerHTML = finalSvg;
        applyReadableFit(stageViewport.querySelector(':scope > svg'), block.cacheKey);
        mountStage(stageViewport);
      }
    } catch (err) {
      // Mermaid が描画のために body に置いた一時的な要素が残っていれば消す（DD-DIAG-064）
      document.getElementById(`d${renderId}`)?.remove();
      console.error(`Mermaid render failed for block ${block.index}:`, err);
      if (isStale()) return;
      const fallback = lkgCache.get(lkgKey);
      if (stageViewport) {
        if (fallback) {
          stageViewport.innerHTML = fallback;
          applyReadableFit(stageViewport.querySelector(':scope > svg'));
          mountStage(stageViewport);
          showToast('構文エラーのため直前の正常状態を表示');
        } else {
          stageViewport.innerHTML = `<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">構文エラー: 正しいMermaid記法を入力してください</div>`;
        }
      }
    }
  }

  updateStatus(`• All Diagrams Verified`, 'success');
}

/* ==========================================================================
   ビューポート操作イベント
   ========================================================================== */
function downloadDiagramPng(svgEl: SVGElement, idx: string) {
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobURL = URLObj.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const bbox = svgEl.getBoundingClientRect();
    canvas.width = (bbox.width || 800) * scale;
    canvas.height = (bbox.height || 600) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.appearance === 'dark' ? getDiagramSpec(state.isVisualMode).canvasBg : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `diagram-0${parseInt(idx, 10) + 1}.png`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      showToast(`Diagram 0${parseInt(idx, 10) + 1} PNG (高解像度) をダウンロード`);
    });
    URLObj.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
}

// container: 表示中のコンテナ。非表示側の図を操作しないよう、探索範囲を限定する
function bindViewportInteractions(container) {
  // 矢印の形状を選ぶと、その図だけキャッシュのキーが変わり、描き直される（DD-EDGE-011）
  container.querySelectorAll('.edge-curve-btn').forEach(btn => {
    btn.onclick = () => {
      state.curveByIndex.set(parseInt(btn.getAttribute('data-index'), 10), btn.getAttribute('data-curve'));
      renderApp();
    };
  });

  container.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const action = btn.getAttribute('data-action');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      const frame = btn.closest(`#diagram-frame-${idx}`);
      if (!vp || !frame) return;

      frame.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      // Ctrl + ホイールで変えた倍率（DD-DIAG-071）は、Fit / 1:1 を選んだら解除する
      clearDiagramZoom(vp);
      if (action === 'scale-actual') {
        vp.classList.add('is-actual-size');
      } else {
        vp.classList.remove('is-actual-size');
      }
      updateSlabSplit(vp.closest('.exhibition-slab-split'));
      updatePannable(vp);
    };
  });

  container.querySelectorAll('[data-action="svg"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (!svgEl) return;
      downloadBlob(svgEl.outerHTML, `diagram-0${parseInt(idx, 10) + 1}.svg`, 'image/svg+xml');
      showToast(`Diagram 0${parseInt(idx, 10) + 1} SVGをダウンロード`);
    };
  });

  container.querySelectorAll('[data-action="png"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (svgEl) downloadDiagramPng(svgEl, idx);
    };
  });

  container.querySelectorAll('[data-action="zoom"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = container.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (!svgEl) return;

      const zoomCanvas = document.getElementById('zoom-canvas');
      zoomCanvas.innerHTML = svgEl.outerHTML;
      setModalOpen('zoom-modal', true);
      if (state.isVisualMode && window.LucivoStage) LucivoStage.mountLights(zoomCanvas);
    };
  });
}

/* ==========================================================================
   モード切替とスタイル切替（共通関数）
   ========================================================================== */
// モードの切替ボタンの選択状態と、スタイルバーの表示を揃える。
// スタイルバーは Visualモードの配色・装飾にしか効かないため、Visualモードのときだけ表示する（DD-DIAG-063）
function syncStageModeUi(isVisual) {
  document.getElementById('btn-mode-fast')?.classList.toggle('is-active', !isVisual);
  document.getElementById('btn-visual-mode')?.classList.toggle('is-active', isVisual);
  document.getElementById('style-bar')?.classList.toggle('is-hidden', !isVisual);
}

function setStageMode(isVisual) {
  if (state.isVisualMode === isVisual) return;
  state.isVisualMode = isVisual;
  syncStageModeUi(isVisual);
  if (isVisual) {
    showToast('🎨 Visualモードを起動');
  } else {
    showToast('高速モードに戻りました');
  }
  renderApp();
}

function selectInfographicStyle(style) {
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
  renderApp();
  const activeBtn = document.querySelector(`.info-style-btn[data-info-style="${style}"]`);
  showToast(`スタイル適用: ${activeBtn ? activeBtn.textContent.trim() : style}`);
}

/* ==========================================================================
   キーボードショートカットとナビゲーション（FR-025, DD-KEY-001〜004）
   ========================================================================== */
function isEditableElement(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || el.isContentEditable;
}

function closeShortcutModal() {
  setModalOpen('shortcut-modal', false);
}

function toggleShortcutModal() {
  setModalOpen('shortcut-modal', !isModalOpen('shortcut-modal'));
}

/* ==========================================================================
   プレビューのスクロール（J/K の章移動 FR-025、編集位置への追従 FR-037 で共通）
   ========================================================================== */
export const PREVIEW_SCROLL_MARGIN = 16;

export function scrollBehavior() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// 要素の上端を、プレビューの表示枠の上端から PREVIEW_SCROLL_MARGIN だけ下に置くときの scrollTop
export function previewScrollTopOf(el, scroller, scrollerRect = scroller.getBoundingClientRect()) {
  return Math.max(0, Math.round(el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop - PREVIEW_SCROLL_MARGIN));
}

/* ==========================================================================
   Split 表示の編集位置への追従（FR-037, DD-DIAG-060〜062）
   ========================================================================== */
// 最後に送った見出しの行（'top' はプレビューの先頭）。同じ区間の中では送り直さない
let followFrame = 0;

// text の先頭から end までにある改行の数（= end の位置の 0 始まりの行番号）
function countLinesBefore(text, end) {
  let count = 0;
  for (let i = text.indexOf('\n'); i !== -1 && i < end; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

// カーソルの行以前で最後の見出し（data-src-line は文書の順に並ぶ）。なければ null
function findFollowTarget(container, caretLine) {
  let target = null;
  for (const el of container.querySelectorAll('[data-src-line]')) {
    if (Number(el.dataset.srcLine) > caretLine) break;
    target = el;
  }
  return target;
}

function followEditorCaret() {
  followFrame = 0;
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const editor = document.getElementById('markdown-editor');
  const scroller = document.getElementById('preview-scroll');
  const container = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
  const target = findFollowTarget(container, countLinesBefore(editor.value, editor.selectionStart));
  // Visualモードは章（スラブ）の上端へ送る。章の中の小見出しの間を動いても、同じ章なら送り直さない
  const anchor = target && state.isVisualMode ? (target.closest('.exhibition-slab') || target) : target;
  const keyEl = anchor && anchor !== target ? (anchor.querySelector('[data-src-line]') || target) : target;
  const key = keyEl ? keyEl.dataset.srcLine : 'top';
  if (key === runtime.followedKey) return;
  runtime.followedKey = key;
  scroller.scrollTo({ top: anchor ? previewScrollTopOf(anchor, scroller) : 0, behavior: scrollBehavior() });
}

// カーソルの移動・入力のたびに呼ぶ。スクロールは表示更新 1 回にまとめる
function scheduleFollow() {
  if (!followFrame) followFrame = requestAnimationFrame(followEditorCaret);
}

let lastNavTargetTop = null;
let lastNavTime = 0;

function scrollSection(direction) {
  const scroller = document.getElementById('preview-scroll');
  if (!scroller) return;
  const selector = state.isVisualMode
    ? '#visual-stage-container .exhibition-slab'
    : '#standard-doc-container h2';
  const elements = Array.from(document.querySelectorAll(selector));
  if (elements.length === 0) return;

  const now = performance.now();
  const scrollerRect = scroller.getBoundingClientRect();
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  // スムーズスクロール進行中に連続で J / K を押した場合も次の章へ進めるよう、直近の目標位置を引き継ぐ
  const currentTop = (lastNavTargetTop !== null && now - lastNavTime < 500)
    ? lastNavTargetTop
    : scroller.scrollTop;

  const positions = elements.map(el => previewScrollTopOf(el, scroller, scrollerRect));

  let nextTop = null;
  if (direction > 0) {
    if (currentTop >= maxScroll - 2) return;
    // 先頭付近（scrollTop <= 16）で最初の章が画面上端付近（<= 64px）にある場合は、すでに1章目を表示中とみなして2章目へ進む
    nextTop = positions.find((pos, idx) =>
      pos > currentTop + 8 && !(idx === 0 && currentTop <= 16 && pos <= 64 && positions.length > 1)
    );
    if (nextTop !== undefined && nextTop !== null) {
      nextTop = Math.min(maxScroll, nextTop);
    }
  } else {
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i] < currentTop - 8) {
        nextTop = positions[i];
        break;
      }
    }
    // 最初の章より上に表紙（ヒーローや h1）がある場合は最上部（0）へ戻る
    if (nextTop === null && currentTop > 0) {
      nextTop = 0;
    }
  }

  if (nextTop !== null && nextTop !== undefined) {
    lastNavTargetTop = nextTop;
    lastNavTime = now;
    scroller.scrollTo({ top: nextTop, behavior: scrollBehavior() });
  }
}

function setupKeyboardShortcuts() {
  document.getElementById('shortcut-close-btn')?.addEventListener('click', closeShortcutModal);

  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    // ステージ発表中（is-stage-show）は stage.js のハンドラが処理するためスキップ
    if (document.documentElement.classList.contains('is-stage-show')) return;

    // ショートカットヘルプモーダルまたはズームモーダルが開いている場合の Escape 処理
    if (event.key === 'Escape') {
      if (isModalOpen('shortcut-modal')) {
        closeShortcutModal();
        return;
      }
      if (isModalOpen('zoom-modal')) {
        document.getElementById('zoom-close-btn')?.click();
        return;
      }
    }

    // エディタや入力欄にフォーカスがあるときは文字入力を優先しショートカットを起動しない（DD-KEY-001）
    if (isEditableElement(document.activeElement)) return;

    // ] / [ はキーボードの左右の並び（右が次、左が前）で章を移る（FR-025, DD-KEY-002）
    if (event.key === 'j' || event.key === 'J' || event.key === ']') {
      event.preventDefault();
      scrollSection(1);
    } else if (event.key === 'k' || event.key === 'K' || event.key === '[') {
      event.preventDefault();
      scrollSection(-1);
    } else if (event.key === 'm' || event.key === 'M') {
      event.preventDefault();
      setStageMode(!state.isVisualMode);
    } else if (event.key >= '1' && event.key <= '4') {
      const targetStyle = VISUAL_STYLE_KEYS[parseInt(event.key, 10) - 1];
      if (targetStyle) {
        event.preventDefault();
        selectInfographicStyle(targetStyle);
      }
    } else if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      document.getElementById('btn-stage-show')?.click();
    } else if (event.key === '?') {
      event.preventDefault();
      toggleShortcutModal();
    }
  });
}

/* ==========================================================================
   イベントハンドラー結線
   ========================================================================== */
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

function setupViewModeControls() {
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
  };

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

function setupEventListeners() {
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  editor.addEventListener('input', () => {
    clearTimeout(runtime.renderDebounceTimer);
    runtime.renderDebounceTimer = setTimeout(renderApp, 250);
    scheduleFollow();
  });
  editor.addEventListener('click', scheduleFollow);
  editor.addEventListener('keyup', scheduleFollow);

  setupViewModeControls();

  window.addEventListener('resize', () => {
    if (state.isVisualMode) {
      updateAllSlabSplits(document.getElementById('visual-stage-container'));
    }
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

  document.querySelectorAll('.palette-option-btn').forEach((btn: any) => {
    btn.onclick = () => {
      const pal = btn.getAttribute('data-palette-set');
      state.palette = pal;
      document.querySelectorAll('.palette-option-btn').forEach(b => {
        b.classList.toggle('is-active', b.getAttribute('data-palette-set') === pal);
      });
      const activeLabel = document.getElementById('active-palette-name');
      if (activeLabel) activeLabel.textContent = pal.charAt(0).toUpperCase() + pal.slice(1);
      setupMermaid();
      renderApp();
      showToast(`テーマ色: ${pal.toUpperCase()}`);
    };
  });

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
    setupMermaid();
    renderApp();
  };

  document.getElementById('btn-open-settings').onclick = () => setModalOpen('settings-modal', true);
  document.getElementById('btn-close-settings').onclick = () => setModalOpen('settings-modal', false);
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
    showToast('単一HTMLファイルをエクスポートしました');
  };

  document.getElementById('btn-test-cache').onclick = () => {
    const t0 = performance.now();
    renderApp();
    showToast(`キャッシュ再描画: ${(performance.now() - t0).toFixed(1)}ms (0ms相当)`);
  };

  document.getElementById('btn-test-err').onclick = () => {
    editor.value += '\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n';
    renderApp();
  };
}

/* ==========================================================================
   開く・保存のメニュー（Markdown ファイルの読み込みと保存）
   ========================================================================== */
runtime.renderApp = renderApp;

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupVisualStageInteractions();
  setupKeyboardShortcuts();
  setupFileMenu();
  setupFileDrop();
  setupFolder();
  setupUpdateCheck();
  setupDiagramPanZoom();
  setupLocalImages();
  setupFrontMatterToggle();
  setupAnimationToggle();
  setupFormatter();
  setupMarkedMath();
  setupMarkedHeadings();
  setupMermaid();
  renderApp();
  loadMarkdownFromUrlParam();
});

// E2E テストおよび外部連携用グローバル公開
(window as any).state = state;
(window as any).renderApp = renderApp;
// 図の番号（data-stage-index）の Mermaid の原文。プレイアブル・ダイアグラム（#62）が使う
(window as any).getMermaidSource = (index: number) => runtime.lastMermaidSources[index] ?? null;
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
