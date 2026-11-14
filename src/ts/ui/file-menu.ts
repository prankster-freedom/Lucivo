// @ts-nocheck
import { downloadBlob } from '../utils/download';
import { decodeMarkdown, normalizeText, isUtf8Family } from '../utils/text-decode';
import { showToast, updateStatus } from './toast';
import { applyUpdateCheckState, checkForUpdate } from './update-check';
import { setupPresentModes } from './present-modes';
import {
  state,
  isModalOpen,
  setModalOpen,
  loadLibrary,
  APP_TITLE_SUFFIX,
  DROPPABLE_FILE_PATTERN,
  runtime
} from './state';
import {
  SAMPLES_DIR,
  BUNDLED_SAMPLES,
  renderFolderList,
  scanDirectoryHandle,
  makeHandleFolder,
  makeInputFolder,
  scanEntryDirectory,
  setOpenedFolder,
  openFolder,
  openFolderFromHandle,
  reopenRecentFolder,
  saveRecentFolderHandle,
  openFolderFile
} from './folder-browser';

export const HEADER_MENUS = [
  ['btn-file-menu', 'file-menu'],
  ['btn-save-menu', 'save-menu'],
  ['btn-header-update', 'update-menu'],
  ['btn-mobile-file', 'mobile-file-menu'],
  ['btn-mobile-view', 'mobile-view-menu'],
  ['btn-present-menu', 'present-menu'],
  ['btn-more-menu', 'more-menu']
];

export function closeHeaderMenus() {
  HEADER_MENUS.forEach(([btnId, menuId]) => {
    document.getElementById(menuId)?.classList.add('hidden');
    document.getElementById(btnId)?.setAttribute('aria-expanded', 'false');
  });
}
// 既存の呼び出し（テストを含む）のための別名
export const closeFileMenu = closeHeaderMenus;

// 最後に読み込んだ（または保存した）時点から編集していれば、置き換える前に確認する
export function confirmDiscardEdits(fileName) {
  const editor = document.getElementById('markdown-editor');
  if (editor.value === runtime.lastLoadedMarkdown) return true;
  return window.confirm(`編集中の内容は失われます。「${fileName}」を読み込みますか？`);
}

// folderPath: フォルダから開いたときの、フォルダの中のパス（例: docs/a.md）。相対パスの画像の基準にする（DD-FILE-075）
// isSample: 同梱サンプルとして開いたとき。相対パスの画像とリンクは samples フォルダを基準にする（DD-FILE-081）
// encoding: ファイルから読んだときの文字コード（decodeMarkdown() の結果。同梱サンプルは UTF-8）（FR-048, DD-FILE-083）
// formatted: 読み込み時の整形の結果（FR-053）。整えたときは、読み込みの知らせに直した箇所の数を添える
export function applyLoadedMarkdown(rawText, fileName, folderPath = null, isSample = false, encoding = 'UTF-8', formatted = null) {
  // 改行コードを LF にそろえる。そろえないと、textarea が LF に変えた内容と食い違い、編集していないのに破棄の確認が出る
  const text = normalizeText(String(rawText));
  runtime.currentFileEncoding = encoding;
  document.getElementById('markdown-editor').value = text;
  runtime.lastLoadedMarkdown = text;
  runtime.currentFileName = fileName;
  runtime.currentFolderPath = folderPath;
  runtime.currentSampleFile = isSample ? fileName : null;
  document.getElementById('save-file-name').textContent = fileName;
  renderFolderList();
  // 印刷の「PDF として保存」は、ウィンドウのタイトルを既定のファイル名に使う（FR-040, DD-FILE-050）
  document.title = `${fileName}${APP_TITLE_SUFFIX}`;
  state.curveByIndex.clear();
  setEditorReadOnly(true);
  clearTimeout(runtime.renderDebounceTimer);
  runtime.renderApp();
  document.getElementById('preview-scroll').scrollTop = 0;
  runtime.followedKey = null;
  // UTF-8 以外で読んだときは、何として読んだかと、保存すると UTF-8 になることを知らせる（DD-FILE-083）
  const formatNote = formatted && formatted.changed ? `。${formatSummary(formatted)}を整えました` : '';
  showToast(isUtf8Family(encoding)
    ? `「${fileName}」を読み込みました${formatNote}`
    : `「${fileName}」を ${encoding} として読み込みました（保存は UTF-8 になります）${formatNote}`);
}

/* ==========================================================================
   Markdown の整形（FR-053, DD-FILE-088〜092）
   ========================================================================== */
