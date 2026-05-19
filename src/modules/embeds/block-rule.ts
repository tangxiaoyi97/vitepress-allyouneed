/**
 * Block rule:整行只有 `![[...]]` 时按 block-level 处理,推 `html_block` token。
 *
 * 这条规则**必须**存在,否则 markdown-it 会把 `![[note]]` 当成段落里的 inline
 * 内容,渲染出 `<p><div class="transclusion">...</div></p>` —— 不合法 HTML
 * (`<div>` 不能在 `<p>` 里),Vue/VitePress 会爆 hydration 警告。
 *
 * 配合 wikilinks/rule.ts 的 inline 规则:
 *   - 单独一行的 ![[...]] → 本规则吃掉,html_block
 *   - 段落中混合的 ![[...]] → inline 规则处理,image 走 html_inline,
 *     transclusion 降级为链接
 */

import type StateBlock from 'markdown-it/lib/rules_block/state_block.mjs'
import type MarkdownIt from 'markdown-it'
import type { AllYouNeedEnv } from '../../core/types.js'
import { renderImageHtml } from './image.js'
import { renderTransclusionHtml } from './transclusion.js'

const LINE_RE = /^!\[\[([^\n\]]+)\]\]\s*$/

export function registerEmbedBlockRule(md: MarkdownIt): void {
  md.block.ruler.before(
    'paragraph',
    'allyouneed_embed_block',
    makeRule(md),
    { alt: ['paragraph'] },
  )
}

function makeRule(md: MarkdownIt) {
  return function embedBlockRule(
    state: StateBlock,
    startLine: number,
    _endLine: number,
    silent: boolean,
  ): boolean {
    const start = state.bMarks[startLine]! + state.tShift[startLine]!
    const max = state.eMarks[startLine]!
    const lineText = state.src.slice(start, max)

    const m = lineText.match(LINE_RE)
    if (!m) return false
    if (silent) return true

    const env = state.env as AllYouNeedEnv
    if (!env || !env.index || !env.options) return false

    const inner = m[1]!
    const parts = inner.split('|').map((p) => p.trim())
    const rawTarget = parts[0]!
    const aliasParts = parts.slice(1)

    const ext = extractExt(rawTarget)
    const isImage =
      !!ext && env.options.embeds.imageFileExt.includes(ext.toLowerCase())

    let html: string
    if (isImage) {
      html = renderImageHtml(rawTarget, aliasParts, env)
    } else {
      html = renderTransclusionHtml(md, rawTarget, aliasParts, env)
    }

    const token = state.push('html_block', '', 0)
    token.content = html + '\n'
    token.map = [startLine, startLine + 1]

    state.line = startLine + 1
    return true
  }
}

function extractExt(target: string): string {
  const cleaned = target.split('#')[0]!
  const dot = cleaned.lastIndexOf('.')
  if (dot <= 0) return ''
  return cleaned.slice(dot + 1).toLowerCase()
}
