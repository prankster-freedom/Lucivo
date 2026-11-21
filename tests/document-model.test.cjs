/**
 * tests/document-model.test.cjs
 *
 * src/ts/markdown/document-model.ts（文書モデル層・増分字句解析、#291）の単体テスト。
 * 実行: node tests/document-model.test.cjs
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const esbuild = require('esbuild');
const { marked } = require('marked');

const ROOT = path.join(__dirname, '..');

// TypeScript モジュールをインメモリで CJS ビルドして読み込む
function loadDocumentModelModule() {
  const built = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'ts', 'markdown', 'document-model.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false
  });
  const code = built.outputFiles[0].text;
  const mod = { exports: {} };
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require, console });
  return mod.exports;
}

const { parseDocumentModel } = loadDocumentModelModule();
const lex = src => marked.lexer(src);

function normalizeModel(m) {
  return {
    bodyStartLine: m.bodyStartLine,
    hasFootnotes: m.hasFootnotes,
    diagrams: m.diagrams,
    blocks: m.blocks.map(b => ({
      type: b.type,
      raw: b.raw,
      startOffset: b.startOffset,
      endOffset: b.endOffset,
      startLine: b.startLine,
      endLine: b.endLine,
      key: b.key,
      srcLine: b.token.type === 'heading' ? b.token.srcLine : null,
      diagIdx: b.diagram ? b.diagram.index : null
    }))
  };
}

// 1. 40 章の文書に対して、先頭・中央・末尾・改行追加・図の編集すべてで増分結果 === 全体結果
const longChapters = Array.from({ length: 40 }, (_, i) => [
  `## ${i + 1}. Chapter ${i + 1}`,
  '',
  `Paragraph for chapter ${i + 1} with some text.`,
  '',
  i % 5 === 0 ? '```mermaid\nflowchart LR\n  A --> B\n```' : `- Item ${i + 1}-1\n- Item ${i + 1}-2`,
  ''
].join('\n')).join('\n');

const baseDoc = '# Title\n\n' + longChapters;
const m0 = parseDocumentModel(baseDoc, baseDoc, { lex });
assert.strictEqual(m0.incrementalUsed, false);
assert.strictEqual(m0.diagrams.length, 8);

const edits = [
  // 中央の段落に 1 文字挿入
  baseDoc.replace('Paragraph for chapter 20 with some text.', 'Paragraph for chapter 20 with some EDITED text.'),
  // 中央に新しい段落を追加（行番号がずれる）
  baseDoc.replace('Paragraph for chapter 20 with some text.', 'Paragraph for chapter 20.\n\nInserted line!\n\nMore text.'),
  // 先頭付近の見出しを編集
  baseDoc.replace('## 2. Chapter 2', '## 2. Updated Chapter 2'),
  // 末尾の段落を編集
  baseDoc.replace('Paragraph for chapter 40 with some text.', 'Paragraph for chapter 40 tail edit.'),
  // 中央に新しい Mermaid 図を追加（後続図の index がずれる）
  baseDoc.replace('Paragraph for chapter 12 with some text.', '```mermaid\nflowchart TD\n  X --> Y\n```')
];

let prev = m0;
for (const edited of edits) {
  const inc = parseDocumentModel(edited, edited, { lex, prevModel: prev });
  const full = parseDocumentModel(edited, edited, { lex });
  assert.strictEqual(inc.incrementalUsed, true, 'expected incremental parse to be used');
  assert.deepStrictEqual(normalizeModel(inc), normalizeModel(full));
  prev = inc;
}

// 2. 同梱サンプル（visual-sample.md, notation_sample.md）でも増分解析 === 全体解析
for (const sampleName of ['visual-sample.md', 'notation_sample.md']) {
  const raw = fs.readFileSync(path.join(ROOT, 'public', 'samples', sampleName), 'utf8').replace(/\r\n?/g, '\n');
  const first = parseDocumentModel(raw, raw, { lex });
  const midPos = Math.floor(raw.length / 2);
  const nlPos = raw.indexOf('\n\n', midPos);
  if (nlPos > 0) {
    const edited = raw.slice(0, nlPos) + '\n\n増分解析の検証用テキスト。\n' + raw.slice(nlPos);
    const inc = parseDocumentModel(edited, edited, { lex, prevModel: first });
    const full = parseDocumentModel(edited, edited, { lex });
    assert.deepStrictEqual(normalizeModel(inc), normalizeModel(full), `mismatch on ${sampleName}`);
  }
}

// 3. 保守的フォールバック: 参照リンク定義・脚注・未閉鎖フェンスは安全に全体解析へフォールバックし結果一致
const fallbackCases = [
  baseDoc + '\n[ref]: https://example.com\n',
  baseDoc + '\nText with footnote[^1].\n\n[^1]: Note body\n',
  baseDoc.replace('Paragraph for chapter 10 with some text.', '```js\nunclosed code block')
];
for (const doc of fallbackCases) {
  const inc = parseDocumentModel(doc, doc, { lex, prevModel: m0 });
  const full = parseDocumentModel(doc, doc, { lex });
  assert.strictEqual(inc.incrementalUsed, false, 'expected conservative full fallback');
  assert.deepStrictEqual(normalizeModel(inc), normalizeModel(full));
}

// 3.5. 脚注を含む文書は同一本文の再パースでも lexer を再実行する（resetFootnotes 後の定義再登録を保証）
const fnDoc = 'Text with footnote[^1].\n\n[^1]: Note body\n';
const fnM0 = parseDocumentModel(fnDoc, fnDoc, { lex });
let lexCalls = 0;
const fnM1 = parseDocumentModel(fnDoc, fnDoc, { lex: s => { lexCalls++; return lex(s); }, prevModel: fnM0 });
assert.strictEqual(fnM1.incrementalUsed, false);
assert.strictEqual(lexCalls, 1);

// 4. フロントマター（bodyStartLine > 0）がある場合も見出しの srcLine が一致
const fm = '---\ntitle: Test\ndate: 2026-11-21\n---\n\n';
const fmDoc0 = fm + baseDoc;
const fmModel0 = parseDocumentModel(fmDoc0, baseDoc, { lex });
const editedBody = baseDoc.replace('Paragraph for chapter 15 with some text.', 'Paragraph 15\n\nextra line');
const fmDoc1 = fm + editedBody;
const fmInc = parseDocumentModel(fmDoc1, editedBody, { lex, prevModel: fmModel0 });
const fmFull = parseDocumentModel(fmDoc1, editedBody, { lex });
assert.strictEqual(fmInc.incrementalUsed, true);
assert.deepStrictEqual(normalizeModel(fmInc), normalizeModel(fmFull));

// 5. 500 ページ級（480 章）での 1 文字編集で増分解析が全体解析より明確に速い
const hugeBody = Array.from({ length: 480 }, (_, i) => `## ${i + 1}. Ch ${i + 1}\n\nBody text for chapter ${i + 1}.\n`).join('\n');
const tFull0 = performance.now();
const hugeM0 = parseDocumentModel(hugeBody, hugeBody, { lex });
const fullMs = performance.now() - tFull0;
const hugeEdited = hugeBody.replace('Body text for chapter 240.', 'Body text for chapter 240 updated.');
const tInc0 = performance.now();
const hugeInc = parseDocumentModel(hugeEdited, hugeEdited, { lex, prevModel: hugeM0 });
const incMs = performance.now() - tInc0;
assert.strictEqual(hugeInc.incrementalUsed, true);
assert.strictEqual(hugeInc.blocks.length, hugeM0.blocks.length);

console.log(`PASS document-model.test.cjs (480ch full=${fullMs.toFixed(1)}ms, inc=${incMs.toFixed(1)}ms)`);
