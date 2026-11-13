// ズーミング・マップ（#61、FR-054, DD-SHOW-110〜114）。
// Visualモードで組んだ表紙と章を、1 枚の大きな平面（地図）の上に道の形で並べ、カメラが章から章へ飛ぶ。
// js/zoom-map.js として別にビルドし、ヘッダーの「発表」のドロップダウンで選んだときだけ読み込む（#58、NFR-006）。
// Web 版だけで有効にする（呼び出す側の app.ts が、Web 版のときだけ入口を出す）。
//
// 章は複製せず、Visualモードの DOM（.exhibition-wrap の子）をそのまま並べ直す。複製すると図の SVG の id が重複し、
// 矢じりやグラデーションの参照が崩れるため。終わったら、付けたスタイルをすべて外して元の組版に戻す。

interface Rect { x: number; y: number; w: number; h: number; }
interface Step { rect: Rect; node: number; label: string; }
interface Camera { cx: number; cy: number; w: number; }

// 地図の寸法（平面の座標。CSS ピクセル）
const MAP = {
  cardWidth: 1200,
  gapX: 260,
  gapY: 220,
  maxCols: 4,
  // カメラで対象を映すときの、画面に対する余白の割合
  margin: 0.06,
  // 章の中を区切って寄るときの、区切りの縦横比（16:9）
  segmentAspect: 9 / 16,
  // 章を映したときの拡大率がこれより小さい（文字が読めないほど縮む）ときは、章の中を区切って寄る
  minReadableScale: 0.62,
  // 画面の下の操作の帯の高さ。この分を除いた範囲に映す
  hudReserve: 76
};

// カメラの動き（van Wijk と Nuij の滑らかなズーム。いったん引いてから寄る）
const FLIGHT = { rho: Math.SQRT2, minMs: 1000, maxMs: 1400, msPerUnit: 700 };

const state = {
  active: false,
  root: null as HTMLElement | null,
  wrap: null as HTMLElement | null,
  nodes: [] as HTMLElement[],
  nodeRects: [] as Rect[],
  steps: [] as Step[],
  index: 0,
  camera: { cx: 0, cy: 0, w: 1 } as Camera,
  frame: 0,
  hud: null as HTMLElement | null,
  path: null as SVGSVGElement | null,
  // 地図の平面の大きさ。.exhibition-wrap の幅は章の幅のままにする（下記の layoutMap() の説明）
  plane: { w: 0, h: 0 },
  restore: null as null | { viewMode: string; isVisualMode: boolean; scrollTop: number; lights: boolean; fullscreen: boolean }
};

const win = window as unknown as {
  state: { viewMode: string; isVisualMode: boolean; signalLightsEnabled?: boolean };
  LucivoStage?: { toggleLights?: (on: boolean) => void };
  showToast?: (message: string) => void;
  updateAllSlabSplits?: () => void;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// カメラで映せる範囲（下の操作の帯の分を除く）
function viewport() {
  return { w: window.innerWidth, h: Math.max(200, window.innerHeight - MAP.hudReserve) };
}

/* ------------------------------------------------------------------------
   地図の組み立て
   ------------------------------------------------------------------------ */
// 表紙と章を、左から右へ進み、行ごとに折り返す道の形に置く。章が多い文書（15 以上）も、行を増やして並べる
function layoutMap(): void {
  const wrap = state.wrap;
  const n = state.nodes.length;
  const cols = Math.min(MAP.maxCols, Math.max(1, Math.ceil(Math.sqrt(n * 1.2))));
  // .exhibition-wrap は container queries の基準（container-type: inline-size）のため、幅は章の幅のままにし、
  // 章はその外へはみ出す位置に置く。平面の全体の幅を付けると、章の中の組版が広い画面向けに切り替わる
  wrap.style.width = `${MAP.cardWidth}px`;
  state.plane.w = cols * MAP.cardWidth + (cols - 1) * MAP.gapX;
  state.nodes.forEach(node => {
    node.style.width = `${MAP.cardWidth}px`;
  });
  // 章の幅を変えると、本文と図の 2 段組みの判定や図の大きさが変わる。並べ直してから高さを測る
  win.updateAllSlabSplits?.();
  const heights = state.nodes.map(node => node.offsetHeight);
  const rows = Math.ceil(n / cols);
  const rowHeights = Array.from({ length: rows }, (_, r) => Math.max(...heights.slice(r * cols, r * cols + cols)));
  let top = 0;
  state.nodeRects = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= n) break;
      // 奇数の行は右から左へ進む（道が折り返す）
      const col = r % 2 === 0 ? c : cols - 1 - c;
      const x = col * (MAP.cardWidth + MAP.gapX);
      // 行の中で、章を縦の中央にそろえる
      const y = top + (rowHeights[r] - heights[i]) / 2;
      const node = state.nodes[i];
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      state.nodeRects.push({ x, y, w: MAP.cardWidth, h: heights[i] });
    }
    top += rowHeights[r] + MAP.gapY;
  }
  state.plane.h = Math.max(0, top - MAP.gapY);
  wrap.style.height = `${state.plane.h}px`;
  drawPath();
}

