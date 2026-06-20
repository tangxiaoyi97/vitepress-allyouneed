# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/);版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Fixed
- **同名页面跨 locale / 区域解析错误**:`[[Gravitationsphysik]]` 这类 basename-only Wikilink 不再直接使用全局 `onConflict`。解析器现在先按源页面的同目录和最长共同路径前缀收窄候选(例如 `zh/themen/*` 优先于 `zh/selfcheck/*`,二者都优先于其它 locale),仍有歧义时才执行 `shortest` / `first` / `error`。
- 强化当前源页面定位:relativePath 精确匹配先于后缀兜底,且后缀存在多个 locale 命中时不再取扫描顺序中的第一个。

## [0.5.3] - 2026-06-20

0.5.2 的 **Bug 2 修复不完整**(已发到 npm,故 0.5.2 标记 deprecated;请升到 0.5.3)。本版把它彻底修对,并补齐 i18n 实战验证。

### Fixed
- **自引用锚点 `[[#heading]]` 在 i18n / 重名文件布局下仍然全部死链**(0.5.2 的修复在那些场景下无效)。
  - 根因:0.5.2 用 `index.files.get(currentSourcePath)` **精确取键**把"当前文件路径"映射回 entry。但渲染期的 `env.currentPath`(VitePress 的 `env.realPath`/`env.path`)与 index 键(`entry.absolutePath`,扫描时 `toPosix` 过)的**归一化形态在不同版本/配置(尤其 i18n 多 locale + 同名文件,如 `Astronomie und Exobiologie.md` 在 root 与 `/zh/` 各一份)下不一致**,精确 get 一旦 miss → 自引用又全死链。0.5.2 的单文件 renderer 验证没有真实 locale 上下文,给了**假阳性**。
  - 修复:`core/resolver.ts` 新增 `findSelfEntry()`,逐级回退命中当前文件:精确键 → `toPosix` 归一键 → 后缀(相对路径,`/` 边界防误配)→ `relativePath` 相等 → basename 唯一兜底。**归一化先于 basename 兜底**,确保重名文件解析到正确的那一个(root 不串 zh)。
  - 验证:用**真实 `vitepress build`**(含 i18n root + `/zh/` 同名文件)产出的 HTML 核对 `class="wikilink"` 标签 —— 两个 locale 的自引用锚点均为 live `href` 且各指向本文件 heading,0 个 `wikilink--dead`。新增 9 条回归测试(路径归一化形态 + DE/ZH 重名)。

> 注:验证渲染 HTML 时只匹配 `class="wikilink"` 的 `<a>`;VitePress 给每个标题加的 header-anchor permalink(`href="#slug"`)会让 naive 的 `href="#…"` grep 误判死链为 live。

## [0.5.2] - 2026-06-20

实战(90 页 DE+ZH 物理知识库,重 KaTeX / Wikilink / GFM 表格)发现的三个 build-blocker / 死链 bug,纯插件侧可修,无需改任何内容。

### Fixed
- **致命崩溃(同 0.5.1 那类 `state.pos`,但这次出在 `#tag` inline rule):`vitepress build` 在含 `#tag` 的 link label / 嵌套方括号 / GFM 表格单元格上整站构建失败**,报 `inline rule didn't increment state.pos`。
  - 根因:`modules/tags/rule.ts` 的 `#tag` inline rule 注册在 `link` 之前;markdown-it 的 link 核心规则用 `parseLinkLabel → skipToken` 以 **silent 模式**扫描 `[...]` label,本规则在 silent 下 `return true` 却**没推进 `state.pos`**,触发 markdown-it 的安全检查并经 `parseLinkLabel` 对未消费的 `[` 递归。0.5.1 已修了 wikilink rule 的同款问题,但 tag rule 漏改 —— 复现文件正是报告里的 `themen/Astronomie und Exobiologie.md`(`[[#Biomarker|…]]` 被表格 `|` 拆成 `[[#Biomarker`,其中 `#Biomarker` 命中 tag rule)。
  - 修复:silent 模式下也把 `state.pos` 推过匹配长度再 `return true`,token 产出仍门控在 `!silent`(对齐 markdown-it 自带规则)。
- **页内跳转锚点 `[[#heading]]` 即使 slug 精确匹配也被判死链 / 失去 `href`**(报告:仅德语主题就 74 处)。
  - 根因①:自引用 wikilink(只有 `#anchor`、无文件部分)解析时 `target` 被切成空串 → `lookupEntry('')`/`resolveSimple('')` 返回空 → 整条 wikilink 误判 dead。
  - 根因②(关键,初版漏掉):把"当前文件路径"映射回 entry 时用 `index.files.get(currentSourcePath)` **精确取键**。但渲染期传进来的 `env.currentPath`(= VitePress 的 `env.realPath`/`env.path`)与 index 键(`entry.absolutePath`,扫描时 `toPosix` 过)的**归一化形态在不同版本/配置下不保证一致**(反斜杠、前导 `./`、相对 vs 绝对、`srcDir` 解析差异),精确 get 一旦 miss → 自引用又**全部死链**。
  - 修复:`core/resolver.ts` 新增 `findSelfEntry` —— 精确键 → `toPosix` 归一键 → 后缀(相对路径)匹配(`/` 边界防误配)→ `relativePath` 相等 → basename 唯一兜底,逐级回退;对重名文件(报告里 `Astronomie und Exobiologie.md` DE+ZH 共存)用归一化优先于 basename 兜底,确保解析到**正确**的那个文件而非串台。`core/scan-wikilinks.ts` 同步不再把自引用锚点计入死链汇总。heading 匹配(exact slug,各 `anchorMatch` 模式通吃)随后正常命中。
- **缺失的 embed 资源(`![[foo.gif]]` / 音视频 / PDF 指向不存在文件)把整个 Vite/Rollup 构建硬中断**,报 `Rollup failed to resolve import "/foo.gif"`。
  - 根因:`modules/embeds/image.ts` 与 `modules/embeds/media.ts` 在 asset 解析不到时回退成绝对路径 `/{basename}`,该 URL 被 VitePress 的 Vite 插件当模块 import,Rollup 解析不到即 throw。
  - 修复:缺失资源不再产出会被 Vite 解析的 `src`,改为按 `deadLink` 策略告警(`silent`/`warn`/`error`,`error` 推 `index.warnings` 让构建以非零退出但不中断渲染)+ 渲染一个**不触发 Vite 解析**的占位 `<span class="ayn-embed ayn-embed--missing">`,与死链行为一致,绝不 throw。

### Tests
- 新增 `tests/v052-bugfixes.test.ts`(Bug1 silent-pos / Bug2 自引用锚点 + scanWikilinks / Bug3 image+media 缺失占位 + `deadLink='error'` 告警)。
- 更新 `tests/render.test.ts`、`tests/v03-phase2.test.ts`:缺失 image/media 现在断言占位 `<span>` 而非旧的会崩 build 的 `<img>/<audio>/<iframe src="/…">`;media player 用例改指向 `fixtures/vault/media/` 下的真实占位资源。
- 真实 `vitepress build` 端到端验证(复现 Astronomie 嵌套链接 + 自引用锚点 + 缺失 gif/mp4/pdf)全部通过:无 `state.pos` 崩溃、零死链上报、缺失 embed 降级告警、`build complete` 退出码 0。

### Files touched
- `src/modules/tags/rule.ts`(silent 推进 `state.pos`)
- `src/core/resolver.ts`、`src/core/scan-wikilinks.ts`(自引用锚点 → 当前文件)
- `src/modules/embeds/image.ts`、`src/modules/embeds/media.ts`(缺失资源 → 占位 + `deadLink` 策略,不 throw)

## [0.5.1] - 2026-06-20

