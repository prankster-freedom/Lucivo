// パイプで書いた表（GFM）の列をそろえる（FR-053, DD-FILE-090）。
// 表示は変えず、エディタで読みやすくするための整形。コードブロックとフロントマターの中は触らない。
// 次の表は、意図を壊さないよう、そろえずにそのまま残す:
//   - 行頭が字下げ・引用（>）・リストの中にある表（入れ子の中は列の位置の意味が変わるため）
//   - 区切りの行と見出しの行で列の数が違う表（GFM の表として成り立たない）

const DELIMITER_CELL = /^:?-+:?$/;

// 等幅で表示したときの幅。全角の文字（CJK・全角記号・ハングル・多くの絵文字）は 2 とする
export function displayWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp === 0x200b || (cp >= 0x0300 && cp <= 0x036f) || (cp >= 0xfe00 && cp <= 0xfe0f)) continue;
    width += isWide(cp) ? 2 : 1;
  }
  return width;
}

function isWide(cp: number): boolean {
  return (cp >= 0x1100 && cp <= 0x115f)
    || (cp >= 0x2e80 && cp <= 0x303e)
    || (cp >= 0x3041 && cp <= 0x33ff)
    || (cp >= 0x3400 && cp <= 0x4dbf)
    || (cp >= 0x4e00 && cp <= 0x9fff)
    || (cp >= 0xa000 && cp <= 0xa4cf)
    || (cp >= 0xac00 && cp <= 0xd7a3)
    || (cp >= 0xf900 && cp <= 0xfaff)
    || (cp >= 0xfe30 && cp <= 0xfe4f)
    || (cp >= 0xff00 && cp <= 0xff60)
    || (cp >= 0xffe0 && cp <= 0xffe6)
    || (cp >= 0x1f300 && cp <= 0x1faff)
    || (cp >= 0x20000 && cp <= 0x3fffd);
}

// 表の 1 行をセルに分ける。GFM と同じく、\| だけを区切りにしない
// （バッククォートで囲んだコードの中の | も、GFM では列の区切りになる。表示と同じ解釈でそろえる）
export function splitRow(line: string): string[] {
  let body = line.trim();
  if (body.startsWith('|')) body = body.slice(1);
  if (body.endsWith('|') && !body.endsWith('\\|')) body = body.slice(0, -1);
  const cells: string[] = [];
  let current = '';
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '\\' && i + 1 < body.length) {
      current += ch + body[i + 1];
      i++;
      continue;
    }
    if (ch === '|') {
      cells.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

function isDelimiterRow(line: string): boolean {
  if (!line.includes('-')) return false;
  const cells = splitRow(line);
  return cells.length > 0 && cells.every(c => DELIMITER_CELL.test(c));
}

// 字下げなしで始まり、| を含む行だけを表の行とみなす
function isTableLine(line: string): boolean {
  return line.length > 0 && !/^\s/.test(line) && !line.startsWith('>') && line.includes('|');
}

function alignTable(lines: string[]): string[] {
  const rows = lines.map(splitRow);
  const columns = rows[1].length;
  if (rows[0].length !== columns) return lines;
  const aligns = rows[1].map(c => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : 'none'));
  // 区切りの行より列の多い行は、余りのセルを最後の列にまとめずに残すため、列の数を行ごとに保つ
  const widths = new Array(columns).fill(3);
  rows.forEach((cells, r) => {
    if (r === 1) return;
    cells.slice(0, columns).forEach((cell, c) => { widths[c] = Math.max(widths[c], displayWidth(cell)); });
  });
  return rows.map((cells, r) => {
    if (r === 1) {
      const parts = widths.map((w, c) => {
        const a = aligns[c];
        const dashes = w - (a === 'center' ? 2 : a === 'none' ? 0 : 1);
        return `${a === 'left' || a === 'center' ? ':' : ''}${'-'.repeat(Math.max(1, dashes))}${a === 'right' || a === 'center' ? ':' : ''}`;
      });
      return `| ${parts.join(' | ')} |`;
    }
    // 右揃えの列は左を、それ以外は右を空白で埋める（エディタで読んだときも、表示と同じ側に寄せる）
    const padded = cells.map((cell, c) => {
      if (c >= columns) return cell;
      const space = ' '.repeat(Math.max(0, widths[c] - displayWidth(cell)));
      return aligns[c] === 'right' ? space + cell : cell + space;
    });
    while (padded.length < columns) padded.push(' '.repeat(widths[padded.length]));
    return `| ${padded.join(' | ')} |`;
  });
}

// 表をそろえた文書と、そろえた表の数を返す
export function alignTables(text: string): { text: string; tables: number } {
  const lines = text.split('\n');
  const out: string[] = [];
  let fence: string | null = null;
  let tables = 0;
  let i = 0;
  // 先頭のフロントマター（--- で囲んだ YAML）はそのまま残す
  if (lines[0] === '---') {
    const end = lines.indexOf('---', 1);
    if (end > 0) {
      out.push(...lines.slice(0, end + 1));
      i = end + 1;
    }
  }
  for (; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
      out.push(line);
      continue;
    }
    if (fence === null && isTableLine(line) && i + 1 < lines.length && isTableLine(lines[i + 1]) && isDelimiterRow(lines[i + 1])) {
      let end = i + 2;
      while (end < lines.length && isTableLine(lines[end])) end++;
      const block = lines.slice(i, end);
      const aligned = alignTable(block);
      if (aligned.join('\n') !== block.join('\n')) tables++;
      out.push(...aligned);
      i = end - 1;
      continue;
    }
    out.push(line);
  }
  return { text: out.join('\n'), tables };
}
