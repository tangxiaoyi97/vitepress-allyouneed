/**
 * v0.2 — 把 VaultIndex 序列化为前端可消费的 JSON,放进 srcDir/public/。
 *
 * 三个组件(VaultStats / Tags / VaultGraph)统一从这份 JSON 取数,确保数据
 * 一致 + 浏览器端无 Node 依赖。
 */

import fs from 'node:fs'
import nodePath from 'node:path'
import type { ResolvedOptions, VaultIndex, FileEntry } from '../types.js'

export interface VaultData {
  /** 每个笔记一个节点(Graph + Stats 都用)*/
  nodes: VaultDataNode[]
  /** 笔记之间的链接(Graph 用)*/
  edges: VaultDataEdge[]
  /** 标签 → 笔记列表(Tags 用)*/
  tags: Record<string, VaultDataTagInfo>
  /** 全局统计(Stats 用)*/
  stats: VaultDataStats
  /** 元信息 */
  meta: {
    generatedAt: number
    pluginVersion: string
  }
}

export interface VaultDataNode {
  id: string // relativePath,稳定 id
  title: string // basename 或 frontmatter.title
  url: string
  tags: string[]
  mtime: number
}

export interface VaultDataEdge {
  source: string // id
  target: string // id
  type: 'wikilink' | 'transclusion'
}

export interface VaultDataTagInfo {
  count: number
  files: { id: string; url: string; title: string }[]
}

export interface VaultDataStats {
  totalFiles: number
  totalAssets: number
  totalWikilinks: number
  totalTags: number
  totalWarnings: number
  mostRecent: { id: string; url: string; title: string; mtime: number }[] // 10
}

const PLUGIN_VERSION = '0.2.0-beta.0'

/**
 * 从 VaultIndex 构建 VaultData 对象。
 */
export function buildVaultData(index: VaultIndex): VaultData {
  const nodes: VaultDataNode[] = []
  const nodeMap = new Map<string, VaultDataNode>() // id → node

  for (const f of index.files.values()) {
    const title = pickTitle(f)
    const node: VaultDataNode = {
      id: f.relativePath,
      title,
      url: f.url,
      tags: [...f.tags],
      mtime: f.mtime,
    }
    nodes.push(node)
    nodeMap.set(f.relativePath, node)
  }

  // 边:从 backlinks 倒推(VaultIndex.backlinks 是 fromPath → entries 反向链)
  const edges: VaultDataEdge[] = []
  for (const [targetAbs, links] of index.backlinks) {
    const targetEntry = index.files.get(targetAbs)
    if (!targetEntry) continue
    for (const bl of links) {
      const sourceEntry = index.files.get(bl.fromPath)
      if (!sourceEntry) continue
      edges.push({
        source: sourceEntry.relativePath,
        target: targetEntry.relativePath,
        type: bl.isEmbed ? 'transclusion' : 'wikilink',
      })
    }
  }

  // 标签
  const tags: Record<string, VaultDataTagInfo> = {}
  for (const [tag, files] of index.tags) {
    tags[tag] = {
      count: files.length,
      files: files.map((f) => ({
        id: f.relativePath,
        url: f.url,
        title: pickTitle(f),
      })),
    }
  }

  // 统计
  const mostRecent = [...index.files.values()]
    .sort((a, b) => b.mtime - a.mtime)
    .slice(0, 10)
    .map((f) => ({
      id: f.relativePath,
      url: f.url,
      title: pickTitle(f),
      mtime: f.mtime,
    }))

  const stats: VaultDataStats = {
    totalFiles: index.files.size,
    totalAssets: index.assets.size,
    totalWikilinks: edges.length,
    totalTags: Object.keys(tags).length,
    totalWarnings: index.warnings.length,
    mostRecent,
  }

  return {
    nodes,
    edges,
    tags,
    stats,
    meta: {
      generatedAt: Date.now(),
      pluginVersion: PLUGIN_VERSION,
    },
  }
}

/**
 * 写入 srcDir/public/{dataFileName}。public/ 不存在时创建。
 *
 * 这个文件会被 VitePress 当 static asset 复制到 dist/,前端 fetch '/<dataFileName>'。
 */
export function writeVaultData(
  index: VaultIndex,
  options: ResolvedOptions,
): { path: string; bytes: number } {
  const data = buildVaultData(index)
  const json = JSON.stringify(data)
  const publicDir = nodePath.join(nodePath.resolve(options.srcDir), 'public')
  fs.mkdirSync(publicDir, { recursive: true })
  const out = nodePath.join(publicDir, options.views.dataFileName)
  fs.writeFileSync(out, json, 'utf8')
  return { path: out, bytes: json.length }
}

/** title 选择策略:frontmatter.title > basename */
function pickTitle(f: FileEntry): string {
  const fm = f.frontmatter as { title?: unknown } | undefined
  if (fm && typeof fm.title === 'string' && fm.title.trim()) {
    return fm.title.trim()
  }
  return f.basename
}
