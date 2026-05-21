/**
 * v0.3.10 — sidebar-auto 模块内部共享工具。
 *
 * 整合之前在 generate.ts / parse-sidebar-md.ts / generate-folder-index.ts 里
 * 重复实现的 humanize / compareEntries / titleForFile,**单一来源**避免漂移。
 */

import type { FileEntry } from '../types.js'

/**
 * 从 separators 字符串构造 `/^\d+[<chars>]+/` —— 友好版 stripNumericPrefix。
 * 默认 `'-_\\s'` → `/^\d+[-_\s]+/`。
 */
export function buildStripPatternFromSeparators(separators: string): RegExp {
  return new RegExp(`^\\d+[${separators}]+`)
}

/**
 * 默认 humanize:剥前缀数字 → 替换 `-`/`_` 为空格 → Title Case。
 *
 * 例: `01-my_dir` → `My Dir`(strip=true)
 *     `1.2.3-formula` → `1.2.3 Formula`(默认 pattern 不吃 `.`,版本号保留)
 *
 * pattern 默认 `/^\d+[-_\s]+/`。
 */
export function humanize(
  name: string,
  stripNumeric = true,
  pattern: RegExp = /^\d+[-_\s]+/,
): string {
  let s = name
  if (stripNumeric) s = s.replace(pattern, '')
  return s
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase()) || name
}

/**
 * 共享 titleForFile:
 *   frontmatter.sidebarTitle(用户最优先指定 sidebar 名)
 *   → frontmatter.title(VitePress 页标题)
 *   → 第一个 H1
 *   → humanize(basename)
 */
export function titleForFile(
  entry: FileEntry,
  stripNumeric = true,
  stripPattern: RegExp = /^\d+[-_\s]+/,
  hiddenKey = 'sidebarHidden',   // 未用,但留接口对称
  titleKey = 'sidebarTitle',
): string {
  const fm = entry.frontmatter as Record<string, unknown>
  const sidebarTitle = fm[titleKey]
  if (typeof sidebarTitle === 'string' && sidebarTitle.trim()) {
    return sidebarTitle.trim()
  }
  const title = fm.title
  if (typeof title === 'string' && title.trim()) {
    return title.trim()
  }
  const firstH1 = entry.headings.find((h) => h.level === 1)
  if (firstH1) return firstH1.text
  return humanize(entry.basename, stripNumeric, stripPattern)
  // hidden / 防 unused
  void hiddenKey
}

/** 读 frontmatter[orderKey] 当 sort weight,缺失视为 +∞ */
export function readOrderField(entry: FileEntry, orderKey: string): number {
  const v = entry.frontmatter[orderKey]
  if (typeof v === 'number' && Number.isFinite(v)) return v
  return Number.POSITIVE_INFINITY
}

/**
 * 共享 compareEntries:按 sortBy / orderKey 排两个 FileEntry。
 */
export function compareEntries(
  a: FileEntry,
  b: FileEntry,
  sortBy: 'order-then-title' | 'title' | 'mtime-desc',
  orderKey = 'order',
  stripNumeric = true,
  stripPattern: RegExp = /^\d+[-_\s]+/,
  titleKey = 'sidebarTitle',
): number {
  if (sortBy === 'mtime-desc') return b.mtime - a.mtime
  const ta = titleForFile(a, stripNumeric, stripPattern, 'sidebarHidden', titleKey)
  const tb = titleForFile(b, stripNumeric, stripPattern, 'sidebarHidden', titleKey)
  if (sortBy === 'title') return ta.localeCompare(tb)
  // 'order-then-title'
  const oa = readOrderField(a, orderKey)
  const ob = readOrderField(b, orderKey)
  if (oa !== ob) return oa - ob
  return ta.localeCompare(tb)
}
