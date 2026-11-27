/* ==========================================================================
   Structurizr C4 SVG 形状生成（Pure string markup）
   Person / RoundedBox / Box / Cylinder / WebBrowser / MobileDevice /
   Hexagon / Circle / Ellipse / Pipe / Robot / Folder / Component / Boundary
   ========================================================================== */
import type { BoxRect, ElementShape } from '../types';

export interface ShapeRenderStyle {
  fill: string;
  stroke: string;
  strokeDasharray?: string;
  opacity?: number;
}

function commonAttrs(style: ShapeRenderStyle): string {
  const parts = [
    `fill="${style.fill}"`,
    `stroke="${style.stroke}"`,
    'stroke-width="1.75"'
  ];
  if (style.strokeDasharray) parts.push(`stroke-dasharray="${style.strokeDasharray}"`);
  if (typeof style.opacity === 'number' && style.opacity < 1) parts.push(`opacity="${style.opacity.toFixed(2)}"`);
  return parts.join(' ');
}

export function renderNodeShapeSvg(shape: ElementShape, rect: BoxRect, style: ShapeRenderStyle): string {
  const { x, y, width: w, height: h } = rect;
  const attrs = commonAttrs(style);

  switch (shape) {
    case 'Person': {
      const headR = 16;
      const headCx = x + w / 2;
      const headCy = y + headR + 2;
      const bodyY = y + headR * 2 - 4;
      const bodyH = Math.max(48, h - (bodyY - y));
      return [
        `<rect x="${x}" y="${bodyY}" width="${w}" height="${bodyH}" rx="20" ry="20" ${attrs} />`,
        `<circle cx="${headCx}" cy="${headCy}" r="${headR}" ${attrs} />`
      ].join('');
    }
    case 'Robot': {
      const headW = 34;
      const headH = 24;
      const headX = x + (w - headW) / 2;
      const headY = y + 4;
      const bodyY = y + headH + 6;
      const bodyH = Math.max(48, h - (bodyY - y));
      return [
        `<rect x="${x}" y="${bodyY}" width="${w}" height="${bodyH}" rx="12" ry="12" ${attrs} />`,
        `<rect x="${headX}" y="${headY}" width="${headW}" height="${headH}" rx="6" ry="6" ${attrs} />`,
        `<circle cx="${headX + 10}" cy="${headY + 12}" r="2.5" fill="currentColor" opacity="0.8" />`,
        `<circle cx="${headX + headW - 10}" cy="${headY + 12}" r="2.5" fill="currentColor" opacity="0.8" />`
      ].join('');
    }
    case 'Cylinder': {
      const ry = Math.min(14, Math.max(8, Math.round(h * 0.13)));
      const rx = w / 2;
      const topY = y + ry;
      const botY = y + h - ry;
      const bodyPath = `M ${x} ${topY} L ${x} ${botY} A ${rx} ${ry} 0 0 0 ${x + w} ${botY} L ${x + w} ${topY} Z`;
      return [
        `<path d="${bodyPath}" ${attrs} />`,
        `<ellipse cx="${x + rx}" cy="${topY}" rx="${rx}" ry="${ry}" ${attrs} />`
      ].join('');
    }
    case 'Pipe': {
      const rx = Math.min(14, Math.max(8, Math.round(w * 0.08)));
      const ry = h / 2;
      const leftX = x + rx;
      const rightX = x + w - rx;
      const bodyPath = `M ${leftX} ${y} L ${rightX} ${y} A ${rx} ${ry} 0 0 1 ${rightX} ${y + h} L ${leftX} ${y + h} A ${rx} ${ry} 0 0 1 ${leftX} ${y} Z`;
      return [
        `<path d="${bodyPath}" ${attrs} />`,
        `<ellipse cx="${rightX}" cy="${y + ry}" rx="${rx}" ry="${ry}" ${attrs} />`
      ].join('');
    }
    case 'WebBrowser': {
      const barH = 18;
      return [
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" ry="8" ${attrs} />`,
        `<line x1="${x}" y1="${y + barH}" x2="${x + w}" y2="${y + barH}" stroke="${style.stroke}" stroke-width="1.25" opacity="0.7" />`,
        `<circle cx="${x + 12}" cy="${y + barH / 2}" r="2.5" fill="currentColor" opacity="0.65" />`,
        `<circle cx="${x + 22}" cy="${y + barH / 2}" r="2.5" fill="currentColor" opacity="0.65" />`,
        `<circle cx="${x + 32}" cy="${y + barH / 2}" r="2.5" fill="currentColor" opacity="0.65" />`
      ].join('');
    }
    case 'MobileDevicePortrait':
    case 'MobileDeviceLandscape': {
      return [
        `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" ry="14" ${attrs} />`,
        `<rect x="${x + 6}" y="${y + 10}" width="${Math.max(10, w - 12)}" height="${Math.max(10, h - 20)}" rx="6" ry="6" fill="none" stroke="${style.stroke}" stroke-width="1" opacity="0.55" />`
      ].join('');
    }
    case 'Hexagon': {
      const inset = Math.min(24, w * 0.16);
      const pts = [
        `${x + inset},${y}`,
        `${x + w - inset},${y}`,
        `${x + w},${y + h / 2}`,
        `${x + w - inset},${y + h}`,
        `${x + inset},${y + h}`,
        `${x},${y + h / 2}`
      ].join(' ');
      return `<polygon points="${pts}" ${attrs} />`;
    }
    case 'Circle': {
      const r = Math.min(w, h) / 2;
      return `<circle cx="${x + w / 2}" cy="${y + h / 2}" r="${r}" ${attrs} />`;
    }
    case 'Ellipse': {
      return `<ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" ${attrs} />`;
    }
    case 'Folder': {
      const tabW = Math.min(72, w * 0.38);
      const tabH = 12;
      const d = `M ${x} ${y + tabH} L ${x} ${y + 4} Q ${x} ${y} ${x + 4} ${y} L ${x + tabW - 6} ${y} L ${x + tabW} ${y + tabH} L ${x + w - 4} ${y + tabH} Q ${x + w} ${y + tabH} ${x + w} ${y + tabH + 4} L ${x + w} ${y + h - 4} Q ${x + w} ${y + h} ${x + w - 4} ${y + h} L ${x + 4} ${y + h} Q ${x} ${y + h} ${x} ${y + h - 4} Z`;
      return `<path d="${d}" ${attrs} />`;
    }
    case 'Component': {
      const tabW = 14;
      const tabH = 9;
      return [
        `<rect x="${x + 6}" y="${y}" width="${Math.max(12, w - 6)}" height="${h}" rx="6" ry="6" ${attrs} />`,
        `<rect x="${x}" y="${y + 14}" width="${tabW}" height="${tabH}" rx="2" ${attrs} />`,
        `<rect x="${x}" y="${y + 30}" width="${tabW}" height="${tabH}" rx="2" ${attrs} />`
      ].join('');
    }
    case 'Box':
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" ry="2" ${attrs} />`;
    case 'RoundedBox':
    default:
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" ry="10" ${attrs} />`;
  }
}
