---
title: Lucivo 詳細設計 発表モード zoom-map
description: 発表モード「ズーミング・マップ」（FR-054）の詳細設計。
tags: ["Lucivo", "詳細設計", "発表モード", "zoom-map"]
---

# 詳細設計: ズーミング・マップ（`zoom-map`）

要求: [zoom-map.md](../../../1.SRS/features/modes/zoom-map.md)（`FR-054`、#61）／ソース: `src/ts/modes/zoom-map/`（`index.ts`・`style.css`）／目次: [README.md](README.md)

発表モードの登録・host の設計は `doc/2.ARCHITECTURE.md` 4.16（`ARC-MODE-001`〜`010`）による。この設計は、モード固有の部分だけを書く。

| ID          | 項目           | 設計 |
| :---------- | :------------- | :--- |
| DD-SHOW-110 | 部品と入口     | 登録表（`src/ts/modes/modes.json`）の行（`stage: "web"`）から、`src/ts/modes/zoom-map/index.ts` を `js/modes/zoom-map.js`、`style.css` を `css/modes/zoom-map.css` にビルドする。発表のドロップダウンの項目（`#menu-present-zoom-map`）は、本体が登録表から作り、選んだときに JS と CSS を読み込んで `LucivoModes.get('zoom-map').enter(host)` を呼ぶ（`ARC-MODE-002`・`005`・`006`）。モードは本体のモジュールを `import` せず、`host` だけを使う |
| DD-SHOW-111 | 地図の配置     | Visualモードの `.exhibition-wrap` の子（表紙と章）を複製せず、`position: absolute` で平面に並べ直す。章の幅は 1200px、列は `min(4, ceil(sqrt(章の数 × 1.2)))`。奇数の行は右から左へ進む（道が折り返す）。行の中では章を縦の中央にそろえる。章の中心を結ぶ点線（`.zoom-map-path` の `polyline`）を道として描く |
| DD-SHOW-112 | 止まる場所     | 全体の地図 → 章ごとに（章 → 小見出しの区間 → …）→ 全体の地図。小見出し（h3）の区間は、小見出しから次の小見出しの手前まで。区間や章を映したときの拡大率が 0.62 より小さいときは、上から 16:9 の区切りで順に止まる |
| DD-SHOW-113 | カメラ         | `.exhibition-wrap` に `translate() scale()` をかける。見える範囲（中心と幅）を、van Wijk と Nuij の滑らかなズーム（`rho = √2`）で補間し、3 次の ease-in-out で時間を進める。長さは 1.0〜1.4 秒。動いている間だけ `#visual-stage-container.is-flying` で `will-change: transform` を付け、止まったら外す（拡大した文字をぼかさずに描き直させる）。下の操作の帯（76px）を除いた範囲に、余白 6% で映す。動きを減らす設定のときは、すぐに映す |
| DD-SHOW-114 | 始める・終える | 始めるときは `host.showVisualCanvas()` で、描画モード・表示の切り替え・スクロールの位置・光の有無を覚えて Visualモード・`Canvas` に切り替え、全画面にする。章がない・文書が空のときは、`host.restoreView()` で戻して `host.toast()` で知らせる。地図の上では `host.setLights(false)` で図の光を止め、光のキャンバスを隠す。終えるときは、付けたスタイル・道・下の帯を外し、`host.relayoutSlabs()` で章の組版を戻し、`host.restoreView()` で覚えた表示（光の有無・スクロールの位置を含む）に戻す。窓の大きさが変わったら、並べ直して今の場所を映し直す |

- **背景（DD-SHOW-111）**: `.exhibition-wrap` は container queries の基準（`container-type: inline-size`）のため、幅は章の幅（1200px）のままにし、章はその外へはみ出す位置に置く。平面の全体の幅を付けると、章の中の組版が広い画面向けに切り替わる。平面の大きさは、モジュールの中で別に持つ。
- **背景（DD-SHOW-111）**: 章を複製しないのは、図の SVG の id が重複し、矢じりやグラデーションの参照が崩れるため。発表（ステージ発表・俯瞰）も同じく、章をそのまま使っている。
- **背景（DD-SHOW-113）**: いったん引いてから寄る動きは、隣の章へ移るときにも、全体のどこからどこへ移ったかを伝える。止まっている間に `will-change` を残すと、拡大した文字が合成の層のまま拡大され、ぼける。
- **背景（DD-SHOW-114）**: 全体の地図では、すべての図が同時に画面に入る。光をすべて動かすと重いため、地図の上では光を止める。
- 採らなかった案: 画面の外の章を `content-visibility: auto` で描画しない案（Issue の「技術の当たり」）。並べるときに章の高さを測るため、描画を省くと高さが仮の値になる。光を止めれば、19 章のサンプルでも動きは滑らかだった。
