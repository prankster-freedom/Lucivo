// @ts-nocheck
// コードブロックのシンタックスハイライト（FR-065, DTP-VTPL-038, DD-MD-025, #330）
// 外部ライブラリを追加せず（0 依存・完全オフライン NFR-008・起動軽量 NFR-006）、
// 言語別のトークナイザーで .hl-kw / .hl-str / .hl-num / .hl-cmt / .hl-fn / .hl-type / .hl-attr / .hl-op の span を生成する。
// テキストノードの文字自体は一切増減させないため、コピー（code.textContent）や内容一致（TC-VTPL-003）を完全に保つ。
import { escapeHtml } from '../utils/escape';

export type SyntaxTokenKind = 'kw' | 'str' | 'num' | 'cmt' | 'fn' | 'type' | 'attr' | 'op';

const LANG_FAMILY: Record<string, string> = {
  js: 'clike', javascript: 'clike', mjs: 'clike', cjs: 'clike', jsx: 'clike',
  ts: 'clike', typescript: 'clike', tsx: 'clike',
  py: 'python', python: 'python',
  rb: 'ruby', ruby: 'ruby',
  sh: 'shell', bash: 'shell', shell: 'shell', zsh: 'shell', console: 'shell',
  ps1: 'shell', powershell: 'shell',
  json: 'json', jsonc: 'json',
  yml: 'yaml', yaml: 'yaml', toml: 'yaml', ini: 'yaml',
  html: 'markup', xml: 'markup', svg: 'markup', vue: 'markup', svelte: 'markup',
  css: 'css', scss: 'css', less: 'css',
  sql: 'sql',
  md: 'markdown', markdown: 'markdown',
  diff: 'diff', patch: 'diff',
  c: 'clike', cpp: 'clike', 'c++': 'clike', h: 'clike', hpp: 'clike',
  cs: 'clike', csharp: 'clike',
  java: 'clike', kt: 'clike', kotlin: 'clike', scala: 'clike',
  go: 'clike', golang: 'clike',
  rs: 'clike', rust: 'clike',
  swift: 'clike', dart: 'clike', php: 'clike'
};

const CLIKE_KEYWORDS = new Set([
  'async', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'finally', 'for', 'from', 'function', 'get',
  'if', 'implements', 'import', 'in', 'instanceof', 'interface', 'let', 'new', 'of', 'package',
  'private', 'protected', 'public', 'readonly', 'return', 'set', 'static', 'super', 'switch',
  'this', 'throw', 'try', 'type', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  // Rust / Go / C / Java / Python shared
  'fn', 'pub', 'mut', 'impl', 'trait', 'struct', 'match', 'use', 'mod', 'crate', 'where', 'move',
  'func', 'defer', 'go', 'chan', 'select', 'fallthrough', 'range',
  'def', 'elif', 'except', 'lambda', 'nonlocal', 'pass', 'raise', 'assert', 'del', 'global', 'is', 'not', 'and', 'or',
  'val', 'override', 'sealed', 'data', 'object', 'companion', ' throws', 'synchronized', 'volatile', 'transient',
  'virtual', 'namespace', 'template', 'typename', 'constexpr', 'noexcept', 'nullptr', 'sizeof'
]);

const CLIKE_LITERALS = new Set([
  'true', 'false', 'null', 'undefined', 'NaN', 'Infinity', 'True', 'False', 'None', 'nil', 'self', 'Self'
]);

const SQL_KEYWORDS = new Set([
  'select', 'from', 'where', 'insert', 'into', 'values', 'update', 'set', 'delete', 'create', 'table',
  'alter', 'drop', 'index', 'view', 'join', 'inner', 'left', 'right', 'full', 'outer', 'on', 'as',
  'and', 'or', 'not', 'in', 'is', 'null', 'like', 'between', 'exists', 'group', 'by', 'order', 'asc',
  'desc', 'having', 'limit', 'offset', 'union', 'all', 'distinct', 'case', 'when', 'then', 'else',
  'end', 'primary', 'key', 'foreign', 'references', 'default', 'constraint', 'unique', 'check',
  'begin', 'commit', 'rollback', 'transaction', 'with', 'returning', 'count', 'sum', 'avg', 'min', 'max'
]);

