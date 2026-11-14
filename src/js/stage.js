// Visualモードの舞台演出。Visualモードに初めて入ったときに読み込み、高速モードの起動には影響させない（NFR-006）
//  - シグナル・ライト（FR-018）: 図の結線に重ねた Canvas に、上流から下流へ伝わる光を描く（stage-lights.js）
//  - 俯瞰・光のポインター（DTP-SHOW-070, 080）: stage-overview.js
//  - ステージ発表（FR-019）: 章を 1 シーンとして全画面でページ送りする
import {
  flows,
  buildPlan,
  prefersReducedMotion,
  mountLights,
  resetLights,
  suspendLights,
  clearLightsSuspendedFlag,
  setLightsEnabled,
  isLightsEnabled,
  seekLights,
  getLightPlans
} from './stage-lights.js';
import { createStageOverview } from './stage-overview.js';

const AUTO_DWELL = { scene: 7000, build: 2400, afterLight: 800 };
const SCENE_FIT = { maxScale: 2.4, bottomMargin: 108, minHeightRatio: 0.6, scrollRatio: 0.8 };
const HUD_IDLE_MS = 2600;

const show = { active: false, scenes: [], index: 0, build: 0, auto: false, autoLooped: false, timer: 0, idleTimer: 0, restore: null, hud: null };
const curtain = { active: false };

const stageContainer = () => document.getElementById('visual-stage-container');
const currentScene = () => show.scenes[show.index];
const buildItems = scene => (scene ? Array.from(scene.querySelectorAll('.vs-steps > li, .vs-points > li')) : []);

const overview = createStageOverview({
  show,
  curtain,
  stageContainer,
  currentScene,
  buildItems,
  updateHud,
  applyScene,
  setCurtain,
  toggleAuto,
  toggleShowAppearance
});
const { ov, pointer } = overview;

function buildHud() {
  const hud = document.createElement('div');
  hud.id = 'stage-hud';
  hud.className = 'stage-hud';
  hud.innerHTML = `
    <div class="stage-sweep" aria-hidden="true"></div>
    <div class="stage-hint">→ 次へ ／ ← 戻る ／ O 一覧 ／ L ポインター ／ B・Q 幕間 ／ A 自動進行 ／ T 明暗 ／ ? ショートカット一覧 ／ Esc 終了</div>
    <div class="stage-pointer" aria-hidden="true"><span class="stage-pointer-dot"></span></div>
    <div class="stage-curtain" aria-hidden="true">
      <div class="stage-curtain-inner">
        <span class="stage-curtain-orbit" aria-hidden="true"></span>
        <p class="stage-curtain-eyebrow">Q &amp; A / STANDBY</p>
        <h2 class="stage-curtain-title"></h2>
        <p class="stage-curtain-sub">章番号を押すとそのシーンへ直接戻ります（B / Q / Esc で復帰）</p>
        <div class="stage-curtain-chapters" role="navigation" aria-label="章へ戻る"></div>
      </div>
    </div>
    <div class="stage-hud-bar">
      <span class="stage-hud-title"></span>
      <span class="stage-hud-count"></span>
      <div class="stage-hud-actions">
        <button type="button" data-stage-action="prev" aria-label="前へ">←</button>
        <button type="button" data-stage-action="next" aria-label="次へ">→</button>
        <button type="button" data-stage-action="overview" aria-pressed="false">一覧</button>
        <button type="button" data-stage-action="pointer" aria-pressed="false">ポインター</button>
        <button type="button" data-stage-action="curtain" aria-pressed="false">幕間</button>
        <button type="button" data-stage-action="auto" aria-pressed="false">自動進行</button>
        <button type="button" data-stage-action="exit">終了</button>
      </div>
    </div>
    <div class="stage-hud-rail" aria-hidden="true"><span class="stage-hud-fill"></span></div>`;
  hud.addEventListener('click', event => {
    const pill = event.target.closest('.stage-curtain-pill[data-curtain-scene]');
    if (pill) {
      event.stopPropagation();
      const idx = parseInt(pill.dataset.curtainScene, 10);
      setCurtain(false);
      if (!Number.isNaN(idx) && idx >= 0 && idx < show.scenes.length) {
        goToScene(idx, idx === show.index ? show.build : 'end');
      }
      return;
    }
    const action = event.target.closest('[data-stage-action]');
    if (!action) return;
    event.stopPropagation();
    ({
      prev,
      next: () => next(),
      auto: toggleAuto,
      exit: exitShow,
      overview: overview.toggleOverview,
      pointer: overview.togglePointer,
      curtain: toggleCurtain
    })[action.dataset.stageAction]();
  });
  document.body.appendChild(hud);
  return hud;
}

