// doc/0.DTP/assets/color-tones/ のカラートーン文書（番号つきの `NN-<ID>.md`。3 桁の番号も読む）と一覧（README.md）の表を、HTML の表（色の見本つき）に書き直す（#351, #355）。
// 色の元は、各トーン文書の表の 1 列目に書いた、行ごとの配色の組（背景・文字・境界・線の色コード）。色を直すときは、
// その色コードを直してから、このスクリプトを実行する（style の中の色は、スクリプトが合わせる）。
// 旧形式の表（「境界・線」「文字（主）」の行がある表、Markdown の表）も読めるため、何度実行しても同じ結果になる。
const fs = require('fs');
const path = require('path');

const TONES_DIR = path.resolve(__dirname, '..', 'doc', '0.DTP', 'assets', 'color-tones');
const SECTION_HEADING = '## カラーコード一覧';
const TABLE_NOTE = [
  '1 列目に、行ごとの配色の組（背景・文字・境界・線の色コード）を、Light と Dark に分けて書く。背景・文字・境界・線は、この組で使う。',
  'Light / Dark の列の見本は、上が「背景に使った場合」（その色の背景の上に、組の文字色）、下が「文字色に使った場合」（ベース背景の上に、その色の文字。基本色の行だけ）。',
  '見本の数字は、背景と文字のコントラスト比で、4.5 未満は、その使い方では文字が読みにくい。見本の枠は「境界」、中の短い線は「線」の色。',
  '基本色は 2〜6 色で、使わない行は「未定義」にする。',
  '元の配色が Light 向きか Dark 向きかが決まっている配色は、向いているほうのモードだけに組を書き、もう一方のモードは「—」にする。'
].join('');
const CHIP_BASE = 'display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 500; white-space: nowrap;';
// 表の行の並び。基本色は 6 行の枠を用意し、使わない行は「未定義」にする
const BASE_TOKENS = ['--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-c5', '--vs-c6'];
const ROW_ORDER = [...BASE_TOKENS, '--diag-canvas', '--vs-card-bg', '--vs-glow'];
const isBase = token => BASE_TOKENS.includes(token);
// 旧形式の表にあった、全行に共通の色の行。新しい形式では、行ごとの組（文字・境界・線）に移す
const OLD_TEXT = '--text-primary';
const OLD_EDGE = '--diag-edge';
const MODES = [['light', 'Light'], ['dark', 'Dark']];

// 背景色の上に文字を置いて読めない（コントラスト比が AA の 4.5 未満）ときの、代わりの文字色
const INK_DARK = '#1E293B';
const INK_LIGHT = '#F8FAFC';
const MIN_CONTRAST = 4.5;

function relLum(hex) {
  const v = parseInt(hex.slice(1), 16);
  const lin = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
}

function contrast(a, b) {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 背景色 bg の上に置く文字色。text で読めればそれを使い、読めなければ濃紺か白のうち、読みやすいほうを使う
function pickInk(bg, text) {
  if (contrast(bg, text) >= MIN_CONTRAST) return text;
  return contrast(bg, INK_DARK) >= contrast(bg, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cellText = html => html.replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').replace(/`/g, '').trim();
const hexesOf = s => s.match(/#[0-9A-Fa-f]{6}/g) || [];
const HEX = '(#[0-9A-Fa-f]{6})';

// Markdown の表の行と、HTML の表の行（<tr>…</tr>）のどちらからも、セルの文字を取り出す
function readTableRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('|')) {
      rows.push(line.split('|').slice(1, -1).map(cellText));
    } else if (line.startsWith('<tr>')) {
      rows.push([...line.matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/g)].map(m => cellText(m[1])));
    }
  }
  return rows;
}

// 1 列目の「Light 背景 #… 文字 #… 境界 #… 線 #…」を読む（区切りの「／」はあってもなくてもよい）。ない（未定義の）ときは null
function readSet(col1, label) {
  const sep = '\\s*(?:／\\s*)?';
  const m = col1.match(new RegExp(`${label}\\s*背景\\s*${HEX}${sep}文字\\s*${HEX}${sep}境界\\s*${HEX}${sep}線\\s*${HEX}`));
  return m ? { bg: m[1], ink: m[2], border: m[3], line: m[4] } : null;
}

