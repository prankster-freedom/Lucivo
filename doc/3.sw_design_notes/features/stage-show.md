---
title: Lucivo 詳細設計書 Visualモードの舞台演出
description: シグナル・ライト（FR-018）とステージ発表（FR-019）の詳細設計。
tags: ["Lucivo", "詳細設計", "Visualモード", "アニメーション"]
---

# Visualモードの舞台演出（stage-show）

対応する要求: `FR-018`, `FR-019`, `FR-022`, `FR-023`（[1.SRS/features/stage-show.md](../../1.SRS/features/stage-show.md)）／アーキテクチャ: [2.ARCHITECTURE.md](../../2.ARCHITECTURE.md) 4.11／デザイン仕様: [0.DTP/features/stage-show.md](../../0.DTP/features/stage-show.md)

## 1. 読み込みと取り付け（js/app.js, js/stage.js）

| ID           | 項目          | 設計                                                                                                                               | 対応する要求・デザイン |
| :----------- | :------------ | :--------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-LIGHT-001 | 遅延読み込み  | `js/stage.js` は `LIBRARIES.stage` として、Visualモードの描画で初めて `loadLibrary('stage')` を呼んだときに読み込む                | `FR-018`, `NFR-006`    |
| DD-LIGHT-002 | 取り付け      | `mountStage(container)` が `LucivoStage.mount()` を呼ぶ。`renderApp()` の最後、`processDirtyBlocks()` の図の差し替えの後、拡大モーダルを開いた後に呼ぶ。`renderApp()` は DOM を作り直す前に `LucivoStage.resetLights()` を呼ぶ | `FR-018` |
| DD-LIGHT-003 | 2 枚の Canvas | 図ごとに、図の親（表示枠）へ `canvas.signal-light-canvas` を 2 枚（`.is-back`, `.is-front`）足す。`z-index` で SVG を挟む          | `DTP-LIGHT-030`        |
| DD-LIGHT-004 | 動作の範囲    | `IntersectionObserver` で表示枠が画面に入った図だけを動かす。1 本の `requestAnimationFrame` のループで、動いている図をまとめて描く | `DTP-LIGHT-060`        |

- **背景（DD-LIGHT-001）**: 高速モードの起動に読み込むものを増やさない（`NFR-006`）。
- **背景（DD-LIGHT-003）**: 光を SVG の中に足すと、描画結果のキャッシュと PNG / SVG の書き出しに混ざる（以前は CSS のない線が黒い塗りで書き出された）。SVG の外の Canvas に描くことで、キャッシュと書き出しに手を加えずに済む。Canvas の再描画は図の SVG の再描画を起こさないため、影のフィルターを持つ図でも軽い。

## 2. 光の計画（js/stage.js）

| ID           | 項目             | 設計                                                                                                       | 対応する要求・デザイン |
| :----------- | :--------------- | :--------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-LIGHT-010 | 計画の作成       | `buildPlan()` は図が初めて画面に入ったときに 1 回だけ、線の座標列・出発の時刻・ノードの反応の時刻を求める  | `FR-018`, `NFR-007`    |
| DD-LIGHT-011 | 線の座標         | `getPointAtLength()` で 3 単位ごとに取り、`getScreenCTM()` から求めた変換で図の座標系（viewBox）へそろえる | `DTP-LIGHT-010`        |
| DD-LIGHT-012 | 線とノードの対応 | 線の始点・終点から 16 単位以内で最も近いノードの矩形を、その線の接続先とする                               | `DTP-LIGHT-040`        |
| DD-LIGHT-013 | 伝わる順序       | `scheduleGraph()` は、根のノードの時刻を 0 として、届く時刻の早い順に線を処理する（最短到達時間）。根のない閉路は、残った線の先頭を起点にする | `DTP-LIGHT-040` |
| DD-LIGHT-014 | 時間の上限       | 光が走る時間が `LIGHT.maxSpan`（13 秒）を超えるときは、全部の線の時刻と速さを同じ割合で変える              | `DTP-LIGHT-040`        |

- **背景（DD-LIGHT-012）**: Mermaid の線の `id` やクラスからノードを引く方法は、図の種類で形式が異なり（状態遷移図の線には接続先の情報がない）、`scopeSvgIds()` の影響も受ける。座標の照合なら 1 つの処理で全図種に効く。
- **背景（DD-LIGHT-010）**: 計画は描画のたびではなく画面に入ったときに作るため、キャッシュからの再描画を遅くしない（`TC-PERF-002`）。

## 3. 光の描画（js/stage.js, css/style.css）

