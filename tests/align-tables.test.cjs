/**
 * tests/align-tables.test.cjs
 *
 * agents-support-tools/md-table-align/align-tables.cjs の単体テスト（#165）。
 * 実行: node tests/align-tables.test.cjs
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const TOOL = path.join(__dirname, '..', 'agents-support-tools', 'md-table-align', 'align-tables.cjs');

function align(text) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'align-tables-'));
  const file = path.join(dir, 'in.md');
  try {
    fs.writeFileSync(file, text, 'utf8');
    execFileSync('node', [TOOL, file], { stdio: 'pipe' });
    return fs.readFileSync(file, 'utf8');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// \| は列の区切りにしない。列が増えず、\| がそのまま残る
const escaped = align('| 列A | 列B |\n| :-- | :-- |\n| `ls \\| grep .md` | x |\n| a | b \\|\n');
const rows = escaped.trimEnd().split('\n');
assert.strictEqual(rows.length, 4);
rows.forEach(row => {
  // 区切りのパイプ（\| を除く）は、先頭・列の間・末尾の 3 つ
  assert.strictEqual(row.replace(/\\\|/g, '').split('|').length - 1, 3, row);
});
assert.ok(rows[2].includes('`ls \\| grep .md`'));
assert.ok(rows[3].includes('b \\|'));

// 整形は冪等（もう一度通しても変わらない）
assert.strictEqual(align(escaped), escaped);

// 通常の表は、これまでどおり列がそろう
const plain = align('| a | b |\n| - | - |\n| long | x |\n').trimEnd().split('\n');
assert.ok(plain.every(row => row.length === plain[0].length), plain.join('\n'));

console.log('align-tables.test.cjs: ok');
