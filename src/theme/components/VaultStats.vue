<script setup lang="ts">
import { computed } from 'vue'
import { useVaultData } from '../composables/useVaultData.js'

const { data, loading, error } = useVaultData()

const cards = computed(() => {
  if (!data.value) return []
  const s = data.value.stats
  return [
    { label: 'Notes', value: s.totalFiles },
    { label: 'Tags', value: s.totalTags },
    { label: 'Links', value: s.totalWikilinks },
    { label: 'Assets', value: s.totalAssets },
  ]
})

function fmtDate(ts: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="ayn-view ayn-stats">
    <div v-if="loading" class="ayn-view-loading">Loading…</div>
    <div v-else-if="error" class="ayn-view-error">Failed to load: {{ error }}</div>
    <template v-else-if="data">
      <div class="ayn-stats-cards">
        <div v-for="c in cards" :key="c.label" class="ayn-stats-card">
          <div class="ayn-stats-number">{{ c.value.toLocaleString() }}</div>
          <div class="ayn-stats-label">{{ c.label }}</div>
        </div>
      </div>
      <h2 class="ayn-stats-section-title">Recent activity</h2>
      <ul class="ayn-stats-recent">
        <li v-for="f in data.stats.mostRecent" :key="f.id">
          <a :href="f.url">{{ f.title }}</a>
          <span class="ayn-stats-recent-time">{{ fmtDate(f.mtime) }}</span>
        </li>
      </ul>
      <div v-if="data.stats.totalWarnings > 0" class="ayn-stats-warnings">
        <strong>⚠ {{ data.stats.totalWarnings }} scan warnings</strong>
        <small>(see dev server logs for details)</small>
      </div>
      <div class="ayn-stats-meta">
        Generated at {{ new Date(data.meta.generatedAt).toLocaleString() }}
        · vitepress-allyouneed {{ data.meta.pluginVersion }}
      </div>
    </template>
    <div v-else class="ayn-view-empty">No data</div>
  </div>
</template>
