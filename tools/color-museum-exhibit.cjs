// 「配色ミュージアム」日本語版の展示本文を組み立てる（tools/build-color-museum-sample.cjs から呼ぶ）。
// 配色を表で並べるのではなく、カラートーンを「使った作品」（ポスター・窓・風景・色面・図）として見せる。
// 作品はすべて、トーン文書（doc/0.DTP/assets/color-tones/）の実際の色コードから作る。
// 作品の素材は使い分ける。描き込みと動きが要るもの（ポスター・四季の風景・色面・表紙）は SVG に書き出し
// （tools/color-museum-art.cjs）、単純な形で足りるもの（六つの窓）は段落の中の <span> を CSS で組む。
// ミュージアム・ウォークは段落の中身（innerHTML）を壁に写すため、<p> 自身の属性は使えない。
// CSS の作品は大きさを em で書き、Visualモード（本文 17px 前後）と壁（68px）で同じ比率に見えるようにする。
'use strict';

const fs = require('fs');
const path = require('path');
const { palette, posterSvg, seasonSvg, ratioSvg, writeArt } = require('./color-museum-art.cjs');

const MONO = "'JetBrains Mono',ui-monospace,Consolas,monospace";
const ART_DIR = 'color-museum';
// 全角の空白（見出しとラベルの区切り）。lint の不可視文字の検査に掛からないよう、文字コードから作る
const WIDE_SPACE = String.fromCharCode(0x3000);

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function span(style, inner = '') {
  return `<span style="${style}">${inner}</span>`;
}

function needTone(byId, id) {
  const t = byId.get(id);
  if (!t) throw new Error(`カラートーンが見つからない: ${id}`);
  return t;
}

// 作品の下に付ける解説（美術館のラベル）。作品と同じ段落に入れ、壁の上で作品と離れないようにする
// 言語（'ja' | 'en'）。日本語版・英語版の本文を組み立てる関数が、始めに設定する
let LANG = 'ja';
const isJa = () => LANG === 'ja';

function label(no, title, t, note) {
  const head = span(`display:block;font-family:${MONO};font-size:.82em;letter-spacing:.2em;opacity:.65;`,
    `WORK ${String(no).padStart(2, '0')}${t ? `${WIDE_SPACE}·${WIDE_SPACE}${t.id}` : ''}`);
  const [q1, q2] = isJa() ? ['《', '》'] : ['“', '”'];
  const toneText = t ? (isJa() ? `${t.nameJa}／${t.schemeJa}` : t.nameEn) : '';
  const name = span('display:block;font-weight:700;margin:.15em 0 .1em;', `${q1}${title}${q2}${t ? `${WIDE_SPACE}${span('font-weight:400;opacity:.75;', toneText)}` : ''}`);
  return span('display:block;margin-top:.9em;padding-left:.8em;border-left:.12em solid currentColor;font-size:max(.56em, 13px);line-height:1.6;max-width:62em;', head + name + note);
}

// 作品とラベルを 1 つの段落にする。画像は Markdown の記法で書き、相対パスの解決を本体に任せる
function exhibit(art, lbl) {
  return `${art}\n${lbl}`;
}

function image(file, alt) {
  return `![${alt}](images/${ART_DIR}/${file})`;
}

// 図や画像の後ろに置く解説（独立した段落）
function caption(no, title, t, note) {
  return label(no, title, t, note);
}

// ── 六つの窓（CSS）。太陽と月の高さで時刻を表す ────────────────────
function windowsRow(items) {
  const cells = items.map(({ t, time, name, height, moon }) => {
    const p = palette(t, 'dark');
    const sky = `background:linear-gradient(180deg, ${p.card.bg} 0%, ${p.canvas.bg} 100%)`;
    const bodyStyle = moon
      ? `position:absolute;left:50%;bottom:${height}%;width:1.1em;height:1.1em;margin-left:-.55em;border-radius:50%;box-shadow:inset -.3em -.1em 0 0 ${p.glow.bg};`
      : `position:absolute;left:50%;bottom:${height}%;width:1.2em;height:1.2em;margin-left:-.6em;border-radius:50%;background:${p.glow.bg};box-shadow:0 0 .9em .2em ${p.glow.bg};`;
    const pane = span(`display:block;position:relative;overflow:hidden;height:4.2em;border-radius:1.6em 1.6em .2em .2em;border:.08em solid ${p.canvas.border};${sky};`,
      span(bodyStyle) + span(`position:absolute;left:0;right:0;bottom:0;height:22%;background:${p.c1.bg};opacity:.9;`) + span(`position:absolute;left:50%;top:0;bottom:0;width:.06em;background:${p.canvas.border};opacity:.5;`));
    const cap = span('display:block;margin-top:.35em;font-size:max(.46em, 11px);line-height:1.35;text-align:center;', span(`display:block;font-family:${MONO};letter-spacing:.1em;color:${p.glow.bg};`, time) + name);
    return span('display:block;flex:1;min-width:0;', pane + cap);
  }).join('');
  return span('display:flex;gap:.45em;width:100%;max-width:36em;', cells);
}

