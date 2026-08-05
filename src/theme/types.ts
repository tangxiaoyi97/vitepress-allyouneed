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
  /** Added in 0.6.1; optional so cached 0.6.0 data remains renderable. */
  label?: string
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

export interface LocalGraphConfig {
  enabled: boolean
  depth: 1 | 2
  maxNodes: number
  modalDepth: 1 | 2
  modalMaxNodes: number
  mobile: 'button' | 'hidden'
}

export interface DocHeaderConfig {
  enabled?: boolean
  hideH1?: boolean
  showDates?: boolean
  showTags?: boolean
  showWordCount?: boolean
  /** Override the generated Tags view route. */
  tagsViewUrl?: string
  wordsPerMinute?: number
}

export interface AllyouneedThemeConfig {
  viewsUrlPrefix?: string
  viewsNames?: { graph: string; stats: string; tags: string }
  dataFileName?: string
  localGraph?: Partial<LocalGraphConfig>
  docHeader?: DocHeaderConfig
}
