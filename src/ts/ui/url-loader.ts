// 公開 URL パラメータ（?url=... / #url=...）および表示状態パラメータ（FR-050, FR-061, DD-FILE-087, DD-FILE-093）
// パラメータが指定されていない通常起動では外部通信を行わない（NFR-008）

const FETCH_TIMEOUT_MS = 10000;
const MANAGED_PARAM_KEYS = ['url', 'mode', 'theme', 'style', 'tone', 'view'];

export interface DisplayStateSnapshot {
  isVisualMode: boolean;
  appearance: string;
  infographicStyle: string;
  tone: string;
  viewMode: string;
}

export interface DisplayStateParams {
  isVisualMode?: boolean;
  appearance?: 'light' | 'dark';
  infographicStyle?: string;
  tone?: string;
  viewMode?: 'split' | 'canvas' | 'editor';
}

function getMergedParam(searchParams: URLSearchParams, hashParams: URLSearchParams, key: string): string | null {
  const q = searchParams.get(key);
  if (q !== null && q.trim() !== '') return q.trim();
  const h = hashParams.get(key);
  if (h !== null && h.trim() !== '') return h.trim();
  return null;
}

function parseHashAsSearchParams(hash: string): URLSearchParams {
  if (!hash || hash.length <= 1) return new URLSearchParams();
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  return new URLSearchParams(rawHash);
}

/**
 * window.location の search / hash から `url` パラメータの値を取り出す。
 * 指定がなければ null を返す。
 */
export function extractMarkdownUrlFromLocation(search: string, hash: string): string | null {
  const searchParams = new URLSearchParams(search || '');
  const hashParams = parseHashAsSearchParams(hash);
  return getMergedParam(searchParams, hashParams, 'url');
}

/**
 * window.location の search / hash から表示状態パラメータを抽出・検証する（FR-061）。
 * 不正な値・未定義の識別名は無視する。
 */
export function parseDisplayStateParams(
  search: string,
  hash: string,
  validStyles: string[],
  validTones: string[]
): DisplayStateParams {
  const searchParams = new URLSearchParams(search || '');
  const hashParams = parseHashAsSearchParams(hash);
  const result: DisplayStateParams = {};

  const mode = getMergedParam(searchParams, hashParams, 'mode')?.toLowerCase();
  if (mode === 'visual') result.isVisualMode = true;
  else if (mode === 'fast') result.isVisualMode = false;

  const theme = getMergedParam(searchParams, hashParams, 'theme')?.toLowerCase();
  if (theme === 'dark' || theme === 'light') result.appearance = theme;

  const style = getMergedParam(searchParams, hashParams, 'style')?.toLowerCase();
  if (style && validStyles.includes(style)) {
    result.infographicStyle = style;
    if (result.isVisualMode === undefined) result.isVisualMode = true;
  }

  const tone = getMergedParam(searchParams, hashParams, 'tone')?.toLowerCase();
  if (tone && validTones.includes(tone)) {
    result.tone = tone;
  }

  const view = getMergedParam(searchParams, hashParams, 'view')?.toLowerCase();
  if (view === 'split' || view === 'canvas') result.viewMode = view;
  else if (view === 'code' || view === 'editor') result.viewMode = 'editor';

  return result;
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
 * GitHub の画面 URL（/blob/<ref>/<path>、/raw/<ref>/<path>）を raw.githubusercontent.com へ読み替える。
 * スラッシュを含むブランチ名は境目を機械判別できないため対象外とする。
 */
export function rewriteGitHubBlobUrl(url: URL): { fetchUrl: URL; rewritten: boolean } {
  if (url.hostname !== 'github.com') {
    return { fetchUrl: url, rewritten: false };
  }
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length >= 5 && (segments[2] === 'blob' || segments[2] === 'raw')) {
    const [owner, repo, , ref, ...pathParts] = segments;
    const rawUrl = new URL(`https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${pathParts.join('/')}`);
    return { fetchUrl: rawUrl, rewritten: true };
  }
  return { fetchUrl: url, rewritten: false };
}

/**
 * GitHub のフォルダ URL（/tree/<ref> または /tree/<ref>/<path>）を解析する。
 */
export interface GitHubTreeSpec {
  owner: string;
  repo: string;
  ref: string;
  basePath: string;
}

export function parseGitHubTreeUrl(url: URL): GitHubTreeSpec | null {
  if (url.hostname !== 'github.com') return null;
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 4 || segments[2] !== 'tree') return null;
  const [owner, repo, , ref, ...pathParts] = segments;
  return {
    owner: decodeURIComponent(owner),
    repo: decodeURIComponent(repo),
    ref: decodeURIComponent(ref),
    basePath: pathParts.map(p => {
      try { return decodeURIComponent(p); } catch (_) { return p; }
    }).join('/')
  };
}

/**
 * GitHub のリポジトリ内パスから raw.githubusercontent.com の URL を組み立てる。
 */
