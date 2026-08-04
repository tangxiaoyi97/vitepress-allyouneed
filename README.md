# vitepress-allyouneed

把 Obsidian 风格的 Markdown vault 接入 VitePress：wikilinks、嵌入资源、常用
Obsidian 语法、自动侧边栏、文档头，以及 Graph / Stats / Tags 视图。

项目源自
[`actuallysomecat/markdown-it-wikilinks-plus`](https://github.com/actuallysomecat/markdown-it-wikilinks-plus)
（MIT），现已针对 VitePress 的路由、构建和主题体系重写。

## 能力边界

- 支持 `[[note]]`、alias、多级 heading、`#^block`、folder link 与上下文同名解析。
- 支持 `![[note]]` 转译，以及图片、音频、视频和 PDF 资源。
- 支持 callout、`==highlight==`、`%%comment%%`、多行/内联脚注、block reference
  与正文标签。
- 扫描 `.md` vault，生成 sidebar、backlinks 和可选的 Graph / Stats / Tags
  数据。
- 提供可组合 VitePress theme，为文档页增加 DocHeader。

它不是 Obsidian 运行时，也不会执行 Dataview / DataviewJS、插件脚本或任意
HTML 中的应用逻辑。Canvas、Excalidraw 等文件可被资源扫描器识别，但不会被
解释成 Obsidian 原生交互视图。详细版本约束和已知差异见
[`COMPATIBILITY.md`](./COMPATIBILITY.md)。

## 安装

```bash
npm install vitepress-allyouneed
```

如启用 VitePress 数学公式，再安装可选 peer dependency：

```bash
npm install -D markdown-it-mathjax3
```

## 快速开始

```ts
// .vitepress/config.ts
import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'

export default defineConfigWithAllYouNeed(
  {
    title: 'My Vault',
    srcDir: '../my-vault',
    cleanUrls: true,
  },
  {
    onConflict: 'shortest',
  },
)
```

使用默认主题与插件组件：

```ts
// .vitepress/theme/index.ts
export { default } from 'vitepress-allyouneed/theme'
```

如果已有主题，可用工厂组合；用户的 `Layout`、组件注册与后加载 CSS 仍按
VitePress / Vue 的正常规则覆盖：

```ts
import { defineTheme } from 'vitepress-allyouneed/theme'
import MyTheme from 'my-vitepress-theme'

export default defineTheme({ extends: MyTheme })
```

也可以只给现有主题增加样式：

```ts
import DefaultTheme from 'vitepress/theme'
import 'vitepress-allyouneed/style.css'

export default DefaultTheme
```

样式使用 `--ayn-*` 变量和组件前缀选择器，不建立全局 cascade layer。需要
覆盖时，在主题入口后加载自己的 CSS，或直接改相应变量。

## 常用配置

```ts
defineConfigWithAllYouNeed(vitepressConfig, {
  deadLink: 'warn', // 'silent' | 'warn' | 'error'
  onConflict: 'shortest',
  onAliasConflict: 'first',
  scan: {
    include: ['**/*.md'],
    exclude: ['private/**'],
    respectGitignore: true,
  },
  assets: {
    preserveAssetPaths: false,
    outputDir: '_assets',
  },
  views: {
    enabled: { graph: true, stats: true, tags: true },
    injectInto: 'sidebar',
    localGraph: {
      enabled: false,
      depth: 1,
      maxNodes: 24,
      modalDepth: 2,
      modalMaxNodes: 100,
      mobile: 'button',
    },
  },
  sidebarAuto: {
    mode: 'fill-if-empty',
    layout: 'tree',
  },
})
```

`base`、`cleanUrls`、`rewrites` 与自定义 heading slugifier 会由 wrapper 从
VitePress 配置同步。`deadLink: 'error'` 和 `onAliasConflict: 'error'` 会终止
启动或构建。启用 `localGraph` 后，文档页 TOC 上方显示确定性 SVG 缩略图；点击
才会懒加载完整图谱弹层。移动端默认在 DocHeader 显示打开按钮。

完整指南与示例站：
[tangxiaoyi97.github.io/vitepress-allyouneed](https://tangxiaoyi97.github.io/vitepress-allyouneed/)。

## 入口

| 入口 | 用途 |
|---|---|
| `vitepress-allyouneed/vitepress` | 推荐：VitePress config wrapper |
| `vitepress-allyouneed/theme` | 默认主题组合、组件与 composable |
| `vitepress-allyouneed/markdown-it` | 单独注册 Markdown-it 规则 |
| `vitepress-allyouneed/vite` | 手动接入 Vite 插件 |
| `vitepress-allyouneed/style.css` | 只加载默认样式 |

手动组合 Markdown-it 与 Vite 时，需要自行保证两者使用同一套解析选项，并在
Markdown 渲染环境中提供 vault index。一般项目应优先使用 wrapper。

## 开发与验证

```bash
npm ci
npm run typecheck
npm run build
npm test
npm run test:e2e
```

单元测试验证解析与索引语义；`test:e2e` 会真实构建一个小型 VitePress vault，
覆盖 base、i18n、特殊字符、嵌套资源、views 和 DocHeader。完整双语文档站已从
npm 包仓库拆分，避免把展示内容与生成产物带入发布包。

## License

MIT，见 [`LICENSE`](./LICENSE)。
