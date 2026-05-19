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

  // ── 模块开关 ──
  modules?: {
    wikilinks?: boolean
    embeds?: boolean
    // future: callouts, tags, dataview, graph
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
  modules: { wikilinks: boolean; embeds: boolean }
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
