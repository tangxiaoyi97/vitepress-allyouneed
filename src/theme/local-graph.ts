import type {
  LocalGraphConfig,
  VaultData,
  VaultDataEdge,
  VaultDataNode,
} from './types.js'

export const DEFAULT_LOCAL_GRAPH_CONFIG: LocalGraphConfig = {
  enabled: false,
  depth: 1,
  maxNodes: 24,
  modalDepth: 2,
  modalMaxNodes: 100,
  mobile: 'button',
}

export interface LocalGraphSlice {
  currentId: string
  nodes: VaultDataNode[]
  edges: VaultDataEdge[]
  distances: Record<string, number>
}

export interface LocalGraphPosition {
  id: string
  x: number
  y: number
  distance: number
}

export function resolveLocalGraphConfig(
  value: Partial<LocalGraphConfig> | null | undefined,
): LocalGraphConfig {
  return {
    enabled: value?.enabled ?? DEFAULT_LOCAL_GRAPH_CONFIG.enabled,
    depth: boundedDepth(value?.depth, DEFAULT_LOCAL_GRAPH_CONFIG.depth),
    maxNodes: positiveInteger(value?.maxNodes, DEFAULT_LOCAL_GRAPH_CONFIG.maxNodes),
    modalDepth: boundedDepth(
      value?.modalDepth,
      DEFAULT_LOCAL_GRAPH_CONFIG.modalDepth,
    ),
    modalMaxNodes: positiveInteger(
      value?.modalMaxNodes,
      DEFAULT_LOCAL_GRAPH_CONFIG.modalMaxNodes,
    ),
    mobile: value?.mobile === 'hidden' ? 'hidden' : 'button',
  }
}

export function isLocalGraphPageEligible(
  relativePath: string,
  frontmatter: Record<string, unknown>,
  viewsPrefix: string,
  viewNames: { graph: string; stats: string; tags: string },
): boolean {
  if (!relativePath) return false
  if (frontmatter.layout === 'home' || frontmatter.aside === false) return false

  const rel = relativePath.replace(/^\/+/, '')
  const prefix = viewsPrefix.replace(/^\/+|\/+$/g, '')
  if (prefix) return !(rel === prefix || rel.startsWith(prefix + '/'))

  const rootViewFiles = new Set([
    `${viewNames.graph}.md`,
    `${viewNames.stats}.md`,
    `${viewNames.tags}.md`,
  ])
  return !rootViewFiles.has(rel)
}

export function findCurrentNodeId(
  data: VaultData,
  relativePath: string,
  routePath: string,
  siteBase: string,
): string | null {
  if (relativePath && data.nodes.some((node) => node.id === relativePath)) {
    return relativePath
  }

  const route = normalizeRoutePath(stripSiteBase(routePath, siteBase))
  const match = data.nodes.find((node) => normalizeRoutePath(node.url) === route)
  return match?.id ?? null
}

/**
 * 局部图按无向关系做 BFS:入链与出链都是当前笔记的语义邻居。
 * 节点选择始终按 id 排序,使限额截断和 SVG 布局在每次构建间稳定。
 */
