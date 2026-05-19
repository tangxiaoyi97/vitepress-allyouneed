<script setup lang="ts">
/**
 * Tags — 标签云 + 点击展开笔记列表。
 *
 * - 标签字号按 count 归一化(min 0.85em / max 1.6em)
 * - 顶部搜索框过滤
 * - 点击标签:展开/折叠该标签下笔记
 * - URL hash 同步:打开页面带 #tag-name 自动展开并滚动
 */
import { computed, ref, onMounted, watch } from 'vue'
import { useVaultData } from '../composables/useVaultData.js'

const { data, loading, error } = useVaultData()
const filter = ref('')
const expandedTag = ref<string | null>(null)

/** 排序后的标签数组,大写键不区分(显示用原 key) */
const tagList = computed(() => {
  if (!data.value) return []
  const entries = Object.entries(data.value.tags)
  const f = filter.value.trim().toLowerCase()
  const filtered = f
    ? entries.filter(([t]) => t.toLowerCase().includes(f))
    : entries
  return filtered.sort((a, b) => b[1].count - a[1].count)
})

/** 计算字号:count 最大→1.6em,最小→0.85em,线性映射 */
const fontSizeMap = computed(() => {
  const m = new Map<string, string>()
  if (!data.value) return m
  const counts = Object.values(data.value.tags).map((t) => t.count)
  if (counts.length === 0) return m
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  for (const [tag, info] of Object.entries(data.value.tags)) {
    const t = max === min ? 0.5 : (info.count - min) / (max - min)
    const size = 0.85 + t * 0.75 // 0.85 ~ 1.60 em
    m.set(tag, size.toFixed(2) + 'em')
  }
  return m
})

function toggleTag(tag: string): void {
  expandedTag.value = expandedTag.value === tag ? null : tag
  if (typeof window !== 'undefined') {
    if (expandedTag.value) {
      history.replaceState(null, '', '#' + encodeURIComponent(tag))
    } else {
      history.replaceState(null, '', window.location.pathname)
    }
  }
}

onMounted(() => {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) {
    try {
      expandedTag.value = decodeURIComponent(hash)
    } catch {
      /* ignore */
    }
  }
})

// data 加载完后,若 hash 指向某 tag,确认它存在
watch(data, (d) => {
  if (!d || !expandedTag.value) return
  if (!d.tags[expandedTag.value]) {
    expandedTag.value = null
  }
})
</script>

<template>
  <div class="ayn-view ayn-tags">
    <div v-if="loading" class="ayn-view-loading">加载中…</div>
    <div v-else-if="error" class="ayn-view-error">加载失败:{{ error }}</div>
    <template v-else-if="data">
      <input
        v-model="filter"
        type="search"
        class="ayn-tags-filter"
        placeholder="过滤标签…"
      />

      <div v-if="tagList.length === 0" class="ayn-view-empty">
        {{ filter ? '没有匹配的标签' : '还没有标签,在 frontmatter 加 tags: 或正文用 #tag' }}
      </div>

      <div class="ayn-tags-cloud">
        <button
          v-for="[tag, info] in tagList"
          :key="tag"
          class="ayn-tags-cloud-item"
          :class="{ 'is-active': expandedTag === tag }"
          :style="{ fontSize: fontSizeMap.get(tag) }"
          :title="`${info.count} 篇笔记`"
          @click="toggleTag(tag)"
        >
          #{{ tag }}
          <sup>{{ info.count }}</sup>
        </button>
      </div>

      <div v-if="expandedTag && data.tags[expandedTag]" class="ayn-tags-expand">
        <div class="ayn-tags-expand-header">
          #{{ expandedTag }}
          <small>({{ data.tags[expandedTag].count }} 篇)</small>
        </div>
        <ul class="ayn-tags-expand-list">
          <li v-for="f in data.tags[expandedTag].files" :key="f.id">
            <a :href="f.url">{{ f.title }}</a>
          </li>
        </ul>
      </div>
    </template>
    <div v-else class="ayn-view-empty">无数据</div>
  </div>
</template>
