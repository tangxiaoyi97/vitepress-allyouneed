---
title: Sidebar 自动生成
sidebarTitle: Sidebar Auto
order: 3
tags: [guide, sidebar, nav]
---

# Sidebar 自动生成

`sidebarAuto` 是一组选项,把整套**导航栏 + 侧边栏 + 文件夹索引页**自动从你的 vault 目录结构生成。完整字段如下,每个都有默认值,大部分场景**不写任何 sidebarAuto 也能用**。

## 触发与布局

### `mode`

控制何时生成 sidebar。

```ts
mode: 'fill-if-empty'   // 默认
mode: 'off'             // 完全不生成
mode: 'force'           // 总是覆盖 themeConfig.sidebar
```

- `'fill-if-empty'`(默认):你写了 `themeConfig.sidebar` 就让位,没写才自动生成
- `'force'`:不管用户有没有写,都用自动生成的
- `'off'`:不动 `themeConfig.sidebar`

### `layout`

控制 sidebar 的形态。

```ts
layout: 'tree'        // 默认
layout: 'flat'
layout: 'per-folder'
```

- `'tree'`(默认):单一全局 sidebar,子目录嵌套成 collapsible 子组。所有页面看同一份 sidebar
- `'flat'`:所有目录摊到顶层(不嵌套),适合浅 vault
- `'per-folder'`:**每个顶层目录一份独立 sidebar**,VitePress 按 URL 前缀切换。**配合 `autoNav: true` 实现"切 nav tab → 切 sidebar"体验**

## 自动 nav tabs

### `autoNav`

```ts
autoNav: false          // 默认
autoNav: true           // 自动生成 themeConfig.nav
```

开启时,如果用户没写 `themeConfig.nav`,插件按每个顶级目录生成一个 tab。第一项默认是 `Home`(可通过 `homeNavText` 改名),每个 tab 带 `activeMatch` 让子页面也保持高亮。

> 建议:`layout: 'per-folder'` + `autoNav: true` 一起开,得到 multi-section 体验。

### `homeNavText`

```ts
homeNavText: 'Home'     // 默认
```

`autoNav` 第一项的文字。

## Group 行为

### `groupLink`

控制 sidebar 中 group 标题(文件夹名)**是否可点跳转**。

```ts
groupLink: 'all'        // 默认
groupLink: 'top-level'
groupLink: 'off'
```

| 值 | 顶级 group | 子组(嵌套内) |
|---|---|---|
| `'all'`(默认) | 有 dirIndex → 可点跳转 | 同 |
| `'top-level'` | 同 | **不可点**,只展开/折叠 |
| `'off'` | 都不可点 | 都不可点 |

> **空 frontmatter-only 文件不算 dirIndex 内容**:如果 `tour/tour.md` 只有 frontmatter 没有正文,那它的 frontmatter(`sidebarTitle`/`sidebarCollapsed` 等)**仍会被使用**,但 group **不会**带 link。

### `collapsed`

```ts
collapsed: true         // 默认所有 group 起始折叠
collapsed: false        // 默认所有 group 起始展开
```

可被单 group 的 `sidebarCollapsed` frontmatter 覆盖。

## 排序

### `sortBy`

```ts
sortBy: 'order-then-title'   // 默认
sortBy: 'title'
sortBy: 'mtime-desc'
```

- `'order-then-title'`:先按 `frontmatter.order`(小在前),平手按 sidebar 显示标题字母序
- `'title'`:全按 sidebar 标题字母序
- `'mtime-desc'`:最近修改在上(适合"最近更新流")

### `groupOrder`

```ts
groupOrder: ['Tour', 'Guide']
```

顶级 group 的字母序覆盖。命中的 group 按数组顺序排前,其余按字母在后。匹配 dirname 或 group title(大小写不敏感)。

### `stripNumericPrefix`

```ts
stripNumericPrefix: true    // 默认
```

humanize 时自动剥掉 `01-foo.md` / `02_bar.md` / `03.baz.md` 这种数字前缀。常用场景:用 `01-intro.md` `02-install.md` 强制排序,但 sidebar 显示"Intro"/"Install"。

## 隐藏与排除

### `exclude`

```ts
exclude: ['drafts/**', 'wip-*.md']
```

简单 glob:`**` = 任意路径,`*` = 单段。从 sidebar 中排除(文件本身仍然存在,只是不出现在 sidebar)。

### `maxDepth`

```ts
maxDepth: 2             // 默认 undefined(不限)
```

嵌套深度上限,根算 0。`maxDepth: 1` 只展开一层子组,适合避免极深目录把 sidebar 撑爆。

## 自动生成文件夹 index

### `autoFolderIndex`

为缺 dirIndex 的文件夹**自动写一个 `index.md`**,简单列出子目录 + 子文件的 wikilink。

