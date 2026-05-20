/**
 * vitepress-allyouneed —— 公共类型定义
 *
 * 这里集中定义所有跨模块共享的数据结构。VaultIndex 是核心数据库,
 * 后续 callouts / tags / dataview / graph 模块都从此处取数。
 */

/**
 * 单个 Markdown 笔记的索引条目。
 */
export interface FileEntry {
  /** 绝对路径(POSIX 风格)*/
  absolutePath: string
  /** 相对 srcDir 的路径,POSIX 风格,不带前导 './' */
  relativePath: string
  /** 不含扩展名的文件名 */
  basename: string
  /** 不含点的扩展名,已小写 */
  extension: string
  /** 最终 VitePress 路由(已应用 base + cleanUrls)*/
  url: string
  /** 解析后的 frontmatter 全量 */
  frontmatter: Record<string, unknown>
  /** frontmatter.aliases 归一化后的字符串数组 */
  aliases: string[]
  /** frontmatter.tags + 正文 #tag(后者由 tag 模块填充,v0.1 只读 frontmatter)*/
  tags: string[]
  /** 该文件所有 heading */
  headings: HeadingEntry[]
  /** 修改时间(毫秒) */
  mtime: number
  /** 文件大小(字节) */
  size: number
  /** 原始正文(去掉 frontmatter 之后);transclusion 用 */
  content: string
}

/**
 * 单个 asset(图片/视频/音频/PDF/canvas 等)的索引条目。
 */
export interface AssetEntry {
  absolutePath: string
  /** 相对 srcDir 的路径,POSIX 风格 */
  relativePath: string
  basename: string
  /** 不含点的扩展名,已小写 */
  extension: string
  mtime: number
  size: number
  /** 哪些页面引用了此 asset(绝对路径集合)。build 时只输出被引用的 */
  referencedBy: Set<string>
  /** build 期间填充:在 dist/ 中的最终相对路径 */
  outputPath?: string
  /** build 期间填充:最终公开 URL(可能带 hash)*/
  publicUrl?: string
}

/**
 * Markdown heading 信息。
 */
export interface HeadingEntry {
  /** 1-6 */
  level: number
  /** 原始 heading 文本 */
  text: string
  /** 用 VitePress 同款 slugifier 算出的 anchor ID */
  slug: string
  /** 在源文件中的行号(0 起)*/
  line: number
}

/**
 * 反向链接条目。用于 graph 模块和"反向链接卡片"展示。
 */
export interface BacklinkEntry {
  /** 源文件绝对路径 */
  fromPath: string
  /** 源文件最终 URL */
  fromUrl: string
  /** 链接周围 50 字上下文(供未来卡片展示)*/
  context: string
  /** true = ![[]],false = [[]] */
  isEmbed: boolean
  /** 在源文件中的行号(0 起,若无法确定为 -1)*/
  line: number
}

/**
 * 扫描期间的告警条目。
 */
export interface ScanWarning {
  kind:
    | 'duplicate-basename'
    | 'duplicate-alias'
    | 'invalid-frontmatter'
    | 'unreadable-file'
    | 'symlink-loop'
    | 'unknown'
  message: string
  /** 受影响的绝对路径列表 */
  affected: string[]
}

/**
 * 完整的 Vault 数据库。所有模块通过此对象访问数据。
 */
export interface VaultIndex {
  // ── 基础事实表 ──
  files: Map<string, FileEntry>
  assets: Map<string, AssetEntry>

  // ── 查找索引 ──
  byBasename: Map<string, FileEntry[]>
  byBasenameLower: Map<string, FileEntry[]>
  byAlias: Map<string, FileEntry>
  byRelativePath: Map<string, FileEntry>
  byUrl: Map<string, FileEntry>
  assetsByBasename: Map<string, AssetEntry[]>
  assetsByBasenameLower: Map<string, AssetEntry[]>
  assetsByRelativePath: Map<string, AssetEntry>

  // ── 衍生数据(预留给未来模块)──
  tags: Map<string, FileEntry[]>
  backlinks: Map<string, BacklinkEntry[]>
  /** 文件绝对路径 → headings(冗余,headings 也存在 FileEntry 上,这里方便跨页查 slug)*/
  headings: Map<string, HeadingEntry[]>

  // ── 元信息 ──
  srcDir: string
  base: string
  cleanUrls: boolean
  scannedAt: number
  warnings: ScanWarning[]
}

// ── 用户可见的选项类型 ────────────────────────────────────────────

/**
 * markdown-it 渲染 wikilink 时回调给用户的上下文。
 */
