// Visualモードの舞台演出。Visualモードに初めて入ったときに読み込み、高速モードの起動には影響させない（NFR-006）
//  - シグナル・ライト（FR-018）: 図の結線に重ねた Canvas に、上流から下流へ伝わる光を描く
//  - ステージ発表（FR-019）: 章を 1 シーンとして全画面でページ送りする
(() => {
  /* ======================================================================
     シグナル・ライト（DTP-LIGHT-010〜060）
     ====================================================================== */
  const LIGHT_DIAGRAM_TYPES = ['flowchart-v2', 'flowchart', 'stateDiagram', 'sequence'];
  // 長さの単位は図の座標系（viewBox）。speed は秒あたりの距離、tail は光の尾の長さ
  const LIGHT = {
    speed: 230,
    tail: 132,
    sampleStep: 3,
    nodeReach: 16,
    lead: 0.25,
    rest: 2.2,
    maxSpan: 13,
    sequenceGap: 0.08,
    pulse: 0.8,
    maxCanvasPixels: 8000000
  };
  // Light の背景では光を足しても見えないため、彩度の高い光輪で白い芯を浮かせる。Dark は加算で本物の光にする（DTP-LIGHT-020）
  const LIGHT_LOOK = {
    light: { blend: 'source-over', halo: 0.1, haloSize: 20, core: 0.62, coreSize: 3.4, head: 0.85, headSize: 22, backlight: 0.85 },
    dark: { blend: 'lighter', halo: 0.085, haloSize: 24, core: 0.5, coreSize: 3, head: 0.9, headSize: 28, backlight: 0.8 }
  };
  const LIGHT_COLORS = {
    shapes: ['#F2643D', '#F59E0B', '#0EA5B7', '#43A047'],
    cards: ['#EA6A47', '#E5A100', '#4F6BED', '#149C9C'],
    circles: ['#E0483D', '#2F88C9', '#F09A27', '#5E8F3A'],
    editorial: ['#C95F5F', '#6F9450', '#B8862F', '#5F83A8']
  };
  const LIGHT_COLORS_DARK = {
    shapes: ['#FF9A76', '#FFC857', '#4FD8E8', '#7EE081'],
    cards: ['#FF9D80', '#FFD166', '#8EA6FF', '#5FE0D2'],
    circles: ['#FF8A7A', '#7CC4F5', '#FFC070', '#A6D96A'],
    editorial: ['#F0A6A6', '#B5D69A', '#E6C37A', '#A9C4E4']
  };
  const GLOW_STOPS = [[0, 1], [0.16, 0.62], [0.38, 0.24], [0.68, 0.06], [1, 0]];

  const flows = new Map();
  const activeFlows = new Set();
  const sprites = new Map();
  let frameId = 0;
  let seekTime = null;
  // 俯瞰（DTP-SHOW-070）の間は、画面に並ぶすべての図の光を止める
  let lightsSuspended = false;

  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const visibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const flow = flows.get(entry.target);
      if (!flow) return;
      if (entry.isIntersecting) startFlow(flow);
      else stopFlow(flow);
    });
  }, { threshold: 0.08 });

  const resizeObserver = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const flow = flows.get(entry.target);
      if (flow && activeFlows.has(flow)) layoutFlow(flow);
    });
  });

  function glowSprite(color) {
    if (sprites.has(color)) return sprites.get(color);
    const size = 128;
    const sprite = document.createElement('canvas');
    sprite.width = sprite.height = size;
    const ctx = sprite.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    GLOW_STOPS.forEach(([offset, alpha]) => gradient.addColorStop(offset, hexToRgba(color, alpha)));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    sprites.set(color, sprite);
    return sprite;
  }

  function samplePath(el, toRoot) {
    const length = el.getTotalLength();
    const count = Math.max(2, Math.ceil(length / LIGHT.sampleStep));
    const points = new Float32Array((count + 1) * 2);
    for (let i = 0; i <= count; i++) {
      const p = el.getPointAtLength(length * i / count);
      points[i * 2] = toRoot.a * p.x + toRoot.c * p.y + toRoot.e;
      points[i * 2 + 1] = toRoot.b * p.x + toRoot.d * p.y + toRoot.f;
    }
    return { points, count, length };
  }

  function nodeRects(svg, rootInverse) {
    return Array.from(svg.querySelectorAll('g.node:not(.statediagram-cluster)')).map(g => {
      const box = g.getBBox();
      const m = rootInverse.multiply(g.getScreenCTM());
      return { x: box.x * m.a + m.e, y: box.y * m.d + m.f, w: box.width * m.a, h: box.height * m.d };
    });
  }

  function nearestNode(rects, x, y) {
    let best = -1;
    let bestDistance = LIGHT.nodeReach;
    rects.forEach((r, i) => {
      const dx = Math.max(r.x - x, 0, x - r.x - r.w);
      const dy = Math.max(r.y - y, 0, y - r.y - r.h);
      const distance = Math.hypot(dx, dy);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = i;
      }
    });
    return best;
  }

  // 根のノードを起点に、光が結線を伝わって届く順に出発の時刻を決める（最短到達時間）。
  // 閉路で起点のない結線は、残った結線の先頭を起点にする。閉路の戻りの結線は流すが、届いたノードからは再び伝わらない
  function scheduleGraph(edges) {
    const targets = new Set(edges.map(e => e.to));
    const arrival = new Map();
    const depth = new Map();
    edges.forEach(e => {
      if (e.from >= 0 && !targets.has(e.from)) {
        arrival.set(e.from, 0);
        depth.set(e.from, 0);
      }
    });
    const pending = new Set(edges);
    while (pending.size) {
      let next = null;
      let nextStart = Infinity;
      pending.forEach(e => {
        const start = e.from < 0 ? 0 : arrival.get(e.from);
        if (start !== undefined && start < nextStart) {
          next = e;
          nextStart = start;
        }
      });
      if (!next) {
        const seed = pending.values().next().value;
        arrival.set(seed.from, 0);
        depth.set(seed.from, 0);
        continue;
      }
      pending.delete(next);
      next.start = nextStart;
      next.depth = next.from < 0 ? 0 : depth.get(next.from);
      const reached = nextStart + next.length / LIGHT.speed;
      if (next.to >= 0 && !(arrival.get(next.to) <= reached)) {
        arrival.set(next.to, reached);
        depth.set(next.to, next.depth + 1);
      }
    }
    return arrival;
  }

  function scheduleSequence(edges) {
    let clock = 0;
    edges.forEach((e, i) => {
      e.start = clock;
      e.depth = i;
      clock += e.length / LIGHT.speed + LIGHT.sequenceGap;
    });
  }

  // 図の結線の順序と時刻を 1 回だけ求める。図が初めて画面に入ったときに呼ぶ（TC-PERF-002 の再描画の軽さを保つ）
  function buildPlan(flow) {
    const { svg } = flow;
    const rootInverse = svg.getScreenCTM().inverse();
    const isSequence = svg.getAttribute('aria-roledescription') === 'sequence';
    const selector = isSequence ? '.messageLine0, .messageLine1' : '.edgePath path.path, path.flowchart-link, path.transition';
    const rects = isSequence ? [] : nodeRects(svg, rootInverse);
    const edges = Array.from(svg.querySelectorAll(selector)).map(el => {
      const sample = samplePath(el, rootInverse.multiply(el.getScreenCTM()));
      const { points, count } = sample;
      return {
        ...sample,
        from: nearestNode(rects, points[0], points[1]),
        to: nearestNode(rects, points[count * 2], points[count * 2 + 1]),
        start: 0,
        depth: 0
      };
    }).filter(e => e.length > 1);

    const arrival = isSequence ? new Map() : scheduleGraph(edges);
    if (isSequence) scheduleSequence(edges);

    const span = edges.reduce((max, e) => Math.max(max, e.start + e.length / LIGHT.speed), 0);
    const pace = span > LIGHT.maxSpan ? LIGHT.maxSpan / span : 1;
    const palette = (state.appearance === 'dark' ? LIGHT_COLORS_DARK : LIGHT_COLORS)[state.infographicStyle] || LIGHT_COLORS.shapes;

    const pulses = [];
    edges.forEach(e => {
      e.start = LIGHT.lead + e.start * pace;
      e.speed = LIGHT.speed / pace;
      e.tail = Math.min(LIGHT.tail, e.length);
      e.color = palette[e.depth % palette.length];
      const hit = e.start + e.length / e.speed;
      if (e.to >= 0) pulses.push({ time: hit, color: e.color, rect: rects[e.to] });
    });
    arrival.forEach((time, node) => {
      if (time === 0) pulses.push({ time: LIGHT.lead, color: palette[0], rect: rects[node], ignition: true });
    });

    flow.plan = { edges, pulses, cycle: LIGHT.lead + span * pace + LIGHT.rest };
  }

  function layoutFlow(flow) {
    const { svg, host, back, front } = flow;
    const screen = svg.getScreenCTM();
    if (!screen) return;
    const svgRect = svg.getBoundingClientRect();
    const hostRect = host.getBoundingClientRect();
    const width = Math.ceil(svgRect.width);
    const height = Math.ceil(svgRect.height);
    // 1:1 の大きな図で Canvas のメモリーが増えすぎないよう、解像度の倍率に上限を設ける
    const limit = Math.sqrt(LIGHT.maxCanvasPixels / Math.max(1, width * height));
    const dpr = Math.min(window.devicePixelRatio || 1, 2, limit);
    [back, front].forEach(({ canvas }) => {
      canvas.style.left = `${svgRect.left - hostRect.left + host.scrollLeft - host.clientLeft}px`;
      canvas.style.top = `${svgRect.top - hostRect.top + host.scrollTop - host.clientTop}px`;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    });
    flow.matrix = [screen.a * dpr, 0, 0, screen.d * dpr, (screen.e - svgRect.left) * dpr, (screen.f - svgRect.top) * dpr];
    flow.blank = true;
  }

  // 光の現在位置。走っていないときは null
  function cometSpan(e, t) {
    const travelled = (t - e.start) * e.speed;
    if (travelled <= 0 || travelled - e.tail >= e.length) return null;
    const step = e.length / e.count;
    return {
      travelled,
      step,
      first: Math.ceil(Math.max(0, travelled - e.tail) / step),
      last: Math.floor(Math.min(travelled, e.length) / step),
      // 終点に着いた後は、尾がノードに吸い込まれるように弱まる
      strength: travelled > e.length ? 1 - (travelled - e.length) / e.tail : 1
    };
  }

  function drawCometHalo(ctx, e, span, look) {
    const sprite = glowSprite(e.color);
    for (let i = span.first; i <= span.last; i++) {
      const u = 1 - (span.travelled - i * span.step) / e.tail;
      const r = look.haloSize * (0.25 + 0.75 * u * u);
      ctx.globalAlpha = look.halo * span.strength * (0.2 + 0.8 * u);
      ctx.drawImage(sprite, e.points[i * 2] - r, e.points[i * 2 + 1] - r, r * 2, r * 2);
    }
  }

  // 白熱の芯。頭ほど太く、尾に向かって細くなる。線分で描くと継ぎ目がはしご状に見えるため、柔らかい粒を密に並べる
  function drawCometCore(ctx, e, span, look) {
    const white = glowSprite('#FFFFFF');
    for (let i = Math.max(span.first, 1); i <= span.last; i++) {
      for (let half = 0; half < 2; half++) {
        const k = half * 0.5;
        const u = 1 - (span.travelled - (i - k) * span.step) / e.tail;
        if (u <= 0) continue;
        const x = e.points[i * 2] + (e.points[i * 2 - 2] - e.points[i * 2]) * k;
        const y = e.points[i * 2 + 1] + (e.points[i * 2 - 1] - e.points[i * 2 + 1]) * k;
        const r = 1.5 + look.coreSize * u * u;
        ctx.globalAlpha = look.core * span.strength * Math.pow(u, 1.4);
        ctx.drawImage(white, x - r, y - r, r * 2, r * 2);
      }
    }
    if (span.travelled > e.length) return;
    const position = span.travelled / span.step;
    const i = Math.min(Math.floor(position), e.count - 1);
    const k = position - i;
    const x = e.points[i * 2] + (e.points[i * 2 + 2] - e.points[i * 2]) * k;
    const y = e.points[i * 2 + 1] + (e.points[i * 2 + 3] - e.points[i * 2 + 1]) * k;
    const r = look.headSize;
    ctx.globalAlpha = look.head;
    ctx.drawImage(glowSprite(e.color), x - r, y - r, r * 2, r * 2);
    const coreR = r * 0.36;
    ctx.globalAlpha = 1;
    ctx.drawImage(glowSprite('#FFFFFF'), x - coreR, y - coreR, coreR * 2, coreR * 2);
  }

  // 光が届いたノードの反応。図の背面に描くため、ノードの輪郭が逆光で浮かぶ（DTP-LIGHT-030）
  function drawBacklight(ctx, p, t, look) {
    const age = (t - p.time) / LIGHT.pulse;
    if (age < 0 || age >= 1) return;
    const swell = 1 - (1 - age) * (1 - age);
    const pad = 12 + 26 * swell;
    const { x, y, w, h } = p.rect;
    ctx.globalAlpha = look.backlight * (1 - age) * (1 - age) * (p.ignition ? 0.6 : 1);
    ctx.drawImage(glowSprite(p.color), x - pad * 1.4, y - pad * 1.4, w + pad * 2.8, h + pad * 2.8);
  }

  function isLit(plan, t) {
    return plan.edges.some(e => t > e.start && (t - e.start) * e.speed - e.tail < e.length)
      || plan.pulses.some(p => t >= p.time && t < p.time + LIGHT.pulse);
  }

  function drawFlow(flow, t) {
    const { back, front, plan, matrix } = flow;
    const look = LIGHT_LOOK[state.appearance === 'dark' ? 'dark' : 'light'];
    const lit = isLit(plan, t);
    // 余韻の間は描き直さない（図の読解を妨げず、再描画もしない）
    if (!lit && flow.blank) return;
    [back, front].forEach(ctx => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
    flow.blank = !lit;
    if (!lit) return;
    [back, front].forEach(ctx => {
      ctx.setTransform(...matrix);
      ctx.globalCompositeOperation = look.blend;
    });
    plan.pulses.forEach(p => drawBacklight(back, p, t, look));
    plan.edges.forEach(e => {
      const span = cometSpan(e, t);
      if (!span) return;
      drawCometHalo(back, e, span, look);
      drawCometCore(front, e, span, look);
    });
    back.globalAlpha = front.globalAlpha = 1;
  }

  function tick(now) {
    frameId = 0;
    activeFlows.forEach(flow => {
      if (!flow.svg.isConnected) {
        stopFlow(flow);
        return;
      }
      drawFlow(flow, seekTime !== null ? seekTime : ((now - flow.startedAt) / 1000) % flow.plan.cycle);
    });
    if (activeFlows.size) frameId = requestAnimationFrame(tick);
  }

  function startFlow(flow) {
    if (lightsSuspended || activeFlows.has(flow)) return;
    if (!flow.svg.getScreenCTM()) return;
    if (!flow.plan) buildPlan(flow);
    if (!flow.plan.edges.length) return;
    layoutFlow(flow);
    flow.startedAt = performance.now();
    activeFlows.add(flow);
    if (!frameId) frameId = requestAnimationFrame(tick);
  }

  function stopFlow(flow) {
    activeFlows.delete(flow);
    [flow.back, flow.front].forEach(ctx => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
    flow.blank = true;
  }

  function lightLayer(host, layerClass) {
    const canvas = document.createElement('canvas');
    canvas.className = `signal-light-canvas ${layerClass}`;
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);
    return canvas.getContext('2d');
  }

  function mountLights(root) {
    if (prefersReducedMotion()) return;
    root.querySelectorAll('svg[aria-roledescription]').forEach(svg => {
      const host = svg.parentElement;
      if (!LIGHT_DIAGRAM_TYPES.includes(svg.getAttribute('aria-roledescription'))) return;
      if (flows.has(host) && flows.get(host).svg === svg) return;
      host.classList.add('has-signal-light');
      const flow = { svg, host, back: lightLayer(host, 'is-back'), front: lightLayer(host, 'is-front'), plan: null, matrix: null, blank: true, startedAt: 0 };
      flows.set(host, flow);
      flows.set(svg, flow);
      visibilityObserver.observe(host);
      // 図の大きさが同じでも、表示枠の幅が変わると図の位置がずれるため、両方を見る
      resizeObserver.observe(svg);
      resizeObserver.observe(host);
    });
  }

  // 再描画で図の DOM が作り直される前に呼ぶ
  function resetLights() {
    activeFlows.clear();
    flows.clear();
    visibilityObserver.disconnect();
    resizeObserver.disconnect();
  }

  /* ======================================================================
     ステージ発表（DTP-SHOW-010〜060）
     ====================================================================== */
  const AUTO_DWELL = { scene: 7000, build: 2400, afterLight: 800 };
  const SCENE_FIT = { maxScale: 2.4, bottomMargin: 88, minHeightRatio: 0.6, scrollRatio: 0.8 };
  const HUD_IDLE_MS = 2600;

  const show = { active: false, scenes: [], index: 0, build: 0, auto: false, timer: 0, idleTimer: 0, restore: null, hud: null };
  // 俯瞰（DTP-SHOW-070）と光のポインター（DTP-SHOW-080）
  const OVERVIEW = { widthRatio: 0.88, heightRatio: 0.78, gapVw: 1.6, minScale: 0.12, maxCols: 6, zoomMs: 420 };
  const ov = { active: false, index: 0, busy: false };
  const pointer = { on: false, moved: false, x: 0, y: 0, frame: 0 };

  const stageContainer = () => document.getElementById('visual-stage-container');
  const currentScene = () => show.scenes[show.index];
  const buildItems = scene => (scene ? Array.from(scene.querySelectorAll('.vs-steps > li, .vs-points > li')) : []);

  function buildHud() {
    const hud = document.createElement('div');
    hud.id = 'stage-hud';
    hud.className = 'stage-hud';
    hud.innerHTML = `
      <div class="stage-sweep" aria-hidden="true"></div>
      <div class="stage-hint">→ 次へ ／ ← 戻る ／ O 一覧 ／ L ポインター ／ A 自動進行 ／ T 明暗 ／ Esc 終了</div>
      <div class="stage-pointer" aria-hidden="true"><span class="stage-pointer-dot"></span></div>
      <div class="stage-hud-bar">
        <span class="stage-hud-title"></span>
        <span class="stage-hud-count"></span>
        <div class="stage-hud-actions">
          <button type="button" data-stage-action="prev" aria-label="前へ">←</button>
          <button type="button" data-stage-action="next" aria-label="次へ">→</button>
          <button type="button" data-stage-action="overview" aria-pressed="false">一覧</button>
          <button type="button" data-stage-action="pointer" aria-pressed="false">ポインター</button>
          <button type="button" data-stage-action="auto" aria-pressed="false">自動進行</button>
          <button type="button" data-stage-action="exit">終了</button>
        </div>
      </div>
      <div class="stage-hud-rail" aria-hidden="true"><span class="stage-hud-fill"></span></div>`;
    hud.addEventListener('click', event => {
      const action = event.target.closest('[data-stage-action]');
      if (!action) return;
      event.stopPropagation();
      ({ prev, next: () => next(), auto: toggleAuto, exit: exitShow, overview: toggleOverview, pointer: togglePointer })[action.dataset.stageAction]();
    });
    document.body.appendChild(hud);
    return hud;
  }

  // 図を舞台の残りの高さに収める。ただし文字の判読性の下限（NFR-005）より小さくはしない。収まらない分はスクロールする
  function fitSceneDiagrams(scene) {
    scene.querySelectorAll('.exhibition-slab-split').forEach(updateSlabSplit);
    if (scene.classList.contains('exhibition-slab-split')) updateSlabSplit(scene);
    scene.querySelectorAll('.exhibition-viewport > svg').forEach(svg => {
      const viewBox = svg.viewBox && svg.viewBox.baseVal;
      if (!viewBox || !viewBox.width) return;
      svg.style.removeProperty('--scene-width');
      const host = svg.parentElement;
      const style = getComputedStyle(host);
      const availableWidth = host.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const top = host.getBoundingClientRect().top + parseFloat(style.paddingTop);
      // 本文の下に図がある章は残りの高さが小さいため、画面の高さの一定の割合までは確保し、はみ出す分はスクロールで見せる
      const availableHeight = Math.max(
        window.innerHeight - top - parseFloat(style.paddingBottom) - SCENE_FIT.bottomMargin,
        window.innerHeight * SCENE_FIT.minHeightRatio
      );
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
    // 俯瞰の間は、選んでいるシーンの題と位置を出す
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
    [['overview', ov.active], ['pointer', pointer.on]].forEach(([name, on]) => {
      const button = hud.querySelector(`[data-stage-action="${name}"]`);
      button.setAttribute('aria-pressed', String(on));
      button.classList.toggle('is-active', on);
    });
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
      goToScene(show.index + 1, 0);
    } else if (loop) {
      goToScene(0, 0);
    }
  }

  function prev() {
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
    updateHud();
    scheduleAuto();
  }

  function wakeHud() {
    document.documentElement.classList.remove('is-stage-idle');
    clearTimeout(show.idleTimer);
    show.idleTimer = setTimeout(() => document.documentElement.classList.add('is-stage-idle'), HUD_IDLE_MS);
  }

  function onShowKey(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (ov.active) {
      onOverviewKey(event);
      return;
    }
    const actions = {
      ArrowRight: () => next(), ArrowDown: () => next(), PageDown: () => next(), ' ': () => next(), Enter: () => next(),
      ArrowLeft: prev, ArrowUp: prev, PageUp: prev, Backspace: prev,
      Home: () => goToScene(0, 0),
      End: () => goToScene(show.scenes.length - 1, 'end'),
      a: toggleAuto, A: toggleAuto,
      t: toggleShowAppearance, T: toggleShowAppearance,
      o: toggleOverview, O: toggleOverview,
      l: togglePointer, L: togglePointer,
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
      if (tile) openFromOverview(show.scenes.indexOf(tile));
      return;
    }
    if (event.target.closest('a, button')) return;
    event.stopPropagation();
    next();
  }

  /* ----------------------------------------------------------------------
     俯瞰（ライトテーブル。DTP-SHOW-070）: 全シーンを実物のまま縮小して並べ、選んだシーンへ拡大して戻る。
     シーンの要素そのものを transform で縮小するため、複製も再描画もしない。拡大・縮小の動きも transform だけで描く
     ---------------------------------------------------------------------- */
  const overviewWrap = () => stageContainer().querySelector('.exhibition-wrap');
  const overviewScale = () => parseFloat(overviewWrap().style.getPropertyValue('--ov-s')) || 0.2;

  // 画面の幅と高さの両方に収まる縮小率が最も大きくなる列の数（1〜6）を選ぶ。下限を下回る場合はスクロールで見せる
  function layoutOverview() {
    const n = show.scenes.length;
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
    ov.index = Math.max(0, Math.min(show.scenes.length - 1, index));
    show.scenes.forEach((scene, k) => scene.classList.toggle('is-ov-selected', k === ov.index));
    show.scenes[ov.index].scrollIntoView({ block: 'nearest' });
    updateHud();
  }

  // 全画面のシーンと一覧の縮小図の間を、transform の補間だけで動かす（toTile: 全画面 → 縮小図）
  function zoomTile(tile, toTile) {
    if (prefersReducedMotion() || !tile.animate) return Promise.resolve();
    const rect = tile.getBoundingClientRect();
    const full = `translate(${-rect.left}px, ${-rect.top}px) scale(1)`;
    const small = `scale(${overviewScale()})`;
    tile.classList.add('is-ov-zooming');
    const animation = tile.animate([{ transform: toTile ? full : small }, { transform: toTile ? small : full }], {
      duration: OVERVIEW.zoomMs,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
      fill: toTile ? 'none' : 'forwards'
    });
    return animation.finished.catch(() => {}).then(() => animation);
  }

  function suspendLights(suspend) {
    lightsSuspended = suspend;
    if (suspend) {
      Array.from(activeFlows).forEach(stopFlow);
      return;
    }
    // 俯瞰の間も画面に入っていた図は、見え方が変わらないため交差の通知が来ない。今のシーンの図を直接始める
    const scene = currentScene();
    if (scene) scene.querySelectorAll('.exhibition-viewport').forEach(host => {
      const flow = flows.get(host);
      if (flow) startFlow(flow);
    });
  }

  function openOverview() {
    if (!show.active || ov.active || ov.busy) return;
    if (show.auto) toggleAuto();
    setPointer(false);
    ov.active = true;
    suspendLights(true);
    layoutOverview();
    document.documentElement.classList.add('is-stage-overview');
    stageContainer().scrollTop = 0;
    selectTile(show.index);
    const wrap = overviewWrap();
    wrap.classList.add('is-ov-entering');
    zoomTile(currentScene(), true).then(() => {
      wrap.classList.remove('is-ov-entering');
      currentScene().classList.remove('is-ov-zooming');
    });
  }

  // 俯瞰を閉じて index のシーンを出す。build は項目の表示数（'end' は全部）
  function closeOverview(index, build) {
    ov.active = false;
    document.documentElement.classList.remove('is-stage-overview');
    show.scenes.forEach(scene => {
      scene.classList.remove('is-ov-selected', 'is-ov-zooming');
      scene.getAnimations().forEach(a => a.cancel());
    });
    overviewWrap().classList.remove('is-ov-entering');
    // 別のシーンへ入るときは、通常の転換（光の帯と下からの登場）を見せる。縮小図と全画面では図の収め方が違い、
    // そのまま切り替えると図の大きさが跳ねるため、登場の動きで吸収する。元のシーンへ戻るときは図が収まっているので出さない
    const changed = index !== show.index;
    show.index = index;
    show.build = build === 'end' ? buildItems(show.scenes[index]).length : build;
    applyScene(changed);
    stageContainer().scrollTop = 0;
    suspendLights(false);
  }

  // 一覧で選んだシーンへ、縮小図を全画面へ拡大して入る。一覧で見たままの姿（項目をすべて表示）で出す
  function openFromOverview(index) {
    if (!ov.active || ov.busy) return;
    selectTile(index);
    ov.busy = true;
    zoomTile(show.scenes[index], false).then(() => {
      ov.busy = false;
      closeOverview(index, index === show.index ? show.build : 'end');
    });
  }

  function toggleOverview() {
    if (ov.active) openFromOverview(show.index);
    else openOverview();
  }

  function onOverviewKey(event) {
    const cols = parseInt(overviewWrap().style.getPropertyValue('--ov-cols'), 10) || 1;
    const actions = {
      ArrowRight: () => selectTile(ov.index + 1), ArrowLeft: () => selectTile(ov.index - 1),
      ArrowDown: () => selectTile(ov.index + cols), ArrowUp: () => selectTile(ov.index - cols),
      Home: () => selectTile(0), End: () => selectTile(show.scenes.length - 1),
      Enter: () => openFromOverview(ov.index), ' ': () => openFromOverview(ov.index),
      // 閉じるときは、俯瞰を開く前のシーンへ戻る
      Escape: () => openFromOverview(show.index), o: () => openFromOverview(show.index), O: () => openFromOverview(show.index),
      t: toggleShowAppearance, T: toggleShowAppearance
    };
    const action = actions[event.key];
    if (!action) return;
    event.preventDefault();
    event.stopPropagation();
    action();
  }

  /* ----------------------------------------------------------------------
     光のポインター（DTP-SHOW-080）: マウスの位置にスポットライトを当て、周りを沈める。
     位置の反映は 1 フレームに 1 回、CSS 変数と transform の書き換えだけで行い、レイアウトを読まない
     ---------------------------------------------------------------------- */
  function paintPointer() {
    pointer.frame = 0;
    const layer = show.hud && show.hud.querySelector('.stage-pointer');
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
    pointer.on = Boolean(on) && show.active && !ov.active;
    document.documentElement.classList.toggle('is-stage-pointer', pointer.on);
    if (pointer.on) {
      if (!pointer.moved) {
        pointer.x = window.innerWidth / 2;
        pointer.y = window.innerHeight / 2;
      }
      paintPointer();
    }
    updateHud();
  }

  function togglePointer() {
    setPointer(!pointer.on);
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
    // 俯瞰の間に図が描き直されたら（明暗の切替など）、並べ方と選択を付け直す
    if (ov.active && show.scenes.length) {
      layoutOverview();
      selectTile(ov.index);
    }
  }

  function enterShow() {
    if (show.active) return;
    const scroller = document.getElementById('preview-scroll');
    show.restore = { appearance: state.appearance, viewMode: state.viewMode, scrollTop: scroller.scrollTop, fullscreen: false };
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
    show.hud = show.hud || buildHud();
    document.documentElement.classList.add('is-stage-show');
    document.addEventListener('keydown', onShowKey, true);
    document.addEventListener('mousemove', wakeHud);
    document.addEventListener('pointermove', onPointerMove);
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
    if (ov.active) layoutOverview();
    else fitSceneDiagrams(currentScene());
  }

  function restoreView() {
    const { appearance, viewMode } = show.restore;
    if (state.appearance !== appearance) toggleShowAppearance();
    if (state.viewMode !== viewMode) document.querySelector(`[data-view-mode="${viewMode}"]`).click();
  }

  function exitShow() {
    if (!show.active) return;
    const lastScene = currentScene();
    const lastIndex = show.index;
    if (ov.active) {
      ov.active = false;
      ov.busy = false;
      document.documentElement.classList.remove('is-stage-overview');
      const wrap = overviewWrap();
      if (wrap) ['--ov-cols', '--ov-s', '--ov-gap'].forEach(name => wrap.style.removeProperty(name));
      lightsSuspended = false;
    }
    setPointer(false);
    show.active = false;
    show.auto = false;
    clearTimeout(show.timer);
    clearTimeout(show.idleTimer);
    document.documentElement.classList.remove('is-stage-show', 'is-stage-idle');
    document.removeEventListener('keydown', onShowKey, true);
    document.removeEventListener('mousemove', wakeHud);
    document.removeEventListener('pointermove', onPointerMove);
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
    const target = collectScenes()[lastIndex] || lastScene;
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
    // 確認用: t 秒の時点の光で止める（null で再開）。テストとゲラの撮影で使う
    seekLights(t) {
      seekTime = t;
    },
    lightPlans: () => Array.from(new Set(flows.values())).map(f => ({
      type: f.svg.getAttribute('aria-roledescription'),
      plan: f.plan,
      active: activeFlows.has(f),
      svg: f.svg,
      back: f.back.canvas,
      front: f.front.canvas
    })),
    showState: () => ({
      active: show.active, index: show.index, build: show.build, auto: show.auto, scenes: show.scenes.length,
      overview: ov.active, selected: ov.index, pointer: pointer.on
    })
  };
})();
