/* ==========================================================================
   Lucivo C4 SVG 純粋レンダラー（ARC-STR-001, ARC-STR-005）
   入力は ResolvedView + ViewLayout + StructurizrStyles のみ。
   描画順（奥→手前）: <defs> -> g.layer-boundaries -> g.layer-edges -> g.layer-nodes
   ========================================================================== */
import { escapeHtml } from '../../../utils/escape';
import type {
  BoxRect,
  EdgeLayout,
  Point,
  ResolvedBoundary,
  ResolvedNode,
  ResolvedView,
  StructurizrRelationship,
  StructurizrStyles,
  ViewLayout
} from '../types';
import {
  C4_FONT_FAMILY,
  EDGE_LABEL_FONT_SIZE,
  EDGE_TECH_FONT_SIZE,
  NODE_DESC_FONT_SIZE,
  NODE_META_FONT_SIZE,
  NODE_TITLE_FONT_SIZE,
  measureEdgeLabel,
  measureNodeBox
} from '../text-metrics';
import { resolveMergedElementStyle } from '../layout/elk-layout';
import { renderNodeShapeSvg } from './shapes';
import { resolveEdgePaint, resolveNodePaint } from './theme-adapter';

let svgInstanceSeq = 0;

function buildEdgePath(points: Point[], routing: 'Direct' | 'Orthogonal' | 'Curved'): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (routing === 'Direct' || points.length === 2) {
    const first = points[0];
    const last = points[points.length - 1];
    return `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
  }
  if (routing === 'Curved') {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const midX = (curr.x + next.x) / 2;
      const midY = (curr.y + next.y) / 2;
      d += ` Q ${curr.x} ${curr.y} ${midX} ${midY}`;
    }
    const last = points[points.length - 1];
    d += ` L ${last.x} ${last.y}`;
    return d;
  }
  // Orthogonal: 角をわずかに丸めて視認性を高める
  const radius = 8;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const next = points[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const len1 = Math.hypot(v1x, v1y);
    const len2 = Math.hypot(v2x, v2y);
    const r = Math.min(radius, len1 / 2, len2 / 2);
    if (r < 1) {
      d += ` L ${curr.x} ${curr.y}`;
      continue;
    }
    const p1x = curr.x - (v1x / len1) * r;
    const p1y = curr.y - (v1y / len1) * r;
    const p2x = curr.x + (v2x / len2) * r;
    const p2y = curr.y + (v2y / len2) * r;
    d += ` L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x} ${curr.y} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function midpointOnPolyline(points: Point[]): Point {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0];
  let total = 0;
  const segs: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
    segs.push(len);
    total += len;
  }
  let target = total / 2;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const ratio = segs[i] > 0 ? target / segs[i] : 0.5;
      return {
        x: Math.round(points[i].x + (points[i + 1].x - points[i].x) * ratio),
        y: Math.round(points[i].y + (points[i + 1].y - points[i].y) * ratio)
      };
    }
    target -= segs[i];
  }
  return points[0];
}

function renderBoundary(boundary: ResolvedBoundary, rect: BoxRect): string {
  const isScope = boundary.kind === 'scope';
  const strokeDash = isScope ? '7 5' : '4 4';
  const cls = isScope ? 'c4-boundary c4-boundary-scope' : 'c4-boundary c4-boundary-group';
  const labelX = rect.x + 12;
  const labelY = isScope ? rect.y + rect.height - (boundary.sublabel ? 24 : 12) : rect.y + 20;
  const subSvg = isScope && boundary.sublabel
    ? `<text x="${labelX}" y="${labelY + 14}" class="c4-boundary-sub" font-size="10.5" font-family="${C4_FONT_FAMILY}" fill="var(--c4-boundary-sub, #64748B)">${escapeHtml(boundary.sublabel)}</text>`
    : '';
  return [
    `<g class="${cls}" data-boundary-id="${escapeHtml(boundary.id)}">`,
    `<rect x="${rect.x}" y="${rect.y}" width="${rect.width}" height="${rect.height}" rx="12" ry="12" fill="var(--c4-boundary-bg, rgba(148, 163, 184, 0.06))" stroke="var(--c4-boundary-stroke, #94A3B8)" stroke-width="1.5" stroke-dasharray="${strokeDash}" />`,
    `<text x="${labelX}" y="${labelY}" class="c4-boundary-label" font-size="12" font-weight="700" font-family="${C4_FONT_FAMILY}" fill="var(--c4-boundary-text, #334155)">${escapeHtml(boundary.label)}</text>`,
    subSvg,
    '</g>'
  ].join('');
}

