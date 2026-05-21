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
  // v0.3.5:用户写 `[[Themen/]]` 这种带尾 `/` 的"文件夹形式" wikilink,
  // 记录意图;后面 defaultLabel 用 folder 段名而不是被解析到的文件 basename
  const wasFolderForm = /\/$/.test(target)
  if (wasFolderForm) target = target.replace(/\/+$/, '')
  // 剥 .md / .markdown
  target = stripMarkdownExt(target)

  // 3-4. 查 entry。v0.3.5:wasFolderForm 时,即使剥了尾 `/` 也强制走
  // path-style 分支(否则 `[[Themen/]]` → strip → `Themen` 没斜杠 → 走 basename
  // 分支 → 找不到 `Themen/index.md`)
  const entry = lookupEntry(
    target,
    index,
    options,
    currentSourcePath,
    wasFolderForm,
  )

  if (!entry) {
    return {
      url: buildDeadUrl(rawTarget, options),
      defaultLabel: defaultLabel(target, headingPart, undefined, options, wasFolderForm),
      isDead: true,
      hasUnmatchedAnchor: false,
      kind,
    }
  }

  // 5. heading 匹配
  let url = entry.url
  let hasUnmatchedAnchor = false
  if (headingPart) {
    const heading = matchHeading(entry, headingPart, options.slugify)
    if (heading) {
      url = entry.url + '#' + heading.slug
    } else {
      hasUnmatchedAnchor = true
      url = entry.url + '#' + encodeURIComponent(headingPart)
    }
  }

  return {
    url,
    defaultLabel: defaultLabel(target, headingPart, entry, options, wasFolderForm),
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
  /** v0.3.5:用户写了 `Foo/` 形式 → 强制 path-style 分支 */
  forcePathStyle = false,
): FileEntry | undefined {
  if (!target) return undefined

  // 含 '/':按路径查;v0.3.5:forcePathStyle 时也走这里
  if (target.includes('/') || forcePathStyle) {
    // 用户写 'notes/a' → 找 'notes/a.md' 或 'notes/a.markdown'
    // v0.3.5:加同名 dirIndex 变体(`Themen/Themen.md` 当 `Themen/` 的索引)
    const lastSeg = target.split('/').pop() ?? ''
    const variants = [
      target,
      target + '.md',
      target + '.markdown',
      target + '/index.md',
      target + '/index.markdown',
      // 同名文件夹索引(和 pickDirIndexes 优先级 1 对齐)
      ...(lastSeg
        ? [target + '/' + lastSeg + '.md', target + '/' + lastSeg + '.markdown']
        : []),
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
    // v0.3.5:folderLinkFallback === 'first-file' 时,文件夹路径找不到 index
    //   就落到该文件夹下"第一个文件"。让 [[folder/]] 始终可点。
    const folderFallback =
      options.sidebarAuto?.folderLinkFallback ?? 'first-file'
    if (folderFallback === 'first-file') {
      const first = findFirstFileInFolder(target, index)
      if (first) return first
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
 * v0.3.8 — 柔性 heading 匹配。Obsidian 用户经常这么写表格内的 wikilink:
 *
 *   [[X#7.2]]            想匹配 "## 7.2 Antike — Vorsokratiker"
 *   [[X#11.2 Kepler]]    想匹配 "## 11.2 Die drei Kepler'schen Gesetze"
 *   [[X#4.2 Cavendish]]  想匹配 "## 4.2 Cavendish-Experiment (1798)"
 *
 * 匹配优先级(返回首个命中):
 *   1. **exact text** —— h.text === headingPart
 *   2. **slug 原样** —— h.slug === headingPart
 *   3. **slug 标准化** —— h.slug === slugify(headingPart)
 *   4. **prefix-with-boundary** —— h.text 以 headingPart 开头,且下一个字符是
 *      whitespace 或字符串末尾(避免 #7.2 误匹配 "7.21 Foo")
 *   5. **token match** —— headingPart 按空白拆 token,所有 token 都(忽略
 *      大小写)出现在 h.text 中;多 candidate 取**最短** text(最精确那个)
 */
function matchHeading(
  entry: FileEntry,
  headingPart: string,
  slugify: (s: string) => string,
): import('./types.js').HeadingEntry | undefined {
  // 1-3. 老的三种精确匹配
  const exact = entry.headings.find(
    (h) =>
      h.text === headingPart ||
      h.slug === headingPart ||
      h.slug === slugify(headingPart),
  )
  if (exact) return exact

  // 4. prefix-with-boundary(忽略大小写)
  const lc = headingPart.toLowerCase()
  const prefix = entry.headings.find((h) => {
    const t = h.text.toLowerCase()
    if (!t.startsWith(lc)) return false
    // 完全相等已经在 step 1 命中过,这里 lc.length < t.length
    if (t.length === lc.length) return true
    // 下一个字符必须是 whitespace(避免 7.2 匹配 7.21)
    return /\s/.test(h.text[lc.length]!)
  })
  if (prefix) return prefix

  // 5. token match —— 所有空白分隔 token 都出现
  const tokens = headingPart
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
  if (tokens.length === 0) return undefined
  const candidates = entry.headings.filter((h) => {
    const lct = h.text.toLowerCase()
    return tokens.every((tok) => lct.includes(tok.toLowerCase()))
  })
  if (candidates.length === 0) return undefined
  if (candidates.length === 1) return candidates[0]
  // 多个 —— 选最短 text(信息量最少 = 最像目标"指向的那段")
  return [...candidates].sort((a, b) => a.text.length - b.text.length)[0]
}

/**
 * v0.3.5:在文件夹下找"第一个文件"作为 [[folder/]] 的兜底目标。
 *
 * 顺序:浅层路径优先(直接子文件 → 孙子 → ...),同深度按 relativePath
 * 字母序。这和 sidebar-auto 的 findFirstPageUrl 行为接近(那边按 sortBy
 * 排序,这里没 sidebarAuto 上下文,简化用 path 字母序,够"稳定可预测")。
 */
function findFirstFileInFolder(
  folderPath: string,
  index: VaultIndex,
): FileEntry | undefined {
  const prefix = folderPath + '/'
  const candidates: FileEntry[] = []
  for (const f of index.files.values()) {
    if (f.relativePath.startsWith(prefix)) candidates.push(f)
  }
  if (candidates.length === 0) return undefined
  candidates.sort((a, b) => {
    const da = a.relativePath.split('/').length
    const db = b.relativePath.split('/').length
    if (da !== db) return da - db
    return a.relativePath.localeCompare(b.relativePath)
  })
  return candidates[0]
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
 *
 * v0.3.5:wasFolderForm 表示用户写的是 `[[folder/]]` 形式 —— 此时即便
 * resolve 到一个文件(folderLinkFallback 兜底),label 也应该是**文件夹名**,
 * 而不是 first file 的 basename(否则 `[[Themen/]]` 显示成 "Konstanten",
 * 用户摸不着头脑)。
 */
function defaultLabel(
  target: string,
  headingPart: string,
  entry: FileEntry | undefined,
  options: ResolvedOptions,
  wasFolderForm = false,
): string {
  const lt = options.wikilinks.linkText
  let base: string
  if (wasFolderForm) {
    // 强制用 target 最后一段作为 label(文件夹名)
    base = basename(target) || target
  } else if (typeof lt === 'function') {
    if (entry) {
      base = lt(entry, target)
    } else {
      base = basename(target)
    }
  } else if (lt === 'fullPath') {
    base = entry ? entry.relativePath.replace(/\.(md|markdown)$/i, '') : target
  } else {
    // 'basename'
    base = entry ? entry.basename : basename(target)
  }
  if (headingPart) {
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
