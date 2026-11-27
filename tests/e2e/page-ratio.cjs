// 版面の比率とページ割り（FR-070, DTP-VTPL-150, DD-VTPL-150〜158。#438）
// TC-VTPL-042〜048
const fs = require('fs');
const path = require('path');
const { openStagePage, setDocument, waitRendered, record, APP_DIR, SHOT_DIR } = require('./helpers.cjs');

// 分ける対象を集めた文書（TC-VTPL-043〜045）
function buildFixture() {
  const lines = ['# 版面の試験', '', '## 短い章', '', '短い本文です。', ''];
  lines.push('## 少しあふれる章', '');
  for (let i = 1; i <= 16; i++) lines.push(`- 項目 ${i}: 一行で収まる短い説明です。`);
  lines.push('', '## 長いリスト', '', 'リストの前の説明です。', '');
  for (let i = 1; i <= 40; i++) lines.push(`${i}. 番号付きの項目 ${i} の説明です。ページをまたいでも番号が続くことを確かめます。`);
  lines.push('', '## 長い表', '', '| 番号 | 名前 | 説明 |', '| --- | --- | --- |');
  for (let i = 1; i <= 40; i++) lines.push(`| ${i} | 行 ${i} | 表の行 ${i} の説明です。 |`);
  lines.push('', '## 長いコード', '', '```js');
  for (let i = 1; i <= 80; i++) lines.push(`const value${i} = compute(${i}); // 行 ${i}`);
  lines.push('```', '', '## 長い段落', '');
  lines.push(Array.from({ length: 70 }, (_, i) => `これは長い段落の第 ${i + 1} 文で、行の途中で続きのページへ分けられることを確かめます。`).join(''));
  lines.push('', '## 脚注のある長い章', '', '脚注を参照する本文です[^1]。', '');
  for (let i = 1; i <= 14; i++) lines.push(`段落 ${i}。脚注のある章も、本文が多ければ続きのページに分かれ、脚注は最後のページに置かれることを確かめるための文です。`, '');
  lines.push('[^1]: 脚注の本文です。', '');
  return lines.join('\n');
}

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

async function setLayout(page, id) {
  await page.evaluate(layoutId => {
    const btn = document.querySelector(`[data-layout-id="${layoutId}"]`);
    if (btn) btn.click();
  }, id);
  await page.waitForTimeout(500);
  await waitPageFit(page);
}

// 各ページの縦横比・あふれ・段階・印（ページの箱の外側の余白は visual-page.css の --page-pad-y と同じ）
const inspectPages = () => {
  const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
  const pages = Array.from(wrap.querySelectorAll(':scope > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)'));
  return {
    attr: document.documentElement.dataset.pageRatio || null,
    pages: pages.map(p => {
      const r = p.getBoundingClientRect();
      const kids = Array.from(p.children).filter(c => c.tagName !== 'H2' && !c.matches('.front-matter, .slab-actions, .page-continued, .vs-cover-texture'));
      const last = kids[kids.length - 1];
      const pad = p.dataset.fitStep && p.dataset.fitStep !== '0' ? 22 : 32;
      const h2 = p.querySelector(':scope > h2');
      return {
        title: (p.querySelector(':scope > h2 > span:last-of-type')?.textContent || '').trim(),
        ratio: r.width / r.height,
        over: last ? last.getBoundingClientRect().bottom - (r.bottom - pad) : 0,
        step: p.dataset.fitStep || null,
        no: p.dataset.pageNo || null,
        count: p.dataset.pageCount || null,
        pill: h2?.querySelector('.page-no-pill')?.textContent || null,
        cont: Boolean(p.querySelector(':scope > .page-continued')),
        isCont: p.classList.contains('is-continuation'),
        centerPad: p.style.getPropertyValue('--page-center-pad') || '',
        h2Top: h2 ? Math.round(h2.getBoundingClientRect().top - r.top) : null
      };
    })
  };
};

