const path = require('path');
const fs = require('fs');
const {
  ROOT_DIR,
  APP_DIR,
  APP_URL,
  SAMPLE,
  OUT_DIR,
  SHOT_DIR,
  VISUAL_STYLES,
  MODES,
  SHOWCASE_SCENES,
  sceneCount,
  record,
  openApp,
  waitRendered,
  formattedForLoad,
  loadSample,
  selectVisualStyle,
  setMode,
  openStagePage,
  setDocument,
  scrollToSlab,
  seekLight,
  ENCODING_FIXTURE,
  FORMAT_FIXTURE,
  MD_MODES,
  startWebServer,
  mockWebSamples,
  openWebPageWithSample
} = require('./helpers.cjs');

async function testFileLoading(browser) {
  const page = await openApp(browser);
  await waitRendered(page);

  // TC-FILE-001 起動直後の初期表示とブランドロゴ（Light / Dark 連動）
  const init = await page.evaluate(() => {
    const guideEl = document.querySelector('#standard-doc-container .empty-guide');
    const fav = document.getElementById('app-favicon');
    const hLight = document.querySelector('#header-brand-logo .brand-logo-light');
    const hDark = document.querySelector('#header-brand-logo .brand-logo-dark');
    const gLight = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-light') : null;
    const gDark = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-dark') : null;
    const guideIcons = guideEl ? guideEl.querySelectorAll('.empty-guide-card h4 svg.empty-guide-icon').length : 0;
    const featuredCard = guideEl ? guideEl.querySelector('.empty-guide-card-featured') : null;
    const styleIcons = document.querySelectorAll('#style-bar .info-style-btn svg').length;
    const hasEmoji = /[🎨📋⭕📖⚡🎤💡]/u.test((guideEl ? guideEl.textContent : '') + (document.getElementById('style-bar')?.textContent || ''));
    return {
      editor: document.getElementById('markdown-editor').value,
      guide: !!guideEl,
      hasFastModeDesc: guideEl ? guideEl.textContent.includes('高速モード') : false,
      hasVisualModeDesc: guideEl ? guideEl.textContent.includes('Visualモード') : false,
      hasShowModeDesc: guideEl ? guideEl.textContent.includes('ステージ発表') : false,
      guideIcons,
      hasFeaturedCard: !!featuredCard,
      styleIcons,
      hasEmoji,
      fastBtnActive: document.getElementById('btn-mode-fast') ? document.getElementById('btn-mode-fast').classList.contains('is-active') : false,
      favHref: fav ? fav.getAttribute('href') : '',
      headerLightVisible: !!hLight && getComputedStyle(hLight).display !== 'none' && hLight.naturalWidth > 0,
      headerDarkHidden: !!hDark && getComputedStyle(hDark).display === 'none',
      guideLightVisible: !!gLight && getComputedStyle(gLight).display !== 'none' && gLight.naturalWidth > 0,
      guideDarkHidden: !!gDark && getComputedStyle(gDark).display === 'none'
    };
  });
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(200);
  const guideRowTops = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('#standard-doc-container .empty-guide-card'));
    const tops = cards.map(c => Math.round(c.getBoundingClientRect().top));
    return { count: tops.length, sameRow: tops.length === 3 && Math.max(...tops) - Math.min(...tops) <= 4 };
  });
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(200);
  await page.click('#btn-theme-toggle');
  await waitRendered(page);
  const darkLogo = await page.evaluate(() => {
    const guideEl = document.querySelector('#standard-doc-container .empty-guide');
    const fav = document.getElementById('app-favicon');
    const hLight = document.querySelector('#header-brand-logo .brand-logo-light');
    const hDark = document.querySelector('#header-brand-logo .brand-logo-dark');
    const gLight = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-light') : null;
    const gDark = guideEl ? guideEl.querySelector('.empty-guide-logo .brand-logo-dark') : null;
    return {
      favHref: fav ? fav.getAttribute('href') : '',
      headerDarkVisible: !!hDark && getComputedStyle(hDark).display !== 'none' && hDark.naturalWidth > 0,
      headerLightHidden: !!hLight && getComputedStyle(hLight).display === 'none',
      guideDarkVisible: !!gDark && getComputedStyle(gDark).display !== 'none' && gDark.naturalWidth > 0,
      guideLightHidden: !!gLight && getComputedStyle(gLight).display === 'none'
    };
  });
  await page.click('#btn-theme-toggle');
  await waitRendered(page);
  record('TC-FILE-001',
    init.editor === '' && init.guide && init.hasFastModeDesc && init.hasVisualModeDesc && init.hasShowModeDesc
    && init.guideIcons === 3 && init.hasFeaturedCard && init.styleIcons === 4 && !init.hasEmoji
    && guideRowTops.count === 3 && guideRowTops.sameRow && init.fastBtnActive
    && init.favHref === './assets/logos/light/favicon.svg'
    && init.headerLightVisible && init.headerDarkHidden && init.guideLightVisible && init.guideDarkHidden
    && darkLogo.favHref === './assets/logos/dark/favicon.svg'
    && darkLogo.headerDarkVisible && darkLogo.headerLightHidden && darkLogo.guideDarkVisible && darkLogo.guideLightHidden,
    JSON.stringify({ init, darkLogo }));

  // TC-FILE-014 ヘッダーと案内のロゴが Lucivo の公開 URL で README を開き、案内の「最新版はこちら」が公開リポジトリへのリンクになっている（#298）
  const repoLinks = await page.evaluate(() => {
    const repoUrl = 'https://github.com/prankster-freedom/Lucivo';
    const readmeUrl = 'https://prankster-freedom.github.io/Lucivo/preview/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.md&view=canvas&mode=visual';
    const describe = (a, expected) => a && { href: a.getAttribute('href'), target: a.getAttribute('target'), rel: a.getAttribute('rel'), ok: a.getAttribute('href') === expected && a.getAttribute('target') === '_blank' && /\bnoopener\b/.test(a.getAttribute('rel') || '') && /\bnoreferrer\b/.test(a.getAttribute('rel') || '') };
    const latest = document.querySelector('#standard-doc-container .empty-guide-latest');
    return {
      header: describe(document.querySelector('#header-brand-logo a.brand-link'), readmeUrl),
      guideLogo: describe(document.querySelector('#standard-doc-container .empty-guide-logo a.brand-link'), readmeUrl),
      latestText: latest ? latest.textContent.trim() : null,
      latest: describe(latest && latest.querySelector('a'), repoUrl)
    };
  });
  record('TC-FILE-014', !!(repoLinks.header && repoLinks.header.ok && repoLinks.guideLogo && repoLinks.guideLogo.ok && repoLinks.latest && repoLinks.latest.ok
    && /^最新版はこちら/.test(repoLinks.latestText || '')), JSON.stringify(repoLinks));

  // TC-FILE-034 案内に現在の版を表示し、「更新を確認」を押したときだけ最新リリースを問い合わせる
  {
    const appVersion = require('../../package.json').version;
    const api = 'https://api.github.com/repos/prankster-freedom/Lucivo/releases/latest';
    const apiRequests = [];
    const onRequest = req => { if (req.url().startsWith('https://api.github.com/')) apiRequests.push(req.url()); };
    page.on('request', onRequest);
    let reply = null;
    await page.route(api, route => reply(route));
    const guideState = () => page.evaluate(() => {
      const p = document.querySelector('#standard-doc-container .empty-guide-update');
      const result = p && p.querySelector('.update-check-result');
      const link = result && result.querySelector('a');
      return {
        version: p ? (p.querySelector('.update-check-version') || {}).textContent : null,
        hasButton: !!(p && p.querySelector('button.btn-check-update')),
        state: result ? result.dataset.state : null,
        text: result ? result.textContent.trim() : null,
        href: link ? link.getAttribute('href') : null,
        target: link ? link.getAttribute('target') : null
      };
    });
    const clickAndWait = async state => {
      await page.click('#standard-doc-container .btn-check-update');
      await page.waitForFunction(s => {
        const r = document.querySelector('#standard-doc-container .update-check-result');
        return r && r.dataset.state === s;
      }, state, { timeout: 5000 }).catch(() => {});
      return guideState();
    };
    const before = await guideState();
    const requestsBefore = apiRequests.length;
    reply = route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tag_name: 'lucivo-v99.0.0', html_url: 'https://github.com/prankster-freedom/Lucivo/releases/tag/lucivo-v99.0.0' }) });
    const newer = await clickAndWait('newer');
    reply = route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tag_name: `lucivo-v${appVersion}`, html_url: 'https://github.com/prankster-freedom/Lucivo/releases' }) });
    const latest = await clickAndWait('latest');
    reply = route => route.fulfill({ status: 500, body: '' });
    const failed = await clickAndWait('error');
    // 版を描画し直しても、確認の結果を保つ（Visualモードの案内を含む）
    await page.evaluate(() => renderApp());
    await waitRendered(page);
    const afterRender = await guideState();

    // ヘッダー常設のヘルプリンクと「最新版確認」メニューおよび右側ボタンの配置順（#74）
    const helpAttr = await page.evaluate(() => {
      const a = document.getElementById('btn-header-help');
      const u = document.getElementById('btn-header-update');
      const m = document.getElementById('update-menu');
      const mi = document.getElementById('menu-check-update');
      const tools = [
        document.getElementById('btn-open-settings'),
        document.getElementById('btn-toggle-animation'),
        document.getElementById('btn-front-matter'),
        document.getElementById('btn-theme-toggle'),
        u,
        a
      ].filter(Boolean);
      const rightToLeftIds = tools
        .slice()
        .sort((x, y) => y.getBoundingClientRect().right - x.getBoundingClientRect().right)
        .map(el => el.id);
      const uRect = u ? u.getBoundingClientRect() : null;
      const uSpan = document.getElementById('header-update-label');
      const uSvg = u ? u.querySelector('svg') : null;
      return {
        helpHref: a ? a.getAttribute('href') : null,
        helpTarget: a ? a.getAttribute('target') : null,
        helpRel: a ? a.getAttribute('rel') : null,
        updateText: uSpan ? uSpan.textContent.trim() : '',
        updateMenuHiddenInitially: m ? m.classList.contains('hidden') : null,
        menuItemText: mi ? mi.textContent.trim() : '',
        updateIconAfterText: !!(uSpan && uSvg && uSpan.getBoundingClientRect().right <= uSvg.getBoundingClientRect().left + 1),
        updateSingleLine: !!(uRect && uRect.height <= 36),
        rightToLeftIds
      };
    });
    // 親ボタン「最新版確認」クリックだけではメニューが開くのみで通信は発生しない
    await page.click('#btn-header-update');
    const menuOpenedNoNet = await page.evaluate(() => ({
      opened: !document.getElementById('update-menu').classList.contains('hidden'),
      expanded: document.getElementById('btn-header-update').getAttribute('aria-expanded'),
      itemVisible: document.getElementById('menu-check-update').offsetParent !== null
    }));
    const reqsAfterMenuOpen = apiRequests.length;

    // メニューの「通信が発生します」をクリック → 更新あり（99.0.0）なら「更新あり」に変わる
    reply = route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tag_name: 'lucivo-v99.0.0', html_url: 'https://github.com/prankster-freedom/Lucivo/releases/tag/lucivo-v99.0.0' }) });
    await page.click('#menu-check-update');
    await page.waitForFunction(() => {
      const l = document.getElementById('header-update-label');
      return l && l.textContent.trim() === '更新あり';
    }, null, { timeout: 5000 }).catch(() => {});
    const afterNewerHeader = await page.evaluate(() => ({
      label: (document.getElementById('header-update-label') || {}).textContent?.trim() || '',
      menuClosed: document.getElementById('update-menu').classList.contains('hidden'),
      active: document.getElementById('btn-header-update').classList.contains('is-active')
    }));

    // 再度メニューを開き「通信が発生します」クリック → 更新なし（現行版）なら「更新なし」に変わる
    await page.click('#btn-header-update');
    reply = route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tag_name: `lucivo-v${appVersion}`, html_url: 'https://github.com/prankster-freedom/Lucivo/releases' }) });
    await page.click('#menu-check-update');
    await page.waitForFunction(() => {
      const l = document.getElementById('header-update-label');
      return l && l.textContent.trim() === '更新なし';
    }, null, { timeout: 5000 }).catch(() => {});
    const afterLatestHeader = await page.evaluate(() => ({
      label: (document.getElementById('header-update-label') || {}).textContent?.trim() || '',
      toast: (document.getElementById('toast-message') || {}).textContent || '',
      active: document.getElementById('btn-header-update').classList.contains('is-active')
    }));

    await page.unroute(api);
    page.off('request', onRequest);
    // 失敗の場合を模した応答（500）は、ブラウザ自身が読み込みの失敗をコンソールに出すため、TC-FILE-007 の対象から除く
    page.consoleErrors = page.consoleErrors.filter(e => !e.includes('status of 500'));
    const expectedRightOrder = 'btn-header-help,btn-header-update,btn-theme-toggle,btn-front-matter,btn-toggle-animation,btn-open-settings';
    record('TC-FILE-034',
      before.version === appVersion && before.hasButton && !before.state && requestsBefore === 0
      && newer.state === 'newer' && newer.text.includes('99.0.0') && newer.href === 'https://github.com/prankster-freedom/Lucivo/releases/tag/lucivo-v99.0.0' && newer.target === '_blank'
      && latest.state === 'latest' && latest.text.includes('最新版です') && latest.text.includes(appVersion)
      && failed.state === 'error' && failed.text.includes('確認できませんでした')
      && afterRender.state === 'error'
      && helpAttr.helpHref === 'https://prankster-freedom.github.io/Lucivo/preview/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.md&view=canvas&mode=visual'
      && helpAttr.helpTarget === '_blank' && helpAttr.helpRel === 'noopener noreferrer'
      && helpAttr.updateText === '最新版確認' && helpAttr.updateMenuHiddenInitially === true
      && helpAttr.menuItemText === '通信が発生します' && helpAttr.updateIconAfterText && helpAttr.updateSingleLine
      && helpAttr.rightToLeftIds.join(',') === expectedRightOrder
      && menuOpenedNoNet.opened && menuOpenedNoNet.expanded === 'true' && menuOpenedNoNet.itemVisible
      && reqsAfterMenuOpen === 3
      && afterNewerHeader.label === '更新あり' && afterNewerHeader.menuClosed && afterNewerHeader.active
      && afterLatestHeader.label === '更新なし' && afterLatestHeader.toast.includes('最新版です') && !afterLatestHeader.active
      && apiRequests.length === 5,
      JSON.stringify({ appVersion, before, requestsBefore, newer, latest, failed, afterRender, helpAttr, menuOpenedNoNet, reqsAfterMenuOpen, afterNewerHeader, afterLatestHeader, requests: apiRequests.length }));
  }

  // TC-FILE-013 起動直後は編集でき、読み込む前の保存名は untitled.md
  const startEditable = await page.evaluate(() => !document.getElementById('markdown-editor').readOnly && document.getElementById('editor-lock').classList.contains('hidden'));
  await page.fill('#markdown-editor', '# 新しい文書\n');
  await page.click('#btn-save-menu');
  const [firstDownload] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save-markdown')]);
  const firstName = firstDownload.suggestedFilename();
  const firstText = fs.readFileSync(await firstDownload.path(), 'utf8');
  await page.fill('#markdown-editor', '');
  await page.evaluate(() => { lastLoadedMarkdown = ''; renderApp(); });
  record('TC-FILE-013', startEditable && firstName === 'untitled.md' && firstText === '# 新しい文書\n', JSON.stringify({ startEditable, firstName, firstText }));

  // TC-FILE-002 メニューの開閉と同梱サンプル項目
  await page.click('#btn-file-menu');
  const menuState = await page.evaluate(() => ({
    opened: !document.getElementById('file-menu').classList.contains('hidden') && document.getElementById('btn-file-menu').getAttribute('aria-expanded') === 'true',
    // 前回のフォルダの項目（ハンドルを覚えたときだけ出る）は、表示中の項目だけを数える
    items: Array.from(document.querySelectorAll('#file-menu [role="menuitem"]:not(.hidden)')).map(el => el.textContent.trim())
  }));
  await page.mouse.click(20, 400);
  const closedByOutside = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  await page.click('#btn-file-menu');
  await page.keyboard.press('Escape');
  const closedByEsc = await page.evaluate(() => document.getElementById('file-menu').classList.contains('hidden'));
  record('TC-FILE-002',
    menuState.opened && closedByOutside && closedByEsc
    && JSON.stringify(menuState.items) === JSON.stringify(['ファイルを開く…', 'フォルダを開く…', 'Visualモードサンプル (visual-sample.md)', '記法サンプル (notation_sample.md)', '記法サンプル追補版 (notation_sample_extra1.md)', 'ミュージアム・ウォーク サンプル (museum-walk-sample.md)', '配色ミュージアム (color-museum-sample.md)', '印刷・PDF の確認サンプル (print-sample.md)']),
    JSON.stringify({ ...menuState, closedByOutside, closedByEsc }));

  // TC-FILE-003 未編集の状態での読み込みと同梱サンプル選択
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-visual');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('# Lucivo 誌面雛形・ボリューム＆図表サイズ総合サンプル'));
  await waitRendered(page);
  const visualSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const visualSampleMatched = visualSampleValue === fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8').replace(/^\uFEFF/, '');
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-notation');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  await waitRendered(page);
  const notationSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const notationSampleMatched = notationSampleValue === fs.readFileSync(SAMPLE, 'utf8').replace(/^\uFEFF/, '');
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-notation-extra');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('# Lucivo Markdown 発展・詳細記法サンプル'));
  await waitRendered(page);
  const extraSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const extraSampleMatched = extraSampleValue === fs.readFileSync(path.join(APP_DIR, 'samples', 'notation_sample_extra1.md'), 'utf8').replace(/^\uFEFF/, '');
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-museum-walk');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('# 回遊する文書'));
  await waitRendered(page);
  const museumSampleValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const museumSampleMatched = museumSampleValue === fs.readFileSync(path.join(APP_DIR, 'samples', 'museum-walk-sample.md'), 'utf8').replace(/^\uFEFF/, '');
  await page.evaluate(() => { document.getElementById('markdown-editor').value = ''; lastLoadedMarkdown = ''; renderApp(); });
  await waitRendered(page);
  const dialogOnFirstLoad = await loadSample(page);
  const after = await page.evaluate(() => ({
    h1: (document.querySelector('#standard-doc-container h1') || {}).textContent,
    cards: document.querySelectorAll('#standard-doc-container [data-stage-index]').length,
    inputCleared: document.getElementById('file-input').value === '',
    toast: document.getElementById('toast-message').textContent
  }));
  const editorValue = await page.evaluate(() => document.getElementById('markdown-editor').value);
  after.sameAsFile = editorValue === await formattedForLoad(page, fs.readFileSync(SAMPLE, 'utf8').replace(/^\uFEFF/, ''));
  record('TC-FILE-003',
    !dialogOnFirstLoad && visualSampleMatched && notationSampleMatched && extraSampleMatched && museumSampleMatched && after.sameAsFile && after.h1 === 'Lucivo サンプル文書' && after.cards > 0 && /読み込みました/.test(after.toast),
    JSON.stringify({ dialogOnFirstLoad, visualSampleMatched, notationSampleMatched, extraSampleMatched, ...after }));
  record('TC-FILE-006', after.inputCleared, `file-input.value cleared: ${after.inputCleared}`);

  // TC-FILE-011 読み込み直後は読み取り専用で、「閲覧 | 編集」の切り替えの「編集」で編集できる
  const editorLockState = () => ({
    readOnly: document.getElementById('markdown-editor').readOnly,
    lockShown: !document.getElementById('editor-lock').classList.contains('hidden'),
    viewActive: document.getElementById('btn-edit-lock').classList.contains('is-active') && document.getElementById('btn-edit-lock').getAttribute('aria-pressed') === 'true',
    editActive: document.getElementById('btn-edit-unlock').classList.contains('is-active') && document.getElementById('btn-edit-unlock').getAttribute('aria-pressed') === 'true',
    errBtnDisabled: document.getElementById('btn-test-err').disabled
  });
  const lockedEditor = await page.evaluate(editorLockState);
  const beforeType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#markdown-editor');
  await page.keyboard.type('XYZ');
  const afterType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#btn-edit-unlock');
  const unlockedEditor = await page.evaluate(editorLockState);
  record('TC-FILE-011', lockedEditor.readOnly && lockedEditor.lockShown && lockedEditor.viewActive && !lockedEditor.editActive && lockedEditor.errBtnDisabled && beforeType === afterType
    && !unlockedEditor.readOnly && unlockedEditor.lockShown && !unlockedEditor.viewActive && unlockedEditor.editActive && !unlockedEditor.errBtnDisabled,
    JSON.stringify({ lockedEditor, typedIgnored: beforeType === afterType, unlockedEditor }));

  // TC-FILE-015 「閲覧」を押すと読み取り専用に戻り、入力しても内容が変わらない。「編集」で再び編集できる
  await page.click('#btn-edit-lock');
  const relockedEditor = await page.evaluate(editorLockState);
  const beforeRelockType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#markdown-editor');
  await page.keyboard.type('XYZ');
  const afterRelockType = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#btn-edit-unlock');
  const reunlockedEditor = await page.evaluate(editorLockState);
  record('TC-FILE-015', relockedEditor.readOnly && relockedEditor.viewActive && !relockedEditor.editActive && relockedEditor.errBtnDisabled && beforeRelockType === afterRelockType
    && !reunlockedEditor.readOnly && reunlockedEditor.editActive,
    JSON.stringify({ relockedEditor, typedIgnored: beforeRelockType === afterRelockType, reunlockedEditor }));

  // TC-FILE-004 編集後の読み込み：キャンセルで内容を保つ（TC-FILE-011 で編集できる状態にしてある）
  await page.fill('#markdown-editor', '# 編集中の文書');
  let dialogMessage = null;
  page.once('dialog', d => { dialogMessage = d.message(); d.dismiss(); });
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForTimeout(500);
  const keep = await page.evaluate(() => document.getElementById('markdown-editor').value);
  record('TC-FILE-004', dialogMessage !== null && keep === '# 編集中の文書', JSON.stringify({ dialogMessage, keep }));

  // TC-FILE-005 編集後の読み込み：OK で置き換える
  let accepted = false;
  page.once('dialog', d => { accepted = true; d.accept(); });
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  const relocked = await page.evaluate(() => document.getElementById('markdown-editor').readOnly);
  record('TC-FILE-005', accepted && relocked, `dialog accepted and replaced: ${accepted}, read-only again: ${relocked}`);

  // TC-FILE-012 保存：読み込んだファイル名で、エディタの内容をダウンロードし、その後の読み込みで確認しない
  await page.click('#btn-edit-unlock');
  await page.fill('#markdown-editor', '---\ntitle: 保存のテスト\n---\n# 保存した文書\n');
  await page.click('#btn-save-menu');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save-markdown')]);
  const savedText = fs.readFileSync(await download.path(), 'utf8');
  const savedName = download.suggestedFilename();
  let dialogAfterSave = false;
  const onDialogAfterSave = d => { dialogAfterSave = true; d.dismiss(); };
  page.on('dialog', onDialogAfterSave);
  await page.setInputFiles('#file-input', SAMPLE);
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.includes('\n# Lucivo サンプル文書'));
  page.off('dialog', onDialogAfterSave);
  record('TC-FILE-012', savedName === 'notation_sample.md' && savedText === '---\ntitle: 保存のテスト\n---\n# 保存した文書\n' && !savedText.startsWith('\uFEFF') && !dialogAfterSave,
    JSON.stringify({ savedName, savedLength: savedText.length, dialogAfterSave }));

  // TC-FILE-008 埋め込みサンプルの削除
  const appJs = fs.readFileSync(path.join(APP_DIR, 'js', 'app.js'), 'utf8');
  const embedded = /SAMPLE_DOC|次世代インテリジェント分散基盤/.test(appJs);
  record('TC-FILE-008', !embedded, `embedded sample found: ${embedded}`);

  record('TC-FILE-007', page.url().startsWith('file://') && page.consoleErrors.length === 0, `url=${page.url().slice(0, 40)}... consoleErrors=${JSON.stringify(page.consoleErrors)}`);
  await page.close();
}

