/**
 * vitepress-allyouneed/theme —— 完整 VitePress 主题入口。
 *
 * 用法:
 *
 * ```ts
 * // .vitepress/theme/index.ts
 * import AllYouNeedTheme from 'vitepress-allyouneed/theme'
 * export default AllYouNeedTheme
 * ```
 *
 * 想覆盖:
 *
 * ```ts
 * import AllYouNeedTheme from 'vitepress-allyouneed/theme'
 * import MyCustomGraph from './MyCustomGraph.vue'
 * import './my-overrides.css'  // 后引入 → 覆盖我们的 --ayn-* 变量
 *
 * export default {
 *   ...AllYouNeedTheme,
 *   enhanceApp(ctx) {
 *     AllYouNeedTheme.enhanceApp?.(ctx)
 *     ctx.app.component('VaultGraph', MyCustomGraph)
 *   },
 * }
 * ```
 *
 * 自动做的事:
 *   - 继承 VitePress DefaultTheme(extends 字段)
 *   - 全局 register 三个组件:VaultGraph / VaultStats / Tags
 *   - 引入默认样式(.css 全用 CSS variables,易覆盖)
 *
 * 不做的事:
 *   - 不修改 layout(用户想自定义 Layout 完全自由)
 *   - 不偷偷加 enhanceAppWithTabs / 全局指令 之类的副作用
 */

import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import VaultGraph from './components/VaultGraph.vue'
import VaultStats from './components/VaultStats.vue'
import Tags from './components/Tags.vue'

// 注意:**这里故意不 import .css**。CSS 由用户在 theme 入口单独 import,
// 见下面 JSDoc。原因:tsup 处理 .css import 行为不稳;让 Vite 直接处理最干净。

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('VaultGraph', VaultGraph)
    app.component('VaultStats', VaultStats)
    app.component('Tags', Tags)
  },
}

export default theme

// 也单独导出每个组件,方便用户单独 import / 局部 register
export { VaultGraph, VaultStats, Tags }
export { useVaultData } from './composables/useVaultData.js'
export type {
  VaultData,
  VaultDataNode,
  VaultDataEdge,
  VaultDataTagInfo,
  VaultDataStats,
} from './types.js'
