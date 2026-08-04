<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed, watch, nextTick } from 'vue'
import { useRouter, withBase } from 'vitepress'
import * as d3 from 'd3-selection'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
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
import type { VaultData } from '../types.js'

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

const props = defineProps<{
  maxNodes?: number
  dataFileName?: string
  /** 已加载的数据。LocalGraph modal 用它避免重复 fetch。 */
  vaultData?: VaultData
  /** 高亮当前页节点。 */
  focusNodeId?: string
}>()

const loaded = useVaultData(props.dataFileName, {
  immediate: props.vaultData === undefined,
})
const data = computed(() => props.vaultData ?? loaded.data.value)
const loading = computed(() => props.vaultData === undefined && loaded.loading.value)
const error = computed(() => props.vaultData === undefined ? loaded.error.value : null)
const svgRef = ref<SVGSVGElement | null>(null)
const tooHeavy = ref(false)

let simulation: Simulation<GraphNode, GraphLink> | null = null
let resizeObserver: ResizeObserver | null = null
let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null
// v0.5:重建/卸载时清掉的"强制 fit"定时器 + resize 防抖的 rAF 句柄
let fitTimer: ReturnType<typeof setTimeout> | null = null
let resizeRaf = 0
let rafId = 0 // v0.5:simulation tick → rAF 合帧渲染的循环句柄
let lastW = 0
let lastH = 0

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

  // v0.5:重建前停掉上一轮 simulation 并清掉未触发的 fit 定时器。
  // ResizeObserver 会直接调 build()(不走 destroy 的 watch 路径),若不在这里
  // 收尾,旧 simulation 会继续在后台跑、旧 setTimeout 会在已移除的 DOM 上触发,
  // 多次 resize 累积成"幽灵 simulation + 定时器"泄漏。
  simulation?.stop()
  if (fitTimer !== null) {
    clearTimeout(fitTimer)
    fitTimer = null
  }
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }

  // v0.5:d3-force 会就地把 link 的 source/target 从字符串改写成节点对象,
  // 并给 node 写入 x/y/vx/vy。直接喂 computed 返回的对象会污染响应式数据,
  // 导致下次重建时 link 已是上一轮的节点引用、forceLink().id() 配不上而丢边。
  // 这里喂浅拷贝,computed 始终保持"纯净的原始形状"。
  const simNodes: GraphNode[] = nodes.value.map((n) => ({ ...n }))
  const simLinks: GraphLink[] = links.value.map((l) => ({
    source: (l.source as GraphNode).id ?? (l.source as unknown as string),
    target: (l.target as GraphNode).id ?? (l.target as unknown as string),
    type: l.type,
  }))

  const svg = d3.select(svgEl)
  svg.selectAll('*').remove()

  const rect = svgEl.getBoundingClientRect()
  const width = Math.max(rect.width, 320)
  const height = Math.max(rect.height, 320)
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const focusedNode = simNodes.find((node) => node.id === props.focusNodeId)
  if (focusedNode) {
    focusedNode.x = width / 2
    focusedNode.y = height / 2
    // 局部图弹窗始终以当前页为视觉锚点。用户仍可拖动它;
    // d3 drag end 会清掉 fx/fy,之后恢复自由布局。
    focusedNode.fx = width / 2
    focusedNode.fy = height / 2
  }

  // 重置 viewBox 与容器实际大小一致,避免 viewBox 缩放和 forceCenter 坐标错位
  svg.attr('viewBox', `0 0 ${width} ${height}`)

  const g = svg.append('g').attr('class', 'ayn-graph-zoom-group')

  const linkSel = g
    .append('g')
    .attr('class', 'ayn-graph-edges')
    .selectAll<SVGLineElement, GraphLink>('line')
    .data(simLinks)
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
    .data(simNodes, (d) => d.id)
    .join('g')
    .attr('class', 'ayn-graph-node')
    .classed('is-current', (d) => d.id === props.focusNodeId)

  const nodeR = (d: GraphNode): number => 4 + Math.min(d.inDegree, 8)
  // v0.5:透明"命中圈" —— 比可见圆大一圈且固定不变,作为稳定的鼠标命中区。
  // 之前 hover 难以命中的根因:① 只有小小的可见圆(半径 4~12px)接收指针,
  // 稍微动一下就脱靶;② hover 时可见圆的 r/stroke 还在做回弹过渡,边缘像素
  // 一直在动,鼠标贴边时命中态反复 on/off → 抖动、标签闪烁。把命中判定交给
  // 这个不动的大透明圈后,视觉特效和命中判定彻底解耦,hover 稳定。
  // 命中半径 = max(可见半径+8, 12),保证小节点也有足够大的可点区域。
  nodeSel
    .append('circle')
    .attr('class', 'ayn-graph-hit')
    .attr('r', (d) => Math.max(nodeR(d) + 8, 12))
  nodeSel
    .append('circle')
    .attr('class', 'ayn-graph-dot')
    .attr('r', nodeR)
  nodeSel
    .append('text')
    .attr('class', 'ayn-graph-label')
    .attr('dy', (d) => nodeR(d) + 11)
    .attr('text-anchor', 'middle')
    .text((d) => d.title)

  // simulation 收敛后 rAF 循环会停;拖拽/交互重新加热时需要把它重新踢起来。
  // 这个闭包在下面定义渲染循环处赋值(此处先占位)。
  let kickRender: () => void = () => {}

  // ── 交互 ─────────────────────────────────────────
  // v0.5:拖拽点击区分 —— 记录按下坐标,移动超过阈值才算拖拽,避免"想点开
  // 笔记结果被当成微小拖拽"。click 里据此判断是否真的导航。
  let dragMoved = false
  nodeSel
    .on('click', (evt: PointerEvent, d) => {
      if (dragMoved) return // 刚才是拖拽,不导航
      evt.stopPropagation()
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
          dragMoved = false
          // 轻轻加热(0.3),并确保渲染循环在跑
          if (!event.active) simulation?.alphaTarget(0.3).restart()
          kickRender()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          dragMoved = true
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation?.alphaTarget(0)
          d.fx = null
          d.fy = null
        }),
    )

  // ── zoom + label 随缩放渐隐(像 Obsidian)────────────────────
  // v0.5 关键修复:之前用 `labelSel.attr('opacity', op)` 设 SVG **属性**,但
  // CSS 里 `.ayn-graph-label { opacity: .5 }` / hover 时的 opacity 是 CSS
  // **属性**(presentation property),按规范 CSS property 永远盖过同名
  // presentation attribute → 缩放设的 attr 根本不生效,标签缩小后不会变淡。
  //
  // 现在改为把"缩放档位透明度"写进 CSS 变量 `--ayn-label-zoom`,CSS 用
  // `opacity: calc(var(--ayn-label-base) * var(--ayn-label-zoom))` 把"缩放
  // 渐隐"和"hover/focus 提亮"两个维度相乘合成,互不打架。
  //
  //   k >= LABEL_FULL  → 1(完全显示)
  //   LABEL_FADE_START..LABEL_FULL → 平滑插值(smoothstep,比线性更顺眼)
  //   k <= LABEL_FADE_START → 0(隐藏,和 Obsidian 缩小后只剩点一致)
  const LABEL_FULL = 1.1
  const LABEL_FADE_START = 0.55
  const INITIAL_FIT_LABEL_FLOOR = 0.45
  const labelSel = g.selectAll<SVGTextElement, GraphNode>('text.ayn-graph-label')
  let didInitialFit = false
  let userAdjustedView = false
  let userAdjustedScale = false
  let lastZoomScale = 1
  const applyLabelZoom = (k: number): void => {
    let t: number
    if (k >= LABEL_FULL) t = 1
    else if (k <= LABEL_FADE_START) t = 0
    else {
      const x = (k - LABEL_FADE_START) / (LABEL_FULL - LABEL_FADE_START)
      t = x * x * (3 - 2 * x) // smoothstep,首尾导数为 0,过渡更丝滑
    }
    // 大型 vault 初始 fit 往往会小于 LABEL_FADE_START。若直接用 0,
    // 用户打开图页时只能看到圆点。在用户亲自缩放前保留一个可读下限;
    // 一旦发生鼠标/触摸缩放,立即恢复完整的渐隐曲线。
    if (!userAdjustedScale) t = Math.max(t, INITIAL_FIT_LABEL_FLOOR)
    // 写到 group 上,CSS 变量继承给所有 label;隐藏时彻底关掉指针事件
    g.style('--ayn-label-zoom', t.toFixed(3))
    labelSel.style('pointer-events', t < 0.05 ? 'none' : null)
  }

  zoomBehavior = d3zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.15, 6])
    // v0.5:放慢滚轮缩放步长,更接近 Obsidian 的细腻缩放手感(默认偏跳)
    .wheelDelta((event) => -event.deltaY * (event.deltaMode === 1 ? 0.025 : 0.0015))
    .on('zoom', (event) => {
      const k = event.transform.k as number
      if (event.sourceEvent) {
        userAdjustedView = true
        // 纯平移不该让大图标签突然变透明;只有用户主动改变缩放
        // 比例后,才解除初始 fit 的可读性下限。
        if (Math.abs(k - lastZoomScale) > 0.0001) userAdjustedScale = true
        if (fitTimer !== null) {
          clearTimeout(fitTimer)
          fitTimer = null
        }
      }
      g.attr('transform', event.transform.toString())
      applyLabelZoom(k)
      lastZoomScale = k
    })
  svg.call(zoomBehavior).call(zoomBehavior.transform, zoomIdentity)
  applyLabelZoom(1) // 初始档位

  const performInitialFit = (): void => {
    if (didInitialFit || userAdjustedView) return
    didInitialFit = true
    if (fitTimer !== null) {
      clearTimeout(fitTimer)
      fitTimer = null
    }
    fitToView(svg, simNodes, width, height)
  }

  // ── 物理 ────────────────────────────────────────────────────
  // v0.5:重调力参数,贴近 Obsidian 的"轻柔铺开、缓慢收敛、不抖"手感。
  //   · alphaDecay 调小 → 收敛更慢更平滑(Obsidian 默认就慢慢飘到位)
  //   · velocityDecay(摩擦)适中,既不过冲也不黏滞
  //   · charge(斥力)随规模缩放,大图收紧避免炸开
  //   · 用 forceX/forceY 提供温和向心力(取代生硬的 forceCenter 跳变,
  //     forceCenter 会每 tick 平移整体质心,大图上看起来"整团一跳一跳")
  const N = simNodes.length
  const isHeavy = N > 200
  const isVeryHeavy = N > 500
  const collideR = isVeryHeavy ? 8 : isHeavy ? 11 : 14
  const cx0 = width / 2
  const cy0 = height / 2

  simulation = forceSimulation<GraphNode>(simNodes)
    // 收敛速度:越小越慢越顺。大图略快以免久久不停。
    .alphaDecay(
      reduceMotion ? 0.65 : isVeryHeavy ? 0.028 : isHeavy ? 0.022 : 0.0165,
    )
    .alphaMin(0.001)
    .velocityDecay(isVeryHeavy ? 0.45 : 0.38)
    .force(
      'link',
      forceLink<GraphNode, GraphLink>(simLinks)
        .id((d) => d.id)
        .distance(isHeavy ? 48 : 66)
        .strength((l) => (l.type === 'transclusion' ? 0.75 : 0.55)),
    )
    .force(
      'charge',
      forceManyBody()
        .strength(isVeryHeavy ? -55 : isHeavy ? -75 : -110)
        .distanceMax(isHeavy ? 400 : 600) // 限制远距斥力计算,既提速又防整体漂移
        .theta(0.9),
    )
    // 温和向心(替代 forceCenter 的硬质心平移),让整团稳稳停在中央
    .force('x', forceX(cx0).strength(0.045))
    .force('y', forceY(cy0).strength(0.045))
    .force(
      'collide',
      forceCollide<GraphNode>()
        .radius((d) => collideR + Math.min(d.inDegree, 6))
        .strength(0.85)
        .iterations(isVeryHeavy ? 1 : 2),
    )

  // ── 渲染:rAF 合帧,每帧只画一次 ────────────────────────────
  // v0.5:之前用 `tick % everyNTh` 跳帧降卡,但跳帧会让运动"一顿一顿"(丢
  // 中间帧)。改为 simulation 自由高频 tick,只置脏标记;真正写 DOM 放到
  // requestAnimationFrame 里、每个渲染帧合并一次 → 既不丢运动连续性,DOM
  // 写入也天然被浏览器节流到屏幕刷新率,大图同样丝滑。
  let dirty = false
  const paint = (): void => {
    linkSel
      .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
      .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
      .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
      .attr('y2', (d) => (d.target as GraphNode).y ?? 0)
    nodeSel.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
  }
  const frame = (): void => {
    if (simulation === null) {
      rafId = 0
      return
    }
    if (dirty) {
      dirty = false
      paint()
    }
    rafId = requestAnimationFrame(frame)
  }
  // 确保渲染循环在跑(收敛停掉后被拖拽/交互重新唤醒时调用)
  kickRender = (): void => {
    if (!rafId) rafId = requestAnimationFrame(frame)
  }
  simulation
    .on('tick', () => {
      dirty = true
    })
    .on('end', () => {
      paint() // 收敛后画一次保证最后一帧精确
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      performInitialFit()
    })
  // 启动渲染循环
  if (rafId) cancelAnimationFrame(rafId)
  rafId = requestAnimationFrame(frame)

  // 兜底:如果 simulation 不收敛,2 秒后强制 fit。
  // v0.5:保存句柄,build() 重建与卸载时清除,避免在已移除的 DOM 上触发。
  fitTimer = setTimeout(() => {
    fitTimer = null
    performInitialFit()
  }, 2000)
}

