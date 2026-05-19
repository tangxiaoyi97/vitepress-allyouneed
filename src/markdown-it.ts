/**
 * markdown-it 入口。
 *
 * 高级用法:用户自己创建 markdown-it 实例,然后 md.use(allYouNeed, options)。
 * 此模式下需要由调用方负责提供 VaultIndex(通过 markdown-it env)。
 *
 * 用法示例:
 *
 * ```ts
 * import allYouNeed from 'vitepress-allyouneed/markdown-it'
 * import { scanVault, resolveOptions } from 'vitepress-allyouneed'
 *
 * const options = resolveOptions({ srcDir: '/path/to/vault' })
 * const index = scanVault(options)
 *
 * md.use(allYouNeed, options)
 *
 * // render 时把 index 注入 env
 * const html = md.render(markdown, { index, options })
 * ```
 */

import type MarkdownIt from 'markdown-it'
import type { ResolvedOptions, AllYouNeedOptions } from './core/types.js'
import { resolveOptions } from './core/config-bridge.js'
import { registerWikilinks } from './modules/wikilinks/index.js'
import {
  registerEmbedsOnly,
  registerEmbedBlockRule,
} from './modules/embeds/index.js'

/**
 * markdown-it 插件函数。
 *
 * @param md       markdown-it 实例
 * @param options  AllYouNeedOptions 或已 resolve 过的 ResolvedOptions
 */
function allYouNeedMarkdownIt(
  md: MarkdownIt,
  options?: AllYouNeedOptions | ResolvedOptions,
): void {
  const resolved: ResolvedOptions =
    options && isResolved(options)
      ? options
      : resolveOptions(options as AllYouNeedOptions | undefined)

  const { wikilinks: wlOn, embeds: emOn } = resolved.modules

  if (wlOn && emOn) {
    registerWikilinks(md, 'both')
    registerEmbedBlockRule(md)
  } else if (wlOn) {
    registerWikilinks(md, 'wikilinks-only')
    // embeds 关掉时不注册 block rule
  } else if (emOn) {
    registerEmbedsOnly(md) // 内含 inline + block
  }
}

function isResolved(
  o: AllYouNeedOptions | ResolvedOptions,
): o is ResolvedOptions {
  // ResolvedOptions 有 'slugify' + 'modules' + 'srcDir'(都是必填)
  return (
    typeof (o as ResolvedOptions).slugify === 'function' &&
    typeof (o as ResolvedOptions).srcDir === 'string' &&
    typeof (o as ResolvedOptions).modules === 'object' &&
    (o as ResolvedOptions).modules !== null
  )
}

export default allYouNeedMarkdownIt
export { allYouNeedMarkdownIt }