// 章の順番を、章の中心を結ぶ細い道で示す
function drawPath(): void {
  const NS = 'http://www.w3.org/2000/svg';
  state.path?.remove();
  const svg = document.createElementNS(NS, 'svg') as SVGSVGElement;
  svg.classList.add('zoom-map-path');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', String(state.plane.w));
  svg.setAttribute('height', String(state.plane.h));
  const points = state.nodeRects.map(r => `${r.x + r.w / 2},${r.y + r.h / 2}`).join(' ');
  const line = document.createElementNS(NS, 'polyline');
  line.setAttribute('points', points);
  svg.appendChild(line);
  state.wrap.prepend(svg);
  state.path = svg;
}

/* ------------------------------------------------------------------------
   カメラの止まる場所（ステップ）
   ------------------------------------------------------------------------ */
function fitScale(rect: Rect): number {
  const vp = viewport();
  const usableW = vp.w * (1 - MAP.margin * 2);
  const usableH = vp.h * (1 - MAP.margin * 2);
  return Math.min(usableW / rect.w, usableH / rect.h);
}

// 平面の座標での、要素の矩形（カメラの拡大率と位置を戻して求める）
function planeRectOf(el: Element, node: HTMLElement, nodeRect: Rect): Rect {
  const r = el.getBoundingClientRect();
  const n = node.getBoundingClientRect();
  const s = n.width / nodeRect.w;
  return { x: nodeRect.x + (r.left - n.left) / s, y: nodeRect.y + (r.top - n.top) / s, w: r.width / s, h: r.height / s };
}

// 区間が画面に収まらない（文字が読めないほど縮む）ときは、上から 16:9 の区切りで順に寄る
function segmentsOf(rect: Rect, nodeIndex: number, label: string): Step[] {
  if (fitScale(rect) >= MAP.minReadableScale) return [{ rect, node: nodeIndex, label }];
  const segH = rect.w * MAP.segmentAspect;
  const count = Math.ceil(rect.h / segH);
  return Array.from({ length: count }, (_, k) => ({
    rect: { x: rect.x, y: rect.y + Math.min(k * segH, Math.max(0, rect.h - segH)), w: rect.w, h: Math.min(segH, rect.h) },
    node: nodeIndex,
    label: count > 1 ? `${label}（${k + 1} / ${count}）` : label
  }));
}

// 章の中で寄る場所。小見出し（h3）があれば、小見出しから次の小見出しの手前までに寄る。
// なければ、画面に収まらない長い章だけ、上から 16:9 の区切りで順に寄る
function subSteps(node: HTMLElement, nodeRect: Rect, nodeIndex: number, chapterLabel: string): Step[] {
  const headings = Array.from(node.querySelectorAll('h3'));
  if (headings.length) {
    return headings.flatMap((h, k) => {
      const top = planeRectOf(h, node, nodeRect).y;
      const next = headings[k + 1];
      const bottom = next ? planeRectOf(next, node, nodeRect).y : nodeRect.y + nodeRect.h;
      const rect = { x: nodeRect.x, y: top - 24, w: nodeRect.w, h: Math.max(160, bottom - top + 24) };
      return segmentsOf(rect, nodeIndex, h.textContent.trim());
    });
  }
  if (fitScale(nodeRect) >= MAP.minReadableScale) return [];
  return segmentsOf(nodeRect, nodeIndex, chapterLabel);
}

