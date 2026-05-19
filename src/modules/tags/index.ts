/** v0.2 tags 模块入口 */
import type MarkdownIt from 'markdown-it'
import { registerTagsInline } from './rule.js'

export { registerTagsInline }

export function registerTags(md: MarkdownIt): void {
  registerTagsInline(md)
}
