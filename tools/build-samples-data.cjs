// samples/*.md から file:// 直開き時用の遅延読み込みデータ samples/samples-data.js を生成する（DD-FILE-015）。
// 使い方: nodetools/build-samples-data.cjs（samples/*.md を変更したら実行する）
const fs = require('fs');
const path = require('path');

const SAMPLES_DIR = path.resolve(__dirname, '..', 'samples');
const OUT = path.join(SAMPLES_DIR, 'samples-data.js');
const FILES = ['visual-sample.md', 'notation_sample.md'];

const entries = {};
for (const name of FILES) {
  const raw = fs.readFileSync(path.join(SAMPLES_DIR, name), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  entries[name] = raw;
}

const header = '// このファイルは tools/build-samples-data.cjs で生成する。直接編集しない（file:// 直開き時の同梱サンプル読み込み用）\n';
const content = `${header}window.LUCIVO_SAMPLES = ${JSON.stringify(entries, null, 2)};\n`;
fs.writeFileSync(OUT, Buffer.from(content, 'utf8'));
console.log(`wrote ${path.relative(process.cwd(), OUT)} (${Buffer.byteLength(content, 'utf8')} bytes, ${FILES.length} samples)`);
