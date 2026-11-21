/* ==========================================================================
   表の包み・コールアウトを、Marked のレンダラー（文字列の段階）で最初から出力する（#287, DD-MD-020・021）
   描画のあとに DOM を走査して書き換える二段構えをやめ、要素の HTML の定義をここの 1 か所にする。
   Markdown に直接書かれた HTML の <table>・<blockquote> は、レンダラーを通らないため、
   本文にあるときだけ、従来の DOM の書き換え（wrapTables・decorateAlerts）を残す。
   ========================================================================== */
import { state, runtime } from '../ui/state';
import { ALERT_LABELS, ALERT_MARKER_RE } from './callouts';
import { createDiagramFrameHtml } from '../diagram/svg-postprocess';

// Markdown 本文に、直接書かれた HTML の表・引用があるか。あるときだけ DOM の書き換えを行う
export function noteRawHtmlBlocks(body: string): void {
  runtime.rawHtmlBlocks = /<(?:table|blockquote)[\s>]/i.test(body);
}

interface AlertParts {
  type: string;
  tokens: any[];
}

// 引用の最初の段落の先頭が、コールアウトのマーカーだけの行なら、マーカーを除いたトークンと種類を返す。
// 判定と取り除き方は、DOM の書き換え（decorateAlerts）と同じ
function readAlert(parser: any, tokens: any[]): AlertParts | null {
  const first = tokens[0];
  if (!first || first.type !== 'paragraph' || !first.tokens || first.tokens.length === 0) return null;
  const head = first.tokens[0];
  if (head.type !== 'text') return null;
  const headText: string = head.text || '';
  const match = ALERT_MARKER_RE.exec(headText);
  if (!match) return null;

  const rest = headText.slice(match[0].length);
  let inline: any[];
  if (rest) {
    inline = [{ ...head, raw: rest, text: rest }, ...first.tokens.slice(1)];
  } else {
    // マーカーのあとの改行（br）は除く
    const after = first.tokens.slice(1);
    inline = after.length > 0 && after[0].type === 'br' ? after.slice(1) : after;
  }

  // マーカーを除いたあとの最初の段落に、見える文字も画像・数式もなければ、その段落ごと除く
  const html: string = parser.parseInline(inline);
  const visible = html.replace(/<[^>]*>/g, '').trim() !== '' || /<img\b|lucivo-math/.test(html);
  const body = visible ? [{ ...first, tokens: inline }, ...tokens.slice(1)] : tokens.slice(1);
  return { type: match[1].toLowerCase(), tokens: body };
}

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_COLOR_RE = /^rgba?\(\s*\d{1,3}%?(?:\s*,\s*|\s+)\d{1,3}%?(?:\s*,\s*|\s+)\d{1,3}%?(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;
const HSL_COLOR_RE = /^hsla?\(\s*\d{1,3}(?:deg|rad|grad|turn)?(?:\s*,\s*|\s+)\d{1,3}%(?:\s*,\s*|\s+)\d{1,3}%(?:\s*[,/]\s*(?:0|1|0?\.\d+|\d{1,3}%))?\s*\)$/i;

// 厳格な書式に一致するカラーコード文字列のみを返す（NFR-003: CSS インジェクション防止）
export function matchInlineColorCode(raw: string): string | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  if (HEX_COLOR_RE.test(s) || RGB_COLOR_RE.test(s) || HSL_COLOR_RE.test(s)) return s;
  return null;
}

export function setupMarkedBlocks(): void {
  const base = new marked.Renderer();
  marked.use({
    extensions: [
      {
        name: 'lucivoDiagram',
        level: 'block',
        renderer(token: any) {
          return `${createDiagramFrameHtml(token.index, state.isVisualMode, token.curve)}\n`;
        }
      }
    ],
    renderer: {
      // 表が親の枠をはみ出さないよう、横スクロールできる .table-container で包む
      table(token) {
        return `<div class="table-container">${base.table.call(this, token).trimEnd()}</div>\n`;
      },
      // コールアウト（GitHub アラート記法）。マーカーでない引用は、標準の描画に任せる（false）
      blockquote(token) {
        const alert = readAlert(this.parser, token.tokens);
        if (!alert) return false;
        const label = ALERT_LABELS[alert.type];
        return `<div class="md-alert md-alert-${alert.type}" role="note"><p class="md-alert-title"><span class="md-alert-icon" aria-hidden="true"></span>${label}</p>${this.parser.parse(alert.tokens)}</div>\n`;
      },
      // インラインコード内のカラーコードに色見本スウォッチを添える（#312）
      codespan(token) {
        const html = base.codespan.call(this, token);
        const color = matchInlineColorCode(token.text);
        if (!color) return html;
        return html.replace('<code>', `<code><span class="lucivo-color-swatch" style="background-color:${color};" aria-hidden="true"></span>`);
      }
    }
  });
}