// TC-FILE-035: 公開 URL パラメータ（?url=... / #url=...）からの Markdown 読み込み（FR-050, DD-FILE-087）
async function testUrlLoading(browser) {
  const sjisBuf = fs.readFileSync(path.join(ROOT_DIR, 'tests', 'fixtures', 'encoding', 'sjis-lf.md'));
  const sjisExpected = fs.readFileSync(path.join(ROOT_DIR, 'tests', 'fixtures', 'encoding', 'source.md'), 'utf8').replace(/\r\n?/g, '\n');

  const routeHandler = route => {
    const u = route.request().url();
    if (u === 'https://example.com/docs/guide.md') {
      return route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' },
        body: '# Remote Guide\n\nLoaded via URL parameter.\n'
      });
    }
    if (u === 'https://example.com/docs/sjis_note.md') {
      return route.fulfill({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown' },
        body: sjisBuf
      });
    }
    return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
  };

  // 1) ?url=... での UTF-8 読み込み
  const ctx1 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p1 = await ctx1.newPage();
  p1.consoleErrors = [];
  p1.on('console', m => { if (m.type() === 'error') p1.consoleErrors.push(m.text().slice(0, 200)); });
  p1.on('pageerror', e => p1.consoleErrors.push('pageerror: ' + e.message));
  await p1.route('https://example.com/**', routeHandler);
  await p1.goto(`${APP_URL}?url=${encodeURIComponent('https://example.com/docs/guide.md')}`);
  await p1.waitForFunction(() => document.getElementById('markdown-editor') && document.getElementById('markdown-editor').value.includes('# Remote Guide'), null, { timeout: 10000 });
  await waitRendered(p1);
  const queryRes = await p1.evaluate(() => ({
    val: document.getElementById('markdown-editor').value,
    readOnly: document.getElementById('markdown-editor').readOnly,
    title: document.title,
    h1: (document.querySelector('#standard-doc-container h1') || {}).textContent || ''
  }));
  await ctx1.close();

  // 2) #url=... での Shift_JIS 読み込み（decodeMarkdown 経由）
  const ctx2 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p2 = await ctx2.newPage();
  await p2.route('https://example.com/**', routeHandler);
  await p2.goto(`${APP_URL}#url=${encodeURIComponent('https://example.com/docs/sjis_note.md')}`);
  await p2.waitForFunction(() => document.getElementById('markdown-editor') && document.getElementById('markdown-editor').value.length > 0, null, { timeout: 10000 });
  await waitRendered(p2);
  // URL から開いた文書も、読み込み時に整える（FR-053）。期待する文書は source.md を同じ部品で整えたもの
  const hashRes = await p2.evaluate(src => ({
    val: document.getElementById('markdown-editor').value,
    readOnly: document.getElementById('markdown-editor').readOnly,
    title: document.title,
    expected: window.LucivoFormatter ? window.LucivoFormatter.format(src).text : null
  }), sjisExpected);
  await ctx2.close();

  // 3) 不正スキーム（javascript:）では通信せず警告トーストを出す
  const ctx3 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p3 = await ctx3.newPage();
  const blockedReqs = [];
  p3.on('request', r => { if (!r.url().startsWith('file:')) blockedReqs.push(r.url()); });
  await p3.goto(`${APP_URL}?url=${encodeURIComponent('javascript:alert(1)')}`);
  await p3.waitForFunction(() => (document.getElementById('toast-message') || {}).textContent.includes('http://'), null, { timeout: 5000 }).catch(() => {});
  const badScheme = await p3.evaluate(() => ({
    toast: (document.getElementById('toast-message') || {}).textContent || '',
    val: document.getElementById('markdown-editor').value
  }));
  await ctx3.close();

  // 4) 404 エラー時は失敗トーストを出してクラッシュしない
  const ctx4 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p4 = await ctx4.newPage();
  await p4.route('https://example.com/**', routeHandler);
  await p4.goto(`${APP_URL}?url=${encodeURIComponent('https://example.com/missing.md')}`);
  await p4.waitForFunction(() => (document.getElementById('toast-message') || {}).textContent.includes('読み込めませんでした'), null, { timeout: 5000 }).catch(() => {});
  const errRes = await p4.evaluate(() => ({
    toast: (document.getElementById('toast-message') || {}).textContent || '',
    val: document.getElementById('markdown-editor').value
  }));
  await ctx4.close();

  record('TC-FILE-035',
    queryRes.val === '# Remote Guide\n\nLoaded via URL parameter.\n'
    && queryRes.readOnly === true && queryRes.title === 'guide.md - Lucivo' && queryRes.h1 === 'Remote Guide'
    && p1.consoleErrors.length === 0
    && hashRes.expected !== null && hashRes.val === hashRes.expected && hashRes.val !== sjisExpected && hashRes.readOnly === true && hashRes.title === 'sjis_note.md - Lucivo'
    && blockedReqs.length === 0 && badScheme.val === '' && badScheme.toast.includes('http / https')
    && errRes.val === '' && errRes.toast.includes('読み込めませんでした'),
    JSON.stringify({ queryRes, hashTitle: hashRes.title, hashMatch: hashRes.val === hashRes.expected, formatted: hashRes.val !== sjisExpected, blockedReqs, badScheme, errRes, consoleErrors: p1.consoleErrors }));

  // Web 版サーバーを起動して、アドレスバー書き換え（replaceState）・blob 読み替え・URL ドロップ・表示状態パラメータを検証する
  const server = await startWebServer();
  try {
    const ghRoute = route => {
      const u = route.request().url();
      if (u === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/docs/guide.md') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Blob Rewritten\n' });
      }
      if (u === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/v1.0/docs/raw.md') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Raw Segment\n' });
      }
      if (u === 'https://example.com/docs/guide.md') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Remote Guide\n' });
      }
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
    };

    // TC-FILE-041: GitHub blob URL の読み替えと ?url= 反映・解除
    const blobUrl = 'https://github.com/prankster-freedom/Lucivo/blob/main/docs/guide.md?raw=true';
    const ctx41 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p41 = await ctx41.newPage();
    await p41.route('https://raw.githubusercontent.com/**', ghRoute);
    await mockWebSamples(p41);
    await p41.goto(`${server.url}?url=${encodeURIComponent(blobUrl)}`);
    await p41.waitForFunction(() => document.getElementById('markdown-editor')?.value.includes('# Blob Rewritten'), null, { timeout: 10000 });
    const blobLoadedUrl = await p41.evaluate(() => new URL(window.location.href).searchParams.get('url'));
    await p41.click('#btn-file-menu');
    await p41.click('#menu-sample-notation');
    await p41.waitForFunction(() => document.title === 'notation_sample.md - Lucivo', null, { timeout: 10000 });
    const sampleRawUrl = await p41.evaluate(() => new URL(window.location.href).searchParams.get('url'));
    await p41.click('#btn-file-menu');
    await p41.setInputFiles('#file-input', SAMPLE);
    await p41.waitForFunction(() => !new URL(window.location.href).searchParams.has('url'), null, { timeout: 10000 });
    const afterLocalHasUrl = await p41.evaluate(() => new URL(window.location.href).searchParams.has('url'));
    await ctx41.close();

    const ctx41Err = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p41Err = await ctx41Err.newPage();
    await p41Err.route('https://raw.githubusercontent.com/**', ghRoute);
    await p41Err.goto(`${server.url}?url=${encodeURIComponent('https://github.com/prankster-freedom/Lucivo/blob/feature/x/docs/missing.md')}`);
    await p41Err.waitForFunction(() => (document.getElementById('toast-message')?.textContent || '').includes('raw URL'), null, { timeout: 5000 }).catch(() => {});
    const blobErrToast = await p41Err.evaluate(() => document.getElementById('toast-message')?.textContent || '');
    await ctx41Err.close();

    record('TC-FILE-041',
      blobLoadedUrl === blobUrl
        && Boolean(sampleRawUrl && sampleRawUrl.endsWith('/public/samples/notation_sample.md'))
        && afterLocalHasUrl === false
        && blobErrToast.includes('raw URL'),
      JSON.stringify({ blobLoadedUrl, sampleRawUrl, afterLocalHasUrl, blobErrToast }));

    // TC-FILE-042: 公開 URL のドラッグ&ドロップ
    const ctx42 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p42 = await ctx42.newPage();
    await p42.route('https://raw.githubusercontent.com/**', ghRoute);
    await p42.route('https://example.com/**', ghRoute);
    await p42.goto(server.url);
    await p42.waitForFunction(() => typeof renderApp === 'function');
    const dropTargetUrl = 'https://github.com/prankster-freedom/Lucivo/raw/v1.0/docs/raw.md';
    await p42.evaluate(u => {
      const dt = new DataTransfer();
      dt.setData('text/uri-list', u);
      dt.setData('text/plain', u);
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    }, dropTargetUrl);
    await p42.waitForFunction(() => document.getElementById('markdown-editor')?.value.includes('# Raw Segment'), null, { timeout: 10000 });
    const urlAfterDrop = await p42.evaluate(() => new URL(window.location.href).searchParams.get('url'));

    // ファイルと URL 同時ドロップ時はファイル優先、?url= は外れる
    await p42.evaluate(() => {
      const dt = new DataTransfer();
      dt.items.add(new File(['# Local Drop\n'], 'local-drop.md', { type: 'text/markdown' }));
      dt.setData('text/uri-list', 'https://example.com/docs/guide.md');
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });
    await p42.waitForFunction(() => document.title === 'local-drop.md - Lucivo', null, { timeout: 10000 });
    const afterMixedDrop = await p42.evaluate(() => ({
      val: document.getElementById('markdown-editor')?.value,
      hasUrl: new URL(window.location.href).searchParams.has('url')
    }));

    // 不正スキームのドロップは拒否
    await p42.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/uri-list', 'javascript:alert(1)');
      window.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
    });
    await p42.waitForFunction(() => (document.getElementById('toast-message')?.textContent || '').includes('http / https'), null, { timeout: 5000 }).catch(() => {});
    const badDropToast = await p42.evaluate(() => document.getElementById('toast-message')?.textContent || '');
    await ctx42.close();

    record('TC-FILE-042',
      urlAfterDrop === dropTargetUrl && afterMixedDrop.val === '# Local Drop\n' && afterMixedDrop.hasUrl === false && badDropToast.includes('http / https'),
      JSON.stringify({ urlAfterDrop, afterMixedDrop, badDropToast }));

    // TC-FILE-043: URL パラメータによる表示状態の復元と同期
    const ctx43 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p43 = await ctx43.newPage();
    await p43.goto(`${server.url}?mode=visual&theme=dark&style=cards&tone=matcha-wagashi&view=code&bad=xxx`);
    await p43.waitForFunction(() => typeof renderApp === 'function');
    const restored = await p43.evaluate(() => ({
      isVisualMode: window.state.isVisualMode,
      appearance: window.state.appearance,
      style: window.state.infographicStyle,
      tone: window.state.tone,
      viewMode: window.state.viewMode,
      histLen: window.history.length
    }));
    await p43.click('#btn-mode-fast');
    await p43.click('#btn-theme-toggle');
    await p43.click('.view-mode-btn[data-view-mode="split"]');
    const afterToggle = await p43.evaluate(() => {
      const sp = new URL(window.location.href).searchParams;
      return {
        hasMode: sp.has('mode'),
        hasTheme: sp.has('theme'),
        hasView: sp.has('view'),
        style: sp.get('style'),
        tone: sp.get('tone'),
        histLen: window.history.length
      };
    });
    // #style=editorial&theme=invalid での復元（style 指定で自動的に visual、不正な theme は無視して light）
    await p43.goto(`${server.url}#style=editorial&theme=invalid`);
    await p43.waitForFunction(() => typeof renderApp === 'function');
    const hashState = await p43.evaluate(() => ({
      isVisualMode: window.state.isVisualMode,
      style: window.state.infographicStyle,
      appearance: window.state.appearance
    }));
    await ctx43.close();

    record('TC-FILE-043',
      restored.isVisualMode === true && restored.appearance === 'dark' && restored.style === 'cards'
      && restored.tone === 'matcha-wagashi' && restored.viewMode === 'editor'
      && afterToggle.hasMode === false && afterToggle.hasTheme === false && afterToggle.hasView === false
      && afterToggle.style === 'cards' && afterToggle.tone === 'matcha-wagashi'
      && afterToggle.histLen === restored.histLen
      && hashState.isVisualMode === true && hashState.style === 'editorial' && hashState.appearance === 'light',
      JSON.stringify({ restored, afterToggle, hashState }));

    // TC-FILE-044: 公開 URL 文書内の相対パス画像・Markdown リンク解決（#280）
    const svgBody = '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><rect width="120" height="60" fill="#2563EB"/></svg>';
    const extraMd = '# Extra Sample\n\n![Flow](images/lucivo-flow.svg)\n\n[Next](notation_sample.md#target-sec)\n';
    const nextMd = '# Notation\n\n' + Array.from({ length: 30 }, (_, i) => `Paragraph ${i}\n`).join('\n') + '\n## Target Sec\n\nFound!\n';
    const ghRelRoute = route => {
      const u = route.request().url();
      if (u === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/notation_sample_extra1.md') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: extraMd });
      }
      if (u === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/images/lucivo-flow.svg') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'image/svg+xml' }, body: svgBody });
      }
      if (u === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/notation_sample.md') {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: nextMd });
      }
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
    };
    const ctx44 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p44 = await ctx44.newPage();
    await p44.route('https://raw.githubusercontent.com/**', ghRelRoute);
    const startBlob = 'https://github.com/prankster-freedom/Lucivo/blob/main/public/samples/notation_sample_extra1.md';
    await p44.goto(`${server.url}?url=${encodeURIComponent(startBlob)}`);
    await p44.waitForFunction(() => document.querySelector('#standard-doc-container img[src*="raw.githubusercontent.com"]')?.complete, null, { timeout: 10000 });
    const relImg = await p44.evaluate(() => {
      const img = document.querySelector('#standard-doc-container img[src*="raw.githubusercontent.com"]');
      return { src: img?.getAttribute('src') || '', naturalWidth: img?.naturalWidth || 0 };
    });
    await p44.click('#standard-doc-container a[href="notation_sample.md#target-sec"]');
    await p44.waitForFunction(() => document.title === 'notation_sample.md - Lucivo', null, { timeout: 10000 });
    await p44.waitForFunction(() => document.getElementById('preview-scroll').scrollTop > 0, null, { timeout: 5000 }).catch(() => {});
    const relLink = await p44.evaluate(() => ({
      urlParam: new URL(window.location.href).searchParams.get('url'),
      scrollTop: document.getElementById('preview-scroll').scrollTop
    }));
    await ctx44.close();

    record('TC-FILE-044',
      relImg.src === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/images/lucivo-flow.svg'
      && relImg.naturalWidth === 120
      && relLink.urlParam === 'https://github.com/prankster-freedom/Lucivo/blob/main/public/samples/notation_sample.md'
      && relLink.scrollTop > 0,
      JSON.stringify({ relImg, relLink }));

    // TC-FILE-045: GitHub tree URL からのフォルダ読み込み（#281）
    const treeJson = {
      truncated: false,
      tree: [
        { path: 'public/samples/README.md', type: 'blob' },
        { path: 'public/samples/guide.md', type: 'blob' },
        { path: 'public/samples/sub/detail.md', type: 'blob' },
        { path: 'public/samples/.hidden/secret.md', type: 'blob' },
        { path: 'public/samples/images/lucivo-flow.svg', type: 'blob' },
        { path: 'other/skip.md', type: 'blob' }
      ]
    };
    const treeUrl = 'https://github.com/prankster-freedom/Lucivo/tree/main/public/samples';
    const ctx45 = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p45 = await ctx45.newPage();
    await p45.route('https://api.github.com/repos/**', route => route.fulfill({
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      body: JSON.stringify(treeJson)
    }));
    await p45.route('https://raw.githubusercontent.com/**', route => {
      const u = route.request().url();
      if (u.endsWith('/public/samples/README.md')) {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Samples Readme\n\n![Flow](images/lucivo-flow.svg)\n' });
      }
      if (u.endsWith('/public/samples/sub/detail.md')) {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Sub Detail\n' });
      }
      if (u.endsWith('/public/samples/images/lucivo-flow.svg')) {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'image/svg+xml' }, body: svgBody });
      }
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
    });
    await p45.goto(`${server.url}?url=${encodeURIComponent(treeUrl)}`);
    await p45.waitForFunction(() => document.title === 'README.md - Lucivo', null, { timeout: 10000 });
    await p45.waitForFunction(() => document.querySelector('#standard-doc-container img')?.complete, null, { timeout: 10000 });
    const treeInit = await p45.evaluate(() => ({
      items: Array.from(document.querySelectorAll('#folder-list .folder-list-item')).map(el => el.textContent.trim()),
      imgWidth: document.querySelector('#standard-doc-container img')?.naturalWidth || 0,
      urlParam: new URL(window.location.href).searchParams.get('url')
    }));
    await p45.click('#folder-list .folder-list-item[data-path="sub/detail.md"]');
    await p45.waitForFunction(() => document.title === 'detail.md - Lucivo', null, { timeout: 10000 });
    const afterSub = await p45.evaluate(() => ({
      val: document.getElementById('markdown-editor')?.value,
      urlParam: new URL(window.location.href).searchParams.get('url')
    }));
    await p45.click('#btn-folder-close');
    const afterCloseUrl = await p45.evaluate(() => new URL(window.location.href).searchParams.has('url'));
    await ctx45.close();

    // API 403 レート制限時のエラー通知
    const ctx45Err = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p45Err = await ctx45Err.newPage();
    await p45Err.route('https://api.github.com/repos/**', route => route.fulfill({ status: 403, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' }));
    await p45Err.goto(`${server.url}?url=${encodeURIComponent(treeUrl)}`);
    await p45Err.waitForFunction(() => (document.getElementById('toast-message')?.textContent || '').includes('制限'), null, { timeout: 5000 }).catch(() => {});
    const rateToast = await p45Err.evaluate(() => document.getElementById('toast-message')?.textContent || '');
    await ctx45Err.close();

    // スラッシュ入りブランチ名の GitHub tree URL 解決（#370）
    const slashTreeUrl = 'https://github.com/prankster-freedom/Lucivo/tree/feature/Gemini-color-tones-review/doc/0.DTP';
    const ctx45Slash = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const p45Slash = await ctx45Slash.newPage();
    const slashApiHits = [];
    await p45Slash.route('https://api.github.com/repos/**', route => {
      const u = route.request().url();
      slashApiHits.push(u);
      if (u.includes('/git/matching-refs/heads/feature')) {
        return route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { ref: 'refs/heads/feature/pre-test' },
            { ref: 'refs/heads/feature/Gemini-color-tones-review' }
          ])
        });
      }
      if (u.includes('/git/trees/feature/Gemini-color-tones-review?recursive=1')) {
        return route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
          body: JSON.stringify({
            truncated: false,
            tree: [
              { path: 'doc/0.DTP/README.md', type: 'blob' },
              { path: 'doc/0.DTP/notes.md', type: 'blob' }
            ]
          })
        });
      }
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
    });
    await p45Slash.route('https://raw.githubusercontent.com/**', route => {
      const u = route.request().url();
      if (u.includes('/feature/Gemini-color-tones-review/doc/0.DTP/README.md')) {
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' }, body: '# Slash Branch OK\n' });
      }
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
    });
    await p45Slash.goto(`${server.url}?url=${encodeURIComponent(slashTreeUrl)}`);
    await p45Slash.waitForFunction(() => document.title === 'README.md - Lucivo', null, { timeout: 10000 });
    const slashResult = await p45Slash.evaluate(() => ({
      items: Array.from(document.querySelectorAll('#folder-list .folder-list-item')).map(el => el.textContent.trim()),
      val: document.getElementById('markdown-editor')?.value,
      urlParam: new URL(window.location.href).searchParams.get('url')
    }));
    await ctx45Slash.close();

    record('TC-FILE-045',
      treeInit.items.includes('README.md') && treeInit.items.includes('guide.md') && treeInit.items.includes('detail.md')
      && !treeInit.items.some(t => t.includes('secret') || t.includes('skip'))
      && treeInit.imgWidth === 120 && treeInit.urlParam === treeUrl
      && afterSub.val === '# Sub Detail\n' && afterSub.urlParam === treeUrl
      && afterCloseUrl === false
      && rateToast.includes('利用回数制限')
      && slashApiHits.some(u => u.includes('/git/matching-refs/heads/feature'))
      && slashResult.items.includes('README.md') && slashResult.items.includes('notes.md')
      && slashResult.val === '# Slash Branch OK\n' && slashResult.urlParam === slashTreeUrl,
      JSON.stringify({ treeInit, afterSub, afterCloseUrl, rateToast, slashResult }));

    // TC-FILE-050: 起動画面の公開 URL 貼り付け入力欄（スマホ幅 390px 含む、#373）
    const ctx50 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p50 = await ctx50.newPage();
    let p50UnexpectedFetch = false;
    await p50.route('https://example.test/**', route => {
      if (route.request().url().endsWith('/mobile-url.md')) {
        return route.fulfill({
          status: 200,
          headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/markdown; charset=utf-8' },
          body: '# Mobile URL Opened\n'
        });
      }
      p50UnexpectedFetch = true;
      return route.fulfill({ status: 404, headers: { 'Access-Control-Allow-Origin': '*' }, body: 'Not Found' });
    });
    await p50.goto(server.url);
    await p50.waitForSelector('.empty-guide-url-form [data-empty-url-input]');
    const mobileLayout = await p50.evaluate(() => ({
      noOverflow: document.documentElement.scrollWidth <= window.innerWidth + 1,
      formVisible: Boolean(document.querySelector('#standard-doc-container [data-empty-url-form]'))
    }));
    await p50.fill('#standard-doc-container [data-empty-url-input]', 'javascript:alert(1)');
    await p50.click('#standard-doc-container [data-empty-url-form] button[type="submit"]');
    await p50.waitForFunction(() => (document.getElementById('toast-message')?.textContent || '').includes('http / https'), null, { timeout: 5000 });
    const invalidToast50 = await p50.evaluate(() => document.getElementById('toast-message')?.textContent || '');
    const targetUrl50 = 'https://example.test/docs/mobile-url.md';
    await p50.fill('#standard-doc-container [data-empty-url-input]', targetUrl50);
    await p50.click('#standard-doc-container [data-empty-url-form] button[type="submit"]');
    await p50.waitForFunction(() => document.title === 'mobile-url.md - Lucivo', null, { timeout: 10000 });
    const loaded50 = await p50.evaluate(() => ({
      val: document.getElementById('markdown-editor')?.value,
      urlParam: new URL(window.location.href).searchParams.get('url')
    }));
    await ctx50.close();
    record('TC-FILE-050',
      mobileLayout.noOverflow && mobileLayout.formVisible && !p50UnexpectedFetch
      && invalidToast50.includes('http / https')
      && loaded50.val === '# Mobile URL Opened\n' && loaded50.urlParam === targetUrl50,
      JSON.stringify({ mobileLayout, invalidToast50, loaded50, p50UnexpectedFetch }));

    // TC-FILE-047: 狭い画面（< 1024px）でも view=canvas 等のカスタマイズ済み URL パラメータが保持される（#307）
    const ctx47 = await browser.newContext({ viewport: { width: 900, height: 800 } });
    const p47 = await ctx47.newPage();
    await p47.goto(server.url);
    await p47.waitForFunction(() => typeof renderApp === 'function', null, { timeout: 10000 });
    await p47.evaluate(() => {
      document.querySelector('.view-mode-btn[data-view-mode="canvas"]')?.click();
      document.getElementById('mode-visual-btn')?.click();
      document.querySelector('.info-style-btn[data-info-style="cards"]')?.click();
      document.querySelector('#tone-menu .tone-menu-item[data-tone-id="cobalt-workshop"]')?.click();
    });
    await waitRendered(p47);
    const sharedQuery = await p47.evaluate(() => window.location.search);
    await ctx47.close();
    record('TC-FILE-047',
      sharedQuery.includes('view=canvas') && sharedQuery.includes('mode=visual')
      && sharedQuery.includes('style=cards') && sharedQuery.includes('tone=cobalt-workshop'),
      JSON.stringify({ sharedQuery }));

    // TC-FILE-051: 起動画面サムネイルカード（Web 版 3 枚・別タブ遷移 / スタンドアロン版 2 枚・戻る対応、FR-007, FR-068）
    const ctx51 = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ja-JP' });
    const p51 = await ctx51.newPage();
    await mockWebSamples(p51);
    await p51.goto(server.url);
    await p51.waitForFunction(() => document.querySelectorAll('.empty-guide-sample-card').length === 3, null, { timeout: 10000 });
    const webCards = await p51.evaluate(() => ({
      ids: Array.from(document.querySelectorAll('.empty-guide-sample-card')).map(c => c.getAttribute('data-sample-card')),
      thumbsOk: Array.from(document.querySelectorAll('.empty-guide-sample-thumb img')).every(img => img.complete && img.naturalWidth > 0),
      notationLinks: document.querySelectorAll('[data-sample-card="notation"] .empty-guide-sample-link').length,
      allBlankTarget: Array.from(document.querySelectorAll('.empty-guide-sample-link')).every(a => a.getAttribute('target') === '_blank'),
      visualHref: document.querySelector('[data-sample-card="visual"] .empty-guide-sample-link')?.getAttribute('href') || '',
      museumHref: document.querySelector('[data-sample-card="color-museum"] .empty-guide-sample-link')?.getAttribute('href') || ''
    }));
    const [p51NotationTab] = await Promise.all([
      ctx51.waitForEvent('page'),
      p51.click('[data-sample-card="notation"] .empty-guide-sample-link')
    ]);
    await mockWebSamples(p51NotationTab);
    await p51NotationTab.waitForFunction(() => document.title === 'notation_sample.md - Lucivo', null, { timeout: 10000 });
    const webSampleUrl = await p51NotationTab.evaluate(() => new URL(window.location.href).searchParams.get('url') || '');
    await p51NotationTab.close();

    const [p51VisualTab] = await Promise.all([
      ctx51.waitForEvent('page'),
      p51.click('[data-sample-card="visual"] .empty-guide-sample-link')
    ]);
    await mockWebSamples(p51VisualTab);
    await p51VisualTab.waitForFunction(() => document.title === 'visual-sample.md - Lucivo' && document.getElementById('btn-visual-mode')?.classList.contains('is-active'), null, { timeout: 10000 });
    const visualOpened = await p51VisualTab.evaluate(() => ({
      isVisual: document.getElementById('btn-visual-mode')?.classList.contains('is-active') === true,
      hasModeParam: new URL(window.location.href).searchParams.get('mode') === 'visual'
    }));
    await p51VisualTab.close();
    await ctx51.close();

    // スマホ幅 390px で起動画面のカードが横はみ出ししないこと
    const ctx51Mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'ja-JP' });
    const p51Mobile = await ctx51Mobile.newPage();
    await p51Mobile.goto(server.url);
    await p51Mobile.waitForFunction(() => document.querySelectorAll('.empty-guide-sample-card').length === 3, null, { timeout: 10000 });
    const narrowOverflow = await p51Mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    await ctx51Mobile.close();

    const p51Dist = await openApp(browser, { viewport: { width: 1280, height: 900 }, locale: 'ja-JP' });
    const distCards = await p51Dist.evaluate(() => ({
      ids: Array.from(document.querySelectorAll('.empty-guide-sample-card')).map(c => c.getAttribute('data-sample-card')),
      thumbsOk: Array.from(document.querySelectorAll('.empty-guide-sample-thumb img')).every(img => img.complete && img.naturalWidth > 0)
    }));
    await p51Dist.click('[data-sample-card="visual"] [data-empty-sample="visual-sample.md"]');
    await p51Dist.waitForFunction(() => document.title === 'visual-sample.md - Lucivo' && document.getElementById('btn-visual-mode')?.classList.contains('is-active'), null, { timeout: 10000 });
    await p51Dist.goBack();
    await p51Dist.waitForFunction(() => Boolean(document.querySelector('.empty-guide')), null, { timeout: 10000 });
    const distBackToGuide = await p51Dist.evaluate(() => Boolean(document.querySelector('.empty-guide')));
    await p51Dist.close();

    record('TC-FILE-051',
      JSON.stringify(webCards.ids) === JSON.stringify(['visual', 'notation', 'color-museum'])
        && webCards.thumbsOk
        && webCards.notationLinks === 2
        && webCards.allBlankTarget
        && webCards.visualHref.includes('mode=visual')
        && webCards.museumHref.includes('present=museum-walk') && webCards.museumHref.includes('theme=dark')
        && !narrowOverflow
        && visualOpened.isVisual && visualOpened.hasModeParam
        && webSampleUrl.endsWith('/public/samples/notation_sample.md')
        && JSON.stringify(distCards.ids) === JSON.stringify(['visual', 'notation'])
        && distCards.thumbsOk
        && distBackToGuide,
      JSON.stringify({ webCards, narrowOverflow, visualOpened, webSampleUrl, distCards, distBackToGuide }));

    // TC-FILE-052: present=museum-walk による自動起動と Esc 復帰・スマホ抑止・スタンドアロン無視（FR-069）
    const ctx52 = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'ja-JP' });
    const p52 = await ctx52.newPage();
    await mockWebSamples(p52);
    const museumRaw = 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/color-museum-sample.md';
    await p52.goto(`${server.url}?url=${encodeURIComponent(museumRaw)}&mode=visual&theme=dark&present=museum-walk`);
    await p52.waitForFunction(() => document.documentElement.classList.contains('is-museum-walk'), null, { timeout: 15000 });
    const startedState = await p52.evaluate(() => ({
      appearance: document.body.getAttribute('data-appearance'),
      hasPresentParam: new URL(window.location.href).searchParams.has('present'),
      hasUrlParam: new URL(window.location.href).searchParams.get('url') === 'https://raw.githubusercontent.com/prankster-freedom/Lucivo/main/public/samples/color-museum-sample.md'
    }));
    await p52.keyboard.press('Escape');
    await p52.waitForFunction(() => !document.documentElement.classList.contains('is-museum-walk'), null, { timeout: 10000 });
    const afterEsc = await p52.evaluate(() => ({
      appearance: document.body.getAttribute('data-appearance'),
      isVisual: document.getElementById('btn-visual-mode')?.classList.contains('is-active') === true
    }));
    await ctx52.close();

    // スマホ端末（pointer: coarse + 幅 390px）でも起動すること（#397）
    const ctx52Mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, locale: 'ja-JP' });
    const p52Mobile = await ctx52Mobile.newPage();
    await mockWebSamples(p52Mobile);
    await p52Mobile.goto(`${server.url}?url=${encodeURIComponent(museumRaw)}&mode=visual&theme=dark&present=museum-walk`);
    await p52Mobile.waitForFunction(() => document.documentElement.classList.contains('is-museum-walk'), null, { timeout: 20000 });
    const mobileStarted = await p52Mobile.evaluate(() => document.documentElement.classList.contains('is-museum-walk'));
    await ctx52Mobile.close();

    // スタンドアロン版では present=museum-walk を無視して通常表示になる
    const p52Dist = await openApp(browser, {
      url: `${APP_URL}?mode=visual&theme=dark&present=museum-walk`,
      viewport: { width: 1280, height: 900 },
      locale: 'ja-JP'
    });
    await p52Dist.waitForTimeout(400);
    const distIgnored = await p52Dist.evaluate(() => !document.documentElement.classList.contains('is-museum-walk'));
    await p52Dist.close();

    record('TC-FILE-052',
      startedState.appearance === 'dark'
        && startedState.hasPresentParam === false
        && startedState.hasUrlParam
        && afterEsc.appearance === 'dark' && afterEsc.isVisual
        && mobileStarted
        && distIgnored,
      JSON.stringify({ startedState, afterEsc, mobileStarted, distIgnored }));
  } finally {
    await server.close();
  }
}

