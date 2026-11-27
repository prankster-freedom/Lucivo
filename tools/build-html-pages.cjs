// HTML のひな形（src/index.html）から、配布先ごとの HTML を作る（doc/2.ARCHITECTURE.md 4.14 ARC-PUB-009、FR-065、#443）。
// - web: 言語別のページ（ja/index.html・en/index.html）と、ルートの転送用のページ（index.html）
// - standalone: 1 つの index.html（ひな形から計測のスニペットを除いたもの。ARC-ANA-002）
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'src', 'index.html');
const LANGS = ['ja', 'en'];
// canonical・hreflang の絶対 URL の基準（公開用 URL）。テスト用 URL は、その下の preview/
const SITE_URL = 'https://prankster-freedom.github.io/Lucivo/';
const PAGES_TARGETS = ['production', 'preview'];
const ANALYTICS_PATTERN = /[ \t]*<!-- LUCIVO_WEB_ANALYTICS_START -->[\s\S]*?<!-- LUCIVO_WEB_ANALYTICS_END -->\r?\n?/g;
// README への導線（FR-024・FR-049）。ひな形は日本語版の URL を書き、英語版のページでは英語版の README を開く URL に置き換える
const README_URL_JA = 'Lucivo/preview/ja/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.md';
const README_URL_EN = 'Lucivo/preview/en/?url=https%3A%2F%2Fgithub.com%2Fprankster-freedom%2FLucivo%2Fblob%2Fmain%2FREADME.en.md';

// ルートと言語別のページの <head> の先頭で動かす、言語の転送（FR-065）。文字列にして埋め込むため、外の変数を参照しない。
// pageLang が null のとき（ルート）: ?lang= / #lang=、localStorage、ブラウザの言語の順で言語を決め、その言語のディレクトリへ転送する。
// pageLang があるとき（言語別のページ）: ?lang= / #lang= があるときだけ動き、ページの言語と同じなら lang を消すだけ、違えばもう一方のページへ転送する。
// どちらも lang 以外のクエリと # 以降を引き継ぐ。file: ではフォルダの一覧が開かないよう、転送先を <言語>/index.html にする
function lucivoLangRedirect(pageLang) {
  var loc = window.location;
  var search = new URLSearchParams(loc.search);
  var hashParams = new URLSearchParams(loc.hash.slice(1));
  var hasParam = search.has('lang') || hashParams.has('lang');
  if (pageLang && !hasParam) return;
  var lang = (search.get('lang') || hashParams.get('lang') || '').toLowerCase();
  var query = loc.search;
  var hash = loc.hash;
  if (search.has('lang')) {
    search.delete('lang');
    query = search.toString() ? '?' + search.toString() : '';
  }
  if (hashParams.has('lang')) {
    hashParams.delete('lang');
    hash = hashParams.toString() ? '#' + hashParams.toString() : '';
  }
  if (lang !== 'ja' && lang !== 'en') {
    if (pageLang) {
      lang = pageLang;
    } else {
      var saved = null;
      try { saved = window.localStorage.getItem('lucivo-lang'); } catch (e) {}
      var nav = navigator.language || (navigator.languages && navigator.languages[0]) || '';
      lang = saved === 'ja' || saved === 'en' ? saved : (/^ja\b/i.test(nav) ? 'ja' : 'en');
    }
  }
  if (lang === pageLang) {
    try { history.replaceState(history.state, '', loc.pathname + query + hash); } catch (e) {}
    return;
  }
  loc.replace((pageLang ? '../' : '') + lang + '/' + (loc.protocol === 'file:' ? 'index.html' : '') + query + hash);
}

function langRedirectScript(pageLang) {
  const code = `(${lucivoLangRedirect.toString()})(${JSON.stringify(pageLang)});`;
  return esbuild.transformSync(code, { minify: true, target: 'es2017' }).code.trim();
}

function pagesBaseUrl(target) {
  return target === 'preview' ? `${SITE_URL}preview/` : SITE_URL;
}

// ひな形であることを示す先頭の注記は、出力には残さない
function readTemplate() {
  return fs.readFileSync(TEMPLATE_PATH, 'utf8').replace(/[ \t]*<!-- ひな形。[^\n]*-->\r?\n/, '');
}

function insertAfterCharset(html, lines) {
  const charset = /(<meta charset="UTF-8" \/>\r?\n)/;
  if (!charset.test(html)) throw new Error('src/index.html に <meta charset="UTF-8" /> がありません');
  return html.replace(charset, `$1${lines.map(line => `  ${line}\n`).join('')}`);
}

// 言語別のページ。参照を 1 階層上（アセットは配布先に 1 組だけ置く）に向け、言語・canonical・hreflang または noindex を書く
function buildLanguagePage(template, lang, target) {
  const base = pagesBaseUrl(target);
  const head = [
    `<script>${langRedirectScript(lang)}</script>`,
    `<link rel="canonical" href="${base}${lang}/" />`
  ];
  if (target === 'preview') {
    head.push('<meta name="robots" content="noindex" />');
  } else {
    for (const alt of LANGS) head.push(`<link rel="alternate" hreflang="${alt}" href="${base}${alt}/" />`);
    head.push(`<link rel="alternate" hreflang="x-default" href="${base}en/" />`);
  }
  let html = template
    .replace(/<html lang="[a-z]+">/, `<html lang="${lang}" data-page-lang="${lang}" data-asset-base="../">`)
    .replace(/(\s(?:src|href))="\.\//g, '$1="../');
  if (lang === 'en') html = html.split(README_URL_JA).join(README_URL_EN);
  return insertAfterCharset(html, head);
}

// ルートの転送用のページ。CSS・画像・Web フォント・計測を含めず、1KB 未満にする（FR-065）
function buildRedirectPage(target) {
  const robots = target === 'preview' ? '<meta name="robots" content="noindex">' : '';
  return '<!DOCTYPE html>\n<html><head><meta charset="UTF-8">' + robots
    + '<meta http-equiv="refresh" content="0;url=en/"><title>Lucivo</title>'
    + `<script>${langRedirectScript(null)}</script></head><body></body></html>\n`;
}

function buildStandalonePage(template) {
  return template.replace(ANALYTICS_PATTERN, '');
}

// outDir に、配布先の HTML を書く。target は LUCIVO_PAGES_TARGET（production（既定）/ preview）
function writeHtmlPages(outDir, channel, target = 'production') {
  if (!PAGES_TARGETS.includes(target)) {
    throw new Error(`Unknown LUCIVO_PAGES_TARGET: ${target} (use ${PAGES_TARGETS.join(' or ')})`);
  }
  const template = readTemplate();
  if (channel === 'standalone') {
    fs.writeFileSync(path.join(outDir, 'index.html'), buildStandalonePage(template), 'utf8');
    return;
  }
  for (const lang of LANGS) {
    fs.mkdirSync(path.join(outDir, lang), { recursive: true });
    fs.writeFileSync(path.join(outDir, lang, 'index.html'), buildLanguagePage(template, lang, target), 'utf8');
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), buildRedirectPage(target), 'utf8');
}

module.exports = { writeHtmlPages, buildLanguagePage, buildRedirectPage, buildStandalonePage, readTemplate, LANGS, SITE_URL };
