# vitepress-allyouneed v0.3 — 全 Obsidian 兼容 + 文章级编辑体验

> Step 2 deliverable for v0.3. **不含代码,只有设计 + 拍板项。**

---

## 0. 设计纲领(沿用)

1. **零配置先行** — 用户把 Obsidian vault 当 srcDir 一指,跑起来就是完整网站
2. **可覆盖三层洋葱** — `vitepress-allyouneed/theme` 继承 default,用户可覆盖任何组件 / CSS / 行为
3. **系统化 VaultIndex** — 所有新模块从同一份索引消费,不二次扫描
4. v0.3 加一条新原则:**可关性** — 每个增强(头部、OnThisPage、sidebar、各语法)都能在 plugin config 和 frontmatter 两层独立关掉

---

## 1. 范围(总览)

四大模块,按依赖关系排序:

```
模块 A — Obsidian 全语法           ← 最底层,markdown-it 规则
模块 B — Sidebar 自动生成           ← VitePress 接入层
模块 C — 文档头部美化               ← 主题 layout 层
模块 D — OnThisPage 增强            ← 主题 layout 层
```

每个模块独立可关、独立测试、独立 publish。**v0.3.0 建议**:模块 A + B + C 一次出 ; 模块 D 体量大风险高 → v0.3.1 单独发。

---

## 2. 模块 A — Obsidian 全语法

### A.1 优先级矩阵

