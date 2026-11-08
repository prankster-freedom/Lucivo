// README の画面写真を撮り直す（主にエージェントが、画面を変えたときに実行する）。
// 使い方: リポジトリ直下で node tools/capture-readme-shots.cjs [出力先のフォルダ]
// 既定の出力先は doc/images/readme/。同梱の samples/visual-sample.md を Canvas 表示で撮る。
const path = require('path');
const fs = require('fs');
const { chromium } = require('playwright');

const REPO = path.resolve(__dirname, '..');
const APP_URL = 'file:///' + path.join(REPO, 'public', 'index.html').replace(/\\/g, '/');
const SAMPLE = path.join(REPO, 'public', 'samples', 'visual-sample.md');
const OUT = path.resolve(process.argv[2] || path.join(REPO, 'doc', 'images', 'readme'));

// README の写真に、右下の状態表示と章の操作部は写さない
const HIDE_CSS = '#telemetry-pill, .slab-actions { visibility: hidden !important; }';

const slabByTitle = (page, text) => page.locator('.exhibition-slab', { has: page.locator('h2', { hasText: text }) }).first();

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  try {
    // 長い章も 1 回で撮れるよう、画面を縦に高くする
    const page = await browser.newPage({ viewport: { width: 1440, height: 1600 }, deviceScaleFactor: 1 });
    await page.goto(APP_URL);
    await page.addStyleTag({ content: HIDE_CSS });
    await page.click('#btn-file-menu');
    await page.setInputFiles('#file-input', SAMPLE);
    await page.waitForFunction(() => document.getElementById('markdown-editor').value.length > 0);
    await page.click('[data-view-mode="canvas"]');
    await page.mouse.move(5, 5);

    // 表紙（パステル図形）
    await page.click('#btn-visual-mode');
    await page.keyboard.press('1');
    await page.waitForTimeout(3000);
    await page.locator('.vs-cover').first().screenshot({ path: path.join(OUT, 'visual-cover.png') });

    // 要点カードと KPI カード（5色サークル）
    await page.keyboard.press('3');
    await page.waitForTimeout(3000);
    const slab = slabByTitle(page, '4列カード');
    await slab.evaluate(el => el.scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(1500);
    await slab.screenshot({ path: path.join(OUT, 'visual-cards.png') });
  } finally {
    await browser.close();
  }
  for (const f of ['visual-cover.png', 'visual-cards.png']) {
    console.log(`${f} ${fs.statSync(path.join(OUT, f)).size} bytes`);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
