// 割り付けから 3D の空間（DOM）を組み立て、毎フレーム更新する（DD-MWLK-006、DTP-MWLK-020〜070）。
// 歩いている間に書き換えるのは、世界全体の transform、各要素の opacity と display、近づくと現れるパーツの transform だけで、
// 値が変わったときだけ書く。壁・床・天井のタイルは、子要素と疑似要素を持たない 1 枚の要素にし、大きさと背景は 1 度だけ設定する。
import { FLOOR, TINTS, rampLengthFor, tintAt, zoneAt, type Plan, type PartKind, type Measure } from './layout';
import { clamp, lerp, smooth, sectionAt, type Cam } from './camera';
import type { FigureImages } from './figure';

const TILE = 1000;
// 霞みの始まりと、真っ暗になる距離
const FOG0 = 900;
const FOG1 = 7000;
const FOG_STOPS: Array<[number, number]> = [[0, 0], [0.28, 0.2], [0.58, 0.58], [0.84, 0.88], [1, 1]];

// パーツの種類ごとの、壁からの距離（奥行き）と、現れ始める距離・現れ終わる距離（DTP-MWLK-030）
const KIND: Record<PartKind, { off: number; range: [number, number] }> = {
  h3: { off: 150, range: [3700, 2600] },
  h3shadow: { off: 3, range: [3700, 2600] },
  body: { off: 4, range: [2300, 1500] },
  bullet: { off: 46, range: [2000, 1300] },
  plate: { off: 30, range: [2300, 1500] },
  aside: { off: 24, range: [1500, 800] },
  number: { off: 110, range: [3600, 2500] }
};

// 立体図の層（DTP-MWLK-050）。dz は進む向きと逆へずらす量（大きいほど手前）
const STAND = { maxW: 1100, maxH: 520, padX: 60, padTop: 104, padBottom: 90, bottom: 180, dzLines: 70, dzNodes: 210 };

interface Tile { el: HTMLElement; near: number; far: number; vis: boolean; key: number; wall: boolean; }
interface PartRef { el: HTMLElement; kind: PartKind; side: 'L' | 'R'; z: number; y: number; w: number; half: number; key: string; vis: boolean; }
interface StandRef {
  el: HTMLElement;
  z: number;
  baseZ: number;
  dz: number;
  elev: number;
  key: number;
  frame: boolean;
  figure: number;
  role?: 'lines' | 'nodes' | 'all';
  img?: HTMLImageElement;
}
interface GateRef { el: HTMLElement; z: number; tint: string; key: number; }

export interface WorldRefs {
  root: HTMLElement;
  view: HTMLElement;
  world: HTMLElement;
  cap: HTMLElement;
  flash: HTMLElement;
  bar: HTMLElement;
  zone: HTMLElement;
  tiles: Tile[];
  parts: PartRef[];
  stands: StandRef[];
  gates: GateRef[];
  zoneKey: number;
}

export function fogA(d: number): number {
  const t = clamp((d - FOG0) / (FOG1 - FOG0), 0, 1);
  for (let i = 1; i < FOG_STOPS.length; i++) {
    const [t0, a0] = FOG_STOPS[i - 1];
    const [t1, a1] = FOG_STOPS[i];
    if (t <= t1) return lerp(a0, a1, (t - t0) / (t1 - t0));
  }
  return 1;
}

function el(cls: string, parent: HTMLElement, html?: string): HTMLElement {
  const d = document.createElement('div');
  d.className = cls;
  if (html != null) d.innerHTML = html;
  parent.appendChild(d);
  return d;
}

// 壁の文字のパーツは、2 倍の大きさで組み、3D の中で scale(0.5) に縮めて置く（近づいてもぼけない。DTP-MWLK-030）
function partClass(kind: PartKind): string {
  return `mw-part mw-${kind}`;
}

