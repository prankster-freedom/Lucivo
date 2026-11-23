// 「配色ミュージアム」の展示作品（SVG）を書き出す（tools/color-museum-exhibit.cjs から呼ぶ）。
// 作品は、トーン文書（doc/0.DTP/assets/color-tones/）の実際の色コードだけで描く。
// 壁の CSS ではなく画像にすることで、グラデーション・ぼかし・粒子・曲線を使え、
// Visualモードとミュージアム・ウォークの壁で同じ見え方になる。
// 乱数は種から決まる擬似乱数を使い、何度生成しても同じ絵になるようにする。
'use strict';

const fs = require('fs');
const path = require('path');

const SERIF = "'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP',serif";
const SANS = "'Yu Gothic','Hiragino Sans','Noto Sans JP',sans-serif";
const MONO = "Consolas,'JetBrains Mono',ui-monospace,monospace";

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// トーンの色の組（bg / ink / border / line）を取り出す。未定義のときは近い役割で代える
function palette(t, mode = 'dark') {
  const m = t[mode];
  const pick = (...keys) => keys.map(k => m[k]).find(Boolean);
  return {
    canvas: pick('--diag-canvas'),
    card: pick('--vs-card-bg', '--diag-canvas'),
    c1: pick('--vs-c1'),
    c2: pick('--vs-c2', '--vs-c1'),
    c3: pick('--vs-c3', '--vs-c2', '--vs-c1'),
    c4: pick('--vs-c4', '--vs-c3', '--vs-c1'),
    glow: pick('--vs-glow', '--vs-c2')
  };
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = n => Number(n.toFixed(1));

// 紙の粒子（ノイズ）と、光のにじみ（ぼかし）
const COMMON_DEFS = `
    <filter id="grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 .09"/></feComponentTransfer></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
    <filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="3.5"/></filter>
    <filter id="shadow" x="-10%" y="-10%" width="130%" height="140%"><feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity=".55"/></filter>`;

// 動きの演出。画像（<img>）の中の SVG でも CSS アニメーションは動く。動きを減らす設定のときは止める
const MOTION_CSS = `
    .fall { animation: fall linear infinite; }
    .twinkle { animation: twinkle 3.2s ease-in-out infinite; }
    .breathe { animation: breathe 5s ease-in-out infinite; }
    .flicker { animation: flicker 4.5s ease-in-out infinite; }
    .rise { animation: rise 4s ease-out infinite; }
    .scroll { animation: scroll 1.6s linear infinite; }
    .glitch { animation: glitch 3.6s steps(1) infinite; }
    .spin { transform-box: fill-box; transform-origin: center; animation: spin 40s linear infinite; }
    .drift { animation: drift 9s ease-in-out infinite alternate; }
    @keyframes fall { from { transform: translate(-30px, -720px); } to { transform: translate(60px, 720px); } }
    @keyframes twinkle { 0%, 100% { opacity: .2; } 50% { opacity: 1; } }
    @keyframes breathe { 0%, 100% { opacity: .3; } 50% { opacity: .75; } }
    @keyframes flicker { 0%, 100% { opacity: 1; } 42% { opacity: .82; } 46% { opacity: .95; } 70% { opacity: .88; } }
    @keyframes rise { 0% { transform: translateY(30px); opacity: 0; } 35% { opacity: .35; } 100% { transform: translateY(-70px); opacity: 0; } }
    @keyframes scroll { from { transform: translateY(-30px); } to { transform: translateY(0); } }
    @keyframes glitch { 0% { opacity: 0; } 88% { opacity: .9; } 92% { opacity: 0; } 95% { opacity: .7; } 97% { opacity: 0; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes drift { from { transform: translateX(-40px); } to { transform: translateX(40px); } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }`;

// 舞い落ちるもの（花びら・葉・雪）を、時間をずらして降らせる
function falling(r, shapes) {
  return shapes.map(s => `<g class="fall" style="animation-duration:${f1(9 + r() * 9)}s;animation-delay:-${f1(r() * 18)}s">${s}</g>`).join('');
}

function svgDoc(w, h, label, defs, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(label)}">
  <style>${MOTION_CSS}
  </style>
  <defs>${COMMON_DEFS}${defs}
  </defs>
${body}
  <rect width="${w}" height="${h}" filter="url(#grain)"/>
</svg>
`;
}

// 稜線（なめらかな山並み）。いくつかの正弦波を重ねて、種ごとに違う形にする
function ridgePath(seed, w, h, baseY, amp) {
  const r = rng(seed);
  const waves = [0, 1, 2].map(() => ({ f: 0.002 + r() * 0.006, p: r() * Math.PI * 2, a: 0.4 + r() * 0.6 }));
  const pts = [];
  for (let x = 0; x <= w; x += 12) {
    const y = baseY - amp * waves.reduce((s, v) => s + v.a * Math.sin(x * v.f * Math.PI * 2 / 4 + v.p), 0) / 2;
    pts.push(`${x},${f1(y)}`);
  }
  return `M0,${h} L${pts.join(' L')} L${w},${h} Z`;
}

// ── ポスター（同じ型紙に、トーンごとの絵を入れる）──────────────────
const POSTER_ART = {
  // 書架と、アーチ窓の灯り
  library(p) {
    const r = rng(7);
    let x = 760;
    let books = '';
    const fills = [p.c1.bg, p.c2.bg, p.c3.bg, p.c4.bg];
    while (x < 1130) {
      const bw = 22 + Math.floor(r() * 22);
      const bh = 120 + Math.floor(r() * 120);
      const lean = r() < 0.12 ? ` transform="rotate(-8 ${x + bw} 720)"` : '';
      books += `<rect x="${x}" y="${720 - bh}" width="${bw}" height="${bh}" rx="3" fill="${fills[Math.floor(r() * 4)]}"${lean}/><rect x="${x + 4}" y="${720 - bh + 18}" width="${bw - 8}" height="4" fill="${p.canvas.bg}" opacity=".35"${lean}/>`;
      x += bw + 4;
    }
    return `
  <path d="M770,720 V360 A180,180 0 0 1 1130,360 V720 Z" fill="${p.c4.bg}" opacity=".28"/>
  <path d="M770,720 V360 A180,180 0 0 1 1130,360 V720 Z" fill="none" stroke="${p.c2.bg}" stroke-width="3" opacity=".7"/>
  <line x1="950" y1="180" x2="950" y2="720" stroke="${p.c2.bg}" stroke-width="2" opacity=".35"/>
  <circle class="breathe" cx="950" cy="330" r="150" fill="${p.glow.bg}" opacity=".35" filter="url(#haze)"/>
  <circle class="flicker" cx="950" cy="330" r="30" fill="${p.glow.bg}"/>
  ${books}
  <rect x="740" y="720" width="420" height="10" rx="3" fill="${p.c2.bg}"/>`;
  },
  // バウハウス風の幾何学（円・三角・四角・ジグザグ）
  bauhaus(p) {
    const r = rng(11);
    let dots = '';
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) dots += `<circle class="twinkle" style="animation-delay:-${f1(r() * 3)}s" cx="${1010 + i * 24}" cy="${560 + j * 24}" r="5" fill="${p.c4.bg}" opacity="${f1(0.4 + r() * 0.6)}"/>`;
    return `
  <circle cx="880" cy="360" r="200" fill="${p.c1.bg}"/>
  <polygon points="720,720 960,400 1180,720" fill="${p.c2.bg}" style="mix-blend-mode:multiply"/>
  <rect class="spin" x="1000" y="140" width="140" height="140" fill="${p.c3.bg}"/>
  <polyline points="700,180 740,140 780,180 820,140 860,180 900,140" fill="none" stroke="${p.c4.bg}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>
  ${dots}`;
  },
  // 円相と茶碗、立ちのぼる湯気
  tea(p) {
    return `
  <circle cx="930" cy="400" r="215" fill="none" stroke="${p.c2.bg}" stroke-width="40" stroke-linecap="round" stroke-dasharray="1150 200" transform="rotate(-70 930 400)" opacity=".9"/>
  <circle cx="936" cy="394" r="205" fill="none" stroke="${p.c2.bg}" stroke-width="8" stroke-linecap="round" stroke-dasharray="900 400" transform="rotate(-40 936 394)" opacity=".45"/>
  <path d="M790,480 H1070 C1060,620 990,670 930,670 C870,670 800,620 790,480 Z" fill="${p.c1.bg}"/>
  <path d="M790,480 H1070 C1066,520 1050,555 1030,580 C980,560 880,560 830,580 C810,555 794,520 790,480 Z" fill="${p.c3.bg}" opacity=".35"/>
  <ellipse cx="930" cy="480" rx="140" ry="20" fill="${p.c3.bg}"/>
  <ellipse cx="930" cy="482" rx="124" ry="14" fill="${p.c1.bg}" opacity=".9"/>
  ${['M890,440 C870,400 910,380 890,330', 'M935,440 C915,390 955,370 935,300', 'M980,440 C960,405 1000,385 980,340'].map((d, i) => `<path class="rise" style="animation-delay:-${i * 1.3}s" d="${d}" fill="none" stroke="${p.canvas.ink}" stroke-width="5" stroke-linecap="round"/>`).join('')}
  <circle cx="1105" cy="640" r="30" fill="${p.c2.bg}"/><circle cx="1105" cy="640" r="30" fill="${p.glow.bg}" opacity=".25"/>`;
  },
  // 地平線の太陽と、透視の格子（シンセウェーブ）
  grid(p) {
    const r = rng(23);
    let lines = '';
    for (let x = 520; x <= 1340; x += 64) lines += `<line x1="930" y1="560" x2="${x}" y2="820" stroke="${p.c1.bg}" stroke-width="2" opacity=".7"/>`;
    let rows = '';
    [566, 580, 598, 622, 654, 696, 750, 820].forEach(y => { rows += `<line x1="620" y1="${y}" x2="1180" y2="${y}" stroke="${p.c1.bg}" stroke-width="2" opacity=".7"/>`; });
    lines += `<clipPath id="floorClip"><rect x="620" y="562" width="560" height="240"/></clipPath><g clip-path="url(#floorClip)"><g class="scroll">${rows}</g></g>`;
    let glitch = '';
    for (let i = 0; i < 9; i++) glitch += `<rect class="glitch" style="animation-delay:-${f1(r() * 3.6)}s" x="${f1(660 + r() * 480)}" y="${f1(150 + r() * 360)}" width="${f1(20 + r() * 90)}" height="${f1(3 + r() * 6)}" fill="${r() < 0.5 ? p.c1.bg : p.c2.bg}"/>`;
    return `
  <clipPath id="gridClip"><rect x="620" y="100" width="560" height="690"/></clipPath>
  <g clip-path="url(#gridClip)" mask="url(#gridFade)">
    <circle class="breathe" cx="930" cy="440" r="240" fill="${p.c2.bg}" opacity=".35" filter="url(#haze)"/>
    <circle cx="930" cy="430" r="170" fill="url(#sunGrad)" mask="url(#sunMask)"/>
    <rect x="620" y="560" width="560" height="240" fill="${p.canvas.bg}" opacity=".85"/>
    ${lines}
    ${glitch}
  </g>`;
  }
};

const POSTER_DEFS = {
  grid: p => `
    <linearGradient id="fadeG" x1="620" y1="0" x2="1180" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#000"/><stop offset=".22" stop-color="#fff"/><stop offset=".9" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>
    <mask id="gridFade"><rect x="620" y="100" width="560" height="700" fill="url(#fadeG)"/></mask>
    <linearGradient id="sunGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.glow.bg}"/><stop offset="1" stop-color="${p.c2.bg}"/></linearGradient>
    <mask id="sunMask"><rect x="700" y="240" width="460" height="400" fill="#fff"/>${[470, 500, 526, 548].map((y, i) => `<rect x="700" y="${y}" width="460" height="${4 + i * 3}" fill="#000"/>`).join('')}</mask>`
};

function posterSvg(t, mode, w) {
  const p = palette(t, mode);
  const W = 1200;
  const H = 820;
  const chips = w.tags.map((tag, i) => {
    const c = [p.c3, p.c4, p.c1][i % 3];
    const cw = 40 + [...tag].reduce((s, ch) => s + (/[ -~]/.test(ch) ? 15 : 26), 0);
    return { c, cw, tag };
  });
  let cx = 80;
  const chipSvg = chips.map(({ c, cw, tag }) => {
    const s = `<rect x="${cx}" y="548" width="${cw}" height="46" rx="23" fill="${c.bg}" stroke="${c.border}" stroke-width="2"/><text x="${cx + cw / 2}" y="579" text-anchor="middle" font-family="${SANS}" font-size="24" font-weight="700" fill="${c.ink}">${esc(tag)}</text>`;
    cx += cw + 14;
    return s;
  }).join('');
  const defs = `
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p.canvas.bg}"/><stop offset="1" stop-color="${p.card.bg}"/></linearGradient>${(POSTER_DEFS[w.art] || (() => ''))(p)}`;
  const body = `  <rect width="${W}" height="${H}" fill="url(#paper)"/>
  <circle cx="1120" cy="60" r="260" fill="${p.glow.bg}" opacity=".18" filter="url(#haze)"/>
${POSTER_ART[w.art](p)}
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="10" fill="none" stroke="${p.canvas.border}" stroke-width="2" opacity=".7"/>
  <text x="80" y="130" font-family="${MONO}" font-size="22" letter-spacing="8" fill="${p.c2.bg}">${esc(w.kicker)}</text>
  <text x="76" y="262" font-family="${SERIF}" font-size="${w.titleSize || 104}" font-weight="700" letter-spacing="4" fill="${p.canvas.ink}">${esc(w.title)}</text>
  <text x="80" y="330" font-family="${SANS}" font-size="30" fill="${p.canvas.ink}" opacity=".85">${esc(w.sub)}</text>
  ${chipSvg}
  <rect x="80" y="650" width="336" height="12" fill="${p.c1.bg}"/><rect x="416" y="650" width="96" height="12" fill="${p.c2.bg}"/><rect x="512" y="650" width="48" height="12" fill="${p.glow.bg}"/>
  <text x="80" y="720" font-family="${MONO}" font-size="30" letter-spacing="4" fill="${p.glow.bg}">${esc(w.date)}</text>`;
  return svgDoc(W, H, w.alt || `${w.title} のポスター（${t.nameJa}）`, defs, body);
}

