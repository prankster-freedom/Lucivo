// @ts-nocheck
import { decodeMarkdown } from '../utils/text-decode';
import { extractMarkdownUrlFromLocation, validatePublicMarkdownUrl, fetchMarkdownFromUrl } from './url-loader';
import { findScrollParent } from '../diagram/pan-zoom';
import { showToast, updateStatus } from './toast';
import { clearMathPlotCache } from '../math/plot';
import { state, DROPPABLE_FILE_PATTERN, runtime } from './state';
import { isRelativeSrc } from '../markdown/local-images';
import { scrollBehavior, previewScrollTopOf } from '../app';
import {
  closeHeaderMenus,
  confirmDiscardEdits,
  prepareLoadedText,
  applyLoadedMarkdown,
  loadBundledSample
} from './file-menu';

export const FOLDER_FILE_LIMIT = 2000;
export const FOLDER_DEPTH_LIMIT = 12;
// 一覧を隠したかどうか（利用者ごとの見た目の好み）を覚えておくキー（DD-FILE-074）
export const FOLDER_COLLAPSED_KEY = 'lucivo.folderPaneCollapsed';
// 前回のフォルダのハンドルを保存する IndexedDB（DD-FILE-073）
export const RECENT_FOLDER_DB = 'lucivo';
export const RECENT_FOLDER_STORE = 'handles';
export const RECENT_FOLDER_KEY = 'recentFolder';

// 開いているフォルダ: { name, files: [{ path, name, dir }], getFile(path) → Promise<File|null> }
// フォルダから開いた文書の、フォルダの中のパス（フォルダから開いていなければ null）
// 同梱サンプルとして開いた文書のファイル名（同梱サンプルでなければ null）（DD-FILE-081）
// 同梱サンプルのフォルダ（index.html からの相対パス）と、サンプルのファイル名
export const SAMPLES_DIR = 'samples';
export const BUNDLED_SAMPLES = ['visual-sample.md', 'notation_sample.md', 'notation_sample_extra1.md'];
// フォルダの画像のパス → blob URL（読み込み中は Promise）（DD-FILE-076）
export const folderImageUrls = new Map();
// File System Access API が使えなかったとき、次からはフォルダの選択の入力欄を使う（DD-FILE-071）

// 隠しフォルダ（. で始まる）と、依存パッケージの置き場は、たどらない
export function isSkippedFolderName(name) {
  return name.startsWith('.') || name === 'node_modules';
}

export function folderDirOf(path) {
  const i = path.lastIndexOf('/');
  return i < 0 ? '' : path.slice(0, i);
}

