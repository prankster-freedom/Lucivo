---
title: Lucivo 発表モードの実装ドキュメント 目次
description: 発表モードごとの実装ドキュメントの一覧。
tags: ["Lucivo", "実装", "発表モード"]
---

# 発表モードの実装ドキュメント 目次

モードの一覧は登録表（`src/ts/modes/modes.json`）で、本書の表は登録表と同じ行にする（`npm run lint` で確かめる）。登録の仕組み（`LucivoModes`・host・メニュー）は、`src/ts/ui/present-modes.ts` と `doc/2.ARCHITECTURE.md` 4.16 にある。

| モード | ソース                                                       | 実装ドキュメント           | 概要 |
| :----- | :----------------------------------------------------------- | :------------------------- | :--- |
| ズーミング・マップ（`zoom-map`） | [src/ts/modes/zoom-map/](../../../../src/ts/modes/zoom-map/) | [zoom-map.md](zoom-map.md) | 文書を 1 枚の地図にして、カメラが章から章へ飛ぶ |
| プレイアブル・ダイアグラム（`playable`） | [src/ts/modes/playable/](../../../../src/ts/modes/playable/) | [playable.md](playable.md) | 状態遷移図・フローチャートを触って動かす |
