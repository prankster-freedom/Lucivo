/* ==========================================================================
   Structurizr View Resolver（暗黙的関係集約・include/exclude・境界ツリー・ドリルダウン解決）
   ========================================================================== */
import {
  evaluateElementExpression,
  evaluateRelationshipExpression,
  isFilterExpressionSyntax,
  parseFilterExpression
} from './expression';
import type {
  ResolvedBoundary,
  ResolvedNode,
  ResolvedView,
  StructurizrElement,
  StructurizrRelationship,
  StructurizrViewSpec,
  StructurizrWorkspace,
  ViewFilterRule,
  ViewKind
} from './types';

const VIEW_KIND_LABELS: Record<ViewKind, string> = {
  systemLandscape: 'System Landscape',
  systemContext: 'System Context',
  container: 'Container',
  component: 'Component',
  filtered: 'Filtered'
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

function isElementAllowedInView(
  el: StructurizrElement,
  view: StructurizrViewSpec,
  elements: Record<string, StructurizrElement>
): boolean {
  if (view.kind === 'systemLandscape' || view.kind === 'systemContext') {
    return el.kind === 'person' || el.kind === 'softwareSystem';
  }
  if (view.kind === 'container') {
    if (el.kind === 'person' || el.kind === 'container') return true;
    return el.kind === 'softwareSystem' && el.id !== view.scopeElementId;
  }
  if (view.kind === 'component') {
    if (el.kind === 'person' || el.kind === 'component') return true;
    const scopeContainer = view.scopeElementId ? elements[view.scopeElementId] : undefined;
    const systemId = scopeContainer?.parentId;
    if (el.kind === 'softwareSystem') return el.id !== systemId;
    if (el.kind === 'container') return el.id !== view.scopeElementId;
  }
  return false;
}

function isCouplingNeighborAllowedInView(
  el: StructurizrElement,
  view: StructurizrViewSpec,
  elements: Record<string, StructurizrElement>
): boolean {
  if (view.kind === 'systemLandscape' || view.kind === 'systemContext') {
    return el.kind === 'person' || el.kind === 'softwareSystem';
  }
  if (view.kind === 'container') {
    if (el.kind === 'person') return true;
    if (el.kind === 'softwareSystem') return el.id !== view.scopeElementId;
    return el.kind === 'container' && el.parentId === view.scopeElementId;
  }
  if (view.kind === 'component') {
    if (el.kind === 'person') return true;
    const scopeContainer = view.scopeElementId ? elements[view.scopeElementId] : undefined;
    const systemId = scopeContainer?.parentId;
    if (el.kind === 'softwareSystem') return el.id !== systemId;
    if (el.kind === 'container') return el.parentId === systemId && el.id !== view.scopeElementId;
    return el.kind === 'component' && el.parentId === view.scopeElementId;
  }
  return false;
}

function getHiddenBaseViewKeys(views: StructurizrViewSpec[]): Set<string> {
  const hidden = new Set<string>();
  for (const v of views) {
    if (v.kind === 'filtered' && v.filter?.baseKey) {
      hidden.add(v.filter.baseKey);
    }
  }
  return hidden;
}

function findDrillDownViewKey(
  el: StructurizrElement,
  currentViewKey: string,
  views: StructurizrViewSpec[],
  hiddenBaseKeys: Set<string>
): string | undefined {
  const resolveVisibleTarget = (base: StructurizrViewSpec | undefined): string | undefined => {
    if (!base) return undefined;
    if (!hiddenBaseKeys.has(base.key)) return base.key;
    const filtered = views.find(v => v.kind === 'filtered' && v.filter?.baseKey === base.key && v.key !== currentViewKey);
    return filtered?.key;
  };

  if (el.kind === 'softwareSystem') {
    const target = views.find(v => v.kind === 'container' && v.scopeElementId === el.id && v.key !== currentViewKey);
    return resolveVisibleTarget(target);
  }
  if (el.kind === 'container') {
    const target = views.find(v => v.kind === 'component' && v.scopeElementId === el.id && v.key !== currentViewKey);
    return resolveVisibleTarget(target);
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

function getEffectiveRules(view: StructurizrViewSpec): ViewFilterRule[] {
  if (view.rules && view.rules.length > 0) return view.rules;
  const rules: ViewFilterRule[] = [];
  for (const inc of view.includes) rules.push({ action: 'include', expression: inc });
  for (const exc of view.excludes) rules.push({ action: 'exclude', expression: exc });
  return rules;
}

function matchesAnyTag(itemTags: string[], filterTags: string[]): boolean {
  return filterTags.some(t => itemTags.includes(t));
}

function resolveFilteredView(
  workspace: StructurizrWorkspace,
  view: StructurizrViewSpec,
  combinedRelationships: StructurizrRelationship[]
): ResolvedView {
  const filter = view.filter;
  const baseView = filter
    ? workspace.views.find(v => v.kind !== 'filtered' && v.key === filter.baseKey)
      ?? workspace.views.find(v => v.kind !== 'filtered' && v.key.toLowerCase() === filter.baseKey.toLowerCase())
    : undefined;

  if (!filter || !baseView) {
    const { title, subtitle } = buildViewTitle(view, workspace);
    return { spec: view, title, subtitle, nodes: [], boundaries: [], edges: [] };
  }

  const baseResolved = resolveStructurizrView(workspace, baseView, combinedRelationships);
  const hiddenBaseKeys = getHiddenBaseViewKeys(workspace.views);

  const keptNodes: ResolvedNode[] = baseResolved.nodes
    .filter(n => {
      const hit = matchesAnyTag(n.element.tags, filter.tags);
      return filter.mode === 'include' ? hit : !hit;
    })
    .map(n => ({
      ...n,
      boundaryId: undefined,
      drillDownViewKey: findDrillDownViewKey(n.element, view.key, workspace.views, hiddenBaseKeys)
    }));

  const keptNodeIds = new Set(keptNodes.map(n => n.element.id));
  const keptEdges = baseResolved.edges.filter(rel => {
    if (!keptNodeIds.has(rel.sourceId) || !keptNodeIds.has(rel.destinationId)) return false;
    const hit = matchesAnyTag(rel.tags, filter.tags);
    return filter.mode === 'include' ? hit : !hit;
  });

  const boundaries = buildBoundariesForNodes(keptNodes, baseView, workspace.elements);
  const mergedSpec: StructurizrViewSpec = {
    ...view,
    scopeElementId: baseView.scopeElementId,
    autoLayout: view.autoLayout ?? baseView.autoLayout
  };

  return {
    spec: mergedSpec,
    title: view.title || baseResolved.title,
    subtitle: `${baseResolved.subtitle} (Filtered)`,
    nodes: keptNodes,
    boundaries,
    edges: keptEdges
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

  if (view.kind === 'filtered') {
    return resolveFilteredView(workspace, view, combinedRelationships);
  }

  const includedIds = new Set<string>();
  const activeEdgeIds = new Set<string>();
  const allowedElement = (el: StructurizrElement): boolean => isElementAllowedInView(el, view, workspace.elements);
  const allowedCouplingNeighbor = (el: StructurizrElement): boolean => isCouplingNeighborAllowedInView(el, view, workspace.elements);

  const addElements = (ids: Iterable<string>): void => {
    const newlyAdded = new Set<string>();
    for (const id of ids) {
      if (workspace.elements[id] && !includedIds.has(id)) {
        includedIds.add(id);
        newlyAdded.add(id);
      }
    }
    if (newlyAdded.size === 0) return;
    for (const rel of combinedRelationships) {
      if (includedIds.has(rel.sourceId) && includedIds.has(rel.destinationId)) {
        if (newlyAdded.has(rel.sourceId) || newlyAdded.has(rel.destinationId)) {
          activeEdgeIds.add(rel.id);
        }
      }
    }
  };

  const removeElements = (ids: Iterable<string>): void => {
    let removedAny = false;
    for (const id of ids) {
      if (includedIds.delete(id)) removedAny = true;
    }
    if (!removedAny) return;
    for (const rel of combinedRelationships) {
      if (!includedIds.has(rel.sourceId) || !includedIds.has(rel.destinationId)) {
        activeEdgeIds.delete(rel.id);
      }
    }
  };

  for (const rule of getEffectiveRules(view)) {
    const raw = rule.expression;
    if (raw === '*') {
      if (rule.action === 'include') {
        addElements(expandWildcard(view, workspace.elements, combinedRelationships));
      } else {
        includedIds.clear();
        activeEdgeIds.clear();
      }
      continue;
    }

    if (!isFilterExpressionSyntax(raw)) {
      if (workspace.elements[raw]) {
        if (rule.action === 'include') addElements([raw]);
        else removeElements([raw]);
      }
      continue;
    }

    const parsed = parseFilterExpression(raw);
    if (!parsed) continue;

    if (parsed.domain === 'element') {
      const matched = evaluateElementExpression(
        parsed.expr,
        workspace.elements,
        combinedRelationships,
        allowedElement,
        allowedCouplingNeighbor
      );
      if (rule.action === 'include') addElements(matched);
      else removeElements(matched);
    } else {
      const matchedRels = evaluateRelationshipExpression(parsed.expr, workspace.elements, combinedRelationships);
      if (rule.action === 'include') {
        for (const rel of combinedRelationships) {
          if (matchedRels.has(rel.id) && includedIds.has(rel.sourceId) && includedIds.has(rel.destinationId)) {
            activeEdgeIds.add(rel.id);
          }
        }
      } else {
        for (const relId of matchedRels) {
          activeEdgeIds.delete(relId);
        }
      }
    }
  }

  const hiddenBaseKeys = getHiddenBaseViewKeys(workspace.views);
  const nodes: ResolvedNode[] = Array.from(includedIds)
    .map(id => workspace.elements[id])
    .filter((el): el is StructurizrElement => Boolean(el))
    .sort((a, b) => a.sourceOrder - b.sourceOrder)
    .map(element => ({
      element,
      external: isExternalInView(element, view),
      drillDownViewKey: findDrillDownViewKey(element, view.key, workspace.views, hiddenBaseKeys)
    }));

  const boundaries = buildBoundariesForNodes(nodes, view, workspace.elements);

  const edges = combinedRelationships
    .filter(rel => activeEdgeIds.has(rel.id) && includedIds.has(rel.sourceId) && includedIds.has(rel.destinationId))
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
  // 公式 Structurizr 仕様に従い、filtered ビューの baseKey として参照されたベースビューは表示一覧から除外する
  const hiddenBaseKeys = getHiddenBaseViewKeys(workspace.views);
  return workspace.views
    .filter(view => !hiddenBaseKeys.has(view.key))
    .map(view => resolveStructurizrView(workspace, view, allRelationships));
}
