---
title: Lucivo 発表モードの詳細設計 目次
description: 発表モードごとの詳細設計の一覧。
tags: ["Lucivo", "詳細設計", "発表モード"]
---

# 発表モードの詳細設計 目次

モードの一覧は登録表（`src/ts/modes/modes.json`）で、本書の表は登録表と同じ行にする（`npm run lint` で確かめる）。登録と host の設計は `doc/2.ARCHITECTURE.md` 4.16 にある。

| モード                                   | 略号   | 詳細設計                   | 対応する要求                                                         |
| :--------------------------------------- | :----- | :------------------------- | :------------------------------------------------------------------- |
| ミュージアム・ウォーク（`museum-walk`）  | `MWLK` | [museum-walk.md](museum-walk.md) | [museum-walk.md](../../../1.SRS/features/modes/museum-walk.md)（`FR-056`） |

- ミュージアム・ウォークは、デザイン仕様（`DTP-MWLK-<nnn>`）と同じ略号で `DD-MWLK-<nnn>` とする。
