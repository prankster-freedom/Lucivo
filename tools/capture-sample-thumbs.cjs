// 起動画面用サムネイル（public/assets/thumbs/*.webp, 640x400）と
// README 用スクリーンショット（doc/images/readme/*.png, 1280x800）を日英それぞれ撮影する（#378）。
// 使い方: node tools/capture-sample-thumbs.cjs
// 一部だけ撮り直すときは、環境変数で絞る（例: LANGS=ja TARGETS=color-museum）。
//   LANGS: ja,en のうち撮る言語（既定は両方）／TARGETS: visual,notation,color-museum のうち撮る対象（既定はすべて）
'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const THUMB_DIR = path.join(PUBLIC_DIR, 'assets', 'thumbs');
const README_DIR = path.join(ROOT, 'doc', 'images', 'readme');
const LANGS = (process.env.LANGS || 'ja,en').split(',').map(s => s.trim()).filter(Boolean);
const TARGETS = (process.env.TARGETS || 'visual,notation,color-museum').split(',').map(s => s.trim()).filter(Boolean);
const HIDE_CSS ='#telemetry-pill, .slab-actions, #toast, #toast-container, #toast-message, .toast { display: none !important; }';

function startStaticServer() {
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
    '.md': 'text/markdown; charset=utf-8',
    '.png': 'image/png'
  };
  const server = http.createServer((req, res) => {
    const rel = ((req.url || '/').split('?')[0].replace(/^\/+/, '')) || 'index.html';
    const fp = path.join(PUBLIC_DIR, decodeURIComponent(rel));
    if (!fp.startsWith(PUBLIC_DIR) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime[path.extname(fp)] || 'application/octet-stream' });
    fs.createReadStream(fp).pipe(res);
  });
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () => new Promise(r => server.close(r))
      });
    });
  });
}

