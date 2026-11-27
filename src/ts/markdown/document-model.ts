/* ==========================================================================
   文書モデル層と増分字句解析（#291）
   DOM や画面状態（state / runtime）に依存しない純粋なモジュール。
   入力は Markdown 文字列と lex 関数、出力は安定したブロック列・図一覧・リンク定義。
   ========================================================================== */
import { fnv1aHash } from '../utils/hash';
import { treeTokenFor } from './tree';
import { parseStructurizrInfoString } from '../diagram/structurizr/info-string';

export type DiagramKind = 'mermaid' | 'structurizr';

export interface DiagramSpec {
  index: number;
  kind?: DiagramKind;
  code: string;
  contentHash: string;
  initialViewKey?: string;
}

export interface DocBlock {
  type: string;
  raw: string;
  startOffset: number;
  endOffset: number;
  startLine: number;
  endLine: number;
  key: string;
  token: any;
  diagram: DiagramSpec | null;
}

export interface DocumentModel {
  body: string;
  bodyStartLine: number;
  blocks: DocBlock[];
  tokens: any[];
  diagrams: DiagramSpec[];
  links: Record<string, any>;
  hasFootnotes: boolean;
  incrementalUsed: boolean;
}

export interface ParseDocumentOptions {
  lex: (src: string) => any;
  prevModel?: DocumentModel | null;
}

export function countNewlines(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) n++;
  }
  return n;
}

// 文書全体に効く構文（参照リンク定義・脚注・生 HTML ブロック）がある場合は保守的に全体解析へ戻す
function hasGlobalContextSyntax(body: string): boolean {
  if (/^\s{0,3}\[\^[^\]]+\]:/m.test(body)) return true;
  if (/\[\^[^\]]+\]/.test(body)) return true;
  if (/^\s{0,3}\[[^\]]+\]:/m.test(body)) return true;
  if (/^\s{0,3}<[a-zA-Z!/]/m.test(body)) return true;
  return false;
}

