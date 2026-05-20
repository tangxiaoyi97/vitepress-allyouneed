/**
 * v0.3 — 从 VaultIndex 自动生成 VitePress sidebar。
 *
 * 支持:
 *   - 任意嵌套深度(子目录递归变成 collapsible 子 group)
 *   - 三种 mode:
 *       'tree'        (默认)单一全局 array,顶层每个目录嵌套子项
 *       'flat'        顶层目录扁平化(老 v0.3 行为,保留兼容)
 *       'per-folder'  Record<string, items[]>,VitePress 按 URL 前缀切换 sidebar
 *   - frontmatter 控制:
 *       sidebarTitle  覆盖标题
 *       sidebarHidden 整篇隐藏(等价 sidebar: false)
 *       order         排序权重(数字小在前)
 *       sidebarCollapsed  作用在目录的 index.md 上,控制该 group 默认展开/折叠
 *       sidebarGroup  把文件挂到"虚拟 group"(跨目录归类,常用于 docs / tour 等)
 *   - 隐藏:
 *       _-前缀目录(_drafts / _perspectives_ 等自动跳)
 *       options.views.urlPrefix 目录(插件视图)
 *       index.md / README.md 不作为 sibling 文件出现(已用作 group 入口)
 */

import type { FileEntry, VaultIndex, ResolvedOptions } from '../types.js'
import type {
  SidebarItem,
  ResolvedSidebarAutoOptions,
  SidebarAutoOptions,
  NavItem,
} from './types.js'
import {
  isSidebarOverrideFile,
  parseSidebarOverride,
} from './parse-sidebar-md.js'

export type { NavItem }

// ── option resolver ──────────────────────────────────────────────

export function resolveSidebarAutoOptions(
  user: SidebarAutoOptions = {},
): ResolvedSidebarAutoOptions {
  const strip = user.stripNumericPrefix ?? true
  return {
    mode: user.mode ?? 'fill-if-empty',
    exclude: user.exclude ?? [],
    collapsed: user.collapsed ?? true,
    sortBy: user.sortBy ?? 'order-then-title',
    // **闭包**绑定 stripNumericPrefix,让 user 设 false 时 default formatter 也尊重
    formatGroupTitle:
      user.formatGroupTitle ?? ((d: string) => humanize(d, strip)),
    formatItemTitle:
      user.formatItemTitle ?? ((e: FileEntry) => defaultItemTitle(e, strip)),
    hiddenKey: user.hiddenKey ?? 'sidebarHidden',
    titleKey: user.titleKey ?? 'sidebarTitle',
    orderKey: user.orderKey ?? 'order',
    autoNav: user.autoNav ?? false,
    homeNavText: user.homeNavText ?? 'Home',
    stripNumericPrefix: strip,
    groupOrder: user.groupOrder ?? [],
    maxDepth: user.maxDepth,
    groupLink: user.groupLink ?? 'all',
    includePrefix: user.includePrefix,
    excludePrefixes: user.excludePrefixes ?? [],
  }
}

/** item 标题计算(接收 stripNumericPrefix,在 resolveSidebarAutoOptions 阶段绑定) */
function defaultItemTitle(entry: FileEntry, strip: boolean): string {
  const fm = entry.frontmatter
  const sidebarTitle = typeof fm.sidebarTitle === 'string' ? fm.sidebarTitle : ''
  if (sidebarTitle.trim()) return sidebarTitle.trim()
  const title = typeof fm.title === 'string' ? fm.title : ''
  if (title.trim()) return title.trim()
  const firstH1 = entry.headings.find((h) => h.level === 1)
  if (firstH1) return firstH1.text
  return humanize(entry.basename, strip)
}

