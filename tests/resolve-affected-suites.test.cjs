/**
 * tests/resolve-affected-suites.test.cjs
 *
 * tools/resolve-affected-suites.cjs の単体テスト（Ref #336）。
 */
'use strict';

const assert = require('assert');
const { resolveAffectedSuites, buildReverseDependencyGraph } = require('../tools/resolve-affected-suites.cjs');

const graph = buildReverseDependencyGraph();

// 1. 局所変更（folder-search.ts）-> 対象スイートのみ
{
  const res = resolveAffectedSuites(['src/ts/ui/folder-search.ts'], graph);
  assert.strictEqual(res.mode, 'partial', 'folder-search.ts should resolve to partial mode');
  assert.ok(res.suites.includes('testFolder'), 'should include testFolder');
  assert.ok(res.suites.includes('testSampleLinks'), 'should include testSampleLinks');
  assert.ok(res.suites.includes('testUrlLoading'), 'should include testUrlLoading');
  assert.ok(!res.suites.includes('testDiagramRendering'), 'should not include unrelated testDiagramRendering');
}

// 2. コア共通層（state.ts）-> mode: 'all'
{
  const res = resolveAffectedSuites(['src/ts/ui/state.ts'], graph);
  assert.strictEqual(res.mode, 'all', 'state.ts should fall back to all mode');
  assert.deepStrictEqual(res.suites, []);
}

// 3. 未知ファイル -> mode: 'all'
{
  const res = resolveAffectedSuites(['tools/some-unknown-script.cjs'], graph);
  assert.strictEqual(res.mode, 'all', 'unknown file should fall back to all mode');
}

// 4. 発表モード（museum-walk）-> testMuseumWalk + GATE_SUITES
{
  const res = resolveAffectedSuites(['src/ts/modes/museum-walk/camera.ts'], graph);
  assert.strictEqual(res.mode, 'partial');
  assert.ok(res.suites.includes('testMuseumWalk'));
  assert.ok(res.suites.includes('testPresentModeGateWeb'));
  assert.ok(res.suites.includes('testPresentModeGateStandalone'));
}

// 5. ドキュメントのみ混在時でもコード変更のみから絞り込める
{
  const res = resolveAffectedSuites(['README.md', 'src/ts/ui/analytics.ts'], graph);
  assert.strictEqual(res.mode, 'partial');
  assert.ok(res.suites.includes('testWebAnalytics'));
  assert.ok(!res.suites.includes('testDiagramRendering'));
}

console.log('resolve-affected-suites.test.cjs: all assertions passed');
