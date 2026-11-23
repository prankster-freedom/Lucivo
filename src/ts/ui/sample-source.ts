// 同梱サンプルの置き場所（Web 版は GitHub 上のサンプルを読む。doc/2.ARCHITECTURE.md 4.14 ARC-PUB-007, FR-068）
// 配布先はビルドが埋め込む定数で決める。実行時に file:// かどうかは調べない。

// standalone は true（samples/ と samples-data.js を同梱）、web は false（GitHub から読む）
declare const __LUCIVO_BUNDLED_SAMPLES__: boolean;
// Web 版でサンプルを読む GitHub のブランチ名またはタグ名（/preview/ は main、公開用 URL は最新のリリースのタグ）
declare const __LUCIVO_SAMPLES_REF__: string;
declare const __LUCIVO_PRESENT_MODES__: Array<{ id: string }>;

export const SAMPLES_REPO = 'prankster-freedom/Lucivo';

export function hasBundledSamples(): boolean {
  return typeof __LUCIVO_BUNDLED_SAMPLES__ !== 'undefined' ? __LUCIVO_BUNDLED_SAMPLES__ : true;
}

export function getSamplesRef(): string {
  return typeof __LUCIVO_SAMPLES_REF__ !== 'undefined' && __LUCIVO_SAMPLES_REF__ ? __LUCIVO_SAMPLES_REF__ : 'main';
}

/** GitHub 上のサンプルの生ファイル URL（ref の `/` は区切りとして残し、各区切りをエンコードする） */
export function samplesRawUrl(fileName: string, ref: string = getSamplesRef()): string {
  const encodedRef = ref.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${SAMPLES_REPO}/${encodedRef}/public/samples/${encodeURIComponent(fileName)}`;
}

/** 生ファイル URL が、このアプリが読むサンプル（public/samples/ 直下）を指していれば、そのファイル名を返す */
export function sampleFileNameFromRawUrl(url: string | null): string | null {
  if (!url) return null;
  const marker = `https://raw.githubusercontent.com/${SAMPLES_REPO}/`;
  if (!url.startsWith(marker)) return null;
  const m = url.slice(marker.length).match(/\/public\/samples\/([^/?#]+)$/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (_) { return m[1]; }
}

/** この配布先に、指定した発表モードがあるか（スタンドアロン版にはない） */
export function isPresentModeAvailable(id: string): boolean {
  const list = typeof __LUCIVO_PRESENT_MODES__ !== 'undefined' ? __LUCIVO_PRESENT_MODES__ : [];
  return list.some(mode => mode.id === id);
}