function fillPart(node: HTMLElement, kind: PartKind, html: string, w: number, label?: string, small?: boolean): void {
  node.innerHTML = html;
  node.style.width = `${w * 2}px`;
  if (label) node.dataset.label = label;
  node.classList.toggle('is-small', !!small);
}

// パーツの高さを測る。重ねの中の見えない入れ物に、同じクラスで組んで測る
export function createMeasurer(root: HTMLElement): { measure: Measure; dispose(): void } {
  const box = el('mw-measure', root);
  const probe = el('', box);
  return {
    measure(kind, html, w, label, small) {
      probe.className = partClass(kind);
      delete probe.dataset.label;
      fillPart(probe, kind, html, w, label, small);
      return probe.offsetHeight / 2;
    },
    dispose() {
      box.remove();
    }
  };
}

function partTransform(p: PartRef, off: number, r: number, reduced: boolean): string {
  const slide = reduced ? 0 : (1 - r) * 90;
  const rise = reduced ? 0 : (1 - r) * 28;
  if (p.side === 'L') {
    return `translate3d(${-p.half + off}px, ${p.y}px, ${p.z}px) rotateY(90deg) translate3d(${slide}px, ${rise}px, 0) scale(0.5)`;
  }
  return `translate3d(${p.half - off}px, ${p.y}px, ${p.z - p.w}px) rotateY(-90deg) translate3d(${-slide}px, ${rise}px, 0) scale(0.5)`;
}

// 門の題名を、門の幅に 2 行以内で収まるまで小さくする
function fitTitle(title: HTMLElement, start: number): void {
  let size = start;
  title.style.fontSize = `${size}px`;
  while (size > 72 && (title.scrollWidth > title.clientWidth + 1 || title.offsetHeight > size * 1.1 * 2 + 4)) {
    size = Math.max(72, Math.round(size * 0.9));
    title.style.fontSize = `${size}px`;
  }
}

