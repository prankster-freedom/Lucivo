---
title: .claude フォルダの説明
description: AI エージェント共通のスキル（.claude/skills）と、原則（AGENTS.md / CLAUDE.md）の構成と使い方。
tags: ["Claude Code", "Cursor", "GitHub Copilot", "AGENTS.md", "CLAUDE.md", "skills", "ドキュメント"]
---

# .claude フォルダの説明

本ドキュメントは、AI エージェント向け設定の構成と各要素の役割を説明する。

常時適用する原則はリポジトリ直下の `AGENTS.md` に、作業別の手順・専門知識は `.claude/skills/` にスキルとして定義し、開発プロセスとドキュメント作成を一貫して支援する。Claude Code は `CLAUDE.md` 経由で `AGENTS.md` を読み込む。

## フォルダ構成

```text
<repo>/
├── AGENTS.md          # 最重要原則（全 AI ツール共通。原則はここだけに書く）
├── AGENTS.repo.md     # リポジトリ固有の規則・例外（共有しない）
├── CLAUDE.md          # Claude Code 向けの入口（AGENTS.md と AGENTS.repo.md を読み込むだけ）
├── agents-support-tools/ # スキルの実行で使う補助スクリプト（ツールごとにフォルダを分ける）
├── .github/
│   ├── copilot-instructions.md # GitHub Copilot 向けの入口（AGENTS.md などを参照するだけ）
│   └── instructions/README.md  # Copilot のパス別指示の置き場の説明
├── .agent/
│   ├── rules/agents.md # Antigravity 向けの入口（AGENTS.md などを参照するだけ）
│   └── skills.json     # Antigravity のスキル探索先として .claude/skills を登録
└── .claude/
    ├── README.md      # 本ファイル
    ├── settings.json  # チームで共有する Claude Code の設定
    └── skills/
        ├── commit/                          # /commit
        ├── cr/                              # /cr（SKILL.md + template.md）
        ├── devenv/                          # /devenv
        ├── devtools-update/                 # /devtools-update
        ├── doc/                             # /doc
        ├── dtp/                             # /dtp（デザイン設計・ラフ・素材管理・校正）
        ├── pi/                              # /pi
        ├── release/                         # /release
        ├── swe1/ swe2/ swe3/ test/          # SKILL.md + template.md（ソフトウェア開発の工程とひな形）
        ├── control-system-documentation/    # SKILL.md + examples.md
        └── markdown-plantuml-documentation/ # SKILL.md + markdown_sample.md
```

**他の AI ツールとの共用について**: Cursor・GitHub Copilot・Antigravity は、`AGENTS.md` と `.claude/skills/` を直接参照する。`.cursor/`・`.github/`・`.agent/` に原則・スキルの複製を置かない（`AGENTS.md` 3 章）。原則・スキルを改定するときは、`AGENTS.md` と `.claude/skills/` だけを変更すればよい。

各スキルはディレクトリ単位で、`SKILL.md`（YAML frontmatter + 手順本文）を必須とする。詳細な例などの補助ファイルは同じディレクトリに置き、`SKILL.md` からリンクする（必要時にのみ読み込まれる）。

`settings.local.json` は個人の環境ごとの設定のため、git 管理外とする（`.claude/.gitignore`）。

## 承認工程の書き方

`AGENTS.md` 1.2 に従い、ユーザーの承認が必要な工程は、スキルの手順に **【承認】** を付けて明示する。【承認】が付いた工程では、承認を得るまで次の工程へ進まない。

- **【承認】を付ける工程**: 方針・構成・計画を確定する工程、成果物を完了とする工程、削除・上書きなど取り返しにくい操作の前
- **【承認】を付けない工程**: 調査・確認・レポートなど、成果物に影響しない工程
- 承認工程を持たないスキルは、本文にその旨を明記する
- Auto モードで指示された場合は、`AGENTS.md` 1.2 に従い、最初に承認を省略してよいかを確認する

## AGENTS.md / CLAUDE.md（原則）

| ファイル    | 説明                                                                 |
| :---------- | :------------------------------------------------------------------- |
| `AGENTS.md` | 最重要原則を定める唯一のファイル（回答の誠実性、承認ベースの進行、工程順序、トレーサビリティ、使用言語、AI ツール間の共有など） |
| `CLAUDE.md` | Claude Code 向けの入口。`AGENTS.md` を読み込むだけで、原則は書かない |

## skills（スキル）

チャットで `/スキル名` と入力すると明示的に呼び出せる。`disable-model-invocation: true` を指定していないスキルは、`description` がタスクに合致したときに AI が自動で読み込む。

### 手順系（ユーザーが呼び出す）

