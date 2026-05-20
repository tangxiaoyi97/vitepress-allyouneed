<script setup lang="ts">
/**
 * v0.3 — 自定义 Layout:
 *   - 在 doc-before slot 注入 DocHeader
 *   - 监听 frontmatter.cssclasses,挂到 <body> 上(用 mount/unmount 守恒,避免污染其它页)
 *
 * 用户可以 `import Layout from 'vitepress-allyouneed/theme'` 之后自己包二层,
 * 或者直接用我们注册的默认 Theme.Layout
 */
import { onMounted, onUnmounted, watch, computed } from 'vue'
import { useData } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import DocHeader from './DocHeader.vue'

const { frontmatter } = useData()

const cssClasses = computed<string[]>(() => {
  const v = frontmatter.value.cssclasses
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string')
  if (typeof v === 'string') return v.split(/\s+/).filter(Boolean)
  return []
})

const applied: string[] = []

function applyClasses(): void {
  if (typeof document === 'undefined') return
  // 先把上次加的清掉,避免跨页堆积
  for (const c of applied) document.body.classList.remove(c)
  applied.length = 0
  for (const c of cssClasses.value) {
    document.body.classList.add(c)
    applied.push(c)
  }
}

onMounted(applyClasses)
onUnmounted(() => {
  if (typeof document === 'undefined') return
  for (const c of applied) document.body.classList.remove(c)
  applied.length = 0
})
watch(cssClasses, applyClasses)

const LayoutComp = DefaultTheme.Layout
</script>

<template>
  <component :is="LayoutComp">
    <template #doc-before>
      <DocHeader />
    </template>
    <!-- 透传所有其它 slot -->
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData ?? {}" />
    </template>
  </component>
</template>
