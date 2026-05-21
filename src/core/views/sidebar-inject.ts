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
      // v0.3.6 修(Bug C):空 object / 没匹配根的 object → 也要给 '/' 加一份。
      // 否则用户配 `themeConfig.sidebar = {}` 或 `{ '/guide/': [...] }`
      // 这种"部分 per-path"时,根路径 / 找不到 sidebar key → Perspectives 完全不出现。
      // 给 '/' 兜底一份至少含 group 的 sidebar(若已存在则尊重老逻辑追加 group)
      if (!sidebar['/']) {
        sidebar['/'] = [group]
      } else if (!sidebar['/'].some((it) => it.text === group.text)) {
        sidebar['/'].push(group)
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
  // v0.3.6 修(Bug E):排除 '/'(根 key)。原 filter 只比 base —— 当 base
  // 是 '/sub/' 这种非 '/' 时,'/' 永远 !== base → 进入 topPaths → seg='' →
  // 渲染出一个标题为 '/' 的死项。
  const topPaths = Object.keys(allSidebars).filter(
    (p) => p !== '/' && p !== base && !p.endsWith(persSuffix),
  )
  for (const p of topPaths) {
    const seg =
      p.replace(/^\/|\/$/g, '').split('/').filter(Boolean).pop() ?? p
    if (!seg) continue  // 双保险:seg 还是空就跳
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

// v0.3.6:VitePress nav 也支持 function(动态 / locale-aware nav)
type NavConfig = NavItem[] | (() => NavItem[]) | undefined

/**
 * 在 themeConfig.nav 末尾追加一个 Perspectives 下拉。
 * 仅当 views.injectInto ∈ {'nav','both'} 时调用。
 * 如果 nav 里已有同名(views.sidebarText.group)项,跳过避免重复。
 *
 * v0.3.6 修(Bug D):VitePress nav 可以是 function,老逻辑 Array.isArray(fn)
 * 为 false → arr=[] → 推 Perspectives → 把用户的 nav 函数整个换成 [perspectives]。
 * 现在 typeof === 'function' 时 wrap 一层,保留 user fn 的返回值。
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

  // user nav 是 function → 包一层,把 Perspectives 追加到运行时返回值末尾。
  // 容错:user fn 抛错或返回非数组 → 只用 [navItem],别让整个 nav 崩。
  if (typeof nav === 'function') {
    const userFn = nav
    return () => {
      let arr: NavItem[]
      try {
        const r = userFn()
        arr = Array.isArray(r) ? [...r] : []
      } catch (e) {
        console.warn(
          'vitepress-allyouneed: themeConfig.nav 函数执行失败,仅返回 Perspectives 下拉。',
          e instanceof Error ? e.message : String(e),
        )
        arr = []
      }
      if (!arr.some((it) => it && it.text === navItem.text)) {
        arr.push(navItem)
      }
      return arr
    }
  }

  const arr = Array.isArray(nav) ? [...nav] : []
  if (!arr.some((it) => it.text === navItem.text)) {
    arr.push(navItem)
  }
  return arr
}
