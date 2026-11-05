---
title: Lucivo ラフ案台帳
description: Lucivo の Visualモードのラフ案（採用・ストック・ボツ）の台帳。
tags: ["Lucivo", "DTP", "ラフ"]
---

# ラフ案台帳

ラフの実体（ワイヤーフレーム）は、採用案を [adopted/](adopted/)、ストック・ボツ案を [stock/](stock/) に置く。

| ID        | ラフ案                                                               | 状態     | 実体                                                                                                  | 採否の理由・再利用の条件                                                                                                               |
| :-------- | :------------------------------------------------------------------- | :------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- |
| `RGH-001` | リード型（左の 4 色の縦線＋大きめの本文）                            | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-001-リード型)                           | `DTP-VTPL-020`。短い導入文を章の主役にできる。縦線だけの装飾で、どのスタイルにもなじむ                                                 |
| `RGH-002` | 要点カード型（項目の数で列を決めるカード＋番号＋上端の帯）           | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-002-要点カード型)                       | `DTP-VTPL-030`。並列の項目を一目で数えられる。項目の数で列を決め、端数の行を作らない                                                   |
| `RGH-003` | 手順型（番号の丸と接続線。4 個以下は横、5 個以上は縦）               | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-003-手順型)                             | `DTP-VTPL-040`。順序を線でつなぎ、箇条書きとの違いを見せる                                                                             |
| `RGH-004` | ステートメント型（大きな引用符＋中央揃え）                           | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-004-ステートメント型)                   | `DTP-VTPL-050`。理念・標語を講演のスライドのように見せる                                                                               |
| `RGH-005` | 解説＋図版型（本文 5 : 図版 7 の 2 段組み）                          | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-005-解説図版型)                         | `DTP-VTPL-060`（`FR-015` で実装済み）。雛形の 1 つとして登録                                                                           |
| `RGH-006` | ベクター装飾素材の組み込み（プリズム・カード透かし・方向矢印・彫刻引用符） | 採用 | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-006-ベクター装飾素材の組み込み)       | `DTP-001`, `DTP-VTPL-020`〜`050`。CSS の直線と文字だけでは出せない「トップデザイナーが仕立てた細部の質感」を `AST-005`〜`008` で付与する |
| `RGH-007` | 要点カード・手順ステップのインタラクティブ・スポットライト           | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-007-要点カード手順ステップのインタラクティブスポットライト) | `DTP-VTPL-090`。講演や展示で話している項目・手順をクリック 1 つで浮き上がらせ、静的な紙面にはないライブステージの視線誘導を実現する |
| `RGH-008` | STAGE バッジによるスラブ注目モード（ステージフォーカス）             | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-008-stage-バッジによるスラブ注目モード) | `DTP-VTPL-090`。`STAGE nn` バッジをクリックするとその章にスポットが当たり、前後の章が減光して聴衆の注目を 1 章に集められる             |
| `RGH-009` | ルミナス・フロー（手順トラックとダイアグラム結線上を光が流れる演出） | ボツ     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-009-ルミナスフロー手順トラックとダイアグラム結線上を光が流れる演出) | 短い破線が動くだけで光として読めず、図の意味も伝えなかったため、`RGH-010` に置き換えた |
| `RGH-010` | シグナル・ライト（図の構造に沿って伝わる光）                         | 採用     | [adopted/stage-show.md](adopted/stage-show.md#rgh-010-シグナルライト図の構造に沿って伝わる光)         | `DTP-LIGHT-010`〜`040`。光を線の飾りから、図の意味を運ぶ信号にする |
| `RGH-011` | 手順の彗星と到達の反応                                               | 採用     | [adopted/stage-show.md](adopted/stage-show.md#rgh-011-手順の彗星と到達の反応)                         | `DTP-LIGHT-050`。図と同じ光の言語を手順にも使う |
| `RGH-012` | ステージ発表（1 章 1 シーンの全画面）                                | 採用     | [adopted/stage-show.md](adopted/stage-show.md#rgh-012-ステージ発表1-章-1-シーンの全画面)              | `DTP-SHOW-010`〜`060`。 |
| `RGH-101` | データ表型（表を全幅の主役にし、先頭列と数値列を強調）               | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-101-データ表型)                             | 表は列数・セルの文字量の幅が大きく、崩れない汎用の強調の規則を決めきれないため保留。表だけの章の見せ方に要望が出たら再検討する         |
| `RGH-102` | コード主役型（暗色の全幅パネル＋言語ラベル）                         | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-102-コード主役型)                           | 発表用の表示でコードを見せる場面が具体化したら再検討する                                                                  |
| `RGH-103` | 図版主役型（図だけの章を余白の大きな額装にし、キャプションを付ける） | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-103-図版主役型)                             | 図のカードは既に展示用の装飾を持ち、額装を重ねると装飾過多になるため保留。キャプションの記法の要望が出たら再検討する                   |
| `RGH-104` | 数値強調型（KPI の数値を大きく並べる）                               | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-104-数値強調型)                             | 「数値の項目」を Markdown から誤りなく判定する規則がないため保留。要点カード型の派生として再検討する                                   |
| `RGH-105` | 展示ブース向け自動ステップ送り（オートプレイ・ループ）               | 採用     | [stock/visual-templates.md](stock/visual-templates.md#rgh-105-展示ブース向け自動ステップ送り)         | ステージ発表（`RGH-012`）の自動進行（`A` キー）として統合した |
| `RGH-106` | 発表者用の手元画面                                                   | ストック | [stock/stage-show.md](stock/stage-show.md#rgh-106-発表者用の手元画面)                                 | 2 つ目のウィンドウとの同期が必要で MVP の範囲を超えるため保留。発表の利用が定着し、要望が出たら再検討する |
| `RGH-901` | 独自の記法で雛形を指定する（`<!-- lucivo: layout=cards -->`）        | ボツ     | [stock/visual-templates.md](stock/visual-templates.md#rgh-901-独自の記法で雛形を指定する)             | 文書が Lucivo 専用になり、Markdown の可搬性を損なう（`FR-015` と同じ方針）。自動判定で意図どおりにならない例が多く出た場合に再検討する |
| `RGH-902` | 要点カード型を 3 列固定・最小幅の自動段数にする                      | ボツ     | [stock/visual-templates.md](stock/visual-templates.md#rgh-902-要点カード型を-3-列固定最小幅の自動段数にする) | 3 列固定は、項目が 4 個のとき最後の行に 1 枚だけ残る。項目の数で列を決める方式（`RGH-002`）を採用                               |
| `RGH-903` | 常時ループする背景パーティクル・光彩アニメーション                   | ボツ     | [stock/visual-templates.md](stock/visual-templates.md#rgh-903-常時ループする背景パーティクル光彩アニメーション) | 何も操作していない間も背景が動き続けると、本文や図の読解を妨げ、常時 GPU 負荷が発生して軽快さ（`NFR-006` / `NFR-007`）を損なうためボツ |
| `RGH-904` | SVG のフィルターで線をぼかして光らせる                               | ボツ     | [stock/stage-show.md](stock/stage-show.md#rgh-904-svg-のフィルターで線をぼかして光らせる)             | 再描画が重くなる見込みで、尾を細くする表現もできないため |
| `RGH-905` | 光の到達で波紋の輪を広げ、ノードの前面を光らせる                     | ボツ     | [stock/stage-show.md](stock/stage-show.md#rgh-905-光の到達で波紋の輪を広げノードの前面を光らせる)     | 輪が UI のマーカーに見え、前面のにじみが文字の裏を濁らせたため |
| `RGH-906` | 光の芯を線分をつないで描く                                           | ボツ     | [stock/stage-show.md](stock/stage-show.md#rgh-906-光の芯を線分をつないで描く)                         | 継ぎ目がはしご状・数珠状に見えたため |
