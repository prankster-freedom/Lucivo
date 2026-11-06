---
title: Lucivo テスト仕様 オフライン動作
description: NFR-008 に関わる、インターネットに接続しない状態のテストケース。
tags: ["Lucivo", "テスト仕様", "オフライン"]
---

# テスト仕様: オフライン動作（offline）

ブラウザをオフラインにして `index.html` を `file://` で開き、`notation_sample.md` を読み込んで確かめる。

| ID         | 観点               | 手順 | 期待結果 | 確認方法 | 対応 ID |
| :--------- | :----------------- | :--- | :------- | :------- | :------ |
| TC-OFF-001 | 外部への通信       | 文書の読み込みから図と数式の描画までの通信とエラーを記録する | 図と数式が描画される。`file:` 以外への通信とコンソールのエラーがない | 自動 | `NFR-008`, `DD-OFF-001` |
| TC-OFF-002 | フォント           | Inter、Plus Jakarta Sans、Noto Sans JP、JetBrains Mono、KaTeX のフォントを読み込む | すべて読み込める | 自動 | `NFR-008`, `DD-OFF-002` |
| TC-OFF-003 | HTML エクスポート  | `HTML` を押し、書き出された HTML を調べる | `./vendor/` への参照がなく、CDN の URL に置き換わっている | 自動 | `DD-OFF-003` |