### Fixed
- **致命崩溃:wikilink 在 markdown link label / 嵌套方括号 / GFM 表格单元格里会让整个 `vitepress build`/`dev` 中止**,报错 `inline rule didn't increment state.pos`。
  - 根因:wikilink 的 inline rule 在 **silent 模式**(markdown-it 的 `parseLinkLabel → skipToken` 会以 silent 模式逐个跑 inline rule 来扫描 `[...]` label)下直接 `return true` 而**没有推进 `state.pos`**,违反 markdown-it 契约(`parser_inline.skipToken` 在规则返回 true 但 pos 未前进时抛此错)。`[[` 的第一个 `[` 触发 link 核心规则的 label 扫描时即命中。
  - 修复:silent 模式下也把 `state.pos` 推过闭合 `]]` 再返回 true(对齐 markdown-it 自带规则如 backtick 的做法:silent 也设 pos,仅把 token 产出门控在 `!silent`)。`![[embed]]` 同路径一并修复。
  - 影响面:任何把 `[[...]]` 或 `![[...]]` 放进 markdown link label、嵌套 `[ ... ]`、或 GFM 表格单元格的文档,此前会整站构建失败;现在正常渲染。
  - 新增 7 个回归测试锁定该行为。

## [0.5.0] - 2026-06-20

0.5.0 正式版。收口此前 4 个 beta(主题底层化 + `@layer`),并叠加图谱体验、UI 健壮性与文档站重做。

### 主题集成(自 0.5.0-beta.x)
- 全部 7 个 CSS 文件包进 `@layer vitepress-allyouneed`(浏览器原生 cascade layer,各文件头尾自包,不经 bundler 黑盒),用户 / 第三方主题的 unlayered CSS 自动覆盖,无需关心权重或加载顺序。
- 删除所有 `!important`。
- DocHeader banner 标题改用 `<div role="heading" aria-level="1">`,躲开 VitePress `.vp-doc h1` 选择器,让 layered 字号正确生效。
- 新 `defineTheme()` 工厂:零配置一行接入,或 `defineTheme({ extends: 第三方主题 })` 嵌套。

### 图谱体验
- 缩放时节点名平滑淡出 / 放大浮现 —— 修复此前缩小标签不变淡的 bug(SVG `opacity` 属性被 CSS 盖过,改用 CSS 变量 `--ayn-label-zoom` 驱动)。
- hover 稳定命中:每个节点加透明命中圈(半径 `max(可见+8, 12)`),小节点也好点;放大反馈改用 `transform: scale`,不改命中几何、不抖。
- 物理参数重调(更轻柔收敛),rAF 合帧渲染,ResizeObserver 防抖修自激循环;移动端容器高度自适应。

### 健壮性
- **死链预扫线性化**:`scan-wikilinks` 的行内代码剥离从带反向引用的正则改为线性扫描,杜绝大量未闭合反引号导致的 ReDoS。
- **dev asset 中间件**:用索引里的 size/mtime 出 ETag / 304 协商缓存(去掉每请求一次同步 statSync),basename 兜底收紧避免错配。
- **热更新**:`statSync` 仅在 `ENOENT` 时摘除文件,避免编辑器原子保存的临时错误误删索引。
- **视图数据校验**:`useVaultData` 校验 `nodes/edges/stats/tags/meta` 五字段齐全,损坏数据优雅报错而非整页崩。
- **日期统一 UTC 格式化**(DocHeader / Stats / Tags),消除 SSR 构建机与浏览器时区不一致的水合不匹配。
- Tags 单行内联标签上限 3 个 + “+N” 折叠;cover 图加载失败时占位底色改深色保证白字可读;字数统计改 `nextTick`+rAF + CJK 字符类扩展。

### 文档站
- 新增 **Showcase 功能展示区**(源码 + 实际渲染对照,覆盖全部功能)。
- **i18n 重构**:英文为默认(root),中文移到 `/zh/`,中英内容同步。
- 修正 docs 中过时描述(`%%注释%%` 默认保留为 HTML 注释、`[[note#^id]]` 暂不解析、`cssclasses` 未实现等),补 v0.4 / v0.5 changelog 与 tour。

### 工程
- `prepublishOnly` 钩子:发布前自动 clean + typecheck + build + test,杜绝发出未构建的空包。
- 版本号由 tsup 构建期从 `package.json` 注入(`__AYN_VERSION__`),源码不再硬编码。

## [0.5.0-beta.3] - 2026-05-22

### Fixed
- **Tags 视图(可能也包括其它视图)整片失样**:0.5.0-beta.0/.1/.2 的 `@layer` 声明用了 `@import url('./x.css') layer(vitepress-allyouneed)` 这种"在 @import 子句上挂 layer"语法。CSS 标准支持,但 **Vite + postcss-import / lightningcss 不同链路对它支持参差**:某些组合下 `layer()` 子句被吞,resolve 后的规则**没进 layer**;另一些组合下规则进了 layer 但没正确链入 layer order,被埋在最底层 specificity 一概输掉。Tags chip 失去 pill 样式就是这个症状(`.ayn-tag-chip` 的 padding/border/radius/bg 全输给 user-agent + VP)。
- **改法**:不再用 `@import ... layer()`。每个 .css 文件**自己头尾**包 `@layer vitepress-allyouneed { ... }`,这是浏览器原生 cascade layer 语法,不经过 bundler 黑盒,100% 可靠。`styles/index.css` 退回最朴素的 `@import './x.css'`。
- 行为不变:7 个 .css 全 layered,主题作者 unlayered CSS 自动赢。

### Files touched
- `src/theme/styles/index.css`(去 layer() 子句)
- `src/theme/styles/shared.css`、`stats.css`、`tags.css`、`graph.css`、`callouts.css`、`doc-header.css`(各自头尾包 @layer block)
- `style.css`(同上)

## [0.5.0-beta.2] - 2026-05-22

更彻底的修法:把 DocHeader 的 banner title 改成 `<div role="heading" aria-level="1">`,把 doc-header.css 放回 @layer,所有 7 个 .css 终于统一 layered。

### Changed
- **DocHeader banner 元素 `<h1>` → `<div role="heading" aria-level="1">`**:`.vp-doc h1` 选择器不再匹配我们,@layer 内 layered CSS 不再被 VitePress 默认 unlayered 32px 字号覆盖。
  - 视觉:无差(`.ayn-doc-banner-title` 字号/字重等都生效)
  - 辅助技术:WAI-ARIA 标准,屏幕阅读器按 h1 念出,跟原生 `<h1>` 等同
  - SEO:Google 早期声明 `role="heading" aria-level="1"` 跟 `<h1>` 等价对待
  - 文档大纲算法:99% 工具支持;少数 reader-mode 工具可能少识别一个标题
- **doc-header.css 放回 `@layer vitepress-allyouneed`**:0.5.0-beta.1 的"豁免"特例不再需要。**所有 7 个 .css 都 layered**,主题作者覆盖故事彻底干净
- `styles/index.css` 不再 split "layered / unlayered",注释简化

### Why
0.5.0-beta.0 引入 @layer 后,banner title 是 `<h1>` 在 `.vp-doc` 内,VP 默认 `.vp-doc h1 { font-size: 32px }` 是 unlayered,我们 layered CSS 永远输 → banner title 字号塌缩。0.5.0-beta.1 临时方案:doc-header.css 不 layer。0.5.0-beta.2 釜底抽薪:banner 不用 `<h1>` 元素了,VP 选择器抓不到我们。

## [0.5.0-beta.1] - 2026-05-22

### Fixed
- **DocHeader banner title 字号丢失**(0.5.0-beta.0 回归):banner title 是 `<h1>` 在 `.vp-doc` 内,VitePress 默认 `.vp-doc h1 { font-size: 32px }` 是 unlayered;0.5.0-beta.0 把 `doc-header.css` 包进 `@layer vitepress-allyouneed` 后,**layered 永远输 unlayered**,我们的 `clamp(2rem, 4.5vw, 3.25rem)` 大字号被 VP 32px 覆盖 → "大标题"看起来变小。
- **修法**:`doc-header.css` 不再 layer。原则上"必须压过 VP unlayered defaults 的 CSS"不能 layer;"用户可覆盖的装饰"才 layer。文档 `styles/index.css` 顶部添加注释说明这条边界
- 其它 6 个 CSS 文件继续 layer(它们的 selector 不跟 VP 默认强冲突)

### Note for theme authors
想覆盖 banner title:写 `.ayn-doc-banner-title { ... }` —— 跟 0.4.x 行为一致(unlayered 源顺序赢)。注意我们文件在 `defineTheme` import 时加载,你 CSS 必须在它之后 import 才赢。

