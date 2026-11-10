import { escapeHtml } from '../utils/escape';

/* ==========================================================================
   フォルダ構成のツリー（FR-047, DD-MD-050〜054）: 罫線で書いた構成を、線を引き直したツリーにする
   ========================================================================== */
export const TREE_LANGS = ['tree', 'filetree', 'dirtree'];
export const TREE_BRANCH_CHARS = '├┣└┗+`\\';
export const TREE_PIPE_CHARS = '│┃|';
export const TREE_LINE_CHARS = '─━-';
export const TREE_FULLWIDTH_SPACE = String.fromCharCode(0x3000);
export const TREE_NOTE_RE = /\s+(?:#|\/\/|←|<-{1,2})\s*(.*)$/;
export const TREE_KIND_RES: [string, RegExp][] = [
  ['doc', /\.(?:md|markdown|mdx|txt|rst|adoc|pdf|docx?|xlsx?|pptx?|csv)$/i],
  ['image', /\.(?:png|jpe?g|gif|svg|webp|avif|bmp|ico|drawio)$/i],
  ['code', /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|xml|html?|css|scss|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|ps1|bat|sql|vue|svelte|ini|env|lock)$/i]
];

export interface TreeLineEntry {
  branchCol: number;
  indent: number;
  hasPipe: boolean;
  ascii: boolean;
  text: string;
  invalid?: boolean;
}

export interface TreeNode {
  depth: number;
  name: string;
  note: string;
  kind: string;
}

// 1 行を、枝の列（枝のない行は -1）・字下げ・名前に分ける。罫線だけの行（│ だけ）は null（DD-MD-051）
export function splitTreeLine(line: string): TreeLineEntry | null {
  let col = 0;
  let branchCol = -1;
  let ascii = false;
  let i = 0;
  for (; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1] || '';
    if (ch === ' ') {
      col += 1;
    } else if (ch === TREE_FULLWIDTH_SPACE) {
      col += 2;
    } else if (branchCol < 0 && TREE_BRANCH_CHARS.includes(ch) && (ch !== '\\' || TREE_LINE_CHARS.includes(next))) {
      branchCol = col;
      ascii = ascii || !'├┣└┗'.includes(ch);
      col += 1;
    } else if (branchCol < 0 && ch === '|' && TREE_LINE_CHARS.includes(next)) {
      // |-- も枝として扱う
      branchCol = col;
      ascii = true;
      col += 1;
    } else if (TREE_PIPE_CHARS.includes(ch) && branchCol < 0) {
      ascii = ascii || ch === '|';
      col += 1;
    } else if (TREE_LINE_CHARS.includes(ch) && branchCol >= 0) {
      col += 1;
    } else {
      break;
    }
  }
  const rest = line.slice(i).trim();
  if (!rest) return branchCol < 0 ? null : { branchCol: -1, indent: 0, hasPipe: false, ascii: false, text: '', invalid: true };
  const prefix = line.slice(0, i);
  return { branchCol, indent: col, hasPipe: /[│┃|]/.test(prefix), ascii, text: rest };
}

// 拡張子のないファイルとしてよく使う名前
export const TREE_PLAIN_FILES = /^(?:readme|license|licence|changelog|makefile|dockerfile|gemfile|procfile|jenkinsfile|vagrantfile|notice|authors|copying)$/i;

// 名前からアイコンの種類を決める（DD-MD-052）。末尾の / と子を持つことが最も確か。
// 子のない名前は、拡張子、よく使う拡張子のないファイル名、「ファイル」「フォルダ」などの言葉の順に見て、
// どれにも当たらない拡張子のない名前はフォルダとみなす
export function treeNodeKind(name: string, isFolder: boolean): string {
  if (isFolder) return 'folder';
  const hit = TREE_KIND_RES.find(([, re]) => re.test(name));
  if (hit) return hit[0];
  if (/\.[^.\s]+$/.test(name) || /^(?:\.{3}|…+)$/.test(name)) return 'file';
  if (TREE_PLAIN_FILES.test(name) || /ファイル|file/i.test(name)) return 'file';
  return 'folder';
}

