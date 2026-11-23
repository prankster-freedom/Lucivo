/**
 * tests/build-color-tone-tables.test.cjs
 *
 * tools/build-color-tone-tables.cjs の単体テスト。
 * この道具は、カラートーンの文書（doc/0.DTP/assets/color-tones/）を書き出すだけで、配布物のビルドには使わない。
 * そのため、変更しても E2E は走らせない（tools/resolve-affected-suites.cjs の DOC_PATTERNS）。
 * 変更の確認は、この単体テストで行う（npm run lint の test:unit。全 PR の lint ジョブで走る）。
 * 実行: node tests/build-color-tone-tables.test.cjs
 */
'use strict';

const assert = require('assert');
const { readTableRows, readBaseHexes, readTone, buildToneTable, buildListTable } = require('../tools/build-color-tone-tables.cjs');

const HEAD = '# 1. テスト\n\n## カラーコード一覧\n\n';
const TABLE_HEAD = '<table>\n<thead>\n<tr><th>役割と配色の組</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>\n</thead>\n<tbody>\n';
const TABLE_TAIL = '\n</tbody>\n</table>\n';
const set = (label, bg, ink, border, line) => `<small>${label} 背景 ${bg} 文字 ${ink} 境界 ${border} 線 ${line}</small>`;
const row = (role, token, sets, use) => `<tr><td>${role}<br>${sets}</td><td><code>${token}</code></td><td></td><td></td><td>${use}</td></tr>`;

const c1 = row('第 1 色（主役・テスト）', '--vs-c1', set('Light', '#3366AA', '#FFFFFF', '#888888', '#888888') + set('Dark', '#99BBEE', '#1E293B', '#666666', '#666666'), '見出し');
const canvas = row('ベース背景', '--diag-canvas', set('Light', '#FFFFFF', '#222222', '#888888', '#888888') + set('Dark', '#101820', '#EEEEEE', '#666666', '#666666'), '地色');
const doc = (...rows) => `${HEAD}${TABLE_HEAD}${rows.join('\n')}${TABLE_TAIL}`;

// 1. 新しい形式の表を読む。基本色の 6 行の枠がそろい、決まった順に並ぶ
{
  const tone = readTone(doc(c1, canvas));
  assert.deepStrictEqual(tone.rows.map(r => r.token), ['--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-c5', '--vs-c6', '--diag-canvas'], '基本色の 6 行がそろう');
  assert.strictEqual(tone.byToken['--vs-c1'].role, '第 1 色（主役・テスト）');
  assert.strictEqual(tone.byToken['--vs-c1'].light.bg, '#3366AA');
  assert.strictEqual(tone.byToken['--vs-c1'].dark.bg, '#99BBEE');
  assert.strictEqual(tone.byToken['--vs-c2'].light, null, '使わない基本色は未定義');
  assert.strictEqual(tone.byToken['--diag-canvas'].dark.ink, '#EEEEEE');
}

// 2. 書き出した表に、色の見本と、未定義の行が出る
{
  const html = buildToneTable(readTone(doc(c1, canvas)));
  assert.ok(html.includes('背景 #3366AA'), '1 列目に背景の色コードがある');
  assert.ok(/<small>\d+\.\d<\/small>/.test(html), '見本にコントラスト比がある');
  assert.strictEqual((html.match(/<small>未定義<\/small>/g) || []).length, 5, '第 2〜6 色は未定義');
}

// 3. 書き出した表を読み直して、もう一度書き出しても同じになる（何度実行しても同じ結果）
{
  const tone = readTone(doc(c1, canvas));
  const once = buildToneTable(tone);
  const tone2 = readTone(`${HEAD}${once}\n`);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(tone2)), JSON.parse(JSON.stringify(tone)), '読み直した内容が同じ');
  assert.strictEqual(buildToneTable(tone2), once, '2 回目の書き出しが同じ');
}

// 4. 背景の上で読めない文字色（コントラスト比 4.5 未満）は、見本に数字で出る。基本色の行には、文字色に使った場合の見本もある
{
  const weak = row('第 1 色（主役・淡色）', '--vs-c1', set('Light', '#F0F0F0', '#FFFFFF', '#888888', '#888888') + set('Dark', '#99BBEE', '#1E293B', '#666666', '#666666'), '見出し');
  const html = buildToneTable(readTone(doc(weak, canvas)));
  const ratios = [...html.matchAll(/<small>(\d+\.\d)<\/small>/g)].map(m => parseFloat(m[1]));
  assert.ok(ratios.some(r => r < 1.5), '白に近い背景と白文字の見本は、コントラスト比が低い');
}

// 5. ベース背景の行がないと、書き出せない
{
  assert.throws(() => readTone(doc(c1)), /ベース背景の行がありません/);
}

