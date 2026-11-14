// 発表モード共通の品質の関門（TC-MODE-001〜006。doc/2.ARCHITECTURE.md 4.16 ARC-MODE-007）。
// 登録表（src/ts/modes/modes.json）のすべてのモードを、Web 版（public/ を手元のサーバーで配る）で検査する。stage: "all" のモードは、同じ検査を file://（dist/）でも行う。
// 検査の項目: 始められる / コンソールにエラーが出ない / スマホの幅（390px）で横にはみ出さない / Esc で元の表示に戻る。
// 関門を通らないと分かっていて直さないモードは、登録表の gateSkip に項目（start・errors・narrow・esc）と理由を書く。
// 関門はモードの info().active を読む（始められたか・終わったかの判定）。
const path = require('path');
const fs = require('fs');
const {
  ROOT_DIR,
  record,
  openStagePage,
  loadSample,
  startWebServer,
  openWebPageWithSample
} = require('./helpers.cjs');

const MODES = require(path.join(ROOT_DIR, 'src', 'ts', 'modes', 'modes.json'));
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const NARROW = { width: 390, height: 844 };

// 1 つのモードを、開いた状態のページで検査する。項目ごとの { ok, detail } を返す（gateSkip の項目は skipped を付ける）
async function checkMode(page, mode) {
  const skip = mode.gateSkip || {};
  const out = {};
  const info = () => page.evaluate(id => (window.LucivoModes.get(id) || { info: () => ({}) }).info(), mode.id);
  const view = () => page.evaluate(() => ({
    visual: state.isVisualMode,
    viewMode: state.viewMode,
    scrollTop: Math.round((document.getElementById('preview-scroll') || { scrollTop: 0 }).scrollTop)
  }));

  // 高速モードのまま、スクロール位置を動かしてから始める（Esc で戻る先を確かめるため）
  await page.evaluate(() => { const s = document.getElementById('preview-scroll'); if (s) s.scrollTop = 300; });
  await page.waitForTimeout(150);
  const before = await view();
  const errorsBefore = page.consoleErrors.length;

  await page.click('#btn-present-menu');
  await page.click(`#menu-present-${mode.id}`);
  let started = true;
  await page.waitForFunction(id => {
    const m = window.LucivoModes.get(id);
    return m && m.info && m.info().active;
  }, mode.id, { timeout: 15000 }).catch(() => { started = false; });
  await page.waitForTimeout(300);
  out.start = { ok: started, detail: JSON.stringify({ started }) };

  // Esc で元の表示（高速 / Visual、Split / Canvas、スクロール位置）に戻る
  await page.keyboard.press('Escape');
  let ended = true;
  await page.waitForFunction(id => !window.LucivoModes.get(id).info().active, mode.id, { timeout: 5000 }).catch(() => { ended = false; });
  await page.waitForTimeout(600);
  const after = await view();
  const restored = after.visual === before.visual && after.viewMode === before.viewMode && Math.abs(after.scrollTop - before.scrollTop) <= 2;
  out.esc = { ok: ended && restored, detail: JSON.stringify({ ended, before, after, active: (await info()).active }) };

  const errors = page.consoleErrors.slice(errorsBefore);
  out.errors = { ok: errors.length === 0, detail: JSON.stringify(errors) };

  Object.keys(skip).forEach(key => {
    if (out[key] && !out[key].ok) out[key] = { ok: true, detail: `skipped（gateSkip: ${skip[key]}）: ${out[key].detail}` };
  });
  return out;
}

