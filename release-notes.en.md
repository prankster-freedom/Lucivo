# Release Notes

Complete release history for Lucivo. The two most recent releases are also listed in [README.en.md](README.en.md#release-notes). ([日本語](release-notes.md))

## 0.16.1 (2026-11-24)

- fix(stage): The Presentation mode background now follows the background color of the color tone selected in Visual mode, including the bottom edge of chapter titles and the overview slides.
- fix(visual): Text on hero cards highlighted with "★" now switches automatically between dark navy and white to stay readable against the card color, even with light tones.

## 0.16.0 (2026-11-23)

- feat(samples): Added a new sample, "Color Museum": walk a 3D corridor of posters, windows, seasonal landscapes, color fields, and diagrams, and see the moments color moves people (Japanese and English editions)
- feat(ui): Added sample thumbnail cards to the start screen on the web edition; choosing one opens the sample from GitHub. The `present` URL parameter now starts Museum Walk as soon as the document opens
- feat(ui): Replaced seven of the product color tones in the Color Tone menu and moved seven pastel tones, including Cotton Candy, to the top
- fix(museum-walk): Fixed a long cover description spilling out of the gate on both sides, and the exhibit label overlapping a diagram's title in the hall
- fix(ui): Samples opened from the start screen can now return to it with the browser's Back button, and samples meant for Visual Mode switch to it automatically
- fix(ui): Fixed duplicate items in the Present menu
- fix(ui): Added to the drop guide that a public URL can be pasted to open a file

## 0.15.0 (2026-11-23)

- feat(ui): Expanded Visual Mode color tones to 20 presets (plus Style Default), made the tone selector menu scrollable, and improved text and accent contrast across Light and Dark appearances
- feat(ui): Added a public URL paste input field on the start screen so users on mobile devices without drag-and-drop can open public Markdown files and GitHub folders directly
- fix(url): Fixed loading GitHub `tree` URLs whose branch names contain slashes (such as `feature/...`)

## 0.14.0 (2026-11-23)

- feat(i18n): Added Japanese and English UI language switching, localized bundled samples, and English documentation
- feat(folder): Added full-text search across all Markdown files in an open folder with jump-to-match navigation
- feat(code): Added theme-adaptive syntax highlighting for code blocks matching Light/Dark appearance and Visual styles
- feat(perf): Expanded incremental rendering for edited blocks and chapters to keep typing and previewing responsive in large documents
- fix(visual): Kept chapters containing tables wider than a two-column track in single-column layout on wide screens so tables remain readable

## 0.13.0 (2026-11-22)

- feat!(modes): Removed the "Playable Diagram" and "Zooming Map" presentation modes (breaking change)
- feat(visual): Added toggling between 16:10 paged view and continuous single-page view in Visual Mode, with URL parameter sharing (`layout=single`)
- feat(visual): Synchronized Mermaid diagram node palettes and diagram card backdrops with the active color tone, and added inline color swatches for color codes in text
- feat(museum-walk): Added terrain elevation, stepped slopes, and camera height tracking to Museum Walk, along with walking head-bob motion, smoother zoom-in/out sway, and improved mouse wheel responsiveness
- feat(file-loading): Added a confirmation dialog ("Save & Reload", "Discard & Reload", or "Keep Editing") when an externally edited local file has unsaved changes, plus direct access to the public README from the logo and Help menu
- feat(analytics): Added Google Analytics telemetry to the Web Edition (Official and Preview) to measure usage of design styles, color tones, and presentation modes (never transmits filenames or document content; excluded from the Standalone Edition)
- fix(url-loader): Preserved `view=canvas` and `view=code` in shared URLs regardless of viewport width
- fix(museum-walk): Aligned forward/backward mouse wheel direction in Museum Walk with standard zoom-in/zoom-out controls

## 0.12.0 (2026-11-22)

- feat(url-loader): Added drag-and-drop support for public URLs and loading files/folders from GitHub `blob` and `tree` URLs, with relative image/link resolution and address-bar `?url=` synchronization
- feat(url-loader): Added sharing and restoration of display state (Fast/Visual mode, appearance, style, tone, and view layout) via URL query parameters
- feat(file-watch): Added automatic background reloading preserving scroll position when an unedited local file changes on disk, and a reload notification banner when unsaved edits exist
- feat(museum-walk): Added stepping closer, stepping back, and resetting viewing distance in Museum Walk via `Ctrl` + scroll wheel or `+` / `-` / `0` keys
- feat(perf): Scoped incremental parsing during editing and reduced rendering, scrolling, and zooming overhead for long documents and diagram-heavy files

## 0.11.0 (2026-11-20)

- feat(visual): Linked matching terms in Split commentary slabs with corresponding Mermaid diagram nodes via hover glow
- feat(visual): Added style-specific heading typefaces (lazy-loaded on Web Edition) matching each Visual style's persona
- feat(visual): Improved color harmony across all tones × Light/Dark and adapted Light code block backdrops
- feat(print): Improved Visual Mode PDF pagination to keep two-column chapters intact and fit single-page chapters cleanly
- feat(perf): Added incremental slab rendering, offscreen `content-visibility`, and lighter shadow/glass effects for large documents
- fix(visual): Prevented code blocks, diagrams, tables, and block math from overflowing two-column slabs
- fix(ui): Aligned CJK and Latin monospace widths (2:1) in Code editor and code blocks
- fix(museum-walk): Defaulted Museum Walk appearance to Dark and remembered the last selected appearance

## 0.10.5 (2026-11-19)

- feat(visual): Added automatic two-column layout for text-heavy chapters in Visual Mode on wide screens
- fix(print): Disabled signal light animations during print/PDF export in Visual Mode

## 0.10.4 (2026-11-19)

- feat(follow): Synced editor scroll and cursor position when clicking preview in Split view
- feat(show): Added End Card at the end of Stage Show with closing message and contact links
- feat(visual): Highlighted single evaluation symbols in tables as high-contrast badges
- feat(visual): Added subtle watermark chapter numbers in Visual Mode slabs
- feat(print): Added running header and page numbers in Visual Mode PDF output
- feat(render): Improved typing responsiveness and viewport-prioritized rendering in Fast Mode

## 0.10.3 (2026-11-18)

- feat(diagram): Added `n:1` (fit height) and `100%` (actual size) zoom presets including inside Expand modal
- feat(visual): Added featured hero card modifier (`★` / `☆` prefix) for Key Points cards
- feat(visual): Added optional ambient gradient & organic motion effects setting (default OFF)
- feat(visual): Refined typographic details and Forced Colors Mode support
- feat(markdown): Replaced default browser styles for `<hr>`, `<details>`, and task list checkboxes
- feat(ui): Added color tone selector and unified monoline vector icons
- feat(print): Aligned Visual Mode PDF pages to 16:10 and added Print/PDF check sample
- fix(print): Prevented awkward page breaks across subheadings, table headers, and TOC

## 0.10.2 (2026-11-17)

- feat(markdown): Added GFM footnotes (`[^1]`) and emoji shortcodes (`:rocket:`)
- feat(diagram): Improved commentary + diagram split typography and vertical centering
- fix(diagram): Improved Mermaid node line wrapping and badge sizing
- fix(visual): Improved Light appearance diagram palettes, subheading hierarchy, and mobile layouts
- fix(stage): Improved vertical centering and high-DPI display fitting in Stage Show
- fix(museum-walk): Fixed cover wrapping, alcove quote overflow, and theme switching
- fix(a11y): Allowed pinch zoom and synced native scrollbar colors with Light/Dark theme

## 0.10.1 (2026-11-15)

- feat(diagram): Improved Mermaid diagram readability and label spacing
- fix(visual): Refined heading, list, and KPI card typography in Visual Mode

## 0.10.0 (2026-11-15)

- feat(museum-walk): Added 3D "Museum Walk" presentation mode and sample for Web Edition (desktop)
- fix(stage): Improved Stage Show HUD readability and smartphone layout

## 0.9.2 (2026-11-14)

- fix: Aligned Web Edition build ID with Standalone ZIP and stabilized preview build version
- fix: Fixed automated release notes and ZIP instructions generation in GitHub Release workflow

## 0.9.1 (2026-11-14)

- feat: Added build version override and prerelease version comparison
- fix(stage): Improved Stage Show HUD ergonomics on mobile and single-screen fitting
- fix(ui): Hid update check button on Web Edition and linked to Standalone Edition

## 0.9.0 (2026-11-14)

- feat(ui): Added narrow-screen header layout, Present dropdown, and Split pane ratio resizer (#82, #88, #89)
- feat(file-loading): Added non-destructive Markdown auto-formatting on load
- feat(stage-show): Added Zooming Map and Playable Diagram presentation modes (Web Edition)

## 0.8.0 (2026-11-13)

- feat(file-loading): Added loading Markdown from public URL parameters (#78)
- fix(stage-show,ui): Removed unwanted scrollbars in Stage Show and improved animation toggle (#74, #76, #79)

## 0.7.0 (2026-11-12)

- feat(file-loading): Added current version display and "Check for Updates" button
- fix(file-loading): Fixed drag-and-drop file loading regression from 0.6.0

## 0.6.0 (2026-11-12)

- feat(file): Added folder drag-and-drop loading
- fix(diagram): Prevented Mermaid long node label truncation and preserved custom styles

## 0.5.1 (2026-11-11)

- fix(file-loading): Fixed encoding detection for Shift_JIS and CRLF dirty-check false positives

## 0.5.0 (2026-11-11)

- feat: Added 16:9 aspect-ratio presentation layout

## 0.4.0 (2026-11-10)

- feat(markdown): Added clean vector folder tree rendering for ASCII tree blocks
- feat(visual): Added automatic PNG math function plots alongside TeX equations

## 0.3.0 (2026-11-09)

- feat(file-loading): Added file drag-and-drop, folder browsing with relative images/links, and bundled sample linking
- feat(diagram): Added diagram pan-drag and Ctrl+Wheel zoom
- fix(file-loading): Used current filename as window title for PDF export default filename

## 0.2.0 (2026-11-09)

- feat: Bundled all libraries and fonts for full offline Standalone operation
- feat: Added keyboard shortcuts, Visual editorial templates, callouts, glossary, PDF print layout, and editor-preview scroll follow

## 0.1.0 (Initial)

- Split single-HTML prototype into modular HTML / CSS / JS structure
