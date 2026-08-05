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
import LocalGraphPreview from './LocalGraphPreview.vue'

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
const currentTitle = computed(() =>
  currentId.value
    ? miniSlice.value?.nodes.find((node) => node.id === currentId.value)?.title ??
      page.value.title
    : '',
)
const visible = computed(() =>
  active.value && Boolean(miniSlice.value && miniSlice.value.nodes.length > 1),
)

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

function closeModal(): void {
  modalOpen.value = false
}

onMounted(() => {
  viewportQuery = window.matchMedia('(max-width: 1279px)')
  syncViewport()
  viewportQuery.addEventListener('change', syncViewport)
})

onBeforeUnmount(() => {
  viewportQuery?.removeEventListener('change', syncViewport)
  viewportQuery = null
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

</script>

<template>
  <div
    v-if="visible"
    class="ayn-local-graph"
    :class="`ayn-local-graph--${mode}`"
  >
    <template v-if="mode === 'aside'">
      <LocalGraphPreview
        :edges="miniSlice!.edges"
        :positions="positions"
        :current-id="currentId!"
        :current-title="currentTitle"
        @open="openModal"
      />
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
