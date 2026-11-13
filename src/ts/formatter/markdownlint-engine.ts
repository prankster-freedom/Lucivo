// markdownlint の自動修正で、表示崩れの原因になる記法の乱れを整える（FR-053, DD-FILE-089）。
// 文の中身や、作者が意図した字下げ・空行を変えるおそれのある規則は使わない。
import { lint } from 'markdownlint/sync';
import { applyFixes } from 'markdownlint';

// 使う規則だけを true にする。default: false で、ここに挙げない規則はすべて使わない
export const FIX_RULES = {
  default: false,
  // 見出しの # の後の空白がない（#見出し → # 見出し）
  MD018: true,
  // 見出しの # の後の空白が 2 つ以上
  MD019: true,
  // 見出しの前後の空行がない
  MD022: true,
  // コードブロックの前後の空行がない
  MD031: true,
  // リストの前後の空行がない
  MD032: true,
  // 表の前後の空行がない
  MD058: true,
  // 行末の空白（MD009）は、3 つ以上の空白をすべて消して改行が消えるため使わない（whitespace.ts で扱う）
  // 箇条書きの記号（- * +）を、文書の最初の記号にそろえる
  MD004: { style: 'consistent' },
  // 文書の最後の改行を 1 つにする
  MD047: true
};

export interface LintFixResult {
  text: string;
  fixes: number;
}

// 1 回の修正で、新しく見出しやリストになった行への指摘が次の回に出ることがある
// （#見出し → # 見出し にすると、その後の空行の指摘が出る）。変わらなくなるまで繰り返す
const MAX_PASSES = 4;

export function fixWithMarkdownlint(text: string): LintFixResult {
  let current = text;
  let fixes = 0;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const results = lint({ strings: { doc: current }, config: FIX_RULES, handleRuleFailures: true });
    const errors = (results.doc || []).filter(e => e.fixInfo);
    if (errors.length === 0) break;
    const next = applyFixes(current, errors);
    if (next === current) break;
    fixes += errors.length;
    current = next;
  }
  return { text: current, fixes };
}