// ── 四季の風景（空・太陽か月・三重の稜線・霞・季節の前景）────────────
function seasonSvg(t, s) {
  const p = palette(t, s.mode);
  const W = 1200;
  const H = 680;
  const r = rng(s.seed);
  const sunX = W * s.sunX / 100;
  const sunY = H * s.sunY / 100;
  let fg = '';
  if (s.motif === 'petals') {
    const petals = [];
    for (let i = 0; i < 46; i++) {
      const x = r() * W;
      const y = r() * H;
      petals.push(`<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(6 + r() * 6)}" ry="${f1(3 + r() * 3)}" fill="${r() < 0.6 ? p.c1.bg : p.glow.bg}" opacity="${f1(0.55 + r() * 0.4)}" transform="rotate(${Math.floor(r() * 180)} ${f1(x)} ${f1(y)})"/>`);
    }
    fg += falling(r, petals);
  } else if (s.motif === 'sea') {
    fg += `<rect y="560" width="${W}" height="120" fill="url(#seaGrad)"/>`;
    for (let i = 0; i < 70; i++) {
      const y = 570 + r() * 105;
      const x = r() * W;
      const near = Math.abs(x - sunX) < 90;
      fg += `<line class="twinkle" style="animation-delay:-${f1(r() * 3.2)}s" x1="${f1(x)}" y1="${f1(y)}" x2="${f1(x + 20 + r() * 50)}" y2="${f1(y)}" stroke="${near ? p.glow.bg : p.canvas.bg}" stroke-width="${f1(1.5 + r() * 2)}" opacity="${near ? 0.95 : 0.55}" stroke-linecap="round"/>`;
    }
  } else if (s.motif === 'leaves') {
    const leaves = [];
    for (let i = 0; i < 34; i++) {
      const x = r() * W;
      const y = r() * H;
      const c = [p.c1.bg, p.c2.bg, p.glow.bg][Math.floor(r() * 3)];
      leaves.push(`<path d="M${f1(x)},${f1(y)} q10,-14 22,0 q-10,14 -22,0 Z" fill="${c}" opacity="${f1(0.7 + r() * 0.3)}" transform="rotate(${Math.floor(r() * 360)} ${f1(x + 11)} ${f1(y)})"/>`);
    }
    fg += falling(r, leaves);
  } else if (s.motif === 'snow') {
    for (let i = 0; i < 70; i++) fg += `<circle class="twinkle" style="animation-delay:-${f1(r() * 3.2)}s" cx="${f1(r() * W)}" cy="${f1(r() * 300)}" r="${f1(0.8 + r() * 1.6)}" fill="#FFFFFF"/>`;
    const flakes = [];
    for (let i = 0; i < 60; i++) flakes.push(`<circle cx="${f1(r() * W)}" cy="${f1(r() * H)}" r="${f1(2 + r() * 3)}" fill="#FFFFFF" opacity="${f1(0.35 + r() * 0.4)}"/>`);
    fg += falling(r, flakes);
  }
  const orb = s.moon
    // 三日月: 外側の大きな弧で左へふくらませ、内側は半径の大きい浅い弧で戻る
    ? `<circle class="breathe" cx="${sunX}" cy="${sunY}" r="120" fill="${p.glow.bg}" opacity=".35" filter="url(#haze)"/><circle cx="${sunX}" cy="${sunY}" r="44" fill="${p.glow.bg}" opacity=".12"/><path d="M${sunX + 8},${sunY - 44} A44,44 0 1 0 ${sunX + 8},${sunY + 44} A62,62 0 0 1 ${sunX + 8},${sunY - 44} Z" fill="${p.glow.bg}"/>`
    : `<circle class="breathe" cx="${sunX}" cy="${sunY}" r="160" fill="${p.glow.bg}" opacity=".45" filter="url(#haze)"/><circle cx="${sunX}" cy="${sunY}" r="54" fill="${p.glow.bg}"/>`;
  const defs = `
    <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.card.bg}"/><stop offset=".62" stop-color="${p.canvas.bg}"/><stop offset="1" stop-color="${p.c1.bg}"/></linearGradient>
    <linearGradient id="seaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.glow.bg}"/><stop offset="1" stop-color="${p.c1.bg}"/></linearGradient>`;
  const body = `  <rect width="${W}" height="${H}" fill="url(#skyG)"/>
  ${orb}
  <path d="${ridgePath(s.seed + 1, W, H, 380, 90)}" fill="${p.c4.bg}" opacity=".5"/>
  <rect class="drift" x="-100" y="390" width="${W + 200}" height="70" fill="${p.canvas.bg}" opacity=".5" filter="url(#soft)"/>
  <path d="${ridgePath(s.seed + 2, W, H, 460, 70)}" fill="${p.c2.bg}" opacity=".78"/>
  <path d="${ridgePath(s.seed + 3, W, H, s.motif === 'sea' ? 560 : 545, 50)}" fill="${p.c1.bg}"/>
  ${fg}
  <text x="56" y="176" font-family="${SERIF}" font-size="${s.glyphSize || 150}" font-weight="700" fill="${p.canvas.ink}" opacity=".92">${esc(s.glyph)}</text>
  <text x="${W - 56}" y="80" text-anchor="end" font-family="${MONO}" font-size="22" letter-spacing="6" fill="${p.canvas.ink}" opacity=".8">${esc(s.tag)}</text>
  <rect x="18" y="18" width="${W - 36}" height="${H - 36}" fill="none" stroke="${p.canvas.ink}" stroke-width="2" opacity=".25"/>`;
  return svgDoc(W, H, s.alt || `${s.glyph}の風景（${t.nameJa}）`, defs, body);
}

