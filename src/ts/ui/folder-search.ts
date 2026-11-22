// @ts-nocheck
// フォルダ内の Markdown 文書を横断して全文検索し、該当箇所への移動とプレビュー強調を行う（FR-064, DD-FILE-096, #331）
import { decodeMarkdown } from '../utils/text-decode';
import { escapeHtml } from '../utils/escape';
import { state, runtime } from './state';
import { scrollBehavior, previewScrollTopOf, lineStartOffset, measureEditorLineTop } from './editor-follow';

export const SEARCH_MAX_TOTAL_MATCHES = 200;
export const SEARCH_MAX_MATCHES_PER_FILE = 30;
export const SEARCH_SNIPPET_RADIUS = 32;
export const REMOTE_SEARCH_FILE_LIMIT = 60;

export interface FolderSearchMatch {
  path: string;
  fileName: string;
  line: number; // 0-based line number
  heading: string; // Nearest preceding heading text (or '')
  headingLine: number; // 0-based line number of nearest preceding heading (-1 if none)
  lineText: string;
  matchStart: number; // index within snippet
  matchLength: number;
  snippetBefore: string;
  snippetMatch: string;
  snippetAfter: string;
}

export interface FolderSearchFileResult {
  path: string;
  fileName: string;
  totalInFile: number;
  matches: FolderSearchMatch[];
}

interface CachedFileLines {
  signature: string;
  lines: string[];
  headings: { line: number; text: string }[];
}

let cachedFolderRef: any = null;
const fileLinesCache = new Map<string, CachedFileLines>();
let searchGeneration = 0;
let searchDebounceTimer: any = null;

export function clearFolderSearchCache() {
  cachedFolderRef = null;
  fileLinesCache.clear();
  searchGeneration++;
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
}

export function resetFolderSearchUi() {
  clearFolderSearchCache();
  const input = document.getElementById('folder-search-input') as HTMLInputElement | null;
  const clearBtn = document.getElementById('btn-folder-search-clear');
  const statusEl = document.getElementById('folder-search-status');
  const resultsEl = document.getElementById('folder-search-results');
  const listEl = document.getElementById('folder-list');
  if (input) input.value = '';
  if (clearBtn) clearBtn.classList.add('hidden');
  if (statusEl) {
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
  }
  if (resultsEl) {
    resultsEl.replaceChildren();
    resultsEl.classList.add('hidden');
  }
  if (listEl) listEl.classList.remove('hidden');
  clearPreviewSearchHighlights();
}

