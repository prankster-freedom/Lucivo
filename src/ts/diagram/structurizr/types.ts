/* ==========================================================================
   Structurizr（C4 モデル）内部 IR および分離された ViewLayout 型定義（ARC-STR-001）
   Phase 2 の workspace.json ローダーからも同一 IR を生成できるよう、
   論理モデルと座標情報（ViewLayout）を完全に分離する。
   ========================================================================== */

export type ElementKind =
  | 'person'
  | 'softwareSystem'
  | 'container'
  | 'component';

export type ViewKind =
  | 'systemLandscape'
  | 'systemContext'
  | 'container'
  | 'component'
  | 'filtered';

export type AutoLayoutDirection = 'tb' | 'bt' | 'lr' | 'rl';

export type ParseWarningCode =
  | 'UNSUPPORTED_DIRECTIVE'
  | 'UNSUPPORTED_SYNTAX'
  | 'UNKNOWN_REFERENCE'
  | 'DUPLICATE_IDENTIFIER'
  | 'THEME_IGNORED'
  | 'VIEW_NOT_FOUND';

export interface ParseWarning {
  line: number;
  column: number;
  code: ParseWarningCode;
  message: string;
}

export class StructurizrSyntaxError extends Error {
  readonly line: number;
  readonly column: number;

  constructor(message: string, line: number, column: number) {
    super(message);
    this.name = 'StructurizrSyntaxError';
    this.line = line;
    this.column = column;
  }
}

export interface StructurizrElement {
  id: string;
  identifier?: string;
  kind: ElementKind;
  name: string;
  description?: string;
  technology?: string;
  parentId?: string;
  groupPath: string[];
  tags: string[];
  properties: Record<string, string>;
  sourceOrder: number;
}

export interface StructurizrRelationship {
  id: string;
  sourceId: string;
  destinationId: string;
  description?: string;
  technology?: string;
  tags: string[];
  properties?: Record<string, string>;
  implied: boolean;
  sourceOrder: number;
}

export interface AutoLayoutSpec {
  direction: AutoLayoutDirection;
  rankSeparation?: number;
  nodeSeparation?: number;
}

export interface ViewFilterRule {
  action: 'include' | 'exclude';
  expression: string;
}

export interface FilteredViewFilter {
  baseKey: string;
  mode: 'include' | 'exclude';
  tags: string[];
}

export interface StructurizrViewSpec {
  key: string;
  kind: ViewKind;
  scopeElementId?: string;
  title?: string;
  description?: string;
  includes: string[];
  excludes: string[];
  rules?: ViewFilterRule[];
  filter?: FilteredViewFilter;
  autoLayout?: AutoLayoutSpec;
  manualLayout?: ViewLayout;
  isDefault?: boolean;
}

export type ElementShape =
  | 'Box'
  | 'RoundedBox'
  | 'Circle'
  | 'Ellipse'
  | 'Hexagon'
  | 'Cylinder'
  | 'Pipe'
  | 'Person'
  | 'Robot'
  | 'Folder'
  | 'WebBrowser'
  | 'MobileDevicePortrait'
  | 'MobileDeviceLandscape'
  | 'Component';

export interface ElementStyle {
  tag: string;
  shape?: ElementShape;
  background?: string;
  color?: string;
  stroke?: string;
  border?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  width?: number;
  height?: number;
}

export interface RelationshipStyle {
  tag: string;
  color?: string;
  dashed?: boolean;
  thickness?: number;
  routing?: 'Direct' | 'Orthogonal' | 'Curved';
}

export interface StructurizrStyles {
  elements: ElementStyle[];
  relationships: RelationshipStyle[];
}

export interface StructurizrWorkspace {
  name?: string;
  description?: string;
  elements: Record<string, StructurizrElement>;
  relationships: StructurizrRelationship[];
  views: StructurizrViewSpec[];
  styles: StructurizrStyles;
  warnings: ParseWarning[];
}

// --- 論理と完全分離されたレイアウト表現 ---

export interface Point {
  x: number;
  y: number;
}

export interface BoxRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EdgeLayout {
  points: Point[];
  labelPosition?: Point;
}

export interface ViewLayout {
  source: 'manual' | 'auto';
  width: number;
  height: number;
  nodes: Record<string, BoxRect>;
  edges: Record<string, EdgeLayout>;
}

// --- View Resolver の出力型 ---

export interface ResolvedNode {
  element: StructurizrElement;
  external: boolean;
  boundaryId?: string;
  drillDownViewKey?: string;
}

export interface ResolvedBoundary {
  id: string;
  label: string;
  sublabel?: string;
  kind: 'scope' | 'group';
  parentBoundaryId?: string;
  sourceOrder: number;
}

export interface ResolvedView {
  spec: StructurizrViewSpec;
  title: string;
  subtitle: string;
  nodes: ResolvedNode[];
  boundaries: ResolvedBoundary[];
  edges: StructurizrRelationship[];
}
