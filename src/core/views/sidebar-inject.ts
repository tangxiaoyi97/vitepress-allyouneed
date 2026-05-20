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
  if (!options.modules.views) return sidebar
  const inject = options.views.injectInto
  const group = buildViewsGroup(options)
  if (!group) return sidebar

  // 即使 injectInto='nav' 或 'off',也要给 /_perspectives_/ URL 配 fallback
  // sidebar(per-folder 模式)。否则点 nav 下拉进 graph,左侧 sidebar 找不到
  // key 而显示空。
  const wantSidebar = inject === 'sidebar' || inject === 'both'

  if (Array.isArray(sidebar)) {
    if (wantSidebar && !sidebar.some((it) => it.text === group.text)) {
      sidebar.push(group)
    }
    return sidebar
  }

  if (sidebar && typeof sidebar === 'object') {
    if (wantSidebar) {
      // 每个 per-path sidebar 末尾追加 Perspectives 组
      for (const path of Object.keys(sidebar)) {
        const arr = sidebar[path]
        if (Array.isArray(arr) && !arr.some((it) => it.text === group.text)) {
          arr.push(group)
        }
      }
    }
    // _perspectives_/ 自身的 fallback sidebar(无论哪种 injectInto 都加)。
    // **key 不带 base**(VitePress sidebar 用 site-root 相对前缀做 URL 匹配)
    const prefix = options.views.urlPrefix
      ? options.views.urlPrefix.replace(/^\/+|\/+$/g, '')
      : ''
    if (prefix) {
      const persPath = `/${prefix}/`
      if (!sidebar[persPath]) {
        sidebar[persPath] = buildPerspectivesFallbackSidebar(
          sidebar,
          group,
          options.base.endsWith('/') ? options.base : options.base + '/',
          prefix,
        )
      }
    }
    return sidebar
  }

  return [group]
}

/**
 * 给 _perspectives_/ URL 单独生成一份 sidebar:
 *   - 第一项总是"返回首页"
 *   - 然后每个**其它顶层 path**(/guide/, /tour/, /test/ 等)做成一个简单 link 项,
 *     让用户从视图页能跳回任何 tab(VitePress 不会保留"之前在哪",这是 URL 决定的)
 *   - 最后是 perspectives 组本身
 *
 * v0.3.4:viewsPrefix 参数化(原来硬编码 '_perspectives_')。用户改
 * views.urlPrefix 后,自身路径不再被过滤掉,会冒出一个"前往自己"的死项。
 */
function buildPerspectivesFallbackSidebar(
  allSidebars: Record<string, SidebarItem[]>,
  group: SidebarItem,
  base: string,
  viewsPrefix: string,
): SidebarItem[] {
  // link 都 strip base(VitePress 会自动 prepend)
  const out: SidebarItem[] = [{ text: 'Home', link: '/' }]
  const persSuffix = `/${viewsPrefix}/`
  const topPaths = Object.keys(allSidebars).filter(
    (p) => p !== base && !p.endsWith(persSuffix),
  )
  for (const p of topPaths) {
    const seg =
      p.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() ?? p
    const text = seg.charAt(0).toUpperCase() + seg.slice(1)
    // p 形如 '/vitepress-allyouneed/guide/' → strip base 后 '/guide/'
    const b = base.endsWith('/') ? base : base + '/'
    const stripped = b !== '/' && p.startsWith(b) ? '/' + p.slice(b.length) : p
    out.push({ text, link: stripped })
  }
  out.push(group)
  return out
}

function buildViewsGroup(options: ResolvedOptions): SidebarItem | null {
  const { enabled, names, sidebarText, urlPrefix } = options.views
  // ⚠ link **不带 base** —— VitePress sidebar/nav 约定:配置里 link 用 site-root
  // 相对路径,渲染时 VitePress 自动 prepend base。带了会双重 prefix 404(build 后)。
  const prefixSeg = urlPrefix ? `/${urlPrefix}` : ''
  const items: SidebarItem[] = []
  if (enabled.graph) {
    items.push({ text: sidebarText.graph, link: `${prefixSeg}/${names.graph}` })
  }
  if (enabled.stats) {
    items.push({ text: sidebarText.stats, link: `${prefixSeg}/${names.stats}` })
  }
  if (enabled.tags) {
    items.push({ text: sidebarText.tags, link: `${prefixSeg}/${names.tags}` })
  }
  if (items.length === 0) return null
  return {
    text: sidebarText.group,
    collapsed: true,
    items,
  }
}

// ── v0.3:把 Perspectives 放到 nav 下拉里(per-folder 模式推荐)─────

interface NavItem {
  text: string
  link?: string
  items?: NavItem[]
  activeMatch?: string
}

type NavConfig = NavItem[] | undefined

/**
 * 在 themeConfig.nav 末尾追加一个 Perspectives 下拉。
 * 仅当 views.injectInto ∈ {'nav','both'} 时调用。
 * 如果 nav 里已有同名(views.sidebarText.group)项,跳过避免重复。
 */
export function injectViewsNav(
  nav: NavConfig,
  options: ResolvedOptions,
): NavConfig {
  if (!options.modules.views) return nav
  const inject = options.views.injectInto
  if (inject !== 'nav' && inject !== 'both') return nav

  const group = buildViewsGroup(options)
  if (!group || !group.items || group.items.length === 0) return nav

  const navItem: NavItem = {
    text: group.text!,
    items: group.items.map((it) => ({
      text: it.text!,
      link: it.link!,
    })),
  }

  const arr = Array.isArray(nav) ? [...nav] : []
  if (!arr.some((it) => it.text === navItem.text)) {
    arr.push(navItem)
  }
  return arr
}
