---
title: Lucivo — Visual Markdown & Diagram Studio
description: Markdown 文書と Mermaid ダイアグラムをリアルタイムに編集・プレビュー・インフォグラフィック変換できるスタンドアロン Web アプリケーション。
tags: ["Lucivo", "Markdown", "Mermaid"]
---

# Lucivo — Visual Markdown & Diagram Studio

- **Version**: `0.1.0`

Markdown 文書と Mermaid ダイアグラムをリアルタイムに編集・プレビューし、エンジニアリング仕様書スタイルと 4 種のインフォグラフィックスタイル（Visual Stage）を即座に切り替えられるスタンドアロンの Web アプリケーションです。

## 使い方

### 最も簡単な使い方

1. ブラウザで [index.html](index.html) を直接開きます。
2. ヘッダーの「ファイル」メニュー →「Markdown を開く…」で Markdown ファイル（`.md` / `.markdown` / `.txt`、UTF-8）を読み込みます。起動直後のエディタは空です。
3. 左ペイン（`SOURCE MARKDOWN`）で Markdown と ```` ```mermaid ```` コードブロックを編集すると、右ペインにリアルタイムでプレビューが表示されます。

Markdown と Mermaid の記法の例は、同梱の [sample.md](sample.md) にあります。「Markdown を開く…」で開いてください。

### 主な使い方のパターン

- **ファイルの読み込み**: 「ファイル」メニュー →「Markdown を開く…」で読み込みます。読み込み後に編集した内容は、別のファイルを読み込むと失われるため、確認ダイアログが表示されます（保存機能はありません）。
- **表示モードの切り替え**: ヘッダー中央の `Split`（左右分割）/ `Canvas`（プレビューのみ）/ `Code`（エディタのみ）で作業画面を切り替えます。
- **インフォグラフィック表示（Visual Stage）**: ヘッダーの `Visual Stage` ボタン、または上部のスタイルバー（`🎨 パステル図形` / `📋 2段カード` / `⭕ 5色サークル` / `📖 クリームチャート`）をクリックすると、Mermaid ダイアグラムと文書がインフォグラフィック調に変換されます。
- **テーマ・矢印形状の変更**: 右上の太陽/月アイコンで Light / Dark を切り替え、パレット設定ボタンまたはスタイルバーからカラーパレット（Cobalt / Emerald / Amber / Royal）や矢印形状（Smooth / Step / Straight）を変更できます。
- **図のエクスポート**: 各ダイアグラムカードの右上から、表示倍率切替（`Fit` / `1:1`）、`PNG`（高解像度）・`SVG` ダウンロード、`Expand`（拡大モーダル表示）を行えます。`Fit` は図を枠の幅に合わせますが、文字が小さくなりすぎる大きな図は、それ以上縮小せず横スクロールで表示します。
- **数式**: 本文に `$…$`（インライン）や `$$…$$`（ブロック）で TeX の数式を書けます（KaTeX で描画）。フローチャートとシーケンス図では、ラベルに `$$…$$` で数式を書けます。

## ディレクトリ構成

```text
lucivo/
├── README.md          # 本ファイル（概要・使い方・リリースノート）
├── index.html         # エントリーポイント HTML
├── sample.md          # Markdown と Mermaid の記法のサンプル
├── tests/
│   └── e2e.cjs        # Playwright による動作確認スクリプト
├── css/
│   └── style.css      # デザイントークン・組版・Visual Stage スタイル定義
├── js/
│   └── app.js         # レンダリングエンジン・SVG ポストプロセッサ・UI 制御
└── doc/               # 仕様書・設計書（doc スキル準拠）
    ├── lucivo_functional_and_design_specification.md
    ├── 1.SPEC.md
    ├── 2.ARCHITECTURE.md
    ├── 3.detailed_design/
    ├── 4.implementation/
    └── 5.test_spec/
