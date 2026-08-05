<script setup lang="ts">
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue'
import { useData, useRoute } from 'vitepress'
import { useVaultData } from '../composables/useVaultData.js'
import {
  buildLocalGraph,
  findCurrentNodeId,
  isLocalGraphPageEligible,
  layoutLocalGraph,
  resolveLocalGraphConfig,
  sliceVaultData,
} from '../local-graph.js'
import type { AllyouneedThemeConfig } from '../types.js'

const props = withDefaults(defineProps<{
  mode?: 'aside' | 'mobile-button'
}>(), {
  mode: 'aside',
})

const LocalGraphModal = defineAsyncComponent(
  () => import('./LocalGraphModal.vue'),
)

const { frontmatter, page, theme, site } = useData()
const route = useRoute()
const rawThemeConfig = computed<AllyouneedThemeConfig>(() => {
  const value = theme.value as { allyouneed?: AllyouneedThemeConfig }
  return value.allyouneed ?? {}
})
const config = computed(() =>
  resolveLocalGraphConfig(rawThemeConfig.value.localGraph),
)
const viewNames = computed(() => rawThemeConfig.value.viewsNames ?? {
  graph: 'graph',
  stats: 'stats',
  tags: 'tags',
})
const dataFileName = rawThemeConfig.value.dataFileName ?? 'vault-data.json'
const source = useVaultData(dataFileName, { immediate: false })

const viewportEligible = ref(false)
const modalOpen = ref(false)
let viewportQuery: MediaQueryList | null = null

const pageEligible = computed(() =>
  isLocalGraphPageEligible(
    page.value.relativePath ?? '',
    frontmatter.value as Record<string, unknown>,
    rawThemeConfig.value.viewsUrlPrefix ?? '_perspectives_',
    viewNames.value,
  ),
)
const active = computed(() =>
  config.value.enabled && pageEligible.value && viewportEligible.value,
)
const currentId = computed(() => {
  if (!source.data.value) return null
  return findCurrentNodeId(
    source.data.value,
    page.value.relativePath ?? '',
    route.path,
    site.value.base,
  )
})
const miniSlice = computed(() => {
  if (!source.data.value || !currentId.value) return null
  return buildLocalGraph(
    source.data.value,
    currentId.value,
    config.value.depth,
    config.value.maxNodes,
  )
})
const modalSlice = computed(() => {
  if (!source.data.value || !currentId.value) return null
  return buildLocalGraph(
    source.data.value,
    currentId.value,
    config.value.modalDepth,
    config.value.modalMaxNodes,
  )
})
const modalData = computed(() =>
  source.data.value && modalSlice.value
    ? sliceVaultData(source.data.value, modalSlice.value)
    : null,
)
const positions = computed(() =>
  miniSlice.value ? layoutLocalGraph(miniSlice.value) : [],
)
const previewPositions = ref(positions.value.map((position) => ({ ...position })))
const positionMap = computed(() =>
  new Map(previewPositions.value.map((position) => [position.id, position])),
)
const nodeMap = computed(() =>
  new Map((miniSlice.value?.nodes ?? []).map((node) => [node.id, node])),
)
const hoveredNodeId = ref<string | null>(null)
const draggedNodeId = ref<string | null>(null)
const hoveredNodePosition = computed(() =>
  hoveredNodeId.value ? positionMap.value.get(hoveredNodeId.value) ?? null : null,
)
const hoveredNodeLabel = computed(() =>
  hoveredNodeId.value ? nodeFileName(hoveredNodeId.value) : '',
)
const hoveredNodeTooltipStyle = computed(() => {
  const position = hoveredNodePosition.value
  if (!position) return undefined
  return {
    left: `${position.x / 2.4}%`,
    top: `${position.y / 1.5}%`,
    transform: position.y < 34
      ? 'translate(-50%, 10px)'
      : 'translate(-50%, calc(-100% - 10px))',
  }
})
const currentTitle = computed(() =>
  currentId.value ? nodeMap.value.get(currentId.value)?.title ?? page.value.title : '',
)
const visible = computed(() =>
  active.value && Boolean(miniSlice.value && miniSlice.value.nodes.length > 1),
)