export function buildWorld(root: HTMLElement, plan: Plan, figures: FigureImages[], figureAppearance: 'dark' | 'light'): WorldRefs {
  const view = el('mw-view', root);
  const world = el('mw-world', view);
  const tiles: Tile[] = [];

  // 壁・床・天井。区間ごとに断面が違う
  const surface = (cls: string, tf: string, w: number, h: number, near: number, far: number, tint: string, wall: boolean) => {
    const node = el(cls, world);
    node.style.cssText = `transform:${tf};width:${w}px;height:${h}px;--tint:${tint}`;
    tiles.push({ el: node, near, far, vis: true, key: -1, wall });
  };
  plan.sections.forEach((s, i) => {
    const h = FLOOR - s.ceil;
    const floorY = FLOOR + s.elev;
    const ceilY = s.ceil + s.elev;
    for (let near = s.from; near > s.to; near -= TILE) {
      const far = Math.max(s.to, near - TILE);
      const len = near - far;
      const tint = tintAt(plan, (near + far) / 2);
      surface('mw-wall', `translate3d(${-s.half}px, ${ceilY}px, ${near}px) rotateY(90deg)`, len, h, near, far, tint, false);
      surface('mw-wall', `translate3d(${s.half}px, ${ceilY}px, ${far}px) rotateY(-90deg)`, len, h, near, far, tint, false);
      surface('mw-floor', `translate3d(${-s.half}px, ${floorY}px, ${far}px) rotateX(90deg)`, s.half * 2, len, near, far, tint, false);
      surface('mw-ceil', `translate3d(${-s.half}px, ${ceilY}px, ${near}px) rotateX(-90deg)`, s.half * 2, len, near, far, tint, false);
    }
    // 断面や高さが変わる境目の壁（左右の袖・開口部の上の垂れ壁・段差の蹴上げ・スロープ、#306）
    const n = plan.sections[i + 1];
    if (!n) return;
    const wide = Math.max(s.half, n.half);
    const narrow = Math.min(s.half, n.half);
    const nCeilY = n.ceil + n.elev;
    const nFloorY = FLOOR + n.elev;
    const top = Math.min(ceilY, nCeilY);
    const low = Math.max(ceilY, nCeilY);
    const floorHigh = Math.min(floorY, nFloorY);
    const floorLow = Math.max(floorY, nFloorY);
    const tint = tintAt(plan, s.to);
    if (wide > narrow) {
      surface('mw-wall', `translate3d(${-wide}px, ${top}px, ${s.to}px)`, wide - narrow, floorLow - top, s.to, s.to, tint, true);
      surface('mw-wall', `translate3d(${narrow}px, ${top}px, ${s.to}px)`, wide - narrow, floorLow - top, s.to, s.to, tint, true);
    }
    if (low > top) surface('mw-wall', `translate3d(${-narrow}px, ${top}px, ${s.to}px)`, narrow * 2, low - top, s.to, s.to, tint, true);
    if (floorLow > floorHigh) {
      surface('mw-riser', `translate3d(${-narrow}px, ${floorHigh}px, ${s.to}px)`, narrow * 2, floorLow - floorHigh, s.to, s.to, tint, true);
      const rampLen = rampLengthFor(s, n);
      const zNear = n.elev > s.elev ? s.to : s.to + rampLen;
      const zFar = n.elev > s.elev ? s.to - rampLen : s.to;
      const diag = Math.hypot(rampLen, floorY - nFloorY);
      const angleDeg = (Math.atan2(rampLen, floorY - nFloorY) * 180) / Math.PI;
      surface(
        'mw-ramp',
        `translate3d(${-narrow}px, ${nFloorY}px, ${zFar}px) rotateX(${angleDeg.toFixed(3)}deg)`,
        narrow * 2,
        diag,
        zNear,
        zFar,
        tint,
        false
      );
    }
  });

  // 突き当たりの闇（カメラと一緒に動く）
  const cap = el('mw-cap', world);
  cap.style.cssText = 'width:4000px;height:3400px';

  // 広間の真ん中に立つ図。層（枠・線・ノード）を進む向きにずらして置き、手前の層から順に通り抜ける
  const EMOTION_TONES = [
    { ja: '桃の花', en: 'Peach Blossom', x: 0.14, y: 0.25, z: 0.30, c1: '#F4A295', c2: '#FFC4BA' },
    { ja: 'レモンメレンゲ', en: 'Lemon Meringue', x: 0.29, y: 0.11, z: 0.68, c1: '#DCD900', c2: '#FEF08A' },
    { ja: '綿菓子', en: 'Cotton Candy', x: 0.39, y: 0.33, z: 0.20, c1: '#B6A9E3', c2: '#F1CCB1' },
    { ja: '抹茶と和三盆', en: 'Matcha & Wasanbon', x: 0.42, y: 0.44, z: 0.62, c1: '#99B37F', c2: '#B8E0A4' },
    { ja: '朝の窓辺', en: 'Morning Window', x: 0.59, y: 0.19, z: 0.28, c1: '#F5B7BF', c2: '#BAE6FD' },
    { ja: 'ライラックと雪', en: 'Lilac Snow', x: 0.77, y: 0.11, z: 0.68, c1: '#E2C9E5', c2: '#F5EEFA' },
    { ja: '北欧の霜柱', en: 'Nordic Frost', x: 0.89, y: 0.32, z: 0.24, c1: '#9EC1D6', c2: '#CFFAFE' },
    { ja: 'シーグラスの浜辺', en: 'Sea Glass Shore', x: 0.67, y: 0.37, z: 0.60, c1: '#8297FD', c2: '#4FD8E8' },
    { ja: '琥珀の夕暮れ', en: 'Amber Sunset', x: 0.12, y: 0.62, z: 0.66, c1: '#F2AF5C', c2: '#FCD34D' },
    { ja: 'テラコッタの中庭', en: 'Terracotta Courtyard', x: 0.33, y: 0.69, z: 0.26, c1: '#E48670', c2: '#FF9D80' },
    { ja: '黒と白い花', en: 'Black Blossom', x: 0.17, y: 0.85, z: 0.30, c1: '#FFB99E', c2: '#FFE4D6' },
    { ja: '夜を編む図書館', en: 'Midnight Library', x: 0.41, y: 0.82, z: 0.70, c1: '#CC6B79', c2: '#F3D56B' },
    { ja: '晴天の工作舎', en: 'Cobalt Workshop', x: 0.64, y: 0.64, z: 0.32, c1: '#EB576D', c2: '#7DD3FC' },
    { ja: '分光プリズムと黒曜石', en: 'Cyber Prism', x: 0.84, y: 0.78, z: 0.66, c1: '#38BDF8', c2: '#A5F3FC' }
  ];
  const isEnDoc = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const stands: StandRef[] = [];
  plan.stands.forEach(s => {
    const fig = figures[s.figure];
    if (!fig) return;
    const g = standGeometry(fig);
    const elev = sectionAt(plan, s.z).elev;
    const tint = tintAt(plan, s.z);
    if (fig.isEmotionMap) {
      const boxW = 360, boxH = 240, boxD = 340;
      const cube = el(`mw-stand mw-emotion-cube is-${figureAppearance}`, world);
      cube.style.cssText = `transform:translate3d(${-boxW - 12}px, ${FLOOR - boxH * 2 - 140 + elev}px, ${s.z}px);width:${boxW * 2 + 24}px;height:${boxH * 2}px;--tint:${tint}`;
      const makeBox = (ox: number, oy: number, oz: number) => {
        const box = el('mw-ec-box', cube);
        box.style.cssText = `transform:translate3d(${ox}px,${oy}px,${oz}px);width:${boxW}px;height:${boxH}px;transform-style:preserve-3d;position:absolute;left:0;top:0;`;
        const face = (cls: string, tr: string, w: number, h: number) => {
          const f = el(`mw-ec-face ${cls}`, box);
          f.style.cssText = `width:${w}px;height:${h}px;transform:${tr}`;
        };
        face('is-front', `translate3d(0,0,${boxD / 2}px)`, boxW, boxH);
        face('is-back', `translate3d(0,0,${-boxD / 2}px) rotateY(180deg)`, boxW, boxH);
        face('is-left', `translate3d(${-boxD / 2}px,0,0) rotateY(-90deg)`, boxD, boxH);
        face('is-right', `translate3d(${boxW - boxD / 2}px,0,0) rotateY(90deg)`, boxD, boxH);
        face('is-top', `translate3d(0,${-boxD / 2}px,0) rotateX(90deg)`, boxW, boxD);
        face('is-bottom', `translate3d(0,${boxH - boxD / 2}px,0) rotateX(-90deg)`, boxW, boxD);
      };
      // 添付画像と同じ互い違いの 4 象限ボックス（左柱=手前、右柱=少し右奥上）
      makeBox(0, 0, 0);
      makeBox(0, boxH, 0);
      makeBox(boxW + 24, -36, -150);
      makeBox(boxW + 24, boxH - 36, -150);
      // 14 の配色球体と中央寄せラベル
      EMOTION_TONES.forEach(t => {
        const isRight = t.x >= 0.5;
        const isTop = t.y >= 0.5;
        const lx = isRight ? (t.x - 0.5) * 2 : t.x * 2;
        const ly = isTop ? (t.y - 0.5) * 2 : t.y * 2;
        const ox = isRight ? boxW + 24 : 0;
        const oy = (isTop ? 0 : boxH) + (isRight ? -36 : 0);
        const oz = isRight ? -150 : 0;
        const px = ox + 36 + lx * (boxW - 72);
        const py = oy + 36 + (1 - ly) * (boxH - 72);
        const pz = oz + (t.z - 0.5) * (boxD - 80);
        const node = el('mw-ec-sphere', cube);
        node.style.cssText = `transform:translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,${pz.toFixed(1)}px)`;
        node.innerHTML = `<i style="background:radial-gradient(circle at 32% 28%,#fff 0%,${t.c2} 28%,${t.c1} 74%,rgba(10,15,28,.88) 100%);box-shadow:0 0 26px ${t.c2}88"></i><b>${isEnDoc ? t.en : t.ja}</b>`;
      });
      stands.push({ el: cube, z: s.z, baseZ: s.z, dz: 0, elev, key: -1, frame: true, figure: s.figure });
      return;
    }
    const place = (node: HTMLElement, dz: number, role?: 'lines' | 'nodes' | 'all', img?: HTMLImageElement) => {
      node.style.cssText = `transform:translate3d(${g.x}px, ${g.top + elev}px, ${s.z + dz}px) scale(0.5);width:${g.fw * 2}px;height:${g.fh * 2}px;--tint:${tint}`;
      stands.push({ el: node, z: s.z + dz, baseZ: s.z, dz, elev, key: -1, frame: dz === 0, figure: s.figure, role, img });
    };
    const frame = el(`mw-stand mw-fig-frame is-${figureAppearance}`, world);
    frame.dataset.label = s.label;
    const caption = document.createElement('span');
    caption.textContent = s.caption;
    frame.appendChild(caption);
    place(frame, 0);
    fig.layers.forEach(layer => {
      const node = el(`mw-stand mw-fig-layer is-${layer.role}`, world);
      const img = document.createElement('img');
      img.src = layer.url;
      img.alt = '';
      img.decoding = 'async';
      img.style.cssText = `left:${STAND.padX * 2}px;top:${STAND.padTop * 2}px;width:${g.iw * 2}px;height:${g.ih * 2}px`;
      node.appendChild(img);
      place(node, layer.role === 'nodes' ? STAND.dzNodes : STAND.dzLines, layer.role, img);
    });
  });

  // 突き当たりの壁
  const last = plan.sections[plan.sections.length - 1];
  const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';
  const end = el(
    'mw-endwall',
    world,
    isEn ? '<b>END</b><span>R to Entrance / Esc to Exit</span>' : '<b>おわり</b><span>R で入口へ戻る ／ Esc で終える</span>'
  );
  end.style.cssText = `transform:translate3d(${-last.half}px, ${last.ceil + last.elev}px, ${plan.end}px);width:${last.half * 2}px;height:${FLOOR - last.ceil}px;--tint:${TINTS[zoneAt(plan, plan.end) % TINTS.length]}`;

  // 壁のパーツ
  const parts: PartRef[] = plan.parts.map(p => {
    const sec = sectionAt(plan, p.z);
    const node = el(partClass(p.kind), world);
    fillPart(node, p.kind, p.html, p.w, p.label, p.small);
    node.style.setProperty('--tint', tintAt(plan, p.z));
    return { el: node, kind: p.kind, side: p.side, z: p.z, y: p.y + sec.elev, w: p.w, half: sec.half, key: '', vis: true };
  });

  // 通路の真ん中に立つ門（表紙と章の見出し）
  const gates: GateRef[] = plan.gates.map((g, i) => {
    const s = sectionAt(plan, g.z);
    const gh = 776;
    const gy = FLOOR + s.elev - gh - 2;
    const tint = TINTS[(i + 1) % TINTS.length];
    const node = el(`mw-gate${g.cover ? ' is-cover' : ''}`, world, '<div class="mw-scrim"></div><div class="mw-label"><div class="mw-no"></div><div class="mw-title"></div></div>');
    (node.querySelector('.mw-no') as HTMLElement).textContent = g.no;
    const title = node.querySelector('.mw-title') as HTMLElement;
    title.textContent = g.title;
    if (g.sub) {
      const sub = document.createElement('div');
      sub.className = 'mw-sub';
      sub.textContent = g.sub;
      node.querySelector('.mw-label')?.appendChild(sub);
    }
    node.style.cssText = `transform:translate3d(${-s.half + 2}px, ${gy}px, ${g.z}px);width:${s.half * 2 - 4}px;height:${gh}px;--tint:${tint}`;
    fitTitle(title, g.cover ? 136 : 204);
    return { el: node, z: g.z, tint, key: -1 };
  });

  // 画面に固定の表示（門を通り抜ける瞬間の光、進み具合、今いる章）
  const flash = el('mw-flash', root);
  const progress = el('mw-progress', root, '<i></i>');
  const zone = el('mw-zone', root);

  return { root, view, world, cap, flash, bar: progress.firstElementChild as HTMLElement, zone, tiles, parts, stands, gates, zoneKey: -1 };
}

