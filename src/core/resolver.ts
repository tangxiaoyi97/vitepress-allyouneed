/**
 * Resolver —— 把 wikilink target 解析成最终 URL。
 *
 * 解析顺序(对应 PLAN §5):
 * 1. trim、剥 .md/.markdown
 * 2. 拆 #heading
 * 3. 含 '/' → 按 byRelativePath 查
 * 4. 不含 '/' → byAlias → byBasename(冲突先按源文件目录上下文收窄,再按 onConflict)
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

  // HOTFIX(0.5.2):**自引用锚点** `[[#heading]]`(没有文件部分)。
  // 此前 target 被切成空串 → lookupEntry('') 返回 undefined → 整条 wikilink 被
  // 误判 dead(报告:74 处页内跳转锚点全死,即使 slug 精确匹配)。
  // 修法:target 为空 + 有 headingPart + 知道当前文件 → 解析到当前文件本身,
  // 让下面的 heading 匹配逻辑(exact slug)正常命中。
  //
  // v0.5.2 修订:不再用 `index.files.get(currentSourcePath)` 直接精确取键。
  // 不同 VitePress 版本/配置传进来的 env.currentPath(= env.realPath/env.path)
  // 与 index.files 的键(`entry.absolutePath`,已 toPosix)在**归一化形态**上可能
  // 不一致(反斜杠、前导 `./`、`srcDir` 解析差异等),精确 get 会 miss → 自引用
  // 又全部死链。改用 findSelfEntry:多形态归一 + 后缀(相对路径)/ basename 兜底。
  let selfEntry: FileEntry | undefined
  if (!target && headingPart && currentSourcePath) {
    selfEntry = findSelfEntry(currentSourcePath, index)
  }

  // 3-4. 查 entry。v0.3.5:wasFolderForm 时,即使剥了尾 `/` 也强制走
  // path-style 分支(否则 `[[Themen/]]` → strip → `Themen` 没斜杠 → 走 basename
  // 分支 → 找不到 `Themen/index.md`)
  const entry =
    selfEntry ??
    lookupEntry(target, index, options, currentSourcePath, wasFolderForm)

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
    // v0.3.9:按 options.wikilinks.anchorMatch 选模式
    const mode = options.wikilinks.anchorMatch ?? 'leading-number'
    const heading = matchHeading(entry, headingPart, options.slugify, mode)
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
 * HOTFIX(0.5.2):稳健地把"当前文件路径"映射到 index 里的 FileEntry。
 *
 * 用于自引用锚点 `[[#heading]]`。env.currentPath 的来源(VitePress 的
 * env.realPath / env.path)在不同版本/配置下归一化形态不保证与 index.files 的键
 * (`entry.absolutePath`,扫描时 toPosix 过)一致,因此**不能只做精确 get**。
 *
 * 匹配顺序(从最强到兜底):
 *   1. 精确键(快路径)
 *   2. toPosix 后再精确键(消反斜杠 / 多余分隔符)
 *   3. relativePath 完全相等(含从 srcDir 剥出的相对路径)
 *   4. 唯一后缀匹配:某个 entry 的 absolutePath 以归一化后的当前路径结尾
 *      —— 覆盖"当前路径是相对/被截断前缀"的情况(以 `/` 边界防误配)
 *   5. basename 唯一时按 basename 命中(最后兜底;有歧义则放弃,避免错配)
 */
