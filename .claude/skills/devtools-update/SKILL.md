---
name: devtools-update
description: ローカル PC の開発ツール（Node.js・npm・Google Cloud SDK・GitHub CLI・uv）と、作業中のプロジェクトの Playwright（パッケージとブラウザー）の版とインストール方法を確認し、更新計画の承認を得てから更新する。ユーザーから開発ツールの更新を明示的に指示されたときに使用する。
disable-model-invocation: true
argument-hint: "[node | npm | gcloud | gh | uv | playwright ...]（省略時はすべて）"
metadata:
  version: "1.0.0"
---

# devtools-update（開発ツールの更新）

ローカル PC の開発ツールを確認し、承認を得てから更新する。

対象: $ARGUMENTS（省略時は下表のすべて）

| 対象       | ツール                                                     | 版の確認                                |
| :--------- | :--------------------------------------------------------- | :-------------------------------------- |
| node       | Node.js                                                    | `node -v`                               |
| npm        | npm                                                        | `npm -v`                                |
| gcloud     | Google Cloud SDK                                           | `gcloud version`                        |
| gh         | GitHub CLI                                                 | `gh --version`                          |
| uv         | uv                                                         | `uv --version`                          |
| playwright | Playwright（作業中のプロジェクトのパッケージとブラウザー） | `npx --no-install playwright --version` |

Playwright 以外は PC 全体に入るツールを対象とする。Playwright はプロジェクトの依存パッケージだが、ブラウザーの本体が PC 共通の場所に入り、その版はパッケージの版で決まるため、パッケージとブラウザーを合わせて対象にする。

ツールの更新は PC 全体に影響し、元に戻しにくい。このため、更新計画の承認を得るまでは、確認のためのコマンドだけを実行する。確認に使うコマンドは本スキルに書いたものに限る。それ以外のコマンドで確認するときは、ヘルプ（`--help`）で更新を実行しないことを確かめてから使う。パッケージマネージャーの `upgrade`・`update` には、引数によって一覧の表示ではなく更新を実行するものがある（例: `winget upgrade --id <ID>`）。

## 手順

1. **現状の確認**: 対象ごとに次を調べる（「インストール方法の判別」「更新方法」の節）。
   - 現在の版と、実行ファイルのパス（Windows は `Get-Command <ツール>`、macOS・Linux は `command -v <ツール>`）
   - インストール方法（パッケージマネージャー、版管理ツール、公式インストーラーなど）
   - 更新できる版（同じメジャー版の中の最新と、全体の最新）。全体の最新は正式版から選び、プレリリース版（`-alpha`・`-rc` などを含む版）は除く
2. **【承認】更新計画の提示**: 対象ごとに、現在の版、同じメジャー版の中の最新、全体の最新（メジャー版が上がる場合はその旨）、計画する更新後の版、更新に使うコマンド、注意点（管理者権限・UAC の確認、停止が必要なプロセスなど）を表で示し、承認を得る。全体の最新へ上げない場合も、その版と上げない理由（既定の版の方針など）を表に書く。メジャー版の更新を計画に入れる場合は、その影響も示す。更新が不要な対象は「最新」と明記する。
3. **更新の実行**: 承認された対象だけを、Node.js → npm → Google Cloud SDK → GitHub CLI → uv → Playwright の順に更新する。npm は Node.js に同梱されるため Node.js の後に、Playwright は npm で入れるため npm の後に更新する。1 つが失敗したら、残りに進まずに止め、エラーの内容と原因の見立てを報告して判断を仰ぐ。
4. **結果の確認と報告**: 新しいシェルで版を確認し（PATH の変更は既存のシェルに反映されないため）、更新前と更新後の版を表で報告する。

## インストール方法の判別

実行ファイルのパスとパッケージマネージャーの一覧から判別する。判別できない場合は推測で更新せず、ユーザーに確認する。

| 判別の手がかり                                            | インストール方法                     |
| :-------------------------------------------------------- | :----------------------------------- |
| `winget list --id <ID>` に表示され、版が `Unknown` でない | winget                               |
| `brew list <名前>` に表示される                           | Homebrew                             |
| パスに `nvm`・`volta`・`fnm`・`.nvm` を含む（Node.js）    | 版管理ツール                         |
| 上記に当たらない                                          | 公式インストーラー・アーカイブの展開 |

winget の ID の例: Node.js は `OpenJS.NodeJS.<メジャー版>`・`OpenJS.NodeJS.LTS`・`OpenJS.NodeJS`、GitHub CLI は `GitHub.cli`、Google Cloud SDK は `Google.CloudSDK`、uv は `astral-sh.uv`。ID はインストール済みのものを `winget list` で確認して使う。

## 更新方法

winget で更新できる版は、`winget list --id <ID> --exact` の「利用可能」列で確認する。`winget upgrade --id <ID>` は更新を実行するため、確認には使わない。

