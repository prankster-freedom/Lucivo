/* ==========================================================================
   Structurizr View Resolver（暗黙的関係集約・include/exclude・境界ツリー・ドリルダウン解決）
   ========================================================================== */
import type {
  ResolvedBoundary,
  ResolvedNode,
  ResolvedView,
  StructurizrElement,
  StructurizrRelationship,
  StructurizrViewSpec,
  StructurizrWorkspace,
  ViewKind
} from './types';

const VIEW_KIND_LABELS: Record<ViewKind, string> = {
  systemLandscape: 'System Landscape',
  systemContext: 'System Context',
  container: 'Container',
  component: 'Component'
};

function buildAncestorsMap(elements: Record<string, StructurizrElement>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const id of Object.keys(elements)) {
    const chain: string[] = [];
    let cur: string | undefined = id;
    const seen = new Set<string>();
    while (cur && elements[cur] && !seen.has(cur)) {
      seen.add(cur);
      chain.push(cur);
      cur = elements[cur].parentId;
    }
    map.set(id, chain);
  }
  return map;
}

/**
 * 下位要素間の明示的関係から、上位ビューの関係（Implied Relationships）を自動集約する。
 */
export function buildImpliedRelationships(
  elements: Record<string, StructurizrElement>,
  explicitRelationships: StructurizrRelationship[]
): StructurizrRelationship[] {
  const ancestorsMap = buildAncestorsMap(elements);
  const explicitPairs = new Set<string>();
  for (const rel of explicitRelationships) {
    explicitPairs.add(`${rel.sourceId}\0${rel.destinationId}`);
  }

  interface Bucket {
    sourceId: string;
    destinationId: string;
    descriptions: string[];
    technologies: string[];
    firstOrder: number;
  }
  const buckets = new Map<string, Bucket>();

  for (const rel of explicitRelationships) {
    const srcAnc = ancestorsMap.get(rel.sourceId) || [rel.sourceId];
    const dstAnc = ancestorsMap.get(rel.destinationId) || [rel.destinationId];
    const srcSet = new Set(srcAnc);
    const dstSet = new Set(dstAnc);

    for (const a of srcAnc) {
      for (const b of dstAnc) {
        if (a === b) continue;
        // 親子・先祖子孫間の関係は除外する
        if (srcSet.has(b) || dstSet.has(a)) continue;
        const pairKey = `${a}\0${b}`;
        if (explicitPairs.has(pairKey)) continue;

        let bucket = buckets.get(pairKey);
        if (!bucket) {
          bucket = {
            sourceId: a,
            destinationId: b,
            descriptions: [],
            technologies: [],
            firstOrder: rel.sourceOrder
          };
          buckets.set(pairKey, bucket);
        }
        if (rel.description && !bucket.descriptions.includes(rel.description)) {
          bucket.descriptions.push(rel.description);
        }
        if (rel.technology && !bucket.technologies.includes(rel.technology)) {
          bucket.technologies.push(rel.technology);
        }
      }
    }
  }

  const implied: StructurizrRelationship[] = [];
  let seq = 0;
  for (const bucket of buckets.values()) {
    let description: string | undefined;
    if (bucket.descriptions.length === 1) {
      description = bucket.descriptions[0];
    } else if (bucket.descriptions.length === 2) {
      description = `${bucket.descriptions[0]} / ${bucket.descriptions[1]}`;
    } else if (bucket.descriptions.length > 2) {
      description = `${bucket.descriptions[0]} (+${bucket.descriptions.length - 1})`;
    }
    const technology = bucket.technologies.length === 1 ? bucket.technologies[0] : undefined;
    implied.push({
      id: `imp-${++seq}`,
      sourceId: bucket.sourceId,
      destinationId: bucket.destinationId,
      description,
      technology,
      tags: ['Relationship', 'Implied'],
      implied: true,
      sourceOrder: bucket.firstOrder
    });
  }
  return implied;
}

