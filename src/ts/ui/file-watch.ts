// ローカルファイルの外部更新検知と自動反映（FR-062, DD-FILE-094, #282）
// File System Access API のハンドル（単一ファイル / フォルダ内ファイル）から lastModified・size を監視し、
// 未編集ならスクロール位置を保って自動反映、編集中なら上書きせず通知バーで「読み込み直す」を案内する。
import { runtime } from './state';
import { showToast } from './toast';

export const AUTO_RELOAD_KEY = 'lucivo.autoReloadOnChange';
const POLL_INTERVAL_MS = 2000;

export interface WatchTarget {
  getFile: () => Promise<File | null>;
  fileName: string;
  folderPath: string | null;
  lastModified: number;
  size: number;
  onReload: (file: File) => Promise<void>;
}

let autoReloadFallback = true;
let activeTarget: WatchTarget | null = null;
let checking = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function isAutoReloadEnabled(): boolean {
  try {
    const saved = localStorage.getItem(AUTO_RELOAD_KEY);
    return saved === null ? autoReloadFallback : saved === '1';
  } catch (_) {
    return autoReloadFallback;
  }
}

export function setAutoReloadEnabled(enabled: boolean): void {
  autoReloadFallback = enabled;
  try {
    localStorage.setItem(AUTO_RELOAD_KEY, enabled ? '1' : '0');
  } catch (_) {}
}

function isPresenting(): boolean {
  const cl = document.documentElement.classList;
  return cl.contains('is-stage-show') || cl.contains('is-museum-walk') || cl.contains('is-present-mode');
}

export function hideExternalUpdateBanner(): void {
  const banner = document.getElementById('external-update-banner');
  if (banner) banner.classList.add('hidden');
}

function showExternalUpdateBanner(fileName: string): void {
  const banner = document.getElementById('external-update-banner');
  const label = document.getElementById('external-update-message');
  if (label) label.textContent = `「${fileName}」が外部で更新されました（編集中のため自動反映を保留しています）`;
  if (banner) banner.classList.remove('hidden');
}

export function watchFile(target: WatchTarget): void {
  activeTarget = target;
  hideExternalUpdateBanner();
}

export function clearWatchedFile(): void {
  activeTarget = null;
  hideExternalUpdateBanner();
}

export async function reloadWatchedFile(): Promise<boolean> {
  const target = activeTarget;
  if (!target) return false;
  try {
    const file = await target.getFile();
    if (!file || target !== activeTarget) return false;
    target.lastModified = file.lastModified;
    target.size = file.size;
    await target.onReload(file);
    hideExternalUpdateBanner();
    showToast(`「${target.fileName}」を読み込み直しました`);
    return true;
  } catch (err) {
    console.warn('Failed to reload watched file:', err);
    showToast(`「${target.fileName}」を読み込み直せませんでした`);
    return false;
  }
}

export async function checkWatchedFileNow(): Promise<boolean> {
  const target = activeTarget;
  if (!target || checking || !isAutoReloadEnabled() || document.hidden || isPresenting()) return false;
  checking = true;
  try {
    const file = await target.getFile();
    if (!file || target !== activeTarget) return false;
    if (file.lastModified === target.lastModified && file.size === target.size) return false;
    target.lastModified = file.lastModified;
    target.size = file.size;
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement | null;
    const isDirty = Boolean(editor && editor.value !== runtime.lastLoadedMarkdown);
    if (isDirty) {
      showExternalUpdateBanner(target.fileName);
      showToast(`「${target.fileName}」が外部で更新されました（編集中のため保留）`, 4000);
      return true;
    }
    await target.onReload(file);
    hideExternalUpdateBanner();
    showToast(`「${target.fileName}」の外部更新を反映しました`);
    return true;
  } catch (_) {
    // 権限切れや一時的な読み取り失敗では静かに待つ
    return false;
  } finally {
    checking = false;
  }
}

export function setupFileWatch(): void {
  const toggle = document.getElementById('setting-auto-reload') as HTMLInputElement | null;
  if (toggle) {
    toggle.checked = isAutoReloadEnabled();
    toggle.addEventListener('change', () => {
      setAutoReloadEnabled(toggle.checked);
      showToast(toggle.checked ? 'ローカルファイルの外部更新を自動で反映します' : 'ローカルファイルの外部更新の自動反映をオフにしました');
    });
  }
  document.getElementById('btn-external-reload')?.addEventListener('click', () => {
    void reloadWatchedFile();
  });
  document.getElementById('btn-external-reload-dismiss')?.addEventListener('click', () => {
    hideExternalUpdateBanner();
  });
  window.addEventListener('focus', () => {
    void checkWatchedFileNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void checkWatchedFileNow();
  });
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    void checkWatchedFileNow();
  }, POLL_INTERVAL_MS);
  (window as any).checkWatchedFileNow = checkWatchedFileNow;
}
