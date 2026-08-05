/**
 * v0.3 — sidebar 自动生成的公共类型。
 */

import type { FileEntry } from '../types.js'

export interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
  base?: string
}

export type SidebarConfig =
  | SidebarItem[]
  | Record<string, SidebarItem[]>
  | undefined

export type SidebarAutoMode = 'off' | 'fill-if-empty' | 'force'

export interface SidebarAutoOptions {
  /**
   * 触发策略:
   *   - 'off'           完全不生成
   *   - 'fill-if-empty' 仅当 themeConfig.sidebar 未提供时自动生成(默认)
   *   - 'force'         总是用自动生成覆盖 themeConfig.sidebar
   */
  mode?: SidebarAutoMode

  /**
   * 布局:
   *   - 'tree'        (默认)单一全局 array,子目录嵌套成 collapsible 子 group
   *   - 'flat'        @deprecated。老 v0.3 第一版行为；1.0 将删除 ——
   *                   推荐换 'tree'(嵌套)或 'per-folder'(每文件夹独立 sidebar)
   *   - 'per-folder'  Record<string, items[]>,VitePress 按 URL 前缀切换 sidebar
   */
  layout?: 'tree' | 'flat' | 'per-folder'

  /** 排除路径(相对 srcDir,glob 支持基本前缀匹配:`_drafts/**` 等) */
  exclude?: string[]

  /** group 默认是否 collapsed,默认 true */
  collapsed?: boolean

  /** 排序策略。文件夹使用其 dirIndex(index/README/同名页)作为排序锚点。 */
  sortBy?: 'order-then-title' | 'title' | 'mtime-desc'

  /** 自定义 group 标题转换(默认对 dirname 做 humanize:把 `-`/`_` 改空格 + Title Case) */
  formatGroupTitle?: (dirname: string) => string

  /** 自定义 item 标题转换(默认 frontmatter.sidebarTitle ?? frontmatter.title ?? H1 ?? basename) */
  formatItemTitle?: (entry: FileEntry) => string

  /** frontmatter 中的 key,标记此文件 sidebar 隐藏。默认 'sidebarHidden' */
  hiddenKey?: string

  /** frontmatter 中的 key,自定义 sidebar 标题。默认 'sidebarTitle' */
  titleKey?: string

  /** frontmatter 中的 key,排序权重(number,小在前)。默认 'order';dirIndex 的值也用于文件夹排序。 */
  orderKey?: string

  /**
   * 是否自动生成 nav(顶级目录变成 nav tabs,搭配 per-folder layout 切换 sidebar)。
   * 默认 false,需要用户显式开。开启时:
   *   - 仅在 themeConfig.nav 未提供时填(不踩用户)
   *   - 每个顶级目录(非 `_` 前缀、非视图前缀)生成一个 tab
   *   - 每个 tab 带 activeMatch,使其 URL 子树下都高亮
   */
  autoNav?: boolean

  /** autoNav 第一项的文本,默认 'Home' */
  homeNavText?: string

  /** 自动剥 basename / dirname 前的 `01-` `02_` 等数字前缀(humanize 时),默认 true */
  stripNumericPrefix?: boolean

  /**
   * v0.3.9:`stripNumericPrefix: true` 时使用的正则。**第一个匹配会被剥掉**。
   *
   * 默认匹配 `01-foo` / `02_bar` / `1 baz`(详见 DOCS.md)。
   *
   * 想支持 `1) Foo`、`(1) Foo` 等其它格式时用户提供 RegExp。
   *
   * ⚠ **不要**把 `.` 加进字符类,会吃掉 `1.2.3-formula.md` 这种版本号前缀
   * (0.3.4 修过的 bug)。
   *
   * 若同时设了 `stripNumericPrefixSeparators`,**本字段优先**。
   */
  stripNumericPrefixPattern?: RegExp

  /**
   * v0.3.9:`stripNumericPrefix` 用的"分隔符字符集"——比 `Pattern` 友好,不要懂正则。
   *
   * 默认 `'-_\\s'`(等价于 `[-_\s]`,匹配 `01-foo` / `02_bar` / `1 baz`)。
   * 想再支持 `1) foo` / `1.foo` 设 `'-_\\s)\\.'`(注意 `.` 会让版本号被吃,慎用)。
   *
   * 内部生成 `/^\d+[<chars>]+/`。**若设了 stripNumericPrefixPattern,本字段被忽略**
   * (Pattern 优先)。
   */
  stripNumericPrefixSeparators?: string

  /** 顶级 group 排序的显式覆盖。例:`['Tour', 'Guides']` 让这两个排最前(其余按 dirIndex 排序锚点) */
  groupOrder?: string[]

  /** 嵌套深度上限(根算 0,1=只展开一层子组)。undefined = 不限,默认 undefined */
  maxDepth?: number

  /**
   * 只扫某个子树(i18n 场景:`includePrefix: 'en'` 只生成 /en/ 下的 sidebar)。
   * VitePress i18n 下推荐用法:
   *   - root locale: `excludePrefixes: ['en']`(排掉 EN 子树)
   *   - en locale:   `includePrefix: 'en'`(只看 EN 子树)
   */
  includePrefix?: string

