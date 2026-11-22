/**
 * tools/update-visual-baseline.cjs
 *
 * Visual モードのレイアウト＆スタイル指紋基準（tests/visual-baseline.json）を更新する（Ref #337）。
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
execSync('node tools/build-app.cjs --prod && node tools/build-app.cjs --prod --channel standalone', {
  cwd: ROOT_DIR,
  stdio: 'inherit'
});
execSync('node tests/e2e.cjs TC-VTPL-041', {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  env: { ...process.env, UPDATE_VISUAL_BASELINE: '1' }
});
