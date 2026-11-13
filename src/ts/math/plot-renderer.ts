import { hexToRgba } from '../utils/color';
import type { TexPlotSpec } from './plot-parser';

/* ==========================================================================
   数式の補足グラフ: 範囲計算・目盛生成・Canvas プロット描画（FR-048, DD-VTPL-142〜144）
   ========================================================================== */

export const MATH_PLOT_PALETTES: Record<string, string[]> = {
  shapes: ['#E29578', '#EBB453', '#6CC4C9', '#9CCB86'],
  cards: ['#E29578', '#E6B34B', '#A3B4E4', '#6DB1B4'],
  circles: ['#D45D53', '#7EA6BF', '#ECB674', '#7D9763'],
  editorial: ['#D68C8C', '#8FA876', '#C9A66B', '#8FA3B8']
};

export interface MathPlotBoxConfig {
  w: number;
  h: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  samples: number;
}

export const MATH_PLOT_BOX: { block: MathPlotBoxConfig; inline: MathPlotBoxConfig } = {
  block: { w: 340, h: 200, left: 42, right: 14, top: 14, bottom: 26, samples: 480 },
  inline: { w: 156, h: 84, left: 26, right: 8, top: 8, bottom: 16, samples: 240 }
};

export interface PlotTick {
  v: number;
  label: string;
}

// y の範囲はサンプリング値の 2〜98% パーセンタイル範囲に余白を足して決め、tan 等の発散で潰れないようにする（DD-VTPL-142）
export function autoPlotRange(series: [number, number][][]): [number, number] {
  const ys = series.flat().map(p => p[1]).filter(Number.isFinite).sort((a, b) => a - b);
  if (!ys.length) return [-1, 1];
  let lo = ys[Math.floor((ys.length - 1) * 0.02)];
  let hi = ys[Math.ceil((ys.length - 1) * 0.98)];
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1;
  return [lo - pad, hi + pad];
}

export function plotTicks(lo: number, hi: number, target: number): PlotTick[] {
  const raw = (hi - lo) / target;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map(k => k * mag).find(s => s >= raw * 0.999) || mag;
  const digits = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const ticks: PlotTick[] = [];
  for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + step * 1e-9; v += step) {
    const value = Math.abs(v) < step * 1e-9 ? 0 : v;
    ticks.push({ v: value, label: Number(value.toFixed(digits)).toString().replace('-', '−') });
  }
  return ticks;
}

export function plotPiTicks(lo: number, hi: number, maxTicks = 9): PlotTick[] {
  for (const unit of [1, 2, 4]) {
    const step = Math.PI / 2 * unit;
    const ticks: PlotTick[] = [];
    for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) {
      const half = k * unit;
      const sign = half < 0 ? '−' : '';
      const n = Math.abs(half);
      const label = n === 0 ? '0' : n % 2 === 0 ? `${sign}${n / 2 === 1 ? '' : n / 2}π` : `${sign}${n === 1 ? '' : n}π/2`;
      ticks.push({ v: k * step, label });
    }
    if (ticks.length <= maxTicks) return ticks;
  }
  return plotTicks(lo, hi, Math.max(3, maxTicks - 2));
}

// サンプリング点列から不連続点（漸近線や定義域外）で切断した連続区間の点列群を生成する（DD-VTPL-142）
export function splitPlotSegments(
  pts: [number, number][],
  top: number,
  ph: number,
  sx: (x: number) => number,
  sy: (y: number) => number
): [number, number][][] {
  const segments: [number, number][][] = [];
  let current: [number, number][] = [];
  let prevPy: number | null = null;
  pts.forEach(([x, y]) => {
    const py = Number.isFinite(y) ? sy(y) : NaN;
    const ok = Number.isFinite(py) && py > top - ph * 3 && py < top + ph * 4;
    if (!ok) {
      if (current.length > 1) segments.push(current);
      current = [];
      prevPy = null;
      return;
    }
    if (prevPy !== null && Math.abs(py - prevPy) > ph * 1.4) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push([sx(x), py]);
    prevPy = py;
  });
  if (current.length > 1) segments.push(current);
  return segments;
}

