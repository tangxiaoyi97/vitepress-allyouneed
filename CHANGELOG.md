# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/);版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.2.0-beta.0] - 2026-05

### Added — 自动生成视图

- **完整 theme 入口** `vitepress-allyouneed/theme`,继承 VitePress DefaultTheme,自动 register 三个组件。用户在 `.vitepress/theme/index.ts` 改一行 import 即可启用。
- **VaultStats 组件** —— 4 张数字卡片(笔记/标签/链接/资源)+ 最近修改 10 条 + 扫描告警显示。
- **Tags 组件** —— 标签云(字号按 count 归一化)+ 搜索过滤 + 点击展开该标签下笔记列表 + URL hash 同步。
- **VaultGraph 组件** —— d3-force 力导向图,SVG 渲染,节点半径按 in-degree 放大,边按 wikilink/transclusion 区分色;支持 zoom/pan/drag/click-to-navigate/hover-tooltip;节点超过阈值(默认 500)降级为提示。
- **虚拟 .md 自动生成** —— 启动时往 `srcDir/{graph,stats,tags}.md` 写视图模板。带 sentinel 标记,允许我们升级模板;用户已有同名文件且无 sentinel 时跳过 + warn。
- **vault-data.json 自动生成** —— `srcDir/public/vault-data.json`,三个组件 fetch 同一份。dev HMR 时自动重生。
- **sidebar 自动注入** —— 在用户 sidebar 末尾追加 "Vault Views" 分组(默认折叠)。支持 array / per-path object / undefined 三种 sidebar 形态。
- **正文 #tag inline rule** —— 识别 `#tag` / `#nested/tag` / `#中文标签`,渲染为 `<a class="ayn-tag">`,自动跳到 `/tags#tag`。Unicode 友好,带 URL fragment / 数字开头等边界过滤。
- **CSS variables 系统** —— 全部组件颜色用 `--ayn-*` 变量,默认回退到 VitePress 的 `--vp-c-*`。用户在自己 CSS 里改一行变量即可全局换色。
- **theme 可被三层覆盖** —— 用户可在自己的 `.vitepress/theme/index.ts` 里 `{ ...AllYouNeedTheme, enhanceApp(ctx) { /* override */ } }` 替换任意组件 / 样式 / 加自己 enhanceApp 逻辑。

### Configuration

新增 `ViewsOptions`:
- `views.enabled.{graph,stats,tags}: boolean` —— 单独开关每个视图
- `views.names.{graph,stats,tags}: string` —— 自定义视图文件名(避开和用户笔记冲突)
- `views.sidebar: 'auto' | false` —— sidebar 注入策略
- `views.sidebarText` —— 自定义 sidebar 显示文字(group / graph / stats / tags)
- `views.graphMaxNodes: number` —— VaultGraph 节点上限(默认 500)
- `views.dataFileName: string` —— vault-data.json 文件名(默认 `vault-data.json`)
- `views.parseInlineTags: boolean` —— 是否识别正文 #tag(默认 true)

### New deps

- `d3-force` / `d3-selection` / `d3-zoom` / `d3-drag` —— 合计 ~24KB min+gz,只 VaultGraph 用

### Dev deps

- `vue` `^3.5.13`(peer 的 .vue 文件编译要)
- `@types/d3-*` 4 个

### Tests

- 16 个新用例覆盖 generate-md / generate-data / sidebar-inject / #tag rule;v0.2 测试总数 75。

## [0.1.0] - Unreleased

## [0.1.0] - Unreleased