// Markdown テキストから行配列と見出し一覧（フェンス内を除く）を抽出する
export function indexMarkdownLines(rawText: string): { lines: string[]; headings: { line: number; text: string }[] } {
  const normalized = String(rawText || '').replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');
  const headings: { line: number; text: string }[] = [];
  let inFence = false;
  let fenceMarker = '';
  let inFrontMatter = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (i === 0 && line.trim() === '---') {
      inFrontMatter = true;
      continue;
    }
    if (inFrontMatter) {
      if (line.trim() === '---' || line.trim() === '...') {
        inFrontMatter = false;
      }
      continue;
    }
    const fenceMatch = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;

    const hMatch = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$/.exec(line);
    if (hMatch) {
      const cleanTitle = hMatch[2]
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[`*_~]/g, '')
        .trim();
      headings.push({ line: i, text: cleanTitle });
    }
  }
  return { lines, headings };
}

function findNearestHeading(headings: { line: number; text: string }[], targetLine: number): { line: number; text: string } {
  let low = 0;
  let high = headings.length - 1;
  let best = { line: -1, text: '' };
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (headings[mid].line <= targetLine) {
      best = headings[mid];
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return best;
}

function buildSnippet(lineText: string, colIdx: number, queryLen: number) {
  const start = Math.max(0, colIdx - SEARCH_SNIPPET_RADIUS);
  const end = Math.min(lineText.length, colIdx + queryLen + SEARCH_SNIPPET_RADIUS);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < lineText.length ? '…' : '';
  return {
    snippetBefore: prefix + lineText.slice(start, colIdx),
    snippetMatch: lineText.slice(colIdx, colIdx + queryLen),
    snippetAfter: lineText.slice(colIdx + queryLen, end) + suffix
  };
}

export function searchInIndexedFile(
  path: string,
  fileName: string,
  indexed: { lines: string[]; headings: { line: number; text: string }[] },
  queryLower: string
): FolderSearchFileResult | null {
  if (!queryLower) return null;
  const matches: FolderSearchMatch[] = [];
  let totalInFile = 0;
  const qLen = queryLower.length;
  const { lines, headings } = indexed;

  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const lineText = lines[lineNo];
    if (!lineText) continue;
    const lower = lineText.toLowerCase();
    let from = 0;
    while (from <= lower.length - qLen) {
      const idx = lower.indexOf(queryLower, from);
      if (idx === -1) break;
      totalInFile++;
      if (matches.length < SEARCH_MAX_MATCHES_PER_FILE) {
        const nearest = findNearestHeading(headings, lineNo);
        const snip = buildSnippet(lineText, idx, qLen);
        matches.push({
          path,
          fileName,
          line: lineNo,
          heading: nearest.text,
          headingLine: nearest.line,
          lineText,
          matchStart: idx,
          matchLength: qLen,
          ...snip
        });
      }
      from = idx + Math.max(1, qLen);
    }
  }

  if (totalInFile === 0) return null;
  return { path, fileName, totalInFile, matches };
}

async function getIndexedFile(folder: any, fileEntry: { path: string; name: string }): Promise<{ lines: string[]; headings: { line: number; text: string }[] } | null> {
  if (cachedFolderRef !== folder) {
    cachedFolderRef = folder;
    fileLinesCache.clear();
  }
  // 現在開いているファイルでエディタ上の内容がある場合は最新テキストを使う
  if (fileEntry.path === runtime.currentFolderPath) {
    const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement | null;
    if (editor) {
      const text = editor.value;
      const sig = `live:${text.length}`;
      const cached = fileLinesCache.get(fileEntry.path);
      if (cached && cached.signature === sig) return cached;
      const indexed = indexMarkdownLines(text);
      fileLinesCache.set(fileEntry.path, { signature: sig, ...indexed });
      return indexed;
    }
  }

  // リモートフォルダは一度読んだキャッシュがあれば使い、なければ取得する
  const prev = fileLinesCache.get(fileEntry.path);
  if (folder.isRemote && prev) return prev;

  const file = await folder.getFile(fileEntry.path);
  if (!file || folder !== runtime.openedFolder) return null;
  const sig = `${file.lastModified ?? 0}:${file.size ?? -1}`;
  if (prev && prev.signature === sig && sig !== '0:-1') return prev;

  try {
    const decoded = decodeMarkdown(await file.arrayBuffer());
    const indexed = indexMarkdownLines(decoded.text);
    fileLinesCache.set(fileEntry.path, { signature: sig, ...indexed });
    return indexed;
  } catch (_) {
    return null;
  }
}

// プレビュー内の既存ハイライト（mark.lucivo-search-hit）を解除してテキストノードを元に戻す
export function clearPreviewSearchHighlights(root?: HTMLElement | null) {
  const scope = root || document.getElementById('preview-scroll');
  if (!scope) return;
  const marks = Array.from(scope.querySelectorAll('mark.lucivo-search-hit'));
  if (!marks.length) return;
  const parents = new Set<Node>();
  for (const mark of marks) {
    const parent = mark.parentNode;
    if (!parent) continue;
    parent.replaceChild(document.createTextNode(mark.textContent || ''), mark);
    parents.add(parent);
  }
  parents.forEach(p => p.normalize());
}

// 指定スコープ内のテキストノードから query に一致する箇所を mark.lucivo-search-hit で囲み、最初の mark を返す
export function highlightSearchQueryInScope(scope: HTMLElement, query: string): HTMLElement | null {
  const q = String(query || '').trim();
  if (!q) return null;
  const qLower = q.toLowerCase();
  const qLen = qLower.length;
  const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      if (parent.closest('script, style, svg, canvas, .katex, .slab-actions, .diagram-controls, .vs-code-copy-btn')) {
        return NodeFilter.FILTER_REJECT;
      }
      return (node.nodeValue || '').toLowerCase().includes(qLower)
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_SKIP;
    }
  });

  const textNodes: Text[] = [];
  let cur: Node | null;
  while ((cur = walker.nextNode())) {
    textNodes.push(cur as Text);
  }

  let firstMark: HTMLElement | null = null;
  for (const textNode of textNodes) {
    const text = textNode.nodeValue || '';
    const lower = text.toLowerCase();
    let from = 0;
    const frag = document.createDocumentFragment();
    while (from < text.length) {
      const idx = lower.indexOf(qLower, from);
      if (idx === -1) {
        frag.appendChild(document.createTextNode(text.slice(from)));
        break;
      }
      if (idx > from) {
        frag.appendChild(document.createTextNode(text.slice(from, idx)));
      }
      const mark = document.createElement('mark');
      mark.className = 'lucivo-search-hit';
      mark.textContent = text.slice(idx, idx + qLen);
      if (!firstMark) {
        mark.classList.add('lucivo-search-hit-active');
        firstMark = mark;
      }
      frag.appendChild(mark);
      from = idx + qLen;
    }
    textNode.parentNode?.replaceChild(frag, textNode);
  }
  return firstMark;
}

// 検索結果が選ばれたときに、エディタの対象行選択およびプレビューの対象セクション・一致箇所へのスクロールと強調を行う
export function focusSearchMatchInCurrentDoc(match: FolderSearchMatch, query: string) {
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement | null;
  const scroller = document.getElementById('preview-scroll');
  if (editor) {
    const text = editor.value;
    const lineStart = lineStartOffset(text, match.line);
    const lineEndIdx = text.indexOf('\n', lineStart);
    const lineSlice = text.slice(lineStart, lineEndIdx === -1 ? text.length : lineEndIdx);
    const inLineIdx = lineSlice.toLowerCase().indexOf(query.trim().toLowerCase());
    const selStart = inLineIdx >= 0 ? lineStart + inLineIdx : lineStart;
    const selEnd = inLineIdx >= 0 ? selStart + query.trim().length : lineStart;
    const lineTop = measureEditorLineTop(editor, text.slice(0, lineStart));
    runtime.caretState.line = match.line;
    runtime.caretState.pos = selStart;
    runtime.caretState.length = text.length;
    runtime.caretState.dirty = false;
    editor.setSelectionRange(selStart, selEnd);
    editor.scrollTo({ top: Math.max(0, lineTop - 24), behavior: scrollBehavior() });
  }

  if (!scroller) return;
  const activeContainer = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
  if (!activeContainer) return;

  clearPreviewSearchHighlights(activeContainer);

  // 該当見出し（data-src-line）または最も近い先行見出しから対象スコープを特定する
  let targetHeadingEl: HTMLElement | null = null;
  const headings = Array.from(activeContainer.querySelectorAll('[data-src-line]')) as HTMLElement[];
  for (const h of headings) {
    const hLine = Number(h.dataset.srcLine);
    if (hLine <= match.line) {
      targetHeadingEl = h;
    } else {
      break;
    }
  }

  let highlightScope: HTMLElement = activeContainer;
  if (state.isVisualMode && targetHeadingEl) {
    const slab = targetHeadingEl.closest('.exhibition-slab') as HTMLElement | null;
    if (slab) highlightScope = slab;
  }

  const firstMark = highlightSearchQueryInScope(highlightScope, query)
    || (highlightScope !== activeContainer ? highlightSearchQueryInScope(activeContainer, query) : null);

  const scrollTarget = state.isVisualMode
    ? (firstMark?.closest('.exhibition-slab') as HTMLElement | null) || (targetHeadingEl?.closest('.exhibition-slab') as HTMLElement | null) || firstMark || targetHeadingEl
    : firstMark || targetHeadingEl;

  if (scrollTarget) {
    scroller.scrollTo({ top: previewScrollTopOf(scrollTarget, scroller), behavior: scrollBehavior() });
  }
}

export async function runFolderSearch(
  rawQuery: string,
  onSelectMatch: (match: FolderSearchMatch, query: string) => void
) {
  const folder = runtime.openedFolder;
  const query = String(rawQuery || '').trim();
  const clearBtn = document.getElementById('btn-folder-search-clear');
  const statusEl = document.getElementById('folder-search-status');
  const resultsEl = document.getElementById('folder-search-results');
  const listEl = document.getElementById('folder-list');
  if (!statusEl || !resultsEl || !listEl) return;

  if (clearBtn) clearBtn.classList.toggle('hidden', query.length === 0);

  if (!folder || !query) {
    searchGeneration++;
    statusEl.textContent = '';
    statusEl.classList.add('hidden');
    resultsEl.replaceChildren();
    resultsEl.classList.add('hidden');
    listEl.classList.remove('hidden');
    clearPreviewSearchHighlights();
    return;
  }

  const gen = ++searchGeneration;
  const queryLower = query.toLowerCase();
  listEl.classList.add('hidden');
  resultsEl.classList.remove('hidden');
  statusEl.classList.remove('hidden');
  statusEl.textContent = '検索中…';

  const filesToScan = folder.isRemote
    ? folder.files.slice(0, REMOTE_SEARCH_FILE_LIMIT)
    : folder.files;

  const fileResults: FolderSearchFileResult[] = [];
  let totalMatches = 0;
  let matchedFiles = 0;

  for (let i = 0; i < filesToScan.length; i++) {
    if (gen !== searchGeneration || folder !== runtime.openedFolder) return;
    const fileEntry = filesToScan[i];
    const indexed = await getIndexedFile(folder, fileEntry);
    if (gen !== searchGeneration || folder !== runtime.openedFolder) return;
    if (!indexed) continue;

    const res = searchInIndexedFile(fileEntry.path, fileEntry.name, indexed, queryLower);
    if (res) {
      matchedFiles++;
      totalMatches += res.totalInFile;
      fileResults.push(res);
    }
    if ((i + 1) % 25 === 0) {
      statusEl.textContent = `検索中… (${i + 1} / ${filesToScan.length} ファイル)`;
      await new Promise(r => setTimeout(r, 0));
    }
  }

  if (gen !== searchGeneration || folder !== runtime.openedFolder) return;

  resultsEl.replaceChildren();
  const remoteNote = folder.isRemote && folder.files.length > REMOTE_SEARCH_FILE_LIMIT
    ? `（先頭 ${REMOTE_SEARCH_FILE_LIMIT} ファイル対象）`
    : '';

  if (fileResults.length === 0) {
    statusEl.textContent = `0 件${remoteNote}`;
    const empty = document.createElement('p');
    empty.className = 'folder-list-empty';
    empty.textContent = `「${query}」に一致する箇所はありません`;
    resultsEl.appendChild(empty);
    return;
  }

  statusEl.textContent = `${matchedFiles} ファイル・${totalMatches} 件一致${remoteNote}`;

  let renderedCount = 0;
  for (const fRes of fileResults) {
    if (renderedCount >= SEARCH_MAX_TOTAL_MATCHES) break;
    const groupHeader = document.createElement('div');
    groupHeader.className = 'folder-search-file-group';
    groupHeader.title = fRes.path;
    const pathSpan = document.createElement('span');
    pathSpan.className = 'folder-search-file-path';
    pathSpan.textContent = fRes.path;
    const countSpan = document.createElement('span');
    countSpan.className = 'folder-search-file-count';
    countSpan.textContent = String(fRes.totalInFile);
    groupHeader.append(pathSpan, countSpan);
    resultsEl.appendChild(groupHeader);

    for (const m of fRes.matches) {
      if (renderedCount >= SEARCH_MAX_TOTAL_MATCHES) break;
      renderedCount++;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'folder-search-item';
      btn.dataset.path = m.path;
      btn.dataset.line = String(m.line);
      btn.title = `${m.path} (${m.line + 1} 行目)`;

      const head = document.createElement('div');
      head.className = 'folder-search-item-head';
      const lineBadge = document.createElement('span');
      lineBadge.className = 'folder-search-item-line';
      lineBadge.textContent = `L${m.line + 1}`;
      const headingSpan = document.createElement('span');
      headingSpan.className = 'folder-search-item-heading';
      headingSpan.textContent = m.heading || m.fileName;
      head.append(lineBadge, headingSpan);

      const snippet = document.createElement('div');
      snippet.className = 'folder-search-item-snippet';
      snippet.innerHTML = `${escapeHtml(m.snippetBefore)}<mark class="folder-search-mark">${escapeHtml(m.snippetMatch)}</mark>${escapeHtml(m.snippetAfter)}`;

      btn.append(head, snippet);
      btn.onclick = () => onSelectMatch(m, query);
      resultsEl.appendChild(btn);
    }
  }
}

export function scheduleFolderSearch(
  rawQuery: string,
  onSelectMatch: (match: FolderSearchMatch, query: string) => void,
  immediate = false
) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = null;
  }
  if (immediate || !String(rawQuery || '').trim()) {
    runFolderSearch(rawQuery, onSelectMatch);
    return;
  }
  searchDebounceTimer = setTimeout(() => {
    searchDebounceTimer = null;
    runFolderSearch(rawQuery, onSelectMatch);
  }, 120);
}
