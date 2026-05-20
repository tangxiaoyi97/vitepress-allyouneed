/// <reference path="./vue-shims.d.ts" />

/**
 * vitepress-allyouneed/theme —— 完整 VitePress 主题入口。
 *
 * 用法:
 *   import AllYouNeedTheme from 'vitepress-allyouneed/theme'
 *   import 'vitepress-allyouneed/theme/style.css'
 *   export default AllYouNeedTheme
 *
 * 想覆盖:
 *   import AllYouNeedTheme from 'vitepress-allyouneed/theme'
 *   import MyGraph from './MyGraph.vue'
 *   import './overrides.css'  // 后引入 → 覆盖 --ayn-* 变量
 *   export default {
 *     ...AllYouNeedTheme,
 *     enhanceApp(ctx) {
 *       AllYouNeedTheme.enhanceApp?.(ctx)
 *       ctx.app.component('VaultGraph', MyGraph)
 *     },
 *   }
 */

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import VaultGraph from './components/VaultGraph.vue'
import VaultStats from './components/VaultStats.vue'
import Tags from './components/Tags.vue'
import Layout from './components/Layout.vue'
import DocHeader from './components/DocHeader.vue'

const theme: Theme = {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('VaultGraph', VaultGraph)
    app.component('VaultStats', VaultStats)
    app.component('Tags', Tags)
    app.component('DocHeader', DocHeader)
  },
}

export default theme

export { VaultGraph, VaultStats, Tags, Layout, DocHeader }
export { useVaultData } from './composables/useVaultData.js'
export type {
  VaultData,
  VaultDataNode,
  VaultDataEdge,
  VaultDataTagInfo,
  VaultDataStats,
} from './types.js'