// 図を舞台の残りの高さに収める。ただし文字の判読性の下限（NFR-005）より小さくはしない。収まらない分はスクロールする
function fitSceneDiagrams(scene) {
  scene.querySelectorAll('.exhibition-slab-split').forEach(updateSlabSplit);
  if (scene.classList.contains('exhibition-slab-split')) updateSlabSplit(scene);
  const stage = stageContainer();
  const stageBottomPad = stage ? (parseFloat(getComputedStyle(stage).paddingBottom) || 0) : 0;
  const effectiveBottomMargin = Math.max(SCENE_FIT.bottomMargin, stageBottomPad + 28);
  scene.querySelectorAll('.exhibition-viewport > svg').forEach(svg => {
    const viewBox = svg.viewBox && svg.viewBox.baseVal;
    if (!viewBox || !viewBox.width) return;
    svg.style.removeProperty('--scene-width');
    const host = svg.parentElement;
    const style = getComputedStyle(host);
    const availableWidth = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const top = host.getBoundingClientRect().top + parseFloat(style.paddingTop);
    const remaining = window.innerHeight - top - parseFloat(style.paddingBottom) - effectiveBottomMargin;
    const isSplit = Boolean(svg.closest('.exhibition-slab-split'));
    const availableHeight = isSplit
      ? Math.max(160, remaining)
      : Math.max(remaining, window.innerHeight * SCENE_FIT.minHeightRatio);
    const readable = (parseFloat(svg.style.minWidth) || 0) / viewBox.width;
    const scale = Math.max(readable, Math.min(availableWidth / viewBox.width, availableHeight / viewBox.height, SCENE_FIT.maxScale));
    svg.style.setProperty('--scene-width', `${Math.round(viewBox.width * scale)}px`);
  });
}

function applyBuild(scene) {
  const items = buildItems(scene);
  items.forEach((li, idx) => {
    li.classList.toggle('is-built', idx < show.build);
    li.classList.toggle('is-spotlight', idx === show.build - 1);
    li.parentElement.classList.add('is-building');
  });
}

