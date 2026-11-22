// @ts-nocheck
// エディタ・プレビュー間の双方向スクロール追従（FR-037, DD-DIAG-060〜062, 065）と章ナビゲーション（FR-025）
import { isModalOpen, setModalOpen, state, runtime } from './state';

export function closeShortcutModal() {
  setModalOpen('shortcut-modal', false);
}

export function toggleShortcutModal() {
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
// text の先頭から end までにある改行の数（= end の位置の 0 始まりの行番号）
export function countLinesBefore(text: string, end: number) {
  return countLinesBetween(text, 0, end);
}

// text の [start, end) の範囲にある改行の数を数える
export function countLinesBetween(text: string, start: number, end: number) {
  let count = 0;
  for (let i = text.indexOf('\n', start); i !== -1 && i < end; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

// 描画したコンテナから見出しの一覧（行番号と要素）を 1 回だけ作る
export function rebuildFollowIndex(container: HTMLElement | null) {
  if (!container) {
    runtime.followIndex = [];
    return;
  }
  runtime.followIndex = Array.from(container.querySelectorAll('[data-src-line]')).map(el => ({
    line: Number((el as HTMLElement).dataset.srcLine),
    el: el as HTMLElement
  }));
}

// 差分描画キャッシュの各エントリが保持する見出し要素と行番号から DOM 走査なしで見出し一覧を再構築する（#329）
export function rebuildFollowIndexFromEntries(
  entries: Array<{ headingLines: number[]; headingEls: HTMLElement[] }>
) {
  const next: { line: number; el: HTMLElement }[] = [];
  for (const entry of entries) {
    const els = entry.headingEls;
    const lines = entry.headingLines;
    const len = Math.min(els.length, lines.length);
    for (let i = 0; i < len; i++) {
      next.push({ line: lines[i], el: els[i] });
    }
  }
  runtime.followIndex = next;
}

// caretState の位置を targetPos まで差分移動して行番号を更新する
export function moveCaretLine(text: string, targetPos: number) {
  const caretState = runtime.caretState;
  if (targetPos > caretState.pos) {
    caretState.line += countLinesBetween(text, caretState.pos, targetPos);
  } else if (targetPos < caretState.pos) {
    caretState.line -= countLinesBetween(text, targetPos, caretState.pos);
  }
  caretState.pos = targetPos;
}

// 前回のカーソル位置からの差分だけ改行を数えて、現在の 0 始まり行番号を返す
function getCaretLine(editor: HTMLTextAreaElement) {
  const caretState = runtime.caretState;
  const text = editor.value;
  const pos = editor.selectionStart ?? 0;
  if (caretState.dirty || caretState.length !== text.length) {
    caretState.line = countLinesBefore(text, pos);
    caretState.pos = pos;
    caretState.length = text.length;
    caretState.dirty = false;
    return caretState.line;
  }
  moveCaretLine(text, pos);
  return caretState.line;
}

// カーソルの行以前で最後の見出しを二分探索で引く（followIndex は文書の順に並ぶ）。なければ null
function findFollowTarget(caretLine: number) {
  const followIndex = runtime.followIndex;
  let low = 0;
  let high = followIndex.length - 1;
  let result: HTMLElement | null = null;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (followIndex[mid].line <= caretLine) {
      result = followIndex[mid].el;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function followEditorCaret() {
  runtime.followFrame = 0;
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  const scroller = document.getElementById('preview-scroll');
  const target = findFollowTarget(getCaretLine(editor));
  // Visualモードは章（スラブ）の上端へ送る。章の中の小見出しの間を動いても、同じ章なら送り直さない
  const anchor = target && state.isVisualMode ? (target.closest('.exhibition-slab') || target) : target;
  const keyEl = anchor && anchor !== target ? (anchor.querySelector('[data-src-line]') || target) : target;
  const key = keyEl ? (keyEl as HTMLElement).dataset.srcLine : 'top';
  if (key === runtime.followedKey) return;
  runtime.followedKey = key;
  const behavior = scrollBehavior();
  scroller.scrollTo({ top: anchor ? previewScrollTopOf(anchor, scroller) : 0, behavior });
  // content-visibility: auto 有効時はスクロール直後に実高さが確定してずれるため、1 フレーム後に微調整する（#238, #251）
  const hasCv = state.isVisualMode
    ? Boolean(document.querySelector('#visual-stage-container .exhibition-wrap.has-content-visibility'))
    : Boolean(document.getElementById('standard-doc-container')?.classList.contains('has-content-visibility'));
  if (anchor && hasCv) {
    const expectedKey = key;
    requestAnimationFrame(() => {
      if (runtime.followedKey !== expectedKey || !anchor.isConnected) return;
      const targetTop = previewScrollTopOf(anchor, scroller);
      if (Math.abs(scroller.scrollTop - targetTop) > 4) {
        scroller.scrollTo({ top: targetTop, behavior: 'auto' });
      }
    });
  }
}

// カーソルの移動・入力のたびに呼ぶ。スクロールは表示更新 1 回にまとめる
export function scheduleFollow() {
  if (!runtime.followFrame) runtime.followFrame = requestAnimationFrame(followEditorCaret);
}

// text 内の 0 始まり行番号 targetLine の先頭文字オフセットを返す
function lineStartOffset(text: string, targetLine: number) {
  let offset = 0;
  for (let line = 0; line < targetLine; line++) {
    const nl = text.indexOf('\n', offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  return offset;
}

// textarea 内の prefix（先頭から対象行頭まで）の折り返しを考慮した上端 Y 座標を測る
function measureEditorLineTop(editor: HTMLTextAreaElement, prefix: string) {
  const cs = getComputedStyle(editor);
  const mirror = document.createElement('div');
  mirror.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;box-sizing:border-box;';
  mirror.style.width = `${editor.clientWidth}px`;
  mirror.style.font = cs.font;
  mirror.style.lineHeight = cs.lineHeight;
  mirror.style.letterSpacing = cs.letterSpacing;
  mirror.style.padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
  mirror.style.tabSize = cs.tabSize;
  mirror.textContent = prefix;
  const marker = document.createElement('span');
  marker.style.display = 'inline-block';
  marker.style.width = '0';
  marker.textContent = 'x';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}

// プレビューのクリック位置に対応する見出しへエディタを合わせる（FR-037 逆向き追従、DD-DIAG-065）
export function followPreviewClick(e: MouseEvent) {
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().length > 0) return;
  const targetEl = e.target as HTMLElement | null;
  if (!targetEl || targetEl.closest('a, button, summary, input, select, textarea, .diagram-controls')) return;

  const followIndex = runtime.followIndex;
  let headingEl: HTMLElement | null = null;
  const slab = state.isVisualMode ? targetEl.closest('.exhibition-slab') : null;
  if (slab) {
    headingEl = slab.querySelector('[data-src-line]') as HTMLElement | null;
  } else {
    headingEl = targetEl.closest('[data-src-line]') as HTMLElement | null;
    if (!headingEl && followIndex.length > 0) {
      let low = 0;
      let high = followIndex.length - 1;
      while (low <= high) {
        const mid = (low + high) >>> 1;
        const el = followIndex[mid].el;
        const isBeforeOrSame = el === targetEl || el.contains(targetEl)
          || (el.compareDocumentPosition(targetEl) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        if (isBeforeOrSame) {
          headingEl = el;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }
  }

  const targetLine = headingEl ? Number(headingEl.dataset.srcLine) : 0;
  const key = headingEl ? (headingEl.dataset.srcLine || 'top') : 'top';
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  const text = editor.value;
  const offset = lineStartOffset(text, targetLine);
  const lineTop = measureEditorLineTop(editor, text.slice(0, offset));

  // エディタ移動によるプレビューへの呼び返しを防ぐ
  runtime.followedKey = key;
  runtime.caretState.line = targetLine;
  runtime.caretState.pos = offset;
  runtime.caretState.length = text.length;
  runtime.caretState.dirty = false;

  editor.focus({ preventScroll: true });
  editor.setSelectionRange(offset, offset);
  editor.scrollTo({ top: Math.max(0, lineTop - 16), behavior: scrollBehavior() });
}

export function handleEditorBeforeInput(editor: HTMLTextAreaElement, e: InputEvent) {
  const caretState = runtime.caretState;
  runtime.pendingEdit = null;
  if (e.isComposing || caretState.dirty || editor.value.length !== caretState.length) return;
  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  if (start !== end) return;
  if (e.inputType === 'insertText' || e.inputType === 'insertLineBreak') {
    moveCaretLine(editor.value, start);
    runtime.pendingEdit = { type: e.inputType, start, deletedNewlines: 0 };
  } else if (e.inputType === 'deleteContentBackward' && start > 0) {
    moveCaretLine(editor.value, start);
    runtime.pendingEdit = { type: e.inputType, start, deletedNewlines: editor.value[start - 1] === '\n' ? 1 : 0 };
  }
}

export function handleEditorInputCaret(editor: HTMLTextAreaElement, ie: InputEvent) {
  const caretState = runtime.caretState;
  const pendingEdit = runtime.pendingEdit;
  if (pendingEdit && !ie.isComposing && ie.inputType === pendingEdit.type) {
    if (pendingEdit.type === 'insertText' && typeof ie.data === 'string') {
      caretState.line += countLinesBetween(ie.data, 0, ie.data.length);
    } else if (pendingEdit.type === 'insertLineBreak') {
      caretState.line += 1;
    } else if (pendingEdit.type === 'deleteContentBackward') {
      caretState.line -= pendingEdit.deletedNewlines;
    }
    caretState.pos = editor.selectionStart ?? pendingEdit.start;
    caretState.length = editor.value.length;
  } else {
    caretState.dirty = true;
  }
  runtime.pendingEdit = null;
}

export function scrollSection(direction) {
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
  const currentTop = (runtime.lastNavTargetTop !== null && now - runtime.lastNavTime < 500)
    ? runtime.lastNavTargetTop
    : scroller.scrollTop;

  const positions = elements.map(el => previewScrollTopOf(el, scroller, scrollerRect));

  let nextTop = null;
  let nextEl = null;
  if (direction > 0) {
    if (currentTop >= maxScroll - 2) return;
    // 先頭付近（scrollTop <= 16）で最初の章が画面上端付近（<= 64px）にある場合は、すでに1章目を表示中とみなして2章目へ進む
    const foundIdx = positions.findIndex((pos, idx) =>
      pos > currentTop + 8 && !(idx === 0 && currentTop <= 16 && pos <= 64 && positions.length > 1)
    );
    if (foundIdx !== -1) {
      nextTop = Math.min(maxScroll, positions[foundIdx]);
      nextEl = elements[foundIdx];
    }
  } else {
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i] < currentTop - 8) {
        nextTop = positions[i];
        nextEl = elements[i];
        break;
      }
    }
    // 最初の章より上に表紙（ヒーローや h1）がある場合は最上部（0）へ戻る
    if (nextTop === null && currentTop > 0) {
      nextTop = 0;
    }
  }

  if (nextTop !== null && nextTop !== undefined) {
    runtime.lastNavTargetTop = nextTop;
    runtime.lastNavTime = now;
    scroller.scrollTo({ top: nextTop, behavior: scrollBehavior() });
    if (nextEl && state.isVisualMode && document.querySelector('#visual-stage-container .exhibition-wrap.has-content-visibility')) {
      const expectedTime = now;
      requestAnimationFrame(() => {
        if (runtime.lastNavTime !== expectedTime || !nextEl.isConnected) return;
        const correctedTop = Math.min(Math.max(0, scroller.scrollHeight - scroller.clientHeight), previewScrollTopOf(nextEl, scroller));
        if (Math.abs(scroller.scrollTop - correctedTop) > 4) {
          runtime.lastNavTargetTop = correctedTop;
          scroller.scrollTo({ top: correctedTop, behavior: 'auto' });
        }
      });
    }
  }
}
