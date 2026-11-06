# Lucivo Design Assets

**Lucivo — Exhibition-Grade Markdown Viewer**

Official vector asset package containing optimized SVGs for dark and light modes.

## Directory Structure

```text
lucivo_assets/
├── dark/
│   ├── favicon.svg          # 32x32 Tab Favicon
│   ├── icon_square.svg      # 512x512 App Icon (Rounded Rectangle)
│   ├── icon_round.svg       # 512x512 Circle Badge Icon
│   ├── logo_capsule.svg     # 440x120 Inline Code Capsule Logo
│   └── logo_full.svg        # 880x240 Full Title & Tagline Banner
│
├── light/
│   ├── favicon.svg          # 32x32 Tab Favicon
│   ├── icon_square.svg      # 512x512 App Icon (Rounded Rectangle)
│   ├── icon_round.svg       # 512x512 Circle Badge Icon
│   ├── logo_capsule.svg     # 440x120 Inline Code Capsule Logo
│   └── logo_full.svg        # 880x240 Full Title & Tagline Banner
│
└── README.md
```

## Front-end Implementation Tips

1. **Favicon in HTML**:
   ```html
   <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
   ```
2. **Responsive Theme Syncing**:
   ```html
   <picture>
     <source srcset="/assets/dark/logo_full.svg" media="(prefers-color-scheme: dark)">
     <img src="/assets/light/logo_full.svg" alt="Lucivo Markdown Presenter" height="48">
   </picture>
   ```
3. **Inline SVG**:
   All files are clean, valid, standalone XML and can be directly inlined inside React/Vue components for zero network latency and dynamic CSS stroke/fill manipulation.
