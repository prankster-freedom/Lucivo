// Visualモードの DOM から、ミュージアム・ウォークで使う文書の構造を読み取る（DD-MWLK-003）。
// 読むだけで、元の DOM は書き換えない。中身は複製し、id・ボタン・飾りを消してから使う。

export type BlockKind = 'heading' | 'body' | 'bullet' | 'plate' | 'quote' | 'figure';

export interface Block {
  kind: BlockKind;
  // パーツに入れる HTML（本体が DOMPurify で無害化した DOM の複製から作る）。小見出しは文字だけ
  html: string;
  // 引用の銘板の見出し（コールアウトは種類の名前、引用は空）
  label?: string;
  // 箇条書きの項目が、どのリストに属するか
  listId?: number;
  // 図の番号（Outline.figures の添字）
  figure?: number;
}

export interface Chapter { no: string; title: string; blocks: Block[]; }

export interface Outline {
  title: string;
  sub: string;
  // 最初の h2 より前の部分（表紙の門の後ろの導入）
  intro: Block[];
  chapters: Chapter[];
  figures: SVGSVGElement[];
}

// 取り出す要素。取り出した要素の中にある要素は、重ねて取り出さない
const PICK = 'h3, h4, h5, h6, p, li, dl > div, dl > dt, dl > dd, blockquote, .md-alert, [data-stage-index], table, pre';
// 読まない場所
const SKIP_AREA = '.front-matter, .slab-actions';
// 複製から消すもの
const STRIP = 'button, .vs-card-ornament, .md-alert-icon, .md-alert-title, .vs-code-caret';

function cleanClone(el: Element): HTMLElement {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(STRIP).forEach(n => n.remove());
  copy.removeAttribute('id');
  copy.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
  return copy;
}

function hasContent(el: Element): boolean {
  return !!(el.textContent && el.textContent.trim()) || !!el.querySelector('img, svg, .katex, .lucivo-math');
}

function readBlocks(slab: Element, figures: SVGSVGElement[]): Block[] {
  const blocks: Block[] = [];
  const lists = new Map<Element, number>();
  const picked = Array.from(slab.querySelectorAll(PICK)).filter(el => {
    if (el.closest(SKIP_AREA)) return false;
    const outer = el.parentElement?.closest(PICK);
    return !(outer && slab.contains(outer));
  });
  for (const el of picked) {
    const tag = el.tagName;
    if (el.hasAttribute('data-stage-index')) {
      const svg = el.querySelector('svg');
      if (!svg) continue;
      figures.push(svg as SVGSVGElement);
      blocks.push({ kind: 'figure', html: '', figure: figures.length - 1 });
    } else if (/^H[3-6]$/.test(tag)) {
      const text = (el.textContent || '').trim();
      if (text) blocks.push({ kind: 'heading', html: cleanClone(el).innerHTML });
    } else if (tag === 'BLOCKQUOTE' || el.classList.contains('md-alert')) {
      if (!hasContent(el)) continue;
      const label = el.classList.contains('md-alert') ? (el.querySelector('.md-alert-title')?.textContent || '').trim() : '';
      blocks.push({ kind: 'quote', html: cleanClone(el).innerHTML, label });
    } else if (tag === 'TABLE' || tag === 'PRE') {
      blocks.push({ kind: 'plate', html: cleanClone(el).outerHTML });
    } else if (tag === 'LI' || el.parentElement?.tagName === 'DL') {
      if (!hasContent(el)) continue;
      const list = el.parentElement as Element;
      if (!lists.has(list)) lists.set(list, lists.size + 1);
      blocks.push({ kind: 'bullet', html: cleanClone(el).innerHTML, listId: lists.get(list) });
    } else if (tag === 'P') {
      if (!hasContent(el)) continue;
      blocks.push({ kind: 'body', html: cleanClone(el).innerHTML });
    }
  }
  return blocks;
}

function chapterTitle(h2: Element): string {
  const copy = h2.cloneNode(true) as HTMLElement;
  copy.querySelectorAll('.exhibition-num-badge, .page-no-pill').forEach(n => n.remove());
  return (copy.textContent || '').trim();
}

export function readOutline(root: HTMLElement): Outline {
  const wrap = root.querySelector('.exhibition-wrap') || root;
  const hero = wrap.querySelector(':scope > .exhibition-hero');
  const outline: Outline = {
    title: (hero?.querySelector('.vs-cover-title')?.textContent || '').trim(),
    sub: (hero?.querySelector('.vs-cover-deck')?.textContent || '').trim(),
    intro: [],
    chapters: [],
    figures: []
  };
  let count = 0;
  wrap.querySelectorAll(':scope > .exhibition-slab').forEach(slab => {
    const h2 = slab.querySelector('h2');
    const blocks = readBlocks(slab, outline.figures);
    // 続きのページ（版面の比率で分けた章。ARC-PAGE-008）は、直前の章の展示に足す
    if (slab.classList.contains('is-continuation')) {
      const prev = outline.chapters[outline.chapters.length - 1];
      if (prev) prev.blocks.push(...blocks);
      else outline.intro.push(...blocks);
      return;
    }
    if (!h2) {
      outline.intro.push(...blocks);
      return;
    }
    count++;
    outline.chapters.push({ no: String(count).padStart(2, '0'), title: chapterTitle(h2), blocks });
  });
  return outline;
}

export function isOutlineEmpty(outline: Outline): boolean {
  return !outline.title && !outline.intro.length && !outline.chapters.length;
}