## [0.5.0-beta.0] - 2026-05-21

主题集成大改 —— **目标:让 3rd-party VitePress 主题作者完全不需要知道本插件**。

### Theme: CSS 用 `@layer` 包裹(底层化)
- 全部 7 个 .css 文件通过 `styles/index.css` 用 `@import ... layer(vitepress-allyouneed)` 加载,所有规则进 `vitepress-allyouneed` cascade layer
- **后果**:用户(或第三方主题)写的任何 unlayered CSS **自动赢**我们,无论 specificity 或 import 顺序。`.wikilink { color: red }` 真就 red,不用知道我们有个 `.wikilink`
- 删除全部 3 处 `!important`(`callouts.css` callout-title 色、`shared.css` mark 内 mathjax bg、`tags.css` tag link 下划线 reset)—— 它们都不需要 `!important`,specificity 已够,且 `!important` 会在 layer 内反向打败用户 unlayered。删了用户 100% 能盖
- 浏览器支持:`@layer` Chrome/Edge 99 / Firefox 97 / Safari 15.4+(2022 春)

### Theme: 新 `defineTheme()` 工厂(替代之前的 `withAllYouNeed` 设想)
- `vitepress-allyouneed/theme` 默认导出仍是开箱即用的 Theme 对象,**额外**导出 `defineTheme(userTheme?)` 工厂
- 三种用户场景:
  1. **零配置**:`export { default } from 'vitepress-allyouneed/theme'` — 一行完事(DefaultTheme + 我们组件 + 我们 CSS)
  2. **自定义 Layout / 加自己组件**:`defineTheme({ Layout, enhanceApp })`
  3. **嵌 3rd-party 主题**:`defineTheme({ extends: SomeAwesomeTheme })`
- 内部:用户 `enhanceApp` 在我们之后跑 → 同名 `app.component()` 注册**自动赢**(Vue last-registration-wins);用户 `Layout`、`setup` 直接替换
- 主题包作者的工作流跟有没有本插件**完全无关**:他们写正常 VitePress 主题,published,最终用户负责 `defineTheme({ extends: ... })` 一行接入

### Theme: 可被替换的 Vue 组件清单(API 契约)
| 组件名 | 干什么 | 用户怎么换 |
|---|---|---|
| `Layout` | DefaultTheme.Layout + 自动 `<DocHeader />` + `frontmatter.cssclasses` → body | `defineTheme({ Layout: MyLayout })` |
| `DocHeader` | 文档头:banner / 标题 / 时间 / tags | `app.component('DocHeader', MyDocHeader)` |
| `VaultGraph` | d3 力导向关系图 | 同上 |
| `VaultStats` | 统计卡片 | 同上 |
| `Tags` | 标签云 + 搜索 + 列表 | 同上 |

### Composables(显式契约)
`useVaultData()` 早已暴露;0.5.0 起明确这是"给写自己 UI 的人"的公共 API。

### Docs
- `src/theme/index.ts` 文件头三段示例覆盖三种场景
- README "当前版本" 章节同步
- DOCS.md 新增 "Theming" 章节(下个 beta 补全)

### Why beta
- @layer 在 Vite CSS pipeline 的实际行为没在我这边 prod build 跑过,需要真实项目验证
- `defineTheme()` 是新 API,等用户回声再 stabilize
- 老 0.4.x 用户 `import AllYouNeedTheme from 'vitepress-allyouneed/theme'` 仍兼容(default export 没变),只是多了 `defineTheme` 命名导出

### Migration from 0.4.x
**完全无 breaking** —— 老代码继续跑。新代码推荐用 `defineTheme()`,见 README。

## [0.4.1] - 2026-05-21

修 0.4.0 几个回归 + 小幅 UX 优化。

### Fixed
- **数字排序坑**:`1. Masse / 10. Energie / 11. Impuls / 2. Dichte / 3. ...` —— title 比较改成 `localeCompare(b, undefined, { numeric: true })`(natural sort)。现在 `1, 2, 3, ..., 10, 11` 按数值排,而不是字典序的 `1, 10, 11, 2, 3`。影响 `sidebarAuto.sortBy` 的 `'title'` 与 `'order-then-title'`(后者在 order 缺失时 fallback 到 title)。
- **`autoFolderIndex` 警告刷屏**:dev 模式 `server.restart()` 会反复触发,加 module-level once-flag 只报一次;同时把 message 写得更可操作("delete this field from your .vitepress/config.ts")。

### Added
- **`markdown-it-mathjax3` 友好提示**:用户在 vitepress config 写 `markdown: { math: true }` 但没装 `markdown-it-mathjax3` 时,wrapper 自动报一条带安装命令的提示。包加为 optional peer dependency,装与不装都不阻塞。
- **VaultGraph 视觉/性能**:节点默认无边框(更 Obsidian-like,hover/active 才描边)。大图(>200 节点)启用 `alphaDecay` 加速 + 每 N 帧才更新一次 DOM,显著降卡。500 节点可用,1000+ 建议拆 vault。

### Docs
- README 加 "当前版本 0.4.1" + 0.3.x → 0.4.x 升级速览。
- DOCS.md 内 `v0.3.10` 提法统一改成 `v0.4.0`(autoFolderIndex 删除事件实际发布在 0.4.0)。

## [0.4.0] - 2026-05-21

**0.x.0 = breaking-ish minor bump**(按 0.x SemVer 约定大改 → 二位号 bump)。

系统性优化 + 删除老 feature + 重构。**没有运行时崩坏的迁移成本**(老配置仍 typecheck 通过,运行时 warn;一个例外见下)。

### Breaking
- **`sidebarAuto.autoFolderIndex` 彻底删除**(整个 feature 不再存在 + 不再写文件)。这是唯一真正 breaking 的改动 —— 老配置中带 `autoFolderIndex` 字段 typecheck 仍过(字段类型为 `unknown`),运行时 console.warn 一次。**`generateFolderIndexes` / `FOLDER_INDEX_SENTINEL` 等导出已删,引用它们的代码会报错。**

### Removed
- **整个 `generate-folder-index.ts` 模块**(autoFolderIndex 实现)。文件夹 URL 现在由 `folderLinkOrder` 在 sidebar / nav / wikilink 解析时直接处理 —— 不再写 `index.md` 文件。之前生成过的 `index.md`(含 sentinel `<!-- generated by vitepress-allyouneed/folder-index -->`)留在原地,可手动删。

### Added
- **`sidebarAuto.folderLinkOrder: Array<'same-name' | 'index' | 'readme' | 'first-file'>`(默认 `['same-name', 'index', 'readme', 'first-file']`)**:文件夹链接解析顺序,**第一个命中的就用**。同时影响 sidebar group link、nav tab、`[[folder/]]` wikilink。
  - 例:`['index']` 只用 `index.md`;`[]` = 文件夹永不可点;默认 = 全套兜底
- **dev HMR 自动重启**:`.md` 文件 add/remove 或 `_sidebar.md` 内容编辑 → 自动触发 `server.restart()`,sidebar/nav 立刻反映。不再要求用户手动重启。
- **leading-number 匹配放宽分隔符**:`#13` 现在匹配 `## 13) Optik`、`## 13: Foo`、`## 13, Bar`、`## 13 — Plain` 等。仍**不**匹 `## 13.5 Sub`(避免误匹版本号)。修 physik2 的 `Themenpool_Physik_Matura_2026#13-optik-und-wellenphaenomene` 跳不动 bug —— 现在匹中 `13) Optik und Wellenphänomene` 并用 heading 真实 slug `_13-optik-und-wellenphanomene`(VitePress @mdit-vue/shared 渲染出的 id)。

### Deprecated(仍能用,v0.5 删)
- **`sidebarAuto.folderLinkFallback`** → 用 `folderLinkOrder`。`'first-file'` ≡ 默认 order;`'none'` ≡ `[]`。同时设了的话 `folderLinkOrder` 优先。
- **`sidebarAuto.layout: 'flat'`** → 用 `'tree'` 或 `'per-folder'`。运行时 console.warn 一次。
- **`views.sidebar: 'auto' | false`** → 用 `views.injectInto: 'sidebar' | 'nav' | 'both' | 'off'`。运行时 console.warn 一次。

