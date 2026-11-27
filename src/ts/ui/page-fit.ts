// @ts-nocheck
// 版面の比率とページ割り（FR-070, ARC-PAGE-001〜005, DD-VTPL-150〜156）
// Visualモードのページ単位で、表紙と各章を比率の箱（ページ）にし、収まらない章は段階的に詰め、
// 最後の段階でも収まらなければ、本文の切れ目で続きのページに分ける。
// ページの形はここで 1 回だけ決め、ステージ発表（一様な拡大）と印刷（1 対 1）は、その結果をそのまま使う。
// 計算後のスタイル（getComputedStyle）は読まない（TC-VTPL-010）。余白は CSS（visual-page.css）と同じ定数で持つ。
import { state } from './state';
import { t } from '../i18n';

// 段階ごとの本文の zoom と、章の下の余白（px。visual-page.css の --page-pad と同じ値）
const STEP_ZOOM = [1, 1, 0.92, 0.84, 0.75];
const STEP_PAD_BOTTOM = [32, 22, 22, 22, 22];
const STEP_MAX = STEP_ZOOM.length - 1;
// 段階ごとの本文の高さの目安（段階 0 に対する比。余白・行間を詰める分と zoom を合わせた見積もり）
const STEP_ESTIMATE = [1, 0.94, 0.87, 0.79, 0.71];
// 図の表示枠の上下の余白（px。visual-page.css）
const VIEWPORT_PAD = 24;
// 図に残す高さの下限（本文の高さに対する比。DD-VTPL-154）
const FIGURE_MIN_RATIO = 0.4;
// 1 コマで使う時間（ms。DD-VTPL-156）
const FRAME_BUDGET = 12;
const TOLERANCE = 0.5;

const BODY_EXCLUDE = new Set(['H2']);
const BODY_EXCLUDE_CLASSES = ['front-matter', 'slab-actions', 'page-continued', 'vs-cover-texture', 'vs-watermark-num'];
const SUBHEADING_TAGS = new Set(['H3', 'H4', 'H5', 'H6']);
const TRANSPARENT_SELECTOR = '.vs-two-col-body, .exhibition-slab-body, .exhibition-slab-prose';

let pfSeq = 0;
let groupSeq = 0;
const queue = new Set<HTMLElement>();
let frameScheduled = false;
let observedWrap: HTMLElement | null = null;
let lastWrapWidth = 0;
let resizeTimer = 0;
// 幅の変化を受けて、間引いた決め直しを待っている間は true（その間の flushPageFit で取りこぼさないように）
let resizePending = false;
let resizeObserver: ResizeObserver | null = null;
let portraitQuery: MediaQueryList | null = null;

/* ==========================================================================
   比率（DD-VTPL-150）
   ========================================================================== */
// 実際に使う比率。7b では横 16:10 だけを当て、縦長の画面（auto で 10:16 になる場合）は比率を当てない
function effectiveRatio(): string | null {
  if (!state.isVisualMode || state.visualLayout !== 'page') return null;
  const choice = state.pageRatio || 'auto';
  if (choice === '16:10') return '16:10';
  if (choice === '10:16') return null;
  if (!portraitQuery && typeof matchMedia === 'function') portraitQuery = matchMedia('(orientation: portrait)');
  return portraitQuery && portraitQuery.matches ? null : '16:10';
}

export function isPageBoxActive(): boolean {
  return Boolean(document.documentElement.dataset.pageRatio);
}

// <html data-page-ratio> を、今の状態に合わせる。変わったら true
export function syncPageRatio(): boolean {
  const root = document.documentElement;
  const next = effectiveRatio();
  const prev = root.dataset.pageRatio || null;
  if (next === prev) return false;
  if (next) root.dataset.pageRatio = next;
  else delete root.dataset.pageRatio;
  return true;
}

/* ==========================================================================
   ページの要素
   ========================================================================== */
function getWrap(): HTMLElement | null {
  return document.querySelector('#visual-stage-container .exhibition-wrap');
}

function isPage(el: Element | null): el is HTMLElement {
  return Boolean(el && el.nodeType === 1 && (el.classList.contains('exhibition-slab') || el.classList.contains('exhibition-hero')));
}

function firstPageOf(el: HTMLElement): HTMLElement {
  let cur = el;
  while (cur.classList.contains('is-continuation') && isPage(cur.previousElementSibling)) cur = cur.previousElementSibling as HTMLElement;
  return cur;
}

