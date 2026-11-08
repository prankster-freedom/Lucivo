---
title: Lucivo 実装ドキュメント tests/e2e.cjs
description: tests/e2e.cjs の依存関係と、コードからは読み取りにくい実装上の注意点。
tags: ["Lucivo", "実装", "テスト", "Playwright"]
---

# tests/e2e.cjs

ソース: [tests/e2e.cjs](../../../tests/e2e.cjs)／TC との対応: [doc/4.test_spec/](../../4.test_spec/README.md)（コード中のコメントに TC の ID を書いている）

リポジトリの `package.json` が `"type": "module"` のため、CommonJS の拡張子 `.cjs` にしている。

## 依存関係

```mermaid
flowchart TD
  subgraph Dependencies
    pw["playwright（リポジトリ直下の node_modules、Chromium）"]
    app["index.html / js/app.js（file:// で開く）"]
    sample["samples/notation_sample.md"]
  end
  e2e["tests/e2e.cjs"]
  pw --> e2e
  app --> e2e
  sample --> e2e
  subgraph Consumers
    out["work/test/results.json, work/test/shots/"]
  end
  e2e --> out
```

## 変更するときの注意

- **`samples/notation_sample.md` への依存**: 図の並び（1 つ目がフローチャート）、数式・フロントマター・大きな図の内容や個数を前提にした判定がある。`samples/notation_sample.md` を変えたら、テストの判定とテスト仕様も見直す。
- **ページ内で実行する関数**: `inspect*` の関数は `page.evaluate` でページ内で実行する。Node.js の変数は参照できないため、必要な値は引数で渡す。
- **アプリのグローバルへの依存**: `state`、`renderApp`、`lastLoadedMarkdown`、`#telemetry-status` の文言、`LucivoStage` を直接参照している（[js/app.js.md](../js/app.js.md)、[js/stage.js.md](../js/stage.js.md)）。
- **`samples/visual-sample.md` への依存**: `TC-LIGHT-*`、`TC-SHOW-*` は、章の番号と図の並び（9 章のフローチャートが 1 つ目、シーケンス図が 4 つ目）を前提にしている。
- **光の確認**: 時刻で変わる光は `LucivoStage.seekLights()` で止めてから調べる。止めずに撮影すると、画像が実行のたびに変わる。
- **出力の上書き**: 実行すると `work/test/` を上書きする。前回の出力を残す場合は、実行前に別のフォルダへ移す（test スキル）。
- **部分実行と結果の差分更新**: 引数にテスト関数名または TC ID（例: `node tests/e2e.cjs TC-SHOW-011`、`node tests/e2e.cjs testCoverAndTables`）を渡すと、該当するテスト関数だけを実行し、既存の `work/test/results.json` の該当 TC 分だけを上書き更新する。各スイートには、止まったスイートを打ち切るためのタイムアウト（既定 90 秒）を設けている。所要時間が既定に近いスイートは、`SUITES` の `timeoutMs` で個別に延ばす（`testDiagramRendering` は 10 モード × 全図のスクリーンショットでローカルで約 90 秒かかるため 240 秒）。スイートを増やす・重くするときは、所要時間を測り、既定の半分を超えるなら `timeoutMs` を設定する。1 つのスイートが例外・タイムアウトで止まっても残りのスイートは実行し、`RUNTIME <スイート名>` を失敗として記録する。
