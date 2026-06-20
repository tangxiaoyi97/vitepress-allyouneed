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

- VitePress is a peerDependency,not bundled
- Node 18+ recommended

## Project layout

```
my-vault/
├── .vitepress/
│   ├── config.ts
│   └── theme/
│       └── index.ts
├── package.json
└── (your .md notes,nested freely)
```

Next: [[configure|Configure]].
