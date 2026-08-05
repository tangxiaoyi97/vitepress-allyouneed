/**
 * v0.3 — 解析用户手写的 `_sidebar.md` 文件,作为该目录的 sidebar override。
 *
 * 两种写法都支持(混用也行,frontmatter.sidebar 优先):
 *
 * 1) frontmatter.sidebar 数组(VitePress 原生 sidebar shape)
 *    ```yaml
 *    ---
 *    sidebar:
 *      - text: Overview
 *        link: /guide/overview
 *      - text: Docs
 *        collapsed: false
 *        items:
 *          - text: Install
 *            link: /guide/docs/install
 *    ---
 *    ```
 *
 * 2) markdown 列表(更 Obsidian 友好,支持嵌套)
 *    ```markdown
 *    - [[overview|Overview]]
 *    - Docs
 *      - [[docs/install|Install]]
 *      - [[docs/configure|Configure]]
 *    - Advanced
 *      - [[advanced/custom-theme|Custom theme]]
 *    ```
 *    - 每行 `-` 起,2 空格缩进表示子级(也支持 tab)
 *    - 含 `[[wikilink|text]]` → SidebarItem { text, link }
 *    - 含 `[text](link)` → 同
 *    - 纯文字 → group title(无 link,可有 items)
 */

import type { FileEntry, VaultIndex, ResolvedOptions } from '../types.js'
import type { SidebarItem } from './types.js'
import { stripMarkdownExt, toPosix } from '../../utils/path.js'
import { splitWikilinkInner } from '../../utils/wikilink.js'
import { buildStripPatternFromSeparators } from './generate.js'

/** 检查一个 FileEntry 是不是 _sidebar.md(大小写不敏感) */
export function isSidebarOverrideFile(entry: FileEntry): boolean {
  return entry.basename.toLowerCase() === '_sidebar'
}

/**
 * 解析 _sidebar.md → SidebarItem[]。
 * 失败返回 null(调用方降级到自动生成)。
 */
export function parseSidebarOverride(
  entry: FileEntry,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] | null {
  // v0.3.9:_sidebar.md frontmatter 可写 sidebarAuto: { ... } 覆盖该文件的展开行为
  const fmAuto = (entry.frontmatter as { sidebarAuto?: unknown }).sidebarAuto
  let effectiveOptions = options
  if (fmAuto && typeof fmAuto === 'object' && !Array.isArray(fmAuto)) {
    effectiveOptions = {
      ...options,
      sidebarAuto: {
        ...(options.sidebarAuto ?? {}),
        ...(fmAuto as Record<string, unknown>),
      } as ResolvedOptions['sidebarAuto'],
    }
  }

  // 1) frontmatter.sidebar 优先
  const fmSidebar = (entry.frontmatter as { sidebar?: unknown }).sidebar
  if (Array.isArray(fmSidebar)) {
    return normalizeItems(fmSidebar as SidebarItem[])
  }

  // 2) markdown list 解析(用 effectiveOptions 让 frontmatter override 生效)
  const items = parseList(entry.content, entry, index, effectiveOptions)
  if (items.length === 0) return null
  return items
}

/** 把用户写的 SidebarItem(可能字段不全)归一化 */
function normalizeItems(items: SidebarItem[]): SidebarItem[] {
  return items.map((it) => {
    const out: SidebarItem = {}
    if (typeof it.text === 'string') out.text = it.text
    if (typeof it.link === 'string') out.link = it.link
    if (typeof it.base === 'string') out.base = it.base
    if (typeof it.collapsed === 'boolean') out.collapsed = it.collapsed
    if (Array.isArray(it.items)) out.items = normalizeItems(it.items)
    return out
  })
}

// ── markdown list 解析 ──────────────────────────────────────────

interface ParsedLine {
  indent: number
  text: string | null
  link: string | null
  collapsed?: boolean
  /**
   * v0.3.9:这条 item 的子项要由这些文件夹的内容自动展开。
   * 例:`- Mechanics {Themen/Thema_08, Themen/Thema_11}` → expandFolders=['Themen/Thema_08', 'Themen/Thema_11']
   *
   * 展开规则:
   *   - 每个文件夹的**直接子文件**按顺序 flat 列在 group 下
   *   - 多个文件夹的直接子文件**串接**(folder1 的全部 → folder2 的全部)
   *   - 每个文件夹的**子文件夹**作为 nested group 跟在直接文件后(递归)
   *   - **手动**写在该 item 下一缩进的 items 会**附加在展开内容之后**
   */
  expandFolders?: string[]
}

