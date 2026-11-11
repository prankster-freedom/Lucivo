// Markdown ファイルのバイト列を、文字コードを判定して文字列にし、改行コードを LF にそろえる（FR-048, DD-FILE-082, 083）

export type NewlineKind = 'LF' | 'CRLF' | 'CR' | 'mixed' | 'none';

export interface DecodedText {
  text: string;
  // 表示用の文字コード名（UTF-8 / UTF-8 (BOM) / UTF-16LE / UTF-16BE / Shift_JIS / EUC-JP / ISO-2022-JP）
  encoding: string;
  // 元の改行コード
  newline: NewlineKind;
}

// UTF-8 として正しくないときに試す文字コード。WHATWG の shift_jis は Windows-31J（CP932）を含む
const LEGACY_CANDIDATES: Array<[string, string]> = [['shift_jis', 'Shift_JIS'], ['euc-jp', 'EUC-JP']];
// 見えない文字・紛らわしい文字は、ソースに直接書かず、符号位置から作る（npm run lint、AGENTS.repo.md 3 章）
const ch = (code: number): string => String.fromCharCode(code);
const BOM_CHAR = ch(0xFEFF);
const REPLACEMENT = new RegExp(ch(0xFFFD), 'g');
// Shift_JIS と EUC-JP を取り違えると、半角カタカナや見慣れない漢字の並びが多く出る
const HALFWIDTH_KANA = new RegExp(`[${ch(0xFF61)}-${ch(0xFF9F)}]`, 'g');
// ISO-2022-JP の文字集合の切り替え（ESC $ B、ESC $ @、ESC ( J など）
const ISO2022_ESCAPE = new RegExp(`${ch(0x1B)}[$(][@BJ]`);

function decodeWith(label: string, bytes: Uint8Array, fatal = false): string {
  return new TextDecoder(label, { fatal }).decode(bytes);
}

function countMatches(text: string, re: RegExp): number {
  const m = text.match(re);
  return m ? m.length : 0;
}

// 文字コードを判定して文字列にする。BOM、UTF-8 として正しいか、ISO-2022-JP の切り替え、Shift_JIS と EUC-JP の読みやすさの順に見る
function decodeBytes(bytes: Uint8Array): { text: string; encoding: string } {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return { text: decodeWith('utf-8', bytes.subarray(3)), encoding: 'UTF-8 (BOM)' };
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return { text: decodeWith('utf-16le', bytes.subarray(2)), encoding: 'UTF-16LE' };
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return { text: decodeWith('utf-16be', bytes.subarray(2)), encoding: 'UTF-16BE' };
  }
  let utf8: string | null = null;
  try {
    utf8 = decodeWith('utf-8', bytes, true);
  } catch (_) {
    utf8 = null;
  }
  if (utf8 !== null) {
    // ISO-2022-JP は 7 ビットの文字だけで書くため、UTF-8 としても正しく読めてしまう
    if (ISO2022_ESCAPE.test(utf8)) return { text: decodeWith('iso-2022-jp', bytes), encoding: 'ISO-2022-JP' };
    return { text: utf8, encoding: 'UTF-8' };
  }
  // 置き換え文字（読めなかった文字）が少ないほうを選ぶ。同じなら、半角カタカナが少ないほうを選ぶ
  let best: { text: string; encoding: string; score: number } | null = null;
  for (const [label, name] of LEGACY_CANDIDATES) {
    const text = decodeWith(label, bytes);
    const score = countMatches(text, REPLACEMENT) * 1000 + countMatches(text, HALFWIDTH_KANA);
    if (!best || score < best.score) best = { text, encoding: name, score };
  }
  return { text: best!.text, encoding: best!.encoding };
}

export function detectNewline(text: string): NewlineKind {
  const crlf = countMatches(text, /\r\n/g);
  const cr = countMatches(text, /\r(?!\n)/g);
  const lf = countMatches(text, /(?<!\r)\n/g);
  const kinds = [crlf > 0, cr > 0, lf > 0].filter(Boolean).length;
  if (kinds === 0) return 'none';
  if (kinds > 1) return 'mixed';
  return crlf ? 'CRLF' : cr ? 'CR' : 'LF';
}

// 改行コードを LF にそろえ、先頭の BOM の文字を除く
export function normalizeText(text: string): string {
  return (text.startsWith(BOM_CHAR) ? text.slice(1) : text).replace(/\r\n?/g, '\n');
}

export function decodeMarkdown(buffer: ArrayBuffer): DecodedText {
  const { text, encoding } = decodeBytes(new Uint8Array(buffer));
  return { text: normalizeText(text), encoding, newline: detectNewline(text) };
}

// UTF-8 系として読んだか（保存すると文字コードが変わるかの判定に使う）
export function isUtf8Family(encoding: string): boolean {
  return encoding === 'UTF-8' || encoding === 'UTF-8 (BOM)';
}
