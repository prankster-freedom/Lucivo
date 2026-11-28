/* ==========================================================================
   Structurizr DSL 2 パス再帰下降パーサー（依存ゼロ・ARC-STR-003）
   Pass 1: 要素登録、group スタック管理、flat 識別子束縛、未解決関係・ビュー収集、
           未対応構文の安全スキップ＋警告収集。
   Pass 2: 関係・ビューの識別子参照解決、既定 systemLandscape ビュー生成。
   ========================================================================== */
import { tokenizeStructurizrDsl, type Token } from './lexer';
import { resolveBuiltinTheme } from './themes';
import { isFilterExpressionSyntax, normalizeFilterExpression } from './expression';
import {
  StructurizrSyntaxError,
  type AutoLayoutDirection,
  type AutoLayoutSpec,
  type ElementKind,
  type ElementShape,
  type ElementStyle,
  type FilteredViewFilter,
  type ParseWarning,
  type ParseWarningCode,
  type RelationshipStyle,
  type StructurizrElement,
  type StructurizrRelationship,
  type StructurizrViewSpec,
  type StructurizrWorkspace,
  type ViewFilterRule,
  type ViewKind
} from './types';

const STANDARD_TAGS: Record<ElementKind, string[]> = {
  person: ['Element', 'Person'],
  softwareSystem: ['Element', 'Software System'],
  container: ['Element', 'Container'],
  component: ['Element', 'Component']
};

const VALID_SHAPES = new Set<string>([
  'Box', 'RoundedBox', 'Circle', 'Ellipse', 'Hexagon', 'Cylinder', 'Pipe',
  'Person', 'Robot', 'Folder', 'WebBrowser', 'MobileDevicePortrait',
  'MobileDeviceLandscape', 'Component'
]);

const VALID_DIRECTIONS = new Set<string>(['tb', 'bt', 'lr', 'rl']);

const CONSTANT_NAME_RE = /^[a-zA-Z0-9_-]+$/;
const CONSTANT_REF_RE = /\$\{([a-zA-Z0-9_-]+)\}/g;

type IdentifierMode = 'flat' | 'hierarchical';

interface RawRelationship {
  sourceId?: string;
  sourceRef?: string;
  destRef: string;
  scopePath: string[];
  description?: string;
  technology?: string;
  tags: string[];
  properties: Record<string, string>;
  line: number;
  column: number;
  sourceOrder: number;
}

interface RawRefToken {
  value: string;
  line: number;
  column: number;
}

interface RawViewRule {
  action: 'include' | 'exclude';
  ref: RawRefToken;
}

interface RawFilteredSpec {
  baseKey: RawRefToken;
  mode: 'include' | 'exclude';
  tags: string[];
}

interface RawView {
  key?: string;
  kind: ViewKind;
  scopeRef?: RawRefToken;
  title?: string;
  description?: string;
  rawRules: RawViewRule[];
  filteredSpec?: RawFilteredSpec;
  autoLayout?: AutoLayoutSpec;
  isDefault?: boolean;
  line: number;
  column: number;
}

function splitTags(values: string[]): string[] {
  const out: string[] = [];
  for (const v of values) {
    for (const part of v.split(',')) {
      const trimmed = part.trim();
      if (trimmed && !out.includes(trimmed)) out.push(trimmed);
    }
  }
  return out;
}

function mergeTags(base: string[], extra: string[]): string[] {
  const out = [...base];
  for (const tag of extra) {
    if (tag && !out.includes(tag)) out.push(tag);
  }
  return out;
}

class DslParser {
  private readonly tokens: Token[];
  private pos = 0;
  private elementSeq = 0;
  private orderSeq = 0;
  private identifierMode: IdentifierMode = 'flat';
  private readonly constants = new Map<string, string>();
  private readonly immutableConstants = new Set<string>();
  private readonly elements: Record<string, StructurizrElement> = {};
  private readonly identifierMap = new Map<string, string>();
  private readonly rawRelationships: RawRelationship[] = [];
  private readonly rawViews: RawView[] = [];
  private readonly themeElementStyles: ElementStyle[] = [];
  private readonly themeRelationshipStyles: RelationshipStyle[] = [];
  private readonly elementStyles: ElementStyle[] = [];
  private readonly relationshipStyles: RelationshipStyle[] = [];
  private readonly warnings: ParseWarning[] = [];
  private workspaceName?: string;
  private workspaceDescription?: string;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private expandConstants(raw: string): string {
    if (this.constants.size === 0 || !raw.includes('${')) return raw;
    return raw.replace(CONSTANT_REF_RE, (match, name: string) => {
      const resolved = this.constants.get(name);
      return resolved !== undefined ? resolved : match;
    });
  }

  private peek(offset = 0): Token {
    const idx = Math.min(this.pos + offset, this.tokens.length - 1);
    return this.tokens[idx];
  }

  private next(): Token {
    const tok = this.peek();
    if (this.pos < this.tokens.length - 1) this.pos += 1;
    if ((tok.type === 'WORD' || tok.type === 'STRING') && this.constants.size > 0 && tok.value.includes('${')) {
      const expanded = this.expandConstants(tok.value);
      if (expanded !== tok.value) {
        return { ...tok, value: expanded };
      }
    }
    return tok;
  }