export interface PageLinkAttrsContext {
  originalHref: string
  label: string
  /** 解析到的目标 entry;死链时为 undefined */
  target?: FileEntry
  isDead: boolean
  hasUnmatchedAnchor: boolean
}

/**
 * markdown-it 渲染 image embed 时回调给用户的上下文。
 */
export interface ImageEmbedAttrsContext {
  originalHref: string
  altText: string | undefined
  /** 'NxN' / 'Nx' / 'xN' / 'N' / '' */
  dimensions: string
  embedType: 'image'
}

export type PageLinkAttrs =
  | Record<string, string>
  | ((ctx: PageLinkAttrsContext) => Record<string, string>)

export type ImageEmbedAttrs =
  | Record<string, string>
  | ((ctx: ImageEmbedAttrsContext) => Record<string, string>)

export interface WikilinksModuleOptions {
  /** 处理 raw target(pipe 之前的部分)*/
  postProcessLinkTarget?: (target: string) => string
  /** 处理 label(pipe 之后的部分)*/
  postProcessLinkLabel?: (label: string) => string
  /** 是否允许 label 走 inline markdown 解析。默认 false(安全) */
  allowLinkLabelFormatting?: boolean
  /** 默认 label 来源 */
  linkText?:
    | 'basename'
    | 'fullPath'
    | ((entry: FileEntry, fallback: string) => string)
  /** 额外的 <a> 属性 */
  htmlAttributes?: PageLinkAttrs
}

export interface EmbedsModuleOptions {
  /** 视为图片的扩展名(无点,小写)*/
  imageFileExt?: string[]
  /** 缺省 alt 文本策略 */
  defaultAltText?: boolean | string
  /** 处理 image target */
  postProcessImageTarget?: (imageTarget: string) => string
  /** 处理 alt text */
  postProcessAltText?: (altText: string) => string
  /** image URL 后缀(例如 '?v=1')*/
  uriSuffix?: string
  /** 额外的 <img> 属性 */
  htmlAttributes?: ImageEmbedAttrs
  /** transclusion 最大递归深度,防失控。默认 8 */
  transclusionMaxDepth?: number
}

export interface ScanOptions {
  include?: string[]
  exclude?: string[]
  followSymlinks?: boolean
  respectGitignore?: boolean
  /** 视为 asset 的扩展名 */
  assetExtensions?: string[]
}

export interface AssetsOptions {
  /** v0.1 只支持 'auto';future 可能加 'public-only' / 'vite-import' */
  mode?: 'auto'
  /** 是否保留原 vault 内相对路径而非扁平化 + hash。默认 false */
  preserveAssetPaths?: boolean
  /** build 输出目录(在 base 之后,默认 '_assets/')*/
  outputDir?: string
}

// ── v0.3:sidebar 自动生成的公开选项 ─────────────────────────────

export interface SidebarAutoUserOptions {
  /**
   * 触发策略:
   *   - 'off'           完全不生成
   *   - 'fill-if-empty' 仅当 themeConfig.sidebar 未提供时自动生成(默认)
   *   - 'force'         总是用自动生成覆盖 themeConfig.sidebar
   */
  mode?: 'off' | 'fill-if-empty' | 'force'
  /**
   * 布局:
   *   - 'tree'        (默认)单一全局 array,子目录嵌套成子 group
   *   - 'flat'        所有目录扁平摊到顶层
   *   - 'per-folder'  每个顶层目录独立一份 sidebar,VitePress 按 URL 前缀切换
   */
  layout?: 'tree' | 'flat' | 'per-folder'
  /** 排除路径(相对 srcDir,glob `**` / `*` 支持基本) */
  exclude?: string[]
  /** group 默认是否 collapsed,默认 true */
  collapsed?: boolean
  /** 排序策略 */
  sortBy?: 'order-then-title' | 'title' | 'mtime-desc'
  /** group 标题转换(默认对 dirname 做 humanize) */
  formatGroupTitle?: (dirname: string) => string
  /** item 标题转换(默认 frontmatter.sidebarTitle ?? title ?? H1 ?? basename) */
  formatItemTitle?: (entry: FileEntry) => string
  /** frontmatter 中标记隐藏的 key,默认 'sidebarHidden' */
  hiddenKey?: string
  /** frontmatter 中覆盖标题的 key,默认 'sidebarTitle' */
  titleKey?: string
  /** frontmatter 中排序权重的 key,默认 'order' */
  orderKey?: string
  /**
   * 自动生成 nav tabs(配合 layout: 'per-folder' 实现"切换根目录、独立 sidebar"
   * 体验)。默认 false;仅当 themeConfig.nav 未提供时填,不踩用户。
   */
  autoNav?: boolean
  /** autoNav 第一项的文字,默认 'Home' */
  homeNavText?: string

