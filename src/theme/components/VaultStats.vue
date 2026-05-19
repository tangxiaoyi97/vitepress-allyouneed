<script setup lang="ts">
/**
 * VaultStats — vault 统计仪表盘。
 *
 * 4 张数字卡片(笔记/标签/链接/资源)+ 最近修改 10 条列表。
 */
import { computed } from 'vue'
import { useVaultData } from '../composables/useVaultData.js'

const { data, loading, error } = useVaultData()

const cards = computed(() => {
  if (!data.value) return []
  const s = data.value.stats
  return [
    { label: '笔记', value: s.totalFiles },
    { label: '标签', value: s.totalTags },
    { label: '链接', value: s.totalWikilinks },
    { label: '资源', value: s.totalAssets },
  ]
})

function fmtDate(ts: number): string {
  if (!ts) return ''
  return new Date(ts).toLocaleString()
}
</script>

<template>
  <div class="ayn-view ayn-stats">
    <div v-if="loading" class="ayn-view-loading">加载中…</div>
    <div v-else-if="error" class="ayn-view-error">加载失败:{{ error }}</div>
    <template v-else-if="data">
      <div class="ayn-stats-cards">
        <div v-for="c in cards" :key="c.label" class="ayn-stats-card">
          <div class="ayn-stats-number">{{ c.value.toLocaleString() }}</div>
          <div class="ayn-stats-label">{{ c.label }}</div>
        </div>
      </div>

      <h2 class="ayn-stats-section-title">最近修改</h2>
      <ul class="ayn-stats-recent">
        <li v-for="f in data.stats.mostRecent" :key="f.id">
          <a :href="f.url">{{ f.title }}</a>
          <span class="ayn-stats-recent-time">{{ fmtDate(f.mtime) }}</span>
        </li>
      </ul>

      <div v-if="data.stats.totalWarnings > 0" class="ayn-stats-warnings">
        <strong>⚠ {{ data.stats.totalWarnings }} 条扫描告警</strong>
        <small>(查 dev server 终端日志查看详情)</small>
      </div>

      <div class="ayn-stats-meta">
        生成于
        {{ new Date(data.meta.generatedAt).toLocaleString() }}
        · vitepress-allyouneed {{ data.meta.pluginVersion }}
      </div>
    </template>
    <div v-else class="ayn-view-empty">无数据</div>
  </div>
</template>