function readTone(text) {
  const cellsList = readTableRows(text.slice(text.indexOf(SECTION_HEADING)))
    .filter(cells => cells.length >= 5 && cells[1].startsWith('--'));
  const old = Object.fromEntries(cellsList.filter(c => c[1] === OLD_TEXT || c[1] === OLD_EDGE).map(c => [c[1], c]));
  const isOld = Boolean(old[OLD_TEXT] || old[OLD_EDGE]);
  if (isOld && !(old[OLD_TEXT] && old[OLD_EDGE])) throw new Error('旧形式の表に、「文字（主）」と「境界・線」の行がそろっていません');

  const rows = cellsList.filter(c => c[1] !== OLD_TEXT && c[1] !== OLD_EDGE).map(cells => {
    const row = { token: cells[1], use: cells[4] };
    if (isOld) {
      // 旧形式: セルは「背景色、文字色」の色コード。境界と線は、旧「境界・線」の行の色を、両方に入れる
      row.role = cells[0];
      MODES.forEach(([mode], i) => {
        const [bg, ink] = hexesOf(cells[2 + i]);
        if (!bg) throw new Error(`${cells[1]} の色コードが読めません`);
        const edge = hexesOf(old[OLD_EDGE][2 + i])[0];
        row[mode] = { bg, ink: ink || pickInk(bg, hexesOf(old[OLD_TEXT][2 + i])[0]), border: edge, line: edge };
      });
    } else {
      row.role = cells[0].split(/\s*(?:Light\s*背景|Dark\s*背景|未定義)/)[0].trim();
      MODES.forEach(([mode, label]) => { row[mode] = readSet(cells[0], label); });
    }
    return row;
  });

  // 基本色の 6 行の枠をそろえ、決まった順に並べる
  for (const [i, token] of BASE_TOKENS.entries()) {
    if (!rows.some(r => r.token === token)) rows.push({ token, role: `第 ${i + 1} 色`, use: '—', light: null, dark: null });
  }
  rows.sort((a, b) => ROW_ORDER.indexOf(a.token) - ROW_ORDER.indexOf(b.token));
  const byToken = Object.fromEntries(rows.map(r => [r.token, r]));
  // ベース背景は、Light か Dark の少なくとも一方に組が要る（片方のモードだけの配色もある）
  if (!byToken['--diag-canvas'] || !(byToken['--diag-canvas'].light || byToken['--diag-canvas'].dark)) throw new Error('ベース背景の行がありません');
  return { rows, byToken };
}

// 見本: 背景・文字・境界の色で塗った枠に、文字の見本、コントラスト比、線の色の短い線を入れる
function sample({ bg, fg, border, line }) {
  const ratio = contrast(bg, fg).toFixed(1);
  const stroke = `<span style="display: inline-block; width: 16px; margin-left: 6px; vertical-align: middle; border-top: 2px solid ${line};"></span>`;
  return `<span style="background-color: ${bg}; color: ${fg}; ${CHIP_BASE} border: 1px solid ${border};">Aaあ <small>${ratio}</small>${stroke}</span>`;
}

function sampleCell(tone, row, mode) {
  const s = row[mode];
  if (!s) return '—';
  const asBackground = sample({ bg: s.bg, fg: s.ink, border: s.border, line: s.line });
  if (!isBase(row.token)) return asBackground;
  const canvas = tone.byToken['--diag-canvas'][mode];
  // 上段が背景に使った場合、下段が文字色に使った場合。縦に積んで、列の幅を抑える
  return `${asBackground}<br>${sample({ bg: canvas.bg, fg: s.bg, border: s.border, line: s.line })}`;
}

// 1 列目の配色の組: Light と Dark を、それぞれ 4 行（背景・文字・境界・線）の塊にして並べる。列が狭いときは、塊が縦に積まれる
const SET_BLOCK = 'display: inline-block; vertical-align: top; margin: 4px 12px 0 0; white-space: nowrap;';
const setBlock = (label, s) => `<small style="${SET_BLOCK}">${label}<br>背景 ${s.bg}<br>文字 ${s.ink}<br>境界 ${s.border}<br>線 ${s.line}</small>`;
// 組があるモードだけを並べる。どちらにもないときは「未定義」
const firstCell = row => (row.light || row.dark
  ? `${escapeHtml(row.role)}<br>${row.light ? setBlock('Light', row.light) : ''}${row.dark ? setBlock('Dark', row.dark) : ''}`
  : `${escapeHtml(row.role)}<br><small>未定義</small>`);

function buildToneTable(tone) {
  const lines = ['<table>', '<thead>', '<tr><th>役割と配色の組</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>', '</thead>', '<tbody>'];
  for (const r of tone.rows) {
    lines.push(`<tr><td>${firstCell(r)}</td><td><code>${r.token}</code></td><td>${sampleCell(tone, r, 'light')}</td><td>${sampleCell(tone, r, 'dark')}</td><td>${escapeHtml(r.use)}</td></tr>`);
  }
  lines.push('</tbody>', '</table>');
  return lines.join('\n');
}

