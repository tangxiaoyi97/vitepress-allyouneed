<script setup lang="ts">
/**
 * Tags 视图 v3 —— 紧凑表格风:
 *   - 顶部搜索框带 search icon(rounded-lg,占满宽度,小 padding)
 *   - Tags 云用 pill chip(rounded-full),active 反色,带 # 图标 + count 徽章
 *   - 笔记区是 table 风:NAME/TAGS 与 DATE 列头 + 单边框容器内所有行
 *   - 每行:FileText icon + 标题 + inline 其它 tags + 右侧 mono path + date
 */
import { computed, ref, onMounted, watch } from 'vue'
import { withBase } from 'vitepress'
import { useVaultData } from '../composables/useVaultData.js'

const props = defineProps<{ dataFileName?: string }>()
const { data, loading, error } = useVaultData(props.dataFileName)
const filter = ref('')
const activeTag = ref<string | null>(null)

const tagList = computed(() => {
  if (!data.value) return []
  const entries = Object.entries(data.value.tags)
  const f = filter.value.trim().toLowerCase()
  const filtered = f
    ? entries.filter(([t]) => t.toLowerCase().includes(f))
    : entries
  return filtered.sort((a, b) => b[1].count - a[1].count)
})

const activeFiles = computed(() => {
  if (!data.value || !activeTag.value) return []
  return data.value.tags[activeTag.value]?.files ?? []
})

function selectTag(tag: string): void {
  activeTag.value = tag
  if (typeof window !== 'undefined') {
    history.replaceState(null, '', '#' + encodeURIComponent(tag))
  }
}

function initSelection(): void {
  if (!data.value) return
  if (activeTag.value && data.value.tags[activeTag.value]) return
  const first = tagList.value[0]
  if (first) activeTag.value = first[0]
}

onMounted(() => {
  if (typeof window === 'undefined') return
  const hash = window.location.hash.replace(/^#/, '')
  if (hash) {
    try { activeTag.value = decodeURIComponent(hash) } catch { /* */ }
  }
})

watch(data, (d) => {
  if (!d) return
  if (activeTag.value && !d.tags[activeTag.value]) activeTag.value = null
  initSelection()
}, { immediate: true })

function fmtDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  // v0.5:用 UTC 取年月日,避免 getFullYear/getMonth/getDate 的本地时区导致
  // 跨日边界日期随访问者时区变化(与其它组件统一,也防未来 SSR 化水合漂移)。
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function basename(p: string): string {
  const idx = p.lastIndexOf('/')
  return idx === -1 ? p : p.slice(idx + 1)
}

// v0.5:单行内联 tag 数量上限。此前一条笔记的 otherTags 全部平铺(实测最多 7 个),
// 每个 pill 不收缩且无 wrap,会把标题挤成几个字,破坏"标题为主角"的版式。
// 现在最多显示前 N 个,其余折叠成 "+M" 徽章。
const MAX_INLINE_TAGS = 3
function shownTags(tags: string[]): string[] {
  return (tags ?? []).slice(0, MAX_INLINE_TAGS)
}
function extraTagCount(tags: string[]): number {
  return Math.max(0, (tags?.length ?? 0) - MAX_INLINE_TAGS)
}
</script>

<template>
  <div class="ayn-view ayn-tags">
    <div v-if="loading" class="ayn-view-loading">Loading…</div>
    <div v-else-if="error" class="ayn-view-error">Failed to load: {{ error }}</div>
    <template v-else-if="data">
      <!-- ── Search ─────────────────────────────────── -->
      <div class="ayn-tags-search">
        <span class="ayn-tags-search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          v-model="filter"
          type="search"
          placeholder="Search tags..."
        />
      </div>

      <!-- ── Tags cloud(pill chips)──────────────────── -->
      <div class="ayn-tags-cloud-card">
        <div v-if="tagList.length === 0" class="ayn-tags-empty">
          No tags found matching "{{ filter }}"
        </div>
        <div v-else class="ayn-tags-chips">
          <button
            v-for="[tag, info] in tagList"
            :key="tag"
            class="ayn-tag-chip"
            :class="{ 'is-active': activeTag === tag }"
            :title="`${info.count} notes`"
            @click="selectTag(tag)"
          >
            <span class="ayn-tag-chip-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="4" x2="20" y1="9" y2="9" />
                <line x1="4" x2="20" y1="15" y2="15" />
                <line x1="10" x2="8" y1="3" y2="21" />
                <line x1="16" x2="14" y1="3" y2="21" />
              </svg>
            </span>
            <span class="ayn-tag-chip-name">{{ tag }}</span>
            <span class="ayn-tag-chip-count">{{ info.count }}</span>
          </button>
        </div>
      </div>

      <!-- ── Notes 表格 ─────────────────────────────── -->
      <div v-if="activeTag" class="ayn-tag-notes">
        <div class="ayn-tag-notes-table-header">
          <span class="ayn-tag-notes-table-header-name">NAME / TAGS</span>
          <span class="ayn-tag-notes-table-header-date">DATE</span>
        </div>
        <ul v-if="activeFiles.length" class="ayn-tag-notes-table">
          <li
            v-for="f in activeFiles"
            :key="f.id"
            class="ayn-tag-note-row"
          >
            <a :href="withBase(f.url)" class="ayn-tag-note-row-link">
              <div class="ayn-tag-note-row-left">
                <span class="ayn-tag-note-row-title" :title="f.title">{{ f.title }}</span>
                <span
                  v-for="ot in shownTags(f.otherTags)"
                  :key="ot"
                  class="ayn-tag-note-row-othertag"
                >{{ ot }}</span>
                <span
                  v-if="extraTagCount(f.otherTags) > 0"
                  class="ayn-tag-note-row-othertag ayn-tag-note-row-othertag--more"
                  :title="f.otherTags.join(', ')"
                >+{{ extraTagCount(f.otherTags) }}</span>
              </div>
              <div class="ayn-tag-note-row-right">
                <span class="ayn-tag-note-row-path">{{ basename(f.path) }}</span>
                <span class="ayn-tag-note-row-date">{{ fmtDate(f.mtime) }}</span>
              </div>
            </a>
          </li>
        </ul>
        <div v-else class="ayn-tag-notes-empty">
          No notes found in this tag.
        </div>
      </div>
    </template>
    <div v-else class="ayn-view-empty">No data</div>
  </div>
</template>
