/* ==========================================================================
   Structurizr DSL 式フィルタ パーサー＆評価器（Phase 2b）
   公式仕様: https://docs.structurizr.com/dsl/expressions
   - 要素式: element.type / parent / tag / technology / properties / group / -> カップリング
   - 関係式: *->* / relationship==* / source / destination / tag / properties / src->dst
   - 論理結合: && / ||
   ========================================================================== */
import type {
  ElementKind,
  StructurizrElement,
  StructurizrRelationship
} from './types';

export type ExpressionDomain = 'element' | 'relationship';

export type ParsedElementExpr =
  | { type: 'logical'; op: '&&' | '||'; left: ParsedElementExpr; right: ParsedElementExpr }
  | { type: 'id'; ref: string }
  | { type: 'coupling'; afferent: boolean; efferent: boolean; inner: ParsedElementExpr }
  | { type: 'elType'; negated: boolean; kind?: ElementKind; unsupportedType?: string }
  | { type: 'elParent'; negated: boolean; ref: string }
  | { type: 'elTag'; negated: boolean; tags: string[] }
  | { type: 'elTechnology'; negated: boolean; value: string }
  | { type: 'elProperty'; negated: boolean; name: string; value: string }
  | { type: 'elGroup'; negated: boolean; value: string };

export type ParsedRelationshipExpr =
  | { type: 'logical'; op: '&&' | '||'; left: ParsedRelationshipExpr; right: ParsedRelationshipExpr }
  | { type: 'all' }
  | { type: 'endpoints'; sourceRef?: string; destRef?: string }
  | { type: 'relTag'; negated: boolean; tags: string[] }
  | { type: 'relProperty'; negated: boolean; name: string; value: string };

export type ParsedFilterExpr =
  | { domain: 'element'; expr: ParsedElementExpr }
  | { domain: 'relationship'; expr: ParsedRelationshipExpr };

export interface ExpressionValidationIssue {
  code: 'UNKNOWN_REFERENCE' | 'UNSUPPORTED_SYNTAX';
  message: string;
}

const ELEMENT_TYPE_MAP: Record<string, ElementKind> = {
  person: 'person',
  softwaresystem: 'softwareSystem',
  container: 'container',
  component: 'component'
};

const UNSUPPORTED_ELEMENT_TYPES = new Set<string>([
  'deploymentnode',
  'infrastructurenode',
  'softwaresysteminstance',
  'containerinstance',
  'custom'
]);

function splitCsvTags(raw: string): string[] {
  return raw
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function splitTopLevelLogical(raw: string, op: '&&' | '||'): string[] {
  const parts: string[] = [];
  let start = 0;
  let bracketDepth = 0;
  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    if (ch === '[') bracketDepth += 1;
    else if (ch === ']' && bracketDepth > 0) bracketDepth -= 1;
    else if (bracketDepth === 0 && raw.slice(i, i + 2) === op) {
      parts.push(raw.slice(start, i).trim());
      i += 1;
      start = i + 1;
    }
  }
  parts.push(raw.slice(start).trim());
  return parts;
}

