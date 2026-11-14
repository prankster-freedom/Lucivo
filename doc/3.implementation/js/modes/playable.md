---
title: Lucivo 実装ドキュメント js/modes/playable
description: 発表モード「プレイアブル・ダイアグラム」の依存関係と注意点。
tags: ["Lucivo", "実装", "発表モード", "playable"]
---

# js/modes/playable

ソース: [src/ts/modes/playable/](../../../../src/ts/modes/playable/)（`index.ts`・`playable-graph.ts`・`style.css`）／生成物: `public/js/modes/playable.js`・`public/css/modes/playable.css`（コミットしない）／設計: `DD-SHOW-120`〜`124`／目次: [README.md](README.md)

発表のドロップダウンで「プレイアブル・ダイアグラム」を選んだときだけ読み込む部品（登録表の `stage: "web"`）。読み込まれたときに `LucivoModes.register('playable', { enter, exit, info, choose, restart, startDiagram })` で自分を登録する。`choose`・`restart`・`startDiagram` はテストが使う。

## 依存関係

```mermaid
flowchart TD
  reg["src/ts/modes/modes.json（登録表）"]
  graph["playable/playable-graph.ts（Mermaid の原文を読む）"]
  play["playable/index.ts・style.css（画面・操作・図の光）"]
  graph --> play
  build["tools/build-app.cjs（登録表を配布先で絞ってビルド）"]
  reg --> build
  play --> build
  out["public/js/modes/playable.js・public/css/modes/playable.css（生成物）"]
  build --> out
  menu["js/app.js（src/ts/ui/present-modes.ts が、項目の生成・読み込み・host を受け持つ）"]
  out --> menu
  subgraph Uses
    view["描画済みの図の枠（[data-stage-index]）"]
    host["host（previewRoot・getMermaidSource・toast）"]
  end
  play --> view
  play --> host
```

## 変更するときの注意

- **図の原文**: 本体の `renderApp()` が、図の番号（`data-stage-index`）ごとに原文を `lastMermaidSources` に覚え、`host.getMermaidSource()` で渡す。図の番号の振り方（最上位の Mermaid のコードブロックの順）を変えたら、ここも合わせる。
- **本体に触れない**: 本体の中身（`window.state` など）を使わず、`enter(host)` で受け取る host だけを使う（`ARC-MODE-006`）。表示は切り替えないため、`host.restoreView()` は呼ばない。
- **読める書き方を足すとき**: `playable/playable-graph.ts` の正規表現に足す。読めない行は飛ばす作りなので、足さなくても壊れず、動かせる範囲が狭いだけになる。
- **SVG の id**: ノードは `…-flowchart-<id>-<番号>`・`…-state-<id>-<番号>`、フローチャートの矢印は `data-id="L_<元>_<先>_<番号>"` で探す。Mermaid の版を上げたら、TC-SHOW-021 で灯ることを確かめる。
- **図を戻す**: 図の枠は、コメントの目印を置いてから移す。終える・図を切り替えるときに、必ず目印の場所へ戻す（TC-SHOW-023 で元の順を確かめる）。
- **見えない文字**: 正規表現の文字の範囲は `À` のようなエスケープで書く。編集ツールで書くと実際の文字に置き換わることがあるため、書いた後に確かめる。
