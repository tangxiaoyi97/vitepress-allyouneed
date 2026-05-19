/**
 * 三个视图共用的数据加载 composable。
 *
 * - 从 /<base>/<dataFileName>(默认 vault-data.json)fetch
 * - 组件挂载时拉一次;HMR 触发时(dev)由 Vite 的 ?import 缓存破坏自动重拉
 * - 提供 loading / error / data 三态
 */

import { ref, onMounted, type Ref } from 'vue'
import { withBase } from 'vitepress'
import type { VaultData } from '../types.js'

export interface UseVaultDataResult {
  data: Ref<VaultData | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  /** 手动重新 fetch(用户在 UI 上点刷新时用)*/
  reload: () => Promise<void>
}

/**
 * @param fileName 默认 'vault-data.json'
 */
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
      // withBase 把 '/vault-data.json' 加上 base 前缀;dev/build 都对
      const url = withBase('/' + fileName)
      const res = await fetch(url, { cache: 'no-cache' })
      if (!res.ok) {
        throw new Error(`fetch ${url} → ${res.status}`)
      }
      data.value = (await res.json()) as VaultData
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
