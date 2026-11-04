---
title: Lucivo 詳細設計書 Visualモードの記述パターン別の雛形
description: Visualモードのスラブの記述パターンを判定し、雛形（リード・要点カード・手順・ステートメント）で表示する機能（FR-016）の詳細設計。
tags: ["Lucivo", "詳細設計", "Visualモード", "レイアウト"]
---

# Visualモードの記述パターン別の雛形（visual-templates）

対応する要求: `FR-016`（[SRS/features/visual-templates.md](../../SRS/features/visual-templates.md)）／アーキテクチャ: [2.ARCHITECTURE.md](../../2.ARCHITECTURE.md) 4.10／デザイン仕様: [DTP/features/visual-templates.md](../../DTP/features/visual-templates.md)（`DTP-VTPL-001`〜`080`）

## 1. 判定と組み替え（js/app.js）

| ID          | 項目               | 設計                                                                                                                                                                                                                       | 対応する要求・デザイン |
| :---------- | :----------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-VTPL-001 | 雛形の判定         | `detectSlabTemplate(els, slotCount)` は、スラブの本文要素（`buildVisualStageHtml()` の `proseEls`）と図のスロットの数から、`'lead'` / `'points'` / `'steps'` / `'quote'` / `'standard'` のいずれかを返す。判定の順序と条件は `DTP-VTPL-001` の表のとおりで、上限の数値は `TEMPLATE_LIMITS` に置く | `FR-016`, `DTP-VTPL-001` |
| DD-VTPL-002 | 判定の呼び出し     | `buildVisualStageHtml()` は、2 段組み（`FR-015`）の条件に当てはまるスラブに `.vs-tpl-split` を付ける。それ以外のスラブは `detectSlabTemplate()` で雛形を決め、`applySlabTemplate()` で組み替えてから、スラブに `.vs-tpl-<雛形>` を付けて出力する。要素も文字もないスラブ（`h1` の直後に `h2` が続く文書で、`h1` を除いた後に残る改行だけの部分）は出力しない | `FR-016`, `FR-015` |
| DD-VTPL-003 | スタイルの配色     | `buildVisualStageHtml()` は、`.exhibition-wrap` に `.vs-theme-<state.infographicStyle>` を付ける。ヒーローの 4 色バーの `span` には色を書かず、CSS（`DD-VTPL-030`）で塗る                                                                 | `FR-016`, `DTP-VTPL-070` |
| DD-VTPL-010 | リード型の組み替え | 段落を `div.vs-lead` で囲む。`div` は最初の段落の位置に入れ、フロントマターをスラブの先頭に残す（`DD-FM-030`）                                                                                                              | `DTP-VTPL-020` |
| DD-VTPL-011 | 要点カード型の組み替え | `ul` に `.vs-points` と、列の数の CSS 変数 `--vs-cols`（4 個は 2、それ以外は項目の数と 3 の小さいほう）と `--vs-cols-wide`（4 個は 4）を付ける。項目の最初の子が `strong` で、直後の文字が `:` / `：` で始まる場合は、`strong` に `.vs-point-title` を付け、区切りの文字と前後の空白を消す | `DTP-VTPL-030` |
| DD-VTPL-012 | 手順型の組み替え   | `ol` に `.vs-steps` と項目の数 `--vs-n` を付ける。項目が 5 個以上なら `.is-vertical` を付ける                                                                                                                                 | `DTP-VTPL-040` |
| DD-VTPL-013 | ステートメント型の組み替え | `blockquote` に `.vs-quote` を付ける。段落が 2 個以上あり、最後の段落が `—` / `―` / `--` で始まる場合は、その段落に `.vs-quote-cite` を付ける                                                                        | `DTP-VTPL-050` |

