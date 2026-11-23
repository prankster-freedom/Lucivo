#!/usr/bin/env node
/**
 * カラートーンの ID・通し番号・集計用 ID（analyticsId）の一意性と
 * 廃止済み台帳（retired.json）の非再利用を検査する（FR-063, DD-FILE-095）。
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DEFAULT_TONES_DIR = path.join(ROOT, 'doc', '0.DTP', 'assets', 'color-tones');
const DEFAULT_RETIRED_PATH = path.join(DEFAULT_TONES_DIR, 'retired.json');
const DEFAULT_STATE_PATH = path.join(ROOT, 'src', 'ts', 'ui', 'state.ts');

function formatAnalyticsId(num, id) {
  return `${String(num).padStart(3, '0')}-${id}`;
}

function parseColorTonesFromState(stateSource) {
  const blockMatch = stateSource.match(/export const COLOR_TONES:\s*ColorToneSpec\[\]\s*=\s*\[([\s\S]*?)\n\];/);
  if (!blockMatch) {
    throw new Error('src/ts/ui/state.ts から COLOR_TONES の定義が見つかりません。');
  }
  const entries = [];
  const itemRe = /\{\s*id:\s*'([^']+)',\s*analyticsId:\s*'([^']+)'/g;
  let m;
  while ((m = itemRe.exec(blockMatch[1])) !== null) {
    entries.push({ id: m[1], analyticsId: m[2] });
  }
  if (entries.length === 0) {
    throw new Error('COLOR_TONES からトーン定義を抽出できませんでした。');
  }
  return entries;
}

function loadActiveStockTones(tonesDir) {
  const files = fs.readdirSync(tonesDir)
    .filter(f => /^\d{2,3}-.*\.md$/.test(f) && parseInt(f, 10) > 0)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const stock = [];
  for (const file of files) {
    const num = parseInt(file, 10);
    const content = fs.readFileSync(path.join(tonesDir, file), 'utf8');
    const idMatch = content.match(/^- \*\*ID\*\*:\s*`([^`]+)`/m);
    const id = idMatch ? idMatch[1].trim() : '';
    stock.push({ file, number: num, id, analyticsId: id ? formatAnalyticsId(num, id) : '' });
  }
  return stock;
}

function validateTones(options = {}) {
  const tonesDir = options.tonesDir || DEFAULT_TONES_DIR;
  const retiredPath = options.retiredPath || DEFAULT_RETIRED_PATH;
  const statePath = options.statePath || DEFAULT_STATE_PATH;
  const errors = [];

  const stock = options.stock || loadActiveStockTones(tonesDir);
  const retiredData = options.retiredData || (fs.existsSync(retiredPath) ? JSON.parse(fs.readFileSync(retiredPath, 'utf8')) : { retired: [] });
  const retiredList = Array.isArray(retiredData.retired) ? retiredData.retired : [];
  const productTones = options.productTones || parseColorTonesFromState(fs.readFileSync(statePath, 'utf8'));

  const stockNums = new Map();
  const stockIds = new Map();
  const stockById = new Map();

  for (const entry of stock) {
    if (!entry.id) {
      errors.push(`トーン定義ファイル ${entry.file} に ID（- **ID**: \`...\`）がありません。`);
      continue;
    }
    if (!/^[a-z0-9-]+$/.test(entry.id)) {
      errors.push(`トーン定義ファイル ${entry.file} の ID "${entry.id}" は小文字英数字とハイフンのみにしてください。`);
    }
    if (stockNums.has(entry.number)) {
      errors.push(`通し番号 ${entry.number} が重複しています（${stockNums.get(entry.number)} と ${entry.file}）。`);
    } else {
      stockNums.set(entry.number, entry.file);
    }
    if (stockIds.has(entry.id)) {
      errors.push(`トーン ID "${entry.id}" が重複しています（${stockIds.get(entry.id)} と ${entry.file}）。`);
    } else {
      stockIds.set(entry.id, entry.file);
      stockById.set(entry.id, entry);
    }
  }

  const retiredNums = new Set();
  const retiredIds = new Set();
  const retiredAnalyticsIds = new Set();

  for (const r of retiredList) {
    if (typeof r.number !== 'number' || !r.id || !r.analyticsId) {
      errors.push(`retired.json のエントリが不完全です: ${JSON.stringify(r)}`);
      continue;
    }
    if (retiredNums.has(r.number)) {
      errors.push(`retired.json 内で番号 ${r.number} が重複しています。`);
    }
    if (retiredIds.has(r.id)) {
      errors.push(`retired.json 内で ID "${r.id}" が重複しています。`);
    }
    if (retiredAnalyticsIds.has(r.analyticsId)) {
      errors.push(`retired.json 内で analyticsId "${r.analyticsId}" が重複しています。`);
    }
    retiredNums.add(r.number);
    retiredIds.add(r.id);
    retiredAnalyticsIds.add(r.analyticsId);

    if (stockNums.has(r.number)) {
      errors.push(`廃止済み番号 ${r.number}（${r.analyticsId}）が現役ファイル ${stockNums.get(r.number)} で再利用されています。`);
    }
    if (stockIds.has(r.id)) {
      errors.push(`廃止済み ID "${r.id}" が現役ファイル ${stockIds.get(r.id)} で再利用されています。`);
    }
  }

  const productIds = new Set();
  const productAnalyticsIds = new Set();
  for (const t of productTones) {
    if (productIds.has(t.id)) {
      errors.push(`COLOR_TONES 内で id "${t.id}" が重複しています。`);
    }
    if (productAnalyticsIds.has(t.analyticsId)) {
      errors.push(`COLOR_TONES 内で analyticsId "${t.analyticsId}" が重複しています。`);
    }
    productIds.add(t.id);
    productAnalyticsIds.add(t.analyticsId);

    if (retiredIds.has(t.id) || retiredAnalyticsIds.has(t.analyticsId)) {
      errors.push(`廃止済みトーン（${t.id} / ${t.analyticsId}）が COLOR_TONES に残っています。`);
    }
    if (t.id === 'default') {
      if (t.analyticsId !== '000-default') {
        errors.push(`default トーンの analyticsId は "000-default" である必要があります（実際: "${t.analyticsId}"）。`);
      }
      continue;
    }
    const stockMatch = stockById.get(t.id);
    if (!stockMatch) {
      errors.push(`COLOR_TONES の "${t.id}" が doc/0.DTP/assets/color-tones/ に見つかりません。`);
    } else if (t.analyticsId !== stockMatch.analyticsId) {
      errors.push(`COLOR_TONES の "${t.id}" の analyticsId がストック定義と一致しません（期待: "${stockMatch.analyticsId}", 実際: "${t.analyticsId}"）。`);
    }
  }

  return { errors, stockCount: stock.length, productCount: productTones.length, retiredCount: retiredList.length };
}

if (require.main === module) {
  const result = validateTones();
  if (result.errors.length > 0) {
    console.error('カラートーン ID 検査でエラーが見つかりました:');
    for (const err of result.errors) console.error('  - ' + err);
    process.exit(1);
  }
  console.log(`カラートーン ID 整合性 OK（製品: ${result.productCount} 件, ストック: ${result.stockCount} 件, 廃止予約: ${result.retiredCount} 件）`);
}

module.exports = { formatAnalyticsId, parseColorTonesFromState, loadActiveStockTones, validateTones };