export function buildLocalGraph(
  data: VaultData,
  currentId: string,
  depth: number,
  maxNodes: number,
): LocalGraphSlice | null {
  const nodeMap = new Map(data.nodes.map((node) => [node.id, node]))
  if (!nodeMap.has(currentId)) return null

  const adjacency = new Map<string, Set<string>>()
  for (const node of data.nodes) adjacency.set(node.id, new Set())
  for (const edge of data.edges) {
    if (
      edge.source === edge.target ||
      !nodeMap.has(edge.source) ||
      !nodeMap.has(edge.target)
    ) continue
    adjacency.get(edge.source)?.add(edge.target)
    adjacency.get(edge.target)?.add(edge.source)
  }

  const limit = positiveInteger(maxNodes, 1)
  const maxDepth = positiveInteger(depth, 1)
  const selected = new Set<string>([currentId])
  const distances: Record<string, number> = { [currentId]: 0 }
  const queue: string[] = [currentId]

  while (queue.length > 0 && selected.size < limit) {
    const source = queue.shift()!
    const nextDistance = distances[source]! + 1
    if (nextDistance > maxDepth) continue
    const neighbors = [...(adjacency.get(source) ?? [])].sort(compareText)
    for (const neighbor of neighbors) {
      if (selected.has(neighbor)) continue
      selected.add(neighbor)
      distances[neighbor] = nextDistance
      queue.push(neighbor)
      if (selected.size >= limit) break
    }
  }

  const nodes = [...selected]
    .map((id) => nodeMap.get(id)!)
    .sort((a, b) =>
      (distances[a.id] ?? 0) - (distances[b.id] ?? 0) || compareText(a.id, b.id),
    )
  const edges = data.edges
    .filter((edge) => selected.has(edge.source) && selected.has(edge.target))
    .sort((a, b) =>
      compareText(`${a.source}\0${a.target}`, `${b.source}\0${b.target}`),
    )

  return { currentId, nodes, edges, distances }
}

/** 为缩略图生成确定性同心椭圆坐标,不使用 d3-force。 */
export function layoutLocalGraph(
  slice: LocalGraphSlice,
  width = 240,
  height = 150,
): LocalGraphPosition[] {
  const cx = width / 2
  const cy = height / 2
  const positions: LocalGraphPosition[] = [
    { id: slice.currentId, x: cx, y: cy, distance: 0 },
  ]
  const levels = new Map<number, VaultDataNode[]>()
  for (const node of slice.nodes) {
    if (node.id === slice.currentId) continue
    const distance = slice.distances[node.id] ?? 1
    const level = levels.get(distance) ?? []
    level.push(node)
    levels.set(distance, level)
  }

  const maxDistance = Math.max(1, ...levels.keys())
  for (const [distance, levelNodes] of [...levels].sort((a, b) => a[0] - b[0])) {
    levelNodes.sort((a, b) => compareText(a.id, b.id))
    const capacity = 12
    for (let start = 0; start < levelNodes.length; start += capacity) {
      const ring = levelNodes.slice(start, start + capacity)
      const subRing = Math.floor(start / capacity)
      const distanceRatio = distance / maxDistance
      const rx = Math.min(width * 0.41, width * (0.18 + distanceRatio * 0.2) + subRing * 12)
      const ry = Math.min(height * 0.38, height * (0.14 + distanceRatio * 0.18) + subRing * 8)
      const offset = (distance + subRing) % 2 === 0 ? Math.PI / ring.length : 0
      ring.forEach((node, index) => {
        const angle = -Math.PI / 2 + offset + (index * Math.PI * 2) / ring.length
        positions.push({
          id: node.id,
          x: cx + Math.cos(angle) * rx,
          y: cy + Math.sin(angle) * ry,
          distance,
        })
      })
    }
  }
  return positions
}

export function sliceVaultData(data: VaultData, slice: LocalGraphSlice): VaultData {
  return { ...data, nodes: slice.nodes, edges: slice.edges }
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.floor(value)
    : fallback
}

function boundedDepth(value: number | undefined, fallback: 1 | 2): 1 | 2 {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback
  return value >= 2 ? 2 : 1
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function stripSiteBase(path: string, base: string): string {
  const normalizedBase = '/' + base.replace(/^\/+|\/+$/g, '')
  if (normalizedBase === '/') return path
  if (path === normalizedBase) return '/'
  return path.startsWith(normalizedBase + '/')
    ? path.slice(normalizedBase.length)
    : path
}

function normalizeRoutePath(path: string): string {
  let normalized = path.split(/[?#]/, 1)[0] || '/'
  try {
    normalized = decodeURI(normalized)
  } catch {
    // 保留原字符串;不合法的 percent escape 不应让局部图崩溃。
  }
  if (!normalized.startsWith('/')) normalized = '/' + normalized
  if (normalized.length > 1) normalized = normalized.replace(/\/$/, '')
  return normalized
}