// 一覧の見本: 行ごとに、背景に使った場合の色（背景・文字・境界）で塗った 1 文字。A〜F が第 1〜6 色、G〜I がベース背景・補助面・光彩
function letterChip(s, letter) {
  return `<span style="background-color: ${s.bg}; color: ${s.ink}; ${CHIP_BASE} border: 1px solid ${s.border};">${letter}</span>`;
}

function buildListTable(entries) {
  const lines = ['<table>', '<thead>', '<tr><th>#</th><th>ID</th><th>イメージ名</th><th>トーン区分</th><th>配色技法</th><th>基本色</th><th>ファイル</th><th>見本（上段 Light・下段 Dark）</th></tr>', '</thead>', '<tbody>'];
  for (const e of entries) {
    const baseCount = BASE_TOKENS.filter(t => e.tone.byToken[t] && (e.tone.byToken[t].light || e.tone.byToken[t].dark)).length;
    const sampleText = MODES
      .map(([mode]) => ROW_ORDER
        .map((t, i) => (e.tone.byToken[t] && e.tone.byToken[t][mode] ? letterChip(e.tone.byToken[t][mode], String.fromCharCode(65 + i)) : ''))
        .filter(Boolean)
        .join(' '))
      .join('<br>');
    lines.push(`<tr><td>${e.no}</td><td><code>${e.id}</code></td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.toneClass)}</td><td>${escapeHtml(e.technique)}</td><td>${baseCount} 色</td><td><a href="${e.file}">${e.file}</a></td><td style="white-space: nowrap;">${sampleText}</td></tr>`);
  }
  lines.push('</tbody>', '</table>');
  return lines.join('\n');
}

function main() {
  const files = fs.readdirSync(TONES_DIR).filter(f => /^\d{2,3}-.*\.md$/.test(f)).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  const tones = {};
  for (const file of files) {
    const full = path.join(TONES_DIR, file);
    const text = fs.readFileSync(full, 'utf8');
    const idx = text.indexOf(SECTION_HEADING);
    if (idx < 0) throw new Error(`${file}: 「${SECTION_HEADING}」の節がありません`);
    const id = (text.match(/-\s*\*\*ID\*\*:\s*`([^`]+)`/) || [])[1];
    const tone = readTone(text);
    tones[id] = tone;
    // 色コード一覧は文書の最後の節。節の見出しから後ろを、新しい表に置き換える
    fs.writeFileSync(full, `${text.slice(0, idx)}${SECTION_HEADING}\n\n${TABLE_NOTE}\n\n${buildToneTable(tone)}\n`, 'utf8');
  }

  const readmePath = path.join(TONES_DIR, 'README.md');
  const readme = fs.readFileSync(readmePath, 'utf8');
  const entries = readTableRows(readme)
    .filter(cells => /^\d+$/.test(cells[0]))
    .map(cells => ({ no: cells[0], id: cells[1], name: cells[2], toneClass: cells[3], technique: cells[4], file: files.find(f => f.endsWith(`-${cells[1]}.md`)), tone: tones[cells[1]] }));
  if (entries.length !== files.length || entries.some(e => !e.file || !e.tone)) throw new Error('一覧の行と、トーン文書が対応しません');
  // 注記と表は、一覧の最後に書き出す。2 回目からは、前に書いた注記の先頭から後ろを置き換える
  const noteAt = readme.search(/^見本の A〜/m);
  const start = noteAt >= 0 ? noteAt : readme.search(/^(\|\s*#|<table>)/m);
  const note = [
    '見本の A〜I は、各トーン文書の「カラーコード一覧」の行に対応する（A〜F: 第 1〜6 色、G: ベース背景、H: 補助面、I: 光彩。未定義の色は出さない）。見本は、その行の色を背景に使った場合で、文字・枠は、その行の組の文字色・境界の色。',
    '',
    '- この一覧と各トーン文書の表は、`tools/build-color-tone-tables.cjs` が書き出す。色を直すときは、トーン文書の表の 1 列目の色コード（背景・文字・境界・線）を直してから、`node tools/build-color-tone-tables.cjs` を実行する。`style` の中の色は手で直さない。',
    '- 表は HTML で書く。`style` 属性は、Lucivo では表示されるが、GitHub では取り除かれ、色が付かない。'
  ].join('\n');
  fs.writeFileSync(readmePath, `${readme.slice(0, start)}${note}\n\n${buildListTable(entries)}\n`, 'utf8');

  console.log(`Wrote ${files.length} tone documents and the list.`);
}

// 直接実行したときだけ書き出す。単体テスト（tests/build-color-tone-tables.test.cjs）は、読み込んで関数を呼ぶ
if (require.main === module) main();

module.exports = { readTableRows, readTone, buildToneTable, buildListTable };