async function testTitleAndDrop(browser) {
  const page = await openStagePage(browser);
  const initialTitle = await page.title();
  await loadSample(page);
  const loadedTitle = await page.title();
  // loadSample はメニューを開いたままにするため、閉じてから開き直す
  await page.evaluate(() => closeFileMenu());
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-visual');
  await page.waitForFunction(() => document.title.startsWith('visual-sample.md'));
  const sampleTitle = await page.title();
  record('TC-FILE-017', /^Lucivo Markdown Presenter/.test(initialTitle) && loadedTitle === 'notation_sample.md - Lucivo' && sampleTitle === 'visual-sample.md - Lucivo',
    JSON.stringify({ initialTitle, loadedTitle, sampleTitle }));

  // ファイルを持った DataTransfer を作り、ドラッグの出入りとドロップを起こす
  const makeTransfer = files => page.evaluateHandle(list => {
    const dt = new DataTransfer();
    list.forEach(f => dt.items.add(new File([f.text], f.name, { type: f.type })));
    return dt;
  }, files);
  const overlayShown = () => page.evaluate(() => {
    const o = document.getElementById('drop-overlay');
    return o.classList.contains('is-shown') && o.getAttribute('aria-hidden') === 'false';
  });
  const dropped = '# ドロップした文書\n\n本文\n';
  const dt = await makeTransfer([{ name: 'dropped.md', type: 'text/markdown', text: dropped }, { name: 'second.md', type: 'text/markdown', text: '# 2 つ目\n' }]);
  await page.dispatchEvent('#preview-scroll', 'dragenter', { dataTransfer: dt });
  // 子要素へ移ったとき（dragenter → dragleave の順に起きる）も、表示を消さない
  await page.dispatchEvent('#markdown-editor', 'dragenter', { dataTransfer: dt });
  await page.dispatchEvent('#preview-scroll', 'dragleave', { dataTransfer: dt });
  const shownWhileDragging = await overlayShown();
  await page.dispatchEvent('#markdown-editor', 'dragleave', { dataTransfer: dt });
  const hiddenAfterLeave = !(await overlayShown());
  await page.dispatchEvent('#preview-scroll', 'dragenter', { dataTransfer: dt });
  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dt });
  await page.waitForFunction(text => document.getElementById('markdown-editor').value === text, dropped);
  await waitRendered(page);
  const afterDrop = await page.evaluate(() => ({
    overlayHidden: !document.getElementById('drop-overlay').classList.contains('is-shown'),
    title: document.title,
    h1: (document.querySelector('#preview-scroll h1') || {}).textContent,
    readOnly: document.getElementById('markdown-editor').readOnly,
    toast: document.getElementById('toast-message').textContent
  }));
  // 編集した後のドロップは、ファイル選択と同じく確認する
  await page.click('#btn-edit-unlock');
  await page.fill('#markdown-editor', '# 編集中');
  let dialogMessage = null;
  page.once('dialog', d => { dialogMessage = d.message(); d.dismiss(); });
  const dt2 = await makeTransfer([{ name: 'other.md', type: 'text/markdown', text: '# 別の文書\n' }]);
  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dt2 });
  await page.waitForTimeout(300);
  const keptAfterCancel = await page.evaluate(() => document.getElementById('markdown-editor').value);
  record('TC-FILE-018', shownWhileDragging && hiddenAfterLeave && afterDrop.overlayHidden && afterDrop.title === 'dropped.md - Lucivo'
    && afterDrop.h1 === 'ドロップした文書' && afterDrop.readOnly && /読み込みました/.test(afterDrop.toast)
    && /other\.md/.test(dialogMessage || '') && keptAfterCancel === '# 編集中',
  JSON.stringify({ shownWhileDragging, hiddenAfterLeave, ...afterDrop, dialogMessage, keptAfterCancel }));

  // 開けないファイルは読み込まず、知らせる。ファイルでないもの（文字列）のドラッグでは受け付けの表示を出さない
  await setDocument(page, '# そのまま\n');
  const dt3 = await makeTransfer([{ name: 'image.png', type: 'image/png', text: 'x' }]);
  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dt3 });
  await page.waitForTimeout(200);
  const rejected = await page.evaluate(() => ({ editor: document.getElementById('markdown-editor').value, toast: document.getElementById('toast-message').textContent }));
  const textTransfer = await page.evaluateHandle(() => { const t = new DataTransfer(); t.setData('text/plain', 'abc'); return t; });
  await page.dispatchEvent('#preview-scroll', 'dragenter', { dataTransfer: textTransfer });
  const shownForText = await overlayShown();
  record('TC-FILE-019', rejected.editor === '# そのまま\n' && /\.md/.test(rejected.toast) && !shownForText && page.consoleErrors.length === 0,
    JSON.stringify({ ...rejected, shownForText, errors: page.consoleErrors }));

  // TC-FILE-032 フォルダのドラッグ&ドロップ（Chromium: File System Access API / WebKit: webkitGetAsEntry フォールバック / 同時ドロップ優先）
  await page.evaluate(() => {
    const file = (name, text, type) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type }) });
    const dir = (name, children) => ({
      kind: 'directory', name,
      async *entries() { for (const c of children) yield [c.name, c]; },
      async getDirectoryHandle(n) { const c = children.find(x => x.name === n && x.kind === 'directory'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async getFileHandle(n) { const c = children.find(x => x.name === n && x.kind === 'file'); if (!c) throw new DOMException('', 'NotFoundError'); return c; }
    });
    window.__fakeHandleDir = dir('ドロップ資料', [
      file('README.md', '# ドロップフォルダのREADME\n', 'text/markdown'),
      file('note.txt', 'テキストメモ', 'text/plain')
    ]);
    window.__origGetAsFileSystemHandle = DataTransferItem.prototype.getAsFileSystemHandle;
    window.__origWebkitGetAsEntry = DataTransferItem.prototype.webkitGetAsEntry;
    DataTransferItem.prototype.getAsFileSystemHandle = async function() {
      return window.__mockHandle !== undefined ? window.__mockHandle : (window.__origGetAsFileSystemHandle ? window.__origGetAsFileSystemHandle.call(this) : null);
    };
    DataTransferItem.prototype.webkitGetAsEntry = function() {
      return window.__mockEntry !== undefined ? window.__mockEntry : (window.__origWebkitGetAsEntry ? window.__origWebkitGetAsEntry.call(this) : null);
    };
    window.__mockHandle = window.__fakeHandleDir;
    window.__mockEntry = null;
  });

  const dtFolderHandle = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([''], 'placeholder.txt'));
    return dt;
  });

  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dtFolderHandle });
  await page.waitForFunction(() => openedFolder && openedFolder.name === 'ドロップ資料');
  const handleDropState = await page.evaluate(() => ({
    opened: !!openedFolder,
    name: openedFolder ? openedFolder.name : null,
    files: openedFolder ? openedFolder.files.map(f => f.name) : [],
    paneShown: !document.getElementById('folder-pane').classList.contains('hidden'),
    toast: document.getElementById('toast-message').textContent
  }));

  // 一旦フォルダを閉じる
  await page.click('#btn-folder-close');
  await page.waitForTimeout(200);

  // WebKit 方式（webkitGetAsEntry）のフォルダドロップ
  await page.evaluate(() => {
    window.__mockHandle = null; // getAsFileSystemHandle を null にしてフォールバックさせる
    window.__mockEntry = {
      isFile: false,
      isDirectory: true,
      name: 'エントリフォルダ',
      createReader() {
        let read = false;
        return {
          readEntries(resolve) {
            if (read) return resolve([]);
            read = true;
            resolve([
              {
                isFile: true,
                isDirectory: false,
                name: 'index.md',
                file(cb) { cb(new File(['# Entry Index'], 'index.md', { type: 'text/markdown' })); }
              }
            ]);
          }
        };
      }
    };
  });

  const dtFolderEntry = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([''], 'placeholder.txt'));
    return dt;
  });

  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dtFolderEntry });
  await page.waitForFunction(() => openedFolder && openedFolder.name === 'エントリフォルダ');
  const entryDropState = await page.evaluate(() => ({
    opened: !!openedFolder,
    name: openedFolder ? openedFolder.name : null,
    files: openedFolder ? openedFolder.files.map(f => f.name) : [],
    paneShown: !document.getElementById('folder-pane').classList.contains('hidden'),
    toast: document.getElementById('toast-message').textContent
  }));

  // フォルダとファイルが同時にドロップされたときはフォルダが優先される
  await page.click('#btn-folder-close');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const file = (name, text, type) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type }) });
    const dir = (name, children) => ({
      kind: 'directory', name,
      async *entries() { for (const c of children) yield [c.name, c]; },
      async getDirectoryHandle(n) { const c = children.find(x => x.name === n && x.kind === 'directory'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async getFileHandle(n) { const c = children.find(x => x.name === n && x.kind === 'file'); if (!c) throw new DOMException('', 'NotFoundError'); return c; }
    });
    window.__mockHandle = dir('同時ドロップフォルダ', [file('doc.md', '# Doc', 'text/markdown')]);
    window.__mockEntry = null;
  });

  const dtMixed = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(['# Single'], 'single-file.md', { type: 'text/markdown' }));
    return dt;
  });

  await page.dispatchEvent('#preview-scroll', 'drop', { dataTransfer: dtMixed });
  await page.waitForFunction(() => openedFolder && openedFolder.name === '同時ドロップフォルダ');
  const mixedDropState = await page.evaluate(() => ({
    opened: !!openedFolder,
    name: openedFolder ? openedFolder.name : null
  }));

  // プロトタイプを元に戻す
  await page.evaluate(() => {
    DataTransferItem.prototype.getAsFileSystemHandle = window.__origGetAsFileSystemHandle;
    DataTransferItem.prototype.webkitGetAsEntry = window.__origWebkitGetAsEntry;
    delete window.__mockHandle;
    delete window.__mockEntry;
  });

  const folderDropOk = handleDropState.opened && handleDropState.name === 'ドロップ資料'
    && handleDropState.files.includes('README.md') && handleDropState.paneShown
    && entryDropState.opened && entryDropState.name === 'エントリフォルダ'
    && entryDropState.files.includes('index.md') && entryDropState.paneShown
    && mixedDropState.opened && mixedDropState.name === '同時ドロップフォルダ';

  record('TC-FILE-032', folderDropOk, JSON.stringify({ handleDropState, entryDropState, mixedDropState }));

  // TC-FILE-033 本物のドロップと同じく、drop の処理で最初に待った後に dataTransfer の中身が空になるときも、
  // ファイルとフォルダを開ける（#69）。ページの中で作った DataTransfer は待った後も読めるため、読めなくなる形を模す
  await page.evaluate(() => {
    window.__protectedDrop = (files, mockHandle) => {
      const dt = new DataTransfer();
      files.forEach(f => dt.items.add(new File([f.text], f.name, { type: f.type })));
      const realItems = Array.from(dt.items);
      const realFiles = Array.from(dt.files);
      let protectedMode = false;
      const fake = {
        types: ['Files'],
        dropEffect: 'copy',
        get items() { return protectedMode ? [] : realItems; },
        get files() { return protectedMode ? [] : realFiles; }
      };
      const ev = new Event('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: fake });
      window.__mockHandle = mockHandle;
      window.__mockEntry = null;
      // drop の処理が最初に await した直後（同期の部分が終わった後）に、中身を読めなくする
      queueMicrotask(() => { protectedMode = true; });
      document.getElementById('preview-scroll').dispatchEvent(ev);
    };
    DataTransferItem.prototype.getAsFileSystemHandle = async function() {
      return window.__mockHandle !== undefined ? window.__mockHandle : null;
    };
    DataTransferItem.prototype.webkitGetAsEntry = function() {
      return window.__mockEntry !== undefined ? window.__mockEntry : null;
    };
  });
  await page.evaluate(() => { document.getElementById('markdown-editor').value = ''; lastLoadedMarkdown = ''; });
  await page.evaluate(() => window.__protectedDrop([{ name: 'protected.md', type: 'text/markdown', text: '# 保護されたドロップ\n' }], null));
  const protectedFile = await page.waitForFunction(() => document.title === 'protected.md - Lucivo', null, { timeout: 3000 }).then(() => true, () => false);
  const protectedFileState = await page.evaluate(() => ({
    title: document.title,
    editor: document.getElementById('markdown-editor').value,
    toast: document.getElementById('toast-message').textContent
  }));
  await page.evaluate(() => {
    const file = (name, text, type) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type }) });
    const dir = (name, children) => ({
      kind: 'directory', name,
      async *entries() { for (const c of children) yield [c.name, c]; },
      async getDirectoryHandle(n) { const c = children.find(x => x.name === n && x.kind === 'directory'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async getFileHandle(n) { const c = children.find(x => x.name === n && x.kind === 'file'); if (!c) throw new DOMException('', 'NotFoundError'); return c; }
    });
    window.__protectedDrop([{ name: 'placeholder.txt', type: 'text/plain', text: '' }], dir('保護フォルダ', [file('a.md', '# A', 'text/markdown')]));
  });
  const protectedFolder = await page.waitForFunction(() => openedFolder && openedFolder.name === '保護フォルダ', null, { timeout: 3000 }).then(() => true, () => false);
  await page.evaluate(() => {
    DataTransferItem.prototype.getAsFileSystemHandle = window.__origGetAsFileSystemHandle;
    DataTransferItem.prototype.webkitGetAsEntry = window.__origWebkitGetAsEntry;
    delete window.__mockHandle;
    delete window.__mockEntry;
  });
  record('TC-FILE-033', protectedFile && protectedFileState.editor === '# 保護されたドロップ\n' && protectedFolder && page.consoleErrors.length === 0,
    JSON.stringify({ protectedFile, protectedFileState, protectedFolder, errors: page.consoleErrors }));
  await page.context().close();
}