### Internal refactor(无 API / 行为变化)
- `humanize` / `compareEntries` / `titleForFile` / `buildStripPatternFromSeparators` 全部集中到 `src/core/sidebar-auto/internal.ts`,消除 3 套重复实现。
- `DirNode` 不再有 `dirIndex` / `dirIndexEmpty` 单字段;改为 `dirIndexCandidates: Map<'same-name' | 'index' | 'readme', FileEntry>` + `resolveFolderLink(node, opts)` 运行时选 winner。
- `pickDirIndexes` 重命名为 `pickDirIndexCandidates`。

### DOCS
- 删 autoFolderIndex 整段
- 加 **"Sidebar × autoNav: combinations and what they do"** 章节(6 种 layout × autoNav 组合的运行逻辑 + 典型用例)
- 加 **"Folder URLs (v0.3.10 — no more index file generation)"** 章节
- `folderLinkOrder` 完整文档 + 示例
- cheatsheet 全字段更新

### Tests
- `tests/v0310-folder-link-order.test.ts` 新增,15+ 用例覆盖 default / 自定义 order / 老 fallback 兼容 / nav / wikilink / autoFolderIndex 删除
- 删 `tests/v03-extras.test.ts` 的 generateFolderIndexes 三模式 block
- 删 `tests/v035-folder-link.test.ts` 的 F2 默认模板 block
- 删 `tests/v034-bugfixes.test.ts` 的 Bug 2 块(autoFolderIndex 死链 — 不再相关)

## [0.3.9] - 2026-05-21

### Added
- **`wikilinks.anchorMatch: 'exact' | 'leading-number' | 'fuzzy'`(默认 `'leading-number'`)**:三种锚点匹配模式。
  - `'exact'` 严格,对齐 Obsidian
  - `'leading-number'`(默认)按章节号前缀匹配:`[[X#7.2]]` 命中 `## 7.2 Antike — Vorsokratiker`
  - `'fuzzy'`(实验性,99% 可用)leading-number + 全文 prefix + token 全词匹配
- **`leading-number` 锚点歧义汇总告警**:scanWikilinks 启动时若发现 `#7.2` 同时匹配多个 heading,console.warn 列出所有候选 + 已选中的那个。
- **`views.inlineTagPattern: RegExp`**:行内 `#tag` 正则可覆盖。
- **`comments.preserveAsHtmlComment: boolean`(默认 `true`)**:`%%comment%%` 现在默认渲染为 `<!--comment-->`。**隐私警示**:别在 `%%` 里写敏感内容,view-source 看得见。
- **`_sidebar.md` 内嵌 `{folder1, folder2}` 占位符**:markdown list 项末尾可写 `- Mechanics {Themen/Thema_08, Themen/Thema_11}`,自动展开两个文件夹的直接文件平铺在 group 下,子文件夹保留嵌套。支持 `,` / `，` / `、` 三种分隔符。手动写的子 items 附加在展开后面。
  - **路径语义**:无 `/` 前缀 = 相对当前 `_sidebar.md` 所在文件夹;有 `/` 前缀 = srcDir 绝对路径(像 markdown 链接的习惯)
  - **排序**:用 `sidebarAuto.sortBy`(默认 `order-then-title`)与主 sidebar 一致
  - **过滤**:frontmatter `sidebarHidden: true` 的文件被跳过
  - **折叠**:子目录 nested group 用 `sidebarAuto.collapsed`
  - **顺序**:`sidebarAuto.foldersFirst` 控制子目录 vs 文件先后
- **`sidebarAuto.stripNumericPrefixPattern: RegExp`(默认 `/^\d+[-_\s]+/`)**:剥前导数字的正则可配。想支持 `1) Foo` 用 `/^\d+[\)\-_\s]+/`。⚠ 不要加 `.`(会吃版本号)。
- **`sidebarAuto.stripNumericPrefixSeparators: string`(默认 `'-_\\s'`)**:友好版分隔符字符集 — 不用懂正则。内部生成 `/^\d+[<chars>]+/`。若 Pattern 同时设了,Pattern 优先。
- **`_sidebar.md` frontmatter `sidebarAuto: {...}` 覆盖**:per-folder 规则覆盖。该 `_sidebar.md` 的 `{folder}` 展开用合并后的配置;其它文件夹不受影响。识别 `sortBy` / `collapsed` / `stripNumericPrefix(Pattern/Separators)` / `foldersFirst` / `hiddenKey` / `titleKey` / `orderKey`。
- **`{.}` placeholder**:`_sidebar.md` 里 `{.}` 表示"当前 `_sidebar.md` 所在文件夹"。配 materialize 默认模板用,manual `_sidebar.md` 也能用。
- **空 text + placeholder = inline 展开**:`- {sub}`(text 为空)展开内容**直接替换该 item**,不当 group 包裹。`- Group Name {sub}`(有 text)按 group 包裹。
- **`sidebarAuto.materialize: 'off' | 'top-level' | 'all'`(默认 `'off'`,opt-in)**:把 sidebar 配置物化成每文件夹一个 `_sidebar.md`,frontmatter 含可注释的 `sidebarAuto:` override,body 默认 `- {.}` 占位符,每次 build 重新展开 → 用户编辑(改名 / 加组 / 加项)后**仍自动适配新文件**。sentinel 保护,用户去掉 sentinel 后插件永不再动。
- **VaultGraph 缩放联动 label**:像 Obsidian 一样,缩小到 0.9 以下 label 开始淡出,到 0.4 完全隐藏。
- **`DOCS.md`**:完整配置参考,含每个字段类型 + 默认值 + 一个可复制粘贴的"全量默认配置" cheat sheet。

### Fixed
- **VaultGraph 点击节点导航**:`router.go(d.url)` 之前直接传 base-less URL,deploy 在 `/sub/` base 时路由错。改用 `withBase(d.url)`。
- **Tags 视图文件链接同上**:`<a :href="f.url">` 改为 `withBase(f.url)`。

### Changed
- **所有内置文案 / console 消息以英语为基准**:transclusion 错误、dead link warn、视图生成日志、URL 冲突告警、DocHeader 日期(`May 21, 2026` 风格 en-US 格式化)、`Created` / `Updated` / `X min read` 等。debug 日志统一前缀 `[vitepress-allyouneed]` + 英文 message。
- **`anchorMatch` 默认 `'leading-number'`**(不是 0.3.8 的 fuzzy 行为)。Obsidian 严格匹配用户设 `'exact'`;0.3.8 fuzzy 行为用户设 `'fuzzy'`。

### Tests
- 新增 `tests/v039-config.test.ts`,14 条用例覆盖 4 个特性。

### Migration
- physik2 / 章节号笔记用户:default 模式已自动覆盖你的 `#7.2 / #11.1 / ...` 写法,**无需配置**。
- 0.3.8 fuzzy 重度依赖者:加 `wikilinks: { anchorMatch: 'fuzzy' }`。
- 之前 `%%comment%%` 当"真隐藏"的用户:加 `comments: { preserveAsHtmlComment: false }`。

## [0.3.8] - 2026-05-21

### Fixed
- **wikilink 锚点匹配过严**:用户表格里大量写 `[[X#7.2]]` 想匹配 `## 7.2 Antike — Vorsokratiker`、`[[X#11.2 Kepler]]` 想匹配 `## 11.2 Die drei Kepler'schen Gesetze`、`[[X#4.2 Cavendish]]` 想匹配 `## 4.2 Cavendish-Experiment (8. Klasse, 1798)` 等。老 resolver 只做 exact text / slug match,以上全部归为 "unmatched-anchor"——页面能加载、锚点不跳。现在加两层 fallback:
  1. **prefix-with-boundary**:`headingPart` 是 heading text 的前缀,且下一字符是 whitespace 或字符串末尾。处理 `#7.2` → `7.2 Antike...`,且**不**误匹配 `7.21 Andere ...`(下一字符不是空白)。
  2. **token match**:`headingPart` 按空白拆 token,所有 token 都(忽略大小写)出现在 heading text 中。多个 candidate 取最短 text(最精确那条)。处理 `#11.2 Kepler` → `11.2 Die drei Kepler'schen Gesetze`(同时含 "11.2" 和 "kepler",H3 "1. Kepler'sches Gesetz" 不含 "11.2" 被排除)。

  这一改更贴近 Obsidian 用户在表格里"section-number-only"或"number + keyword"的实际书写习惯。

