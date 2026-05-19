<script setup lang="ts">
/**
 * VaultGraph — d3-force 力导向关系图。
 *
 * SVG 渲染(<500 节点流畅,Obsidian/Roam 规模)。
 * - 节点 = 笔记,半径按"被引用次数"(in-degree)放大
 * - 边 = wikilink / transclusion(transclusion 用强调色)
 * - 交互:zoom/pan(滚轮 + 拖背景)、节点拖拽、点击跳页面、hover 显示 tooltip
 * - 性能保护:节点数 > graphMaxNodes(默认 500)时只显示提示
 * - 全部颜色用 CSS variables,跟随主题色
 */
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue'
import * as d3 from 'd3-selection'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type Simulation,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force'
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom'
import { drag as d3drag } from 'd3-drag'
import { useVaultData } from '../composables/useVaultData.js'
import type { VaultData } from '../types.js'

interface GraphNode extends SimulationNodeDatum {
  id: string
  title: string
  url: string
  inDegree: number
}
interface GraphLink extends SimulationLinkDatum<GraphNode> {
  type: 'wikilink' | 'transclusion'
}

// 用户可通过 props 覆盖,但默认从 data 拿
const props = defineProps<{
  maxNodes?: number
}>()

const { data, loading, error } = useVaultData()
const svgRef = ref<SVGSVGElement | null>(null)
const tooltipRef = ref<HTMLDivElement | null>(null)
const tooHeavy = ref(false)

let simulation: Simulation<GraphNode, GraphLink> | null = null
let resizeObserver: ResizeObserver | null = null

const MAX_NODES_DEFAULT = 500

const nodes = computed<GraphNode[]>(() => {
  if (!data.value) return []
  const map = new Map<string, GraphNode>()
  for (const n of data.value.nodes) {
    map.set(n.id, { id: n.id, title: n.title, url: n.url, inDegree: 0 })
  }
  for (const e of data.value.edges) {
    const t = map.get(e.target)
    if (t) t.inDegree++
  }
  return [...map.values()]
})

const links = computed<GraphLink[]>(() => {
  if (!data.value) return []
  const ids = new Set(nodes.value.map((n) => n.id))
  return data.value.edges
    .filter((e) => ids.has(e.source) && ids.has(e.target))
    .map((e) => ({ source: e.source, target: e.target, type: e.type }))
})

const maxNodes = computed(() => props.maxNodes ?? MAX_NODES_DEFAULT)

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

  // g 用来做 zoom/pan
  const g = svg.append('g').attr('class', 'ayn-graph-zoom-group')

  // 边
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

  // 节点组(circle + label)
  const nodeSel = g
    .append('g')
    .attr('class', 'ayn-graph-nodes')
    .selectAll<SVGGElement, GraphNode>('g')
    .data(nodes.value, (d) => d.id)
    .join('g')
    .attr('class', 'ayn-graph-node')
    .style('cursor', 'pointer')

  nodeSel
    .append('circle')
    .attr('r', (d) => 4 + Math.min(d.inDegree, 8))

  nodeSel
    .append('text')
    .attr('class', 'ayn-graph-label')
    .attr('dy', (d) => 4 + Math.min(d.inDegree, 8) + 12)
    .attr('text-anchor', 'middle')
    .text((d) => d.title)

  // 交互
  nodeSel
    .on('click', (_evt, d) => {
      if (typeof window !== 'undefined') window.location.href = d.url
    })
    .on('mouseenter', (evt, d) => showTooltip(evt as MouseEvent, d))
    .on('mouseleave', hideTooltip)
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

  // Zoom
  const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.2, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform.toString())
    })
  svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity)

  // Simulation
  simulation = forceSimulation<GraphNode>(nodes.value)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(links.value)
        .id((d) => d.id)
        .distance(60)
        .strength(0.4),
    )
    .force('charge', forceManyBody().strength(-180))
    .force('center', forceCenter(width / 2, height / 2))
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
}

function destroy(): void {
  simulation?.stop()
  simulation = null
  if (svgRef.value) d3.select(svgRef.value).selectAll('*').remove()
}

function showTooltip(evt: MouseEvent, d: GraphNode): void {
  const tt = tooltipRef.value
  if (!tt) return
  tt.textContent = d.title + (d.inDegree > 0 ? `  ← ${d.inDegree}` : '')
  tt.style.display = 'block'
  tt.style.left = evt.pageX + 12 + 'px'
  tt.style.top = evt.pageY + 12 + 'px'
}
function hideTooltip(): void {
  if (tooltipRef.value) tooltipRef.value.style.display = 'none'
}

onMounted(() => {
  // 监听容器大小变化重布局
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

// 数据加载完后建图
watch(
  () => data.value,
  (d) => {
    if (d) {
      destroy()
      build()
    }
  },
)

// 类型辅助:Vue 不知道 VaultData 的具体形态,这里只是 satisfies check
void (null as unknown as VaultData | null)
</script>

<template>
  <div class="ayn-view ayn-graph">
    <div v-if="loading" class="ayn-view-loading">加载中…</div>
    <div v-else-if="error" class="ayn-view-error">加载失败:{{ error }}</div>
    <div
      v-else-if="tooHeavy"
      class="ayn-view-empty"
    >
      vault 节点数 {{ nodes.length }} > 阈值 {{ maxNodes }},图谱已禁用以防卡顿。
      <br />可通过组件 prop <code>:max-nodes</code> 调整,或转用 Tags / Stats 视图。
    </div>
    <div v-else class="ayn-graph-container">
      <svg ref="svgRef" class="ayn-graph-svg" :viewBox="`0 0 800 600`" />
      <div ref="tooltipRef" class="ayn-graph-tooltip" />
    </div>
  </div>
</template>
