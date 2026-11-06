---
title: 実装ドキュメント tools/build-vendor.cjs
description: ライブラリとフォントを public/vendor/ へ集めるスクリプトの注意点。
tags: ["Lucivo", "実装ドキュメント"]
---

# tools/build-vendor.cjs

ソース: [tools/build-vendor.cjs](../../../tools/build-vendor.cjs)／設計: [offline.md](../../3.sw_design_notes/features/offline.md)

- 実行すると `public/vendor/` を消して作り直す。`public/vendor/` に手で置いたファイルは残らない。
- ライブラリやフォントの版を変えたら、`npm install` のあとに実行し、`public/js/app.js` の `EXPORT_URLS` の版も合わせる。
- KaTeX のフォントは woff2 だけを同梱する。`katex.min.css` は woff・ttf も指定しているが、woff2 に対応するブラウザはそれらを読み込まない。
