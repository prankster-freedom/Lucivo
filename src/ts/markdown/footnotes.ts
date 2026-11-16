// @ts-nocheck
import { escapeHtml } from '../utils/escape';

// GFM の脚注（FR-057、DD-MD-060〜063）。`[^label]` を番号つきの上付きの参照に、`[^label]: 本文` を脚注の一覧にする。
// 拡張は marked の自前の拡張として持つ（外部の拡張を同梱せずに、オフラインで動かすため）。
// 定義（footnoteDef）は、レキサーが文書全体を走査する間に記録する。参照（footnoteRef）は、定義のある label だけを対象にする

const ctx = { defs: new Map() };

// 描画のたびに、前の文書の定義を捨てる
export function resetFootnotes() {
  ctx.defs = new Map();
}

export const footnoteDefExtension = {
  name: 'footnoteDef',
  level: 'block',
  start: src => {
    const m = src.match(/^\[\^[^\]\s]+\]:/m);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    // 1 行目と、字下げされた続きの行までを 1 つの定義とする
    const m = /^\[\^([^\]\s]+)\]:[ \t]*([^\n]*(?:\n(?: {2,}|\t)[^\n]*)*)(?:\n|$)/.exec(src);
    if (!m) return undefined;
    const text = m[2].replace(/\n[ \t]+/g, ' ').trim();
    const token = { type: 'footnoteDef', raw: m[0], id: m[1], text, tokens: [] };
    this.lexer.inline(text, token.tokens);
    // 同じ label を 2 回定義したときは、最初の定義を使う
    if (!ctx.defs.has(token.id)) ctx.defs.set(token.id, token);
    return token;
  },
  renderer: () => ''
};

export const footnoteRefExtension = {
  name: 'footnoteRef',
  level: 'inline',
  start: src => {
    const index = src.indexOf('[^');
    return index >= 0 ? index : undefined;
  },
  tokenizer(src) {
    const m = /^\[\^([^\]\s]+)\]/.exec(src);
    // 定義のない `[^x]` は、脚注にせず本文の文字のままにする
    if (m && ctx.defs.has(m[1])) return { type: 'footnoteRef', raw: m[0], id: m[1] };
    return undefined;
  },
  renderer(token) {
    if (!token.num) return escapeHtml(token.raw);
    return `<sup class="fn-ref"><a href="#fn-${token.num}-${token.seg}" id="fnref-${token.num}-${token.occ}" aria-label="脚注 ${token.num}">${token.num}</a></sup>`;
  }
};

export function setupMarkedFootnotes() {
  marked.use({ extensions: [footnoteDefExtension, footnoteRefExtension] });
}

function walk(tokens, fn) {
  for (const t of tokens || []) {
    if (!t || t.type === 'footnoteDef') continue;
    fn(t);
    walk(t.tokens, fn);
    walk(t.items, fn);
    if (t.header) t.header.forEach(c => walk(c.tokens, fn));
    if (t.rows) t.rows.forEach(r => r.forEach(c => walk(c.tokens, fn)));
  }
}

// 参照に番号を付け、脚注の一覧のブロックを挿入したトークンの列を返す。
// 番号は、文書の中で最初に参照された順（GitHub と同じ）。参照されなかった定義は出さない。
// splitAtH2: 章（h2）ごとに、その章で参照した脚注を、章の末尾に一覧にする（Visualモード）。false なら文書の末尾に 1 つだけ置く（高速モード）。
// 同じ脚注を複数の章から参照したときは、章ごとに再掲する（発表では 1 章が 1 場面で、場面だけで読み切れるようにするため）
export function applyFootnotes(tokens, splitAtH2) {
  if (ctx.defs.size === 0) return tokens;
  const numbers = new Map();
  const occurrences = new Map();
  const firstOcc = new Map(); // `${章}:${id}` → その章で最初の参照の通し番号（戻りリンクの行き先）
  const segments = [{ ids: [], last: -1 }];
  let seg = 0;
  tokens.forEach((token, index) => {
    if (splitAtH2 && token.type === 'heading' && token.depth === 2 && index > 0) {
      seg++;
      segments[seg] = { ids: [], last: -1 };
    }
    segments[seg].last = index;
    walk([token], t => {
      if (t.type !== 'footnoteRef') return;
      if (!numbers.has(t.id)) numbers.set(t.id, numbers.size + 1);
      const occ = (occurrences.get(t.id) || 0) + 1;
      occurrences.set(t.id, occ);
      t.num = numbers.get(t.id);
      t.occ = occ;
      t.seg = seg;
      if (!segments[seg].ids.includes(t.id)) {
        segments[seg].ids.push(t.id);
        firstOcc.set(`${seg}:${t.id}`, occ);
      }
    });
  });
  if (numbers.size === 0) return tokens;

  const listToken = (ids, segIndex) => {
    const items = ids.map(id => {
      const def = ctx.defs.get(id);
      const num = numbers.get(id);
      const text = marked.parser([{ type: 'paragraph', raw: def.text, text: def.text, tokens: def.tokens }]).replace(/^<p>|<\/p>\s*$/g, '');
      return `<div class="fn-item" id="fn-${num}-${segIndex}"><span class="fn-num">${num}</span><span class="fn-text">${text}</span><a class="fn-back" href="#fnref-${num}-${firstOcc.get(`${segIndex}:${id}`)}" aria-label="本文へ戻る">↩</a></div>`;
    }).join('');
    const html = `<div class="lucivo-footnotes" role="doc-endnotes" aria-label="脚注">${items}</div>\n`;
    return { type: 'html', raw: html, text: html };
  };

  // 挿入位置は、各章の最後のトークンの後（Visualモード）、または文書の最後（高速モード）
  const insertAfter = new Map();
  segments.forEach((segment, i) => {
    if (segment.ids.length > 0) insertAfter.set(segment.last, listToken(segment.ids, i));
  });
  const out = [];
  tokens.forEach((token, index) => {
    out.push(token);
    if (insertAfter.has(index)) out.push(insertAfter.get(index));
  });
  return out;
}

