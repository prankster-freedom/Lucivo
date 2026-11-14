// @ts-nocheck
import { escapeHtml } from '../utils/escape';
import { runtime } from '../ui/state';
import { SAMPLES_DIR, folderImageUrls, folderDirOf, resolveFolderPath, getFolderImageUrl } from '../ui/folder-browser';

export function toLocalImageUrl(value) {
  const src = String(value || '').trim().replace(/%5C/gi, '/').replace(/\\/g, '/');
  // C:/… または C:\…（Windows のドライブ名で始まる絶対パス）
  if (/^[a-z]:\//i.test(src)) return `file:///${src}`;
  // \\server\share\…（Windows のネットワーク上のパス）
  if (/^\/\/[^/]/.test(src) && /%5C|\\/i.test(String(value))) return `file:${src}`;
  if (/^file:\/\//i.test(src)) return src;
  return null;
}

// 相対パスか（URL の形式も、/ で始まる絶対パスもない）
export function isRelativeSrc(src) {
  return Boolean(src) && !/^[a-z][a-z0-9+.-]*:|^[/#]/i.test(src);
}

// 読み込めない画像の代わりに置く枠（DD-MD-041）。hint は添える案内（なければ省く）
export function makeMissingImageBox(src, alt, hint) {
  const box = document.createElement('span');
  box.className = 'img-missing';
  box.setAttribute('role', 'img');
  box.setAttribute('aria-label', `画像を読み込めません: ${alt || src}`);
  const title = document.createElement('span');
  title.className = 'img-missing-title';
  title.textContent = '画像を読み込めません';
  const path = document.createElement('span');
  path.className = 'img-missing-path';
  path.textContent = src || '（パスがありません）';
  box.append(title, path);
  if (hint) {
    const note = document.createElement('span');
    note.className = 'img-missing-hint';
    note.textContent = hint;
    box.append(note);
  }
  return box;
}

// DOMPurify の既定は file: の URL を許さず、src ごと消す（DD-MD-040）。画像の src に限って、
// ローカルのパスを file:// の URL に直して残す。リンク（a の href）の file: は、今までどおり消す。
// フォルダから開いた文書の相対パスは、フォルダの中のパスを data-folder-src に移し、描画の後に読み込む（DD-FILE-076）
export function setupLocalImages() {
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (node.nodeName !== 'IMG' || data.attrName !== 'src') return;
    const inFolder = runtime.openedFolder && runtime.currentFolderPath !== null && isRelativeSrc(data.attrValue);
    const folderPath = inFolder ? resolveFolderPath(folderDirOf(runtime.currentFolderPath), data.attrValue) : null;
    if (inFolder && folderPath === null) {
      // フォルダの外を指す相対パス（../ が多すぎる）は、フォルダからは読めない
      node.setAttribute('data-folder-src', data.attrValue);
      node.setAttribute('data-folder-outside', '');
      data.keepAttr = false;
      return;
    }
    if (folderPath !== null) {
      node.setAttribute('data-folder-src', folderPath);
      const cached = folderImageUrls.get(folderPath);
      if (typeof cached === 'string') {
        // 読み込み済みの画像は、描き直しのたびに読み直さず、ちらつかないよう、すぐに表示する
        node.setAttribute('src', cached);
        data.attrValue = cached;
        data.forceKeepAttr = true;
      } else {
        // src を残すと index.html のフォルダを基準に読みに行き、読み込めない表示が一瞬出る
        data.keepAttr = false;
      }
      return;
    }
    // 同梱サンプルの相対パスは、samples フォルダからの相対パスにする（index.html から見たパス。DD-FILE-081）
    if (runtime.currentSampleFile && isRelativeSrc(data.attrValue)) {
      const samplePath = resolveFolderPath('', data.attrValue);
      if (samplePath === null) return;
      const sampleUrl = `${SAMPLES_DIR}/${samplePath.split('/').map(encodeURIComponent).join('/')}`;
      node.setAttribute('src', sampleUrl);
      data.attrValue = sampleUrl;
      data.forceKeepAttr = true;
      return;
    }
    const url = toLocalImageUrl(data.attrValue);
    if (!url) return;
    // forceKeepAttr を立てると、DOMPurify は attrValue を書き戻さずに次の属性へ進むため、ここで書き換える
    node.setAttribute('src', url);
    data.attrValue = url;
    data.forceKeepAttr = true;
  });

  // 読み込めない画像は、代わりの文字（alt）だけが細く出て気づきにくいため、読み込めないことと src を示す（DD-MD-041）。
  // error は泡立たないため、キャプチャの段階で受け取る
  document.addEventListener('error', event => {
    const img = event.target;
    if (!(img instanceof HTMLImageElement) || !img.closest('#preview-scroll')) return;
    const src = img.getAttribute('data-folder-src') || img.getAttribute('src') || '';
    // 相対パスは、ファイルを開いた場合、ブラウザの制約で Markdown ファイルの場所を基準にできない（DD-MD-042）
    const hint = isRelativeSrc(src) && !img.hasAttribute('data-folder-src')
      ? '相対パスの画像は、「開く」→「フォルダを開く…」で開いた文書で表示できます。または絶対パス（C:\\… など）で指定してください'
      : '';
    img.replaceWith(makeMissingImageBox(src, img.getAttribute('alt'), hint));
  }, true);
}

// フォルダから開いた文書の相対パスの画像を、フォルダから読んで表示する（DD-FILE-076）
export function resolveFolderImages(container) {
  if (!runtime.openedFolder || !container) return;
  const folder = runtime.openedFolder;
  container.querySelectorAll('img[data-folder-src]:not([src])').forEach(async img => {
    const path = img.getAttribute('data-folder-src');
    if (img.hasAttribute('data-folder-outside')) {
      img.replaceWith(makeMissingImageBox(path, img.getAttribute('alt'), '開いたフォルダの外の画像は表示できません。上の階層のフォルダを開いてください'));
      return;
    }
    const url = await getFolderImageUrl(folder, path);
    // 待っている間にフォルダを閉じた・描き直した場合は何もしない
    if (!img.isConnected || folder !== runtime.openedFolder) return;
    if (url) img.setAttribute('src', url);
    else img.replaceWith(makeMissingImageBox(path, img.getAttribute('alt'), 'フォルダの中に見つかりません'));
  });
}

// 表（table）が親コンテナやスラブの枠をはみ出さないよう、横スクロール可能な .table-container で包む（DD-MD-020）
export function wrapTables(container) {
  if (!container) return;
  container.querySelectorAll('table').forEach(table => {
    if (table.parentElement && table.parentElement.classList.contains('table-container')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-container';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
}

/* ==========================================================================
   メインレンダリングループ
   ========================================================================== */