async function setupRoutes(page) {
  await page.route('https://raw.githubusercontent.com/prankster-freedom/Lucivo/*/public/samples/**', route => {
    const m = route.request().url().match(/\/public\/samples\/([^?#]+)/);
    if (!m) return route.fulfill({ status: 404, body: 'Not Found' });
    const fp = path.join(PUBLIC_DIR, 'samples', decodeURIComponent(m[1]));
    if (!fs.existsSync(fp)) return route.fulfill({ status: 404, body: 'Not Found' });
    const ext = path.extname(fp).toLowerCase();
    const ct = ext === '.svg' ? 'image/svg+xml' : ext === '.png' ? 'image/png' : 'text/markdown; charset=utf-8';
    return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': ct }, body: fs.readFileSync(fp) });
  });
  await page.route('https://raw.githubusercontent.com/prankster-freedom/Lucivo/*/public/assets/**', route => {
    const m = route.request().url().match(/\/public\/assets\/([^?#]+)/);
    if (!m) return route.fulfill({ status: 404, body: 'Not Found' });
    const fp = path.join(PUBLIC_DIR, 'assets', decodeURIComponent(m[1]));
    if (!fs.existsSync(fp)) return route.fulfill({ status: 404, body: 'Not Found' });
    const ext = path.extname(fp).toLowerCase();
    const ct = ext === '.svg' ? 'image/svg+xml' : ext === '.webp' ? 'image/webp' : 'image/png';
    return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': ct }, body: fs.readFileSync(fp) });
  });
}

async function waitRendered(page) {
  await page.waitForFunction(() => !/Rendering/.test(document.getElementById('telemetry-status')?.textContent || ''), null, { timeout: 60000 });
  await page.waitForTimeout(800);
}

async function savePngAndWebp(page, pngPath, webpPath) {
  const buf = await page.screenshot({ path: pngPath });
  const b64 = buf.toString('base64');
  const webpB64 = await page.evaluate(async imgB64 => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + imgB64;
    await new Promise(r => { img.onload = r; });
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = 400;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 640, 400);
    return c.toDataURL('image/webp', 0.84).split(',')[1];
  }, b64);
  fs.writeFileSync(webpPath, Buffer.from(webpB64, 'base64'));
}

async function main() {
  fs.mkdirSync(THUMB_DIR, { recursive: true });
  fs.mkdirSync(README_DIR, { recursive: true });
  const server = await startStaticServer();
  const browser = await chromium.launch();

  try {
    for (const lang of LANGS) {
      const suffix = lang === 'en' ? '.en.md' : '.md';
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        locale: lang === 'en' ? 'en-US' : 'ja-JP',
        deviceScaleFactor: 1
      });
      const page = await context.newPage();
      await setupRoutes(page);

      // 1. Visualモード・Light サムネイル（日英とも 4列カード＆KPIメトリクスを 2段カードスタイルで撮影）
      if (TARGETS.includes('visual')) {
      const visualUrl = `https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/visual-sample${suffix}`;
      const headingRe = lang === 'ja' ? /4列カード/ : /4-Column Cards/i;
      await page.goto(`${server.url}?url=${encodeURIComponent(visualUrl)}&mode=visual&theme=light&style=cards&view=canvas&lang=${lang}`);
      await page.addStyleTag({ content: HIDE_CSS });
      await waitRendered(page);
      const targetSlab = page.locator('.exhibition-slab', { has: page.locator('h2', { hasText: headingRe }) }).first();
      await targetSlab.evaluate(el => el.scrollIntoView({ block: 'start' }));
      await page.waitForTimeout(1500);
      await savePngAndWebp(
        page,
        path.join(README_DIR, `thumb-visual.${lang}.png`),
        path.join(THUMB_DIR, `visual.${lang}.webp`)
      );
      await page.evaluate(() => { const sc = document.getElementById('preview-scroll'); if (sc) sc.scrollTop = 0; });

      // 英語版 README 用の表紙・カード（README.en.md の既存日本語画像差し替え用）
      if (lang === 'en') {
        await page.setViewportSize({ width: 1440, height: 1600 });
        await page.click('.info-style-btn[data-info-style="shapes"]');
        await waitRendered(page);
        await page.locator('.vs-cover').first().screenshot({ path: path.join(README_DIR, 'visual-cover.en.png') });
        await page.click('.info-style-btn[data-info-style="circles"]');
        await waitRendered(page);
        const slab = page.locator('.exhibition-slab', { has: page.locator('h2', { hasText: /4-Column Cards/i }) }).first();
        await slab.evaluate(el => el.scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(1200);
        await slab.screenshot({ path: path.join(README_DIR, 'visual-cards.en.png') });
        await page.setViewportSize({ width: 1280, height: 800 });
      }
      }

      // 2. 記法サンプル（Split 表示・Light・数式パート周辺）
      if (TARGETS.includes('notation')) {
      const notationUrl = `https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/notation_sample${suffix}`;
      await page.goto(`${server.url}?url=${encodeURIComponent(notationUrl)}&mode=fast&theme=light&view=split&lang=${lang}`);
      await page.addStyleTag({ content: HIDE_CSS });
      await waitRendered(page);
      await page.evaluate(() => {
        const sc = document.getElementById('preview-scroll');
        const h2 = Array.from(document.querySelectorAll('#standard-doc-container h2'))
          .find(el => /数式|Math/i.test(el.textContent || ''));
        if (sc && h2) {
          sc.scrollTop = Math.max(0, h2.offsetTop - 24);
        }
      });
      await page.waitForTimeout(1000);
      await savePngAndWebp(
        page,
        path.join(README_DIR, `thumb-notation.${lang}.png`),
        path.join(THUMB_DIR, `notation.${lang}.webp`)
      );
      }

      // 3. 配色ミュージアム（ミュージアム・ウォーク・Dark）
      if (TARGETS.includes('color-museum')) {
      const museumUrl = `https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/color-museum-sample${suffix}`;
      await page.goto(`${server.url}?url=${encodeURIComponent(museumUrl)}&mode=visual&theme=dark&present=museum-walk&lang=${lang}`);
      await page.waitForFunction(() => document.documentElement.classList.contains('is-museum-walk'), null, { timeout: 25000 });
      await page.waitForTimeout(1200);
      // 「一日の光をたどる」の章に入った直後のアングル: 左の壁に小見出し「六つの窓」と本文、その先に窓の作品、
      // 正面の奥に年表の広間が見える。立ち止まって左の壁を向いたあと、視線を進行方向へ少し回して撮る
      const framed = await page.evaluate(() => {
        const m = window.LucivoModes?.get('museum-walk');
        const st = m?.info?.();
        const gate = (st?.gates || []).find(g => /一日の光|Light of a Day/i.test(g.title || ''));
        if (!gate) return false;
        // 進む向きは -z。門より奥（z が小さい）で、いちばん手前にある左の壁のパーツが、章の最初の小見出し
        const first = (st.parts || []).filter(p => p.side === 'L' && p.z < gate.z && p.kind !== 'h3shadow').sort((a, b) => b.z - a.z)[0];
        if (!first) return false;
        // 止まって左の壁を向いたとき、パーツの真ん中が正面に来る位置（tests/e2e/modes/museum-walk.cjs の readingZ）より
        // 220 だけ手前に立ち、見出しと、奥の窓の作品・年表の広間を同じ画面に入れる。
        // 450 まで下げると門の通過直後の位置になり、視線が正面の回廊を向いてしまう
        m.walkTo(first.z - first.w / 2 + 512 + 220);
        return true;
      });
      if (framed) {
        // 視線を進行方向へ少し回す。左へドラッグすると右（進行方向）を向く。量は環境変数 THUMB_TURN で調整できる
        const turn = Number(process.env.THUMB_TURN || -120);
        await page.mouse.move(640, 400);
        await page.mouse.down();
        await page.mouse.move(640 + turn, 400, { steps: 10 });
        await page.mouse.up();
      }
      if (!framed) {
        // 該当する章のない版（英語版の旧構成）は、従来どおり、左の壁の表と奥へ続く回廊を一望するアングルで撮る
        await page.keyboard.press('g');
        await page.evaluate(() => {
          const m = window.LucivoModes?.get('museum-walk');
          const st = m?.info?.();
          const plate = (st?.parts || []).find(p => p.kind === 'plate');
          if (plate) m.walkTo(plate.z + 400);
        });
        await page.waitForTimeout(1200);
        await page.mouse.move(640, 400);
        await page.mouse.down();
        await page.mouse.move(850, 400, { steps: 10 });
        await page.mouse.up();
      }
      await page.waitForTimeout(1500);
      await savePngAndWebp(
        page,
        path.join(README_DIR, `thumb-color-museum.${lang}.png`),
        path.join(THUMB_DIR, `color-museum.${lang}.webp`)
      );
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }

  for (const f of fs.readdirSync(THUMB_DIR)) {
    console.log('thumb:', f, fs.statSync(path.join(THUMB_DIR, f)).size, 'bytes');
  }
  for (const f of fs.readdirSync(README_DIR)) {
    console.log('readme:', f, fs.statSync(path.join(README_DIR, f)).size, 'bytes');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
