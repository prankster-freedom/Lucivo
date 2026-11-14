# AGENTS.repo.md

本リポジトリ（Lucivo）固有の規則・例外を定める。`AGENTS.md` や `.claude/skills/` と食い違うときは、本ファイルを優先する（`AGENTS.md` 4 章）。共有ファイルではないため、他のリポジトリへ持ち出さない。

## 1. リポジトリの概要

- Lucivo は、ブラウザ単体で動く Markdown と Mermaid のビューアー（HTML / CSS / JavaScript。ビルド工程なし）
- 配布物は `public/` に置く。`doc/`・`tests/`・`tools/`・`work/` は配布物に含めない
- `tests/`・`tools/` のスクリプトは CommonJS で、拡張子を `.cjs` にする

## 2. ドキュメントの格納先（doc スキルの例外）

プロジェクトのルートはリポジトリ直下（`<プロジェクト>/` = `./`）。作業の流れに沿った番号付きの構成を正とする。

| 種類             | doc スキルの既定                                | 本リポジトリ                                |
| :--------------- | :---------------------------------------------- | :------------------------------------------ |
| DTP デザイン仕様 | `doc/DTP/`                                      | `doc/0.DTP/`（本番素材は `public/assets/`） |
| 要求仕様書       | `doc/SRS.md`, `doc/SRS/features/<feature名>.md` | `doc/1.SRS.md`, `doc/1.SRS/features/<feature名>.md` |
| アーキテクチャ設計書 | `doc/ADS.md`                                | `doc/2.ARCHITECTURE.md`                     |
| 詳細設計書       | `doc/DesignNotes/<対象>.md`（必要な場合のみ）   | `doc/3.sw_design_notes/features/`（目次は `README.md`） |
| 実装ドキュメント | ソースコード（および Design Notes）             | `doc/3.implementation/`                     |
| テスト仕様書     | `doc/5.test_spec/`                              | `doc/4.test_spec/`                          |
| 変更要求         | `doc/6.change_request/<サービス>/`              | GitHub Issue で管理する（cr スキルの「管理先」）。既存の CR 票（`doc/6.change_request/CR-*.md`）は履歴として残す |
| README の画像    | （定めなし）                                    | `doc/images/readme/`（配布物の `public/` に入れない） |

dtp スキルの本番素材の置き場所 `<プロジェクト>/assets/` は、本リポジトリでは `public/assets/` と読み替える。

ドキュメントの本文で `js/app.js` のように書いたソースのパスは、`public/` からの相対パスである。

## 3. ローカル開発環境

- 初期設定は `npm install`、Chromium の導入は `npx playwright install chromium`
- 開発 PC は Windows。シェルは Git Bash と PowerShell を使える
- Python は uv で管理する（`uv python install --default` で、`python` / `python3` が uv の Python を指す）。`python` が Microsoft Store を開くだけの場合は、WindowsApps の仮のファイルが先に見つかっているため、`uv python list --only-installed` で確認する。パッケージが必要なときは `uv run --with <パッケージ>` を使う
- バックスラッシュ・バッククォート・`$` を含む内容（正規表現、TeX、テンプレートリテラルなど）は、シェルのヒアドキュメントや `node -e` の引数で書かない。ファイルの作成・編集は、エディタ系のツール（AI エージェントのファイル編集機能など）で行う。ヒアドキュメント経由で `\\` が `\` に変わり、スクリプトや数式が壊れたことがある
  - Python や sed などの文字列に置換の内容を埋め込んで回避しない。Python の通常の文字列では `\b` がバックスペース（0x08）に変わり、警告も出ない。一括の置換が必要なときは、置換の内容をエディタ系のツールで書いたファイルから読む
  - ツールの警告（Python の `SyntaxWarning` など）は誤りとして扱い、原因を直してから進める
  - この規則に反した場合は、いつ気付いたか（書いた直後か、後か）と、内容が壊れていないかをユーザーに報告する。書いた直後に気付いて内容を確かめられた場合は、それで足りる。直後に気付けなかった失敗（コミット後やレビューで見つかったもの、内容が壊れていたもの）は、報告だけで済ませず、再発を防ぐワークフローの改善（検査の追加など）を提案する
  - `npm run lint` で、制御文字と見えない文字（BOM、置き換え文字、幅のない空白など。全角の空白は除く）を、すべてのテキストファイル（`src/ts/` を含み、まだコミットしていない新しいファイルも）について検出し、eslint で正規表現の中の制御文字を検出する（CI の `lint` ジョブ）。見えない文字が必要なときは `\uFEFF` のようにエスケープで書く
- ブラウザでの動作確認は `npm test`（`node tests/e2e.cjs`）で行う。`public/index.html` を `file://` で開き、Playwright（Chromium）で確認する
  - 特定の機能やテストケースだけを確認・再テストするときは、`node tests/e2e.cjs <関数名またはTC ID>`（例: `node tests/e2e.cjs TC-SHOW-011`、`node tests/e2e.cjs testCoverAndTables`）で対象スイートだけを部分実行する（`work/test/results.json` は該当 TC の結果だけが差分更新される）。`node -e` のワンライナーでテストコードを実行しない
