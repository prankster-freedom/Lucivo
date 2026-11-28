---
title: Structurizr（C4 モデル）サンプル
description: 1 つのモデルから複数ビュー（System Landscape / System Context / Container / Component）を切り替え、階層ドリルダウンやステージ発表でのビュー操作を試すサンプル
author: Lucivo
tags: [Structurizr, C4モデル, アーキテクチャ図]
---

# Structurizr（C4 モデル）サンプル

Web 版の Lucivo では、```` ```structurizr ```` および ```` ```structurizr-dsl ```` コードブロックをサーバー通信なし・ブラウザ単体で解析し、C4 ダイアグラムとして描画します（スタンドアロン版ではコードブロックと案内のみを表示します）。

- **多ビュー切替**: 図の上部のタブ（狭い画面ではドロップダウン）から、1 つのモデルに定義された複数ビューを切り替えられます。
- **階層ドリルダウン**: 下位ビュー（Container / Component）を持つ要素のズームアイコンをクリックすると下層へ移動し、パンくずリストから元のビューへ戻れます。
- **拡大表示（Expand）・ステージ発表・印刷**: 拡大モーダル内でもビュー切替・ドリルダウンが可能で、ステージ発表中は `[` / `]`（または `Shift+←` / `Shift+→`）でビューを切り替えられます。印刷時は定義された全ビューを順に出力します。

## 1. EC プラットフォーム構成（多ビュー・ドリルダウン）

コードブロックの開始行に `view=Containers` を指定しているため、初期表示ではコンテナ図が開きます。上部のタブから `Landscape`・`Context`・`Containers`・`Components` を切り替えたり、要素のズームアイコンから下位ビューへドリルダウンしてみてください。

```structurizr view=Containers
workspace "E-Commerce Platform" "EC プラットフォームの C4 アーキテクチャ" {
  model {
    customer = person "顧客" "商品を探して注文する利用者" {
      -> webApp "商品閲覧・注文操作" "HTTPS"
    }
    operator = person "運用担当者" "注文状況や在庫を確認する社内スタッフ" {
      -> adminApp "注文・在庫管理" "HTTPS"
    }

    ecommerce = softwareSystem "EC プラットフォーム" "オンライン販売と注文処理を担う中核システム" {
      group "フロントエンド" {
        webApp = container "Web ストア" "顧客向けの商品一覧・カート・決済画面" "TypeScript / SPA"
        adminApp = container "管理コンソール" "社内スタッフ向けの受注・在庫管理画面" "TypeScript / SPA"
      }

      api = container "注文・在庫 API" "注文受付・在庫引当・決済連携を統括するバックエンド" "Go / REST API" {
        orderCtrl = component "注文コントローラ" "注文作成・状態照会リクエストを受け付ける" "HTTP Handler"
        inventorySvc = component "在庫引当サービス" "注文確定時の在庫ロックと引当を行う" "Domain Service"
        paymentClient = component "決済アダプタ" "外部決済ゲートウェイへの課金要求を仲介する" "Client"
        orderRepo = component "注文リポジトリ" "注文データの永続化を担当する" "Repository"

        orderCtrl -> inventorySvc "在庫の仮引当を依頼"
        orderCtrl -> paymentClient "決済実行を依頼"
        orderCtrl -> orderRepo "注文履歴を保存"
      }

      db = container "注文・商品データベース" "商品情報・在庫数・注文履歴を保持する" "PostgreSQL" {
        tags "Database"
      }

      webApp -> orderCtrl "API 呼出" "JSON / HTTPS"
      adminApp -> orderCtrl "管理 API 呼出" "JSON / HTTPS"
      inventorySvc -> db "在庫更新・参照" "SQL"
      orderRepo -> db "注文レコード読み書き" "SQL"
    }

    paymentGw = softwareSystem "外部決済ゲートウェイ" "クレジットカード等の決済処理を行う外部 SaaS" {
      tags "External"
    }
    mailSys = softwareSystem "メール配信基盤" "注文確認・発送通知メールを送信する外部基盤" {
      tags "External"
    }

    paymentClient -> paymentGw "与信・売上確定" "HTTPS / JSON"
    api -> mailSys "注文確認メール送信" "SMTP / API"
  }

  views {
    systemLandscape "Landscape" {
      include *
      title "システム全体俯瞰（System Landscape）"
      autoLayout lr
    }

    systemContext ecommerce "Context" {
      include *
      title "EC プラットフォーム コンテキスト（System Context）"
      autoLayout tb
    }

    container ecommerce "Containers" {
      include *
      title "EC プラットフォーム コンテナ構成（Container）"
      autoLayout lr
    }

    component api "Components" {
      include *
      title "注文・在庫 API コンポーネント構成（Component）"
      autoLayout tb
    }

    styles {
      element "Database" {
        shape Cylinder
        background #2563EB
        color #FFFFFF
      }
      element "External" {
        background #64748B
        color #FFFFFF
      }
    }
  }
}
```

## 2. 単一ビューのシンプル構成（`structurizr-dsl`）

