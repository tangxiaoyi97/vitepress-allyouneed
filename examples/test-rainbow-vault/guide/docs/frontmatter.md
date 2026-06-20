---
title: Frontmatter 完整字段表
sidebarTitle: Frontmatter
order: 0
tags: [guide, frontmatter, reference]
---

# Frontmatter 完整字段表

每个 .md 文件顶部 YAML 块里能写的所有字段。**所有字段都可缺省**。按用途分组。

> 字段来源标记:
> - **AYN** = vitepress-allyouneed 本身识别
> - **VP** = VitePress 原生识别
> - **Obs** = Obsidian 标准字段(本插件也读)
> - **theme** = VitePress 默认主题(被本插件继承)

## 1. 页面标题 / 别名 / 标签

| 字段 | 来源 | 类型 | 默认 | 作用 |
|---|---|---|---|---|
| `title` | VP + AYN | string | basename | 页面标题(`<title>` + DocHeader banner + sidebar fallback) |
| `aliases` | Obs + AYN | string\|string[] | — | wikilink 别名,例 `[[Alpha]]` 命中 `aliases: [Alpha]` 的笔记 |
| `tags` | Obs + AYN | string\|string[] | — | 写一个/多个。与正文 `#tag` 合并参与 VaultIndex / Tags 视图 / DocHeader tag pills |
| `description` | VP | string | — | meta description(SEO) |

## 2. DocHeader / Banner

| 字段 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `cover` | string(URL 或本地路径) | — | **触发 banner 模式**;无此字段走 Mode B(无背景块,大字号标题) |
| `banner.x` | string | `'center'` | `background-position-x`(支持 `center`/`50%`/`30px`...) |
| `banner.y` | string | `'center'` | `background-position-y` |
| `banner.blur` | number(px) | `0` | cover 模糊度;>0 时自动 `transform: scale(1.05)` 避免边缘虚化露白 |
| `banner.opacity` | number(0..1) | `1` | cover 不透明度(可调出"半透明纹理"效果) |
| `banner.overlay` | number(0..1) | `0.6` | 暗化遮罩强度,大 = 更暗 |
| `banner.text` | `'light'`\|`'dark'` | `'light'` | banner 内文字色;浅色 cover 用 `'dark'` |
| `created` | string\|Date | — | 创建时间(ISO `2025-12-01`);DocHeader 显示 |
| `updated` | string\|Date | `page.lastUpdated` | 更新时间;无则 fallback git 时间 |
| `cssclasses` | string\|string[] | — | 应用到 `<body>` 的额外 class(挂载时加、卸载时清,跨页守恒) |

详见 [[doc-header|DocHeader 文档]]。

## 3. Sidebar 控制(每文件)

| 字段 | 类型 | 默认 | 作用 |
|---|---|---|---|
| `sidebarTitle` | string | `title` ?? H1 ?? basename | 覆盖 sidebar 显示文本(**优先级最高**) |
| `sidebarHidden` | boolean | `false` | `true` = 整篇从 sidebar 完全隐藏 |
| `order` | number | `+∞` | 排序权重,小在前;同 order 按 title 字母序 |
| `sidebarCollapsed` | boolean | `sidebarAuto.collapsed`(默认 `true`) | **仅 dirIndex 文件用**:控制该目录 group 默认展开/折叠 |
| `sidebarGroup` | string | — | **虚拟 group**:把文件抽到一个跨目录命名组(如 `Customization`),不按物理目录归类 |
| `sidebar` | array | — | **仅 `_sidebar.md` 用**:整段覆盖该目录 sidebar,VitePress 原生 `SidebarItem[]` shape |

field key 名可在 config 改:`sidebarAuto.titleKey/hiddenKey/orderKey`。详见 [[sidebar-auto|sidebar 自动生成]] + [[sidebar-override|手动覆盖]]。

## 4. Layout / 路由(VitePress 原生)

