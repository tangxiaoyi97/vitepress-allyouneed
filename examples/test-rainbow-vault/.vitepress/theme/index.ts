/**
 * test-rainbow-vault —— 0.5.0-beta 主题覆盖机制的端到端测试。
 *
 * 三个测试一起跑:
 *   1. theme.css 用 `.vp-doc h1` selector 覆盖 VitePress 默认 H1 为彩虹色
 *      → 验证"unlayered 后声明者赢"(我们 CSS 在 plugin / VP CSS 之后 import)
 *   2. theme.css 用 `.wikilink` selector 覆盖插件 wikilink 为上下翻转
 *      → 验证"unlayered 永远赢 layered"(@layer 横扫一切)
 *   3. 下面 enhanceApp 注册 `VaultStats` → 替换插件默认组件
 *      → 验证 defineTheme() 内部把用户 enhanceApp 排在自己之后跑
 *        (Vue 同名注册 last-wins → 我们这条 app.component 覆盖默认)
 *
 * 跑:`cd examples/test-rainbow-vault && npm install && npm run dev`
 */

import { defineTheme } from 'vitepress-allyouneed/theme'
import MyVaultStats from './MyVaultStats.vue'

// ⚠ import 顺序关键:
//   defineTheme 这条 import 触发插件 @layer-wrapped CSS 加载;
//   本文件这条 './theme.css' 在那之后加载 → 用户 CSS 顺序上更晚。
//   - 对 VP 默认 .vp-doc h1(unlayered):我们 unlayered + 后加载 → 我们赢
//   - 对插件 .wikilink(layered):我们 unlayered → 我们赢(@layer 规则,与顺序无关)
import './theme.css'

export default defineTheme({
  enhanceApp({ app }) {
    // defineTheme 内部:先 app.component('VaultStats', PluginDefault),再调本函数。
    // Vue 同名注册"后注册者赢" → 这一行替换掉插件默认。
    app.component('VaultStats', MyVaultStats)
  },
})
