import type MarkdownIt from 'markdown-it'
import type Token from 'markdown-it/lib/token.mjs'
import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import { parseMarkdownImageAlt } from './dimensions.js'

/** Add Obsidian width/height attributes to regular Markdown image tokens. */
export function registerMarkdownImageDimensions(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'allyouneed_markdown_image_dimensions', (state) => {
    for (const blockToken of state.tokens) {
      if (blockToken.type !== 'inline' || !blockToken.children) continue
      for (const token of blockToken.children) applyDimensions(token, state)
    }
  })
}

function applyDimensions(token: Token, state: StateCore): void {
  if (token.type !== 'image') return
  const parsed = parseMarkdownImageAlt(token.content)
  if (!parsed) return

  token.content = parsed.altSource
  const children: Token[] = []
  state.md.inline.parse(parsed.altSource, state.md, state.env, children)
  // markdown-it 14 represents escapes/entities as `text_special`, while its
  // image alt renderer intentionally reads text tokens only.
  for (const child of children) {
    if (child.type === 'text_special') child.type = 'text'
  }
  token.children = children
  if (parsed.dimensions.width !== undefined) {
    token.attrSet('width', String(parsed.dimensions.width))
  }
  if (parsed.dimensions.height !== undefined) {
    token.attrSet('height', String(parsed.dimensions.height))
  }
}
