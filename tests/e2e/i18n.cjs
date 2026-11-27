// 多言語対応（日本語・英語）E2E テスト（FR-065〜067, FR-007, DTP-004, TC-I18N-001〜009）
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
      // 言語切替の、切り替え先の言語で書く文言（「日本語」「日本語に切り替え」）は仕様上の例外（FR-066 の例外 1）
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
        // 言語切替ボタンのツールチップ・読み上げは、切り替え先の言語を添えるため例外（FR-066 の例外 1）
        if (el.id === 'btn-lang-menu' && (attr === 'title' || attr === 'aria-label')) continue;
        if (re.test(val)) {
          leaks.push(`attr[${attr}](${el.id || el.className || el.tagName}): ${val.slice(0, 80)}`);
        }
      }
    });
    return leaks;
  }, { jpPattern: JP_CHAR_RE.source, excludes: excludeSelectors });
}

async function testI18n(browser) {
  // TC-I18N-001: ブラウザ言語の自動判定、手動切り替え、localStorage 永続化（スタンドアロン版）
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
      url: `${server.rootUrl}en/`,
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

// ===== Web 版の言語別のページ（FR-065、doc/2.ARCHITECTURE.md 4.14 ARC-PUB-009、#443。TC-I18N-005〜009） =====

const SITE = 'https://prankster-freedom.github.io/Lucivo/';
const RAW_SAMPLES = 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/';

// Web 版のページを開く文脈。計測（GTM）は通信せずに空で応答し、保存した言語（storage）を、開く前に入れておく
async function newWebContext(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 900 },
    locale: opts.locale || 'ja-JP',
    javaScriptEnabled: opts.javaScriptEnabled !== false
  });
  await context.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  if (opts.storage) {
    await context.addInitScript(value => {
      try { if (!sessionStorage.getItem('e2e-seeded')) { localStorage.setItem('lucivo-lang', value); sessionStorage.setItem('e2e-seeded', '1'); } } catch (_) {}
    }, opts.storage);
  }
  const page = await context.newPage();
  page.consoleErrors = [];
  page.on('console', m => { if (m.type() === 'error') page.consoleErrors.push(m.text().slice(0, 200)); });
  page.on('pageerror', e => page.consoleErrors.push('pageerror: ' + e.message));
  await mockWebSamples(page);
  return { context, page };
}

