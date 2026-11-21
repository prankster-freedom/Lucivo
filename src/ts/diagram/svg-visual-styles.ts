// @ts-nocheck
import { hexToRgba, mixHex } from '../utils/color';
import {
  NODE_DECORATED_TYPES,
  CIRCLE_DARK_TEXT_FILLS,
  SEQUENCE_MATH_LIFT,
  getToneEntry,
  getEffectiveVisualPalette,
  LIGHT_SECTION_TEXT,
  state
} from '../ui/state';
import { getThemeSpec, getDiagramSpec, VISUAL_NODE_LABEL_WEIGHT } from './mermaid-config';
import {
  pathBox,
  createSvgElement,
  hasUserStyle,
  hasUserTextColor,
  styleSequenceDiagram
} from './svg-postprocess';

export function decorateVisualSvg(svg, diagramType) {
  const styleMode = state.infographicStyle;
  const visualSpec = getDiagramSpec(true);

  const uid = addVisualDefs(svg);

  if (diagramType === 'sequence') {
    decorateVisualSequence(svg, styleMode, visualSpec, uid);
    return;
  }
  if (diagramType === 'mindmap' && state.appearance !== 'dark') decorateMindmapRoot(svg, styleMode);
  // その他の図種は、構造を保ったまま setupMermaid のスタイル配色だけで描画する（FR-008）
  if (!NODE_DECORATED_TYPES.includes(diagramType)) return;

  // サブグラフの磨りガラス・フレーム化（カード背景の明暗に合わせる）
  const frost = state.appearance === 'dark' ? 'rgba(15, 23, 42, 0.55)' : 'rgba(255, 255, 255, 0.65)';
  svg.querySelectorAll('g.cluster, g.statediagram-cluster').forEach(cluster => {
    const outerRect = cluster.querySelector('rect.outer') || cluster.querySelector('rect');
    if (outerRect) {
      outerRect.setAttribute('rx', '18');
      outerRect.setAttribute('ry', '18');
      outerRect.style.setProperty('fill', frost, 'important');
      outerRect.style.setProperty('stroke', visualSpec.clusterBorder, 'important');
      outerRect.style.setProperty('stroke-width', '2px', 'important');
    }
  });

  const decorators = {
    shapes: decorateVisualShapes,
    cards: decorateVisualCards,
    circles: decorateVisualCircles,
    editorial: decorateVisualEditorial
  };
  const decorate = decorators[styleMode];
  if (decorate) decorate(svg, uid);

  fixMarkerScale(svg);
}

// Light のマインドマップの中心（主題）を、スタイルの第 1 色で塗る（DD-DIAG-026）。
// 中心の色は Mermaid では Git グラフと共通の変数（git0）から決まり、ノードが白いスタイルでは灰色になって主役に見えない。
// 変数を変えると Git グラフの色も変わるため、描画後に中心だけを塗り直す（書き出しにも残るよう、要素のスタイルに書く）
function decorateMindmapRoot(svg, styleMode) {
  const base = getEffectiveVisualPalette(styleMode, state.appearance)[0];
  // 塗りが暗いスタイル（Circles の赤）では、文字を白にする
  const v = parseInt(base.slice(1), 16);
  const lin = c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const luminance = 0.2126 * lin((v >> 16) & 255) + 0.7152 * lin((v >> 8) & 255) + 0.0722 * lin(v & 255);
  const textColor = luminance < 0.3 ? '#FFFFFF' : LIGHT_SECTION_TEXT;
  svg.querySelectorAll('.section-root').forEach(root => {
    root.querySelectorAll('rect, path, circle, polygon, ellipse').forEach(shape => {
      if (hasUserStyle(shape, 'fill')) return;
      shape.style.setProperty('fill', base, 'important');
    });
    root.querySelectorAll('.nodeLabel, .nodeLabel *, text, tspan').forEach(label => {
      if (hasUserTextColor(label)) return;
      label.style.setProperty('color', textColor, 'important');
      label.style.setProperty('fill', textColor, 'important');
    });
  });
}

