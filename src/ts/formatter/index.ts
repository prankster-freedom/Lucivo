// Markdown の整形の入口（FR-053, DD-FILE-088）。js/formatter.js として別にビルドし、
// 文書を読み込むとき（または「今の文書を整える」を押したとき）だけ読み込む（NFR-006）。
// アプリは window.LucivoFormatter.format() だけを呼ぶ。エンジン（markdownlint・表の整列）を
// 差し替えるときは、この入口の format() の中身だけを変える（プラガブルな構成）。
import { fixWithMarkdownlint } from './markdownlint-engine';
import { alignTables } from './table-align';
import { trimTrailingSpaces } from './whitespace';

export interface FormatResult {
  // 整えた文書
  text: string;
  // 変わったかどうか
  changed: boolean;
  // markdownlint で直した箇所の数
  fixes: number;
  // 列をそろえた表の数
  tables: number;
}

export function format(markdown: string): FormatResult {
  const source = String(markdown);
  const linted = fixWithMarkdownlint(source);
  const trimmed = trimTrailingSpaces(linted.text);
  const aligned = alignTables(trimmed.text);
  return {
    text: aligned.text,
    changed: aligned.text !== source,
    fixes: linted.fixes + trimmed.fixes,
    tables: aligned.tables
  };
}

(window as unknown as { LucivoFormatter: { format: typeof format } }).LucivoFormatter = { format };
