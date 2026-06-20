---
title: Mermaid 流程图
sidebarTitle: Mermaid
order: 4
tags: [test, mermaid, integration]
---

# Mermaid 测试

> [!note] 需要第三方插件
> 本插件**不自带** mermaid 支持。建议装 [`vitepress-plugin-mermaid`](https://github.com/emersonbottero/vitepress-plugin-mermaid):
>
> ```bash
> npm i -D vitepress-plugin-mermaid mermaid
> ```
>
> 然后在 `.vitepress/config.ts` 用 `withMermaid` wrap:
>
> ```ts
> import { withMermaid } from 'vitepress-plugin-mermaid'
> import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'
>
> export default withMermaid(
>   defineConfigWithAllYouNeed({ ... })
> )
> ```

## 时序图

```mermaid
sequenceDiagram
  participant U as User
  participant V as Vite
  participant P as vitepress-allyouneed
  participant F as 文件系统

  U->>V: npm run dev
  V->>P: scanVault()
  P->>F: walk srcDir
  F-->>P: file entries
  P->>P: build VaultIndex
  P-->>V: index + hooks
  V-->>U: dev server :5173
```

## 流程图

```mermaid
flowchart LR
  A[Markdown] --> B{wikilink?}
  B -- yes --> C[resolver]
  B -- no --> D[default render]
  C --> E[link / image / transclusion]
```

## 如果没装

VitePress 默认会把 ```mermaid 当 fenced code 输出,显示源码。本插件**不干扰**这个行为。
