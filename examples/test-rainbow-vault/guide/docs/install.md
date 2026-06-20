---
title: Install
sidebarTitle: Install
order: 1
tags: [guide, setup]
---

# Install

```bash
npm i -D vitepress-allyouneed vitepress
```

- VitePress 是 peerDependency,本插件不锁版本
- Node 18+ 推荐

## 文件结构

最小可运行:

```
my-vault/
├── .vitepress/
│   ├── config.ts
│   └── theme/
│       └── index.ts
├── package.json
└── (你的 .md 笔记,任意嵌套)
```

下一步:[[configure|配置]]。
