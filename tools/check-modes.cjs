// 発表モードの登録表（src/ts/modes/modes.json）と、モードのファイルの過不足を検査する（doc/2.ARCHITECTURE.md 4.16 ARC-MODE-009）。
// - 登録表の各行について、ソース・テスト・文書（デザイン仕様を除く）がそろっているか
// - 登録表にない <id> のファイルが、ソース・テスト・各文書の modes/ に残っていないか（廃止のときの消し忘れ）
// - 各 modes/README.md（目次）が、登録されたモードだけを指しているか
// 使い方: node tools/check-modes.cjs（npm run lint から実行する。違反があれば終了コード 1）
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const REGISTRY = path.join(ROOT_DIR, 'src', 'ts', 'modes', 'modes.json');
const STAGES = ['web', 'all'];
const GATE_KEYS = ['start', 'errors', 'narrow', 'esc'];

// 文書の置き場所（ARC-MODE-004 の表）。デザイン仕様（doc/0.DTP/features/modes/<id>.md）は、デザインを伴うモードだけが書くため、そろっているかは調べない
const DOC_DIRS = [
  'doc/1.SRS/features/modes',
  'doc/3.sw_design_notes/features/modes',
  'doc/3.implementation/js/modes',
  'doc/4.test_spec/modes'
];
const OPTIONAL_DOC_DIRS = ['doc/0.DTP/features/modes'];

function exists(rel) {
  return fs.existsSync(path.join(ROOT_DIR, rel));
}

function listDir(rel) {
  const abs = path.join(ROOT_DIR, rel);
  return fs.existsSync(abs) ? fs.readdirSync(abs, { withFileTypes: true }) : [];
}

function checkRegistry(modes, errors) {
  if (!Array.isArray(modes)) {
    errors.push('modes.json は配列でなければならない');
    return false;
  }
  const seen = new Set();
  modes.forEach((mode, i) => {
    const where = `modes.json の ${i + 1} 行目`;
    if (typeof mode.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(mode.id)) errors.push(`${where}: id は英小文字・数字・ハイフンで、英小文字で始める`);
    if (seen.has(mode.id)) errors.push(`${where}: id「${mode.id}」が重複している`);
    seen.add(mode.id);
    if (typeof mode.label !== 'string' || !mode.label) errors.push(`${where}: label がない`);
    if (!STAGES.includes(mode.stage)) errors.push(`${where}: stage は ${STAGES.map(s => `"${s}"`).join(' か ')} でなければならない`);
    Object.entries(mode.gateSkip || {}).forEach(([key, reason]) => {
      if (!GATE_KEYS.includes(key)) errors.push(`${where}: gateSkip の項目「${key}」は ${GATE_KEYS.join('・')} のどれかでなければならない`);
      if (typeof reason !== 'string' || !reason) errors.push(`${where}: gateSkip.${key} に理由を書く`);
    });
  });
  return true;
}

// 登録された各モードのファイルがそろっているか
function checkRegistered(modes, errors) {
  modes.forEach(({ id }) => {
    const required = [
      `src/ts/modes/${id}/index.ts`,
      `src/ts/modes/${id}/style.css`,
      `tests/e2e/modes/${id}.cjs`,
      ...DOC_DIRS.map(dir => `${dir}/${id}.md`)
    ];
    required.filter(rel => !exists(rel)).forEach(rel => errors.push(`モード「${id}」のファイルがない: ${rel}`));
  });
}

// 登録表にない <id> のファイルが残っていないか
function checkOrphans(modes, errors) {
  const ids = new Set(modes.map(m => m.id));
  listDir('src/ts/modes').forEach(entry => {
    if (entry.isDirectory() && !ids.has(entry.name)) errors.push(`登録表にないモードのフォルダが残っている: src/ts/modes/${entry.name}/`);
    if (entry.isFile() && entry.name !== 'modes.json') errors.push(`src/ts/modes/ には modes.json とモードのフォルダしか置かない: ${entry.name}`);
  });
  listDir('tests/e2e/modes').forEach(entry => {
    const id = entry.name.replace(/\.cjs$/, '');
    if (entry.isFile() && !ids.has(id)) errors.push(`登録表にないモードのテストが残っている: tests/e2e/modes/${entry.name}`);
  });
  [...DOC_DIRS, ...OPTIONAL_DOC_DIRS].forEach(dir => {
    listDir(dir).forEach(entry => {
      if (!entry.isFile() || !entry.name.endsWith('.md') || entry.name === 'README.md') return;
      if (!ids.has(entry.name.replace(/\.md$/, ''))) errors.push(`登録表にないモードの文書が残っている: ${dir}/${entry.name}`);
    });
  });
}

// 各 modes/README.md（目次）が、登録されたモードだけを指しているか（廃止のとき、目次の 1 行も消す）
function checkReadmes(modes, errors) {
  const ids = new Set(modes.map(m => m.id));
  DOC_DIRS.forEach(dir => {
    const rel = `${dir}/README.md`;
    if (!exists(rel)) {
      errors.push(`目次がない: ${rel}`);
      return;
    }
    const text = fs.readFileSync(path.join(ROOT_DIR, rel), 'utf8');
    const linked = new Set(Array.from(text.matchAll(/\]\(([a-z0-9-]+)\.md\)/g), m => m[1]));
    ids.forEach(id => { if (!linked.has(id)) errors.push(`目次 ${rel} にモード「${id}」へのリンクがない`); });
    linked.forEach(id => { if (!ids.has(id)) errors.push(`目次 ${rel} が、登録表にないモード「${id}」を指している`); });
  });
}

function main() {
  const errors = [];
  const modes = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  if (checkRegistry(modes, errors)) {
    checkRegistered(modes, errors);
    checkOrphans(modes, errors);
    checkReadmes(modes, errors);
  }
  if (errors.length) {
    console.error(`発表モードの登録表とファイルが食い違っています（${errors.length} 件）:`);
    errors.forEach(e => console.error(`  - ${e}`));
    process.exitCode = 1;
    return;
  }
  console.log(`発表モードの登録表とファイルがそろっています（${modes.length} モード）`);
}

main();
