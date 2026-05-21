/**
 * VitePress 接入入口 —— defineConfigWithAllYouNeed 零配置 wrapper。
 *
 * 用法:
 *
 * ```ts
 * // .vitepress/config.ts
 * import { defineConfigWithAllYouNeed } from 'vitepress-allyouneed/vitepress'
 *
 * export default defineConfigWithAllYouNeed({
 *   title: 'My Vault',
 *   srcDir: '../my-vault',
 *   cleanUrls: true,
 *   // ⚠️ index.md 和 README.md 同目录会冲突(都路由到 '/')。建议二选一:
 *   srcExclude: ['README.md'],
 * }, {
 *   onConflict: 'shortest',
 * })
 * ```
 *
 * 这个 wrapper 做的事:
 *   1. 创建 Vite 插件实例并注入 vite.plugins
 *   2. 在 markdown.config 中注册我们的 inline/block 规则
 *   3. 注册一条 markdown-it core 规则,在 'normalize' 阶段把 vault index/options
 *      就地注入 state.env(详见 makeEnvInjector 内的注释 —— 这一步**必须就地修改**,
 *      不能新建 env 对象,否则会让 VitePress 读不到 @mdit-vue/plugin-frontmatter
 *      写回的 frontmatter,从而导致首页 404)
 *   4. 把 srcDir/base/cleanUrls/srcExclude 等从 VitePress 配置同步给插件
 */

import type { UserConfig } from 'vitepress'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedOptions, AllYouNeedEnv } from './core/types.js'
import { viteAllYouNeed } from './vite.js'
import allYouNeedMarkdownIt from './markdown-it.js'
import { resolveOptions } from './core/config-bridge.js'
import { registerTagsInline } from './modules/tags/index.js'
import { injectViewsSidebar, injectViewsNav } from './core/views/sidebar-inject.js'
import { generateSidebar, generateNav } from './core/sidebar-auto/index.js'
import { generateFolderIndexes } from './core/sidebar-auto/generate-folder-index.js'
import { scanVault } from './core/vault/index.js'
import { scanWikilinks, logDeadLinks } from './core/scan-wikilinks.js'

