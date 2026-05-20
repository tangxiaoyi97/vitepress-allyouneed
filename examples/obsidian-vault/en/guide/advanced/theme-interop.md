---
title: Theme interop & CSS overrides
sidebarTitle: Theme & CSS
order: 3
tags: [advanced, theme, css]
---

# Third-party theme interop & full CSS override

The theme system is a three-layer onion: **VitePress default → our Layout + components + CSS → your / third-party overrides**. Each layer can be replaced or kept.

## What we provide

```ts
// vitepress-allyouneed/theme default export
{
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('VaultGraph', VaultGraph)
    app.component('VaultStats', VaultStats)
    app.component('Tags', Tags)
    app.component('DocHeader', DocHeader)
  }
}
```

Plus `vitepress-allyouneed/theme/style.css` — all visuals via CSS variables. Override is as simple as loading your CSS later.

## Three scenarios

### Scenario 1: Other theme also based on DefaultTheme (most common)

```ts
// .vitepress/theme/index.ts
import OtherTheme from 'some-other-theme'
import AYNTheme from 'vitepress-allyouneed/theme'
import 'some-other-theme/style.css'
import 'vitepress-allyouneed/theme/style.css'    // imported later → overrides OtherTheme's matching rules
// import './my-overrides.css'                    // yours last

export default {
  ...OtherTheme,
  ...AYNTheme,
  Layout: AYNTheme.Layout,   // our Layout takes over (otherwise no DocHeader)
  enhanceApp(ctx) {
    OtherTheme.enhanceApp?.(ctx)
    AYNTheme.enhanceApp?.(ctx)
  },
}
```

### Scenario 2: Just want our **components + CSS**, not Layout

```ts
import OtherTheme from 'some-other-theme'
import { DocHeader, VaultGraph, VaultStats, Tags } from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'

export default {
  ...OtherTheme,
  enhanceApp(ctx) {
    OtherTheme.enhanceApp?.(ctx)
    ctx.app.component('DocHeader', DocHeader)
    ctx.app.component('VaultGraph', VaultGraph)
    ctx.app.component('VaultStats', VaultStats)
    ctx.app.component('Tags', Tags)
  },
}
```

Cost: no auto DocHeader injection (you can `<DocHeader />` manually in .md), `cssclasses` frontmatter not auto-applied.

### Scenario 3: Completely custom styling

Don't import `vitepress-allyouneed/theme/style.css`. Write your CSS file rewriting all our classes. Our Vue components don't depend on any specific styles — they only emit stable classNames (`.callout`, `.ayn-doc-header`, `.wikilink`, etc.).

## CSS variable cheatsheet

Load CSS later to override these `:root` variables — **no need to touch our source**.

### Base globals

```css
:root {
  --ayn-bg:           var(--vp-c-bg);
  --ayn-bg-soft:      var(--vp-c-bg-soft);
  --ayn-bg-mute:      var(--vp-c-bg-mute);
  --ayn-text-1:       var(--vp-c-text-1);
  --ayn-text-2:       var(--vp-c-text-2);
  --ayn-divider:      var(--vp-c-divider);
  --ayn-brand:        var(--vp-c-brand-1);
  --ayn-brand-soft:   var(--vp-c-brand-soft, var(--vp-c-brand-1));
}
```

### Callouts (13 types × 3 tokens)

Each type has accent / bg / border:

```css
:root {
  --ayn-callout-note-accent:     #64748b;
  --ayn-callout-info-accent:     #3b82f6;
  --ayn-callout-tip-accent:      #10b981;
  --ayn-callout-success-accent:  #16a34a;
  --ayn-callout-question-accent: #8b5cf6;
  --ayn-callout-warning-accent:  #d97706;
  --ayn-callout-failure-accent:  #ef4444;
  --ayn-callout-danger-accent:   #dc2626;
  --ayn-callout-bug-accent:      #f43f5e;
  --ayn-callout-example-accent:  #a855f7;
  --ayn-callout-quote-accent:    #64748b;
  --ayn-callout-abstract-accent: #06b6d4;
  --ayn-callout-todo-accent:     #3b82f6;
}
```