function renderEdge(
  rel: StructurizrRelationship,
  edgeLayout: EdgeLayout | undefined,
  layout: ViewLayout,
  styles: StructurizrStyles,
  markerId: string
): string {
  let points = edgeLayout?.points || [];
  if (points.length < 2) {
    const src = layout.nodes[rel.sourceId];
    const dst = layout.nodes[rel.destinationId];
    if (!src || !dst) return '';
    points = [
      { x: Math.round(src.x + src.width / 2), y: Math.round(src.y + src.height / 2) },
      { x: Math.round(dst.x + dst.width / 2), y: Math.round(dst.y + dst.height / 2) }
    ];
  }
  const paint = resolveEdgePaint(rel, styles);
  const pathD = buildEdgePath(points, paint.routing);
  const dashAttr = paint.dashed ? ' stroke-dasharray="5 4"' : '';
  const measured = measureEdgeLabel(rel);

  let labelSvg = '';
  if (measured) {
    const pos = edgeLayout?.labelPosition || midpointOnPolyline(points);
    const lx = Math.round(pos.x - measured.width / 2);
    const ly = Math.round(pos.y - measured.height / 2);
    const textEls: string[] = [];
    let ty = ly + 15;
    for (const line of measured.lines) {
      textEls.push(
        `<text x="${pos.x}" y="${ty}" text-anchor="middle" font-size="${EDGE_LABEL_FONT_SIZE}" font-family="${C4_FONT_FAMILY}" fill="var(--c4-edge-label-text, #1E293B)">${escapeHtml(line)}</text>`
      );
      ty += 14;
    }
    if (measured.techLine) {
      textEls.push(
        `<text x="${pos.x}" y="${ty}" text-anchor="middle" font-size="${EDGE_TECH_FONT_SIZE}" font-family="${C4_FONT_FAMILY}" fill="var(--c4-edge-label-sub, #475569)">${escapeHtml(measured.techLine)}</text>`
      );
    }
    labelSvg = [
      '<g class="c4-edge-label">',
      `<rect x="${lx}" y="${ly}" width="${measured.width}" height="${measured.height}" rx="6" ry="6" fill="var(--c4-edge-label-bg, #FFFFFF)" stroke="var(--c4-edge-label-border, #CBD5E1)" stroke-width="1" />`,
      ...textEls,
      '</g>'
    ].join('');
  }

  return [
    `<g class="c4-edge${rel.implied ? ' c4-edge-implied' : ''}" data-edge-id="${escapeHtml(rel.id)}">`,
    `<path d="${pathD}" fill="none" stroke="${paint.stroke}" stroke-width="${paint.strokeWidth}"${dashAttr} stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${markerId})" />`,
    labelSvg,
    '</g>'
  ].join('');
}

