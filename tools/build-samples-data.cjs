// samples/*.md から file:// 直開き時用の遅延読み込みデータ samples/samples-data.js を生成する（DD-FILE-015）。
// samples-data.js はビルドの出力でコミットしない（doc/2.ARCHITECTURE.md 4.14）。tools/build-app.cjs が出力先（public/ または dist/）に作る。
// 使い方: node tools/build-samples-data.cjs [出力先のルート]（既定は public/。samples/*.md は常に public/samples/ から読む）
const fs = require('fs');
const path = require('path');

const SAMPLES_DIR = path.resolve(__dirname, '..', 'public', 'samples');
const FILES = ['visual-sample.md', 'notation_sample.md', 'notation_sample_extra1.md'];

function buildSamplesData(outRoot) {
  const out = path.join(outRoot, 'samples', 'samples-data.js');
  const entries = {};
  for (const name of FILES) {
    const text = fs.readFileSync(path.join(SAMPLES_DIR, name), 'utf8');
    // 先頭の BOM（U+FEFF）は取り除く。文字そのものをソースに書かないよう、コードで比べる
    const raw = (text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text).replace(/\r\n/g, '\n');
    entries[name] = raw;
  }
  const header = '// このファイルは tools/build-samples-data.cjs で生成する。直接編集しない（file:// 直開き時の同梱サンプル読み込み用）\n';
  const content = `${header}window.LUCIVO_SAMPLES = ${JSON.stringify(entries, null, 2)};\n`;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, Buffer.from(content, 'utf8'));
  return { out, bytes: Buffer.byteLength(content, 'utf8'), count: FILES.length };
}

module.exports = { buildSamplesData };

if (require.main === module) {
  const outRoot = path.resolve(process.argv[2] || path.join(__dirname, '..', 'public'));
  const { out, bytes, count } = buildSamplesData(outRoot);
  console.log(`wrote ${path.relative(process.cwd(), out)} (${bytes} bytes, ${count} samples)`);
}