// 図のドラッグ移動（TC-DIAG-026）と Ctrl + ホイールの拡大・縮小（TC-DIAG-027、TC-DIAG-028）
async function testLocalImages(browser) {
  const page = await openStagePage(browser);
  const logo = path.join(APP_DIR, 'assets', 'logos', 'light', 'favicon.svg').replace(/\\/g, '/');
  const fileUrl = 'file://' + (logo.startsWith('/') ? '' : '/') + logo;
  const md = [
    '# 画像',
    `![file-url](${fileUrl})`,
    `<img alt="html-file-url" src="${fileUrl}" width="48">`,
    `![abs](${logo})`,
    '![win-slash](C:/work/a.png)',
    '![win-backslash](C:\\work\\docs\\a.png)',
    '<img alt="html-win" src="C:\\work\\a.png">',
    '<img alt="unc" src="\\\\server\\share\\a.png">',
    '![rel](images/missing.png)',
    '<img alt="js" src="javascript:alert(1)">',
    '[link](file:///etc/hosts) <a href="file:///etc/hosts">a</a>'
  ].join('\n\n');
  const rows = [];
  for (const mode of ['fast', 'visual']) {
    if (mode === 'visual') await page.click('#btn-visual-mode');
    await setDocument(page, md);
    await page.waitForFunction(() => {
      const root = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
      const imgs = Array.from(root.querySelectorAll('img')).filter(i => i.getAttribute('alt') !== 'js');
      return imgs.every(i => i.complete);
    }, null, { timeout: 10000 }).catch(() => {});
    await page.waitForTimeout(300);
    rows.push(await page.evaluate(() => {
      const root = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
      const img = alt => root.querySelector(`img[alt="${alt}"]`);
      const missing = Array.from(root.querySelectorAll('.img-missing')).map(m => ({
        label: m.getAttribute('aria-label'), path: m.querySelector('.img-missing-path').textContent, hint: Boolean(m.querySelector('.img-missing-hint'))
      }));
      const loaded = alt => { const i = img(alt); return Boolean(i && i.complete && i.naturalWidth > 0); };
      return {
        visual: state.isVisualMode,
        fileUrl: loaded('file-url'), htmlFileUrl: loaded('html-file-url'), htmlWidth: img('html-file-url') && img('html-file-url').getBoundingClientRect().width, abs: loaded('abs'),
        missing,
        jsSrc: img('js') ? img('js').getAttribute('src') : 'removed',
        fileLinks: Array.from(root.querySelectorAll('a')).filter(a => /^file:/i.test(a.getAttribute('href') || '')).length
      };
    }));
  }
  const byLabel = (r, alt) => r.missing.find(m => m.label === `画像を読み込めません: ${alt}`);
  // TC-MD-013: file:// の URL と絶対パスは表示され、Windows のパスは file:/// の URL に直る
  record('TC-MD-013', rows.every(r => r.fileUrl && r.htmlFileUrl && Math.round(r.htmlWidth) === 48 && r.abs
    && (byLabel(r, 'win-slash') || {}).path === 'file:///C:/work/a.png'
    && (byLabel(r, 'win-backslash') || {}).path === 'file:///C:/work/docs/a.png'
    && (byLabel(r, 'html-win') || {}).path === 'file:///C:/work/a.png'
    && (byLabel(r, 'unc') || {}).path === 'file://server/share/a.png'), JSON.stringify(rows));
  // TC-MD-014: 読み込めない画像は、読み込めないことと src を示す。相対パスには、相対パスを使えない理由を添える
  record('TC-MD-014', rows.every(r => (byLabel(r, 'rel') || {}).path === 'images/missing.png' && byLabel(r, 'rel').hint
    && !byLabel(r, 'win-slash').hint), JSON.stringify(rows.map(r => r.missing)));
  // TC-MD-015: 画像の src の javascript: と、リンクの file: は、今までどおり消す
  record('TC-MD-015', rows.every(r => r.jsSrc === null && r.fileLinks === 0) && page.consoleErrors.filter(e => !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(e)).length === 0,
    JSON.stringify({ rows: rows.map(r => ({ jsSrc: r.jsSrc, fileLinks: r.fileLinks })), errors: page.consoleErrors }));
  await page.context().close();
}

