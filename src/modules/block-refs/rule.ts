/** Render Obsidian `^block-id` markers as stable DOM anchors. */

import type StateCore from 'markdown-it/lib/rules_core/state_core.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import type MarkdownIt from 'markdown-it'
import type { BlockEntry } from '../../core/types.js'
import { collectBlockIds } from '../../core/vault/blocks.js'

const BLOCK_ID_TAIL_RE = /(?:^|\s)\^([A-Za-z0-9_-]+)\s*$/

function blockRefsRule(state: StateCore): boolean {
  const blocks = collectBlockIds(state.src)
  const removals: Array<{ start: number; count: number }> = []

  for (const block of blocks.values()) {
    const opener = findBlockOpener(state.tokens, block)
    if (opener) {
      addAttr(opener, 'id', `^${block.id}`)
      addClass(opener, 'ayn-block-anchor')
    }

    const inlineIndex = findMarkerInline(state.tokens, block.markerLine, block.id)
    if (inlineIndex < 0) continue
    const inline = state.tokens[inlineIndex]!
    stripMarker(inline)

    if (inline.content.trim() === '' && (inline.children?.length ?? 0) === 0) {
      const paragraphRange = surroundingParagraph(state.tokens, inlineIndex)
      if (paragraphRange) removals.push(paragraphRange)
    }
  }

  // Remove marker-only paragraphs from the back so token indexes stay valid.
  removals
    .sort((a, b) => b.start - a.start)
    .forEach(({ start, count }) => state.tokens.splice(start, count))
  return false
}

function findBlockOpener(tokens: Token[], block: BlockEntry): Token | undefined {
  const accepted = block.kind === 'quote'
    ? ['blockquote_open']
    : block.kind === 'table'
      ? ['table_open']
      : block.kind === 'list'
        ? ['bullet_list_open', 'ordered_list_open']
        : block.kind === 'list-item'
          ? ['list_item_open']
          : block.kind === 'heading'
            ? ['heading_open']
            : ['paragraph_open']

  return tokens.find((token) => {
    if (!accepted.includes(token.type) || !token.map) return false
    return token.map[0] <= block.startLine && token.map[1] >= block.endLine
  })
}

function findMarkerInline(tokens: Token[], line: number, id: string): number {
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i]!
    if (token.type !== 'inline' || !token.map) continue
    if (token.map[0] > line || line >= token.map[1]) continue
    const match = BLOCK_ID_TAIL_RE.exec(token.content)
    if (match?.[1] === id) return i
  }
  return -1
}

function stripMarker(inline: Token): void {
  inline.content = inline.content.replace(BLOCK_ID_TAIL_RE, '').trimEnd()
  if (!inline.children) return
  for (let i = inline.children.length - 1; i >= 0; i -= 1) {
    const child = inline.children[i]!
    if (child.type !== 'text') continue
    const match = BLOCK_ID_TAIL_RE.exec(child.content)
    if (!match) continue
    child.content = child.content.replace(BLOCK_ID_TAIL_RE, '').trimEnd()
    if (!child.content) inline.children.splice(i, 1)
    break
  }
}

function surroundingParagraph(
  tokens: Token[],
  inlineIndex: number,
): { start: number; count: number } | undefined {
  const open = tokens[inlineIndex - 1]
  const close = tokens[inlineIndex + 1]
  if (open?.type !== 'paragraph_open' || close?.type !== 'paragraph_close') {
    return undefined
  }
  return { start: inlineIndex - 1, count: 3 }
}

function addAttr(token: Token, name: string, value: string): void {
  const existing = token.attrIndex(name)
  if (existing >= 0) token.attrs![existing]![1] = value
  else token.attrPush([name, value])
}

function addClass(token: Token, cls: string): void {
  const idx = token.attrIndex('class')
  if (idx >= 0) {
    const current = token.attrs![idx]![1] ?? ''
    if (!current.split(/\s+/).includes(cls)) {
      token.attrs![idx]![1] = `${current} ${cls}`.trim()
    }
  } else {
    token.attrPush(['class', cls])
  }
}

export function registerBlockRefs(md: MarkdownIt): void {
  md.core.ruler.after('inline', 'allyouneed_block_refs', blockRefsRule)
}
