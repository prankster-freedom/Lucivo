---
# YAML フロントマター
title: Lucivo Markdown 発展・詳細記法サンプル
description: CommonMark 0.31.2・GitHub Flavored Markdown (GFM)・Daring Fireball・HTML 要素・スタイリングに基づく詳細記法とエッジケースのサンプル
tags: ["Lucivo", "Markdown", "CommonMark", "GFM", "HTML", "Style"]
author:
  name: Lucivo
  role: sample
draft: false
---

# Lucivo Markdown 発展・詳細記法サンプル

CommonMark 0.31.2、GitHub Flavored Markdown (GFM)、John Gruber による Markdown 構文仕様、および HTML5 セマンティクス・インラインスタイリングに準拠した、より高度・詳細な記法やエッジケースのサンプルです。

## 1. 見出しの詳細構文（ATX と Setext）

ATX 形式の見出しでは `#` の直後に空白が必要です。また行末の `#`（クローズ）は無視されます。

# レベル 1 見出し（#）

## レベル 2 見出し（##）

### レベル 3 見出し（###）

#### レベル 4 見出し（####）

##### レベル 5 見出し（#####）

###### レベル 6 見出し（######）

### 行末に # を置く ATX 形式 ###

Setext 形式の見出しは、テキストの下に `=` または `-` を 1 つ以上並べて表します。

Setext レベル 1 見出し
======================

Setext レベル 2 見出し
----------------------

## 2. リンクと参照リンク（Reference Links）

通常のインラインリンクのほか、URL を末尾で一括定義する参照リンク記法や GFM 拡張自動リンクをサポートしています。

