// プレイアブル・ダイアグラム（TC-SHOW-020〜024、FR-055）のテスト。notation_sample.md の図で確かめる。
// tests/e2e.cjs が tests/e2e/modes/ のファイルを自動で集める（ARC-MODE-008）
const { record, openStagePage, startWebServer, openWebPageWithSample, setDocument } = require('../helpers.cjs');

async function testPlayable(browser) {
  // TC-SHOW-020: スタンドアロン版（dist/ を file:// で開く）では、発表のドロップダウンにプレイアブル・ダイアグラムの項目がなく、部品も読み込まない
  // （stage: "web" のモードは、スタンドアロン版にビルドしない。ARC-MODE-002）
  const filePage = await openStagePage(browser);
  await filePage.click('#btn-present-menu');
  const fileItemAbsent = await filePage.evaluate(() => !document.getElementById('menu-present-playable'));
  const fileScriptLoaded = await filePage.evaluate(() => Array.from(document.scripts).some(s => /playable\.js/.test(s.src)));
  await filePage.context().close();
  record('TC-SHOW-020', fileItemAbsent && !fileScriptLoaded, JSON.stringify({ fileItemAbsent, fileScriptLoaded }));

  const server = await startWebServer();
  try {
    const page = await openWebPageWithSample(browser, server, {}, 'notation_sample.md');
    const before = await page.evaluate(() => Array.from(document.querySelectorAll('#standard-doc-container [data-stage-index]')).map(v => v.dataset.stageIndex).join(','));
    const info = () => page.evaluate(() => window.LucivoModes.get('playable').info());

    // TC-SHOW-021: フローチャートは、質問に答えて進む診断になる。判定のノードでは、分岐のラベルが選択肢になる。
    // 図の上では、今いるノードと、最後に通った矢印が灯る
    await page.click('#btn-present-menu');
    const itemVisible = await page.isVisible('#menu-present-playable');
    await page.click('#menu-present-playable');
    await page.waitForFunction(() => window.LucivoModes.get('playable') && window.LucivoModes.get('playable').info().active, null, { timeout: 15000 });
    const start = await info();
    // 判定のノードまで、最初の選択肢で進む
    let flow = start;
    for (let k = 0; k < 6 && !(flow.options.includes('はい') && flow.options.includes('いいえ')); k++) {
      await page.keyboard.press('1');
      flow = await info();
    }
    const decisionMarks = await page.evaluate(() => ({
      current: !!document.querySelector('.playable-figure g.is-play-current'),
      edge: !!document.querySelector('.playable-figure path.is-play-edge'),
      question: (document.querySelector('.playable-card .playable-eyebrow') || {}).textContent || '',
      title: (document.querySelector('.playable-card .playable-title') || {}).textContent || ''
    }));
    await page.keyboard.press('2');
    const afterNo = await info();
    record('TC-SHOW-021', itemVisible && start.kind === 'flow' && start.count >= 2 && start.visited.length === 1
      && flow.options.join('|') === 'はい|いいえ' && decisionMarks.current && decisionMarks.edge && decisionMarks.question === 'QUESTION 1'
      && afterNo.visited.length === flow.visited.length + 1 && page.consoleErrors.length === 0,
    JSON.stringify({ itemVisible, start, flow, decisionMarks, afterNo, errors: page.consoleErrors }));

    // TC-SHOW-022: 状態遷移図は、画面の試作品になる。状態の名前が画面の題名、矢印のラベルがボタンになる。
    // 終わり（[*]）へ進むと「おわり」の画面になり、R で最初の状態に戻る
    for (let k = 0; k < start.count && (await info()).kind !== 'state'; k++) await page.keyboard.press(']');
    const st = await info();
    const screenTitle = await page.evaluate(() => (document.querySelector('.playable-screen .playable-title') || {}).textContent);
    const buttons = await page.evaluate(() => Array.from(document.querySelectorAll('.playable-screen .playable-option')).map(b => b.textContent.replace(/^\d/, '').trim()));
    const endIndex = st.options.indexOf('終了');
    await page.keyboard.press(String(endIndex + 1));
    const ended = await info();
    const endScreen = await page.evaluate(() => (document.querySelector('.playable-screen.is-end .playable-title') || {}).textContent);
    await page.keyboard.press('r');
    const restarted = await info();
    record('TC-SHOW-022', st.kind === 'state' && screenTitle === st.current && buttons.join('|') === st.options.join('|') && endIndex >= 0
      && ended.ended && endScreen === 'おわり' && !restarted.ended && restarted.current === st.current && restarted.visited.length === 1,
    JSON.stringify({ st, screenTitle, buttons, endIndex, ended: ended.ended, endScreen, restarted }));

    // TC-SHOW-023: Esc で終えると、図の枠が元の場所・元の順に戻り、灯した印が残らない
    await page.keyboard.press('Escape');
    const exited = await page.evaluate(() => ({
      active: window.LucivoModes.get('playable').info().active,
      overlay: !!document.querySelector('.playable'),
      cls: document.documentElement.classList.contains('is-playable'),
      order: Array.from(document.querySelectorAll('#standard-doc-container [data-stage-index]')).map(v => v.dataset.stageIndex).join(','),
      marks: document.querySelectorAll('.is-play-current, .is-play-visited, .is-play-edge, svg.is-playing').length
    }));
    record('TC-SHOW-023', !exited.active && !exited.overlay && !exited.cls && exited.order === before && exited.marks === 0,
      JSON.stringify({ ...exited, sameOrder: exited.order === before }));

    // TC-SHOW-024: 動かせる図（状態遷移図・フローチャート）のない文書では、始めずに知らせる
    await setDocument(page, '# 図のない文書\n\n```mermaid\nsequenceDiagram\n  A->>B: こんにちは\n```\n');
    await page.click('#btn-present-menu');
    await page.click('#menu-present-playable');
    await page.waitForFunction(() => /動かせる図/.test(document.getElementById('toast-message').textContent), null, { timeout: 5000 }).catch(() => {});
    const none = await page.evaluate(() => ({
      active: window.LucivoModes.get('playable').info().active,
      overlay: !!document.querySelector('.playable'),
      toast: document.getElementById('toast-message').textContent
    }));
    record('TC-SHOW-024', !none.active && !none.overlay && /動かせる図（状態遷移図・フローチャート）がありません/.test(none.toast), JSON.stringify(none));
    await page.context().close();
  } finally {
    await server.close();
  }
}

module.exports = {
  suites: [
    { name: 'testPlayable', tcPrefix: ['TC-SHOW-020', 'TC-SHOW-021', 'TC-SHOW-022', 'TC-SHOW-023', 'TC-SHOW-024'], fn: testPlayable }
  ]
};
