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
  seekLight
} = require('./helpers.cjs');

function inspectLightHead({ flowIndex, edgeIndex, t }) {
  const flow = LucivoStage.lightPlans()[flowIndex];
  const edge = flow.plan.edges[edgeIndex];
  const index = Math.round((t - edge.start) * edge.speed / (edge.length / edge.count));
  const m = flow.svg.getScreenCTM();
  const x = edge.points[index * 2];
  const y = edge.points[index * 2 + 1];
  const rect = flow.front.getBoundingClientRect();
  const scale = flow.front.width / rect.width;
  const px = Math.round((m.a * x + m.e - rect.left) * scale);
  const py = Math.round((m.d * y + m.f - rect.top) * scale);
  const pixels = flow.front.getContext('2d').getImageData(px - 2, py - 2, 5, 5).data;
  let alpha = 0;
  for (let i = 3; i < pixels.length; i += 4) alpha = Math.max(alpha, pixels[i]);
  return alpha;
}

function inspectLightPaint(flowIndex) {
  const flow = LucivoStage.lightPlans()[flowIndex];
  const painted = canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 8) count++;
    return count;
  };
  return { back: painted(flow.back), front: painted(flow.front) };
}

async function testSignalLight(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');

  // TC-LIGHT-007 高速モードでは舞台演出を読み込まない
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await setDocument(page, showcaseMd);
  const fast = await page.evaluate(() => ({
    loaded: typeof LucivoStage !== 'undefined',
    script: !!document.querySelector('script[src*="stage.js"]'),
    canvases: document.querySelectorAll('.signal-light-canvas').length
  }));
  record('TC-LIGHT-007', !fast.loaded && !fast.script && fast.canvases === 0, JSON.stringify(fast));

  await selectVisualStyle(page, 'shapes');
  await waitRendered(page);
  await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.lightPlans().length >= 5);

  // TC-LIGHT-005 図が画面に入るまでは計算しない。入ると動き、外れると止まる
  await scrollToSlab(page, 9);
  await page.waitForFunction(() => LucivoStage.lightPlans()[0].plan);
  const visible = await page.evaluate(() => LucivoStage.lightPlans().map(f => ({ type: f.type, active: f.active, planned: !!f.plan })));

  // TC-LIGHT-001 光は根のノードから、結線をたどって下流へ伝わる
  const cascade = await page.evaluate(() => {
    const { plan } = LucivoStage.lightPlans()[0];
    const hit = e => e.start + e.length / e.speed;
    const wrong = plan.edges.filter(e => {
      const incoming = plan.edges.filter(i => i.to === e.from);
      if (e.from < 0) return true;
      if (!incoming.length) return Math.abs(e.start - plan.edges[0].start) > 0.001;
      return Math.abs(e.start - Math.min(...incoming.map(hit))) > 0.001;
    }).length;
    return { edges: plan.edges.length, wrong, unmatched: plan.edges.filter(e => e.to < 0).length, cycle: plan.cycle, pulses: plan.pulses.length };
  });
  record('TC-LIGHT-001', cascade.edges === 6 && cascade.wrong === 0 && cascade.unmatched === 0 && cascade.pulses >= 7, JSON.stringify(cascade));

  // TC-LIGHT-003 走っている間は 2 層に描かれ、余韻の間は何も描かない
  await seekLight(page, 1.0);
  const lit = await page.evaluate(inspectLightPaint, 0);
  const headAlpha = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await seekLight(page, cascade.cycle - 0.05);
  const dark = await page.evaluate(inspectLightPaint, 0);
  record('TC-LIGHT-003', lit.back > 200 && lit.front > 50 && headAlpha > 100 && dark.back === 0 && dark.front === 0, JSON.stringify({ lit, headAlpha, dark }));

  // TC-LIGHT-004 表示の倍率を変えても、光は線の上から外れない
  const aligned = {};
  await seekLight(page, 1.0);
  aligned.canvas = headAlpha;
  await page.click('.view-mode-btn[data-view-mode="split"]');
  await page.waitForTimeout(500);
  aligned.split = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.click('.view-mode-btn[data-view-mode="canvas"]');
  await page.waitForTimeout(400);
  await page.click('#visual-stage-container [data-action="scale-actual"][data-index="0"]');
  await page.waitForTimeout(400);
  aligned.actual = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.click('#visual-stage-container [data-action="scale-fit"][data-index="0"]');
  await page.waitForTimeout(300);
  await page.click('#visual-stage-container [data-action="zoom"][data-index="0"]');
  await page.waitForTimeout(400);
  aligned.zoomCanvases = await page.evaluate(() => document.querySelectorAll('#zoom-canvas .signal-light-canvas').length);
  await page.click('#zoom-close-btn');
  await page.waitForTimeout(200);
  await page.evaluate(() => LucivoStage.seekLights(null));
  record('TC-LIGHT-004', aligned.canvas > 100 && aligned.split > 100 && aligned.actual > 100 && aligned.zoomCanvases === 2, JSON.stringify(aligned));

  // TC-LIGHT-010 光が走っている間のフレーム間隔
  const frames = await page.evaluate(() => new Promise(resolve => {
    const gaps = [];
    let last = performance.now();
    const step = t => {
      gaps.push(t - last);
      last = t;
      if (gaps.length < 150) requestAnimationFrame(step);
      else {
        gaps.sort((a, b) => a - b);
        resolve({ median: gaps[75], p95: gaps[142] });
      }
    };
    requestAnimationFrame(step);
  }));
  record('TC-LIGHT-010', frames.median <= 20, JSON.stringify(frames));

  await page.evaluate(() => { document.getElementById('preview-scroll').scrollTop = 0; });
  await page.waitForTimeout(350);
  const away = await page.evaluate(() => LucivoStage.lightPlans()[0].active);
  record('TC-LIGHT-005', visible[0].active && visible[0].planned && !visible[3].planned && !visible[4].planned && !away, JSON.stringify({ visible, away }));

  // TC-LIGHT-002 シーケンス図は時系列の順に 1 本ずつ流れ、長い図でも一巡の時間に上限がある
  await scrollToSlab(page, 11);
  await page.evaluate(() => document.querySelectorAll('#visual-stage-container .exhibition-slab')[11].querySelectorAll('.exhibition-viewport')[1].scrollIntoView({ block: 'center' }));
  await page.waitForFunction(() => LucivoStage.lightPlans()[3].plan);
  const sequence = await page.evaluate(() => {
    const { plan } = LucivoStage.lightPlans()[3];
    const starts = plan.edges.map(e => e.start);
    return {
      edges: plan.edges.length,
      ordered: starts.every((s, i) => i === 0 || s > starts[i - 1]),
      noOverlap: plan.edges.every((e, i) => i === 0 || e.start >= plan.edges[i - 1].start + plan.edges[i - 1].length / plan.edges[i - 1].speed),
      cycle: plan.cycle
    };
  });
  record('TC-LIGHT-002', sequence.edges >= 10 && sequence.ordered && sequence.noOverlap && sequence.cycle <= 13 + 0.25 + 2.2 + 0.01, JSON.stringify(sequence));

  // TC-LIGHT-006 書き出す SVG に光が混ざらない（以前は CSS のない線が黒い塗りで書き出された）
  const exported = await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-viewport > svg'));
    return {
      svgs: svgs.length,
      beams: svgs.filter(s => /flow-beam/.test(s.outerHTML)).length,
      canvases: svgs.filter(s => s.querySelector('canvas')).length,
      cached: Array.from(svgCache.values()).filter(s => /flow-beam/.test(s)).length
    };
  });
  record('TC-LIGHT-006', exported.svgs === 5 && exported.beams === 0 && exported.canvases === 0 && exported.cached === 0, JSON.stringify(exported));

  // TC-LIGHT-009 手順の光は transform だけで動き、丸への到達と反応の時刻が合う
  const steps = await page.evaluate(() => {
    const slabs = document.querySelectorAll('#visual-stage-container .exhibition-slab');
    const horizontal = slabs[6].querySelector('.vs-steps');
    const vertical = slabs[7].querySelector('.vs-steps.is-vertical');
    const items = Array.from(horizontal.children);
    const seconds = v => parseFloat(v);
    const animation = horizontal.getAnimations({ subtree: true }).find(a => a.animationName === 'vs-comet-run');
    const properties = animation ? Array.from(new Set(animation.effect.getKeyframes().flatMap(k => Object.keys(k)))).filter(k => !['offset', 'computedOffset', 'easing', 'composite'].includes(k)) : [];
    return {
      name: getComputedStyle(horizontal, '::after').animationName,
      verticalName: getComputedStyle(vertical, '::after').animationName,
      duration: seconds(getComputedStyle(horizontal, '::after').animationDuration),
      receiveDelays: items.map(li => seconds(getComputedStyle(li, '::after').animationDelay)),
      chevronDelays: items.slice(1).map(li => seconds(getComputedStyle(li.querySelector('.vs-step-chevron')).animationDelay)),
      properties
    };
  });
  const stepsOk = steps.name === 'vs-comet-run' && steps.verticalName === 'vs-comet-run-vertical'
    && Math.abs(steps.duration - 3 / 0.7) < 0.01
    && JSON.stringify(steps.receiveDelays) === '[0,1,2,3]'
    && JSON.stringify(steps.chevronDelays) === '[0.5,1.5,2.5]'
    && steps.properties.every(p => ['transform', 'opacity'].includes(p));
  record('TC-LIGHT-009', stepsOk, JSON.stringify(steps));

  // TC-LIGHT-011 見た目（4 スタイル × Light / Dark）
  for (const appearance of ['light', 'dark']) {
    for (const style of VISUAL_STYLES) {
      await setMode(page, { style, appearance });
      await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.lightPlans().length >= 5);
      await scrollToSlab(page, 9);
      await page.waitForFunction(() => LucivoStage.lightPlans()[0].plan);
      await seekLight(page, 1.0);
      await page.locator('#visual-stage-container .exhibition-viewport').first().screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-flow.png`) });
      await seekLight(page, 1.75);
      await page.locator('#visual-stage-container .exhibition-viewport').first().screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-arrival.png`) });
      await page.evaluate(() => LucivoStage.seekLights(null));
      await scrollToSlab(page, 6);
      await page.waitForTimeout(1300);
      await page.locator('#visual-stage-container .exhibition-slab').nth(6).screenshot({ path: path.join(SHOT_DIR, `light-${style}-${appearance}-steps.png`) });
    }
  }
  // TC-LIGHT-012 トグルボタンで全フローアニメーション（Canvas と手順リスト）を ON/OFF でき、モード切替でも保つ
  await scrollToSlab(page, 1);
  await page.waitForTimeout(300);
  const toggleInspect = () => page.evaluate(() => {
    const btn = document.getElementById('btn-toggle-animation');
    const steps = document.querySelector('#visual-stage-container .vs-steps');
    const stepLi = steps ? steps.querySelector('li') : null;
    const chev = steps ? steps.querySelector('.vs-step-chevron') : null;
    const canvases = Array.from(document.querySelectorAll('.signal-light-canvas'));
    return {
      pressed: btn ? btn.getAttribute('aria-pressed') : null,
      offClass: document.documentElement.classList.contains('is-animation-off'),
      enabled: LucivoStage.isLightsEnabled(),
      canvases: canvases.length,
      visibleCanvases: canvases.filter(c => getComputedStyle(c).display !== 'none').length,
      cometDisplay: steps ? getComputedStyle(steps, '::after').display : null,
      liDisplay: stepLi ? getComputedStyle(stepLi, '::after').display : null,
      chevronAnim: chev ? getComputedStyle(chev).animationName : null
    };
  });
  const animBefore = await toggleInspect();
  await page.click('#btn-toggle-animation');
  await page.waitForTimeout(250);
  const animOff = await toggleInspect();
  // Stage Show へ入っても OFF 状態を維持する
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await page.waitForTimeout(250);
  const animOffShow = await toggleInspect();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  // 再びクリックで ON に復帰する
  await page.click('#btn-toggle-animation');
  await page.waitForTimeout(350);
  const animRestored = await toggleInspect();
  record('TC-LIGHT-012',
    animBefore.pressed === 'true' && !animBefore.offClass && animBefore.enabled && animBefore.visibleCanvases > 0 && animBefore.chevronAnim !== 'none'
    && animOff.pressed === 'false' && animOff.offClass && !animOff.enabled && animOff.visibleCanvases === 0
    && animOff.cometDisplay === 'none' && animOff.liDisplay === 'none' && animOff.chevronAnim === 'none'
    && animOffShow.pressed === 'false' && animOffShow.offClass && !animOffShow.enabled && animOffShow.visibleCanvases === 0
    && animRestored.pressed === 'true' && !animRestored.offClass && animRestored.enabled && animRestored.visibleCanvases > 0 && animRestored.chevronAnim !== 'none',
    JSON.stringify({ animBefore, animOff, animOffShow, animRestored }));

  if (page.consoleErrors.length) record('TC-LIGHT-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.context().close();

  // TC-LIGHT-008 動きを減らす設定では光を出さない
  const calm = await openStagePage(browser, { reducedMotion: 'reduce' });
  await calm.click('#btn-visual-mode');
  await setDocument(calm, showcaseMd);
  await calm.waitForFunction(() => typeof LucivoStage !== 'undefined');
  await calm.waitForTimeout(400);
  const reduced = await calm.evaluate(() => {
    const steps = document.querySelector('#visual-stage-container .vs-steps');
    return {
      canvases: document.querySelectorAll('.signal-light-canvas').length,
      comet: getComputedStyle(steps, '::after').display,
      chevron: getComputedStyle(steps.querySelector('.vs-step-chevron')).animationName
    };
  });
  record('TC-LIGHT-008', reduced.canvases === 0 && reduced.comet === 'none' && reduced.chevron === 'none', JSON.stringify(reduced));
  await calm.context().close();
}

