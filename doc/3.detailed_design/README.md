---
title: Lucivo 詳細設計書 目次
description: Lucivo の機能単位（Feature-based）の詳細設計書一覧。
tags: ["Lucivo", "詳細設計"]
---

# 詳細設計書 目次

機能単位（Feature-based）の詳細設計書は `features/<feature名>.md` に配置する（`swe3-1` スキル）。

| feature             | 略号   | 詳細設計書                                                | 対応する要求        |
| :------------------ | :----- | :-------------------------------------------------------- | :------------------ |
| file-loading        | `FILE` | [file-loading.md](features/file-loading.md)               | `FR-006`, `FR-007`  |
| diagram-rendering   | `DIAG` | [diagram-rendering.md](features/diagram-rendering.md)     | `FR-002`, `FR-003`, `FR-008`, `FR-010`, `NFR-002`, `NFR-004`, `NFR-005` |
| markdown-typography | `MD`   | [markdown-typography.md](features/markdown-typography.md) | `FR-002`, `FR-003`, `FR-009` |
| math-rendering      | `MATH` | [math-rendering.md](features/math-rendering.md)           | `FR-010`, `NFR-003` |

- 初期プロトタイプのデザイン仕様: [lucivo_functional_and_design_specification.md](../lucivo_functional_and_design_specification.md)