function parseRelationshipAtom(raw: string): ParsedRelationshipExpr | null {
  let s = raw.trim();
  if (!s) return null;

  // relationship==... 接頭辞の正規化
  if (/^relationship==/i.test(s)) {
    const rhs = s.slice('relationship=='.length).trim();
    if (rhs === '*' || rhs === '*->*' || /^\*\s*->\s*\*$/.test(rhs)) {
      return { type: 'all' };
    }
    const arrowIdx = rhs.indexOf('->');
    if (arrowIdx >= 0) {
      const src = rhs.slice(0, arrowIdx).trim();
      const dst = rhs.slice(arrowIdx + 2).trim();
      if (!src || !dst) return null;
      if (src === '*' && dst === '*') return { type: 'all' };
      return {
        type: 'endpoints',
        sourceRef: src === '*' ? undefined : src,
        destRef: dst === '*' ? undefined : dst
      };
    }
    return null;
  }

  // relationship.source==<id> / relationship.destination==<id>
  const srcMatch = /^relationship\.source==(.+)$/i.exec(s);
  if (srcMatch) {
    const ref = srcMatch[1].trim();
    return ref ? { type: 'endpoints', sourceRef: ref } : null;
  }
  const dstMatch = /^relationship\.destination==(.+)$/i.exec(s);
  if (dstMatch) {
    const ref = dstMatch[1].trim();
    return ref ? { type: 'endpoints', destRef: ref } : null;
  }

  // relationship.tag==... / !=...
  const tagMatch = /^relationship\.tag(==|!=)(.+)$/i.exec(s);
  if (tagMatch) {
    const tags = splitCsvTags(tagMatch[2]);
    if (tags.length === 0) return null;
    return { type: 'relTag', negated: tagMatch[1] === '!=', tags };
  }

  // relationship.properties[name]==value / !=value
  const propMatch = /^relationship\.properties\[([^\]]+)\](==|!=)(.*)$/i.exec(s);
  if (propMatch) {
    return {
      type: 'relProperty',
      negated: propMatch[2] === '!=',
      name: propMatch[1].trim(),
      value: propMatch[3].trim()
    };
  }

  // <src>-><dst>, *->*, <src>->*, *-><dst>（ただし先頭・末尾の単方向カップリング ->x / x-> や ==/!= を含む要素式は除く）
  if (!s.includes('==') && !s.includes('!=')) {
    const arrowIdx = s.indexOf('->');
    if (arrowIdx > 0 && arrowIdx + 2 < s.length) {
      const src = s.slice(0, arrowIdx).trim();
      const dst = s.slice(arrowIdx + 2).trim();
      if (src && dst && !dst.includes('->')) {
        if (src === '*' && dst === '*') return { type: 'all' };
        return {
          type: 'endpoints',
          sourceRef: src === '*' ? undefined : src,
          destRef: dst === '*' ? undefined : dst
        };
      }
    }
  }

  return null;
}

function parseElementAtom(raw: string): ParsedElementExpr | null {
  let s = raw.trim();
  if (!s) return null;

  // element==... の接頭辞を剥がす（例: element==->api, element==api->, element==->api->, element==api）
  if (/^element==/i.test(s)) {
    s = s.slice('element=='.length).trim();
    if (!s) return null;
  }

  // カップリング表現: ->inner-> / ->inner / inner->
  const startsArrow = s.startsWith('->');
  const endsArrow = s.endsWith('->');
  if (startsArrow || endsArrow) {
    let innerRaw = s;
    if (startsArrow) innerRaw = innerRaw.slice(2);
    if (endsArrow) innerRaw = innerRaw.slice(0, -2);
    innerRaw = innerRaw.trim();
    if (!innerRaw) return null;
    const inner = parseElementExpr(innerRaw);
    if (!inner) return null;
    return {
      type: 'coupling',
      afferent: startsArrow,
      efferent: endsArrow,
      inner
    };
  }

  // element.type==<type> / !=<type>
  const typeMatch = /^element\.type(==|!=)(.+)$/i.exec(s);
  if (typeMatch) {
    const norm = typeMatch[2].trim().toLowerCase().replace(/\s+/g, '');
    const kind = ELEMENT_TYPE_MAP[norm];
    if (kind) {
      return { type: 'elType', negated: typeMatch[1] === '!=', kind };
    }
    if (UNSUPPORTED_ELEMENT_TYPES.has(norm)) {
      return { type: 'elType', negated: typeMatch[1] === '!=', unsupportedType: typeMatch[2].trim() };
    }
    return null;
  }

  // element.parent==<id> / !=<id>
  const parentMatch = /^element\.parent(==|!=)(.+)$/i.exec(s);
  if (parentMatch) {
    const ref = parentMatch[2].trim();
    return ref ? { type: 'elParent', negated: parentMatch[1] === '!=', ref } : null;
  }

  // element.tag==<tag>[,tag] / !=<tag>[,tag]
  const tagMatch = /^element\.tag(==|!=)(.+)$/i.exec(s);
  if (tagMatch) {
    const tags = splitCsvTags(tagMatch[2]);
    if (tags.length === 0) return null;
    return { type: 'elTag', negated: tagMatch[1] === '!=', tags };
  }

  // element.technology==<tech> / !=<tech>
  const techMatch = /^element\.technology(==|!=)(.*)$/i.exec(s);
  if (techMatch) {
    return { type: 'elTechnology', negated: techMatch[1] === '!=', value: techMatch[2].trim() };
  }

  // element.properties[name]==value / !=value
  const propMatch = /^element\.properties\[([^\]]+)\](==|!=)(.*)$/i.exec(s);
  if (propMatch) {
    return {
      type: 'elProperty',
      negated: propMatch[2] === '!=',
      name: propMatch[1].trim(),
      value: propMatch[3].trim()
    };
  }

  // element.group==<name> / !=<name>
  const groupMatch = /^element\.group(==|!=)(.*)$/i.exec(s);
  if (groupMatch) {
    return { type: 'elGroup', negated: groupMatch[1] === '!=', value: groupMatch[2].trim() };
  }

  // その他の等号・不等号を含む未対応式は null
  if (s.includes('==') || s.includes('!=') || s.includes('->')) {
    return null;
  }

  // 単純な識別子参照（例: api, ss.wa）
  return { type: 'id', ref: s };
}

