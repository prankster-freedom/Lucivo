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
2. 左ペイン（`SOURCE MARKDOWN`）に Markdown と ```` ```mermaid ```` コードブロックを入力すると、右ペインにリアルタイムでプレビューが表示されます。

### 主な使い方のパターン

- **表示モードの切り替え**: ヘッダー中央の `Split`（左右分割）/ `Canvas`（プレビューのみ）/ `Code`（エディタのみ）で作業画面を切り替えます。
- **インフォグラフィック表示（Visual Stage）**: ヘッダーの `Visual Stage` ボタン、または上部のスタイルバー（`🎨 パステル図形` / `📋 2段カード` / `⭕ 5色サークル` / `📖 クリームチャート`）をクリックすると、Mermaid ダイアグラムと文書がインフォグラフィック調に変換されます。
- **テーマ・矢印形状の変更**: 右上の太陽/月アイコンで Light / Dark を切り替え、パレット設定ボタンまたはスタイルバーからカラーパレット（Cobalt / Emerald / Amber / Royal）や矢印形状（Smooth / Step / Straight）を変更できます。
- **図のエクスポート**: 各ダイアグラムカードの右上から、表示倍率切替（`Fit` / `1:1`）、`PNG`（高解像度）・`SVG` ダウンロード、`Expand`（拡大モーダル表示）を行えます。

## ディレクトリ構成

```text
lucivo/
├── README.md          # 本ファイル（概要・使い方・リリースノート）
├── index.html         # エントリーポイント HTML
├── css/
│   └── style.css      # デザイントークン・組版・Visual Stage スタイル定義
├── js/
│   └── app.js         # レンダリングエンジン・SVG ポストプロセッサ・UI 制御
└── doc/               # 仕様書・設計書（doc スキル準拠）
    ├── lucivo_functional_and_design_specification.md
    ├── 1.SPEC.md
    ├── 2.ARCHITECTURE.md
    ├── 3.detailed_design/
    └── 4.implementation/
```

## リリースノート

### 0.1.0（初期構成）

- プロトタイプ（単一 HTML）を HTML / CSS / JS に分割し、独立した単位として管理開始

