// @ts-nocheck
// メイン描画パイプライン（高速モード差分ブロック描画 #235、Visual モード差分スラブ描画 #251、非同期 Mermaid 描画）と図ビューポート操作
import { fnv1aHash } from '../utils/hash';
import { downloadBlob } from '../utils/download';
import { showToast, updateStatus } from './toast';
import { applyUpdateCheckState } from './update-check';
import { splitFrontMatter, buildFrontMatterHtml } from '../markdown/front-matter';
import { noteRawHtmlBlocks } from '../markdown/block-renderers';
import { resetFootnotes, applyFootnotes } from '../markdown/footnotes';
import { parseDocumentModel } from '../markdown/document-model';
import {
  getDiagramSpec,
  getBlockCurve,
  getMermaidLayout,
  prepareMermaidSource,
  setupMermaid
} from '../diagram/mermaid-config';
import {
  bindDiagramPanZoom,
  clearDiagramZoom,
  updatePannable
} from '../diagram/pan-zoom';
import { setScaleMode, type ScaleAction } from '../diagram/scale-mode';
import {
  applyReadableFit,
  updateSlabSplit,
  postProcessSvg
} from '../diagram/svg-postprocess';
import { linkSplitTerms } from './split-term-links';
import {
  buildSingleVisualSlabHtml,
  buildVisualHeroAndEndCard,
  buildVisualStageHtml
} from './visual-stage';
import {
  sanitizeMarkdownHtml,
  postProcessDetachedFragment,
  postProcessConnectedScope
} from './fragment-renderer';
import { applyToneToVisualStage } from './view-controls';
import { rebuildFollowIndex, rebuildFollowIndexFromEntries, scheduleFollow } from './editor-follow';
import { resolveFolderImages } from '../markdown/local-images';
import { renderMath } from '../markdown/math-and-headings';
import { renderEmoji } from '../markdown/emoji';
import {
  setModalOpen,
  getEmptyGuideHtml,
  state,
  svgCache,
  lkgCache,
  loadLibrary,
  runtime
} from './state';

const VOID_HTML_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

// 生の HTML トークン内の開きタグと閉じタグの差分を数える（<details> 等の複数トークン跨ぎを検出するため）
function htmlTagBalance(html: string): number {
  const cleaned = html.replace(/<!--[\s\S]*?-->/g, '');
  let delta = 0;
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9-]*)(\s[^<>]*)?(\/?)>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(cleaned)) !== null) {
    const isClose = m[1] === '/';
    const tag = m[2].toLowerCase();
    const isSelfClosing = m[4] === '/';
    if (isSelfClosing || VOID_HTML_TAGS.has(tag)) continue;
    delta += isClose ? -1 : 1;
  }
  return delta;
}

interface StdBlockGroup {
  stableKey: string;
  matchKey: string;
  tokens: any[];
  headingLines: number[];
  isFrontMatter?: boolean;
  html?: string;
}

interface StdBlockEntry {
  key: string;
  nodes: ChildNode[];
  headingLines: number[];
  headingEls: HTMLElement[];
}

interface VisSlabGroup {
  stableKey: string;
  matchKey: string;
  tokens: any[];
  headingLines: number[];
  stageNo: number | null;
  frontMatterHtml: string;
  stripFirstH1: boolean;
}

interface VisSlabEntry {
  key: string;
  el: HTMLElement | null;
  headingLines: number[];
  headingEls: HTMLElement[];
}

function collectNodesHeadings(nodes: ChildNode[]): HTMLElement[] {
  const out: HTMLElement[] = [];
  for (const node of nodes) {
    if (node.nodeType !== 1) continue;
    const el = node as HTMLElement;
    if (el.hasAttribute('data-src-line')) {
      out.push(el);
    } else if (el.childElementCount > 0) {
      el.querySelectorAll('[data-src-line]').forEach(h => out.push(h as HTMLElement));
    }
  }
  return out;
}

function collectSlabHeadings(el: HTMLElement | null): HTMLElement[] {
  if (!el) return [];
  return Array.from(el.querySelectorAll('[data-src-line]')) as HTMLElement[];
}

// 脚注参照（footnoteRef）を含むトークンの場合、割り当てられた番号（num:occ:seg）を差分キーに含める（#329）
function tokenFootnoteSig(token: any): string {
  if (!token || typeof token.raw !== 'string' || !token.raw.includes('[^')) return '';
  const parts: string[] = [];
  const walk = (list: any[]) => {
    for (const t of list || []) {
      if (!t) continue;
      if (t.type === 'footnoteRef') parts.push(`${t.id}:${t.num || 0}:${t.occ || 0}:${t.seg || 0}`);
      if (t.tokens) walk(t.tokens);
      if (t.items) walk(t.items);
      if (t.header) t.header.forEach((c: any) => c.tokens && walk(c.tokens));
      if (t.rows) t.rows.forEach((r: any[]) => r.forEach((c: any) => c.tokens && walk(c.tokens)));
    }
  };
  walk([token]);
  return parts.length ? `\0fn:${parts.join(',')}` : '';
}

function parseMarkdownAndMermaidSlots(rawMarkdown: string, body: string) {
  resetFootnotes();
  const model = parseDocumentModel(rawMarkdown, body, {
    lex: src => marked.lexer(src),
    prevModel: runtime.prevDocModel
  });
  runtime.prevDocModel = model;

  const mermaidBlocks: any[] = [];
  runtime.lastMermaidSources = [];
  const tokensToKeep: any[] = model.tokens.map(token => {
    if (token.type === 'lucivoDiagram' && token.__mermaid) {
      const idx = token.index;
      const code = token.code;
      const curve = getBlockCurve(idx, code);
      // 表示状態（外観・パレット・トーン・スタイル）は文書モデルから分離し、描画側でハッシュを組み合わせる（#291）
      const hash = fnv1aHash(
        code + state.appearance + state.palette + state.tone + (curve || '') + state.infographicStyle + (state.isVisualMode ? 'vis' : 'std')
      );
      mermaidBlocks.push({ index: idx, code, hash, curve });
      runtime.lastMermaidSources[idx] = code;
      return {
        ...token,
        curve,
        __mermaid: { index: idx, hash, curve }
      };
    }
    return token;
  });

  // 脚注の番号と一覧を決める。Visualモードは章ごと、高速モードは文書の末尾に置く（FR-057）
  return {
    mermaidBlocks,
    tokensToKeep: applyFootnotes(tokensToKeep, state.isVisualMode),
    links: model.links,
    hasFootnotes: model.hasFootnotes
  };
}

