/* ==========================================================================
   Structurizr 遅延読み込みバンドル（js/structurizr.js）のエントリーポイント（ARC-STR-002）
   Web 版でのみビルド・読み込みされ、window.LucivoStructurizr として公開する。
   ========================================================================== */
import {
  ensureAllStructurizrViewsRendered,
  findControllerInScope,
  getControllerForFrame,
  mountStructurizrBlock,
  serializeStructurizrExportSvg
} from './controller';

const api = {
  mountBlock: mountStructurizrBlock,
  getControllerForFrame,
  findControllerInScope,
  ensureAllViewsRendered: ensureAllStructurizrViewsRendered,
  serializeExportSvg: serializeStructurizrExportSvg
};

(window as any).LucivoStructurizr = api;