function continuationsOf(first: HTMLElement): HTMLElement[] {
  const list = [];
  let next = first.nextElementSibling;
  while (isPage(next) && next.classList.contains('is-continuation')) {
    list.push(next as HTMLElement);
    next = next.nextElementSibling;
  }
  return list;
}

function isBodyChild(el: Element): boolean {
  if (BODY_EXCLUDE.has(el.tagName)) return false;
  return !BODY_EXCLUDE_CLASSES.some(c => el.classList.contains(c));
}

function bodyChildren(page: HTMLElement): HTMLElement[] {
  return Array.from(page.children).filter(isBodyChild) as HTMLElement[];
}

// 図の表示枠の外側のスケール（変換の倍率）。ステージ発表の拡大の間も比で測れるようにする
function pageScale(page: HTMLElement): number {
  const w = page.offsetWidth;
  return w ? page.getBoundingClientRect().width / w : 1;
}

function stepOf(page: HTMLElement): number {
  return Number(page.dataset.fitStep || 0);
}

function zoomOf(page: HTMLElement): number {
  const extra = Number(page.style.getPropertyValue('--page-zoom-extra') || 1);
  return STEP_ZOOM[stepOf(page)] * extra;
}

function applyStep(page: HTMLElement, step: number) {
  page.dataset.fitStep = String(step);
  page.style.removeProperty('--page-zoom-extra');
  page.style.setProperty('--page-zoom', String(STEP_ZOOM[step]));
}

// 章の内容の箱の下端（画面の座標）
function contentLimit(page: HTMLElement): number {
  const rect = page.getBoundingClientRect();
  const k = pageScale(page);
  return rect.top + (page.clientTop + page.clientHeight - STEP_PAD_BOTTOM[stepOf(page)]) * k;
}

function overflowOf(page: HTMLElement): number {
  const kids = bodyChildren(page);
  if (!kids.length) return 0;
  const last = kids[kids.length - 1];
  return last.getBoundingClientRect().bottom - contentLimit(page);
}

/* ==========================================================================
   図の高さ（DD-VTPL-153）
   ========================================================================== */
function topLevelChild(page: HTMLElement, el: Element): HTMLElement | null {
  let cur = el;
  while (cur && cur.parentElement !== page) cur = cur.parentElement;
  return cur as HTMLElement | null;
}

// 図ごとに、表示枠の高さの目安（--fit-area-height）を、版面の残りの高さで上書きする
function setFigureAreas(page: HTMLElement) {
  const viewports = Array.from(page.querySelectorAll('.exhibition-viewport, .diagram-viewport')) as HTMLElement[];
  const kids = bodyChildren(page);
  if (!kids.length) return;
  const k = pageScale(page);
  const z = zoomOf(page);
  const limit = contentLimit(page);
  const bodyTop = kids[0].getBoundingClientRect().top;
  const bodyH = Math.max(1, limit - bodyTop);
  const minArea = (bodyH * FIGURE_MIN_RATIO) / (k * z);
  // 書き込むと次の読み取りで組み直しが走るため、値が変わるときだけ書く
  const bodyHeight = `${Math.round(bodyH / (k * z))}px`;
  if (page.style.getPropertyValue('--page-body-height') !== bodyHeight) page.style.setProperty('--page-body-height', bodyHeight);
  if (!viewports.length) return;
  viewports.forEach(vp => vp.style.setProperty('--fit-area-height', `${Math.round(minArea)}px`));
  const last = kids[kids.length - 1];
  viewports.forEach(vp => {
    const top = topLevelChild(page, vp);
    if (!top) return;
    const vpRect = vp.getBoundingClientRect();
    const card = vp.closest('.exhibition-diagram-card') || vp;
    const cardBottom = card.getBoundingClientRect().bottom;
    const after = Math.max(0, last.getBoundingClientRect().bottom - top.getBoundingClientRect().bottom);
    const chrome = 2 * VIEWPORT_PAD * k * z + Math.max(0, cardBottom - vpRect.bottom);
    const remaining = (limit - vpRect.top - chrome - after) / (k * z);
    vp.style.setProperty('--fit-area-height', `${Math.round(Math.max(minArea, remaining))}px`);
  });
}

