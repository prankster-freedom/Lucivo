// 文書の構造を、奥行き（z）に沿った空間の割り付けに変える（DD-MWLK-004、DTP-MWLK-020・030）。
// DOM に触らない純粋な処理。パーツの高さは、引数の measure() で測った値を受け取る。
// 進む向きは -Z。目の高さが y = 0、床が y = FLOOR。左の壁は x = -half。
import type { Outline, Block } from './outline';

export const FLOOR = 360;
// 段差の境目に掛けるスロープの基準奥行き（px）。区間長が短いときは区間の 40% を上限にする
export const RAMP_LEN = 220;

// 断面の形（DTP-MWLK-020）
export const SHAPES = {
  passage: { half: 520, ceil: -645 },
  hall: { half: 1100, ceil: -1500 },
  alcove: { half: 400, ceil: -460 }
};

// 区間ごとの色（DTP-MWLK-010）。手前にある門の数で決め、順に使う
export const TINTS = ['255, 236, 205', '255, 207, 122', '122, 208, 255', '141, 255, 200', '255, 158, 203'];

// 割り付けの寸法と間隔（px）
export const LAYOUT = {
  start: -300,          // 入口
  coverGap: 1000,       // 入口から表紙の門まで
  coverAfter: 220,      // 表紙の門から、導入のパーツまで
  gateBefore: 700,      // 前のパーツの奥の端から、次の門まで
  gateMin: 1300,        // 門と門の間の最小
  gateAfter: 640,       // 門から、章のパーツまで
  signAfter: 900,       // 門から、右の壁の章の札まで
  signY: -400,
  signW: 720,
  wallTop: -330,        // 列の上端
  wallBottom: 300,      // 列の下端
  colGap: 220,          // 列と列の間
  stackGap: 36,         // 列の中で、上下のパーツの間
  shadowDy: 26,         // 小見出しの影のずれ
  width: { h3: 860, body: 660, bullet: 640, plate: 760, aside: 590 },
  bulletStep: 280,      // 箇条書きの項目を、奥へずらす量
  bulletMinDy: 160,     // 箇条書きの項目を、下へずらす最小の量
  hallBefore: 200,
  hallLen: 1800,
  hallAfter: 300,
  alcoveBefore: 300,
  alcoveInset: 300,     // 小部屋に入ってから、銘板まで
  alcoveTail: 220,      // 銘板の奥の端から、小部屋の奥まで
  alcoveAfter: 300,
  asideMaxW: 760,       // 銘板を広げる上限（広げすぎると、止まったときに画面に収まらない）
  asideMaxH: 380,       // 銘板の高さの目安。越えるときは文字を小さくし、それでも越えるときは幅を広げる
  endAfter: 900,        // 最後のパーツから、突き当たりまで
  endMin: 1600          // 最後の門から、突き当たりまでの最小
};

export type PartKind = 'h3' | 'h3shadow' | 'body' | 'bullet' | 'plate' | 'aside' | 'number';

export interface Section { from: number; to: number; half: number; ceil: number; elev: number; name?: 'hall' | 'alcove'; }
export interface GatePlan { z: number; no: string; title: string; sub?: string; cover?: boolean; }
export interface StandPlan { z: number; label: string; caption: string; figure: number; }
// small は、長い引用の銘板の文字を小さくするとき
export interface PartPlan { kind: PartKind; side: 'L' | 'R'; z: number; y: number; w: number; html: string; label?: string; small?: boolean; }

export interface Plan {
  start: number;
  end: number;
  sections: Section[];
  gates: GatePlan[];
  stands: StandPlan[];
  parts: PartPlan[];
}

// パーツの高さ（空間の px）を返す。w はパーツの幅（壁に沿った長さ）
export type Measure = (kind: PartKind, html: string, w: number, label?: string, small?: boolean) => number;

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));
}