### Tests
- 新增 `tests/v038-anchor-fuzzy.test.ts`,覆盖 exact / prefix / token / 误匹配防护 / unmatched fallback 等 7 个用例。

## [0.3.6] - 2026-05-20

针对用户反馈"Perspectives 有时不加载 / sidebar 有时错"的间歇性问题做了系统排查,5 个真 bug。

### Fixed
- **Perspectives 在 `locales.root.themeConfig` 配置下消失**:VitePress 1.6 渲染时浅 merge `themeConfig` 与 `siteData.locales[k]?.themeConfig` —— locale 整个**替换**顶层 nav/sidebar。wrapper 之前 `if (lang === 'root') continue` 跳过 root,导致用户用标准 i18n 写法 `locales: { root: { themeConfig: { nav: [...] }}}` 时,顶层 Perspectives 被 root 的(未注入)nav 覆盖。现在所有 locale(含 root)都过 inject。
- **dev 模式下新增 / 删除文件后 sidebar/nav 不更新**:wrapper 只在 config time 跑一次 scan + 生成 sidebar,后续 hot-update 只刷新 Vite 插件的 index(用于 wikilink / asset / vault-data.json)。结构变化静默吞掉。现在 `handleHotUpdate` 检测到 `.md` 文件 add / remove 时 `console.warn` 提示"重启 dev 服务器才能反映 sidebar/nav 变化"。
- **空 `themeConfig.sidebar = {}` 或部分 per-path 配置下 Perspectives 在根路径消失**:`injectViewsSidebar` 老逻辑 `for (Object.keys(sidebar))` 在空 object 上跑 0 次,Perspectives 没塞任何路径;用户在 `/` 或非匹配路径访问时看不到。现在显式给 `/` key 兜底一份。
- **`themeConfig.nav` 是 function 时被替换为 `[Perspectives]`**:VitePress nav 支持 function(动态 / locale-aware)。老 `Array.isArray(fn) ? [...fn] : []` 把 function 错判成"无 nav",推 Perspectives 后用单元素数组覆盖用户函数。现在 `typeof === 'function'` 时 wrap 一层,运行时调用用户 fn + 追加 Perspectives;用户 fn 抛错时容错只返 Perspectives 并 warn。
- **perspective fallback sidebar 含标题为 `/` 的死项**:`buildPerspectivesFallbackSidebar` 过滤 `p !== base`,但 base 是 `/sub/` 时永远不等于 `/` → `/` 进 topPaths → seg 为空 → 渲染为 `text: '/'` 的死项。现在显式排除 `'/'` + 双保险 `if (!seg) continue`。

### Tests
- 新增 `tests/v036-perspective-locale.test.ts`,覆盖以上 5 个 bug。

## [0.3.5] - 2026-05-20

零配置导航更顺手:不写 `index.md` 也能从导航 / sidebar / 用户手写 wikilink 进到一个文件夹;默认 index 模板换成"文件管理器风格"(子文件夹在上、文件在下)。

### Added

- **`sidebarAuto.folderLinkFallback: 'first-file' | 'none'`(默认 `'first-file'`)**
  控制"文件夹链接缺 index 时怎么办"。三处效果一致:
  - 自动生成的 sidebar group:无 dirIndex 时,group title 链到该文件夹第一个文件;
  - 自动生成的 nav tab:无 dirIndex 时,tab 链到第一个文件(不再 silently skip);
  - 用户手写的 `[[folder/]]` wikilink:同样兜底到第一个文件,label 用文件夹名(不用 first file 的 basename)。
  设为 `'none'` 退回老行为(无 link / 死链)。最常见用法:`autoFolderIndex: 'off'` + `folderLinkFallback: 'first-file'`,完全不在 vault 写 `index.md` 也能从导航走通。
  > **注意 sidebar vs nav 的差异**:
  > - **Sidebar group**:**空 frontmatter-only dirIndex** 是用户显式 opt-out 信号(读 frontmatter 中的 `sidebarTitle` / `sidebarCollapsed`,但 group **无 link**,只展开/折叠)。这种文件**不会**触发 first-file 兜底 —— 兜底只在**完全没有** dirIndex 文件时生效。
  > - **Nav tab**:nav tab 没"展开/折叠"状态,空 dirIndex 不兜底就成了点不动的死 tab。所以 nav 一视同仁:空或无 dirIndex **都**走 first-file 兜底(若 `folderLinkFallback === 'first-file'`);兜底也找不到才 skip。
  > - **`[[folder/]]` wikilink**:用户写 `[[folder/]]` 时本就期望"跳转",和 nav 同语义 —— 空 dirIndex 兜底到第一个文件。
- **`resolveWikilink` 加同名 dirIndex 路径变体** —— `[[Themen/]]` 现在会查 `Themen/Themen.md` 当作索引(对应 `pickDirIndexes` 同名优先策略)。
- **`[[folder/]]` 写法支持完整化**:之前 `[[Themen/]]` 由于 `target + '/index.md'` 拼出 `Themen//index.md` 双斜杠 bug,实际是死链。现在 normalize 时剥尾 `/` 并强制走 path-style 分支,变体查找正确。

### Changed

- **默认 `autoFolderIndex` 模板 = "Folders 在上、Files 在下"**(像文件管理器 / Tags 视图)。
  - 段标题改成 `## Folders` + `## Files`(原 `## Sections` + `## Pages`)。
  - 子文件夹位置:**上面**(老模板在下面)。
  - 子文件夹标题是否可点接 `sidebarAuto.groupLink`(等同 sidebar 配置语义):
    - `'all'`(默认):所有子文件夹标题都用 wikilink 可点
    - `'top-level'`:仅根 `index.md` 内可点;深层 `index.md` 内为纯文字
    - `'off'`:全部纯文字
  - 子文件夹的"可点目的地"再走 `folderLinkFallback` 兜底,所以即使子文件夹无 index,点了也能进。
- **`FolderIndexOptions` / `TemplateContext` 扩展**:新增 `groupLink` 字段;`TemplateContext` 新增 `isRoot` / `groupLink`。
- **`resolveWikilink` 的 `defaultLabel`**:wasFolderForm 时(`[[folder/]]`),label 用文件夹名,而不是兜底文件的 basename。

### Migration

老用户若觉得新默认行为"不对路":
```ts
sidebarAuto: {
  folderLinkFallback: 'none',  // 回到 v0.3.4 行为
  autoFolderIndex: {
    template: oldTemplate,       // 自己写模板覆盖
  },
}
```

## [0.3.4] - 2026-05-20

真实 Obsidian 物理笔记 vault 测试暴露的 9 个 bug + 3 个隐性问题的集中修复。

