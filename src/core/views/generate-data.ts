/**
 * v0.2 — 把 VaultIndex 序列化为前端 JSON,放 srcDir/public/。
 *
 * 边(edges)和正文 #tag 在 markdown-it 渲染阶段才能被填进 VaultIndex.backlinks /
 * tags。我们这个函数在 vite plugin configResolved 阶段(渲染之前)就跑,
 * 所以**自己从 file.content 用正则提取** wikilink 和 #tag 写进 JSON,不依赖
 * 运行时 backlinks。否则 Graph 永远空 / Tags 不含正文标签。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import type {
  ResolvedOptions,
  VaultIndex,
  FileEntry,
} from '../types.js'
import { splitWikilinkInner } from '../../utils/wikilink.js'
import { resolveWikilink } from '../resolver.js'
import {
  stripNonContentMarkdown,
  WIKILINK_SOURCE,
} from '../markdown-content.js'
import { findInlineTags } from '../tags.js'

export interface VaultData {
  nodes: VaultDataNode[]
  edges: VaultDataEdge[]
  tags: Record<string, VaultDataTagInfo>
  stats: VaultDataStats
  meta: { generatedAt: number; pluginVersion: string }
}
export interface VaultDataNode {
  id: string
  title: string
  url: string
  tags: string[]
  mtime: number
}
export interface VaultDataEdge {
  source: string
  target: string
  type: 'wikilink' | 'transclusion'
}
export interface VaultDataTagInfo {
  count: number
  files: {
    id: string
    url: string
    title: string
    mtime: number
    path: string
    /** 该文件除了"当前 tag"之外的其它 tag */
    otherTags: string[]
  }[]
}
export interface VaultDataStats {
  totalFiles: number
  totalAssets: number
  totalWikilinks: number
  totalTags: number
  totalWarnings: number
  mostRecent: { id: string; url: string; title: string; mtime: number }[]
}

// v0.5:版本号由 tsup `define` 在构建期注入(见 tsup.config.ts),
//       源码不再硬编码。dev/test(未走 tsup)时回退到占位串。
declare const __AYN_VERSION__: string | undefined
const PLUGIN_VERSION =
  typeof __AYN_VERSION__ !== 'undefined' ? __AYN_VERSION__ : '0.0.0-dev'

