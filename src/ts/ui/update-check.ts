// 起動時の案内の「更新を確認」（FR-049, DD-FILE-084〜086）
// ボタンを押したときだけ GitHub の最新リリースを問い合わせる。押さなければ通信しない（NFR-008）
import { escapeHtml } from '../utils/escape';

// ビルド時に package.json の version を埋め込む（tools/build-app.cjs の define）
declare const __LUCIVO_VERSION__: string;
export const APP_VERSION: string = typeof __LUCIVO_VERSION__ === 'string' ? __LUCIVO_VERSION__ : '0.0.0';

export const LATEST_RELEASE_API = 'https://api.github.com/repos/prankster-freedom/Lucivo/releases/latest';
// 取得に失敗したときの案内先（リリースの一覧）
const RELEASES_URL = 'https://github.com/prankster-freedom/Lucivo/releases';
const TIMEOUT_MS = 10000;

type CheckResult =
  | { kind: 'checking' }
  | { kind: 'latest'; version: string }
  | { kind: 'newer'; version: string; url: string }
  | { kind: 'error' };

// 案内は描画のたびに作り直すため、結果を覚えておき、描画の後に書き戻す
let lastResult: CheckResult | null = null;

// タグ（lucivo-v0.7.0 など）から版番号を取り出す。取り出せなければ null
export function parseReleaseVersion(tag: string): string | null {
  const m = /(\d+)\.(\d+)\.(\d+)/.exec(tag || '');
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

// a が b より新しければ正、同じなら 0、古ければ負
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

function resultHtml(result: CheckResult): string {
  switch (result.kind) {
    case 'checking':
      return '確認しています…';
    case 'latest':
      return `最新版です（${escapeHtml(result.version)}）`;
    case 'newer':
      return `新しい版 <strong>${escapeHtml(result.version)}</strong> があります: <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener noreferrer">リリースのページを開く</a>`;
    default:
      return `確認できませんでした。インターネットへの接続を確かめるか、<a href="${RELEASES_URL}" target="_blank" rel="noopener noreferrer">リリースの一覧</a>を開いてください`;
  }
}

// 描画済みの案内に、版と確認の結果を書き込む
export function applyUpdateCheckState(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.update-check-version').forEach(el => { el.textContent = APP_VERSION; });
  root.querySelectorAll<HTMLElement>('.update-check-result').forEach(el => {
    el.innerHTML = lastResult ? resultHtml(lastResult) : '';
    el.dataset.state = lastResult ? lastResult.kind : '';
  });
  root.querySelectorAll<HTMLButtonElement>('.btn-check-update').forEach(btn => {
    btn.disabled = !!lastResult && lastResult.kind === 'checking';
  });
}

async function fetchLatest(): Promise<CheckResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(LATEST_RELEASE_API, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
      signal: controller.signal
    });
    if (!res.ok) return { kind: 'error' };
    const data = await res.json();
    const version = parseReleaseVersion(String(data.tag_name || ''));
    if (!version) return { kind: 'error' };
    if (compareVersions(version, APP_VERSION) > 0) {
      const url = typeof data.html_url === 'string' && data.html_url.startsWith('https://github.com/') ? data.html_url : RELEASES_URL;
      return { kind: 'newer', version, url };
    }
    return { kind: 'latest', version: APP_VERSION };
  } catch (_) {
    return { kind: 'error' };
  } finally {
    clearTimeout(timer);
  }
}

export async function checkForUpdate(): Promise<void> {
  if (lastResult && lastResult.kind === 'checking') return;
  lastResult = { kind: 'checking' };
  applyUpdateCheckState();
  lastResult = await fetchLatest();
  applyUpdateCheckState();
}

// 案内は描画のたびに作り直すため、ボタンの押下は document で受ける
export function setupUpdateCheck(): void {
  document.addEventListener('click', e => {
    const target = e.target as Element | null;
    if (target && target.closest('.btn-check-update')) {
      e.preventDefault();
      checkForUpdate();
    }
  });
}
