/* ==========================================================================
   数式の補足グラフ: TeX 数式の正規化・再帰下降構文解析・プロット仕様抽出（FR-048, DD-VTPL-140〜141）
   ========================================================================== */

export const MATH_PLOT_MAX_FUNCS = 4;

export const MATH_PLOT_FUNCS: Record<string, (x: number) => number> = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh,
  sec: (x: number) => 1 / Math.cos(x), csc: (x: number) => 1 / Math.sin(x), cot: (x: number) => 1 / Math.tan(x),
  sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, ln: Math.log, log: Math.log10,
  floor: Math.floor, ceil: Math.ceil, sign: Math.sign,
  sinc: (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x)
};

export const MATH_PLOT_CONSTS: Record<string, number> = { pi: Math.PI, e: Math.E };
export const MATH_PLOT_TRIG_RE = /\b(?:sin|cos|tan|sec|csc|cot)\b/;
export const TEX_FRAC_RE = /\\(?:d|t)?frac\b/;
export const TEX_SQRT_RE = /\\sqrt\b/;
export const TEX_OPERATOR_NAME_RE = /\\(?:operatorname|mathrm)\s*\{\s*([a-zA-Z]+)\s*\}/g;
export const TEX_TRIG_FUNCS_RE = /\\(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sec|csc|cot|exp|ln|log|sqrt|abs|floor|ceil|sign|sinc)\b/g;

// 1 変数の陽関数ではない数式（定積分・総和・極限・行列・テキスト添字・漸化式・微分記号など）を早期に除外する
export const MATH_PLOT_REJECT_RE = /\\(?:int|iint|iiint|oint|sum|prod|coprod|lim|limsup|liminf|infty|partial|nabla|pm|mp|approx|sim|simeq|cong|equiv|ne|neq|propto|subset|subseteq|cup|cap|forall|exists|Rightarrow|Leftrightarrow|to|rightarrow|mapsto|text|textbf|textit|mathbf|mathcal|mathbb)\b|\\begin\{(?:[pbBvV]?matrix|cases| subarray)\}|[_']/;

export const hasOwn = (obj: any, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

export interface PlotToken {
  t: string;
  v?: any;
}

export interface ParsedPlotExpr {
  fn: (x: number) => number;
  usedX: boolean;
  norm: string | null;
}

export interface PlotFunctionItem {
  label: string;
  fn: (x: number) => number;
  usedX: boolean;
  norm: string | null;
}

export interface TexPlotSpec {
  fns: PlotFunctionItem[];
  x: [number, number];
  xPi: boolean;
}

// str[start] の '{' に対応する '}' を探し、中身と次の位置を返す（DD-VTPL-140）
export function extractBracedGroup(str: string, start: number): { content: string; end: number } | null {
  let i = start;
  while (i < str.length && /\s/.test(str[i])) i++;
  if (str[i] !== '{') return null;
  let depth = 1;
  const open = i + 1;
  for (i = open; i < str.length; i++) {
    if (str[i] === '\\') { i++; continue; }
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) return { content: str.slice(open, i), end: i + 1 };
    }
  }
  return null;
}

// TeX の \frac{A}{B} と \sqrt[n]{A} / \sqrt{A} を入れ子の内側から括弧付きの式に展開する（DD-VTPL-140）
export function expandTexConstructs(input: string): string | null {
  let s = input;
  for (let guard = 0; guard < 32; guard++) {
    const fracMatch = TEX_FRAC_RE.exec(s);
    if (fracMatch) {
      const num = extractBracedGroup(s, fracMatch.index + fracMatch[0].length);
      const den = num ? extractBracedGroup(s, num.end) : null;
      if (!num || !den) return null;
      s = `${s.slice(0, fracMatch.index)}((${num.content})/(${den.content}))${s.slice(den.end)}`;
      continue;
    }
    const sqrtMatch = TEX_SQRT_RE.exec(s);
    if (sqrtMatch) {
      let after = sqrtMatch.index + sqrtMatch[0].length;
      while (after < s.length && /\s/.test(s[after])) after++;
      let root = null;
      if (s[after] === '[') {
        const closeBracket = s.indexOf(']', after + 1);
        if (closeBracket < 0) return null;
        root = s.slice(after + 1, closeBracket);
        after = closeBracket + 1;
      }
      const rad = extractBracedGroup(s, after);
      if (!rad) return null;
      const rep = root ? `((${rad.content})^(1/(${root})))` : `sqrt(${rad.content})`;
      s = `${s.slice(0, sqrtMatch.index)}${rep}${s.slice(rad.end)}`;
      continue;
    }
    break;
  }
  return s;
}

