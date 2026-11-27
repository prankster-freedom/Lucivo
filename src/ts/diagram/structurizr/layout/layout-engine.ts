/* ==========================================================================
   Structurizr LayoutEngine インターフェースと手動座標パススルー（ARC-STR-001）
   Phase 2 の workspace.json 手動座標（manualLayout）が存在するときは、
   自動レイアウトを一切呼ばずにそのまま返す。
   ========================================================================== */
import type { ResolvedView, StructurizrStyles, ViewLayout } from '../types';

export interface LayoutEngine {
  layout(view: ResolvedView, styles: StructurizrStyles): Promise<ViewLayout>;
}

export async function computeViewLayout(
  view: ResolvedView,
  styles: StructurizrStyles,
  autoEngine: LayoutEngine
): Promise<ViewLayout> {
  if (view.spec.manualLayout) {
    return view.spec.manualLayout;
  }
  return autoEngine.layout(view, styles);
}
