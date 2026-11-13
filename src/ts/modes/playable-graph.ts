// プレイアブル・ダイアグラム（#62）の図の読み取り。Mermaid の原文から、状態・判定と、
// それをつなぐ矢印（とラベル）の有向グラフを作る（DD-SHOW-121）。
// SVG から逆算すると、Mermaid の版で構造が変わったときに壊れやすい。原文の基本の書き方だけを読み、
// 読めない行（サブグラフ・スタイル・クリックなど）は飛ばす。

export interface PlayNode {
  id: string;
  label: string;
  // 判定（フローチャートのひし形、状態遷移図の <<choice>>）
  decision: boolean;
  // 状態の注釈（状態遷移図の「状態 : 説明」）。画面の項目になる
  notes: string[];
}

export interface PlayEdge {
  from: string;
  to: string;
  label: string;
}

export interface PlayGraph {
  kind: 'state' | 'flow';
  nodes: Map<string, PlayNode>;
  edges: PlayEdge[];
  // 始まりの場所
  start: string | null;
}

// 状態遷移図の始まり・終わり（[*]）を表す内部の名前
export const END = '[*]';

function clean(text: string): string {
  return String(text || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\*\*|__/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensure(nodes: Map<string, PlayNode>, id: string, label?: string, decision = false): PlayNode {
  let node = nodes.get(id);
  if (!node) {
    node = { id, label: label ? clean(label) : id, decision, notes: [] };
    nodes.set(id, node);
  } else {
    if (label) node.label = clean(label);
    if (decision) node.decision = true;
  }
  return node;
}

/* ------------------------------------------------------------------------
   状態遷移図（stateDiagram / stateDiagram-v2）
   ------------------------------------------------------------------------ */
function parseState(lines: string[]): PlayGraph {
  const nodes = new Map<string, PlayNode>();
  const edges: PlayEdge[] = [];
  let start: string | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^(note|direction|classDef|class|style|click)\b/.test(line) || line === '}' || line === '--') continue;
    // state "表示名" as ID
    let m = /^state\s+"([^"]+)"\s+as\s+([\w\u00C0-\uFFFF-]+)/.exec(line);
    if (m) { ensure(nodes, m[2], m[1]); continue; }
    // state ID <<choice>> / state ID {
    m = /^state\s+([\w\u00C0-\uFFFF-]+)\s*(<<\s*choice\s*>>)?/.exec(line);
    if (m) { ensure(nodes, m[1], undefined, Boolean(m[2])); continue; }
    // A --> B : ラベル
    m = /^(\[\*\]|[\w\u00C0-\uFFFF-]+)\s*-->\s*(\[\*\]|[\w\u00C0-\uFFFF-]+)\s*(?::\s*(.*))?$/.exec(line);
    if (m) {
      const [, from, to, label] = m;
      if (from === END) {
        if (start === null) start = to;
        ensure(nodes, to);
        continue;
      }
      ensure(nodes, from);
      if (to !== END) ensure(nodes, to);
      edges.push({ from, to, label: clean(label || '') });
      continue;
    }
    // A : 説明
    m = /^([\w\u00C0-\uFFFF-]+)\s*:\s*(.+)$/.exec(line);
    if (m) ensure(nodes, m[1]).notes.push(clean(m[2]));
  }
  if (start === null && nodes.size) start = nodes.keys().next().value;
  return { kind: 'state', nodes, edges, start };
}

/* ------------------------------------------------------------------------
   フローチャート（flowchart / graph）
   ------------------------------------------------------------------------ */
// ノードの形。ひし形（{}）と六角形（{{}}）は判定とみなす
const SHAPES: Array<[RegExp, boolean]> = [
  [/^\{\{([\s\S]*?)\}\}/, true],
  [/^\{([\s\S]*?)\}/, true],
  [/^\[\[([\s\S]*?)\]\]/, false],
  [/^\[\(([\s\S]*?)\)\]/, false],
  [/^\(\(\(([\s\S]*?)\)\)\)/, false],
  [/^\(\(([\s\S]*?)\)\)/, false],
  [/^\(\[([\s\S]*?)\]\)/, false],
  [/^\[\/([\s\S]*?)[\/\\]\]/, false],
  [/^\[\\([\s\S]*?)[\/\\]\]/, false],
  [/^\[([\s\S]*?)\]/, false],
  [/^\(([\s\S]*?)\)/, false],
  [/^>([\s\S]*?)\]/, false]
];

