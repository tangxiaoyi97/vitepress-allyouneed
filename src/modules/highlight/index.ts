/** v0.3 highlight (`==text==`) 模块入口 */
import type MarkdownIt from 'markdown-it'
import { registerHighlightInline } from './rule.js'

export { registerHighlightInline }

export function registerHighlight(md: MarkdownIt): void {
  registerHighlightInline(md)
}
