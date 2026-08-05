/**
 * VaultScanner —— 把 srcDir 扫成一份完整的 VaultIndex。
 *
 * 设计目标:
 * - 一次扫描产出所有衍生索引,后续模块只查不扫;
 * - 同步实现(简单可靠,性能足够);
 * - 增量更新(updateFile / removeFile)供 dev 模式 HMR 用。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import picomatch from 'picomatch'
import type {
  VaultIndex,
  FileEntry,
  AssetEntry,
  ResolvedOptions,
  ScanWarning,
} from '../types.js'
import {
  toPosix,
  basename,
  extname,
  relative as relativePath,
  pathDepth,
} from '../../utils/path.js'
import { buildUrl, applyCleanUrls } from '../../utils/url.js'
import { walk } from './scan.js'
import { buildIgnorer } from './ignore.js'
import {
  parseFrontmatter,
  normalizeAliases,
  normalizeTags,
} from './frontmatter.js'
import { collectHeadings } from './headings.js'
import { collectBlockIds } from './blocks.js'
import {
  analyzeMarkdownContent,
  cacheMarkdownContentAnalysis,
} from '../markdown-content.js'

// Keep page discovery in lockstep with VitePress 1.x (`**.md`). Assets use
// their own configurable extension set below.
const MD_EXTENSIONS = new Set(['md'])

/**
 * 创建一份空 VaultIndex(供测试或没有 srcDir 时使用)。
 */
export function createEmptyIndex(
  srcDir = '',
  base = '/',
  cleanUrls = false,
): VaultIndex {
  return {
    files: new Map(),
    assets: new Map(),
    byBasename: new Map(),
    byBasenameLower: new Map(),
    byAlias: new Map(),
    byRelativePath: new Map(),
    byUrl: new Map(),
    assetsByBasename: new Map(),
    assetsByBasenameLower: new Map(),
    assetsByRelativePath: new Map(),
    tags: new Map(),
    backlinks: new Map(),
    headings: new Map(),
    blockIds: new Map(),
    srcDir,
    base,
    cleanUrls,
    scannedAt: Date.now(),
    warnings: [],
  }
}

/**
 * 扫描 srcDir 并构建 VaultIndex。
 */
export function scanVault(options: ResolvedOptions): VaultIndex {
  const srcDir = toPosix(nodePath.resolve(options.srcDir))
  const index = createEmptyIndex(srcDir, options.base, options.cleanUrls)

  const isIgnored = buildIgnorer(
    srcDir,
    options.scan.exclude,
    options.scan.respectGitignore,
  )

  const assetExtSet = new Set(
    options.scan.assetExtensions.map((e) => e.toLowerCase()),
  )
  const matchesInclude = buildIncludeMatcher(options.scan.include)

  const entries = walk(srcDir, isIgnored, options.scan.followSymlinks)

  for (const ent of entries) {
    const ext = ent.extension
    const rel = relativePath(srcDir, ent.absolutePath)
    if (MD_EXTENSIONS.has(ext) && matchesInclude(rel)) {
      ingestMarkdown(index, ent.absolutePath, ent.size, ent.mtime, options)
    } else if (assetExtSet.has(ext)) {
      ingestAsset(index, ent.absolutePath, ent.size, ent.mtime, ext)
    }
    // 其它扩展静默跳过(.json、.ts 等)
  }

  index.scannedAt = Date.now()
  return index
}

/**
 * 把一个 .md 文件读入索引。
 */
function ingestMarkdown(
  index: VaultIndex,
  absPath: string,
  size: number,
  mtime: number,
  options: ResolvedOptions,
): void {
  let raw: string
  try {
    raw = fs.readFileSync(absPath, 'utf8')
  } catch (err) {
    index.warnings.push({
      kind: 'unreadable-file',
      message: `Cannot read file: ${absPath} (${
        err instanceof Error ? err.message : String(err)
      })`,
      affected: [absPath],
    })
    return
  }

  const { data, content, error } = parseFrontmatter(raw)
  if (error) {
    index.warnings.push({
      kind: 'invalid-frontmatter',
      message: `Frontmatter parse failed (${absPath}): ${error}`,
      affected: [absPath],
    })
  }

  const aliases = normalizeAliases(data.aliases)
  const tags = normalizeTags(data.tags)
  const headings = collectHeadings(content, options.slugify)
  const contentAnalysis = analyzeMarkdownContent(content)
  const blockIds = collectBlockIds(content, contentAnalysis)
  const rel = relativePath(index.srcDir, absPath)
  const base = basename(absPath, true)
  const ext = extname(absPath)
  const url = computeUrl(rel, options)

  const entry: FileEntry = {
    absolutePath: absPath,
    relativePath: rel,
    basename: base,
    extension: ext,
    url,
    frontmatter: data,
    aliases,
    tags,
    headings,
    blockIds,
    mtime,
    size,
    content,
  }

  cacheMarkdownContentAnalysis(entry, contentAnalysis)
  registerFileEntry(index, entry, options)
}

