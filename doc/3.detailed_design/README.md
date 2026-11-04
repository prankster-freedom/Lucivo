---
title: Lucivo 詳細設計書 目次
description: Lucivo の機能単位（Feature-based）の詳細設計書一覧。
tags: ["Lucivo", "詳細設計"]
---

# 詳細設計書 目次

機能単位（Feature-based）の詳細設計書は `features/<feature名>.md` に配置する（`swe3` スキル）。

| feature             | 略号   | 詳細設計書                                      | 対応する要求 |
| :------------------ | :----- | :---------------------------------------------- | :----------- |
| file-loading        | `FILE` | [file-loading.md](features/file-loading.md)     | [file-loading.md](../SRS/features/file-loading.md) (`FR-006`, `FR-007`, `FR-013`, `FR-014`) |
| diagram-rendering   | `DIAG` | [diagram-rendering.md](features/diagram-rendering.md) | [diagram-rendering.md](../SRS/features/diagram-rendering.md) (`FR-001`〜`003`, `FR-005`, `FR-008`, `FR-015`, `NFR-002`, `NFR-004`, `NFR-005`) |
| markdown-typography | `MD`   | [markdown-typography.md](features/markdown-typography.md) | [markdown-typography.md](../SRS/features/markdown-typography.md) (`FR-002`, `FR-003`, `FR-009`) |
| math-rendering      | `MATH` | [math-rendering.md](features/math-rendering.md) | [math-rendering.md](../SRS/features/math-rendering.md) (`FR-010`, `NFR-003`) |
| front-matter        | `FM`   | [front-matter.md](features/front-matter.md)     | [front-matter.md](../SRS/features/front-matter.md) (`FR-011`, `NFR-003`, `NFR-006`) |
| edge-style          | `EDGE` | [edge-style.md](features/edge-style.md)         | [edge-style.md](../SRS/features/edge-style.md) (`FR-004`, `FR-012`) |

- 全体要求仕様書: [SRS.md](../SRS.md)
