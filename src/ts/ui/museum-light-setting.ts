// 「その他（アプリ設定）」の、ミュージアム・ウォークの描画の軽さ（FR-056、DTP-MWLK-070、DD-MWLK-013、#426）。
// 選んだ段階を、localStorage の 'lucivo-museum-walk-light' に保存する。ミュージアム・ウォークは、始めるたびに、
// この値を読んで段階を決める（URL の指定が先、保存した値が次、端末の既定が最後）。
// 発表モードは本体のコードを読み込まない（ARC-MODE-006）ため、本体が書き、モードが読む形で受け渡す。
import { showToast } from './toast';
import { t } from '../i18n';
import { isPresentModeAvailable } from './sample-source';

// ミュージアム・ウォークが読む保存先と、同じ名前（src/ts/modes/museum-walk/index.ts の LIGHT_KEY）
export const MUSEUM_LIGHT_KEY = 'lucivo-museum-walk-light';

// 選べる値。'auto' は、保存した段階を消して、端末の既定に戻す
export type MuseumLightChoice = 'auto' | '1' | '2' | '3' | '4';

function isChoice(value: string | null): value is MuseumLightChoice {
  return value === 'auto' || value === '1' || value === '2' || value === '3' || value === '4';
}

// 保存した段階を、選択の値にする。未保存・不正な値・保存できない環境は 'auto'
export function loadMuseumLightChoice(): MuseumLightChoice {
  try {
    const saved = localStorage.getItem(MUSEUM_LIGHT_KEY);
    return saved !== null && saved !== 'auto' && isChoice(saved) ? saved : 'auto';
  } catch {
    return 'auto';
  }
}

export function saveMuseumLightChoice(choice: MuseumLightChoice): void {
  try {
    if (choice === 'auto') localStorage.removeItem(MUSEUM_LIGHT_KEY);
    else localStorage.setItem(MUSEUM_LIGHT_KEY, choice);
  } catch {
    // 保存できない環境では、保存を省略する
  }
}

export function setupMuseumLightSetting(): void {
  const section = document.getElementById('setting-museum-light-section');
  const select = document.getElementById('setting-museum-light') as HTMLSelectElement | null;
  if (!section || !select) return;
  // ミュージアム・ウォークのない版（スタンドアロン版）では、この節を出さない
  if (!isPresentModeAvailable('museum-walk')) return;
  section.hidden = false;
  select.value = loadMuseumLightChoice();
  select.addEventListener('change', () => {
    const choice = isChoice(select.value) ? select.value : 'auto';
    saveMuseumLightChoice(choice);
    const selected = select.selectedOptions[0];
    showToast(t('settings.museumLightToast', { label: selected ? (selected.textContent || '').trim() : choice }));
  });
}
