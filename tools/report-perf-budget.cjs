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

// NFR-006 / NFR-007 判定基準（doc/1.SRS.md 5.1, ARC-PERF-004）
const THRESHOLDS = {
  fastOpenMs: { target: 3000, limit: 5000, pctWarn: 30 },
  visualOpenShapesMs: { target: 3000, limit: 5000, pctWarn: 30 },
  visualOpenCardsMs: { target: 3000, limit: 5000, pctWarn: 30 },
  visualOpenCirclesMs: { target: 3000, limit: 5000, pctWarn: 30 },
  visualOpenEditorialMs: { target: 3000, limit: 5000, pctWarn: 30 },
  fastInputMs: { target: 50, limit: 100 },
  visualInputMs: { target: 150, limit: 250 },
  fastScrollLongTaskCount: { target: 0, limit: 1 },
  fastScrollLongTaskMs: { target: 0, limit: 100 },
  visualScrollLongTaskCount: { target: 0, limit: 1 },
  visualScrollLongTaskMs: { target: 0, limit: 100 }
};

function formatDelta(delta, pct) {
  if (delta === null || delta === undefined) return '—';
  const sign = delta > 0 ? '+' : '';
  const pctStr = pct !== null && pct !== undefined ? ` (${sign}${pct}%)` : '';
  return `${sign}${delta}${pctStr}`;
}

function judgeStatus(key, entry) {
  const th = THRESHOLDS[key];
  if (!th) return { targetStr: '—', status: '—', warn: false };
  const targetStr = `≤ ${th.target} (上限 ${th.limit})`;
  const overLimit = entry.current > th.limit;
  const overPct = typeof th.pctWarn === 'number' && typeof entry.pct === 'number' && entry.pct > th.pctWarn;
  if (overLimit || overPct) {
    const reasons = [];
    if (overLimit) reasons.push(`上限 ${th.limit} 超`);
    if (overPct) reasons.push(`基準比 +${th.pct}%`);
    return { targetStr, status: `WARN (${reasons.join(' / ')})`, warn: true };
  }
  if (entry.current > th.target) {
    return { targetStr, status: '目安超過', warn: false };
  }
  return { targetStr, status: 'OK', warn: false };
}

function main() {
  if (!fs.existsSync(REPORT_PATH)) {
    console.log('perf-budget.json not found; skipping performance report.');
    return;
  }

  const data = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8'));
  const comparisons = data.comparisons || {};

  const lines = [
    '## Performance Budget Report (#256, #277)',
    '',
    `Measured at: \`${data.measuredAt || 'unknown'}\``,
    '',
    '| 指標 | 今回値 | 基準値 | 変化 | 目標 (NFR-006/007) | 判定 |',
    '| :--- | ---: | ---: | ---: | :--- | :--- |'
  ];

  const warnings = [];
  for (const [key, entry] of Object.entries(comparisons)) {
    const label = LABELS[key] || key;
    const baseStr = entry.baseline !== null && entry.baseline !== undefined ? String(entry.baseline) : '未設定';
    const deltaStr = formatDelta(entry.delta, entry.pct);
    const { targetStr, status, warn } = judgeStatus(key, entry);
    if (warn) warnings.push(`${label}: ${entry.current} (${status})`);
    lines.push(`| ${label} | ${entry.current} | ${baseStr} | ${deltaStr} | ${targetStr} | ${status} |`);
  }
  lines.push('');
  if (warnings.length > 0) {
    lines.push('> [!WARNING]');
    lines.push(`> 許容上限または基準比 +30% を超過した指標があります: ${warnings.join('; ')}`);
    lines.push('');
  }

  const markdown = lines.join('\n');
  console.log(markdown);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown + '\n');
  }
}

if (require.main === module) {
  main();
}
