---
name: structurizr
description: Structurizr（C4 モデル）および Structurizr DSL の仕様確認・パーサー拡張・ビュー解決・スタイル/テーマ実装・サンプル作成を行うための知識スキル。公式情報源（structurizr.com / docs.structurizr.com / github.com/structurizr/structurizr）を状況に応じて参照し、推測ではなく一次仕様に基づいて設計・実装・検証する。Structurizr 関連の要求分析、アーキテクチャ設計、パーサー実装、テスト作成、サンプル DSL 執筆時に使用する。
argument-hint: "[確認・実装したい Structurizr DSL 構文や機能]"
metadata:
  version: "1.0.0"
---

# structurizr（Structurizr / C4 モデル公式仕様参照ガイド）

本スキルは、Structurizr DSL の仕様確認・実装・サンプル執筆において、推測に頼らず公式一次情報を状況に応じて参照し、Lucivo の設計原則（オフライン完結・安全スキップ・IR 分離）と整合させるための指針を定める。

対象: $ARGUMENTS

> **承認工程**: 本スキルは知識系スキルであり、単体での承認工程は持たない。仕様変更や実装を伴う場合は `swe1`〜`test` スキルの承認手順に従う。

---

## 1. 公式情報源と参照タイミング

Structurizr DSL の構文・意味論・エッジケース（識別子スコープ、定数展開、式フィルタ、ビュー種別、テーマ、JSON スキーマ等）を判断するときは、記憶や推測で決めず、以下の公式一次情報を状況に応じて参照する。

| 知りたいこと                | 参照先 URL                                     | 参照する場面                             |
| :-------------------------- | :--------------------------------------------- | :--------------------------------------- |
| 製品概要・C4 モデルとの対応 | `https://structurizr.com`                      | 全体像や公式用語・位置づけを確認するとき |
| 公式ドキュメント総合        | `https://docs.structurizr.com/`                | 機能一覧・最新版の仕様変更を確認するとき |
| DSL 言語リファレンス（全キーワード・親子関係） | `https://docs.structurizr.com/dsl/language` | キーワードの引数順・省略可否・許可される子要素・デフォルトタグを確認するとき |
| DSL 基本ルール・コメント・`!const` / `!var`・文字列展開 | `https://docs.structurizr.com/dsl/basics` | 字句規則、行継続、文字列置換（`${NAME}`）、ワークスペース制約を確認するとき |
| 識別子スコープ（`flat` / `hierarchical`） | `https://docs.structurizr.com/dsl/identifiers` | `!identifiers` の動作、ドット修飾参照、`group` との関係を確認するとき |
| 式フィルタ（Expressions）   | `https://docs.structurizr.com/dsl/expressions` | `include` / `exclude` の式構文（`element.tag==...`, `relationship.tag==...`, `->` 等）を設計・実装するとき |
| 暗黙的関係（Implied Relationships） | `https://docs.structurizr.com/dsl/implied-relationships` | 下位要素間の関係から上位ビューへ関係を集約する規則を確認するとき |
| チュートリアル・クックブック（実例集） | `https://docs.structurizr.com/dsl/tutorial` / `https://docs.structurizr.com/dsl/cookbook` | 実践的な DSL の書き方、Dynamic / Deployment / Filtered ビュー・Styles・Themes の公式例を確認するとき |
| テーマ仕様（`theme` / `themes`） | `https://docs.structurizr.com/dsl/cookbook/themes/` / `https://docs.structurizr.com/server/diagrams/themes` | テーマ JSON 構造、ワークスペース `styles` との優先順位を確認するとき |
| ソースコード・Issue・最新リリース | `https://github.com/structurizr/structurizr` | ドキュメントに記載のないエッジケース・パーサーの厳密な挙動・最新仕様を確認するとき |

### 参照時の原則（`AGENTS.md` 1.1 準拠）

