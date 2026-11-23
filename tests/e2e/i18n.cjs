// 多言語対応（日本語・英語）E2E テスト（FR-065〜067, FR-007, DTP-004, TC-I18N-001〜004）
const path = require('path');
const fs = require('fs');
const { ROOT_DIR, record, openApp, waitRendered, startWebServer, mockWebSamples } = require('./helpers.cjs');

// 英語表示で残ってはいけない日本語文字（ひらがな・カタカナ・漢字・全角約物）
const JP_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3001\u3002\u300C\u300D\uFF01-\uFF5E]/;
const documentTitleToFile = title => (title || '').replace(/ - Lucivo$/, '');

async function collectUiJapaneseLeaks(page, excludeSelectors = []) {
  return page.evaluate(({ jpPattern, excludes }) => {
    const re = new RegExp(jpPattern);
    const leaks = [];
    const isExcluded = el => {
      if (!el) return false;
      // 言語切替の自言語名「日本語」は仕様上の例外（FR-066）
      if (el.id === 'menu-lang-ja') return true;
      if (el.id === 'menu-more-language') return true;
      for (const sel of excludes) {
        if (el.closest(sel)) return true;
      }
      return false;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') continue;
      if (isExcluded(parent)) continue;
      const text = (node.nodeValue || '').trim();
      if (!text) continue;
      if (re.test(text)) {
        leaks.push(`text(${parent.id || parent.className || parent.tagName}): ${text.slice(0, 80)}`);
      }
    }

    const attrs = ['title', 'aria-label', 'placeholder', 'alt'];
    document.querySelectorAll('*').forEach(el => {
      if (isExcluded(el)) return;
      for (const attr of attrs) {
        const val = el.getAttribute(attr);
        if (!val) continue;
        // 言語切替ボタンのツールチップ「日本語 / English」は自言語名のため例外
        if (el.id === 'btn-lang-menu' && attr === 'title') continue;
        if (re.test(val)) {
          leaks.push(`attr[${attr}](${el.id || el.className || el.tagName}): ${val.slice(0, 80)}`);
        }
      }
    });
    return leaks;
  }, { jpPattern: JP_CHAR_RE.source, excludes: excludeSelectors });
}

