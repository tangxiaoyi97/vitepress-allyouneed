/**
 * v0.2 — 把 3 个视图条目自动追加到 VitePress sidebar 末尾。
 *
 * 支持 array / object(per-path)/ undefined 三种 sidebar 形态。
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

export function injectViewsSidebar(
  sidebar: SidebarConfig,
  options: ResolvedOptions,
): SidebarConfig {
  if (options.views.sidebar === false) return sidebar
  if (!options.modules.views) return sidebar

  const group = buildViewsGroup(options)
  if (!group) return sidebar

  if (Array.isArray(sidebar)) {
    if (!sidebar.some((it) => it.text === group.text)) sidebar.push(group)
    return sidebar
  }

  if (sidebar && typeof sidebar === 'object') {
    for (const path of Object.keys(sidebar)) {
      const arr = sidebar[path]
      if (Array.isArray(arr) && !arr.some((it) => it.text === group.text)) {
        arr.push(group)
      }
    }
    return sidebar
  }

  return [group]
}

function buildViewsGroup(options: ResolvedOptions): SidebarItem | null {
  const { enabled, names, sidebarText, urlPrefix } = options.views
  const base = options.base.endsWith('/')
    ? options.base.slice(0, -1)
    : options.base
  // 视图的 URL 段:`<base>/<prefix>/<name>`(prefix 为空时退化为 `<base>/<name>`)
  const prefixSeg = urlPrefix ? `/${urlPrefix}` : ''
  const items: SidebarItem[] = []
  if (enabled.graph) {
    items.push({
      text: sidebarText.graph,
      link: `${base}${prefixSeg}/${names.graph}`,
    })
  }
  if (enabled.stats) {
    items.push({
      text: sidebarText.stats,
      link: `${base}${prefixSeg}/${names.stats}`,
    })
  }
  if (enabled.tags) {
    items.push({
      text: sidebarText.tags,
      link: `${base}${prefixSeg}/${names.tags}`,
    })
  }
  if (items.length === 0) return null
  return {
    text: sidebarText.group,
    collapsed: true,
    items,
  }
}