interface PlotCanvasContext {
  ctx: CanvasRenderingContext2D;
  box: MathPlotBoxConfig;
  pw: number;
  ph: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  sx: (x: number) => number;
  sy: (y: number) => number;
  isDark: boolean;
  isDisplay: boolean;
  palette: string[];
}

function drawPlotBackgroundAndGrid(pc: PlotCanvasContext, xTicks: PlotTick[], yTicks: PlotTick[]): void {
  const { ctx, box, pw, ph, sx, sy, isDark } = pc;
  const bgGrad = ctx.createLinearGradient(0, box.top, 0, box.top + ph);
  if (isDark) {
    bgGrad.addColorStop(0, '#0B1120');
    bgGrad.addColorStop(1, '#152033');
  } else {
    bgGrad.addColorStop(0, '#F8FAFC');
    bgGrad.addColorStop(1, '#FFFFFF');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(box.left, box.top, pw, ph);

  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(148, 163, 184, 0.24)';
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  xTicks.forEach(t => {
    const px = sx(t.v);
    ctx.moveTo(px, box.top);
    ctx.lineTo(px, box.top + ph);
  });
  yTicks.forEach(t => {
    const py = sy(t.v);
    ctx.moveTo(box.left, py);
    ctx.lineTo(box.left + pw, py);
  });
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlotOriginAxes(pc: PlotCanvasContext): void {
  const { ctx, box, pw, ph, x0, x1, y0, y1, sx, sy, isDark } = pc;
  ctx.strokeStyle = isDark ? 'rgba(203, 213, 225, 0.42)' : 'rgba(71, 85, 105, 0.45)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  if (y0 <= 0 && y1 >= 0) {
    const py0 = sy(0);
    ctx.moveTo(box.left, py0);
    ctx.lineTo(box.left + pw, py0);
  }
  if (x0 <= 0 && x1 >= 0) {
    const px0 = sx(0);
    ctx.moveTo(px0, box.top);
    ctx.lineTo(px0, box.top + ph);
  }
  ctx.stroke();
}

function drawPlotCurves(pc: PlotCanvasContext, series: [number, number][][]): void {
  const { ctx, box, ph, y0, y1, sx, sy, isDark, isDisplay, palette } = pc;
  const basePy = sy(Math.min(y1, Math.max(y0, 0)));
  const segmentsBySeries = series.map(pts => splitPlotSegments(pts, box.top, ph, sx, sy));

  if (segmentsBySeries.length === 1) {
    const c1 = palette[0];
    const fillGrad = ctx.createLinearGradient(0, box.top, 0, box.top + ph);
    fillGrad.addColorStop(0, hexToRgba(c1, isDark ? 0.24 : 0.18));
    fillGrad.addColorStop(1, hexToRgba(c1, 0.02));
    ctx.fillStyle = fillGrad;
    segmentsBySeries[0].forEach(seg => {
      ctx.beginPath();
      ctx.moveTo(seg[0][0], basePy);
      seg.forEach(([px, py]) => ctx.lineTo(px, py));
      ctx.lineTo(seg[seg.length - 1][0], basePy);
      ctx.closePath();
      ctx.fill();
    });
  }

  segmentsBySeries.forEach((segments, idx) => {
    const color = palette[idx % palette.length];
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = isDisplay ? 2.25 : 1.75;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = hexToRgba(color, isDark ? 0.55 : 0.3);
    ctx.shadowBlur = isDisplay ? 6 : 3;
    ctx.beginPath();
    segments.forEach(seg => {
      ctx.moveTo(seg[0][0], seg[0][1]);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i][0], seg[i][1]);
    });
    ctx.stroke();
    ctx.restore();
  });
}

