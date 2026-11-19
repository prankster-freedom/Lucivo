// ミュージアム・ウォーク（#63、FR-056, DD-MWLK-001〜011）。
// 文書を 1 本の連続した建築空間（回廊・広間・小部屋）に置き直し、歩いて読み進む。
// js/modes/museum-walk.js として別にビルドし、ヘッダーの「発表」のドロップダウンで選んだときだけ読み込む（NFR-006）。
// 本体のモジュールは import せず、enter(host) で受け取る host だけを使う（ARC-MODE-006）。
// Visualモードの DOM は読むだけで書き換えない。空間は <body> の直下の重ね（#museum-walk）に作る。
import { readOutline, isOutlineEmpty } from './outline';
import { layout, type Plan } from './layout';
import { CAMERA_SPEC, REDUCED_MOTION, defaultCamera, loadCamera, direct, clamp, type Cam, type CameraValues } from './camera';
import { buildWorld, createMeasurer, updateWorld, updateStandAppearance, perspectiveFor, type WorldRefs } from './world';
import { attachInput, stepWalk, type Input } from './input';
import { figureImages, revokeFigures, type FigureImages } from './figure';

// enter(host) で受け取る、本体の機能（doc/2.ARCHITECTURE.md 4.16 の host の表）。このモードが使う分だけを書く
interface ModeHost {
  showVisualCanvas(): Promise<HTMLElement | null>;
  restoreView(): void;
  isDocumentEmpty(): boolean;
  setLights(on: boolean): void;
  toast(message: string): void;
  appearance(): 'dark' | 'light';
  setAppearance(appearance: 'dark' | 'light'): Promise<HTMLElement | null>;
}

const EMPTY_MESSAGE = 'ミュージアム・ウォークで見せる文書がありません';
const APPEARANCE_KEY = 'lucivo-museum-walk-appearance';

