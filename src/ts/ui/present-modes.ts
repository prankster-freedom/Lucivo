// 発表モードの登録と、本体とモードの境界（host API）。doc/2.ARCHITECTURE.md 4.16（ARC-MODE-001〜006）
// モードは src/ts/modes/<id>/ に独立して置き、発表のドロップダウンで選ばれたときに js/modes/<id>.js・css/modes/<id>.css を読み込む。
// メニューに出すモードの一覧は、ビルド（tools/build-app.cjs）が配布先で絞って埋め込む。実行時に file:// かどうかは調べない。
import { state } from './state';
import { showToast } from './toast';
import { trackWebEvent } from './analytics';
import { parseDisplayStateParams } from './url-loader';
import { assetUrl } from './asset-url';
import { getLang, onLangChange, t, type Lang } from '../i18n';

// ビルドが埋め込む、この配布先で出すモードの表（modes.json の行から stage を除いたもの）
declare const __LUCIVO_PRESENT_MODES__: Array<{ id: string; label: string; labelEn?: string }>;
const PRESENT_MODES: Array<{ id: string; label: string; labelEn?: string }> =
  typeof __LUCIVO_PRESENT_MODES__ !== 'undefined' ? __LUCIVO_PRESENT_MODES__ : [];

// モードが本体について知ってよいのは、この host と LucivoModes だけ（ARC-MODE-006）
export interface ModeHost {
  showVisualCanvas(): Promise<HTMLElement | null>;
  restoreView(): void;
  isDocumentEmpty(): boolean;
  setLights(on: boolean): void;
  toast(message: string): void;
  appearance(): 'dark' | 'light';
  setAppearance(appearance: 'dark' | 'light'): Promise<HTMLElement | null>;
  lang(): Lang;
}

