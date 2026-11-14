// ズーミング・マップ（TC-SHOW-015〜019、FR-054）のテスト。tests/e2e.cjs が tests/e2e/modes/ のファイルを自動で集める（ARC-MODE-008）
const { record, openStagePage, startWebServer, openWebPageWithSample } = require('../helpers.cjs');

async function testZoomMap(browser) {
  // TC-SHOW-015: スタンドアロン版（dist/ を file:// で開く）では、発表のドロップダウンにズーミング・マップの項目がなく、部品も読み込まない
  // （stage: "web" のモードは、スタンドアロン版にビルドしない。ARC-MODE-002）
  const filePage = await openStagePage(browser);
  await filePage.click('#btn-present-menu');
  const fileItemAbsent = await filePage.evaluate(() => !document.getElementById('menu-present-zoom-map'));
  const fileScriptLoaded = await filePage.evaluate(() => Array.from(document.scripts).some(s => /zoom-map\.js/.test(s.src)));
  await filePage.context().close();
  record('TC-SHOW-015', fileItemAbsent && !fileScriptLoaded, JSON.stringify({ fileItemAbsent, fileScriptLoaded }));

  const server = await startWebServer();
  try {
    const page = await openWebPageWithSample(browser, server);
    const scriptBefore = await page.evaluate(() => Array.from(document.scripts).some(s => /zoom-map\.js/.test(s.src)));
    // TC-SHOW-016: Web 版でドロップダウンから選ぶと、Visualモードの章を地図に並べ、全体の地図から始める
    await page.click('#btn-present-menu');
    const itemVisible = await page.isVisible('#menu-present-zoom-map');
    await page.click('#menu-present-zoom-map');
    await page.waitForFunction(() => window.LucivoModes.get('zoom-map') && window.LucivoModes.get('zoom-map').info().active, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    const opened = await page.evaluate(() => {
      const info = window.LucivoModes.get('zoom-map').info();
      const nodes = Array.from(document.querySelectorAll('.exhibition-wrap > .exhibition-hero, .exhibition-wrap > .exhibition-slab'));
      const vp = { w: window.innerWidth, h: window.innerHeight };
      const rects = nodes.map(n => n.getBoundingClientRect());
      return {
        cls: document.documentElement.classList.contains('is-zoom-map'),
        visual: state.isVisualMode,
        nodes: nodes.length,
        stepCount: info.steps.length,
        firstLabel: info.steps[0].label,
        lastIsOverview: info.steps[info.steps.length - 1].node === -1,
        // 全体の地図では、すべての章が画面の中に収まる
        allInView: rects.every(r => r.left >= -1 && r.top >= -1 && r.right <= vp.w + 1 && r.bottom <= vp.h + 1),
        path: !!document.querySelector('.zoom-map-path polyline'),
        hud: (document.querySelector('.zoom-map-hud .zoom-map-count') || {}).textContent
      };
    });
    record('TC-SHOW-016', itemVisible && !scriptBefore && opened.cls && opened.visual && opened.nodes >= 15 && opened.firstLabel === '全体の地図'
      && opened.lastIsOverview && opened.allInView && opened.path && opened.hud === `1 / ${opened.stepCount}` && page.consoleErrors.length === 0,
    JSON.stringify({ itemVisible, scriptBefore, ...opened, errors: page.consoleErrors }));

    // TC-SHOW-017: → で章へ飛ぶ。隣の章へ移るときは、いったん引いて（見える範囲を広げて）から寄る。止まったら章が画面に収まる
    const goStep = async key => {
      const from = await page.evaluate(() => window.LucivoModes.get('zoom-map').info());
      await page.keyboard.press(key);
      // 動いている途中のカメラの見える範囲（w）を、間を空けて何度か調べる
      const samples = [];
      for (let k = 0; k < 8; k++) {
        await page.waitForTimeout(110);
        samples.push(await page.evaluate(() => window.LucivoModes.get('zoom-map').info().camera.w));
      }
      await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
      const to = await page.evaluate(() => window.LucivoModes.get('zoom-map').info());
      return { from, to, maxW: Math.max(...samples) };
    };
    const toFirst = await goStep('ArrowRight');
    // 表紙から、隣の章（前書き）へ
    const toSecond = await goStep('ArrowRight');
    const focused = await page.evaluate(() => {
      const cur = document.querySelector('.exhibition-wrap > .is-zoom-current');
      const r = cur.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, vw: window.innerWidth, vh: window.innerHeight };
    });
    const dipped = toSecond.maxW > Math.max(toSecond.from.camera.w, toSecond.to.camera.w) * 1.05;
    const fits = focused.left >= 0 && focused.right <= focused.vw && focused.top >= 0 && focused.bottom <= focused.vh;
    record('TC-SHOW-017', toFirst.to.index === 1 && toSecond.to.index === 2 && dipped && fits,
      JSON.stringify({ firstIndex: toFirst.to.index, secondIndex: toSecond.to.index, fromW: Math.round(toSecond.from.camera.w), toW: Math.round(toSecond.to.camera.w), maxW: Math.round(toSecond.maxW), focused }));

    // TC-SHOW-018: 小見出し（h3）のある章では小見出しにも寄る。長い区間は区切って寄る。End で全体の地図、Esc で元の表示に戻る
    const steps = (await page.evaluate(() => window.LucivoModes.get('zoom-map').info())).steps;
    const h3Step = steps.findIndex(s => /^11\.1 /.test(s.label));
    const segmented = steps.some(s => /（\d+ \/ \d+）$/.test(s.label));
    await page.evaluate(i => window.LucivoModes.get('zoom-map').goTo(i), h3Step);
    await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
    const h3Visible = await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('.exhibition-wrap h3')).find(e => /^11\.1 /.test(e.textContent.trim()));
      const r = h.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && r.left >= 0 && r.right <= window.innerWidth;
    });
    await page.keyboard.press('End');
    await page.waitForFunction(() => !document.getElementById('visual-stage-container').classList.contains('is-flying'), null, { timeout: 5000 });
    const atEnd = await page.evaluate(() => { const i = window.LucivoModes.get('zoom-map').info(); return i.index === i.steps.length - 1 && i.steps[i.index].node === -1; });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    const exited = await page.evaluate(() => ({
      active: window.LucivoModes.get('zoom-map').info().active,
      cls: document.documentElement.classList.contains('is-zoom-map'),
      hud: !!document.querySelector('.zoom-map-hud'),
      path: !!document.querySelector('.zoom-map-path'),
      // 地図に入る前は高速モードだったので、高速モードに戻る
      visual: state.isVisualMode,
      inlineStyles: Array.from(document.querySelectorAll('.exhibition-wrap, .exhibition-wrap > *')).filter(e => e.getAttribute('style')).length
    }));
    record('TC-SHOW-018', h3Step > 0 && segmented && h3Visible && atEnd && !exited.active && !exited.cls && !exited.hud && !exited.path && !exited.visual && exited.inlineStyles === 0,
      JSON.stringify({ h3Step, segmented, h3Visible, atEnd, exited }));
    await page.context().close();

    // TC-SHOW-019: 動きを減らす設定では、カメラを動かさず、すぐに次の場所を映す
    const reduced = await openWebPageWithSample(browser, server, { reducedMotion: 'reduce' });
    await reduced.click('#btn-present-menu');
    await reduced.click('#menu-present-zoom-map');
    await reduced.waitForFunction(() => window.LucivoModes.get('zoom-map') && window.LucivoModes.get('zoom-map').info().active, null, { timeout: 15000 });
    await reduced.keyboard.press('ArrowRight');
    const instant = await reduced.evaluate(() => new Promise(resolve => requestAnimationFrame(() => resolve({
      index: window.LucivoModes.get('zoom-map').info().index,
      flying: document.getElementById('visual-stage-container').classList.contains('is-flying'),
      currentInView: (() => {
        const r = document.querySelector('.exhibition-wrap > .is-zoom-current').getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth;
      })()
    }))));
    await reduced.context().close();
    record('TC-SHOW-019', instant.index === 1 && !instant.flying && instant.currentInView, JSON.stringify(instant));
  } finally {
    await server.close();
  }
}

module.exports = {
  suites: [
    { name: 'testZoomMap', tcPrefix: ['TC-SHOW-015', 'TC-SHOW-016', 'TC-SHOW-017', 'TC-SHOW-018', 'TC-SHOW-019'], fn: testZoomMap, timeoutMs: 150000 }
  ]
};