const LINE_RE = /^(\s*)-\s+(.*)$/
// v0.3.4:简化为只匹配整段 [[...]],内部 pipe / heading 拆分交给 splitWikilinkInner
// (老正则 [^\]\n|#] 把 \| 中的 \ 留在 target 里,导致死链)
const WIKILINK_RE = /^\[\[([^\]\n]+)\]\]/
const MD_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/
// v0.3.9:`{folder1, folder2}` / `{folder1、folder2}` 占位符。支持英文逗号和中文逗号
const FOLDER_PLACEHOLDER_RE = /\s*\{([^{}]+)\}\s*$/

function parseList(
  src: string,
  entry: FileEntry,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] {
  const lines = src.split(/\r?\n/)
  const parsed: ParsedLine[] = []
  // v0.3.4:fence 状态记 marker 类型,避免 ``` 内的 ~~~ 误关闭(反之同理)
  let fenceMarker: '`' | '~' | null = null
  for (const raw of lines) {
    const trimmed = raw.trim()
    const fenceMatch = /^(`{3,}|~{3,})/.exec(trimmed)
    if (fenceMatch) {
      const ch = fenceMatch[1]![0] as '`' | '~'
      if (fenceMarker === null) fenceMarker = ch
      else if (fenceMarker === ch) fenceMarker = null
      // 不同 marker 一律忽略(不切换状态)
      continue
    }
    if (fenceMarker !== null) continue
    const m = LINE_RE.exec(raw)
    if (!m) continue
    const indent = m[1]!.replace(/\t/g, '  ').length
    const body = m[2]!.trim()
    parsed.push(parseLineBody(indent, body, entry, index, options))
  }
  return buildTree(parsed, index, options, entry)
}

function parseLineBody(
  indent: number,
  body: string,
  entry: FileEntry,
  index: VaultIndex,
  options: ResolvedOptions,
): ParsedLine {
  // v0.3.9:**先**提取末尾 `{folder, folder, ...}` 占位符;剩余 body 走老逻辑
  let expandFolders: string[] | undefined
  const fph = FOLDER_PLACEHOLDER_RE.exec(body)
  if (fph) {
    expandFolders = fph[1]!
      .split(/[,、，]/)
      .map((s) => s.trim())
      .filter(Boolean)
    body = body.replace(FOLDER_PLACEHOLDER_RE, '').trim()
  }
  // [[wikilink|text]] / [[wikilink]] / [[wikilink\|text]](Obsidian 表格转义)
  const wl = WIKILINK_RE.exec(body)
  if (wl) {
    const inner = wl[1]!
    const parts = splitWikilinkInner(inner)
    let rawTarget = parts[0]!
    const customText = parts[1] ?? undefined
    // 拆 #heading(只关心 target,不打 anchor)
    const hashIdx = rawTarget.indexOf('#')
    if (hashIdx >= 0) rawTarget = rawTarget.slice(0, hashIdx)
    const resolved = resolveTarget(rawTarget, index, options, entry)
    return {
      indent,
      text: customText ?? defaultTextForTarget(rawTarget, resolved),
      link: resolved?.url ?? null,
      expandFolders,
    }
  }
  // [text](link)
  const ml = MD_LINK_RE.exec(body)
  if (ml) {
    return { indent, text: ml[1]!.trim(), link: ml[2]!.trim(), expandFolders }
  }
  // 纯文字 group title:支持 `Title -` 结尾控制 collapsed
  let text = body
  let collapsed: boolean | undefined
  if (text.endsWith(' +')) {
    collapsed = false
    text = text.slice(0, -2).trim()
  } else if (text.endsWith(' -')) {
    collapsed = true
    text = text.slice(0, -2).trim()
  }
  return { indent, text, link: null, collapsed, expandFolders }
}

function defaultTextForTarget(target: string, entry: FileEntry | undefined): string {
  if (entry) {
    const fm = entry.frontmatter as { sidebarTitle?: string; title?: string }
    if (typeof fm.sidebarTitle === 'string' && fm.sidebarTitle.trim()) {
      return fm.sidebarTitle.trim()
    }
    if (typeof fm.title === 'string' && fm.title.trim()) {
      return fm.title.trim()
    }
    return entry.basename
  }
  return target
}

