// @ts-nocheck
import { escapeHtml } from './utils/escape';
import { hexToRgba, mixHex, pickContrastInk } from './utils/color';
import { fnv1aHash } from './utils/hash';
import { downloadBlob } from './utils/download';
import { decodeMarkdown, normalizeText, isUtf8Family } from './utils/text-decode';
import { showToast, updateStatus } from './ui/toast';
import { setupUpdateCheck, applyUpdateCheckState, checkForUpdate, isWebVersion } from './ui/update-check';
import { parseDisplayStateParams, syncBrowserUrl } from './ui/url-loader';
import { registerEscapeHandler, registerShortcutAction, setupGlobalKeymap } from './ui/keymap';
import { treeTokenFor } from './markdown/tree';
import { MATH_PLOT_BOX, getTexPlotSpec, getCachedMathPlotDataUrl, clearMathPlotCache } from './math/plot';
import { ALERT_LABELS, decorateAlerts } from './markdown/callouts';
import { splitFrontMatter, highlightYamlLine, buildFrontMatterHtml } from './markdown/front-matter';
import { scopeSvgIds } from './diagram/scope';
import { setupDiagramPanZoom, bindDiagramPanZoom, findScrollParent, clearDiagramZoom, updatePannable, zoomDiagram } from './diagram/pan-zoom';
import { scalePickerHtml, setScaleMode, bindScaleMenus, type ScaleAction } from './diagram/scale-mode';
import {
  resolveModal,
  isModalOpen,
  setModalOpen,
  VISUAL_STYLE_KEYS,
  COLOR_TONES,
  VISUAL_LAYOUTS,
  getToneEntry,
  getEffectiveVisualPalette,
  EMPTY_GUIDE_HTML,
  EXPORT_URLS,
  state,
  svgCache,
  lkgCache,
  fitCache,
  mathCache,
  loadLibrary,
  runtime
} from './ui/state';
import {
  getThemeSpec,
  getDiagramSpec,
  syncCssTokens,
  getBlockCurve,
  getMermaidLayout,
  prepareMermaidSource,
  setupMermaid
} from './diagram/mermaid-config';
import {
  setupMarkedMath,
  setupMarkedHeadings,
  renderMath
} from './markdown/math-and-headings';
import { setupMarkedBlocks, noteRawHtmlBlocks } from './markdown/block-renderers';
import {
  applyReadableFit,
  ensureSlabVisibilityTracking,
  updateSlabSplit,
  updateAllSlabSplits,
  postProcessSvg,
  createDiagramCard
} from './diagram/svg-postprocess';
import {
  clearVisualStageSpotlight,
  setupVisualStageInteractions
} from './ui/slab-export';
import {
  linkSplitTerms,
  setupSplitTermLinks
} from './ui/split-term-links';
import { ensureStyleFont } from './ui/style-fonts';
import {
  decorateCodeBlocks,
  buildSingleVisualSlabHtml,
  buildVisualHeroAndEndCard,
  buildVisualStageHtml
} from './ui/visual-stage';
import {
  setupLocalImages,
  resolveFolderImages,
  wrapTables
} from './markdown/local-images';
import { setupMarkedFootnotes, resetFootnotes, applyFootnotes } from './markdown/footnotes';
import { setupMarkedEmoji, renderEmoji } from './markdown/emoji';
import { parseDocumentModel, type DocumentModel } from './markdown/document-model';
import {
  closeFileMenu,
  setupFormatter,
  saveMarkdownFile,
  setupFileMenu,
  setupFileDrop
} from './ui/file-menu';
import {
  sanitizeMarkdownHtml,
  postProcessDetachedFragment,
  postProcessConnectedScope
} from './ui/fragment-renderer';
import { setupFileWatch } from './ui/file-watch';
import {
  setupDocumentLinks,
  setupFolder,
  setupFrontMatterToggle,
  setupAnimationToggle,
  setupAmbientEffectsToggle,
  loadMarkdownFromUrlParam
} from './ui/folder-browser';

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
}

interface StdRenderCache {
  envKey: string;
  linksSig: string;
  mermaidCount: number;
  blocks: StdBlockEntry[];
}

let prevStdCache: StdRenderCache | null = null;
let stdPendingGeneration = 0;

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
}

interface VisRenderCache {
  envKey: string;
  linksSig: string;
  mermaidCount: number;
  wrap: HTMLElement;
  heroKey: string;
  heroEl: HTMLElement | null;
  endCardKey: string;
  endCardEl: HTMLElement | null;
  slabs: VisSlabEntry[];
}

let prevVisCache: VisRenderCache | null = null;
let prevDocModel: DocumentModel | null = null;
let visPendingGeneration = 0;
let lastRenderMs = 30;