/**
 * 把一个 asset 文件加入索引。
 */
function ingestAsset(
  index: VaultIndex,
  absPath: string,
  size: number,
  mtime: number,
  ext: string,
): void {
  const rel = relativePath(index.srcDir, absPath)
  const base = basename(absPath)

  const entry: AssetEntry = {
    absolutePath: absPath,
    relativePath: rel,
    basename: base,
    extension: ext,
    mtime,
    size,
    referencedBy: new Set(),
  }

  index.assets.set(absPath, entry)
  index.assetsByRelativePath.set(rel, entry)
  pushToArrayMap(index.assetsByBasename, base, entry)
  pushToArrayMap(index.assetsByBasenameLower, base.toLowerCase(), entry)
}

/**
 * 把 FileEntry 写进所有查找索引。
 */
function registerFileEntry(
  index: VaultIndex,
  entry: FileEntry,
  options: ResolvedOptions,
): void {
  // Fail before mutating any index maps so a strict alias conflict cannot
  // leave a partially registered entry during HMR.
  if (options.onAliasConflict === 'error') {
    for (const alias of entry.aliases) {
      const key = options.caseSensitive ? alias : alias.toLowerCase()
      const existing = index.byAlias.get(key)
      if (existing && existing.absolutePath !== entry.absolutePath) {
        throw new Error(
          `vitepress-allyouneed: alias conflict for "${alias}" between ` +
            `"${existing.relativePath}" and "${entry.relativePath}"`,
        )
      }
    }
  }

  index.files.set(entry.absolutePath, entry)
  index.byRelativePath.set(entry.relativePath, entry)

  // URL 冲突:多文件指向同一 URL(常见原因:index.md 和 README.md 并存,
  // 它们都路由到 '/'。VitePress 会让其中一个 404)
  const existingAtUrl = index.byUrl.get(entry.url)
  if (existingAtUrl && existingAtUrl.absolutePath !== entry.absolutePath) {
    index.warnings.push({
      kind: 'unknown',
      message:
        `URL conflict: "${entry.relativePath}" and "${existingAtUrl.relativePath}" ` +
        `both route to "${entry.url}". One of them will 404 in VitePress. ` +
        `Add srcExclude: ['${entry.relativePath}'] (or the other) in .vitepress/config to fix.`,
      affected: [existingAtUrl.absolutePath, entry.absolutePath],
    })
  }
  index.byUrl.set(entry.url, entry)
  index.headings.set(entry.absolutePath, entry.headings)
  index.blockIds.set(entry.absolutePath, entry.blockIds)

  pushToArrayMap(index.byBasename, entry.basename, entry)
  pushToArrayMap(index.byBasenameLower, entry.basename.toLowerCase(), entry)

  for (const alias of entry.aliases) {
    const key = options.caseSensitive ? alias : alias.toLowerCase()
    if (index.byAlias.has(key)) {
      index.warnings.push({
        kind: 'duplicate-alias',
        message: `alias "${alias}" declared by multiple files; resolving per onAliasConflict='${options.onAliasConflict}'`,
        affected: [index.byAlias.get(key)!.absolutePath, entry.absolutePath],
      })
      if (options.onAliasConflict === 'first') continue
    }
    index.byAlias.set(key, entry)
  }

  for (const tag of entry.tags) {
    pushToArrayMap(index.tags, tag, entry)
  }
}

/**
 * 从 relativePath 计算 VitePress URL。
 *
 * - index.md → 目录根(`/` 或 `/dir/`)
 * - README.md 是普通页面(`/README` 或 `/README.html`)
 * - foo.md → /dir/foo (或 /dir/foo.html when !cleanUrls)
 */
function computeUrl(rel: string, options: ResolvedOptions): string {
  const rewritten = options.rewrite(rel).replace(/^\/+/, '')
  const noExt = rewritten.replace(/\.md$/i, '')
  // VitePress only treats index.md as a directory route. README.md is a
  // normal page and must not collide with index.md.
  const isIndex = /(^|\/)index$/i.test(noExt)
  const pathPart = isIndex ? noExt.replace(/(^|\/)index$/i, '$1') : noExt

  // 路径段切片,各段 buildUrl 时再编码
  const segments = pathPart.split('/').filter(Boolean)
  if (segments.length === 0) {
    // 根 index.md —— **不带 base**(VitePress 会自动 prepend)
    return '/'
  }

  // 应用 cleanUrls(若 false,末尾加 .html)
  const last = segments[segments.length - 1]!
  if (!isIndex) {
    segments[segments.length - 1] = applyCleanUrls(last, options.cleanUrls)
  }

  // ⚠ 关键:始终不带 base(用 '/' 做 site-root 相对 URL)。
  // VitePress 在 render 阶段对所有 sidebar/nav link + markdown link 自动
  // prepend base —— 带了会双重 prefix(GitHub Pages 等子路径部署 404)。
  const url = buildUrl('/', segments)
  // VitePress 的嵌套 index.md 是目录路由(`/guide/`),不是普通 clean URL
  // (`/guide`)。保留尾斜杠既与生成文件 guide/index.html 一致,也避免
  // VitePress 的 dead-link validator 把合法 dirIndex 链接判为不存在。
  return isIndex ? url + '/' : url
}