export function defineConfigWithAllYouNeed(
  config: UserConfig,
  pluginOptions: AllYouNeedOptions = {},
): UserConfig {
  // VitePress 的 srcExclude 也合并进我们扫描器,两边对同一份文件集合
  const vpExclude = Array.isArray(config.srcExclude) ? config.srcExclude : []

  const mergedOptions: AllYouNeedOptions = {
    ...pluginOptions,
    srcDir: pluginOptions.srcDir ?? config.srcDir,
    base: pluginOptions.base ?? config.base,
    cleanUrls: pluginOptions.cleanUrls ?? config.cleanUrls,
    scan: {
      ...pluginOptions.scan,
      exclude: [
        ...(pluginOptions.scan?.exclude ?? []),
        ...vpExclude,
      ],
    },
  }

  // Vite 插件(扫描 vault、暴露 __getIndex/__getOptions、装 resolveId/load)
  const vitePlugin = viteAllYouNeed(mergedOptions)

  // 合并 vite 配置 —— 详见 src/vite.ts 注释,这里用 any 化处理 plugins,
  // 因为 vite 的 PluginOption 类型递归很深,精确类型会让 wrapper 越写越脆
  const existingVite = (
    typeof config.vite === 'object' && config.vite !== null
      ? config.vite
      : {}
  ) as Record<string, unknown>
  const existingPlugins: unknown[] = Array.isArray(existingVite.plugins)
    ? (existingVite.plugins as unknown[])
    : []
  const newVite = {
    ...existingVite,
    plugins: [...existingPlugins, vitePlugin] as never[],
  } as UserConfig['vite']

  // 合并 markdown 配置
  const existingMarkdown = config.markdown ?? {}
  const existingConfig = (existingMarkdown as { config?: unknown }).config

  // v0.2:wrapper 内解析一次选项,供 sidebar 注入和 tags 开关判断
  const resolvedForWrapper = resolveOptions(mergedOptions, {
    srcDir: mergedOptions.srcDir ?? config.srcDir,
    base: mergedOptions.base ?? config.base,
    cleanUrls: mergedOptions.cleanUrls ?? config.cleanUrls,
  })

  const newMarkdownConfig = (md: MarkdownIt) => {
    // 1. 装我们的 inline/block 规则
    allYouNeedMarkdownIt(md, mergedOptions)

    // 2. v0.2:正文 #tag 规则
    if (
      resolvedForWrapper.modules.views &&
      resolvedForWrapper.views.parseInlineTags
    ) {
      registerTagsInline(md)
    }

    // 3. 装一条 core 规则,在 'normalize' 之前把 vault index/options 注入 state.env
    md.core.ruler.before(
      'normalize',
      'allyouneed_env_inject',
      makeEnvInjector(vitePlugin),
    )

    // 4. 让用户原 markdown.config 继续生效
    if (typeof existingConfig === 'function') {
      existingConfig(md)
    }
  }

  // v0.2/v0.3:自动注入视图条目 + sidebar 自动生成
  const themeConfig = (config.themeConfig ?? {}) as Record<string, unknown>

  // v0.3:sidebar 自动生成
  //   - mode='off'           不动
  //   - mode='fill-if-empty' 仅当用户没提供 sidebar 时填(默认)
  //   - mode='force'         覆盖
  // 依赖 viteplugin.__getIndex(),但 index 在 Vite buildStart 才填好,所以这里
  // 用懒解析:把 themeConfig.sidebar 设为一个 getter,首次访问时再扫
  const sidebarAuto = resolvedForWrapper.sidebarAuto
  const sidebarMode = sidebarAuto.mode ?? 'fill-if-empty'
  if (sidebarMode !== 'off') {
    const userProvided = themeConfig.sidebar !== undefined
    const shouldFill = sidebarMode === 'force' || !userProvided
    if (shouldFill) {
      // 同步路径:scanVault 已在 Vite buildStart 跑过(若 dev/build);
      // 但 defineConfigWithAllYouNeed 时 buildStart 还没到 —— 此时 index 为空。
      // 解决:这里立即跑一次 scanVault(成本约 100ms,可接受),用结果生成 sidebar。
      // Vite buildStart 时 viteplugin 会再扫一次,index 实例不同但内容一致。
      try {
        // v0.3:autoFolderIndex —— 在 scan 前给缺 index 的目录建一份 index.md。
        // 支持三种模式:'off' / 'top-level'(默认) / 'all'。
        // 兼容旧写法:true → 'top-level',false → 'off'。
        const folderOpts = normalizeAutoFolderIndex(
          sidebarAuto.autoFolderIndex,
          sidebarAuto.stripNumericPrefix,
        )
        // v0.3.5:把 sidebarAuto.groupLink 透传给模板(默认 'all'),让默认
        // 模板里的子文件夹标题遵守和 sidebar 一致的可点性规则。
        folderOpts.groupLink = sidebarAuto.groupLink ?? 'all'
        if (folderOpts.mode !== 'off') {
          try {
            generateFolderIndexes(resolvedForWrapper, folderOpts)
          } catch (e) {
            console.warn(
              'vitepress-allyouneed: autoFolderIndex 生成失败,跳过。',
              e instanceof Error ? e.message : String(e),
            )
          }
        }
        const index = scanVault(resolvedForWrapper)
        // 启动时把所有死 wikilink 集中 warn 一次,免得只能 dev 打开每页才能看到
        try {
          const report = scanWikilinks(index, resolvedForWrapper)
          logDeadLinks(report, resolvedForWrapper.deadLink)
        } catch (e) {
          // 不阻塞,但要让用户看见(否则 debug "为什么死链不报" 太痛苦)
          console.warn(
            'vitepress-allyouneed: scanWikilinks 失败,跳过死链汇总。',
            e instanceof Error ? e.message : String(e),
          )
        }
        // v0.3:i18n 支持 — 用户配了 themeConfig.locales(VitePress 原生 i18n),
        // 对每个 non-root locale 自动用 includePrefix 生成对应 sidebar,
        // root sidebar 用 excludePrefixes 排掉这些 locale 子树。
        const localesObj = (config as { locales?: Record<string, { link?: string; themeConfig?: Record<string, unknown> }> }).locales
        const localeKeys = localesObj
          ? Object.keys(localesObj).filter((k) => k !== 'root')
          : []

        themeConfig.sidebar = generateSidebar(index, resolvedForWrapper, {
          ...sidebarAuto,
          excludePrefixes: [
            ...(sidebarAuto.excludePrefixes ?? []),
            ...localeKeys, // 根 sidebar 排除掉所有 locale 子树
          ],
        })

        // 每个 non-root locale 各自生成 sidebar(在它自己的 themeConfig 里)
        if (localesObj) {
          for (const lang of localeKeys) {
            const localeCfg = localesObj[lang]!
            if (!localeCfg.themeConfig) localeCfg.themeConfig = {}
            if (localeCfg.themeConfig.sidebar === undefined) {
              localeCfg.themeConfig.sidebar = generateSidebar(
                index,
                resolvedForWrapper,
                { ...sidebarAuto, includePrefix: lang },
              )
            }
          }
        }

        // v0.3:autoNav 开启时,nav 没写就自动填(每个顶层目录一个 tab)
        if (sidebarAuto.autoNav && themeConfig.nav === undefined) {
          themeConfig.nav = generateNav(
            index,
            resolvedForWrapper,
            sidebarAuto,
          )
        }
      } catch (e) {
        console.warn(
          'vitepress-allyouneed: sidebar 自动生成失败,跳过。',
          e instanceof Error ? e.message : String(e),
        )
      }
    }
  }

  if (resolvedForWrapper.modules.views) {
    themeConfig.sidebar = injectViewsSidebar(
      themeConfig.sidebar as Parameters<typeof injectViewsSidebar>[0],
      resolvedForWrapper,
    )
    // v0.3:也可注入到 nav(views.injectInto: 'nav' | 'both')
    themeConfig.nav = injectViewsNav(
      themeConfig.nav as Parameters<typeof injectViewsNav>[0],
      resolvedForWrapper,
    )
    // v0.3 i18n:每个 locale 的 themeConfig 也注入 sidebar + nav。
    // v0.3.6 修(Bug A):**不再跳 root locale**。VitePress 1.6 渲染时:
    //   themeConfig = { ...siteData.themeConfig, ...siteData.locales[k]?.themeConfig }
    // 是浅 merge:locale 的 nav / sidebar 整个**替换**顶层。所以用户写
    //   locales: { root: { themeConfig: { nav: [...] }}}
    // 这种 VitePress 标准做法时,顶层 themeConfig.nav 我们注入了 Perspectives
    // 也没用 —— 渲染时被 root.themeConfig.nav 覆盖掉了。必须同时注入 root.
    //
    // v0.3.4 历史修过(a)非 root locale sidebar 没过 injectViewsSidebar 和
    // (b)nav 仅在已定义时注入;现在统一所有 locale(含 root)。
    const localesForViews = (config as { locales?: Record<string, { themeConfig?: Record<string, unknown> }> }).locales
    if (localesForViews) {
      for (const lang of Object.keys(localesForViews)) {
        const lc = localesForViews[lang]!
        if (!lc.themeConfig) lc.themeConfig = {}
        // sidebar 注入(若已生成过则在原 sidebar 上加;否则保持 undefined 不动)
        if (lc.themeConfig.sidebar !== undefined) {
          lc.themeConfig.sidebar = injectViewsSidebar(
            lc.themeConfig.sidebar as Parameters<typeof injectViewsSidebar>[0],
            resolvedForWrapper,
          )
        }
        // nav 注入(undefined / array 都接受;function 会被 injectViewsNav
        // 检测并跳过 + 警告,见 sidebar-inject.ts)
        const navInjected = injectViewsNav(
          lc.themeConfig.nav as Parameters<typeof injectViewsNav>[0],
          resolvedForWrapper,
        )
        if (navInjected !== undefined) {
          lc.themeConfig.nav = navInjected
        }
      }
    }
  }

  return {
    ...config,
    vite: newVite,
    themeConfig,
    markdown: {
      ...existingMarkdown,
      config: newMarkdownConfig,
    },
  }
}

