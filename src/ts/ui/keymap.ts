// ページ全体のキー操作割り当て表と単一 keydown 受け口（FR-025, DD-KEY-001〜004, #288）
// 複数ファイルに分散していた document.keydown リスナーを 1 か所に集約し、優先順位を明確にする。
import { t, type I18nKey } from '../i18n';

export interface ShortcutBinding {
  id: string;
  /** 反応する event.key の一覧 */
  keys: string[];
  /** ヘルプ画面に表示するキートップ表記 */
  displayKeys: string[];
  /** ヘルプ画面に表示する説明（フォールバック） */
  label: string;
  /** i18n キー */
  labelKey?: I18nKey;
  /** ヘルプ画面に表示するか（既定 true） */
  showInHelp?: boolean;
  /** 実行するアクション（実行したら true） */
  action?: () => boolean | void;
}

interface EscapeHandlerEntry {
  id: string;
  /** 数値が大きいほど優先的に実行される */
  priority: number;
  /** 処理して以降の Escape ハンドラを止める場合は true を返す */
  handler: (event: KeyboardEvent) => boolean;
}

const escapeHandlers: EscapeHandlerEntry[] = [];
const shortcutActions = new Map<string, () => boolean | void>();
let attached = false;

/**
 * 通常閲覧画面（エディタ未フォーカス時）のキー操作割り当て表。
 * ヘルプモーダル（#shortcut-normal-list）はこの表から自動生成される。
 */
export const NORMAL_SHORTCUT_BINDINGS: ShortcutBinding[] = [
  {
    id: 'scroll-section',
    keys: ['j', 'J', ']', 'k', 'K', '['],
    displayKeys: ['J', 'K', ']', '['],
    label: '次 / 前の章へスクロール',
    labelKey: 'shortcut.scrollSection'
  },
  {
    id: 'diagram-wheel-zoom',
    keys: [],
    displayKeys: ['Ctrl', '__WHEEL__'],
    label: '図の拡大・縮小（図の上で）',
    labelKey: 'shortcut.diagramZoom'
  },
  {
    id: 'stage-show',
    keys: ['p', 'P'],
    displayKeys: ['P'],
    label: 'ステージ発表を開始',
    labelKey: 'shortcut.stageShow'
  },
  {
    id: 'toggle-visual-mode',
    keys: ['m', 'M'],
    displayKeys: ['M'],
    label: '高速 ⇔ Visualモード切替',
    labelKey: 'shortcut.toggleVisual'
  },
  {
    id: 'select-visual-style',
    keys: ['1', '2', '3', '4'],
    displayKeys: ['1', '2', '3', '4'],
    label: 'Visual スタイル切替 (1〜4)',
    labelKey: 'shortcut.selectStyle'
  },
  {
    id: 'toggle-shortcut-help',
    keys: ['?'],
    displayKeys: ['?'],
    label: 'ショートカット一覧を表示',
    labelKey: 'shortcut.toggleHelp'
  },
  {
    id: 'close-or-clear',
    keys: ['Escape'],
    displayKeys: ['Esc'],
    label: 'モーダル・メニューを閉じる / 強調解除',
    labelKey: 'shortcut.closeOrClear'
  }
];

function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

export function registerEscapeHandler(
  id: string,
  priority: number,
  handler: (event: KeyboardEvent) => boolean
): void {
  const idx = escapeHandlers.findIndex(e => e.id === id);
  if (idx >= 0) escapeHandlers.splice(idx, 1);
  escapeHandlers.push({ id, priority, handler });
  escapeHandlers.sort((a, b) => b.priority - a.priority);
}

export function registerShortcutAction(key: string, action: () => boolean | void): void {
  shortcutActions.set(key, action);
}

export function renderShortcutModalList(): void {
  const container = document.getElementById('shortcut-normal-list');
  if (!container) return;
  container.innerHTML = NORMAL_SHORTCUT_BINDINGS
    .filter(b => b.showInHelp !== false)
    .map(b => {
      const kbds = b.displayKeys
        .map(k => `<kbd class="kbd-key">${k === '__WHEEL__' ? t('shortcut.wheelKey') : k}</kbd>`)
        .join('');
      const label = b.labelKey ? t(b.labelKey) : b.label;
      return `<div class="flex items-center justify-between p-2 rounded-lg border" style="background: var(--panel-sub); border-color: var(--border-subtle);">`
        + `<span>${label}</span>`
        + `<div class="flex gap-1">${kbds}</div>`
        + `</div>`;
    })
    .join('');
}

export function setupGlobalKeymap(): void {
  if (attached) return;
  attached = true;
  renderShortcutModalList();

  document.addEventListener('keydown', event => {
    if (event.isComposing) return;

    if (event.key === 'Escape') {
      // ステージ発表中（is-stage-show）は stage.js 側で処理する
      if (document.documentElement.classList.contains('is-stage-show')) return;
      for (const entry of escapeHandlers) {
        if (entry.handler(event)) {
          return;
        }
      }
      return;
    }

    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.documentElement.classList.contains('is-stage-show')) return;
    // エディタや入力欄にフォーカスがあるときは文字入力を優先しショートカットを起動しない（DD-KEY-001）
    if (isEditableElement(document.activeElement)) return;

    const action = shortcutActions.get(event.key);
    if (action) {
      event.preventDefault();
      action();
    }
  });
}
