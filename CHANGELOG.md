# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/);版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.2.0] - Planned

计划加的"插件自动生成视图":

- **VaultGraph** — 全站关系图(节点 = 笔记,边 = wikilink/transclusion)
- **VaultStats** — vault 统计仪表盘(总页数/标签数/链接数/最近修改 …)
- **Tags** — 标签云图 + 标签 → 笔记列表
- 上述视图都作为虚拟 .md 页面自动生成、自动注入 sidebar 底部,用户无需手动配置

实现机制:`viteAllYouNeed` 通过 Vite 的 `resolveId`/`load` 在 `_views/*.md`
路径上产生虚拟模块;markdown 内容 = 自动生成的引导文字 + 嵌入的 Vue 组件。

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