// base（フォルダの中のフォルダのパス）から見た相対パスを、フォルダの中のパスにする。フォルダの外へ出るときは null（DD-FILE-076）
export function resolveFolderPath(base, src) {
  let rel = String(src).split(/[?#]/)[0].replace(/\\/g, '/');
  try {
    rel = decodeURIComponent(rel);
  } catch (_) {
    // % の並びが壊れているときは、書いたままのパスで探す
  }
  const parts = base ? base.split('/') : [];
  for (const seg of rel.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') {
      if (!parts.length) return null;
      parts.pop();
    } else {
      parts.push(seg);
    }
  }
  return parts.length ? parts.join('/') : null;
}

export function sortFolderFiles(files) {
  const collator = new Intl.Collator('ja', { numeric: true, sensitivity: 'base' });
  // フォルダの直下のファイルを先に、その後はサブフォルダのパスの順、同じフォルダの中は名前の順
  return files.sort((a, b) => (a.dir === '' ? 0 : 1) - (b.dir === '' ? 0 : 1)
    || collator.compare(a.dir, b.dir) || collator.compare(a.name, b.name));
}

// File System Access API のハンドルから、Markdown ファイルを集める（DD-FILE-072）
export async function scanDirectoryHandle(root) {
  const files = [];
  let truncated = false;
  const walk = async (dir, prefix, depth) => {
    for await (const [name, handle] of dir.entries()) {
      if (files.length >= FOLDER_FILE_LIMIT) {
        truncated = true;
        return;
      }
      const path = prefix ? `${prefix}/${name}` : name;
      if (handle.kind === 'directory') {
        if (!isSkippedFolderName(name) && depth < FOLDER_DEPTH_LIMIT) await walk(handle, path, depth + 1);
      } else if (DROPPABLE_FILE_PATTERN.test(name)) {
        files.push({ path, name, dir: prefix });
      }
    }
  };
  await walk(root, '', 0);
  return { files: sortFolderFiles(files), truncated };
}

export function makeHandleFolder(root, scan) {
  return {
    name: root.name,
    files: scan.files,
    truncated: scan.truncated,
    async getFile(path) {
      try {
        const segs = path.split('/');
        let dir = root;
        for (const seg of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(seg);
        return await (await dir.getFileHandle(segs[segs.length - 1])).getFile();
      } catch (_) {
        return null;
      }
    }
  };
}

// <input webkitdirectory> で選んだファイルの一覧から作る。webkitRelativePath の先頭はフォルダの名前（DD-FILE-071）
export function makeInputFolder(fileList) {
  const all = new Map();
  let name = '';
  for (const file of fileList) {
    const segs = (file.webkitRelativePath || file.name).split('/');
    if (!name) name = segs.length > 1 ? segs[0] : '';
    const inner = segs.length > 1 ? segs.slice(1) : segs;
    if (inner.slice(0, -1).some(isSkippedFolderName)) continue;
    all.set(inner.join('/'), file);
  }
  const files = [];
  for (const [path, file] of all) {
    if (DROPPABLE_FILE_PATTERN.test(file.name)) files.push({ path, name: file.name, dir: folderDirOf(path) });
  }
  const truncated = files.length > FOLDER_FILE_LIMIT;
  return {
    name: name || 'フォルダ',
    files: sortFolderFiles(files).slice(0, FOLDER_FILE_LIMIT),
    truncated,
    async getFile(path) {
      return all.get(path) || null;
    }
  };
}

// webkitGetAsEntry() のエントリ（フォルダ）からファイルを再帰的に集める（DD-FILE-060）
export async function scanEntryDirectory(rootEntry) {
  const files = [];
  const walk = async (dirEntry, prefix, depth) => {
    const reader = dirEntry.createReader();
    const readBatch = () => new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    while (true) {
      if (files.length >= FOLDER_FILE_LIMIT) break;
      const entries = await readBatch();
      if (!entries || !entries.length) break;
      for (const ent of entries) {
        if (files.length >= FOLDER_FILE_LIMIT) break;
        const path = prefix ? `${prefix}/${ent.name}` : ent.name;
        if (ent.isDirectory) {
          if (!isSkippedFolderName(ent.name) && depth < FOLDER_DEPTH_LIMIT) {
            await walk(ent, path, depth + 1);
          }
        } else if (ent.isFile) {
          const file = await new Promise((resolve, reject) => ent.file(resolve, reject));
          try {
            Object.defineProperty(file, 'webkitRelativePath', {
              value: `${rootEntry.name}/${path}`,
              configurable: true
            });
          } catch (_) {
            file.webkitRelativePath = `${rootEntry.name}/${path}`;
          }
          files.push(file);
        }
      }
    }
  };
  await walk(rootEntry, '', 0);
  return files;
}

export function getFolderImageUrl(folder, path) {
  if (!folderImageUrls.has(path)) {
    folderImageUrls.set(path, folder.getFile(path).then(file => {
      const url = file ? URL.createObjectURL(file) : null;
      // 読み込み中に別のフォルダに替わったら、作った URL を捨てる
      if (folder !== runtime.openedFolder) {
        if (url) URL.revokeObjectURL(url);
        return null;
      }
      folderImageUrls.set(path, url);
      return url;
    }));
  }
  return Promise.resolve(folderImageUrls.get(path));
}

export function clearFolderImageUrls() {
  folderImageUrls.forEach(url => {
    if (typeof url === 'string') URL.revokeObjectURL(url);
  });
  folderImageUrls.clear();
}

export function setOpenedFolder(folder) {
  clearFolderImageUrls();
  runtime.openedFolder = folder;
  // 前に開いていた文書は、新しいフォルダの文書ではない
  runtime.currentFolderPath = null;
  setFolderPaneCollapsed(false);
  renderFolderList();
  runtime.renderApp();
  const note = folder.truncated ? `（先頭の ${FOLDER_FILE_LIMIT} 件）` : '';
  showToast(`「${folder.name}」を開きました。Markdown ${folder.files.length} 件${note}`);
}

export function closeFolder() {
  clearFolderImageUrls();
  runtime.openedFolder = null;
  runtime.currentFolderPath = null;
  renderFolderList();
  runtime.renderApp();
}

// 「フォルダを開く…」。Chrome / Edge は File System Access API、それ以外はフォルダの選択の入力欄（DD-FILE-070, 071）
export async function openFolder() {
  if (!window.showDirectoryPicker || runtime.preferFolderInput) {
    document.getElementById('folder-input').click();
    return;
  }
  let handle;
  try {
    handle = await window.showDirectoryPicker({ id: 'lucivo-folder', mode: 'read' });
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    // file:// で使えないなど。次からは入力欄を使い、今回も試す（クリックの直後でなければ、ブラウザが止めることがある）
    console.warn('showDirectoryPicker failed:', err);
    runtime.preferFolderInput = true;
    document.getElementById('folder-input').click();
    return;
  }
  await openFolderFromHandle(handle);
  saveRecentFolderHandle(handle);
}

export async function openFolderFromHandle(handle) {
  try {
    setOpenedFolder(makeHandleFolder(handle, await scanDirectoryHandle(handle)));
  } catch (err) {
    console.error('Failed to read folder:', err);
    showToast(`「${handle.name}」を読み込めませんでした`);
  }
}

// フォルダの中のファイルを開く（一覧と、文書の中のリンクから。DD-FILE-075, DD-FILE-079）。
// 一覧に載らないファイル（件数の上限を超えたものなど）も、フォルダの中にあれば開く。開けたら true
export async function openFolderFile(path) {
  const folder = runtime.openedFolder;
  if (!folder) return false;
  const name = path.slice(path.lastIndexOf('/') + 1);
  const file = await folder.getFile(path);
  if (folder !== runtime.openedFolder) return false;
  if (!file) {
    showToast(`「${path}」はフォルダの中に見つかりません`);
    return false;
  }
  if (!confirmDiscardEdits(name)) return false;
  try {
    const decoded = decodeMarkdown(await file.arrayBuffer());
    const prepared = await prepareLoadedText(decoded.text);
    // 整えている間に別のフォルダを開いたときは、古いフォルダのファイルを表示しない
    if (folder !== runtime.openedFolder) return false;
    applyLoadedMarkdown(prepared.text, name, path, false, decoded.encoding, prepared.formatted);
  } catch (err) {
    console.error('Failed to read file:', err);
    showToast(`「${name}」を読み込めませんでした`);
    return false;
  }
  // 狭い画面では一覧が文書に重なるため、選んだら隠す
  if (window.matchMedia('(max-width: 1023.98px)').matches) setFolderPaneCollapsed(true);
  return true;
}

// 見出しの文字から、GitHub と同じ形のアンカー（小文字、記号を除く、空白は -）を作る（DD-FILE-080）
export function headingSlug(text) {
  return String(text).trim().toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

// プレビューの中で、アンカー（#以降）に当たる見出しへ送る。見つからなければ false
export function scrollToHeadingAnchor(anchor) {
  let target = anchor;
  try {
    target = decodeURIComponent(anchor);
  } catch (_) {
    // % の並びが壊れているときは、書いたままで探す
  }
  const slug = headingSlug(target);
  const scroller = document.getElementById('preview-scroll');
  const heading = Array.from(scroller.querySelectorAll('h1, h2, h3, h4, h5, h6'))
    .find(h => headingSlug(h.textContent) === slug);
  if (!heading) return false;
  // Visualモードの章の見出しは、章（スラブ）の上端へ送る
  const el = heading.closest('.exhibition-slab') || heading;
  scroller.scrollTo({ top: previewScrollTopOf(el, scroller), behavior: scrollBehavior() });
  return true;
}

// 文書の中のリンク（DD-FILE-079, 080）。相対パスの Markdown へのリンクと、見出しへのリンク（#…）は、
// ブラウザの既定の動作（Lucivo の画面から、Markdown のファイルそのものへ移ってしまう）を止めて、Lucivo の中で開く
export function setupDocumentLinks() {
  document.getElementById('preview-scroll').addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest('a[href]') : null;
    if (!link || event.defaultPrevented || event.button !== 0) return;
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      event.preventDefault();
      if (!scrollToHeadingAnchor(href.slice(1))) showToast('リンク先の見出しが見つかりません');
      return;
    }
    if (!isRelativeSrc(href)) return;
    const [pathPart, ...rest] = href.split('#');
    const anchor = rest.join('#');
    if (!DROPPABLE_FILE_PATTERN.test(pathPart.split('?')[0])) return;
    event.preventDefault();
    // 同梱サンプルの間のリンクは、同梱サンプルとして開く（DD-FILE-081）
    if (runtime.currentSampleFile && !(runtime.openedFolder && runtime.currentFolderPath !== null)) {
      const samplePath = resolveFolderPath('', pathPart);
      if (!BUNDLED_SAMPLES.includes(samplePath)) {
        showToast(`「${samplePath || pathPart}」は同梱サンプルにありません`);
        return;
      }
      const opened = samplePath === runtime.currentSampleFile ? Promise.resolve(true) : loadBundledSample(samplePath);
      opened.then(ok => {
        if (ok && anchor && !scrollToHeadingAnchor(anchor)) showToast('リンク先の見出しが見つかりません');
      });
      return;
    }
    if (!runtime.openedFolder || runtime.currentFolderPath === null) {
      showToast('Markdown へのリンクは、「開く」→「フォルダを開く…」で開いた文書で使えます');
      return;
    }
    const path = resolveFolderPath(folderDirOf(runtime.currentFolderPath), pathPart);
    if (path === null) {
      showToast('開いたフォルダの外のファイルは開けません');
      return;
    }
    const open = path === runtime.currentFolderPath ? Promise.resolve(true) : openFolderFile(path);
    open.then(opened => {
      if (opened && anchor && !scrollToHeadingAnchor(anchor)) showToast('リンク先の見出しが見つかりません');
    });
  });
}

