---
title: Obsidian 语法
sidebarTitle: Obsidian 语法
order: 5
tags: [guide, syntax]
---

# Obsidian 语法

完整的语法 demo 在 [[v0.3-tour|v0.3 Tour]],这里只列规则。

## Wikilinks

| 写法 | 含义 |
|---|---|
| `[[note]]` | 普通链接 |
| `[[note\|alias]]` | 自定义文本 |
| `[[note#heading]]` | 跳锚点 |
| `[[note#heading\|alias]]` | 锚点 + 自定义文本 |
| `[[folder/note]]` | 路径形式 |

frontmatter `aliases:` 也参与 wikilink 匹配。

## Embeds

| 写法 | 渲染 |
|---|---|
| `![[img.png]]` / `![[img.png\|400]]` / `![[img.png\|alt\|400x300]]` | `<img>` |
| `![[clip.mp3]]` | `<audio controls>` |
| `![[movie.mp4\|640x360]]` | `<video controls>` |
| `![[doc.pdf\|800x900]]` | `<iframe>` |
| `![[note]]` / `![[note#heading]]` | transclusion(内联整篇/节段) |

## Callouts

```md
> [!note] Optional title
> body
```

13 种 type:`note / info / tip / success / question / warning / failure / danger / bug / example / quote / abstract / todo`,加别名(`hint=tip`, `check=success`, `error=danger`...)。折叠:`[!info]+` 默认开,`[!info]-` 默认关。嵌套用 `> > [!info]`。

## 其它行内

- `==高亮==` → `<mark>`
- `%%comment%%` → 删除(不渲染)
- `[^id]` + 单独一行的 `[^id]: text` → Pandoc 风格脚注
- 段落末尾 `^block-id` → 给该块加 `id="^block-id"`,可被 URL hash 跳转
- 正文 `#tag` → 链到 `/_perspectives_/tags#tag`

## 模块开关

任一可独立关闭:

```ts
{
  modules: {
    wikilinks: true,
    embeds: true,
    callouts: true,
    highlight: true,
    comments: true,
    footnotes: true,
    blockRefs: true,
    views: true,
  }
}
```
