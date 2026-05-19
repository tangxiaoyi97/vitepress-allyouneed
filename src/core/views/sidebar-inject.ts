/**
 * v0.2 — 把 3 个视图条目自动追加到 VitePress sidebar 末尾。
 *
 * VitePress sidebar 可以是:
 *   - 数组(全站统一):`SidebarItem[]`
 *   - 对象(按路径分):`Record<string, SidebarItem[]>`
 *   - undefined(没配置 sidebar)
 *
 * 三种都要处理。我们就地 mutate 数组(VitePress wrapper 阶段调用,改用户传入的
 * config 对象即可)。
 */

import type { ResolvedOptions } from '../types.js'

interface SidebarItem {
  text?: string
  link?: string
  items?: SidebarItem[]
  collapsed?: boolean
  base?: string
}

type SidebarConfig =
  | SidebarItem[]
  | Record<string, SidebarItem[]>
  | undefined

/**
 * 把视图分组追加到 sidebar。返回新 sidebar(如果原来 undefined 会新建)。
 *
 * 调用方负责把返回值赋回 `config.themeConfig.sidebar`。
 */
export function injectViewsSidebar(
  sidebar: SidebarConfig,
  options: ResolvedOptions,
): SidebarConfig {
  if (options.views.sidebar === false) return sidebar
  if (!options.modules.views) return sidebar

  const group = buildViewsGroup(options)
  if (!group) return sidebar // 三个视图都关了

  // 数组形式
  if (Array.isArray(sidebar)) {
    // 防重复:已经追加过的话不再加
    if (!sidebar.some((it) => it.text === group.text)) {
      sidebar.push(group)
    }
    return sidebar
  }

  // 对象形式(per-path)
  if (sidebar && typeof sidebar === 'object') {
    for (const path of Object.keys(sidebar)) {
      const arr = sidebar[path]
      if (Array.isArray(arr) && !arr.some((it) => it.text === group.text)) {
        arr.push(group)
      }
    }
    return sidebar
  }

  // undefined → 新建一个根级 sidebar
  return [group]
}

function buildViewsGroup(options: ResolvedOptions): SidebarItem | null {
  const { enabled, names, sidebarText } = options.views
  const base = options.base.endsWith('/')
    ? options.base.slice(0, -1)
    : options.base
  const items: SidebarItem[] = []
  if (enabled.graph) {
    items.push({ text: sidebarText.graph, link: `${base}/${names.graph}` })
  }
  if (enabled.stats) {
    items.push({ text: sidebarText.stats, link: `${base}/${names.stats}` })
  }
  if (enabled.tags) {
    items.push({ text: sidebarText.tags, link: `${base}/${names.tags}` })
  }
  if (items.length === 0) return null
  return {
    text: sidebarText.group,
    collapsed: true, // 默认折叠,不干扰用户原 sidebar
    items,
  }
}
