---
title: Lucivo 詳細設計書 図の描画と後処理
description: Mermaid 図の描画先の管理、SVG 内 id の一意化、図種ごとの装飾と配色（FR-003, FR-008, NFR-004）の詳細設計。
tags: ["Lucivo", "詳細設計", "Mermaid", "SVG"]
---

# 図の描画と後処理（diagram-rendering）

対応する要求: `FR-002`, `FR-003`, `FR-008`, `FR-010`, `FR-015`, `NFR-002`, `NFR-004`, `NFR-005`（[1.SRS.md](../../1.SRS.md) および [1.SRS/features/diagram-rendering.md](../../1.SRS/features/diagram-rendering.md)）／アーキテクチャ: [2.ARCHITECTURE.md](../../2.ARCHITECTURE.md) 4.2・4.3・4.6・4.9

## 1. 描画の流れ

```mermaid
flowchart TD
  A["renderApp()"] --> B["Markdown を解析し、mermaid ブロックをスロットに置き換える"]
  B --> C["表示する側のコンテナに HTML を設定し、表示しない側を空にする（DD-DIAG-001）"]
  C --> D{"キャッシュにあるか"}
  D -->|ある| E["カードに SVG を入れて表示"]
  D -->|ない| F["描画中カードを表示し、processDirtyBlocks へ"]
  F --> G["setupMermaid(モード) → mermaid.render()"]
  G --> H{"描画世代が最新か（DD-DIAG-002）"}
  H -->|古い| I["結果を捨てて終了"]
  H -->|最新| J["postProcessSvg()：図種の判定 → 装飾 → id の一意化（DD-DIAG-010〜030）"]
  J --> K["キャッシュに保存し、描画開始時のコンテナ内のカードに書き込む"]
```

## 2. 描画先の管理

| ID          | 項目                 | 設計                                                                                                                                                  | 対応する要求        |
| :---------- | :------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| DD-DIAG-001 | 非表示側の破棄       | `renderApp()` は、表示しない側のコンテナ（高速モードの `#standard-doc-container` または `#visual-stage-container`）の中身を空にする                   | `FR-003`, `NFR-004` |
| DD-DIAG-002 | 描画世代             | `renderApp()` を呼ぶたびに `renderGeneration` を 1 増やし、`processDirtyBlocks()` に描画開始時の世代・コンテナ・モードを渡す。`mermaid.render()` の前後で世代が変わっていれば、結果を DOM にもキャッシュにも反映せずに終了する | `FR-003`, `NFR-002` |
| DD-DIAG-003 | 書き込み先の探索範囲 | 描画結果の書き込み先と、カードのボタン（Fit / 1:1 / PNG / SVG / Expand）の操作対象は、描画開始時のコンテナの中から探す（`document` 全体から探さない） | `FR-003`, `FR-005`  |
| DD-DIAG-004 | 直前の正常描画       | 直前の正常描画（LKG）は、図の番号とモード（`std` / `vis-<スタイル>`）の組で保持する。構文エラーのとき、別のモードの図が表示されないようにするため     | `NFR-002`           |
| DD-DIAG-005 | 拡大表示の後始末     | 拡大モーダルを閉じたら、モーダルに複製した SVG を消す                                                                                                 | `FR-005`            |

- **背景（不具合の原因）**: 以前は表示しない側のコンテナに図が残っていた。このため、`document.querySelector('[data-stage-index=N]')` が非表示側のカードを先に見つけ、Visualモードへの初回の切り替えで、描画結果が非表示の高速モード側に書き込まれていた。その結果、Visualモード側のカードが「描画中」のまま残った。DD-DIAG-001 と DD-DIAG-003 で再発を防ぐ。

## 3. SVG の後処理（`postProcessSvg`）

`aria-roledescription` 属性で図種を判定し、モードに応じて装飾した後、id を一意にする。