// 転送を待って、行き着いた URL（パス・クエリ・#）を返す。転送の途中でページが入れ替わるため、commit だけを待って開く
async function landedUrl(page, url, expectedPath) {
  await page.goto(url, { waitUntil: 'commit' });
  await page.waitForURL(u => new URL(u).pathname === expectedPath, { timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => {});
  const u = new URL(page.url());
  return { path: u.pathname, search: u.search, hash: u.hash };
}

async function testLangPages(browser) {
  const server = await startWebServer();
  const root = server.rootUrl;
  try {
    // TC-I18N-005: ルートの転送（ブラウザの言語・保存値・?lang=・#lang=・JavaScript なし）。lang 以外のクエリと # を引き継ぐ
    {
      const cases = [
        { name: 'browser-ja', locale: 'ja-JP', url: root, path: '/ja/', search: '', hash: '' },
        { name: 'browser-en', locale: 'en-US', url: root, path: '/en/', search: '', hash: '' },
        { name: 'browser-other', locale: 'fr-FR', url: root, path: '/en/', search: '', hash: '' },
        { name: 'storage-en', locale: 'ja-JP', storage: 'en', url: root, path: '/en/', search: '', hash: '' },
        { name: 'storage-ja', locale: 'en-US', storage: 'ja', url: root, path: '/ja/', search: '', hash: '' },
        { name: 'query', locale: 'en-US', storage: 'en', url: `${root}?view=canvas&lang=ja&mode=visual#sec-2`, path: '/ja/', search: '?view=canvas&mode=visual', hash: '#sec-2' },
        { name: 'hash', locale: 'ja-JP', url: `${root}#lang=en&mode=visual`, path: '/en/', search: '', hash: '#mode=visual' },
        { name: 'no-js', locale: 'ja-JP', javaScriptEnabled: false, url: root, path: '/en/', search: '', hash: '' }
      ];
      const results = [];
      for (const c of cases) {
        const { context, page } = await newWebContext(browser, c);
        const landed = await landedUrl(page, c.url, c.path);
        const ok = landed.path === c.path && landed.search === c.search && landed.hash === c.hash;
        results.push({ name: c.name, ok, landed: ok ? landed.path : landed });
        await context.close();
      }
      record('TC-I18N-005', results.every(r => r.ok), JSON.stringify(results.filter(r => !r.ok).length ? results : results.map(r => `${r.name}:${r.landed}`)));
    }

    // TC-I18N-006: 言語別のページの ?lang=（違う言語は転送、同じ言語・不正な値は消すだけ）と、ディレクトリを保存値より優先すること
    {
      const results = [];
      {
        const { context, page } = await newWebContext(browser, { locale: 'ja-JP' });
        const landed = await landedUrl(page, `${root}ja/?lang=en&view=canvas#top`, '/en/');
        await page.waitForFunction(() => typeof renderApp === 'function');
        const lang = await page.evaluate(() => document.documentElement.lang);
        results.push({ name: 'other-lang', ok: landed.path === '/en/' && landed.search === '?view=canvas' && landed.hash === '#top' && lang === 'en', landed, lang });
        await context.close();
      }
      {
        const { context, page } = await newWebContext(browser, { locale: 'ja-JP' });
        await page.goto(`${root}en/?mode=visual&lang=en`);
        await page.waitForFunction(() => typeof renderApp === 'function');
        const info = await page.evaluate(() => ({ path: location.pathname, search: location.search, lang: document.documentElement.lang }));
        results.push({ name: 'same-lang', ok: info.path === '/en/' && info.search === '?mode=visual' && info.lang === 'en', info });
        await context.close();
      }
      {
        const { context, page } = await newWebContext(browser, { locale: 'en-US' });
        await page.goto(`${root}ja/?lang=xx`);
        await page.waitForFunction(() => typeof renderApp === 'function');
        const info = await page.evaluate(() => ({ path: location.pathname, search: location.search, lang: document.documentElement.lang }));
        results.push({ name: 'invalid', ok: info.path === '/ja/' && info.search === '' && info.lang === 'ja', info });
        await context.close();
      }
      {
        const { context, page } = await newWebContext(browser, { locale: 'en-US', storage: 'en' });
        await page.goto(`${root}ja/`);
        await page.waitForFunction(() => typeof renderApp === 'function');
        const info = await page.evaluate(() => ({ lang: document.documentElement.lang, stored: localStorage.getItem('lucivo-lang'), open: document.getElementById('btn-file-menu')?.textContent?.trim() }));
        results.push({ name: 'dir-over-storage', ok: info.lang === 'ja' && info.stored === 'en' && info.open === '開く', info });
        await context.close();
      }
      record('TC-I18N-006', results.every(r => r.ok), JSON.stringify(results.map(r => (r.ok ? r.name : r))));
    }

    // TC-I18N-007: 言語別のページの静的な <head>（lang・canonical・hreflang・タイトル）。公開用 URL の設定でビルドしたもの
    {
      const results = [];
      for (const lang of ['ja', 'en']) {
        const { context, page } = await newWebContext(browser, { javaScriptEnabled: false });
        await page.goto(`${root}${lang}/`);
        const head = await page.evaluate(() => ({
          lang: document.documentElement.getAttribute('lang'),
          pageLang: document.documentElement.getAttribute('data-page-lang'),
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          alternates: Array.from(document.querySelectorAll('link[rel="alternate"][hreflang]')).map(l => `${l.getAttribute('hreflang')}=${l.getAttribute('href')}`).sort(),
          robots: !!document.querySelector('meta[name="robots"]'),
          title: document.title
        }));
        const ok = head.lang === lang && head.pageLang === lang
          && head.canonical === `${SITE}${lang}/`
          && head.alternates.join(',') === [`en=${SITE}en/`, `ja=${SITE}ja/`, `x-default=${SITE}en/`].join(',')
          && !head.robots
          && head.title === 'Lucivo Markdown Presenter — Exhibition-Grade Markdown Viewer —';
        results.push({ lang, ok, head: ok ? undefined : head });
        await context.close();
      }
      record('TC-I18N-007', results.every(r => r.ok), JSON.stringify(results));
    }

    // TC-I18N-008: 言語の切り替えで、読み込み直さずにアドレスバーをもう一方のディレクトリへ書き換える（クエリと # を保ち、編集中の内容を失わない）
    {
      const { context, page } = await newWebContext(browser, { locale: 'ja-JP' });
      await page.goto(`${root}ja/?view=split#memo`);
      await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
      const cardHrefs = await page.evaluate(() => Array.from(document.querySelectorAll('.empty-guide-sample-link')).map(a => a.getAttribute('href')));
      // 「その他」の切り替えの項目は、切り替え先の言語で書く（FR-065。切り替えたい人は今の言語を読めない）
      const moreJa = await page.evaluate(() => document.getElementById('menu-more-language')?.textContent?.trim());
      await page.fill('#markdown-editor', '# 編集中の文書\n\n本文\n');
      await page.evaluate(() => { window.__e2eNoReload = true; });
      await page.click('#btn-lang-menu');
      await page.click('#menu-lang-en');
      await page.waitForFunction(() => location.pathname.endsWith('/en/'), null, { timeout: 5000 }).catch(() => {});
      const toEn = await page.evaluate(() => ({
        path: location.pathname,
        search: location.search,
        hash: location.hash,
        noReload: window.__e2eNoReload === true,
        editor: document.getElementById('markdown-editor').value,
        lang: document.documentElement.lang,
        pageLang: document.documentElement.getAttribute('data-page-lang'),
        canonical: document.querySelector('link[rel="canonical"]')?.href,
        stored: localStorage.getItem('lucivo-lang'),
        help: document.getElementById('btn-header-help')?.getAttribute('href') || '',
        more: document.getElementById('menu-more-language')?.textContent?.trim()
      }));
      // 戻すときは「その他」メニューの項目（日本語に切り替え）を使う。幅 1280px ではメニューのボタンが隠れているため、項目を直接押す
      await page.evaluate(() => document.getElementById('menu-more-language').click());
      await page.waitForFunction(() => location.pathname.endsWith('/ja/'), null, { timeout: 5000 }).catch(() => {});
      const toJa = await page.evaluate(() => ({ path: location.pathname, noReload: window.__e2eNoReload === true, lang: document.documentElement.lang, more: document.getElementById('menu-more-language')?.textContent?.trim() }));
      const ok = toEn.path === '/en/' && !/lang=/.test(toEn.search) && toEn.hash === '#memo' && toEn.noReload
        && toEn.editor.includes('編集中の文書') && toEn.lang === 'en' && toEn.pageLang === 'en'
        && toEn.canonical === `${SITE}en/` && toEn.stored === 'en'
        && toEn.help.startsWith(`${SITE}preview/en/?url=`) && toEn.help.includes('README.en.md') && !toEn.help.includes('lang=')
        && toJa.path === '/ja/' && toJa.noReload && toJa.lang === 'ja'
        && moreJa === 'Switch to English' && toEn.more === '日本語に切り替え' && toJa.more === 'Switch to English'
        && cardHrefs.length > 0 && cardHrefs.every(h => h.startsWith('./?url=') && !h.includes('lang='));
      record('TC-I18N-008', ok, JSON.stringify({ moreJa, toEn, toJa, cardHrefs: cardHrefs.length }));
      await context.close();
    }

    // TC-I18N-009: 1 階層深いページで、アセットの読み込みと既存の動きが変わらないこと（同じオリジンへのリクエストが 1 件も失敗しない）。
    // 起動画面のロゴ・サムネイル、公開 URL の文書（相対パスの画像）、図・数式・整形・絵文字・光の演出・見出しの書体・ファビコン・発表モード・印刷
    {
      const results = [];
      for (const lang of ['ja', 'en']) {
        server.notFound.length = 0;
        const { context, page } = await newWebContext(browser, { locale: lang === 'en' ? 'en-US' : 'ja-JP', viewport: { width: 1440, height: 900 } });
        await page.goto(`${root}${lang}/`);
        await page.waitForFunction(() => typeof renderApp === 'function' && document.getElementById('telemetry-status'));
        await page.waitForFunction(() => Array.from(document.querySelectorAll('.empty-guide img')).every(img => img.complete), null, { timeout: 10000 }).catch(() => {});
        const startup = await page.evaluate(() => Array.from(document.querySelectorAll('.empty-guide img, #header-brand-logo img'))
          .filter(img => img.offsetParent !== null || img.closest('.empty-guide-sample-thumb'))
          .map(img => ({ src: img.getAttribute('src'), ok: img.complete && img.naturalWidth > 0 })));

        const sample = lang === 'en' ? 'notation_sample_extra1.en.md' : 'notation_sample_extra1.md';
        await page.goto(`${root}${lang}/?url=${encodeURIComponent(RAW_SAMPLES + sample)}&mode=visual&style=editorial&theme=dark`);
        await page.waitForFunction(name => document.title === `${name} - Lucivo`, sample, { timeout: 15000 });
        await waitRendered(page);
        await page.waitForFunction(() => window.katex && window.LucivoStage && window.LucivoEmoji && window.LucivoFormatter, null, { timeout: 15000 }).catch(() => {});
        const loaded = await page.evaluate(() => ({
          katex: !!window.katex,
          stage: !!window.LucivoStage,
          emoji: !!window.LucivoEmoji,
          formatter: !!window.LucivoFormatter,
          styleFont: !!document.querySelector('link[href$="vendor/style-fonts/editorial.css"]'),
          favicon: document.getElementById('app-favicon')?.getAttribute('href'),
          images: Array.from(document.querySelectorAll('#visual-stage-container img')).map(img => img.complete && img.naturalWidth > 0)
        }));
        await page.click('#btn-present-menu');
        await page.click('#menu-present-museum-walk');
        const museum = await page.waitForSelector('#museum-walk', { timeout: 15000 }).then(() => true).catch(() => false);
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.documentElement.classList.contains('is-museum-walk'), null, { timeout: 10000 }).catch(() => {});
        await page.emulateMedia({ media: 'print' });
        await page.waitForTimeout(500);
        await page.emulateMedia({ media: 'screen' });
        await page.waitForTimeout(300);
        // 図（Mermaid）は、図を含む記法サンプルで確かめる（追補版には図がない）
        const diagramSample = lang === 'en' ? 'notation_sample.en.md' : 'notation_sample.md';
        await page.goto(`${root}${lang}/?url=${encodeURIComponent(RAW_SAMPLES + diagramSample)}`);
        await page.waitForFunction(name => document.title === `${name} - Lucivo`, diagramSample, { timeout: 15000 });
        await waitRendered(page);
        loaded.mermaid = await page.waitForFunction(() => window.mermaid && document.querySelector('#standard-doc-container svg[id^="mermaid"], #standard-doc-container .mermaid svg, #standard-doc-container svg'), null, { timeout: 20000 }).then(() => true).catch(() => false);

        const notFound = [...server.notFound];
        const loadErrors = page.consoleErrors.filter(e => /Failed to load|404/.test(e));
        const ok = startup.length > 0 && startup.every(i => i.ok && i.src.startsWith('../assets/'))
          && loaded.mermaid && loaded.katex && loaded.stage && loaded.emoji && loaded.formatter && loaded.styleFont
          && loaded.favicon === '../assets/logos/dark/favicon.svg'
          && loaded.images.every(Boolean)
          && museum && notFound.length === 0 && loadErrors.length === 0;
        results.push({ lang, ok, detail: ok ? undefined : { startup, loaded, museum, notFound, loadErrors } });
        await context.close();
      }
      record('TC-I18N-009', results.every(r => r.ok), JSON.stringify(results));
    }
  } finally {
    await server.close();
  }
}

module.exports = { testI18n, testLangPages };