// Visual Stage で使う影・グラデーションを defs に追加し、id の接尾辞を返す
export function addVisualDefs(svg) {
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }


  const uid = Math.random().toString(36).slice(2, 7);
  const isDark = state.appearance === 'dark';
  const hasCustomTone = Boolean(state.tone && state.tone !== 'default');
  const toneMode = hasCustomTone ? (isDark ? getToneEntry(state.tone).dark : getToneEntry(state.tone).light) : null;
  const palette = hasCustomTone ? getEffectiveVisualPalette(state.infographicStyle, state.appearance) : null;
  const softGrad = (hex: string) => (isDark
    ? [mixHex(hex, toneMode.canvasBg, 0.32), mixHex(hex, toneMode.canvasBg, 0.54)]
    : [mixHex(hex, '#FFFFFF', 0.45), mixHex(hex, '#FFFFFF', 0.74)]);
  const capGrad = (hex: string) => (isDark
    ? [hex, mixHex(hex, '#FFFFFF', 0.28)]
    : [hex, mixHex(hex, '#FFFFFF', 0.24)]);
  // Dark 外観やカスタムトーン選択時に図のノード色が背景に沈まないよう、鮮明なグラデーションを選択する（#260, #311）
  const gAmber = hasCustomTone ? softGrad(palette[0]) : (isDark ? ['#F59E0B', '#FDE047'] : ['#E89B27', '#F7D05C']);
  const gAqua = hasCustomTone ? softGrad(palette[1]) : (isDark ? ['#22D3EE', '#A5F3FC'] : ['#73E8F4', '#DAEDFA']);
  const gCoral = hasCustomTone ? softGrad(palette[2]) : (isDark ? ['#FB7185', '#FDA4AF'] : ['#E87C6C', '#F6CBC3']);
  const gLime = hasCustomTone ? softGrad(palette[3]) : (isDark ? ['#4ADE80', '#BEF264'] : ['#8CEE97', '#CEF65B']);
  const capCoral = hasCustomTone ? capGrad(palette[0]) : (isDark ? ['#F08060', '#FFA388'] : ['#E29578', '#ECAC94']);
  const capGold = hasCustomTone ? capGrad(palette[1]) : (isDark ? ['#F0B429', '#FFD466'] : ['#E5AD35', '#F3C868']);
  const capViolet = hasCustomTone ? capGrad(palette[2]) : (isDark ? ['#8CA6F8', '#B4C6FF'] : ['#9AAEE4', '#BAC7EC']);
  const capTeal = hasCustomTone ? capGrad(palette[3]) : (isDark ? ['#45C4C0', '#7AE0DC'] : ['#64ADB0', '#88C4C6']);

  defs.insertAdjacentHTML('beforeend', `
    <filter id="vis-soft-shadow-${uid}" x="-30%" y="-30%" width="160%" height="170%">
      <feDropShadow dx="0" dy="6" stdDeviation="5.5" flood-color="#0F172A" flood-opacity="${isDark ? '0.32' : '0.16'}" />
    </filter>
    <filter id="vis-card-shadow-${uid}" x="-20%" y="-20%" width="140%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0F172A" flood-opacity="${isDark ? '0.28' : '0.14'}" />
    </filter>

    <linearGradient id="vis-g-amber-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${gAmber[0]}" />
      <stop offset="100%" stop-color="${gAmber[1]}" />
    </linearGradient>
    <linearGradient id="vis-g-aqua-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gAqua[0]}" />
      <stop offset="100%" stop-color="${gAqua[1]}" />
    </linearGradient>
    <linearGradient id="vis-g-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gCoral[0]}" />
      <stop offset="100%" stop-color="${gCoral[1]}" />
    </linearGradient>
    <linearGradient id="vis-g-lime-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${gLime[0]}" />
      <stop offset="100%" stop-color="${gLime[1]}" />
    </linearGradient>

    <linearGradient id="vis-cap-coral-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${capCoral[0]}" />
      <stop offset="100%" stop-color="${capCoral[1]}" />
    </linearGradient>
    <linearGradient id="vis-cap-gold-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${capGold[0]}" />
      <stop offset="100%" stop-color="${capGold[1]}" />
    </linearGradient>
    <linearGradient id="vis-cap-violet-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${capViolet[0]}" />
      <stop offset="100%" stop-color="${capViolet[1]}" />
    </linearGradient>
    <linearGradient id="vis-cap-teal-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${capTeal[0]}" />
      <stop offset="100%" stop-color="${capTeal[1]}" />
    </linearGradient>
  `);
  return uid;
}

