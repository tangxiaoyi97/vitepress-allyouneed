---
title: Custom theme overrides
sidebarTitle: Custom theme
order: 1
tags: [advanced, theme]
---

# Custom theme overrides

Three-step onion: **inherit → replace → override**.

## 1. Full inherit

```ts
// .vitepress/theme/index.ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
export default Theme
```

## 2. Replace a global component

```ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
import MyGraph from './MyGraph.vue'

export default {
  ...Theme,
  enhanceApp(ctx) {
    Theme.enhanceApp?.(ctx)
    ctx.app.component('VaultGraph', MyGraph)  // overrides default VaultGraph
  },
}
```

Replaceable globals: `VaultGraph` / `VaultStats` / `Tags` / `DocHeader` / `Layout`.

## 3. Override CSS variables

In your theme entry, import your CSS **after** ours so it overrides `--ayn-*` globals:

```ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
import './overrides.css'   // imported after → wins
export default Theme
```

```css
/* overrides.css */
:root {
  --ayn-callout-tip-accent: #06b6d4;
  --ayn-tag-bg: var(--vp-c-purple-soft);
}
```

## Custom Layout

For deeper changes (e.g., extra slots):

```ts
import Theme from 'vitepress-allyouneed/theme'
import { Layout as AYNLayout } from 'vitepress-allyouneed/theme'
import MyFooter from './MyFooter.vue'
import { h } from 'vue'

export default {
  ...Theme,
  Layout: () => h(AYNLayout, null, {
    'layout-bottom': () => h(MyFooter),
  }),
}
```