ビューが 1 つだけ定義されている場合は、上部のビュー切替バーを自動的に隠し、通常の図と同じすっきりしたカードとして表示します。言語名にはエイリアスの `structurizr-dsl` も使えます。

```structurizr-dsl
workspace "Documentation Pipeline" {
  model {
    writer = person "執筆者" "Markdown で設計書や発表資料を書く"
    lucivo = softwareSystem "Lucivo" "ブラウザ単体で動作する Markdown & 図表ビューアー"
    reader = person "閲覧者" "Web や PDF・ステージ発表で資料を読む"

    writer -> lucivo "Markdown / Structurizr DSL を記述"
    lucivo -> reader "Visualモード・ステージ発表・PDF で共有"
  }

  views {
    systemContext lucivo "Overview" {
      include *
      title "Lucivo 利用フロー"
      autoLayout lr
    }
  }
}
```

## 3. 公式チュートリアル準拠 — 階層識別子・定数・内蔵 `default` テーマ

[Structurizr DSL Tutorial](https://docs.structurizr.com/dsl/tutorial) で紹介されている代表的な記述パターンです。

- `!identifiers hierarchical` により、親要素の識別子で修飾したドット参照（`ss.wa`, `ss.db`）やブロック内の相対参照を警告なしで解決できます。
- `!const` / `!constant` / `!var` で定義した定数・変数を `${NAME}` で展開できます。
- `theme default` で公式の `default` テーマプリセットをオフライン適用しつつ、`styles` で `Database`（`shape Cylinder`）やカスタム関係スタイル（`dashed false` 等）を上書きできます。

```structurizr
!const SYSTEM_NAME "Software System"

workspace "Official Tutorial Pattern" "Structurizr DSL 公式チュートリアル準拠" {
  !identifiers hierarchical

  model {
    u = person "User" "システムを利用するユーザー"
    ss = softwareSystem "${SYSTEM_NAME}" "中核システム" {
      wa = container "Web Application" "ブラウザ UI を配信する" "Java / Spring Boot"
      db = container "Database Schema" "業務データを永続化する" "PostgreSQL" {
        tags "Database"
      }
    }

    u -> ss.wa "Uses" "HTTPS" {
      tags "Sync"
    }
    ss.wa -> ss.db "Reads from and writes to" "JDBC"
  }

  views {
    systemContext ss "Diagram1" {
      include *
      title "${SYSTEM_NAME} - System Context (Tutorial)"
      autoLayout lr
    }

    container ss "Diagram2" {
      include u ss.wa ss.db
      title "${SYSTEM_NAME} - Container View (Explicit Include & Default Theme)"
      autoLayout lr
    }

    theme default

    styles {
      element "Database" {
        shape Cylinder
        background #2563eb
        color #ffffff
      }
      relationship "Sync" {
        color #0f766e
        dashed false
      }
    }
  }
}
```

## 4. 未対応構文を含む公式 Cookbook 例（安全スキップ＋警告バッジ）

[Structurizr DSL Cookbook](https://docs.structurizr.com/dsl/cookbook) にある代表的な構文のうち、Lucivo（Phase 1）がまだ対応していない機能（`deploymentEnvironment` / `deploymentNode` / `containerInstance`・`deployment` ビュー・`dynamic` ビュー・`filtered` ビュー・外部 `theme`）を含めた例です。

Lucivo は未対応の構文に出会っても描画全体を止めず、安全にスキップしたうえで図の隅に警告バッジ（`⚠ 未対応構文`）を表示します。バッジをクリックすると、スキップされた箇所と行番号の一覧を確認できます。

```structurizr view=Containers
workspace "Cookbook Unimplemented Features" "未対応構文の安全スキップ確認" {
  model {
    customer = person "Customer" "書籍を検索・購入する顧客"
    onlineBookStore = softwareSystem "Online Book Store" "オンライン書店" {
      tags "Core"
      webapp = container "Web Application" "書店フロントエンド" "TypeScript"
      database = container "Database" "注文・書籍データ" "PostgreSQL" {
        tags "Database"
      }
    }

    customer -> webapp "Browses and makes purchases using" "HTTPS"
    webapp -> database "Reads from and writes to" "SQL"

    development = deploymentEnvironment "Development" {
      deploymentNode "Developer Laptop" {
        containerInstance webapp
        deploymentNode "MySQL" {
          containerInstance database
        }
      }
    }
  }

  views {
    systemLandscape "Landscape" {
      include *
      title "System Landscape"
      autoLayout lr
    }

    container onlineBookStore "Containers" {
      include *
      title "Online Book Store — Containers"
      autoLayout lr
    }

    dynamic onlineBookStore "RequestPastOrders" {
      title "Request past orders feature (Dynamic View)"
      customer -> webapp "Requests past orders from"
      webapp -> database "Queries for orders using"
      autoLayout lr
    }

    deployment * development "DevelopmentDeployment" {
      include *
      autoLayout lr
    }

    filtered "Landscape" include "Core,Relationship" "FilteredCore"

    theme https://static.structurizr.com/themes/default/theme.json

    styles {
      element "Database" {
        shape Cylinder
        background #2563eb
        color #ffffff
      }
    }
  }
}
```