winget で更新するときは、対話を避けるため次の形で実行する。

```text
winget upgrade --id <ID> --exact --silent --accept-source-agreements --accept-package-agreements
```

マシン全体にインストールされたパッケージは UAC の確認が出ることがあるため、実行前にユーザーへ伝える。

### Node.js

- **版の方針**: 既定では、同じメジャー版の中で最新にする。メジャー版を上げるのは、ユーザーが指定したときだけとする。メジャー版の更新を提案するときは、作業中のプロジェクトの版の指定（`package.json` の `engines`、`.nvmrc`、`.node-version`、`Dockerfile` のベースイメージなど）と食い違わないかを確かめて示す。
- **更新できる版**: 公式の版の一覧 `https://nodejs.org/dist/index.json`（Windows は `Invoke-RestMethod`、macOS・Linux は `curl -s` で取得）で確認する。一覧は新しい順で、`version` に `-` を含む版はプレリリース版のため除く。同じメジャー版の中の最新、全体の最新、最新の LTS を示し、それぞれが LTS かどうか（`lts` が LTS の名前か `false` か）も書く。Windows PowerShell 5.1 では、`(Invoke-RestMethod <URL>) | Where-Object ...` のように結果を括弧で囲んでから絞り込む。括弧がないと、配列が 1 つのまとまりとしてパイプに渡り、絞り込みが効かない。winget では、ID がメジャー版ごと（`OpenJS.NodeJS.22` など）に分かれており、`winget upgrade` は同じ ID の中で更新する。ID が `OpenJS.NodeJS.LTS`・`OpenJS.NodeJS` の場合、`winget upgrade` でメジャー版が上がることがある。更新後の版のメジャー版が今と違うときは、メジャー版の更新として扱い、ユーザーの指定がなければ更新しない。
- **更新の前**: Node.js を使って実行中のプロセス（開発サーバーなど）があると更新に失敗することがあるため、停止してよいかをユーザーに確認する。
- **更新の方法**:

  | インストール方法   | コマンド                                                     |
  | :----------------- | :----------------------------------------------------------- |
  | winget             | 同じメジャー版の中は `winget upgrade --id <ID> ...`（上記の形）。メジャー版を上げるときは、新しいメジャー版の ID（`OpenJS.NodeJS.<メジャー版>`）を `winget search --id OpenJS.NodeJS` で探して `winget install` する。ない場合は、最新の LTS なら `OpenJS.NodeJS.LTS` を使う。`OpenJS.NodeJS.LTS` は、今後の `winget upgrade` で次の LTS へメジャー版ごと上がることを、更新計画の注意点に書く。インストール後に `winget list --id OpenJS.NodeJS` で古い ID が残っていないかを確かめ、残っていればアンインストールしてよいかをユーザーに確認する |
  | Homebrew           | `brew upgrade node`（`node@<メジャー版>` の場合はその名前）  |
  | nvm・volta・fnm    | 新しい版をインストールし、既定の版を切り替える（例: `nvm install <版>` → `nvm use <版>`）。古い版の削除はユーザーに確認する |
  | 公式インストーラー | 自動では更新しない。公式サイトからの入手をユーザーに案内する |

### npm

- **版の方針**: 既定では、同じメジャー版の中で最新にする。メジャー版を上げる場合は、新しい版が今の Node.js に対応しているかを `npm view npm@<版> engines` で確かめる。
- **更新できる版**: 同じメジャー版の中の最新は `npm view npm@<メジャー版> version`、全体の最新は `npm view npm version` で確認する。全体の最新が今の Node.js に対応しているかを `npm view npm@<版> engines` で確かめて示す。Node.js を更新した場合は、同梱の npm の版が変わるため、Node.js の更新後にあらためて確認する。
- **更新の方法**: `npm install -g npm@<版>`。
- **Windows の注意**: Node.js を winget・公式インストーラーで入れた場合、`npm install -g npm` で入る npm（`%AppData%\npm`）より、Node.js 同梱の npm が PATH で先に見つかり、更新が反映されないことがある。更新後に `npm -v` と `Get-Command npm` で、実際に使われる npm の版とパスを確かめ、反映されていなければその旨を報告する。

### Google Cloud SDK

- **更新できる版**: `gcloud components list` の冒頭に、現在の版と最新の版が表示される。Google Cloud SDK は通常、リリースごとにメジャー版が上がる（`591.0.0` など）ため、同じメジャー版の中の最新は「該当なし」とし、全体の最新へ更新する。
- **更新の方法**:

  | インストール方法                                  | コマンド                           |
  | :------------------------------------------------ | :--------------------------------- |
  | 公式インストーラー・アーカイブの展開              | `gcloud components update --quiet` |
  | パッケージマネージャー（apt・yum・Homebrew など） | `gcloud components update` は使えない。そのパッケージマネージャーで更新する |