// 読み込み時に整えるかどうか。既定は整える。ブラウザに覚えられないとき（プライベートの窓など）も既定のまま動く
export const FORMAT_ON_LOAD_KEY = 'lucivo.formatOnLoad';
export let formatOnLoadFallback = true;

export function isFormatOnLoadEnabled() {
  try {
    const saved = localStorage.getItem(FORMAT_ON_LOAD_KEY);
    return saved === null ? formatOnLoadFallback : saved === '1';
  } catch (_) {
    return formatOnLoadFallback;
  }
}

export function setFormatOnLoadEnabled(enabled) {
  formatOnLoadFallback = enabled;
  try { localStorage.setItem(FORMAT_ON_LOAD_KEY, enabled ? '1' : '0'); } catch (_) {}
}

export function formatSummary(result) {
  const parts = [];
  if (result.fixes > 0) parts.push(`記法 ${result.fixes} か所`);
  if (result.tables > 0) parts.push(`表 ${result.tables} 個`);
  return parts.length ? parts.join('と') : '空白';
}

// 文書を整える。整形の部品を読み込めないとき・失敗したときは、元の文書のまま返す（読み込みは止めない）
export async function formatMarkdown(text) {
  if (!(await loadLibrary('formatter')) || !window.LucivoFormatter) return null;
  try {
    return window.LucivoFormatter.format(text);
  } catch (err) {
    console.error('Failed to format markdown:', err);
    return null;
  }
}

// 利用者が開いた文書（ファイル・フォルダ・URL）を、読み込む前に整える。同梱サンプルは整えない（DD-FILE-091）
export async function prepareLoadedText(rawText) {
  const text = normalizeText(String(rawText));
  if (!isFormatOnLoadEnabled()) return { text, formatted: null };
  const result = await formatMarkdown(text);
  return result ? { text: result.text, formatted: result } : { text, formatted: null };
}

// 設定の「今の文書を整える」。整えた内容は保存していない編集として扱う（DD-FILE-092）
export async function formatCurrentDocument() {
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  const result = await formatMarkdown(editor.value);
  if (!result) {
    showToast('Markdown を整えられませんでした');
    return;
  }
  if (!result.changed) {
    showToast('整える箇所はありませんでした');
    return;
  }
  editor.value = result.text;
  clearTimeout(runtime.renderDebounceTimer);
  runtime.renderApp();
  showToast(`${formatSummary(result)}を整えました（保存すると反映されます）`);
}

export function setupFormatter() {
  const toggle = document.getElementById('setting-format-on-load') as HTMLInputElement | null;
  if (toggle) {
    toggle.checked = isFormatOnLoadEnabled();
    toggle.addEventListener('change', () => {
      setFormatOnLoadEnabled(toggle.checked);
      showToast(toggle.checked ? '読み込み時に Markdown を整えます' : '読み込み時に Markdown を整えません');
    });
  }
  document.getElementById('btn-format-now')?.addEventListener('click', () => {
    setModalOpen('settings-modal', false);
    formatCurrentDocument();
  });
}

// ファイルのバイト列を読み、文字コードを判定してから開く（FR-048, DD-FILE-082）
export async function loadMarkdownFile(file) {
  if (!confirmDiscardEdits(file.name)) return;
  let decoded;
  try {
    decoded = decodeMarkdown(await file.arrayBuffer());
  } catch (err) {
    console.error('Failed to read file:', err);
    showToast(`「${file.name}」を読み込めませんでした`);
    return;
  }
  const prepared = await prepareLoadedText(decoded.text);
  applyLoadedMarkdown(prepared.text, file.name, null, false, decoded.encoding, prepared.formatted);
}

// 開くメニューから同梱サンプルをワンクリックで読み込む（DD-FILE-015）
export async function loadBundledSample(fileName) {
  if (!confirmDiscardEdits(fileName)) return false;
  let text = null;
  if (window.location.protocol !== 'file:') {
    try {
      const res = await fetch(`./samples/${encodeURIComponent(fileName)}`);
      if (res.ok) text = await res.text();
    } catch (_) {
      // fetch 失敗時は samples-data.js にフォールバックする
    }
  }
  if (text === null) {
    if (await loadLibrary('samples') && window.LUCIVO_SAMPLES && typeof window.LUCIVO_SAMPLES[fileName] === 'string') {
      text = window.LUCIVO_SAMPLES[fileName];
    }
  }
  if (text === null) {
    showToast(`「${fileName}」を読み込めませんでした`);
    return false;
  }
  applyLoadedMarkdown(text, fileName, null, true);
  return true;
}