| ID          | 項目                     | 設計                                                                                                                                                                                                                      | 対応する要求 |
| :---------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :----------- |
| DD-DIAG-010 | id の一意化              | SVG 内のすべての id に SVG 自身の id を接頭辞として付け、属性中の `url(#…)`（`style` 属性の `url("#…")` を含む）、`href` / `xlink:href`、`aria-labelledby` / `aria-describedby` の参照を書き換える。1 つの SVG の中で同じ id が重複する場合（タイムラインの `node-undefined` など）は、2 つ目以降に連番を付け、参照は最初の要素に向けたままにする | `FR-008`, `NFR-004` |
| DD-DIAG-011 | ノード装飾を適用する図種 | `NODE_DECORATED_TYPES`（`flowchart-v2` / `flowchart` / `stateDiagram`）だけに、`g.node` の形・塗りの置き換えとサブグラフの装飾を適用する                                                                                  | `FR-008`     |
| DD-DIAG-012 | シーケンス図の装飾       | シーケンス図には、モードに応じて DD-DIAG-020 と DD-DIAG-021 を適用する                                                                                                                                                    | `NFR-004`    |
| DD-DIAG-013 | マーカーの大きさ         | Visualモードでノード装飾を適用した図は、線幅を基準に拡大されるマーカー（`markerUnits` が既定のもの）を、`viewBox` を付けたうえで `userSpaceOnUse` の固定サイズ（元の 1.6 倍）にする。線を太くすると矢じりが巨大になるため | `FR-008`     |

- **背景（DD-DIAG-010）**: Mermaid は、シーケンス図の矢じり（`#arrowhead`, `#crosshead`, `#filled-head`, `#sequencenumber`）、ER 図の端点、ジャーニー図・タイムラインの矢じりを、図をまたいで同じ id で出力する。同じページに同じ id があると、`url(#…)` は文書中で最初の要素を参照する。参照先が非表示の要素や別の図の要素になると、矢じりやグラデーションが描かれないか、別の図の配色になる。
- **背景（DD-DIAG-011）**: 判定に `aria-roledescription` を使うのは、Mermaid がすべての図種でこの属性に図種名を出力するため（`12.3.0` で同梱サンプルの全図種を確認した）。

### DD-DIAG-043 Mermaid 12 の出力への対応（`FR-008`）

Mermaid 12 は既定の見た目・レイアウト・余白が 10 系と異なり、図の装飾が前提にする出力の構造も変わった。従来の組版と装飾を保つため、次の設定と後処理を行う。

- `look: 'classic'` と `layout: 'dagre'` を指定する。既定の `neo` と `elk` では `flowchart.curve` が効かず、矢印の形状を選べない（`FR-012`）
- 直角のクラス図にも `layout` を指定しない（`edge-style.md` の DD-EDGE-005）
- マインドマップには `layout` を指定しない。`dagre` を指定すると、放射状ではなく樹形に配置される。`layout` は図種によらず図全体に効くため、図ごとに `setupMermaid` の引数で切り替える
- `flowchart.padding` と `state.padding` は 10 系の約半分の値にし、`minNodeWidth` を 0 にする。12 は余白を両側に効かせ、短いラベルも最小幅まで広げるので、そのままでは図が広がり、Visualモードの 2 段組みが 1 段に変わる
- フローチャートのスタジアム形のノードは `path` で出力されるので、`rect` に置き換える（`normalizeStadiumNodes`）。クラス図や要件図の箱も同じ `g.basic.label-container` で出力されるので、フローチャートの `outer-path` に限る
- 状態遷移図の分岐（`<<choice>>`）とフォーク・ジョイン（`<<fork>>` / `<<join>>`）は `path` で出力されるので、10 系と同じ `polygon.state-start` と `rect.fork-join` に置き換える（`normalizeStateNodes`）。図の装飾と CSS がこの形を前提にしている
- 矢印のラベルは `.labelBkg` と `p` で包まれる。背景と余白が重なって十字形に見えないよう、背景は `span.edgeLabel` の 1 枚だけにする（`style.css`）

