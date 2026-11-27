// HTML のひな形から作る、言語別のページ・転送用のページ・スタンドアロン版の index.html を確かめる
// （tools/build-html-pages.cjs、doc/2.ARCHITECTURE.md 4.14 ARC-PUB-009、FR-065、#443）。
// 転送の動き（ブラウザでの言語の判定、クエリと # の引き継ぎ）は、E2E（TC-I18N-005〜009）で確かめる。
const assert = require('assert');
const {
  buildLanguagePage,
  buildRedirectPage,
  buildStandalonePage,
  readTemplate,
  SITE_URL
} = require('../tools/build-html-pages.cjs');

const template = readTemplate();

// 1. 言語別のページ（公開用 URL）: lang・ページの言語・アセットの基準・canonical・hreflang
for (const lang of ['ja', 'en']) {
  const html = buildLanguagePage(template, lang, 'production');
  assert.ok(html.includes(`<html lang="${lang}" data-page-lang="${lang}" data-asset-base="../">`), `${lang}: <html> の属性`);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}${lang}/" />`), `${lang}: canonical は自分自身`);
  assert.ok(html.includes(`<link rel="alternate" hreflang="en" href="${SITE_URL}en/" />`), `${lang}: hreflang en`);
  assert.ok(html.includes(`<link rel="alternate" hreflang="ja" href="${SITE_URL}ja/" />`), `${lang}: hreflang ja`);
  assert.ok(html.includes(`<link rel="alternate" hreflang="x-default" href="${SITE_URL}en/" />`), `${lang}: hreflang x-default は /en/`);
  assert.ok(!html.includes('name="robots"'), `${lang}: 公開用 URL には noindex を書かない`);
  // アセットの参照は 1 階層上へ。./ の参照が残らない
  assert.ok(html.includes('src="../js/app.js"') && html.includes('href="../css/style.css"'), `${lang}: 参照を ../ に書き換える`);
  assert.ok(!/\s(?:src|href)="\.\//.test(html), `${lang}: ./ の参照が残らない`);
  // ?lang= の転送のスクリプトが、計測より前（<meta charset> の直後）にある
  const scriptAt = html.indexOf('<script>');
  assert.ok(scriptAt > html.indexOf('<meta charset="UTF-8" />') && scriptAt < html.indexOf('LUCIVO_WEB_ANALYTICS_START'), `${lang}: 転送のスクリプトは先頭`);
  assert.ok(html.includes('GTM-KMQ3KLNT'), `${lang}: 言語別のページは計測を含む（FR-063）`);
}

// 2. README への導線: 英語版のページは英語版の README を、言語のディレクトリで開く
{
  const ja = buildLanguagePage(template, 'ja', 'production');
  const en = buildLanguagePage(template, 'en', 'production');
  assert.ok(ja.includes('Lucivo/preview/ja/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.md&'), 'ja: README.md');
  assert.ok(en.includes('Lucivo/preview/en/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.en.md&'), 'en: README.en.md');
  assert.ok(!en.includes('preview/ja/'), 'en: 日本語版の導線が残らない');
  assert.ok(!ja.includes('lang=en') && !en.includes('lang=en'), 'README への導線に lang= を付けない');
}

// 3. 言語別のページ（テスト用 URL）: noindex を書き、hreflang は書かない。canonical は /preview/ の下の自分自身
for (const lang of ['ja', 'en']) {
  const html = buildLanguagePage(template, lang, 'preview');
  assert.ok(html.includes('<meta name="robots" content="noindex" />'), `${lang}: noindex`);
  assert.ok(!html.includes('hreflang'), `${lang}: hreflang を書かない`);
  assert.ok(html.includes(`<link rel="canonical" href="${SITE_URL}preview/${lang}/" />`), `${lang}: canonical`);
}

// 4. 転送用のページ: 1KB 未満、CSS・画像・Web フォント・計測を含まない、JavaScript が動かないときは /en/ へ
for (const target of ['production', 'preview']) {
  const html = buildRedirectPage(target);
  const bytes = Buffer.byteLength(html, 'utf8');
  assert.ok(bytes < 1024, `${target}: 転送用のページは 1KB 未満（${bytes} バイト）`);
  assert.ok(html.includes('<meta http-equiv="refresh" content="0;url=en/">'), `${target}: meta refresh は en/`);
  assert.ok(html.includes('location.replace') || html.includes('.replace('), `${target}: location.replace で転送する`);
  assert.ok(!/stylesheet|<img|\.css|\.woff|googletagmanager|dataLayer/.test(html), `${target}: CSS・画像・フォント・計測を含まない`);
  assert.strictEqual(html.includes('noindex'), target === 'preview', `${target}: noindex はテスト用 URL だけ`);
}

// 5. スタンドアロン版: ひな形のまま（./ の参照・言語の属性なし）で、計測だけを除く
{
  const html = buildStandalonePage(template);
  assert.ok(!html.includes('LUCIVO_WEB_ANALYTICS_START') && !html.includes('GTM-KMQ3KLNT'), 'スタンドアロン版は計測を含まない（NFR-008）');
  assert.ok(html.includes('src="./js/app.js"'), 'スタンドアロン版の参照は ./ のまま');
  assert.ok(!html.includes('data-page-lang') && !html.includes('rel="canonical"'), 'スタンドアロン版は言語別のページではない');
}

console.log('build-html-pages tests passed');
