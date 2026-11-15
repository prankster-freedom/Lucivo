// @ts-nocheck
import { state } from '../ui/state';
import { getDiagramSpec } from './mermaid-config';
import { createSvgElement } from './svg-postprocess';

// transform="translate(x, y)" から座標を読み取る
function parseTranslate(transformStr) {
  const m = /translate\(\s*([-\d.]+)(?:[\s,]+([-\d.]+))?\s*\)/.exec(transformStr || '');
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2] || '0') };
}

// ポリライン形式の path d ("M x,y L x,y ...") を点配列に変換（曲線コマンドがある場合は null）
function parsePolylinePoints(d) {
  if (!d || /[CQSTA]/i.test(d)) return null;
  const pts = [];
  const re = /([ML])\s*([-\d.]+)[\s,]+([-\d.]+)/gi;
  let m;
  while ((m = re.exec(d)) !== null) {
    pts.push({ cmd: m[1].toUpperCase(), x: parseFloat(m[2]), y: parseFloat(m[3]) });
  }
  return pts.length >= 2 ? pts : null;
}

function serializePolylinePoints(pts) {
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join('');
}

// #6: ひし形（判断ノード）から出る分岐ラベル（はい・いいえ等）を左右の肩の同じ高さに揃える
export function alignDecisionEdgeLabels(svg) {
  const diamonds = [];
  svg.querySelectorAll('g.node').forEach(node => {
    const poly = node.querySelector('polygon');
    const tr = parseTranslate(node.getAttribute('transform'));
    if (!poly || !tr) return;
    const rawPts = (poly.getAttribute('points') || '').trim().split(/\s+/).map(p => {
      const [px, py] = p.split(',').map(Number);
      return { x: px, y: py };
    }).filter(p => !Number.isNaN(p.x) && !Number.isNaN(p.y));
    if (rawPts.length !== 4) return;
    const xs = rawPts.map(p => p.x);
    const ys = rawPts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX, h = maxY - minY;
    // Mermaid のひし形はポリゴンの下端を原点 y=0、上端を -h として配置され、translate(cx, cy) される。
    // 実際の中心と幅高さをチェック（菱形は幅と高さが近く、平行四辺形は上下辺が水平）
    const topYs = ys.filter(y => Math.abs(y - minY) < 1);
    if (topYs.length > 1 || w < 20 || h < 20) return;
    const polyTr = parseTranslate(poly.getAttribute('transform')) || { x: 0, y: 0 };
    const cx = tr.x + polyTr.x + (minX + maxX) / 2;
    const cy = tr.y + polyTr.y + (minY + maxY) / 2;
    diamonds.push({
      cx,
      cy,
      hw: w / 2,
      hh: h / 2,
      bottom: tr.y + polyTr.y + maxY
    });
  });
  if (!diamonds.length) return;

  const edgePaths = Array.from(svg.querySelectorAll('path.flowchart-link'));
  const edgeLabels = Array.from(svg.querySelectorAll('g.edgeLabel'));
  if (!edgePaths.length || edgePaths.length !== edgeLabels.length) return;

  diamonds.forEach(d => {
    const branches = [];
    edgePaths.forEach((path, idx) => {
      const labelEl = edgeLabels[idx];
      if (!labelEl || !labelEl.textContent.trim()) return;
      const pts = parsePolylinePoints(path.getAttribute('d'));
      const labelTr = parseTranslate(labelEl.getAttribute('transform'));
      if (!pts || !labelTr) return;

      const start = pts[0];
      const inDiamond = Math.abs(start.x - d.cx) <= d.hw + 8 && start.y >= d.cy - 8 && start.y <= d.bottom + 8;
      if (!inDiamond) return;

      // 最初の垂直区間（x が連続して等しく、下に降りる区間）を探し、同 x の終端まで伸ばす
      let vertSeg = null;
      for (let i = 0; i < pts.length - 1; i++) {
        if (Math.abs(pts[i].x - pts[i + 1].x) < 1 && pts[i + 1].y > pts[i].y + 8) {
          const vx = pts[i].x;
          const y1 = pts[i].y;
          let y2 = pts[i + 1].y;
          for (let j = i + 2; j < pts.length; j++) {
            if (Math.abs(pts[j].x - vx) < 1 && pts[j].y >= y2) {
              y2 = pts[j].y;
            } else {
              break;
            }
          }
          vertSeg = { x: vx, y1, y2 };
          break;
        }
      }
      if (!vertSeg) return;
      branches.push({ labelEl, labelTr, vertSeg });
    });

    if (branches.length < 2) return;
    // 全分岐の垂直区間に共通して収まる高さ（ひし形の肩の下あたり）を決める
    const minValidY = Math.max(...branches.map(b => b.vertSeg.y1)) + 20;
    const maxValidY = Math.min(...branches.map(b => b.vertSeg.y2)) - 16;
    if (minValidY > maxValidY) return;
    const targetY = Math.min(Math.max(d.bottom + 8, minValidY), maxValidY);
    branches.forEach(b => {
      b.labelEl.setAttribute('transform', `translate(${b.vertSeg.x}, ${targetY})`);
    });
  });
}