function parseElementExpr(raw: string): ParsedElementExpr | null {
  const orParts = splitTopLevelLogical(raw, '||');
  if (orParts.length > 1) {
    let acc = parseElementExpr(orParts[0]);
    if (!acc) return null;
    for (let i = 1; i < orParts.length; i += 1) {
      const right = parseElementExpr(orParts[i]);
      if (!right) return null;
      acc = { type: 'logical', op: '||', left: acc, right };
    }
    return acc;
  }

  const andParts = splitTopLevelLogical(raw, '&&');
  if (andParts.length > 1) {
    let acc = parseElementAtom(andParts[0]);
    if (!acc) return null;
    for (let i = 1; i < andParts.length; i += 1) {
      const right = parseElementAtom(andParts[i]);
      if (!right) return null;
      acc = { type: 'logical', op: '&&', left: acc, right };
    }
    return acc;
  }

  return parseElementAtom(raw);
}

function parseRelationshipExpr(raw: string): ParsedRelationshipExpr | null {
  const orParts = splitTopLevelLogical(raw, '||');
  if (orParts.length > 1) {
    let acc = parseRelationshipExpr(orParts[0]);
    if (!acc) return null;
    for (let i = 1; i < orParts.length; i += 1) {
      const right = parseRelationshipExpr(orParts[i]);
      if (!right) return null;
      acc = { type: 'logical', op: '||', left: acc, right };
    }
    return acc;
  }

  const andParts = splitTopLevelLogical(raw, '&&');
  if (andParts.length > 1) {
    let acc = parseRelationshipAtom(andParts[0]);
    if (!acc) return null;
    for (let i = 1; i < andParts.length; i += 1) {
      const right = parseRelationshipAtom(andParts[i]);
      if (!right) return null;
      acc = { type: 'logical', op: '&&', left: acc, right };
    }
    return acc;
  }

  return parseRelationshipAtom(raw);
}

/**
 * include / exclude に記述された 1 つの式文字列を解析して AST へ変換する。
 * 構文不正・未対応式の場合は null を返す。
 */
export function parseFilterExpression(raw: string): ParsedFilterExpr | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // 先に結合子を含む場合を含め、relationship 式として解釈できるか判定する
  const rel = parseRelationshipExpr(trimmed);
  if (rel) {
    return { domain: 'relationship', expr: rel };
  }
  const el = parseElementExpr(trimmed);
  if (el) {
    return { domain: 'element', expr: el };
  }
  return null;
}

/**
 * 式が単純な識別子やワイルドカードではなく、式フィルタ構文かどうかを判定する。
 */
export function isFilterExpressionSyntax(raw: string): boolean {
  const s = raw.trim();
  return s.includes('==')
    || s.includes('!=')
    || s.includes('->')
    || s.includes('&&')
    || s.includes('||');
}

