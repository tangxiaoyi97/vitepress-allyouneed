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
  // v0.3.9:Pattern 优先;否则用 Separators 构造;再否则用默认
  const stripPattern =
    user.stripNumericPrefixPattern ??
    (user.stripNumericPrefixSeparators
      ? buildStripPatternFromSeparators(user.stripNumericPrefixSeparators)
      : /^\d+[-_\s]+/)
  return {
    mode: user.mode ?? 'fill-if-empty',
    exclude: user.exclude ?? [],
    collapsed: user.collapsed ?? true,
    sortBy: user.sortBy ?? 'order-then-title',
    // **闭包**绑定 stripNumericPrefix + pattern
    formatGroupTitle:
      user.formatGroupTitle ?? ((d: string) => humanize(d, strip, stripPattern)),
    formatItemTitle:
      user.formatItemTitle ?? ((e: FileEntry) => defaultItemTitle(e, strip, stripPattern)),
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
    foldersFirst: user.foldersFirst ?? false,
    // v0.3.10:folderLinkOrder 优先;否则从老 folderLinkFallback 翻译
    folderLinkOrder:
      user.folderLinkOrder ??
      (user.folderLinkFallback === 'none'
        ? []
        : ['same-name', 'index', 'readme', 'first-file']),
    stripNumericPrefixPattern: stripPattern,
  }
}

/** item 标题计算(接收 stripNumericPrefix + pattern,在 resolveSidebarAutoOptions 阶段绑定) */
function defaultItemTitle(entry: FileEntry, strip: boolean, pattern: RegExp): string {
  const fm = entry.frontmatter
  const sidebarTitle = typeof fm.sidebarTitle === 'string' ? fm.sidebarTitle : ''
  if (sidebarTitle.trim()) return sidebarTitle.trim()
  const title = typeof fm.title === 'string' ? fm.title : ''
  if (title.trim()) return title.trim()
  const firstH1 = entry.headings.find((h) => h.level === 1)
  if (firstH1) return firstH1.text
  return humanize(entry.basename, strip, pattern)
}

/**
 * v0.3.9:从 separators 字符串构造 `/^\d+[<chars>]+/`。
 * 默认 `'-_\s'` → /^\d+[-_\s]+/。
 */
export function buildStripPatternFromSeparators(separators: string): RegExp {
  // 用户给的是"字符类内部"的字符串,直接拼进 [ ... ];已转义的 \s \. 等照样工作
  return new RegExp(`^\\d+[${separators}]+`)
}

/** 共用 humanize:剥可选前缀数字 → 替换 -/_ → Title Case。
 *
 *  v0.3.9:pattern 参数化(默认 `/^\d+[-_\s]+/`)。
 *  v0.3.4:删掉 . 分隔符。
 */
function humanize(name: string, strip: boolean, pattern: RegExp): string {
  let s = name
  if (strip) s = s.replace(pattern, '')
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase())
}

// ── tree 数据结构 ───────────────────────────────────────────────

/** v0.3.10:dirIndex 候选种类(对应 folderLinkOrder token,除 'first-file') */
type DirIndexKind = 'same-name' | 'index' | 'readme'

interface DirNode {
  /** 'folder1/sub' 形式;根节点为 '' */
  path: string
  /** 这层目录下的"普通"文件(包含 index/README/same-name —— 它们留在 files 里;
   *  渲染时只过滤掉**当前 folderLinkOrder 选中的那一个**作为 group link) */
  files: FileEntry[]
  /** 子目录(map key = 段名,如 'sub') */
  children: Map<string, DirNode>
  /**
   * v0.3.10:dirIndex 候选,key = 类型,value = 该候选文件。
   * 由 pickDirIndexCandidates 填充。**不再独立 pick 一个 dirIndex** —— 选哪个
   * 由 resolveFolderLink(opts.folderLinkOrder) 决定。
   */
  dirIndexCandidates: Map<DirIndexKind, FileEntry>
  /** 这层目录的 _sidebar.md (手动 override 文件) */
  sidebarOverride?: FileEntry
}

function newNode(path: string): DirNode {
  return { path, files: [], children: new Map(), dirIndexCandidates: new Map() }
}

/**
 * v0.3.10:group title 仍可以从 dirIndex 候选的 frontmatter 读 sidebarTitle
 * 等。挑一个稳定的"标题源候选"(优先级同 folderLinkOrder 自然顺序:same-name
 * → index → README;无候选返回 undefined)。
 */
