/** theme 子包公开类型(和 src/core/views/generate-data.ts 保持一致)*/

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
