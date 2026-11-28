// ステージ発表の円形拡大鏡（FR-072, DTP-SHOW-085, ARC-MAG-001〜004, NFR-007）
// 中心〜平坦エリア割合を均一拡大し、外周を smootherstep で 1.0x へ連続減衰させる WebGL レンズ＋フォールバック

export interface MagnifierCellPreset {
  rim: number;
  gloss: number;
  shadow: number;
  plateau: number;
}

export interface MagnifierMatrixConfig {
  diameterRatios: readonly [number, number, number];
  defaultDiameterIndex: number;
  zoomPresets: readonly [number, number, number];
  defaultZoomIndex: number;
  themes: {
    dark: readonly (readonly [MagnifierCellPreset, MagnifierCellPreset, MagnifierCellPreset])[];
    light: readonly (readonly [MagnifierCellPreset, MagnifierCellPreset, MagnifierCellPreset])[];
  };
}

import rawMagnifierPresets from './stage-magnifier-presets.json';

// 直径（長辺基準 30% / 45% / 60%、既定 45%）× 倍率（3 段階）× 明暗テーマのデザイン定数マトリクス（ARC-MAG-003）
export const MAGNIFIER_PRESETS: MagnifierMatrixConfig = rawMagnifierPresets as unknown as MagnifierMatrixConfig;

// クロスオリジン画像（raw.githubusercontent.com 等）の foreignObject 内表示用 Data URI キャッシュ
const imgDataUriCache = new Map<string, string>();
const imgDataUriPending = new Set<string>();

function blobToDataUri(blob: Blob): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

export interface StageMagnifierContext {
  show: { active: boolean; hud: HTMLElement | null };
  ov: { active: boolean };
  curtain: { active: boolean };
  stageContainer: () => HTMLElement | null;
  currentScene: () => HTMLElement | undefined;
  setPointer: (on: boolean) => void;
  updateHud: () => void;
}

const VS_SOURCE = `
  attribute vec2 a_pos;
  varying vec2 v_uv;
  void main() {
    v_uv = a_pos * 0.5 + 0.5;
    v_uv.y = 1.0 - v_uv.y;
    gl_Position = vec4(a_pos, 0.0, 1.0);
  }
`;

const FS_SOURCE = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_tex;
  uniform vec2 u_res;
  uniform vec2 u_mouse;
  uniform float u_radius;
  uniform float u_zoom;
  uniform float u_plateau;
  uniform float u_rim;
  uniform float u_gloss;
  uniform float u_shadow;

  void main() {
    vec2 px = v_uv * u_res;
    vec2 center = u_mouse * u_res;
    vec2 delta = px - center;
    float dist = length(delta);

    if (dist < u_radius + 1.0) {
      float r = clamp(dist / max(u_radius, 1.0), 0.0, 1.0);
      float t = clamp((r - u_plateau) / max(1.0 - u_plateau, 0.001), 0.0, 1.0);
      float w = t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
      float scale = mix(1.0 / u_zoom, 1.0, w);
      vec2 srcPx = center + delta * scale;
      vec2 sampleUv = clamp(srcPx / u_res, 0.0, 1.0);

      vec4 col = texture2D(u_tex, sampleUv);

      float edge = smoothstep(0.955, 0.996, r) * (1.0 - smoothstep(0.996, 1.0, r));
      col.rgb += vec3(0.60, 0.85, 1.0) * (edge * 0.75 * u_rim);

      vec2 nd = delta / max(u_radius, 1.0);
      float specDir = clamp(dot(normalize(nd + 0.0001), normalize(vec2(-0.7, -0.7))), 0.0, 1.0);
      float rimSheen = pow(r, 5.0) * (0.25 + 0.75 * pow(specDir, 2.0));
      float topArc = smoothstep(0.86, 0.55, r) * smoothstep(0.35, 0.90, -nd.y - nd.x * 0.35) * 0.28;
      col.rgb += vec3(0.82, 0.93, 1.0) * ((rimSheen * 0.45 + topArc) * u_gloss);

      float alpha = 1.0 - smoothstep(u_radius - 1.0, u_radius + 0.75, dist);
      gl_FragColor = vec4(col.rgb, alpha);
    } else {
      float outerDist = dist - u_radius;
      float shadow = exp(-outerDist * (6.0 / max(u_radius, 1.0))) * u_shadow;
      if (shadow < 0.004) discard;
      gl_FragColor = vec4(0.0, 0.0, 0.0, shadow);
    }
  }
