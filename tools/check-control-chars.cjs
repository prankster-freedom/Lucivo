// テキストファイルに、制御文字（タブ・改行以外）と見えない文字が含まれていないかを調べる。
// 使い方: node tools/check-control-chars.cjs（含まれていれば終了コード 1）
// 背景: 置換の文字列をシェルや Python の文字列に埋め込んだとき、正規表現の \b がバックスペース（0x08）に変わったことがある。
// また、エディタ系のツールが、置き換え文字（U+FFFD）などのエスケープを文字そのものに変え、見えない文字がソースに入ったことがある（#46）
const { execFileSync } = require('child_process');
const fs = require('fs');

// 生成物（public/vendor/）と画像・フォントは対象外。ライブラリの圧縮済みファイルは制御文字を含む。
// 文字コードのテスト用のサンプル（tests/fixtures/encoding/）は、UTF-16 の NUL や ISO-2022-JP の ESC を意図して含む
const SKIP = /^public\/vendor\/|^tests\/fixtures\/encoding\/(?!source\.md$)|\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf|zip)$/i;

// 0x09（タブ）、0x0A（LF）、0x0D（CR）以外の C0 制御文字と DEL
// eslint-disable-next-line no-control-regex -- 制御文字を検出するための正規表現
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

// 見えない文字・紛らわしい文字。この表自体に文字を書かないよう、符号位置から作る。
// 全角の空白（U+3000）は日本語の文書で普通に使うため対象外。BOM はファイルの先頭だけを許す
const INVISIBLE = new Map([
  [0x00A0, 'ノーブレークスペース'],
  [0x00AD, 'ソフトハイフン'],
  [0x200B, 'ゼロ幅スペース'],
  [0x200C, 'ゼロ幅非接合子'],
  [0x200D, 'ゼロ幅接合子'],
  [0x200E, '左から右への印'],
  [0x200F, '右から左への印'],
  [0x2028, '行区切り文字'],
  [0x2029, '段落区切り文字'],
  [0x2060, '単語結合子'],
  [0xFEFF, 'BOM（ゼロ幅ノーブレークスペース）'],
  [0xFFFD, '置き換え文字']
]);
const hex = code => `U+${code.toString(16).toUpperCase().padStart(4, '0')}`;

// コミット済みのファイルに加え、まだコミットしていない新しいファイル（.gitignore の対象を除く）も調べる
const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split('\0').filter(f => f && !SKIP.test(f));
const found = [];
for (const file of [...new Set(files)]) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const text = fs.readFileSync(file, 'utf8');
  text.split('\n').forEach((line, i) => {
    const m = CONTROL.exec(line);
    if (m) found.push(`${file}:${i + 1}: 制御文字 0x${m[0].charCodeAt(0).toString(16).padStart(2, '0')}`);
    for (let col = 0; col < line.length; col++) {
      const code = line.charCodeAt(col);
      if (!INVISIBLE.has(code)) continue;
      // ファイルの先頭の BOM は許す
      if (code === 0xFEFF && i === 0 && col === 0) continue;
      found.push(`${file}:${i + 1}:${col + 1}: ${INVISIBLE.get(code)}（${hex(code)}）`);
    }
  });
}
if (found.length) {
  console.error(`制御文字・見えない文字が含まれています（${found.length} 件）:\n${found.join('\n')}`);
  console.error('文字が必要なときは、ソースではエスケープ（例: \\u00A0）や String.fromCharCode() で書く');
  process.exit(1);
}
console.log(`制御文字・見えない文字なし（${files.length} ファイル）`);
