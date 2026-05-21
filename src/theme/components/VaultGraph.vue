<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, withBase } from 'vitepress'
import * as d3 from 'd3-selection'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { zoom as d3zoom, zoomIdentity, type ZoomBehavior } from 'd3-zoom'
import { drag as d3drag } from 'd3-drag'
import { useVaultData } from '../composables/useVaultData.js'

const router = useRouter()

interface GraphNode extends SimulationNodeDatum {
  id: string
  title: string
  url: string
  inDegree: number
}
interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type: 'wikilink' | 'transclusion'
}

const props = defineProps<{ maxNodes?: number }>()

const { data, loading, error } = useVaultData()
const svgRef = ref<SVGSVGElement | null>(null)
const tooHeavy = ref(false)

let simulation: Simulation<GraphNode, GraphLink> | null = null
let resizeObserver: ResizeObserver | null = null
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null

const MAX_NODES_DEFAULT = 500

const nodes = computed<GraphNode[]>(() => {
  if (!data.value || !Array.isArray(data.value.nodes)) return []
  const map = new Map<string, GraphNode>()
  for (const n of data.value.nodes) {
    if (!n || typeof n.id !== 'string') continue
    map.set(n.id, {
      id: n.id,
      title: typeof n.title === 'string' ? n.title : n.id,
      url: typeof n.url === 'string' ? n.url : '#',
      inDegree: 0,
    })
  }
  if (Array.isArray(data.value.edges)) {
    for (const e of data.value.edges) {
      if (!e) continue
      const t = map.get(e.target)
      if (t) t.inDegree++
    }
  }
  return [...map.values()]
})

const links = computed<GraphLink[]>(() => {
  if (!data.value || !Array.isArray(data.value.edges)) return []
  const ids = new Set(nodes.value.map((n) => n.id))
  return data.value.edges
    .filter(
      (e) =>
        e && typeof e.source === 'string' && typeof e.target === 'string' &&
        ids.has(e.source) && ids.has(e.target),
    )
    .map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type === 'transclusion' ? 'transclusion' : 'wikilink',
    }))
})

const maxNodes = computed(() => props.maxNodes ?? MAX_NODES_DEFAULT)

/** node.id → 邻居 ids set,用于 focus mode */
const neighborsMap = computed<Map<string, Set<string>>>(() => {
  const m = new Map<string, Set<string>>()
  for (const n of nodes.value) m.set(n.id, new Set([n.id]))
  for (const e of links.value) {
    const s = (e.source as GraphNode).id ?? (e.source as unknown as string)
    const t = (e.target as GraphNode).id ?? (e.target as unknown as string)
    m.get(s)?.add(t)
    m.get(t)?.add(s)
  }
  return m
})

function build(): void {
  const svgEl = svgRef.value
  if (!svgEl || !data.value) return

  if (nodes.value.length > maxNodes.value) {
    tooHeavy.value = true
    return
  }
  tooHeavy.value = false

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()

  const rect = svgEl.getBoundingClientRect()
  const width = Math.max(rect.width, 320)
  const height = Math.max(rect.height, 320)

  // 重置 viewBox 与容器实际大小一致,避免 viewBox 缩放和 forceCenter 坐标错位
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  const g = svg.append('g').attr('class', 'ayn-graph-zoom-group')

  const linkSel = g
    .append('g')
    .attr('class', 'ayn-graph-edges')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(links.value)
    .join('line')
    .attr('class', (d) =>
      d.type === 'transclusion'
        ? 'ayn-graph-edge ayn-graph-edge--embed'
        : 'ayn-graph-edge',
    )

  const nodeSel = g
    .append('g')
    .attr('class', 'ayn-graph-nodes')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes.value, (d) => d.id)
    .join('g')
    .attr('class', 'ayn-graph-node')

  nodeSel.append('circle').attr('r', (d) => 4 + Math.min(d.inDegree, 8))
  nodeSel
    .append('text')
    .attr('class', 'ayn-graph-label')
    .attr('dy', (d) => 4 + Math.min(d.inDegree, 8) + 12)
    .attr('text-anchor', 'middle')
    .text((d) => d.title)

  // ── 交互 ─────────────────────────────────────────
  nodeSel
    .on('click', (_evt, d) => {
      // v0.3.9:d.url 是 base-less(来自 vault-data.json)。router.go 期望 base
      // 已应用的 href,base !== '/' 时不 withBase 会路由到错误路径
      const href = withBase(d.url)
      try {
        router.go(href)
      } catch {
        if (typeof window !== 'undefined') window.location.href = href
      }
    })
    .on('mouseenter', (_evt, d) => applyFocus(d.id, nodeSel, linkSel))
    .on('mouseleave', () => clearFocus(nodeSel, linkSel))
    .call(
      d3drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation?.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation?.alphaTarget(0)
          d.fx = null
          d.fy = null
        }),
    )

  // v0.3.9:zoom 监听 + label 渐隐(像 Obsidian)
  //   k >= LABEL_FULL  → opacity 1
  //   LABEL_FADE_START → k → LABEL_FULL 之间线性插值
  //   k <= LABEL_FADE_START → opacity 0
  const LABEL_FULL = 0.9
  const LABEL_FADE_START = 0.4
  const labelSel = g.selectAll<SVGTextElement, GraphNode>('text.ayn-graph-label')
  zoomBehavior = d3zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      const k = event.transform.k as number
      g.attr('transform', event.transform.toString())
      let op: number
      if (k >= LABEL_FULL) op = 1
      else if (k <= LABEL_FADE_START) op = 0
      else op = (k - LABEL_FADE_START) / (LABEL_FULL - LABEL_FADE_START)
      labelSel.attr('opacity', op).style('pointer-events', op === 0 ? 'none' : null)
    })
  svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity)

  simulation = forceSimulation<GraphNode>(nodes.value)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links.value)
        .id((d) => d.id)
        .distance(70)
        .strength(0.6),
    )
    .force('charge', forceManyBody().strength(-90))
    .force('center', forceCenter(width / 2, height / 2))
    .force('x', forceX(width / 2).strength(0.08))
    .force('y', forceY(height / 2).strength(0.08))
    .force(
      'collide',
      forceCollide<GraphNode>().radius((d) => 14 + Math.min(d.inDegree, 8)),
    )
    .on('tick', () => {
      linkSel
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0)
      nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })
    .on('end', () => fitToView(svg, width, height))

  // 兜底:如果 simulation 不收敛,1.5 秒后强制 fit
  setTimeout(() => fitToView(svg, width, height), 1500)
}

