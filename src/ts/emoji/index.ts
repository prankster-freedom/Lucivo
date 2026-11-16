// 絵文字ショートコードの対応表の入口（FR-058、DD-MD-070〜072）。js/emoji.js として別にビルドし、
// ショートコード（:rocket: など）を含む文書を描くときだけ読み込む（NFR-006）。
// 表は GitHub と同じ gemoji（MIT）。アプリは window.LucivoEmoji.lookup() だけを呼ぶ。
import { nameToEmoji } from 'gemoji';

export function lookup(name: string): string | undefined {
  return Object.prototype.hasOwnProperty.call(nameToEmoji, name) ? nameToEmoji[name] : undefined;
}

(window as unknown as { LucivoEmoji: { lookup: typeof lookup } }).LucivoEmoji = { lookup };