Example: change `tip` to cyan:
```css
:root {
  --ayn-callout-tip-accent: #06b6d4;
}
```

### Stats / Tags / Graph views

```css
:root {
  /* Stats cards */
  --ayn-stats-card-bg:      var(--vp-c-bg-soft);
  --ayn-stats-card-border:  var(--vp-c-divider);
  --ayn-stats-number-color: var(--vp-c-brand-1);
  --ayn-stats-label-color:  var(--vp-c-text-2);

  /* Tag pills */
  --ayn-tag-bg:         var(--vp-c-bg-soft);
  --ayn-tag-text:       var(--vp-c-text-1);
  --ayn-tag-hover-bg:   var(--vp-c-brand-1);
  --ayn-tag-hover-text: var(--vp-c-white);

  /* Graph nodes / edges */
  --ayn-graph-node-color:       var(--vp-c-brand-1);
  --ayn-graph-node-stroke:      var(--vp-c-bg);
  --ayn-graph-edge-color:       var(--vp-c-divider);
  --ayn-graph-edge-embed-color: var(--vp-c-brand-2, var(--vp-c-brand-1));
  --ayn-graph-bg:               var(--vp-c-bg);
  --ayn-graph-label-color:      var(--vp-c-text-1);
}
```

### Highlight `<mark>` + footnotes

```css
:root {
  --ayn-mark-bg:    var(--vp-c-warning-soft, rgba(234,179,8,0.25));
  --ayn-mark-text:  inherit;
}
```

Footnotes use classNames directly:
```css
.ayn-footnote-ref a { color: var(--vp-c-brand-2); }
.ayn-footnotes { font-size: 0.95em; }
```

## ClassName cheatsheet (selector-level override)

For details not covered by variables, override classes directly:

| Selector | Meaning |
|---|---|
| `.wikilink` | Regular wikilink |
| `.wikilink--dead` | Dead link (no href, not clickable) |
| `.wikilink--unmatched-anchor` | Anchor didn't match |
| `.transclusion` / `.transclusion--*` | Embed card + error states |
| `.transclusion-source-link` | "Go to source" arrow (top-right) |
| `.callout` / `.callout--<type>` / `.callout--foldable` | 13-type callouts |
| `.callout-title` / `.callout-icon` / `.callout-content` | Callout internals |
| `.ayn-tag` | Body `#tag` |
| `.ayn-doc-header` + `--with-banner` / `--no-banner` / `--text-dark` | DocHeader states |
| `.ayn-doc-banner-bg` / `.ayn-doc-banner-overlay` / `.ayn-doc-header-inner` | DocHeader 3-layer |
| `.ayn-doc-banner-title` / `.ayn-doc-title-divider` / `.ayn-doc-meta-line` / `.ayn-doc-tag` | DocHeader internals |
| `.ayn-embed` + `--audio` / `--video` / `--pdf` | Media embeds |
| `.ayn-block-anchor` | block-ref anchor |
| `.ayn-footnotes` / `.ayn-footnote-ref` / `.ayn-footnote-backref` | Footnotes |
| `.ayn-view` / `.ayn-view-loading` / `--error` / `--empty` | View states |

## How "load later wins"

All our visual rules are variable-driven and **no `!important`**. So:

1. **Later import** = same specificity, last wins. Just put yours after.
2. **Variable override** (recommended): no need to know our selectors, just `:root { --ayn-callout-tip-accent: ... }`.
3. **Selector override**: write same className later.

## I'm writing a theme — how do I adapt to this plugin?

In your theme package:

```ts
// your-theme/index.ts
import DefaultTheme from 'vitepress/theme'
import AYNTheme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'   // import ours first
import './your-theme.css'                        // your CSS last, overrides

export default {
  extends: AYNTheme,                              // inherit ours (Layout + components)
  enhanceApp(ctx) {
    AYNTheme.enhanceApp?.(ctx)
    // your extra setup
  },
}
```

Then your `your-theme.css` overrides `--ayn-*` variables or classes. Users installing your theme get the adapted styling **without touching vitepress-allyouneed**.
