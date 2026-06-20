---
title: 数学公式(KaTeX)
sidebarTitle: Math
order: 3
tags: [test, math, integration]
---

# 数学公式测试

> [!note] 需要启用 VitePress 内置 math
> 本插件**不自带** math 支持。VitePress 1.x 内置 `markdown.math` 选项,
> 在 `.vitepress/config.ts` 加:
>
> ```ts
> markdown: { math: true }
> ```
>
> 然后装 `markdown-it-mathjax3` 或 `markdown-it-katex` 之一。

## 行内公式

爱因斯坦质能方程 $E = mc^2$ 在文中自然嵌入。

## 块公式

$$
\int_{-\infty}^{\infty} e^{-x^2}\, dx = \sqrt{\pi}
$$

$$
\frac{\partial \mathcal{L}}{\partial \theta} = \mathbb{E}\left[ \nabla_\theta \log \pi_\theta(a|s) \cdot Q^{\pi}(s, a) \right]
$$

矩阵:

$$
A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix}
$$

## 高亮 + 数学组合

行内公式被高亮包裹:==前文 $E = mc^2$ 后文==,黄底不应该破坏公式渲染。

公式自身:$\alpha + \beta$ 行内,然后被 mark 包: ==中间 $\sum_{i=1}^{n} i = \frac{n(n+1)}{2}$ 结尾==。

块公式紧跟 mark:==高亮一段== 然后下方块公式

$$
f(x) = \sum_{n=0}^{\infty} \frac{f^{(n)}(0)}{n!} x^n
$$

应该:mark 的黄底正常,公式独立渲染,**没有双层背景**,**也没有 mark 把 `$` 内的 `==` 误识别为高亮**(因为 highlight rule 已经优先排在 `math_inline` 之后)。

## 如果没启用 math

VitePress 默认不识别 `$..$`,会原样输出。本插件的 `==高亮==` 不会因 `$` 误判。
