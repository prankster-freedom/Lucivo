// Visualモードの舞台演出。Visualモードに初めて入ったときに読み込み、高速モードの起動には影響させない（NFR-006）
//  - シグナル・ライト（FR-018）: 図の結線に重ねた Canvas に、上流から下流へ伝わる光を描く
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
    if (activeFlows.has(flow)) return;
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

  function mount(container) {
    mountLights(container);
  }

  window.LucivoStage = {
    mount,
    mountLights,
    resetLights,
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
    }))
  };
})();
