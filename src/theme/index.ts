/// <reference path="./vue-shims.d.ts" />

/**
 * vitepress-allyouneed/theme —— VitePress 主题入口。
 *
 * ━━ 三种用法,按"自定义程度"升序 ━━
 *
 * ## 1. 零配置(用 VitePress 默认主题 + 本插件视觉)
 *
 *     // .vitepress/theme/index.ts
 *     export { default } from 'vitepress-allyouneed/theme'
 *
 * 拿到 DefaultTheme + 5 个全局组件(VaultGraph / Tags / VaultStats / DocHeader /
 * LocalGraph)
 * + 一个自动注入 DocHeader 的 Layout + 全套 CSS。
 *
 * ## 2. 自定义 Layout / 注册更多组件 / 换某个视图实现
 *
 *     import { defineTheme } from 'vitepress-allyouneed/theme'
 *     import MyLayout from './MyLayout.vue'
 *     import MyCustomGraph from './MyCustomGraph.vue'
 *     export default defineTheme({
 *       Layout: MyLayout,                                // 作为基础 Layout,仍注入 DocHeader
 *       enhanceApp({ app }) {
 *         app.component('VaultGraph', MyCustomGraph)     // 同名注册自动覆盖我们的
 *       },
 *     })
 *
 * ## 3. 嵌别人写的主题(`extends:` 一个 3rd-party theme)
 *
 *     import { defineTheme } from 'vitepress-allyouneed/theme'
 *     import SomeAwesomeTheme from 'some-awesome-vitepress-theme'
 *     export default defineTheme({ extends: SomeAwesomeTheme })
 *
 *     // 该 3rd-party 主题完全**不需要知道本插件存在**:
 *     //   - 用户在主题入口后置 import 的 CSS 按正常 cascade 覆盖我们
 *     //   - 它的同名组件注册自动覆盖我们(Vue last-registration-wins)
 *
 * ━━ 给主题包作者的提示 ━━
 *
 * 写一个普通的 VitePress 主题,publish 上 npm。最终用户负责 1 行 `defineTheme()`
 * 把你的主题嵌进去。你的工作流跟有没有这个插件**完全没关系**。
 */

import { defineComponent, h, type Component } from 'vue'
import type { Theme, EnhanceAppContext } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

import VaultGraph from './components/VaultGraph.vue'
import VaultStats from './components/VaultStats.vue'
import Tags from './components/Tags.vue'
import Layout from './components/Layout.vue'
import DocHeader from './components/DocHeader.vue'
import LocalGraph from './components/LocalGraph.vue'

// Side-effect import:全套 CSS。用户可在主题入口后置 import 自定义 CSS覆盖。
import './styles/index.css'

/**
 * Theme.extends 可以多层嵌套。VitePress 会合并其它钩子,但我们要先找到
 * 最终的 Layout,再包一层注入 DocHeader。
 */
function resolveBaseLayout(theme: Theme | undefined): Component {
  const seen = new Set<Theme>()
  let current = theme
  while (current && !seen.has(current)) {
    seen.add(current)
    if (current.Layout && current.Layout !== Layout) return current.Layout
    current = current.extends
  }
  return DefaultTheme.Layout
}

function wrapLayout(baseLayout: Component): Component {
  return defineComponent({
    name: 'AllyouneedThemeLayout',
    setup(_props, { slots }) {
      return () => h(Layout, { layout: baseLayout }, slots)
    },
  })
}

/**
 * 工厂:产出一个完整 Theme 对象,合并我们组件 + 用户传入的覆盖。
 *
 * 默认行为(传 `{}` 或不传):`extends: DefaultTheme`、`Layout: 我们的 Layout`、
 * 注册 5 个全局组件。
 *
 * 任何传入项**覆盖**我们对应的默认:
 *   - `extends`     → 用你给的 base theme 替代 DefaultTheme
 *   - `Layout`      → 用你的 Layout 作为基础,再注入 `<DocHeader />`
 *   - `enhanceApp`  → 在我们 enhanceApp 之后跑(同名注册自动赢)
 *   - `setup`       → 在我们 setup 之后跑
 */
export function defineTheme(userTheme: Partial<Theme> = {}): Theme {
  const baseTheme = userTheme.extends ?? DefaultTheme
  const baseLayout =
    userTheme.Layout && userTheme.Layout !== Layout
      ? userTheme.Layout
      : resolveBaseLayout(baseTheme)

  return {
    extends: baseTheme,
    Layout: wrapLayout(baseLayout),
    NotFound: userTheme.NotFound,
    setup() {
      userTheme.setup?.()
    },
    enhanceApp(ctx: EnhanceAppContext) {
      // 1. 注册我们 5 个组件 —— 用户没传 enhanceApp 就用我们默认
      ctx.app.component('VaultGraph', VaultGraph)
      ctx.app.component('VaultStats', VaultStats)
      ctx.app.component('Tags', Tags)
      ctx.app.component('DocHeader', DocHeader)
      ctx.app.component('LocalGraph', LocalGraph)
      // 2. 跑用户 enhanceApp —— 同名注册的赢(Vue last-registration-wins)
      userTheme.enhanceApp?.(ctx)
    },
  }
}

/** 默认导出 = 零配置 preset(已含 DefaultTheme + 我们全套) */
const theme: Theme = defineTheme()
export default theme

// 显式 named exports:让重度用户能从组件 level 拼接
export { VaultGraph, VaultStats, Tags, Layout, DocHeader, LocalGraph }
export { useVaultData } from './composables/useVaultData.js'
export type {
  VaultData,
  VaultDataNode,
  VaultDataEdge,
  VaultDataTagInfo,
  VaultDataStats,
  LocalGraphConfig,
  DocHeaderConfig,
  AllyouneedThemeConfig,
} from './types.js'