// #8: サブグラフ（cluster）上辺の枠線・タイトルに沿って水平移動する矢印を枠線の外（上）へ逃がす
export function avoidClusterHeaderOverlap(svg) {
  const clusters = Array.from(svg.querySelectorAll('g.cluster')).map(c => {
    const rect = c.querySelector('rect');
    if (!rect) return null;
    return {
      x: parseFloat(rect.getAttribute('x') || '0'),
      y: parseFloat(rect.getAttribute('y') || '0'),
      w: parseFloat(rect.getAttribute('width') || '0'),
      h: parseFloat(rect.getAttribute('height') || '0')
    };
  }).filter(Boolean);
  if (!clusters.length) return;

  svg.querySelectorAll('path.flowchart-link').forEach(path => {
    const pts = parsePolylinePoints(path.getAttribute('d'));
    if (!pts || pts.length < 4) return;
    let changed = false;

    clusters.forEach(c => {
      for (let i = 1; i < pts.length - 1; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const next = pts[i + 1];
        // クラスター上端 y に沿って水平に走っている区間を検出
        const onTopBorder = Math.abs(curr.y - c.y) <= 4 && Math.abs(next.y - c.y) <= 4 && Math.abs(curr.x - next.x) > 4;
        const entersClusterX = (curr.x >= c.x - 20 && curr.x <= c.x + c.w + 20) || (next.x >= c.x - 20 && next.x <= c.x + c.w + 20);
        if (onTopBorder && entersClusterX) {
          const safeY = Math.max(prev.y + 6, c.y - 16);
          if (safeY < curr.y - 2) {
            curr.y = safeY;
            next.y = safeY;
            changed = true;
          }
        }
      }
    });

    if (changed) {
      path.setAttribute('d', serializePolylinePoints(pts));
    }
  });
}

// #8 & #9: サブグラフタイトルを左上のピル型ヘッダーに整理し、枠線・矢印との衝突を防ぐ
export function polishClusterHeaders(svg, isVisualMode, spec) {
  const isDark = state.appearance === 'dark';
  const pillBg = isDark ? '#1E293B' : '#FFFFFF';
  const pillBorder = spec.clusterBorder || (isDark ? '#475569' : '#CBD5E1');
  const pillText = spec.nodeText || (isDark ? '#F1F5F9' : '#0F172A');

  svg.querySelectorAll('g.cluster').forEach(cluster => {
    const rect = cluster.querySelector('rect.outer') || cluster.querySelector('rect');
    const labelGroup = cluster.querySelector('.cluster-label');
    const fo = labelGroup && labelGroup.querySelector('foreignObject');
    if (!rect || !labelGroup || !fo) return;

    const rx = parseFloat(rect.getAttribute('x') || '0');
    const ry = parseFloat(rect.getAttribute('y') || '0');
    const foW = parseFloat(fo.getAttribute('width') || '60');
    const foH = parseFloat(fo.getAttribute('height') || '20');

    // 左上角（枠線上）に配置して中央を通る矢印から離す
    const padX = 14;
    const badgeX = rx + 14;
    const badgeY = ry - foH / 2 - 1;
    labelGroup.setAttribute('transform', `translate(${badgeX}, ${badgeY})`);

    if (isVisualMode && !labelGroup.querySelector('.vs-cluster-pill-bg')) {
      const pillRect = createSvgElement('rect', {
        class: 'vs-cluster-pill-bg',
        x: -padX / 2,
        y: -2,
        width: foW + padX,
        height: foH + 4,
        rx: (foH + 4) / 2,
        ry: (foH + 4) / 2
      });
      pillRect.style.setProperty('fill', pillBg, 'important');
      pillRect.style.setProperty('stroke', pillBorder, 'important');
      pillRect.style.setProperty('stroke-width', '1.5px', 'important');
      labelGroup.insertBefore(pillRect, labelGroup.firstChild);
    }

    fo.querySelectorAll('div, span, p').forEach(el => {
      el.style.setProperty('color', pillText, 'important');
      el.style.setProperty('font-weight', '700', 'important');
      el.style.setProperty('font-size', '12px', 'important');
      el.style.setProperty('line-height', `${foH}px`, 'important');
      el.style.setProperty('text-align', 'center', 'important');
    });
  });
}