// ── 図 1: 感情の地図（WARM–COOL × SOFT–HARD のイメージスケール）─────────
// 点の名前は点の上に出る。象限の名前（各象限の上端の中央）と、点の名前どうしが重ならない位置に置く
const EMOTION_MAP = [
  ['peach-blossom', 0.12, 0.2], ['lemon-meringue', 0.3, 0.06], ['cotton-candy', 0.4, 0.3], ['morning-window', 0.56, 0.16],
  ['lilac-snow', 0.82, 0.08], ['nordic-frost', 0.9, 0.26], ['sea-glass-shore', 0.66, 0.32], ['matcha-wagashi', 0.42, 0.42],
  ['amber-sunset', 0.1, 0.62], ['terracotta-courtyard', 0.3, 0.72], ['black-blossom', 0.14, 0.86], ['midnight-library', 0.44, 0.84],
  ['cobalt-workshop', 0.62, 0.64], ['cyber-prism', 0.88, 0.78]
];

// 英語版は名前が長いため、点どうし、点と下段の象限名（中央の線のすぐ下）が重ならないよう、位置を取り直す
const EMOTION_MAP_EN = [
  ['peach-blossom', 0.07, 0.10], ['lemon-meringue', 0.18, 0.03], ['cotton-candy', 0.18, 0.22], ['morning-window', 0.50, 0.14],
  ['lilac-snow', 0.80, 0.06], ['nordic-frost', 0.90, 0.22], ['sea-glass-shore', 0.66, 0.30], ['matcha-wagashi', 0.34, 0.34],
  ['amber-sunset', 0.1, 0.62], ['terracotta-courtyard', 0.3, 0.72], ['black-blossom', 0.14, 0.86], ['midnight-library', 0.44, 0.84],
  ['cobalt-workshop', 0.62, 0.64], ['cyber-prism', 0.88, 0.78]
];

function emotionQuadrant(byId) {
  const lines = ['```mermaid', 'quadrantChart',
    ...(isJa()
      ? ['  title 感情の地図 ── 14 のトーンの居場所',
        '  x-axis WARM あたたかい --> COOL つめたい', '  y-axis SOFT やわらかい --> HARD かたい',
        '  quadrant-1 澄んだ緊張', '  quadrant-2 熱のある重さ', '  quadrant-3 ぬくもりと甘さ', '  quadrant-4 静かな透明感']
      : ['  title Map of Feeling - where 14 tones live',
        '  x-axis WARM --> COOL', '  y-axis SOFT --> HARD',
        '  quadrant-1 Clear tension', '  quadrant-2 Heavy heat', '  quadrant-3 Warmth and sweetness', '  quadrant-4 Quiet clarity'])];
  for (const [id, x, y] of (isJa() ? EMOTION_MAP : EMOTION_MAP_EN)) {
    const t = needTone(byId, id);
    const p = palette(t, 'dark');
    lines.push(`  ${isJa() ? t.nameJa : t.nameEn}: [${x}, ${y}] radius: 11, color: ${p.c1.bg}, stroke-color: ${p.glow.bg}, stroke-width: 3px`);
  }
  lines.push('```');
  return lines.join('\n');
}

// ── 図 2: 一日の光のタイムライン ─────────────────────────────
const DAY = [
  { id: 'morning-window', time: '06:00', name: '朝の窓辺', mood: 'まだ誰のものでもない青', height: 18, en: ['Morning Window', 'A blue that belongs to no one yet'] },
  { id: 'citrus-market', time: '10:00', name: '陽だまりの果実市', mood: '声と匂いが色になる', height: 52, en: ['Citrus Market', 'Voices and scents become color'] },
  { id: 'cobalt-workshop', time: '13:00', name: '晴天の工作舎', mood: '影がいちばん短い', height: 70, en: ['Cobalt Workshop', 'Shadows at their shortest'] },
  { id: 'amber-sunset', time: '17:00', name: '琥珀の夕暮れ', mood: '帰り道だけを照らす光', height: 24, en: ['Amber Sunset', 'A light that shows only the way home'] },
  { id: 'midnight-library', time: '21:00', name: '夜を編む図書館', mood: '灯りの金と書架の藍', height: 46, moon: true, en: ['Midnight Library', 'Lamp gold, shelf indigo'] },
  { id: 'neon-arcade', time: '00:00', name: '深夜の電脳祭', mood: '眠らない光', height: 66, moon: true, en: ['Neon Arcade', 'A light that never sleeps'] }
];

// timeline の「:」は区切りのため、時刻は「6 時」「6 am」の形で書く
function dayTimeline() {
  const hour12 = h => (h % 12 === 0 ? 12 : h % 12) + (h < 12 ? ' am' : ' pm');
  const row = d => {
    const h = Number(d.time.slice(0, 2));
    return isJa() ? `    ${h} 時 : ${d.name} : ${d.mood}` : `    ${hour12(h)} : ${d.en[0]} : ${d.en[1]}`;
  };
  const sections = isJa() ? ['朝', '昼', '夜'] : ['Morning', 'Afternoon', 'Night'];
  return ['```mermaid', 'timeline', isJa() ? '  title 一日の光 ── 時刻がトーンを選ぶ' : '  title Light of a Day - the hour picks the tone',
    `  section ${sections[0]}`, ...DAY.slice(0, 2).map(row),
    `  section ${sections[1]}`, ...DAY.slice(2, 4).map(row),
    `  section ${sections[2]}`, ...DAY.slice(4).map(row), '```'].join('\n');
}

