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
 *   srcExclude: ['drafts/**'],
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
import { generateViewMarkdown } from './core/views/generate-md.js'
import { generateSidebar, generateNav } from './core/sidebar-auto/index.js'
import { generateSidebarMaterializations } from './core/sidebar-auto/generate-sidebar-materialize.js'
import { scanVault } from './core/vault/index.js'
import { scanWikilinks, logDeadLinks } from './core/scan-wikilinks.js'

// v0.4.1:module-level once-flag for autoFolderIndex deprecation warn,以免 dev
// 模式 server.restart() 反复刷屏。
let autoFolderIndexWarned = false
let mathHintShown = false

/**
 * v0.4.1:用户在 vitepress config 写 `markdown: { math: true }` 时,VitePress 期望
 * `markdown-it-mathjax3` 已被 npm install。我们的 wrapper 检测一下,若缺包,**只**
 * 提示安装命令(不抛错、不阻塞 — VitePress 自己也只会 warn 然后跳过 math 渲染)。
 *
 * 不把 markdown-it-mathjax3 当 hard dep,因为:
 *   1. 大多数 vault 用不到 math(纯文本笔记)
 *   2. mathjax3 ~3MB,默认带上对所有用户不友好
 *
 * 设为 optional peer dep(package.json peerDependenciesMeta)。
 */
async function maybeHintMathPackage(config: UserConfig): Promise<void> {
  if (mathHintShown) return
  const md = config.markdown as { math?: unknown } | undefined
  // `math: true` 或 `math: { ... }`(plain object)→ 用户要 math 支持。
  // null / 数组 / undefined / false → 不要,跳过。
  const wantsMath =
    md?.math === true ||
    (md?.math !== null &&
      !Array.isArray(md?.math) &&
      typeof md?.math === 'object')
  if (!wantsMath) return
  mathHintShown = true
  // **注意**:`markdown-it-mathjax3` 是 optional peer dep,可能没装。用变量绕开
  // 静态类型解析(否则 tsc 会报 TS2307 找不到模块)。运行时 catch 即可。
  const modName = 'markdown-it-mathjax3'
  try {
    await import(modName)
  } catch {
    console.warn(
      '[vitepress-allyouneed] `markdown.math: true` set but `markdown-it-mathjax3` is missing.\n' +
        '  Install it once:  npm i -D markdown-it-mathjax3\n' +
        '  (then no further setup — VitePress + this plugin will pick it up automatically.)',
    )
  }
}