function resolveTarget(
  raw: string,
  index: VaultIndex,
  options: ResolvedOptions,
  contextEntry: FileEntry,
): FileEntry | undefined {
  const target = stripMarkdownExt(toPosix(raw)).replace(/^\/+/, '')
  if (!target) return undefined

  // `_sidebar.md` links follow normal relative-link expectations: a short
  // `[[index]]` inside `zh/showcase/_sidebar.md` must choose
  // `zh/showcase/index.md`, not the first global `index.md`. Resolve the
  // context directory before aliases/basenames, including `.markdown` and a
  // folder's `index` entry. Explicit vault-root paths are tried afterwards.
  const ctxDir = contextEntry.relativePath.split('/').slice(0, -1).join('/')
  const contextualBase = ctxDir ? `${ctxDir}/${target}` : target
  const candidateBases = raw.trim().startsWith('/')
    ? [target]
    : [...new Set([contextualBase, target])]
  for (const base of candidateBases) {
    for (const candidate of [
      base,
      `${base}.md`,
      `${base}.markdown`,
      `${base}/index.md`,
      `${base}/index.markdown`,
    ]) {
      const found = findByRelativePath(candidate, index, options.caseSensitive)
      if (found) return found
    }
  }

  // alias
  const aliasKey = options.caseSensitive ? target : target.toLowerCase()
  const aliased = index.byAlias.get(aliasKey)
  if (aliased) return aliased
  // basename
  const map = options.caseSensitive ? index.byBasename : index.byBasenameLower
  const key = options.caseSensitive ? target : target.toLowerCase()
  const arr = map.get(key)
  if (arr && arr.length > 0) return arr[0]
  return undefined
}

function findByRelativePath(
  path: string,
  index: VaultIndex,
  caseSensitive: boolean,
): FileEntry | undefined {
  const exact = index.byRelativePath.get(path)
  if (exact || caseSensitive) return exact
  const lower = path.toLowerCase()
  for (const [candidate, entry] of index.byRelativePath) {
    if (candidate.toLowerCase() === lower) return entry
  }
  return undefined
}

/** 把扁平的 ParsedLine[](带 indent)折成 SidebarItem 树 */
function buildTree(
  lines: ParsedLine[],
  index: VaultIndex,
  options: ResolvedOptions,
  contextEntry: FileEntry,
): SidebarItem[] {
  if (lines.length === 0) return []
  // 把所有 indent 归一化到 level(0、1、2 ...)
  const indents = [...new Set(lines.map((l) => l.indent))].sort((a, b) => a - b)
  const indentToLevel = new Map<number, number>()
  indents.forEach((i, idx) => indentToLevel.set(i, idx))

  const root: SidebarItem[] = []
  // v0.3.9:item → 该 item 要展开的文件夹列表;buildTree 完后统一处理
  const expandMeta = new Map<SidebarItem, string[]>()
  // 栈:[{ level, items }]
  const stack: Array<{ level: number; items: SidebarItem[] }> = [
    { level: -1, items: root },
  ]
  for (const l of lines) {
    const level = indentToLevel.get(l.indent) ?? 0
    while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
      stack.pop()
    }
    const parent = stack[stack.length - 1]!
    const item: SidebarItem = {}
    if (l.text) item.text = l.text
    if (l.link) item.link = l.link
    if (l.collapsed !== undefined) item.collapsed = l.collapsed
    if (l.expandFolders && l.expandFolders.length > 0) {
      expandMeta.set(item, l.expandFolders)
    }
    parent.items.push(item)
    // 这个 item 可能成为后续行的 parent → 给它一个 items 数组
    item.items = []
    stack.push({ level, items: item.items })
  }
  // v0.3.9:展开 {folder} 占位符。手动子 items 已附加在 item.items 中,
  // 展开后把生成内容**前置**到手动 items 之前(手动写的当 override / supplement)。
  expandPlaceholders(root, expandMeta, index, options, contextEntry)
  // 清掉空的 items 数组(纯叶子)
  pruneEmptyItems(root)
  return root
}

/**
 * v0.3.9:遍历 sidebar tree,把带 expandFolders 的 item 的 items 替换 / 扩展。
 * G4:contextEntry 传入,占位符路径无 `/` 前缀时相对 _sidebar.md 所在目录解析。
 * H4:**空 text + placeholder** = inline 展开(splice 替换自身,不当 group 包),让
 *     materialize 模板 `- {.}` 在顶层直接展开为内容。
 */