// 影を個々のノードではなく親グループ（g.nodes 等）に 1 回だけ適用し、SVG フィルターの合成負荷を抑える（#254）
function applyGroupedNodeShadow(svg: Element, targetNodes: Set<Element>, filterUrl: string) {
  if (!targetNodes.size) return;
  const nodesLayer = svg.querySelector('g.nodes');
  if (nodesLayer) {
    const directChildren = Array.from(nodesLayer.children);
    const allDirectAreTargets = directChildren.length > 0 && directChildren.every(ch => targetNodes.has(ch));
    if (allDirectAreTargets) {
      nodesLayer.setAttribute('filter', filterUrl);
      return;
    }
    const inLayer = Array.from(targetNodes).filter(n => n.parentElement === nodesLayer);
    if (inLayer.length > 0) {
      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.setAttribute('class', 'vis-shadow-group');
      group.setAttribute('filter', filterUrl);
      nodesLayer.appendChild(group);
      inLayer.forEach(n => group.appendChild(n));
    }
    targetNodes.forEach(n => {
      if (n.parentElement !== nodesLayer && n.parentElement?.getAttribute('class') !== 'vis-shadow-group') {
        n.setAttribute('filter', filterUrl);
      }
    });
    return;
  }
  targetNodes.forEach(n => n.setAttribute('filter', filterUrl));
}

// スタイル 1: 🎨 Pastel Shapes (リファレンス1準拠)
export function decorateVisualShapes(svg, uid) {
  const shadowNodes = new Set<Element>();
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const polygon = g.querySelector('polygon');
    const text = (g.textContent || '').toLowerCase();

    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      if (hasUserTextColor(el)) return;
      el.style.setProperty('color', '#1E293B', 'important');
      el.style.setProperty('fill', '#1E293B', 'important');
      el.style.setProperty('font-weight', String(VISUAL_NODE_LABEL_WEIGHT.shapes), 'important');
    });

    if (rect) {
      if (!hasUserStyle(rect, 'stroke')) {
        rect.style.setProperty('stroke', 'none', 'important');
      }
      shadowNodes.add(g);

      if (!hasUserStyle(rect, 'fill')) {
        if (idx === 0 || text.includes('client') || text.includes('start') || text.includes('standby')) {
          rect.setAttribute('rx', '9999');
          rect.setAttribute('ry', '9999');
          rect.style.setProperty('fill', '#FFFFFF', 'important');
        } else if (text.includes('terminal') || text.includes('landing') || text.includes('end') || text.includes('終了')) {
          rect.setAttribute('rx', '9999');
          rect.setAttribute('ry', '9999');
          rect.style.setProperty('fill', `url(#vis-g-lime-${uid})`, 'important');
        } else {
          rect.setAttribute('rx', '10');
          rect.setAttribute('ry', '10');
          rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
        }
      }
    }

    if (polygon) {
      if (!hasUserStyle(polygon, 'stroke')) {
        polygon.style.setProperty('stroke', 'none', 'important');
      }
      shadowNodes.add(g);
      if (!hasUserStyle(polygon, 'fill')) {
        const points = polygon.getAttribute('points') || '';
        if (points.split(' ').length <= 5) {
          polygon.style.setProperty('fill', `url(#vis-g-aqua-${uid})`, 'important');
        } else {
          polygon.style.setProperty('fill', `url(#vis-g-coral-${uid})`, 'important');
        }
      }
    }
  });
  applyGroupedNodeShadow(svg, shadowNodes, `url(#vis-soft-shadow-${uid})`);

  // 結線の色はカード背景に合わせる（Dark では明るい色）
  const edgeColor = getDiagramSpec(true).edgeStroke;
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    if (!hasUserStyle(p, 'stroke')) {
      p.style.setProperty('stroke', edgeColor, 'important');
    }
    if (!hasUserStyle(p, 'stroke-width')) {
      p.style.setProperty('stroke-width', '2px', 'important');
    }
    p.style.setProperty('stroke-dasharray', 'none', 'important');
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', edgeColor, 'important');
    m.style.setProperty('stroke', edgeColor, 'important');
  });
}