// 読み込み直後の閲覧中に誤って編集しないよう、エディタと、内容を変えるボタンをまとめて切り替える（DD-FILE-040）。
// 「閲覧 | 編集」の切り替えは、ファイルを読み込んだ後は表示したままにし、今の状態のほうを選択中にする（DD-FILE-041）
export function setEditorReadOnly(isReadOnly) {
  document.getElementById('markdown-editor').readOnly = isReadOnly;
  document.getElementById('editor-lock').classList.remove('hidden');
  for (const [id, active] of [['btn-edit-lock', isReadOnly], ['btn-edit-unlock', !isReadOnly]]) {
    const btn = document.getElementById(id);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  document.getElementById('btn-test-err').disabled = isReadOnly;
}

// エディタの内容をダウンロードする。元のファイルは上書きしない（DD-FILE-030）
export function saveMarkdownFile() {
  const text = document.getElementById('markdown-editor').value;
  downloadBlob(text, runtime.currentFileName, 'text/markdown;charset=utf-8');
  runtime.lastLoadedMarkdown = text;
  // ブラウザは UTF-8 でしか書き出せないため、元の文字コードと違うときは知らせる（DD-FILE-083）
  showToast(isUtf8Family(runtime.currentFileEncoding)
    ? `「${runtime.currentFileName}」を保存しました`
    : `「${runtime.currentFileName}」を UTF-8 で保存しました（元は ${runtime.currentFileEncoding}）`);
}

export function setupMobileMenus() {
  document.getElementById('mobile-menu-open-markdown')?.addEventListener('click', () => document.getElementById('menu-open-markdown')?.click());
  document.getElementById('mobile-menu-open-folder')?.addEventListener('click', () => document.getElementById('menu-open-folder')?.click());
  document.getElementById('mobile-menu-open-recent-folder')?.addEventListener('click', () => document.getElementById('menu-open-recent-folder')?.click());
  document.getElementById('mobile-menu-save-markdown')?.addEventListener('click', () => document.getElementById('btn-save-markdown')?.click());
  document.getElementById('mobile-menu-print')?.addEventListener('click', () => document.getElementById('menu-print')?.click());
  document.querySelectorAll('[data-mobile-sample]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-mobile-sample');
      if (targetId) document.getElementById(targetId)?.click();
    });
  });
  document.querySelectorAll('[data-mobile-view-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mobile-view-mode');
      closeHeaderMenus();
      if (mode) (document.querySelector(`.view-mode-btn[data-view-mode="${mode}"]`) as HTMLElement | null)?.click();
    });
  });
  document.getElementById('menu-more-settings')?.addEventListener('click', () => {
    closeHeaderMenus();
    document.getElementById('btn-open-settings')?.click();
  });
  document.getElementById('menu-more-animation')?.addEventListener('click', () => {
    closeHeaderMenus();
    document.getElementById('btn-toggle-animation')?.click();
  });
  document.getElementById('menu-more-yaml')?.addEventListener('click', () => {
    closeHeaderMenus();
    document.getElementById('btn-front-matter')?.click();
  });
  document.getElementById('menu-more-theme')?.addEventListener('click', () => {
    closeHeaderMenus();
    document.getElementById('btn-theme-toggle')?.click();
  });
  document.getElementById('menu-more-update')?.addEventListener('click', () => {
    closeHeaderMenus();
    checkForUpdate();
  });
}

