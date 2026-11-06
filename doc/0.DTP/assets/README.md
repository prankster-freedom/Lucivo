---
title: Lucivo 素材台帳
description: Lucivo の製品で使う本番素材（フォント・ベクター装飾素材）および DTP ストック・ボツ素材の管理台帳。
tags: ["Lucivo", "DTP", "素材"]
---

# 素材台帳

製品に同梱・公開する本番素材は `public/assets/`に配置し、加工前の作図元データは [sources/](sources/)、未使用のストック・ボツ素材は [stock/](stock/) に保管する（リリース時は `doc/` ごと除外される）。

| ID        | 素材                                           | 種類     | 状態     | 配置                                                                                                                                     | 用途                                                                     | 仕様・権利情報                                                          |
| :-------- | :--------------------------------------------- | :------- | :------- | :--------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------- | :---------------------------------------------------------------------- |
| `AST-001` | Inter                                          | フォント | 使用中   | Google Fonts から読み込む（同梱しない）                                                                                                  | 本文・リード・カードの題（`DTP-004`）                                    | 400〜700。SIL Open Font License 1.1                                     |
| `AST-002` | Plus Jakarta Sans                              | フォント | 使用中   | Google Fonts から読み込む（同梱しない）                                                                                                  | 見出し・ステートメント・番号（`DTP-004`）                                | 600〜800。SIL Open Font License 1.1                                     |
| `AST-003` | Noto Sans JP                                   | フォント | 使用中   | Google Fonts から読み込む（同梱しない）                                                                                                  | 和文（`DTP-004`）                                                        | 400〜700。SIL Open Font License 1.1                                     |
| `AST-004` | JetBrains Mono                                 | フォント | 使用中   | Google Fonts から読み込む（同梱しない）                                                                                                  | コード・表の見出し・フロントマター                                       | 400〜700。SIL Open Font License 1.1                                     |
| `AST-005` | ヒーロー・プリズムエンブレム                   | SVG 素材 | 使用中   | [../../assets/motifs/hero-prism.svg](../../../public/assets/motifs/hero-prism.svg)                                                              | Visualモードのヒーローヘッダー左端の象徴エンブレム（`DTP-001`）          | `32×32` viewBox、CSS `mask-image` で `--vs-c1`〜`c4` グラデーションを適用。自作（CC0 / MIT） |
| `AST-006` | ステートメント引用モニュメント                 | SVG 素材 | 使用中   | [../../assets/motifs/quote-watermark.svg](../../../public/assets/motifs/quote-watermark.svg)                                                    | ステートメント型（`DTP-VTPL-050`）上部の彫刻引用符と光輪                 | `64×44` viewBox、CSS `mask-image` で `--vs-c1` を適用。自作（CC0 / MIT） |
| `AST-007` | 要点カード・コーナーファセット                 | SVG 素材 | 使用中   | [../../assets/motifs/card-corner-ornament.svg](../../../public/assets/motifs/card-corner-ornament.svg)                                          | 要点カード型（`DTP-VTPL-030`）右上コーナーの幾何学透かし装飾             | `64×64` viewBox、CSS `mask-image` で項目の `--vs-c` を適用。自作（CC0 / MIT） |
| `AST-008` | 手順フロー・方向シェブロン                     | SVG 素材 | 使用中   | [../../assets/motifs/step-arrow.svg](../../../public/assets/motifs/step-arrow.svg)                                                              | 手順型（`DTP-VTPL-040`）の接続線上の進行方向シェブロン                   | `16×16` viewBox、CSS `mask-image` で `--vs-c` を適用。自作（CC0 / MIT） |
| `AST-009` | ルミナス・フロースパーク                       | SVG 素材 | 使用中   | [../../assets/motifs/flow-spark.svg](../../../public/assets/motifs/flow-spark.svg)                                                              | 手順型（`DTP-VTPL-040`）および光脈フロー（`DTP-VTPL-095`）の光彩スパーク | `24×24` viewBox、CSS `mask-image` で `--vs-c` を適用。自作（CC0 / MIT） |
| `AST-010` | ブランド Favicon（Light / Dark）               | SVG 素材 | 使用中   | [../../assets/logos/light/favicon.svg](../../../public/assets/logos/light/favicon.svg), [../../assets/logos/dark/favicon.svg](../../../public/assets/logos/dark/favicon.svg) | ブラウザタブの Favicon（Light / Dark 連動、`DTP-005`） | `32×32` viewBox、LV モノグラムノード構造。自作（CC0 / MIT）         |
| `AST-011` | ブランド・カプセルロゴ（Light / Dark）         | SVG 素材 | 使用中   | [../../assets/logos/light/logo_capsule.svg](../../../public/assets/logos/light/logo_capsule.svg), [../../assets/logos/dark/logo_capsule.svg](../../../public/assets/logos/dark/logo_capsule.svg) | メインヘッダー左端のブランドロゴ（Light / Dark 連動、`DTP-005`） | `440×120` viewBox、ルミナスドット＋等幅 `Lucivo`＋ステージウェーブ。自作（CC0 / MIT） |
| `AST-012` | ブランド・フルバナーロゴ（Light / Dark）       | SVG 素材 | 使用中   | [../../assets/logos/light/logo_full.svg](../../../public/assets/logos/light/logo_full.svg), [../../assets/logos/dark/logo_full.svg](../../../public/assets/logos/dark/logo_full.svg) | 起動時の初期案内画面（`.empty-guide`）上部のフルバナー（Light / Dark 連動、`DTP-005`） | `880×240` viewBox、LV シンボル＋正式名称＋タグライン。自作（CC0 / MIT） |
| `AST-101` | フィルムグレイン・ノイズオーバーレイ           | SVG 素材 | ストック | [stock/noise-grain-overlay.svg](stock/noise-grain-overlay.svg)                                                                           | スラブ背景に紙のざらつきを与える `feTurbulence` フィルタ                 | 質感は高いが、スクロール時の GPU 合成負荷を抑えるため通常表示では見送り。将来の高解像度静止画書き出し専用としてストック |
| `AST-102` | セクション間ウェーブディバイダ                 | SVG 素材 | ストック | [stock/section-divider-wave.svg](stock/section-divider-wave.svg)                                                                         | 章と章の間をつなぐ有機的な波形装飾線                                     | 現在はスラブ自身が角丸と影で独立しているため不要。将来の連続スクロール型エッセイテーマ向けにストック |
| `AST-103` | 立体リボン型ステージバッジ                     | SVG 素材 | ボツ     | [stock/badge-ribbon-3d.svg](stock/badge-ribbon-3d.svg)                                                                                   | 章番号（`STAGE nn`）の折り返し立体リボン                                 | ベベルと濃い影が 4 スタイルのフラット・モダンなトーン＆マナー（`DTP-001`）と衝突するため不採用 |
| `AST-104` | アプリアイコン・スクエア（Light / Dark）       | SVG 素材 | ストック | [stock/logos/light/icon_square.svg](stock/logos/light/icon_square.svg), [stock/logos/dark/icon_square.svg](stock/logos/dark/icon_square.svg) | PWA・デスクトップアプリ・OGP 用の角丸正方形アイコン                  | `512×512` viewBox。現時点では Web ヘッダーに `AST-011`、初期案内に `AST-012` を使用するためストックとして保管 |
| `AST-105` | アプリアイコン・ラウンドバッジ（Light / Dark） | SVG 素材 | ストック | [stock/logos/light/icon_round.svg](stock/logos/light/icon_round.svg), [stock/logos/dark/icon_round.svg](stock/logos/dark/icon_round.svg) | 円形バッジ・ポータル連携用の正円アイコン                                 | `512×512` viewBox。将来の外部連携・シリーズ展開向けにストックとして保管 |

## 制作元データ（リリース除外）

- [sources/motifs-construction-grid.svg](sources/motifs-construction-grid.svg): 本番採用したベクター装飾素材（`AST-005`〜`AST-008`）の作図グリッド・比率ガイド付きマスターデータ。

## 素材適用の設計原則

- 本番 SVG 素材（`AST-005`〜`008`）は、単一ファイルのまま 4 スタイル（`shapes` / `cards` / `circles` / `editorial`）および Light / Dark のすべての配色に追従できるよう、CSS の `mask-image`（`-webkit-mask-image`）として読み込み、塗りに CSS 変数（`--vs-c1`〜`--vs-c4`）を与える。
- これにより、スタイル切り替え時にネットワーク再取得や DOM 再構築を行わずに、ミリ秒単位で素材の配色と動的状態（ホバー・スポットライト）が切り替わる。
