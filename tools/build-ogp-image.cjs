// OGP の画像（AST-147、DTP-010、FR-065、#443）を、作図元の SVG から 1200×630 の PNG に書き出す。
// 使い方: リポジトリ直下で node tools/build-ogp-image.cjs（作図元を変えたときに実行し、PNG をコミットする）。
// 書き出しにブラウザ（Playwright の Chromium）が要るため、ビルドのたびには作らない（doc/2.ARCHITECTURE.md 4.14 ARC-PUB-001）
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'doc', '0.DTP', 'assets', 'sources', 'ogp-image.svg');
const OUT = path.join(ROOT, 'public', 'assets', 'ogp', 'lucivo-ogp.png');

(async () => {
  const svg = fs.readFileSync(SOURCE, 'utf8');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    await page.setContent(`<!DOCTYPE html><html><body style="margin:0;background:#05070d">${svg}</body></html>`);
    await page.screenshot({ path: OUT, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  } finally {
    await browser.close();
  }
  console.log(`${path.relative(ROOT, OUT)} (${fs.statSync(OUT).size} bytes)`);
})();