/** Map<K, V[]> push 工具 */
function pushToArrayMap<K, V>(m: Map<K, V[]>, k: K, v: V): void {
  const arr = m.get(k)
  if (arr) arr.push(v)
  else m.set(k, [v])
}

/**
 * 增量更新:单个文件改了。
 * 把旧 entry 从所有索引清掉,再走 ingest。
 */
export function updateFile(
  index: VaultIndex,
  absPath: string,
  options: ResolvedOptions,
): void {
  const posix = toPosix(absPath)
  removeFile(index, posix, options)
  let stat: fs.Stats
  try {
    stat = fs.statSync(posix)
  } catch {
    return
  }
  if (!stat.isFile() || !isIndexablePath(posix, options)) return
  const ext = extname(posix)
  if (MD_EXTENSIONS.has(ext)) {
    ingestMarkdown(index, posix, stat.size, stat.mtimeMs, options)
  } else if (
    new Set(options.scan.assetExtensions.map((e) => e.toLowerCase())).has(ext)
  ) {
    ingestAsset(index, posix, stat.size, stat.mtimeMs, ext)
  }
}

/**
 * 增量更新:单个文件被删。
 */
export function removeFile(
  index: VaultIndex,
  absPath: string,
  options: ResolvedOptions,
): void {
  const posix = toPosix(absPath)

  // 试 file
  const file = index.files.get(posix)
  if (file) {
    index.files.delete(posix)
    index.byRelativePath.delete(file.relativePath)
    index.headings.delete(posix)
    index.blockIds.delete(posix)
    removeFromArrayMap(index.byBasename, file.basename, file)
    removeFromArrayMap(
      index.byBasenameLower,
      file.basename.toLowerCase(),
      file,
    )
    for (const tag of file.tags) {
      removeFromArrayMap(index.tags, tag, file)
    }
    rebuildFileLookups(index, options)
    return
  }

  // 试 asset
  const asset = index.assets.get(posix)
  if (asset) {
    index.assets.delete(posix)
    index.assetsByRelativePath.delete(asset.relativePath)
    removeFromArrayMap(index.assetsByBasename, asset.basename, asset)
    removeFromArrayMap(
      index.assetsByBasenameLower,
      asset.basename.toLowerCase(),
      asset,
    )
  }
}

/**
 * Shared scan/HMR eligibility predicate. `updateFile` calls this after first
 * removing any old entry, so a file moved outside include/exclude rules cannot
 * linger in the live index.
 */
export function isIndexablePath(
  absPath: string,
  options: ResolvedOptions,
): boolean {
  const posix = toPosix(absPath)
  const rel = relativePath(toPosix(nodePath.resolve(options.srcDir)), posix)
  if (!rel || rel.startsWith('..')) return false
  const isIgnored = buildIgnorer(
    toPosix(nodePath.resolve(options.srcDir)),
    options.scan.exclude,
    options.scan.respectGitignore,
  )
  if (isIgnored(posix)) return false
  const ext = extname(posix)
  if (MD_EXTENSIONS.has(ext)) {
    return buildIncludeMatcher(options.scan.include)(rel)
  }
  return options.scan.assetExtensions.some(
    (candidate) => candidate.toLowerCase() === ext,
  )
}

function buildIncludeMatcher(patterns: string[]): (rel: string) => boolean {
  const matchers = patterns.map((pattern) =>
    picomatch(pattern, { dot: true, nocase: false }),
  )
  return (rel) => matchers.some((matcher) => matcher(rel))
}

/** Restore aliases and URL winners after an HMR removal/update collision. */
function rebuildFileLookups(
  index: VaultIndex,
  options: ResolvedOptions,
): void {
  index.byUrl.clear()
  index.byAlias.clear()
  for (const entry of index.files.values()) {
    index.byUrl.set(entry.url, entry)
    for (const alias of entry.aliases) {
      const key = options.caseSensitive ? alias : alias.toLowerCase()
      if (!index.byAlias.has(key)) index.byAlias.set(key, entry)
    }
  }
}

function removeFromArrayMap<K, V>(m: Map<K, V[]>, k: K, v: V): void {
  const arr = m.get(k)
  if (!arr) return
  const idx = arr.indexOf(v)
  if (idx >= 0) arr.splice(idx, 1)
  if (arr.length === 0) m.delete(k)
}

/**
 * 多条目按"路径深度浅 → 路径字典序"排序的 helper,供 Resolver 'shortest' 用。
 */
export function sortByShortestPath<T extends { relativePath: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const da = pathDepth(a.relativePath)
    const db = pathDepth(b.relativePath)
    if (da !== db) return da - db
    return a.relativePath.localeCompare(b.relativePath)
  })
}