function drawPlotSwatches(pc: PlotCanvasContext, count: number): void {
  const { ctx, box, pw, palette, isDisplay } = pc;
  if (!isDisplay || count <= 1) return;
  const swW = 14;
  const swGap = 5;
  const totalW = count * swW + (count - 1) * swGap;
  let swX = box.left + pw - totalW - 8;
  const swY = box.top + 8;
  for (let idx = 0; idx < count; idx++) {
    ctx.fillStyle = palette[idx % palette.length];
    ctx.fillRect(swX, swY, swW, 3.5);
    swX += swW + swGap;
  }
}

function drawPlotTicksAndFrame(pc: PlotCanvasContext, xTicks: PlotTick[], yTicks: PlotTick[]): void {
  const { ctx, box, pw, ph, sx, sy, isDark, isDisplay } = pc;
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.28)' : 'rgba(148, 163, 184, 0.38)';
  ctx.lineWidth = 1;
  ctx.strokeRect(box.left, box.top, pw, ph);

  ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
  ctx.font = isDisplay ? '500 10px "JetBrains Mono", monospace' : '500 8.5px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  const xLabelTicks = isDisplay || xTicks.length <= 3 ? xTicks : [xTicks[0], xTicks[Math.floor(xTicks.length / 2)], xTicks[xTicks.length - 1]];
  xLabelTicks.forEach(t => {
    const px = sx(t.v);
    if (px >= box.left - 2 && px <= box.left + pw + 2) {
      ctx.fillText(t.label, px, box.top + ph + (isDisplay ? 6 : 3));
    }
  });

  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const yLabelTicks = isDisplay || yTicks.length <= 3 ? yTicks : [yTicks[0], yTicks[yTicks.length - 1]];
  yLabelTicks.forEach(t => {
    const py = sy(t.v);
    if (py >= box.top + 4 && py <= box.top + ph - 4) {
      ctx.fillText(t.label, box.left - (isDisplay ? 6 : 4), py);
    }
  });
}

// 関数仕様 spec をオフスクリーン Canvas にプロット描画し、PNG ラスター画像の Data URL に変換する（DD-VTPL-143）
export function renderMathPlotToDataUrl(
  spec: TexPlotSpec,
  isDisplay: boolean,
  style: string,
  appearance: string
): string {
  const box = isDisplay ? MATH_PLOT_BOX.block : MATH_PLOT_BOX.inline;
  const pw = box.w - box.left - box.right;
  const ph = box.h - box.top - box.bottom;
  const [x0, x1] = spec.x;
  const series: [number, number][][] = spec.fns.map(f => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= box.samples; i++) {
      const x = x0 + (x1 - x0) * i / box.samples;
      pts.push([x, f.fn(x)]);
    }
    return pts;
  });
  const [y0, y1] = autoPlotRange(series);
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = box.w * scale;
  canvas.height = box.h * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(scale, scale);

  const pc: PlotCanvasContext = {
    ctx,
    box,
    pw,
    ph,
    x0,
    x1,
    y0,
    y1,
    sx: (x: number) => box.left + (x - x0) / (x1 - x0) * pw,
    sy: (y: number) => box.top + (y1 - y) / (y1 - y0) * ph,
    isDark: appearance === 'dark',
    isDisplay,
    palette: MATH_PLOT_PALETTES[style] || MATH_PLOT_PALETTES.shapes
  };

  const xTicks = spec.xPi ? plotPiTicks(x0, x1, isDisplay ? 9 : 5) : plotTicks(x0, x1, isDisplay ? 6 : 3);
  const yTicks = plotTicks(y0, y1, isDisplay ? 4 : 2);

  ctx.save();
  ctx.beginPath();
  ctx.rect(box.left, box.top, pw, ph);
  ctx.clip();
  drawPlotBackgroundAndGrid(pc, xTicks, yTicks);
  drawPlotOriginAxes(pc);
  drawPlotCurves(pc, series);
  drawPlotSwatches(pc, spec.fns.length);
  ctx.restore();

  drawPlotTicksAndFrame(pc, xTicks, yTicks);
  return canvas.toDataURL('image/png');
}