// 最上位トークン列を独立に差し替え可能なブロック単位へまとめる（<details> 等で HTML タグが複数トークンにまたがる場合は 1 グループに統合）
function buildStdBlockGroups(
  tokensToKeep: any[],
  frontMatterHtml: string,
  generation: number
): StdBlockGroup[] | null {
  const groups: StdBlockGroup[] = [];
  if (frontMatterHtml) {
    const fk = `fm:${frontMatterHtml}`;
    groups.push({ stableKey: fk, matchKey: fk, tokens: [], headingLines: [], isFrontMatter: true, html: frontMatterHtml });
  }
  let buf: any[] = [];
  let stableParts: string[] = [];
  let matchParts: string[] = [];
  let headingLines: number[] = [];
  let htmlDepth = 0;

  const flush = () => {
    if (buf.length === 0) return;
    groups.push({
      stableKey: stableParts.join('\n|BLK|\n'),
      matchKey: matchParts.join('\n|BLK|\n'),
      tokens: buf,
      headingLines
    });
    buf = [];
    stableParts = [];
    matchParts = [];
    headingLines = [];
  };

  for (const token of tokensToKeep) {
    if (token.type === 'space' && htmlDepth === 0) continue;
    buf.push(token);
    const fnSig = tokenFootnoteSig(token);
    if (token.type === 'heading' && Number.isInteger(token.srcLine)) {
      headingLines.push(token.srcLine);
      const part = `h:${token.depth}:${token.raw}${fnSig}`;
      stableParts.push(part);
      matchParts.push(part);
    } else if (token.__mermaid) {
      const m = token.__mermaid;
      const cacheKey = `${m.hash}-std`;
      const stable = `m:${m.index}:${m.hash}:${m.curve || ''}`;
      stableParts.push(stable);
      // svgCache から消えた図は未変更スキップさせず再描画対象にする（保存は安定キーで行う）
      matchParts.push(svgCache.has(cacheKey) ? stable : `miss:${generation}:${m.index}`);
    } else {
      const part = `${token.type}:${token.raw}${fnSig}`;
      stableParts.push(part);
      matchParts.push(part);
    }
    if (token.type === 'html' && !token.__mermaid && !token.__isTree && !token.__isFootnotes) {
      htmlDepth += htmlTagBalance(token.raw || '');
      if (htmlDepth < 0) return null;
    }
    if (htmlDepth === 0) flush();
  }
  if (htmlDepth !== 0) return null;
  flush();
  return groups;
}

function renderGroupSliceHtml(groups: StdBlockGroup[], links: Record<string, any>, sepAttrValue: string): string {
  const sep = `<span data-lucivo-blk-sep="${sepAttrValue}"></span>`;
  return groups.map(g => {
    if (g.isFrontMatter) return g.html || '';
    const slice: any = [...g.tokens];
    slice.links = links;
    return marked.parser(slice);
  }).join(sep);
}

// セパレータ要素でコンテナ直下の子ノード列をグループ単位に分割し、セパレータを除去する
function splitContainerNodesBySep(container: HTMLElement, groupCount: number, sepAttrValue: string): ChildNode[][] {
  const buckets: ChildNode[][] = Array.from({ length: groupCount }, () => []);
  let idx = 0;
  const children = Array.from(container.childNodes);
  for (const node of children) {
    if (node.nodeType === 1 && (node as HTMLElement).getAttribute('data-lucivo-blk-sep') === sepAttrValue) {
      node.remove();
      if (idx + 1 < groupCount) idx++;
    } else {
      buckets[idx].push(node);
    }
  }
  return buckets;
}

function updateGroupHeadingLines(entry: StdBlockEntry, nextLines: number[]) {
  if (entry.headingLines.length === nextLines.length && entry.headingLines.every((v, i) => v === nextLines[i])) return;
  const els = entry.headingEls;
  const len = Math.min(els.length, nextLines.length);
  for (let k = 0; k < len; k++) {
    els[k].dataset.srcLine = String(nextLines[k]);
  }
  entry.headingLines = nextLines;
}

const headingTextCache = new Map<string, string>();

