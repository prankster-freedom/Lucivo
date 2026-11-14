---
title: Lucivo 実装ドキュメント 目次
description: Lucivo のソースと 1:1 の実装ドキュメントの一覧。
tags: ["Lucivo", "実装"]
---

# 実装ドキュメント 目次

ソースと 1:1 の構造で配置する（`swe3` スキル）。各ドキュメントには、依存関係図と、対応する詳細設計の ID を記載する。

| ソース                                                             | 実装ドキュメント                                                   | 概要                                                       |
| :----------------------------------------------------------------- | :----------------------------------------------------------------- | :--------------------------------------------------------- |
| [index.html](../../public/index.html)                              | [index.html.md](index.html.md)                                     | 画面の骨格、同梱のライブラリと CSS・スクリプトの読み込み順 |
| [css/style.css](../../src/css/style.css)                           | [css/style.css.md](css/style.css.md)                               | デザイントークン、組版、Markdown 要素、図の表示枠、Visualモード |
| [js/app.js](../../src/ts/app.ts)                                   | [js/app.js.md](js/app.js.md)                                       | 状態管理、描画パイプライン、SVG 後処理、数式、イベント処理 |
| [js/stage.js](../../src/js/stage.js)                               | [js/stage.js.md](js/stage.js.md)                                   | シグナル・ライトとステージ発表                             |
| [js/formatter.js](../../src/ts/formatter/index.ts)                 | [js/formatter.js.md](js/formatter.js.md)                           | 読み込み時の Markdown の整形（markdownlint を同梱）        |
| [src/ts/modes/](../../src/ts/modes/)                               | [js/modes/README.md](js/modes/README.md)                           | 発表モード（登録表と、モードごとの実装ドキュメントの目次） |
| [tools/build-tailwind-css.cjs](../../tools/build-tailwind-css.cjs) | [tools/build-tailwind-css.cjs.md](tools/build-tailwind-css.cjs.md) | Tailwind の CSS の事前生成                                 |
| [tools/build-samples-data.cjs](../../tools/build-samples-data.cjs) | [tools/build-samples-data.cjs.md](tools/build-samples-data.cjs.md) | `file://` 直開き時の同梱サンプル遅延読み込みデータの生成   |
| [tools/build-vendor.cjs](../../tools/build-vendor.cjs)             | [tools/build-vendor.cjs.md](tools/build-vendor.cjs.md)             | ライブラリとフォントの同梱ファイルの生成                   |
| [tools/capture-readme-shots.cjs](../../tools/capture-readme-shots.cjs) | [tools/capture-readme-shots.cjs.md](tools/capture-readme-shots.cjs.md) | README の画面写真の撮り直し（主にエージェントが実行） |
| [tests/e2e.cjs](../../tests/e2e.cjs)                               | [tests/e2e.cjs.md](tests/e2e.cjs.md)                               | テスト仕様の自動確認と画面の撮影                           |

`samples/notation_sample.md` および `samples/visual-sample.md` はソースではなく同梱のサンプル文書のため、実装ドキュメントを作らない（内容は `FR-008`〜`FR-010`, `FR-016`〜`FR-017` を参照）。

## 変更するときの注意（過去にはまった点）

詳細は各設計 ID の「背景」を参照してください。

- **同じ id の重複**: 高速モードと Visualモードの両方に図を残すと、描画先と SVG 内の参照（矢じり・グラデーション）が非表示側に向きます。表示しない側は空にし、SVG 内の id は図ごとに一意にしています（`DD-DIAG-001`〜`003`, `DD-DIAG-010`）。
- **Tailwind のリセット**: Tailwind CSS がブラウザ標準のスタイルを消すため、Markdown の要素の見た目はすべて `style.css` で定義しています（`DD-MD-001`〜）。
- **Tailwind のクラスの追加**: Tailwind は使っているクラスだけを事前に生成した `css/tailwind.css` を読み込んでいます。`index.html` や `src/ts/` で新しい Tailwind のクラスを使ったら、`npm run build` でビルドしてから `node tools/build-tailwind-css.cjs` で作り直し、`css/tailwind.css` をコミットしてください（クラス名はビルドした `js/app.js` から集めます）。作り直さないと、そのクラスは効きません。
- **遅延読み込み**: Mermaid と KaTeX は、図・数式が文書に現れるまで読み込みません。`window.mermaid` / `window.katex` がない状態でも動くように書いてください（`loadLibrary()`）。
- **Visualモードの装飾の範囲**: 図形の装飾は、フローチャート・状態遷移図・シーケンス図だけに適用します。他の図種に適用すると崩れます（`DD-DIAG-011`）。
- **Dark の Visualモード**: カード背景は外観に合わせて暗くなりますが、装飾したノードの塗り（色付きの図形・白いカード）は明るいままです。背景の上に直接描く線・文字は明るく、ノードの上の文字は暗く、それぞれ色を明示します（ページの文字色を継承させない。`DD-DIAG-024`, `DD-DIAG-031`）。
- **Mermaid の癖**（`12.3.0` で確認）:
  - シーケンス図のライフラインの class は `"actor-line 200"` になります（`10.9` 系は `"200"`。`DD-DIAG-020`）。
  - タイムラインは、`10.9` 系では 1 つの図の中で同じ id を出力しました。`12.3.0` では確認した例で重複しませんが、id を一意にする処理は残しています（`DD-DIAG-010`）。
  - 状態遷移図の `<<choice>>` などは、遷移で使う前に宣言する必要があります。
- **表示枠の中央寄せ**: `justify-content: center` のままだと、表示枠より広い図の左側がスクロールで見えなくなります（`DD-DIAG-032`）。
- **数式**: 数式の置き場所はサニタイズの後に KaTeX で描画します。KaTeX の出力をサニタイズにかけると崩れるためです（`DD-MATH-012`, `DD-MATH-020`）。
- **サンプルとテスト**: `samples/notation_sample.md` の図の並び（1 つ目がフローチャート、など）と、章の雛形（冒頭はリード、2 章・26 章は要点カード、など）を前提にしたテストがあります。図や章を追加・削除したら、`tests/e2e.cjs` とテスト仕様の対応する TC も見直してください。
- **図の SVG に演出を足さない**: `postProcessSvg()` の結果はキャッシュされ、PNG / SVG の書き出しにそのまま使います。演出の要素を足すと書き出しに混ざります。光は SVG の外の Canvas に描いています（`DD-LIGHT-003`）。
- **Visualモードの表**: 高速モードの表のスタイルは `!important` で書いてあるため、Visualモードの表のスタイルも `!important` で上書きしています。表の列の判定（数値の列・短いラベルの列）はセルの文字だけで行い、計測はしません（`DD-VTPL-041`, `DD-VTPL-044`）。
- **Visualモードの雛形**: 雛形の寸法・色・判定の条件は、デザイン仕様（`doc/0.DTP/features/visual-templates.md`）を正とします。変えるときは、先にデザイン仕様を直してから `style.css`・`app.js`（`TEMPLATE_LIMITS`）を合わせてください（`DD-VTPL-001`）。