// TeX の数式表現を構文解析器が読める形に正規化する。未対応のコマンドがあれば null を返す（DD-VTPL-140）
export function normalizeTexPlotExpr(raw: string): string | null {
  let s = raw
    .replace(/\\(?:,|;|:|!|quad|qquad| )/g, ' ')
    .replace(/~/g, ' ')
    .replace(/\\(?:left|right|[bB]ig(?:l|r|m)?|[bB]igg(?:l|r|m)?)\s*(?=[()[\]|\\])/g, '')
    .replace(/\\(?:lvert|rvert|vert)\b/g, '|')
    .replace(TEX_OPERATOR_NAME_RE, ' $1 ');
  const expanded = expandTexConstructs(s);
  if (expanded === null) return null;
  s = expanded
    .replace(/\\arcsin\b/g, ' asin ')
    .replace(/\\arccos\b/g, ' acos ')
    .replace(/\\arctan\b/g, ' atan ')
    .replace(TEX_TRIG_FUNCS_RE, ' $1 ')
    .replace(/\\pi\b/g, ' pi ')
    .replace(/\\(?:cdot|times|ast)\b/g, '*')
    .replace(/\\div\b/g, '/');
  if (/\\/.test(s)) return null;
  s = s
    .replace(/[−–]/g, '-')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/\*\*/g, '^')
    .replace(/π/g, ' pi ')
    .replace(/\[/g, '(')
    .replace(/\]/g, ')')
    .replace(/\{/g, '(')
    .replace(/\}/g, ')');
  return s.trim();
}

export function tokenizePlotExpr(src: string): PlotToken[] | null {
  const norm = normalizeTexPlotExpr(src);
  if (!norm) return null;
  const tokens: PlotToken[] = [];
  const re = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z]+)|([-+*/^()|]))/y;
  while (re.lastIndex < norm.length && norm.slice(re.lastIndex).trim()) {
    const m = re.exec(norm);
    if (!m) return null;
    if (m[1]) tokens.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2]) tokens.push({ t: 'id', v: m[2].toLowerCase() });
    else tokens.push({ t: m[3] });
  }
  return tokens.length ? tokens : null;
}

class PlotExprParser {
  pos = 0;
  usedX = false;
  inAbs = 0;

  constructor(private readonly tokens: PlotToken[]) {}

  private take(t: string): boolean {
    if (this.tokens[this.pos] && this.tokens[this.pos].t === t) {
      this.pos++;
      return true;
    }
    return false;
  }