1. **未検証の構文を推測で実装しない**: 引数順・大文字小文字の扱い・デフォルト値・スコープ規則に少しでも迷いがある場合は、必ず上記 URL（特に Language reference・Basics・GitHub リポジトリ）を検索・閲覧して裏付けを取る。
2. **公式仕様と Lucivo の差分を明記する**: オフライン制約や段階的対応（Phase 2a〜2e）により公式仕様と異なる挙動をとる箇所は、要求仕様書（`doc/1.SRS/features/diagram-rendering.md`）および詳細設計ノート（`doc/3.sw_design_notes/features/diagram-rendering.md`）に背景・根拠とともに明記する。
3. **サンプル DSL は公式構文に準拠させる**: `public/samples/sample-Structurizr*.md` に書く DSL は、Lucivo 独自方言を入れず、公式 Structurizr（local / playground / CLI）でもそのまま通る標準構文とする。

---

## 2. 公式 DSL 仕様の要点（実装・レビュー時のチェックリスト）

### 2.1 基本規則（Basics）
- キーワードは大文字小文字を区別しない（`softwareSystem` / `softwaresystem`、`autoLayout` / `autolayout`）。
- 空白を含まないトークンは二重引用符 `"..."` を省略できる。省略可能な前方引数を飛ばすときは `""` をプレースホルダに使う。
- コメントは `// ...`、`# ...`、`/* ... */` の 3 種類（ただし `#HEX` カラー値との区別に注意）。
- 定数・変数: `!const <name> <value>`（エイリアス `!constant`）、再定義可能な `!var <name> <value>`。名前文字種は `a-zA-Z0-9-_`。
- 文字列置換: 定義済み定数・変数を `${NAME}` で展開する。未定義の `${NAME}` は置換せずそのまま残す。

### 2.2 識別子スコープ（Identifiers）
- 既定は `!identifiers flat`（全要素でグローバル一意）。
- `!identifiers hierarchical` 指定時、要素の識別子は親要素の識別子でドット修飾される（例: `softwareSystem1.api`, `softwareSystem1.api.ctrl`）。
- **`group` は階層識別子に含まれない**（公式仕様: `!identifiers hierarchical does not apply to groups`）。
- 異なる親配下であれば同一ローカル識別子（例: `sysA.api` と `sysB.api`）を重複なく定義できる。

### 2.3 テーマとスタイルのカスケード順（Themes & Styles）
- テーマ（`theme` / `themes`）のスタイルがベースとして適用され、その後にワークスペース内の `styles { ... }` が上書きする（CSS と同様の後勝ち）。
- 要素の標準タグ:
  - `person`: `Element`, `Person`
  - `softwareSystem`: `Element`, `Software System`
  - `container`: `Element`, `Container`
  - `component`: `Element`, `Component`
- 関係の標準タグ: `Relationship`

---

## 3. Lucivo 固有の制約と設計方針（`FR-071`, `ARC-STR-001`〜`007`）

| 項目                                             | Lucivo の方針                                                           | 根拠          |
| :----------------------------------------------- | :---------------------------------------------------------------------- | :------------ |
| 外部 URL からのテーマ取得（`theme https://...`） | **非対応を維持**（`THEME_IGNORED` 警告で安全スキップ）                  | オフライン完結・無断通信禁止（`NFR-001`） |
| 内蔵テーマ（`theme default` / `themes default`） | ネットワーク通信なしで内蔵プリセットを適用                              | 公式サンプルとの互換性向上（#483 Phase 2a） |
| `!script`（任意スクリプト実行）                  | **非対応を維持**（`UNSUPPORTED_DIRECTIVE` 警告で安全スキップ）          | XSS・セキュリティ原則 |
| 未対応構文全般                                   | 描画全体を止めず安全にスキップし、`ParseWarning` として警告バッジへ収集 | `ARC-STR-003` |
| 論理と座標の分離                                 | IR（`StructurizrWorkspace`）と座標（`ViewLayout`）を完全分離            | `ARC-STR-001`（`workspace.json` 手動座標再現との両立） |
| 配色トークンとの両立                             | `theme` / `styles` 未指定箇所は `--c4-*` CSS 変数（Fast/Visual・Light/Dark・トーン連動）を参照 | `ARC-STR-005` |
