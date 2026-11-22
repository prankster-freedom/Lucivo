// doc/0.DTP/assets/color-tones/ のカラートーン文書（01〜20）と一覧（README.md）の表を、HTML の表（色の見本つき）に書き直す（#351）。
// 色の元は、各トーン文書の表にある色コードの文字。色を直すときは、その文字を直してから、このスクリプトを実行する
// （style の中の色は、スクリプトが合わせる）。Markdown の表のままの文書も読めるため、何度実行しても同じ結果になる。
const fs = require('fs');
const path = require('path');

const TONES_DIR = path.resolve(__dirname, '..', 'doc', '0.DTP', 'assets', 'color-tones');
const SECTION_HEADING = '## カラーコード一覧';
const TABLE_NOTE = 'セルは、背景色の色コード（上段）と、その上に置く文字色の色コード（下段 `文字`）の組。背景と文字は、この組で使う。「境界・線」と「文字（主）」の行は、その色の 1 つだけを示す。文字色は、「文字（主）」で読めるとき（コントラスト比 4.5 以上）はそれを使い、読めないときは濃紺（`#1E293B`）か白（`#F8FAFC`）の読みやすいほうにする。';
const CHIP_BASE = 'display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 500;';
// 一覧の見本の文字（A〜G）に対応する、トーン文書の表のトークン（上から順）
const LIST_TOKENS = ['--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--diag-canvas', '--vs-card-bg', '--vs-glow'];

// 背景色の上に文字（「文字（主）」）を置いて読めない（コントラスト比が AA の 4.5 未満）ときの、代わりの文字色
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

// 背景色 bg の上に置く文字色。「文字（主）」で読めればそれを使い、読めなければ濃紺か白のうち、読みやすいほうを使う
function pickInk(bg, text) {
  if (contrast(bg, text) >= MIN_CONTRAST) return text;
  return contrast(bg, INK_DARK) >= contrast(bg, INK_LIGHT) ? INK_DARK : INK_LIGHT;
}