首个公开版本。Forked from [actuallysomecat/markdown-it-wikilinks-plus](https://github.com/actuallysomecat/markdown-it-wikilinks-plus) 并针对 VitePress 大幅重写。

### Added

- **VaultIndex 共享数据库**:扫描 srcDir 一次,产出完整索引(`files` / `byBasename` / `byAlias` / `byUrl` / `headings` / `tags` / `backlinks` / `assets`),后续模块均从此索引取数。
- **wikilinks 模块**:`[[Page]]` / `[[Page|alias]]` / `[[Page#heading]]` / `[[Page#heading|alias]]`。
  - 三档同名冲突策略(`shortest` / `first` / `error`,默认 `shortest`)。
  - frontmatter `aliases:` 自动注册并优先于 basename 匹配。
  - 大小写不敏感默认开启,保证 Linux/macOS 表现一致。
  - 死链三档(`silent` / `warn` / `error`)、半死链(锚点未匹配)单独标记。
  - href 经 `encodeURI`,attr 经 HTML escape,Unicode/空格安全。
- **embeds 模块(image)**:`![[image.png]]` 全套尺寸语法:`|N`、`|xN`、`|NxN`、`|alt`、`|alt|NxN`。输出 `width`/`height` 属性而非 inline `style`。
- **embeds 模块(transclusion)**:`![[note]]` 把目标笔记正文内联;`![[note#heading]]` 内联指定 heading 区间;含循环检测、嵌套深度限制、按内容哈希缓存。
- **自动资源管线**:
  - dev 模式 Vite 中间件按 basename 流式响应,零拷贝。
  - build 模式 `emitFile` 输出到 `dist/_assets/<hash>-name.ext`(默认带 hash);开 `preserveAssetPaths` 可改为 `/assets/name.ext` 原路径模式。
- **双使用模式**:`defineConfigWithAllYouNeed` 零配置 wrapper + 手动接线(`./markdown-it` + `./vite`)。
- **VitePress 配置桥接**:自动同步 `srcDir` / `base` / `cleanUrls` / `markdown.anchor.slugify`。
- **锚点 slugifier**:用 `@mdit-vue/shared`,与 VitePress 默认行为 100% 一致;支持 `{#custom-id}` 语法。
- **完整的扫描忽略规则**:默认忽略 `node_modules` / `.git` / `.obsidian` / `.vitepress` / `dist` 等;可选 `respectGitignore`。

### Compared to upstream (markdown-it-wikilinks-plus)

- **修复**:`[[Page#heading]]` 之前完全不处理,现在按 VitePress 同款 slugify 解析。
- **修复**:`![[note]]` 之前被静默降级为普通 `<a>`,现在真做 transclusion。
- **修复**:`![[x.png|300]]`(仅指定宽度)之前被误判为 alt,现在按 Obsidian 行为处理。
- **修复**:image 输出从 inline `style` 改为 `width`/`height` 属性。
- **修复**:href 现在做 URL 编码;`[[note.md]]` 自动剥 `.md`/`.markdown`。
- **修复**:`silent` 模式现在按 markdown-it 约定返回 `true`。
- **新增**:vault 扫描、aliases 解析、死链检测、自动资源管线 —— 这些是 VitePress 场景下"开箱即用"的必备能力。
- **移除**:`absoluteBaseURL` / `relativeBaseURL` / `forceAllLinksAbsolute` / `uriSuffix`(由 ConfigBridge 从 VitePress 自动同步);`sanitize-filename` / `extend` / `proper-url-join` 依赖(自实现或不需要)。

### Polish (v0.1 收尾)

- **默认样式表**:`style.css`,导出为 `vitepress-allyouneed/style.css`,在主题 entry 里 `import` 即可启用。覆盖 wikilink、wikilink--dead、wikilink--unmatched-anchor、transclusion 各种状态、暗色模式适配。
- **URL 冲突告警**:扫描期检测多文件路由到同一 URL(典型:`index.md` + `README.md`),通过 Vite logger 打 warn。
- **`README.md` 视为 index**:与 VitePress 默认行为对齐 —— `README.md`/`index.md` 都路由到目录根。
- **VitePress `srcExclude` 自动透传**:`defineConfigWithAllYouNeed` 会把 VitePress 的 `srcExclude` 合并进我们扫描器的 `scan.exclude`,避免误扫排除的文件。

### Credits

Original `markdown-it-wikilinks-plus` © 2025 somecat(MIT)。
本项目在其代码结构与选项语义基础上重写,保留 MIT 协议。
