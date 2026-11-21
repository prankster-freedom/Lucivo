import { registerEscapeHandler } from './keymap';

// 解説＋図版型（.exhibition-slab-split）で、解説の語と図の同じ名前のノードを光で結ぶ（#213, FR-015, DD-VTPL-050）。

const SKIP_SELECTOR = 'code, pre, a, script, style, .lucivo-math, .katex, .vs-term-link';
let initialized = false;
let activeSlab: Element | null = null;
let pinnedTerm: string | null = null;

function normalizeTerm(text: string | null | undefined): string {
  return (text || '').trim().replace(/\s+/g, ' ');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTermPattern(terms: string[]): RegExp {
  const parts = terms.map(term => {
    const escaped = escapeRegExp(term);
    const startBound = /^[A-Za-z0-9_]/.test(term) ? '(?<![A-Za-z0-9_])' : '';
    const endBound = /[A-Za-z0-9_]$/.test(term) ? '(?![A-Za-z0-9_])' : '';
    return `${startBound}${escaped}${endBound}`;
  });
  return new RegExp(parts.join('|'), 'g');
}

function clearExistingLinks(prose: Element): void {
  const existing = prose.querySelectorAll('.vs-term-link');
  if (!existing.length) return;
  existing.forEach(span => {
    span.replaceWith(document.createTextNode(span.textContent || ''));
  });
  prose.normalize();
}

function collectNodeTerms(svg: Element): string[] {
  const terms = new Set<string>();
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach(node => {
    const labelEl = node.querySelector('.nodeLabel');
    const label = normalizeTerm(labelEl ? labelEl.textContent : node.textContent);
    if (!label) {
      node.removeAttribute('data-term-node');
      return;
    }
    node.setAttribute('data-term-node', label);
    terms.add(label);
  });
  return [...terms].sort((a, b) => b.length - a.length);
}

function wrapMatchedTextNodes(prose: Element, pattern: RegExp): void {
  const walker = document.createTreeWalker(prose, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest(SKIP_SELECTOR)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) textNodes.push(cur as Text);

  for (const textNode of textNodes) {
    const text = textNode.nodeValue || '';
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    if (!match) continue;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    while (match) {
      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }
      const span = document.createElement('span');
      span.className = 'vs-term-link';
      span.dataset.term = match[0];
      span.textContent = match[0];
      frag.appendChild(span);
      lastIndex = match.index + match[0].length;
      match = pattern.exec(text);
    }
    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }
    textNode.replaceWith(frag);
  }
}

export function linkSplitTerms(slab: Element | null): void {
  if (!slab) return;
  const prose = slab.querySelector('.exhibition-slab-prose');
  const svg = slab.querySelector('.exhibition-viewport svg');
  if (!prose || !svg) return;

  clearExistingLinks(prose);
  const terms = collectNodeTerms(svg);
  if (!terms.length) return;
  wrapMatchedTextNodes(prose, buildTermPattern(terms));
}

function applyLitState(slab: Element | null, term: string | null): void {
  document.querySelectorAll('.exhibition-slab-split .is-term-lit').forEach(el => {
    el.classList.remove('is-term-lit');
  });
  if (!slab || !term) return;
  slab.querySelectorAll('.vs-term-link').forEach(el => {
    if ((el as HTMLElement).dataset.term === term) el.classList.add('is-term-lit');
  });
  slab.querySelectorAll('[data-term-node]').forEach(el => {
    if (el.getAttribute('data-term-node') === term) el.classList.add('is-term-lit');
  });
}

function findTermTarget(target: EventTarget | null): { slab: Element; term: string } | null {
  if (!(target instanceof Element)) return null;
  const slab = target.closest('.exhibition-slab-split');
  if (!slab) return null;
  const link = target.closest('.vs-term-link') as HTMLElement | null;
  if (link?.dataset.term) return { slab, term: link.dataset.term };
  const node = target.closest('[data-term-node]');
  const nodeTerm = node?.getAttribute('data-term-node');
  if (nodeTerm) return { slab, term: nodeTerm };
  return null;
}

export function setupSplitTermLinks(): void {
  if (initialized) return;
  initialized = true;

  document.addEventListener('pointerover', e => {
    const hit = findTermTarget(e.target);
    if (!hit) return;
    applyLitState(hit.slab, hit.term);
  });

  document.addEventListener('pointerout', e => {
    const hit = findTermTarget(e.target);
    if (!hit) return;
    const next = findTermTarget(e.relatedTarget);
    if (next && next.slab === hit.slab && next.term === hit.term) return;
    applyLitState(activeSlab, pinnedTerm);
  });

  document.addEventListener('click', e => {
    const hit = findTermTarget(e.target);
    if (!hit) {
      if (pinnedTerm) {
        activeSlab = null;
        pinnedTerm = null;
        applyLitState(null, null);
      }
      return;
    }
    if (activeSlab === hit.slab && pinnedTerm === hit.term) {
      activeSlab = null;
      pinnedTerm = null;
    } else {
      activeSlab = hit.slab;
      pinnedTerm = hit.term;
    }
    applyLitState(activeSlab, pinnedTerm);
  });

  registerEscapeHandler('split-term-links', 60, () => {
    if (!pinnedTerm) return false;
    activeSlab = null;
    pinnedTerm = null;
    applyLitState(null, null);
    return false;
  });
}