| ID           | 項目     | 設計                                                                                                                                                     | 対応する要求・デザイン |
| :----------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-LIGHT-020 | 粒の画像 | 色ごとに放射グラデーションの画像を 1 回だけ作り（`glowSprite()`）、`drawImage()` で大きさと不透明度を変えて重ねる                                        | `DTP-LIGHT-010`        |
| DD-LIGHT-021 | 座標の変換 | `layoutFlow()` が `getScreenCTM()` から Canvas の変換行列を求める。描画は図の座標系のまま行う。図と表示枠の大きさの変化を `ResizeObserver` で受けて求め直す | `FR-018`          |
| DD-LIGHT-022 | 解像度   | `devicePixelRatio`（上限 2）を使う。1 枚の画素数が 800 万を超える場合は倍率を下げる                                                                      | `NFR-007`              |
| DD-LIGHT-023 | 余韻の間 | 光も反応もない時刻は、一度消したら描かない（`flow.blank`）                                                                                               | `DTP-LIGHT-060`        |
| DD-LIGHT-030 | 手順の光 | `.vs-steps::after` を接続線と同じ幅の箱とし、箱の右端（縦は下端）に彗星を描いて、箱を `transform` だけで動かす。周期 `--vs-cycle` は `(n - 1) × --vs-leg ÷ 0.7` | `DTP-LIGHT-050` |
| DD-LIGHT-031 | 丸の反応 | `li::after` の輪とシェブロンのアニメーションを、`--vs-i`（項目の番号。`applySlabTemplate()` が付ける）と `--vs-leg` から求めた遅延で、光の到達に合わせる | `DTP-LIGHT-050`        |

- **背景（DD-LIGHT-021）**: 図の大きさが同じでも、`Split` と `Canvas` の切り替えなどで表示枠の幅が変わると図の位置が動く。図だけを監視すると光が線から外れた（`TC-LIGHT-004`）ため、表示枠も監視する。
- **背景（DD-LIGHT-030）**: 位置（`left`）を動かすと毎フレーム配置の計算が起きる。`transform` の割合は箱自身の幅が基準になるため、線と同じ幅の箱を動かせば、線の長さを JS で測らずに始点から終点まで動かせる。

## 4. ステージ発表（js/stage.js, css/style.css）

| ID          | 項目           | 設計                                                                                                                                                                 | 対応する要求・デザイン |
| :---------- | :------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------- |
| DD-SHOW-001 | 開始           | `enterShow()` は、ビューモードを `Canvas`、外観を Dark に切り替えてから（既存のボタンを押す）、`html.is-stage-show` を付け、全画面を要求する。全画面が拒否されても、画面いっぱいの表示で続ける | `FR-019`, `DTP-SHOW-010` |
| DD-SHOW-002 | シーン         | `.exhibition-wrap` 直下のヒーローとスラブをシーンとする。表示中のシーンに `.is-scene` を付け、それ以外は CSS で隠す。新しい DOM は作らず、描画済みの図をそのまま使う | `FR-019`               |
| DD-SHOW-003 | 拡大           | `html.is-stage-show` の `font-size` を画面の幅に比例させる。誌面の寸法は `rem` のため、全体が拡大する                                                                | `DTP-SHOW-020`         |
| DD-SHOW-004 | 図の大きさ     | `fitSceneDiagrams()` が残りの幅と高さ（本文の下に図がある章は画面の高さの 60% を確保）から倍率を求め、`--scene-width` に渡す。`applyReadableFit()` の最小の幅を下回らない | `DTP-SHOW-030`, `NFR-005` |
| DD-SHOW-010 | 送りの順序     | `next()` は、未表示の項目 → 画面に収まらない章のスクロール → 次のシーンの順に進める。`prev()` は逆順。前のシーンへ戻るときは全項目を表示した状態にする               | `DTP-SHOW-050`         |
| DD-SHOW-011 | 自動進行       | `scheduleAuto()` が次の送りを `setTimeout` で予約する。図のあるシーンは光の一巡（`plan.cycle`）を待つ                                                                | `FR-019`               |
| DD-SHOW-020 | 再描画の扱い   | `LucivoStage.mount()` は発表中なら `refreshScenes()` を呼び、作り直された DOM からシーンを取り直して、番号を保つ                                                     | `FR-019`               |
| DD-SHOW-021 | 終了           | `exitShow()` はクラスと `--scene-width` を消し、開始時の外観・ビューモードへ戻して、最後の章を `scrollIntoView` する。`Esc` で全画面が先に解除された場合は `fullscreenchange` から呼ぶ | `FR-019` |
| DD-SHOW-030 | 操作の受け取り | 発表中はキー操作を捕捉フェーズで受け、クリックは捕捉フェーズで次へ送る。リンクとボタンのクリックは除く                                                               | `FR-019`               |