const SHELL_KEYWORDS = new Set([
  'if', 'then', 'else', 'elif', 'fi', 'for', 'in', 'do', 'done', 'while', 'until', 'case', 'esac',
  'function', 'return', 'exit', 'export', 'local', 'readonly', 'set', 'unset', 'shift', 'source',
  'echo', 'printf', 'cd', 'pwd', 'ls', 'cp', 'mv', 'rm', 'mkdir', 'cat', 'grep', 'sed', 'awk',
  'find', 'xargs', 'curl', 'wget', 'tar', 'zip', 'unzip', 'chmod', 'chown', 'sudo',
  'git', 'npm', 'npx', 'node', 'python', 'pip', 'docker', 'gh', 'cargo', 'go', 'make'
]);

function wrapToken(kind: SyntaxTokenKind, text: string): string {
  if (!text) return '';
  return `<span class="hl-${kind}">${escapeHtml(text)}</span>`;
}

// C 系 / JS / TS / Python / Ruby / Shell 共通のシングルトン走査トークナイザー
const TOKEN_MASTER_RE = new RegExp([
  // 1: 行コメント・ブロックコメント
  '(\\/\\*[^]*?\\*\\/|\\/\\/[^\\n]*|#(?!!\\[)[^\\n]*)',
  // 2: 文字列（テンプレートリテラル・三連クォート・単/複クォート）
  '("""[^]*?"""|\'\'\'[^]*?\'\'\'|`(?:\\\\[^]|[^\\\\`])*`|"(?:\\\\[^]|[^\\\\"\\n])*"|\'(?:\\\\[^]|[^\\\\\'\\n])*\')',
  // 3: デコレータ・アノテーション・シェル変数
  '(@[A-Za-z_][A-Za-z0-9_.]*|\\$\\{?[A-Za-z_][A-Za-z0-9_]*\\}?)',
  // 4: 数値リテラル（16進・2進・浮動小数・単位付き）
  '(\\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?[\\d_]+)?[a-zA-Z%]*\\b))',
  // 5: 識別子（直後に ( が続くかの判定は後続で行う）
  '(\\b[A-Za-z_][A-Za-z0-9_]*\\b)',
  // 6: 演算子・矢印
  '(=>|->|::|\\.{3}|[+\\-*/%&|^~<>!=]=?)'
].join('|'), 'g');

function highlightCodelike(code: string, family: string): string {
  let out = '';
  let lastIndex = 0;
  TOKEN_MASTER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN_MASTER_RE.exec(code)) !== null) {
    const idx = m.index;
    if (idx > lastIndex) {
      out += escapeHtml(code.slice(lastIndex, idx));
    }
    const full = m[0];
    const [/* 0 */, cmt, str, attr, num, ident, op] = m;

    if (cmt !== undefined) {
      // C系では # はプリプロセッサまたはプライベート識別子として扱い、Python/Shell/Ruby ではコメントとして扱う
      if (cmt.startsWith('#') && family === 'clike') {
        out += wrapToken('attr', full);
      } else {
        out += wrapToken('cmt', full);
      }
    } else if (str !== undefined) {
      out += wrapToken('str', full);
    } else if (attr !== undefined) {
      out += wrapToken('attr', full);
    } else if (num !== undefined) {
      out += wrapToken('num', full);
    } else if (ident !== undefined) {
      const after = code.slice(idx + full.length);
      const isCall = /^\s*\(/.test(after);
      const lower = full.toLowerCase();
      if (family === 'sql' && SQL_KEYWORDS.has(lower)) {
        out += wrapToken('kw', full);
      } else if (family === 'shell' && SHELL_KEYWORDS.has(full)) {
        out += wrapToken('kw', full);
      } else if (family !== 'sql' && CLIKE_KEYWORDS.has(full)) {
        out += wrapToken('kw', full);
      } else if (CLIKE_LITERALS.has(full)) {
        out += wrapToken('num', full);
      } else if (/^[A-Z][A-Za-z0-9_]*$/.test(full)) {
        out += wrapToken('type', full);
      } else if (isCall) {
        out += wrapToken('fn', full);
      } else {
        out += escapeHtml(full);
      }
    } else if (op !== undefined) {
      out += wrapToken('op', full);
    } else {
      out += escapeHtml(full);
    }
    lastIndex = idx + full.length;
  }

  if (lastIndex < code.length) {
    out += escapeHtml(code.slice(lastIndex));
  }
  return out;
}

