/* ==========================================================================
   図のドラッグ移動と Ctrl + ホイールの拡大・縮小（FR-038, FR-039）
   ========================================================================== */
export const DIAGRAM_VIEWPORT_SELECTOR = '.diagram-viewport, .exhibition-viewport';
// 倍率は原寸（viewBox の幅）に対する比。下限は全体を見渡せる大きさ、上限は細部の確認に足りる大きさ（DD-DIAG-071）
export const DIAGRAM_ZOOM_MIN = 0.25;
export const DIAGRAM_ZOOM_MAX = 4;
// ホイールの 1 ノッチ（deltaY = 100 px）で約 16% 拡大・縮小する
export const DIAGRAM_ZOOM_SENSITIVITY = 0.0015;
// これ以上動いたらドラッグとみなし、離したときのクリックを図に渡さない（DD-DIAG-070）
export const PAN_CLICK_TOLERANCE_PX = 4;

// ステージ発表中は、図の大きさと位置を発表の処理が決めるため、ドラッグと拡大・縮小を受け付けない
export function findDiagramViewport(target: EventTarget | null): HTMLElement | null {
  if (document.documentElement.classList.contains('is-stage-show')) return null;
  const vp = target instanceof Element ? (target.closest(DIAGRAM_VIEWPORT_SELECTOR) as HTMLElement | null) : null;
  return vp && vp.querySelector(':scope > svg') ? vp : null;
}

export function isScrollable(vp: HTMLElement): boolean {
  return vp.scrollWidth > vp.clientWidth + 1 || vp.scrollHeight > vp.clientHeight + 1;
}

// スクロール表示の図だけ、つかめることをカーソル（grab）で示す（DD-DIAG-070）
export function updatePannable(vp: HTMLElement | null): void {
  if (vp) vp.classList.toggle('is-pannable', isScrollable(vp));
}

export function clearDiagramZoom(vp: HTMLElement): void {
  if (!vp.classList.contains('is-zoomed')) return;
  vp.classList.remove('is-zoomed');
  delete vp.dataset.zoom;
  const svg = vp.querySelector(':scope > svg') as SVGElement | null;
  if (svg) svg.style.removeProperty('--zoom-width');
}

// 縦方向は図の表示枠ではなくプレビューがスクロールするため、拡大・縮小の基準点を保つときに使う
export function findScrollParent(el: Element): Element | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return document.scrollingElement;
}

// Ctrl + ホイールで、その図だけを、カーソルの位置を中心に拡大・縮小する（FR-039, DD-DIAG-071）
export function zoomDiagram(vp: HTMLElement, event: WheelEvent, onUpdateSplit?: (split: Element | null) => void): void {
  const svg = vp.querySelector(':scope > svg') as SVGSVGElement | null;
  const viewBox = svg?.viewBox?.baseVal;
  if (!viewBox || !viewBox.width) return;
  const before = svg.getBoundingClientRect();
  if (!before.width) return;
  const current = vp.classList.contains('is-zoomed') ? parseFloat(vp.dataset.zoom || '1') : before.width / viewBox.width;
  const deltaPx = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
  const next = Math.min(DIAGRAM_ZOOM_MAX, Math.max(DIAGRAM_ZOOM_MIN, current * Math.exp(-deltaPx * DIAGRAM_ZOOM_SENSITIVITY)));
  if (Math.abs(next - current) < 0.001) return;
  // カーソルの下にある図の点（図の幅・高さに対する比）
  const fx = (event.clientX - before.left) / before.width;
  const fy = (event.clientY - before.top) / before.height;

  vp.classList.remove('is-actual-size');
  vp.classList.add('is-zoomed');
  vp.dataset.zoom = String(next);
  svg.style.setProperty('--zoom-width', `${(viewBox.width * next).toFixed(1)}px`);
  const frame = vp.closest('[id^="diagram-frame-"]');
  if (frame) frame.querySelectorAll('.scale-btn').forEach(b => b.classList.remove('is-active'));
  
  if (onUpdateSplit) {
    onUpdateSplit(vp.closest('.exhibition-slab-split'));
  } else if ((window as any).updateSlabSplit) {
    (window as any).updateSlabSplit(vp.closest('.exhibition-slab-split'));
  }

  // 拡大・縮小の後も、同じ図の点がカーソルの下に来るようにスクロールする
  const after = svg.getBoundingClientRect();
  vp.scrollLeft += after.left + fx * after.width - event.clientX;
  const scroller = findScrollParent(vp);
  if (scroller) scroller.scrollTop += after.top + fy * after.height - event.clientY;
  updatePannable(vp);
}

export function setupDiagramPanZoom(onUpdateSplit?: (split: Element | null) => void): void {
  const pan: { vp: HTMLElement | null; pointerId: number | null; x: number; y: number; left: number; top: number; moved: boolean } = {
    vp: null,
    pointerId: null,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    moved: false
  };

  document.addEventListener('mouseover', event => updatePannable(findDiagramViewport(event.target)));

  // 図の上の Ctrl + ホイールは、ブラウザのページ全体のズームではなく、図の拡大・縮小にする（DD-DIAG-071）
  document.addEventListener('wheel', event => {
    if (!event.ctrlKey || !event.deltaY) return;
    const vp = findDiagramViewport(event.target);
    if (!vp) return;
    event.preventDefault();
    zoomDiagram(vp, event, onUpdateSplit);
  }, { passive: false });

  // スクロール表示の図をマウスでつかんで動かす（FR-038, DD-DIAG-070）
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    const vp = findDiagramViewport(event.target);
    if (!vp || (event.target as Element)?.closest('a, button') || !isScrollable(vp)) return;
    event.preventDefault();
    Object.assign(pan, { vp, pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop, moved: false });
    vp.setPointerCapture(event.pointerId);
    vp.classList.add('is-panning');
  });
  document.addEventListener('pointermove', event => {
    if (!pan.vp || event.pointerId !== pan.pointerId) return;
    const dx = event.clientX - pan.x;
    const dy = event.clientY - pan.y;
    if (Math.hypot(dx, dy) > PAN_CLICK_TOLERANCE_PX) pan.moved = true;
    pan.vp.scrollLeft = pan.left - dx;
    pan.vp.scrollTop = pan.top - dy;
  });
  const endPan = (event: PointerEvent) => {
    if (!pan.vp || event.pointerId !== pan.pointerId) return;
    pan.vp.classList.remove('is-panning');
    if (pan.vp.hasPointerCapture(event.pointerId)) pan.vp.releasePointerCapture(event.pointerId);
    // ドラッグの後のクリックで、図の中のリンク（Mermaid の click）などが動かないようにする
    // クリックが発生しなかったときに、次の本物のクリックを止めないよう、直後のタスクで外す
    if (pan.moved) {
      const swallow = (e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); };
      window.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }
    pan.vp = null;
    pan.pointerId = null;
  };
  document.addEventListener('pointerup', endPan);
  document.addEventListener('pointercancel', endPan);
}