/**
 * 把 sidebarAuto.autoFolderIndex(union 类型)归一化成 generateFolderIndexes
 * 接受的对象形式。**默认 mode = 'top-level'**(用户没显式传时)。
 */
function normalizeAutoFolderIndex(
  v: unknown,
  globalStripNumericPrefix: boolean | undefined,
): {
  mode: 'off' | 'top-level' | 'all'
  exclude?: string[]
  stripNumericPrefix?: boolean
  template?: import('./core/sidebar-auto/generate-folder-index.js').FolderIndexOptions['template']
  /** v0.3.5:caller 再覆盖 */
  groupLink?: 'all' | 'top-level' | 'off'
} {
  let mode: 'off' | 'top-level' | 'all' = 'top-level'
  let exclude: string[] | undefined
  let strip: boolean | undefined = globalStripNumericPrefix
  let template:
    | import('./core/sidebar-auto/generate-folder-index.js').FolderIndexOptions['template']
    | undefined

  if (v === undefined || v === null) {
    // 用默认 'top-level'
  } else if (v === false || v === 'off') {
    mode = 'off'
  } else if (v === true || v === 'top-level') {
    mode = 'top-level'
  } else if (v === 'all') {
    mode = 'all'
  } else if (typeof v === 'object') {
    const obj = v as {
      mode?: 'off' | 'top-level' | 'all'
      enabled?: boolean
      exclude?: string[]
      stripNumericPrefix?: boolean
      template?: import('./core/sidebar-auto/generate-folder-index.js').FolderIndexOptions['template']
    }
    if (obj.mode) {
      mode = obj.mode
    } else if (obj.enabled === false) {
      mode = 'off'
    } else if (obj.enabled === true) {
      mode = 'top-level'
    }
    exclude = obj.exclude
    if (obj.stripNumericPrefix !== undefined) strip = obj.stripNumericPrefix
    template = obj.template
  }

  return { mode, exclude, stripNumericPrefix: strip, template }
}

