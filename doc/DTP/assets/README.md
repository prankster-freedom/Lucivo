---
title: Lucivo 素材台帳
description: Lucivo の製品で使う素材（フォント・画像・アイコン）の台帳。
tags: ["Lucivo", "DTP", "素材"]
---

# 素材台帳

| ID        | 素材              | 種類   | 状態   | 配置                                 | 用途                                 | 仕様・権利情報 |
| :-------- | :---------------- | :----- | :----- | :----------------------------------- | :----------------------------------- | :------------- |
| `AST-001` | Inter             | フォント | 使用中 | Google Fonts から読み込む（同梱しない） | 本文・リード・カードの題（`DTP-004`） | 400〜700。SIL Open Font License 1.1 |
| `AST-002` | Plus Jakarta Sans | フォント | 使用中 | Google Fonts から読み込む（同梱しない） | 見出し・ステートメント・番号（`DTP-004`） | 600〜800。SIL Open Font License 1.1 |
| `AST-003` | Noto Sans JP      | フォント | 使用中 | Google Fonts から読み込む（同梱しない） | 和文（`DTP-004`）                    | 400〜700。SIL Open Font License 1.1 |
| `AST-004` | JetBrains Mono    | フォント | 使用中 | Google Fonts から読み込む（同梱しない） | コード・表の見出し・フロントマター    | 400〜700。SIL Open Font License 1.1 |

- 読み込みは `index.html` の Google Fonts の `<link>`。ウェイトを追加するときは、その `<link>` の指定も変える。
- 画像・アイコンの素材は使っていない。雛形の装飾（縦線、帯、番号の丸、引用符、接続線）はすべて CSS で描画する（`DTP-VTPL-020`〜`050`）。そのため、本番素材の置き場所（`<プロジェクト>/assets/`）と、`sources/`・`stock/` は作っていない。素材を追加するときに作る。
