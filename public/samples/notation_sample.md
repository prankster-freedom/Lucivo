---
# YAML フロントマター: ヘッダーの「YAML」ボタンで表示を切り替えます
title: Lucivo サンプル文書
description: Markdown・数式・Mermaid の記法のサンプル
tags: ["Lucivo", "Markdown", "Mermaid"]
author:
  name: Lucivo
  role: sample
draft: false
---

# Lucivo サンプル文書

Lucivo で使える Markdown と Mermaid の主な記法のサンプルです。左のエディタで書き換えると、右のプレビューにすぐ反映されます。先頭の YAML フロントマターは、ヘッダーの「YAML」ボタンで表示を切り替えられます。

## 1. 見出しと段落

### 3 階層目の見出し

#### 4 階層目の見出し

段落は空行で区切ります。
行末に空白を 2 つ入れると  
改行になります。

## 2. 文字の装飾

- **太字**、*斜体*、***太字と斜体***、~~取り消し線~~
- インラインコード: `const answer = 42;`
- リンク: [Mermaid 公式サイト](https://mermaid.js.org/)
- 自動リンク: <https://marked.js.org/>

## 3. リスト

- 箇条書き
  - 入れ子の箇条書き
    - さらに入れ子
- 箇条書き

1. 番号付きリスト
2. 番号付きリスト
   1. 入れ子の番号付きリスト

- [x] 完了したタスク
- [ ] 未完了のタスク

## 4. 引用

> 引用文です。
>
> > 入れ子の引用です。

## 5. コードブロック

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```bash
npm run dev
```

## 6. 表

| 左寄せ | 中央寄せ | 右寄せ |
| :----- | :------: | -----: |
| りんご | 赤い     | 120    |
| バナナ | 黄色い   | 98     |

## 7. 水平線と HTML

上と下を水平線で区切ります。

---

Markdown の中に HTML を直接書けます。

<details>
<summary>クリックで開閉（details / summary）</summary>
<p>折りたたまれていた内容です。</p>
</details>

キー操作 <kbd>Ctrl</kbd> + <kbd>S</kbd>、<mark>マーカー</mark>、H<sub>2</sub>O、x<sup>2</sup>

## 8. 数式

インライン数式は `$` で囲みます: $E = mc^2$、$\alpha + \beta = \gamma$、$x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$。

金額の $5 と $10 のように、`$` の内側が空白に接している場合は数式になりません。`\$` と書くと `$` を表示できます: \$100

ブロック数式は `$$` の行で囲みます。

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

$$
\begin{aligned}
f(x) &= \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n \\
A &= \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
\end{aligned}
$$

## 9. フローチャート

注文の受付から在庫確認、出荷までの処理の流れです。Visual Stage では、このような本文と 1 つの図からなる章は左右の 2 段組みで表示されます。

- 在庫がある場合はそのまま出荷へ進みます
- 在庫がない場合は発注を行ってから出荷します

```mermaid
flowchart TD
  Start([開始]) --> Input[/注文を受け付ける/]
  Input --> Check{在庫はある?}
  Check -->|はい| Ship[出荷する]
  Check -->|いいえ| Order[発注する]
  Order --> Ship
  Ship --> End([終了])
```

## 10. シーケンス図

```mermaid
sequenceDiagram
  autonumber
  actor User as ユーザー
  participant Web as Web サーバー
  participant DB as データベース
  User->>Web: ログイン要求
  activate Web
  Web->>DB: 認証情報を照会
  activate DB
  DB-->>Web: 照会結果
  deactivate DB
  Note over Web: セッションを作成
  Web-->>User: ログイン完了
  deactivate Web
  User-)Web: ログアウト（非同期）
  Web-xUser: セッション破棄
```

## 11. クラス図

```mermaid
classDiagram
  class Animal {
    +String name
    +int age
    +makeSound() void
  }
  class Dog {
    +fetch() void
  }
  class Cat {
    +scratch() void
  }
  Animal <|-- Dog
  Animal <|-- Cat
  Dog "1" --> "*" Toy : plays with
```

## 12. 状態遷移図

ジョブの待機（Idle）と実行中（Running）・一時停止（Paused）の状態遷移です。実行中の内部状態も入れ子で表しています。

```mermaid
stateDiagram-v2
  [*] --> Idle
  Idle --> Running: start
  Running --> Paused: pause
  Paused --> Running: resume
  Running --> Idle: stop
  state Running {
    [*] --> Working
    Working --> Waiting: wait
    Waiting --> Working: notify
  }
  Idle --> [*]
```

## 13. ER 図

```mermaid
erDiagram
  CUSTOMER ||--o{ ORDER : places
  ORDER ||--|{ LINE_ITEM : contains
  PRODUCT ||--o{ LINE_ITEM : "ordered in"
  CUSTOMER {
    string id PK
    string name
  }
  ORDER {
    string id PK
    string customer_id FK
    date ordered_at
  }
```

## 14. ガントチャート

```mermaid
gantt
  title リリース計画
  dateFormat YYYY-MM-DD
  axisFormat %m/%d
  section 設計
    要求分析 :done, a1, 2026-01-05, 5d
    基本設計 :active, a2, after a1, 7d
  section 実装
    実装     :a3, after a2, 10d
    テスト   :crit, a4, after a3, 5d
```

## 15. 円グラフ

```mermaid
pie title 利用ブラウザの割合
  "Chrome" : 62
  "Safari" : 20
  "Edge" : 12
  "その他" : 6
```

## 16. ユーザージャーニー

```mermaid
journey
  title 買い物の体験
  section 店を探す
    検索する: 4: 利用者
    比較する: 3: 利用者
  section 購入する
    カートに入れる: 5: 利用者
    支払う: 2: 利用者, 店員
```

## 17. 4 象限チャート

```mermaid
quadrantChart
  title "施策の評価"
  x-axis "効果が低い" --> "効果が高い"
  y-axis "工数が小さい" --> "工数が大きい"
  quadrant-1 "計画して実施"
  quadrant-2 "見送る"
  quadrant-3 "余裕があれば"
  quadrant-4 "すぐ実施"
  "施策A": [0.8, 0.3]
  "施策B": [0.4, 0.7]
  "施策C": [0.2, 0.2]
```

## 18. 要求図

```mermaid
requirementDiagram
  requirement login_req {
    id: 1
    text: "ユーザーはログインできる"
    risk: high
    verifymethod: test
  }
  element login_page {
    type: "web page"
  }
  login_page - satisfies -> login_req
```

## 19. Git グラフ

```mermaid
gitGraph
  commit
  branch develop
  checkout develop
  commit
  commit
  checkout main
  merge develop
  commit
```

## 20. マインドマップ

```mermaid
mindmap
  root((Lucivo))
    Markdown
      見出し
      表
    Mermaid
      フローチャート
      シーケンス図
    表示モード
      通常モード
      Visual Stage
```

## 21. タイムライン

```mermaid
timeline
  title Web 技術の歩み
  1991 : WWW の公開
  1995 : JavaScript の登場
  2008 : HTML5 の草案
  2014 : HTML5 の勧告
```

## 22. XY チャート

```mermaid
xychart-beta
  title "月別の売上"
  x-axis ["1月", "2月", "3月", "4月", "5月", "6月"]
  y-axis "売上（万円）" 0 --> 100
  bar [52, 60, 48, 75, 82, 90]
  line [52, 60, 48, 75, 82, 90]
```

## 23. 大きなフローチャート

ノードの多い図の例です。`Fit` で全体を、`1:1` や `Expand` で細部を確認できます。

```mermaid
flowchart TD
  Start([注文を受信]) --> Validate{入力は正しい?}
  Validate -->|いいえ| Reject[注文を差し戻す]
  Reject --> Notify1[顧客に通知する]
  Notify1 --> End1([終了])
  Validate -->|はい| Fraud{不正の疑いは?}
  Fraud -->|あり| Review[担当者が審査する]
  Review --> Approve{承認する?}
  Approve -->|いいえ| Cancel[注文を取り消す]
  Cancel --> Refund[返金する]
  Refund --> Notify2[顧客に通知する]
  Notify2 --> End2([終了])
  Approve -->|はい| Stock
  Fraud -->|なし| Stock

  subgraph Inventory [在庫の引き当て]
    Stock{在庫はある?} -->|はい| Reserve[在庫を引き当てる]
    Stock -->|いいえ| Backorder[取り寄せを手配する]
    Backorder --> Wait[入荷を待つ]
    Wait --> Reserve
  end

  subgraph Payment [決済]
    Reserve --> Charge[決済を実行する]
    Charge --> Paid{決済は成功?}
    Paid -->|いいえ| Retry{再試行は 3 回未満?}
    Retry -->|はい| Charge
    Retry -->|いいえ| Release[引き当てを解除する]
  end

  Release --> Cancel

  subgraph Shipping [出荷]
    Paid -->|はい| Pick[ピッキングする]
    Pick --> Pack[梱包する]
    Pack --> Label[送り状を発行する]
    Label --> Ship[出荷する]
    Ship --> Track[追跡番号を登録する]
  end

  Track --> Notify3[出荷を通知する]
  Notify3 --> Deliver{配達は完了?}
  Deliver -->|いいえ| Redeliver[再配達を手配する]
  Redeliver --> Deliver
  Deliver -->|はい| Survey[満足度アンケートを送る]
  Survey --> Done([完了])
```

## 24. 大きな状態遷移図

状態の多い図の例です。複合状態、分岐（choice）、並行（fork / join）を含みます。

```mermaid
stateDiagram-v2
  [*] --> 下書き
  下書き --> 申請中 : 申請する
  申請中 --> 差し戻し : 差し戻す
  差し戻し --> 下書き : 修正する
  申請中 --> 審査中 : 受け付ける

  state 審査中 {
    state 判定 <<choice>>
    [*] --> 一次審査
    一次審査 --> 判定
    判定 --> 二次審査 : 金額が 100 万円以上
    判定 --> 審査完了 : 金額が 100 万円未満
    二次審査 --> 審査完了
    審査完了 --> [*]
  }

  審査中 --> 却下 : 却下する
  審査中 --> 承認済み : 承認する
  却下 --> [*]

  承認済み --> 手配中

  state 手配中 {
    state 手配開始 <<fork>>
    [*] --> 手配開始
    手配開始 --> 発注
    手配開始 --> 予算確保
    発注 --> 納品待ち
    納品待ち --> 検収
    予算確保 --> 支払準備
    state 手配完了 <<join>>
    検収 --> 手配完了
    支払準備 --> 手配完了
    手配完了 --> [*]
  }

  手配中 --> 支払済み : 支払う
  手配中 --> 保留 : 問題が発生
  保留 --> 手配中 : 解決する
  保留 --> 取消済み : 取り消す
  支払済み --> 完了
  取消済み --> [*]
  完了 --> [*]
```

## 25. 図の中の数式

フローチャートとシーケンス図では、ラベルに `$$` で囲んだ数式を書けます。

```mermaid
flowchart LR
  Eq["$$ax^2 + bx + c = 0$$"] --> D["$$D = b^2 - 4ac$$"]
  D --> Root["$$x = \frac{-b \pm \sqrt{D}}{2a}$$"]
```

```mermaid
sequenceDiagram
  participant C as クライアント
  participant S as 計算サーバー
  C->>S: $$\sum_{i=1}^{n} x_i$$
  S-->>C: $$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$$
```

## 26. 要点のカード

短い箇条書きだけの章は、Visualモードでは要点のカードで表示されます。

- **軽快**: 高速モードは、起動から閲覧まで待たせません
- **展示品質**: Visualモードは、講演や展示にそのまま使える誌面に整えます
- **記法はそのまま**: 独自の記法を使わず、標準の Markdown だけで書けます

## 27. 手順

短い番号付きリストだけの章は、手順の図で表示されます。

1. Markdown を開く
2. Visualモードに切り替える
3. スタイルを選ぶ
4. 画像や HTML に書き出す

## 28. ステートメント

> 構文に、光と舞台を。
>
> — Lucivo のフィロソフィー