`;

export function createStageMagnifier(ctx: StageMagnifierContext) {
  const mag = {
    on: false,
    moved: false,
    x: 0,
    y: 0,
    frame: 0,
    sizeIdx: MAGNIFIER_PRESETS.defaultDiameterIndex,
    zoomIdx: MAGNIFIER_PRESETS.defaultZoomIndex,
    fallback: false,
    fallbackReason: ''
  };

  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGLRenderingContext | null = null;
  let tex: WebGLTexture | null = null;
  let hasTexture = false;
  let captureToken = 0;
  let cachedCssResult: { cssText: string; incomplete: boolean } | null = null;
  let fallbackLayer: HTMLElement | null = null;

  let uRes: WebGLUniformLocation | null = null;
  let uMouse: WebGLUniformLocation | null = null;
  let uRadius: WebGLUniformLocation | null = null;
  let uZoom: WebGLUniformLocation | null = null;
  let uPlateau: WebGLUniformLocation | null = null;
  let uRim: WebGLUniformLocation | null = null;
  let uGloss: WebGLUniformLocation | null = null;
  let uShadow: WebGLUniformLocation | null = null;

  function isDarkTheme(): boolean {
    return document.body.dataset.appearance === 'dark';
  }

  function currentCell(): MagnifierCellPreset {
    const theme = isDarkTheme() ? 'dark' : 'light';
    return MAGNIFIER_PRESETS.themes[theme][mag.sizeIdx][mag.zoomIdx];
  }

  function collectStylesCss(): { cssText: string; incomplete: boolean } {
    if (cachedCssResult !== null) return cachedCssResult;
    const chunks: string[] = [];
    let incomplete = false;
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j++) {
          chunks.push(rules[j].cssText);
        }
      } catch {
        incomplete = true;
      }
    }
    cachedCssResult = { cssText: chunks.join('\n'), incomplete };
    return cachedCssResult;
  }

  function ensureWebGL(layer: HTMLElement): boolean {
    if (mag.fallback) return false;
    if (gl && canvas && canvas.parentElement === layer) return true;

    canvas = layer.querySelector('.stage-magnifier-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'stage-magnifier-canvas';
      layer.appendChild(canvas);
    }

    const context = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!context) {
      mag.fallback = true;
      return false;
    }
    gl = context;

    const compile = (type: number, src: string) => {
      const s = gl!.createShader(type)!;
      gl!.shaderSource(s, src);
      gl!.compileShader(s);
      return s;
    };

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VS_SOURCE));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS_SOURCE));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      mag.fallback = true;
      return false;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    uRes = gl.getUniformLocation(program, 'u_res');
    uMouse = gl.getUniformLocation(program, 'u_mouse');
    uRadius = gl.getUniformLocation(program, 'u_radius');
    uZoom = gl.getUniformLocation(program, 'u_zoom');
    uPlateau = gl.getUniformLocation(program, 'u_plateau');
    uRim = gl.getUniformLocation(program, 'u_rim');
    uGloss = gl.getUniformLocation(program, 'u_gloss');
    uShadow = gl.getUniformLocation(program, 'u_shadow');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    return true;
  }

  function resizeWebGLCanvas(): boolean {
    if (!canvas || !gl) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
    return true;
  }

  function buildStageSnapshotSvg(vw: number, vh: number, scale: number): string | null {
    const container = ctx.stageContainer();
    const activeScene = ctx.currentScene();
    if (!container || !activeScene) return null;

    const ns = 'http://www.w3.org/1999/xhtml';
    const htmlClone = document.createElementNS(ns, 'div');
    Array.from(document.documentElement.attributes).forEach(attr => {
      htmlClone.setAttribute(attr.name, attr.value);
    });
    htmlClone.classList.add('lucivo-snap-html');
    htmlClone.classList.remove('is-stage-magnifier', 'is-stage-pointer', 'is-stage-idle');
    htmlClone.style.width = `${vw}px`;
    htmlClone.style.height = `${vh}px`;
    htmlClone.style.overflow = 'hidden';
    htmlClone.style.transformOrigin = '0 0';
    htmlClone.style.transform = `scale(${scale})`;

    const sanitizeCssUrls = (css: string) =>
      css.replace(/url\(\s*(['"]?)(?!data:|#)[^)]*\1\s*\)/gi, 'none');

    const resolveViewportUnits = (css: string) =>
      css.replace(/(-?\d*\.?\d+)(d?vh|d?vw|vmin|vmax)\b/gi, (_, num, unit) => {
        const n = parseFloat(num);
        const u = unit.toLowerCase();
        const base = u.endsWith('vh') ? vh : u.endsWith('vw') ? vw : u === 'vmin' ? Math.min(vw, vh) : Math.max(vw, vh);
        return `${((n * base) / 100).toFixed(2)}px`;
      });

    const rewriteRootSelectors = (css: string) =>
      css
        .replace(/(^|[},\s>+~(])html(?=[.#\[:\s,{])/gi, '$1.lucivo-snap-html')
        .replace(/(^|[},\s>+~(])body(?=[.#\[:\s,{])/gi, '$1.lucivo-snap-body')
        .replace(/:root\b/gi, '.lucivo-snap-html');

    const cssResult = collectStylesCss();
    const cssText = rewriteRootSelectors(resolveViewportUnits(sanitizeCssUrls(cssResult.cssText)));
    const needInline = true;
    htmlClone.style.fontSize = getComputedStyle(document.documentElement).fontSize;

    const styleEl = document.createElementNS(ns, 'style');
    styleEl.textContent = `${cssText}
      .is-scene-in, .is-scene-in * { animation: none !important; transition: none !important; opacity: 1 !important; }
      .stage-hud { display: none !important; }`;
    htmlClone.appendChild(styleEl);

    const INLINE_PROPS = [
      'display', 'position', 'top', 'right', 'bottom', 'left', 'width', 'height',
      'min-width', 'max-width', 'min-height', 'max-height', 'margin', 'padding', 'box-sizing',
      'flex', 'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
      'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
      'color', 'background-color', 'background-image', 'border', 'border-radius', 'box-shadow',
      'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
      'white-space', 'overflow', 'opacity', 'transform', 'transform-origin', 'visibility', 'z-index',
      'fill', 'stroke', 'stroke-width'
    ];

    const copyStyleProps = (origEl: Element, cloneEl: HTMLElement | SVGElement) => {
      const cs = getComputedStyle(origEl);
      for (let i = 0; i < INLINE_PROPS.length; i++) {
        const prop = INLINE_PROPS[i];
        const val = cs.getPropertyValue(prop);
        if (val) cloneEl.style.setProperty(prop, sanitizeCssUrls(val));
      }
    };

    const inlineComputed = (origEl: Element, cloneEl: Element) => {
      if (origEl.tagName.toLowerCase() === 'svg') {
        if (cloneEl instanceof SVGElement) {
          const cs = getComputedStyle(origEl);
          cloneEl.style.setProperty('width', cs.width, 'important');
          cloneEl.style.setProperty('height', cs.height, 'important');
          cloneEl.style.setProperty('max-width', cs.maxWidth, 'important');
          cloneEl.style.setProperty('max-height', cs.maxHeight, 'important');
          cloneEl.style.display = cs.display;
        }
        return;
      }
      if (cloneEl instanceof HTMLElement) {
        copyStyleProps(origEl, cloneEl);
        if (cloneEl.style.opacity === '0') cloneEl.style.opacity = '1';
      }
      const origChildren = origEl.children;
      const cloneChildren = cloneEl.children;
      for (let i = 0; i < origChildren.length && i < cloneChildren.length; i++) {
        inlineComputed(origChildren[i], cloneChildren[i]);
      }
    };

    const bodyClone = document.createElementNS(ns, 'div');
    Array.from(document.body.attributes).forEach(attr => {
      bodyClone.setAttribute(attr.name, attr.value);
    });
    bodyClone.classList.add('lucivo-snap-body');
    if (needInline) copyStyleProps(document.body, bodyClone);
    bodyClone.style.margin = '0';
    bodyClone.style.width = `${vw}px`;
    bodyClone.style.height = `${vh}px`;
    bodyClone.style.position = 'relative';
    bodyClone.style.overflow = 'hidden';

    const containerClone = container.cloneNode(false) as HTMLElement;
    if (needInline) copyStyleProps(container, containerClone);
    containerClone.style.position = 'absolute';
    containerClone.style.inset = '0';
    containerClone.style.width = `${vw}px`;
    containerClone.style.height = `${vh}px`;

    const wrap = container.querySelector('.exhibition-wrap') as HTMLElement | null;
    if (wrap) {
      const wrapClone = wrap.cloneNode(false) as HTMLElement;
      if (needInline) copyStyleProps(wrap, wrapClone);
      const sceneClone = activeScene.cloneNode(true) as HTMLElement;
      sceneClone.classList.remove('is-scene-in');
      if (needInline) inlineComputed(activeScene, sceneClone);

      // <img> 要素（assets/... や raw.githubusercontent.com 等の外部参照）は foreignObject 内で読み込めないため data URI へ変換する
      const origImgs = activeScene.querySelectorAll('img');
      const cloneImgs = sceneClone.querySelectorAll('img');
      origImgs.forEach((origImg, idx) => {
        const targetImg = cloneImgs[idx];
        if (!targetImg) return;
        const rawAttr = origImg.getAttribute('src') || '';
        if (rawAttr.startsWith('data:')) return;
        const resolvedSrc = origImg.src || rawAttr;
        if (!resolvedSrc) return;
        const cached = imgDataUriCache.get(resolvedSrc);
        if (cached) {
          targetImg.setAttribute('src', cached);
          return;
        }
        if (!origImg.complete || origImg.naturalWidth === 0) {
          origImg.addEventListener('load', () => {
            if (mag.on && ctx.currentScene() === activeScene) refreshSnapshot();
          }, { once: true });
          return;
        }
        try {
          const w = Math.max(origImg.naturalWidth, Math.round(origImg.clientWidth * scale));
          const h = Math.max(origImg.naturalHeight, Math.round(origImg.clientHeight * scale));
          const tmp = document.createElement('canvas');
          tmp.width = w;
          tmp.height = h;
          const tctx = tmp.getContext('2d');
          if (tctx) {
            tctx.drawImage(origImg, 0, 0, w, h);
            targetImg.setAttribute('src', tmp.toDataURL('image/png'));
          }
        } catch {
          // クロスオリジン画像等で canvas が汚染された場合は CORS fetch で Data URI を取得し再撮影する
          if (!imgDataUriPending.has(resolvedSrc)) {
            imgDataUriPending.add(resolvedSrc);
            fetch(resolvedSrc, { mode: 'cors' })
              .then((res) => (res.ok ? res.blob() : null))
              .then((blob) => (blob ? blobToDataUri(blob) : null))
              .then((dataUri) => {
                imgDataUriPending.delete(resolvedSrc);
                if (dataUri) {
                  imgDataUriCache.set(resolvedSrc, dataUri);
                  if (mag.on && ctx.currentScene() === activeScene) refreshSnapshot();
                }
              })
              .catch(() => {
                imgDataUriPending.delete(resolvedSrc);
              });
          }
        }
      });

      // Canvas 要素（シグナル・ライト等）を画像として複製する
      const origCanvases = activeScene.querySelectorAll('canvas');
      const cloneCanvases = sceneClone.querySelectorAll('canvas');
      origCanvases.forEach((origC, idx) => {
        const targetC = cloneCanvases[idx];
        if (!targetC) return;
        try {
          const img = document.createElement('img');
          img.src = origC.toDataURL('image/png');
          img.className = origC.className;
          img.style.cssText = origC.style.cssText;
          targetC.replaceWith(img);
        } catch {
          targetC.remove();
        }
      });

      wrapClone.appendChild(sceneClone);
      containerClone.appendChild(wrapClone);
    }

    if (container.scrollTop > 0) {
      containerClone.scrollTop = container.scrollTop;
    }

    bodyClone.appendChild(containerClone);
    htmlClone.appendChild(bodyClone);

    const serializedHtml = new XMLSerializer().serializeToString(htmlClone);
    const outW = Math.round(vw * scale);
    const outH = Math.round(vh * scale);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${outW}" height="${outH}"><foreignObject x="0" y="0" width="${outW}" height="${outH}">${serializedHtml}</foreignObject></svg>`;
  }

  function refreshSnapshot() {
    if (!mag.on || !ctx.show.active || ctx.ov.active || ctx.curtain.active) return;
    const layer = ctx.show.hud && ctx.show.hud.querySelector('.stage-magnifier') as HTMLElement | null;
    if (!layer) return;

    if (!ensureWebGL(layer)) {
      refreshFallback();
      return;
    }

    const token = ++captureToken;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const captureScale = Math.min(2.5, Math.max(2, window.devicePixelRatio || 1));
    const svgStr = buildStageSnapshotSvg(vw, vh, captureScale);
    if (!svgStr) return;

    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    const img = new Image();
    img.onload = () => {
      if (token !== captureToken || !mag.on || !gl || !tex) return;
      try {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        hasTexture = true;
        paint();
      } catch (err) {
        // file:// や Safari のセキュリティ制約時は CSS フォールバックへ切り替え（ARC-MAG-004）
        mag.fallback = true;
        mag.fallbackReason = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
        refreshFallback();
      }
    };
    img.onerror = () => {
      if (token !== captureToken) return;
      mag.fallback = true;
      mag.fallbackReason = 'img.onerror';
      refreshFallback();
    };
    img.src = url;
  }

  function refreshFallback() {
    const layer = ctx.show.hud && ctx.show.hud.querySelector('.stage-magnifier') as HTMLElement | null;
    if (!layer) return;
    if (canvas) canvas.style.display = 'none';

    if (!fallbackLayer) {
      fallbackLayer = document.createElement('div');
      fallbackLayer.className = 'stage-magnifier-fallback';
      layer.appendChild(fallbackLayer);
    }
    fallbackLayer.innerHTML = '';
    const container = ctx.stageContainer();
    const activeScene = ctx.currentScene();
    if (!container || !activeScene) return;

    const inner = document.createElement('div');
    inner.className = 'stage-magnifier-fallback-inner';
    const containerClone = container.cloneNode(false) as HTMLElement;
    const wrap = container.querySelector('.exhibition-wrap') as HTMLElement | null;
    if (wrap) {
      const wrapClone = wrap.cloneNode(false) as HTMLElement;
      const sceneClone = activeScene.cloneNode(true) as HTMLElement;
      sceneClone.classList.remove('is-scene-in');
      wrapClone.appendChild(sceneClone);
      containerClone.appendChild(wrapClone);
    }
    inner.appendChild(containerClone);
    fallbackLayer.appendChild(inner);
    paint();
  }

  // 1 フレームに 1 回、Uniform / CSS 変数更新のみを行い、レイアウトを読まない（NFR-007, ARC-MAG-002）
  function paint() {
    mag.frame = 0;
    if (!mag.on) return;

    const layer = ctx.show.hud && ctx.show.hud.querySelector('.stage-magnifier') as HTMLElement | null;
    if (!layer) return;

    const ratio = MAGNIFIER_PRESETS.diameterRatios[mag.sizeIdx];
    const zoom = MAGNIFIER_PRESETS.zoomPresets[mag.zoomIdx];

    if (mag.fallback) {
      if (!fallbackLayer) return;
      const longSide = Math.max(window.innerWidth, window.innerHeight);
      const rPx = longSide * ratio * 0.5;
      fallbackLayer.style.setProperty('--mx', `${mag.x}px`);
      fallbackLayer.style.setProperty('--my', `${mag.y}px`);
      fallbackLayer.style.setProperty('--mr', `${rPx.toFixed(1)}px`);
      fallbackLayer.style.setProperty('--mz', `${zoom}`);
      return;
    }

    if (!gl || !canvas || !hasTexture) return;
    resizeWebGLCanvas();

    const cell = currentCell();
    const dpr = canvas.width / Math.max(1, window.innerWidth);
    const longSidePx = Math.max(canvas.width, canvas.height);
    const radiusPx = longSidePx * ratio * 0.5;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uMouse, (mag.x * dpr) / canvas.width, (mag.y * dpr) / canvas.height);
    gl.uniform1f(uRadius, radiusPx);
    gl.uniform1f(uZoom, zoom);
    gl.uniform1f(uPlateau, cell.plateau);
    gl.uniform1f(uRim, cell.rim);
    gl.uniform1f(uGloss, cell.gloss);
    gl.uniform1f(uShadow, cell.shadow);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function onPointerMove(event: PointerEvent) {
    mag.x = event.clientX;
    mag.y = event.clientY;
    mag.moved = true;
    if (mag.on && !mag.frame) mag.frame = requestAnimationFrame(paint);
  }

  function setMagnifier(on: boolean) {
    const nextOn = Boolean(on) && ctx.show.active && !ctx.ov.active && !ctx.curtain.active;
    if (nextOn) ctx.setPointer(false);
    mag.on = nextOn;
    document.documentElement.classList.toggle('is-stage-magnifier', mag.on);
    if (mag.on) {
      if (!mag.moved) {
        mag.x = window.innerWidth / 2;
        mag.y = window.innerHeight / 2;
      }
      refreshSnapshot();
      paint();
    } else if (gl && canvas) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    ctx.updateHud();
  }

  function toggleMagnifier() {
    setMagnifier(!mag.on);
  }

  function setSizeIndex(idx: number) {
    if (idx < 0 || idx >= MAGNIFIER_PRESETS.diameterRatios.length) return;
    mag.sizeIdx = idx;
    if (mag.on) paint();
    ctx.updateHud();
  }

  function setZoomIndex(idx: number) {
    if (idx < 0 || idx >= MAGNIFIER_PRESETS.zoomPresets.length) return;
    mag.zoomIdx = idx;
    if (mag.on) paint();
    ctx.updateHud();
  }

  function invalidateCssCache() {
    cachedCssResult = null;
  }

  return {
    mag,
    onPointerMove,
    setMagnifier,
    toggleMagnifier,
    setSizeIndex,
    setZoomIndex,
    refreshSnapshot,
    invalidateCssCache
  };
}