```

## 動作確認

Playwright（Chromium）を導入済みであれば、次のコマンドでテスト仕様（[doc/5.test_spec/](doc/5.test_spec/)）の自動確認を実行できます。図の画像は `work/test/` に保存されます（git 管理外）。CDN からライブラリを読み込むため、インターネット接続が必要です。

```bash
nodetests/e2e.cjs
```

- 所要時間は 3〜5 分です。合否は標準出力と `work/test/results.json` に出力されます。
- 「確認方法」が目視の TC は、`work/test/shots/` の画像（モード × 図の数、約 130 枚）で確認します。
- 再実行すると `work/test/` は上書きされます。前回の出力を残す場合は、実行前に別のフォルダへ移してください。

## 開発を続けるには

本アプリは、リポジトリの `AGENTS.md` と `.claude/skills/` の工程（swe1 → swe2-1 → swe3-1 → swe3-2 → test）で、増分ごとに開発しています。本フォルダが独立したプロジェクトのルートです（`AGENTS.repo.md` 3 章）。

### ドキュメントの地図

| 知りたいこと                 | ドキュメント                                                                   |
| :--------------------------- | :----------------------------------------------------------------------------- |
| 何ができるべきか（機能要求・非機能要求） | [doc/1.SPEC.md](doc/1.SPEC.md)（`FR-001`〜, `NFR-001`〜）          |
| 構成と、主要な設計判断の理由 | [doc/2.ARCHITECTURE.md](doc/2.ARCHITECTURE.md)（4 章）                         |
| 機能ごとの設計（ID 付き）    | [doc/3.detailed_design/](doc/3.detailed_design/README.md)（`DD-<略号>-<nnn>`） |
| ソースのどこに何があるか     | [doc/4.implementation/](doc/4.implementation/README.md)                        |
| 何をどう確かめるか           | [doc/5.test_spec/](doc/5.test_spec/README.md)（`TC-<略号>-<nnn>`）             |
| 初期プロトタイプのデザイン   | [doc/lucivo_functional_and_design_specification.md](doc/lucivo_functional_and_design_specification.md) |

### 変更するときの注意（過去にはまった点）

詳細は各設計 ID の「背景」を参照してください。

- **同じ id の重複**: 通常モードと Visual Stage の両方に図を残すと、描画先と SVG 内の参照（矢じり・グラデーション）が非表示側に向きます。表示しない側は空にし、SVG 内の id は図ごとに一意にしています（`DD-DIAG-001`〜`003`, `DD-DIAG-010`）。
- **Tailwind のリセット**: Tailwind CSS（CDN）がブラウザ標準のスタイルを消すため、Markdown の要素の見た目はすべて `style.css` で定義しています（`DD-MD-001`〜）。
- **Visual Stage の装飾の範囲**: 図形の装飾は、フローチャート・状態遷移図・シーケンス図だけに適用します。他の図種に適用すると崩れます（`DD-DIAG-011`）。
- **色の継承**: Visual Stage の図のカードは、外観（Light / Dark）によらず明るい色です。図の中の文字色（数式を含む）は、ページの文字色を継承させずに明示します（`DD-DIAG-021`, `DD-DIAG-031`）。
- **Mermaid 10.9.1 の癖**:
  - シーケンス図のライフラインの class は `"200"` になります（`DD-DIAG-020`）。
  - タイムラインは、1 つの図の中で同じ id を出力します（`DD-DIAG-010`）。
  - 状態遷移図の `<<choice>>` などは、遷移で使う前に宣言する必要があります。
- **表示枠の中央寄せ**: `justify-content: center` のままだと、表示枠より広い図の左側がスクロールで見えなくなります（`DD-DIAG-032`）。
- **数式**: 数式の置き場所はサニタイズの後に KaTeX で描画します。KaTeX の出力をサニタイズにかけると崩れるためです（`DD-MATH-012`, `DD-MATH-020`）。
- **サンプルとテスト**: `sample.md` の図の並び（1 つ目がフローチャート、など）を前提にしたテストがあります。図を追加・削除したら、`tests/e2e.cjs` とテスト仕様の対応する TC も見直してください。

## 既知の課題

テストで見つかった、不合格ではないが改善の余地がある点です。対応するときは、`doc/1.SPEC.md` への要求の追加から始めてください。

- 小さな図は `Fit` で枠の幅まで拡大され、文字が大きすぎる印象になる（最初のフローチャートは約 2.7 倍）。拡大の上限がない。
- Dark の Visual Stage で、表のセルの区切り線（`--border-subtle`）が本文のスラブの背景と同じ色で見えない。
- Dark の通常モードで、マインドマップとタイムラインのノードの塗りが黒に近い（Mermaid が派生色を使うため）。白文字で判読はできる。
- 2-Tier Cards で、カード上部の帯がノードの文字の上端に近い。
- Vibrant Circles のキャメル色（`#ECB674`）の上の白文字は、他の色よりコントラストが低い。
- 大きなフローチャートで、Mermaid の自動配置により、矢印がサブグラフの見出しの上を通ることがある（アプリ側では調整していない）。

## リリースノート

### 0.1.0（初期構成）

- プロトタイプ（単一 HTML）を HTML / CSS / JS に分割し、独立した単位として管理開始

