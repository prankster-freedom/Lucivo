---
title: Lucivo 実装ドキュメント 目次
description: Lucivo のソースと 1:1 の実装ドキュメントの一覧。
tags: ["Lucivo", "実装"]
---

# 実装ドキュメント 目次

ソースと 1:1 の構造で配置する（`swe3` スキル）。各ドキュメントには、依存関係図と、対応する詳細設計の ID を記載する。

| ソース                               | 実装ドキュメント                     | 概要                             |
| :----------------------------------- | :----------------------------------- | :------------------------------- |
| [index.html](../../index.html)       | [index.html.md](index.html.md)       | 画面の骨格、CDN ライブラリと CSS・スクリプトの読み込み順 |
| [css/style.css](../../css/style.css) | [css/style.css.md](css/style.css.md) | デザイントークン、組版、Markdown 要素、図の表示枠、Visualモード |
| [js/app.js](../../js/app.js)         | [js/app.js.md](js/app.js.md)         | 状態管理、描画パイプライン、SVG 後処理、数式、イベント処理 |
| [js/stage.js](../../js/stage.js)     | [js/stage.js.md](js/stage.js.md)     | シグナル・ライトとステージ発表 |
| [tools/build-tailwind-css.cjs](../../tools/build-tailwind-css.cjs) | [tools/build-tailwind-css.cjs.md](tools/build-tailwind-css.cjs.md) | Tailwind の CSS の事前生成 |
| [tests/e2e.cjs](../../tests/e2e.cjs) | [tests/e2e.cjs.md](tests/e2e.cjs.md) | テスト仕様の自動確認と画面の撮影 |

`samples/notation_sample.md` および `samples/visual-template.md` はソースではなく同梱のサンプル文書のため、実装ドキュメントを作らない（内容は `FR-008`〜`FR-010`, `FR-016`〜`FR-017` を参照）。
