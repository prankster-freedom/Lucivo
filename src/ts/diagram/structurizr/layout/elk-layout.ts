/* ==========================================================================
   ELK.js 自動レイアウトアダプタ（ARC-STR-004）
   記述順尊重（considerModelOrder）・複合グラフ（hierarchyHandling: INCLUDE_CHILDREN）
   で ViewLayout を生成し、すべての座標を絶対座標へ正規化する。
   ========================================================================== */
import ELK from 'elkjs/lib/elk.bundled.js';
import type {
  AutoLayoutDirection,
  BoxRect,
  EdgeLayout,
  ElementShape,
  ElementStyle,
  Point,
  ResolvedBoundary,
  ResolvedNode,
  ResolvedView,
  StructurizrStyles,
  ViewLayout
} from '../types';
import { measureEdgeLabel, measureNodeBox } from '../text-metrics';
import type { LayoutEngine } from './layout-engine';

const DIRECTION_MAP: Record<AutoLayoutDirection, string> = {
  tb: 'DOWN',
  bt: 'UP',
  lr: 'RIGHT',
  rl: 'LEFT'
};

interface ElkNodeInput {
  id: string;
  width?: number;
  height?: number;
  layoutOptions?: Record<string, string>;
  children?: ElkNodeInput[];
}

interface ElkEdgeInput {
  id: string;
  sources: string[];
  targets: string[];
  labels?: Array<{ text: string; width: number; height: number }>;
}

interface ElkGraphOutput {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkGraphOutput[];
  edges?: Array<{
    id: string;
    container?: string;
    sections?: Array<{
      startPoint: Point;
      endPoint: Point;
      bendPoints?: Point[];
    }>;
    labels?: Array<{
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    }>;
  }>;
}

export function resolveMergedElementStyle(node: ResolvedNode, styles: StructurizrStyles): ElementStyle {
  const merged: ElementStyle = { tag: '' };
  for (const style of styles.elements) {
    if (node.element.tags.some(t => t.toLowerCase() === style.tag.toLowerCase())) {
      Object.assign(merged, style);
    }
  }
  return merged;
}

export function resolveElementShape(node: ResolvedNode, mergedStyle: ElementStyle): ElementShape {
  if (mergedStyle.shape) return mergedStyle.shape;
  if (node.element.kind === 'person') return 'Person';
  if (node.element.kind === 'component') return 'Component';
  return 'RoundedBox';
}

function buildCompoundTree(
  nodes: ResolvedNode[],
  boundaries: ResolvedBoundary[],
  styles: StructurizrStyles,
  rankSep: number,
  nodeSep: number
): ElkNodeInput[] {
  const boundaryMap = new Map<string, ElkNodeInput>();
  for (const b of boundaries) {
    // 境界ラベルは下端（または上端）に表示するため十分なパディングを確保する
    const topPad = b.kind === 'scope' ? 28 : 34;
    const bottomPad = b.kind === 'scope' ? 44 : 24;
    boundaryMap.set(b.id, {
      id: b.id,
      layoutOptions: {
        'org.eclipse.elk.padding': `[top=${topPad},left=24,bottom=${bottomPad},right=24]`,
        'org.eclipse.elk.spacing.nodeNode': String(Math.max(24, Math.round(nodeSep * 0.75))),
        'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': String(Math.max(36, Math.round(rankSep * 0.75)))
      },
      children: []
    });
  }

  const rootChildren: ElkNodeInput[] = [];
  for (const b of boundaries) {
    const elkBoundary = boundaryMap.get(b.id)!;
    if (b.parentBoundaryId && boundaryMap.has(b.parentBoundaryId)) {
      boundaryMap.get(b.parentBoundaryId)!.children!.push(elkBoundary);
    } else {
      rootChildren.push(elkBoundary);
    }
  }

  const sortedNodes = [...nodes].sort((a, b) => a.element.sourceOrder - b.element.sourceOrder);
  for (const node of sortedNodes) {
    const style = resolveMergedElementStyle(node, styles);
    const shape = resolveElementShape(node, style);
    const measured = measureNodeBox(node, shape, style);
    const elkNode: ElkNodeInput = {
      id: node.element.id,
      width: measured.width,
      height: measured.height
    };
    if (node.boundaryId && boundaryMap.has(node.boundaryId)) {
      boundaryMap.get(node.boundaryId)!.children!.push(elkNode);
    } else {
      rootChildren.push(elkNode);
    }
  }

  return rootChildren;
}