const escapeHtml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const cellText = html => html.replace(/<[^>]+>/g, '').replace(/`/g, '').trim();

// Markdown の表の行と、HTML の表の行（<tr>…</tr>）のどちらからも、セルの文字を取り出す
function readTableRows(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('|')) {
      rows.push(line.split('|').slice(1, -1).map(cellText));
    } else if (line.startsWith('<tr>')) {
      rows.push([...line.matchAll(/<t[dh]>(.*?)<\/t[dh]>/g)].map(m => cellText(m[1])));
    }
  }
  return rows;
}

const hexesOf = s => s.match(/#[0-9A-Fa-f]{6}/g) || [];
// 「文字（主）」と「境界・線」の行は、背景に使う色ではないため、背景と文字の組を持たない
const hasInkPair = token => token !== '--text-primary' && token !== '--diag-edge';

// セルの文字は、背景色の色コードと、その上の文字色の色コード（この順）。文字色がないセル（Markdown の表のとき）は、読める色を選ぶ
function readTone(text) {
  const rows = readTableRows(text.slice(text.indexOf(SECTION_HEADING)))
    .filter(cells => cells.length >= 5 && cells[1].startsWith('--'))
    .map(cells => {
      const [light, lightInk] = hexesOf(cells[2]);
      const [dark, darkInk] = hexesOf(cells[3]);
      if (!light || !dark) throw new Error(`${cells[1]} の色コードが読めません`);
      return { role: cells[0], token: cells[1], light, dark, lightInk, darkInk, use: cells[4] };
    });
  const byToken = Object.fromEntries(rows.map(r => [r.token, r]));
  for (const t of ['--diag-canvas', '--text-primary', '--diag-edge']) {
    if (!byToken[t]) throw new Error(`トークン ${t} の行がありません`);
  }
  for (const r of rows) {
    if (!hasInkPair(r.token)) continue;
    r.lightInk = r.lightInk || pickInk(r.light, byToken['--text-primary'].light);
    r.darkInk = r.darkInk || pickInk(r.dark, byToken['--text-primary'].dark);
  }
  return { rows, byToken };
}

// 背景色にその色、文字色にその行の文字色（セルに書いた色コード）、枠線に「境界・線」を使った見本。
// 「文字（主）」と「境界・線」の行は、その色が地色と同じになって見えなくなるため、地色を「ベース背景」にして、その色を文字・枠線に使う
function chip(tone, mode, token, label) {
  const c = t => tone.byToken[t][mode];
  let bg = c(token);
  let fg = tone.byToken[token][`${mode}Ink`] || c('--text-primary');
  let border = `1px solid ${c('--diag-edge')}`;
  if (token === '--text-primary') {
    bg = c('--diag-canvas');
    fg = c(token);
  } else if (token === '--diag-edge') {
    bg = c('--diag-canvas');
    border = `2px solid ${c(token)}`;
  }
  return `<span style="background-color: ${bg}; color: ${fg}; ${CHIP_BASE} border: ${border};">${label}</span>`;
}

// セルの文字: 背景色の色コード、その上の文字色の色コード（この順。文字色のない行は、色コードだけ）
const cellLabel = (r, mode) => (r[`${mode}Ink`] ? `${r[mode]}<br><small>文字 ${r[`${mode}Ink`]}</small>` : r[mode]);

function buildToneTable(tone) {
  const lines = ['<table>', '<thead>', '<tr><th>役割</th><th>トークン例</th><th>Light</th><th>Dark</th><th>用途</th></tr>', '</thead>', '<tbody>'];
  for (const r of tone.rows) {
    lines.push(`<tr><td>${escapeHtml(r.role)}</td><td><code>${r.token}</code></td><td>${chip(tone, 'light', r.token, cellLabel(r, 'light'))}</td><td>${chip(tone, 'dark', r.token, cellLabel(r, 'dark'))}</td><td>${escapeHtml(r.use)}</td></tr>`);
  }
  lines.push('</tbody>', '</table>');
  return lines.join('\n');
}

function buildListTable(entries) {
  const lines = ['<table>', '<thead>', '<tr><th>#</th><th>ID</th><th>イメージ名</th><th>トーン区分</th><th>配色技法</th><th>ファイル</th><th>見本（上段 Light・下段 Dark）</th></tr>', '</thead>', '<tbody>'];
  for (const e of entries) {
    const sample = ['light', 'dark']
      .map(mode => LIST_TOKENS.map((t, i) => chip(e.tone, mode, t, String.fromCharCode(65 + i))).join(' '))
      .join('<br>');
    lines.push(`<tr><td>${e.no}</td><td><code>${e.id}</code></td><td>${escapeHtml(e.name)}</td><td>${escapeHtml(e.toneClass)}</td><td>${escapeHtml(e.technique)}</td><td><a href="${e.file}">${e.file}</a></td><td style="white-space: nowrap;">${sample}</td></tr>`);
  }
  lines.push('</tbody>', '</table>');
  return lines.join('\n');
}

function main() {
  const files = fs.readdirSync(TONES_DIR).filter(f => /^\d{2}-.*\.md$/.test(f)).sort();
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
  const noteAt = readme.indexOf('見本の A〜G');
  const start = noteAt >= 0 ? noteAt : readme.search(/^(\|\s*#|<table>)/m);
  const note = [
    '見本の A〜G は、各トーン文書の「カラーコード一覧」の行に対応する（A〜D: 第 1〜4 色、E: ベース背景、F: 補助面、G: 光彩）。文字色は「文字（主）」、枠線は「境界・線」。',
    '',
    '- この一覧と各トーン文書の表は、`tools/build-color-tone-tables.cjs` が書き出す。色を直すときは、トーン文書の表の色コードの文字を直してから、`node tools/build-color-tone-tables.cjs` を実行する。`style` の中の色は手で直さない。',
    '- 表は HTML で書く。`style` 属性は、Lucivo では表示されるが、GitHub では取り除かれ、色が付かない。'
  ].join('\n');
  fs.writeFileSync(readmePath, `${readme.slice(0, start)}${note}\n\n${buildListTable(entries)}\n`, 'utf8');

  console.log(`Wrote ${files.length} tone documents and the list.`);
}

main();