// 章の名前。章の見出しの番号の飾り（STAGE 01）は除く。見出しのない章（前書き）は、最初の文の書き出しにする
function nodeLabel(node: HTMLElement): string {
  const title = node.querySelector('h2 span:last-child') || node.querySelector('h2') || node.querySelector('.vs-cover-title, h1');
  if (title) return title.textContent.trim();
  const text = node.textContent.replace(/\s+/g, ' ').trim();
  return text.length > 28 ? `${text.slice(0, 28)}…` : text;
}

function mapRect(): Rect {
  return { x: 0, y: 0, w: state.plane.w, h: state.plane.h };
}

// 全体の地図 → 表紙 → 章（→ 章の中） → … → 全体の地図、の順に止まる
function buildSteps(): void {
  const overview: Step = { rect: mapRect(), node: -1, label: '全体の地図' };
  const steps: Step[] = [overview];
  state.nodes.forEach((node, i) => {
    const label = nodeLabel(node);
    steps.push({ rect: state.nodeRects[i], node: i, label });
    steps.push(...subSteps(node, state.nodeRects[i], i, label));
  });
  steps.push({ ...overview });
  state.steps = steps;
}

/* ------------------------------------------------------------------------
   カメラ
   ------------------------------------------------------------------------ */
function cameraFor(rect: Rect): Camera {
  const s = fitScale(rect);
  return { cx: rect.x + rect.w / 2, cy: rect.y + rect.h / 2, w: viewport().w / s };
}