// ── 図 3: 配色の組み立て順（基調 → キー色 → 2 色め・3 色め → 差し色）──────
// 広間の立体図は、ノードの層が額縁より手前に浮くため、正方形から 2:1 程度を外れる形はノードが額縁と画面からはみ出す。
// 3 段の菱形に組み、基調の色は図の背景（基調の色で塗った額縁の地）に任せる
function buildOrderFlow(t) {
  const p = palette(t, 'dark');
  const node = (k, c) => `  style ${k} fill:${c.bg},color:${c.ink},stroke:${c.border},stroke-width:2px`;
  // 見えない余白のノード（SP）を先頭に置き、ノードを額縁の上端から下げる（ノードの層が手前に浮いて上へはみ出すのを防ぐ）。
  // 題名（title）で下げると、題名の文字が額縁の札やノードと重なる
  return ['```mermaid', 'flowchart TB',
    `  SP[" "] ~~~ K`,
    `  style SP fill:transparent,stroke:transparent`,
    `  K["${isJa() ? '① キー色' : '① Key color'}<br/>${p.c1.bg}"] --> S["${isJa() ? '② 2 色め' : '② Second'}<br/>${p.c2.bg}"]`,
    `  K --> T["${isJa() ? '③ 3 色め' : '③ Third'}<br/>${p.c3.bg}"]`,
    `  S --> A["${isJa() ? '④ 差し色' : '④ Accent'}<br/>${p.glow.bg}"]`,
    '  T --> A',
    node('K', p.c1), node('S', p.c2), node('T', p.c3), node('A', p.glow),
    `  linkStyle default stroke:${p.glow.bg},stroke-width:2px`, '```'].join('\n');
}

// ── 図 4: 収蔵庫の地層（トーンの主な区分を 4 つの家族にまとめる）──────
const FAMILIES = [
  { label: '澄んだ淡色', en: 'Clear pastels', terms: ['very pale', 'pale', 'light'], rep: 'spring-mist' },
  { label: '鮮やかな原色', en: 'Vivid primaries', terms: ['vivid', 'strong', 'bright'], rep: 'cobalt-workshop' },
  { label: 'にごりの中間色', en: 'Muted mid-tones', terms: ['soft', 'dull', 'light grayish', 'grayish'], rep: 'matcha-wagashi' },
  { label: '深い暗色', en: 'Deep darks', terms: ['deep', 'dark', 'dark grayish'], rep: 'midnight-library' }
];

function primaryTerm(t) {
  return (t.catEn || '').split(/\s*[+/]\s*/)[0].trim().toLowerCase();
}

function archiveFlow(tones, byId) {
  const counts = FAMILIES.map(f => tones.filter(t => f.terms.includes(primaryTerm(t))).length);
  const known = counts.reduce((a, b) => a + b, 0);
  // 広間の立体図は正方形に近い形がよく収まる（buildOrderFlow の注記）。左に収蔵庫、右に 4 つの家族を縦に並べる
  // 見えない余白のノード（SP）を家族の列の先頭に置き、上端のノードを額縁の内側へ下げる（buildOrderFlow の注記）
  const lines = ['```mermaid', 'flowchart LR', `  R["${isJa() ? '収蔵' : 'Archive'}<br/>${tones.length}${isJa() ? ' 点' : ''}"]`, '  R ~~~ SP[" "]'];
  const styles = ['  style R fill:#0E1220,color:#F3E9D2,stroke:#C9A65A,stroke-width:3px', '  style SP fill:transparent,stroke:transparent'];
  FAMILIES.forEach((f, i) => {
    const rep = needTone(byId, f.rep);
    const p = palette(rep, 'dark');
    lines.push(isJa()
      ? `  R --> F${i}["${f.label}<br/>${counts[i]} 点<br/>${rep.nameJa}"]`
      : `  R --> F${i}["${f.en}<br/>${counts[i]}<br/>${rep.nameEn}"]`);
    styles.push(`  style F${i} fill:${p.c1.bg},color:${p.c1.ink},stroke:${p.glow.bg},stroke-width:2px`);
  });
  if (known !== tones.length) lines.push(`  R --> FX["${isJa() ? 'そのほか' : 'Others'}<br/>${tones.length - known}"]`);
  lines.push(...styles, '```');
  return lines.join('\n');
}

// ── 表紙の作品: 白い光がプリズムで 20 のトーンに分かれる（SVG。光の筋が順に明滅する）──
const PRISM_IDS = ['peach-blossom', 'dried-rose', 'terracotta-courtyard', 'amber-sunset', 'lemon-meringue', 'lime-aqua-dune', 'matcha-wagashi',
  'sea-glass-shore', 'nordic-frost', 'morning-window', 'cobalt-workshop', 'lavender-apricot', 'lilac-snow', 'cotton-candy', 'spring-mist',
  'blush-chambray', 'butterfly-sketch', 'midnight-library', 'black-blossom', 'cyber-prism'];

