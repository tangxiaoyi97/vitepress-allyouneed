---
title: Sidebar recipes
sidebarTitle: Sidebar recipes
order: 2
tags: [advanced, sidebar]
---

# Sidebar recipes

四个常用配置组合。完整参数见 [[sidebar-auto|Sidebar 自动生成文档]]。

## A. 经典文档站(单一全局 sidebar)

```ts
sidebarAuto: { layout: 'tree' }
```

所有页面看同一份 sidebar,子目录嵌套成 collapsible 子组。**默认行为**。

## B. 浅层 wiki(所有目录平铺)

```ts
sidebarAuto: { layout: 'flat' }
```

没有嵌套,每个文件夹都是顶级 group。适合单层的笔记 vault。

## C. 多产品文档(nav tab + 独立 sidebar)

```ts
themeConfig: {
  // nav 不写
},
sidebarAuto: {
  layout: 'per-folder',
  autoNav: true,
  autoFolderIndex: 'top-level',
}
```

顶部 nav 自动按顶层目录生成 tab,左侧 sidebar 跟着 URL 切换。本示例站用的就是这个。

## D. 全自动 + 严格控制

```ts
sidebarAuto: {
  mode: 'force',
  layout: 'tree',
  groupLink: 'top-level',
  groupOrder: ['Guide', 'Tour', 'Test'],
  stripNumericPrefix: true,
  collapsed: true,
  maxDepth: 2,
  exclude: ['drafts/**'],
}
```

强制覆盖用户写的 sidebar(`mode: 'force'`),侧边栏内部子组只展开不跳转(`groupLink: 'top-level'`),嵌套不超过 2 层,排除草稿。

## frontmatter 控制典型

排序 + 标题:
```yaml
---
sidebarTitle: 🚀 Quick Start
order: 1
---
```

隐藏:
```yaml
---
sidebarHidden: true
---
```

只读 frontmatter 不当 link 的目录索引:
```yaml
---
# tour/tour.md 内容为空,只有 frontmatter
sidebarTitle: Tour & Showcase
sidebarCollapsed: false
---
```

这种"空 dirIndex"文件会被 sidebar 用 frontmatter,但 group **不会带 link**,**也不会被 autoFolderIndex 覆盖**。
