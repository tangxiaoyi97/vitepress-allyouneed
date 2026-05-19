/**
 * embeds 模块入口。
 *
 * embeds 模块有两条规则:
 *   1. **block rule**(`registerEmbedBlockRule`):整行只有 ![[...]] 时按 block-level
 *      处理,推 `html_block`。**必须有,否则 transclusion 会产生 `<div>` in `<p>` 不合法 HTML**。
 *   2. **inline rule**(共用 wikilinks 模块的 makeWikilinkRule):处理段落内混合的
 *      ![[...]]。image 走 inline image,transclusion 降级为告警链接。
 *
 * markdown-it.ts 在两种情况下分别调用:
 *   - wikilinks + embeds 都开:wikilinks/index.ts 注册 inline 'both';本文件注册 block。
 *   - 只开 embeds:本文件 registerEmbedsOnly 注册 inline 'embeds-only';同时注册 block。
 */

import type MarkdownIt from 'markdown-it'
import { makeWikilinkRule } from '../wikilinks/rule.js'
import { registerEmbedBlockRule } from './block-rule.js'

export function registerEmbedsOnly(md: MarkdownIt): void {
  md.inline.ruler.before(
    'link',
    'allyouneed_embeds',
    makeWikilinkRule('embeds-only'),
  )
  registerEmbedBlockRule(md)
}

export { registerEmbedBlockRule }