  /** 自动剥 `01-foo.md` 这种数字前缀(humanize 时),默认 true */
  stripNumericPrefix?: boolean

  /** 顶级 group 字母序覆盖。例:`['Guides','Tour']` 让这两个排最前 */
  groupOrder?: string[]

  /** 嵌套深度上限,根算 0。undefined = 不限,默认不限 */
  maxDepth?: number

  /**
   * sidebar group 标题是否带 link(点 group 名跳到 dirIndex):
   *   - 'all'        所有有 dirIndex 的 group 都可点(默认,兼容)
   *   - 'top-level'  只顶级 group 可点;侧边栏内子组**不跳转**,只展开/折叠
   *   - 'off'        所有 group 都不可点
   *
   * 与 autoFolderIndex 互补:autoFolderIndex 控"是否生成",groupLink 控"是否可点"。
   */
  groupLink?: 'all' | 'top-level' | 'off'

  /** i18n:只扫某子树(`'en'` = 只看 /en/ 下,用于 EN locale 的独立 sidebar) */
  includePrefix?: string

  /** i18n:排除这些 prefix 的子树(root locale 排除掉其它 locale) */
  excludePrefixes?: string[]

  /**
   * 自动生成 sidebar 时,**子目录(group)是否排在普通文件之前**。
   *   - false(默认)  files → virtualGroups → folders
   *   - true           folders → virtualGroups → files(Finder / Obsidian 风格)
   *
   * 仅影响同一层级内"文件 vs 子目录"的相对位置;每段内部排序仍按 sortBy /
   * orderKey / groupOrder。
   */
  foldersFirst?: boolean

  /**
   * 给缺 index.md 的文件夹自动生成"目录页"。三种模式:
   *   - 'off'        不生成
   *   - 'top-level'  仅为顶级目录生成(导航栏入口,默认)
   *   - 'all'        所有非空目录都生成
   *
   * 兼容写法:
   *   - true   = 'top-level'
   *   - false  = 'off'
   *   - object 可细控 exclude/template
   *
   * **默认 'top-level'**:既保证 nav tab/`/dir/` URL 能落地,又不在子目录写文件。
   */
  autoFolderIndex?:
    | 'off' | 'top-level' | 'all'
    | boolean
    | {
        mode?: 'off' | 'top-level' | 'all'
        exclude?: string[]
        stripNumericPrefix?: boolean
      }
}

// ── v0.2:自动视图选项 ────────────────────────────────────────

export interface ViewsOptions {
  enabled?: {
    graph?: boolean
    stats?: boolean
    tags?: boolean
  }
  /**
   * 视图文件所在的子目录(相对 srcDir),默认 `_perspectives_`。
   * 设成空串 `''` 把视图文件直接放在 srcDir 根(URL 更短但容易和用户笔记冲突)。
   *
   * 最终文件路径:`<srcDir>/<urlPrefix>/<name>.md`
   * 最终 URL:`<base>/<urlPrefix>/<name>`(prefix 为空时退化为 `<base>/<name>`)
   */
  urlPrefix?: string
  /** 视图文件名(默认 'graph' / 'stats' / 'tags';用 urlPrefix 隔离命名空间)*/
  names?: {
    graph?: string
    stats?: string
    tags?: string
  }
  /**
   * 视图条目注入位置(v0.3 新):
   *   - 'sidebar'(默认,兼容老版)→ 每个 sidebar 末尾追加 Perspectives 组
   *   - 'nav'                   → themeConfig.nav 末尾追加 Perspectives 下拉,
   *                                sidebar 不再被污染(per-folder 用户推荐)
   *   - 'both'                  → 两边都加
   *   - 'off'                   → 都不加(用户自己手动配)
   */
  injectInto?: 'sidebar' | 'nav' | 'both' | 'off'
  /** @deprecated 老字段,等价 injectInto: 'sidebar' | 'off'。仅 injectInto 未设时生效 */
  sidebar?: 'auto' | false
  /** sidebar/nav 中显示的文字 */
  sidebarText?: {
    group?: string
    graph?: string
    stats?: string
    tags?: string
  }
  /** VaultGraph 节点数超过此值时降级为占位提示 */
  graphMaxNodes?: number
  /** vault-data.json 的输出文件名(相对 srcDir/public/)。默认 'vault-data.json' */
  dataFileName?: string
  /** 是否启用正文 #tag 解析(默认 true)。关掉则 tags 只来自 frontmatter */
  parseInlineTags?: boolean
}

/**
 * 顶层选项。
 */
export interface AllYouNeedOptions {
  // ── 全局 ──
  srcDir?: string
  base?: string
  cleanUrls?: boolean
  caseSensitive?: boolean
  deadLink?: 'silent' | 'warn' | 'error'

