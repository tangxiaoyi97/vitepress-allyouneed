<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import VaultGraph from './VaultGraph.vue'
import type { VaultData } from '../types.js'

const props = defineProps<{
  vaultData: VaultData
  focusNodeId: string
  title: string
  maxNodes: number
}>()
const emit = defineEmits<{ close: [] }>()

const dialogRef = ref<HTMLElement | null>(null)
const closeRef = ref<HTMLButtonElement | null>(null)
const titleId = `ayn-local-graph-title-${useId().replace(/:/g, '')}`
let previousFocus: HTMLElement | null = null
let previousBodyOverflow = ''

function close(): void {
  emit('close')
}

function focusableElements(): HTMLElement[] {
  if (!dialogRef.value) return []
  return [...dialogRef.value.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
      'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )].filter((element) => !element.hasAttribute('hidden'))
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    close()
    return
  }
  if (event.key !== 'Tab') return

  const focusable = focusableElements()
  if (focusable.length === 0) {
    event.preventDefault()
    dialogRef.value?.focus()
    return
  }
  const first = focusable[0]!
  const last = focusable[focusable.length - 1]!
  const active = document.activeElement
  if (event.shiftKey && (active === first || !dialogRef.value?.contains(active))) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement
    ? document.activeElement
    : null
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  document.addEventListener('keydown', onKeydown)
  void nextTick(() => closeRef.value?.focus())
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousBodyOverflow
  previousFocus?.focus()
})
</script>

<template>
  <Teleport to="body">
    <div class="ayn-local-graph-modal" @mousedown.self="close">
      <section
        ref="dialogRef"
        class="ayn-local-graph-dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        tabindex="-1"
      >
        <header class="ayn-local-graph-dialog-header">
          <div>
            <span class="ayn-local-graph-dialog-eyebrow">Local graph</span>
            <h2 :id="titleId">{{ props.title }}</h2>
          </div>
          <button
            ref="closeRef"
            type="button"
            class="ayn-local-graph-dialog-close"
            aria-label="Close local graph"
            @click="close"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div class="ayn-local-graph-dialog-body">
          <VaultGraph
            :vault-data="props.vaultData"
            :focus-node-id="props.focusNodeId"
            :max-nodes="props.maxNodes"
          />
        </div>
        <p class="ayn-local-graph-dialog-hint">
          Drag nodes to rearrange · Scroll or pinch to zoom · Select a node to open it
        </p>
      </section>
    </div>
  </Teleport>
</template>