// スタイル 2: 📋 2-Tier Cards (リファレンス4準拠)
export function decorateVisualCardNode(g: Element, _uid: string, capGradients: string[], stepLabel: (n: number) => string, nextIdx: () => number, shadowNodes?: Set<Element>) {
  const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
  if (!rect) return;

  const styleCardLabels = () => {
    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach((el: any) => {
      if (hasUserTextColor(el)) return;
      el.style.setProperty('color', '#0F172A', 'important');
      el.style.setProperty('fill', '#0F172A', 'important');
      el.style.setProperty('font-weight', String(VISUAL_NODE_LABEL_WEIGHT.cards), 'important');
    });
  };

  if (hasUserStyle(rect, 'fill') || hasUserStyle(rect, 'stroke')) {
    if (shadowNodes) shadowNodes.add(g);
    styleCardLabels();
    return;
  }

  const x = parseFloat(rect.getAttribute('x') || '0');
  const y = parseFloat(rect.getAttribute('y') || '0');
  const w = parseFloat(rect.getAttribute('width') || '0');
  const h = parseFloat(rect.getAttribute('height') || '0');
  if (w <= 10 || h <= 10) return;
  const idx = nextIdx();

  rect.setAttribute('rx', '12');
  rect.setAttribute('ry', '12');
  (rect as HTMLElement).style.setProperty('fill', '#FFFFFF', 'important');
  (rect as HTMLElement).style.setProperty('stroke', '#E2E8F0', 'important');
  (rect as HTMLElement).style.setProperty('stroke-width', '1.5px', 'important');
  if (shadowNodes) shadowNodes.add(g);

  const cap = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  cap.setAttribute('x', String(x));
  cap.setAttribute('y', String(y));
  cap.setAttribute('width', String(w));
  const capH = Math.min(24, h * 0.38);
  cap.setAttribute('height', String(capH));
  cap.setAttribute('rx', '12');
  cap.setAttribute('ry', '12');
  cap.style.setProperty('fill', capGradients[idx % capGradients.length], 'important');
  cap.style.setProperty('stroke', 'none', 'important');
  cap.style.setProperty('pointer-events', 'none');
  g.appendChild(cap);

  const label = g.querySelector(':scope > .label');
  if (label) label.setAttribute('transform', `${label.getAttribute('transform') || ''} translate(0, ${capH / 2})`.trim());

  const stepText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  stepText.setAttribute('x', String(x + 10));
  stepText.setAttribute('y', String(y + capH - 7));
  stepText.setAttribute('fill', '#FFFFFF');
  stepText.setAttribute('font-size', '11');
  stepText.setAttribute('font-weight', '800');
  stepText.setAttribute('font-family', '"Plus Jakarta Sans", sans-serif');
  stepText.textContent = stepLabel(idx);
  g.appendChild(stepText);
  styleCardLabels();
}

