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

  const newMarkdownConfig = (md: MarkdownIt) => {
    // 1. 装我们的 inline/block 规则
    allYouNeedMarkdownIt(md, mergedOptions)

    // 2. 装一条 core 规则,在 'normalize' 之前把 vault index/options 注入 state.env
    md.core.ruler.before(
      'normalize',
      'allyouneed_env_inject',
      makeEnvInjector(vitePlugin),
    )

    // 3. 让用户原 markdown.config 继续生效
    if (typeof existingConfig === 'function') {
      existingConfig(md)
    }
  }

  return {
    ...config,
    vite: newVite,
    markdown: {
      ...existingMarkdown,
      config: newMarkdownConfig,
    },
  }
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