export function buildVaultData(
  index: VaultIndex,
  options: ResolvedOptions,
): VaultData {
  // 排除插件自动生成的视图文件(_perspectives_/graph.md 等),它们是系统
  // 生成的工具页,不应该出现在 stats / graph / tags 统计里
  const viewsPrefix = options.views.urlPrefix
    ? options.views.urlPrefix.replace(/^\/+|\/+$/g, '') + '/'
    : ''
  const isPerspective = (f: FileEntry): boolean => {
    if (!viewsPrefix) return false
    return f.relativePath.startsWith(viewsPrefix)
  }
  const isInternalFile = (f: FileEntry): boolean =>
    /(^|\/)_(?:sidebar)\.md$/i.test(f.relativePath)
  const userFiles: FileEntry[] = []
  for (const f of index.files.values()) {
    if (!isPerspective(f) && !isInternalFile(f)) userFiles.push(f)
  }
  const cleanedContent = new Map(
    userFiles.map((file) => [file.relativePath, stripNonContentMarkdown(file.content)]),
  )

  // 节点
  const nodes: VaultDataNode[] = []
  for (const f of userFiles) {
    nodes.push({
      id: f.relativePath,
      title: pickTitle(f),
      url: f.url,
      tags: [...f.tags],
      mtime: f.mtime,
    })
  }

  // 边:从每个文件的 content 用正则提取 wikilink
  // 同一 source→target 去重:若同时有 wikilink + transclusion,保留 transclusion
  // (transclusion 是更"强"的关系,渲染出来视觉上也更重)
  const edgeMap = new Map<string, VaultDataEdge>()
  for (const f of userFiles) {
    const cleaned = cleanedContent.get(f.relativePath)!
    const matches = cleaned.matchAll(new RegExp(WIKILINK_SOURCE))
    for (const m of matches) {
      const isEmbed = m[1] === '!'
      // v0.3.4:拆 \| 转义,取 target 段,剥 #heading
      const inner = m[2]!
      const rawTarget = (splitWikilinkInner(inner)[0] ?? '').trim()
      if (!rawTarget) continue
      // v0.3.4:传 source rel path,支持 Obsidian 相对路径 fallback
      const resolved = resolveWikilink(
        rawTarget,
        index,
        options,
        isEmbed ? 'transclusion' : 'page',
        f.absolutePath,
      )
      const target = resolved.target
      if (!target || resolved.isDead) continue
      if (isPerspective(target)) continue
      if (target.relativePath === f.relativePath) continue
      const key = `${f.relativePath}\u0000${target.relativePath}`
      const existing = edgeMap.get(key)
      // 已有 edge,且新的不是 embed(更强类型)→ 跳过
      if (existing && existing.type === 'transclusion' && !isEmbed) continue
      edgeMap.set(key, {
        source: f.relativePath,
        target: target.relativePath,
        type: isEmbed ? 'transclusion' : 'wikilink',
      })
    }
  }
  const edges: VaultDataEdge[] = [...edgeMap.values()]

  // 标签:frontmatter tags + 正文 #tag(若开 parseInlineTags)
  // v0.3.9:支持用户自定义 inlineTagPattern
  // v0.5:每个文件只跑一次正文 tag 正则,tagsMap 与 allTagsByFile 复用同一结果
  //       (此前对全 vault 重复跑两遍,大 vault 下浪费一倍解析时间)。
  const tagsMap = new Map<string, FileEntry[]>()
  const allTagsByFile = new Map<string, string[]>()
  for (const f of userFiles) {
    const set = new Set(f.tags)
    if (options.views.parseInlineTags) {
      const cleaned = cleanedContent.get(f.relativePath)!
      for (const tag of findInlineTags(cleaned, options.views.inlineTagPattern)) {
        set.add(tag)
      }
    }
    allTagsByFile.set(f.relativePath, [...set])
    for (const tag of set) {
      const arr = tagsMap.get(tag) ?? []
      arr.push(f)
      tagsMap.set(tag, arr)
    }
  }

  const tags: Record<string, VaultDataTagInfo> = {}
  for (const [tag, files] of tagsMap) {
    // 按 mtime 倒序(最近修改在上)
    const sorted = [...files].sort((a, b) => b.mtime - a.mtime)
    tags[tag] = {
      count: files.length,
      files: sorted.map((f) => ({
        id: f.relativePath,
        url: f.url,
        title: pickTitle(f),
        mtime: f.mtime,
        path: f.relativePath,
        otherTags: (allTagsByFile.get(f.relativePath) ?? []).filter(
          (t) => t !== tag,
        ),
      })),
    }
  }

  // 最近修改 10
  const mostRecent = [...userFiles]
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10)
    .map((f) => ({
      id: f.relativePath,
      url: f.url,
      title: pickTitle(f),
      mtime: f.mtime,
    }))

  return {
    nodes,
    edges,
    tags,
    stats: {
      totalFiles: userFiles.length,
      totalAssets: index.assets.size,
      totalWikilinks: edges.length,
      totalTags: Object.keys(tags).length,
      totalWarnings: index.warnings.length,
      mostRecent,
    },
    meta: { generatedAt: Date.now(), pluginVersion: PLUGIN_VERSION },
  }
}

export function writeVaultData(
  index: VaultIndex,
  options: ResolvedOptions,
  publicDirOverride?: string,
): { path: string; bytes: number } {
  const data = buildVaultData(index, options)
  const json = JSON.stringify(data)
  const publicDir = publicDirOverride
    ? nodePath.resolve(publicDirOverride)
    : nodePath.join(nodePath.resolve(options.srcDir), 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  const out = nodePath.join(publicDir, options.views.dataFileName)
  fs.writeFileSync(out, json, 'utf8')
  return { path: out, bytes: json.length }
}

function pickTitle(f: FileEntry): string {
  const fm = f.frontmatter as { title?: unknown } | undefined
  if (fm && typeof fm.title === 'string' && fm.title.trim()) {
    return fm.title.trim()
  }
  return f.basename
}

/**
 * Remove Markdown regions that do not contribute rendered links or body tags.
 * Replacements preserve newlines so diagnostics and later parsers can retain
 * source positions if this helper is shared in the future.
 */
export { stripNonContentMarkdown } from '../markdown-content.js'