// 視点の距離（perspective）。縦長の狭い画面では、視野が狭くなりすぎないよう縮める（DTP-MWLK-060）
export function perspectiveFor(fov: number, width: number): number {
  return fov * clamp(width / 1290, 0.45, 1);
}

function standGeometry(fig: FigureImages): { iw: number; ih: number; fw: number; fh: number; x: number; top: number } {
  const k = Math.min(STAND.maxW / fig.width, STAND.maxH / fig.height);
  const iw = fig.width * k;
  const ih = fig.height * k;
  const fw = iw + STAND.padX * 2;
  const fh = ih + STAND.padTop + STAND.padBottom;
  return { iw, ih, fw, fh, x: -fw / 2, top: STAND.bottom - fh };
}

// T キー等で外観を切り替えたときに、広間の図板の色と図の画像を新しい外観へ合わせる（#129）
export function updateStandAppearance(refs: WorldRefs, figures: FigureImages[], figureAppearance: 'dark' | 'light'): void {
  const isLight = figureAppearance === 'light';
  for (const st of refs.stands) {
    const fig = figures[st.figure];
    if (st.frame) {
      st.el.classList.toggle('is-light', isLight);
      st.el.classList.toggle('is-dark', !isLight);
    }
    if (!fig) continue;
    const g = standGeometry(fig);
    st.el.style.transform = `translate3d(${g.x}px, ${g.top + st.elev}px, ${st.baseZ + st.dz}px) scale(0.5)`;
    st.el.style.width = `${g.fw * 2}px`;
    st.el.style.height = `${g.fh * 2}px`;
    if (st.img) {
      const layer = fig.layers.find(l => l.role === st.role) || fig.layers[0];
      if (layer) st.img.src = layer.url;
      st.img.style.width = `${g.iw * 2}px`;
      st.img.style.height = `${g.ih * 2}px`;
    }
  }
}