async function testPageRatio(browser) {
  const page = await openStagePage(browser, { viewport: { width: 1600, height: 900 } });
  const visualMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');

  // TC-VTPL-042 比率を当てる条件
  await openVisual(page, visualMd);
  const onPage = await page.evaluate(inspectPages);
  await setLayout(page, 'single');
  const onSingle = await page.evaluate(() => ({
    attr: document.documentElement.dataset.pageRatio || null,
    marks: document.querySelectorAll('#visual-stage-container .is-continuation, #visual-stage-container [data-fit-step], #visual-stage-container .page-no-pill').length
  }));
  await setLayout(page, 'page');
  await page.click('#btn-mode-fast');
  await waitRendered(page);
  await page.waitForTimeout(300);
  const onFast = await page.evaluate(() => document.documentElement.dataset.pageRatio || null);
  await page.click('#btn-visual-mode');
  await waitRendered(page);
  await waitPageFit(page);
  const backToPage = await page.evaluate(() => document.documentElement.dataset.pageRatio || null);
  const portrait = await openStagePage(browser, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await openVisual(portrait, visualMd);
  const onPortrait = await portrait.evaluate(() => ({
    attr: document.documentElement.dataset.pageRatio || null,
    marks: document.querySelectorAll('#visual-stage-container .is-continuation, #visual-stage-container [data-fit-step]').length
  }));
  await portrait.context().close();
  const ratioOk = onPage.attr === '16:10'
    && onPage.pages.length > 0
    && onPage.pages.every(p => Math.abs(p.ratio - 1.6) < 0.016 && p.over <= 1)
    && onSingle.attr === null && onSingle.marks === 0
    && onFast === null && backToPage === '16:10'
    && onPortrait.attr === null && onPortrait.marks === 0;
  record('TC-VTPL-042', ratioOk, JSON.stringify({
    attr: onPage.attr, pages: onPage.pages.length,
    bad: onPage.pages.filter(p => Math.abs(p.ratio - 1.6) >= 0.016 || p.over > 1),
    onSingle, onFast, backToPage, onPortrait
  }));

  // TC-VTPL-043 詰める・背の低い章
  const fixture = buildFixture();
  await openVisual(page, fixture);
  const fx = await page.evaluate(inspectPages);
  const shortCh = fx.pages.find(p => p.title === '短い章');
  const tightCh = fx.pages.filter(p => p.title === '少しあふれる章');
  const h2Tops = [...new Set(fx.pages.filter(p => p.h2Top !== null && p.step === '0').map(p => p.h2Top))];
  const fitOk = Boolean(shortCh) && shortCh.step === '0' && parseFloat(shortCh.centerPad) > 0
    && tightCh.length === 1 && Number(tightCh[0].step) >= 1 && tightCh[0].over <= 1 && !tightCh[0].no
    && h2Tops.length === 1;
  record('TC-VTPL-043', fitOk, JSON.stringify({ shortCh, tightCh, h2Tops }));

  // TC-VTPL-044 分ける
  const groups = ['長いリスト', '長い表', '長いコード', '長い段落', '脚注のある長い章'].map(title => fx.pages.filter(p => p.title === title));
  const groupsOk = groups.every(g => g.length >= 2 && g.every((p, i) => p.no === String(i + 1) && p.count === String(g.length)
    && p.pill === `${i + 1} / ${g.length}` && p.cont === (i < g.length - 1) && p.isCont === (i > 0) && p.over <= 1));
  const detail = await page.evaluate(() => {
    const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
    const groupOf = title => Array.from(wrap.querySelectorAll(':scope > .exhibition-slab')).filter(s => (s.querySelector(':scope > h2 > span:last-of-type')?.textContent || '').trim() === title);
    const lists = groupOf('長いリスト');
    const listStarts = lists.map(s => { const ol = s.querySelector('ol'); return ol ? Number(ol.getAttribute('start') || 1) : null; });
    const listCounts = lists.map(s => s.querySelectorAll('ol > li:not(.is-pf-split-item)').length);
    const tables = groupOf('長い表');
    const theads = tables.map(s => s.querySelectorAll('thead').length);
    const rows = tables.reduce((n, s) => n + s.querySelectorAll('tbody > tr').length, 0);
    const codes = groupOf('長いコード');
    const pre = codes[codes.length - 1].querySelector('pre');
    const copied = window.LucivoPageFit && pre ? (() => {
      const all = Array.from(wrap.querySelectorAll('pre')).filter(p => codes.some(s => s.contains(p)));
      return all.map(p => p.querySelector('code').textContent).join('');
    })() : '';
    const paras = groupOf('長い段落');
    const paraText = paras.map(s => Array.from(s.querySelectorAll(':scope > p')).map(p => p.textContent).join('')).join('');
    const fnGroup = groupOf('脚注のある長い章');
    const fnPages = fnGroup.map(s => Boolean(s.querySelector('.lucivo-footnotes')));
    return { listStarts, listCounts, theads, rows, codeLines: copied.split('\n').filter(Boolean).length, paraLen: paraText.length, paraHas70: paraText.includes('第 70 文'), fnPages };
  });
  // コードの「コピー」が、分ける前の全体を写すか（クリップボードの代わりに、写す文字を作る関数を呼ぶ）
  const copyText = await page.evaluate(() => {
    const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
    const pres = Array.from(wrap.querySelectorAll('pre[data-pf-split]'));
    const last = pres[pres.length - 1];
    let written = null;
    const orig = navigator.clipboard && navigator.clipboard.writeText;
    if (navigator.clipboard) navigator.clipboard.writeText = t => { written = t; return Promise.resolve(); };
    last?.querySelector('.vs-code-copy-btn')?.click();
    if (navigator.clipboard && orig) navigator.clipboard.writeText = orig;
    return written;
  });
  const expectedStarts = [];
  let base = 1;
  detail.listCounts.forEach((n, i) => { expectedStarts.push(i === 0 ? 1 : base); base += n; });
  const splitOk = groupsOk
    && JSON.stringify(detail.listStarts) === JSON.stringify(expectedStarts)
    && detail.listCounts.reduce((a, b) => a + b, 0) === 40
    && detail.theads.every(n => n === 1) && detail.rows === 40
    && detail.codeLines === 80 && typeof copyText === 'string' && copyText.split('\n').filter(Boolean).length === 80
    && detail.paraHas70
    && detail.fnPages.length >= 2 && detail.fnPages[detail.fnPages.length - 1] && detail.fnPages.slice(0, -1).every(v => !v);
  record('TC-VTPL-044', splitOk, JSON.stringify({ groups: groups.map(g => g.map(p => `${p.pill}|${p.cont}|${Math.round(p.over)}`)), detail, expectedStarts, copyLines: copyText ? copyText.split('\n').filter(Boolean).length : null }));

  // TC-VTPL-045 決め直す（差分の描画・シングルページ表示との行き来）
  const countPages = () => document.querySelectorAll('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)').length;
  const before = await page.evaluate(countPages);
  await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = ed.value + '\n' + 'エディタで足した段落です。'.repeat(120) + '\n';
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(1200);
  await waitPageFit(page);
  const grown = await page.evaluate(countPages);
  await page.evaluate(text => {
    const ed = document.getElementById('markdown-editor');
    ed.value = text;
    ed.dispatchEvent(new Event('input', { bubbles: true }));
  }, fixture);
  await page.waitForTimeout(1200);
  await waitPageFit(page);
  const reverted = await page.evaluate(countPages);
  const orphans = await page.evaluate(() => Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > .is-continuation'))
    .filter(c => { let p = c.previousElementSibling; while (p && p.classList.contains('is-continuation')) p = p.previousElementSibling; return !p || !p.classList.contains('exhibition-slab'); }).length);
  const slabTexts = () => Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > .exhibition-slab:not(.vs-endcard)'))
    .map(s => s.textContent.replace(/\s+/g, ''));
  await setLayout(page, 'single');
  const singleAfterSplit = await page.evaluate(slabTexts);
  const singleMarks = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .is-continuation, #visual-stage-container .page-no-pill, #visual-stage-container .page-continued, #visual-stage-container [data-pf-id]').length);
  // 比べる元: 分けたことのない描画（もう一度描き直す）
  await setDocument(page, fixture);
  await page.waitForTimeout(300);
  const singleFresh = await page.evaluate(slabTexts);
  await setLayout(page, 'page');
  const again = await page.evaluate(countPages);
  const refitOk = grown > before && reverted === before && orphans === 0 && singleMarks === 0
    && JSON.stringify(singleAfterSplit) === JSON.stringify(singleFresh) && again === before;
  record('TC-VTPL-045', refitOk, JSON.stringify({ before, grown, reverted, orphans, singleMarks, sameText: JSON.stringify(singleAfterSplit) === JSON.stringify(singleFresh), again }));

  // TC-VTPL-046 ステージ発表
  await openVisual(page, visualMd);
  await page.evaluate(() => document.querySelector('[data-view-mode="canvas"]')?.click());
  await page.waitForTimeout(600);
  await waitPageFit(page);
  const canvasPages = await page.evaluate(countPages);
  const rootFontPage = await page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
  await page.evaluate(() => window.LucivoStage.enterShow());
  await page.waitForTimeout(1500);
  const showInfo = await page.evaluate(() => {
    const st = window.LucivoStage.showState();
    const scene = document.querySelector('#visual-stage-container .exhibition-wrap > .is-scene');
    const r = scene.getBoundingClientRect();
    return { scenes: st.scenes, ratio: r.width / r.height, left: r.left, right: innerWidth - r.right, top: r.top, bottom: r.bottom, vh: innerHeight, rootFont: getComputedStyle(document.documentElement).fontSize };
  });
  const endcards = await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-wrap > .vs-endcard').length);
  // 続きのページのシーンへ進む
  const contIndex = await page.evaluate(() => {
    const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
    const scenes = Array.from(wrap.querySelectorAll(':scope > .exhibition-hero, :scope > .exhibition-slab'));
    return scenes.findIndex(s => s.classList.contains('is-continuation'));
  });
  for (let i = 0; i < contIndex; i++) await page.keyboard.press(']').catch(() => {});
  const goTo = await page.evaluate(idx => {
    const st = window.LucivoStage.showState();
    return { index: st.index, target: idx };
  }, contIndex);
  await page.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-stage.png') });
  await page.keyboard.press('o');
  await page.waitForTimeout(900);
  const tileRatio = await page.evaluate(() => {
    const tile = document.querySelector('#visual-stage-container .exhibition-wrap > .exhibition-slab');
    const r = tile.getBoundingClientRect();
    return r.width / r.height;
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-stage-overview.png') });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.evaluate(() => window.LucivoStage.exitShow());
  await page.waitForTimeout(600);
  const showOk = showInfo.scenes === canvasPages + endcards
    && Math.abs(showInfo.ratio - 1.6) < 0.016
    && showInfo.left >= 0 && showInfo.right >= 0 && Math.abs(showInfo.left - showInfo.right) <= 2
    && showInfo.top >= 0 && showInfo.bottom <= showInfo.vh
    && showInfo.rootFont === rootFontPage
    && contIndex > 0
    && Math.abs(tileRatio - 1.6) < 0.03;
  record('TC-VTPL-046', showOk, JSON.stringify({ canvasPages, endcards, showInfo, rootFontPage, contIndex, goTo, tileRatio }));

  // TC-VTPL-047 印刷: PDF のページの数が、画面のページの数と同じ
  await waitPageFit(page);
  const printPages = await page.evaluate(countPages);
  await page.emulateMedia({ media: 'print' });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  record('TC-VTPL-047', pdfPages === printPages, JSON.stringify({ pdfPages, printPages }));

  // TC-VTPL-049 ページの大きさ（#455）: 縦の短い横長の画面（スマホの横向き）でも、1 ページの全体が表示枠に収まり、左右の中央に置かれる。
  // 高さが足りる画面では、ページの幅は今までどおり（上限 62rem）
  const inspectFit = () => {
    const scroller = document.getElementById('preview-scroll');
    const sr = scroller.getBoundingClientRect();
    const pages = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)'));
    return {
      attr: document.documentElement.dataset.pageRatio || null,
      viewH: scroller.clientHeight,
      pages: pages.length,
      width: pages[0] ? Math.round(pages[0].getBoundingClientRect().width) : 0,
      tooTall: pages.filter(p => p.getBoundingClientRect().height > scroller.clientHeight - 30).length,
      offCenter: pages.filter(p => {
        const r = p.getBoundingClientRect();
        return Math.abs((r.left - sr.left) - (sr.right - r.right - (scroller.offsetWidth - scroller.clientWidth))) > 3;
      }).length,
      badRatio: pages.filter(p => { const r = p.getBoundingClientRect(); return Math.abs(r.width / r.height - 1.6) > 0.016; }).length,
      over: pages.filter(p => {
        const r = p.getBoundingClientRect();
        const kids = Array.from(p.children).filter(c => c.tagName !== 'H2' && !c.matches('.front-matter, .slab-actions, .page-continued, .vs-cover-texture'));
        const last = kids[kids.length - 1];
        return last && last.getBoundingClientRect().bottom > r.bottom - (p.dataset.fitStep && p.dataset.fitStep !== '0' ? 22 : 32) + 1;
      }).length
    };
  };
  const phone = await openStagePage(browser, { viewport: { width: 915, height: 412 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await openVisual(phone, visualMd);
  await phone.evaluate(() => document.querySelector('[data-view-mode="canvas"]')?.click());
  await phone.waitForTimeout(800);
  await waitPageFit(phone);
  const phoneFit = await phone.evaluate(inspectFit);
  await phone.screenshot({ path: path.join(SHOT_DIR, 'page-ratio-phone-landscape.png') });
  await phone.context().close();
  const wideFit = await page.evaluate(inspectFit);
  const sizeOk = phoneFit.attr === '16:10' && phoneFit.pages > 0 && phoneFit.tooTall === 0 && phoneFit.offCenter === 0 && phoneFit.badRatio === 0 && phoneFit.over === 0
    && phoneFit.width <= (phoneFit.viewH - 32) * 1.6 + 2
    && wideFit.tooTall === 0 && wideFit.width === 992;
  record('TC-VTPL-049', sizeOk, JSON.stringify({ phoneFit, wideFit }));

  // TC-VTPL-048 版面のゲラ（目視）
  const samples = ['visual-sample.md', 'print-sample.md', 'color-museum-sample.md', 'museum-walk-sample.md', 'notation_sample.md', 'notation_sample_extra1.md'];
  const galley = [];
  for (const file of samples) {
    await openVisual(page, fs.readFileSync(path.join(APP_DIR, 'samples', file), 'utf8'));
    const els = await page.$$('#visual-stage-container .exhibition-wrap > :is(.exhibition-hero, .exhibition-slab):not(.vs-endcard)');
    for (let i = 0; i < els.length; i++) {
      await els[i].scrollIntoViewIfNeeded();
      await els[i].screenshot({ path: path.join(SHOT_DIR, `page-ratio-${file.replace(/\.md$/, '')}-${String(i).padStart(2, '0')}.png`) });
    }
    const st = await page.evaluate(inspectPages);
    galley.push({ file, pages: st.pages.length, over: st.pages.filter(p => p.over > 1).length });
  }
  // 同梱サンプルの相対パスの画像は、エディタに入れて開くと読めない（ERR_FILE_NOT_FOUND）。版面とは関係がないため除く
  const pageErrors = page.consoleErrors.filter(e => !/ERR_FILE_NOT_FOUND/.test(e));
  record('TC-VTPL-048', galley.every(g => g.over === 0) && pageErrors.length === 0, JSON.stringify({ galley, consoleErrors: pageErrors, note: '画像は目視で確かめる' }));

  await page.context().close();
}

module.exports = { testPageRatio };
