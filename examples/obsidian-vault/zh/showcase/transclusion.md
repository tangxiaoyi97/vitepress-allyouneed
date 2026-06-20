---
title: 嵌入 & 媒体
sidebarTitle: 嵌入 & 媒体
order: 2
tags: [showcase, transclusion, embed]
---

# 嵌入 & 媒体

`![[...]]` 前缀一个 `!`,从"链接"变成"嵌入"。根据目标类型自动选择:笔记 → 转译,图片 / 音频 / 视频 / PDF → 对应媒体标签。

## 整页转译

把另一篇笔记整段内联进来:

```md
![[embedded]]
```

![[embedded]]

渲染成 `<div class="transclusion">`,右上角有"前往源文件"按钮,内容是源笔记递归渲染的真实 HTML。

## 片段转译(只嵌一节)

`![[note#标题]]` 只嵌入该标题到下一个同级标题之间的内容:

```md
![[embedded#二级标题]]
```

![[embedded#二级标题]]

> [!note] 片段锚点只用精确匹配
> 与 wikilink 不同,片段嵌入的锚点**只做精确匹配**,不走章节号 / 模糊模式。`![[note#7.2]]` 这种章节号写法对片段嵌入无效。

## 行内嵌入会降级

转译产生的是块级 `<div>`,放进段落 `<p>` 里是非法 HTML。所以**行内**的 `![[note]]` 会**故意降级**成一个带提示的链接(不是 bug):

```md
正文里的 ![[embedded]] 会变成链接,要整页嵌入请让它独占一行。
```

正文里的 ![[embedded]] 会变成链接,要整页嵌入请让它独占一行。

## 图片嵌入 + 尺寸

```md
![[sample-diagram.svg]]
```

![[sample-diagram.svg]]

支持 Obsidian 尺寸语法 —— `|宽`、`|x高`、`|宽x高`,以及 `|alt|宽x高`:

```md
![[sample-diagram.svg|240]]
![[sample-diagram.svg|关系示意图|360x150]]
```

![[sample-diagram.svg|240]]

![[sample-diagram.svg|关系示意图|360x150]]

图片走插件的资源管线:dev 下按需服务,build 时自动加 hash,无需手动放进 `public/`。

## 音频 / 视频 / PDF

媒体扩展名自动识别,渲染成对应的原生标签(下面只展示**语法**,本示例 vault 没有附带媒体文件):

```md
音频  ![[song.mp3]]            →  <audio controls>
视频  ![[clip.mp4]]            →  <video controls>
视频带尺寸  ![[clip.mp4|640x360]]
PDF   ![[paper.pdf]]           →  <iframe>(默认 100% × 600px)
PDF带尺寸  ![[paper.pdf|800x500]]
```

支持的扩展名:

- **音频**:`mp3` `wav` `ogg` `m4a` `flac` `aac`
- **视频**:`mp4` `webm` `mov` `m4v` `avi` `mkv`
- **PDF**:`pdf`

## 防循环 & 深度限制

转译有循环检测(A 嵌 B、B 又嵌 A 会显示"Cyclic transclusion"提示)和最大嵌套深度(默认 8 层),不会无限递归卡死构建。

## 相关配置

```ts
{
  embeds: {
    transclusionMaxDepth: 8,           // 嵌套深度上限
    imageFileExt: ['png','jpg','jpeg','gif','svg','webp','avif','bmp','ico'],
    defaultAltText: false,             // true=用文件名做 alt;字符串=固定 alt
  },
}
```

下一个:[[callouts|Callouts]] →
