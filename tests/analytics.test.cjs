/**
 * tests/analytics.test.cjs
 *
 * src/ts/ui/analytics.ts（Web 版の GA4 利用状況計測、#321）の単体テスト。
 * 実行: node tests/analytics.test.cjs
 */
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const esbuild = require('esbuild');

const ROOT = path.join(__dirname, '..');

function loadAnalyticsModule(versionString) {
  const built = esbuild.buildSync({
    entryPoints: [path.join(ROOT, 'src', 'ts', 'ui', 'analytics.ts')],
    bundle: true,
    format: 'cjs',
    platform: 'node',
    write: false,
    define: {
      __LUCIVO_VERSION__: JSON.stringify(versionString)
    }
  });
  const code = built.outputFiles[0].text;
  const mod = { exports: {} };
  const fakeWindow = {
    location: { protocol: 'https:' },
    dataLayer: []
  };
  vm.runInNewContext(code, {
    module: mod,
    exports: mod.exports,
    require,
    console,
    window: fakeWindow,
    navigator: { webdriver: false }
  });
  return { exports: mod.exports, window: fakeWindow };
}

// 1. getReleaseChannel の判定（URL ではなくビルド埋め込み版番号から判定）
{
  const { exports: mod } = loadAnalyticsModule('0.12.0');
  assert.strictEqual(mod.getReleaseChannel('0.12.0'), null);
  assert.strictEqual(mod.getReleaseChannel('0.12.0 (build id: 123456)'), 'production');
  assert.strictEqual(mod.getReleaseChannel('0.12.0-canary (build id: 123456)'), 'preview');
  assert.strictEqual(mod.getReleaseChannel(''), null);
}

// 2. 正式版（production）では https: かつ !webdriver のときだけ dataLayer へ送信
{
  const { exports: mod, window: win } = loadAnalyticsModule('0.12.0 (build id: 987654)');
  assert.strictEqual(mod.trackWebEvent('design_style_select', { design_style: 'cards' }), true);
  assert.strictEqual(win.dataLayer.length, 1);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(win.dataLayer[0])), {
    event: 'design_style_select',
    release_channel: 'production',
    design_style: 'cards'
  });
}

// 3. プレビュー版（preview）では release_channel: 'preview' で送信
{
  const { exports: mod, window: win } = loadAnalyticsModule('0.12.0-canary (build id: 987654)');
  assert.strictEqual(mod.trackWebEvent('tone_select', { tone: 'warm' }), true);
  assert.strictEqual(mod.trackWebEvent('present_mode_select', { present_mode: 'museum-walk' }), true);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(win.dataLayer)), [
    { event: 'tone_select', release_channel: 'preview', tone: 'warm' },
    { event: 'present_mode_select', release_channel: 'preview', present_mode: 'museum-walk' }
  ]);
}

// 4. ローカル開発版・file://（スタンドアロン版）・webdriver（E2E）では送信しない
{
  const { exports: devMod, window: devWin } = loadAnalyticsModule('0.12.0');
  assert.strictEqual(devMod.trackWebEvent('design_style_select', { design_style: 'shapes' }), false);
  assert.strictEqual(devWin.dataLayer.length, 0);

  const { exports: prodMod, window: prodWin } = loadAnalyticsModule('0.12.0 (build id: 111)');
  assert.strictEqual(
    prodMod.trackWebEvent('tone_select', { tone: 'forest' }, {
      version: '0.12.0 (build id: 111)',
      protocol: 'file:',
      webdriver: false
    }),
    false
  );
  assert.strictEqual(
    prodMod.trackWebEvent('tone_select', { tone: 'forest' }, {
      version: '0.12.0 (build id: 111)',
      protocol: 'https:',
      webdriver: true
    }),
    false
  );
  assert.strictEqual(prodWin.dataLayer.length, 0);
}

// 5. public/index.html に GTM スニペット（gtm.start）が含まれること
{
  const indexHtml = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
  assert.ok(indexHtml.includes('<!-- LUCIVO_WEB_ANALYTICS_START -->'));
  assert.ok(indexHtml.includes('GTM-KMQ3KLNT'));
  assert.ok(indexHtml.includes("'gtm.start'"));
  assert.ok(indexHtml.includes("event: 'gtm.js'"));
}

// 6. tone_select で tone / tone_id / appearance を送信できること、および selectTone の実装確認
{
  const { exports: mod, window: win } = loadAnalyticsModule('0.14.0 (build id: 222)');
  assert.strictEqual(
    mod.trackWebEvent('tone_select', {
      tone: 'morning-window',
      tone_id: '001-morning-window',
      appearance: 'dark'
    }),
    true
  );
  assert.deepStrictEqual(JSON.parse(JSON.stringify(win.dataLayer)), [
    {
      event: 'tone_select',
      release_channel: 'production',
      tone: 'morning-window',
      tone_id: '001-morning-window',
      appearance: 'dark'
    }
  ]);

  const vcSrc = fs.readFileSync(path.join(ROOT, 'src', 'ts', 'ui', 'view-controls.ts'), 'utf8');
  assert.ok(vcSrc.includes("tone_id: toneEntry.analyticsId"));
  assert.ok(vcSrc.includes("appearance: state.appearance"));
}

// 7. tools/check-tones.cjs の整合性検査（正常系・重複・廃止済み ID 再利用・不一致）
{
  const { validateTones } = require('../tools/check-tones.cjs');
  const realRes = validateTones();
  assert.deepStrictEqual(realRes.errors, []);

  // 番号重複
  const dupNumRes = validateTones({
    stock: [
      { file: '01-a.md', number: 1, id: 'a', analyticsId: '001-a' },
      { file: '01-b.md', number: 1, id: 'b', analyticsId: '001-b' }
    ],
    retiredData: { retired: [] },
    productTones: [{ id: 'default', analyticsId: '000-default' }]
  });
  assert.ok(dupNumRes.errors.some(e => e.includes('通し番号 1 が重複')));

  // 廃止済み ID 再利用
  const retiredReuseRes = validateTones({
    stock: [{ file: '02-old-tone.md', number: 2, id: 'old-tone', analyticsId: '002-old-tone' }],
    retiredData: { retired: [{ number: 2, id: 'old-tone', analyticsId: '002-old-tone', retiredAt: '2026-11-23' }] },
    productTones: [{ id: 'default', analyticsId: '000-default' }]
  });
  assert.ok(retiredReuseRes.errors.some(e => e.includes('廃止済み番号 2')));
  assert.ok(retiredReuseRes.errors.some(e => e.includes('廃止済み ID "old-tone"')));

  // 製品の analyticsId 不一致
  const mismatchRes = validateTones({
    stock: [{ file: '01-morning-window.md', number: 1, id: 'morning-window', analyticsId: '001-morning-window' }],
    retiredData: { retired: [] },
    productTones: [{ id: 'morning-window', analyticsId: '999-morning-window' }]
  });
  assert.ok(mismatchRes.errors.some(e => e.includes('analyticsId がストック定義と一致しません')));
}

console.log('analytics.test.cjs: all assertions passed');