function pickTitleSourceCandidate(node: DirNode): FileEntry | undefined {
  for (const kind of ['same-name', 'index', 'readme'] as const) {
    const c = node.dirIndexCandidates.get(kind)
    if (c) return c
  }
  return undefined
}

/**
 * v0.4.0:按 folderLinkOrder 解析"这个文件夹的 link 目标"。返回 winning
 * entry(和 kind),供 renderer 加 group.link。找不到返回 null。
 *
 * **`respectEmptyOptOut` 参数**(默认 true,用于 sidebar group):
 *   - true:遇到**空 frontmatter-only** candidate → **整个 resolve 失败返 null**。
 *     这是用户显式 opt-out 信号(0.3.5 语义)—— "我有 dirIndex 但只想要
 *     frontmatter,不想要 link"。即使 order 后面有 'first-file' 也不兜底。
 *   - false:遇到空 candidate → 跳过该 kind,继续找下一个(用于 nav tab、
 *     wikilink 等"必须可点"的场景)。
 */
function resolveFolderLink(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
  respectEmptyOptOut = true,
): { entry: FileEntry; kind: DirIndexKind | 'first-file' } | null {
  for (const kind of opts.folderLinkOrder) {
    if (kind === 'first-file') {
      // 排除 dirIndex 候选(避免和 candidate-kind 兜底重叠 / 产生奇怪结果)
      const dirIndexCands = new Set<FileEntry>(node.dirIndexCandidates.values())
      const sorted = [...node.files]
        .filter((f) => !dirIndexCands.has(f))
        .sort((a, b) => compareEntries(a, b, opts))
      if (sorted.length > 0) return { entry: sorted[0]!, kind: 'first-file' }
    } else {
      const cand = node.dirIndexCandidates.get(kind)
      if (!cand) continue
      if (cand.content.trim() === '') {
        // 空 candidate:opt-out(sidebar)or 跳过继续找(nav/wikilink)
        if (respectEmptyOptOut) return null
        continue
      }
      return { entry: cand, kind }
    }
  }
  return null
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
  let result: SidebarItem[] | Record<string, SidebarItem[]>
  if (layout === 'per-folder') {
    result = toPerFolderSidebar(root, opts, options, index)
  } else if (layout === 'flat') {
    // v0.4.0:flat 已 @deprecated,v0.5 将删除
    console.warn(
      "vitepress-allyouneed: sidebarAuto.layout='flat' is deprecated and will be removed in v0.5. " +
        "Use 'tree' (nested groups) or 'per-folder' (one sidebar per top-level folder).",
    )
    result = toFlatSidebar(root, opts)
  } else {
    result = toTreeSidebar(root, opts, index, options)
  }
  // 4. **关键**:strip 掉 link 里的 base prefix。
  //    VitePress sidebar/nav 配置约定:link 不带 base,VitePress 渲染时自己 prepend。
  //    我们 entry.url 已经含 base(为了让 wikilink <a href> 直接可用),
  //    sidebar 出口必须 strip,否则 build 后 (base !== '/') 会双重 prefix → 404。
  stripBaseFromConfig(result, options.base)
  return result
}

/** strip base prefix from all link fields, recursively */
function stripBaseFromConfig(
  cfg: SidebarItem[] | Record<string, SidebarItem[]>,
  base: string,
): void {
  if (Array.isArray(cfg)) {
    stripBaseFromItems(cfg, base)
  } else {
    for (const k of Object.keys(cfg)) {
      stripBaseFromItems(cfg[k]!, base)
    }
  }
}
function stripBaseFromItems(items: SidebarItem[], base: string): void {
  const b = base.endsWith('/') ? base : base + '/'
  for (const it of items) {
    if (it.link && b !== '/' && it.link.startsWith(b)) {
      it.link = '/' + it.link.slice(b.length)
    }
    if (it.items) stripBaseFromItems(it.items, base)
  }
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
  pickDirIndexCandidates(root)
  return root
}

/**
 * v0.3.10:在 tree 建好后,识别每个 DirNode 的 dirIndex **候选**(三种 kind)。
 *   - 'same-name'  与文件夹同名的 .md(e.g. `tour/tour.md`)
 *   - 'index'      `index.md`
 *   - 'readme'     `README.md`
 *
 * **不再独立选出"the one dirIndex"** —— 选哪个由 resolveFolderLink 在渲染时
 * 按 folderLinkOrder 决定。所有候选都先留在 node.files 里;renderer 调
 * resolveFolderLink 拿到 winning entry 后,把那一个**从 items 列表里 exclude**。
 *
 * 大小写不敏感。
 */