```ts
autoFolderIndex: 'top-level'   // 默认
autoFolderIndex: 'off'         // 不生成
autoFolderIndex: 'all'         // 所有非空目录都生成
autoFolderIndex: true          // === 'top-level'
autoFolderIndex: false         // === 'off'
autoFolderIndex: {             // 细控
  mode: 'all',
  exclude: ['drafts/**'],
  stripNumericPrefix: true,
  template: (ctx) => `# ${ctx.title}\n\n...`,
}
```

| 模式 | 行为 |
|---|---|
| `'off'` | 不生成,你完全自己控制所有 index.md |
| **`'top-level'`**(默认) | 只为**顶级目录**生成(对应 nav tab 入口),侧边栏内的子组保持原状(无 link,只可折叠) |
| `'all'` | 所有非空目录都生成 index.md |

**重要规则**:
- 用户已写的 index/README/同名 md **永远不被覆盖**(无论是否有内容)
- 我们之前自己生成的(带 sentinel comment 标识)允许更新
- 若用户后来加了 `<folder>.md` 索引,我们之前生成的 `index.md` 会被自动清理避免重复
- 空 frontmatter-only 的 index 文件**不被覆盖**,且**不被当作可点 link**,但其 frontmatter 设置仍生效

## frontmatter 端

任何一个 .md 文件都可以在 frontmatter 里写以下字段影响 sidebar:

```yaml
---
sidebarTitle: 自定义显示名     # 覆盖 sidebar 标题(优先级最高)
title: 页面标题                # fallback(也是 page.title)
order: 1                       # 排序权重,小在前;无值视为 +∞
sidebarHidden: true            # 整篇从 sidebar 隐藏
sidebarCollapsed: true         # 给 dirIndex 用:控制该 group 默认折叠
sidebarGroup: Customization    # **虚拟 group**:把文件抽到一个跨目录的命名组
---
```

### 自定义 key 名

如果你已经用了别的 frontmatter 命名约定:

```ts
hiddenKey: 'sidebarHidden'    // 默认
titleKey: 'sidebarTitle'      // 默认
orderKey: 'order'             // 默认
```

## 标题计算

### 默认优先级

某一项的 sidebar 标题按下面顺序找:

1. `frontmatter.sidebarTitle`
2. `frontmatter.title`
3. 第一个 `# H1`
4. basename(humanize 后,可能剥数字前缀)

group(文件夹)的标题:

1. dirIndex 的 `frontmatter.sidebarTitle`
2. dirIndex 的 `frontmatter.title`
3. dirIndex 的第一个 `# H1`
4. dirname humanize(剥数字前缀 + `-`/`_` 转空格 + Title Case)

### 完全接管

```ts
formatItemTitle: (entry) => `📄 ${entry.basename}`,
formatGroupTitle: (dirname) => dirname.toUpperCase(),
```

## dirIndex 识别(`<folder>.md` 优先)

任何文件夹都可以有"索引页",优先级(大小写不敏感):

1. **`<folder>.md`** —— 与文件夹同名,**最高优先级**。例:`tour/tour.md` 是 tour group 的索引
2. `index.md`
3. `README.md`

dirIndex 的作用:
- 被 sidebar 当作 group 的 link 目标(配 `groupLink: 'all'`)
- 它的 frontmatter 决定 group 的标题、是否默认折叠等

## 完整 cheatsheet

```ts
defineConfigWithAllYouNeed(
  { /* VitePress site config */ },
  {
    sidebarAuto: {
      // 触发 / 布局
      mode: 'fill-if-empty',        // 'off' | 'fill-if-empty' | 'force'
      layout: 'per-folder',         // 'tree' | 'flat' | 'per-folder'

      // 导航 + 内容生成
      autoNav: true,
      homeNavText: 'Home',
      autoFolderIndex: 'top-level', // 'off' | 'top-level' | 'all' | object

      // group 行为
      groupLink: 'all',             // 'all' | 'top-level' | 'off'
      collapsed: true,

      // 排序
      sortBy: 'order-then-title',   // 'order-then-title' | 'title' | 'mtime-desc'
      groupOrder: ['Guide', 'Tour'],
      stripNumericPrefix: true,

      // 隐藏 / 限制
      exclude: ['drafts/**'],
      maxDepth: 3,

      // frontmatter key 名
      hiddenKey: 'sidebarHidden',
      titleKey: 'sidebarTitle',
      orderKey: 'order',

      // 自定义函数
      formatGroupTitle: (n) => n,
      formatItemTitle: (e) => e.basename,
    }
  }
)
```

## 三种 layout 对比

| | `'tree'`(默认) | `'flat'` | `'per-folder'` |
|---|---|---|---|
| 输出形式 | `SidebarItem[]` | `SidebarItem[]` | `Record<path, SidebarItem[]>` |
| 嵌套展示 | ✓(子目录嵌套) | ✗(所有目录顶层平铺) | ✓ |
| 多 sidebar 切换 | ✗(全局一份) | ✗ | ✓(URL 前缀切换) |
| 配 `autoNav` | 可,但不切 sidebar | 同 | **推荐**,nav + sidebar 联动 |
| 适合 | 大多数 vault | 浅 vault(单层目录) | 多产品/多文档区站点 |

## 例子:per-folder + autoNav

```ts
{
  themeConfig: {
    // 不写 nav,不写 sidebar —— 都由插件接管
  }
},
{
  sidebarAuto: {
    layout: 'per-folder',
    autoNav: true,
    autoFolderIndex: 'top-level',
    groupOrder: ['Guide', 'Tour'],
  }
}
```

vault 结构:
```
/
├── index.md      # Home
├── guide/
│   ├── docs/
│   └── advanced/
├── tour/
│   ├── changelog/
│   └── v0.3-tour.md
└── test/
    └── ...
```

效果:
- 顶部 nav:`Home / Guide / Tour / Test`(自动)
- 进 `/guide/` 左侧只显示 guide 内容(嵌套 docs/ + advanced/ 两个子组)
- 进 `/tour/` 左侧只显示 tour 内容(含 changelog 子组)
- 各自配 Perspectives 视图组(Graph / Stats / Tags)
- 子组可点击展开/折叠;`autoFolderIndex: 'top-level'` 保证 `/guide/` `/tour/` `/test/` 这些 URL 落地
