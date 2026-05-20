# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/);版本号遵循 [SemVer](https://semver.org/lang/zh-CN/)。

## [0.3.5] - 2026-05-20

零配置导航更顺手:不写 `index.md` 也能从导航 / sidebar / 用户手写 wikilink 进到一个文件夹;默认 index 模板换成"文件管理器风格"(子文件夹在上、文件在下)。

### Added

- **`sidebarAuto.folderLinkFallback: 'first-file' | 'none'`(默认 `'first-file'`)**
  控制"文件夹链接缺 index 时怎么办"。三处效果一致:
  - 自动生成的 sidebar group:无 dirIndex 时,group title 链到该文件夹第一个文件;
  - 自动生成的 nav tab:无 dirIndex 时,tab 链到第一个文件(不再 silently skip);
  - 用户手写的 `[[folder/]]` wikilink:同样兜底到第一个文件,label 用文件夹名(不用 first file 的 basename)。
  设为 `'none'` 退回老行为(无 link / 死链)。最常见用法:`autoFolderIndex: 'off'` + `folderLinkFallback: 'first-file'`,完全不在 vault 写 `index.md` 也能从导航走通。
  > **注意**:**空 frontmatter-only dirIndex** 仍然是用户显式 opt-out 信号(读 frontmatter 中的 `sidebarTitle` / `sidebarCollapsed`,但 group 无 link)。这种文件**不会**触发 first-file 兜底 —— 兜底只在**完全没有** dirIndex 文件时生效。
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
