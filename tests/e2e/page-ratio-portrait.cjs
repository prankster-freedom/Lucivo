// 縦 10:16 の版面と、比率の選び方（FR-070, DTP-VTPL-150, DD-VTPL-150・158・160〜162。#438 の 7c）
// TC-VTPL-050〜054
const fs = require('fs');
const path = require('path');
const { openStagePage, setDocument, waitRendered, record, APP_DIR, APP_URL, SHOT_DIR } = require('./helpers.cjs');

const waitPageFit = page => page.waitForFunction(() => !document.documentElement.dataset.pageFit, null, { timeout: 30000 });

async function openVisual(page, md) {
  await setDocument(page, md);
  const isVisual = await page.evaluate(() => state.isVisualMode);
  if (!isVisual) {
    await page.click('#btn-visual-mode');
    await waitRendered(page);
  }
  await page.waitForTimeout(600);
  await waitPageFit(page);
}

// URL のクエリを付けて開き直す
async function reopen(page, query) {
  await page.goto(APP_URL + query);
  await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
}

const countPages = () => document.querySelectorAll('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)').length;

// 各ページの縦横比・あふれ・題の組み（余白は visual-page.css の --page-pad-y と同じ）
const inspectPortrait = () => {
  const scroller = document.getElementById('preview-scroll');
  const sr = scroller.getBoundingClientRect();
  const pages = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)'));
  return {
    attr: document.documentElement.dataset.pageRatio || null,
    viewH: scroller.clientHeight,
    pages: pages.map((p, i) => {
      const r = p.getBoundingClientRect();
      const kids = Array.from(p.children).filter(c => c.tagName !== 'H2' && !c.matches('.front-matter, .slab-actions, .page-continued, .vs-cover-texture, .vs-watermark-num'));
      const last = kids[kids.length - 1];
      const pad = p.dataset.fitStep && p.dataset.fitStep !== '0' ? 18 : 24;
      const h2 = p.querySelector(':scope > h2');
      const badge = h2 && h2.querySelector('.exhibition-num-badge');
      const pill = h2 && h2.querySelector('.page-no-pill');
      return {
        i,
        ratio: r.width / r.height,
        width: r.width,
        height: r.height,
        over: last ? last.getBoundingClientRect().bottom - (r.bottom - pad) : 0,
        offCenter: Math.abs((r.left - sr.left) - (sr.right - r.right - (scroller.offsetWidth - scroller.clientWidth))),
        // 札と印が 1 行目に並ぶ（印の上端が、札の上端と 4px 以内）
        pillOnBadgeRow: badge && pill ? Math.abs(pill.getBoundingClientRect().top - badge.getBoundingClientRect().top) <= 4 : null,
        h2Height: h2 ? h2.getBoundingClientRect().height : 0
      };
    })
  };
};

// 章ごとに、本文のブロックの並び（先頭の 30 文字）を取る
const blockOrder = () => Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > .exhibition-slab')).map(p => {
  const blocks = [];
  p.querySelectorAll('h3, p, li, tr, pre, figure, details, dt').forEach(el => blocks.push(el.tagName + ':' + (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30)));
  return blocks.join('\n');
});

const pageList = () => Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)'))
  .map(p => `${p.dataset.fitStep || '-'}|${p.dataset.pageNo || ''}/${p.dataset.pageCount || ''}`).join(',');

