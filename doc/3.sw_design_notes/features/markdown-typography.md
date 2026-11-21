---
title: Lucivo 詳細設計書 Markdown 要素の表示
description: Markdown から生成した要素（見出し、リスト、リンク、コード、引用、表、水平線、標準の HTML 要素）の表示（FR-009）の詳細設計。
tags: ["Lucivo", "詳細設計", "Markdown", "CSS"]
---

# Markdown 要素の表示（markdown-typography）

対応する要求: `FR-002`, `FR-003`, `FR-009`（[1.SRS.md](../../1.SRS.md) および [1.SRS/features/markdown-typography.md](../../1.SRS/features/markdown-typography.md)）／アーキテクチャ: [2.ARCHITECTURE.md](../../2.ARCHITECTURE.md) 4.4

## 1. 適用範囲と色の決め方

| ID        | 項目     | 設計                                                                                                                                               | 対応する要求 |
| :-------- | :------- | :------------------------------------------------------------------------------------------------------------------------------------------------- | :----------- |
| DD-MD-001 | 適用範囲 | `style.css` の「Markdown 要素」の節で、`:is(.prose-doc, .exhibition-slab)` の子孫の要素に適用する。高速モードと Visualモードの本文で同じ定義を使う | `FR-009`     |
| DD-MD-002 | 色       | 色は Light / Dark のデザイントークン（`--text-primary`, `--text-secondary`, `--text-muted`, `--panel-sub`, `--border-strong`, `--accent`）から取る。リンクの色はパレット（`--accent`）に連動する | `FR-009` |
| DD-MD-003 | 線の色   | 引用の左線・水平線・コードの枠など、背景と見分ける必要がある線は `--border-strong` を使う。`--border-subtle` は使わない                            | `FR-009`     |
| DD-MD-004 | 既存の定義 | 既存の `.prose-doc h1`, `.prose-doc h2`, `.exhibition-slab h2`, 表（`th`, `td`）の定義は変えない。`p` の下余白は、Visualモードの本文にも同じ値を適用する | `FR-002`, `FR-003` |

- **背景（DD-MD-003）**: Dark の Visualモードでは、本文のスラブの背景（`#1E293B`）と `--border-subtle`（`#1E293B`）が同じ色になり、線が見えなくなるため。

## 2. 要素ごとの表示