function pickDirIndexCandidates(node: DirNode): void {
  const folderName = node.path.split('/').pop() ?? ''
  const folderLc = folderName.toLowerCase()
  for (const f of node.files) {
    const bnLc = f.basename.toLowerCase()
    if (folderName && bnLc === folderLc) {
      if (!node.dirIndexCandidates.has('same-name')) {
        node.dirIndexCandidates.set('same-name', f)
      }
    } else if (bnLc === 'index') {
      if (!node.dirIndexCandidates.has('index')) {
        node.dirIndexCandidates.set('index', f)
      }
    } else if (bnLc === 'readme') {
      if (!node.dirIndexCandidates.has('readme')) {
        node.dirIndexCandidates.set('readme', f)
      }
    }
  }
  for (const child of node.children.values()) pickDirIndexCandidates(child)
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

  // v0.4.0:dirIndex 候选(same-name/index/readme)永远不进 items(它们是 group link
  // 来源)。**first-file winner 不排除** —— 保持 v0.3.x 行为(first-file 既是 link
  // 又是 sibling item;轻微重复但符合预期)。
  const dirIndexCandidatesSet = new Set<FileEntry>(node.dirIndexCandidates.values())

  // 抽出 sidebarGroup 标记的文件(虚拟 group)
  const virtualGroups = new Map<string, FileEntry[]>()
  const normalFiles: FileEntry[] = []
  for (const f of node.files) {
    if (dirIndexCandidatesSet.has(f)) continue
    const g = readVirtualGroup(f)
    if (g) {
      const arr = virtualGroups.get(g) ?? []
      arr.push(f)
      virtualGroups.set(g, arr)
    } else {
      normalFiles.push(f)
    }
  }

  // 三段 collect:files / virtualGroups / childDirs

  // 1. 普通文件
  normalFiles.sort((a, b) => compareEntries(a, b, opts))
  const fileItems: SidebarItem[] = normalFiles.map((f) => ({
    text: opts.formatItemTitle(f),
    link: f.url,
  }))

  // 2. 虚拟 groups(按名字字母序)
  const virtualKeys = [...virtualGroups.keys()].sort()
  const virtualItems: SidebarItem[] = []
  for (const name of virtualKeys) {
    const items = virtualGroups.get(name)!.sort((a, b) => compareEntries(a, b, opts))
    virtualItems.push({
      text: name,
      collapsed: opts.collapsed,
      items: items.map((f) => ({ text: opts.formatItemTitle(f), link: f.url })),
    })
  }

  // 3. 子目录:按 groupOrder(仅顶级生效),再按各目录 dirIndex 的排序锚点
  const folderItems: SidebarItem[] = []
  const childKeys = sortChildKeys(node, opts, isRoot)
  for (const key of childKeys) {
    const child = node.children.get(key)!
    const childItems = renderNode(child, opts, depth + 1, false, index, options)
    const childWinner = resolveFolderLink(child, opts)
    if (childItems.length === 0 && !childWinner) continue

    // group title:若有 dirIndex 候选,用 candidate 的 frontmatter 优先(老语义保留)
    const titleSource = pickTitleSourceCandidate(child)
    const group: SidebarItem = {
      text: computeGroupText(child.path, titleSource, opts),
      collapsed: resolveGroupCollapsed(titleSource, opts),
      items: childItems,
    }
    if (shouldLinkGroup(opts, isRoot) && childWinner) {
      group.link = childWinner.entry.url
    }
    folderItems.push(group)
  }

  // 按 foldersFirst 决定三段拼接顺序。
  // virtualGroups 始终跟着 folders(它们语义上也是"分组"),只是 files 和
  // folders 的相对位置可配。
  if (opts.foldersFirst) {
    return [...folderItems, ...virtualItems, ...fileItems]
  }
  return [...fileItems, ...virtualItems, ...folderItems]
}

/**
 * v0.4.0:递归找 DirNode 子树的"第一个可访问 page"的 url。
 * 用于 nav / per-folder root / 其它"必须可点"的场景 —— **不**尊重 empty opt-out。
 */
