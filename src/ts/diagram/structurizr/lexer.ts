/* ==========================================================================
   Structurizr DSL 字句解析器（行・列番号付き、依存ゼロ）
   コメント（//, #, block）、文字列リテラル（\" / \n / \\）、記号（{ } = ->）、
   改行トークンを生成する。
   ========================================================================== */
import { StructurizrSyntaxError } from './types';

export type TokenType =
  | 'WORD'
  | 'STRING'
  | 'LBRACE'
  | 'RBRACE'
  | 'EQUALS'
  | 'ARROW'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

function readQuotedString(src: string, start: number, line: number, col: number): {
  value: string;
  nextIndex: number;
  nextLine: number;
  nextCol: number;
} {
  let i = start + 1;
  let curLine = line;
  let curCol = col + 1;
  let out = '';

  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      if (i + 1 >= src.length) {
        throw new StructurizrSyntaxError('文字列リテラルが閉じられていません', line, col);
      }
      const next = src[i + 1];
      if (next === 'n') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === '"') out += '"';
      else if (next === '\\') out += '\\';
      else out += next;
      i += 2;
      curCol += 2;
      continue;
    }
    if (ch === '"') {
      return { value: out, nextIndex: i + 1, nextLine: curLine, nextCol: curCol + 1 };
    }
    if (ch === '\n') {
      out += '\n';
      i += 1;
      curLine += 1;
      curCol = 1;
      continue;
    }
    if (ch === '\r') {
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
    curCol += 1;
  }

  throw new StructurizrSyntaxError('文字列リテラルが閉じられていません', line, col);
}

function skipBlockComment(src: string, start: number, line: number, col: number): {
  nextIndex: number;
  nextLine: number;
  nextCol: number;
} {
  let i = start + 2;
  let curLine = line;
  let curCol = col + 2;

  while (i < src.length) {
    if (src[i] === '*' && src[i + 1] === '/') {
      return { nextIndex: i + 2, nextLine: curLine, nextCol: curCol + 2 };
    }
    if (src[i] === '\n') {
      curLine += 1;
      curCol = 1;
    } else {
      curCol += 1;
    }
    i += 1;
  }

  throw new StructurizrSyntaxError('ブロックコメントが閉じられていません', line, col);
}

function isWordBoundary(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n'
    || ch === '{' || ch === '}' || ch === '=' || ch === '"';
}

export function tokenizeStructurizrDsl(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;

  while (i < source.length) {
    const ch = source[i];

    if (ch === ' ' || ch === '\t' || ch === '\r') {
      i += 1;
      col += 1;
      continue;
    }

    if (ch === '\n') {
      tokens.push({ type: 'NEWLINE', value: '\n', line, column: col });
      i += 1;
      line += 1;
      col = 1;
      continue;
    }

    // 行コメント: // ... または # ...（ただし #HEX カラー値でない行頭/空白後の # はコメント）
    if ((ch === '/' && source[i + 1] === '/') || (ch === '#' && !/^#[0-9a-fA-F]{3,8}(?:[\s}]|$)/.test(source.slice(i, i + 12)))) {
      while (i < source.length && source[i] !== '\n') {
        i += 1;
        col += 1;
      }
      continue;
    }

    // ブロックコメント: /* ... */
    if (ch === '/' && source[i + 1] === '*') {
      const skipped = skipBlockComment(source, i, line, col);
      i = skipped.nextIndex;
      line = skipped.nextLine;
      col = skipped.nextCol;
      continue;
    }

    if (ch === '{') {
      tokens.push({ type: 'LBRACE', value: '{', line, column: col });
      i += 1;
      col += 1;
      continue;
    }

    if (ch === '}') {
      tokens.push({ type: 'RBRACE', value: '}', line, column: col });
      i += 1;
      col += 1;
      continue;
    }

    if (ch === '=') {
      tokens.push({ type: 'EQUALS', value: '=', line, column: col });
      i += 1;
      col += 1;
      continue;
    }

    if (ch === '-' && source[i + 1] === '>') {
      tokens.push({ type: 'ARROW', value: '->', line, column: col });
      i += 2;
      col += 2;
      continue;
    }

    if (ch === '"') {
      const str = readQuotedString(source, i, line, col);
      tokens.push({ type: 'STRING', value: str.value, line, column: col });
      i = str.nextIndex;
      line = str.nextLine;
      col = str.nextCol;
      continue;
    }

    // 通常トークン（識別子・キーワード・数値・色コード・URL・!directive・${VAR} 置換等）
    const startCol = col;
    let word = '';
    while (i < source.length && !isWordBoundary(source[i])) {
      if (source[i] === '-' && source[i + 1] === '>') break;
      if (source[i] === '/' && (source[i + 1] === '/' || source[i + 1] === '*')) break;
      // 引用符なしの ${NAME} 定数参照をブロック記号 { } と誤認しないよう一体で読み込む
      if (source[i] === '$' && source[i + 1] === '{') {
        const refMatch = /^\$\{[a-zA-Z0-9_-]+\}/.exec(source.slice(i));
        if (refMatch) {
          word += refMatch[0];
          i += refMatch[0].length;
          col += refMatch[0].length;
          continue;
        }
      }
      word += source[i];
      i += 1;
      col += 1;
    }
    if (word) {
      tokens.push({ type: 'WORD', value: word, line, column: startCol });
    }
  }

  tokens.push({ type: 'EOF', value: '', line, column: col });
  return tokens;
}