function validateAndRewriteElementExpr(
  expr: ParsedElementExpr,
  resolveId: (ref: string) => string | undefined,
  issues: ExpressionValidationIssue[]
): string {
  switch (expr.type) {
    case 'logical': {
      const left = validateAndRewriteElementExpr(expr.left, resolveId, issues);
      const right = validateAndRewriteElementExpr(expr.right, resolveId, issues);
      return `${left} ${expr.op} ${right}`;
    }
    case 'coupling': {
      const inner = validateAndRewriteElementExpr(expr.inner, resolveId, issues);
      return `${expr.afferent ? '->' : ''}${inner}${expr.efferent ? '->' : ''}`;
    }
    case 'id': {
      const resolved = resolveId(expr.ref);
      if (!resolved) {
        issues.push({
          code: 'UNKNOWN_REFERENCE',
          message: `式フィルタ内の識別子 "${expr.ref}" が未定義です`
        });
        return expr.ref;
      }
      return resolved;
    }
    case 'elParent': {
      const resolved = resolveId(expr.ref);
      if (!resolved) {
        issues.push({
          code: 'UNKNOWN_REFERENCE',
          message: `式フィルタ内の親識別子 "${expr.ref}" が未定義です`
        });
        return `element.parent${expr.negated ? '!=' : '=='}${expr.ref}`;
      }
      return `element.parent${expr.negated ? '!=' : '=='}${resolved}`;
    }
    case 'elType': {
      if (expr.unsupportedType) {
        issues.push({
          code: 'UNSUPPORTED_SYNTAX',
          message: `未対応の要素型 "${expr.unsupportedType}" を含む式フィルタは一致なしとして扱います`
        });
        return `element.type${expr.negated ? '!=' : '=='}${expr.unsupportedType}`;
      }
      return `element.type${expr.negated ? '!=' : '=='}${expr.kind}`;
    }
    case 'elTag':
      return `element.tag${expr.negated ? '!=' : '=='}${expr.tags.join(',')}`;
    case 'elTechnology':
      return `element.technology${expr.negated ? '!=' : '=='}${expr.value}`;
    case 'elProperty':
      return `element.properties[${expr.name}]${expr.negated ? '!=' : '=='}${expr.value}`;
    case 'elGroup':
      return `element.group${expr.negated ? '!=' : '=='}${expr.value}`;
  }
}

function validateAndRewriteRelationshipExpr(
  expr: ParsedRelationshipExpr,
  resolveId: (ref: string) => string | undefined,
  issues: ExpressionValidationIssue[]
): string {
  switch (expr.type) {
    case 'logical': {
      const left = validateAndRewriteRelationshipExpr(expr.left, resolveId, issues);
      const right = validateAndRewriteRelationshipExpr(expr.right, resolveId, issues);
      return `${left} ${expr.op} ${right}`;
    }
    case 'all':
      return '*->*';
    case 'endpoints': {
      let src = '*';
      let dst = '*';
      if (expr.sourceRef) {
        const resolved = resolveId(expr.sourceRef);
        if (!resolved) {
          issues.push({
            code: 'UNKNOWN_REFERENCE',
            message: `関係式フィルタ内の識別子 "${expr.sourceRef}" が未定義です`
          });
          src = expr.sourceRef;
        } else {
          src = resolved;
        }
      }
      if (expr.destRef) {
        const resolved = resolveId(expr.destRef);
        if (!resolved) {
          issues.push({
            code: 'UNKNOWN_REFERENCE',
            message: `関係式フィルタ内の識別子 "${expr.destRef}" が未定義です`
          });
          dst = expr.destRef;
        } else {
          dst = resolved;
        }
      }
      return `${src}->${dst}`;
    }
    case 'relTag':
      return `relationship.tag${expr.negated ? '!=' : '=='}${expr.tags.join(',')}`;
    case 'relProperty':
      return `relationship.properties[${expr.name}]${expr.negated ? '!=' : '=='}${expr.value}`;
  }
}

/**
 * Pass 2 で式フィルタ内の識別子を内部要素 ID へ解決・正規化し、未定義参照や未対応型を検出する。
 */
export function normalizeFilterExpression(
  raw: string,
  resolveId: (ref: string) => string | undefined
): { normalized?: string; issues: ExpressionValidationIssue[] } {
  const parsed = parseFilterExpression(raw);
  if (!parsed) {
    return {
      issues: [{
        code: 'UNSUPPORTED_SYNTAX',
        message: `未対応または不正な式フィルタ "${raw}" をスキップしました`
      }]
    };
  }
  const issues: ExpressionValidationIssue[] = [];
  const normalized = parsed.domain === 'element'
    ? validateAndRewriteElementExpr(parsed.expr, resolveId, issues)
    : validateAndRewriteRelationshipExpr(parsed.expr, resolveId, issues);
  return { normalized, issues };
}

function hasAllTags(itemTags: string[], requiredTags: string[]): boolean {
  return requiredTags.every(req => itemTags.includes(req));
}

function resolveElementIdOrIdentifier(
  ref: string,
  elements: Record<string, StructurizrElement>
): string | undefined {
  if (elements[ref]) return ref;
  for (const el of Object.values(elements)) {
    if (el.identifier === ref) return el.id;
  }
  return undefined;
}