  private startsFactor(tok?: PlotToken): boolean {
    return !!tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '(' || (tok.t === '|' && this.inAbs === 0));
  }

  private startsAtom(tok?: PlotToken): boolean {
    return !!tok && (tok.t === 'num' || (tok.t === 'id' && !hasOwn(MATH_PLOT_FUNCS, tok.v)));
  }

  parseExpr(): (x: number) => number {
    let left = this.parseTerm();
    for (;;) {
      const a = left;
      if (this.take('+')) { const b = this.parseTerm(); left = x => a(x) + b(x); }
      else if (this.take('-')) { const b = this.parseTerm(); left = x => a(x) - b(x); }
      else return left;
    }
  }

  private parseTerm(): (x: number) => number {
    let left = this.parseUnary();
    for (;;) {
      const a = left;
      if (this.take('*')) { const b = this.parseUnary(); left = x => a(x) * b(x); }
      else if (this.take('/')) { const b = this.parseUnary(); left = x => a(x) / b(x); }
      else if (this.startsFactor(this.tokens[this.pos])) { const b = this.parsePower(); left = x => a(x) * b(x); }
      else return left;
    }
  }

  private parseUnary(): (x: number) => number {
    if (this.take('-')) { const a = this.parseUnary(); return x => -a(x); }
    if (this.take('+')) return this.parseUnary();
    return this.parsePower();
  }

  private parsePower(): (x: number) => number {
    const base = this.parsePrimary();
    if (this.take('^')) { const exp = this.parseUnary(); return x => Math.pow(base(x), exp(x)); }
    return base;
  }

  // 丸括弧なしの TeX 関数引数（例: \sin 2x, \cos \pi x）を読む
  private parseBareFuncArg(): (x: number) => number {
    if (this.take('-')) { const a = this.parseBareFuncArg(); return x => -a(x); }
    if (this.take('+')) return this.parseBareFuncArg();
    let left = this.parsePower();
    while (this.startsAtom(this.tokens[this.pos])) {
      const a = left;
      const b = this.parsePower();
      left = x => a(x) * b(x);
    }
    return left;
  }

  private parseFuncCall(fnName: string): (x: number) => number {
    const fn = MATH_PLOT_FUNCS[fnName];
    let fnPow: ((x: number) => number) | null = null;
    if (this.take('^')) fnPow = this.parsePrimary();
    let arg: (x: number) => number;
    if (this.take('(')) {
      arg = this.parseExpr();
      if (!this.take(')')) throw new Error('fn-paren');
    } else {
      arg = this.parseBareFuncArg();
    }
    const call = (x: number) => fn(arg(x));
    return fnPow ? (x => Math.pow(call(x), fnPow!(x))) : call;
  }

  private parsePrimary(): (x: number) => number {
    const tok = this.tokens[this.pos++];
    if (!tok) throw new Error('eof');
    if (tok.t === 'num') { const v = tok.v; return () => v; }
    if (tok.t === '(') {
      const inner = this.parseExpr();
      if (!this.take(')')) throw new Error('paren');
      return inner;
    }
    if (tok.t === '|') {
      this.inAbs++;
      const inner = this.parseExpr();
      this.inAbs--;
      if (!this.take('|')) throw new Error('abs');
      return x => Math.abs(inner(x));
    }
    if (tok.t === 'id') {
      if (tok.v === 'x') { this.usedX = true; return x => x; }
      if (hasOwn(MATH_PLOT_CONSTS, tok.v)) { const v = MATH_PLOT_CONSTS[tok.v]; return () => v; }
      if (hasOwn(MATH_PLOT_FUNCS, tok.v)) return this.parseFuncCall(tok.v);
    }
    throw new Error('token');
  }
}

// 式を x の評価関数（クロージャ）に変換する。丸括弧なしの TeX 関数記法（\sin 2x）や関数べき乗（\sin^2 x）、絶対値 |x| にも対応する（DD-VTPL-140）
export function parsePlotExpr(src: string): ParsedPlotExpr | null {
  const tokens = tokenizePlotExpr(src);
  if (!tokens) return null;
  try {
    const parser = new PlotExprParser(tokens);
    const fn = parser.parseExpr();
    if (parser.pos < tokens.length) return null;
    return { fn, usedX: parser.usedX, norm: normalizeTexPlotExpr(src) };
  } catch (_) {
    return null;
  }
}

// 括弧の外側にある区切り（\\、;、,）で TeX 数式を分割する
export function splitTopLevelTex(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\' && str[i + 1] === '\\') {
      if (depth === 0) {
        parts.push(str.slice(start, i));
        start = i + 2;
      }
      i++;
      continue;
    }
    if (ch === '(' || ch === '{' || ch === '[') depth++;
    else if (ch === ')' || ch === '}' || ch === ']') depth = Math.max(0, depth - 1);
    else if (depth === 0 && (ch === ',' || ch === ';')) {
      parts.push(str.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(str.slice(start));
  return parts.map(p => p.trim()).filter(Boolean);
}

// 定義域の記述（例: -2\pi \le x \le 2\pi, x \in [0, 4\pi]）から [lo, hi] を取り出す（DD-VTPL-141）
export function parseTexDomainPart(part: string): { range: [number, number]; xPi: boolean } | null {
  const clean = part.replace(/^\(|\)$/g, '').trim();
  let m = /^(.+?)\s*(?:\\le|\\leq|<|<=)\s*x\s*(?:\\le|\\leq|<|<=)\s*(.+)$/.exec(clean);
  if (!m) m = /^x\s*\\in\s*[\[(]\s*([^,]+)\s*,\s*([^\]\)]+)\s*[\])]$/.exec(clean);
  if (!m) return null;
  const loExpr = parsePlotExpr(m[1]);
  const hiExpr = parsePlotExpr(m[2]);
  if (!loExpr || !hiExpr || loExpr.usedX || hiExpr.usedX) return null;
  const lo = loExpr.fn(0);
  const hi = hiExpr.fn(0);
  if (!(Number.isFinite(lo) && Number.isFinite(hi) && lo < hi)) return null;
  return { range: [lo, hi], xPi: /\\pi|π|\bpi\b/i.test(clean) };
}

