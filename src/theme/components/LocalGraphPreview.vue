<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import type { VaultDataEdge } from '../types.js'
import type { LocalGraphPosition } from '../local-graph.js'

const props = defineProps<{
  edges: VaultDataEdge[]
  positions: LocalGraphPosition[]
  currentId: string
  currentTitle: string
}>()
const emit = defineEmits<{ open: [] }>()

const previewPositions = ref(props.positions.map((position) => ({ ...position })))
const positionMap = computed(() =>
  new Map(previewPositions.value.map((position) => [position.id, position])),
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
let suppressClick = false
let suppressClickTimer: ReturnType<typeof setTimeout> | null = null

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
  suppressClick = previewDrag.moved
  if (suppressClickTimer) clearTimeout(suppressClickTimer)
  suppressClickTimer = suppressClick
    ? setTimeout(() => {
        suppressClick = false
        suppressClickTimer = null
      }, 0)
    : null
  const { captureTarget, pointerId } = previewDrag
  if (captureTarget.hasPointerCapture(pointerId)) {
    captureTarget.releasePointerCapture(pointerId)
  }
  previewDrag = null
  draggedNodeId.value = null
}

function releaseDragCapture(): void {
  if (!previewDrag) return
  const { captureTarget, pointerId } = previewDrag
  if (captureTarget.hasPointerCapture(pointerId)) {
    captureTarget.releasePointerCapture(pointerId)
  }
  previewDrag = null
}

function handleClick(): void {
  if (suppressClick) {
    suppressClick = false
    if (suppressClickTimer) clearTimeout(suppressClickTimer)
    suppressClickTimer = null
    return
  }
  emit('open')
}

function leaveNode(id: string): void {
  if (draggedNodeId.value !== id && hoveredNodeId.value === id) {
    hoveredNodeId.value = null
  }
}

function resetInteraction(): void {
  releaseDragCapture()
  previewPositions.value = props.positions.map((position) => ({ ...position }))
  hoveredNodeId.value = null
  draggedNodeId.value = null
  suppressClick = false
  if (suppressClickTimer) clearTimeout(suppressClickTimer)
  suppressClickTimer = null
}

watch(() => props.positions, resetInteraction)
onBeforeUnmount(() => {
  releaseDragCapture()
  if (suppressClickTimer) clearTimeout(suppressClickTimer)
})
</script>

<template>
  <button
    type="button"
    class="ayn-local-graph-preview"
    aria-haspopup="dialog"
    :aria-label="`Interactive local graph for ${currentTitle}. Drag nodes or open the expanded graph.`"
    @click="handleClick"
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
          v-for="(edge, index) in edges"
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
