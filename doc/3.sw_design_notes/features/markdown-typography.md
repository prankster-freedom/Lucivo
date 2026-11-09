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

| ID        | 要素             | 表示                                                                              |
| :-------- | :--------------- | :-------------------------------------------------------------------------------- |
| DD-MD-010 | 見出し `h3` / `h4` / `h5`, `h6` | `h3`: 1.05rem・太さ 700・`--text-primary`。`h4`: 0.95rem・太さ 700・`--text-primary`。`h5`, `h6`: 0.875rem・太さ 700・`--text-muted`。上余白 1.25〜1.5rem、下余白 0.5rem |
| DD-MD-011 | 箇条書き・番号付きリスト | `ul` は `disc`、入れ子は `circle`、さらに入れ子は `square`。`ol` は `decimal`。左余白 1.5rem で字下げする。記号・番号の色は `--text-muted` |
| DD-MD-012 | タスクリスト     | チェックボックスを含む項目（`li:has(> input[type="checkbox"])`）は記号を出さず、チェックボックスを記号の位置に置く |
| DD-MD-013 | リンク           | `--accent` の色、下線あり（下線との間隔 2px）。ポインターを重ねると下線を太くする |
| DD-MD-014 | インラインコード | 等幅フォント（JetBrains Mono）・0.85em、背景 `--panel-sub`、枠 1px `--border-strong`、角丸 4px、色 `--text-primary` |
| DD-MD-015 | コードブロック   | `pre` に背景 `--panel-sub`、枠 1px `--border-strong`、角丸 10px、内側余白、横スクロールを付ける。`pre code` は DD-MD-014 の背景・枠・余白を打ち消す |
| DD-MD-016 | 引用             | 左線 4px `--border-strong`、左の内側余白 1rem、色 `--text-secondary`（Dark で `--text-muted` は背景とのコントラストが不足するため）。入れ子の引用も同じ表示で、さらに字下げされる。背景は付けない |
| DD-MD-017 | 表の列の寄せ     | `th` / `td` の `align` 属性（Marked が出力する `left` / `center` / `right`）に合わせて `text-align` を指定する |
| DD-MD-020 | 表の横幅収容と折り返し | `renderApp()` で `wrapTables(activeContainer)` を呼び、すべての `table` を `<div class="table-container">`（`width: 100%; max-width: 100%; overflow-x: auto;`）で包む。あわせて `th, td` の折り返しを `word-break: normal !important; overflow-wrap: break-word !important;`、セル内コード（`:is(th, td) code`）を `white-space: nowrap;` とし、識別子の途中改行を防ぎつつ多列の表をスラブ・文書の版面幅に収め、最小幅を下回る狭い画面では `.table-container` 内で横スクロールさせる |
| DD-MD-018 | 水平線           | 上の枠線 1px `--border-strong`、上下の余白 1.5rem                                 |
| DD-MD-019 | 標準の HTML 要素 | `details`: 枠 1px `--border-strong`・角丸 8px・内側余白。`summary`: 太さ 600・`--text-primary`・ポインター。`kbd`: 等幅フォント・枠 1px（下 2px）`--border-strong`・背景 `--panel-sub`。`mark`: Light は `#FDE68A`、Dark は `rgba(250, 204, 21, 0.35)` の背景に `--text-primary` の文字 |
| DD-MD-021 | コールアウトの判定と組み替え（js/app.js） | `decorateAlerts(container)` は、サニタイズ後の DOM のすべての `blockquote` について、最初の子の `p` の最初のテキストノードが `ALERT_MARKER_RE`（`[!NOTE]`・`[!TIP]`・`[!IMPORTANT]`・`[!WARNING]`・`[!CAUTION]`、大文字・小文字を問わない、後ろは改行か終わり）に一致するものだけを、`div.md-alert.md-alert-<種類>`（`role="note"`）に置き換える。マーカーの文字（と直後の `br`）を消し、空になった最初の段落を消し、先頭に題の行 `p.md-alert-title`（アイコン `span.md-alert-icon` とラベル `Note` など）を置いて、引用の子をすべて移す。高速モードは `renderApp()` で `#standard-doc-container` に、Visualモードは `buildVisualStageHtml()` で雛形の判定の前に適用する |
| DD-MD-022 | コールアウトの表示（css/style.css） | `.md-alert` は `--alert-c`（種類ごとの意味の色。Light: `#2563EB`・`#059669`・`#7C3AED`・`#D97706`・`#DC2626`、Dark: `#60A5FA`・`#34D399`・`#A78BFA`・`#FBBF24`・`#F87171`）を持ち、左線 4px `--alert-c`、背景は `--alert-c` を 7%（Dark は 10%）混ぜた色、角丸 `0 10px 10px 0`、色 `--text-secondary`。題の行は JetBrains Mono・0.72rem・700・字間 0.14em・`text-transform: uppercase`、色 `--alert-ink`（Light は `--alert-c` 72% に `#0F172A` を混ぜる、Dark は `--alert-c`）。アイコンは `:root` の `--icon-alert-*`（`assets/icons/alert-*.svg` と同一の data URI）を `mask` で読み込み、1.4em 角を `--alert-c` で塗る |

- **背景（DD-MD-016）**: コールアウト（`DD-MD-022`）は、意味の色の左線と背景を持つ。引用は背景を付けず灰色の左線にして、コールアウトと見分けられるようにする。
- **背景（DD-MD-021）**: Marked の拡張（トークナイザー）で引用の解析を変えず、標準の引用として解析した後の DOM を書き換える。Marked の版を上げても影響を受けにくく、判定は引用の最初の文字だけで済むため、入力のたびの描画（`NFR-006`）を重くしない。サニタイズの後に作る要素は、アプリが決めたクラスと文字だけを持つため、安全性（`NFR-003`）を損なわない。Visualモードで雛形の判定の前に置き換えるのは、`blockquote` のままだとコールアウトだけの章がステートメント型（`DTP-VTPL-050`）になるため。
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

- **背景（DD-MD-040、forceKeepAttr と setAttribute）**: DOMPurify（3.4）は、フックで `forceKeepAttr` を立てると、`attrValue` を属性に書き戻さずに次の属性へ進む。そのため、直した URL はフックの中で `setAttribute()` で書き込む。
- **背景（DD-MD-040、画像だけに許す理由）**: リンクの `file:` を許すと、クリックでローカルのファイルを開かせる誘導ができる。画像は表示するだけのため、`src` に限る。
- **背景（DD-MD-041）**: 読み込めない画像は、ブラウザが代わりの文字を細い 1 行で出すだけで、壊れた画像の印も出ない。どの画像が、どのパスで読み込めなかったかを、利用者が文書を直せるように示す。
