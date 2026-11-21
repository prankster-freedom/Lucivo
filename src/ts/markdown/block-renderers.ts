/* ==========================================================================
   表の包み・コールアウトを、Marked のレンダラー（文字列の段階）で最初から出力する（#287, DD-MD-020・021）
   描画のあとに DOM を走査して書き換える二段構えをやめ、要素の HTML の定義をここの 1 か所にする。
   Markdown に直接書かれた HTML の <table>・<blockquote> は、レンダラーを通らないため、
   本文にあるときだけ、従来の DOM の書き換え（wrapTables・decorateAlerts）を残す。
   ========================================================================== */
import { runtime } from '../ui/state';
import { ALERT_LABELS, ALERT_MARKER_RE } from './callouts';

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

export function setupMarkedBlocks(): void {
  const base = new marked.Renderer();
  marked.use({
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
      }
    }
  });
}