function parseMarkdownAndMermaidSlots(rawMarkdown: string, body: string) {
  resetFootnotes();
  const model = parseDocumentModel(rawMarkdown, body, {
    lex: src => marked.lexer(src),
    prevModel: prevDocModel
  });
  prevDocModel = model;

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
    if (token.type === 'heading' && Number.isInteger(token.srcLine)) {
      headingLines.push(token.srcLine);
      const part = `h:${token.depth}:${token.raw}`;
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
      const part = `${token.type}:${token.raw}`;
      stableParts.push(part);
      matchParts.push(part);
    }
    if (token.type === 'html' && !token.__mermaid && !token.__isTree) {
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
  let k = 0;
  for (const node of entry.nodes) {
    if (node.nodeType !== 1) continue;
    const el = node as HTMLElement;
    if (el.hasAttribute('data-src-line')) {
      if (k < nextLines.length) el.dataset.srcLine = String(nextLines[k++]);
    } else {
      el.querySelectorAll('[data-src-line]').forEach(h => {
        if (k < nextLines.length) (h as HTMLElement).dataset.srcLine = String(nextLines[k++]);
      });
    }
  }
  entry.headingLines = nextLines;
}

// 1 見出しトークンから描画後のプレーンテキストを取り出す（buildVisualStageHtml と完全一致させるため）
function headingTokenText(token: any, links: Record<string, any>): string {
  const slice: any = [token];
  slice.links = links;
  const clean = sanitizeMarkdownHtml(marked.parser(slice));
  const tmp = document.createElement('div');
  tmp.innerHTML = clean;
  const heading = tmp.querySelector('h1, h2, h3, h4, h5, h6');
  return (heading || tmp).textContent || '';
}

// Visualモード用に最上位トークン列を章（H2 区切り）単位のスラブグループへ分割する（#251）
function buildVisSlabGroups(
  tokensToKeep: any[],
  frontMatterHtml: string,
  links: Record<string, any>,
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
    if (token.type === 'html' && !token.__mermaid && !token.__isTree) {
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
      const rawTitle = headingTokenText(token, links).replace(/^\d+\.\s*/, '');
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
      h1Title = headingTokenText(token, links);
    }

    curTokens.push(token);
    if (token.type === 'heading' && Number.isInteger(token.srcLine)) {
      if (!isStrippedH1) curLines.push(token.srcLine);
      const part = `h:${token.depth}:${token.raw}`;
      curStable.push(part);
      curMatch.push(part);
    } else if (token.__mermaid) {
      const m = token.__mermaid;
      const cacheKey = `${m.hash}-${modeTag}`;
      const stable = `m:${m.index}:${m.hash}:${m.curve || ''}`;
      curStable.push(stable);
      curMatch.push(svgCache.has(cacheKey) ? stable : `miss:${generation}:${m.index}`);
    } else {
      const part = `${token.type}:${token.raw}`;
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
  let k = 0;
  entry.el.querySelectorAll('[data-src-line]').forEach(h => {
    if (k < nextLines.length) (h as HTMLElement).dataset.srcLine = String(nextLines[k++]);
  });
  entry.headingLines = nextLines;
}

function htmlToSingleElement(html: string): HTMLElement | null {
  if (!html) return null;
  const holder = document.createElement('div');
  holder.innerHTML = html.trim();
  return holder.firstElementChild as HTMLElement | null;
}

function renderApp() {
  const t0 = performance.now();
  const rawMarkdown = (document.getElementById('markdown-editor') as HTMLTextAreaElement).value;
  if (!isInputRender) caretState.dirty = true;
  isInputRender = false;
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

  if (!isVisual && !isEmpty && !hasFootnotes) {
    prevVisCache = null;
    visPendingGeneration = 0;
    if (window.LucivoStage) LucivoStage.resetLights();
    const groups = buildStdBlockGroups(tokensToKeep, frontMatterHtml, generation);
    if (groups) {
      const envKey = `${state.appearance}|${state.palette}|${state.tone}|${state.infographicStyle}|${runtime.openedFolder ? 'f' : ''}`;
      const linksSig = JSON.stringify(links);
      const canPatch = Boolean(
        prevStdCache
        && stdPendingGeneration === 0
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
            buckets[idx].forEach(n => frag.appendChild(n));
            addedEntries.push({ key: g.stableKey, nodes: buckets[idx], headingLines: g.headingLines });
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
        prevStdCache = { envKey, linksSig, mermaidCount: mermaidBlocks.length, blocks: nextBlocks };
        stdContainer.classList.toggle('has-content-visibility', stdContainer.children.length >= 200);
        postProcessConnectedScope(stdContainer, { cachedKeys, fitRoot: stdContainer });
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
        prevStdCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          blocks: groups.map((g, idx) => ({ key: g.stableKey, nodes: buckets[idx], headingLines: g.headingLines }))
        };
        stdContainer.classList.toggle('has-content-visibility', stdContainer.children.length >= 200);
        postProcessConnectedScope(stdContainer, { cachedKeys, fitRoot: stdContainer });
        bindViewportInteractions(stdContainer);
        usedIncremental = true;
      }
    }
  }

  // Visualモードの章（スラブ）単位の差分組み直しと content-visibility（#251）
  if (isVisual && !isEmpty && !hasFootnotes) {
    prevStdCache = null;
    stdPendingGeneration = 0;
    const visPlan = buildVisSlabGroups(tokensToKeep, frontMatterHtml, links, generation, modeTag);
    if (visPlan) {
      const { groups, h1Title, agenda } = visPlan;
      const envKey = `${state.appearance}|${state.palette}|${state.tone}|${state.infographicStyle}|${state.ambientEffectsEnabled ? 1 : 0}|${state.showFrontMatter ? 1 : 0}|${runtime.openedFolder ? 'f' : ''}|${runtime.currentFileName}`;
      const linksSig = JSON.stringify(links);
      const { heroHtml, endCardHtml } = buildVisualHeroAndEndCard(h1Title, yaml, agenda, mermaidBlocks.length);
      const heroKey = heroHtml;
      const endCardKey = endCardHtml;
      const canPatchVis = Boolean(
        prevVisCache
        && visPendingGeneration === 0
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

        // 1. 表紙（hero）の差分更新
        if (prevVisCache.heroKey !== heroKey) {
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
            addedEntries.push({ key: g.stableKey, el, headingLines: g.headingLines });
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

        prevVisCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          wrap,
          heroKey,
          heroEl,
          endCardKey,
          endCardEl,
          slabs: nextSlabs
        };

        wrap.classList.toggle('has-content-visibility', wrap.querySelectorAll(':scope > .exhibition-slab').length >= 20);
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
          slabEntries.push({ key: g.stableKey, el, headingLines: g.headingLines });
        });

        const endCardEl = htmlToSingleElement(endCardHtml);
        if (endCardEl) wrap.appendChild(endCardEl);

        visContainer.innerHTML = '';
        visContainer.appendChild(wrap);
        applyToneToVisualStage(visContainer);
        wrap.classList.toggle('has-content-visibility', wrap.querySelectorAll(':scope > .exhibition-slab').length >= 20);

        prevVisCache = {
          envKey,
          linksSig,
          mermaidCount: mermaidBlocks.length,
          wrap,
          heroKey,
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
    prevStdCache = null;
    prevVisCache = null;
    if (window.LucivoStage) LucivoStage.resetLights();
    const rawHtml = frontMatterHtml + marked.parser(tokensToKeep);
    const cleanHtml = sanitizeMarkdownHtml(rawHtml);

    if (isVisual) {
      stdWrapper.classList.add('hidden');
      stdContainer.innerHTML = '';
      visContainer.classList.remove('hidden');
      visContainer.innerHTML = isEmpty
        ? `<div class="exhibition-wrap"><section class="exhibition-slab">${EMPTY_GUIDE_HTML}</section></div>`
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
      stdContainer.innerHTML = isEmpty ? EMPTY_GUIDE_HTML : cleanHtml;
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

  rebuildFollowIndex(activeContainer);
  if (visualPatchedScopes !== null) {
    visualPatchedScopes.forEach(scope => mountStage(scope));
  } else {
    mountStage(activeContainer);
  }
  if (document.activeElement && document.activeElement.id === 'markdown-editor') scheduleFollow();

  if (dirtyBlocks.length > 0) {
    stdPendingGeneration = isVisual ? 0 : generation;
    visPendingGeneration = isVisual ? generation : 0;
    processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
  } else {
    stdPendingGeneration = 0;
    visPendingGeneration = 0;
    updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, 'success');
  }
  lastRenderMs = performance.now() - t0;
}

// Visualモードの図に舞台演出を取り付ける。読み込みを待つ間に DOM が作り直された場合は何もしない
function mountStage(container) {
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
    if (stdPendingGeneration === target.generation) stdPendingGeneration = 0;
    if (visPendingGeneration === target.generation) visPendingGeneration = 0;
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

  if (stdPendingGeneration === target.generation) stdPendingGeneration = 0;
  if (visPendingGeneration === target.generation) visPendingGeneration = 0;
  updateStatus(`• All Diagrams Verified`, 'success');
}

/* ==========================================================================
   ビューポート操作イベント
   ========================================================================== */
function downloadDiagramPng(svgEl: SVGElement, idx: string) {
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
function bindViewportInteractions(scope, rootContainer = scope) {
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

/* ==========================================================================
   モード切替とスタイル切替（共通関数）
   ========================================================================== */
// モードの切替ボタンの選択状態と、スタイルバーの表示を揃える。
// スタイルバーは Visualモードの配色・装飾にしか効かないため、Visualモードのときだけ表示する（DD-DIAG-063）
function syncStageModeUi(isVisual) {
  document.getElementById('btn-mode-fast')?.classList.toggle('is-active', !isVisual);
  document.getElementById('btn-visual-mode')?.classList.toggle('is-active', isVisual);
  document.getElementById('style-bar')?.classList.toggle('is-hidden', !isVisual);
  if (!isVisual) {
    setToneMenuOpen(false);
    setLayoutMenuOpen(false);
  }
}

function applyToneToVisualStage(visContainer: Element | null) {
  const containerEl = visContainer as HTMLElement | null;
  const wrap = visContainer?.querySelector('.exhibition-wrap') as HTMLElement | null;
  if (!wrap || !containerEl) return;
  wrap.classList.toggle('is-single-page', state.visualLayout === 'single');
  const palette = getEffectiveVisualPalette(state.infographicStyle, state.appearance);
  // 各アクセント色（c1〜c4）上の文字色を WCAG コントラスト比に基づいて自動設定する（#258, #260）
  palette.slice(0, 4).forEach((hex, idx) => {
    wrap.style.setProperty(`--vs-c${idx + 1}-ink`, pickContrastInk(hex));
  });
  if (state.tone && state.tone !== 'default') {
    const entry = getToneEntry(state.tone);
    const isDark = state.appearance === 'dark';
    const mode = isDark ? entry.dark : entry.light;
    containerEl.style.setProperty('--vs-stage-bg', mode.canvasBg);
    wrap.style.setProperty('--vs-c1', mode.c1);
    wrap.style.setProperty('--vs-c2', mode.c2);
    wrap.style.setProperty('--vs-c3', mode.c3);
    wrap.style.setProperty('--vs-c4', mode.c4);
    wrap.style.setProperty('--vs-glow', mode.glow);
    wrap.style.setProperty('--vs-slab-bg', mode.cardBg);
    wrap.style.setProperty(
      '--vs-card-bg',
      isDark ? mixHex(mode.cardBg, mode.canvasBg, 0.35) : mixHex(mode.cardBg, '#FFFFFF', 0.4)
    );
    wrap.style.setProperty('--vs-card-border', hexToRgba(mode.edge, isDark ? 0.42 : 0.24));
    wrap.style.setProperty('--vs-line', mode.edge);
  } else {
    containerEl.style.removeProperty('--vs-stage-bg');
    [
      '--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-glow',
      '--vs-slab-bg', '--vs-card-bg', '--vs-card-border', '--vs-line'
    ].forEach(v => wrap.style.removeProperty(v));
  }
}

function renderSwatchDotsHtml(colors: string[]) {
  return colors.slice(0, 4).map(c => `<span class="tone-swatch-dot" style="background:${c};"></span>`).join('');
}

function syncToneUi() {
  const entry = getToneEntry(state.tone);
  const labelEl = document.getElementById('active-tone-name');
  if (labelEl) labelEl.textContent = entry.label;
  const swatchEl = document.getElementById('active-tone-swatches');
  if (swatchEl) {
    const colors = getEffectiveVisualPalette(state.infographicStyle, state.appearance);
    swatchEl.innerHTML = renderSwatchDotsHtml(colors);
  }
  document.querySelectorAll('#tone-menu .tone-menu-item').forEach(btn => {
    const active = btn.getAttribute('data-tone-id') === state.tone;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function setToneMenuOpen(open: boolean) {
  const btn = document.getElementById('btn-tone-menu');
  const menu = document.getElementById('tone-menu');
  if (!btn || !menu) return;
  if (open) {
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.left = `${Math.max(8, Math.round(Math.min(rect.left, window.innerWidth - 236)))}px`;
  }
  menu.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function selectTone(toneId: string) {
  state.tone = toneId;
  setToneMenuOpen(false);
  syncToneUi();
  setupMermaid();
  renderApp();
  syncUrlFromState();
  showToast(`トーン: ${getToneEntry(toneId).label}`);
}

function syncLayoutUi() {
  const entry = VISUAL_LAYOUTS.find(l => l.id === state.visualLayout) || VISUAL_LAYOUTS[0];
  const labelEl = document.getElementById('active-layout-name');
  if (labelEl) labelEl.textContent = entry.shortLabel;
  document.querySelectorAll('#layout-menu .tone-menu-item').forEach(btn => {
    const active = btn.getAttribute('data-layout-id') === state.visualLayout;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-checked', active ? 'true' : 'false');
  });
}

function setLayoutMenuOpen(open: boolean) {
  const btn = document.getElementById('btn-layout-menu');
  const menu = document.getElementById('layout-menu');
  if (!btn || !menu) return;
  if (open) {
    setToneMenuOpen(false);
    const rect = btn.getBoundingClientRect();
    menu.style.top = `${Math.round(rect.bottom + 6)}px`;
    menu.style.left = `${Math.max(8, Math.round(Math.min(rect.left, window.innerWidth - 236)))}px`;
  }
  menu.classList.toggle('hidden', !open);
  btn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function selectVisualLayout(layoutId: string) {
  const next = layoutId === 'single' ? 'single' : 'page';
  state.visualLayout = next;
  setLayoutMenuOpen(false);
  syncLayoutUi();
  applyToneToVisualStage(document.getElementById('visual-stage-container'));
  if (state.isVisualMode) {
    updateAllSlabSplits(document.getElementById('visual-stage-container'));
  }
  syncUrlFromState();
  const entry = VISUAL_LAYOUTS.find(l => l.id === next) || VISUAL_LAYOUTS[0];
  showToast(`誌面レイアウト: ${entry.label}`);
}

function setStageMode(isVisual) {
  if (state.isVisualMode === isVisual) return;
  state.isVisualMode = isVisual;
  syncStageModeUi(isVisual);
  if (isVisual) {
    showToast('🎨 Visualモードを起動');
  } else {
    showToast('高速モードに戻りました');
  }
  renderApp();
  syncUrlFromState();
  if (isVisual) void ensureStyleFont(state.infographicStyle);
}

function selectInfographicStyle(style) {
  state.infographicStyle = style;
  document.querySelectorAll('.info-style-btn').forEach(b => {
    b.classList.toggle('is-active', b.getAttribute('data-info-style') === style);
  });
  // スタイルバーは Visualモードのときだけ表示する。高速モードから選べるのはキーボードの 1〜4 だけで、
  // その場合は Visualモードに切り替えて適用する（FR-025）
  if (!state.isVisualMode) {
    state.isVisualMode = true;
    syncStageModeUi(true);
  }
  syncToneUi();
  renderApp();
  syncUrlFromState();
  void ensureStyleFont(style);
  const activeBtn = document.querySelector(`.info-style-btn[data-info-style="${style}"]`);
  showToast(`スタイル適用: ${activeBtn ? activeBtn.textContent.trim() : style}`);
}

/* ==========================================================================
   キーボードショートカットとナビゲーション（FR-025, DD-KEY-001〜004）
   ========================================================================== */
function closeShortcutModal() {
  setModalOpen('shortcut-modal', false);
}

function toggleShortcutModal() {
  setModalOpen('shortcut-modal', !isModalOpen('shortcut-modal'));
}

/* ==========================================================================
   プレビューのスクロール（J/K の章移動 FR-025、編集位置への追従 FR-037 で共通）
   ========================================================================== */
export const PREVIEW_SCROLL_MARGIN = 16;

export function scrollBehavior() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// 要素の上端を、プレビューの表示枠の上端から PREVIEW_SCROLL_MARGIN だけ下に置くときの scrollTop
export function previewScrollTopOf(el, scroller, scrollerRect = scroller.getBoundingClientRect()) {
  return Math.max(0, Math.round(el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop - PREVIEW_SCROLL_MARGIN));
}

/* ==========================================================================
   Split 表示の編集位置への追従（FR-037, DD-DIAG-060〜062）
   ========================================================================== */
// 最後に送った見出しの行（'top' はプレビューの先頭）。同じ区間の中では送り直さない
let followFrame = 0;
let isInputRender = false;
let followIndex: { line: number; el: HTMLElement }[] = [];
const caretState = { pos: 0, line: 0, length: -1, dirty: true };
let pendingEdit: { type: string; start: number; deletedNewlines: number } | null = null;

// text の先頭から end までにある改行の数（= end の位置の 0 始まりの行番号）
function countLinesBefore(text: string, end: number) {
  return countLinesBetween(text, 0, end);
}

// text の [start, end) の範囲にある改行の数を数える
function countLinesBetween(text: string, start: number, end: number) {
  let count = 0;
  for (let i = text.indexOf('\n', start); i !== -1 && i < end; i = text.indexOf('\n', i + 1)) count++;
  return count;
}

// 描画したコンテナから見出しの一覧（行番号と要素）を 1 回だけ作る
function rebuildFollowIndex(container: HTMLElement | null) {
  if (!container) {
    followIndex = [];
    return;
  }
  followIndex = Array.from(container.querySelectorAll('[data-src-line]')).map(el => ({
    line: Number((el as HTMLElement).dataset.srcLine),
    el: el as HTMLElement
  }));
}

// caretState の位置を targetPos まで差分移動して行番号を更新する
function moveCaretLine(text: string, targetPos: number) {
  if (targetPos > caretState.pos) {
    caretState.line += countLinesBetween(text, caretState.pos, targetPos);
  } else if (targetPos < caretState.pos) {
    caretState.line -= countLinesBetween(text, targetPos, caretState.pos);
  }
  caretState.pos = targetPos;
}

// 前回のカーソル位置からの差分だけ改行を数えて、現在の 0 始まり行番号を返す
function getCaretLine(editor: HTMLTextAreaElement) {
  const text = editor.value;
  const pos = editor.selectionStart ?? 0;
  if (caretState.dirty || caretState.length !== text.length) {
    caretState.line = countLinesBefore(text, pos);
    caretState.pos = pos;
    caretState.length = text.length;
    caretState.dirty = false;
    return caretState.line;
  }
  moveCaretLine(text, pos);
  return caretState.line;
}

// カーソルの行以前で最後の見出しを二分探索で引く（followIndex は文書の順に並ぶ）。なければ null
function findFollowTarget(caretLine: number) {
  let low = 0;
  let high = followIndex.length - 1;
  let result: HTMLElement | null = null;
  while (low <= high) {
    const mid = (low + high) >>> 1;
    if (followIndex[mid].line <= caretLine) {
      result = followIndex[mid].el;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return result;
}

function followEditorCaret() {
  followFrame = 0;
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  const scroller = document.getElementById('preview-scroll');
  const target = findFollowTarget(getCaretLine(editor));
  // Visualモードは章（スラブ）の上端へ送る。章の中の小見出しの間を動いても、同じ章なら送り直さない
  const anchor = target && state.isVisualMode ? (target.closest('.exhibition-slab') || target) : target;
  const keyEl = anchor && anchor !== target ? (anchor.querySelector('[data-src-line]') || target) : target;
  const key = keyEl ? (keyEl as HTMLElement).dataset.srcLine : 'top';
  if (key === runtime.followedKey) return;
  runtime.followedKey = key;
  const behavior = scrollBehavior();
  scroller.scrollTo({ top: anchor ? previewScrollTopOf(anchor, scroller) : 0, behavior });
  // content-visibility: auto 有効時はスクロール直後に実高さが確定してずれるため、1 フレーム後に微調整する（#238, #251）
  const hasCv = state.isVisualMode
    ? Boolean(document.querySelector('#visual-stage-container .exhibition-wrap.has-content-visibility'))
    : Boolean(document.getElementById('standard-doc-container')?.classList.contains('has-content-visibility'));
  if (anchor && hasCv) {
    const expectedKey = key;
    requestAnimationFrame(() => {
      if (runtime.followedKey !== expectedKey || !anchor.isConnected) return;
      const targetTop = previewScrollTopOf(anchor, scroller);
      if (Math.abs(scroller.scrollTop - targetTop) > 4) {
        scroller.scrollTo({ top: targetTop, behavior: 'auto' });
      }
    });
  }
}

// カーソルの移動・入力のたびに呼ぶ。スクロールは表示更新 1 回にまとめる
function scheduleFollow() {
  if (!followFrame) followFrame = requestAnimationFrame(followEditorCaret);
}

// text 内の 0 始まり行番号 targetLine の先頭文字オフセットを返す
function lineStartOffset(text: string, targetLine: number) {
  let offset = 0;
  for (let line = 0; line < targetLine; line++) {
    const nl = text.indexOf('\n', offset);
    if (nl === -1) return text.length;
    offset = nl + 1;
  }
  return offset;
}

// textarea 内の prefix（先頭から対象行頭まで）の折り返しを考慮した上端 Y 座標を測る
function measureEditorLineTop(editor: HTMLTextAreaElement, prefix: string) {
  const cs = getComputedStyle(editor);
  const mirror = document.createElement('div');
  mirror.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;pointer-events:none;white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;box-sizing:border-box;';
  mirror.style.width = `${editor.clientWidth}px`;
  mirror.style.font = cs.font;
  mirror.style.lineHeight = cs.lineHeight;
  mirror.style.letterSpacing = cs.letterSpacing;
  mirror.style.padding = `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`;
  mirror.style.tabSize = cs.tabSize;
  mirror.textContent = prefix;
  const marker = document.createElement('span');
  marker.style.display = 'inline-block';
  marker.style.width = '0';
  marker.textContent = 'x';
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const top = marker.offsetTop;
  mirror.remove();
  return top;
}

// プレビューのクリック位置に対応する見出しへエディタを合わせる（FR-037 逆向き追従、DD-DIAG-065）
function followPreviewClick(e: MouseEvent) {
  if (state.viewMode !== 'split' || document.documentElement.classList.contains('is-stage-show')) return;
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.toString().length > 0) return;
  const targetEl = e.target as HTMLElement | null;
  if (!targetEl || targetEl.closest('a, button, summary, input, select, textarea, .diagram-controls')) return;

  let headingEl: HTMLElement | null = null;
  const slab = state.isVisualMode ? targetEl.closest('.exhibition-slab') : null;
  if (slab) {
    headingEl = slab.querySelector('[data-src-line]') as HTMLElement | null;
  } else {
    headingEl = targetEl.closest('[data-src-line]') as HTMLElement | null;
    if (!headingEl && followIndex.length > 0) {
      let low = 0;
      let high = followIndex.length - 1;
      while (low <= high) {
        const mid = (low + high) >>> 1;
        const el = followIndex[mid].el;
        const isBeforeOrSame = el === targetEl || el.contains(targetEl)
          || (el.compareDocumentPosition(targetEl) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        if (isBeforeOrSame) {
          headingEl = el;
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }
    }
  }

  const targetLine = headingEl ? Number(headingEl.dataset.srcLine) : 0;
  const key = headingEl ? (headingEl.dataset.srcLine || 'top') : 'top';
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  const text = editor.value;
  const offset = lineStartOffset(text, targetLine);
  const lineTop = measureEditorLineTop(editor, text.slice(0, offset));

  // エディタ移動によるプレビューへの呼び返しを防ぐ
  runtime.followedKey = key;
  caretState.line = targetLine;
  caretState.pos = offset;
  caretState.length = text.length;
  caretState.dirty = false;

  editor.focus({ preventScroll: true });
  editor.setSelectionRange(offset, offset);
  editor.scrollTo({ top: Math.max(0, lineTop - 16), behavior: scrollBehavior() });
}

let lastNavTargetTop = null;
let lastNavTime = 0;

function scrollSection(direction) {
  const scroller = document.getElementById('preview-scroll');
  if (!scroller) return;
  const selector = state.isVisualMode
    ? '#visual-stage-container .exhibition-slab'
    : '#standard-doc-container h2';
  const elements = Array.from(document.querySelectorAll(selector));
  if (elements.length === 0) return;

  const now = performance.now();
  const scrollerRect = scroller.getBoundingClientRect();
  const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
  // スムーズスクロール進行中に連続で J / K を押した場合も次の章へ進めるよう、直近の目標位置を引き継ぐ
  const currentTop = (lastNavTargetTop !== null && now - lastNavTime < 500)
    ? lastNavTargetTop
    : scroller.scrollTop;

  const positions = elements.map(el => previewScrollTopOf(el, scroller, scrollerRect));

  let nextTop = null;
  let nextEl = null;
  if (direction > 0) {
    if (currentTop >= maxScroll - 2) return;
    // 先頭付近（scrollTop <= 16）で最初の章が画面上端付近（<= 64px）にある場合は、すでに1章目を表示中とみなして2章目へ進む
    const foundIdx = positions.findIndex((pos, idx) =>
      pos > currentTop + 8 && !(idx === 0 && currentTop <= 16 && pos <= 64 && positions.length > 1)
    );
    if (foundIdx !== -1) {
      nextTop = Math.min(maxScroll, positions[foundIdx]);
      nextEl = elements[foundIdx];
    }
  } else {
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i] < currentTop - 8) {
        nextTop = positions[i];
        nextEl = elements[i];
        break;
      }
    }
    // 最初の章より上に表紙（ヒーローや h1）がある場合は最上部（0）へ戻る
    if (nextTop === null && currentTop > 0) {
      nextTop = 0;
    }
  }

  if (nextTop !== null && nextTop !== undefined) {
    lastNavTargetTop = nextTop;
    lastNavTime = now;
    scroller.scrollTo({ top: nextTop, behavior: scrollBehavior() });
    if (nextEl && state.isVisualMode && document.querySelector('#visual-stage-container .exhibition-wrap.has-content-visibility')) {
      const expectedTime = now;
      requestAnimationFrame(() => {
        if (lastNavTime !== expectedTime || !nextEl.isConnected) return;
        const correctedTop = Math.min(Math.max(0, scroller.scrollHeight - scroller.clientHeight), previewScrollTopOf(nextEl, scroller));
        if (Math.abs(scroller.scrollTop - correctedTop) > 4) {
          lastNavTargetTop = correctedTop;
          scroller.scrollTo({ top: correctedTop, behavior: 'auto' });
        }
      });
    }
  }
}

function setupKeyboardShortcuts() {
  document.getElementById('shortcut-close-btn')?.addEventListener('click', closeShortcutModal);

  registerEscapeHandler('modals', 70, () => {
    if (isModalOpen('shortcut-modal')) {
      closeShortcutModal();
      return true;
    }
    if (isModalOpen('zoom-modal')) {
      document.getElementById('zoom-close-btn')?.click();
      return true;
    }
    if (isModalOpen('external-conflict-modal')) {
      document.getElementById('btn-close-external-conflict')?.click();
      return true;
    }
    return false;
  });

  // ] / [ はキーボードの左右の並び（右が次、左が前）で章を移る（FR-025, DD-KEY-002）
  ['j', 'J', ']'].forEach(k => registerShortcutAction(k, () => scrollSection(1)));
  ['k', 'K', '['].forEach(k => registerShortcutAction(k, () => scrollSection(-1)));
  ['m', 'M'].forEach(k => registerShortcutAction(k, () => setStageMode(!state.isVisualMode)));
  ['1', '2', '3', '4'].forEach((k, idx) => {
    registerShortcutAction(k, () => {
      const targetStyle = VISUAL_STYLE_KEYS[idx];
      if (targetStyle) selectInfographicStyle(targetStyle);
    });
  });
  ['p', 'P'].forEach(k => registerShortcutAction(k, () => document.getElementById('btn-stage-show')?.click()));
  registerShortcutAction('?', () => toggleShortcutModal());

  setupGlobalKeymap();
}

/* ==========================================================================
   イベントハンドラー結線
   ========================================================================== */
function setupSplitResizer(applySplitRatio: (pct: number, persist?: boolean) => number) {
  const resizer = document.getElementById('split-resizer');
  if (!resizer) return;
  let dragging = false;
  const updateFromClientPos = (clientX: number, clientY: number) => {
    const paneEditor = document.getElementById('pane-editor');
    const panePreview = document.getElementById('pane-preview');
    if (!paneEditor || !panePreview) return;
    const edRect = paneEditor.getBoundingClientRect();
    const pvRect = panePreview.getBoundingClientRect();
    if (window.innerWidth >= 1024) {
      const total = pvRect.right - edRect.left;
      if (total > 0) applySplitRatio(((clientX - edRect.left) / total) * 100);
    } else {
      const total = pvRect.bottom - edRect.top;
      if (total > 0) applySplitRatio(((clientY - edRect.top) / total) * 100);
    }
  };
  resizer.addEventListener('pointerdown', (e: PointerEvent) => {
    if (state.viewMode !== 'split') return;
    e.preventDefault();
    dragging = true;
    resizer.classList.add('is-dragging');
    document.body.classList.add('is-split-dragging');
    resizer.setPointerCapture(e.pointerId);
  });
  resizer.addEventListener('pointermove', (e: PointerEvent) => {
    if (dragging) updateFromClientPos(e.clientX, e.clientY);
  });
  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    resizer.classList.remove('is-dragging');
    document.body.classList.remove('is-split-dragging');
    if (state.isVisualMode) updateAllSlabSplits(document.getElementById('visual-stage-container'));
  };
  resizer.addEventListener('pointerup', endDrag);
  resizer.addEventListener('pointercancel', endDrag);
  resizer.addEventListener('keydown', (e: KeyboardEvent) => {
    if (state.viewMode !== 'split') return;
    const step = e.shiftKey ? 5 : 2;
    const delta = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -step : (e.key === 'ArrowRight' || e.key === 'ArrowDown') ? step : 0;
    if (!delta) return;
    e.preventDefault();
    const cur = parseFloat(document.getElementById('pane-editor')?.style.getPropertyValue('--split-editor-pct') || '40') || 40;
    applySplitRatio(cur + delta);
    if (state.isVisualMode) updateAllSlabSplits(document.getElementById('visual-stage-container'));
  });
}

function setupViewModeControls() {
  const SPLIT_RATIO_KEY = 'lucivo:splitRatio';
  const clampSplitPct = (pct: number) => Math.min(80, Math.max(20, Math.round(pct * 10) / 10));

  const applySplitRatio = (pct: number, persist = true) => {
    const clamped = clampSplitPct(pct);
    const paneEditor = document.getElementById('pane-editor');
    if (paneEditor) paneEditor.style.setProperty('--split-editor-pct', `${clamped}%`);
    if (persist) {
      try { localStorage.setItem(SPLIT_RATIO_KEY, String(clamped)); } catch (_) {}
    }
    return clamped;
  };

  const setViewMode = (mode: string) => {
    state.viewMode = mode;
    document.querySelectorAll('.view-mode-btn').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-view-mode') === mode);
    });
    const mobileLabel = document.getElementById('mobile-view-label');
    if (mobileLabel) {
      mobileLabel.textContent = mode === 'canvas' ? 'Canvas' : mode === 'editor' ? 'Code' : 'Split';
    }

    const paneEditor = document.getElementById('pane-editor');
    const panePreview = document.getElementById('pane-preview');
    const resizer = document.getElementById('split-resizer');

    if (mode === 'split') {
      paneEditor.classList.remove('hidden');
      panePreview.classList.remove('hidden');
      resizer?.classList.remove('hidden');
      paneEditor.className = 'is-split w-full lg:w-[40%] h-[42%] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r shrink-0 z-10';
    } else if (mode === 'canvas') {
      paneEditor.classList.add('hidden');
      panePreview.classList.remove('hidden');
      resizer?.classList.add('hidden');
    } else if (mode === 'editor') {
      paneEditor.classList.remove('hidden');
      panePreview.classList.add('hidden');
      resizer?.classList.add('hidden');
      paneEditor.className = 'w-full h-full flex flex-col shrink-0 z-10';
    }
    if (state.isVisualMode && mode !== 'editor') {
      updateAllSlabSplits(document.getElementById('visual-stage-container'));
    }
    syncUrlFromState();
  };
  applyViewModeFn = setViewMode;

  try {
    const savedRatio = Number(localStorage.getItem(SPLIT_RATIO_KEY));
    if (Number.isFinite(savedRatio) && savedRatio >= 20 && savedRatio <= 80) {
      applySplitRatio(savedRatio, false);
    }
  } catch (_) {}

  document.querySelectorAll('.view-mode-btn').forEach((btn: any) => {
    btn.onclick = () => {
      const mode = btn.getAttribute('data-view-mode');
      if (mode) setViewMode(mode);
    };
  });

  setupSplitResizer(applySplitRatio);
  setViewMode(window.innerWidth < 1024 ? 'canvas' : 'split');
}

function setupEventListeners() {
  const editor = document.getElementById('markdown-editor') as HTMLTextAreaElement;
  editor.addEventListener('beforeinput', (e: InputEvent) => {
    pendingEdit = null;
    if (e.isComposing || caretState.dirty || editor.value.length !== caretState.length) return;
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    if (start !== end) return;
    if (e.inputType === 'insertText' || e.inputType === 'insertLineBreak') {
      moveCaretLine(editor.value, start);
      pendingEdit = { type: e.inputType, start, deletedNewlines: 0 };
    } else if (e.inputType === 'deleteContentBackward' && start > 0) {
      moveCaretLine(editor.value, start);
      pendingEdit = { type: e.inputType, start, deletedNewlines: editor.value[start - 1] === '\n' ? 1 : 0 };
    }
  });
  editor.addEventListener('input', (e: Event) => {
    const ie = e as InputEvent;
    if (pendingEdit && !ie.isComposing && ie.inputType === pendingEdit.type) {
      if (pendingEdit.type === 'insertText' && typeof ie.data === 'string') {
        caretState.line += countLinesBetween(ie.data, 0, ie.data.length);
      } else if (pendingEdit.type === 'insertLineBreak') {
        caretState.line += 1;
      } else if (pendingEdit.type === 'deleteContentBackward') {
        caretState.line -= pendingEdit.deletedNewlines;
      }
      caretState.pos = editor.selectionStart ?? pendingEdit.start;
      caretState.length = editor.value.length;
    } else {
      caretState.dirty = true;
    }
    pendingEdit = null;
    clearTimeout(runtime.renderDebounceTimer);
    const debounceMs = Math.min(250, Math.max(120, Math.round(lastRenderMs * 4)));
    runtime.renderDebounceTimer = setTimeout(() => {
      isInputRender = true;
      renderApp();
    }, debounceMs);
    scheduleFollow();
  });
  editor.addEventListener('click', scheduleFollow);
  editor.addEventListener('keyup', scheduleFollow);
  document.getElementById('preview-scroll')?.addEventListener('click', followPreviewClick);

  setupViewModeControls();

  let resizeRafId = 0;
  window.addEventListener('resize', () => {
    if (!state.isVisualMode || resizeRafId) return;
    resizeRafId = requestAnimationFrame(() => {
      resizeRafId = 0;
      if (state.isVisualMode) {
        updateAllSlabSplits(document.getElementById('visual-stage-container'));
      }
    });
  });

  const btnFast = document.getElementById('btn-mode-fast');
  const btnVisual = document.getElementById('btn-visual-mode');
  if (btnFast) btnFast.onclick = () => setStageMode(false);
  if (btnVisual) btnVisual.onclick = () => setStageMode(!state.isVisualMode);

  document.getElementById('btn-stage-show').onclick = async () => {
    if (await loadLibrary('stage')) {
      if (typeof LucivoStage.toggleLights === 'function') LucivoStage.toggleLights(state.signalLightsEnabled);
      LucivoStage.enterShow();
    }
  };

  document.querySelectorAll('.info-style-btn').forEach((btn: any) => {
    btn.onclick = () => selectInfographicStyle(btn.getAttribute('data-info-style'));
  });

  const toneBtn = document.getElementById('btn-tone-menu');
  const toneMenu = document.getElementById('tone-menu');
  if (toneMenu) {
    toneMenu.innerHTML = COLOR_TONES.map(t => {
      const cols = t.id === 'default'
        ? getEffectiveVisualPalette(state.infographicStyle, state.appearance)
        : [t.light.c1, t.light.c2, t.light.c3, t.light.c4];
      return `<button type="button" role="menuitemradio" aria-checked="false" data-tone-id="${t.id}" class="tone-menu-item">`
        + `<span class="tone-swatches" aria-hidden="true">${renderSwatchDotsHtml(cols)}</span>`
        + `<span class="tone-menu-label">${escapeHtml(t.label)}</span>`
        + `</button>`;
    }).join('');
    toneMenu.querySelectorAll('.tone-menu-item').forEach((item: any) => {
      item.onclick = () => selectTone(item.getAttribute('data-tone-id'));
    });
  }
  if (toneBtn && toneMenu) {
    toneBtn.onclick = e => {
      e.stopPropagation();
      const willOpen = toneMenu.classList.contains('hidden');
      if (willOpen) setLayoutMenuOpen(false);
      setToneMenuOpen(willOpen);
    };
    document.addEventListener('click', e => {
      if (!toneMenu.classList.contains('hidden') && !toneMenu.contains(e.target as Node) && !toneBtn.contains(e.target as Node)) {
        setToneMenuOpen(false);
      }
    });
    registerEscapeHandler('tone-menu', 90, () => {
      if (toneMenu.classList.contains('hidden')) return false;
      setToneMenuOpen(false);
      toneBtn.focus();
      return true;
    });
  }
  syncToneUi();

  const layoutBtn = document.getElementById('btn-layout-menu');
  const layoutMenu = document.getElementById('layout-menu');
  if (layoutMenu) {
    layoutMenu.innerHTML = VISUAL_LAYOUTS.map(l =>
      `<button type="button" role="menuitemradio" aria-checked="false" data-layout-id="${l.id}" class="tone-menu-item">`
      + `<span class="tone-menu-label">${l.label}</span>`
      + `</button>`
    ).join('');
    layoutMenu.querySelectorAll('.tone-menu-item').forEach((item: any) => {
      item.onclick = () => selectVisualLayout(item.getAttribute('data-layout-id'));
    });
  }
  if (layoutBtn && layoutMenu) {
    layoutBtn.onclick = e => {
      e.stopPropagation();
      const willOpen = layoutMenu.classList.contains('hidden');
      setLayoutMenuOpen(willOpen);
    };
    document.addEventListener('click', e => {
      if (!layoutMenu.classList.contains('hidden') && !layoutMenu.contains(e.target as Node) && !layoutBtn.contains(e.target as Node)) {
        setLayoutMenuOpen(false);
      }
    });
    registerEscapeHandler('layout-menu', 89, () => {
      if (layoutMenu.classList.contains('hidden')) return false;
      setLayoutMenuOpen(false);
      layoutBtn.focus();
      return true;
    });
  }
  syncLayoutUi();

  const btnTheme = document.getElementById('btn-theme-toggle');
  const iconSun = document.getElementById('icon-sun');
  const iconMoon = document.getElementById('icon-moon');
  const appFavicon = document.getElementById('app-favicon');
  btnTheme.onclick = () => {
    state.appearance = state.appearance === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-appearance', state.appearance);
    if (appFavicon) appFavicon.setAttribute('href', `./assets/logos/${state.appearance}/favicon.svg`);
    iconSun.classList.toggle('hidden', state.appearance === 'dark');
    iconMoon.classList.toggle('hidden', state.appearance !== 'dark');
    syncToneUi();
    setupMermaid();
    renderApp();
    syncUrlFromState();
  };

  document.getElementById('btn-open-settings').onclick = () => setModalOpen('settings-modal', true);
  document.getElementById('btn-close-settings').onclick = () => setModalOpen('settings-modal', false);
  // Expand の画面の倍率の部品（DD-DIAG-045）。部品は図のカードと同じ HTML を入れる
  bindScaleMenus();
  const zoomPicker = document.getElementById('zoom-scale-picker');
  if (zoomPicker) {
    zoomPicker.innerHTML = scalePickerHtml('');
    zoomPicker.addEventListener('click', event => {
      const btn = (event.target as Element).closest('.scale-btn');
      if (!btn) return;
      setScaleMode(document.getElementById('zoom-canvas'), zoomPicker, btn.getAttribute('data-action') as ScaleAction);
    });
  }
  document.getElementById('zoom-close-btn').onclick = () => {
    setModalOpen('zoom-modal', false);
    document.getElementById('zoom-canvas').innerHTML = '';
  };

  const exportHtmlBtn = document.getElementById('btn-export-html');
  if (exportHtmlBtn) exportHtmlBtn.onclick = () => {
    const fullHtml = Object.entries(EXPORT_URLS).reduce(
      (html, [local, url]) => html.split(local).join(url),
      document.documentElement.outerHTML
    );
    downloadBlob(fullHtml, 'lucivo-architecture-export.html', 'text/html');
    showToast('単一HTMLファイルをエクスポートしました');
  };

  document.getElementById('btn-test-cache').onclick = () => {
    const t0 = performance.now();
    renderApp();
    showToast(`キャッシュ再描画: ${(performance.now() - t0).toFixed(1)}ms (0ms相当)`);
  };

  document.getElementById('btn-test-err').onclick = () => {
    editor.value += '\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n';
    renderApp();
  };
}

/* ==========================================================================
   開く・保存のメニュー（Markdown ファイルの読み込みと保存）
   ========================================================================== */
let urlSyncReady = false;
let applyViewModeFn: ((mode: string) => void) | null = null;

function syncUrlFromState() {
  if (!urlSyncReady) return;
  if (document.documentElement.classList.contains('is-stage-show')) return;
  // 人へリンクを共有した際に画面幅の違いで view=canvas 等が落ちないよう、既定値は常に 'split' 基準とする（#307）
  syncBrowserUrl(state, runtime.currentRemoteUrl, 'split');
}

function applyInitialDisplayStateFromUrl() {
  const params = parseDisplayStateParams(
    window.location.search,
    window.location.hash,
    VISUAL_STYLE_KEYS,
    COLOR_TONES.map(t => t.id)
  );
  if (params.appearance) {
    state.appearance = params.appearance;
    document.body.setAttribute('data-appearance', state.appearance);
    const appFavicon = document.getElementById('app-favicon');
    if (appFavicon) appFavicon.setAttribute('href', `./assets/logos/${state.appearance}/favicon.svg`);
    document.getElementById('icon-sun')?.classList.toggle('hidden', state.appearance === 'dark');
    document.getElementById('icon-moon')?.classList.toggle('hidden', state.appearance !== 'dark');
  }
  if (params.infographicStyle) {
    state.infographicStyle = params.infographicStyle;
    document.querySelectorAll('.info-style-btn').forEach(b => {
      b.classList.toggle('is-active', b.getAttribute('data-info-style') === state.infographicStyle);
    });
  }
  if (typeof params.isVisualMode === 'boolean') {
    state.isVisualMode = params.isVisualMode;
    syncStageModeUi(state.isVisualMode);
    if (state.isVisualMode) void ensureStyleFont(state.infographicStyle);
  }
  if (params.tone) {
    state.tone = params.tone;
  }
  if (params.visualLayout) {
    state.visualLayout = params.visualLayout;
    syncLayoutUi();
  }
  if (params.appearance || params.infographicStyle || params.tone) {
    syncToneUi();
  }
  if (params.viewMode && applyViewModeFn) {
    applyViewModeFn(params.viewMode);
  }
}

runtime.renderApp = renderApp;
runtime.syncUrlFromState = syncUrlFromState;

window.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  applyInitialDisplayStateFromUrl();
  urlSyncReady = true;
  setupVisualStageInteractions();
  setupSplitTermLinks();
  setupKeyboardShortcuts();
  setupFileMenu();
  setupFileDrop();
  setupFileWatch();
  setupFolder();
  setupUpdateCheck();
  setupDiagramPanZoom();
  ensureSlabVisibilityTracking(document.getElementById('visual-stage-container'));
  setupLocalImages();
  setupFrontMatterToggle();
  setupAnimationToggle();
  setupAmbientEffectsToggle();
  setupFormatter();
  setupMarkedMath();
  setupMarkedHeadings();
  setupMarkedBlocks();
  setupMarkedFootnotes();
  setupMarkedEmoji();
  setupMermaid();
  renderApp();
  loadMarkdownFromUrlParam();
});

// E2E テストおよび外部連携用グローバル公開
(window as any).state = state;
(window as any).renderApp = renderApp;
// 図の番号（data-stage-index）の Mermaid の原文。プレイアブル・ダイアグラム（#62）が使う
(window as any).getMermaidSource = (index: number) => runtime.lastMermaidSources[index] ?? null;
(window as any).closeFileMenu = closeFileMenu;

Object.defineProperty(window, 'openedFolder', {
  get() { return runtime.openedFolder; },
  set(val) { runtime.openedFolder = val; },
  configurable: true
});

Object.defineProperty(window, 'currentSampleFile', {
  get() { return runtime.currentSampleFile; },
  set(val) { runtime.currentSampleFile = val; },
  configurable: true
});

Object.defineProperty(window, 'lastLoadedMarkdown', {
  get() { return runtime.lastLoadedMarkdown; },
  set(val) { runtime.lastLoadedMarkdown = val; },
  configurable: true
});

Object.defineProperty(window, 'preferFolderInput', {
  get() { return runtime.preferFolderInput; },
  set(val) { runtime.preferFolderInput = val; },
  configurable: true
});

// stage.js などの外部スクリプト（非同期動的ロード）や E2E テストとの後方互換用
(window as any).hexToRgba = hexToRgba;
(window as any).escapeHtml = escapeHtml;
(window as any).updateSlabSplit = updateSlabSplit;
(window as any).updateAllSlabSplits = updateAllSlabSplits;
(window as any).clearVisualStageSpotlight = clearVisualStageSpotlight;
(window as any).showToast = showToast;
(window as any).isModalOpen = isModalOpen;
(window as any).setModalOpen = setModalOpen;
(window as any).findScrollParent = findScrollParent;
(window as any).fitCache = fitCache;
(window as any).mathCache = mathCache;
(window as any).svgCache = svgCache;
(window as any).EMPTY_GUIDE_HTML = EMPTY_GUIDE_HTML;
(window as any).updatePannable = updatePannable;
