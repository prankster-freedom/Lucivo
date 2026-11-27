/* ==========================================================================
   日英混在ラベルの事前テキスト計測・折り返し（Layout / SVG 共通・ARC-STR-004）
   CanvasRenderingContext2D.measureText() を優先使用し、非ブラウザ環境では
   全角/半角幅ヒューリスティックにフォールバックする。
   ========================================================================== */
import type { ElementShape, ElementStyle, ResolvedNode, StructurizrRelationship } from './types';

export interface MeasuredNodeLayout {
  width: number;
  height: number;
  titleLines: string[];
  metaLine: string;
  descLines: string[];
  topOffset: number;
}

export interface MeasuredEdgeLabel {
  width: number;
  height: number;
  lines: string[];
  techLine?: string;
}

export const C4_FONT_FAMILY = "'Inter', 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif";
export const NODE_TITLE_FONT_SIZE = 14;
export const NODE_META_FONT_SIZE = 11;
export const NODE_DESC_FONT_SIZE = 11.5;
export const EDGE_LABEL_FONT_SIZE = 11;
export const EDGE_TECH_FONT_SIZE = 10;

let cachedCtx: CanvasRenderingContext2D | null | undefined;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (cachedCtx !== undefined) return cachedCtx;
  if (typeof document === 'undefined') {
    cachedCtx = null;
    return null;
  }
  try {
    const canvas = document.createElement('canvas');
    cachedCtx = canvas.getContext('2d');
  } catch {
    cachedCtx = null;
  }
  return cachedCtx;
}

function isWideChar(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff)
    || (code >= 0x2e80 && code <= 0x9fff)
    || (code >= 0xac00 && code <= 0xd7af)
    || (code >= 0xf900 && code <= 0xfaff)
    || (code >= 0xfe10 && code <= 0xfe6f)
    || (code >= 0xff00 && code <= 0xff60)
    || (code >= 0xffe0 && code <= 0xffe6)
  );
}

export function measureTextWidth(text: string, fontSize: number, bold = false): number {
  if (!text) return 0;
  const ctx = getMeasureContext();
  if (ctx) {
    ctx.font = `${bold ? '700' : '400'} ${fontSize}px ${C4_FONT_FAMILY}`;
    return ctx.measureText(text).width;
  }
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    width += isWideChar(code) ? fontSize * 1.02 : fontSize * (bold ? 0.62 : 0.57);
  }
  return width;
}

/**
 * 日本語（文字単位）と英語（単語単位）が混在する文字列を maxWidth px 以内に折り返す。
 */
export function wrapMixedText(text: string, maxWidth: number, fontSize: number, bold = false, maxLines = 4): string[] {
  const normalized = text.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return [];

  const lines: string[] = [];
  const paragraphs = normalized.split('\n');

  for (const para of paragraphs) {
    if (!para.trim()) continue;
    // 英数字単語と日本語 1 文字・空白をトークン分割
    const chunks = para.match(/[A-Za-z0-9_./:@+-]+|\s+|./g) || [];
    let current = '';

    for (const chunk of chunks) {
      if (!current && /^\s+$/.test(chunk)) continue;
      const candidate = current + chunk;
      if (measureTextWidth(candidate, fontSize, bold) <= maxWidth) {
        current = candidate;
      } else if (current) {
        lines.push(current.trimEnd());
        current = chunk.trimStart();
        if (measureTextWidth(current, fontSize, bold) > maxWidth) {
          // 1 単語が幅を超える場合は文字単位で折り返す
          let piece = '';
          for (const ch of current) {
            if (piece && measureTextWidth(piece + ch, fontSize, bold) > maxWidth) {
              lines.push(piece);
              piece = ch;
            } else {
              piece += ch;
            }
          }
          current = piece;
        }
      } else {
        let piece = '';
        for (const ch of chunk) {
          if (piece && measureTextWidth(piece + ch, fontSize, bold) > maxWidth) {
            lines.push(piece);
            piece = ch;
          } else {
            piece += ch;
          }
        }
        current = piece;
      }
    }
    if (current.trim()) lines.push(current.trimEnd());
  }

  if (lines.length <= maxLines) return lines;
  const trimmed = lines.slice(0, maxLines);
  const last = trimmed[maxLines - 1];
  trimmed[maxLines - 1] = last.length > 1 ? `${last.slice(0, -1)}…` : `${last}…`;
  return trimmed;
}

