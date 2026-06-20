---
title: DocHeader
sidebarTitle: DocHeader
order: 4
tags: [guide, doc-header]
---

# DocHeader

每个文档顶部的 banner。永远渲染(只要有标题),自动检测 cover/dates/tags/word-count。

## frontmatter

```yaml
---
title: 我的文章                # 显示在 banner 大标题
cover: https://.../bg.jpg     # 触发 banner 模式(否则降级到无 banner 排版)
banner:
  x: center                    # background-position-x
  y: 35%                       # background-position-y(常用让山顶上移)
  blur: 0                      # px,默认 0(0 = 不模糊)
  opacity: 1                   # 0..1,默认 1
  overlay: 0.55                # 0..1 暗化遮罩强度,默认 0.6
  text: light                  # 'light'(白字) | 'dark'(主题深色)
created: 2026-01-01            # ISO 时间
updated: 2026-05-20
tags: [demo, banner]           # 显示为 tag pills
cssclasses: [my-page]          # 应用到 <body>(Layout 自动管理)
---
```

## 两种 mode

- **Mode A — 有 cover**:400px 高 banner,文字在底部 overlay 显示
- **Mode B — 无 cover**:不画背景块,标题字号自动加大(补偿无 banner 视觉缺失),按相同顺序展示

## 用主题配置覆写

```ts
themeConfig: {
  allyouneed: {
    docHeader: {
      enabled: true,             // 总开关
      hideH1: true,              // 隐藏文档第一个 H1(banner 已经显示了大标题)
      showDates: true,
      showTags: true,
      showWordCount: true,
      tagsViewUrl: '/_perspectives_/tags',
      wordsPerMinute: 300,
    }
  }
}
```