export function makeGitHubRawUrl(owner: string, repo: string, ref: string, fullRepoPath: string): string {
  const encodedPath = fullRepoPath.split('/').filter(Boolean).map(seg => encodeURIComponent(seg)).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(ref)}/${encodedPath}`;
}

/**
 * GitHub Trees API を用いて公開リポジトリの指定フォルダ配下の Markdown ファイル一覧を取得する。
 */
export async function fetchGitHubTreeFiles(
  spec: GitHubTreeSpec,
  filePattern: RegExp,
  limit = 2000,
  maxDepth = 12,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<{ files: Array<{ path: string; name: string; dir: string }>; truncated: boolean }> {
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(spec.owner)}/${encodeURIComponent(spec.repo)}/git/trees/${encodeURIComponent(spec.ref)}?recursive=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(apiUrl, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: controller.signal
    });
    if (res.status === 403 || res.status === 429) {
      throw new Error('GITHUB_RATE_LIMIT');
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    const prefix = spec.basePath ? `${spec.basePath}/` : '';
    const files: Array<{ path: string; name: string; dir: string }> = [];
    let truncated = Boolean(data.truncated);
    for (const item of data.tree || []) {
      if (item.type !== 'blob' || typeof item.path !== 'string') continue;
      let relPath = item.path;
      if (prefix) {
        if (!relPath.startsWith(prefix)) continue;
        relPath = relPath.slice(prefix.length);
      }
      if (!relPath) continue;
      const parts = relPath.split('/');
      if (parts.some(p => p.startsWith('.') || p === 'node_modules')) continue;
      if (parts.length - 1 > maxDepth) continue;
      const name = parts[parts.length - 1];
      if (!filePattern.test(name)) continue;
      if (files.length >= limit) {
        truncated = true;
        break;
      }
      files.push({
        path: relPath,
        name,
        dir: parts.slice(0, -1).join('/')
      });
    }
    return { files, truncated };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * ドロップ時の DataTransfer（text/uri-list, text/plain）から公開 URL 候補を取り出す。
 */
export function extractDroppedUrl(uriList: string, plainText: string): string | null {
  const candidates: string[] = [];
  if (uriList) {
    for (const line of uriList.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        candidates.push(trimmed);
        break;
      }
    }
  }
  if (plainText) {
    const firstLine = plainText.trim().split(/\r?\n/)[0]?.trim();
    if (firstLine) candidates.push(firstLine);
  }
  for (const candidate of candidates) {
    if (/^https?:\/\//i.test(candidate)) return candidate;
  }
  return null;
}

/**
 * 現在の表示状態と公開 URL を反映したアプリ URL を組み立てる（既定値は省略）。
 */
export function buildAppUrlWithState(
  currentHref: string,
  displayState: DisplayStateSnapshot,
  remoteUrl: string | null,
  defaultViewMode: string
): string {
  const next = new URL(currentHref);
  if (remoteUrl) next.searchParams.set('url', remoteUrl);
  else next.searchParams.delete('url');

  if (displayState.isVisualMode) next.searchParams.set('mode', 'visual');
  else next.searchParams.delete('mode');

  if (displayState.appearance === 'dark') next.searchParams.set('theme', 'dark');
  else next.searchParams.delete('theme');

  if (displayState.infographicStyle && displayState.infographicStyle !== 'shapes') {
    next.searchParams.set('style', displayState.infographicStyle);
  } else {
    next.searchParams.delete('style');
  }

  if (displayState.tone && displayState.tone !== 'default') {
    next.searchParams.set('tone', displayState.tone);
  } else {
    next.searchParams.delete('tone');
  }

  if (displayState.viewMode && displayState.viewMode !== defaultViewMode) {
    next.searchParams.set('view', displayState.viewMode === 'editor' ? 'code' : displayState.viewMode);
  } else {
    next.searchParams.delete('view');
  }

  // 旧ハッシュ形式のパラメータが混在している場合は、管理対象のキーのみハッシュから取り除く
  if (next.hash && next.hash.length > 1) {
    const hashParams = parseHashAsSearchParams(next.hash);
    if (MANAGED_PARAM_KEYS.some(key => hashParams.has(key))) {
      for (const key of MANAGED_PARAM_KEYS) hashParams.delete(key);
      const rest = hashParams.toString();
      next.hash = rest ? `#${rest}` : '';
    }
  }

  return next.toString();
}

/**
 * 履歴を増やさずにアドレスバーを現在の状態へ同期する。
 * file:// 環境等で書き換えが拒否された場合は無視して処理を続ける。
 */
export function syncBrowserUrl(
  displayState: DisplayStateSnapshot,
  remoteUrl: string | null,
  defaultViewMode: string
): void {
  if (typeof window === 'undefined' || !window.history || typeof window.history.replaceState !== 'function') return;
  try {
    const nextUrl = buildAppUrlWithState(window.location.href, displayState, remoteUrl, defaultViewMode);
    if (nextUrl !== window.location.href) {
      window.history.replaceState(null, '', nextUrl);
    }
  } catch (_) {}
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