function flattenNodeOffsets(
  node: ElkGraphOutput,
  offsetX: number,
  offsetY: number,
  outRects: Record<string, BoxRect>,
  outOffsets: Map<string, Point>,
  isRoot = false
): void {
  const absX = offsetX + (node.x || 0);
  const absY = offsetY + (node.y || 0);
  outOffsets.set(node.id, { x: absX, y: absY });
  if (!isRoot) {
    outRects[node.id] = {
      x: Math.round(absX),
      y: Math.round(absY),
      width: Math.round(node.width || 0),
      height: Math.round(node.height || 0)
    };
  }
  for (const child of node.children || []) {
    flattenNodeOffsets(child, absX, absY, outRects, outOffsets, false);
  }
}

function collectEdgesRecursive(
  node: ElkGraphOutput,
  offsets: Map<string, Point>,
  outEdges: Record<string, EdgeLayout>
): void {
  const selfOffset = offsets.get(node.id) || { x: 0, y: 0 };
  for (const edge of node.edges || []) {
    const base = edge.container && offsets.has(edge.container)
      ? offsets.get(edge.container)!
      : selfOffset;
    const points: Point[] = [];
    for (const section of edge.sections || []) {
      points.push({ x: Math.round(base.x + section.startPoint.x), y: Math.round(base.y + section.startPoint.y) });
      for (const bp of section.bendPoints || []) {
        points.push({ x: Math.round(base.x + bp.x), y: Math.round(base.y + bp.y) });
      }
      points.push({ x: Math.round(base.x + section.endPoint.x), y: Math.round(base.y + section.endPoint.y) });
    }
    const lbl = edge.labels?.[0];
    const labelPosition = lbl && typeof lbl.x === 'number' && typeof lbl.y === 'number'
      ? {
          x: Math.round(base.x + lbl.x + (lbl.width || 0) / 2),
          y: Math.round(base.y + lbl.y + (lbl.height || 0) / 2)
        }
      : undefined;
    outEdges[edge.id] = { points, labelPosition };
  }
  for (const child of node.children || []) {
    collectEdgesRecursive(child, offsets, outEdges);
  }
}

export class ElkLayoutEngine implements LayoutEngine {
  private readonly elk = new ELK();

  async layout(view: ResolvedView, styles: StructurizrStyles): Promise<ViewLayout> {
    if (view.nodes.length === 0) {
      return { source: 'auto', width: 320, height: 140, nodes: {}, edges: {} };
    }

    const auto = view.spec.autoLayout ?? { direction: 'tb' };
    const direction = DIRECTION_MAP[auto.direction] || 'DOWN';
    // Structurizr の既定 rankSep(300)/nodeSep(300) を SVG のピクセル空間へ自然にスケーリングする
    const rankSep = auto.rankSeparation ? Math.max(40, Math.min(220, Math.round(auto.rankSeparation * 0.3))) : 68;
    const nodeSep = auto.nodeSeparation ? Math.max(28, Math.min(180, Math.round(auto.nodeSeparation * 0.25))) : 44;

    const children = buildCompoundTree(view.nodes, view.boundaries, styles, rankSep, nodeSep);
    const edges: ElkEdgeInput[] = view.edges.map(rel => {
      const measured = measureEdgeLabel(rel);
      return {
        id: rel.id,
        sources: [rel.sourceId],
        targets: [rel.destinationId],
        labels: measured ? [{ text: rel.description || rel.technology || '', width: measured.width, height: measured.height }] : undefined
      };
    });

    const graph = {
      id: 'root',
      layoutOptions: {
        'org.eclipse.elk.algorithm': 'layered',
        'org.eclipse.elk.direction': direction,
        'org.eclipse.elk.hierarchyHandling': 'INCLUDE_CHILDREN',
        'org.eclipse.elk.edgeRouting': 'ORTHOGONAL',
        'org.eclipse.elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
        'org.eclipse.elk.layered.crossingMinimization.forceNodeModelOrder': 'false',
        'org.eclipse.elk.spacing.nodeNode': String(nodeSep),
        'org.eclipse.elk.spacing.edgeNode': '26',
        'org.eclipse.elk.layered.spacing.nodeNodeBetweenLayers': String(rankSep),
        'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '26',
        'org.eclipse.elk.padding': '[top=28,left=28,bottom=28,right=28]'
      },
      children,
      edges
    };

    const result = (await this.elk.layout(graph as any)) as ElkGraphOutput;
    const nodeRects: Record<string, BoxRect> = {};
    const offsets = new Map<string, Point>();
    flattenNodeOffsets(result, 0, 0, nodeRects, offsets, true);

    const edgeLayouts: Record<string, EdgeLayout> = {};
    collectEdgesRecursive(result, offsets, edgeLayouts);

    return {
      source: 'auto',
      width: Math.max(280, Math.ceil(result.width || 400)),
      height: Math.max(160, Math.ceil(result.height || 240)),
      nodes: nodeRects,
      edges: edgeLayouts
    };
  }
}