const JSON_TOKEN_RE = /(\/\/[^\n]*|\/\*[^]*?\*\/)|("(?:\\[^]|[^\\"\n])*")(\s*:)?|\b(true|false|null)\b|(-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)/g;

function highlightJson(code: string): string {
  let out = '';
  let lastIndex = 0;
  JSON_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = JSON_TOKEN_RE.exec(code)) !== null) {
    if (m.index > lastIndex) out += escapeHtml(code.slice(lastIndex, m.index));
    const [full, cmt, str, colon, lit, num] = m;
    if (cmt !== undefined) {
      out += wrapToken('cmt', full);
    } else if (str !== undefined) {
      if (colon !== undefined) {
        out += wrapToken('attr', str) + escapeHtml(colon);
      } else {
        out += wrapToken('str', str);
      }
    } else if (lit !== undefined || num !== undefined) {
      out += wrapToken('num', full);
    } else {
      out += escapeHtml(full);
    }
    lastIndex = m.index + full.length;
  }
  if (lastIndex < code.length) out += escapeHtml(code.slice(lastIndex));
  return out;
}

function highlightYaml(code: string): string {
  return code.split('\n').map(line => {
    if (/^\s*#/.test(line)) return wrapToken('cmt', line);
    const kv = /^(\s*(?:-\s+)?)([A-Za-z0-9_.-]+)(\s*:\s*)(.*)$/.exec(line);
    if (!kv) return highlightCodelike(line, 'shell');
    const [, indent, key, sep, rest] = kv;
    return escapeHtml(indent) + wrapToken('attr', key) + wrapToken('op', sep) + highlightCodelike(rest, 'shell');
  }).join('\n');
}

const MARKUP_RE = /(<!--[^]*?-->)|(<\/?)([A-Za-z][A-Za-z0-9:_-]*)([^>]*?)(\/?>)/g;
const ATTR_RE = /([A-Za-z_:][A-Za-z0-9:._-]*)(\s*=\s*)("(?:[^"]*)"|'(?:[^']*)'|[^\s"'>]+)?/g;

function highlightMarkup(code: string): string {
  let out = '';
  let lastIndex = 0;
  MARKUP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MARKUP_RE.exec(code)) !== null) {
    if (m.index > lastIndex) out += escapeHtml(code.slice(lastIndex, m.index));
    const [full, cmt, open, tag, attrs, close] = m;
    if (cmt !== undefined) {
      out += wrapToken('cmt', full);
    } else {
      let attrOut = '';
      let aLast = 0;
      ATTR_RE.lastIndex = 0;
      let am: RegExpExecArray | null;
      while ((am = ATTR_RE.exec(attrs)) !== null) {
        if (am.index > aLast) attrOut += escapeHtml(attrs.slice(aLast, am.index));
        const [aFull, aName, aEq, aVal] = am;
        if (aEq) {
          attrOut += wrapToken('attr', aName) + wrapToken('op', aEq) + (aVal ? wrapToken('str', aVal) : '');
        } else {
          attrOut += wrapToken('attr', aFull);
        }
        aLast = am.index + aFull.length;
      }
      if (aLast < attrs.length) attrOut += escapeHtml(attrs.slice(aLast));
      out += wrapToken('op', open) + wrapToken('kw', tag) + attrOut + wrapToken('op', close);
    }
    lastIndex = m.index + full.length;
  }
  if (lastIndex < code.length) out += escapeHtml(code.slice(lastIndex));
  return out;
}