/** 共用 humanize:剥可选前缀数字 → 替换 -/_ → Title Case */
function humanize(name: string, strip: boolean): string {
  let s = name
  if (strip) s = s.replace(/^\d+[-_.\s]+/, '')
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// ── tree 数据结构 ───────────────────────────────────────────────

interface DirNode {
  /** 'folder1/sub' 形式;根节点为 '' */
  path: string
  /** 这层目录下的"普通"文件(不含 index/README/_sidebar) */
  files: FileEntry[]
  /** 子目录(map key = 段名,如 'sub') */
  children: Map<string, DirNode>
  /** 这层目录的 dirIndex 文件(同名 > index > README,大小写不敏感) */
  dirIndex?: FileEntry
  /** dirIndex 文件**正文为空**(只有 frontmatter)→ 不当 link,仅取 frontmatter */
  dirIndexEmpty?: boolean
  /** 这层目录的 _sidebar.md (手动 override 文件) */
  sidebarOverride?: FileEntry
}

function newNode(path: string): DirNode {
  return { path, files: [], children: new Map() }
}

// ── 主入口 ──────────────────────────────────────────────────────

export function generateSidebar(
  index: VaultIndex,
  options: ResolvedOptions,
  autoOptions: SidebarAutoOptions = {},
): SidebarItem[] | Record<string, SidebarItem[]> {
  const opts = resolveSidebarAutoOptions(autoOptions)
  const viewsPrefix = options.views.urlPrefix
    ? options.views.urlPrefix.replace(/^\/+|\/+$/g, '')
    : ''

  // 1. 过滤可见文件
  const visible: FileEntry[] = []
  for (const entry of index.files.values()) {
    if (shouldExclude(entry, opts, viewsPrefix)) continue
    visible.push(entry)
  }

  // 2. 建 tree
  const root = buildTree(visible)

  // 3. 根据 mode 输出
  const layout = autoOptions.layout ?? 'tree'
  if (layout === 'per-folder') {
    return toPerFolderSidebar(root, opts, options, index)
  }
  if (layout === 'flat') {
    return toFlatSidebar(root, opts)
  }
  return toTreeSidebar(root, opts, index, options)
}

// ── 建 tree ─────────────────────────────────────────────────────

function buildTree(files: FileEntry[]): DirNode {
  const root = newNode('')
  for (const f of files) {
    const segs = f.relativePath.split('/')
    const dirSegs = segs.slice(0, -1)
    let node = root
    for (const seg of dirSegs) {
      let child = node.children.get(seg)
      if (!child) {
        child = newNode(node.path ? node.path + '/' + seg : seg)
        node.children.set(seg, child)
      }
      node = child
    }
    // _sidebar.md 单拎出来当 override(不出现在 sidebar item)
    if (isSidebarOverrideFile(f)) {
      node.sidebarOverride = f
      continue
    }
    // 先全部塞进 files,稍后 pickDirIndexes 挑出最优先级的当 dirIndex
    node.files.push(f)
  }
  pickDirIndexes(root)
  return root
}

/**
 * 在 tree 建好后,为每个非根 DirNode 选出"文件夹索引页"。
 *
 * 优先级(大小写不敏感):
 *   1. 与文件夹同名的 .md —— 例 `tour/tour.md` 给 tour/
 *   2. index.md
 *   3. README.md
 *
 * 选中的从 files 移到 node.dirIndex,作为 group 的 link 来源。
 * 用户文件不会被覆盖(这里只是"找出来当 link",不写文件)。
 *
 * 额外:若该 dirIndex 文件**只有 frontmatter、无正文内容**,记 dirIndexEmpty,
 * 渲染时不当 link(但 frontmatter 的 sidebarTitle / sidebarCollapsed 仍读)。
 */
function pickDirIndexes(node: DirNode): void {
  const folderName = node.path.split('/').pop() ?? ''
  if (folderName) {
    const folderLc = folderName.toLowerCase()
    let best: { entry: FileEntry; priority: number } | null = null
    for (const f of node.files) {
      const bnLc = f.basename.toLowerCase()
      let p = 0
      if (bnLc === folderLc) p = 1
      else if (bnLc === 'index') p = 2
      else if (bnLc === 'readme') p = 3
      if (p > 0 && (best === null || p < best.priority)) {
        best = { entry: f, priority: p }
      }
    }
    if (best) {
      node.dirIndex = best.entry
      node.dirIndexEmpty = best.entry.content.trim() === ''
      node.files = node.files.filter((f) => f !== best!.entry)
    }
  }
  for (const child of node.children.values()) pickDirIndexes(child)
}

// ── tree 模式:嵌套 group ───────────────────────────────────────

function toTreeSidebar(
  root: DirNode,
  opts: ResolvedSidebarAutoOptions,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] {
  return renderNode(root, opts, /* depth */ 0, /* isRoot */ true, index, options)
}

/**
 * 渲染一个 DirNode 的内容(files + 子 groups)。
 * isRoot=true 时返回顶层 array;否则用于子 group 的 items。
 *
 * "虚拟 group" sidebarGroup:文件 frontmatter 里 sidebarGroup: 'X' 的会被
 * 抽出来挂到一个名为 X 的虚拟 group 下,跨目录归类。
 */
function renderNode(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
  depth: number,
  isRoot: boolean,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] {
  // 嵌套深度限制
  if (opts.maxDepth !== undefined && depth > opts.maxDepth) return []

  // _sidebar.md 手动 override:解析成功就直接用,跳过自动生成
  if (node.sidebarOverride) {
    const override = parseSidebarOverride(node.sidebarOverride, index, options)
    if (override) return override
  }

  const out: SidebarItem[] = []

  // 抽出 sidebarGroup 标记的文件(虚拟 group)
  const virtualGroups = new Map<string, FileEntry[]>()
  const normalFiles: FileEntry[] = []
  for (const f of node.files) {
    const g = readVirtualGroup(f)
    if (g) {
      const arr = virtualGroups.get(g) ?? []
      arr.push(f)
      virtualGroups.set(g, arr)
    } else {
      normalFiles.push(f)
    }
  }

  // 排序普通文件
  normalFiles.sort((a, b) => compareEntries(a, b, opts))
  for (const f of normalFiles) {
    out.push({ text: opts.formatItemTitle(f), link: f.url })
  }

  // 虚拟 groups(按名字字母序)
  const virtualKeys = [...virtualGroups.keys()].sort()
  for (const name of virtualKeys) {
    const items = virtualGroups.get(name)!.sort((a, b) => compareEntries(a, b, opts))
    out.push({
      text: name,
      collapsed: opts.collapsed,
      items: items.map((f) => ({ text: opts.formatItemTitle(f), link: f.url })),
    })
  }

  // 子目录:按 groupOrder(仅顶级生效)然后字母序
  const childKeys = sortChildKeys(node, opts, isRoot)
  for (const key of childKeys) {
    const child = node.children.get(key)!
    const childItems = renderNode(child, opts, depth + 1, false, index, options)
    if (childItems.length === 0 && !child.dirIndex) continue

    const group: SidebarItem = {
      text: computeGroupText(child.path, child.dirIndex, opts),
      collapsed: resolveGroupCollapsed(child.dirIndex, opts),
      items: childItems,
    }
    if (
      child.dirIndex &&
      !child.dirIndexEmpty &&
      shouldLinkGroup(opts, isRoot)
    ) {
      group.link = child.dirIndex.url
    }
    out.push(group)
  }

  return out
}

/**
 * 递归找 DirNode 子树的"第一个可访问 page"的 url,作为 fallback link。
 * 顺序:本节点 dirIndex(若非空) → 本节点 files 排序后第一个 → 各子目录递归。
 */
function findFirstPageUrl(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
): string | null {
  if (node.dirIndex && !node.dirIndexEmpty) return node.dirIndex.url
  if (node.files.length > 0) {
    const sorted = [...node.files].sort((a, b) => compareEntries(a, b, opts))
    return sorted[0]!.url
  }
  const childKeys = [...node.children.keys()].sort()
  for (const k of childKeys) {
    const u = findFirstPageUrl(node.children.get(k)!, opts)
    if (u) return u
  }
  return null
}

/** 根据 groupLink 决定本层 group 是否可点(顶级 isRoot=true) */
function shouldLinkGroup(opts: ResolvedSidebarAutoOptions, isTopLevel: boolean): boolean {
  if (opts.groupLink === 'off') return false
  if (opts.groupLink === 'top-level') return isTopLevel
  return true // 'all'
}

/** 子目录排序:顶级用 groupOrder + 字母序 fallback,非顶级直接字母序 */
function sortChildKeys(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
  isTopLevel: boolean,
): string[] {
  const keys = [...node.children.keys()]
  if (!isTopLevel || opts.groupOrder.length === 0) {
    return keys.sort()
  }
  // 顶级:把 groupOrder 命中的项按指定顺序;其余按字母在后
  const orderMap = new Map<string, number>()
  opts.groupOrder.forEach((name, i) => {
    // groupOrder 名字应该是 group title 或 dirname,匹配 dirname 段
    orderMap.set(name, i)
    orderMap.set(name.toLowerCase(), i)
  })
  const indexed: string[] = []
  const rest: string[] = []
  for (const k of keys) {
    const title = computeGroupText(
      node.children.get(k)!.path,
      node.children.get(k)!.dirIndex,
      opts,
    )
    if (orderMap.has(k) || orderMap.has(title)) {
      indexed.push(k)
    } else {
      rest.push(k)
    }
  }
  indexed.sort((a, b) => {
    const ta = computeGroupText(
      node.children.get(a)!.path,
      node.children.get(a)!.dirIndex,
      opts,
    )
    const tb = computeGroupText(
      node.children.get(b)!.path,
      node.children.get(b)!.dirIndex,
      opts,
    )
    const oa = orderMap.has(a) ? orderMap.get(a)! : orderMap.get(ta)!
    const ob = orderMap.has(b) ? orderMap.get(b)! : orderMap.get(tb)!
    return oa - ob
  })
  rest.sort()
  return [...indexed, ...rest]
}

// ── flat 模式(老版兼容):所有目录摊到顶层 ───────────────────

function toFlatSidebar(root: DirNode, opts: ResolvedSidebarAutoOptions): SidebarItem[] {
  // 遍历整 tree,把每个非根节点都做成顶层 group(items 只含直系文件)
  const out: SidebarItem[] = []
  // 先根
  const rootFiles = [...root.files].sort((a, b) => compareEntries(a, b, opts))
  for (const f of rootFiles) out.push({ text: opts.formatItemTitle(f), link: f.url })

  const allDirs: DirNode[] = []
  walkDirs(root, allDirs)
  for (const d of allDirs) {
    const files = [...d.files].sort((a, b) => compareEntries(a, b, opts))
    const items = files.map((f) => ({ text: opts.formatItemTitle(f), link: f.url }))
    if (items.length === 0 && !d.dirIndex) continue
    const group: SidebarItem = {
      text: computeGroupText(d.path, d.dirIndex, opts),
      collapsed: resolveGroupCollapsed(d.dirIndex, opts),
      items,
    }
    // flat 模式所有 group 都在"顶层" — 用 isTopLevel=true
    if (d.dirIndex && !d.dirIndexEmpty && shouldLinkGroup(opts, true)) {
      group.link = d.dirIndex.url
    }
    out.push(group)
  }
  return out
}

function walkDirs(node: DirNode, out: DirNode[]): void {
  const keys = [...node.children.keys()].sort()
  for (const k of keys) {
    const child = node.children.get(k)!
    out.push(child)
    walkDirs(child, out)
  }
}

// ── per-folder 模式:每个顶层目录一个独立 sidebar ────────────────

function toPerFolderSidebar(
  root: DirNode,
  opts: ResolvedSidebarAutoOptions,
  options: ResolvedOptions,
  index: VaultIndex,
): Record<string, SidebarItem[]> {
  const out: Record<string, SidebarItem[]> = {}
  const base = options.base.endsWith('/') ? options.base : options.base + '/'

  // 根 sidebar:根直接文件 + 每个顶层 dir 的一键入口(扁平链接,不嵌套子项)
  // 这样用户在 / 浏览时,sidebar 像个目录导航,点任一进入对应区域(那时 URL
  // 前缀切换,会换到该区域的完整 sidebar)
  const rootItems: SidebarItem[] = []
  const sortedRootFiles = [...root.files].sort((a, b) => compareEntries(a, b, opts))
  for (const f of sortedRootFiles) {
    rootItems.push({ text: opts.formatItemTitle(f), link: f.url })
  }
  const topKeys = [...root.children.keys()].sort()
  for (const key of topKeys) {
    const child = root.children.get(key)!
    if (child.files.length === 0 && child.children.size === 0 && !child.dirIndex) {
      continue
    }
    // 根 sidebar 的"目录入口" link 选取顺序:
    //   1. dirIndex 存在且非空 → dirIndex.url
    //   2. 否则递归找子树第一个 page 当 fallback(用户没写 index 时也能点)
    //   3. 都没有 → /dir/(VitePress 看 cleanUrls fallback)
    // groupLink !== 'off' 才加 link;'off' 仍然纯文字。
    const labelText = computeGroupText(child.path, child.dirIndex, opts)
    if (shouldLinkGroup(opts, /* isTopLevel */ true)) {
      const firstUrl =
        child.dirIndex && !child.dirIndexEmpty
          ? child.dirIndex.url
          : findFirstPageUrl(child, opts) ?? `${base}${key}/`
      rootItems.push({ text: labelText, link: firstUrl })
    } else {
      rootItems.push({ text: labelText })
    }
  }
  if (rootItems.length > 0) out[base] = rootItems

  // 每个顶层 dir → 独立 entry。
  // **关键修复**:**不**把它包成 single group(VitePress 会渲染成不可折叠的
  // level-0 section header);而是直接展开成 sibling items。这样里面的子组
  // 都正常 level-0,可以正常 toggle。
  // 如果 dirIndex 存在且 groupLink 允许,顶部加一个"返回本区首页"link 项。
  for (const key of topKeys) {
    const child = root.children.get(key)!
    const items = renderNode(child, opts, /* depth */ 1, /* isRoot */ false, index, options)
    if (items.length === 0 && !child.dirIndex) continue

    const sidebar: SidebarItem[] = []
    const canLink =
      child.dirIndex &&
      !child.dirIndexEmpty &&
      shouldLinkGroup(opts, /* isTopLevel */ true)
    if (canLink) {
      sidebar.push({
        text: computeGroupText(child.path, child.dirIndex, opts),
        link: child.dirIndex!.url,
      })
    }
    sidebar.push(...items)

    out[`${base}${key}/`] = sidebar
  }
  return out
}

// ── generateNav:从 vault 顶层目录生成 nav tabs ─────────────────

export function generateNav(
  index: VaultIndex,
  options: ResolvedOptions,
  autoOptions: SidebarAutoOptions = {},
): NavItem[] {
  const opts = resolveSidebarAutoOptions(autoOptions)
  const viewsPrefix = options.views.urlPrefix
    ? options.views.urlPrefix.replace(/^\/+|\/+$/g, '')
    : ''

  const visible: FileEntry[] = []
  for (const entry of index.files.values()) {
    if (shouldExclude(entry, opts, viewsPrefix)) continue
    visible.push(entry)
  }
  const root = buildTree(visible)

  const base = options.base.endsWith('/') ? options.base : options.base + '/'
  const out: NavItem[] = [{ text: opts.homeNavText, link: base }]

  const topKeys = [...root.children.keys()].sort()
  for (const key of topKeys) {
    const child = root.children.get(key)!
    if (child.files.length === 0 && child.children.size === 0 && !child.dirIndex) {
      continue
    }
    const text = computeGroupText(child.path, child.dirIndex, opts)
    const link = child.dirIndex?.url ?? `${base}${key}/`
    // activeMatch:URL 在该子树下都高亮(escape `.` 等正则字符)
    const escapedPrefix = `${base}${key}/`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push({
      text,
      link,
      activeMatch: '^' + escapedPrefix,
    })
  }
  return out
}

// ── helpers ───────────────────────────────────────────────────────

function compareEntries(
  a: FileEntry,
  b: FileEntry,
  opts: ResolvedSidebarAutoOptions,
): number {
  if (opts.sortBy === 'title') {
    return opts.formatItemTitle(a).localeCompare(opts.formatItemTitle(b))
  }
  if (opts.sortBy === 'mtime-desc') {
    return b.mtime - a.mtime
  }
  const oa = readOrder(a, opts.orderKey)
  const ob = readOrder(b, opts.orderKey)
  if (oa !== ob) return oa - ob
  return opts.formatItemTitle(a).localeCompare(opts.formatItemTitle(b))
}

function readOrder(entry: FileEntry, key: string): number {
  const v = entry.frontmatter[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return Number.POSITIVE_INFINITY
}

function readVirtualGroup(entry: FileEntry): string | null {
  const v = entry.frontmatter.sidebarGroup
  if (typeof v === 'string' && v.trim()) return v.trim()
  return null
}

function resolveGroupCollapsed(
  dirIndex: FileEntry | undefined,
  opts: ResolvedSidebarAutoOptions,
): boolean {
  if (dirIndex) {
    const v = dirIndex.frontmatter.sidebarCollapsed
    if (typeof v === 'boolean') return v
  }
  return opts.collapsed
}

function shouldExclude(
  entry: FileEntry,
  opts: ResolvedSidebarAutoOptions,
  viewsPrefix: string,
): boolean {
  if (entry.frontmatter[opts.hiddenKey] === true) return true
  if (viewsPrefix && entry.relativePath.startsWith(viewsPrefix + '/')) return true

  // i18n:includePrefix(只看子树) / excludePrefixes(屏蔽 locale 子树)
  if (opts.includePrefix) {
    const ip = opts.includePrefix.replace(/^\/+|\/+$/g, '')
    if (!entry.relativePath.startsWith(ip + '/') && entry.relativePath !== ip) {
      return true
    }
  }
  for (const ex of opts.excludePrefixes) {
    const xp = ex.replace(/^\/+|\/+$/g, '')
    if (entry.relativePath.startsWith(xp + '/') || entry.relativePath === xp) {
      return true
    }
  }

  // _ 前缀目录
  const segs = entry.relativePath.split('/')
  for (const seg of segs.slice(0, -1)) {
    if (seg.startsWith('_')) return true
  }
  for (const pat of opts.exclude) {
    if (matchSimpleGlob(entry.relativePath, pat)) return true
  }
  return false
}

function matchSimpleGlob(path: string, pat: string): boolean {
  const ESCAPE_RE = /[.+?^${}()|[\]\\]/g
  const escaped = pat.replace(ESCAPE_RE, '\\$&')
  const expanded = escaped
    .replace(/\*\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__/g, '.*')
  return new RegExp('^' + expanded + '$').test(path)
}

// isDirIndex 之前的判断被 pickDirIndexes 取代(支持同名优先)

function computeGroupText(
  dir: string,
  dirIndex: FileEntry | undefined,
  opts: ResolvedSidebarAutoOptions,
): string {
  if (dirIndex) {
    const fmTitle = dirIndex.frontmatter[opts.titleKey]
    if (typeof fmTitle === 'string' && fmTitle.trim()) return fmTitle.trim()
    const title = dirIndex.frontmatter.title
    if (typeof title === 'string' && title.trim()) return title.trim()
    const h1 = dirIndex.headings.find((h) => h.level === 1)
    if (h1) return h1.text
  }
  const last = dir.split('/').pop() ?? dir
  return opts.formatGroupTitle(last)
}
