// 行末の不要な空白を取り除く（FR-053, DD-FILE-089）。表示を変えないことを最優先にする。
// 段落の中で次の行が続くときの、2 つ以上の空白は改行（ハードブレーク）の印なので、2 つにそろえて残す。
// markdownlint の MD009 は 3 つ以上の空白をすべて消し、改行が消えて表示が変わるため使わない。
// コードブロック（``` / ~~~ で囲んだ部分）の中は、空白も内容なので触らない。

export function trimTrailingSpaces(text: string): { text: string; fixes: number } {
  const lines = text.split('\n');
  let fence: string | null = null;
  let fixes = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fenceMatch = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1];
      if (fence === null) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length && line.trim() === marker) fence = null;
    } else if (fence !== null) {
      continue;
    }
    const match = / +$/.exec(line);
    if (!match) continue;
    const body = line.slice(0, match.index);
    const next = lines[i + 1];
    const continues = body.trim() !== '' && next !== undefined && next.trim() !== '' && !/^\s*#/.test(body) && fence === null;
    const replaced = continues && match[0].length >= 2 ? `${body}  ` : body;
    if (replaced !== line) {
      lines[i] = replaced;
      fixes++;
    }
  }
  return { text: lines.join('\n'), fixes };
}
