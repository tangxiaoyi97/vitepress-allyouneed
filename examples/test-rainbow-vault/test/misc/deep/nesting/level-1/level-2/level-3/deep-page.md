---
title: 深嵌套测试
sidebarTitle: Deep nested page
order: 1
tags: [test, depth]
---

# 深嵌套 6 层

`maxDepth` 选项控制 sidebar 嵌套上限。默认无限,这页位于 6 层深路径:

`test/misc/deep/nesting/level-1/level-2/level-3/deep-page.md`

如果在 config 里设 `sidebarAuto.maxDepth: 3`,这页**不会**出现在 sidebar(被截断)。
