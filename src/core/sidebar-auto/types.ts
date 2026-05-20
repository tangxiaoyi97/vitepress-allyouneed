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
   *   - 'flat'        所有目录摊到顶层 array(老 v0.3 第一版行为)
   *   - 'per-folder'  Record<string, items[]>,VitePress 按 URL 前缀切换 sidebar
   */
  layout?: 'tree' | 'flat' | 'per-folder'

  /** 排除路径(相对 srcDir,glob 支持基本前缀匹配:`_drafts/**` 等) */
  exclude?: string[]

  /** group 默认是否 collapsed,默认 true */
  collapsed?: boolean

  /** 排序策略 */
  sortBy?: 'order-then-title' | 'title' | 'mtime-desc'

  /** 自定义 group 标题转换(默认对 dirname 做 humanize:把 `-`/`_` 改空格 + Title Case) */
  formatGroupTitle?: (dirname: string) => string

  /** 自定义 item 标题转换(默认 frontmatter.sidebarTitle ?? frontmatter.title ?? H1 ?? basename) */
  formatItemTitle?: (entry: FileEntry) => string

  /** frontmatter 中的 key,标记此文件 sidebar 隐藏。默认 'sidebarHidden' */
  hiddenKey?: string

  /** frontmatter 中的 key,自定义 sidebar 标题。默认 'sidebarTitle' */
  titleKey?: string

  /** frontmatter 中的 key,排序权重(number,小在前)。默认 'order' */
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

  /** 顶级 group 字母序的覆盖。例:`['Tour', 'Guides']` 让这两个排最前(其余字母序在后) */
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

  /** 给缺 index.md 的文件夹自动生成"目录页"。
   *  默认 'top-level'(只为顶级目录生成,保证 nav/`/dir/` URL 能落地)。
   *  详见 SidebarAutoUserOptions 同字段注释。 */
  autoFolderIndex?:
    | 'off' | 'top-level' | 'all'
    | boolean
    | {
        mode?: 'off' | 'top-level' | 'all'
        enabled?: boolean
        exclude?: string[]
        stripNumericPrefix?: boolean
        template?: (ctx: import('./generate-folder-index.js').TemplateContext) => string
      }
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
}