  /** root locale 用:排除掉这些 prefix 的子树(其它 locale 内容不进 root sidebar) */
  excludePrefixes?: string[]

  /**
   * sidebar 中 group 标题是否带 link(点击跳到对应 dirIndex):
   *   - 'all'        所有有 dirIndex 的 group 都加 link(默认,完全兼容老行为)
   *   - 'top-level'  仅顶级 group 加 link;侧边栏内的子组**不跳转**,只展开/折叠
   *   - 'off'        所有 group 都不加 link(纯导航树,所有页面只能点叶子节点)
   *
   * 与 autoFolderIndex 互补:autoFolderIndex 控制"是否生成",groupLink 控制"是否能点"。
   */
  groupLink?: 'all' | 'top-level' | 'off'

  /**
   * 自动生成 sidebar 时,**子目录(group)是否排在普通文件之前**。
   *   - false(默认)  files → virtualGroups → folders(老行为)
   *   - true           folders → virtualGroups → files(Finder / Obsidian 风格)
   *
   * 仅影响同一层级内"普通文件"与"子目录 group"的相对位置。组内 / 文件间的
   * 排序仍由 sortBy / orderKey / groupOrder 决定。
   */
  foldersFirst?: boolean

  /**
   * v0.3.10:文件夹链接解析顺序。**第一个命中的就用**。
   *
   * 元素:
   *   - `'same-name'`  文件夹下与文件夹同名的 .md(如 `Themen/Themen.md`)
   *   - `'index'`      `index.md`
   *   - `'readme'`     `README.md`
   *   - `'first-file'` 按 sortBy 排序后的第一个文件
   *
   * 默认 `['same-name', 'index', 'readme', 'first-file']`(全套兜底,绝大多数情况
   * 能找到目标)。
   *
   * 想"只用 index.md / README.md,找不到就死链",设 `['index', 'readme']`。
   * 想"完全不让文件夹链接可点",设 `[]`(等价旧 `folderLinkFallback: 'none'`)。
   *
   * 应用于:auto-sidebar group link、auto-nav tab、用户手写 `[[folder/]]` 解析。
   */
  folderLinkOrder?: Array<'same-name' | 'index' | 'readme' | 'first-file'>

  /**
   * @deprecated v0.3.10 起改用 `folderLinkOrder`。
   * 兼容映射:
   *   - `'first-file'` → 默认 ['same-name', 'index', 'readme', 'first-file']
   *   - `'none'`       → []
   *
   * 若同时设了 `folderLinkOrder`,**本字段被忽略**(Order 优先)。
   */
  folderLinkFallback?: 'first-file' | 'none'

  /**
   * v0.3.9:**materialize** —— 把 sidebar 配置"物化"成每文件夹一个 `_sidebar.md`
   * (frontmatter 含 sidebarAuto 覆盖块,body = `- {.}` 占位符),让用户可以**编辑
   * 该文件**自定义结构,而结构仍随文件变化自动刷新(因为 body 是 placeholder)。
   *
   * 三档同 autoFolderIndex:
   *   - 'off'(**默认**) 不写文件,sidebar 全 in-memory
   *   - 'top-level'    仅顶级目录生成 `_sidebar.md`
   *   - 'all'          所有非空目录都生成
   *
   * sentinel 注释保护:用户改后(去掉 sentinel)不会被覆盖。
   * 已有用户写的 `_sidebar.md` 永远不动。
   */
  materialize?: 'off' | 'top-level' | 'all'

  /**
   * @deprecated v0.3.10 删除了 autoFolderIndex 功能。
   * 文件夹链接现在由 folderLinkOrder 配置直接解析(无需生成 index.md)。
   * 运行时检测到本字段会 console.warn 一次。
   */
  autoFolderIndex?: unknown
}

export interface NavItem {
  text: string
  link: string
  /** VitePress activeMatch 正则字符串,用于子页面也保持 tab 高亮 */
  activeMatch?: string
}

export interface ResolvedSidebarAutoOptions {
  mode: SidebarAutoMode
  exclude: string[]
  collapsed: boolean
  sortBy: 'order-then-title' | 'title' | 'mtime-desc'
  formatGroupTitle: (dirname: string) => string
  formatItemTitle: (entry: FileEntry) => string
  hiddenKey: string
  titleKey: string
  orderKey: string
  autoNav: boolean
  homeNavText: string
  stripNumericPrefix: boolean
  groupOrder: string[]
  maxDepth: number | undefined
  groupLink: 'all' | 'top-level' | 'off'
  includePrefix: string | undefined
  excludePrefixes: string[]
  foldersFirst: boolean
  /** v0.3.10:文件夹链接解析顺序(替代老的 folderLinkFallback) */
  folderLinkOrder: Array<'same-name' | 'index' | 'readme' | 'first-file'>
  stripNumericPrefixPattern: RegExp
}