function expandPlaceholders(
  arr: SidebarItem[],
  expandMeta: Map<SidebarItem, string[]>,
  index: VaultIndex,
  options: ResolvedOptions,
  contextEntry: FileEntry,
): void {
  // 倒序遍历,边走边 splice 不破坏 index
  for (let i = arr.length - 1; i >= 0; i--) {
    const it = arr[i]!
    const folders = expandMeta.get(it)
    if (folders) {
      const expanded = generateExpandedItems(folders, index, options, contextEntry)
      const manual = it.items && it.items.length > 0 ? [...it.items] : []
      const hasText = typeof it.text === 'string' && it.text.trim() !== ''
      if (!hasText) {
        // INLINE 展开:把 [自身] 换成 [...expanded, ...manual]
        arr.splice(i, 1, ...expanded, ...manual)
        // spliced 进去的是已展开内容,无 expandFolders,不再递归
        continue
      }
      it.items = [...expanded, ...manual]
    }
    const cur = arr[i]
    if (cur && cur.items && cur.items.length > 0) {
      expandPlaceholders(cur.items, expandMeta, index, options, contextEntry)
    }
  }
}

/**
 * v0.3.9:把一组 folder paths 展开成 SidebarItem[]。
 *   - 路径无 `/` 前缀 = 相对 contextEntry(即 _sidebar.md)所在目录
 *   - 路径有 `/` 前缀 = srcDir 绝对
 *   - 每个 folder 的直接子文件 → flat 在前(按 sortBy 排序)
 *   - 每个 folder 的直接子目录 → 后(递归)
 *   - 多个 folder:顺序串接(folder1 全部 → folder2 全部)
 *   - 自动 skip _sidebar.md / dirIndex(index/README/同名)/ frontmatter sidebarHidden:true
 */
function generateExpandedItems(
  folders: string[],
  index: VaultIndex,
  options: ResolvedOptions,
  contextEntry: FileEntry,
): SidebarItem[] {
  const out: SidebarItem[] = []
  // 当前 _sidebar.md 所在目录(vault-相对)
  const ctxDir = contextEntry.relativePath
    .split('/')
    .slice(0, -1)
    .join('/')
  for (const folder of folders) {
    const trimmed = folder.trim()
    if (!trimmed) continue
    let resolved: string
    if (trimmed.startsWith('/')) {
      // 绝对 — 相对 srcDir
      resolved = trimmed.replace(/^\/+|\/+$/g, '')
    } else if (trimmed === '.' || trimmed === './') {
      // v0.3.9:`.` = 当前 _sidebar.md 所在目录(materialize 默认模板 `- {.}` 用)
      resolved = ctxDir
    } else if (trimmed.startsWith('./')) {
      const norm = trimmed.slice(2).replace(/\/+$/, '')
      resolved = ctxDir ? `${ctxDir}/${norm}` : norm
    } else {
      // 相对 _sidebar.md 所在目录
      const norm = trimmed.replace(/\/+$/, '')
      resolved = ctxDir ? `${ctxDir}/${norm}` : norm
    }
    // resolved 为空字符串 = srcDir 根,**允许**(根 _sidebar.md `- {.}` 展开整个 vault)
    out.push(...generateFolderItems(resolved, index, options))
  }
  return out
}

/** 递归生成一个 folder 的 items(直接文件在前,子目录 nested group 在后)
 *
 * v0.3.9:
 *   - 排序用 sidebarAuto.sortBy 等同 generate.ts compareEntries 的简化版
 *   - 过滤 frontmatter[hiddenKey](默认 sidebarHidden)= true
 *   - 用 sidebarAuto.stripNumericPrefixPattern 生成子文件夹标题
 *   - 套 foldersFirst
 */