function applyCamera(cam: Camera): void {
  const vp = viewport();
  const s = vp.w / cam.w;
  const tx = vp.w / 2 - cam.cx * s;
  // 下の操作の帯を除いた範囲の中央に映す
  const ty = vp.h / 2 - cam.cy * s;
  state.wrap.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${s.toFixed(5)})`;
  state.camera = cam;
}

// van Wijk と Nuij の「Smooth and efficient zooming and panning」の補間。
// 遠い場所へは、いったん引いて（見える範囲を広げて）から寄るため、全体のどこへ移ったかが動きで分かる
function zoomInterpolator(a: Camera, b: Camera): { at: (t: number) => Camera; length: number } {
  const rho = FLIGHT.rho;
  const rho2 = rho * rho;
  const rho4 = rho2 * rho2;
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const d2 = dx * dx + dy * dy;
  if (d2 < 1e-6) {
    const S = Math.log(b.w / a.w) / rho;
    return { length: Math.abs(S), at: t => ({ cx: a.cx + t * dx, cy: a.cy + t * dy, w: a.w * Math.exp(rho * t * S) }) };
  }
  const d1 = Math.sqrt(d2);
  const b0 = (b.w * b.w - a.w * a.w + rho4 * d2) / (2 * a.w * rho2 * d1);
  const b1 = (b.w * b.w - a.w * a.w - rho4 * d2) / (2 * b.w * rho2 * d1);
  const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0);
  const r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
  const S = (r1 - r0) / rho;
  const coshr0 = Math.cosh(r0);
  return {
    length: S,
    at: t => {
      const s = t * S;
      const u = (a.w / (rho2 * d1)) * (coshr0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return { cx: a.cx + u * dx, cy: a.cy + u * dy, w: (a.w * coshr0) / Math.cosh(rho * s + r0) };
    }
  };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function flyTo(target: Camera): Promise<void> {
  cancelAnimationFrame(state.frame);
  if (prefersReducedMotion()) {
    applyCamera(target);
    return Promise.resolve();
  }
  const from = { ...state.camera };
  const path = zoomInterpolator(from, target);
  const duration = Math.max(FLIGHT.minMs, Math.min(FLIGHT.maxMs, Math.abs(path.length) * FLIGHT.msPerUnit));
  const start = performance.now();
  state.root.classList.add('is-flying');
  return new Promise(resolve => {
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      applyCamera(path.at(easeInOut(t)));
      if (t < 1) {
        state.frame = requestAnimationFrame(tick);
        return;
      }
      applyCamera(target);
      // 動き終わったら will-change を外し、拡大した文字をぼかさずに描き直させる
      state.root.classList.remove('is-flying');
      resolve();
    };
    state.frame = requestAnimationFrame(tick);
  });
}

/* ------------------------------------------------------------------------
   進み方と表示
   ------------------------------------------------------------------------ */
function updateHud(): void {
  if (!state.hud) return;
  const step = state.steps[state.index];
  state.hud.querySelector('.zoom-map-label').textContent = step.label;
  state.hud.querySelector('.zoom-map-count').textContent = `${state.index + 1} / ${state.steps.length}`;
  state.nodes.forEach((node, i) => node.classList.toggle('is-zoom-current', i === step.node));
}

function goTo(index: number): Promise<void> {
  state.index = Math.max(0, Math.min(state.steps.length - 1, index));
  updateHud();
  return flyTo(cameraFor(state.steps[state.index].rect));
}

function next(): void {
  if (state.index >= state.steps.length - 1) return;
  goTo(state.index + 1);
}

function prev(): void {
  if (state.index <= 0) return;
  goTo(state.index - 1);
}

// 地図の上の章を押すと、その章へ飛ぶ
function onClick(event: MouseEvent): void {
  const target = event.target as Element;
  if (target.closest('.zoom-map-hud')) return;
  const node = target.closest('.exhibition-wrap > .exhibition-hero, .exhibition-wrap > .exhibition-slab');
  if (!node) return;
  const i = state.nodes.indexOf(node as HTMLElement);
  const stepIndex = state.steps.findIndex(s => s.node === i);
  if (i < 0 || stepIndex < 0) return;
  event.preventDefault();
  event.stopPropagation();
  if (state.steps[state.index].node !== i) goTo(stepIndex);
  else next();
}

function onKey(event: KeyboardEvent): void {
  if (!state.active || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  const handled = ['ArrowRight', 'ArrowDown', ' ', 'PageDown', 'Enter', 'ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'Home', 'End', 'Escape'];
  if (!handled.includes(key)) return;
  event.preventDefault();
  event.stopPropagation();
  if (key === 'Escape') exit();
  else if (key === 'Home') goTo(0);
  else if (key === 'End') goTo(state.steps.length - 1);
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(key)) prev();
  else next();
}

function onResize(): void {
  if (!state.active) return;
  cancelAnimationFrame(state.frame);
  state.root.classList.remove('is-flying');
  layoutMap();
  buildSteps();
  state.index = Math.min(state.index, state.steps.length - 1);
  updateHud();
  applyCamera(cameraFor(state.steps[state.index].rect));
}

function buildHud(): HTMLElement {
  const hud = document.createElement('div');
  hud.className = 'zoom-map-hud';
  hud.innerHTML = `
    <span class="zoom-map-mode">ZOOMING MAP</span>
    <span class="zoom-map-label"></span>
    <span class="zoom-map-count"></span>
    <span class="zoom-map-hint">→ 次へ ／ ← 戻る ／ Home 全体 ／ Esc 終了</span>
    <button type="button" class="zoom-map-exit" aria-label="ズーミング・マップを終える">✕</button>`;
  hud.querySelector('.zoom-map-exit').addEventListener('click', () => exit());
  document.body.appendChild(hud);
  return hud;
}

/* ------------------------------------------------------------------------
   始める・終える
   ------------------------------------------------------------------------ */
function waitFrames(count: number): Promise<void> {
  return new Promise(resolve => {
    const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    step(count);
  });
}

async function enter(): Promise<boolean> {
  if (state.active) return true;
  const app = win.state;
  const scroller = document.getElementById('preview-scroll');
  state.restore = {
    viewMode: app.viewMode,
    isVisualMode: app.isVisualMode,
    scrollTop: scroller ? scroller.scrollTop : 0,
    lights: app.signalLightsEnabled !== false,
    fullscreen: false
  };
  if (!app.isVisualMode) (document.getElementById('btn-visual-mode') as HTMLButtonElement | null)?.click();
  if (app.viewMode !== 'canvas') (document.querySelector('[data-view-mode="canvas"]') as HTMLButtonElement | null)?.click();
  // Visualモードへ切り替えた直後は、図の描画が終わるまで待つ
  await waitFrames(2);
  const root = document.getElementById('visual-stage-container');
  const wrap = root?.querySelector('.exhibition-wrap') as HTMLElement | null;
  const nodes = wrap ? Array.from(wrap.querySelectorAll(':scope > .exhibition-hero, :scope > .exhibition-slab')) as HTMLElement[] : [];
  const hasText = (document.getElementById('markdown-editor') as HTMLTextAreaElement).value.trim() !== '';
  if (!wrap || !nodes.length || !hasText) {
    restoreView();
    win.showToast?.('ズーミング・マップで見せる章がありません');
    return false;
  }
  state.root = root;
  state.wrap = wrap;
  state.nodes = nodes;
  state.active = true;
  // 地図の上では、図の光を止める（全体を映したときに、すべての図が同時に動くと重い）
  win.LucivoStage?.toggleLights?.(false);
  document.documentElement.classList.add('is-zoom-map');
  layoutMap();
  buildSteps();
  state.hud = buildHud();
  state.index = 0;
  applyCamera(cameraFor(state.steps[0].rect));
  updateHud();
  document.addEventListener('keydown', onKey, true);
  root.addEventListener('click', onClick, true);
  window.addEventListener('resize', onResize);
  const fullscreen = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  if (fullscreen) fullscreen.then(() => { if (state.restore) state.restore.fullscreen = true; }, () => {});
  return true;
}

function restoreView(): void {
  const r = state.restore;
  if (!r) return;
  const app = win.state;
  if (app.viewMode !== r.viewMode) (document.querySelector(`[data-view-mode="${r.viewMode}"]`) as HTMLButtonElement | null)?.click();
  if (app.isVisualMode !== r.isVisualMode) {
    (document.getElementById(r.isVisualMode ? 'btn-visual-mode' : 'btn-mode-fast') as HTMLButtonElement | null)?.click();
  }
}

function exit(): void {
  if (!state.active) return;
  cancelAnimationFrame(state.frame);
  state.active = false;
  document.removeEventListener('keydown', onKey, true);
  state.root.removeEventListener('click', onClick, true);
  window.removeEventListener('resize', onResize);
  document.documentElement.classList.remove('is-zoom-map');
  state.root.classList.remove('is-flying');
  state.path?.remove();
  state.path = null;
  state.hud?.remove();
  state.hud = null;
  ['transform', 'width', 'height'].forEach(p => state.wrap.style.removeProperty(p));
  state.nodes.forEach(node => {
    ['left', 'top', 'width'].forEach(p => node.style.removeProperty(p));
    node.classList.remove('is-zoom-current');
  });
  win.updateAllSlabSplits?.();
  const restore = state.restore;
  win.LucivoStage?.toggleLights?.(restore.lights);
  if (restore.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  restoreView();
  const scroller = document.getElementById('preview-scroll');
  if (scroller) scroller.scrollTop = restore.scrollTop;
  state.restore = null;
}

function info() {
  return {
    active: state.active,
    index: state.index,
    steps: state.steps.map(s => ({ node: s.node, label: s.label })),
    camera: { ...state.camera }
  };
}

(window as unknown as { LucivoZoomMap: unknown }).LucivoZoomMap = { enter, exit, next, prev, goTo, info };