| ID        | 要素                                | 表示 |
| :-------- | :---------------------------------- | :--- |
| DD-MD-010 | 見出し `h3` / `h4` / `h5`, `h6`     | `h3`: 1.05rem・太さ 700・`--text-primary`。`h4`: 0.95rem・太さ 700・`--text-primary`。`h5`, `h6`: 0.875rem・太さ 700・`--text-muted`。上余白 1.25〜1.5rem、下余白 0.5rem |
| DD-MD-011 | 箇条書き・番号付きリスト            | `ul` は `disc`、入れ子は `circle`、さらに入れ子は `square`。`ol` は `decimal`。左余白 1.5rem で字下げする。記号・番号の色は `--text-muted` |
| DD-MD-012 | タスクリスト                        | チェックボックスを含む項目（`li:has(> input[type="checkbox"])`）は記号を出さず、チェックボックスを記号の位置に置く。チェックボックスは `appearance: none` で既定の見た目を消し、`1.05rem` 角・角丸 5px・枠 1.75px（`--check-c` を 40% 混ぜた `--border-strong`）で描く。チェックしたものは地と枠を `--check-c` にし、`::after` に白で `--icon-task-check`（`AST-117`、`assets/icons/task-check.svg` と同一の data URI）を `mask` で塗る。`--check-c` は高速モードが `--accent`、Visualモードが `--vs-c1` |
| DD-MD-013 | リンク                              | `--accent` の色、下線あり（下線との間隔 2px）。ポインターを重ねると下線を太くする |
| DD-MD-014 | インラインコード                    | 等幅フォント（JetBrains Mono）・0.85em、背景 `--panel-sub`、枠 1px `--border-strong`、角丸 4px、色 `--text-primary` |
| DD-MD-015 | コードブロック                      | `pre` に背景 `--panel-sub`、枠 1px `--border-strong`、角丸 10px、内側余白、横スクロールを付ける。`pre code` は DD-MD-014 の背景・枠・余白を打ち消す |
| DD-MD-016 | 引用                                | 左線 4px `--border-strong`、左の内側余白 1rem、色 `--text-secondary`（Dark で `--text-muted` は背景とのコントラストが不足するため）。入れ子の引用も同じ表示で、さらに字下げされる。背景は付けない |
| DD-MD-017 | 表の列の寄せ                        | `th` / `td` の `align` 属性（Marked が出力する `left` / `center` / `right`）に合わせて `text-align` を指定する |
| DD-MD-020 | 表の横幅収容と折り返し              | Marked のレンダラー（`setupMarkedBlocks()` の `renderer.table`、`markdown/block-renderers.ts`）が、Markdown の表を最初から `<div class="table-container">`（`width: 100%; max-width: 100%; overflow-x: auto;`）で包む。あわせて `th, td` の折り返しを `word-break: normal !important; overflow-wrap: break-word !important;`、セル内コード（`:is(th, td) code`）を `white-space: nowrap;` とし、識別子の途中改行を防ぎつつ多列の表をスラブ・文書の版面幅に収め、最小幅を下回る狭い画面では `.table-container` 内で横スクロールさせる。Markdown に直接書かれた HTML の `<table>` はレンダラーを通らないため、本文にあるときだけ（`runtime.rawHtmlBlocks`）、`renderApp()` が従来どおり `wrapTables()` で包む |
| DD-MD-018 | 水平線                              | 枠線を消し、高さ 1rem・上下の余白 1.75rem。背景に、中央の幅 3.4rem を空けて両端へ透明に消える 1px の罫（`--border-strong` の `linear-gradient`）を引き、`::after`（幅 3rem・高さ 1rem、中央）に `--motif-hr-prism`（`AST-115`、`assets/motifs/hr-prism-divider.svg` と同一の data URI）を `mask` で置いて `--hr-c` で塗る。`--hr-c` は高速モードが `--accent`、Visualモードが `--vs-c1`。強制カラーモードでは、罫を `CanvasText` の 1px にし、飾りを `CanvasText` で塗る |
| DD-MD-019 | 標準の HTML 要素                    | `details`: 枠 1px `--border-strong`・角丸 10px・内側余白。`summary`: 太さ 600・`--text-primary`・ポインター。`list-style: none` と `::-webkit-details-marker` の非表示で既定の三角を消し、`::before`（1rem 角）に `--icon-disclosure`（`AST-116`、`assets/icons/disclosure-chevron.svg` と同一の data URI）を `mask` で置いて `--details-c` で塗る。開くと `rotate: 90deg`（0.2s）。開閉は、`interpolate-size: allow-keywords` と `::details-content` の `block-size: 0 → auto`・`content-visibility`（`allow-discrete`）の 0.28s の遷移で動かす。`prefers-reduced-motion: reduce` と非対応のブラウザでは即時に開閉する。`--details-c` は高速モードが `--accent`、Visualモードが `--vs-c1` を文字色に寄せた色（地に `--vs-c1` を 4% 敷く）。`kbd`: 等幅フォント・枠 1px（下 2px）`--border-strong`・背景 `--panel-sub`。`mark`: Light は `#FDE68A`、Dark は `rgba(250, 204, 21, 0.35)` の背景に `--text-primary` の文字 |
| DD-MD-021 | コールアウトの判定と出力（markdown/block-renderers.ts） | Marked のレンダラー（`setupMarkedBlocks()` の `renderer.blockquote`）は、引用の最初の段落の最初のテキストトークンが `ALERT_MARKER_RE`（`[!NOTE]`・`[!TIP]`・`[!IMPORTANT]`・`[!WARNING]`・`[!CAUTION]`、大文字・小文字を問わない、後ろは改行か終わり）に一致するものだけを、`div.md-alert.md-alert-<種類>`（`role="note"`）として出力する。マーカーの文字（と直後の `br`）を除き、見える文字も画像・数式もなくなった最初の段落を除き、先頭に題の行 `p.md-alert-title`（アイコン `span.md-alert-icon` とラベル `Note` など）を置いて、引用の残りを続ける。マーカーでない引用は、標準の描画に任せる（`false` を返す）。出力した HTML は、ほかの HTML と一緒に 1 回だけサニタイズされる。Visualモードでは、HTML をつくる時点で `div.md-alert` になっているため、雛形の判定の前に置き換わっている。Markdown に直接書かれた HTML の `<blockquote>` はレンダラーを通らないため、本文にあるときだけ（`runtime.rawHtmlBlocks`）、従来の `decorateAlerts(container)`（サニタイズ後の DOM の書き換え）が同じ判定で置き換える |
| DD-MD-022 | コールアウトの表示（css/style.css） | `.md-alert` は `--alert-c`（種類ごとの意味の色。Light: `#2563EB`・`#059669`・`#7C3AED`・`#D97706`・`#DC2626`、Dark: `#60A5FA`・`#34D399`・`#A78BFA`・`#FBBF24`・`#F87171`）を持ち、左線 4px `--alert-c`、背景は `--alert-c` を 7%（Dark は 10%）混ぜた色、角丸 `0 10px 10px 0`、色 `--text-secondary`。題の行は JetBrains Mono・0.72rem・700・字間 0.14em・`text-transform: uppercase`、色 `--alert-ink`（Light は `--alert-c` 72% に `#0F172A` を混ぜる、Dark は `--alert-c`）。アイコンは `:root` の `--icon-alert-*`（`assets/icons/alert-*.svg` と同一の data URI）を `mask` で読み込み、1.4em 角を `--alert-c` で塗る |

