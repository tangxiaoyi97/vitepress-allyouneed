---
title: DocHeader
sidebarTitle: DocHeader
order: 4
tags: [guide, doc-header]
---

# DocHeader

The banner / info block at the top of every page. Always renders when there's a title; auto-detects cover / dates / tags / word-count.

## frontmatter

```yaml
---
title: My article                  # banner big title
cover: https://.../bg.jpg         # triggers banner mode
banner:
  x: center                        # background-position-x
  y: 35%                           # background-position-y
  blur: 0                          # px,default 0
  opacity: 1                       # 0..1
  overlay: 0.55                    # 0..1 darkness
  text: light                      # 'light' (white text) | 'dark' (theme color)
created: 2026-01-01                # ISO
updated: 2026-05-20
tags: [demo, banner]               # rendered as tag pills
cssclasses: [my-page]              # applied to <body>
---
```

## Two modes

- **Mode A — with cover**: 220–320px banner, content overlays at bottom
- **Mode B — no cover**: no background block; title font enlarges to compensate; uses theme colors

## Override via themeConfig

```ts
themeConfig: {
  allyouneed: {
    docHeader: {
      enabled: true,
      hideH1: true,         // hide first H1 (banner already shows title)
      showDates: true,
      showTags: true,
      showWordCount: true,
      tagsViewUrl: '/_perspectives_/tags',
      wordsPerMinute: 300,
    }
  }
}
```
