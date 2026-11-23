// 多言語管理モジュール（FR-065〜067, ARC-I18N-001〜004）
// file:// 環境でも通信なしで動くよう、辞書をバンドルに同梱する。
import { ja, type I18nDict, type I18nKey } from './ja';
import { en } from './en';

export type Lang = 'ja' | 'en';
export type { I18nKey, I18nDict };

export const LANG_STORAGE_KEY = 'lucivo-lang';

const DICTS: Record<Lang, I18nDict> = { ja, en };
const listeners = new Set<(lang: Lang) => void>();

let currentLang: Lang = 'ja';
let initialized = false;

function readLangFromUrl(): Lang | null {
  if (typeof window === 'undefined') return null;
  try {
    const q = new URLSearchParams(window.location.search || '').get('lang')?.toLowerCase();
    if (q === 'ja' || q === 'en') return q;
    const rawHash = window.location.hash?.startsWith('#') ? window.location.hash.slice(1) : '';
    if (rawHash) {
      const h = new URLSearchParams(rawHash).get('lang')?.toLowerCase();
      if (h === 'ja' || h === 'en') return h;
    }
  } catch (_) {}
  return null;
}

function readLangFromStorage(): Lang | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ja' || saved === 'en') return saved;
  } catch (_) {}
  return null;
}

export function detectBrowserLang(): Lang {
  if (typeof navigator === 'undefined') return 'ja';
  const navLang = navigator.language || (Array.isArray(navigator.languages) ? navigator.languages[0] : '') || '';
  return /^ja\b/i.test(navLang) ? 'ja' : 'en';
}

export function detectInitialLang(): Lang {
  return readLangFromUrl() || readLangFromStorage() || detectBrowserLang();
}

export function initI18n(): Lang {
  if (!initialized) {
    currentLang = detectInitialLang();
    initialized = true;
  }
  syncHtmlLang();
  return currentLang;
}

export function getLang(): Lang {
  if (!initialized) initI18n();
  return currentLang;
}

function syncHtmlLang(): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = currentLang;
  }
}

export function setLang(lang: Lang, opts: { persist?: boolean; notify?: boolean } = {}): void {
  const next: Lang = lang === 'en' ? 'en' : 'ja';
  const changed = !initialized || currentLang !== next;
  currentLang = next;
  initialized = true;
  syncHtmlLang();
  if (opts.persist !== false) {
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch (_) {}
  }
  if (opts.notify !== false && changed) {
    listeners.forEach(fn => {
      try { fn(next); } catch (_) {}
    });
  }
}

export function onLangChange(fn: (lang: Lang) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function t(key: I18nKey, vars?: Record<string, string | number>): string {
  const dict = DICTS[getLang()] || ja;
  let text = dict[key] ?? ja[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

export function getReadmeViewerUrl(lang: Lang = getLang()): string {
  const file = lang === 'en' ? 'README.en.md' : 'README.md';
  const rawBlob = `https://github.com/prankster-freedom/Lucivo/blob/main/${file}`;
  const langParam = lang === 'en' ? '&lang=en' : '';
  return `https://prankster-freedom.github.io/Lucivo/preview/?url=${encodeURIComponent(rawBlob)}&view=canvas&mode=visual${langParam}`;
}

export function resolveSampleFileName(baseFileName: string, lang: Lang = getLang()): string {
  const normalized = baseFileName.replace(/\.en\.md$/i, '.md');
  if (lang === 'en' && /\.md$/i.test(normalized)) {
    return normalized.replace(/\.md$/i, '.en.md');
  }
  return normalized;
}

export function getSampleBaseFileName(fileName: string): string {
  return fileName.replace(/\.en\.md$/i, '.md');
}

export function applyStaticI18n(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n') as I18nKey | null;
    if (key) el.textContent = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-html]').forEach(el => {
    const key = el.getAttribute('data-i18n-html') as I18nKey | null;
    if (key) el.innerHTML = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title') as I18nKey | null;
    if (key) el.title = t(key);
  });
  root.querySelectorAll<HTMLElement>('[data-i18n-aria-label]').forEach(el => {
    const key = el.getAttribute('data-i18n-aria-label') as I18nKey | null;
    if (key) el.setAttribute('aria-label', t(key));
  });
  root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder') as I18nKey | null;
    if (key) el.placeholder = t(key);
  });
  root.querySelectorAll<HTMLImageElement>('[data-i18n-alt]').forEach(el => {
    const key = el.getAttribute('data-i18n-alt') as I18nKey | null;
    if (key) el.alt = t(key);
  });

  // README への導線リンクを現在の言語に合わせる
  const readmeUrl = getReadmeViewerUrl();
  root.querySelectorAll<HTMLAnchorElement>('.brand-link, #btn-header-help').forEach(a => {
    a.href = readmeUrl;
  });

  // 同梱サンプルメニュー項目の表記（ファイル名つき）を更新
  const sampleMap: Array<[string, I18nKey, string]> = [
    ['menu-sample-visual', 'sample.visualWithFile', 'visual-sample.md'],
    ['menu-sample-notation', 'sample.notationWithFile', 'notation_sample.md'],
    ['menu-sample-notation-extra', 'sample.notationExtraWithFile', 'notation_sample_extra1.md'],
    ['menu-sample-museum-walk', 'sample.museumWalkWithFile', 'museum-walk-sample.md'],
    ['menu-sample-color-museum', 'sample.colorMuseumWithFile', 'color-museum-sample.md'],
    ['menu-sample-print', 'sample.printWithFile', 'print-sample.md']
  ];
  for (const [id, key, baseFile] of sampleMap) {
    const btn = document.getElementById(id);
    if (btn) btn.textContent = t(key, { file: resolveSampleFileName(baseFile) });
  }

  // 言語切り替え UI の表示状態を同期
  const lang = getLang();
  const parenOpen = document.getElementById('save-file-paren-open');
  const parenClose = document.getElementById('save-file-paren-close');
  if (parenOpen) parenOpen.textContent = lang === 'en' ? ' (' : '（';
  if (parenClose) parenClose.textContent = lang === 'en' ? ')' : '）';
  const langLabel = document.getElementById('header-lang-label');
  if (langLabel) langLabel.textContent = lang === 'ja' ? '日本語' : 'EN';
  document.querySelectorAll<HTMLElement>('[data-lang-option]').forEach(btn => {
    const active = btn.getAttribute('data-lang-option') === lang;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

// 別バンドル（stage.js 等）や E2E テスト向けのグローバル公開
if (typeof window !== 'undefined') {
  (window as any).LucivoI18n = {
    getLang,
    setLang,
    t,
    onLangChange,
    applyStaticI18n
  };
}
