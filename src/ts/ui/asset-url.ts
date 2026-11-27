// 実行時に組み立てるアセットの参照（doc/2.ARCHITECTURE.md 4.14 ARC-PUB-009、#443）。
// Web 版の言語別のページ（/ja/・/en/）は 1 階層深く、アセットは配布先に 1 組だけ置くため、
// <html data-asset-base="../"> を前に付ける。スタンドアロン版（属性なし）は従来どおり ./ から参照する。

export function getAssetBase(): string {
  if (typeof document === 'undefined' || !document.documentElement) return './';
  return document.documentElement.getAttribute('data-asset-base') || './';
}

/** `./vendor/x.js` や `vendor/x.js` を、このページから見たアセットのパスにする */
export function assetUrl(path: string): string {
  return getAssetBase() + path.replace(/^\.\//, '');
}
