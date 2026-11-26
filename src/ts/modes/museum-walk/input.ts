// ミュージアム・ウォークの入力（DD-MWLK-008）。ホイール・キー・ポインターを受け、カメラの位置と速さを動かす。
// キーは document の捕捉の段階で受け、扱ったキーは本体のショートカットに渡さない。
import { clamp, lerp, type Cam, type CameraValues } from './camera';

// 発表用のリモコンは → と PageDown を送る。1 回押しで歩幅だけ進む
const FWD = new Set(['ArrowUp', 'w', 'W', 'ArrowRight', ' ', 'PageDown', 'Enter']);
const BACK = new Set(['ArrowDown', 's', 'S', 'ArrowLeft', 'PageUp', 'Backspace']);
// 1 回押しとみなす長さ（ms）
const TAP_MS = 220;

export interface Input {
  held: Map<string, number>;
  detach(): void;
}

export interface InputHandlers {
  cam: Cam;
  camera(): CameraValues;
  // 歩く以外のキー（G・T・R・Esc など）。扱ったら true
  command(key: string): boolean;
}

export function attachInput(root: HTMLElement, h: InputHandlers): Input {
  const held = new Map<string, number>();
  const { cam } = h;

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey) return;
    if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
      if (e.key !== 'Escape') return;
    }
    const k = e.key;
    // 近寄り・離れる・戻る（#275）。Ctrl / Meta 併用時はブラウザ標準ズームを上書きしてアプリで受ける
    if (k === '+' || k === '=' || k === '-' || k === '_' || k === '0') {
      e.preventDefault();
      e.stopPropagation();
      const C = h.camera();
      if (k === '+' || k === '=') cam.zoomTarget = clamp(cam.zoomTarget + C.zoomKeyStep, C.zoomMin, C.zoomMax);
      else if (k === '-' || k === '_') cam.zoomTarget = clamp(cam.zoomTarget - C.zoomKeyStep, C.zoomMin, C.zoomMax);
      else cam.zoomTarget = 0;
      return;
    }
    if (e.ctrlKey || e.metaKey) return;
    const walk = FWD.has(k) || BACK.has(k);
    if (walk) {
      e.preventDefault();
      e.stopPropagation();
      cam.zoomTarget = 0;
      if (!e.repeat) held.set(k, performance.now());
      return;
    }
    if (e.repeat) return;
    if (h.command(k)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const onKeyUp = (e: KeyboardEvent) => {
    const t0 = held.get(e.key);
    if (t0 == null) return;
    held.delete(e.key);
    e.stopPropagation();
    // 短く 1 回押したとき（発表用のリモコンなど）は、一定の歩幅だけ進む
    if (performance.now() - t0 < TAP_MS) {
      const stride = h.camera().stride;
      if (FWD.has(e.key)) cam.vel = clamp(cam.vel + stride, -1800, 1800);
      if (BACK.has(e.key)) cam.vel = clamp(cam.vel - stride, -1800, 1800);
    }
  };
  const onBlur = () => held.clear();

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const C = h.camera();
      const dir = e.deltaY < 0 ? 1 : e.deltaY > 0 ? -1 : 0;
      if (dir !== 0) cam.zoomTarget = clamp(cam.zoomTarget + dir * C.zoomWheelStep, C.zoomMin, C.zoomMax);
      return;
    }
    const dy = clamp(e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY, -300, 300);
    if (dy !== 0) cam.zoomTarget = 0;
    // 上回し（deltaY < 0）で前進（+vel -> -z）、下回し（deltaY > 0）で後退とし、ズームイン・アウトの向きと揃える（#305）。係数は CAMERA_SPEC.wheelSpeed で独立調整可（#295）
    cam.vel = clamp(cam.vel - dy * h.camera().wheelSpeed, -1500, 1500);
  };

  let drag: null | { x: number; y: number; t: number; touch: boolean } = null;
  const onDown = (e: PointerEvent) => {
    if ((e.target as Element).closest('button, .mw-panel')) return;
    drag = { x: e.clientX, y: e.clientY, t: performance.now(), touch: e.pointerType !== 'mouse' };
    root.classList.add('is-dragging');
  };
  const onMove = (e: PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const now = performance.now();
    const dt = Math.max(8, now - drag.t) / 1000;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.t = now;
    // 指のスワイプは、画面の端から端まで動かさず短いことが多いため、マウスより大きく回す（#434）。
    // 範囲は、基本の向きと合わせて direct()（camera.ts）が収める。ここでは大きく外れないように抑えるだけ
    const C = h.camera();
    cam.userYaw = clamp(cam.userYaw + dx * (drag.touch ? C.lookTouch : C.lookMouse), -270, 270);
    if (drag.touch && Math.abs(dy) > Math.abs(dx)) {
      // 上へスワイプすると前へ進む（文書を読み進めるスクロールと同じ向き）
      cam.zoomTarget = 0;
      const step = -dy * C.swipeWalk;
      cam.z -= step;
      cam.vel = lerp(cam.vel, clamp(step / dt, -1500, 1500), 0.5);
    }
  };
  const onUp = () => {
    drag = null;
    root.classList.remove('is-dragging');
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('blur', onBlur);
  root.addEventListener('wheel', onWheel, { passive: false });
  root.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);

  return {
    held,
    detach() {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
      root.removeEventListener('wheel', onWheel);
      root.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      held.clear();
    }
  };
}

// 歩く。押している間は一定の速さ、離すと少し滑って止まる。入口と突き当たりの手前で止める
export function stepWalk(cam: Cam, held: Map<string, number>, dt: number, C: CameraValues, start: number, end: number, now: number): void {
  let drive = 0;
  let since = Infinity;
  for (const [k, t0] of held) {
    if (FWD.has(k)) drive = 1;
    else if (BACK.has(k)) drive = -1;
    else continue;
    since = Math.min(since, t0);
  }
  if (drive !== 0 && now - since >= TAP_MS) {
    cam.vel += (drive * C.speed - cam.vel) * (1 - Math.exp(-dt * 6));
  } else {
    cam.vel *= Math.exp(-dt * C.friction);
    if (Math.abs(cam.vel) < 2) cam.vel = 0;
  }
  const min = end + 520;
  if (Math.abs(cam.vel) > 20) cam.zoomTarget = 0;
  cam.z = clamp(cam.z - cam.vel * dt, min, start);
  if (cam.z === start && cam.vel < 0) cam.vel = 0;
  if (cam.z === min && cam.vel > 0) cam.vel = 0;
}
