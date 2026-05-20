/**
 * Resolver —— 把 wikilink target 解析成最终 URL。
 *
 * 解析顺序(对应 PLAN §5):
 * 1. trim、剥 .md/.markdown
 * 2. 拆 #heading
 * 3. 含 '/' → 按 byRelativePath 查
 * 4. 不含 '/' → byAlias → byBasename(冲突按 onConflict)
 * 5. heading 匹配 → 加 anchor;否则标记半死链
 */

import type {
  VaultIndex,
  ResolvedOptions,
  ResolveResult,
  FileEntry,
} from './types.js'
import { sortByShortestPath } from './vault/index.js'
import { stripMarkdownExt, toPosix, basename } from '../utils/path.js'

/**
 * 解析一个 wikilink target(已经从 [[]] / ![[]] 中取出的 raw 字符串,不含 pipe 部分)。
 *
 * @param rawTarget 例如 "notes/a" / "a" / "a#heading" / "中文笔记"
 * @param index   vault 索引
 * @param options 已解析配置
 * @param kind    'page' | 'image' | 'transclusion';v0.1 image 走单独路径,这里
 *                只处理 'page' / 'transclusion'
 */
export function resolveWikilink(
  rawTarget: string,
  index: VaultIndex,
  options: ResolvedOptions,
  kind: 'page' | 'transclusion' = 'page',
  /** 写这个 wikilink 的源文件绝对路径(用于相对路径 fallback) */
  currentSourcePath?: string,
): ResolveResult {
  // 1. 归一化:反斜杠 → 正斜杠、剥 markdown 扩展、trim
  let target = toPosix(rawTarget).trim()
  // 2. 拆 #heading
  const hashIdx = target.indexOf('#')
  let headingPart = ''
  if (hashIdx >= 0) {
    headingPart = target.slice(hashIdx + 1).trim()
    target = target.slice(0, hashIdx).trim()
  }
  // 剥 .md / .markdown
  target = stripMarkdownExt(target)

  // 3-4. 查 entry
  const entry = lookupEntry(target, index, options, currentSourcePath)

  if (!entry) {
    return {
      url: buildDeadUrl(rawTarget, options),
      defaultLabel: defaultLabel(target, headingPart, undefined, options),
      isDead: true,
      hasUnmatchedAnchor: false,
      kind,
    }
  }

  // 5. heading 匹配
  let url = entry.url
  let hasUnmatchedAnchor = false
  if (headingPart) {
    const heading = entry.headings.find(
      (h) =>
        h.text === headingPart ||
        h.slug === headingPart ||
        h.slug === options.slugify(headingPart),
    )
    if (heading) {
      url = entry.url + '#' + heading.slug
    } else {
      hasUnmatchedAnchor = true
      url = entry.url + '#' + encodeURIComponent(headingPart)
    }
  }

  return {
    url,
    defaultLabel: defaultLabel(target, headingPart, entry, options),
    isDead: false,
    hasUnmatchedAnchor,
    target: entry,
    kind,
  }
}

/**
 * 查目标 entry:含 '/' 按 byRelativePath,否则 byAlias → byBasename(冲突按策略)。
 */
function lookupEntry(
  target: string,
  index: VaultIndex,
  options: ResolvedOptions,
  currentSourcePath?: string,
): FileEntry | undefined {
  if (!target) return undefined

  // 含 '/':按路径查
  if (target.includes('/')) {
    // 用户写 'notes/a' → 找 'notes/a.md' 或 'notes/a.markdown'
    const variants = [
      target,
      target + '.md',
      target + '.markdown',
      target + '/index.md',
      target + '/index.markdown',
    ]
    for (const v of variants) {
      const e = index.byRelativePath.get(v)
      if (e) return e
    }
    // Fallback:相对当前 source 文件目录(模仿 Obsidian 行为)
    if (currentSourcePath) {
      // currentSourcePath 是绝对路径,先转 vault 相对再拼
      const srcDirAbs = index.srcDir
      const rel = toPosix(currentSourcePath).startsWith(srcDirAbs + '/')
        ? toPosix(currentSourcePath).slice(srcDirAbs.length + 1)
        : ''
      if (rel) {
        const curDir = rel.split('/').slice(0, -1).join('/')
        if (curDir) {
          const relVariants = [
            `${curDir}/${target}`,
            `${curDir}/${target}.md`,
            `${curDir}/${target}.markdown`,
            `${curDir}/${target}/index.md`,
            `${curDir}/${target}/index.markdown`,
          ]
          for (const v of relVariants) {
            const e = index.byRelativePath.get(v)
            if (e) return e
          }
        }
      }
    }
    return undefined
  }

  // 不含 '/':先 alias
  const aliasKey = options.caseSensitive ? target : target.toLowerCase()
  const aliased = index.byAlias.get(aliasKey)
  if (aliased) return aliased

  // 再 basename
  const bnMap = options.caseSensitive
    ? index.byBasename
    : index.byBasenameLower
  const bnKey = options.caseSensitive ? target : target.toLowerCase()
  const candidates = bnMap.get(bnKey)
  if (!candidates || candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]!

  // 多个 → onConflict
  switch (options.onConflict) {
    case 'shortest': {
      const sorted = sortByShortestPath(candidates)
      return sorted[0]!
    }
    case 'first':
      return candidates[0]!
    case 'error':
      // build 时由调用方根据 deadLink 决定;这里返回 undefined → 当作死链
      return undefined
  }
}