// 矢印。|ラベル| または -- ラベル --> の形でラベルを持てる
const EDGE = /^\s*(?:(<?(?:--|==|-\.)[-.=]*)\s*([^|>\-=.][^>]*?)\s*((?:--|==|\.-)[-.=]*[>ox])|(<?(?:-{2,}|={2,}|-\.+-?)[>ox]?|~~~))\s*(?:\|([^|]*)\|)?\s*/;

function readNode(text: string, nodes: Map<string, PlayNode>): { id: string; rest: string } | null {
  const idMatch = /^\s*([\w\u00C0-\uFFFF][\w\u00C0-\uFFFF-]*)/.exec(text);
  if (!idMatch) return null;
  const id = idMatch[1];
  let rest = text.slice(idMatch[0].length);
  for (const [re, decision] of SHAPES) {
    const m = re.exec(rest);
    if (m) {
      ensure(nodes, id, m[1], decision);
      rest = rest.slice(m[0].length);
      // class の指定（:::name）は読み飛ばす
      rest = rest.replace(/^:::[\w-]+/, '');
      return { id, rest };
    }
  }
  ensure(nodes, id);
  rest = rest.replace(/^:::[\w-]+/, '');
  return { id, rest };
}

function parseFlow(lines: string[]): PlayGraph {
  const nodes = new Map<string, PlayNode>();
  const edges: PlayEdge[] = [];
  const statements = lines.flatMap(l => l.split(';'));
  for (const raw of statements) {
    const line = raw.trim();
    if (!line || line.startsWith('%%') || /^(subgraph|end|style|classDef|class|click|linkStyle|direction)\b/.test(line)) continue;
    let first = readNode(line, nodes);
    if (!first) continue;
    let rest = first.rest;
    // A --> B --> C のような連なり
    while (rest.trim()) {
      const e = EDGE.exec(rest);
      if (!e) break;
      const label = clean(e[5] !== undefined ? e[5] : (e[2] || ''));
      rest = rest.slice(e[0].length);
      const next = readNode(rest, nodes);
      if (!next) break;
      // 線だけ（矢じりのない ---・~~~）も、進む向きは左から右とみなす
      edges.push({ from: first.id, to: next.id, label });
      first = next;
      rest = next.rest;
    }
  }
  // 始まりは、入ってくる矢印のない最初のノード
  const targets = new Set(edges.map(e => e.to));
  const start = Array.from(nodes.keys()).find(id => !targets.has(id)) || (nodes.size ? nodes.keys().next().value : null);
  return { kind: 'flow', nodes, edges, start };
}

// 状態遷移図とフローチャートだけを読む。ほかの図は null
export function parsePlayable(source: string): PlayGraph | null {
  const lines = String(source || '').split('\n');
  // フロントマター（---）と、先頭の %% の行を飛ばす
  let i = 0;
  if (lines[0]?.trim() === '---') {
    const end = lines.findIndex((l, k) => k > 0 && l.trim() === '---');
    i = end > 0 ? end + 1 : 0;
  }
  while (i < lines.length && (!lines[i].trim() || lines[i].trim().startsWith('%%'))) i++;
  const head = (lines[i] || '').trim();
  const body = lines.slice(i + 1);
  if (/^stateDiagram(-v2)?\b/.test(head)) return parseState(body);
  if (/^(flowchart|graph)\b/.test(head)) {
    // 1 行目に書いた文（flowchart LR; A --> B）も読む
    const after = head.replace(/^(flowchart|graph)\s*(TB|TD|BT|RL|LR)?\s*;?/, '');
    return parseFlow(after ? [after, ...body] : body);
  }
  return null;
}

export function outgoing(graph: PlayGraph, id: string): PlayEdge[] {
  return graph.edges.filter(e => e.from === id);
}