// 閉じていないコードフェンスがある場合は増分境界が崩れるため全体解析へ戻す
function hasUnclosedFence(text: string): boolean {
  const lines = text.split('\n');
  let openChar = '';
  let openLen = 0;
  for (const line of lines) {
    const m = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (!m) continue;
    const fence = m[1];
    if (!openChar) {
      openChar = fence[0];
      openLen = fence.length;
    } else if (fence[0] === openChar && fence.length >= openLen && /^\s{0,3}(`{3,}|~{3,})\s*$/.test(line)) {
      openChar = '';
      openLen = 0;
    }
  }
  return openChar !== '';
}

function endsWithBlankLine(block: DocBlock): boolean {
  return block.type === 'space' || block.raw.endsWith('\n\n');
}

function buildBlocksFromLexed(
  lexed: any[],
  baseOffset: number,
  baseLine: number,
  startDiagramIndex: number
): { blocks: DocBlock[]; diagrams: DiagramSpec[]; hasFootnotes: boolean } {
  const blocks: DocBlock[] = [];
  const diagrams: DiagramSpec[] = [];
  let hasFootnotes = false;
  let offset = baseOffset;
  let line = baseLine;
  let diagIdx = startDiagramIndex;

  for (const rawToken of lexed) {
    if (rawToken.type === 'footnoteDef') hasFootnotes = true;
    const raw: string = rawToken.raw || '';
    const startOffset = offset;
    const endOffset = offset + raw.length;
    const startLine = line;
    const endLine = line + countNewlines(raw);
    offset = endOffset;
    line = endLine;

    let outToken: any = rawToken;
    let diagram: DiagramSpec | null = null;
    const structurizrInfo = rawToken.type === 'code' ? parseStructurizrInfoString(rawToken.lang) : null;
    if (rawToken.type === 'code' && (rawToken.lang || '').trim().toLowerCase() === 'mermaid') {
      const code = (rawToken.text || '').trim();
      const contentHash = fnv1aHash(code);
      diagram = { index: diagIdx, code, contentHash };
      diagrams.push(diagram);
      outToken = {
        type: 'lucivoDiagram',
        raw,
        kind: 'mermaid',
        index: diagIdx,
        code,
        contentHash,
        __mermaid: { index: diagIdx, contentHash }
      };
      diagIdx++;
    } else if (structurizrInfo) {
      const code = (rawToken.text || '').trim();
      const contentHash = fnv1aHash(`${code}\0${structurizrInfo.initialViewKey || ''}`);
      diagram = {
        index: diagIdx,
        kind: 'structurizr',
        code,
        contentHash,
        initialViewKey: structurizrInfo.initialViewKey
      };
      diagrams.push(diagram);
      outToken = {
        type: 'lucivoDiagram',
        raw,
        kind: 'structurizr',
        index: diagIdx,
        code,
        contentHash,
        initialViewKey: structurizrInfo.initialViewKey,
        __structurizr: { index: diagIdx, contentHash, initialViewKey: structurizrInfo.initialViewKey }
      };
      diagIdx++;
    } else {
      const treeTok = treeTokenFor(rawToken);
      if (treeTok) {
        (treeTok as any).__isTree = true;
        outToken = treeTok;
      } else {
        if (rawToken.type === 'heading') {
          rawToken.srcLine = startLine;
        }
        outToken = rawToken;
      }
    }

    const key = diagram
      ? (diagram.kind === 'structurizr' ? `s:${diagram.contentHash}` : `m:${diagram.contentHash}`)
      : `${outToken.type}:${fnv1aHash(raw)}`;
    blocks.push({
      type: outToken.type,
      raw,
      startOffset,
      endOffset,
      startLine,
      endLine,
      key,
      token: outToken,
      diagram
    });
  }
  return { blocks, diagrams, hasFootnotes };
}

function shiftBlock(
  block: DocBlock,
  offsetDelta: number,
  lineDelta: number,
  nextDiagIdx: number
): { block: DocBlock; diagram: DiagramSpec | null; nextDiagIdx: number } {
  let token = block.token;
  let diagram = block.diagram;
  if (diagram) {
    const idx = nextDiagIdx++;
    if (diagram.kind === 'structurizr') {
      diagram = {
        index: idx,
        kind: 'structurizr',
        code: diagram.code,
        contentHash: diagram.contentHash,
        initialViewKey: diagram.initialViewKey
      };
      token = {
        ...token,
        index: idx,
        __structurizr: { index: idx, contentHash: diagram.contentHash, initialViewKey: diagram.initialViewKey }
      };
    } else {
      diagram = { index: idx, code: diagram.code, contentHash: diagram.contentHash };
      token = {
        ...token,
        index: idx,
        __mermaid: { index: idx, contentHash: diagram.contentHash }
      };
    }
  } else if (token.type === 'heading') {
    token = { ...token, srcLine: block.startLine + lineDelta };
  }
  return {
    block: {
      ...block,
      startOffset: block.startOffset + offsetDelta,
      endOffset: block.endOffset + offsetDelta,
      startLine: block.startLine + lineDelta,
      endLine: block.endLine + lineDelta,
      token,
      diagram
    },
    diagram,
    nextDiagIdx
  };
}

function tryIncrementalParse(
  body: string,
  bodyStartLine: number,
  prev: DocumentModel,
  lex: (src: string) => any
): DocumentModel | null {
  if (prev.blocks.length < 4 || prev.hasFootnotes) return null;
  if (hasGlobalContextSyntax(prev.body) || hasGlobalContextSyntax(body)) return null;
  if (hasUnclosedFence(prev.body) || hasUnclosedFence(body)) return null;

  const prevBody = prev.body;
  const minLen = Math.min(prevBody.length, body.length);
  let commonPrefix = 0;
  while (commonPrefix < minLen && prevBody.charCodeAt(commonPrefix) === body.charCodeAt(commonPrefix)) {
    commonPrefix++;
  }
  let commonSuffix = 0;
  const maxSuffix = minLen - commonPrefix;
  while (
    commonSuffix < maxSuffix
    && prevBody.charCodeAt(prevBody.length - 1 - commonSuffix) === body.charCodeAt(body.length - 1 - commonSuffix)
  ) {
    commonSuffix++;
  }

  const prevBlocks = prev.blocks;
  // 変更箇所の手前にある完全一致ブロックのうち、空行境界かつ 1 ブロックの安全マージンを残す
  let prefixCount = 0;
  while (prefixCount < prevBlocks.length && prevBlocks[prefixCount].endOffset <= commonPrefix) {
    prefixCount++;
  }
  prefixCount = Math.max(0, prefixCount - 1);
  while (prefixCount > 0 && !endsWithBlankLine(prevBlocks[prefixCount - 1])) {
    prefixCount--;
  }

  // 変更箇所の後ろにある完全一致ブロックのうち、直前が空行境界かつ 1 ブロックの安全マージンを残す
  const prevSuffixThreshold = prevBody.length - commonSuffix;
  let suffixStart = prevBlocks.length;
  while (suffixStart > prefixCount && prevBlocks[suffixStart - 1].startOffset >= prevSuffixThreshold) {
    suffixStart--;
  }
  suffixStart = Math.min(prevBlocks.length, suffixStart + 1);
  while (suffixStart < prevBlocks.length && suffixStart > 0 && !endsWithBlankLine(prevBlocks[suffixStart - 1])) {
    suffixStart++;
  }

  const suffixCount = prevBlocks.length - suffixStart;
  if (prefixCount + suffixCount < 2) return null;

  const prefixEndOffset = prefixCount > 0 ? prevBlocks[prefixCount - 1].endOffset : 0;
  const prefixEndLine = prefixCount > 0 ? prevBlocks[prefixCount - 1].endLine : bodyStartLine;
  const prevSuffixStartOffset = suffixStart < prevBlocks.length ? prevBlocks[suffixStart].startOffset : prevBody.length;
  const offsetDelta = body.length - prevBody.length;
  const nextSuffixStartOffset = prevSuffixStartOffset + offsetDelta;
  if (nextSuffixStartOffset < prefixEndOffset) return null;

  const midSrc = body.slice(prefixEndOffset, nextSuffixStartOffset);
  if (hasUnclosedFence(midSrc)) return null;
  if (suffixCount > 0 && midSrc.length > 0 && !midSrc.endsWith('\n\n')) {
    return null;
  }

  const midLexed = midSrc.length > 0 ? lex(midSrc) : [];
  if (midLexed.links && Object.keys(midLexed.links).length > 0) return null;

  const lineDelta = countNewlines(body) - countNewlines(prevBody);
  const blocks: DocBlock[] = [];
  const diagrams: DiagramSpec[] = [];
  let diagIdx = 0;

  for (let i = 0; i < prefixCount; i++) {
    const b = prevBlocks[i];
    if (prev.bodyStartLine === bodyStartLine) {
      blocks.push(b);
      if (b.diagram) {
        diagrams.push(b.diagram);
        diagIdx++;
      }
    } else {
      const shifted = shiftBlock(b, 0, bodyStartLine - prev.bodyStartLine, diagIdx);
      blocks.push(shifted.block);
      if (shifted.diagram) diagrams.push(shifted.diagram);
      diagIdx = shifted.nextDiagIdx;
    }
  }

  const midBuilt = buildBlocksFromLexed(midLexed, prefixEndOffset, prefixEndLine, diagIdx);
  if (midBuilt.hasFootnotes) return null;
  blocks.push(...midBuilt.blocks);
  diagrams.push(...midBuilt.diagrams);
  diagIdx += midBuilt.diagrams.length;

  const suffixLineDelta = (bodyStartLine - prev.bodyStartLine) + lineDelta;
  for (let i = suffixStart; i < prevBlocks.length; i++) {
    const shifted = shiftBlock(prevBlocks[i], offsetDelta, suffixLineDelta, diagIdx);
    blocks.push(shifted.block);
    if (shifted.diagram) diagrams.push(shifted.diagram);
    diagIdx = shifted.nextDiagIdx;
  }

  return {
    body,
    bodyStartLine,
    blocks,
    tokens: blocks.map(b => b.token),
    diagrams,
    links: prev.links,
    hasFootnotes: false,
    incrementalUsed: true
  };
}

export function parseDocumentModel(
  rawMarkdown: string,
  body: string,
  options: ParseDocumentOptions
): DocumentModel {
  const bodyStartLine = countNewlines(rawMarkdown.slice(0, rawMarkdown.length - body.length));
  const prev = options.prevModel || null;

  // 脚注を含む文書は resetFootnotes() 後に lexer の副作用で定義を再登録する必要があるためキャッシュ再利用しない
  if (prev && !prev.hasFootnotes && !hasGlobalContextSyntax(body) && prev.body === body && prev.bodyStartLine === bodyStartLine) {
    return { ...prev, incrementalUsed: true };
  }

  if (prev) {
    const inc = tryIncrementalParse(body, bodyStartLine, prev, options.lex);
    if (inc) return inc;
  }

  const lexed: any = options.lex(body);
  const built = buildBlocksFromLexed(lexed, 0, bodyStartLine, 0);
  return {
    body,
    bodyStartLine,
    blocks: built.blocks,
    tokens: built.blocks.map(b => b.token),
    diagrams: built.diagrams,
    links: lexed.links || {},
    hasFootnotes: built.hasFootnotes,
    incrementalUsed: false
  };
}
