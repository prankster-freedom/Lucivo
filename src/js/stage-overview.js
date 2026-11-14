import { prefersReducedMotion, suspendLights } from './stage-lights.js';

/* ==========================================================================
   俯瞰（ライトテーブル。DTP-SHOW-070）と光のポインター（DTP-SHOW-080）
   ========================================================================== */
const OVERVIEW = { widthRatio: 0.88, heightRatio: 0.78, gapVw: 1.6, minScale: 0.12, maxCols: 6, zoomMs: 340 };

export function createStageOverview(ctx) {
  const ov = { active: false, index: 0, busy: false };
  const pointer = { on: false, moved: false, x: 0, y: 0, frame: 0 };

  const overviewWrap = () => ctx.stageContainer().querySelector('.exhibition-wrap');
  const overviewScale = () => parseFloat(overviewWrap().style.getPropertyValue('--ov-s')) || 0.2;

  // 画面の幅と高さの両方に収まる縮小率が最も大きくなる列の数（1〜6）を選ぶ。下限を下回る場合はスクロールで見せる
  function layoutOverview() {
    const n = ctx.show.scenes.length;
    const gap = window.innerWidth * OVERVIEW.gapVw / 100;
    const fit = cols => {
      const rows = Math.ceil(n / cols);
      const byWidth = (window.innerWidth * OVERVIEW.widthRatio - gap * (cols - 1)) / cols / window.innerWidth;
      const byHeight = (window.innerHeight * OVERVIEW.heightRatio - gap * (rows - 1)) / rows / window.innerHeight;
      return Math.min(byWidth, byHeight);
    };
    let cols = 1;
    for (let c = 2; c <= Math.min(n, OVERVIEW.maxCols); c++) if (fit(c) > fit(cols)) cols = c;
    const wrap = overviewWrap();
    wrap.style.setProperty('--ov-cols', String(cols));
    wrap.style.setProperty('--ov-s', Math.max(OVERVIEW.minScale, fit(cols)).toFixed(4));
    wrap.style.setProperty('--ov-gap', `${gap.toFixed(1)}px`);
  }

  function selectTile(index) {
    ov.index = Math.max(0, Math.min(ctx.show.scenes.length - 1, index));
    ctx.show.scenes.forEach((scene, k) => scene.classList.toggle('is-ov-selected', k === ov.index));
    ctx.show.scenes[ov.index].scrollIntoView({ block: 'nearest' });
    ctx.updateHud();
  }

  // 全画面のシーンと一覧の縮小図の間を、transform の補間だけで動かす（toTile: 全画面 → 縮小図）
  function zoomTile(tile, toTile) {
    if (prefersReducedMotion() || !tile.animate) return Promise.resolve();
    tile.classList.add('is-ov-zooming');
    const rect = tile.getBoundingClientRect();
    const full = `translate(${-rect.left}px, ${-rect.top}px) scale(1)`;
    const small = `scale(${overviewScale()})`;
    const animation = tile.animate([{ transform: toTile ? full : small }, { transform: toTile ? small : full }], {
      duration: OVERVIEW.zoomMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: toTile ? 'none' : 'forwards'
    });
    return animation.finished.catch(() => {}).then(() => animation);
  }

  function openOverview() {
    if (!ctx.show.active || ov.active || ov.busy) return;
    if (ctx.curtain.active) ctx.setCurtain(false);
    if (ctx.show.auto) ctx.toggleAuto();
    setPointer(false);
    ov.active = true;
    suspendLights(true, ctx.currentScene());
    layoutOverview();
    ctx.stageContainer().scrollTop = 0;
    const wrap = overviewWrap();
    const scene = ctx.currentScene();
    wrap.classList.add('is-ov-entering');
    scene.classList.add('is-ov-zooming');
    document.documentElement.classList.add('is-stage-overview');
    ov.index = Math.max(0, Math.min(ctx.show.scenes.length - 1, ctx.show.index));
    ctx.show.scenes.forEach((s, k) => s.classList.toggle('is-ov-selected', k === ov.index));
    ctx.updateHud();
    zoomTile(scene, true).then(() => {
      wrap.classList.remove('is-ov-entering');
      scene.classList.remove('is-ov-zooming');
    });
  }

  // 俯瞰を閉じて index のシーンを出す。build は項目の表示数（'end' は全部）
  function closeOverview(index, build) {
    ov.active = false;
    document.documentElement.classList.remove('is-stage-overview');
    ctx.show.scenes.forEach(scene => {
      scene.classList.remove('is-ov-selected', 'is-ov-zooming');
      scene.getAnimations().forEach(a => a.cancel());
    });
    overviewWrap().classList.remove('is-ov-entering');
    // 別のシーンへ入るときは、通常の転換（光の帯と下からの登場）を見せる。縮小図と全画面では図の収め方が違い、
    // そのまま切り替えると図の大きさが跳ねるため、登場の動きで吸収する。元のシーンへ戻るときは図が収まっているので出さない
    const changed = index !== ctx.show.index;
    ctx.show.index = index;
    ctx.show.build = build === 'end' ? ctx.buildItems(ctx.show.scenes[index]).length : build;
    ctx.applyScene(changed);
    ctx.stageContainer().scrollTop = 0;
    suspendLights(false, ctx.currentScene());
  }

  // 一覧で選んだシーンへ、縮小図を全画面へ拡大して入る。一覧で見たままの姿（項目をすべて表示）で出す
  function openFromOverview(index) {
    if (!ov.active || ov.busy) return;
    selectTile(index);
    ov.busy = true;
    zoomTile(ctx.show.scenes[index], false).then(() => {
      ov.busy = false;
      closeOverview(index, index === ctx.show.index ? ctx.show.build : 'end');
    });
  }

  function toggleOverview() {
    if (ov.active) openFromOverview(ctx.show.index);
    else openOverview();
  }

  function onOverviewKey(event) {
    const cols = parseInt(overviewWrap().style.getPropertyValue('--ov-cols'), 10) || 1;
    const actions = {
      ArrowRight: () => selectTile(ov.index + 1), ArrowLeft: () => selectTile(ov.index - 1),
      ArrowDown: () => selectTile(ov.index + cols), ArrowUp: () => selectTile(ov.index - cols),
      Home: () => selectTile(0), End: () => selectTile(ctx.show.scenes.length - 1),
      Enter: () => openFromOverview(ov.index), ' ': () => openFromOverview(ov.index),
      // 閉じるときは、俯瞰を開く前のシーンへ戻る
      Escape: () => openFromOverview(ctx.show.index), o: () => openFromOverview(ctx.show.index), O: () => openFromOverview(ctx.show.index),
      t: ctx.toggleShowAppearance, T: ctx.toggleShowAppearance
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  // 位置の反映は 1 フレームに 1 回、CSS 変数と transform の書き換えだけで行い、レイアウトを読まない
  function paintPointer() {
    pointer.frame = 0;
    const layer = ctx.show.hud && ctx.show.hud.querySelector('.stage-pointer');
    if (!layer) return;
    layer.style.setProperty('--px', `${pointer.x}px`);
    layer.style.setProperty('--py', `${pointer.y}px`);
    layer.firstElementChild.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`;
  }

  function onPointerMove(event) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.moved = true;
    if (pointer.on && !pointer.frame) pointer.frame = requestAnimationFrame(paintPointer);
  }

  function setPointer(on) {
    pointer.on = Boolean(on) && ctx.show.active && !ov.active && !ctx.curtain.active;
    document.documentElement.classList.toggle('is-stage-pointer', pointer.on);
    if (pointer.on) {
      if (!pointer.moved) {
        pointer.x = window.innerWidth / 2;
        pointer.y = window.innerHeight / 2;
      }
      paintPointer();
    }
    ctx.updateHud();
  }

  function togglePointer() {
    setPointer(!pointer.on);
  }

  function clearOverviewProps() {
    const wrap = overviewWrap();
    if (wrap) ['--ov-cols', '--ov-s', '--ov-gap'].forEach(name => wrap.style.removeProperty(name));
  }

  return {
    ov,
    pointer,
    layoutOverview,
    selectTile,
    openOverview,
    closeOverview,
    openFromOverview,
    toggleOverview,
    onOverviewKey,
    onPointerMove,
    setPointer,
    togglePointer,
    clearOverviewProps
  };
}
