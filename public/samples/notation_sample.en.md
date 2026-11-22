---
# YAML Front Matter: Toggle visibility with the "YAML" button in the header
title: Lucivo Sample Document
description: Sample of Markdown, math equations, and Mermaid diagram syntax
tags: ["Lucivo", "Markdown", "Mermaid"]
author:
  name: Lucivo
  role: sample
draft: false
---

# Lucivo Sample Document

This sample demonstrates the core Markdown and Mermaid syntax supported in Lucivo. Edit the text in the left editor to see your changes reflected immediately in the right preview. You can toggle the YAML front matter at the top using the **YAML** button in the header.

## 1. Headings and Paragraphs

### Level 3 Heading

#### Level 4 Heading

Separate paragraphs with a blank line.
Add two trailing spaces at the end of a line  
to insert a line break.

In `Split` view, moving the cursor to another chapter in the editor automatically scrolls the preview to that chapter's heading.

## 2. Text Formatting

- **Bold**, *Italic*, ***Bold and Italic***, ~~Strikethrough~~
- Inline code: `const answer = 42;`
- Link: [Mermaid Official Site](https://mermaid.js.org/)
- Autolink: <https://marked.js.org/>

## 3. Lists

- Bulleted list
  - Nested bullet item
    - Deeply nested item
- Bulleted list

1. Numbered list
2. Numbered list
   1. Nested numbered list

- [x] Completed task
- [ ] Incomplete task

## 4. Blockquotes

> This is a blockquote.
>
> > This is a nested blockquote.

> [!TIP]
> Blockquotes written with GitHub-style alert syntax become styled callout panels. Examples of all five alert types are available in Chapter 13 of the Extended Notation Sample (`notation_sample_extra1.md`).

## 5. Code Blocks

```javascript
function greet(name) {
  return `Hello, ${name}!`;
}
```

```bash
npm run dev
```

## 6. Tables

| Left-Aligned | Center-Aligned | Right-Aligned |
| :----------- | :------------: | ------------: |
| Apple        | Red            |           120 |
| Banana       | Yellow         |            98 |

## 7. Horizontal Rules and HTML

Separate sections above and below with a horizontal rule.

---

You can write HTML directly inside Markdown.

<details>
<summary>Click to expand (details / summary)</summary>
<p>This content was collapsed.</p>
</details>

Keyboard shortcuts <kbd>Ctrl</kbd> + <kbd>S</kbd>, <mark>highlighted text</mark>, H<sub>2</sub>O, x<sup>2</sup>

## 8. Math Equations

Wrap inline math in single `$` signs: $E = mc^2$, $\alpha + \beta = \gamma$, $x_{n+1} = x_n - \frac{f(x_n)}{f'(x_n)}$.

When `$` touches a space on the inside—such as prices like $5 and $10—it is not parsed as math. Escape it as `\$` to display a literal dollar sign: \$100

Wrap block math in `$$` lines:

$$
\int_0^\infty e^{-x^2}\,dx = \frac{\sqrt{\pi}}{2}
$$

$$
\begin{aligned}
f(x) &= \sum_{n=0}^{\infty} \frac{f^{(n)}(a)}{n!}(x-a)^n \\
A &= \begin{pmatrix} 1 & 2 \\ 3 & 4 \end{pmatrix}
\end{aligned}
$$

## 9. Flowchart

Process flow from order intake through inventory check to shipping. In Visual Stage, chapters consisting of body text and a single diagram are automatically arranged in a two-column split layout.

- If stock is available, proceed directly to shipping
- If out of stock, place a restock order before shipping

```mermaid
flowchart TD
  Start([Start]) --> Input[/Receive Order/]
  Input --> Check{In Stock?}
  Check -->|Yes| Ship[Ship Order]
  Check -->|No| Order[Place Restock Order]
  Order --> Ship
  Ship --> End([End])
```

## 10. Sequence Diagram

```mermaid
sequenceDiagram
  autonumber
  actor User as User
  participant Web as Web Server
  participant DB as Database
  User->>Web: Login Request
  activate Web
  Web->>DB: Query Credentials
  activate DB
  DB-->>Web: Query Result
  deactivate DB
  Note over Web: Create Session
  Web-->>User: Login Complete
  deactivate Web
  User-)Web: Logout (Async)
  Web-xUser: Destroy Session
```

## 11. Class Diagram

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

## 12. State Diagram

State transitions of a job across Idle, Running, and Paused states, including nested substates inside Running.

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

## 13. ER Diagram

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

## 14. Gantt Chart

```mermaid
gantt
  title Release Plan
  dateFormat YYYY-MM-DD
  axisFormat %m/%d
  section Design
    Requirements Analysis :done, a1, 2026-01-05, 5d
    Architectural Design  :active, a2, after a1, 7d
  section Implementation
    Implementation        :a3, after a2, 10d
    Testing               :crit, a4, after a3, 5d
```

## 15. Pie Chart

```mermaid
pie title Browser Market Share
  "Chrome" : 62
  "Safari" : 20
  "Edge" : 12
  "Other" : 6
```

## 16. User Journey

```mermaid
journey
  title Shopping Experience
  section Finding a Store
    Search online: 4: Customer
    Compare options: 3: Customer
  section Making a Purchase
    Add to cart: 5: Customer
    Pay at checkout: 2: Customer, Clerk
```

## 17. Quadrant Chart

```mermaid
quadrantChart
  title Initiative Evaluation
  x-axis "Low Impact" --> "High Impact"
  y-axis "Low Effort" --> "High Effort"
  quadrant-1 "Plan & Execute"
  quadrant-2 "Defer"
  quadrant-3 "If Capacity Allows"
  quadrant-4 "Quick Wins"
  "Initiative A": [0.8, 0.3]
  "Initiative B": [0.4, 0.7]
  "Initiative C": [0.2, 0.2]
```

## 18. Requirement Diagram

```mermaid
requirementDiagram
  requirement login_req {
    id: 1
    text: "Users can log in"
    risk: high
    verifymethod: test
  }
  element login_page {
    type: "web page"
  }
  login_page - satisfies -> login_req
```

## 19. Git Graph

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

## 20. Mindmap

```mermaid
mindmap
  root((Lucivo))
    Markdown
      Headings
      Tables
    Mermaid
      Flowcharts
      Sequence Diagrams
    Display Modes
      Fast Mode
      Visual Stage
```

## 21. Timeline

```mermaid
timeline
  title Evolution of Web Technologies
  1991 : World Wide Web released
  1995 : JavaScript introduced
  2008 : HTML5 first draft
  2014 : HTML5 W3C Recommendation
```

## 22. XY Chart

```mermaid
xychart-beta
  title "Monthly Sales"
  x-axis ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
  y-axis "Sales ($10k)" 0 --> 100
  bar [52, 60, 48, 75, 82, 90]
  line [52, 60, 48, 75, 82, 90]
```

## 23. Large Flowchart

An example diagram with many nodes. Use `Fit` to view the entire diagram, or `1:n`, `100%`, and `Expand` to inspect details.

```mermaid
flowchart TD
  Start([Receive Order]) --> Validate{Valid Input?}
  Validate -->|No| Reject[Reject Order]
  Reject --> Notify1[Notify Customer]
  Notify1 --> End1([End])
  Validate -->|Yes| Fraud{Suspected Fraud?}
  Fraud -->|Yes| Review[Manual Review]
  Review --> Approve{Approved?}
  Approve -->|No| Cancel[Cancel Order]
  Cancel --> Refund[Issue Refund]
  Refund --> Notify2[Notify Customer]
  Notify2 --> End2([End])
  Approve -->|Yes| Stock
  Fraud -->|No| Stock

  subgraph Inventory [Inventory Allocation]
    Stock{In Stock?} -->|Yes| Reserve[Reserve Stock]
    Stock -->|No| Backorder[Arrange Backorder]
    Backorder --> Wait[Await Arrival]
    Wait --> Reserve
  end

  subgraph Payment [Payment]
    Reserve --> Charge[Process Payment]
    Charge --> Paid{Payment Succeeded?}
    Paid -->|No| Retry{Fewer than 3 Retries?}
    Retry -->|Yes| Charge
    Retry -->|No| Release[Release Reservation]
  end

  Release --> Cancel

  subgraph Shipping [Shipping]
    Paid -->|Yes| Pick[Pick Items]
    Pick --> Pack[Pack Order]
    Pack --> Label[Print Shipping Label]
    Label --> Ship[Ship Package]
    Ship --> Track[Register Tracking Number]
  end

  Track --> Notify3[Send Shipping Notice]
  Notify3 --> Deliver{Delivered?}
  Deliver -->|No| Redeliver[Schedule Redelivery]
  Redeliver --> Deliver
  Deliver -->|Yes| Survey[Send Satisfaction Survey]
  Survey --> Done([Complete])
```

## 24. Large State Diagram

An example diagram with complex states, including composite states, decision branches (`choice`), and concurrent flows (`fork` / `join`).

```mermaid
stateDiagram-v2
  [*] --> Draft
  Draft --> Submitted : submit
  Submitted --> Returned : return
  Returned --> Draft : revise
  Submitted --> UnderReview : accept

  state UnderReview {
    state Decision <<choice>>
    [*] --> PrimaryReview
    PrimaryReview --> Decision
    Decision --> SecondaryReview : Amount >= $10,000
    Decision --> ReviewComplete : Amount < $10,000
    SecondaryReview --> ReviewComplete
    ReviewComplete --> [*]
  }

  UnderReview --> Rejected : reject
  UnderReview --> Approved : approve
  Rejected --> [*]

  Approved --> Fulfillment

  state Fulfillment {
    state StartFulfillment <<fork>>
    [*] --> StartFulfillment
    StartFulfillment --> Procurement
    StartFulfillment --> BudgetAllocation
    Procurement --> AwaitingDelivery
    AwaitingDelivery --> Inspection
    BudgetAllocation --> PaymentPrep
    state EndFulfillment <<join>>
    Inspection --> EndFulfillment
    PaymentPrep --> EndFulfillment
    EndFulfillment --> [*]
  }

  Fulfillment --> Paid : pay
  Fulfillment --> OnHold : issue detected
  OnHold --> Fulfillment : resolve
  OnHold --> Cancelled : cancel
  Paid --> Completed
  Cancelled --> [*]
  Completed --> [*]
```

## 25. Math Inside Diagrams

In flowcharts and sequence diagrams, you can embed LaTeX equations inside labels by wrapping them in `$$`.

```mermaid
flowchart LR
  Eq["$$ax^2 + bx + c = 0$$"] --> D["$$D = b^2 - 4ac$$"]
  D --> Root["$$x = \frac{-b \pm \sqrt{D}}{2a}$$"]
```

```mermaid
sequenceDiagram
  participant C as Client
  participant S as Compute Server
  C->>S: $$\sum_{i=1}^{n} x_i$$
  S-->>C: $$\bar{x} = \frac{1}{n}\sum_{i=1}^{n} x_i$$
```

## 26. Key Point Cards

Chapters containing only a short bulleted list are rendered as numbered key point cards in Visual Mode.

- **Fast**: Fast Mode gets you from launch to reading without waiting
- **Exhibition Quality**: Visual Mode formats your document into layouts ready for talks and exhibitions
- **Standard Syntax**: No proprietary extensions—just write plain standard Markdown

## 27. Process Steps

Chapters containing only a short numbered list are rendered as a visual step-by-step flow diagram.

1. Open Markdown
2. Switch to Visual Mode
3. Choose a Style
4. Export as Image or HTML

## 28. Statement

> Light and stage for your syntax.
>
> — The Lucivo Philosophy