// 開く・保存のメニュー（TC-FILE-021）とフォルダを開く機能（TC-FILE-022〜025）
// Playwright は、日本語の名前のフォルダ・ファイルを入力欄に渡せない（止まる、または中身を読めない）ため、
// 入力欄の方式は英字の名前の tests/fixtures/folder で、日本語の名前は File System Access API を模したハンドルで確かめる
const FOLDER_FIXTURE = path.join(ROOT_DIR, 'tests', 'fixtures', 'folder');

async function folderState(page) {
  return page.evaluate(() => {
    const root = document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
    const img = alt => root.querySelector(`img[alt="${alt}"]`);
    const loaded = alt => { const i = img(alt); return Boolean(i && i.complete && i.naturalWidth > 0); };
    return {
      paneShown: !document.getElementById('folder-pane').classList.contains('hidden'),
      railShown: !document.getElementById('btn-folder-show').classList.contains('hidden'),
      name: document.getElementById('folder-pane-name').textContent,
      items: Array.from(document.querySelectorAll('#folder-list > *')).map(e => (e.classList.contains('folder-list-dir') ? 'DIR ' : '') + e.textContent),
      current: Array.from(document.querySelectorAll('.folder-list-item.is-current')).map(e => e.dataset.path),
      title: document.title,
      saveName: document.getElementById('save-file-name').textContent,
      loaded: ['up', 'html', 'space', 'logo', '図'].filter(loaded),
      htmlWidth: img('html') ? Math.round(img('html').getBoundingClientRect().width) : null,
      missing: Array.from(root.querySelectorAll('.img-missing')).map(m => ({ path: m.querySelector('.img-missing-path').textContent, hint: (m.querySelector('.img-missing-hint') || {}).textContent || '' }))
    };
  });
}