// 式の性質（三角関数・減衰振動・定義域が正のみの関数）から見栄えのよい x の既定範囲を選ぶ（DD-VTPL-141）
export function chooseAutoXRange(fns: PlotFunctionItem[]): { range: [number, number]; xPi: boolean } {
  const hasTrig = fns.some(f => f.norm && MATH_PLOT_TRIG_RE.test(f.norm));
  const hasExp = fns.some(f => f.norm && /\b(?:exp|e)\b/.test(f.norm));
  // 負の x で値がすべて NaN になる関数（\sqrt{x}, \ln(x) など）は [0, 10]（三角関数なら [0, 4\pi]）にする
  const negValid = [-4, -2, -1, -0.5].some(x => fns.some(f => Number.isFinite(f.fn(x))));
  if (!negValid) {
    return hasTrig ? { range: [0, 4 * Math.PI], xPi: true } : { range: [0, 10], xPi: false };
  }
  // 減衰振動（e^{-ax}\sin(bx) など、負側で急増し正側で減衰する関数）は [0, 4\pi] にする
  if (hasTrig && hasExp) {
    const negMax = Math.max(...fns.map(f => Math.abs(f.fn(-Math.PI))).filter(Number.isFinite));
    const posMax = Math.max(...fns.map(f => Math.abs(f.fn(Math.PI))).filter(Number.isFinite));
    if (Number.isFinite(negMax) && Number.isFinite(posMax) && posMax > 0 && negMax > posMax * 2.5) {
      return { range: [0, 4 * Math.PI], xPi: true };
    }
  }
  return hasTrig ? { range: [-2 * Math.PI, 2 * Math.PI], xPi: true } : { range: [-5, 5], xPi: false };
}

// TeX の数式文字列がプロット可能な x の関数であれば { fns, x, xPi } を返し、対象外なら null を返す（DD-VTPL-141）
export function parseTexPlotSpec(tex: string): TexPlotSpec | null {
  if (!tex || typeof tex !== 'string') return null;
  let body = tex.trim();
  const envMatch = /^\\begin\{(aligned|align\*?|gathered|array)\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{\1\}$/.exec(body);
  if (envMatch) body = envMatch[2].trim();
  if (MATH_PLOT_REJECT_RE.test(body)) return null;

  let domain: { range: [number, number]; xPi: boolean } | null = null;
  const trailingDomain = /^(.*?)[\s\\,;]*(?:\\quad|\\qquad|\s)\s*(\([^()]*?(?:\\le\b|\\leq\b|<=|<|\\in\b)[^()]*?\))\s*$/.exec(body);
  if (trailingDomain) {
    const d = parseTexDomainPart(trailingDomain[2]);
    if (d) {
      domain = d;
      body = trailingDomain[1].trim();
    }
  }

  const rawParts = splitTopLevelTex(body);
  if (!rawParts.length) return null;

  const fns: PlotFunctionItem[] = [];
  for (const rawPart of rawParts) {
    const part = rawPart.replace(/&/g, '').trim();
    if (!part) continue;
    const d = parseTexDomainPart(part);
    if (d) { domain = d; continue; }
    if (/\\in\b|\\le\b|\\leq\b|<|>/.test(part)) return null;
    const eqMatch = /^(y|[a-zA-Z]\s*(?:\\left)?\(\s*x\s*(?:\\right)?\))\s*=\s*(.+)$/.exec(part);
    if (!eqMatch || fns.length >= MATH_PLOT_MAX_FUNCS) return null;
    const parsed = parsePlotExpr(eqMatch[2]);
    if (!parsed) return null;
    fns.push({ label: part, fn: parsed.fn, usedX: parsed.usedX, norm: parsed.norm });
  }

  if (!fns.length || !fns.some(f => f.usedX)) return null;
  const chosen = domain || chooseAutoXRange(fns);
  const [x0, x1] = chosen.range;
  let finiteCount = 0;
  for (let i = 0; i <= 40; i++) {
    const x = x0 + (x1 - x0) * i / 40;
    if (fns.some(f => Number.isFinite(f.fn(x)))) finiteCount++;
  }
  return finiteCount < 4 ? null : { fns, x: chosen.range, xPi: chosen.xPi };
}
