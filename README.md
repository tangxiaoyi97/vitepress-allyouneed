# vitepress-allyouneed

> Obsidian / Notion → VitePress 发布所需的全套语法扩展。零配置、自动资源管线、系统化 vault 索引。

Forked from [`actuallysomecat/markdown-it-wikilinks-plus`](https://github.com/actuallysomecat/markdown-it-wikilinks-plus) (MIT) 并针对 VitePress 大幅重写。

## 当前版本:0.5.3(2026-06-20)

**实战 build-blocker 修复**(详见 [CHANGELOG](./CHANGELOG.md#053---2026-06-20)):

- `#tag` 出现在 link label / 嵌套方括号 / GFM 表格单元格时不再让 `vitepress build` 整站崩溃(`inline rule didn't increment state.pos`)。
- 页内自引用锚点 `[[#heading]]` 不再被误判死链 —— 在 i18n / 同名文件布局下也能正常生成可点击 `href`(0.5.2 此修复不完整,0.5.3 修对)。
- 缺失的 embed 资源(`![[foo.gif]]` / 音视频 / PDF)不再硬中断 Vite 构建,改为按 `deadLink` 策略告警 + 渲染占位标记。

### 0.5.1:主题集成大改 —— 目标:让第三方 VitePress 主题作者不需要知道本插件存在

### CSS 自动让用户赢(`@layer`)

我们所有 CSS 包在 `@layer vitepress-allyouneed` 里。CSS 标准规则:**任何 unlayered CSS 永远赢 layered CSS**,无关顺序、specificity。所以:

```css
/* 第三方主题随便写,自动赢 */
.wikilink { color: red; }
.callout { border-radius: 12px; }
```

零知识负担。

### Vue 组件:`defineTheme()` 工厂

三种场景,递进式:

```ts
// 1. 零配置(默认主题 + 我们)
export { default } from 'vitepress-allyouneed/theme'

// 2. 自定义 Layout / 覆盖某个视图
import { defineTheme } from 'vitepress-allyouneed/theme'
import MyLayout from './MyLayout.vue'
import MyVaultGraph from './MyVaultGraph.vue'
export default defineTheme({
  Layout: MyLayout,
  enhanceApp({ app }) {
    app.component('VaultGraph', MyVaultGraph)  // 同名注册自动覆盖
  },
})

// 3. 嵌别人写的 VitePress 主题(主题包作者无需感知本插件)
import { defineTheme } from 'vitepress-allyouneed/theme'
import SomeTheme from 'some-vitepress-theme'
export default defineTheme({ extends: SomeTheme })
```

可被替换的全局组件:`Layout` / `DocHeader` / `VaultGraph` / `VaultStats` / `Tags`。

### 4.x 兼容

老代码 `import theme from 'vitepress-allyouneed/theme'; export default theme` 继续跑,没有 breaking。

---

### 0.4.x 重要变更(从 0.3.x 升级看这里)

- **`sidebarAuto.autoFolderIndex` 已删除**。文件夹链接由 `sidebarAuto.folderLinkOrder`(默认 `['same-name', 'index', 'readme', 'first-file']`)在 sidebar/nav/wikilink 解析时直接处理。
- **数字排序修正(0.4.1)**:`1, 2, 10, 11` 真按数字大小排。
- **`markdown.math: true`** 自动检测 — 没装 `markdown-it-mathjax3` 时给清晰提示。
- **dev HMR**:`.md` add/remove 或 `_sidebar.md` 改动自动 server restart。
- **leading-number 锚点**:`#13` 能匹 `## 13) Optik`、`13: ...` 等。

完整 changelog 见 [`CHANGELOG.md`](./CHANGELOG.md);配置参考见 [`DOCS.md`](./DOCS.md)。

## 这个包做什么

- 让 VitePress 直接把你的 **Obsidian vault 当作 srcDir 用**,你照常写笔记,剩下交给插件:
  - `[[wikilink]]` / `[[wikilink|alias]]` / `[[note#heading]]` / `[[note|alias]]`(支持 Obsidian "shortest path",中文文件名/标题)
  - `![[image.png]]` / `![[image.png|300]]` / `![[image.png|alt|300x200]]`(图片自动找)
  - `![[note]]` / `![[note#heading]]` 笔记 transclusion(整篇内联 / 章节切片)
  - frontmatter `aliases:` 自动注册为可解析名
  - 死链三档处理(silent / warn / error)
- **资源管线自动化**:你不必把图片放在 `public/`。dev 时 Vite 中间件按 basename 流式响应;build 时自动 emit 到 `dist/_assets/<hash>-name.ext`。
- **systematic vault index**:扫一遍 vault 建一份完整 `VaultIndex`(files / aliases / tags / headings / backlinks / assets),后续模块(callouts、tags、dataview、graph 等)从同一份索引取数。

## 安装

```bash
npm install vitepress-allyouneed
# 或
pnpm add vitepress-allyouneed
yarn add vitepress-allyouneed
```

## 用法 — 零配置(推荐)

```ts
// .vitepress/config.ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed({
  title: 'My Vault',
  srcDir: '../my-obsidian-vault',  // 你的 Obsidian vault 目录
  cleanUrls: true,
  // ⚠️ VitePress 把 README.md 和 index.md 都路由到 '/',二者并存会让首页 404。
  // 自动告警 + 建议:扫描时若发现冲突会在控制台 warn,推荐这里二选一排除:
  // srcExclude: ['README.md'],
}, {
  onConflict: 'shortest',
})
```

加默认样式(可选,但强烈推荐 —— 否则 wikilink 看起来和普通链接一样):

```ts
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import 'vitepress-allyouneed/style.css'

export default DefaultTheme
```

完事 —— 直接 `vitepress dev`。

## 用法 — 手动接线(高级)

```ts
import { defineConfig } from 'vitepress'
import allYouNeedMarkdownIt from 'vitepress-allyouneed/markdown-it'
import { viteAllYouNeed } from 'vitepress-allyouneed/vite'

export default defineConfig({
  vite: {
    plugins: [viteAllYouNeed({ srcDir: '/path/to/vault' })],
  },
  markdown: {
    config(md) {
      md.use(allYouNeedMarkdownIt, { srcDir: '/path/to/vault' })
      // ... 其它 md.use(...) 顺序由你掌控
    },
  },
})
```

注意:手动模式下你要自己保证 `md.render(src, env)` 调用时 `env` 上有 `index` / `options`。
零配置模式由 wrapper 自动注入。

## 选项

📖 **完整配置参考 + 可复制 cheat sheet:[`DOCS.md`](./DOCS.md)** — 所有可配置项 + 默认值 + 一键复制全量默认配置。

常用速览:

| 选项 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `srcDir` | `string` | 跟 VitePress `srcDir` 走 | vault 根目录(绝对或相对) |
| `base` | `string` | 跟 VitePress `base` 走 | 站点 base |
| `cleanUrls` | `boolean` | 跟 VitePress `cleanUrls` 走 | URL 是否带 `.html` |
| `caseSensitive` | `boolean` | `false` | wikilink/asset 解析是否大小写敏感 |
| `deadLink` | `'silent' \| 'warn' \| 'error'` | `'warn'` | 死链处理 |
| `onConflict` | `'shortest' \| 'first' \| 'error'` | `'shortest'` | 同名文件冲突策略 |
| `onAliasConflict` | `'first' \| 'error'` | `'first'` | alias 冲突策略 |
| `slugify` | `(text: string) => string` | `@mdit-vue/shared` | 锚点 slugifier,必须与 VitePress `markdown.anchor.slugify` 一致 |
| `assets.preserveAssetPaths` | `boolean` | `false` | true 保留原 vault 路径(`/assets/foo.png`)、不哈希;false 走 `/_assets/<hash>-foo.png` |
| `assets.outputDir` | `string` | `'_assets'` | build 输出 asset 的目录(在 base 之后) |
| `wikilinks.linkText` | `'basename' \| 'fullPath' \| fn` | `'basename'` | 默认 label 来源 |
| `wikilinks.allowLinkLabelFormatting` | `boolean` | `false` | label 是否走 inline markdown 解析(有递归风险,默认关) |
| `embeds.imageFileExt` | `string[]` | 常见 9 种 | 视为图片的扩展名 |
| `embeds.defaultAltText` | `boolean \| string` | `false` | 缺省 alt 策略 |
| `embeds.transclusionMaxDepth` | `number` | `8` | transclusion 最大递归深度 |

## 从 `markdown-it-wikilinks-plus` 迁移

| 原选项 | 新位置 / 替代 |
|---|---|
| `pageLink.absoluteBaseURL` / `relativeBaseURL` / `forceAllLinksAbsolute` | 移除。由 VitePress `base` 自动决定 |
| `pageLink.uriSuffix` | 移除。由 VitePress `cleanUrls` 自动决定 |
| `pageLink.postProcessLinkTarget` / `postProcessLinkLabel` | `wikilinks.postProcessLinkTarget` / `postProcessLinkLabel` |
| `pageLink.allowLinkLabelFormatting` | `wikilinks.allowLinkLabelFormatting`(默认改为 `false`) |
| `pageLink.htmlAttributes` | `wikilinks.htmlAttributes` |
| `imageEmbed.*` | `embeds.*`(语义大体不变) |
| `imageEmbed.absoluteBaseURL` 等 | 移除 |

如果你之前的项目就是 11ty / pure markdown-it,直接用 `vitepress-allyouneed/markdown-it` 入口也能跑(只是少了 vault 扫描带来的自动解析能力,需要你自己提供 env)。

## 内部架构

```
src/
├── core/
│   ├── types.ts          ← 所有公共类型
│   ├── vault/            ← VaultScanner(扫描 + 索引)
│   ├── resolver.ts       ← [[target]] → URL
│   ├── slugify.ts        ← 锚点 slug
│   ├── config-bridge.ts  ← 解析用户配置
│   └── asset-pipeline/   ← dev 中间件 + build emit
├── modules/
│   ├── wikilinks/        ← [[]] 解析与渲染
│   └── embeds/           ← ![[]] image + transclusion
├── index.ts              ← 默认入口(markdown-it 插件 + re-export)
├── markdown-it.ts        ← 仅 markdown-it 入口
├── vite.ts               ← Vite 插件入口
└── vitepress.ts          ← VitePress wrapper 入口
```

后续模块(`callouts/` / `tags/` / `dataview/` / `graph/` 等)按相同接口接入。

## 测试

```bash
npm test
```

会跑 `tests/` 下的 vitest 套件,覆盖 VaultScanner、Resolver、渲染、utils 等。

## 致谢

- [`actuallysomecat/markdown-it-wikilinks-plus`](https://github.com/actuallysomecat/markdown-it-wikilinks-plus) — 提供了配置面与基础解析模型。
- [@mdit-vue/shared](https://github.com/mdit-vue/mdit-vue) — slugifier。
- [gray-matter](https://github.com/jonschlinkert/gray-matter) — frontmatter 解析  
- [picomatch](https://github.com/micromatch/picomatch) — glob  
- 白青 技术支持
- Opus 4.7

## License

MIT。见 [LICENSE](./LICENSE) —— 保留了 upstream 的版权声明。
