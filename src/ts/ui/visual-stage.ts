// @ts-nocheck
import { escapeHtml } from '../utils/escape';
import { decorateAlerts } from '../markdown/callouts';
import { state, runtime } from './state';
import { buildSlabActionsHtml } from './slab-export';

export const TEMPLATE_LIMITS = {
  leadChars: 160, itemChars: 100, quoteChars: 240, points: [2, 6], steps: [2, 8],
  glossary: [2, 12], glossaryTermChars: 40, glossaryItemChars: 200, glossaryTwoUp: 7
};
// 雛形の項目に入れると組めない要素（入れ子のリスト・コード・表・引用・チェックボックス）
export const TEMPLATE_ITEM_BLOCKERS = 'ul, ol, pre, table, blockquote, input';

// 定義リスト型（FR-035, DTP-VTPL-045）: 「**用語** — 説明」の太字とダッシュ。コロン区切りは要点カード型の書き方のため含めない（RGH-909）
export const GLOSSARY_SEPARATOR_RE = /^\s*[—–―]\s*/;

export function glossaryParts(li) {
  const head = li.firstChild;
  const rest = head && head.nextSibling;
  if (!head || head.nodeName !== 'STRONG' || !rest || rest.nodeType !== Node.TEXT_NODE || !GLOSSARY_SEPARATOR_RE.test(rest.textContent)) return null;
  return { head, rest };
}

export function isGlossaryList(items) {
  const [min, max] = TEMPLATE_LIMITS.glossary;
  return items.length >= min && items.length <= max && items.every(li => {
    const parts = glossaryParts(li);
    return parts && !li.querySelector(TEMPLATE_ITEM_BLOCKERS)
      && parts.head.textContent.trim().length <= TEMPLATE_LIMITS.glossaryTermChars
      && li.textContent.trim().length <= TEMPLATE_LIMITS.glossaryItemChars;
  });
}

export function detectSlabTemplate(els, slotCount) {
  if (slotCount > 0 || els.length === 0) return 'standard';
  const textLen = el => el.textContent.trim().length;
  const tags = els.map(el => el.tagName);

  const leadLen = els.reduce((sum, el) => sum + textLen(el), 0);
  if (tags.every(t => t === 'P') && els.length <= 2 && leadLen > 0 && leadLen <= TEMPLATE_LIMITS.leadChars) return 'lead';

  const list = els[els.length - 1];
  const hasIntro = els.length === 2 && tags[0] === 'P';
  if ((els.length === 1 || hasIntro) && (list.tagName === 'UL' || list.tagName === 'OL')) {
    const items = Array.from(list.children);
    if (list.tagName === 'UL' && isGlossaryList(items)) return 'glossary';
    const plain = items.every(li => !li.querySelector(TEMPLATE_ITEM_BLOCKERS) && textLen(li) <= TEMPLATE_LIMITS.itemChars);
    const [min, max] = list.tagName === 'UL' ? TEMPLATE_LIMITS.points : TEMPLATE_LIMITS.steps;
    if (plain && items.length >= min && items.length <= max) return list.tagName === 'UL' ? 'points' : 'steps';
  }

  if (els.length === 1 && tags[0] === 'BLOCKQUOTE') {
    const paras = Array.from(els[0].children);
    if (paras.length >= 1 && paras.length <= 3 && paras.every(p => p.tagName === 'P') && textLen(els[0]) <= TEMPLATE_LIMITS.quoteChars) return 'quote';
  }
  return 'standard';
}

// 要点カードの先頭太字が KPI 数値（例: "120 ms", "99.9%", "+38%", "4.2倍", "0件", "$1.2M"）である場合の判定（FR-027, DTP-VTPL-035）
export const METRIC_TITLE_RE = /^[+\-−±≈~]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|ms|s|sec|min|h|fps|Hz|kHz|MHz|GHz|KB|MB|GB|TB|px|rem|em|vw|vh|x|×|倍|件|個|円|万|億|回|人|台|年|月|日|時間|分|秒|字|項目|行|列|枚|種|点|章|節|段|[a-zA-Z]{1,4})?(?:\s*[/／]\s*[a-zA-Z0-9一-龠ぁ-んァ-ヶ]+)?$/;

