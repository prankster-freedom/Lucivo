// プレイアブル・ダイアグラム（#62、FR-055, DD-SHOW-120〜124）。
// 文書の中の状態遷移図を「画面の試作品」に、フローチャートを「質問に答えて進む診断」にして、触って動かせるようにする。
// js/modes/playable.js として別にビルドし、ヘッダーの「発表」のドロップダウンで選んだときだけ読み込む（NFR-006）。
// 登録表（modes.json）の行で提供の範囲を決める。本体のモジュールは import せず、enter(host) で受け取る host だけを使う（ARC-MODE-006）。
//
// 図の構造は Mermaid の原文から読み（playable-graph.ts）、図の SVG は今いる場所を灯すためだけに使う。
// 図は複製せず、描画済みの図の枠（[data-stage-index]）を一時的にこの画面へ移し、終えたら元の場所へ戻す。
import { parsePlayable, outgoing, END, PlayGraph, PlayEdge } from './playable-graph';

interface Playable {
  index: number;
  graph: PlayGraph;
  viewport: HTMLElement;
}

// enter(host) で受け取る、本体の機能（doc/2.ARCHITECTURE.md 4.16 の host の表）。このモードが使う分だけを書く
interface ModeHost {
  previewRoot(): HTMLElement | null;
  getMermaidSource(index: number): string | null;
  toast(message: string): void;
}

const play = {
  active: false,
  items: [] as Playable[],
  pos: 0,
  current: null as string | null,
  visited: [] as string[],
  lastEdge: null as PlayEdge | null,
  ended: false,
  overlay: null as HTMLElement | null,
  placeholder: null as Comment | null,
  audio: null as AudioContext | null
};

const PLAYABLE_TYPES = ['stateDiagram', 'flowchart-v2', 'flowchart'];

