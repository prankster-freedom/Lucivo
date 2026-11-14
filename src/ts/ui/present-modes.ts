// 発表モードの登録と、本体とモードの境界（host API）。doc/2.ARCHITECTURE.md 4.16（ARC-MODE-001〜006）
// モードは src/ts/modes/<id>/ に独立して置き、発表のドロップダウンで選ばれたときに js/modes/<id>.js・css/modes/<id>.css を読み込む。
// メニューに出すモードの一覧は、ビルド（tools/build-app.cjs）が配布先で絞って埋め込む。実行時に file:// かどうかは調べない。
import { state, runtime } from './state';
import { showToast } from './toast';
import { updateAllSlabSplits } from '../diagram/svg-postprocess';

// ビルドが埋め込む、この配布先で出すモードの表（modes.json の行から stage を除いたもの）
declare const __LUCIVO_PRESENT_MODES__: Array<{ id: string; label: string }>;
const PRESENT_MODES: Array<{ id: string; label: string }> =
  typeof __LUCIVO_PRESENT_MODES__ !== 'undefined' ? __LUCIVO_PRESENT_MODES__ : [];

// モードが本体について知ってよいのは、この host と LucivoModes だけ（ARC-MODE-006）
export interface ModeHost {
  showVisualCanvas(): Promise<HTMLElement | null>;
  restoreView(): void;
  previewRoot(): HTMLElement | null;
  isDocumentEmpty(): boolean;
  relayoutSlabs(): void;
  getMermaidSource(index: number): string | null;
  setLights(on: boolean): void;
  toast(message: string): void;
}

interface Mode {
  enter(host: ModeHost): unknown;
  exit?(): void;
  info?(): unknown;
  [member: string]: unknown;
}

const modes = new Map<string, Mode>();

// モードが読み込まれたときに register() で自分を登録する。テストは get(id) を通してモードの info() などを呼ぶ
export const LucivoModes = {
  register(id: string, mode: Mode): void {
    modes.set(id, mode);
  },
  get(id: string): Mode | undefined {
    return modes.get(id);
  }
};
(window as unknown as { LucivoModes: typeof LucivoModes }).LucivoModes = LucivoModes;

function waitFrames(count: number): Promise<void> {
  return new Promise(resolve => {
    const step = (k: number) => (k <= 0 ? resolve() : requestAnimationFrame(() => step(k - 1)));
    step(count);
  });
}

function clickById(id: string): void {
  (document.getElementById(id) as HTMLButtonElement | null)?.click();
}

function toggleLights(on: boolean): void {
  (window as unknown as { LucivoStage?: { toggleLights?: (on: boolean) => void } }).LucivoStage?.toggleLights?.(on);
}

// showVisualCanvas() で覚えた表示。restoreView() で戻したら消す
let remembered: null | { viewMode: string; isVisualMode: boolean; scrollTop: number; lights: boolean } = null;

const host: ModeHost = {
  async showVisualCanvas() {
    const scroller = document.getElementById('preview-scroll');
    remembered = {
      viewMode: state.viewMode,
      isVisualMode: state.isVisualMode,
      scrollTop: scroller ? scroller.scrollTop : 0,
      lights: state.signalLightsEnabled !== false
    };
    if (!state.isVisualMode) clickById('btn-visual-mode');
    if (state.viewMode !== 'canvas') (document.querySelector('[data-view-mode="canvas"]') as HTMLButtonElement | null)?.click();
    // Visualモードへ切り替えた直後は、図の描画が終わるまで待つ
    await waitFrames(2);
    return document.getElementById('visual-stage-container');
  },
  restoreView() {
    const r = remembered;
    if (!r) return;
    remembered = null;
    toggleLights(r.lights);
    if (state.viewMode !== r.viewMode) (document.querySelector(`[data-view-mode="${r.viewMode}"]`) as HTMLButtonElement | null)?.click();
    if (state.isVisualMode !== r.isVisualMode) clickById(r.isVisualMode ? 'btn-visual-mode' : 'btn-mode-fast');
    const scroller = document.getElementById('preview-scroll');
    if (scroller) scroller.scrollTop = r.scrollTop;
  },
  previewRoot() {
    return document.getElementById(state.isVisualMode ? 'visual-stage-container' : 'standard-doc-container');
  },
  isDocumentEmpty() {
    return (document.getElementById('markdown-editor') as HTMLTextAreaElement).value.trim() === '';
  },
  relayoutSlabs() {
    updateAllSlabSplits(document.getElementById('visual-stage-container'));
  },
  getMermaidSource(index) {
    return runtime.lastMermaidSources[index] ?? null;
  },
  setLights: toggleLights,
  toast: showToast
};

const loads = new Map<string, Promise<boolean>>();

// まだ読んでいなければ、モードの CSS と JS を読み込む。JS が register() するまでを待つ。失敗したら次の機会にやり直せるようにする
function loadMode(id: string): Promise<boolean> {
  if (modes.has(id)) return Promise.resolve(true);
  if (!loads.has(id)) {
    loads.set(id, new Promise<boolean>(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = `./css/modes/${id}.css`;
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = `./js/modes/${id}.js`;
      script.onload = () => resolve(modes.has(id));
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    }).then(ok => {
      if (!ok) loads.delete(id);
      return ok;
    }));
  }
  return loads.get(id)!;
}

// 発表のドロップダウンの項目を、埋め込まれた表の順に、ステージ発表の後ろへ作る（ARC-MODE-005）。closeMenus はメニューを閉じる関数
export function setupPresentModes(closeMenus: () => void): void {
  const menu = document.getElementById('present-menu');
  if (!menu) return;
  PRESENT_MODES.forEach(({ id, label }) => {
    const item = document.createElement('button');
    item.id = `menu-present-${id}`;
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.className = 'file-menu-item';
    item.textContent = label;
    item.addEventListener('click', async () => {
      closeMenus();
      if (!(await loadMode(id))) {
        showToast('発表の見せ方を読み込めませんでした');
        return;
      }
      modes.get(id)!.enter(host);
    });
    menu.appendChild(item);
  });
}