function fits(page: HTMLElement): boolean {
  setFigureAreas(page);
  return overflowOf(page) <= TOLERANCE;
}

/* ==========================================================================
   分ける（DD-VTPL-154）
   ========================================================================== */
function ensureId(el: HTMLElement): string {
  if (!el.dataset.pfId) el.dataset.pfId = String(++pfSeq);
  return el.dataset.pfId;
}

function shallowClone(el: HTMLElement): HTMLElement {
  const id = ensureId(el);
  const clone = el.cloneNode(false) as HTMLElement;
  clone.removeAttribute('id');
  delete clone.dataset.pfId;
  clone.dataset.pfClone = id;
  return clone;
}

function isFigure(el: HTMLElement): boolean {
  return el.matches('.lucivo-slot, .exhibition-diagram-card, .vs-single-image-wrap, figure, .lucivo-math.has-math-plot')
    || Boolean(el.querySelector(':scope > .lucivo-slot, :scope > .exhibition-diagram-card'));
}

function isTextBlock(el: HTMLElement): boolean {
  if (el.tagName === 'P') return true;
  if (el.tagName === 'PRE') return Boolean(el.querySelector(':scope > code'));
  if (el.tagName === 'LI') return !el.querySelector(':scope > :is(ul, ol, p, pre, table, div, blockquote)');
  return false;
}

// 入れ物の中の項目と、複製を受ける要素を返す。分けられない要素は null
function descendInto(el: HTMLElement): { items: HTMLElement[]; clone: HTMLElement; target: HTMLElement } | null {
  if (el.tagName === 'UL' || el.tagName === 'OL' || el.tagName === 'DL') {
    const clone = shallowClone(el);
    return { items: Array.from(el.children) as HTMLElement[], clone, target: clone };
  }
  const table = el.tagName === 'TABLE' ? el : (el.classList.contains('table-container') ? el.querySelector(':scope > table') : null);
  if (table) {
    const tbody = table.querySelector(':scope > tbody') as HTMLElement | null;
    if (!tbody) return null;
    const clone = shallowClone(el);
    const tableClone = table === el ? clone : shallowClone(table as HTMLElement);
    if (tableClone !== clone) clone.appendChild(tableClone);
    const thead = table.querySelector(':scope > thead');
    if (thead) {
      const headClone = thead.cloneNode(true) as HTMLElement;
      headClone.dataset.pfDrop = '1';
      tableClone.appendChild(headClone);
    }
    const bodyClone = shallowClone(tbody);
    tableClone.appendChild(bodyClone);
    return { items: Array.from(tbody.children) as HTMLElement[], clone, target: bodyClone };
  }
  if (el.matches(TRANSPARENT_SELECTOR)) {
    const clone = shallowClone(el);
    return { items: (Array.from(el.children) as HTMLElement[]).filter(isBodyChild), clone, target: clone };
  }
  return null;
}

// 文字ごとの位置を測り、下端を超える最初の文字（あふれる行の先頭）で、文の後ろを取り出す
function splitText(el: HTMLElement, limit: number, target: HTMLElement): boolean {
  const host = el.tagName === 'PRE' ? el.querySelector(':scope > code') as HTMLElement : el;
  if (!host) return false;
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const charBottom = (node: Text, i: number): number => {
    range.setStart(node, i);
    range.setEnd(node, i + 1);
    const r = range.getBoundingClientRect();
    return r.height ? r.bottom : -Infinity;
  };
  let found: { node: Text; offset: number } | null = null;
  let seenBefore = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const len = node.data.length;
    if (!len) continue;
    range.selectNodeContents(node);
    const whole = range.getBoundingClientRect();
    if (!whole.height || whole.bottom <= limit) {
      if (node.data.trim()) seenBefore = true;
      continue;
    }
    let lo = 0;
    let hi = len - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (charBottom(node, mid) > limit) hi = mid;
      else lo = mid + 1;
    }
    if (charBottom(node, lo) <= limit) continue;
    // コードは行の先頭（改行の直後）まで戻す
    if (el.tagName === 'PRE') {
      const nl = node.data.lastIndexOf('\n', lo - 1);
      lo = nl >= 0 ? nl + 1 : 0;
    }
    if (lo > 0 && node.data.slice(0, lo).trim()) seenBefore = true;
    found = { node, offset: lo };
    break;
  }
  if (!found || !seenBefore) return false;
  range.setStart(found.node, found.offset);
  range.setEnd(host, host.childNodes.length);
  const frag = range.extractContents();
  ensureId(el);
  let clone: HTMLElement;
  if (el.tagName === 'PRE') {
    clone = el.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    delete clone.dataset.pfId;
    const code = clone.querySelector(':scope > code') as HTMLElement;
    code.textContent = '';
    code.appendChild(frag);
  } else {
    clone = el.cloneNode(false) as HTMLElement;
    clone.removeAttribute('id');
    delete clone.dataset.pfId;
    clone.appendChild(frag);
    if (el.tagName === 'LI') clone.classList.add('is-pf-split-item');
  }
  clone.dataset.pfSplit = el.dataset.pfId;
  target.appendChild(clone);
  return true;
}