- **背景（DD-MD-012・018・019、#197）**: 1px の直線・ブラウザ既定の三角・OS 既定のチェックボックスは、展示パネルの中で簡易ビューアーの部品に見える。素材は `mask` で使い、色を CSS の変数で塗るため、外観（Light / Dark）・パレット・Visualモードのスタイルに 1 つの素材で追従する。チェックマークを枠線の回転で描いていた Visualモードの描き方は、高速モードと形をそろえるために共通の `mask` の描き方へ移した。開閉の遷移を `::details-content` で書くのは、JavaScript で高さを測らずに済み、非対応のブラウザでは規則ごと無視されて即時の開閉に戻るため。
- **背景（DD-MD-016）**: コールアウト（`DD-MD-022`）は、意味の色の左線と背景を持つ。引用は背景を付けず灰色の左線にして、コールアウトと見分けられるようにする。
- **背景（DD-MD-020・021、#287）**: 表の包みとコールアウトは、以前は、HTML を作ってサニタイズして DOM に入れたあとに、DOM を走査して書き換えていた。DOM を書き換える方式は、Marked の版を上げても影響を受けにくく、判定が引用の最初の文字だけで済むという理由で選んだ。しかし、文書が大きいほど、すべての `table`・`blockquote` を探す走査と、要素の HTML の定義が 2 段に分かれることの保守の手間が増える。数式・絵文字・脚注は、すでに Marked の拡張で文字列の段階で出力している前例があるため、表の包みとコールアウトも、レンダラーで最初から出力する方式に改めた。解析（トークナイザー）は変えず、標準の引用・表として解析した結果のトークンを使うため、Marked の版を上げても影響を受けにくい点は保つ。判定は引用の最初のトークンだけを見るため、入力のたびの描画（`NFR-006`）を重くしない。出力した要素は、アプリが決めたクラスと文字だけを持ち、ほかの HTML と一緒にサニタイズされる（`role`・`aria-hidden` はサニタイザーの既定で許可されるため、許可の追加は要らない）ため、安全性（`NFR-003`）を損なわない。Visualモードで雛形の判定の前に置き換わるのは、`blockquote` のままだとコールアウトだけの章がステートメント型（`DTP-VTPL-050`）になるため。**採らなかった案**: 図の枠（`.lucivo-slot` の置き換え）も同じ増分でレンダラーへ移す案。図の枠は、SVG のキャッシュの状態（描画済みか描画待ちか）で中身が変わる。HTML に含めると、差分の再描画（#235）がブロックの HTML をキャッシュする前提（キャッシュの状態によらず HTML が同じ）が崩れるため、別の増分で扱う。
- **背景（DD-MD-022）**: ラベルは小さな太字のため、Light で意味の色をそのまま使うと琥珀（`#D97706`）などは白地とのコントラストが不足する。濃紺を混ぜて読みやすさを確保する。ラベルの文字を DOM で大文字にしないのは、コピーした文字が `NOTE` のように叫び調にならないようにするため。
- **背景（DD-MD-017）**: 既存の `th, td { text-align: left; }` が `align` 属性より優先され、すべて左寄せになっていた。属性セレクタ（`td[align="center"]` など）は詳細度が高いため、既存の定義を変えずに上書きできる。
- `sub` / `sup`、`strong`、`em`、`del` は、Tailwind の Preflight が初期化しない（または表示用の値を定義している）ため、追加の定義は不要。