function findFirstPageUrl(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
): string | null {
  const winner = resolveFolderLink(node, opts, /* respectEmptyOptOut */ false)
  if (winner) return winner.entry.url
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

/**
 * 子目录排序:
 *   1. 顶级显式 groupOrder 始终优先;
 *   2. 其余目录把 dirIndex 当作排序锚点,沿用 sortBy/orderKey;
 *   3. 没有 dirIndex 时按目录显示标题自然排序。
 *
 * 这样目录本身无需改名为 `01-foo`:给 `foo/index.md` 写 `order: 1`
 * 即可稳定控制该 group 在所有 layout 中的位置。
 */
function sortChildKeys(
  node: DirNode,
  opts: ResolvedSidebarAutoOptions,
  isTopLevel: boolean,
): string[] {
  const keys = [...node.children.keys()]
  const collateOpts: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' }

  const compareFolderKeys = (a: string, b: string): number => {
    const aNode = node.children.get(a)!
    const bNode = node.children.get(b)!
    const aAnchor = pickTitleSourceCandidate(aNode)
    const bAnchor = pickTitleSourceCandidate(bNode)

    if (opts.sortBy === 'mtime-desc') {
      const am = aAnchor?.mtime ?? Number.NEGATIVE_INFINITY
      const bm = bAnchor?.mtime ?? Number.NEGATIVE_INFINITY
      if (am !== bm) return bm - am
    } else if (opts.sortBy === 'order-then-title') {
      const ao = aAnchor ? readOrder(aAnchor, opts.orderKey) : Number.POSITIVE_INFINITY
      const bo = bAnchor ? readOrder(bAnchor, opts.orderKey) : Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
    }

    const at = computeGroupText(aNode.path, aAnchor, opts)
    const bt = computeGroupText(bNode.path, bAnchor, opts)
    return at.localeCompare(bt, undefined, collateOpts)
  }

  if (!isTopLevel || opts.groupOrder.length === 0) {
    return keys.sort(compareFolderKeys)
  }

  // 顶级:把 groupOrder 命中的项按指定顺序;其余使用 dirIndex 排序锚点
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
      pickTitleSourceCandidate(node.children.get(k)!),
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
      pickTitleSourceCandidate(node.children.get(a)!),
      opts,
    )
    const tb = computeGroupText(
      node.children.get(b)!.path,
      pickTitleSourceCandidate(node.children.get(b)!),
      opts,
    )
    const oa = orderMap.has(a) ? orderMap.get(a)! : orderMap.get(ta)!
    const ob = orderMap.has(b) ? orderMap.get(b)! : orderMap.get(tb)!
    return oa - ob
  })
  rest.sort(compareFolderKeys)
  return [...indexed, ...rest]
}

// ── flat 模式(老版兼容):所有目录摊到顶层 ───────────────────