function textOf(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

export function layout(outline: Outline, measure: Measure): Plan {
  const L = LAYOUT;
  const gates: GatePlan[] = [];
  const stands: StandPlan[] = [];
  const parts: PartPlan[] = [];
  const specials: Section[] = [];

  // edge: これまでに置いたものの奥の端。gap: 次の列を始めるときに空ける間
  let edge = 0;
  let gap = 0;
  // 右の壁の札の奥の端（広間・小部屋・門は、札より奥に置く）
  let rightEdge = 0;
  let lastGate = 0;
  // 今の列（壁に沿った手前の端 colZ、幅 colW、次に積む高さ y）
  let inColumn = false;
  let colZ = 0;
  let colW = 0;
  let y = 0;
  // 箇条書きの階段（直前の項目）
  let stair: null | { listId: number; z: number; y: number; h: number } = null;
  let figureCount = 0;

  const put = (kind: PartKind, z: number, top: number, w: number, html: string, label?: string) => {
    parts.push({ kind, side: 'L', z, y: top, w, html, label });
    edge = Math.min(edge, z - w);
  };
  const newColumn = () => {
    colZ = edge - gap;
    gap = L.colGap;
    colW = 0;
    y = L.wallTop;
    inColumn = true;
    stair = null;
  };
  const closeColumn = () => {
    inColumn = false;
    stair = null;
  };
  const stack = (kind: PartKind, w: number, html: string) => {
    const h = measure(kind, html, w);
    if (!inColumn || (y + h > L.wallBottom && y > L.wallTop)) newColumn();
    put(kind, colZ, y, w, html);
    colW = Math.max(colW, w);
    y += h + L.stackGap;
    stair = null;
  };

  const placeBlocks = (blocks: Block[], chapterTitle: string) => {
    // 図の説明の文は、図の前の最も近い小見出し。なければ章の題名
    let caption = chapterTitle;
    for (const b of blocks) {
      if (b.kind === 'heading') {
        const w = L.width.h3;
        const h = measure('h3', b.html, w);
        if (!inColumn || y > L.wallTop) newColumn();
        put('h3shadow', colZ, y + L.shadowDy, w, b.html);
        put('h3', colZ, y, w, b.html);
        colW = Math.max(colW, w);
        y += h + L.stackGap;
        stair = null;
        caption = textOf(b.html);
      } else if (b.kind === 'body') {
        stack('body', L.width.body, b.html);
      } else if (b.kind === 'plate') {
        stack('plate', L.width.plate, b.html);
      } else if (b.kind === 'bullet') {
        const w = L.width.bullet;
        const h = measure('bullet', b.html, w);
        const listId = b.listId || 0;
        if (stair && stair.listId === listId) {
          let z = stair.z - L.bulletStep;
          let top = stair.y + Math.max(L.bulletMinDy, stair.h + 20);
          if (top + h > L.wallBottom) {
            newColumn();
            z = colZ;
            top = y;
          }
          put('bullet', z, top, w, b.html);
          colW = Math.max(colW, colZ - z + w);
          y = Math.max(y, top + h + L.stackGap);
          stair = { listId, z, y: top, h };
        } else {
          if (!inColumn || (y + h > L.wallBottom && y > L.wallTop)) newColumn();
          put('bullet', colZ, y, w, b.html);
          colW = Math.max(colW, w);
          stair = { listId, z: colZ, y, h };
          y += h + L.stackGap;
        }
      } else if (b.kind === 'figure') {
        // 広間を開き、真ん中に立体図を立てる。広間の壁にはパーツを置かない
        closeColumn();
        const from = Math.min(edge - L.hallBefore, rightEdge - 100);
        const to = from - L.hallLen;
        specials.push({ from, to, ...SHAPES.hall, elev: 0, name: 'hall' });
        figureCount++;
        stands.push({ z: (from + to) / 2, label: `EXHIBIT ${String(figureCount).padStart(2, '0')}`, caption, figure: b.figure || 0 });
        edge = to;
        gap = L.hallAfter;
      } else if (b.kind === 'quote') {
        // 狭く低い小部屋を開き、左の壁に引用の銘板を置く
        closeColumn();
        // 長い引用は、まず文字を小さくし、それでも高すぎるときだけ幅を広げる（広げすぎると、止まったときに画面に収まらない）
        let w = L.width.aside;
        let small = false;
        let h = measure('aside', b.html, w, b.label);
        if (h > L.asideMaxH) {
          small = true;
          h = measure('aside', b.html, w, b.label, true);
        }
        while (h > L.asideMaxH && w < L.asideMaxW) {
          w = Math.min(L.asideMaxW, w + 85);
          h = measure('aside', b.html, w, b.label, true);
        }
        const from = Math.min(edge - L.alcoveBefore, rightEdge - 100);
        const z = from - L.alcoveInset;
        const to = z - w - L.alcoveTail;
        specials.push({ from, to, ...SHAPES.alcove, elev: 0, name: 'alcove' });
        const top = Math.max(-340, Math.min(-80, -40 - h / 2));
        parts.push({ kind: 'aside', side: 'L', z, y: top, w, html: b.html, label: b.label, small });
        edge = to;
        gap = L.alcoveAfter;
      }
    }
  };

  // 表紙の門と導入
  const coverZ = L.start - L.coverGap;
  gates.push({ z: coverZ, no: 'MUSEUM WALK', title: outline.title || 'MUSEUM WALK', sub: outline.sub, cover: true });
  edge = coverZ;
  gap = L.coverAfter;
  rightEdge = coverZ;
  lastGate = coverZ;
  placeBlocks(outline.intro, outline.title);

  // 章ごとに、門・右の壁の札・パーツ
  for (const ch of outline.chapters) {
    closeColumn();
    const z = Math.min(edge - L.gateBefore, lastGate - L.gateMin, rightEdge - 200);
    gates.push({ z, no: ch.no, title: ch.title });
    parts.push({ kind: 'number', side: 'R', z: z - L.signAfter, y: L.signY, w: L.signW, html: `<b>${ch.no}</b><span>${escapeHtml(ch.title)}</span>` });
    rightEdge = z - L.signAfter - L.signW;
    lastGate = z;
    edge = z;
    gap = L.gateAfter;
    placeBlocks(ch.blocks, ch.title);
  }

  // 突き当たり
  closeColumn();
  const end = Math.min(edge - L.endAfter, rightEdge - 200, lastGate - L.endMin);

  // 区間を奥行きの順に途切れなく並べ、広間と小部屋の間を通路で埋める
  const sections: Section[] = [];
  let cur = 2000;
  for (const s of specials) {
    if (cur > s.from) sections.push({ from: cur, to: s.from, ...SHAPES.passage, elev: 0 });
    sections.push(s);
    cur = s.to;
  }
  sections.push({ from: cur, to: end, ...SHAPES.passage, elev: 0 });
  assignElevations(sections);

  return { start: L.start, end, sections, gates, stands, parts };
}

// 空間全体の高低差（起伏）を区間ごとに割り当てる（#306、DTP-MWLK-020）。
// 入口（先頭区間）を基準 0 とし、中盤（約 62%）まで徐々に下へ降り（+Y）、後半に向けて少し上へ戻る谷型の起伏にする。
function assignElevations(sections: Section[]): void {
  const n = sections.length;
  if (n <= 1) return;
  const pivot = Math.max(1, Math.round((n - 1) * 0.62));
  const baseStep = Math.max(36, Math.min(76, Math.round(320 / pivot)));
  let elev = 0;
  sections[0].elev = 0;
  for (let i = 1; i < n; i++) {
    const s = sections[i];
    if (i <= pivot) {
      const mul = s.name === 'hall' ? 1.15 : s.name === 'alcove' ? 0.85 : 1;
      const step = Math.round(baseStep * mul);
      elev = Math.min(360, elev + step);
    } else {
      const mul = s.name === 'hall' ? 0.8 : s.name === 'alcove' ? 0.6 : 0.7;
      const step = Math.max(28, Math.round(baseStep * mul));
      elev = Math.max(0, elev - step);
    }
    // 隣り合う区間で同値になった場合はわずかに差をつけて段差を保つ
    if (elev === sections[i - 1].elev) {
      elev = i <= pivot ? Math.min(360, elev + 36) : Math.max(0, elev - 36);
    }
    s.elev = elev;
  }
}

// 隣接区間 s -> n の境目に掛けるスロープの水平奥行き（px）
export function rampLengthFor(s: Section, n: Section): number {
  const hostLen = n.elev > s.elev ? n.from - n.to : s.from - s.to;
  return Math.max(60, Math.min(RAMP_LEN, Math.floor(hostLen * 0.4)));
}

// 指定した z 位置の床基準高さ（下向きが正）。スロープ区間では滑らかに補間する
export function elevationAt(plan: Plan, z: number): number {
  const secs = plan.sections;
  for (let i = 0; i < secs.length - 1; i++) {
    const s = secs[i];
    const n = secs[i + 1];
    if (s.elev === n.elev) continue;
    const len = rampLengthFor(s, n);
    if (n.elev > s.elev) {
      // 下りスロープ: z = s.to（手前・高） -> s.to - len（奥・低）
      if (z <= s.to && z >= s.to - len) {
        const t = (s.to - z) / len;
        return s.elev + (n.elev - s.elev) * t;
      }
    } else {
      // 上りスロープ: z = s.to + len（手前・低） -> s.to（奥・高）
      if (z <= s.to + len && z >= s.to) {
        const t = (s.to + len - z) / len;
        return s.elev + (n.elev - s.elev) * t;
      }
    }
  }
  const sec = secs.find(s => z <= s.from && z > s.to) || secs[secs.length - 1];
  return sec ? sec.elev : 0;
}

// その位置の手前にある門の数（区間の色の番号）
export function zoneAt(plan: Plan, z: number): number {
  return plan.gates.filter(g => g.z >= z).length;
}

export function tintAt(plan: Plan, z: number): string {
  return TINTS[zoneAt(plan, z) % TINTS.length];
}