| 语法 | Obsidian 原文 | 实现方式 | 优先级 | 估计 LOC |
|---|---|---|---|---|
| Callouts | `> [!note]` / `> [!warning]+` | markdown-it block rule(改写 blockquote 探测) | 🔴 必做 | 280 |
| Highlight | `==text==` | inline rule(简单) | 🔴 必做 | 60 |
| Comments | `%% comment %%` | inline + block rule(删除) | 🔴 必做 | 80 |
| Block refs | `^block-id`(定义)+ `[[Page#^id]]`(引用) | block rule 收集 + resolver 扩展 | 🟠 高 | 200 |
| Footnotes | `[^1]` ref + `[^1]:` def + `^[inline]` | `markdown-it-footnote` plugin + 自写 inline | 🟠 高 | 100 |
| Audio embed | `![[music.mp3]]` | extends embeds 模块 | 🟡 中 | 60 |
| Video embed | `![[clip.mp4]]` | extends embeds 模块 | 🟡 中 | 60 |
| PDF embed | `![[doc.pdf]]` | `<embed>` / `<iframe>` 包装 | 🟡 中 | 40 |
| Obsidian task ext | `- [/]` / `- [x]` / `- [-]` / `- [!]` 等 | markdown-it task plugin 扩展 | 🟢 低 | 80 |
| Mermaid | ` ```mermaid ` | VitePress 自带,可能要配匹配的 fence options | 🟢 低 | 20 |
| Math `$x$` / `$$x$$` | 同 LaTeX | v0.1 启 mathjax,可能已经能用 | ⚪ 已支持 | 0 |
| **不做** | Dataview / DataviewJS | Obsidian 插件级,非核心语法 | — | 0 |
| **不做** | Canvas / Excalidraw | 二进制 + JSON,VitePress 没法静态渲染 | — | 0 |

合计核心可做 LOC ≈ **980**。

### A.2 设计要点

**A.2.1 Callouts** — 最复杂的一个。
- markdown-it 默认 blockquote 探测到 `>` 就开始;我们写**前置** core rule,扫 token 流找 paragraph 开头是 `[!type]` 的 blockquote,改写为 `html_block`:`<div class="callout callout--<type>" data-callout="<type>"><div class="callout-title">…</div><div class="callout-content">…</div></div>`
- 支持的 type:`note` / `info` / `tip` / `success` / `question` / `warning` / `failure` / `danger` / `bug` / `example` / `quote` / `abstract` / `todo`(13 种,Obsidian 标准)
- foldable:`[!info]+`(默认展开)/ `[!info]-`(默认折叠) → 用 `<details>` + `<summary>`
- custom title:`> [!note] My title` → title 用用户给的
- 嵌套:`> [!warning]` 里再 `> > [!info]` → 递归(markdown-it blockquote 本身就递归)

**A.2.2 Highlight** `==text==`
- 极简 inline rule,前后必须紧贴非空白字符
- 输出 `<mark>text</mark>`

**A.2.3 Comments** `%% ... %%`
- inline rule(单行内) + block rule(跨行)
- 输出**空字符串**(完全删除)
- Obsidian 行为:不渲染,但保留在源文件给用户看

**A.2.4 Block refs**
- 定义:行尾 `^block-id` 锚定该块。block rule 在所有 block 解析后跑一遍 core rule,把 `^block-id` 从内容里剥掉,**在 VaultIndex 加 `blockAnchors: Map<absPath, Map<blockId, line>>`**
- 引用:`[[Page#^block-id]]` 在 resolver 里识别 `#^` 前缀,转成 `<page-url>#block-<block-id>`
- 锚点:Vue 渲染时给 block 加 `id="block-<id>"`(VitePress 默认 heading anchor 类似机制)

**A.2.5 Footnotes**
- 用 `markdown-it-footnote`(成熟 plugin,~5KB)
- Obsidian 风的 `^[inline footnote]` 自写一条 inline rule 转成标准 `[^autoN]` 形式注入

**A.2.6 媒体 embed**(audio/video/pdf)
- embeds 模块的 image 分支扩展:扩展名识别走分支
- audio:`<audio controls src="...">`
- video:`<video controls src="..." />`(支持 `|400x300` 尺寸)
- pdf:`<iframe src="..." width="100%" height="600">`(可被 `|<height>` 覆盖)

### A.3 风险

- Callouts 嵌套 + 折叠 + custom title 的组合多;**写 30+ 测试覆盖各种边界**
- Block refs 改 VaultIndex 数据结构,要回归 v0.2 测试
- Footnote plugin 和 VitePress 的 markdown-it 共存:若 VitePress 已自带要去重

---

## 3. 模块 B — Sidebar 自动生成

### B.1 算法

输入:VaultIndex.files + 文件夹树
输出:VitePress `themeConfig.sidebar` 数组(或 per-path 对象)

```
buildAutoSidebar(index, options):
  tree = group files by directory
  for each directory:
    group = {
      text: directoryDisplayName(dir),
      collapsed: options.sidebar.collapsedByDefault ?? true,
      items: [
        // index.md / README.md 作为 group link
        ...其它 files,按 (frontmatter.order || basename) 排序
      ]
    }
    if directory has subdirectories → 递归嵌套
  return root group's items
```

### B.2 关键设计

- **文件夹显示名**:从 `<dir>/.allyouneed-folder.json` 读 `name`(可选),否则用 directory basename **大写首字母**(`cooking` → `Cooking`)
- **排序优先级**:
  1. `frontmatter.order` / `frontmatter.weight`(数字,越小越前)
  2. 文件名数字前缀(`01-intro.md` → 1,`02-setup.md` → 2)
  3. 字典序(`a-z`)
  4. 文件夹优先于文件(可选,通过 `sidebar.foldersFirst: true`)
- **index.md / README.md** 在文件夹下时:
  - 作为该 group 的链接(`group.link`),group text 可点跳页
  - 不重复在 items 列表里
- **隐藏文件**:
  - `frontmatter.sidebar: false` → 跳过
  - `.` 开头的文件 / 目录 → 跳过(已经在 scanner 层挡了)
  - 用户在 plugin config 写 `sidebar.exclude: ['drafts/**']` → glob 黑名单
- **per-path sidebar**(VitePress 的 `sidebar: { '/foo/': [...], '/bar/': [...] }`):
  - 默认**单一 sidebar**(数组形式),全站统一
  - `sidebar.mode: 'unified' | 'per-section'`:`per-section` 时按顶层目录拆开
- **冲突处理**:用户自己在 `themeConfig.sidebar` 写了 → 跟自动生成**合并**(用户的在前)/**完全覆盖**(skip 自动) / **追加**(自动在前)三档,`sidebar.mode: 'merge' | 'override' | 'auto-only'`

### B.3 配置接口

```ts
{
  modules: { sidebar?: boolean },  // 总开关,默认 true
  sidebar?: {
    mode?: 'auto' | 'merge' | 'manual'   // 默认 'auto'(用户没传时自动)
    collapsedByDefault?: boolean          // 默认 true
    foldersFirst?: boolean                 // 默认 true
    showRootFiles?: boolean                // 根目录散文件是否显示。默认 true
    exclude?: string[]                     // glob 黑名单
    /** 自定义文件夹显示名映射 */
    folderNames?: Record<string, string>
    /** 自定义排序函数(返回负值 a 前) */
    sort?: (a: FileEntry, b: FileEntry) => number
  }
}
```

frontmatter:
- `order: 5`(数字)
- `sidebar: false`(从 sidebar 隐藏)
- `sidebarTitle: 'Custom Name'`(覆盖显示)

### B.4 嵌套示例

vault 结构:
```
vault/
├── index.md
├── notes/
│   ├── index.md
│   ├── cooking/
│   │   ├── sourdough.md
│   │   └── starter.md
│   └── reading/
│       ├── dune.md
│       └── dune-children.md
└── projects/
    └── project-c.md