## 3. 同梱サンプル（`notation_sample.md`）

| ID        | 項目      | 設計 | 対応する要求 |
| :-------- | :-------- | :--- | :----------- |
| DD-MD-030 | HTML の例 | 7 章の HTML の例は、`class` 属性を使わず、`details` / `summary`、`kbd`、`mark`、`sub` / `sup` の標準の要素で書く。いずれも DOMPurify の既定の許可対象 | `FR-009` |

## 4. ローカルの画像（`FR-042`）

| ID        | 項目                                   | 設計 |
| :-------- | :------------------------------------- | :--- |
| DD-MD-040 | 無害化で画像の `src` の `file:` を残す | `setupLocalImages()` で、DOMPurify の `uponSanitizeAttribute` フックを足す。`img` の `src` だけを対象に、`toLocalImageUrl()` が直せた値（`file://` の URL）を `setAttribute()` で書き戻し、`forceKeepAttr` を立てて残す。直せない値（相対パス、`https:`、`data:`、`javascript:` など）は何もせず、DOMPurify の既定の判定に任せる |
| DD-MD-041 | 読み込めない画像の表示                 | `document` の `error` をキャプチャの段階で受け取り（`error` は泡立たない）、`#preview-scroll` の中の `img` を、枠（`.img-missing`）に置き換える。枠には「画像を読み込めません」、`src`（等幅）、相対パスのときは案内（`.img-missing-hint`。「フォルダを開く…」で開くか、絶対パスで書く）を入れ、`role="img"` と `aria-label`（alt または src）を付ける。描き直しで元の `img` に戻り、再び読み込みを試す |
| DD-MD-042 | パスの直し方（`toLocalImageUrl()`）    | `\` と、Marked が URL の `\` を変えた `%5C` を `/` にそろえてから判定する。ドライブ名で始まる（`^[a-z]:/`）→ `file:///` を前に付ける。`//` で始まり、元の値に `\` か `%5C` がある（ネットワーク上のパス）→ `file:` を前に付ける。`file://` で始まる → そのまま。それ以外 → `null`（直さない）。`/` で始まる絶対パスは、DOMPurify が既定で許し、`file://` の `index.html` から見た絶対パスとして読み込まれるため、直さない |
| DD-MD-043 | HTML で直に書いた画像                  | 段落に入らない `<img>`（HTML ブロック）は、`:is(.prose-doc, .exhibition-slab) > img` で `display: block`・上下 `0.75rem` の余白・`max-width: 100%` にする。前後の段落と画像がくっつかないようにする |

- **背景（DD-MD-040、forceKeepAttr と setAttribute）**: DOMPurify（3.4）は、フックで `forceKeepAttr` を立てると、`attrValue` を属性に書き戻さずに次の属性へ進む。そのため、直した URL はフックの中で `setAttribute()` で書き込む。
- **背景（DD-MD-040、画像だけに許す理由）**: リンクの `file:` を許すと、クリックでローカルのファイルを開かせる誘導ができる。画像は表示するだけのため、`src` に限る。
- **背景（DD-MD-041）**: 読み込めない画像は、ブラウザが代わりの文字を細い 1 行で出すだけで、壊れた画像の印も出ない。どの画像が、どのパスで読み込めなかったかを、利用者が文書を直せるように示す。

## 5. フォルダ構成のツリー（`FR-047`、`DTP-009`）

