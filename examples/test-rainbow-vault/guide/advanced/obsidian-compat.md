---
title: Obsidian 兼容性矩阵
sidebarTitle: Obsidian 兼容
order: 4
tags: [advanced, obsidian, compat]
---

# 把 Obsidian vault 打包成 VitePress 站点 —— 能跑哪些?

## TL;DR

| Vault 类型 | 状况 |
|---|---|
| **纯 Markdown + Obsidian 原生语法** | ✅ 几乎零修改 |
| **带 Dataview / Templater / Tasks 等插件查询** | ❌ 这些插件语法在 vault 里以代码块/特殊语法存在,本插件不会执行,会原样输出代码块 |
| **重度使用 canvas / excalidraw** | ⚠️ 文件被当 asset 拷贝,**不渲染图形**,需要静态导出 |
| **数学公式(`$...$` / `$$`)** | ⚠️ VitePress 自己有 `markdown.math` 支持,需要用户启用 |

## 详细对照

### ✅ 完全支持

| Obsidian 语法 | 渲染 |
|---|---|
| `[[note]]` / `[[note\|alias]]` / `[[note#heading]]` / `[[note#heading\|alias]]` | wikilink + 锚点 + 别名 |
| `[[folder/note]]` | 路径形式 wikilink |
| frontmatter `aliases:` | 参与 wikilink 解析 |
| `![[image.png]]` / `![[image.png\|400]]` / `![[image.png\|alt\|400x300]]` | `<img>` + width/height 属性 |
| `![[clip.mp3]]` | `<audio controls>` |
| `![[movie.mp4\|640x360]]` | `<video controls width height>` |
| `![[doc.pdf\|800x600]]` | `<iframe>` |
| `![[note]]` / `![[note#heading]]` | transclusion(内联笔记/节段),含循环检测、深度限制 |
| `> [!type]` callouts(13 种 + 别名 + `+` `-` 折叠 + 嵌套) | `<div class="callout">` |
| `==高亮==` | `<mark>` |
| `%%comment%%` | 删除(不渲染) |
| `[^id]` + 单独一行 `[^id]: text` | Pandoc 风格脚注 |
| 段落末尾 `^block-id` | 给该块加 `id="^block-id"`,URL hash 跳转可用 |
| 正文 `#tag` | `<a class="ayn-tag">#tag</a>` 链到 `/_perspectives_/tags#tag` |
| 中文文件名(`中文笔记.md`) | URL 安全编码,wikilink 可用 |
| `frontmatter` 自定义字段 | 暴露给主题/DocHeader |

### ⚠️ 部分支持 / 注意

| 项 | 状况 | 备注 |
|---|---|---|
| `[[note#^block-id]]` 跨页跳 block-ref | ⚠️ 部分 | 渲染时 anchor 已加在 DOM 上,**浏览器原生 URL hash 可用**;但 wikilink resolver 还没识别 `#^id` 语法,会当成普通锚点失败处理(v0.5 计划) |
| 数学 `$x^2$` / `$$...$$` | ⚠️ 用户启用 | VitePress 内置 `markdown.math: true` 选项(需要装 `markdown-it-mathjax3`) |
| `cssclasses:` frontmatter | ✅ | DocHeader Layout 自动应用到 `<body>` |
| Excalidraw / Canvas (`.canvas` / `.excalidraw`) 文件 | ⚠️ | 被当 asset 拷贝到 dist,wikilink/embed 不知道怎么渲染。建议先在 Obsidian 里 export 为 svg/png 再 embed |
| `<%`/`<%+`/`<%-` (Templater) | ❌ | 原样保留;Templater 是动态语法,VitePress 是静态构建 |
| ` ```dataview` / ` ```dataviewjs` 代码块 | ❌ | 原样输出代码块(v0.5 路线计划做静态求值) |
| Tasks 插件查询 / 内嵌 query | ❌ | 同上,原样输出 |
| Daily notes UI / Calendar 插件 | ❌ | 这些是 Obsidian app UI,不是 markdown 语法 |
| `[[]]` 用 `../` 相对路径 | ❌ | Obsidian 自己也不支持。用 basename 或绝对路径 |

### ❌ 不支持

- Obsidian Sync / Publish 服务端能力(本插件是纯前端静态站)
- 插件管理 / 第三方插件 runtime
- 动态查询(任何依赖 Obsidian 内部 API 的)
- `mod` icon / 内嵌 SVG shortcodes

## 推荐迁移流程

1. **复制 vault 到一个新目录** —— 避免破坏原 vault
2. **加 `.vitepress/config.ts` + `.vitepress/theme/index.ts`** —— 见 [[install|Install]]/[[configure|Configure]]
3. `npm run dev` —— 启动时看 console 中**所有死链汇总**(v0.3 加的),逐个修
4. 复杂用 Dataview/Templater 的页面:暂时手动写 markdown 或留空
5. 检查 frontmatter 字段(`cover`/`tags`/`created`/`updated`)是否符合 [[doc-header|DocHeader]] 约定,需要时补
6. `.canvas` / `.excalidraw`:先在 Obsidian 里导出图片,再 embed
7. `npm run build` 出静态站

## 与 Obsidian Publish 的差异

| 维度 | Obsidian Publish | vitepress-allyouneed |
|---|---|---|
| 部署 | 官方托管 | 任意静态托管(GitHub Pages / Vercel / Netlify / 自己 nginx) |
| 价钱 | $$ | 免费(开源) |
| 自定义主题 | 受限 | 完全自由(VitePress 主题系统) |
| 搜索 | 自带 | VitePress 内置(本地索引) |
| Graph view | 自带 | 自带([[v0.3-tour|v0.3 Tour]]) |
| Dataview | 部分 | 不支持(v0.5 路线) |
| 速度 | 慢(运行时渲染) | 快(静态生成 + Vite HMR) |
