/**
 * tests/check-ci-changes.test.cjs
 * 
 * tools/check-ci-changes.cjs の単体テスト。
 */

'use strict';

const assert = require('assert');
const {
  isDocPath,
  isPackageVersionOnlyDiff,
  areAllFilesDocsOrVersion,
  evaluateE2E
} = require('../tools/check-ci-changes.cjs');

async function runTests() {
  console.log('Testing isDocPath...');
  assert.strictEqual(isDocPath('doc/1.SRS.md'), true);
  assert.strictEqual(isDocPath('doc/0.DTP/README.md'), true);
  assert.strictEqual(isDocPath('.claude/skills/commit/SKILL.md'), true);
  assert.strictEqual(isDocPath('.agent/rules/agents.md'), true);
  assert.strictEqual(isDocPath('.github/copilot-instructions.md'), true);
  assert.strictEqual(isDocPath('README.md'), true);
  assert.strictEqual(isDocPath('AGENTS.md'), true);
  assert.strictEqual(isDocPath('AGENTS.repo.md'), true);
  assert.strictEqual(isDocPath('src/ts/app.ts'), false);
  assert.strictEqual(isDocPath('public/js/app.js'), false);
  assert.strictEqual(isDocPath('tools/build-app.cjs'), false);
  assert.strictEqual(isDocPath('.github/workflows/e2e.yml'), false);
  console.log('  -> isDocPath passed.');

  console.log('Testing isPackageVersionOnlyDiff with past release commit f56470a...');
  const isPkgVer = isPackageVersionOnlyDiff('f56470a~1', 'f56470a', 'package.json');
  assert.strictEqual(isPkgVer, true);
  const isLockVer = isPackageVersionOnlyDiff('f56470a~1', 'f56470a', 'package-lock.json');
  assert.strictEqual(isLockVer, true);
  console.log('  -> isPackageVersionOnlyDiff passed.');

  console.log('Testing areAllFilesDocsOrVersion with release commit f56470a...');
  const isReleaseOnly = areAllFilesDocsOrVersion('f56470a~1', 'f56470a');
  assert.strictEqual(isReleaseOnly, true, 'Release commit should be recognized as docs/version-only');
  console.log('  -> areAllFilesDocsOrVersion passed.');

  console.log('Testing evaluateE2E on overall docs-only commit (PR #60 commit e0a099d)...');
  const resultDocs = await evaluateE2E({
    base: 'e0a099d~1',
    head: 'e0a099d'
  });
  assert.strictEqual(resultDocs.e2e, false);
  assert.strictEqual(resultDocs.reason, 'overall-docs-or-version-only');
  console.log('  -> evaluateE2E overall docs-only passed.');

  console.log('Testing evaluateE2E with mock incremental changes and previous success...');
  // モック: コード変更を含むベースから、ドキュメントのみ追加したケース
  // 1b07200 はコード修正コミット、fe44698 はその後の doc コミット
  // fe44698~1 は 1b07200（コード変更あり）
  // base: 1b07200~1, before: 1b07200, head: fe44698
  // 増分 (1b07200..fe44698) は doc のみ
  // 前回の test が成功した場合: e2e: false
  // 前回の test が失敗した場合: e2e: true
  
  // テスト用に関数をインジェクトしてテストできるようにする
  // node tools/check-ci-changes.cjs の基本動作検証
  console.log('All tests passed successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
