---
title: Lucivo 実装ドキュメント js/playable.js
description: プレイアブル・ダイアグラム（Web 版だけの発表の見せ方）の依存関係と注意点。
tags: ["Lucivo", "実装", "発表"]
---

# js/playable.js

ソース: [src/ts/modes/playable.ts](../../../src/ts/modes/playable.ts)、[src/ts/modes/playable-graph.ts](../../../src/ts/modes/playable-graph.ts)、[src/css/modes.css](../../../src/css/modes.css)／生成物: `public/js/playable.js`／設計: `DD-SHOW-120`〜`124`

発表のドロップダウンで「プレイアブル・ダイアグラム」を選んだときだけ読み込む部品（Web 版だけ）。`window.LucivoPlayable`（`enter`・`exit`・`choose`・`restart`・`startDiagram`・`info`）を公開する。

## 依存関係

```mermaid
flowchart TD
  graph["playable-graph.ts（Mermaid の原文を読む）"]
  play["playable.ts（画面・操作・図の光）"]
  graph --> play
  build["tools/build-app.cjs（STAGE_MODE_ENTRIES）"]
  play --> build
  out["public/js/playable.js（生成物）"]
  build --> out
  app["js/app.js（setupPresentModes()、getMermaidSource()）"]
  out --> app
  view["描画済みの図の枠（[data-stage-index]）"]
  play --> view
```

## 変更するときの注意

- **図の原文**: `app.ts` の `renderApp()` が、図の番号（`data-stage-index`）ごとに原文を `lastMermaidSources` に覚え、`window.getMermaidSource()` で渡す。図の番号の振り方（最上位の Mermaid のコードブロックの順）を変えたら、ここも合わせる。
- **読める書き方を足すとき**: `playable-graph.ts` の正規表現に足す。読めない行は飛ばす作りなので、足さなくても壊れず、動かせる範囲が狭いだけになる。
- **SVG の id**: ノードは `…-flowchart-<id>-<番号>`・`…-state-<id>-<番号>`、フローチャートの矢印は `data-id="L_<元>_<先>_<番号>"` で探す。Mermaid の版を上げたら、TC-SHOW-021 で灯ることを確かめる。
- **図を戻す**: 図の枠は、コメントの目印を置いてから移す。終える・図を切り替えるときに、必ず目印の場所へ戻す（TC-SHOW-023 で元の順を確かめる）。
- **見えない文字**: 正規表現の文字の範囲は `\u00C0` のようなエスケープで書く。編集ツールで書くと実際の文字に置き換わることがあるため、書いた後に確かめる。