- インラインリンク: [CommonMark 仕様書](https://spec.commonmark.org/0.31.2/ "CommonMark 0.31.2")
- タイトル付きインラインリンク: [GitHub GFM ブログ](https://github.blog/2017-03-14-a-formal-spec-for-github-flavored-markdown/ "A formal spec for GFM")
- 参照リンク（明示的ラベル）: [Daring Fireball の構文解説][df-syntax]
- 参照リンク（省略表記・大文字小文字不問）: [GFM-Spec]
- 標準の山括弧自動リンク: <https://daringfireball.net/> および <mailto:info@example.com>
- GFM 拡張自動リンク（Extended Autolinks: `<>` なしで自動認識）:
  - Web URL: <https://github.com/prankster-freedom/Lucivo>
  - `www` 始まりのドメイン: <www.github.com>
  - メールアドレス: <support@example.com>

[df-syntax]: https://daringfireball.net/projects/markdown/syntax "Daring Fireball Markdown Syntax"
[gfm-spec]: https://github.github.com/gfm/ "GitHub Flavored Markdown Spec"

## 3. 強調とコードのエッジケース

記号の組み合わせや単語内での強調、バッククォートを含むコード片、カラーコードの表現です。

- アスタリスクによる強調: *斜体*、**太字**、***太字と斜体***
- アンダースコアによる強調: *斜体*、**太字**、***太字と斜体***
- 単語の一部を強調: un*frigging*believable
- アンダースコアは識別子内では強調にならない（GFM 規則）: `user_name_variable_foo`
- チルダによる打ち消し線: ~~取り消されたテキスト（2本チルダ）~~、~1 本チルダ~
- バッククォートを含むインラインコード（2 重バッククォートで囲む）: `` `code` with backtick ``
- 前後に空白を持つインラインコード: `` ` $HOME ` ``
- GFM カラーコード（インラインコード内のカラー指定）:
  - HEX 6 桁: `#0969da`、`#2da44e`、`#cf222e`、`#bf8700`
  - HEX 3 桁 / 8 桁: `#fff`、`#00000080`
  - RGB / RGBA: `rgb(9, 105, 218)`、`rgba(45, 164, 78, 0.4)`
  - HSL / HSLA: `hsl(212, 92%, 45%)`、`hsla(356, 72%, 46%, 0.5)`

## 4. 複合リストとネスト構造

段落、引用、コードブロックを含む複雑なリスト構造、および GFM タスクリストです。

1. 第 1 項目: 概要説明

   インデントされた 2 つ目の段落です。CommonMark 規則によりリスト項目内に複数の段落を含められます。

2. 第 2 項目: コード例を含む項目

   ```bash
   git clone https://github.com/prankster-freedom/Lucivo.git
   cd Lucivo
   ```

3. 第 3 項目: 引用を含む項目
   > リスト項目の中でもブロック引用を記述できます。

   - ネストされた箇条書き A
   - ネストされた箇条書き B

4. 3 以外の開始番号を持つリスト:

5. 番号 3 から始まるリスト
6. 連番の次の項目

### GFM タスクリスト（チェックボックスの階層化）

- [x] 要求仕様書（SRS）の作成完了
- [x] アーキテクチャ設計書（ADS）のレビュー完了
- [ ] 実装とテスト
  - [x] コンポーネントの単体テスト
  - [ ] E2E 自動検証（Playwright）
  - [ ] 視覚的なデザイン校正（DTP レビュー）
- [ ] ~~スコープ外となった検討事項~~（打ち消し線付きタスク）

## 5. ブロック引用の発展形

複数段落や他の要素を包含する引用、および引用の怠惰な継続（Lazy continuation）です。

> ブロック引用の第 1 段落です。
> 行頭に `>` を配置して引用を表現します。
>
> 複数段落にまたがる場合は、空行にも `>` を置きます。
>
> - 引用内の箇条書き項目 1
> - 引用内の箇条書き項目 2
>
> ```javascript
> // 引用内のコードブロック
> console.log("Quoted Code");
> ```

> 引用の怠惰な継続（Lazy continuation）: 行頭の `>` を 2 行目以降で
省略しても、空行に達するまでは同一のブロック引用として継続されます。

## 6. フェンスコードブロックとインデントコード

チルダ `~~~` によるコードブロック、言語メタデータ、および `diff` による差分シンタックスハイライトです。

```html
<!-- HTML コードのサンプル -->
<div class="user-profile">
  <span class="user-name">Lucivo User</span>
</div>
```

~~~python
# チルダによるコードブロック
def calculate_fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
~~~

    // 4 スペースインデントによるコードブロック（CommonMark 標準）
    function indentCodeBlock() {
      return 100;
    }

### 差分コードブロック（diff ハイライト）

変更内容を色分けして分かりやすく表現するための `diff` シンタックスハイライトです。

```diff
  // 変更前のコンテキスト
- const legacyRender = (data) => renderText(data);
+ const modernRender = (data) => renderWithKatexAndMermaid(data);
! 注意: ここで依存関係の初期化順序が変更されています
@@ -10,4 +10,4 @@
```

## 7. 特殊文字のエスケープと実体参照

Markdown のメタ記号をそのまま出力するためのバックスラッシュエスケープ（CommonMark 規則）と実体参照です。

- エスケープ可能な ASCII 記号:
  - アスタリスク: \*asterisk\*
  - アンダースコア: \_underscore\_
  - 角括弧: \[link text\]
  - 波括弧: \{brace\}
  - 丸括弧: \(parenthesis\)
  - ナンバー記号: \# heading
  - プラス・マイナス: \+ plus, \- minus
  - ドット: 1\. not a list
  - 感嘆符: \!not an image
  - バッククォート: \`not code\`
  - チルダ: \~not strike\~
  - パイプ: \|not table\|
- HTML 実体参照（Named Entity）: &copy; 2026 Lucivo, &amp;, &lt;, &gt;, &quot;
- 16 進実体参照: &#x2208; （$\in$）, &#x2211; （$\sum$）

## 8. 高度な表（テーブル）のバリエーション

列ごとの寄せ、外枠パイプの有無、セル内での改行やパイプのエスケープ、複合装飾の確認です。

| 項目名 (左寄せ) | 分類 (中央寄せ) | 数量 (右寄せ) | 状態・メモ         |
| :-------------- | :-------------: | ------------: | :----------------- |
| **Lucivo Core** | App             | 1             | `Active`           |
| *Vendor Libs*   | Script          | 4             | ~~Deprecated~~     |
| KaTeX Math      | Typography      | 100           | <mark>Ready</mark> |

外枠のパイプ `|` を省略した形式（GFM サポート）:

ヘッダー 1 | ヘッダー 2 | ヘッダー 3
:--- | :---: | ---:
項目 A | 中央 A | 100
項目 B | 中央 B | 200

### セル内での改行・パイプエスケープ・複合要素

表のセルの中に改行を入れる場合は `<br>` を使い、パイプ文字を含める場合は `\|` でエスケープします。

| 機能名           | エスケープと改行の例                                       | 複合装飾                         |     |
| :--------------- | :--------------------------------------------------------- | :------------------------------- | --- |
| **パイプのエスケープ** | コマンド: `ls \                                      | grep .md`                        | [詳細リンク](https://github.com/) |
| **セル内複数行** | 1 行目の説明テキスト<br>2 行目の補足情報<br>3 行目の注意点 | - 箇条書き風 1<br>- 箇条書き風 2 |     |
| **タスク・状態** | チェックボックス表現: `[x]` 完了 / `[ ]` 未着手            | <span style="color: #16a34a; font-weight: bold;">● 正常稼働</span> |  |

## 9. 安全な HTML 要素とセマンティクス

Markdown 内に記述可能な、XSS サニタイズ（DOMPurify）を安全に通過する標準 HTML5 要素です。

### 9.1 インラインテキスト装飾・タイポグラフィ

- 挿入・下線: <ins>新しく挿入されたテキスト（ins）</ins>、<u>下線装飾（u）</u>
- 削除・打ち消し: <del>削除された記述（del）</del>、<s>取り消し線（s）</s>
- 蛍光ペン風マーカー: <mark>ハイライトされた重要語句</mark>
- 上付き・下付き: 2<sup>10</sup> = 1024、化学式 H<sub>2</sub>SO<sub>4</sub>、基底状態 $S$<sub>0</sub>
- 小さい注記・免責文: <small>※ 記載されている社名・製品名は各社の商標または登録商標です。</small>
- 略語とツールチップ: <abbr title="GitHub Flavored Markdown">GFM</abbr>、<abbr title="Application Programming Interface">API</abbr>
- 定義と引用: <dfn>Markdown</dfn> は軽量マークアップ言語です。<cite>CommonMark Spec 0.31.2</cite> によると、インライン構造は厳密に規定されています。短文引用: <q>Simplicity is prerequisite for reliability.</q>
- 日時セマンティクス: リリース日 <time datetime="2026-11-12">2026 年 11 月 12 日</time>
- ふりがな（ルビ）: <ruby>展示品質<rt>てんじひんしつ</rt></ruby>、<ruby>組版<rp>（</rp><rt>くみはん</rt><rp>）</rp></ruby>
- 改行可能ポイント: 超長文字列の折り返し位置を指定する <wbr> タグ: `VeryLongIdentifier<wbr>NameThatCanBe<wbr>BrokenAcrossLines`

### 9.2 コンピュータ・コード表現

- キーボード入力（kbd）: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>、<kbd>Cmd</kbd> + <kbd>K</kbd>、単一キー <kbd>Enter</kbd>
- 出力サンプル（samp）: コマンドの出力結果 <samp>Build succeeded in 70ms (0 errors, 0 warnings)</samp>
- 変数表現（var）: 物理方程式の変数 <var>E</var> = <var>m</var><var>c</var><sup>2</sup>、関数の引数 <var>x</var>, <var>y</var>
- 定義リスト（dl / dt / dd）:
  <dl>
    <dt><strong>CommonMark</strong></dt>
    <dd>Markdown の曖昧さを排除し、厳密な仕様とテストスイートを定義した標準規格。</dd>
    <dt><strong>GFM (GitHub Flavored Markdown)</strong></dt>
    <dd>CommonMark をベースに、表やタスクリスト、打ち消し線、自動リンクなどの実用拡張を加えた GitHub の標準仕様。</dd>
  </dl>

### 9.3 開閉可能な詳細ブロック（details / summary）

クリックして開閉できる折りたたみセクションです。初期状態で開く `open` 属性や入れ子構造にも対応します。

<details>
<summary><strong>詳細設定（クリックで展開）</strong></summary>

折りたたみの内部には、通常の Markdown 構文（段落・リスト・コード）を空行を挟んで記述できます。

- 項目 1: 自動レンダリングの有効化
- 項目 2: キャッシュの保持期間設定

```json
{
  "cache": true,
  "timeout": 3000
}
```

</details>

<details open>
<summary><strong>既定で開いているブロック（details open）</strong></summary>

`open` 属性を付与すると、読み込み直後から開いた状態で表示されます。重要な注記を最初から見せつつ、読者が折りたためるようにする場合に便利です。
</details>

<details>
<summary><strong>多重ネストした開閉ブロック</strong></summary>

親の詳細ブロックです。

<details style="margin-left: 1rem; border-left: 2px solid var(--border-strong); padding-left: 0.5rem;">
<summary>入れ子の第 2 階層</summary>

深層のオプションや高度なパラメーターを整理できます。
</details>
</details>

### 9.4 高度な HTML テーブル（セル結合とレイアウト）

Markdown のパイプ表では表現できない、縦方向（`rowspan`）や横方向（`colspan`）のセル結合を持つ表です。

<table>
  <caption>表 1: コンポーネント構成と動作環境マトリクス</caption>
  <thead>
    <tr>
      <th rowspan="2">レイヤー</th>
      <th colspan="2">エンジン</th>
      <th rowspan="2">実行環境</th>
      <th rowspan="2">備考</th>
    </tr>
    <tr>
      <th>名称</th>
      <th>バージョン</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">文書解析</td>
      <td>marked</td>
      <td>18.1.3</td>
      <td>ブラウザ単体</td>
      <td>GFM 完全準拠</td>
    </tr>
    <tr>
      <td>DOMPurify</td>
      <td>3.4.17</td>
      <td>ブラウザ単体</td>
      <td>XSS サニタイズ</td>
    </tr>
    <tr>
      <td rowspan="2">可視化</td>
      <td>Mermaid</td>
      <td>12.3.0</td>
      <td>SVG レンダリング</td>
      <td>18 種類のダイアグラム</td>
    </tr>
    <tr>
      <td>KaTeX</td>
      <td>0.19.1</td>
      <td>HTML / MathML</td>
      <td>TeX 準拠の高速数式描画</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3">合計: 4 コアライブラリ</td>
      <td colspan="2">すべてローカル同梱（完全オフライン稼働）</td>
    </tr>
  </tfoot>
</table>

### 9.5 図版とテーマ切り替えメディア（figure / picture）

図版とキャプション（説明文）を意味的に一体化する `<figure>` / `<figcaption>`、および OS のライト/ダークテーマに応じて画像を自動で切り替える `<picture>` 記法です。

<figure style="margin: 1.5rem 0; text-align: center;">
  <svg width="280" height="50" viewBox="0 0 280 50" style="display: inline-block;">
    <rect width="280" height="50" rx="8" fill="var(--panel-sub)" stroke="var(--border-strong)"/>
    <text x="140" y="30" text-anchor="middle" fill="var(--text-primary)" font-size="13" font-weight="600">Figure Illustration (SVG)</text>
  </svg>
  <figcaption style="font-size: 0.85em; color: var(--text-secondary); margin-top: 0.5rem;">
    図 1: セマンティックな図版とキャプションの一体化表現
  </figcaption>
</figure>

ダークモード連動画像（GitHub と同じ `<picture>` 構文の書き方）:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/diagram-dark.svg">
  <img src="images/diagram-light.svg" alt="テーマ連動ダイアグラム">
</picture>
```

## 10. 色とインラインスタイリング（HTML style 属性）

DOMPurify により安全性が検証された `style` 属性を使用して、特定の文字色、背景色のハイライト、枠線ボックス、バッジ風の表示を作成できます。

### 10.1 インライン文字色とタイポグラフィ

- 単色の文字色: <span style="color: #e11d48; font-weight: bold;">危険・エラー（赤色）</span>、<span style="color: #2563eb; font-weight: bold;">情報・プライマリ（青色）</span>、<span style="color: #16a34a; font-weight: bold;">成功・正常（緑色）</span>、<span style="color: #d97706; font-weight: bold;">警告・注意（橙色）</span>
- パステル調の背景ハイライト:
  - <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Critical Alert</span>
  - <span style="background-color: #e0f2fe; color: #075985; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Info Notice</span>
  - <span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Passed 100%</span>
  - <span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Pending Review</span>
- 装飾下線: <span style="text-decoration: underline wavy #3b82f6; text-underline-offset: 4px;">波線の下線で強調されたフレーズ</span>

### 10.2 ステータスバッジとピル表示

丸みを持たせたラベルやステータスピルを文中で利用できます。

- ステータス: <span style="display: inline-block; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; background: #2563eb; color: #ffffff;">v0.6.0 RELEASE</span>
- バージョン比較: <span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; background: rgba(100, 116, 139, 0.15); color: var(--text-primary); border: 1px solid var(--border-subtle);">LTS</span>
- 難易度バッジ: <span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: #16a34a;">難易度: 低</span>

### 10.3 カスタム情報ブロック（装飾枠）

標準のアラートとは異なる独自デザインの情報パネルや引用ボックスです。

<div style="border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 1rem 0; background: rgba(59, 130, 246, 0.08); border-radius: 0 8px 8px 0;">
  <strong style="color: #2563eb;">カスタムインフォメーション</strong><br>
  CSS 変数（<code>var(--text-primary)</code>）や透過色を活用することで、Light モードと Dark モードの双方で自然に馴染む情報ボックスを構築できます。
</div>

<div style="border: 1px solid var(--border-strong); padding: 14px 18px; margin: 1rem 0; border-radius: 8px; background: var(--panel-sub);">
  <div style="font-weight: 700; margin-bottom: 6px;">カード型コンテナ</div>
  境界線と角丸を持たせたカード形式で、関連する設計上の決定事項や前提条件をグループ化して提示できます。
</div>

## 11. 脚注（GFM Footnotes）

文中の補足説明や出典情報を末尾に集約するための GFM 標準脚注記法です。

本文の文末で脚注を参照します[^1]。英数字ラベルの脚注も指定可能です[^gfm-ref]。
さらに、補足説明や用語定義を記載した脚注も作成できます[^note-detail]。同じ脚注を別の場所から再参照[^1] することもできます。

[^1]: 数値マーカーを用いた標準的な脚注です。
[^gfm-ref]: GitHub Flavored Markdown Spec の Footnotes 仕様に準拠しています。
[^note-detail]: 文末の注釈や用語定義、出典リンク [GFM Spec](https://github.github.com/gfm/) などを記載できます。

## 12. 絵文字（Emoji Shortcodes と Unicode）

GitHub で広く使用される `:shortcode:` 形式の絵文字および標準 Unicode 絵文字です。

- ステータス・通知: :white_check_mark: 完了、:warning: 警告、:x: 失敗、:bulb: ヒント、:speech_balloon: コメント
- プロダクト・開発: :rocket: リリース、:tada: お祝い、:sparkles: 新機能、:art: デザイン、:memo: ドキュメント、:bug: 不具合修正
- アクション・感情: :+1: 賛成、:-1: 反対、:eyes: レビュー中、:zap: 高速化、:lock: セキュリティ
- Unicode ネイティブ絵文字: ✨ 🚀 🎨 📝 💡 ⚠️ ✅ 🔍 📊

## 13. GitHub アラート（コールアウト）

引用の最初の行に `[!NOTE]`・`[!TIP]`・`[!IMPORTANT]`・`[!WARNING]`・`[!CAUTION]` だけを書くと、GitHub と同じ 5 種類の注意書きのパネルになります。マーカーの大文字・小文字は問いません。同じ Markdown は GitHub 上でも注意書きとして表示されます。

> [!NOTE]
> 読み飛ばしてほしくない補足です。**強調**・`コード`・[リンク](https://github.com/prankster-freedom/Lucivo) もそのまま使えます。

> [!TIP]
> 作業を楽にするヒントです。エディタで別の章へカーソルを動かすと、プレビューがその章まで送られます。

> [!IMPORTANT]
> 目的を果たすために欠かせない情報です。
>
> 段落を分けたり、箇条書きを入れたりできます。
>
> - 1 つ目の要点
> - 2 つ目の要点

> [!WARNING]
> すぐに注意が必要な、問題を防ぐための情報です。

> [!caution]
> 操作の危険やリスクを伝えます（マーカーは小文字でも認識されます）。

次の 2 つは、通常の引用のまま表示されます（GitHub と同じ）。

> [!NOTE] マーカーの後ろに同じ行で文字が続く引用

> [!HINT]
> 5 種類以外のマーカーの引用

## 14. 画像と、別の文書へのリンク

画像と別の Markdown へのリンクは、この文書のある場所（`samples` フォルダ）を基準にした相対パスで書けます。同梱サンプルとして開いたとき、または「開く」→「フォルダを開く…」で開いたフォルダの文書で使えます。

Markdown の記法で書いた画像:

![Markdown を Lucivo で誌面と発表に組む流れ](images/lucivo-flow.svg)

HTML で、幅を指定して書いた画像:

<img src="images/lucivo-flow.svg" alt="幅 320px で表示した流れの図" width="320">

別の Markdown へのリンクは、Lucivo の中で開きます。`#` の後に見出しを書くと、その見出しへ移ります。

- [記法サンプル（notation_sample.md）](notation_sample.md)
- [記法サンプルの「6. 表」](notation_sample.md#6-表)
- [Visualモードサンプル（visual-sample.md）](visual-sample.md)
- [この文書の「2. リンクと参照リンク」](#2-リンクと参照リンクreference-links)

## 15. フォルダ構成のツリー

罫線（`├` `└` `│`）で書いたフォルダ構成は、線を引き直したツリーとして表示します。`tree` コマンドの出力をそのまま貼れます。行末の `#`・`←` の後ろは注釈として、右の列にそろえます。

```
lucivo/
├── index.html
├── css/
│   └── style.css      # 見た目
├── js/
│   ├── app.js         # 本体
│   └── stage.js       ← 発表の演出
└── samples/
    ├── notation_sample.md
    └── images/
        └── lucivo-flow.svg
```

コードブロックで囲まずに、段落として書いても表示します。

資料
├企画書.md
├画像フォルダ
│└全体図.png
└議事録.md

字下げだけで書くときは、言語名に `tree` を付けます。書いたまま見せたいときは、言語名に `text` を付けます。

```tree
docs/
  guide/
    intro.md
  images/
    flow.png
```

## 16. 数式の補足グラフ（Visualモード）

インライン数式やブロック数式で書かれた 1 変数の関数（$y = f(x)$）を自動で見つけ、Visualモードに切り替えたときにプロット計算して PNG ラスター画像に変換し、数式と併記で補足グラフを表示します（高速モードでは数式のみを表示します）。

### 16.1 グラフ化の対応状況一覧

| カテゴリ         | 記法・関数                                                             | グラフ化 | 備考                                   |
| :--------------- | :--------------------------------------------------------------------- | :------: | :------------------------------------- |
| **対象変数**     | 単一変数 $x$（$y = f(x)$ または $f(x) = \dots$）                       | ○        | インラインおよびブロック数式の両方で認識 |
| **三角関数**     | $\sin, \cos, \tan, \arcsin, \arccos, \arctan, \sinh, \cosh, \tanh, \sec, \csc, \cot$ | ○ | $\sin(x)$ や $\sin 2x$、$\sin^2 x$ に対応 |
| **初等関数**     | 多項式（$x^n$）、指数（$\exp, e^x$）、自然対数・常用対数（$\ln, \log$）、平方根（$\sqrt{x}$） | ○ | 四則演算、分数（`\frac`）、絶対値（$\lvert x \rvert$）を含む |
| **特殊関数**     | $\mathrm{sinc}(x) = \frac{\sin x}{x}$、$\mathrm{abs}, \mathrm{floor}, \mathrm{ceil}, \mathrm{sign}$ | ○ | 定義域に応じた不連続点・極限値の安全な描画 |
| **定義域指定**   | $\quad (A \le x \le B)$ または $\quad (x \in [A, B])$                  | ○        | 数式末尾に指定してプロット範囲を限定   |
| **複数関数**     | `\begin{aligned} ... \end{aligned}`（最大 4 本）                       | ○        | スタイルテーマの 4 色パレットと連動して重ね合わせ |
| **微分方程式**   | 導関数・微分方程式（$y', y'', \frac{dy}{dt}, \partial$ など）          | ×        | KaTeX 数式組版のみ（グラフ生成対象外） |
| **積分・変換**   | 定積分（$\int$）、極限（$\lim$）、無限大（$\infty$）、ラプラス変換・フーリエ変換（$\mathcal{L}, \mathcal{F}$） | × | KaTeX 数式組版のみ（グラフ生成対象外） |
| **多変数・構造** | 多変数関数（$f(x, y)$）、行列（`pmatrix` など）、連立方程式（`cases`） | ×        | KaTeX 数式組版のみ（グラフ生成対象外） |

### 16.2 グラフ化に対応している数式例

#### 16.2.1 基本的な初等関数（インライン表示）

本文中のインライン数式でも、数式のすぐ横にコンパクトな補足グラフが添えられます。

- **三角関数**: 正弦波 $y = \sin(x)$、余弦波 $y = \cos(x)$
- **多項式・二次関数**: 放物線 $f(x) = x^2 - 2x + 1$、二次曲線 $y = x^2 - 4x + 3$
- **指数関数**: ガウス曲線 $y = \exp(-x^2)$、指数減衰 $y = e^{-0.5x}$
- **対数・平方根**: 自然対数 $y = \ln(x)$、平方根 $y = \sqrt{x}$

#### 16.2.2 定義域（範囲指定）を添えた数式（ブロック表示）

数式の末尾に `\quad (-5 \le x \le 5)` や `\quad (x \in [-5, 5])` 形式で定義域を指定できます。

- **多項式と範囲指定（$x \in [-5, 5]$）**:

$$
y = x^2 - 2x + 1 \quad (x \in [-5, 5])
$$

- **正弦波と明示的な範囲指定（$-2\pi \le x \le 2\pi$）**:

$$
y = \sin(x) \quad (-2\pi \le x \le 2\pi)
$$

- **Sinc 関数（減衰振動）と広域定義域（$-4\pi \le x \le 4\pi$）**:

$$
f(x) = \frac{\sin(x)}{x} \quad (-4\pi \le x \le 4\pi)
$$

- **平方根関数と正の定義域**:

$$
y = \sqrt{x} \quad (0 \le x \le 16)
$$

#### 16.2.3 複数関数の重ね合わせプロット（`aligned` ブロック）

複数行（`aligned`）で複数の関数を書くと、Visualモードのスタイル配色（4 色）で重ねてプロットされます。

$$
\begin{aligned}
y &= e^{-0.3x}\sin(2x) \\
y &= e^{-0.3x} \\
y &= -e^{-0.3x}
\end{aligned}
$$

### 16.3 グラフ化対象外（KaTeX による数式表示のみ）となる高度な数式例

以下の数式は 1 変数の陽関数グラフ化の対象外として安全に判定され、Lucivo の高品位な KaTeX 数式組版のみが表示されます（グラフは自動生成されず、エラーにもなりません）。

- **2階線形微分方程式（減衰振動系）**:

$$
\frac{d^2y}{dt^2} + 2\zeta\omega_n \frac{dy}{dt} + \omega_n^2 y = 0
$$

- **ラプラス変換の定義**:

$$
\mathcal{L}\{f(t)\} = F(s) = \int_0^\infty f(t)e^{-st}\,dt
$$

- **フーリエ変換の定義**:

$$
\mathcal{F}\{f(t)\} = F(\omega) = \int_{-\infty}^\infty f(t)e^{-j\omega t}\,dt
$$