function escapeHtml(text: string): string {
  return String(text).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/* ------------------------------------------------------------------------
   図を集める
   ------------------------------------------------------------------------ */
function collect(host: ModeHost): Playable[] {
  const container = host.previewRoot();
  if (!container) return [];
  return Array.from(container.querySelectorAll('[data-stage-index]'))
    .map(el => {
      const viewport = el as HTMLElement;
      const svg = viewport.querySelector(':scope > svg');
      if (!svg || !PLAYABLE_TYPES.includes(svg.getAttribute('aria-roledescription') || '')) return null;
      const index = Number(viewport.dataset.stageIndex);
      const graph = parsePlayable(host.getMermaidSource(index) || '');
      // 動かせるのは、始まりがあり、矢印が 1 本以上ある図
      if (!graph || !graph.start || graph.edges.length === 0) return null;
      return { index, graph, viewport };
    })
    .filter(Boolean) as Playable[];
}

/* ------------------------------------------------------------------------
   図の上で、今いる場所を灯す
   ------------------------------------------------------------------------ */
function svgOf(item: Playable): SVGSVGElement | null {
  return item.viewport.querySelector(':scope > svg');
}

// Mermaid の SVG のノードの id は「…-flowchart-<id>-<番号>」「…-state-<id>-<番号>」
function nodeElement(item: Playable, id: string): Element | null {
  const svg = svgOf(item);
  if (!svg) return null;
  const kind = item.graph.kind === 'flow' ? 'flowchart' : 'state';
  const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const nodes = Array.from(svg.querySelectorAll('g.node'));
  const node = nodes.find(g => new RegExp(`-${kind}-${escaped}-\\d+$`).test(g.id));
  if (node) return node;
  // 入れ子の状態（中に状態を持つ状態）は、ノードではなく枠（g.cluster）として描かれる
  const clusters = Array.from(svg.querySelectorAll('g.cluster, g.statediagram-cluster'));
  return clusters.find(g => new RegExp(`(^|-)${escaped}(-\\d+)?$`).test(g.id)) || null;
}

// フローチャートの矢印は data-id が「L_<元>_<先>_<番号>」
function edgeElement(item: Playable, edge: PlayEdge): Element | null {
  const svg = svgOf(item);
  if (!svg || item.graph.kind !== 'flow') return null;
  return svg.querySelector(`path[data-id^="L_${CSS.escape(edge.from)}_${CSS.escape(edge.to)}_"]`);
}

function clearMarks(item: Playable): void {
  const svg = svgOf(item);
  if (!svg) return;
  svg.querySelectorAll('.is-play-current, .is-play-visited, .is-play-edge').forEach(el => {
    el.classList.remove('is-play-current', 'is-play-visited', 'is-play-edge');
  });
  svg.classList.remove('is-playing');
}

function markDiagram(item: Playable): void {
  clearMarks(item);
  const svg = svgOf(item);
  if (!svg) return;
  svg.classList.add('is-playing');
  play.visited.forEach(id => nodeElement(item, id)?.classList.add('is-play-visited'));
  if (play.current && !play.ended) nodeElement(item, play.current)?.classList.add('is-play-current');
  if (play.lastEdge) edgeElement(item, play.lastEdge)?.classList.add('is-play-edge');
}

/* ------------------------------------------------------------------------
   左の画面（状態遷移図は試作品の画面、フローチャートは診断のカード）
   ------------------------------------------------------------------------ */
function optionLabel(item: Playable, edge: PlayEdge): string {
  if (edge.label) return edge.label;
  if (edge.to === END) return '終了';
  const target = item.graph.nodes.get(edge.to);
  return `${target ? target.label : edge.to} へ`;
}

// 状態の注釈から、ワイヤーフレームの部品を推測する（入力・選択・それ以外は文の行）
function widgetFor(note: string): string {
  if (/入力|欄|フォーム|メール|パスワード|名前|検索/.test(note)) {
    return `<div class="playable-input"><span>${escapeHtml(note)}</span><span class="playable-input-box"></span></div>`;
  }
  if (/選択|選ぶ|チェック/.test(note)) {
    return `<div class="playable-check"><span class="playable-check-box"></span>${escapeHtml(note)}</div>`;
  }
  return `<p class="playable-line">${escapeHtml(note)}</p>`;
}

function screenHtml(item: Playable): string {
  const graph = item.graph;
  if (play.ended || !play.current) {
    return `<div class="playable-screen is-end">
      <p class="playable-eyebrow">${graph.kind === 'flow' ? 'RESULT' : 'END'}</p>
      <h3 class="playable-title">${graph.kind === 'flow' ? '診断はここまでです' : 'おわり'}</h3>
      <div class="playable-actions"><button type="button" class="playable-option is-primary" data-play-restart>最初から（R）</button></div>
    </div>`;
  }
  const node = graph.nodes.get(play.current);
  const edges = outgoing(graph, play.current);
  const buttons = edges.map((e, i) =>
    `<button type="button" class="playable-option${i === 0 ? ' is-primary' : ''}" data-play-option="${i}"><span class="playable-key">${i + 1}</span>${escapeHtml(optionLabel(item, e))}</button>`
  ).join('');
  if (graph.kind === 'flow') {
    const isResult = edges.length === 0;
    // 質問の番号は、ここまでに通った判定の数 + 1（今いる判定自身は数えない）
    const askedBefore = play.visited.slice(0, -1).filter(id => graph.nodes.get(id)?.decision).length;
    const eyebrow = isResult ? 'RESULT' : node.decision ? `QUESTION ${askedBefore + 1}` : 'STEP';
    return `<div class="playable-card${isResult ? ' is-result' : ''}${prefersReducedMotion() ? '' : ' is-entering'}">
      <p class="playable-eyebrow">${eyebrow}</p>
      <h3 class="playable-title">${escapeHtml(node.label)}</h3>
      <div class="playable-actions">${isResult ? '<button type="button" class="playable-option is-primary" data-play-restart>最初から（R）</button>' : buttons}</div>
    </div>`;
  }
  // 注釈のない状態は、画面らしく見えるよう、薄い線の仮の中身を置く（ワイヤーフレームの記号）
  const items = node.notes.length
    ? node.notes.map(widgetFor).join('')
    : '<span class="playable-skeleton"></span><span class="playable-skeleton is-short"></span><span class="playable-skeleton"></span>';
  return `<div class="playable-screen">
    <div class="playable-statusbar"><span></span><span></span><span></span></div>
    <h3 class="playable-title">${escapeHtml(node.label)}</h3>
    <div class="playable-body">${items}</div>
    <div class="playable-actions">${buttons || '<button type="button" class="playable-option is-primary" data-play-restart>最初から（R）</button>'}</div>
  </div>`;
}

function render(): void {
  const item = play.items[play.pos];
  const overlay = play.overlay;
  overlay.querySelector('.playable-device').innerHTML = screenHtml(item);
  overlay.querySelector('.playable-device').setAttribute('data-kind', item.graph.kind);
  overlay.querySelector('.playable-count').textContent = `図 ${play.pos + 1} / ${play.items.length}`;
  overlay.querySelector('.playable-kind').textContent = item.graph.kind === 'flow' ? '診断（フローチャート）' : '画面の試作品（状態遷移図）';
  (overlay.querySelector('[data-play-prev]') as HTMLButtonElement).disabled = play.pos === 0;
  (overlay.querySelector('[data-play-next]') as HTMLButtonElement).disabled = play.pos === play.items.length - 1;
  markDiagram(item);
}

/* ------------------------------------------------------------------------
   操作
   ------------------------------------------------------------------------ */
// ボタンを押したときの小さなクリック音（押した操作の手応え）。音を出せない環境では鳴らさない
function click(): void {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    play.audio = play.audio || new Ctx();
    const ctx = play.audio;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 1800;
    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (_) {
    // 音は手応えのためだけのもの。鳴らせなくても進む
  }
}

function startDiagram(pos: number): void {
  const prev = play.items[play.pos];
  if (prev) restoreViewport(prev);
  play.pos = Math.max(0, Math.min(play.items.length - 1, pos));
  const item = play.items[play.pos];
  moveViewport(item);
  restart(false);
}

function restart(withSound = true): void {
  const item = play.items[play.pos];
  play.current = item.graph.start;
  play.visited = play.current ? [play.current] : [];
  play.lastEdge = null;
  play.ended = false;
  if (withSound) click();
  render();
}

function choose(optionIndex: number): void {
  const item = play.items[play.pos];
  if (play.ended || !play.current) return;
  const edge = outgoing(item.graph, play.current)[optionIndex];
  if (!edge) return;
  click();
  play.lastEdge = edge;
  if (edge.to === END) {
    play.ended = true;
  } else {
    play.current = edge.to;
    play.visited.push(edge.to);
  }
  render();
}

function onOverlayClick(event: MouseEvent): void {
  const target = event.target as Element;
  const option = target.closest('[data-play-option]');
  if (option) { choose(Number(option.getAttribute('data-play-option'))); return; }
  if (target.closest('[data-play-restart]')) { restart(); return; }
  if (target.closest('[data-play-prev]')) { startDiagram(play.pos - 1); return; }
  if (target.closest('[data-play-next]')) { startDiagram(play.pos + 1); return; }
  if (target.closest('[data-play-exit]')) { exit(); return; }
  // 図のノードを押しても、その先へ移れる（今いる場所から矢印でつながるノードだけ）
  const nodeEl = target.closest('g.node');
  if (nodeEl && play.current) {
    const item = play.items[play.pos];
    const edges = outgoing(item.graph, play.current);
    const k = edges.findIndex(e => e.to !== END && nodeElement(item, e.to) === nodeEl);
    if (k >= 0) choose(k);
  }
}

function onKey(event: KeyboardEvent): void {
  if (!play.active || event.ctrlKey || event.metaKey || event.altKey) return;
  const key = event.key;
  if (key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    exit();
  } else if (key === 'r' || key === 'R') {
    event.preventDefault();
    event.stopPropagation();
    restart();
  } else if (/^[1-9]$/.test(key)) {
    event.preventDefault();
    event.stopPropagation();
    choose(Number(key) - 1);
  } else if (key === '[' || key === ']') {
    event.preventDefault();
    event.stopPropagation();
    startDiagram(play.pos + (key === ']' ? 1 : -1));
  }
}

/* ------------------------------------------------------------------------
   図の枠を移す・戻す
   ------------------------------------------------------------------------ */
function moveViewport(item: Playable): void {
  play.placeholder = document.createComment('playable-diagram');
  item.viewport.parentNode.insertBefore(play.placeholder, item.viewport);
  play.overlay.querySelector('.playable-figure').appendChild(item.viewport);
}

function restoreViewport(item: Playable): void {
  clearMarks(item);
  if (play.placeholder && play.placeholder.parentNode) {
    play.placeholder.parentNode.insertBefore(item.viewport, play.placeholder);
    play.placeholder.remove();
  }
  play.placeholder = null;
}

/* ------------------------------------------------------------------------
   始める・終える
   ------------------------------------------------------------------------ */
function buildOverlay(): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'playable';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'プレイアブル・ダイアグラム');
  overlay.innerHTML = `
    <header class="playable-header">
      <span class="playable-mode">PLAYABLE DIAGRAM</span>
      <span class="playable-kind"></span>
      <span class="playable-spacer"></span>
      <button type="button" class="playable-nav" data-play-prev aria-label="前の図">‹</button>
      <span class="playable-count"></span>
      <button type="button" class="playable-nav" data-play-next aria-label="次の図">›</button>
      <button type="button" class="playable-exit" data-play-exit aria-label="プレイアブル・ダイアグラムを終える">✕</button>
    </header>
    <div class="playable-stage">
      <div class="playable-device" aria-live="polite"></div>
      <div class="playable-figure"></div>
    </div>
    <p class="playable-hint">ボタン（1〜9）で進む ／ 図の矢印の先のノードを押しても進む ／ R 最初から ／ [ ] 図の切り替え ／ Esc 終了</p>`;
  overlay.addEventListener('click', onOverlayClick);
  document.body.appendChild(overlay);
  return overlay;
}