## 4. 配色

### DD-DIAG-020 シーケンス図の配色（`NFR-004`）

`styleSequenceDiagram()` で、次の要素の色を指定する。

| 要素                                       | 高速モード                          | Visualモード            |
| :----------------------------------------- | :---------------------------------- | :---------------------- |
| ライフライン（縦の線、破線 `5 4`、1.25px） | Light `#64748B` / Dark `#94A3B8`    | スタイルの `lifeline`   |
| 活性区間の矩形（塗り・枠 1.5px）           | 塗り: パレットの枠線色の半透明（Light 16% / Dark 30%）、枠: パレットの枠線色 | スタイルの `activationBg` / `activationBorder` |
| メッセージ線（2px。応答の破線は `6 4`）    | パレットの線色                      | スタイルの `edgeStroke` |
| 矢じり・番号の円                           | メッセージ線と同じ色                | メッセージ線と同じ色    |
| 番号の文字                                 | Light `#FFFFFF` / Dark キャンバス色 | `#FFFFFF`               |

- ライフラインは、Mermaid が class に `"200"` を含めて出力するため（`10.9` 系は `"200"`、`12.3.0` は `"actor-line 200"`）、`line[id^="actor"]` と `line[class~="200"]` で選ぶ。
- 応答メッセージ（`-->>`）の破線は意味を持つため、実線に置き換えない。

### DD-DIAG-021 Visualモードの配色（`FR-008`）

- Visualモードは、スタイルごとの配色（Light は `VISUAL_THEMES`、Dark は `VISUAL_THEMES_DARK`）を `setupMermaid(true)` で Mermaid の配色変数に渡す（Dark は DD-DIAG-024）。
- ノード装飾を適用しない図種（クラス図、ER 図、ガント、円グラフ、ジャーニー、4 象限、要求図、Git グラフ、マインドマップ、タイムライン、XY チャート）は、この配色だけで描画する。
- シーケンス図の参加者の箱は、参加者名ごとに色を割り当て、上下の箱を同じ色にする。
- Circles スタイルでは、ひし形・平行四辺形も円形ノードと同じパレットで塗る（白文字を淡い塗りの上に載せないため）。
- Editorial スタイルでは、状態遷移図の並行（fork / join）のバー（高さ 10 以下の矩形）を白で塗らず、Mermaid の線の色のまま残す（白いバーはクリーム色の背景に溶けて見えないため）。
- Circles スタイルで、明るいキャメル色（`#ECB674`、`CIRCLE_DARK_TEXT_FILLS`）の塗りの上の文字は、白ではなく濃い茶色にする（白ではコントラストが足りないため）。
- Cards スタイルの帯はカードの上部に重なるため、ノードのラベルを帯の高さの半分だけ下げ、帯の下の白い部分の中央に置く。
- ヒーロー（文書の題名）は、`h1` があればその文字、なければ読み込んだファイル名（拡張子なし）を表示し、どちらもなければ出さない。文書と関係のない固定の文言は表示しない。
- 見出し（ヒーローと各スラブの `h2`）の文字は、`textContent` をエスケープしてから HTML に埋め込む。そのまま埋め込むと、見出しに書いた `&lt;img …&gt;` などが HTML として解釈される（`NFR-003`）。
- Cards スタイルのステップ記号（A, B, C…）は、カード化したノードだけを図の上から順（同じ高さは左から）に付ける。記号は A〜Z の後、AA, AB…と続け、1 つの図の中で重複させない（ノードの多い図で記号が繰り返されると、ステップを識別できないため）。

### DD-DIAG-022 図種別の配色変数（`FR-008`）

派生色に任せると判読できなくなる図種は、`setupMermaid()` で配色変数を明示する。