```

自动生成的 sidebar(伪 JSON):
```js
[
  // 根 index.md → 直接跳 / (不在 sidebar 单独占位)
  { text: 'Notes', link: '/notes/', collapsed: true, items: [
    { text: 'Cooking', collapsed: true, items: [
      { text: 'Sourdough', link: '/notes/cooking/sourdough' },
      { text: 'Starter', link: '/notes/cooking/starter' },
    ]},
    { text: 'Reading', collapsed: true, items: [
      { text: 'Dune', link: '/notes/reading/dune' },
      { text: 'Dune Children', link: '/notes/reading/dune-children' },
    ]},
  ]},
  { text: 'Projects', collapsed: true, items: [
    { text: 'Project C', link: '/projects/project-c' },
  ]},
  // Perspectives 视图 group 已经在 v0.2 注入,自动追加到末尾
]
```

---

## 4. 模块 C — 文档头部美化

### C.1 视觉布局

```
┌──────────────────────────────────────────────┐
│  [cover 背景图,带遮罩,max-height: 320px]    │
│                                                │
│       <h1 class="ayn-doc-title">              │
│         Sourdough Basics                       │
│       </h1>                                    │
│                                                │
│  📅 Created Jan 15, 2025  ·  Updated Oct 20  │
│  📊 1,240 words · 6 min read                  │
│  🏷  #cooking  #fermentation                  │
└──────────────────────────────────────────────┘