function generateFolderItems(
  folderRel: string,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] {
  const sidebarAuto = options.sidebarAuto ?? {}
  const hiddenKey = sidebarAuto.hiddenKey ?? 'sidebarHidden'
  const orderKey = sidebarAuto.orderKey ?? 'order'
  const sortBy = sidebarAuto.sortBy ?? 'order-then-title'
  // v0.3.9:Pattern 优先;Separators 次之;再否则默认
  const stripPattern =
    sidebarAuto.stripNumericPrefixPattern ??
    (sidebarAuto.stripNumericPrefixSeparators
      ? buildStripPatternFromSeparators(sidebarAuto.stripNumericPrefixSeparators)
      : /^\d+[-_\s]+/)
  const stripNumeric = sidebarAuto.stripNumericPrefix !== false
  // folderRel === '' 表示 srcDir 根(root _sidebar.md `- {.}` 展开整个 vault)
  const prefix = folderRel ? folderRel + '/' : ''
  const directFiles: FileEntry[] = []
  const subDirNames = new Set<string>()
  for (const f of index.files.values()) {
    if (prefix && !f.relativePath.startsWith(prefix)) continue
    const rest = prefix ? f.relativePath.slice(prefix.length) : f.relativePath
    if (!rest.includes('/')) {
      directFiles.push(f)
    } else {
      subDirNames.add(rest.split('/')[0]!)
    }
  }
  // skip _sidebar.md + sidebarHidden + dirIndex
  const folderName = folderRel.split('/').pop() ?? ''
  const isDirIndex = (f: FileEntry): boolean => {
    const bn = f.basename.toLowerCase()
    if (bn === 'index' || bn === 'readme') return true
    if (folderName && bn === folderName.toLowerCase()) return true
    return false
  }
  const visibleFiles = directFiles
    .filter((f) => !isSidebarOverrideFile(f))
    .filter((f) => f.frontmatter[hiddenKey] !== true)
    .filter((f) => !isDirIndex(f))

  // 排序(简化版 compareEntries)
  visibleFiles.sort((a, b) => compareForExpansion(a, b, sortBy, orderKey, stripNumeric, stripPattern))

  const fileItems: SidebarItem[] = visibleFiles.map((f) => ({
    text: titleForFile(f, stripNumeric, stripPattern),
    link: f.url,
  }))

  const subItems: SidebarItem[] = []
  for (const name of [...subDirNames].sort()) {
    // 子目录 nested:**不再递归 sortBy**(避免相互影响),直接复用本函数,
    // 排序在这层算好;递归层自己排自己的
    // prefix 为空(根)时 → name;否则 prefix(已带 /)+ name
    const nested = generateFolderItems(prefix ? prefix + name : name, index, options)
    if (nested.length === 0) continue
    subItems.push({
      text: humanizeForExpansion(name, stripNumeric, stripPattern),
      items: nested,
      collapsed: sidebarAuto.collapsed !== false,
    })
  }
  const foldersFirst = sidebarAuto.foldersFirst === true
  return foldersFirst ? [...subItems, ...fileItems] : [...fileItems, ...subItems]
}

function compareForExpansion(
  a: FileEntry,
  b: FileEntry,
  sortBy: 'order-then-title' | 'title' | 'mtime-desc',
  orderKey: string,
  stripNumeric: boolean,
  stripPattern: RegExp,
): number {
  if (sortBy === 'mtime-desc') return b.mtime - a.mtime
  const ta = titleForFile(a, stripNumeric, stripPattern)
  const tb = titleForFile(b, stripNumeric, stripPattern)
  if (sortBy === 'title') return ta.localeCompare(tb)
  // order-then-title
  const oa = readOrderField(a, orderKey)
  const ob = readOrderField(b, orderKey)
  if (oa !== ob) return oa - ob
  return ta.localeCompare(tb)
}
function readOrderField(f: FileEntry, key: string): number {
  const v = f.frontmatter[key]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return Number.POSITIVE_INFINITY
}

function titleForFile(
  f: FileEntry,
  stripNumeric: boolean,
  stripPattern: RegExp,
): string {
  const fm = f.frontmatter as { sidebarTitle?: string; title?: string }
  if (typeof fm.sidebarTitle === 'string' && fm.sidebarTitle.trim()) {
    return fm.sidebarTitle.trim()
  }
  if (typeof fm.title === 'string' && fm.title.trim()) {
    return fm.title.trim()
  }
  const firstH1 = f.headings.find((h) => h.level === 1)
  if (firstH1) return firstH1.text
  return humanizeForExpansion(f.basename, stripNumeric, stripPattern)
}

/** humanize for expansion:`my-dir` / `01-foo` → `My Dir` / `Foo`(可配 stripPattern) */
function humanizeForExpansion(
  name: string,
  stripNumeric: boolean,
  stripPattern: RegExp,
): string {
  let s = name
  if (stripNumeric) s = s.replace(stripPattern, '')
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || name
}

function pruneEmptyItems(arr: SidebarItem[]): void {
  for (const it of arr) {
    if (it.items) {
      if (it.items.length === 0) delete it.items
      else pruneEmptyItems(it.items)
    }
  }
}