### Fixed
- **图片找不到**:`resolveAsset` 之前只查 vault 绝对相对路径(`assetsByRelativePath`),Obsidian "相对当前文件" 路径模式下写 `![[media/image4.png]]` 在 `Themen/X.md` 里时找不到 → 退化为 basename + base → `/image4.png` → Vite 当 public 根 → 404。现接 `currentSourcePath`,**先**查 vault 绝对路径、**再**查相对源文件 dir、**最后**走 basename fallback;`image.ts` / `media.ts` / `transclusion.ts` 三个调用方都已传 `env.currentPath`。
- **`![[ ]]` transclusion 同样问题**:`renderTransclusionHtml` 和降级版 `handleTransclusion` 调 `resolveWikilink` 时漏传 `currentSourcePath`,现已补。
- **`autoFolderIndex` 根目录生成 `[[/foo/]]` 死链**:`defaultTemplate` 拼路径时 `dirRelPath===''` 没特判,产出带前导 `/` 的 wikilink,resolver 不识别"绝对 wikilink"全死。改成根用空 prefix(`[[foo/]]`)。
- **Obsidian 表格内 `\|` 转义被当成路径字符**:`[[Foo\|Bar]]` 是 Obsidian 在表格 cell 里转义 pipe 的标准写法。原 5 处 `inner.split('|')` 把 target 解析成 `Foo\`(带尾巴反斜杠)→ 找不到。统一抽 `utils/wikilink.ts:splitWikilinkInner`,5 处(`wikilinks/rule.ts`、`embeds/block-rule.ts`、`sidebar-auto/parse-sidebar-md.ts`、`views/generate-data.ts`、`core/scan-wikilinks.ts`)替换。
- **`stripNumericPrefix` 把版本号吃掉**:`/^\d+[-_.\s]+/` 把 `1.2.3-formula.md` 误剥成 `2.3-formula`。`.` 不再算分隔符,只剩 `-` / `_` / 空白。
- **行内 `#tag` 在 `cleanUrls: false` 下 404**:`<a class="ayn-tag" href>` 直接拼 `/_perspectives_/tags#xxx`,没考虑 `cleanUrls`。现走 `applyCleanUrls`,需要 `.html` 时自动加。
- **`%% block comment %%` 包了 ``` fence 时提前结束**:扫描闭合 `%%` 没跟踪 fence 状态,fence 内的 `%%` 字面行会把注释关掉,导致 fence 残留。改成同时跟踪 ``` / ~~~ 配对状态,只在 fence 外才允许关闭。
- **`views.urlPrefix` 自定义后 sidebar fallback 失效**:`buildPerspectivesFallbackSidebar` 硬编码 `_perspectives_/`,用户改 `views.urlPrefix: 'extras'` 后过滤失效,会在视图页 sidebar 看到一个指向自己的"前往 Extras"项。现接 `viewsPrefix` 参数。
- **i18n locale Perspectives 注入不对称**:(a) per-locale sidebar 生成后没过 `injectViewsSidebar`,EN locale 等丢 Perspectives 组;(b) nav 注入老逻辑要求 `lc.themeConfig.nav !== undefined`,没自定义 nav 的 locale 拿不到下拉。两边都修。
- **graph 视图丢相对路径 wikilink 边**:`resolveTargetSimple` 不接 `currentSourceRel`,与 `resolver.ts:117` 行为不一致,从而 sibling 笔记的相对链接在 Graph 上看不见。补齐相对路径 fallback。
- **`_sidebar.md` fence 检测同 `%%` 同症**:`/^```|^~~~/` 任一 marker 都切状态,`~~~` 在 ``` 块里会提前结束。改成 marker 配对跟踪。
- **`callout` 标题不解析 inline markdown**:`[!info] **Newton**` 之前显示字面 `**Newton**`。Obsidian 实际会渲染。现走 `md.renderInline`(用户传了自定义标题时)。
- **`webm` 同时在 audio/video 列表**:`classifyMediaExt` video-first,所有 `.webm` 一律渲染为 `<video>`。从 `AUDIO_EXTS` 删掉。
- **静默 `catch{}` 加日志**:`writeVaultData` 失败、`scanWikilinks` 失败之前都吞错,debug "Graph 不更新"非常难找。改成 `console.warn`。

### Tests
- 新增 `tests/v034-bugfixes.test.ts`,每个 RED bug 一条回归用例。

## [0.3.3] - 2026-05-20

### Added
- **`sidebarAuto.foldersFirst`** — 控制同一层级内"普通文件 vs 子目录 group"的相对位置。
  - `false`(默认)`files → virtualGroups → folders`(老行为,兼容)
  - `true`           `folders → virtualGroups → files`(Finder / Obsidian 风格)
  - 仅影响相对位置;段内排序仍由 `sortBy` / `orderKey` / `groupOrder` 决定。

## [0.3.2] - 2026-05-20

### Fixed
- **根目录无 `index.md` 时 404**:`autoFolderIndex: 'top-level' / 'all'` 模式之前只为 srcDir **下**的目录生成 index,根本身被漏。现在 `dirsToProcess` 把 srcDir 根也加进去,根索引页用 `srcDir` basename 当 H1(fallback `Home`)。

## [0.3.1] - 2026-05-20

### Fixed
- **空目录假 URL 导致 MIME 404**

## [0.3.0] - 2026-05-20

正式版。汇集 v0.3 全部新功能(Obsidian 语法 6 模块、sidebar 自动生成全套、DocHeader banner、i18n 集成、`_sidebar.md` 覆盖等),并修两个 deploy 关键 bug。

### Fixed(0.3.0-beta.0 → 0.3.0)
- **build-mode base 双重 prefix → 404**:`entry.url` 之前**包含 base**(`/<base>/foo`),VitePress render 时**再** prepend base → `/<base>/<base>/foo` → GitHub Pages 等子路径部署全部 404。现 `computeUrl` 始终输出**不带 base 的 site-root 相对 URL**(`/foo`),VitePress 统一 prepend。影响 wikilink `<a href>`、sidebar/nav link、per-folder Record key、`_perspectives_/` fallback 等所有内部 URL。
- **i18n nav 注入丢失**:VitePress i18n 下 `themeConfig.locales[lang].themeConfig.nav` 覆盖顶层 nav,Perspectives 下拉在 EN locale 消失。wrapper 现在给**所有 locale 的 nav** 都注入。
- **跨 locale nav 链接 404**:EN locale 写 `link: '/test/'` 被解释为 locale-relative `/en/test/`。example 配置已修正(EN nav 只列已翻译 page)。
- **Perspectives 视图页 sidebar 显示扁平 fallback 列表**(用户反馈不够有用)→ 视图页自动 frontmatter `sidebar: false`,只剩中间 graph/stats/tags 组件全屏展示。

### Added(0.3.0-beta.0 → 0.3.0)
- 11 篇 EN 翻译文档(`en/guide/{overview, docs×6, advanced×4}`)
- VitePress 原生 i18n 集成:wrapper 自动识别 `themeConfig.locales`,给每个 non-root locale 用 `includePrefix` 生成独立 sidebar
- `sidebarAuto.includePrefix` / `excludePrefixes` 公开选项

## [0.3.0-beta.1] - 2026-05-20

### Fixed
- **i18n nav 注入丢失**
- **跨 locale nav 链接 404**

### Added
- 11 篇 EN 翻译 — `en/guide/{overview, docs×6, advanced×4}`
- VitePress 原生 i18n 集成:wrapper 自动识别 `themeConfig.locales`,给每个 non-root locale 自动用 `includePrefix` 生成对应 sidebar;root locale 自动用 `excludePrefixes` 排除其它 locale 子树。
- `sidebarAuto.includePrefix` / `excludePrefixes` 公开选项 — 手动控制 i18n sidebar 范围。

## [0.3.0-beta.0] - Unreleased

v0.3 把"接管 Obsidian 仓库"从能跑变成好用。补齐了 13 种 callouts、Pandoc footnotes、`==高亮==`、`%%注释%%`、`^block-ref`、`![[audio|video|pdf]]` 媒体嵌入;sidebar 不再需要手写(三种 layout + nav 自动生成 + `_sidebar.md` 手动覆盖);文档顶部加了 banner-style `DocHeader`(cover/dates/tags/word-count);Perspectives 视图组挪到 nav 下拉,不再污染各 tab sidebar;补全 11 篇用户文档 + 完整 frontmatter 字段表。

### Added — Obsidian 语法(6 个新模块)

- **Callouts**(13 种 + 别名)`> [!type]` / `[!type]+` 折叠开 / `[!type]-` 折叠关 / 嵌套 `> > [!info]`;别名 `hint→tip` / `check→success` / `error→danger` 等全套
- **Highlight** `==text==` → `<mark>`;内部 markdown 继续解析(`==**bold**==` 嵌套正常);**与数学公式共存**:rule 注册时优先排在 `math_inline` 之后,公式里的 `==` 不会被吃
- **Comments** `%%inline%%` 静默吃掉 / 独占 fence `%%\n...\n%%` 整段隐藏
- **Footnotes**(Pandoc 风格)`text[^1]` + `[^1]: text`,自增编号、同 id 共享、多反链(用 `↑` 字符,非 emoji,CSS 强制 monospace 避免字体 emoji 化)
- **Block-refs**(渲染层)末尾 `^block-id` 剥除并挂 `id="^block-id"` + `class="ayn-block-anchor"` 到上一个 `*_open` token;URL hash 跳转可用
- **媒体嵌入** `![[clip.mp3]]` → `<audio controls>` / `![[movie.mp4|640x360]]` → `<video controls>` / `![[doc.pdf|800x600]]` → `<iframe>`;复用 image 同款 asset pipeline,Vite resolveId/load 自动处理新扩展名