async function testFolder(browser) {
  const page = await openStagePage(browser);

  // TC-FILE-021: 「開く」と「保存」のメニュー。片方を開くと、もう片方は閉じる
  await page.click('#btn-file-menu');
  const openMenu = await page.evaluate(() => ({
    label: document.querySelector('#btn-file-menu span').textContent,
    items: Array.from(document.querySelectorAll('#file-menu [role="menuitem"]:not(.hidden)')).map(e => e.textContent.trim())
  }));
  await page.click('#btn-save-menu');
  const saveMenu = await page.evaluate(() => ({
    label: document.querySelector('#btn-save-menu span').textContent,
    // 見えている項目だけを数える
    items: Array.from(document.querySelectorAll('#save-menu [role="menuitem"]')).filter(e => e.getClientRects().length > 0).map(e => e.textContent.trim()),
    fileMenuClosed: document.getElementById('file-menu').classList.contains('hidden'),
    expanded: document.getElementById('btn-save-menu').getAttribute('aria-expanded')
  }));
  await page.keyboard.press('Escape');
  const saveClosed = await page.evaluate(() => document.getElementById('save-menu').classList.contains('hidden'));
  record('TC-FILE-021', openMenu.label === '開く' && openMenu.items.slice(0, 2).join() === 'ファイルを開く…,フォルダを開く…'
    && saveMenu.label === '保存' && saveMenu.items.join() === 'Markdown を保存（untitled.md）,印刷 / PDF として保存…'
    && saveMenu.fileMenuClosed && saveMenu.expanded === 'true' && saveClosed, JSON.stringify({ openMenu, saveMenu, saveClosed }));

  // TC-FILE-022: 入力欄の方式でフォルダを開き、一覧から開いた文書の相対パスの画像を表示する
  await page.evaluate(() => { preferFolderInput = true; });
  await page.click('#btn-file-menu');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu-open-folder')]);
  await chooser.setFiles(FOLDER_FIXTURE);
  await page.waitForFunction(() => openedFolder);
  const listed = await folderState(page);
  const toast = await page.evaluate(() => document.getElementById('toast-message').textContent);
  await page.click('.folder-list-item[data-path="docs/spec.md"]');
  await page.waitForFunction(() => document.title.startsWith('spec.md'));
  await page.waitForTimeout(500);
  const fast = await folderState(page);
  await page.click('#btn-visual-mode');
  await waitRendered(page);
  await page.waitForTimeout(500);
  const visual = await folderState(page);
  const imagesOk = s => s.loaded.join() === 'up,html,space' && s.missing.length === 2
    && s.missing[0].path === 'docs/missing.svg' && /見つかりません/.test(s.missing[0].hint)
    && s.missing[1].path === '../../outside.svg' && /フォルダの外/.test(s.missing[1].hint);
  record('TC-FILE-022', listed.paneShown && !listed.railShown && listed.name === 'folder'
    && listed.items.join('|') === 'memo.txt|README.md|DIR docs/|spec.md|DIR docs/sub/|2_overview.md|10_detail.md'
    && /「folder」を開きました。Markdown 5 件/.test(toast)
    && fast.title === 'spec.md - Lucivo' && fast.saveName === 'spec.md' && fast.current.join() === 'docs/spec.md'
    && imagesOk(fast) && fast.htmlWidth === 40 && imagesOk(visual),
  JSON.stringify({ listed, toast, fast, visual }));

  // TC-FILE-027: 文書の中の Markdown へのリンク。Lucivo の中で開き、#以降の見出しへ送る。フォルダにないファイルは知らせる
  await page.click('#btn-mode-fast');
  await waitRendered(page);
  const appUrl = page.url();
  await page.click('#standard-doc-container a:text-is("nothing")');
  await page.waitForTimeout(200);
  const notFound = await page.evaluate(() => ({ toast: document.getElementById('toast-message').textContent, title: document.title }));
  await page.click('#standard-doc-container a:text-is("overview")');
  await page.waitForFunction(() => document.title.startsWith('2_overview.md'));
  await page.waitForTimeout(900);
  const linked = await page.evaluate(() => {
    const scroller = document.getElementById('preview-scroll');
    const h = Array.from(scroller.querySelectorAll('h2')).find(x => x.textContent === 'Details');
    return {
      current: Array.from(document.querySelectorAll('.folder-list-item.is-current')).map(e => e.dataset.path),
      headingTop: h ? Math.round(h.getBoundingClientRect().top - scroller.getBoundingClientRect().top) : null,
      scrollTop: Math.round(scroller.scrollTop)
    };
  });
  record('TC-FILE-027', /「docs\/none\.md」はフォルダの中に見つかりません/.test(notFound.toast) && notFound.title === 'spec.md - Lucivo'
    && linked.current.join() === 'docs/sub/2_overview.md' && linked.scrollTop > 0 && linked.headingTop >= 0 && linked.headingTop < 120
    && page.url() === appUrl, JSON.stringify({ notFound, linked, url: page.url() === appUrl }));
  // 以降の確かめのため、spec.md に戻す
  await page.click('.folder-list-item[data-path="docs/spec.md"]');
  await page.waitForFunction(() => document.title.startsWith('spec.md'));
  await page.waitForTimeout(500);

  // TC-FILE-023: 一覧を隠す・戻す（隠したことを覚える）。フォルダを閉じる
  await page.click('#btn-folder-hide');
  const hidden = await folderState(page);
  const remembered = await page.evaluate(() => localStorage.getItem('lucivo.folderPaneCollapsed'));
  await page.click('#btn-folder-show');
  const shown = await folderState(page);
  await page.click('#btn-folder-close');
  await waitRendered(page);
  await page.waitForTimeout(300);
  const closed = await folderState(page);
  // フォルダを閉じた後の Markdown へのリンクは、画面を移さずに案内する
  await page.click('#standard-doc-container a:text-is("overview")');
  await page.waitForTimeout(200);
  const linkWithoutFolder = await page.evaluate(() => ({ toast: document.getElementById('toast-message').textContent, title: document.title }));
  record('TC-FILE-023', !hidden.paneShown && hidden.railShown && remembered === '1' && shown.paneShown && !shown.railShown
    && !closed.paneShown && !closed.railShown && closed.loaded.length === 0
    && closed.missing.some(m => m.path === '../images/logo.svg' && /フォルダを開く/.test(m.hint))
    && /フォルダを開く/.test(linkWithoutFolder.toast) && linkWithoutFolder.title === 'spec.md - Lucivo' && page.url() === appUrl,
  JSON.stringify({ hidden, remembered, shown, closed, linkWithoutFolder }));

  // TC-FILE-024: File System Access API の方式（模したハンドル）。日本語の名前、node_modules と隠しフォルダの除外、前回のフォルダ
  await page.evaluate(() => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><rect width="30" height="30" fill="#6CC4C9"/></svg>';
    const file = (name, text, type) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type }) });
    const dir = (name, children) => ({
      kind: 'directory', name,
      async *entries() { for (const c of children) yield [c.name, c]; },
      async getDirectoryHandle(n) { const c = children.find(x => x.name === n && x.kind === 'directory'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async getFileHandle(n) { const c = children.find(x => x.name === n && x.kind === 'file'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; }
    });
    window.__fakeRoot = dir('資料', [
      file('はじめに.md', '# はじめに\n\n![図](<画像/図 1.svg>)\n', 'text/markdown'),
      dir('画像', [file('図 1.svg', svg, 'image/svg+xml')]),
      dir('node_modules', [dir('pkg', [file('readme.md', '# x', 'text/markdown')])]),
      dir('.git', [file('HEAD.md', 'x', 'text/markdown')])
    ]);
    window.showDirectoryPicker = async () => window.__fakeRoot;
    preferFolderInput = false;
  });
  await page.click('#btn-file-menu');
  await page.click('#menu-open-folder');
  await page.waitForFunction(() => openedFolder && openedFolder.name === '資料');
  const fsListed = await folderState(page);
  // Visualモードの表紙に h1 が移るため、高速モードで確かめる
  await page.click('#btn-mode-fast');
  await page.click('.folder-list-item[data-path="はじめに.md"]');
  await page.waitForFunction(() => document.title.startsWith('はじめに.md'));
  await page.waitForTimeout(500);
  const fsOpened = await folderState(page);
  const recentItem = await page.evaluate(() => {
    const item = document.getElementById('menu-open-recent-folder');
    return item.classList.contains('hidden') ? null : item.textContent;
  });
  await page.click('#btn-folder-close');
  await page.click('#btn-file-menu');
  await page.click('#menu-open-recent-folder');
  await page.waitForFunction(() => openedFolder && openedFolder.name === '資料');
  const reopened = await folderState(page);
  record('TC-FILE-024', fsListed.items.join('|') === 'はじめに.md' && fsListed.name === '資料'
    && fsOpened.loaded.join() === '図' && fsOpened.current.join() === 'はじめに.md'
    && recentItem === '前回のフォルダ「資料」を開く' && reopened.paneShown,
  JSON.stringify({ fsListed, fsOpened, recentItem, reopened }));

  // TC-FILE-025: File System Access API が使えないとき（file:// で拒まれたなど）は、入力欄の方式に切り替える
  await page.evaluate(() => { window.showDirectoryPicker = async () => { throw new DOMException('blocked', 'SecurityError'); }; preferFolderInput = false; });
  await page.click('#btn-file-menu');
  const chooserPromise = page.waitForEvent('filechooser', { timeout: 5000 }).then(() => true, () => false);
  await page.click('#menu-open-folder');
  const fellBack = await chooserPromise;
  const prefer = await page.evaluate(() => preferFolderInput);
  const unexpected = page.consoleErrors.filter(e => !/ERR_FILE_NOT_FOUND|Failed to load resource/.test(e));
  record('TC-FILE-025', fellBack && prefer && unexpected.length === 0, JSON.stringify({ fellBack, prefer, errors: unexpected }));

  // TC-FILE-049: フォルダ内文書の横断全文検索と該当箇所への移動・強調（FR-064, #331）
  await page.evaluate(() => {
    const file = (name, text, type) => ({ kind: 'file', name, getFile: async () => new File([text], name, { type }) });
    const dir = (name, children) => ({
      kind: 'directory', name,
      async *entries() { for (const c of children) yield [c.name, c]; },
      async getDirectoryHandle(n) { const c = children.find(x => x.name === n && x.kind === 'directory'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async getFileHandle(n) { const c = children.find(x => x.name === n && x.kind === 'file'); if (!c) throw new DOMException('', 'NotFoundError'); return c; },
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; }
    });
    const filler = Array.from({ length: 18 }, (_, i) => `段落 ${i + 1}: 背景説明テキストです。`).join('\n\n');
    window.__searchRoot = dir('検索資料', [
      file('01-overview.md', `# 概要仕様\n\n## 1. 目的\n\n本システムは REQ-ALPHA-101 を満たします。\n`, 'text/markdown'),
      dir('specs', [
        file('02-detail.md', `# 詳細設計\n\n## 1. 前提\n\n${filler}\n\n## 2. 検索対象の章\n\nここで REQ-ALPHA-101 の詳細な振る舞いを定義します。\nさらに REQ-ALPHA-101 を検証します。\n`, 'text/markdown')
      ])
    ]);
    window.showDirectoryPicker = async () => window.__searchRoot;
    preferFolderInput = false;
  });
  await page.click('#btn-file-menu');
  await page.click('#menu-open-folder');
  await page.waitForFunction(() => openedFolder && openedFolder.name === '検索資料');

  await page.fill('#folder-search-input', 'REQ-ALPHA-101');
  await page.waitForFunction(() => {
    const items = document.querySelectorAll('#folder-search-results .folder-search-item');
    return items.length === 3;
  });

  const searchListState = await page.evaluate(() => ({
    status: document.getElementById('folder-search-status').textContent,
    listHidden: document.getElementById('folder-list').classList.contains('hidden'),
    resultsVisible: !document.getElementById('folder-search-results').classList.contains('hidden'),
    clearVisible: !document.getElementById('btn-folder-search-clear').classList.contains('hidden'),
    groups: Array.from(document.querySelectorAll('#folder-search-results .folder-search-file-group')).map(g => ({
      path: g.querySelector('.folder-search-file-path').textContent,
      count: g.querySelector('.folder-search-file-count').textContent
    })),
    items: Array.from(document.querySelectorAll('#folder-search-results .folder-search-item')).map(it => ({
      path: it.dataset.path,
      line: Number(it.dataset.line),
      heading: it.querySelector('.folder-search-item-heading').textContent,
      mark: it.querySelector('mark.folder-search-mark')?.textContent || ''
    }))
  }));

  // 2 つ目のファイル（specs/02-detail.md）の結果をクリックして文書が開き、該当箇所がハイライト・スクロールされることを確認
  await page.click('#folder-search-results .folder-search-item[data-path="specs/02-detail.md"]');
  await page.waitForFunction(() => document.title === '02-detail.md - Lucivo');
  await waitRendered(page);
  await page.waitForTimeout(300);

  const fastJumpState = await page.evaluate(() => {
    const std = document.getElementById('standard-doc-container');
    const marks = Array.from(std.querySelectorAll('mark.lucivo-search-hit'));
    const editor = document.getElementById('markdown-editor');
    const selectedText = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    return {
      title: document.title,
      markCount: marks.length,
      markText: marks[0]?.textContent || '',
      selectedText,
      scrollTop: Math.round(document.getElementById('preview-scroll').scrollTop)
    };
  });

  // Visualモードでも検索結果クリックで該当スラブへ移動・ハイライトされることを確認
  await page.click('#btn-visual-mode');
  await waitRendered(page);
  await page.waitForTimeout(300);
  await page.click('#folder-search-results .folder-search-item[data-path="specs/02-detail.md"]');
  await page.waitForTimeout(300);

  const visualJumpState = await page.evaluate(() => {
    const vis = document.getElementById('visual-stage-container');
    const marks = Array.from(vis.querySelectorAll('mark.lucivo-search-hit'));
    const activeSlab = marks[0]?.closest('.exhibition-slab');
    return {
      markCount: marks.length,
      slabStageNo: activeSlab?.getAttribute('data-stage-no') || ''
    };
  });

  // クリアボタンで通常一覧に戻り、プレビューのハイライトも消えることを確認
  await page.click('#btn-folder-search-clear');
  const clearedState = await page.evaluate(() => ({
    inputVal: document.getElementById('folder-search-input').value,
    listVisible: !document.getElementById('folder-list').classList.contains('hidden'),
    resultsHidden: document.getElementById('folder-search-results').classList.contains('hidden'),
    remainingMarks: document.querySelectorAll('mark.lucivo-search-hit').length
  }));

  record('TC-FILE-049',
    searchListState.status === '2 ファイル・3 件一致'
    && searchListState.listHidden && searchListState.resultsVisible && searchListState.clearVisible
    && searchListState.groups.length === 2
    && searchListState.items[1].path === 'specs/02-detail.md'
    && searchListState.items[1].heading === '2. 検索対象の章'
    && searchListState.items[1].mark === 'REQ-ALPHA-101'
    && fastJumpState.title === '02-detail.md - Lucivo'
    && fastJumpState.markCount === 2
    && fastJumpState.markText === 'REQ-ALPHA-101'
    && fastJumpState.selectedText === 'REQ-ALPHA-101'
    && fastJumpState.scrollTop > 0
    && visualJumpState.markCount === 2
    && visualJumpState.slabStageNo === '02'
    && clearedState.inputVal === ''
    && clearedState.listVisible && clearedState.resultsHidden && clearedState.remainingMarks === 0,
    JSON.stringify({ searchListState, fastJumpState, visualJumpState, clearedState })
  );
  await page.context().close();
}

// 同梱サンプルの画像と、サンプルの間のリンク（TC-FILE-028）
async function testSampleLinks(browser) {
  const page = await openStagePage(browser);
  await page.click('#btn-file-menu');
  await page.click('#menu-sample-notation-extra');
  await page.waitForFunction(() => document.title.startsWith('notation_sample_extra1.md'));
  await waitRendered(page);
  await page.waitForTimeout(500);
  const images = await page.evaluate(() => Array.from(document.querySelectorAll('#standard-doc-container img')).map(i => ({
    src: i.getAttribute('src'), loaded: i.complete && i.naturalWidth > 0, width: Math.round(i.getBoundingClientRect().width)
  })));
  // 同じ文書の中の見出しへのリンク
  await page.click('#standard-doc-container a:text-is("この文書の「2. リンクと参照リンク」")');
  const headingTop = text => page.evaluate(t => {
    const scroller = document.getElementById('preview-scroll');
    const h = Array.from(scroller.querySelectorAll('h2')).find(x => x.textContent.trim() === t);
    return h ? Math.round(h.getBoundingClientRect().top - scroller.getBoundingClientRect().top) : null;
  }, text);
  // 文書の末尾から先頭近くまで滑らかにスクロールするため、届くまで待つ
  const waitHeading = t => page.waitForFunction(text => {
    const scroller = document.getElementById('preview-scroll');
    const h = Array.from(scroller.querySelectorAll('h2')).find(x => x.textContent.trim() === text);
    const top = h ? h.getBoundingClientRect().top - scroller.getBoundingClientRect().top : -1;
    return top >= 0 && top < 120;
  }, t, { timeout: 5000 }).catch(() => null);
  await waitHeading('2. リンクと参照リンク（Reference Links）');
  const selfTop = await headingTop('2. リンクと参照リンク（Reference Links）');
  // 別のサンプルの見出しへのリンク
  await page.click('#standard-doc-container a:text-is("記法サンプルの「6. 表」")');
  await page.waitForFunction(() => document.title.startsWith('notation_sample.md'));
  await waitRendered(page);
  await waitHeading('6. 表');
  const otherTop = await headingTop('6. 表');
  const url = page.url();
  record('TC-FILE-028', images.length === 2 && images.every(i => i.loaded && i.src === 'samples/images/lucivo-flow.svg') && images[1].width === 320
    && selfTop !== null && selfTop >= 0 && selfTop < 120 && otherTop !== null && otherTop >= 0 && otherTop < 120
    && url.endsWith('/dist/index.html') && page.consoleErrors.length === 0,
  JSON.stringify({ images, selfTop, otherTop, url: url.slice(-30), errors: page.consoleErrors }));
  await page.context().close();
}

// フォルダ構成のツリー（TC-MD-017〜019）
const ENCODING_CASES = [
  ['utf8-lf.md', 'UTF-8'], ['utf8-crlf.md', 'UTF-8'], ['utf8-cr.md', 'UTF-8'], ['utf8-mixed.md', 'UTF-8'],
  ['utf8-bom-crlf.md', 'UTF-8 (BOM)'], ['utf16le-bom-crlf.md', 'UTF-16LE'],
  ['sjis-crlf.md', 'Shift_JIS'], ['sjis-lf.md', 'Shift_JIS'], ['eucjp-lf.md', 'EUC-JP'], ['iso2022jp-lf.md', 'ISO-2022-JP']
];

async function testEncoding(browser) {
  const page = await openStagePage(browser);
  // 文字コードの判定だけを確かめるため、読み込み時の整形（FR-053）は止める。整形は testFormatter で確かめる
  await page.evaluate(() => localStorage.setItem('lucivo.formatOnLoad', '0'));
  const expected = fs.readFileSync(path.join(ENCODING_FIXTURE, 'source.md'), 'utf8');
  const dialogs = [];
  page.on('dialog', d => { dialogs.push(d.message()); d.accept(); });

  // TC-FILE-029: 文字コードを判定して読み、改行コードを LF にそろえる。編集していなければ、次のファイルを開くときに確認しない
  const rows = [];
  for (const [name, encoding] of ENCODING_CASES) {
    await page.click('#btn-file-menu');
    await page.setInputFiles('#file-input', path.join(ENCODING_FIXTURE, name));
    await page.waitForFunction(n => document.title === `${n} - Lucivo`, name);
    await waitRendered(page);
    const r = await page.evaluate(() => ({
      value: document.getElementById('markdown-editor').value,
      dirty: document.getElementById('markdown-editor').value !== lastLoadedMarkdown,
      toast: document.getElementById('toast-message').textContent,
      h1: (document.querySelector('#standard-doc-container h1') || {}).textContent,
      cell: (document.querySelector('#standard-doc-container td:last-child') || {}).textContent,
      svg: document.querySelectorAll('#standard-doc-container [data-stage-index] > svg').length
    }));
    const utf8 = encoding.startsWith('UTF-8');
    rows.push({ name, ok: r.value === expected && !r.dirty && r.h1 === '文字コードの確認' && r.cell === '日本語の表' && r.svg === 1
      && (utf8 ? /を読み込みました$/.test(r.toast) : r.toast.includes(`${encoding} として読み込みました（保存は UTF-8 になります）`)),
    toast: r.toast, sameText: r.value === expected, dirty: r.dirty });
  }
  record('TC-FILE-029', rows.every(r => r.ok) && dialogs.length === 0, JSON.stringify({ failed: rows.filter(r => !r.ok), dialogs }));

  // TC-FILE-030: Shift_JIS で読んだ文書の保存は UTF-8（BOM なし）で、元の文字コードと違うことを知らせる
  await page.click('#btn-file-menu');
  await page.setInputFiles('#file-input', path.join(ENCODING_FIXTURE, 'sjis-crlf.md'));
  await page.waitForFunction(() => document.title === 'sjis-crlf.md - Lucivo');
  await page.click('#btn-save-menu');
  const [download] = await Promise.all([page.waitForEvent('download'), page.click('#btn-save-markdown')]);
  const saved = fs.readFileSync(await download.path());
  const saveToast = await page.evaluate(() => document.getElementById('toast-message').textContent);
  record('TC-FILE-030', saved.toString('utf8') === expected && saved[0] !== 0xEF && /UTF-8 で保存しました（元は Shift_JIS）/.test(saveToast),
    JSON.stringify({ sameText: saved.toString('utf8') === expected, bytes: saved.length, saveToast }));

  // TC-FILE-031: フォルダの一覧から開いた Shift_JIS・EUC-JP の文書も、同じく判定して読む
  await page.evaluate(() => { preferFolderInput = true; });
  await page.click('#btn-file-menu');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#menu-open-folder')]);
  await chooser.setFiles(ENCODING_FIXTURE);
  await page.waitForFunction(() => openedFolder);
  const folderRows = [];
  for (const [name, encoding] of [['sjis-crlf.md', 'Shift_JIS'], ['eucjp-lf.md', 'EUC-JP']]) {
    await page.click(`.folder-list-item[data-path="${name}"]`);
    // 直前に同じファイルを開いていてもタイトルは同じなので、読み込みのトーストを待つ
    await page.waitForFunction(n => document.getElementById('toast-message').textContent.startsWith(`「${n}」を`), name);
    folderRows.push(await page.evaluate(([enc, text]) => ({
      ok: document.getElementById('markdown-editor').value === text && document.getElementById('toast-message').textContent.includes(`${enc} として読み込みました`),
      toast: document.getElementById('toast-message').textContent
    }), [encoding, expected]));
  }
  record('TC-FILE-031', folderRows.every(r => r.ok) && dialogs.length === 0 && page.consoleErrors.length === 0,
    JSON.stringify({ folderRows, dialogs, errors: page.consoleErrors }));
  await page.context().close();
}

// TC-FILE-046: ローカルファイルの外部更新の自動反映（FR-062, DD-FILE-094, #282）
async function testAutoReload(browser) {
  const page = await openApp(browser);
  await page.setViewportSize({ width: 1400, height: 900 });
  await waitRendered(page);

  // 擬似 FileSystemFileHandle で showOpenFilePicker をモック
  await page.evaluate(() => {
    window.__mockFileState = {
      text: '# Initial Doc\n\n' + Array.from({ length: 80 }, (_, i) => `Paragraph ${i}\n`).join('\n'),
      lastModified: 1000
    };
    window.showOpenFilePicker = async () => [{
      kind: 'file',
      name: 'live-note.md',
      async getFile() {
        const s = window.__mockFileState;
        const buf = new TextEncoder().encode(s.text).buffer;
        return {
          name: 'live-note.md',
          lastModified: s.lastModified,
          size: buf.byteLength,
          async arrayBuffer() { return buf; }
        };
      }
    }];
  });

  await page.click('#btn-file-menu');
  await page.click('#menu-open-markdown');
  await page.waitForFunction(() => document.title === 'live-note.md - Lucivo', null, { timeout: 10000 });
  await waitRendered(page);

  // スクロールした状態で外部更新（未編集時 → スクロール位置を保って自動反映）
  const beforeScroll = await page.evaluate(() => {
    const sc = document.getElementById('preview-scroll');
    sc.scrollTop = 240;
    window.__mockFileState = {
      text: '# Updated Externally\n\n' + Array.from({ length: 80 }, (_, i) => `Updated ${i}\n`).join('\n'),
      lastModified: 2000
    };
    return { top: sc.scrollTop, sh: sc.scrollHeight, ch: sc.clientHeight, h1: document.querySelector('#standard-doc-container h1')?.textContent || '' };
  });
  await page.evaluate(() => window.checkWatchedFileNow());
  await page.waitForFunction(() => document.getElementById('markdown-editor').value.startsWith('# Updated Externally'), null, { timeout: 5000 });
  const autoRes = await page.evaluate(() => {
    const sc = document.getElementById('preview-scroll');
    return {
      val: document.getElementById('markdown-editor').value.slice(0, 24),
      scrollTop: sc.scrollTop,
      sh: sc.scrollHeight,
      ch: sc.clientHeight,
      bannerHidden: document.getElementById('external-update-banner').classList.contains('hidden'),
      toast: document.getElementById('toast-message').textContent
    };
  });

  // 編集中（未保存変更あり）に外部更新 → 上書きせず確認モーダルとバナー表示、「編集を続ける」→ バナーの「読み込み直す」で反映（#297）
  await page.click('#btn-edit-unlock');
  await page.evaluate(() => {
    const ed = document.getElementById('markdown-editor');
    ed.value = '# Local Unsaved Edit\n';
    window.__mockFileState = { text: '# Updated While Dirty\n', lastModified: 3000 };
  });
  await page.evaluate(() => window.checkWatchedFileNow());
  const dirtyRes = await page.evaluate(() => ({
    val: document.getElementById('markdown-editor').value,
    bannerShown: !document.getElementById('external-update-banner').classList.contains('hidden'),
    // 表示のときは flex（子の項目が横に並ぶ）、隠すときは none。display は CSS の定義順に頼らない
    bannerDisplay: getComputedStyle(document.getElementById('external-update-banner')).display,
    modalShown: !document.getElementById('external-conflict-modal').classList.contains('hidden')
  }));
  await page.click('#btn-conflict-keep');
  const afterKeep = await page.evaluate(() => ({
    val: document.getElementById('markdown-editor').value,
    modalHidden: document.getElementById('external-conflict-modal').classList.contains('hidden'),
    bannerStillShown: !document.getElementById('external-update-banner').classList.contains('hidden')
  }));
  await page.click('#btn-external-reload');
  await page.waitForFunction(() => document.getElementById('markdown-editor').value === '# Updated While Dirty\n', null, { timeout: 5000 });
  const manualReload = await page.evaluate(() => ({
    val: document.getElementById('markdown-editor').value,
    bannerHidden: document.getElementById('external-update-banner').classList.contains('hidden'),
    bannerDisplay: getComputedStyle(document.getElementById('external-update-banner')).display
  }));

  // 設定で自動反映をオフにすると、外部更新しても自動反映されない
  await page.click('#btn-open-settings');
  await page.uncheck('#setting-auto-reload');
  await page.click('#btn-close-settings');
  await page.evaluate(() => {
    window.__mockFileState = { text: '# Should Not Reload\n', lastModified: 4000 };
  });
  const checkedWhenOff = await page.evaluate(() => window.checkWatchedFileNow());
  const offVal = await page.evaluate(() => document.getElementById('markdown-editor').value);
  await page.click('#btn-open-settings');
  await page.check('#setting-auto-reload');
  await page.click('#btn-close-settings');

  record('TC-FILE-046',
    autoRes.val.startsWith('# Updated Externally') && autoRes.scrollTop > 0 && autoRes.bannerHidden && autoRes.toast.includes('外部更新を反映しました')
    && dirtyRes.val === '# Local Unsaved Edit\n' && dirtyRes.bannerShown && dirtyRes.bannerDisplay === 'flex' && dirtyRes.modalShown
    && afterKeep.val === '# Local Unsaved Edit\n' && afterKeep.modalHidden && afterKeep.bannerStillShown
    && manualReload.val === '# Updated While Dirty\n' && manualReload.bannerHidden && manualReload.bannerDisplay === 'none'
    && checkedWhenOff === false && offVal === '# Updated While Dirty\n'
    && page.consoleErrors.length === 0,
    JSON.stringify({ beforeScroll, autoRes, dirtyRes, afterKeep, manualReload, checkedWhenOff, offVal, errors: page.consoleErrors }));
  await page.context().close();
}

// TC-FILE-048: Web 版の利用状況計測とスタンドアロン版・E2E の抑止（FR-063, #321）
async function testWebAnalytics(browser) {
  const webHtml = fs.readFileSync(path.join(ROOT_DIR, 'public', 'index.html'), 'utf8');
  const distHtml = fs.readFileSync(path.join(APP_DIR, 'index.html'), 'utf8');
  const hasGtmInWeb = webHtml.includes('GTM-KMQ3KLNT') && webHtml.includes("'gtm.start'");
  const noGtmInDist = !distHtml.includes('GTM-KMQ3KLNT')
    && !distHtml.includes('LUCIVO_WEB_ANALYTICS_START')
    && !distHtml.includes('googletagmanager.com');

  const srv = await startWebServer();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // GTM 外部通信はオフライン環境でも失敗しないよう空応答でモック
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ status: 200, contentType: 'application/javascript', body: '' }));
  await page.goto(`${srv.url}?mode=visual&style=cards&tone=warm`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof renderApp === 'function');
  // スタイルとトーンを切り替えても、E2E (navigator.webdriver=true) およびローカルビルドではカスタムイベントを送らない
  await page.click('.info-style-btn[data-info-style="editorial"]');
  await page.click('#btn-tone-menu');
  await page.click('.tone-menu-item[data-tone-id="matcha-wagashi"]');
  const events = await page.evaluate(() => (window.dataLayer || []).filter(item =>
    item && ['design_style_select', 'tone_select', 'present_mode_select'].includes(item.event)
  ));
  await ctx.close();
  if (typeof srv.close === 'function') await srv.close();
  else if (srv.server) await new Promise(r => srv.server.close(r));

  record('TC-FILE-048',
    hasGtmInWeb && noGtmInDist && events.length === 0 && errors.length === 0,
    JSON.stringify({ hasGtmInWeb, noGtmInDist, eventsCount: events.length, errors }));
}

module.exports = {
  testFileLoading,
  testUrlLoading,
  testAutoReload,
  testTitleAndDrop,
  testLocalImages,
  testFolder,
  testSampleLinks,
  testEncoding,
  testWebAnalytics
};