// 要点カードの全項目の太字タイトルが年・四半期・年月・Phase・Step・vX.Y 等の時系列ラベルである場合の判定（FR-029, DTP-VTPL-036）
export const TIMELINE_TITLE_RE = /^(?:(?:19|20)\d{2}(?:[年/\-.\s]*(?:Q[1-4]|H[12]|[01]?\d(?:月)?))?|Q[1-4]\s*(?:19|20)?\d{2}|(?:Phase|Step|Stage|Wave|Sprint|Day|Week|Month|Year)\s*\d+|第\s*\d+\s*(?:期|世代|段階|フェーズ)|v\d+\.\d+(?:\.\d+)?)$/i;

// 2 項目の要点カードが Before / After（従来 / 新方式、課題 / 解決 等）の対である場合の判定（FR-030, DTP-VTPL-037）
export const COMPARE_BEFORE_RE = /^(?:Before|As[\s-]?Is|Legacy|Old|従来(?:方式|手法)?|旧(?:方式|世代|システム)?|変更前|導入前|課題|問題点)(?:\s*[:：\-—/／(（].*)?$/i;
export const COMPARE_AFTER_RE = /^(?:After|To[\s-]?Be|New|Modern|Lucivo|新(?:方式|手法|世代|システム)?|変更後|導入後|解決(?:策)?|改善後)(?:\s*[:：\-—/／(（].*)?$/i;

// 雛形に合わせて本文要素を組み替える（DD-VTPL-010〜014, 035〜037）。els はスラブの DOM の中の要素で、直接書き換える
export function applySlabTemplate(template, els) {
  const last = els[els.length - 1];
  if (template === 'lead') {
    const lead = document.createElement('div');
    lead.className = 'vs-lead';
    els[0].before(lead);
    els.forEach(el => lead.appendChild(el));
  } else if (template === 'points') {
    // 列の数は項目の数から決め、最後の行に 1 枚だけ残る端数を作らない（DTP-VTPL-030, RGH-902）
    const items = Array.from(last.children);
    const count = items.length;
    last.classList.add('vs-points');
    last.style.setProperty('--vs-cols', String(count === 4 ? 2 : Math.min(count, 3)));
    last.style.setProperty('--vs-cols-wide', String(count === 4 ? 4 : Math.min(count, 3)));
    // 「**題**: 説明」の項目は、太字を題として切り出し、区切りの : を消す（DTP-VTPL-030）
    const titles = [];
    items.forEach(li => {
      const head = li.firstChild;
      const rest = head && head.nextSibling;
      if (head && head.nodeName === 'STRONG' && rest && rest.nodeType === 3 && /^\s*[:：]/.test(rest.textContent)) {
        head.classList.add('vs-point-title');
        rest.textContent = rest.textContent.replace(/^\s*[:：]\s*/, '');
        const titleText = head.textContent.trim();
        titles.push({ li, head, titleText });
        if (METRIC_TITLE_RE.test(titleText) && !TIMELINE_TITLE_RE.test(titleText)) {
          li.classList.add('vs-metric-item');
          head.classList.add('vs-metric-value');
        }
      }
      const ornament = document.createElement('span');
      ornament.className = 'vs-card-ornament';
      ornament.setAttribute('aria-hidden', 'true');
      li.appendChild(ornament);
    });
    // 全項目が時系列・マイルストーン（2026 Q1, Phase 1, v1.0 等）の場合はタイムライン修飾を付与（FR-029）
    if (titles.length === count && titles.every(t => TIMELINE_TITLE_RE.test(t.titleText))) {
      last.classList.add('vs-points-timeline');
      titles.forEach(({ li, head }) => {
        li.classList.remove('vs-metric-item');
        head.classList.remove('vs-metric-value');
        li.classList.add('vs-timeline-item');
        head.classList.add('vs-timeline-badge');
      });
    } else if (count === 2 && titles.length === 2
      && COMPARE_BEFORE_RE.test(titles[0].titleText) && COMPARE_AFTER_RE.test(titles[1].titleText)) {
      // 2 項目が Before / After の対である場合は比較ペア修飾を付与（FR-030）
      last.classList.add('vs-points-compare');
      titles[0].li.classList.add('vs-compare-before');
      titles[1].li.classList.add('vs-compare-after');
    }
  } else if (template === 'glossary') {
    // 箇条書きを定義リストに組み替える。行ごとの div は、2 段組みで用語と説明の対を崩さないため（DD-VTPL-019）
    const items = Array.from(last.children);
    const dl = document.createElement('dl');
    dl.className = 'vs-glossary';
    if (items.length >= TEMPLATE_LIMITS.glossaryTwoUp) dl.classList.add('is-two-up');
    items.forEach(li => {
      const { head, rest } = glossaryParts(li);
      rest.textContent = rest.textContent.replace(GLOSSARY_SEPARATOR_RE, '');
      const dt = document.createElement('dt');
      dt.append(...head.childNodes);
      head.remove();
      const dd = document.createElement('dd');
      dd.append(...li.childNodes);
      const row = document.createElement('div');
      row.className = 'vs-gloss-row';
      row.append(dt, dd);
      dl.appendChild(row);
    });
    last.replaceWith(dl);
  } else if (template === 'steps') {
    const count = last.children.length;
    last.classList.add('vs-steps');
    if (count > 4) last.classList.add('is-vertical');
    last.style.setProperty('--vs-n', String(count));
    Array.from(last.children).forEach((li, idx) => {
      li.style.setProperty('--vs-i', String(idx));
      if (idx === 0) return;
      const chevron = document.createElement('span');
      chevron.className = 'vs-step-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      li.appendChild(chevron);
    });
  } else if (template === 'quote') {
    last.classList.add('vs-quote');
    const cite = last.lastElementChild;
    if (last.children.length > 1 && /^\s*(—|―|--)/.test(cite.textContent)) cite.classList.add('vs-quote-cite');
  }
}


export const COVER_LIMITS = { agenda: [3, 15], tags: 4 };

// 表紙に使うフロントマターの値（title / description / tags / author / date）を取り出す。
// YAML の完全な解析はしない。先頭の列から始まるキーだけを見て、入れ子のキーは読まない（DD-VTPL-040）
export function readCoverMeta(yaml) {
  const meta = { title: '', description: '', tags: [], author: '', date: '' };
  if (!yaml) return meta;
  const lines = yaml.split(/\r?\n/);
  const scalar = v => {
    const q = /^(['"])(.*)\1\s*(?:#.*)?$/.exec(v.trim());
    return q ? q[2].trim() : v.replace(/\s+#.*$/, '').trim();
  };
  for (let i = 0; i < lines.length; i++) {
    const m = /^(title|description|tags|author|date)[ \t]*:[ \t]*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const [, key, raw] = m;
    // 続く字下げの行（ブロックの値・リスト）を集める
    const block = [];
    for (let j = i + 1; j < lines.length && (/^\s+\S/.test(lines[j]) || lines[j].trim() === ''); j++) {
      if (lines[j].trim()) block.push(lines[j].trim());
    }
    const value = raw.trim();
    if (key === 'tags') {
      if (value.startsWith('[')) {
        meta.tags = value.replace(/^\[|\]\s*(?:#.*)?$/g, '').split(',').map(scalar);
      } else if (value) {
        meta.tags = value.split(',').map(scalar);
      } else {
        meta.tags = block.filter(l => l.startsWith('-')).map(l => scalar(l.replace(/^-\s*/, '')));
      }
      meta.tags = meta.tags.filter(Boolean).slice(0, COVER_LIMITS.tags);
    } else if (key === 'author' || key === 'date') {
      // 入れ子のマップ（author:\n  title: ...）は読まず、単一スカラー値のみ採用する（FR-032）
      if (value && !/^[>|][+-]?$/.test(value)) meta[key] = scalar(value);
    } else {
      meta[key] = (!value || /^[>|][+-]?$/.test(value)) ? block.join(' ') : scalar(value);
    }
  }
  return meta;
}

// 表紙の HTML。文字はすべてエスケープしてから埋め込む（NFR-003）
export function buildCoverHtml(title, meta, agenda, figureCount = 0) {
  const eyebrow = meta.tags.length
    ? `<p class="vs-cover-eyebrow">${meta.tags.map(escapeHtml).join('<span class="vs-cover-sep" aria-hidden="true">/</span>')}</p>`
    : '';
  const deck = meta.description ? `<p class="vs-cover-deck">${escapeHtml(meta.description)}</p>` : '';
  const specItems = [];
  if (meta.author) specItems.push({ kind: 'author', label: meta.author });
  if (meta.date) specItems.push({ kind: 'date', label: meta.date });
  if (agenda.length > 0) specItems.push({ kind: 'stages', label: `${agenda.length} ${agenda.length === 1 ? 'STAGE' : 'STAGES'}` });
  if (figureCount > 0) specItems.push({ kind: 'figures', label: `${figureCount} ${figureCount === 1 ? 'FIGURE' : 'FIGURES'}` });
  const specsHtml = specItems.length
    ? `<div class="vs-cover-specs" aria-label="文書スペック">${specItems.map(item =>
      `<span class="vs-cover-spec-pill" data-spec-kind="${item.kind}" data-spec-label="${escapeHtml(item.label)}"></span>`
    ).join('')}</div>`
    : '';
  const [min, max] = COVER_LIMITS.agenda;
  let agendaHtml = '';
  if (agenda.length >= min && agenda.length <= max) {
    // 印刷物の目次と同じく、列の上から下へ読む順に並べる（DTP-VTPL-100）
    const cols = agenda.length <= 6 ? 2 : 3;
    const rows = Math.ceil(agenda.length / cols);
    agendaHtml = `<ol class="vs-cover-agenda" style="--vs-rows: ${rows};" aria-label="目次">${agenda.map(a =>
      `<li><button type="button" class="vs-cover-agenda-item" data-stage-target="${a.no}"><span class="vs-cover-agenda-no">${a.no}</span><span class="vs-cover-agenda-title">${escapeHtml(a.title)}</span></button></li>`
    ).join('')}</ol>`;
  }
  return `
      <div class="exhibition-hero vs-cover">
        <span class="vs-cover-texture" aria-hidden="true"></span>
        <div class="exhibition-hero-top">
          <span class="exhibition-hero-emblem" aria-hidden="true"></span>
          <div class="four-color-bar"><span></span><span></span><span></span><span></span></div>
        </div>
        ${eyebrow}
        <h1 class="vs-cover-title font-display">${escapeHtml(title)}</h1>
        ${deck}
        ${specsHtml}
        ${agendaHtml}
      </div>`;
}

// 数値の列の判定に使うセルの形（数字に単位・記号が付いたもの）。「—」「-」などの欠損の印は空のセルとみなす（DD-VTPL-041）
export const NUMERIC_CELL = /^[+\-−±]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|[a-zA-Z]{1,3}|件|個|円|倍|回|人|台|年|日|時間|分|秒|字|項目|行|列|枚|×)?$/;
export const EMPTY_CELL = /^(?:[-–—―]|N\/A)?$/i;

// 本文のセルがすべてこの文字数以内で空白を含まない列は、短いラベルの列として折り返さない（DD-VTPL-041）
export const TABLE_LABEL_CHARS = 10;

// 表の列を調べ、本文のセルがすべて数値の列に .vs-num、短いラベルの列に .vs-label を付ける。
// 数値の揃えは、先頭の列（行の見出し）と、Markdown で揃えを指定した列には付けない
export function markTableColumns(table) {
  const head = Array.from(table.querySelectorAll('thead th'));
  const rows = Array.from(table.querySelectorAll('tbody tr'));
  const cols = head.length || (rows[0] ? rows[0].children.length : 0);
  for (let c = 0; c < cols; c++) {
    const cells = rows.map(r => r.children[c]).filter(Boolean);
    const texts = cells.map(td => td.textContent.trim());
    const filled = texts.filter(t => !EMPTY_CELL.test(t));
    if (!filled.length) continue;
    const all = [head[c], ...cells].filter(Boolean);
    const numeric = c > 0 && filled.every(t => NUMERIC_CELL.test(t)) && !all.some(cell => cell.hasAttribute('align'));
    if (numeric) {
      all.forEach(cell => cell.classList.add('vs-num'));
    } else if (filled.every(t => t.length <= TABLE_LABEL_CHARS && !/\s/.test(t))) {
      cells.forEach(cell => cell.classList.add('vs-label'));
    }
  }
}

// Visualモードのコードブロックに言語ラベル・丸端キャレット（AST-109）・ワンクリック Copy ボタンを付与する（FR-031, DD-VTPL-038）
// ラベルはすべて属性＋CSS 擬似要素で描画し、テキストノードを増やさない（TC-VTPL-003）
export const CODE_LANG_ALIASES = {
  javascript: 'JS', js: 'JS', typescript: 'TS', ts: 'TS', python: 'PY', py: 'PY',
  bash: 'SH', sh: 'SH', shell: 'SH', zsh: 'SH', markdown: 'MD', md: 'MD', yml: 'YAML'
};

export function decorateCodeBlocks(container) {
  container.querySelectorAll('pre').forEach(pre => {
    if (pre.closest('.front-matter')) return;
    const code = pre.querySelector('code');
    if (!code) return;
    const m = /language-([a-z0-9_+-]+)/i.exec(code.className || '');
    const rawLang = m ? m[1].toLowerCase() : '';
    const langLabel = CODE_LANG_ALIASES[rawLang] || (rawLang ? rawLang.toUpperCase() : 'CODE');
    pre.classList.add('vs-code-block');
    pre.setAttribute('data-code-lang', langLabel);
    const caret = document.createElement('span');
    caret.className = 'vs-code-caret';
    caret.setAttribute('aria-hidden', 'true');
    const copyBtn = document.createElement('button');
    copyBtn.type = 'button';
    copyBtn.className = 'vs-code-copy-btn';
    copyBtn.setAttribute('data-copy-label', 'Copy');
    copyBtn.setAttribute('title', 'コードをクリップボードにコピー');
    copyBtn.setAttribute('aria-label', 'コードをコピー');
    pre.appendChild(caret);
    pre.appendChild(copyBtn);
  });
}

export function buildVisualStageHtml(cleanHtml, yaml) {
  const temp = document.createElement('div');
  temp.innerHTML = cleanHtml;
  temp.querySelectorAll('table').forEach(markTableColumns);
  decorateCodeBlocks(temp);
  // 雛形の判定より前に置き換え、コールアウトだけの章をステートメント型にしない（FR-034）
  decorateAlerts(temp);
  const totalFigures = temp.querySelectorAll('.lucivo-slot').length;

  // 題名は h1、フロントマターの title、読み込んだファイル名の順に探す。どれもなければヒーローを出さない（DD-VTPL-040）
  const coverMeta = readCoverMeta(yaml);
  let heroTitle = coverMeta.title || (runtime.currentFileName !== 'untitled.md' ? runtime.currentFileName.replace(/\.[^.]+$/, '') : '');
  const h1 = temp.querySelector('h1');
  if (h1) {
    heroTitle = h1.textContent;
    h1.remove();
  }

  // 要素も文字もないスラブ（h1 の直後に h2 が続く文書で、h1 を除いた後に残る改行だけの部分）は出さない（DD-VTPL-002）
  const slabs = [];
  let currentNodes = [];
  const pushSlab = nodes => {
    if (nodes.some(n => n.nodeType === 1 || n.textContent.trim())) slabs.push(nodes);
  };
  Array.from(temp.childNodes).forEach(node => {
    if (node.nodeType === 1 && node.tagName === 'H2') {
      pushSlab(currentNodes);
      currentNodes = [node];
    } else {
      currentNodes.push(node);
    }
  });
  pushSlab(currentNodes);

  let slabsHtml = '';
  let sectionCounter = 0;
  const agenda = [];

  slabs.forEach((nodes) => {
    const wrapper = document.createElement('div');
    nodes.forEach(n => wrapper.appendChild(n.cloneNode(true)));
    const h2 = wrapper.querySelector('h2');
    if (h2) {
      sectionCounter++;
      const numStr = String(sectionCounter).padStart(2, '0');
      const rawTitle = h2.textContent.replace(/^\d+\.\s*/, '');
      h2.innerHTML = `<span class="exhibition-num-badge">STAGE ${numStr}</span><span>${escapeHtml(rawTitle)}</span>`;
      agenda.push({ no: numStr, title: rawTitle });
    }
    const stageAttr = h2 ? ` data-stage-no="${String(sectionCounter).padStart(2, '0')}"` : '';
    const slots = wrapper.querySelectorAll('.lucivo-slot');
    const children = Array.from(wrapper.children);
    const proseEls = children.filter(el => el !== h2 && !el.classList.contains('front-matter') && !el.classList.contains('lucivo-slot') && !el.querySelector('.lucivo-slot'));
    const hasComplexBlock = proseEls.some(el => /^(H[3-6]|TABLE|PRE)$/.test(el.tagName) || el.querySelector('table, pre'));
    const actionsHtml = buildSlabActionsHtml();
    if (slots.length === 1 && proseEls.length >= 1 && !hasComplexBlock) {
      const fm = wrapper.querySelector(':scope > .front-matter');
      const slotEl = children.find(el => el.classList.contains('lucivo-slot') || el.querySelector('.lucivo-slot'));
      const proseHtml = proseEls.map(el => el.outerHTML).join('');
      const headHtml = `${fm ? fm.outerHTML : ''}${h2 ? h2.outerHTML : ''}`;
      slabsHtml += `<section class="exhibition-slab exhibition-slab-split vs-tpl-split"${stageAttr}>${headHtml}<div class="exhibition-slab-body"><div class="exhibition-slab-prose">${proseHtml}</div><div class="exhibition-slab-figure">${slotEl.outerHTML}</div></div>${actionsHtml}</section>`;
    } else {
      const template = detectSlabTemplate(proseEls, slots.length);
      applySlabTemplate(template, proseEls);
      slabsHtml += `<section class="exhibition-slab vs-tpl-${template}"${stageAttr}>${wrapper.innerHTML}${actionsHtml}</section>`;
    }
  });

  // 見出しの文字（textContent）はエスケープしてから埋め込む。そのまま入れると、見出しに書いた
  // &lt;img …&gt; などが HTML として解釈される（NFR-003）
  const heroHtml = heroTitle ? buildCoverHtml(heroTitle, coverMeta, agenda, totalFigures) : '';

  // 雛形・バッジ・4 色バーの配色は、スタイルのクラスが定義する --vs-c1〜4 から取る（DTP-VTPL-070）
  return `
    <div class="exhibition-wrap vs-theme-${state.infographicStyle}">
      ${heroHtml}
      ${slabsHtml}
    </div>
  `;
}

/* ==========================================================================
   ローカルの画像（FR-042, DD-MD-040〜042）
   ========================================================================== */
// 画像の src に書いたローカルのパスを file:// の URL に直す。直せないもの（相対パス、http など）は null を返す。