export function defineConfigWithAllYouNeed(
  config: UserConfig,
  pluginOptions: AllYouNeedOptions = {},
): UserConfig {
  // VitePress 的 srcExclude 也合并进我们扫描器,两边对同一份文件集合
  const vpExclude = Array.isArray(config.srcExclude) ? config.srcExclude : []
  const externalSlugify = (
    config.markdown as
      | { anchor?: { slugify?: (text: string) => string } }
      | undefined
  )?.anchor?.slugify

  const mergedOptions: AllYouNeedOptions = {
    ...pluginOptions,
    srcDir: pluginOptions.srcDir ?? config.srcDir,
    base: pluginOptions.base ?? config.base,
    cleanUrls: pluginOptions.cleanUrls ?? config.cleanUrls,
    rewrites: pluginOptions.rewrites ?? config.rewrites,
    slugify: pluginOptions.slugify ?? externalSlugify,
    scan: {
      ...pluginOptions.scan,
      exclude: [
        ...(pluginOptions.scan?.exclude ?? []),
        ...vpExclude,
      ],
    },
  }

  // v0.4.1:若用户开了 markdown.math,提示安装 markdown-it-mathjax3(fire-and-forget)
  void maybeHintMathPackage(config)

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

  // VitePress discovers source pages before Vite's configResolved hook runs.
  // Generate view entry Markdown while evaluating the wrapper so a clean
  // checkout builds Graph/Stats/Tags on its first invocation. The Vite plugin
  // regenerates sentinel-owned files later for direct Vite integrations.
  if (resolvedForWrapper.modules.views) {
    try {
      const report = generateViewMarkdown(
        resolvedForWrapper,
        scanVault(resolvedForWrapper),
      )
      for (const skipped of report.skipped) {
        console.warn(
          `vitepress-allyouneed: skipped ${skipped.path}: ${skipped.reason}`,
        )
      }
    } catch (error) {
      if (
        resolvedForWrapper.onAliasConflict === 'error' &&
        error instanceof Error &&
        error.message.includes('alias conflict')
      ) {
        throw error
      }
      console.warn(
        'vitepress-allyouneed: early view generation failed; Vite will retry during startup.',
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const newMarkdownConfig = (md: MarkdownIt) => {
    // 1. 装我们的 inline/block 规则
    allYouNeedMarkdownIt(md, mergedOptions)

    // 2. v0.2:正文 #tag 规则
    if (
      resolvedForWrapper.modules.views &&
      resolvedForWrapper.views.enabled.tags &&
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

  // 主题组件无法直接读取 Vite 插件选项,因此把它们收敛到
  // themeConfig.allyouneed。用户手写的主题层字段最后合并,可单独调整 UI。
  const applyAllyouneedThemeConfig = (target: Record<string, unknown>): void => {
    const existing =
      typeof target.allyouneed === 'object' && target.allyouneed !== null
        ? target.allyouneed as Record<string, unknown>
        : {}
    const existingLocalGraph =
      typeof existing.localGraph === 'object' && existing.localGraph !== null
        ? existing.localGraph as Record<string, unknown>
        : {}
    target.allyouneed = {
      ...existing,
      viewsUrlPrefix: existing.viewsUrlPrefix ?? resolvedForWrapper.views.urlPrefix,
      viewsNames: existing.viewsNames ?? resolvedForWrapper.views.names,
      dataFileName: existing.dataFileName ?? resolvedForWrapper.views.dataFileName,
      localGraph: {
        ...resolvedForWrapper.views.localGraph,
        ...existingLocalGraph,
        // modules.views=false 时不会生成 vault-data.json。
        enabled:
          resolvedForWrapper.modules.views &&
          Boolean(
            existingLocalGraph.enabled ??
              resolvedForWrapper.views.localGraph.enabled,
          ),
      },
    }
  }
  applyAllyouneedThemeConfig(themeConfig)

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
        // v0.3.10:autoFolderIndex 已删除。文件夹链接由 folderLinkOrder
        // 配置在 sidebar / nav / wikilink 解析时直接解决 —— 不再写文件。
        // 用户仍传 autoFolderIndex(老配置)→ 提示一次(每个 process 一次,
        // 避免 dev 模式 server.restart 重复刷屏)。
        if (sidebarAuto.autoFolderIndex !== undefined && !autoFolderIndexWarned) {
          autoFolderIndexWarned = true
          console.warn(
            '[vitepress-allyouneed] `sidebarAuto.autoFolderIndex` was removed in v0.4.0. ' +
              'No-op now — please delete this field from your .vitepress/config.ts. ' +
              'Folder URLs are resolved via `folderLinkOrder` ' +
              '(default: same-name → index → README → first-file). ' +
              'Old index.md files with our sentinel can be deleted by hand.',
          )
        }
        // v0.3.9:materialize _sidebar.md(默认 off,opt-in 才生成)
        const materializeMode = (sidebarAuto.materialize as
          | 'off'
          | 'top-level'
          | 'all'
          | undefined) ?? 'off'
        if (materializeMode !== 'off') {
          try {
            generateSidebarMaterializations(resolvedForWrapper, {
              mode: materializeMode,
            })
          } catch (e) {
            console.warn(
              'vitepress-allyouneed: sidebar materialize generation failed, skipping.',
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
          if (resolvedForWrapper.deadLink === 'error') throw e
          // 不阻塞,但要让用户看见(否则 debug "为什么死链不报" 太痛苦)
          console.warn(
            'vitepress-allyouneed: scanWikilinks failed, skipping dead-link summary.',
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
        const localePrefixes = localeKeys.map((lang) =>
          localePrefix(localesObj?.[lang]?.link, lang),
        )

        themeConfig.sidebar = generateSidebar(index, resolvedForWrapper, {
          ...sidebarAuto,
          excludePrefixes: [
            ...(sidebarAuto.excludePrefixes ?? []),
            ...localePrefixes, // 根 sidebar 排除掉所有 locale 子树
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
                {
                  ...sidebarAuto,
                  includePrefix: localePrefix(localeCfg.link, lang),
                },
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
        if (
          resolvedForWrapper.onAliasConflict === 'error' &&
          e instanceof Error &&
          e.message.includes('alias conflict')
        ) {
          throw e
        }
        if (
          resolvedForWrapper.deadLink === 'error' &&
          e instanceof Error &&
          e.message.includes('dead link')
        ) {
          throw e
        }
        console.warn(
          'vitepress-allyouneed: sidebar auto-generation failed, skipping.',
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

  // VitePress 对 locale themeConfig 做浅合并。locale 若自己定义了
  // allyouneed 会遮住顶层值,所以对已有 locale 配置再合并一次。
  const localesForTheme = (config as {
    locales?: Record<string, { themeConfig?: Record<string, unknown> }>
  }).locales
  if (localesForTheme) {
    for (const locale of Object.values(localesForTheme)) {
      if (locale.themeConfig) applyAllyouneedThemeConfig(locale.themeConfig)
    }
  }

  return {
    ...config,
    // `_sidebar.md` is plugin metadata, not a VitePress page. Keep it in the
    // vault scan (for override parsing) while excluding it from page builds.
    srcExclude: [...new Set([...vpExclude, '_sidebar.md', '**/_sidebar.md'])],
    vite: newVite,
    themeConfig,
    markdown: {
      ...existingMarkdown,
      config: newMarkdownConfig,
    },
  }
}

function localePrefix(link: string | undefined, fallback: string): string {
  const normalized = (link ?? fallback).replace(/^\/+|\/+$/g, '')
  return normalized || fallback
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