function findDirectNeighbors(
  seedIds: Set<string>,
  allowedNeighbor: (el: StructurizrElement) => boolean,
  elements: Record<string, StructurizrElement>,
  relationships: StructurizrRelationship[]
): Set<string> {
  const neighbors = new Set<string>();
  for (const rel of relationships) {
    if (seedIds.has(rel.sourceId) && !seedIds.has(rel.destinationId)) {
      const dst = elements[rel.destinationId];
      if (dst && allowedNeighbor(dst)) neighbors.add(dst.id);
    } else if (seedIds.has(rel.destinationId) && !seedIds.has(rel.sourceId)) {
      const src = elements[rel.sourceId];
      if (src && allowedNeighbor(src)) neighbors.add(src.id);
    }
  }
  return neighbors;
}

function expandWildcard(
  view: StructurizrViewSpec,
  elements: Record<string, StructurizrElement>,
  relationships: StructurizrRelationship[]
): Set<string> {
  const all = Object.values(elements);
  if (view.kind === 'systemLandscape') {
    return new Set(all.filter(e => e.kind === 'person' || e.kind === 'softwareSystem').map(e => e.id));
  }

  if (view.kind === 'systemContext') {
    const scopeId = view.scopeElementId;
    if (!scopeId || !elements[scopeId]) return new Set();
    const seeds = new Set([scopeId]);
    const neighbors = findDirectNeighbors(
      seeds,
      el => el.kind === 'person' || el.kind === 'softwareSystem',
      elements,
      relationships
    );
    return new Set([...seeds, ...neighbors]);
  }

  if (view.kind === 'container') {
    const scopeId = view.scopeElementId;
    if (!scopeId || !elements[scopeId]) return new Set();
    const containers = all.filter(e => e.kind === 'container' && e.parentId === scopeId);
    const seeds = new Set(containers.map(e => e.id));
    const neighbors = findDirectNeighbors(
      seeds,
      el => el.kind === 'person' || (el.kind === 'softwareSystem' && el.id !== scopeId),
      elements,
      relationships
    );
    return new Set([...seeds, ...neighbors]);
  }

  // component view
  const scopeId = view.scopeElementId;
  const scopeContainer = scopeId ? elements[scopeId] : undefined;
  if (!scopeId || !scopeContainer) return new Set();
  const components = all.filter(e => e.kind === 'component' && e.parentId === scopeId);
  const seeds = new Set(components.map(e => e.id));
  const systemId = scopeContainer.parentId;
  const neighbors = findDirectNeighbors(
    seeds,
    el => (
      el.kind === 'person'
      || (el.kind === 'softwareSystem' && el.id !== systemId)
      || (el.kind === 'container' && el.id !== scopeId && el.parentId === systemId)
    ),
    elements,
    relationships
  );
  return new Set([...seeds, ...neighbors]);
}

function isExternalInView(el: StructurizrElement, view: StructurizrViewSpec): boolean {
  if (view.kind === 'systemLandscape') return false;
  if (view.kind === 'systemContext') return el.id !== view.scopeElementId;
  return el.parentId !== view.scopeElementId;
}

function findDrillDownViewKey(
  el: StructurizrElement,
  currentViewKey: string,
  views: StructurizrViewSpec[]
): string | undefined {
  if (el.kind === 'softwareSystem') {
    const target = views.find(v => v.kind === 'container' && v.scopeElementId === el.id && v.key !== currentViewKey);
    return target?.key;
  }
  if (el.kind === 'container') {
    const target = views.find(v => v.kind === 'component' && v.scopeElementId === el.id && v.key !== currentViewKey);
    return target?.key;
  }
  return undefined;
}