// 一覧を描き直す。フォルダを開いていなければ、一覧も帯も出さない（DD-FILE-074）
export function renderFolderList() {
  const pane = document.getElementById('folder-pane');
  const rail = document.getElementById('btn-folder-show');
  if (!runtime.openedFolder) {
    pane.classList.add('hidden');
    rail.classList.add('hidden');
    return;
  }
  const collapsed = isFolderPaneCollapsed();
  pane.classList.toggle('hidden', collapsed);
  rail.classList.toggle('hidden', !collapsed);
  document.getElementById('folder-pane-name').textContent = runtime.openedFolder.name;
  document.getElementById('folder-pane-name').title = runtime.openedFolder.name;
  const list = document.getElementById('folder-list');
  list.replaceChildren();
  if (!runtime.openedFolder.files.length) {
    const empty = document.createElement('p');
    empty.className = 'folder-list-empty';
    empty.textContent = 'Markdown ファイル（.md / .markdown / .txt）がありません';
    list.append(empty);
    return;
  }
  let lastDir = null;
  for (const file of runtime.openedFolder.files) {
    if (file.dir !== lastDir && file.dir !== '') {
      const dir = document.createElement('div');
      dir.className = 'folder-list-dir';
      dir.textContent = `${file.dir}/`;
      dir.title = file.dir;
      list.append(dir);
    }
    lastDir = file.dir;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'folder-list-item';
    btn.dataset.path = file.path;
    btn.title = file.path;
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
    const label = document.createElement('span');
    label.textContent = file.name;
    btn.append(label);
    if (file.path === runtime.currentFolderPath) {
      btn.classList.add('is-current');
      btn.setAttribute('aria-current', 'page');
    }
    btn.onclick = () => openFolderFile(file.path);
    list.append(btn);
  }
}

