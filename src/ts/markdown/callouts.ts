/* ==========================================================================
   コールアウト（GitHub アラート記法, FR-034）: サニタイズ後の DOM で、最初の行がマーカーだけの引用を注意書きのパネルにする
   ========================================================================== */
export const ALERT_LABELS: Record<string, string> = {
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution'
};

// マーカーの後ろに同じ行で文字が続くもの（[!NOTE] 本文）は、GitHub と同じく通常の引用のままにする
export const ALERT_MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;

// 引用の最初の段落の先頭の文字だけを調べ、要素の大きさは計測しない（NFR-006, DD-MD-021）
export function decorateAlerts(container: HTMLElement): void {
  container.querySelectorAll('blockquote').forEach(quote => {
    const first = quote.firstElementChild;
    const head = first && first.tagName === 'P' ? first.firstChild : null;
    const match = head && head.nodeType === Node.TEXT_NODE ? ALERT_MARKER_RE.exec(head.textContent || '') : null;
    if (!match) return;
    const type = match[1].toLowerCase();
    if (head && head.textContent) {
      head.textContent = head.textContent.slice(match[0].length);
      if (!head.textContent && head.nextSibling && head.nextSibling.nodeName === 'BR') {
        head.nextSibling.remove();
      }
    }
    if (first && !first.textContent?.trim() && !first.querySelector('img, .lucivo-math')) {
      first.remove();
    }

    const alert = document.createElement('div');
    alert.className = `md-alert md-alert-${type}`;
    alert.setAttribute('role', 'note');
    const title = document.createElement('p');
    title.className = 'md-alert-title';
    const icon = document.createElement('span');
    icon.className = 'md-alert-icon';
    icon.setAttribute('aria-hidden', 'true');
    title.append(icon, ALERT_LABELS[type]);
    alert.append(title, ...quote.childNodes);
    quote.replaceWith(alert);
  });
}
