---
title: Lucivo テスト仕様 目次
description: Lucivo の feature 単位のテスト仕様の一覧。
tags: ["Lucivo", "テスト仕様"]
---

# テスト仕様 目次

| feature      | 略号   | テスト仕様                         | 対応する詳細設計                                                 |
| :----------- | :----- | :--------------------------------- | :--------------------------------------------------------------- |
| file-loading | `FILE` | [file-loading.md](file-loading.md) | [file-loading.md](../3.sw_design_notes/features/file-loading.md) |
| diagram-rendering | `DIAG` | [diagram-rendering.md](diagram-rendering.md) | [diagram-rendering.md](../3.sw_design_notes/features/diagram-rendering.md) |
| markdown-typography | `MD` | [markdown-typography.md](markdown-typography.md) | [markdown-typography.md](../3.sw_design_notes/features/markdown-typography.md) |
| math-rendering | `MATH` | [math-rendering.md](math-rendering.md) | [math-rendering.md](../3.sw_design_notes/features/math-rendering.md) |
| front-matter | `FM`   | [front-matter.md](front-matter.md) | [front-matter.md](../3.sw_design_notes/features/front-matter.md) |
| edge-style   | `EDGE` | [edge-style.md](edge-style.md)     | [edge-style.md](../3.sw_design_notes/features/edge-style.md)     |
| visual-templates | `VTPL` | [visual-templates.md](visual-templates.md) | [visual-templates.md](../3.sw_design_notes/features/visual-templates.md) |
| stage-show   | `LIGHT`, `SHOW` | [stage-show.md](stage-show.md) | [stage-show.md](../3.sw_design_notes/features/stage-show.md) |
| offline      | `OFF`  | [offline.md](offline.md)           | [offline.md](../3.sw_design_notes/features/offline.md)           |
| performance  | `PERF` | [performance.md](performance.md)   | [diagram-rendering.md](../3.sw_design_notes/features/diagram-rendering.md)、[math-rendering.md](../3.sw_design_notes/features/math-rendering.md) |

## 実行方法

- 初期設定: リポジトリ直下で `npm install` と `npx playwright install chromium` を実行する。
- 自動確認: リポジトリ直下で `npm test`（`node tests/e2e.cjs`）を実行する。`npm test` の前処理（`pretest`）がスタンドアロン版を `dist/` に作り、その `index.html` を `file://` で開いて Chromium（Playwright）で確認する。Web 版のテストは `public/` を手元のサーバーで配る。`node tests/e2e.cjs` を直接実行するときは、先に `npm run build:standalone` を実行する。
- 部分実行: 特定の機能やテストケースだけを確かめるときは、`node tests/e2e.cjs <スイート名または TC ID>` を実行する（例: `node tests/e2e.cjs TC-SHOW-011`）。`work/test/results.json` は、該当する TC の結果だけが更新される。
- 静的な検査: `npm run lint` で、制御文字・見えない空白の検査と ESLint を実行する。
- 出力: `work/test/results.json`（TC ごとの合否と詳細）、`work/test/shots/`（図の画像）。いずれも git 管理外。
- 目視確認: 「確認方法」が目視の TC は、`work/test/shots/` の画像で確認する。
- 規模の目安: 自動確認は 3〜5 分、目視確認は 280 枚程度の画像。
