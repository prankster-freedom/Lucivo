import { parseTexPlotSpec, type TexPlotSpec } from './plot-parser';
import { renderMathPlotToDataUrl } from './plot-renderer';

export * from './plot-parser';
export * from './plot-renderer';

/* ==========================================================================
   数式の補足グラフ: 公開 API とキャッシュ管理（FR-048, DD-VTPL-140〜144）
   ========================================================================== */

const mathSpecCache = new Map<string, TexPlotSpec | null>();
const mathPlotCache = new Map<string, string>();

export function getTexPlotSpec(tex: string): TexPlotSpec | null {
  if (!mathSpecCache.has(tex)) {
    mathSpecCache.set(tex, parseTexPlotSpec(tex));
  }
  return mathSpecCache.get(tex) ?? null;
}

export function getCachedMathPlotDataUrl(
  plotSpec: TexPlotSpec,
  isDisplay: boolean,
  style: string,
  appearance: string,
  tex: string
): string {
  const plotKey = `${isDisplay ? 'D' : 'I'}:${style}:${appearance}:${tex}`;
  if (!mathPlotCache.has(plotKey)) {
    mathPlotCache.set(plotKey, renderMathPlotToDataUrl(plotSpec, isDisplay, style, appearance));
  }
  return mathPlotCache.get(plotKey)!;
}

export function clearMathPlotCache(): void {
  mathSpecCache.clear();
  mathPlotCache.clear();
}