### Added — Sidebar 自动生成全套

- **三种 layout**:`'tree'`(默认,嵌套)/ `'flat'`(顶层平铺)/ `'per-folder'`(每顶级目录独立 sidebar,VitePress 按 URL 切换)
- **`autoNav: true`** —— 顶级目录自动变 nav tabs,带 `activeMatch`,子页面也保持高亮;`homeNavText` 可改首项文字
- **`autoFolderIndex` 三模式**:`'off'`(零侵入)/ **`'top-level'`(默认)**(只为顶级目录生成 index)/ `'all'`(所有目录都生成);支持 `mode/exclude/stripNumericPrefix/template` 对象细控;sentinel 保护,不覆盖用户文件;用户后加同名 dirIndex 时自动清理旧生成
- **`groupLink` 三模式**:`'all'`(默认,所有有 dirIndex 的 group 可点)/ `'top-level'`(子组只展开/折叠)/ `'off'`(都不可点)
- **`groupOrder: string[]`** —— 顶级 group 顺序覆盖
- **`stripNumericPrefix`** —— 默认 true,自动剥 `01-foo.md` `02_bar.md` 数字前缀显示为 "Foo" "Bar"
- **`maxDepth: number`** —— 嵌套深度上限
- **`exclude: string[]`** —— glob 排除(`drafts/**` / `wip-*.md`)
- **`sortBy`** —— `'order-then-title'`(默认)/ `'title'` / `'mtime-desc'`
- **新增公开 API** `generateNav(index, options, autoOptions)` —— 单独从顶层目录生成 nav array

### Added — frontmatter 字段(新增 6 个,扩展原有)

- `sidebarCollapsed: boolean` —— dirIndex 用,控制该 group 默认折叠
- `sidebarGroup: string` —— **虚拟 group**,把文件抽到跨目录的命名组(如 "Customization")
- `cover: string` —— DocHeader banner 背景图,触发 banner 模式
- `banner.x/y/blur/opacity/overlay/text` —— banner 样式微调(位置/模糊/透明度/暗化/文字色)
- `created` / `updated` —— DocHeader 显示日期,`updated` 缺省 fallback `page.lastUpdated`
- `cssclasses: string[]` —— 应用到 `<body>` 的额外 class(挂载/卸载守恒)

### Added — `_sidebar.md` 手动覆盖

- 任何目录放 `_sidebar.md` 即整段覆盖该目录 sidebar
- 两种写法:**frontmatter `sidebar:` 数组**(VitePress 原生 shape)/ **Markdown 列表**(`- [[wikilink|text]]` / `- [text](url)` / `- 纯文字 group` / 缩进嵌套 / `+`-展开 `-`-折叠后缀)
- `[[wikilink]]` 走 wikilink 同款解析(basename / alias / 相对 _sidebar.md / 绝对)
- 文件本身不出现在 sidebar item;也不进 stats/graph/tags 视图(`_` 前缀过滤)
- 解析失败降级到自动生成

### Added — DocHeader(banner-style 文档头)

- 220px-320px 自适应高度横幅,圆角 4px(贴 VitePress 风格)
- 三层结构:背景图层 + 渐变遮罩层 + 居中内容层(`flex-direction: column; justify-content: flex-end` 让内容贴底)
- 大字号自适应:`clamp(2rem, 4.5vw, 3.25rem)`,长标题用 `-webkit-line-clamp: 2 + text-wrap: balance` 两行内换行
- **Mode B**(无 cover):**字号自动增大** `clamp(2.25rem, 5.5vw, 3.75rem)` 补偿无 banner 视觉缺失;走主题色 + 扁平 tag pill
- 自动隐藏文档第一个 H1(避免和 banner 标题重复);`layout: home` 时整个 DocHeader 跳过(VitePress 自带 hero)
- meta 行:lucide-style inline SVG 图标(Clock/Calendar/Edit3)+ ` • ` 分隔
- 中英文字数 + 阅读时长自动算
- frontmatter 完整可控:`banner.x/y/blur/opacity/overlay/text`

### Added — 视图条目位置可选

- 新 `views.injectInto: 'sidebar' | 'nav' | 'both' | 'off'`(默认 **`'nav'`**);老 `views.sidebar: 'auto'|false` 仍兼容(自动映射)
- `'nav'`:Perspectives 进 nav 下拉,sidebar 不被污染(per-folder 推荐)
- `'sidebar'`:老行为,每个 sidebar 末尾追加 Perspectives 组
- `'both'`:两边都加
- 无论哪种模式,`/_perspectives_/` URL 都有 fallback sidebar(避免空 sidebar)

### Added — 工程化

- **启动时预扫所有 wikilink**,死链集中 `console.warn`,免去 dev-server 打开每页才看到死链;扫描时正确跳过 fenced + inline code(`scanWikilinks` + `stripCodeForScan`)
- **wikilink 解析器加 fallback**:含 `/` 找不到绝对路径时,fallback 到"相对当前 source 文件目录"(模仿 Obsidian);scan-wikilinks 同步对齐
- **dirIndex 优先级**:`<folder>.md` > `index.md` > `README.md`(大小写不敏感);例 `tour/tour.md` 作为 tour group 的 link target
- 空 frontmatter-only dirIndex:**不当 link**,**autoFolderIndex 不覆盖**,**但 frontmatter 仍生效**(可用作"配置载体")

### Added — 例子站重构

- 4 个分区:**Home**(landing page,VitePress `layout: home` hero+features)/ **Guide**(11 篇用户文档,含 `docs/` + `advanced/` 子组)/ **Tour**(showcase,分版本 + `changelog/` 子组)/ **Test**(`header/` 9 个 banner 组合 + `wikilinks/` + `transclusion/` + `misc/` 边缘 case)
- 启用 `markdown: { math: true }` + 加 `markdown-it-mathjax3` devDep;`/test/misc/math` 演示 KaTeX 公式 + 高亮 + 数学组合
- `/test/misc/mermaid-diagram.md` 说明如何接 `vitepress-plugin-mermaid`
- `/test/misc/_sidebar.md` 真实演示 sidebar override

### Added — 文档(11 篇)

新增/扩展 `examples/obsidian-vault/guide/`:

- `overview.md` — 11 篇文档导航(分必读/参考/进阶三组)
- `docs/install.md` — 安装 + peer dep + 文件结构
- `docs/configure.md` — 全部顶层 + scan/assets/wikilinks/embeds/views/sidebarAuto/modules/themeConfig.allyouneed 全字段细列
- `docs/frontmatter.md` —— **30+ 字段一份表**:每个标来源(AYN/VP/Obs/theme)、类型、默认值、作用 + 4 个完整示例 + 优先级速查
- `docs/sidebar-auto.md` —— 完整 `sidebarAuto` 参数 + 4 种 recipe + 三种 layout 对比
- `docs/sidebar-override.md` —— `_sidebar.md` 规范(两种写法 / 缩进 / 后缀 / 路径解析 / 用例)
- `docs/doc-header.md` —— banner frontmatter + themeConfig.allyouneed.docHeader
- `docs/obsidian-syntax.md` —— wikilinks / embeds / callouts / 行内 + 模块开关
- `advanced/custom-theme.md` —— 主题覆盖三段论
- `advanced/sidebar-recipes.md` —— 4 种典型 sidebar 配方
- `advanced/theme-interop.md` —— 与第三方主题协作 + **完整 `--ayn-*` CSS 变量速查**(callouts 13 type × 3 token、stats/tags/graph、highlight、footnote 等)+ className 速查 + 后加载覆盖原理
- `advanced/obsidian-compat.md` —— Obsidian 兼容性矩阵(✅/⚠️/❌ 三表) + 推荐迁移流程 + 与 Obsidian Publish 对比

### Changed