| 字段 | 来源 | 类型 | 默认 | 作用 |
|---|---|---|---|---|
| `layout` | VP | `'doc'`\|`'home'`\|`'page'`\|`false` | `'doc'` | `'home'` = hero + features 落地页;`'page'` = 无 sidebar/nav 全宽;`false` = 完全自定 |
| `navbar` | VP | boolean | `true` | 该页是否显示 nav |
| `sidebar` (per-page) | VP | boolean | `true` | 该页是否显示 sidebar |
| `aside` | VP | `true`\|`false`\|`'left'` | `true` | 右侧 outline 是否显示 |
| `outline` | VP | number\|[number,number]\|object\|`false`\|`'deep'` | `2` | TOC 深度,`[2,3]` = h2~h3,`'deep'` = h2~h6 |
| `lastUpdated` | VP | boolean | 跟 config | 该页是否显示最后更新时间 |
| `editLink` | VP | boolean | 跟 config | 该页是否显示"编辑此页"链接 |
| `prev` | VP | string\|object\|`false` | auto | 上一页链接,可关 |
| `next` | VP | string\|object\|`false` | auto | 下一页链接,可关 |

Home layout 专属:

| 字段 | 作用 |
|---|---|
| `hero.name` | 大标题 |
| `hero.text` | 副标题 |
| `hero.tagline` | 描述 |
| `hero.image` | logo(`{ src, alt }`) |
| `hero.actions[]` | CTA 按钮数组(`{ theme, text, link }`) |
| `features[]` | 特性卡片数组(`{ icon, title, details, link }`) |

例见根 `index.md`。

## 5. 主题(theme — 默认主题字段,被我们继承)

| 字段 | 作用 |
|---|---|
| `titleTemplate` | 浏览器 tab 标题模板(覆盖 site title) |
| `head` | 额外 `<head>` 标签 |

## 6. 完整示例

普通文档:
```yaml
---
title: 我的文章
aliases: [foo, bar]
tags: [demo, draft]

# DocHeader banner
cover: https://example.com/cover.jpg
banner:
  y: 35%
  blur: 0
  overlay: 0.55
  text: light
created: 2025-12-01
updated: 2026-05-20
cssclasses: [my-page]

# Sidebar
sidebarTitle: 🚀 我的文章
order: 1
sidebarHidden: false

# VitePress
outline: [2, 3]
aside: true
prev: { text: 上一篇, link: /prev }
next: false
---
```

目录的 dirIndex(`<folder>.md` / `index.md` / `README.md`):
```yaml
---
title: 文档区
sidebarTitle: Guide
sidebarCollapsed: false   # 默认展开
order: 1
---
```

`_sidebar.md` 手动 override(详见 [[sidebar-override]]):
```yaml
---
sidebar:
  - text: 概览
    link: /guide/overview
  - text: 文档
    collapsed: false
    items:
      - text: 安装
        link: /guide/docs/install
---
```

Home 落地页:
```yaml
---
layout: home
hero:
  name: My Site
  text: Subtitle
  tagline: A description
  actions:
    - theme: brand
      text: Get Started
      link: /guide/overview
features:
  - icon: 🚀
    title: Fast
    details: VitePress + Vite,instant HMR
---
```

虚拟 group(把文件归到跨目录的命名组):
```yaml
---
title: Custom theme overrides
sidebarGroup: Customization
order: 1
---
```
不在物理目录(advanced/)的 group 下,而是跑去 "Customization" 虚拟组。

空 dirIndex(只用 frontmatter,不当 link):
```yaml
---
# tour/tour.md 内容为空 → group 标题 'Tour',但点击不跳转,只展开/折叠
sidebarTitle: Tour & Showcase
sidebarCollapsed: false
---
```

## 7. 字段优先级速查

**sidebar 标题**:`sidebarTitle` > `title` > 第一个 `# H1` > basename(humanize 后)

**banner 标题**:`title` > `page.title` > basename(humanize 后)

**Created 显示**:`created` > nothing

**Updated 显示**:`updated` > `page.lastUpdated`(VitePress 提供,通常来自 git)

**dirIndex 选取**:`<folder>.md`(大小写不敏感) > `index.md` > `README.md`

**Tag 来源**:`frontmatter.tags` + 正文 `#tag`(可在 config 关 `views.parseInlineTags: false`)

**Alias 解析**:大小写不敏感(默认);可在 config 改 `caseSensitive: true`

## 8. 不识别的字段

我们**只读**上表列的字段。其它你自定义的字段(如 `author`、`category`、`status` 等)**不会出错**,会进 `entry.frontmatter` 保留;你的主题/Vue 组件可以读 `useData().frontmatter.author` 用。
