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
  // 1) frontmatter.sidebar 优先
  const fmSidebar = (entry.frontmatter as { sidebar?: unknown }).sidebar
  if (Array.isArray(fmSidebar)) {
    return normalizeItems(fmSidebar as SidebarItem[])
  }

  // 2) markdown list 解析
  const items = parseList(entry.content, entry, index, options)
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
}

const LINE_RE = /^(\s*)-\s+(.*)$/
const WIKILINK_RE = /^\[\[([^\]\n|#]+)(?:#[^\]\n|]*)?(?:\|([^\]\n]+))?\]\]/
const MD_LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/

function parseList(
  src: string,
  entry: FileEntry,
  index: VaultIndex,
  options: ResolvedOptions,
): SidebarItem[] {
  const lines = src.split(/\r?\n/)
  const parsed: ParsedLine[] = []
  let inFence = false
  for (const raw of lines) {
    if (/^```|^~~~/.test(raw.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue
    const m = LINE_RE.exec(raw)
    if (!m) continue
    const indent = m[1]!.replace(/\t/g, '  ').length
    const body = m[2]!.trim()
    parsed.push(parseLineBody(indent, body, entry, index, options))
  }
  return buildTree(parsed)
}

function parseLineBody(
  indent: number,
  body: string,
  entry: FileEntry,
  index: VaultIndex,
  options: ResolvedOptions,
): ParsedLine {
  // [[wikilink|text]] / [[wikilink]]
  const wl = WIKILINK_RE.exec(body)
  if (wl) {
    const target = wl[1]!.trim()
    const customText = wl[2]?.trim()
    const resolved = resolveTarget(target, index, options, entry)
    return {
      indent,
      text: customText ?? defaultTextForTarget(target, resolved),
      link: resolved?.url ?? null,
    }
  }
  // [text](link)
  const ml = MD_LINK_RE.exec(body)
  if (ml) {
    return { indent, text: ml[1]!.trim(), link: ml[2]!.trim() }
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
  return { indent, text, link: null, collapsed }
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
  const target = stripMarkdownExt(toPosix(raw))
  if (!target) return undefined
  // 路径(相对当前 _sidebar.md 所在目录,或绝对)
  if (target.includes('/')) {
    // 相对路径试一次
    const ctxDir = contextEntry.relativePath.split('/').slice(0, -1).join('/')
    const candidates = [
      target,
      target + '.md',
      ctxDir ? `${ctxDir}/${target}` : '',
      ctxDir ? `${ctxDir}/${target}.md` : '',
    ].filter(Boolean)
    for (const c of candidates) {
      const found = index.byRelativePath.get(c)
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

/** 把扁平的 ParsedLine[](带 indent)折成 SidebarItem 树 */
function buildTree(lines: ParsedLine[]): SidebarItem[] {
  if (lines.length === 0) return []
  // 把所有 indent 归一化到 level(0、1、2 ...)
  const indents = [...new Set(lines.map((l) => l.indent))].sort((a, b) => a - b)
  const indentToLevel = new Map<number, number>()
  indents.forEach((i, idx) => indentToLevel.set(i, idx))

  const root: SidebarItem[] = []
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
    parent.items.push(item)
    // 这个 item 可能成为后续行的 parent → 给它一个 items 数组
    item.items = []
    stack.push({ level, items: item.items })
  }
  // 清掉空的 items 数组(纯叶子)
  pruneEmptyItems(root)
  // 顶层根据"items 非空但 collapsed 未设"补默认 collapsed:true
  return root
}

function pruneEmptyItems(arr: SidebarItem[]): void {
  for (const it of arr) {
    if (it.items) {
      if (it.items.length === 0) delete it.items
      else pruneEmptyItems(it.items)
    }
  }
}