// 続きのリストの番号を、前のページの項目の数から続ける（カードの 01、手順の丸、番号付きリスト）
function continueListNumbers(orig: HTMLElement, clone: HTMLElement) {
  const name = orig.classList.contains('vs-points') ? 'vs-point'
    : orig.classList.contains('vs-steps') ? 'vs-step'
      : orig.tagName === 'OL' ? 'vs-ol' : '';
  const startAttr = orig.tagName === 'OL' && !orig.dataset.pfCountBase ? Number(orig.getAttribute('start') || 1) - 1 : 0;
  const base = Number(orig.dataset.pfCountBase || startAttr);
  const kept = orig.querySelectorAll(':scope > li:not(.is-pf-split-item)').length;
  clone.dataset.pfCountBase = String(base + kept);
  if (orig.tagName === 'OL') clone.setAttribute('start', String(base + kept + 1));
  if (name) clone.style.setProperty('counter-reset', `${name} ${base + kept}`);
}

function moveFrom(items: HTMLElement[], start: number, target: HTMLElement) {
  for (let i = start; i < items.length; i++) target.appendChild(items[i]);
}

// items の中で分ける。分けたら true（移した要素は target へ）
function splitIn(items: HTMLElement[], limit: number, target: HTMLElement, bodyH: number): boolean {
  const idx = items.findIndex(el => el.getBoundingClientRect().bottom > limit + TOLERANCE);
  if (idx < 0) return false;
  const el = items[idx];
  const rect = el.getBoundingClientRect();
  const partFits = rect.top < limit - 8;
  if (partFits) {
    const sub = descendInto(el);
    if (sub && splitIn(sub.items, limit, sub.target, bodyH)) {
      target.appendChild(sub.clone);
      if (el.tagName === 'OL' || el.tagName === 'UL') continueListNumbers(el, sub.clone);
      moveFrom(items, idx + 1, target);
      return true;
    }
    // 段落・項目の文は、それだけで 1 ページに収まらないときだけ行の切れ目で分ける（収まるなら、丸ごと次のページへ送る）。
    // コードブロックは、行の間をいつでも切れ目にする（DTP-VTPL-150）
    const tooTall = rect.height > bodyH - 1;
    if (isTextBlock(el) && (el.tagName === 'PRE' || tooTall) && splitText(el, limit, target)) {
      moveFrom(items, idx + 1, target);
      return true;
    }
  }
  let start = idx;
  if (isFigure(el) && limit - rect.top >= FIGURE_MIN_RATIO * bodyH) start = idx + 1;
  else if (start > 0 && SUBHEADING_TAGS.has(items[start - 1].tagName)) start--;
  if (start <= 0 || start >= items.length) return false;
  moveFrom(items, start, target);
  return true;
}

function buildContinuation(page: HTMLElement): HTMLElement {
  const cont = document.createElement('section');
  cont.className = page.className;
  ['is-stage-focused', 'is-scene', 'is-scene-in', 'is-ov-selected', 'is-ov-zooming'].forEach(c => cont.classList.remove(c));
  cont.classList.add('is-continuation');
  if (page.dataset.stageNo) cont.dataset.stageNo = page.dataset.stageNo;
  const h2 = page.querySelector(':scope > h2');
  if (h2) {
    const copy = h2.cloneNode(true) as HTMLElement;
    copy.removeAttribute('id');
    copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
    // 題の複製は、エディタとの追従の対象にしない（元の行の番号は、差分の描画で元の題だけが更新される）
    copy.removeAttribute('data-src-line');
    copy.querySelectorAll('[data-src-line]').forEach(n => n.removeAttribute('data-src-line'));
    cont.appendChild(copy);
  }
  return cont;
}