function inspectShow() {
  const root = document.getElementById('visual-stage-container');
  const rect = root.getBoundingClientRect();
  const wrap = root.querySelector('.exhibition-wrap');
  const wrapRect = wrap ? wrap.getBoundingClientRect() : null;
  const shown = Array.from(root.querySelectorAll('.exhibition-wrap > *')).filter(el => getComputedStyle(el).display !== 'none');
  return {
    ...LucivoStage.showState(),
    htmlClass: document.documentElement.classList.contains('is-stage-show'),
    covers: rect.left === 0 && rect.top === 0 && rect.width === innerWidth && rect.height === innerHeight,
    wrapRatio: wrapRect && wrapRect.height > 0 ? +(wrapRect.width / wrapRect.height).toFixed(3) : 0,
    topElement: document.elementFromPoint(20, 20).closest('#visual-stage-container, #stage-hud') !== null,
    shown: shown.length,
    tpl: shown[0] ? shown[0].className : '',
    scrollTop: root.scrollTop,
    overflow: root.scrollHeight - root.clientHeight,
    appearance: state.appearance,
    viewMode: state.viewMode,
    isVisual: state.isVisualMode,
    count: document.querySelector('.stage-hud-count').textContent
  };
}

async function pressUntil(page, predicate, limit = 80) {
  for (let i = 0; i < limit; i++) {
    if (await page.evaluate(predicate)) return true;
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(40);
  }
  return false;
}

