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
      const p = parsed as Partial<VaultData>
      if (!Array.isArray(p.nodes) || !Array.isArray(p.edges) || !p.stats) {
        throw new Error('vault-data.json: missing required fields')
      }
      data.value = p as VaultData
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