[正文内容]
```

### C.2 frontmatter 新支持

| 字段 | 类型 | 作用 |
|---|---|---|
| `cover` | `string`(URL/相对路径)| 头部背景图;走 v0.1 资源管线,自动 hash;限 max-height(default 320px,configurable) |
| `created` | ISO date / yyyy-mm-dd | 创建时间;若缺省用文件 ctime |
| `updated` | ISO date / yyyy-mm-dd | 最后修改时间;若缺省用文件 mtime |
| `cssclasses` | `string[]` | 加到 page wrapper `class=`(实现见 C.3) |
| `description` | `string` | 已被 VitePress 用;头部副标题也用它 |
| `aliases` | `string[]` | 已被 v0.1 wikilink 用 |
| `tags` | `string[]` | 头部显示标签 |
| `publish` | `boolean` | 若 `false`,build 时 skip 该页 |
| `hideHeader` | `boolean` | 关闭本页头部美化 |

### C.3 cssclasses 实现

要让 `cssclasses: [warm-theme]` 在 frontmatter 里 → 实际加到 `<body>` 或 page wrapper 的 class,这样用户 CSS 写 `.warm-theme h1 { ... }` 就能生效。

实现方式:
- VitePress 提供 `pageClass` frontmatter(VitePress 自带),加到 `<div class="Layout">` 上
- 我们拦截 frontmatter 转换:把 `cssclasses` 数组 join 成空格分隔字符串,merge 进 `pageClass`
- 不破坏 VitePress 自带的 `pageClass`,做合并
- 实现位置:VaultScanner 解析 frontmatter 后,把派生的 `pageClass` 写进 entry.frontmatter

### C.4 字数 / 阅读时长

- 字数:`content` 去掉 frontmatter、code blocks、HTML 后,split words(中英文混合用 `\p{L}` matcher + 估算)
- 阅读时长:`Math.ceil(wordCount / 250)` 分钟(对中文 `Math.ceil(charCount / 500)`)
- 写进 `VaultData.nodes[i].stats: { wordCount, readMinutes }`(扩展 v0.2 的 VaultData)
- 头部组件读这些

### C.5 头部组件

新建 `theme/components/DocHeader.vue`:
- 通过 VitePress 主题的 layout slot `doc-before` 注入
- props/data 来自 frontmatter + 通过 composable 拿 word count
- cover 图通过 background-image,带渐变 mask 让文字可读
- 标题字号大、特殊字重(类似 medium / substack)
- meta 行(created / updated / words / tags)用图标
- mobile 响应式:cover 高度缩到 180px,字号 1.5em

### C.6 frontmatter / config 开关

- plugin config: `header?: { enabled?: boolean, coverMaxHeight?: number, showWordCount?: boolean, showDates?: boolean, showTags?: boolean }`
- frontmatter `hideHeader: true` 关本页头部
- 默认全开

---

## 5. 模块 D — OnThisPage 增强(MiniGraph + Backlinks)

### D.1 MiniGraph

- 显示**当前页 + 1 跳邻居**(可配 `miniGraph.depth: 1 | 2`,默认 1)
- 体积:200x200 px 嵌在 OnThisPage 顶部
- 简化 d3-force(用同款 graph 引擎,数据少)
- 当前节点居中,高亮
- 邻居围绕,点击跳转
- 顶部小按钮 "Open full graph" → 跳 `/_perspectives_/graph`

### D.2 Backlinks / References

底部两个分组:
- **References** — 当前页**指向**的页:从 VaultData.edges 取 `source == 当前页`
- **Backlinks** — 当前页**被引用**:取 `target == 当前页`
- 每条:`<a>` link + title + small "→ wikilink" / "→ transclusion" 角标

### D.3 注入位置

VitePress aside 有 slot:
- `aside-outline-before` — 在 outline 上方
- `aside-outline-after` — 在 outline 下方

```vue
<!-- theme/components/MiniGraphAside.vue → 注入到 aside-outline-before -->
<!-- theme/components/BacklinksAside.vue → 注入到 aside-outline-after -->
```

通过自定义 Layout 包一层,用 slots:

```vue
<script setup>
import DefaultTheme from 'vitepress/theme'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #aside-outline-before>
      <MiniGraphAside />
    </template>
    <template #aside-outline-after>
      <BacklinksAside />
    </template>
  </Layout>