export function decorateVisualCards(svg, uid) {
  const capGradients = [
    `url(#vis-cap-coral-${uid})`,
    `url(#vis-cap-gold-${uid})`,
    `url(#vis-cap-violet-${uid})`,
    `url(#vis-cap-teal-${uid})`
  ];
  // 記号は A〜Z、続けて AA, AB…（表計算の列名と同じ）。ノードの多い図でも記号が重複しないようにする
  const stepLabel = (n: number): string => (n < 26 ? '' : stepLabel(Math.floor(n / 26) - 1)) + String.fromCharCode(65 + (n % 26));
  // カード化したノードだけを図の上から順（同じ高さは左から）に数え、記号が A, B, C… と並ぶようにする
  let cardCount = 0;
  const nodePos = (g: Element) => {
    const m = /translate\(\s*([-\d.]+)[\s,]+([-\d.]+)\s*\)/.exec(g.getAttribute('transform') || '');
    return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : { x: 0, y: 0 };
  };
  const orderedNodes = Array.from(svg.querySelectorAll('g.node:not(.statediagram-cluster)'))
    .map((g: any) => ({ g, pos: nodePos(g) }))
    .sort((a, b) => (a.pos.y - b.pos.y) || (a.pos.x - b.pos.x))
    .map(item => item.g);

  const shadowNodes = new Set<Element>();
  orderedNodes.forEach(g => decorateVisualCardNode(g, uid, capGradients, stepLabel, () => cardCount++, shadowNodes));
  applyGroupedNodeShadow(svg, shadowNodes, `url(#vis-card-shadow-${uid})`);

  const edgeColor = getDiagramSpec(true).edgeStroke;
  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    if (!hasUserStyle(p, 'stroke')) p.style.setProperty('stroke', edgeColor, 'important');
    if (!hasUserStyle(p, 'stroke-width')) p.style.setProperty('stroke-width', '2px', 'important');
  });
}

// スタイル 3: ⭕ Vibrant Circles & Dots (リファレンス2準拠)
export function decorateVisualCircles(svg, uid) {
  const circlePalette = ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763', '#6D597A', '#3D464D'];
  const shadowNodes = new Set<Element>();

  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const color = circlePalette[idx % circlePalette.length];

    if (rect) {
      rect.setAttribute('rx', '9999');
      rect.setAttribute('ry', '9999');
      if (!hasUserStyle(rect, 'fill')) {
        rect.style.setProperty('fill', color, 'important');
      }
      if (!hasUserStyle(rect, 'stroke')) {
        rect.style.setProperty('stroke', '#FFFFFF', 'important');
        rect.style.setProperty('stroke-width', '2.5px', 'important');
      }
      shadowNodes.add(g);
    }
    // ひし形・平行四辺形も塗り分ける（白文字を淡い塗りの上に載せないため）
    const polygon = g.querySelector('polygon');
    if (polygon) {
      if (!hasUserStyle(polygon, 'fill')) {
        polygon.style.setProperty('fill', color, 'important');
      }
      if (!hasUserStyle(polygon, 'stroke')) {
        polygon.style.setProperty('stroke', '#FFFFFF', 'important');
        polygon.style.setProperty('stroke-width', '2.5px', 'important');
      }
      shadowNodes.add(g);
    }

    // 明るいキャメル色の上の白文字はコントラストが足りないため、その色だけ濃い文字にする
    const textColor = CIRCLE_DARK_TEXT_FILLS.includes(color) ? '#3B2A0E' : '#FFFFFF';
    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      if (hasUserTextColor(el)) return;
      el.style.setProperty('color', textColor, 'important');
      el.style.setProperty('fill', textColor, 'important');
      el.style.setProperty('font-weight', String(VISUAL_NODE_LABEL_WEIGHT.circles), 'important');
    });
  });
  applyGroupedNodeShadow(svg, shadowNodes, `url(#vis-soft-shadow-${uid})`);

  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach((p, idx) => {
    if (!hasUserStyle(p, 'stroke')) {
      const color = circlePalette[idx % circlePalette.length];
      p.style.setProperty('stroke', color, 'important');
      p.style.setProperty('stroke-width', '4px', 'important');
      p.style.setProperty('stroke-linecap', 'round', 'important');
      p.style.setProperty('stroke-dasharray', '0 9', 'important');
    }
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', '#7EA6BF', 'important');
  });
}

