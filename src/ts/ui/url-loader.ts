// 公開 URL パラメータ（?url=... / #url=...）からの Markdown 読み込み（FR-050, DD-FILE-087）
// パラメータが指定されていない通常起動では外部通信を行わない（NFR-008）

const FETCH_TIMEOUT_MS = 10000;

/**
 * window.location の search / hash から `url` パラメータの値を取り出す。
 * 指定がなければ null を返す。
 */
export function extractMarkdownUrlFromLocation(search: string, hash: string): string | null {
  if (search) {
    const queryVal = new URLSearchParams(search).get('url');
    if (queryVal && queryVal.trim()) return queryVal.trim();
  }
  if (hash && hash.length > 1) {
    const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const hashVal = new URLSearchParams(rawHash).get('url');
    if (hashVal && hashVal.trim()) return hashVal.trim();
  }
  return null;
}

/**
 * 読み取り可能な公開 URL（http: / https: のみ）かを検証し、URL オブジェクトを返す。
 * 不正な形式や許可されていないスキームの場合は null を返す。
 */
export function validatePublicMarkdownUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
}

/**
 * URL のパス末尾から表示用・保存用のファイル名を取り出す。
 */
export function extractFileNameFromUrl(url: URL): string {
  const segments = url.pathname.split('/').filter(Boolean);
  const last = segments.length > 0 ? segments[segments.length - 1] : '';
  if (!last) return 'document.md';
  try {
    return decodeURIComponent(last) || 'document.md';
  } catch (_) {
    return last;
  }
}

/**
 * 検証済みの公開 URL から Markdown バイト列を取得する。
 */
export async function fetchMarkdownFromUrl(
  url: URL,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ buffer: ArrayBuffer; fileName: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url.toString(), {
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const buffer = await res.arrayBuffer();
    return { buffer, fileName: extractFileNameFromUrl(url) };
  } finally {
    clearTimeout(timer);
  }
}
