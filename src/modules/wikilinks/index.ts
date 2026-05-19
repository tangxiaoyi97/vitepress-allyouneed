/**
 * wikilinks 模块入口。
 *
 * register(md, scope) 把规则装进 markdown-it 实例。scope 决定本规则
 * 同时还要不要处理 ![[]];当 wikilinks 模块单独启用、embeds 模块关闭时
 * 走 'wikilinks-only',反之亦然。两者都开就 'both'(同一个规则,内部分派)。
 */

import type MarkdownIt from 'markdown-it'
import { makeWikilinkRule } from './rule.js'

export function registerWikilinks(
  md: MarkdownIt,
  scope: 'both' | 'wikilinks-only' | 'embeds-only',
): void {
  md.inline.ruler.before(
    'link',
    'allyouneed_wikilinks',
    makeWikilinkRule(scope),
  )
}