// ── 比率の模型（色面の絵画 2 点。同じ 3 色で、面積の比率だけを変える）────────
function ratioSvg(t, text = {}) {
  const p = palette(t, 'dark');
  const W = 1400;
  const H = 700;
  const cw = 520;
  const ch = 440;
  const field = (x, bands) => {
    let y = 70 + 24;
    const inner = bands.map(([ratio, c]) => {
      const h = (ch - 48 - (bands.length - 1) * 14) * ratio;
      const s = `<rect x="${x + 24}" y="${f1(y)}" width="${cw - 48}" height="${f1(h)}" rx="6" fill="${c}" filter="url(#edge)"/>`;
      y += h + 14;
      return s;
    }).join('');
    return `<g filter="url(#shadow)"><rect x="${x}" y="70" width="${cw}" height="${ch}" fill="${p.canvas.bg}"/></g>
  <rect x="${x}" y="70" width="${cw}" height="${ch}" fill="${p.card.bg}" opacity=".35"/>
  ${inner}`;
  };
  const ax = 140;
  const bx = W - 140 - cw;
  const body = `  <rect width="${W}" height="${H}" fill="url(#wall2)"/>
  <ellipse cx="${ax + cw / 2}" cy="40" rx="300" ry="80" fill="#FFF4DE" opacity=".08" filter="url(#haze)"/>
  <ellipse cx="${bx + cw / 2}" cy="40" rx="300" ry="80" fill="#FFF4DE" opacity=".08" filter="url(#haze)"/>
  ${field(ax, [[0.62, p.canvas.bg], [0.3, p.c1.bg], [0.08, p.glow.bg]])}
  ${field(bx, [[0.34, p.card.bg], [0.33, p.c1.bg], [0.33, p.glow.bg]])}
  <text x="${ax}" y="570" font-family="${MONO}" font-size="26" letter-spacing="6" fill="#D9D4C7">A — 70 : 25 : 5</text>
  <text x="${ax}" y="608" font-family="${SANS}" font-size="22" fill="#9A968C">${esc(text.a || "目の止まる場所が 1 か所に決まる")}</text>
  <text x="${bx}" y="570" font-family="${MONO}" font-size="26" letter-spacing="6" fill="#D9D4C7">B — 34 : 33 : 33</text>
  <text x="${bx}" y="608" font-family="${SANS}" font-size="22" fill="#9A968C">${esc(text.b || "3 色が同じ強さで主張し合う")}</text>`;
  const defs = `
    <linearGradient id="wall2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1D2029"/><stop offset="1" stop-color="#111319"/></linearGradient>`;
  return svgDoc(W, H, text.alt || `比率の模型（${t.nameJa}）`, defs, body);
}

function writeArt(dir, name, svg) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), svg, 'utf8');
  return name;
}

module.exports = { palette, posterSvg, seasonSvg, ratioSvg, writeArt };
