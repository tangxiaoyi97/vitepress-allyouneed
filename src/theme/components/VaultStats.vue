<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { useVaultData } from '../composables/useVaultData.js'

const props = defineProps<{ dataFileName?: string }>()
const { data, loading, error } = useVaultData(props.dataFileName)

const cards = computed(() => {
  if (!data.value) return []
  const s = data.value.stats
  // v0.5:子字段缺失时回退 0,避免 {{ value.toLocaleString() }} 在 undefined 上崩
  return [
    { label: 'Notes', value: s.totalFiles ?? 0 },
    { label: 'Tags', value: s.totalTags ?? 0 },
    { label: 'Links', value: s.totalWikilinks ?? 0 },
    { label: 'Assets', value: s.totalAssets ?? 0 },
  ]
})

// v0.5:mostRecent 子字段可能缺失/为 null,给 v-for 一个稳妥的空数组
const recent = computed(() => data.value?.stats?.mostRecent ?? [])

// v0.5:数字固定用 en-US 千分位,避免随访问者机器语言变化(且若将来改成 SSR
// 预取会引发水合不匹配)。与组件"UI 文案以英文为基准"的设计保持一致。
function fmtNum(n: number): string {
  return (n ?? 0).toLocaleString('en-US')
}

// v0.5:时间戳固定 en-US + UTC 格式化。无参数 toLocaleString 会随运行环境
// locale/时区变化 → SSR 与客户端不一致(水合漂移)、同一静态站不同用户看到的
// 格式不同。固定后稳定且可复现。
const DT_FMT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
})
function fmtDate(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return DT_FMT.format(d) + ' UTC'
}
</script>

<template>
  <div class="ayn-view ayn-stats">
    <div v-if="loading" class="ayn-view-loading">Loading…</div>
    <div v-else-if="error" class="ayn-view-error">Failed to load: {{ error }}</div>
    <template v-else-if="data">
      <div class="ayn-stats-cards">
        <div v-for="c in cards" :key="c.label" class="ayn-stats-card">
          <div class="ayn-stats-number">{{ fmtNum(c.value) }}</div>
          <div class="ayn-stats-label">{{ c.label }}</div>
        </div>
      </div>
      <h2 class="ayn-stats-section-title">Recent activity</h2>
      <ul class="ayn-stats-recent">
        <li v-for="f in recent" :key="f.id">
          <a :href="withBase(f.url)">{{ f.title }}</a>
          <span class="ayn-stats-recent-time">{{ fmtDate(f.mtime) }}</span>
        </li>
      </ul>
      <div v-if="(data.stats.totalWarnings ?? 0) > 0" class="ayn-stats-warnings">
        <strong>⚠ {{ data.stats.totalWarnings }} scan warnings</strong>
        <small>(see dev server logs for details)</small>
      </div>
      <div class="ayn-stats-meta">
        Generated at {{ fmtDate(data.meta.generatedAt) }}
        · vitepress-allyouneed {{ data.meta.pluginVersion }}
      </div>
    </template>
    <div v-else class="ayn-view-empty">No data</div>
  </div>
</template>