- **背景（DD-VTPL-001）**: 判定はタグ名と `textContent` の長さだけで行う。`getComputedStyle` や要素の大きさの計測を使わないため、Visualモードの描画のたびに判定しても軽く、キャッシュからの再描画で `getComputedStyle` を呼ばない条件（`TC-PERF-002`）を保つ。
- **背景（DD-VTPL-002）**: 組み替えは、`buildVisualStageHtml()` がスラブごとに作る DOM（`wrapper`）の上で行う。この DOM は DOMPurify でサニタイズした後の HTML から作っているため、組み替えで付ける `class`・`style`（CSS 変数）がサニタイズで消えることはない。
- **背景（DD-VTPL-011）**: 列の数を CSS の自動段数（`auto-fit`）で決めると、版面の幅によって 3 個が 2 列＋1 枚になるなど、最後の行に端数が出た（`RGH-902`）。項目の数から列の数を決めることで、端数の行を作らない。

## 2. 表示（css/style.css）

| ID          | 項目                 | 設計                                                                                                                                                                                                                                         | 対応する要求・デザイン |
| :---------- | :------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-VTPL-020 | 雛形の要素スタイル   | `.vs-lead`・`ul.vs-points`・`ol.vs-steps`・`blockquote.vs-quote` の見た目を、`.exhibition-slab` を前に付けたセレクタで定義する。既存の Markdown 要素のスタイル（`:is(.prose-doc, .exhibition-slab) ul` など）より詳細度を高くして上書きする            | `DTP-VTPL-020`〜`050` |
| DD-VTPL-021 | 項目ごとの色         | 要点カード・手順の項目は `--vs-c`（既定は `--vs-c1`）を持ち、`:nth-child(4n + 2)`〜`(4n + 4)` で `--vs-c2`〜`--vs-c4` に替える。帯・番号の丸・番号の文字は `--vs-c` から取る。番号の文字は `color-mix(in srgb, var(--vs-c) 70%, var(--vs-tone))` | `DTP-003`, `DTP-VTPL-030`, `040` |
| DD-VTPL-022 | 版面の幅での切替     | `.exhibition-wrap` を `container-type: inline-size` のコンテナにする。手順型は版面 40rem 以下で縦並び、要点カード型は版面 56rem 以上で `--vs-cols-wide`、30rem 以下で 1 列にする（`@container`）                                                    | `DTP-VTPL-030`, `040` |
| DD-VTPL-023 | 文節での折り返し     | 雛形の文字（`.vs-lead`、カード・手順の項目、`.vs-quote`）に `word-break: auto-phrase` を指定する。`index.html` の `lang="ja"` を前提とする                                                                                                  | `DTP-004` |
| DD-VTPL-030 | スタイル別の配色     | `.exhibition-wrap` に既定の `--vs-c1`〜`--vs-c4`（2-Tier Cards の 4 色）を置き、`.vs-theme-shapes` / `-circles` / `-editorial` で上書きする。章番号のバッジ（`.exhibition-num-badge`）と 4 色バーも `--vs-c1`〜`--vs-c4` を使う                     | `DTP-003`, `DTP-VTPL-070` |
| DD-VTPL-031 | Dark の外観          | `body[data-appearance="dark"] .exhibition-wrap` で、`--vs-tone`（白）、`--vs-slab-bg`、`--vs-card-bg`、`--vs-card-border`、`--vs-line`（接続線）、`--vs-sub-text`（出典）を Dark 用に替える                                                       | `DTP-VTPL-080` |

- **背景（DD-VTPL-022）**: 画面の幅（`@media`）で切り替えると、`Split` 表示ではプレビューが画面の半分ほどになるのに横並びのままになり、手順の文字が詰まる。版面の幅で判定することで、表示モード（`Split` / `Canvas`）によらず同じ基準で切り替わる。
- **背景（DD-VTPL-031）**: Dark のスラブの背景（`#1E293B`）に対し、`--border-strong`（`#334155`）と `--text-muted`（`#64748B`）は明るさの差が小さく、接続線と出典が沈んだため、雛形の中だけ明るい色を使う。
