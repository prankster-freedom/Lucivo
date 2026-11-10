import { escapeHtml } from '../utils/escape';

/* ==========================================================================
   YAML フロントマター（FR-011）: 先頭を切り出し、表示するときは行単位で色分けする
   ========================================================================== */

export interface SplitFrontMatterResult {
  yaml: string | null;
  body: string;
}

// 文書の先頭だけを調べる。閉じの行がない場合は、先頭の水平線を隠さないよう一致させない（DD-FM-001）
export function splitFrontMatter(text: string): SplitFrontMatterResult {
  const m = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
  if (!m) return { yaml: null, body: text };
  return { yaml: m[1] || '', body: text.slice(m[0].length) };
}

// YAML は解析せず、コメント・キー・値を行ごとに色分けする（DD-FM-021）。各部分はエスケープしてから囲む
export function highlightYamlLine(line: string): string {
  if (/^\s*#/.test(line)) return `<span class="fm-comment">${escapeHtml(line)}</span>`;
  const m = /^(\s*(?:-\s+)?)([^\s#:][^:]*?)(:)(\s.*|$)/.exec(line);
  if (m) {
    return `${escapeHtml(m[1])}<span class="fm-key">${escapeHtml(m[2])}</span>${escapeHtml(m[3])}<span class="fm-value">${escapeHtml(m[4])}</span>`;
  }
  return `<span class="fm-value">${escapeHtml(line)}</span>`;
}

export function buildFrontMatterHtml(yaml: string): string {
  const body = yaml.split(/\r?\n/).map(highlightYamlLine).join('\n');
  return `<section class="front-matter"><div class="front-matter-label">Front Matter</div><pre class="front-matter-body"><code>${body}</code></pre></section>\n`;
}
