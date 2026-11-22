---
# YAML Front Matter
title: Lucivo Extended & Detailed Markdown Notation Sample
description: Detailed syntax and edge-case samples compliant with CommonMark 0.31.2, GitHub Flavored Markdown (GFM), Daring Fireball, HTML elements, and inline styling
tags: ["Lucivo", "Markdown", "CommonMark", "GFM", "HTML", "Style"]
author:
  name: Lucivo
  role: sample
draft: false
---

# Lucivo Extended & Detailed Markdown Notation Sample

This document provides advanced syntax examples and edge cases compliant with CommonMark 0.31.2, GitHub Flavored Markdown (GFM), John Gruber's Markdown specification, and safe HTML5 semantics and inline styling.

## 1. Detailed Heading Syntax (ATX & Setext)

ATX headings require a space immediately after `#`. Trailing `#` characters (closing sequences) are ignored.

# Level 1 Heading (#)

## Level 2 Heading (##)

### Level 3 Heading (###)

#### Level 4 Heading (####)

##### Level 5 Heading (#####)

###### Level 6 Heading (######)

### ATX Heading with Closing # Characters ###

Setext headings underline text with one or more `=` or `-` characters.

Setext Level 1 Heading
======================

Setext Level 2 Heading
----------------------

## 2. Links and Reference Links

In addition to standard inline links, Lucivo supports reference links whose URLs are defined in bulk at the end of a section, as well as GFM extended autolinks.

