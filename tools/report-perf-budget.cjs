/**
 * tools/report-perf-budget.cjs
 *
 * work/test/perf-budget.json を読み込み、性能計測の結果と基準値からの変化を
 * 標準出力および GitHub Actions の Step Summary ($GITHUB_STEP_SUMMARY) に報告する。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const REPORT_PATH = path.join(ROOT_DIR, 'work', 'test', 'perf-budget.json');

const LABELS = {
  fastOpenMs: '高速モード: 開く時間 (ms)',
  visualOpenShapesMs: 'Visual (shapes): 開く時間 (ms)',
  visualOpenCardsMs: 'Visual (cards): 開く時間 (ms)',
  visualOpenCirclesMs: 'Visual (circles): 開く時間 (ms)',
  visualOpenEditorialMs: 'Visual (editorial): 開く時間 (ms)',
  fastInputMs: '高速モード (長文): 1文字入力反映 (ms)',
  visualInputMs: 'Visual (長文・shapes): 1文字入力反映 (ms)',
  fastScrollLongTaskCount: '高速モード (長文): スクロール Long Task 数',
  fastScrollLongTaskMs: '高速モード (長文): スクロール Long Task 合計 (ms)',
  visualScrollLongTaskCount: 'Visual (長文・shapes): スクロール Long Task 数',
  visualScrollLongTaskMs: 'Visual (長文・shapes): スクロール Long Task 合計 (ms)'
};

function formatDelta(delta, pct) {
  if (delta === null || delta === undefined) return '—';
  const sign = delta > 0 ? '+' : '';
  const pctStr = pct !== null && pct !== undefined ? ` (${sign}${pct}%)` : '';
  return `${sign}${delta}${pctStr}`;
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.log('perf-budget.json not found; skipping performance report.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const comparisons = data.comparisons || {};

  const lines = [
    '## Performance Budget Report (#256)',
    '',
    `Measured at: \`${data.measuredAt || 'unknown'}\``,
    '',
    '| 指標 | 今回値 | 基準値 | 変化 |',
    '| :--- | ---: | ---: | ---: |'
  ];

  for (const [key, entry] of Object.entries(comparisons)) {
    const label = LABELS[key] || key;
    const baseStr = entry.baseline !== null && entry.baseline !== undefined ? String(entry.baseline) : '未設定';
    const deltaStr = formatDelta(entry.delta, entry.pct);
    lines.push(`| ${label} | ${entry.current} | ${baseStr} | ${deltaStr} |`);
  }
  lines.push('');

  const markdown = lines.join('\n');
  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');
  }
}

if (require.main === module) {
  main();
}