function finishContinuation(page: HTMLElement, cont: HTMLElement) {
  const actions = page.querySelector(':scope > .slab-actions');
  if (actions) cont.appendChild(actions.cloneNode(true));
}

function splitPage(page: HTMLElement): HTMLElement | null {
  const kids = bodyChildren(page);
  if (kids.length === 0) return null;
  const limit = contentLimit(page);
  const bodyH = Math.max(1, limit - kids[0].getBoundingClientRect().top);
  const cont = buildContinuation(page);
  if (!splitIn(kids, limit, cont, bodyH)) return null;
  finishContinuation(page, cont);
  page.after(cont);
  return cont;
}

// 分けられない要素が 1 ページより大きいときは、その本文を内容の箱に収まるまで縮める（DTP-VTPL-150）
function shrinkToFit(page: HTMLElement) {
  const kids = bodyChildren(page);
  if (!kids.length) return;
  const top = kids[0].getBoundingClientRect().top;
  const bottom = kids[kids.length - 1].getBoundingClientRect().bottom;
  const avail = contentLimit(page) - top;
  const used = bottom - top;
  if (used <= 0 || avail <= 0 || used <= avail) return;
  const extra = Math.max(0.2, (avail / used) * 0.98);
  page.style.setProperty('--page-zoom-extra', extra.toFixed(4));
  page.style.setProperty('--page-zoom', (STEP_ZOOM[stepOf(page)] * extra).toFixed(4));
}

/* ==========================================================================
   戻す（DD-VTPL-155）
   ========================================================================== */
function findOriginal(wrap: Element, id: string): HTMLElement | null {
  return wrap.querySelector(`[data-pf-id="${id}"]`);
}

function mergeChildren(clone: HTMLElement, orig: HTMLElement, wrap: Element) {
  Array.from(clone.childNodes).forEach(node => mergeNode(node, orig, wrap));
}

function mergeNode(node: ChildNode, parent: HTMLElement, wrap: Element) {
  if (node.nodeType !== 1) {
    parent.appendChild(node);
    return;
  }
  const el = node as HTMLElement;
  if (el.dataset.pfDrop) {
    el.remove();
    return;
  }
  if (el.dataset.pfClone) {
    const orig = findOriginal(wrap, el.dataset.pfClone);
    if (orig) {
      mergeChildren(el, orig, wrap);
      el.remove();
      return;
    }
  }
  if (el.dataset.pfSplit) {
    const orig = findOriginal(wrap, el.dataset.pfSplit);
    if (orig) {
      const fromHost = el.tagName === 'PRE' ? el.querySelector(':scope > code') : el;
      const toHost = orig.tagName === 'PRE' ? orig.querySelector(':scope > code') : orig;
      if (fromHost && toHost) {
        Array.from(fromHost.childNodes).forEach(n => toHost.appendChild(n));
        toHost.normalize();
      }
      el.remove();
      return;
    }
  }
  parent.appendChild(el);
}

function clearPageMarks(page: HTMLElement) {
  page.querySelectorAll(':scope > h2 > .page-no-pill').forEach(n => n.remove());
  page.querySelectorAll(':scope > .page-continued').forEach(n => n.remove());
  ['fitStep', 'pageGroup', 'pageNo', 'pageCount'].forEach(k => delete page.dataset[k]);
  ['--page-zoom', '--page-zoom-extra', '--page-body-height', '--page-center-pad'].forEach(p => page.style.removeProperty(p));
  // 空になった style 属性は消し、決め直した後の DOM を、描き直した DOM と同じにする（TC-PERF-013）
  if (!page.getAttribute('style')) page.removeAttribute('style');
  page.querySelectorAll('.exhibition-viewport, .diagram-viewport').forEach(vp => (vp as HTMLElement).style.removeProperty('--fit-area-height'));
}