  private skipNewlines(): void {
    while (this.peek().type === 'NEWLINE') this.next();
  }

  private addWarning(line: number, column: number, code: ParseWarningCode, message: string): void {
    this.warnings.push({ line, column, code, message });
  }

  private readLineTokens(): { args: Token[]; hasBlock: boolean } {
    const args: Token[] = [];
    let hasBlock = false;
    while (true) {
      const tok = this.peek();
      if (tok.type === 'NEWLINE' || tok.type === 'EOF' || tok.type === 'RBRACE') break;
      if (tok.type === 'LBRACE') {
        this.next();
        hasBlock = true;
        break;
      }
      args.push(this.next());
    }
    return { args, hasBlock };
  }

  private skipBlockBody(openLine: number, openCol: number): void {
    let depth = 1;
    while (depth > 0) {
      const tok = this.next();
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('ブロックの閉じ波括弧 "}" が見つかりません', openLine, openCol);
      }
      if (tok.type === 'LBRACE') depth += 1;
      else if (tok.type === 'RBRACE') depth -= 1;
    }
  }

  private skipUnsupportedStatement(tok: Token, code: ParseWarningCode, label: string): void {
    this.addWarning(tok.line, tok.column, code, `未対応構文 "${label}" をスキップしました`);
    const { hasBlock } = this.readLineTokens();
    if (hasBlock) {
      this.skipBlockBody(tok.line, tok.column);
    }
  }

  private expectClosingBrace(openLine: number, openCol: number): void {
    this.skipNewlines();
    if (this.peek().type !== 'RBRACE') {
      throw new StructurizrSyntaxError('ブロックの閉じ波括弧 "}" が見つかりません', openLine, openCol);
    }
    this.next();
  }

  parse(): StructurizrWorkspace {
    this.skipNewlines();
    while (this.peek().type === 'WORD' && this.peek().value.startsWith('!')) {
      const dir = this.next();
      this.handleDirective(dir);
      this.skipNewlines();
    }

    const head = this.peek();
    if (head.type === 'EOF') {
      throw new StructurizrSyntaxError('Structurizr DSL が空です', head.line, head.column);
    }
    if (head.type !== 'WORD' || head.value.toLowerCase() !== 'workspace') {
      throw new StructurizrSyntaxError('トップレベルは "workspace" で始まる必要があります', head.line, head.column);
    }

    const wsTok = this.next();
    const { args, hasBlock } = this.readLineTokens();
    const textArgs = args.filter(a => a.type === 'STRING' || a.type === 'WORD');
    if (textArgs[0] && textArgs[0].value.toLowerCase() !== 'extends') {
      this.workspaceName = textArgs[0].value;
      if (textArgs[1]) this.workspaceDescription = textArgs[1].value;
    } else if (textArgs[0]?.value.toLowerCase() === 'extends') {
      this.addWarning(textArgs[0].line, textArgs[0].column, 'UNSUPPORTED_SYNTAX', '未対応構文 "workspace extends" をスキップしました');
    }

    if (!hasBlock) {
      this.skipNewlines();
      if (this.peek().type === 'LBRACE') {
        this.next();
        this.parseWorkspaceBlock(wsTok.line, wsTok.column);
      } else {
        throw new StructurizrSyntaxError('"workspace" ブロックの "{" が見つかりません', wsTok.line, wsTok.column);
      }
    } else {
      this.parseWorkspaceBlock(wsTok.line, wsTok.column);
    }

    this.skipNewlines();
    if (this.peek().type !== 'EOF') {
      const extra = this.peek();
      if (extra.type === 'RBRACE') {
        throw new StructurizrSyntaxError('対応する "{" のない余分な "}" があります', extra.line, extra.column);
      }
      this.addWarning(extra.line, extra.column, 'UNSUPPORTED_SYNTAX', `workspace ブロック外の記述 "${extra.value}" をスキップしました`);
    }

    return this.resolvePass2();
  }

  private handleDirective(dir: Token): void {
    const lower = dir.value.toLowerCase();
    const { args, hasBlock } = this.readLineTokens();
    if (lower === '!identifiers') {
      const mode = (args[0]?.value || '').toLowerCase();
      if (mode === 'flat' || mode === 'hierarchical') {
        this.identifierMode = mode;
        if (hasBlock) this.skipBlockBody(dir.line, dir.column);
        return;
      }
      this.addWarning(dir.line, dir.column, 'UNSUPPORTED_DIRECTIVE', `未対応ディレクティブ "!identifiers ${args[0]?.value || ''}" は現在の設定（${this.identifierMode}）を維持します`);
      if (hasBlock) this.skipBlockBody(dir.line, dir.column);
      return;
    }
    if (lower === '!const' || lower === '!constant' || lower === '!var') {
      const nameTok = args[0];
      const valueTokens = args.slice(1);
      if (!nameTok || valueTokens.length === 0 || !CONSTANT_NAME_RE.test(nameTok.value)) {
        this.addWarning(dir.line, dir.column, 'UNSUPPORTED_DIRECTIVE', `ディレクティブ "${dir.value}" の書式が不正です（例: !constant NAME "value"）`);
        if (hasBlock) this.skipBlockBody(dir.line, dir.column);
        return;
      }
      const name = nameTok.value;
      const value = valueTokens.map(t => t.value).join(' ');
      if (this.immutableConstants.has(name)) {
        this.addWarning(nameTok.line, nameTok.column, 'DUPLICATE_IDENTIFIER', `定数 "${name}" はすでに定義されています`);
        if (hasBlock) this.skipBlockBody(dir.line, dir.column);
        return;
      }
      this.constants.set(name, value);
      if (lower !== '!var') {
        this.immutableConstants.add(name);
      }
      if (hasBlock) this.skipBlockBody(dir.line, dir.column);
      return;
    }
    this.addWarning(dir.line, dir.column, 'UNSUPPORTED_DIRECTIVE', `未対応ディレクティブ "${dir.value}" をスキップしました`);
    if (hasBlock) this.skipBlockBody(dir.line, dir.column);
  }

  private parseWorkspaceBlock(openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('workspace ブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      if (lower === 'model') {
        this.enterNamedBlock(kw, () => this.parseModelBody(undefined, [], [], kw.line, kw.column));
      } else if (lower === 'views') {
        this.enterNamedBlock(kw, () => this.parseViewsBody(kw.line, kw.column));
      } else if (lower === 'name') {
        const { args } = this.readLineTokens();
        if (args[0]) this.workspaceName = args[0].value;
      } else if (lower === 'description') {
        const { args } = this.readLineTokens();
        if (args[0]) this.workspaceDescription = args[0].value;
      } else {
        this.skipUnsupportedStatement(kw, 'UNSUPPORTED_SYNTAX', kw.value);
      }
    }
  }

  private enterNamedBlock(kw: Token, parseBody: () => void): void {
    const { hasBlock } = this.readLineTokens();
    if (hasBlock) {
      parseBody();
      return;
    }
    this.skipNewlines();
    if (this.peek().type === 'LBRACE') {
      this.next();
      parseBody();
      return;
    }
    throw new StructurizrSyntaxError(`"${kw.value}" の後ろに "{" が必要です`, kw.line, kw.column);
  }

  private parseModelBody(
    parentId: string | undefined,
    groupPath: string[],
    identifierScope: string[],
    openLine: number,
    openCol: number
  ): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('ブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      this.parseModelStatement(parentId, groupPath, identifierScope);
    }
  }

  private parseModelStatement(
    parentId: string | undefined,
    groupPath: string[],
    identifierScope: string[]
  ): void {
    const first = this.peek();
    // ブロック内省略記法: -> target "desc" "tech"
    if (first.type === 'ARROW') {
      this.next();
      this.parseRelationshipRest(parentId, undefined, identifierScope, first.line, first.column);
      return;
    }
    // 変数束縛: id = keyword ...
    if (first.type === 'WORD' && this.peek(1).type === 'EQUALS') {
      const idTok = this.next();
      this.next(); // '='
      const kw = this.next();
      this.parseElementOrUnsupported(idTok, kw, parentId, groupPath, identifierScope);
      return;
    }
    // 明示的関係: src -> dst ...
    if (first.type === 'WORD' && this.peek(1).type === 'ARROW') {
      const srcTok = this.next();
      this.next(); // '->'
      this.parseRelationshipRest(undefined, srcTok.value, identifierScope, srcTok.line, srcTok.column);
      return;
    }
    const kw = this.next();
    this.parseElementOrUnsupported(undefined, kw, parentId, groupPath, identifierScope);
  }

  private parseElementOrUnsupported(
    idTok: Token | undefined,
    kw: Token,
    parentId: string | undefined,
    groupPath: string[],
    identifierScope: string[]
  ): void {
    const lower = kw.value.toLowerCase();
    if (lower === 'group') {
      const { args, hasBlock } = this.readLineTokens();
      const groupName = args[0]?.value || 'Group';
      // 公式仕様: !identifiers hierarchical は group には適用しない（identifierScope をそのまま引き継ぐ）
      if (hasBlock) {
        this.parseModelBody(parentId, [...groupPath, groupName], identifierScope, kw.line, kw.column);
      } else {
        this.skipNewlines();
        if (this.peek().type === 'LBRACE') {
          this.next();
          this.parseModelBody(parentId, [...groupPath, groupName], identifierScope, kw.line, kw.column);
        }
      }
      return;
    }

    const kindMap: Record<string, ElementKind> = {
      person: 'person',
      softwaresystem: 'softwareSystem',
      container: 'container',
      component: 'component'
    };
    const kind = kindMap[lower];
    if (!kind) {
      if (parentId) {
        this.parseElementProperty(parentId, kw);
        return;
      }
      this.skipUnsupportedStatement(kw, 'UNSUPPORTED_SYNTAX', kw.value);
      return;
    }

    const { args, hasBlock } = this.readLineTokens();
    const id = `el-${++this.elementSeq}`;
    const name = args[0]?.value || idTok?.value || kind;
    let description: string | undefined;
    let technology: string | undefined;
    let extraTags: string[] = [];

    if (kind === 'person' || kind === 'softwareSystem') {
      description = args[1]?.value || undefined;
      if (args[2]?.value) extraTags = splitTags([args[2].value]);
    } else {
      description = args[1]?.value || undefined;
      technology = args[2]?.value || undefined;
      if (args[3]?.value) extraTags = splitTags([args[3].value]);
    }

    const qualifiedIdentifier = idTok
      ? (this.identifierMode === 'hierarchical' && identifierScope.length > 0
        ? `${identifierScope.join('.')}.${idTok.value}`
        : idTok.value)
      : undefined;

    const element: StructurizrElement = {
      id,
      identifier: qualifiedIdentifier,
      kind,
      name,
      description,
      technology,
      parentId,
      groupPath: [...groupPath],
      tags: mergeTags(STANDARD_TAGS[kind], extraTags),
      properties: {},
      sourceOrder: ++this.orderSeq
    };
    this.elements[id] = element;

    if (idTok && qualifiedIdentifier) {
      if (this.identifierMap.has(qualifiedIdentifier)) {
        this.addWarning(idTok.line, idTok.column, 'DUPLICATE_IDENTIFIER', `識別子 "${qualifiedIdentifier}" が重複しています`);
      } else {
        this.identifierMap.set(qualifiedIdentifier, id);
      }
    }

    if (hasBlock) {
      const childScope = (this.identifierMode === 'hierarchical' && idTok)
        ? [...identifierScope, idTok.value]
        : identifierScope;
      // 要素直下の groupPath は要素自身の階層でリセットする（配下 container/component の内部 group 用）
      this.parseModelBody(id, [], childScope, kw.line, kw.column);
    }
  }

  private parseElementProperty(elementId: string, kw: Token): void {
    const el = this.elements[elementId];
    const lower = kw.value.toLowerCase();
    const { args, hasBlock } = this.readLineTokens();

    if (lower === 'description' && args[0]) {
      el.description = args[0].value;
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      return;
    }
    if (lower === 'technology' && args[0]) {
      el.technology = args[0].value;
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      return;
    }
    if (lower === 'tags') {
      el.tags = mergeTags(el.tags, splitTags(args.map(a => a.value)));
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      return;
    }
    if (lower === 'properties') {
      if (hasBlock) {
        this.parsePropertiesBlock(el.properties, kw.line, kw.column);
      } else {
        this.skipNewlines();
        if (this.peek().type === 'LBRACE') {
          this.next();
          this.parsePropertiesBlock(el.properties, kw.line, kw.column);
        }
      }
      return;
    }

    this.addWarning(kw.line, kw.column, 'UNSUPPORTED_SYNTAX', `未対応構文 "${kw.value}" をスキップしました`);
    if (hasBlock) this.skipBlockBody(kw.line, kw.column);
  }

  private parsePropertiesBlock(target: Record<string, string>, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('properties ブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      const keyTok = this.next();
      const { args, hasBlock } = this.readLineTokens();
      if (args[0]) {
        target[keyTok.value] = args[0].value;
      }
      if (hasBlock) this.skipBlockBody(keyTok.line, keyTok.column);
    }
  }

  private parseRelationshipRest(
    sourceId: string | undefined,
    sourceRef: string | undefined,
    identifierScope: string[],
    line: number,
    column: number
  ): void {
    const { args, hasBlock } = this.readLineTokens();
    const destTok = args[0];
    if (!destTok) {
      this.addWarning(line, column, 'UNKNOWN_REFERENCE', '関係の先（destination）が指定されていません');
      if (hasBlock) this.skipBlockBody(line, column);
      return;
    }
    const rel: RawRelationship = {
      sourceId,
      sourceRef,
      destRef: destTok.value,
      scopePath: [...identifierScope],
      description: args[1]?.value || undefined,
      technology: args[2]?.value || undefined,
      tags: mergeTags(['Relationship'], args[3]?.value ? splitTags([args[3].value]) : []),
      properties: {},
      line,
      column,
      sourceOrder: ++this.orderSeq
    };
    if (hasBlock) {
      this.parseRelationshipBlock(rel, line, column);
    }
    if (!sourceId && !sourceRef) {
      this.addWarning(line, column, 'UNKNOWN_REFERENCE', '省略記法 "->" は要素ブロック内でのみ使用できます');
      return;
    }
    this.rawRelationships.push(rel);
  }

  private parseRelationshipBlock(rel: RawRelationship, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('関係ブロックが "}" で閉じられていません', openLine, openCol);
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      const { args, hasBlock } = this.readLineTokens();
      if (lower === 'tags') {
        rel.tags = mergeTags(rel.tags, splitTags(args.map(a => a.value)));
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      } else if (lower === 'description' && args[0]) {
        rel.description = args[0].value;
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      } else if (lower === 'technology' && args[0]) {
        rel.technology = args[0].value;
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      } else if (lower === 'properties') {
        if (hasBlock) {
          this.parsePropertiesBlock(rel.properties, kw.line, kw.column);
        } else {
          this.skipNewlines();
          if (this.peek().type === 'LBRACE') {
            this.next();
            this.parsePropertiesBlock(rel.properties, kw.line, kw.column);
          }
        }
      } else {
        this.addWarning(kw.line, kw.column, 'UNSUPPORTED_SYNTAX', `未対応構文 "${kw.value}" をスキップしました`);
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      }
    }
  }

  private parseViewsBody(openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('views ブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      if (lower === 'systemlandscape') {
        this.parseViewDef('systemLandscape', kw, false);
      } else if (lower === 'systemcontext') {
        this.parseViewDef('systemContext', kw, true);
      } else if (lower === 'container') {
        this.parseViewDef('container', kw, true);
      } else if (lower === 'component') {
        this.parseViewDef('component', kw, true);
      } else if (lower === 'filtered') {
        this.parseFilteredViewDef(kw);
      } else if (lower === 'styles') {
        this.enterNamedBlock(kw, () => this.parseStylesBody(kw.line, kw.column));
      } else if (lower === 'theme' || lower === 'themes') {
        const { args, hasBlock } = this.readLineTokens();
        if (args.length === 0) {
          this.addWarning(kw.line, kw.column, 'THEME_IGNORED', 'テーマ名が指定されていません');
        } else {
          for (const arg of args) {
            const builtin = resolveBuiltinTheme(arg.value);
            if (builtin) {
              this.themeElementStyles.push(...builtin.elements);
              this.themeRelationshipStyles.push(...builtin.relationships);
            } else {
              this.addWarning(arg.line, arg.column, 'THEME_IGNORED', `外部テーマ "${arg.value}" はオフライン動作のため無視しました`);
            }
          }
        }
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      } else {
        this.skipUnsupportedStatement(kw, 'UNSUPPORTED_SYNTAX', kw.value);
      }
    }
  }

  private parseViewDef(kind: ViewKind, kw: Token, hasScope: boolean): void {
    const { args, hasBlock } = this.readLineTokens();
    let idx = 0;
    let scopeRef: RawRefToken | undefined;
    if (hasScope && args[idx]) {
      scopeRef = { value: args[idx].value, line: args[idx].line, column: args[idx].column };
      idx += 1;
    }
    const key = args[idx]?.value || undefined;
    if (args[idx]) idx += 1;
    const description = args[idx]?.value || undefined;

    const rawView: RawView = {
      key,
      kind,
      scopeRef,
      description,
      rawRules: [],
      line: kw.line,
      column: kw.column
    };
    if (hasBlock) {
      this.parseViewBlock(rawView, kw.line, kw.column);
    } else {
      this.skipNewlines();
      if (this.peek().type === 'LBRACE') {
        this.next();
        this.parseViewBlock(rawView, kw.line, kw.column);
      }
    }
    this.rawViews.push(rawView);
  }

  private parseFilteredViewDef(kw: Token): void {
    const { args, hasBlock } = this.readLineTokens();
    const baseTok = args[0];
    const modeTok = args[1];
    const tagsTok = args[2];
    const modeLower = (modeTok?.value || '').toLowerCase();

    if (!baseTok || !modeTok || !tagsTok || (modeLower !== 'include' && modeLower !== 'exclude')) {
      this.addWarning(
        kw.line,
        kw.column,
        'UNSUPPORTED_SYNTAX',
        'filtered ビューは "filtered <baseKey> <include|exclude> <tags> [key] [description]" の形式で指定してください'
      );
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      return;
    }

    const key = args[3]?.value || undefined;
    const description = args[4]?.value || undefined;
    const rawView: RawView = {
      key,
      kind: 'filtered',
      description,
      rawRules: [],
      filteredSpec: {
        baseKey: { value: baseTok.value, line: baseTok.line, column: baseTok.column },
        mode: modeLower,
        tags: splitTags([tagsTok.value])
      },
      line: kw.line,
      column: kw.column
    };
    if (hasBlock) {
      this.parseFilteredViewBlock(rawView, kw.line, kw.column);
    } else {
      this.skipNewlines();
      if (this.peek().type === 'LBRACE') {
        this.next();
        this.parseFilteredViewBlock(rawView, kw.line, kw.column);
      }
    }
    this.rawViews.push(rawView);
  }

  private parseFilteredViewBlock(view: RawView, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('filtered ビューブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      const { args, hasBlock } = this.readLineTokens();

      if (lower === 'title' && args[0]) {
        view.title = args[0].value;
      } else if (lower === 'description' && args[0]) {
        view.description = args[0].value;
      } else if (lower === 'default') {
        view.isDefault = true;
      } else {
        this.addWarning(kw.line, kw.column, 'UNSUPPORTED_SYNTAX', `未対応構文 "${kw.value}" をスキップしました`);
      }
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
    }
  }

  private parseViewBlock(view: RawView, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('view ブロックが "}" で閉じられていません', openLine, openCol);
      }
      if (tok.type === 'WORD' && tok.value.startsWith('!')) {
        this.handleDirective(this.next());
        continue;
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      const { args, hasBlock } = this.readLineTokens();

      if (lower === 'include') {
        this.collectViewRules(args, 'include', view.rawRules);
      } else if (lower === 'exclude') {
        this.collectViewRules(args, 'exclude', view.rawRules);
      } else if (lower === 'autolayout') {
        view.autoLayout = this.parseAutoLayout(args);
      } else if (lower === 'title' && args[0]) {
        view.title = args[0].value;
      } else if (lower === 'description' && args[0]) {
        view.description = args[0].value;
      } else if (lower === 'default') {
        view.isDefault = true;
      } else {
        this.addWarning(kw.line, kw.column, 'UNSUPPORTED_SYNTAX', `未対応構文 "${kw.value}" をスキップしました`);
      }
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
    }
  }

  private collectViewRules(args: Token[], action: 'include' | 'exclude', target: RawViewRule[]): void {
    // 1. 空白なしで隣接するトークン（例: element.tag + = + = + Core, -> + api + ->, * + -> + *）を 1 原子へ連結する
    interface Atom {
      value: string;
      line: number;
      column: number;
      quoted: boolean;
    }
    const atoms: Atom[] = [];
    let i = 0;
    while (i < args.length) {
      const start = args[i];
      if (start.type === 'STRING') {
        atoms.push({ value: start.value, line: start.line, column: start.column, quoted: true });
        i += 1;
        continue;
      }
      let combined = start.value;
      let endCol = start.column + start.value.length;
      i += 1;
      while (i < args.length) {
        const cur = args[i];
        if (cur.type === 'STRING') break;
        if (cur.line === start.line && cur.column === endCol) {
          combined += cur.value;
          endCol += cur.value.length;
          i += 1;
        } else {
          break;
        }
      }
      atoms.push({ value: combined, line: start.line, column: start.column, quoted: false });
    }

    // 2. スペース区切りの矢印式（例: a -> b, * -> *）を 1 原子へ結合する
    const mergedArrows: Atom[] = [];
    for (let j = 0; j < atoms.length; j += 1) {
      const cur = atoms[j];
      if (!cur.quoted && cur.value === '->' && mergedArrows.length > 0 && j + 1 < atoms.length) {
        const prev = mergedArrows[mergedArrows.length - 1];
        const next = atoms[j + 1];
        if (!prev.quoted && !next.quoted) {
          prev.value = `${prev.value}->${next.value}`;
          j += 1;
          continue;
        }
      }
      mergedArrows.push({ ...cur });
    }

    // 3. スペース区切りの論理結合（&& / ||）を 1 式へ結合する
    const mergedLogical: Atom[] = [];
    for (let j = 0; j < mergedArrows.length; j += 1) {
      const cur = mergedArrows[j];
      if (!cur.quoted && (cur.value === '&&' || cur.value === '||') && mergedLogical.length > 0 && j + 1 < mergedArrows.length) {
        const prev = mergedLogical[mergedLogical.length - 1];
        const next = mergedArrows[j + 1];
        prev.value = `${prev.value} ${cur.value} ${next.value}`;
        j += 1;
        continue;
      }
      mergedLogical.push(cur);
    }

    for (const atom of mergedLogical) {
      target.push({
        action,
        ref: { value: atom.value, line: atom.line, column: atom.column }
      });
    }
  }

  private parseAutoLayout(args: Token[]): AutoLayoutSpec {
    let direction: AutoLayoutDirection = 'tb';
    let numStart = 0;
    const first = (args[0]?.value || '').toLowerCase();
    if (VALID_DIRECTIONS.has(first)) {
      direction = first as AutoLayoutDirection;
      numStart = 1;
    }
    const rankSep = args[numStart] ? parseInt(args[numStart].value, 10) : NaN;
    const nodeSep = args[numStart + 1] ? parseInt(args[numStart + 1].value, 10) : NaN;
    const spec: AutoLayoutSpec = { direction };
    if (Number.isFinite(rankSep) && rankSep > 0) spec.rankSeparation = rankSep;
    if (Number.isFinite(nodeSep) && nodeSep > 0) spec.nodeSeparation = nodeSep;
    return spec;
  }

  private parseStylesBody(openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('styles ブロックが "}" で閉じられていません', openLine, openCol);
      }
      const kw = this.next();
      const lower = kw.value.toLowerCase();
      const { args, hasBlock } = this.readLineTokens();
      if (lower === 'element' && args[0]) {
        const style: ElementStyle = { tag: args[0].value };
        if (hasBlock) this.parseElementStyleBlock(style, kw.line, kw.column);
        this.elementStyles.push(style);
      } else if (lower === 'relationship' && args[0]) {
        const style: RelationshipStyle = { tag: args[0].value };
        if (hasBlock) this.parseRelationshipStyleBlock(style, kw.line, kw.column);
        this.relationshipStyles.push(style);
      } else {
        this.addWarning(kw.line, kw.column, 'UNSUPPORTED_SYNTAX', `未対応スタイル構文 "${kw.value}" をスキップしました`);
        if (hasBlock) this.skipBlockBody(kw.line, kw.column);
      }
    }
  }

  private parseElementStyleBlock(style: ElementStyle, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('element style ブロックが "}" で閉じられていません', openLine, openCol);
      }
      const kw = this.next();
      const { args, hasBlock } = this.readLineTokens();
      const prop = kw.value.toLowerCase();
      const val = args[0]?.value;
      if (prop === 'shape' && val && VALID_SHAPES.has(val)) style.shape = val as ElementShape;
      else if (prop === 'background' && val) style.background = val;
      else if (prop === 'color' && val) style.color = val;
      else if (prop === 'stroke' && val) style.stroke = val;
      else if (prop === 'border' && val && ['solid', 'dashed', 'dotted'].includes(val.toLowerCase())) {
        style.border = val.toLowerCase() as 'solid' | 'dashed' | 'dotted';
      } else if (prop === 'opacity' && val) {
        const n = Number(val);
        if (Number.isFinite(n)) style.opacity = Math.max(0, Math.min(100, n));
      } else if (prop === 'width' && val) {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) style.width = n;
      } else if (prop === 'height' && val) {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) style.height = n;
      }
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
    }
  }

  private parseRelationshipStyleBlock(style: RelationshipStyle, openLine: number, openCol: number): void {
    while (true) {
      this.skipNewlines();
      const tok = this.peek();
      if (tok.type === 'RBRACE') {
        this.next();
        return;
      }
      if (tok.type === 'EOF') {
        throw new StructurizrSyntaxError('relationship style ブロックが "}" で閉じられていません', openLine, openCol);
      }
      const kw = this.next();
      const { args, hasBlock } = this.readLineTokens();
      const prop = kw.value.toLowerCase();
      const val = args[0]?.value;
      if (prop === 'color' && val) style.color = val;
      else if (prop === 'dashed' && val) style.dashed = val.toLowerCase() === 'true';
      else if (prop === 'style' && val) style.dashed = val.toLowerCase() !== 'solid';
      else if (prop === 'thickness' && val) {
        const n = Number(val);
        if (Number.isFinite(n) && n > 0) style.thickness = n;
      } else if (prop === 'routing' && val) {
        const norm = val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
        if (norm === 'Direct' || norm === 'Orthogonal' || norm === 'Curved') {
          style.routing = norm;
        }
      }
      if (hasBlock) this.skipBlockBody(kw.line, kw.column);
    }
  }

  private resolveIdentifier(ref: string, scopePath: string[] = []): string | undefined {
    if (this.identifierMode === 'hierarchical' && scopePath.length > 0) {
      for (let len = scopePath.length; len >= 1; len -= 1) {
        const candidate = `${scopePath.slice(0, len).join('.')}.${ref}`;
        const hit = this.identifierMap.get(candidate);
        if (hit) return hit;
      }
    }
    return this.identifierMap.get(ref);
  }

  private resolvePass2(): StructurizrWorkspace {
    const relationships: StructurizrRelationship[] = [];
    let relSeq = 0;

    for (const raw of this.rawRelationships) {
      const sourceId = raw.sourceId ?? (raw.sourceRef ? this.resolveIdentifier(raw.sourceRef, raw.scopePath) : undefined);
      const destId = this.resolveIdentifier(raw.destRef, raw.scopePath);
      if (!sourceId) {
        this.addWarning(raw.line, raw.column, 'UNKNOWN_REFERENCE', `未定義の識別子 "${raw.sourceRef || ''}" を参照しています`);
        continue;
      }
      if (!destId) {
        this.addWarning(raw.line, raw.column, 'UNKNOWN_REFERENCE', `未定義の識別子 "${raw.destRef}" を参照しています`);
        continue;
      }
      relationships.push({
        id: `rel-${++relSeq}`,
        sourceId,
        destinationId: destId,
        description: raw.description,
        technology: raw.technology,
        tags: raw.tags,
        properties: Object.keys(raw.properties).length > 0 ? raw.properties : undefined,
        implied: false,
        sourceOrder: raw.sourceOrder
      });
    }

    const usedKeys = new Set<string>();
    const kindCounter: Record<ViewKind, number> = {
      systemLandscape: 0,
      systemContext: 0,
      container: 0,
      component: 0,
      filtered: 0
    };

    const allocateViewKey = (raw: RawView): string => {
      let key = raw.key;
      if (!key) {
        kindCounter[raw.kind] += 1;
        const prefix = raw.kind.charAt(0).toUpperCase() + raw.kind.slice(1);
        key = `${prefix}-${kindCounter[raw.kind]}`;
      }
      if (usedKeys.has(key)) {
        let suffix = 2;
        while (usedKeys.has(`${key}-${suffix}`)) suffix += 1;
        key = `${key}-${suffix}`;
      }
      usedKeys.add(key);
      return key;
    };

    // 1. 通常ビューを先に解決して baseKey 参照テーブルを構築する
    const resolvedByRaw = new Map<RawView, StructurizrViewSpec>();
    const baseKeyExact = new Map<string, string>();
    const baseKeyLower = new Map<string, string>();

    for (const raw of this.rawViews) {
      if (raw.kind === 'filtered') continue;
      let scopeElementId: string | undefined;
      if (raw.scopeRef) {
        scopeElementId = this.resolveIdentifier(raw.scopeRef.value);
        if (!scopeElementId) {
          this.addWarning(
            raw.scopeRef.line,
            raw.scopeRef.column,
            'UNKNOWN_REFERENCE',
            `ビューの対象識別子 "${raw.scopeRef.value}" が未定義のためスキップしました`
          );
          continue;
        }
      }

      const rules: ViewFilterRule[] = [];
      const includes: string[] = [];
      const excludes: string[] = [];

      for (const rule of raw.rawRules) {
        const ref = rule.ref;
        if (ref.value === '*') {
          rules.push({ action: rule.action, expression: '*' });
          if (rule.action === 'include' && !includes.includes('*')) includes.push('*');
          if (rule.action === 'exclude' && !excludes.includes('*')) excludes.push('*');
          continue;
        }

        if (isFilterExpressionSyntax(ref.value)) {
          const { normalized, issues } = normalizeFilterExpression(ref.value, id => this.resolveIdentifier(id));
          for (const issue of issues) {
            this.addWarning(ref.line, ref.column, issue.code, issue.message);
          }
          if (normalized) {
            rules.push({ action: rule.action, expression: normalized });
            if (rule.action === 'include' && !includes.includes(normalized)) includes.push(normalized);
            if (rule.action === 'exclude' && !excludes.includes(normalized)) excludes.push(normalized);
          }
          continue;
        }

        const resolved = this.resolveIdentifier(ref.value);
        if (!resolved) {
          this.addWarning(ref.line, ref.column, 'UNKNOWN_REFERENCE', `${rule.action} 対象 "${ref.value}" が未定義です`);
          continue;
        }
        rules.push({ action: rule.action, expression: resolved });
        if (rule.action === 'include' && !includes.includes(resolved)) includes.push(resolved);
        if (rule.action === 'exclude' && !excludes.includes(resolved)) excludes.push(resolved);
      }

      const hasIncludeRule = rules.some(r => r.action === 'include');
      if (!hasIncludeRule) {
        rules.unshift({ action: 'include', expression: '*' });
        if (!includes.includes('*')) includes.unshift('*');
      }

      const key = allocateViewKey(raw);
      baseKeyExact.set(key, key);
      baseKeyLower.set(key.toLowerCase(), key);

      resolvedByRaw.set(raw, {
        key,
        kind: raw.kind,
        scopeElementId,
        title: raw.title,
        description: raw.description,
        includes: includes.length > 0 ? includes : ['*'],
        excludes,
        rules,
        autoLayout: raw.autoLayout ?? { direction: 'tb' },
        isDefault: raw.isDefault
      });
    }

    // 2. filtered ビューの baseKey を解決し、宣言順を維持して views を組み立てる
    const views: StructurizrViewSpec[] = [];
    for (const raw of this.rawViews) {
      if (raw.kind !== 'filtered') {
        const spec = resolvedByRaw.get(raw);
        if (spec) views.push(spec);
        continue;
      }

      const fspec = raw.filteredSpec;
      if (!fspec) continue;
      const canonicalBaseKey = baseKeyExact.get(fspec.baseKey.value)
        ?? baseKeyLower.get(fspec.baseKey.value.toLowerCase());
      if (!canonicalBaseKey) {
        this.addWarning(
          fspec.baseKey.line,
          fspec.baseKey.column,
          'UNKNOWN_REFERENCE',
          `filtered ビューのベースビュー "${fspec.baseKey.value}" が見つからないためスキップしました`
        );
        continue;
      }

      const key = allocateViewKey(raw);
      const filter: FilteredViewFilter = {
        baseKey: canonicalBaseKey,
        mode: fspec.mode,
        tags: fspec.tags
      };
      views.push({
        key,
        kind: 'filtered',
        title: raw.title,
        description: raw.description,
        includes: [],
        excludes: [],
        filter,
        isDefault: raw.isDefault
      });
    }

    if (views.length === 0) {
      views.push({
        key: 'SystemLandscape',
        kind: 'systemLandscape',
        title: this.workspaceName || 'System Landscape',
        includes: ['*'],
        excludes: [],
        rules: [{ action: 'include', expression: '*' }],
        autoLayout: { direction: 'tb' }
      });
    }

    return {
      name: this.workspaceName,
      description: this.workspaceDescription,
      elements: this.elements,
      relationships,
      views,
      styles: {
        // 公式仕様に従い、内蔵テーマをベースとしてワークスペース styles が上書きする順で合成する
        elements: [...this.themeElementStyles, ...this.elementStyles],
        relationships: [...this.themeRelationshipStyles, ...this.relationshipStyles]
      },
      warnings: this.warnings
    };
  }
}

export function parseStructurizrDsl(source: string): StructurizrWorkspace {
  const tokens = tokenizeStructurizrDsl(source);
  const parser = new DslParser(tokens);
  return parser.parse();
}
