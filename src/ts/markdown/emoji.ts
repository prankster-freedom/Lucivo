// @ts-nocheck
import { escapeHtml } from '../utils/escape';
import { loadLibrary } from '../ui/state';

// 絵文字ショートコード（:rocket: など。FR-058、DD-MD-070〜072）。GitHub と同じ名前を、絵文字に変換する。
// 対応表は大きいため、起動時には読み込まず、ショートコードの形（:名前:）が文書に現れたときだけ読み込む（NFR-006）。
// 表を読み込むまでは、元の文字を入れた置き場所（span）を出し、読み込んだ後に絵文字へ置き換える（数式と同じ。DD-MATH-012）。
// 名前が表にないもの（時刻の :30: など）は、元の文字のまま。インラインコード・コードブロック・URL の中は、Marked が先にコードや URL として読むため変換しない

export const emojiExtension = {
  name: 'emojiShortcode',
  level: 'inline',
  start: src => {
    const index = src.indexOf(':');
    return index >= 0 ? index : undefined;
  },
  tokenizer(src) {
    const m = /^:([a-z0-9_+-]+):/.exec(src);
    // 時刻（10:30:15 の :30:）のように、数字だけの名前は対象にしない。表にある数字だけの名前（100・1234・+1・-1）は除く
    if (m && (/[a-z]/.test(m[1]) || ['100', '1234', '+1', '-1'].includes(m[1]))) return { type: 'emojiShortcode', raw: m[0], name: m[1] };
    return undefined;
  },
  renderer(token) {
    const table = window.LucivoEmoji;
    if (table) {
      const emoji = table.lookup(token.name);
      return emoji ? `<span class="lucivo-emoji" role="img" aria-label="${escapeHtml(token.name)}">${emoji}</span>` : escapeHtml(token.raw);
    }
    return `<span class="lucivo-emoji-pending" data-emoji="${escapeHtml(token.name)}">${escapeHtml(token.raw)}</span>`;
  }
};

export function setupMarkedEmoji() {
  marked.use({ extensions: [emojiExtension] });
}

// 置き場所を絵文字に置き換える。表を読み込めなければ、元の文字のまま
export function renderEmoji(container) {
  const pending = container.querySelectorAll('.lucivo-emoji-pending');
  if (pending.length === 0) return;
  if (!window.LucivoEmoji) {
    loadLibrary('emoji').then(ok => { if (ok && container.isConnected) renderEmoji(container); });
    return;
  }
  pending.forEach(el => {
    const emoji = window.LucivoEmoji.lookup(el.dataset.emoji || '');
    if (emoji) {
      el.className = 'lucivo-emoji';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', el.dataset.emoji);
      el.removeAttribute('data-emoji');
      el.textContent = emoji;
    } else {
      // 表にない名前は、置き場所の包みを外して本文の文字に戻す
      el.replaceWith(document.createTextNode(el.textContent));
    }
  });
}