/**
 * 把所有节点的 bounding box 算出来,zoom transform 到刚好容纳 + 居中。
 */
function fitToView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  width: number,
  height: number,
): void {
  if (!zoomBehavior || nodes.value.length === 0) return
  const xs = nodes.value.map((n) => n.x ?? 0)
  const ys = nodes.value.map((n) => n.y ?? 0)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const padding = 60
  const w = maxX - minX + padding * 2
  const h = maxY - minY + padding * 2
  if (w <= 0 || h <= 0) return
  const scale = Math.min(width / w, height / h, 1.5)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const tx = width / 2 - cx * scale
  const ty = height / 2 - cy * scale
  const t = zoomIdentity.translate(tx, ty).scale(scale)
  svg.transition().duration(450).call(zoomBehavior.transform, t)
}

/**
 * 进入 focus 模式:hover 节点 + 邻居高亮,其它暗淡。
 */
function applyFocus(
  hoveredId: string,
  nodeSel: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>,
  linkSel: d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown>,
): void {
  const neighbors = neighborsMap.value.get(hoveredId) ?? new Set([hoveredId])
  nodeSel
    .classed('is-active', (n) => n.id === hoveredId)
    .classed('is-related', (n) => n.id !== hoveredId && neighbors.has(n.id))
    .classed('is-dimmed', (n) => !neighbors.has(n.id))
  linkSel.classed('is-dimmed', (e) => {
    const s = (e.source as GraphNode).id ?? (e.source as unknown as string)
    const t = (e.target as GraphNode).id ?? (e.target as unknown as string)
    return !(s === hoveredId || t === hoveredId)
  })
}

function clearFocus(
  nodeSel: d3.Selection<SVGGElement, GraphNode, SVGGElement, unknown>,
  linkSel: d3.Selection<SVGLineElement, GraphLink, SVGGElement, unknown>,
): void {
  nodeSel
    .classed('is-active', false)
    .classed('is-related', false)
    .classed('is-dimmed', false)
  linkSel.classed('is-dimmed', false)
}

function destroy(): void {
  simulation?.stop()
  simulation = null
  zoomBehavior = null
  if (svgRef.value) d3.select(svgRef.value).selectAll('*').remove()
}

onMounted(() => {
  if (svgRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      if (data.value) build()
    })
    resizeObserver.observe(svgRef.value)
  }
})

onBeforeUnmount(() => {
  destroy()
  resizeObserver?.disconnect()
})

watch(
  () => data.value,
  (d) => {
    if (!d) return
    destroy()
    nextTick(() => build())
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="ayn-view ayn-graph">
    <div v-if="loading" class="ayn-view-loading">Loading…</div>
    <div v-else-if="error" class="ayn-view-error">Failed to load: {{ error }}</div>
    <div v-else-if="tooHeavy" class="ayn-view-empty">
      Graph has {{ nodes.length }} nodes (max {{ maxNodes }}); disabled to prevent slowdown.
      <br />Raise the limit via the <code>:max-nodes</code> prop, or use the Tags / Stats views instead.
    </div>
    <div v-else class="ayn-graph-container">
      <svg ref="svgRef" class="ayn-graph-svg" />
    </div>
  </div>
</template>