// 6. 旧形式の表（「境界・線」「文字（主）」の行がある Markdown の表）も読める
{
  const old = `${HEAD}| 役割 | トークン例 | Light | Dark | 用途 |\n| :--- | :--- | :--- | :--- | :--- |\n`
    + '| 第 1 色（主役・テスト） | `--vs-c1` | `#3366AA` | `#99BBEE` | 見出し |\n'
    + '| ベース背景 | `--diag-canvas` | `#FFFFFF` | `#101820` | 地色 |\n'
    + '| 境界・線 | `--diag-edge` | `#888888` | `#666666` | 線 |\n'
    + '| 文字（主） | `--text-primary` | `#222222` | `#EEEEEE` | 文字 |\n';
  const tone = readTone(old);
  assert.strictEqual(tone.byToken['--vs-c1'].light.bg, '#3366AA');
  assert.strictEqual(tone.byToken['--vs-c1'].light.border, '#888888', '旧形式の境界・線の色が、組の境界と線に入る');
  assert.strictEqual(tone.byToken['--vs-c1'].dark.line, '#666666');
  assert.ok(tone.byToken['--diag-canvas'].light.ink, '旧形式の文字色から、組の文字色が決まる');
}

// 7. 一覧の表: 基本色の数と、上下セル分割（Light/Dark 背景色）および見本の文字（A〜）
{
  const tone = readTone(doc(c1, canvas));
  const html = buildListTable([{ no: '1', id: 'test', name: 'テスト', toneClass: '区分', technique: '技法', file: '01-test.md', tone }]);
  assert.ok(html.includes('<td rowspan="2">1 色</td>'), '基本色の数（rowspan="2"）');
  assert.ok(html.includes('style="background-color: #FFFFFF; color: #222222; white-space: nowrap;"'), '上段 Light セルに Light ベース背景色・文字色');
  assert.ok(html.includes('style="background-color: #101820; color: #EEEEEE; white-space: nowrap;"'), '下段 Dark セルに Dark ベース背景色・文字色');
  assert.ok(html.includes('>A</span>'), '第 1 色の見本は A');
  assert.ok(html.includes('>G</span>'), 'ベース背景の見本は G');
  assert.ok(html.includes('<a href="01-test.md">01-test.md</a>'));
}

// 8. 表の行の読み取り: Markdown の表と HTML の表の、どちらからもセルの文字を取り出す
{
  assert.deepStrictEqual(readTableRows('| a | `b` |\n').flat(), ['a', 'b']);
  assert.deepStrictEqual(readTableRows('<tr><td>x<br>y</td><td><code>z</code></td></tr>\n').flat(), ['x y', 'z']);
}

// 9. 「基にした配色」に一致するオリジナル色の見本だけ中の文字が太字・下線（strong+underline+800）になり、各セル背景に Light/Dark ベース背景色が付く
{
  const headWithBase = '# 21. オリジナル見本テスト\n\n- **基にした配色**: `#3366AA`（ブルー）、`#FFFFFF`（白）\n\n## カラーコード一覧\n\n';
  const origDoc = `${headWithBase}${TABLE_HEAD}${c1}\n${canvas}${TABLE_TAIL}`;
  assert.deepStrictEqual(readBaseHexes(origDoc), ['#3366AA', '#FFFFFF']);
  const tone = readTone(origDoc);
  const tableHtml = buildToneTable(tone);
  assert.ok(tableHtml.includes('<td style="background-color: #FFFFFF; color: #222222;">'), '個別表の Light セルに Light ベース背景色・文字色');
  assert.ok(tableHtml.includes('<td style="background-color: #101820; color: #EEEEEE;">'), '個別表の Dark セルに Dark ベース背景色・文字色');
  assert.ok(tableHtml.includes('background-color: #3366AA; color: #FFFFFF; display: inline-block; padding: 2px 8px; border-radius: 4px; white-space: nowrap; font-weight: 800; border: 1px solid #888888;"><strong style="color: #FFFFFF; text-decoration: underline; text-underline-offset: 2px;">Aaあ</strong>'), 'オリジナル背景色の見本は 1px 枠＋太字・下線（文字色明示）');
  assert.ok(tableHtml.includes('background-color: #99BBEE; color: #1E293B; display: inline-block; padding: 2px 8px; border-radius: 4px; white-space: nowrap; font-weight: 400; border: 1px solid #666666;">Aaあ '), '補完色（非オリジナル）の見本は 1px 枠＋通常ウェイト');

  const listHtml = buildListTable([{ no: '21', id: 'orig-test', name: 'テスト', toneClass: '区分', technique: '技法', file: '21-orig-test.md', tone }]);
  assert.ok(listHtml.includes('font-weight: 800; border: 1px solid #888888;"><strong style="color: #FFFFFF; text-decoration: underline; text-underline-offset: 2px;">A</strong></span>'), '一覧表でもオリジナル色は 1px 枠＋太字・下線（文字色明示）');
  assert.ok(listHtml.includes('font-weight: 400; border: 1px solid #666666;">A</span>'), '一覧表でも非オリジナル色は 1px 枠＋通常ウェイト');
}

console.log('build-color-tone-tables.test.cjs: all assertions passed');