function findSelfEntry(
  currentSourcePath: string,
  index: VaultIndex,
): FileEntry | undefined {
  // 1. 精确
  const direct = index.files.get(currentSourcePath)
  if (direct) return direct

  // 2. toPosix 归一后精确
  const norm = toPosix(currentSourcePath).replace(/^\.\//, '')
  const byNorm = index.files.get(norm)
  if (byNorm) return byNorm

  // 3. relativePath 精确匹配。必须放在后缀匹配之前:当 root 与 locale
  // 子树都存在 `themen/A.md` 时,相对路径 `themen/A.md` 同时也是两个绝对路径
  // 的后缀;先做 relativePath 才不会被扫描顺序带到 `zh/themen/A.md`。
  const srcDir = toPosix(index.srcDir).replace(/\/$/, '')
  const relativeNorm = norm.startsWith(srcDir + '/')
    ? norm.slice(srcDir.length + 1)
    : norm
  const byRelative = index.byRelativePath.get(relativeNorm)
  if (byRelative) return byRelative

  // 4. 唯一后缀匹配(以 '/' 边界,避免 ".../ab.md" 命中 ".../zab.md")。
  // 不再返回第一个命中:多个 locale 的相同尾路径属于歧义,必须继续走更安全的
  // basename-unique 兜底(通常也会因歧义而返回 undefined)。
  const suffixHits: FileEntry[] = []
  for (const e of index.files.values()) {
    const abs = e.absolutePath
    if (abs === norm || abs.endsWith('/' + norm)) {
      suffixHits.push(e)
      continue
    }
    // 反向:当前路径以 entry 的 relativePath 结尾(currentPath 更长)
    if (e.relativePath && norm.endsWith('/' + e.relativePath)) {
      suffixHits.push(e)
    }
  }
  if (suffixHits.length === 1) return suffixHits[0]

  // 5. basename 唯一兜底
  const bn = basename(norm)
  if (bn) {
    const matches: FileEntry[] = []
    for (const e of index.files.values()) {
      if (basename(e.absolutePath) === bn) matches.push(e)
      if (matches.length > 1) break
    }
    if (matches.length === 1) return matches[0]
  }

  return undefined
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
    // 1. 直接 target lookup(不算 dirIndex 解析,就找精确路径)
    const direct =
      index.byRelativePath.get(target) ??
      index.byRelativePath.get(target + '.md') ??
      index.byRelativePath.get(target + '.markdown')
    if (direct) return direct

    // 2. v0.4.0:按 folderLinkOrder iterate,每个 kind 对应一种 dirIndex 候选 lookup
    const lastSeg = target.split('/').pop() ?? ''
    const sa = options.sidebarAuto ?? {}
    const order: ReadonlyArray<'same-name' | 'index' | 'readme' | 'first-file'> =
      Array.isArray(sa.folderLinkOrder)
        ? sa.folderLinkOrder as Array<'same-name' | 'index' | 'readme' | 'first-file'>
        : (sa.folderLinkFallback === 'none'
            ? []
            : ['same-name', 'index', 'readme', 'first-file'])
    for (const kind of order) {
      if (kind === 'first-file') {
        const first = findFirstFileInFolder(target, index)
        if (first) return first
      } else if (kind === 'index') {
        const e =
          index.byRelativePath.get(target + '/index.md') ??
          index.byRelativePath.get(target + '/index.markdown')
        if (e) return e
      } else if (kind === 'readme') {
        // case-insensitive lookup(README.md / readme.md 都行)
        const lower = target + '/'
        for (const path of index.byRelativePath.keys()) {
          if (!path.startsWith(lower)) continue
          const rest = path.slice(lower.length)
          if (/^readme\.(md|markdown)$/i.test(rest)) {
            const e = index.byRelativePath.get(path)
            if (e) return e
          }
        }
      } else if (kind === 'same-name' && lastSeg) {
        const e =
          index.byRelativePath.get(target + '/' + lastSeg + '.md') ??
          index.byRelativePath.get(target + '/' + lastSeg + '.markdown')
        if (e) return e
      }
    }

    // 3. Fallback:相对当前 source 文件目录(模仿 Obsidian 行为)
    if (currentSourcePath) {
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

  // 多个 basename 候选时,先按源文件位置收窄。Obsidian 的短链接语义是
  // "离当前笔记最近的同名文件";这也避免多 locale / 多业务区 vault 中
  // `themen/Foo.md` 被全局 shortest 错配到 `selfcheck/Foo.md`。
  //
  // 评分规则:
  //   - 同目录最高(包括 vault 根目录)
  //   - 否则按目录段的最长共同前缀:zh/themen/* > zh/* > 全局
  //   - 最高分仍有多个时,只在这些候选内执行 onConflict
  const contextualCandidates = narrowCandidatesBySource(
    candidates,
    currentSourcePath,
    index,
  )
  if (contextualCandidates.length === 1) return contextualCandidates[0]

  // 上下文仍无法消歧 → onConflict
  switch (options.onConflict) {
    case 'shortest': {
      const sorted = sortByShortestPath(contextualCandidates)
      return sorted[0]!
    }
    case 'first':
      return contextualCandidates[0]!
    case 'error':
      // build 时由调用方根据 deadLink 决定;这里返回 undefined → 当作死链
      return undefined
  }
}

/**
 * 用源文件目录上下文收窄同 basename 候选。
 *
 * 只在至少共享一个目录段或目录完全相同时收窄;完全无上下文交集时保留全部
 * 候选,维持旧版 onConflict 行为。返回数组保持原扫描顺序,保证 `first` 稳定。
 */
function narrowCandidatesBySource(
  candidates: FileEntry[],
  currentSourcePath: string | undefined,
  index: VaultIndex,
): FileEntry[] {
  if (!currentSourcePath) return candidates
  const source = findSelfEntry(currentSourcePath, index)
  if (!source) return candidates

  const sourceDir = directorySegments(source.relativePath)
  let bestScore = 0
  const scored = candidates.map((candidate) => {
    const candidateDir = directorySegments(candidate.relativePath)
    const exactDirectory =
      sourceDir.length === candidateDir.length &&
      sourceDir.every((segment, i) => segment === candidateDir[i])
    if (exactDirectory) {
      // +1 让同目录严格高于仅共享全部 sourceDir 前缀的子目录。
      return { candidate, score: sourceDir.length + 1 }
    }

    let commonPrefix = 0
    const limit = Math.min(sourceDir.length, candidateDir.length)
    while (
      commonPrefix < limit &&
      sourceDir[commonPrefix] === candidateDir[commonPrefix]
    ) {
      commonPrefix += 1
    }
    return { candidate, score: commonPrefix }
  })

  for (const item of scored) bestScore = Math.max(bestScore, item.score)
  if (bestScore === 0) return candidates
  return scored
    .filter((item) => item.score === bestScore)
    .map((item) => item.candidate)
}

/** 返回 relativePath 中除文件名外的目录段。 */
function directorySegments(relativePath: string): string[] {
  const parts = toPosix(relativePath).replace(/^\.\//, '').split('/')
  return parts.slice(0, -1)
}

/**
 * v0.3.9 — heading 锚点匹配,三模式。
 *
 * **'exact'**(对齐 Obsidian,严格):
 *   - h.text / h.slug / slugify(headingPart) 三种精确匹配
 *
 * **'leading-number'**(默认,physics/math/chem 风格章节号):
 *   - 先走 exact;失败提取 headingPart 的"前导数字"(如 `7`、`7.2`、`4.2.1`)
 *   - 找 heading.text 以该数字开头 + 后跟 whitespace 或字符串末尾的所有 heading
 *   - 多个 → 取**第一个**(按 vault 中出现顺序)并记 ambiguous(scanWikilinks 报)
 *   - 一个 → 返回
 *   - 零个 → undefined
 *
 * **'fuzzy'**(实验性,99% 可用):
 *   - leading-number 的全套
 *   - 再加 token-match:headingPart 按空白拆 token,所有 token 都(case-insensitive)
 *     在 h.text 中出现 → match;多 candidate 选最短 text
 *
 * 返回 { heading, ambiguous? }。ambiguous=true 时 resolver 仍返回 heading,
 * 但调用方(scanWikilinks)可以读出来做汇总告警。
 */
function matchHeading(
  entry: FileEntry,
  headingPart: string,
  slugify: (s: string) => string,
  mode: 'exact' | 'leading-number' | 'fuzzy',
): import('./types.js').HeadingEntry | undefined {
  // 全模式共用:exact 文本/ slug 匹配
  const exact = entry.headings.find(
    (h) =>
      h.text === headingPart ||
      h.slug === headingPart ||
      h.slug === slugify(headingPart),
  )
  if (exact) return exact
  if (mode === 'exact') return undefined

  // leading-number:提取 headingPart 的"前导数字" pattern
  // e.g. "7.2" → "7.2";"7.2 Antike" → "7.2";"" → ""
  const leadingNum = /^(\d+(?:\.\d+)*)/.exec(headingPart.trim())?.[1] ?? ''
  if (leadingNum) {
    const matches = entry.headings.filter((h) => isLeadingNumberMatch(h.text, leadingNum))
    if (matches.length > 0) {
      // 多个 → 第一个(后续可在 scanWikilinks 汇总警告)
      // 暂时不在这里 console.warn,避免每次渲染都吵
      return matches[0]
    }
  }

  if (mode === 'leading-number') return undefined

  // fuzzy 额外:prefix 匹配(headingPart 整体作前缀,word boundary 保护)
  const lc = headingPart.toLowerCase()
  const prefix = entry.headings.find((h) => {
    const t = h.text.toLowerCase()
    if (!t.startsWith(lc)) return false
    if (t.length === lc.length) return true
    return /\s/.test(h.text[lc.length]!)
  })
  if (prefix) return prefix

  // fuzzy 额外:token match
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
  return [...candidates].sort((a, b) => a.text.length - b.text.length)[0]
}

/**
 * v0.3.10:leading-number 匹配的 separator 检查。
 *
 * 要求 heading.text 以 `leadingNum` 开头,且**之后是一个"分隔符"**:
 *   - whitespace `\s`(经典 `13 Foo`)
 *   - 非字非点字符(`)` `:` `,` `—` 等),如 `13) Foo` / `13: Foo` / `13, Foo`
 *   - 字符串末尾(heading 文本就是 `13`)
 *
 * **故意**排除 `.`(避免 `1.2.3-formula` 被 `#1` 误匹)
 * **故意**排除 word char(避免 `13` 误匹 `131 Foo`)
 */
function isLeadingNumberMatch(text: string, leadingNum: string): boolean {
  if (!text.startsWith(leadingNum)) return false
  if (text.length === leadingNum.length) return true
  const nextChar = text[leadingNum.length]!
  if (/\s/.test(nextChar)) return true
  // 非字、非点 → 视为分隔符(`)` `:` `,` `—` `(` 等都行)
  return !/[\w.]/.test(nextChar)
}

/** 给 leading-number / fuzzy 用:返回匹配的 heading 列表,供 scanWikilinks 汇总
 *  ambiguous 警告。**仅 leading-number 模式下需要**汇总,exact / fuzzy 不汇总。 */
export function findAmbiguousLeadingNumberMatches(
  entry: FileEntry,
  headingPart: string,
): import('./types.js').HeadingEntry[] {
  const leadingNum = /^(\d+(?:\.\d+)*)/.exec(headingPart.trim())?.[1] ?? ''
  if (!leadingNum) return []
  return entry.headings.filter((h) => isLeadingNumberMatch(h.text, leadingNum))
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
