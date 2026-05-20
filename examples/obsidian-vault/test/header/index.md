---
title: Header Tests
sidebarTitle: Header Tests
order: 1
sidebarCollapsed: false
tags: [test, header]
created: 2026-05-20
---

# Header Tests

每页测试 `cover` + `banner.*` 的一种组合,挨个看效果:

- [[01-full]] — 所有 banner 选项满配
- [[02-cover-only]] — 只 cover,无 banner 配置(默认值)
- [[03-text-dark]] — 浅色 cover + `banner.text: dark`
- [[04-heavy-blur]] — `banner.blur: 12` hero 模糊
- [[05-translucent]] — `banner.opacity: 0.35`
- [[06-y-offset]] — `banner.x/y` 位置偏移
- [[07-no-cover]] — Mode B:无 cover,标题字号自动增大
- [[08-empty]] — 空 frontmatter,标题 fallback 文件名
- [[09-long-title]] — 长标题 → 两行 wrap + balance + banner 撑高

(**说明:本 index.md 是测试组特意保留的索引页;其它 group 都没有 index,可以对比看效果**)
