/**
 * v0.3 callouts 模块入口。
 *
 * Obsidian 13 种 callout 语法:
 *   > [!type][+-]? <title>
 *   > body lines...
 *
 * 实现在 rule.ts 里用 markdown-it 的 core ruler 后置改写 blockquote token 流。
 */
import type MarkdownIt from 'markdown-it'
import { registerCalloutsCore, parseCalloutHeader } from './rule.js'

export { registerCalloutsCore, parseCalloutHeader }
export * from './types.js'

export function registerCallouts(md: MarkdownIt): void {
  registerCalloutsCore(md)
}