  // ── 解析策略 ──
  onConflict?: 'shortest' | 'first' | 'error'
  onAliasConflict?: 'first' | 'error'

  // ── 模块选项 ──
  scan?: ScanOptions
  assets?: AssetsOptions
  wikilinks?: WikilinksModuleOptions
  embeds?: EmbedsModuleOptions
  views?: ViewsOptions
  /** v0.3:sidebar 自动生成。详见 SidebarAutoOptions */
  sidebarAuto?: SidebarAutoUserOptions

  // ── 模块开关 ──
  modules?: {
    wikilinks?: boolean
    embeds?: boolean
    /** v0.2:自动生成的 VaultGraph/Stats/Tags 视图,默认开 */
    views?: boolean
    /** v0.3:Obsidian callouts(`> [!type] ...`),默认开 */
    callouts?: boolean
    /** v0.3:Obsidian 高亮 `==text==` → `<mark>`,默认开 */
    highlight?: boolean
    /** v0.3:Obsidian 注释 `%%...%%` 整段隐藏,默认开 */
    comments?: boolean
    /** v0.3:Pandoc 风格 footnotes `[^id]` + `[^id]: text`,默认开 */
    footnotes?: boolean
    /** v0.3:Obsidian block-ref marker `^block-id`(纯渲染层 anchor),默认开 */
    blockRefs?: boolean
    // future: dataview
  }

  /**
   * 自定义 slugifier。默认 @mdit-vue/shared 的 slugify。
   * 必须和 VitePress 的 markdown.anchor.slugify 一致,否则锚点匹配失败。
   */
  slugify?: (text: string) => string
}

/**
 * 已归一化的内部配置(所有字段都有值)。
 */
export interface ResolvedOptions {
  srcDir: string
  base: string
  cleanUrls: boolean
  caseSensitive: boolean
  deadLink: 'silent' | 'warn' | 'error'
  onConflict: 'shortest' | 'first' | 'error'
  onAliasConflict: 'first' | 'error'
  scan: Required<ScanOptions>
  assets: Required<AssetsOptions>
  wikilinks: Required<Omit<WikilinksModuleOptions, 'htmlAttributes'>> & {
    htmlAttributes: PageLinkAttrs
  }
  embeds: Required<Omit<EmbedsModuleOptions, 'htmlAttributes'>> & {
    htmlAttributes: ImageEmbedAttrs
  }
  views: Required<{
    enabled: { graph: boolean; stats: boolean; tags: boolean }
    urlPrefix: string
    names: { graph: string; stats: string; tags: string }
    injectInto: 'sidebar' | 'nav' | 'both' | 'off'
    sidebar: 'auto' | false   // 老字段,仅 injectInto 未显式传时被使用
    sidebarText: { group: string; graph: string; stats: string; tags: string }
    graphMaxNodes: number
    dataFileName: string
    parseInlineTags: boolean
  }>
  modules: {
    wikilinks: boolean
    embeds: boolean
    views: boolean
    callouts: boolean
    highlight: boolean
    comments: boolean
    footnotes: boolean
    blockRefs: boolean
  }
  /** v0.3:sidebar 自动生成原始选项(具体 resolve 由 sidebar-auto 模块内部完成,
   * 这里只透传给 wrapper)*/
  sidebarAuto: SidebarAutoUserOptions
  slugify: (text: string) => string
}

// ── markdown-it env 注入的形状 ────────────────────────────────

/**
 * markdown-it state.env 上 vitepress-allyouneed 的命名空间。
 * VitePress 自己也用 env 传 page 数据,我们用独立 key 不冲突。
 */
export interface AllYouNeedEnv {
  index: VaultIndex
  options: ResolvedOptions
  /** 当前正在渲染的页面绝对路径(若可知)*/
  currentPath?: string
  /** transclusion 调用栈,用于循环检测 */
  transclusionStack?: string[]
  /** 当前 transclusion 深度 */
  transclusionDepth?: number
  /** 引用过的 asset basename → AssetEntry,build 期间汇总 */
  referencedAssets?: Set<AssetEntry>
}

// ── 解析结果 ────────────────────────────────────────────────────

export interface ResolveResult {
  url: string
  /** 默认 label(用户未提供 alias 时使用)*/
  defaultLabel: string
  isDead: boolean
  hasUnmatchedAnchor: boolean
  target?: FileEntry
  /** 'page' / 'image' / 'transclusion' */
  kind: 'page' | 'image' | 'transclusion'
  /** 仅 image/transclusion 时填充 */
  asset?: AssetEntry
}
