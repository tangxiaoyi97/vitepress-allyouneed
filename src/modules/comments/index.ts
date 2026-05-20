/** v0.3 comments (`%%...%%`) 模块入口 */
import type MarkdownIt from 'markdown-it'
import {
  registerCommentsInline,
  registerCommentsBlock,
} from './rule.js'

export { registerCommentsInline, registerCommentsBlock }

export function registerComments(md: MarkdownIt): void {
  registerCommentsBlock(md)
  registerCommentsInline(md)
}
