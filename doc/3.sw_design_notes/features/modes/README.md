---
title: Lucivo 発表モードの詳細設計 目次
description: 発表モードごとの詳細設計の一覧。
tags: ["Lucivo", "詳細設計", "発表モード"]
---

# 発表モードの詳細設計 目次

モードの一覧は登録表（`src/ts/modes/modes.json`）で、本書の表は登録表と同じ行にする（`npm run lint` で確かめる）。登録と host の設計は `doc/2.ARCHITECTURE.md` 4.16 にある。

| モード                           | 略号   | 詳細設計                   | 対応する要求                                                         |
| :------------------------------- | :----- | :------------------------- | :------------------------------------------------------------------- |
| ズーミング・マップ（`zoom-map`） | `SHOW` | [zoom-map.md](zoom-map.md) | [zoom-map.md](../../../1.SRS/features/modes/zoom-map.md)（`FR-054`） |
| プレイアブル・ダイアグラム（`playable`） | `SHOW` | [playable.md](playable.md) | [playable.md](../../../1.SRS/features/modes/playable.md)（`FR-055`） |

- 設計 ID は `DD-SHOW-<nnn>` を引き継ぐ（ズーミング・マップは 110〜114、プレイアブル・ダイアグラムは 120〜124）。