async function testPageRatioPortrait(browser) {
  const visualMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');

  // TC-VTPL-050 縦 10:16 の版面（スマホの縦長・自動）
  const phone = await openStagePage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await openVisual(phone, visualMd);
  await phone.evaluate(() => document.querySelector('[data-view-mode="canvas"]')?.click());
  await phone.waitForTimeout(800);
  await waitPageFit(phone);
  const pf = await phone.evaluate(inspectPortrait);
  await phone.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-portrait-phone.png') });
  const els = await phone.$$('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)');
  for (let i = 0; i < Math.min(els.length, 8); i++) {
    await els[i].scrollIntoViewIfNeeded();
    await els[i].screenshot({ path: path.join(SHOT_DIR, `page-ratio-portrait-${String(i).padStart(2, '0')}.png`) });
  }
  const phoneErrors = phone.consoleErrors.filter(e => !/ERR_FILE_NOT_FOUND/.test(e));
  await phone.context().close();
  const pills = pf.pages.filter(p => p.pillOnBadgeRow !== null);
  const portraitOk = pf.attr === '10:16' && pf.pages.length > 0
    && pf.pages.every(p => Math.abs(p.ratio - 0.625) < 0.01 && p.over <= 1 && p.offCenter <= 3 && p.height <= pf.viewH)
    && pills.length > 0 && pills.every(p => p.pillOnBadgeRow)
    && pf.pages.every(p => p.h2Height <= p.height * 0.2)
    && phoneErrors.length === 0;
  record('TC-VTPL-050', portraitOk, JSON.stringify({
    attr: pf.attr, pages: pf.pages.length, viewH: pf.viewH, size: pf.pages[0] && [Math.round(pf.pages[0].width), Math.round(pf.pages[0].height)],
    bad: pf.pages.filter(p => Math.abs(p.ratio - 0.625) >= 0.01 || p.over > 1 || p.offCenter > 3 || p.height > pf.viewH || p.h2Height > p.height * 0.2),
    pillsOnBadgeRow: `${pills.filter(p => p.pillOnBadgeRow).length}/${pills.length}`,
    maxH2: Math.round(Math.max(...pf.pages.map(p => p.h2Height))), consoleErrors: phoneErrors
  }));

  // TC-VTPL-051 比率の選び方（自動・手で選ぶ・URL の ratio・シングルページ表示で隠す）
  const page = await openStagePage(browser, { viewport: { width: 1440, height: 900 } });
  await openVisual(page, visualMd);
  const auto = await page.evaluate(() => ({
    attr: document.documentElement.dataset.pageRatio || null,
    hidden: document.getElementById('btn-ratio-menu').classList.contains('hidden'),
    aria: document.getElementById('btn-ratio-menu').getAttribute('aria-label')
  }));
  await page.click('#btn-ratio-menu');
  const menu = await page.evaluate(() => Array.from(document.querySelectorAll('#ratio-menu .tone-menu-item')).map(b => ({ id: b.getAttribute('data-ratio-id'), checked: b.getAttribute('aria-checked'), label: b.textContent.trim() })));
  await page.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-menu.png') });
  await page.click('#ratio-menu [data-ratio-id="10:16"]');
  await page.waitForTimeout(400);
  await waitPageFit(page);
  const chosen = await page.evaluate(() => ({
    attr: document.documentElement.dataset.pageRatio || null,
    search: location.search,
    checked: document.querySelector('#ratio-menu [data-ratio-id="10:16"]').getAttribute('aria-checked'),
    menuOpen: !document.getElementById('ratio-menu').classList.contains('hidden')
  }));
  const chosenPages = await page.evaluate(inspectPortrait);
  await page.evaluate(() => { document.getElementById('btn-layout-menu').click(); document.querySelector('#layout-menu [data-layout-id="single"]').click(); });
  await page.waitForTimeout(400);
  const single = await page.evaluate(() => ({ attr: document.documentElement.dataset.pageRatio || null, hidden: document.getElementById('btn-ratio-menu').classList.contains('hidden') }));
  await reopen(page, '?mode=visual&ratio=10:16');
  await openVisual(page, visualMd);
  const fromUrl = await page.evaluate(() => ({ attr: document.documentElement.dataset.pageRatio || null, choice: state.pageRatio, search: location.search }));
  await reopen(page, '?mode=visual&ratio=4:3');
  await openVisual(page, visualMd);
  const badUrl = await page.evaluate(() => ({ attr: document.documentElement.dataset.pageRatio || null, choice: state.pageRatio }));
  const chooseOk = auto.attr === '16:10' && !auto.hidden && /16:10/.test(auto.aria || '')
    && menu.length === 3 && menu.map(m => m.id).join(',') === 'auto,16:10,10:16' && menu[0].checked === 'true'
    && chosen.attr === '10:16' && /[?&]ratio=10:16(&|$)/.test(chosen.search) && chosen.checked === 'true' && !chosen.menuOpen
    && chosenPages.pages.every(p => Math.abs(p.ratio - 0.625) < 0.01 && p.over <= 1)
    && single.attr === null && single.hidden
    && fromUrl.attr === '10:16' && fromUrl.choice === '10:16'
    && badUrl.attr === '16:10' && badUrl.choice === 'auto';
  record('TC-VTPL-051', chooseOk, JSON.stringify({ auto, menu, chosen, chosenBad: chosenPages.pages.filter(p => Math.abs(p.ratio - 0.625) >= 0.01 || p.over > 1).length, single, fromUrl, badUrl }));

  // TC-VTPL-052 縦 10:16 のステージ発表（横長の画面の中央に、縦長のページが立つ）
  await reopen(page, '?mode=visual&ratio=10:16');
  await openVisual(page, visualMd);
  await page.evaluate(() => document.querySelector('[data-view-mode="canvas"]')?.click());
  await page.waitForTimeout(600);
  await waitPageFit(page);
  const canvasPages = await page.evaluate(countPages);
  await page.evaluate(() => window.LucivoStage.enterShow());
  await page.waitForTimeout(1500);
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  const show = await page.evaluate(() => {
    const st = window.LucivoStage.showState();
    const scene = document.querySelector('#visual-stage-container .exhibition-wrap > .is-scene');
    const r = scene.getBoundingClientRect();
    return { scenes: st.scenes, ratio: r.width / r.height, left: r.left, right: innerWidth - r.right, top: r.top, bottom: r.bottom, vh: innerHeight, attr: document.documentElement.dataset.pageRatio || null };
  });
  const endcards = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-wrap > .vs-endcard').length);
  await page.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-portrait-stage.png') });
  await page.evaluate(() => window.LucivoStage.exitShow());
  await page.waitForTimeout(600);
  const showOk = show.attr === '10:16' && show.scenes === canvasPages + endcards
    && Math.abs(show.ratio - 0.625) < 0.01
    && Math.abs(show.left - show.right) <= 2 && show.left > show.vh * 0.3
    && show.top >= 0 && show.bottom <= show.vh;
  record('TC-VTPL-052', showOk, JSON.stringify({ canvasPages, endcards, show }));

  // TC-VTPL-053 縦 10:16 の印刷: A4 縦に、画面のページを 1 ページずつ刷る
  await waitPageFit(page);
  const printPages = await page.evaluate(countPages);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  const printAttr = await page.evaluate(() => document.documentElement.dataset.pageRatio || null);
  await page.emulateMedia({ media: 'screen' });
  const raw = pdf.toString('latin1');
  const pdfPages = (raw.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const boxes = [...new Set((raw.match(/\/MediaBox\s*\[[^\]]+\]/g) || []).map(b => b.replace(/\s+/g, ' ')))];
  // A4 縦は 595 × 842pt（端数は丸める）
  const portraitBox = boxes.length > 0 && boxes.every(b => { const n = b.match(/[\d.]+/g).map(Number); return Math.round(n[2]) === 595 && Math.round(n[3]) === 842; });
  record('TC-VTPL-053', pdfPages === printPages && portraitBox && printAttr === '10:16', JSON.stringify({ pdfPages, printPages, boxes, printAttr }));

  // TC-VTPL-054 比率を切り替えても、初めから開いたときと同じページ割りになり、分けたページを戻すと本文の並びが元に戻る
  const extraMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample_extra1.md'), 'utf8');
  await reopen(page, '?mode=visual&ratio=10:16');
  await openVisual(page, extraMd);
  const fresh = await page.evaluate(pageList);
  await reopen(page, '?mode=visual');
  await openVisual(page, extraMd);
  await page.click('#btn-ratio-menu');
  await page.click('#ratio-menu [data-ratio-id="10:16"]');
  await page.waitForTimeout(400);
  await waitPageFit(page);
  const switched = await page.evaluate(pageList);
  const continuations = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-wrap > .is-continuation').length);
  await page.evaluate(() => { document.getElementById('btn-layout-menu').click(); document.querySelector('#layout-menu [data-layout-id="single"]').click(); });
  await page.waitForTimeout(400);
  await waitPageFit(page);
  const restored = await page.evaluate(blockOrder);
  await setDocument(page, extraMd);
  await page.waitForTimeout(300);
  const original = await page.evaluate(blockOrder);
  const misordered = original.map((x, i) => (x === restored[i] ? null : i)).filter(i => i !== null);
  const switchOk = fresh === switched && continuations > 0 && original.length > 0 && misordered.length === 0;
  record('TC-VTPL-054', switchOk, JSON.stringify({ samePages: fresh === switched, pages: fresh.split(',').length, switchedPages: switched.split(',').length, continuations, misordered }));

  await page.context().close();
}

module.exports = { testPageRatioPortrait };
