---
trigger: always_on
---

# Antigravity 向けの入口

本リポジトリの原則・スキルは、次のファイルだけに書かれている。作業の開始時に必ず読み、それに従う。本フォルダには原則・スキル・ワークフローの複製を置かない（`AGENTS.md` 3 章）。

1. `AGENTS.md`: 全 AI エージェント共通の原則
2. `AGENTS.repo.md`: 本リポジトリ固有の規則・例外（`AGENTS.md` と食い違うときはこちらを優先）
3. `.claude/skills/<スキル名>/SKILL.md`: 作業別の手順。一覧は `.claude/README.md`

ユーザーが `/スキル名` やスキル名で作業を指示したとき、または作業内容がスキルの `description` に合うときは、該当する `SKILL.md` を読んでその手順に従う。Claude Code 固有の記法（`$ARGUMENTS` など）の読み替えは `AGENTS.md` 3 章に従う。
