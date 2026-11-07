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

dtp スキルの本番素材の置き場所 `<プロジェクト>/assets/` は、本リポジトリでは `public/assets/` と読み替える。

ドキュメントの本文で `js/app.js` のように書いたソースのパスは、`public/` からの相対パスである。

## 3. ローカル開発環境

- 初期設定は `npm install`、Chromium の導入は `npx playwright install chromium`
- 開発 PC は Windows。シェルは Git Bash と PowerShell を使える
- Python は uv で管理する（`uv python install --default` で、`python` / `python3` が uv の Python を指す）。`python` が Microsoft Store を開くだけの場合は、WindowsApps の仮のファイルが先に見つかっているため、`uv python list --only-installed` で確認する。パッケージが必要なときは `uv run --with <パッケージ>` を使う
- バックスラッシュ・バッククォート・`$` を含む内容（正規表現、TeX、テンプレートリテラルなど）は、シェルのヒアドキュメントや `node -e` の引数で書かない。ファイルの作成・編集は、エディタ系のツール（AI エージェントのファイル編集機能など）で行う。ヒアドキュメント経由で `\\` が `\` に変わり、スクリプトや数式が壊れたことがある
  - Python や sed などの文字列に置換の内容を埋め込んで回避しない。Python の通常の文字列では `\b` がバックスペース（0x08）に変わり、警告も出ない。一括の置換が必要なときは、置換の内容をエディタ系のツールで書いたファイルから読む
  - ツールの警告（Python の `SyntaxWarning` など）は誤りとして扱い、原因を直してから進める
  - `npm run lint` で、制御文字、正規表現の中の制御文字、見えない空白を検出する（CI の `lint` ジョブ）。見えない文字が必要なときは `﻿` のようにエスケープで書く
- ブラウザでの動作確認は `npm test`（`node tests/e2e.cjs`）で行う。`public/index.html` を `file://` で開き、Playwright（Chromium）で確認する
  - 特定の機能やテストケースだけを確認・再テストするときは、`node tests/e2e.cjs <関数名またはTC ID>`（例: `node tests/e2e.cjs TC-SHOW-011`、`node tests/e2e.cjs testCoverAndTables`）で対象スイートだけを部分実行する（`work/test/results.json` は該当 TC の結果だけが差分更新される）。`node -e` のワンライナーでテストコードを実行しない
- Markdown ファイル内の表整形には `node agents-support-tools/md-table-align/align-tables.cjs <Markdown ファイル>` を使用する

## 4. 版番号（`AGENTS.md` 1.9・release スキルの例外）

- ユーザーから `1.0.0` に上げる指示があるまで、版を `0.y.z` に保つ。この間は、MAJOR に当たる変更（`!` または `BREAKING CHANGE:` を含むコミット）があっても MINOR を上げ、PATCH を 0 に戻す。`feat` は MINOR、`fix` は PATCH を上げる（通常どおり）
- 背景: `1.0.0` は、ユーザーが製品の仕様がある程度固まったと判断した時点で上げる。それまでは仕様の変更が多く、互換性のない変更のたびに MAJOR を上げると版の意味が薄れるため（Semantic Versioning 2.0.0 の `0.y.z` は初期開発の段階を表す）
- コミットの型（`feat!` など）と `BREAKING CHANGE:` は、通常どおり変更の内容に合わせて付ける。リリースノートでは、互換性のない変更であることを明記する

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

## 7. Dependabot security updates（branch-strategy スキルの例外）

Dependabot security updates はオフにする。自動の PR は `package.json` と `package-lock.json` しか更新せず、配布物の `public/vendor/` と `public/js/app.js` の `EXPORT_URLS` が古いまま残るため。修正済みに見えて、利用者に配布される中身は直っていない状態になる。ライブラリの更新は、3 か所を揃えて手動で行う。
