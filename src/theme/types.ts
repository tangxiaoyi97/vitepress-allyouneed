/**
 * theme 子包公开类型 —— Vue 组件和 composable 共用。
 *
 * 必须和 src/core/views/generate-data.ts 的 VaultData* 类型保持一致。
 * (重复定义是为了 theme 包不依赖 core,降低 bundle 体积)
 */

export interface VaultData {
  nodes: VaultDataNode[]
  edges: VaultDataEdge[]
  tags: Record<string, VaultDataTagInfo>
  stats: VaultDataStats
  meta: {
    generatedAt: number
    pluginVersion: string
  }
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
  files: { id: string; url: string; title: string }[]
}

export interface VaultDataStats {
  totalFiles: number
  totalAssets: number
  totalWikilinks: number
  totalTags: number
  totalWarnings: number
  mostRecent: { id: string; url: string; title: string; mtime: number }[]
}