/**
 * 死链 URL —— 给一个尽量接近用户意图的 href,便于用户点开诊断。
 * 不抛错,渲染时附 wikilink--dead class。
 */
function buildDeadUrl(rawTarget: string, options: ResolvedOptions): string {
  // 把 raw 字符串原样编码进 URL,带个 sentinel hash 让用户一眼能看出
  const safe = encodeURIComponent(stripMarkdownExt(rawTarget).split('#')[0]!)
  return options.base + safe
}

/**
 * 计算默认 label。
 * - 用户传了 alias 优先,这里只算"没有 alias 时" fallback。
 * - linkText='basename' / 'fullPath' / 自定义函数
 * - 带 heading 时:basename > heading
 */
function defaultLabel(
  target: string,
  headingPart: string,
  entry: FileEntry | undefined,
  options: ResolvedOptions,
): string {
  const lt = options.wikilinks.linkText
  let base: string
  if (typeof lt === 'function') {
    if (entry) {
      base = lt(entry, target)
    } else {
      // 死链时拿不到 entry,降级到 raw target 的 basename
      base = basename(target)
    }
  } else if (lt === 'fullPath') {
    base = entry ? entry.relativePath.replace(/\.(md|markdown)$/i, '') : target
  } else {
    // 'basename'
    base = entry ? entry.basename : basename(target)
  }
  if (headingPart) {
    // Obsidian 风格 "basename > 章节"
    return `${base} > ${headingPart}`
  }
  return base
}

/**
 * 解析 image embed target → AssetEntry。
 * 与 resolveWikilink 类似,但走 assets 索引。
 *
 * v0.3.4:加 currentSourcePath 相对 fallback。Obsidian "新建链接格式 = 相对当前文件"
 * 模式下,`![[media/foo.png]]` 写在 `Themen/X.md` 里时,Obsidian 解读为
 * `Themen/media/foo.png`。原实现只查 `assetsByRelativePath.get('media/foo.png')`
 * 直接找不到 → 退化为 basename + base → `/foo.png` → Vite 当成 public 根 → 404。
 */
export function resolveAsset(
  rawTarget: string,
  index: VaultIndex,
  options: ResolvedOptions,
  /** 写这个 embed 的源文件绝对路径(用于相对路径 fallback,模仿 Obsidian) */
  currentSourcePath?: string,
): {
  asset: import('./types.js').AssetEntry | undefined
  rawBasename: string
} {
  const target = toPosix(rawTarget).trim()
  // 含 '/':先按 vault 绝对相对路径查,再尝试相对当前 source 文件
  if (target.includes('/')) {
    const direct = index.assetsByRelativePath.get(target)
    if (direct) {
      return { asset: direct, rawBasename: basename(target) }
    }
    // Obsidian 相对当前文件 dir 的 fallback
    if (currentSourcePath) {
      const srcDirAbs = index.srcDir
      const cur = toPosix(currentSourcePath)
      const rel = cur.startsWith(srcDirAbs + '/')
        ? cur.slice(srcDirAbs.length + 1)
        : ''
      if (rel) {
        const curDir = rel.split('/').slice(0, -1).join('/')
        if (curDir) {
          const relAsset = index.assetsByRelativePath.get(`${curDir}/${target}`)
          if (relAsset) {
            return { asset: relAsset, rawBasename: basename(target) }
          }
        }
      }
    }
    // 最后 fallback:用 basename 查(Obsidian 的 shortest path 模式)
    const bn0 = options.caseSensitive
      ? basename(target)
      : basename(target).toLowerCase()
    const map0 = options.caseSensitive
      ? index.assetsByBasename
      : index.assetsByBasenameLower
    const fallback = map0.get(bn0)
    if (fallback && fallback.length === 1) {
      return { asset: fallback[0], rawBasename: basename(target) }
    }
    if (fallback && fallback.length > 1) {
      switch (options.onConflict) {
        case 'shortest':
          return {
            asset: sortByShortestPath(fallback)[0],
            rawBasename: basename(target),
          }
        case 'first':
          return { asset: fallback[0], rawBasename: basename(target) }
        case 'error':
          return { asset: undefined, rawBasename: basename(target) }
      }
    }
    return { asset: undefined, rawBasename: basename(target) }
  }
  const bn = options.caseSensitive ? target : target.toLowerCase()
  const map = options.caseSensitive
    ? index.assetsByBasename
    : index.assetsByBasenameLower
  const candidates = map.get(bn)
  if (!candidates || candidates.length === 0) {
    return { asset: undefined, rawBasename: target }
  }
  if (candidates.length === 1) {
    return { asset: candidates[0], rawBasename: target }
  }
  // 多个 asset 同名 → 也走 onConflict
  switch (options.onConflict) {
    case 'shortest': {
      const sorted = sortByShortestPath(candidates)
      return { asset: sorted[0], rawBasename: target }
    }
    case 'first':
      return { asset: candidates[0], rawBasename: target }
    case 'error':
      return { asset: undefined, rawBasename: target }
  }
}