- **更新の前**: Windows では、gcloud を実行中の他のシェルがあると更新に失敗することがあるため、閉じてもらう。インストール先が `Program Files` などの場合は、管理者権限のシェルが必要になる。

### GitHub CLI

- **版の方針**: 既定では、同じメジャー版の中で最新にする。メジャー版を上げるのは、ユーザーが指定したときだけとする。
- **更新できる版**: `gh --version` と、パッケージマネージャーの情報（`winget list --id GitHub.cli --exact` の「利用可能」列、`brew outdated gh` など）で確認する。全体の最新は `gh release view -R cli/cli --json tagName -q .tagName` で確認する。
- **更新の方法**: インストールしたパッケージマネージャーで更新する（`winget upgrade --id GitHub.cli ...`、`brew upgrade gh` など）。公式インストーラーの場合は、公式サイトからの入手をユーザーに案内する。

### uv

- **インストール方法の判別**: 公式のスタンドアロンインストーラーで入れた場合、実行ファイルは `~/.local/bin`（Windows は `%USERPROFILE%\.local\bin`）にあることが多い。pip・pipx・winget・Homebrew で入れた場合は、それぞれの一覧（`pipx list`、`winget list --id astral-sh.uv --exact`、`brew list uv` など）に表示される。
- **版の方針**: 最新にする。uv は 0.x の版のため、マイナー版の更新でも互換性のない変更を含むことがある。マイナー版が上がる場合は、更新計画の注意点にその旨を書く。
- **更新できる版**: スタンドアロンインストーラーの場合は `uv self update --dry-run` で全体の最新を確認する（更新は実行されない）。それ以外は、各パッケージマネージャーの情報で確認する。メジャー版は 0 のため、同じメジャー版の中の最新は全体の最新と同じになる。代わりに、マイナー版が上がるかどうかを示す。
- **更新の方法**:

  | インストール方法             | コマンド                                           |
  | :--------------------------- | :------------------------------------------------- |
  | スタンドアロンインストーラー | `uv self update`                                   |
  | pipx                         | `pipx upgrade uv`                                  |
  | pip                          | `pip install --upgrade uv`（入れた環境で実行）     |
  | winget                       | `winget upgrade --id astral-sh.uv ...`（上記の形） |
  | Homebrew                     | `brew upgrade uv`                                  |

### Playwright

- **対象の判別**: 作業中のプロジェクトの `package.json` の `dependencies`・`devDependencies` にある `@playwright/test`（または `playwright`）を対象とする。どちらもなければ「対象なし」と報告する。
- **版の方針**: 既定では、同じメジャー版の中で最新にする。Playwright はマイナー版の更新でも互換性のない変更を含むことがあるため、マイナー版が上がる場合は、更新計画の注意点にその旨と公式のリリースノートの確認を書く。
- **更新できる版**: 現在の版は `npx --no-install playwright --version`、同じメジャー版の中の最新は `npm view @playwright/test@<メジャー版> version`、全体の最新は `npm view @playwright/test version` で確認する。
- **使っているブラウザー**: ブラウザーの置き場所（Windows は `%LOCALAPPDATA%\ms-playwright`、macOS は `~/Library/Caches/ms-playwright`、Linux は `~/.cache/ms-playwright`。環境変数 `PLAYWRIGHT_BROWSERS_PATH` があればそのパス）のフォルダ名と、`playwright.config.*` の `projects` から、使っているブラウザー（`chromium`・`firefox`・`webkit` など）を確かめる。
- **更新の前**: 更新すると `package.json` と `package-lock.json` が変わる。コミットしていない変更がこれらにある場合は、更新計画の注意点にその旨を書く。
- **更新の方法**:
  1. `npm install --save-dev @playwright/test@<版>`（`dependencies` にある場合は `--save-dev` を付けない。`playwright` の場合はそのパッケージ名）
  2. `npx playwright install <使っているブラウザー>`。ブラウザーを指定しないと、使っていないブラウザーも入るため指定する。Linux で `--with-deps` が必要な場合は `sudo` を求められるため、ユーザーに実行を依頼する。
- **古いブラウザー**: Playwright は、どの版の Playwright からも使われなくなった版のブラウザーを自動で削除する。手で削除しない。
- **結果の確認**: `npx --no-install playwright --version` の版に加え、プロジェクトの Playwright のテストを実行してよいかをユーザーに確認し、承認されたら実行して結果を報告する。

## 対象外

- npm のグローバルパッケージ（`npm outdated -g` で表示されるもの）、gcloud 以外の Google Cloud のツール
- 作業中のプロジェクトの依存パッケージ（`package.json`）。ただし Playwright は対象とする