| 図種           | 配色変数                                                 | 理由                              |
| :------------- | :------------------------------------------------------- | :-------------------------------- |
| ER 図          | `attributeBackgroundColorOdd` / `Even`                   | Dark で属性行が白地に白文字になる |
| ガントチャート | `sectionBkgColor*`, `taskBkgColor`, `taskText*Color`, `activeTask*`, `doneTask*`, `crit*`, `gridColor` | Dark でバーの文字が背景に埋もれる |
| XY チャート    | `xyChart`（背景を透明、軸・文字・系列の色）              | 白地に淡い色の棒になる。Dark で白い板が浮いて見える |
| 円グラフ       | `pieStrokeColor`, `pieOuterStrokeColor`, `pie*TextColor` | 境界線の既定が黒のため、Dark で暗い扇形どうしの境目が見えない |

- ガントチャートは、描画時のページ幅で横長に生成され、表示枠に縮小されて文字が極小になる。このため、`gantt.useWidth` を表示枠に近い 820 にする。

### DD-DIAG-023 空のエッジラベル（`FR-008`）

- ラベルのない矢印にも、Mermaid は空のエッジラベルを図の原点に出力する。`style.css` の `svg .edgeLabel:empty, svg .edgeLabel span:empty` で余白と背景をなくし、小さな図形として見えないようにする。

### DD-DIAG-024 Dark の Visualモード

- カード背景（`.infographic-bg-<スタイル>`）は、Dark では各スタイルの調子を保った暗い色にする（`style.css`）。
- `VISUAL_THEMES_DARK` は、Light の配色に、背景の上に直接描く線・文字（結線、ラベル、ライフライン、サブグラフ、装飾しない図種のノード）を明るくする共通の値（`VISUAL_DARK_BASE`）と、スタイルごとの派生色（`VISUAL_DARK_ACCENTS`）を重ねたもの。
- 装飾したノードの塗り（色付きの図形・白いカード）と、その上の文字・シーケンス図の参加者の箱の文字は、外観によらず同じ色にする（塗りが明るいまま変わらないため）。
- 装飾で決め打ちしていた結線の色（Shapes・Cards）は配色の `edgeStroke` に、サブグラフの磨りガラスは Dark では暗い半透明にする。シーケンス図の番号は、明るい円の上に載るため暗い色にする。
- PNG の書き出しの背景は、Dark では配色の `canvasBg` にする（明るい文字が白い背景に消えないため）。
- 背景: 以前は外観によらずカードを明るくしていたが、Dark で使う利用者にとってまぶしく、画面の調子がそろわなかった。

### DD-DIAG-025 Dark の枝ごとの色と円グラフの色（`FR-008`）

- マインドマップ・タイムライン・ジャーニーの枝ごとの色（`cScale0`〜`11`）を、Dark では明示する（`darkSectionScale`）。色相を 30 度前後ずつずらし、明度をそろえた色にする。文字は明るい色（`cScaleLabel0`〜`11`）にする。
- 背景: Mermaid は `darkMode` のとき、テーマの派生色を暗くする。派生のままでは、Dark の背景の上でノードと枝が黒く沈み、読めなかった（`10.9` 系から同じ）。
- 円グラフの色（`pie1`〜`pie12`）も、Dark では同じ色相の色を明示し、スライスの上の文字を明るくする（`pieSectionTextColor`）。派生のままでは、一部のスライスと凡例が背景に沈んでいた（`10.9` 系から同じ）。

## 5. 表示倍率と図の中の数式

