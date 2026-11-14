// @ts-nocheck
import { escapeHtml } from '../utils/escape';
import { fnv1aHash } from '../utils/hash';
import { treeTokenFor } from './tree';
import { MATH_PLOT_BOX, getTexPlotSpec, getCachedMathPlotDataUrl } from '../math/plot';
import { state, mathCache, loadLibrary } from '../ui/state';

// 置き場所の中身は TeX の原文。KaTeX を読み込めない場合は原文がそのまま表示される（DD-MATH-012, 022）
export function mathPlaceholder(tag, tex, isDisplay, raw) {
  return `<${tag} class="lucivo-math" data-display="${isDisplay}" data-tex="${escapeHtml(tex)}">${escapeHtml(raw)}</${tag}>`;
}

export const mathBlockExtension = {
  name: 'mathBlock',
  level: 'block',
  start: src => {
    const m = src.match(/^\$\$/m);
    return m ? m.index : undefined;
  },
  tokenizer(src) {
    const m = /^\$\$[^\S\n]*\n?([\s\S]+?)\n?[^\S\n]*\$\$[^\S\n]*(?:\n+|$)/.exec(src);
    if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
  },
  renderer: token => `${mathPlaceholder('div', token.text, true, token.raw.trim())}\n`
};

// $…$ は、開きの直後・閉じの直前が空白でなく、閉じの直後が数字でない場合だけ数式にする（「$5 と $10」を除くため）。
// 中身にバッククォートを含めない。後ろのインラインコードの中の $ を閉じの $ と取り違えないため
export const mathInlineExtension = {
  name: 'mathInline',
  level: 'inline',
  start: src => {
    const index = src.indexOf('$');
    return index >= 0 ? index : undefined;
  },
  tokenizer(src) {
    const display = /^\$\$((?:\\.|[^\\$`])+?)\$\$/.exec(src);
    if (display) return { type: 'mathInline', raw: display[0], text: display[1].trim(), display: true };
    const inline = /^\$(?!\s)((?:\\.|[^\\$`\n])+?)(?<!\s)\$(?!\d)/.exec(src);
    if (inline) return { type: 'mathInline', raw: inline[0], text: inline[1], display: false };
  },
  renderer: token => mathPlaceholder('span', token.text, token.display, token.raw)
};

export function setupMarkedMath() {
  marked.use({ extensions: [mathBlockExtension, mathInlineExtension] });
}

// 見出しに元の Markdown の行番号（renderApp() が最上位の見出しのトークンに付けた srcLine）を data-src-line として出力する。
// Split 表示の編集位置への追従（FR-037）が、プレビューの見出しと元の行を対応づけるために使う（DD-DIAG-060）
export function setupMarkedHeadings() {
  marked.use({
    renderer: {
      heading(token) {
        const attr = Number.isInteger(token.srcLine) ? ` data-src-line="${token.srcLine}"` : '';
        return `<h${token.depth}${attr}>${this.parser.parseInline(token.tokens)}</h${token.depth}>\n`;
      }
    }
  });
}

// サニタイズ後の HTML に入れた置き場所へ描画する。trust: false で、リンクや任意の属性を作るコマンドは描画しない
// KaTeX は、数式が初めて現れたときに読み込む。読み込めなければ置き場所の原文のまま（DD-MATH-022）。
// Visualモードでは x の関数の数式を検出し、PNG ラスター画像の補足グラフを数式と併記する（FR-048, DD-VTPL-144）
export function renderMath(container) {
  const targets = container.querySelectorAll('.lucivo-math');
  if (targets.length === 0) return;
  if (!window.katex) {
    loadLibrary('katex').then(ok => { if (ok && container.isConnected) renderMath(container); });
    return;
  }
  const isVisualStage = state.isVisualMode && container.id === 'visual-stage-container';
  targets.forEach(el => {
    const isDisplay = el.dataset.display === 'true';
    const tex = el.dataset.tex || '';
    const key = `${isDisplay ? 'D' : 'I'}:${tex}`;
    if (!mathCache.has(key)) {
      mathCache.set(key, katex.renderToString(tex, {
        displayMode: isDisplay,
        throwOnError: false,
        trust: false,
        output: 'htmlAndMathml'
      }));
    }
    const katexHtml = mathCache.get(key);
    const plotSpec = isVisualStage && !el.closest('svg') ? getTexPlotSpec(tex) : null;
    if (plotSpec) {
      const dataUrl = getCachedMathPlotDataUrl(plotSpec, isDisplay, state.infographicStyle, state.appearance, tex);
      const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
      const aria = `関数の補足グラフ: ${plotSpec.fns.map(f => f.label).join(', ')}`;
      el.classList.add('has-math-plot', isDisplay ? 'is-block-plot' : 'is-inline-plot');
      const tag = isDisplay ? 'div' : 'span';
      el.innerHTML = `<${tag} class="vs-math-formula">${katexHtml}</${tag}>`
        + `<img class="vs-math-plot-img${isDisplay ? '' : ' is-inline'}" src="${dataUrl}" width="${box.w}" height="${box.h}" alt="${escapeHtml(aria)}" />`;
    } else {
      el.classList.remove('has-math-plot', 'is-block-plot', 'is-inline-plot');
      el.innerHTML = katexHtml;
    }
  });
}

/* ==========================================================================
   SVG ポストプロセッサ (通常モード vs リファレンス4大インフォグラフィック)
   ========================================================================== */