</template>
```

### D.4 开关

- plugin config:`onThisPage?: { miniGraph?: boolean, backlinks?: boolean }`(默认全开)
- frontmatter:`onThisPage?: { miniGraph?: boolean, backlinks?: boolean }` 单页覆盖

---

## 6. 内部架构 v0.3

```
src/
├── (v0.1/0.2 已有)
├── modules/
│   ├── wikilinks/        ← 已有
│   ├── embeds/           ← 扩展支持 audio/video/pdf
│   ├── tags/             ← 已有
│   ├── callouts/         ← v0.3 新增
│   ├── highlight/        ← v0.3 新增
│   ├── comments/         ← v0.3 新增
│   ├── block-refs/       ← v0.3 新增
│   └── footnotes/        ← v0.3 新增(wraps markdown-it-footnote)
├── core/
│   ├── (已有)
│   ├── sidebar-auto/     ← v0.3 新增
│   │   ├── build.ts      ← 主算法
│   │   ├── sort.ts       ← 排序策略
│   │   └── folder-name.ts ← 文件夹显示名
│   ├── word-count.ts     ← v0.3 新增
│   └── header-meta.ts    ← v0.3 新增(frontmatter 派生 pageClass / dates / cover URL)
└── theme/
    ├── (已有)
    ├── Layout.vue        ← v0.3 新增,包 default Layout + 注入 slots
    ├── components/
    │   ├── DocHeader.vue       ← v0.3 新增
    │   ├── MiniGraphAside.vue  ← v0.3 新增
    │   ├── BacklinksAside.vue  ← v0.3 新增
    │   ├── Callout.vue         ← v0.3 新增(可选,callout 也能直接 HTML)
    │   └── (已有)
    └── styles/
        ├── (已有)
        ├── callouts.css   ← v0.3 新增(13 种类型颜色)
        ├── header.css     ← v0.3 新增
        └── aside.css      ← v0.3 新增
```

---

## 7. 估时与节奏

| 阶段 | 模块 | 估 LOC | 估时 |
|---|---|---|---|
| Phase 1 | 模块 A 必做语法(callouts / highlight / comments) | 420 | 高 |
| Phase 2 | 模块 A 高优(block refs / footnotes / 媒体 embed) | 460 | 中 |
| Phase 3 | 模块 B 自动 sidebar | 350 | 中 |
| Phase 4 | 模块 C 头部美化 + frontmatter 扩展 | 400 | 中 |
| Phase 5 | 模块 D OnThisPage(可选 v0.3.1) | 500 | 高 |
| Phase 6 | 测试 + 示例 + CHANGELOG + release | 350 | 中 |
| **合计 v0.3.0**(不含 D) | | **~2000 LOC** | 2-3 个迭代 |
| **合计 v0.3.1**(只 D) | | **~600 LOC** | 1 个迭代 |

---

## 8. 风险 + 待确认

### 8.1 已知风险

1. **Callouts 嵌套渲染**:Obsidian 允许 `> [!warning]\n> > [!info]\n> > text`。markdown-it blockquote 本身递归,我们改写 token 流时要保证嵌套不破。**最大 v0.3 风险**
2. **Block refs 引用计算时机**:`^block-id` 在源文里,引用 `[[Page#^id]]` 解析时需要先扫所有 block。改 VaultScanner 增加一步。会让首扫慢一点
3. **Sidebar 自动 + 用户手写 sidebar 的合并**:三种 mode 怎么命名 + 怎么文档化,容易让用户混乱
4. **头部 cover 图的资源管线**:复用 v0.1 image embed 逻辑,但 cover 不是 ![[]] 语法 → 单独写 frontmatter URL → asset 解析的桥
5. **MiniGraph 渲染时机**:每页都跑一个 d3-force 实例,性能(整体)需评估;可能要 lazy-render(intersection observer)

### 8.2 需要你拍板的 5 个决策

见下面的 AskUserQuestion。

---

## 9. v0.3 范围确认

如果你看完想:
- **全装在 v0.3.0**(A+B+C+D 一次发) → 加大风险但用户一次拿全套
- **分 v0.3.0(A+B+C)+ v0.3.1(D)** → 我推荐,D 是体量最大、风险最高的
- **只先做最痛点**(A 必做 callouts + B sidebar) → 最快出新版,其它放 v0.4

请你拍板下面 5 条 + 范围。
