---
title: Lucivo テスト仕様 目次
description: Lucivo の feature 単位のテスト仕様の一覧。
tags: ["Lucivo", "テスト仕様"]
---

# テスト仕様 目次

| feature      | 略号   | テスト仕様                         | 対応する詳細設計                                                 |
| :----------- | :----- | :--------------------------------- | :--------------------------------------------------------------- |
| file-loading | `FILE` | [file-loading.md](file-loading.md) | [file-loading.md](../3.detailed_design/features/file-loading.md) |
| diagram-rendering | `DIAG` | [diagram-rendering.md](diagram-rendering.md) | [diagram-rendering.md](../3.detailed_design/features/diagram-rendering.md) |
| markdown-typography | `MD` | [markdown-typography.md](markdown-typography.md) | [markdown-typography.md](../3.detailed_design/features/markdown-typography.md) |
| math-rendering | `MATH` | [math-rendering.md](math-rendering.md) | [math-rendering.md](../3.detailed_design/features/math-rendering.md) |
| front-matter | `FM`   | [front-matter.md](front-matter.md) | [front-matter.md](../3.detailed_design/features/front-matter.md) |
| edge-style   | `EDGE` | [edge-style.md](edge-style.md)     | [edge-style.md](../3.detailed_design/features/edge-style.md)     |
| visual-templates | `VTPL` | [visual-templates.md](visual-templates.md) | [visual-templates.md](../3.detailed_design/features/visual-templates.md) |
| performance  | `PERF` | [performance.md](performance.md)   | [diagram-rendering.md](../3.detailed_design/features/diagram-rendering.md)、[math-rendering.md](../3.detailed_design/features/math-rendering.md) |

## 実行方法

- 自動確認: リポジトリ直下で `nodetests/e2e.cjs` を実行する。`index.html` を `file://` で開き、Chromium（Playwright）で確認する。CDN からライブラリを読み込むため、インターネット接続が必要。
- 出力: `work/test/results.json`（TC ごとの合否と詳細）、`work/test/shots/`（図の画像）。いずれも git 管理外。
- 目視確認: 「確認方法」が目視の TC は、`work/test/shots/` の画像で確認する。
- 規模の目安: 自動確認は 3〜5 分、目視確認は 230 枚程度の画像。
