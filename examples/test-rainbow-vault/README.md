# test-rainbow-vault

`vitepress-allyouneed@0.5.0-beta.0` 主题覆盖机制的**端到端可运行**测试。

这是 `examples/obsidian-vault/` 的复制品(原 docs 站不动),在 `.vitepress/theme/` 里塞了三件覆盖逻辑。

## 跑

```bash
cd examples/test-rainbow-vault
npm install
npm run dev
```

打开 `http://localhost:5173/`,期望看到:

| 现象 | 验证的机制 |
|---|---|
| 任意页面 H1 是会动的彩虹渐变 | `.vp-doc h1` unlayered 覆盖 VitePress 默认(顺序赢) |
| 任意 `[[wikilink]]` 文字上下镜像 | `.wikilink` unlayered 覆盖插件 layered(@layer 横扫) |
| `<VaultStats />` 显示紫色 "Replaced VaultStats" 块 | Vue 同名 `app.component()` 后注册赢 |

三个都成 = 0.5.0-beta 的两大覆盖机制全过关。

## 三件覆盖逻辑在哪

```
.vitepress/theme/
├── index.ts          ← 入口:用 defineTheme() + import './theme.css' + 注册 MyVaultStats
├── theme.css         ← 彩虹 H1 + 翻转 wikilink (unlayered)
└── MyVaultStats.vue  ← 紫色块替换 VaultStats
```

每个文件头部都有详细注释解释**为什么**那么写。

## 为什么这么写 —— 5 个关键决定

| # | 决定 | 不那么做会咋样 |
|---|---|---|
| 1 | `theme.css` 不包 `@layer` | 包了就跟插件平级,失去"unlayered 永远赢 layered"加成 |
| 2 | H1 selector 写 `.vp-doc h1` 不是 `h1` | VP 用的就是 `.vp-doc h1`(specificity 0,1,1);裸 `h1`(0,0,1)输给 VP,盖不了 |
| 3 | wikilink 加 `display: inline-block` | `<a>` 默认 inline,某些浏览器忽略 inline 元素的 `transform` |
| 4 | `scaleY(-1)` 不是 `rotate(180deg)` | rotate(180) 左右也镜像,字看起来像乱码;scaleY(-1) 只翻上下,阅读方向不变 |
| 5 | `app.component('VaultStats', MyVaultStats)` 写在 `defineTheme({ enhanceApp })` 里 | 直接写 `export default { enhanceApp }` 拿不到"用户 enhanceApp 排在插件之后跑"的顺序保证,可能反被插件覆盖 |

## 用什么页面验证哪个测试

- **彩虹 H1**:任意页面都有 H1,打开首页 `/` 就能看到
- **翻转 wikilink**:`tour/` 或 `guide/` 里几乎每页都有 `[[xxx]]`,随便挑一个
- **替换 VaultStats**:`_perspectives_/stats.md` 或任何写了 `<VaultStats />` 的页面

## 跟 obsidian-vault 的区别 (只改了这几样)

```
.vitepress/theme/index.ts    ← 改:用 defineTheme + 覆盖
.vitepress/theme/theme.css   ← 新增
.vitepress/theme/MyVaultStats.vue   ← 新增
package.json                  ← name: 'test-rainbow-vault'
```

其它所有 markdown 内容、`.vitepress/config.ts`、`public/`、`tour/` 等等都跟 obsidian-vault 一模一样,所以你能直接对比"加了覆盖 vs 没加覆盖"的视觉差异。