export function formatElementMeta(node: ResolvedNode): string {
  const { kind, technology } = node.element;
  if (kind === 'person') return '[Person]';
  if (kind === 'softwareSystem') return '[Software System]';
  if (kind === 'container') return technology ? `[Container: ${technology}]` : '[Container]';
  return technology ? `[Component: ${technology}]` : '[Component]';
}

export function measureNodeBox(
  node: ResolvedNode,
  shape: ElementShape,
  styleOverride?: ElementStyle
): MeasuredNodeLayout {
  const isPerson = shape === 'Person' || shape === 'Robot';
  const isCylinder = shape === 'Cylinder';
  const isBrowser = shape === 'WebBrowser';
  const padX = 20;
  const minW = isPerson ? 176 : 196;
  const maxW = 248;

  const metaLine = formatElementMeta(node);
  const rawTitleW = measureTextWidth(node.element.name, NODE_TITLE_FONT_SIZE, true);
  const rawMetaW = measureTextWidth(metaLine, NODE_META_FONT_SIZE, false);
  const desiredContentW = Math.max(minW - padX * 2, Math.min(maxW - padX * 2, Math.max(rawTitleW, rawMetaW, 156)));
  const contentW = styleOverride?.width ? Math.max(120, styleOverride.width - padX * 2) : desiredContentW;

  const titleLines = wrapMixedText(node.element.name, contentW, NODE_TITLE_FONT_SIZE, true, 3);
  const descLines = node.element.description
    ? wrapMixedText(node.element.description, contentW, NODE_DESC_FONT_SIZE, false, 4)
    : [];

  const topOffset = isPerson ? 44 : isCylinder ? 22 : isBrowser ? 24 : 14;
  const bottomPad = node.drillDownViewKey ? 22 : 14;
  const titleH = titleLines.length * 18;
  const metaH = 16;
  const descH = descLines.length > 0 ? 8 + descLines.length * 15 : 0;

  const computedW = Math.ceil(Math.max(minW, contentW + padX * 2));
  const computedH = Math.ceil(Math.max(isPerson ? 132 : 96, topOffset + titleH + metaH + descH + bottomPad));

  return {
    width: styleOverride?.width ? Math.max(140, Math.round(styleOverride.width)) : computedW,
    height: styleOverride?.height ? Math.max(84, Math.round(styleOverride.height)) : computedH,
    titleLines,
    metaLine,
    descLines,
    topOffset
  };
}

export function measureEdgeLabel(rel: StructurizrRelationship): MeasuredEdgeLabel | null {
  const hasDesc = Boolean(rel.description && rel.description.trim());
  const hasTech = Boolean(rel.technology && rel.technology.trim());
  if (!hasDesc && !hasTech) return null;

  const maxTextW = 160;
  const lines = hasDesc ? wrapMixedText(rel.description || '', maxTextW, EDGE_LABEL_FONT_SIZE, false, 2) : [];
  const techLine = hasTech ? `[${rel.technology}]` : undefined;

  let maxLineW = 0;
  for (const line of lines) {
    maxLineW = Math.max(maxLineW, measureTextWidth(line, EDGE_LABEL_FONT_SIZE, false));
  }
  if (techLine) {
    maxLineW = Math.max(maxLineW, measureTextWidth(techLine, EDGE_TECH_FONT_SIZE, false));
  }

  const padX = 10;
  const padY = 5;
  const textH = lines.length * 14 + (techLine ? 13 : 0);

  return {
    width: Math.ceil(Math.max(48, Math.min(maxTextW + padX * 2, maxLineW + padX * 2))),
    height: Math.ceil(textH + padY * 2),
    lines,
    techLine
  };
}