function enter(host: ModeHost): boolean {
  if (play.active) return true;
  const items = collect(host);
  if (!items.length) {
    host.toast('動かせる図（状態遷移図・フローチャート）がありません');
    return false;
  }
  play.items = items;
  play.active = true;
  play.overlay = buildOverlay();
  document.documentElement.classList.add('is-playable');
  document.addEventListener('keydown', onKey, true);
  play.pos = 0;
  moveViewport(items[0]);
  restart(false);
  (play.overlay.querySelector('.playable-option') as HTMLElement | null)?.focus();
  return true;
}

function exit(): void {
  if (!play.active) return;
  restoreViewport(play.items[play.pos]);
  play.active = false;
  document.removeEventListener('keydown', onKey, true);
  document.documentElement.classList.remove('is-playable');
  play.overlay?.remove();
  play.overlay = null;
  play.items = [];
}

function info() {
  const item = play.items[play.pos];
  return {
    active: play.active,
    count: play.items.length,
    pos: play.pos,
    kind: item ? item.graph.kind : null,
    current: play.current,
    ended: play.ended,
    visited: [...play.visited],
    options: item && play.current && !play.ended ? outgoing(item.graph, play.current).map(e => optionLabel(item, e)) : []
  };
}

// 本体が読み込んだとき（発表のドロップダウンで選ばれたとき）に、自分を登録する。choose・restart・startDiagram はテストが使う
(window as unknown as { LucivoModes: { register(id: string, mode: object): void } }).LucivoModes.register('playable', { enter, exit, info, choose, restart, startDiagram });
