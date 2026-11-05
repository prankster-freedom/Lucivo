---
title: Lucivo 詳細設計書 図ごとの矢印の形状
description: 図のカードごとに矢印の形状（曲線 / 直角 / 直線）を選ぶ機能（FR-012）の詳細設計。
tags: ["Lucivo", "詳細設計", "Mermaid", "矢印"]
---

# 図ごとの矢印の形状（edge-style）

対応する要求: `FR-012`, `FR-004`（[1.SRS.md](../../1.SRS.md) および [1.SRS/features/edge-style.md](../../1.SRS/features/edge-style.md)）／アーキテクチャ: [2.ARCHITECTURE.md](../../2.ARCHITECTURE.md) 4.8

## 1. 設計

| ID          | 項目        | 設計                                                                                                                                                                           | 対応する要求 |
| :---------- | :---------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| DD-EDGE-001 | 対象の判定  | `getCurveTarget(code)` は、Mermaid のコードの先頭（空行、`%%` で始まる行を除く最初の行）が `flowchart` または `graph` で始まれば `'flowchart'`、それ以外は `null` を返す       | `FR-012`     |
| DD-EDGE-002 | 既定の形状  | `DEFAULT_CURVES = { flowchart: 'step' }`。対象の図種ごとの既定の形状を持つ。対象外の図種は Mermaid の描画のまま（状態遷移図・クラス図・ER 図は曲線）                           | `FR-012`     |
| DD-EDGE-003 | 選択の保持  | `state.curveByIndex`（`Map`、図の番号 → `'smooth'` / `'step'` / `'straight'`）。値がない図は既定の形状を使う。ファイルを読み込んだときに空にする。表示モードの切替では変えない | `FR-012`     |
| DD-EDGE-004 | 描画への反映 | `renderApp()` は、図ごとに形状 `curve`（`getBlockCurve(index, code)`）を求め、キャッシュのキーのハッシュに含める。`processDirtyBlocks()` は、図ごとに `setupMermaid(isVisual, curve)` を呼んでから描画する。`setupMermaid` は `curve` を `flowchart.curve`（`basis` / `stepAfter` / `linear`）に変換して渡す | `FR-012` |
| DD-EDGE-010 | 選択の UI   | 対象の図のカードのヘッダーに、`曲線` / `直角` / `直線` の 3 つのボタン（`.edge-curve-btn`、`data-curve`、`data-index`）を置く。選択中のボタンに `is-active` と `aria-pressed="true"` を付ける。対象外の図には置かない | `FR-012` |
| DD-EDGE-011 | 選択の操作  | ボタンを押すと `state.curveByIndex` を更新して `renderApp()` を呼ぶ。選んだ図だけキャッシュのキーが変わるため、その図だけが描き直される                                        | `FR-012`     |
| DD-EDGE-020 | 廃止する UI | スタイルバーと設定モーダルの「矢印形状」の切替（`.curve-option-btn`）と、`state.curve` を削除する                                                                              | `FR-004`     |

- **背景（DD-EDGE-001, 002）**: Mermaid 10.9.1 で矢印の形状の設定（`curve`）が効くのはフローチャートだけである。状態遷移図・クラス図・ER 図は、`flowchart` / `state` / `class` / `er` のどの設定でも結線の形が変わらないことを確認した（要求仕様書 `FR-012`）。
- **背景（DD-EDGE-003）**: 選択は文書に書き込まない（要求仕様書 `FR-012`）。図の番号で保持するため、図を追加・削除すると、それより後ろの図の選択がずれることがある。画面の表示の間だけの設定のため、許容する。
