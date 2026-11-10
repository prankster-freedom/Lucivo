import { hexToRgba } from '../utils/color';

/* ==========================================================================
   数式の補足グラフ（FR-048, DD-VTPL-140〜144）: インライン数式・ブロック数式から x の関数（y = f(x)）を検出し、
   Visualモードに切り替えたときに Canvas でプロット計算して PNG ラスター画像に変換し、数式と併記で表示する。
   式は自前の再帰下降構文解析で読み、eval・new Function は使わない（NFR-003）
   ========================================================================== */

export const MATH_PLOT_MAX_FUNCS = 4;
export const MATH_PLOT_PALETTES: Record<string, string[]> = {
  shapes: ['#E29578', '#EBB453', '#6CC4C9', '#9CCB86'],
  cards: ['#E29578', '#E6B34B', '#A3B4E4', '#6DB1B4'],
  circles: ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763'],
  editorial: ['#D68C8C', '#8FA876', '#C9A66B', '#8FA3B8']
};

export interface MathPlotBoxConfig {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  samples: number;
}

export const MATH_PLOT_BOX: { block: MathPlotBoxConfig; inline: MathPlotBoxConfig } = {
  block: { w: 340, h: 200, left: 42, right: 14, top: 14, bottom: 26, samples: 480 },
  inline: { w: 156, h: 84, left: 26, right: 8, top: 8, bottom: 16, samples: 240 }
};

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

