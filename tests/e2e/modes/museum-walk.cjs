// ミュージアム・ウォーク（TC-MWLK-001〜008、FR-056）のテスト。tests/e2e.cjs が tests/e2e/modes/ のファイルを自動で集める（ARC-MODE-008）。
// 共通の品質（始められる・エラーがない・スマホの幅ではみ出さない・Esc で戻る）は present-modes.cjs の関門で確かめる。ここでは体験の核心だけを確かめる。
// 確かめた場面のスクリーンショット（ゲラ）を SHOT_DIR に mw-*.png で残す（dtp の校正で使う）。
const path = require('path');
const { record, SHOT_DIR, startWebServer, openWebPageWithSample, setDocument, waitRendered } = require('../helpers.cjs');

const MODE = 'museum-walk';

async function start(page) {
  await page.click('#btn-present-menu');
  await page.click(`#menu-present-${MODE}`);
  await page.waitForFunction(id => window.LucivoModes.get(id) && window.LucivoModes.get(id).info().active, MODE, { timeout: 20000 });
  await page.waitForTimeout(400);
}

const info = page => page.evaluate(id => window.LucivoModes.get(id).info(), MODE);
const walkTo = (page, z) => page.evaluate(([id, zz]) => window.LucivoModes.get(id).walkTo(zz), [MODE, z]);
const shot = (page, name) => page.screenshot({ path: path.join(SHOT_DIR, `mw-${name}.png`) });

// 歩きは速度と摩擦で動き、1 コマの進みに上限（0.05 秒分）がある。毎秒のコマ数が少ない環境では、動きが実時間より遅れる。
// そのため、実時間の待ち（waitForTimeout）で位置を読むと、滑りの途中の値になる。位置が止まるまで待ってから読む（TC-MWLK-002）
async function settle(page, maxMs = 15000) {
  let last = (await info(page)).z;
  let still = 0;
  for (let t = 0; t < maxMs && still < 3; t += 250) {
    await page.waitForTimeout(250);
    const z = (await info(page)).z;
    still = Math.abs(z - last) < 0.5 ? still + 1 : 0;
    last = z;
  }
  return last;
}

// key を押し続け、条件を満たすか上限の時間になったら離す
async function holdUntil(page, key, done, maxMs = 15000) {
  await page.keyboard.down(key);
  for (let t = 0; t < maxMs; t += 100) {
    await page.waitForTimeout(100);
    if (done((await info(page)).z)) break;
  }
  await page.keyboard.up(key);
}

// 止まって左の壁を向いたとき、パーツの真ん中が正面に来る位置（横の距離 lateral のとき）
const readingZ = (part, lateral) => part.z - part.w / 2 + lateral;

