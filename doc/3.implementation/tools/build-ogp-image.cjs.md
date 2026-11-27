---
title: Lucivo 実装ドキュメント tools/build-ogp-image.cjs
description: OGP の画像を作図元の SVG から PNG に書き出すスクリプトの依存関係と注意点。
tags: ["Lucivo", "実装", "OGP", "DTP"]
---

# tools/build-ogp-image.cjs

ソース: [tools/build-ogp-image.cjs](../../../tools/build-ogp-image.cjs)／デザイン: `DTP-010`、素材: `AST-147`／設計: アーキテクチャ設計書 4.14 `ARC-PUB-009` とファイルの分類

## 依存関係

```mermaid
flowchart LR
  src["doc/0.DTP/assets/sources/ogp-image.svg（作図元）"] --> tool["tools/build-ogp-image.cjs"]
  pw["playwright（Chromium）"] --> tool
  tool --> png["public/assets/ogp/lucivo-ogp.png（1200×630。コミットする）"]
  png --> pages["tools/build-html-pages.cjs（og:image の URL）"]
```

## 注意点

- **ビルドのたびには動かさない**: 書き出しにブラウザが要るため、`css/tailwind.css` と同じく事前生成としてコミットする。作図元を変えたら、`node tools/build-ogp-image.cjs` を実行し、PNG もコミットする。
- **Web 版だけ**: `tools/build-app.cjs` は、`assets/ogp/` をスタンドアロン版（`dist/`）へ写さない（`WEB_ONLY`）。
- **大きさ**: 単体テスト（`tests/build-html-pages.test.cjs`）が、PNG の幅と高さ（1200×630）を確かめる。