interface Mode {
  enter(host: ModeHost, opts?: { appearance?: 'dark' | 'light' }): unknown;
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

// 描画中の図（読み込み中の表示が残っている図の枠）がなくなるまで待つ。描画に失敗した図も待ち終える。最長 timeoutMs で打ち切る
function waitDiagrams(container: HTMLElement | null, timeoutMs: number): Promise<void> {
  const start = performance.now();
  const pending = () => !!container && Array.from(container.querySelectorAll('[data-stage-index]'))
    .some(vp => !vp.querySelector('svg') && !!vp.querySelector('.animate-pulse'));
  return new Promise(resolve => {
    const check = () => {
      if (!pending() || performance.now() - start > timeoutMs) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

function clickById(id: string): void {
  (document.getElementById(id) as HTMLButtonElement | null)?.click();
}

function toggleLights(on: boolean): void {
  (window as unknown as { LucivoStage?: { toggleLights?: (on: boolean) => void } }).LucivoStage?.toggleLights?.(on);
}

// showVisualCanvas() で覚えた表示。restoreView() で戻したら消す
let remembered: null | { viewMode: string; isVisualMode: boolean; scrollTop: number; lights: boolean; appearance: string } = null;

const host: ModeHost = {
  async showVisualCanvas() {
    const scroller = document.getElementById('preview-scroll');
    remembered = {
      viewMode: state.viewMode,
      isVisualMode: state.isVisualMode,
      scrollTop: scroller ? scroller.scrollTop : 0,
      lights: state.signalLightsEnabled !== false,
      appearance: state.appearance
    };
    if (!state.isVisualMode) clickById('btn-visual-mode');
    if (state.viewMode !== 'canvas') (document.querySelector('[data-view-mode="canvas"]') as HTMLButtonElement | null)?.click();
    // Visualモードへ切り替えた直後は、図の描画が終わるまで待つ
    await waitFrames(2);
    const container = document.getElementById('visual-stage-container');
    await waitDiagrams(container, 10000);
    return container;
  },
  restoreView() {
    const r = remembered;
    if (!r) return;
    remembered = null;
    if (state.appearance !== r.appearance) clickById('btn-theme-toggle');
    if (state.viewMode !== r.viewMode) (document.querySelector(`[data-view-mode="${r.viewMode}"]`) as HTMLButtonElement | null)?.click();
    if (state.isVisualMode !== r.isVisualMode) clickById(r.isVisualMode ? 'btn-visual-mode' : 'btn-mode-fast');
    toggleLights(r.lights);
    const scroller = document.getElementById('preview-scroll');
    if (scroller) scroller.scrollTop = r.scrollTop;
  },
  isDocumentEmpty() {
    return (document.getElementById('markdown-editor') as HTMLTextAreaElement).value.trim() === '';
  },
  setLights: toggleLights,
  toast: showToast,
  appearance() {
    return state.appearance === 'dark' ? 'dark' : 'light';
  },
  async setAppearance(appearance) {
    if (state.appearance !== appearance) {
      clickById('btn-theme-toggle');
      await waitFrames(2);
    }
    const container = document.getElementById('visual-stage-container');
    await waitDiagrams(container, 10000);
    toggleLights(false);
    return container;
  },
  lang() {
    return getLang();
  }
};

const loads = new Map<string, Promise<boolean>>();

// まだ読んでいなければ、モードの CSS と JS を読み込む。JS が register() するまでを待つ。失敗したら次の機会にやり直せるようにする
function loadMode(id: string): Promise<boolean> {
  trackWebEvent('present_mode_select', { present_mode: id });
  if (modes.has(id)) return Promise.resolve(true);
  if (!loads.has(id)) {
    loads.set(id, new Promise<boolean>(resolve => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = assetUrl(`css/modes/${id}.css`);
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = assetUrl(`js/modes/${id}.js`);
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

// URL パラメータ present で始める発表モード（FR-069, ARC-MODE-011）。present はアドレスバーから取り除かれる前に、起動の最初に読み取る
export interface PendingPresent {
  id: string;
  appearance?: 'dark' | 'light';
}

export function takePresentFromUrl(): PendingPresent | null {
  const params = parseDisplayStateParams(
    window.location.search,
    window.location.hash,
    [],
    [],
    PRESENT_MODES.map(mode => mode.id)
  );
  if (!params.present) return null;
  return { id: params.present, appearance: params.appearance };
}

// 文書の読み込みが終わったあとに呼ぶ。メニューから選んだときと同じ経路で始める。始められないときは通常の表示のまま、理由を知らせる
export async function startPendingPresent(pending: PendingPresent | null): Promise<void> {
  if (!pending) return;
  if (!(await loadMode(pending.id))) {
    showToast(t('present.loadFailedToast'));
    return;
  }
  modes.get(pending.id)!.enter(host, { appearance: pending.appearance });
}

// 発表のドロップダウンの項目を、埋め込まれた表の順に、ステージ発表の後ろへ作る（ARC-MODE-005）。closeMenus はメニューを閉じる関数
export function setupPresentModes(closeMenus: () => void): void {
  const menu = document.getElementById('present-menu');
  if (!menu) return;
  const syncLabels: Array<() => void> = [];
  PRESENT_MODES.forEach(({ id, label, labelEn }) => {
    if (document.getElementById(`menu-present-${id}`)) return;
    const item = document.createElement('button');
    item.id = `menu-present-${id}`;
    item.type = 'button';
    item.setAttribute('role', 'menuitem');
    item.className = 'file-menu-item';
    const sync = () => {
      item.textContent = getLang() === 'en' && labelEn ? labelEn : label;
    };
    sync();
    syncLabels.push(sync);
    item.addEventListener('click', async () => {
      closeMenus();
      if (!(await loadMode(id))) {
        showToast(t('present.loadFailedToast'));
        return;
      }
      modes.get(id)!.enter(host);
    });
    menu.appendChild(item);
  });
  onLangChange(() => {
    syncLabels.forEach(fn => fn());
  });
}