// スマホの幅（390px）で始めて、横にはみ出さないことを確かめる。全画面にするモードは、始めたあとに画面の大きさを変えられないため、
// 始める前に幅を狭くする
async function checkNarrow(page, mode) {
  await page.setViewportSize(NARROW);
  await page.waitForTimeout(500);
  await page.click('#btn-present-menu');
  await page.click(`#menu-present-${mode.id}`);
  await page.waitForFunction(id => {
    const m = window.LucivoModes.get(id);
    return m && m.info && m.info().active;
  }, mode.id, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  const ok = overflow.scrollWidth <= overflow.innerWidth;
  const skip = (mode.gateSkip || {}).narrow;
  return !ok && skip ? { ok: true, detail: `skipped（gateSkip: ${skip}）: ${JSON.stringify(overflow)}` } : { ok, detail: JSON.stringify(overflow) };
}

// 項目ごとに、すべてのモードの結果を 1 つの TC にまとめる（モードが増減しても TC の ID は変わらない）
function summarize(results, key) {
  const failed = results.filter(r => !r.checks[key].ok);
  return { ok: failed.length === 0, detail: JSON.stringify(results.map(r => ({ mode: r.mode, ok: r.checks[key].ok, detail: r.checks[key].detail }))) };
}

async function testPresentModeGateWeb(browser) {
  if (!MODES.length) {
    ['TC-MODE-001', 'TC-MODE-002', 'TC-MODE-003', 'TC-MODE-004'].forEach(id => record(id, true, '登録されたモードがない'));
    return;
  }
  const server = await startWebServer();
  try {
    const results = [];
    for (const mode of MODES) {
      const page = await openWebPageWithSample(browser, server, {}, 'notation_sample.md');
      const checks = await checkMode(page, mode);
      await page.context().close();
      const narrowPage = await openWebPageWithSample(browser, server, {}, 'notation_sample.md');
      checks.narrow = await checkNarrow(narrowPage, mode);
      await narrowPage.context().close();
      results.push({ mode: mode.id, checks });
    }
    const start = summarize(results, 'start');
    const errors = summarize(results, 'errors');
    const narrow = summarize(results, 'narrow');
    const esc = summarize(results, 'esc');
    record('TC-MODE-001', start.ok, start.detail);
    record('TC-MODE-002', errors.ok, errors.detail);
    record('TC-MODE-003', narrow.ok, narrow.detail);
    record('TC-MODE-004', esc.ok, esc.detail);
  } finally {
    await server.close();
  }
}

async function testPresentModeGateStandalone(browser) {
  // TC-MODE-005: stage: "web" のモードは、スタンドアロン版（dist/）のメニューに項目がなく、ファイルも入っていない
  const page = await openStagePage(browser);
  await page.click('#btn-present-menu');
  const webModes = MODES.filter(m => m.stage === 'web');
  const present = await page.evaluate(ids => ids.filter(id => document.getElementById(`menu-present-${id}`)), webModes.map(m => m.id));
  const files = webModes.flatMap(m => [`js/modes/${m.id}.js`, `css/modes/${m.id}.css`]).filter(f => fs.existsSync(path.join(DIST_DIR, f)));
  record('TC-MODE-005', present.length === 0 && files.length === 0, JSON.stringify({ webModes: webModes.map(m => m.id), menuItems: present, files }));
  await page.context().close();

  // TC-MODE-006: stage: "all" のモードは、同じ検査を file://（dist/）でも通る（該当するモードがなければ対象なし）
  const allModes = MODES.filter(m => m.stage === 'all');
  const results = [];
  for (const mode of allModes) {
    const p = await openStagePage(browser);
    await loadSample(p);
    const checks = await checkMode(p, mode);
    await p.context().close();
    const narrowPage = await openStagePage(browser);
    await loadSample(narrowPage);
    checks.narrow = await checkNarrow(narrowPage, mode);
    await narrowPage.context().close();
    results.push({ mode: mode.id, checks });
  }
  const failed = results.flatMap(r => Object.entries(r.checks).filter(([, c]) => !c.ok).map(([k]) => `${r.mode}:${k}`));
  record('TC-MODE-006', failed.length === 0, JSON.stringify({ modes: allModes.map(m => m.id), failed }));
}

module.exports = {
  suites: [
    { name: 'testPresentModeGateWeb', tcPrefix: ['TC-MODE-001', 'TC-MODE-002', 'TC-MODE-003', 'TC-MODE-004'], fn: testPresentModeGateWeb, timeoutMs: 120000 },
    { name: 'testPresentModeGateStandalone', tcPrefix: ['TC-MODE-005', 'TC-MODE-006'], fn: testPresentModeGateStandalone }
  ]
};
