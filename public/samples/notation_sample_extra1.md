---
# YAML フロントマター
title: Lucivo Markdown 発展・詳細記法サンプル
description: CommonMark 0.31.2・GitHub Flavored Markdown (GFM)・Daring Fireball・Squarespace に基づく詳細記法とエッジケースのサンプル
tags: ["Lucivo", "Markdown", "CommonMark", "GFM"]
author:
  name: Lucivo
  role: sample
draft: false
---

# Lucivo Markdown 発展・詳細記法サンプル

CommonMark 0.31.2、GitHub Flavored Markdown (GFM)、John Gruber による Markdown 構文仕様、および Squarespace の仕様に準拠した、より高度・詳細な記法やエッジケースのサンプルです。

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

通常のインラインリンクのほか、URL を末尾で一括定義する参照リンク記法をサポートしています。

- インラインリンク: [CommonMark 仕様書](https://spec.commonmark.org/0.31.2/ "CommonMark 0.31.2")
- タイトル付きインラインリンク: [GitHub GFM ブログ](https://github.blog/2017-03-14-a-formal-spec-for-github-flavored-markdown/ "A formal spec for GFM")
- 参照リンク（明示的ラベル）: [Daring Fireball の構文解説][df-syntax]
- 参照リンク（省略表記・大文字小文字不問）: [GFM-Spec]
- 自動リンク: <https://daringfireball.net/> および <mailto:info@example.com>

[df-syntax]: https://daringfireball.net/projects/markdown/syntax "Daring Fireball Markdown Syntax"
[gfm-spec]: https://github.github.com/gfm/ "GitHub Flavored Markdown Spec"

## 3. 強調とコードのエッジケース

記号の組み合わせや単語内での強調、バッククォートを含むコード片の表現です。

- アスタリスクによる強調: *斜体*、**太字**、***太字と斜体***
- アンダースコアによる強調: _斜体_、__太字__、___太字と斜体___
- 単語の一部を強調: un*frigging*believable
- アンダースコアは識別子内では強調にならない（GFM 規則）: `user_name_variable_foo`
- チルダによる打ち消し線: ~~取り消されたテキスト~~、~1 本チルダ~
- バッククォートを含むインラインコード（2 重バッククォートで囲む）: `` `code` with backtick ``
- 前後に空白を持つインラインコード: `` ` $HOME ` ``

## 4. 複合リストとネスト構造

段落、引用、コードブロックを含む複雑なリスト構造です。

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

3. 番号 3 から始まるリスト
4. 連番の次の項目

- [x] 設計書のレビューを完了
- [ ] テスト仕様書の更新
- [ ] E2E テストの実行と検証

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

チルダ `~~~` によるコードブロックや、言語メタデータの指定です。

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

列ごとの寄せ、外枠パイプの有無、セル内のインライン装飾の確認です。

| 項目名 (左寄せ) | 分類 (中央寄せ) | 数量 (右寄せ) | 状態               |
| :-------------- | :-------------: | ------------: | :----------------- |
| **Lucivo Core** | App             | 1             | `Active`           |
| *Vendor Libs*   | Script          | 4             | ~~Deprecated~~     |
| KaTeX Math      | Typography      | 100           | <mark>Ready</mark> |

外枠のパイプ `|` を省略した形式（GFM サポート）:

ヘッダー 1 | ヘッダー 2 | ヘッダー 3
:--- | :---: | ---:
項目 A | 中央 A | 100
項目 B | 中央 B | 200

## 9. 安全な HTML 要素とセマンティクス

Markdown 本文内に埋め込み可能な、サニタイズを通過するセマンティック HTML 要素です。

<dl>
  <dt><strong>CommonMark</strong></dt>
  <dd>Markdown の曖昧さを排除し、厳密な仕様とテストスイートを定義した標準規格。</dd>
  <dt><strong>GFM (GitHub Flavored Markdown)</strong></dt>
  <dd>CommonMark をベースに、表やタスクリスト、打ち消し線、自動リンクなどの実用拡張を加えた GitHub の標準仕様。</dd>
</dl>

短縮表記 <abbr title="HyperText Markup Language">HTML</abbr>、キーボード入力 <kbd>Shift</kbd> + <kbd>Tab</kbd>、注記 <small>※ 画面上の表示はスタイルにより最適化されます。</small>