| スキル | 自動呼び出し | 説明                                                                                                             |
| :----- | :----------- | :--------------------------------------------------------------------------------------------------------------- |
| commit | 可           | git commit の実施（ブランチ・PR の確認、変更確認、Conventional Commits 準拠のコミット、セルフレビュー。承認工程なし、push は指示時のみ。main へのマージは PR 経由）（v2.0.0） |
| cr     | 可           | 変更要求（CR）の登録・影響範囲の整理・対応の追跡。`doc/6.change_request/` に ID 付きで管理。ひな形付き（v2.0.0） |
| devenv | 不可         | ローカルの開発環境（npm の開発サーバー）の起動・再起動・停止。承認工程なし（v2.0.0）                             |
| devtools-update | 不可 | ローカル PC の開発ツール（Node.js・npm・Google Cloud SDK・GitHub CLI・uv）と、プロジェクトの Playwright（パッケージとブラウザー）の版とインストール方法の確認、更新計画の承認を得てからの更新（v1.0.0） |
| doc    | 可           | ドキュメントのメンテナンス。指定範囲またはリポジトリ全体の整合確認・更新と、ドキュメントの格納先の定義（v2.0.0） |
| pi     | 不可         | プロセス改善（直近の会話・不具合の振り返り。改定案には差分と理由を示す）（v2.0.0）                               |
| release | 不可        | リリース（前回のリリース以降のコミットから版を決め、版番号の更新とリリースノートの記載、リリースコミット）（v2.0.0） |

### ソフトウェア開発の工程（dtp → swe1 → swe2 → swe3 → test → dtp → commit の順）

| スキル | 自動呼び出し | 説明 |
| :----- | :----------- | :--- |
| dtp    | 可           | デザイン設計と校正（DTP・エディトリアルデザイン）。前段で基本フォーマット・ラフ（ボツ案含む）・レイアウト・素材仕様（`doc/DTP/`）と本番素材（`assets/`）を作成してエンジニアリングへのインプットとし、test 完了後に描画出力（ゲラ）のデザイン校正（`work/dtp_review/`）を行う（v1.0.0） |
| swe1   | 可           | 工程 1 (SWE.1): ソフトウェア要求分析。全体のつながりが分かる SRS と個別 feature 要求仕様書を作成・更新する（v2.0.0） |
| swe2   | 可           | 工程 2 (SWE.2): ソフトウェアアーキテクチャ設計。アーキテクチャ設計書（ADS）と必要に応じて SWC 要求仕様書（SwcRS）を作成・更新し、ブランチを作成する（v2.0.0） |
| swe3   | 可           | 工程 3 (SWE.3): ソフトウェア詳細設計と実装。承認済み設計に基づくソースコード実装、および必要に応じた Design Notes を作成・更新する（v2.0.0） |
| test   | 可           | 工程 4: テスト。テスト仕様書は `doc/5.test_spec/`、テスト結果は `work/test_result/`（git 管理外）。ひな形（テスト仕様書・テスト結果）付き（v2.0.0） |

### 知識系（タスクに応じて自動参照）

| スキル                          | 説明 |
| :------------------------------ | :--- |
| markdown-plantuml-documentation | GitHub Flavored Markdown・PlantUML・Mermaid の書き方（記法、図の書式、構文エラーの回避）（v2.0.0） |
| control-system-documentation    | 制御系のブロック線図（SVG 既定: 横一列矩形・矢印脇ラベル・白丸加え合せ・黒丸引き出し・直角帰還）と、数式に基づく時系列・周波数応答グラフ。Mermaid flowchart での掲載は非推奨（v2.0.0） |

### frontmatter

| キー                       | 用途                                                                               |
| :------------------------- | :--------------------------------------------------------------------------------- |
| `name`                     | スキル名（小文字・数字・ハイフン）。`/name` で呼び出す。ディレクトリ名と一致させる |
| `description`              | 何をするか・いつ使うか。自動呼び出しの判断材料になるため具体的に書く               |
| `argument-hint`            | `/name` 入力時に表示する引数のヒント。本文では `$ARGUMENTS` で受け取る             |
| `allowed-tools`            | スキル実行中に承認なしで使えるツール（例: `Bash(git status:*)`）。Claude Code 用   |
| `disable-model-invocation` | `true` で自動呼び出しを禁止し、`/name` での明示呼び出しのみにする                  |
| `metadata.version`         | スキルの版番号（下記「バージョン管理」）                                           |

`$ARGUMENTS` などの Claude Code 固有の記法を、他の AI ツールでどう読み替えるかは `AGENTS.md` 3 章に定める。

## バージョン管理

各スキルを 1 つの単位とし、版番号は `SKILL.md` の `metadata.version` に置く。版の上げ方とリリースの手順は `AGENTS.md` 1.9 と release スキルに従う。

## リリースノート

各スキルの 2.0.0 は、Semantic Versioning・Conventional Commits を導入し、複数のリポジトリで共有を始めた版である。2.0.0 より前の改訂履歴は `git log` を参照する。以降の版は、スキルごとの節を設けて追加する。

### 全スキル共通

#### 2.0.0（2026-10-28）

- doc!: 原則は `AGENTS.md`、スキルは `.claude/skills/` だけに書くこととし、Claude Code・Cursor・GitHub Copilot で共用する
- doc!: cr・release・control-system-documentation を追加し、各スキルを改訂する

## 参照

- Claude Code の Memory（CLAUDE.md） および Skills の公式ドキュメント
- コミットメッセージ: Conventional Commits 1.0.0
- スキル等の版番号: セマンティック バージョニング 2.0.0
- リポジトリ全体のドキュメント構成は、ルートの `README.md` を参照してください
