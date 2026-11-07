// package.json で版を固定したライブラリとフォントを public/vendor/ へ集める（NFR-008）。
// 使い方: node tools/build-vendor.cjs（ライブラリやフォントの版を変えたら実行する）
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const MODULES = path.join(ROOT_DIR, 'node_modules');
const VENDOR = path.join(ROOT_DIR, 'public', 'vendor');

const SCRIPTS = [
  ['marked/lib/marked.umd.js', 'marked.min.js'],
  ['dompurify/dist/purify.min.js', 'purify.min.js'],
  ['mermaid/dist/mermaid.min.js', 'mermaid.min.js'],
  ['katex/dist/katex.min.js', 'katex/katex.min.js'],
  ['katex/dist/katex.min.css', 'katex/katex.min.css']
];

// アプリの CSS が指定する名前で読めるように、family を付け替える
const FONTS = [
  ['inter', 'Inter'],
  ['jetbrains-mono', 'JetBrains Mono'],
  ['noto-sans-jp', 'Noto Sans JP'],
  ['plus-jakarta-sans', 'Plus Jakarta Sans']
];

const LICENSED = ['marked', 'dompurify', 'mermaid', 'katex', ...FONTS.map(([pkg]) => `@fontsource-variable/${pkg}`)];

function copy(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

fs.rmSync(VENDOR, { recursive: true, force: true });

for (const [from, to] of SCRIPTS) copy(path.join(MODULES, from), path.join(VENDOR, to));

// KaTeX の CSS は woff2 を最初に指定しており、対応ブラウザは他の形式を読まない
const katexFonts = path.join(MODULES, 'katex', 'dist', 'fonts');
for (const name of fs.readdirSync(katexFonts).filter(f => f.endsWith('.woff2'))) {
  copy(path.join(katexFonts, name), path.join(VENDOR, 'katex', 'fonts', name));
}

const fontCss = FONTS.map(([pkg, family]) => {
  const dir = path.join(MODULES, '@fontsource-variable', pkg);
  const css = fs.readFileSync(path.join(dir, 'wght.css'), 'utf8');
  for (const [, name] of css.matchAll(/url\(\.\/files\/([^)]+)\)/g)) {
    copy(path.join(dir, 'files', name), path.join(VENDOR, 'fonts', 'files', name));
  }
  return css.replace(/font-family: '[^']+';/g, `font-family: '${family}';`);
}).join('\n');
fs.writeFileSync(path.join(VENDOR, 'fonts', 'fonts.css'), fontCss);

const notices = LICENSED.map(name => {
  const dir = path.join(MODULES, name);
  const { version } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  // LICENSE を含まないパッケージがあるので、その場合は tools/licenses/ に置いた上流のファイルを使う
  const file = fs.readdirSync(dir).find(f => /^LICENSE/i.test(f));
  const licensePath = file ? path.join(dir, file) : path.join(__dirname, 'licenses', `${name}.LICENSE`);
  return `${'='.repeat(72)}\n${name} ${version}\n${'='.repeat(72)}\n\n${fs.readFileSync(licensePath, 'utf8').trim()}\n`;
}).join('\n');
fs.writeFileSync(path.join(ROOT_DIR, 'public', 'THIRD_PARTY_LICENSES.txt'),
  `Lucivo に同梱している第三者のソフトウェアとフォントのライセンスです。\n\n${notices}`);

console.log(`wrote ${path.relative(process.cwd(), VENDOR)}`);
