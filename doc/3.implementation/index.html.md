---
title: Lucivo 実装ドキュメント index.html
description: index.html の依存関係と、コードからは読み取りにくい実装上の注意点。
tags: ["Lucivo", "実装", "HTML"]
---

# index.html

ソース: [index.html](../../index.html)／設計: `DD-FILE-001`〜`007`、`DD-FM-011`、`DD-LIGHT-001`、`DD-SHOW-001`、アーキテクチャ 4.5

## 依存関係

```mermaid
flowchart TD
  subgraph Dependencies["Dependencies（head・header で読み込む順）"]
    fav["assets/logos/*/favicon.svg・logo_capsule.svg"]
    tw["css/tailwind.css（tools/build-tailwind-css.cjs で生成）"]
    fonts["Google Fonts"]
    libs["marked 12.0.2 / DOMPurify 3.1.6（CDN、版を固定）"]
    css["css/style.css"]
  end
  html["index.html"]
  fav --> html
  tw --> html
  fonts --> html
  libs --> html
  css --> html
  app["js/app.js（body の最後）"]
  html --> app
  subgraph Consumers
    browser["ブラウザ（file:// または開発サーバー）"]
    e2e["tests/e2e.cjs"]
  end
  html --> browser
  html --> e2e
```

## 変更するときの注意

- **要素の id**: `app.js` と `tests/e2e.cjs` が id で参照している。id を変えるときは、両方を検索して直す。
- **head に書かないライブラリ**: Mermaid と KaTeX は、`app.js` の `LIBRARIES` が必要になったときに読み込む（版もそこで固定している）。
- **CDN の版**: SVG の後処理の多くが Mermaid の出力の構造（class 名、id、要素の並び）に依存している。版を上げるときは、テストを全件実行し、図の画像を目視で確認する。
- **HTML エクスポート**: `document.documentElement.outerHTML` を書き出すため、`<head>` の読み込み（KaTeX の CSS など）は書き出した HTML にもそのまま入る。