const CSS_TOKEN_RE = /(\/\*[^]*?\*\/)|("(?:\\[^]|[^\\"\n])*"|'(?:\\[^]|[^\\'\n])*')|(@[a-zA-Z-]+)|(#[0-9a-fA-F]{3,8}\b|-?\b\d+(?:\.\d+)?(?:px|rem|em|vw|vh|%|s|ms|deg|fr)?\b)|([a-zA-Z-]+)(?=\s*:)/g;

function highlightCss(code: string): string {
  let out = '';
  let lastIndex = 0;
  CSS_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CSS_TOKEN_RE.exec(code)) !== null) {
    if (m.index > lastIndex) out += escapeHtml(code.slice(lastIndex, m.index));
    const [full, cmt, str, atRule, num, prop] = m;
    if (cmt !== undefined) out += wrapToken('cmt', full);
    else if (str !== undefined) out += wrapToken('str', full);
    else if (atRule !== undefined) out += wrapToken('kw', full);
    else if (num !== undefined) out += wrapToken('num', full);
    else if (prop !== undefined) out += wrapToken('attr', full);
    else out += escapeHtml(full);
    lastIndex = m.index + full.length;
  }
  if (lastIndex < code.length) out += escapeHtml(code.slice(lastIndex));
  return out;
}

function highlightDiff(code: string): string {
  return code.split('\n').map(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) return wrapToken('str', line);
    if (line.startsWith('-') && !line.startsWith('---')) return wrapToken('kw', line);
    if (line.startsWith('@@')) return wrapToken('fn', line);
    return escapeHtml(line);
  }).join('\n');
}

function highlightMarkdown(code: string): string {
  return code.split('\n').map(line => {
    if (/^\s*#{1,6}\s/.test(line)) return wrapToken('kw', line);
    if (/^\s*(?:```|~~~)/.test(line)) return wrapToken('attr', line);
    if (/^\s*>/.test(line)) return wrapToken('cmt', line);
    return escapeHtml(line);
  }).join('\n');
}

export function highlightCodeSyntax(rawCode: string, lang = ''): string {
  const cleanLang = String(lang || '').trim().toLowerCase().split(/[\s{]/)[0];
  const family = LANG_FAMILY[cleanLang] || 'clike';
  if (family === 'json') return highlightJson(rawCode);
  if (family === 'yaml') return highlightYaml(rawCode);
  if (family === 'markup') return highlightMarkup(rawCode);
  if (family === 'css') return highlightCss(rawCode);
  if (family === 'diff') return highlightDiff(rawCode);
  if (family === 'markdown') return highlightMarkdown(rawCode);
  return highlightCodelike(rawCode, family);
}

// コンテナ内の未ハイライト <pre><code> にシンタックスハイライトを適用する（直接書かれた HTML の <pre><code> 等のフォールバック）
export function applySyntaxHighlightInScope(container: ParentNode | null): void {
  if (!container) return;
  container.querySelectorAll('pre > code').forEach(codeEl => {
    if (codeEl.querySelector('span[class^="hl-"]')) return;
    if (codeEl.closest('.front-matter')) return;
    const m = /language-([a-z0-9_+-]+)/i.exec(codeEl.className || '');
    const lang = m ? m[1] : '';
    const raw = codeEl.textContent || '';
    if (!raw.trim()) return;
    codeEl.innerHTML = highlightCodeSyntax(raw, lang);
  });
}