- **视觉重做**
  - Callout 改 细边框 + **左侧 3px 伪元素色条** + 中性灰底(不再 type 染色);**title 强制 `--vp-c-text-1` + `!important`** 永远清晰,accent 只作用在左色条 + icon;13 type accent 用 Tailwind 风高对比色(slate/blue/emerald/violet/amber/red/rose/purple/cyan)作为 fallback,**不依赖不存在的 `--vp-c-default-1` / `--vp-c-purple-*` 等**;暗色模式独立色阶
  - Tag pill 全局扁平化:4px 圆角、monospace、无边框、`var(--vp-c-bg-soft)` 底,DocHeader banner 内是白色半透明版本
  - DocHeader banner 高度从 400 → 220-320 横幅形态,圆角 12 → 4px
- **行为变化**
  - 死链 `<a class="wikilink--dead">` **不再输出 href**,点击不会跳转;CSS 加 `text-decoration: line-through; cursor: not-allowed; opacity: 0.85`
  - `views.injectInto` 默认从 `'sidebar'` 改成 `'nav'`(老 `views.sidebar: 'auto'` 仍映射回 `'sidebar'`)
  - Perspectives 不再出现在各 tab 的 sidebar 末尾(默认),而是 nav 下拉

### Fixed

- per-folder layout 下,sidebar 顶级 group 是 single wrap,VitePress 渲染成不可折叠 section header(level-0,无 toggle)。改成**直接展开成 sibling items**,所有子组都是 level-0 可正常 toggle
- per-folder layout 下,根 sidebar 的目录入口(Guide/Tour/Test)如果该目录没 dirIndex 就不可点。改成 fallback 到子树第一个 page URL,**永远可点**
- 删掉 `.vp-doc .callout { padding: 0 }` 老覆盖(和新左色条 padding 冲突)
- footnote backref `↩`(被部分字体当 emoji)→ `↑`(普通箭头)+ CSS 强制 monospace 字体
- `#v0.3` 这种带 `.` 的 tag 解析失败(`.` 不在合法 tag 字符):文档示例改用 `#v03`,加说明
- 文档示例里大量 `[[../path]]` 相对路径死链 → 改成 basename 或绝对路径
- `injectViewsSidebar` 在 per-folder object 形态下漏配 `/_perspectives_/` key,导致视图 URL 下 sidebar 为空 → 补 fallback sidebar(Home + 所有 tab 入口 + Perspectives 组)
- `scanWikilinks` 错把 fenced/inline code 内的 `[[note]]` 当死链 → `stripCodeForScan` 预处理跳过
- callout type-scoped 规则覆盖 `.callout-title` color 导致**淡色文字看不清** → title 永远 `--vp-c-text-1 !important`,accent 只用色条/icon

### Migration

老用户从 v0.2 升级一般无破坏。两点注意:

1. 默认 `views.injectInto: 'nav'`(老默认 `'sidebar'`)→ Perspectives 改在 nav 下拉。想退回老行为:`views: { injectInto: 'sidebar' }` 或老 `views: { sidebar: 'auto' }`
2. 死链 `<a class="wikilink--dead">` 不再有 href;如果你 CSS 依赖 `[href]` 选择器要调

### Test coverage

新增 5 个测试文件,覆盖 80+ 新断言:

- `tests/callouts.test.ts` — 13 type + 别名 + 折叠 + 嵌套 + 模块开关(21 个)
- `tests/highlight-comments.test.ts` — 高亮 + 注释 + 模块开关(10 个)
- `tests/v03-phase2.test.ts` — media embed + footnotes + block-refs(18 个)
- `tests/sidebar-auto-v03.test.ts` — layout × 3 + dirIndex 优先级 + 空 dirIndex + sortBy + groupOrder + stripNumericPrefix + maxDepth + groupLink × 3 + sidebarGroup + generateNav(15+ 个)
- `tests/v03-extras.test.ts` — `_sidebar.md` parser + `generateFolderIndexes` 三模式 + `scanWikilinks` 跳 code + 相对路径 fallback + `views.injectInto` 四模式(14+ 个)

### Added — Obsidian 语法

- **Callouts**(13 种 + 别名):`> [!note] / [!info] / [!tip] / [!success] / [!question] / [!warning] / [!failure] / [!danger] / [!bug] / [!example] / [!quote] / [!abstract] / [!todo]`。支持 `[!type]+` / `[!type]-` 折叠,支持自定义 title,支持嵌套(`> > [!info]`),body 内 markdown 继续解析。每种 type 内置 lucide-style SVG 图标和独立配色 CSS 变量(`--ayn-callout-<type>-{accent,bg,border}`)。
- **Highlight**:`==text==` → `<mark>`,内部 markdown 继续解析(`==**bold**==` 嵌套正常)。
- **Comments**:`%%inline%%` 静默吃掉;独占 fence 形式 `%% ... %%` 整段隐藏。
- **Footnotes**(Pandoc 风格):`text[^1]` + `[^1]: footnote text`。自增编号、同 id 共享编号 + 多反链 `↩`、文末追加 `<section class="ayn-footnotes">`。
- **Block refs**(渲染层):末尾 `^block-id` 剥除并挂 `id="^block-id"` + `class="ayn-block-anchor"` 到上一个 `*_open` token(浏览器原生 anchor scroll 即用;wikilink 路由 `[[note#^id]]` 留到 v0.4)。
- **Audio / Video / PDF embed**:`![[clip.mp3]]` → `<audio controls>`,`![[movie.mp4|640x360]]` → `<video controls width height>`,`![[doc.pdf|800x900]]` → `<iframe>`。复用现有 image 同款 asset pipeline,Vite resolveId/load 自动处理新扩展名。

### Added — 工程化

- **Sidebar 自动生成** (`sidebarAuto`):从 vault 目录结构自动生成 VitePress sidebar。支持三种 mode:`'off'` / `'fill-if-empty'`(默认,只在用户没写时填) / `'force'`(总是覆盖)。
  - 排序:`order-then-title`(默认,frontmatter.order 升序) / `'title'` / `'mtime-desc'`。
  - frontmatter 三个 key 可自定义:`sidebarTitle`(覆盖标题)、`sidebarHidden: true`(隐藏)、`order`(排序权重)。
  - `_` 前缀目录自动隐藏(Obsidian 私有/草稿约定)、视图 `_perspectives_/` 自动排除。
  - 支持 `exclude: ['drafts/**']` 简单 glob。
- **DocHeader** Vue 组件:在 `doc-before` slot 注入文档头。
  - cover 图(`frontmatter.cover` URL/path;或开启 `coverMode: 'gradient'` 走 tag-hash 着色兜底)
  - 时间行(`frontmatter.created` + `frontmatter.updated` / fallback `page.lastUpdated`)
  - tag pills(`frontmatter.tags`,点击跳到 `_perspectives_/tags#tag`)
  - 字数 + 阅读时长(从 DOM 算,中英文分别计数)
- **自定义 Layout**:替换默认 `Theme.Layout`,在 `doc-before` 注入 DocHeader,同时把 `frontmatter.cssclasses` 应用到 `<body>` 上(挂载时加、卸载时清,跨页守恒)。
- **模块开关全量铺平**:`modules.{callouts, highlight, comments, footnotes, blockRefs, sidebarAuto}` 全部可独立开关,默认全开。

### Changed

- 公共类型 `AllYouNeedOptions.modules` 新增 6 个键、`ResolvedOptions` 同步;新增 `AllYouNeedOptions.sidebarAuto`(`SidebarAutoUserOptions`)。
- `vitepress.ts` wrapper 在 `themeConfig.sidebar` 处理链上新增"sidebar 自动生成 → 视图条目注入"两步。

### Notes

- v0.3.0 不动 v0.2 已稳的 vault scanner / asset pipeline / views(graph/stats/tags)/ wikilinks 等模块;新模块全部以独立目录加入,旧接口零 breaking change。
- DocHeader 用 frontmatter 数据,所以"零配置"前提是用户在 `.md` 里写了对应 frontmatter(`cover/created/updated/tags`)—— 没写的话整个 header 不渲染,不会显示空壳。

### Test coverage

新增 4 个测试文件(callouts / highlight-comments / v03-phase2 / sidebar-auto),覆盖 50+ 个新断言,与既有 v0.2 测试一起跑应全绿。

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