async function testI18n(browser) {
  // TC-I18N-001: ブラウザ言語の自動判定、手動切り替え、localStorage 永続化、URL ?lang=en
  {
    const pageEn = await openApp(browser, { locale: 'en-US', viewport: { width: 1280, height: 900 } });
    const initialLang = await pageEn.evaluate(() => document.documentElement.lang);
    const openBtnEn = await pageEn.textContent('#btn-file-menu');

    // 手動で日本語へ切り替え → localStorage 保存確認
    await pageEn.click('#btn-lang-menu');
    await pageEn.click('#menu-lang-ja');
    const afterJa = await pageEn.evaluate(() => ({
      lang: document.documentElement.lang,
      stored: localStorage.getItem('lucivo-lang'),
      openBtn: document.getElementById('btn-file-menu')?.textContent?.trim()
    }));

    // 手動で英語へ戻す
    await pageEn.click('#btn-lang-menu');
    await pageEn.click('#menu-lang-en');
    const afterEn = await pageEn.evaluate(() => ({
      lang: document.documentElement.lang,
      stored: localStorage.getItem('lucivo-lang'),
      openBtn: document.getElementById('btn-file-menu')?.textContent?.trim()
    }));

    const ok1 = initialLang === 'en'
      && /Open/.test(openBtnEn || '')
      && afterJa.lang === 'ja' && afterJa.stored === 'ja' && afterJa.openBtn === '開く'
      && afterEn.lang === 'en' && afterEn.stored === 'en' && afterEn.openBtn === 'Open';
    record('TC-I18N-001', ok1, `initial=${initialLang}, ja=${afterJa.lang}/${afterJa.openBtn}, en=${afterEn.lang}/${afterEn.openBtn}`);
    await pageEn.close();
  }

  // TC-I18N-002: 英語表示で例外を除き日本語が残らないこと（起動画面・メニュー・モーダル・Visualモード・ステージ発表・ミュージアム・ウォーク）
  {
    const server = await startWebServer();
    const page = await openApp(browser, {
      locale: 'en-US',
      url: `${server.url}?lang=en`,
      viewport: { width: 1280, height: 900 }
    });
    await mockWebSamples(page);
    await waitRendered(page);

    const startupLeaks = await collectUiJapaneseLeaks(page);
    const startupThumbsEn = await page.evaluate(() => Array.from(document.querySelectorAll('.empty-guide-sample-thumb img')).map(img => ({
      src: img.getAttribute('src') || '',
      loaded: img.complete && img.naturalWidth > 0
    })));

    // 起動画面サンプルカード（別タブ）から visual-sample.en.md を開き、Visualモード + ステージ発表を検査
    const [samplePage] = await Promise.all([
      page.context().waitForEvent('page'),
      page.click('[data-sample-card="visual"] .empty-guide-sample-link')
    ]);
    await mockWebSamples(samplePage);
    await samplePage.waitForFunction(() => document.title === 'visual-sample.en.md - Lucivo', null, { timeout: 10000 });
    await waitRendered(samplePage);
    const loadedFile = documentTitleToFile(await samplePage.title());
    if (!(await samplePage.evaluate(() => document.getElementById('btn-visual-mode')?.classList.contains('is-active')))) {
      await samplePage.click('#btn-visual-mode');
      await waitRendered(samplePage);
    }
    const visualLeaks = await collectUiJapaneseLeaks(samplePage, ['#markdown-editor']);

    // ステージ発表 HUD の検査
    await samplePage.click('#btn-stage-show');
    await samplePage.waitForSelector('#stage-hud', { timeout: 10000 });
    const stageLeaks = await collectUiJapaneseLeaks(samplePage, ['#markdown-editor']);
    await samplePage.keyboard.press('Escape');
    await samplePage.waitForFunction(() => !document.documentElement.classList.contains('is-stage-show'));

    // ミュージアム・ウォーク（Web 版）の検査
    await samplePage.click('#btn-present-menu');
    await samplePage.click('#menu-present-museum-walk');
    await samplePage.waitForSelector('#museum-walk', { timeout: 15000 });
    const mwLeaks = await collectUiJapaneseLeaks(samplePage, ['#markdown-editor', '#visual-stage-container', '#standard-doc-container']);
    await samplePage.keyboard.press('Escape');
    await samplePage.waitForFunction(() => !document.documentElement.classList.contains('is-museum-walk'));

    const allLeaks = [...startupLeaks, ...visualLeaks, ...stageLeaks, ...mwLeaks];
    record(
      'TC-I18N-002',
      loadedFile === 'visual-sample.en.md' && allLeaks.length === 0,
      allLeaks.length === 0 ? `sample=${loadedFile}, leaks=0` : `leaks(${allLeaks.length}): ${allLeaks.slice(0, 5).join(' | ')}`
    );

    // TC-I18N-003: 言語切替による同梱サンプルの日英自動切替と起動画面カード 3 件の確認
    await samplePage.click('#btn-lang-menu');
    await samplePage.click('#menu-lang-ja');
    await samplePage.waitForFunction(() => document.title === 'visual-sample.md - Lucivo', null, { timeout: 10000 });
    await waitRendered(samplePage);
    const switchedToJa = documentTitleToFile(await samplePage.title());

    await samplePage.click('#btn-lang-menu');
    await samplePage.click('#menu-lang-en');
    await samplePage.waitForFunction(() => document.title === 'visual-sample.en.md - Lucivo', null, { timeout: 10000 });
    await waitRendered(samplePage);
    const switchedToEn = documentTitleToFile(await samplePage.title());

    record(
      'TC-I18N-003',
      switchedToJa === 'visual-sample.md'
        && switchedToEn === 'visual-sample.en.md'
        && startupThumbsEn.length === 3
        && startupThumbsEn.every(t => t.src.endsWith('.en.webp') && t.loaded),
      `ja=${switchedToJa}, en=${switchedToEn}, thumbs=${JSON.stringify(startupThumbsEn)}`
    );

    // TC-I18N-004: Visualモード英語表示の組版（html[lang="en"] の字間・横はみ出しなし・ゲラ保存）
    const galleyDir = path.join(ROOT_DIR, 'work', 'dtp_review', 'galley', 'i18n-en');
    fs.mkdirSync(galleyDir, { recursive: true });
    if (!(await samplePage.evaluate(() => document.getElementById('btn-visual-mode')?.classList.contains('is-active')))) {
      await samplePage.click('#btn-visual-mode');
      await waitRendered(samplePage);
    }
    await samplePage.click('[data-view-mode="canvas"]');
    await waitRendered(samplePage);
    const styleCheck = await samplePage.evaluate(() => {
      const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
      const tracking = wrap ? getComputedStyle(wrap).getPropertyValue('--vs-heading-tracking').trim() : '';
      const overflow = document.documentElement.scrollWidth > window.innerWidth + 2;
      return { tracking, overflow };
    });
    await samplePage.screenshot({ path: path.join(galleyDir, 'visual-en-shapes-cover.png') });
    await samplePage.click('.info-style-btn[data-info-style="editorial"]');
    await waitRendered(samplePage);
    const editorialTracking = await samplePage.evaluate(() => {
      const wrap = document.querySelector('#visual-stage-container .exhibition-wrap');
      return wrap ? getComputedStyle(wrap).getPropertyValue('--vs-heading-tracking').trim() : '';
    });
    await samplePage.screenshot({ path: path.join(galleyDir, 'visual-en-editorial-cover.png') });
    await samplePage.close();

    record(
      'TC-I18N-004',
      Math.abs(parseFloat(styleCheck.tracking) - (-0.01)) < 1e-6
        && Math.abs(parseFloat(editorialTracking)) < 1e-6
        && !styleCheck.overflow,
      `shapes=${styleCheck.tracking}, editorial=${editorialTracking}, overflow=${styleCheck.overflow}`
    );

    await page.close();
    await server.close();
  }
}

module.exports = { testI18n };
