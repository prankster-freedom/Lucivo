// Git で管理するテキストファイルに、タブ・改行以外の制御文字が含まれていないかを調べる。
// 使い方: node tools/check-control-chars.cjs（含まれていれば終了コード 1）
// 背景: 置換の文字列をシェルや Python の文字列に埋め込んだとき、正規表現の \b がバックスペース（0x08）に変わったことがある
const { execFileSync } = require('child_process');
const fs = require('fs');

// 生成物（public/vendor/）と画像・フォントは対象外。ライブラリの圧縮済みファイルは制御文字を含む
const SKIP = /^public\/vendor\/|\.(png|jpe?g|gif|ico|webp|woff2?|ttf|otf|pdf)$/i;
// 0x09（タブ）、0x0A（LF）、0x0D（CR）以外の C0 制御文字と DEL
// eslint-disable-next-line no-control-regex -- 制御文字を検出するための正規表現
const CONTROL = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(f => f && !SKIP.test(f));
const found = [];
for (const file of files) {
  if (!fs.existsSync(file)) continue;
  fs.readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const m = CONTROL.exec(line);
    if (m) found.push(`${file}:${i + 1}: 0x${m[0].charCodeAt(0).toString(16).padStart(2, '0')}`);
  });
}
if (found.length) {
  console.error(`制御文字が含まれています（${found.length} 件）:\n${found.join('\n')}`);
  process.exit(1);
}
console.log(`制御文字なし（${files.length} ファイル）`);
