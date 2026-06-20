---
title: Theme interop & 样式覆盖
sidebarTitle: Theme & 样式覆盖
order: 3
tags: [advanced, theme, css]
---

# 第三方主题协作 & 样式完全覆盖

整套主题系统设计成**洋葱式三层**:**默认主题(VitePress) → 我们的 Layout + 组件 + CSS → 你/第三方的覆盖**。每一层都可以选择性接管或让位。

## 我们提供什么

```ts
// vitepress-allyouneed/theme 默认导出
{
  extends: DefaultTheme,    // 继承 VitePress 默认主题
  Layout,                    // 我们的 Layout(注入 DocHeader、管 cssclasses)
  enhanceApp({ app }) {      // 全局注册组件
    app.component('VaultGraph', VaultGraph)
    app.component('VaultStats', VaultStats)
    app.component('Tags', Tags)
    app.component('DocHeader', DocHeader)
  }
}
```

同时通过 `vitepress-allyouneed/theme/style.css` 暴露一整套 CSS。这份 CSS **全部用 CSS 变量** —— 第三方主题或你自己只要后加载覆盖变量就生效。

## 三种场景

### 场景 1:别人的主题也基于 DefaultTheme(最常见)

绝大多数 VitePress 第三方主题这样写。要把我们的组件 + 样式叠加进去:

```ts
// .vitepress/theme/index.ts
import OtherTheme from 'some-other-theme'
import AYNTheme from 'vitepress-allyouneed/theme'
import 'some-other-theme/style.css'
import 'vitepress-allyouneed/theme/style.css'    // 后 import → 覆盖 OtherTheme 的对应规则
// import './my-overrides.css'                    // 你的自定义在最后

export default {
  ...OtherTheme,
  ...AYNTheme,
  Layout: AYNTheme.Layout,   // 我们的 Layout 接管(否则失去 DocHeader)
  enhanceApp(ctx) {
    OtherTheme.enhanceApp?.(ctx)
    AYNTheme.enhanceApp?.(ctx)
  },
}
```

### 场景 2:你只想要我们的**组件 + 样式**,不接管 Layout

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

代价:没有自动 DocHeader 注入(你可以在 .md 里手写 `<DocHeader />`),`cssclasses` frontmatter 不自动应用。

### 场景 3:你/第三方完全自己写样式

把 `vitepress-allyouneed/theme/style.css` **不要 import**,自己 CSS 文件里照着我们 className 全写一遍即可。我们的 Vue 组件不依赖任何特定样式,只 emit 稳定的 className(`.callout`、`.ayn-doc-header`、`.wikilink` 等)。

## CSS 变量覆盖速查

后加载的 CSS 在 `:root` 覆盖以下变量,**不需要改我们任何文件**就能完全换皮。所有变量分组列在下面。

### 全局基础