// #7 & #9: 円グラフの視認性向上（文字サイズ拡大＋Visual モードのドーナツインフォグラフィック化）
export function enhancePieChart(svg, isVisualMode, spec) {
  const isDark = state.appearance === 'dark';
  const titleEl = svg.querySelector('text.pieTitleText');
  if (titleEl) {
    titleEl.style.setProperty('font-size', '26px', 'important');
    titleEl.style.setProperty('font-weight', '800', 'important');
    titleEl.style.setProperty('letter-spacing', '-0.01em', 'important');
    const curY = parseFloat(titleEl.getAttribute('y') || '-200');
    titleEl.setAttribute('y', String(curY - 12));
  }

  const slices = Array.from(svg.querySelectorAll('path.pieCircle'));
  const sliceTexts = Array.from(svg.querySelectorAll('text.slice'));
  const outerCircle = svg.querySelector('circle.pieOuterCircle');
  const legends = Array.from(svg.querySelectorAll('g.legend'));

  // パーセンテージ文字を拡大・太字化し、中心からの距離をドーナツ帯の中央に揃える
  sliceTexts.forEach(t => {
    t.style.setProperty('font-size', '22px', 'important');
    t.style.setProperty('font-weight', '800', 'important');
    t.style.setProperty('font-variant-numeric', 'tabular-nums', 'important');
    const tr = parseTranslate(t.getAttribute('transform'));
    if (tr && isVisualMode) {
      const dist = Math.hypot(tr.x, tr.y);
      if (dist > 10) {
        const targetR = 132;
        const scale = targetR / dist;
        t.setAttribute('transform', `translate(${(tr.x * scale).toFixed(2)}, ${(tr.y * scale).toFixed(2)})`);
      }
    }
  });

  // 凡例を角丸ピル＆大きい文字＆ゆったり行間に
  const legendCount = legends.length;
  const lineStep = 30;
  const startY = -((legendCount - 1) * lineStep) / 2;
  legends.forEach((g, idx) => {
    const tr = parseTranslate(g.getAttribute('transform'));
    const lx = tr ? tr.x : 216;
    g.setAttribute('transform', `translate(${lx}, ${startY + idx * lineStep})`);
    const rect = g.querySelector('rect');
    if (rect) {
      rect.setAttribute('width', '20');
      rect.setAttribute('height', '20');
      rect.setAttribute('rx', '6');
      rect.setAttribute('ry', '6');
      rect.setAttribute('y', '-2');
      rect.style.setProperty('stroke-width', '0', 'important');
    }
    const text = g.querySelector('text');
    if (text) {
      text.setAttribute('x', '28');
      text.setAttribute('y', '13');
      text.style.setProperty('font-size', '19px', 'important');
      text.style.setProperty('font-weight', '600', 'important');
    }
  });

  if (isVisualMode) {
    const holeFill = isDark ? '#1E293B' : '#FFFFFF';
    slices.forEach(p => {
      p.style.setProperty('stroke', holeFill, 'important');
      p.style.setProperty('stroke-width', '3.5px', 'important');
      p.style.setProperty('stroke-linejoin', 'round', 'important');
    });
    if (outerCircle) {
      outerCircle.style.setProperty('stroke', spec.clusterBorder || '#CBD5E1', 'important');
      outerCircle.style.setProperty('stroke-width', '1.5px', 'important');
      outerCircle.style.setProperty('opacity', '0.5', 'important');
    }
    // 中央にドーナツホールを追加（Mermaid の円は中央の <g> 内で (0,0) 中心。ラベルの背面に置く）
    const lastSlice = slices[slices.length - 1];
    if (lastSlice && !lastSlice.parentElement.querySelector('.vs-pie-donut-hole')) {
      const hole = createSvgElement('circle', {
        class: 'vs-pie-donut-hole',
        cx: 0,
        cy: 0,
        r: 76
      });
      hole.style.setProperty('fill', holeFill, 'important');
      const innerRing = createSvgElement('circle', {
        class: 'vs-pie-donut-ring',
        cx: 0,
        cy: 0,
        r: 76
      });
      innerRing.style.setProperty('fill', 'none', 'important');
      innerRing.style.setProperty('stroke', spec.clusterBorder || '#CBD5E1', 'important');
      innerRing.style.setProperty('stroke-width', '1.5px', 'important');
      innerRing.style.setProperty('opacity', '0.45', 'important');
      lastSlice.after(hole, innerRing);
    }
  }

  // 文字と凡例を拡大したぶん、viewBox に余裕を持たせる
  const vb = svg.viewBox && svg.viewBox.baseVal;
  if (vb && vb.width > 0) {
    svg.setAttribute('viewBox', `${vb.x - 10} ${vb.y - 16} ${vb.width + 44} ${vb.height + 24}`);
  }
}

// 全図表共通のレイアウト・視認性補正エントリポイント
export function applyDiagramLayoutFixes(svg, diagramType, isVisualMode) {
  const spec = getDiagramSpec(isVisualMode);
  if (diagramType === 'flowchart-v2') {
    alignDecisionEdgeLabels(svg);
    avoidClusterHeaderOverlap(svg);
    polishClusterHeaders(svg, isVisualMode, spec);
  } else if (diagramType === 'pie') {
    enhancePieChart(svg, isVisualMode, spec);
  }
}
