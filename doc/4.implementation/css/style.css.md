---
title: Lucivo 実装ドキュメント css/style.css
description: css/style.css の依存関係と、コードからは読み取りにくい実装上の注意点。
tags: ["Lucivo", "実装", "CSS"]
---

# css/style.css

ソース: [css/style.css](../../../css/style.css)／設計: `DD-MD`、`DD-DIAG-023`・`030`〜`032`・`041`、`DD-MATH-023`、`DD-FM-030`、`DD-FILE-006`

## 依存関係

```mermaid
flowchart TD
  subgraph Dependencies
    tw["css/tailwind.css（Tailwind の生成物。Preflight で標準のスタイルを初期化）"]
    fonts["Google Fonts"]
  end
  css["css/style.css"]
  tw --> css
  fonts --> css
  subgraph Consumers
    html["index.html"]
    app["js/app.js（生成する HTML のクラス名、CSS 変数の上書き）"]
  end
  css --> html
  css --> app
```

## 変更するときの注意

- **初期化されたスタイル**: Tailwind の Preflight と、本ファイルの `* { margin: 0; padding: 0; }` で、ブラウザ標準のスタイルは消えている。新しく表示する要素には、余白や見た目を明示する（`DD-MD-001`）。
- **読み込み順**: `index.html` で `tailwind.css` より後に読み込むため、同じ詳細度なら本ファイルが優先される。`tailwind.css` は生成物のため直接編集しない。
- **本文の要素**: 通常モードと Visual Stage の両方に効くよう `:is(.prose-doc, .exhibition-slab)` で書く。
- **線の色**: 背景と見分ける線には `--border-strong` を使う。Dark の Visual Stage では `--border-subtle` がスラブの背景と同じ色になる（`DD-MD-003`）。
- **図の表示枠**: `justify-content` は `flex-start` のままにし、中身は左右の `margin: auto` で中央に置く。`center` に戻すと、表示枠より広い図の左側がスクロールで見えなくなる（`DD-DIAG-032`）。
- **クラス名の出どころ**: `lucivo-math`、`front-matter`、`fm-*`、`edge-curve-btn`、`exhibition-slab-split`、`is-stacked` などは `app.js` が生成・付与するクラス名で、HTML ファイルには現れない。