```css
:root {
  /* 这些直接继承 VitePress;改主题色就改 --vp-c-brand-1 */
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

### Callouts(13 种 × 3 个 token)

每种 type 三个变量:`accent`(色条+标题色)、`bg`(整体软底)、`border`(描边)。

```css
:root {
  --ayn-callout-note-accent:  ...; --ayn-callout-note-bg:  ...; --ayn-callout-note-border:  ...;
  --ayn-callout-info-accent:  ...; --ayn-callout-info-bg:  ...; --ayn-callout-info-border:  ...;
  --ayn-callout-tip-accent:   ...; --ayn-callout-tip-bg:   ...; --ayn-callout-tip-border:   ...;
  /* success / question / warning / failure / danger / bug / example / quote / abstract / todo 同 */
}
```

例:把 `tip` 改成青色:
```css
:root {
  --ayn-callout-tip-accent: #06b6d4;
  --ayn-callout-tip-bg:     rgba(6, 182, 212, 0.08);
}
```

### Stats / Tags / Graph 视图

```css
:root {
  /* Stats 卡片 */
  --ayn-stats-card-bg:        var(--vp-c-bg-soft);
  --ayn-stats-card-border:    var(--vp-c-divider);
  --ayn-stats-number-color:   var(--vp-c-brand-1);
  --ayn-stats-label-color:    var(--vp-c-text-2);

  /* Tags pill */
  --ayn-tag-bg:               var(--vp-c-bg-soft);
  --ayn-tag-text:             var(--vp-c-text-1);
  --ayn-tag-hover-bg:         var(--vp-c-brand-1);
  --ayn-tag-hover-text:       var(--vp-c-white);

  /* Graph 节点 / 边 */
  --ayn-graph-node-color:        var(--vp-c-brand-1);
  --ayn-graph-node-stroke:       var(--vp-c-bg);
  --ayn-graph-edge-color:        var(--vp-c-divider);
  --ayn-graph-edge-embed-color:  var(--vp-c-brand-2, var(--vp-c-brand-1));
  --ayn-graph-bg:                var(--vp-c-bg);
  --ayn-graph-label-color:       var(--vp-c-text-1);
}
```

### Highlight `<mark>` + Footnotes

```css
:root {
  --ayn-mark-bg:    var(--vp-c-warning-soft, rgba(234,179,8,0.25));
  --ayn-mark-text:  inherit;
}
```

Footnote backref / footnote 容器没有专用变量,直接覆盖 class:
```css
.ayn-footnote-ref a { color: var(--vp-c-brand-2); }
.ayn-footnotes { font-size: 0.95em; }
```

## ClassName 速查(选择器层覆盖)

CSS 变量盖不到的细节,直接覆盖 className:

| 选择器 | 含义 |
|---|---|
| `.wikilink` | 普通 wikilink |
| `.wikilink--dead` | 死链(无 href,不可点) |
| `.wikilink--unmatched-anchor` | 锚点不匹配 |
| `.transclusion` / `.transclusion--dead` / `.transclusion--cycle` / `.transclusion--too-deep` / `.transclusion--unmatched-anchor` | 嵌入卡片 + 失败态 |
| `.transclusion-source-link` | 嵌入右上角"前往源"箭头 |
| `.callout` / `.callout--<type>` / `.callout--foldable` | 13 种 callout |
| `.callout-title` / `.callout-icon` / `.callout-title-text` / `.callout-content` | callout 内部 |
| `.ayn-tag` | 正文 `#tag` 渲染 |
| `.ayn-doc-header` / `.ayn-doc-header--with-banner` / `.ayn-doc-header--no-banner` / `.ayn-doc-header--text-dark` | DocHeader 三种状态 |
| `.ayn-doc-banner-bg` / `.ayn-doc-banner-overlay` / `.ayn-doc-header-inner` | DocHeader 三层结构 |
| `.ayn-doc-banner-title` / `.ayn-doc-title-divider` / `.ayn-doc-meta-line` / `.ayn-doc-meta-item` / `.ayn-doc-meta-icon` / `.ayn-doc-tags` / `.ayn-doc-tag` | DocHeader 内部 |
| `.ayn-embed` / `.ayn-embed--audio` / `.ayn-embed--video` / `.ayn-embed--pdf` | audio/video/pdf 嵌入 |
| `.ayn-block-anchor` | block-ref 锚点 |
| `.ayn-footnotes` / `.ayn-footnote-ref` / `.ayn-footnote-backref` / `.ayn-footnote-item` / `.ayn-footnote-content` | footnotes |
| `.ayn-view` / `.ayn-view-loading` / `.ayn-view-error` / `.ayn-view-empty` | 视图 loading / error / empty 状态 |

## "我后加 CSS 就生效"的工作原理

我们所有视觉相关的样式都用 `:root` 变量驱动 + 没有 `!important`。第三方主题的 CSS:

1. **后加载** = 同特异性下后覆盖前。所以你 `import` 顺序里把自己的放后面就行。
2. **变量覆盖**(推荐) = 不用知道我们的选择器,改 `:root { --ayn-callout-tip-accent: ... }` 就能换色。
3. **选择器覆盖** = 想完全重写某 className,后写一份同名规则即可。

## 我开发主题想直接为这个插件适配

你的主题包里:

```ts
// your-theme/index.ts
import DefaultTheme from 'vitepress/theme'
import AYNTheme from 'vitepress-allyouneed/theme'
import 'vitepress-allyouneed/theme/style.css'   // 先 import 我们的
import './your-theme.css'                        // 你的 CSS 在后,覆盖

export default {
  extends: AYNTheme,                              // 继承我们的(包括 Layout + components)
  enhanceApp(ctx) {
    AYNTheme.enhanceApp?.(ctx)
    // 你的额外 setup
  },
}
```

然后你的 `your-theme.css` 里覆盖 `--ayn-*` 变量或 className。用户装你的主题就自动有适配版样式,**完全不需要改 vitepress-allyouneed**。