- Markdown ファイル内の表整形には `node agents-support-tools/md-table-align/align-tables.cjs <Markdown ファイル>` を使用する

## 4. 版番号（`AGENTS.md` 1.9・release スキルの例外）

- 版番号は、README の本文の「**Version**」と `package.json` の `version` の 2 か所に書き、この 2 か所を正とする（release スキルの「README の Front Matter の `version`」の例外）。リリースでは 2 か所を同じ版にそろえる
- 画面に表示するバージョン表記は、本番・スタンドアロン配布版が `X.Y.Z (build #N)`、Canary 版（`/preview/`）が `X.Y.Z-canary (build #N)`、ローカル開発ビルドが `X.Y.Z` とする（`tools/build-app.cjs` が `LUCIVO_VERSION_OVERRIDE` または `package.json` の `version` を埋め込む）
- `release/*` ブランチでは `package.json` の `"version"` と `README.md` のみを更新し、`public/js/app.js` は CI（`release.yml` / `pages.yml`）側でビルド番号を注入して生成する。これにより、`tools/check-ci-changes.cjs` によりリリース PR で E2E テストが再実行されない（手動で `public/js/app.js` を更新した場合は E2E 対象になる）

## 5. 「Visualモードの追加訴求ポイントの提案依頼」の定型ワークフロー

ユーザーから「Visualモードの追加訴求ポイントの提案」を依頼されたときは、次の定型仕様に従って進める。

### 5.1 定型依頼事項と特記事項の扱い

プロダクトコンセプト（`doc/1.SRS.md` 1.1）における Visualモードの基準をさらに訴求する提案・設計・実装を行う。

- **定型依頼事項（常時満たすべき目的）**: 見た目の品質を最優先しつつ、閲覧操作のリアルタイム性は保つ。各種イベントやショーの講演資料・展示素材として、そのまま表示できる。簡易ビューアーで描画していると感じさせない、トップデザイナーが制作したと思える品質。全体の構図から細部の質感までこだわる。
- **特記事項の反映**: 依頼時にユーザーから「今回の特記事項」（注力すべき工程や観点、前回の更新に対するフィードバックなど）が指定された場合は、上記の定型依頼事項に加えてその特記事項も加味して提案・設計・実装を行う。

### 5.2 進行ルール（PR 発行まで承認不要の一気通貫実行）

本定型依頼では、ユーザーから特別な停止指示がない限り、途中工程の【承認】を省略して次の工程を最後まで一気通貫で実行し、Pull Request の発行まで完了させてから結果をまとめて報告する（マージはユーザーの指示があるときに行う）。

1. **`dtp`（Phase 1: デザイン設計）**: 定型依頼事項および今回の特記事項を踏まえ、ラフ案（`doc/0.DTP/roughs/`）や素材（本番 `public/assets/` および `doc/0.DTP/assets/`）を検討・整理し、デザイン仕様書（`doc/0.DTP/`）を更新する。
2. **`swe1` → `swe2` → `swe3`**: 要求仕様書（`doc/1.SRS.md`, `doc/1.SRS/features/`）、アーキテクチャ設計書（`doc/2.ARCHITECTURE.md`）、詳細設計ノート（`doc/3.sw_design_notes/`）、実装ドキュメント（`doc/3.implementation/`）、ソースコード（`public/index.html`, `public/css/style.css`, `public/js/app.js` 等）および同梱サンプル（`public/samples/`）を更新する。
3. **`test`（E2E 自動検証）**: テスト仕様書（`doc/4.test_spec/`）と Playwright テスト（`tests/e2e.cjs`）を更新・実行し、全テストケースの合格とスクリーンショット（ゲラ）出力を確認する。特にビューモード切替（Split / Canvas）、図表倍率切替（Fit / 1:1）、多列テーブルの枠内収容など、表示崩れや動作逆転が起きやすい境界値の検証を含める。
4. **`dtp`（Phase 2: 校正・デザインチェック）**: 出力されたゲラを用いてデザイン仕様および校正チェックリストに照らして検査し、枠はみ出しや文字潰れ、倍率異常がないか目視確認したうえで校正結果（`work/dtp_review/`）を記録して校了とする。
5. **`commit` → PR 発行**: feature ブランチを作成し、Conventional Commits に従ってコミットを分割・push し、`gh pr create` で Pull Request を発行する。