async function testStageShow(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, showcaseMd);

  // TC-SHOW-001 高速モード・Light・Split から 1 回の操作で発表を始める
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => typeof LucivoStage !== 'undefined' && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(900);
  const entered = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-00-hero.png') });
  record('TC-SHOW-001', entered.htmlClass && entered.covers && entered.wrapRatio >= 1.76 && entered.wrapRatio <= 1.80 && entered.topElement && entered.scenes === SHOWCASE_SCENES && entered.shown === 1
    && /exhibition-hero/.test(entered.tpl) && entered.appearance === 'dark' && entered.viewMode === 'canvas' && entered.isVisual && entered.count === sceneCount(1), JSON.stringify(entered));

  // TC-SHOW-002 ページ送り（→ / Space / ← / End / Home）
  await page.keyboard.press('ArrowRight');
  const second = await page.evaluate(inspectShow);
  await page.keyboard.press(' ');
  const third = await page.evaluate(inspectShow);
  await page.keyboard.press('ArrowLeft');
  const back = await page.evaluate(inspectShow);
  await page.keyboard.press('End');
  const last = await page.evaluate(inspectShow);
  await page.keyboard.press('Home');
  const first = await page.evaluate(inspectShow);
  record('TC-SHOW-002', second.index === 1 && third.index === 2 && back.index === 1 && last.index === SHOWCASE_SCENES - 1 && first.index === 0 && first.shown === 1,
    JSON.stringify([second.index, third.index, back.index, last.index, first.index]));

  // TC-SHOW-003 要点カード・手順は 1 項目ずつ見せる
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-points'));
  await page.waitForTimeout(800);
  const builtCount = () => document.querySelectorAll('.is-scene .is-built').length;
  const pointBuilds = [await page.evaluate(builtCount)];
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-points-0.png') });
  await page.keyboard.press('ArrowRight');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.keyboard.press('ArrowRight');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.keyboard.press('ArrowLeft');
  pointBuilds.push(await page.evaluate(builtCount));
  await page.waitForTimeout(500);
  const hiddenCard = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.is-scene .vs-points > li:not(.is-built)')).opacity));
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-steps'));
  await page.waitForTimeout(800);
  const stepCircle = await page.evaluate(() => {
    const li = document.querySelector('.is-scene .vs-steps > li:not(.is-built)');
    return { opacity: getComputedStyle(li).opacity, circle: getComputedStyle(li, '::before').backgroundColor };
  });
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(1200);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-steps-2.png') });
  record('TC-SHOW-003', JSON.stringify(pointBuilds) === '[0,1,2,1]' && hiddenCard < 0.2 && stepCircle.opacity === '1' && !/, 0\)$/.test(stepCircle.circle),
    JSON.stringify({ pointBuilds, hiddenCard, stepCircle }));

  // TC-SHOW-005 図は舞台の高さに収まり、操作部品は隠れ、光も図に重なる
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-split'));
  await page.waitForTimeout(900);
  await seekLight(page, 1.0);
  const diagram = await page.evaluate(() => {
    const scene = document.querySelector('.is-scene');
    const svg = scene.querySelector('.exhibition-viewport > svg');
    const rect = svg.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      width: rect.width,
      minWidth: parseFloat(svg.style.minWidth) || 0,
      header: getComputedStyle(scene.querySelector('.exhibition-diagram-header')).display,
      fitsHeight: rect.bottom <= innerHeight,
      overflow: document.getElementById('visual-stage-container').scrollHeight - innerHeight
    };
  });
  const flowHead = await page.evaluate(inspectLightHead, { flowIndex: 0, edgeIndex: 2, t: 1.0 });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-split.png') });
  await page.evaluate(() => LucivoStage.seekLights(null));

  // 横長最大化ブラウザ相当（1920x945）でも、意図的な長尺スライド（13〜15枚目 = index 12〜14）以外（11枚目の split 等）が 1 画面に収まる（#76）
  const widePage = await openStagePage(browser, { viewport: { width: 1920, height: 945 } });
  await setDocument(widePage, showcaseMd);
  await widePage.click('#btn-stage-show');
  await widePage.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(widePage);
  const wideOverflows = [];
  for (let i = 0; i < SHOWCASE_SCENES; i++) {
    if (i > 0) {
      await widePage.keyboard.press('b');
      await widePage.waitForFunction(() => document.documentElement.classList.contains('is-stage-curtain'), null, { timeout: 5000 });
      await widePage.click(`[data-curtain-scene="${i}"]`);
      await widePage.waitForFunction(target => !document.documentElement.classList.contains('is-stage-curtain') && LucivoStage.showState().index === target, i, { timeout: 5000 });
    }
    await widePage.waitForTimeout(180);
    const st = await widePage.evaluate(() => {
      const root = document.getElementById('visual-stage-container');
      const cur = document.querySelector('#visual-stage-container .exhibition-wrap > .is-scene');
      const h = cur ? ((cur.querySelector('h1, h2') || {}).textContent || '').trim().slice(0, 24) : '';
      return { overflow: root.scrollHeight - root.clientHeight, h };
    });
    if (st.overflow > 0 && ![12, 13, 14].includes(i)) {
      wideOverflows.push({ slide: i + 1, ...st });
    }
  }
  await widePage.context().close();

  record('TC-SHOW-005', diagram.header === 'none' && diagram.fitsHeight && diagram.width >= diagram.minWidth && flowHead > 100 && wideOverflows.length === 0,
    JSON.stringify({ diagram, flowHead, wideOverflows }));

  // TC-SHOW-004 画面に収まらない章は、次の章へ進む前に残りをスクロールする
  await pressUntil(page, () => document.getElementById('visual-stage-container').scrollHeight - innerHeight > 200);
  await page.waitForTimeout(800);
  const tall = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-dark-tall.png') });
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(900);
  const scrolled = await page.evaluate(inspectShow);
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(900);
  const returned = await page.evaluate(inspectShow);
  record('TC-SHOW-004', scrolled.index === tall.index && scrolled.scrollTop > 100 && returned.index === tall.index && returned.scrollTop <= 4, JSON.stringify({ index: tall.index, overflow: tall.overflow, scrolled: scrolled.scrollTop, returned: returned.scrollTop }));

  // TC-SHOW-007 発表中に明暗を切り替えても、シーンを保つ
  await page.keyboard.press('Home');
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-split'));
  const beforeToggle = await page.evaluate(inspectShow);
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(900);
  const afterToggle = await page.evaluate(inspectShow);
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-light-split.png') });
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(500);
  record('TC-SHOW-007', beforeToggle.index === afterToggle.index && afterToggle.appearance === 'light' && afterToggle.shown === 1 && afterToggle.scenes === SHOWCASE_SCENES, JSON.stringify({ before: beforeToggle.appearance, after: afterToggle.appearance, index: afterToggle.index }));

  // TC-SHOW-006 自動進行（項目ごとの送りと、最後の章から先頭への巡回）
  await page.keyboard.press('Home');
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-points'));
  await page.keyboard.press('a');
  await page.waitForTimeout(2900);
  const autoBuild = await page.evaluate(builtCount);
  await page.keyboard.press('a');
  const autoOff = await page.evaluate(() => LucivoStage.showState().auto);

  // TC-SHOW-008 終了すると元の状態に戻り、発表した章を表示する
  await pressUntil(page, () => document.querySelector('.is-scene.vs-tpl-quote'));
  const quoteIndex = await page.evaluate(() => LucivoStage.showState().index);
  await page.keyboard.press('Escape');
  await waitRendered(page);
  await page.waitForTimeout(500);
  const exited = await page.evaluate(i => {
    const scroller = document.getElementById('preview-scroll').getBoundingClientRect();
    const target = state.isVisualMode
      ? document.querySelectorAll('.exhibition-wrap > .exhibition-hero, .exhibition-wrap > .exhibition-slab')[i]
      : document.querySelectorAll('#standard-doc-container h2')[Math.max(0, i - 1)];
    const rect = target ? target.getBoundingClientRect() : null;
    return {
      active: LucivoStage.showState().active,
      htmlClass: document.documentElement.classList.contains('is-stage-show'),
      appearance: state.appearance,
      viewMode: state.viewMode,
      isVisual: state.isVisualMode,
      leftovers: document.querySelectorAll('.is-scene, .is-built, .is-building').length,
      sceneInView: rect ? (rect.top < scroller.bottom && rect.bottom > scroller.top) : false,
      rootFont: getComputedStyle(document.documentElement).fontSize
    };
  }, quoteIndex);
  record('TC-SHOW-008', !exited.active && !exited.htmlClass && exited.appearance === 'light' && exited.viewMode === 'split' && !exited.isVisual && exited.leftovers === 0 && exited.sceneInView && exited.rootFont === '16px', JSON.stringify(exited));

  // 短い文書で、自動進行が最後の章から先頭へ戻ること
  await setDocument(page, '# 題名\n\n## 一\n\n短い章です。\n');
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await page.keyboard.press('End');
  await page.keyboard.press('a');
  await page.waitForTimeout(7400);
  const looped = await page.evaluate(() => LucivoStage.showState());
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  record('TC-SHOW-006', autoBuild >= 1 && !autoOff && looped.index === 0 && looped.auto, JSON.stringify({ autoBuild, autoOff, looped }));

  // TC-SHOW-009 章のない文書では発表を始めず、元の表示を保つ
  await setDocument(page, '');
  await page.click('#btn-stage-show');
  await page.waitForTimeout(400);
  const empty = await page.evaluate(() => ({
    active: LucivoStage.showState().active,
    htmlClass: document.documentElement.classList.contains('is-stage-show'),
    appearance: state.appearance,
    viewMode: state.viewMode,
    toast: document.getElementById('toast-message').textContent
  }));
  record('TC-SHOW-009', !empty.active && !empty.htmlClass && empty.appearance === 'light' && empty.viewMode === 'split' && /発表する章がありません/.test(empty.toast), JSON.stringify(empty));

  // TC-SHOW-010 見た目（全シーン）
  await setDocument(page, showcaseMd);
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  for (let i = 0; i < SHOWCASE_SCENES; i++) {
    await page.waitForTimeout(950);
    await page.screenshot({ path: path.join(SHOT_DIR, `show-scene-${String(i).padStart(2, '0')}.png`) });
    // 項目の送りとスクロールを含めて、次の章へ進むまで送る
    for (let n = 0; n < 12 && await page.evaluate(() => LucivoStage.showState().index) <= i; n++) {
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(350);
    }
  }
  await page.keyboard.press('Escape');

  if (page.consoleErrors.length) record('TC-SHOW-CONSOLE', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
}