interface PreviewDragState {
  id: string
  pointerId: number
  startClientX: number
  startClientY: number
  startNodeX: number
  startNodeY: number
  captureTarget: SVGCircleElement
  moved: boolean
}

let previewDrag: PreviewDragState | null = null
let suppressPreviewClick = false
let suppressPreviewClickTimer: ReturnType<typeof setTimeout> | null = null

function syncViewport(): void {
  const isCompact = viewportQuery?.matches ?? false
  viewportEligible.value = props.mode === 'aside'
    ? !isCompact
    : isCompact && config.value.mobile === 'button'
}

function openModal(): void {
  if (!modalData.value || !currentId.value) return
  modalOpen.value = true
}

function handlePreviewClick(): void {
  if (suppressPreviewClick) {
    suppressPreviewClick = false
    if (suppressPreviewClickTimer) clearTimeout(suppressPreviewClickTimer)
    suppressPreviewClickTimer = null
    return
  }
  openModal()
}

function closeModal(): void {
  modalOpen.value = false
}

function edgeKey(source: string, target: string, index: number): string {
  return `${source}\0${target}\0${index}`
}

function nodeFileName(id: string): string {
  const fileName = id.split('/').pop() ?? id
  const noteName = fileName.replace(/\.(?:md|markdown)$/i, '')
  try {
    return decodeURIComponent(noteName)
  } catch {
    return noteName
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function startNodeDrag(event: PointerEvent, id: string): void {
  if (event.button !== 0) return
  const position = positionMap.value.get(id)
  const captureTarget = event.currentTarget
  if (!position || !(captureTarget instanceof SVGCircleElement)) return

  event.preventDefault()
  captureTarget.setPointerCapture(event.pointerId)
  hoveredNodeId.value = id
  draggedNodeId.value = id
  previewDrag = {
    id,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startNodeX: position.x,
    startNodeY: position.y,
    captureTarget,
    moved: false,
  }
}

function moveNodeDrag(event: PointerEvent): void {
  if (!previewDrag || event.pointerId !== previewDrag.pointerId) return
  const svg = event.currentTarget
  if (!(svg instanceof SVGSVGElement)) return

  event.preventDefault()
  const rect = svg.getBoundingClientRect()
  const clientDeltaX = event.clientX - previewDrag.startClientX
  const clientDeltaY = event.clientY - previewDrag.startClientY
  if (!previewDrag.moved && Math.hypot(clientDeltaX, clientDeltaY) >= 3) {
    previewDrag.moved = true
  }

  const x = clamp(
    previewDrag.startNodeX + clientDeltaX * (240 / rect.width),
    10,
    230,
  )
  const y = clamp(
    previewDrag.startNodeY + clientDeltaY * (150 / rect.height),
    10,
    140,
  )
  previewPositions.value = previewPositions.value.map((position) =>
    position.id === previewDrag?.id ? { ...position, x, y } : position,
  )
}

function endNodeDrag(event: PointerEvent): void {
  if (!previewDrag || event.pointerId !== previewDrag.pointerId) return
  suppressPreviewClick = previewDrag.moved
  if (suppressPreviewClickTimer) clearTimeout(suppressPreviewClickTimer)
  suppressPreviewClickTimer = suppressPreviewClick
    ? setTimeout(() => {
        suppressPreviewClick = false
        suppressPreviewClickTimer = null
      }, 0)
    : null
  const { captureTarget, pointerId } = previewDrag
  if (captureTarget.hasPointerCapture(pointerId)) {
    captureTarget.releasePointerCapture(pointerId)
  }
  previewDrag = null
  draggedNodeId.value = null
}

function leaveNode(id: string): void {
  if (draggedNodeId.value !== id && hoveredNodeId.value === id) {
    hoveredNodeId.value = null
  }
}

onMounted(() => {
  viewportQuery = window.matchMedia('(max-width: 1279px)')
  syncViewport()
  viewportQuery.addEventListener('change', syncViewport)
})

onBeforeUnmount(() => {
  viewportQuery?.removeEventListener('change', syncViewport)
  viewportQuery = null
  if (suppressPreviewClickTimer) clearTimeout(suppressPreviewClickTimer)
})

watch(
  active,
  (isActive) => {
    if (isActive && !source.data.value && !source.loading.value) {
      void source.reload()
    }
    if (!isActive) closeModal()
  },
  { immediate: true },
)

watch(currentId, (next, previous) => {
  if (previous && next !== previous) closeModal()
})

watch(
  positions,
  (next) => {
    previewPositions.value = next.map((position) => ({ ...position }))
    hoveredNodeId.value = null
    draggedNodeId.value = null
    previewDrag = null
    suppressPreviewClick = false
    if (suppressPreviewClickTimer) clearTimeout(suppressPreviewClickTimer)
    suppressPreviewClickTimer = null
  },
)
</script>

<template>
  <div
    v-if="visible"
    class="ayn-local-graph"
    :class="`ayn-local-graph--${mode}`"
  >
    <template v-if="mode === 'aside'">
      <button
        type="button"
        class="ayn-local-graph-preview"
        aria-haspopup="dialog"
        :aria-label="`Interactive local graph for ${currentTitle}. Drag nodes or open the expanded graph.`"
        @click="handlePreviewClick"
      >
        <svg
          viewBox="0 0 240 150"
          role="img"
          :aria-label="`Local graph for ${currentTitle}`"
          @pointermove="moveNodeDrag"
          @pointerup="endNodeDrag"
          @pointercancel="endNodeDrag"
        >
          <g class="ayn-local-graph-preview-edges" aria-hidden="true">
            <line
              v-for="(edge, index) in miniSlice!.edges"
              :key="edgeKey(edge.source, edge.target, index)"
              :x1="positionMap.get(edge.source)?.x"
              :y1="positionMap.get(edge.source)?.y"
              :x2="positionMap.get(edge.target)?.x"
              :y2="positionMap.get(edge.target)?.y"
              :class="{ 'is-embed': edge.type === 'transclusion' }"
            />
          </g>
          <g class="ayn-local-graph-preview-nodes">
            <g
              v-for="position in previewPositions"
              :key="position.id"
              class="ayn-local-graph-preview-node"
              :class="{
                'is-hovered': position.id === hoveredNodeId,
                'is-dragging': position.id === draggedNodeId,
              }"
            >
              <circle
                class="ayn-local-graph-preview-node-dot"
                :class="{ 'is-current': position.id === currentId }"
                :cx="position.x"
                :cy="position.y"
                :r="position.id === currentId ? 6 : 3.5"
              />
              <circle
                class="ayn-local-graph-preview-hit"
                :cx="position.x"
                :cy="position.y"
                r="12"
                @pointerenter="hoveredNodeId = position.id"
                @pointerleave="leaveNode(position.id)"
                @pointerdown.stop="startNodeDrag($event, position.id)"
              />
            </g>
          </g>
        </svg>
        <span
          v-if="hoveredNodeLabel && hoveredNodePosition"
          class="ayn-local-graph-tooltip"
          :style="hoveredNodeTooltipStyle"
        >{{ hoveredNodeLabel }}</span>
      </button>
    </template>

    <button
      v-else
      type="button"
      class="ayn-local-graph-mobile-trigger"
      aria-haspopup="dialog"
      :aria-label="`Open local graph for ${currentTitle}`"
      @click="openModal"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="6" cy="12" r="2.25" />
        <circle cx="17" cy="6" r="2.25" />
        <circle cx="18" cy="17" r="2.25" />
        <path d="m8 11 7-4M8 13l8 3" />
      </svg>
      <span>Graph</span>
      <span class="ayn-local-graph-count">{{ miniSlice!.nodes.length }}</span>
    </button>

    <LocalGraphModal
      v-if="modalOpen && modalData && currentId"
      :vault-data="modalData"
      :focus-node-id="currentId"
      :title="currentTitle"
      :max-nodes="config.modalMaxNodes"
      @close="closeModal"
    />
  </div>
</template>
