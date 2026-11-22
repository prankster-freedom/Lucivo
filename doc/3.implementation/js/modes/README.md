---
title: Lucivo 発表モードの実装ドキュメント 目次
description: 発表モードごとの実装ドキュメントの一覧。
tags: ["Lucivo", "実装", "発表モード"]
---

# 発表モードの実装ドキュメント 目次

モードの一覧は登録表（`src/ts/modes/modes.json`）で、本書の表は登録表と同じ行にする（`npm run lint` で確かめる）。登録の仕組み（`LucivoModes`・host・メニュー）は、`src/ts/ui/present-modes.ts` と `doc/2.ARCHITECTURE.md` 4.16 にある。

| モード | ソース                                                       | 実装ドキュメント           | 概要 |
| :----- | :----------------------------------------------------------- | :------------------------- | :--- |
| ミュージアム・ウォーク（`museum-walk`） | [src/ts/modes/museum-walk/](../../../../src/ts/modes/museum-walk/) | [museum-walk.md](museum-walk.md) | 文書を回廊・広間・小部屋の空間に置き直し、歩いて読み進む |