export function isFolderPaneCollapsed() {
  try {
    return localStorage.getItem(FOLDER_COLLAPSED_KEY) === '1';
  } catch (_) {
    return document.getElementById('folder-pane').dataset.collapsed === '1';
  }
}

export function setFolderPaneCollapsed(collapsed) {
  try {
    localStorage.setItem(FOLDER_COLLAPSED_KEY, collapsed ? '1' : '0');
  } catch (_) {
    // 保存できない環境（プライベートウィンドウなど）では、その場の表示だけを切り替える
    document.getElementById('folder-pane').dataset.collapsed = collapsed ? '1' : '0';
  }
  renderFolderList();
}

// 前回のフォルダのハンドル（DD-FILE-073）。IndexedDB を使えない環境では、何もしない
export function openRecentFolderDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RECENT_FOLDER_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(RECENT_FOLDER_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveRecentFolderHandle(handle) {
  runtime.recentFolderHandle = handle;
  updateRecentFolderMenu();
  try {
    const db = await openRecentFolderDb();
    db.transaction(RECENT_FOLDER_STORE, 'readwrite').objectStore(RECENT_FOLDER_STORE).put(handle, RECENT_FOLDER_KEY);
  } catch (err) {
    console.warn('Failed to remember the folder:', err);
  }
}

export async function loadRecentFolderHandle() {
  if (!window.showDirectoryPicker || !window.indexedDB) return;
  try {
    const db = await openRecentFolderDb();
    const handle = await new Promise((resolve, reject) => {
      const req = db.transaction(RECENT_FOLDER_STORE, 'readonly').objectStore(RECENT_FOLDER_STORE).get(RECENT_FOLDER_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
    if (handle && handle.kind === 'directory') {
      runtime.recentFolderHandle = handle;
      updateRecentFolderMenu();
    }
  } catch (err) {
    console.warn('Failed to read the remembered folder:', err);
  }
}

export function updateRecentFolderMenu() {
  ['menu-open-recent-folder', 'mobile-menu-open-recent-folder'].forEach(id => {
    const item = document.getElementById(id);
    if (!item) return;
    item.classList.toggle('hidden', !runtime.recentFolderHandle);
    if (runtime.recentFolderHandle) item.textContent = `前回のフォルダ「${runtime.recentFolderHandle.name}」を開く`;
  });
}

// 前回のフォルダを開く。読む許可は開くたびにブラウザが確かめる（クリックの直後に求める必要がある）
export async function reopenRecentFolder() {
  const handle = runtime.recentFolderHandle;
  if (!handle) return;
  try {
    let permission = await handle.queryPermission({ mode: 'read' });
    if (permission !== 'granted') permission = await handle.requestPermission({ mode: 'read' });
    if (permission !== 'granted') {
      showToast(`「${handle.name}」を読む許可がありません`);
      return;
    }
  } catch (err) {
    console.warn('Failed to reopen the folder:', err);
    showToast(`「${handle.name}」を開けませんでした。「フォルダを開く…」から選び直してください`);
    return;
  }
  await openFolderFromHandle(handle);
}

export function setupFolder() {
  const input = document.getElementById('folder-input');
  input.onchange = () => {
    const files = Array.from(input.files || []);
    // 同じフォルダを続けて選んでも change が発生するよう、選択を解除する
    input.value = '';
    if (files.length) setOpenedFolder(makeInputFolder(files));
  };
  document.getElementById('btn-folder-hide').onclick = () => setFolderPaneCollapsed(true);
  document.getElementById('btn-folder-show').onclick = () => setFolderPaneCollapsed(false);
  document.getElementById('btn-folder-close').onclick = closeFolder;
  setupDocumentLinks();
  loadRecentFolderHandle();
}

// フロントマターの表示 ON / OFF。モードにかかわらず効き、モードを切り替えても状態を保つ（DD-FM-011）
export function setupFrontMatterToggle() {
  const btn = document.getElementById('btn-front-matter');
  if (!btn) return;
  btn.addEventListener('click', () => {
    state.showFrontMatter = !state.showFrontMatter;
    btn.setAttribute('aria-pressed', String(state.showFrontMatter));
    btn.classList.toggle('is-active', state.showFrontMatter);
    runtime.renderApp();
  });
}

// フローのアニメーション（シグナル・ライト）の表示 ON / OFF（FR-018, DD-STAGE-010〜060, #79）
export function setupAnimationToggle() {
  const btn = document.getElementById('btn-toggle-animation');
  if (!btn) return;
  const syncAnimationToggleUi = () => {
    const enabled = state.signalLightsEnabled;
    document.documentElement.classList.toggle('is-animation-off', !enabled);
    btn.setAttribute('aria-pressed', String(enabled));
    btn.classList.toggle('is-active', enabled);
    btn.title = enabled
      ? 'フローのアニメーション: ON（クリックでOFF）'
      : 'フローのアニメーション: OFF（クリックでON）';
    const icon = btn.querySelector('svg');
    if (icon) {
      icon.classList.toggle('text-amber-500', enabled);
      icon.classList.toggle('opacity-40', !enabled);
    }
  };
  syncAnimationToggleUi();
  btn.addEventListener('click', () => {
    state.signalLightsEnabled = !state.signalLightsEnabled;
    syncAnimationToggleUi();
    if ((window as any).LucivoStage?.toggleLights) {
      (window as any).LucivoStage.toggleLights(state.signalLightsEnabled);
    }
    showToast(state.signalLightsEnabled ? 'フローのアニメーション: ON' : 'フローのアニメーション: OFF');
  });
}

// 起動時の URL パラメータ（?url=... / #url=...）から公開 Markdown を読み込む（FR-050, #78）
export async function loadMarkdownFromUrlParam() {
  const rawUrl = extractMarkdownUrlFromLocation(window.location.search, window.location.hash);
  if (!rawUrl) return;
  const validUrl = validatePublicMarkdownUrl(rawUrl);
  if (!validUrl) {
    showToast('URL から Markdown を読み込めませんでした（http / https の有効な URL を指定してください）', 4000);
    return;
  }
  showToast('URL から Markdown を読み込んでいます…');
  try {
    const { buffer, fileName } = await fetchMarkdownFromUrl(validUrl);
    const decoded = decodeMarkdown(buffer);
    const prepared = await prepareLoadedText(decoded.text);
    applyLoadedMarkdown(prepared.text, fileName, null, false, decoded.encoding, prepared.formatted);
  } catch (err) {
    console.error('Failed to fetch markdown from URL:', err);
    showToast('URL から Markdown を読み込めませんでした。CORS 制限やネットワークをご確認ください', 4500);
  }
}