| ID        | 項目                   | 設計                                                                                                                                                                                                                                                                                                                                                                                                                                                         |          |     |
| :-------- | :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --- |
| DD-MD-050 | 対象の判定             | `renderApp()` のトークンの処理で、Mermaid 以外のトークンを `treeTokenFor(token)` に渡す。コードブロックは、言語名が `TREE_LANGS`（`tree` / `filetree` / `dirtree`）なら `parseTreeText(text, 'tree')`、言語名がなければ `'code'`。段落は `parseTreeText(raw, 'paragraph')`。ツリーと読めたら、`buildTreeHtml()` の HTML を `type: 'html'` のトークンにして差し替える。見出しの元の行（`DD-DIAG-060`）は、差し替える前のトークンの `raw` で数えるため、ずれない |        |     |
| DD-MD-051 | 行の読み方             | `splitTreeLine()` は、行の先頭から、空白（全角は 2 列）、縦線（`│` `┃` `\                                                                                                                                                                                                                                                                                                                                                                                    | `）、枝（`├` `┣` `└` `┗` `+` `` ` ``、`\` と `\ | ` は後ろに横線が続くときだけ）、枝の後の横線（`─` `━` `-`）を読み、最初の枝の列（`branchCol`）、字下げ、ASCII の記号を使ったか、名前を返す。縦線だけの行は飛ばす。枝の後に名前がない行は、ツリーではないとみなす |
| DD-MD-052 | 階層と種類             | 枝のある行の列を小さい順に並べ、何番目かを深さ（1〜）にする。枝のない行は深さ 0（根）。枝が 1 つもなく、言語名が `tree` のときは、字下げの量を小さい順に並べて深さにする。深さは 1 段ずつしか深くならないようにそろえる。行末の注釈は `TREE_NOTE_RE` で分ける。種類は `treeNodeKind()`（末尾の `/` か子があればフォルダ、拡張子、拡張子のないよく使うファイル名、言葉の順）                                                                                  |          |     |
| DD-MD-053 | 線の決め方と HTML      | 各ノードについて「後に同じ深さの兄弟があるか」（`hasNextSibling`）を求める。行ごとに、祖先の段は、その祖先に兄弟が続くなら縦線（`is-pipe`）、続かなければ空き（`is-blank`）、自分の段は、兄弟が続くなら `is-tee`、最後なら `is-end` の `.md-tree-g` を並べる。行は `.md-tree-row`（`is-root`、省略の行は `is-ellipsis`）に、アイコン（`.md-tree-icon.is-<種類>`）と名前（`.md-tree-name`。`escapeHtml()` で入れる）を置く。注釈が 1 つでもあれば `.has-notes` を付け、行ごとに `.md-tree-note` を続けて 2 列の grid にする |  |  |
| DD-MD-054 | 線とアイコンの描き方   | 線は `.md-tree-g` の `::before`（縦線。`is-end` は上半分と角）と `::after`（横線）の枠線で描く。アイコンは、コールアウトと同じく、データ URI の SVG を `mask` にして `background` の色で塗る（`DD-MD-022`）。全角の空白は、見えない文字を直接書かないよう `String.fromCharCode(0x3000)` で持つ（`npm run lint`）                                                                                                                                             |          |     |
| DD-MD-060 | 脚注の定義             | `footnoteDef`（`src/ts/markdown/footnotes.ts`）は、Marked のブロックの拡張。行頭の `[^label]:` から、字下げした続きの行までを 1 つの定義にし、本文をインラインのトークンにして記録する。描画は空（一覧は DD-MD-062 で別に作る）。コードブロックの中は、Marked がコードとして先に読むため定義にならない                                                                                                                                                       | `FR-057` |     |
| DD-MD-061 | 脚注の参照             | `footnoteRef` は、インラインの拡張。`[^label]` のうち、定義のあるものだけを参照にする。定義のない `[^x]` は本文の文字のまま。インラインコードの中は、コードのトークンが先に読むため参照にならない                                                                                                                                                                                                                                                            | `FR-057` |     |
| DD-MD-062 | 番号と一覧             | `applyFootnotes(tokens, splitAtH2)` が、トークンの列を先頭から順に調べ、参照に番号（最初に参照された順）・何回目か・どの章か（`seg`）を付ける。一覧のブロック（`.lucivo-footnotes`、項目 `.fn-item`）を、Visualモードは各章の最後のトークンの後に、高速モードは文書の最後に挿入する。`parseMarkdownAndMermaidSlots()` が、描画のたびに `resetFootnotes()` で前の文書の定義を捨ててから呼ぶ                                                                   | `FR-057` |     |
| DD-MD-063 | 章への組み込みとリンク | `buildVisualStageHtml()` は、章の中の `.lucivo-footnotes` を雛形の判定の前に取り外し、章の本文の後ろ（操作バーの前）に付け直す（脚注の有無で雛形が変わらないように）。ID は `fn-<番号>-<章>`・`fnref-<番号>-<何回目>` とし、章をまたいで同じ脚注を再掲しても重複しない。`#fn-…`・`#fnref-…` のリンクは、`setupDocumentLinks()` が既定の動作を止め、その要素までプレビューを送る                                                                              | `FR-057` |     |
| DD-MD-070 | ショートコードの拡張   | `emojiShortcode`（`src/ts/markdown/emoji.ts`）は、Marked のインラインの拡張。`:名前:` のうち、名前に英字を含むもの（と `100`・`1234`・`+1`・`-1`）だけを対象にする（時刻の `:30:` を除く）。表を読み込み済みなら、絵文字の `span`（`.lucivo-emoji`、`role="img"`）を出し、表にない名前は元の文字にする。未読み込みなら、元の文字を入れた置き場所（`.lucivo-emoji-pending`）を出す。コード・URL の中は、Marked が先にコード・URL として読むため対象にならない | `FR-058` |     |
| DD-MD-071 | 表の読み込みと置き換え | 置き場所が描画の結果にあるときだけ、`renderEmoji()` が `loadLibrary('emoji')`（`js/emoji.js`）を読み込み、置き場所を絵文字に置き換える。表にない名前は包みを外して文字に戻す。読み込めなければ元の文字のまま。数式（`renderMath`）と同じ流れで、`renderApp()` の後処理に置く                                                                                                                                                                                 | `FR-058`, `NFR-006` |  |
| DD-MD-072 | 表の入手元と同梱       | 表は GitHub と同じ gemoji（npm、MIT）。`src/ts/emoji/index.ts` が `window.LucivoEmoji.lookup()` を公開し、`tools/build-app.cjs` の `LAZY_ENTRIES` が `js/emoji.js`（約 52KB）にまとめる。`public/vendor/` と `EXPORT_URLS` には足さない（書き出す HTML には変換後の絵文字が入るため）                                                                                                                                                                        | `FR-058` |     |