async function testMuseumWalk(browser) {
  const server = await startWebServer();
  try {
    const page = await openWebPageWithSample(browser, server);
    const scriptBefore = await page.evaluate(() => Array.from(document.scripts).some(s => /museum-walk\.js/.test(s.src)));

    // TC-MWLK-001: Markdown の構成から、表紙の門・章の門・広間・小部屋・壁のパーツを作る。Visualモードの DOM は書き換えない
    await start(page);
    const built = await page.evaluate(id => {
      const i = window.LucivoModes.get(id).info();
      const vs = document.getElementById('visual-stage-container');
      const slabs = vs.querySelectorAll('.exhibition-wrap > .exhibition-slab h2').length;
      const figures = Array.from(vs.querySelectorAll('[data-stage-index]')).filter(vp => vp.querySelector('svg')).length;
      const quotes = Array.from(vs.querySelectorAll('blockquote, .md-alert')).filter(q => !q.parentElement.closest('blockquote, .md-alert')).length;
      const imgs = Array.from(document.querySelectorAll('#museum-walk .mw-fig-layer img'));
      const root = document.getElementById('museum-walk');
      const ids = Array.from(root.querySelectorAll('[id]')).map(n => n.id);
      return {
        cover: i.gates[0] && i.gates[0].cover ? i.gates[0].title : null,
        heroTitle: (vs.querySelector('.vs-cover-title') || { textContent: '' }).textContent.trim(),
        chapterGates: i.gates.filter(g => !g.cover).length,
        slabs,
        halls: i.sections.filter(s => s.name === 'hall').length,
        stands: i.stands,
        figures,
        alcoves: i.sections.filter(s => s.name === 'alcove').length,
        quotes,
        kinds: Array.from(new Set(i.parts.map(p => p.kind))).sort(),
        signs: i.parts.filter(p => p.kind === 'number').length,
        imagesLoaded: imgs.length > 0 && imgs.every(img => img.complete && img.naturalWidth > 0),
        images: imgs.length,
        idsInside: ids,
        // 区間が途切れなく並ぶ
        contiguous: i.sections.every((s, k) => k === 0 || s.from === i.sections[k - 1].to),
        lights: document.documentElement.classList.contains('is-museum-walk')
      };
    }, MODE);
    await walkTo(page, (await info(page)).start);
    await shot(page, 'cover');
    record('TC-MWLK-001', !scriptBefore && built.cover === built.heroTitle && built.chapterGates === built.slabs && built.halls === built.figures
      && built.stands === built.figures && built.alcoves === built.quotes && ['body', 'bullet', 'h3', 'number'].every(k => built.kinds.includes(k))
      && built.signs === built.slabs && built.imagesLoaded && built.idsInside.length === 0 && built.contiguous && built.lights && page.consoleErrors.length === 0,
    JSON.stringify({ scriptBefore, ...built, errors: page.consoleErrors }));

    // TC-MWLK-008: 長い題名の表紙で、題名が語の途中で折り返さない（#156）
    const title = await page.evaluate(() => {
      const el = document.querySelector('#museum-walk .mw-gate.is-cover .mw-title');
      const cs = getComputedStyle(el);
      // 題名は 3D 変換の中にあり、文字の位置が傾く。変換の外に同じ書体・幅の複製を置いて、行の切れ目を測る
      const copy = document.createElement('div');
      copy.textContent = el.textContent;
      copy.style.cssText = `position:fixed;left:0;top:0;visibility:hidden;width:${el.offsetWidth}px;font:${cs.font};letter-spacing:${cs.letterSpacing};overflow-wrap:${cs.overflowWrap};line-break:${cs.lineBreak};word-break:${cs.wordBreak};text-wrap:${cs.textWrap}`;
      document.body.appendChild(copy);
      const node = copy.firstChild;
      const text = node.textContent;
      const range = document.createRange();
      const tops = [];
      for (let k = 0; k < text.length; k++) {
        range.setStart(node, k);
        range.setEnd(node, k + 1);
        const r = range.getClientRects()[0];
        tops.push(r ? Math.round(r.top) : null);
      }
      // 行の切れ目（隣り合う文字の top が違う位置）が、語の中にないこと
      const words = ['ボリューム', '雛形', '総合', 'サンプル', '図表', 'サイズ', 'Lucivo'];
      const broken = [];
      words.forEach(w => {
        let from = text.indexOf(w);
        while (from >= 0) {
          for (let k = from + 1; k < from + w.length; k++) if (tops[k] !== null && tops[k - 1] !== null && tops[k] !== tops[k - 1]) broken.push(`${w}@${k}`);
          from = text.indexOf(w, from + 1);
        }
      });
      copy.remove();
      return { text, lines: new Set(tops.filter(t => t !== null)).size, wordBreak: cs.wordBreak, textWrap: cs.textWrap, broken };
    });
    record('TC-MWLK-008', title.text.length > 20 && title.lines >= 2 && title.wordBreak === 'auto-phrase' && title.textWrap === 'balance' && title.broken.length === 0, JSON.stringify(title));

    // TC-MWLK-002: 歩く（押し続ける・1 回押し・ホイール・後ろへ）。門を通り抜けると、今いる章の表示が変わる。止まると左の壁を向き、G で正面に戻る
    const i0 = await info(page);
    const g1 = i0.gates[1];
    // 門のすぐ手前から、門を通り抜けるまで押し続け、滑りが止まってから位置を読む（待ちは実時間でなく、位置が止まるまで）
    await walkTo(page, g1.z + 120);
    const zoneBefore = await page.textContent('#museum-walk .mw-zone');
    await holdUntil(page, 'ArrowUp', z => z < g1.z - 60);
    await settle(page);
    const afterHold = await info(page);
    const zoneAfter = await page.textContent('#museum-walk .mw-zone');
    const zTap0 = afterHold.z;
    await page.keyboard.press('ArrowRight');
    const zTap1 = await settle(page);
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 400);
    const zWheel = await settle(page);
    await holdUntil(page, 'ArrowDown', z => z > zWheel + 100);
    const zBack = await settle(page);
    const body = i0.parts.find(p => p.kind === 'body' && p.z < g1.z);
    await walkTo(page, readingZ(body, 512));
    const stopped = await info(page);
    await shot(page, 'wall');
    await page.keyboard.press('g');
    await walkTo(page, readingZ(body, 512));
    const noGaze = await info(page);
    await page.keyboard.press('g');
    record('TC-MWLK-002', afterHold.z < g1.z && zoneAfter !== zoneBefore && /01/.test(zoneAfter) && zTap1 < zTap0 - 200 && zWheel < zTap1 - 200 && zBack > zWheel
      && stopped.yaw > 40 && !noGaze.gaze && Math.abs(noGaze.yaw) < 5,
    JSON.stringify({ g1: g1.z, afterHold: afterHold.z, zoneBefore, zoneAfter, zTap0, zTap1, zWheel, zBack, stoppedYaw: stopped.yaw, noGazeYaw: noGaze.yaw }));

    // TC-MWLK-003: 広間の立体図と小部屋の銘板（ゲラ）。T で外観を切り替え、R で入口へ戻る
    const hall = i0.sections.find(s => s.name === 'hall');
    await walkTo(page, hall.from - 200);
    await shot(page, 'hall');
    const aside = i0.parts.find(p => p.kind === 'aside');
    await walkTo(page, readingZ(aside, 265));
    await shot(page, 'alcove');
    const appearance = await page.evaluate(() => state.appearance === 'dark' ? 'dark' : 'light');
    const first = (await info(page)).appearance;
    await page.keyboard.press('t');
    await walkTo(page, readingZ(body, 512));
    const toggled = await page.evaluate(id => ({ appearance: window.LucivoModes.get(id).info().appearance, cls: document.getElementById('museum-walk').classList.contains('is-light') }), MODE);
    await shot(page, toggled.appearance === 'light' ? 'wall-light' : 'wall-dark');
    await page.keyboard.press('t');
    await page.keyboard.press('r');
    await page.waitForTimeout(200);
    const atEntrance = await info(page);
    record('TC-MWLK-003', first === appearance && toggled.appearance !== first && toggled.cls === (toggled.appearance === 'light') && atEntrance.z === atEntrance.start,
      JSON.stringify({ appearance, first, toggled, z: atEntrance.z, start: atEntrance.start }));

    // TC-MWLK-004: Esc で終えると、重ねと付けたクラスが消える（元の表示に戻ることは TC-MODE-004 で確かめる）
    await page.keyboard.press('Escape');
    await page.waitForFunction(id => !window.LucivoModes.get(id).info().active, MODE, { timeout: 5000 }).catch(() => {});
    const ended = await page.evaluate(id => ({
      active: window.LucivoModes.get(id).info().active,
      overlay: !!document.getElementById('museum-walk'),
      cls: document.documentElement.classList.contains('is-museum-walk')
    }), MODE);

    // 文書が空のときは、始めずに知らせる
    await setDocument(page, '');
    await page.click('#btn-present-menu');
    await page.click(`#menu-present-${MODE}`);
    await page.waitForFunction(() => /ミュージアム・ウォークで見せる文書がありません/.test(document.getElementById('toast-message').textContent), null, { timeout: 5000 }).catch(() => {});
    const empty = await page.evaluate(id => ({
      active: window.LucivoModes.get(id).info().active,
      overlay: !!document.getElementById('museum-walk'),
      toast: document.getElementById('toast-message').textContent
    }), MODE);
    record('TC-MWLK-004', !ended.active && !ended.overlay && !ended.cls && !empty.active && !empty.overlay && /見せる文書がありません/.test(empty.toast) && page.consoleErrors.length === 0,
      JSON.stringify({ ended, empty, errors: page.consoleErrors }));
    await page.context().close();

    // TC-MWLK-005: スマホの縦長の画面では、止まったときの向きと立つ位置を壁寄りに補正する。右上の ✕ で終えられる
    const phone = await openWebPageWithSample(browser, server);
    await phone.setViewportSize({ width: 390, height: 844 });
    await phone.waitForTimeout(500);
    await start(phone);
    const pi = await info(phone);
    const pBody = pi.parts.find(p => p.kind === 'body' && p.z < pi.gates[1].z);
    await walkTo(phone, readingZ(pBody, 590));
    const portrait = await info(phone);
    await shot(phone, 'portrait-wall');
    const pHall = pi.sections.find(s => s.name === 'hall');
    await walkTo(phone, pHall.from - 200);
    await shot(phone, 'portrait-hall');
    const exitBox = await phone.locator('#museum-walk .mw-exit').boundingBox();
    await phone.click('#museum-walk .mw-exit');
    await phone.waitForFunction(id => !window.LucivoModes.get(id).info().active, MODE, { timeout: 5000 }).catch(() => {});
    const phoneEnded = await phone.evaluate(id => !window.LucivoModes.get(id).info().active && !document.getElementById('museum-walk'), MODE);
    record('TC-MWLK-005', portrait.yaw >= 48 && portrait.x >= 200 && !!exitBox && exitBox.width >= 40 && exitBox.x + exitBox.width <= 390 && phoneEnded && phone.consoleErrors.length === 0,
      JSON.stringify({ yaw: portrait.yaw, x: portrait.x, exitBox, phoneEnded, errors: phone.consoleErrors }));
    await phone.context().close();

    // TC-MWLK-006: 動きを減らす設定では、門を通り抜ける瞬間の光と、パーツが壁から滑り出す動きを出さない
    const reduced = await openWebPageWithSample(browser, server, { reducedMotion: 'reduce' });
    await start(reduced);
    const ri = await info(reduced);
    const rPart = ri.parts.find(p => p.kind === 'body' && p.z < ri.gates[1].z);
    // 現れる途中（パーツの手前 2000px）と、門の真上
    await walkTo(reduced, rPart.z + 2000);
    const sliding = await reduced.evaluate(() => Array.from(document.querySelectorAll('#museum-walk .mw-body')).filter(n => n.style.display !== 'none').map(n => n.style.transform));
    await walkTo(reduced, ri.gates[1].z + 10);
    const flash = await reduced.evaluate(() => getComputedStyle(document.querySelector('#museum-walk .mw-flash')).opacity);
    record('TC-MWLK-006', ri.reducedMotion && sliding.length > 0 && sliding.every(t => /translate3d\(0px, 0px, 0px\)/.test(t)) && Number(flash) === 0 && reduced.consoleErrors.length === 0,
      JSON.stringify({ reducedMotion: ri.reducedMotion, sliding: sliding.slice(0, 2), flash, errors: reduced.consoleErrors }));
    await reduced.context().close();

    // TC-MWLK-007: タッチ主体端末（pointer: coarse）のスマホではメニュー項目が無効化され、デスクトップでは有効であること（#125）
    const checkRestricted = async viewport => {
      const ctx = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
      const p = await ctx.newPage();
      await p.goto(server.url, { waitUntil: 'load' });
      await waitRendered(p);
      await p.click('#btn-present-menu');
      const state = await p.evaluate(id => {
        const btn = document.getElementById(`menu-present-${id}`);
        return {
          disabled: !!btn && btn.disabled,
          ariaDisabled: btn ? btn.getAttribute('aria-disabled') : null,
          text: btn ? btn.textContent.trim() : '',
          coarse: window.matchMedia('(pointer: coarse)').matches
        };
      }, MODE);
      await ctx.close();
      return state;
    };
    const mobilePort = await checkRestricted({ width: 390, height: 844 });
    const mobileLand = await checkRestricted({ width: 891, height: 411 });
    const desktopCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const desktop = await desktopCtx.newPage();
    await desktop.goto(server.url, { waitUntil: 'load' });
    await waitRendered(desktop);
    await desktop.click('#btn-present-menu');
    const desktopState = await desktop.evaluate(id => {
      const btn = document.getElementById(`menu-present-${id}`);
      return { disabled: !!btn && btn.disabled, text: btn ? btn.textContent.trim() : '' };
    }, MODE);
    await desktopCtx.close();
    const mw7Ok = mobilePort.coarse && mobilePort.disabled && mobilePort.ariaDisabled === 'true' && /スマホ非対応/.test(mobilePort.text)
      && mobileLand.coarse && mobileLand.disabled && mobileLand.ariaDisabled === 'true' && /スマホ非対応/.test(mobileLand.text)
      && !desktopState.disabled && !/スマホ非対応/.test(desktopState.text);
    record('TC-MWLK-007', mw7Ok, JSON.stringify({ mobilePort, mobileLand, desktopState }));
  } finally {
    await server.close();
  }
}

module.exports = {
  suites: [
    { name: 'testMuseumWalk', tcPrefix: ['TC-MWLK-001', 'TC-MWLK-002', 'TC-MWLK-003', 'TC-MWLK-004', 'TC-MWLK-005', 'TC-MWLK-006', 'TC-MWLK-007', 'TC-MWLK-008'], fn: testMuseumWalk, timeoutMs: 180000 }
  ]
};
