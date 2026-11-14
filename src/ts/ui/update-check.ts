// 起動時の案内の「更新を確認」（FR-049, DD-FILE-084〜086）
// ボタンを押したときだけ GitHub の最新リリースを問い合わせる。押さなければ通信しない（NFR-008）
import { escapeHtml } from '../utils/escape';
import { showToast } from './toast';

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

function parseSemver(ver: string): { nums: [number, number, number]; pre: string } {
  const cleaned = (ver || '').trim().replace(/\s*\([^)]*\)\s*$/, '').split('+')[0];
  const dashIdx = cleaned.indexOf('-');
  const core = dashIdx >= 0 ? cleaned.slice(0, dashIdx) : cleaned;
  const pre = dashIdx >= 0 ? cleaned.slice(dashIdx + 1) : '';
  const [maj = 0, min = 0, pat = 0] = core.split('.').map(n => parseInt(n, 10) || 0);
  return { nums: [maj, min, pat], pre };
}

// a が b より新しければ正、同じなら 0、古ければ負（プレリリース版より正式版を新しいとみなす）
export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (let i = 0; i < 3; i++) {
    const d = pa.nums[i] - pb.nums[i];
    if (d !== 0) return d;
  }
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && !pb.pre) return -1;
  return pa.pre.localeCompare(pb.pre);
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

// 実行環境が Web 版（http: / https:）かスタンドアロン版（file:）かを判定する（#89）
export function isWebVersion(): boolean {
  return typeof window !== 'undefined' && window.location.protocol !== 'file:';
}

// 描画済みの案内に、版と確認の結果を書き込む
export function applyUpdateCheckState(root: ParentNode = document): void {
  const web = isWebVersion();
  const headerWrap = document.getElementById('header-update-wrap');
  if (headerWrap) {
    headerWrap.classList.toggle('hidden', web);
    headerWrap.style.display = web ? 'none' : '';
  }
  const moreUpdateItem = document.getElementById('menu-more-update');
  if (moreUpdateItem) {
    moreUpdateItem.classList.toggle('hidden', web);
    moreUpdateItem.style.display = web ? 'none' : '';
  }

  root.querySelectorAll<HTMLElement>('.update-check-version').forEach(el => { el.textContent = APP_VERSION; });
  root.querySelectorAll<HTMLElement>('.btn-check-update, .update-check-result').forEach(el => {
    el.classList.toggle('hidden', web);
    el.style.display = web ? 'none' : '';
  });
  root.querySelectorAll<HTMLElement>('.empty-guide-latest').forEach(el => {
    const label = el.querySelector<HTMLElement>('.empty-guide-latest-label');
    const link = el.querySelector<HTMLAnchorElement>('.empty-guide-latest-link');
    if (web) {
      if (label) label.textContent = 'スタンドアロン版はこちら';
      if (link) {
        link.href = RELEASES_URL;
        link.textContent = 'github.com/prankster-freedom/Lucivo/releases';
      }
    }
  });
  if (web) return;

  root.querySelectorAll<HTMLElement>('.update-check-result').forEach(el => {
    el.innerHTML = lastResult ? resultHtml(lastResult) : '';
    el.dataset.state = lastResult ? lastResult.kind : '';
  });
  root.querySelectorAll<HTMLButtonElement>('.btn-check-update, #menu-check-update').forEach(btn => {
    btn.disabled = !!lastResult && lastResult.kind === 'checking';
  });
  const headerBtn = document.getElementById('btn-header-update') as HTMLButtonElement | null;
  const headerLabel = document.getElementById('header-update-label');
  const headerMenuResult = document.getElementById('header-update-menu-result');
  if (headerMenuResult) {
    headerMenuResult.classList.toggle('hidden', !lastResult);
  }
  if (headerLabel) {
    if (lastResult?.kind === 'checking') {
      headerLabel.textContent = '確認中…';
    } else if (lastResult?.kind === 'newer') {
      headerLabel.textContent = '更新あり';
    } else if (lastResult?.kind === 'latest') {
      headerLabel.textContent = '更新なし';
    } else {
      headerLabel.textContent = '最新版確認';
    }
  }
  if (headerBtn) {
    headerBtn.classList.toggle('is-active', lastResult?.kind === 'newer');
    if (lastResult?.kind === 'latest') {
      headerBtn.title = `最新版です（v${lastResult.version}）`;
    } else if (lastResult?.kind === 'newer') {
      headerBtn.title = `新しい版 v${lastResult.version} があります（現在 v${APP_VERSION}）`;
    } else {
      headerBtn.title = `最新版を確認（現在 v${APP_VERSION}）`;
    }
  }
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
  if (isWebVersion()) return;
  if (lastResult && lastResult.kind === 'checking') return;
  lastResult = { kind: 'checking' };
  applyUpdateCheckState();
  showToast('最新リリースを確認しています…（GitHubに接続中）');
  lastResult = await fetchLatest();
  applyUpdateCheckState();
  if (lastResult.kind === 'latest') {
    showToast(`最新版です（v${lastResult.version}）`);
  } else if (lastResult.kind === 'newer') {
    showToast(`新しい版 v${lastResult.version} があります`);
  } else if (lastResult.kind === 'error') {
    showToast('更新を確認できませんでした（接続を確認してください）');
  }
}

// 案内は描画のたびに作り直すため、ボタンの押下は document で受ける
export function setupUpdateCheck(): void {
  document.addEventListener('click', e => {
    const target = e.target as Element | null;
    if (target && target.closest('.btn-check-update, #menu-check-update')) {
      e.preventDefault();
      checkForUpdate();
    }
  });
}