## 6. `main` への反映

`main` への反映は branch-strategy スキルに従う。`.github/workflows/self-approve.yml` は同スキルのひな形から導入している。

- **Canary 反映（通常の開発 PR）**: 開発中の feature ブランチ（`release/*` 以外、非 Draft、最新の `main` にリベース済み）は、`lint` および `test` の CI が通過すると `.github/workflows/canary-auto-merge.yml` により `/self-approve` を経ずに自動で `main` へ fast-forward マージされる。マージ後は `.github/workflows/pages.yml` がテスト用 URL（`https://prankster-freedom.github.io/Lucivo/preview/`）へ Canary 版（`X.Y.Z-canary (build #N)`）をデプロイする。公開用 URL（`/`）は最新リリースタグのまま維持される
- **正式リリース（`release/*` ブランチ PR）**: 正式リリース時は `release/vX.Y.Z` ブランチから `main` 向け PR を発行し、ユーザーによる `/self-approve` を経て `main` へマージする（`GITHUB_TOKEN` によるマージ後は `workflow_run` で `.github/workflows/release.yml` と `pages.yml` が連鎖実行される）

### 6.1 リリース前の統合ブランチ（`feature/pre-test`）

- リリース前に複数の変更をまとめて試すときは、各 feature ブランチの PR を `feature/pre-test` に向けて出す。E2E テスト（`.github/workflows/e2e.yml`）は、`main` と `feature/pre-test` への PR で実行する
- 試し終えたら、`feature/pre-test` から `main` への PR を出して反映する
- 背景: `main` の履歴を書き換えずに、きれいに保つため。不具合の見つかった変更を `main` に入れてしまうと、直すために `main` の履歴を書き換えるか、修正のコミットを重ねることになる。`main` の手前の `feature/pre-test` で受け止め、`main` には確かめ終えた変更だけを入れる

### 6.2 feature ブランチの履歴整理

当面はリポジトリの関係者がユーザー本人のみであるため、ユーザーとの整合が取れていれば feature ブランチの履歴を書き換えてよい。Pull Request の発行時には、main に取り込まれる履歴として第三者から見て見通しが良くなるよう、細かな修正や試行錯誤のコミットを整理・集約してから PR を発行する。

## 7. Dependabot security updates（branch-strategy スキルの例外）

Dependabot security updates はオフにする。自動の PR は `package.json` と `package-lock.json` しか更新せず、配布物の `public/vendor/` と `public/js/app.js` の `EXPORT_URLS` が古いまま残るため。修正済みに見えて、利用者に配布される中身は直っていない状態になる。ライブラリの更新は、3 か所を揃えて手動で行う。

## 8. GitHub Release（release スキルの追加手順）

利用者には GitHub Release（スタンドアロン ZIP）および GitHub Pages（公開用 URL `/`）で配布する。モバイル版 Claude 等、`gh release create` 権限のない環境からでもリリースを完結できるよう、Release 作成と Pages 公開は GitHub Actions（`.github/workflows/release.yml`・`pages.yml`）で自動化する。

1. **リリース PR の作成（`release/v<版>` ブランチ）**: `package.json` の `"version"` と `README.md`（**Version** とリリースノート）のみを更新して `main` 向け PR を発行する（`public/js/app.js` は変更しないため E2E はスキップされる）。
2. **【承認】`/self-approve` によるマージ**: ユーザーが PR に `/self-approve` コメントをすると、`main` へマージされる。
3. **自動タグ・ZIP・GitHub Release 公開（`.github/workflows/release.yml`）**: `main` の `package.json` の `version` に対応するタグ `lucivo-v<版>` が未作成の場合、CI が自動で以下を実行する。
   - `LUCIVO_VERSION_OVERRIDE="<版> (build #<run_number>)"` でビルドし、`Lucivo-v<版>/` フォルダ構成の `Lucivo-v<版>.zip` を作成
   - タグ `lucivo-v<版>` を作成・push し、README の該当版の節＋ZIP ダウンロードリンクを本文にして GitHub Release（タイトル `Lucivo <版>`）を公開
4. **公開用 GitHub Pages の同期（`.github/workflows/pages.yml`）**: `Release` ワークフローの完了を受けて自動で起動し、公開用 URL（`https://prankster-freedom.github.io/Lucivo/`）を `lucivo-v<版>`（`<版> (build #<run_number>)`）へ更新する。
5. **公開後の確認**: GitHub Release ページのリリースノート本文（ZIP 案内および `README.md` の該当版の節が欠落なく反映されていること）、`Lucivo-v<版>.zip` を展開して `index.html` が開けること、および公開用 URL が新しい版で開けることを確かめる。
