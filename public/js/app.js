(() => {
  // src/ts/utils/escape.ts
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] || ch);
  }

  // src/ts/utils/color.ts
  function hexToRgba(hex, alpha) {
    const v = parseInt(hex.replace("#", ""), 16);
    return `rgba(${v >> 16 & 255}, ${v >> 8 & 255}, ${v & 255}, ${alpha})`;
  }

  // src/ts/markdown/tree.ts
  var TREE_LANGS = ["tree", "filetree", "dirtree"];
  var TREE_BRANCH_CHARS = "├┣└┗+`\\";
  var TREE_PIPE_CHARS = "│┃|";
  var TREE_LINE_CHARS = "─━-";
  var TREE_FULLWIDTH_SPACE = String.fromCharCode(12288);
  var TREE_NOTE_RE = /\s+(?:#|\/\/|←|<-{1,2})\s*(.*)$/;
  var TREE_KIND_RES = [
    ["doc", /\.(?:md|markdown|mdx|txt|rst|adoc|pdf|docx?|xlsx?|pptx?|csv)$/i],
    ["image", /\.(?:png|jpe?g|gif|svg|webp|avif|bmp|ico|drawio)$/i],
    ["code", /\.(?:[cm]?[jt]sx?|json|ya?ml|toml|xml|html?|css|scss|py|rb|go|rs|java|kt|swift|c|h|cc|cpp|hpp|cs|php|sh|bash|ps1|bat|sql|vue|svelte|ini|env|lock)$/i]
  ];
  function splitTreeLine(line) {
    let col = 0;
    let branchCol = -1;
    let ascii = false;
    let i = 0;
    for (; i < line.length; i++) {
      const ch = line[i];
      const next = line[i + 1] || "";
      if (ch === " ") {
        col += 1;
      } else if (ch === TREE_FULLWIDTH_SPACE) {
        col += 2;
      } else if (branchCol < 0 && TREE_BRANCH_CHARS.includes(ch) && (ch !== "\\" || TREE_LINE_CHARS.includes(next))) {
        branchCol = col;
        ascii = ascii || !"├┣└┗".includes(ch);
        col += 1;
      } else if (branchCol < 0 && ch === "|" && TREE_LINE_CHARS.includes(next)) {
        branchCol = col;
        ascii = true;
        col += 1;
      } else if (TREE_PIPE_CHARS.includes(ch) && branchCol < 0) {
        ascii = ascii || ch === "|";
        col += 1;
      } else if (TREE_LINE_CHARS.includes(ch) && branchCol >= 0) {
        col += 1;
      } else {
        break;
      }
    }
    const rest = line.slice(i).trim();
    if (!rest) return branchCol < 0 ? null : { branchCol: -1, indent: 0, hasPipe: false, ascii: false, text: "", invalid: true };
    const prefix = line.slice(0, i);
    return { branchCol, indent: col, hasPipe: /[│┃|]/.test(prefix), ascii, text: rest };
  }
  var TREE_PLAIN_FILES = /^(?:readme|license|licence|changelog|makefile|dockerfile|gemfile|procfile|jenkinsfile|vagrantfile|notice|authors|copying)$/i;
  function treeNodeKind(name, isFolder) {
    if (isFolder) return "folder";
    const hit = TREE_KIND_RES.find(([, re]) => re.test(name));
    if (hit) return hit[0];
    if (/\.[^.\s]+$/.test(name) || /^(?:\.{3}|…+)$/.test(name)) return "file";
    if (TREE_PLAIN_FILES.test(name) || /ファイル|file/i.test(name)) return "file";
    return "folder";
  }
  function parseTreeText(text, mode) {
    const lines = String(text).replace(/\t/g, "    ").split("\n").map((l) => l.replace(/\s+$/, ""));
    const entries = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      const e = splitTreeLine(line);
      if (e === null) continue;
      if (e.invalid) return null;
      entries.push(e);
    }
    if (!entries.length) return null;
    const branches = entries.filter((e) => e.branchCol >= 0);
    let depths;
    if (branches.length) {
      if (mode !== "tree") {
        if (branches.length < 2 || entries[0].branchCol >= 0) return null;
        if (entries.some((e) => e.branchCol < 0 && (e.indent > 0 || e.hasPipe))) return null;
        if (mode === "paragraph" && branches.some((e) => e.ascii)) return null;
      }
      const cols = [...new Set(branches.map((e) => e.branchCol))].sort((a, b) => a - b);
      depths = entries.map((e) => e.branchCol < 0 ? 0 : cols.indexOf(e.branchCol) + 1);
    } else {
      if (mode !== "tree") return null;
      const indents = [...new Set(entries.map((e) => e.indent))].sort((a, b) => a - b);
      depths = entries.map((e) => indents.indexOf(e.indent));
    }
    const min = Math.min(...depths);
    let prev = -1;
    depths = depths.map((d) => {
      const fixed = Math.min(d - min, prev + 1);
      prev = fixed;
      return fixed;
    });
    return entries.map((e, k) => {
      const m = TREE_NOTE_RE.exec(e.text);
      let name = (m ? e.text.slice(0, m.index) : e.text).trim();
      const note = m ? m[1].trim() : "";
      const hasChild = k + 1 < depths.length && depths[k + 1] > depths[k];
      const slash = /[/\\]$/.test(name);
      if (slash && name.length > 1) name = name.replace(/[/\\]+$/, "");
      return { depth: depths[k], name, note, kind: treeNodeKind(name, slash || hasChild) };
    });
  }
  function buildTreeHtml(nodes) {
    const hasNextSibling = nodes.map((n, i) => {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].depth < n.depth) return false;
        if (nodes[j].depth === n.depth) return true;
      }
      return false;
    });
    const stack = [];
    const hasNotes = nodes.some((n) => n.note);
    const rows = nodes.map((n, i) => {
      stack.length = n.depth;
      let guides = "";
      for (let level = 1; level < n.depth; level++) {
        guides += `<span class="md-tree-g ${hasNextSibling[stack[level]] ? "is-pipe" : "is-blank"}"></span>`;
      }
      if (n.depth > 0) guides += `<span class="md-tree-g ${hasNextSibling[i] ? "is-tee" : "is-end"}"></span>`;
      stack[n.depth] = i;
      const muted = /^(?:\.{3}|…+)$/.test(n.name) ? " is-ellipsis" : "";
      const nameCell = `<div class="md-tree-row${n.depth === 0 ? " is-root" : ""}${muted}">${guides}<span class="md-tree-icon is-${n.kind}" aria-hidden="true"></span><span class="md-tree-name">${escapeHtml(n.name)}</span></div>`;
      return hasNotes ? `${nameCell}<div class="md-tree-note">${escapeHtml(n.note)}</div>` : nameCell;
    });
    return `<div class="md-tree${hasNotes ? " has-notes" : ""}" role="group" aria-label="フォルダ構成">${rows.join("")}</div>
`;
  }
  function treeTokenFor(token) {
    let nodes = null;
    if (token.type === "code") {
      const lang = (token.lang || "").trim().toLowerCase();
      if (TREE_LANGS.includes(lang)) nodes = parseTreeText(token.text, "tree");
      else if (!lang) nodes = parseTreeText(token.text, "code");
    } else if (token.type === "paragraph") {
      nodes = parseTreeText(token.raw, "paragraph");
    }
    if (!nodes) return null;
    const html = buildTreeHtml(nodes);
    return { type: "html", raw: html, text: html, block: true };
  }

  // src/ts/math/plot.ts
  var MATH_PLOT_MAX_FUNCS = 4;
  var MATH_PLOT_PALETTES = {
    shapes: ["#E29578", "#EBB453", "#6CC4C9", "#9CCB86"],
    cards: ["#E29578", "#E6B34B", "#A3B4E4", "#6DB1B4"],
    circles: ["#D45D53", "#7EA6BF", "#ECB674", "#7D9763"],
    editorial: ["#D68C8C", "#8FA876", "#C9A66B", "#8FA3B8"]
  };
  var MATH_PLOT_BOX = {
    block: { w: 340, h: 200, left: 42, right: 14, top: 14, bottom: 26, samples: 480 },
    inline: { w: 156, h: 84, left: 26, right: 8, top: 8, bottom: 16, samples: 240 }
  };
  var MATH_PLOT_FUNCS = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sinh: Math.sinh,
    cosh: Math.cosh,
    tanh: Math.tanh,
    sec: (x) => 1 / Math.cos(x),
    csc: (x) => 1 / Math.sin(x),
    cot: (x) => 1 / Math.tan(x),
    sqrt: Math.sqrt,
    abs: Math.abs,
    exp: Math.exp,
    ln: Math.log,
    log: Math.log10,
    floor: Math.floor,
    ceil: Math.ceil,
    sign: Math.sign,
    sinc: (x) => Math.abs(x) < 1e-9 ? 1 : Math.sin(x) / x
  };
  var MATH_PLOT_CONSTS = { pi: Math.PI, e: Math.E };
  var MATH_PLOT_TRIG_RE = /\b(?:sin|cos|tan|sec|csc|cot)\b/;
  var TEX_FRAC_RE = /\\(?:d|t)?frac\b/;
  var TEX_SQRT_RE = /\\sqrt\b/;
  var TEX_OPERATOR_NAME_RE = /\\(?:operatorname|mathrm)\s*\{\s*([a-zA-Z]+)\s*\}/g;
  var TEX_TRIG_FUNCS_RE = /\\(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|sec|csc|cot|exp|ln|log|sqrt|abs|floor|ceil|sign|sinc)\b/g;
  var MATH_PLOT_REJECT_RE = /\\(?:int|iint|iiint|oint|sum|prod|coprod|lim|limsup|liminf|infty|partial|nabla|pm|mp|approx|sim|simeq|cong|equiv|ne|neq|propto|subset|subseteq|cup|cap|forall|exists|Rightarrow|Leftrightarrow|to|rightarrow|mapsto|text|textbf|textit|mathbf|mathcal|mathbb)\b|\\begin\{(?:[pbBvV]?matrix|cases| subarray)\}|[_']/;
  var hasOwn = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  function extractBracedGroup(str, start) {
    let i = start;
    while (i < str.length && /\s/.test(str[i])) i++;
    if (str[i] !== "{") return null;
    let depth = 1;
    const open = i + 1;
    for (i = open; i < str.length; i++) {
      if (str[i] === "\\") {
        i++;
        continue;
      }
      if (str[i] === "{") depth++;
      else if (str[i] === "}") {
        depth--;
        if (depth === 0) return { content: str.slice(open, i), end: i + 1 };
      }
    }
    return null;
  }
  function expandTexConstructs(input) {
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
        if (s[after] === "[") {
          const closeBracket = s.indexOf("]", after + 1);
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
  function normalizeTexPlotExpr(raw) {
    let s = raw.replace(/\\(?:,|;|:|!|quad|qquad| )/g, " ").replace(/~/g, " ").replace(/\\(?:left|right|[bB]ig(?:l|r|m)?|[bB]igg(?:l|r|m)?)\s*(?=[()[\]|\\])/g, "").replace(/\\(?:lvert|rvert|vert)\b/g, "|").replace(TEX_OPERATOR_NAME_RE, " $1 ");
    const expanded = expandTexConstructs(s);
    if (expanded === null) return null;
    s = expanded.replace(/\\arcsin\b/g, " asin ").replace(/\\arccos\b/g, " acos ").replace(/\\arctan\b/g, " atan ").replace(TEX_TRIG_FUNCS_RE, " $1 ").replace(/\\pi\b/g, " pi ").replace(/\\(?:cdot|times|ast)\b/g, "*").replace(/\\div\b/g, "/");
    if (/\\/.test(s)) return null;
    s = s.replace(/[−–]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^").replace(/π/g, " pi ").replace(/\[/g, "(").replace(/\]/g, ")").replace(/\{/g, "(").replace(/\}/g, ")");
    return s.trim();
  }
  function tokenizePlotExpr(src) {
    const norm = normalizeTexPlotExpr(src);
    if (!norm) return null;
    const tokens = [];
    const re = /\s*(?:(\d+(?:\.\d*)?|\.\d+)|([a-zA-Z]+)|([-+*/^()|]))/y;
    while (re.lastIndex < norm.length && norm.slice(re.lastIndex).trim()) {
      const m = re.exec(norm);
      if (!m) return null;
      if (m[1]) tokens.push({ t: "num", v: parseFloat(m[1]) });
      else if (m[2]) tokens.push({ t: "id", v: m[2].toLowerCase() });
      else tokens.push({ t: m[3] });
    }
    return tokens.length ? tokens : null;
  }
  function parsePlotExpr(src) {
    const tokens = tokenizePlotExpr(src);
    if (!tokens) return null;
    let pos = 0;
    let usedX = false;
    let inAbs = 0;
    const take = (t) => {
      if (tokens[pos] && tokens[pos].t === t) {
        pos++;
        return true;
      }
      return false;
    };
    const startsFactor = (tok) => tok && (tok.t === "num" || tok.t === "id" || tok.t === "(" || tok.t === "|" && inAbs === 0);
    const startsAtom = (tok) => tok && (tok.t === "num" || tok.t === "id" && !hasOwn(MATH_PLOT_FUNCS, tok.v));
    try {
      let expr = function() {
        let left = term();
        for (; ; ) {
          const a = left;
          if (take("+")) {
            const b = term();
            left = (x) => a(x) + b(x);
          } else if (take("-")) {
            const b = term();
            left = (x) => a(x) - b(x);
          } else return left;
        }
      }, term = function() {
        let left = unary();
        for (; ; ) {
          const a = left;
          if (take("*")) {
            const b = unary();
            left = (x) => a(x) * b(x);
          } else if (take("/")) {
            const b = unary();
            left = (x) => a(x) / b(x);
          } else if (startsFactor(tokens[pos])) {
            const b = power();
            left = (x) => a(x) * b(x);
          } else return left;
        }
      }, unary = function() {
        if (take("-")) {
          const a = unary();
          return (x) => -a(x);
        }
        if (take("+")) return unary();
        return power();
      }, power = function() {
        const base = primary();
        if (take("^")) {
          const exp = unary();
          return (x) => Math.pow(base(x), exp(x));
        }
        return base;
      }, bareFuncArg = function() {
        if (take("-")) {
          const a = bareFuncArg();
          return (x) => -a(x);
        }
        if (take("+")) return bareFuncArg();
        let left = power();
        while (startsAtom(tokens[pos])) {
          const a = left;
          const b = power();
          left = (x) => a(x) * b(x);
        }
        return left;
      }, primary = function() {
        const tok = tokens[pos++];
        if (!tok) throw new Error("eof");
        if (tok.t === "num") {
          const v = tok.v;
          return () => v;
        }
        if (tok.t === "(") {
          const inner = expr();
          if (!take(")")) throw new Error("paren");
          return inner;
        }
        if (tok.t === "|") {
          inAbs++;
          const inner = expr();
          inAbs--;
          if (!take("|")) throw new Error("abs");
          return (x) => Math.abs(inner(x));
        }
        if (tok.t === "id") {
          if (tok.v === "x") {
            usedX = true;
            return (x) => x;
          }
          if (hasOwn(MATH_PLOT_CONSTS, tok.v)) {
            const v = MATH_PLOT_CONSTS[tok.v];
            return () => v;
          }
          if (hasOwn(MATH_PLOT_FUNCS, tok.v)) {
            const fn2 = MATH_PLOT_FUNCS[tok.v];
            let fnPow = null;
            if (take("^")) fnPow = primary();
            let arg;
            if (take("(")) {
              arg = expr();
              if (!take(")")) throw new Error("fn-paren");
            } else {
              arg = bareFuncArg();
            }
            const call = (x) => fn2(arg(x));
            return fnPow ? ((x) => Math.pow(call(x), fnPow(x))) : call;
          }
        }
        throw new Error("token");
      };
      const fn = expr();
      if (pos < tokens.length) return null;
      return { fn, usedX, norm: normalizeTexPlotExpr(src) };
    } catch (e) {
      return null;
    }
  }
  function splitTopLevelTex(str) {
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let i = 0; i < str.length; i++) {
      const ch = str[i];
      if (ch === "\\" && str[i + 1] === "\\") {
        if (depth === 0) {
          parts.push(str.slice(start, i));
          start = i + 2;
        }
        i++;
        continue;
      }
      if (ch === "(" || ch === "{" || ch === "[") depth++;
      else if (ch === ")" || ch === "}" || ch === "]") depth = Math.max(0, depth - 1);
      else if (depth === 0 && (ch === "," || ch === ";")) {
        parts.push(str.slice(start, i));
        start = i + 1;
      }
    }
    parts.push(str.slice(start));
    return parts.map((p) => p.trim()).filter(Boolean);
  }
  function parseTexDomainPart(part) {
    const clean = part.replace(/^\(|\)$/g, "").trim();
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
  function chooseAutoXRange(fns) {
    const hasTrig = fns.some((f) => f.norm && MATH_PLOT_TRIG_RE.test(f.norm));
    const hasExp = fns.some((f) => f.norm && /\b(?:exp|e)\b/.test(f.norm));
    const negValid = [-4, -2, -1, -0.5].some((x) => fns.some((f) => Number.isFinite(f.fn(x))));
    if (!negValid) {
      return hasTrig ? { range: [0, 4 * Math.PI], xPi: true } : { range: [0, 10], xPi: false };
    }
    if (hasTrig && hasExp) {
      const negMax = Math.max(...fns.map((f) => Math.abs(f.fn(-Math.PI))).filter(Number.isFinite));
      const posMax = Math.max(...fns.map((f) => Math.abs(f.fn(Math.PI))).filter(Number.isFinite));
      if (Number.isFinite(negMax) && Number.isFinite(posMax) && posMax > 0 && negMax > posMax * 2.5) {
        return { range: [0, 4 * Math.PI], xPi: true };
      }
    }
    return hasTrig ? { range: [-2 * Math.PI, 2 * Math.PI], xPi: true } : { range: [-5, 5], xPi: false };
  }
  function parseTexPlotSpec(tex) {
    if (!tex || typeof tex !== "string") return null;
    let body = tex.trim();
    const envMatch = /^\\begin\{(aligned|align\*?|gathered|array)\}(?:\{[^{}]*\})?([\s\S]*?)\\end\{\1\}$/.exec(body);
    if (envMatch) body = envMatch[2].trim();
    if (MATH_PLOT_REJECT_RE.test(body)) return null;
    let domain = null;
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
    const fns = [];
    for (const rawPart of rawParts) {
      const part = rawPart.replace(/&/g, "").trim();
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
    if (!fns.length || !fns.some((f) => f.usedX)) return null;
    const chosen = domain || chooseAutoXRange(fns);
    const [x0, x1] = chosen.range;
    let finiteCount = 0;
    for (let i = 0; i <= 40; i++) {
      const x = x0 + (x1 - x0) * i / 40;
      if (fns.some((f) => Number.isFinite(f.fn(x)))) finiteCount++;
    }
    if (finiteCount < 4) return null;
    return { fns, x: chosen.range, xPi: chosen.xPi };
  }
  function autoPlotRange(series) {
    const ys = series.flat().map((p) => p[1]).filter(Number.isFinite).sort((a, b) => a - b);
    if (!ys.length) return [-1, 1];
    let lo = ys[Math.floor((ys.length - 1) * 0.02)];
    let hi = ys[Math.ceil((ys.length - 1) * 0.98)];
    if (hi - lo < 1e-9) {
      lo -= 1;
      hi += 1;
    }
    const pad = (hi - lo) * 0.1;
    return [lo - pad, hi + pad];
  }
  function plotTicks(lo, hi, target) {
    const raw = (hi - lo) / target;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 5, 10].map((k) => k * mag).find((s) => s >= raw * 0.999) || mag;
    const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    const ticks = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) {
      const value = Math.abs(v) < step * 1e-9 ? 0 : v;
      ticks.push({ v: value, label: Number(value.toFixed(digits)).toString().replace("-", "−") });
    }
    return ticks;
  }
  function plotPiTicks(lo, hi, maxTicks = 9) {
    for (const unit of [1, 2, 4]) {
      const step = Math.PI / 2 * unit;
      const ticks = [];
      for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
        const half = k * unit;
        const sign = half < 0 ? "−" : "";
        const n = Math.abs(half);
        const label = n === 0 ? "0" : n % 2 === 0 ? `${sign}${n / 2 === 1 ? "" : n / 2}π` : `${sign}${n === 1 ? "" : n}π/2`;
        ticks.push({ v: k * step, label });
      }
      if (ticks.length <= maxTicks) return ticks;
    }
    return plotTicks(lo, hi, Math.max(3, maxTicks - 2));
  }
  function splitPlotSegments(pts, top, ph, sx, sy) {
    const segments = [];
    let current = [];
    let prevPy = null;
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
  function renderMathPlotToDataUrl(spec, isDisplay, style, appearance) {
    const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
    const { w, h, left, right, top, bottom, samples } = box;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const [x0, x1] = spec.x;
    const series = spec.fns.map((f) => {
      const pts = [];
      for (let i = 0; i <= samples; i++) {
        const x = x0 + (x1 - x0) * i / samples;
        pts.push([x, f.fn(x)]);
      }
      return pts;
    });
    const [y0, y1] = autoPlotRange(series);
    const sx = (x) => left + (x - x0) / (x1 - x0) * pw;
    const sy = (y) => top + (y1 - y) / (y1 - y0) * ph;
    const isDark = appearance === "dark";
    const palette = MATH_PLOT_PALETTES[style] || MATH_PLOT_PALETTES.shapes;
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = w * scale;
    canvas.height = h * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, pw, ph);
    ctx.clip();
    const bgGrad = ctx.createLinearGradient(0, top, 0, top + ph);
    if (isDark) {
      bgGrad.addColorStop(0, "#0B1120");
      bgGrad.addColorStop(1, "#152033");
    } else {
      bgGrad.addColorStop(0, "#F8FAFC");
      bgGrad.addColorStop(1, "#FFFFFF");
    }
    ctx.fillStyle = bgGrad;
    ctx.fillRect(left, top, pw, ph);
    const xTicks = spec.xPi ? plotPiTicks(x0, x1, isDisplay ? 9 : 5) : plotTicks(x0, x1, isDisplay ? 6 : 3);
    const yTicks = plotTicks(y0, y1, isDisplay ? 4 : 2);
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.24)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    xTicks.forEach((t) => {
      const px = sx(t.v);
      ctx.moveTo(px, top);
      ctx.lineTo(px, top + ph);
    });
    yTicks.forEach((t) => {
      const py = sy(t.v);
      ctx.moveTo(left, py);
      ctx.lineTo(left + pw, py);
    });
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = isDark ? "rgba(203, 213, 225, 0.42)" : "rgba(71, 85, 105, 0.45)";
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
    const basePy = sy(Math.min(y1, Math.max(y0, 0)));
    const segmentsBySeries = series.map((pts) => splitPlotSegments(pts, top, ph, sx, sy));
    if (segmentsBySeries.length === 1) {
      const c1 = palette[0];
      const fillGrad = ctx.createLinearGradient(0, top, 0, top + ph);
      fillGrad.addColorStop(0, hexToRgba(c1, isDark ? 0.24 : 0.18));
      fillGrad.addColorStop(1, hexToRgba(c1, 0.02));
      ctx.fillStyle = fillGrad;
      segmentsBySeries[0].forEach((seg) => {
        ctx.beginPath();
        ctx.moveTo(seg[0][0], basePy);
        seg.forEach(([px, py]) => ctx.lineTo(px, py));
        ctx.lineTo(seg[seg.length - 1][0], basePy);
        ctx.closePath();
        ctx.fill();
      });
    }
    segmentsBySeries.forEach((segments, idx) => {
      const color = palette[idx % palette.length];
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = isDisplay ? 2.25 : 1.75;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.shadowColor = hexToRgba(color, isDark ? 0.55 : 0.3);
      ctx.shadowBlur = isDisplay ? 6 : 3;
      ctx.beginPath();
      segments.forEach((seg) => {
        ctx.moveTo(seg[0][0], seg[0][1]);
        for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
      });
      ctx.stroke();
      ctx.restore();
    });
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
    ctx.strokeStyle = isDark ? "rgba(148, 163, 184, 0.28)" : "rgba(148, 163, 184, 0.38)";
    ctx.lineWidth = 1;
    ctx.strokeRect(left, top, pw, ph);
    ctx.fillStyle = isDark ? "#94A3B8" : "#64748B";
    ctx.font = isDisplay ? '500 10px "JetBrains Mono", monospace' : '500 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const xLabelTicks = isDisplay || xTicks.length <= 3 ? xTicks : [xTicks[0], xTicks[Math.floor(xTicks.length / 2)], xTicks[xTicks.length - 1]];
    xLabelTicks.forEach((t) => {
      const px = sx(t.v);
      if (px >= left - 2 && px <= left + pw + 2) {
        ctx.fillText(t.label, px, top + ph + (isDisplay ? 6 : 3));
      }
    });
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const yLabelTicks = isDisplay || yTicks.length <= 3 ? yTicks : [yTicks[0], yTicks[yTicks.length - 1]];
    yLabelTicks.forEach((t) => {
      const py = sy(t.v);
      if (py >= top + 4 && py <= top + ph - 4) {
        ctx.fillText(t.label, left - (isDisplay ? 6 : 4), py);
      }
    });
    return canvas.toDataURL("image/png");
  }
  var mathSpecCache = /* @__PURE__ */ new Map();
  function getTexPlotSpec(tex) {
    if (!mathSpecCache.has(tex)) {
      mathSpecCache.set(tex, parseTexPlotSpec(tex));
    }
    return mathSpecCache.get(tex) ?? null;
  }
  var mathPlotCache = /* @__PURE__ */ new Map();
  function getCachedMathPlotDataUrl(plotSpec, isDisplay, style, appearance, tex) {
    const plotKey = `${isDisplay ? "D" : "I"}:${style}:${appearance}:${tex}`;
    if (!mathPlotCache.has(plotKey)) {
      mathPlotCache.set(plotKey, renderMathPlotToDataUrl(plotSpec, isDisplay, style, appearance));
    }
    return mathPlotCache.get(plotKey);
  }

  // src/ts/app.ts
  function fnv1aHash(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16);
  }
  function showToast(msg) {
    const toast = document.getElementById("toast");
    const label = document.getElementById("toast-message");
    if (!toast || !label) return;
    label.textContent = msg;
    toast.classList.remove("opacity-0", "translate-y-2");
    toast.classList.add("opacity-100", "translate-y-0");
    setTimeout(() => {
      toast.classList.remove("opacity-100", "translate-y-0");
      toast.classList.add("opacity-0", "translate-y-2");
    }, 2e3);
  }
  function updateStatus(text, type = "info") {
    const pill = document.getElementById("telemetry-pill");
    const dot = document.getElementById("telemetry-dot");
    const status = document.getElementById("telemetry-status");
    if (!pill || !dot || !status) return;
    status.textContent = text;
    pill.className = "flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-mono shadow-md backdrop-blur-md transition-all";
    if (type === "success") {
      pill.classList.add("bg-emerald-500/10", "text-emerald-600", "border-emerald-500/25");
      dot.className = "w-1.5 h-1.5 rounded-full bg-emerald-500";
    } else if (type === "warning") {
      pill.classList.add("bg-amber-500/10", "text-amber-600", "border-amber-500/25");
      dot.className = "w-1.5 h-1.5 rounded-full bg-amber-500";
    } else {
      pill.classList.add("bg-blue-500/10", "text-blue-600", "border-blue-500/25");
      dot.className = "w-1.5 h-1.5 rounded-full bg-blue-500";
    }
  }
  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }
  function resolveModal(idOrEl) {
    return typeof idOrEl === "string" ? document.getElementById(idOrEl) : idOrEl;
  }
  function isModalOpen(idOrEl) {
    const modal = resolveModal(idOrEl);
    return Boolean(modal && !modal.classList.contains("hidden"));
  }
  function setModalOpen(idOrEl, open) {
    const modal = resolveModal(idOrEl);
    if (!modal) return;
    modal.classList.toggle("hidden", !open);
    modal.classList.toggle("flex", Boolean(open));
  }
  var THEMES = {
    light: {
      cobalt: {
        name: "Cobalt",
        canvasBg: "#FFFFFF",
        clusterBg: "#F8FAFC",
        clusterBorder: "#94A3B8",
        nodeBg: "#FFFFFF",
        nodeStroke: "#2563EB",
        nodeText: "#0F172A",
        edgeStroke: "#475569",
        edgeLabelBg: "#FFFFFF",
        edgeLabelBorder: "#CBD5E1",
        edgeLabelText: "#1E3A8A"
      },
      emerald: {
        name: "Emerald",
        canvasBg: "#FFFFFF",
        clusterBg: "#F8FAFC",
        clusterBorder: "#94A3B8",
        nodeBg: "#FFFFFF",
        nodeStroke: "#059669",
        nodeText: "#0F172A",
        edgeStroke: "#475569",
        edgeLabelBg: "#FFFFFF",
        edgeLabelBorder: "#CBD5E1",
        edgeLabelText: "#064E3B"
      },
      amber: {
        name: "Amber",
        canvasBg: "#FFFFFF",
        clusterBg: "#F8FAFC",
        clusterBorder: "#94A3B8",
        nodeBg: "#FFFFFF",
        nodeStroke: "#D97706",
        nodeText: "#0F172A",
        edgeStroke: "#57534E",
        edgeLabelBg: "#FFFFFF",
        edgeLabelBorder: "#CBD5E1",
        edgeLabelText: "#78350F"
      },
      slate: {
        name: "Royal",
        canvasBg: "#FFFFFF",
        clusterBg: "#F8FAFC",
        clusterBorder: "#94A3B8",
        nodeBg: "#FFFFFF",
        nodeStroke: "#7C3AED",
        nodeText: "#0F172A",
        edgeStroke: "#475569",
        edgeLabelBg: "#FFFFFF",
        edgeLabelBorder: "#CBD5E1",
        edgeLabelText: "#4C1D95"
      }
    },
    dark: {
      cobalt: {
        name: "Cobalt",
        canvasBg: "#0F172A",
        clusterBg: "#0B1120",
        clusterBorder: "#334155",
        nodeBg: "#1E293B",
        nodeStroke: "#38BDF8",
        nodeText: "#F8FAFC",
        edgeStroke: "#94A3B8",
        edgeLabelBg: "#1E293B",
        edgeLabelBorder: "#475569",
        edgeLabelText: "#E0F2FE"
      },
      emerald: {
        name: "Emerald",
        canvasBg: "#06120E",
        clusterBg: "#091914",
        clusterBorder: "#1E4638",
        nodeBg: "#0F2920",
        nodeStroke: "#34D399",
        nodeText: "#F8FAFC",
        edgeStroke: "#6EE7B7",
        edgeLabelBg: "#0F2920",
        edgeLabelBorder: "#1E4638",
        edgeLabelText: "#D1FAE5"
      },
      amber: {
        name: "Amber",
        canvasBg: "#120E07",
        clusterBg: "#1C150B",
        clusterBorder: "#452A0B",
        nodeBg: "#291D0E",
        nodeStroke: "#FBBF24",
        nodeText: "#F8FAFC",
        edgeStroke: "#FCD34D",
        edgeLabelBg: "#291D0E",
        edgeLabelBorder: "#452A0B",
        edgeLabelText: "#FEF3C7"
      },
      slate: {
        name: "Royal",
        canvasBg: "#0D0917",
        clusterBg: "#150F26",
        clusterBorder: "#3B2366",
        nodeBg: "#21173B",
        nodeStroke: "#C084FC",
        nodeText: "#F8FAFC",
        edgeStroke: "#D8B4FE",
        edgeLabelBg: "#21173B",
        edgeLabelBorder: "#3B2366",
        edgeLabelText: "#F3E8FF"
      }
    }
  };
  var VISUAL_THEMES = {
    shapes: {
      clusterBg: "#F5FBFA",
      clusterBorder: "#94A3B8",
      nodeBg: "#FBE3B0",
      nodeStroke: "#D9902A",
      nodeText: "#1E293B",
      edgeStroke: "#475569",
      edgeLabelBg: "#FFFFFF",
      edgeLabelBorder: "#CBD5E1",
      edgeLabelText: "#1E293B",
      secondary: "#C9F1F6",
      tertiary: "#F8D9D3",
      lifeline: "#475569",
      activationBg: "#C9F1F6",
      activationBorder: "#0E7490"
    },
    cards: {
      clusterBg: "#FFFFFF",
      clusterBorder: "#CBD5E1",
      nodeBg: "#FFFFFF",
      nodeStroke: "#E29578",
      nodeText: "#0F172A",
      edgeStroke: "#64748B",
      edgeLabelBg: "#FFFFFF",
      edgeLabelBorder: "#E2E8F0",
      edgeLabelText: "#0F172A",
      secondary: "#DCE3F6",
      tertiary: "#D3EBEC",
      lifeline: "#7C8BA1",
      activationBg: "#FBE7B5",
      activationBorder: "#C98A12"
    },
    circles: {
      clusterBg: "#F8FAFC",
      clusterBorder: "#7EA6BF",
      nodeBg: "#D7E6EF",
      nodeStroke: "#7EA6BF",
      nodeText: "#2B2D42",
      edgeStroke: "#3D464D",
      edgeLabelBg: "#FFFFFF",
      edgeLabelBorder: "#7EA6BF",
      edgeLabelText: "#2B2D42",
      secondary: "#F3CFCB",
      tertiary: "#F6E3C8",
      lifeline: "#6D597A",
      activationBg: "#F3CFCB",
      activationBorder: "#D45D53"
    },
    editorial: {
      clusterBg: "#FFFDF7",
      clusterBorder: "#C9BFA5",
      nodeBg: "#FFFFFF",
      nodeStroke: "#D68C8C",
      nodeText: "#2B2D42",
      edgeStroke: "#6F8A55",
      edgeLabelBg: "#FFFFFF",
      edgeLabelBorder: "#C9BFA5",
      edgeLabelText: "#2B2D42",
      secondary: "#E4ECD9",
      tertiary: "#F3E1E1",
      lifeline: "#8FA876",
      activationBg: "#E4ECD9",
      activationBorder: "#6F8A55"
    }
  };
  var VISUAL_DARK_BASE = {
    clusterBg: "#1B2433",
    clusterBorder: "#64748B",
    nodeBg: "#1E293B",
    nodeText: "#F1F5F9",
    edgeStroke: "#CBD5E1",
    edgeLabelBg: "#1E293B",
    edgeLabelBorder: "#475569",
    edgeLabelText: "#F1F5F9",
    lifeline: "#94A3B8",
    canvasBg: "#111827"
  };
  var VISUAL_DARK_ACCENTS = {
    shapes: { clusterBg: "#16302F", secondary: "#155E75", tertiary: "#7C3A2E", activationBg: "#164E63" },
    cards: { secondary: "#3B4A75", tertiary: "#1F5254", activationBg: "#4A3A1A" },
    circles: { secondary: "#2F5266", tertiary: "#6B2E2A", activationBg: "#5A2B27" },
    editorial: { clusterBg: "#2A251C", secondary: "#3F4D33", tertiary: "#5A3535", activationBg: "#3F4D33" }
  };
  var VISUAL_THEMES_DARK = Object.fromEntries(Object.entries(VISUAL_THEMES).map(([style, spec]) => [style, { ...spec, ...VISUAL_DARK_BASE, ...VISUAL_DARK_ACCENTS[style] }]));
  var VISUAL_STYLE_KEYS = Object.keys(VISUAL_THEMES);
  var NODE_DECORATED_TYPES = ["flowchart-v2", "flowchart", "stateDiagram"];
  var DEFAULT_CURVES = { flowchart: "step", state: "smooth", class: "step" };
  var CURVE_LABELS = { smooth: "曲線", step: "直角", straight: "直線" };
  var MIN_FIT_FONT_PX = 10;
  var MAX_FIT_SCALE = 1.5;
  var DARK_SECTION_HUES = [215, 172, 262, 32, 145, 330, 195, 12, 95, 285, 50, 240];
  function darkSectionScale() {
    const vars = {};
    DARK_SECTION_HUES.forEach((hue, i) => {
      vars[`cScale${i}`] = `hsl(${hue}, 45%, 38%)`;
      vars[`cScalePeer${i}`] = `hsl(${hue}, 50%, 58%)`;
      vars[`cScaleLabel${i}`] = "#F1F5F9";
      vars[`pie${i + 1}`] = `hsl(${hue}, 45%, 42%)`;
    });
    return vars;
  }
  var CIRCLE_DARK_TEXT_FILLS = ["#ECB674"];
  var SEQUENCE_MATH_LIFT = 6;
  var REPOSITORY_URL = "https://github.com/prankster-freedom/Lucivo";
  var REPOSITORY_LINK_ATTRS = `href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer"`;
  var EMPTY_GUIDE_HTML = `
<div class="empty-guide">
  <div class="empty-guide-logo">
    <a class="brand-link" ${REPOSITORY_LINK_ATTRS} title="Lucivo の公開リポジトリ（最新版）を開く">
      <img class="brand-logo-light" src="./assets/logos/light/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
      <img class="brand-logo-dark" src="./assets/logos/dark/logo_full.svg" alt="Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —（公開リポジトリを開く）" width="264" height="72" />
    </a>
  </div>
  <h3 class="empty-guide-title">Markdown を開いてください</h3>
  <p class="empty-guide-desc">ヘッダーの「開く」メニューから「ファイルを開く…」でローカルファイルを、「フォルダを開く…」でフォルダの Markdown を一覧から読み込むか、同梱の <code>Visualモードサンプル (visual-sample.md)</code> / <code>記法サンプル (notation_sample.md)</code> をワンクリックで開けます。左のエディタに直接入力することもできます。</p>
  
  <div class="empty-guide-modes">
    <div class="empty-guide-card">
      <h4>⚡ 高速モード</h4>
      <p>思考を邪魔しないミリ秒応答の軽快なプレビュー。仕様書の執筆や構造の確認に最適です。</p>
    </div>
    <div class="empty-guide-card">
      <h4>🎨 Visualモード (展示品質)</h4>
      <p>講演資料や展示ブースの大画面で映えるプロ品質のインフォグラフィックへ瞬時に変換します。</p>
    </div>
    <div class="empty-guide-card">
      <h4>🎤 ステージ発表 (発表モード)</h4>
      <p>ヘッダーの「発表」ボタン（または <kbd class="kbd-key">P</kbd> キー）で全画面のプレゼンテーション舞台へ。章ごとのページ送り、光が伝わるシグナル・ライト、全シーン俯瞰 (Oキー)、光のポインター (Lキー)、幕間・質疑カーテン (B/Qキー)、自動進行ループ (Aキー) で魅せます。</p>
    </div>
  </div>

  <p class="empty-guide-footer">💡 画面上部の <strong>[ 高速モード | Visualモード ]</strong> や <strong>[ 発表 ]</strong> ボタンからいつでもワンクリックで体験できます。キーボードの <kbd class="kbd-key">?</kbd> キーでショートカット一覧を表示できます。</p>
  <p class="empty-guide-latest">最新版はこちら: <a ${REPOSITORY_LINK_ATTRS}>github.com/prankster-freedom/Lucivo</a></p>
</div>`;
  var state = {
    appearance: "light",
    palette: "cobalt",
    viewMode: "split",
    isVisualMode: false,
    infographicStyle: "shapes",
    showFrontMatter: false,
    // 図の番号 → 矢印の形状（'smooth' / 'step' / 'straight'）。画面の表示の間だけ保持する（DD-EDGE-003）
    curveByIndex: /* @__PURE__ */ new Map()
  };
  var svgCache = /* @__PURE__ */ new Map();
  var lkgCache = /* @__PURE__ */ new Map();
  var fitCache = /* @__PURE__ */ new Map();
  var mathCache = /* @__PURE__ */ new Map();
  var LIBRARIES = {
    mermaid: { script: "./vendor/mermaid.min.js", global: "mermaid" },
    katex: {
      script: "./vendor/katex/katex.min.js",
      style: "./vendor/katex/katex.min.css",
      global: "katex"
    },
    // Visualモードの舞台演出（FR-018, FR-019）。高速モードの起動には読み込まない（NFR-006）
    stage: { script: "./js/stage.js", global: "LucivoStage" },
    // file:// 直開き時の同梱サンプル読み込みフォールバック（FR-006）。サンプルを選んだときだけ読み込む（NFR-006）
    samples: { script: "./samples/samples-data.js", global: "LUCIVO_SAMPLES" }
  };
  var libraryLoads = /* @__PURE__ */ new Map();
  var EXPORT_URLS = {
    "./vendor/fonts/fonts.css": "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@600;700;800&display=swap",
    "./vendor/marked.min.js": "https://cdn.jsdelivr.net/npm/marked@18.1.3/lib/marked.umd.js",
    "./vendor/purify.min.js": "https://cdn.jsdelivr.net/npm/dompurify@3.4.17/dist/purify.min.js",
    "./vendor/mermaid.min.js": "https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js",
    "./vendor/katex/katex.min.js": "https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.js",
    "./vendor/katex/katex.min.css": "https://cdn.jsdelivr.net/npm/katex@0.19.1/dist/katex.min.css"
  };
  function loadLibrary(name) {
    const lib = LIBRARIES[name];
    if (window[lib.global]) return Promise.resolve(true);
    if (!libraryLoads.has(name)) {
      libraryLoads.set(name, new Promise((resolve) => {
        if (lib.style) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = lib.style;
          document.head.appendChild(link);
        }
        const script = document.createElement("script");
        script.src = lib.script;
        script.onload = () => resolve(!!window[lib.global]);
        script.onerror = () => {
          console.warn(`Failed to load ${name}`);
          resolve(false);
        };
        document.head.appendChild(script);
      }));
    }
    return libraryLoads.get(name);
  }
  var renderDebounceTimer = null;
  var renderGeneration = 0;
  var lastLoadedMarkdown = "";
  var currentFileName = "untitled.md";
  var APP_TITLE_SUFFIX = " - Lucivo";
  var DROPPABLE_FILE_PATTERN = /\.(md|markdown|txt)$/i;
  function getThemeSpec() {
    const mode = THEMES[state.appearance] || THEMES.light;
    return mode[state.palette] || mode.cobalt;
  }
  function syncCssTokens() {
    const spec = getThemeSpec();
    const root = document.documentElement;
    root.style.setProperty("--diag-canvas", spec.canvasBg);
    root.style.setProperty("--diag-cluster-bg", spec.clusterBg);
    root.style.setProperty("--diag-cluster-border", spec.clusterBorder);
    root.style.setProperty("--diag-node-bg", spec.nodeBg);
    root.style.setProperty("--diag-node-stroke", spec.nodeStroke);
    root.style.setProperty("--diag-node-text", spec.nodeText);
    root.style.setProperty("--diag-edge", spec.edgeStroke);
    root.style.setProperty("--accent", spec.nodeStroke);
  }
  function getMermaidCurve(curve) {
    if (curve === "step") return "stepAfter";
    if (curve === "straight") return "linear";
    return "basis";
  }
  function getCurveTarget(code) {
    const first = code.split(/\r?\n/).map((line) => line.trim()).find((line) => line && !line.startsWith("%%")) || "";
    if (/^(flowchart|graph)\b/.test(first)) return "flowchart";
    if (/^stateDiagram(-v2)?\b/.test(first)) return "state";
    if (/^classDiagram(-v2)?\b/.test(first)) return "class";
    return null;
  }
  function getBlockCurve(index, code) {
    const target = getCurveTarget(code);
    if (!target) return null;
    return state.curveByIndex.get(index) || DEFAULT_CURVES[target];
  }
  function getDiagramSpec(isVisual) {
    if (isVisual) {
      const themes = state.appearance === "dark" ? VISUAL_THEMES_DARK : VISUAL_THEMES;
      return themes[state.infographicStyle] || themes.shapes;
    }
    return getThemeSpec();
  }
  function getMermaidLayout(code, curve = null) {
    if (/^\s*mindmap\b/m.test(code)) return null;
    if (curve === "step" && getCurveTarget(code) === "class") return null;
    return "dagre";
  }
  function setupMermaid(isVisual = state.isVisualMode, curve = "smooth", layout = "dagre") {
    syncCssTokens();
    const spec = getDiagramSpec(isVisual);
    const isDark = state.appearance === "dark";
    const visualColors = isVisual ? { secondaryColor: spec.secondary, tertiaryColor: spec.tertiary } : { tertiaryColor: spec.clusterBg };
    if (!window.mermaid) return;
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      // Mermaid 12 の既定の見た目とレイアウトでは flowchart.curve が効かず、図の組版も変わる
      look: "classic",
      ...layout ? { layout } : {},
      // 開いた Markdown の図の中の HTML タグとクリック時のスクリプト呼び出しを無効にする（NFR-003）
      securityLevel: "strict",
      // 構文エラーの図を Mermaid に描かせない。描かせると body に要素が残り、編集のたびに積み上がる。
      // エラーはアプリが図のカードの中に表示する（DD-DIAG-064）
      suppressErrorRendering: true,
      fontFamily: '"Inter", "Noto Sans JP", -apple-system, sans-serif',
      fontSize: 13,
      flowchart: {
        curve: getMermaidCurve(curve),
        // Mermaid 12 は padding を両側に効かせ、短いラベルも minNodeWidth まで広げる。従来の組版に合わせる
        padding: 11,
        minNodeWidth: 0,
        nodeSpacing: 44,
        rankSpacing: 56,
        htmlLabels: true,
        useMaxWidth: true
      },
      sequence: {
        diagramMarginX: 24,
        diagramMarginY: 20,
        actorMargin: 54,
        width: 155,
        height: 50,
        boxMargin: 12,
        useMaxWidth: true
      },
      // ガントチャートは描画時のページ幅で横長に生成され、表示枠に縮小されて文字が極小になるため、
      // 表示枠（約 54rem）に近い幅で生成する
      gantt: {
        useWidth: 820,
        barHeight: 24,
        barGap: 6,
        topPadding: 56,
        leftPadding: 72,
        fontSize: 12,
        sectionFontSize: 12,
        useMaxWidth: true
      },
      state: {
        curve: getMermaidCurve(curve),
        padding: 8,
        minNodeWidth: 0,
        dividerMargin: 18,
        sizeUnit: 8,
        useMaxWidth: true
      },
      class: {
        curve: getMermaidCurve(curve)
      },
      themeVariables: {
        darkMode: isDark,
        ...isDark ? darkSectionScale() : {},
        background: "transparent",
        mainBkg: spec.nodeBg,
        primaryColor: spec.nodeBg,
        primaryTextColor: spec.nodeText,
        primaryBorderColor: spec.nodeStroke,
        lineColor: spec.edgeStroke,
        textColor: spec.nodeText,
        fontSize: "13px",
        clusterBkg: spec.clusterBg,
        clusterBorder: spec.clusterBorder,
        ...visualColors,
        tertiaryBorderColor: spec.clusterBorder,
        titleColor: spec.nodeText,
        compositeBackground: spec.clusterBg,
        compositeBorder: spec.clusterBorder,
        compositeTitleBackground: spec.clusterBg,
        stateBkg: spec.nodeBg,
        stateBorder: spec.nodeStroke,
        stateLabelColor: spec.nodeText,
        transitionColor: spec.edgeStroke,
        transitionLabelColor: spec.edgeLabelText,
        actorBkg: spec.nodeBg,
        actorBorder: spec.nodeStroke,
        actorTextColor: spec.nodeText,
        actorLineColor: spec.clusterBorder,
        signalColor: spec.edgeStroke,
        signalTextColor: spec.nodeText,
        labelBoxBkgColor: spec.edgeLabelBg,
        labelBoxBorderColor: spec.edgeLabelBorder,
        labelTextColor: spec.edgeLabelText,
        loopTextColor: spec.nodeText,
        noteBorderColor: spec.nodeStroke,
        noteBkgColor: spec.clusterBg,
        noteTextColor: spec.nodeText,
        // ER 図の属性行とガントチャートは、派生色のままだと Dark で白地に白文字などになるため明示する（FR-008）
        attributeBackgroundColorOdd: spec.nodeBg,
        attributeBackgroundColorEven: spec.clusterBg,
        sectionBkgColor: spec.clusterBg,
        sectionBkgColor2: spec.clusterBg,
        altSectionBkgColor: isVisual && !isDark ? "#FFFFFF" : spec.canvasBg,
        gridColor: spec.clusterBorder,
        taskBkgColor: spec.nodeBg,
        taskBorderColor: spec.nodeStroke,
        taskTextColor: spec.nodeText,
        taskTextLightColor: spec.nodeText,
        taskTextDarkColor: spec.nodeText,
        taskTextOutsideColor: spec.nodeText,
        taskTextClickableColor: spec.nodeText,
        activeTaskBkgColor: isVisual ? spec.secondary : spec.clusterBg,
        activeTaskBorderColor: spec.nodeStroke,
        doneTaskBkgColor: isVisual ? spec.tertiary : spec.clusterBorder,
        doneTaskBorderColor: spec.clusterBorder,
        critBkgColor: isDark ? "#7F1D1D" : "#FECACA",
        critBorderColor: "#DC2626",
        todayLineColor: spec.nodeStroke,
        // 円グラフの境界線は既定が黒のため、Dark では暗い扇形どうしの境目が見えなくなる
        pieStrokeColor: spec.edgeStroke,
        pieOuterStrokeColor: spec.edgeStroke,
        pieTitleTextColor: spec.nodeText,
        // Dark ではスライスを明度をそろえた中間色で塗るので（darkSectionScale）、スライスの上の文字は明るくする
        pieSectionTextColor: isDark ? "#F1F5F9" : spec.nodeText,
        pieLegendTextColor: spec.nodeText,
        // XY チャートの系列色（派生色のままだと白地に淡いクリーム色になり見分けにくい）
        xyChart: {
          backgroundColor: "transparent",
          titleColor: spec.nodeText,
          xAxisLabelColor: spec.nodeText,
          xAxisTitleColor: spec.nodeText,
          xAxisTickColor: spec.edgeStroke,
          xAxisLineColor: spec.edgeStroke,
          yAxisLabelColor: spec.nodeText,
          yAxisTitleColor: spec.nodeText,
          yAxisTickColor: spec.edgeStroke,
          yAxisLineColor: spec.edgeStroke,
          plotColorPalette: `${spec.nodeStroke}, ${spec.edgeStroke}`
        }
      }
    });
  }
  function mathPlaceholder(tag, tex, isDisplay, raw) {
    return `<${tag} class="lucivo-math" data-display="${isDisplay}" data-tex="${escapeHtml(tex)}">${escapeHtml(raw)}</${tag}>`;
  }
  var mathBlockExtension = {
    name: "mathBlock",
    level: "block",
    start: (src) => {
      const m = src.match(/^\$\$/m);
      return m ? m.index : void 0;
    },
    tokenizer(src) {
      const m = /^\$\$[^\S\n]*\n?([\s\S]+?)\n?[^\S\n]*\$\$[^\S\n]*(?:\n+|$)/.exec(src);
      if (m) return { type: "mathBlock", raw: m[0], text: m[1].trim() };
    },
    renderer: (token) => `${mathPlaceholder("div", token.text, true, token.raw.trim())}
`
  };
  var mathInlineExtension = {
    name: "mathInline",
    level: "inline",
    start: (src) => {
      const index = src.indexOf("$");
      return index >= 0 ? index : void 0;
    },
    tokenizer(src) {
      const display = /^\$\$((?:\\.|[^\\$`])+?)\$\$/.exec(src);
      if (display) return { type: "mathInline", raw: display[0], text: display[1].trim(), display: true };
      const inline = /^\$(?!\s)((?:\\.|[^\\$`\n])+?)(?<!\s)\$(?!\d)/.exec(src);
      if (inline) return { type: "mathInline", raw: inline[0], text: inline[1], display: false };
    },
    renderer: (token) => mathPlaceholder("span", token.text, token.display, token.raw)
  };
  function setupMarkedMath() {
    marked.use({ extensions: [mathBlockExtension, mathInlineExtension] });
  }
  function setupMarkedHeadings() {
    marked.use({
      renderer: {
        heading(token) {
          const attr = Number.isInteger(token.srcLine) ? ` data-src-line="${token.srcLine}"` : "";
          return `<h${token.depth}${attr}>${this.parser.parseInline(token.tokens)}</h${token.depth}>
`;
        }
      }
    });
  }
  var ALERT_LABELS = { note: "Note", tip: "Tip", important: "Important", warning: "Warning", caution: "Caution" };
  var ALERT_MARKER_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*(?:\n|$)/i;
  function decorateAlerts(container) {
    container.querySelectorAll("blockquote").forEach((quote) => {
      const first = quote.firstElementChild;
      const head = first && first.tagName === "P" ? first.firstChild : null;
      const match = head && head.nodeType === Node.TEXT_NODE ? ALERT_MARKER_RE.exec(head.textContent) : null;
      if (!match) return;
      const type = match[1].toLowerCase();
      head.textContent = head.textContent.slice(match[0].length);
      if (!head.textContent && head.nextSibling && head.nextSibling.nodeName === "BR") head.nextSibling.remove();
      if (!first.textContent.trim() && !first.querySelector("img, .lucivo-math")) first.remove();
      const alert = document.createElement("div");
      alert.className = `md-alert md-alert-${type}`;
      alert.setAttribute("role", "note");
      const title = document.createElement("p");
      title.className = "md-alert-title";
      const icon = document.createElement("span");
      icon.className = "md-alert-icon";
      icon.setAttribute("aria-hidden", "true");
      title.append(icon, ALERT_LABELS[type]);
      alert.append(title, ...quote.childNodes);
      quote.replaceWith(alert);
    });
  }
  function renderMath(container) {
    const targets = container.querySelectorAll(".lucivo-math");
    if (targets.length === 0) return;
    if (!window.katex) {
      loadLibrary("katex").then((ok) => {
        if (ok && container.isConnected) renderMath(container);
      });
      return;
    }
    const isVisualStage = state.isVisualMode && container.id === "visual-stage-container";
    targets.forEach((el) => {
      const isDisplay = el.dataset.display === "true";
      const tex = el.dataset.tex || "";
      const key = `${isDisplay ? "D" : "I"}:${tex}`;
      if (!mathCache.has(key)) {
        mathCache.set(key, katex.renderToString(tex, {
          displayMode: isDisplay,
          throwOnError: false,
          trust: false,
          output: "htmlAndMathml"
        }));
      }
      const katexHtml = mathCache.get(key);
      const plotSpec = isVisualStage && !el.closest("svg") ? getTexPlotSpec(tex) : null;
      if (plotSpec) {
        const dataUrl = getCachedMathPlotDataUrl(plotSpec, isDisplay, state.infographicStyle, state.appearance, tex);
        const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
        const aria = `関数の補足グラフ: ${plotSpec.fns.map((f) => f.label).join(", ")}`;
        el.classList.add("has-math-plot", isDisplay ? "is-block-plot" : "is-inline-plot");
        const tag = isDisplay ? "div" : "span";
        el.innerHTML = `<${tag} class="vs-math-formula">${katexHtml}</${tag}><img class="vs-math-plot-img${isDisplay ? "" : " is-inline"}" src="${dataUrl}" width="${box.w}" height="${box.h}" alt="${escapeHtml(aria)}" />`;
      } else {
        el.classList.remove("has-math-plot", "is-block-plot", "is-inline-plot");
        el.innerHTML = katexHtml;
      }
    });
  }
  function splitFrontMatter(text) {
    const m = /^---[ \t]*\r?\n(?:([\s\S]*?)\r?\n)?(?:---|\.\.\.)[ \t]*(?:\r?\n|$)/.exec(text);
    if (!m) return { yaml: null, body: text };
    return { yaml: m[1] || "", body: text.slice(m[0].length) };
  }
  function highlightYamlLine(line) {
    if (/^\s*#/.test(line)) return `<span class="fm-comment">${escapeHtml(line)}</span>`;
    const m = /^(\s*(?:-\s+)?)([^\s#:][^:]*?)(:)(\s.*|$)/.exec(line);
    if (m) {
      return `${escapeHtml(m[1])}<span class="fm-key">${escapeHtml(m[2])}</span>${escapeHtml(m[3])}<span class="fm-value">${escapeHtml(m[4])}</span>`;
    }
    return `<span class="fm-value">${escapeHtml(line)}</span>`;
  }
  function buildFrontMatterHtml(yaml) {
    const body = yaml.split(/\r?\n/).map(highlightYamlLine).join("\n");
    return `<section class="front-matter"><div class="front-matter-label">Front Matter</div><pre class="front-matter-body"><code>${body}</code></pre></section>
`;
  }
  function scopeSvgIds(svg) {
    const prefix = svg.id || `lucivo-${Math.random().toString(36).slice(2, 9)}`;
    const idMap = /* @__PURE__ */ new Map();
    const used = /* @__PURE__ */ new Set();
    svg.querySelectorAll("[id]").forEach((el) => {
      const base = el.id.startsWith(prefix) ? el.id : `${prefix}-${el.id}`;
      let scoped = base;
      for (let n = 2; used.has(scoped); n++) scoped = `${base}-${n}`;
      used.add(scoped);
      if (!idMap.has(el.id)) idMap.set(el.id, scoped);
      el.id = scoped;
    });
    if (idMap.size === 0) return;
    const ariaRefs = ["aria-labelledby", "aria-describedby"];
    svg.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const value = attr.value;
        if (value.includes("url(")) {
          el.setAttribute(attr.name, value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g, (m, q, id) => idMap.has(id) ? `url(#${idMap.get(id)})` : m));
        } else if ((attr.name === "href" || attr.name === "xlink:href") && value.startsWith("#") && idMap.has(value.slice(1))) {
          el.setAttribute(attr.name, `#${idMap.get(value.slice(1))}`);
        } else if (ariaRefs.includes(attr.name)) {
          el.setAttribute(attr.name, value.split(/\s+/).map((id) => idMap.get(id) || id).join(" "));
        }
      });
    });
  }
  function styleSequenceDiagram(svg, colors) {
    svg.querySelectorAll('line[id^="actor"], line[class~="200"], line.actor-line').forEach((line) => {
      line.style.setProperty("stroke", colors.lifeline, "important");
      line.style.setProperty("stroke-width", "1.25px", "important");
      line.style.setProperty("stroke-dasharray", "5 4", "important");
    });
    svg.querySelectorAll('rect[class^="activation"]').forEach((rect) => {
      rect.style.setProperty("fill", colors.activationBg, "important");
      rect.style.setProperty("stroke", colors.activationBorder, "important");
      rect.style.setProperty("stroke-width", "1.5px", "important");
    });
    svg.querySelectorAll("line.messageLine0, line.messageLine1").forEach((line) => {
      line.style.setProperty("stroke", colors.signal, "important");
      line.style.setProperty("stroke-width", "2px", "important");
    });
    svg.querySelectorAll("line.messageLine1").forEach((line) => {
      line.style.setProperty("stroke-dasharray", "6 4", "important");
    });
    svg.querySelectorAll("marker path, marker circle").forEach((m) => {
      m.style.setProperty("fill", colors.signal, "important");
      m.style.setProperty("stroke", colors.signal, "important");
    });
    svg.querySelectorAll("text.sequenceNumber").forEach((t) => {
      t.style.setProperty("fill", colors.numberText, "important");
    });
    svg.querySelectorAll(":scope > foreignObject").forEach((fo) => {
      fo.setAttribute("y", String(parseFloat(fo.getAttribute("y") || "0") - SEQUENCE_MATH_LIFT));
      fo.querySelectorAll(":scope > div").forEach((div) => div.style.setProperty("color", colors.messageText, "important"));
    });
  }
  function applyReadableFit(svg, cacheKey) {
    const viewBox = svg && svg.viewBox && svg.viewBox.baseVal;
    if (!viewBox || !viewBox.width) return;
    let fit = cacheKey && fitCache.get(cacheKey);
    if (!fit) {
      const sizes = Array.from(svg.querySelectorAll("text, tspan, foreignObject *")).filter((el) => !el.closest("math") && Array.from(el.childNodes).some((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim())).map((el) => parseFloat(getComputedStyle(el).fontSize)).filter((size) => size > 0);
      const minScale = sizes.length ? Math.min(1, MIN_FIT_FONT_PX / Math.min(...sizes)) : 0;
      fit = {
        naturalWidth: Math.ceil(viewBox.width),
        minWidth: Math.ceil(viewBox.width * minScale),
        maxWidth: Math.ceil(viewBox.width * MAX_FIT_SCALE)
      };
      if (cacheKey) fitCache.set(cacheKey, fit);
    }
    if (fit.minWidth) svg.style.minWidth = `${fit.minWidth}px`;
    svg.style.setProperty("--fit-max-width", `${fit.maxWidth}px`);
    svg.style.setProperty("--natural-width", `${fit.naturalWidth}px`);
    updateSlabSplit(svg.closest(".exhibition-slab-split"));
  }
  function updateSlabSplit(slab) {
    if (!slab || !slab.classList.contains("exhibition-slab-split")) return;
    const vp = slab.querySelector(".exhibition-viewport");
    if (!vp || !vp.querySelector(":scope > svg")) return;
    slab.classList.remove("is-stacked");
    if (vp.classList.contains("is-actual-size") || vp.scrollWidth > vp.clientWidth + 1) {
      slab.classList.add("is-stacked");
    }
  }
  function updateAllSlabSplits(container) {
    if (!container) return;
    container.querySelectorAll(".exhibition-slab-split").forEach(updateSlabSplit);
  }
  function pathBox(path) {
    const points = Array.from((path && path.getAttribute("d") || "").matchAll(/(-?[\d.]+)[\s,]+(-?[\d.]+)/g));
    if (!points.length) return null;
    const xs = points.map((p) => parseFloat(p[1]));
    const ys = points.map((p) => parseFloat(p[2]));
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
  }
  function createSvgElement(tag, attrs) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)));
    return el;
  }
  function normalizeStadiumNodes(svg) {
    svg.querySelectorAll("g.node > g.basic.label-container.outer-path").forEach((group) => {
      const path = group.querySelector("path");
      const box = pathBox(path);
      if (!box) return;
      const rect = createSvgElement("rect", { class: "basic label-container", ...box, rx: box.height / 2, ry: box.height / 2 });
      if (path.getAttribute("style")) rect.setAttribute("style", path.getAttribute("style"));
      group.replaceWith(rect);
    });
  }
  function normalizeStateNodes(svg) {
    svg.querySelectorAll("g.node.statediagram-state").forEach((node) => {
      const group = node.querySelector(":scope > g:not(.label)");
      if (!group || node.querySelector("text, foreignObject, rect, circle")) return;
      const box = pathBox(group.querySelector("path"));
      if (!box || !box.width || !box.height) return;
      let shape;
      if (box.height <= 12 && box.width > box.height * 2) {
        shape = createSvgElement("rect", { class: "fork-join", ...box });
      } else {
        const cx = box.x + box.width / 2;
        const cy = box.y + box.height / 2;
        const hw = box.width / 2;
        const hh = box.height / 2;
        shape = createSvgElement("polygon", { class: "state-start", points: `${cx},${cy + hh} ${cx + hw},${cy} ${cx},${cy - hh} ${cx - hw},${cy}` });
      }
      group.replaceWith(shape);
    });
  }
  function postProcessSvg(rawSvg, isVisualMode) {
    try {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = rawSvg;
      const svg = wrapper.querySelector("svg");
      if (!svg) return rawSvg;
      const diagramType = svg.getAttribute("aria-roledescription") || "";
      if (diagramType === "flowchart-v2") normalizeStadiumNodes(svg);
      if (diagramType === "stateDiagram") normalizeStateNodes(svg);
      if (isVisualMode) {
        decorateVisualSvg(svg, diagramType);
      } else {
        decorateStandardSvg(svg, diagramType);
      }
      scopeSvgIds(svg);
      return svg.outerHTML;
    } catch (e) {
      console.error("SVG post-processing failed:", e);
      return rawSvg;
    }
  }
  function decorateStandardSvg(svg, diagramType) {
    const isDark = state.appearance === "dark";
    const spec = getThemeSpec();
    const targetTextColor = isDark ? "#F8FAFC" : "#0F172A";
    svg.querySelectorAll("foreignObject div, foreignObject span, foreignObject small, text.actor, text.noteText, .nodeLabel, .stateLabel, .messageText, .loopText, .labelText").forEach((el) => {
      el.style.setProperty("color", targetTextColor, "important");
      el.style.setProperty("fill", targetTextColor, "important");
    });
    if (diagramType === "sequence") {
      styleSequenceDiagram(svg, {
        lifeline: isDark ? "#94A3B8" : "#64748B",
        activationBg: hexToRgba(spec.nodeStroke, isDark ? 0.3 : 0.16),
        activationBorder: spec.nodeStroke,
        signal: spec.edgeStroke,
        numberText: isDark ? spec.canvasBg : "#FFFFFF",
        messageText: spec.nodeText
      });
    }
    if (!NODE_DECORATED_TYPES.includes(diagramType)) return;
    svg.querySelectorAll("g.node:not(.statediagram-cluster)").forEach((g) => {
      const rect = g.querySelector("rect.basic, rect.label-container") || g.querySelector("rect");
      if (!rect) return;
      rect.setAttribute("rx", "8");
      rect.setAttribute("ry", "8");
      rect.style.setProperty("fill", spec.nodeBg, "important");
      rect.style.setProperty("stroke", spec.nodeStroke, "important");
      rect.style.setProperty("stroke-width", "1.75px", "important");
    });
    svg.querySelectorAll(".edgePath path.path, path.flowchart-link, path.transition").forEach((p) => {
      p.style.setProperty("stroke", spec.edgeStroke, "important");
      p.style.setProperty("stroke-width", "2px", "important");
    });
  }
  function decorateVisualSvg(svg, diagramType) {
    const styleMode = state.infographicStyle;
    const visualSpec = getDiagramSpec(true);
    const uid = addVisualDefs(svg);
    if (diagramType === "sequence") {
      decorateVisualSequence(svg, styleMode, visualSpec, uid);
      return;
    }
    if (!NODE_DECORATED_TYPES.includes(diagramType)) return;
    const frost = state.appearance === "dark" ? "rgba(15, 23, 42, 0.55)" : "rgba(255, 255, 255, 0.65)";
    svg.querySelectorAll("g.cluster, g.statediagram-cluster").forEach((cluster) => {
      const outerRect = cluster.querySelector("rect.outer") || cluster.querySelector("rect");
      if (outerRect) {
        outerRect.setAttribute("rx", "18");
        outerRect.setAttribute("ry", "18");
        outerRect.style.setProperty("fill", frost, "important");
        outerRect.style.setProperty("stroke", visualSpec.clusterBorder, "important");
        outerRect.style.setProperty("stroke-width", "2px", "important");
      }
    });
    const decorators = {
      shapes: decorateVisualShapes,
      cards: decorateVisualCards,
      circles: decorateVisualCircles,
      editorial: decorateVisualEditorial
    };
    const decorate = decorators[styleMode];
    if (decorate) decorate(svg, uid);
    fixMarkerScale(svg);
  }
  function addVisualDefs(svg) {
    let defs = svg.querySelector("defs");
    if (!defs) {
      defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      svg.insertBefore(defs, svg.firstChild);
    }
    const uid = Math.random().toString(36).slice(2, 7);
    defs.insertAdjacentHTML("beforeend", `
    <filter id="vis-soft-shadow-${uid}" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="6" stdDeviation="5.5" flood-color="#0F172A" flood-opacity="0.16" />
    </filter>
    <filter id="vis-card-shadow-${uid}" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0F172A" flood-opacity="0.14" />
    </filter>

    <linearGradient id="vis-g-amber-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E89B27" />
      <stop offset="100%" stop-color="#F7D05C" />
    </linearGradient>
    <linearGradient id="vis-g-aqua-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#73E8F4" />
      <stop offset="100%" stop-color="#DAEDFA" />
    </linearGradient>
    <linearGradient id="vis-g-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#E87C6C" />
      <stop offset="100%" stop-color="#F6CBC3" />
    </linearGradient>
    <linearGradient id="vis-g-lime-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8CEE97" />
      <stop offset="100%" stop-color="#CEF65B" />
    </linearGradient>

    <linearGradient id="vis-cap-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E29578" />
      <stop offset="100%" stop-color="#ECAC94" />
    </linearGradient>
    <linearGradient id="vis-cap-gold-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#E5AD35" />
      <stop offset="100%" stop-color="#F3C868" />
    </linearGradient>
    <linearGradient id="vis-cap-violet-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#9AAEE4" />
      <stop offset="100%" stop-color="#BAC7EC" />
    </linearGradient>
    <linearGradient id="vis-cap-teal-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#64ADB0" />
      <stop offset="100%" stop-color="#88C4C6" />
    </linearGradient>
  `);
    return uid;
  }
  function decorateVisualShapes(svg, uid) {
    svg.querySelectorAll("g.node:not(.statediagram-cluster)").forEach((g, idx) => {
      const rect = g.querySelector("rect.basic, rect.label-container") || g.querySelector("rect");
      const polygon = g.querySelector("polygon");
      const text = (g.textContent || "").toLowerCase();
      g.querySelectorAll("foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel").forEach((el) => {
        el.style.setProperty("color", "#1E293B", "important");
        el.style.setProperty("fill", "#1E293B", "important");
        el.style.setProperty("font-weight", "700", "important");
      });
      if (rect) {
        rect.style.setProperty("stroke", "none", "important");
        rect.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
        if (idx === 0 || text.includes("client") || text.includes("start") || text.includes("standby")) {
          rect.setAttribute("rx", "9999");
          rect.setAttribute("ry", "9999");
          rect.style.setProperty("fill", "#FFFFFF", "important");
        } else if (text.includes("terminal") || text.includes("landing") || text.includes("end") || text.includes("終了")) {
          rect.setAttribute("rx", "9999");
          rect.setAttribute("ry", "9999");
          rect.style.setProperty("fill", `url(#vis-g-lime-${uid})`, "important");
        } else {
          rect.setAttribute("rx", "10");
          rect.setAttribute("ry", "10");
          rect.style.setProperty("fill", `url(#vis-g-amber-${uid})`, "important");
        }
      }
      if (polygon) {
        polygon.style.setProperty("stroke", "none", "important");
        polygon.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
        const points = polygon.getAttribute("points") || "";
        if (points.split(" ").length <= 5) {
          polygon.style.setProperty("fill", `url(#vis-g-aqua-${uid})`, "important");
        } else {
          polygon.style.setProperty("fill", `url(#vis-g-coral-${uid})`, "important");
        }
      }
    });
    const edgeColor = getDiagramSpec(true).edgeStroke;
    svg.querySelectorAll(".edgePath path.path, path.flowchart-link, path.transition").forEach((p) => {
      p.style.setProperty("stroke", edgeColor, "important");
      p.style.setProperty("stroke-width", "2px", "important");
      p.style.setProperty("stroke-dasharray", "none", "important");
    });
    svg.querySelectorAll("marker path").forEach((m) => {
      m.style.setProperty("fill", edgeColor, "important");
      m.style.setProperty("stroke", edgeColor, "important");
    });
  }
  function decorateVisualCards(svg, uid) {
    const capGradients = [
      `url(#vis-cap-coral-${uid})`,
      `url(#vis-cap-gold-${uid})`,
      `url(#vis-cap-violet-${uid})`,
      `url(#vis-cap-teal-${uid})`
    ];
    const stepLabel = (n) => (n < 26 ? "" : stepLabel(Math.floor(n / 26) - 1)) + String.fromCharCode(65 + n % 26);
    let cardCount = 0;
    const nodePos = (g) => {
      const m = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(g.getAttribute("transform") || "");
      return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
    };
    const orderedNodes = Array.from(svg.querySelectorAll("g.node:not(.statediagram-cluster)")).map((g) => ({ g, pos: nodePos(g) })).sort((a, b) => a.pos.y - b.pos.y || a.pos.x - b.pos.x).map((item) => item.g);
    orderedNodes.forEach((g) => {
      const rect = g.querySelector("rect.basic, rect.label-container") || g.querySelector("rect");
      if (!rect) return;
      const x = parseFloat(rect.getAttribute("x") || 0);
      const y = parseFloat(rect.getAttribute("y") || 0);
      const w = parseFloat(rect.getAttribute("width") || 0);
      const h = parseFloat(rect.getAttribute("height") || 0);
      if (w <= 10 || h <= 10) return;
      const idx = cardCount++;
      rect.setAttribute("rx", "12");
      rect.setAttribute("ry", "12");
      rect.style.setProperty("fill", "#FFFFFF", "important");
      rect.style.setProperty("stroke", "#E2E8F0", "important");
      rect.style.setProperty("stroke-width", "1.5px", "important");
      rect.setAttribute("filter", `url(#vis-card-shadow-${uid})`);
      const cap = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      cap.setAttribute("x", String(x));
      cap.setAttribute("y", String(y));
      cap.setAttribute("width", String(w));
      const capH = Math.min(24, h * 0.38);
      cap.setAttribute("height", String(capH));
      cap.setAttribute("rx", "12");
      cap.setAttribute("ry", "12");
      cap.style.setProperty("fill", capGradients[idx % capGradients.length], "important");
      cap.style.setProperty("stroke", "none", "important");
      cap.style.setProperty("pointer-events", "none");
      g.appendChild(cap);
      const label = g.querySelector(":scope > .label");
      if (label) label.setAttribute("transform", `${label.getAttribute("transform") || ""} translate(0, ${capH / 2 + 2})`.trim());
      const stepText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      stepText.setAttribute("x", String(x + 10));
      stepText.setAttribute("y", String(y + capH - 7));
      stepText.setAttribute("fill", "#FFFFFF");
      stepText.setAttribute("font-size", "11");
      stepText.setAttribute("font-weight", "800");
      stepText.setAttribute("font-family", '"Plus Jakarta Sans", sans-serif');
      stepText.textContent = stepLabel(idx);
      g.appendChild(stepText);
      g.querySelectorAll("foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel").forEach((el) => {
        el.style.setProperty("color", "#0F172A", "important");
        el.style.setProperty("fill", "#0F172A", "important");
        el.style.setProperty("font-weight", "700", "important");
      });
    });
    const edgeColor = getDiagramSpec(true).edgeStroke;
    svg.querySelectorAll(".edgePath path.path, path.flowchart-link, path.transition").forEach((p) => {
      p.style.setProperty("stroke", edgeColor, "important");
      p.style.setProperty("stroke-width", "2px", "important");
    });
  }
  function decorateVisualCircles(svg, uid) {
    const circlePalette = ["#D45D53", "#7EA6BF", "#ECB674", "#7D9763", "#6D597A", "#3D464D"];
    svg.querySelectorAll("g.node:not(.statediagram-cluster)").forEach((g, idx) => {
      const rect = g.querySelector("rect.basic, rect.label-container") || g.querySelector("rect");
      const color = circlePalette[idx % circlePalette.length];
      if (rect) {
        rect.setAttribute("rx", "9999");
        rect.setAttribute("ry", "9999");
        rect.style.setProperty("fill", color, "important");
        rect.style.setProperty("stroke", "#FFFFFF", "important");
        rect.style.setProperty("stroke-width", "2.5px", "important");
        rect.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
      }
      const polygon = g.querySelector("polygon");
      if (polygon) {
        polygon.style.setProperty("fill", color, "important");
        polygon.style.setProperty("stroke", "#FFFFFF", "important");
        polygon.style.setProperty("stroke-width", "2.5px", "important");
        polygon.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
      }
      const textColor = CIRCLE_DARK_TEXT_FILLS.includes(color) ? "#3B2A0E" : "#FFFFFF";
      g.querySelectorAll("foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel").forEach((el) => {
        el.style.setProperty("color", textColor, "important");
        el.style.setProperty("fill", textColor, "important");
        el.style.setProperty("font-weight", "700", "important");
      });
    });
    svg.querySelectorAll(".edgePath path.path, path.flowchart-link, path.transition").forEach((p, idx) => {
      const color = circlePalette[idx % circlePalette.length];
      p.style.setProperty("stroke", color, "important");
      p.style.setProperty("stroke-width", "4px", "important");
      p.style.setProperty("stroke-linecap", "round", "important");
      p.style.setProperty("stroke-dasharray", "0 9", "important");
    });
    svg.querySelectorAll("marker path").forEach((m) => {
      m.style.setProperty("fill", "#7EA6BF", "important");
    });
  }
  function decorateVisualEditorial(svg, uid) {
    svg.querySelectorAll("g.node:not(.statediagram-cluster)").forEach((g, idx) => {
      const rect = g.querySelector("rect.basic, rect.label-container") || g.querySelector("rect");
      const text = (g.textContent || "").toLowerCase();
      if (rect && parseFloat(rect.getAttribute("height") || 0) <= 10) return;
      if (rect) {
        if (idx === 0 || text.includes("start") || text.includes("client")) {
          rect.setAttribute("rx", "9999");
          rect.setAttribute("ry", "9999");
          rect.style.setProperty("fill", "#FFFFFF", "important");
          rect.style.setProperty("stroke", "#E29578", "important");
          rect.style.setProperty("stroke-width", "3px", "important");
        } else if (text.includes("type") || text.includes("terminat") || text.includes("landing") || text.includes("docking")) {
          rect.setAttribute("rx", "8");
          rect.setAttribute("ry", "8");
          rect.style.setProperty("fill", "#D68C8C", "important");
          rect.style.setProperty("stroke", "none", "important");
          g.querySelectorAll("foreignObject div, foreignObject span, text").forEach((el) => {
            el.style.setProperty("color", "#FFFFFF", "important");
            el.style.setProperty("fill", "#FFFFFF", "important");
          });
          return;
        } else {
          rect.setAttribute("rx", "9999");
          rect.setAttribute("ry", "9999");
          rect.style.setProperty("fill", "#FFFFFF", "important");
          rect.style.setProperty("stroke", "none", "important");
          rect.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
        }
      }
      g.querySelectorAll("foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel").forEach((el) => {
        el.style.setProperty("color", "#2B2D42", "important");
        el.style.setProperty("fill", "#2B2D42", "important");
        el.style.setProperty("font-weight", "600", "important");
      });
    });
    svg.querySelectorAll(".edgePath path.path, path.flowchart-link, path.transition").forEach((p) => {
      p.style.setProperty("stroke", "#8FA876", "important");
      p.style.setProperty("stroke-width", "3.5px", "important");
      p.style.setProperty("stroke-dasharray", "none", "important");
    });
    svg.querySelectorAll("marker path").forEach((m) => {
      m.style.setProperty("fill", "#8FA876", "important");
      m.style.setProperty("stroke", "#8FA876", "important");
    });
  }
  function fixMarkerScale(svg) {
    const scale = 1.6;
    svg.querySelectorAll("marker").forEach((marker) => {
      if (marker.getAttribute("markerUnits") === "userSpaceOnUse") return;
      const w = parseFloat(marker.getAttribute("markerWidth") || 3);
      const h = parseFloat(marker.getAttribute("markerHeight") || 3);
      if (!marker.getAttribute("viewBox")) marker.setAttribute("viewBox", `0 0 ${w} ${h}`);
      marker.setAttribute("markerUnits", "userSpaceOnUse");
      marker.setAttribute("markerWidth", String(w * scale));
      marker.setAttribute("markerHeight", String(h * scale));
    });
  }
  function decorateVisualSequence(svg, styleMode, visualSpec, uid) {
    const actorOrder = [];
    svg.querySelectorAll("rect.actor").forEach((rect) => {
      const name = rect.getAttribute("name") || "";
      if (!actorOrder.includes(name)) actorOrder.push(name);
      const idx = actorOrder.indexOf(name);
      rect.setAttribute("rx", "10");
      rect.setAttribute("ry", "10");
      rect.setAttribute("filter", `url(#vis-soft-shadow-${uid})`);
      if (styleMode === "shapes") {
        rect.style.setProperty("fill", `url(#vis-g-amber-${uid})`, "important");
        rect.style.setProperty("stroke", "none", "important");
      } else if (styleMode === "circles") {
        rect.style.setProperty("fill", ["#7EA6BF", "#D45D53", "#7D9763", "#ECB674"][idx % 4], "important");
        rect.style.setProperty("stroke", "#FFFFFF", "important");
        rect.style.setProperty("stroke-width", "2px", "important");
      } else {
        rect.style.setProperty("fill", "#FFFFFF", "important");
        rect.style.setProperty("stroke", visualSpec.nodeStroke, "important");
        rect.style.setProperty("stroke-width", "1.5px", "important");
      }
    });
    svg.querySelectorAll("text.actor, text.actor tspan").forEach((el) => {
      if (el.closest(".actor-man")) return;
      el.style.setProperty("fill", styleMode === "circles" ? "#FFFFFF" : "#1E293B", "important");
      if (styleMode === "circles") el.style.setProperty("font-weight", "700", "important");
    });
    const isDark = state.appearance === "dark";
    styleSequenceDiagram(svg, {
      lifeline: visualSpec.lifeline,
      activationBg: visualSpec.activationBg,
      activationBorder: visualSpec.activationBorder,
      signal: visualSpec.edgeStroke,
      // 番号は矢じりと同じ色の円の上に載る。Dark では円が明るい色になるため、番号を暗い色にする
      numberText: isDark ? "#0F172A" : "#FFFFFF",
      messageText: visualSpec.nodeText
    });
  }
  function createDiagramCard(index, svgHtml, isRendering, isVisual, curve = null) {
    const content = isRendering ? `<div class="py-12 font-mono text-xs text-blue-500 animate-pulse flex items-center justify-center">Rendering Diagram 0${index + 1}...</div>` : svgHtml;
    const cardClass = isVisual ? `exhibition-diagram-card infographic-bg-${state.infographicStyle}` : "diagram-frame";
    const headerClass = isVisual ? "exhibition-diagram-header" : "diagram-frame-header";
    const viewportClass = isVisual ? "exhibition-viewport" : "diagram-viewport";
    const badgeLabel = isVisual ? `INFOGRAPHIC // 0${index + 1}` : `DIAGRAM 0${index + 1}`;
    const curvePicker = curve ? `<div class="pill-container mr-1.5" role="group" aria-label="矢印の形状">${Object.entries(CURVE_LABELS).map(([key, label]) => `<button type="button" data-curve="${key}" data-index="${index}" aria-pressed="${key === curve}" class="edge-curve-btn pill-btn text-[10px]${key === curve ? " is-active" : ""}">${label}</button>`).join("")}</div>` : "";
    return `
    <div id="diagram-frame-${index}" class="${cardClass}">
      <div class="${headerClass}">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full ${isVisual ? "bg-amber-500 shadow-sm" : "bg-blue-500"}"></span>
          <span class="font-mono text-[11px] font-bold tracking-wider" style="color: var(--text-primary);">${badgeLabel}</span>
        </div>
        <div class="flex items-center gap-1">
          ${curvePicker}
          <div class="pill-container mr-1.5">
            <button type="button" data-action="scale-fit" data-index="${index}" class="scale-btn pill-btn is-active text-[10px]">Fit</button>
            <button type="button" data-action="scale-actual" data-index="${index}" class="scale-btn pill-btn text-[10px]">1:1</button>
          </div>
          <button type="button" data-action="png" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">PNG</button>
          <button type="button" data-action="svg" data-index="${index}" class="text-[11px] font-semibold px-2 py-1 rounded hover:bg-blue-500/10 transition-colors cursor-pointer" style="color: var(--text-primary);">SVG</button>
          <button type="button" data-action="zoom" data-index="${index}" class="text-[11px] font-bold px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors cursor-pointer">Expand</button>
        </div>
      </div>
      <div class="${viewportClass}" data-stage-index="${index}">
        ${content}
      </div>
    </div>
  `;
  }
  var TEMPLATE_LIMITS = {
    leadChars: 160,
    itemChars: 100,
    quoteChars: 240,
    points: [2, 6],
    steps: [2, 8],
    glossary: [2, 12],
    glossaryTermChars: 40,
    glossaryItemChars: 200,
    glossaryTwoUp: 7
  };
  var TEMPLATE_ITEM_BLOCKERS = "ul, ol, pre, table, blockquote, input";
  var GLOSSARY_SEPARATOR_RE = /^\s*[—–―]\s*/;
  function glossaryParts(li) {
    const head = li.firstChild;
    const rest = head && head.nextSibling;
    if (!head || head.nodeName !== "STRONG" || !rest || rest.nodeType !== Node.TEXT_NODE || !GLOSSARY_SEPARATOR_RE.test(rest.textContent)) return null;
    return { head, rest };
  }
  function isGlossaryList(items) {
    const [min, max] = TEMPLATE_LIMITS.glossary;
    return items.length >= min && items.length <= max && items.every((li) => {
      const parts = glossaryParts(li);
      return parts && !li.querySelector(TEMPLATE_ITEM_BLOCKERS) && parts.head.textContent.trim().length <= TEMPLATE_LIMITS.glossaryTermChars && li.textContent.trim().length <= TEMPLATE_LIMITS.glossaryItemChars;
    });
  }
  function detectSlabTemplate(els, slotCount) {
    if (slotCount > 0 || els.length === 0) return "standard";
    const textLen = (el) => el.textContent.trim().length;
    const tags = els.map((el) => el.tagName);
    const leadLen = els.reduce((sum, el) => sum + textLen(el), 0);
    if (tags.every((t) => t === "P") && els.length <= 2 && leadLen > 0 && leadLen <= TEMPLATE_LIMITS.leadChars) return "lead";
    const list = els[els.length - 1];
    const hasIntro = els.length === 2 && tags[0] === "P";
    if ((els.length === 1 || hasIntro) && (list.tagName === "UL" || list.tagName === "OL")) {
      const items = Array.from(list.children);
      if (list.tagName === "UL" && isGlossaryList(items)) return "glossary";
      const plain = items.every((li) => !li.querySelector(TEMPLATE_ITEM_BLOCKERS) && textLen(li) <= TEMPLATE_LIMITS.itemChars);
      const [min, max] = list.tagName === "UL" ? TEMPLATE_LIMITS.points : TEMPLATE_LIMITS.steps;
      if (plain && items.length >= min && items.length <= max) return list.tagName === "UL" ? "points" : "steps";
    }
    if (els.length === 1 && tags[0] === "BLOCKQUOTE") {
      const paras = Array.from(els[0].children);
      if (paras.length >= 1 && paras.length <= 3 && paras.every((p) => p.tagName === "P") && textLen(els[0]) <= TEMPLATE_LIMITS.quoteChars) return "quote";
    }
    return "standard";
  }
  var METRIC_TITLE_RE = /^[+\-−±≈~]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|ms|s|sec|min|h|fps|Hz|kHz|MHz|GHz|KB|MB|GB|TB|px|rem|em|vw|vh|x|×|倍|件|個|円|万|億|回|人|台|年|月|日|時間|分|秒|字|項目|行|列|枚|種|点|章|節|段|[a-zA-Z]{1,4})?(?:\s*[/／]\s*[a-zA-Z0-9一-龠ぁ-んァ-ヶ]+)?$/;
  var TIMELINE_TITLE_RE = /^(?:(?:19|20)\d{2}(?:[年/\-.\s]*(?:Q[1-4]|H[12]|[01]?\d(?:月)?))?|Q[1-4]\s*(?:19|20)?\d{2}|(?:Phase|Step|Stage|Wave|Sprint|Day|Week|Month|Year)\s*\d+|第\s*\d+\s*(?:期|世代|段階|フェーズ)|v\d+\.\d+(?:\.\d+)?)$/i;
  var COMPARE_BEFORE_RE = /^(?:Before|As[\s-]?Is|Legacy|Old|従来(?:方式|手法)?|旧(?:方式|世代|システム)?|変更前|導入前|課題|問題点)(?:\s*[:：\-—/／(（].*)?$/i;
  var COMPARE_AFTER_RE = /^(?:After|To[\s-]?Be|New|Modern|Lucivo|新(?:方式|手法|世代|システム)?|変更後|導入後|解決(?:策)?|改善後)(?:\s*[:：\-—/／(（].*)?$/i;
  function applySlabTemplate(template, els) {
    const last = els[els.length - 1];
    if (template === "lead") {
      const lead = document.createElement("div");
      lead.className = "vs-lead";
      els[0].before(lead);
      els.forEach((el) => lead.appendChild(el));
    } else if (template === "points") {
      const items = Array.from(last.children);
      const count = items.length;
      last.classList.add("vs-points");
      last.style.setProperty("--vs-cols", String(count === 4 ? 2 : Math.min(count, 3)));
      last.style.setProperty("--vs-cols-wide", String(count === 4 ? 4 : Math.min(count, 3)));
      const titles = [];
      items.forEach((li) => {
        const head = li.firstChild;
        const rest = head && head.nextSibling;
        if (head && head.nodeName === "STRONG" && rest && rest.nodeType === 3 && /^\s*[:：]/.test(rest.textContent)) {
          head.classList.add("vs-point-title");
          rest.textContent = rest.textContent.replace(/^\s*[:：]\s*/, "");
          const titleText = head.textContent.trim();
          titles.push({ li, head, titleText });
          if (METRIC_TITLE_RE.test(titleText) && !TIMELINE_TITLE_RE.test(titleText)) {
            li.classList.add("vs-metric-item");
            head.classList.add("vs-metric-value");
          }
        }
        const ornament = document.createElement("span");
        ornament.className = "vs-card-ornament";
        ornament.setAttribute("aria-hidden", "true");
        li.appendChild(ornament);
      });
      if (titles.length === count && titles.every((t) => TIMELINE_TITLE_RE.test(t.titleText))) {
        last.classList.add("vs-points-timeline");
        titles.forEach(({ li, head }) => {
          li.classList.remove("vs-metric-item");
          head.classList.remove("vs-metric-value");
          li.classList.add("vs-timeline-item");
          head.classList.add("vs-timeline-badge");
        });
      } else if (count === 2 && titles.length === 2 && COMPARE_BEFORE_RE.test(titles[0].titleText) && COMPARE_AFTER_RE.test(titles[1].titleText)) {
        last.classList.add("vs-points-compare");
        titles[0].li.classList.add("vs-compare-before");
        titles[1].li.classList.add("vs-compare-after");
      }
    } else if (template === "glossary") {
      const items = Array.from(last.children);
      const dl = document.createElement("dl");
      dl.className = "vs-glossary";
      if (items.length >= TEMPLATE_LIMITS.glossaryTwoUp) dl.classList.add("is-two-up");
      items.forEach((li) => {
        const { head, rest } = glossaryParts(li);
        rest.textContent = rest.textContent.replace(GLOSSARY_SEPARATOR_RE, "");
        const dt = document.createElement("dt");
        dt.append(...head.childNodes);
        head.remove();
        const dd = document.createElement("dd");
        dd.append(...li.childNodes);
        const row = document.createElement("div");
        row.className = "vs-gloss-row";
        row.append(dt, dd);
        dl.appendChild(row);
      });
      last.replaceWith(dl);
    } else if (template === "steps") {
      const count = last.children.length;
      last.classList.add("vs-steps");
      if (count > 4) last.classList.add("is-vertical");
      last.style.setProperty("--vs-n", String(count));
      Array.from(last.children).forEach((li, idx) => {
        li.style.setProperty("--vs-i", String(idx));
        if (idx === 0) return;
        const chevron = document.createElement("span");
        chevron.className = "vs-step-chevron";
        chevron.setAttribute("aria-hidden", "true");
        li.appendChild(chevron);
      });
    } else if (template === "quote") {
      last.classList.add("vs-quote");
      const cite = last.lastElementChild;
      if (last.children.length > 1 && /^\s*(—|―|--)/.test(cite.textContent)) cite.classList.add("vs-quote-cite");
    }
  }
  function clearVisualStageSpotlight(container) {
    if (!container) return;
    container.querySelectorAll(".has-spotlight, .is-spotlight, .is-reached, .has-stage-focus, .is-stage-focused").forEach((el) => {
      el.classList.remove("has-spotlight", "is-spotlight", "is-reached", "has-stage-focus", "is-stage-focused");
    });
  }
  var SLAB_IMAGE_EXPORT_ENABLED = false;
  function buildSlabActionsHtml() {
    if (!SLAB_IMAGE_EXPORT_ENABLED) return "";
    return `
    <div class="slab-actions" aria-label="スラブの操作">
      <button type="button" class="slab-action-btn btn-copy-slab" title="この章のカード画像をクリップボードにコピー" aria-label="コピー"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg></button>
      <button type="button" class="slab-action-btn btn-export-slab" title="この章のカード画像をPNGとして保存" aria-label="PNG"><svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg></button>
    </div>
  `;
  }
  function getSlabFilename(slabEl) {
    const stageNo = slabEl.dataset.stageNo || "00";
    const h2 = slabEl.querySelector("h2");
    let title = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, "").trim() : "slab";
    title = title.toLowerCase().replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF_-]+/g, "-").slice(0, 30);
    return `slab-${stageNo}-${title || "card"}.png`;
  }
  function renderSlabToBlob(slabEl) {
    const rect = slabEl.getBoundingClientRect();
    const width = Math.max(360, Math.ceil(rect.width));
    const height = Math.max(200, Math.ceil(rect.height));
    const computed = window.getComputedStyle(slabEl);
    const bgColor = computed.backgroundColor || (state.appearance === "dark" ? "#1E293B" : "#FFFFFF");
    const textColor = computed.color || (state.appearance === "dark" ? "#F8FAFC" : "#0F172A");
    const borderColor = computed.borderColor || "rgba(148, 163, 184, 0.2)";
    const wrapEl = slabEl.closest(".exhibition-wrap");
    const wrapComputed = wrapEl ? window.getComputedStyle(wrapEl) : computed;
    const vsC1 = wrapComputed.getPropertyValue("--vs-c1") || "#3B82F6";
    const h2 = slabEl.querySelector("h2");
    const stageBadge = slabEl.querySelector(".exhibition-num-badge");
    const stageText = stageBadge ? stageBadge.textContent.trim() : slabEl.dataset.stageNo ? `STAGE ${slabEl.dataset.stageNo}` : "";
    const titleText = h2 ? h2.textContent.replace(/^STAGE\s*\d+\s*/i, "").replace(/コピー|PNG/g, "").trim() : "Lucivo Card";
    const leadEl = slabEl.querySelector(".vs-lead, p, .vs-quote, li");
    const leadText = leadEl ? leadEl.textContent.trim().slice(0, 120) : "";
    return new Promise((resolve) => {
      const renderFallback = () => {
        try {
          const scale = 2;
          const canvas = document.createElement("canvas");
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext("2d");
          ctx.scale(scale, scale);
          ctx.fillStyle = bgColor;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(0, 0, width, height, 16);
            ctx.fill();
          } else {
            ctx.fillRect(0, 0, width, height);
          }
          ctx.strokeStyle = borderColor;
          ctx.lineWidth = 1;
          if (ctx.roundRect) {
            ctx.beginPath();
            ctx.roundRect(0, 0, width, height, 16);
            ctx.stroke();
          } else {
            ctx.strokeRect(0, 0, width, height);
          }
          let textX = 24;
          if (stageText) {
            ctx.fillStyle = vsC1.trim() || "#3B82F6";
            const badgeWidth = 72;
            const badgeHeight = 22;
            if (ctx.roundRect) {
              ctx.beginPath();
              ctx.roundRect(textX, 22, badgeWidth, badgeHeight, 11);
              ctx.fill();
            } else {
              ctx.fillRect(textX, 22, badgeWidth, badgeHeight);
            }
            ctx.fillStyle = "#FFFFFF";
            ctx.font = 'bold 11px "JetBrains Mono", monospace';
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(stageText, textX + badgeWidth / 2, 22 + badgeHeight / 2);
            textX += badgeWidth + 12;
          }
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillStyle = textColor;
          ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
          ctx.fillText(titleText, textX, 33);
          if (leadText) {
            ctx.fillStyle = textColor;
            ctx.font = '14px "Noto Sans JP", sans-serif';
            ctx.textBaseline = "top";
            ctx.fillText(leadText, 24, 60);
          }
          canvas.toBlob((blob) => {
            resolve(blob || new Blob([], { type: "image/png" }));
          }, "image/png");
        } catch (err) {
          resolve(new Blob([], { type: "image/png" }));
        }
      };
      const timer = setTimeout(renderFallback, 250);
      try {
        const clone = slabEl.cloneNode(true);
        clone.querySelectorAll(".slab-actions, canvas.signal-light-canvas").forEach((el) => el.remove());
        const svgData = `
        <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
          <foreignObject width="100%" height="100%">
            <div xmlns="http://www.w3.org/1999/xhtml">
              <div style="font-family:'Plus Jakarta Sans',sans-serif;color:${textColor};background:${bgColor};padding:1.5rem;width:100%;height:100%;box-sizing:border-box;">
                ${clone.innerHTML}
              </div>
            </div>
          </foreignObject>
        </svg>
      `;
        const img = new Image();
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        img.onload = () => {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          try {
            const scale = 2;
            const canvas = document.createElement("canvas");
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext("2d");
            ctx.scale(scale, scale);
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) resolve(blob);
              else renderFallback();
            }, "image/png");
          } catch (e) {
            renderFallback();
          }
        };
        img.onerror = () => {
          clearTimeout(timer);
          URL.revokeObjectURL(url);
          renderFallback();
        };
        img.src = url;
      } catch (e) {
        clearTimeout(timer);
        renderFallback();
      }
    });
  }
  async function copySlabImage(slabEl) {
    const filename = getSlabFilename(slabEl);
    try {
      const blob = await renderSlabToBlob(slabEl);
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        showToast("スラブ画像をクリップボードにコピーしました");
      } else {
        downloadBlob(blob, filename, "image/png");
        showToast("クリップボード非対応のため画像を保存しました");
      }
    } catch (err) {
      console.warn("copySlabImage failed, fallback to download", err);
      try {
        const blob = await renderSlabToBlob(slabEl);
        downloadBlob(blob, filename, "image/png");
        showToast("画像を保存しました");
      } catch (e) {
        showToast("画像のエクスポートに失敗しました");
      }
    }
  }
  async function exportSlabImage(slabEl) {
    const filename = getSlabFilename(slabEl);
    try {
      const blob = await renderSlabToBlob(slabEl);
      downloadBlob(blob, filename, "image/png");
      showToast("スラブ画像を保存しました");
    } catch (err) {
      console.warn("exportSlabImage failed", err);
      showToast("画像のエクスポートに失敗しました");
    }
  }
  function setupVisualStageInteractions() {
    const visContainer = document.getElementById("visual-stage-container");
    if (!visContainer) return;
    window.addEventListener("beforeprint", () => clearVisualStageSpotlight(visContainer));
    visContainer.addEventListener("click", (event) => {
      const agendaItem = event.target.closest(".vs-cover-agenda-item");
      if (agendaItem) {
        const slab = visContainer.querySelector(`.exhibition-slab[data-stage-no="${agendaItem.dataset.stageTarget}"]`);
        if (slab) slab.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
        return;
      }
      const copyBtn = event.target.closest(".btn-copy-slab");
      if (copyBtn) {
        const slab = copyBtn.closest(".exhibition-slab");
        if (slab) copySlabImage(slab);
        return;
      }
      const exportBtn = event.target.closest(".btn-export-slab");
      if (exportBtn) {
        const slab = exportBtn.closest(".exhibition-slab");
        if (slab) exportSlabImage(slab);
        return;
      }
      const codeCopyBtn = event.target.closest(".vs-code-copy-btn");
      if (codeCopyBtn) {
        const pre = codeCopyBtn.closest("pre");
        const codeEl = pre && pre.querySelector("code");
        const codeText = codeEl ? codeEl.textContent : "";
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(codeText).catch(() => {
          });
        }
        codeCopyBtn.setAttribute("data-copy-label", "Copied");
        codeCopyBtn.classList.add("is-copied");
        showToast("コードをクリップボードにコピーしました");
        setTimeout(() => {
          codeCopyBtn.setAttribute("data-copy-label", "Copy");
          codeCopyBtn.classList.remove("is-copied");
        }, 1600);
        return;
      }
      if (event.target.closest("a, button")) return;
      const badge = event.target.closest(".exhibition-num-badge");
      if (badge) {
        const slab = badge.closest(".exhibition-slab");
        const wrap = badge.closest(".exhibition-wrap");
        if (!slab || !wrap) return;
        slab.classList.toggle("is-stage-focused");
        wrap.classList.toggle("has-stage-focus", Boolean(wrap.querySelector(".exhibition-slab.is-stage-focused")));
        return;
      }
      const pointItem = event.target.closest(".vs-points > li");
      if (pointItem) {
        const list = pointItem.parentElement;
        const willSpotlight = !pointItem.classList.contains("is-spotlight");
        Array.from(list.children).forEach((li) => li.classList.remove("is-spotlight"));
        if (willSpotlight) pointItem.classList.add("is-spotlight");
        list.classList.toggle("has-spotlight", willSpotlight);
        return;
      }
      const stepItem = event.target.closest(".vs-steps > li");
      if (stepItem) {
        const list = stepItem.parentElement;
        const items = Array.from(list.children);
        const targetIdx = items.indexOf(stepItem);
        const willSpotlight = !stepItem.classList.contains("is-spotlight");
        items.forEach((li, idx) => {
          li.classList.toggle("is-spotlight", willSpotlight && idx === targetIdx);
          li.classList.toggle("is-reached", willSpotlight && idx <= targetIdx);
        });
        list.classList.toggle("has-spotlight", willSpotlight);
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") clearVisualStageSpotlight(visContainer);
    });
  }
  var COVER_LIMITS = { agenda: [3, 15], tags: 4 };
  function readCoverMeta(yaml) {
    const meta = { title: "", description: "", tags: [], author: "", date: "" };
    if (!yaml) return meta;
    const lines = yaml.split(/\r?\n/);
    const scalar = (v) => {
      const q = /^(['"])(.*)\1\s*(?:#.*)?$/.exec(v.trim());
      return q ? q[2].trim() : v.replace(/\s+#.*$/, "").trim();
    };
    for (let i = 0; i < lines.length; i++) {
      const m = /^(title|description|tags|author|date)[ \t]*:[ \t]*(.*)$/.exec(lines[i]);
      if (!m) continue;
      const [, key, raw] = m;
      const block = [];
      for (let j = i + 1; j < lines.length && (/^\s+\S/.test(lines[j]) || lines[j].trim() === ""); j++) {
        if (lines[j].trim()) block.push(lines[j].trim());
      }
      const value = raw.trim();
      if (key === "tags") {
        if (value.startsWith("[")) {
          meta.tags = value.replace(/^\[|\]\s*(?:#.*)?$/g, "").split(",").map(scalar);
        } else if (value) {
          meta.tags = value.split(",").map(scalar);
        } else {
          meta.tags = block.filter((l) => l.startsWith("-")).map((l) => scalar(l.replace(/^-\s*/, "")));
        }
        meta.tags = meta.tags.filter(Boolean).slice(0, COVER_LIMITS.tags);
      } else if (key === "author" || key === "date") {
        if (value && !/^[>|][+-]?$/.test(value)) meta[key] = scalar(value);
      } else {
        meta[key] = !value || /^[>|][+-]?$/.test(value) ? block.join(" ") : scalar(value);
      }
    }
    return meta;
  }
  function buildCoverHtml(title, meta, agenda, figureCount = 0) {
    const eyebrow = meta.tags.length ? `<p class="vs-cover-eyebrow">${meta.tags.map(escapeHtml).join('<span class="vs-cover-sep" aria-hidden="true">/</span>')}</p>` : "";
    const deck = meta.description ? `<p class="vs-cover-deck">${escapeHtml(meta.description)}</p>` : "";
    const specItems = [];
    if (meta.author) specItems.push({ kind: "author", label: meta.author });
    if (meta.date) specItems.push({ kind: "date", label: meta.date });
    if (agenda.length > 0) specItems.push({ kind: "stages", label: `${agenda.length} ${agenda.length === 1 ? "STAGE" : "STAGES"}` });
    if (figureCount > 0) specItems.push({ kind: "figures", label: `${figureCount} ${figureCount === 1 ? "FIGURE" : "FIGURES"}` });
    const specsHtml = specItems.length ? `<div class="vs-cover-specs" aria-label="文書スペック">${specItems.map(
      (item) => `<span class="vs-cover-spec-pill" data-spec-kind="${item.kind}" data-spec-label="${escapeHtml(item.label)}"></span>`
    ).join("")}</div>` : "";
    const [min, max] = COVER_LIMITS.agenda;
    let agendaHtml = "";
    if (agenda.length >= min && agenda.length <= max) {
      const cols = agenda.length <= 6 ? 2 : 3;
      const rows = Math.ceil(agenda.length / cols);
      agendaHtml = `<ol class="vs-cover-agenda" style="--vs-rows: ${rows};" aria-label="目次">${agenda.map(
        (a) => `<li><button type="button" class="vs-cover-agenda-item" data-stage-target="${a.no}"><span class="vs-cover-agenda-no">${a.no}</span><span class="vs-cover-agenda-title">${escapeHtml(a.title)}</span></button></li>`
      ).join("")}</ol>`;
    }
    return `
      <div class="exhibition-hero vs-cover">
        <span class="vs-cover-texture" aria-hidden="true"></span>
        <div class="exhibition-hero-top">
          <span class="exhibition-hero-emblem" aria-hidden="true"></span>
          <div class="four-color-bar"><span></span><span></span><span></span><span></span></div>
        </div>
        ${eyebrow}
        <h1 class="vs-cover-title font-display">${escapeHtml(title)}</h1>
        ${deck}
        ${specsHtml}
        ${agendaHtml}
      </div>`;
  }
  var NUMERIC_CELL = /^[+\-−±]?[¥$€£]?\d[\d,]*(?:\.\d+)?[ \t]*(?:%|％|[a-zA-Z]{1,3}|件|個|円|倍|回|人|台|年|日|時間|分|秒|字|項目|行|列|枚|×)?$/;
  var EMPTY_CELL = /^(?:[-–—―]|N\/A)?$/i;
  var TABLE_LABEL_CHARS = 10;
  function markTableColumns(table) {
    const head = Array.from(table.querySelectorAll("thead th"));
    const rows = Array.from(table.querySelectorAll("tbody tr"));
    const cols = head.length || (rows[0] ? rows[0].children.length : 0);
    for (let c = 0; c < cols; c++) {
      const cells = rows.map((r) => r.children[c]).filter(Boolean);
      const texts = cells.map((td) => td.textContent.trim());
      const filled = texts.filter((t) => !EMPTY_CELL.test(t));
      if (!filled.length) continue;
      const all = [head[c], ...cells].filter(Boolean);
      const numeric = c > 0 && filled.every((t) => NUMERIC_CELL.test(t)) && !all.some((cell) => cell.hasAttribute("align"));
      if (numeric) {
        all.forEach((cell) => cell.classList.add("vs-num"));
      } else if (filled.every((t) => t.length <= TABLE_LABEL_CHARS && !/\s/.test(t))) {
        cells.forEach((cell) => cell.classList.add("vs-label"));
      }
    }
  }
  var CODE_LANG_ALIASES = {
    javascript: "JS",
    js: "JS",
    typescript: "TS",
    ts: "TS",
    python: "PY",
    py: "PY",
    bash: "SH",
    sh: "SH",
    shell: "SH",
    zsh: "SH",
    markdown: "MD",
    md: "MD",
    yml: "YAML"
  };
  function decorateCodeBlocks(container) {
    container.querySelectorAll("pre").forEach((pre) => {
      if (pre.closest(".front-matter")) return;
      const code = pre.querySelector("code");
      if (!code) return;
      const m = /language-([a-z0-9_+-]+)/i.exec(code.className || "");
      const rawLang = m ? m[1].toLowerCase() : "";
      const langLabel = CODE_LANG_ALIASES[rawLang] || (rawLang ? rawLang.toUpperCase() : "CODE");
      pre.classList.add("vs-code-block");
      pre.setAttribute("data-code-lang", langLabel);
      const caret = document.createElement("span");
      caret.className = "vs-code-caret";
      caret.setAttribute("aria-hidden", "true");
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "vs-code-copy-btn";
      copyBtn.setAttribute("data-copy-label", "Copy");
      copyBtn.setAttribute("title", "コードをクリップボードにコピー");
      copyBtn.setAttribute("aria-label", "コードをコピー");
      pre.appendChild(caret);
      pre.appendChild(copyBtn);
    });
  }
  function buildVisualStageHtml(cleanHtml, yaml) {
    const temp = document.createElement("div");
    temp.innerHTML = cleanHtml;
    temp.querySelectorAll("table").forEach(markTableColumns);
    decorateCodeBlocks(temp);
    decorateAlerts(temp);
    const totalFigures = temp.querySelectorAll(".lucivo-slot").length;
    const coverMeta = readCoverMeta(yaml);
    let heroTitle = coverMeta.title || (currentFileName !== "untitled.md" ? currentFileName.replace(/\.[^.]+$/, "") : "");
    const h1 = temp.querySelector("h1");
    if (h1) {
      heroTitle = h1.textContent;
      h1.remove();
    }
    const slabs = [];
    let currentNodes = [];
    const pushSlab = (nodes) => {
      if (nodes.some((n) => n.nodeType === 1 || n.textContent.trim())) slabs.push(nodes);
    };
    Array.from(temp.childNodes).forEach((node) => {
      if (node.nodeType === 1 && node.tagName === "H2") {
        pushSlab(currentNodes);
        currentNodes = [node];
      } else {
        currentNodes.push(node);
      }
    });
    pushSlab(currentNodes);
    let slabsHtml = "";
    let sectionCounter = 0;
    const agenda = [];
    slabs.forEach((nodes) => {
      const wrapper = document.createElement("div");
      nodes.forEach((n) => wrapper.appendChild(n.cloneNode(true)));
      const h2 = wrapper.querySelector("h2");
      if (h2) {
        sectionCounter++;
        const numStr = String(sectionCounter).padStart(2, "0");
        const rawTitle = h2.textContent.replace(/^\d+\.\s*/, "");
        h2.innerHTML = `<span class="exhibition-num-badge">STAGE ${numStr}</span><span>${escapeHtml(rawTitle)}</span>`;
        agenda.push({ no: numStr, title: rawTitle });
      }
      const stageAttr = h2 ? ` data-stage-no="${String(sectionCounter).padStart(2, "0")}"` : "";
      const slots = wrapper.querySelectorAll(".lucivo-slot");
      const children = Array.from(wrapper.children);
      const proseEls = children.filter((el) => el !== h2 && !el.classList.contains("front-matter") && !el.classList.contains("lucivo-slot") && !el.querySelector(".lucivo-slot"));
      const hasComplexBlock = proseEls.some((el) => /^(H[3-6]|TABLE|PRE)$/.test(el.tagName) || el.querySelector("table, pre"));
      const actionsHtml = buildSlabActionsHtml();
      if (slots.length === 1 && proseEls.length >= 1 && !hasComplexBlock) {
        const fm = wrapper.querySelector(":scope > .front-matter");
        const slotEl = children.find((el) => el.classList.contains("lucivo-slot") || el.querySelector(".lucivo-slot"));
        const proseHtml = proseEls.map((el) => el.outerHTML).join("");
        const headHtml = `${fm ? fm.outerHTML : ""}${h2 ? h2.outerHTML : ""}`;
        slabsHtml += `<section class="exhibition-slab exhibition-slab-split vs-tpl-split"${stageAttr}>${headHtml}<div class="exhibition-slab-body"><div class="exhibition-slab-prose">${proseHtml}</div><div class="exhibition-slab-figure">${slotEl.outerHTML}</div></div>${actionsHtml}</section>`;
      } else {
        const template = detectSlabTemplate(proseEls, slots.length);
        applySlabTemplate(template, proseEls);
        slabsHtml += `<section class="exhibition-slab vs-tpl-${template}"${stageAttr}>${wrapper.innerHTML}${actionsHtml}</section>`;
      }
    });
    const heroHtml = heroTitle ? buildCoverHtml(heroTitle, coverMeta, agenda, totalFigures) : "";
    return `
    <div class="exhibition-wrap vs-theme-${state.infographicStyle}">
      ${heroHtml}
      ${slabsHtml}
    </div>
  `;
  }
  function toLocalImageUrl(value) {
    const src = String(value || "").trim().replace(/%5C/gi, "/").replace(/\\/g, "/");
    if (/^[a-z]:\//i.test(src)) return `file:///${src}`;
    if (/^\/\/[^/]/.test(src) && /%5C|\\/i.test(String(value))) return `file:${src}`;
    if (/^file:\/\//i.test(src)) return src;
    return null;
  }
  function isRelativeSrc(src) {
    return Boolean(src) && !/^[a-z][a-z0-9+.-]*:|^[/#]/i.test(src);
  }
  function makeMissingImageBox(src, alt, hint) {
    const box = document.createElement("span");
    box.className = "img-missing";
    box.setAttribute("role", "img");
    box.setAttribute("aria-label", `画像を読み込めません: ${alt || src}`);
    const title = document.createElement("span");
    title.className = "img-missing-title";
    title.textContent = "画像を読み込めません";
    const path = document.createElement("span");
    path.className = "img-missing-path";
    path.textContent = src || "（パスがありません）";
    box.append(title, path);
    if (hint) {
      const note = document.createElement("span");
      note.className = "img-missing-hint";
      note.textContent = hint;
      box.append(note);
    }
    return box;
  }
  function setupLocalImages() {
    DOMPurify.addHook("uponSanitizeAttribute", (node, data) => {
      if (node.nodeName !== "IMG" || data.attrName !== "src") return;
      const inFolder = openedFolder && currentFolderPath !== null && isRelativeSrc(data.attrValue);
      const folderPath = inFolder ? resolveFolderPath(folderDirOf(currentFolderPath), data.attrValue) : null;
      if (inFolder && folderPath === null) {
        node.setAttribute("data-folder-src", data.attrValue);
        node.setAttribute("data-folder-outside", "");
        data.keepAttr = false;
        return;
      }
      if (folderPath !== null) {
        node.setAttribute("data-folder-src", folderPath);
        const cached = folderImageUrls.get(folderPath);
        if (typeof cached === "string") {
          node.setAttribute("src", cached);
          data.attrValue = cached;
          data.forceKeepAttr = true;
        } else {
          data.keepAttr = false;
        }
        return;
      }
      if (currentSampleFile && isRelativeSrc(data.attrValue)) {
        const samplePath = resolveFolderPath("", data.attrValue);
        if (samplePath === null) return;
        const sampleUrl = `${SAMPLES_DIR}/${samplePath.split("/").map(encodeURIComponent).join("/")}`;
        node.setAttribute("src", sampleUrl);
        data.attrValue = sampleUrl;
        data.forceKeepAttr = true;
        return;
      }
      const url = toLocalImageUrl(data.attrValue);
      if (!url) return;
      node.setAttribute("src", url);
      data.attrValue = url;
      data.forceKeepAttr = true;
    });
    document.addEventListener("error", (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.closest("#preview-scroll")) return;
      const src = img.getAttribute("data-folder-src") || img.getAttribute("src") || "";
      const hint = isRelativeSrc(src) && !img.hasAttribute("data-folder-src") ? "相対パスの画像は、「開く」→「フォルダを開く…」で開いた文書で表示できます。または絶対パス（C:\\… など）で指定してください" : "";
      img.replaceWith(makeMissingImageBox(src, img.getAttribute("alt"), hint));
    }, true);
  }
  function resolveFolderImages(container) {
    if (!openedFolder || !container) return;
    const folder = openedFolder;
    container.querySelectorAll("img[data-folder-src]:not([src])").forEach(async (img) => {
      const path = img.getAttribute("data-folder-src");
      if (img.hasAttribute("data-folder-outside")) {
        img.replaceWith(makeMissingImageBox(path, img.getAttribute("alt"), "開いたフォルダの外の画像は表示できません。上の階層のフォルダを開いてください"));
        return;
      }
      const url = await getFolderImageUrl(folder, path);
      if (!img.isConnected || folder !== openedFolder) return;
      if (url) img.setAttribute("src", url);
      else img.replaceWith(makeMissingImageBox(path, img.getAttribute("alt"), "フォルダの中に見つかりません"));
    });
  }
  function wrapTables(container) {
    if (!container) return;
    container.querySelectorAll("table").forEach((table) => {
      if (table.parentElement && table.parentElement.classList.contains("table-container")) return;
      const wrapper = document.createElement("div");
      wrapper.className = "table-container";
      table.before(wrapper);
      wrapper.appendChild(table);
    });
  }
  function renderApp() {
    const rawMarkdown = document.getElementById("markdown-editor").value;
    const { yaml, body } = splitFrontMatter(rawMarkdown);
    const parsed = marked.lexer(body);
    const mermaidBlocks = [];
    const tokensToKeep = [];
    let srcLine = countLinesBefore(rawMarkdown, rawMarkdown.length - body.length);
    parsed.forEach((token) => {
      if (token.type === "heading") token.srcLine = srcLine;
      srcLine += countLinesBefore(token.raw, token.raw.length);
      if (token.type === "code" && (token.lang || "").trim().toLowerCase() === "mermaid") {
        const index = mermaidBlocks.length;
        const code = token.text.trim();
        const curve = getBlockCurve(index, code);
        const hash = fnv1aHash(code + state.appearance + state.palette + (curve || "") + state.infographicStyle + (state.isVisualMode ? "vis" : "std"));
        mermaidBlocks.push({ index, code, hash, curve });
        tokensToKeep.push({
          type: "html",
          raw: `<div class="lucivo-slot" data-slot="${index}"></div>`,
          text: `<div class="lucivo-slot" data-slot="${index}"></div>`
        });
      } else {
        tokensToKeep.push(treeTokenFor(token) || token);
      }
    });
    const frontMatterHtml = yaml !== null && state.showFrontMatter ? buildFrontMatterHtml(yaml) : "";
    const rawHtml = frontMatterHtml + marked.parser(tokensToKeep);
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["div", "span", "strong", "small"],
      ADD_ATTR: ["class", "data-slot", "style"]
    });
    const stdContainer = document.getElementById("standard-doc-container");
    const visContainer = document.getElementById("visual-stage-container");
    const stdWrapper = document.getElementById("standard-doc-wrapper");
    const isVisual = state.isVisualMode;
    const generation = ++renderGeneration;
    const isEmpty = rawMarkdown.trim() === "";
    if (window.LucivoStage) LucivoStage.resetLights();
    if (isVisual) {
      stdWrapper.classList.add("hidden");
      stdContainer.innerHTML = "";
      visContainer.classList.remove("hidden");
      visContainer.innerHTML = isEmpty ? `<div class="exhibition-wrap"><section class="exhibition-slab">${EMPTY_GUIDE_HTML}</section></div>` : buildVisualStageHtml(cleanHtml, yaml);
    } else {
      visContainer.classList.add("hidden");
      visContainer.innerHTML = "";
      stdWrapper.classList.remove("hidden");
      stdContainer.innerHTML = isEmpty ? EMPTY_GUIDE_HTML : cleanHtml;
      decorateAlerts(stdContainer);
    }
    const activeContainer = isVisual ? visContainer : stdContainer;
    wrapTables(activeContainer);
    resolveFolderImages(activeContainer);
    renderMath(activeContainer);
    const slots = activeContainer.querySelectorAll(".lucivo-slot");
    const modeTag = isVisual ? `vis-${state.infographicStyle}` : "std";
    const dirtyBlocks = [];
    const cachedKeys = /* @__PURE__ */ new Map();
    slots.forEach((slot) => {
      const idx = parseInt(slot.getAttribute("data-slot"), 10);
      const block = mermaidBlocks[idx];
      if (!block) return;
      const cacheKey = `${block.hash}-${modeTag}`;
      if (svgCache.has(cacheKey)) {
        slot.outerHTML = createDiagramCard(idx, svgCache.get(cacheKey), false, isVisual, block.curve);
        cachedKeys.set(idx, cacheKey);
      } else {
        slot.outerHTML = createDiagramCard(idx, "", true, isVisual, block.curve);
        dirtyBlocks.push({ ...block, modeTag, cacheKey });
      }
    });
    cachedKeys.forEach((cacheKey, idx) => {
      applyReadableFit(activeContainer.querySelector(`[data-stage-index="${idx}"] > svg`), cacheKey);
    });
    bindViewportInteractions(activeContainer);
    mountStage(activeContainer);
    if (document.activeElement && document.activeElement.id === "markdown-editor") scheduleFollow();
    if (dirtyBlocks.length > 0) {
      processDirtyBlocks(dirtyBlocks, { container: activeContainer, generation, isVisual });
    } else {
      updateStatus(`• ${mermaidBlocks.length}/${mermaidBlocks.length} Diagrams Ready`, "success");
    }
  }
  function mountStage(container) {
    if (!state.isVisualMode) return;
    loadLibrary("stage").then((ok) => {
      if (ok && state.isVisualMode && container.isConnected) LucivoStage.mount(container);
    });
  }
  async function processDirtyBlocks(dirtyBlocks, target) {
    updateStatus(`Rendering ${dirtyBlocks.length} diagrams...`, "warning");
    const isStale = () => target.generation !== renderGeneration;
    const mermaidReady = await loadLibrary("mermaid");
    if (isStale()) return;
    if (!mermaidReady) {
      dirtyBlocks.forEach((block) => {
        const vp = target.container.querySelector(`[data-stage-index="${block.index}"]`);
        if (vp) vp.innerHTML = '<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">Mermaid を読み込めませんでした（ネットワークの接続を確認してください）</div>';
      });
      updateStatus("• Mermaid Unavailable", "warning");
      return;
    }
    for (const block of dirtyBlocks) {
      if (isStale()) return;
      const renderId = `mermaid-render-${block.index}-${Date.now()}`;
      const lkgKey = `${block.index}-${block.modeTag}`;
      const stageViewport = target.container.querySelector(`[data-stage-index="${block.index}"]`);
      try {
        setupMermaid(target.isVisual, block.curve || "smooth", getMermaidLayout(block.code, block.curve));
        const { svg } = await mermaid.render(renderId, block.code);
        if (isStale()) return;
        const finalSvg = postProcessSvg(svg, target.isVisual);
        svgCache.set(block.cacheKey, finalSvg);
        lkgCache.set(lkgKey, finalSvg);
        if (stageViewport) {
          stageViewport.innerHTML = finalSvg;
          applyReadableFit(stageViewport.querySelector(":scope > svg"), block.cacheKey);
          mountStage(stageViewport);
        }
      } catch (err) {
        document.getElementById(`d${renderId}`)?.remove();
        console.error(`Mermaid render failed for block ${block.index}:`, err);
        if (isStale()) return;
        const fallback = lkgCache.get(lkgKey);
        if (stageViewport) {
          if (fallback) {
            stageViewport.innerHTML = fallback;
            applyReadableFit(stageViewport.querySelector(":scope > svg"));
            mountStage(stageViewport);
            showToast("構文エラーのため直前の正常状態を表示");
          } else {
            stageViewport.innerHTML = `<div class="p-4 text-xs font-mono text-red-500 bg-red-500/10 rounded-xl">構文エラー: 正しいMermaid記法を入力してください</div>`;
          }
        }
      }
    }
    updateStatus(`• All Diagrams Verified`, "success");
  }
  function bindViewportInteractions(container) {
    container.querySelectorAll(".edge-curve-btn").forEach((btn) => {
      btn.onclick = () => {
        state.curveByIndex.set(parseInt(btn.getAttribute("data-index"), 10), btn.getAttribute("data-curve"));
        renderApp();
      };
    });
    container.querySelectorAll(".scale-btn").forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        const action = btn.getAttribute("data-action");
        const vp = container.querySelector(`[data-stage-index="${idx}"]`);
        const frame = btn.closest(`#diagram-frame-${idx}`);
        if (!vp || !frame) return;
        frame.querySelectorAll(".scale-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        clearDiagramZoom(vp);
        if (action === "scale-actual") {
          vp.classList.add("is-actual-size");
        } else {
          vp.classList.remove("is-actual-size");
        }
        updateSlabSplit(vp.closest(".exhibition-slab-split"));
        updatePannable(vp);
      };
    });
    container.querySelectorAll('[data-action="svg"]').forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        const vp = container.querySelector(`[data-stage-index="${idx}"]`);
        if (!vp) return;
        const svgEl = vp.querySelector("svg");
        if (!svgEl) return;
        downloadBlob(svgEl.outerHTML, `diagram-0${parseInt(idx, 10) + 1}.svg`, "image/svg+xml");
        showToast(`Diagram 0${parseInt(idx, 10) + 1} SVGをダウンロード`);
      };
    });
    container.querySelectorAll('[data-action="png"]').forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        const vp = container.querySelector(`[data-stage-index="${idx}"]`);
        if (!vp) return;
        const svgEl = vp.querySelector("svg");
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const URLObj = window.URL || window.webkitURL || window;
        const blobURL = URLObj.createObjectURL(svgBlob);
        const image = new Image();
        image.onload = () => {
          const canvas = document.createElement("canvas");
          const scale = 2;
          const bbox = svgEl.getBoundingClientRect();
          canvas.width = (bbox.width || 800) * scale;
          canvas.height = (bbox.height || 600) * scale;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = state.appearance === "dark" ? getDiagramSpec(state.isVisualMode).canvasBg : "#FFFFFF";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            const dlUrl = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = dlUrl;
            a.download = `diagram-0${parseInt(idx, 10) + 1}.png`;
            a.click();
            URL.revokeObjectURL(dlUrl);
            showToast(`Diagram 0${parseInt(idx, 10) + 1} PNG (高解像度) をダウンロード`);
          });
          URLObj.revokeObjectURL(blobURL);
        };
        image.src = blobURL;
      };
    });
    container.querySelectorAll('[data-action="zoom"]').forEach((btn) => {
      btn.onclick = () => {
        const idx = btn.getAttribute("data-index");
        const vp = container.querySelector(`[data-stage-index="${idx}"]`);
        if (!vp) return;
        const svgEl = vp.querySelector("svg");
        if (!svgEl) return;
        const zoomCanvas = document.getElementById("zoom-canvas");
        zoomCanvas.innerHTML = svgEl.outerHTML;
        setModalOpen("zoom-modal", true);
        if (state.isVisualMode && window.LucivoStage) LucivoStage.mountLights(zoomCanvas);
      };
    });
  }
  var DIAGRAM_VIEWPORT_SELECTOR = ".diagram-viewport, .exhibition-viewport";
  var DIAGRAM_ZOOM_MIN = 0.25;
  var DIAGRAM_ZOOM_MAX = 4;
  var DIAGRAM_ZOOM_SENSITIVITY = 15e-4;
  var PAN_CLICK_TOLERANCE_PX = 4;
  function findDiagramViewport(target) {
    if (document.documentElement.classList.contains("is-stage-show")) return null;
    const vp = target instanceof Element ? target.closest(DIAGRAM_VIEWPORT_SELECTOR) : null;
    return vp && vp.querySelector(":scope > svg") ? vp : null;
  }
  function isScrollable(vp) {
    return vp.scrollWidth > vp.clientWidth + 1 || vp.scrollHeight > vp.clientHeight + 1;
  }
  function updatePannable(vp) {
    if (vp) vp.classList.toggle("is-pannable", isScrollable(vp));
  }
  function clearDiagramZoom(vp) {
    if (!vp.classList.contains("is-zoomed")) return;
    vp.classList.remove("is-zoomed");
    delete vp.dataset.zoom;
    const svg = vp.querySelector(":scope > svg");
    if (svg) svg.style.removeProperty("--zoom-width");
  }
  function findScrollParent(el) {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const overflowY = getComputedStyle(node).overflowY;
      if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
    }
    return document.scrollingElement;
  }
  function zoomDiagram(vp, event) {
    const svg = vp.querySelector(":scope > svg");
    const viewBox = svg.viewBox && svg.viewBox.baseVal;
    if (!viewBox || !viewBox.width) return;
    const before = svg.getBoundingClientRect();
    if (!before.width) return;
    const current = vp.classList.contains("is-zoomed") ? parseFloat(vp.dataset.zoom) : before.width / viewBox.width;
    const deltaPx = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaY;
    const next = Math.min(DIAGRAM_ZOOM_MAX, Math.max(DIAGRAM_ZOOM_MIN, current * Math.exp(-deltaPx * DIAGRAM_ZOOM_SENSITIVITY)));
    if (Math.abs(next - current) < 1e-3) return;
    const fx = (event.clientX - before.left) / before.width;
    const fy = (event.clientY - before.top) / before.height;
    vp.classList.remove("is-actual-size");
    vp.classList.add("is-zoomed");
    vp.dataset.zoom = String(next);
    svg.style.setProperty("--zoom-width", `${(viewBox.width * next).toFixed(1)}px`);
    const frame = vp.closest('[id^="diagram-frame-"]');
    if (frame) frame.querySelectorAll(".scale-btn").forEach((b) => b.classList.remove("is-active"));
    updateSlabSplit(vp.closest(".exhibition-slab-split"));
    const after = svg.getBoundingClientRect();
    vp.scrollLeft += after.left + fx * after.width - event.clientX;
    const scroller = findScrollParent(vp);
    if (scroller) scroller.scrollTop += after.top + fy * after.height - event.clientY;
    updatePannable(vp);
  }
  function setupDiagramPanZoom() {
    const pan = { vp: null, pointerId: null, x: 0, y: 0, left: 0, top: 0, moved: false };
    document.addEventListener("mouseover", (event) => updatePannable(findDiagramViewport(event.target)));
    document.addEventListener("wheel", (event) => {
      if (!event.ctrlKey || !event.deltaY) return;
      const vp = findDiagramViewport(event.target);
      if (!vp) return;
      event.preventDefault();
      zoomDiagram(vp, event);
    }, { passive: false });
    document.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      const vp = findDiagramViewport(event.target);
      if (!vp || event.target.closest("a, button") || !isScrollable(vp)) return;
      event.preventDefault();
      Object.assign(pan, { vp, pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: vp.scrollLeft, top: vp.scrollTop, moved: false });
      vp.setPointerCapture(event.pointerId);
      vp.classList.add("is-panning");
    });
    document.addEventListener("pointermove", (event) => {
      if (!pan.vp || event.pointerId !== pan.pointerId) return;
      const dx = event.clientX - pan.x;
      const dy = event.clientY - pan.y;
      if (Math.hypot(dx, dy) > PAN_CLICK_TOLERANCE_PX) pan.moved = true;
      pan.vp.scrollLeft = pan.left - dx;
      pan.vp.scrollTop = pan.top - dy;
    });
    const endPan = (event) => {
      if (!pan.vp || event.pointerId !== pan.pointerId) return;
      pan.vp.classList.remove("is-panning");
      if (pan.vp.hasPointerCapture(event.pointerId)) pan.vp.releasePointerCapture(event.pointerId);
      if (pan.moved) {
        const swallow = (e) => {
          e.stopPropagation();
          e.preventDefault();
        };
        window.addEventListener("click", swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0);
      }
      pan.vp = null;
      pan.pointerId = null;
    };
    document.addEventListener("pointerup", endPan);
    document.addEventListener("pointercancel", endPan);
  }
  function syncStageModeUi(isVisual) {
    document.getElementById("btn-mode-fast")?.classList.toggle("is-active", !isVisual);
    document.getElementById("btn-visual-mode")?.classList.toggle("is-active", isVisual);
    document.getElementById("style-bar")?.classList.toggle("is-hidden", !isVisual);
  }
  function setStageMode(isVisual) {
    if (state.isVisualMode === isVisual) return;
    state.isVisualMode = isVisual;
    syncStageModeUi(isVisual);
    if (isVisual) {
      showToast("🎨 Visualモードを起動");
    } else {
      showToast("高速モードに戻りました");
    }
    renderApp();
  }
  function selectInfographicStyle(style) {
    state.infographicStyle = style;
    document.querySelectorAll(".info-style-btn").forEach((b) => {
      b.classList.toggle("is-active", b.getAttribute("data-info-style") === style);
    });
    if (!state.isVisualMode) {
      state.isVisualMode = true;
      syncStageModeUi(true);
    }
    renderApp();
    const activeBtn = document.querySelector(`.info-style-btn[data-info-style="${style}"]`);
    showToast(`スタイル適用: ${activeBtn ? activeBtn.textContent.trim() : style}`);
  }
  function isEditableElement(el) {
    if (!el) return false;
    const tag = el.tagName;
    return tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT" || el.isContentEditable;
  }
  function closeShortcutModal() {
    setModalOpen("shortcut-modal", false);
  }
  function toggleShortcutModal() {
    setModalOpen("shortcut-modal", !isModalOpen("shortcut-modal"));
  }
  var PREVIEW_SCROLL_MARGIN = 16;
  function scrollBehavior() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  }
  function previewScrollTopOf(el, scroller, scrollerRect = scroller.getBoundingClientRect()) {
    return Math.max(0, Math.round(el.getBoundingClientRect().top - scrollerRect.top + scroller.scrollTop - PREVIEW_SCROLL_MARGIN));
  }
  var followedKey = null;
  var followFrame = 0;
  function countLinesBefore(text, end) {
    let count = 0;
    for (let i = text.indexOf("\n"); i !== -1 && i < end; i = text.indexOf("\n", i + 1)) count++;
    return count;
  }
  function findFollowTarget(container, caretLine) {
    let target = null;
    for (const el of container.querySelectorAll("[data-src-line]")) {
      if (Number(el.dataset.srcLine) > caretLine) break;
      target = el;
    }
    return target;
  }
  function followEditorCaret() {
    followFrame = 0;
    if (state.viewMode !== "split" || document.documentElement.classList.contains("is-stage-show")) return;
    const editor = document.getElementById("markdown-editor");
    const scroller = document.getElementById("preview-scroll");
    const container = document.getElementById(state.isVisualMode ? "visual-stage-container" : "standard-doc-container");
    const target = findFollowTarget(container, countLinesBefore(editor.value, editor.selectionStart));
    const anchor = target && state.isVisualMode ? target.closest(".exhibition-slab") || target : target;
    const keyEl = anchor && anchor !== target ? anchor.querySelector("[data-src-line]") || target : target;
    const key = keyEl ? keyEl.dataset.srcLine : "top";
    if (key === followedKey) return;
    followedKey = key;
    scroller.scrollTo({ top: anchor ? previewScrollTopOf(anchor, scroller) : 0, behavior: scrollBehavior() });
  }
  function scheduleFollow() {
    if (!followFrame) followFrame = requestAnimationFrame(followEditorCaret);
  }
  var lastNavTargetTop = null;
  var lastNavTime = 0;
  function scrollSection(direction) {
    const scroller = document.getElementById("preview-scroll");
    if (!scroller) return;
    const selector = state.isVisualMode ? "#visual-stage-container .exhibition-slab" : "#standard-doc-container h2";
    const elements = Array.from(document.querySelectorAll(selector));
    if (elements.length === 0) return;
    const now = performance.now();
    const scrollerRect = scroller.getBoundingClientRect();
    const maxScroll = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const currentTop = lastNavTargetTop !== null && now - lastNavTime < 500 ? lastNavTargetTop : scroller.scrollTop;
    const positions = elements.map((el) => previewScrollTopOf(el, scroller, scrollerRect));
    let nextTop = null;
    if (direction > 0) {
      if (currentTop >= maxScroll - 2) return;
      nextTop = positions.find(
        (pos, idx) => pos > currentTop + 8 && !(idx === 0 && currentTop <= 16 && pos <= 64 && positions.length > 1)
      );
      if (nextTop !== void 0 && nextTop !== null) {
        nextTop = Math.min(maxScroll, nextTop);
      }
    } else {
      for (let i = positions.length - 1; i >= 0; i--) {
        if (positions[i] < currentTop - 8) {
          nextTop = positions[i];
          break;
        }
      }
      if (nextTop === null && currentTop > 0) {
        nextTop = 0;
      }
    }
    if (nextTop !== null && nextTop !== void 0) {
      lastNavTargetTop = nextTop;
      lastNavTime = now;
      scroller.scrollTo({ top: nextTop, behavior: scrollBehavior() });
    }
  }
  function setupKeyboardShortcuts() {
    document.getElementById("shortcut-close-btn")?.addEventListener("click", closeShortcutModal);
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
      if (document.documentElement.classList.contains("is-stage-show")) return;
      if (event.key === "Escape") {
        if (isModalOpen("shortcut-modal")) {
          closeShortcutModal();
          return;
        }
        if (isModalOpen("zoom-modal")) {
          document.getElementById("zoom-close-btn")?.click();
          return;
        }
      }
      if (isEditableElement(document.activeElement)) return;
      if (event.key === "j" || event.key === "J" || event.key === "]") {
        event.preventDefault();
        scrollSection(1);
      } else if (event.key === "k" || event.key === "K" || event.key === "[") {
        event.preventDefault();
        scrollSection(-1);
      } else if (event.key === "m" || event.key === "M") {
        event.preventDefault();
        setStageMode(!state.isVisualMode);
      } else if (event.key >= "1" && event.key <= "4") {
        const targetStyle = VISUAL_STYLE_KEYS[parseInt(event.key, 10) - 1];
        if (targetStyle) {
          event.preventDefault();
          selectInfographicStyle(targetStyle);
        }
      } else if (event.key === "p" || event.key === "P") {
        event.preventDefault();
        document.getElementById("btn-stage-show")?.click();
      } else if (event.key === "?") {
        event.preventDefault();
        toggleShortcutModal();
      }
    });
  }
  function setupEventListeners() {
    const editor = document.getElementById("markdown-editor");
    editor.addEventListener("input", () => {
      clearTimeout(renderDebounceTimer);
      renderDebounceTimer = setTimeout(renderApp, 250);
      scheduleFollow();
    });
    editor.addEventListener("click", scheduleFollow);
    editor.addEventListener("keyup", scheduleFollow);
    document.querySelectorAll(".view-mode-btn").forEach((btn) => {
      btn.onclick = () => {
        const mode = btn.getAttribute("data-view-mode");
        state.viewMode = mode;
        document.querySelectorAll(".view-mode-btn").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
        const paneEditor = document.getElementById("pane-editor");
        const panePreview = document.getElementById("pane-preview");
        if (mode === "split") {
          paneEditor.classList.remove("hidden");
          panePreview.classList.remove("hidden");
          paneEditor.className = "w-full lg:w-[40%] h-[42%] lg:h-full flex flex-col border-b lg:border-b-0 lg:border-r shrink-0 z-10";
        } else if (mode === "canvas") {
          paneEditor.classList.add("hidden");
          panePreview.classList.remove("hidden");
        } else if (mode === "editor") {
          paneEditor.classList.remove("hidden");
          panePreview.classList.add("hidden");
          paneEditor.className = "w-full h-full flex flex-col shrink-0 z-10";
        }
        if (state.isVisualMode && mode !== "editor") {
          updateAllSlabSplits(document.getElementById("visual-stage-container"));
        }
      };
    });
    window.addEventListener("resize", () => {
      if (state.isVisualMode) {
        updateAllSlabSplits(document.getElementById("visual-stage-container"));
      }
    });
    const btnFast = document.getElementById("btn-mode-fast");
    const btnVisual = document.getElementById("btn-visual-mode");
    if (btnFast) {
      btnFast.onclick = () => setStageMode(false);
    }
    if (btnVisual) {
      btnVisual.onclick = () => {
        setStageMode(!state.isVisualMode);
      };
    }
    document.getElementById("btn-stage-show").onclick = async () => {
      if (await loadLibrary("stage")) LucivoStage.enterShow();
    };
    document.querySelectorAll(".info-style-btn").forEach((btn) => {
      btn.onclick = () => {
        const style = btn.getAttribute("data-info-style");
        selectInfographicStyle(style);
      };
    });
    document.querySelectorAll(".palette-option-btn").forEach((btn) => {
      btn.onclick = () => {
        const pal = btn.getAttribute("data-palette-set");
        state.palette = pal;
        document.querySelectorAll(".palette-option-btn").forEach((b) => {
          b.classList.toggle("is-active", b.getAttribute("data-palette-set") === pal);
        });
        const activeLabel = document.getElementById("active-palette-name");
        if (activeLabel) activeLabel.textContent = pal.charAt(0).toUpperCase() + pal.slice(1);
        setupMermaid();
        renderApp();
        showToast(`テーマ色: ${pal.toUpperCase()}`);
      };
    });
    const btnTheme = document.getElementById("btn-theme-toggle");
    const iconSun = document.getElementById("icon-sun");
    const iconMoon = document.getElementById("icon-moon");
    const appFavicon = document.getElementById("app-favicon");
    btnTheme.onclick = () => {
      state.appearance = state.appearance === "light" ? "dark" : "light";
      document.body.setAttribute("data-appearance", state.appearance);
      if (appFavicon) {
        appFavicon.setAttribute("href", `./assets/logos/${state.appearance}/favicon.svg`);
      }
      if (state.appearance === "dark") {
        iconSun.classList.add("hidden");
        iconMoon.classList.remove("hidden");
      } else {
        iconSun.classList.remove("hidden");
        iconMoon.classList.add("hidden");
      }
      setupMermaid();
      renderApp();
    };
    document.getElementById("btn-open-settings").onclick = () => setModalOpen("settings-modal", true);
    document.getElementById("btn-close-settings").onclick = () => setModalOpen("settings-modal", false);
    document.getElementById("zoom-close-btn").onclick = () => {
      setModalOpen("zoom-modal", false);
      document.getElementById("zoom-canvas").innerHTML = "";
    };
    const exportHtmlBtn = document.getElementById("btn-export-html");
    if (exportHtmlBtn) exportHtmlBtn.onclick = () => {
      const fullHtml = Object.entries(EXPORT_URLS).reduce(
        (html, [local, url]) => html.split(local).join(url),
        document.documentElement.outerHTML
      );
      downloadBlob(fullHtml, "lucivo-architecture-export.html", "text/html");
      showToast("単一HTMLファイルをエクスポートしました");
    };
    document.getElementById("btn-test-cache").onclick = () => {
      const t0 = performance.now();
      renderApp();
      const duration = (performance.now() - t0).toFixed(1);
      showToast(`キャッシュ再描画: ${duration}ms (0ms相当)`);
    };
    document.getElementById("btn-test-err").onclick = () => {
      editor.value += "\n\n```mermaid\nflowchart TD\nBROKEN_NODE -->\n```\n";
      renderApp();
    };
  }
  var HEADER_MENUS = [["btn-file-menu", "file-menu"], ["btn-save-menu", "save-menu"]];
  function closeHeaderMenus() {
    HEADER_MENUS.forEach(([btnId, menuId]) => {
      document.getElementById(menuId).classList.add("hidden");
      document.getElementById(btnId).setAttribute("aria-expanded", "false");
    });
  }
  var closeFileMenu = closeHeaderMenus;
  function confirmDiscardEdits(fileName) {
    const editor = document.getElementById("markdown-editor");
    if (editor.value === lastLoadedMarkdown) return true;
    return window.confirm(`編集中の内容は失われます。「${fileName}」を読み込みますか？`);
  }
  function applyLoadedMarkdown(rawText, fileName, folderPath = null, isSample = false) {
    const text = String(rawText).replace(/^\uFEFF/, "");
    document.getElementById("markdown-editor").value = text;
    lastLoadedMarkdown = text;
    currentFileName = fileName;
    currentFolderPath = folderPath;
    currentSampleFile = isSample ? fileName : null;
    document.getElementById("save-file-name").textContent = fileName;
    renderFolderList();
    document.title = `${fileName}${APP_TITLE_SUFFIX}`;
    state.curveByIndex.clear();
    setEditorReadOnly(true);
    clearTimeout(renderDebounceTimer);
    renderApp();
    document.getElementById("preview-scroll").scrollTop = 0;
    followedKey = null;
    showToast(`「${fileName}」を読み込みました`);
  }
  function loadMarkdownFile(file) {
    if (!confirmDiscardEdits(file.name)) return;
    const reader = new FileReader();
    reader.onload = () => {
      applyLoadedMarkdown(reader.result, file.name);
    };
    reader.onerror = () => {
      console.error("Failed to read file:", reader.error);
      showToast(`「${file.name}」を読み込めませんでした`);
    };
    reader.readAsText(file, "UTF-8");
  }
  async function loadBundledSample(fileName) {
    if (!confirmDiscardEdits(fileName)) return false;
    let text = null;
    if (window.location.protocol !== "file:") {
      try {
        const res = await fetch(`./samples/${encodeURIComponent(fileName)}`);
        if (res.ok) text = await res.text();
      } catch (_) {
      }
    }
    if (text === null) {
      if (await loadLibrary("samples") && window.LUCIVO_SAMPLES && typeof window.LUCIVO_SAMPLES[fileName] === "string") {
        text = window.LUCIVO_SAMPLES[fileName];
      }
    }
    if (text === null) {
      showToast(`「${fileName}」を読み込めませんでした`);
      return false;
    }
    applyLoadedMarkdown(text, fileName, null, true);
    return true;
  }
  function setEditorReadOnly(isReadOnly) {
    document.getElementById("markdown-editor").readOnly = isReadOnly;
    document.getElementById("editor-lock").classList.remove("hidden");
    for (const [id, active] of [["btn-edit-lock", isReadOnly], ["btn-edit-unlock", !isReadOnly]]) {
      const btn = document.getElementById(id);
      btn.classList.toggle("is-active", active);
      btn.setAttribute("aria-pressed", String(active));
    }
    document.getElementById("btn-test-err").disabled = isReadOnly;
  }
  function saveMarkdownFile() {
    const text = document.getElementById("markdown-editor").value;
    downloadBlob(text, currentFileName, "text/markdown;charset=utf-8");
    lastLoadedMarkdown = text;
    showToast(`「${currentFileName}」を保存しました`);
  }
  function setupFileMenu() {
    const input = document.getElementById("file-input");
    HEADER_MENUS.forEach(([btnId, menuId]) => {
      const btn = document.getElementById(btnId);
      const menu = document.getElementById(menuId);
      btn.onclick = (event) => {
        event.stopPropagation();
        const willOpen = menu.classList.contains("hidden");
        closeHeaderMenus();
        menu.classList.toggle("hidden", !willOpen);
        btn.setAttribute("aria-expanded", String(willOpen));
      };
    });
    const fileMenu = document.getElementById("file-menu");
    document.getElementById("menu-open-markdown").onclick = () => {
      closeHeaderMenus();
      input.click();
    };
    document.getElementById("menu-open-folder").onclick = () => {
      closeHeaderMenus();
      openFolder();
    };
    document.getElementById("menu-open-recent-folder").onclick = () => {
      closeHeaderMenus();
      reopenRecentFolder();
    };
    fileMenu.querySelectorAll("[data-sample-file]").forEach((btn) => {
      btn.onclick = () => {
        const fileName = btn.getAttribute("data-sample-file");
        closeHeaderMenus();
        if (fileName) loadBundledSample(fileName);
      };
    });
    document.getElementById("menu-print").onclick = () => {
      closeHeaderMenus();
      window.print();
    };
    document.getElementById("btn-save-markdown").onclick = () => {
      closeHeaderMenus();
      saveMarkdownFile();
    };
    document.getElementById("btn-edit-unlock").onclick = () => {
      setEditorReadOnly(false);
      document.getElementById("markdown-editor").focus();
    };
    document.getElementById("btn-edit-lock").onclick = () => setEditorReadOnly(true);
    input.onchange = () => {
      const file = input.files && input.files[0];
      input.value = "";
      if (file) loadMarkdownFile(file);
    };
    document.addEventListener("click", (event) => {
      if (!HEADER_MENUS.some(([, menuId]) => document.getElementById(menuId).contains(event.target))) closeHeaderMenus();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeHeaderMenus();
    });
  }
  function setupFileDrop() {
    const overlay = document.getElementById("drop-overlay");
    let depth = 0;
    const hasFiles = (event) => Array.from(event.dataTransfer && event.dataTransfer.types || []).includes("Files");
    const setShown = (shown) => {
      overlay.classList.toggle("is-shown", shown);
      overlay.setAttribute("aria-hidden", String(!shown));
    };
    window.addEventListener("dragenter", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth += 1;
      setShown(true);
    });
    window.addEventListener("dragover", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });
    window.addEventListener("dragleave", (event) => {
      if (!hasFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setShown(false);
    });
    window.addEventListener("drop", (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setShown(false);
      const files = Array.from(event.dataTransfer.files || []);
      const file = files.find((f) => DROPPABLE_FILE_PATTERN.test(f.name));
      if (!file) {
        showToast("開けるのは .md / .markdown / .txt のファイルです");
        return;
      }
      loadMarkdownFile(file);
    });
  }
  var FOLDER_FILE_LIMIT = 2e3;
  var FOLDER_DEPTH_LIMIT = 12;
  var FOLDER_COLLAPSED_KEY = "lucivo.folderPaneCollapsed";
  var RECENT_FOLDER_DB = "lucivo";
  var RECENT_FOLDER_STORE = "handles";
  var RECENT_FOLDER_KEY = "recentFolder";
  var openedFolder = null;
  var currentFolderPath = null;
  var currentSampleFile = null;
  var SAMPLES_DIR = "samples";
  var BUNDLED_SAMPLES = ["visual-sample.md", "notation_sample.md", "notation_sample_extra1.md"];
  var folderImageUrls = /* @__PURE__ */ new Map();
  var preferFolderInput = false;
  var recentFolderHandle = null;
  function isSkippedFolderName(name) {
    return name.startsWith(".") || name === "node_modules";
  }
  function folderDirOf(path) {
    const i = path.lastIndexOf("/");
    return i < 0 ? "" : path.slice(0, i);
  }
  function resolveFolderPath(base, src) {
    let rel = String(src).split(/[?#]/)[0].replace(/\\/g, "/");
    try {
      rel = decodeURIComponent(rel);
    } catch (_) {
    }
    const parts = base ? base.split("/") : [];
    for (const seg of rel.split("/")) {
      if (seg === "" || seg === ".") continue;
      if (seg === "..") {
        if (!parts.length) return null;
        parts.pop();
      } else {
        parts.push(seg);
      }
    }
    return parts.length ? parts.join("/") : null;
  }
  function sortFolderFiles(files) {
    const collator = new Intl.Collator("ja", { numeric: true, sensitivity: "base" });
    return files.sort((a, b) => (a.dir === "" ? 0 : 1) - (b.dir === "" ? 0 : 1) || collator.compare(a.dir, b.dir) || collator.compare(a.name, b.name));
  }
  async function scanDirectoryHandle(root) {
    const files = [];
    let truncated = false;
    const walk = async (dir, prefix, depth) => {
      for await (const [name, handle] of dir.entries()) {
        if (files.length >= FOLDER_FILE_LIMIT) {
          truncated = true;
          return;
        }
        const path = prefix ? `${prefix}/${name}` : name;
        if (handle.kind === "directory") {
          if (!isSkippedFolderName(name) && depth < FOLDER_DEPTH_LIMIT) await walk(handle, path, depth + 1);
        } else if (DROPPABLE_FILE_PATTERN.test(name)) {
          files.push({ path, name, dir: prefix });
        }
      }
    };
    await walk(root, "", 0);
    return { files: sortFolderFiles(files), truncated };
  }
  function makeHandleFolder(root, scan) {
    return {
      name: root.name,
      files: scan.files,
      truncated: scan.truncated,
      async getFile(path) {
        try {
          const segs = path.split("/");
          let dir = root;
          for (const seg of segs.slice(0, -1)) dir = await dir.getDirectoryHandle(seg);
          return await (await dir.getFileHandle(segs[segs.length - 1])).getFile();
        } catch (_) {
          return null;
        }
      }
    };
  }
  function makeInputFolder(fileList) {
    const all = /* @__PURE__ */ new Map();
    let name = "";
    for (const file of fileList) {
      const segs = (file.webkitRelativePath || file.name).split("/");
      if (!name) name = segs.length > 1 ? segs[0] : "";
      const inner = segs.length > 1 ? segs.slice(1) : segs;
      if (inner.slice(0, -1).some(isSkippedFolderName)) continue;
      all.set(inner.join("/"), file);
    }
    const files = [];
    for (const [path, file] of all) {
      if (DROPPABLE_FILE_PATTERN.test(file.name)) files.push({ path, name: file.name, dir: folderDirOf(path) });
    }
    const truncated = files.length > FOLDER_FILE_LIMIT;
    return {
      name: name || "フォルダ",
      files: sortFolderFiles(files).slice(0, FOLDER_FILE_LIMIT),
      truncated,
      async getFile(path) {
        return all.get(path) || null;
      }
    };
  }
  function getFolderImageUrl(folder, path) {
    if (!folderImageUrls.has(path)) {
      folderImageUrls.set(path, folder.getFile(path).then((file) => {
        const url = file ? URL.createObjectURL(file) : null;
        if (folder !== openedFolder) {
          if (url) URL.revokeObjectURL(url);
          return null;
        }
        folderImageUrls.set(path, url);
        return url;
      }));
    }
    return Promise.resolve(folderImageUrls.get(path));
  }
  function clearFolderImageUrls() {
    folderImageUrls.forEach((url) => {
      if (typeof url === "string") URL.revokeObjectURL(url);
    });
    folderImageUrls.clear();
  }
  function setOpenedFolder(folder) {
    clearFolderImageUrls();
    openedFolder = folder;
    currentFolderPath = null;
    setFolderPaneCollapsed(false);
    renderFolderList();
    renderApp();
    const note = folder.truncated ? `（先頭の ${FOLDER_FILE_LIMIT} 件）` : "";
    showToast(`「${folder.name}」を開きました。Markdown ${folder.files.length} 件${note}`);
  }
  function closeFolder() {
    clearFolderImageUrls();
    openedFolder = null;
    currentFolderPath = null;
    renderFolderList();
    renderApp();
  }
  async function openFolder() {
    if (!window.showDirectoryPicker || preferFolderInput) {
      document.getElementById("folder-input").click();
      return;
    }
    let handle;
    try {
      handle = await window.showDirectoryPicker({ id: "lucivo-folder", mode: "read" });
    } catch (err) {
      if (err && err.name === "AbortError") return;
      console.warn("showDirectoryPicker failed:", err);
      preferFolderInput = true;
      document.getElementById("folder-input").click();
      return;
    }
    await openFolderFromHandle(handle);
    saveRecentFolderHandle(handle);
  }
  async function openFolderFromHandle(handle) {
    try {
      setOpenedFolder(makeHandleFolder(handle, await scanDirectoryHandle(handle)));
    } catch (err) {
      console.error("Failed to read folder:", err);
      showToast(`「${handle.name}」を読み込めませんでした`);
    }
  }
  async function openFolderFile(path) {
    const folder = openedFolder;
    if (!folder) return false;
    const name = path.slice(path.lastIndexOf("/") + 1);
    const file = await folder.getFile(path);
    if (folder !== openedFolder) return false;
    if (!file) {
      showToast(`「${path}」はフォルダの中に見つかりません`);
      return false;
    }
    if (!confirmDiscardEdits(name)) return false;
    try {
      applyLoadedMarkdown(await file.text(), name, path);
    } catch (err) {
      console.error("Failed to read file:", err);
      showToast(`「${name}」を読み込めませんでした`);
      return false;
    }
    if (window.matchMedia("(max-width: 1023.98px)").matches) setFolderPaneCollapsed(true);
    return true;
  }
  function headingSlug(text) {
    return String(text).trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
  }
  function scrollToHeadingAnchor(anchor) {
    let target = anchor;
    try {
      target = decodeURIComponent(anchor);
    } catch (_) {
    }
    const slug = headingSlug(target);
    const scroller = document.getElementById("preview-scroll");
    const heading = Array.from(scroller.querySelectorAll("h1, h2, h3, h4, h5, h6")).find((h) => headingSlug(h.textContent) === slug);
    if (!heading) return false;
    const el = heading.closest(".exhibition-slab") || heading;
    scroller.scrollTo({ top: previewScrollTopOf(el, scroller), behavior: scrollBehavior() });
    return true;
  }
  function setupDocumentLinks() {
    document.getElementById("preview-scroll").addEventListener("click", (event) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!link || event.defaultPrevented || event.button !== 0) return;
      const href = link.getAttribute("href");
      if (href.startsWith("#")) {
        event.preventDefault();
        if (!scrollToHeadingAnchor(href.slice(1))) showToast("リンク先の見出しが見つかりません");
        return;
      }
      if (!isRelativeSrc(href)) return;
      const [pathPart, ...rest] = href.split("#");
      const anchor = rest.join("#");
      if (!DROPPABLE_FILE_PATTERN.test(pathPart.split("?")[0])) return;
      event.preventDefault();
      if (currentSampleFile && !(openedFolder && currentFolderPath !== null)) {
        const samplePath = resolveFolderPath("", pathPart);
        if (!BUNDLED_SAMPLES.includes(samplePath)) {
          showToast(`「${samplePath || pathPart}」は同梱サンプルにありません`);
          return;
        }
        const opened = samplePath === currentSampleFile ? Promise.resolve(true) : loadBundledSample(samplePath);
        opened.then((ok) => {
          if (ok && anchor && !scrollToHeadingAnchor(anchor)) showToast("リンク先の見出しが見つかりません");
        });
        return;
      }
      if (!openedFolder || currentFolderPath === null) {
        showToast("Markdown へのリンクは、「開く」→「フォルダを開く…」で開いた文書で使えます");
        return;
      }
      const path = resolveFolderPath(folderDirOf(currentFolderPath), pathPart);
      if (path === null) {
        showToast("開いたフォルダの外のファイルは開けません");
        return;
      }
      const open = path === currentFolderPath ? Promise.resolve(true) : openFolderFile(path);
      open.then((opened) => {
        if (opened && anchor && !scrollToHeadingAnchor(anchor)) showToast("リンク先の見出しが見つかりません");
      });
    });
  }
  function renderFolderList() {
    const pane = document.getElementById("folder-pane");
    const rail = document.getElementById("btn-folder-show");
    if (!openedFolder) {
      pane.classList.add("hidden");
      rail.classList.add("hidden");
      return;
    }
    const collapsed = isFolderPaneCollapsed();
    pane.classList.toggle("hidden", collapsed);
    rail.classList.toggle("hidden", !collapsed);
    document.getElementById("folder-pane-name").textContent = openedFolder.name;
    document.getElementById("folder-pane-name").title = openedFolder.name;
    const list = document.getElementById("folder-list");
    list.replaceChildren();
    if (!openedFolder.files.length) {
      const empty = document.createElement("p");
      empty.className = "folder-list-empty";
      empty.textContent = "Markdown ファイル（.md / .markdown / .txt）がありません";
      list.append(empty);
      return;
    }
    let lastDir = null;
    for (const file of openedFolder.files) {
      if (file.dir !== lastDir && file.dir !== "") {
        const dir = document.createElement("div");
        dir.className = "folder-list-dir";
        dir.textContent = `${file.dir}/`;
        dir.title = file.dir;
        list.append(dir);
      }
      lastDir = file.dir;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "folder-list-item";
      btn.dataset.path = file.path;
      btn.title = file.path;
      btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z M14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
      const label = document.createElement("span");
      label.textContent = file.name;
      btn.append(label);
      if (file.path === currentFolderPath) {
        btn.classList.add("is-current");
        btn.setAttribute("aria-current", "page");
      }
      btn.onclick = () => openFolderFile(file.path);
      list.append(btn);
    }
  }
  function isFolderPaneCollapsed() {
    try {
      return localStorage.getItem(FOLDER_COLLAPSED_KEY) === "1";
    } catch (_) {
      return document.getElementById("folder-pane").dataset.collapsed === "1";
    }
  }
  function setFolderPaneCollapsed(collapsed) {
    try {
      localStorage.setItem(FOLDER_COLLAPSED_KEY, collapsed ? "1" : "0");
    } catch (_) {
      document.getElementById("folder-pane").dataset.collapsed = collapsed ? "1" : "0";
    }
    renderFolderList();
  }
  function openRecentFolderDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(RECENT_FOLDER_DB, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(RECENT_FOLDER_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveRecentFolderHandle(handle) {
    recentFolderHandle = handle;
    updateRecentFolderMenu();
    try {
      const db = await openRecentFolderDb();
      db.transaction(RECENT_FOLDER_STORE, "readwrite").objectStore(RECENT_FOLDER_STORE).put(handle, RECENT_FOLDER_KEY);
    } catch (err) {
      console.warn("Failed to remember the folder:", err);
    }
  }
  async function loadRecentFolderHandle() {
    if (!window.showDirectoryPicker || !window.indexedDB) return;
    try {
      const db = await openRecentFolderDb();
      const handle = await new Promise((resolve, reject) => {
        const req = db.transaction(RECENT_FOLDER_STORE, "readonly").objectStore(RECENT_FOLDER_STORE).get(RECENT_FOLDER_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
      if (handle && handle.kind === "directory") {
        recentFolderHandle = handle;
        updateRecentFolderMenu();
      }
    } catch (err) {
      console.warn("Failed to read the remembered folder:", err);
    }
  }
  function updateRecentFolderMenu() {
    const item = document.getElementById("menu-open-recent-folder");
    item.classList.toggle("hidden", !recentFolderHandle);
    if (recentFolderHandle) item.textContent = `前回のフォルダ「${recentFolderHandle.name}」を開く`;
  }
  async function reopenRecentFolder() {
    const handle = recentFolderHandle;
    if (!handle) return;
    try {
      let permission = await handle.queryPermission({ mode: "read" });
      if (permission !== "granted") permission = await handle.requestPermission({ mode: "read" });
      if (permission !== "granted") {
        showToast(`「${handle.name}」を読む許可がありません`);
        return;
      }
    } catch (err) {
      console.warn("Failed to reopen the folder:", err);
      showToast(`「${handle.name}」を開けませんでした。「フォルダを開く…」から選び直してください`);
      return;
    }
    await openFolderFromHandle(handle);
  }
  function setupFolder() {
    const input = document.getElementById("folder-input");
    input.onchange = () => {
      const files = Array.from(input.files || []);
      input.value = "";
      if (files.length) setOpenedFolder(makeInputFolder(files));
    };
    document.getElementById("btn-folder-hide").onclick = () => setFolderPaneCollapsed(true);
    document.getElementById("btn-folder-show").onclick = () => setFolderPaneCollapsed(false);
    document.getElementById("btn-folder-close").onclick = closeFolder;
    setupDocumentLinks();
    loadRecentFolderHandle();
  }
  function setupFrontMatterToggle() {
    const btn = document.getElementById("btn-front-matter");
    btn.addEventListener("click", () => {
      state.showFrontMatter = !state.showFrontMatter;
      btn.setAttribute("aria-pressed", String(state.showFrontMatter));
      btn.classList.toggle("is-active", state.showFrontMatter);
      renderApp();
    });
  }
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelector('[data-view-mode="split"]').classList.add("is-active");
    setupEventListeners();
    setupVisualStageInteractions();
    setupKeyboardShortcuts();
    setupFileMenu();
    setupFileDrop();
    setupFolder();
    setupDiagramPanZoom();
    setupLocalImages();
    setupFrontMatterToggle();
    setupMarkedMath();
    setupMarkedHeadings();
    setupMermaid();
    renderApp();
  });
  window.state = state;
  window.renderApp = renderApp;
  window.closeFileMenu = closeFileMenu;
  Object.defineProperty(window, "openedFolder", {
    get() {
      return openedFolder;
    },
    set(val) {
      openedFolder = val;
    },
    configurable: true
  });
  Object.defineProperty(window, "currentSampleFile", {
    get() {
      return currentSampleFile;
    },
    set(val) {
      currentSampleFile = val;
    },
    configurable: true
  });
  Object.defineProperty(window, "lastLoadedMarkdown", {
    get() {
      return lastLoadedMarkdown;
    },
    set(val) {
      lastLoadedMarkdown = val;
    },
    configurable: true
  });
  Object.defineProperty(window, "preferFolderInput", {
    get() {
      return preferFolderInput;
    },
    set(val) {
      preferFolderInput = val;
    },
    configurable: true
  });
  window.hexToRgba = hexToRgba;
  window.escapeHtml = escapeHtml;
  window.updateSlabSplit = updateSlabSplit;
  window.updateAllSlabSplits = updateAllSlabSplits;
  window.clearVisualStageSpotlight = clearVisualStageSpotlight;
  window.showToast = showToast;
  window.isModalOpen = isModalOpen;
  window.setModalOpen = setModalOpen;
  window.findScrollParent = findScrollParent;
  window.fitCache = fitCache;
  window.mathCache = mathCache;
  window.svgCache = svgCache;
  window.EMPTY_GUIDE_HTML = EMPTY_GUIDE_HTML;
})();
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vLi4vc3JjL3RzL3V0aWxzL2VzY2FwZS50cyIsICIuLi8uLi9zcmMvdHMvdXRpbHMvY29sb3IudHMiLCAiLi4vLi4vc3JjL3RzL21hcmtkb3duL3RyZWUudHMiLCAiLi4vLi4vc3JjL3RzL21hdGgvcGxvdC50cyIsICIuLi8uLi9zcmMvdHMvYXBwLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJleHBvcnQgZnVuY3Rpb24gZXNjYXBlSHRtbChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBTdHJpbmcoc3RyKS5yZXBsYWNlKC9bJjw+XCInXS9nLCBjaCA9PiAoeyAnJic6ICcmYW1wOycsICc8JzogJyZsdDsnLCAnPic6ICcmZ3Q7JywgJ1wiJzogJyZxdW90OycsIFwiJ1wiOiAnJiMzOTsnIH0pW2NoXSB8fCBjaCk7XG59XG4iLCAiZXhwb3J0IGZ1bmN0aW9uIGhleFRvUmdiYShoZXg6IHN0cmluZywgYWxwaGE6IG51bWJlcik6IHN0cmluZyB7XG4gIGNvbnN0IHYgPSBwYXJzZUludChoZXgucmVwbGFjZSgnIycsICcnKSwgMTYpO1xuICByZXR1cm4gYHJnYmEoJHsodiA+PiAxNikgJiAyNTV9LCAkeyh2ID4+IDgpICYgMjU1fSwgJHt2ICYgMjU1fSwgJHthbHBoYX0pYDtcbn1cbiIsICJpbXBvcnQgeyBlc2NhcGVIdG1sIH0gZnJvbSAnLi4vdXRpbHMvZXNjYXBlJztcblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIOODleOCqeODq+ODgOani+aIkOOBruODhOODquODvO+8iEZSLTA0NywgREQtTUQtMDUw44CcMDU077yJOiDnvavnt5rjgafmm7jjgYTjgZ/mp4vmiJDjgpLjgIHnt5rjgpLlvJXjgY3nm7TjgZfjgZ/jg4Tjg6rjg7zjgavjgZnjgotcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5leHBvcnQgY29uc3QgVFJFRV9MQU5HUyA9IFsndHJlZScsICdmaWxldHJlZScsICdkaXJ0cmVlJ107XG5leHBvcnQgY29uc3QgVFJFRV9CUkFOQ0hfQ0hBUlMgPSAn4pSc4pSj4pSU4pSXK2BcXFxcJztcbmV4cG9ydCBjb25zdCBUUkVFX1BJUEVfQ0hBUlMgPSAn4pSC4pSDfCc7XG5leHBvcnQgY29uc3QgVFJFRV9MSU5FX0NIQVJTID0gJ+KUgOKUgS0nO1xuZXhwb3J0IGNvbnN0IFRSRUVfRlVMTFdJRFRIX1NQQUNFID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweDMwMDApO1xuZXhwb3J0IGNvbnN0IFRSRUVfTk9URV9SRSA9IC9cXHMrKD86I3xcXC9cXC984oaQfDwtezEsMn0pXFxzKiguKikkLztcbmV4cG9ydCBjb25zdCBUUkVFX0tJTkRfUkVTOiBbc3RyaW5nLCBSZWdFeHBdW10gPSBbXG4gIFsnZG9jJywgL1xcLig/Om1kfG1hcmtkb3dufG1keHx0eHR8cnN0fGFkb2N8cGRmfGRvY3g/fHhsc3g/fHBwdHg/fGNzdikkL2ldLFxuICBbJ2ltYWdlJywgL1xcLig/OnBuZ3xqcGU/Z3xnaWZ8c3ZnfHdlYnB8YXZpZnxibXB8aWNvfGRyYXdpbykkL2ldLFxuICBbJ2NvZGUnLCAvXFwuKD86W2NtXT9banRdc3g/fGpzb258eWE/bWx8dG9tbHx4bWx8aHRtbD98Y3NzfHNjc3N8cHl8cmJ8Z298cnN8amF2YXxrdHxzd2lmdHxjfGh8Y2N8Y3BwfGhwcHxjc3xwaHB8c2h8YmFzaHxwczF8YmF0fHNxbHx2dWV8c3ZlbHRlfGluaXxlbnZ8bG9jaykkL2ldXG5dO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRyZWVMaW5lRW50cnkge1xuICBicmFuY2hDb2w6IG51bWJlcjtcbiAgaW5kZW50OiBudW1iZXI7XG4gIGhhc1BpcGU6IGJvb2xlYW47XG4gIGFzY2lpOiBib29sZWFuO1xuICB0ZXh0OiBzdHJpbmc7XG4gIGludmFsaWQ/OiBib29sZWFuO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRyZWVOb2RlIHtcbiAgZGVwdGg6IG51bWJlcjtcbiAgbmFtZTogc3RyaW5nO1xuICBub3RlOiBzdHJpbmc7XG4gIGtpbmQ6IHN0cmluZztcbn1cblxuLy8gMSDooYzjgpLjgIHmnp3jga7liJfvvIjmnp3jga7jgarjgYTooYzjga8gLTHvvInjg7vlrZfkuIvjgZLjg7vlkI3liY3jgavliIbjgZHjgovjgILnvavnt5rjgaDjgZHjga7ooYzvvIjilIIg44Gg44GR77yJ44GvIG51bGzvvIhERC1NRC0wNTHvvIlcbmV4cG9ydCBmdW5jdGlvbiBzcGxpdFRyZWVMaW5lKGxpbmU6IHN0cmluZyk6IFRyZWVMaW5lRW50cnkgfCBudWxsIHtcbiAgbGV0IGNvbCA9IDA7XG4gIGxldCBicmFuY2hDb2wgPSAtMTtcbiAgbGV0IGFzY2lpID0gZmFsc2U7XG4gIGxldCBpID0gMDtcbiAgZm9yICg7IGkgPCBsaW5lLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSBsaW5lW2ldO1xuICAgIGNvbnN0IG5leHQgPSBsaW5lW2kgKyAxXSB8fCAnJztcbiAgICBpZiAoY2ggPT09ICcgJykge1xuICAgICAgY29sICs9IDE7XG4gICAgfSBlbHNlIGlmIChjaCA9PT0gVFJFRV9GVUxMV0lEVEhfU1BBQ0UpIHtcbiAgICAgIGNvbCArPSAyO1xuICAgIH0gZWxzZSBpZiAoYnJhbmNoQ29sIDwgMCAmJiBUUkVFX0JSQU5DSF9DSEFSUy5pbmNsdWRlcyhjaCkgJiYgKGNoICE9PSAnXFxcXCcgfHwgVFJFRV9MSU5FX0NIQVJTLmluY2x1ZGVzKG5leHQpKSkge1xuICAgICAgYnJhbmNoQ29sID0gY29sO1xuICAgICAgYXNjaWkgPSBhc2NpaSB8fCAhJ+KUnOKUo+KUlOKUlycuaW5jbHVkZXMoY2gpO1xuICAgICAgY29sICs9IDE7XG4gICAgfSBlbHNlIGlmIChicmFuY2hDb2wgPCAwICYmIGNoID09PSAnfCcgJiYgVFJFRV9MSU5FX0NIQVJTLmluY2x1ZGVzKG5leHQpKSB7XG4gICAgICAvLyB8LS0g44KC5p6d44Go44GX44Gm5omx44GGXG4gICAgICBicmFuY2hDb2wgPSBjb2w7XG4gICAgICBhc2NpaSA9IHRydWU7XG4gICAgICBjb2wgKz0gMTtcbiAgICB9IGVsc2UgaWYgKFRSRUVfUElQRV9DSEFSUy5pbmNsdWRlcyhjaCkgJiYgYnJhbmNoQ29sIDwgMCkge1xuICAgICAgYXNjaWkgPSBhc2NpaSB8fCBjaCA9PT0gJ3wnO1xuICAgICAgY29sICs9IDE7XG4gICAgfSBlbHNlIGlmIChUUkVFX0xJTkVfQ0hBUlMuaW5jbHVkZXMoY2gpICYmIGJyYW5jaENvbCA+PSAwKSB7XG4gICAgICBjb2wgKz0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIGNvbnN0IHJlc3QgPSBsaW5lLnNsaWNlKGkpLnRyaW0oKTtcbiAgaWYgKCFyZXN0KSByZXR1cm4gYnJhbmNoQ29sIDwgMCA/IG51bGwgOiB7IGJyYW5jaENvbDogLTEsIGluZGVudDogMCwgaGFzUGlwZTogZmFsc2UsIGFzY2lpOiBmYWxzZSwgdGV4dDogJycsIGludmFsaWQ6IHRydWUgfTtcbiAgY29uc3QgcHJlZml4ID0gbGluZS5zbGljZSgwLCBpKTtcbiAgcmV0dXJuIHsgYnJhbmNoQ29sLCBpbmRlbnQ6IGNvbCwgaGFzUGlwZTogL1vilILilIN8XS8udGVzdChwcmVmaXgpLCBhc2NpaSwgdGV4dDogcmVzdCB9O1xufVxuXG4vLyDmi6HlvLXlrZDjga7jgarjgYTjg5XjgqHjgqTjg6vjgajjgZfjgabjgojjgY/kvb/jgYblkI3liY1cbmV4cG9ydCBjb25zdCBUUkVFX1BMQUlOX0ZJTEVTID0gL14oPzpyZWFkbWV8bGljZW5zZXxsaWNlbmNlfGNoYW5nZWxvZ3xtYWtlZmlsZXxkb2NrZXJmaWxlfGdlbWZpbGV8cHJvY2ZpbGV8amVua2luc2ZpbGV8dmFncmFudGZpbGV8bm90aWNlfGF1dGhvcnN8Y29weWluZykkL2k7XG5cbi8vIOWQjeWJjeOBi+OCieOCouOCpOOCs+ODs+OBrueorumhnuOCkuaxuuOCgeOCi++8iERELU1ELTA1Mu+8ieOAguacq+WwvuOBriAvIOOBqOWtkOOCkuaMgeOBpOOBk+OBqOOBjOacgOOCgueiuuOBi+OAglxuLy8g5a2Q44Gu44Gq44GE5ZCN5YmN44Gv44CB5ouh5by15a2Q44CB44KI44GP5L2/44GG5ouh5by15a2Q44Gu44Gq44GE44OV44Kh44Kk44Or5ZCN44CB44CM44OV44Kh44Kk44Or44CN44CM44OV44Kp44Or44OA44CN44Gq44Gp44Gu6KiA6JGJ44Gu6aCG44Gr6KaL44Gm44CBXG4vLyDjganjgozjgavjgoLlvZPjgZ/jgonjgarjgYTmi6HlvLXlrZDjga7jgarjgYTlkI3liY3jga/jg5Xjgqnjg6vjg4Djgajjgb/jgarjgZlcbmV4cG9ydCBmdW5jdGlvbiB0cmVlTm9kZUtpbmQobmFtZTogc3RyaW5nLCBpc0ZvbGRlcjogYm9vbGVhbik6IHN0cmluZyB7XG4gIGlmIChpc0ZvbGRlcikgcmV0dXJuICdmb2xkZXInO1xuICBjb25zdCBoaXQgPSBUUkVFX0tJTkRfUkVTLmZpbmQoKFssIHJlXSkgPT4gcmUudGVzdChuYW1lKSk7XG4gIGlmIChoaXQpIHJldHVybiBoaXRbMF07XG4gIGlmICgvXFwuW14uXFxzXSskLy50ZXN0KG5hbWUpIHx8IC9eKD86XFwuezN9fOKApispJC8udGVzdChuYW1lKSkgcmV0dXJuICdmaWxlJztcbiAgaWYgKFRSRUVfUExBSU5fRklMRVMudGVzdChuYW1lKSB8fCAv44OV44Kh44Kk44OrfGZpbGUvaS50ZXN0KG5hbWUpKSByZXR1cm4gJ2ZpbGUnO1xuICByZXR1cm4gJ2ZvbGRlcic7XG59XG5cbi8vIOe9q+e3muOBp+abuOOBhOOBn+ani+aIkOOCkuOAgXsgZGVwdGgsIG5hbWUsIG5vdGUsIGtpbmQgfSDjga7kuKbjgbPjgavjgZnjgovjgILjg4Tjg6rjg7zjgajoqq3jgoHjgarjgZHjgozjgbAgbnVsbO+8iERELU1ELTA1MSwgMDUy77yJ44CCXG4vLyBtb2RlOiAndHJlZSfvvIjoqIDoqp7lkI3jgafmjIflrprjgZXjgozjgZ/jgILlrZfkuIvjgZLjgaDjgZHjga7mm7jjgY3mlrnjgoLoqq3jgoDvvInjgIEnY29kZSfvvIjoqIDoqp7lkI3jga7jgarjgYTjgrPjg7zjg4njg5bjg63jg4Pjgq/vvInjgIEncGFyYWdyYXBoJ++8iOauteiQve+8iVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVHJlZVRleHQodGV4dDogc3RyaW5nLCBtb2RlOiAndHJlZScgfCAnY29kZScgfCAncGFyYWdyYXBoJyk6IFRyZWVOb2RlW10gfCBudWxsIHtcbiAgY29uc3QgbGluZXMgPSBTdHJpbmcodGV4dCkucmVwbGFjZSgvXFx0L2csICcgICAgJykuc3BsaXQoJ1xcbicpLm1hcChsID0+IGwucmVwbGFjZSgvXFxzKyQvLCAnJykpO1xuICBjb25zdCBlbnRyaWVzOiBUcmVlTGluZUVudHJ5W10gPSBbXTtcbiAgZm9yIChjb25zdCBsaW5lIG9mIGxpbmVzKSB7XG4gICAgaWYgKCFsaW5lLnRyaW0oKSkgY29udGludWU7XG4gICAgY29uc3QgZSA9IHNwbGl0VHJlZUxpbmUobGluZSk7XG4gICAgaWYgKGUgPT09IG51bGwpIGNvbnRpbnVlO1xuICAgIGlmIChlLmludmFsaWQpIHJldHVybiBudWxsO1xuICAgIGVudHJpZXMucHVzaChlKTtcbiAgfVxuICBpZiAoIWVudHJpZXMubGVuZ3RoKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgYnJhbmNoZXMgPSBlbnRyaWVzLmZpbHRlcihlID0+IGUuYnJhbmNoQ29sID49IDApO1xuXG4gIGxldCBkZXB0aHM6IG51bWJlcltdO1xuICBpZiAoYnJhbmNoZXMubGVuZ3RoKSB7XG4gICAgLy8g6Ieq5YuV44Gu5Yik5a6a77yIbW9kZSDjgYwgdHJlZSDku6XlpJbvvInjga/jgIHmnp3jgYwgMiDooYzku6XkuIrjgYLjgorjgIHmnp3jga7jgarjgYTooYzjga/lhYjpoK3jgavlrZfkuIvjgZLjgarjgZfjgafmm7jjgYTjgZ/jgoLjga7vvIjmoLnvvInjgaDjgZHjga7jgajjgY1cbiAgICBpZiAobW9kZSAhPT0gJ3RyZWUnKSB7XG4gICAgICBpZiAoYnJhbmNoZXMubGVuZ3RoIDwgMiB8fCBlbnRyaWVzWzBdLmJyYW5jaENvbCA+PSAwKSByZXR1cm4gbnVsbDtcbiAgICAgIGlmIChlbnRyaWVzLnNvbWUoZSA9PiBlLmJyYW5jaENvbCA8IDAgJiYgKGUuaW5kZW50ID4gMCB8fCBlLmhhc1BpcGUpKSkgcmV0dXJuIG51bGw7XG4gICAgICAvLyDmrrXokL3jga7mlofnq6DjgavntJvjgozjgZ/oqJjlj7fjgpLmi77jgo/jgarjgYTjgojjgYbjgIHmrrXokL3jga8g4pScIOKUlCDjga7nvavnt5rjgaDjgZHjgpLoqo3jgoHjgotcbiAgICAgIGlmIChtb2RlID09PSAncGFyYWdyYXBoJyAmJiBicmFuY2hlcy5zb21lKGUgPT4gZS5hc2NpaSkpIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb2xzID0gWy4uLm5ldyBTZXQoYnJhbmNoZXMubWFwKGUgPT4gZS5icmFuY2hDb2wpKV0uc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICAgIGRlcHRocyA9IGVudHJpZXMubWFwKGUgPT4gKGUuYnJhbmNoQ29sIDwgMCA/IDAgOiBjb2xzLmluZGV4T2YoZS5icmFuY2hDb2wpICsgMSkpO1xuICB9IGVsc2Uge1xuICAgIC8vIOe9q+e3muOBruOBquOBhOWtl+S4i+OBkuOBoOOBkeOBruabuOOBjeaWueOBr+OAgeiogOiqnuWQjeOBpyB0cmVlIOOBqOaMh+WumuOBl+OBn+OBqOOBjeOBoOOBkeiqreOCgFxuICAgIGlmIChtb2RlICE9PSAndHJlZScpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGluZGVudHMgPSBbLi4ubmV3IFNldChlbnRyaWVzLm1hcChlID0+IGUuaW5kZW50KSldLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgICBkZXB0aHMgPSBlbnRyaWVzLm1hcChlID0+IGluZGVudHMuaW5kZXhPZihlLmluZGVudCkpO1xuICB9XG4gIC8vIDEg5q6144Ga44Gk44GX44GL5rex44GP44Gq44KJ44Gq44GE44KI44GG44Gr44Gd44KN44GI44KL77yI5pu444GN6ZaT6YGV44GE44GnIDIg5q615Lul5LiK5rex44GP44Gq44Gj44Gf44Go44GN44Gv44CBMSDmrrXmt7HjgYTjgajjgb/jgarjgZnvvIlcbiAgY29uc3QgbWluID0gTWF0aC5taW4oLi4uZGVwdGhzKTtcbiAgbGV0IHByZXYgPSAtMTtcbiAgZGVwdGhzID0gZGVwdGhzLm1hcChkID0+IHtcbiAgICBjb25zdCBmaXhlZCA9IE1hdGgubWluKGQgLSBtaW4sIHByZXYgKyAxKTtcbiAgICBwcmV2ID0gZml4ZWQ7XG4gICAgcmV0dXJuIGZpeGVkO1xuICB9KTtcblxuICByZXR1cm4gZW50cmllcy5tYXAoKGUsIGspID0+IHtcbiAgICBjb25zdCBtID0gVFJFRV9OT1RFX1JFLmV4ZWMoZS50ZXh0KTtcbiAgICBsZXQgbmFtZSA9IChtID8gZS50ZXh0LnNsaWNlKDAsIG0uaW5kZXgpIDogZS50ZXh0KS50cmltKCk7XG4gICAgY29uc3Qgbm90ZSA9IG0gPyBtWzFdLnRyaW0oKSA6ICcnO1xuICAgIGNvbnN0IGhhc0NoaWxkID0gayArIDEgPCBkZXB0aHMubGVuZ3RoICYmIGRlcHRoc1trICsgMV0gPiBkZXB0aHNba107XG4gICAgY29uc3Qgc2xhc2ggPSAvWy9cXFxcXSQvLnRlc3QobmFtZSk7XG4gICAgaWYgKHNsYXNoICYmIG5hbWUubGVuZ3RoID4gMSkgbmFtZSA9IG5hbWUucmVwbGFjZSgvWy9cXFxcXSskLywgJycpO1xuICAgIHJldHVybiB7IGRlcHRoOiBkZXB0aHNba10sIG5hbWUsIG5vdGUsIGtpbmQ6IHRyZWVOb2RlS2luZChuYW1lLCBzbGFzaCB8fCBoYXNDaGlsZCkgfTtcbiAgfSk7XG59XG5cbi8vIOWQhOihjOOBruW3puOBrue9q+e3mu+8iOelluWFiOOBlOOBqOOBq+e4pue3muOCkue2muOBkeOCi+OBi+OAgeiHquWIhuOBruaeneOBjCDilJwg44GLIOKUlCDjgYvvvInjgpLmsbrjgoHjgabjgIFIVE1MIOOBq+OBmeOCi++8iERELU1ELTA1M++8iVxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVHJlZUh0bWwobm9kZXM6IFRyZWVOb2RlW10pOiBzdHJpbmcge1xuICBjb25zdCBoYXNOZXh0U2libGluZyA9IG5vZGVzLm1hcCgobiwgaSkgPT4ge1xuICAgIGZvciAobGV0IGogPSBpICsgMTsgaiA8IG5vZGVzLmxlbmd0aDsgaisrKSB7XG4gICAgICBpZiAobm9kZXNbal0uZGVwdGggPCBuLmRlcHRoKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAobm9kZXNbal0uZGVwdGggPT09IG4uZGVwdGgpIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICBjb25zdCBzdGFjazogbnVtYmVyW10gPSBbXTtcbiAgY29uc3QgaGFzTm90ZXMgPSBub2Rlcy5zb21lKG4gPT4gbi5ub3RlKTtcbiAgY29uc3Qgcm93cyA9IG5vZGVzLm1hcCgobiwgaSkgPT4ge1xuICAgIHN0YWNrLmxlbmd0aCA9IG4uZGVwdGg7XG4gICAgbGV0IGd1aWRlcyA9ICcnO1xuICAgIGZvciAobGV0IGxldmVsID0gMTsgbGV2ZWwgPCBuLmRlcHRoOyBsZXZlbCsrKSB7XG4gICAgICBndWlkZXMgKz0gYDxzcGFuIGNsYXNzPVwibWQtdHJlZS1nICR7aGFzTmV4dFNpYmxpbmdbc3RhY2tbbGV2ZWxdXSA/ICdpcy1waXBlJyA6ICdpcy1ibGFuayd9XCI+PC9zcGFuPmA7XG4gICAgfVxuICAgIGlmIChuLmRlcHRoID4gMCkgZ3VpZGVzICs9IGA8c3BhbiBjbGFzcz1cIm1kLXRyZWUtZyAke2hhc05leHRTaWJsaW5nW2ldID8gJ2lzLXRlZScgOiAnaXMtZW5kJ31cIj48L3NwYW4+YDtcbiAgICBzdGFja1tuLmRlcHRoXSA9IGk7XG4gICAgY29uc3QgbXV0ZWQgPSAvXig/OlxcLnszfXzigKYrKSQvLnRlc3Qobi5uYW1lKSA/ICcgaXMtZWxsaXBzaXMnIDogJyc7XG4gICAgY29uc3QgbmFtZUNlbGwgPSBgPGRpdiBjbGFzcz1cIm1kLXRyZWUtcm93JHtuLmRlcHRoID09PSAwID8gJyBpcy1yb290JyA6ICcnfSR7bXV0ZWR9XCI+JHtndWlkZXN9PHNwYW4gY2xhc3M9XCJtZC10cmVlLWljb24gaXMtJHtuLmtpbmR9XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPjxzcGFuIGNsYXNzPVwibWQtdHJlZS1uYW1lXCI+JHtlc2NhcGVIdG1sKG4ubmFtZSl9PC9zcGFuPjwvZGl2PmA7XG4gICAgcmV0dXJuIGhhc05vdGVzID8gYCR7bmFtZUNlbGx9PGRpdiBjbGFzcz1cIm1kLXRyZWUtbm90ZVwiPiR7ZXNjYXBlSHRtbChuLm5vdGUpfTwvZGl2PmAgOiBuYW1lQ2VsbDtcbiAgfSk7XG4gIHJldHVybiBgPGRpdiBjbGFzcz1cIm1kLXRyZWUke2hhc05vdGVzID8gJyBoYXMtbm90ZXMnIDogJyd9XCIgcm9sZT1cImdyb3VwXCIgYXJpYS1sYWJlbD1cIuODleOCqeODq+ODgOani+aIkFwiPiR7cm93cy5qb2luKCcnKX08L2Rpdj5cXG5gO1xufVxuXG4vLyBNYXJrZWQg44Gu44OI44O844Kv44Oz44GM44OE44Oq44O844Gq44KJ44CB5beu44GX5pu/44GI44KLIEhUTUwg44Gu44OI44O844Kv44Oz44KS6L+U44GZ44CC44OE44Oq44O844Gn44Gq44GR44KM44GwIG51bGzvvIhERC1NRC0wNTDvvIlcbmV4cG9ydCBmdW5jdGlvbiB0cmVlVG9rZW5Gb3IodG9rZW46IGFueSk6IGFueSB8IG51bGwge1xuICBsZXQgbm9kZXM6IFRyZWVOb2RlW10gfCBudWxsID0gbnVsbDtcbiAgaWYgKHRva2VuLnR5cGUgPT09ICdjb2RlJykge1xuICAgIGNvbnN0IGxhbmcgPSAodG9rZW4ubGFuZyB8fCAnJykudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKFRSRUVfTEFOR1MuaW5jbHVkZXMobGFuZykpIG5vZGVzID0gcGFyc2VUcmVlVGV4dCh0b2tlbi50ZXh0LCAndHJlZScpO1xuICAgIGVsc2UgaWYgKCFsYW5nKSBub2RlcyA9IHBhcnNlVHJlZVRleHQodG9rZW4udGV4dCwgJ2NvZGUnKTtcbiAgfSBlbHNlIGlmICh0b2tlbi50eXBlID09PSAncGFyYWdyYXBoJykge1xuICAgIG5vZGVzID0gcGFyc2VUcmVlVGV4dCh0b2tlbi5yYXcsICdwYXJhZ3JhcGgnKTtcbiAgfVxuICBpZiAoIW5vZGVzKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgaHRtbCA9IGJ1aWxkVHJlZUh0bWwobm9kZXMpO1xuICByZXR1cm4geyB0eXBlOiAnaHRtbCcsIHJhdzogaHRtbCwgdGV4dDogaHRtbCwgYmxvY2s6IHRydWUgfTtcbn1cbiIsICJpbXBvcnQgeyBoZXhUb1JnYmEgfSBmcm9tICcuLi91dGlscy9jb2xvcic7XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICDmlbDlvI/jga7oo5zotrPjgrDjg6njg5XvvIhGUi0wNDgsIERELVZUUEwtMTQw44CcMTQ077yJOiDjgqTjg7Pjg6njgqTjg7PmlbDlvI/jg7vjg5bjg63jg4Pjgq/mlbDlvI/jgYvjgokgeCDjga7plqLmlbDvvIh5ID0gZih4Ke+8ieOCkuaknOWHuuOBl+OAgVxuICAgVmlzdWFs44Oi44O844OJ44Gr5YiH44KK5pu/44GI44Gf44Go44GN44GrIENhbnZhcyDjgafjg5fjg63jg4Pjg4joqIjnrpfjgZfjgaYgUE5HIOODqeOCueOCv+ODvOeUu+WDj+OBq+WkieaPm+OBl+OAgeaVsOW8j+OBqOS9teiomOOBp+ihqOekuuOBmeOCi+OAglxuICAg5byP44Gv6Ieq5YmN44Gu5YaN5biw5LiL6ZmN5qeL5paH6Kej5p6Q44Gn6Kqt44G/44CBZXZhbOODu25ldyBGdW5jdGlvbiDjga/kvb/jgo/jgarjgYTvvIhORlItMDAz77yJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG5leHBvcnQgY29uc3QgTUFUSF9QTE9UX01BWF9GVU5DUyA9IDQ7XG5leHBvcnQgY29uc3QgTUFUSF9QTE9UX1BBTEVUVEVTOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XG4gIHNoYXBlczogWycjRTI5NTc4JywgJyNFQkI0NTMnLCAnIzZDQzRDOScsICcjOUNDQjg2J10sXG4gIGNhcmRzOiBbJyNFMjk1NzgnLCAnI0U2QjM0QicsICcjQTNCNEU0JywgJyM2REIxQjQnXSxcbiAgY2lyY2xlczogWycjRDQ1RDUzJywgJyM3RUE2QkYnLCAnI0VDQjY3NCcsICcjN0Q5NzYzJ10sXG4gIGVkaXRvcmlhbDogWycjRDY4QzhDJywgJyM4RkE4NzYnLCAnI0M5QTY2QicsICcjOEZBM0I4J11cbn07XG5cbmV4cG9ydCBpbnRlcmZhY2UgTWF0aFBsb3RCb3hDb25maWcge1xuICB3OiBudW1iZXI7XG4gIGg6IG51bWJlcjtcbiAgbGVmdDogbnVtYmVyO1xuICByaWdodDogbnVtYmVyO1xuICB0b3A6IG51bWJlcjtcbiAgYm90dG9tOiBudW1iZXI7XG4gIHNhbXBsZXM6IG51bWJlcjtcbn1cblxuZXhwb3J0IGNvbnN0IE1BVEhfUExPVF9CT1g6IHsgYmxvY2s6IE1hdGhQbG90Qm94Q29uZmlnOyBpbmxpbmU6IE1hdGhQbG90Qm94Q29uZmlnIH0gPSB7XG4gIGJsb2NrOiB7IHc6IDM0MCwgaDogMjAwLCBsZWZ0OiA0MiwgcmlnaHQ6IDE0LCB0b3A6IDE0LCBib3R0b206IDI2LCBzYW1wbGVzOiA0ODAgfSxcbiAgaW5saW5lOiB7IHc6IDE1NiwgaDogODQsIGxlZnQ6IDI2LCByaWdodDogOCwgdG9wOiA4LCBib3R0b206IDE2LCBzYW1wbGVzOiAyNDAgfVxufTtcblxuZXhwb3J0IGNvbnN0IE1BVEhfUExPVF9GVU5DUzogUmVjb3JkPHN0cmluZywgKHg6IG51bWJlcikgPT4gbnVtYmVyPiA9IHtcbiAgc2luOiBNYXRoLnNpbiwgY29zOiBNYXRoLmNvcywgdGFuOiBNYXRoLnRhbiwgYXNpbjogTWF0aC5hc2luLCBhY29zOiBNYXRoLmFjb3MsIGF0YW46IE1hdGguYXRhbixcbiAgc2luaDogTWF0aC5zaW5oLCBjb3NoOiBNYXRoLmNvc2gsIHRhbmg6IE1hdGgudGFuaCxcbiAgc2VjOiAoeDogbnVtYmVyKSA9PiAxIC8gTWF0aC5jb3MoeCksIGNzYzogKHg6IG51bWJlcikgPT4gMSAvIE1hdGguc2luKHgpLCBjb3Q6ICh4OiBudW1iZXIpID0+IDEgLyBNYXRoLnRhbih4KSxcbiAgc3FydDogTWF0aC5zcXJ0LCBhYnM6IE1hdGguYWJzLCBleHA6IE1hdGguZXhwLCBsbjogTWF0aC5sb2csIGxvZzogTWF0aC5sb2cxMCxcbiAgZmxvb3I6IE1hdGguZmxvb3IsIGNlaWw6IE1hdGguY2VpbCwgc2lnbjogTWF0aC5zaWduLFxuICBzaW5jOiAoeDogbnVtYmVyKSA9PiAoTWF0aC5hYnMoeCkgPCAxZS05ID8gMSA6IE1hdGguc2luKHgpIC8geClcbn07XG5cbmV4cG9ydCBjb25zdCBNQVRIX1BMT1RfQ09OU1RTOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0geyBwaTogTWF0aC5QSSwgZTogTWF0aC5FIH07XG5leHBvcnQgY29uc3QgTUFUSF9QTE9UX1RSSUdfUkUgPSAvXFxiKD86c2lufGNvc3x0YW58c2VjfGNzY3xjb3QpXFxiLztcbmV4cG9ydCBjb25zdCBURVhfRlJBQ19SRSA9IC9cXFxcKD86ZHx0KT9mcmFjXFxiLztcbmV4cG9ydCBjb25zdCBURVhfU1FSVF9SRSA9IC9cXFxcc3FydFxcYi87XG5leHBvcnQgY29uc3QgVEVYX09QRVJBVE9SX05BTUVfUkUgPSAvXFxcXCg/Om9wZXJhdG9ybmFtZXxtYXRocm0pXFxzKlxce1xccyooW2EtekEtWl0rKVxccypcXH0vZztcbmV4cG9ydCBjb25zdCBURVhfVFJJR19GVU5DU19SRSA9IC9cXFxcKHNpbnxjb3N8dGFufGFzaW58YWNvc3xhdGFufHNpbmh8Y29zaHx0YW5ofHNlY3xjc2N8Y290fGV4cHxsbnxsb2d8c3FydHxhYnN8Zmxvb3J8Y2VpbHxzaWdufHNpbmMpXFxiL2c7XG5cbi8vIDEg5aSJ5pWw44Gu6Zm96Zai5pWw44Gn44Gv44Gq44GE5pWw5byP77yI5a6a56mN5YiG44O757eP5ZKM44O75qW16ZmQ44O76KGM5YiX44O744OG44Kt44K544OI5re75a2X44O75ry45YyW5byP44O75b6u5YiG6KiY5Y+344Gq44Gp77yJ44KS5pep5pyf44Gr6Zmk5aSW44GZ44KLXG5leHBvcnQgY29uc3QgTUFUSF9QTE9UX1JFSkVDVF9SRSA9IC9cXFxcKD86aW50fGlpbnR8aWlpbnR8b2ludHxzdW18cHJvZHxjb3Byb2R8bGltfGxpbXN1cHxsaW1pbmZ8aW5mdHl8cGFydGlhbHxuYWJsYXxwbXxtcHxhcHByb3h8c2ltfHNpbWVxfGNvbmd8ZXF1aXZ8bmV8bmVxfHByb3B0b3xzdWJzZXR8c3Vic2V0ZXF8Y3VwfGNhcHxmb3JhbGx8ZXhpc3RzfFJpZ2h0YXJyb3d8TGVmdHJpZ2h0YXJyb3d8dG98cmlnaHRhcnJvd3xtYXBzdG98dGV4dHx0ZXh0YmZ8dGV4dGl0fG1hdGhiZnxtYXRoY2FsfG1hdGhiYilcXGJ8XFxcXGJlZ2luXFx7KD86W3BiQnZWXT9tYXRyaXh8Y2FzZXN8IHN1YmFycmF5KVxcfXxbXyddLztcblxuZXhwb3J0IGNvbnN0IGhhc093biA9IChvYmo6IGFueSwga2V5OiBzdHJpbmcpID0+IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG5cbi8vIHN0cltzdGFydF0g44GuICd7JyDjgavlr77lv5zjgZnjgosgJ30nIOOCkuaOouOBl+OAgeS4rei6q+OBqOasoeOBruS9jee9ruOCkui/lOOBme+8iERELVZUUEwtMTQw77yJXG5leHBvcnQgZnVuY3Rpb24gZXh0cmFjdEJyYWNlZEdyb3VwKHN0cjogc3RyaW5nLCBzdGFydDogbnVtYmVyKTogeyBjb250ZW50OiBzdHJpbmc7IGVuZDogbnVtYmVyIH0gfCBudWxsIHtcbiAgbGV0IGkgPSBzdGFydDtcbiAgd2hpbGUgKGkgPCBzdHIubGVuZ3RoICYmIC9cXHMvLnRlc3Qoc3RyW2ldKSkgaSsrO1xuICBpZiAoc3RyW2ldICE9PSAneycpIHJldHVybiBudWxsO1xuICBsZXQgZGVwdGggPSAxO1xuICBjb25zdCBvcGVuID0gaSArIDE7XG4gIGZvciAoaSA9IG9wZW47IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3RyW2ldID09PSAnXFxcXCcpIHsgaSsrOyBjb250aW51ZTsgfVxuICAgIGlmIChzdHJbaV0gPT09ICd7JykgZGVwdGgrKztcbiAgICBlbHNlIGlmIChzdHJbaV0gPT09ICd9Jykge1xuICAgICAgZGVwdGgtLTtcbiAgICAgIGlmIChkZXB0aCA9PT0gMCkgcmV0dXJuIHsgY29udGVudDogc3RyLnNsaWNlKG9wZW4sIGkpLCBlbmQ6IGkgKyAxIH07XG4gICAgfVxuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyBUZVgg44GuIFxcZnJhY3tBfXtCfSDjgaggXFxzcXJ0W25de0F9IC8gXFxzcXJ0e0F9IOOCkuWFpeOCjOWtkOOBruWGheWBtOOBi+OCieaLrOW8p+S7mOOBjeOBruW8j+OBq+WxlemWi+OBmeOCi++8iERELVZUUEwtMTQw77yJXG5leHBvcnQgZnVuY3Rpb24gZXhwYW5kVGV4Q29uc3RydWN0cyhpbnB1dDogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGxldCBzID0gaW5wdXQ7XG4gIGZvciAobGV0IGd1YXJkID0gMDsgZ3VhcmQgPCAzMjsgZ3VhcmQrKykge1xuICAgIGNvbnN0IGZyYWNNYXRjaCA9IFRFWF9GUkFDX1JFLmV4ZWMocyk7XG4gICAgaWYgKGZyYWNNYXRjaCkge1xuICAgICAgY29uc3QgbnVtID0gZXh0cmFjdEJyYWNlZEdyb3VwKHMsIGZyYWNNYXRjaC5pbmRleCArIGZyYWNNYXRjaFswXS5sZW5ndGgpO1xuICAgICAgY29uc3QgZGVuID0gbnVtID8gZXh0cmFjdEJyYWNlZEdyb3VwKHMsIG51bS5lbmQpIDogbnVsbDtcbiAgICAgIGlmICghbnVtIHx8ICFkZW4pIHJldHVybiBudWxsO1xuICAgICAgcyA9IGAke3Muc2xpY2UoMCwgZnJhY01hdGNoLmluZGV4KX0oKCR7bnVtLmNvbnRlbnR9KS8oJHtkZW4uY29udGVudH0pKSR7cy5zbGljZShkZW4uZW5kKX1gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHNxcnRNYXRjaCA9IFRFWF9TUVJUX1JFLmV4ZWMocyk7XG4gICAgaWYgKHNxcnRNYXRjaCkge1xuICAgICAgbGV0IGFmdGVyID0gc3FydE1hdGNoLmluZGV4ICsgc3FydE1hdGNoWzBdLmxlbmd0aDtcbiAgICAgIHdoaWxlIChhZnRlciA8IHMubGVuZ3RoICYmIC9cXHMvLnRlc3Qoc1thZnRlcl0pKSBhZnRlcisrO1xuICAgICAgbGV0IHJvb3QgPSBudWxsO1xuICAgICAgaWYgKHNbYWZ0ZXJdID09PSAnWycpIHtcbiAgICAgICAgY29uc3QgY2xvc2VCcmFja2V0ID0gcy5pbmRleE9mKCddJywgYWZ0ZXIgKyAxKTtcbiAgICAgICAgaWYgKGNsb3NlQnJhY2tldCA8IDApIHJldHVybiBudWxsO1xuICAgICAgICByb290ID0gcy5zbGljZShhZnRlciArIDEsIGNsb3NlQnJhY2tldCk7XG4gICAgICAgIGFmdGVyID0gY2xvc2VCcmFja2V0ICsgMTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJhZCA9IGV4dHJhY3RCcmFjZWRHcm91cChzLCBhZnRlcik7XG4gICAgICBpZiAoIXJhZCkgcmV0dXJuIG51bGw7XG4gICAgICBjb25zdCByZXAgPSByb290ID8gYCgoJHtyYWQuY29udGVudH0pXigxLygke3Jvb3R9KSkpYCA6IGBzcXJ0KCR7cmFkLmNvbnRlbnR9KWA7XG4gICAgICBzID0gYCR7cy5zbGljZSgwLCBzcXJ0TWF0Y2guaW5kZXgpfSR7cmVwfSR7cy5zbGljZShyYWQuZW5kKX1gO1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGJyZWFrO1xuICB9XG4gIHJldHVybiBzO1xufVxuXG4vLyBUZVgg44Gu5pWw5byP6KGo54++44KS5qeL5paH6Kej5p6Q5Zmo44GM6Kqt44KB44KL5b2i44Gr5q2j6KaP5YyW44GZ44KL44CC5pyq5a++5b+c44Gu44Kz44Oe44Oz44OJ44GM44GC44KM44GwIG51bGwg44KS6L+U44GZ77yIREQtVlRQTC0xNDDvvIlcbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpemVUZXhQbG90RXhwcihyYXc6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBsZXQgcyA9IHJhd1xuICAgIC5yZXBsYWNlKC9cXFxcKD86LHw7fDp8IXxxdWFkfHFxdWFkfCApL2csICcgJylcbiAgICAucmVwbGFjZSgvfi9nLCAnICcpXG4gICAgLnJlcGxhY2UoL1xcXFwoPzpsZWZ0fHJpZ2h0fFtiQl1pZyg/Omx8cnxtKT98W2JCXWlnZyg/Omx8cnxtKT8pXFxzKig/PVsoKVtcXF18XFxcXF0pL2csICcnKVxuICAgIC5yZXBsYWNlKC9cXFxcKD86bHZlcnR8cnZlcnR8dmVydClcXGIvZywgJ3wnKVxuICAgIC5yZXBsYWNlKFRFWF9PUEVSQVRPUl9OQU1FX1JFLCAnICQxICcpO1xuICBjb25zdCBleHBhbmRlZCA9IGV4cGFuZFRleENvbnN0cnVjdHMocyk7XG4gIGlmIChleHBhbmRlZCA9PT0gbnVsbCkgcmV0dXJuIG51bGw7XG4gIHMgPSBleHBhbmRlZFxuICAgIC5yZXBsYWNlKC9cXFxcYXJjc2luXFxiL2csICcgYXNpbiAnKVxuICAgIC5yZXBsYWNlKC9cXFxcYXJjY29zXFxiL2csICcgYWNvcyAnKVxuICAgIC5yZXBsYWNlKC9cXFxcYXJjdGFuXFxiL2csICcgYXRhbiAnKVxuICAgIC5yZXBsYWNlKFRFWF9UUklHX0ZVTkNTX1JFLCAnICQxICcpXG4gICAgLnJlcGxhY2UoL1xcXFxwaVxcYi9nLCAnIHBpICcpXG4gICAgLnJlcGxhY2UoL1xcXFwoPzpjZG90fHRpbWVzfGFzdClcXGIvZywgJyonKVxuICAgIC5yZXBsYWNlKC9cXFxcZGl2XFxiL2csICcvJyk7XG4gIGlmICgvXFxcXC8udGVzdChzKSkgcmV0dXJuIG51bGw7XG4gIHMgPSBzXG4gICAgLnJlcGxhY2UoL1viiJLigJNdL2csICctJylcbiAgICAucmVwbGFjZSgvW8OXwrddL2csICcqJylcbiAgICAucmVwbGFjZSgvw7cvZywgJy8nKVxuICAgIC5yZXBsYWNlKC9cXCpcXCovZywgJ14nKVxuICAgIC5yZXBsYWNlKC/PgC9nLCAnIHBpICcpXG4gICAgLnJlcGxhY2UoL1xcWy9nLCAnKCcpXG4gICAgLnJlcGxhY2UoL1xcXS9nLCAnKScpXG4gICAgLnJlcGxhY2UoL1xcey9nLCAnKCcpXG4gICAgLnJlcGxhY2UoL1xcfS9nLCAnKScpO1xuICByZXR1cm4gcy50cmltKCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGxvdFRva2VuIHtcbiAgdDogc3RyaW5nO1xuICB2PzogYW55O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdG9rZW5pemVQbG90RXhwcihzcmM6IHN0cmluZyk6IFBsb3RUb2tlbltdIHwgbnVsbCB7XG4gIGNvbnN0IG5vcm0gPSBub3JtYWxpemVUZXhQbG90RXhwcihzcmMpO1xuICBpZiAoIW5vcm0pIHJldHVybiBudWxsO1xuICBjb25zdCB0b2tlbnM6IFBsb3RUb2tlbltdID0gW107XG4gIGNvbnN0IHJlID0gL1xccyooPzooXFxkKyg/OlxcLlxcZCopP3xcXC5cXGQrKXwoW2EtekEtWl0rKXwoWy0rKi9eKCl8XSkpL3k7XG4gIHdoaWxlIChyZS5sYXN0SW5kZXggPCBub3JtLmxlbmd0aCAmJiBub3JtLnNsaWNlKHJlLmxhc3RJbmRleCkudHJpbSgpKSB7XG4gICAgY29uc3QgbSA9IHJlLmV4ZWMobm9ybSk7XG4gICAgaWYgKCFtKSByZXR1cm4gbnVsbDtcbiAgICBpZiAobVsxXSkgdG9rZW5zLnB1c2goeyB0OiAnbnVtJywgdjogcGFyc2VGbG9hdChtWzFdKSB9KTtcbiAgICBlbHNlIGlmIChtWzJdKSB0b2tlbnMucHVzaCh7IHQ6ICdpZCcsIHY6IG1bMl0udG9Mb3dlckNhc2UoKSB9KTtcbiAgICBlbHNlIHRva2Vucy5wdXNoKHsgdDogbVszXSB9KTtcbiAgfVxuICByZXR1cm4gdG9rZW5zLmxlbmd0aCA/IHRva2VucyA6IG51bGw7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgUGFyc2VkUGxvdEV4cHIge1xuICBmbjogKHg6IG51bWJlcikgPT4gbnVtYmVyO1xuICB1c2VkWDogYm9vbGVhbjtcbiAgbm9ybTogc3RyaW5nIHwgbnVsbDtcbn1cblxuLy8g5byP44KSIHgg44Gu6KmV5L6h6Zai5pWw77yI44Kv44Ot44O844K444Oj77yJ44Gr5aSJ5o+b44GZ44KL44CC5Li45ous5byn44Gq44GX44GuIFRlWCDplqLmlbDoqJjms5XvvIhcXHNpbiAyeO+8ieOChOmWouaVsOOBueOBjeS5l++8iFxcc2luXjIgeO+8ieOAgee1tuWvvuWApCB8eHwg44Gr44KC5a++5b+c44GZ44KL77yIREQtVlRQTC0xNDDvvIlcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVBsb3RFeHByKHNyYzogc3RyaW5nKTogUGFyc2VkUGxvdEV4cHIgfCBudWxsIHtcbiAgY29uc3QgdG9rZW5zID0gdG9rZW5pemVQbG90RXhwcihzcmMpO1xuICBpZiAoIXRva2VucykgcmV0dXJuIG51bGw7XG4gIGxldCBwb3MgPSAwO1xuICBsZXQgdXNlZFggPSBmYWxzZTtcbiAgbGV0IGluQWJzID0gMDtcbiAgY29uc3QgdGFrZSA9ICh0OiBzdHJpbmcpID0+IHtcbiAgICBpZiAodG9rZW5zW3Bvc10gJiYgdG9rZW5zW3Bvc10udCA9PT0gdCkgeyBwb3MrKzsgcmV0dXJuIHRydWU7IH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH07XG4gIGNvbnN0IHN0YXJ0c0ZhY3RvciA9ICh0b2s/OiBQbG90VG9rZW4pID0+IHRvayAmJiAodG9rLnQgPT09ICdudW0nIHx8IHRvay50ID09PSAnaWQnIHx8IHRvay50ID09PSAnKCcgfHwgKHRvay50ID09PSAnfCcgJiYgaW5BYnMgPT09IDApKTtcbiAgY29uc3Qgc3RhcnRzQXRvbSA9ICh0b2s/OiBQbG90VG9rZW4pID0+IHRvayAmJiAodG9rLnQgPT09ICdudW0nIHx8ICh0b2sudCA9PT0gJ2lkJyAmJiAhaGFzT3duKE1BVEhfUExPVF9GVU5DUywgdG9rLnYpKSk7XG4gIHRyeSB7XG4gICAgZnVuY3Rpb24gZXhwcigpOiAoeDogbnVtYmVyKSA9PiBudW1iZXIge1xuICAgICAgbGV0IGxlZnQgPSB0ZXJtKCk7XG4gICAgICBmb3IgKDs7KSB7XG4gICAgICAgIGNvbnN0IGEgPSBsZWZ0O1xuICAgICAgICBpZiAodGFrZSgnKycpKSB7IGNvbnN0IGIgPSB0ZXJtKCk7IGxlZnQgPSB4ID0+IGEoeCkgKyBiKHgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHRha2UoJy0nKSkgeyBjb25zdCBiID0gdGVybSgpOyBsZWZ0ID0geCA9PiBhKHgpIC0gYih4KTsgfVxuICAgICAgICBlbHNlIHJldHVybiBsZWZ0O1xuICAgICAgfVxuICAgIH1cbiAgICBmdW5jdGlvbiB0ZXJtKCk6ICh4OiBudW1iZXIpID0+IG51bWJlciB7XG4gICAgICBsZXQgbGVmdCA9IHVuYXJ5KCk7XG4gICAgICBmb3IgKDs7KSB7XG4gICAgICAgIGNvbnN0IGEgPSBsZWZ0O1xuICAgICAgICBpZiAodGFrZSgnKicpKSB7IGNvbnN0IGIgPSB1bmFyeSgpOyBsZWZ0ID0geCA9PiBhKHgpICogYih4KTsgfVxuICAgICAgICBlbHNlIGlmICh0YWtlKCcvJykpIHsgY29uc3QgYiA9IHVuYXJ5KCk7IGxlZnQgPSB4ID0+IGEoeCkgLyBiKHgpOyB9XG4gICAgICAgIGVsc2UgaWYgKHN0YXJ0c0ZhY3Rvcih0b2tlbnNbcG9zXSkpIHsgY29uc3QgYiA9IHBvd2VyKCk7IGxlZnQgPSB4ID0+IGEoeCkgKiBiKHgpOyB9XG4gICAgICAgIGVsc2UgcmV0dXJuIGxlZnQ7XG4gICAgICB9XG4gICAgfVxuICAgIGZ1bmN0aW9uIHVuYXJ5KCk6ICh4OiBudW1iZXIpID0+IG51bWJlciB7XG4gICAgICBpZiAodGFrZSgnLScpKSB7IGNvbnN0IGEgPSB1bmFyeSgpOyByZXR1cm4geCA9PiAtYSh4KTsgfVxuICAgICAgaWYgKHRha2UoJysnKSkgcmV0dXJuIHVuYXJ5KCk7XG4gICAgICByZXR1cm4gcG93ZXIoKTtcbiAgICB9XG4gICAgZnVuY3Rpb24gcG93ZXIoKTogKHg6IG51bWJlcikgPT4gbnVtYmVyIHtcbiAgICAgIGNvbnN0IGJhc2UgPSBwcmltYXJ5KCk7XG4gICAgICBpZiAodGFrZSgnXicpKSB7IGNvbnN0IGV4cCA9IHVuYXJ5KCk7IHJldHVybiB4ID0+IE1hdGgucG93KGJhc2UoeCksIGV4cCh4KSk7IH1cbiAgICAgIHJldHVybiBiYXNlO1xuICAgIH1cbiAgICAvLyDkuLjmi6zlvKfjgarjgZfjga4gVGVYIOmWouaVsOW8leaVsO+8iOS+izogXFxzaW4gMngsIFxcY29zIFxccGkgeO+8ieOCkuiqreOCgFxuICAgIGZ1bmN0aW9uIGJhcmVGdW5jQXJnKCk6ICh4OiBudW1iZXIpID0+IG51bWJlciB7XG4gICAgICBpZiAodGFrZSgnLScpKSB7IGNvbnN0IGEgPSBiYXJlRnVuY0FyZygpOyByZXR1cm4geCA9PiAtYSh4KTsgfVxuICAgICAgaWYgKHRha2UoJysnKSkgcmV0dXJuIGJhcmVGdW5jQXJnKCk7XG4gICAgICBsZXQgbGVmdCA9IHBvd2VyKCk7XG4gICAgICB3aGlsZSAoc3RhcnRzQXRvbSh0b2tlbnNbcG9zXSkpIHtcbiAgICAgICAgY29uc3QgYSA9IGxlZnQ7XG4gICAgICAgIGNvbnN0IGIgPSBwb3dlcigpO1xuICAgICAgICBsZWZ0ID0geCA9PiBhKHgpICogYih4KTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBsZWZ0O1xuICAgIH1cbiAgICBmdW5jdGlvbiBwcmltYXJ5KCk6ICh4OiBudW1iZXIpID0+IG51bWJlciB7XG4gICAgICBjb25zdCB0b2sgPSB0b2tlbnNbcG9zKytdO1xuICAgICAgaWYgKCF0b2spIHRocm93IG5ldyBFcnJvcignZW9mJyk7XG4gICAgICBpZiAodG9rLnQgPT09ICdudW0nKSB7IGNvbnN0IHYgPSB0b2sudjsgcmV0dXJuICgpID0+IHY7IH1cbiAgICAgIGlmICh0b2sudCA9PT0gJygnKSB7XG4gICAgICAgIGNvbnN0IGlubmVyID0gZXhwcigpO1xuICAgICAgICBpZiAoIXRha2UoJyknKSkgdGhyb3cgbmV3IEVycm9yKCdwYXJlbicpO1xuICAgICAgICByZXR1cm4gaW5uZXI7XG4gICAgICB9XG4gICAgICBpZiAodG9rLnQgPT09ICd8Jykge1xuICAgICAgICBpbkFicysrO1xuICAgICAgICBjb25zdCBpbm5lciA9IGV4cHIoKTtcbiAgICAgICAgaW5BYnMtLTtcbiAgICAgICAgaWYgKCF0YWtlKCd8JykpIHRocm93IG5ldyBFcnJvcignYWJzJyk7XG4gICAgICAgIHJldHVybiB4ID0+IE1hdGguYWJzKGlubmVyKHgpKTtcbiAgICAgIH1cbiAgICAgIGlmICh0b2sudCA9PT0gJ2lkJykge1xuICAgICAgICBpZiAodG9rLnYgPT09ICd4JykgeyB1c2VkWCA9IHRydWU7IHJldHVybiB4ID0+IHg7IH1cbiAgICAgICAgaWYgKGhhc093bihNQVRIX1BMT1RfQ09OU1RTLCB0b2sudikpIHsgY29uc3QgdiA9IE1BVEhfUExPVF9DT05TVFNbdG9rLnZdOyByZXR1cm4gKCkgPT4gdjsgfVxuICAgICAgICBpZiAoaGFzT3duKE1BVEhfUExPVF9GVU5DUywgdG9rLnYpKSB7XG4gICAgICAgICAgY29uc3QgZm4gPSBNQVRIX1BMT1RfRlVOQ1NbdG9rLnZdO1xuICAgICAgICAgIGxldCBmblBvdzogKCh4OiBudW1iZXIpID0+IG51bWJlcikgfCBudWxsID0gbnVsbDtcbiAgICAgICAgICBpZiAodGFrZSgnXicpKSBmblBvdyA9IHByaW1hcnkoKTtcbiAgICAgICAgICBsZXQgYXJnOiAoeDogbnVtYmVyKSA9PiBudW1iZXI7XG4gICAgICAgICAgaWYgKHRha2UoJygnKSkge1xuICAgICAgICAgICAgYXJnID0gZXhwcigpO1xuICAgICAgICAgICAgaWYgKCF0YWtlKCcpJykpIHRocm93IG5ldyBFcnJvcignZm4tcGFyZW4nKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYXJnID0gYmFyZUZ1bmNBcmcoKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY29uc3QgY2FsbCA9ICh4OiBudW1iZXIpID0+IGZuKGFyZyh4KSk7XG4gICAgICAgICAgcmV0dXJuIGZuUG93ID8gKHggPT4gTWF0aC5wb3coY2FsbCh4KSwgZm5Qb3chKHgpKSkgOiBjYWxsO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Rva2VuJyk7XG4gICAgfVxuICAgIGNvbnN0IGZuID0gZXhwcigpO1xuICAgIGlmIChwb3MgPCB0b2tlbnMubGVuZ3RoKSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4geyBmbiwgdXNlZFgsIG5vcm06IG5vcm1hbGl6ZVRleFBsb3RFeHByKHNyYykgfTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbi8vIOaLrOW8p+OBruWkluWBtOOBq+OBguOCi+WMuuWIh+OCiu+8iFxcXFzjgIE744CBLO+8ieOBpyBUZVgg5pWw5byP44KS5YiG5Ymy44GZ44KLXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRUb3BMZXZlbFRleChzdHI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcGFydHM6IHN0cmluZ1tdID0gW107XG4gIGxldCBkZXB0aCA9IDA7XG4gIGxldCBzdGFydCA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgY2ggPSBzdHJbaV07XG4gICAgaWYgKGNoID09PSAnXFxcXCcgJiYgc3RyW2kgKyAxXSA9PT0gJ1xcXFwnKSB7XG4gICAgICBpZiAoZGVwdGggPT09IDApIHtcbiAgICAgICAgcGFydHMucHVzaChzdHIuc2xpY2Uoc3RhcnQsIGkpKTtcbiAgICAgICAgc3RhcnQgPSBpICsgMjtcbiAgICAgIH1cbiAgICAgIGkrKztcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICBpZiAoY2ggPT09ICcoJyB8fCBjaCA9PT0gJ3snIHx8IGNoID09PSAnWycpIGRlcHRoKys7XG4gICAgZWxzZSBpZiAoY2ggPT09ICcpJyB8fCBjaCA9PT0gJ30nIHx8IGNoID09PSAnXScpIGRlcHRoID0gTWF0aC5tYXgoMCwgZGVwdGggLSAxKTtcbiAgICBlbHNlIGlmIChkZXB0aCA9PT0gMCAmJiAoY2ggPT09ICcsJyB8fCBjaCA9PT0gJzsnKSkge1xuICAgICAgcGFydHMucHVzaChzdHIuc2xpY2Uoc3RhcnQsIGkpKTtcbiAgICAgIHN0YXJ0ID0gaSArIDE7XG4gICAgfVxuICB9XG4gIHBhcnRzLnB1c2goc3RyLnNsaWNlKHN0YXJ0KSk7XG4gIHJldHVybiBwYXJ0cy5tYXAocCA9PiBwLnRyaW0oKSkuZmlsdGVyKEJvb2xlYW4pO1xufVxuXG4vLyDlrprnvqnln5/jga7oqJjov7DvvIjkvos6IC0yXFxwaSBcXGxlIHggXFxsZSAyXFxwaSwgeCBcXGluIFswLCA0XFxwaV3vvInjgYvjgokgW2xvLCBoaV0g44KS5Y+W44KK5Ye644GZ77yIREQtVlRQTC0xNDHvvIlcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVRleERvbWFpblBhcnQocGFydDogc3RyaW5nKTogeyByYW5nZTogW251bWJlciwgbnVtYmVyXTsgeFBpOiBib29sZWFuIH0gfCBudWxsIHtcbiAgY29uc3QgY2xlYW4gPSBwYXJ0LnJlcGxhY2UoL15cXCh8XFwpJC9nLCAnJykudHJpbSgpO1xuICBsZXQgbSA9IC9eKC4rPylcXHMqKD86XFxcXGxlfFxcXFxsZXF8PHw8PSlcXHMqeFxccyooPzpcXFxcbGV8XFxcXGxlcXw8fDw9KVxccyooLispJC8uZXhlYyhjbGVhbik7XG4gIGlmICghbSkgbSA9IC9eeFxccypcXFxcaW5cXHMqW1xcWyhdXFxzKihbXixdKylcXHMqLFxccyooW15cXF1cXCldKylcXHMqW1xcXSldJC8uZXhlYyhjbGVhbik7XG4gIGlmICghbSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGxvRXhwciA9IHBhcnNlUGxvdEV4cHIobVsxXSk7XG4gIGNvbnN0IGhpRXhwciA9IHBhcnNlUGxvdEV4cHIobVsyXSk7XG4gIGlmICghbG9FeHByIHx8ICFoaUV4cHIgfHwgbG9FeHByLnVzZWRYIHx8IGhpRXhwci51c2VkWCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGxvID0gbG9FeHByLmZuKDApO1xuICBjb25zdCBoaSA9IGhpRXhwci5mbigwKTtcbiAgaWYgKCEoTnVtYmVyLmlzRmluaXRlKGxvKSAmJiBOdW1iZXIuaXNGaW5pdGUoaGkpICYmIGxvIDwgaGkpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgcmFuZ2U6IFtsbywgaGldLCB4UGk6IC9cXFxccGl8z4B8XFxicGlcXGIvaS50ZXN0KGNsZWFuKSB9O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBsb3RGdW5jdGlvbkl0ZW0ge1xuICBsYWJlbDogc3RyaW5nO1xuICBmbjogKHg6IG51bWJlcikgPT4gbnVtYmVyO1xuICB1c2VkWDogYm9vbGVhbjtcbiAgbm9ybTogc3RyaW5nIHwgbnVsbDtcbn1cblxuLy8g5byP44Gu5oCn6LOq77yI5LiJ6KeS6Zai5pWw44O75rib6KGw5oyv5YuV44O75a6a576p5Z+f44GM5q2j44Gu44G/44Gu6Zai5pWw77yJ44GL44KJ6KaL5qCE44GI44Gu44KI44GEIHgg44Gu5pei5a6a56+E5Zuy44KS6YG444G277yIREQtVlRQTC0xNDHvvIlcbmV4cG9ydCBmdW5jdGlvbiBjaG9vc2VBdXRvWFJhbmdlKGZuczogUGxvdEZ1bmN0aW9uSXRlbVtdKTogeyByYW5nZTogW251bWJlciwgbnVtYmVyXTsgeFBpOiBib29sZWFuIH0ge1xuICBjb25zdCBoYXNUcmlnID0gZm5zLnNvbWUoZiA9PiBmLm5vcm0gJiYgTUFUSF9QTE9UX1RSSUdfUkUudGVzdChmLm5vcm0pKTtcbiAgY29uc3QgaGFzRXhwID0gZm5zLnNvbWUoZiA9PiBmLm5vcm0gJiYgL1xcYig/OmV4cHxlKVxcYi8udGVzdChmLm5vcm0pKTtcbiAgLy8g6LKg44GuIHgg44Gn5YCk44GM44GZ44G544GmIE5hTiDjgavjgarjgovplqLmlbDvvIhcXHNxcnR7eH0sIFxcbG4oeCkg44Gq44Gp77yJ44GvIFswLCAxMF3vvIjkuInop5LplqLmlbDjgarjgokgWzAsIDRcXHBpXe+8ieOBq+OBmeOCi1xuICBjb25zdCBuZWdWYWxpZCA9IFstNCwgLTIsIC0xLCAtMC41XS5zb21lKHggPT4gZm5zLnNvbWUoZiA9PiBOdW1iZXIuaXNGaW5pdGUoZi5mbih4KSkpKTtcbiAgaWYgKCFuZWdWYWxpZCkge1xuICAgIHJldHVybiBoYXNUcmlnID8geyByYW5nZTogWzAsIDQgKiBNYXRoLlBJXSwgeFBpOiB0cnVlIH0gOiB7IHJhbmdlOiBbMCwgMTBdLCB4UGk6IGZhbHNlIH07XG4gIH1cbiAgLy8g5rib6KGw5oyv5YuV77yIZV57LWF4fVxcc2luKGJ4KSDjgarjganjgIHosqDlgbTjgafmgKXlopfjgZfmraPlgbTjgafmuJvoobDjgZnjgovplqLmlbDvvInjga8gWzAsIDRcXHBpXSDjgavjgZnjgotcbiAgaWYgKGhhc1RyaWcgJiYgaGFzRXhwKSB7XG4gICAgY29uc3QgbmVnTWF4ID0gTWF0aC5tYXgoLi4uZm5zLm1hcChmID0+IE1hdGguYWJzKGYuZm4oLU1hdGguUEkpKSkuZmlsdGVyKE51bWJlci5pc0Zpbml0ZSkpO1xuICAgIGNvbnN0IHBvc01heCA9IE1hdGgubWF4KC4uLmZucy5tYXAoZiA9PiBNYXRoLmFicyhmLmZuKE1hdGguUEkpKSkuZmlsdGVyKE51bWJlci5pc0Zpbml0ZSkpO1xuICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobmVnTWF4KSAmJiBOdW1iZXIuaXNGaW5pdGUocG9zTWF4KSAmJiBwb3NNYXggPiAwICYmIG5lZ01heCA+IHBvc01heCAqIDIuNSkge1xuICAgICAgcmV0dXJuIHsgcmFuZ2U6IFswLCA0ICogTWF0aC5QSV0sIHhQaTogdHJ1ZSB9O1xuICAgIH1cbiAgfVxuICByZXR1cm4gaGFzVHJpZyA/IHsgcmFuZ2U6IFstMiAqIE1hdGguUEksIDIgKiBNYXRoLlBJXSwgeFBpOiB0cnVlIH0gOiB7IHJhbmdlOiBbLTUsIDVdLCB4UGk6IGZhbHNlIH07XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGV4UGxvdFNwZWMge1xuICBmbnM6IFBsb3RGdW5jdGlvbkl0ZW1bXTtcbiAgeDogW251bWJlciwgbnVtYmVyXTtcbiAgeFBpOiBib29sZWFuO1xufVxuXG4vLyBUZVgg44Gu5pWw5byP5paH5a2X5YiX44GM44OX44Ot44OD44OI5Y+v6IO944GqIHgg44Gu6Zai5pWw44Gn44GC44KM44GwIHsgZm5zLCB4LCB4UGkgfSDjgpLov5TjgZfjgIHlr77osaHlpJbjgarjgokgbnVsbCDjgpLov5TjgZnvvIhERC1WVFBMLTE0Me+8iVxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlVGV4UGxvdFNwZWModGV4OiBzdHJpbmcpOiBUZXhQbG90U3BlYyB8IG51bGwge1xuICBpZiAoIXRleCB8fCB0eXBlb2YgdGV4ICE9PSAnc3RyaW5nJykgcmV0dXJuIG51bGw7XG4gIGxldCBib2R5ID0gdGV4LnRyaW0oKTtcbiAgY29uc3QgZW52TWF0Y2ggPSAvXlxcXFxiZWdpblxceyhhbGlnbmVkfGFsaWduXFwqP3xnYXRoZXJlZHxhcnJheSlcXH0oPzpcXHtbXnt9XSpcXH0pPyhbXFxzXFxTXSo/KVxcXFxlbmRcXHtcXDFcXH0kLy5leGVjKGJvZHkpO1xuICBpZiAoZW52TWF0Y2gpIGJvZHkgPSBlbnZNYXRjaFsyXS50cmltKCk7XG4gIGlmIChNQVRIX1BMT1RfUkVKRUNUX1JFLnRlc3QoYm9keSkpIHJldHVybiBudWxsO1xuXG4gIGxldCBkb21haW46IHsgcmFuZ2U6IFtudW1iZXIsIG51bWJlcl07IHhQaTogYm9vbGVhbiB9IHwgbnVsbCA9IG51bGw7XG4gIC8vIOacq+WwvuOBqyBcXHF1YWQgKC0yXFxwaSBcXGxlIHggXFxsZSAyXFxwaSkg44Gu44KI44GG44Gr5re744GI44KJ44KM44Gf5a6a576p5Z+f44KS5YWI44Gr5YiH44KK5Ye644GZXG4gIGNvbnN0IHRyYWlsaW5nRG9tYWluID0gL14oLio/KVtcXHNcXFxcLDtdKig/OlxcXFxxdWFkfFxcXFxxcXVhZHxcXHMpXFxzKihcXChbXigpXSo/KD86XFxcXGxlXFxifFxcXFxsZXFcXGJ8PD18PHxcXFxcaW5cXGIpW14oKV0qP1xcKSlcXHMqJC8uZXhlYyhib2R5KTtcbiAgaWYgKHRyYWlsaW5nRG9tYWluKSB7XG4gICAgY29uc3QgZCA9IHBhcnNlVGV4RG9tYWluUGFydCh0cmFpbGluZ0RvbWFpblsyXSk7XG4gICAgaWYgKGQpIHtcbiAgICAgIGRvbWFpbiA9IGQ7XG4gICAgICBib2R5ID0gdHJhaWxpbmdEb21haW5bMV0udHJpbSgpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHJhd1BhcnRzID0gc3BsaXRUb3BMZXZlbFRleChib2R5KTtcbiAgaWYgKCFyYXdQYXJ0cy5sZW5ndGgpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGZuczogUGxvdEZ1bmN0aW9uSXRlbVtdID0gW107XG4gIGZvciAoY29uc3QgcmF3UGFydCBvZiByYXdQYXJ0cykge1xuICAgIGNvbnN0IHBhcnQgPSByYXdQYXJ0LnJlcGxhY2UoLyYvZywgJycpLnRyaW0oKTtcbiAgICBpZiAoIXBhcnQpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGQgPSBwYXJzZVRleERvbWFpblBhcnQocGFydCk7XG4gICAgaWYgKGQpIHtcbiAgICAgIGRvbWFpbiA9IGQ7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgaWYgKC9cXFxcaW5cXGJ8XFxcXGxlXFxifFxcXFxsZXFcXGJ8PHw+Ly50ZXN0KHBhcnQpKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBlcU1hdGNoID0gL14oeXxbYS16QS1aXVxccyooPzpcXFxcbGVmdCk/XFwoXFxzKnhcXHMqKD86XFxcXHJpZ2h0KT9cXCkpXFxzKj1cXHMqKC4rKSQvLmV4ZWMocGFydCk7XG4gICAgaWYgKCFlcU1hdGNoKSByZXR1cm4gbnVsbDtcbiAgICBpZiAoZm5zLmxlbmd0aCA+PSBNQVRIX1BMT1RfTUFYX0ZVTkNTKSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZVBsb3RFeHByKGVxTWF0Y2hbMl0pO1xuICAgIGlmICghcGFyc2VkKSByZXR1cm4gbnVsbDtcbiAgICBmbnMucHVzaCh7IGxhYmVsOiBwYXJ0LCBmbjogcGFyc2VkLmZuLCB1c2VkWDogcGFyc2VkLnVzZWRYLCBub3JtOiBwYXJzZWQubm9ybSB9KTtcbiAgfVxuXG4gIGlmICghZm5zLmxlbmd0aCB8fCAhZm5zLnNvbWUoZiA9PiBmLnVzZWRYKSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGNob3NlbiA9IGRvbWFpbiB8fCBjaG9vc2VBdXRvWFJhbmdlKGZucyk7XG4gIGNvbnN0IFt4MCwgeDFdID0gY2hvc2VuLnJhbmdlO1xuICAvLyDljLrplpPlhoXjgafmnInpmZDjgarlgKTjgYzljYHliIbjgavlvpfjgonjgozjgovjgYvnorrjgYvjgoHjgotcbiAgbGV0IGZpbml0ZUNvdW50ID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPD0gNDA7IGkrKykge1xuICAgIGNvbnN0IHggPSB4MCArICh4MSAtIHgwKSAqIGkgLyA0MDtcbiAgICBpZiAoZm5zLnNvbWUoZiA9PiBOdW1iZXIuaXNGaW5pdGUoZi5mbih4KSkpKSBmaW5pdGVDb3VudCsrO1xuICB9XG4gIGlmIChmaW5pdGVDb3VudCA8IDQpIHJldHVybiBudWxsO1xuICByZXR1cm4geyBmbnMsIHg6IGNob3Nlbi5yYW5nZSwgeFBpOiBjaG9zZW4ueFBpIH07XG59XG5cbi8vIHkg44Gu56+E5Zuy44Gv44K144Oz44OX44Oq44Oz44Kw5YCk44GuIDLjgJw5OCUg44OR44O844K744Oz44K/44Kk44Or56+E5Zuy44Gr5L2Z55m944KS6Laz44GX44Gm5rG644KB44CBdGFuIOetieOBrueZuuaVo+OBp+a9sOOCjOOBquOBhOOCiOOBhuOBq+OBmeOCi++8iERELVZUUEwtMTQy77yJXG5leHBvcnQgZnVuY3Rpb24gYXV0b1Bsb3RSYW5nZShzZXJpZXM6IFtudW1iZXIsIG51bWJlcl1bXVtdKTogW251bWJlciwgbnVtYmVyXSB7XG4gIGNvbnN0IHlzID0gc2VyaWVzLmZsYXQoKS5tYXAocCA9PiBwWzFdKS5maWx0ZXIoTnVtYmVyLmlzRmluaXRlKS5zb3J0KChhLCBiKSA9PiBhIC0gYik7XG4gIGlmICgheXMubGVuZ3RoKSByZXR1cm4gWy0xLCAxXTtcbiAgbGV0IGxvID0geXNbTWF0aC5mbG9vcigoeXMubGVuZ3RoIC0gMSkgKiAwLjAyKV07XG4gIGxldCBoaSA9IHlzW01hdGguY2VpbCgoeXMubGVuZ3RoIC0gMSkgKiAwLjk4KV07XG4gIGlmIChoaSAtIGxvIDwgMWUtOSkgeyBsbyAtPSAxOyBoaSArPSAxOyB9XG4gIGNvbnN0IHBhZCA9IChoaSAtIGxvKSAqIDAuMTtcbiAgcmV0dXJuIFtsbyAtIHBhZCwgaGkgKyBwYWRdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFBsb3RUaWNrIHtcbiAgdjogbnVtYmVyO1xuICBsYWJlbDogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxvdFRpY2tzKGxvOiBudW1iZXIsIGhpOiBudW1iZXIsIHRhcmdldDogbnVtYmVyKTogUGxvdFRpY2tbXSB7XG4gIGNvbnN0IHJhdyA9IChoaSAtIGxvKSAvIHRhcmdldDtcbiAgY29uc3QgbWFnID0gTWF0aC5wb3coMTAsIE1hdGguZmxvb3IoTWF0aC5sb2cxMChyYXcpKSk7XG4gIGNvbnN0IHN0ZXAgPSBbMSwgMiwgNSwgMTBdLm1hcChrID0+IGsgKiBtYWcpLmZpbmQocyA9PiBzID49IHJhdyAqIDAuOTk5KSB8fCBtYWc7XG4gIGNvbnN0IGRpZ2l0cyA9IE1hdGgubWF4KDAsIC1NYXRoLmZsb29yKE1hdGgubG9nMTAoc3RlcCkgKyAxZS05KSk7XG4gIGNvbnN0IHRpY2tzOiBQbG90VGlja1tdID0gW107XG4gIGZvciAobGV0IHYgPSBNYXRoLmNlaWwobG8gLyBzdGVwIC0gMWUtOSkgKiBzdGVwOyB2IDw9IGhpICsgc3RlcCAqIDFlLTk7IHYgKz0gc3RlcCkge1xuICAgIGNvbnN0IHZhbHVlID0gTWF0aC5hYnModikgPCBzdGVwICogMWUtOSA/IDAgOiB2O1xuICAgIHRpY2tzLnB1c2goeyB2OiB2YWx1ZSwgbGFiZWw6IE51bWJlcih2YWx1ZS50b0ZpeGVkKGRpZ2l0cykpLnRvU3RyaW5nKCkucmVwbGFjZSgnLScsICfiiJInKSB9KTtcbiAgfVxuICByZXR1cm4gdGlja3M7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbG90UGlUaWNrcyhsbzogbnVtYmVyLCBoaTogbnVtYmVyLCBtYXhUaWNrcyA9IDkpOiBQbG90VGlja1tdIHtcbiAgZm9yIChjb25zdCB1bml0IG9mIFsxLCAyLCA0XSkge1xuICAgIGNvbnN0IHN0ZXAgPSBNYXRoLlBJIC8gMiAqIHVuaXQ7XG4gICAgY29uc3QgdGlja3M6IFBsb3RUaWNrW10gPSBbXTtcbiAgICBmb3IgKGxldCBrID0gTWF0aC5jZWlsKGxvIC8gc3RlcCAtIDFlLTkpOyBrICogc3RlcCA8PSBoaSArIDFlLTk7IGsrKykge1xuICAgICAgY29uc3QgaGFsZiA9IGsgKiB1bml0O1xuICAgICAgY29uc3Qgc2lnbiA9IGhhbGYgPCAwID8gJ+KIkicgOiAnJztcbiAgICAgIGNvbnN0IG4gPSBNYXRoLmFicyhoYWxmKTtcbiAgICAgIGNvbnN0IGxhYmVsID0gbiA9PT0gMCA/ICcwJyA6IG4gJSAyID09PSAwID8gYCR7c2lnbn0ke24gLyAyID09PSAxID8gJycgOiBuIC8gMn3PgGAgOiBgJHtzaWdufSR7biA9PT0gMSA/ICcnIDogbn3PgC8yYDtcbiAgICAgIHRpY2tzLnB1c2goeyB2OiBrICogc3RlcCwgbGFiZWwgfSk7XG4gICAgfVxuICAgIGlmICh0aWNrcy5sZW5ndGggPD0gbWF4VGlja3MpIHJldHVybiB0aWNrcztcbiAgfVxuICByZXR1cm4gcGxvdFRpY2tzKGxvLCBoaSwgTWF0aC5tYXgoMywgbWF4VGlja3MgLSAyKSk7XG59XG5cbi8vIOOCteODs+ODl+ODquODs+OCsOeCueWIl+OBi+OCieS4jemAo+e2mueCue+8iOa8uOi/kee3muOChOWumue+qeWfn+Wklu+8ieOBp+WIh+aWreOBl+OBn+mAo+e2muWMuumWk+OBrueCueWIl+e+pOOCkueUn+aIkOOBmeOCi++8iERELVZUUEwtMTQy77yJXG5leHBvcnQgZnVuY3Rpb24gc3BsaXRQbG90U2VnbWVudHMoXG4gIHB0czogW251bWJlciwgbnVtYmVyXVtdLFxuICB0b3A6IG51bWJlcixcbiAgcGg6IG51bWJlcixcbiAgc3g6ICh4OiBudW1iZXIpID0+IG51bWJlcixcbiAgc3k6ICh5OiBudW1iZXIpID0+IG51bWJlclxuKTogW251bWJlciwgbnVtYmVyXVtdW10ge1xuICBjb25zdCBzZWdtZW50czogW251bWJlciwgbnVtYmVyXVtdW10gPSBbXTtcbiAgbGV0IGN1cnJlbnQ6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xuICBsZXQgcHJldlB5OiBudW1iZXIgfCBudWxsID0gbnVsbDtcbiAgcHRzLmZvckVhY2goKFt4LCB5XSkgPT4ge1xuICAgIGNvbnN0IHB5ID0gTnVtYmVyLmlzRmluaXRlKHkpID8gc3koeSkgOiBOYU47XG4gICAgY29uc3Qgb2sgPSBOdW1iZXIuaXNGaW5pdGUocHkpICYmIHB5ID4gdG9wIC0gcGggKiAzICYmIHB5IDwgdG9wICsgcGggKiA0O1xuICAgIGlmICghb2spIHtcbiAgICAgIGlmIChjdXJyZW50Lmxlbmd0aCA+IDEpIHNlZ21lbnRzLnB1c2goY3VycmVudCk7XG4gICAgICBjdXJyZW50ID0gW107XG4gICAgICBwcmV2UHkgPSBudWxsO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAocHJldlB5ICE9PSBudWxsICYmIE1hdGguYWJzKHB5IC0gcHJldlB5KSA+IHBoICogMS40KSB7XG4gICAgICBpZiAoY3VycmVudC5sZW5ndGggPiAxKSBzZWdtZW50cy5wdXNoKGN1cnJlbnQpO1xuICAgICAgY3VycmVudCA9IFtdO1xuICAgIH1cbiAgICBjdXJyZW50LnB1c2goW3N4KHgpLCBweV0pO1xuICAgIHByZXZQeSA9IHB5O1xuICB9KTtcbiAgaWYgKGN1cnJlbnQubGVuZ3RoID4gMSkgc2VnbWVudHMucHVzaChjdXJyZW50KTtcbiAgcmV0dXJuIHNlZ21lbnRzO1xufVxuXG4vLyDplqLmlbDku5Xmp5ggc3BlYyDjgpLjgqrjg5Xjgrnjgq/jg6rjg7zjg7MgQ2FudmFzIOOBq+ODl+ODreODg+ODiOaPj+eUu+OBl+OAgVBORyDjg6njgrnjgr/jg7znlLvlg4/jga4gRGF0YSBVUkwg44Gr5aSJ5o+b44GZ44KL77yIREQtVlRQTC0xNDPvvIlcbmV4cG9ydCBmdW5jdGlvbiByZW5kZXJNYXRoUGxvdFRvRGF0YVVybChcbiAgc3BlYzogVGV4UGxvdFNwZWMsXG4gIGlzRGlzcGxheTogYm9vbGVhbixcbiAgc3R5bGU6IHN0cmluZyxcbiAgYXBwZWFyYW5jZTogc3RyaW5nXG4pOiBzdHJpbmcge1xuICBjb25zdCBib3ggPSBpc0Rpc3BsYXkgPyBNQVRIX1BMT1RfQk9YLmJsb2NrIDogTUFUSF9QTE9UX0JPWC5pbmxpbmU7XG4gIGNvbnN0IHsgdywgaCwgbGVmdCwgcmlnaHQsIHRvcCwgYm90dG9tLCBzYW1wbGVzIH0gPSBib3g7XG4gIGNvbnN0IHB3ID0gdyAtIGxlZnQgLSByaWdodDtcbiAgY29uc3QgcGggPSBoIC0gdG9wIC0gYm90dG9tO1xuICBjb25zdCBbeDAsIHgxXSA9IHNwZWMueDtcbiAgY29uc3Qgc2VyaWVzOiBbbnVtYmVyLCBudW1iZXJdW11bXSA9IHNwZWMuZm5zLm1hcChmID0+IHtcbiAgICBjb25zdCBwdHM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDw9IHNhbXBsZXM7IGkrKykge1xuICAgICAgY29uc3QgeCA9IHgwICsgKHgxIC0geDApICogaSAvIHNhbXBsZXM7XG4gICAgICBwdHMucHVzaChbeCwgZi5mbih4KV0pO1xuICAgIH1cbiAgICByZXR1cm4gcHRzO1xuICB9KTtcbiAgY29uc3QgW3kwLCB5MV0gPSBhdXRvUGxvdFJhbmdlKHNlcmllcyk7XG4gIGNvbnN0IHN4ID0gKHg6IG51bWJlcikgPT4gbGVmdCArICh4IC0geDApIC8gKHgxIC0geDApICogcHc7XG4gIGNvbnN0IHN5ID0gKHk6IG51bWJlcikgPT4gdG9wICsgKHkxIC0geSkgLyAoeTEgLSB5MCkgKiBwaDtcblxuICBjb25zdCBpc0RhcmsgPSBhcHBlYXJhbmNlID09PSAnZGFyayc7XG4gIGNvbnN0IHBhbGV0dGUgPSBNQVRIX1BMT1RfUEFMRVRURVNbc3R5bGVdIHx8IE1BVEhfUExPVF9QQUxFVFRFUy5zaGFwZXM7XG4gIGNvbnN0IHNjYWxlID0gMjtcbiAgY29uc3QgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIGNhbnZhcy53aWR0aCA9IHcgKiBzY2FsZTtcbiAgY2FudmFzLmhlaWdodCA9IGggKiBzY2FsZTtcbiAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJykhO1xuICBjdHguc2NhbGUoc2NhbGUsIHNjYWxlKTtcblxuICAvLyAxLiDjg5fjg63jg4Pjg4jpoJjln5/jga7og4zmma/jgrDjg6njg4fjg7zjgrfjg6fjg7NcbiAgY3R4LnNhdmUoKTtcbiAgY3R4LmJlZ2luUGF0aCgpO1xuICBjdHgucmVjdChsZWZ0LCB0b3AsIHB3LCBwaCk7XG4gIGN0eC5jbGlwKCk7XG5cbiAgY29uc3QgYmdHcmFkID0gY3R4LmNyZWF0ZUxpbmVhckdyYWRpZW50KDAsIHRvcCwgMCwgdG9wICsgcGgpO1xuICBpZiAoaXNEYXJrKSB7XG4gICAgYmdHcmFkLmFkZENvbG9yU3RvcCgwLCAnIzBCMTEyMCcpO1xuICAgIGJnR3JhZC5hZGRDb2xvclN0b3AoMSwgJyMxNTIwMzMnKTtcbiAgfSBlbHNlIHtcbiAgICBiZ0dyYWQuYWRkQ29sb3JTdG9wKDAsICcjRjhGQUZDJyk7XG4gICAgYmdHcmFkLmFkZENvbG9yU3RvcCgxLCAnI0ZGRkZGRicpO1xuICB9XG4gIGN0eC5maWxsU3R5bGUgPSBiZ0dyYWQ7XG4gIGN0eC5maWxsUmVjdChsZWZ0LCB0b3AsIHB3LCBwaCk7XG5cbiAgLy8gMi4g44Kw44Oq44OD44OJ57ea77yI56C057ea77yJXG4gIGNvbnN0IHhUaWNrcyA9IHNwZWMueFBpID8gcGxvdFBpVGlja3MoeDAsIHgxLCBpc0Rpc3BsYXkgPyA5IDogNSkgOiBwbG90VGlja3MoeDAsIHgxLCBpc0Rpc3BsYXkgPyA2IDogMyk7XG4gIGNvbnN0IHlUaWNrcyA9IHBsb3RUaWNrcyh5MCwgeTEsIGlzRGlzcGxheSA/IDQgOiAyKTtcbiAgY3R4LnN0cm9rZVN0eWxlID0gaXNEYXJrID8gJ3JnYmEoMTQ4LCAxNjMsIDE4NCwgMC4xNCknIDogJ3JnYmEoMTQ4LCAxNjMsIDE4NCwgMC4yNCknO1xuICBjdHgubGluZVdpZHRoID0gMTtcbiAgY3R4LnNldExpbmVEYXNoKFszLCAzXSk7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgeFRpY2tzLmZvckVhY2godCA9PiB7XG4gICAgY29uc3QgcHggPSBzeCh0LnYpO1xuICAgIGN0eC5tb3ZlVG8ocHgsIHRvcCk7XG4gICAgY3R4LmxpbmVUbyhweCwgdG9wICsgcGgpO1xuICB9KTtcbiAgeVRpY2tzLmZvckVhY2godCA9PiB7XG4gICAgY29uc3QgcHkgPSBzeSh0LnYpO1xuICAgIGN0eC5tb3ZlVG8obGVmdCwgcHkpO1xuICAgIGN0eC5saW5lVG8obGVmdCArIHB3LCBweSk7XG4gIH0pO1xuICBjdHguc3Ryb2tlKCk7XG4gIGN0eC5zZXRMaW5lRGFzaChbXSk7XG5cbiAgLy8gMy4g5Y6f54K56Lu477yIeCA9IDAsIHkgPSAw77yJXG4gIGN0eC5zdHJva2VTdHlsZSA9IGlzRGFyayA/ICdyZ2JhKDIwMywgMjEzLCAyMjUsIDAuNDIpJyA6ICdyZ2JhKDcxLCA4NSwgMTA1LCAwLjQ1KSc7XG4gIGN0eC5saW5lV2lkdGggPSAxLjE7XG4gIGN0eC5iZWdpblBhdGgoKTtcbiAgaWYgKHkwIDw9IDAgJiYgeTEgPj0gMCkge1xuICAgIGNvbnN0IHB5MCA9IHN5KDApO1xuICAgIGN0eC5tb3ZlVG8obGVmdCwgcHkwKTtcbiAgICBjdHgubGluZVRvKGxlZnQgKyBwdywgcHkwKTtcbiAgfVxuICBpZiAoeDAgPD0gMCAmJiB4MSA+PSAwKSB7XG4gICAgY29uc3QgcHgwID0gc3goMCk7XG4gICAgY3R4Lm1vdmVUbyhweDAsIHRvcCk7XG4gICAgY3R4LmxpbmVUbyhweDAsIHRvcCArIHBoKTtcbiAgfVxuICBjdHguc3Ryb2tlKCk7XG5cbiAgLy8gNC4g6YCj57aa5Yy66ZaT44Gr5YiG5Ymy44GX44Gf54K55YiX44KS5L2c5oiQ77yI5ry46L+R57ea44KE5a6a576p5Z+f5aSW44Gn57ea44KS5YiH44KL77yJXG4gIGNvbnN0IGJhc2VQeSA9IHN5KE1hdGgubWluKHkxLCBNYXRoLm1heCh5MCwgMCkpKTtcbiAgY29uc3Qgc2VnbWVudHNCeVNlcmllcyA9IHNlcmllcy5tYXAocHRzID0+IHNwbGl0UGxvdFNlZ21lbnRzKHB0cywgdG9wLCBwaCwgc3gsIHN5KSk7XG5cbiAgLy8gNS4g5Y2Y5LiA6Zai5pWw44Gu44Go44GN44Gv5puy57ea44Go5Z+65rqW57ea44Gu6ZaT44Gr5reh44GE44Kw44Op44OH44O844K344On44Oz5aGX44KK44KS5pa944GZXG4gIGlmIChzZWdtZW50c0J5U2VyaWVzLmxlbmd0aCA9PT0gMSkge1xuICAgIGNvbnN0IGMxID0gcGFsZXR0ZVswXTtcbiAgICBjb25zdCBmaWxsR3JhZCA9IGN0eC5jcmVhdGVMaW5lYXJHcmFkaWVudCgwLCB0b3AsIDAsIHRvcCArIHBoKTtcbiAgICBmaWxsR3JhZC5hZGRDb2xvclN0b3AoMCwgaGV4VG9SZ2JhKGMxLCBpc0RhcmsgPyAwLjI0IDogMC4xOCkpO1xuICAgIGZpbGxHcmFkLmFkZENvbG9yU3RvcCgxLCBoZXhUb1JnYmEoYzEsIDAuMDIpKTtcbiAgICBjdHguZmlsbFN0eWxlID0gZmlsbEdyYWQ7XG4gICAgc2VnbWVudHNCeVNlcmllc1swXS5mb3JFYWNoKHNlZyA9PiB7XG4gICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICBjdHgubW92ZVRvKHNlZ1swXVswXSwgYmFzZVB5KTtcbiAgICAgIHNlZy5mb3JFYWNoKChbcHgsIHB5XSkgPT4gY3R4LmxpbmVUbyhweCwgcHkpKTtcbiAgICAgIGN0eC5saW5lVG8oc2VnW3NlZy5sZW5ndGggLSAxXVswXSwgYmFzZVB5KTtcbiAgICAgIGN0eC5jbG9zZVBhdGgoKTtcbiAgICAgIGN0eC5maWxsKCk7XG4gICAgfSk7XG4gIH1cblxuICAvLyA2LiDmm7Lnt5rmnKzkvZPjga7mj4/nlLvvvIjlhYnlvanvvIvjgqLjg7Pjg4HjgqjjgqTjg6rjgqLjgrnmm7Lnt5rvvIlcbiAgc2VnbWVudHNCeVNlcmllcy5mb3JFYWNoKChzZWdtZW50cywgaWR4KSA9PiB7XG4gICAgY29uc3QgY29sb3IgPSBwYWxldHRlW2lkeCAlIHBhbGV0dGUubGVuZ3RoXTtcbiAgICBjdHguc2F2ZSgpO1xuICAgIGN0eC5zdHJva2VTdHlsZSA9IGNvbG9yO1xuICAgIGN0eC5saW5lV2lkdGggPSBpc0Rpc3BsYXkgPyAyLjI1IDogMS43NTtcbiAgICBjdHgubGluZUNhcCA9ICdyb3VuZCc7XG4gICAgY3R4LmxpbmVKb2luID0gJ3JvdW5kJztcbiAgICBjdHguc2hhZG93Q29sb3IgPSBoZXhUb1JnYmEoY29sb3IsIGlzRGFyayA/IDAuNTUgOiAwLjMpO1xuICAgIGN0eC5zaGFkb3dCbHVyID0gaXNEaXNwbGF5ID8gNiA6IDM7XG4gICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgIHNlZ21lbnRzLmZvckVhY2goc2VnID0+IHtcbiAgICAgIGN0eC5tb3ZlVG8oc2VnWzBdWzBdLCBzZWdbMF1bMV0pO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBzZWcubGVuZ3RoOyBpKyspIGN0eC5saW5lVG8oc2VnW2ldWzBdLCBzZWdbaV1bMV0pO1xuICAgIH0pO1xuICAgIGN0eC5zdHJva2UoKTtcbiAgICBjdHgucmVzdG9yZSgpO1xuICB9KTtcblxuICAvLyDopIfmlbDplqLmlbDjga7jgajjgY3jga/jg5fjg63jg4Pjg4jpoJjln5/jga7lj7PkuIrjgavoibLjgrnjgqbjgqnjg4Pjg4Hjg5Djg7zjgpLmt7vjgYjjgotcbiAgaWYgKGlzRGlzcGxheSAmJiBzcGVjLmZucy5sZW5ndGggPiAxKSB7XG4gICAgY29uc3Qgc3dXID0gMTQ7XG4gICAgY29uc3Qgc3dHYXAgPSA1O1xuICAgIGNvbnN0IHRvdGFsVyA9IHNwZWMuZm5zLmxlbmd0aCAqIHN3VyArIChzcGVjLmZucy5sZW5ndGggLSAxKSAqIHN3R2FwO1xuICAgIGxldCBzd1ggPSBsZWZ0ICsgcHcgLSB0b3RhbFcgLSA4O1xuICAgIGNvbnN0IHN3WSA9IHRvcCArIDg7XG4gICAgc3BlYy5mbnMuZm9yRWFjaCgoXywgaWR4KSA9PiB7XG4gICAgICBjdHguZmlsbFN0eWxlID0gcGFsZXR0ZVtpZHggJSBwYWxldHRlLmxlbmd0aF07XG4gICAgICBjdHguZmlsbFJlY3Qoc3dYLCBzd1ksIHN3VywgMy41KTtcbiAgICAgIHN3WCArPSBzd1cgKyBzd0dhcDtcbiAgICB9KTtcbiAgfVxuXG4gIGN0eC5yZXN0b3JlKCk7XG5cbiAgLy8gNy4g44OX44Ot44OD44OI6aCY5Z+f44Gu5p6g57eaXG4gIGN0eC5zdHJva2VTdHlsZSA9IGlzRGFyayA/ICdyZ2JhKDE0OCwgMTYzLCAxODQsIDAuMjgpJyA6ICdyZ2JhKDE0OCwgMTYzLCAxODQsIDAuMzgpJztcbiAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gIGN0eC5zdHJva2VSZWN0KGxlZnQsIHRvcCwgcHcsIHBoKTtcblxuICAvLyA4LiDluqfmqJnou7jjga7nm67nm5vjgorjg6njg5njg6tcbiAgY3R4LmZpbGxTdHlsZSA9IGlzRGFyayA/ICcjOTRBM0I4JyA6ICcjNjQ3NDhCJztcbiAgY3R4LmZvbnQgPSBpc0Rpc3BsYXkgPyAnNTAwIDEwcHggXCJKZXRCcmFpbnMgTW9ub1wiLCBtb25vc3BhY2UnIDogJzUwMCA4LjVweCBcIkpldEJyYWlucyBNb25vXCIsIG1vbm9zcGFjZSc7XG4gIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgY3R4LnRleHRCYXNlbGluZSA9ICd0b3AnO1xuICBjb25zdCB4TGFiZWxUaWNrcyA9IGlzRGlzcGxheSB8fCB4VGlja3MubGVuZ3RoIDw9IDMgPyB4VGlja3MgOiBbeFRpY2tzWzBdLCB4VGlja3NbTWF0aC5mbG9vcih4VGlja3MubGVuZ3RoIC8gMildLCB4VGlja3NbeFRpY2tzLmxlbmd0aCAtIDFdXTtcbiAgeExhYmVsVGlja3MuZm9yRWFjaCh0ID0+IHtcbiAgICBjb25zdCBweCA9IHN4KHQudik7XG4gICAgaWYgKHB4ID49IGxlZnQgLSAyICYmIHB4IDw9IGxlZnQgKyBwdyArIDIpIHtcbiAgICAgIGN0eC5maWxsVGV4dCh0LmxhYmVsLCBweCwgdG9wICsgcGggKyAoaXNEaXNwbGF5ID8gNiA6IDMpKTtcbiAgICB9XG4gIH0pO1xuXG4gIGN0eC50ZXh0QWxpZ24gPSAncmlnaHQnO1xuICBjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XG4gIGNvbnN0IHlMYWJlbFRpY2tzID0gaXNEaXNwbGF5IHx8IHlUaWNrcy5sZW5ndGggPD0gMyA/IHlUaWNrcyA6IFt5VGlja3NbMF0sIHlUaWNrc1t5VGlja3MubGVuZ3RoIC0gMV1dO1xuICB5TGFiZWxUaWNrcy5mb3JFYWNoKHQgPT4ge1xuICAgIGNvbnN0IHB5ID0gc3kodC52KTtcbiAgICBpZiAocHkgPj0gdG9wICsgNCAmJiBweSA8PSB0b3AgKyBwaCAtIDQpIHtcbiAgICAgIGN0eC5maWxsVGV4dCh0LmxhYmVsLCBsZWZ0IC0gKGlzRGlzcGxheSA/IDYgOiA0KSwgcHkpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIGNhbnZhcy50b0RhdGFVUkwoJ2ltYWdlL3BuZycpO1xufVxuXG4vLyDjg5fjg63jg4Pjg4jku5Xmp5jjga7jgq3jg6Pjg4Pjgrfjg6VcbmNvbnN0IG1hdGhTcGVjQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgVGV4UGxvdFNwZWMgfCBudWxsPigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGV4UGxvdFNwZWModGV4OiBzdHJpbmcpOiBUZXhQbG90U3BlYyB8IG51bGwge1xuICBpZiAoIW1hdGhTcGVjQ2FjaGUuaGFzKHRleCkpIHtcbiAgICBtYXRoU3BlY0NhY2hlLnNldCh0ZXgsIHBhcnNlVGV4UGxvdFNwZWModGV4KSk7XG4gIH1cbiAgcmV0dXJuIG1hdGhTcGVjQ2FjaGUuZ2V0KHRleCkgPz8gbnVsbDtcbn1cblxuLy8g44OX44Ot44OD44OI55S75YOPIERhdGFVUkwg44Gu44Kt44Oj44OD44K344OlXG5jb25zdCBtYXRoUGxvdENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldENhY2hlZE1hdGhQbG90RGF0YVVybChcbiAgcGxvdFNwZWM6IFRleFBsb3RTcGVjLFxuICBpc0Rpc3BsYXk6IGJvb2xlYW4sXG4gIHN0eWxlOiBzdHJpbmcsXG4gIGFwcGVhcmFuY2U6IHN0cmluZyxcbiAgdGV4OiBzdHJpbmdcbik6IHN0cmluZyB7XG4gIGNvbnN0IHBsb3RLZXkgPSBgJHtpc0Rpc3BsYXkgPyAnRCcgOiAnSSd9OiR7c3R5bGV9OiR7YXBwZWFyYW5jZX06JHt0ZXh9YDtcbiAgaWYgKCFtYXRoUGxvdENhY2hlLmhhcyhwbG90S2V5KSkge1xuICAgIG1hdGhQbG90Q2FjaGUuc2V0KHBsb3RLZXksIHJlbmRlck1hdGhQbG90VG9EYXRhVXJsKHBsb3RTcGVjLCBpc0Rpc3BsYXksIHN0eWxlLCBhcHBlYXJhbmNlKSk7XG4gIH1cbiAgcmV0dXJuIG1hdGhQbG90Q2FjaGUuZ2V0KHBsb3RLZXkpITtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTWF0aFBsb3RDYWNoZSgpOiB2b2lkIHtcbiAgbWF0aFNwZWNDYWNoZS5jbGVhcigpO1xuICBtYXRoUGxvdENhY2hlLmNsZWFyKCk7XG59XG5cbiIsICJpbXBvcnQgeyBlc2NhcGVIdG1sIH0gZnJvbSAnLi91dGlscy9lc2NhcGUnO1xuaW1wb3J0IHsgaGV4VG9SZ2JhIH0gZnJvbSAnLi91dGlscy9jb2xvcic7XG5pbXBvcnQgeyB0cmVlVG9rZW5Gb3IgfSBmcm9tICcuL21hcmtkb3duL3RyZWUnO1xuaW1wb3J0IHsgTUFUSF9QTE9UX0JPWCwgZ2V0VGV4UGxvdFNwZWMsIGdldENhY2hlZE1hdGhQbG90RGF0YVVybCwgY2xlYXJNYXRoUGxvdENhY2hlIH0gZnJvbSAnLi9tYXRoL3Bsb3QnO1xuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44Ki44OX44Oq44Kx44O844K344On44Oz44O744Kz44Ki44Ko44Oz44K444OzXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuZnVuY3Rpb24gZm52MWFIYXNoKHN0cikge1xuICBsZXQgaGFzaCA9IDIxNjYxMzYyNjE7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgaGFzaCBePSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICBoYXNoID0gTWF0aC5pbXVsKGhhc2gsIDE2Nzc3NjE5KTtcbiAgfVxuICByZXR1cm4gKGhhc2ggPj4+IDApLnRvU3RyaW5nKDE2KTtcbn1cblxuZnVuY3Rpb24gc2hvd1RvYXN0KG1zZykge1xuICBjb25zdCB0b2FzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2FzdCcpO1xuICBjb25zdCBsYWJlbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0b2FzdC1tZXNzYWdlJyk7XG4gIGlmICghdG9hc3QgfHwgIWxhYmVsKSByZXR1cm47XG4gIGxhYmVsLnRleHRDb250ZW50ID0gbXNnO1xuICB0b2FzdC5jbGFzc0xpc3QucmVtb3ZlKCdvcGFjaXR5LTAnLCAndHJhbnNsYXRlLXktMicpO1xuICB0b2FzdC5jbGFzc0xpc3QuYWRkKCdvcGFjaXR5LTEwMCcsICd0cmFuc2xhdGUteS0wJyk7XG4gIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHRvYXN0LmNsYXNzTGlzdC5yZW1vdmUoJ29wYWNpdHktMTAwJywgJ3RyYW5zbGF0ZS15LTAnKTtcbiAgICB0b2FzdC5jbGFzc0xpc3QuYWRkKCdvcGFjaXR5LTAnLCAndHJhbnNsYXRlLXktMicpO1xuICB9LCAyMDAwKTtcbn1cblxuZnVuY3Rpb24gdXBkYXRlU3RhdHVzKHRleHQsIHR5cGUgPSAnaW5mbycpIHtcbiAgY29uc3QgcGlsbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd0ZWxlbWV0cnktcGlsbCcpO1xuICBjb25zdCBkb3QgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVsZW1ldHJ5LWRvdCcpO1xuICBjb25zdCBzdGF0dXMgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndGVsZW1ldHJ5LXN0YXR1cycpO1xuICBpZiAoIXBpbGwgfHwgIWRvdCB8fCAhc3RhdHVzKSByZXR1cm47XG4gIHN0YXR1cy50ZXh0Q29udGVudCA9IHRleHQ7XG4gIHBpbGwuY2xhc3NOYW1lID0gJ2ZsZXggaXRlbXMtY2VudGVyIGdhcC0xLjUgcHgtMyBweS0xIHJvdW5kZWQtZnVsbCBib3JkZXIgdGV4dC1bMTFweF0gZm9udC1tb25vIHNoYWRvdy1tZCBiYWNrZHJvcC1ibHVyLW1kIHRyYW5zaXRpb24tYWxsJztcbiAgaWYgKHR5cGUgPT09ICdzdWNjZXNzJykge1xuICAgIHBpbGwuY2xhc3NMaXN0LmFkZCgnYmctZW1lcmFsZC01MDAvMTAnLCAndGV4dC1lbWVyYWxkLTYwMCcsICdib3JkZXItZW1lcmFsZC01MDAvMjUnKTtcbiAgICBkb3QuY2xhc3NOYW1lID0gJ3ctMS41IGgtMS41IHJvdW5kZWQtZnVsbCBiZy1lbWVyYWxkLTUwMCc7XG4gIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3dhcm5pbmcnKSB7XG4gICAgcGlsbC5jbGFzc0xpc3QuYWRkKCdiZy1hbWJlci01MDAvMTAnLCAndGV4dC1hbWJlci02MDAnLCAnYm9yZGVyLWFtYmVyLTUwMC8yNScpO1xuICAgIGRvdC5jbGFzc05hbWUgPSAndy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLWFtYmVyLTUwMCc7XG4gIH0gZWxzZSB7XG4gICAgcGlsbC5jbGFzc0xpc3QuYWRkKCdiZy1ibHVlLTUwMC8xMCcsICd0ZXh0LWJsdWUtNjAwJywgJ2JvcmRlci1ibHVlLTUwMC8yNScpO1xuICAgIGRvdC5jbGFzc05hbWUgPSAndy0xLjUgaC0xLjUgcm91bmRlZC1mdWxsIGJnLWJsdWUtNTAwJztcbiAgfVxufVxuXG5mdW5jdGlvbiBkb3dubG9hZEJsb2IoY29udGVudCwgZmlsZW5hbWUsIG1pbWVUeXBlKSB7XG4gIGNvbnN0IGJsb2IgPSBuZXcgQmxvYihbY29udGVudF0sIHsgdHlwZTogbWltZVR5cGUgfSk7XG4gIGNvbnN0IHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gIGNvbnN0IGEgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdhJyk7XG4gIGEuaHJlZiA9IHVybDtcbiAgYS5kb3dubG9hZCA9IGZpbGVuYW1lO1xuICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKGEpO1xuICBhLmNsaWNrKCk7XG4gIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoYSk7XG4gIHNldFRpbWVvdXQoKCkgPT4gVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpLCAxMDAwKTtcbn1cblxuLy8g44Oi44O844OA44Or6KaB57Sg77yII3NldHRpbmdzLW1vZGFsLCAjem9vbS1tb2RhbCwgI3Nob3J0Y3V0LW1vZGFs77yJ44Gu6ZaL6ZaJ54q25oWL44KS57Wx5LiA55qE44Gr5omx44GG5YWx6YCa44OY44Or44OR44O8XG5mdW5jdGlvbiByZXNvbHZlTW9kYWwoaWRPckVsKSB7XG4gIHJldHVybiB0eXBlb2YgaWRPckVsID09PSAnc3RyaW5nJyA/IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGlkT3JFbCkgOiBpZE9yRWw7XG59XG5cbmZ1bmN0aW9uIGlzTW9kYWxPcGVuKGlkT3JFbCkge1xuICBjb25zdCBtb2RhbCA9IHJlc29sdmVNb2RhbChpZE9yRWwpO1xuICByZXR1cm4gQm9vbGVhbihtb2RhbCAmJiAhbW9kYWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdoaWRkZW4nKSk7XG59XG5cbmZ1bmN0aW9uIHNldE1vZGFsT3BlbihpZE9yRWwsIG9wZW4pIHtcbiAgY29uc3QgbW9kYWwgPSByZXNvbHZlTW9kYWwoaWRPckVsKTtcbiAgaWYgKCFtb2RhbCkgcmV0dXJuO1xuICBtb2RhbC5jbGFzc0xpc3QudG9nZ2xlKCdoaWRkZW4nLCAhb3Blbik7XG4gIG1vZGFsLmNsYXNzTGlzdC50b2dnbGUoJ2ZsZXgnLCBCb29sZWFuKG9wZW4pKTtcbn1cblxuY29uc3QgVEhFTUVTID0ge1xuICBsaWdodDoge1xuICAgIGNvYmFsdDoge1xuICAgICAgbmFtZTogJ0NvYmFsdCcsXG4gICAgICBjYW52YXNCZzogJyNGRkZGRkYnLFxuICAgICAgY2x1c3RlckJnOiAnI0Y4RkFGQycsXG4gICAgICBjbHVzdGVyQm9yZGVyOiAnIzk0QTNCOCcsXG4gICAgICBub2RlQmc6ICcjRkZGRkZGJyxcbiAgICAgIG5vZGVTdHJva2U6ICcjMjU2M0VCJyxcbiAgICAgIG5vZGVUZXh0OiAnIzBGMTcyQScsXG4gICAgICBlZGdlU3Ryb2tlOiAnIzQ3NTU2OScsXG4gICAgICBlZGdlTGFiZWxCZzogJyNGRkZGRkYnLFxuICAgICAgZWRnZUxhYmVsQm9yZGVyOiAnI0NCRDVFMScsXG4gICAgICBlZGdlTGFiZWxUZXh0OiAnIzFFM0E4QSdcbiAgICB9LFxuICAgIGVtZXJhbGQ6IHtcbiAgICAgIG5hbWU6ICdFbWVyYWxkJyxcbiAgICAgIGNhbnZhc0JnOiAnI0ZGRkZGRicsXG4gICAgICBjbHVzdGVyQmc6ICcjRjhGQUZDJyxcbiAgICAgIGNsdXN0ZXJCb3JkZXI6ICcjOTRBM0I4JyxcbiAgICAgIG5vZGVCZzogJyNGRkZGRkYnLFxuICAgICAgbm9kZVN0cm9rZTogJyMwNTk2NjknLFxuICAgICAgbm9kZVRleHQ6ICcjMEYxNzJBJyxcbiAgICAgIGVkZ2VTdHJva2U6ICcjNDc1NTY5JyxcbiAgICAgIGVkZ2VMYWJlbEJnOiAnI0ZGRkZGRicsXG4gICAgICBlZGdlTGFiZWxCb3JkZXI6ICcjQ0JENUUxJyxcbiAgICAgIGVkZ2VMYWJlbFRleHQ6ICcjMDY0RTNCJ1xuICAgIH0sXG4gICAgYW1iZXI6IHtcbiAgICAgIG5hbWU6ICdBbWJlcicsXG4gICAgICBjYW52YXNCZzogJyNGRkZGRkYnLFxuICAgICAgY2x1c3RlckJnOiAnI0Y4RkFGQycsXG4gICAgICBjbHVzdGVyQm9yZGVyOiAnIzk0QTNCOCcsXG4gICAgICBub2RlQmc6ICcjRkZGRkZGJyxcbiAgICAgIG5vZGVTdHJva2U6ICcjRDk3NzA2JyxcbiAgICAgIG5vZGVUZXh0OiAnIzBGMTcyQScsXG4gICAgICBlZGdlU3Ryb2tlOiAnIzU3NTM0RScsXG4gICAgICBlZGdlTGFiZWxCZzogJyNGRkZGRkYnLFxuICAgICAgZWRnZUxhYmVsQm9yZGVyOiAnI0NCRDVFMScsXG4gICAgICBlZGdlTGFiZWxUZXh0OiAnIzc4MzUwRidcbiAgICB9LFxuICAgIHNsYXRlOiB7XG4gICAgICBuYW1lOiAnUm95YWwnLFxuICAgICAgY2FudmFzQmc6ICcjRkZGRkZGJyxcbiAgICAgIGNsdXN0ZXJCZzogJyNGOEZBRkMnLFxuICAgICAgY2x1c3RlckJvcmRlcjogJyM5NEEzQjgnLFxuICAgICAgbm9kZUJnOiAnI0ZGRkZGRicsXG4gICAgICBub2RlU3Ryb2tlOiAnIzdDM0FFRCcsXG4gICAgICBub2RlVGV4dDogJyMwRjE3MkEnLFxuICAgICAgZWRnZVN0cm9rZTogJyM0NzU1NjknLFxuICAgICAgZWRnZUxhYmVsQmc6ICcjRkZGRkZGJyxcbiAgICAgIGVkZ2VMYWJlbEJvcmRlcjogJyNDQkQ1RTEnLFxuICAgICAgZWRnZUxhYmVsVGV4dDogJyM0QzFEOTUnXG4gICAgfVxuICB9LFxuICBkYXJrOiB7XG4gICAgY29iYWx0OiB7XG4gICAgICBuYW1lOiAnQ29iYWx0JyxcbiAgICAgIGNhbnZhc0JnOiAnIzBGMTcyQScsXG4gICAgICBjbHVzdGVyQmc6ICcjMEIxMTIwJyxcbiAgICAgIGNsdXN0ZXJCb3JkZXI6ICcjMzM0MTU1JyxcbiAgICAgIG5vZGVCZzogJyMxRTI5M0InLFxuICAgICAgbm9kZVN0cm9rZTogJyMzOEJERjgnLFxuICAgICAgbm9kZVRleHQ6ICcjRjhGQUZDJyxcbiAgICAgIGVkZ2VTdHJva2U6ICcjOTRBM0I4JyxcbiAgICAgIGVkZ2VMYWJlbEJnOiAnIzFFMjkzQicsXG4gICAgICBlZGdlTGFiZWxCb3JkZXI6ICcjNDc1NTY5JyxcbiAgICAgIGVkZ2VMYWJlbFRleHQ6ICcjRTBGMkZFJ1xuICAgIH0sXG4gICAgZW1lcmFsZDoge1xuICAgICAgbmFtZTogJ0VtZXJhbGQnLFxuICAgICAgY2FudmFzQmc6ICcjMDYxMjBFJyxcbiAgICAgIGNsdXN0ZXJCZzogJyMwOTE5MTQnLFxuICAgICAgY2x1c3RlckJvcmRlcjogJyMxRTQ2MzgnLFxuICAgICAgbm9kZUJnOiAnIzBGMjkyMCcsXG4gICAgICBub2RlU3Ryb2tlOiAnIzM0RDM5OScsXG4gICAgICBub2RlVGV4dDogJyNGOEZBRkMnLFxuICAgICAgZWRnZVN0cm9rZTogJyM2RUU3QjcnLFxuICAgICAgZWRnZUxhYmVsQmc6ICcjMEYyOTIwJyxcbiAgICAgIGVkZ2VMYWJlbEJvcmRlcjogJyMxRTQ2MzgnLFxuICAgICAgZWRnZUxhYmVsVGV4dDogJyNEMUZBRTUnXG4gICAgfSxcbiAgICBhbWJlcjoge1xuICAgICAgbmFtZTogJ0FtYmVyJyxcbiAgICAgIGNhbnZhc0JnOiAnIzEyMEUwNycsXG4gICAgICBjbHVzdGVyQmc6ICcjMUMxNTBCJyxcbiAgICAgIGNsdXN0ZXJCb3JkZXI6ICcjNDUyQTBCJyxcbiAgICAgIG5vZGVCZzogJyMyOTFEMEUnLFxuICAgICAgbm9kZVN0cm9rZTogJyNGQkJGMjQnLFxuICAgICAgbm9kZVRleHQ6ICcjRjhGQUZDJyxcbiAgICAgIGVkZ2VTdHJva2U6ICcjRkNEMzREJyxcbiAgICAgIGVkZ2VMYWJlbEJnOiAnIzI5MUQwRScsXG4gICAgICBlZGdlTGFiZWxCb3JkZXI6ICcjNDUyQTBCJyxcbiAgICAgIGVkZ2VMYWJlbFRleHQ6ICcjRkVGM0M3J1xuICAgIH0sXG4gICAgc2xhdGU6IHtcbiAgICAgIG5hbWU6ICdSb3lhbCcsXG4gICAgICBjYW52YXNCZzogJyMwRDA5MTcnLFxuICAgICAgY2x1c3RlckJnOiAnIzE1MEYyNicsXG4gICAgICBjbHVzdGVyQm9yZGVyOiAnIzNCMjM2NicsXG4gICAgICBub2RlQmc6ICcjMjExNzNCJyxcbiAgICAgIG5vZGVTdHJva2U6ICcjQzA4NEZDJyxcbiAgICAgIG5vZGVUZXh0OiAnI0Y4RkFGQycsXG4gICAgICBlZGdlU3Ryb2tlOiAnI0Q4QjRGRScsXG4gICAgICBlZGdlTGFiZWxCZzogJyMyMTE3M0InLFxuICAgICAgZWRnZUxhYmVsQm9yZGVyOiAnIzNCMjM2NicsXG4gICAgICBlZGdlTGFiZWxUZXh0OiAnI0YzRThGRidcbiAgICB9XG4gIH1cbn07XG5cbi8vIFZpc3VhbCBTdGFnZSDjga7jgqvjg7zjg4nog4zmma/jga/jganjga7jgrnjgr/jgqTjg6vjgoLmmI7jgovjgYToibLjga7jgZ/jgoHjgIFMaWdodCAvIERhcmsg44Gr44KI44KJ44Ga44GT44Gu6YWN6Imy44Gn5o+P55S744GZ44KLXG5jb25zdCBWSVNVQUxfVEhFTUVTID0ge1xuICBzaGFwZXM6IHtcbiAgICBjbHVzdGVyQmc6ICcjRjVGQkZBJyxcbiAgICBjbHVzdGVyQm9yZGVyOiAnIzk0QTNCOCcsXG4gICAgbm9kZUJnOiAnI0ZCRTNCMCcsXG4gICAgbm9kZVN0cm9rZTogJyNEOTkwMkEnLFxuICAgIG5vZGVUZXh0OiAnIzFFMjkzQicsXG4gICAgZWRnZVN0cm9rZTogJyM0NzU1NjknLFxuICAgIGVkZ2VMYWJlbEJnOiAnI0ZGRkZGRicsXG4gICAgZWRnZUxhYmVsQm9yZGVyOiAnI0NCRDVFMScsXG4gICAgZWRnZUxhYmVsVGV4dDogJyMxRTI5M0InLFxuICAgIHNlY29uZGFyeTogJyNDOUYxRjYnLFxuICAgIHRlcnRpYXJ5OiAnI0Y4RDlEMycsXG4gICAgbGlmZWxpbmU6ICcjNDc1NTY5JyxcbiAgICBhY3RpdmF0aW9uQmc6ICcjQzlGMUY2JyxcbiAgICBhY3RpdmF0aW9uQm9yZGVyOiAnIzBFNzQ5MCdcbiAgfSxcbiAgY2FyZHM6IHtcbiAgICBjbHVzdGVyQmc6ICcjRkZGRkZGJyxcbiAgICBjbHVzdGVyQm9yZGVyOiAnI0NCRDVFMScsXG4gICAgbm9kZUJnOiAnI0ZGRkZGRicsXG4gICAgbm9kZVN0cm9rZTogJyNFMjk1NzgnLFxuICAgIG5vZGVUZXh0OiAnIzBGMTcyQScsXG4gICAgZWRnZVN0cm9rZTogJyM2NDc0OEInLFxuICAgIGVkZ2VMYWJlbEJnOiAnI0ZGRkZGRicsXG4gICAgZWRnZUxhYmVsQm9yZGVyOiAnI0UyRThGMCcsXG4gICAgZWRnZUxhYmVsVGV4dDogJyMwRjE3MkEnLFxuICAgIHNlY29uZGFyeTogJyNEQ0UzRjYnLFxuICAgIHRlcnRpYXJ5OiAnI0QzRUJFQycsXG4gICAgbGlmZWxpbmU6ICcjN0M4QkExJyxcbiAgICBhY3RpdmF0aW9uQmc6ICcjRkJFN0I1JyxcbiAgICBhY3RpdmF0aW9uQm9yZGVyOiAnI0M5OEExMidcbiAgfSxcbiAgY2lyY2xlczoge1xuICAgIGNsdXN0ZXJCZzogJyNGOEZBRkMnLFxuICAgIGNsdXN0ZXJCb3JkZXI6ICcjN0VBNkJGJyxcbiAgICBub2RlQmc6ICcjRDdFNkVGJyxcbiAgICBub2RlU3Ryb2tlOiAnIzdFQTZCRicsXG4gICAgbm9kZVRleHQ6ICcjMkIyRDQyJyxcbiAgICBlZGdlU3Ryb2tlOiAnIzNENDY0RCcsXG4gICAgZWRnZUxhYmVsQmc6ICcjRkZGRkZGJyxcbiAgICBlZGdlTGFiZWxCb3JkZXI6ICcjN0VBNkJGJyxcbiAgICBlZGdlTGFiZWxUZXh0OiAnIzJCMkQ0MicsXG4gICAgc2Vjb25kYXJ5OiAnI0YzQ0ZDQicsXG4gICAgdGVydGlhcnk6ICcjRjZFM0M4JyxcbiAgICBsaWZlbGluZTogJyM2RDU5N0EnLFxuICAgIGFjdGl2YXRpb25CZzogJyNGM0NGQ0InLFxuICAgIGFjdGl2YXRpb25Cb3JkZXI6ICcjRDQ1RDUzJ1xuICB9LFxuICBlZGl0b3JpYWw6IHtcbiAgICBjbHVzdGVyQmc6ICcjRkZGREY3JyxcbiAgICBjbHVzdGVyQm9yZGVyOiAnI0M5QkZBNScsXG4gICAgbm9kZUJnOiAnI0ZGRkZGRicsXG4gICAgbm9kZVN0cm9rZTogJyNENjhDOEMnLFxuICAgIG5vZGVUZXh0OiAnIzJCMkQ0MicsXG4gICAgZWRnZVN0cm9rZTogJyM2RjhBNTUnLFxuICAgIGVkZ2VMYWJlbEJnOiAnI0ZGRkZGRicsXG4gICAgZWRnZUxhYmVsQm9yZGVyOiAnI0M5QkZBNScsXG4gICAgZWRnZUxhYmVsVGV4dDogJyMyQjJENDInLFxuICAgIHNlY29uZGFyeTogJyNFNEVDRDknLFxuICAgIHRlcnRpYXJ5OiAnI0YzRTFFMScsXG4gICAgbGlmZWxpbmU6ICcjOEZBODc2JyxcbiAgICBhY3RpdmF0aW9uQmc6ICcjRTRFQ0Q5JyxcbiAgICBhY3RpdmF0aW9uQm9yZGVyOiAnIzZGOEE1NSdcbiAgfVxufTtcblxuLy8gVmlzdWFsIFN0YWdlIOOBruODjuODvOODieijhemjvu+8iGcubm9kZSDjga7lvaLjg7vloZfjgorjga7nva7jgY3mj5vjgYjvvInjgpLpgannlKjjgZnjgovlm7PnqK7jgIJcbi8vIOS7luOBruWbs+eoruOBriBnLm5vZGXvvIjjgq/jg6njgrnlm7Pjga7jgq/jg6njgrnjgarjganvvInjgavpgannlKjjgZnjgovjgajlm7Pjga7mp4vpgKDjgYzltKnjgozjgovjgZ/jgoHjgIHpmZDlrprjgZnjgovvvIhGUi0wMDjvvIlcbi8vIERhcmsg44GuIFZpc3VhbCBTdGFnZSDjga7phY3oibLvvIhERC1ESUFHLTAyNO+8ieOAguOCq+ODvOODieiDjOaZr+OBjOaal+OBj+OBquOCi+OBn+OCgeOAgeiDjOaZr+OBruS4iuOBq+ebtOaOpeaPj+OBj+e3muODu+aWh+Wtl+OCkuaYjuOCi+OBj+OBmeOCi+OAglxuLy8g6KOF6aO+44GX44Gf44OO44O844OJ44Gu5aGX44KK77yI6Imy5LuY44GN44Gu5Zuz5b2i44O755m944GE44Kr44O844OJ77yJ44Go44CB44Gd44Gu5LiK44Gu5paH5a2X44Gu6Imy44Gv6KOF6aO+44Gu5Yem55CG44GM5rG644KB44KL44Gf44KB44CB44GT44GT44Gn44Gv5aSJ44KP44KJ44Gq44GEXG5jb25zdCBWSVNVQUxfREFSS19CQVNFID0ge1xuICBjbHVzdGVyQmc6ICcjMUIyNDMzJyxcbiAgY2x1c3RlckJvcmRlcjogJyM2NDc0OEInLFxuICBub2RlQmc6ICcjMUUyOTNCJyxcbiAgbm9kZVRleHQ6ICcjRjFGNUY5JyxcbiAgZWRnZVN0cm9rZTogJyNDQkQ1RTEnLFxuICBlZGdlTGFiZWxCZzogJyMxRTI5M0InLFxuICBlZGdlTGFiZWxCb3JkZXI6ICcjNDc1NTY5JyxcbiAgZWRnZUxhYmVsVGV4dDogJyNGMUY1RjknLFxuICBsaWZlbGluZTogJyM5NEEzQjgnLFxuICBjYW52YXNCZzogJyMxMTE4MjcnXG59O1xuY29uc3QgVklTVUFMX0RBUktfQUNDRU5UUyA9IHtcbiAgc2hhcGVzOiB7IGNsdXN0ZXJCZzogJyMxNjMwMkYnLCBzZWNvbmRhcnk6ICcjMTU1RTc1JywgdGVydGlhcnk6ICcjN0MzQTJFJywgYWN0aXZhdGlvbkJnOiAnIzE2NEU2MycgfSxcbiAgY2FyZHM6IHsgc2Vjb25kYXJ5OiAnIzNCNEE3NScsIHRlcnRpYXJ5OiAnIzFGNTI1NCcsIGFjdGl2YXRpb25CZzogJyM0QTNBMUEnIH0sXG4gIGNpcmNsZXM6IHsgc2Vjb25kYXJ5OiAnIzJGNTI2NicsIHRlcnRpYXJ5OiAnIzZCMkUyQScsIGFjdGl2YXRpb25CZzogJyM1QTJCMjcnIH0sXG4gIGVkaXRvcmlhbDogeyBjbHVzdGVyQmc6ICcjMkEyNTFDJywgc2Vjb25kYXJ5OiAnIzNGNEQzMycsIHRlcnRpYXJ5OiAnIzVBMzUzNScsIGFjdGl2YXRpb25CZzogJyMzRjREMzMnIH1cbn07XG5jb25zdCBWSVNVQUxfVEhFTUVTX0RBUksgPSBPYmplY3QuZnJvbUVudHJpZXMoT2JqZWN0LmVudHJpZXMoVklTVUFMX1RIRU1FUykubWFwKChbc3R5bGUsIHNwZWNdKSA9PlxuICBbc3R5bGUsIHsgLi4uc3BlYywgLi4uVklTVUFMX0RBUktfQkFTRSwgLi4uVklTVUFMX0RBUktfQUNDRU5UU1tzdHlsZV0gfV0pKTtcbmNvbnN0IFZJU1VBTF9TVFlMRV9LRVlTID0gT2JqZWN0LmtleXMoVklTVUFMX1RIRU1FUyk7XG5cbmNvbnN0IE5PREVfREVDT1JBVEVEX1RZUEVTID0gWydmbG93Y2hhcnQtdjInLCAnZmxvd2NoYXJ0JywgJ3N0YXRlRGlhZ3JhbSddO1xuXG4vLyDlm7PnqK7jgZTjgajjga7nn6LljbDjga7ml6Llrprjga7lvaLnirbvvIhGUi0wMTLvvInjgILjg5Xjg63jg7zjg4Hjg6Pjg7zjg4jjga/mpa3li5njg5Xjg63jg7zlm7PjgafkuIDoiKznmoTjgarnm7Top5LjgavjgZnjgotcbmNvbnN0IERFRkFVTFRfQ1VSVkVTID0geyBmbG93Y2hhcnQ6ICdzdGVwJywgc3RhdGU6ICdzbW9vdGgnLCBjbGFzczogJ3N0ZXAnIH07XG5jb25zdCBDVVJWRV9MQUJFTFMgPSB7IHNtb290aDogJ+absue3micsIHN0ZXA6ICfnm7Top5InLCBzdHJhaWdodDogJ+ebtOe3micgfTtcblxuLy8gRml0IOihqOekuuOBp+S/neOBpOOAgeWbs+OBruS4reOBruaWh+Wtl+OBruihqOekuuS4iuOBruacgOWwj+OCteOCpOOCuu+8iE5GUi0wMDXvvInjgajjgIHlsI/jgZXjgarlm7Pjga7mi6HlpKfjga7kuIrpmZBcbmNvbnN0IE1JTl9GSVRfRk9OVF9QWCA9IDEwO1xuY29uc3QgTUFYX0ZJVF9TQ0FMRSA9IDEuNTtcblxuLy8g44Oe44Kk44Oz44OJ44Oe44OD44OX44Gq44Gp44Gu5p6d44GU44Go44Gu6Imy77yIY1NjYWxl77yJ44Go5YaG44Kw44Op44OV44Gu6Imy77yIcGll77yJ44CCTWVybWFpZCDjga8gZGFya01vZGUg44Gu44Go44GN5rS+55Sf6Imy44KS5pqX44GP44GX44GZ44GO44CBXG4vLyBEYXJrIOOBruiDjOaZr+OBruS4iuOBp+ODjuODvOODieOBqOaeneOAgeOCueODqeOCpOOCueOBqOWHoeS+i+OBjOm7kuOBj+ayiOOCgOOBruOBp+OAgeaYjuW6puOCkuOBneOCjeOBiOOBn+iJsuOCkuaYjuekuuOBmeOCi++8iERELURJQUctMDI177yJXG5jb25zdCBEQVJLX1NFQ1RJT05fSFVFUyA9IFsyMTUsIDE3MiwgMjYyLCAzMiwgMTQ1LCAzMzAsIDE5NSwgMTIsIDk1LCAyODUsIDUwLCAyNDBdO1xuZnVuY3Rpb24gZGFya1NlY3Rpb25TY2FsZSgpIHtcbiAgY29uc3QgdmFycyA9IHt9O1xuICBEQVJLX1NFQ1RJT05fSFVFUy5mb3JFYWNoKChodWUsIGkpID0+IHtcbiAgICB2YXJzW2BjU2NhbGUke2l9YF0gPSBgaHNsKCR7aHVlfSwgNDUlLCAzOCUpYDtcbiAgICB2YXJzW2BjU2NhbGVQZWVyJHtpfWBdID0gYGhzbCgke2h1ZX0sIDUwJSwgNTglKWA7XG4gICAgdmFyc1tgY1NjYWxlTGFiZWwke2l9YF0gPSAnI0YxRjVGOSc7XG4gICAgdmFyc1tgcGllJHtpICsgMX1gXSA9IGBoc2woJHtodWV9LCA0NSUsIDQyJSlgO1xuICB9KTtcbiAgcmV0dXJuIHZhcnM7XG59XG4vLyBWaWJyYW50IENpcmNsZXMg44Gn44CB55m95paH5a2X44Gn44Gv6Kqt44G/44Gr44GP44GE5piO44KL44GE5aGX44KKXG5jb25zdCBDSVJDTEVfREFSS19URVhUX0ZJTExTID0gWycjRUNCNjc0J107XG4vLyDjgrfjg7zjgrHjg7Pjgrnlm7Pjga7jg6Hjg4Pjgrvjg7zjgrjjga7mlbDlvI/jgpLjgIHjg6Hjg4Pjgrvjg7zjgrjnt5rjgYvjgonpm6LjgZnph4/vvIhTVkcg44Gu5bqn5qiZ5Y2Y5L2N77yJXG5jb25zdCBTRVFVRU5DRV9NQVRIX0xJRlQgPSA2O1xuXG4vLyDlhazplovjg6rjg53jgrjjg4jjg6rvvIjmnIDmlrDniYjjga7phY3luIPlhYPvvInjgILjg5jjg4Pjg4Djg7zjga7jg63jgrTjga7jg6rjg7Pjgq/vvIhpbmRleC5odG1s77yJ44KC5ZCM44GYIFVSTCDjgavjgZnjgovvvIhGUi0wMjTvvIlcbmNvbnN0IFJFUE9TSVRPUllfVVJMID0gJ2h0dHBzOi8vZ2l0aHViLmNvbS9wcmFua3N0ZXItZnJlZWRvbS9MdWNpdm8nO1xuLy8g5paw44GX44GE44K/44OW44Gn6ZaL44GN44CB6ZaL44GE44Gf44Oa44O844K444GL44KJIEx1Y2l2byDjga7nlLvpnaLjgpLmk43kvZzjgZXjgozjgarjgYTjgojjgYbjgavjgZnjgotcbmNvbnN0IFJFUE9TSVRPUllfTElOS19BVFRSUyA9IGBocmVmPVwiJHtSRVBPU0lUT1JZX1VSTH1cIiB0YXJnZXQ9XCJfYmxhbmtcIiByZWw9XCJub29wZW5lciBub3JlZmVycmVyXCJgO1xuXG5jb25zdCBFTVBUWV9HVUlERV9IVE1MID0gYFxuPGRpdiBjbGFzcz1cImVtcHR5LWd1aWRlXCI+XG4gIDxkaXYgY2xhc3M9XCJlbXB0eS1ndWlkZS1sb2dvXCI+XG4gICAgPGEgY2xhc3M9XCJicmFuZC1saW5rXCIgJHtSRVBPU0lUT1JZX0xJTktfQVRUUlN9IHRpdGxlPVwiTHVjaXZvIOOBruWFrOmWi+ODquODneOCuOODiOODqu+8iOacgOaWsOeJiO+8ieOCkumWi+OBj1wiPlxuICAgICAgPGltZyBjbGFzcz1cImJyYW5kLWxvZ28tbGlnaHRcIiBzcmM9XCIuL2Fzc2V0cy9sb2dvcy9saWdodC9sb2dvX2Z1bGwuc3ZnXCIgYWx0PVwiTHVjaXZvIE1hcmtkb3duIFByZXNlbnRlciDigJQgRXhoaWJpdGlvbi1HcmFkZSBNYXJrZG93biBWaWV3ZXIg4oCU77yI5YWs6ZaL44Oq44Od44K444OI44Oq44KS6ZaL44GP77yJXCIgd2lkdGg9XCIyNjRcIiBoZWlnaHQ9XCI3MlwiIC8+XG4gICAgICA8aW1nIGNsYXNzPVwiYnJhbmQtbG9nby1kYXJrXCIgc3JjPVwiLi9hc3NldHMvbG9nb3MvZGFyay9sb2dvX2Z1bGwuc3ZnXCIgYWx0PVwiTHVjaXZvIE1hcmtkb3duIFByZXNlbnRlciDigJQgRXhoaWJpdGlvbi1HcmFkZSBNYXJrZG93biBWaWV3ZXIg4oCU77yI5YWs6ZaL44Oq44Od44K444OI44Oq44KS6ZaL44GP77yJXCIgd2lkdGg9XCIyNjRcIiBoZWlnaHQ9XCI3MlwiIC8+XG4gICAgPC9hPlxuICA8L2Rpdj5cbiAgPGgzIGNsYXNzPVwiZW1wdHktZ3VpZGUtdGl0bGVcIj5NYXJrZG93biDjgpLplovjgYTjgabjgY/jgaDjgZXjgYQ8L2gzPlxuICA8cCBjbGFzcz1cImVtcHR5LWd1aWRlLWRlc2NcIj7jg5jjg4Pjg4Djg7zjga7jgIzplovjgY/jgI3jg6Hjg4vjg6Xjg7zjgYvjgonjgIzjg5XjgqHjgqTjg6vjgpLplovjgY/igKbjgI3jgafjg63jg7zjgqvjg6vjg5XjgqHjgqTjg6vjgpLjgIHjgIzjg5Xjgqnjg6vjg4DjgpLplovjgY/igKbjgI3jgafjg5Xjgqnjg6vjg4Djga4gTWFya2Rvd24g44KS5LiA6Kan44GL44KJ6Kqt44G/6L6844KA44GL44CB5ZCM5qKx44GuIDxjb2RlPlZpc3VhbOODouODvOODieOCteODs+ODl+ODqyAodmlzdWFsLXNhbXBsZS5tZCk8L2NvZGU+IC8gPGNvZGU+6KiY5rOV44K144Oz44OX44OrIChub3RhdGlvbl9zYW1wbGUubWQpPC9jb2RlPiDjgpLjg6/jg7Pjgq/jg6rjg4Pjgq/jgafplovjgZHjgb7jgZnjgILlt6bjga7jgqjjg4fjgqPjgr/jgavnm7TmjqXlhaXlipvjgZnjgovjgZPjgajjgoLjgafjgY3jgb7jgZnjgII8L3A+XG4gIFxuICA8ZGl2IGNsYXNzPVwiZW1wdHktZ3VpZGUtbW9kZXNcIj5cbiAgICA8ZGl2IGNsYXNzPVwiZW1wdHktZ3VpZGUtY2FyZFwiPlxuICAgICAgPGg0PuKaoSDpq5jpgJ/jg6Ljg7zjg4k8L2g0PlxuICAgICAgPHA+5oCd6ICD44KS6YKq6a2U44GX44Gq44GE44Of44Oq56eS5b+c562U44Gu6Lu95b+r44Gq44OX44Os44OT44Ol44O844CC5LuV5qeY5pu444Gu5Z+3562G44KE5qeL6YCg44Gu56K66KqN44Gr5pyA6YGp44Gn44GZ44CCPC9wPlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJlbXB0eS1ndWlkZS1jYXJkXCI+XG4gICAgICA8aDQ+8J+OqCBWaXN1YWzjg6Ljg7zjg4kgKOWxleekuuWTgeizqik8L2g0PlxuICAgICAgPHA+6Kyb5ryU6LOH5paZ44KE5bGV56S644OW44O844K544Gu5aSn55S76Z2i44Gn5pig44GI44KL44OX44Ot5ZOB6LOq44Gu44Kk44Oz44OV44Kp44Kw44Op44OV44Kj44OD44Kv44G4556s5pmC44Gr5aSJ5o+b44GX44G+44GZ44CCPC9wPlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3M9XCJlbXB0eS1ndWlkZS1jYXJkXCI+XG4gICAgICA8aDQ+8J+OpCDjgrnjg4bjg7zjgrjnmbrooaggKOeZuuihqOODouODvOODiSk8L2g0PlxuICAgICAgPHA+44OY44OD44OA44O844Gu44CM55m66KGo44CN44Oc44K/44Oz77yI44G+44Gf44GvIDxrYmQgY2xhc3M9XCJrYmQta2V5XCI+UDwva2JkPiDjgq3jg7zvvInjgaflhajnlLvpnaLjga7jg5fjg6zjgrzjg7Pjg4bjg7zjgrfjg6fjg7PoiJ7lj7DjgbjjgILnq6DjgZTjgajjga7jg5rjg7zjgrjpgIHjgorjgIHlhYnjgYzkvJ3jgo/jgovjgrfjgrDjg4rjg6vjg7vjg6njgqTjg4jjgIHlhajjgrfjg7zjg7Pkv6/nnrAgKE/jgq3jg7wp44CB5YWJ44Gu44Od44Kk44Oz44K/44O8IChM44Kt44O8KeOAgeW5lemWk+ODu+izqueWkeOCq+ODvOODhuODsyAoQi9R44Kt44O8KeOAgeiHquWLlemAsuihjOODq+ODvOODlyAoQeOCreODvCkg44Gn6a2F44Gb44G+44GZ44CCPC9wPlxuICAgIDwvZGl2PlxuICA8L2Rpdj5cblxuICA8cCBjbGFzcz1cImVtcHR5LWd1aWRlLWZvb3RlclwiPvCfkqEg55S76Z2i5LiK6YOo44GuIDxzdHJvbmc+WyDpq5jpgJ/jg6Ljg7zjg4kgfCBWaXN1YWzjg6Ljg7zjg4kgXTwvc3Ryb25nPiDjgoQgPHN0cm9uZz5bIOeZuuihqCBdPC9zdHJvbmc+IOODnOOCv+ODs+OBi+OCieOBhOOBpOOBp+OCguODr+ODs+OCr+ODquODg+OCr+OBp+S9k+mok+OBp+OBjeOBvuOBmeOAguOCreODvOODnOODvOODieOBriA8a2JkIGNsYXNzPVwia2JkLWtleVwiPj88L2tiZD4g44Kt44O844Gn44K344On44O844OI44Kr44OD44OI5LiA6Kan44KS6KGo56S644Gn44GN44G+44GZ44CCPC9wPlxuICA8cCBjbGFzcz1cImVtcHR5LWd1aWRlLWxhdGVzdFwiPuacgOaWsOeJiOOBr+OBk+OBoeOCiTogPGEgJHtSRVBPU0lUT1JZX0xJTktfQVRUUlN9PmdpdGh1Yi5jb20vcHJhbmtzdGVyLWZyZWVkb20vTHVjaXZvPC9hPjwvcD5cbjwvZGl2PmA7XG5cbmNvbnN0IHN0YXRlID0ge1xuICBhcHBlYXJhbmNlOiAnbGlnaHQnLFxuICBwYWxldHRlOiAnY29iYWx0JyxcbiAgdmlld01vZGU6ICdzcGxpdCcsXG4gIGlzVmlzdWFsTW9kZTogZmFsc2UsXG4gIGluZm9ncmFwaGljU3R5bGU6ICdzaGFwZXMnLFxuICBzaG93RnJvbnRNYXR0ZXI6IGZhbHNlLFxuICAvLyDlm7Pjga7nlarlj7cg4oaSIOefouWNsOOBruW9oueKtu+8iCdzbW9vdGgnIC8gJ3N0ZXAnIC8gJ3N0cmFpZ2h0J++8ieOAgueUu+mdouOBruihqOekuuOBrumWk+OBoOOBkeS/neaMgeOBmeOCi++8iERELUVER0UtMDAz77yJXG4gIGN1cnZlQnlJbmRleDogbmV3IE1hcCgpXG59O1xuXG5jb25zdCBzdmdDYWNoZSA9IG5ldyBNYXAoKTtcbmNvbnN0IGxrZ0NhY2hlID0gbmV3IE1hcCgpO1xuLy8gRml0IOOBruS4i+mZkOODu+S4iumZkOOBruioiOeul+e1kOaenO+8iOaPj+eUu+e1kOaenOOBruOCreODo+ODg+OCt+ODpeOBruOCreODvCDihpIgeyBtaW5XaWR0aCwgbWF4V2lkdGggfe+8ieOBqOOAgeaVsOW8j+OBruaPj+eUu+e1kOaenFxuY29uc3QgZml0Q2FjaGUgPSBuZXcgTWFwKCk7XG5jb25zdCBtYXRoQ2FjaGUgPSBuZXcgTWFwKCk7XG5cbi8vIOWbs+ODu+aVsOW8j+OBjOOBquOBhOaWh+abuOOBp+OBr+iqreOBv+i+vOOBvuOBquOBhOODqeOCpOODluODqeODquOAguWQjeWJjSDihpIg6Kqt44G/6L6844G/44GuIFByb21pc2XvvIh0cnVlOiDoqq3jgb/ovrzjgoHjgZ/vvIlcbmNvbnN0IExJQlJBUklFUyA9IHtcbiAgbWVybWFpZDogeyBzY3JpcHQ6ICcuL3ZlbmRvci9tZXJtYWlkLm1pbi5qcycsIGdsb2JhbDogJ21lcm1haWQnIH0sXG4gIGthdGV4OiB7XG4gICAgc2NyaXB0OiAnLi92ZW5kb3Iva2F0ZXgva2F0ZXgubWluLmpzJyxcbiAgICBzdHlsZTogJy4vdmVuZG9yL2thdGV4L2thdGV4Lm1pbi5jc3MnLFxuICAgIGdsb2JhbDogJ2thdGV4J1xuICB9LFxuICAvLyBWaXN1YWzjg6Ljg7zjg4njga7oiJ7lj7DmvJTlh7rvvIhGUi0wMTgsIEZSLTAxOe+8ieOAgumrmOmAn+ODouODvOODieOBrui1t+WLleOBq+OBr+iqreOBv+i+vOOBvuOBquOBhO+8iE5GUi0wMDbvvIlcbiAgc3RhZ2U6IHsgc2NyaXB0OiAnLi9qcy9zdGFnZS5qcycsIGdsb2JhbDogJ0x1Y2l2b1N0YWdlJyB9LFxuICAvLyBmaWxlOi8vIOebtOmWi+OBjeaZguOBruWQjOaiseOCteODs+ODl+ODq+iqreOBv+i+vOOBv+ODleOCqeODvOODq+ODkOODg+OCr++8iEZSLTAwNu+8ieOAguOCteODs+ODl+ODq+OCkumBuOOCk+OBoOOBqOOBjeOBoOOBkeiqreOBv+i+vOOCgO+8iE5GUi0wMDbvvIlcbiAgc2FtcGxlczogeyBzY3JpcHQ6ICcuL3NhbXBsZXMvc2FtcGxlcy1kYXRhLmpzJywgZ2xvYmFsOiAnTFVDSVZPX1NBTVBMRVMnIH1cbn07XG5jb25zdCBsaWJyYXJ5TG9hZHMgPSBuZXcgTWFwKCk7XG4vLyDmm7jjgY3lh7rjgZfjgZ8gSFRNTCDjga/jgqLjg5fjg6rjga7lpJbjgbjmjIHjgaHlh7rjgZnjgZ/jgoHjgIHlkIzmorHjg5XjgqHjgqTjg6vjga7nm7jlr77jg5HjgrnjgpIgQ0ROIOOBriBVUkwg44Gr572u44GN5o+b44GI44KL77yIREQtT0ZGLTAwM++8iVxuY29uc3QgRVhQT1JUX1VSTFMgPSB7XG4gICcuL3ZlbmRvci9mb250cy9mb250cy5jc3MnOiAnaHR0cHM6Ly9mb250cy5nb29nbGVhcGlzLmNvbS9jc3MyP2ZhbWlseT1JbnRlcjp3Z2h0QDQwMDs1MDA7NjAwOzcwMCZmYW1pbHk9SmV0QnJhaW5zK01vbm86d2dodEA0MDA7NTAwOzYwMDs3MDAmZmFtaWx5PU5vdG8rU2FucytKUDp3Z2h0QDQwMDs1MDA7NjAwOzcwMCZmYW1pbHk9UGx1cytKYWthcnRhK1NhbnM6d2dodEA2MDA7NzAwOzgwMCZkaXNwbGF5PXN3YXAnLFxuICAnLi92ZW5kb3IvbWFya2VkLm1pbi5qcyc6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL21hcmtlZEAxOC4xLjMvbGliL21hcmtlZC51bWQuanMnLFxuICAnLi92ZW5kb3IvcHVyaWZ5Lm1pbi5qcyc6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2RvbXB1cmlmeUAzLjQuMTcvZGlzdC9wdXJpZnkubWluLmpzJyxcbiAgJy4vdmVuZG9yL21lcm1haWQubWluLmpzJzogJ2h0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vbWVybWFpZEAxMi4zLjAvZGlzdC9tZXJtYWlkLm1pbi5qcycsXG4gICcuL3ZlbmRvci9rYXRleC9rYXRleC5taW4uanMnOiAnaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9rYXRleEAwLjE5LjEvZGlzdC9rYXRleC5taW4uanMnLFxuICAnLi92ZW5kb3Iva2F0ZXgva2F0ZXgubWluLmNzcyc6ICdodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2thdGV4QDAuMTkuMS9kaXN0L2thdGV4Lm1pbi5jc3MnXG59O1xuXG4vLyBDU1Mg44KCIDxoZWFkPiDjgavlhaXjgozjgovjgZ/jgoHjgIFIVE1MIOOCqOOCr+OCueODneODvOODiO+8iG91dGVySFRNTO+8ieOBq+OCguWQq+OBvuOCjOOCi1xuZnVuY3Rpb24gbG9hZExpYnJhcnkobmFtZSkge1xuICBjb25zdCBsaWIgPSBMSUJSQVJJRVNbbmFtZV07XG4gIGlmICh3aW5kb3dbbGliLmdsb2JhbF0pIHJldHVybiBQcm9taXNlLnJlc29sdmUodHJ1ZSk7XG4gIGlmICghbGlicmFyeUxvYWRzLmhhcyhuYW1lKSkge1xuICAgIGxpYnJhcnlMb2Fkcy5zZXQobmFtZSwgbmV3IFByb21pc2UocmVzb2x2ZSA9PiB7XG4gICAgICBpZiAobGliLnN0eWxlKSB7XG4gICAgICAgIGNvbnN0IGxpbmsgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdsaW5rJyk7XG4gICAgICAgIGxpbmsucmVsID0gJ3N0eWxlc2hlZXQnO1xuICAgICAgICBsaW5rLmhyZWYgPSBsaWIuc3R5bGU7XG4gICAgICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQobGluayk7XG4gICAgICB9XG4gICAgICBjb25zdCBzY3JpcHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzY3JpcHQnKTtcbiAgICAgIHNjcmlwdC5zcmMgPSBsaWIuc2NyaXB0O1xuICAgICAgc2NyaXB0Lm9ubG9hZCA9ICgpID0+IHJlc29sdmUoISF3aW5kb3dbbGliLmdsb2JhbF0pO1xuICAgICAgc2NyaXB0Lm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgIGNvbnNvbGUud2FybihgRmFpbGVkIHRvIGxvYWQgJHtuYW1lfWApO1xuICAgICAgICByZXNvbHZlKGZhbHNlKTtcbiAgICAgIH07XG4gICAgICBkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiBsaWJyYXJ5TG9hZHMuZ2V0KG5hbWUpO1xufVxubGV0IHJlbmRlckRlYm91bmNlVGltZXIgPSBudWxsO1xuLy8gcmVuZGVyQXBwIOOCkuWRvOOBtuOBn+OBs+OBq+Wil+OChOOBl+OAgeaPj+eUu+S4reOBruWPpOOBhOmdnuWQjOacn+aPj+eUu+OCkuimi+WIhuOBkeOCi1xubGV0IHJlbmRlckdlbmVyYXRpb24gPSAwO1xuLy8g5pyA5b6M44Gr6Kqt44G/6L6844KT44GgIE1hcmtkb3du44CC44Ko44OH44Kj44K/44Gu5YaF5a6544Go55Ww44Gq44KM44Gw57eo6ZuG5Lit44Go44G/44Gq44GZ77yI6LW35YuV55u05b6M44Gv56m677yJXG5sZXQgbGFzdExvYWRlZE1hcmtkb3duID0gJyc7XG4vLyDkv53lrZjjgZnjgovjgajjgY3jga7jg5XjgqHjgqTjg6vlkI3jgILoqq3jgb/ovrzjgpPjgaDjg5XjgqHjgqTjg6vjga7lkI3liY3vvIhERC1GSUxFLTAzMO+8iVxubGV0IGN1cnJlbnRGaWxlTmFtZSA9ICd1bnRpdGxlZC5tZCc7XG4vLyDjg5XjgqHjgqTjg6vjgpLoqq3jgb/ovrzjgpPjgaDlvozjga7jgqbjgqPjg7Pjg4njgqbjga7jgr/jgqTjg4jjg6vjga/jgIzjg5XjgqHjgqTjg6vlkI0gLSBMdWNpdm/jgI3vvIhERC1GSUxFLTA1MO+8iVxuY29uc3QgQVBQX1RJVExFX1NVRkZJWCA9ICcgLSBMdWNpdm8nO1xuLy8g44OJ44Ot44OD44OX44Gn6ZaL44GR44KL44OV44Kh44Kk44Or44CC44OV44Kh44Kk44Or6YG45oqe77yII2ZpbGUtaW5wdXQg44GuIGFjY2VwdO+8ieOBqOWQjOOBmOaLoeW8teWtkOOBq+OBmeOCi++8iERELUZJTEUtMDYw77yJXG5jb25zdCBEUk9QUEFCTEVfRklMRV9QQVRURVJOID0gL1xcLihtZHxtYXJrZG93bnx0eHQpJC9pO1xuXG5mdW5jdGlvbiBnZXRUaGVtZVNwZWMoKSB7XG4gIGNvbnN0IG1vZGUgPSBUSEVNRVNbc3RhdGUuYXBwZWFyYW5jZV0gfHwgVEhFTUVTLmxpZ2h0O1xuICByZXR1cm4gbW9kZVtzdGF0ZS5wYWxldHRlXSB8fCBtb2RlLmNvYmFsdDtcbn1cblxuZnVuY3Rpb24gc3luY0Nzc1Rva2VucygpIHtcbiAgY29uc3Qgc3BlYyA9IGdldFRoZW1lU3BlYygpO1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWRpYWctY2FudmFzJywgc3BlYy5jYW52YXNCZyk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZGlhZy1jbHVzdGVyLWJnJywgc3BlYy5jbHVzdGVyQmcpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWRpYWctY2x1c3Rlci1ib3JkZXInLCBzcGVjLmNsdXN0ZXJCb3JkZXIpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWRpYWctbm9kZS1iZycsIHNwZWMubm9kZUJnKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kaWFnLW5vZGUtc3Ryb2tlJywgc3BlYy5ub2RlU3Ryb2tlKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kaWFnLW5vZGUtdGV4dCcsIHNwZWMubm9kZVRleHQpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWRpYWctZWRnZScsIHNwZWMuZWRnZVN0cm9rZSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWNjZW50Jywgc3BlYy5ub2RlU3Ryb2tlKTtcbn1cblxuZnVuY3Rpb24gZ2V0TWVybWFpZEN1cnZlKGN1cnZlKSB7XG4gIGlmIChjdXJ2ZSA9PT0gJ3N0ZXAnKSByZXR1cm4gJ3N0ZXBBZnRlcic7XG4gIGlmIChjdXJ2ZSA9PT0gJ3N0cmFpZ2h0JykgcmV0dXJuICdsaW5lYXInO1xuICByZXR1cm4gJ2Jhc2lzJztcbn1cblxuLy8g55+i5Y2w44Gu5b2i54q244KS6YG444G544KL5Zuz56iu44GL44CCTWVybWFpZCAxMiDjgacgY3VydmUg44Gu6Kit5a6a44GM5Yq544GP44Gu44Gv44OV44Ot44O844OB44Oj44O844OI44O754q25oWL6YG356e75Zuz44O744Kv44Op44K55Zuz77yIREQtRURHRS0wMDHvvIlcbmZ1bmN0aW9uIGdldEN1cnZlVGFyZ2V0KGNvZGUpIHtcbiAgY29uc3QgZmlyc3QgPSBjb2RlLnNwbGl0KC9cXHI/XFxuLykubWFwKGxpbmUgPT4gbGluZS50cmltKCkpLmZpbmQobGluZSA9PiBsaW5lICYmICFsaW5lLnN0YXJ0c1dpdGgoJyUlJykpIHx8ICcnO1xuICBpZiAoL14oZmxvd2NoYXJ0fGdyYXBoKVxcYi8udGVzdChmaXJzdCkpIHJldHVybiAnZmxvd2NoYXJ0JztcbiAgaWYgKC9ec3RhdGVEaWFncmFtKC12Mik/XFxiLy50ZXN0KGZpcnN0KSkgcmV0dXJuICdzdGF0ZSc7XG4gIGlmICgvXmNsYXNzRGlhZ3JhbSgtdjIpP1xcYi8udGVzdChmaXJzdCkpIHJldHVybiAnY2xhc3MnO1xuICByZXR1cm4gbnVsbDtcbn1cblxuLy8g5Zuz44Gu55+i5Y2w44Gu5b2i54q244CC5Yip55So6ICF44GM6YG444KT44Gn44GE44Gq44GR44KM44Gw44CB5Zuz56iu44Gu5pei5a6a44Gu5b2i54q277yIREQtRURHRS0wMDIsIDAwM++8iVxuZnVuY3Rpb24gZ2V0QmxvY2tDdXJ2ZShpbmRleCwgY29kZSkge1xuICBjb25zdCB0YXJnZXQgPSBnZXRDdXJ2ZVRhcmdldChjb2RlKTtcbiAgaWYgKCF0YXJnZXQpIHJldHVybiBudWxsO1xuICByZXR1cm4gc3RhdGUuY3VydmVCeUluZGV4LmdldChpbmRleCkgfHwgREVGQVVMVF9DVVJWRVNbdGFyZ2V0XTtcbn1cblxuLy8g5o+P55S744Gr5L2/44GG6YWN6Imy44CCVmlzdWFsIFN0YWdlIOOBr+OCueOCv+OCpOODq+OBlOOBqOOBrumFjeiJsuOAgemAmuW4uOODouODvOODieOBr+Wkluims+OBqOODkeODrOODg+ODiOOBrumFjeiJslxuZnVuY3Rpb24gZ2V0RGlhZ3JhbVNwZWMoaXNWaXN1YWwpIHtcbiAgaWYgKGlzVmlzdWFsKSB7XG4gICAgY29uc3QgdGhlbWVzID0gc3RhdGUuYXBwZWFyYW5jZSA9PT0gJ2RhcmsnID8gVklTVUFMX1RIRU1FU19EQVJLIDogVklTVUFMX1RIRU1FUztcbiAgICByZXR1cm4gdGhlbWVzW3N0YXRlLmluZm9ncmFwaGljU3R5bGVdIHx8IHRoZW1lcy5zaGFwZXM7XG4gIH1cbiAgcmV0dXJuIGdldFRoZW1lU3BlYygpO1xufVxuXG4vLyBNZXJtYWlkIDEyIOOBriBsYXlvdXQg44Gv5Zuz5YWo5L2T44Gr5Yq544GP44CC44Oe44Kk44Oz44OJ44Oe44OD44OX44GvIGRhZ3JlIOOBoOOBqOaUvuWwhOeKtuOBp+OBquOBj+OBquOCi+OBruOBp+OAgeaXouWumuOBruODrOOCpOOCouOCpuODiOOBq+OBmeOCi+OAglxuLy8g55u06KeS44Gu44Kv44Op44K55Zuz44KC5pei5a6a44Gu44Os44Kk44Ki44Km44OI44Gr44GZ44KL44CCZGFncmUg44GuIHN0ZXBBZnRlciDjga/nt5rjga7lh7rnmbrngrnjgafmqKrjgavpgLLjgoDjgZ/jgoHjgIFcbi8vIOWHuueZuueCueOBq+S7mOOBj+e2meaJv+OBquOBqeOBruiomOWPt+OBjOaoquOCkuWQkeOBj+OAguaXouWumuOBruODrOOCpOOCouOCpuODiOOBr+e4piDihpIg5qiqIOKGkiDnuKbjga7nm7Top5LjgafntZDjgbbvvIhERC1FREdFLTAwNe+8iVxuZnVuY3Rpb24gZ2V0TWVybWFpZExheW91dChjb2RlLCBjdXJ2ZSA9IG51bGwpIHtcbiAgaWYgKC9eXFxzKm1pbmRtYXBcXGIvbS50ZXN0KGNvZGUpKSByZXR1cm4gbnVsbDtcbiAgaWYgKGN1cnZlID09PSAnc3RlcCcgJiYgZ2V0Q3VydmVUYXJnZXQoY29kZSkgPT09ICdjbGFzcycpIHJldHVybiBudWxsO1xuICByZXR1cm4gJ2RhZ3JlJztcbn1cblxuZnVuY3Rpb24gc2V0dXBNZXJtYWlkKGlzVmlzdWFsID0gc3RhdGUuaXNWaXN1YWxNb2RlLCBjdXJ2ZSA9ICdzbW9vdGgnLCBsYXlvdXQgPSAnZGFncmUnKSB7XG4gIHN5bmNDc3NUb2tlbnMoKTtcbiAgY29uc3Qgc3BlYyA9IGdldERpYWdyYW1TcGVjKGlzVmlzdWFsKTtcbiAgY29uc3QgaXNEYXJrID0gc3RhdGUuYXBwZWFyYW5jZSA9PT0gJ2RhcmsnO1xuICAvLyBWaXN1YWwgU3RhZ2Ug44Gn44Gv5YaG44Kw44Op44OV44Gq44Gp44Gu5rS+55Sf6Imy44KC44K544K/44Kk44Or44Gu6YWN6Imy44Gr5o+D44GI44KLXG4gIGNvbnN0IHZpc3VhbENvbG9ycyA9IGlzVmlzdWFsXG4gICAgPyB7IHNlY29uZGFyeUNvbG9yOiBzcGVjLnNlY29uZGFyeSwgdGVydGlhcnlDb2xvcjogc3BlYy50ZXJ0aWFyeSB9XG4gICAgOiB7IHRlcnRpYXJ5Q29sb3I6IHNwZWMuY2x1c3RlckJnIH07XG5cbiAgLy8gTWVybWFpZCDjga/lm7PjgYznj77jgozjgovjgb7jgafoqq3jgb/ovrzjgb7jgarjgYTjgILoqq3jgb/ovrzjgpPjgaDlvozjga7mj4/nlLvjga7nm7TliY3jgavjgIHmlLnjgoHjgaboqK3lrprjgZnjgotcbiAgaWYgKCF3aW5kb3cubWVybWFpZCkgcmV0dXJuO1xuICBtZXJtYWlkLmluaXRpYWxpemUoe1xuICAgIHN0YXJ0T25Mb2FkOiBmYWxzZSxcbiAgICB0aGVtZTogJ2Jhc2UnLFxuICAgIC8vIE1lcm1haWQgMTIg44Gu5pei5a6a44Gu6KaL44Gf55uu44Go44Os44Kk44Ki44Km44OI44Gn44GvIGZsb3djaGFydC5jdXJ2ZSDjgYzlirnjgYvjgZrjgIHlm7Pjga7ntYTniYjjgoLlpInjgo/jgotcbiAgICBsb29rOiAnY2xhc3NpYycsXG4gICAgLi4uKGxheW91dCA/IHsgbGF5b3V0IH0gOiB7fSksXG4gICAgLy8g6ZaL44GE44GfIE1hcmtkb3duIOOBruWbs+OBruS4reOBriBIVE1MIOOCv+OCsOOBqOOCr+ODquODg+OCr+aZguOBruOCueOCr+ODquODl+ODiOWRvOOBs+WHuuOBl+OCkueEoeWKueOBq+OBmeOCi++8iE5GUi0wMDPvvIlcbiAgICBzZWN1cml0eUxldmVsOiAnc3RyaWN0JyxcbiAgICAvLyDmp4vmlofjgqjjg6njg7zjga7lm7PjgpIgTWVybWFpZCDjgavmj4/jgYvjgZvjgarjgYTjgILmj4/jgYvjgZvjgovjgaggYm9keSDjgavopoHntKDjgYzmrovjgorjgIHnt6jpm4bjga7jgZ/jgbPjgavnqY3jgb/kuIrjgYzjgovjgIJcbiAgICAvLyDjgqjjg6njg7zjga/jgqLjg5fjg6rjgYzlm7Pjga7jgqvjg7zjg4njga7kuK3jgavooajnpLrjgZnjgovvvIhERC1ESUFHLTA2NO+8iVxuICAgIHN1cHByZXNzRXJyb3JSZW5kZXJpbmc6IHRydWUsXG4gICAgZm9udEZhbWlseTogJ1wiSW50ZXJcIiwgXCJOb3RvIFNhbnMgSlBcIiwgLWFwcGxlLXN5c3RlbSwgc2Fucy1zZXJpZicsXG4gICAgZm9udFNpemU6IDEzLFxuICAgIGZsb3djaGFydDoge1xuICAgICAgY3VydmU6IGdldE1lcm1haWRDdXJ2ZShjdXJ2ZSksXG4gICAgICAvLyBNZXJtYWlkIDEyIOOBryBwYWRkaW5nIOOCkuS4oeWBtOOBq+WKueOBi+OBm+OAgeefreOBhOODqeODmeODq+OCgiBtaW5Ob2RlV2lkdGgg44G+44Gn5bqD44GS44KL44CC5b6T5p2l44Gu57WE54mI44Gr5ZCI44KP44Gb44KLXG4gICAgICBwYWRkaW5nOiAxMSxcbiAgICAgIG1pbk5vZGVXaWR0aDogMCxcbiAgICAgIG5vZGVTcGFjaW5nOiA0NCxcbiAgICAgIHJhbmtTcGFjaW5nOiA1NixcbiAgICAgIGh0bWxMYWJlbHM6IHRydWUsXG4gICAgICB1c2VNYXhXaWR0aDogdHJ1ZVxuICAgIH0sXG4gICAgc2VxdWVuY2U6IHtcbiAgICAgIGRpYWdyYW1NYXJnaW5YOiAyNCxcbiAgICAgIGRpYWdyYW1NYXJnaW5ZOiAyMCxcbiAgICAgIGFjdG9yTWFyZ2luOiA1NCxcbiAgICAgIHdpZHRoOiAxNTUsXG4gICAgICBoZWlnaHQ6IDUwLFxuICAgICAgYm94TWFyZ2luOiAxMixcbiAgICAgIHVzZU1heFdpZHRoOiB0cnVlXG4gICAgfSxcbiAgICAvLyDjgqzjg7Pjg4jjg4Hjg6Pjg7zjg4jjga/mj4/nlLvmmYLjga7jg5rjg7zjgrjluYXjgafmqKrplbfjgavnlJ/miJDjgZXjgozjgIHooajnpLrmnqDjgavnuK7lsI/jgZXjgozjgabmloflrZfjgYzmpbXlsI/jgavjgarjgovjgZ/jgoHjgIFcbiAgICAvLyDooajnpLrmnqDvvIjntIQgNTRyZW3vvInjgavov5HjgYTluYXjgafnlJ/miJDjgZnjgotcbiAgICBnYW50dDoge1xuICAgICAgdXNlV2lkdGg6IDgyMCxcbiAgICAgIGJhckhlaWdodDogMjQsXG4gICAgICBiYXJHYXA6IDYsXG4gICAgICB0b3BQYWRkaW5nOiA1NixcbiAgICAgIGxlZnRQYWRkaW5nOiA3MixcbiAgICAgIGZvbnRTaXplOiAxMixcbiAgICAgIHNlY3Rpb25Gb250U2l6ZTogMTIsXG4gICAgICB1c2VNYXhXaWR0aDogdHJ1ZVxuICAgIH0sXG4gICAgc3RhdGU6IHtcbiAgICAgIGN1cnZlOiBnZXRNZXJtYWlkQ3VydmUoY3VydmUpLFxuICAgICAgcGFkZGluZzogOCxcbiAgICAgIG1pbk5vZGVXaWR0aDogMCxcbiAgICAgIGRpdmlkZXJNYXJnaW46IDE4LFxuICAgICAgc2l6ZVVuaXQ6IDgsXG4gICAgICB1c2VNYXhXaWR0aDogdHJ1ZVxuICAgIH0sXG4gICAgY2xhc3M6IHtcbiAgICAgIGN1cnZlOiBnZXRNZXJtYWlkQ3VydmUoY3VydmUpXG4gICAgfSxcbiAgICB0aGVtZVZhcmlhYmxlczoge1xuICAgICAgZGFya01vZGU6IGlzRGFyayxcbiAgICAgIC4uLihpc0RhcmsgPyBkYXJrU2VjdGlvblNjYWxlKCkgOiB7fSksXG4gICAgICBiYWNrZ3JvdW5kOiAndHJhbnNwYXJlbnQnLFxuICAgICAgbWFpbkJrZzogc3BlYy5ub2RlQmcsXG4gICAgICBwcmltYXJ5Q29sb3I6IHNwZWMubm9kZUJnLFxuICAgICAgcHJpbWFyeVRleHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIHByaW1hcnlCb3JkZXJDb2xvcjogc3BlYy5ub2RlU3Ryb2tlLFxuICAgICAgbGluZUNvbG9yOiBzcGVjLmVkZ2VTdHJva2UsXG4gICAgICB0ZXh0Q29sb3I6IHNwZWMubm9kZVRleHQsXG4gICAgICBmb250U2l6ZTogJzEzcHgnLFxuXG4gICAgICBjbHVzdGVyQmtnOiBzcGVjLmNsdXN0ZXJCZyxcbiAgICAgIGNsdXN0ZXJCb3JkZXI6IHNwZWMuY2x1c3RlckJvcmRlcixcbiAgICAgIC4uLnZpc3VhbENvbG9ycyxcbiAgICAgIHRlcnRpYXJ5Qm9yZGVyQ29sb3I6IHNwZWMuY2x1c3RlckJvcmRlcixcbiAgICAgIHRpdGxlQ29sb3I6IHNwZWMubm9kZVRleHQsXG5cbiAgICAgIGNvbXBvc2l0ZUJhY2tncm91bmQ6IHNwZWMuY2x1c3RlckJnLFxuICAgICAgY29tcG9zaXRlQm9yZGVyOiBzcGVjLmNsdXN0ZXJCb3JkZXIsXG4gICAgICBjb21wb3NpdGVUaXRsZUJhY2tncm91bmQ6IHNwZWMuY2x1c3RlckJnLFxuICAgICAgc3RhdGVCa2c6IHNwZWMubm9kZUJnLFxuICAgICAgc3RhdGVCb3JkZXI6IHNwZWMubm9kZVN0cm9rZSxcbiAgICAgIHN0YXRlTGFiZWxDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIHRyYW5zaXRpb25Db2xvcjogc3BlYy5lZGdlU3Ryb2tlLFxuICAgICAgdHJhbnNpdGlvbkxhYmVsQ29sb3I6IHNwZWMuZWRnZUxhYmVsVGV4dCxcblxuICAgICAgYWN0b3JCa2c6IHNwZWMubm9kZUJnLFxuICAgICAgYWN0b3JCb3JkZXI6IHNwZWMubm9kZVN0cm9rZSxcbiAgICAgIGFjdG9yVGV4dENvbG9yOiBzcGVjLm5vZGVUZXh0LFxuICAgICAgYWN0b3JMaW5lQ29sb3I6IHNwZWMuY2x1c3RlckJvcmRlcixcbiAgICAgIHNpZ25hbENvbG9yOiBzcGVjLmVkZ2VTdHJva2UsXG4gICAgICBzaWduYWxUZXh0Q29sb3I6IHNwZWMubm9kZVRleHQsXG4gICAgICBsYWJlbEJveEJrZ0NvbG9yOiBzcGVjLmVkZ2VMYWJlbEJnLFxuICAgICAgbGFiZWxCb3hCb3JkZXJDb2xvcjogc3BlYy5lZGdlTGFiZWxCb3JkZXIsXG4gICAgICBsYWJlbFRleHRDb2xvcjogc3BlYy5lZGdlTGFiZWxUZXh0LFxuICAgICAgbG9vcFRleHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIG5vdGVCb3JkZXJDb2xvcjogc3BlYy5ub2RlU3Ryb2tlLFxuICAgICAgbm90ZUJrZ0NvbG9yOiBzcGVjLmNsdXN0ZXJCZyxcbiAgICAgIG5vdGVUZXh0Q29sb3I6IHNwZWMubm9kZVRleHQsXG5cbiAgICAgIC8vIEVSIOWbs+OBruWxnuaAp+ihjOOBqOOCrOODs+ODiOODgeODo+ODvOODiOOBr+OAgea0vueUn+iJsuOBruOBvuOBvuOBoOOBqCBEYXJrIOOBp+eZveWcsOOBq+eZveaWh+Wtl+OBquOBqeOBq+OBquOCi+OBn+OCgeaYjuekuuOBmeOCi++8iEZSLTAwOO+8iVxuICAgICAgYXR0cmlidXRlQmFja2dyb3VuZENvbG9yT2RkOiBzcGVjLm5vZGVCZyxcbiAgICAgIGF0dHJpYnV0ZUJhY2tncm91bmRDb2xvckV2ZW46IHNwZWMuY2x1c3RlckJnLFxuICAgICAgc2VjdGlvbkJrZ0NvbG9yOiBzcGVjLmNsdXN0ZXJCZyxcbiAgICAgIHNlY3Rpb25Ca2dDb2xvcjI6IHNwZWMuY2x1c3RlckJnLFxuICAgICAgYWx0U2VjdGlvbkJrZ0NvbG9yOiBpc1Zpc3VhbCAmJiAhaXNEYXJrID8gJyNGRkZGRkYnIDogc3BlYy5jYW52YXNCZyxcbiAgICAgIGdyaWRDb2xvcjogc3BlYy5jbHVzdGVyQm9yZGVyLFxuICAgICAgdGFza0JrZ0NvbG9yOiBzcGVjLm5vZGVCZyxcbiAgICAgIHRhc2tCb3JkZXJDb2xvcjogc3BlYy5ub2RlU3Ryb2tlLFxuICAgICAgdGFza1RleHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIHRhc2tUZXh0TGlnaHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIHRhc2tUZXh0RGFya0NvbG9yOiBzcGVjLm5vZGVUZXh0LFxuICAgICAgdGFza1RleHRPdXRzaWRlQ29sb3I6IHNwZWMubm9kZVRleHQsXG4gICAgICB0YXNrVGV4dENsaWNrYWJsZUNvbG9yOiBzcGVjLm5vZGVUZXh0LFxuICAgICAgYWN0aXZlVGFza0JrZ0NvbG9yOiBpc1Zpc3VhbCA/IHNwZWMuc2Vjb25kYXJ5IDogc3BlYy5jbHVzdGVyQmcsXG4gICAgICBhY3RpdmVUYXNrQm9yZGVyQ29sb3I6IHNwZWMubm9kZVN0cm9rZSxcbiAgICAgIGRvbmVUYXNrQmtnQ29sb3I6IGlzVmlzdWFsID8gc3BlYy50ZXJ0aWFyeSA6IHNwZWMuY2x1c3RlckJvcmRlcixcbiAgICAgIGRvbmVUYXNrQm9yZGVyQ29sb3I6IHNwZWMuY2x1c3RlckJvcmRlcixcbiAgICAgIGNyaXRCa2dDb2xvcjogaXNEYXJrID8gJyM3RjFEMUQnIDogJyNGRUNBQ0EnLFxuICAgICAgY3JpdEJvcmRlckNvbG9yOiAnI0RDMjYyNicsXG4gICAgICB0b2RheUxpbmVDb2xvcjogc3BlYy5ub2RlU3Ryb2tlLFxuICAgICAgLy8g5YaG44Kw44Op44OV44Gu5aKD55WM57ea44Gv5pei5a6a44GM6buS44Gu44Gf44KB44CBRGFyayDjgafjga/mmpfjgYTmiYflvaLjganjgYbjgZfjga7looPnm67jgYzopovjgYjjgarjgY/jgarjgotcbiAgICAgIHBpZVN0cm9rZUNvbG9yOiBzcGVjLmVkZ2VTdHJva2UsXG4gICAgICBwaWVPdXRlclN0cm9rZUNvbG9yOiBzcGVjLmVkZ2VTdHJva2UsXG4gICAgICBwaWVUaXRsZVRleHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIC8vIERhcmsg44Gn44Gv44K544Op44Kk44K544KS5piO5bqm44KS44Gd44KN44GI44Gf5Lit6ZaT6Imy44Gn5aGX44KL44Gu44Gn77yIZGFya1NlY3Rpb25TY2FsZe+8ieOAgeOCueODqeOCpOOCueOBruS4iuOBruaWh+Wtl+OBr+aYjuOCi+OBj+OBmeOCi1xuICAgICAgcGllU2VjdGlvblRleHRDb2xvcjogaXNEYXJrID8gJyNGMUY1RjknIDogc3BlYy5ub2RlVGV4dCxcbiAgICAgIHBpZUxlZ2VuZFRleHRDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgIC8vIFhZIOODgeODo+ODvOODiOOBruezu+WIl+iJsu+8iOa0vueUn+iJsuOBruOBvuOBvuOBoOOBqOeZveWcsOOBq+a3oeOBhOOCr+ODquODvOODoOiJsuOBq+OBquOCiuimi+WIhuOBkeOBq+OBj+OBhO+8iVxuICAgICAgeHlDaGFydDoge1xuICAgICAgICBiYWNrZ3JvdW5kQ29sb3I6ICd0cmFuc3BhcmVudCcsXG4gICAgICAgIHRpdGxlQ29sb3I6IHNwZWMubm9kZVRleHQsXG4gICAgICAgIHhBeGlzTGFiZWxDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgICAgeEF4aXNUaXRsZUNvbG9yOiBzcGVjLm5vZGVUZXh0LFxuICAgICAgICB4QXhpc1RpY2tDb2xvcjogc3BlYy5lZGdlU3Ryb2tlLFxuICAgICAgICB4QXhpc0xpbmVDb2xvcjogc3BlYy5lZGdlU3Ryb2tlLFxuICAgICAgICB5QXhpc0xhYmVsQ29sb3I6IHNwZWMubm9kZVRleHQsXG4gICAgICAgIHlBeGlzVGl0bGVDb2xvcjogc3BlYy5ub2RlVGV4dCxcbiAgICAgICAgeUF4aXNUaWNrQ29sb3I6IHNwZWMuZWRnZVN0cm9rZSxcbiAgICAgICAgeUF4aXNMaW5lQ29sb3I6IHNwZWMuZWRnZVN0cm9rZSxcbiAgICAgICAgcGxvdENvbG9yUGFsZXR0ZTogYCR7c3BlYy5ub2RlU3Ryb2tlfSwgJHtzcGVjLmVkZ2VTdHJva2V9YFxuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICDmlbDlvI/vvIhGUi0wMTDvvIk6IE1hcmtlZCDjga7mi6HlvLXjgafmlbDlvI/jga7nva7jgY3loLTmiYDjgpLkvZzjgorjgIHjgrXjg4vjgr/jgqTjgrrlvozjgasgS2FUZVgg44Gn5o+P55S744GZ44KLXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8g572u44GN5aC05omA44Gu5Lit6Lqr44GvIFRlWCDjga7ljp/mlofjgIJLYVRlWCDjgpLoqq3jgb/ovrzjgoHjgarjgYTloLTlkIjjga/ljp/mlofjgYzjgZ3jga7jgb7jgb7ooajnpLrjgZXjgozjgovvvIhERC1NQVRILTAxMiwgMDIy77yJXG5mdW5jdGlvbiBtYXRoUGxhY2Vob2xkZXIodGFnLCB0ZXgsIGlzRGlzcGxheSwgcmF3KSB7XG4gIHJldHVybiBgPCR7dGFnfSBjbGFzcz1cImx1Y2l2by1tYXRoXCIgZGF0YS1kaXNwbGF5PVwiJHtpc0Rpc3BsYXl9XCIgZGF0YS10ZXg9XCIke2VzY2FwZUh0bWwodGV4KX1cIj4ke2VzY2FwZUh0bWwocmF3KX08LyR7dGFnfT5gO1xufVxuXG5jb25zdCBtYXRoQmxvY2tFeHRlbnNpb24gPSB7XG4gIG5hbWU6ICdtYXRoQmxvY2snLFxuICBsZXZlbDogJ2Jsb2NrJyxcbiAgc3RhcnQ6IHNyYyA9PiB7XG4gICAgY29uc3QgbSA9IHNyYy5tYXRjaCgvXlxcJFxcJC9tKTtcbiAgICByZXR1cm4gbSA/IG0uaW5kZXggOiB1bmRlZmluZWQ7XG4gIH0sXG4gIHRva2VuaXplcihzcmMpIHtcbiAgICBjb25zdCBtID0gL15cXCRcXCRbXlxcU1xcbl0qXFxuPyhbXFxzXFxTXSs/KVxcbj9bXlxcU1xcbl0qXFwkXFwkW15cXFNcXG5dKig/Olxcbit8JCkvLmV4ZWMoc3JjKTtcbiAgICBpZiAobSkgcmV0dXJuIHsgdHlwZTogJ21hdGhCbG9jaycsIHJhdzogbVswXSwgdGV4dDogbVsxXS50cmltKCkgfTtcbiAgfSxcbiAgcmVuZGVyZXI6IHRva2VuID0+IGAke21hdGhQbGFjZWhvbGRlcignZGl2JywgdG9rZW4udGV4dCwgdHJ1ZSwgdG9rZW4ucmF3LnRyaW0oKSl9XFxuYFxufTtcblxuLy8gJOKApiQg44Gv44CB6ZaL44GN44Gu55u05b6M44O76ZaJ44GY44Gu55u05YmN44GM56m655m944Gn44Gq44GP44CB6ZaJ44GY44Gu55u05b6M44GM5pWw5a2X44Gn44Gq44GE5aC05ZCI44Gg44GR5pWw5byP44Gr44GZ44KL77yI44CMJDUg44GoICQxMOOAjeOCkumZpOOBj+OBn+OCge+8ieOAglxuLy8g5Lit6Lqr44Gr44OQ44OD44Kv44Kv44Kp44O844OI44KS5ZCr44KB44Gq44GE44CC5b6M44KN44Gu44Kk44Oz44Op44Kk44Oz44Kz44O844OJ44Gu5Lit44GuICQg44KS6ZaJ44GY44GuICQg44Go5Y+W44KK6YGV44GI44Gq44GE44Gf44KBXG5jb25zdCBtYXRoSW5saW5lRXh0ZW5zaW9uID0ge1xuICBuYW1lOiAnbWF0aElubGluZScsXG4gIGxldmVsOiAnaW5saW5lJyxcbiAgc3RhcnQ6IHNyYyA9PiB7XG4gICAgY29uc3QgaW5kZXggPSBzcmMuaW5kZXhPZignJCcpO1xuICAgIHJldHVybiBpbmRleCA+PSAwID8gaW5kZXggOiB1bmRlZmluZWQ7XG4gIH0sXG4gIHRva2VuaXplcihzcmMpIHtcbiAgICBjb25zdCBkaXNwbGF5ID0gL15cXCRcXCQoKD86XFxcXC58W15cXFxcJGBdKSs/KVxcJFxcJC8uZXhlYyhzcmMpO1xuICAgIGlmIChkaXNwbGF5KSByZXR1cm4geyB0eXBlOiAnbWF0aElubGluZScsIHJhdzogZGlzcGxheVswXSwgdGV4dDogZGlzcGxheVsxXS50cmltKCksIGRpc3BsYXk6IHRydWUgfTtcbiAgICBjb25zdCBpbmxpbmUgPSAvXlxcJCg/IVxccykoKD86XFxcXC58W15cXFxcJGBcXG5dKSs/KSg/PCFcXHMpXFwkKD8hXFxkKS8uZXhlYyhzcmMpO1xuICAgIGlmIChpbmxpbmUpIHJldHVybiB7IHR5cGU6ICdtYXRoSW5saW5lJywgcmF3OiBpbmxpbmVbMF0sIHRleHQ6IGlubGluZVsxXSwgZGlzcGxheTogZmFsc2UgfTtcbiAgfSxcbiAgcmVuZGVyZXI6IHRva2VuID0+IG1hdGhQbGFjZWhvbGRlcignc3BhbicsIHRva2VuLnRleHQsIHRva2VuLmRpc3BsYXksIHRva2VuLnJhdylcbn07XG5cbmZ1bmN0aW9uIHNldHVwTWFya2VkTWF0aCgpIHtcbiAgbWFya2VkLnVzZSh7IGV4dGVuc2lvbnM6IFttYXRoQmxvY2tFeHRlbnNpb24sIG1hdGhJbmxpbmVFeHRlbnNpb25dIH0pO1xufVxuXG4vLyDopovlh7rjgZfjgavlhYPjga4gTWFya2Rvd24g44Gu6KGM55Wq5Y+377yIcmVuZGVyQXBwKCkg44GM5pyA5LiK5L2N44Gu6KaL5Ye644GX44Gu44OI44O844Kv44Oz44Gr5LuY44GR44GfIHNyY0xpbmXvvInjgpIgZGF0YS1zcmMtbGluZSDjgajjgZfjgablh7rlipvjgZnjgovjgIJcbi8vIFNwbGl0IOihqOekuuOBrue3qOmbhuS9jee9ruOBuOOBrui/veW+k++8iEZSLTAzN++8ieOBjOOAgeODl+ODrOODk+ODpeODvOOBruimi+WHuuOBl+OBqOWFg+OBruihjOOCkuWvvuW/nOOBpeOBkeOCi+OBn+OCgeOBq+S9v+OBhu+8iERELURJQUctMDYw77yJXG5mdW5jdGlvbiBzZXR1cE1hcmtlZEhlYWRpbmdzKCkge1xuICBtYXJrZWQudXNlKHtcbiAgICByZW5kZXJlcjoge1xuICAgICAgaGVhZGluZyh0b2tlbikge1xuICAgICAgICBjb25zdCBhdHRyID0gTnVtYmVyLmlzSW50ZWdlcih0b2tlbi5zcmNMaW5lKSA/IGAgZGF0YS1zcmMtbGluZT1cIiR7dG9rZW4uc3JjTGluZX1cImAgOiAnJztcbiAgICAgICAgcmV0dXJuIGA8aCR7dG9rZW4uZGVwdGh9JHthdHRyfT4ke3RoaXMucGFyc2VyLnBhcnNlSW5saW5lKHRva2VuLnRva2Vucyl9PC9oJHt0b2tlbi5kZXB0aH0+XFxuYDtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44Kz44O844Or44Ki44Km44OI77yIR2l0SHViIOOCouODqeODvOODiOiomOazlSwgRlItMDM077yJOiDjgrXjg4vjgr/jgqTjgrrlvozjga4gRE9NIOOBp+OAgeacgOWIneOBruihjOOBjOODnuODvOOCq+ODvOOBoOOBkeOBruW8leeUqOOCkuazqOaEj+abuOOBjeOBruODkeODjeODq+OBq+OBmeOCi1xuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmNvbnN0IEFMRVJUX0xBQkVMUyA9IHsgbm90ZTogJ05vdGUnLCB0aXA6ICdUaXAnLCBpbXBvcnRhbnQ6ICdJbXBvcnRhbnQnLCB3YXJuaW5nOiAnV2FybmluZycsIGNhdXRpb246ICdDYXV0aW9uJyB9O1xuLy8g44Oe44O844Kr44O844Gu5b6M44KN44Gr5ZCM44GY6KGM44Gn5paH5a2X44GM57aa44GP44KC44Gu77yIWyFOT1RFXSDmnKzmlofvvInjga/jgIFHaXRIdWIg44Go5ZCM44GY44GP6YCa5bi444Gu5byV55So44Gu44G+44G+44Gr44GZ44KLXG5jb25zdCBBTEVSVF9NQVJLRVJfUkUgPSAvXlxcWyEoTk9URXxUSVB8SU1QT1JUQU5UfFdBUk5JTkd8Q0FVVElPTilcXF1bIFxcdF0qKD86XFxufCQpL2k7XG5cbi8vIOW8leeUqOOBruacgOWIneOBruauteiQveOBruWFiOmgreOBruaWh+Wtl+OBoOOBkeOCkuiqv+OBueOAgeimgee0oOOBruWkp+OBjeOBleOBr+ioiOa4rOOBl+OBquOBhO+8iE5GUi0wMDYsIERELU1ELTAyMe+8iVxuZnVuY3Rpb24gZGVjb3JhdGVBbGVydHMoY29udGFpbmVyKSB7XG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCdibG9ja3F1b3RlJykuZm9yRWFjaChxdW90ZSA9PiB7XG4gICAgY29uc3QgZmlyc3QgPSBxdW90ZS5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICBjb25zdCBoZWFkID0gZmlyc3QgJiYgZmlyc3QudGFnTmFtZSA9PT0gJ1AnID8gZmlyc3QuZmlyc3RDaGlsZCA6IG51bGw7XG4gICAgY29uc3QgbWF0Y2ggPSBoZWFkICYmIGhlYWQubm9kZVR5cGUgPT09IE5vZGUuVEVYVF9OT0RFID8gQUxFUlRfTUFSS0VSX1JFLmV4ZWMoaGVhZC50ZXh0Q29udGVudCkgOiBudWxsO1xuICAgIGlmICghbWF0Y2gpIHJldHVybjtcbiAgICBjb25zdCB0eXBlID0gbWF0Y2hbMV0udG9Mb3dlckNhc2UoKTtcbiAgICBoZWFkLnRleHRDb250ZW50ID0gaGVhZC50ZXh0Q29udGVudC5zbGljZShtYXRjaFswXS5sZW5ndGgpO1xuICAgIGlmICghaGVhZC50ZXh0Q29udGVudCAmJiBoZWFkLm5leHRTaWJsaW5nICYmIGhlYWQubmV4dFNpYmxpbmcubm9kZU5hbWUgPT09ICdCUicpIGhlYWQubmV4dFNpYmxpbmcucmVtb3ZlKCk7XG4gICAgaWYgKCFmaXJzdC50ZXh0Q29udGVudC50cmltKCkgJiYgIWZpcnN0LnF1ZXJ5U2VsZWN0b3IoJ2ltZywgLmx1Y2l2by1tYXRoJykpIGZpcnN0LnJlbW92ZSgpO1xuXG4gICAgY29uc3QgYWxlcnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBhbGVydC5jbGFzc05hbWUgPSBgbWQtYWxlcnQgbWQtYWxlcnQtJHt0eXBlfWA7XG4gICAgYWxlcnQuc2V0QXR0cmlidXRlKCdyb2xlJywgJ25vdGUnKTtcbiAgICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3AnKTtcbiAgICB0aXRsZS5jbGFzc05hbWUgPSAnbWQtYWxlcnQtdGl0bGUnO1xuICAgIGNvbnN0IGljb24gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgaWNvbi5jbGFzc05hbWUgPSAnbWQtYWxlcnQtaWNvbic7XG4gICAgaWNvbi5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICB0aXRsZS5hcHBlbmQoaWNvbiwgQUxFUlRfTEFCRUxTW3R5cGVdKTtcbiAgICBhbGVydC5hcHBlbmQodGl0bGUsIC4uLnF1b3RlLmNoaWxkTm9kZXMpO1xuICAgIHF1b3RlLnJlcGxhY2VXaXRoKGFsZXJ0KTtcbiAgfSk7XG59XG5cbi8vIOOCteODi+OCv+OCpOOCuuW+jOOBriBIVE1MIOOBq+WFpeOCjOOBn+e9ruOBjeWgtOaJgOOBuOaPj+eUu+OBmeOCi+OAgnRydXN0OiBmYWxzZSDjgafjgIHjg6rjg7Pjgq/jgoTku7vmhI/jga7lsZ7mgKfjgpLkvZzjgovjgrPjg57jg7Pjg4njga/mj4/nlLvjgZfjgarjgYRcbi8vIEthVGVYIOOBr+OAgeaVsOW8j+OBjOWIneOCgeOBpuePvuOCjOOBn+OBqOOBjeOBq+iqreOBv+i+vOOCgOOAguiqreOBv+i+vOOCgeOBquOBkeOCjOOBsOe9ruOBjeWgtOaJgOOBruWOn+aWh+OBruOBvuOBvu+8iERELU1BVEgtMDIy77yJ44CCXG4vLyBWaXN1YWzjg6Ljg7zjg4njgafjga8geCDjga7plqLmlbDjga7mlbDlvI/jgpLmpJzlh7rjgZfjgIFQTkcg44Op44K544K/44O855S75YOP44Gu6KOc6Laz44Kw44Op44OV44KS5pWw5byP44Go5L216KiY44GZ44KL77yIRlItMDQ4LCBERC1WVFBMLTE0NO+8iVxuZnVuY3Rpb24gcmVuZGVyTWF0aChjb250YWluZXIpIHtcbiAgY29uc3QgdGFyZ2V0cyA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcubHVjaXZvLW1hdGgnKTtcbiAgaWYgKHRhcmdldHMubGVuZ3RoID09PSAwKSByZXR1cm47XG4gIGlmICghd2luZG93LmthdGV4KSB7XG4gICAgbG9hZExpYnJhcnkoJ2thdGV4JykudGhlbihvayA9PiB7IGlmIChvayAmJiBjb250YWluZXIuaXNDb25uZWN0ZWQpIHJlbmRlck1hdGgoY29udGFpbmVyKTsgfSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGlzVmlzdWFsU3RhZ2UgPSBzdGF0ZS5pc1Zpc3VhbE1vZGUgJiYgY29udGFpbmVyLmlkID09PSAndmlzdWFsLXN0YWdlLWNvbnRhaW5lcic7XG4gIHRhcmdldHMuZm9yRWFjaChlbCA9PiB7XG4gICAgY29uc3QgaXNEaXNwbGF5ID0gZWwuZGF0YXNldC5kaXNwbGF5ID09PSAndHJ1ZSc7XG4gICAgY29uc3QgdGV4ID0gZWwuZGF0YXNldC50ZXggfHwgJyc7XG4gICAgY29uc3Qga2V5ID0gYCR7aXNEaXNwbGF5ID8gJ0QnIDogJ0knfToke3RleH1gO1xuICAgIGlmICghbWF0aENhY2hlLmhhcyhrZXkpKSB7XG4gICAgICBtYXRoQ2FjaGUuc2V0KGtleSwga2F0ZXgucmVuZGVyVG9TdHJpbmcodGV4LCB7XG4gICAgICAgIGRpc3BsYXlNb2RlOiBpc0Rpc3BsYXksXG4gICAgICAgIHRocm93T25FcnJvcjogZmFsc2UsXG4gICAgICAgIHRydXN0OiBmYWxzZSxcbiAgICAgICAgb3V0cHV0OiAnaHRtbEFuZE1hdGhtbCdcbiAgICAgIH0pKTtcbiAgICB9XG4gICAgY29uc3Qga2F0ZXhIdG1sID0gbWF0aENhY2hlLmdldChrZXkpO1xuICAgIGNvbnN0IHBsb3RTcGVjID0gaXNWaXN1YWxTdGFnZSAmJiAhZWwuY2xvc2VzdCgnc3ZnJykgPyBnZXRUZXhQbG90U3BlYyh0ZXgpIDogbnVsbDtcbiAgICBpZiAocGxvdFNwZWMpIHtcbiAgICAgIGNvbnN0IGRhdGFVcmwgPSBnZXRDYWNoZWRNYXRoUGxvdERhdGFVcmwocGxvdFNwZWMsIGlzRGlzcGxheSwgc3RhdGUuaW5mb2dyYXBoaWNTdHlsZSwgc3RhdGUuYXBwZWFyYW5jZSwgdGV4KTtcbiAgICAgIGNvbnN0IGJveCA9IGlzRGlzcGxheSA/IE1BVEhfUExPVF9CT1guYmxvY2sgOiBNQVRIX1BMT1RfQk9YLmlubGluZTtcbiAgICAgIGNvbnN0IGFyaWEgPSBg6Zai5pWw44Gu6KOc6Laz44Kw44Op44OVOiAke3Bsb3RTcGVjLmZucy5tYXAoZiA9PiBmLmxhYmVsKS5qb2luKCcsICcpfWA7XG4gICAgICBlbC5jbGFzc0xpc3QuYWRkKCdoYXMtbWF0aC1wbG90JywgaXNEaXNwbGF5ID8gJ2lzLWJsb2NrLXBsb3QnIDogJ2lzLWlubGluZS1wbG90Jyk7XG4gICAgICBjb25zdCB0YWcgPSBpc0Rpc3BsYXkgPyAnZGl2JyA6ICdzcGFuJztcbiAgICAgIGVsLmlubmVySFRNTCA9IGA8JHt0YWd9IGNsYXNzPVwidnMtbWF0aC1mb3JtdWxhXCI+JHtrYXRleEh0bWx9PC8ke3RhZ30+YFxuICAgICAgICArIGA8aW1nIGNsYXNzPVwidnMtbWF0aC1wbG90LWltZyR7aXNEaXNwbGF5ID8gJycgOiAnIGlzLWlubGluZSd9XCIgc3JjPVwiJHtkYXRhVXJsfVwiIHdpZHRoPVwiJHtib3gud31cIiBoZWlnaHQ9XCIke2JveC5ofVwiIGFsdD1cIiR7ZXNjYXBlSHRtbChhcmlhKX1cIiAvPmA7XG4gICAgfSBlbHNlIHtcbiAgICAgIGVsLmNsYXNzTGlzdC5yZW1vdmUoJ2hhcy1tYXRoLXBsb3QnLCAnaXMtYmxvY2stcGxvdCcsICdpcy1pbmxpbmUtcGxvdCcpO1xuICAgICAgZWwuaW5uZXJIVE1MID0ga2F0ZXhIdG1sO1xuICAgIH1cbiAgfSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICBZQU1MIOODleODreODs+ODiOODnuOCv+ODvO+8iEZSLTAxMe+8iTog5YWI6aCt44KS5YiH44KK5Ye644GX44CB6KGo56S644GZ44KL44Go44GN44Gv6KGM5Y2Y5L2N44Gn6Imy5YiG44GR44GZ44KLXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8g5paH5pu444Gu5YWI6aCt44Gg44GR44KS6Kq/44G544KL44CC6ZaJ44GY44Gu6KGM44GM44Gq44GE5aC05ZCI44Gv44CB5YWI6aCt44Gu5rC05bmz57ea44KS6Zqg44GV44Gq44GE44KI44GG5LiA6Ie044GV44Gb44Gq44GE77yIREQtRk0tMDAx77yJXG5mdW5jdGlvbiBzcGxpdEZyb250TWF0dGVyKHRleHQpIHtcbiAgY29uc3QgbSA9IC9eLS0tWyBcXHRdKlxccj9cXG4oPzooW1xcc1xcU10qPylcXHI/XFxuKT8oPzotLS18XFwuXFwuXFwuKVsgXFx0XSooPzpcXHI/XFxufCQpLy5leGVjKHRleHQpO1xuICBpZiAoIW0pIHJldHVybiB7IHlhbWw6IG51bGwsIGJvZHk6IHRleHQgfTtcbiAgcmV0dXJuIHsgeWFtbDogbVsxXSB8fCAnJywgYm9keTogdGV4dC5zbGljZShtWzBdLmxlbmd0aCkgfTtcbn1cblxuLy8gWUFNTCDjga/op6PmnpDjgZvjgZrjgIHjgrPjg6Hjg7Pjg4jjg7vjgq3jg7zjg7vlgKTjgpLooYzjgZTjgajjgavoibLliIbjgZHjgZnjgovvvIhERC1GTS0wMjHvvInjgILlkITpg6jliIbjga/jgqjjgrnjgrHjg7zjg5fjgZfjgabjgYvjgonlm7LjgoBcbmZ1bmN0aW9uIGhpZ2hsaWdodFlhbWxMaW5lKGxpbmUpIHtcbiAgaWYgKC9eXFxzKiMvLnRlc3QobGluZSkpIHJldHVybiBgPHNwYW4gY2xhc3M9XCJmbS1jb21tZW50XCI+JHtlc2NhcGVIdG1sKGxpbmUpfTwvc3Bhbj5gO1xuICBjb25zdCBtID0gL14oXFxzKig/Oi1cXHMrKT8pKFteXFxzIzpdW146XSo/KSg6KShcXHMuKnwkKS8uZXhlYyhsaW5lKTtcbiAgaWYgKG0pIHtcbiAgICByZXR1cm4gYCR7ZXNjYXBlSHRtbChtWzFdKX08c3BhbiBjbGFzcz1cImZtLWtleVwiPiR7ZXNjYXBlSHRtbChtWzJdKX08L3NwYW4+JHtlc2NhcGVIdG1sKG1bM10pfTxzcGFuIGNsYXNzPVwiZm0tdmFsdWVcIj4ke2VzY2FwZUh0bWwobVs0XSl9PC9zcGFuPmA7XG4gIH1cbiAgcmV0dXJuIGA8c3BhbiBjbGFzcz1cImZtLXZhbHVlXCI+JHtlc2NhcGVIdG1sKGxpbmUpfTwvc3Bhbj5gO1xufVxuXG5mdW5jdGlvbiBidWlsZEZyb250TWF0dGVySHRtbCh5YW1sKSB7XG4gIGNvbnN0IGJvZHkgPSB5YW1sLnNwbGl0KC9cXHI/XFxuLykubWFwKGhpZ2hsaWdodFlhbWxMaW5lKS5qb2luKCdcXG4nKTtcbiAgcmV0dXJuIGA8c2VjdGlvbiBjbGFzcz1cImZyb250LW1hdHRlclwiPjxkaXYgY2xhc3M9XCJmcm9udC1tYXR0ZXItbGFiZWxcIj5Gcm9udCBNYXR0ZXI8L2Rpdj48cHJlIGNsYXNzPVwiZnJvbnQtbWF0dGVyLWJvZHlcIj48Y29kZT4ke2JvZHl9PC9jb2RlPjwvcHJlPjwvc2VjdGlvbj5cXG5gO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAgU1ZHIOODneOCueODiOODl+ODreOCu+ODg+OCtSAo6YCa5bi444Oi44O844OJIHZzIOODquODleOCoeODrOODs+OCuTTlpKfjgqTjg7Pjg5XjgqnjgrDjg6njg5XjgqPjg4Pjgq8pXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuXG4vLyBTVkcg5YaF44GuIGlkIOOCkiBTVkcg44GU44Go44Gr5LiA5oSP44Gr44GX44CBdXJsKCPigKYp44O7aHJlZuODu2FyaWEg5Y+C54Wn44KS5pu444GN5o+b44GI44KL44CCXG4vLyBNZXJtYWlkIOOBr+OCt+ODvOOCseODs+OCueWbs+OBruefouOBmOOCiu+8iCNhcnJvd2hlYWTvvInjgarjganjgpLlm7PjgpLjgb7jgZ/jgYTjgaflkIzjgZggaWQg44Gn5Ye65Yqb44GZ44KL44Gf44KB44CBXG4vLyDlkIzjgZjjg5rjg7zjgrjjgavopIfmlbDjga7lm7PjgYzjgYLjgovjgajjgIHliKXjga7lm7PvvIjpnZ7ooajnpLrjga7jgoLjga7jgpLlkKvjgoDvvInjga7jg57jg7zjgqvjg7zjgoTjgrDjg6njg4fjg7zjgrfjg6fjg7PjgpLlj4LnhafjgZfjgabjgZfjgb7jgYZcbmZ1bmN0aW9uIHNjb3BlU3ZnSWRzKHN2Zykge1xuICBjb25zdCBwcmVmaXggPSBzdmcuaWQgfHwgYGx1Y2l2by0ke01hdGgucmFuZG9tKCkudG9TdHJpbmcoMzYpLnNsaWNlKDIsIDkpfWA7XG4gIGNvbnN0IGlkTWFwID0gbmV3IE1hcCgpO1xuICBjb25zdCB1c2VkID0gbmV3IFNldCgpO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnW2lkXScpLmZvckVhY2goZWwgPT4ge1xuICAgIC8vIE1lcm1haWQg44GMIDEg44Gk44Gu5Zuz44Gu5Lit44Gn5ZCM44GYIGlkIOOCkuWHuuOBmeOBk+OBqO+8iOOCv+OCpOODoOODqeOCpOODs+OBriBub2RlLXVuZGVmaW5lZCDjgarjganvvInjgYzjgYLjgovjgZ/jgoHjgIFcbiAgICAvLyAyIOOBpOebruS7pemZjeOBq+OBr+mAo+eVquOCkuS7mOOBkeOCi+OAguWPgueFp+OBr+acgOWIneOBruimgee0oOOBq+WQkeOBkeOBn+OBvuOBvuOBq+OBmeOCi+OAglxuICAgIC8vIE1lcm1haWQg44Gv5Zuz44GuIGlkIOOCkuaOpemgrei+nuOBq+S7mOOBkeOBnyBpZCDjgoLlh7rjgZnjga7jgafjgIHjgZ3jgozjgavjga/mjqXpoK3ovp7jgpLph43jga3jgarjgYRcbiAgICBjb25zdCBiYXNlID0gZWwuaWQuc3RhcnRzV2l0aChwcmVmaXgpID8gZWwuaWQgOiBgJHtwcmVmaXh9LSR7ZWwuaWR9YDtcbiAgICBsZXQgc2NvcGVkID0gYmFzZTtcbiAgICBmb3IgKGxldCBuID0gMjsgdXNlZC5oYXMoc2NvcGVkKTsgbisrKSBzY29wZWQgPSBgJHtiYXNlfS0ke259YDtcbiAgICB1c2VkLmFkZChzY29wZWQpO1xuICAgIGlmICghaWRNYXAuaGFzKGVsLmlkKSkgaWRNYXAuc2V0KGVsLmlkLCBzY29wZWQpO1xuICAgIGVsLmlkID0gc2NvcGVkO1xuICB9KTtcbiAgaWYgKGlkTWFwLnNpemUgPT09IDApIHJldHVybjtcblxuICBjb25zdCBhcmlhUmVmcyA9IFsnYXJpYS1sYWJlbGxlZGJ5JywgJ2FyaWEtZGVzY3JpYmVkYnknXTtcbiAgc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJyonKS5mb3JFYWNoKGVsID0+IHtcbiAgICBBcnJheS5mcm9tKGVsLmF0dHJpYnV0ZXMpLmZvckVhY2goYXR0ciA9PiB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGF0dHIudmFsdWU7XG4gICAgICBpZiAodmFsdWUuaW5jbHVkZXMoJ3VybCgnKSkge1xuICAgICAgICAvLyBzdHlsZSDlsZ7mgKfjga8gdXJsKFwiI2lkXCIpIOOBruOCiOOBhuOBq+W8leeUqOespuS7mOOBjeOBp+abuOOBjeWHuuOBleOCjOOCi+OBn+OCgeOAgeW8leeUqOespuOBruacieeEoeOCkuWVj+OCj+OBquOBhFxuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUoYXR0ci5uYW1lLCB2YWx1ZS5yZXBsYWNlKC91cmxcXChcXHMqKFsnXCJdPykjKFteKSdcIlxcc10rKVxcMVxccypcXCkvZywgKG0sIHEsIGlkKSA9PiAoaWRNYXAuaGFzKGlkKSA/IGB1cmwoIyR7aWRNYXAuZ2V0KGlkKX0pYCA6IG0pKSk7XG4gICAgICB9IGVsc2UgaWYgKChhdHRyLm5hbWUgPT09ICdocmVmJyB8fCBhdHRyLm5hbWUgPT09ICd4bGluazpocmVmJykgJiYgdmFsdWUuc3RhcnRzV2l0aCgnIycpICYmIGlkTWFwLmhhcyh2YWx1ZS5zbGljZSgxKSkpIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgYCMke2lkTWFwLmdldCh2YWx1ZS5zbGljZSgxKSl9YCk7XG4gICAgICB9IGVsc2UgaWYgKGFyaWFSZWZzLmluY2x1ZGVzKGF0dHIubmFtZSkpIHtcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKGF0dHIubmFtZSwgdmFsdWUuc3BsaXQoL1xccysvKS5tYXAoaWQgPT4gaWRNYXAuZ2V0KGlkKSB8fCBpZCkuam9pbignICcpKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbi8vIOOCt+ODvOOCseODs+OCueWbs+OBruODqeOCpOODleODqeOCpOODs+ODu+a0u+aAp+WMuumWk+ODu+ODoeODg+OCu+ODvOOCuOe3muODu+efouOBmOOCiuOCkuOAgeiDjOaZr+OBqOimi+WIhuOBkeOCieOCjOOCi+mFjeiJsuOBq+OBmeOCi++8iE5GUi0wMDTvvIlcbmZ1bmN0aW9uIHN0eWxlU2VxdWVuY2VEaWFncmFtKHN2ZywgY29sb3JzKSB7XG4gIC8vIE1lcm1haWQg44Gv44Op44Kk44OV44Op44Kk44Oz44GuIGNsYXNzIOOBqyBcIjIwMFwiIOOCkuWQq+OCgeOBpuWHuuWKm+OBmeOCi++8iDEwLjkg57O744GvIFwiMjAwXCLjgIExMi4zLjAg44GvIFwiYWN0b3ItbGluZSAyMDBcIu+8ieOBn+OCgeOAgWlkIOOBp+OCguaLvuOBhlxuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnbGluZVtpZF49XCJhY3RvclwiXSwgbGluZVtjbGFzc349XCIyMDBcIl0sIGxpbmUuYWN0b3ItbGluZScpLmZvckVhY2gobGluZSA9PiB7XG4gICAgbGluZS5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgY29sb3JzLmxpZmVsaW5lLCAnaW1wb3J0YW50Jyk7XG4gICAgbGluZS5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzEuMjVweCcsICdpbXBvcnRhbnQnKTtcbiAgICBsaW5lLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UtZGFzaGFycmF5JywgJzUgNCcsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdyZWN0W2NsYXNzXj1cImFjdGl2YXRpb25cIl0nKS5mb3JFYWNoKHJlY3QgPT4ge1xuICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCBjb2xvcnMuYWN0aXZhdGlvbkJnLCAnaW1wb3J0YW50Jyk7XG4gICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgY29sb3JzLmFjdGl2YXRpb25Cb3JkZXIsICdpbXBvcnRhbnQnKTtcbiAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2Utd2lkdGgnLCAnMS41cHgnLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnbGluZS5tZXNzYWdlTGluZTAsIGxpbmUubWVzc2FnZUxpbmUxJykuZm9yRWFjaChsaW5lID0+IHtcbiAgICBsaW5lLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCBjb2xvcnMuc2lnbmFsLCAnaW1wb3J0YW50Jyk7XG4gICAgbGluZS5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzJweCcsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG4gIC8vIOW/nOetlO+8iC0tPj7vvInjga7noLTnt5rjga/mhI/lkbPjgpLmjIHjgaTjgZ/jgoHjgIHnt5rjga7lpKrjgZXjgavlkIjjgo/jgZvjgabplpPpmpTjgaDjgZHluoPjgZLjgotcbiAgc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJ2xpbmUubWVzc2FnZUxpbmUxJykuZm9yRWFjaChsaW5lID0+IHtcbiAgICBsaW5lLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UtZGFzaGFycmF5JywgJzYgNCcsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdtYXJrZXIgcGF0aCwgbWFya2VyIGNpcmNsZScpLmZvckVhY2gobSA9PiB7XG4gICAgbS5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGNvbG9ycy5zaWduYWwsICdpbXBvcnRhbnQnKTtcbiAgICBtLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCBjb2xvcnMuc2lnbmFsLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICAvLyBhdXRvbnVtYmVyIOOBrueVquWPt+OBr+efouOBmOOCiuOBqOWQjOOBmOiJsuOBruWGhuOBruS4iuOBq+i8ieOCi+OBn+OCgeOAgeWGhuOBqOWvvuavlOOBmeOCi+iJsuOBq+OBmeOCi1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgndGV4dC5zZXF1ZW5jZU51bWJlcicpLmZvckVhY2godCA9PiB7XG4gICAgdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGNvbG9ycy5udW1iZXJUZXh0LCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICAvLyBNZXJtYWlkIOOBr+ODoeODg+OCu+ODvOOCuOOBruaVsOW8j++8iFNWRyDnm7TkuIvjga4gZm9yZWlnbk9iamVjdO+8ieOBruS4i+err+OCkuODoeODg+OCu+ODvOOCuOe3muOBq+OBneOCjeOBiOOCi+OBn+OCgeOAgVxuICAvLyDmt7vlrZfjgoTliIbmr43jgYznt5rjgavph43jgarjgovjgILnt5rjgYvjgonpm6LjgozjgovjgojjgYbkuIrjgbjjgZrjgonjgZnvvIhERC1ESUFHLTAzMe+8iVxuICAvLyDmlbDlvI/vvIhNYXRoTUzvvInjga/jg5rjg7zjgrjjga7mloflrZfoibLjgpLntpnmib/jgZfjgIFWaXN1YWwgU3RhZ2Ug44GuIERhcmsg44Gn44Gv5piO44KL44GE44Kr44O844OJ44Gu5LiK44Gn55m95paH5a2X44Gr44Gq44KL44Gf44KB44CB6Imy44KC5oyH5a6a44GZ44KLXG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCc6c2NvcGUgPiBmb3JlaWduT2JqZWN0JykuZm9yRWFjaChmbyA9PiB7XG4gICAgZm8uc2V0QXR0cmlidXRlKCd5JywgU3RyaW5nKHBhcnNlRmxvYXQoZm8uZ2V0QXR0cmlidXRlKCd5JykgfHwgJzAnKSAtIFNFUVVFTkNFX01BVEhfTElGVCkpO1xuICAgIGZvLnF1ZXJ5U2VsZWN0b3JBbGwoJzpzY29wZSA+IGRpdicpLmZvckVhY2goZGl2ID0+IGRpdi5zdHlsZS5zZXRQcm9wZXJ0eSgnY29sb3InLCBjb2xvcnMubWVzc2FnZVRleHQsICdpbXBvcnRhbnQnKSk7XG4gIH0pO1xufVxuXG4vLyBGaXQg6KGo56S644Gn44CB5Zuz44Gu5Lit44Gu5pyA44KC5bCP44GV44GE5paH5a2X44GMIE1JTl9GSVRfRk9OVF9QWCDmnKrmuoDjgavjgarjgovjgbvjganjga/nuK7lsI/jgZfjgarjgYTvvIhERC1ESUFHLTAzMO+8ieOAglxuLy8g5paH5a2X44Gu5aSn44GN44GV44Gv6KiI566X5b6M44Gu44K544K/44Kk44Or44Gn6Kq/44G544KL44Gf44KB44CB5Zuz44KSIERPTSDjgavlhaXjgozjgZ/lvozjgavlkbzjgbZcbi8vIOOBguOCj+OBm+OBpuOAgeWwj+OBleOBquWbs+OCkuaeoOOBruW5heOBvuOBp+aLoeWkp+OBl+OBmeOBjuOBquOBhOOCiOOBhuOAgeaLoeWkp+OBruS4iumZkO+8iE1BWF9GSVRfU0NBTEXvvInjgpIgQ1NTIOWkieaVsOOBp+a4oeOBmeOAglxuLy8g6KiI566X57WQ5p6c44Gv5o+P55S757WQ5p6c44Gu44Kt44Oj44OD44K344Ol44Gu44Kt44O844GU44Go44Gr5L+d5a2Y44GX44CB44Kt44Oj44OD44K344Ol44GL44KJ6KGo56S644GZ44KL44Go44GN44Gv6KiI566X44GX55u044GV44Gq44GEXG5mdW5jdGlvbiBhcHBseVJlYWRhYmxlRml0KHN2ZywgY2FjaGVLZXkpIHtcbiAgY29uc3Qgdmlld0JveCA9IHN2ZyAmJiBzdmcudmlld0JveCAmJiBzdmcudmlld0JveC5iYXNlVmFsO1xuICBpZiAoIXZpZXdCb3ggfHwgIXZpZXdCb3gud2lkdGgpIHJldHVybjtcbiAgbGV0IGZpdCA9IGNhY2hlS2V5ICYmIGZpdENhY2hlLmdldChjYWNoZUtleSk7XG4gIGlmICghZml0KSB7XG4gICAgY29uc3Qgc2l6ZXMgPSBBcnJheS5mcm9tKHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0LCB0c3BhbiwgZm9yZWlnbk9iamVjdCAqJykpXG4gICAgICAuZmlsdGVyKGVsID0+ICFlbC5jbG9zZXN0KCdtYXRoJykgJiYgQXJyYXkuZnJvbShlbC5jaGlsZE5vZGVzKS5zb21lKG4gPT4gbi5ub2RlVHlwZSA9PT0gTm9kZS5URVhUX05PREUgJiYgbi50ZXh0Q29udGVudC50cmltKCkpKVxuICAgICAgLm1hcChlbCA9PiBwYXJzZUZsb2F0KGdldENvbXB1dGVkU3R5bGUoZWwpLmZvbnRTaXplKSlcbiAgICAgIC5maWx0ZXIoc2l6ZSA9PiBzaXplID4gMCk7XG4gICAgY29uc3QgbWluU2NhbGUgPSBzaXplcy5sZW5ndGggPyBNYXRoLm1pbigxLCBNSU5fRklUX0ZPTlRfUFggLyBNYXRoLm1pbiguLi5zaXplcykpIDogMDtcbiAgICBmaXQgPSB7XG4gICAgICBuYXR1cmFsV2lkdGg6IE1hdGguY2VpbCh2aWV3Qm94LndpZHRoKSxcbiAgICAgIG1pbldpZHRoOiBNYXRoLmNlaWwodmlld0JveC53aWR0aCAqIG1pblNjYWxlKSxcbiAgICAgIG1heFdpZHRoOiBNYXRoLmNlaWwodmlld0JveC53aWR0aCAqIE1BWF9GSVRfU0NBTEUpXG4gICAgfTtcbiAgICBpZiAoY2FjaGVLZXkpIGZpdENhY2hlLnNldChjYWNoZUtleSwgZml0KTtcbiAgfVxuICBpZiAoZml0Lm1pbldpZHRoKSBzdmcuc3R5bGUubWluV2lkdGggPSBgJHtmaXQubWluV2lkdGh9cHhgO1xuICBzdmcuc3R5bGUuc2V0UHJvcGVydHkoJy0tZml0LW1heC13aWR0aCcsIGAke2ZpdC5tYXhXaWR0aH1weGApO1xuICBzdmcuc3R5bGUuc2V0UHJvcGVydHkoJy0tbmF0dXJhbC13aWR0aCcsIGAke2ZpdC5uYXR1cmFsV2lkdGh9cHhgKTtcbiAgdXBkYXRlU2xhYlNwbGl0KHN2Zy5jbG9zZXN0KCcuZXhoaWJpdGlvbi1zbGFiLXNwbGl0JykpO1xufVxuXG4vLyAyIOautee1hOOBv+OCueODqeODluOBp+OAgeWPs+OCq+ODqeODoOOBruihqOekuuaeoOOCiOOCiuWbs+OBjOW6g+OBhOWgtOWQiOOAgeOBvuOBn+OBryAxOjHvvIjlrp/lr7jvvInooajnpLrjgavliIfjgormm7/jgYjjgZ/loLTlkIjjga8gMSDmrrXntYTjgb/vvIhpcy1zdGFja2Vk77yJ44Gr5YiH44KK5pu/44GI44KL77yIRlItMDE1LCBERC1ESUFHLTA0Mu+8iVxuZnVuY3Rpb24gdXBkYXRlU2xhYlNwbGl0KHNsYWIpIHtcbiAgaWYgKCFzbGFiIHx8ICFzbGFiLmNsYXNzTGlzdC5jb250YWlucygnZXhoaWJpdGlvbi1zbGFiLXNwbGl0JykpIHJldHVybjtcbiAgY29uc3QgdnAgPSBzbGFiLnF1ZXJ5U2VsZWN0b3IoJy5leGhpYml0aW9uLXZpZXdwb3J0Jyk7XG4gIGlmICghdnAgfHwgIXZwLnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IHN2ZycpKSByZXR1cm47XG4gIHNsYWIuY2xhc3NMaXN0LnJlbW92ZSgnaXMtc3RhY2tlZCcpO1xuICBpZiAodnAuY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1hY3R1YWwtc2l6ZScpIHx8IHZwLnNjcm9sbFdpZHRoID4gdnAuY2xpZW50V2lkdGggKyAxKSB7XG4gICAgc2xhYi5jbGFzc0xpc3QuYWRkKCdpcy1zdGFja2VkJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlQWxsU2xhYlNwbGl0cyhjb250YWluZXIpIHtcbiAgaWYgKCFjb250YWluZXIpIHJldHVybjtcbiAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5leGhpYml0aW9uLXNsYWItc3BsaXQnKS5mb3JFYWNoKHVwZGF0ZVNsYWJTcGxpdCk7XG59XG5cbi8vIHBhdGgg44GuIGTvvIjntbblr77luqfmqJnvvInjgYzlm7LjgoDnr4Tlm7LjgILmm7Lnt5rjga7liLblvqHngrnjgoLlkKvjgoDjga7jgafjgIHjgo/jgZrjgYvjgavlpKfjgY3jgY/jgarjgovjgZPjgajjgYzjgYLjgotcbmZ1bmN0aW9uIHBhdGhCb3gocGF0aCkge1xuICBjb25zdCBwb2ludHMgPSBBcnJheS5mcm9tKChwYXRoICYmIHBhdGguZ2V0QXR0cmlidXRlKCdkJykgfHwgJycpLm1hdGNoQWxsKC8oLT9bXFxkLl0rKVtcXHMsXSsoLT9bXFxkLl0rKS9nKSk7XG4gIGlmICghcG9pbnRzLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHhzID0gcG9pbnRzLm1hcChwID0+IHBhcnNlRmxvYXQocFsxXSkpO1xuICBjb25zdCB5cyA9IHBvaW50cy5tYXAocCA9PiBwYXJzZUZsb2F0KHBbMl0pKTtcbiAgY29uc3QgeCA9IE1hdGgubWluKC4uLnhzKTtcbiAgY29uc3QgeSA9IE1hdGgubWluKC4uLnlzKTtcbiAgcmV0dXJuIHsgeCwgeSwgd2lkdGg6IE1hdGgubWF4KC4uLnhzKSAtIHgsIGhlaWdodDogTWF0aC5tYXgoLi4ueXMpIC0geSB9O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVTdmdFbGVtZW50KHRhZywgYXR0cnMpIHtcbiAgY29uc3QgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgdGFnKTtcbiAgT2JqZWN0LmVudHJpZXMoYXR0cnMpLmZvckVhY2goKFtuYW1lLCB2YWx1ZV0pID0+IGVsLnNldEF0dHJpYnV0ZShuYW1lLCBTdHJpbmcodmFsdWUpKSk7XG4gIHJldHVybiBlbDtcbn1cblxuLy8gTWVybWFpZCAxMiDjga/jgrnjgr/jgrjjgqLjg6DlvaLjga7jg47jg7zjg4njgpIgcGF0aCDjgaflh7rlipvjgZnjgovjgILlm7Pjga7oo4Xpo77jga8gcmVjdCDjgpLliY3mj5DjgavjgZnjgovjga7jgafjgIFyZWN0IOOBq+e9ruOBjeaPm+OBiOOCi1xuZnVuY3Rpb24gbm9ybWFsaXplU3RhZGl1bU5vZGVzKHN2Zykge1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZy5ub2RlID4gZy5iYXNpYy5sYWJlbC1jb250YWluZXIub3V0ZXItcGF0aCcpLmZvckVhY2goZ3JvdXAgPT4ge1xuICAgIGNvbnN0IHBhdGggPSBncm91cC5xdWVyeVNlbGVjdG9yKCdwYXRoJyk7XG4gICAgY29uc3QgYm94ID0gcGF0aEJveChwYXRoKTtcbiAgICBpZiAoIWJveCkgcmV0dXJuO1xuICAgIGNvbnN0IHJlY3QgPSBjcmVhdGVTdmdFbGVtZW50KCdyZWN0JywgeyBjbGFzczogJ2Jhc2ljIGxhYmVsLWNvbnRhaW5lcicsIC4uLmJveCwgcng6IGJveC5oZWlnaHQgLyAyLCByeTogYm94LmhlaWdodCAvIDIgfSk7XG4gICAgaWYgKHBhdGguZ2V0QXR0cmlidXRlKCdzdHlsZScpKSByZWN0LnNldEF0dHJpYnV0ZSgnc3R5bGUnLCBwYXRoLmdldEF0dHJpYnV0ZSgnc3R5bGUnKSk7XG4gICAgZ3JvdXAucmVwbGFjZVdpdGgocmVjdCk7XG4gIH0pO1xufVxuXG4vLyBNZXJtYWlkIDEyIOOBr+eKtuaFi+mBt+enu+Wbs+OBruWIhuWykO+8iGNob2ljZe+8ieOBqOODleOCqeODvOOCr+ODu+OCuOODp+OCpOODs++8iGZvcmsgLyBqb2lu77yJ44KSIHBhdGgg44Gn5Ye65Yqb44GZ44KL44CCXG4vLyDlm7Pjga7oo4Xpo77jgaggQ1NTIOOBryAxMCDns7vjga4gcG9seWdvbi5zdGF0ZS1zdGFydCDjgaggcmVjdC5mb3JrLWpvaW4g44KS5YmN5o+Q44Gr44GZ44KL44Gu44Gn44CB572u44GN5o+b44GI44KLXG5mdW5jdGlvbiBub3JtYWxpemVTdGF0ZU5vZGVzKHN2Zykge1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZy5ub2RlLnN0YXRlZGlhZ3JhbS1zdGF0ZScpLmZvckVhY2gobm9kZSA9PiB7XG4gICAgY29uc3QgZ3JvdXAgPSBub2RlLnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IGc6bm90KC5sYWJlbCknKTtcbiAgICBpZiAoIWdyb3VwIHx8IG5vZGUucXVlcnlTZWxlY3RvcigndGV4dCwgZm9yZWlnbk9iamVjdCwgcmVjdCwgY2lyY2xlJykpIHJldHVybjtcbiAgICBjb25zdCBib3ggPSBwYXRoQm94KGdyb3VwLnF1ZXJ5U2VsZWN0b3IoJ3BhdGgnKSk7XG4gICAgaWYgKCFib3ggfHwgIWJveC53aWR0aCB8fCAhYm94LmhlaWdodCkgcmV0dXJuO1xuICAgIGxldCBzaGFwZTtcbiAgICBpZiAoYm94LmhlaWdodCA8PSAxMiAmJiBib3gud2lkdGggPiBib3guaGVpZ2h0ICogMikge1xuICAgICAgc2hhcGUgPSBjcmVhdGVTdmdFbGVtZW50KCdyZWN0JywgeyBjbGFzczogJ2Zvcmstam9pbicsIC4uLmJveCB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgY3ggPSBib3gueCArIGJveC53aWR0aCAvIDI7XG4gICAgICBjb25zdCBjeSA9IGJveC55ICsgYm94LmhlaWdodCAvIDI7XG4gICAgICBjb25zdCBodyA9IGJveC53aWR0aCAvIDI7XG4gICAgICBjb25zdCBoaCA9IGJveC5oZWlnaHQgLyAyO1xuICAgICAgc2hhcGUgPSBjcmVhdGVTdmdFbGVtZW50KCdwb2x5Z29uJywgeyBjbGFzczogJ3N0YXRlLXN0YXJ0JywgcG9pbnRzOiBgJHtjeH0sJHtjeSArIGhofSAke2N4ICsgaHd9LCR7Y3l9ICR7Y3h9LCR7Y3kgLSBoaH0gJHtjeCAtIGh3fSwke2N5fWAgfSk7XG4gICAgfVxuICAgIGdyb3VwLnJlcGxhY2VXaXRoKHNoYXBlKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIHBvc3RQcm9jZXNzU3ZnKHJhd1N2ZywgaXNWaXN1YWxNb2RlKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHdyYXBwZXIuaW5uZXJIVE1MID0gcmF3U3ZnO1xuICAgIGNvbnN0IHN2ZyA9IHdyYXBwZXIucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgaWYgKCFzdmcpIHJldHVybiByYXdTdmc7XG5cbiAgICBjb25zdCBkaWFncmFtVHlwZSA9IHN2Zy5nZXRBdHRyaWJ1dGUoJ2FyaWEtcm9sZWRlc2NyaXB0aW9uJykgfHwgJyc7XG4gICAgLy8g44Kv44Op44K55Zuz44KE6KaB5Lu25Zuz44Gu566x44KC5ZCM44GY5qeL6YCg44Gn5Ye65Yqb44GV44KM44KL44Gu44Gn44CB44OV44Ot44O844OB44Oj44O844OI44Gr6ZmQ44KLXG4gICAgaWYgKGRpYWdyYW1UeXBlID09PSAnZmxvd2NoYXJ0LXYyJykgbm9ybWFsaXplU3RhZGl1bU5vZGVzKHN2Zyk7XG4gICAgaWYgKGRpYWdyYW1UeXBlID09PSAnc3RhdGVEaWFncmFtJykgbm9ybWFsaXplU3RhdGVOb2RlcyhzdmcpO1xuICAgIGlmIChpc1Zpc3VhbE1vZGUpIHtcbiAgICAgIGRlY29yYXRlVmlzdWFsU3ZnKHN2ZywgZGlhZ3JhbVR5cGUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkZWNvcmF0ZVN0YW5kYXJkU3ZnKHN2ZywgZGlhZ3JhbVR5cGUpO1xuICAgIH1cbiAgICBzY29wZVN2Z0lkcyhzdmcpO1xuICAgIHJldHVybiBzdmcub3V0ZXJIVE1MO1xuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignU1ZHIHBvc3QtcHJvY2Vzc2luZyBmYWlsZWQ6JywgZSk7XG4gICAgcmV0dXJuIHJhd1N2ZztcbiAgfVxufVxuXG4vLyAxLiDpgJrluLjjg6Ljg7zjg4nvvJrnq6/mraPjgarjgqjjg7Pjgrjjg4vjgqLjg6rjg7PjgrDoqK3oqIjlm7Pjgrnjgr/jgqTjg6tcbmZ1bmN0aW9uIGRlY29yYXRlU3RhbmRhcmRTdmcoc3ZnLCBkaWFncmFtVHlwZSkge1xuICBjb25zdCBpc0RhcmsgPSBzdGF0ZS5hcHBlYXJhbmNlID09PSAnZGFyayc7XG4gIGNvbnN0IHNwZWMgPSBnZXRUaGVtZVNwZWMoKTtcbiAgY29uc3QgdGFyZ2V0VGV4dENvbG9yID0gaXNEYXJrID8gJyNGOEZBRkMnIDogJyMwRjE3MkEnO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZm9yZWlnbk9iamVjdCBkaXYsIGZvcmVpZ25PYmplY3Qgc3BhbiwgZm9yZWlnbk9iamVjdCBzbWFsbCwgdGV4dC5hY3RvciwgdGV4dC5ub3RlVGV4dCwgLm5vZGVMYWJlbCwgLnN0YXRlTGFiZWwsIC5tZXNzYWdlVGV4dCwgLmxvb3BUZXh0LCAubGFiZWxUZXh0JykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2NvbG9yJywgdGFyZ2V0VGV4dENvbG9yLCAnaW1wb3J0YW50Jyk7XG4gICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCB0YXJnZXRUZXh0Q29sb3IsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG4gIGlmIChkaWFncmFtVHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgIHN0eWxlU2VxdWVuY2VEaWFncmFtKHN2Zywge1xuICAgICAgbGlmZWxpbmU6IGlzRGFyayA/ICcjOTRBM0I4JyA6ICcjNjQ3NDhCJyxcbiAgICAgIGFjdGl2YXRpb25CZzogaGV4VG9SZ2JhKHNwZWMubm9kZVN0cm9rZSwgaXNEYXJrID8gMC4zIDogMC4xNiksXG4gICAgICBhY3RpdmF0aW9uQm9yZGVyOiBzcGVjLm5vZGVTdHJva2UsXG4gICAgICBzaWduYWw6IHNwZWMuZWRnZVN0cm9rZSxcbiAgICAgIG51bWJlclRleHQ6IGlzRGFyayA/IHNwZWMuY2FudmFzQmcgOiAnI0ZGRkZGRicsXG4gICAgICBtZXNzYWdlVGV4dDogc3BlYy5ub2RlVGV4dFxuICAgIH0pO1xuICB9XG4gIGlmICghTk9ERV9ERUNPUkFURURfVFlQRVMuaW5jbHVkZXMoZGlhZ3JhbVR5cGUpKSByZXR1cm47XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdnLm5vZGU6bm90KC5zdGF0ZWRpYWdyYW0tY2x1c3RlciknKS5mb3JFYWNoKGcgPT4ge1xuICAgIGNvbnN0IHJlY3QgPSBnLnF1ZXJ5U2VsZWN0b3IoJ3JlY3QuYmFzaWMsIHJlY3QubGFiZWwtY29udGFpbmVyJykgfHwgZy5xdWVyeVNlbGVjdG9yKCdyZWN0Jyk7XG4gICAgaWYgKCFyZWN0KSByZXR1cm47XG4gICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J4JywgJzgnKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnOCcpO1xuICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCBzcGVjLm5vZGVCZywgJ2ltcG9ydGFudCcpO1xuICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsIHNwZWMubm9kZVN0cm9rZSwgJ2ltcG9ydGFudCcpO1xuICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZS13aWR0aCcsICcxLjc1cHgnLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnLmVkZ2VQYXRoIHBhdGgucGF0aCwgcGF0aC5mbG93Y2hhcnQtbGluaywgcGF0aC50cmFuc2l0aW9uJykuZm9yRWFjaChwID0+IHtcbiAgICBwLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCBzcGVjLmVkZ2VTdHJva2UsICdpbXBvcnRhbnQnKTtcbiAgICBwLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2Utd2lkdGgnLCAnMnB4JywgJ2ltcG9ydGFudCcpO1xuICB9KTtcbn1cblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gMi4gVmlzdWFsIFN0YWdlIOODouODvOODie+8muOCpOODs+ODleOCqeOCsOODqeODleOCo+ODg+OCr+ODu+OCqOODs+OCuOODs1xuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuZnVuY3Rpb24gZGVjb3JhdGVWaXN1YWxTdmcoc3ZnLCBkaWFncmFtVHlwZSkge1xuICBjb25zdCBzdHlsZU1vZGUgPSBzdGF0ZS5pbmZvZ3JhcGhpY1N0eWxlO1xuICBjb25zdCB2aXN1YWxTcGVjID0gZ2V0RGlhZ3JhbVNwZWModHJ1ZSk7XG5cbiAgY29uc3QgdWlkID0gYWRkVmlzdWFsRGVmcyhzdmcpO1xuXG4gIGlmIChkaWFncmFtVHlwZSA9PT0gJ3NlcXVlbmNlJykge1xuICAgIGRlY29yYXRlVmlzdWFsU2VxdWVuY2Uoc3ZnLCBzdHlsZU1vZGUsIHZpc3VhbFNwZWMsIHVpZCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIOOBneOBruS7luOBruWbs+eoruOBr+OAgeani+mAoOOCkuS/neOBo+OBn+OBvuOBviBzZXR1cE1lcm1haWQg44Gu44K544K/44Kk44Or6YWN6Imy44Gg44GR44Gn5o+P55S744GZ44KL77yIRlItMDA477yJXG4gIGlmICghTk9ERV9ERUNPUkFURURfVFlQRVMuaW5jbHVkZXMoZGlhZ3JhbVR5cGUpKSByZXR1cm47XG5cbiAgLy8g44K144OW44Kw44Op44OV44Gu56Oo44KK44Ks44Op44K544O744OV44Os44O844Og5YyW77yI44Kr44O844OJ6IOM5pmv44Gu5piO5pqX44Gr5ZCI44KP44Gb44KL77yJXG4gIGNvbnN0IGZyb3N0ID0gc3RhdGUuYXBwZWFyYW5jZSA9PT0gJ2RhcmsnID8gJ3JnYmEoMTUsIDIzLCA0MiwgMC41NSknIDogJ3JnYmEoMjU1LCAyNTUsIDI1NSwgMC42NSknO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZy5jbHVzdGVyLCBnLnN0YXRlZGlhZ3JhbS1jbHVzdGVyJykuZm9yRWFjaChjbHVzdGVyID0+IHtcbiAgICBjb25zdCBvdXRlclJlY3QgPSBjbHVzdGVyLnF1ZXJ5U2VsZWN0b3IoJ3JlY3Qub3V0ZXInKSB8fCBjbHVzdGVyLnF1ZXJ5U2VsZWN0b3IoJ3JlY3QnKTtcbiAgICBpZiAob3V0ZXJSZWN0KSB7XG4gICAgICBvdXRlclJlY3Quc2V0QXR0cmlidXRlKCdyeCcsICcxOCcpO1xuICAgICAgb3V0ZXJSZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnMTgnKTtcbiAgICAgIG91dGVyUmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGZyb3N0LCAnaW1wb3J0YW50Jyk7XG4gICAgICBvdXRlclJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsIHZpc3VhbFNwZWMuY2x1c3RlckJvcmRlciwgJ2ltcG9ydGFudCcpO1xuICAgICAgb3V0ZXJSZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2Utd2lkdGgnLCAnMnB4JywgJ2ltcG9ydGFudCcpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgZGVjb3JhdG9ycyA9IHtcbiAgICBzaGFwZXM6IGRlY29yYXRlVmlzdWFsU2hhcGVzLFxuICAgIGNhcmRzOiBkZWNvcmF0ZVZpc3VhbENhcmRzLFxuICAgIGNpcmNsZXM6IGRlY29yYXRlVmlzdWFsQ2lyY2xlcyxcbiAgICBlZGl0b3JpYWw6IGRlY29yYXRlVmlzdWFsRWRpdG9yaWFsXG4gIH07XG4gIGNvbnN0IGRlY29yYXRlID0gZGVjb3JhdG9yc1tzdHlsZU1vZGVdO1xuICBpZiAoZGVjb3JhdGUpIGRlY29yYXRlKHN2ZywgdWlkKTtcblxuICBmaXhNYXJrZXJTY2FsZShzdmcpO1xufVxuXG4vLyBWaXN1YWwgU3RhZ2Ug44Gn5L2/44GG5b2x44O744Kw44Op44OH44O844K344On44Oz44KSIGRlZnMg44Gr6L+95Yqg44GX44CBaWQg44Gu5o6l5bC+6L6e44KS6L+U44GZXG5mdW5jdGlvbiBhZGRWaXN1YWxEZWZzKHN2Zykge1xuICBsZXQgZGVmcyA9IHN2Zy5xdWVyeVNlbGVjdG9yKCdkZWZzJyk7XG4gIGlmICghZGVmcykge1xuICAgIGRlZnMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ2RlZnMnKTtcbiAgICBzdmcuaW5zZXJ0QmVmb3JlKGRlZnMsIHN2Zy5maXJzdENoaWxkKTtcbiAgfVxuXG5cbiAgY29uc3QgdWlkID0gTWF0aC5yYW5kb20oKS50b1N0cmluZygzNikuc2xpY2UoMiwgNyk7XG5cbiAgZGVmcy5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsIGBcbiAgICA8ZmlsdGVyIGlkPVwidmlzLXNvZnQtc2hhZG93LSR7dWlkfVwiIHg9XCItMzAlXCIgeT1cIi0zMCVcIiB3aWR0aD1cIjE2MCVcIiBoZWlnaHQ9XCIxNzAlXCI+XG4gICAgICA8ZmVEcm9wU2hhZG93IGR4PVwiMFwiIGR5PVwiNlwiIHN0ZERldmlhdGlvbj1cIjUuNVwiIGZsb29kLWNvbG9yPVwiIzBGMTcyQVwiIGZsb29kLW9wYWNpdHk9XCIwLjE2XCIgLz5cbiAgICA8L2ZpbHRlcj5cbiAgICA8ZmlsdGVyIGlkPVwidmlzLWNhcmQtc2hhZG93LSR7dWlkfVwiIHg9XCItMjAlXCIgeT1cIi0yMCVcIiB3aWR0aD1cIjE0MCVcIiBoZWlnaHQ9XCIxNTAlXCI+XG4gICAgICA8ZmVEcm9wU2hhZG93IGR4PVwiMFwiIGR5PVwiNFwiIHN0ZERldmlhdGlvbj1cIjRcIiBmbG9vZC1jb2xvcj1cIiMwRjE3MkFcIiBmbG9vZC1vcGFjaXR5PVwiMC4xNFwiIC8+XG4gICAgPC9maWx0ZXI+XG5cbiAgICA8bGluZWFyR3JhZGllbnQgaWQ9XCJ2aXMtZy1hbWJlci0ke3VpZH1cIiB4MT1cIjAlXCIgeTE9XCIwJVwiIHgyPVwiMTAwJVwiIHkyPVwiMCVcIj5cbiAgICAgIDxzdG9wIG9mZnNldD1cIjAlXCIgc3RvcC1jb2xvcj1cIiNFODlCMjdcIiAvPlxuICAgICAgPHN0b3Agb2Zmc2V0PVwiMTAwJVwiIHN0b3AtY29sb3I9XCIjRjdEMDVDXCIgLz5cbiAgICA8L2xpbmVhckdyYWRpZW50PlxuICAgIDxsaW5lYXJHcmFkaWVudCBpZD1cInZpcy1nLWFxdWEtJHt1aWR9XCIgeDE9XCIwJVwiIHkxPVwiMCVcIiB4Mj1cIjEwMCVcIiB5Mj1cIjEwMCVcIj5cbiAgICAgIDxzdG9wIG9mZnNldD1cIjAlXCIgc3RvcC1jb2xvcj1cIiM3M0U4RjRcIiAvPlxuICAgICAgPHN0b3Agb2Zmc2V0PVwiMTAwJVwiIHN0b3AtY29sb3I9XCIjREFFREZBXCIgLz5cbiAgICA8L2xpbmVhckdyYWRpZW50PlxuICAgIDxsaW5lYXJHcmFkaWVudCBpZD1cInZpcy1nLWNvcmFsLSR7dWlkfVwiIHgxPVwiMCVcIiB5MT1cIjAlXCIgeDI9XCIxMDAlXCIgeTI9XCIxMDAlXCI+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIwJVwiIHN0b3AtY29sb3I9XCIjRTg3QzZDXCIgLz5cbiAgICAgIDxzdG9wIG9mZnNldD1cIjEwMCVcIiBzdG9wLWNvbG9yPVwiI0Y2Q0JDM1wiIC8+XG4gICAgPC9saW5lYXJHcmFkaWVudD5cbiAgICA8bGluZWFyR3JhZGllbnQgaWQ9XCJ2aXMtZy1saW1lLSR7dWlkfVwiIHgxPVwiMCVcIiB5MT1cIjAlXCIgeDI9XCIxMDAlXCIgeTI9XCIwJVwiPlxuICAgICAgPHN0b3Agb2Zmc2V0PVwiMCVcIiBzdG9wLWNvbG9yPVwiIzhDRUU5N1wiIC8+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIxMDAlXCIgc3RvcC1jb2xvcj1cIiNDRUY2NUJcIiAvPlxuICAgIDwvbGluZWFyR3JhZGllbnQ+XG5cbiAgICA8bGluZWFyR3JhZGllbnQgaWQ9XCJ2aXMtY2FwLWNvcmFsLSR7dWlkfVwiIHgxPVwiMCVcIiB5MT1cIjAlXCIgeDI9XCIxMDAlXCIgeTI9XCIwJVwiPlxuICAgICAgPHN0b3Agb2Zmc2V0PVwiMCVcIiBzdG9wLWNvbG9yPVwiI0UyOTU3OFwiIC8+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIxMDAlXCIgc3RvcC1jb2xvcj1cIiNFQ0FDOTRcIiAvPlxuICAgIDwvbGluZWFyR3JhZGllbnQ+XG4gICAgPGxpbmVhckdyYWRpZW50IGlkPVwidmlzLWNhcC1nb2xkLSR7dWlkfVwiIHgxPVwiMCVcIiB5MT1cIjAlXCIgeDI9XCIxMDAlXCIgeTI9XCIwJVwiPlxuICAgICAgPHN0b3Agb2Zmc2V0PVwiMCVcIiBzdG9wLWNvbG9yPVwiI0U1QUQzNVwiIC8+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIxMDAlXCIgc3RvcC1jb2xvcj1cIiNGM0M4NjhcIiAvPlxuICAgIDwvbGluZWFyR3JhZGllbnQ+XG4gICAgPGxpbmVhckdyYWRpZW50IGlkPVwidmlzLWNhcC12aW9sZXQtJHt1aWR9XCIgeDE9XCIwJVwiIHkxPVwiMCVcIiB4Mj1cIjEwMCVcIiB5Mj1cIjAlXCI+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIwJVwiIHN0b3AtY29sb3I9XCIjOUFBRUU0XCIgLz5cbiAgICAgIDxzdG9wIG9mZnNldD1cIjEwMCVcIiBzdG9wLWNvbG9yPVwiI0JBQzdFQ1wiIC8+XG4gICAgPC9saW5lYXJHcmFkaWVudD5cbiAgICA8bGluZWFyR3JhZGllbnQgaWQ9XCJ2aXMtY2FwLXRlYWwtJHt1aWR9XCIgeDE9XCIwJVwiIHkxPVwiMCVcIiB4Mj1cIjEwMCVcIiB5Mj1cIjAlXCI+XG4gICAgICA8c3RvcCBvZmZzZXQ9XCIwJVwiIHN0b3AtY29sb3I9XCIjNjRBREIwXCIgLz5cbiAgICAgIDxzdG9wIG9mZnNldD1cIjEwMCVcIiBzdG9wLWNvbG9yPVwiIzg4QzRDNlwiIC8+XG4gICAgPC9saW5lYXJHcmFkaWVudD5cbiAgYCk7XG4gIHJldHVybiB1aWQ7XG59XG5cbi8vIOOCueOCv+OCpOODqyAxOiDwn46oIFBhc3RlbCBTaGFwZXMgKOODquODleOCoeODrOODs+OCuTHmupbmi6ApXG5mdW5jdGlvbiBkZWNvcmF0ZVZpc3VhbFNoYXBlcyhzdmcsIHVpZCkge1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZy5ub2RlOm5vdCguc3RhdGVkaWFncmFtLWNsdXN0ZXIpJykuZm9yRWFjaCgoZywgaWR4KSA9PiB7XG4gICAgY29uc3QgcmVjdCA9IGcucXVlcnlTZWxlY3RvcigncmVjdC5iYXNpYywgcmVjdC5sYWJlbC1jb250YWluZXInKSB8fCBnLnF1ZXJ5U2VsZWN0b3IoJ3JlY3QnKTtcbiAgICBjb25zdCBwb2x5Z29uID0gZy5xdWVyeVNlbGVjdG9yKCdwb2x5Z29uJyk7XG4gICAgY29uc3QgdGV4dCA9IChnLnRleHRDb250ZW50IHx8ICcnKS50b0xvd2VyQ2FzZSgpO1xuXG4gICAgZy5xdWVyeVNlbGVjdG9yQWxsKCdmb3JlaWduT2JqZWN0IGRpdiwgZm9yZWlnbk9iamVjdCBzcGFuLCBmb3JlaWduT2JqZWN0IHNtYWxsLCB0ZXh0LCAubm9kZUxhYmVsLCAuc3RhdGVMYWJlbCcpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2NvbG9yJywgJyMxRTI5M0InLCAnaW1wb3J0YW50Jyk7XG4gICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjMUUyOTNCJywgJ2ltcG9ydGFudCcpO1xuICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2ZvbnQtd2VpZ2h0JywgJzcwMCcsICdpbXBvcnRhbnQnKTtcbiAgICB9KTtcblxuICAgIGlmIChyZWN0KSB7XG4gICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCAnbm9uZScsICdpbXBvcnRhbnQnKTtcbiAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWx0ZXInLCBgdXJsKCN2aXMtc29mdC1zaGFkb3ctJHt1aWR9KWApO1xuXG4gICAgICBpZiAoaWR4ID09PSAwIHx8IHRleHQuaW5jbHVkZXMoJ2NsaWVudCcpIHx8IHRleHQuaW5jbHVkZXMoJ3N0YXJ0JykgfHwgdGV4dC5pbmNsdWRlcygnc3RhbmRieScpKSB7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdyeCcsICc5OTk5Jyk7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdyeScsICc5OTk5Jyk7XG4gICAgICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCAnI0ZGRkZGRicsICdpbXBvcnRhbnQnKTtcbiAgICAgIH0gZWxzZSBpZiAodGV4dC5pbmNsdWRlcygndGVybWluYWwnKSB8fCB0ZXh0LmluY2x1ZGVzKCdsYW5kaW5nJykgfHwgdGV4dC5pbmNsdWRlcygnZW5kJykgfHwgdGV4dC5pbmNsdWRlcygn57WC5LqGJykpIHtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J4JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J5JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGB1cmwoI3Zpcy1nLWxpbWUtJHt1aWR9KWAsICdpbXBvcnRhbnQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdyeCcsICcxMCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnMTAnKTtcbiAgICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGB1cmwoI3Zpcy1nLWFtYmVyLSR7dWlkfSlgLCAnaW1wb3J0YW50Jyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvbHlnb24pIHtcbiAgICAgIHBvbHlnb24uc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsICdub25lJywgJ2ltcG9ydGFudCcpO1xuICAgICAgcG9seWdvbi5zZXRBdHRyaWJ1dGUoJ2ZpbHRlcicsIGB1cmwoI3Zpcy1zb2Z0LXNoYWRvdy0ke3VpZH0pYCk7XG4gICAgICBjb25zdCBwb2ludHMgPSBwb2x5Z29uLmdldEF0dHJpYnV0ZSgncG9pbnRzJykgfHwgJyc7XG4gICAgICBpZiAocG9pbnRzLnNwbGl0KCcgJykubGVuZ3RoIDw9IDUpIHtcbiAgICAgICAgcG9seWdvbi5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGB1cmwoI3Zpcy1nLWFxdWEtJHt1aWR9KWAsICdpbXBvcnRhbnQnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBvbHlnb24uc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCBgdXJsKCN2aXMtZy1jb3JhbC0ke3VpZH0pYCwgJ2ltcG9ydGFudCcpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgLy8g57WQ57ea44Gu6Imy44Gv44Kr44O844OJ6IOM5pmv44Gr5ZCI44KP44Gb44KL77yIRGFyayDjgafjga/mmI7jgovjgYToibLvvIlcbiAgY29uc3QgZWRnZUNvbG9yID0gZ2V0RGlhZ3JhbVNwZWModHJ1ZSkuZWRnZVN0cm9rZTtcbiAgc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJy5lZGdlUGF0aCBwYXRoLnBhdGgsIHBhdGguZmxvd2NoYXJ0LWxpbmssIHBhdGgudHJhbnNpdGlvbicpLmZvckVhY2gocCA9PiB7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgZWRnZUNvbG9yLCAnaW1wb3J0YW50Jyk7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzJweCcsICdpbXBvcnRhbnQnKTtcbiAgICBwLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UtZGFzaGFycmF5JywgJ25vbmUnLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnbWFya2VyIHBhdGgnKS5mb3JFYWNoKG0gPT4ge1xuICAgIG0uc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCBlZGdlQ29sb3IsICdpbXBvcnRhbnQnKTtcbiAgICBtLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCBlZGdlQ29sb3IsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG59XG5cbi8vIOOCueOCv+OCpOODqyAyOiDwn5OLIDItVGllciBDYXJkcyAo44Oq44OV44Kh44Os44Oz44K5NOa6luaLoClcbmZ1bmN0aW9uIGRlY29yYXRlVmlzdWFsQ2FyZHMoc3ZnLCB1aWQpIHtcbiAgY29uc3QgY2FwR3JhZGllbnRzID0gW1xuICAgIGB1cmwoI3Zpcy1jYXAtY29yYWwtJHt1aWR9KWAsXG4gICAgYHVybCgjdmlzLWNhcC1nb2xkLSR7dWlkfSlgLFxuICAgIGB1cmwoI3Zpcy1jYXAtdmlvbGV0LSR7dWlkfSlgLFxuICAgIGB1cmwoI3Zpcy1jYXAtdGVhbC0ke3VpZH0pYFxuICBdO1xuICAvLyDoqJjlj7fjga8gQeOAnFrjgIHntprjgZHjgaYgQUEsIEFC4oCm77yI6KGo6KiI566X44Gu5YiX5ZCN44Go5ZCM44GY77yJ44CC44OO44O844OJ44Gu5aSa44GE5Zuz44Gn44KC6KiY5Y+344GM6YeN6KSH44GX44Gq44GE44KI44GG44Gr44GZ44KLXG4gIGNvbnN0IHN0ZXBMYWJlbCA9IG4gPT4gKG4gPCAyNiA/ICcnIDogc3RlcExhYmVsKE1hdGguZmxvb3IobiAvIDI2KSAtIDEpKSArIFN0cmluZy5mcm9tQ2hhckNvZGUoNjUgKyAobiAlIDI2KSk7XG4gIC8vIOOCq+ODvOODieWMluOBl+OBn+ODjuODvOODieOBoOOBkeOCkuWbs+OBruS4iuOBi+OCiemghu+8iOWQjOOBmOmrmOOBleOBr+W3puOBi+OCie+8ieOBq+aVsOOBiOOAgeiomOWPt+OBjCBBLCBCLCBD4oCmIOOBqOS4puOBtuOCiOOBhuOBq+OBmeOCi1xuICBsZXQgY2FyZENvdW50ID0gMDtcbiAgY29uc3Qgbm9kZVBvcyA9IGcgPT4ge1xuICAgIGNvbnN0IG0gPSAvdHJhbnNsYXRlXFwoXFxzKihbLVxcZC5dKylbXFxzLF0rKFstXFxkLl0rKVxccypcXCkvLmV4ZWMoZy5nZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScpIHx8ICcnKTtcbiAgICByZXR1cm4gbSA/IHsgeDogcGFyc2VGbG9hdChtWzFdKSwgeTogcGFyc2VGbG9hdChtWzJdKSB9IDogeyB4OiAwLCB5OiAwIH07XG4gIH07XG4gIGNvbnN0IG9yZGVyZWROb2RlcyA9IEFycmF5LmZyb20oc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJ2cubm9kZTpub3QoLnN0YXRlZGlhZ3JhbS1jbHVzdGVyKScpKVxuICAgIC5tYXAoZyA9PiAoeyBnLCBwb3M6IG5vZGVQb3MoZykgfSkpXG4gICAgLnNvcnQoKGEsIGIpID0+IChhLnBvcy55IC0gYi5wb3MueSkgfHwgKGEucG9zLnggLSBiLnBvcy54KSlcbiAgICAubWFwKGl0ZW0gPT4gaXRlbS5nKTtcblxuICBvcmRlcmVkTm9kZXMuZm9yRWFjaChnID0+IHtcbiAgICBjb25zdCByZWN0ID0gZy5xdWVyeVNlbGVjdG9yKCdyZWN0LmJhc2ljLCByZWN0LmxhYmVsLWNvbnRhaW5lcicpIHx8IGcucXVlcnlTZWxlY3RvcigncmVjdCcpO1xuICAgIGlmICghcmVjdCkgcmV0dXJuO1xuXG4gICAgY29uc3QgeCA9IHBhcnNlRmxvYXQocmVjdC5nZXRBdHRyaWJ1dGUoJ3gnKSB8fCAwKTtcbiAgICBjb25zdCB5ID0gcGFyc2VGbG9hdChyZWN0LmdldEF0dHJpYnV0ZSgneScpIHx8IDApO1xuICAgIGNvbnN0IHcgPSBwYXJzZUZsb2F0KHJlY3QuZ2V0QXR0cmlidXRlKCd3aWR0aCcpIHx8IDApO1xuICAgIGNvbnN0IGggPSBwYXJzZUZsb2F0KHJlY3QuZ2V0QXR0cmlidXRlKCdoZWlnaHQnKSB8fCAwKTtcbiAgICBpZiAodyA8PSAxMCB8fCBoIDw9IDEwKSByZXR1cm47XG4gICAgY29uc3QgaWR4ID0gY2FyZENvdW50Kys7XG5cbiAgICByZWN0LnNldEF0dHJpYnV0ZSgncngnLCAnMTInKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnMTInKTtcbiAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdmaWxsJywgJyNGRkZGRkYnLCAnaW1wb3J0YW50Jyk7XG4gICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgJyNFMkU4RjAnLCAnaW1wb3J0YW50Jyk7XG4gICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzEuNXB4JywgJ2ltcG9ydGFudCcpO1xuICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWx0ZXInLCBgdXJsKCN2aXMtY2FyZC1zaGFkb3ctJHt1aWR9KWApO1xuXG4gICAgY29uc3QgY2FwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycsICdyZWN0Jyk7XG4gICAgY2FwLnNldEF0dHJpYnV0ZSgneCcsIFN0cmluZyh4KSk7XG4gICAgY2FwLnNldEF0dHJpYnV0ZSgneScsIFN0cmluZyh5KSk7XG4gICAgY2FwLnNldEF0dHJpYnV0ZSgnd2lkdGgnLCBTdHJpbmcodykpO1xuICAgIGNvbnN0IGNhcEggPSBNYXRoLm1pbigyNCwgaCAqIDAuMzgpO1xuICAgIGNhcC5zZXRBdHRyaWJ1dGUoJ2hlaWdodCcsIFN0cmluZyhjYXBIKSk7XG4gICAgY2FwLnNldEF0dHJpYnV0ZSgncngnLCAnMTInKTtcbiAgICBjYXAuc2V0QXR0cmlidXRlKCdyeScsICcxMicpO1xuICAgIGNhcC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGNhcEdyYWRpZW50c1tpZHggJSBjYXBHcmFkaWVudHMubGVuZ3RoXSwgJ2ltcG9ydGFudCcpO1xuICAgIGNhcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgJ25vbmUnLCAnaW1wb3J0YW50Jyk7XG4gICAgY2FwLnN0eWxlLnNldFByb3BlcnR5KCdwb2ludGVyLWV2ZW50cycsICdub25lJyk7XG4gICAgZy5hcHBlbmRDaGlsZChjYXApO1xuICAgIC8vIOW4r+OBr+OCq+ODvOODieOBruS4iumDqOOBq+mHjeOBquOCi+OBn+OCgeOAgeODqeODmeODq+OCkuW4r+OBruS4i+OBrueZveOBhOmDqOWIhuOBruS4reWkruOBuOS4i+OBkuOCi+OAgk1lcm1haWQgMTIg44Gv44Op44OZ44Or44Gu6KGM44Gu6auY44GV44GM5aSn44GN44GE44Gu44GnIDJweCDotrPjgZlcbiAgICBjb25zdCBsYWJlbCA9IGcucXVlcnlTZWxlY3RvcignOnNjb3BlID4gLmxhYmVsJyk7XG4gICAgaWYgKGxhYmVsKSBsYWJlbC5zZXRBdHRyaWJ1dGUoJ3RyYW5zZm9ybScsIGAke2xhYmVsLmdldEF0dHJpYnV0ZSgndHJhbnNmb3JtJykgfHwgJyd9IHRyYW5zbGF0ZSgwLCAke2NhcEggLyAyICsgMn0pYC50cmltKCkpO1xuXG4gICAgY29uc3Qgc3RlcFRleHQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJywgJ3RleHQnKTtcbiAgICBzdGVwVGV4dC5zZXRBdHRyaWJ1dGUoJ3gnLCBTdHJpbmcoeCArIDEwKSk7XG4gICAgc3RlcFRleHQuc2V0QXR0cmlidXRlKCd5JywgU3RyaW5nKHkgKyBjYXBIIC0gNykpO1xuICAgIHN0ZXBUZXh0LnNldEF0dHJpYnV0ZSgnZmlsbCcsICcjRkZGRkZGJyk7XG4gICAgc3RlcFRleHQuc2V0QXR0cmlidXRlKCdmb250LXNpemUnLCAnMTEnKTtcbiAgICBzdGVwVGV4dC5zZXRBdHRyaWJ1dGUoJ2ZvbnQtd2VpZ2h0JywgJzgwMCcpO1xuICAgIHN0ZXBUZXh0LnNldEF0dHJpYnV0ZSgnZm9udC1mYW1pbHknLCAnXCJQbHVzIEpha2FydGEgU2Fuc1wiLCBzYW5zLXNlcmlmJyk7XG4gICAgc3RlcFRleHQudGV4dENvbnRlbnQgPSBzdGVwTGFiZWwoaWR4KTtcbiAgICBnLmFwcGVuZENoaWxkKHN0ZXBUZXh0KTtcblxuICAgIGcucXVlcnlTZWxlY3RvckFsbCgnZm9yZWlnbk9iamVjdCBkaXYsIGZvcmVpZ25PYmplY3Qgc3BhbiwgZm9yZWlnbk9iamVjdCBzbWFsbCwgdGV4dCwgLm5vZGVMYWJlbCwgLnN0YXRlTGFiZWwnKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCdjb2xvcicsICcjMEYxNzJBJywgJ2ltcG9ydGFudCcpO1xuICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCAnIzBGMTcyQScsICdpbXBvcnRhbnQnKTtcbiAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCdmb250LXdlaWdodCcsICc3MDAnLCAnaW1wb3J0YW50Jyk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGNvbnN0IGVkZ2VDb2xvciA9IGdldERpYWdyYW1TcGVjKHRydWUpLmVkZ2VTdHJva2U7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCcuZWRnZVBhdGggcGF0aC5wYXRoLCBwYXRoLmZsb3djaGFydC1saW5rLCBwYXRoLnRyYW5zaXRpb24nKS5mb3JFYWNoKHAgPT4ge1xuICAgIHAuc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsIGVkZ2VDb2xvciwgJ2ltcG9ydGFudCcpO1xuICAgIHAuc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZS13aWR0aCcsICcycHgnLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xufVxuXG4vLyDjgrnjgr/jgqTjg6sgMzog4q2VIFZpYnJhbnQgQ2lyY2xlcyAmIERvdHMgKOODquODleOCoeODrOODs+OCuTLmupbmi6ApXG5mdW5jdGlvbiBkZWNvcmF0ZVZpc3VhbENpcmNsZXMoc3ZnLCB1aWQpIHtcbiAgY29uc3QgY2lyY2xlUGFsZXR0ZSA9IFsnI0Q0NUQ1MycsICcjN0VBNkJGJywgJyNFQ0I2NzQnLCAnIzdEOTc2MycsICcjNkQ1OTdBJywgJyMzRDQ2NEQnXTtcblxuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnZy5ub2RlOm5vdCguc3RhdGVkaWFncmFtLWNsdXN0ZXIpJykuZm9yRWFjaCgoZywgaWR4KSA9PiB7XG4gICAgY29uc3QgcmVjdCA9IGcucXVlcnlTZWxlY3RvcigncmVjdC5iYXNpYywgcmVjdC5sYWJlbC1jb250YWluZXInKSB8fCBnLnF1ZXJ5U2VsZWN0b3IoJ3JlY3QnKTtcbiAgICBjb25zdCBjb2xvciA9IGNpcmNsZVBhbGV0dGVbaWR4ICUgY2lyY2xlUGFsZXR0ZS5sZW5ndGhdO1xuXG4gICAgaWYgKHJlY3QpIHtcbiAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdyeCcsICc5OTk5Jyk7XG4gICAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnOTk5OScpO1xuICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGNvbG9yLCAnaW1wb3J0YW50Jyk7XG4gICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCAnI0ZGRkZGRicsICdpbXBvcnRhbnQnKTtcbiAgICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZS13aWR0aCcsICcyLjVweCcsICdpbXBvcnRhbnQnKTtcbiAgICAgIHJlY3Quc2V0QXR0cmlidXRlKCdmaWx0ZXInLCBgdXJsKCN2aXMtc29mdC1zaGFkb3ctJHt1aWR9KWApO1xuICAgIH1cbiAgICAvLyDjgbLjgZflvaLjg7vlubPooYzlm5vovrrlvaLjgoLloZfjgorliIbjgZHjgovvvIjnmb3mloflrZfjgpLmt6HjgYTloZfjgorjga7kuIrjgavovInjgZvjgarjgYTjgZ/jgoHvvIlcbiAgICBjb25zdCBwb2x5Z29uID0gZy5xdWVyeVNlbGVjdG9yKCdwb2x5Z29uJyk7XG4gICAgaWYgKHBvbHlnb24pIHtcbiAgICAgIHBvbHlnb24uc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCBjb2xvciwgJ2ltcG9ydGFudCcpO1xuICAgICAgcG9seWdvbi5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgJyNGRkZGRkYnLCAnaW1wb3J0YW50Jyk7XG4gICAgICBwb2x5Z29uLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2Utd2lkdGgnLCAnMi41cHgnLCAnaW1wb3J0YW50Jyk7XG4gICAgICBwb2x5Z29uLnNldEF0dHJpYnV0ZSgnZmlsdGVyJywgYHVybCgjdmlzLXNvZnQtc2hhZG93LSR7dWlkfSlgKTtcbiAgICB9XG5cbiAgICAvLyDmmI7jgovjgYTjgq3jg6Pjg6Hjg6voibLjga7kuIrjga7nmb3mloflrZfjga/jgrPjg7Pjg4jjg6njgrnjg4jjgYzotrPjgorjgarjgYTjgZ/jgoHjgIHjgZ3jga7oibLjgaDjgZHmv4PjgYTmloflrZfjgavjgZnjgotcbiAgICBjb25zdCB0ZXh0Q29sb3IgPSBDSVJDTEVfREFSS19URVhUX0ZJTExTLmluY2x1ZGVzKGNvbG9yKSA/ICcjM0IyQTBFJyA6ICcjRkZGRkZGJztcbiAgICBnLnF1ZXJ5U2VsZWN0b3JBbGwoJ2ZvcmVpZ25PYmplY3QgZGl2LCBmb3JlaWduT2JqZWN0IHNwYW4sIGZvcmVpZ25PYmplY3Qgc21hbGwsIHRleHQsIC5ub2RlTGFiZWwsIC5zdGF0ZUxhYmVsJykuZm9yRWFjaChlbCA9PiB7XG4gICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnY29sb3InLCB0ZXh0Q29sb3IsICdpbXBvcnRhbnQnKTtcbiAgICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCdmaWxsJywgdGV4dENvbG9yLCAnaW1wb3J0YW50Jyk7XG4gICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnZm9udC13ZWlnaHQnLCAnNzAwJywgJ2ltcG9ydGFudCcpO1xuICAgIH0pO1xuICB9KTtcblxuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnLmVkZ2VQYXRoIHBhdGgucGF0aCwgcGF0aC5mbG93Y2hhcnQtbGluaywgcGF0aC50cmFuc2l0aW9uJykuZm9yRWFjaCgocCwgaWR4KSA9PiB7XG4gICAgY29uc3QgY29sb3IgPSBjaXJjbGVQYWxldHRlW2lkeCAlIGNpcmNsZVBhbGV0dGUubGVuZ3RoXTtcbiAgICBwLnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCBjb2xvciwgJ2ltcG9ydGFudCcpO1xuICAgIHAuc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZS13aWR0aCcsICc0cHgnLCAnaW1wb3J0YW50Jyk7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLWxpbmVjYXAnLCAncm91bmQnLCAnaW1wb3J0YW50Jyk7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLWRhc2hhcnJheScsICcwIDknLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICBzdmcucXVlcnlTZWxlY3RvckFsbCgnbWFya2VyIHBhdGgnKS5mb3JFYWNoKG0gPT4ge1xuICAgIG0uc3R5bGUuc2V0UHJvcGVydHkoJ2ZpbGwnLCAnIzdFQTZCRicsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG59XG5cbi8vIOOCueOCv+OCpOODqyA0OiDwn5OWIEVkaXRvcmlhbCBDcmVhbSAo44Oq44OV44Kh44Os44Oz44K5M+a6luaLoClcbmZ1bmN0aW9uIGRlY29yYXRlVmlzdWFsRWRpdG9yaWFsKHN2ZywgdWlkKSB7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdnLm5vZGU6bm90KC5zdGF0ZWRpYWdyYW0tY2x1c3RlciknKS5mb3JFYWNoKChnLCBpZHgpID0+IHtcbiAgICBjb25zdCByZWN0ID0gZy5xdWVyeVNlbGVjdG9yKCdyZWN0LmJhc2ljLCByZWN0LmxhYmVsLWNvbnRhaW5lcicpIHx8IGcucXVlcnlTZWxlY3RvcigncmVjdCcpO1xuICAgIGNvbnN0IHRleHQgPSAoZy50ZXh0Q29udGVudCB8fCAnJykudG9Mb3dlckNhc2UoKTtcbiAgICAvLyDnirbmhYvpgbfnp7vlm7Pjga7kuKbooYzvvIhmb3JrIC8gam9pbu+8ieOBruODkOODvOOBr+e0sOOBhOefqeW9ouOAgueZveOBp+Whl+OCi+OBqOOCr+ODquODvOODoOiJsuOBruiDjOaZr+OBq+a6tuOBkeOCi+OBn+OCgeOAgU1lcm1haWQg44Gu57ea44Gu6Imy44Gu44G+44G+5q6L44GZXG4gICAgaWYgKHJlY3QgJiYgcGFyc2VGbG9hdChyZWN0LmdldEF0dHJpYnV0ZSgnaGVpZ2h0JykgfHwgMCkgPD0gMTApIHJldHVybjtcblxuICAgIGlmIChyZWN0KSB7XG4gICAgICBpZiAoaWR4ID09PSAwIHx8IHRleHQuaW5jbHVkZXMoJ3N0YXJ0JykgfHwgdGV4dC5pbmNsdWRlcygnY2xpZW50JykpIHtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J4JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J5JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjRkZGRkZGJywgJ2ltcG9ydGFudCcpO1xuICAgICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCAnI0UyOTU3OCcsICdpbXBvcnRhbnQnKTtcbiAgICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzNweCcsICdpbXBvcnRhbnQnKTtcbiAgICAgIH0gZWxzZSBpZiAodGV4dC5pbmNsdWRlcygndHlwZScpIHx8IHRleHQuaW5jbHVkZXMoJ3Rlcm1pbmF0JykgfHwgdGV4dC5pbmNsdWRlcygnbGFuZGluZycpIHx8IHRleHQuaW5jbHVkZXMoJ2RvY2tpbmcnKSkge1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgncngnLCAnOCcpO1xuICAgICAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnOCcpO1xuICAgICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdmaWxsJywgJyNENjhDOEMnLCAnaW1wb3J0YW50Jyk7XG4gICAgICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsICdub25lJywgJ2ltcG9ydGFudCcpO1xuICAgICAgICBnLnF1ZXJ5U2VsZWN0b3JBbGwoJ2ZvcmVpZ25PYmplY3QgZGl2LCBmb3JlaWduT2JqZWN0IHNwYW4sIHRleHQnKS5mb3JFYWNoKGVsID0+IHtcbiAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnY29sb3InLCAnI0ZGRkZGRicsICdpbXBvcnRhbnQnKTtcbiAgICAgICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjRkZGRkZGJywgJ2ltcG9ydGFudCcpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J4JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ3J5JywgJzk5OTknKTtcbiAgICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjRkZGRkZGJywgJ2ltcG9ydGFudCcpO1xuICAgICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCAnbm9uZScsICdpbXBvcnRhbnQnKTtcbiAgICAgICAgcmVjdC5zZXRBdHRyaWJ1dGUoJ2ZpbHRlcicsIGB1cmwoI3Zpcy1zb2Z0LXNoYWRvdy0ke3VpZH0pYCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgZy5xdWVyeVNlbGVjdG9yQWxsKCdmb3JlaWduT2JqZWN0IGRpdiwgZm9yZWlnbk9iamVjdCBzcGFuLCBmb3JlaWduT2JqZWN0IHNtYWxsLCB0ZXh0LCAubm9kZUxhYmVsLCAuc3RhdGVMYWJlbCcpLmZvckVhY2goZWwgPT4ge1xuICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2NvbG9yJywgJyMyQjJENDInLCAnaW1wb3J0YW50Jyk7XG4gICAgICBlbC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjMkIyRDQyJywgJ2ltcG9ydGFudCcpO1xuICAgICAgZWwuc3R5bGUuc2V0UHJvcGVydHkoJ2ZvbnQtd2VpZ2h0JywgJzYwMCcsICdpbXBvcnRhbnQnKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJy5lZGdlUGF0aCBwYXRoLnBhdGgsIHBhdGguZmxvd2NoYXJ0LWxpbmssIHBhdGgudHJhbnNpdGlvbicpLmZvckVhY2gocCA9PiB7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgJyM4RkE4NzYnLCAnaW1wb3J0YW50Jyk7XG4gICAgcC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzMuNXB4JywgJ2ltcG9ydGFudCcpO1xuICAgIHAuc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZS1kYXNoYXJyYXknLCAnbm9uZScsICdpbXBvcnRhbnQnKTtcbiAgfSk7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdtYXJrZXIgcGF0aCcpLmZvckVhY2gobSA9PiB7XG4gICAgbS5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjOEZBODc2JywgJ2ltcG9ydGFudCcpO1xuICAgIG0uc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsICcjOEZBODc2JywgJ2ltcG9ydGFudCcpO1xuICB9KTtcbn1cblxuLy8g57ea5bmF44KS5Z+65rqW44Gr5ouh5aSn44GV44KM44KL44Oe44O844Kr44O877yI54q25oWL6YG356e75Zuz44Gu55+i44GY44KK44Gq44Gp77yJ44KS44CB57ea5bmF44Gr44KI44KJ44Gq44GE5aSn44GN44GV44Gr5Zu65a6a44GZ44KL44CCXG4vLyBWaXN1YWwgU3RhZ2Ug44Gv57ea44KS5aSq44GP44GZ44KL44Gf44KB44CB44Gd44Gu44G+44G+44Gn44Gv55+i44GY44KK44GM5beo5aSn44Gr44Gq44KK44CB44Op44OZ44Or44KE54q25oWL44Gr6YeN44Gq44KLXG5mdW5jdGlvbiBmaXhNYXJrZXJTY2FsZShzdmcpIHtcbiAgY29uc3Qgc2NhbGUgPSAxLjY7XG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCdtYXJrZXInKS5mb3JFYWNoKG1hcmtlciA9PiB7XG4gICAgaWYgKG1hcmtlci5nZXRBdHRyaWJ1dGUoJ21hcmtlclVuaXRzJykgPT09ICd1c2VyU3BhY2VPblVzZScpIHJldHVybjtcbiAgICBjb25zdCB3ID0gcGFyc2VGbG9hdChtYXJrZXIuZ2V0QXR0cmlidXRlKCdtYXJrZXJXaWR0aCcpIHx8IDMpO1xuICAgIGNvbnN0IGggPSBwYXJzZUZsb2F0KG1hcmtlci5nZXRBdHRyaWJ1dGUoJ21hcmtlckhlaWdodCcpIHx8IDMpO1xuICAgIGlmICghbWFya2VyLmdldEF0dHJpYnV0ZSgndmlld0JveCcpKSBtYXJrZXIuc2V0QXR0cmlidXRlKCd2aWV3Qm94JywgYDAgMCAke3d9ICR7aH1gKTtcbiAgICBtYXJrZXIuc2V0QXR0cmlidXRlKCdtYXJrZXJVbml0cycsICd1c2VyU3BhY2VPblVzZScpO1xuICAgIG1hcmtlci5zZXRBdHRyaWJ1dGUoJ21hcmtlcldpZHRoJywgU3RyaW5nKHcgKiBzY2FsZSkpO1xuICAgIG1hcmtlci5zZXRBdHRyaWJ1dGUoJ21hcmtlckhlaWdodCcsIFN0cmluZyhoICogc2NhbGUpKTtcbiAgfSk7XG59XG5cbi8vIFZpc3VhbCBTdGFnZSDjga7jgrfjg7zjgrHjg7Pjgrnlm7PvvJrlj4LliqDogIXjga7nrrHjgpLjgrnjgr/jgqTjg6vjgavlkIjjgo/jgZvjgIHnt5rjg7vmtLvmgKfljLrplpPjg7vnn6LjgZjjgorjgpLopovliIbjgZHjgoTjgZnjgY/jgZnjgovvvIhORlItMDA077yJXG5mdW5jdGlvbiBkZWNvcmF0ZVZpc3VhbFNlcXVlbmNlKHN2Zywgc3R5bGVNb2RlLCB2aXN1YWxTcGVjLCB1aWQpIHtcbiAgLy8g5ZCM44GY5Y+C5Yqg6ICF44Gu5LiK5LiL44Gu566x44KS5ZCM44GY6Imy44Gr44GZ44KL44Gf44KB44CB5Y+C5Yqg6ICF5ZCN44GU44Go44Gr6Imy44KS5Ymy44KK5b2T44Gm44KLXG4gIGNvbnN0IGFjdG9yT3JkZXIgPSBbXTtcbiAgc3ZnLnF1ZXJ5U2VsZWN0b3JBbGwoJ3JlY3QuYWN0b3InKS5mb3JFYWNoKHJlY3QgPT4ge1xuICAgIGNvbnN0IG5hbWUgPSByZWN0LmdldEF0dHJpYnV0ZSgnbmFtZScpIHx8ICcnO1xuICAgIGlmICghYWN0b3JPcmRlci5pbmNsdWRlcyhuYW1lKSkgYWN0b3JPcmRlci5wdXNoKG5hbWUpO1xuICAgIGNvbnN0IGlkeCA9IGFjdG9yT3JkZXIuaW5kZXhPZihuYW1lKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgncngnLCAnMTAnKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgncnknLCAnMTAnKTtcbiAgICByZWN0LnNldEF0dHJpYnV0ZSgnZmlsdGVyJywgYHVybCgjdmlzLXNvZnQtc2hhZG93LSR7dWlkfSlgKTtcbiAgICBpZiAoc3R5bGVNb2RlID09PSAnc2hhcGVzJykge1xuICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsIGB1cmwoI3Zpcy1nLWFtYmVyLSR7dWlkfSlgLCAnaW1wb3J0YW50Jyk7XG4gICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2UnLCAnbm9uZScsICdpbXBvcnRhbnQnKTtcbiAgICB9IGVsc2UgaWYgKHN0eWxlTW9kZSA9PT0gJ2NpcmNsZXMnKSB7XG4gICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdmaWxsJywgWycjN0VBNkJGJywgJyNENDVENTMnLCAnIzdEOTc2MycsICcjRUNCNjc0J11baWR4ICUgNF0sICdpbXBvcnRhbnQnKTtcbiAgICAgIHJlY3Quc3R5bGUuc2V0UHJvcGVydHkoJ3N0cm9rZScsICcjRkZGRkZGJywgJ2ltcG9ydGFudCcpO1xuICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlLXdpZHRoJywgJzJweCcsICdpbXBvcnRhbnQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnZmlsbCcsICcjRkZGRkZGJywgJ2ltcG9ydGFudCcpO1xuICAgICAgcmVjdC5zdHlsZS5zZXRQcm9wZXJ0eSgnc3Ryb2tlJywgdmlzdWFsU3BlYy5ub2RlU3Ryb2tlLCAnaW1wb3J0YW50Jyk7XG4gICAgICByZWN0LnN0eWxlLnNldFByb3BlcnR5KCdzdHJva2Utd2lkdGgnLCAnMS41cHgnLCAnaW1wb3J0YW50Jyk7XG4gICAgfVxuICB9KTtcbiAgLy8g5Y+C5Yqg6ICF44Gu566x44Gu5aGX44KK44Gv5aSW6Kaz44Gr44KI44KJ44Gq44GE44Gf44KB44CB566x44Gu5paH5a2X44Gu6Imy44KC5Zu65a6a44GZ44KL77yIRGFyayDjgafjga/phY3oibLjga4gbm9kZVRleHQg44GM5piO44KL44GP44Gq44KL44Gf44KB77yJXG4gIC8vIOS6uuWei+OBruWPguWKoOiAhe+8iGFjdG9y77yJ44Gu5ZCN5YmN44Gv566x44Gn44Gv44Gq44GP6IOM5pmv44Gu5LiK44Gr5o+P44GL44KM44KL44Gf44KB44CB6YWN6Imy77yI5aSW6Kaz44Gr5ZCI44KP44Gb44Gf6Imy77yJ44Gu44G+44G+44Gr44GZ44KLXG4gIHN2Zy5xdWVyeVNlbGVjdG9yQWxsKCd0ZXh0LmFjdG9yLCB0ZXh0LmFjdG9yIHRzcGFuJykuZm9yRWFjaChlbCA9PiB7XG4gICAgaWYgKGVsLmNsb3Nlc3QoJy5hY3Rvci1tYW4nKSkgcmV0dXJuO1xuICAgIGVsLnN0eWxlLnNldFByb3BlcnR5KCdmaWxsJywgc3R5bGVNb2RlID09PSAnY2lyY2xlcycgPyAnI0ZGRkZGRicgOiAnIzFFMjkzQicsICdpbXBvcnRhbnQnKTtcbiAgICBpZiAoc3R5bGVNb2RlID09PSAnY2lyY2xlcycpIGVsLnN0eWxlLnNldFByb3BlcnR5KCdmb250LXdlaWdodCcsICc3MDAnLCAnaW1wb3J0YW50Jyk7XG4gIH0pO1xuICBjb25zdCBpc0RhcmsgPSBzdGF0ZS5hcHBlYXJhbmNlID09PSAnZGFyayc7XG4gIHN0eWxlU2VxdWVuY2VEaWFncmFtKHN2Zywge1xuICAgIGxpZmVsaW5lOiB2aXN1YWxTcGVjLmxpZmVsaW5lLFxuICAgIGFjdGl2YXRpb25CZzogdmlzdWFsU3BlYy5hY3RpdmF0aW9uQmcsXG4gICAgYWN0aXZhdGlvbkJvcmRlcjogdmlzdWFsU3BlYy5hY3RpdmF0aW9uQm9yZGVyLFxuICAgIHNpZ25hbDogdmlzdWFsU3BlYy5lZGdlU3Ryb2tlLFxuICAgIC8vIOeVquWPt+OBr+efouOBmOOCiuOBqOWQjOOBmOiJsuOBruWGhuOBruS4iuOBq+i8ieOCi+OAgkRhcmsg44Gn44Gv5YaG44GM5piO44KL44GE6Imy44Gr44Gq44KL44Gf44KB44CB55Wq5Y+344KS5pqX44GE6Imy44Gr44GZ44KLXG4gICAgbnVtYmVyVGV4dDogaXNEYXJrID8gJyMwRjE3MkEnIDogJyNGRkZGRkYnLFxuICAgIG1lc3NhZ2VUZXh0OiB2aXN1YWxTcGVjLm5vZGVUZXh0XG4gIH0pO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44OA44Kk44Ki44Kw44Op44Og44Kr44O844OJ55Sf5oiQXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8gY3VydmU6IOefouWNsOOBruW9oueKtuOCkumBuOOBueOCi+Wbs+OBp+OBr+OBneOBruW9oueKtuOAgemBuOOBueOBquOBhOWbs+OBp+OBryBudWxs77yIREQtRURHRS0wMTDvvIlcbmZ1bmN0aW9uIGNyZWF0ZURpYWdyYW1DYXJkKGluZGV4LCBzdmdIdG1sLCBpc1JlbmRlcmluZywgaXNWaXN1YWwsIGN1cnZlID0gbnVsbCkge1xuICBjb25zdCBjb250ZW50ID0gaXNSZW5kZXJpbmdcbiAgICA/IGA8ZGl2IGNsYXNzPVwicHktMTIgZm9udC1tb25vIHRleHQteHMgdGV4dC1ibHVlLTUwMCBhbmltYXRlLXB1bHNlIGZsZXggaXRlbXMtY2VudGVyIGp1c3RpZnktY2VudGVyXCI+UmVuZGVyaW5nIERpYWdyYW0gMCR7aW5kZXggKyAxfS4uLjwvZGl2PmBcbiAgICA6IHN2Z0h0bWw7XG5cbiAgY29uc3QgY2FyZENsYXNzID0gaXNWaXN1YWwgPyBgZXhoaWJpdGlvbi1kaWFncmFtLWNhcmQgaW5mb2dyYXBoaWMtYmctJHtzdGF0ZS5pbmZvZ3JhcGhpY1N0eWxlfWAgOiAnZGlhZ3JhbS1mcmFtZSc7XG4gIGNvbnN0IGhlYWRlckNsYXNzID0gaXNWaXN1YWwgPyAnZXhoaWJpdGlvbi1kaWFncmFtLWhlYWRlcicgOiAnZGlhZ3JhbS1mcmFtZS1oZWFkZXInO1xuICBjb25zdCB2aWV3cG9ydENsYXNzID0gaXNWaXN1YWwgPyAnZXhoaWJpdGlvbi12aWV3cG9ydCcgOiAnZGlhZ3JhbS12aWV3cG9ydCc7XG4gIGNvbnN0IGJhZGdlTGFiZWwgPSBpc1Zpc3VhbCA/IGBJTkZPR1JBUEhJQyAvLyAwJHtpbmRleCArIDF9YCA6IGBESUFHUkFNIDAke2luZGV4ICsgMX1gO1xuICBjb25zdCBjdXJ2ZVBpY2tlciA9IGN1cnZlXG4gICAgPyBgPGRpdiBjbGFzcz1cInBpbGwtY29udGFpbmVyIG1yLTEuNVwiIHJvbGU9XCJncm91cFwiIGFyaWEtbGFiZWw9XCLnn6LljbDjga7lvaLnirZcIj4ke09iamVjdC5lbnRyaWVzKENVUlZFX0xBQkVMUykubWFwKChba2V5LCBsYWJlbF0pID0+XG4gICAgICAgIGA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWN1cnZlPVwiJHtrZXl9XCIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCIgYXJpYS1wcmVzc2VkPVwiJHtrZXkgPT09IGN1cnZlfVwiIGNsYXNzPVwiZWRnZS1jdXJ2ZS1idG4gcGlsbC1idG4gdGV4dC1bMTBweF0ke2tleSA9PT0gY3VydmUgPyAnIGlzLWFjdGl2ZScgOiAnJ31cIj4ke2xhYmVsfTwvYnV0dG9uPmApLmpvaW4oJycpfTwvZGl2PmBcbiAgICA6ICcnO1xuXG4gIHJldHVybiBgXG4gICAgPGRpdiBpZD1cImRpYWdyYW0tZnJhbWUtJHtpbmRleH1cIiBjbGFzcz1cIiR7Y2FyZENsYXNzfVwiPlxuICAgICAgPGRpdiBjbGFzcz1cIiR7aGVhZGVyQ2xhc3N9XCI+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJmbGV4IGl0ZW1zLWNlbnRlciBnYXAtMlwiPlxuICAgICAgICAgIDxzcGFuIGNsYXNzPVwidy0yLjUgaC0yLjUgcm91bmRlZC1mdWxsICR7aXNWaXN1YWwgPyAnYmctYW1iZXItNTAwIHNoYWRvdy1zbScgOiAnYmctYmx1ZS01MDAnfVwiPjwvc3Bhbj5cbiAgICAgICAgICA8c3BhbiBjbGFzcz1cImZvbnQtbW9ubyB0ZXh0LVsxMXB4XSBmb250LWJvbGQgdHJhY2tpbmctd2lkZXJcIiBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1wiPiR7YmFkZ2VMYWJlbH08L3NwYW4+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzPVwiZmxleCBpdGVtcy1jZW50ZXIgZ2FwLTFcIj5cbiAgICAgICAgICAke2N1cnZlUGlja2VyfVxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJwaWxsLWNvbnRhaW5lciBtci0xLjVcIj5cbiAgICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwic2NhbGUtZml0XCIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCIgY2xhc3M9XCJzY2FsZS1idG4gcGlsbC1idG4gaXMtYWN0aXZlIHRleHQtWzEwcHhdXCI+Rml0PC9idXR0b24+XG4gICAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInNjYWxlLWFjdHVhbFwiIGRhdGEtaW5kZXg9XCIke2luZGV4fVwiIGNsYXNzPVwic2NhbGUtYnRuIHBpbGwtYnRuIHRleHQtWzEwcHhdXCI+MToxPC9idXR0b24+XG4gICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgZGF0YS1hY3Rpb249XCJwbmdcIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIiBjbGFzcz1cInRleHQtWzExcHhdIGZvbnQtc2VtaWJvbGQgcHgtMiBweS0xIHJvdW5kZWQgaG92ZXI6YmctYmx1ZS01MDAvMTAgdHJhbnNpdGlvbi1jb2xvcnMgY3Vyc29yLXBvaW50ZXJcIiBzdHlsZT1cImNvbG9yOiB2YXIoLS10ZXh0LXByaW1hcnkpO1wiPlBORzwvYnV0dG9uPlxuICAgICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGRhdGEtYWN0aW9uPVwic3ZnXCIgZGF0YS1pbmRleD1cIiR7aW5kZXh9XCIgY2xhc3M9XCJ0ZXh0LVsxMXB4XSBmb250LXNlbWlib2xkIHB4LTIgcHktMSByb3VuZGVkIGhvdmVyOmJnLWJsdWUtNTAwLzEwIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCIgc3R5bGU9XCJjb2xvcjogdmFyKC0tdGV4dC1wcmltYXJ5KTtcIj5TVkc8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBkYXRhLWFjdGlvbj1cInpvb21cIiBkYXRhLWluZGV4PVwiJHtpbmRleH1cIiBjbGFzcz1cInRleHQtWzExcHhdIGZvbnQtYm9sZCBweC0yIHB5LTEgcm91bmRlZCBiZy1ibHVlLTYwMCB0ZXh0LXdoaXRlIGhvdmVyOmJnLWJsdWUtNTAwIHRyYW5zaXRpb24tY29sb3JzIGN1cnNvci1wb2ludGVyXCI+RXhwYW5kPC9idXR0b24+XG4gICAgICAgIDwvZGl2PlxuICAgICAgPC9kaXY+XG4gICAgICA8ZGl2IGNsYXNzPVwiJHt2aWV3cG9ydENsYXNzfVwiIGRhdGEtc3RhZ2UtaW5kZXg9XCIke2luZGV4fVwiPlxuICAgICAgICAke2NvbnRlbnR9XG4gICAgICA8L2Rpdj5cbiAgICA8L2Rpdj5cbiAgYDtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIFZpc3VhbCBTdGFnZSDlsZXnpLrjg6zjgqTjgqLjgqbjg4jmp4vnr4lcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vLyDoqJjov7Djg5Hjgr/jg7zjg7PliKXjga7pm5vlvaLjga7liKTlrprvvIhGUi0wMTYsIERELVZUUEwtMDAx77yJ44CCZWxzOiDjgrnjg6njg5bjga7mnKzmlofopoHntKDvvIhoMuODu+ODleODreODs+ODiOODnuOCv+ODvOODu+Wbs+OCkumZpOOBj++8ieOAglxuLy8g44K/44Kw5ZCN44Go5paH5a2X5pWw44Gg44GR44Gn5Yik5a6a44GX44CB6KiI566X5b6M44Gu44K544K/44Kk44Or44Gv5L2/44KP44Gq44GE77yIVEMtUEVSRi0wMDLvvInjgILpoIbluo/jga8gRFRQLVZUUEwtMDAxIOOBruihqOOBruOBqOOBiuOCilxuY29uc3QgVEVNUExBVEVfTElNSVRTID0ge1xuICBsZWFkQ2hhcnM6IDE2MCwgaXRlbUNoYXJzOiAxMDAsIHF1b3RlQ2hhcnM6IDI0MCwgcG9pbnRzOiBbMiwgNl0sIHN0ZXBzOiBbMiwgOF0sXG4gIGdsb3NzYXJ5OiBbMiwgMTJdLCBnbG9zc2FyeVRlcm1DaGFyczogNDAsIGdsb3NzYXJ5SXRlbUNoYXJzOiAyMDAsIGdsb3NzYXJ5VHdvVXA6IDdcbn07XG4vLyDpm5vlvaLjga7poIXnm67jgavlhaXjgozjgovjgajntYTjgoHjgarjgYTopoHntKDvvIjlhaXjgozlrZDjga7jg6rjgrnjg4jjg7vjgrPjg7zjg4njg7vooajjg7vlvJXnlKjjg7vjg4Hjgqfjg4Pjgq/jg5zjg4Pjgq/jgrnvvIlcbmNvbnN0IFRFTVBMQVRFX0lURU1fQkxPQ0tFUlMgPSAndWwsIG9sLCBwcmUsIHRhYmxlLCBibG9ja3F1b3RlLCBpbnB1dCc7XG5cbi8vIOWumue+qeODquOCueODiOWei++8iEZSLTAzNSwgRFRQLVZUUEwtMDQ177yJOiDjgIwqKueUqOiqnioqIOKAlCDoqqzmmI7jgI3jga7lpKrlrZfjgajjg4Djg4Pjgrfjg6XjgILjgrPjg63jg7PljLrliIfjgorjga/opoHngrnjgqvjg7zjg4nlnovjga7mm7jjgY3mlrnjga7jgZ/jgoHlkKvjgoHjgarjgYTvvIhSR0gtOTA577yJXG5jb25zdCBHTE9TU0FSWV9TRVBBUkFUT1JfUkUgPSAvXlxccypb4oCU4oCT4oCVXVxccyovO1xuXG5mdW5jdGlvbiBnbG9zc2FyeVBhcnRzKGxpKSB7XG4gIGNvbnN0IGhlYWQgPSBsaS5maXJzdENoaWxkO1xuICBjb25zdCByZXN0ID0gaGVhZCAmJiBoZWFkLm5leHRTaWJsaW5nO1xuICBpZiAoIWhlYWQgfHwgaGVhZC5ub2RlTmFtZSAhPT0gJ1NUUk9ORycgfHwgIXJlc3QgfHwgcmVzdC5ub2RlVHlwZSAhPT0gTm9kZS5URVhUX05PREUgfHwgIUdMT1NTQVJZX1NFUEFSQVRPUl9SRS50ZXN0KHJlc3QudGV4dENvbnRlbnQpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHsgaGVhZCwgcmVzdCB9O1xufVxuXG5mdW5jdGlvbiBpc0dsb3NzYXJ5TGlzdChpdGVtcykge1xuICBjb25zdCBbbWluLCBtYXhdID0gVEVNUExBVEVfTElNSVRTLmdsb3NzYXJ5O1xuICByZXR1cm4gaXRlbXMubGVuZ3RoID49IG1pbiAmJiBpdGVtcy5sZW5ndGggPD0gbWF4ICYmIGl0ZW1zLmV2ZXJ5KGxpID0+IHtcbiAgICBjb25zdCBwYXJ0cyA9IGdsb3NzYXJ5UGFydHMobGkpO1xuICAgIHJldHVybiBwYXJ0cyAmJiAhbGkucXVlcnlTZWxlY3RvcihURU1QTEFURV9JVEVNX0JMT0NLRVJTKVxuICAgICAgJiYgcGFydHMuaGVhZC50ZXh0Q29udGVudC50cmltKCkubGVuZ3RoIDw9IFRFTVBMQVRFX0xJTUlUUy5nbG9zc2FyeVRlcm1DaGFyc1xuICAgICAgJiYgbGkudGV4dENvbnRlbnQudHJpbSgpLmxlbmd0aCA8PSBURU1QTEFURV9MSU1JVFMuZ2xvc3NhcnlJdGVtQ2hhcnM7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBkZXRlY3RTbGFiVGVtcGxhdGUoZWxzLCBzbG90Q291bnQpIHtcbiAgaWYgKHNsb3RDb3VudCA+IDAgfHwgZWxzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICdzdGFuZGFyZCc7XG4gIGNvbnN0IHRleHRMZW4gPSBlbCA9PiBlbC50ZXh0Q29udGVudC50cmltKCkubGVuZ3RoO1xuICBjb25zdCB0YWdzID0gZWxzLm1hcChlbCA9PiBlbC50YWdOYW1lKTtcblxuICBjb25zdCBsZWFkTGVuID0gZWxzLnJlZHVjZSgoc3VtLCBlbCkgPT4gc3VtICsgdGV4dExlbihlbCksIDApO1xuICBpZiAodGFncy5ldmVyeSh0ID0+IHQgPT09ICdQJykgJiYgZWxzLmxlbmd0aCA8PSAyICYmIGxlYWRMZW4gPiAwICYmIGxlYWRMZW4gPD0gVEVNUExBVEVfTElNSVRTLmxlYWRDaGFycykgcmV0dXJuICdsZWFkJztcblxuICBjb25zdCBsaXN0ID0gZWxzW2Vscy5sZW5ndGggLSAxXTtcbiAgY29uc3QgaGFzSW50cm8gPSBlbHMubGVuZ3RoID09PSAyICYmIHRhZ3NbMF0gPT09ICdQJztcbiAgaWYgKChlbHMubGVuZ3RoID09PSAxIHx8IGhhc0ludHJvKSAmJiAobGlzdC50YWdOYW1lID09PSAnVUwnIHx8IGxpc3QudGFnTmFtZSA9PT0gJ09MJykpIHtcbiAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20obGlzdC5jaGlsZHJlbik7XG4gICAgaWYgKGxpc3QudGFnTmFtZSA9PT0gJ1VMJyAmJiBpc0dsb3NzYXJ5TGlzdChpdGVtcykpIHJldHVybiAnZ2xvc3NhcnknO1xuICAgIGNvbnN0IHBsYWluID0gaXRlbXMuZXZlcnkobGkgPT4gIWxpLnF1ZXJ5U2VsZWN0b3IoVEVNUExBVEVfSVRFTV9CTE9DS0VSUykgJiYgdGV4dExlbihsaSkgPD0gVEVNUExBVEVfTElNSVRTLml0ZW1DaGFycyk7XG4gICAgY29uc3QgW21pbiwgbWF4XSA9IGxpc3QudGFnTmFtZSA9PT0gJ1VMJyA/IFRFTVBMQVRFX0xJTUlUUy5wb2ludHMgOiBURU1QTEFURV9MSU1JVFMuc3RlcHM7XG4gICAgaWYgKHBsYWluICYmIGl0ZW1zLmxlbmd0aCA+PSBtaW4gJiYgaXRlbXMubGVuZ3RoIDw9IG1heCkgcmV0dXJuIGxpc3QudGFnTmFtZSA9PT0gJ1VMJyA/ICdwb2ludHMnIDogJ3N0ZXBzJztcbiAgfVxuXG4gIGlmIChlbHMubGVuZ3RoID09PSAxICYmIHRhZ3NbMF0gPT09ICdCTE9DS1FVT1RFJykge1xuICAgIGNvbnN0IHBhcmFzID0gQXJyYXkuZnJvbShlbHNbMF0uY2hpbGRyZW4pO1xuICAgIGlmIChwYXJhcy5sZW5ndGggPj0gMSAmJiBwYXJhcy5sZW5ndGggPD0gMyAmJiBwYXJhcy5ldmVyeShwID0+IHAudGFnTmFtZSA9PT0gJ1AnKSAmJiB0ZXh0TGVuKGVsc1swXSkgPD0gVEVNUExBVEVfTElNSVRTLnF1b3RlQ2hhcnMpIHJldHVybiAncXVvdGUnO1xuICB9XG4gIHJldHVybiAnc3RhbmRhcmQnO1xufVxuXG4vLyDopoHngrnjgqvjg7zjg4njga7lhYjpoK3lpKrlrZfjgYwgS1BJIOaVsOWApO+8iOS+izogXCIxMjAgbXNcIiwgXCI5OS45JVwiLCBcIiszOCVcIiwgXCI0LjLlgI1cIiwgXCIw5Lu2XCIsIFwiJDEuMk1cIu+8ieOBp+OBguOCi+WgtOWQiOOBruWIpOWumu+8iEZSLTAyNywgRFRQLVZUUEwtMDM177yJXG5jb25zdCBNRVRSSUNfVElUTEVfUkUgPSAvXlsrXFwt4oiSwrHiiYh+XT9bwqUk4oKswqNdP1xcZFtcXGQsXSooPzpcXC5cXGQrKT9bIFxcdF0qKD86JXzvvIV8bXN8c3xzZWN8bWlufGh8ZnBzfEh6fGtIenxNSHp8R0h6fEtCfE1CfEdCfFRCfHB4fHJlbXxlbXx2d3x2aHx4fMOXfOWAjXzku7Z85YCLfOWGhnzkuId85YSEfOWbnnzkurp85Y+wfOW5tHzmnIh85pelfOaZgumWk3zliIZ856eSfOWtl3zpoIXnm6586KGMfOWIl3zmnpp856iufOeCuXznq6B856+AfOautXxbYS16QS1aXXsxLDR9KT8oPzpcXHMqWy/vvI9dXFxzKlthLXpBLVowLTnkuIAt6b6g44GBLeOCk+OCoS3jg7ZdKyk/JC87XG5cbi8vIOimgeeCueOCq+ODvOODieOBruWFqOmgheebruOBruWkquWtl+OCv+OCpOODiOODq+OBjOW5tOODu+Wbm+WNiuacn+ODu+W5tOaciOODu1BoYXNl44O7U3RlcOODu3ZYLlkg562J44Gu5pmC57O75YiX44Op44OZ44Or44Gn44GC44KL5aC05ZCI44Gu5Yik5a6a77yIRlItMDI5LCBEVFAtVlRQTC0wMzbvvIlcbmNvbnN0IFRJTUVMSU5FX1RJVExFX1JFID0gL14oPzooPzoxOXwyMClcXGR7Mn0oPzpb5bm0L1xcLS5cXHNdKig/OlFbMS00XXxIWzEyXXxbMDFdP1xcZCg/OuaciCk/KSk/fFFbMS00XVxccyooPzoxOXwyMCk/XFxkezJ9fCg/OlBoYXNlfFN0ZXB8U3RhZ2V8V2F2ZXxTcHJpbnR8RGF5fFdlZWt8TW9udGh8WWVhcilcXHMqXFxkK3znrKxcXHMqXFxkK1xccyooPzrmnJ985LiW5LujfOautemajnzjg5Xjgqfjg7zjgropfHZcXGQrXFwuXFxkKyg/OlxcLlxcZCspPykkL2k7XG5cbi8vIDIg6aCF55uu44Gu6KaB54K544Kr44O844OJ44GMIEJlZm9yZSAvIEFmdGVy77yI5b6T5p2lIC8g5paw5pa55byP44CB6Kqy6aGMIC8g6Kej5rG6IOetie+8ieOBruWvvuOBp+OBguOCi+WgtOWQiOOBruWIpOWumu+8iEZSLTAzMCwgRFRQLVZUUEwtMDM377yJXG5jb25zdCBDT01QQVJFX0JFRk9SRV9SRSA9IC9eKD86QmVmb3JlfEFzW1xccy1dP0lzfExlZ2FjeXxPbGR85b6T5p2lKD865pa55byPfOaJi+azlSk/fOaXpyg/OuaWueW8j3zkuJbku6N844K344K544OG44OgKT985aSJ5pu05YmNfOWwjuWFpeWJjXzoqrLpoYx85ZWP6aGM54K5KSg/OlxccypbOu+8mlxcLeKAlC/vvI8o77yIXS4qKT8kL2k7XG5jb25zdCBDT01QQVJFX0FGVEVSX1JFID0gL14oPzpBZnRlcnxUb1tcXHMtXT9CZXxOZXd8TW9kZXJufEx1Y2l2b3zmlrAoPzrmlrnlvI985omL5rOVfOS4luS7o3zjgrfjgrnjg4bjg6ApP3zlpInmm7Tlvox85bCO5YWl5b6MfOino+axuig/Ouetlik/fOaUueWWhOW+jCkoPzpcXHMqWzrvvJpcXC3igJQv77yPKO+8iF0uKik/JC9pO1xuXG4vLyDpm5vlvaLjgavlkIjjgo/jgZvjgabmnKzmlofopoHntKDjgpLntYTjgb/mm7/jgYjjgovvvIhERC1WVFBMLTAxMOOAnDAxNCwgMDM144CcMDM377yJ44CCZWxzIOOBr+OCueODqeODluOBriBET00g44Gu5Lit44Gu6KaB57Sg44Gn44CB55u05o6l5pu444GN5o+b44GI44KLXG5mdW5jdGlvbiBhcHBseVNsYWJUZW1wbGF0ZSh0ZW1wbGF0ZSwgZWxzKSB7XG4gIGNvbnN0IGxhc3QgPSBlbHNbZWxzLmxlbmd0aCAtIDFdO1xuICBpZiAodGVtcGxhdGUgPT09ICdsZWFkJykge1xuICAgIGNvbnN0IGxlYWQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICBsZWFkLmNsYXNzTmFtZSA9ICd2cy1sZWFkJztcbiAgICBlbHNbMF0uYmVmb3JlKGxlYWQpO1xuICAgIGVscy5mb3JFYWNoKGVsID0+IGxlYWQuYXBwZW5kQ2hpbGQoZWwpKTtcbiAgfSBlbHNlIGlmICh0ZW1wbGF0ZSA9PT0gJ3BvaW50cycpIHtcbiAgICAvLyDliJfjga7mlbDjga/poIXnm67jga7mlbDjgYvjgonmsbrjgoHjgIHmnIDlvozjga7ooYzjgasgMSDmnprjgaDjgZHmrovjgovnq6/mlbDjgpLkvZzjgonjgarjgYTvvIhEVFAtVlRQTC0wMzAsIFJHSC05MDLvvIlcbiAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20obGFzdC5jaGlsZHJlbik7XG4gICAgY29uc3QgY291bnQgPSBpdGVtcy5sZW5ndGg7XG4gICAgbGFzdC5jbGFzc0xpc3QuYWRkKCd2cy1wb2ludHMnKTtcbiAgICBsYXN0LnN0eWxlLnNldFByb3BlcnR5KCctLXZzLWNvbHMnLCBTdHJpbmcoY291bnQgPT09IDQgPyAyIDogTWF0aC5taW4oY291bnQsIDMpKSk7XG4gICAgbGFzdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS12cy1jb2xzLXdpZGUnLCBTdHJpbmcoY291bnQgPT09IDQgPyA0IDogTWF0aC5taW4oY291bnQsIDMpKSk7XG4gICAgLy8g44CMKirpoYwqKjog6Kqs5piO44CN44Gu6aCF55uu44Gv44CB5aSq5a2X44KS6aGM44Go44GX44Gm5YiH44KK5Ye644GX44CB5Yy65YiH44KK44GuIDog44KS5raI44GZ77yIRFRQLVZUUEwtMDMw77yJXG4gICAgY29uc3QgdGl0bGVzID0gW107XG4gICAgaXRlbXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCBoZWFkID0gbGkuZmlyc3RDaGlsZDtcbiAgICAgIGNvbnN0IHJlc3QgPSBoZWFkICYmIGhlYWQubmV4dFNpYmxpbmc7XG4gICAgICBpZiAoaGVhZCAmJiBoZWFkLm5vZGVOYW1lID09PSAnU1RST05HJyAmJiByZXN0ICYmIHJlc3Qubm9kZVR5cGUgPT09IDMgJiYgL15cXHMqWzrvvJpdLy50ZXN0KHJlc3QudGV4dENvbnRlbnQpKSB7XG4gICAgICAgIGhlYWQuY2xhc3NMaXN0LmFkZCgndnMtcG9pbnQtdGl0bGUnKTtcbiAgICAgICAgcmVzdC50ZXh0Q29udGVudCA9IHJlc3QudGV4dENvbnRlbnQucmVwbGFjZSgvXlxccypbOu+8ml1cXHMqLywgJycpO1xuICAgICAgICBjb25zdCB0aXRsZVRleHQgPSBoZWFkLnRleHRDb250ZW50LnRyaW0oKTtcbiAgICAgICAgdGl0bGVzLnB1c2goeyBsaSwgaGVhZCwgdGl0bGVUZXh0IH0pO1xuICAgICAgICBpZiAoTUVUUklDX1RJVExFX1JFLnRlc3QodGl0bGVUZXh0KSAmJiAhVElNRUxJTkVfVElUTEVfUkUudGVzdCh0aXRsZVRleHQpKSB7XG4gICAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgndnMtbWV0cmljLWl0ZW0nKTtcbiAgICAgICAgICBoZWFkLmNsYXNzTGlzdC5hZGQoJ3ZzLW1ldHJpYy12YWx1ZScpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCBvcm5hbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgIG9ybmFtZW50LmNsYXNzTmFtZSA9ICd2cy1jYXJkLW9ybmFtZW50JztcbiAgICAgIG9ybmFtZW50LnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAndHJ1ZScpO1xuICAgICAgbGkuYXBwZW5kQ2hpbGQob3JuYW1lbnQpO1xuICAgIH0pO1xuICAgIC8vIOWFqOmgheebruOBjOaZguezu+WIl+ODu+ODnuOCpOODq+OCueODiOODvOODs++8iDIwMjYgUTEsIFBoYXNlIDEsIHYxLjAg562J77yJ44Gu5aC05ZCI44Gv44K/44Kk44Og44Op44Kk44Oz5L+u6aO+44KS5LuY5LiO77yIRlItMDI577yJXG4gICAgaWYgKHRpdGxlcy5sZW5ndGggPT09IGNvdW50ICYmIHRpdGxlcy5ldmVyeSh0ID0+IFRJTUVMSU5FX1RJVExFX1JFLnRlc3QodC50aXRsZVRleHQpKSkge1xuICAgICAgbGFzdC5jbGFzc0xpc3QuYWRkKCd2cy1wb2ludHMtdGltZWxpbmUnKTtcbiAgICAgIHRpdGxlcy5mb3JFYWNoKCh7IGxpLCBoZWFkIH0pID0+IHtcbiAgICAgICAgbGkuY2xhc3NMaXN0LnJlbW92ZSgndnMtbWV0cmljLWl0ZW0nKTtcbiAgICAgICAgaGVhZC5jbGFzc0xpc3QucmVtb3ZlKCd2cy1tZXRyaWMtdmFsdWUnKTtcbiAgICAgICAgbGkuY2xhc3NMaXN0LmFkZCgndnMtdGltZWxpbmUtaXRlbScpO1xuICAgICAgICBoZWFkLmNsYXNzTGlzdC5hZGQoJ3ZzLXRpbWVsaW5lLWJhZGdlJyk7XG4gICAgICB9KTtcbiAgICB9IGVsc2UgaWYgKGNvdW50ID09PSAyICYmIHRpdGxlcy5sZW5ndGggPT09IDJcbiAgICAgICYmIENPTVBBUkVfQkVGT1JFX1JFLnRlc3QodGl0bGVzWzBdLnRpdGxlVGV4dCkgJiYgQ09NUEFSRV9BRlRFUl9SRS50ZXN0KHRpdGxlc1sxXS50aXRsZVRleHQpKSB7XG4gICAgICAvLyAyIOmgheebruOBjCBCZWZvcmUgLyBBZnRlciDjga7lr77jgafjgYLjgovloLTlkIjjga/mr5TovIPjg5rjgqLkv67po77jgpLku5jkuI7vvIhGUi0wMzDvvIlcbiAgICAgIGxhc3QuY2xhc3NMaXN0LmFkZCgndnMtcG9pbnRzLWNvbXBhcmUnKTtcbiAgICAgIHRpdGxlc1swXS5saS5jbGFzc0xpc3QuYWRkKCd2cy1jb21wYXJlLWJlZm9yZScpO1xuICAgICAgdGl0bGVzWzFdLmxpLmNsYXNzTGlzdC5hZGQoJ3ZzLWNvbXBhcmUtYWZ0ZXInKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAodGVtcGxhdGUgPT09ICdnbG9zc2FyeScpIHtcbiAgICAvLyDnrofmnaHmm7jjgY3jgpLlrprnvqnjg6rjgrnjg4jjgavntYTjgb/mm7/jgYjjgovjgILooYzjgZTjgajjga4gZGl2IOOBr+OAgTIg5q6157WE44G/44Gn55So6Kqe44Go6Kqs5piO44Gu5a++44KS5bSp44GV44Gq44GE44Gf44KB77yIREQtVlRQTC0wMTnvvIlcbiAgICBjb25zdCBpdGVtcyA9IEFycmF5LmZyb20obGFzdC5jaGlsZHJlbik7XG4gICAgY29uc3QgZGwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkbCcpO1xuICAgIGRsLmNsYXNzTmFtZSA9ICd2cy1nbG9zc2FyeSc7XG4gICAgaWYgKGl0ZW1zLmxlbmd0aCA+PSBURU1QTEFURV9MSU1JVFMuZ2xvc3NhcnlUd29VcCkgZGwuY2xhc3NMaXN0LmFkZCgnaXMtdHdvLXVwJyk7XG4gICAgaXRlbXMuZm9yRWFjaChsaSA9PiB7XG4gICAgICBjb25zdCB7IGhlYWQsIHJlc3QgfSA9IGdsb3NzYXJ5UGFydHMobGkpO1xuICAgICAgcmVzdC50ZXh0Q29udGVudCA9IHJlc3QudGV4dENvbnRlbnQucmVwbGFjZShHTE9TU0FSWV9TRVBBUkFUT1JfUkUsICcnKTtcbiAgICAgIGNvbnN0IGR0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZHQnKTtcbiAgICAgIGR0LmFwcGVuZCguLi5oZWFkLmNoaWxkTm9kZXMpO1xuICAgICAgaGVhZC5yZW1vdmUoKTtcbiAgICAgIGNvbnN0IGRkID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGQnKTtcbiAgICAgIGRkLmFwcGVuZCguLi5saS5jaGlsZE5vZGVzKTtcbiAgICAgIGNvbnN0IHJvdyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgcm93LmNsYXNzTmFtZSA9ICd2cy1nbG9zcy1yb3cnO1xuICAgICAgcm93LmFwcGVuZChkdCwgZGQpO1xuICAgICAgZGwuYXBwZW5kQ2hpbGQocm93KTtcbiAgICB9KTtcbiAgICBsYXN0LnJlcGxhY2VXaXRoKGRsKTtcbiAgfSBlbHNlIGlmICh0ZW1wbGF0ZSA9PT0gJ3N0ZXBzJykge1xuICAgIGNvbnN0IGNvdW50ID0gbGFzdC5jaGlsZHJlbi5sZW5ndGg7XG4gICAgbGFzdC5jbGFzc0xpc3QuYWRkKCd2cy1zdGVwcycpO1xuICAgIGlmIChjb3VudCA+IDQpIGxhc3QuY2xhc3NMaXN0LmFkZCgnaXMtdmVydGljYWwnKTtcbiAgICBsYXN0LnN0eWxlLnNldFByb3BlcnR5KCctLXZzLW4nLCBTdHJpbmcoY291bnQpKTtcbiAgICBBcnJheS5mcm9tKGxhc3QuY2hpbGRyZW4pLmZvckVhY2goKGxpLCBpZHgpID0+IHtcbiAgICAgIGxpLnN0eWxlLnNldFByb3BlcnR5KCctLXZzLWknLCBTdHJpbmcoaWR4KSk7XG4gICAgICBpZiAoaWR4ID09PSAwKSByZXR1cm47XG4gICAgICBjb25zdCBjaGV2cm9uID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgY2hldnJvbi5jbGFzc05hbWUgPSAndnMtc3RlcC1jaGV2cm9uJztcbiAgICAgIGNoZXZyb24uc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsICd0cnVlJyk7XG4gICAgICBsaS5hcHBlbmRDaGlsZChjaGV2cm9uKTtcbiAgICB9KTtcbiAgfSBlbHNlIGlmICh0ZW1wbGF0ZSA9PT0gJ3F1b3RlJykge1xuICAgIGxhc3QuY2xhc3NMaXN0LmFkZCgndnMtcXVvdGUnKTtcbiAgICBjb25zdCBjaXRlID0gbGFzdC5sYXN0RWxlbWVudENoaWxkO1xuICAgIGlmIChsYXN0LmNoaWxkcmVuLmxlbmd0aCA+IDEgJiYgL15cXHMqKOKAlHzigJV8LS0pLy50ZXN0KGNpdGUudGV4dENvbnRlbnQpKSBjaXRlLmNsYXNzTGlzdC5hZGQoJ3ZzLXF1b3RlLWNpdGUnKTtcbiAgfVxufVxuXG4vLyBWaXN1YWwgU3RhZ2Ug44Gu44K544Od44OD44OI44Op44Kk44OI44O744K544OG44O844K46ZuG5Lit44Oi44O844OJ44KS44GZ44G544Gm6Kej6Zmk44GZ44KL77yIREQtVlRQTC0wMTXvvIlcbmZ1bmN0aW9uIGNsZWFyVmlzdWFsU3RhZ2VTcG90bGlnaHQoY29udGFpbmVyKSB7XG4gIGlmICghY29udGFpbmVyKSByZXR1cm47XG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuaGFzLXNwb3RsaWdodCwgLmlzLXNwb3RsaWdodCwgLmlzLXJlYWNoZWQsIC5oYXMtc3RhZ2UtZm9jdXMsIC5pcy1zdGFnZS1mb2N1c2VkJykuZm9yRWFjaChlbCA9PiB7XG4gICAgZWwuY2xhc3NMaXN0LnJlbW92ZSgnaGFzLXNwb3RsaWdodCcsICdpcy1zcG90bGlnaHQnLCAnaXMtcmVhY2hlZCcsICdoYXMtc3RhZ2UtZm9jdXMnLCAnaXMtc3RhZ2UtZm9jdXNlZCcpO1xuICB9KTtcbn1cblxuLy8g56ug44Gu55S75YOP5YyW77yIRlItMDI277yJ44Gv44CB5Ye65Yqb44GM6KqM6Z2i44Gr44Gq44KJ44Gq44GE44Gf44KBIDAuMi4wIOOBp+OBr+aTjeS9nOmDqOOCkuWHuuOBleOBquOBhO+8iERELVZUUEwtMTI044CBQ1ItMDAx77yJ44CCXG4vLyDnlLvlg4/ljJbjga7lh6bnkIbvvIhyZW5kZXJTbGFiVG9CbG9iIOOBquOBqe+8ieOBr+OAgUNSLTAwMSDjgafkvZzjgornm7TjgZnjgb7jgafmrovjgZlcbmNvbnN0IFNMQUJfSU1BR0VfRVhQT1JUX0VOQUJMRUQgPSBmYWxzZTtcblxuLy8g44K544Op44OW44Gu5pON5L2c44OQ44O877yI55S75YOP44Kz44OU44O844O7UE5H5L+d5a2Y44CBRlItMDI2LCBERC1WVFBMLTEyMO+8iVxuLy8g44Oc44K/44Oz44Gu5paH5a2X44Op44OZ44Or44GvIENTUyA6OmFmdGVyIOOBp+ihqOekuuOBl+OAgeODhuOCreOCueODiOODjuODvOODieOCkuaMgeOBn+OBm+OBquOBhOOBk+OBqOOBp+OCueODqeODluacrOaWh+OBruWGheWuueS4gOiHtO+8iFRDLVZUUEwtMDAz77yJ44KS5L+d44GkXG5mdW5jdGlvbiBidWlsZFNsYWJBY3Rpb25zSHRtbCgpIHtcbiAgaWYgKCFTTEFCX0lNQUdFX0VYUE9SVF9FTkFCTEVEKSByZXR1cm4gJyc7XG4gIHJldHVybiBgXG4gICAgPGRpdiBjbGFzcz1cInNsYWItYWN0aW9uc1wiIGFyaWEtbGFiZWw9XCLjgrnjg6njg5bjga7mk43kvZxcIj5cbiAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIGNsYXNzPVwic2xhYi1hY3Rpb24tYnRuIGJ0bi1jb3B5LXNsYWJcIiB0aXRsZT1cIuOBk+OBrueroOOBruOCq+ODvOODieeUu+WDj+OCkuOCr+ODquODg+ODl+ODnOODvOODieOBq+OCs+ODlOODvFwiIGFyaWEtbGFiZWw9XCLjgrPjg5Tjg7xcIj48c3ZnIGZpbGw9XCJub25lXCIgdmlld0JveD1cIjAgMCAyNCAyNFwiIHN0cm9rZT1cImN1cnJlbnRDb2xvclwiIHN0cm9rZS13aWR0aD1cIjJcIj48cGF0aCBzdHJva2UtbGluZWNhcD1cInJvdW5kXCIgc3Ryb2tlLWxpbmVqb2luPVwicm91bmRcIiBkPVwiTTggMTZINmEyIDIgMCAwMS0yLTJWNmEyIDIgMCAwMTItMmg4YTIgMiAwIDAxMiAydjJtLTYgMTJoOGEyIDIgMCAwMDItMnYtOGEyIDIgMCAwMC0yLTJoLThhMiAyIDAgMDAtMiAydjhhMiAyIDAgMDAyIDJ6XCI+PC9wYXRoPjwvc3ZnPjwvYnV0dG9uPlxuICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgY2xhc3M9XCJzbGFiLWFjdGlvbi1idG4gYnRuLWV4cG9ydC1zbGFiXCIgdGl0bGU9XCLjgZPjga7nq6Djga7jgqvjg7zjg4nnlLvlg4/jgpJQTkfjgajjgZfjgabkv53lrZhcIiBhcmlhLWxhYmVsPVwiUE5HXCI+PHN2ZyBmaWxsPVwibm9uZVwiIHZpZXdCb3g9XCIwIDAgMjQgMjRcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIyXCI+PHBhdGggc3Ryb2tlLWxpbmVjYXA9XCJyb3VuZFwiIHN0cm9rZS1saW5lam9pbj1cInJvdW5kXCIgZD1cIk00IDE2djFhMyAzIDAgMDAzIDNoMTBhMyAzIDAgMDAzLTN2LTFtLTQtNGwtNCA0bTAgMGwtNC00bTQgNFY0XCI+PC9wYXRoPjwvc3ZnPjwvYnV0dG9uPlxuICAgIDwvZGl2PlxuICBgO1xufVxuXG5mdW5jdGlvbiBnZXRTbGFiRmlsZW5hbWUoc2xhYkVsKSB7XG4gIGNvbnN0IHN0YWdlTm8gPSBzbGFiRWwuZGF0YXNldC5zdGFnZU5vIHx8ICcwMCc7XG4gIGNvbnN0IGgyID0gc2xhYkVsLnF1ZXJ5U2VsZWN0b3IoJ2gyJyk7XG4gIGxldCB0aXRsZSA9IGgyID8gaDIudGV4dENvbnRlbnQucmVwbGFjZSgvXlNUQUdFXFxzKlxcZCtcXHMqL2ksICcnKS50cmltKCkgOiAnc2xhYic7XG4gIHRpdGxlID0gdGl0bGUudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9bXmEtejAtOVxcdTMwNDAtXFx1MzA5RlxcdTMwQTAtXFx1MzBGRlxcdTRFMDAtXFx1OUZGRl8tXSsvZywgJy0nKS5zbGljZSgwLCAzMCk7XG4gIHJldHVybiBgc2xhYi0ke3N0YWdlTm99LSR7dGl0bGUgfHwgJ2NhcmQnfS5wbmdgO1xufVxuXG5mdW5jdGlvbiByZW5kZXJTbGFiVG9CbG9iKHNsYWJFbCkge1xuICBjb25zdCByZWN0ID0gc2xhYkVsLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCB3aWR0aCA9IE1hdGgubWF4KDM2MCwgTWF0aC5jZWlsKHJlY3Qud2lkdGgpKTtcbiAgY29uc3QgaGVpZ2h0ID0gTWF0aC5tYXgoMjAwLCBNYXRoLmNlaWwocmVjdC5oZWlnaHQpKTtcblxuICBjb25zdCBjb21wdXRlZCA9IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHNsYWJFbCk7XG4gIGNvbnN0IGJnQ29sb3IgPSBjb21wdXRlZC5iYWNrZ3JvdW5kQ29sb3IgfHwgKHN0YXRlLmFwcGVhcmFuY2UgPT09ICdkYXJrJyA/ICcjMUUyOTNCJyA6ICcjRkZGRkZGJyk7XG4gIGNvbnN0IHRleHRDb2xvciA9IGNvbXB1dGVkLmNvbG9yIHx8IChzdGF0ZS5hcHBlYXJhbmNlID09PSAnZGFyaycgPyAnI0Y4RkFGQycgOiAnIzBGMTcyQScpO1xuICBjb25zdCBib3JkZXJDb2xvciA9IGNvbXB1dGVkLmJvcmRlckNvbG9yIHx8ICdyZ2JhKDE0OCwgMTYzLCAxODQsIDAuMiknO1xuXG4gIGNvbnN0IHdyYXBFbCA9IHNsYWJFbC5jbG9zZXN0KCcuZXhoaWJpdGlvbi13cmFwJyk7XG4gIGNvbnN0IHdyYXBDb21wdXRlZCA9IHdyYXBFbCA/IHdpbmRvdy5nZXRDb21wdXRlZFN0eWxlKHdyYXBFbCkgOiBjb21wdXRlZDtcbiAgY29uc3QgdnNDMSA9IHdyYXBDb21wdXRlZC5nZXRQcm9wZXJ0eVZhbHVlKCctLXZzLWMxJykgfHwgJyMzQjgyRjYnO1xuXG4gIGNvbnN0IGgyID0gc2xhYkVsLnF1ZXJ5U2VsZWN0b3IoJ2gyJyk7XG4gIGNvbnN0IHN0YWdlQmFkZ2UgPSBzbGFiRWwucXVlcnlTZWxlY3RvcignLmV4aGliaXRpb24tbnVtLWJhZGdlJyk7XG4gIGNvbnN0IHN0YWdlVGV4dCA9IHN0YWdlQmFkZ2UgPyBzdGFnZUJhZGdlLnRleHRDb250ZW50LnRyaW0oKSA6IChzbGFiRWwuZGF0YXNldC5zdGFnZU5vID8gYFNUQUdFICR7c2xhYkVsLmRhdGFzZXQuc3RhZ2VOb31gIDogJycpO1xuICBjb25zdCB0aXRsZVRleHQgPSBoMiA/IGgyLnRleHRDb250ZW50LnJlcGxhY2UoL15TVEFHRVxccypcXGQrXFxzKi9pLCAnJykucmVwbGFjZSgv44Kz44OU44O8fFBORy9nLCAnJykudHJpbSgpIDogJ0x1Y2l2byBDYXJkJztcblxuICBjb25zdCBsZWFkRWwgPSBzbGFiRWwucXVlcnlTZWxlY3RvcignLnZzLWxlYWQsIHAsIC52cy1xdW90ZSwgbGknKTtcbiAgY29uc3QgbGVhZFRleHQgPSBsZWFkRWwgPyBsZWFkRWwudGV4dENvbnRlbnQudHJpbSgpLnNsaWNlKDAsIDEyMCkgOiAnJztcblxuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbiAgICAvLyDjgr/jgqTjg6DjgqLjgqbjg4jjgb7jgZ/jga/jg5Xjgqnjg7zjg6vjg5Djg4Pjgq/nlKjjga7nm7TmjqUgQ2FudmFzIOaPj+eUu++8iGZpbGU6Ly8g55Kw5aKD44Gn44Gu44OP44Oz44Kw6Ziy5q2i77yJXG4gICAgY29uc3QgcmVuZGVyRmFsbGJhY2sgPSAoKSA9PiB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzY2FsZSA9IDI7XG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBjYW52YXMud2lkdGggPSB3aWR0aCAqIHNjYWxlO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0ICogc2NhbGU7XG4gICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICBjdHguc2NhbGUoc2NhbGUsIHNjYWxlKTtcblxuICAgICAgICBjdHguZmlsbFN0eWxlID0gYmdDb2xvcjtcbiAgICAgICAgaWYgKGN0eC5yb3VuZFJlY3QpIHtcbiAgICAgICAgICBjdHguYmVnaW5QYXRoKCk7XG4gICAgICAgICAgY3R4LnJvdW5kUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0LCAxNik7XG4gICAgICAgICAgY3R4LmZpbGwoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIH1cblxuICAgICAgICBjdHguc3Ryb2tlU3R5bGUgPSBib3JkZXJDb2xvcjtcbiAgICAgICAgY3R4LmxpbmVXaWR0aCA9IDE7XG4gICAgICAgIGlmIChjdHgucm91bmRSZWN0KSB7XG4gICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgIGN0eC5yb3VuZFJlY3QoMCwgMCwgd2lkdGgsIGhlaWdodCwgMTYpO1xuICAgICAgICAgIGN0eC5zdHJva2UoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjdHguc3Ryb2tlUmVjdCgwLCAwLCB3aWR0aCwgaGVpZ2h0KTtcbiAgICAgICAgfVxuXG4gICAgICAgIGxldCB0ZXh0WCA9IDI0O1xuICAgICAgICBpZiAoc3RhZ2VUZXh0KSB7XG4gICAgICAgICAgY3R4LmZpbGxTdHlsZSA9IHZzQzEudHJpbSgpIHx8ICcjM0I4MkY2JztcbiAgICAgICAgICBjb25zdCBiYWRnZVdpZHRoID0gNzI7XG4gICAgICAgICAgY29uc3QgYmFkZ2VIZWlnaHQgPSAyMjtcbiAgICAgICAgICBpZiAoY3R4LnJvdW5kUmVjdCkge1xuICAgICAgICAgICAgY3R4LmJlZ2luUGF0aCgpO1xuICAgICAgICAgICAgY3R4LnJvdW5kUmVjdCh0ZXh0WCwgMjIsIGJhZGdlV2lkdGgsIGJhZGdlSGVpZ2h0LCAxMSk7XG4gICAgICAgICAgICBjdHguZmlsbCgpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjdHguZmlsbFJlY3QodGV4dFgsIDIyLCBiYWRnZVdpZHRoLCBiYWRnZUhlaWdodCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSAnI0ZGRkZGRic7XG4gICAgICAgICAgY3R4LmZvbnQgPSAnYm9sZCAxMXB4IFwiSmV0QnJhaW5zIE1vbm9cIiwgbW9ub3NwYWNlJztcbiAgICAgICAgICBjdHgudGV4dEFsaWduID0gJ2NlbnRlcic7XG4gICAgICAgICAgY3R4LnRleHRCYXNlbGluZSA9ICdtaWRkbGUnO1xuICAgICAgICAgIGN0eC5maWxsVGV4dChzdGFnZVRleHQsIHRleHRYICsgYmFkZ2VXaWR0aCAvIDIsIDIyICsgYmFkZ2VIZWlnaHQgLyAyKTtcbiAgICAgICAgICB0ZXh0WCArPSBiYWRnZVdpZHRoICsgMTI7XG4gICAgICAgIH1cblxuICAgICAgICBjdHgudGV4dEFsaWduID0gJ2xlZnQnO1xuICAgICAgICBjdHgudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSB0ZXh0Q29sb3I7XG4gICAgICAgIGN0eC5mb250ID0gJ2JvbGQgMThweCBcIlBsdXMgSmFrYXJ0YSBTYW5zXCIsIHNhbnMtc2VyaWYnO1xuICAgICAgICBjdHguZmlsbFRleHQodGl0bGVUZXh0LCB0ZXh0WCwgMzMpO1xuXG4gICAgICAgIGlmIChsZWFkVGV4dCkge1xuICAgICAgICAgIGN0eC5maWxsU3R5bGUgPSB0ZXh0Q29sb3I7XG4gICAgICAgICAgY3R4LmZvbnQgPSAnMTRweCBcIk5vdG8gU2FucyBKUFwiLCBzYW5zLXNlcmlmJztcbiAgICAgICAgICBjdHgudGV4dEJhc2VsaW5lID0gJ3RvcCc7XG4gICAgICAgICAgY3R4LmZpbGxUZXh0KGxlYWRUZXh0LCAyNCwgNjApO1xuICAgICAgICB9XG5cbiAgICAgICAgY2FudmFzLnRvQmxvYihibG9iID0+IHtcbiAgICAgICAgICByZXNvbHZlKGJsb2IgfHwgbmV3IEJsb2IoW10sIHsgdHlwZTogJ2ltYWdlL3BuZycgfSkpO1xuICAgICAgICB9LCAnaW1hZ2UvcG5nJyk7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmVzb2x2ZShuZXcgQmxvYihbXSwgeyB0eXBlOiAnaW1hZ2UvcG5nJyB9KSk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIGNvbnN0IHRpbWVyID0gc2V0VGltZW91dChyZW5kZXJGYWxsYmFjaywgMjUwKTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBjbG9uZSA9IHNsYWJFbC5jbG9uZU5vZGUodHJ1ZSk7XG4gICAgICBjbG9uZS5xdWVyeVNlbGVjdG9yQWxsKCcuc2xhYi1hY3Rpb25zLCBjYW52YXMuc2lnbmFsLWxpZ2h0LWNhbnZhcycpLmZvckVhY2goZWwgPT4gZWwucmVtb3ZlKCkpO1xuXG4gICAgICBjb25zdCBzdmdEYXRhID0gYFxuICAgICAgICA8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIiB3aWR0aD1cIiR7d2lkdGh9XCIgaGVpZ2h0PVwiJHtoZWlnaHR9XCI+XG4gICAgICAgICAgPGZvcmVpZ25PYmplY3Qgd2lkdGg9XCIxMDAlXCIgaGVpZ2h0PVwiMTAwJVwiPlxuICAgICAgICAgICAgPGRpdiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzE5OTkveGh0bWxcIj5cbiAgICAgICAgICAgICAgPGRpdiBzdHlsZT1cImZvbnQtZmFtaWx5OidQbHVzIEpha2FydGEgU2Fucycsc2Fucy1zZXJpZjtjb2xvcjoke3RleHRDb2xvcn07YmFja2dyb3VuZDoke2JnQ29sb3J9O3BhZGRpbmc6MS41cmVtO3dpZHRoOjEwMCU7aGVpZ2h0OjEwMCU7Ym94LXNpemluZzpib3JkZXItYm94O1wiPlxuICAgICAgICAgICAgICAgICR7Y2xvbmUuaW5uZXJIVE1MfVxuICAgICAgICAgICAgICA8L2Rpdj5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICAgIDwvZm9yZWlnbk9iamVjdD5cbiAgICAgICAgPC9zdmc+XG4gICAgICBgO1xuXG4gICAgICBjb25zdCBpbWcgPSBuZXcgSW1hZ2UoKTtcbiAgICAgIGNvbnN0IHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnRGF0YV0sIHsgdHlwZTogJ2ltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCcgfSk7XG4gICAgICBjb25zdCB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKHN2Z0Jsb2IpO1xuXG4gICAgICBpbWcub25sb2FkID0gKCkgPT4ge1xuICAgICAgICBjbGVhclRpbWVvdXQodGltZXIpO1xuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybCk7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3Qgc2NhbGUgPSAyO1xuICAgICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoICogc2NhbGU7XG4gICAgICAgICAgY2FudmFzLmhlaWdodCA9IGhlaWdodCAqIHNjYWxlO1xuICAgICAgICAgIGNvbnN0IGN0eCA9IGNhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xuICAgICAgICAgIGN0eC5zY2FsZShzY2FsZSwgc2NhbGUpO1xuICAgICAgICAgIGN0eC5kcmF3SW1hZ2UoaW1nLCAwLCAwKTtcbiAgICAgICAgICBjYW52YXMudG9CbG9iKGJsb2IgPT4ge1xuICAgICAgICAgICAgaWYgKGJsb2IpIHJlc29sdmUoYmxvYik7XG4gICAgICAgICAgICBlbHNlIHJlbmRlckZhbGxiYWNrKCk7XG4gICAgICAgICAgfSwgJ2ltYWdlL3BuZycpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgcmVuZGVyRmFsbGJhY2soKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgaW1nLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgICAgIGNsZWFyVGltZW91dCh0aW1lcik7XG4gICAgICAgIFVSTC5yZXZva2VPYmplY3RVUkwodXJsKTtcbiAgICAgICAgcmVuZGVyRmFsbGJhY2soKTtcbiAgICAgIH07XG5cbiAgICAgIGltZy5zcmMgPSB1cmw7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY2xlYXJUaW1lb3V0KHRpbWVyKTtcbiAgICAgIHJlbmRlckZhbGxiYWNrKCk7XG4gICAgfVxuICB9KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29weVNsYWJJbWFnZShzbGFiRWwpIHtcbiAgY29uc3QgZmlsZW5hbWUgPSBnZXRTbGFiRmlsZW5hbWUoc2xhYkVsKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBibG9iID0gYXdhaXQgcmVuZGVyU2xhYlRvQmxvYihzbGFiRWwpO1xuICAgIGlmIChuYXZpZ2F0b3IuY2xpcGJvYXJkICYmIHdpbmRvdy5DbGlwYm9hcmRJdGVtKSB7XG4gICAgICBhd2FpdCBuYXZpZ2F0b3IuY2xpcGJvYXJkLndyaXRlKFtuZXcgQ2xpcGJvYXJkSXRlbSh7ICdpbWFnZS9wbmcnOiBibG9iIH0pXSk7XG4gICAgICBzaG93VG9hc3QoJ+OCueODqeODlueUu+WDj+OCkuOCr+ODquODg+ODl+ODnOODvOODieOBq+OCs+ODlOODvOOBl+OBvuOBl+OBnycpO1xuICAgIH0gZWxzZSB7XG4gICAgICBkb3dubG9hZEJsb2IoYmxvYiwgZmlsZW5hbWUsICdpbWFnZS9wbmcnKTtcbiAgICAgIHNob3dUb2FzdCgn44Kv44Oq44OD44OX44Oc44O844OJ6Z2e5a++5b+c44Gu44Gf44KB55S75YOP44KS5L+d5a2Y44GX44G+44GX44GfJyk7XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ2NvcHlTbGFiSW1hZ2UgZmFpbGVkLCBmYWxsYmFjayB0byBkb3dubG9hZCcsIGVycik7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGJsb2IgPSBhd2FpdCByZW5kZXJTbGFiVG9CbG9iKHNsYWJFbCk7XG4gICAgICBkb3dubG9hZEJsb2IoYmxvYiwgZmlsZW5hbWUsICdpbWFnZS9wbmcnKTtcbiAgICAgIHNob3dUb2FzdCgn55S75YOP44KS5L+d5a2Y44GX44G+44GX44GfJyk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgc2hvd1RvYXN0KCfnlLvlg4/jga7jgqjjgq/jgrnjg53jg7zjg4jjgavlpLHmlZfjgZfjgb7jgZfjgZ8nKTtcbiAgICB9XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gZXhwb3J0U2xhYkltYWdlKHNsYWJFbCkge1xuICBjb25zdCBmaWxlbmFtZSA9IGdldFNsYWJGaWxlbmFtZShzbGFiRWwpO1xuICB0cnkge1xuICAgIGNvbnN0IGJsb2IgPSBhd2FpdCByZW5kZXJTbGFiVG9CbG9iKHNsYWJFbCk7XG4gICAgZG93bmxvYWRCbG9iKGJsb2IsIGZpbGVuYW1lLCAnaW1hZ2UvcG5nJyk7XG4gICAgc2hvd1RvYXN0KCfjgrnjg6njg5bnlLvlg4/jgpLkv53lrZjjgZfjgb7jgZfjgZ8nKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKCdleHBvcnRTbGFiSW1hZ2UgZmFpbGVkJywgZXJyKTtcbiAgICBzaG93VG9hc3QoJ+eUu+WDj+OBruOCqOOCr+OCueODneODvOODiOOBq+WkseaVl+OBl+OBvuOBl+OBnycpO1xuICB9XG59XG5cbi8vIFZpc3VhbCBTdGFnZSDjga7li5XnmoTjgrnjg4bjg7zjgrjmvJTlh7rvvIjopoHngrnjgqvjg7zjg4njg7vmiYvpoIbjgrnjg4bjg4Pjg5fjg7tTVEFHRSDjg5Djg4Pjgrjjga7jgq/jg6rjg4Pjgq/mk43kvZzvvInjgpLntZDnt5rjgZnjgovvvIhGUi0wMTcsIERELVZUUEwtMDE177yJXG5mdW5jdGlvbiBzZXR1cFZpc3VhbFN0YWdlSW50ZXJhY3Rpb25zKCkge1xuICBjb25zdCB2aXNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlzdWFsLXN0YWdlLWNvbnRhaW5lcicpO1xuICBpZiAoIXZpc0NvbnRhaW5lcikgcmV0dXJuO1xuXG4gIC8vIOe0meOBr+aTjeS9nOOBp+OBjeOBquOBhOOBn+OCgeOAgeOCueODneODg+ODiOODqeOCpOODiOODu+eroOOBruazqOebruOBq+OCiOOCi+a4m+WFieOCkuWkluOBl+OBn+iqjOmdouOCkuWIt+OCi++8iEZSLTAzNiwgREQtVlRQTC0xMzHvvIlcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2JlZm9yZXByaW50JywgKCkgPT4gY2xlYXJWaXN1YWxTdGFnZVNwb3RsaWdodCh2aXNDb250YWluZXIpKTtcblxuICB2aXNDb250YWluZXIuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XG4gICAgLy8g6KGo57SZ44Gu55uu5qyhOiDpgbjjgpPjgaDnq6Djga7lhYjpoK3jgb7jgafjgrnjgq/jg63jg7zjg6vjgZnjgovvvIhGUi0wMjAsIERELVZUUEwtMDQy77yJXG4gICAgY29uc3QgYWdlbmRhSXRlbSA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KCcudnMtY292ZXItYWdlbmRhLWl0ZW0nKTtcbiAgICBpZiAoYWdlbmRhSXRlbSkge1xuICAgICAgY29uc3Qgc2xhYiA9IHZpc0NvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGAuZXhoaWJpdGlvbi1zbGFiW2RhdGEtc3RhZ2Utbm89XCIke2FnZW5kYUl0ZW0uZGF0YXNldC5zdGFnZVRhcmdldH1cIl1gKTtcbiAgICAgIGlmIChzbGFiKSBzbGFiLnNjcm9sbEludG9WaWV3KHsgYmVoYXZpb3I6IHNjcm9sbEJlaGF2aW9yKCksIGJsb2NrOiAnc3RhcnQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIOOCueODqeODlueUu+WDj+OCqOOCr+OCueODneODvOODiOODu+OCr+ODquODg+ODl+ODnOODvOODieOCs+ODlOODvO+8iEZSLTAyNiwgREQtVlRQTC0xMjDvvIlcbiAgICBjb25zdCBjb3B5QnRuID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJy5idG4tY29weS1zbGFiJyk7XG4gICAgaWYgKGNvcHlCdG4pIHtcbiAgICAgIGNvbnN0IHNsYWIgPSBjb3B5QnRuLmNsb3Nlc3QoJy5leGhpYml0aW9uLXNsYWInKTtcbiAgICAgIGlmIChzbGFiKSBjb3B5U2xhYkltYWdlKHNsYWIpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBleHBvcnRCdG4gPSBldmVudC50YXJnZXQuY2xvc2VzdCgnLmJ0bi1leHBvcnQtc2xhYicpO1xuICAgIGlmIChleHBvcnRCdG4pIHtcbiAgICAgIGNvbnN0IHNsYWIgPSBleHBvcnRCdG4uY2xvc2VzdCgnLmV4aGliaXRpb24tc2xhYicpO1xuICAgICAgaWYgKHNsYWIpIGV4cG9ydFNsYWJJbWFnZShzbGFiKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyDjgrPjg7zjg4njg7vjgrfjg6fjg7zjgrHjg7zjgrnjga7jg6/jg7Pjgq/jg6rjg4Pjgq/jgrPjg5Tjg7zvvIhGUi0wMzEsIERELVZUUEwtMDM477yJXG4gICAgY29uc3QgY29kZUNvcHlCdG4gPSBldmVudC50YXJnZXQuY2xvc2VzdCgnLnZzLWNvZGUtY29weS1idG4nKTtcbiAgICBpZiAoY29kZUNvcHlCdG4pIHtcbiAgICAgIGNvbnN0IHByZSA9IGNvZGVDb3B5QnRuLmNsb3Nlc3QoJ3ByZScpO1xuICAgICAgY29uc3QgY29kZUVsID0gcHJlICYmIHByZS5xdWVyeVNlbGVjdG9yKCdjb2RlJyk7XG4gICAgICBjb25zdCBjb2RlVGV4dCA9IGNvZGVFbCA/IGNvZGVFbC50ZXh0Q29udGVudCA6ICcnO1xuICAgICAgaWYgKG5hdmlnYXRvci5jbGlwYm9hcmQgJiYgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQpIHtcbiAgICAgICAgbmF2aWdhdG9yLmNsaXBib2FyZC53cml0ZVRleHQoY29kZVRleHQpLmNhdGNoKCgpID0+IHt9KTtcbiAgICAgIH1cbiAgICAgIGNvZGVDb3B5QnRuLnNldEF0dHJpYnV0ZSgnZGF0YS1jb3B5LWxhYmVsJywgJ0NvcGllZCcpO1xuICAgICAgY29kZUNvcHlCdG4uY2xhc3NMaXN0LmFkZCgnaXMtY29waWVkJyk7XG4gICAgICBzaG93VG9hc3QoJ+OCs+ODvOODieOCkuOCr+ODquODg+ODl+ODnOODvOODieOBq+OCs+ODlOODvOOBl+OBvuOBl+OBnycpO1xuICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgIGNvZGVDb3B5QnRuLnNldEF0dHJpYnV0ZSgnZGF0YS1jb3B5LWxhYmVsJywgJ0NvcHknKTtcbiAgICAgICAgY29kZUNvcHlCdG4uY2xhc3NMaXN0LnJlbW92ZSgnaXMtY29waWVkJyk7XG4gICAgICB9LCAxNjAwKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2EsIGJ1dHRvbicpKSByZXR1cm47XG5cbiAgICBjb25zdCBiYWRnZSA9IGV2ZW50LnRhcmdldC5jbG9zZXN0KCcuZXhoaWJpdGlvbi1udW0tYmFkZ2UnKTtcbiAgICBpZiAoYmFkZ2UpIHtcbiAgICAgIGNvbnN0IHNsYWIgPSBiYWRnZS5jbG9zZXN0KCcuZXhoaWJpdGlvbi1zbGFiJyk7XG4gICAgICBjb25zdCB3cmFwID0gYmFkZ2UuY2xvc2VzdCgnLmV4aGliaXRpb24td3JhcCcpO1xuICAgICAgaWYgKCFzbGFiIHx8ICF3cmFwKSByZXR1cm47XG4gICAgICBzbGFiLmNsYXNzTGlzdC50b2dnbGUoJ2lzLXN0YWdlLWZvY3VzZWQnKTtcbiAgICAgIHdyYXAuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLXN0YWdlLWZvY3VzJywgQm9vbGVhbih3cmFwLnF1ZXJ5U2VsZWN0b3IoJy5leGhpYml0aW9uLXNsYWIuaXMtc3RhZ2UtZm9jdXNlZCcpKSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgcG9pbnRJdGVtID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJy52cy1wb2ludHMgPiBsaScpO1xuICAgIGlmIChwb2ludEl0ZW0pIHtcbiAgICAgIGNvbnN0IGxpc3QgPSBwb2ludEl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICAgIGNvbnN0IHdpbGxTcG90bGlnaHQgPSAhcG9pbnRJdGVtLmNsYXNzTGlzdC5jb250YWlucygnaXMtc3BvdGxpZ2h0Jyk7XG4gICAgICBBcnJheS5mcm9tKGxpc3QuY2hpbGRyZW4pLmZvckVhY2gobGkgPT4gbGkuY2xhc3NMaXN0LnJlbW92ZSgnaXMtc3BvdGxpZ2h0JykpO1xuICAgICAgaWYgKHdpbGxTcG90bGlnaHQpIHBvaW50SXRlbS5jbGFzc0xpc3QuYWRkKCdpcy1zcG90bGlnaHQnKTtcbiAgICAgIGxpc3QuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLXNwb3RsaWdodCcsIHdpbGxTcG90bGlnaHQpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IHN0ZXBJdGVtID0gZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJy52cy1zdGVwcyA+IGxpJyk7XG4gICAgaWYgKHN0ZXBJdGVtKSB7XG4gICAgICBjb25zdCBsaXN0ID0gc3RlcEl0ZW0ucGFyZW50RWxlbWVudDtcbiAgICAgIGNvbnN0IGl0ZW1zID0gQXJyYXkuZnJvbShsaXN0LmNoaWxkcmVuKTtcbiAgICAgIGNvbnN0IHRhcmdldElkeCA9IGl0ZW1zLmluZGV4T2Yoc3RlcEl0ZW0pO1xuICAgICAgY29uc3Qgd2lsbFNwb3RsaWdodCA9ICFzdGVwSXRlbS5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXNwb3RsaWdodCcpO1xuICAgICAgaXRlbXMuZm9yRWFjaCgobGksIGlkeCkgPT4ge1xuICAgICAgICBsaS5jbGFzc0xpc3QudG9nZ2xlKCdpcy1zcG90bGlnaHQnLCB3aWxsU3BvdGxpZ2h0ICYmIGlkeCA9PT0gdGFyZ2V0SWR4KTtcbiAgICAgICAgbGkuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtcmVhY2hlZCcsIHdpbGxTcG90bGlnaHQgJiYgaWR4IDw9IHRhcmdldElkeCk7XG4gICAgICB9KTtcbiAgICAgIGxpc3QuY2xhc3NMaXN0LnRvZ2dsZSgnaGFzLXNwb3RsaWdodCcsIHdpbGxTcG90bGlnaHQpO1xuICAgIH1cbiAgfSk7XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykgY2xlYXJWaXN1YWxTdGFnZVNwb3RsaWdodCh2aXNDb250YWluZXIpO1xuICB9KTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIFZpc3VhbOODouODvOODieOBruihqOe0me+8iEZSLTAyMO+8ieOBqOiqjOmdouOBruihqO+8iEZSLTAyMe+8iVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8vIOebruasoeOBr+eroOOBjCAz44CcMTUg5YCL44Gu44Go44GN44Gg44GR5Ye644GZ44CC44K/44Kw44Gv5YWI6aCt44GuIDQg5YCL44G+44Gn77yIRFRQLVZUUEwtMTAw77yJXG5jb25zdCBDT1ZFUl9MSU1JVFMgPSB7IGFnZW5kYTogWzMsIDE1XSwgdGFnczogNCB9O1xuXG4vLyDooajntJnjgavkvb/jgYbjg5Xjg63jg7Pjg4jjg57jgr/jg7zjga7lgKTvvIh0aXRsZSAvIGRlc2NyaXB0aW9uIC8gdGFncyAvIGF1dGhvciAvIGRhdGXvvInjgpLlj5bjgorlh7rjgZnjgIJcbi8vIFlBTUwg44Gu5a6M5YWo44Gq6Kej5p6Q44Gv44GX44Gq44GE44CC5YWI6aCt44Gu5YiX44GL44KJ5aeL44G+44KL44Kt44O844Gg44GR44KS6KaL44Gm44CB5YWl44KM5a2Q44Gu44Kt44O844Gv6Kqt44G+44Gq44GE77yIREQtVlRQTC0wNDDvvIlcbmZ1bmN0aW9uIHJlYWRDb3Zlck1ldGEoeWFtbCkge1xuICBjb25zdCBtZXRhID0geyB0aXRsZTogJycsIGRlc2NyaXB0aW9uOiAnJywgdGFnczogW10sIGF1dGhvcjogJycsIGRhdGU6ICcnIH07XG4gIGlmICgheWFtbCkgcmV0dXJuIG1ldGE7XG4gIGNvbnN0IGxpbmVzID0geWFtbC5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBzY2FsYXIgPSB2ID0+IHtcbiAgICBjb25zdCBxID0gL14oWydcIl0pKC4qKVxcMVxccyooPzojLiopPyQvLmV4ZWModi50cmltKCkpO1xuICAgIHJldHVybiBxID8gcVsyXS50cmltKCkgOiB2LnJlcGxhY2UoL1xccysjLiokLywgJycpLnRyaW0oKTtcbiAgfTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG0gPSAvXih0aXRsZXxkZXNjcmlwdGlvbnx0YWdzfGF1dGhvcnxkYXRlKVsgXFx0XSo6WyBcXHRdKiguKikkLy5leGVjKGxpbmVzW2ldKTtcbiAgICBpZiAoIW0pIGNvbnRpbnVlO1xuICAgIGNvbnN0IFssIGtleSwgcmF3XSA9IG07XG4gICAgLy8g57aa44GP5a2X5LiL44GS44Gu6KGM77yI44OW44Ot44OD44Kv44Gu5YCk44O744Oq44K544OI77yJ44KS6ZuG44KB44KLXG4gICAgY29uc3QgYmxvY2sgPSBbXTtcbiAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCBsaW5lcy5sZW5ndGggJiYgKC9eXFxzK1xcUy8udGVzdChsaW5lc1tqXSkgfHwgbGluZXNbal0udHJpbSgpID09PSAnJyk7IGorKykge1xuICAgICAgaWYgKGxpbmVzW2pdLnRyaW0oKSkgYmxvY2sucHVzaChsaW5lc1tqXS50cmltKCkpO1xuICAgIH1cbiAgICBjb25zdCB2YWx1ZSA9IHJhdy50cmltKCk7XG4gICAgaWYgKGtleSA9PT0gJ3RhZ3MnKSB7XG4gICAgICBpZiAodmFsdWUuc3RhcnRzV2l0aCgnWycpKSB7XG4gICAgICAgIG1ldGEudGFncyA9IHZhbHVlLnJlcGxhY2UoL15cXFt8XFxdXFxzKig/OiMuKik/JC9nLCAnJykuc3BsaXQoJywnKS5tYXAoc2NhbGFyKTtcbiAgICAgIH0gZWxzZSBpZiAodmFsdWUpIHtcbiAgICAgICAgbWV0YS50YWdzID0gdmFsdWUuc3BsaXQoJywnKS5tYXAoc2NhbGFyKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG1ldGEudGFncyA9IGJsb2NrLmZpbHRlcihsID0+IGwuc3RhcnRzV2l0aCgnLScpKS5tYXAobCA9PiBzY2FsYXIobC5yZXBsYWNlKC9eLVxccyovLCAnJykpKTtcbiAgICAgIH1cbiAgICAgIG1ldGEudGFncyA9IG1ldGEudGFncy5maWx0ZXIoQm9vbGVhbikuc2xpY2UoMCwgQ09WRVJfTElNSVRTLnRhZ3MpO1xuICAgIH0gZWxzZSBpZiAoa2V5ID09PSAnYXV0aG9yJyB8fCBrZXkgPT09ICdkYXRlJykge1xuICAgICAgLy8g5YWl44KM5a2Q44Gu44Oe44OD44OX77yIYXV0aG9yOlxcbiAgdGl0bGU6IC4uLu+8ieOBr+iqreOBvuOBmuOAgeWNmOS4gOOCueOCq+ODqeODvOWApOOBruOBv+aOoeeUqOOBmeOCi++8iEZSLTAzMu+8iVxuICAgICAgaWYgKHZhbHVlICYmICEvXls+fF1bKy1dPyQvLnRlc3QodmFsdWUpKSBtZXRhW2tleV0gPSBzY2FsYXIodmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtZXRhW2tleV0gPSAoIXZhbHVlIHx8IC9eWz58XVsrLV0/JC8udGVzdCh2YWx1ZSkpID8gYmxvY2suam9pbignICcpIDogc2NhbGFyKHZhbHVlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIG1ldGE7XG59XG5cbi8vIOihqOe0meOBriBIVE1M44CC5paH5a2X44Gv44GZ44G544Gm44Ko44K544Kx44O844OX44GX44Gm44GL44KJ5Z+L44KB6L6844KA77yITkZSLTAwM++8iVxuZnVuY3Rpb24gYnVpbGRDb3Zlckh0bWwodGl0bGUsIG1ldGEsIGFnZW5kYSwgZmlndXJlQ291bnQgPSAwKSB7XG4gIGNvbnN0IGV5ZWJyb3cgPSBtZXRhLnRhZ3MubGVuZ3RoXG4gICAgPyBgPHAgY2xhc3M9XCJ2cy1jb3Zlci1leWVicm93XCI+JHttZXRhLnRhZ3MubWFwKGVzY2FwZUh0bWwpLmpvaW4oJzxzcGFuIGNsYXNzPVwidnMtY292ZXItc2VwXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+Lzwvc3Bhbj4nKX08L3A+YFxuICAgIDogJyc7XG4gIGNvbnN0IGRlY2sgPSBtZXRhLmRlc2NyaXB0aW9uID8gYDxwIGNsYXNzPVwidnMtY292ZXItZGVja1wiPiR7ZXNjYXBlSHRtbChtZXRhLmRlc2NyaXB0aW9uKX08L3A+YCA6ICcnO1xuICBjb25zdCBzcGVjSXRlbXMgPSBbXTtcbiAgaWYgKG1ldGEuYXV0aG9yKSBzcGVjSXRlbXMucHVzaCh7IGtpbmQ6ICdhdXRob3InLCBsYWJlbDogbWV0YS5hdXRob3IgfSk7XG4gIGlmIChtZXRhLmRhdGUpIHNwZWNJdGVtcy5wdXNoKHsga2luZDogJ2RhdGUnLCBsYWJlbDogbWV0YS5kYXRlIH0pO1xuICBpZiAoYWdlbmRhLmxlbmd0aCA+IDApIHNwZWNJdGVtcy5wdXNoKHsga2luZDogJ3N0YWdlcycsIGxhYmVsOiBgJHthZ2VuZGEubGVuZ3RofSAke2FnZW5kYS5sZW5ndGggPT09IDEgPyAnU1RBR0UnIDogJ1NUQUdFUyd9YCB9KTtcbiAgaWYgKGZpZ3VyZUNvdW50ID4gMCkgc3BlY0l0ZW1zLnB1c2goeyBraW5kOiAnZmlndXJlcycsIGxhYmVsOiBgJHtmaWd1cmVDb3VudH0gJHtmaWd1cmVDb3VudCA9PT0gMSA/ICdGSUdVUkUnIDogJ0ZJR1VSRVMnfWAgfSk7XG4gIGNvbnN0IHNwZWNzSHRtbCA9IHNwZWNJdGVtcy5sZW5ndGhcbiAgICA/IGA8ZGl2IGNsYXNzPVwidnMtY292ZXItc3BlY3NcIiBhcmlhLWxhYmVsPVwi5paH5pu444K544Oa44OD44KvXCI+JHtzcGVjSXRlbXMubWFwKGl0ZW0gPT5cbiAgICAgIGA8c3BhbiBjbGFzcz1cInZzLWNvdmVyLXNwZWMtcGlsbFwiIGRhdGEtc3BlYy1raW5kPVwiJHtpdGVtLmtpbmR9XCIgZGF0YS1zcGVjLWxhYmVsPVwiJHtlc2NhcGVIdG1sKGl0ZW0ubGFiZWwpfVwiPjwvc3Bhbj5gXG4gICAgKS5qb2luKCcnKX08L2Rpdj5gXG4gICAgOiAnJztcbiAgY29uc3QgW21pbiwgbWF4XSA9IENPVkVSX0xJTUlUUy5hZ2VuZGE7XG4gIGxldCBhZ2VuZGFIdG1sID0gJyc7XG4gIGlmIChhZ2VuZGEubGVuZ3RoID49IG1pbiAmJiBhZ2VuZGEubGVuZ3RoIDw9IG1heCkge1xuICAgIC8vIOWNsOWIt+eJqeOBruebruasoeOBqOWQjOOBmOOBj+OAgeWIl+OBruS4iuOBi+OCieS4i+OBuOiqreOCgOmghuOBq+S4puOBueOCi++8iERUUC1WVFBMLTEwMO+8iVxuICAgIGNvbnN0IGNvbHMgPSBhZ2VuZGEubGVuZ3RoIDw9IDYgPyAyIDogMztcbiAgICBjb25zdCByb3dzID0gTWF0aC5jZWlsKGFnZW5kYS5sZW5ndGggLyBjb2xzKTtcbiAgICBhZ2VuZGFIdG1sID0gYDxvbCBjbGFzcz1cInZzLWNvdmVyLWFnZW5kYVwiIHN0eWxlPVwiLS12cy1yb3dzOiAke3Jvd3N9O1wiIGFyaWEtbGFiZWw9XCLnm67mrKFcIj4ke2FnZW5kYS5tYXAoYSA9PlxuICAgICAgYDxsaT48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBjbGFzcz1cInZzLWNvdmVyLWFnZW5kYS1pdGVtXCIgZGF0YS1zdGFnZS10YXJnZXQ9XCIke2Eubm99XCI+PHNwYW4gY2xhc3M9XCJ2cy1jb3Zlci1hZ2VuZGEtbm9cIj4ke2Eubm99PC9zcGFuPjxzcGFuIGNsYXNzPVwidnMtY292ZXItYWdlbmRhLXRpdGxlXCI+JHtlc2NhcGVIdG1sKGEudGl0bGUpfTwvc3Bhbj48L2J1dHRvbj48L2xpPmBcbiAgICApLmpvaW4oJycpfTwvb2w+YDtcbiAgfVxuICByZXR1cm4gYFxuICAgICAgPGRpdiBjbGFzcz1cImV4aGliaXRpb24taGVybyB2cy1jb3ZlclwiPlxuICAgICAgICA8c3BhbiBjbGFzcz1cInZzLWNvdmVyLXRleHR1cmVcIiBhcmlhLWhpZGRlbj1cInRydWVcIj48L3NwYW4+XG4gICAgICAgIDxkaXYgY2xhc3M9XCJleGhpYml0aW9uLWhlcm8tdG9wXCI+XG4gICAgICAgICAgPHNwYW4gY2xhc3M9XCJleGhpYml0aW9uLWhlcm8tZW1ibGVtXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PC9zcGFuPlxuICAgICAgICAgIDxkaXYgY2xhc3M9XCJmb3VyLWNvbG9yLWJhclwiPjxzcGFuPjwvc3Bhbj48c3Bhbj48L3NwYW4+PHNwYW4+PC9zcGFuPjxzcGFuPjwvc3Bhbj48L2Rpdj5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgICR7ZXllYnJvd31cbiAgICAgICAgPGgxIGNsYXNzPVwidnMtY292ZXItdGl0bGUgZm9udC1kaXNwbGF5XCI+JHtlc2NhcGVIdG1sKHRpdGxlKX08L2gxPlxuICAgICAgICAke2RlY2t9XG4gICAgICAgICR7c3BlY3NIdG1sfVxuICAgICAgICAke2FnZW5kYUh0bWx9XG4gICAgICA8L2Rpdj5gO1xufVxuXG4vLyDmlbDlgKTjga7liJfjga7liKTlrprjgavkvb/jgYbjgrvjg6vjga7lvaLvvIjmlbDlrZfjgavljZjkvY3jg7voqJjlj7fjgYzku5jjgYTjgZ/jgoLjga7vvInjgILjgIzigJTjgI3jgIwt44CN44Gq44Gp44Gu5qyg5pCN44Gu5Y2w44Gv56m644Gu44K744Or44Go44G/44Gq44GZ77yIREQtVlRQTC0wNDHvvIlcbmNvbnN0IE5VTUVSSUNfQ0VMTCA9IC9eWytcXC3iiJLCsV0/W8KlJOKCrMKjXT9cXGRbXFxkLF0qKD86XFwuXFxkKyk/WyBcXHRdKig/OiV877yFfFthLXpBLVpdezEsM3185Lu2fOWAi3zlhoZ85YCNfOWbnnzkurp85Y+wfOW5tHzml6V85pmC6ZaTfOWIhnznp5J85a2XfOmgheebrnzooYx85YiXfOaemnzDlyk/JC87XG5jb25zdCBFTVBUWV9DRUxMID0gL14oPzpbLeKAk+KAlOKAlV18TlxcL0EpPyQvaTtcblxuLy8g5pys5paH44Gu44K744Or44GM44GZ44G544Gm44GT44Gu5paH5a2X5pWw5Lul5YaF44Gn56m655m944KS5ZCr44G+44Gq44GE5YiX44Gv44CB55+t44GE44Op44OZ44Or44Gu5YiX44Go44GX44Gm5oqY44KK6L+U44GV44Gq44GE77yIREQtVlRQTC0wNDHvvIlcbmNvbnN0IFRBQkxFX0xBQkVMX0NIQVJTID0gMTA7XG5cbi8vIOihqOOBruWIl+OCkuiqv+OBueOAgeacrOaWh+OBruOCu+ODq+OBjOOBmeOBueOBpuaVsOWApOOBruWIl+OBqyAudnMtbnVt44CB55+t44GE44Op44OZ44Or44Gu5YiX44GrIC52cy1sYWJlbCDjgpLku5jjgZHjgovjgIJcbi8vIOaVsOWApOOBruaPg+OBiOOBr+OAgeWFiOmgreOBruWIl++8iOihjOOBruimi+WHuuOBl++8ieOBqOOAgU1hcmtkb3duIOOBp+aPg+OBiOOCkuaMh+WumuOBl+OBn+WIl+OBq+OBr+S7mOOBkeOBquOBhFxuZnVuY3Rpb24gbWFya1RhYmxlQ29sdW1ucyh0YWJsZSkge1xuICBjb25zdCBoZWFkID0gQXJyYXkuZnJvbSh0YWJsZS5xdWVyeVNlbGVjdG9yQWxsKCd0aGVhZCB0aCcpKTtcbiAgY29uc3Qgcm93cyA9IEFycmF5LmZyb20odGFibGUucXVlcnlTZWxlY3RvckFsbCgndGJvZHkgdHInKSk7XG4gIGNvbnN0IGNvbHMgPSBoZWFkLmxlbmd0aCB8fCAocm93c1swXSA/IHJvd3NbMF0uY2hpbGRyZW4ubGVuZ3RoIDogMCk7XG4gIGZvciAobGV0IGMgPSAwOyBjIDwgY29sczsgYysrKSB7XG4gICAgY29uc3QgY2VsbHMgPSByb3dzLm1hcChyID0+IHIuY2hpbGRyZW5bY10pLmZpbHRlcihCb29sZWFuKTtcbiAgICBjb25zdCB0ZXh0cyA9IGNlbGxzLm1hcCh0ZCA9PiB0ZC50ZXh0Q29udGVudC50cmltKCkpO1xuICAgIGNvbnN0IGZpbGxlZCA9IHRleHRzLmZpbHRlcih0ID0+ICFFTVBUWV9DRUxMLnRlc3QodCkpO1xuICAgIGlmICghZmlsbGVkLmxlbmd0aCkgY29udGludWU7XG4gICAgY29uc3QgYWxsID0gW2hlYWRbY10sIC4uLmNlbGxzXS5maWx0ZXIoQm9vbGVhbik7XG4gICAgY29uc3QgbnVtZXJpYyA9IGMgPiAwICYmIGZpbGxlZC5ldmVyeSh0ID0+IE5VTUVSSUNfQ0VMTC50ZXN0KHQpKSAmJiAhYWxsLnNvbWUoY2VsbCA9PiBjZWxsLmhhc0F0dHJpYnV0ZSgnYWxpZ24nKSk7XG4gICAgaWYgKG51bWVyaWMpIHtcbiAgICAgIGFsbC5mb3JFYWNoKGNlbGwgPT4gY2VsbC5jbGFzc0xpc3QuYWRkKCd2cy1udW0nKSk7XG4gICAgfSBlbHNlIGlmIChmaWxsZWQuZXZlcnkodCA9PiB0Lmxlbmd0aCA8PSBUQUJMRV9MQUJFTF9DSEFSUyAmJiAhL1xccy8udGVzdCh0KSkpIHtcbiAgICAgIGNlbGxzLmZvckVhY2goY2VsbCA9PiBjZWxsLmNsYXNzTGlzdC5hZGQoJ3ZzLWxhYmVsJykpO1xuICAgIH1cbiAgfVxufVxuXG4vLyBWaXN1YWzjg6Ljg7zjg4njga7jgrPjg7zjg4njg5bjg63jg4Pjgq/jgavoqIDoqp7jg6njg5njg6vjg7vkuLjnq6/jgq3jg6Pjg6zjg4Pjg4jvvIhBU1QtMTA577yJ44O744Ov44Oz44Kv44Oq44OD44KvIENvcHkg44Oc44K/44Oz44KS5LuY5LiO44GZ44KL77yIRlItMDMxLCBERC1WVFBMLTAzOO+8iVxuLy8g44Op44OZ44Or44Gv44GZ44G544Gm5bGe5oCn77yLQ1NTIOaTrOS8vOimgee0oOOBp+aPj+eUu+OBl+OAgeODhuOCreOCueODiOODjuODvOODieOCkuWil+OChOOBleOBquOBhO+8iFRDLVZUUEwtMDAz77yJXG5jb25zdCBDT0RFX0xBTkdfQUxJQVNFUyA9IHtcbiAgamF2YXNjcmlwdDogJ0pTJywganM6ICdKUycsIHR5cGVzY3JpcHQ6ICdUUycsIHRzOiAnVFMnLCBweXRob246ICdQWScsIHB5OiAnUFknLFxuICBiYXNoOiAnU0gnLCBzaDogJ1NIJywgc2hlbGw6ICdTSCcsIHpzaDogJ1NIJywgbWFya2Rvd246ICdNRCcsIG1kOiAnTUQnLCB5bWw6ICdZQU1MJ1xufTtcblxuZnVuY3Rpb24gZGVjb3JhdGVDb2RlQmxvY2tzKGNvbnRhaW5lcikge1xuICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgncHJlJykuZm9yRWFjaChwcmUgPT4ge1xuICAgIGlmIChwcmUuY2xvc2VzdCgnLmZyb250LW1hdHRlcicpKSByZXR1cm47XG4gICAgY29uc3QgY29kZSA9IHByZS5xdWVyeVNlbGVjdG9yKCdjb2RlJyk7XG4gICAgaWYgKCFjb2RlKSByZXR1cm47XG4gICAgY29uc3QgbSA9IC9sYW5ndWFnZS0oW2EtejAtOV8rLV0rKS9pLmV4ZWMoY29kZS5jbGFzc05hbWUgfHwgJycpO1xuICAgIGNvbnN0IHJhd0xhbmcgPSBtID8gbVsxXS50b0xvd2VyQ2FzZSgpIDogJyc7XG4gICAgY29uc3QgbGFuZ0xhYmVsID0gQ09ERV9MQU5HX0FMSUFTRVNbcmF3TGFuZ10gfHwgKHJhd0xhbmcgPyByYXdMYW5nLnRvVXBwZXJDYXNlKCkgOiAnQ09ERScpO1xuICAgIHByZS5jbGFzc0xpc3QuYWRkKCd2cy1jb2RlLWJsb2NrJyk7XG4gICAgcHJlLnNldEF0dHJpYnV0ZSgnZGF0YS1jb2RlLWxhbmcnLCBsYW5nTGFiZWwpO1xuICAgIGNvbnN0IGNhcmV0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIGNhcmV0LmNsYXNzTmFtZSA9ICd2cy1jb2RlLWNhcmV0JztcbiAgICBjYXJldC5zZXRBdHRyaWJ1dGUoJ2FyaWEtaGlkZGVuJywgJ3RydWUnKTtcbiAgICBjb25zdCBjb3B5QnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgY29weUJ0bi50eXBlID0gJ2J1dHRvbic7XG4gICAgY29weUJ0bi5jbGFzc05hbWUgPSAndnMtY29kZS1jb3B5LWJ0bic7XG4gICAgY29weUJ0bi5zZXRBdHRyaWJ1dGUoJ2RhdGEtY29weS1sYWJlbCcsICdDb3B5Jyk7XG4gICAgY29weUJ0bi5zZXRBdHRyaWJ1dGUoJ3RpdGxlJywgJ+OCs+ODvOODieOCkuOCr+ODquODg+ODl+ODnOODvOODieOBq+OCs+ODlOODvCcpO1xuICAgIGNvcHlCdG4uc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgJ+OCs+ODvOODieOCkuOCs+ODlOODvCcpO1xuICAgIHByZS5hcHBlbmRDaGlsZChjYXJldCk7XG4gICAgcHJlLmFwcGVuZENoaWxkKGNvcHlCdG4pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gYnVpbGRWaXN1YWxTdGFnZUh0bWwoY2xlYW5IdG1sLCB5YW1sKSB7XG4gIGNvbnN0IHRlbXAgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgdGVtcC5pbm5lckhUTUwgPSBjbGVhbkh0bWw7XG4gIHRlbXAucXVlcnlTZWxlY3RvckFsbCgndGFibGUnKS5mb3JFYWNoKG1hcmtUYWJsZUNvbHVtbnMpO1xuICBkZWNvcmF0ZUNvZGVCbG9ja3ModGVtcCk7XG4gIC8vIOmbm+W9ouOBruWIpOWumuOCiOOCiuWJjeOBq+e9ruOBjeaPm+OBiOOAgeOCs+ODvOODq+OCouOCpuODiOOBoOOBkeOBrueroOOCkuOCueODhuODvOODiOODoeODs+ODiOWei+OBq+OBl+OBquOBhO+8iEZSLTAzNO+8iVxuICBkZWNvcmF0ZUFsZXJ0cyh0ZW1wKTtcbiAgY29uc3QgdG90YWxGaWd1cmVzID0gdGVtcC5xdWVyeVNlbGVjdG9yQWxsKCcubHVjaXZvLXNsb3QnKS5sZW5ndGg7XG5cbiAgLy8g6aGM5ZCN44GvIGgx44CB44OV44Ot44Oz44OI44Oe44K/44O844GuIHRpdGxl44CB6Kqt44G/6L6844KT44Gg44OV44Kh44Kk44Or5ZCN44Gu6aCG44Gr5o6i44GZ44CC44Gp44KM44KC44Gq44GR44KM44Gw44OS44O844Ot44O844KS5Ye644GV44Gq44GE77yIREQtVlRQTC0wNDDvvIlcbiAgY29uc3QgY292ZXJNZXRhID0gcmVhZENvdmVyTWV0YSh5YW1sKTtcbiAgbGV0IGhlcm9UaXRsZSA9IGNvdmVyTWV0YS50aXRsZSB8fCAoY3VycmVudEZpbGVOYW1lICE9PSAndW50aXRsZWQubWQnID8gY3VycmVudEZpbGVOYW1lLnJlcGxhY2UoL1xcLlteLl0rJC8sICcnKSA6ICcnKTtcbiAgY29uc3QgaDEgPSB0ZW1wLnF1ZXJ5U2VsZWN0b3IoJ2gxJyk7XG4gIGlmIChoMSkge1xuICAgIGhlcm9UaXRsZSA9IGgxLnRleHRDb250ZW50O1xuICAgIGgxLnJlbW92ZSgpO1xuICB9XG5cbiAgLy8g6KaB57Sg44KC5paH5a2X44KC44Gq44GE44K544Op44OW77yIaDEg44Gu55u05b6M44GrIGgyIOOBjOe2muOBj+aWh+abuOOBp+OAgWgxIOOCkumZpOOBhOOBn+W+jOOBq+aui+OCi+aUueihjOOBoOOBkeOBrumDqOWIhu+8ieOBr+WHuuOBleOBquOBhO+8iERELVZUUEwtMDAy77yJXG4gIGNvbnN0IHNsYWJzID0gW107XG4gIGxldCBjdXJyZW50Tm9kZXMgPSBbXTtcbiAgY29uc3QgcHVzaFNsYWIgPSBub2RlcyA9PiB7XG4gICAgaWYgKG5vZGVzLnNvbWUobiA9PiBuLm5vZGVUeXBlID09PSAxIHx8IG4udGV4dENvbnRlbnQudHJpbSgpKSkgc2xhYnMucHVzaChub2Rlcyk7XG4gIH07XG4gIEFycmF5LmZyb20odGVtcC5jaGlsZE5vZGVzKS5mb3JFYWNoKG5vZGUgPT4ge1xuICAgIGlmIChub2RlLm5vZGVUeXBlID09PSAxICYmIG5vZGUudGFnTmFtZSA9PT0gJ0gyJykge1xuICAgICAgcHVzaFNsYWIoY3VycmVudE5vZGVzKTtcbiAgICAgIGN1cnJlbnROb2RlcyA9IFtub2RlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgY3VycmVudE5vZGVzLnB1c2gobm9kZSk7XG4gICAgfVxuICB9KTtcbiAgcHVzaFNsYWIoY3VycmVudE5vZGVzKTtcblxuICBsZXQgc2xhYnNIdG1sID0gJyc7XG4gIGxldCBzZWN0aW9uQ291bnRlciA9IDA7XG4gIGNvbnN0IGFnZW5kYSA9IFtdO1xuXG4gIHNsYWJzLmZvckVhY2goKG5vZGVzKSA9PiB7XG4gICAgY29uc3Qgd3JhcHBlciA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIG5vZGVzLmZvckVhY2gobiA9PiB3cmFwcGVyLmFwcGVuZENoaWxkKG4uY2xvbmVOb2RlKHRydWUpKSk7XG4gICAgY29uc3QgaDIgPSB3cmFwcGVyLnF1ZXJ5U2VsZWN0b3IoJ2gyJyk7XG4gICAgaWYgKGgyKSB7XG4gICAgICBzZWN0aW9uQ291bnRlcisrO1xuICAgICAgY29uc3QgbnVtU3RyID0gU3RyaW5nKHNlY3Rpb25Db3VudGVyKS5wYWRTdGFydCgyLCAnMCcpO1xuICAgICAgY29uc3QgcmF3VGl0bGUgPSBoMi50ZXh0Q29udGVudC5yZXBsYWNlKC9eXFxkK1xcLlxccyovLCAnJyk7XG4gICAgICBoMi5pbm5lckhUTUwgPSBgPHNwYW4gY2xhc3M9XCJleGhpYml0aW9uLW51bS1iYWRnZVwiPlNUQUdFICR7bnVtU3RyfTwvc3Bhbj48c3Bhbj4ke2VzY2FwZUh0bWwocmF3VGl0bGUpfTwvc3Bhbj5gO1xuICAgICAgYWdlbmRhLnB1c2goeyBubzogbnVtU3RyLCB0aXRsZTogcmF3VGl0bGUgfSk7XG4gICAgfVxuICAgIGNvbnN0IHN0YWdlQXR0ciA9IGgyID8gYCBkYXRhLXN0YWdlLW5vPVwiJHtTdHJpbmcoc2VjdGlvbkNvdW50ZXIpLnBhZFN0YXJ0KDIsICcwJyl9XCJgIDogJyc7XG4gICAgY29uc3Qgc2xvdHMgPSB3cmFwcGVyLnF1ZXJ5U2VsZWN0b3JBbGwoJy5sdWNpdm8tc2xvdCcpO1xuICAgIGNvbnN0IGNoaWxkcmVuID0gQXJyYXkuZnJvbSh3cmFwcGVyLmNoaWxkcmVuKTtcbiAgICBjb25zdCBwcm9zZUVscyA9IGNoaWxkcmVuLmZpbHRlcihlbCA9PiBlbCAhPT0gaDIgJiYgIWVsLmNsYXNzTGlzdC5jb250YWlucygnZnJvbnQtbWF0dGVyJykgJiYgIWVsLmNsYXNzTGlzdC5jb250YWlucygnbHVjaXZvLXNsb3QnKSAmJiAhZWwucXVlcnlTZWxlY3RvcignLmx1Y2l2by1zbG90JykpO1xuICAgIGNvbnN0IGhhc0NvbXBsZXhCbG9jayA9IHByb3NlRWxzLnNvbWUoZWwgPT4gL14oSFszLTZdfFRBQkxFfFBSRSkkLy50ZXN0KGVsLnRhZ05hbWUpIHx8IGVsLnF1ZXJ5U2VsZWN0b3IoJ3RhYmxlLCBwcmUnKSk7XG4gICAgY29uc3QgYWN0aW9uc0h0bWwgPSBidWlsZFNsYWJBY3Rpb25zSHRtbCgpO1xuICAgIGlmIChzbG90cy5sZW5ndGggPT09IDEgJiYgcHJvc2VFbHMubGVuZ3RoID49IDEgJiYgIWhhc0NvbXBsZXhCbG9jaykge1xuICAgICAgY29uc3QgZm0gPSB3cmFwcGVyLnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IC5mcm9udC1tYXR0ZXInKTtcbiAgICAgIGNvbnN0IHNsb3RFbCA9IGNoaWxkcmVuLmZpbmQoZWwgPT4gZWwuY2xhc3NMaXN0LmNvbnRhaW5zKCdsdWNpdm8tc2xvdCcpIHx8IGVsLnF1ZXJ5U2VsZWN0b3IoJy5sdWNpdm8tc2xvdCcpKTtcbiAgICAgIGNvbnN0IHByb3NlSHRtbCA9IHByb3NlRWxzLm1hcChlbCA9PiBlbC5vdXRlckhUTUwpLmpvaW4oJycpO1xuICAgICAgY29uc3QgaGVhZEh0bWwgPSBgJHtmbSA/IGZtLm91dGVySFRNTCA6ICcnfSR7aDIgPyBoMi5vdXRlckhUTUwgOiAnJ31gO1xuICAgICAgc2xhYnNIdG1sICs9IGA8c2VjdGlvbiBjbGFzcz1cImV4aGliaXRpb24tc2xhYiBleGhpYml0aW9uLXNsYWItc3BsaXQgdnMtdHBsLXNwbGl0XCIke3N0YWdlQXR0cn0+JHtoZWFkSHRtbH08ZGl2IGNsYXNzPVwiZXhoaWJpdGlvbi1zbGFiLWJvZHlcIj48ZGl2IGNsYXNzPVwiZXhoaWJpdGlvbi1zbGFiLXByb3NlXCI+JHtwcm9zZUh0bWx9PC9kaXY+PGRpdiBjbGFzcz1cImV4aGliaXRpb24tc2xhYi1maWd1cmVcIj4ke3Nsb3RFbC5vdXRlckhUTUx9PC9kaXY+PC9kaXY+JHthY3Rpb25zSHRtbH08L3NlY3Rpb24+YDtcbiAgICB9IGVsc2Uge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBkZXRlY3RTbGFiVGVtcGxhdGUocHJvc2VFbHMsIHNsb3RzLmxlbmd0aCk7XG4gICAgICBhcHBseVNsYWJUZW1wbGF0ZSh0ZW1wbGF0ZSwgcHJvc2VFbHMpO1xuICAgICAgc2xhYnNIdG1sICs9IGA8c2VjdGlvbiBjbGFzcz1cImV4aGliaXRpb24tc2xhYiB2cy10cGwtJHt0ZW1wbGF0ZX1cIiR7c3RhZ2VBdHRyfT4ke3dyYXBwZXIuaW5uZXJIVE1MfSR7YWN0aW9uc0h0bWx9PC9zZWN0aW9uPmA7XG4gICAgfVxuICB9KTtcblxuICAvLyDopovlh7rjgZfjga7mloflrZfvvIh0ZXh0Q29udGVudO+8ieOBr+OCqOOCueOCseODvOODl+OBl+OBpuOBi+OCieWfi+OCgei+vOOCgOOAguOBneOBruOBvuOBvuWFpeOCjOOCi+OBqOOAgeimi+WHuuOBl+OBq+abuOOBhOOBn1xuICAvLyAmbHQ7aW1nIOKApiZndDsg44Gq44Gp44GMIEhUTUwg44Go44GX44Gm6Kej6YeI44GV44KM44KL77yITkZSLTAwM++8iVxuICBjb25zdCBoZXJvSHRtbCA9IGhlcm9UaXRsZSA/IGJ1aWxkQ292ZXJIdG1sKGhlcm9UaXRsZSwgY292ZXJNZXRhLCBhZ2VuZGEsIHRvdGFsRmlndXJlcykgOiAnJztcblxuICAvLyDpm5vlvaLjg7vjg5Djg4Pjgrjjg7s0IOiJsuODkOODvOOBrumFjeiJsuOBr+OAgeOCueOCv+OCpOODq+OBruOCr+ODqeOCueOBjOWumue+qeOBmeOCiyAtLXZzLWMx44CcNCDjgYvjgonlj5bjgovvvIhEVFAtVlRQTC0wNzDvvIlcbiAgcmV0dXJuIGBcbiAgICA8ZGl2IGNsYXNzPVwiZXhoaWJpdGlvbi13cmFwIHZzLXRoZW1lLSR7c3RhdGUuaW5mb2dyYXBoaWNTdHlsZX1cIj5cbiAgICAgICR7aGVyb0h0bWx9XG4gICAgICAke3NsYWJzSHRtbH1cbiAgICA8L2Rpdj5cbiAgYDtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIOODreODvOOCq+ODq+OBrueUu+WDj++8iEZSLTA0MiwgREQtTUQtMDQw44CcMDQy77yJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8g55S75YOP44GuIHNyYyDjgavmm7jjgYTjgZ/jg63jg7zjgqvjg6vjga7jg5HjgrnjgpIgZmlsZTovLyDjga4gVVJMIOOBq+ebtOOBmeOAguebtOOBm+OBquOBhOOCguOBru+8iOebuOWvvuODkeOCueOAgWh0dHAg44Gq44Gp77yJ44GvIG51bGwg44KS6L+U44GZ44CCXG4vLyBNYXJrZWQg44GvIFVSTCDjga4gXFwg44KSICU1QyDjgavlpInjgYjjgovjgZ/jgoHjgIElNUMg44KC5Yy65YiH44KK44Go44GX44Gm5omx44GGXG5mdW5jdGlvbiB0b0xvY2FsSW1hZ2VVcmwodmFsdWUpIHtcbiAgY29uc3Qgc3JjID0gU3RyaW5nKHZhbHVlIHx8ICcnKS50cmltKCkucmVwbGFjZSgvJTVDL2dpLCAnLycpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gQzov4oCmIOOBvuOBn+OBryBDOlxc4oCm77yIV2luZG93cyDjga7jg4njg6njgqTjg5blkI3jgaflp4vjgb7jgovntbblr77jg5HjgrnvvIlcbiAgaWYgKC9eW2Etel06XFwvL2kudGVzdChzcmMpKSByZXR1cm4gYGZpbGU6Ly8vJHtzcmN9YDtcbiAgLy8gXFxcXHNlcnZlclxcc2hhcmVcXOKApu+8iFdpbmRvd3Mg44Gu44ON44OD44OI44Ov44O844Kv5LiK44Gu44OR44K577yJXG4gIGlmICgvXlxcL1xcL1teL10vLnRlc3Qoc3JjKSAmJiAvJTVDfFxcXFwvaS50ZXN0KFN0cmluZyh2YWx1ZSkpKSByZXR1cm4gYGZpbGU6JHtzcmN9YDtcbiAgaWYgKC9eZmlsZTpcXC9cXC8vaS50ZXN0KHNyYykpIHJldHVybiBzcmM7XG4gIHJldHVybiBudWxsO1xufVxuXG4vLyDnm7jlr77jg5HjgrnjgYvvvIhVUkwg44Gu5b2i5byP44KC44CBLyDjgaflp4vjgb7jgovntbblr77jg5HjgrnjgoLjgarjgYTvvIlcbmZ1bmN0aW9uIGlzUmVsYXRpdmVTcmMoc3JjKSB7XG4gIHJldHVybiBCb29sZWFuKHNyYykgJiYgIS9eW2Etel1bYS16MC05Ky4tXSo6fF5bLyNdL2kudGVzdChzcmMpO1xufVxuXG4vLyDoqq3jgb/ovrzjgoHjgarjgYTnlLvlg4/jga7ku6Pjgo/jgorjgavnva7jgY/mnqDvvIhERC1NRC0wNDHvvInjgIJoaW50IOOBr+a3u+OBiOOCi+ahiOWGhe+8iOOBquOBkeOCjOOBsOecgeOBj++8iVxuZnVuY3Rpb24gbWFrZU1pc3NpbmdJbWFnZUJveChzcmMsIGFsdCwgaGludCkge1xuICBjb25zdCBib3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gIGJveC5jbGFzc05hbWUgPSAnaW1nLW1pc3NpbmcnO1xuICBib3guc2V0QXR0cmlidXRlKCdyb2xlJywgJ2ltZycpO1xuICBib3guc2V0QXR0cmlidXRlKCdhcmlhLWxhYmVsJywgYOeUu+WDj+OCkuiqreOBv+i+vOOCgeOBvuOBm+OCkzogJHthbHQgfHwgc3JjfWApO1xuICBjb25zdCB0aXRsZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgdGl0bGUuY2xhc3NOYW1lID0gJ2ltZy1taXNzaW5nLXRpdGxlJztcbiAgdGl0bGUudGV4dENvbnRlbnQgPSAn55S75YOP44KS6Kqt44G/6L6844KB44G+44Gb44KTJztcbiAgY29uc3QgcGF0aCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgcGF0aC5jbGFzc05hbWUgPSAnaW1nLW1pc3NpbmctcGF0aCc7XG4gIHBhdGgudGV4dENvbnRlbnQgPSBzcmMgfHwgJ++8iOODkeOCueOBjOOBguOCiuOBvuOBm+OCk++8iSc7XG4gIGJveC5hcHBlbmQodGl0bGUsIHBhdGgpO1xuICBpZiAoaGludCkge1xuICAgIGNvbnN0IG5vdGUgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG4gICAgbm90ZS5jbGFzc05hbWUgPSAnaW1nLW1pc3NpbmctaGludCc7XG4gICAgbm90ZS50ZXh0Q29udGVudCA9IGhpbnQ7XG4gICAgYm94LmFwcGVuZChub3RlKTtcbiAgfVxuICByZXR1cm4gYm94O1xufVxuXG4vLyBET01QdXJpZnkg44Gu5pei5a6a44GvIGZpbGU6IOOBriBVUkwg44KS6Kix44GV44Ga44CBc3JjIOOBlOOBqOa2iOOBme+8iERELU1ELTA0MO+8ieOAgueUu+WDj+OBriBzcmMg44Gr6ZmQ44Gj44Gm44CBXG4vLyDjg63jg7zjgqvjg6vjga7jg5HjgrnjgpIgZmlsZTovLyDjga4gVVJMIOOBq+ebtOOBl+OBpuaui+OBmeOAguODquODs+OCr++8iGEg44GuIGhyZWbvvInjga4gZmlsZTog44Gv44CB5LuK44G+44Gn44Gp44GK44KK5raI44GZ44CCXG4vLyDjg5Xjgqnjg6vjg4DjgYvjgonplovjgYTjgZ/mlofmm7jjga7nm7jlr77jg5Hjgrnjga/jgIHjg5Xjgqnjg6vjg4Djga7kuK3jga7jg5HjgrnjgpIgZGF0YS1mb2xkZXItc3JjIOOBq+enu+OBl+OAgeaPj+eUu+OBruW+jOOBq+iqreOBv+i+vOOCgO+8iERELUZJTEUtMDc277yJXG5mdW5jdGlvbiBzZXR1cExvY2FsSW1hZ2VzKCkge1xuICBET01QdXJpZnkuYWRkSG9vaygndXBvblNhbml0aXplQXR0cmlidXRlJywgKG5vZGUsIGRhdGEpID0+IHtcbiAgICBpZiAobm9kZS5ub2RlTmFtZSAhPT0gJ0lNRycgfHwgZGF0YS5hdHRyTmFtZSAhPT0gJ3NyYycpIHJldHVybjtcbiAgICBjb25zdCBpbkZvbGRlciA9IG9wZW5lZEZvbGRlciAmJiBjdXJyZW50Rm9sZGVyUGF0aCAhPT0gbnVsbCAmJiBpc1JlbGF0aXZlU3JjKGRhdGEuYXR0clZhbHVlKTtcbiAgICBjb25zdCBmb2xkZXJQYXRoID0gaW5Gb2xkZXIgPyByZXNvbHZlRm9sZGVyUGF0aChmb2xkZXJEaXJPZihjdXJyZW50Rm9sZGVyUGF0aCksIGRhdGEuYXR0clZhbHVlKSA6IG51bGw7XG4gICAgaWYgKGluRm9sZGVyICYmIGZvbGRlclBhdGggPT09IG51bGwpIHtcbiAgICAgIC8vIOODleOCqeODq+ODgOOBruWkluOCkuaMh+OBmeebuOWvvuODkeOCue+8iC4uLyDjgYzlpJrjgZnjgY7jgovvvInjga/jgIHjg5Xjgqnjg6vjg4DjgYvjgonjga/oqq3jgoHjgarjgYRcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLWZvbGRlci1zcmMnLCBkYXRhLmF0dHJWYWx1ZSk7XG4gICAgICBub2RlLnNldEF0dHJpYnV0ZSgnZGF0YS1mb2xkZXItb3V0c2lkZScsICcnKTtcbiAgICAgIGRhdGEua2VlcEF0dHIgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKGZvbGRlclBhdGggIT09IG51bGwpIHtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdkYXRhLWZvbGRlci1zcmMnLCBmb2xkZXJQYXRoKTtcbiAgICAgIGNvbnN0IGNhY2hlZCA9IGZvbGRlckltYWdlVXJscy5nZXQoZm9sZGVyUGF0aCk7XG4gICAgICBpZiAodHlwZW9mIGNhY2hlZCA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgLy8g6Kqt44G/6L6844G/5riI44G/44Gu55S75YOP44Gv44CB5o+P44GN55u044GX44Gu44Gf44Gz44Gr6Kqt44G/55u044GV44Ga44CB44Gh44KJ44Gk44GL44Gq44GE44KI44GG44CB44GZ44GQ44Gr6KGo56S644GZ44KLXG4gICAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdzcmMnLCBjYWNoZWQpO1xuICAgICAgICBkYXRhLmF0dHJWYWx1ZSA9IGNhY2hlZDtcbiAgICAgICAgZGF0YS5mb3JjZUtlZXBBdHRyID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHNyYyDjgpLmrovjgZnjgaggaW5kZXguaHRtbCDjga7jg5Xjgqnjg6vjg4DjgpLln7rmupbjgavoqq3jgb/jgavooYzjgY3jgIHoqq3jgb/ovrzjgoHjgarjgYTooajnpLrjgYzkuIDnnqzlh7rjgotcbiAgICAgICAgZGF0YS5rZWVwQXR0ciA9IGZhbHNlO1xuICAgICAgfVxuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyDlkIzmorHjgrXjg7Pjg5fjg6vjga7nm7jlr77jg5Hjgrnjga/jgIFzYW1wbGVzIOODleOCqeODq+ODgOOBi+OCieOBruebuOWvvuODkeOCueOBq+OBmeOCi++8iGluZGV4Lmh0bWwg44GL44KJ6KaL44Gf44OR44K544CCREQtRklMRS0wODHvvIlcbiAgICBpZiAoY3VycmVudFNhbXBsZUZpbGUgJiYgaXNSZWxhdGl2ZVNyYyhkYXRhLmF0dHJWYWx1ZSkpIHtcbiAgICAgIGNvbnN0IHNhbXBsZVBhdGggPSByZXNvbHZlRm9sZGVyUGF0aCgnJywgZGF0YS5hdHRyVmFsdWUpO1xuICAgICAgaWYgKHNhbXBsZVBhdGggPT09IG51bGwpIHJldHVybjtcbiAgICAgIGNvbnN0IHNhbXBsZVVybCA9IGAke1NBTVBMRVNfRElSfS8ke3NhbXBsZVBhdGguc3BsaXQoJy8nKS5tYXAoZW5jb2RlVVJJQ29tcG9uZW50KS5qb2luKCcvJyl9YDtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdzcmMnLCBzYW1wbGVVcmwpO1xuICAgICAgZGF0YS5hdHRyVmFsdWUgPSBzYW1wbGVVcmw7XG4gICAgICBkYXRhLmZvcmNlS2VlcEF0dHIgPSB0cnVlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB1cmwgPSB0b0xvY2FsSW1hZ2VVcmwoZGF0YS5hdHRyVmFsdWUpO1xuICAgIGlmICghdXJsKSByZXR1cm47XG4gICAgLy8gZm9yY2VLZWVwQXR0ciDjgpLnq4vjgabjgovjgajjgIFET01QdXJpZnkg44GvIGF0dHJWYWx1ZSDjgpLmm7jjgY3miLvjgZXjgZrjgavmrKHjga7lsZ7mgKfjgbjpgLLjgoDjgZ/jgoHjgIHjgZPjgZPjgafmm7jjgY3mj5vjgYjjgotcbiAgICBub2RlLnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcbiAgICBkYXRhLmF0dHJWYWx1ZSA9IHVybDtcbiAgICBkYXRhLmZvcmNlS2VlcEF0dHIgPSB0cnVlO1xuICB9KTtcblxuICAvLyDoqq3jgb/ovrzjgoHjgarjgYTnlLvlg4/jga/jgIHku6Pjgo/jgorjga7mloflrZfvvIhhbHTvvInjgaDjgZHjgYzntLDjgY/lh7rjgabmsJfjgaXjgY3jgavjgY/jgYTjgZ/jgoHjgIHoqq3jgb/ovrzjgoHjgarjgYTjgZPjgajjgaggc3JjIOOCkuekuuOBme+8iERELU1ELTA0Me+8ieOAglxuICAvLyBlcnJvciDjga/ms6Hnq4vjgZ/jgarjgYTjgZ/jgoHjgIHjgq3jg6Pjg5fjg4Hjg6Pjga7mrrXpmo7jgaflj5fjgZHlj5bjgotcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCBldmVudCA9PiB7XG4gICAgY29uc3QgaW1nID0gZXZlbnQudGFyZ2V0O1xuICAgIGlmICghKGltZyBpbnN0YW5jZW9mIEhUTUxJbWFnZUVsZW1lbnQpIHx8ICFpbWcuY2xvc2VzdCgnI3ByZXZpZXctc2Nyb2xsJykpIHJldHVybjtcbiAgICBjb25zdCBzcmMgPSBpbWcuZ2V0QXR0cmlidXRlKCdkYXRhLWZvbGRlci1zcmMnKSB8fCBpbWcuZ2V0QXR0cmlidXRlKCdzcmMnKSB8fCAnJztcbiAgICAvLyDnm7jlr77jg5Hjgrnjga/jgIHjg5XjgqHjgqTjg6vjgpLplovjgYTjgZ/loLTlkIjjgIHjg5bjg6njgqbjgrbjga7liLbntITjgacgTWFya2Rvd24g44OV44Kh44Kk44Or44Gu5aC05omA44KS5Z+65rqW44Gr44Gn44GN44Gq44GE77yIREQtTUQtMDQy77yJXG4gICAgY29uc3QgaGludCA9IGlzUmVsYXRpdmVTcmMoc3JjKSAmJiAhaW1nLmhhc0F0dHJpYnV0ZSgnZGF0YS1mb2xkZXItc3JjJylcbiAgICAgID8gJ+ebuOWvvuODkeOCueOBrueUu+WDj+OBr+OAgeOAjOmWi+OBj+OAjeKGkuOAjOODleOCqeODq+ODgOOCkumWi+OBj+KApuOAjeOBp+mWi+OBhOOBn+aWh+abuOOBp+ihqOekuuOBp+OBjeOBvuOBmeOAguOBvuOBn+OBr+e1tuWvvuODkeOCue+8iEM6XFxcXOKApiDjgarjganvvInjgafmjIflrprjgZfjgabjgY/jgaDjgZXjgYQnXG4gICAgICA6ICcnO1xuICAgIGltZy5yZXBsYWNlV2l0aChtYWtlTWlzc2luZ0ltYWdlQm94KHNyYywgaW1nLmdldEF0dHJpYnV0ZSgnYWx0JyksIGhpbnQpKTtcbiAgfSwgdHJ1ZSk7XG59XG5cbi8vIOODleOCqeODq+ODgOOBi+OCiemWi+OBhOOBn+aWh+abuOOBruebuOWvvuODkeOCueOBrueUu+WDj+OCkuOAgeODleOCqeODq+ODgOOBi+OCieiqreOCk+OBp+ihqOekuuOBmeOCi++8iERELUZJTEUtMDc277yJXG5mdW5jdGlvbiByZXNvbHZlRm9sZGVySW1hZ2VzKGNvbnRhaW5lcikge1xuICBpZiAoIW9wZW5lZEZvbGRlciB8fCAhY29udGFpbmVyKSByZXR1cm47XG4gIGNvbnN0IGZvbGRlciA9IG9wZW5lZEZvbGRlcjtcbiAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ2ltZ1tkYXRhLWZvbGRlci1zcmNdOm5vdChbc3JjXSknKS5mb3JFYWNoKGFzeW5jIGltZyA9PiB7XG4gICAgY29uc3QgcGF0aCA9IGltZy5nZXRBdHRyaWJ1dGUoJ2RhdGEtZm9sZGVyLXNyYycpO1xuICAgIGlmIChpbWcuaGFzQXR0cmlidXRlKCdkYXRhLWZvbGRlci1vdXRzaWRlJykpIHtcbiAgICAgIGltZy5yZXBsYWNlV2l0aChtYWtlTWlzc2luZ0ltYWdlQm94KHBhdGgsIGltZy5nZXRBdHRyaWJ1dGUoJ2FsdCcpLCAn6ZaL44GE44Gf44OV44Kp44Or44OA44Gu5aSW44Gu55S75YOP44Gv6KGo56S644Gn44GN44G+44Gb44KT44CC5LiK44Gu6ZqO5bGk44Gu44OV44Kp44Or44OA44KS6ZaL44GE44Gm44GP44Gg44GV44GEJykpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCB1cmwgPSBhd2FpdCBnZXRGb2xkZXJJbWFnZVVybChmb2xkZXIsIHBhdGgpO1xuICAgIC8vIOW+heOBo+OBpuOBhOOCi+mWk+OBq+ODleOCqeODq+ODgOOCkumWieOBmOOBn+ODu+aPj+OBjeebtOOBl+OBn+WgtOWQiOOBr+S9leOCguOBl+OBquOBhFxuICAgIGlmICghaW1nLmlzQ29ubmVjdGVkIHx8IGZvbGRlciAhPT0gb3BlbmVkRm9sZGVyKSByZXR1cm47XG4gICAgaWYgKHVybCkgaW1nLnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcbiAgICBlbHNlIGltZy5yZXBsYWNlV2l0aChtYWtlTWlzc2luZ0ltYWdlQm94KHBhdGgsIGltZy5nZXRBdHRyaWJ1dGUoJ2FsdCcpLCAn44OV44Kp44Or44OA44Gu5Lit44Gr6KaL44Gk44GL44KK44G+44Gb44KTJykpO1xuICB9KTtcbn1cblxuLy8g6KGo77yIdGFibGXvvInjgYzopqrjgrPjg7Pjg4bjg4rjgoTjgrnjg6njg5bjga7mnqDjgpLjga/jgb/lh7rjgZXjgarjgYTjgojjgYbjgIHmqKrjgrnjgq/jg63jg7zjg6vlj6/og73jgaogLnRhYmxlLWNvbnRhaW5lciDjgafljIXjgoDvvIhERC1NRC0wMjDvvIlcbmZ1bmN0aW9uIHdyYXBUYWJsZXMoY29udGFpbmVyKSB7XG4gIGlmICghY29udGFpbmVyKSByZXR1cm47XG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCd0YWJsZScpLmZvckVhY2godGFibGUgPT4ge1xuICAgIGlmICh0YWJsZS5wYXJlbnRFbGVtZW50ICYmIHRhYmxlLnBhcmVudEVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCd0YWJsZS1jb250YWluZXInKSkgcmV0dXJuO1xuICAgIGNvbnN0IHdyYXBwZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB3cmFwcGVyLmNsYXNzTmFtZSA9ICd0YWJsZS1jb250YWluZXInO1xuICAgIHRhYmxlLmJlZm9yZSh3cmFwcGVyKTtcbiAgICB3cmFwcGVyLmFwcGVuZENoaWxkKHRhYmxlKTtcbiAgfSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICDjg6HjgqTjg7Pjg6zjg7Pjg4Djg6rjg7PjgrDjg6vjg7zjg5dcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5mdW5jdGlvbiByZW5kZXJBcHAoKSB7XG4gIGNvbnN0IHJhd01hcmtkb3duID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcmtkb3duLWVkaXRvcicpLnZhbHVlO1xuICAvLyDjg5Xjg63jg7Pjg4jjg57jgr/jg7zjga8gTWFya2VkIOOBq+a4oeOBleOBquOBhOOAgua4oeOBmeOBqOWFiOmgreOBriAtLS0g44GM5rC05bmz57ea44CBWUFNTCDjgYzmrrXokL3jgavjgarjgovvvIhERC1GTS0wMDHvvIlcbiAgY29uc3QgeyB5YW1sLCBib2R5IH0gPSBzcGxpdEZyb250TWF0dGVyKHJhd01hcmtkb3duKTtcbiAgY29uc3QgcGFyc2VkID0gbWFya2VkLmxleGVyKGJvZHkpO1xuXG4gIGNvbnN0IG1lcm1haWRCbG9ja3MgPSBbXTtcbiAgY29uc3QgdG9rZW5zVG9LZWVwID0gW107XG4gIC8vIOacgOS4iuS9jeOBruODiOODvOOCr+ODs+OBriByYXcg44Gv5pys5paH44KS5YWI6aCt44GL44KJ6ZqZ6ZaT44Gq44GP6KaG44GG44Gf44KB44CB5pS56KGM44KS5pWw44GI44KM44Gw5ZCE44OI44O844Kv44Oz44Gu5YWD44Gu6KGM44GM44KP44GL44KL77yIRlItMDM3LCBERC1ESUFHLTA2MO+8iVxuICBsZXQgc3JjTGluZSA9IGNvdW50TGluZXNCZWZvcmUocmF3TWFya2Rvd24sIHJhd01hcmtkb3duLmxlbmd0aCAtIGJvZHkubGVuZ3RoKTtcblxuICBwYXJzZWQuZm9yRWFjaCh0b2tlbiA9PiB7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09ICdoZWFkaW5nJykgdG9rZW4uc3JjTGluZSA9IHNyY0xpbmU7XG4gICAgc3JjTGluZSArPSBjb3VudExpbmVzQmVmb3JlKHRva2VuLnJhdywgdG9rZW4ucmF3Lmxlbmd0aCk7XG4gICAgaWYgKHRva2VuLnR5cGUgPT09ICdjb2RlJyAmJiAodG9rZW4ubGFuZyB8fCAnJykudHJpbSgpLnRvTG93ZXJDYXNlKCkgPT09ICdtZXJtYWlkJykge1xuICAgICAgY29uc3QgaW5kZXggPSBtZXJtYWlkQmxvY2tzLmxlbmd0aDtcbiAgICAgIGNvbnN0IGNvZGUgPSB0b2tlbi50ZXh0LnRyaW0oKTtcbiAgICAgIGNvbnN0IGN1cnZlID0gZ2V0QmxvY2tDdXJ2ZShpbmRleCwgY29kZSk7XG4gICAgICBjb25zdCBoYXNoID0gZm52MWFIYXNoKGNvZGUgKyBzdGF0ZS5hcHBlYXJhbmNlICsgc3RhdGUucGFsZXR0ZSArIChjdXJ2ZSB8fCAnJykgKyBzdGF0ZS5pbmZvZ3JhcGhpY1N0eWxlICsgKHN0YXRlLmlzVmlzdWFsTW9kZSA/ICd2aXMnIDogJ3N0ZCcpKTtcbiAgICAgIG1lcm1haWRCbG9ja3MucHVzaCh7IGluZGV4LCBjb2RlLCBoYXNoLCBjdXJ2ZSB9KTtcbiAgICAgIHRva2Vuc1RvS2VlcC5wdXNoKHtcbiAgICAgICAgdHlwZTogJ2h0bWwnLFxuICAgICAgICByYXc6IGA8ZGl2IGNsYXNzPVwibHVjaXZvLXNsb3RcIiBkYXRhLXNsb3Q9XCIke2luZGV4fVwiPjwvZGl2PmAsXG4gICAgICAgIHRleHQ6IGA8ZGl2IGNsYXNzPVwibHVjaXZvLXNsb3RcIiBkYXRhLXNsb3Q9XCIke2luZGV4fVwiPjwvZGl2PmBcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDnvavnt5rjgafmm7jjgYTjgZ/jg5Xjgqnjg6vjg4Dmp4vmiJDjga/jgIHjg4Tjg6rjg7zjgavjgZnjgovvvIhGUi0wNDfvvIlcbiAgICAgIHRva2Vuc1RvS2VlcC5wdXNoKHRyZWVUb2tlbkZvcih0b2tlbikgfHwgdG9rZW4pO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgZnJvbnRNYXR0ZXJIdG1sID0geWFtbCAhPT0gbnVsbCAmJiBzdGF0ZS5zaG93RnJvbnRNYXR0ZXIgPyBidWlsZEZyb250TWF0dGVySHRtbCh5YW1sKSA6ICcnO1xuICBjb25zdCByYXdIdG1sID0gZnJvbnRNYXR0ZXJIdG1sICsgbWFya2VkLnBhcnNlcih0b2tlbnNUb0tlZXApO1xuICBjb25zdCBjbGVhbkh0bWwgPSBET01QdXJpZnkuc2FuaXRpemUocmF3SHRtbCwge1xuICAgIEFERF9UQUdTOiBbJ2RpdicsICdzcGFuJywgJ3N0cm9uZycsICdzbWFsbCddLFxuICAgIEFERF9BVFRSOiBbJ2NsYXNzJywgJ2RhdGEtc2xvdCcsICdzdHlsZSddXG4gIH0pO1xuXG4gIGNvbnN0IHN0ZENvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzdGFuZGFyZC1kb2MtY29udGFpbmVyJyk7XG4gIGNvbnN0IHZpc0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aXN1YWwtc3RhZ2UtY29udGFpbmVyJyk7XG4gIGNvbnN0IHN0ZFdyYXBwZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc3RhbmRhcmQtZG9jLXdyYXBwZXInKTtcbiAgY29uc3QgaXNWaXN1YWwgPSBzdGF0ZS5pc1Zpc3VhbE1vZGU7XG4gIGNvbnN0IGdlbmVyYXRpb24gPSArK3JlbmRlckdlbmVyYXRpb247XG4gIGNvbnN0IGlzRW1wdHkgPSByYXdNYXJrZG93bi50cmltKCkgPT09ICcnO1xuICBpZiAod2luZG93Lkx1Y2l2b1N0YWdlKSBMdWNpdm9TdGFnZS5yZXNldExpZ2h0cygpO1xuXG4gIC8vIOmdnuihqOekuuWBtOOBruOCs+ODs+ODhuODiuOBr+epuuOBq+OBmeOCi+OAguaui+OBmeOBqOWQjOOBmCBkYXRhLXN0YWdlLWluZGV444O7U1ZHIOWGhSBpZCDjgYwgRE9NIOOBq+mHjeikh+OBl+OAgVxuICAvLyDmj4/nlLvntZDmnpzjga7mm7jjgY3ovrzjgb/lhYjjgoTjg57jg7zjgqvjg7zjg7vjgrDjg6njg4fjg7zjgrfjg6fjg7Pjga7lj4LnhaflhYjjgYzpnZ7ooajnpLrlgbTjgavlkJHjgYTjgabjgZfjgb7jgYZcbiAgaWYgKGlzVmlzdWFsKSB7XG4gICAgc3RkV3JhcHBlci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICBzdGRDb250YWluZXIuaW5uZXJIVE1MID0gJyc7XG4gICAgdmlzQ29udGFpbmVyLmNsYXNzTGlzdC5yZW1vdmUoJ2hpZGRlbicpO1xuICAgIHZpc0NvbnRhaW5lci5pbm5lckhUTUwgPSBpc0VtcHR5XG4gICAgICA/IGA8ZGl2IGNsYXNzPVwiZXhoaWJpdGlvbi13cmFwXCI+PHNlY3Rpb24gY2xhc3M9XCJleGhpYml0aW9uLXNsYWJcIj4ke0VNUFRZX0dVSURFX0hUTUx9PC9zZWN0aW9uPjwvZGl2PmBcbiAgICAgIDogYnVpbGRWaXN1YWxTdGFnZUh0bWwoY2xlYW5IdG1sLCB5YW1sKTtcbiAgfSBlbHNlIHtcbiAgICB2aXNDb250YWluZXIuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgdmlzQ29udGFpbmVyLmlubmVySFRNTCA9ICcnO1xuICAgIHN0ZFdyYXBwZXIuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgc3RkQ29udGFpbmVyLmlubmVySFRNTCA9IGlzRW1wdHkgPyBFTVBUWV9HVUlERV9IVE1MIDogY2xlYW5IdG1sO1xuICAgIGRlY29yYXRlQWxlcnRzKHN0ZENvbnRhaW5lcik7XG4gIH1cblxuICBjb25zdCBhY3RpdmVDb250YWluZXIgPSBpc1Zpc3VhbCA/IHZpc0NvbnRhaW5lciA6IHN0ZENvbnRhaW5lcjtcbiAgd3JhcFRhYmxlcyhhY3RpdmVDb250YWluZXIpO1xuICByZXNvbHZlRm9sZGVySW1hZ2VzKGFjdGl2ZUNvbnRhaW5lcik7XG4gIHJlbmRlck1hdGgoYWN0aXZlQ29udGFpbmVyKTtcbiAgY29uc3Qgc2xvdHMgPSBhY3RpdmVDb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmx1Y2l2by1zbG90Jyk7XG4gIGNvbnN0IG1vZGVUYWcgPSBpc1Zpc3VhbCA/IGB2aXMtJHtzdGF0ZS5pbmZvZ3JhcGhpY1N0eWxlfWAgOiAnc3RkJztcblxuICBjb25zdCBkaXJ0eUJsb2NrcyA9IFtdO1xuICBjb25zdCBjYWNoZWRLZXlzID0gbmV3IE1hcCgpO1xuXG4gIHNsb3RzLmZvckVhY2goc2xvdCA9PiB7XG4gICAgY29uc3QgaWR4ID0gcGFyc2VJbnQoc2xvdC5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2xvdCcpLCAxMCk7XG4gICAgY29uc3QgYmxvY2sgPSBtZXJtYWlkQmxvY2tzW2lkeF07XG4gICAgaWYgKCFibG9jaykgcmV0dXJuO1xuXG4gICAgY29uc3QgY2FjaGVLZXkgPSBgJHtibG9jay5oYXNofS0ke21vZGVUYWd9YDtcblxuICAgIGlmIChzdmdDYWNoZS5oYXMoY2FjaGVLZXkpKSB7XG4gICAgICBzbG90Lm91dGVySFRNTCA9IGNyZWF0ZURpYWdyYW1DYXJkKGlkeCwgc3ZnQ2FjaGUuZ2V0KGNhY2hlS2V5KSwgZmFsc2UsIGlzVmlzdWFsLCBibG9jay5jdXJ2ZSk7XG4gICAgICBjYWNoZWRLZXlzLnNldChpZHgsIGNhY2hlS2V5KTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2xvdC5vdXRlckhUTUwgPSBjcmVhdGVEaWFncmFtQ2FyZChpZHgsICcnLCB0cnVlLCBpc1Zpc3VhbCwgYmxvY2suY3VydmUpO1xuICAgICAgZGlydHlCbG9ja3MucHVzaCh7IC4uLmJsb2NrLCBtb2RlVGFnLCBjYWNoZUtleSB9KTtcbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlZEtleXMuZm9yRWFjaCgoY2FjaGVLZXksIGlkeCkgPT4ge1xuICAgIGFwcGx5UmVhZGFibGVGaXQoYWN0aXZlQ29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXN0YWdlLWluZGV4PVwiJHtpZHh9XCJdID4gc3ZnYCksIGNhY2hlS2V5KTtcbiAgfSk7XG4gIGJpbmRWaWV3cG9ydEludGVyYWN0aW9ucyhhY3RpdmVDb250YWluZXIpO1xuICBtb3VudFN0YWdlKGFjdGl2ZUNvbnRhaW5lcik7XG4gIC8vIOWFpeWKm+OBp+imi+WHuuOBl+OCkuabuOOBjei2s+OBl+OBn+ebtOW+jOOBr+OAgeaPj+eUu+OBjOe1guOCj+OCi+OBvuOBp+aWsOOBl+OBhOimi+WHuuOBl+OBjOOBquOBhOOAguaPj+eUu+OBruW+jOOBq+WMuumWk+OCkuW8leOBjeebtOOBme+8iERELURJQUctMDYx77yJXG4gIGlmIChkb2N1bWVudC5hY3RpdmVFbGVtZW50ICYmIGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQuaWQgPT09ICdtYXJrZG93bi1lZGl0b3InKSBzY2hlZHVsZUZvbGxvdygpO1xuXG4gIGlmIChkaXJ0eUJsb2Nrcy5sZW5ndGggPiAwKSB7XG4gICAgcHJvY2Vzc0RpcnR5QmxvY2tzKGRpcnR5QmxvY2tzLCB7IGNvbnRhaW5lcjogYWN0aXZlQ29udGFpbmVyLCBnZW5lcmF0aW9uLCBpc1Zpc3VhbCB9KTtcbiAgfSBlbHNlIHtcbiAgICB1cGRhdGVTdGF0dXMoYOKAoiAke21lcm1haWRCbG9ja3MubGVuZ3RofS8ke21lcm1haWRCbG9ja3MubGVuZ3RofSBEaWFncmFtcyBSZWFkeWAsICdzdWNjZXNzJyk7XG4gIH1cbn1cblxuLy8gVmlzdWFs44Oi44O844OJ44Gu5Zuz44Gr6Iie5Y+w5ryU5Ye644KS5Y+W44KK5LuY44GR44KL44CC6Kqt44G/6L6844G/44KS5b6F44Gk6ZaT44GrIERPTSDjgYzkvZzjgornm7TjgZXjgozjgZ/loLTlkIjjga/kvZXjgoLjgZfjgarjgYRcbmZ1bmN0aW9uIG1vdW50U3RhZ2UoY29udGFpbmVyKSB7XG4gIGlmICghc3RhdGUuaXNWaXN1YWxNb2RlKSByZXR1cm47XG4gIGxvYWRMaWJyYXJ5KCdzdGFnZScpLnRoZW4ob2sgPT4ge1xuICAgIGlmIChvayAmJiBzdGF0ZS5pc1Zpc3VhbE1vZGUgJiYgY29udGFpbmVyLmlzQ29ubmVjdGVkKSBMdWNpdm9TdGFnZS5tb3VudChjb250YWluZXIpO1xuICB9KTtcbn1cblxuLy8gdGFyZ2V0OiDmj4/nlLvplovlp4vmmYLjga7ooajnpLrlhYjjgrPjg7Pjg4bjg4rjg7vmj4/nlLvkuJbku6Pjg7vjg6Ljg7zjg4njgIJcbi8vIOaPj+eUu+S4reOBq+ODouODvOODieWIh+abv+OChOWGjeaPj+eUu+OBjOi1t+OBjeOBn+WgtOWQiO+8iOS4luS7o+OBjOWkieOCj+OBo+OBn+WgtOWQiO+8ieOBr+OAgeWPpOOBhOaPj+eUu+e1kOaenOOCkuaNqOOBpuOCi1xuYXN5bmMgZnVuY3Rpb24gcHJvY2Vzc0RpcnR5QmxvY2tzKGRpcnR5QmxvY2tzLCB0YXJnZXQpIHtcbiAgdXBkYXRlU3RhdHVzKGBSZW5kZXJpbmcgJHtkaXJ0eUJsb2Nrcy5sZW5ndGh9IGRpYWdyYW1zLi4uYCwgJ3dhcm5pbmcnKTtcbiAgY29uc3QgaXNTdGFsZSA9ICgpID0+IHRhcmdldC5nZW5lcmF0aW9uICE9PSByZW5kZXJHZW5lcmF0aW9uO1xuXG4gIC8vIE1lcm1haWQg44Gv44CB5Zuz44GM5Yid44KB44Gm54++44KM44Gf44Go44GN44Gr6Kqt44G/6L6844KAXG4gIGNvbnN0IG1lcm1haWRSZWFkeSA9IGF3YWl0IGxvYWRMaWJyYXJ5KCdtZXJtYWlkJyk7XG4gIGlmIChpc1N0YWxlKCkpIHJldHVybjtcbiAgaWYgKCFtZXJtYWlkUmVhZHkpIHtcbiAgICBkaXJ0eUJsb2Nrcy5mb3JFYWNoKGJsb2NrID0+IHtcbiAgICAgIGNvbnN0IHZwID0gdGFyZ2V0LmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1zdGFnZS1pbmRleD1cIiR7YmxvY2suaW5kZXh9XCJdYCk7XG4gICAgICBpZiAodnApIHZwLmlubmVySFRNTCA9ICc8ZGl2IGNsYXNzPVwicC00IHRleHQteHMgZm9udC1tb25vIHRleHQtcmVkLTUwMCBiZy1yZWQtNTAwLzEwIHJvdW5kZWQteGxcIj5NZXJtYWlkIOOCkuiqreOBv+i+vOOCgeOBvuOBm+OCk+OBp+OBl+OBn++8iOODjeODg+ODiOODr+ODvOOCr+OBruaOpee2muOCkueiuuiqjeOBl+OBpuOBj+OBoOOBleOBhO+8iTwvZGl2Pic7XG4gICAgfSk7XG4gICAgdXBkYXRlU3RhdHVzKCfigKIgTWVybWFpZCBVbmF2YWlsYWJsZScsICd3YXJuaW5nJyk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZm9yIChjb25zdCBibG9jayBvZiBkaXJ0eUJsb2Nrcykge1xuICAgIGlmIChpc1N0YWxlKCkpIHJldHVybjtcbiAgICBjb25zdCByZW5kZXJJZCA9IGBtZXJtYWlkLXJlbmRlci0ke2Jsb2NrLmluZGV4fS0ke0RhdGUubm93KCl9YDtcbiAgICBjb25zdCBsa2dLZXkgPSBgJHtibG9jay5pbmRleH0tJHtibG9jay5tb2RlVGFnfWA7XG4gICAgY29uc3Qgc3RhZ2VWaWV3cG9ydCA9IHRhcmdldC5jb250YWluZXIucXVlcnlTZWxlY3RvcihgW2RhdGEtc3RhZ2UtaW5kZXg9XCIke2Jsb2NrLmluZGV4fVwiXWApO1xuICAgIHRyeSB7XG4gICAgICBzZXR1cE1lcm1haWQodGFyZ2V0LmlzVmlzdWFsLCBibG9jay5jdXJ2ZSB8fCAnc21vb3RoJywgZ2V0TWVybWFpZExheW91dChibG9jay5jb2RlLCBibG9jay5jdXJ2ZSkpO1xuICAgICAgY29uc3QgeyBzdmcgfSA9IGF3YWl0IG1lcm1haWQucmVuZGVyKHJlbmRlcklkLCBibG9jay5jb2RlKTtcbiAgICAgIGlmIChpc1N0YWxlKCkpIHJldHVybjtcbiAgICAgIGNvbnN0IGZpbmFsU3ZnID0gcG9zdFByb2Nlc3NTdmcoc3ZnLCB0YXJnZXQuaXNWaXN1YWwpO1xuXG4gICAgICBzdmdDYWNoZS5zZXQoYmxvY2suY2FjaGVLZXksIGZpbmFsU3ZnKTtcbiAgICAgIGxrZ0NhY2hlLnNldChsa2dLZXksIGZpbmFsU3ZnKTtcblxuICAgICAgaWYgKHN0YWdlVmlld3BvcnQpIHtcbiAgICAgICAgc3RhZ2VWaWV3cG9ydC5pbm5lckhUTUwgPSBmaW5hbFN2ZztcbiAgICAgICAgYXBwbHlSZWFkYWJsZUZpdChzdGFnZVZpZXdwb3J0LnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IHN2ZycpLCBibG9jay5jYWNoZUtleSk7XG4gICAgICAgIG1vdW50U3RhZ2Uoc3RhZ2VWaWV3cG9ydCk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAvLyBNZXJtYWlkIOOBjOaPj+eUu+OBruOBn+OCgeOBqyBib2R5IOOBq+e9ruOBhOOBn+S4gOaZgueahOOBquimgee0oOOBjOaui+OBo+OBpuOBhOOCjOOBsOa2iOOBme+8iERELURJQUctMDY077yJXG4gICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChgZCR7cmVuZGVySWR9YCk/LnJlbW92ZSgpO1xuICAgICAgY29uc29sZS5lcnJvcihgTWVybWFpZCByZW5kZXIgZmFpbGVkIGZvciBibG9jayAke2Jsb2NrLmluZGV4fTpgLCBlcnIpO1xuICAgICAgaWYgKGlzU3RhbGUoKSkgcmV0dXJuO1xuICAgICAgY29uc3QgZmFsbGJhY2sgPSBsa2dDYWNoZS5nZXQobGtnS2V5KTtcbiAgICAgIGlmIChzdGFnZVZpZXdwb3J0KSB7XG4gICAgICAgIGlmIChmYWxsYmFjaykge1xuICAgICAgICAgIHN0YWdlVmlld3BvcnQuaW5uZXJIVE1MID0gZmFsbGJhY2s7XG4gICAgICAgICAgYXBwbHlSZWFkYWJsZUZpdChzdGFnZVZpZXdwb3J0LnF1ZXJ5U2VsZWN0b3IoJzpzY29wZSA+IHN2ZycpKTtcbiAgICAgICAgICBtb3VudFN0YWdlKHN0YWdlVmlld3BvcnQpO1xuICAgICAgICAgIHNob3dUb2FzdCgn5qeL5paH44Ko44Op44O844Gu44Gf44KB55u05YmN44Gu5q2j5bi454q25oWL44KS6KGo56S6Jyk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgc3RhZ2VWaWV3cG9ydC5pbm5lckhUTUwgPSBgPGRpdiBjbGFzcz1cInAtNCB0ZXh0LXhzIGZvbnQtbW9ubyB0ZXh0LXJlZC01MDAgYmctcmVkLTUwMC8xMCByb3VuZGVkLXhsXCI+5qeL5paH44Ko44Op44O8OiDmraPjgZfjgYRNZXJtYWlk6KiY5rOV44KS5YWl5Yqb44GX44Gm44GP44Gg44GV44GEPC9kaXY+YDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHVwZGF0ZVN0YXR1cyhg4oCiIEFsbCBEaWFncmFtcyBWZXJpZmllZGAsICdzdWNjZXNzJyk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICDjg5Pjg6Xjg7zjg53jg7zjg4jmk43kvZzjgqTjg5njg7Pjg4hcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vLyBjb250YWluZXI6IOihqOekuuS4reOBruOCs+ODs+ODhuODiuOAgumdnuihqOekuuWBtOOBruWbs+OCkuaTjeS9nOOBl+OBquOBhOOCiOOBhuOAgeaOoue0ouevhOWbsuOCkumZkOWumuOBmeOCi1xuZnVuY3Rpb24gYmluZFZpZXdwb3J0SW50ZXJhY3Rpb25zKGNvbnRhaW5lcikge1xuICAvLyDnn6LljbDjga7lvaLnirbjgpLpgbjjgbbjgajjgIHjgZ3jga7lm7PjgaDjgZHjgq3jg6Pjg4Pjgrfjg6Xjga7jgq3jg7zjgYzlpInjgo/jgorjgIHmj4/jgY3nm7TjgZXjgozjgovvvIhERC1FREdFLTAxMe+8iVxuICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnLmVkZ2UtY3VydmUtYnRuJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgc3RhdGUuY3VydmVCeUluZGV4LnNldChwYXJzZUludChidG4uZ2V0QXR0cmlidXRlKCdkYXRhLWluZGV4JyksIDEwKSwgYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1jdXJ2ZScpKTtcbiAgICAgIHJlbmRlckFwcCgpO1xuICAgIH07XG4gIH0pO1xuXG4gIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCcuc2NhbGUtYnRuJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcpO1xuICAgICAgY29uc3QgYWN0aW9uID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1hY3Rpb24nKTtcbiAgICAgIGNvbnN0IHZwID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoYFtkYXRhLXN0YWdlLWluZGV4PVwiJHtpZHh9XCJdYCk7XG4gICAgICBjb25zdCBmcmFtZSA9IGJ0bi5jbG9zZXN0KGAjZGlhZ3JhbS1mcmFtZS0ke2lkeH1gKTtcbiAgICAgIGlmICghdnAgfHwgIWZyYW1lKSByZXR1cm47XG5cbiAgICAgIGZyYW1lLnF1ZXJ5U2VsZWN0b3JBbGwoJy5zY2FsZS1idG4nKS5mb3JFYWNoKGIgPT4gYi5jbGFzc0xpc3QucmVtb3ZlKCdpcy1hY3RpdmUnKSk7XG4gICAgICBidG4uY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG5cbiAgICAgIC8vIEN0cmwgKyDjg5vjgqTjg7zjg6vjgaflpInjgYjjgZ/lgI3njofvvIhERC1ESUFHLTA3Me+8ieOBr+OAgUZpdCAvIDE6MSDjgpLpgbjjgpPjgaDjgonop6PpmaTjgZnjgotcbiAgICAgIGNsZWFyRGlhZ3JhbVpvb20odnApO1xuICAgICAgaWYgKGFjdGlvbiA9PT0gJ3NjYWxlLWFjdHVhbCcpIHtcbiAgICAgICAgdnAuY2xhc3NMaXN0LmFkZCgnaXMtYWN0dWFsLXNpemUnKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZwLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLWFjdHVhbC1zaXplJyk7XG4gICAgICB9XG4gICAgICB1cGRhdGVTbGFiU3BsaXQodnAuY2xvc2VzdCgnLmV4aGliaXRpb24tc2xhYi1zcGxpdCcpKTtcbiAgICAgIHVwZGF0ZVBhbm5hYmxlKHZwKTtcbiAgICB9O1xuICB9KTtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtYWN0aW9uPVwic3ZnXCJdJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcpO1xuICAgICAgY29uc3QgdnAgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihgW2RhdGEtc3RhZ2UtaW5kZXg9XCIke2lkeH1cIl1gKTtcbiAgICAgIGlmICghdnApIHJldHVybjtcbiAgICAgIGNvbnN0IHN2Z0VsID0gdnAucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgICBpZiAoIXN2Z0VsKSByZXR1cm47XG4gICAgICBkb3dubG9hZEJsb2Ioc3ZnRWwub3V0ZXJIVE1MLCBgZGlhZ3JhbS0wJHtwYXJzZUludChpZHgsIDEwKSArIDF9LnN2Z2AsICdpbWFnZS9zdmcreG1sJyk7XG4gICAgICBzaG93VG9hc3QoYERpYWdyYW0gMCR7cGFyc2VJbnQoaWR4LCAxMCkgKyAxfSBTVkfjgpLjg4Djgqbjg7Pjg63jg7zjg4lgKTtcbiAgICB9O1xuICB9KTtcblxuICBjb250YWluZXIucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtYWN0aW9uPVwicG5nXCJdJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3QgaWR4ID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS1pbmRleCcpO1xuICAgICAgY29uc3QgdnAgPSBjb250YWluZXIucXVlcnlTZWxlY3RvcihgW2RhdGEtc3RhZ2UtaW5kZXg9XCIke2lkeH1cIl1gKTtcbiAgICAgIGlmICghdnApIHJldHVybjtcbiAgICAgIGNvbnN0IHN2Z0VsID0gdnAucXVlcnlTZWxlY3Rvcignc3ZnJyk7XG4gICAgICBpZiAoIXN2Z0VsKSByZXR1cm47XG5cbiAgICAgIGNvbnN0IHN2Z0RhdGEgPSBuZXcgWE1MU2VyaWFsaXplcigpLnNlcmlhbGl6ZVRvU3RyaW5nKHN2Z0VsKTtcbiAgICAgIGNvbnN0IHN2Z0Jsb2IgPSBuZXcgQmxvYihbc3ZnRGF0YV0sIHsgdHlwZTogJ2ltYWdlL3N2Zyt4bWw7Y2hhcnNldD11dGYtOCcgfSk7XG4gICAgICBjb25zdCBVUkxPYmogPSB3aW5kb3cuVVJMIHx8IHdpbmRvdy53ZWJraXRVUkwgfHwgd2luZG93O1xuICAgICAgY29uc3QgYmxvYlVSTCA9IFVSTE9iai5jcmVhdGVPYmplY3RVUkwoc3ZnQmxvYik7XG4gICAgICBjb25zdCBpbWFnZSA9IG5ldyBJbWFnZSgpO1xuXG4gICAgICBpbWFnZS5vbmxvYWQgPSAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpO1xuICAgICAgICBjb25zdCBzY2FsZSA9IDI7XG4gICAgICAgIGNvbnN0IGJib3ggPSBzdmdFbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgICAgICAgY2FudmFzLndpZHRoID0gKGJib3gud2lkdGggfHwgODAwKSAqIHNjYWxlO1xuICAgICAgICBjYW52YXMuaGVpZ2h0ID0gKGJib3guaGVpZ2h0IHx8IDYwMCkgKiBzY2FsZTtcbiAgICAgICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSBzdGF0ZS5hcHBlYXJhbmNlID09PSAnZGFyaycgPyBnZXREaWFncmFtU3BlYyhzdGF0ZS5pc1Zpc3VhbE1vZGUpLmNhbnZhc0JnIDogJyNGRkZGRkYnO1xuICAgICAgICBjdHguZmlsbFJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgY3R4LmRyYXdJbWFnZShpbWFnZSwgMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgICAgY2FudmFzLnRvQmxvYihibG9iID0+IHtcbiAgICAgICAgICBjb25zdCBkbFVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoYmxvYik7XG4gICAgICAgICAgY29uc3QgYSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2EnKTtcbiAgICAgICAgICBhLmhyZWYgPSBkbFVybDtcbiAgICAgICAgICBhLmRvd25sb2FkID0gYGRpYWdyYW0tMCR7cGFyc2VJbnQoaWR4LCAxMCkgKyAxfS5wbmdgO1xuICAgICAgICAgIGEuY2xpY2soKTtcbiAgICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKGRsVXJsKTtcbiAgICAgICAgICBzaG93VG9hc3QoYERpYWdyYW0gMCR7cGFyc2VJbnQoaWR4LCAxMCkgKyAxfSBQTkcgKOmrmOino+WDj+W6pikg44KS44OA44Km44Oz44Ot44O844OJYCk7XG4gICAgICAgIH0pO1xuICAgICAgICBVUkxPYmoucmV2b2tlT2JqZWN0VVJMKGJsb2JVUkwpO1xuICAgICAgfTtcbiAgICAgIGltYWdlLnNyYyA9IGJsb2JVUkw7XG4gICAgfTtcbiAgfSk7XG5cbiAgY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3JBbGwoJ1tkYXRhLWFjdGlvbj1cInpvb21cIl0nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBpZHggPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLWluZGV4Jyk7XG4gICAgICBjb25zdCB2cCA9IGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKGBbZGF0YS1zdGFnZS1pbmRleD1cIiR7aWR4fVwiXWApO1xuICAgICAgaWYgKCF2cCkgcmV0dXJuO1xuICAgICAgY29uc3Qgc3ZnRWwgPSB2cC5xdWVyeVNlbGVjdG9yKCdzdmcnKTtcbiAgICAgIGlmICghc3ZnRWwpIHJldHVybjtcblxuICAgICAgY29uc3Qgem9vbUNhbnZhcyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd6b29tLWNhbnZhcycpO1xuICAgICAgem9vbUNhbnZhcy5pbm5lckhUTUwgPSBzdmdFbC5vdXRlckhUTUw7XG4gICAgICBzZXRNb2RhbE9wZW4oJ3pvb20tbW9kYWwnLCB0cnVlKTtcbiAgICAgIGlmIChzdGF0ZS5pc1Zpc3VhbE1vZGUgJiYgd2luZG93Lkx1Y2l2b1N0YWdlKSBMdWNpdm9TdGFnZS5tb3VudExpZ2h0cyh6b29tQ2FudmFzKTtcbiAgICB9O1xuICB9KTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIOWbs+OBruODieODqeODg+OCsOenu+WLleOBqCBDdHJsICsg44Ob44Kk44O844Or44Gu5ouh5aSn44O757iu5bCP77yIRlItMDM4LCBGUi0wMznvvIlcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG5jb25zdCBESUFHUkFNX1ZJRVdQT1JUX1NFTEVDVE9SID0gJy5kaWFncmFtLXZpZXdwb3J0LCAuZXhoaWJpdGlvbi12aWV3cG9ydCc7XG4vLyDlgI3njofjga/ljp/lr7jvvIh2aWV3Qm94IOOBruW5he+8ieOBq+WvvuOBmeOCi+avlOOAguS4i+mZkOOBr+WFqOS9k+OCkuimi+a4oeOBm+OCi+Wkp+OBjeOBleOAgeS4iumZkOOBr+e0sOmDqOOBrueiuuiqjeOBq+i2s+OCiuOCi+Wkp+OBjeOBle+8iERELURJQUctMDcx77yJXG5jb25zdCBESUFHUkFNX1pPT01fTUlOID0gMC4yNTtcbmNvbnN0IERJQUdSQU1fWk9PTV9NQVggPSA0O1xuLy8g44Ob44Kk44O844Or44GuIDEg44OO44OD44OB77yIZGVsdGFZID0gMTAwIHB477yJ44Gn57SEIDE2JSDmi6HlpKfjg7vnuK7lsI/jgZnjgotcbmNvbnN0IERJQUdSQU1fWk9PTV9TRU5TSVRJVklUWSA9IDAuMDAxNTtcbi8vIOOBk+OCjOS7peS4iuWLleOBhOOBn+OCieODieODqeODg+OCsOOBqOOBv+OBquOBl+OAgembouOBl+OBn+OBqOOBjeOBruOCr+ODquODg+OCr+OCkuWbs+OBq+a4oeOBleOBquOBhO+8iERELURJQUctMDcw77yJXG5jb25zdCBQQU5fQ0xJQ0tfVE9MRVJBTkNFX1BYID0gNDtcblxuLy8g44K544OG44O844K455m66KGo5Lit44Gv44CB5Zuz44Gu5aSn44GN44GV44Go5L2N572u44KS55m66KGo44Gu5Yem55CG44GM5rG644KB44KL44Gf44KB44CB44OJ44Op44OD44Kw44Go5ouh5aSn44O757iu5bCP44KS5Y+X44GR5LuY44GR44Gq44GEXG5mdW5jdGlvbiBmaW5kRGlhZ3JhbVZpZXdwb3J0KHRhcmdldCkge1xuICBpZiAoZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmNsYXNzTGlzdC5jb250YWlucygnaXMtc3RhZ2Utc2hvdycpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgdnAgPSB0YXJnZXQgaW5zdGFuY2VvZiBFbGVtZW50ID8gdGFyZ2V0LmNsb3Nlc3QoRElBR1JBTV9WSUVXUE9SVF9TRUxFQ1RPUikgOiBudWxsO1xuICByZXR1cm4gdnAgJiYgdnAucXVlcnlTZWxlY3RvcignOnNjb3BlID4gc3ZnJykgPyB2cCA6IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzU2Nyb2xsYWJsZSh2cCkge1xuICByZXR1cm4gdnAuc2Nyb2xsV2lkdGggPiB2cC5jbGllbnRXaWR0aCArIDEgfHwgdnAuc2Nyb2xsSGVpZ2h0ID4gdnAuY2xpZW50SGVpZ2h0ICsgMTtcbn1cblxuLy8g44K544Kv44Ot44O844Or6KGo56S644Gu5Zuz44Gg44GR44CB44Gk44GL44KB44KL44GT44Go44KS44Kr44O844K944Or77yIZ3JhYu+8ieOBp+ekuuOBme+8iERELURJQUctMDcw77yJXG5mdW5jdGlvbiB1cGRhdGVQYW5uYWJsZSh2cCkge1xuICBpZiAodnApIHZwLmNsYXNzTGlzdC50b2dnbGUoJ2lzLXBhbm5hYmxlJywgaXNTY3JvbGxhYmxlKHZwKSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyRGlhZ3JhbVpvb20odnApIHtcbiAgaWYgKCF2cC5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXpvb21lZCcpKSByZXR1cm47XG4gIHZwLmNsYXNzTGlzdC5yZW1vdmUoJ2lzLXpvb21lZCcpO1xuICBkZWxldGUgdnAuZGF0YXNldC56b29tO1xuICBjb25zdCBzdmcgPSB2cC5xdWVyeVNlbGVjdG9yKCc6c2NvcGUgPiBzdmcnKTtcbiAgaWYgKHN2Zykgc3ZnLnN0eWxlLnJlbW92ZVByb3BlcnR5KCctLXpvb20td2lkdGgnKTtcbn1cblxuLy8g57im5pa55ZCR44Gv5Zuz44Gu6KGo56S65p6g44Gn44Gv44Gq44GP44OX44Os44OT44Ol44O844GM44K544Kv44Ot44O844Or44GZ44KL44Gf44KB44CB5ouh5aSn44O757iu5bCP44Gu5Z+65rqW54K544KS5L+d44Gk44Go44GN44Gr5L2/44GGXG5mdW5jdGlvbiBmaW5kU2Nyb2xsUGFyZW50KGVsKSB7XG4gIGZvciAobGV0IG5vZGUgPSBlbC5wYXJlbnRFbGVtZW50OyBub2RlOyBub2RlID0gbm9kZS5wYXJlbnRFbGVtZW50KSB7XG4gICAgY29uc3Qgb3ZlcmZsb3dZID0gZ2V0Q29tcHV0ZWRTdHlsZShub2RlKS5vdmVyZmxvd1k7XG4gICAgaWYgKChvdmVyZmxvd1kgPT09ICdhdXRvJyB8fCBvdmVyZmxvd1kgPT09ICdzY3JvbGwnKSAmJiBub2RlLnNjcm9sbEhlaWdodCA+IG5vZGUuY2xpZW50SGVpZ2h0KSByZXR1cm4gbm9kZTtcbiAgfVxuICByZXR1cm4gZG9jdW1lbnQuc2Nyb2xsaW5nRWxlbWVudDtcbn1cblxuLy8gQ3RybCArIOODm+OCpOODvOODq+OBp+OAgeOBneOBruWbs+OBoOOBkeOCkuOAgeOCq+ODvOOCveODq+OBruS9jee9ruOCkuS4reW/g+OBq+aLoeWkp+ODu+e4ruWwj+OBmeOCi++8iEZSLTAzOSwgREQtRElBRy0wNzHvvIlcbmZ1bmN0aW9uIHpvb21EaWFncmFtKHZwLCBldmVudCkge1xuICBjb25zdCBzdmcgPSB2cC5xdWVyeVNlbGVjdG9yKCc6c2NvcGUgPiBzdmcnKTtcbiAgY29uc3Qgdmlld0JveCA9IHN2Zy52aWV3Qm94ICYmIHN2Zy52aWV3Qm94LmJhc2VWYWw7XG4gIGlmICghdmlld0JveCB8fCAhdmlld0JveC53aWR0aCkgcmV0dXJuO1xuICBjb25zdCBiZWZvcmUgPSBzdmcuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIGlmICghYmVmb3JlLndpZHRoKSByZXR1cm47XG4gIGNvbnN0IGN1cnJlbnQgPSB2cC5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXpvb21lZCcpID8gcGFyc2VGbG9hdCh2cC5kYXRhc2V0Lnpvb20pIDogYmVmb3JlLndpZHRoIC8gdmlld0JveC53aWR0aDtcbiAgY29uc3QgZGVsdGFQeCA9IGV2ZW50LmRlbHRhTW9kZSA9PT0gMSA/IGV2ZW50LmRlbHRhWSAqIDE2IDogZXZlbnQuZGVsdGFZO1xuICBjb25zdCBuZXh0ID0gTWF0aC5taW4oRElBR1JBTV9aT09NX01BWCwgTWF0aC5tYXgoRElBR1JBTV9aT09NX01JTiwgY3VycmVudCAqIE1hdGguZXhwKC1kZWx0YVB4ICogRElBR1JBTV9aT09NX1NFTlNJVElWSVRZKSkpO1xuICBpZiAoTWF0aC5hYnMobmV4dCAtIGN1cnJlbnQpIDwgMC4wMDEpIHJldHVybjtcbiAgLy8g44Kr44O844K944Or44Gu5LiL44Gr44GC44KL5Zuz44Gu54K577yI5Zuz44Gu5bmF44O76auY44GV44Gr5a++44GZ44KL5q+U77yJXG4gIGNvbnN0IGZ4ID0gKGV2ZW50LmNsaWVudFggLSBiZWZvcmUubGVmdCkgLyBiZWZvcmUud2lkdGg7XG4gIGNvbnN0IGZ5ID0gKGV2ZW50LmNsaWVudFkgLSBiZWZvcmUudG9wKSAvIGJlZm9yZS5oZWlnaHQ7XG5cbiAgdnAuY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0dWFsLXNpemUnKTtcbiAgdnAuY2xhc3NMaXN0LmFkZCgnaXMtem9vbWVkJyk7XG4gIHZwLmRhdGFzZXQuem9vbSA9IFN0cmluZyhuZXh0KTtcbiAgc3ZnLnN0eWxlLnNldFByb3BlcnR5KCctLXpvb20td2lkdGgnLCBgJHsodmlld0JveC53aWR0aCAqIG5leHQpLnRvRml4ZWQoMSl9cHhgKTtcbiAgY29uc3QgZnJhbWUgPSB2cC5jbG9zZXN0KCdbaWRePVwiZGlhZ3JhbS1mcmFtZS1cIl0nKTtcbiAgaWYgKGZyYW1lKSBmcmFtZS5xdWVyeVNlbGVjdG9yQWxsKCcuc2NhbGUtYnRuJykuZm9yRWFjaChiID0+IGIuY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJykpO1xuICB1cGRhdGVTbGFiU3BsaXQodnAuY2xvc2VzdCgnLmV4aGliaXRpb24tc2xhYi1zcGxpdCcpKTtcblxuICAvLyDmi6HlpKfjg7vnuK7lsI/jga7lvozjgoLjgIHlkIzjgZjlm7Pjga7ngrnjgYzjgqvjg7zjgr3jg6vjga7kuIvjgavmnaXjgovjgojjgYbjgavjgrnjgq/jg63jg7zjg6vjgZnjgotcbiAgY29uc3QgYWZ0ZXIgPSBzdmcuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gIHZwLnNjcm9sbExlZnQgKz0gYWZ0ZXIubGVmdCArIGZ4ICogYWZ0ZXIud2lkdGggLSBldmVudC5jbGllbnRYO1xuICBjb25zdCBzY3JvbGxlciA9IGZpbmRTY3JvbGxQYXJlbnQodnApO1xuICBpZiAoc2Nyb2xsZXIpIHNjcm9sbGVyLnNjcm9sbFRvcCArPSBhZnRlci50b3AgKyBmeSAqIGFmdGVyLmhlaWdodCAtIGV2ZW50LmNsaWVudFk7XG4gIHVwZGF0ZVBhbm5hYmxlKHZwKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBEaWFncmFtUGFuWm9vbSgpIHtcbiAgY29uc3QgcGFuID0geyB2cDogbnVsbCwgcG9pbnRlcklkOiBudWxsLCB4OiAwLCB5OiAwLCBsZWZ0OiAwLCB0b3A6IDAsIG1vdmVkOiBmYWxzZSB9O1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlb3ZlcicsIGV2ZW50ID0+IHVwZGF0ZVBhbm5hYmxlKGZpbmREaWFncmFtVmlld3BvcnQoZXZlbnQudGFyZ2V0KSkpO1xuXG4gIC8vIOWbs+OBruS4iuOBriBDdHJsICsg44Ob44Kk44O844Or44Gv44CB44OW44Op44Km44K244Gu44Oa44O844K45YWo5L2T44Gu44K644O844Og44Gn44Gv44Gq44GP44CB5Zuz44Gu5ouh5aSn44O757iu5bCP44Gr44GZ44KL77yIREQtRElBRy0wNzHvvIlcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignd2hlZWwnLCBldmVudCA9PiB7XG4gICAgaWYgKCFldmVudC5jdHJsS2V5IHx8ICFldmVudC5kZWx0YVkpIHJldHVybjtcbiAgICBjb25zdCB2cCA9IGZpbmREaWFncmFtVmlld3BvcnQoZXZlbnQudGFyZ2V0KTtcbiAgICBpZiAoIXZwKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICB6b29tRGlhZ3JhbSh2cCwgZXZlbnQpO1xuICB9LCB7IHBhc3NpdmU6IGZhbHNlIH0pO1xuXG4gIC8vIOOCueOCr+ODreODvOODq+ihqOekuuOBruWbs+OCkuODnuOCpuOCueOBp+OBpOOBi+OCk+OBp+WLleOBi+OBme+8iEZSLTAzOCwgREQtRElBRy0wNzDvvIlcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncG9pbnRlcmRvd24nLCBldmVudCA9PiB7XG4gICAgaWYgKGV2ZW50LnBvaW50ZXJUeXBlICE9PSAnbW91c2UnIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IHZwID0gZmluZERpYWdyYW1WaWV3cG9ydChldmVudC50YXJnZXQpO1xuICAgIGlmICghdnAgfHwgZXZlbnQudGFyZ2V0LmNsb3Nlc3QoJ2EsIGJ1dHRvbicpIHx8ICFpc1Njcm9sbGFibGUodnApKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBPYmplY3QuYXNzaWduKHBhbiwgeyB2cCwgcG9pbnRlcklkOiBldmVudC5wb2ludGVySWQsIHg6IGV2ZW50LmNsaWVudFgsIHk6IGV2ZW50LmNsaWVudFksIGxlZnQ6IHZwLnNjcm9sbExlZnQsIHRvcDogdnAuc2Nyb2xsVG9wLCBtb3ZlZDogZmFsc2UgfSk7XG4gICAgdnAuc2V0UG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKTtcbiAgICB2cC5jbGFzc0xpc3QuYWRkKCdpcy1wYW5uaW5nJyk7XG4gIH0pO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdwb2ludGVybW92ZScsIGV2ZW50ID0+IHtcbiAgICBpZiAoIXBhbi52cCB8fCBldmVudC5wb2ludGVySWQgIT09IHBhbi5wb2ludGVySWQpIHJldHVybjtcbiAgICBjb25zdCBkeCA9IGV2ZW50LmNsaWVudFggLSBwYW4ueDtcbiAgICBjb25zdCBkeSA9IGV2ZW50LmNsaWVudFkgLSBwYW4ueTtcbiAgICBpZiAoTWF0aC5oeXBvdChkeCwgZHkpID4gUEFOX0NMSUNLX1RPTEVSQU5DRV9QWCkgcGFuLm1vdmVkID0gdHJ1ZTtcbiAgICBwYW4udnAuc2Nyb2xsTGVmdCA9IHBhbi5sZWZ0IC0gZHg7XG4gICAgcGFuLnZwLnNjcm9sbFRvcCA9IHBhbi50b3AgLSBkeTtcbiAgfSk7XG4gIGNvbnN0IGVuZFBhbiA9IGV2ZW50ID0+IHtcbiAgICBpZiAoIXBhbi52cCB8fCBldmVudC5wb2ludGVySWQgIT09IHBhbi5wb2ludGVySWQpIHJldHVybjtcbiAgICBwYW4udnAuY2xhc3NMaXN0LnJlbW92ZSgnaXMtcGFubmluZycpO1xuICAgIGlmIChwYW4udnAuaGFzUG9pbnRlckNhcHR1cmUoZXZlbnQucG9pbnRlcklkKSkgcGFuLnZwLnJlbGVhc2VQb2ludGVyQ2FwdHVyZShldmVudC5wb2ludGVySWQpO1xuICAgIC8vIOODieODqeODg+OCsOOBruW+jOOBruOCr+ODquODg+OCr+OBp+OAgeWbs+OBruS4reOBruODquODs+OCr++8iE1lcm1haWQg44GuIGNsaWNr77yJ44Gq44Gp44GM5YuV44GL44Gq44GE44KI44GG44Gr44GZ44KLXG4gICAgLy8g44Kv44Oq44OD44Kv44GM55m655Sf44GX44Gq44GL44Gj44Gf44Go44GN44Gr44CB5qyh44Gu5pys54mp44Gu44Kv44Oq44OD44Kv44KS5q2i44KB44Gq44GE44KI44GG44CB55u05b6M44Gu44K/44K544Kv44Gn5aSW44GZXG4gICAgaWYgKHBhbi5tb3ZlZCkge1xuICAgICAgY29uc3Qgc3dhbGxvdyA9IGUgPT4geyBlLnN0b3BQcm9wYWdhdGlvbigpOyBlLnByZXZlbnREZWZhdWx0KCk7IH07XG4gICAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzd2FsbG93LCB7IGNhcHR1cmU6IHRydWUsIG9uY2U6IHRydWUgfSk7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdjbGljaycsIHN3YWxsb3csIHsgY2FwdHVyZTogdHJ1ZSB9KSwgMCk7XG4gICAgfVxuICAgIHBhbi52cCA9IG51bGw7XG4gICAgcGFuLnBvaW50ZXJJZCA9IG51bGw7XG4gIH07XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJ1cCcsIGVuZFBhbik7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3BvaW50ZXJjYW5jZWwnLCBlbmRQYW4pO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44Oi44O844OJ5YiH5pu/44Go44K544K/44Kk44Or5YiH5pu/77yI5YWx6YCa6Zai5pWw77yJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8g44Oi44O844OJ44Gu5YiH5pu/44Oc44K/44Oz44Gu6YG45oqe54q25oWL44Go44CB44K544K/44Kk44Or44OQ44O844Gu6KGo56S644KS5o+D44GI44KL44CCXG4vLyDjgrnjgr/jgqTjg6vjg5Djg7zjga8gVmlzdWFs44Oi44O844OJ44Gu6YWN6Imy44O76KOF6aO+44Gr44GX44GL5Yq544GL44Gq44GE44Gf44KB44CBVmlzdWFs44Oi44O844OJ44Gu44Go44GN44Gg44GR6KGo56S644GZ44KL77yIREQtRElBRy0wNjPvvIlcbmZ1bmN0aW9uIHN5bmNTdGFnZU1vZGVVaShpc1Zpc3VhbCkge1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLW1vZGUtZmFzdCcpPy5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnLCAhaXNWaXN1YWwpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXZpc3VhbC1tb2RlJyk/LmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScsIGlzVmlzdWFsKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3N0eWxlLWJhcicpPy5jbGFzc0xpc3QudG9nZ2xlKCdpcy1oaWRkZW4nLCAhaXNWaXN1YWwpO1xufVxuXG5mdW5jdGlvbiBzZXRTdGFnZU1vZGUoaXNWaXN1YWwpIHtcbiAgaWYgKHN0YXRlLmlzVmlzdWFsTW9kZSA9PT0gaXNWaXN1YWwpIHJldHVybjtcbiAgc3RhdGUuaXNWaXN1YWxNb2RlID0gaXNWaXN1YWw7XG4gIHN5bmNTdGFnZU1vZGVVaShpc1Zpc3VhbCk7XG4gIGlmIChpc1Zpc3VhbCkge1xuICAgIHNob3dUb2FzdCgn8J+OqCBWaXN1YWzjg6Ljg7zjg4njgpLotbfli5UnKTtcbiAgfSBlbHNlIHtcbiAgICBzaG93VG9hc3QoJ+mrmOmAn+ODouODvOODieOBq+aIu+OCiuOBvuOBl+OBnycpO1xuICB9XG4gIHJlbmRlckFwcCgpO1xufVxuXG5mdW5jdGlvbiBzZWxlY3RJbmZvZ3JhcGhpY1N0eWxlKHN0eWxlKSB7XG4gIHN0YXRlLmluZm9ncmFwaGljU3R5bGUgPSBzdHlsZTtcbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmluZm8tc3R5bGUtYnRuJykuZm9yRWFjaChiID0+IHtcbiAgICBiLmNsYXNzTGlzdC50b2dnbGUoJ2lzLWFjdGl2ZScsIGIuZ2V0QXR0cmlidXRlKCdkYXRhLWluZm8tc3R5bGUnKSA9PT0gc3R5bGUpO1xuICB9KTtcbiAgLy8g44K544K/44Kk44Or44OQ44O844GvIFZpc3VhbOODouODvOODieOBruOBqOOBjeOBoOOBkeihqOekuuOBmeOCi+OAgumrmOmAn+ODouODvOODieOBi+OCiemBuOOBueOCi+OBruOBr+OCreODvOODnOODvOODieOBriAx44CcNCDjgaDjgZHjgafjgIFcbiAgLy8g44Gd44Gu5aC05ZCI44GvIFZpc3VhbOODouODvOODieOBq+WIh+OCiuabv+OBiOOBpumBqeeUqOOBmeOCi++8iEZSLTAyNe+8iVxuICBpZiAoIXN0YXRlLmlzVmlzdWFsTW9kZSkge1xuICAgIHN0YXRlLmlzVmlzdWFsTW9kZSA9IHRydWU7XG4gICAgc3luY1N0YWdlTW9kZVVpKHRydWUpO1xuICB9XG4gIHJlbmRlckFwcCgpO1xuICBjb25zdCBhY3RpdmVCdG4gPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGAuaW5mby1zdHlsZS1idG5bZGF0YS1pbmZvLXN0eWxlPVwiJHtzdHlsZX1cIl1gKTtcbiAgc2hvd1RvYXN0KGDjgrnjgr/jgqTjg6vpgannlKg6ICR7YWN0aXZlQnRuID8gYWN0aXZlQnRuLnRleHRDb250ZW50LnRyaW0oKSA6IHN0eWxlfWApO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44Kt44O844Oc44O844OJ44K344On44O844OI44Kr44OD44OI44Go44OK44OT44Ky44O844K344On44Oz77yIRlItMDI1LCBERC1LRVktMDAx44CcMDA077yJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuZnVuY3Rpb24gaXNFZGl0YWJsZUVsZW1lbnQoZWwpIHtcbiAgaWYgKCFlbCkgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB0YWcgPSBlbC50YWdOYW1lO1xuICByZXR1cm4gdGFnID09PSAnVEVYVEFSRUEnIHx8IHRhZyA9PT0gJ0lOUFVUJyB8fCB0YWcgPT09ICdTRUxFQ1QnIHx8IGVsLmlzQ29udGVudEVkaXRhYmxlO1xufVxuXG5mdW5jdGlvbiBjbG9zZVNob3J0Y3V0TW9kYWwoKSB7XG4gIHNldE1vZGFsT3Blbignc2hvcnRjdXQtbW9kYWwnLCBmYWxzZSk7XG59XG5cbmZ1bmN0aW9uIHRvZ2dsZVNob3J0Y3V0TW9kYWwoKSB7XG4gIHNldE1vZGFsT3Blbignc2hvcnRjdXQtbW9kYWwnLCAhaXNNb2RhbE9wZW4oJ3Nob3J0Y3V0LW1vZGFsJykpO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44OX44Os44OT44Ol44O844Gu44K544Kv44Ot44O844Or77yISi9LIOOBrueroOenu+WLlSBGUi0wMjXjgIHnt6jpm4bkvY3nva7jgbjjga7ov73lvpMgRlItMDM3IOOBp+WFsemAmu+8iVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmNvbnN0IFBSRVZJRVdfU0NST0xMX01BUkdJTiA9IDE2O1xuXG5mdW5jdGlvbiBzY3JvbGxCZWhhdmlvcigpIHtcbiAgcmV0dXJuIHdpbmRvdy5tYXRjaE1lZGlhICYmIHdpbmRvdy5tYXRjaE1lZGlhKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpLm1hdGNoZXMgPyAnYXV0bycgOiAnc21vb3RoJztcbn1cblxuLy8g6KaB57Sg44Gu5LiK56uv44KS44CB44OX44Os44OT44Ol44O844Gu6KGo56S65p6g44Gu5LiK56uv44GL44KJIFBSRVZJRVdfU0NST0xMX01BUkdJTiDjgaDjgZHkuIvjgavnva7jgY/jgajjgY3jga4gc2Nyb2xsVG9wXG5mdW5jdGlvbiBwcmV2aWV3U2Nyb2xsVG9wT2YoZWwsIHNjcm9sbGVyLCBzY3JvbGxlclJlY3QgPSBzY3JvbGxlci5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKSkge1xuICByZXR1cm4gTWF0aC5tYXgoMCwgTWF0aC5yb3VuZChlbC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS50b3AgLSBzY3JvbGxlclJlY3QudG9wICsgc2Nyb2xsZXIuc2Nyb2xsVG9wIC0gUFJFVklFV19TQ1JPTExfTUFSR0lOKSk7XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICBTcGxpdCDooajnpLrjga7nt6jpm4bkvY3nva7jgbjjga7ov73lvpPvvIhGUi0wMzcsIERELURJQUctMDYw44CcMDYy77yJXG4gICA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PSAqL1xuLy8g5pyA5b6M44Gr6YCB44Gj44Gf6KaL5Ye644GX44Gu6KGM77yIJ3RvcCcg44Gv44OX44Os44OT44Ol44O844Gu5YWI6aCt77yJ44CC5ZCM44GY5Yy66ZaT44Gu5Lit44Gn44Gv6YCB44KK55u044GV44Gq44GEXG5sZXQgZm9sbG93ZWRLZXkgPSBudWxsO1xubGV0IGZvbGxvd0ZyYW1lID0gMDtcblxuLy8gdGV4dCDjga7lhYjpoK3jgYvjgokgZW5kIOOBvuOBp+OBq+OBguOCi+aUueihjOOBruaVsO+8iD0gZW5kIOOBruS9jee9ruOBriAwIOWni+OBvuOCiuOBruihjOeVquWPt++8iVxuZnVuY3Rpb24gY291bnRMaW5lc0JlZm9yZSh0ZXh0LCBlbmQpIHtcbiAgbGV0IGNvdW50ID0gMDtcbiAgZm9yIChsZXQgaSA9IHRleHQuaW5kZXhPZignXFxuJyk7IGkgIT09IC0xICYmIGkgPCBlbmQ7IGkgPSB0ZXh0LmluZGV4T2YoJ1xcbicsIGkgKyAxKSkgY291bnQrKztcbiAgcmV0dXJuIGNvdW50O1xufVxuXG4vLyDjgqvjg7zjgr3jg6vjga7ooYzku6XliY3jgafmnIDlvozjga7opovlh7rjgZfvvIhkYXRhLXNyYy1saW5lIOOBr+aWh+abuOOBrumghuOBq+S4puOBtu+8ieOAguOBquOBkeOCjOOBsCBudWxsXG5mdW5jdGlvbiBmaW5kRm9sbG93VGFyZ2V0KGNvbnRhaW5lciwgY2FyZXRMaW5lKSB7XG4gIGxldCB0YXJnZXQgPSBudWxsO1xuICBmb3IgKGNvbnN0IGVsIG9mIGNvbnRhaW5lci5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zcmMtbGluZV0nKSkge1xuICAgIGlmIChOdW1iZXIoZWwuZGF0YXNldC5zcmNMaW5lKSA+IGNhcmV0TGluZSkgYnJlYWs7XG4gICAgdGFyZ2V0ID0gZWw7XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn1cblxuZnVuY3Rpb24gZm9sbG93RWRpdG9yQ2FyZXQoKSB7XG4gIGZvbGxvd0ZyYW1lID0gMDtcbiAgaWYgKHN0YXRlLnZpZXdNb2RlICE9PSAnc3BsaXQnIHx8IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5jbGFzc0xpc3QuY29udGFpbnMoJ2lzLXN0YWdlLXNob3cnKSkgcmV0dXJuO1xuICBjb25zdCBlZGl0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFya2Rvd24tZWRpdG9yJyk7XG4gIGNvbnN0IHNjcm9sbGVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXZpZXctc2Nyb2xsJyk7XG4gIGNvbnN0IGNvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHN0YXRlLmlzVmlzdWFsTW9kZSA/ICd2aXN1YWwtc3RhZ2UtY29udGFpbmVyJyA6ICdzdGFuZGFyZC1kb2MtY29udGFpbmVyJyk7XG4gIGNvbnN0IHRhcmdldCA9IGZpbmRGb2xsb3dUYXJnZXQoY29udGFpbmVyLCBjb3VudExpbmVzQmVmb3JlKGVkaXRvci52YWx1ZSwgZWRpdG9yLnNlbGVjdGlvblN0YXJ0KSk7XG4gIC8vIFZpc3VhbOODouODvOODieOBr+eroO+8iOOCueODqeODlu+8ieOBruS4iuerr+OBuOmAgeOCi+OAgueroOOBruS4reOBruWwj+imi+WHuuOBl+OBrumWk+OCkuWLleOBhOOBpuOCguOAgeWQjOOBmOeroOOBquOCiemAgeOCiuebtOOBleOBquOBhFxuICBjb25zdCBhbmNob3IgPSB0YXJnZXQgJiYgc3RhdGUuaXNWaXN1YWxNb2RlID8gKHRhcmdldC5jbG9zZXN0KCcuZXhoaWJpdGlvbi1zbGFiJykgfHwgdGFyZ2V0KSA6IHRhcmdldDtcbiAgY29uc3Qga2V5RWwgPSBhbmNob3IgJiYgYW5jaG9yICE9PSB0YXJnZXQgPyAoYW5jaG9yLnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXNyYy1saW5lXScpIHx8IHRhcmdldCkgOiB0YXJnZXQ7XG4gIGNvbnN0IGtleSA9IGtleUVsID8ga2V5RWwuZGF0YXNldC5zcmNMaW5lIDogJ3RvcCc7XG4gIGlmIChrZXkgPT09IGZvbGxvd2VkS2V5KSByZXR1cm47XG4gIGZvbGxvd2VkS2V5ID0ga2V5O1xuICBzY3JvbGxlci5zY3JvbGxUbyh7IHRvcDogYW5jaG9yID8gcHJldmlld1Njcm9sbFRvcE9mKGFuY2hvciwgc2Nyb2xsZXIpIDogMCwgYmVoYXZpb3I6IHNjcm9sbEJlaGF2aW9yKCkgfSk7XG59XG5cbi8vIOOCq+ODvOOCveODq+OBruenu+WLleODu+WFpeWKm+OBruOBn+OBs+OBq+WRvOOBtuOAguOCueOCr+ODreODvOODq+OBr+ihqOekuuabtOaWsCAxIOWbnuOBq+OBvuOBqOOCgeOCi1xuZnVuY3Rpb24gc2NoZWR1bGVGb2xsb3coKSB7XG4gIGlmICghZm9sbG93RnJhbWUpIGZvbGxvd0ZyYW1lID0gcmVxdWVzdEFuaW1hdGlvbkZyYW1lKGZvbGxvd0VkaXRvckNhcmV0KTtcbn1cblxubGV0IGxhc3ROYXZUYXJnZXRUb3AgPSBudWxsO1xubGV0IGxhc3ROYXZUaW1lID0gMDtcblxuZnVuY3Rpb24gc2Nyb2xsU2VjdGlvbihkaXJlY3Rpb24pIHtcbiAgY29uc3Qgc2Nyb2xsZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJldmlldy1zY3JvbGwnKTtcbiAgaWYgKCFzY3JvbGxlcikgcmV0dXJuO1xuICBjb25zdCBzZWxlY3RvciA9IHN0YXRlLmlzVmlzdWFsTW9kZVxuICAgID8gJyN2aXN1YWwtc3RhZ2UtY29udGFpbmVyIC5leGhpYml0aW9uLXNsYWInXG4gICAgOiAnI3N0YW5kYXJkLWRvYy1jb250YWluZXIgaDInO1xuICBjb25zdCBlbGVtZW50cyA9IEFycmF5LmZyb20oZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbChzZWxlY3RvcikpO1xuICBpZiAoZWxlbWVudHMubGVuZ3RoID09PSAwKSByZXR1cm47XG5cbiAgY29uc3Qgbm93ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gIGNvbnN0IHNjcm9sbGVyUmVjdCA9IHNjcm9sbGVyLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBjb25zdCBtYXhTY3JvbGwgPSBNYXRoLm1heCgwLCBzY3JvbGxlci5zY3JvbGxIZWlnaHQgLSBzY3JvbGxlci5jbGllbnRIZWlnaHQpO1xuICAvLyDjgrnjg6Djg7zjgrrjgrnjgq/jg63jg7zjg6vpgLLooYzkuK3jgavpgKPntprjgacgSiAvIEsg44KS5oq844GX44Gf5aC05ZCI44KC5qyh44Gu56ug44G46YCy44KB44KL44KI44GG44CB55u06L+R44Gu55uu5qiZ5L2N572u44KS5byV44GN57aZ44GQXG4gIGNvbnN0IGN1cnJlbnRUb3AgPSAobGFzdE5hdlRhcmdldFRvcCAhPT0gbnVsbCAmJiBub3cgLSBsYXN0TmF2VGltZSA8IDUwMClcbiAgICA/IGxhc3ROYXZUYXJnZXRUb3BcbiAgICA6IHNjcm9sbGVyLnNjcm9sbFRvcDtcblxuICBjb25zdCBwb3NpdGlvbnMgPSBlbGVtZW50cy5tYXAoZWwgPT4gcHJldmlld1Njcm9sbFRvcE9mKGVsLCBzY3JvbGxlciwgc2Nyb2xsZXJSZWN0KSk7XG5cbiAgbGV0IG5leHRUb3AgPSBudWxsO1xuICBpZiAoZGlyZWN0aW9uID4gMCkge1xuICAgIGlmIChjdXJyZW50VG9wID49IG1heFNjcm9sbCAtIDIpIHJldHVybjtcbiAgICAvLyDlhYjpoK3ku5jov5HvvIhzY3JvbGxUb3AgPD0gMTbvvInjgafmnIDliJ3jga7nq6DjgYznlLvpnaLkuIrnq6/ku5jov5HvvIg8PSA2NHB477yJ44Gr44GC44KL5aC05ZCI44Gv44CB44GZ44Gn44GrMeeroOebruOCkuihqOekuuS4reOBqOOBv+OBquOBl+OBpjLnq6Dnm67jgbjpgLLjgoBcbiAgICBuZXh0VG9wID0gcG9zaXRpb25zLmZpbmQoKHBvcywgaWR4KSA9PlxuICAgICAgcG9zID4gY3VycmVudFRvcCArIDggJiYgIShpZHggPT09IDAgJiYgY3VycmVudFRvcCA8PSAxNiAmJiBwb3MgPD0gNjQgJiYgcG9zaXRpb25zLmxlbmd0aCA+IDEpXG4gICAgKTtcbiAgICBpZiAobmV4dFRvcCAhPT0gdW5kZWZpbmVkICYmIG5leHRUb3AgIT09IG51bGwpIHtcbiAgICAgIG5leHRUb3AgPSBNYXRoLm1pbihtYXhTY3JvbGwsIG5leHRUb3ApO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBmb3IgKGxldCBpID0gcG9zaXRpb25zLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICBpZiAocG9zaXRpb25zW2ldIDwgY3VycmVudFRvcCAtIDgpIHtcbiAgICAgICAgbmV4dFRvcCA9IHBvc2l0aW9uc1tpXTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIC8vIOacgOWIneOBrueroOOCiOOCiuS4iuOBq+ihqOe0me+8iOODkuODvOODreODvOOChCBoMe+8ieOBjOOBguOCi+WgtOWQiOOBr+acgOS4iumDqO+8iDDvvInjgbjmiLvjgotcbiAgICBpZiAobmV4dFRvcCA9PT0gbnVsbCAmJiBjdXJyZW50VG9wID4gMCkge1xuICAgICAgbmV4dFRvcCA9IDA7XG4gICAgfVxuICB9XG5cbiAgaWYgKG5leHRUb3AgIT09IG51bGwgJiYgbmV4dFRvcCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGFzdE5hdlRhcmdldFRvcCA9IG5leHRUb3A7XG4gICAgbGFzdE5hdlRpbWUgPSBub3c7XG4gICAgc2Nyb2xsZXIuc2Nyb2xsVG8oeyB0b3A6IG5leHRUb3AsIGJlaGF2aW9yOiBzY3JvbGxCZWhhdmlvcigpIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldHVwS2V5Ym9hcmRTaG9ydGN1dHMoKSB7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdzaG9ydGN1dC1jbG9zZS1idG4nKT8uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBjbG9zZVNob3J0Y3V0TW9kYWwpO1xuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2tleWRvd24nLCBldmVudCA9PiB7XG4gICAgaWYgKGV2ZW50LmN0cmxLZXkgfHwgZXZlbnQubWV0YUtleSB8fCBldmVudC5hbHRLZXkgfHwgZXZlbnQuaXNDb21wb3NpbmcpIHJldHVybjtcbiAgICAvLyDjgrnjg4bjg7zjgrjnmbrooajkuK3vvIhpcy1zdGFnZS1zaG9377yJ44GvIHN0YWdlLmpzIOOBruODj+ODs+ODieODqeOBjOWHpueQhuOBmeOCi+OBn+OCgeOCueOCreODg+ODl1xuICAgIGlmIChkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuY2xhc3NMaXN0LmNvbnRhaW5zKCdpcy1zdGFnZS1zaG93JykpIHJldHVybjtcblxuICAgIC8vIOOCt+ODp+ODvOODiOOCq+ODg+ODiOODmOODq+ODl+ODouODvOODgOODq+OBvuOBn+OBr+OCuuODvOODoOODouODvOODgOODq+OBjOmWi+OBhOOBpuOBhOOCi+WgtOWQiOOBriBFc2NhcGUg5Yem55CGXG4gICAgaWYgKGV2ZW50LmtleSA9PT0gJ0VzY2FwZScpIHtcbiAgICAgIGlmIChpc01vZGFsT3Blbignc2hvcnRjdXQtbW9kYWwnKSkge1xuICAgICAgICBjbG9zZVNob3J0Y3V0TW9kYWwoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGlzTW9kYWxPcGVuKCd6b29tLW1vZGFsJykpIHtcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tY2xvc2UtYnRuJyk/LmNsaWNrKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDjgqjjg4fjgqPjgr/jgoTlhaXlipvmrITjgavjg5Xjgqnjg7zjgqvjgrnjgYzjgYLjgovjgajjgY3jga/mloflrZflhaXlipvjgpLlhKrlhYjjgZfjgrfjg6fjg7zjg4jjgqvjg4Pjg4jjgpLotbfli5XjgZfjgarjgYTvvIhERC1LRVktMDAx77yJXG4gICAgaWYgKGlzRWRpdGFibGVFbGVtZW50KGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQpKSByZXR1cm47XG5cbiAgICAvLyBdIC8gWyDjga/jgq3jg7zjg5zjg7zjg4njga7lt6blj7Pjga7kuKbjgbPvvIjlj7PjgYzmrKHjgIHlt6bjgYzliY3vvInjgafnq6DjgpLnp7vjgovvvIhGUi0wMjUsIERELUtFWS0wMDLvvIlcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnaicgfHwgZXZlbnQua2V5ID09PSAnSicgfHwgZXZlbnQua2V5ID09PSAnXScpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBzY3JvbGxTZWN0aW9uKDEpO1xuICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5ID09PSAnaycgfHwgZXZlbnQua2V5ID09PSAnSycgfHwgZXZlbnQua2V5ID09PSAnWycpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICBzY3JvbGxTZWN0aW9uKC0xKTtcbiAgICB9IGVsc2UgaWYgKGV2ZW50LmtleSA9PT0gJ20nIHx8IGV2ZW50LmtleSA9PT0gJ00nKSB7XG4gICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgc2V0U3RhZ2VNb2RlKCFzdGF0ZS5pc1Zpc3VhbE1vZGUpO1xuICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5ID49ICcxJyAmJiBldmVudC5rZXkgPD0gJzQnKSB7XG4gICAgICBjb25zdCB0YXJnZXRTdHlsZSA9IFZJU1VBTF9TVFlMRV9LRVlTW3BhcnNlSW50KGV2ZW50LmtleSwgMTApIC0gMV07XG4gICAgICBpZiAodGFyZ2V0U3R5bGUpIHtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgc2VsZWN0SW5mb2dyYXBoaWNTdHlsZSh0YXJnZXRTdHlsZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChldmVudC5rZXkgPT09ICdwJyB8fCBldmVudC5rZXkgPT09ICdQJykge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tc3RhZ2Utc2hvdycpPy5jbGljaygpO1xuICAgIH0gZWxzZSBpZiAoZXZlbnQua2V5ID09PSAnPycpIHtcbiAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICB0b2dnbGVTaG9ydGN1dE1vZGFsKCk7XG4gICAgfVxuICB9KTtcbn1cblxuLyogPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbiAgIOOCpOODmeODs+ODiOODj+ODs+ODieODqeODvOe1kOe3mlxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbmZ1bmN0aW9uIHNldHVwRXZlbnRMaXN0ZW5lcnMoKSB7XG4gIGNvbnN0IGVkaXRvciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXJrZG93bi1lZGl0b3InKTtcbiAgZWRpdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2lucHV0JywgKCkgPT4ge1xuICAgIGNsZWFyVGltZW91dChyZW5kZXJEZWJvdW5jZVRpbWVyKTtcbiAgICByZW5kZXJEZWJvdW5jZVRpbWVyID0gc2V0VGltZW91dChyZW5kZXJBcHAsIDI1MCk7XG4gICAgc2NoZWR1bGVGb2xsb3coKTtcbiAgfSk7XG4gIC8vIOOCq+ODvOOCveODq+OBruenu+WLle+8iOOCr+ODquODg+OCr+ODu+OCreODvOaTjeS9nO+8ieOBp+OAgeOCq+ODvOOCveODq+OBruOBguOCi+imi+WHuuOBl+OBruWMuumWk+OBuOODl+ODrOODk+ODpeODvOOCkumAgeOCi++8iEZSLTAzN++8ieOAglxuICAvLyDjgqjjg4fjgqPjgr/jga7jgrnjgq/jg63jg7zjg6vjgaDjgZHjgafjga/pgIHjgonjgarjgYRcbiAgZWRpdG9yLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgc2NoZWR1bGVGb2xsb3cpO1xuICBlZGl0b3IuYWRkRXZlbnRMaXN0ZW5lcigna2V5dXAnLCBzY2hlZHVsZUZvbGxvdyk7XG5cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnZpZXctbW9kZS1idG4nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBtb2RlID0gYnRuLmdldEF0dHJpYnV0ZSgnZGF0YS12aWV3LW1vZGUnKTtcbiAgICAgIHN0YXRlLnZpZXdNb2RlID0gbW9kZTtcbiAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy52aWV3LW1vZGUtYnRuJykuZm9yRWFjaChiID0+IGIuY2xhc3NMaXN0LnJlbW92ZSgnaXMtYWN0aXZlJykpO1xuICAgICAgYnRuLmNsYXNzTGlzdC5hZGQoJ2lzLWFjdGl2ZScpO1xuXG4gICAgICBjb25zdCBwYW5lRWRpdG9yID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3BhbmUtZWRpdG9yJyk7XG4gICAgICBjb25zdCBwYW5lUHJldmlldyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwYW5lLXByZXZpZXcnKTtcblxuICAgICAgaWYgKG1vZGUgPT09ICdzcGxpdCcpIHtcbiAgICAgICAgcGFuZUVkaXRvci5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgICAgcGFuZVByZXZpZXcuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIHBhbmVFZGl0b3IuY2xhc3NOYW1lID0gJ3ctZnVsbCBsZzp3LVs0MCVdIGgtWzQyJV0gbGc6aC1mdWxsIGZsZXggZmxleC1jb2wgYm9yZGVyLWIgbGc6Ym9yZGVyLWItMCBsZzpib3JkZXItciBzaHJpbmstMCB6LTEwJztcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2NhbnZhcycpIHtcbiAgICAgICAgcGFuZUVkaXRvci5jbGFzc0xpc3QuYWRkKCdoaWRkZW4nKTtcbiAgICAgICAgcGFuZVByZXZpZXcuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09ICdlZGl0b3InKSB7XG4gICAgICAgIHBhbmVFZGl0b3IuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gICAgICAgIHBhbmVQcmV2aWV3LmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgICAgICBwYW5lRWRpdG9yLmNsYXNzTmFtZSA9ICd3LWZ1bGwgaC1mdWxsIGZsZXggZmxleC1jb2wgc2hyaW5rLTAgei0xMCc7XG4gICAgICB9XG4gICAgICBpZiAoc3RhdGUuaXNWaXN1YWxNb2RlICYmIG1vZGUgIT09ICdlZGl0b3InKSB7XG4gICAgICAgIHVwZGF0ZUFsbFNsYWJTcGxpdHMoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3Zpc3VhbC1zdGFnZS1jb250YWluZXInKSk7XG4gICAgICB9XG4gICAgfTtcbiAgfSk7XG5cbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsICgpID0+IHtcbiAgICBpZiAoc3RhdGUuaXNWaXN1YWxNb2RlKSB7XG4gICAgICB1cGRhdGVBbGxTbGFiU3BsaXRzKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd2aXN1YWwtc3RhZ2UtY29udGFpbmVyJykpO1xuICAgIH1cbiAgfSk7XG5cbiAgY29uc3QgYnRuRmFzdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tbW9kZS1mYXN0Jyk7XG4gIGNvbnN0IGJ0blZpc3VhbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdmlzdWFsLW1vZGUnKTtcblxuICBpZiAoYnRuRmFzdCkge1xuICAgIGJ0bkZhc3Qub25jbGljayA9ICgpID0+IHNldFN0YWdlTW9kZShmYWxzZSk7XG4gIH1cbiAgaWYgKGJ0blZpc3VhbCkge1xuICAgIGJ0blZpc3VhbC5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgc2V0U3RhZ2VNb2RlKCFzdGF0ZS5pc1Zpc3VhbE1vZGUpO1xuICAgIH07XG4gIH1cblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXN0YWdlLXNob3cnKS5vbmNsaWNrID0gYXN5bmMgKCkgPT4ge1xuICAgIGlmIChhd2FpdCBsb2FkTGlicmFyeSgnc3RhZ2UnKSkgTHVjaXZvU3RhZ2UuZW50ZXJTaG93KCk7XG4gIH07XG5cbiAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLmluZm8tc3R5bGUtYnRuJykuZm9yRWFjaChidG4gPT4ge1xuICAgIGJ0bi5vbmNsaWNrID0gKCkgPT4ge1xuICAgICAgY29uc3Qgc3R5bGUgPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLWluZm8tc3R5bGUnKTtcbiAgICAgIHNlbGVjdEluZm9ncmFwaGljU3R5bGUoc3R5bGUpO1xuICAgIH07XG4gIH0pO1xuXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoJy5wYWxldHRlLW9wdGlvbi1idG4nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBwYWwgPSBidG4uZ2V0QXR0cmlidXRlKCdkYXRhLXBhbGV0dGUtc2V0Jyk7XG4gICAgICBzdGF0ZS5wYWxldHRlID0gcGFsO1xuICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBhbGV0dGUtb3B0aW9uLWJ0bicpLmZvckVhY2goYiA9PiB7XG4gICAgICAgIGIuY2xhc3NMaXN0LnRvZ2dsZSgnaXMtYWN0aXZlJywgYi5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGFsZXR0ZS1zZXQnKSA9PT0gcGFsKTtcbiAgICAgIH0pO1xuICAgICAgY29uc3QgYWN0aXZlTGFiZWwgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYWN0aXZlLXBhbGV0dGUtbmFtZScpO1xuICAgICAgaWYgKGFjdGl2ZUxhYmVsKSBhY3RpdmVMYWJlbC50ZXh0Q29udGVudCA9IHBhbC5jaGFyQXQoMCkudG9VcHBlckNhc2UoKSArIHBhbC5zbGljZSgxKTtcbiAgICAgIHNldHVwTWVybWFpZCgpO1xuICAgICAgcmVuZGVyQXBwKCk7XG4gICAgICBzaG93VG9hc3QoYOODhuODvOODnuiJsjogJHtwYWwudG9VcHBlckNhc2UoKX1gKTtcbiAgICB9O1xuICB9KTtcblxuICBjb25zdCBidG5UaGVtZSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdGhlbWUtdG9nZ2xlJyk7XG4gIGNvbnN0IGljb25TdW4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaWNvbi1zdW4nKTtcbiAgY29uc3QgaWNvbk1vb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnaWNvbi1tb29uJyk7XG4gIGNvbnN0IGFwcEZhdmljb24gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYXBwLWZhdmljb24nKTtcbiAgYnRuVGhlbWUub25jbGljayA9ICgpID0+IHtcbiAgICBzdGF0ZS5hcHBlYXJhbmNlID0gc3RhdGUuYXBwZWFyYW5jZSA9PT0gJ2xpZ2h0JyA/ICdkYXJrJyA6ICdsaWdodCc7XG4gICAgZG9jdW1lbnQuYm9keS5zZXRBdHRyaWJ1dGUoJ2RhdGEtYXBwZWFyYW5jZScsIHN0YXRlLmFwcGVhcmFuY2UpO1xuICAgIGlmIChhcHBGYXZpY29uKSB7XG4gICAgICBhcHBGYXZpY29uLnNldEF0dHJpYnV0ZSgnaHJlZicsIGAuL2Fzc2V0cy9sb2dvcy8ke3N0YXRlLmFwcGVhcmFuY2V9L2Zhdmljb24uc3ZnYCk7XG4gICAgfVxuICAgIGlmIChzdGF0ZS5hcHBlYXJhbmNlID09PSAnZGFyaycpIHtcbiAgICAgIGljb25TdW4uY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgICBpY29uTW9vbi5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWNvblN1bi5jbGFzc0xpc3QucmVtb3ZlKCdoaWRkZW4nKTtcbiAgICAgIGljb25Nb29uLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgIH1cbiAgICBzZXR1cE1lcm1haWQoKTtcbiAgICByZW5kZXJBcHAoKTtcbiAgfTtcblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLW9wZW4tc2V0dGluZ3MnKS5vbmNsaWNrID0gKCkgPT4gc2V0TW9kYWxPcGVuKCdzZXR0aW5ncy1tb2RhbCcsIHRydWUpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWNsb3NlLXNldHRpbmdzJykub25jbGljayA9ICgpID0+IHNldE1vZGFsT3Blbignc2V0dGluZ3MtbW9kYWwnLCBmYWxzZSk7XG5cbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3pvb20tY2xvc2UtYnRuJykub25jbGljayA9ICgpID0+IHtcbiAgICBzZXRNb2RhbE9wZW4oJ3pvb20tbW9kYWwnLCBmYWxzZSk7XG4gICAgLy8g6ZaJ44GY44Gf5b6M44Gr6KSH6KO944GX44GfIFNWRyDjgpLmrovjgZXjgarjgYRcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnem9vbS1jYW52YXMnKS5pbm5lckhUTUwgPSAnJztcbiAgfTtcblxuICAvLyBIVE1MIOOBruabuOOBjeWHuuOBl++8iEZSLTAwNe+8ieOBr+OAgeabuOOBjeWHuuOBl+OBn+ODleOCoeOCpOODq+OBjOaMgeOBoeWHuuOBl+WFiOOBp+W0qeOCjOOCi+OBn+OCgSAwLjIuMCDjgafjga/jg5zjgr/jg7PjgpLnva7jgYvjgarjgYTvvIhERC1PRkYtMDA144CBQ1ItMDAx77yJ44CCXG4gIC8vIOWHpueQhuOBryBDUi0wMDEg44Gn5L2c44KK55u044GZ44G+44Gn5q6L44GX44CB44Oc44K/44Oz44GM44GC44KL44Go44GN44Gg44GR44Gk44Gq44GQXG4gIGNvbnN0IGV4cG9ydEh0bWxCdG4gPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWV4cG9ydC1odG1sJyk7XG4gIGlmIChleHBvcnRIdG1sQnRuKSBleHBvcnRIdG1sQnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY29uc3QgZnVsbEh0bWwgPSBPYmplY3QuZW50cmllcyhFWFBPUlRfVVJMUykucmVkdWNlKFxuICAgICAgKGh0bWwsIFtsb2NhbCwgdXJsXSkgPT4gaHRtbC5zcGxpdChsb2NhbCkuam9pbih1cmwpLFxuICAgICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50Lm91dGVySFRNTFxuICAgICk7XG4gICAgZG93bmxvYWRCbG9iKGZ1bGxIdG1sLCAnbHVjaXZvLWFyY2hpdGVjdHVyZS1leHBvcnQuaHRtbCcsICd0ZXh0L2h0bWwnKTtcbiAgICBzaG93VG9hc3QoJ+WNmOS4gEhUTUzjg5XjgqHjgqTjg6vjgpLjgqjjgq/jgrnjg53jg7zjg4jjgZfjgb7jgZfjgZ8nKTtcbiAgfTtcblxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXRlc3QtY2FjaGUnKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNvbnN0IHQwID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgcmVuZGVyQXBwKCk7XG4gICAgY29uc3QgZHVyYXRpb24gPSAocGVyZm9ybWFuY2Uubm93KCkgLSB0MCkudG9GaXhlZCgxKTtcbiAgICBzaG93VG9hc3QoYOOCreODo+ODg+OCt+ODpeWGjeaPj+eUuzogJHtkdXJhdGlvbn1tcyAoMG1z55u45b2TKWApO1xuICB9O1xuXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tdGVzdC1lcnInKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGVkaXRvci52YWx1ZSArPSAnXFxuXFxuYGBgbWVybWFpZFxcbmZsb3djaGFydCBURFxcbkJST0tFTl9OT0RFIC0tPlxcbmBgYFxcbic7XG4gICAgcmVuZGVyQXBwKCk7XG4gIH07XG59XG5cbi8qID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4gICDplovjgY/jg7vkv53lrZjjga7jg6Hjg4vjg6Xjg7zvvIhNYXJrZG93biDjg5XjgqHjgqTjg6vjga7oqq3jgb/ovrzjgb/jgajkv53lrZjvvIlcbiAgID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09ICovXG4vLyDjg5jjg4Pjg4Djg7zjga7jg6Hjg4vjg6Xjg7zvvIjplovjgY/jg7vkv53lrZjvvInjgILjg5zjgr/jg7Pjga4gaWQg44Go44Oh44OL44Ol44O844GuIGlkIOOBrue1hO+8iERELUZJTEUtMDAyLCBERC1GSUxFLTAwOe+8iVxuY29uc3QgSEVBREVSX01FTlVTID0gW1snYnRuLWZpbGUtbWVudScsICdmaWxlLW1lbnUnXSwgWydidG4tc2F2ZS1tZW51JywgJ3NhdmUtbWVudSddXTtcblxuZnVuY3Rpb24gY2xvc2VIZWFkZXJNZW51cygpIHtcbiAgSEVBREVSX01FTlVTLmZvckVhY2goKFtidG5JZCwgbWVudUlkXSkgPT4ge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKG1lbnVJZCkuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYnRuSWQpLnNldEF0dHJpYnV0ZSgnYXJpYS1leHBhbmRlZCcsICdmYWxzZScpO1xuICB9KTtcbn1cbi8vIOaXouWtmOOBruWRvOOBs+WHuuOBl++8iOODhuOCueODiOOCkuWQq+OCgO+8ieOBruOBn+OCgeOBruWIpeWQjVxuY29uc3QgY2xvc2VGaWxlTWVudSA9IGNsb3NlSGVhZGVyTWVudXM7XG5cbi8vIOacgOW+jOOBq+iqreOBv+i+vOOCk+OBoO+8iOOBvuOBn+OBr+S/neWtmOOBl+OBn++8ieaZgueCueOBi+OCiee3qOmbhuOBl+OBpuOBhOOCjOOBsOOAgee9ruOBjeaPm+OBiOOCi+WJjeOBq+eiuuiqjeOBmeOCi1xuZnVuY3Rpb24gY29uZmlybURpc2NhcmRFZGl0cyhmaWxlTmFtZSkge1xuICBjb25zdCBlZGl0b3IgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFya2Rvd24tZWRpdG9yJyk7XG4gIGlmIChlZGl0b3IudmFsdWUgPT09IGxhc3RMb2FkZWRNYXJrZG93bikgcmV0dXJuIHRydWU7XG4gIHJldHVybiB3aW5kb3cuY29uZmlybShg57eo6ZuG5Lit44Gu5YaF5a6544Gv5aSx44KP44KM44G+44GZ44CC44CMJHtmaWxlTmFtZX3jgI3jgpLoqq3jgb/ovrzjgb/jgb7jgZnjgYvvvJ9gKTtcbn1cblxuLy8gZm9sZGVyUGF0aDog44OV44Kp44Or44OA44GL44KJ6ZaL44GE44Gf44Go44GN44Gu44CB44OV44Kp44Or44OA44Gu5Lit44Gu44OR44K577yI5L6LOiBkb2NzL2EubWTvvInjgILnm7jlr77jg5Hjgrnjga7nlLvlg4/jga7ln7rmupbjgavjgZnjgovvvIhERC1GSUxFLTA3Ne+8iVxuLy8gaXNTYW1wbGU6IOWQjOaiseOCteODs+ODl+ODq+OBqOOBl+OBpumWi+OBhOOBn+OBqOOBjeOAguebuOWvvuODkeOCueOBrueUu+WDj+OBqOODquODs+OCr+OBryBzYW1wbGVzIOODleOCqeODq+ODgOOCkuWfuua6luOBq+OBmeOCi++8iERELUZJTEUtMDgx77yJXG5mdW5jdGlvbiBhcHBseUxvYWRlZE1hcmtkb3duKHJhd1RleHQsIGZpbGVOYW1lLCBmb2xkZXJQYXRoID0gbnVsbCwgaXNTYW1wbGUgPSBmYWxzZSkge1xuICBjb25zdCB0ZXh0ID0gU3RyaW5nKHJhd1RleHQpLnJlcGxhY2UoL15cXHVGRUZGLywgJycpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWFya2Rvd24tZWRpdG9yJykudmFsdWUgPSB0ZXh0O1xuICBsYXN0TG9hZGVkTWFya2Rvd24gPSB0ZXh0O1xuICBjdXJyZW50RmlsZU5hbWUgPSBmaWxlTmFtZTtcbiAgY3VycmVudEZvbGRlclBhdGggPSBmb2xkZXJQYXRoO1xuICBjdXJyZW50U2FtcGxlRmlsZSA9IGlzU2FtcGxlID8gZmlsZU5hbWUgOiBudWxsO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnc2F2ZS1maWxlLW5hbWUnKS50ZXh0Q29udGVudCA9IGZpbGVOYW1lO1xuICByZW5kZXJGb2xkZXJMaXN0KCk7XG4gIC8vIOWNsOWIt+OBruOAjFBERiDjgajjgZfjgabkv53lrZjjgI3jga/jgIHjgqbjgqPjg7Pjg4njgqbjga7jgr/jgqTjg4jjg6vjgpLml6Llrprjga7jg5XjgqHjgqTjg6vlkI3jgavkvb/jgYbvvIhGUi0wNDAsIERELUZJTEUtMDUw77yJXG4gIGRvY3VtZW50LnRpdGxlID0gYCR7ZmlsZU5hbWV9JHtBUFBfVElUTEVfU1VGRklYfWA7XG4gIHN0YXRlLmN1cnZlQnlJbmRleC5jbGVhcigpO1xuICBzZXRFZGl0b3JSZWFkT25seSh0cnVlKTtcbiAgY2xlYXJUaW1lb3V0KHJlbmRlckRlYm91bmNlVGltZXIpO1xuICByZW5kZXJBcHAoKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ3ByZXZpZXctc2Nyb2xsJykuc2Nyb2xsVG9wID0gMDtcbiAgZm9sbG93ZWRLZXkgPSBudWxsO1xuICBzaG93VG9hc3QoYOOAjCR7ZmlsZU5hbWV944CN44KS6Kqt44G/6L6844G/44G+44GX44GfYCk7XG59XG5cbmZ1bmN0aW9uIGxvYWRNYXJrZG93bkZpbGUoZmlsZSkge1xuICBpZiAoIWNvbmZpcm1EaXNjYXJkRWRpdHMoZmlsZS5uYW1lKSkgcmV0dXJuO1xuICBjb25zdCByZWFkZXIgPSBuZXcgRmlsZVJlYWRlcigpO1xuICByZWFkZXIub25sb2FkID0gKCkgPT4ge1xuICAgIGFwcGx5TG9hZGVkTWFya2Rvd24ocmVhZGVyLnJlc3VsdCwgZmlsZS5uYW1lKTtcbiAgfTtcbiAgcmVhZGVyLm9uZXJyb3IgPSAoKSA9PiB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgZmlsZTonLCByZWFkZXIuZXJyb3IpO1xuICAgIHNob3dUb2FzdChg44CMJHtmaWxlLm5hbWV944CN44KS6Kqt44G/6L6844KB44G+44Gb44KT44Gn44GX44GfYCk7XG4gIH07XG4gIHJlYWRlci5yZWFkQXNUZXh0KGZpbGUsICdVVEYtOCcpO1xufVxuXG4vLyDplovjgY/jg6Hjg4vjg6Xjg7zjgYvjgonlkIzmorHjgrXjg7Pjg5fjg6vjgpLjg6/jg7Pjgq/jg6rjg4Pjgq/jgafoqq3jgb/ovrzjgoDvvIhERC1GSUxFLTAxNe+8iVxuYXN5bmMgZnVuY3Rpb24gbG9hZEJ1bmRsZWRTYW1wbGUoZmlsZU5hbWUpIHtcbiAgaWYgKCFjb25maXJtRGlzY2FyZEVkaXRzKGZpbGVOYW1lKSkgcmV0dXJuIGZhbHNlO1xuICBsZXQgdGV4dCA9IG51bGw7XG4gIGlmICh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgIT09ICdmaWxlOicpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzID0gYXdhaXQgZmV0Y2goYC4vc2FtcGxlcy8ke2VuY29kZVVSSUNvbXBvbmVudChmaWxlTmFtZSl9YCk7XG4gICAgICBpZiAocmVzLm9rKSB0ZXh0ID0gYXdhaXQgcmVzLnRleHQoKTtcbiAgICB9IGNhdGNoIChfKSB7XG4gICAgICAvLyBmZXRjaCDlpLHmlZfmmYLjga8gc2FtcGxlcy1kYXRhLmpzIOOBq+ODleOCqeODvOODq+ODkOODg+OCr+OBmeOCi1xuICAgIH1cbiAgfVxuICBpZiAodGV4dCA9PT0gbnVsbCkge1xuICAgIGlmIChhd2FpdCBsb2FkTGlicmFyeSgnc2FtcGxlcycpICYmIHdpbmRvdy5MVUNJVk9fU0FNUExFUyAmJiB0eXBlb2Ygd2luZG93LkxVQ0lWT19TQU1QTEVTW2ZpbGVOYW1lXSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHRleHQgPSB3aW5kb3cuTFVDSVZPX1NBTVBMRVNbZmlsZU5hbWVdO1xuICAgIH1cbiAgfVxuICBpZiAodGV4dCA9PT0gbnVsbCkge1xuICAgIHNob3dUb2FzdChg44CMJHtmaWxlTmFtZX3jgI3jgpLoqq3jgb/ovrzjgoHjgb7jgZvjgpPjgafjgZfjgZ9gKTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgYXBwbHlMb2FkZWRNYXJrZG93bih0ZXh0LCBmaWxlTmFtZSwgbnVsbCwgdHJ1ZSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyDoqq3jgb/ovrzjgb/nm7Tlvozjga7plrLopqfkuK3jgavoqqTjgaPjgabnt6jpm4bjgZfjgarjgYTjgojjgYbjgIHjgqjjg4fjgqPjgr/jgajjgIHlhoXlrrnjgpLlpInjgYjjgovjg5zjgr/jg7PjgpLjgb7jgajjgoHjgabliIfjgormm7/jgYjjgovvvIhERC1GSUxFLTA0MO+8ieOAglxuLy8g44CM6Zay6KanIHwg57eo6ZuG44CN44Gu5YiH44KK5pu/44GI44Gv44CB44OV44Kh44Kk44Or44KS6Kqt44G/6L6844KT44Gg5b6M44Gv6KGo56S644GX44Gf44G+44G+44Gr44GX44CB5LuK44Gu54q25oWL44Gu44G744GG44KS6YG45oqe5Lit44Gr44GZ44KL77yIREQtRklMRS0wNDHvvIlcbmZ1bmN0aW9uIHNldEVkaXRvclJlYWRPbmx5KGlzUmVhZE9ubHkpIHtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21hcmtkb3duLWVkaXRvcicpLnJlYWRPbmx5ID0gaXNSZWFkT25seTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2VkaXRvci1sb2NrJykuY2xhc3NMaXN0LnJlbW92ZSgnaGlkZGVuJyk7XG4gIGZvciAoY29uc3QgW2lkLCBhY3RpdmVdIG9mIFtbJ2J0bi1lZGl0LWxvY2snLCBpc1JlYWRPbmx5XSwgWydidG4tZWRpdC11bmxvY2snLCAhaXNSZWFkT25seV1dKSB7XG4gICAgY29uc3QgYnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoaWQpO1xuICAgIGJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnLCBhY3RpdmUpO1xuICAgIGJ0bi5zZXRBdHRyaWJ1dGUoJ2FyaWEtcHJlc3NlZCcsIFN0cmluZyhhY3RpdmUpKTtcbiAgfVxuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLXRlc3QtZXJyJykuZGlzYWJsZWQgPSBpc1JlYWRPbmx5O1xufVxuXG4vLyDjgqjjg4fjgqPjgr/jga7lhoXlrrnjgpLjg4Djgqbjg7Pjg63jg7zjg4njgZnjgovjgILlhYPjga7jg5XjgqHjgqTjg6vjga/kuIrmm7jjgY3jgZfjgarjgYTvvIhERC1GSUxFLTAzMO+8iVxuZnVuY3Rpb24gc2F2ZU1hcmtkb3duRmlsZSgpIHtcbiAgY29uc3QgdGV4dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXJrZG93bi1lZGl0b3InKS52YWx1ZTtcbiAgZG93bmxvYWRCbG9iKHRleHQsIGN1cnJlbnRGaWxlTmFtZSwgJ3RleHQvbWFya2Rvd247Y2hhcnNldD11dGYtOCcpO1xuICBsYXN0TG9hZGVkTWFya2Rvd24gPSB0ZXh0O1xuICBzaG93VG9hc3QoYOOAjCR7Y3VycmVudEZpbGVOYW1lfeOAjeOCkuS/neWtmOOBl+OBvuOBl+OBn2ApO1xufVxuXG5mdW5jdGlvbiBzZXR1cEZpbGVNZW51KCkge1xuICBjb25zdCBpbnB1dCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmaWxlLWlucHV0Jyk7XG5cbiAgLy8gMSDjgaTjga7jg6Hjg4vjg6Xjg7zjgpLplovjgY/jgajjgY3jga/jgIHjgoLjgYbkuIDmlrnjgpLplonjgZjjgotcbiAgSEVBREVSX01FTlVTLmZvckVhY2goKFtidG5JZCwgbWVudUlkXSkgPT4ge1xuICAgIGNvbnN0IGJ0biA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKGJ0bklkKTtcbiAgICBjb25zdCBtZW51ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobWVudUlkKTtcbiAgICBidG4ub25jbGljayA9IGV2ZW50ID0+IHtcbiAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuICAgICAgY29uc3Qgd2lsbE9wZW4gPSBtZW51LmNsYXNzTGlzdC5jb250YWlucygnaGlkZGVuJyk7XG4gICAgICBjbG9zZUhlYWRlck1lbnVzKCk7XG4gICAgICBtZW51LmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicsICF3aWxsT3Blbik7XG4gICAgICBidG4uc2V0QXR0cmlidXRlKCdhcmlhLWV4cGFuZGVkJywgU3RyaW5nKHdpbGxPcGVuKSk7XG4gICAgfTtcbiAgfSk7XG4gIGNvbnN0IGZpbGVNZW51ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGUtbWVudScpO1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnbWVudS1vcGVuLW1hcmtkb3duJykub25jbGljayA9ICgpID0+IHtcbiAgICBjbG9zZUhlYWRlck1lbnVzKCk7XG4gICAgaW5wdXQuY2xpY2soKTtcbiAgfTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ21lbnUtb3Blbi1mb2xkZXInKS5vbmNsaWNrID0gKCkgPT4ge1xuICAgIGNsb3NlSGVhZGVyTWVudXMoKTtcbiAgICBvcGVuRm9sZGVyKCk7XG4gIH07XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZW51LW9wZW4tcmVjZW50LWZvbGRlcicpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY2xvc2VIZWFkZXJNZW51cygpO1xuICAgIHJlb3BlblJlY2VudEZvbGRlcigpO1xuICB9O1xuICBmaWxlTWVudS5xdWVyeVNlbGVjdG9yQWxsKCdbZGF0YS1zYW1wbGUtZmlsZV0nKS5mb3JFYWNoKGJ0biA9PiB7XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgICBjb25zdCBmaWxlTmFtZSA9IGJ0bi5nZXRBdHRyaWJ1dGUoJ2RhdGEtc2FtcGxlLWZpbGUnKTtcbiAgICAgIGNsb3NlSGVhZGVyTWVudXMoKTtcbiAgICAgIGlmIChmaWxlTmFtZSkgbG9hZEJ1bmRsZWRTYW1wbGUoZmlsZU5hbWUpO1xuICAgIH07XG4gIH0pO1xuICAvLyDljbDliLfjg7tQREYg44Gu6YWN5biD6LOH5paZ77yIRlItMDM277yJ44CC5Yi344KL5YaF5a6544GvIEBtZWRpYSBwcmludO+8iERELVZUUEwtMTMw44CcMTMy77yJ44Gn5rG644KB44KLXG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZW51LXByaW50Jykub25jbGljayA9ICgpID0+IHtcbiAgICBjbG9zZUhlYWRlck1lbnVzKCk7XG4gICAgd2luZG93LnByaW50KCk7XG4gIH07XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tc2F2ZS1tYXJrZG93bicpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgY2xvc2VIZWFkZXJNZW51cygpO1xuICAgIHNhdmVNYXJrZG93bkZpbGUoKTtcbiAgfTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1lZGl0LXVubG9jaycpLm9uY2xpY2sgPSAoKSA9PiB7XG4gICAgc2V0RWRpdG9yUmVhZE9ubHkoZmFsc2UpO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtYXJrZG93bi1lZGl0b3InKS5mb2N1cygpO1xuICB9O1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnYnRuLWVkaXQtbG9jaycpLm9uY2xpY2sgPSAoKSA9PiBzZXRFZGl0b3JSZWFkT25seSh0cnVlKTtcbiAgaW5wdXQub25jaGFuZ2UgPSAoKSA9PiB7XG4gICAgY29uc3QgZmlsZSA9IGlucHV0LmZpbGVzICYmIGlucHV0LmZpbGVzWzBdO1xuICAgIC8vIOWQjOOBmOODleOCoeOCpOODq+OCkue2muOBkeOBpumBuOOCk+OBp+OCgiBjaGFuZ2Ug44GM55m655Sf44GZ44KL44KI44GG44CB6YG45oqe44KS6Kej6Zmk44GZ44KLXG4gICAgaW5wdXQudmFsdWUgPSAnJztcbiAgICBpZiAoZmlsZSkgbG9hZE1hcmtkb3duRmlsZShmaWxlKTtcbiAgfTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBldmVudCA9PiB7XG4gICAgaWYgKCFIRUFERVJfTUVOVVMuc29tZSgoWywgbWVudUlkXSkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQobWVudUlkKS5jb250YWlucyhldmVudC50YXJnZXQpKSkgY2xvc2VIZWFkZXJNZW51cygpO1xuICB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigna2V5ZG93bicsIGV2ZW50ID0+IHtcbiAgICBpZiAoZXZlbnQua2V5ID09PSAnRXNjYXBlJykgY2xvc2VIZWFkZXJNZW51cygpO1xuICB9KTtcbn1cblxuLy8g44Km44Kj44Oz44OJ44Km44Gu44Gp44GT44Gr44OV44Kh44Kk44Or44KS6JC944Go44GX44Gm44KC6ZaL44GP77yIRlItMDQxLCBERC1GSUxFLTA2MO+8ieOAguODieODqeODg+OCsOS4reOBoOOBkeOAgeWPl+OBkeS7mOOBkeOBruihqOekuu+8iCNkcm9wLW92ZXJsYXnvvInjgpLph43jga3jgotcbmZ1bmN0aW9uIHNldHVwRmlsZURyb3AoKSB7XG4gIGNvbnN0IG92ZXJsYXkgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZHJvcC1vdmVybGF5Jyk7XG4gIC8vIOWtkOimgee0oOOBuOOBruWHuuWFpeOCiuOBp+OCgiBkcmFnZW50ZXIgLyBkcmFnbGVhdmUg44GM6LW344GN44KL44Gf44KB44CB5YWl44Gj44Gf5Zue5pWw44KS5pWw44GI44Gm44CB44Km44Kj44Oz44OJ44Km44Gu5aSW44G45Ye644Gf44Go44GN44Gg44GR5raI44GZXG4gIGxldCBkZXB0aCA9IDA7XG4gIGNvbnN0IGhhc0ZpbGVzID0gZXZlbnQgPT4gQXJyYXkuZnJvbSgoZXZlbnQuZGF0YVRyYW5zZmVyICYmIGV2ZW50LmRhdGFUcmFuc2Zlci50eXBlcykgfHwgW10pLmluY2x1ZGVzKCdGaWxlcycpO1xuICBjb25zdCBzZXRTaG93biA9IHNob3duID0+IHtcbiAgICBvdmVybGF5LmNsYXNzTGlzdC50b2dnbGUoJ2lzLXNob3duJywgc2hvd24pO1xuICAgIG92ZXJsYXkuc2V0QXR0cmlidXRlKCdhcmlhLWhpZGRlbicsIFN0cmluZyghc2hvd24pKTtcbiAgfTtcblxuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ2VudGVyJywgZXZlbnQgPT4ge1xuICAgIGlmICghaGFzRmlsZXMoZXZlbnQpKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBkZXB0aCArPSAxO1xuICAgIHNldFNob3duKHRydWUpO1xuICB9KTtcbiAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdvdmVyJywgZXZlbnQgPT4ge1xuICAgIGlmICghaGFzRmlsZXMoZXZlbnQpKSByZXR1cm47XG4gICAgLy8g5pei5a6a44Gu5YuV5L2c77yI44OW44Op44Km44K244GM44OV44Kh44Kk44Or6Ieq5L2T44KS6ZaL44GP77yJ44KS5q2i44KB44CB44Kz44OU44O844Gu5b2i44Gu44Kr44O844K944Or44Gr44GZ44KLXG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5kYXRhVHJhbnNmZXIuZHJvcEVmZmVjdCA9ICdjb3B5JztcbiAgfSk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcmFnbGVhdmUnLCBldmVudCA9PiB7XG4gICAgaWYgKCFoYXNGaWxlcyhldmVudCkpIHJldHVybjtcbiAgICBkZXB0aCA9IE1hdGgubWF4KDAsIGRlcHRoIC0gMSk7XG4gICAgaWYgKGRlcHRoID09PSAwKSBzZXRTaG93bihmYWxzZSk7XG4gIH0pO1xuICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZHJvcCcsIGV2ZW50ID0+IHtcbiAgICBpZiAoIWhhc0ZpbGVzKGV2ZW50KSkgcmV0dXJuO1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZGVwdGggPSAwO1xuICAgIHNldFNob3duKGZhbHNlKTtcbiAgICBjb25zdCBmaWxlcyA9IEFycmF5LmZyb20oZXZlbnQuZGF0YVRyYW5zZmVyLmZpbGVzIHx8IFtdKTtcbiAgICBjb25zdCBmaWxlID0gZmlsZXMuZmluZChmID0+IERST1BQQUJMRV9GSUxFX1BBVFRFUk4udGVzdChmLm5hbWUpKTtcbiAgICBpZiAoIWZpbGUpIHtcbiAgICAgIHNob3dUb2FzdCgn6ZaL44GR44KL44Gu44GvIC5tZCAvIC5tYXJrZG93biAvIC50eHQg44Gu44OV44Kh44Kk44Or44Gn44GZJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIOikh+aVsOOBruODleOCoeOCpOODq+OCkuiQveOBqOOBl+OBn+OBqOOBjeOBr+OAgemWi+OBkeOCiyAxIOOBpOebruOBoOOBkeOCkumWi+OBj1xuICAgIGxvYWRNYXJrZG93bkZpbGUoZmlsZSk7XG4gIH0pO1xufVxuXG4vKiA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuICAg44OV44Kp44Or44OA44KS6ZaL44GP77yIRlItMDQz44CcMDQ1LCBERC1GSUxFLTA3MOOAnDA3OO+8iVxuICAgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT0gKi9cbi8vIOS4gOimp+OBq+i8ieOBm+OCi+ODleOCoeOCpOODq+OBruaVsOOBqOOAgeOBn+OBqeOCi+ODleOCqeODq+ODgOOBrua3seOBleOBruS4iumZkOOAguWkp+OBjeOBquODleOCqeODq+ODgOOCkumBuOOCk+OBp+OCguWbuuOBvuOCieOBquOBhOOCiOOBhuOBq+OBmeOCi++8iERELUZJTEUtMDcy77yJXG5jb25zdCBGT0xERVJfRklMRV9MSU1JVCA9IDIwMDA7XG5jb25zdCBGT0xERVJfREVQVEhfTElNSVQgPSAxMjtcbi8vIOS4gOimp+OCkumaoOOBl+OBn+OBi+OBqeOBhuOBi++8iOWIqeeUqOiAheOBlOOBqOOBruimi+OBn+ebruOBruWlveOBv++8ieOCkuimmuOBiOOBpuOBiuOBj+OCreODvO+8iERELUZJTEUtMDc077yJXG5jb25zdCBGT0xERVJfQ09MTEFQU0VEX0tFWSA9ICdsdWNpdm8uZm9sZGVyUGFuZUNvbGxhcHNlZCc7XG4vLyDliY3lm57jga7jg5Xjgqnjg6vjg4Djga7jg4/jg7Pjg4njg6vjgpLkv53lrZjjgZnjgosgSW5kZXhlZERC77yIREQtRklMRS0wNzPvvIlcbmNvbnN0IFJFQ0VOVF9GT0xERVJfREIgPSAnbHVjaXZvJztcbmNvbnN0IFJFQ0VOVF9GT0xERVJfU1RPUkUgPSAnaGFuZGxlcyc7XG5jb25zdCBSRUNFTlRfRk9MREVSX0tFWSA9ICdyZWNlbnRGb2xkZXInO1xuXG4vLyDplovjgYTjgabjgYTjgovjg5Xjgqnjg6vjg4A6IHsgbmFtZSwgZmlsZXM6IFt7IHBhdGgsIG5hbWUsIGRpciB9XSwgZ2V0RmlsZShwYXRoKSDihpIgUHJvbWlzZTxGaWxlfG51bGw+IH1cbmxldCBvcGVuZWRGb2xkZXIgPSBudWxsO1xuLy8g44OV44Kp44Or44OA44GL44KJ6ZaL44GE44Gf5paH5pu444Gu44CB44OV44Kp44Or44OA44Gu5Lit44Gu44OR44K577yI44OV44Kp44Or44OA44GL44KJ6ZaL44GE44Gm44GE44Gq44GR44KM44GwIG51bGzvvIlcbmxldCBjdXJyZW50Rm9sZGVyUGF0aCA9IG51bGw7XG4vLyDlkIzmorHjgrXjg7Pjg5fjg6vjgajjgZfjgabplovjgYTjgZ/mlofmm7jjga7jg5XjgqHjgqTjg6vlkI3vvIjlkIzmorHjgrXjg7Pjg5fjg6vjgafjgarjgZHjgozjgbAgbnVsbO+8ie+8iERELUZJTEUtMDgx77yJXG5sZXQgY3VycmVudFNhbXBsZUZpbGUgPSBudWxsO1xuLy8g5ZCM5qKx44K144Oz44OX44Or44Gu44OV44Kp44Or44OA77yIaW5kZXguaHRtbCDjgYvjgonjga7nm7jlr77jg5HjgrnvvInjgajjgIHjgrXjg7Pjg5fjg6vjga7jg5XjgqHjgqTjg6vlkI1cbmNvbnN0IFNBTVBMRVNfRElSID0gJ3NhbXBsZXMnO1xuY29uc3QgQlVORExFRF9TQU1QTEVTID0gWyd2aXN1YWwtc2FtcGxlLm1kJywgJ25vdGF0aW9uX3NhbXBsZS5tZCcsICdub3RhdGlvbl9zYW1wbGVfZXh0cmExLm1kJ107XG4vLyDjg5Xjgqnjg6vjg4Djga7nlLvlg4/jga7jg5Hjgrkg4oaSIGJsb2IgVVJM77yI6Kqt44G/6L6844G/5Lit44GvIFByb21pc2XvvInvvIhERC1GSUxFLTA3Nu+8iVxuY29uc3QgZm9sZGVySW1hZ2VVcmxzID0gbmV3IE1hcCgpO1xuLy8gRmlsZSBTeXN0ZW0gQWNjZXNzIEFQSSDjgYzkvb/jgYjjgarjgYvjgaPjgZ/jgajjgY3jgIHmrKHjgYvjgonjga/jg5Xjgqnjg6vjg4Djga7pgbjmip7jga7lhaXlipvmrITjgpLkvb/jgYbvvIhERC1GSUxFLTA3Me+8iVxubGV0IHByZWZlckZvbGRlcklucHV0ID0gZmFsc2U7XG5sZXQgcmVjZW50Rm9sZGVySGFuZGxlID0gbnVsbDtcblxuLy8g6Zqg44GX44OV44Kp44Or44OA77yILiDjgaflp4vjgb7jgovvvInjgajjgIHkvp3lrZjjg5Hjg4PjgrHjg7zjgrjjga7nva7jgY3loLTjga/jgIHjgZ/jganjgonjgarjgYRcbmZ1bmN0aW9uIGlzU2tpcHBlZEZvbGRlck5hbWUobmFtZSkge1xuICByZXR1cm4gbmFtZS5zdGFydHNXaXRoKCcuJykgfHwgbmFtZSA9PT0gJ25vZGVfbW9kdWxlcyc7XG59XG5cbmZ1bmN0aW9uIGZvbGRlckRpck9mKHBhdGgpIHtcbiAgY29uc3QgaSA9IHBhdGgubGFzdEluZGV4T2YoJy8nKTtcbiAgcmV0dXJuIGkgPCAwID8gJycgOiBwYXRoLnNsaWNlKDAsIGkpO1xufVxuXG4vLyBiYXNl77yI44OV44Kp44Or44OA44Gu5Lit44Gu44OV44Kp44Or44OA44Gu44OR44K577yJ44GL44KJ6KaL44Gf55u45a++44OR44K544KS44CB44OV44Kp44Or44OA44Gu5Lit44Gu44OR44K544Gr44GZ44KL44CC44OV44Kp44Or44OA44Gu5aSW44G45Ye644KL44Go44GN44GvIG51bGzvvIhERC1GSUxFLTA3Nu+8iVxuZnVuY3Rpb24gcmVzb2x2ZUZvbGRlclBhdGgoYmFzZSwgc3JjKSB7XG4gIGxldCByZWwgPSBTdHJpbmcoc3JjKS5zcGxpdCgvWz8jXS8pWzBdLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgdHJ5IHtcbiAgICByZWwgPSBkZWNvZGVVUklDb21wb25lbnQocmVsKTtcbiAgfSBjYXRjaCAoXykge1xuICAgIC8vICUg44Gu5Lim44Gz44GM5aOK44KM44Gm44GE44KL44Go44GN44Gv44CB5pu444GE44Gf44G+44G+44Gu44OR44K544Gn5o6i44GZXG4gIH1cbiAgY29uc3QgcGFydHMgPSBiYXNlID8gYmFzZS5zcGxpdCgnLycpIDogW107XG4gIGZvciAoY29uc3Qgc2VnIG9mIHJlbC5zcGxpdCgnLycpKSB7XG4gICAgaWYgKHNlZyA9PT0gJycgfHwgc2VnID09PSAnLicpIGNvbnRpbnVlO1xuICAgIGlmIChzZWcgPT09ICcuLicpIHtcbiAgICAgIGlmICghcGFydHMubGVuZ3RoKSByZXR1cm4gbnVsbDtcbiAgICAgIHBhcnRzLnBvcCgpO1xuICAgIH0gZWxzZSB7XG4gICAgICBwYXJ0cy5wdXNoKHNlZyk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXJ0cy5sZW5ndGggPyBwYXJ0cy5qb2luKCcvJykgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBzb3J0Rm9sZGVyRmlsZXMoZmlsZXMpIHtcbiAgY29uc3QgY29sbGF0b3IgPSBuZXcgSW50bC5Db2xsYXRvcignamEnLCB7IG51bWVyaWM6IHRydWUsIHNlbnNpdGl2aXR5OiAnYmFzZScgfSk7XG4gIC8vIOODleOCqeODq+ODgOOBruebtOS4i+OBruODleOCoeOCpOODq+OCkuWFiOOBq+OAgeOBneOBruW+jOOBr+OCteODluODleOCqeODq+ODgOOBruODkeOCueOBrumghuOAgeWQjOOBmOODleOCqeODq+ODgOOBruS4reOBr+WQjeWJjeOBrumghlxuICByZXR1cm4gZmlsZXMuc29ydCgoYSwgYikgPT4gKGEuZGlyID09PSAnJyA/IDAgOiAxKSAtIChiLmRpciA9PT0gJycgPyAwIDogMSlcbiAgICB8fCBjb2xsYXRvci5jb21wYXJlKGEuZGlyLCBiLmRpcikgfHwgY29sbGF0b3IuY29tcGFyZShhLm5hbWUsIGIubmFtZSkpO1xufVxuXG4vLyBGaWxlIFN5c3RlbSBBY2Nlc3MgQVBJIOOBruODj+ODs+ODieODq+OBi+OCieOAgU1hcmtkb3duIOODleOCoeOCpOODq+OCkumbhuOCgeOCi++8iERELUZJTEUtMDcy77yJXG5hc3luYyBmdW5jdGlvbiBzY2FuRGlyZWN0b3J5SGFuZGxlKHJvb3QpIHtcbiAgY29uc3QgZmlsZXMgPSBbXTtcbiAgbGV0IHRydW5jYXRlZCA9IGZhbHNlO1xuICBjb25zdCB3YWxrID0gYXN5bmMgKGRpciwgcHJlZml4LCBkZXB0aCkgPT4ge1xuICAgIGZvciBhd2FpdCAoY29uc3QgW25hbWUsIGhhbmRsZV0gb2YgZGlyLmVudHJpZXMoKSkge1xuICAgICAgaWYgKGZpbGVzLmxlbmd0aCA+PSBGT0xERVJfRklMRV9MSU1JVCkge1xuICAgICAgICB0cnVuY2F0ZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBjb25zdCBwYXRoID0gcHJlZml4ID8gYCR7cHJlZml4fS8ke25hbWV9YCA6IG5hbWU7XG4gICAgICBpZiAoaGFuZGxlLmtpbmQgPT09ICdkaXJlY3RvcnknKSB7XG4gICAgICAgIGlmICghaXNTa2lwcGVkRm9sZGVyTmFtZShuYW1lKSAmJiBkZXB0aCA8IEZPTERFUl9ERVBUSF9MSU1JVCkgYXdhaXQgd2FsayhoYW5kbGUsIHBhdGgsIGRlcHRoICsgMSk7XG4gICAgICB9IGVsc2UgaWYgKERST1BQQUJMRV9GSUxFX1BBVFRFUk4udGVzdChuYW1lKSkge1xuICAgICAgICBmaWxlcy5wdXNoKHsgcGF0aCwgbmFtZSwgZGlyOiBwcmVmaXggfSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xuICBhd2FpdCB3YWxrKHJvb3QsICcnLCAwKTtcbiAgcmV0dXJuIHsgZmlsZXM6IHNvcnRGb2xkZXJGaWxlcyhmaWxlcyksIHRydW5jYXRlZCB9O1xufVxuXG5mdW5jdGlvbiBtYWtlSGFuZGxlRm9sZGVyKHJvb3QsIHNjYW4pIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiByb290Lm5hbWUsXG4gICAgZmlsZXM6IHNjYW4uZmlsZXMsXG4gICAgdHJ1bmNhdGVkOiBzY2FuLnRydW5jYXRlZCxcbiAgICBhc3luYyBnZXRGaWxlKHBhdGgpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNlZ3MgPSBwYXRoLnNwbGl0KCcvJyk7XG4gICAgICAgIGxldCBkaXIgPSByb290O1xuICAgICAgICBmb3IgKGNvbnN0IHNlZyBvZiBzZWdzLnNsaWNlKDAsIC0xKSkgZGlyID0gYXdhaXQgZGlyLmdldERpcmVjdG9yeUhhbmRsZShzZWcpO1xuICAgICAgICByZXR1cm4gYXdhaXQgKGF3YWl0IGRpci5nZXRGaWxlSGFuZGxlKHNlZ3Nbc2Vncy5sZW5ndGggLSAxXSkpLmdldEZpbGUoKTtcbiAgICAgIH0gY2F0Y2ggKF8pIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG4vLyA8aW5wdXQgd2Via2l0ZGlyZWN0b3J5PiDjgafpgbjjgpPjgaDjg5XjgqHjgqTjg6vjga7kuIDopqfjgYvjgonkvZzjgovjgIJ3ZWJraXRSZWxhdGl2ZVBhdGgg44Gu5YWI6aCt44Gv44OV44Kp44Or44OA44Gu5ZCN5YmN77yIREQtRklMRS0wNzHvvIlcbmZ1bmN0aW9uIG1ha2VJbnB1dEZvbGRlcihmaWxlTGlzdCkge1xuICBjb25zdCBhbGwgPSBuZXcgTWFwKCk7XG4gIGxldCBuYW1lID0gJyc7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBmaWxlTGlzdCkge1xuICAgIGNvbnN0IHNlZ3MgPSAoZmlsZS53ZWJraXRSZWxhdGl2ZVBhdGggfHwgZmlsZS5uYW1lKS5zcGxpdCgnLycpO1xuICAgIGlmICghbmFtZSkgbmFtZSA9IHNlZ3MubGVuZ3RoID4gMSA/IHNlZ3NbMF0gOiAnJztcbiAgICBjb25zdCBpbm5lciA9IHNlZ3MubGVuZ3RoID4gMSA/IHNlZ3Muc2xpY2UoMSkgOiBzZWdzO1xuICAgIGlmIChpbm5lci5zbGljZSgwLCAtMSkuc29tZShpc1NraXBwZWRGb2xkZXJOYW1lKSkgY29udGludWU7XG4gICAgYWxsLnNldChpbm5lci5qb2luKCcvJyksIGZpbGUpO1xuICB9XG4gIGNvbnN0IGZpbGVzID0gW107XG4gIGZvciAoY29uc3QgW3BhdGgsIGZpbGVdIG9mIGFsbCkge1xuICAgIGlmIChEUk9QUEFCTEVfRklMRV9QQVRURVJOLnRlc3QoZmlsZS5uYW1lKSkgZmlsZXMucHVzaCh7IHBhdGgsIG5hbWU6IGZpbGUubmFtZSwgZGlyOiBmb2xkZXJEaXJPZihwYXRoKSB9KTtcbiAgfVxuICBjb25zdCB0cnVuY2F0ZWQgPSBmaWxlcy5sZW5ndGggPiBGT0xERVJfRklMRV9MSU1JVDtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiBuYW1lIHx8ICfjg5Xjgqnjg6vjg4AnLFxuICAgIGZpbGVzOiBzb3J0Rm9sZGVyRmlsZXMoZmlsZXMpLnNsaWNlKDAsIEZPTERFUl9GSUxFX0xJTUlUKSxcbiAgICB0cnVuY2F0ZWQsXG4gICAgYXN5bmMgZ2V0RmlsZShwYXRoKSB7XG4gICAgICByZXR1cm4gYWxsLmdldChwYXRoKSB8fCBudWxsO1xuICAgIH1cbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Rm9sZGVySW1hZ2VVcmwoZm9sZGVyLCBwYXRoKSB7XG4gIGlmICghZm9sZGVySW1hZ2VVcmxzLmhhcyhwYXRoKSkge1xuICAgIGZvbGRlckltYWdlVXJscy5zZXQocGF0aCwgZm9sZGVyLmdldEZpbGUocGF0aCkudGhlbihmaWxlID0+IHtcbiAgICAgIGNvbnN0IHVybCA9IGZpbGUgPyBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpIDogbnVsbDtcbiAgICAgIC8vIOiqreOBv+i+vOOBv+S4reOBq+WIpeOBruODleOCqeODq+ODgOOBq+abv+OCj+OBo+OBn+OCieOAgeS9nOOBo+OBnyBVUkwg44KS5o2o44Gm44KLXG4gICAgICBpZiAoZm9sZGVyICE9PSBvcGVuZWRGb2xkZXIpIHtcbiAgICAgICAgaWYgKHVybCkgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICAgICAgICByZXR1cm4gbnVsbDtcbiAgICAgIH1cbiAgICAgIGZvbGRlckltYWdlVXJscy5zZXQocGF0aCwgdXJsKTtcbiAgICAgIHJldHVybiB1cmw7XG4gICAgfSkpO1xuICB9XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUoZm9sZGVySW1hZ2VVcmxzLmdldChwYXRoKSk7XG59XG5cbmZ1bmN0aW9uIGNsZWFyRm9sZGVySW1hZ2VVcmxzKCkge1xuICBmb2xkZXJJbWFnZVVybHMuZm9yRWFjaCh1cmwgPT4ge1xuICAgIGlmICh0eXBlb2YgdXJsID09PSAnc3RyaW5nJykgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpO1xuICB9KTtcbiAgZm9sZGVySW1hZ2VVcmxzLmNsZWFyKCk7XG59XG5cbmZ1bmN0aW9uIHNldE9wZW5lZEZvbGRlcihmb2xkZXIpIHtcbiAgY2xlYXJGb2xkZXJJbWFnZVVybHMoKTtcbiAgb3BlbmVkRm9sZGVyID0gZm9sZGVyO1xuICAvLyDliY3jgavplovjgYTjgabjgYTjgZ/mlofmm7jjga/jgIHmlrDjgZfjgYTjg5Xjgqnjg6vjg4Djga7mlofmm7jjgafjga/jgarjgYRcbiAgY3VycmVudEZvbGRlclBhdGggPSBudWxsO1xuICBzZXRGb2xkZXJQYW5lQ29sbGFwc2VkKGZhbHNlKTtcbiAgcmVuZGVyRm9sZGVyTGlzdCgpO1xuICByZW5kZXJBcHAoKTtcbiAgY29uc3Qgbm90ZSA9IGZvbGRlci50cnVuY2F0ZWQgPyBg77yI5YWI6aCt44GuICR7Rk9MREVSX0ZJTEVfTElNSVR9IOS7tu+8iWAgOiAnJztcbiAgc2hvd1RvYXN0KGDjgIwke2ZvbGRlci5uYW1lfeOAjeOCkumWi+OBjeOBvuOBl+OBn+OAgk1hcmtkb3duICR7Zm9sZGVyLmZpbGVzLmxlbmd0aH0g5Lu2JHtub3RlfWApO1xufVxuXG5mdW5jdGlvbiBjbG9zZUZvbGRlcigpIHtcbiAgY2xlYXJGb2xkZXJJbWFnZVVybHMoKTtcbiAgb3BlbmVkRm9sZGVyID0gbnVsbDtcbiAgY3VycmVudEZvbGRlclBhdGggPSBudWxsO1xuICByZW5kZXJGb2xkZXJMaXN0KCk7XG4gIHJlbmRlckFwcCgpO1xufVxuXG4vLyDjgIzjg5Xjgqnjg6vjg4DjgpLplovjgY/igKbjgI3jgIJDaHJvbWUgLyBFZGdlIOOBryBGaWxlIFN5c3RlbSBBY2Nlc3MgQVBJ44CB44Gd44KM5Lul5aSW44Gv44OV44Kp44Or44OA44Gu6YG45oqe44Gu5YWl5Yqb5qyE77yIREQtRklMRS0wNzAsIDA3Me+8iVxuYXN5bmMgZnVuY3Rpb24gb3BlbkZvbGRlcigpIHtcbiAgaWYgKCF3aW5kb3cuc2hvd0RpcmVjdG9yeVBpY2tlciB8fCBwcmVmZXJGb2xkZXJJbnB1dCkge1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb2xkZXItaW5wdXQnKS5jbGljaygpO1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgaGFuZGxlO1xuICB0cnkge1xuICAgIGhhbmRsZSA9IGF3YWl0IHdpbmRvdy5zaG93RGlyZWN0b3J5UGlja2VyKHsgaWQ6ICdsdWNpdm8tZm9sZGVyJywgbW9kZTogJ3JlYWQnIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBpZiAoZXJyICYmIGVyci5uYW1lID09PSAnQWJvcnRFcnJvcicpIHJldHVybjtcbiAgICAvLyBmaWxlOi8vIOOBp+S9v+OBiOOBquOBhOOBquOBqeOAguasoeOBi+OCieOBr+WFpeWKm+ashOOCkuS9v+OBhOOAgeS7iuWbnuOCguippuOBme+8iOOCr+ODquODg+OCr+OBruebtOW+jOOBp+OBquOBkeOCjOOBsOOAgeODluODqeOCpuOCtuOBjOatouOCgeOCi+OBk+OBqOOBjOOBguOCi++8iVxuICAgIGNvbnNvbGUud2Fybignc2hvd0RpcmVjdG9yeVBpY2tlciBmYWlsZWQ6JywgZXJyKTtcbiAgICBwcmVmZXJGb2xkZXJJbnB1dCA9IHRydWU7XG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbGRlci1pbnB1dCcpLmNsaWNrKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IG9wZW5Gb2xkZXJGcm9tSGFuZGxlKGhhbmRsZSk7XG4gIHNhdmVSZWNlbnRGb2xkZXJIYW5kbGUoaGFuZGxlKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gb3BlbkZvbGRlckZyb21IYW5kbGUoaGFuZGxlKSB7XG4gIHRyeSB7XG4gICAgc2V0T3BlbmVkRm9sZGVyKG1ha2VIYW5kbGVGb2xkZXIoaGFuZGxlLCBhd2FpdCBzY2FuRGlyZWN0b3J5SGFuZGxlKGhhbmRsZSkpKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHJlYWQgZm9sZGVyOicsIGVycik7XG4gICAgc2hvd1RvYXN0KGDjgIwke2hhbmRsZS5uYW1lfeOAjeOCkuiqreOBv+i+vOOCgeOBvuOBm+OCk+OBp+OBl+OBn2ApO1xuICB9XG59XG5cbi8vIOODleOCqeODq+ODgOOBruS4reOBruODleOCoeOCpOODq+OCkumWi+OBj++8iOS4gOimp+OBqOOAgeaWh+abuOOBruS4reOBruODquODs+OCr+OBi+OCieOAgkRELUZJTEUtMDc1LCBERC1GSUxFLTA3Oe+8ieOAglxuLy8g5LiA6Kan44Gr6LyJ44KJ44Gq44GE44OV44Kh44Kk44Or77yI5Lu25pWw44Gu5LiK6ZmQ44KS6LaF44GI44Gf44KC44Gu44Gq44Gp77yJ44KC44CB44OV44Kp44Or44OA44Gu5Lit44Gr44GC44KM44Gw6ZaL44GP44CC6ZaL44GR44Gf44KJIHRydWVcbmFzeW5jIGZ1bmN0aW9uIG9wZW5Gb2xkZXJGaWxlKHBhdGgpIHtcbiAgY29uc3QgZm9sZGVyID0gb3BlbmVkRm9sZGVyO1xuICBpZiAoIWZvbGRlcikgcmV0dXJuIGZhbHNlO1xuICBjb25zdCBuYW1lID0gcGF0aC5zbGljZShwYXRoLmxhc3RJbmRleE9mKCcvJykgKyAxKTtcbiAgY29uc3QgZmlsZSA9IGF3YWl0IGZvbGRlci5nZXRGaWxlKHBhdGgpO1xuICBpZiAoZm9sZGVyICE9PSBvcGVuZWRGb2xkZXIpIHJldHVybiBmYWxzZTtcbiAgaWYgKCFmaWxlKSB7XG4gICAgc2hvd1RvYXN0KGDjgIwke3BhdGh944CN44Gv44OV44Kp44Or44OA44Gu5Lit44Gr6KaL44Gk44GL44KK44G+44Gb44KTYCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmICghY29uZmlybURpc2NhcmRFZGl0cyhuYW1lKSkgcmV0dXJuIGZhbHNlO1xuICB0cnkge1xuICAgIGFwcGx5TG9hZGVkTWFya2Rvd24oYXdhaXQgZmlsZS50ZXh0KCksIG5hbWUsIHBhdGgpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcmVhZCBmaWxlOicsIGVycik7XG4gICAgc2hvd1RvYXN0KGDjgIwke25hbWV944CN44KS6Kqt44G/6L6844KB44G+44Gb44KT44Gn44GX44GfYCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIC8vIOeLreOBhOeUu+mdouOBp+OBr+S4gOimp+OBjOaWh+abuOOBq+mHjeOBquOCi+OBn+OCgeOAgemBuOOCk+OBoOOCiemaoOOBmVxuICBpZiAod2luZG93Lm1hdGNoTWVkaWEoJyhtYXgtd2lkdGg6IDEwMjMuOThweCknKS5tYXRjaGVzKSBzZXRGb2xkZXJQYW5lQ29sbGFwc2VkKHRydWUpO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8g6KaL5Ye644GX44Gu5paH5a2X44GL44KJ44CBR2l0SHViIOOBqOWQjOOBmOW9ouOBruOCouODs+OCq+ODvO+8iOWwj+aWh+Wtl+OAgeiomOWPt+OCkumZpOOBj+OAgeepuueZveOBryAt77yJ44KS5L2c44KL77yIREQtRklMRS0wODDvvIlcbmZ1bmN0aW9uIGhlYWRpbmdTbHVnKHRleHQpIHtcbiAgcmV0dXJuIFN0cmluZyh0ZXh0KS50cmltKCkudG9Mb3dlckNhc2UoKVxuICAgIC5yZXBsYWNlKC9bXlxccHtMfVxccHtOfVxcc18tXS9ndSwgJycpXG4gICAgLnJlcGxhY2UoL1xccy9nLCAnLScpO1xufVxuXG4vLyDjg5fjg6zjg5Pjg6Xjg7zjga7kuK3jgafjgIHjgqLjg7Pjgqvjg7zvvIgj5Lul6ZmN77yJ44Gr5b2T44Gf44KL6KaL5Ye644GX44G46YCB44KL44CC6KaL44Gk44GL44KJ44Gq44GR44KM44GwIGZhbHNlXG5mdW5jdGlvbiBzY3JvbGxUb0hlYWRpbmdBbmNob3IoYW5jaG9yKSB7XG4gIGxldCB0YXJnZXQgPSBhbmNob3I7XG4gIHRyeSB7XG4gICAgdGFyZ2V0ID0gZGVjb2RlVVJJQ29tcG9uZW50KGFuY2hvcik7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICAvLyAlIOOBruS4puOBs+OBjOWjiuOCjOOBpuOBhOOCi+OBqOOBjeOBr+OAgeabuOOBhOOBn+OBvuOBvuOBp+aOouOBmVxuICB9XG4gIGNvbnN0IHNsdWcgPSBoZWFkaW5nU2x1Zyh0YXJnZXQpO1xuICBjb25zdCBzY3JvbGxlciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdwcmV2aWV3LXNjcm9sbCcpO1xuICBjb25zdCBoZWFkaW5nID0gQXJyYXkuZnJvbShzY3JvbGxlci5xdWVyeVNlbGVjdG9yQWxsKCdoMSwgaDIsIGgzLCBoNCwgaDUsIGg2JykpXG4gICAgLmZpbmQoaCA9PiBoZWFkaW5nU2x1ZyhoLnRleHRDb250ZW50KSA9PT0gc2x1Zyk7XG4gIGlmICghaGVhZGluZykgcmV0dXJuIGZhbHNlO1xuICAvLyBWaXN1YWzjg6Ljg7zjg4njga7nq6Djga7opovlh7rjgZfjga/jgIHnq6DvvIjjgrnjg6njg5bvvInjga7kuIrnq6/jgbjpgIHjgotcbiAgY29uc3QgZWwgPSBoZWFkaW5nLmNsb3Nlc3QoJy5leGhpYml0aW9uLXNsYWInKSB8fCBoZWFkaW5nO1xuICBzY3JvbGxlci5zY3JvbGxUbyh7IHRvcDogcHJldmlld1Njcm9sbFRvcE9mKGVsLCBzY3JvbGxlciksIGJlaGF2aW9yOiBzY3JvbGxCZWhhdmlvcigpIH0pO1xuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8g5paH5pu444Gu5Lit44Gu44Oq44Oz44Kv77yIREQtRklMRS0wNzksIDA4MO+8ieOAguebuOWvvuODkeOCueOBriBNYXJrZG93biDjgbjjga7jg6rjg7Pjgq/jgajjgIHopovlh7rjgZfjgbjjga7jg6rjg7Pjgq/vvIgj4oCm77yJ44Gv44CBXG4vLyDjg5bjg6njgqbjgrbjga7ml6Llrprjga7li5XkvZzvvIhMdWNpdm8g44Gu55S76Z2i44GL44KJ44CBTWFya2Rvd24g44Gu44OV44Kh44Kk44Or44Gd44Gu44KC44Gu44G456e744Gj44Gm44GX44G+44GG77yJ44KS5q2i44KB44Gm44CBTHVjaXZvIOOBruS4reOBp+mWi+OBj1xuZnVuY3Rpb24gc2V0dXBEb2N1bWVudExpbmtzKCkge1xuICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgncHJldmlldy1zY3JvbGwnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGV2ZW50ID0+IHtcbiAgICBjb25zdCBsaW5rID0gZXZlbnQudGFyZ2V0IGluc3RhbmNlb2YgRWxlbWVudCA/IGV2ZW50LnRhcmdldC5jbG9zZXN0KCdhW2hyZWZdJykgOiBudWxsO1xuICAgIGlmICghbGluayB8fCBldmVudC5kZWZhdWx0UHJldmVudGVkIHx8IGV2ZW50LmJ1dHRvbiAhPT0gMCkgcmV0dXJuO1xuICAgIGNvbnN0IGhyZWYgPSBsaW5rLmdldEF0dHJpYnV0ZSgnaHJlZicpO1xuICAgIGlmIChocmVmLnN0YXJ0c1dpdGgoJyMnKSkge1xuICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgIGlmICghc2Nyb2xsVG9IZWFkaW5nQW5jaG9yKGhyZWYuc2xpY2UoMSkpKSBzaG93VG9hc3QoJ+ODquODs+OCr+WFiOOBruimi+WHuuOBl+OBjOimi+OBpOOBi+OCiuOBvuOBm+OCkycpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBpZiAoIWlzUmVsYXRpdmVTcmMoaHJlZikpIHJldHVybjtcbiAgICBjb25zdCBbcGF0aFBhcnQsIC4uLnJlc3RdID0gaHJlZi5zcGxpdCgnIycpO1xuICAgIGNvbnN0IGFuY2hvciA9IHJlc3Quam9pbignIycpO1xuICAgIGlmICghRFJPUFBBQkxFX0ZJTEVfUEFUVEVSTi50ZXN0KHBhdGhQYXJ0LnNwbGl0KCc/JylbMF0pKSByZXR1cm47XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAvLyDlkIzmorHjgrXjg7Pjg5fjg6vjga7plpPjga7jg6rjg7Pjgq/jga/jgIHlkIzmorHjgrXjg7Pjg5fjg6vjgajjgZfjgabplovjgY/vvIhERC1GSUxFLTA4Me+8iVxuICAgIGlmIChjdXJyZW50U2FtcGxlRmlsZSAmJiAhKG9wZW5lZEZvbGRlciAmJiBjdXJyZW50Rm9sZGVyUGF0aCAhPT0gbnVsbCkpIHtcbiAgICAgIGNvbnN0IHNhbXBsZVBhdGggPSByZXNvbHZlRm9sZGVyUGF0aCgnJywgcGF0aFBhcnQpO1xuICAgICAgaWYgKCFCVU5ETEVEX1NBTVBMRVMuaW5jbHVkZXMoc2FtcGxlUGF0aCkpIHtcbiAgICAgICAgc2hvd1RvYXN0KGDjgIwke3NhbXBsZVBhdGggfHwgcGF0aFBhcnR944CN44Gv5ZCM5qKx44K144Oz44OX44Or44Gr44GC44KK44G+44Gb44KTYCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGNvbnN0IG9wZW5lZCA9IHNhbXBsZVBhdGggPT09IGN1cnJlbnRTYW1wbGVGaWxlID8gUHJvbWlzZS5yZXNvbHZlKHRydWUpIDogbG9hZEJ1bmRsZWRTYW1wbGUoc2FtcGxlUGF0aCk7XG4gICAgICBvcGVuZWQudGhlbihvayA9PiB7XG4gICAgICAgIGlmIChvayAmJiBhbmNob3IgJiYgIXNjcm9sbFRvSGVhZGluZ0FuY2hvcihhbmNob3IpKSBzaG93VG9hc3QoJ+ODquODs+OCr+WFiOOBruimi+WHuuOBl+OBjOimi+OBpOOBi+OCiuOBvuOBm+OCkycpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmICghb3BlbmVkRm9sZGVyIHx8IGN1cnJlbnRGb2xkZXJQYXRoID09PSBudWxsKSB7XG4gICAgICBzaG93VG9hc3QoJ01hcmtkb3duIOOBuOOBruODquODs+OCr+OBr+OAgeOAjOmWi+OBj+OAjeKGkuOAjOODleOCqeODq+ODgOOCkumWi+OBj+KApuOAjeOBp+mWi+OBhOOBn+aWh+abuOOBp+S9v+OBiOOBvuOBmScpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBwYXRoID0gcmVzb2x2ZUZvbGRlclBhdGgoZm9sZGVyRGlyT2YoY3VycmVudEZvbGRlclBhdGgpLCBwYXRoUGFydCk7XG4gICAgaWYgKHBhdGggPT09IG51bGwpIHtcbiAgICAgIHNob3dUb2FzdCgn6ZaL44GE44Gf44OV44Kp44Or44OA44Gu5aSW44Gu44OV44Kh44Kk44Or44Gv6ZaL44GR44G+44Gb44KTJyk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG9wZW4gPSBwYXRoID09PSBjdXJyZW50Rm9sZGVyUGF0aCA/IFByb21pc2UucmVzb2x2ZSh0cnVlKSA6IG9wZW5Gb2xkZXJGaWxlKHBhdGgpO1xuICAgIG9wZW4udGhlbihvcGVuZWQgPT4ge1xuICAgICAgaWYgKG9wZW5lZCAmJiBhbmNob3IgJiYgIXNjcm9sbFRvSGVhZGluZ0FuY2hvcihhbmNob3IpKSBzaG93VG9hc3QoJ+ODquODs+OCr+WFiOOBruimi+WHuuOBl+OBjOimi+OBpOOBi+OCiuOBvuOBm+OCkycpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuLy8g5LiA6Kan44KS5o+P44GN55u044GZ44CC44OV44Kp44Or44OA44KS6ZaL44GE44Gm44GE44Gq44GR44KM44Gw44CB5LiA6Kan44KC5biv44KC5Ye644GV44Gq44GE77yIREQtRklMRS0wNzTvvIlcbmZ1bmN0aW9uIHJlbmRlckZvbGRlckxpc3QoKSB7XG4gIGNvbnN0IHBhbmUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9sZGVyLXBhbmUnKTtcbiAgY29uc3QgcmFpbCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tZm9sZGVyLXNob3cnKTtcbiAgaWYgKCFvcGVuZWRGb2xkZXIpIHtcbiAgICBwYW5lLmNsYXNzTGlzdC5hZGQoJ2hpZGRlbicpO1xuICAgIHJhaWwuY2xhc3NMaXN0LmFkZCgnaGlkZGVuJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IGNvbGxhcHNlZCA9IGlzRm9sZGVyUGFuZUNvbGxhcHNlZCgpO1xuICBwYW5lLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicsIGNvbGxhcHNlZCk7XG4gIHJhaWwuY2xhc3NMaXN0LnRvZ2dsZSgnaGlkZGVuJywgIWNvbGxhcHNlZCk7XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdmb2xkZXItcGFuZS1uYW1lJykudGV4dENvbnRlbnQgPSBvcGVuZWRGb2xkZXIubmFtZTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbGRlci1wYW5lLW5hbWUnKS50aXRsZSA9IG9wZW5lZEZvbGRlci5uYW1lO1xuICBjb25zdCBsaXN0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbGRlci1saXN0Jyk7XG4gIGxpc3QucmVwbGFjZUNoaWxkcmVuKCk7XG4gIGlmICghb3BlbmVkRm9sZGVyLmZpbGVzLmxlbmd0aCkge1xuICAgIGNvbnN0IGVtcHR5ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgncCcpO1xuICAgIGVtcHR5LmNsYXNzTmFtZSA9ICdmb2xkZXItbGlzdC1lbXB0eSc7XG4gICAgZW1wdHkudGV4dENvbnRlbnQgPSAnTWFya2Rvd24g44OV44Kh44Kk44Or77yILm1kIC8gLm1hcmtkb3duIC8gLnR4dO+8ieOBjOOBguOCiuOBvuOBm+OCkyc7XG4gICAgbGlzdC5hcHBlbmQoZW1wdHkpO1xuICAgIHJldHVybjtcbiAgfVxuICBsZXQgbGFzdERpciA9IG51bGw7XG4gIGZvciAoY29uc3QgZmlsZSBvZiBvcGVuZWRGb2xkZXIuZmlsZXMpIHtcbiAgICBpZiAoZmlsZS5kaXIgIT09IGxhc3REaXIgJiYgZmlsZS5kaXIgIT09ICcnKSB7XG4gICAgICBjb25zdCBkaXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIGRpci5jbGFzc05hbWUgPSAnZm9sZGVyLWxpc3QtZGlyJztcbiAgICAgIGRpci50ZXh0Q29udGVudCA9IGAke2ZpbGUuZGlyfS9gO1xuICAgICAgZGlyLnRpdGxlID0gZmlsZS5kaXI7XG4gICAgICBsaXN0LmFwcGVuZChkaXIpO1xuICAgIH1cbiAgICBsYXN0RGlyID0gZmlsZS5kaXI7XG4gICAgY29uc3QgYnRuID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnYnV0dG9uJyk7XG4gICAgYnRuLnR5cGUgPSAnYnV0dG9uJztcbiAgICBidG4uY2xhc3NOYW1lID0gJ2ZvbGRlci1saXN0LWl0ZW0nO1xuICAgIGJ0bi5kYXRhc2V0LnBhdGggPSBmaWxlLnBhdGg7XG4gICAgYnRuLnRpdGxlID0gZmlsZS5wYXRoO1xuICAgIGJ0bi5pbm5lckhUTUwgPSAnPHN2ZyB2aWV3Qm94PVwiMCAwIDI0IDI0XCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+PHBhdGggZD1cIk03IDNoN2w1IDV2MTNIN3ogTTE0IDN2NWg1XCIgZmlsbD1cIm5vbmVcIiBzdHJva2U9XCJjdXJyZW50Q29sb3JcIiBzdHJva2Utd2lkdGg9XCIxLjdcIiBzdHJva2UtbGluZWpvaW49XCJyb3VuZFwiLz48L3N2Zz4nO1xuICAgIGNvbnN0IGxhYmVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgIGxhYmVsLnRleHRDb250ZW50ID0gZmlsZS5uYW1lO1xuICAgIGJ0bi5hcHBlbmQobGFiZWwpO1xuICAgIGlmIChmaWxlLnBhdGggPT09IGN1cnJlbnRGb2xkZXJQYXRoKSB7XG4gICAgICBidG4uY2xhc3NMaXN0LmFkZCgnaXMtY3VycmVudCcpO1xuICAgICAgYnRuLnNldEF0dHJpYnV0ZSgnYXJpYS1jdXJyZW50JywgJ3BhZ2UnKTtcbiAgICB9XG4gICAgYnRuLm9uY2xpY2sgPSAoKSA9PiBvcGVuRm9sZGVyRmlsZShmaWxlLnBhdGgpO1xuICAgIGxpc3QuYXBwZW5kKGJ0bik7XG4gIH1cbn1cblxuZnVuY3Rpb24gaXNGb2xkZXJQYW5lQ29sbGFwc2VkKCkge1xuICB0cnkge1xuICAgIHJldHVybiBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShGT0xERVJfQ09MTEFQU0VEX0tFWSkgPT09ICcxJztcbiAgfSBjYXRjaCAoXykge1xuICAgIHJldHVybiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9sZGVyLXBhbmUnKS5kYXRhc2V0LmNvbGxhcHNlZCA9PT0gJzEnO1xuICB9XG59XG5cbmZ1bmN0aW9uIHNldEZvbGRlclBhbmVDb2xsYXBzZWQoY29sbGFwc2VkKSB7XG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oRk9MREVSX0NPTExBUFNFRF9LRVksIGNvbGxhcHNlZCA/ICcxJyA6ICcwJyk7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICAvLyDkv53lrZjjgafjgY3jgarjgYTnkrDlooPvvIjjg5fjg6njgqTjg5njg7zjg4jjgqbjgqPjg7Pjg4njgqbjgarjganvvInjgafjga/jgIHjgZ3jga7loLTjga7ooajnpLrjgaDjgZHjgpLliIfjgormm7/jgYjjgotcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnZm9sZGVyLXBhbmUnKS5kYXRhc2V0LmNvbGxhcHNlZCA9IGNvbGxhcHNlZCA/ICcxJyA6ICcwJztcbiAgfVxuICByZW5kZXJGb2xkZXJMaXN0KCk7XG59XG5cbi8vIOWJjeWbnuOBruODleOCqeODq+ODgOOBruODj+ODs+ODieODq++8iERELUZJTEUtMDcz77yJ44CCSW5kZXhlZERCIOOCkuS9v+OBiOOBquOBhOeSsOWig+OBp+OBr+OAgeS9leOCguOBl+OBquOBhFxuZnVuY3Rpb24gb3BlblJlY2VudEZvbGRlckRiKCkge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGNvbnN0IHJlcSA9IGluZGV4ZWREQi5vcGVuKFJFQ0VOVF9GT0xERVJfREIsIDEpO1xuICAgIHJlcS5vbnVwZ3JhZGVuZWVkZWQgPSAoKSA9PiByZXEucmVzdWx0LmNyZWF0ZU9iamVjdFN0b3JlKFJFQ0VOVF9GT0xERVJfU1RPUkUpO1xuICAgIHJlcS5vbnN1Y2Nlc3MgPSAoKSA9PiByZXNvbHZlKHJlcS5yZXN1bHQpO1xuICAgIHJlcS5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcS5lcnJvcik7XG4gIH0pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBzYXZlUmVjZW50Rm9sZGVySGFuZGxlKGhhbmRsZSkge1xuICByZWNlbnRGb2xkZXJIYW5kbGUgPSBoYW5kbGU7XG4gIHVwZGF0ZVJlY2VudEZvbGRlck1lbnUoKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBkYiA9IGF3YWl0IG9wZW5SZWNlbnRGb2xkZXJEYigpO1xuICAgIGRiLnRyYW5zYWN0aW9uKFJFQ0VOVF9GT0xERVJfU1RPUkUsICdyZWFkd3JpdGUnKS5vYmplY3RTdG9yZShSRUNFTlRfRk9MREVSX1NUT1JFKS5wdXQoaGFuZGxlLCBSRUNFTlRfRk9MREVSX0tFWSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIHJlbWVtYmVyIHRoZSBmb2xkZXI6JywgZXJyKTtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBsb2FkUmVjZW50Rm9sZGVySGFuZGxlKCkge1xuICBpZiAoIXdpbmRvdy5zaG93RGlyZWN0b3J5UGlja2VyIHx8ICF3aW5kb3cuaW5kZXhlZERCKSByZXR1cm47XG4gIHRyeSB7XG4gICAgY29uc3QgZGIgPSBhd2FpdCBvcGVuUmVjZW50Rm9sZGVyRGIoKTtcbiAgICBjb25zdCBoYW5kbGUgPSBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBjb25zdCByZXEgPSBkYi50cmFuc2FjdGlvbihSRUNFTlRfRk9MREVSX1NUT1JFLCAncmVhZG9ubHknKS5vYmplY3RTdG9yZShSRUNFTlRfRk9MREVSX1NUT1JFKS5nZXQoUkVDRU5UX0ZPTERFUl9LRVkpO1xuICAgICAgcmVxLm9uc3VjY2VzcyA9ICgpID0+IHJlc29sdmUocmVxLnJlc3VsdCB8fCBudWxsKTtcbiAgICAgIHJlcS5vbmVycm9yID0gKCkgPT4gcmVqZWN0KHJlcS5lcnJvcik7XG4gICAgfSk7XG4gICAgaWYgKGhhbmRsZSAmJiBoYW5kbGUua2luZCA9PT0gJ2RpcmVjdG9yeScpIHtcbiAgICAgIHJlY2VudEZvbGRlckhhbmRsZSA9IGhhbmRsZTtcbiAgICAgIHVwZGF0ZVJlY2VudEZvbGRlck1lbnUoKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIHJlYWQgdGhlIHJlbWVtYmVyZWQgZm9sZGVyOicsIGVycik7XG4gIH1cbn1cblxuZnVuY3Rpb24gdXBkYXRlUmVjZW50Rm9sZGVyTWVudSgpIHtcbiAgY29uc3QgaXRlbSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdtZW51LW9wZW4tcmVjZW50LWZvbGRlcicpO1xuICBpdGVtLmNsYXNzTGlzdC50b2dnbGUoJ2hpZGRlbicsICFyZWNlbnRGb2xkZXJIYW5kbGUpO1xuICBpZiAocmVjZW50Rm9sZGVySGFuZGxlKSBpdGVtLnRleHRDb250ZW50ID0gYOWJjeWbnuOBruODleOCqeODq+ODgOOAjCR7cmVjZW50Rm9sZGVySGFuZGxlLm5hbWV944CN44KS6ZaL44GPYDtcbn1cblxuLy8g5YmN5Zue44Gu44OV44Kp44Or44OA44KS6ZaL44GP44CC6Kqt44KA6Kix5Y+v44Gv6ZaL44GP44Gf44Gz44Gr44OW44Op44Km44K244GM56K644GL44KB44KL77yI44Kv44Oq44OD44Kv44Gu55u05b6M44Gr5rGC44KB44KL5b+F6KaB44GM44GC44KL77yJXG5hc3luYyBmdW5jdGlvbiByZW9wZW5SZWNlbnRGb2xkZXIoKSB7XG4gIGNvbnN0IGhhbmRsZSA9IHJlY2VudEZvbGRlckhhbmRsZTtcbiAgaWYgKCFoYW5kbGUpIHJldHVybjtcbiAgdHJ5IHtcbiAgICBsZXQgcGVybWlzc2lvbiA9IGF3YWl0IGhhbmRsZS5xdWVyeVBlcm1pc3Npb24oeyBtb2RlOiAncmVhZCcgfSk7XG4gICAgaWYgKHBlcm1pc3Npb24gIT09ICdncmFudGVkJykgcGVybWlzc2lvbiA9IGF3YWl0IGhhbmRsZS5yZXF1ZXN0UGVybWlzc2lvbih7IG1vZGU6ICdyZWFkJyB9KTtcbiAgICBpZiAocGVybWlzc2lvbiAhPT0gJ2dyYW50ZWQnKSB7XG4gICAgICBzaG93VG9hc3QoYOOAjCR7aGFuZGxlLm5hbWV944CN44KS6Kqt44KA6Kix5Y+v44GM44GC44KK44G+44Gb44KTYCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byByZW9wZW4gdGhlIGZvbGRlcjonLCBlcnIpO1xuICAgIHNob3dUb2FzdChg44CMJHtoYW5kbGUubmFtZX3jgI3jgpLplovjgZHjgb7jgZvjgpPjgafjgZfjgZ/jgILjgIzjg5Xjgqnjg6vjg4DjgpLplovjgY/igKbjgI3jgYvjgonpgbjjgbPnm7TjgZfjgabjgY/jgaDjgZXjgYRgKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgb3BlbkZvbGRlckZyb21IYW5kbGUoaGFuZGxlKTtcbn1cblxuZnVuY3Rpb24gc2V0dXBGb2xkZXIoKSB7XG4gIGNvbnN0IGlucHV0ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZvbGRlci1pbnB1dCcpO1xuICBpbnB1dC5vbmNoYW5nZSA9ICgpID0+IHtcbiAgICBjb25zdCBmaWxlcyA9IEFycmF5LmZyb20oaW5wdXQuZmlsZXMgfHwgW10pO1xuICAgIC8vIOWQjOOBmOODleOCqeODq+ODgOOCkue2muOBkeOBpumBuOOCk+OBp+OCgiBjaGFuZ2Ug44GM55m655Sf44GZ44KL44KI44GG44CB6YG45oqe44KS6Kej6Zmk44GZ44KLXG4gICAgaW5wdXQudmFsdWUgPSAnJztcbiAgICBpZiAoZmlsZXMubGVuZ3RoKSBzZXRPcGVuZWRGb2xkZXIobWFrZUlucHV0Rm9sZGVyKGZpbGVzKSk7XG4gIH07XG4gIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdidG4tZm9sZGVyLWhpZGUnKS5vbmNsaWNrID0gKCkgPT4gc2V0Rm9sZGVyUGFuZUNvbGxhcHNlZCh0cnVlKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1mb2xkZXItc2hvdycpLm9uY2xpY2sgPSAoKSA9PiBzZXRGb2xkZXJQYW5lQ29sbGFwc2VkKGZhbHNlKTtcbiAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1mb2xkZXItY2xvc2UnKS5vbmNsaWNrID0gY2xvc2VGb2xkZXI7XG4gIHNldHVwRG9jdW1lbnRMaW5rcygpO1xuICBsb2FkUmVjZW50Rm9sZGVySGFuZGxlKCk7XG59XG5cbi8vIOODleODreODs+ODiOODnuOCv+ODvOOBruihqOekuiBPTiAvIE9GRuOAguODouODvOODieOBq+OBi+OBi+OCj+OCieOBmuWKueOBjeOAgeODouODvOODieOCkuWIh+OCiuabv+OBiOOBpuOCgueKtuaFi+OCkuS/neOBpO+8iERELUZNLTAxMe+8iVxuZnVuY3Rpb24gc2V0dXBGcm9udE1hdHRlclRvZ2dsZSgpIHtcbiAgY29uc3QgYnRuID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2J0bi1mcm9udC1tYXR0ZXInKTtcbiAgYnRuLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgIHN0YXRlLnNob3dGcm9udE1hdHRlciA9ICFzdGF0ZS5zaG93RnJvbnRNYXR0ZXI7XG4gICAgYnRuLnNldEF0dHJpYnV0ZSgnYXJpYS1wcmVzc2VkJywgU3RyaW5nKHN0YXRlLnNob3dGcm9udE1hdHRlcikpO1xuICAgIGJ0bi5jbGFzc0xpc3QudG9nZ2xlKCdpcy1hY3RpdmUnLCBzdGF0ZS5zaG93RnJvbnRNYXR0ZXIpO1xuICAgIHJlbmRlckFwcCgpO1xuICB9KTtcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ0RPTUNvbnRlbnRMb2FkZWQnLCAoKSA9PiB7XG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXZpZXctbW9kZT1cInNwbGl0XCJdJykuY2xhc3NMaXN0LmFkZCgnaXMtYWN0aXZlJyk7XG4gIHNldHVwRXZlbnRMaXN0ZW5lcnMoKTtcbiAgc2V0dXBWaXN1YWxTdGFnZUludGVyYWN0aW9ucygpO1xuICBzZXR1cEtleWJvYXJkU2hvcnRjdXRzKCk7XG4gIHNldHVwRmlsZU1lbnUoKTtcbiAgc2V0dXBGaWxlRHJvcCgpO1xuICBzZXR1cEZvbGRlcigpO1xuICBzZXR1cERpYWdyYW1QYW5ab29tKCk7XG4gIHNldHVwTG9jYWxJbWFnZXMoKTtcbiAgc2V0dXBGcm9udE1hdHRlclRvZ2dsZSgpO1xuICBzZXR1cE1hcmtlZE1hdGgoKTtcbiAgc2V0dXBNYXJrZWRIZWFkaW5ncygpO1xuICBzZXR1cE1lcm1haWQoKTtcbiAgcmVuZGVyQXBwKCk7XG59KTtcblxuLy8gRTJFIOODhuOCueODiOOBiuOCiOOBs+WklumDqOmAo+aQuueUqOOCsOODreODvOODkOODq+WFrOmWi1xuKHdpbmRvdyBhcyBhbnkpLnN0YXRlID0gc3RhdGU7XG4od2luZG93IGFzIGFueSkucmVuZGVyQXBwID0gcmVuZGVyQXBwO1xuKHdpbmRvdyBhcyBhbnkpLmNsb3NlRmlsZU1lbnUgPSBjbG9zZUZpbGVNZW51O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCAnb3BlbmVkRm9sZGVyJywge1xuICBnZXQoKSB7IHJldHVybiBvcGVuZWRGb2xkZXI7IH0sXG4gIHNldCh2YWwpIHsgb3BlbmVkRm9sZGVyID0gdmFsOyB9LFxuICBjb25maWd1cmFibGU6IHRydWVcbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCAnY3VycmVudFNhbXBsZUZpbGUnLCB7XG4gIGdldCgpIHsgcmV0dXJuIGN1cnJlbnRTYW1wbGVGaWxlOyB9LFxuICBzZXQodmFsKSB7IGN1cnJlbnRTYW1wbGVGaWxlID0gdmFsOyB9LFxuICBjb25maWd1cmFibGU6IHRydWVcbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCAnbGFzdExvYWRlZE1hcmtkb3duJywge1xuICBnZXQoKSB7IHJldHVybiBsYXN0TG9hZGVkTWFya2Rvd247IH0sXG4gIHNldCh2YWwpIHsgbGFzdExvYWRlZE1hcmtkb3duID0gdmFsOyB9LFxuICBjb25maWd1cmFibGU6IHRydWVcbn0pO1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydHkod2luZG93LCAncHJlZmVyRm9sZGVySW5wdXQnLCB7XG4gIGdldCgpIHsgcmV0dXJuIHByZWZlckZvbGRlcklucHV0OyB9LFxuICBzZXQodmFsKSB7IHByZWZlckZvbGRlcklucHV0ID0gdmFsOyB9LFxuICBjb25maWd1cmFibGU6IHRydWVcbn0pO1xuXG4vLyBzdGFnZS5qcyDjgarjganjga7lpJbpg6jjgrnjgq/jg6rjg5fjg4jvvIjpnZ7lkIzmnJ/li5XnmoTjg63jg7zjg4nvvInjgoQgRTJFIOODhuOCueODiOOBqOOBruW+jOaWueS6kuaPm+eUqFxuKHdpbmRvdyBhcyBhbnkpLmhleFRvUmdiYSA9IGhleFRvUmdiYTtcbih3aW5kb3cgYXMgYW55KS5lc2NhcGVIdG1sID0gZXNjYXBlSHRtbDtcbih3aW5kb3cgYXMgYW55KS51cGRhdGVTbGFiU3BsaXQgPSB1cGRhdGVTbGFiU3BsaXQ7XG4od2luZG93IGFzIGFueSkudXBkYXRlQWxsU2xhYlNwbGl0cyA9IHVwZGF0ZUFsbFNsYWJTcGxpdHM7XG4od2luZG93IGFzIGFueSkuY2xlYXJWaXN1YWxTdGFnZVNwb3RsaWdodCA9IGNsZWFyVmlzdWFsU3RhZ2VTcG90bGlnaHQ7XG4od2luZG93IGFzIGFueSkuc2hvd1RvYXN0ID0gc2hvd1RvYXN0O1xuKHdpbmRvdyBhcyBhbnkpLmlzTW9kYWxPcGVuID0gaXNNb2RhbE9wZW47XG4od2luZG93IGFzIGFueSkuc2V0TW9kYWxPcGVuID0gc2V0TW9kYWxPcGVuO1xuKHdpbmRvdyBhcyBhbnkpLmZpbmRTY3JvbGxQYXJlbnQgPSBmaW5kU2Nyb2xsUGFyZW50O1xuKHdpbmRvdyBhcyBhbnkpLmZpdENhY2hlID0gZml0Q2FjaGU7XG4od2luZG93IGFzIGFueSkubWF0aENhY2hlID0gbWF0aENhY2hlO1xuKHdpbmRvdyBhcyBhbnkpLnN2Z0NhY2hlID0gc3ZnQ2FjaGU7XG4od2luZG93IGFzIGFueSkuRU1QVFlfR1VJREVfSFRNTCA9IEVNUFRZX0dVSURFX0hUTUw7XG5cblxuXG5cblxuIl0sCiAgIm1hcHBpbmdzIjogIjs7QUFBTyxXQUFTLFdBQVcsS0FBcUI7QUFDOUMsV0FBTyxPQUFPLEdBQUcsRUFBRSxRQUFRLFlBQVksU0FBTyxFQUFFLEtBQUssU0FBUyxLQUFLLFFBQVEsS0FBSyxRQUFRLEtBQUssVUFBVSxLQUFLLFFBQVEsR0FBRyxFQUFFLEtBQUssRUFBRTtBQUFBLEVBQ2xJOzs7QUNGTyxXQUFTLFVBQVUsS0FBYSxPQUF1QjtBQUM1RCxVQUFNLElBQUksU0FBUyxJQUFJLFFBQVEsS0FBSyxFQUFFLEdBQUcsRUFBRTtBQUMzQyxXQUFPLFFBQVMsS0FBSyxLQUFNLEdBQUcsS0FBTSxLQUFLLElBQUssR0FBRyxLQUFLLElBQUksR0FBRyxLQUFLLEtBQUs7QUFBQSxFQUN6RTs7O0FDRU8sTUFBTSxhQUFhLENBQUMsUUFBUSxZQUFZLFNBQVM7QUFDakQsTUFBTSxvQkFBb0I7QUFDMUIsTUFBTSxrQkFBa0I7QUFDeEIsTUFBTSxrQkFBa0I7QUFDeEIsTUFBTSx1QkFBdUIsT0FBTyxhQUFhLEtBQU07QUFDdkQsTUFBTSxlQUFlO0FBQ3JCLE1BQU0sZ0JBQW9DO0FBQUEsSUFDL0MsQ0FBQyxPQUFPLGdFQUFnRTtBQUFBLElBQ3hFLENBQUMsU0FBUyxvREFBb0Q7QUFBQSxJQUM5RCxDQUFDLFFBQVEscUpBQXFKO0FBQUEsRUFDaEs7QUFtQk8sV0FBUyxjQUFjLE1BQW9DO0FBQ2hFLFFBQUksTUFBTTtBQUNWLFFBQUksWUFBWTtBQUNoQixRQUFJLFFBQVE7QUFDWixRQUFJLElBQUk7QUFDUixXQUFPLElBQUksS0FBSyxRQUFRLEtBQUs7QUFDM0IsWUFBTSxLQUFLLEtBQUssQ0FBQztBQUNqQixZQUFNLE9BQU8sS0FBSyxJQUFJLENBQUMsS0FBSztBQUM1QixVQUFJ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
