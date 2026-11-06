# md-table-align

Markdown ファイル内の表を、プレーンテキストを等幅フォントで表示したときに読みやすいように整形する。規則は doc スキルの「表の書き方」に従う。

- 全角文字を半角 2 文字分として列の位置（`|` の位置）を揃える
- 1 行が半角 120 文字を超える場合は、長いセルを例外として残りのセル同士で揃える
- コードブロック内の表は対象外

## 使い方

Node.js が必要。リポジトリ直下で実行する。ファイルは上書きされる。

```sh
node agents-support-tools/md-table-align/align-tables.cjs <Markdown ファイル> [...]
```

例:

```sh
node agents-support-tools/md-table-align/align-tables.cjs AGENTS.md .claude/README.md
```

## 呼び出し元

- doc スキル（「表の書き方」）