// 罫線で書いた構成を、{ depth, name, note, kind } の並びにする。ツリーと読めなければ null（DD-MD-051, 052）。
// mode: 'tree'（言語名で指定された。字下げだけの書き方も読む）、'code'（言語名のないコードブロック）、'paragraph'（段落）
export function parseTreeText(text: string, mode: 'tree' | 'code' | 'paragraph'): TreeNode[] | null {
  const lines = String(text).replace(/\t/g, '    ').split('\n').map(l => l.replace(/\s+$/, ''));
  const entries: TreeLineEntry[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const e = splitTreeLine(line);
    if (e === null) continue;
    if (e.invalid) return null;
    entries.push(e);
  }
  if (!entries.length) return null;
  const branches = entries.filter(e => e.branchCol >= 0);

  let depths: number[];
  if (branches.length) {
    // 自動の判定（mode が tree 以外）は、枝が 2 行以上あり、枝のない行は先頭に字下げなしで書いたもの（根）だけのとき
    if (mode !== 'tree') {
      if (branches.length < 2 || entries[0].branchCol >= 0) return null;
      if (entries.some(e => e.branchCol < 0 && (e.indent > 0 || e.hasPipe))) return null;
      // 段落の文章に紛れた記号を拾わないよう、段落は ├ └ の罫線だけを認める
      if (mode === 'paragraph' && branches.some(e => e.ascii)) return null;
    }
    const cols = [...new Set(branches.map(e => e.branchCol))].sort((a, b) => a - b);
    depths = entries.map(e => (e.branchCol < 0 ? 0 : cols.indexOf(e.branchCol) + 1));
  } else {
    // 罫線のない字下げだけの書き方は、言語名で tree と指定したときだけ読む
    if (mode !== 'tree') return null;
    const indents = [...new Set(entries.map(e => e.indent))].sort((a, b) => a - b);
    depths = entries.map(e => indents.indexOf(e.indent));
  }
  // 1 段ずつしか深くならないようにそろえる（書き間違いで 2 段以上深くなったときは、1 段深いとみなす）
  const min = Math.min(...depths);
  let prev = -1;
  depths = depths.map(d => {
    const fixed = Math.min(d - min, prev + 1);
    prev = fixed;
    return fixed;
  });

  return entries.map((e, k) => {
    const m = TREE_NOTE_RE.exec(e.text);
    let name = (m ? e.text.slice(0, m.index) : e.text).trim();
    const note = m ? m[1].trim() : '';
    const hasChild = k + 1 < depths.length && depths[k + 1] > depths[k];
    const slash = /[/\\]$/.test(name);
    if (slash && name.length > 1) name = name.replace(/[/\\]+$/, '');
    return { depth: depths[k], name, note, kind: treeNodeKind(name, slash || hasChild) };
  });
}

// 各行の左の罫線（祖先ごとに縦線を続けるか、自分の枝が ├ か └ か）を決めて、HTML にする（DD-MD-053）
export function buildTreeHtml(nodes: TreeNode[]): string {
  const hasNextSibling = nodes.map((n, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      if (nodes[j].depth < n.depth) return false;
      if (nodes[j].depth === n.depth) return true;
    }
    return false;
  });
  const stack: number[] = [];
  const hasNotes = nodes.some(n => n.note);
  const rows = nodes.map((n, i) => {
    stack.length = n.depth;
    let guides = '';
    for (let level = 1; level < n.depth; level++) {
      guides += `<span class="md-tree-g ${hasNextSibling[stack[level]] ? 'is-pipe' : 'is-blank'}"></span>`;
    }
    if (n.depth > 0) guides += `<span class="md-tree-g ${hasNextSibling[i] ? 'is-tee' : 'is-end'}"></span>`;
    stack[n.depth] = i;
    const muted = /^(?:\.{3}|…+)$/.test(n.name) ? ' is-ellipsis' : '';
    const nameCell = `<div class="md-tree-row${n.depth === 0 ? ' is-root' : ''}${muted}">${guides}<span class="md-tree-icon is-${n.kind}" aria-hidden="true"></span><span class="md-tree-name">${escapeHtml(n.name)}</span></div>`;
    return hasNotes ? `${nameCell}<div class="md-tree-note">${escapeHtml(n.note)}</div>` : nameCell;
  });
  return `<div class="md-tree${hasNotes ? ' has-notes' : ''}" role="group" aria-label="フォルダ構成">${rows.join('')}</div>\n`;
}

// Marked のトークンがツリーなら、差し替える HTML のトークンを返す。ツリーでなければ null（DD-MD-050）
export function treeTokenFor(token: any): any | null {
  let nodes: TreeNode[] | null = null;
  if (token.type === 'code') {
    const lang = (token.lang || '').trim().toLowerCase();
    if (TREE_LANGS.includes(lang)) nodes = parseTreeText(token.text, 'tree');
    else if (!lang) nodes = parseTreeText(token.text, 'code');
  } else if (token.type === 'paragraph') {
    nodes = parseTreeText(token.raw, 'paragraph');
  }
  if (!nodes) return null;
  const html = buildTreeHtml(nodes);
  return { type: 'html', raw: html, text: html, block: true };
}
