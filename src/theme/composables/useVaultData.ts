/** 共享 vault-data.json 加载 composable */

import { ref, onMounted, type Ref } from 'vue'
import { withBase } from 'vitepress'
import type { VaultData } from '../types.js'

export interface UseVaultDataResult {
  data: Ref<VaultData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  reload: () => Promise<void>
}

/**
 * 校验 parse 出来的 vault-data.json 是否含**组件实际依赖的全部字段**。
 *
 * v0.5:抽成纯函数,既便于单测(composable 本身依赖 vitepress/onMounted 难测),
 * 也明确"契约"。返回缺失字段名数组;为空表示合法。
 *
 * 关键:必须覆盖 tags / meta —— 之前只校验 nodes/edges/stats,这两个缺失时
 * useVaultData 会误判"加载成功",随后 Tags.vue 的 Object.entries(tags)、
 * VaultStats.vue 的 data.meta.generatedAt 在渲染期抛异常整页崩。
 */
export function validateVaultData(parsed: unknown): string[] {
  if (!parsed || typeof parsed !== 'object') return ['<root not an object>']
  const p = parsed as Partial<VaultData>
  const missing: string[] = []
  if (!Array.isArray(p.nodes)) missing.push('nodes')
  if (!Array.isArray(p.edges)) missing.push('edges')
  if (!p.stats || typeof p.stats !== 'object') missing.push('stats')
  if (!p.tags || typeof p.tags !== 'object') missing.push('tags')
  if (!p.meta || typeof p.meta !== 'object') missing.push('meta')
  return missing
}

export function useVaultData(
  fileName: string = 'vault-data.json',
): UseVaultDataResult {
  const data = ref<VaultData | null>(null)
  const loading = ref(true)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const url = withBase('/' + fileName)
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) {
        throw new Error(
          `vault-data.json fetch failed (${res.status}). Make sure ` +
            `vitepress-allyouneed/vite plugin is installed and srcDir is correct.`,
        )
      }
      let parsed: unknown
      try {
        parsed = await res.json()
      } catch (jsonErr) {
        throw new Error(
          `vault-data.json parse failed: ${
            jsonErr instanceof Error ? jsonErr.message : String(jsonErr)
          }`,
        )
      }
      // 校验最小结构,防止 JSON 损坏导致组件运行时崩
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('vault-data.json: top-level is not an object')
      }
      // v0.5:校验覆盖组件实际依赖的全部字段(见 validateVaultData 注释)。
      const missing = validateVaultData(parsed)
      if (missing.length > 0) {
        throw new Error(
          `vault-data.json: missing or invalid fields: ${missing.join(', ')}`,
        )
      }
      data.value = parsed as VaultData
    } catch (err) {
      error.value = err instanceof Error ? err.message : String(err)
      data.value = null
    } finally {
      loading.value = false
    }
  }

  onMounted(load)
  return { data, loading, error, reload: load }
}