export function evaluateElementExpression(
  expr: ParsedElementExpr,
  elements: Record<string, StructurizrElement>,
  relationships: StructurizrRelationship[],
  allowedElement: (el: StructurizrElement) => boolean,
  allowedCouplingNeighbor: (el: StructurizrElement) => boolean = allowedElement
): Set<string> {
  const all = Object.values(elements);
  switch (expr.type) {
    case 'logical': {
      const left = evaluateElementExpression(expr.left, elements, relationships, allowedElement, allowedCouplingNeighbor);
      const right = evaluateElementExpression(expr.right, elements, relationships, allowedElement, allowedCouplingNeighbor);
      if (expr.op === '&&') {
        const out = new Set<string>();
        for (const id of left) {
          if (right.has(id)) out.add(id);
        }
        return out;
      }
      return new Set<string>([...left, ...right]);
    }
    case 'coupling': {
      const seeds = evaluateElementExpression(expr.inner, elements, relationships, allowedElement, allowedCouplingNeighbor);
      const result = new Set<string>(seeds);
      for (const rel of relationships) {
        if (expr.afferent && seeds.has(rel.destinationId)) {
          const src = elements[rel.sourceId];
          if (src && allowedCouplingNeighbor(src)) result.add(src.id);
        }
        if (expr.efferent && seeds.has(rel.sourceId)) {
          const dst = elements[rel.destinationId];
          if (dst && allowedCouplingNeighbor(dst)) result.add(dst.id);
        }
      }
      return result;
    }
    case 'id': {
      const id = resolveElementIdOrIdentifier(expr.ref, elements);
      if (!id) return new Set();
      const el = elements[id];
      return el && allowedElement(el) ? new Set([id]) : new Set();
    }
    case 'elType': {
      if (!expr.kind) return new Set();
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const match = el.kind === expr.kind;
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
    case 'elParent': {
      const parentId = resolveElementIdOrIdentifier(expr.ref, elements);
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const match = Boolean(parentId) && el.parentId === parentId;
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
    case 'elTag': {
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const match = hasAllTags(el.tags, expr.tags);
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
    case 'elTechnology': {
      const target = expr.value.toLowerCase();
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const match = (el.technology || '').toLowerCase() === target;
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
    case 'elProperty': {
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const match = el.properties[expr.name] === expr.value;
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
    case 'elGroup': {
      const out = new Set<string>();
      for (const el of all) {
        if (!allowedElement(el)) continue;
        const fullPath = el.groupPath.join('/');
        const leaf = el.groupPath[el.groupPath.length - 1] || '';
        const match = fullPath === expr.value || leaf === expr.value;
        if (expr.negated ? !match : match) out.add(el.id);
      }
      return out;
    }
  }
}

export function evaluateRelationshipExpression(
  expr: ParsedRelationshipExpr,
  elements: Record<string, StructurizrElement>,
  relationships: StructurizrRelationship[]
): Set<string> {
  switch (expr.type) {
    case 'logical': {
      const left = evaluateRelationshipExpression(expr.left, elements, relationships);
      const right = evaluateRelationshipExpression(expr.right, elements, relationships);
      if (expr.op === '&&') {
        const out = new Set<string>();
        for (const id of left) {
          if (right.has(id)) out.add(id);
        }
        return out;
      }
      return new Set<string>([...left, ...right]);
    }
    case 'all':
      return new Set(relationships.map(r => r.id));
    case 'endpoints': {
      const srcId = expr.sourceRef ? resolveElementIdOrIdentifier(expr.sourceRef, elements) : undefined;
      const dstId = expr.destRef ? resolveElementIdOrIdentifier(expr.destRef, elements) : undefined;
      if (expr.sourceRef && !srcId) return new Set();
      if (expr.destRef && !dstId) return new Set();
      const out = new Set<string>();
      for (const rel of relationships) {
        if (srcId && rel.sourceId !== srcId) continue;
        if (dstId && rel.destinationId !== dstId) continue;
        out.add(rel.id);
      }
      return out;
    }
    case 'relTag': {
      const out = new Set<string>();
      for (const rel of relationships) {
        const match = hasAllTags(rel.tags, expr.tags);
        if (expr.negated ? !match : match) out.add(rel.id);
      }
      return out;
    }
    case 'relProperty': {
      const out = new Set<string>();
      for (const rel of relationships) {
        const match = (rel.properties?.[expr.name]) === expr.value;
        if (expr.negated ? !match : match) out.add(rel.id);
      }
      return out;
    }
  }
}