function restoreGroup(first: HTMLElement) {
  const wrap = first.parentElement;
  const conts = continuationsOf(first);
  if (wrap && conts.length) {
    const pages = [first, ...conts];
    for (let i = pages.length - 1; i >= 1; i--) {
      const prev = pages[i - 1];
      Array.from(pages[i].children).forEach(child => {
        const el = child as HTMLElement;
        if (!isBodyChild(el)) return;
        mergeNode(el, prev, wrap);
      });
      if (window.LucivoStage && typeof window.LucivoStage.unmountLights === 'function') window.LucivoStage.unmountLights(pages[i]);
      pages[i].remove();
    }
    first.querySelectorAll('[data-pf-id]').forEach(n => delete (n as HTMLElement).dataset.pfId);
    first.querySelectorAll('.is-pf-split-item').forEach(n => n.classList.remove('is-pf-split-item'));
  }
  clearPageMarks(first);
}

/* ==========================================================================
   1 つの章を決める
   ========================================================================== */
function addPill(page: HTMLElement) {
  const h2 = page.querySelector(':scope > h2');
  if (!h2 || h2.querySelector(':scope > .page-no-pill')) return;
  const pill = document.createElement('small');
  pill.className = 'page-no-pill';
  pill.textContent = '1 / 1';
  h2.appendChild(pill);
}

function finalizeGroup(pages: HTMLElement[]) {
  if (pages.length < 2) return;
  const group = String(++groupSeq);
  pages.forEach((page, i) => {
    page.dataset.pageGroup = group;
    page.dataset.pageNo = String(i + 1);
    page.dataset.pageCount = String(pages.length);
    const pill = page.querySelector(':scope > h2 > .page-no-pill');
    if (pill) pill.textContent = `${i + 1} / ${pages.length}`;
    if (i < pages.length - 1) {
      const more = document.createElement('span');
      more.className = 'page-continued';
      more.setAttribute('aria-hidden', 'true');
      more.textContent = t('page.continued');
      page.appendChild(more);
    }
  });
  // 脚注は最後のページに置く
  const last = pages[pages.length - 1];
  pages.slice(0, -1).forEach(page => {
    const fn = page.querySelector(':scope > .lucivo-footnotes');
    if (fn) last.insertBefore(fn, last.querySelector(':scope > .slab-actions'));
  });
}

// 背の低いページは、空きの半分を本文の上に置いて、残りの高さの上下中央にする（DTP-VTPL-150）
function centerPage(page: HTMLElement) {
  const kids = bodyChildren(page);
  if (!kids.length) return;
  const free = (contentLimit(page) - kids[kids.length - 1].getBoundingClientRect().bottom) / pageScale(page);
  if (free > 1) page.style.setProperty('--page-center-pad', `${Math.round(free / 2)}px`);
}

function fitGroup(first: HTMLElement) {
  if (!first.isConnected) return;
  restoreGroup(first);
  if (!isPageBoxActive() || first.classList.contains('vs-endcard') || !first.offsetWidth) return;
  // 段階 0 で測った高さの比から、収まりそうな段階を見積もって始める（1 段ずつ試すと、段階ごとに組み直しが走るため）
  applyStep(first, 0);
  if (fits(first)) {
    centerPage(first);
    return;
  }
  let start = STEP_MAX;
  const kids = bodyChildren(first);
  if (kids.length) {
    const top = kids[0].getBoundingClientRect().top;
    const used = kids[kids.length - 1].getBoundingClientRect().bottom - top;
    const avail = contentLimit(first) - top;
    const ratio = used > 0 ? avail / used : 0;
    const found = STEP_ESTIMATE.findIndex((f, s) => s > 0 && f <= ratio);
    start = found > 0 ? found : STEP_MAX;
  }
  for (let step = start; step <= STEP_MAX; step++) {
    applyStep(first, step);
    if (fits(first)) {
      // 見積もりが詰めすぎていないか、1 つ前の段階でも確かめる
      if (step === start && step > 1) {
        applyStep(first, step - 1);
        if (!fits(first)) {
          applyStep(first, step);
          fits(first);
        }
      }
      centerPage(first);
      return;
    }
  }
  const pages = [first];
  let pilled = false;
  let guard = 0;
  for (let i = 0; i < pages.length && guard < 80; guard++) {
    const page = pages[i];
    if (fits(page)) {
      i++;
      continue;
    }
    if (!pilled && page.classList.contains('exhibition-slab') && page.querySelector(':scope > h2')) {
      addPill(page);
      pilled = true;
      if (fits(page)) {
        i++;
        continue;
      }
    }
    const cont = page.classList.contains('exhibition-slab') ? splitPage(page) : null;
    if (!cont) {
      shrinkToFit(page);
      i++;
      continue;
    }
    applyStep(cont, STEP_MAX);
    pages.splice(i + 1, 0, cont);
  }
  if (pages.length < 2) {
    pages[0].querySelectorAll(':scope > h2 > .page-no-pill').forEach(n => n.remove());
  }
  finalizeGroup(pages);
  // 分けた章のページは上から詰めて置く（中央に置くと、ページの末尾で切れた本文の上に空きができる）
  if (pages.length === 1) centerPage(pages[0]);
}