export function setupFileMenu() {
  const input = document.getElementById('file-input') as HTMLInputElement;

  HEADER_MENUS.forEach(([btnId, menuId]) => {
    const btn = document.getElementById(btnId);
    const menu = document.getElementById(menuId);
    if (!btn || !menu) return;
    btn.onclick = event => {
      event.stopPropagation();
      const willOpen = menu.classList.contains('hidden');
      closeHeaderMenus();
      menu.classList.toggle('hidden', !willOpen);
      btn.setAttribute('aria-expanded', String(willOpen));
    };
  });
  const fileMenu = document.getElementById('file-menu');
  document.getElementById('menu-open-markdown').onclick = () => {
    closeHeaderMenus();
    input.click();
  };
  document.getElementById('menu-open-folder').onclick = () => {
    closeHeaderMenus();
    openFolder();
  };
  document.getElementById('menu-open-recent-folder').onclick = () => {
    closeHeaderMenus();
    reopenRecentFolder();
  };
  fileMenu.querySelectorAll('[data-sample-file]').forEach((btn: any) => {
    btn.onclick = () => {
      const fileName = btn.getAttribute('data-sample-file');
      closeHeaderMenus();
      if (fileName) loadBundledSample(fileName);
    };
  });
  document.getElementById('menu-print').onclick = () => {
    closeHeaderMenus();
    window.print();
  };
  document.getElementById('btn-save-markdown').onclick = () => {
    closeHeaderMenus();
    saveMarkdownFile();
  };
  document.getElementById('menu-check-update')?.addEventListener('click', () => {
    closeHeaderMenus();
  });
  document.getElementById('menu-present-stage')?.addEventListener('click', () => {
    closeHeaderMenus();
    document.getElementById('btn-stage-show')?.click();
  });
  setupPresentModes(closeHeaderMenus);
  setupMobileMenus();
  document.getElementById('btn-edit-unlock').onclick = () => {
    setEditorReadOnly(false);
    document.getElementById('markdown-editor').focus();
  };
  document.getElementById('btn-edit-lock').onclick = () => setEditorReadOnly(true);
  input.onchange = () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (file) loadMarkdownFile(file);
  };
  document.addEventListener('click', event => {
    if (!HEADER_MENUS.some(([, menuId]) => document.getElementById(menuId)?.contains(event.target as Node))) closeHeaderMenus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeHeaderMenus();
  });
}

export async function handleDroppedDataTransfer(dt: DataTransfer) {
  // ブラウザは、drop の処理の中で最初に await した後、dataTransfer の中身（items・files）を読めなくする。
  // そのため、待つ前に、必要なものをすべて同期で取り出しておく（#69）。
  const items = Array.from(dt.items || []).filter(item => item.kind === 'file');
  const droppedFiles = Array.from(dt.files || []);
  const handlePromises = items.map((item: any) => {
    if (typeof item.getAsFileSystemHandle !== 'function') return Promise.resolve(null);
    try {
      return item.getAsFileSystemHandle().catch(() => null);
    } catch (_) {
      return Promise.resolve(null);
    }
  });
  const entries = items.map((item: any) => {
    if (typeof item.webkitGetAsEntry !== 'function') return null;
    try {
      return item.webkitGetAsEntry();
    } catch (_) {
      return null;
    }
  });

  let dirHandle = null;
  let fallbackDirEntry = null;
  const handles = await Promise.all(handlePromises);
  for (let i = 0; i < items.length; i++) {
    const handle = handles[i];
    if (handle && handle.kind === 'directory') {
      dirHandle = handle;
      break;
    }
    const entry = entries[i];
    if (!handle && entry && entry.isDirectory) {
      fallbackDirEntry = entry;
      break;
    }
  }

  if (dirHandle) {
    await openFolderFromHandle(dirHandle);
    saveRecentFolderHandle(dirHandle);
    return;
  }

  if (fallbackDirEntry) {
    try {
      const files = await scanEntryDirectory(fallbackDirEntry);
      setOpenedFolder(makeInputFolder(files));
    } catch (err) {
      console.error('Failed to read dropped folder entry:', err);
      showToast(`「${fallbackDirEntry.name}」を読み込めませんでした`);
    }
    return;
  }

  const file = droppedFiles.find(f => DROPPABLE_FILE_PATTERN.test(f.name));
  if (!file) {
    showToast('開けるのは .md / .markdown / .txt のファイルまたはフォルダです');
    return;
  }
  loadMarkdownFile(file);
}

// ウィンドウのどこにファイルやフォルダを落としても開く（FR-041, DD-FILE-060）。ドラッグ中だけ、受け付けの表示（#drop-overlay）を重ねる
export function setupFileDrop() {
  const overlay = document.getElementById('drop-overlay');
  let depth = 0;
  const hasFiles = (event: DragEvent) => Array.from((event.dataTransfer && event.dataTransfer.types) || []).includes('Files');
  const setShown = (shown: boolean) => {
    overlay.classList.toggle('is-shown', shown);
    overlay.setAttribute('aria-hidden', String(!shown));
  };

  window.addEventListener('dragenter', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth += 1;
    setShown(true);
  });
  window.addEventListener('dragover', event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });
  window.addEventListener('dragleave', event => {
    if (!hasFiles(event)) return;
    depth = Math.max(0, depth - 1);
    if (depth === 0) setShown(false);
  });
  window.addEventListener('drop', async event => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth = 0;
    setShown(false);
    if (event.dataTransfer) await handleDroppedDataTransfer(event.dataTransfer);
  });
}

/* ==========================================================================
   フォルダを開く（FR-043〜045, DD-FILE-070〜078）
   ========================================================================== */
