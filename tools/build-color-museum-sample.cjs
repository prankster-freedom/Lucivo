// doc/0.DTP/assets/color-tones/（全 203 種）から、新規サンプル「配色ミュージアム」
// （public/samples/color-museum-sample.md / .en.md）および展示用ベクターアート SVG 一式を生成する（#378）。
// 実行: node tools/build-color-museum-sample.cjs
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TONES_DIR = path.join(ROOT, 'doc', '0.DTP', 'assets', 'color-tones');
const IMG_DIR = path.join(ROOT, 'public', 'samples', 'images');
const OUT_JA = path.join(ROOT, 'public', 'samples', 'color-museum-sample.md');
const OUT_EN = path.join(ROOT, 'public', 'samples', 'color-museum-sample.en.md');

const PRODUCT_GROUPS = [
  {
    key: 'clear',
    ja: '1.1 明快・ビジネス・ポップ',
    en: '1.1 Clear, Business & Pop',
    descJa: '視認性と爽快さを両立した、企画書・技術解説の主軸となる 5 トーン。',
    descEn: 'Five crisp, high-legibility palettes crafted for proposals and technical talks.',
    ids: ['cobalt-workshop', 'morning-window', 'garden-party', 'color-pencils', 'sunflower-harbor'],
    motif: '../assets/motifs/backdrop-sunlight-morning.svg',
    motifJa: '朝の光の背景素材',
    motifEn: 'Morning sunlight backdrop'
  },
  {
    key: 'pale',
    ja: '1.2 ペール・淡色・フェミニン',
    en: '1.2 Pale & Soft Pastels',
    descJa: '柔らかな光と低い彩度で、余白の呼吸を引き立てる 3 トーン。',
    descEn: 'Three airy, low-saturation palettes that let generous whitespace breathe.',
    ids: ['blush-chambray', 'cotton-candy', 'butterfly-sketch'],
    motif: '../assets/motifs/backdrop-light-aurora.svg',
    motifJa: 'オーロラ光の背景素材',
    motifEn: 'Aurora light backdrop'
  },
  {
    key: 'natural',
    ja: '1.3 ナチュラル・和・アース',
    en: '1.3 Natural, Japanese & Earth',
    descJa: '抹茶・土壁・葉脈など自然界の質感に根ざした、落ち着いた 4 トーン。',
    descEn: 'Four grounded palettes inspired by matcha, terracotta, and botanical textures.',
    ids: ['matcha-wagashi', 'plum-mint-dusk', 'terracotta-courtyard', 'banana-leaf'],
    motif: '../assets/motifs/organic-sunlight-komorebi-soft.svg',
    motifJa: '木漏れ日の有機光彩',
    motifEn: 'Soft dappled sunlight motif'
  },
  {
    key: 'cool',
    ja: '1.4 クール・マリン・紫',
    en: '1.4 Cool, Marine & Violet',
    descJa: '霜柱・シーグラス・黄昏の青紫が、静謐な知性を演出する 3 トーン。',
    descEn: 'Three serene palettes spanning Nordic frost, sea glass, and twilight iris.',
    ids: ['nordic-frost', 'sea-glass-shore', 'twilight-iris'],
    motif: '../assets/motifs/backdrop-water-surface.svg',
    motifJa: '水面の背景素材',
    motifEn: 'Water surface backdrop'
  },
  {
    key: 'retro',
    ja: '1.5 レトロ・夕暮れ',
    en: '1.5 Retro & Sunset',
    descJa: '琥珀色の残照と 70 年代クラフトの温もりを宿す 2 トーン。',
    descEn: 'Two warm nostalgic palettes evoking amber dusk and 1970s ceramics.',
    ids: ['amber-sunset', 'seventies-vase'],
    motif: '../assets/motifs/backdrop-flame-ember-glow.svg',
    motifJa: '夕暮れの残照背景',
    motifEn: 'Ember glow backdrop'
  },
  {
    key: 'deep',
    ja: '1.6 重厚・シック・サイバー',
    en: '1.6 Deep, Chic & Cyber',
    descJa: '暗所のステージやミュージアム・ウォークで真価を発揮する重厚な 3 トーン。',
    descEn: 'Three dramatic palettes engineered to shine on dark stages and Museum Walk.',
    ids: ['midnight-library', 'black-blossom', 'cyber-prism'],
    motif: '../assets/motifs/backdrop-frost-veil.svg',
    motifJa: '霜ベールの背景素材',
    motifEn: 'Frost veil backdrop'
  }
];

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
    .filter(f => /^\d{2,3}-.*\.md$/.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  const tones = [];
  for (const file of files) {
    const text = fs.readFileSync(path.join(TONES_DIR, file), 'utf8');
    const titleMatch = text.match(/^#\s+(\d+)\.\s+(.+?)[（(]([^()（）]+)[)）]\s*$/m);
    const idMatch = text.match(/^-\s*\*\*ID\*\*:\s*`([^`]+)`/m);
    const catMatch = text.match(/^-\s*\*\*トーン区分\*\*:\s*(.+)$/m);
    const schemeMatch = text.match(/^-\s*\*\*配色技法\*\*:\s*(.+)$/m);
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

    tones.push({ num, id, nameJa, nameEn, catJa, catEn, schemeJa, dark, light });
  }
  return tones;
}

function baseList(modeMap) {
  return ['--vs-c1', '--vs-c2', '--vs-c3', '--vs-c4', '--vs-c5', '--vs-c6']
    .map(k => modeMap[k])
    .filter(Boolean);
}

// 背景色・文字色・枠線（border）・線（中の短い水平線）の 4 要素を 1 つのスウォッチ帯で表現する
function renderSwatchStrip(modeMap, maxBase = 4) {
  const base = baseList(modeMap).slice(0, maxBase);
  if (base.length === 0) {
    return '<span style="opacity:0.45;font-size:0.82em;">—</span>';
  }
  const canvas = modeMap['--diag-canvas'] || { bg: '#121826', ink: '#E2E8F0', border: '#475569', line: '#64748B' };
  const glow = modeMap['--vs-glow'];

  const chips = base.map((s, idx) =>
    `<span style="background-color:${s.bg};color:${s.ink};border:2px solid ${s.border};display:inline-block;padding:0.14em 0.42em;border-radius:0.3em;font-size:0.78em;font-weight:700;margin-right:0.24em;line-height:1.25;">C${idx + 1}<span style="display:inline-block;width:0.75em;height:0;border-top:2px solid ${s.line};margin-left:0.25em;vertical-align:middle;"></span></span>`
  ).join('');

  const glowChip = glow
    ? `<span style="background-color:${glow.bg};color:${glow.ink};border:2px solid ${glow.border};display:inline-block;padding:0.14em 0.38em;border-radius:999px;font-size:0.74em;font-weight:700;line-height:1.25;">✦</span>`
    : '';

  return `<span style="background-color:${canvas.bg};color:${canvas.ink};border:2px solid ${canvas.border};display:inline-block;padding:0.24em 0.42em;border-radius:0.45em;white-space:nowrap;">${chips}${glowChip}</span>`;
}

// 展示用 SVG 1: 製品版 20 パターンの色彩星図（Color Constellation）
function generateProductWheelSvg(byId) {
  const allIds = PRODUCT_GROUPS.flatMap(g => g.ids);
  const cx = 460;
  const cy = 260;
  const rOuter = 205;
  const rInner = 112;

  const petals = allIds.map((id, i) => {
    const t = byId.get(id);
    if (!t) return '';
    const d = t.dark;
    const base = baseList(d);
    const angle = (i / allIds.length) * Math.PI * 2 - Math.PI / 2;
    const x1 = cx + Math.cos(angle) * rInner;
    const y1 = cy + Math.sin(angle) * rInner;
    const x2 = cx + Math.cos(angle) * rOuter;
    const y2 = cy + Math.sin(angle) * rOuter;
    const c1 = (base[0] || {}).bg || '#38BDF8';
    const c2 = (base[1] || base[0] || {}).bg || '#818CF8';
    const c3 = (base[2] || base[0] || {}).bg || '#34D399';
    const c4 = (base[3] || base[1] || {}).bg || '#FBBF24';
    const lineCol = (d['--diag-canvas'] || {}).line || '#64748B';
    const lx = cx + Math.cos(angle) * (rOuter + 24);
    const ly = cy + Math.sin(angle) * (rOuter + 24);
    const anchor = Math.cos(angle) > 0.25 ? 'start' : Math.cos(angle) < -0.25 ? 'end' : 'middle';

    const p1x = cx + Math.cos(angle) * (rInner + 20);
    const p1y = cy + Math.sin(angle) * (rInner + 20);
    const p2x = cx + Math.cos(angle) * (rInner + 46);
    const p2y = cy + Math.sin(angle) * (rInner + 46);
    const p3x = cx + Math.cos(angle) * (rInner + 72);
    const p3y = cy + Math.sin(angle) * (rInner + 72);

    return `  <g>
    <line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${lineCol}" stroke-width="1.5" stroke-opacity="0.7"/>
    <circle cx="${p1x.toFixed(1)}" cy="${p1y.toFixed(1)}" r="7.5" fill="${c4}" stroke="#0B101B" stroke-width="1.5"/>
    <circle cx="${p2x.toFixed(1)}" cy="${p2y.toFixed(1)}" r="9" fill="${c3}" stroke="#0B101B" stroke-width="1.5"/>
    <circle cx="${p3x.toFixed(1)}" cy="${p3y.toFixed(1)}" r="10.5" fill="${c2}" stroke="#0B101B" stroke-width="1.5"/>
    <circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="12.5" fill="${c1}" stroke="#F8FAFC" stroke-width="1.5"/>
    <text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}" fill="#CBD5E1" font-family="system-ui, sans-serif" font-size="11" font-weight="600">${escapeXml(t.nameEn)}</text>
  </g>`;
  }).join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 920 520" width="920" height="520" role="img" aria-label="20 Curated Color Tones Constellation">
  <defs>
    <radialGradient id="wheelBg" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="#1E293B"/>
      <stop offset="100%" stop-color="#090D16"/>
    </radialGradient>
  </defs>
  <rect width="920" height="520" rx="20" fill="url(#wheelBg)" stroke="#334155" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${rInner}" fill="none" stroke="#334155" stroke-dasharray="4 5" stroke-width="1.2"/>
  <circle cx="${cx}" cy="${cy}" r="${rOuter}" fill="none" stroke="#334155" stroke-opacity="0.6" stroke-width="1"/>
${petals}
  <circle cx="${cx}" cy="${cy}" r="66" fill="#0F172A" stroke="#67E8F9" stroke-width="2" stroke-opacity="0.7"/>
  <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="#F8FAFC" font-family="system-ui, sans-serif" font-size="18" font-weight="800">20 TONES</text>
  <text x="${cx}" y="${cy + 14}" text-anchor="middle" fill="#94A3B8" font-family="system-ui, sans-serif" font-size="11" letter-spacing="1.4">CURATED SPECTRUM</text>
  <text x="${cx}" y="${cy + 32}" text-anchor="middle" fill="#67E8F9" font-family="ui-monospace, monospace" font-size="10">C1 · C2 · C3 · C4</text>
</svg>
`;
  fs.writeFileSync(path.join(IMG_DIR, 'color-museum-wheel.svg'), svg, 'utf8');
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
function buildHeroMermaid(byId, lang) {
  const picks = [
    { id: 'cobalt-workshop', code: 'A', ja: '晴天の工作舎', en: 'Cobalt Workshop' },
    { id: 'cotton-candy', code: 'B', ja: '綿菓子', en: 'Cotton Candy' },
    { id: 'matcha-wagashi', code: 'C', ja: '抹茶と和三盆', en: 'Matcha Wagashi' },
    { id: 'sea-glass-shore', code: 'D', ja: 'シーグラスの浜辺', en: 'Sea Glass Shore' },
    { id: 'amber-sunset', code: 'E', ja: '琥珀の夕暮れ', en: 'Amber Sunset' },
    { id: 'cyber-prism', code: 'F', ja: '分光プリズム', en: 'Cyber Prism' }
  ];
  const rootLabel = lang === 'ja' ? 'Lucivo 配色体系<br/>20 製品トーン / 203 収蔵' : 'Lucivo Color System<br/>20 Product / 203 Archive';
  const lines = ['```mermaid', 'flowchart LR', `  ROOT["${rootLabel}"]`];
  const styles = ['  style ROOT fill:#121826,color:#F3D56B,stroke:#D4AF37,stroke-width:3px'];

  picks.forEach((p, idx) => {
    const t = byId.get(p.id);
    const d = t ? t.dark : {};
    const c1 = d['--vs-c1'] || { bg: '#38BDF8', ink: '#0F172A', border: '#7DD3FC', line: '#94A3B8' };
    const c2 = d['--vs-c2'] || c1;
    const label = lang === 'ja' ? `${p.ja}<br/>${c1.bg} / ${c2.bg}` : `${p.en}<br/>${c1.bg} / ${c2.bg}`;
    lines.push(`  ROOT --> ${p.code}["${label}"]`);
    styles.push(`  style ${p.code} fill:${c1.bg},color:${c1.ink},stroke:${c1.border},stroke-width:2.5px`);
    styles.push(`  linkStyle ${idx} stroke:${c1.line},stroke-width:2.5px`);
  });

  lines.push(...styles, '```');
  return lines.join('\n');
}

function renderProductTable(groupIds, byId, lang) {
  const header = lang === 'ja'
    ? '<tr><th>#</th><th>トーン名 / ID</th><th>Dark 配色（背景・文字・境界・線・光彩）</th><th>Light 配色</th></tr>'
    : '<tr><th>#</th><th>Tone / ID</th><th>Dark Palette (Bg / Ink / Border / Line / Glow)</th><th>Light Palette</th></tr>';
  const rows = groupIds.map(id => {
    const t = byId.get(id);
    if (!t) return '';
    const title = lang === 'ja'
      ? `<strong>${t.nameJa}</strong><br><code>${t.id}</code>`
      : `<strong>${t.nameEn}</strong><br><code>${t.id}</code>`;
    return `<tr><td>${t.num}</td><td>${title}</td><td>${renderSwatchStrip(t.dark, 4)}</td><td>${renderSwatchStrip(t.light, 4)}</td></tr>`;
  }).join('\n');
  return `<table>\n<thead>\n${header}\n</thead>\n<tbody>\n${rows}\n</tbody>\n</table>`;
}

function renderCatalogSection(tones, lang, chunkSize = 12) {
  const parts = [];
  const dividers = [
    '../assets/motifs/hr-prism-divider.svg',
    '../assets/motifs/luminous-orbit.svg',
    '../assets/motifs/hero-prism.svg'
  ];
  for (let i = 0; i < tones.length; i += chunkSize) {
    const idx = Math.floor(i / chunkSize);
    const slice = tones.slice(i, i + chunkSize);
    const startNo = slice[0].num;
    const endNo = slice[slice.length - 1].num;
    const heading = lang === 'ja'
      ? `### 3.${idx + 1} 収蔵コレクション ${startNo}–${endNo}`
      : `### 3.${idx + 1} Archive Collection ${startNo}–${endNo}`;
    const header = lang === 'ja'
      ? '<tr><th>#</th><th>イメージ名 / ID</th><th>区分</th><th>Dark 実色見本</th><th>Light 実色見本</th></tr>'
      : '<tr><th>#</th><th>Tone / ID</th><th>Category</th><th>Dark Swatch</th><th>Light Swatch</th></tr>';
    const rows = slice.map(t => {
      const label = lang === 'ja' ? `<strong>${t.nameJa}</strong> <code>${t.id}</code>` : `<strong>${t.nameEn}</strong> <code>${t.id}</code>`;
      const cat = lang === 'ja' ? t.catJa : t.catEn;
      return `<tr><td>${t.num}</td><td>${label}</td><td>${cat}</td><td>${renderSwatchStrip(t.dark, 4)}</td><td>${renderSwatchStrip(t.light, 4)}</td></tr>`;
    }).join('\n');
    const accent = idx > 0 && idx % 6 === 0
      ? `\n\n![Gallery Ornament](${dividers[(idx / 6) % dividers.length]})`
      : '';
    parts.push(`${heading}\n\n<table>\n<thead>\n${header}\n</thead>\n<tbody>\n${rows}\n</tbody>\n</table>${accent}`);
  }
  return parts.join('\n\n');
}

function buildJa(tones, byId) {
  const productSections = PRODUCT_GROUPS.map(g => [
    `### ${g.ja}`,
    '',
    g.descJa,
    '',
    `![${g.motifJa}](${g.motif})`,
    '',
    renderProductTable(g.ids, byId, 'ja')
  ].join('\n')).join('\n\n');

  return `---
title: 配色ミュージアム — 光と色の回廊
description: Lucivo の厳選 20 カラートーンと全 203 種の収蔵パレットを、Dark の立体回廊で歩いて味わう公式展示サンプル。
tags: ["Lucivo", "配色ミュージアム", "カラートーン", "ミュージアム・ウォーク"]
---

# 配色ミュージアム — 光と色の回廊

色は、言葉より先に文書の空気を決める。Lucivo の厳選 20 パターンと全 ${tones.length} 種のカラートーンを、実色スウォッチ・立体図・ベクター壁画とともに巡る公式展示回廊。

![全 203 色のモザイク・スペクトル壁画](images/color-museum-spectrum.svg)

- **背景（Canvas / Card）**: 展示室の空気と奥行きを決める土台の色
- **文字（Ink）**: コントラスト比 4.5 以上（WCAG AA）を保つ判読の色
- **境界（Border）**: カードやノードの輪郭を静かに引き締める枠の色
- **線・光彩（Line / Glow）**: 図表のつながりと Dark 空間の発光を描く色

> [!NOTE]
> スクロールまたは上下キーで回廊を歩き、ドラッグで見回せます。\`T\` キーで Dark / Light の展示照明を切り替え、\`Esc\` で Visual モードへ戻れます。

## 1. 厳選 20 パターン — 色彩の立体標本

ヘッダーの「カラートーン」メニューから即座に適用できる 20 の製品版トーンを、6 つのムードに分けて展示する。広間の立体スタンドは、各トーンの実際の背景色・文字色・枠線・線の色で組み上げている。

${buildHeroMermaid(byId, 'ja')}

![製品版 20 パターンの色彩星図](images/color-museum-wheel.svg)

${productSections}

## 2. 色の骨格 — 背景・文字・境界・線の調和

1 つのカラートーンは単なる 4 色の羅列ではない。すべての色に対して「背景に使ったときの文字色」「境界の色」「線の色」を組で設計し、Light と Dark の両面で破綻しない配色を保証している。

![カラートーンの 4 層分解図](images/color-museum-anatomy.svg)

> 暗い展示室では「黒に鮮やかな色を置く」だけでは目が疲れる。ベース背景に微かな色相を混ぜ、境界線と光彩の明度を抑えることで、長時間の閲覧でも美しい立体感が生まれる。

## 3. 全 ${tones.length} 色の大回廊

\`doc/0.DTP/assets/color-tones/\` に収蔵されている全 ${tones.length} 種のカラートーンを、12 種ごとのガラス額縁プレートで展示する。各スウォッチの中の短い横線は「線（Line）」の色、外枠は「境界（Border）」の色、丸い \`✦\` は「光彩（Glow）」を表す。

${renderCatalogSection(tones, 'ja', 12)}

## 4. 光と装飾素材のギャラリー

カラートーンに \`public/assets/motifs/\` の光彩・水面・プリズム等のベクター素材を重ねることで、簡易ビューアーを超えた誌面と展示空間が完成する。

| 素材ファイル | 役割 | プレビュー |
| :--- | :--- | :--- |
| \`brand-light-leak.svg\` | 光のにじみ・ブランド背景 | ![Brand Light Leak](../assets/motifs/brand-light-leak.svg) |
| \`hero-prism.svg\` | 表紙プリズム装飾 | ![Hero Prism](../assets/motifs/hero-prism.svg) |
| \`luminous-orbit.svg\` | 軌道・光輪アクセント | ![Luminous Orbit](../assets/motifs/luminous-orbit.svg) |
| \`organic-water-undulation.svg\` | 水面の有機ゆらぎ | ![Water Undulation](../assets/motifs/organic-water-undulation.svg) |
| \`dot-matrix-texture.svg\` | ドットテクスチャ | ![Dot Matrix](../assets/motifs/dot-matrix-texture.svg) |
| \`logo_full.svg\` (Dark) | 公式ブランドロゴ | ![Lucivo Logo Dark](../assets/logos/dark/logo_full.svg) |

## 5. 好きなトーンで開く・共有する

URL パラメータに \`tone\`・\`theme\`・\`present\` を組み合わせれば、好みの配色と演出をそのままリンクで共有できる。

| パラメータ | 指定例 | 効果 |
| :--- | :--- | :--- |
| \`tone\` | \`tone=midnight-library\` | 指定したカラートーンで開く |
| \`theme\` | \`theme=dark\` | Dark 外観で開く |
| \`present\` | \`present=museum-walk\` | 文書を開くと同時にミュージアム・ウォークを起動 |

> [!TIP]
> 気に入ったトーンを見つけたら、アドレスバーの URL をそのまま共有するだけで、同じ世界観を相手に届けられます。
`;
}

function buildEn(tones, byId) {
  const productSections = PRODUCT_GROUPS.map(g => [
    `### ${g.en}`,
    '',
    g.descEn,
    '',
    `![${g.motifEn}](${g.motif})`,
    '',
    renderProductTable(g.ids, byId, 'en')
  ].join('\n')).join('\n\n');

  return `---
title: Color Museum — Gallery of Light & Tone
description: An exhibition gallery showcasing Lucivo's 20 curated product tones and all 203 stock palettes in Dark Museum Walk.
tags: ["Lucivo", "Color Museum", "Color Tones", "Museum Walk"]
---

# Color Museum — Gallery of Light & Tone

Color sets the mood of a document before a single word is read. Walk through Lucivo's 20 curated product tones and the complete archive of ${tones.length} palettes—presented with live swatches, layered 3D stands, and vector murals.

![All 203 Color Tones Spectrum Mural](images/color-museum-spectrum.svg)

- **Background (Canvas / Card)**: Sets the spatial depth and atmosphere of the gallery
- **Ink (Text)**: Guarantees WCAG AA (>= 4.5) legibility across every surface
- **Border**: Defines crisp silhouettes around cards, tables, and diagram nodes
- **Line & Glow**: Connects diagram edges and adds subtle luminescence in Dark mode

> [!NOTE]
> Scroll or press Up/Down to walk through the corridor, drag to look around, press \`T\` to switch Dark/Light gallery lighting, and press \`Esc\` to return to Visual Mode.

## 1. The 20 Curated Product Tones

Twenty signature palettes accessible directly from the header Color Tone menu, organized into six moods. The 3D hall stand below renders each node using its real background, ink, border, and edge-line colors.

${buildHeroMermaid(byId, 'en')}

![20 Curated Color Tones Constellation](images/color-museum-wheel.svg)

${productSections}

## 2. Anatomy of a Color Tone

Every Lucivo tone pairs four coordinated roles—background fill, foreground ink, border stroke, and diagram line—across both Light and Dark appearances so prose and diagrams stay harmonious.

![4-Layer Color Structure](images/color-museum-anatomy.svg)

> In a dark gallery, harsh neon on pure black quickly fatigues the eye. Tinting the canvas gently and tuning border/glow luminance creates depth that remains effortless to read.

## 3. Corridor of All ${tones.length} Palettes

All ${tones.length} palettes archived in \`doc/0.DTP/assets/color-tones/\`, arranged in 12-row gallery plates. Inside each chip, the short horizontal bar shows the **Line** color, the frame shows the **Border**, and \`✦\` marks the **Glow** accent.

${renderCatalogSection(tones, 'en', 12)}

## 4. Motifs, Backdrops & Light Assets

Pairing color tones with vector backdrops and organic light motifs from \`public/assets/motifs/\` elevates standard Markdown into exhibition-grade visuals.

| Asset | Role | Preview |
| :--- | :--- | :--- |
| \`brand-light-leak.svg\` | Ambient light leak backdrop | ![Brand Light Leak](../assets/motifs/brand-light-leak.svg) |
| \`hero-prism.svg\` | Cover prism ornament | ![Hero Prism](../assets/motifs/hero-prism.svg) |
| \`luminous-orbit.svg\` | Orbital glow accent | ![Luminous Orbit](../assets/motifs/luminous-orbit.svg) |
| \`organic-water-undulation.svg\` | Organic water wave | ![Water Undulation](../assets/motifs/organic-water-undulation.svg) |
| \`dot-matrix-texture.svg\` | Subtle dot-matrix texture | ![Dot Matrix](../assets/motifs/dot-matrix-texture.svg) |
| \`logo_full.svg\` (Dark) | Official Dark Brand Logo | ![Lucivo Logo Dark](../assets/logos/dark/logo_full.svg) |

## 5. Open & Share Any Palette via URL

Combine \`tone\`, \`theme\`, and \`present\` in the URL to share an exact exhibition atmosphere in one click.

| Parameter | Example | Effect |
| :--- | :--- | :--- |
| \`tone\` | \`tone=midnight-library\` | Applies the selected color tone |
| \`theme\` | \`theme=dark\` | Launches in Dark appearance |
| \`present\` | \`present=museum-walk\` | Starts Museum Walk automatically on load |

> [!TIP]
> Found a palette you love? Copy the address bar URL to share the exact visual mood with anyone.
`;
}

function main() {
  fs.mkdirSync(IMG_DIR, { recursive: true });
  const tones = parseToneFiles();
  const byId = new Map(tones.map(t => [t.id, t]));

  generateProductWheelSvg(byId);
  generateSpectrumMuralSvg(tones);

  fs.writeFileSync(OUT_JA, buildJa(tones, byId), 'utf8');
  fs.writeFileSync(OUT_EN, buildEn(tones, byId), 'utf8');

  const sampleDarkCount = tones.filter(t => Object.keys(t.dark).length > 0).length;
  const sampleLightCount = tones.filter(t => Object.keys(t.light).length > 0).length;
  console.log(`tones=${tones.length} (dark=${sampleDarkCount}, light=${sampleLightCount})`);
  console.log(`wrote ${path.relative(ROOT, OUT_JA)} (${fs.statSync(OUT_JA).size} bytes)`);
  console.log(`wrote ${path.relative(ROOT, OUT_EN)} (${fs.statSync(OUT_EN).size} bytes)`);
}

main();