// スタイル 4: 📖 Editorial Cream (リファレンス3準拠)
export function decorateVisualEditorial(svg, uid) {
  const shadowNodes = new Set<Element>();
  svg.querySelectorAll('g.node:not(.statediagram-cluster)').forEach((g, idx) => {
    const rect = g.querySelector('rect.basic, rect.label-container') || g.querySelector('rect');
    const text = (g.textContent || '').toLowerCase();
    // 状態遷移図の並行（fork / join）のバーは細い矩形。白で塗るとクリーム色の背景に溶けるため、Mermaid の線の色のまま残す
    if (rect && parseFloat(rect.getAttribute('height') || 0) <= 10) return;

    if (rect) {
      if (!hasUserStyle(rect, 'fill') && !hasUserStyle(rect, 'stroke')) {
        if (idx === 0 || text.includes('start') || text.includes('client')) {
          rect.setAttribute('rx', '9999');
          rect.setAttribute('ry', '9999');
          rect.style.setProperty('fill', '#FFFFFF', 'important');
          rect.style.setProperty('stroke', '#E29578', 'important');
          rect.style.setProperty('stroke-width', '3px', 'important');
        } else if (text.includes('type') || text.includes('terminat') || text.includes('landing') || text.includes('docking')) {
          rect.setAttribute('rx', '8');
          rect.setAttribute('ry', '8');
          rect.style.setProperty('fill', '#D68C8C', 'important');
          rect.style.setProperty('stroke', 'none', 'important');
          g.querySelectorAll('foreignObject div, foreignObject span, text').forEach(el => {
            if (hasUserTextColor(el)) return;
            el.style.setProperty('color', '#FFFFFF', 'important');
            el.style.setProperty('fill', '#FFFFFF', 'important');
          });
          return;
        } else {
          rect.setAttribute('rx', '9999');
          rect.setAttribute('ry', '9999');
          rect.style.setProperty('fill', '#FFFFFF', 'important');
          rect.style.setProperty('stroke', 'none', 'important');
          shadowNodes.add(g);
        }
      } else {
        if (!hasUserStyle(rect, 'fill')) {
          rect.style.setProperty('fill', '#FFFFFF', 'important');
        }
        if (!hasUserStyle(rect, 'stroke')) {
          rect.style.setProperty('stroke', 'none', 'important');
        }
        shadowNodes.add(g);
      }
    }

    g.querySelectorAll('foreignObject div, foreignObject span, foreignObject small, text, .nodeLabel, .stateLabel').forEach(el => {
      if (hasUserTextColor(el)) return;
      el.style.setProperty('color', '#2B2D42', 'important');
      el.style.setProperty('fill', '#2B2D42', 'important');
      el.style.setProperty('font-weight', String(VISUAL_NODE_LABEL_WEIGHT.editorial), 'important');
    });
  });
  applyGroupedNodeShadow(svg, shadowNodes, `url(#vis-soft-shadow-${uid})`);

  svg.querySelectorAll('.edgePath path.path, path.flowchart-link, path.transition').forEach(p => {
    if (!hasUserStyle(p, 'stroke')) {
      p.style.setProperty('stroke', '#8FA876', 'important');
      p.style.setProperty('stroke-width', '3.5px', 'important');
      p.style.setProperty('stroke-dasharray', 'none', 'important');
    }
  });
  svg.querySelectorAll('marker path').forEach(m => {
    m.style.setProperty('fill', '#8FA876', 'important');
    m.style.setProperty('stroke', '#8FA876', 'important');
  });
}