- Inline link: [CommonMark Specification](https://spec.commonmark.org/0.31.2/ "CommonMark 0.31.2")
- Inline link with title: [GitHub GFM Blog](https://github.blog/2017-03-14-a-formal-spec-for-github-flavored-markdown/ "A formal spec for GFM")
- Reference link (explicit label): [Daring Fireball Syntax Guide][df-syntax]
- Reference link (collapsed/case-insensitive): [GFM-Spec]
- Standard angle-bracket autolinks: <https://daringfireball.net/> and <mailto:info@example.com>
- GFM Extended Autolinks (recognized automatically without `<>`):
  - Web URL: <https://github.com/prankster-freedom/Lucivo>
  - Domain starting with `www`: <www.github.com>
  - Email address: <support@example.com>

[df-syntax]: https://daringfireball.net/projects/markdown/syntax "Daring Fireball Markdown Syntax"
[gfm-spec]: https://github.github.com/gfm/ "GitHub Flavored Markdown Spec"

## 3. Emphasis and Code Edge Cases

Delimiter combinations, intraword emphasis, inline code containing backticks, and GFM color swatches.

- Asterisk emphasis: *Italic*, **Bold**, ***Bold and Italic***
- Underscore emphasis: _Italic_, __Bold__, ___Bold and Italic___
- Intraword emphasis: un*frigging*believable
- Underscores inside identifiers do not trigger emphasis (GFM rule): `user_name_variable_foo`
- Tilde strikethrough: ~~Strikethrough text (double tilde)~~, ~single tilde~
- Inline code containing backticks (wrapped in double backticks): `` `code` with backtick ``
- Inline code with leading/trailing spaces: `` ` $HOME ` ``
- GFM color codes (color notation inside inline code):
  - 6-digit HEX: `#0969da`, `#2da44e`, `#cf222e`, `#bf8700`
  - 3-digit / 8-digit HEX: `#fff`, `#00000080`
  - RGB / RGBA: `rgb(9, 105, 218)`, `rgba(45, 164, 78, 0.4)`
  - HSL / HSLA: `hsl(212, 92%, 45%)`, `hsla(356, 72%, 46%, 0.5)`

## 4. Composite Lists and Nested Structures

Complex list structures containing paragraphs, blockquotes, and code blocks, along with GFM task lists.

1. First item: Overview description

   This is an indented second paragraph. Under CommonMark rules, a list item can contain multiple paragraphs.

2. Second item: Item containing a code example

   ```bash
   git clone https://github.com/prankster-freedom/Lucivo.git
   cd Lucivo
   ```

3. Third item: Item containing a blockquote
   > You can also include blockquotes inside list items.

   - Nested bullet item A
   - Nested bullet item B

4. List starting at a number other than 1:

5. List starting at number 5
6. Next sequential item

### GFM Task Lists (Hierarchical Checkboxes)

- [x] Complete Software Requirements Specification (SRS)
- [x] Complete Architecture Design Specification (ADS) review
- [ ] Implementation and Testing
  - [x] Component unit tests
  - [ ] Automated E2E verification (Playwright)
  - [ ] Visual design proofing (DTP review)
- [ ] ~~Out-of-scope investigation items~~ (task with strikethrough)

## 5. Advanced Blockquotes

Blockquotes containing multiple paragraphs and nested elements, plus lazy continuation.

> First paragraph of a multi-element blockquote.
> Place `>` at the start of each line.
>
> To span multiple paragraphs, include `>` on blank lines as well.
>
> - Bulleted item 1 inside a blockquote
> - Bulleted item 2 inside a blockquote
>
> ```javascript
> // Code block inside a blockquote
> console.log("Quoted Code");
> ```

> Lazy continuation: Even if you omit the leading `>` on subsequent lines,
the blockquote continues seamlessly until a blank line is reached.

## 6. Fenced Code Blocks and Indented Code

Code blocks delimited with tildes (`~~~`), language metadata, and `diff` syntax highlighting.

```html
<!-- HTML Code Sample -->
<div class="user-profile">
  <span class="user-name">Lucivo User</span>
</div>
```

~~~python
# Code block using tildes
def calculate_fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
~~~

    // Code block using 4-space indentation (CommonMark standard)
    function indentCodeBlock() {
      return 100;
    }

### Diff Code Blocks (`diff` Highlighting)

`diff` syntax highlighting clearly distinguishes added, removed, and context lines.

```diff
  // Context before change
- const legacyRender = (data) => renderText(data);
+ const modernRender = (data) => renderWithKatexAndMermaid(data);
! Note: Dependency initialization order changed here
@@ -10,4 +10,4 @@
```

## 7. Escaping Special Characters and HTML Entities

Backslash escapes (CommonMark rules) and HTML entities to output literal Markdown metacharacters.

- Escapable ASCII punctuation characters:
  - Asterisk: \*asterisk\*
  - Underscore: \_underscore\_
  - Square brackets: \[link text\]
  - Curly braces: \{brace\}
  - Parentheses: \(parenthesis\)
  - Number sign: \# heading
  - Plus / Minus: \+ plus, \- minus
  - Period: 1\. not a list
  - Exclamation mark: \!not an image
  - Backtick: \`not code\`
  - Tilde: \~not strike\~
  - Pipe: \|not table\|
- HTML Named Entities: &copy; 2026 Lucivo, &amp;, &lt;, &gt;, &quot;
- Hexadecimal Character References: &#x2208; ($\in$), &#x2211; ($\sum$)

## 8. Advanced Table Variations

Column alignments, tables without outer pipes, line breaks and escaped pipes inside cells, and rich inline formatting.

| Item Name (Left) | Category (Center) | Quantity (Right) | Status / Notes     |
| :--------------- | :---------------: | ---------------: | :----------------- |
| **Lucivo Core**  | App               |                1 | `Active`           |
| *Vendor Libs*    | Script            |                4 | ~~Deprecated~~     |
| KaTeX Math       | Typography        |              100 | <mark>Ready</mark> |

Table omitting outer `|` pipes (supported in GFM):

Header 1 | Header 2 | Header 3
:--- | :---: | ---:
Item A | Center A | 100
Item B | Center B | 200

### Line Breaks, Escaped Pipes, and Composite Elements Inside Cells

Use `<br>` for line breaks inside table cells, and escape literal pipe characters with `\|`.

| Feature              | Escape & Line-Break Example                             | Composite Styling                 |
| :------------------- | :------------------------------------------------------ | :-------------------------------- |
| **Escaped Pipes**    | Command: `ls \| grep .md`                              | [Details Link](https://github.com/) |
| **Multi-Line Cells** | First line of description<br>Second line of details<br>Third line caveat | - Bullet-style line 1<br>- Bullet-style line 2 |
| **Tasks & Status**   | Checkbox syntax: `[x]` Done / `[ ]` Pending             | <span style="color: #16a34a; font-weight: bold;">● Operational</span> |

## 9. Safe HTML Elements and Semantics

Standard HTML5 elements that safely pass through XSS sanitization (DOMPurify) inside Markdown.

### 9.1 Inline Text Semantics & Typography

- Inserted / Underlined: <ins>Newly inserted text (ins)</ins>, <u>Underlined text (u)</u>
- Deleted / Strikethrough: <del>Deleted passage (del)</del>, <s>Strikethrough text (s)</s>
- Marker highlight: <mark>Highlighted key phrase</mark>
- Superscript & Subscript: 2<sup>10</sup> = 1024, chemical formula H<sub>2</sub>SO<sub>4</sub>, ground state $S$<sub>0</sub>
- Small print & disclaimers: <small>* Company and product names mentioned are trademarks or registered trademarks of their respective owners.</small>
- Abbreviations with tooltips: <abbr title="GitHub Flavored Markdown">GFM</abbr>, <abbr title="Application Programming Interface">API</abbr>
- Definitions & Citations: <dfn>Markdown</dfn> is a lightweight markup language. According to <cite>CommonMark Spec 0.31.2</cite>, inline structures are strictly specified. Short inline quote: <q>Simplicity is prerequisite for reliability.</q>
- Date/time semantics: Release date <time datetime="2026-11-12">November 12, 2026</time>
- Ruby annotations: <ruby>展示品質<rt>Exhibition Quality</rt></ruby>, <ruby>組版<rp>(</rp><rt>Typesetting</rt><rp>)</rp></ruby>
- Word-break opportunities: `<wbr>` tag for long identifiers: `VeryLongIdentifier<wbr>NameThatCanBe<wbr>BrokenAcrossLines`

### 9.2 Computer & Code Semantics

- Keyboard input (`kbd`): <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>, <kbd>Cmd</kbd> + <kbd>K</kbd>, single key <kbd>Enter</kbd>
- Sample output (`samp`): Command output <samp>Build succeeded in 70ms (0 errors, 0 warnings)</samp>
- Variable representation (`var`): Equation variables <var>E</var> = <var>m</var><var>c</var><sup>2</sup>, function arguments <var>x</var>, <var>y</var>
- Description list (`dl` / `dt` / `dd`):
  <dl>
    <dt><strong>CommonMark</strong></dt>
    <dd>A standardized Markdown specification eliminating ambiguity with a formal grammar and comprehensive test suite.</dd>
    <dt><strong>GFM (GitHub Flavored Markdown)</strong></dt>
    <dd>GitHub's standard dialect extending CommonMark with tables, task lists, strikethrough, and extended autolinks.</dd>
  </dl>

### 9.3 Collapsible Disclosure Blocks (`details` / `summary`)

Interactive collapsible sections, supporting the `open` attribute and nested disclosure blocks.

<details>
<summary><strong>Advanced Settings (Click to Expand)</strong></summary>

Inside a `<details>` block, you can write standard Markdown syntax (paragraphs, lists, code) separated by blank lines.

- Option 1: Enable automatic live rendering
- Option 2: Configure cache retention timeout

```json
{
  "cache": true,
  "timeout": 3000
}
```

</details>

<details open>
<summary><strong>Expanded by Default (<code>details open</code>)</strong></summary>

Adding the `open` attribute displays the section expanded on initial load—useful when important notes should be visible immediately while remaining collapsible.
</details>

<details>
<summary><strong>Nested Disclosure Blocks</strong></summary>

Parent disclosure section.

<details style="margin-left: 1rem; border-left: 2px solid var(--border-strong); padding-left: 0.5rem;">
<summary>Nested Level 2</summary>

Organize deeper options and advanced parameters cleanly.
</details>
</details>

### 9.4 Complex HTML Tables (`rowspan` and `colspan`)

Tables with vertical (`rowspan`) or horizontal (`colspan`) cell merging that cannot be expressed in Markdown pipe tables.

<table>
  <caption>Table 1: Component Architecture and Runtime Matrix</caption>
  <thead>
    <tr>
      <th rowspan="2">Layer</th>
      <th colspan="2">Engine</th>
      <th rowspan="2">Runtime Environment</th>
      <th rowspan="2">Notes</th>
    </tr>
    <tr>
      <th>Name</th>
      <th>Version</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td rowspan="2">Document Parsing</td>
      <td>marked</td>
      <td>18.1.3</td>
      <td>In-Browser</td>
      <td>Full GFM compliance</td>
    </tr>
    <tr>
      <td>DOMPurify</td>
      <td>3.4.17</td>
      <td>In-Browser</td>
      <td>XSS sanitization</td>
    </tr>
    <tr>
      <td rowspan="2">Visualization</td>
      <td>Mermaid</td>
      <td>12.3.0</td>
      <td>SVG Rendering</td>
      <td>18 diagram types</td>
    </tr>
    <tr>
      <td>KaTeX</td>
      <td>0.19.1</td>
      <td>HTML / MathML</td>
      <td>High-speed TeX math typesetting</td>
    </tr>
  </tbody>
  <tfoot>
    <tr>
      <td colspan="3">Total: 4 Core Libraries</td>
      <td colspan="2">All bundled locally (100% offline capable)</td>
    </tr>
  </tfoot>
</table>

### 9.5 Figures and Theme-Aware Media (`figure` / `picture`)

Semantic grouping of illustrations and captions using `<figure>` / `<figcaption>`, plus theme-switching images with `<picture>` matching OS Light/Dark preferences.

<figure style="margin: 1.5rem 0; text-align: center;">
  <svg width="280" height="50" viewBox="0 0 280 50" style="display: inline-block;">
    <rect width="280" height="50" rx="8" fill="var(--panel-sub)" stroke="var(--border-strong)"/>
    <text x="140" y="30" text-anchor="middle" fill="var(--text-primary)" font-size="13" font-weight="600">Figure Illustration (SVG)</text>
  </svg>
  <figcaption style="font-size: 0.85em; color: var(--text-secondary); margin-top: 0.5rem;">
    Figure 1: Semantic pairing of an illustration and its caption
  </figcaption>
</figure>

Dark-mode-aware image syntax (standard GitHub `<picture>` pattern):

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="images/diagram-dark.svg">
  <img src="images/diagram-light.svg" alt="Theme-aware diagram">
</picture>
```

## 10. Colors and Inline Styling (HTML `style` Attribute)

Using DOMPurify-validated `style` attributes, you can craft custom text colors, pastel background highlights, bordered callout boxes, and status pills.

### 10.1 Inline Text Colors & Typography

- Solid text colors: <span style="color: #e11d48; font-weight: bold;">Danger / Error (Red)</span>, <span style="color: #2563eb; font-weight: bold;">Info / Primary (Blue)</span>, <span style="color: #16a34a; font-weight: bold;">Success / Healthy (Green)</span>, <span style="color: #d97706; font-weight: bold;">Warning / Caution (Amber)</span>
- Pastel background highlights:
  - <span style="background-color: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Critical Alert</span>
  - <span style="background-color: #e0f2fe; color: #075985; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Info Notice</span>
  - <span style="background-color: #dcfce7; color: #166534; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Passed 100%</span>
  - <span style="background-color: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 500;">Pending Review</span>
- Decorative underline: <span style="text-decoration: underline wavy #3b82f6; text-underline-offset: 4px;">Phrase emphasized with a wavy underline</span>

### 10.2 Status Badges & Pills

Use rounded badges and status pills inline within prose:

- Status: <span style="display: inline-block; padding: 2px 10px; font-size: 0.75rem; font-weight: 700; border-radius: 9999px; background: #2563eb; color: #ffffff;">v0.6.0 RELEASE</span>
- Release channel: <span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; background: rgba(100, 116, 139, 0.15); color: var(--text-primary); border: 1px solid var(--border-subtle);">LTS</span>
- Difficulty badge: <span style="display: inline-block; padding: 2px 8px; font-size: 0.75rem; font-weight: 600; border-radius: 4px; background: rgba(34, 197, 94, 0.15); color: #16a34a;">Difficulty: Low</span>

### 10.3 Custom Information Containers

Custom-styled panels and cards distinct from standard GitHub alerts:

<div style="border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 1rem 0; background: rgba(59, 130, 246, 0.08); border-radius: 0 8px 8px 0;">
  <strong style="color: #2563eb;">Custom Information Callout</strong><br>
  By leveraging CSS custom properties (<code>var(--text-primary)</code>) and translucent fills, you can build callout boxes that adapt seamlessly to both Light and Dark themes.
</div>

<div style="border: 1px solid var(--border-strong); padding: 14px 18px; margin: 1rem 0; border-radius: 8px; background: var(--panel-sub);">
  <div style="font-weight: 700; margin-bottom: 6px;">Card Container</div>
  Use bordered, rounded containers to group related architectural decisions or prerequisites cleanly.
</div>

## 11. Footnotes (GFM Footnotes)

Standard GFM footnote syntax for collecting supplementary notes and citations at the bottom of a document.

Reference a footnote at the end of a sentence[^1]. Named alphanumeric footnote labels are also supported[^gfm-ref].
You can also write footnotes containing term definitions or reference links[^note-detail], and reference the same footnote multiple times[^1].

[^1]: Standard footnote using a numeric marker.
[^gfm-ref]: Compliant with the GitHub Flavored Markdown Footnotes specification.
[^note-detail]: Footnotes can contain endnotes, term definitions, or source links such as [GFM Spec](https://github.github.com/gfm/).

## 12. Emoji (Emoji Shortcodes & Unicode)

Standard GitHub `:shortcode:` emoji syntax alongside native Unicode emoji:

- Status & Notifications: :white_check_mark: Done, :warning: Warning, :x: Failed, :bulb: Tip, :speech_balloon: Comment
- Product & Development: :rocket: Release, :tada: Celebration, :sparkles: New Feature, :art: Design, :memo: Docs, :bug: Bug Fix
- Actions & Reactions: :+1: Approve, :-1: Disapprove, :eyes: In Review, :zap: Performance, :lock: Security
- Native Unicode Emoji: ✨ 🚀 🎨 📝 💡 ⚠️ ✅ 🔍 📊

## 13. GitHub Alerts (Callouts)

Starting a blockquote with `[!NOTE]`, `[!TIP]`, `[!IMPORTANT]`, `[!WARNING]`, or `[!CAUTION]` on its own line transforms it into one of GitHub's five semantic alert panels. Marker casing is case-insensitive, and the same Markdown renders identically on GitHub.

> [!NOTE]
> Highlights supplementary information readers should not skip. **Bold**, `code`, and [links](https://github.com/prankster-freedom/Lucivo) work normally inside alerts.

> [!TIP]
> Helpful advice for smoother workflows. Moving your cursor to another chapter in the editor automatically scrolls the preview to that section.

> [!IMPORTANT]
> Essential information required to accomplish a goal.
>
> You can include multiple paragraphs or bulleted lists inside alerts:
>
> - First key point
> - Second key point

> [!WARNING]
> Urgent information requiring immediate attention to prevent issues.

> [!caution]
> Advises about risks or negative outcomes of certain actions (lowercase markers are also recognized).

The following two examples render as standard blockquotes (matching GitHub's behavior):

> [!NOTE] A blockquote where text continues on the same line after the marker

> [!HINT]
> A blockquote using a marker outside the five standard alert types

## 14. Images and Links to Other Documents

Images and links to other Markdown files can be written using relative paths resolved from this document's location (`samples` folder). They work both when opened as built-in samples and when opening a local directory via **Open → Open Folder…**.

Image written in Markdown syntax:

![Flow of composing Markdown into editorial layouts and presentations with Lucivo](images/lucivo-flow.en.svg)

Image with explicit width written in HTML:

<img src="images/lucivo-flow.en.svg" alt="Flow diagram displayed at 320px width" width="320">

Links to other Markdown files open directly inside Lucivo. Appending `#` followed by a heading slug jumps straight to that heading:

- [Basic Notation Sample (`notation_sample.md`)](notation_sample.md)
- ["6. Tables" in Basic Notation Sample](notation_sample.md#6-tables)
- [Visual Mode Comprehensive Sample (`visual-sample.md`)](visual-sample.md)
- ["2. Links and Reference Links" in this document](#2-links-and-reference-links)

## 15. Directory Structure Trees

Folder hierarchies drawn with box-drawing characters (`├`, `└`, `│`) are rendered as crisp aligned trees—you can paste output directly from the `tree` command. Trailing comments after `#` or `←` align neatly in a right-hand column.

```
lucivo/
├── index.html
├── css/
│   └── style.css      # Visual styling
├── js/
│   ├── app.js         # Core application
│   └── stage.js       ← Stage presentation effects
└── samples/
    ├── notation_sample.md
    └── images/
        └── lucivo-flow.svg
```

Tree notation also renders when written as a plain paragraph without a fenced code block:

ProjectDocs
├Proposal.md
├Images
│└Overview.png
└Minutes.md

When writing trees using indentation alone, specify `tree` as the code block language. To display text verbatim without tree formatting, use `text`.

```tree
docs/
  guide/
    intro.md
  images/
    flow.png
```

## 16. Supplementary Math Function Plots (Visual Mode)

Lucivo automatically detects single-variable explicit functions ($y = f(x)$) written in inline or block math, plots them numerically in Visual Mode, and renders crisp supplementary PNG graphs alongside the typeset equations (Fast Mode displays the equation alone).

### 16.1 Supported Function Plot Matrix

| Category | Syntax / Functions | Plotted | Notes |
| :------- | :----------------- | :-----: | :---- |
| **Target Variable** | Single variable $x$ ($y = f(x)$ or $f(x) = \dots$) | Yes | Recognized in both inline and block math |
| **Trigonometric** | $\sin, \cos, \tan, \arcsin, \arccos, \arctan, \sinh, \cosh, \tanh, \sec, \csc, \cot$ | Yes | Supports $\sin(x)$, $\sin 2x$, $\sin^2 x$, etc. |
| **Elementary** | Polynomials ($x^n$), exponentials ($\exp, e^x$), logs ($\ln, \log$), square roots ($\sqrt{x}$) | Yes | Includes arithmetic, fractions (`\frac`), and absolute value ($\lvert x \rvert$) |
| **Special Functions** | $\mathrm{sinc}(x) = \frac{\sin x}{x}$, $\mathrm{abs}, \mathrm{floor}, \mathrm{ceil}, \mathrm{sign}$ | Yes | Safely handles discontinuities and removable limits |
| **Domain Bounds** | $\quad (A \le x \le B)$ or $\quad (x \in [A, B])$ | Yes | Appended at the end of an equation to set plot range |
| **Multi-Curve Plots** | `\begin{aligned} ... \end{aligned}` (up to 4 curves) | Yes | Overlays curves using the active theme's 4-color palette |
| **Differential Eqs** | Derivatives & ODEs/PDEs ($y', y'', \frac{dy}{dt}, \partial$, etc.) | No | KaTeX typesetting only (excluded from auto-plotting) |
| **Integrals & Transforms** | Definite integrals ($\int$), limits ($\lim$), infinity ($\infty$), Laplace/Fourier ($\mathcal{L}, \mathcal{F}$) | No | KaTeX typesetting only (excluded from auto-plotting) |
| **Multivariate / Matrix** | Multivariable functions ($f(x, y)$), matrices (`pmatrix`, etc.), piecewise (`cases`) | No | KaTeX typesetting only (excluded from auto-plotting) |

### 16.2 Plottable Equation Examples

#### 16.2.1 Elementary Functions (Inline Display)

Inline math expressions in body prose also receive compact supplementary plots right beside the equation:

- **Trigonometric**: Sine wave $y = \sin(x)$, cosine wave $y = \cos(x)$
- **Polynomial / Quadratic**: Parabola $f(x) = x^2 - 2x + 1$, quadratic curve $y = x^2 - 4x + 3$
- **Exponential**: Gaussian curve $y = \exp(-x^2)$, exponential decay $y = e^{-0.5x}$
- **Logarithmic / Radical**: Natural logarithm $y = \ln(x)$, square root $y = \sqrt{x}$

#### 16.2.2 Equations with Explicit Domain Bounds (Block Display)

Specify plot domains at the end of an equation using `\quad (-5 \le x \le 5)` or `\quad (x \in [-5, 5])`:

- **Polynomial with domain ($x \in [-5, 5]$)**:

$$
y = x^2 - 2x + 1 \quad (x \in [-5, 5])
$$

- **Sine wave with explicit bounds ($-2\pi \le x \le 2\pi$)**:

$$
y = \sin(x) \quad (-2\pi \le x \le 2\pi)
$$

- **Sinc function (damped oscillation) over wide domain ($-4\pi \le x \le 4\pi$)**:

$$
f(x) = \frac{\sin(x)}{x} \quad (-4\pi \le x \le 4\pi)
$$

- **Square root function over positive domain**:

$$
y = \sqrt{x} \quad (0 \le x \le 16)
$$

#### 16.2.3 Multi-Function Overlay Plot (`aligned` Block)

Writing multiple functions inside an `aligned` block overlays up to four curves colored with the active Visual Mode theme palette:

$$
\begin{aligned}
y &= e^{-0.3x}\sin(2x) \\
y &= e^{-0.3x} \\
y &= -e^{-0.3x}
\end{aligned}
$$

### 16.3 Non-Plotted Advanced Equations (KaTeX Typesetting Only)

The following equations are safely identified as outside single-variable explicit plotting scope and render cleanly using Lucivo's KaTeX typesetting without attempting plot generation or throwing errors:

- **Second-Order Linear Differential Equation (Damped Oscillator)**:

$$
\frac{d^2y}{dt^2} + 2\zeta\omega_n \frac{dy}{dt} + \omega_n^2 y = 0
$$

- **Definition of the Laplace Transform**:

$$
\mathcal{L}\{f(t)\} = F(s) = \int_0^\infty f(t)e^{-st}\,dt
$$

- **Definition of the Fourier Transform**:

$$
\mathcal{F}\{f(t)\} = F(\omega) = \int_{-\infty}^\infty f(t)e^{-j\omega t}\,dt
$$
