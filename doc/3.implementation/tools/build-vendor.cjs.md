---
title: 実装ドキュメント tools/build-vendor.cjs
description: ライブラリとフォントを public/vendor/ へ集めるスクリプトの注意点。
tags: ["Lucivo", "実装ドキュメント"]
---

# tools/build-vendor.cjs

ソース: [tools/build-vendor.cjs](../../../tools/build-vendor.cjs)／設計: [offline.md](../../3.sw_design_notes/features/offline.md)

- 実行すると `public/vendor/` を消して作り直す。`public/vendor/` に手で置いたファイルは残らない。
- ライブラリやフォントの版を変えたら、`npm install` のあとに実行し、`src/ts/` の `EXPORT_URLS`（`app.ts`・`ui/slab-export.ts`・`ui/state.ts`）の版も合わせる。
- KaTeX のフォントは woff2 だけを同梱する。`katex.min.css` は woff・ttf も指定しているが、woff2 に対応するブラウザはそれらを読み込まない。
- `public/THIRD_PARTY_LICENSES.txt` には、`public/vendor/` のライブラリとフォントに加え、`js/formatter.js`（`tools/build-app.cjs` でビルドする Markdown の整形の部品）に同梱するパッケージのライセンスも載せる。同梱するパッケージは、esbuild の metafile から集める（`bundledPackages()`。手で一覧を持つと版の更新でずれるため。`DD-FILE-088`）。
