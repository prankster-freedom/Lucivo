// doc/0.DTP/assets/color-tones/（全 203 種）から、新規サンプル「配色ミュージアム」
// （public/samples/color-museum-sample.md / .en.md）および展示作品の SVG 一式を生成する（#378）。
// 実行: node tools/build-color-museum-sample.cjs
'use strict';

const fs = require('fs');
const path = require('path');
const { buildExhibitJa, buildExhibitEn } = require('./color-museum-exhibit.cjs');

const ROOT = path.resolve(__dirname, '..');
const TONES_DIR = path.join(ROOT, 'doc', '0.DTP', 'assets', 'color-tones');
const IMG_DIR = path.join(ROOT, 'public', 'samples', 'images');
const OUT_JA = path.join(ROOT, 'public', 'samples', 'color-museum-sample.md');
const OUT_EN = path.join(ROOT, 'public', 'samples', 'color-museum-sample.en.md');

const HEX = '(#[0-9A-Fa-f]{6})';

function cellText(html) {
  return html.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function extractEnglishTerm(raw) {
  const m = raw.match(/[（(]([^()（）]+)[)）]/);
  return m ? m[1].trim() : raw;
}

function readSet(plainCol1, label) {
  const sep = '\\s*(?:／\\s*)?';
  const re = new RegExp(`${label}\\s*背景\\s*${HEX}${sep}文字\\s*${HEX}${sep}境界\\s*${HEX}${sep}線\\s*${HEX}`);
  const m = plainCol1.match(re);
  return m ? { bg: m[1].toUpperCase(), ink: m[2].toUpperCase(), border: m[3].toUpperCase(), line: m[4].toUpperCase() } : null;
}

function parseToneFiles() {
  const files = fs.readdirSync(TONES_DIR)
    .filter(f => /^\d{2,3}-.*\.md$/.test(f) && parseInt(f, 10) > 0)
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const tones = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(TONES_DIR, file), 'utf8');
    const titleMatch = text.match(/^#\s+(\d+)\.\s+(.+?)[（(]([^()（）]+)[)）]\s*$/m);
    const idMatch = text.match(/^-\s*\*\*ID\*\*:\s*`([^`]+)`/m);
    const catMatch = text.match(/^-\s*\*\*トーン区分\*\*:\s*(.+)$/m);
    const schemeMatch = text.match(/^-\s*\*\*配色技法\*\*:\s*(.+)$/m);
    const impressionMatch = text.match(/^-\s*\*\*印象・用途\*\*:\s*(.+)$/m);
    if (!titleMatch || !idMatch) continue;

    const num = titleMatch[1].padStart(3, '0');
    const nameJa = titleMatch[2].trim();
    const nameEn = titleMatch[3].trim();
    const id = idMatch[1].trim();
    const catJa = catMatch ? catMatch[1].trim() : '';
    const catEn = extractEnglishTerm(catJa);
    const schemeJa = schemeMatch ? schemeMatch[1].trim().split(/[（(]/)[0].trim() : '';

    const dark = {};
    const light = {};
    const rowMatches = [...text.matchAll(/<tr><td>(.*?)<\/td><td><code>(--[^<]+)<\/code><\/td>/g)];
    for (const m of rowMatches) {
      const plain1 = cellText(m[1]);
      const token = m[2];
      const d = readSet(plain1, 'Dark');
      const l = readSet(plain1, 'Light');
      if (d) dark[token] = d;
      if (l) light[token] = l;
    }

    const impressionJa = impressionMatch ? impressionMatch[1].trim() : '';
    tones.push({ num, id, nameJa, nameEn, catJa, catEn, schemeJa, impressionJa, dark, light });
  }
  return tones;
}

function baseList(modeMap) {
  return ['--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-c5', '--vs-c6']
    .map(k => modeMap[k])
    .filter(Boolean);
}

// 展示用 SVG 2: 全 203 色のモザイク・スペクトル壁画（203 色すべての実色タイル）
function generateSpectrumMuralSvg(tones) {
  const cols = 16;
  const rows = Math.ceil(tones.length / cols);
  const cellW = 54;
  const cellH = 26;
  const padX = 28;
  const padTop = 58;
  const width = padX * 2 + cols * cellW;
  const height = padTop + rows * cellH + 28;

  const tiles = tones.map((t, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const x = padX + col * cellW;
    const y = padTop + row * cellH;
    const mode = Object.keys(t.dark).length ? t.dark : t.light;
    const base = baseList(mode);
    const bg = (mode['--diag-canvas'] || {}).bg || '#121826';
    const border = (mode['--diag-canvas'] || {}).border || '#334155';
    const bars = base.slice(0, 4).map((s, bi) =>
      `<rect x="${x + 4 + bi * 11}" y="${y + 4}" width="9" height="14" rx="2" fill="${s.bg}"/>`
    ).join('');
    return `  <g><rect x="${x + 1}" y="${y + 1}" width="${cellW - 2}" height="${cellH - 4}" rx="4" fill="${bg}" stroke="${border}" stroke-width="1"/>${bars}</g>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="All 203 Color Tones Spectrum Mural">
  <rect width="${width}" height="${height}" rx="18" fill="#090D16" stroke="#334155" stroke-width="2"/>
  <text x="${padX}" y="34" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="16" font-weight="800" letter-spacing="1.2">THE 203 PALETTES — COMPLETE COLOR SPECTRUM MURAL</text>
  <text x="${width - padX}" y="34" text-anchor="end" fill="#94A3B8" font-family="ui-monospace, monospace" font-size="11">001 → ${String(tones.length).padStart(3, '0')} · Dark/Light Paired</text>
${tiles}
</svg>
`;
  fs.writeFileSync(path.join(IMG_DIR, 'color-museum-spectrum.svg'), svg, 'utf8');
}

// 展示用 Mermaid: 選定 20 パターンから代表 6 トーンの実色（背景・文字・枠線・線）をそのまま適用した 3D スタンド図
function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const tones = parseToneFiles();
  const byId = new Map(tones.map(t => [t.id, t]));

  generateSpectrumMuralSvg(tones);

  fs.writeFileSync(OUT_JA, buildExhibitJa(tones, byId, IMG_DIR), 'utf8');
  fs.writeFileSync(OUT_EN, buildExhibitEn(tones, byId, IMG_DIR), 'utf8');

  const sampleDarkCount = tones.filter(t => Object.keys(t.dark).length > 0).length;
  const sampleLightCount = tones.filter(t => Object.keys(t.light).length > 0).length;
  console.log(`tones=${tones.length} (dark=${sampleDarkCount}, light=${sampleLightCount})`);
  console.log(`wrote ${path.relative(ROOT, OUT_JA)} (${fs.statSync(OUT_JA).size} bytes)`);
  console.log(`wrote ${path.relative(ROOT, OUT_EN)} (${fs.statSync(OUT_EN).size} bytes)`);
}

main();
