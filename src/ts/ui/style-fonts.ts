// Visualモードのスタイル別見出し書体（Web 版のみ遅延読み込み。DTP-004, DD-VTPL-035, #218）
// スタンドアロン版（__LUCIVO_STYLE_FONTS__ === false）ではフォントファイルを同梱せず、共通の書体のままにする。
declare const __LUCIVO_STYLE_FONTS__: boolean;

const STYLE_FONTS_ENABLED = typeof __LUCIVO_STYLE_FONTS__ !== 'undefined' && !!__LUCIVO_STYLE_FONTS__;

interface StyleFontSpec {
  cssHref: string;
  family: string;
  weight: string;
  htmlClass: string;
}

const STYLE_FONT_SPECS: Record<string, StyleFontSpec> = {
  circles: {
    cssHref: './vendor/style-fonts/circles.css',
    family: 'M PLUS Rounded 1c',
    weight: '800',
    htmlClass: 'has-style-font-circles'
  },
  editorial: {
    cssHref: './vendor/style-fonts/editorial.css',
    family: 'Noto Serif JP',
    weight: '700',
    htmlClass: 'has-style-font-editorial'
  }
};

const pendingLoads = new Map<string, Promise<boolean>>();

// 現在表示中の Visual Stage の見出しからユニーク文字を集め、必要な unicode-range チャンクだけ先に読み込む
function collectHeadingSampleText(): string {
  const root = document.getElementById('visual-stage-container');
  const seen = new Set<string>();
  const add = (text: string) => {
    for (const ch of text) {
      if (ch.trim()) seen.add(ch);
      if (seen.size >= 240) break;
    }
  };
  if (root) {
    root.querySelectorAll('.vs-cover-title, .exhibition-slab h1, .exhibition-slab h2, .exhibition-slab h3, .exhibition-slab h4, .vs-endcard-closing')
      .forEach(el => add(el.textContent || ''));
  }
  // 文書が空の段階でも最低限の和文・英数チャンクを温めておく
  add('見出しタイトル章概要構成Aa01');
  return Array.from(seen).join('');
}

function loadStylesheet(href: string): Promise<boolean> {
  const existing = document.querySelector(`link[rel="stylesheet"][data-style-font-href="${href}"]`) as HTMLLinkElement | null;
  if (existing) {
    if (existing.dataset.loaded === '1') return Promise.resolve(true);
    return new Promise(resolve => {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
    });
  }
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.styleFontHref = href;
    link.addEventListener('load', () => {
      link.dataset.loaded = '1';
      resolve(true);
    }, { once: true });
    link.addEventListener('error', () => {
      link.remove();
      resolve(false);
    }, { once: true });
    document.head.appendChild(link);
  });
}

// スタイル別見出し書体が未読み込みなら遅延読み込みし、見出し文字の準備が整ってから一括適用してちらつきを抑える
export function ensureStyleFont(style: string): Promise<boolean> {
  if (!STYLE_FONTS_ENABLED) return Promise.resolve(false);
  const spec = STYLE_FONT_SPECS[style];
  if (!spec) return Promise.resolve(false);
  if (document.documentElement.classList.contains(spec.htmlClass)) return Promise.resolve(true);

  const running = pendingLoads.get(style);
  if (running) return running;

  const task = (async () => {
    const ok = await loadStylesheet(spec.cssHref);
    if (!ok) {
      pendingLoads.delete(style);
      return false;
    }
    try {
      if (document.fonts && typeof document.fonts.load === 'function') {
        const sample = collectHeadingSampleText();
        await Promise.race([
          document.fonts.load(`${spec.weight} 1em "${spec.family}"`, sample),
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
      }
    } catch {
      // Font Loading API 非対応・失敗時も CSS 適用へ進む
    }
    document.documentElement.classList.add(spec.htmlClass);
    return true;
  })();

  pendingLoads.set(style, task);
  return task;
}