function loadAppearance(): 'dark' | 'light' {
  try {
    return localStorage.getItem(APPEARANCE_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function saveAppearance(appearance: 'dark' | 'light'): void {
  try {
    localStorage.setItem(APPEARANCE_KEY, appearance);
  } catch {
    // storage 利用不可時は保存を省略する
  }
}

const S = {
  active: false,
  starting: false,
  host: null as ModeHost | null,
  root: null as HTMLElement | null,
  plan: null as Plan | null,
  refs: null as WorldRefs | null,
  input: null as Input | null,
  figuresByAppearance: {} as Partial<Record<'dark' | 'light', FigureImages[]>>,
  appearanceGen: 0,
  cam: null as Cam | null,
  camera: defaultCamera() as CameraValues,
  gaze: true,
  light: false,
  reduced: false,
  P: 800,
  raf: 0,
  last: 0,
  fullscreen: false,
  panel: null as HTMLElement | null
};

function isPortrait(): boolean {
  return window.innerWidth < window.innerHeight * 0.8;
}

function fit(): void {
  if (!S.refs) return;
  S.P = perspectiveFor(S.camera.fov, window.innerWidth);
  S.refs.view.style.perspective = `${S.P}px`;
}

function frame(now: number): void {
  if (!S.active || !S.cam || !S.plan || !S.refs || !S.input) return;
  const dt = Math.min(0.05, (now - S.last) / 1000);
  S.last = now;
  stepWalk(S.cam, S.input.held, dt, S.camera, S.plan.start, S.plan.end, now);
  direct(S.cam, dt, S.plan, S.camera, S.gaze, isPortrait());
  updateWorld(S.refs, S.plan, S.cam, S.P, S.reduced);
  S.raf = requestAnimationFrame(frame);
}

function setLight(on: boolean): void {
  S.light = on;
  S.root?.classList.toggle('is-light', on);
}

async function applyStandAppearance(target: 'dark' | 'light'): Promise<void> {
  const gen = ++S.appearanceGen;
  let figs = S.figuresByAppearance[target];
  if (!figs) {
    const host = S.host;
    if (!host) return;
    const source = await host.setAppearance(target);
    if (!S.active || gen !== S.appearanceGen || !source) return;
    figs = readOutline(source).figures.map(svg => figureImages(svg));
    if (!S.active || gen !== S.appearanceGen) {
      revokeFigures(figs);
      return;
    }
    S.figuresByAppearance[target] = figs;
  }
  if (!S.active || !S.refs) return;
  updateStandAppearance(S.refs, figs, target);
}

function backToEntrance(): void {
  if (!S.cam || !S.plan) return;
  S.cam.z = S.plan.start;
  S.cam.vel = 0;
  S.cam.userYaw = 0;
}

// 歩く以外のキー
function command(key: string): boolean {
  if (key === 'Escape') exit();
  else if (key === 'g' || key === 'G') S.gaze = !S.gaze;
  else if (key === 't' || key === 'T') {
    const next = !S.light;
    const nextAppearance = next ? 'light' : 'dark';
    saveAppearance(nextAppearance);
    setLight(next);
    void applyStandAppearance(nextAppearance);
  }
  else if (key === 'r' || key === 'R' || key === 'Home') backToEntrance();
  else if ((key === 'c' || key === 'C') && S.panel) S.panel.hidden = !S.panel.hidden;
  else return false;
  return true;
}

function buildChrome(root: HTMLElement): void {
  const hud = document.createElement('div');
  hud.className = 'mw-hud';
  hud.innerHTML = '<span class="mw-hint-wide">スクロール・↑ ↓・スワイプで歩く ／ ドラッグで見回す ／ G 視線の自動 ／ T 明暗 ／ R 入口へ ／ Esc 終了</span>'
    + '<span class="mw-hint-narrow">スワイプで歩く ・ ドラッグで見回す</span>';
  root.appendChild(hud);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'mw-exit';
  close.setAttribute('aria-label', 'ミュージアム・ウォークを終える');
  close.textContent = '✕';
  close.addEventListener('click', () => exit());
  root.appendChild(close);
}

// カメラワークの調整のパネル（DD-MWLK-010）。URL に museum-tune を含めて開いたときだけ作る。CAMERA_SPEC から作る
function buildPanel(root: HTMLElement): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'mw-panel';
  panel.hidden = true;
  const box = document.createElement('textarea');
  box.spellcheck = false;
  const sliders = new Map<string, { input: HTMLInputElement; out: HTMLOutputElement }>();
  const exportValues = () => {
    const o: CameraValues = {};
    for (const row of CAMERA_SPEC) if (row.length > 1) o[row[0]] = S.camera[row[0]];
    box.value = JSON.stringify(o);
  };
  const sync = () => {
    sliders.forEach((s, key) => {
      s.input.value = String(S.camera[key]);
      s.out.textContent = String(S.camera[key]);
    });
    exportValues();
    fit();
  };
  for (const row of CAMERA_SPEC) {
    if (row.length === 1) {
      const h = document.createElement('h4');
      h.textContent = row[0];
      panel.appendChild(h);
      continue;
    }
    const [key, label, , min, max, step] = row;
    const line = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = label;
    const out = document.createElement('output');
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.addEventListener('input', () => {
      S.camera[key] = Number(input.value);
      out.textContent = input.value;
      exportValues();
      fit();
    });
    // 矢印キーを、つまみではなく歩く操作に戻す
    input.addEventListener('change', () => input.blur());
    line.append(name, out, input);
    panel.appendChild(line);
    sliders.set(key, { input, out });
  }
  const buttons = document.createElement('div');
  buttons.className = 'mw-panel-buttons';
  const button = (text: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', () => {
      fn();
      b.blur();
    });
    buttons.appendChild(b);
  };
  button('コピー', () => {
    box.select();
    navigator.clipboard?.writeText(box.value).catch(() => {});
  });
  button('読み込む', () => {
    try {
      loadCamera(S.camera, JSON.parse(box.value));
    } catch {
      // 読めない値は無視する
    }
    sync();
  });
  button('初期値', () => {
    S.camera = defaultCamera();
    sync();
  });
  panel.append(buttons, box);
  panel.addEventListener('wheel', e => e.stopPropagation());
  root.appendChild(panel);
  sync();
  return panel;
}

/* ------------------------------------------------------------------------
   始める・終える（DD-MWLK-002）
   ------------------------------------------------------------------------ */
