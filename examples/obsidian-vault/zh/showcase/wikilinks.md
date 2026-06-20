---
title: Wikilinks
sidebarTitle: Wikilinks
order: 1
tags: [showcase, wikilinks]
---

# Wikilinks

`[[...]]` 双链是插件的核心。下面每一块都是**先源码、后实际渲染**。

## 基本链接

```md
跳到 [[note-a]],或用别名 [[note-a|这是 Note A]]。
```

跳到 [[note-a]],或用别名 [[note-a|这是 Note A]]。

渲染成带 `class="wikilink"` 的 `<a>`,`data-wikilink-target` 记录解析到的相对路径。

## 别名解析(frontmatter aliases)

`note-a.md` 的 frontmatter 写了 `aliases: [A, Alpha]`,所以可以直接用别名链接:

```md
用别名直达:[[A]] 或 [[Alpha]]。
```

用别名直达:[[A]] 或 [[Alpha]]。

别名解析**优先于** basename —— 这正是 Obsidian 的行为。

## 链接到标题(锚点)

```md
直接跳到某个二级标题:[[note-a#二级标题]]。
```

直接跳到某个二级标题:[[note-a#二级标题]]。

## 路径形式与文件夹形式

```md
路径形式(含 `/`):[[test/wikilinks/note-b]]
文件夹形式(尾 `/`,落到该文件夹入口):[[showcase/]]
```

路径形式(含 `/`):[[test/wikilinks/note-b]]

文件夹形式(尾 `/`,落到该文件夹入口):[[showcase/]]

## 死链可视化

找不到目标的链接**不会**渲染成可点的 `<a href>`,而是标成红色死链(`class="wikilink--dead"`),hover 有提示。这样断链在站点上一眼可见,而不是悄悄 404:

```md
这是一个故意写错的链接:[[这个笔记根本不存在]]。
```

这是一个故意写错的链接:[[这个笔记根本不存在]]。

> [!warning] 半死链
> 如果**目标存在但锚点不存在**(如 `[[note-a#不存在的标题]]`),会标成 `wikilink--unmatched-anchor` 并退回浏览器原生锚点跳转,而不是完全失败。

## 锚点匹配三模式

`anchorMatch` 配置项决定 `[[note#标题]]` 怎么匹配:

| 模式 | 行为 |
| --- | --- |
| `exact` | 仅精确匹配标题文本 / slug(对齐 Obsidian) |
| `leading-number`(默认) | 精确失败后,按章节号前缀匹配,如 `[[note#7.2]]` 命中 `## 7.2 标题`。多命中取第一个并在启动时汇总警告 |
| `fuzzy`(实验) | 再加前缀 + 全词 token 匹配,多候选取最短标题 |

## 相关配置

```ts
{
  // 锚点匹配模式
  wikilinks: {
    anchorMatch: 'leading-number',     // 'exact' | 'leading-number' | 'fuzzy'
    linkText: 'basename',              // 默认 label:'basename' | 'fullPath' | 函数
    allowLinkLabelFormatting: false,   // true 时别名里可写 Markdown
  },
  // 同名文件冲突
  onConflict: 'shortest',              // 'shortest' | 'first' | 'error'
  caseSensitive: false,
  // 死链处理
  deadLink: 'warn',                    // 'silent' | 'warn' | 'error'
}
```

完整说明见 [[configure|配置文档]]。下一个:[[transclusion|嵌入 & 媒体]] →