/* ==========================================================================
   待ち行列（DD-VTPL-156）
   ========================================================================== */
function setPendingFlag(on: boolean) {
  const root = document.documentElement;
  if (on) root.dataset.pageFit = 'pending';
  else delete root.dataset.pageFit;
}

function updatePageSize(wrap: HTMLElement) {
  if (!isPageBoxActive()) return;
  const sample = wrap.querySelector(':scope > .exhibition-slab:not(.vs-endcard), :scope > .exhibition-hero') as HTMLElement | null;
  if (!sample || !sample.offsetWidth) return;
  // 発表中に作り直された .exhibition-wrap も同じ幅で組むよう、外側の入れ物に書く
  const host = (wrap.parentElement || wrap) as HTMLElement;
  host.style.setProperty('--page-width', `${sample.offsetWidth}px`);
  host.style.setProperty('--page-height', `${sample.offsetHeight}px`);
  // 印刷: 版面 277 × 172mm に収める倍率（DD-VTPL-158）
  const mm = 96 / 25.4;
  const zoom = Math.min(277 * mm / sample.offsetWidth, 172 * mm / sample.offsetHeight) * 0.995;
  host.style.setProperty('--page-print-zoom', zoom.toFixed(4));
}

let printQuery: MediaQueryList | null = null;
function isPrinting(): boolean {
  if (!printQuery && typeof matchMedia === 'function') printQuery = matchMedia('print');
  return Boolean(printQuery && printQuery.matches);
}

function observeWrap(wrap: HTMLElement | null) {
  if (wrap === observedWrap) return;
  if (resizeObserver && observedWrap) resizeObserver.unobserve(observedWrap);
  observedWrap = wrap;
  lastWrapWidth = wrap ? wrap.clientWidth : 0;
  if (!wrap || typeof ResizeObserver !== 'function') return;
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      // ステージ発表の間は、ページの幅を --page-width で保つ。俯瞰の格子で .exhibition-wrap の幅が変わっても、決め直さない。
      // 印刷の間も、印刷の版面で組んだ幅で決め直さない（画面で決めたページを 1 対 1 で刷る。DD-VTPL-158）
      if (document.documentElement.classList.contains('is-stage-show') || isPrinting()) return;
      const w = observedWrap ? observedWrap.clientWidth : 0;
      if (!w || Math.abs(w - lastWrapWidth) < 1) return;
      lastWrapWidth = w;
      clearTimeout(resizeTimer);
      resizePending = true;
      resizeTimer = window.setTimeout(() => {
        resizePending = false;
        requestPageFit('all');
      }, 150);
    });
  }
  resizeObserver.observe(wrap);
}

function distanceToViewport(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  if (r.bottom < 0) return -r.bottom;
  if (r.top > window.innerHeight) return r.top - window.innerHeight;
  return 0;
}

function processQueue(budget: number) {
  const wrap = getWrap();
  if (wrap) updatePageSize(wrap);
  // ステージ発表の間は、今のシーン以外のページが隠れていて測れないため、測る間だけ見えない形で組む
  const measuringHidden = Boolean(wrap && document.documentElement.classList.contains('is-stage-show'));
  if (measuringHidden) wrap.classList.add('is-page-measuring');
  try {
    fitItems(budget);
  } finally {
    if (measuringHidden) wrap.classList.remove('is-page-measuring');
  }
  if (wrap) updatePageSize(wrap);
}

function fitItems(budget: number) {
  const t0 = performance.now();
  const items = Array.from(queue).filter(el => el.isConnected);
  queue.clear();
  if (budget !== Infinity) items.sort((a, b) => distanceToViewport(a) - distanceToViewport(b));
  let i = 0;
  for (; i < items.length; i++) {
    if (budget !== Infinity && i > 0 && performance.now() - t0 > budget) break;
    fitGroup(items[i]);
  }
  for (; i < items.length; i++) queue.add(items[i]);
}