/**
 * 构造 markdown-it core 规则,职责:**就地** mutate state.env 注入 vault 数据。
 *
 * ─ 为什么必须就地 mutate,不能新建 env ─
 *
 * VitePress 的 markdown 渲染流程大致是:
 *
 * ```ts
 * const env = { relativePath, realPath, ... }
 * const html = md.render(src, env)
 * const { __data, frontmatter, headers, ... } = env  // 读回!
 * ```
 *
 * `@mdit-vue/plugin-frontmatter` 等 markdown-it 插件会通过 mutate `state.env`
 * 把 frontmatter 写到 `env.__data` 上;VitePress 之后从同一个 env 引用读取。
 *
 * 如果我们在中间 wrap 一层,把 env 换成新对象传给 md.render,新对象上的 mutation
 * 不会反映到 VitePress 的原 env → frontmatter / pageData 丢失 → 路由空 → 404。
 *
 * 用 core ruler 在 markdown-it 内部插入一步处理,直接 mutate state.env(就是
 * VitePress 传进来的同一个对象),既能注入我们的数据又不破坏 VitePress 的链路。
 */
function makeEnvInjector(
  vitePlugin: ReturnType<typeof viteAllYouNeed>,
): (state: { env?: unknown }) => void {
  return (state) => {
    const env = state.env as
      | (Record<string, unknown> & Partial<AllYouNeedEnv>)
      | undefined
    if (!env) return
    if (env.index && env.options) return // 已注入

    const index = vitePlugin.__getIndex()
    const options = vitePlugin.__getOptions()
    if (!index || !options) return

    env.index = index
    env.options = options
    if (!env.currentPath) {
      env.currentPath =
        typeof env.realPath === 'string'
          ? env.realPath
          : typeof env.path === 'string'
            ? env.path
            : undefined
    }
    if (!env.referencedAssets) env.referencedAssets = new Set()
  }
}

export default defineConfigWithAllYouNeed
