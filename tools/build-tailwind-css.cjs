// index.html と js/app.js で使っている Tailwind のクラスだけを集め、静的な css/tailwind.css を生成する。
// Tailwind の CDN 版はページを開くたびにブラウザ内で CSS を生成するため、起動の軽快さ（NFR-006）のために事前に生成しておく。
// 使い方: node tools/build-tailwind-css.cjs（Tailwind のクラスを追加・変更したら実行する）
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT_DIR = path.resolve(__dirname, '..');
const APP_DIR = path.join(ROOT_DIR, 'public');
const OUT = path.join(APP_DIR, 'css', 'tailwind.css');
const TAILWIND_CDN = 'https://cdn.tailwindcss.com/3.4.17';
const TAILWIND_CONFIG = {
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '"Noto Sans JP"', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Inter"', '"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    }
  }
};

// class 属性、className への代入、classList の引数に現れる文字列からクラス名の候補を集める
function collectClasses() {
  const html = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(APP_DIR, 'js', 'app.js'), 'utf8');
  const chunks = [];
  for (const src of [html, js]) {
    for (const m of src.matchAll(/class="([^"]*)"/g)) chunks.push(m[1]);
  }
  for (const m of js.matchAll(/className\s*=\s*(['"`])([^'"`]*)\1/g)) chunks.push(m[2]);
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\(([^)]*)\)/g)) {
    for (const s of m[1].matchAll(/(['"`])([^'"`]*)\1/g)) chunks.push(s[2]);
  }
  const tokens = new Set();
  chunks.join(' ').split(/\s+/).forEach(t => {
    const token = t.replace(/^['"`(]+|['"`,;)]+$/g, '');
    if (token && !/[${}?]/.test(token)) tokens.add(token);
  });
  return [...tokens].sort();
}

(async () => {
  const classes = collectClasses();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<!doctype html><html><head>
    <script src="${TAILWIND_CDN}"></script>
    <script>tailwind.config = ${JSON.stringify(TAILWIND_CONFIG)};</script>
    </head><body><div class="${classes.join(' ')}"></div></body></html>`);
  await page.waitForFunction(() => Array.from(document.querySelectorAll('style')).some(s => s.textContent.includes('--tw-')));
  await page.waitForTimeout(500);
  const css = await page.evaluate(() => Array.from(document.querySelectorAll('style')).map(s => s.textContent).join('\n'));
  await browser.close();
  const header = `/* このファイルは tools/build-tailwind-css.cjs で生成する。直接編集しない（Tailwind CSS ${TAILWIND_CDN.split('/').pop()}、候補のクラス ${classes.length} 個） */\n`;
  fs.writeFileSync(OUT, header + css.trim() + '\n');
  console.log(`wrote ${path.relative(process.cwd(), OUT)} (${css.length} bytes, ${classes.length} candidate classes)`);
})();