- **背景（DD-MD-070、数字だけの名前を除く理由）**: 文書には時刻（`10:30:15`）が多い。数字だけの `:30:` を対象にすると、絵文字を使わない文書でも表の読み込みが起きる。
- **背景（DD-MD-072、遅延読み込みにした理由）**: 表は約 52KB あり、絵文字を使わない文書の起動に乗せる必要がない（`NFR-006`）。整形（`formatter.js`）と同じ、必要なときだけ読む部品の構成に合わせる。

- **背景（DD-MD-060〜062、自前の拡張にした理由）**: 変換部品の Marked は公式の脚注の拡張を持たない。外部の拡張を同梱すると、`public/vendor/` と `EXPORT_URLS`（`AGENTS.repo.md` 7 章）の 3 か所を揃えて保守する費用が増える。脚注の仕様は小さい（参照と定義と番号）ため、自前で持つ。
- **背景（DD-MD-062、一覧を `ol` にしない理由）**: Visualモードの標準の `ol` は、番号を CSS のカウンターで振り直す（`vs-ol`）。脚注は文書の通しの番号（章によって 2 番から始まる）を保つ必要があるため、`div` の並びにして番号を文字で出す。

- **背景（DD-MD-050、段落も対象にする理由）**: Markdown では、罫線の行を空行なしで続けると 1 つの段落になり、行が改行なしでつながって表示される。段落のままでは読めないため、段落も対象にした。自動の判定は、罫線の行が 2 行以上あり、1 行目が根で、すべての行がツリーの行と読めるときだけにして、文章を誤ってツリーにしないようにした。
- **背景（DD-MD-052、列で深さを決める理由）**: 罫線の書き方は、`├── `（4 列で 1 段）と `├`（1 列で 1 段）のように、1 段の幅が文書ごとに違う。枝の記号の列を並べて何番目かを数えれば、幅によらず深さが決まる。
