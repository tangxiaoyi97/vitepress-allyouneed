---
title: 原生语法
sidebarTitle: 原生语法
order: 4
tags: [showcase, syntax]
---

# 原生语法

Obsidian 里那些非标准 Markdown 的小语法,这里全部支持。

## 高亮 `==...==`

```md
这是 ==高亮文字==,内部还能 ==**加粗 + 高亮**== 嵌套。
```

这是 ==高亮文字==,内部还能 ==**加粗 + 高亮**== 嵌套。

渲染成 `<mark>`。同一行可以有多个 ==这样== 的 ==高亮==。奇数个 `=` 会把多余的当普通文本。

> [!tip] 与数学公式共存
> 高亮规则会避开 MathJax 行内公式里的 `==`,所以 `$a == b$` 不会被误判成高亮。

## 注释 `%%...%%`

```md
正文可见 %%这段是注释%% 后面继续可见。
```

正文可见 %%这段是注释%% 后面继续可见。

块级注释(`%%` 独占一行起止,可跨多行):

```md
%%
这一整块都是注释,
正文里不显示。
%%
```

%%
这一整块都是注释,
正文里不显示。
%%

> [!warning] 默认保留为 HTML 注释 —— 别写敏感信息
> 从 v0.3.9 起,`preserveAsHtmlComment` **默认为 `true`**:注释不在正文显示,但会以 `<!-- ... -->` 形式**保留在部署后的 HTML 源码里**(查看网页源代码可见)。所以**不要在 `%%%%` 里写密码、私密备注**等。想完全删除请设 `comments.preserveAsHtmlComment: false`。

## 脚注 `[^1]`

Pandoc 风格脚注 —— 引用 + 定义:

```md
正文里加一个脚注引用[^note]。同一个脚注可以多次引用[^note]。

[^note]: 这是脚注的定义,会出现在页面底部,并带返回箭头。
```

正文里加一个脚注引用[^note]。同一个脚注可以多次引用[^note]。

[^note]: 这是脚注的定义,会出现在页面底部,并带返回箭头。

引用渲染成上标,定义统一收集到页面最底部的 `<section class="ayn-footnotes">`,自动编号,多次引用共用编号 + 多个返回箭头。

> [!info] 范围说明
> 当前支持 `[^id]` 引用 + `[^id]: 定义`(单行定义)。Obsidian 的**行内脚注** `^[...]` 形式**暂未实现**。

## Block 锚点 `^block-id`

在段落 / 标题末尾加 `^id`,给这个块一个锚点 id:

```md
这是一段重要的话,给它一个块锚点。^key-point
```

这是一段重要的话,给它一个块锚点。^key-point

`^key-point` 会被剥离并写成这个段落的 `id`,于是可以用浏览器原生锚点跳转:`[跳到要点](#^key-point)`。

> [!warning] `[[note#^id]]` 形式暂不解析
> 块锚点本身可用(DOM id 已写入,`页面#^id` 原生跳转有效)。但 wikilink 形式的 `[[note#^block-id]]` 当前**不会被 resolver 识别**,会当作未命中锚点处理。跨页跳 block 请用普通链接 `[文字](/path/to/note#^block-id)`。

## 标签 `#tag`

正文里的 `#标签` 会被识别成链接,跳到标签视图:

```md
给这段打几个标签:#showcase #语法演示 #obsidian
```

给这段打几个标签:#showcase #语法演示 #obsidian

支持中文、嵌套 `#父/子`。前置必须是行首或空白等边界字符,所以 `a#b`(像 URL fragment)不会被误判成标签。frontmatter 里的 `tags:` 也会一并进入标签视图。

> [!info] 标签需要 VitePress 集成
> `#tag` 行内识别在 `defineConfigWithAllYouNeed`(本站用法)下才启用,且受 `views.parseInlineTags` 控制(默认开)。

## 相关配置

```ts
{
  modules: {
    highlight: true,
    comments: true,
    footnotes: true,
    blockRefs: true,
  },
  comments: {
    preserveAsHtmlComment: true,   // 默认保留为 HTML 注释;false=彻底删除
  },
  views: {
    parseInlineTags: true,         // 正文 #tag 识别
  },
}
```

下一个:[[views|三大视图]] →