// 線幅を基準に拡大されるマーカー（状態遷移図の矢じりなど）を、線幅によらない大きさに固定する。
// Visual Stage は線を太くするため、そのままでは矢じりが巨大になり、ラベルや状態に重なる
export function fixMarkerScale(svg) {
  const scale = 1.6;
  svg.querySelectorAll('marker').forEach(marker => {
    if (marker.getAttribute('markerUnits') === 'userSpaceOnUse') return;
    const w = parseFloat(marker.getAttribute('markerWidth') || 3);
    const h = parseFloat(marker.getAttribute('markerHeight') || 3);
    if (!marker.getAttribute('viewBox')) marker.setAttribute('viewBox', `0 0 ${w} ${h}`);
    marker.setAttribute('markerUnits', 'userSpaceOnUse');
    marker.setAttribute('markerWidth', String(w * scale));
    marker.setAttribute('markerHeight', String(h * scale));
  });
}

// Visual Stage のシーケンス図：参加者の箱をスタイルに合わせ、線・活性区間・矢じりを見分けやすくする（NFR-004）
export function decorateVisualSequence(svg, styleMode, visualSpec, uid) {
  // 同じ参加者の上下の箱を同じ色にするため、参加者名ごとに色を割り当てる
  const actorOrder = [];
  svg.querySelectorAll('rect.actor').forEach(rect => {
    const name = rect.getAttribute('name') || '';
    if (!actorOrder.includes(name)) actorOrder.push(name);
    const idx = actorOrder.indexOf(name);
    rect.setAttribute('rx', '10');
    rect.setAttribute('ry', '10');
    rect.setAttribute('filter', `url(#vis-soft-shadow-${uid})`);
    if (styleMode === 'shapes') {
      rect.style.setProperty('fill', `url(#vis-g-amber-${uid})`, 'important');
      rect.style.setProperty('stroke', 'none', 'important');
    } else if (styleMode === 'circles') {
      rect.style.setProperty('fill', ['#7EA6BF', '#D45D53', '#7D9763', '#ECB674'][idx % 4], 'important');
      rect.style.setProperty('stroke', '#FFFFFF', 'important');
      rect.style.setProperty('stroke-width', '2px', 'important');
    } else {
      rect.style.setProperty('fill', '#FFFFFF', 'important');
      rect.style.setProperty('stroke', visualSpec.nodeStroke, 'important');
      rect.style.setProperty('stroke-width', '1.5px', 'important');
    }
  });
  // 参加者の箱の塗りは外観によらないため、箱の文字の色も固定する（Dark では配色の nodeText が明るくなるため）
  // 人型の参加者（actor）の名前は箱ではなく背景の上に描かれるため、配色（外観に合わせた色）のままにする
  svg.querySelectorAll('text.actor, text.actor tspan').forEach(el => {
    if (el.closest('.actor-man')) return;
    el.style.setProperty('fill', styleMode === 'circles' ? '#FFFFFF' : '#1E293B', 'important');
    if (styleMode === 'circles') el.style.setProperty('font-weight', '700', 'important');
  });
  const isDark = state.appearance === 'dark';
  styleSequenceDiagram(svg, {
    lifeline: visualSpec.lifeline,
    activationBg: visualSpec.activationBg,
    activationBorder: visualSpec.activationBorder,
    signal: visualSpec.edgeStroke,
    // 番号は矢じりと同じ色の円の上に載る。Dark では円が明るい色になるため、番号を暗い色にする
    numberText: isDark ? '#0F172A' : '#FFFFFF',
    messageText: visualSpec.nodeText
  });
}

/* ==========================================================================
   ダイアグラムカード生成
   ========================================================================== */
