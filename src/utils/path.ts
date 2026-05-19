/**
 * 跨平台 POSIX 路径工具。
 *
 * 设计原则:
 * - 内部所有路径都用 POSIX 风格(正斜杠);进出 OS 边界才转换。
 * - 我们的索引 key 永远是 POSIX,不依赖运行平台。
 */

import nodePath from 'node:path'

/** 把任意路径转成 POSIX 风格(替换 \\ 为 /)*/
export function toPosix(p: string): string {
  return p.replace(/\\/g, '/')
}

/** 计算相对路径,POSIX 风格 */
export function relative(from: string, to: string): string {
  return toPosix(nodePath.relative(from, to))
}

/** POSIX join */
export function posixJoin(...parts: string[]): string {
  return parts
    .filter((p) => p && p.length > 0)
    .map((p, i) => {
      let s = toPosix(p)
      if (i > 0) s = s.replace(/^\/+/, '')
      if (i < parts.length - 1) s = s.replace(/\/+$/, '')
      return s
    })
    .join('/')
}

/** 去掉尾部 .md / .markdown(若有);其它扩展名保留 */
export function stripMarkdownExt(target: string): string {
  return target.replace(/\.(md|markdown)$/i, '')
}

/** 取 POSIX 风格 basename,可选去扩展 */
export function basename(p: string, stripExt = false): string {
  const idx = p.lastIndexOf('/')
  const file = idx === -1 ? p : p.slice(idx + 1)
  if (!stripExt) return file
  const dot = file.lastIndexOf('.')
  return dot <= 0 ? file : file.slice(0, dot)
}

/** 取扩展名(不含点,小写);无扩展返回 '' */
export function extname(p: string): string {
  const file = basename(p)
  const dot = file.lastIndexOf('.')
  if (dot <= 0) return ''
  return file.slice(dot + 1).toLowerCase()
}

/** 把 path 用 / 拆开,过滤空段 */
export function splitPath(p: string): string[] {
  return toPosix(p).split('/').filter(Boolean)
}

/** 路径深度(段数),用于 onConflict: 'shortest' */
export function pathDepth(relPath: string): number {
  return splitPath(relPath).length
}

/** 把绝对路径正规化为 POSIX */
export function normalizeAbs(p: string): string {
  return toPosix(nodePath.resolve(p))
}
