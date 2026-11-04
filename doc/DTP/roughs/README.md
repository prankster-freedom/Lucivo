---
title: Lucivo ラフ案台帳
description: Lucivo の Visualモードのラフ案（採用・ストック・ボツ）の台帳。
tags: ["Lucivo", "DTP", "ラフ"]
---

# ラフ案台帳

ラフの実体（ワイヤーフレーム）は、採用案を [adopted/](adopted/)、ストック・ボツ案を [stock/](stock/) に置く。

| ID        | ラフ案                                   | 状態     | 実体                                                         | 採否の理由・再利用の条件 |
| :-------- | :--------------------------------------- | :------- | :----------------------------------------------------------- | :----------------------- |
| `RGH-001` | リード型（左の 4 色の縦線＋大きめの本文） | 採用     | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-001-リード型) | `DTP-VTPL-020`。短い導入文を章の主役にできる。縦線だけの装飾で、どのスタイルにもなじむ |
| `RGH-002` | 要点カード型（項目の数で列を決めるカード＋番号＋上端の帯） | 採用 | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-002-要点カード型) | `DTP-VTPL-030`。並列の項目を一目で数えられる。項目の数で列を決め、端数の行を作らない |
| `RGH-003` | 手順型（番号の丸と接続線。4 個以下は横、5 個以上は縦） | 採用 | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-003-手順型) | `DTP-VTPL-040`。順序を線でつなぎ、箇条書きとの違いを見せる |
| `RGH-004` | ステートメント型（大きな引用符＋中央揃え） | 採用   | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-004-ステートメント型) | `DTP-VTPL-050`。理念・標語を講演のスライドのように見せる |
| `RGH-005` | 解説＋図版型（本文 5 : 図版 7 の 2 段組み） | 採用   | [adopted/visual-templates.md](adopted/visual-templates.md#rgh-005-解説図版型) | `DTP-VTPL-060`（`FR-015` で実装済み）。雛形の 1 つとして登録 |
| `RGH-101` | データ表型（表を全幅の主役にし、先頭列と数値列を強調） | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-101-データ表型) | 表は列数・セルの文字量の幅が大きく、崩れない汎用の強調の規則を決めきれないため保留。表だけの章の見せ方に要望が出たら再検討する |
| `RGH-102` | コード主役型（暗色の全幅パネル＋言語ラベル） | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-102-コード主役型) | 発表用の表示でコードを見せる場面が具体化したら再検討する |
| `RGH-103` | 図版主役型（図だけの章を余白の大きな額装にし、キャプションを付ける） | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-103-図版主役型) | 図のカードは既に展示用の装飾を持ち、額装を重ねると装飾過多になるため保留。キャプションの記法の要望が出たら再検討する |
| `RGH-104` | 数値強調型（KPI の数値を大きく並べる） | ストック | [stock/visual-templates.md](stock/visual-templates.md#rgh-104-数値強調型) | 「数値の項目」を Markdown から誤りなく判定する規則がないため保留。要点カード型の派生として再検討する |
| `RGH-901` | 独自の記法で雛形を指定する（`<!-- lucivo: layout=cards -->`） | ボツ | [stock/visual-templates.md](stock/visual-templates.md#rgh-901-独自の記法で雛形を指定する) | 文書が Lucivo 専用になり、Markdown の可搬性を損なう（`FR-015` と同じ方針）。自動判定で意図どおりにならない例が多く出た場合に、上書きの手段として再検討する |
| `RGH-902` | 要点カード型を 3 列固定・最小幅の自動段数にする | ボツ | [stock/visual-templates.md](stock/visual-templates.md#rgh-902-要点カード型を-3-列固定最小幅の自動段数にする) | 3 列固定は、項目が 4 個のとき最後の行に 1 枚だけ残り、`Split` 表示の狭いプレビューでカードが細くなりすぎる。最小幅（13.5rem）の自動段数も、試作で 3 個が 2 列＋1 枚になった。項目の数で列を決める方式（`RGH-002`）を採用 |
