// ミュージアム・ウォークのカメラワーク（DD-MWLK-005、DTP-MWLK-060）。
// 演出を見直すときは、このファイルの 3 つだけを直す: 値の表（CAMERA_SPEC）、場所ごとの指示（cues()）、組み合わせ方（direct()）。
// 空間の組み立てや入力には触れない。場所は割り付け（layout.ts の Plan）から読む。
import type { Plan, Section } from './layout';

export const clamp = (v: number, a: number, b: number): number => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
// a から b へ、なめらかに 0 から 1 へ変わる（a > b のときは逆向き）
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// 行の形: [キー, 説明, 初期値, 最小, 最大, 刻み]。1 要素だけの行は、調整のパネル（DD-MWLK-010）の見出し
export type SpecRow = [string] | [string, string, number, number, number, number];
export const CAMERA_SPEC: SpecRow[] = [
  ['視線'],
  ['stopYaw', '止まったときの向き（度。大きいほど壁に正対）', 50, 0, 85, 1],
  ['walkYaw', '歩いているときの向き（度）', 14, 0, 45, 1],
  ['walkSpeed', '「歩いている」とみなす速さ', 380, 100, 900, 10],
  ['ease', '向きと立つ位置の変わる速さ（大きいほど速い）', 2.6, 0.4, 8, 0.1],
  ['歩き'],
  ['speed', '歩く速さ', 520, 150, 1400, 10],
  ['friction', '止まるときの滑り（小さいほど長く滑る）', 2.4, 0.6, 6, 0.1],
  ['stride', '1 回押しの歩幅', 800, 200, 1800, 20],
  ['wheelSpeed', 'ホイールの反応量（前進・後退）', 4.8, 1, 12, 0.2],
  ['構え'],
  ['x', '立つ位置（左右。正は右寄り）', 90, -300, 380, 10],
  ['pitch', '見上げる角度（度）', 0, -8, 14, 0.5],
  ['fov', '視野（小さいほど広角）', 800, 420, 1500, 10],
  ['bob', '歩きの揺れ（px）', 6, 0, 20, 0.5],
  ['bobStep', '歩きの揺れの周期（距離 px）', 95, 30, 300, 5],
  ['門（通路の真ん中の見出し）'],
  ['gateFar', '正面を向き始める距離', 1350, 600, 3500, 50],
  ['gateNear', '正面を向き切る距離', 650, 100, 1600, 50],
  ['gateAfter', '通り抜けたあと、正面を保つ距離', 400, 0, 1500, 50],
  ['広間（真ん中に図が立つ）'],
  ['hallPitch', '見上げる角度（度）', 7, 0, 16, 0.5],
  ['小部屋（引用）'],
  ['alcoveX', '立つ位置（左右）', 190, -150, 270, 10],
  ['alcoveYaw', '止まったときの向き（度）', 68, 30, 85, 1],
  ['縦長の画面'],
  ['portraitYaw', '止まったときの向きの下限（度）', 52, 0, 85, 1],
  ['portraitX', '立つ位置の下限', 240, 0, 380, 10],
  ['近寄り'],
  ['zoomMin', '離れる限度（負で後ろへ引く）', -0.5, -1, 0, 0.05],
  ['zoomMax', '近寄る限度', 1, 0.2, 2, 0.05],
  ['zoomKeyStep', 'キー 1 回の近寄り幅', 0.25, 0.05, 0.5, 0.05],
  ['zoomWheelStep', 'ホイール 1 目盛りの近寄り幅', 0.225, 0.05, 0.6, 0.025],
  ['zoomShiftX', '近寄りで壁へ寄せる横の距離', 220, 0, 400, 10],
  ['zoomFov', '近寄りで狭める視野（perspective 増加量）', 220, 0, 500, 10],
  ['zoomEase', '近寄りの速さ（大きいほど速い）', 4.5, 1, 15, 0.5],
  ['zoomBob', '近寄り・戻りの上下の揺れ（px）', 18, 0, 36, 1],
  ['zoomBobSpeed', '近寄り・戻りの揺れの速さ', 4.5, 1, 24, 0.5]
];

// 動きを減らす設定のときに上書きする値（DD-MWLK-009）
export const REDUCED_MOTION: Record<string, number> = { friction: 6, stride: 420, bob: 0, zoomBob: 0, zoomEase: 60 };

export type CameraValues = Record<string, number>;

export function defaultCamera(): CameraValues {
  const values: CameraValues = {};
  for (const row of CAMERA_SPEC) if (row.length > 1) values[row[0]] = row[2] as number;
  return values;
}

// 書き出した値を読み込む。表にないキーと、数でない値は捨てる
export function loadCamera(target: CameraValues, values: Record<string, unknown>): void {
  for (const row of CAMERA_SPEC) {
    const key = row[0];
    const v = values[key];
    if (row.length > 1 && typeof v === 'number' && Number.isFinite(v)) target[key] = v;
  }
}

// カメラの状態。z は進む向き（-Z）の位置、vel は前へ進む速さ（px/s）、yaw は左向きが正（度）、userYaw はドラッグで見回した分
export interface Cam {
  z: number;
  x: number;
  yaw: number;
  pitch: number;
  userYaw: number;
  vel: number;
  bob: number;
  zoom: number;
  zoomTarget: number;
  zoomPhase: number;
  fov: number;
}