| DD-SHOW-040 | 俯瞰の開閉       | `openOverview()` は自動進行とポインターを止め、光を止め（`suspendLights(true)`）、`layoutOverview()` で並べ方を決めてから `html.is-stage-overview` を付け、開く前のシーンを選ぶ。`closeOverview(index, build)` はクラスとアニメーションを消し、シーンと項目の表示数を決めて `applyScene()` を呼び、光を再開する。別のシーンへ入るときは `applyScene(true)` で通常の転換を見せる | `FR-022`, `DTP-SHOW-070` |
| DD-SHOW-041 | 俯瞰の並べ方     | `layoutOverview()` は、列の数 1〜6（`OVERVIEW.maxCols`）ごとに画面の幅の 88% と高さの 78% に収まる縮小率を求め、最も大きくなる列の数と、その縮小率（下限 0.12）を、`.exhibition-wrap` の `--ov-cols`・`--ov-s`・`--ov-gap` に書く。CSS は各シーンを `100vw × 100vh` で組み、`transform: scale(var(--ov-s))`（原点は左上）で縮小し、右と下の負のマージン（`100vw × (s − 1)`）で縮小後の大きさだけを升目に取らせる。発表と同じ余白（`6vh` / `max(6vw, (100vw − 76rem) / 2)` / `9vh`）で組み、中身を上下の中央に置く | `FR-022`, `DTP-SHOW-070` |
| DD-SHOW-042 | 俯瞰の転換       | `zoomTile(tile, toTile)` は、縮小図の矩形 `rect` から、全画面の位置 `translate(−rect.left, −rect.top) scale(1)` と縮小図の位置 `scale(s)` の間を、`Element.animate()` で 0.42 秒補間する。開くときは全画面 → 縮小図、入るときは縮小図 → 全画面（`fill: 'forwards'` で保ち、`closeOverview()` で取り消す）。`prefers-reduced-motion: reduce` では動かさない | `FR-022`, `DTP-SHOW-070` |
| DD-SHOW-043 | 俯瞰の操作       | `onShowKey()` は俯瞰の間、`onOverviewKey()` に渡す（矢印・`Home` / `End` で `selectTile()`、`Enter` / `Space` で選んだシーン、`O` / `Esc` で開く前のシーンへ `openFromOverview()`、`T` は明暗）。クリックは捕捉フェーズで受け、押したシーンへ入る。転換の途中の操作は `ov.busy` で受け付けない | `FR-022` |
| DD-SHOW-044 | 光の停止と再開   | `lightsSuspended` が真の間、`startFlow()` は何もしない。再開時は、俯瞰の間も画面に入っていた図に交差の通知が来ないため、今のシーンの図の `startFlow()` を直接呼ぶ | `FR-022`, `DTP-LIGHT-060` |
| DD-SHOW-045 | 再描画と終了     | 俯瞰の間に図が描き直されたら（明暗の切替）、`refreshScenes()` が並べ方と選択を付け直す。`exitShow()` は俯瞰のクラス・CSS 変数・アニメーションと、ポインターを消す | `FR-022`, `FR-023` |
| DD-SHOW-050 | 光のポインター   | HUD に `.stage-pointer`（`.stage-pointer-dot` を含む）を置く。`pointermove` で位置を覚え、ポインターの表示中だけ `requestAnimationFrame` で `paintPointer()` を 1 回予約する。`paintPointer()` は `--px`・`--py`（スポットライトの放射グラデーションの中心）と粒の `translate3d()` を書き換えるだけで、要素の大きさ・位置を読まない。表示は `html.is-stage-pointer` で切り替える | `FR-023`, `DTP-SHOW-080` |

- **背景（DD-SHOW-002）**: シーンのために図を描き直すと、ページ送りが待たされる（`NFR-007`）。既存の DOM の表示を切り替えるだけなら即座に反応する。
- **背景（DD-SHOW-003）**: 図以外の全要素を個別に拡大する規則を持たずに済む。`transform: scale` は文字がにじみ、図の座標の計算も複雑になるため採らなかった。
- **背景（DD-SHOW-030）**: 発表中のクリックは、要点カードのスポットライト（`DD-VTPL-015`）より先に受ける。発表者が画面のどこを押しても次へ進むことを優先する。
- **背景（DD-SHOW-041）**: 縮小には `zoom` でなく `transform: scale()` を使う。`transform` は合成だけで動かせるため、転換のアニメーションをレイアウトなしで描ける。`DD-SHOW-003` で `transform: scale` を採らなかったのは、拡大すると文字がにじむためで、縮小図ではこの問題がない（動きが止まると、縮小後の大きさで描き直される）。
- **背景（DD-SHOW-044）**: 俯瞰ではすべての図が画面に入るため、光をそのままにすると、図の数だけ毎フレームの描画が増える。縮小図の光は小さく、見えても意味が伝わらない。
- **背景（DD-SHOW-050）**: 位置の反映は `mousemove` ごとではなく 1 フレームに 1 回にまとめる。高頻度のマウスでも描画は画面の更新の回数を超えない。
