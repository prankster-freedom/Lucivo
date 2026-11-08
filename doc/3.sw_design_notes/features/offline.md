---
title: Lucivo 詳細設計 オフライン動作
description: ライブラリとフォントを同梱し、インターネットに接続せずに動かすための設計（NFR-008）。
tags: ["Lucivo", "詳細設計", "オフライン"]
---

# 詳細設計: オフライン動作（offline）

`NFR-008` を実現する設計を定める。テストは [offline.md](../../4.test_spec/offline.md) を参照する。

| ID         | 項目                  | 設計 |
| :--------- | :-------------------- | :--- |
| DD-OFF-001 | 同梱するファイル      | Marked、DOMPurify、Mermaid、KaTeX と 4 種のフォントを `public/vendor/` に置く。版は `package.json` で固定し、`tools/build-vendor.cjs` で `node_modules` から生成する。`public/vendor/` は直接編集しない |
| DD-OFF-002 | フォント              | `@fontsource-variable` の可変フォントを使う。`unicode-range` で分割したファイルのうち、表示する文字を含むものだけをブラウザが読み込む。生成時に family 名をアプリの CSS が指定する名前へ付け替える |
| DD-OFF-003 | HTML エクスポート     | 書き出した HTML はアプリの外へ持ち出すため、同梱ファイルの相対パスを、同じ版の CDN の URL に置き換える（`EXPORT_URLS`）。書き出した HTML の表示にはインターネット接続が必要 |
| DD-OFF-004 | 第三者のライセンス    | 同梱するライブラリとフォントのライセンスを、`tools/build-vendor.cjs` で `public/THIRD_PARTY_LICENSES.txt` にまとめる |
| DD-OFF-005 | HTML の書き出しの停止 | 0.2.0 では、ヘッダーに `HTML` ボタン（`#btn-export-html`）を置かない。書き出しの処理（`DD-OFF-003`）は、作り直す（`CR-001`）まで `app.js` に残し、ボタンがあるときだけつなぐ |

- **背景（DD-OFF-005）**: `DD-OFF-003` の書き出しはアプリの画面（`document.documentElement.outerHTML`）をそのまま保存するため、アプリ自身の CSS・JS・ロゴの相対パスが残り、持ち出した先でスタイルが外れる。CSS と JS が読める場所に置いても `app.js` が起動し直して書き出した誌面を消す。`file://` で開いたアプリは自分の CSS の中身を読み出せない（`cssRules` は SecurityError、`fetch` は失敗）ため、すぐには直せない。動かない機能を出さないよう、ボタンだけを外した。
  - 採らなかった案: アプリの CSS・JS も CDN の URL に置き換える案。`app.js` が書き出した誌面を消す問題が残る。

## 背景

- 同梱する理由: 展示会場や講演会場では、ネットワークに接続できないことがある。CDN に依存すると、配布したファイルが描画できない。
- 可変フォントにした理由: 太さごとの静的なフォントは、Noto Sans JP だけでファイルの数と容量が太さの数の倍になる。
- `tools/build-vendor.cjs` を置く理由: 同梱ファイルを手で更新すると、`package.json` の版とずれるため。
- `public/vendor/` を git で管理する理由: `public/` だけで動く状態を保ち、配布の手順にビルドを増やさないため。
- 版を上げるときの注意: SVG の後処理の多くが Mermaid の出力の構造に依存している。`EXPORT_URLS` の版も合わせて変える。