function generatePrismSvg(byId, imgDir) {
  const T = isJa()
    ? { alt: "白い光がプリズムで 20 のカラートーンに分かれる", title: "一本の光から、二十の物語へ", sub: "WHITE LIGHT → 20 CURATED TONES", file: "color-museum-prism.svg" }
    : { alt: "White light splits into 20 color tones through a prism", title: "One light, twenty stories", sub: "WHITE LIGHT → 20 CURATED TONES", file: "color-museum-prism.en.svg" };
  const W = 960;
  const H = 440;
  const px = 300;
  const py = 230;
  const rays = PRISM_IDS.map((id, i) => {
    const t = needTone(byId, id);
    const p = palette(t, 'dark');
    const a = (-30 + (60 * i) / (PRISM_IDS.length - 1)) * Math.PI / 180;
    const ex = px + 70 + Math.cos(a) * 560;
    const ey = py + Math.sin(a) * 560 * 0.62;
    const x0 = px + 62;
    return `  <linearGradient id="ray${i}" x1="${x0}" y1="${py}" x2="${ex.toFixed(1)}" y2="${ey.toFixed(1)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${p.c1.bg}" stop-opacity="0.15"/><stop offset="1" stop-color="${p.c1.bg}" stop-opacity="0.95"/></linearGradient>
  <polygon class="ray" style="animation-delay:-${(i * 0.18).toFixed(2)}s" points="${x0},${py - 3} ${x0},${py + 3} ${ex.toFixed(1)},${(ey + 7).toFixed(1)} ${ex.toFixed(1)},${(ey - 7).toFixed(1)}" fill="url(#ray${i})"/>
  <circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="6.5" fill="${p.glow.bg}" stroke="${p.c1.bg}" stroke-width="2"/>
  <text x="${(ex + 14).toFixed(1)}" y="${(ey + 4).toFixed(1)}" fill="#D9D4C7" font-family="'Yu Gothic','Hiragino Sans','Noto Sans JP',sans-serif" font-size="11.5">${escapeXml(isJa() ? t.nameJa : t.nameEn)}</text>`;
  }).join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${escapeXml(T.alt)}">
  <style>
    .ray { animation: ray 3.6s ease-in-out infinite; }
    .beam { animation: beam 3.6s ease-in-out infinite; }
    @keyframes ray { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
    @keyframes beam { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  </style>
  <defs>
    <radialGradient id="room" cx="32%" cy="52%" r="75%"><stop offset="0" stop-color="#1A2030"/><stop offset="1" stop-color="#07090F"/></radialGradient>
    <linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.95"/></linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#E9F1FF" stop-opacity="0.35"/><stop offset="1" stop-color="#9FB4D9" stop-opacity="0.08"/></linearGradient>
  </defs>
  <rect width="${W}" height="${H}" rx="20" fill="url(#room)"/>
  <polygon class="beam" points="40,${py - 2} 40,${py + 2} ${px},${py + 3} ${px},${py - 3}" fill="url(#beam)"/>
${rays}
  <polygon points="${px - 40},${py + 78} ${px + 40},${py + 78} ${px},${py - 82}" fill="url(#glass)" stroke="#DCE6FA" stroke-opacity="0.7" stroke-width="1.6"/>
  <text x="40" y="58" fill="#F3E9D2" font-family="'Yu Mincho','Hiragino Mincho ProN','Noto Serif JP',serif" font-size="26" font-weight="700" letter-spacing="3">${escapeXml(T.title)}</text>
  <text x="40" y="84" fill="#8E96A8" font-family="Consolas,'JetBrains Mono',monospace" font-size="11" letter-spacing="3">${escapeXml(T.sub)}</text>
</svg>
`;
  fs.writeFileSync(path.join(imgDir, T.file), svg, 'utf8');
}

// ── 作品の定義 ───────────────────────────────────────────
const POSTERS = [
  { id: 'midnight-library', mode: 'dark', no: 3, file: 'poster-reading-night.svg', name: '夜の読書会',
    w: { art: 'library', kicker: 'READING NIGHT · VOL.12', title: '夜の読書会', sub: '閉館後の書架で、一冊を声に出して読む。', date: '11.28 FRI 20:00', tags: ['朗読', '珈琲', '定員 12'] },
    note: '金は「灯り」として 1 か所にだけ置いた。暗がりを広く残したのは、読む人が自分の想像で埋める余白のためだ。照らしすぎる親切は、ときに読む自由を奪う。' },
  { id: 'cobalt-workshop', mode: 'light', no: 4, file: 'poster-kids-fair.svg', name: 'つくる日曜日',
    w: { art: 'bauhaus', kicker: 'KIDS MAKER FAIR', title: 'つくる日曜日', titleSize: 92, sub: '紙と木と光で、自分だけの道具をつくろう。', date: '12.07 SUN 10:00', tags: ['工作', '入場無料', '親子'] },
    note: '原色どうしは喧嘩する。それでも子どもは、喧嘩する色が好きだ。大人の「調和」を押しつけず、帯の比率（7 : 2 : 1）だけで主従を付けた。' },
  { id: 'matcha-wagashi', mode: 'dark', no: 5, file: 'poster-tea.svg', name: '冬の茶会',
    w: { art: 'tea', kicker: 'TEA CEREMONY', title: '冬の茶会', sub: '抹茶の緑と、和三盆の生成り。', date: '01.12 SUN 14:00', tags: ['茶道', '和菓子', '要予約'] },
    note: 'にごりのある色は、声を張らない。茶室で誰も大きな声を出さないのと同じだ。円相はわざと閉じなかった。完全な円より、欠けた円のほうが人の手の跡を残す。' },
  { id: 'cyber-prism', mode: 'dark', no: 6, file: 'poster-tech-night.svg', name: 'TECH NIGHT',
    w: { art: 'grid', kicker: 'TECH NIGHT 2026', title: 'TECH NIGHT', titleSize: 78, sub: 'ライトニングトーク 8 本と、深夜のデモ大会。', date: '02.20 FRI 19:00', tags: ['LT', 'デモ', '配信あり'] },
    note: '光る色は 2 つまで。未来はいつも眩しく描かれるが、眩しさは人に目を閉じさせる。残りの色には、暗い境界と線として光を支える役を任せた。' }
];

const SEASONS = [
  { id: 'spring-mist', mode: 'light', no: 7, file: 'season-spring.svg', glyph: '春', tag: 'SPRING · 06:30', sunX: 72, sunY: 24, seed: 31, motif: 'petals',
    line: '花びらは、散るために咲いたのではない。けれど散るから、私たちは見上げる。' },
  { id: 'sea-glass-shore', mode: 'light', no: 8, file: 'season-summer.svg', glyph: '夏', tag: 'SUMMER · 12:00', sunX: 50, sunY: 14, seed: 47, motif: 'sea',
    line: '波に洗われたガラスは、角を失って美しくなった。時間に削られることを、劣化と呼ぶか、成熟と呼ぶか。' },
  { id: 'terracotta-courtyard', mode: 'dark', no: 9, file: 'season-autumn.svg', glyph: '秋', tag: 'AUTUMN · 17:10', sunX: 28, sunY: 46, seed: 59, motif: 'leaves',
    line: '夕焼けの色は、色コードで正確に残せる。けれど、あの日の帰り道までは残せない。色は記録で、記憶は別の場所にある。' },
  { id: 'nordic-frost', mode: 'dark', no: 10, file: 'season-winter.svg', glyph: '冬', tag: 'WINTER · 23:40', sunX: 78, sunY: 20, seed: 71, motif: 'snow', moon: true,
    line: '冷たい色ほど、灯りの温かさを教えてくれる。寒さのない世界では、誰も窓に灯をともさない。' }
];

function buildExhibitJa(tones, byId, imgDir) {
  LANG = 'ja';
  const T = id => needTone(byId, id);
  const artDir = path.join(imgDir, ART_DIR);
  generatePrismSvg(byId, imgDir);
  for (const x of POSTERS) writeArt(artDir, x.file, posterSvg(T(x.id), x.mode, x.w));
  for (const s of SEASONS) writeArt(artDir, s.file, seasonSvg(T(s.id), s));
  writeArt(artDir, 'ratio-fields.svg', ratioSvg(T('amber-sunset')));

  // 作品ごとの小見出しは置かない。ミュージアム・ウォークの壁の 1 列（高さ 680）に、小見出し・作品・ラベルの
  // 3 つは収まらず、ラベルが床の下にもぐるため。作品名はラベルに書く
  const posterBlocks = POSTERS.map(x =>
    exhibit(image(x.file, `${x.name} のポスター`), label(x.no, x.name, T(x.id), x.note))).join('\n\n');

  const seasonBlocks = SEASONS.map(s =>
    exhibit(image(s.file, `${s.glyph}の稜線`), label(s.no, `${s.glyph}の稜線`, T(s.id), s.line))).join('\n\n');

  const amber = T('amber-sunset').nameJa;

  return `---
title: 配色ミュージアム — 光と色の回廊
description: 色の一覧ではなく、色が人の心を動かす瞬間を巡る回廊。
tags: ["Lucivo", "配色ミュージアム", "カラートーン", "ミュージアム・ウォーク"]
---

# 配色ミュージアム — 光と色の回廊

色に正解はない、と人は言う。それでも私たちは毎日、誰かのために色を選んでいる。この回廊には色見本を置かない。${tones.length} のトーンから色を借りて、ポスターを刷り、窓を開け、季節の山を描いた。選ぶことは、何かを選ばないことでもある。その跡をたどってほしい。

![一本の白い光がプリズムで 20 のトーンに分かれる](images/color-museum-prism.svg)

> [!NOTE]
> 発表メニューから「ミュージアム・ウォーク」を選ぶと、この文書を立体の回廊として歩けます。\`↑\` \`↓\`・ホイールで歩き、ドラッグで見回し、\`T\` で展示照明（Dark / Light）を切り替え、\`Esc\` で戻ります。

## 光が、色に分かれる

### 色は、気持ちの座標

赤は情熱、青は冷静。そう言い切った瞬間に、色は少しだけ死ぬ。同じ赤でも、うすく溶かせば頬の温度になり、深く沈めれば古い血の記憶になる。印象を決めるのは色相よりも、明るさと鮮やかさ、つまりトーンのほうだ。最初の広間では、14 のトーンを「あたたかい ⇔ つめたい」「やわらかい ⇔ かたい」の 2 本の軸の上に置いた。

${emotionQuadrant(byId)}

${caption(1, '感情の地図', null, '点の位置は測定値ではない。トーンに添えられた言葉を読み、この展示の作り手が置いた。あなたなら、どこに置くだろう。地図の誤差は、見る人の数だけある。')}

> 機械は 1600 万の色を見分けられる。けれど、どの色が「さみしい」のかを知っているのは、さみしさを生きた者だけだ。では、さみしさを言葉でしか知らない者が選んだ色は、偽物だろうか。その色を見て、あなたの胸が少し痛んだなら。

## 一日の光をたどる

### 六つの窓

人は時計を持つ前から、光の色で時刻を知っていた。朝の青は眠気を、夕方の琥珀は帰り道を、深夜の藍は自分だけの時間を連れてくる。

${exhibit(windowsRow(DAY.map(d => ({ t: T(d.id), time: d.time, name: d.name, height: d.height, moon: d.moon }))), label(2, '六つの窓', null, '同じ壁に、同じ形の窓を 6 つ。変えたのは空の色と、太陽と月の高さだけだ。時刻は数字ではなく、空気の色で伝わる。'))}

${dayTimeline()}

## 色を着た一枚

### 同じ型紙、違う声色

4 枚のポスターは、同じ型紙から刷った。文字の大きさも置き場所も変えていない。変えたのは色と絵だけだ。それなのに、読書会は声をひそめ、工作フェアは走り出し、茶会は息を整え、テック・ナイトは目を光らせる。色は飾りではない。誌面の声色である。

${posterBlocks}

![カラートーンの 4 層分解図](images/color-museum-anatomy.svg)

> 1 枚のポスターを分解すると、背景・文字・境界・線の 4 つの役割に分かれる。Lucivo のトーンは、色ごとに「その色を背景にしたときの文字色」を組で持っている。美しさは、読めることを犠牲にしてはいけない。色の見え方が違う人、暗い部屋で読む人、疲れた目で読む人。読めない美しさは、誰かを置き去りにする。

## 比率がつくるリズム

### 同じ三色、違う沈黙

色の数より効くのは、面積の比率だ。2 枚の色面は、${amber}の同じ 3 色で塗った。違うのは、色どうしがどれだけ譲り合っているかだけである。

${exhibit(image('ratio-fields.svg', '同じ 3 色で比率だけを変えた 2 枚の色面'), label(11, '譲り合う色面', T('amber-sunset'), '左では、差し色が 5% に退くことで「灯り」になった。右では、3 色が同じ声量で話し、誰の話も聞こえない。均等であることが、いつも調和を生むとは限らない。'))}

### 色には順番がある

色は一度に決めない。基調を敷き、キー色を 1 つ決め、2 色め・3 色めをキー色との関係で足し、最後に差し色を 1 か所だけ置く。順番があるのは、色にも関係があるからだ。広間の図は、その順番を${amber}の実際の色で並べたものである。

${buildOrderFlow(T('amber-sunset'))}

## 四季の間

### 同じ稜線、四つの季節

山の形は 4 枚とも同じ種から描いた。描き直したのは空気だけだ。春と夏は明るい地、秋と冬は暗い地のパレットで塗っている。季節を変えるのに、山を動かす必要はない。

${seasonBlocks}

> 季節を伝えるのに、鮮やかさはいらない。春はうすく、夏は澄んで、秋はにごり、冬は暗く冷たく。トーンを動かすだけで、空気は入れ替わる。

## 二〇三の収蔵庫

### 名前を与えられた色

収蔵庫には ${tones.length} のトーンが眠っている。どれにも「朝の窓辺」「夜を編む図書館」のような名前がある。色コードは機械のための名前で、イメージ名は人のための名前だ。名前を与えた瞬間、色は記憶と結びつき、誰かの思い出を借りはじめる。

${archiveFlow(tones, byId)}

![全 203 色のモザイク壁画](images/color-museum-spectrum.svg)

${caption(12, '収蔵庫の壁画', null, `${tones.length} のトーンを番号順に並べ、1 マスに主役から 4 色めまでを詰めた。近くで見れば 1 つずつに個性があり、遠くから見れば地層になる。一覧は便利だが、一覧の中で色は少しだけ無口になる。`)}

> この展示の色は、人が名付け、機械が並べ、いま、あなたが見ている。作者は誰か。たぶん、最後に心を動かされた人も、その一人に数えてよい。

## あなたの色で、はじめる

### 展示を持ち帰る

気に入ったトーンは、ヘッダーの「カラートーン」メニューから自分の文書に着せられる。URL に \`tone\`・\`theme\`・\`present\` を付ければ、同じ色と同じ演出のまま、誰かに手渡せる。

\`\`\`text
?tone=midnight-library&theme=dark&present=museum-walk
\`\`\`

> [!TIP]
> 迷ったら、色から選ばずに、届けたい気持ちから選んでください。夜の発表には「夜を編む図書館」、子ども向けの案内には「晴天の工作舎」、和の催しには「抹茶と和三盆」。
`;
}

// ── 英語版 ───────────────────────────────────────────────
// 作品（SVG）は日本語版と同じ絵で、文字だけを英語にして別のファイル（*.en.svg）に書き出す。
// 小見出しは、壁の幅（860px）で 1 行に収まる長さ（英字 20 字前後まで）にする。
// 章の題名は、サムネイルの撮影（tools/capture-sample-thumbs.cjs）が「Light of a Day」で探す。
const POSTERS_EN = [
  { title: 'Reading Night', titleSize: 88, sub: 'After closing, one book, read aloud among the shelves.', tags: ['Reading', 'Coffee', '12 seats'],
    alt: 'Poster for Reading Night', name: 'Reading Night',
    note: 'Gold appears in only one place, as the lamp. The dark is left wide on purpose, as room for the reader to fill with their own imagination. A kindness that lights everything takes away the freedom to read.' },
  { title: 'Make Sunday', titleSize: 92, sub: 'Paper, wood, and light. Make a tool that is yours alone.', tags: ['Making', 'Free entry', 'Families'],
    alt: 'Poster for Make Sunday', name: 'Make Sunday',
    note: 'Primary colors quarrel. Children love a quarrel of colors anyway. Rather than impose an adult idea of harmony, the proportions of the band (7 : 2 : 1) alone decide who leads.' },
  { title: 'Winter Tea', titleSize: 100, sub: 'The green of matcha, the cream of wasanbon.', tags: ['Tea', 'Sweets', 'Booking'],
    alt: 'Poster for Winter Tea', name: 'Winter Tea',
    note: 'Muted colors do not raise their voices, just as no one shouts in a tearoom. The circle is left open on purpose. A broken circle keeps more of the hand than a perfect one.' },
  { title: 'TECH NIGHT', titleSize: 78, sub: 'Eight lightning talks and a late-night demo jam.', tags: ['LT', 'Demos', 'Streamed'],
    alt: 'Poster for Tech Night', name: 'TECH NIGHT',
    note: 'No more than two colors glow. The future is always drawn dazzling, but dazzle makes people close their eyes. The dark borders and lines carry the rest, holding the light up.' }
];

const SEASONS_EN = [
  { glyph: 'Spring', glyphSize: 110, name: 'The ridge in spring', alt: 'A ridge in spring',
    line: 'Petals did not bloom in order to fall. Yet because they fall, we look up.' },
  { glyph: 'Summer', glyphSize: 110, name: 'The ridge in summer', alt: 'A ridge in summer',
    line: 'Glass worn by the waves lost its corners and became beautiful. Is being worn down by time called decay, or maturity?' },
  { glyph: 'Autumn', glyphSize: 110, name: 'The ridge in autumn', alt: 'A ridge in autumn',
    line: 'The color of a sunset can be kept exactly, as a color code. The walk home that day cannot. Color is a record; memory lives somewhere else.' },
  { glyph: 'Winter', glyphSize: 110, name: 'The ridge in winter', alt: 'A ridge in winter',
    line: 'The colder the color, the better it teaches us the warmth of a lamp. In a world without cold, no one lights a window.' }
];

function buildExhibitEn(tones, byId, imgDir) {
  LANG = 'en';
  const T = id => needTone(byId, id);
  const artDir = path.join(imgDir, ART_DIR);
  generatePrismSvg(byId, imgDir);
  const posterBlocks = POSTERS.map((x, i) => {
    const e = POSTERS_EN[i];
    const file = x.file.replace('.svg', '.en.svg');
    writeArt(artDir, file, posterSvg(T(x.id), x.mode, { ...x.w, ...e, kicker: x.w.kicker, date: x.w.date, art: x.w.art }));
    return exhibit(image(file, e.alt), label(x.no, e.name, T(x.id), e.note));
  }).join('\n\n');
  const seasonBlocks = SEASONS.map((s, i) => {
    const e = SEASONS_EN[i];
    const file = s.file.replace('.svg', '.en.svg');
    writeArt(artDir, file, seasonSvg(T(s.id), { ...s, ...e }));
    return exhibit(image(file, e.alt), label(s.no, e.name, T(s.id), e.line));
  }).join('\n\n');
  writeArt(artDir, 'ratio-fields.en.svg', ratioSvg(T('amber-sunset'), {
    a: 'The eye knows where to rest', b: 'Three colors compete at equal strength', alt: 'Two color fields made of the same three colors in different proportions'
  }));
  const amber = T('amber-sunset').nameEn;

  return `---
title: Color Museum — A Gallery of Light and Color
description: Not a list of swatches, but the moments color moves us.
tags: ["Lucivo", "Color Museum", "Color Tones", "Museum Walk"]
---

# Color Museum — A Gallery of Light and Color

They say color has no right answer, yet every day we choose colors for someone. Here are no swatch lists, only posters, windows, and mountains painted with Lucivo's ${tones.length} tones. To choose is to leave something unchosen.

![One white light splits into 20 tones through a prism](images/color-museum-prism.en.svg)

> [!NOTE]
> Choose "Museum Walk" from the Present menu to walk this document as a 3D corridor. Walk with \`↑\` \`↓\` or the wheel, look around by dragging, switch the gallery lighting (Dark / Light) with \`T\`, and return with \`Esc\`.

## Light Splits into Color

### A Map of Feeling

Red is passion, blue is calm. Say it so flatly and color dies a little. Thinned, red is a cheek's warmth; sunk deep, old blood. Tone shapes feeling more than hue. Here, 14 tones sit on two axes: warm to cool, soft to hard.

${emotionQuadrant(byId)}

${caption(1, 'Map of Feeling', null, 'The positions are not measurements. The maker of this exhibition placed them by reading the words attached to each tone. Where would you put them? A map has as many errors as it has viewers.')}

> A machine can tell sixteen million colors apart. But only someone who has lived through loneliness knows which color is "lonely." Then is a color chosen by someone who knows loneliness only as a word a fake? If your chest ached a little when you saw it.

## Following the Light of a Day

### Six Windows

Before we owned clocks, we told the time by the color of light. Morning blue brings drowsiness, evening amber the road home, midnight indigo a time that is only ours.

${exhibit(windowsRow(DAY.map(d => ({ t: T(d.id), time: d.time, name: d.en[0], height: d.height, moon: d.moon }))), label(2, 'Six Windows', null, 'Six windows of one shape in one wall. Only the color of the sky and the height of the sun and moon change. The hour is carried not by numbers but by the color of the air.'))}

${dayTimeline()}

## A Poster in Color

### Four Voices

Four posters, one template. Type and layout never changed; only color and picture did. Yet one hushes, one runs, one settles, one glows. Color is not decoration. It is a page's tone of voice.

${posterBlocks}

![The 4-layer anatomy of a color tone](images/color-museum-anatomy.svg)

> Take a poster apart and it splits into four roles: background, text, border, line. Each Lucivo tone pairs every color with the text color that sits on it. Beauty must not cost legibility. A beauty that cannot be read leaves someone behind.

## The Rhythm of Proportion

### Two Silences

More than the number of colors, what matters is the proportion of area. The two color fields are painted with the same three colors of ${amber}. They differ only in how much the colors yield to one another.

${exhibit(image('ratio-fields.en.svg', 'Two color fields made of the same three colors in different proportions'), label(11, 'Colors that Yield', T('amber-sunset'), 'On the left, the accent retreats to 5% and becomes a lamp. On the right, three colors speak at the same volume, and no one can hear any of them. Evenness does not always make harmony.'))}

### Color Has an Order

Don't decide every color at once. Lay the ground, pick a key color, add a second and third in relation to it, place one accent last. The hall's diagram shows that order in the real colors of ${amber}.

${buildOrderFlow(T('amber-sunset'))}

## The Room of Four Seasons

### One Ridge

All four ridges grow from one seed; only the air was redrawn. Spring and summer use Light palettes, autumn and winter Dark. To change a season, you need not move the mountains.

${seasonBlocks}

> To tell a season, you do not need vividness. Spring thin, summer clear, autumn muddied, winter dark and cold. Move the tone alone, and the air is replaced.

## The Archive of ${tones.length}

### Named Colors

The archive holds ${tones.length} tones, each with a name like "Morning Window." A color code names a color for machines; an image name names it for people. Once named, a color borrows someone's memory.

${archiveFlow(tones, byId)}

![A mosaic mural of all 203 tones](images/color-museum-spectrum.svg)

${caption(12, 'Mural of the Archive', null, `${tones.length} tones in numerical order, each cell holding four colors from the lead color onward. Up close, each has its own character; from afar, they become strata. A list is convenient, but inside a list a color grows a little quiet.`)}

> The colors in this exhibition were named by a person, arranged by a machine, and are now being seen by you. Who is the author? Perhaps the last person to be moved may count among them.

## Begin with Your Color

### Take It Home

A tone you like can be dressed onto your own document from the header's "Color Tone" menu. Add \`tone\`, \`theme\`, and \`present\` to the URL and you can hand someone the same colors and the same staging.

\`\`\`text
?tone=midnight-library&theme=dark&present=museum-walk
\`\`\`

> [!TIP]
> When in doubt, choose not from color but from the feeling you want to deliver. "Midnight Library" for a night talk, "Cobalt Workshop" for a children's guide, "Matcha Wagashi" for a Japanese-style event.
`;
}

module.exports = { buildExhibitJa, buildExhibitEn };