function runFrame() {
  frameScheduled = false;
  processQueue(FRAME_BUDGET);
  if (queue.size) scheduleFrame();
  else {
    setPendingFlag(false);
    document.dispatchEvent(new CustomEvent('lucivo:pagefit'));
  }
}

function scheduleFrame() {
  if (frameScheduled) return;
  frameScheduled = true;
  setPendingFlag(true);
  requestAnimationFrame(runFrame);
}

// 章を決め直す。'all' はすべての章。要素を渡すと、その要素を含む章
export function requestPageFit(scope: 'all' | Element | Element[] | null) {
  installPageFit();
  if (syncPageRatio() && scope !== null) scope = 'all';
  const wrap = getWrap();
  observeWrap(wrap);
  if (!wrap) return;
  if (scope === 'all') {
    Array.from(wrap.children).forEach(el => {
      if (isPage(el) && !el.classList.contains('is-continuation')) queue.add(el as HTMLElement);
    });
  } else if (scope) {
    (Array.isArray(scope) ? scope : [scope]).forEach(el => {
      const page = el && (el as Element).closest ? (el as Element).closest('.exhibition-slab, .exhibition-hero') as HTMLElement | null : null;
      if (page && page.parentElement === wrap) queue.add(firstPageOf(page));
    });
  }
  if (queue.size) scheduleFrame();
}

// 待ち行列を同期で処理しきる（ステージ発表に入る前と印刷の前）
export function flushPageFit() {
  syncPageRatio();
  const wrap = getWrap();
  if (resizePending) {
    clearTimeout(resizeTimer);
    resizePending = false;
    requestPageFit('all');
  }
  if (wrap && !document.documentElement.classList.contains('is-stage-show') && !isPrinting() && Math.abs(wrap.clientWidth - lastWrapWidth) >= 1) {
    lastWrapWidth = wrap.clientWidth;
    requestPageFit('all');
  }
  if (!queue.size) return;
  processQueue(Infinity);
  setPendingFlag(false);
  document.dispatchEvent(new CustomEvent('lucivo:pagefit'));
}

// 差分の描画で章を消すとき、続きのページも消す
export function removePageWithContinuations(el: HTMLElement) {
  continuationsOf(el).forEach(cont => {
    if (window.LucivoStage && typeof window.LucivoStage.unmountLights === 'function') window.LucivoStage.unmountLights(cont);
    cont.remove();
  });
  el.remove();
}

// コードのコピー: 分けたコードは、同じ元の要素の部分をつなげて写す（DD-VTPL-155）
export function fullCodeText(pre: HTMLElement): string {
  const wrap = pre.closest('.exhibition-wrap');
  const own = pre.querySelector('code')?.textContent || '';
  if (!wrap || (!pre.dataset.pfId && !pre.dataset.pfSplit)) return own;
  // 3 ページ以上に分けたコードは、続きの部分がさらに分けられ、前の部分を指す鎖になる。先頭までさかのぼってから順にたどる
  let root = pre;
  while (root.dataset.pfSplit) {
    const prev = wrap.querySelector(`pre[data-pf-id="${root.dataset.pfSplit}"]`) as HTMLElement | null;
    if (!prev) break;
    root = prev;
  }
  const parts = [root];
  for (let cur = root; cur.dataset.pfId;) {
    const next = wrap.querySelector(`pre[data-pf-split="${cur.dataset.pfId}"]`) as HTMLElement | null;
    if (!next) break;
    parts.push(next);
    cur = next;
  }
  return parts.map(p => p.querySelector('code')?.textContent || '').join('');
}

let installed = false;
export function installPageFit() {
  if (installed) return;
  installed = true;
  if (typeof matchMedia === 'function') {
    portraitQuery = matchMedia('(orientation: portrait)');
    const onChange = () => {
      if (!isPrinting()) requestPageFit('all');
    };
    if (portraitQuery.addEventListener) portraitQuery.addEventListener('change', onChange);
  }
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', () => requestPageFit('all'));
  }
  window.addEventListener('beforeprint', () => flushPageFit());
  window.LucivoPageFit = { flush: flushPageFit, request: requestPageFit, isActive: isPageBoxActive };
}