function toFlatSidebar(root: DirNode, opts: ResolvedSidebarAutoOptions): SidebarItem[] {
  // v0.3.10:flat 已 @deprecated,保留实现以兼容旧用户
  const out: SidebarItem[] = []
  // 根 — 排除 dirIndex 候选 + first-file winner
  const rootWinner = resolveFolderLink(root, opts)
  const rootCandidates = new Set<FileEntry>(root.dirIndexCandidates.values())
  if (rootWinner) rootCandidates.add(rootWinner.entry)
  const rootFiles = [...root.files]
    .filter((f) => !rootCandidates.has(f))
    .sort((a, b) => compareEntries(a, b, opts))
  for (const f of rootFiles) out.push({ text: opts.formatItemTitle(f), link: f.url })

  const allDirs: DirNode[] = []
  walkDirs(root, allDirs)
  for (const d of allDirs) {
    const winner = resolveFolderLink(d, opts)
    const candidates = new Set<FileEntry>(d.dirIndexCandidates.values())
    if (winner) candidates.add(winner.entry)
    const files = [...d.files]
      .filter((f) => !candidates.has(f))
      .sort((a, b) => compareEntries(a, b, opts))
    const items = files.map((f) => ({ text: opts.formatItemTitle(f), link: f.url }))
    if (items.length === 0 && !winner) continue
    const titleSource = pickTitleSourceCandidate(d)
    const group: SidebarItem = {
      text: computeGroupText(d.path, titleSource, opts),
      collapsed: resolveGroupCollapsed(titleSource, opts),
      items,
    }
    if (shouldLinkGroup(opts, true) && winner) {
      group.link = winner.entry.url
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
  // ⚠ Record 的 **key**(VitePress 用来匹配 URL 前缀)和**每个 item 的 link**
  //   都用**不带 base 的形式**。VitePress 内部用 currentPath(已 strip base)
  //   做匹配,且会自动给 link prepend base。带 base 会双重 prefix。

  const out: Record<string, SidebarItem[]> = {}

  const rootItems: SidebarItem[] = []
  // v0.3.10:根 files 也排除 dirIndex 候选 + winner
  const rootWinner = resolveFolderLink(root, opts)
  const rootCands = new Set<FileEntry>(root.dirIndexCandidates.values())
  if (rootWinner) rootCands.add(rootWinner.entry)
  const sortedRootFiles = [...root.files]
    .filter((f) => !rootCands.has(f))
    .sort((a, b) => compareEntries(a, b, opts))
  for (const f of sortedRootFiles) {
    rootItems.push({ text: opts.formatItemTitle(f), link: f.url })
  }
  const topKeys = sortChildKeys(root, opts, /* isTopLevel */ true)
  for (const key of topKeys) {
    const child = root.children.get(key)!
    // root items 是 nav 风格的"跳转入口",empty opt-out 不适用
    const childWinner = resolveFolderLink(child, opts, /* respectEmptyOptOut */ false)
    if (child.files.length === 0 && child.children.size === 0 && !childWinner) {
      continue
    }
    const titleSource = pickTitleSourceCandidate(child)
    const labelText = computeGroupText(child.path, titleSource, opts)
    if (shouldLinkGroup(opts, /* isTopLevel */ true)) {
      const firstUrl = childWinner ? childWinner.entry.url : findFirstPageUrl(child, opts)
      if (firstUrl) {
        rootItems.push({ text: labelText, link: firstUrl })
      } else {
        rootItems.push({ text: labelText })
      }
    } else {
      rootItems.push({ text: labelText })
    }
  }
  if (rootItems.length > 0) out['/'] = rootItems   // 根 key 用 '/'

  for (const key of topKeys) {
    const child = root.children.get(key)!
    const items = renderNode(child, opts, /* depth */ 1, /* isRoot */ false, index, options)
    // per-folder 顶部"self link" 是 nav-tab 风格,不尊重 empty opt-out
    const childWinner = resolveFolderLink(child, opts, /* respectEmptyOptOut */ false)
    if (items.length === 0 && !childWinner) continue

    const sidebar: SidebarItem[] = []
    if (shouldLinkGroup(opts, /* isTopLevel */ true) && childWinner) {
      const titleSource = pickTitleSourceCandidate(child)
      sidebar.push({
        text: computeGroupText(child.path, titleSource, opts),
        link: childWinner.entry.url,
      })
    }
    sidebar.push(...items)

    out[`/${key}/`] = sidebar    // key 不带 base
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
  // nav link 不带 base(VitePress 渲染时自动 prepend);activeMatch 是正则,**也不带** base
  const out: NavItem[] = [{ text: opts.homeNavText, link: '/' }]

  const topKeys = sortChildKeys(root, opts, /* isTopLevel */ true)
  for (const key of topKeys) {
    const child = root.children.get(key)!
    // nav 是"必须可点",不尊重 empty opt-out
    const winner = resolveFolderLink(child, opts, /* respectEmptyOptOut */ false)
    if (child.files.length === 0 && child.children.size === 0 && !winner) {
      continue
    }
    const titleSource = pickTitleSourceCandidate(child)
    const text = computeGroupText(child.path, titleSource, opts)
    // v0.4.0:winner 直接用;否则递归找子树第一个 page。**还**找不到 → skip tab。
    let link: string
    if (winner) {
      link = stripBase(winner.entry.url, base)
    } else {
      const first = findFirstPageUrl(child, opts)
      if (!first) continue // skip whole tab
      link = first
    }
    const escapedPrefix = `/${key}/`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out.push({ text, link, activeMatch: '^' + escapedPrefix })
  }
  return out
}

function stripBase(url: string, base: string): string {
  const b = base.endsWith('/') ? base : base + '/'
  if (b === '/' || !url.startsWith(b)) return url
  return '/' + url.slice(b.length)
}

// ── helpers ───────────────────────────────────────────────────────

function compareEntries(
  a: FileEntry,
  b: FileEntry,
  opts: ResolvedSidebarAutoOptions,
): number {
  // v0.4.1:**natural numeric sort**(`numeric: true`)—— `1. Masse` 在 `10. Energie`
  // 之前,而不是字典序的 `1, 10, 11, 2, 3...`。
  const collateOpts: Intl.CollatorOptions = { numeric: true, sensitivity: 'base' }
  if (opts.sortBy === 'title') {
    return opts.formatItemTitle(a).localeCompare(opts.formatItemTitle(b), undefined, collateOpts)
  }
  if (opts.sortBy === 'mtime-desc') {
    return b.mtime - a.mtime
  }
  const oa = readOrder(a, opts.orderKey)
  const ob = readOrder(b, opts.orderKey)
  if (oa !== ob) return oa - ob
  return opts.formatItemTitle(a).localeCompare(opts.formatItemTitle(b), undefined, collateOpts)
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
