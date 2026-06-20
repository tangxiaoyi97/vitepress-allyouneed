---
title: Callouts
sidebarTitle: Callouts
order: 3
tags: [showcase, callouts]
---

# Callouts

Obsidian 风格的 callout:`> [!type]` 开头的引用块。13 种类型,每种有自己的图标和配色。

## 全部 13 种类型

```md
> [!note] Note
> 中性提示。

> [!tip] Tip
> 小技巧。
```

> [!note] Note
> 中性提示。

> [!info] Info
> 信息说明。

> [!tip] Tip
> 小技巧。

> [!success] Success
> 操作成功。

> [!question] Question
> 提问 / FAQ。

> [!warning] Warning
> 警告。

> [!failure] Failure
> 失败。

> [!danger] Danger
> 危险操作。

> [!bug] Bug
> 已知问题。

> [!example] Example
> 示例。

> [!quote] Quote
> 引文。

> [!abstract] Abstract
> 摘要 / TL;DR。

> [!todo] Todo
> 待办。

## 别名

很多类型有别名,会自动映射到上面的标准类型:

```md
> [!hint] 等价于 tip
> [!check] 等价于 success
> [!caution] 等价于 warning
> [!error] 等价于 danger
```

> [!hint] hint → tip
> 写 `[!hint]` 和 `[!tip]` 效果一样。

> [!error] error → danger
> 写 `[!error]` 和 `[!danger]` 效果一样。

完整别名:`hint/important→tip`、`check/done→success`、`help/faq→question`、`caution/attention→warning`、`fail/missing→failure`、`error→danger`、`cite→quote`、`summary/tldr→abstract`。未知类型退回 `note`。

## 折叠

`+` 默认展开、`-` 默认折叠(用 `<details>` 实现,可点开/收起):

```md
> [!tip]+ 默认展开
> 这段一开始就是展开的。

> [!warning]- 默认折叠
> 点击标题才会展开看到这段。
```

> [!tip]+ 默认展开
> 这段一开始就是展开的。

> [!warning]- 默认折叠
> 点击标题才会展开看到这段。

## 自定义标题(标题里可写 Markdown)

`[!type]` 后面跟的文字就是标题;省略则用默认标题。标题里还能写行内 Markdown:

```md
> [!note] 标题里可以有 **粗体**、`代码` 和 [[wikilinks|链接]]
> 正文。
```

> [!note] 标题里可以有 **粗体**、`代码` 和 [[wikilinks|链接]]
> 正文。

## 嵌套

callout 可以嵌套(用多层 `>`):

```md
> [!warning] 外层警告
> 外层正文。
>
> > [!info] 内层信息
> > 内层正文。
```

> [!warning] 外层警告
> 外层正文。
>
> > [!info] 内层信息
> > 内层正文。

## 实现说明

callout 是用 markdown-it 的 core ruler **后置改写 blockquote token 流**实现的,不是自定义 block 规则 —— 所以普通引用块不受影响,嵌套也能正确递归。每种类型自带 lucide 风格的内联 SVG 图标,颜色走 `--ayn-callout-*` CSS 变量,深色模式自动适配。

下一个:[[syntax|原生语法]] →