// 1 見出しトークンから描画後のプレーンテキストを取り出す（buildVisualStageHtml と完全一致させるため）
// インライン記法・HTML・エスケープを含まない通常の見出しは DOMPurify・DOM 生成を省き、それ以外もキャッシュする（#329）
function headingTokenText(token: any, links: Record<string, any>, linksSig: string): string {
  const rawText = typeof token.text === 'string' ? token.text : '';
  if (rawText && !/[*_`~<\[&\\!:]/.test(rawText)) {
    return rawText;
  }
  const cacheKey = `${linksSig}\0${token.raw || rawText}`;
  const cached = headingTextCache.get(cacheKey);
  if (cached !== undefined) return cached;
  const slice: any = [token];
  slice.links = links;
  const clean = sanitizeMarkdownHtml(marked.parser(slice));
  const tmp = document.createElement('div');
  tmp.innerHTML = clean;
  const heading = tmp.querySelector('h1, h2, h3, h4, h5, h6');
  const text = (heading || tmp).textContent || '';
  if (headingTextCache.size > 1000) headingTextCache.clear();
  headingTextCache.set(cacheKey, text);
  return text;
}

// Visualモード用に最上位トークン列を章（H2 区切り）単位のスラブグループへ分割する（#251）
function buildVisSlabGroups(
  tokensToKeep: any[],
  frontMatterHtml: string,
  links: Record<string, any>,
  linksSig: string,
  generation: number,
  modeTag: string
): { groups: VisSlabGroup[]; h1Title: string; agenda: { no: string; title: string }[] } | null {
  const groups: VisSlabGroup[] = [];
  const agenda: { no: string; title: string }[] = [];
  let h1Title = '';
  let seenFirstH1 = false;
  let sectionCounter = 0;
  let htmlDepth = 0;

  let curTokens: any[] = [];
  let curStable: string[] = [];
  let curMatch: string[] = [];
  let curLines: number[] = [];
  let curStageNo: number | null = null;
  let curFrontMatter = frontMatterHtml;
  let curStripFirstH1 = false;
  let isFirstGroup = true;

  const flush = () => {
    if (curTokens.length === 0 && !curFrontMatter) return;
    const prefixKey = `st:${curStageNo ?? 0}|h1:${curStripFirstH1 ? 1 : 0}|fm:${curFrontMatter}`;
    groups.push({
      stableKey: `${prefixKey}\n|SLAB|\n${curStable.join('\n|T|\n')}`,
      matchKey: `${prefixKey}\n|SLAB|\n${curMatch.join('\n|T|\n')}`,
      tokens: curTokens,
      headingLines: curLines,
      stageNo: curStageNo,
      frontMatterHtml: curFrontMatter,
      stripFirstH1: curStripFirstH1
    });
    curTokens = [];
    curStable = [];
    curMatch = [];
    curLines = [];
    curStageNo = null;
    curFrontMatter = '';
    curStripFirstH1 = false;
    isFirstGroup = false;
  };

  for (const token of tokensToKeep) {
    if (token.type === 'html' && !token.__mermaid && !token.__isTree && !token.__isFootnotes) {
      // 生 HTML 内に見出しが含まれる場合は DOM 分割とずれうるため全体描画へフォールバック
      if (/<h[12]\b/i.test(token.raw || '')) return null;
      htmlDepth += htmlTagBalance(token.raw || '');
      if (htmlDepth < 0) return null;
    }

    if (htmlDepth === 0 && token.type === 'heading' && token.depth === 2) {
      flush();
      sectionCounter++;
      curStageNo = sectionCounter;
      const numStr = String(sectionCounter).padStart(2, '0');
      const rawTitle = headingTokenText(token, links, linksSig).replace(/^\d+\.\s*/, '');
      agenda.push({ no: numStr, title: rawTitle });
    }

    if (token.type === 'space' && htmlDepth === 0 && curTokens.length === 0 && !curFrontMatter) {
      continue;
    }

    let isStrippedH1 = false;
    if (htmlDepth === 0 && token.type === 'heading' && token.depth === 1 && !seenFirstH1) {
      if (!isFirstGroup || curStageNo !== null) return null;
      seenFirstH1 = true;
      curStripFirstH1 = true;
      isStrippedH1 = true;
      h1Title = headingTokenText(token, links, linksSig);
    }

    curTokens.push(token);
    const fnSig = tokenFootnoteSig(token);
    if (token.type === 'heading' && Number.isInteger(token.srcLine)) {
      if (!isStrippedH1) curLines.push(token.srcLine);
      const part = `h:${token.depth}:${token.raw}${fnSig}`;
      curStable.push(part);
      curMatch.push(part);
    } else if (token.__mermaid) {
      const m = token.__mermaid;
      const cacheKey = `${m.hash}-${modeTag}`;
      const stable = `m:${m.index}:${m.hash}:${m.curve || ''}`;
      curStable.push(stable);
      curMatch.push(svgCache.has(cacheKey) ? stable : `miss:${generation}:${m.index}`);
    } else {
      const part = `${token.type}:${token.raw}${fnSig}`;
      curStable.push(part);
      curMatch.push(part);
    }
  }

  if (htmlDepth !== 0) return null;
  flush();
  return { groups, h1Title, agenda };
}

function renderVisualSlabElement(
  group: VisSlabGroup,
  links: Record<string, any>,
  mermaidBlocks: any[],
  dirtyBlocks: any[],
  cachedKeys: Map<number, string>,
  modeTag: string,
  visContainer: HTMLElement
): HTMLElement | null {
  const slice: any = [...group.tokens];
  slice.links = links;
  const rawHtml = (group.frontMatterHtml || '') + marked.parser(slice);
  const cleanHtml = sanitizeMarkdownHtml(rawHtml);
  const slabHtml = buildSingleVisualSlabHtml(cleanHtml, group.stageNo, group.stripFirstH1);
  if (!slabHtml) return null;

  const holder = document.createElement('div');
  holder.innerHTML = slabHtml;
  const slabEl = holder.firstElementChild as HTMLElement | null;
  if (!slabEl) return null;

  postProcessDetachedFragment(slabEl, {
    isVisual: true,
    modeTag,
    mermaidBlocks,
    dirtyBlocks,
    cachedKeys,
    syncMathEmoji: false,
    bindInteractions: bindViewportInteractions,
    rootContainer: visContainer
  });
  return slabEl;
}

function updateVisualSlabHeadingLines(entry: VisSlabEntry, nextLines: number[]) {
  if (!entry.el) {
    entry.headingLines = nextLines;
    return;
  }
  if (entry.headingLines.length === nextLines.length && entry.headingLines.every((v, i) => v === nextLines[i])) return;
  const els = entry.headingEls;
  const len = Math.min(els.length, nextLines.length);
  for (let k = 0; k < len; k++) {
    els[k].dataset.srcLine = String(nextLines[k]);
  }
  entry.headingLines = nextLines;
}

function htmlToSingleElement(html: string): HTMLElement | null {
  if (!html) return null;
  const holder = document.createElement('div');
  holder.innerHTML = html.trim();
  return holder.firstElementChild as HTMLElement | null;
}

export function renderApp() {
  const t0 = performance.now();
  const rawMarkdown = (document.getElementById('markdown-editor') as HTMLTextAreaElement).value;
  if (!runtime.isInputRender) runtime.caretState.dirty = true;
  runtime.isInputRender = false;
  // フロントマターは Marked に渡さない。渡すと先頭の --- が水平線、YAML が段落になる（DD-FM-001）
  const { yaml, body } = splitFrontMatter(rawMarkdown);
  noteRawHtmlBlocks(body);
  const { mermaidBlocks, tokensToKeep, links, hasFootnotes } = parseMarkdownAndMermaidSlots(rawMarkdown, body);

  const frontMatterHtml = yaml !== null && state.showFrontMatter ? buildFrontMatterHtml(yaml) : '';
  const stdContainer = document.getElementById('standard-doc-container');
  const visContainer = document.getElementById('visual-stage-container');
  const stdWrapper = document.getElementById('standard-doc-wrapper');
  const isVisual = state.isVisualMode;
  const generation = ++runtime.renderGeneration;
  const isEmpty = rawMarkdown.trim() === '';

  const dirtyBlocks: any[] = [];
  const cachedKeys = new Map<number, string>();
  const activeContainer = isVisual ? visContainer : stdContainer;
  const modeTag = isVisual ? `vis-${state.infographicStyle}` : 'std';

  // 高速モードの差分ブロック再描画（#235, DD-DIAG-083）
  let usedIncremental = false;
  let visualPatchedScopes: HTMLElement[] | null = null;

  if (!isVisual && !isEmpty) {
    runtime.prevVisCache = null;
    runtime.visPendingGeneration = 0;
    if (window.LucivoStage) LucivoStage.resetLights();
    const groups = buildStdBlockGroups(tokensToKeep, frontMatterHtml, generation);
    if (groups) {
      const envKey = `${state.appearance}|${state.palette}|${state.tone}|${state.infographicStyle}|${runtime.openedFolder ? 'f' : ''}`;
      const linksSig = JSON.stringify(links);
      const prevStdCache = runtime.prevStdCache;
      const canPatch = Boolean(
        prevStdCache
        && runtime.stdPendingGeneration === 0
        && prevStdCache.envKey === envKey
        && prevStdCache.linksSig === linksSig
        && prevStdCache.mermaidCount === mermaidBlocks.length
        && prevStdCache.blocks.every(b => b.nodes.every(n => n.parentNode === stdContainer))
      );

      visContainer.classList.add('hidden');
      visContainer.innerHTML = '';
      stdWrapper.classList.remove('hidden');

      if (canPatch && prevStdCache) {
        const prev = prevStdCache.blocks;
        let prefix = 0;
        const minLen = Math.min(prev.length, groups.length);
        while (prefix < minLen && prev[prefix].key === groups[prefix].matchKey) prefix++;
        let suffix = 0;
        while (
          suffix < minLen - prefix
          && prev[prev.length - 1 - suffix].key === groups[groups.length - 1 - suffix].matchKey
        ) {
          suffix++;
        }

        const removedStart = prefix;
        const removedEnd = prev.length - suffix;
        const addedStart = prefix;
        const addedEnd = groups.length - suffix;

        // 差し替え位置の基準ノード（後続未変更グループの先頭ノード）を先に求める
        let anchorNode: ChildNode | null = null;
        for (let i = removedEnd; i < prev.length && !anchorNode; i++) {
          if (prev[i].nodes.length > 0) anchorNode = prev[i].nodes[0];
        }

        // 変更区間の旧ノードを除去
        for (let i = removedStart; i < removedEnd; i++) {
          prev[i].nodes.forEach(n => n.remove());
        }

        // 変更区間のみ HTML 化・サニタイズ・後処理を行って挿入
        const addedEntries: StdBlockEntry[] = [];
        const insertedElements: HTMLElement[] = [];
        if (addedStart < addedEnd) {
          const sliceGroups = groups.slice(addedStart, addedEnd);
          const sepAttr = `b${generation}`;
          const sliceRaw = renderGroupSliceHtml(sliceGroups, links, sepAttr);
          const sliceClean = sanitizeMarkdownHtml(sliceRaw);
          const tmp = document.createElement('div');
          tmp.innerHTML = sliceClean;
          postProcessDetachedFragment(tmp, {
            isVisual: false,
            modeTag: 'std',
            mermaidBlocks,
            dirtyBlocks,
            cachedKeys,
            syncMathEmoji: true,
            bindInteractions: bindViewportInteractions,
            rootContainer: stdContainer
          });
          const buckets = splitContainerNodesBySep(tmp, sliceGroups.length, sepAttr);
          const frag = document.createDocumentFragment();
          sliceGroups.forEach((g, idx) => {
            const nodes = buckets[idx];
            nodes.forEach(n => {
              frag.appendChild(n);
              if (n.nodeType === 1) insertedElements.push(n as HTMLElement);
            });
            addedEntries.push({
              key: g.stableKey,
              nodes,
              headingLines: g.headingLines,
              headingEls: collectNodesHeadings(nodes)
            });
          });
          stdContainer.insertBefore(frag, anchorNode);
        }

        // 未変更グループ（prefix / suffix）の見出し行番号だけを更新し、キャッシュ配列を再構築
        const nextBlocks: StdBlockEntry[] = [];
        for (let i = 0; i < prefix; i++) {
          updateGroupHeadingLines(prev[i], groups[i].headingLines);
          nextBlocks.push(prev[i]);
        }
        nextBlocks.push(...addedEntries);
        for (let i = 0; i < suffix; i++) {
          const entry = prev[removedEnd + i];
          updateGroupHeadingLines(entry, groups[addedEnd + i].headingLines);
          nextBlocks.push(entry);
        }
        runtime.prevStdCache = { envKey, linksSig, mermaidCount: mermaidBlocks.length, blocks: nextBlocks };
        stdContainer.classList.toggle('has-content-visibility', stdContainer.children.length >= 200);
        // 接続後の解決系は変更区間の要素とキャッシュ済み図に対してのみ実行し、全文 DOM 走査を避ける（#329）
        for (const el of insertedElements) {
          resolveFolderImages(el);
          if (!window.katex) renderMath(el);
          if (!window.LucivoEmoji) renderEmoji(el);
        }
        cachedKeys.forEach((cacheKey, idx) => {
          applyReadableFit(stdContainer.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
        });
        usedIncremental = true;
      } else {
        // 初回または全体フォールバック時もセパレータ付き 1 回 sanitize でグループ境界を記録する
        const sepAttr = `b${generation}`;
        const rawHtml = renderGroupSliceHtml(groups, links, sepAttr);
        const cleanHtml = sanitizeMarkdownHtml(rawHtml);
        stdContainer.innerHTML = cleanHtml;
        postProcessDetachedFragment(stdContainer, {
          isVisual: false,
          modeTag: 'std',
          mermaidBlocks,
          dirtyBlocks,
          cachedKeys,
          syncMathEmoji: true
        });
        const buckets = splitContainerNodesBySep(stdContainer, groups.length, sepAttr);
        runtime.prevStdCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          blocks: groups.map((g, idx) => ({
            key: g.stableKey,
            nodes: buckets[idx],
            headingLines: g.headingLines,
            headingEls: collectNodesHeadings(buckets[idx])
          }))
        };
        stdContainer.classList.toggle('has-content-visibility', stdContainer.children.length >= 200);
        postProcessConnectedScope(stdContainer, { cachedKeys, fitRoot: stdContainer });
        bindViewportInteractions(stdContainer);
        usedIncremental = true;
      }
    }
  }

  // Visualモードの章（スラブ）単位の差分組み直しと content-visibility（#251, #329）
  if (isVisual && !isEmpty) {
    runtime.prevStdCache = null;
    runtime.stdPendingGeneration = 0;
    const linksSig = JSON.stringify(links);
    const visPlan = buildVisSlabGroups(tokensToKeep, frontMatterHtml, links, linksSig, generation, modeTag);
    if (visPlan) {
      const { groups, h1Title, agenda } = visPlan;
      const envKey = `${state.appearance}|${state.palette}|${state.tone}|${state.infographicStyle}|${state.ambientEffectsEnabled ? 1 : 0}|${state.showFrontMatter ? 1 : 0}|${runtime.openedFolder ? 'f' : ''}|${runtime.currentFileName}`;
      const { heroHtml, endCardHtml } = buildVisualHeroAndEndCard(h1Title, yaml, agenda, mermaidBlocks.length);
      const heroKey = heroHtml;
      const heroStructKey = `${h1Title}\0${yaml || ''}\0${agenda.length}\0${mermaidBlocks.length}`;
      const endCardKey = endCardHtml;
      const prevVisCache = runtime.prevVisCache;
      const canPatchVis = Boolean(
        prevVisCache
        && runtime.visPendingGeneration === 0
        && prevVisCache.envKey === envKey
        && prevVisCache.linksSig === linksSig
        && prevVisCache.mermaidCount === mermaidBlocks.length
        && prevVisCache.wrap.parentNode === visContainer
        && (!prevVisCache.heroEl || prevVisCache.heroEl.parentNode === prevVisCache.wrap)
        && (!prevVisCache.endCardEl || prevVisCache.endCardEl.parentNode === prevVisCache.wrap)
        && prevVisCache.slabs.every(s => !s.el || s.el.parentNode === prevVisCache.wrap)
      );

      stdWrapper.classList.add('hidden');
      stdContainer.innerHTML = '';
      visContainer.classList.remove('hidden');

      if (canPatchVis && prevVisCache) {
        const wrap = prevVisCache.wrap;
        const prev = prevVisCache.slabs;
        let heroEl = prevVisCache.heroEl;
        let endCardEl = prevVisCache.endCardEl;

        // 1. 表紙（hero）の差分更新（H2 見出し文字列だけが変わった場合は目次項目のみその場で更新して表紙要素を保つ #329）
        if (prevVisCache.heroKey !== heroKey) {
          let updatedInPlace = false;
          if (heroEl && heroHtml && prevVisCache.heroStructKey === heroStructKey) {
            const titleEls = heroEl.querySelectorAll('.vs-cover-agenda-item .vs-cover-agenda-title');
            if (titleEls.length === agenda.length) {
              for (let k = 0; k < agenda.length; k++) {
                if (titleEls[k].textContent !== agenda[k].title) {
                  titleEls[k].textContent = agenda[k].title;
                }
              }
              updatedInPlace = true;
            }
          }
          if (!updatedInPlace) {
            const nextHero = htmlToSingleElement(heroHtml);
            if (heroEl && nextHero) {
              heroEl.replaceWith(nextHero);
            } else if (heroEl && !nextHero) {
              heroEl.remove();
            } else if (!heroEl && nextHero) {
              wrap.insertBefore(nextHero, wrap.firstChild);
            }
            heroEl = nextHero;
          }
        }

        // 2. スラブ列の prefix / suffix マッチング
        let prefix = 0;
        const minLen = Math.min(prev.length, groups.length);
        while (prefix < minLen && prev[prefix].key === groups[prefix].matchKey) prefix++;
        let suffix = 0;
        while (
          suffix < minLen - prefix
          && prev[prev.length - 1 - suffix].key === groups[groups.length - 1 - suffix].matchKey
        ) {
          suffix++;
        }

        const removedStart = prefix;
        const removedEnd = prev.length - suffix;
        const addedStart = prefix;
        const addedEnd = groups.length - suffix;

        // 差し替え位置の基準ノード（後続未変更スラブ、なければエンドカード）
        let anchorNode: ChildNode | null = null;
        for (let i = removedEnd; i < prev.length && !anchorNode; i++) {
          if (prev[i].el) anchorNode = prev[i].el;
        }
        if (!anchorNode && endCardEl) anchorNode = endCardEl;

        // 変更区間の旧スラブのみライト解除＆DOM 除去
        for (let i = removedStart; i < removedEnd; i++) {
          const oldEl = prev[i].el;
          if (oldEl) {
            if (window.LucivoStage && typeof LucivoStage.unmountLights === 'function') {
              LucivoStage.unmountLights(oldEl);
            }
            oldEl.remove();
          }
        }

        // 変更区間のスラブのみ組み立てて挿入
        const addedEntries: VisSlabEntry[] = [];
        const insertedEls: HTMLElement[] = [];
        if (addedStart < addedEnd) {
          const frag = document.createDocumentFragment();
          for (let i = addedStart; i < addedEnd; i++) {
            const g = groups[i];
            const el = renderVisualSlabElement(g, links, mermaidBlocks, dirtyBlocks, cachedKeys, modeTag, visContainer);
            if (el) {
              frag.appendChild(el);
              insertedEls.push(el);
            }
            addedEntries.push({
              key: g.stableKey,
              el,
              headingLines: g.headingLines,
              headingEls: collectSlabHeadings(el)
            });
          }
          wrap.insertBefore(frag, anchorNode);
        }

        // 3. エンドカードの差分更新
        if (prevVisCache.endCardKey !== endCardKey) {
          const nextEnd = htmlToSingleElement(endCardHtml);
          if (endCardEl && nextEnd) {
            endCardEl.replaceWith(nextEnd);
          } else if (endCardEl && !nextEnd) {
            endCardEl.remove();
          } else if (!endCardEl && nextEnd) {
            wrap.appendChild(nextEnd);
          }
          endCardEl = nextEnd;
        }

        // 4. 未変更スラブの行番号更新とキャッシュ再構築
        const nextSlabs: VisSlabEntry[] = [];
        for (let i = 0; i < prefix; i++) {
          updateVisualSlabHeadingLines(prev[i], groups[i].headingLines);
          nextSlabs.push(prev[i]);
        }
        nextSlabs.push(...addedEntries);
        for (let i = 0; i < suffix; i++) {
          const entry = prev[removedEnd + i];
          updateVisualSlabHeadingLines(entry, groups[addedEnd + i].headingLines);
          nextSlabs.push(entry);
        }

        runtime.prevVisCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          wrap,
          heroKey,
          heroStructKey,
          heroEl,
          endCardKey,
          endCardEl,
          slabs: nextSlabs
        };

        wrap.classList.toggle('has-content-visibility', nextSlabs.length >= 20);
        // 接続後に解決系（ローカル画像・数式・絵文字・Fit）を追加スラブに対してのみ実行
        const emptyKeys = new Map<number, string>();
        insertedEls.forEach(el => {
          postProcessConnectedScope(el, { cachedKeys: emptyKeys, fitRoot: visContainer, forceMathEmoji: true });
        });
        cachedKeys.forEach((cacheKey, idx) => {
          applyReadableFit(visContainer.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
        });
        visualPatchedScopes = insertedEls;
        usedIncremental = true;
      } else {
        // Visual 初回または環境変更時: スラブ単位で組み上げてキャッシュを構築
        if (window.LucivoStage) LucivoStage.resetLights();
        const ambientClass = state.ambientEffectsEnabled ? ' has-ambient-effects' : '';
        const wrap = document.createElement('div');
        wrap.className = `exhibition-wrap vs-theme-${state.infographicStyle}${ambientClass}`;

        const heroEl = htmlToSingleElement(heroHtml);
        if (heroEl) wrap.appendChild(heroEl);

        const slabEntries: VisSlabEntry[] = [];
        groups.forEach(g => {
          const el = renderVisualSlabElement(g, links, mermaidBlocks, dirtyBlocks, cachedKeys, modeTag, visContainer);
          if (el) wrap.appendChild(el);
          slabEntries.push({
            key: g.stableKey,
            el,
            headingLines: g.headingLines,
            headingEls: collectSlabHeadings(el)
          });
        });

        const endCardEl = htmlToSingleElement(endCardHtml);
        if (endCardEl) wrap.appendChild(endCardEl);

        visContainer.innerHTML = '';
        visContainer.appendChild(wrap);
        applyToneToVisualStage(visContainer);
        wrap.classList.toggle('has-content-visibility', slabEntries.length >= 20);

        runtime.prevVisCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          wrap,
          heroKey,
          heroStructKey,
          heroEl,
          endCardKey,
          endCardEl,
          slabs: slabEntries
        };

        postProcessConnectedScope(visContainer, { cachedKeys, fitRoot: visContainer, forceMathEmoji: true });
        usedIncremental = true;
      }
    }
  }

  if (!usedIncremental) {
    runtime.prevStdCache = null;
    runtime.prevVisCache = null;
    if (window.LucivoStage) LucivoStage.resetLights();
    const rawHtml = frontMatterHtml + marked.parser(tokensToKeep);
    const cleanHtml = sanitizeMarkdownHtml(rawHtml);

    if (isVisual) {
      stdWrapper.classList.add('hidden');
      stdContainer.innerHTML = '';
      visContainer.classList.remove('hidden');
      visContainer.innerHTML = isEmpty
        ? `<div class="exhibition-wrap"><section class="exhibition-slab">${getEmptyGuideHtml()}</section></div>`
        : buildVisualStageHtml(cleanHtml, yaml);
      applyToneToVisualStage(visContainer);
      const wrap = visContainer.querySelector('.exhibition-wrap');
      if (wrap) {
        wrap.classList.toggle('has-content-visibility', !isEmpty && wrap.querySelectorAll(':scope > .exhibition-slab').length >= 20);
      }
    } else {
      visContainer.classList.add('hidden');
      visContainer.innerHTML = '';
      stdWrapper.classList.remove('hidden');
      stdContainer.innerHTML = isEmpty ? getEmptyGuideHtml() : cleanHtml;
      // 長い文書（200 ブロック以上）のみ画面外ブロックのレイアウト・描画を省く（#238）
      stdContainer.classList.toggle('has-content-visibility', !isEmpty && stdContainer.children.length >= 200);
    }

    if (isEmpty) applyUpdateCheckState(activeContainer);
    postProcessDetachedFragment(activeContainer, {
      isVisual,
      modeTag,
      mermaidBlocks,
      dirtyBlocks,
      cachedKeys,
      syncMathEmoji: false,
      bindInteractions: bindViewportInteractions
    });
    postProcessConnectedScope(activeContainer, { cachedKeys, fitRoot: activeContainer, forceMathEmoji: true });
  }

  if (usedIncremental) {
    const entries = isVisual ? runtime.prevVisCache?.slabs : runtime.prevStdCache?.blocks;
    rebuildFollowIndexFromEntries(entries || []);
  } else {
    rebuildFollowIndex(activeContainer);
  }
  if (visualPatchedScopes !== null) {
    visualPatchedScopes.forEach(scope => mountStage(scope));
  } else {
    mountStage(activeContainer);
  }
  if (document.activeElement && document.activeElement.id === 'markdown-editor') scheduleFollow();

  if (dirtyBlocks.length > 0) {
    runtime.stdPendingGeneration = isVisual ? 0 : generation;
    runtime.visPendingGeneration = isVisual ? generation : 0;
    processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
  } else {
    runtime.stdPendingGeneration = 0;
    runtime.visPendingGeneration = 0;
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
  runtime.lastRenderMs = performance.now() - t0;
}

// Visualモードの図に舞台演出を取り付ける。読み込みを待つ間に DOM が作り直された場合は何もしない
export function mountStage(container) {
  if (!state.isVisualMode) return;
  loadLibrary('stage').then(ok => {
    if (ok && state.isVisualMode && container.isConnected) {
      if (typeof LucivoStage.toggleLights === 'function') LucivoStage.toggleLights(state.signalLightsEnabled);
      LucivoStage.mount(container);
    }
  });
}

// 長いタスクを分割してブラウザへ制御を返し、入力・スクロールの応答性を保つ（#236）
function yieldToMain(): Promise<void> {
  const sched = (window as any).scheduler;
  if (sched && typeof sched.yield === 'function') {
    return sched.yield();
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

// 残りの未描画ブロックから、現在の表示領域に最も近い 1 件の配列インデックスを返す（可視領域内を最優先）
function pickNextDirtyBlockIndex(remaining: any[], container: HTMLElement, scroller: HTMLElement | null) {
  if (remaining.length <= 1 || !scroller) return 0;
  const vp = scroller.getBoundingClientRect();
  const vpTop = Math.max(vp.top, 0);
  const vpBottom = Math.min(vp.bottom, window.innerHeight || vp.bottom);
  if (vpBottom <= vpTop) return 0;
  const vpCenter = (vpTop + vpBottom) / 2;
  let bestIdx = 0;
  let bestInView = false;
  let bestDist = Infinity;
  for (let i = 0; i < remaining.length; i++) {
    const el = container.querySelector(`[data-stage-index="${remaining[i].index}"]`);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    const inView = rect.bottom >= vpTop && rect.top <= vpBottom;
    const dist = inView ? Math.max(0, rect.top - vpTop) : Math.abs((rect.top + rect.bottom) / 2 - vpCenter);
    if ((inView && !bestInView) || (inView === bestInView && dist < bestDist)) {
      bestIdx = i;
      bestInView = inView;
      bestDist = dist;
    }
  }
  return bestIdx;
}

// target: 描画開始時の表示先コンテナ・描画世代・モード。
// 描画中にモード切替や再描画が起きた場合（世代が変わった場合）は、古い描画結果を捨てる
async function processDirtyBlocks(dirtyBlocks, target) {
  updateStatus(`Rendering ${dirtyBlocks.length} diagrams...`, 'warning');
  const isStale = () => target.generation !== runtime.renderGeneration;

  // Mermaid は、図が初めて現れたときに読み込む
  const mermaidReady = await loadLibrary('mermaid');
  if (isStale()) return;
  if (!mermaidReady) {
    dirtyBlocks.forEach(block => {
      const vp = target.container.querySelector(`[data-stage-index="${block.index}"]`);
      if (vp) vp.innerHTML = '<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">Mermaid を読み込めませんでした（ネットワークの接続を確認してください）</div>';
    });
    if (runtime.stdPendingGeneration === target.generation) runtime.stdPendingGeneration = 0;
    if (runtime.visPendingGeneration === target.generation) runtime.visPendingGeneration = 0;
    updateStatus('• Mermaid Unavailable', 'warning');
    return;
  }

  const scroller = document.getElementById('preview-scroll');
  const remaining = [...dirtyBlocks];

  while (remaining.length > 0) {
    if (isStale()) return;
    const nextIdx = pickNextDirtyBlockIndex(remaining, target.container, scroller);
    const [block] = remaining.splice(nextIdx, 1);
    const renderId = `mermaid-render-${block.index}-${Date.now()}`;
    const lkgKey = `${block.index}-${block.modeTag}`;
    const stageViewport = target.container.querySelector(`[data-stage-index="${block.index}"]`);
    try {
      let finalSvg = svgCache.get(block.cacheKey);
      if (!finalSvg) {
        setupMermaid(target.isVisual, block.curve || 'smooth', getMermaidLayout(block.code, block.curve), block.code);
        const { svg } = await mermaid.render(renderId, prepareMermaidSource(block.code));
        if (isStale()) return;
        finalSvg = postProcessSvg(svg, target.isVisual);
        svgCache.set(block.cacheKey, finalSvg);
      }
      lkgCache.set(lkgKey, finalSvg);

      if (stageViewport) {
        stageViewport.innerHTML = finalSvg;
        applyReadableFit(stageViewport.querySelector(':scope > svg'), block.cacheKey);
        mountStage(stageViewport);
        if (target.isVisual) linkSplitTerms(stageViewport.closest('.exhibition-slab-split'));
      }
    } catch (err) {
      // Mermaid が描画のために body に置いた一時的な要素が残っていれば消す（DD-DIAG-064）
      document.getElementById(`d${renderId}`)?.remove();
      console.error(`Mermaid render failed for block ${block.index}:`, err);
      if (isStale()) return;
      const fallback = lkgCache.get(lkgKey);
      if (stageViewport) {
        if (fallback) {
          stageViewport.innerHTML = fallback;
          applyReadableFit(stageViewport.querySelector(':scope > svg'));
          mountStage(stageViewport);
          if (target.isVisual) linkSplitTerms(stageViewport.closest('.exhibition-slab-split'));
          showToast('構文エラーのため直前の正常状態を表示');
        } else {
          stageViewport.innerHTML = `<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">構文エラー: 正しいMermaid記法を入力してください</div>`;
        }
      }
    }
    if (remaining.length > 0) {
      await yieldToMain();
      if (isStale()) return;
    }
  }

  if (runtime.stdPendingGeneration === target.generation) runtime.stdPendingGeneration = 0;
  if (runtime.visPendingGeneration === target.generation) runtime.visPendingGeneration = 0;
  updateStatus(`• All Diagrams Verified`, 'success');
}