function buildBoundariesForNodes(
  nodes: ResolvedNode[],
  view: StructurizrViewSpec,
  elements: Record<string, StructurizrElement>
): ResolvedBoundary[] {
  const boundaryMap = new Map<string, ResolvedBoundary>();
  let scopeBoundaryId: string | undefined;

  const hasInScopeNode = nodes.some(n => !n.external);
  if ((view.kind === 'container' || view.kind === 'component') && view.scopeElementId && hasInScopeNode) {
    const scopeEl = elements[view.scopeElementId];
    if (scopeEl) {
      scopeBoundaryId = `boundary:scope:${scopeEl.id}`;
      const sublabel = scopeEl.kind === 'softwareSystem'
        ? '[Software System]'
        : scopeEl.technology ? `[Container: ${scopeEl.technology}]` : '[Container]';
      boundaryMap.set(scopeBoundaryId, {
        id: scopeBoundaryId,
        label: scopeEl.name,
        sublabel,
        kind: 'scope',
        sourceOrder: scopeEl.sourceOrder
      });
    }
  }

  for (const node of nodes) {
    let parentBoundaryId: string | undefined = (!node.external && scopeBoundaryId) ? scopeBoundaryId : undefined;
    const prefix = parentBoundaryId || 'root';

    for (let depth = 0; depth < node.element.groupPath.length; depth++) {
      const segment = node.element.groupPath[depth];
      const pathKey = node.element.groupPath.slice(0, depth + 1).join('/');
      const groupId = `boundary:group:${prefix}:${pathKey}`;
      if (!boundaryMap.has(groupId)) {
        boundaryMap.set(groupId, {
          id: groupId,
          label: segment,
          kind: 'group',
          parentBoundaryId,
          sourceOrder: node.element.sourceOrder
        });
      }
      parentBoundaryId = groupId;
    }

    node.boundaryId = parentBoundaryId;
  }

  return Array.from(boundaryMap.values()).sort((a, b) => a.sourceOrder - b.sourceOrder);
}

function buildViewTitle(view: StructurizrViewSpec, workspace: StructurizrWorkspace): { title: string; subtitle: string } {
  const kindLabel = VIEW_KIND_LABELS[view.kind];
  if (view.title) {
    return { title: view.title, subtitle: kindLabel };
  }
  if (view.scopeElementId && workspace.elements[view.scopeElementId]) {
    const scopeName = workspace.elements[view.scopeElementId].name;
    return { title: `${scopeName} - ${kindLabel}`, subtitle: kindLabel };
  }
  return {
    title: workspace.name ? `${workspace.name} - ${kindLabel}` : kindLabel,
    subtitle: kindLabel
  };
}

export function resolveStructurizrView(
  workspace: StructurizrWorkspace,
  view: StructurizrViewSpec,
  allRelationships?: StructurizrRelationship[]
): ResolvedView {
  const combinedRelationships = allRelationships ?? [
    ...workspace.relationships,
    ...buildImpliedRelationships(workspace.elements, workspace.relationships)
  ];

  const includedIds = new Set<string>();
  for (const inc of view.includes) {
    if (inc === '*') {
      for (const id of expandWildcard(view, workspace.elements, combinedRelationships)) {
        includedIds.add(id);
      }
    } else if (workspace.elements[inc]) {
      includedIds.add(inc);
    }
  }
  for (const exc of view.excludes) {
    includedIds.delete(exc);
  }

  const nodes: ResolvedNode[] = Array.from(includedIds)
    .map(id => workspace.elements[id])
    .filter((el): el is StructurizrElement => Boolean(el))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)
    .map(element => ({
      element,
      external: isExternalInView(element, view),
      drillDownViewKey: findDrillDownViewKey(element, view.key, workspace.views)
    }));

  const boundaries = buildBoundariesForNodes(nodes, view, workspace.elements);

  const edges = combinedRelationships
    .filter(rel => includedIds.has(rel.sourceId) && includedIds.has(rel.destinationId))
    .sort((a, b) => a.sourceOrder - b.sourceOrder);

  const { title, subtitle } = buildViewTitle(view, workspace);

  return {
    spec: view,
    title,
    subtitle,
    nodes,
    boundaries,
    edges
  };
}

export function resolveAllStructurizrViews(workspace: StructurizrWorkspace): ResolvedView[] {
  const allRelationships = [
    ...workspace.relationships,
    ...buildImpliedRelationships(workspace.elements, workspace.relationships)
  ];
  return workspace.views.map(view => resolveStructurizrView(workspace, view, allRelationships));
}