// 場所ごとの指示。w は効き具合（0〜1）。yaw・stopYaw・x・pitch は、その場所での向き・止まったときの向き・立つ位置・見上げる角度
interface Cue { w: number; yaw?: number; stopYaw?: number; x?: number; pitch?: number; }

export function sectionAt(plan: Plan, z: number): Section {
  return plan.sections.find(s => z <= s.from && z > s.to) || plan.sections[plan.sections.length - 1];
}

function cues(plan: Plan, C: CameraValues, z: number): Cue[] {
  const list: Cue[] = [];
  // 門の手前では、通路の真ん中へ寄って正面を向き、通り抜ける
  for (const g of plan.gates) {
    const d = z - g.z;
    const w = d >= 0
      ? 1 - smooth(C.gateNear, Math.max(C.gateFar, C.gateNear + 1), d)
      : 1 - smooth(0, Math.max(1, C.gateAfter), -d);
    list.push({ w, yaw: 0, x: 0 });
  }
  // 突き当たりの壁では、正面を向く
  list.push({ w: 1 - smooth(700, 1250, z - plan.end), yaw: 0, x: 0 });
  // 広間では真ん中で正面を向いて見上げ、小部屋では十分な視距離と正対角度をとる
  for (const s of plan.sections) {
    if (!s.name) continue;
    const w = smooth(s.from + 700, s.from, z) * (1 - smooth(s.to + 500, s.to, z));
    if (s.name === 'hall') list.push({ w, yaw: 0, x: 0, pitch: C.hallPitch });
    else list.push({ w, x: C.alcoveX, stopYaw: C.alcoveYaw });
  }
  return list;
}

// カメラの演出。歩いている間は先を見て、止まると壁を向く。その上に、場所ごとの指示を重ねる
export function direct(cam: Cam, dt: number, plan: Plan, C: CameraValues, gaze: boolean, portrait: boolean): void {
  const speed = Math.min(1, Math.abs(cam.vel) / C.walkSpeed);
  // 縦長の狭い画面では、壁の文字が左右とも欠けずに入るよう、向きと立つ位置を合わせる
  let stopYaw = portrait ? Math.max(C.stopYaw, C.portraitYaw) : C.stopYaw;
  let x = portrait ? Math.max(C.x, C.portraitX) : C.x;
  let pitch = C.pitch;
  const list = cues(plan, C, cam.z);
  for (const c of list) {
    if (c.w <= 0) continue;
    if (c.stopYaw != null) stopYaw = lerp(stopYaw, c.stopYaw, c.w);
    if (c.x != null) x = lerp(x, portrait && c.stopYaw != null ? Math.max(c.x, C.portraitX) : c.x, c.w);
    if (c.pitch != null) pitch = lerp(pitch, c.pitch, c.w);
  }
  let yaw = gaze ? lerp(stopYaw, C.walkYaw, speed) : 0;
  for (const c of list) {
    if (c.w > 0 && c.yaw != null) yaw = lerp(yaw, c.yaw, c.w);
  }
  const prevZoom = cam.zoom;
  const instantZoom = C.zoomEase >= 50;
  const zk = instantZoom ? 1 : 1 - Math.exp(-dt * C.zoomEase);
  cam.zoom += (cam.zoomTarget - cam.zoom) * zk;
  if (Math.abs(cam.zoomTarget - cam.zoom) < 0.001) cam.zoom = cam.zoomTarget;

  const targetYaw = clamp(yaw + cam.userYaw, -75, 88);
  // 近寄り: 壁を見ているときは向いている壁側へ横位置を寄せ、正面の門・広間では中央を保ったまま視野を狭める（#275）
  const wallDir = Math.sin((targetYaw * Math.PI) / 180);
  x -= cam.zoom * C.zoomShiftX * wallDir;

  const k = 1 - Math.exp(-dt * C.ease);
  const kx = instantZoom && Math.abs(cam.zoom - prevZoom) > 0.001 ? 1 : k;
  // 壁・柱を通り抜けない範囲（場所ごとの上限）
  const room = sectionAt(plan, cam.z).half - 130;
  cam.yaw += (targetYaw - cam.yaw) * k;
  cam.x += (clamp(x, -room, room) - cam.x) * kx;
  cam.pitch += (pitch - cam.pitch) * k;
  cam.fov = clamp(C.fov + cam.zoom * C.zoomFov, 360, 2200);

  const walkBob = C.bob * Math.sin((plan.start - cam.z) / Math.max(1, C.bobStep)) * Math.min(1, Math.abs(cam.vel) / 200);
  const zoomSpeed = Math.abs(cam.zoom - prevZoom) / Math.max(dt, 0.001);
  if (Math.abs(cam.zoomTarget - cam.zoom) > 0.002) {
    cam.zoomPhase += dt * C.zoomBobSpeed;
  } else {
    cam.zoomPhase = 0;
  }
  const zoomBob = C.zoomBob * Math.sin(cam.zoomPhase) * clamp(zoomSpeed * 1.4, 0, 1);
  cam.bob = walkBob + zoomBob;
}
