// doc/0.DTP/ 内のカラートーン・スタイル配色を「文字色＋背景色」のセット見本 SVG に書き出す（#319）
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TONES_DIR = path.join(ROOT, 'doc', '0.DTP', 'assets', 'color-tones');
const SWATCH_DIR = path.join(TONES_DIR, 'swatches');
const DTP_README = path.join(ROOT, 'doc', '0.DTP', 'README.md');

function relLum(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return 0.5;
  const v = parseInt(m[1], 16);
  const lin = c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
}

function contrastRatio(a, b) {
  const l1 = relLum(a);
  const l2 = relLum(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function pickContrastInk(bgHex) {
  const darkInk = '#0F172A';
  const lightInk = '#FFFFFF';
  return contrastRatio(bgHex, darkInk) >= contrastRatio(bgHex, lightInk) ? darkInk : lightInk;
}

function renderChip(x, y, w, h, bg, fg, stroke, label) {
  const tx = x + w / 2;
  const ty = y + h / 2 + 4;
  const st = stroke ? ` stroke="${stroke}" stroke-width="1"` : ' stroke="rgba(15,23,42,0.14)" stroke-width="1"';
  return [
    `  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${bg}"${st}/>`,
    `  <text x="${tx}" y="${ty}" text-anchor="middle" font-family="'Inter','Noto Sans JP',sans-serif" font-size="11" font-weight="600" fill="${fg}">${label}</text>`
  ].join('\n');
}

function buildStyleSwatchSvg(colors) {
  const w = 74;
  const h = 24;
  const gap = 5;
  const totalW = colors.length * w + (colors.length - 1) * gap + 4;
  const totalH = h + 4;
  const chips = colors.map((bg, i) => renderChip(2 + i * (w + gap), 2, w, h, bg, pickContrastInk(bg), null, 'Abcあいう')).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" role="img" aria-label="配色見本">\n${chips}\n</svg>\n`;
}

function buildToneSwatchSvg(light, dark) {
  const w = 74;
  const h = 24;
  const gap = 5;
  const labelW = 36;
  const pad = 4;
  const cols = 6; // canvas+text, card+text, c1..c4
  const totalW = pad + labelW + cols * w + (cols - 1) * gap + pad;
  const totalH = pad + h * 2 + 6 + pad;

  const drawRow = (y, tag, m) => {
    const items = [
      { bg: m.canvas, fg: m.text, stroke: m.edge },
      { bg: m.card, fg: m.text, stroke: m.edge },
      { bg: m.c1, fg: pickContrastInk(m.c1), stroke: null },
      { bg: m.c2, fg: pickContrastInk(m.c2), stroke: null },
      { bg: m.c3, fg: pickContrastInk(m.c3), stroke: null },
      { bg: m.c4, fg: pickContrastInk(m.c4), stroke: null }
    ];
    const tagText = `  <text x="${pad}" y="${y + h / 2 + 4}" font-family="'JetBrains Mono',monospace" font-size="10" font-weight="600" fill="#64748B">${tag}</text>`;
    const chips = items.map((it, i) => renderChip(pad + labelW + i * (w + gap), y, w, h, it.bg, it.fg, it.stroke, 'Abcあいう')).join('\n');
    return `${tagText}\n${chips}`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}" role="img" aria-label="カラートーン見本（Light / Dark）">\n${drawRow(pad, 'Light', light)}\n${drawRow(pad + h + 6, 'Dark', dark)}\n</svg>\n`;
}

function parseToneMarkdown(md) {
  const light = {};
  const dark = {};
  const mapKey = {
    '--vs-c1': 'c1',
    '--vs-c2': 'c2',
    '--vs-c3': 'c3',
    '--vs-c4': 'c4',
    '--diag-canvas': 'canvas',
    '--vs-card-bg': 'card',
    '--diag-edge': 'edge',
    '--text-primary': 'text'
  };
  for (const line of md.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').map(s => s.trim());
    if (cells.length < 6) continue;
    const token = cells[2].replace(/`/g, '');
    const k = mapKey[token];
    if (!k) continue;
    light[k] = cells[3].replace(/`/g, '');
    dark[k] = cells[4].replace(/`/g, '');
  }
  return { light, dark };
}

function main() {
  fs.mkdirSync(SWATCH_DIR, { recursive: true });

  // 1. DTP-003 スタイル配色 SVG 生成
  const styles = {
    shapes: ['#E29578', '#EBB453', '#6CC4C9', '#9CCB86'],
    cards: ['#E29578', '#E6B34B', '#A3B4E4', '#6DB1B4'],
    circles: ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763'],
    editorial: ['#D68C8C', '#8FA876', '#C9A66B', '#8FA3B8']
  };
  for (const [name, cols] of Object.entries(styles)) {
    fs.writeFileSync(path.join(SWATCH_DIR, `style-${name}.svg`), buildStyleSwatchSvg(cols), 'utf8');
  }

  // 2. color-tones 20 種の SVG 生成 & 個別ファイルへの埋め込み
  const files = fs.readdirSync(TONES_DIR).filter(f => /^\d{2}-.*\.md$/.test(f)).sort();
  const idToFile = {};
  for (const file of files) {
    const full = path.join(TONES_DIR, file);
    let text = fs.readFileSync(full, 'utf8');
    const idMatch = text.match(/-\s*\*\*ID\*\*:\s*`([^`]+)`/);
    const id = idMatch ? idMatch[1] : file.replace(/^\d{2}-|\.md$/g, '');
    idToFile[id] = file;
    const { light, dark } = parseToneMarkdown(text);
    const svgName = `${id}.svg`;
    fs.writeFileSync(path.join(SWATCH_DIR, svgName), buildToneSwatchSvg(light, dark), 'utf8');

    const imgLine = `![${id} の色見本（文字色＋背景色）](swatches/${svgName})`;
    if (!text.includes(`swatches/${svgName}`)) {
      text = text.replace(/(\n## カラーコード一覧\s*\n)/, `$1\n${imgLine}\n`);
      fs.writeFileSync(full, text, 'utf8');
    }
  }

  // 3. color-tones/README.md の一覧表に見本列を追加
  const readmePath = path.join(TONES_DIR, 'README.md');
  const readmeLines = fs.readFileSync(readmePath, 'utf8').split(/\r?\n/);
  const nextReadme = readmeLines.map(line => {
    if (!line.startsWith('|') || line.includes('見本')) return line;
    if (/^\|\s*:-+/.test(line)) return `${line} : :--- |`;
    const m = line.match(/^\|\s*\d+\s*\|\s*`([^`]+)`/);
    if (m && idToFile[m[1]]) {
      return `${line} ![${m[1]}](swatches/${m[1]}.svg) |`;
    }
    if (line.includes('| # ')) return `${line} 見本（文字＋背景） |`;
    return line;
  });
  fs.writeFileSync(readmePath, nextReadme.join('\n'), 'utf8');

  // 4. doc/0.DTP/README.md の DTP-003 配色表に見本列を追加
  let dtpText = fs.readFileSync(DTP_README, 'utf8');
  if (!dtpText.includes('assets/color-tones/swatches/style-shapes.svg')) {
    dtpText = dtpText
      .replace(
        '| スタイル    | `--vs-c1` | `--vs-c2` | `--vs-c3` | `--vs-c4` | 調子の出どころ                               |',
        '| スタイル    | `--vs-c1` | `--vs-c2` | `--vs-c3` | `--vs-c4` | 見本（文字＋背景） | 調子の出どころ |'
      )
      .replace(
        '| :---------- | :-------- | :-------- | :-------- | :-------- | :------------------------------------------- |',
        '| :---------- | :-------- | :-------- | :-------- | :-------- | :----------------- | :------------- |'
      )
      .replace(
        /| `shapes`\s*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|([^\n]*)\|/,
        '| `shapes`    | `#E29578` | `#EBB453` | `#6CC4C9` | `#9CCB86` | ![shapes](assets/color-tones/swatches/style-shapes.svg) | Pastel Shapes のノードのグラデーション（コーラル、アンバー、アクア、ライム） |'
      )
      .replace(
        /| `cards`\s*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|([^\n]*)\|/,
        '| `cards`     | `#E29578` | `#E6B34B` | `#A3B4E4` | `#6DB1B4` | ![cards](assets/color-tones/swatches/style-cards.svg) | 2-Tier Cards の 4 色バー |'
      )
      .replace(
        /| `circles`\s*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|([^\n]*)\|/,
        '| `circles`   | `#D45D53` | `#7EA6BF` | `#ECB674` | `#7D9763` | ![circles](assets/color-tones/swatches/style-circles.svg) | Vibrant Circles の 5 色サークル（先頭 4 色） |'
      )
      .replace(
        /| `editorial`\s*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|[^|\n]*\|([^\n]*)\|/,
        '| `editorial` | `#D68C8C` | `#8FA876` | `#C9A66B` | `#8FA3B8` | ![editorial](assets/color-tones/swatches/style-editorial.svg) | Editorial Cream のダスティローズとセージ |'
      );
    fs.writeFileSync(DTP_README, dtpText, 'utf8');
  }

  console.log(`Generated ${Object.keys(styles).length} style swatches and ${files.length} tone swatches.`);
}

main();
