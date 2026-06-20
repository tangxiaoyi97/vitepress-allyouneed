---
title: 超长文件名 / 标题极限测试 —— 验证 sidebar 截断、wrap、tooltip,以及 banner 内大标题 2 行 line-clamp + text-wrap balance 的视觉效果
sidebarTitle: 超长文件名 / 标题极限测试 —— 验证 sidebar 截断、wrap、tooltip,以及 banner 内大标题 2 行 line-clamp + text-wrap balance 的视觉效果
order: 1
cover: https://images.unsplash.com/photo-1488972685288-c3fd157d7c7a?w=2070&q=80
banner:
  overlay: 0.55
tags: [test, long-name, edge-case, layout]
---

# 超长测试

观察:

- 左侧 sidebar 这个 item 应该 wrap / 截断,而不是把 sidebar 撑爆横向 overflow
- banner 内大标题应该最多两行(`-webkit-line-clamp: 2`),超出 `…` 截断
- 浏览器 tab 标题(`document.title`)也会被截