// TC-SHOW-011, 012: 発表の俯瞰（ライトテーブル）と光のポインター（FR-022, FR-023）
async function testStageOverviewPointer(browser) {
  const page = await openStagePage(browser);
  const showcaseMd = fs.readFileSync(path.join(APP_DIR, 'samples', 'visual-sample.md'), 'utf8');
  await setDocument(page, showcaseMd);
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(1000);
  await pressUntil(page, () => LucivoStage.showState().index === 4);
  await page.waitForTimeout(2000);
  await page.evaluate(() => new Promise(resolve => { requestAnimationFrame(() => requestAnimationFrame(resolve)); }));

  // TC-SHOW-011 俯瞰: 開くまでの時間、並び、光の停止、選択の移動、拡大して入る、元のシーンへ戻る
  const openMs = await page.evaluate(() => new Promise(resolve => {
    const t0 = performance.now();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true }));
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(+(performance.now() - t0).toFixed(1))));
  }));
  await page.waitForTimeout(700);
  const grid = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll('#visual-stage-container .exhibition-wrap > *'));
    const rects = tiles.map(t => t.getBoundingClientRect());
    return {
      ...LucivoStage.showState(),
      htmlClass: document.documentElement.classList.contains('is-stage-overview'),
      visible: tiles.filter(t => getComputedStyle(t).display !== 'none').length,
      columns: new Set(rects.map(r => Math.round(r.left))).size,
      inside: rects.every(r => r.left >= 0 && r.right <= innerWidth + 1),
      aspect: rects.every(r => Math.abs(r.width / r.height - innerWidth / innerHeight) < 0.03),
      selectedClass: tiles.findIndex(t => t.classList.contains('is-ov-selected')),
      lightsOff: LucivoStage.lightPlans().every(p => !p.active),
      count: document.querySelector('.stage-hud-count').textContent
    };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-overview.png') });
  const moves = [];
  for (const key of ['ArrowRight', 'ArrowDown', 'ArrowUp', 'End', 'Home', 'ArrowLeft']) {
    await page.keyboard.press(key);
    moves.push(await page.evaluate(() => LucivoStage.showState().selected));
  }
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1000);
  const entered = await page.evaluate(inspectShow);
  // 縮小図をクリックして入る。図のあるシーン（10: 解説＋図版型）では、光がまた流れる
  await page.keyboard.press('o');
  await page.waitForTimeout(700);
  await page.locator('#visual-stage-container .exhibition-wrap > *').nth(10).click();
  await page.waitForTimeout(1200);
  const clicked = await page.evaluate(() => ({
    ...LucivoStage.showState(),
    lightsOn: LucivoStage.lightPlans().some(p => p.active)
  }));
  // Escape で、開く前のシーンへ戻る（発表は続く）
  await page.keyboard.press('o');
  await page.waitForTimeout(500);
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1000);
  const escaped = await page.evaluate(inspectShow);
  const overviewOk = openMs < 800 && grid.overview && grid.htmlClass && grid.visible === SHOWCASE_SCENES && grid.columns === 5 && grid.inside && grid.aspect
    && grid.selected === 4 && grid.selectedClass === 4 && grid.lightsOff && grid.count === sceneCount(5)
    && JSON.stringify(moves) === JSON.stringify([5, 10, 5, SHOWCASE_SCENES - 1, 0, 0])
    && !entered.overview && entered.index === 1 && entered.shown === 1 && entered.active
    && !clicked.overview && clicked.index === 10 && clicked.lightsOn
    && !escaped.overview && escaped.active && escaped.index === 10 && escaped.shown === 1;
  record('TC-SHOW-011', overviewOk, JSON.stringify({ openMs, grid, moves, entered: entered.index, clicked, escaped: escaped.index }));

  // TC-SHOW-012 光のポインター: マウスに追従し、レイアウトを読まない。俯瞰と終了で消える
  await page.keyboard.press('l');
  await page.mouse.move(200, 200);
  await page.evaluate(() => {
    window.__layoutReads = 0;
    const count = (obj, name) => {
      const orig = obj[name];
      obj[name] = function (...args) { window.__layoutReads++; return orig.apply(this, args); };
      return () => { obj[name] = orig; };
    };
    window.__restoreReads = [count(Element.prototype, 'getBoundingClientRect'), count(window, 'getComputedStyle'), count(Element.prototype, 'getClientRects')];
  });
  await page.mouse.move(820, 460, { steps: 30 });
  await page.waitForTimeout(150);
  const follow = await page.evaluate(() => {
    window.__restoreReads.forEach(restore => restore());
    const layer = document.querySelector('.stage-pointer');
    return {
      reads: window.__layoutReads,
      pointer: LucivoStage.showState().pointer,
      display: getComputedStyle(layer).display,
      px: layer.style.getPropertyValue('--px'),
      py: layer.style.getPropertyValue('--py'),
      dot: layer.firstElementChild.style.transform,
      cursor: getComputedStyle(document.getElementById('visual-stage-container')).cursor
    };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-pointer.png') });
  // Light モードでのポインターの視認性（暖色クリムゾン #E11D48 の芯）と案内文の ? 表記を確認
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(300);
  const lightPointer = await page.evaluate(() => {
    const dot = document.querySelector('.stage-pointer-dot');
    const hint = document.querySelector('.stage-hint');
    return {
      dotBg: dot ? getComputedStyle(dot).backgroundColor : '',
      dotShadow: dot ? getComputedStyle(dot).boxShadow : '',
      hintHasQuestion: hint ? /\?.*ショートカット一覧/.test(hint.textContent) : false
    };
  });
  // 発表中に ? でショートカット一覧が開き、Escape で発表を終了せずにモーダルだけ閉じること
  await page.keyboard.press('?');
  await page.waitForTimeout(150);
  const showModalOpen = await page.evaluate(() => {
    const m = document.getElementById('shortcut-modal');
    return m && !m.classList.contains('hidden') && parseInt(getComputedStyle(m).zIndex, 10) >= 80 && LucivoStage.showState().active;
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const showModalClosedStillActive = await page.evaluate(() => {
    const m = document.getElementById('shortcut-modal');
    return m && m.classList.contains('hidden') && LucivoStage.showState().active;
  });
  await page.keyboard.press('t');
  await waitRendered(page);
  await page.waitForTimeout(300);
  await page.keyboard.press('o');
  await page.waitForTimeout(500);
  const inOverview = await page.evaluate(() => ({ pointer: LucivoStage.showState().pointer, display: getComputedStyle(document.querySelector('.stage-pointer')).display }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  await page.keyboard.press('l');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const afterExit = await page.evaluate(() => ({ active: LucivoStage.showState().active, pointer: LucivoStage.showState().pointer, htmlClass: document.documentElement.className }));
  const pointerOk = follow.reads === 0 && follow.pointer && follow.display === 'block' && follow.px === '820px' && follow.py === '460px'
    && /translate3d\(820px, 460px/.test(follow.dot) && follow.cursor === 'none'
    && lightPointer.dotBg === 'rgb(225, 29, 72)' && lightPointer.hintHasQuestion
    && showModalOpen && showModalClosedStillActive
    && !inOverview.pointer && inOverview.display === 'none'
    && !afterExit.active && !afterExit.pointer && !/is-stage-(pointer|overview|show)/.test(afterExit.htmlClass);
  record('TC-SHOW-012', pointerOk, JSON.stringify({ follow, lightPointer, showModalOpen, showModalClosedStillActive, inOverview, afterExit }));

  // TC-SHOW-013 キーボードナビゲーション（通常閲覧時の操作・ヘルプ開閉・エディタ優先）
  // 1. ? キーでショートカットヘルプモーダルを開閉
  await page.keyboard.press('?');
  await page.waitForTimeout(150);
  const modalOpen = await page.evaluate(() => {
    const m = document.getElementById('shortcut-modal');
    return m && !m.classList.contains('hidden') && m.classList.contains('flex');
  });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  const modalClosed = await page.evaluate(() => {
    const m = document.getElementById('shortcut-modal');
    return m && m.classList.contains('hidden');
  });

  // 2. M キーでモード切替（高速モード ⇔ Visualモード）
  const initMode = await page.evaluate(() => state.isVisualMode);
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  const toggledMode = await page.evaluate(() => state.isVisualMode);
  await page.keyboard.press('m');
  await page.waitForTimeout(200);
  const revertedMode = await page.evaluate(() => state.isVisualMode);

  // 3. 数字キー 1〜4 で Visual スタイル切替
  await page.keyboard.press('3');
  await page.waitForTimeout(200);
  const style3 = await page.evaluate(() => ({ isVis: state.isVisualMode, style: state.infographicStyle }));
  await page.keyboard.press('1');
  await page.waitForTimeout(200);
  const style1 = await page.evaluate(() => ({ isVis: state.isVisualMode, style: state.infographicStyle }));

  // 4. J / K キーで #preview-scroll が確実に次章・前章へスクロールすること
  await page.evaluate(() => { document.getElementById('preview-scroll').scrollTop = 0; lastNavTargetTop = null; });
  await page.waitForTimeout(100);
  const scrollBefore = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  await page.keyboard.press('j');
  await page.waitForTimeout(600);
  const scrollAfterJ1 = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  await page.keyboard.press('j');
  await page.waitForTimeout(600);
  const scrollAfterJ2 = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  await page.keyboard.press('k');
  await page.waitForTimeout(600);
  const scrollAfterK = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  // ] / [ も J / K と同じく次章・前章へ移り、ショートカット一覧に載っていること（FR-025, DD-KEY-002）
  await page.keyboard.press(']');
  await page.waitForTimeout(600);
  const scrollAfterBracketR = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  await page.keyboard.press('[');
  await page.waitForTimeout(600);
  const scrollAfterBracketL = await page.evaluate(() => document.getElementById('preview-scroll').scrollTop);
  const modalListsBrackets = await page.evaluate(() => {
    const keys = Array.from(document.querySelectorAll('#shortcut-modal kbd')).map(k => k.textContent.trim());
    return keys.includes('[') && keys.includes(']');
  });
  const guideHasQuestion = await page.evaluate(() => /\?.*ショートカット一覧/.test(EMPTY_GUIDE_HTML));
  // F5 キーはブラウザのページ更新と競合しないよう捕捉しないこと（defaultPrevented === false かつ発表が起動しないこと）
  const f5NotIntercepted = await page.evaluate(() => {
    const ev = new KeyboardEvent('keydown', { key: 'F5', cancelable: true, bubbles: true });
    const notPrevented = document.dispatchEvent(ev);
    const modalText = document.getElementById('shortcut-modal')?.textContent || '';
    return notPrevented && !ev.defaultPrevented && !LucivoStage.showState().active && !/\bF5\b/.test(modalText);
  });

  // 5. エディタフォーカス時はキーボードショートカットが発火しないこと（文字入力優先）
  await page.focus('#markdown-editor');
  await page.keyboard.type('m1234');
  await page.waitForTimeout(100);
  const editorValAfter = await page.evaluate(() => document.getElementById('markdown-editor').value);
  const editorStyle = await page.evaluate(() => state.infographicStyle);

  const show13Ok = modalOpen && modalClosed
    && toggledMode !== initMode && revertedMode === initMode
    && style3.isVis && style3.style === 'circles'
    && style1.isVis && style1.style === 'shapes'
    && scrollBefore === 0 && scrollAfterJ1 > scrollBefore && scrollAfterJ2 > scrollAfterJ1 && scrollAfterK < scrollAfterJ2
    && scrollAfterBracketR > scrollAfterK && scrollAfterBracketL < scrollAfterBracketR && modalListsBrackets
    && guideHasQuestion && f5NotIntercepted
    && editorValAfter.includes('m1234') && editorStyle === 'shapes';
  record('TC-SHOW-013', show13Ok, JSON.stringify({ modalOpen, modalClosed, toggledMode, style3, style1, scrollBefore, scrollAfterJ1, scrollAfterJ2, scrollAfterK, scrollAfterBracketR, scrollAfterBracketL, modalListsBrackets, guideHasQuestion, f5NotIntercepted, editorValAfter: editorValAfter.slice(-10) }));

  // TC-SHOW-014 幕間・質疑（Q&A）スタンバイカーテン（FR-028）と自動進行ループ待機パルス（FR-033）
  await setDocument(page, showcaseMd);
  await page.click('#btn-stage-show');
  await page.waitForFunction(() => window.LucivoStage && LucivoStage.showState().active);
  await waitRendered(page);
  await page.waitForTimeout(400);
  // B キーで幕間を開く
  await page.keyboard.press('b');
  await page.waitForTimeout(250);
  const curtainOpen = await page.evaluate(() => {
    const c = document.querySelector('#stage-hud .stage-curtain');
    const orbit = document.querySelector('#stage-hud .stage-curtain-orbit');
    const pills = document.querySelectorAll('#stage-hud .stage-curtain-pill');
    const s = orbit ? getComputedStyle(orbit) : null;
    const mask = s ? ((s.maskImage && s.maskImage !== 'none' ? s.maskImage : s.webkitMaskImage) || '') : '';
    return {
      state: LucivoStage.showState().curtain,
      htmlClass: document.documentElement.classList.contains('is-stage-curtain'),
      display: c ? getComputedStyle(c).display : 'none',
      orbitMask: /luminous-orbit\.svg/.test(mask),
      pillCount: pills.length,
      lightsOff: LucivoStage.lightPlans().every(p => !p.active)
    };
  });
  await page.screenshot({ path: path.join(SHOT_DIR, 'show-curtain-qa.png') });
  // 章番号ピル（08）をクリックすると幕が閉じて該当シーン（index: 8）へ直接移動する
  await page.click('#stage-hud .stage-curtain-pill[data-curtain-scene="8"]');
  await page.waitForTimeout(300);
  const afterPillJump = await page.evaluate(() => ({
    curtain: LucivoStage.showState().curtain,
    index: LucivoStage.showState().index,
    active: LucivoStage.showState().active
  }));
  // Q キーで再度開き、Escape で発表を終了せずに幕間だけ閉じることを確認
  await page.keyboard.press('q');
  await page.waitForTimeout(200);
  const qOpened = await page.evaluate(() => LucivoStage.showState().curtain);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const escClosedCurtainOnly = await page.evaluate(() => ({
    curtain: LucivoStage.showState().curtain,
    active: LucivoStage.showState().active,
    index: LucivoStage.showState().index
  }));
  // 最終シーンから自動進行で先頭へ巡回したときに is-stage-ambient（Vivo アンビエント・パルス）が付くことを確認
  await page.keyboard.press('End');
  await page.evaluate(() => {
    const s = document.getElementById('visual-stage-container');
    if (s) s.scrollTop = s.scrollHeight;
  });
  await page.keyboard.press('a');
  await page.waitForFunction(() => LucivoStage.showState().index === 0 && LucivoStage.showState().autoLooped, null, { timeout: 10000 });
  const ambientState = await page.evaluate(() => ({
    autoLooped: LucivoStage.showState().autoLooped,
    ambientClass: document.documentElement.classList.contains('is-stage-ambient'),
    titleAnim: getComputedStyle(document.querySelector('.is-scene .vs-cover-title')).animationName
  }));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  const show14Ok = curtainOpen.state && curtainOpen.htmlClass && curtainOpen.display === 'flex'
    && curtainOpen.orbitMask && curtainOpen.pillCount === SHOWCASE_SCENES && curtainOpen.lightsOff
    && !afterPillJump.curtain && afterPillJump.index === 8 && afterPillJump.active
    && qOpened && !escClosedCurtainOnly.curtain && escClosedCurtainOnly.active && escClosedCurtainOnly.index === 8
    && ambientState.autoLooped && ambientState.ambientClass && ambientState.titleAnim === 'lucivo-ambient-breathe';
  record('TC-SHOW-014', show14Ok, JSON.stringify({ curtainOpen, afterPillJump, qOpened, escClosedCurtainOnly, ambientState }));

  if (page.consoleErrors.length) record('TC-SHOW-CONSOLE2', false, JSON.stringify(page.consoleErrors));
  await page.context().close();
}

// TC-UI-001〜003: 狭い画面のヘッダー・Web 版の更新確認非表示・Split 境目ドラッグ（#88, #89, #82）

module.exports = {
  testSignalLight,
  testStageShow,
  testStageOverviewPointer
};
