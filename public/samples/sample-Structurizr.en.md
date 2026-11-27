---
title: Structurizr (C4 Model) Sample
description: Explore multi-view switching (System Landscape / System Context / Container / Component), hierarchical drill-down, and Stage Show view navigation from a single Structurizr DSL model
author: Lucivo
tags: [Structurizr, C4 Model, Architecture]
---

# Structurizr (C4 Model) Sample

In the Web edition of Lucivo, ```` ```structurizr ```` and ```` ```structurizr-dsl ```` code blocks are parsed entirely in the browser with no server communication and rendered as interactive C4 diagrams (the standalone edition displays the raw code block with a brief notice).

- **Multi-view switching**: Switch between multiple views defined in a single model using the tabs at the top of the diagram (or the dropdown on narrow screens).
- **Hierarchical drill-down**: Click the zoom icon on an element that has a child view (Container / Component) to drill down, and use the breadcrumb bar to navigate back.
- **Expand modal, Stage Show, and Print**: View switching and drill-down also work inside the Expand modal. During Stage Show, press `[` / `]` (or `Shift+←` / `Shift+→`) to switch views within the current diagram. Printing outputs all defined views in sequence.

## 1. E-Commerce Platform (Multi-View & Drill-Down)

Because `view=Containers` is specified on the opening fence, the Container view is shown first. Try switching between `Landscape`, `Context`, `Containers`, and `Components` via the tabs, or click an element's zoom icon to drill down.

```structurizr view=Containers
workspace "E-Commerce Platform" "C4 Architecture of the E-Commerce Platform" {
  model {
    customer = person "Customer" "Browses products and places orders" {
      -> webApp "Browses catalog and checks out" "HTTPS"
    }
    operator = person "Operations Staff" "Monitors orders and inventory" {
      -> adminApp "Manages orders and stock" "HTTPS"
    }

    ecommerce = softwareSystem "E-Commerce Platform" "Core system for online sales and order processing" {
      group "Frontend" {
        webApp = container "Web Storefront" "Customer-facing catalog, cart, and checkout UI" "TypeScript / SPA"
        adminApp = container "Admin Console" "Internal UI for order and inventory management" "TypeScript / SPA"
      }

      api = container "Order & Inventory API" "Coordinates order intake, stock allocation, and payments" "Go / REST API" {
        orderCtrl = component "Order Controller" "Handles order creation and status requests" "HTTP Handler"
        inventorySvc = component "Inventory Service" "Reserves and allocates stock on checkout" "Domain Service"
        paymentClient = component "Payment Adapter" "Communicates with the external payment gateway" "Client"
        orderRepo = component "Order Repository" "Persists order records" "Repository"

        orderCtrl -> inventorySvc "Requests stock reservation"
        orderCtrl -> paymentClient "Requests payment capture"
        orderCtrl -> orderRepo "Saves order history"
      }

      db = container "Order & Catalog DB" "Stores product catalog, stock levels, and orders" "PostgreSQL" {
        tags "Database"
      }

      webApp -> orderCtrl "Calls API" "JSON / HTTPS"
      adminApp -> orderCtrl "Calls Admin API" "JSON / HTTPS"
      inventorySvc -> db "Updates & queries stock" "SQL"
      orderRepo -> db "Reads & writes orders" "SQL"
    }

    paymentGw = softwareSystem "External Payment Gateway" "External SaaS for credit card processing" {
      tags "External"
    }
    mailSys = softwareSystem "Email Delivery Service" "External service for order confirmation emails" {
      tags "External"
    }

    paymentClient -> paymentGw "Authorizes & captures" "HTTPS / JSON"
    api -> mailSys "Sends confirmation emails" "SMTP / API"
  }

  views {
    systemLandscape "Landscape" {
      include *
      title "System Landscape"
      autoLayout lr
    }

    systemContext ecommerce "Context" {
      include *
      title "E-Commerce Platform — System Context"
      autoLayout tb
    }

    container ecommerce "Containers" {
      include *
      title "E-Commerce Platform — Containers"
      autoLayout lr
    }

    component api "Components" {
      include *
      title "Order & Inventory API — Components"
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

## 2. Single-View Example (`structurizr-dsl`)

When a workspace defines only one view, the view switcher bar is automatically hidden so the diagram renders cleanly like any other diagram card. The `structurizr-dsl` language alias is also supported.

```structurizr-dsl
workspace "Documentation Pipeline" {
  model {
    writer = person "Author" "Writes design specs and slides in Markdown"
    lucivo = softwareSystem "Lucivo" "Browser-only Markdown & diagram presenter"
    reader = person "Reader" "Reads via Web, PDF, or Stage Show"

    writer -> lucivo "Writes Markdown / Structurizr DSL"
    lucivo -> reader "Shares via Visual Mode, Stage Show, or PDF"
  }

  views {
    systemContext lucivo "Overview" {
      include *
      title "Lucivo Workflow"
      autoLayout lr
    }
  }
}
```