export const hasOwn = (obj: any, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

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

export interface PlotToken {
  t: string;
  v?: any;
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

export interface ParsedPlotExpr {
  fn: (x: number) => number;
  usedX: boolean;
  norm: string | null;
}

// 式を x の評価関数（クロージャ）に変換する。丸括弧なしの TeX 関数記法（\sin 2x）や関数べき乗（\sin^2 x）、絶対値 |x| にも対応する（DD-VTPL-140）
export function parsePlotExpr(src: string): ParsedPlotExpr | null {
  const tokens = tokenizePlotExpr(src);
  if (!tokens) return null;
  let pos = 0;
  let usedX = false;
  let inAbs = 0;
  const take = (t: string) => {
    if (tokens[pos] && tokens[pos].t === t) { pos++; return true; }
    return false;
  };
  const startsFactor = (tok?: PlotToken) => tok && (tok.t === 'num' || tok.t === 'id' || tok.t === '(' || (tok.t === '|' && inAbs === 0));
  const startsAtom = (tok?: PlotToken) => tok && (tok.t === 'num' || (tok.t === 'id' && !hasOwn(MATH_PLOT_FUNCS, tok.v)));
  try {
    function expr(): (x: number) => number {
      let left = term();
      for (;;) {
        const a = left;
        if (take('+')) { const b = term(); left = x => a(x) + b(x); }
        else if (take('-')) { const b = term(); left = x => a(x) - b(x); }
        else return left;
      }
    }
    function term(): (x: number) => number {
      let left = unary();
      for (;;) {
        const a = left;
        if (take('*')) { const b = unary(); left = x => a(x) * b(x); }
        else if (take('/')) { const b = unary(); left = x => a(x) / b(x); }
        else if (startsFactor(tokens[pos])) { const b = power(); left = x => a(x) * b(x); }
        else return left;
      }
    }
    function unary(): (x: number) => number {
      if (take('-')) { const a = unary(); return x => -a(x); }
      if (take('+')) return unary();
      return power();
    }
    function power(): (x: number) => number {
      const base = primary();
      if (take('^')) { const exp = unary(); return x => Math.pow(base(x), exp(x)); }
      return base;
    }
    // 丸括弧なしの TeX 関数引数（例: \sin 2x, \cos \pi x）を読む
    function bareFuncArg(): (x: number) => number {
      if (take('-')) { const a = bareFuncArg(); return x => -a(x); }
      if (take('+')) return bareFuncArg();
      let left = power();
      while (startsAtom(tokens[pos])) {
        const a = left;
        const b = power();
        left = x => a(x) * b(x);
      }
      return left;
    }
    function primary(): (x: number) => number {
      const tok = tokens[pos++];
      if (!tok) throw new Error('eof');
      if (tok.t === 'num') { const v = tok.v; return () => v; }
      if (tok.t === '(') {
        const inner = expr();
        if (!take(')')) throw new Error('paren');
        return inner;
      }
      if (tok.t === '|') {
        inAbs++;
        const inner = expr();
        inAbs--;
        if (!take('|')) throw new Error('abs');
        return x => Math.abs(inner(x));
      }
      if (tok.t === 'id') {
        if (tok.v === 'x') { usedX = true; return x => x; }
        if (hasOwn(MATH_PLOT_CONSTS, tok.v)) { const v = MATH_PLOT_CONSTS[tok.v]; return () => v; }
        if (hasOwn(MATH_PLOT_FUNCS, tok.v)) {
          const fn = MATH_PLOT_FUNCS[tok.v];
          let fnPow: ((x: number) => number) | null = null;
          if (take('^')) fnPow = primary();
          let arg: (x: number) => number;
          if (take('(')) {
            arg = expr();
            if (!take(')')) throw new Error('fn-paren');
          } else {
            arg = bareFuncArg();
          }
          const call = (x: number) => fn(arg(x));
          return fnPow ? (x => Math.pow(call(x), fnPow!(x))) : call;
        }
      }
      throw new Error('token');
    }
    const fn = expr();
    if (pos < tokens.length) return null;
    return { fn, usedX, norm: normalizeTexPlotExpr(src) };
  } catch (e) {
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

export interface PlotFunctionItem {
  label: string;
  fn: (x: number) => number;
  usedX: boolean;
  norm: string | null;
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

export interface TexPlotSpec {
  fns: PlotFunctionItem[];
  x: [number, number];
  xPi: boolean;
}

// TeX の数式文字列がプロット可能な x の関数であれば { fns, x, xPi } を返し、対象外なら null を返す（DD-VTPL-141）
export function parseTexPlotSpec(tex: string): TexPlotSpec | null {
  if (!tex || typeof tex !== 'string') return null;
  let body = tex.trim();
  const envMatch = /^\\begin\{(aligned|align\*?|gathered|array)\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{\1\}$/.exec(body);
  if (envMatch) body = envMatch[2].trim();
  if (MATH_PLOT_REJECT_RE.test(body)) return null;

  let domain: { range: [number, number]; xPi: boolean } | null = null;
  // 末尾に \quad (-2\pi \le x \le 2\pi) のように添えられた定義域を先に切り出す
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
    if (d) {
      domain = d;
      continue;
    }
    if (/\\in\b|\\le\b|\\leq\b|<|>/.test(part)) return null;
    const eqMatch = /^(y|[a-zA-Z]\s*(?:\\left)?\(\s*x\s*(?:\\right)?\))\s*=\s*(.+)$/.exec(part);
    if (!eqMatch) return null;
    if (fns.length >= MATH_PLOT_MAX_FUNCS) return null;
    const parsed = parsePlotExpr(eqMatch[2]);
    if (!parsed) return null;
    fns.push({ label: part, fn: parsed.fn, usedX: parsed.usedX, norm: parsed.norm });
  }

  if (!fns.length || !fns.some(f => f.usedX)) return null;
  const chosen = domain || chooseAutoXRange(fns);
  const [x0, x1] = chosen.range;
  // 区間内で有限な値が十分に得られるか確かめる
  let finiteCount = 0;
  for (let i = 0; i <= 40; i++) {
    const x = x0 + (x1 - x0) * i / 40;
    if (fns.some(f => Number.isFinite(f.fn(x)))) finiteCount++;
  }
  if (finiteCount < 4) return null;
  return { fns, x: chosen.range, xPi: chosen.xPi };
}

// y の範囲はサンプリング値の 2〜98% パーセンタイル範囲に余白を足して決め、tan 等の発散で潰れないようにする（DD-VTPL-142）
export function autoPlotRange(series: [number, number][][]): [number, number] {
  const ys = series.flat().map(p => p[1]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ys.length) return [-1, 1];
  let lo = ys[Math.floor((ys.length - 1) * 0.02)];
  let hi = ys[Math.ceil((ys.length - 1) * 0.98)];
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

export interface PlotTick {
  v: number;
  label: string;
}

export function plotTicks(lo: number, hi: number, target: number): PlotTick[] {
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw * 0.999) || mag;
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks: PlotTick[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) {
    const value = Math.abs(v) < step * 1e-9 ? 0 : v;
    ticks.push({ v: value, label: Number(value.toFixed(digits)).toString().replace('-', '−') });
  }
  return ticks;
}

export function plotPiTicks(lo: number, hi: number, maxTicks = 9): PlotTick[] {
  for (const unit of [1, 2, 4]) {
    const step = Math.PI / 2 * unit;
    const ticks: PlotTick[] = [];
    for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
      const half = k * unit;
      const sign = half < 0 ? '−' : '';
      const n = Math.abs(half);
      const label = n === 0 ? '0' : n % 2 === 0 ? `${sign}${n / 2 === 1 ? '' : n / 2}π` : `${sign}${n === 1 ? '' : n}π/2`;
      ticks.push({ v: k * step, label });
    }
    if (ticks.length <= maxTicks) return ticks;
  }
  return plotTicks(lo, hi, Math.max(3, maxTicks - 2));
}

// サンプリング点列から不連続点（漸近線や定義域外）で切断した連続区間の点列群を生成する（DD-VTPL-142）
export function splitPlotSegments(
  pts: [number, number][],
  top: number,
  ph: number,
  sx: (x: number) => number,
  sy: (y: number) => number
): [number, number][][] {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  let prevPy: number | null = null;
  pts.forEach(([x, y]) => {
    const py = Number.isFinite(y) ? sy(y) : NaN;
    const ok = Number.isFinite(py) && py > top - ph * 3 && py < top + ph * 4;
    if (!ok) {
      if (current.length > 1) segments.push(current);
      current = [];
      prevPy = null;
      return;
    }
    if (prevPy !== null && Math.abs(py - prevPy) > ph * 1.4) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push([sx(x), py]);
    prevPy = py;
  });
  if (current.length > 1) segments.push(current);
  return segments;
}

// 関数仕様 spec をオフスクリーン Canvas にプロット描画し、PNG ラスター画像の Data URL に変換する（DD-VTPL-143）
export function renderMathPlotToDataUrl(
  spec: TexPlotSpec,
  isDisplay: boolean,
  style: string,
  appearance: string
): string {
  const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
  const { w, h, left, right, top, bottom, samples } = box;
  const pw = w - left - right;
  const ph = h - top - bottom;
  const [x0, x1] = spec.x;
  const series: [number, number][][] = spec.fns.map(f => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= samples; i++) {
      const x = x0 + (x1 - x0) * i / samples;
      pts.push([x, f.fn(x)]);
    }
    return pts;
  });
  const [y0, y1] = autoPlotRange(series);
  const sx = (x: number) => left + (x - x0) / (x1 - x0) * pw;
  const sy = (y: number) => top + (y1 - y) / (y1 - y0) * ph;

  const isDark = appearance === 'dark';
  const palette = MATH_PLOT_PALETTES[style] || MATH_PLOT_PALETTES.shapes;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  // 1. プロット領域の背景グラデーション
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, top, pw, ph);
  ctx.clip();

  const bgGrad = ctx.createLinearGradient(0, top, 0, top + ph);
  if (isDark) {
    bgGrad.addColorStop(0, '#0B1120');
    bgGrad.addColorStop(1, '#152033');
  } else {
    bgGrad.addColorStop(0, '#F8FAFC');
    bgGrad.addColorStop(1, '#FFFFFF');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(left, top, pw, ph);

  // 2. グリッド線（破線）
  const xTicks = spec.xPi ? plotPiTicks(x0, x1, isDisplay ? 9 : 5) : plotTicks(x0, x1, isDisplay ? 6 : 3);
  const yTicks = plotTicks(y0, y1, isDisplay ? 4 : 2);
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  xTicks.forEach(t => {
    const px = sx(t.v);
    ctx.moveTo(px, top);
    ctx.lineTo(px, top + ph);
  });
  yTicks.forEach(t => {
    const py = sy(t.v);
    ctx.moveTo(left, py);
    ctx.lineTo(left + pw, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 3. 原点軸（x = 0, y = 0）
  ctx.strokeStyle = isDark ? 'rgba(203, 213, 225, 0.42)' : 'rgba(71, 85, 105, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  if (y0 <= 0 && y1 >= 0) {
    const py0 = sy(0);
    ctx.moveTo(left, py0);
    ctx.lineTo(left + pw, py0);
  }
  if (x0 <= 0 && x1 >= 0) {
    const px0 = sx(0);
    ctx.moveTo(px0, top);
    ctx.lineTo(px0, top + ph);
  }
  ctx.stroke();

  // 4. 連続区間に分割した点列を作成（漸近線や定義域外で線を切る）
  const basePy = sy(Math.min(y1, Math.max(y0, 0)));
  const segmentsBySeries = series.map(pts => splitPlotSegments(pts, top, ph, sx, sy));

  // 5. 単一関数のときは曲線と基準線の間に淡いグラデーション塗りを施す
  if (segmentsBySeries.length === 1) {
    const c1 = palette[0];
    const fillGrad = ctx.createLinearGradient(0, top, 0, top + ph);
    fillGrad.addColorStop(0, hexToRgba(c1, isDark ? 0.24 : 0.18));
    fillGrad.addColorStop(1, hexToRgba(c1, 0.02));
    ctx.fillStyle = fillGrad;
    segmentsBySeries[0].forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], basePy);
      seg.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(seg[seg.length - 1][0], basePy);
      ctx.closePath();
      ctx.fill();
    });
  }

  // 6. 曲線本体の描画（光彩＋アンチエイリアス曲線）
  segmentsBySeries.forEach((segments, idx) => {
    const color = palette[idx % palette.length];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = isDisplay ? 2.25 : 1.75;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = hexToRgba(color, isDark ? 0.55 : 0.3);
    ctx.shadowBlur = isDisplay ? 6 : 3;
    ctx.beginPath();
    segments.forEach(seg => {
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
    });
    ctx.stroke();
    ctx.restore();
  });

  // 複数関数のときはプロット領域の右上に色スウォッチバーを添える
  if (isDisplay && spec.fns.length > 1) {
    const swW = 14;
    const swGap = 5;
    const totalW = spec.fns.length * swW + (spec.fns.length - 1) * swGap;
    let swX = left + pw - totalW - 8;
    const swY = top + 8;
    spec.fns.forEach((_, idx) => {
      ctx.fillStyle = palette[idx % palette.length];
      ctx.fillRect(swX, swY, swW, 3.5);
      swX += swW + swGap;
    });
  }

  ctx.restore();

  // 7. プロット領域の枠線
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.38)';
  ctx.lineWidth = 1;
  ctx.strokeRect(left, top, pw, ph);

  // 8. 座標軸の目盛りラベル
  ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
  ctx.font = isDisplay ? '500 10px "JetBrains Mono", monospace' : '500 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xLabelTicks = isDisplay || xTicks.length <= 3 ? xTicks : [xTicks[0], xTicks[Math.floor(xTicks.length / 2)], xTicks[xTicks.length - 1]];
  xLabelTicks.forEach(t => {
    const px = sx(t.v);
    if (px >= left - 2 && px <= left + pw + 2) {
      ctx.fillText(t.label, px, top + ph + (isDisplay ? 6 : 3));
    }
  });

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yLabelTicks = isDisplay || yTicks.length <= 3 ? yTicks : [yTicks[0], yTicks[yTicks.length - 1]];
  yLabelTicks.forEach(t => {
    const py = sy(t.v);
    if (py >= top + 4 && py <= top + ph - 4) {
      ctx.fillText(t.label, left - (isDisplay ? 6 : 4), py);
    }
  });

  return canvas.toDataURL('image/png');
}

// プロット仕様のキャッシュ
const mathSpecCache = new Map<string, TexPlotSpec | null>();

export function getTexPlotSpec(tex: string): TexPlotSpec | null {
  if (!mathSpecCache.has(tex)) {
    mathSpecCache.set(tex, parseTexPlotSpec(tex));
  }
  return mathSpecCache.get(tex) ?? null;
}

// プロット画像 DataURL のキャッシュ
const mathPlotCache = new Map<string, string>();

export function getCachedMathPlotDataUrl(
  plotSpec: TexPlotSpec,
  isDisplay: boolean,
  style: string,
  appearance: string,
  tex: string
): string {
  const plotKey = `${isDisplay ? 'D' : 'I'}:${style}:${appearance}:${tex}`;
  if (!mathPlotCache.has(plotKey)) {
    mathPlotCache.set(plotKey, renderMathPlotToDataUrl(plotSpec, isDisplay, style, appearance));
  }
  return mathPlotCache.get(plotKey)!;
}

export function clearMathPlotCache(): void {
  mathSpecCache.clear();
  mathPlotCache.clear();
}

