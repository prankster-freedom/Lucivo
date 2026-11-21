import { registerEscapeHandler } from '../ui/keymap';

// 図の倍率（FR-005, DD-DIAG-045）。図のカードと Expand の画面で、同じ部品と同じ切替の処理を使う
//   Fit  : 縦横が描画領域に収まる（scale-fit。既定）
//   1:n  : 横が描画領域に収まる（scale-width）
//   n:1  : 縦が描画領域に収まる（scale-height）
//   100% : 既定のサイズで描く（scale-actual）
// よく使う Fit と 1:n をボタンにし、n:1 と 100% はプルダウンにたたむ

export type ScaleAction = 'scale-fit' | 'scale-width' | 'scale-height' | 'scale-actual';

const BUTTONS: Array<[ScaleAction, string, string]> = [
  ['scale-fit', 'Fit', '縦横が描画領域に収まる'],
  ['scale-width', '1:n', '横が描画領域に収まる']
];
const MENU_ITEMS: Array<[ScaleAction, string, string]> = [
  ['scale-height', 'n:1', '縦が描画領域に収まる'],
  ['scale-actual', '100%', '既定のサイズで描く']
];
const MORE_LABEL = '▾';

// 表示枠に付けるクラス。1:n は既定の大きさの規則（表示枠の幅に合わせる）をそのまま使う
const VIEWPORT_CLASS: Record<ScaleAction, string> = {
  'scale-fit': 'is-scale-fit',
  'scale-width': 'is-scale-width',
  'scale-height': 'is-scale-height',
  'scale-actual': 'is-actual-size'
};

// index: 図のカードの番号。Expand の画面では空文字
export function scalePickerHtml(index: number | string): string {
  const btn = ([action, label, title]: [ScaleAction, string, string]) =>
    `<button type="button" data-action="${action}" data-index="${index}" title="${title}" class="scale-btn pill-btn text-[10px]${action === 'scale-fit' ? ' is-active' : ''}">${label}</button>`;
  const item = ([action, label, title]: [ScaleAction, string, string]) =>
    `<button type="button" role="menuitemradio" aria-checked="false" data-action="${action}" data-index="${index}" title="${title}" class="scale-btn scale-menu-item">${label}</button>`;
  return `<div class="pill-container scale-picker mr-1.5" role="group" aria-label="図の倍率">${BUTTONS.map(btn).join('')}`
    + `<div class="scale-more"><button type="button" class="scale-more-toggle pill-btn text-[10px]" aria-haspopup="menu" aria-expanded="false" aria-label="その他の倍率（n:1・100%）">${MORE_LABEL}</button>`
    + `<div class="scale-menu" role="menu" hidden>${MENU_ITEMS.map(item).join('')}</div></div></div>`;
}

export function closeScaleMenus(root: ParentNode = document): void {
  root.querySelectorAll('.scale-menu:not([hidden])').forEach(menu => {
    (menu as HTMLElement).hidden = true;
    menu.previousElementSibling?.setAttribute('aria-expanded', 'false');
  });
}

// 表示枠のクラスと、部品の選択状態をそろえる。プルダウンの中を選んだときは、開くボタンに選んだ倍率を出す
export function setScaleMode(vp: Element, picker: Element | null, action: ScaleAction): void {
  (Object.keys(VIEWPORT_CLASS) as ScaleAction[]).forEach(key => vp.classList.toggle(VIEWPORT_CLASS[key], key === action));
  if (!picker) return;
  picker.querySelectorAll('.scale-btn').forEach(btn => {
    const on = btn.getAttribute('data-action') === action;
    btn.classList.toggle('is-active', on);
    if (btn.getAttribute('role') === 'menuitemradio') btn.setAttribute('aria-checked', String(on));
  });
  const toggle = picker.querySelector('.scale-more-toggle');
  const chosen = picker.querySelector(`.scale-menu [data-action="${action}"]`);
  if (toggle) {
    toggle.classList.toggle('is-active', !!chosen);
    toggle.textContent = chosen ? `${chosen.textContent} ${MORE_LABEL}` : MORE_LABEL;
  }
  closeScaleMenus(picker);
}

// Ctrl + ホイールで倍率を変えたときは、どの倍率も選んでいない状態にする（DD-DIAG-071）
export function clearScaleMode(vp: Element, picker: Element | null): void {
  Object.values(VIEWPORT_CLASS).forEach(cls => vp.classList.remove(cls));
  if (!picker) return;
  picker.querySelectorAll('.scale-btn').forEach(btn => {
    btn.classList.remove('is-active');
    if (btn.getAttribute('role') === 'menuitemradio') btn.setAttribute('aria-checked', 'false');
  });
  const toggle = picker.querySelector('.scale-more-toggle');
  if (toggle) {
    toggle.classList.remove('is-active');
    toggle.textContent = MORE_LABEL;
  }
}

// プルダウンの開閉。文書に 1 回だけ登録する。外を押すか Esc で閉じる（Esc は、開いているときだけ横取りする）
let menusBound = false;
export function bindScaleMenus(): void {
  if (menusBound) return;
  menusBound = true;
  document.addEventListener('click', event => {
    const toggle = (event.target as Element | null)?.closest?.('.scale-more-toggle');
    const menu = toggle?.nextElementSibling as HTMLElement | null;
    document.querySelectorAll('.scale-menu:not([hidden])').forEach(open => {
      if (open !== menu) {
        (open as HTMLElement).hidden = true;
        open.previousElementSibling?.setAttribute('aria-expanded', 'false');
      }
    });
    if (toggle && menu) {
      menu.hidden = !menu.hidden;
      toggle.setAttribute('aria-expanded', String(!menu.hidden));
    }
  });
  registerEscapeHandler('scale-menu', 100, event => {
    if (!document.querySelector('.scale-menu:not([hidden])')) return false;
    closeScaleMenus();
    event.preventDefault();
    return true;
  });
}