| ID          | 項目                       | 設計                                                                                                                                                                                                                                                    | 対応する要求        |
| :---------- | :------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------ |
| DD-DIAG-030 | `Fit` の縮小の下限と `1:1` の原寸幅 | 図をカードに入れた後に `applyReadableFit(svg)` を呼ぶ。図の中の文字を持つ要素（`text`、`foreignObject` 内の要素）の計算後の文字サイズの最小値 `minFont` を求め、SVG の `min-width` を `viewBox の幅 × min(1, 10 / minFont)` px に設定し、あわせて `viewBox の幅`（`Math.ceil(viewBox.width)`）を CSS 変数 `--natural-width` に設定する。`1:1` 表示（`.is-actual-size`）では `width: var(--natural-width) !important; min-width: var(--natural-width) !important; flex-shrink: 0 !important;` により常に元の `viewBox` 幅（1.0 倍）で表示する。描画の直後と、キャッシュから表示したときの両方で呼ぶ | `FR-005`, `NFR-005` |
| DD-DIAG-031 | シーケンス図の数式のずらし | `styleSequenceDiagram()` で、SVG 直下の `foreignObject`（Mermaid がメッセージの数式を入れる要素）の `y` を 6 小さくする（上へずらす）。文字色を、高速モードはパレットの `nodeText`、Visualモードはスタイルの `nodeText` に指定する                      | `FR-010`, `NFR-005` |
| DD-DIAG-033 | 小さな図の拡大の上限       | `applyReadableFit()` は、`viewBox の幅 × MAX_FIT_SCALE（1.5）` を CSS 変数 `--fit-max-width` に設定する。表示枠の CSS は `max-width: min(100%, var(--fit-max-width))` とする                                                                            | `NFR-007`           |
| DD-DIAG-034 | 計算結果のキャッシュ       | `applyReadableFit(svg, cacheKey)` は、計算結果（`naturalWidth`、`minWidth`、上限 `maxWidth`）を描画結果のキャッシュのキーごとに `fitCache` に保存する。キャッシュから表示するときは、計算後のスタイルを調べ直さない                                     | `NFR-006`           |
| DD-DIAG-032 | 表示枠からはみ出す図       | 図の表示枠（`.diagram-viewport`、`.exhibition-viewport`）は `justify-content: flex-start` とし、表示枠の子要素（SVG、描画中・構文エラーの表示）は左右の `margin` を `auto` にして中央に置く。はみ出す場合は左端から表示し、横スクロールで全体を見られる | `NFR-005`           |

- **背景（DD-DIAG-030）**: `Fit` は SVG の幅を表示枠の幅（100%）にするため、横に大きい図ほど縮小される。CSS では `min-width` が `max-width` より優先されるため、`min-width` で縮小の下限を決められる。一方、Mermaid が出力する `<svg width="100%" style="max-width: …px" viewBox="0 0 W H">` に対して、`.is-actual-size` で固定値の `width: auto !important; min-width: 680px !important` を指定すると、フレックスコンテナ（`.exhibition-viewport`）内では `width: auto` がコンテナ幅（100%）に縮み、かつ `min-width: 680px !important` がインラインの `svg.style.minWidth`（10px 下限幅）を上書きしてしまう。その結果、横に広い図では `Fit` の方が大きく（`minWidth` で横スクロール）、`1:1` の方が小さく（コンテナ幅に縮小）なり、逆に小さな図（`viewBox` 幅 260px など）では `1:1` が 680px に拡大される逆転現象が起きる。`--natural-width` に `viewBox.width` を渡して `1:1` 時の `width`・`min-width` に使うことで、図の大小によらず `1:1` は常に正確な原寸（1.0 倍）となる。
- **gitGraph の表示の大きさ**: Mermaid `10.9` 系の gitGraph は固定の幅（`width` 属性）で出力されたため、`Fit` の拡大が効かず原寸で表示されていた。`12.3.0` は他の図種と同じ `width="100%"` と `max-width` で出力するので、他の図種と同じく `Fit` で表示枠の幅まで拡大される（上限は `MAX_FIT_SCALE`）。
- **背景（DD-DIAG-031）**: Mermaid（`10.9` 系、`12.3.0` で確認）は、数式の `foreignObject` の下端をメッセージ線の位置にそろえて配置する。和の記号の添字や分数の分母が線に接し、重なって見えるため。6 は、線の太さ（2px）と、文字と線の間に必要な余白から決めた値。また、数式（MathML）はページの文字色を継承するため、Visualモードの Dark では、明るいカードの上に白い文字で描かれて見えなくなる。このため文字色も指定する。
- **背景（DD-DIAG-032）**: 表示枠は `justify-content: center` で SVG を中央に置いていた。この状態で SVG が表示枠より広くなると、左右へ均等にはみ出し、左側がスクロールでも見えない位置になる。左右の `margin: auto` は余白があるときだけ中央に置き、はみ出すときは 0 になる。ただし、`margin: auto` が 0 になった場合は `justify-content` が効くため、`margin: auto` だけでは解決せず、`justify-content` を `flex-start` にする必要がある（テストで確認した）。