function updateHud() {
  const { hud, scenes } = show;
  const index = ov.active ? ov.index : show.index;
  const scene = scenes[index];
  if (!hud || !scene) return;
  const heading = scene.querySelector('h2 span:last-child, h1');
  hud.querySelector('.stage-hud-title').textContent = heading ? heading.textContent.trim() : '';
  hud.querySelector('.stage-hud-count').textContent = `${String(index + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
  hud.querySelector('.stage-hud-fill').style.transform = `scaleX(${scenes.length > 1 ? (index + 1) / scenes.length : 1})`;
  const auto = hud.querySelector('[data-stage-action="auto"]');
  auto.setAttribute('aria-pressed', String(show.auto));
  auto.classList.toggle('is-active', show.auto);
  [['overview', ov.active], ['pointer', pointer.on], ['curtain', curtain.active]].forEach(([name, on]) => {
    const button = hud.querySelector(`[data-stage-action="${name}"]`);
    if (!button) return;
    button.setAttribute('aria-pressed', String(on));
    button.classList.toggle('is-active', on);
  });
  document.documentElement.classList.toggle('is-stage-ambient', Boolean(show.active && show.auto && show.autoLooped && show.index === 0));
}

function replaySceneEntrance(scene) {
  scene.classList.remove('is-scene-in');
  show.hud.classList.remove('is-sweeping');
  void scene.offsetWidth;
  scene.classList.add('is-scene-in');
  show.hud.classList.add('is-sweeping');
}

function applyScene(animate) {
  const scene = currentScene();
  if (!scene) return;
  show.scenes.forEach(s => {
    s.classList.toggle('is-scene', s === scene);
    if (s !== scene) s.classList.remove('is-scene-in');
  });
  applyBuild(scene);
  fitSceneDiagrams(scene);
  if (animate) {
    stageContainer().scrollTop = 0;
    replaySceneEntrance(scene);
  }
  updateHud();
  scheduleAuto();
}

function goToScene(index, build) {
  show.index = index;
  show.build = build === 'end' ? buildItems(show.scenes[index]).length : build;
  applyScene(true);
}

// 画面に収まらない章は、次の章へ進む前に残りをスクロールで見せる。動かしたら true を返す
function scrollScene(direction) {
  const stage = stageContainer();
  const room = direction > 0 ? stage.scrollHeight - stage.clientHeight - stage.scrollTop : stage.scrollTop;
  if (room <= 4) return false;
  stage.scrollBy({ top: direction * stage.clientHeight * SCENE_FIT.scrollRatio, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  return true;
}

function next(loop) {
  const items = buildItems(currentScene());
  if (show.build < items.length) {
    show.build += 1;
    applyBuild(currentScene());
    scheduleAuto();
  } else if (scrollScene(1)) {
    scheduleAuto();
  } else if (show.index < show.scenes.length - 1) {
    show.autoLooped = false;
    goToScene(show.index + 1, 0);
  } else if (loop) {
    show.autoLooped = true;
    goToScene(0, 0);
  }
}

function prev() {
  show.autoLooped = false;
  if (show.build > 0) {
    show.build -= 1;
    applyBuild(currentScene());
    scheduleAuto();
  } else if (scrollScene(-1)) {
    scheduleAuto();
  } else if (show.index > 0) {
    goToScene(show.index - 1, 'end');
  }
}

function sceneDwell(scene) {
  if (show.build < buildItems(scene).length) return AUTO_DWELL.build;
  // 図のある章は、光が図を一巡してから次へ進む
  const cycles = Array.from(scene.querySelectorAll('.exhibition-viewport > svg')).map(svg => {
    const flow = flows.get(svg);
    if (flow && !flow.plan && svg.getScreenCTM()) buildPlan(flow);
    return flow && flow.plan ? flow.plan.cycle * 1000 + AUTO_DWELL.afterLight : 0;
  });
  return Math.max(AUTO_DWELL.scene, ...cycles);
}

function scheduleAuto() {
  clearTimeout(show.timer);
  if (!show.active || !show.auto) return;
  show.timer = setTimeout(() => next(true), sceneDwell(currentScene()));
}

function toggleAuto() {
  show.auto = !show.auto;
  if (!show.auto) show.autoLooped = false;
  updateHud();
  scheduleAuto();
}

function renderCurtainChapters() {
  if (!show.hud) return;
  const firstHeading = show.scenes[0] && show.scenes[0].querySelector('h1, h2 span:last-child');
  const titleEl = show.hud.querySelector('.stage-curtain-title');
  if (titleEl) titleEl.textContent = firstHeading ? firstHeading.textContent.trim() : 'Lucivo Presentation';
  const nav = show.hud.querySelector('.stage-curtain-chapters');
  if (!nav) return;
  nav.innerHTML = show.scenes.map((scene, idx) => {
    const heading = scene.querySelector('h2 span:last-child, h1');
    const label = heading ? heading.textContent.trim() : `Scene ${idx}`;
    const no = String(idx).padStart(2, '0');
    const activeClass = idx === show.index ? ' is-current' : '';
    return `<button type="button" class="stage-curtain-pill${activeClass}" data-curtain-scene="${idx}" title="${escapeHtml(label)}"><span class="stage-curtain-pill-no">${no}</span><span class="stage-curtain-pill-label">${escapeHtml(label)}</span></button>`;
  }).join('');
}

function setCurtain(on) {
  const willActive = Boolean(on) && show.active;
  if (willActive === curtain.active) return;
  if (willActive) {
    if (ov.active) overview.closeOverview(show.index, show.build);
    if (show.auto) toggleAuto();
    overview.setPointer(false);
    curtain.active = true;
    suspendLights(true, currentScene());
    renderCurtainChapters();
    document.documentElement.classList.add('is-stage-curtain');
    show.hud?.querySelector('.stage-curtain')?.setAttribute('aria-hidden', 'false');
  } else {
    curtain.active = false;
    document.documentElement.classList.remove('is-stage-curtain');
    show.hud?.querySelector('.stage-curtain')?.setAttribute('aria-hidden', 'true');
    if (!ov.active) suspendLights(false, currentScene());
  }
  updateHud();
}

function toggleCurtain() {
  setCurtain(!curtain.active);
}

function wakeHud() {
  document.documentElement.classList.remove('is-stage-idle');
  clearTimeout(show.idleTimer);
  show.idleTimer = setTimeout(() => document.documentElement.classList.add('is-stage-idle'), HUD_IDLE_MS);
}

function onShowKey(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  if (typeof isModalOpen === 'function' && isModalOpen('shortcut-modal')) {
    if (event.key === 'Escape' || event.key === '?') {
      event.preventDefault();
      event.stopPropagation();
      setModalOpen('shortcut-modal', false);
    }
    return;
  }
  if (event.key === '?') {
    event.preventDefault();
    event.stopPropagation();
    if (typeof setModalOpen === 'function') setModalOpen('shortcut-modal', true);
    return;
  }
  if (curtain.active) {
    if (['b', 'B', 'q', 'Q', 'Escape'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      setCurtain(false);
    } else if (event.key === 't' || event.key === 'T') {
      event.preventDefault();
      event.stopPropagation();
      toggleShowAppearance();
    } else if (event.key === 'o' || event.key === 'O') {
      event.preventDefault();
      event.stopPropagation();
      setCurtain(false);
      overview.openOverview();
    }
    return;
  }
  if (ov.active) {
    overview.onOverviewKey(event);
    return;
  }
  const actions = {
    ArrowRight: () => next(), ArrowDown: () => next(), PageDown: () => next(), ' ': () => next(), Enter: () => next(),
    ArrowLeft: prev, ArrowUp: prev, PageUp: prev, Backspace: prev,
    Home: () => { show.autoLooped = false; goToScene(0, 0); },
    End: () => { show.autoLooped = false; goToScene(show.scenes.length - 1, 'end'); },
    a: toggleAuto, A: toggleAuto,
    t: toggleShowAppearance, T: toggleShowAppearance,
    o: overview.toggleOverview, O: overview.toggleOverview,
    l: overview.togglePointer, L: overview.togglePointer,
    b: toggleCurtain, B: toggleCurtain,
    q: toggleCurtain, Q: toggleCurtain,
    Escape: exitShow
  };
  const action = actions[event.key];
  if (!action) return;
  event.preventDefault();
  event.stopPropagation();
  action();
}

function onShowClick(event) {
  if (ov.active) {
    event.stopPropagation();
    event.preventDefault();
    const tile = show.scenes.find(scene => scene.contains(event.target));
    if (tile) overview.openFromOverview(show.scenes.indexOf(tile));
    return;
  }
  if (event.target.closest('a, button')) return;
  event.stopPropagation();
  next();
}

function onFullscreenChange() {
  if (show.active && show.restore.fullscreen && !document.fullscreenElement) exitShow();
}

function toggleShowAppearance() {
  document.getElementById('btn-theme-toggle').click();
}

function collectScenes() {
  const wrap = stageContainer().querySelector('.exhibition-wrap');
  return wrap ? Array.from(wrap.querySelectorAll(':scope > .exhibition-hero, :scope > .exhibition-slab')) : [];
}

// 発表中に明暗を切り替えると図の DOM が作り直されるため、シーンを取り直す
function refreshScenes() {
  show.scenes = collectScenes();
  show.index = Math.min(show.index, Math.max(0, show.scenes.length - 1));
  applyScene(false);
  if (ov.active && show.scenes.length) {
    overview.layoutOverview();
    overview.selectTile(ov.index);
  }
}

function enterShow() {
  if (show.active) return;
  const scroller = document.getElementById('preview-scroll');
  show.restore = { appearance: state.appearance, viewMode: state.viewMode, isVisualMode: state.isVisualMode, scrollTop: scroller.scrollTop, fullscreen: false };
  if (!state.isVisualMode) {
    const btnVisual = document.getElementById('btn-visual-mode');
    if (btnVisual) btnVisual.click();
  }
  if (state.viewMode !== 'canvas') document.querySelector('[data-view-mode="canvas"]').click();
  // 舞台は暗転から始める。Dark の加算で光が本来の輝きになる（DTP-SHOW-010）
  if (state.appearance !== 'dark') toggleShowAppearance();

  show.scenes = collectScenes();
  if (!show.scenes.length || !document.getElementById('markdown-editor').value.trim()) {
    restoreView();
    showToast('発表する章がありません');
    return;
  }
  clearVisualStageSpotlight(stageContainer());
  show.active = true;
  show.index = 0;
  show.build = 0;
  show.auto = false;
  show.autoLooped = false;
  curtain.active = false;
  show.hud = show.hud || buildHud();
  document.documentElement.classList.add('is-stage-show');
  document.addEventListener('keydown', onShowKey, true);
  document.addEventListener('mousemove', wakeHud);
  document.addEventListener('pointermove', overview.onPointerMove);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  stageContainer().addEventListener('click', onShowClick, true);
  window.addEventListener('resize', refitScene);
  wakeHud();
  applyScene(true);

  const fullscreen = document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
  if (fullscreen) fullscreen.then(() => { show.restore.fullscreen = true; }, () => {});
}

function refitScene() {
  if (!show.active || !currentScene()) return;
  if (ov.active) overview.layoutOverview();
  else fitSceneDiagrams(currentScene());
}

function restoreView() {
  const { appearance, viewMode, isVisualMode } = show.restore;
  if (state.appearance !== appearance) toggleShowAppearance();
  if (state.viewMode !== viewMode) document.querySelector(`[data-view-mode="${viewMode}"]`).click();
  if (state.isVisualMode !== isVisualMode) {
    const targetBtn = document.getElementById(isVisualMode ? 'btn-visual-mode' : 'btn-mode-fast');
    if (targetBtn) targetBtn.click();
  }
}

function exitShow() {
  if (!show.active) return;
  const lastScene = currentScene();
  const lastIndex = show.index;
  if (curtain.active) {
    curtain.active = false;
    document.documentElement.classList.remove('is-stage-curtain');
    show.hud?.querySelector('.stage-curtain')?.setAttribute('aria-hidden', 'true');
    clearLightsSuspendedFlag();
  }
  if (ov.active) {
    ov.active = false;
    ov.busy = false;
    document.documentElement.classList.remove('is-stage-overview');
    overview.clearOverviewProps();
    clearLightsSuspendedFlag();
  }
  overview.setPointer(false);
  show.active = false;
  show.auto = false;
  show.autoLooped = false;
  clearTimeout(show.timer);
  clearTimeout(show.idleTimer);
  document.documentElement.classList.remove('is-stage-show', 'is-stage-idle', 'is-stage-ambient', 'is-stage-curtain');
  document.removeEventListener('keydown', onShowKey, true);
  document.removeEventListener('mousemove', wakeHud);
  document.removeEventListener('pointermove', overview.onPointerMove);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
  stageContainer().removeEventListener('click', onShowClick, true);
  window.removeEventListener('resize', refitScene);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});

  show.scenes.forEach(scene => {
    scene.classList.remove('is-scene', 'is-scene-in', 'is-ov-selected', 'is-ov-zooming');
    scene.getAnimations().forEach(a => a.cancel());
    buildItems(scene).forEach(li => {
      li.classList.remove('is-built', 'is-spotlight');
      li.parentElement.classList.remove('is-building');
    });
    scene.querySelectorAll('.exhibition-viewport > svg').forEach(svg => svg.style.removeProperty('--scene-width'));
  });
  restoreView();
  // 発表を終えた章を、通常の表示でも見える位置に出す
  const target = state.isVisualMode ? (collectScenes()[lastIndex] || lastScene) : (() => {
    const std = document.getElementById('standard-doc-container');
    const h2s = std ? Array.from(std.querySelectorAll('h2')) : [];
    return h2s[Math.max(0, lastIndex - 1)] || h2s[0];
  })();
  if (target && target.isConnected) target.scrollIntoView({ block: 'start' });
  updateAllSlabSplits(stageContainer());
}

function mount(container) {
  mountLights(container);
  if (show.active) refreshScenes();
}

window.LucivoStage = {
  mount,
  mountLights,
  resetLights,
  enterShow,
  exitShow,
  toggleLights(enabled) {
    if (typeof enabled === 'boolean') {
      setLightsEnabled(enabled, show.active, currentScene());
    } else {
      setLightsEnabled(!isLightsEnabled(), show.active, currentScene());
    }
    return isLightsEnabled();
  },
  isLightsEnabled,
  // 確認用: t 秒の時点の光で止める（null で再開）。テストとゲラの撮影で使う
  seekLights,
  lightPlans: getLightPlans,
  showState: () => ({
    active: show.active, index: show.index, build: show.build, auto: show.auto, autoLooped: Boolean(show.autoLooped), scenes: show.scenes.length,
    overview: ov.active, selected: ov.index, pointer: pointer.on, curtain: curtain.active
  })
};
