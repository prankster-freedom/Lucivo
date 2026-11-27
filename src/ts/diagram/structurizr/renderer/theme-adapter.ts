/* ==========================================================================
   Structurizr 配色アダプタ（ARC-STR-005）
   DSL styles の明示指定を最優先し、未指定箇所は Lucivo の CSS 変数トークン
   （Fast / Visual・Light / Dark・パレット・カスタムトーン連動）を参照する。
   SVG / PNG 書き出し時は getComputedStyle() で実色へインライン展開する。
   ========================================================================== */
import type {
  ElementShape,
  ElementStyle,
  RelationshipStyle,
  ResolvedNode,
  StructurizrRelationship,
  StructurizrStyles
} from '../types';
import { resolveElementShape, resolveMergedElementStyle } from '../layout/elk-layout';

export interface ResolvedNodePaint {
  shape: ElementShape;
  fill: string;
  stroke: string;
  textColor: string;
  strokeDasharray?: string;
  opacity?: number;
  roleClass: string;
}

export interface ResolvedEdgePaint {
  stroke: string;
  strokeWidth: number;
  dashed: boolean;
  routing: 'Direct' | 'Orthogonal' | 'Curved';
}

const VALID_CSS_COLOR_RE = /^(?:#[0-9a-fA-F]{3,8}|(?:rgb|hsl)a?\([^;{}<>]+\)|[a-zA-Z]{3,24})$/;

function sanitizeColor(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim();
  return VALID_CSS_COLOR_RE.test(trimmed) ? trimmed : undefined;
}

function borderToDashArray(border: ElementStyle['border']): string | undefined {
  if (border === 'dashed') return '6 4';
  if (border === 'dotted') return '2 4';
  return undefined;
}

function defaultTokensForNode(node: ResolvedNode): { fill: string; stroke: string; text: string; roleClass: string } {
  if (node.element.kind === 'person') {
    return {
      fill: 'var(--c4-person-bg, #08427B)',
      stroke: 'var(--c4-person-stroke, #073B6F)',
      text: 'var(--c4-person-text, #FFFFFF)',
      roleClass: 'c4-role-person'
    };
  }
  if (node.external) {
    return {
      fill: 'var(--c4-external-bg, #999999)',
      stroke: 'var(--c4-external-stroke, #7A7A7A)',
      text: 'var(--c4-external-text, #FFFFFF)',
      roleClass: 'c4-role-external'
    };
  }
  if (node.element.kind === 'softwareSystem') {
    return {
      fill: 'var(--c4-system-bg, #1168BD)',
      stroke: 'var(--c4-system-stroke, #0E569E)',
      text: 'var(--c4-system-text, #FFFFFF)',
      roleClass: 'c4-role-system'
    };
  }
  if (node.element.kind === 'container') {
    return {
      fill: 'var(--c4-container-bg, #438DD5)',
      stroke: 'var(--c4-container-stroke, #2E74B8)',
      text: 'var(--c4-container-text, #FFFFFF)',
      roleClass: 'c4-role-container'
    };
  }
  return {
    fill: 'var(--c4-component-bg, #85BBF0)',
    stroke: 'var(--c4-component-stroke, #5E97D1)',
    text: 'var(--c4-component-text, #0F172A)',
    roleClass: 'c4-role-component'
  };
}

export function resolveNodePaint(node: ResolvedNode, styles: StructurizrStyles): ResolvedNodePaint {
  const merged = resolveMergedElementStyle(node, styles);
  const shape = resolveElementShape(node, merged);
  const defaults = defaultTokensForNode(node);

  const customFill = sanitizeColor(merged.background);
  const customStroke = sanitizeColor(merged.stroke);
  const customColor = sanitizeColor(merged.color);

  return {
    shape,
    fill: customFill || defaults.fill,
    stroke: customStroke || (customFill ? customFill : defaults.stroke),
    textColor: customColor || defaults.text,
    strokeDasharray: borderToDashArray(merged.border),
    opacity: typeof merged.opacity === 'number' ? merged.opacity / 100 : undefined,
    roleClass: defaults.roleClass
  };
}

export function resolveEdgePaint(rel: StructurizrRelationship, styles: StructurizrStyles): ResolvedEdgePaint {
  const merged: RelationshipStyle = { tag: '' };
  for (const style of styles.relationships) {
    if (rel.tags.some(t => t.toLowerCase() === style.tag.toLowerCase())) {
      Object.assign(merged, style);
    }
  }
  return {
    stroke: sanitizeColor(merged.color) || 'var(--c4-edge-stroke, #64748B)',
    strokeWidth: merged.thickness ? Math.max(1, Math.min(8, merged.thickness)) : 1.75,
    dashed: merged.dashed ?? true,
    routing: merged.routing ?? 'Orthogonal'
  };
}

const INLINE_STYLE_PROPS = [
  'color',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight'
] as const;

/**
 * DOM 上にマウントされた Structurizr SVG をクローンし、CSS 変数を実色へインライン展開する。
 * 単体 SVG / PNG ダウンロード時の色崩れを防ぐ（FR-005, ARC-STR-005）。
 */
export function cloneSvgWithInlineStyles(liveSvg: SVGSVGElement): SVGSVGElement {
  const clone = liveSvg.cloneNode(true) as SVGSVGElement;
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return clone;
  }

  const liveAll = [liveSvg, ...Array.from(liveSvg.querySelectorAll('*'))];
  const cloneAll = [clone, ...Array.from(clone.querySelectorAll('*'))];
  const len = Math.min(liveAll.length, cloneAll.length);

  for (let i = 0; i < len; i++) {
    const srcEl = liveAll[i];
    const dstEl = cloneAll[i] as SVGElement;
    if (srcEl.tagName.toLowerCase() === 'defs') continue;
    const cs = window.getComputedStyle(srcEl);
    for (const prop of INLINE_STYLE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && !val.includes('var(')) {
        dstEl.style.setProperty(prop, val);
      }
    }
    for (const attr of ['fill', 'stroke'] as const) {
      const rawAttr = dstEl.getAttribute(attr);
      if (rawAttr && rawAttr.includes('var(')) {
        const computed = cs.getPropertyValue(attr);
        if (computed && !computed.includes('var(')) {
          dstEl.setAttribute(attr, computed);
        }
      }
    }
  }

  // エクスポート用 SVG に明示的な xmlns を付与し、width/height 属性を viewBox から補完
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = liveSvg.viewBox?.baseVal;
  if (vb && vb.width > 0 && vb.height > 0) {
    clone.setAttribute('width', String(Math.ceil(vb.width)));
    clone.setAttribute('height', String(Math.ceil(vb.height)));
  }
  return clone;
}