/**
 * 把所有节点的 bounding box 算出来,zoom transform 到刚好容纳 + 居中。
 * v0.5:节点坐标由 simulation 写在它自己的副本上(见 build 里的 simNodes),
 *       因此从参数传入,不再读 computed `nodes.value`(那是无坐标的纯净副本)。
 *       同时用 reduce 折叠求 min/max,替代 `Math.min(...xs)` 的展开——大图下
 *       几十万参数的 spread 可能触发 RangeError: Maximum call stack size。
 */
function fitToView(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  simNodes: GraphNode[],
  width: number,
  height: number,
): void {
  if (!zoomBehavior || simNodes.length === 0) return
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const n of simNodes) {
    const x = n.x ?? 0
    const y = n.y ?? 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
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
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) svg.call(zoomBehavior.transform, t)
  else svg.transition().duration(450).call(zoomBehavior.transform, t)
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
  if (fitTimer !== null) {
    clearTimeout(fitTimer)
    fitTimer = null
  }
  if (resizeRaf) {
    cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
  }
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
  if (svgRef.value) d3.select(svgRef.value).selectAll('*').remove()
}

onMounted(() => {
  if (svgRef.value && typeof ResizeObserver !== 'undefined') {
    // v0.5:防抖 + 尺寸去重。此前每个 resize tick 都整体重建 simulation,
    // 而重建里的 zoom transition / 节点移动又会改变被观测的盒子尺寸,反过来
    // 再触发 observer → 又一次重建,形成自激循环(典型表现:控制台刷
    // "ResizeObserver loop completed with undelivered notifications",且 CPU 跑满)。
    // 现在仅当宽/高确有变化时,在下一帧重建一次。
    resizeObserver = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect
      if (!cr) return
      if (Math.abs(cr.width - lastW) < 1 && Math.abs(cr.height - lastH) < 1) return
      lastW = cr.width
      lastH = cr.height
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0
        if (data.value) build()
      })
    })
    resizeObserver.observe(svgRef.value)
  }
})

onBeforeUnmount(() => {
  destroy()
  resizeObserver?.disconnect()
  resizeObserver = null
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