export function updateWorld(refs: WorldRefs, plan: Plan, cam: Cam, P: number, reduced: boolean): void {
  refs.world.style.transform = `translateZ(${P}px) rotateX(${cam.pitch}deg) rotateY(${-cam.yaw}deg) translate3d(${-cam.x}px, ${-(cam.y + cam.bob)}px, ${-cam.z}px)`;

  // 門を通り抜ける瞬間の光
  let flashA = 0;
  let flashTint = TINTS[0];
  for (const g of refs.gates) {
    const f = 1 - Math.abs(cam.z - g.z) / 170;
    if (f > flashA) {
      flashA = f;
      flashTint = g.tint;
    }
  }

  // 突き当たりの闇と、各面の霞み（タイル自身の opacity だけを更新する）
  refs.cap.style.transform = `translate3d(-2000px, ${cam.y - 2600}px, ${cam.z - FOG1}px)`;
  for (const t of refs.tiles) {
    const limit = t.wall ? cam.z - 20 : cam.z + 220;
    const vis = t.near > cam.z - FOG1 - 100 && t.far < limit;
    if (vis !== t.vis) {
      t.vis = vis;
      t.el.style.display = vis ? '' : 'none';
    }
    if (!vis) continue;
    const key = Math.round(fogA(cam.z - (t.near + t.far) * 0.5) * 40);
    if (key !== t.key) {
      t.key = key;
      t.el.style.opacity = ((40 - key) / 40).toFixed(3);
    }
  }

  // 手前にある門が閉じている間は、その奥の文字や次の門が重なって読みづらくならないよう控えめにする
  const behindGate = (z: number, minA: number) => {
    let m = 1;
    for (const g of refs.gates) {
      if (cam.z > g.z && g.z > z) m *= lerp(1, minA, smooth(60, 220, cam.z - g.z));
    }
    return m;
  };

  // 広間の図。層ごとに、近づくと消える（手前の層から順に通り抜ける）
  for (const s of refs.stands) {
    const d = cam.z - s.z;
    const o = d <= 0 ? 0 : smooth(60, 320, d) * (1 - fogA(d)) * behindGate(s.z, 0.04);
    const key = Math.round(o * 100);
    if (key !== s.key) {
      s.key = key;
      s.el.style.display = key > 0 ? '' : 'none';
      s.el.style.opacity = (key / 100).toFixed(2);
    }
  }

  // 図の枠が手前に立っている間は、その奥の門の文字が枠に透けて重ならないよう控えめにする
  const behindStand = (z: number) => {
    let m = 1;
    for (const s of refs.stands) {
      if (s.frame && s.key > 0 && cam.z > s.z && s.z > z) m *= 1 - 0.9 * (s.key / 100);
    }
    return m;
  };

  // 壁のパーツ。種類ごとに、現れる距離と奥行きが違う
  for (const p of refs.parts) {
    const a = cam.z - p.z;
    const vis = a < FOG1 && a > -p.w * 0.75;
    if (vis !== p.vis) {
      p.vis = vis;
      p.el.style.display = vis ? '' : 'none';
    }
    if (!vis) continue;
    const k = KIND[p.kind];
    const r = 1 - smooth(k.range[1], k.range[0], a);
    const pass = smooth(-p.w * 0.75, -60, a);
    const o = r * pass * (1 - fogA(Math.max(0, a + p.w * 0.5))) * behindGate(p.z, 0.04);
    const key = `${Math.round(o * 100)}|${Math.round(r * 100)}`;
    if (key !== p.key) {
      p.key = key;
      p.el.style.opacity = o.toFixed(2);
      p.el.style.transform = partTransform(p, k.off, r, reduced);
    }
  }

  // 門。近づくと文字が消え、紗幕が開く
  for (const g of refs.gates) {
    const d = cam.z - g.z;
    const far = (1 - fogA(Math.max(0, d))) * behindGate(g.z, 0) * behindStand(g.z);
    const o = d <= 0 ? 0 : smooth(40, 280, d) * far;
    const key = Math.round(o * 100);
    if (key !== g.key) {
      g.key = key;
      g.el.style.display = d <= 20 || d > FOG1 || key <= 0 ? 'none' : '';
      g.el.style.opacity = (key / 100).toFixed(2);
    }
  }

  refs.flash.style.setProperty('--flash', flashTint);
  refs.flash.style.opacity = reduced ? '0' : (Math.max(0, flashA) * 0.34).toFixed(3);
  refs.bar.style.width = `${(clamp((plan.start - cam.z) / (plan.start - plan.end - 520), 0, 1) * 100).toFixed(2)}%`;
  const zoneNo = zoneAt(plan, cam.z);
  if (zoneNo !== refs.zoneKey) {
    refs.zoneKey = zoneNo;
    refs.bar.style.background = `rgb(${TINTS[zoneNo % TINTS.length]})`;
    const g = plan.gates[zoneNo - 1];
    refs.zone.textContent = g ? (g.cover ? g.title : `${g.no}  ${g.title}`) : '';
  }
}