## 6. Visualモードの自動 2 段組みレイアウト

| ID          | 項目                                      | 設計                                                                                                                                                                                                                                                                                                                                                         | 対応する要求        |
| :---------- | :---------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| DD-DIAG-040 | 2 段組み対象スラブの構築                  | `buildVisualStageHtml()` でスラブの要素群を調べ、`.lucivo-slot` がちょうど 1 つあり、かつ `h2`・`.front-matter`・`.lucivo-slot` 以外の要素ノード（本文要素）が 1 つ以上あり、かつ本文要素に小見出し（`h3`〜`h6`）・表（`table`）・コードブロック（`pre`）を含まない場合は、スラブに `.exhibition-slab-split` を付け、`h2`（および先頭の `.front-matter`）の下に `<div class="exhibition-slab-body"><div class="exhibition-slab-prose">…</div><div class="exhibition-slab-figure">…</div></div>` を出力する | `FR-015`, `FR-016` |
| DD-DIAG-041 | 2 段組みの CSS グリッド                   | `.exhibition-slab-split > .exhibition-slab-body` は CSS Grid（左 `minmax(15rem, 5fr)`、右 `minmax(0, 7fr)`、`align-items: start`）で横並びにする。`.is-stacked` が付いた場合と画面幅 `767px` 以下の場合は `grid-template-columns: minmax(0, 1fr)`（縦積み 1 段）にする                                                                                       | `FR-015`, `NFR-007` |
| DD-DIAG-042 | 幅超過時の 1 段組みへの自動フォールバック | `applyReadableFit()` の直後、図の倍率切替（`Fit` / `1:1`）時、ビューモード切替（`Split` / `Canvas`）時、およびウィンドウの `resize` 時に `updateSlabSplit()` を呼ぶ。いったん `.is-stacked` を外した状態で、`.exhibition-viewport` に `.is-actual-size`（`1:1` 表示）が付いているか、または `scrollWidth > clientWidth + 1` であれば、`.is-stacked` を付ける | `FR-015`, `NFR-005` |

- **背景（DD-DIAG-040）**: 先頭スラブに `.front-matter` が含まれる場合、`.front-matter` を `.exhibition-slab-body` の外（スラブの先頭子要素）に置くことで、フロントマターが常にスラブ最上部に全幅表示される設計（`DD-FM-030`）と両立させる。
- **背景（DD-DIAG-042）**: 固定のノード数や `viewBox` 幅の閾値だけで判定すると、文字の大きさや画面幅（`Split` と `Canvas` の差）によって、右カラム内で横スクロールが出る図や、逆に収まるのに 1 段になる図が出る。`applyReadableFit()` が設定した `min-width` のもとで実際の `scrollWidth > clientWidth + 1` を調べることで、`NFR-005`（10px 下限）と完全に一致した判定ができる。また `getComputedStyle` を呼ばないため、`TC-PERF-002` のキャッシュ再描画条件（`getComputedStyle` 呼び出し 0 回）も維持される。

## 7. Split 表示の編集位置への追従（`FR-037`）