function renderNode(node: ResolvedNode, rect: BoxRect, styles: StructurizrStyles): string {
  const paint = resolveNodePaint(node, styles);
  const merged = resolveMergedElementStyle(node, styles);
  const measured = measureNodeBox(node, paint.shape, merged);
  const shapeSvg = renderNodeShapeSvg(paint.shape, rect, paint);

  const cx = Math.round(rect.x + rect.width / 2);
  let ty = rect.y + measured.topOffset + 14;
  const textParts: string[] = [];

  for (const line of measured.titleLines) {
    textParts.push(
      `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="${NODE_TITLE_FONT_SIZE}" font-weight="700" font-family="${C4_FONT_FAMILY}" fill="${paint.textColor}">${escapeHtml(line)}</text>`
    );
    ty += 18;
  }

  textParts.push(
    `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="${NODE_META_FONT_SIZE}" font-family="${C4_FONT_FAMILY}" fill="${paint.textColor}" opacity="0.86">${escapeHtml(measured.metaLine)}</text>`
  );
  ty += 16;

  if (measured.descLines.length > 0) {
    ty += 6;
    for (const line of measured.descLines) {
      textParts.push(
        `<text x="${cx}" y="${ty}" text-anchor="middle" font-size="${NODE_DESC_FONT_SIZE}" font-family="${C4_FONT_FAMILY}" fill="${paint.textColor}" opacity="0.92">${escapeHtml(line)}</text>`
      );
      ty += 15;
    }
  }

  let drillBadgeSvg = '';
  if (node.drillDownViewKey) {
    const bx = rect.x + rect.width - 24;
    const by = rect.y + rect.height - 24;
    drillBadgeSvg = [
      `<g class="c4-drilldown-badge" data-drilldown-view="${escapeHtml(node.drillDownViewKey)}" role="button" tabindex="0">`,
      `<title>${escapeHtml(`Drill down to ${node.drillDownViewKey}`)}</title>`,
      `<rect x="${bx}" y="${by}" width="18" height="18" rx="5" fill="rgba(15, 23, 42, 0.28)" stroke="${paint.textColor}" stroke-width="1" stroke-opacity="0.7" />`,
      `<circle cx="${bx + 8}" cy="${by + 8}" r="3.8" fill="none" stroke="${paint.textColor}" stroke-width="1.35" />`,
      `<line x1="${bx + 11}" y1="${by + 11}" x2="${bx + 14.5}" y2="${by + 14.5}" stroke="${paint.textColor}" stroke-width="1.4" stroke-linecap="round" />`,
      `<line x1="${bx + 8}" y1="${by + 6.2}" x2="${bx + 8}" y2="${by + 9.8}" stroke="${paint.textColor}" stroke-width="1.2" stroke-linecap="round" />`,
      `<line x1="${bx + 6.2}" y1="${by + 8}" x2="${bx + 9.8}" y2="${by + 8}" stroke="${paint.textColor}" stroke-width="1.2" stroke-linecap="round" />`,
      '</g>'
    ].join('');
  }

  const drillAttr = node.drillDownViewKey
    ? ` data-drilldown-view="${escapeHtml(node.drillDownViewKey)}"`
    : '';

  return [
    `<g class="c4-node ${paint.roleClass}${node.drillDownViewKey ? ' has-drilldown' : ''}" data-element-id="${escapeHtml(node.element.id)}" style="color: ${paint.textColor};"${drillAttr}>`,
    shapeSvg,
    ...textParts,
    drillBadgeSvg,
    '</g>'
  ].join('');
}

export function renderStructurizrSvg(
  view: ResolvedView,
  layout: ViewLayout,
  styles: StructurizrStyles
): string {
  const uid = `c4svg-${++svgInstanceSeq}`;
  const arrowId = `${uid}-arrow`;
  const shadowId = `${uid}-shadow`;

  const boundaryMarkup = view.boundaries
    .map(b => {
      const rect = layout.nodes[b.id];
      return rect ? renderBoundary(b, rect) : '';
    })
    .join('');

  const edgeMarkup = view.edges
    .map(rel => renderEdge(rel, layout.edges[rel.id], layout, styles, arrowId))
    .join('');

  const nodeMarkup = view.nodes
    .map(node => {
      const rect = layout.nodes[node.element.id];
      return rect ? renderNode(node, rect, styles) : '';
    })
    .join('');

  const width = Math.max(240, Math.ceil(layout.width));
  const height = Math.max(140, Math.ceil(layout.height));

  return [
    `<svg class="lucivo-c4-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(view.title)}" data-c4-view-key="${escapeHtml(view.spec.key)}" data-c4-layout-source="${layout.source}">`,
    '<defs>',
    `<marker id="${arrowId}" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">`,
    '<path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="var(--c4-edge-stroke, #64748B)" />',
    '</marker>',
    `<filter id="${shadowId}" x="-6%" y="-6%" width="112%" height="116%">`,
    '<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0F172A" flood-opacity="0.12" />',
    '</filter>',
    '</defs>',
    `<g class="layer-boundaries">${boundaryMarkup}</g>`,
    `<g class="layer-edges">${edgeMarkup}</g>`,
    `<g class="layer-nodes" filter="url(#${shadowId})">${nodeMarkup}</g>`,
    '</svg>'
  ].join('');
}
