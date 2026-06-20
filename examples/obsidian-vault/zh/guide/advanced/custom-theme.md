---
title: Custom theme overrides
sidebarTitle: Custom theme
order: 1
tags: [advanced, theme]
---

# Custom theme overrides

三段论:**继承 → 替换 → 覆盖**。

## 1. 全继承默认主题

```ts
// .vitepress/theme/index.ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
export default Theme
```

## 2. 替换某个全局组件

```ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
import MyGraph from './MyGraph.vue'

export default {
  ...Theme,
  enhanceApp(ctx) {
    Theme.enhanceApp?.(ctx)
    ctx.app.component('VaultGraph', MyGraph)  // 覆盖默认 VaultGraph
  },
}
```

可被替换的全局组件:`VaultGraph` / `VaultStats` / `Tags` / `DocHeader` / `Layout`。

## 3. 覆盖 CSS 变量

在主题入口里**后引入**自己的 CSS,覆盖 `--ayn-*` 全局变量:

```ts
import Theme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'
import './overrides.css'   // 后引入 → 覆盖
export default Theme
```

```css
/* overrides.css */
:root {
  --ayn-callout-tip-accent: #06b6d4;
  --ayn-tag-bg: var(--vp-c-purple-soft);
}
```

## 自定义 Layout

如果需要更深度修改(例如加 footer 槽位):

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