| ID          | 項目                   | 設計 |
| :---------- | :--------------------- | :--- |
| DD-DIAG-060 | 見出しの元の行         | `renderApp()` は、フロントマターの行数（`countLinesBefore(rawMarkdown, rawMarkdown.length - body.length)`）から始め、Marked の最上位のトークンごとに `raw` の改行を数えて進め、`heading` のトークンに `srcLine`（0 始まりの元の行番号）を付ける。`setupMarkedHeadings()` で登録した `renderer.heading` が、`srcLine` を `data-src-line` 属性として出力する（DOMPurify は `data-*` 属性を残す） |
| DD-DIAG-061 | 追従の契機と間引き     | エディタの `click`・`keyup`・`input` と、エディタにフォーカスがあるときの `renderApp()` の終わりで `scheduleFollow()` を呼ぶ。`requestAnimationFrame` で 1 フレームに 1 回の `followEditorCaret()` にまとめる。`state.viewMode` が `split` 以外のとき、ステージ発表中（`html.is-stage-show`）は何もしない |
| DD-DIAG-062 | 送り先と送り直しの判定 | `followEditorCaret()` は、カーソルの前の改行を数えてカーソルの行を求め、表示中のコンテナの `[data-src-line]` を前から見て、その行以前で最後の見出しを選ぶ（`findFollowTarget()`）。Visualモードは見出しを含むスラブ（`.exhibition-slab`）を送り先とし、スラブの最初の見出しの行を区間の鍵にする。鍵（なければ `'top'`）が前回（`followedKey`）と同じなら送らない。違えば `#preview-scroll` を送り先の上端が表示枠の上端から 16px（`PREVIEW_SCROLL_MARGIN`）の位置へスクロールする（`previewScrollTopOf()`、動きを減らす設定では即座に）。ファイルを読み込んだら鍵を消す |

- **背景（DD-DIAG-060）**: 最上位のトークンの `raw` をつなげると本文に一致するため、改行を数えるだけで元の行がわかる。構文解析の結果を使うので、コードブロックの中の `#` を見出しと誤らない。入れ子の見出し（引用の中の `#` など）は `srcLine` を持たず、追従の対象にしない。
- **背景（DD-DIAG-061）**: カーソルの行を求める処理は改行を数えるだけで、レイアウトを読まない。入力のたびの描画は 250ms の間引きのまま変わらないため、高速モードの軽快さ（`NFR-006`）を損なわない。入力で見出しを書き足した直後は、描画が終わるまで新しい見出しの要素がないため、描画の後にもう一度区間を引く。
- **背景（DD-DIAG-062）**: 区間の鍵が変わったときだけ送ることで、利用者がプレビューを手で読み進めた位置を、同じ区間の編集の間は保つ。Visualモードで小見出しを鍵にすると、同じスラブの中の小見出しの間を動くたびにスラブの上端へ戻されるため、スラブを単位にする。
- **リファクタリング**: J/K の章移動（`scrollSection()`、`FR-025`）と共通の、スクロール位置の計算（`previewScrollTopOf()`）と動きを減らす設定の判定（`scrollBehavior()`）を関数にまとめた。

## 8. スタイルバーの表示（`FR-003`）

| ID          | 項目                       | 設計 |
| :---------- | :------------------------- | :--- |
| DD-DIAG-063 | Visualモードのときだけ表示 | スタイルバー（`#style-bar`）は、初期値で `.is-hidden`（`display: none`）とする。`syncStageModeUi(isVisual)` が、モードの切替ボタンの `is-active` と、スタイルバーの `.is-hidden` をまとめて切り替える。`setStageMode()` と、キーボードの `1`〜`4` で高速モードから Visualモードに切り替える `selectInfographicStyle()` から呼ぶ |

- **背景（DD-DIAG-063）**: スタイルは Visualモードの配色・装飾にしか効かない。以前は高速モードでも表示し、押すと Visualモードへ切り替えていたため、モードを変えるつもりのない操作で画面が変わった（要求仕様書 `FR-003`）。表示の切り替えは、Tailwind の `flex` より詳細度の高い `.style-bar.is-hidden` で行う（`tailwind.css` は事前生成のため、新しいユーティリティを増やさない）。