async function enter(host: ModeHost): Promise<boolean> {
  if (S.active || S.starting) return true;
  if (typeof window.matchMedia === 'function'
    && window.matchMedia('(pointer: coarse)').matches
    && Math.min(window.innerWidth, window.innerHeight) <= 768) {
    host.toast('ミュージアム・ウォークは現在スマホでは利用できません（PC でご利用ください）');
    return false;
  }
  if (host.isDocumentEmpty()) {
    host.toast(EMPTY_MESSAGE);
    return false;
  }
  S.starting = true;
  // 今の表示を覚えて Visualモードの Canvas 表示に切り替える（図の描画が終わるまで待つ）。戻すのは host.restoreView()
  const source = await host.showVisualCanvas();
  let outline = source ? readOutline(source) : null;
  if (!outline || isOutlineEmpty(outline)) {
    S.starting = false;
    host.restoreView();
    host.toast(EMPTY_MESSAGE);
    return false;
  }
  const appearance = loadAppearance();
  if (host.appearance() !== appearance) {
    const themed = await host.setAppearance(appearance);
    const themedOutline = themed ? readOutline(themed) : null;
    if (themedOutline) outline = themedOutline;
  }
  S.host = host;
  // 重ねの下の Visualモードは見えないため、図の光を止める
  host.setLights(false);

  const root = document.createElement('div');
  root.id = 'museum-walk';
  root.setAttribute('role', 'application');
  root.setAttribute('aria-label', 'ミュージアム・ウォーク');
  document.body.appendChild(root);
  document.documentElement.classList.add('is-museum-walk');
  S.root = root;
  setLight(appearance === 'light');
  S.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  S.camera = defaultCamera();
  if (S.reduced) Object.assign(S.camera, REDUCED_MOTION);
  S.gaze = true;

  const measurer = createMeasurer(root);
  S.plan = layout(outline, measurer.measure);
  measurer.dispose();
  const initialFigs = outline.figures.map(svg => figureImages(svg));
  S.figuresByAppearance = { [appearance]: initialFigs };
  S.refs = buildWorld(root, S.plan, initialFigs, appearance);
  buildChrome(root);
  S.panel = /museum-tune/.test(location.search + location.hash) ? buildPanel(root) : null;

  S.cam = { z: S.plan.start, x: S.camera.x, yaw: 0, pitch: 0, userYaw: 0, vel: 0, bob: 0 };
  S.input = attachInput(root, { cam: S.cam, camera: () => S.camera, command });
  window.addEventListener('resize', fit);
  fit();
  (document.activeElement as HTMLElement | null)?.blur?.();
  S.active = true;
  S.starting = false;
  S.last = performance.now();
  updateWorld(S.refs, S.plan, S.cam, S.P, S.reduced);
  S.raf = requestAnimationFrame(frame);

  const fullscreen = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  if (fullscreen) fullscreen.then(() => { if (S.active) S.fullscreen = true; }, () => {});
  return true;
}

function exit(): void {
  if (!S.active) return;
  S.active = false;
  cancelAnimationFrame(S.raf);
  S.input?.detach();
  S.input = null;
  window.removeEventListener('resize', fit);
  S.root?.remove();
  S.root = null;
  S.refs = null;
  S.panel = null;
  S.appearanceGen++;
  for (const figs of Object.values(S.figuresByAppearance)) {
    if (figs) revokeFigures(figs);
  }
  S.figuresByAppearance = {};
  document.documentElement.classList.remove('is-museum-walk');
  if (S.fullscreen && document.fullscreenElement) document.exitFullscreen().catch(() => {});
  S.fullscreen = false;
  // 表示（高速 / Visual、Split / Canvas、スクロール位置、光の演出のオン・オフ）を、enter() の前に戻す
  S.host?.restoreView();
}

/* ------------------------------------------------------------------------
   テストの入口（DD-MWLK-011）
   ------------------------------------------------------------------------ */
function info() {
  const plan = S.plan;
  return {
    active: S.active,
    z: S.cam ? S.cam.z : 0,
    yaw: S.cam ? S.cam.yaw : 0,
    x: S.cam ? S.cam.x : 0,
    start: plan ? plan.start : 0,
    end: plan ? plan.end : 0,
    appearance: S.light ? 'light' : 'dark',
    gaze: S.gaze,
    reducedMotion: S.reduced,
    gates: plan ? plan.gates.map(g => ({ z: g.z, no: g.no, title: g.title, cover: !!g.cover })) : [],
    sections: plan ? plan.sections.map(s => ({ name: s.name || 'passage', from: s.from, to: s.to })) : [],
    stands: plan ? plan.stands.length : 0,
    parts: plan ? plan.parts.map(p => ({ kind: p.kind, side: p.side, z: p.z, y: p.y, w: p.w })) : []
  };
}

// その位置へ移り、向きと立つ位置を、その場所の落ち着き先まで進める（テストと確認用）
function walkTo(z: number): void {
  if (!S.active || !S.cam || !S.plan || !S.refs) return;
  S.cam.z = clamp(z, S.plan.end + 520, S.plan.start);
  S.cam.vel = 0;
  for (let i = 0; i < 30; i++) direct(S.cam, 0.2, S.plan, S.camera, S.gaze, isPortrait());
  updateWorld(S.refs, S.plan, S.cam, S.P, S.reduced);
}

// 本体が読み込んだとき（発表のドロップダウンで選ばれたとき）に、自分を登録する。walkTo はテストが使う
(window as unknown as { LucivoModes: { register(id: string, mode: object): void } }).LucivoModes.register('museum-walk', { enter, exit, info, walkTo });