/* ==========================================================================
   ビューポート操作イベント
   ========================================================================== */
export function downloadDiagramPng(svgEl: SVGElement, idx: string) {
  const svgData = new XMLSerializer().serializeToString(svgEl);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const URLObj = window.URL || window.webkitURL || window;
  const blobURL = URLObj.createObjectURL(svgBlob);
  const image = new Image();

  image.onload = () => {
    const canvas = document.createElement('canvas');
    const scale = 2;
    const bbox = svgEl.getBoundingClientRect();
    canvas.width = (bbox.width || 800) * scale;
    canvas.height = (bbox.height || 600) * scale;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = state.appearance === 'dark' ? getDiagramSpec(state.isVisualMode).canvasBg : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(blob => {
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `diagram-0${parseInt(idx, 10) + 1}.png`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      showToast(`Diagram 0${parseInt(idx, 10) + 1} PNG (高解像度) をダウンロード`);
    });
    URLObj.revokeObjectURL(blobURL);
  };
  image.src = blobURL;
}

// scope: 新規にバインドする範囲、rootContainer: 表示中の全体コンテナ
export function bindViewportInteractions(scope, rootContainer = scope) {
  bindDiagramPanZoom(scope);
  // 矢印の形状を選ぶと、その図だけキャッシュのキーが変わり、描き直される（DD-EDGE-011）
  scope.querySelectorAll('.edge-curve-btn').forEach(btn => {
    btn.onclick = () => {
      state.curveByIndex.set(parseInt(btn.getAttribute('data-index'), 10), btn.getAttribute('data-curve'));
      renderApp();
    };
  });

  scope.querySelectorAll('.scale-btn').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const action = btn.getAttribute('data-action');
      const vp = rootContainer.querySelector(`[data-stage-index="${idx}"]`);
      const frame = btn.closest(`#diagram-frame-${idx}`);
      if (!vp || !frame) return;

      // Ctrl + ホイールで変えた倍率（DD-DIAG-071）は、倍率を選んだら解除する
      clearDiagramZoom(vp);
      setScaleMode(vp, frame.querySelector('.scale-picker'), action as ScaleAction);
      updateSlabSplit(vp.closest('.exhibition-slab-split'));
      updatePannable(vp);
    };
  });

  scope.querySelectorAll('[data-action="svg"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = rootContainer.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (!svgEl) return;
      downloadBlob(svgEl.outerHTML, `diagram-0${parseInt(idx, 10) + 1}.svg`, 'image/svg+xml');
      showToast(`Diagram 0${parseInt(idx, 10) + 1} SVGをダウンロード`);
    };
  });

  scope.querySelectorAll('[data-action="png"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = rootContainer.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (svgEl) downloadDiagramPng(svgEl, idx);
    };
  });

  scope.querySelectorAll('[data-action="zoom"]').forEach(btn => {
    btn.onclick = () => {
      const idx = btn.getAttribute('data-index');
      const vp = rootContainer.querySelector(`[data-stage-index="${idx}"]`);
      const svgEl = vp && vp.querySelector('svg');
      if (!svgEl) return;

      const zoomCanvas = document.getElementById('zoom-canvas');
      zoomCanvas.innerHTML = svgEl.outerHTML;
      // Expand の画面も、図のカードと同じ倍率の部品で切り替える。開いたときは Fit（DD-DIAG-045）
      const zoomSvg = zoomCanvas.querySelector('svg');
      const viewBox = zoomSvg && (zoomSvg as SVGSVGElement).viewBox && (zoomSvg as SVGSVGElement).viewBox.baseVal;
      if (viewBox && viewBox.width && viewBox.height) {
        zoomSvg.style.setProperty('--fit-aspect', (viewBox.width / viewBox.height).toFixed(4));
        zoomSvg.style.setProperty('--natural-width', `${Math.ceil(viewBox.width)}px`);
      }
      setScaleMode(zoomCanvas, document.getElementById('zoom-scale-picker'), 'scale-fit');
      setModalOpen('zoom-modal', true);
      const zoomViewport = document.getElementById('zoom-viewport');
      zoomViewport.scrollTop = 0;
      zoomViewport.scrollLeft = 0;
      if (state.isVisualMode && window.LucivoStage) LucivoStage.mountLights(zoomCanvas);
    };
  });
}
